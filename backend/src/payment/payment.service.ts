import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StripeService } from '../stripe/stripe.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentStatus, ConsultationStatus, UserRole } from '@prisma/client';
import { ApiResponseDto } from '../common/helpers/response/api-response.dto';
import { HttpExceptionHelper } from 'src/common/helpers/execption/http-exception.helper';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly stripeService: StripeService,
  ) {}

  async createPaymentIntent(createPaymentDto: CreatePaymentDto, patientId: number): Promise<ApiResponseDto<any>> {
    const { consultationId, amount, currency = 'USD' } = createPaymentDto;

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { 
        owner: true, 
        payment: true,
        participants: {
          where: { userId: patientId }
        }
      },
    });

    if (!consultation) {
      throw HttpExceptionHelper.notFound('Consultation not found');
    }

    if (consultation.payment) {
      throw HttpExceptionHelper.badRequest('Payment already exists for this consultation');
    }

    // Check if user is a participant and is a patient
    const participant = consultation.participants.find(p => p.userId === patientId && p.role === 'PATIENT');
    if (!participant) {
      throw HttpExceptionHelper.forbidden('You are not authorized to pay for this consultation');
    }

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw HttpExceptionHelper.notFound('Patient not found');
    }

    let stripeCustomerId = patient.stripeCustomerId;
    if (!stripeCustomerId) {
      const stripeCustomer = await this.stripeService.createCustomer({
        email: patient.email,
        name: `${patient.firstName} ${patient.lastName}`,
      });
      
      stripeCustomerId = stripeCustomer.id;
      await this.prisma.user.update({
        where: { id: patientId },
        data: { stripeCustomerId },
      });
    }

    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: Math.round(amount * 100),
      currency,
      customer: stripeCustomerId,
      metadata: {
        consultationId: consultationId.toString(),
        patientId: patientId.toString(),
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        consultationId,
        patientId,
        stripePaymentId: paymentIntent.id,
        stripeIntentId: paymentIntent.id,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        paymentMethod: createPaymentDto.paymentMethod,
      },
    });

    const responseData = {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };

    return ApiResponseDto.success(
      responseData,
      'Payment intent created successfully',
      201,
    );
  }

  async confirmPayment(paymentIntentId: string, patientId: number): Promise<ApiResponseDto<any>> {
    const payment = await this.prisma.payment.findUnique({
      where: { stripeIntentId: paymentIntentId },
      include: { consultation: true },
    });

    if (!payment || payment.patientId !== patientId) {
      throw HttpExceptionHelper.notFound('Payment not found');
    }

    const paymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntentId);

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentIntent.status === 'succeeded' ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        paidAt: paymentIntent.status === 'succeeded' ? new Date() : null,
        failureReason: paymentIntent.last_payment_error?.message || null,
      },
    });

    // Update consultation status if payment is successful
    if (paymentIntent.status === 'succeeded') {
      await this.prisma.consultation.update({
        where: { id: payment.consultationId },
        data: { status: ConsultationStatus.SCHEDULED },
      });
    }

    const message = paymentIntent.status === 'succeeded' 
      ? 'Payment confirmed successfully' 
      : 'Payment confirmation failed';

    return ApiResponseDto.success(
      updatedPayment,
      message,
      200,
    );
  }

  async refundPayment(refundDto: RefundPaymentDto): Promise<ApiResponseDto<any>> {
    const { paymentId, amount, reason } = refundDto;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== PaymentStatus.COMPLETED) {
      throw HttpExceptionHelper.badRequest('Payment not found or not eligible for refund');
    }

    // Create refund in Stripe
    const refund = await this.stripeService.createRefund({
      payment_intent: payment.stripeIntentId!,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: 'requested_by_customer',
    });

    // Create refund record
    const paymentRefund = await this.prisma.paymentRefund.create({
      data: {
        paymentId,
        stripeRefundId: refund.id,
        amount: refund.amount / 100,
        reason,
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });

    // Update payment status
    const totalRefunded = await this.prisma.paymentRefund.aggregate({
      where: { paymentId },
      _sum: { amount: true },
    });

    const totalRefundAmount = totalRefunded._sum.amount || 0;
    const paymentStatus = totalRefundAmount >= payment.amount 
      ? PaymentStatus.REFUNDED 
      : PaymentStatus.PARTIALLY_REFUNDED;

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: paymentStatus },
    });

    return ApiResponseDto.success(
      paymentRefund,
      'Payment refunded successfully',
      200,
    );
  }

  async getPaymentConfig(organizationId: number): Promise<ApiResponseDto<any>> {
    const paymentConfig = await this.prisma.paymentConfig.findUnique({
      where: { organizationId },
    });

    const responseData = {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      organizationId,
      consultationFee: paymentConfig?.consultationFee || 50.00,
      currency: paymentConfig?.currency || 'USD',
      isActive: paymentConfig?.isActive || false,
    };

    return ApiResponseDto.success(
      responseData,
      'Payment configuration retrieved successfully',
      200,
    );
  }
}
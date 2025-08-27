import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StripeService } from '../stripe/stripe.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto'
import { PaymentStatus, ConsultationStatus, UserRole } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly stripeService: StripeService,
  ) {}

  async createPaymentIntent(createPaymentDto: CreatePaymentDto, patientId: number) {
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
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.payment) {
      throw new BadRequestException('Payment already exists for this consultation');
    }

    // Check if user is a participant and is a patient
    const participant = consultation.participants.find(p => p.userId === patientId && p.role === 'PATIENT');
    if (!participant) {
      throw new BadRequestException('You are not authorized to pay for this consultation');
    }

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
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

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
    };
  }

  async confirmPayment(paymentIntentId: string, patientId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripeIntentId: paymentIntentId },
      include: { consultation: true },
    });

    if (!payment || payment.patientId !== patientId) {
      throw new NotFoundException('Payment not found');
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

    return updatedPayment;
  }

  async refundPayment(refundDto: RefundPaymentDto) {
    const { paymentId, amount, reason } = refundDto;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment not found or not eligible for refund');
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

    return paymentRefund;
  }

  async getPaymentConfig(organizationId: number) {
    const paymentConfig = await this.prisma.paymentConfig.findUnique({
      where: { organizationId },
    });

    return {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      organizationId,
      consultationFee: paymentConfig?.consultationFee || 50.00,
      currency: paymentConfig?.currency || 'USD',
      isActive: paymentConfig?.isActive || false,
    };
  }
}
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('payment')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  @Roles(UserRole.PATIENT)
  async createPaymentIntent(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    const patientId = req.user.id;
    return this.paymentService.createPaymentIntent(createPaymentDto, patientId);
  }

  @Post('confirm')
  @Roles(UserRole.PATIENT)
  async confirmPayment(@Body() confirmPaymentDto: ConfirmPaymentDto, @Request() req) {
    const patientId = req.user.id;
    return this.paymentService.confirmPayment(confirmPaymentDto.paymentIntentId, patientId);
  }

  @Post('refund')
  @Roles(UserRole.ADMIN)
  async refundPayment(@Body() refundPaymentDto: RefundPaymentDto) {
    return this.paymentService.refundPayment(refundPaymentDto);
  }

  @Get('config/:organizationId')
  async getPaymentConfig(@Param('organizationId', ParseIntPipe) organizationId: number) {
    return this.paymentService.getPaymentConfig(organizationId);
  }
}
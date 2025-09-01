import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class RefundPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  paymentId: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
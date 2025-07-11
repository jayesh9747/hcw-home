import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsDate } from 'class-validator';
import { ConsultationStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateConsultationDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsNumber()
  patientId: number;

  @ApiPropertyOptional({ description: 'Practitioner ID (owner)' })
  @IsOptional()
  @IsNumber()
  ownerId?: number;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledDate?: Date;

  @ApiPropertyOptional({ description: 'Group ID' })
  @IsOptional()
  @IsNumber()
  groupId?: number | null;
}

export class CreateConsultationWithTimeSlotDto extends CreateConsultationDto {
  @ApiProperty({ description: 'Time slot ID' })
  @IsNumber()
  timeSlotId: number;
}

export class ConsultationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: ConsultationStatus })
  status: ConsultationStatus;

  @ApiProperty()
  ownerId: number;

  @ApiProperty({ required: false })
  patientId?: number;

  @ApiPropertyOptional()
  scheduledDate?: Date;

  @ApiPropertyOptional()
  groupId?: number;
}

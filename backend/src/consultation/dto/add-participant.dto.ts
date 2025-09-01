import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class AddParticipantDto {
  @ApiProperty({ description: 'Consultation ID', example: 123 })
  @IsNumber({}, { message: 'Consultation ID must be a valid number' })
  consultationId: number;

  @ApiProperty({
    description: "Participant's email address",
    example: 'expert@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    enum: [UserRole.EXPERT, UserRole.GUEST, UserRole.PATIENT],
    description: "Participant's role in the consultation",
    example: UserRole.EXPERT,
  })
  @IsEnum([UserRole.EXPERT, UserRole.GUEST, UserRole.PATIENT], {
    message: 'Role must be one of: EXPERT, GUEST, PATIENT',
  })
  role: UserRole;

  @ApiProperty({
    description: "Participant's display name",
    example: 'Dr. Sarah Johnson',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-Z\s.'-]+$/, {
    message:
      'Name can only contain letters, spaces, periods, apostrophes, and hyphens',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Optional notes for the participant',
    example: 'Please review the patient history before joining',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @Length(0, 500, { message: 'Notes cannot exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  notes?: string;
}

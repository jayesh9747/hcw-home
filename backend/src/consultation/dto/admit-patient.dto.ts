import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for admitting a patient into a consultation.
 */
export class AdmitPatientDto {
 @ApiProperty({
  description: 'The unique identifier of the consultation',
  example: 123,
  minimum: 1,
  type: Number,
 })
 @IsInt({ message: 'consultationId must be an integer' })
 @IsPositive({ message: 'consultationId must be a positive integer' })
 consultationId: number;
}

/**
 * Standardized response DTO for admitting a patient.
 */
export class AdmitPatientResponseDto {
 @ApiProperty({ description: 'Indicates if the operation was successful', example: true })
 success: boolean;

 @ApiProperty({ description: 'HTTP status code of the response', example: 200 })
 statusCode: number;

 @ApiProperty({ description: 'Response message', example: 'Patient admitted successfully' })
 message: string;

 @ApiPropertyOptional({ description: 'The unique identifier of the consultation', example: 123 })
 consultationId?: number;

 constructor(partial: Partial<AdmitPatientResponseDto>) {
  Object.assign(this, partial);
 }
}

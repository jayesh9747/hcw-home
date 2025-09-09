import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ActivateConsultationDto {
 @IsNumber()
 consultationId: number;

 @IsNumber()
 practitionerId: number;

 @IsOptional()
 @IsString()
 notes?: string;

 @IsOptional()
 @IsString()
 reason?: string;
}

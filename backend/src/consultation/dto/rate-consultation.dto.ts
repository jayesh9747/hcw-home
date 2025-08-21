import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class RateConsultationDto {
 @ApiProperty({ description: 'ID of the consultation', example: 123 })
 @IsInt()
 consultationId: number;

 @ApiProperty({ description: 'Rating value (1-5)', minimum: 1, maximum: 5, example: 4 })
 @IsInt()
 @Min(1)
 @Max(5)
 rating: number;

 @ApiPropertyOptional({ description: 'Optional comment about the consultation', example: 'Great experience!' })
 @IsOptional()
 @IsString()
 comment?: string;
}

import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePractitionerAvailabilityDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiProperty()
  @IsNumber()
  @Min(15)
  @Max(120)
  slotDuration: number = 30;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean = true;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString, IsOptional } from 'class-validator';
import { Role, Sex, Status } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'SecurePassword123', required: false })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  temporaryAccount?: boolean;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'US', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'en', required: false })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ enum: Sex, example: Sex.male, required: false })
  @IsEnum(Sex)
  @IsOptional()
  sex?: Sex;

  @ApiProperty({ enum: Role, example: Role.Patient, required: false })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiProperty({ enum: Status, example: Status.approved, required: false })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}

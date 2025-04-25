import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { Role, Sex, Status } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'SecurePassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  temporaryAccount: boolean;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'en' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({ enum: Sex, example: Sex.male })
  @IsEnum(Sex)
  sex: Sex;

  @ApiProperty({ enum: Role, example: Role.Patient })
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ enum: Status, example: Status.not_approved })
  @IsEnum(Status)
  status?: Status;
}

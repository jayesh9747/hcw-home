import { ApiProperty } from '@nestjs/swagger';
import { Role, Sex, Status } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ enum: Role, example: Role.Patient })
  role: Role;

  @ApiProperty({ example: false })
  temporaryAccount: boolean;

  @ApiProperty({ example: '+1234567890' })
  phoneNumber: string;

  @ApiProperty({ example: 'US' })
  country: string;

  @ApiProperty({ example: 'en' })
  language: string;

  @ApiProperty({ enum: Sex, example: Sex.male })
  sex: Sex;

  @ApiProperty({ enum: Status, example: Status.approved })
  status: Status;
}

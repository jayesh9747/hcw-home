import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  currentPassword: string;

  @ApiProperty({ description: 'New password', minLength: 8, maxLength: 100 })
  newPassword: string;
}
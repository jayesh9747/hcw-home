import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TokenDto {
  @ApiProperty({ example: 'your-refresh-token-string' })
  refreshToken: string;

  @ApiProperty({ example: 'your-access-token-string' })
  accessToken: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'your-refresh-token-string' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

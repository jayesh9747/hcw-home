import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateMediasoupServerDto {
  @ApiProperty({
    description: 'Mediasoup server URL',
    example: 'https://media.example.com',
    type: String,
  })
  @IsUrl({}, { message: 'Invalid URL format' })
  @IsString()
  url: string;

  @ApiProperty({
    description: 'Username for server authentication',
    example: 'mediauser',
    type: String,
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Password for server authentication',
    example: 'SecurePass123!',
    type: String,
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Maximum number of concurrent sessions',
    example: 100,
    type: Number,
    required: false,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxNumberOfSessions?: number = 100;

  @ApiProperty({
    description: 'Whether the server is active',
    example: true,
    type: Boolean,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

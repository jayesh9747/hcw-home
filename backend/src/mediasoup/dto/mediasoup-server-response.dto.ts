import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class MediasoupServerResponseDto {
  @ApiProperty({
    description: 'Server ID',
    example: 'clx1234567890',
    type: String,
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Mediasoup server URL',
    example: 'https://media.example.com',
    type: String,
  })
  @Expose()
  url: string;

  @ApiProperty({
    description: 'Username for server authentication',
    example: 'mediauser',
    type: String,
  })
  @Expose()
  username: string;

  @ApiProperty({
    description: 'Password for server authentication (excluded from response)',
    example: 'SecurePass123!',
    type: String,
  })
  @Exclude()
  password: string;

  @ApiProperty({
    description: 'Maximum number of concurrent sessions',
    example: 100,
    type: Number,
  })
  @Expose()
  maxNumberOfSessions: number;

  @ApiProperty({
    description: 'Whether the server is active',
    example: true,
    type: Boolean,
  })
  @Expose()
  active: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
  })
  @Expose()
  updatedAt: Date;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMediasoupServerDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    type: Number,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    type: Number,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term for URL or username',
    example: 'media',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: [
      'url',
      'username',
      'maxNumberOfSessions',
      'active',
      'createdAt',
      'updatedAt',
    ],
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum([
    'url',
    'username',
    'maxNumberOfSessions',
    'active',
    'createdAt',
    'updatedAt',
  ])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

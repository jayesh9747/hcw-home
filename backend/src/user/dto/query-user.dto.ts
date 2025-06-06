import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsNumber, IsString, IsEnum, Min, Max, IsInt } from 'class-validator';
import { UserRole, UserSex, UserStatus } from '@prisma/client';

export class QueryUserDto {
  @ApiProperty({ 
    description: 'Page number', 
    required: false, 
    default: 1, 
    minimum: 1,
    type: 'number'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  page?: number = 1;

  @ApiProperty({ 
    description: 'Items per page', 
    required: false, 
    default: 10, 
    minimum: 1, 
    maximum: 100,
    type: 'number'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10 : Math.min(Math.max(parsed, 1), 100);
  })
  limit?: number = 10;

  @ApiProperty({ 
    description: 'Search term', 
    required: false,
    type: 'string'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ 
    enum: UserRole, 
    description: 'Filter by role', 
    required: false 
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be PATIENT, PRACTITIONER, or ADMIN' })
  role?: UserRole;

  @ApiProperty({ 
    enum: UserStatus, 
    description: 'Filter by status', 
    required: false 
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({ 
    enum: UserSex, 
    description: 'Filter by gender', 
    required: false 
  })
  @IsOptional()
  @IsEnum(UserSex)
  sex?: UserSex;

  @ApiProperty({
    description: 'Sort by field',
    required: false,
    default: 'createdAt',
    enum: ['firstName', 'lastName', 'email', 'createdAt'],
    type: 'string'
  })
  @IsOptional()
  @IsEnum(['firstName', 'lastName', 'email', 'createdAt'], {
    message: 'sortBy must be one of: firstName, lastName, email, createdAt'
  })
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    default: 'desc',
    enum: ['asc', 'desc'],
    type: 'string'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'sortOrder must be either asc or desc'
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
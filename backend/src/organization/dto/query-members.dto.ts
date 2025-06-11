import { ApiProperty } from '@nestjs/swagger';
import { OrgMemberRole } from '@prisma/client';

export class QueryMembersDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
  })
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
  })
  limit?: number;

  @ApiProperty({
    description: 'Search by user name or email',
    example: 'john',
    required: false,
  })
  search?: string;

  @ApiProperty({
    description: 'Filter by role',
    enum: OrgMemberRole,
    required: false,
  })
  role?: OrgMemberRole;

  @ApiProperty({
    description: 'Sort by field',
    enum: ['id', 'joinedAt', 'role'],
    example: 'joinedAt',
    required: false,
  })
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
    required: false,
  })
  sortOrder?: string;
}

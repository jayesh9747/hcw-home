import { ApiProperty } from '@nestjs/swagger';

export enum OrgMemberRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class AddMemberDto {
  @ApiProperty({
    description: 'User ID to add as member',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Role of the member',
    enum: OrgMemberRole,
    default: OrgMemberRole.MEMBER,
    example: OrgMemberRole.MEMBER,
  })
  role?: OrgMemberRole;
}

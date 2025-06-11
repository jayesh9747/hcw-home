import { ApiProperty } from '@nestjs/swagger';
import { OrgMemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: OrgMemberRole,
    example: OrgMemberRole.ADMIN,
  })
  role: OrgMemberRole;
}

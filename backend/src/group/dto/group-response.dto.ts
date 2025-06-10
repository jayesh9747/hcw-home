import { ApiProperty } from '@nestjs/swagger';

export class GroupResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  organizationId: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  sharedOnlyIncomingConsultation: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  organization?: {
    id: number;
    name: string;
  };

  @ApiProperty({ required: false })
  membersCount?: number;

  @ApiProperty({ required: false })
  consultationsCount?: number;
}

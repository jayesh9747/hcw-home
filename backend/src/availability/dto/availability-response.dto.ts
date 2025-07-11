import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  practitionerId: number;

  @ApiProperty()
  dayOfWeek: number;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  slotDuration: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  practitioner?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

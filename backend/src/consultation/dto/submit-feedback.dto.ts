import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum FeedbackSatisfaction {
  SATISFIED = 'SATISFIED',
  NEUTRAL = 'NEUTRAL',
  DISSATISFIED = 'DISSATISFIED',
}

export class SubmitFeedbackDto {
  @ApiProperty({
    description: 'Consultation ID',
    example: 1,
  })
  @IsInt()
  @Min(1)
  consultationId: number;

  @ApiProperty({
    description: 'User satisfaction level',
    enum: FeedbackSatisfaction,
    example: FeedbackSatisfaction.SATISFIED,
    required: false,
  })
  @IsEnum(FeedbackSatisfaction)
  @IsOptional()
  satisfaction?: FeedbackSatisfaction;

  @ApiProperty({
    description: 'User comment',
    example: 'Great consultation experience',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;
}

export class FeedbackResponseDto {
  @ApiProperty({
    description: 'Feedback ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Consultation ID',
    example: 1,
  })
  consultationId: number;

  @ApiProperty({
    description: 'User ID who submitted feedback',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'User satisfaction level',
    enum: FeedbackSatisfaction,
    example: FeedbackSatisfaction.SATISFIED,
    nullable: true,
  })
  satisfaction: FeedbackSatisfaction | null;

  @ApiProperty({
    description: 'User comment',
    example: 'Great consultation experience',
    nullable: true,
  })
  comment: string | null;

  @ApiProperty({
    description: 'Feedback creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Feedback update date',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}
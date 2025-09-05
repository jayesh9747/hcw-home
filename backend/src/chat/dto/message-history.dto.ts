import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class MessageHistoryDto {
  @IsInt()
  consultationId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

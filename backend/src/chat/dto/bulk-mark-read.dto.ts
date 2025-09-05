import { IsInt, IsArray, ArrayMinSize } from 'class-validator';

export class BulkMarkReadDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  messageIds: number[];

  @IsInt()
  userId: number;

  @IsInt()
  consultationId: number;
}

import { IsInt, IsString, MinLength, MaxLength } from 'class-validator';

export class EditMessageDto {
  @IsInt()
  messageId: number;

  @IsInt()
  userId: number;

  @IsInt()
  consultationId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

import { IsInt, IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
}

export class CreateMessageDto {
  @IsInt()
  userId: number;

  @IsInt()
  consultationId: number;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  mediaType?: string;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsInt()
  @IsOptional()
  fileSize?: number;

  @IsUUID()
  clientUuid: string;

  @IsOptional()
  file?: Express.Multer.File;
}

import { IsInt, IsString } from 'class-validator';

export class TypingIndicatorDto {
 @IsInt()
 userId: number;

 @IsInt()
 consultationId: number;

 @IsString()
 userName: string;

 typing: boolean;
}

export interface MessageResponseDto {
  id: number;
  userId: number;
  content: string;
  consultationId?: number | null;
  createdAt: string;
}

export interface ParticipantResponseDto {
  id: number;
  consultationId: number;
  userId: number;
  isActive: boolean;
  isBeneficiary: boolean;
  token?: string | null;
  joinedAt?: string | null;
}

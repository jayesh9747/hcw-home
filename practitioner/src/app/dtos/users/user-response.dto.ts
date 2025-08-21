export interface UserResponseDto {
  id: number;
  role: 'PATIENT' | 'PRACTITIONER' | 'ADMIN';
  firstName: string;
  lastName: string;
  email?: string;
  temporaryAccount?: boolean;
  phoneNumber?: string | null;
  country?: string | null;
  sex?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  status: 'APPROVED' | 'NOT_APPROVED';
  createdAt: string;
  updatedAt: string;
}

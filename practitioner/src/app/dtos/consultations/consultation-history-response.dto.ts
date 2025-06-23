import { ConsultationStatus } from '../../constants/consultation-status.enum';
import { UserResponseDto } from '../users/user-response.dto';
import { ParticipantResponseDto } from './participant-response.dto';

export interface ConsultationHistoryResponseDto {
  id: number;
  scheduledDate?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  closedAt?: string | null;
  createdBy?: number | null;
  groupId?: number | null;
  owner?: number | null;
  whatsappTemplateId?: number | null;
  status: ConsultationStatus;
  patient: UserResponseDto;
  participants?: ParticipantResponseDto[];
}

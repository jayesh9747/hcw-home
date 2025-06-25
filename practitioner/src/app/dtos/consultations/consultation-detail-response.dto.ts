import { ConsultationHistoryResponseDto } from './consultation-history-response.dto';
import { MessageResponseDto } from './message-response.dto';

export interface ConsultationDetailResponseDto
  extends ConsultationHistoryResponseDto {
  messages?: MessageResponseDto[];
}

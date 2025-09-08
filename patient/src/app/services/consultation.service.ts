import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

export interface Consultation {
  consultationId: number;
  practitionerName: string;
  practitionerSpeciality: string[];
  scheduledDate: string;
  startedAt: string | null;
  closedAt: string | null;
  status: 'SCHEDULED' | 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED_OPEN';
  remainingDays?: number;
  canJoin?: boolean;
  waitingForDoctor?: boolean;
  rating?: {
    value: number;
    color: 'green' | 'red' | null;
    done: boolean;
  };
}

export interface SubmitFeedbackRequest {
  consultationId: number;
  satisfaction?: 'SATISFIED' | 'NEUTRAL' | 'DISSATISFIED';
  comment?: string;
}

export interface FeedbackResponse {
  id: number;
  consultationId: number;
  userId: number;
  satisfaction: 'SATISFIED' | 'NEUTRAL' | 'DISSATISFIED' | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackApiResponse {
  success: boolean;
  data: FeedbackResponse | null;
  message: string;
  statusCode: number;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ConsultationService {
  constructor(private http: HttpClient) {}

  getPatientConsultationHistory(patientId: number): Observable<Consultation[]> {
    return this.http.get<Consultation[]>(`${environment.apiUrl}/consultation/patient/history`, { params: { patientId: patientId.toString() } });
  }

  submitFeedback(feedbackData: SubmitFeedbackRequest, userId: number): Observable<FeedbackApiResponse> {
    const params = new HttpParams().set('userId', userId.toString());
    
    return this.http.post<FeedbackApiResponse>(
      `${environment.apiUrl}/consultation/feedback`,
      feedbackData,
      { params }
    );
  }

  getFeedback(consultationId: number, userId: number): Observable<FeedbackApiResponse> {
    const params = new HttpParams().set('userId', userId.toString());
    
    return this.http.get<FeedbackApiResponse>(
      `${environment.apiUrl}/consultation/${consultationId}/feedback`,
      { params }
    );
  }
}


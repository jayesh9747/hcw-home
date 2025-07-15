import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';


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

@Injectable({ providedIn: 'root' })
export class ConsultationService {
  constructor(private http: HttpClient) {}

  getPatientConsultationHistory(patientId: number) {
    return this.http.get(`${environment.apiUrl}/consultation/patient/history`, { params: { patientId: patientId.toString() } } );
  }
}


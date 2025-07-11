import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TimeSlot {
  id: number;
  practitionerId: number;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
}

export interface Practitioner {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  specialization?: string;
  defaultSlotDuration?: number;
}

export interface CreateConsultationRequest {
  patientId: number;
  timeSlotId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  private apiUrl = `${environment.apiUrl}/availability`;

  constructor(private http: HttpClient) {}

  getAvailableSlots(practitionerId: number, startDate: string, endDate: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/slots/available`, {
      params: {
        practitionerId: practitionerId.toString(),
        startDate,
        endDate
      }
    });
  }

  generateTimeSlots(practitionerId: number, startDate: string, endDate: string): Observable<TimeSlot[]> {
    return this.http.post<TimeSlot[]>(`${this.apiUrl}/generate-slots/${practitionerId}`, null, {
      params: {
        startDate,
        endDate
      }
    });
  }

  createConsultationWithTimeSlot(request: CreateConsultationRequest): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/consultation/with-timeslot`, request);
  }
}

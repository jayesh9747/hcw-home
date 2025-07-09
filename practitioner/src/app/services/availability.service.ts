import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TimeSlot {
  id: number;
  practitionerId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
  consultation?: any;
}

export interface PractitionerAvailability {
  id: number;
  practitionerId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  practitioner?: any;
}

export interface CreateAvailabilityRequest {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

export interface UpdateAvailabilityRequest {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  slotDuration?: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {
  private apiUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getCurrentPractitionerId(): number {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return user.id;
  }

  getMyAvailability(): Observable<any> {
    const practitionerId = this.getCurrentPractitionerId();
    return this.http.get<any>(`${this.apiUrl}/availability/practitioner/${practitionerId}`, {
      headers: this.getAuthHeaders()
    });
  }

  createAvailability(data: CreateAvailabilityRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/availability`, data, {
      headers: this.getAuthHeaders()
    });
  }

  updateAvailability(id: number, data: UpdateAvailabilityRequest): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/availability/${id}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  deleteAvailability(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/availability/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  getMyTimeSlots(startDate?: string, endDate?: string): Observable<any> {
    let params: any = {};
    if (startDate && endDate) {
      params = { startDate, endDate };
    }
    return this.http.get<any>(`${this.apiUrl}/availability/my-slots`, { 
      params,
      headers: this.getAuthHeaders()
    });
  }

  generateTimeSlots(startDate: string, endDate: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/availability/generate-slots`, {
      startDate,
      endDate
    }, {
      headers: this.getAuthHeaders()
    });
  }

  updateSlotStatus(slotId: number, status: 'AVAILABLE' | 'BLOCKED'): Observable<TimeSlot> {
    return this.http.patch<TimeSlot>(`${this.apiUrl}/availability/slots/${slotId}`, { status }, {
      headers: this.getAuthHeaders()
    });
  }

  getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }
}

import { Injectable } from '@angular/core';
import { type Observable, of } from 'rxjs';
import type { Consultation } from '../models/consultation.model';

@Injectable({
  providedIn: 'root',
})
export class ConsultationService {
  private mockWaitingConsultations: Consultation[] = [];
  private mockOpenConsultations: Consultation[] = [
    {
      id: '1',
      patientName: 'Olivier Bitsch',
      joinTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      id: '2',
      patientName: 'Olivier Bitsch',
      joinTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      id: '3',
      patientName: 'Olivier Bitsch',
      joinTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'active',
    },
  ];

  constructor() {}

  getWaitingConsultations(): Observable<Consultation[]> {
    return of(this.mockWaitingConsultations);
  }

  getOpenConsultations(): Observable<Consultation[]> {
    return of(this.mockOpenConsultations);
  }

  formatTime(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString();
    }
  }
}

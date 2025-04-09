import { Component, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Consultation } from '../../models/consultation.model';
import { ConsultationService } from '../../services/consultation.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-waiting-room-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './waiting-room-card.component.html',
  styleUrls: ['./waiting-room-card.component.scss'],
})
export class WaitingRoomCardComponent implements OnInit {
  waitingConsultations: Consultation[] = [];

  constructor(private consultationService: ConsultationService) {}

  ngOnInit(): void {
    this.loadWaitingConsultations();
  }

  loadWaitingConsultations(): void {
    this.consultationService
      .getWaitingConsultations()
      .subscribe((consultations) => {
        this.waitingConsultations = consultations.slice(0, 5);
      });
  }

  formatTime(date: Date): string {
    return this.consultationService.formatTime(date);
  }
}

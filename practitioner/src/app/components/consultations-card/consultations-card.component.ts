import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Consultation } from '../../models/consultation.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-consultation-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './consultations-card.component.html',
  styleUrls: ['./consultations-card.component.scss'],
})
export class ConsultationCardComponent {
  @Input() title: string = 'CONSULTATIONS';
  @Input() description: string = 'List of consultations';
  @Input() consultations: Consultation[] = [];
  @Input() routerLink: string = '/consultations';

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Consultation } from '../../models/consultation.model';
import { RouterLink } from '@angular/router';
import { RoutePaths } from '../../constants/route-paths.enum';

@Component({
  selector: 'app-consultation-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './consultations-card.component.html',
  styleUrls: ['./consultations-card.component.scss'],
})
export class ConsultationCardComponent {
  @Input() title = 'CONSULTATIONS';
  @Input() description = 'List of consultations';
  @Input() consultations: Consultation[] = [];
  @Input() routerLink: RoutePaths = RoutePaths.OpenConsultations;

  RoutePaths = RoutePaths;

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

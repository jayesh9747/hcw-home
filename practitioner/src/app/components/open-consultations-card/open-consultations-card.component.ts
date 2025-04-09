import { Component, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Consultation } from '../../models/consultation.model';
import { ConsultationService } from '../../services/consultation.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-open-consultations-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './open-consultations-card.component.html',
  styleUrls: ['./open-consultations-card.component.scss'],
})
export class OpenConsultationsCardComponent implements OnInit {
  openConsultations: Consultation[] = [];

  constructor(private consultationService: ConsultationService) {}

  ngOnInit(): void {
    this.loadOpenConsultations();
  }

  loadOpenConsultations(): void {
    this.consultationService
      .getOpenConsultations()
      .subscribe((consultations) => {
        this.openConsultations = consultations.slice(0, 5);
      });
  }

  formatTime(date: Date): string {
    return this.consultationService.formatTime(date);
  }
}

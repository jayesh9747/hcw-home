import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsultationCardComponent } from '../../components/consultations-card/consultations-card.component';
import { Consultation } from '../../models/consultation.model';
import { ConsultationService } from '../../services/consultation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ConsultationCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  waitingConsultations: Consultation[] = [];
  openConsultations: Consultation[] = [];

  constructor(private consultationService: ConsultationService) {}

  ngOnInit(): void {
    this.consultationService.getWaitingConsultations().subscribe((data) => {
      this.waitingConsultations = data;
    });

    this.consultationService.getOpenConsultations().subscribe((data) => {
      this.openConsultations = data;
    });
  }
}

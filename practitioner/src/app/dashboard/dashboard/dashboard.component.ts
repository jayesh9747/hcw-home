import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WaitingRoomCardComponent } from '../../components/waiting-room-card/waiting-room-card.component';
import { OpenConsultationsCardComponent } from '../../components/open-consultations-card/open-consultations-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    WaitingRoomCardComponent,
    OpenConsultationsCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
}

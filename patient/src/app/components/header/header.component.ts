import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonIcon, IonButton, IonButtons
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [IonTitle, IonHeader, IonToolbar, IonIcon, IonButton, IonButtons],
})
export class HeaderComponent {

  constructor(private router: Router) {
    addIcons({ addCircleOutline });
  }

  goToConsultationRequest() {
    this.router.navigate(['/consultation-request']);
  }
}

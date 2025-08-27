import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonList, IonItem, IonLabel, IonButton, IonIcon, 
  IonChip, IonText, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  videocamOutline, starOutline,
  calendarOutline, checkmarkCircle 
} from 'ionicons/icons';

import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { Consultation } from 'src/app/services/consultation.service';
import { JoinConsultationService } from 'src/app/services/joinConsultation.service';
@Component({
  selector: 'card-component',
  templateUrl: './card-component.component.html',
  styleUrls: ['./card-component.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard, 
    IonCardHeader, 
    IonCardTitle, 
    IonCardContent, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonButton, 
    IonIcon, 
    IonChip, 
    IonText,
  ],
})

export class CardComponentComponent {

  constructor(
    private router: Router,
    private toastController: ToastController,
    private joinConsultationService: JoinConsultationService,
    private authService: AuthService
  ){
    addIcons({
      videocamOutline, 
      starOutline, 
      calendarOutline,
      checkmarkCircle
    });
  }
    @Input() activeConsultations: Consultation[] = [];
    @Input() completedConsultations: Consultation[] = [];
    @Input() upcomingConsultations: Consultation[] = [];


    async joinConsultation(consultationId: number) {
      
      const user = this.authService.getCurrentUser();
      const userId = user?.id; 
      
      if (!userId) {
        this.presentToast('Please log in to join consultation.');
        return;
      }

      this.joinConsultationService.joinConsultation(consultationId, userId)
      .subscribe({
        next: (response: any) => {
          if (response?.sessionUrl) {
            this.router.navigate([response.sessionUrl]);
          } else {
            this.presentToast('Joined consultation, but no session URL provided.');
          }
        },
        error: (err) => {
          this.presentToast('Failed to join consultation.');
          console.error('Join error:', err);
        }
      });
    }

  // we have to provide it after consultation ends

  navigateToFeedback(consultationId: number) {
    this.router.navigate(['/post-consultation-feedback-form'], {
      queryParams: { consultationId }
    });
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    toast.present();
  }
}
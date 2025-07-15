import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonList, IonItem, IonLabel, IonButton, IonIcon, 
  IonChip, IonText, AlertController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  videocamOutline, starOutline,
  calendarOutline, checkmarkCircle 
} from 'ionicons/icons';

import { Router } from '@angular/router';
import { Consultation } from 'src/app/services/consultation.service';

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
    private alertController: AlertController, 
    private toastController: ToastController
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

  // on clicking this button patient navigate
  async joinConsultation(consultationId: number) {
    const toast = await this.toastController.create({
      message: 'Joining video consultation...',
      duration: 2000,
      color: 'success'
    });
    toast.present();
    // In a real app, this would navigate to a video call page or launch a video SDK
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
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonContent, IonCardContent, IonCard, IonButton, IonCardHeader, IonTextarea } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { star, starOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
@Component({
  standalone: true,
  selector: 'app-post-feedback',
  templateUrl: './post-consultation-feedback.page.html',
  styleUrls: ['./post-consultation-feedback.page.scss'],
  imports: [HeaderComponent, ReactiveFormsModule, CommonModule, IonIcon, IonContent, IonCardContent, IonCard, IonButton, IonCardHeader, IonTextarea]
})


export class PostConsultationFeedbackPage implements OnInit {
  feedbackForm!: FormGroup;
  rating: number = 0;
  stars = Array(5).fill(0);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({
    star,
    starOutline
  });
  }

  ngOnInit() {
    this.feedbackForm = this.fb.group({
      comment: [''],
      rating: [0, Validators.required]
    });
  }

  selectRating(value: number) {
    this.rating = value;
    this.feedbackForm.patchValue({ rating: value });
  }

  async submit() {
    const feedback = this.feedbackForm.value;
    // console.log('Feedback submitted:', feedback);
    const toast = await this.toastCtrl.create({
      message: 'Thanks for your feedback!',
      duration: 2000,
      color: 'success'
    });
    await toast.present();

    this.router.navigate(['/patient-dashboard']);
  }

  skipFeedback() {
    this.router.navigate(['/patient-dashboard']);
  }
}

// import { Component } from '@angular/core';
// import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
// import { IonIcon, IonContent, IonLabel, IonItem, IonCardContent, IonCard, IonButton, IonCardHeader, IonTextarea, IonCardTitle } from '@ionic/angular/standalone';
// import { CommonModule } from '@angular/common';
// import { addIcons } from 'ionicons';
// import { Router } from '@angular/router';
// import { ToastController } from '@ionic/angular';
// import { 
//   starOutline, star,
// } from 'ionicons/icons';

// @Component({
//   standalone: true,
//   selector: 'app-post-feedback',
//   templateUrl: './post-consultation-feedback.page.html',
//   styleUrls: ['./post-consultation-feedback.page.scss'],
//   imports: [ReactiveFormsModule, CommonModule, IonIcon, IonContent, IonLabel, IonItem, IonCardContent, IonCard, IonButton, IonCardHeader, IonTextarea, IonCardTitle]
// })



// export class PostConsultationFeedbackPage {
//   feedbackForm: FormGroup;

//   constructor(private toastController: ToastController, private fb: FormBuilder, private router: Router, ) { // private yourService: YourApiService ----> saving feedback into backend
    
//     this.feedbackForm = this.fb.group({
//       rating: [null, Validators.required],
//       comments: ['']
//     });

//     addIcons({
//       starOutline, star, 
//     });
//   }


// async submitFeedback() {
//   const feedback = this.feedbackForm.value;

//   // Skip if nothing provided
//   if (!feedback.rating) {
//     this.router.navigate(['/patient-dashboard']);
//     return;
//   }

//   try {
//     // Save feedback to backend

//     // await this.yourService.saveFeedback(feedback).toPromise();

//     // Show success toast
//     const toast = await this.toastController.create({
//       message: 'Feedback submitted successfully!',
//       duration: 2000,
//       color: 'success',
//       position: 'top'
//     });
//     await toast.present();

//     // Navigate after toast delay
//     setTimeout(() => {
//       this.router.navigate(['/patient-dashboard']);
//     }, 2000);

//   } catch (error) {
//     const toast = await this.toastController.create({
//       message: 'Failed to submit feedback. Please try again.',
//       duration: 2000,
//       color: 'danger',
//       position: 'top'
//     });
//     await toast.present();
//   }
// }

//   skipFeedback() {
//     this.router.navigate(['/patient-dashboard']);
//   }
// }

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonIcon, IonContent, IonCardContent, IonCard, IonButton, IonCardHeader, IonTextarea } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'app-post-feedback',
  templateUrl: './post-consultation-feedback.page.html',
  styleUrls: ['./post-consultation-feedback.page.scss'],
  imports: [ReactiveFormsModule, CommonModule, IonIcon, IonContent, IonCardContent, IonCard, IonButton, IonCardHeader, IonTextarea]
})


export class PostConsultationFeedbackPage implements OnInit {
  feedbackForm!: FormGroup;
  // feedbackForm: FormGroup;
  mood: 'happy' | 'neutral' | 'sad' | '' = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.feedbackForm = this.fb.group({
      comment: [''],
      type: ['']
    });
  }

  selectMood(value: 'happy' | 'neutral' | 'sad') {
    this.mood = value;
  }

  async submit() {
    const feedback = {
      mood: this.mood,
      ...this.feedbackForm.value
    };

    // Save to backend (optional)
    // await this.feedbackService.submitFeedback(feedback).toPromise();

    const toast = await this.toastCtrl.create({
      message: 'Thanks for your feedback!',
      duration: 2000,
      color: 'success'
    });
    await toast.present();

    this.router.navigate(['/patient-dashboard']);
  }

  close() {
    this.router.navigate(['/patient-dashboard']);
  }
    skipFeedback() {
    this.router.navigate(['/patient-dashboard']);
  }
}

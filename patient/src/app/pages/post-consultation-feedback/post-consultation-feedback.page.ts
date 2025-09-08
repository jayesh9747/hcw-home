import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonButton, IonTextarea } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { ConsultationService, SubmitFeedbackRequest } from 'src/app/services/consultation.service';
import { UserService } from 'src/app/services/user.service';
@Component({
  standalone: true,
  selector: 'app-post-feedback',
  templateUrl: './post-consultation-feedback.page.html',
  styleUrls: ['./post-consultation-feedback.page.scss'],
  imports: [ReactiveFormsModule, CommonModule, IonContent, IonButton, IonTextarea]
})


export class PostConsultationFeedbackPage implements OnInit {
  feedbackForm!: FormGroup;
  selectedSatisfaction: 'satisfied' | 'neutral' | 'dissatisfied' | null = null;
  consultationId: number | null = null;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private consultationService: ConsultationService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.feedbackForm = this.fb.group({
      comment: ['']
    });

    // Get consultation ID from route parameters
    this.route.paramMap.subscribe(params => {
      const id = params.get('consultationId');
      this.consultationId = id ? parseInt(id, 10) : null;
    });
  }

  selectSatisfaction(satisfaction: 'satisfied' | 'neutral' | 'dissatisfied') {
    this.selectedSatisfaction = satisfaction;
  }

  async submit() {
    if (!this.consultationId) {
      await this.showToast('Consultation ID not found', 'danger');
      return;
    }

    this.isSubmitting = true;

    try {
      // Get current user
      const user = await this.userService.getCurrentUser().toPromise();
      if (!user) {
        await this.showToast('User not found', 'danger');
        return;
      }

      // Map frontend satisfaction to backend format
      let backendSatisfaction: 'SATISFIED' | 'NEUTRAL' | 'DISSATISFIED' | undefined;
      if (this.selectedSatisfaction === 'satisfied') {
        backendSatisfaction = 'SATISFIED';
      } else if (this.selectedSatisfaction === 'neutral') {
        backendSatisfaction = 'NEUTRAL';
      } else if (this.selectedSatisfaction === 'dissatisfied') {
        backendSatisfaction = 'DISSATISFIED';
      }

      const feedbackRequest: SubmitFeedbackRequest = {
        consultationId: this.consultationId,
        satisfaction: backendSatisfaction,
        comment: this.feedbackForm.value.comment || undefined
      };

      // Submit feedback
      await this.consultationService.submitFeedback(feedbackRequest, user.id).toPromise();
      
      await this.showToast('Thank you for your feedback!', 'success');
      this.router.navigate(['/patient-dashboard']);
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      await this.showToast('Failed to submit feedback. Please try again.', 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  skipFeedback() {
    this.router.navigate(['/patient-dashboard']);
  }

  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color
    });
    await toast.present();
  }
}

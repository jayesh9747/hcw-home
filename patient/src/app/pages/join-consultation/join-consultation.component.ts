import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { AuthService } from 'src/app/services/auth.service';
import { ToastController } from '@ionic/angular';

import {
  IonContent,
  IonButton,
  IonRow,
  IonGrid,
  IonLabel,
  IonCol,
  IonItem,
  IonCardContent,
  IonCardTitle,
  IonCardHeader,
  IonCard,
  IonCheckbox
} from '@ionic/angular/standalone';
import { JoinConsultationService } from 'src/app/services/joinConsultation.service';
import { RoutePaths } from 'src/app/constants/route-path.enum';

@Component({
  selector: 'app-join-consultation',
  standalone: true,
  imports: [
    IonItem,
    IonCol,
    IonRow,
    IonGrid,
    IonLabel,
    IonButton,
    IonCardContent,
    HeaderComponent,
    IonContent,
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IonCardTitle,
    IonCardHeader,
    IonCard,
    IonCheckbox,
  ],
  templateUrl: './join-consultation.component.html',
  styleUrls: ['./join-consultation.component.scss'],
})
export class JoinConsultationComponent implements OnInit {
  form!: FormGroup;
  private consultationId!: number;
    public RoutePaths = RoutePaths; 

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService: AuthService,
    private joinConsultationService: JoinConsultationService,
    private router: Router,
    private toastController: ToastController,

  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || isNaN(+idParam)) {
      this.presentToast('Invalid consultation ID. Redirecting...');
      this.router.navigate([RoutePaths.PatientDashboard]);
      return;
    }

    this.consultationId = +idParam; 

    this.form = this.fb.group({
      acceptTerms: [false, Validators.requiredTrue],
    });
  }

  get canJoin(): boolean {
    return this.form.valid;
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'bottom',
    });
    await toast.present();
  }

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
        error: (err: any) => {
          this.presentToast('Failed to join consultation.');
          console.error('Join error:', err);
        }
      });
  }

  join() {
    if (this.canJoin) {
      console.log('Joining consultation...');
      this.joinConsultation(this.consultationId);
    }
  }
  redirectToTerms() {
  const redirectUrl = `/join-consultation/${this.consultationId}`;
  this.router.navigate([RoutePaths.AcceptTerm], { queryParams: { redirect: redirectUrl }, fragment: 'terms' });
}

}

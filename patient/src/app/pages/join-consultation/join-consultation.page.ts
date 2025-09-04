import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
 IonContent, IonHeader, IonTitle, IonToolbar, IonCard,
 IonCardHeader, IonCardTitle, IonCardContent, IonButton,
 IonSpinner, IonText, IonIcon,
 LoadingController, ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { medicalOutline, linkOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';

import { AuthService } from 'src/app/services/auth.service';
import { JoinConsultationService } from 'src/app/services/joinConsultation.service';
import { RoutePaths } from 'src/app/constants/route-path.enum';

@Component({
 selector: 'app-join-consultation',
 templateUrl: './join-consultation.page.html',
 styleUrls: ['./join-consultation.page.scss'],
 standalone: true,
 imports: [
  CommonModule,
  IonContent, IonHeader, IonTitle, IonToolbar, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonSpinner, IonText, IonIcon
 ],
})
export class JoinConsultationPage implements OnInit {
 token: string = '';
 consultationId: number = 0;
 isLoading = false;
 errorMessage = '';
 joinMethod: 'token' | 'direct' | 'magic-link' = 'token';

 constructor(
  private route: ActivatedRoute,
  private router: Router,
  private authService: AuthService,
  private joinConsultationService: JoinConsultationService,
  private loadingController: LoadingController,
  private toastController: ToastController,
  private alertController: AlertController
 ) {
  addIcons({
   medicalOutline, linkOutline, checkmarkCircleOutline, alertCircleOutline
  });
 }

 ngOnInit() {
  console.log('[JoinConsultation] Initializing join consultation page');

  // Check for different join methods
  this.route.paramMap.subscribe(params => {
   const urlToken = params.get('token');
   if (urlToken) {
    this.token = urlToken;
    this.joinMethod = 'magic-link';
    this.processJoinRequest();
    return;
   }
  });

  this.route.queryParams.subscribe(params => {
   if (params['token']) {
    this.token = params['token'];
    this.joinMethod = 'token';
    this.processJoinRequest();
    return;
   }

   if (params['consultationId']) {
    this.consultationId = parseInt(params['consultationId']);
    this.joinMethod = 'direct';
    this.processJoinRequest();
    return;
   }

   // No valid parameters
   this.errorMessage = 'Invalid consultation link. Missing required parameters.';
  });
 }

 /**
  * Process the join request based on method
  */
 private async processJoinRequest(): Promise<void> {
  this.isLoading = true;
  this.errorMessage = '';

  const loading = await this.loadingController.create({
   message: 'Joining consultation...',
  });
  await loading.present();

  try {
   console.log(`[JoinConsultation] Processing join request via ${this.joinMethod}`);

   const user = this.authService.getCurrentUser();
   let response;

   switch (this.joinMethod) {
    case 'magic-link':
    case 'token':
     response = await this.joinConsultationService.joinByToken(this.token, {
      userId: user?.id,
      clientInfo: { source: 'magic-link' }
     });
     break;

    case 'direct':
     if (!user?.id) {
      this.handleAuthRequired();
      return;
     }
     response = await this.joinConsultationService.joinByToken(
      this.consultationId.toString(),
      {
       userId: user.id,
       clientInfo: { source: 'direct-link' }
      }
     );
     break;

    default:
     throw new Error('Invalid join method');
   }

   await loading.dismiss();
   await this.handleSuccessfulJoin(response);

  } catch (error: any) {
   await loading.dismiss();
   this.handleJoinError(error);
  } finally {
   this.isLoading = false;
  }
 }

 /**
  * Handle successful join response
  */
 private async handleSuccessfulJoin(response: any): Promise<void> {
  console.log('[JoinConsultation] Join successful:', response);

  if (!response?.consultationId) {
   this.errorMessage = 'Invalid response from server. Please try again.';
   return;
  }

  const consultationId = response.consultationId;
  const redirectTo = response.redirectTo;

  // Show success message
  let message = 'Successfully joined consultation!';

  if (redirectTo === 'waiting-room') {
   message = 'Welcome! You are now in the waiting room.';
   this.showToast(message, 'success');
   this.router.navigate(['/waiting-room', consultationId]);
  } else if (redirectTo === 'consultation-room') {
   message = 'Joining consultation room now...';
   this.showToast(message, 'success');
   this.router.navigate(['/consultation-room', consultationId]);
  } else {
   // Default fallback
   this.showToast(message, 'success');
   this.router.navigate([`/${RoutePaths.PatientDashboard}`]);
  }
 }

 /**
  * Handle join errors
  */
 private handleJoinError(error: any): void {
  console.error('[JoinConsultation] Join error:', error);

  if (error?.status === 401 || error?.code === 'UNAUTHORIZED') {
   this.handleAuthRequired();
  } else if (error?.status === 404 || error?.code === 'CONSULTATION_NOT_FOUND') {
   this.errorMessage = 'Consultation not found or link has expired.';
  } else if (error?.status === 409 || error?.code === 'CONFLICT') {
   this.errorMessage = 'You are already active in another consultation.';
  } else if (error?.status === 403 || error?.code === 'FORBIDDEN') {
   this.errorMessage = 'You do not have permission to join this consultation.';
  } else {
   this.errorMessage = error?.message || 'Unable to join consultation. Please try again.';
  }
 }

 /**
  * Handle authentication required scenario
  */
 private async handleAuthRequired(): Promise<void> {
  const alert = await this.alertController.create({
   header: 'Login Required',
   message: 'You need to log in to join this consultation.',
   buttons: [
    {
     text: 'Cancel',
     role: 'cancel',
     handler: () => {
      this.router.navigate([`/${RoutePaths.PatientDashboard}`]);
     }
    },
    {
     text: 'Login',
     handler: () => {
      const returnUrl = this.buildReturnUrl();
      this.router.navigate([`/${RoutePaths.Login}`], {
       queryParams: { returnUrl }
      });
     }
    }
   ]
  });

  await alert.present();
 }

 /**
  * Build return URL for after login
  */
 private buildReturnUrl(): string {
  if (this.token) {
   return `/join-consultation?token=${this.token}`;
  } else if (this.consultationId) {
   return `/join-consultation?consultationId=${this.consultationId}`;
  }
  return '/dashboard';
 }

 /**
  * Retry join attempt
  */
 async retryJoin(): Promise<void> {
  if (this.token || this.consultationId) {
   this.errorMessage = '';
   await this.processJoinRequest();
  }
 }

 /**
  * Navigate to dashboard
  */
 goToDashboard(): void {
  this.router.navigate([`/${RoutePaths.PatientDashboard}`]);
 }

 /**
  * Navigate to login
  */
 goToLogin(): void {
  const returnUrl = this.buildReturnUrl();
  this.router.navigate([`/${RoutePaths.Login}`], {
   queryParams: { returnUrl }
  });
 }

 /**
  * Show toast message
  */
 private async showToast(message: string, color: string = 'success'): Promise<void> {
  const toast = await this.toastController.create({
   message,
   duration: 3000,
   color,
   position: 'top',
  });
  toast.present();
 }
}


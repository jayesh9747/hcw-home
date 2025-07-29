import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonButton,
  IonRow,
  IonGrid,
  IonLabel,
  IonCol,
  IonItem,
  IonInput,
  IonText,
  IonSpinner
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { HeaderComponent } from 'src/app/components/header/header.component';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    IonSpinner,
    IonText,
    IonInput,
    IonItem,
    IonCol,
    IonRow,
    IonGrid,
    IonLabel,
    IonIcon,
    IonButton,
    HeaderComponent,
    IonContent,
    CommonModule,
    ReactiveFormsModule
  ]
})
export class LoginPage implements OnInit {
  private router = inject(Router);
  private toastController = inject(ToastController);

  loginForm!: FormGroup;
  isLoading = false;

  ngOnInit() {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.email]),
      phoneNumber: new FormControl('', [Validators.pattern(/^\d{10}$/)])
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get phoneNumber() {
    return this.loginForm.get('phoneNumber');
  }

  async onLogin() {
    const email = this.email?.value;
    const phone = this.phoneNumber?.value;

    if (!email && !phone) {
      this.showToast('Please enter email or phone number', 'danger');
      return;
    }

    if (email && this.email?.invalid) {
      this.showToast('Invalid email format', 'danger');
      return;
    }

    if (phone && this.phoneNumber?.invalid) {
      this.showToast('Invalid phone number', 'danger');
      return;
    }

    this.isLoading = true;
    try {
      if (email) {
        await this.authenticateUser(email);
        this.showToast(`Welcome back, ${email}!`, 'success');
      } else {
        await this.authenticatePhone(phone);
        this.showToast(`Welcome back, ${phone}!`, 'success');
      }

      await this.router.navigate(['/patient-dashboard']);
    } catch (error) {
      console.error('Login error:', error);
      this.showToast('Login failed. Please try again.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async authenticateUser(email: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (email) return Promise.resolve();
    else throw new Error('Invalid email');
  }

  async authenticatePhone(phone: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (phone && /^\d{10}$/.test(phone)) return Promise.resolve();
    else throw new Error('Invalid phone');
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
      buttons: [{ text: 'Dismiss', role: 'cancel' }]
    });
    await toast.present();
  }
}

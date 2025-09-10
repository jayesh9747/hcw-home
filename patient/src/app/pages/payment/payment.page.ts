import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { switchMap, catchError } from 'rxjs/operators';
import { FormGroup, Validators, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { StripeCardNumberComponent, StripeService, NgxStripeModule } from 'ngx-stripe';
import {
  StripeCardElementOptions,
  StripeElementsOptions,
  PaymentIntent,
} from '@stripe/stripe-js';
import { of, Subscription } from 'rxjs';
import { PaymentService, PaymentIntentDTO, PaymentIntentResponse } from 'src/app/services/payment.service';
import { 
  IonIcon,
  IonContent, 
  IonInput,
  IonButton,
  IonSelect,
  IonSelectOption,
  LoadingController,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { HeaderComponent } from 'src/app/components/header/header.component';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  imports: [
    CommonModule,
    HeaderComponent,
    IonIcon,
    IonContent,
    IonInput,
    IonButton,
    IonSelect,
    IonSelectOption,
    ReactiveFormsModule,
    // Stripe
    NgxStripeModule
  ],
  standalone: true
})
export class PaymentPage implements OnInit, OnDestroy {
  @ViewChild(StripeCardNumberComponent) card!: StripeCardNumberComponent;
  
  private readonly consultationId = 8;
  private subscription: Subscription = new Subscription();

  // Currency mapping for symbols and names
  private currencyMap = {
    usd: { symbol: '$', name: 'US Dollars' },
    eur: { symbol: '€', name: 'Euros' },
    gbp: { symbol: '£', name: 'British Pounds' },
    inr: { symbol: '₹', name: 'Indian Rupees' },
    cad: { symbol: 'C$', name: 'Canadian Dollars' },
    aud: { symbol: 'A$', name: 'Australian Dollars' },
    jpy: { symbol: '¥', name: 'Japanese Yen' }
  };

  public cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        fontWeight: 400,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '16px',
        iconColor: '#3880ff',
        color: '#000',
        '::placeholder': {
          color: '#999',
        },
      },
    },
  };

  public elementsOptions: StripeElementsOptions = {
    locale: 'en',
  };

  paymentForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    currency: ['usd', [Validators.required]], // Default to USD
    amount: [null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
  });

  constructor(
    private fb: FormBuilder,
    private stripeService: StripeService,
    private paymentService: PaymentService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Watch for currency changes to update the display
    this.paymentForm.get('currency')?.valueChanges.subscribe(() => {
      // This will trigger the UI update for currency symbols
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getCurrencySymbol(): string {
    const currency = this.paymentForm.get('currency')?.value || 'usd';
    return this.currencyMap[currency as keyof typeof this.currencyMap]?.symbol || '$';
  }

  getCurrencyName(): string {
    const currency = this.paymentForm.get('currency')?.value || 'usd';
    return this.currencyMap[currency as keyof typeof this.currencyMap]?.name || 'US Dollars';
  }

  async pay(): Promise<void> {
    if (!this.paymentForm.valid) {
      await this.presentInvalidFormAlert();
      return;
    }

    if (!this.card?.element) {
      await this.presentErrorAlert('Card information is required');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Processing payment...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const formData = this.paymentForm.value;
      const selectedCurrency = formData.currency || 'usd';
      
      const paymentIntentDto: PaymentIntentDTO = {
        amount: formData.amount,
        consultationId: this.consultationId,
        currency: selectedCurrency
      };
      
      const paymentSub = this.paymentService.createPaymentIntent(paymentIntentDto)
        .pipe(
          switchMap((response: PaymentIntentResponse) => {
            if (!response.data.success || !response.data?.data?.clientSecret) {
              throw new Error(response.message || 'Failed to create payment intent');
            }
            
            console.log('Payment Intent created:', response.data);
            return this.stripeService.confirmCardPayment(response.data.data.clientSecret, {
              payment_method: {
                card: this.card.element,
                billing_details: {
                  name: formData.name,
                  email: formData.email,
                },
              },
            });
          }),
          catchError((error) => {
            console.error('Payment processing error:', error);
            return of({ error: { message: error.message || 'Payment processing failed' } });
          })
        )
        .subscribe({
          next: async (result) => {
            await loading.dismiss();
            await this.handlePaymentResult(result);
          },
          error: async (error) => {
            await loading.dismiss();
            await this.presentErrorAlert('An unexpected error occurred');
            console.error('Payment subscription error:', error);
          }
        });

      this.subscription.add(paymentSub);
    } catch (error) {
      await loading.dismiss();
      await this.presentErrorAlert('Failed to initialize payment');
      console.error('Payment initialization error:', error);
    }
  }

  private async handlePaymentResult(result: any): Promise<void> {
    console.log("Payment result: ", result);
    
    if (result.error) {
      await this.presentErrorAlert(result.error.message || 'Payment failed');
    } else if (result.paymentIntent?.status === 'succeeded') {
      await this.presentSuccessToast();
      this.resetForm();
      
      if (result.paymentIntent.id) {
        this.confirmPaymentOnBackend(result.paymentIntent.id);
      }
    } else if (result.paymentIntent?.status === 'requires_action') {
      await this.presentErrorAlert('Payment requires additional authentication');
    } else {
      await this.presentErrorAlert('Payment could not be processed');
    }
  }

  private confirmPaymentOnBackend(paymentIntentId: string): void {
    const confirmSub = this.paymentService.confirmPayment({ paymentIntentId })
      .subscribe({
        next: (response) => {
          console.log('Payment confirmed on backend:', response);
        },
        error: (error) => {
          console.error('Backend confirmation failed:', error);
        }
      });
    
    this.subscription.add(confirmSub);
  }

  private async presentInvalidFormAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Invalid Form',
      message: 'Please fill in all required fields correctly.',
      buttons: ['OK']
    });
    await alert.present();
  }

  private async presentErrorAlert(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Payment Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async presentSuccessToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Payment completed successfully!',
      duration: 3000,
      position: 'top',
      color: 'success',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  private resetForm(): void {
    this.paymentForm.reset({
      currency: 'usd' // Reset to default USD
    });
    // Clear Stripe card element
    if (this.card?.element) {
      this.card.element.clear();
    }
  }

  // Form validation helpers
  get nameError(): string {
    const nameControl = this.paymentForm.get('name');
    if (nameControl?.touched && nameControl?.errors) {
      if (nameControl.hasError('required')) {
        return 'Name is required';
      }
      if (nameControl.hasError('minlength')) {
        return 'Name must be at least 2 characters';
      }
    }
    return '';
  }

  get emailError(): string {
    const emailControl = this.paymentForm.get('email');
    if (emailControl?.touched && emailControl?.errors) {
      if (emailControl.hasError('required')) {
        return 'Email is required';
      }
      if (emailControl.hasError('email')) {
        return 'Please enter a valid email';
      }
    }
    return '';
  }

  get currencyError(): string {
    const currencyControl = this.paymentForm.get('currency');
    if (currencyControl?.touched && currencyControl?.errors) {
      if (currencyControl.hasError('required')) {
        return 'Currency is required';
      }
    }
    return '';
  }

  get amountError(): string {
    const amountControl = this.paymentForm.get('amount');
    if (amountControl?.touched && amountControl?.errors) {
      if (amountControl.hasError('required')) {
        return 'Amount is required';
      }
      if (amountControl.hasError('min')) {
        return 'Amount must be greater than 0';
      }
      if (amountControl.hasError('pattern')) {
        return 'Please enter a valid amount';
      }
    }
    return '';
  }
}
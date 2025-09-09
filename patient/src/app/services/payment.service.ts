import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PaymentIntentDTO {
  currency?: string;
  amount: number;
  consultationId: number;
  paymentMethod?: string;
}

export interface ConfirmPaymentDTO {
  paymentIntentId: string;
}

export interface PaymentIntentResponse {
  data: {
    data: {
      clientSecret: string;
      paymentIntentId: string;
    };
    success: boolean;
  };
  message?: string;
}

export interface PaymentConfirmationResponse {
  success: boolean;
  message?: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly baseUrl = `${environment.apiUrl}/v1/payment`;

  constructor(private http: HttpClient) {}

  createPaymentIntent(paymentIntentDto: PaymentIntentDTO): Observable<PaymentIntentResponse> {
    const url = `${this.baseUrl}/create-intent`;
    return this.http.post<PaymentIntentResponse>(url, paymentIntentDto);
  }

  confirmPayment(confirmPaymentDTO: ConfirmPaymentDTO): Observable<PaymentConfirmationResponse> {
    const url = `${this.baseUrl}/confirm-payment`;
    return this.http.post<PaymentConfirmationResponse>(url, confirmPaymentDTO);
  }
}
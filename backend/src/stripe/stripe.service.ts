import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY! , {
      apiVersion: '2025-07-30.basil',
    });
  }

  async createCustomer(params: Stripe.CustomerCreateParams): Promise<Stripe.Customer> {
    return this.stripe.customers.create(params);
  }

  async createPaymentIntent(params: Stripe.PaymentIntentCreateParams): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create(params);
  }

  async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(id);
  }

  async createRefund(params: Stripe.RefundCreateParams): Promise<Stripe.Refund> {
    return this.stripe.refunds.create(params);
  }

  async createSetupIntent(params: Stripe.SetupIntentCreateParams): Promise<Stripe.SetupIntent> {
    return this.stripe.setupIntents.create(params);
  }
}
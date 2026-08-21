import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentService, PaymentStatusResponse } from '../../core/services/payments';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout {
  phone: string = '';
  amount: number = 100; // Example amount

  isProcessing: boolean = false;
  paymentState: 'IDLE' | 'PENDING' | 'COMPLETED' | 'FAILED' = 'IDLE';
  statusMessage: string = '';
  mpesaReceipt: string | null = null;

  constructor(private paymentService: PaymentService) {}

  payWithMpesa(): void {
    if (!this.phone) {
      this.statusMessage = 'Please enter a valid phone number.';
      return;
    }

    this.isProcessing = true;
    this.paymentState = 'PENDING';
    this.statusMessage = 'Sending STK Push prompt to your phone...';

    this.paymentService.initiateStkPush(this.phone, this.amount).subscribe({
      next: (res) => {
        if (res.success && res.checkoutRequestId) {
          this.statusMessage = 'STK Push sent! Please enter your M-Pesa PIN on your phone.';
          this.listenForPaymentStatus(res.checkoutRequestId);
        } else {
          this.handleFailure(res.message || 'Failed to trigger STK Push.');
        }
      },
      error: (err) => {
        this.handleFailure(err.error?.message || 'Error connecting to payment server.');
      }
    });
  }

  private listenForPaymentStatus(checkoutRequestId: string): void {
    this.paymentService.pollPaymentStatus(checkoutRequestId).subscribe({
      next: (res: PaymentStatusResponse) => {
        if (res.status === 'COMPLETED') {
          this.paymentState = 'COMPLETED';
          this.isProcessing = false;
          this.mpesaReceipt = res.receipt || null;
          this.statusMessage = 'Payment received successfully!';
        } else if (res.status === 'FAILED') {
          this.handleFailure(res.message || 'Payment was cancelled or failed.');
        }
      },
      error: () => {
        this.handleFailure('Failed to verify payment status.');
      }
    });
  }

  private handleFailure(message: string): void {
    this.paymentState = 'FAILED';
    this.isProcessing = false;
    this.statusMessage = message;
  }
}

import { Component, OnInit, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { timer, switchMap, takeWhile } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Cart } from '../../core/services/cart';
import { PaymentService, PaymentStatusResponse } from '../../core/services/payments';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout implements OnInit {
  phone: string = '';
  guestName: string = '';
  amount: number = 0;
  cartItems: any[] = [];

  isProcessing: boolean = false;
  paymentState: 'IDLE' | 'PENDING' | 'COMPLETED' | 'FAILED' = 'IDLE';
  statusMessage: string = '';
  mpesaReceipt: string | null = null;

  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private cartService: Cart,
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCartSummary();
  }

  loadCartSummary(): void {
    this.cartService.validateCartWithBackend().subscribe({
      next: (res) => {
        if (res.success) {
          this.amount = res.subtotal;
          this.cartItems = res.items || [];
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.statusMessage = 'Failed to load cart summary.';
        this.cdr.detectChanges();
      }
    });
  }

  payWithMpesa(): void {
    let formattedPhone = this.phone.trim().replace(/\+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }

    if (!formattedPhone || formattedPhone.length < 10) {
      this.statusMessage = 'Please enter a valid Safaricom phone number (e.g., 0712345678).';
      return;
    }

    if (this.amount <= 0) {
      this.statusMessage = 'Cart is empty or subtotal is invalid.';
      return;
    }

    this.isProcessing = true;
    this.paymentState = 'PENDING';
    this.statusMessage = 'Sending STK Push prompt to your phone...';
    this.cdr.detectChanges();

    const customerName = this.guestName.trim() || 'Guest Customer';

    this.paymentService.initiateStkPush(formattedPhone, this.amount, this.cartItems, customerName).subscribe({
      next: (res) => {
        if (res.success && res.checkoutRequestId) {
          this.statusMessage = 'STK Push sent! Enter your M-Pesa PIN on your phone.';
          this.cdr.detectChanges();
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
    timer(0, 3000)
      .pipe(
        switchMap(() => this.paymentService.pollPaymentStatus(checkoutRequestId)),
        // Continue polling ONLY while state is PENDING.
        // `true` ensures the emissions for COMPLETED or FAILED are processed before terminating.
        takeWhile((res: PaymentStatusResponse) => res.status === 'PENDING', true),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res: PaymentStatusResponse) => {
          console.log('[POLL RESPONSE]:', res); // Debug log in browser console

          if (res.status === 'COMPLETED') {
            this.paymentState = 'COMPLETED';
            this.isProcessing = false;
            this.mpesaReceipt = res.receipt || null;
            this.statusMessage = 'Payment received successfully!';

            this.cartService.clearCart();
            this.cdr.detectChanges();

            const trackId = res.tracking_number || 'success';
            setTimeout(() => {
              this.router.navigate(['/track', trackId]);
            }, 1500);

          } else if (res.status === 'FAILED') {
            this.handleFailure(res.message || 'Payment prompt was cancelled or failed.');
          }
        },
        error: () => {
          this.handleFailure('Failed to verify payment status with server.');
        }
      });
  }

  private handleFailure(message: string): void {
    this.paymentState = 'FAILED';
    this.isProcessing = false;
    this.statusMessage = message;
    this.cdr.detectChanges(); // Force template update
  }
}

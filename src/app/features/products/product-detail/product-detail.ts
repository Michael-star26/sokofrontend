import { Component, inject, signal, ViewEncapsulation, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ProductService } from '../../../core/services/product';
import { Auth } from '../../../core/services/auth';
import { PaymentService } from '../../../core/services/payments';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// NG-ZORRO Modules
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    NzButtonModule,
    NzSpinModule,
    NzTagModule,
    NzPopconfirmModule,
    NzModalModule,
    NzInputModule
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
  encapsulation: ViewEncapsulation.None
})
export class ProductDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private authService = inject(Auth);
  private paymentService = inject(PaymentService);
  private message = inject(NzMessageService);
  private destroyRef = inject(DestroyRef);
  
  isAdmin = toSignal(this.authService.isAdmin$, { initialValue: false });
  product = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        return this.productService.getProductById(id);
      })
    )
  );

  // M-Pesa Modal & Guest Form State
  isCheckoutVisible = signal(false);
  guestName = signal('');
  phoneNumber = signal('');
  isProcessing = signal(false);
  statusText = signal('');

  openCheckoutModal(): void {
    this.isCheckoutVisible.set(true);
    this.isProcessing.set(false);
    this.statusText.set('');
  }

  closeCheckoutModal(): void {
    if (!this.isProcessing()) {
      this.isCheckoutVisible.set(false);
    }
  }

  processCheckout(amount: number): void {
    const phone = this.phoneNumber().trim();
    const name = this.guestName().trim() || 'Guest Customer';

    if (!phone) {
      this.message.warning('Please enter an M-Pesa phone number');
      return;
    }

    this.isProcessing.set(true);
    this.statusText.set('Triggering STK push prompt on your phone...');

    this.paymentService.initiateStkPush(phone, amount, name).subscribe({
      next: (res) => {
        if (res.success && res.checkoutRequestId) {
          this.statusText.set('Prompt sent! Please enter your M-Pesa PIN...');
          this.pollPayment(res.checkoutRequestId);
        } else {
          this.message.error(res.message || 'Failed to initiate STK Push');
          this.isProcessing.set(false);
        }
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Server error initiating payment');
        this.isProcessing.set(false);
      }
    });
  }

  private pollPayment(checkoutRequestId: string): void {
    this.paymentService.pollPaymentStatus(checkoutRequestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.status === 'COMPLETED') {
            this.message.success(`Payment verified! Receipt: ${res.receipt || 'OK'}`);
            this.isProcessing.set(false);
            this.isCheckoutVisible.set(false);
            this.router.navigate(['/products']);
          } else if (res.status === 'FAILED') {
            this.message.error(res.message || 'Payment cancelled or failed');
            this.isProcessing.set(false);
          }
        },
        error: () => {
          this.message.error('Failed to verify payment status');
          this.isProcessing.set(false);
        }
      });
  }

  deleteProduct(id: number): void {
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.message.success('Product removed from the forest');
        this.router.navigate(['/products']);
      },
      error: () => this.message.error('Failed to delete product')
    });
  }

  // prevent leaked polling subscription

}

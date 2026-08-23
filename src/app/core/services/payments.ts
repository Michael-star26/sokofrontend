import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, throwError } from 'rxjs';
import { switchMap, takeWhile, catchError } from 'rxjs/operators';

export interface StkPushResponse {
  success: boolean;
  message: string;
  checkoutRequestId?: string;
  order_id?: number;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  receipt?: string;
  tracking_number?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  // Corrected to match Flask url_prefix='/api/payment'
  private readonly baseUrl = 'https://michaellee.pythonanywhere.com/api/payments';

  constructor(private http: HttpClient) {}

  /**
   * Triggers M-Pesa STK Push prompt to user's phone
   */
  initiateStkPush(phone: string, amount: number, items?: any[], name?: string): Observable<StkPushResponse> {
    return this.http.post<StkPushResponse>(`${this.baseUrl}/stk-push`, { phone, amount, items, name });
  }

  /**
   * Polls the backend every 3 seconds to check payment status.
   * Keeps polling while status is 'PENDING', and emits the final 'COMPLETED' or 'FAILED' response.
   */
  pollPaymentStatus(checkoutRequestId: string): Observable<PaymentStatusResponse> {
    return timer(0, 3000).pipe(
      switchMap(() => this.http.get<PaymentStatusResponse>(`${this.baseUrl}/status/${checkoutRequestId}`)),
      takeWhile(response => response.status === 'PENDING', true),
      catchError(err => throwError(() => err))
    );
  }
}

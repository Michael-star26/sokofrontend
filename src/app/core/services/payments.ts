import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, throwError } from 'rxjs';
import { switchMap, takeWhile, catchError } from 'rxjs/operators';

export interface StkPushResponse {
  success: boolean;
  message: string;
  checkoutRequestId?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  receipt?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly baseUrl = 'http://127.0.0.1:5000/api/payments';

  constructor(private http: HttpClient) {}

  /**
   * Triggers M-Pesa STK Push prompt to user's phone
   */
  initiateStkPush(phone: string, amount: number,name?:string): Observable<StkPushResponse> {
    return this.http.post<StkPushResponse>(`${this.baseUrl}/stk-push`, { phone, amount,name });
  }

  /**
   * Polls the backend every 3 seconds to check payment status
   * Automatically stops polling once status changes from PENDING to COMPLETED or FAILED
   */
  pollPaymentStatus(checkoutRequestId: string): Observable<PaymentStatusResponse> {
    return timer(0, 3000).pipe(
      switchMap(() => this.http.get<PaymentStatusResponse>(`${this.baseUrl}/status/${checkoutRequestId}`)),
      takeWhile(response => response.status === 'PENDING', true),
      catchError(err => throwError(() => err))
    );
  }
}

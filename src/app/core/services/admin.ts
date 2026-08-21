import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  is_low_stock: boolean;
}

export interface AdminOrder {
  id: number;
  user_id: number;
  customer_username: string;
  customer_phone: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  total_amount: number;
  tracking_number: string;
  carrier: string;
  created_at: string;
  items_count: number;
}

export interface PaymentAudit {
  id: number;
  user_id: number;
  order_id: number | null;
  amount: number;
  phone_number: string;
  status: string;
  mpesa_receipt: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/admin';

  private getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  getInventory(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/inventory`, this.getAuthHeaders());
  }

  updateStock(productId: number, stock: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/inventory/${productId}/stock`, { stock }, this.getAuthHeaders());
  }

  getOrders(): Observable<AdminOrder[]> {
    return this.http.get<AdminOrder[]>(`${this.apiUrl}/orders`, this.getAuthHeaders());
  }

  updateOrderStatus(orderId: number, status: string, carrier?: string, tracking_number?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/orders/${orderId}/status`, { status, carrier, tracking_number }, this.getAuthHeaders());
  }

  getPayments(): Observable<PaymentAudit[]> {
    return this.http.get<PaymentAudit[]>(`${this.apiUrl}/payments`, this.getAuthHeaders());
  }
}

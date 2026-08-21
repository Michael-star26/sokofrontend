import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminOrder } from '../../../../core/services/admin';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzTagModule,
    NzSelectModule
  ],
  template: `
    <div class="orders-container">
      <nz-table #ordersTable [nzData]="orders()" [nzLoading]="isLoading()" class="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Phone</th>
            <th>Items</th>
            <th>Total Amount</th>
            <th>Tracking Code</th>
            <th>Carrier</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          @for (order of ordersTable.data; track order.id) {
            <tr>
              <td><strong>#{{ order.id }}</strong></td>
              <td>{{ order.customer_username }}</td>
              <td>{{ order.customer_phone }}</td>
              <td>{{ order.items_count }}</td>
              <td><strong>KSh {{ order.total_amount | number:'1.2-2' }}</strong></td>
              <td><code>{{ order.tracking_number }}</code></td>
              <td>{{ order.carrier }}</td>
              <td>
                <nz-select
                  [ngModel]="order.status"
                  (ngModelChange)="onStatusChange(order.id, $event)"
                  nzSize="small"
                  style="width: 140px;">
                  <nz-option nzValue="PENDING" nzLabel="PENDING"></nz-option>
                  <nz-option nzValue="PROCESSING" nzLabel="PROCESSING"></nz-option>
                  <nz-option nzValue="SHIPPED" nzLabel="SHIPPED"></nz-option>
                  <nz-option nzValue="DELIVERED" nzLabel="DELIVERED"></nz-option>
                  <nz-option nzValue="CANCELLED" nzLabel="CANCELLED"></nz-option>
                </nz-select>
              </td>
            </tr>
          }
        </tbody>
      </nz-table>
    </div>
  `
})
export class OrderList implements OnInit {
  private adminService = inject(AdminService);
  private message = inject(NzMessageService);

  orders = signal<AdminOrder[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.adminService.getOrders().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.message.error('Failed to retrieve system orders.');
        this.isLoading.set(false);
      }
    });
  }

  onStatusChange(orderId: number, newStatus: string): void {
    this.adminService.updateOrderStatus(orderId, newStatus).subscribe({
      next: (res) => {
        this.message.success(res.message || `Order #${orderId} updated.`);
        this.orders.update(items =>
          items.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o)
        );
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Failed to update order status.');
      }
    });
  }
}

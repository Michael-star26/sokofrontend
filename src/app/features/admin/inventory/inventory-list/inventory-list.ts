import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, InventoryItem } from '../../../../core/services/admin';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [
    CommonModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzInputNumberModule
  ],
  template: `
    <div class="inventory-container">
      <nz-table #invTable [nzData]="inventory()" [nzLoading]="isLoading()" class="inventory-table">
        <thead>
          <tr>
            <th>Product ID</th>
            <th>Item Name</th>
            <th>Category</th>
            <th>Unit Price</th>
            <th>Current Stock</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          @for (item of invTable.data; track item.id) {
            <tr>
              <td>#{{ item.id }}</td>
              <td>
                <strong>{{ item.name }}</strong>
                @if (item.is_low_stock) {
                  <nz-tag nzColor="error" style="margin-left: 8px;">LOW STOCK</nz-tag>
                }
              </td>
              <td>{{ item.category }}</td>
              <td>KSh {{ item.price | number:'1.2-2' }}</td>
              <td>
                <input
                  type="number"
                  #stockInput
                  [value]="item.stock"
                  min="0"
                  style="width: 80px; padding: 4px; border: 1px solid #d9d9d9; border-radius: 4px;" />
              </td>
              <td>
                <button
                  nz-button
                  nzType="primary"
                  nzSize="small"
                  (click)="updateStock(item, stockInput.value)">
                  Save Stock
                </button>
              </td>
            </tr>
          }
        </tbody>
      </nz-table>
    </div>
  `
})
export class InventoryList implements OnInit {
  private adminService = inject(AdminService);
  private message = inject(NzMessageService);

  inventory = signal<InventoryItem[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    this.isLoading.set(true);
    this.adminService.getInventory().subscribe({
      next: (data) => {
        // Force array binding to trigger signal reactivity
        this.inventory.set([...data]);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Failed to load inventory stock.');
        this.isLoading.set(false);
      }
    });
  }

  updateStock(item: InventoryItem, newStock: string): void {
    const parsedStock = parseInt(newStock, 10);

    if (isNaN(parsedStock) || parsedStock < 0) {
      this.message.warning('Please enter a valid non-negative integer.');
      return;
    }

    // Prevent unnecessary API calls if value hasn't changed
    if (item.stock === parsedStock) {
      return;
    }

    // Store original value in case rollback is needed
    const originalStock = item.stock;

    // Optimistic UI update for immediate feedback
    item.stock = parsedStock;
    item.is_low_stock = parsedStock < 10;

    this.adminService.updateStock(item.id, parsedStock).subscribe({
      next: (res) => {
        this.message.success(res.message || 'Stock level saved successfully.');
        // Update with server response payload if available
        if (res.product) {
          item.stock = res.product.stock;
          item.is_low_stock = res.product.is_low_stock;
        }
      },
      error: (err) => {
        // Rollback UI to original state on failure
        item.stock = originalStock;
        item.is_low_stock = originalStock < 10;
        this.message.error(err.error?.message || 'Failed to update stock.');
      }
    });
  }
}

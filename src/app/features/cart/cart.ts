import { Component, inject, signal, ViewEncapsulation, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Cart, CartItem } from '../../core/services/cart';

// NG-ZORRO Modules
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    NzButtonModule,
    NzInputNumberModule,
    NzTableModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzIconModule,
    FormsModule
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
  encapsulation: ViewEncapsulation.None
})
export class CartView implements OnInit {
  private cartService = inject(Cart);
  private router = inject(Router);
  private message = inject(NzMessageService);

  cartItems = signal<CartItem[]>([]);
  subtotal = signal<number>(0);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadAndValidateCart();
  }

  loadAndValidateCart(): void {
    this.isLoading.set(true);

    // Map local items as a backup lookup
    const localMap = new Map(
      this.cartService.getCartItems().map(i => [i.product_id, i.quantity])
    );

    this.cartService.validateCartWithBackend().subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.items)) {
          const mappedItems: CartItem[] = res.items.map((item: any) => {
            const backendQty = item.allocated_quantity || item.requested_quantity || item.quantity;
            const fallbackQty = localMap.get(item.product_id) || 1;
            const finalQty = (backendQty && backendQty > 0) ? backendQty : fallbackQty;

            return {
              product_id: item.product_id,
              name: item.name,
              unit_cost: item.unit_cost,
              quantity: finalQty,
              available_stock: item.available_stock,
              in_stock: item.in_stock,
              image_url: item.image_url
            };
          });

          this.cartItems.set(mappedItems);
          this.subtotal.set(res.subtotal || this.calculateLocalSubtotalFrom(mappedItems));
        } else {
          this.loadFallbackLocalCart();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.loadFallbackLocalCart();
        this.isLoading.set(false);
      }
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this.cartService.updateQuantity(productId, quantity);

    // Optimistically update view state so UI responds instantly without full re-spin
    const updated = this.cartItems().map(i =>
      i.product_id === productId ? { ...i, quantity } : i
    );
    this.cartItems.set(updated);
    this.subtotal.set(this.calculateLocalSubtotalFrom(updated));
  }

  removeItem(productId: number): void {
    this.cartService.removeFromCart(productId);
    this.message.info('Item removed from cart');

    const updated = this.cartItems().filter(i => i.product_id !== productId);
    this.cartItems.set(updated);
    this.subtotal.set(this.calculateLocalSubtotalFrom(updated));
  }

  clearCart(): void {
    this.cartService.clearCart();
    this.cartItems.set([]);
    this.subtotal.set(0);
    this.message.success('Cart cleared');
  }

  proceedToCheckout(): void {
    if (this.cartItems().length === 0) {
      this.message.warning('Your cart is empty');
      return;
    }
    this.router.navigate(['/checkout']);
  }

  // --- Helper Calculations ---
  private loadFallbackLocalCart(): void {
    const localItems = this.cartService.getCartItems();
    this.cartItems.set(localItems);
    this.subtotal.set(this.calculateLocalSubtotalFrom(localItems));
  }

  private calculateLocalSubtotalFrom(items: CartItem[]): number {
    return items.reduce((acc, item) => acc + ((item.unit_cost || 0) * item.quantity), 0);
  }
}

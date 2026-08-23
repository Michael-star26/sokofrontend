import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export interface CartItem {
  product_id: number;
  quantity: number;
  name?: string;
  unit_cost?: number;
  image_url?: string;
  available_stock?: number;
  in_stock?: boolean;
}

export interface CartValidationResponse {
  success: boolean;
  items: Array<{
    product_id: number;
    name: string;
    unit_cost: number;
    requested_quantity: number;
    allocated_quantity: number;
    available_stock: number;
    in_stock: boolean;
    image_url: string;
    item_total: number;
  }>;
  subtotal: number;
  item_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class Cart {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private readonly baseUrl = 'michaellee.pythonanywhere.com/api/cart';
  private readonly storageKey = 'cart_items';

  // Reactive Signals for global state
  cartItems = signal<CartItem[]>([]);
  cartCount = signal<number>(0);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const items = this.getCartItemsFromStorage();
      this.cartItems.set(items);
      this.updateCartCount(items);
    }
  }

  getCartItems(): CartItem[] {
    if (isPlatformBrowser(this.platformId) && this.cartItems().length === 0) {
      return this.getCartItemsFromStorage();
    }
    return this.cartItems();
  }

  saveCart(items: CartItem[]): void {
    // Filter out zero/negative quantity items before saving
    const validItems = items.filter(i => i.quantity > 0);

    this.cartItems.set(validItems);
    this.updateCartCount(validItems);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey, JSON.stringify(validItems));
    }
  }

  addToCart(item: CartItem): void {
    const items = [...this.getCartItems()];
    const existingIndex = items.findIndex(i => i.product_id === item.product_id);

    if (existingIndex > -1) {
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + item.quantity,
        // Update details if passed
        unit_cost: item.unit_cost ?? items[existingIndex].unit_cost,
        name: item.name ?? items[existingIndex].name,
        image_url: item.image_url ?? items[existingIndex].image_url
      };
    } else {
      items.push({ ...item });
    }

    this.saveCart(items);
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const items = this.getCartItems().map(i => {
      if (i.product_id === productId) {
        return { ...i, quantity };
      }
      return i;
    });

    this.saveCart(items);
  }

  removeFromCart(productId: number): void {
    const items = this.getCartItems().filter(i => i.product_id !== productId);
    this.saveCart(items);
  }

  clearCart(): void {
    this.cartItems.set([]);
    this.cartCount.set(0);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.storageKey);
    }
  }

  validateCartWithBackend(): Observable<CartValidationResponse> {
    const localItems = this.getCartItems();

    if (localItems.length === 0) {
      return of({
        success: true,
        items: [],
        subtotal: 0,
        item_count: 0
      });
    }

    const payload = {
      items: localItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))
    };

    return this.http.post<CartValidationResponse>(`${this.baseUrl}/validate`, payload).pipe(
      tap(res => {
        if (res.success && Array.isArray(res.items)) {
          const updatedLocal: CartItem[] = res.items
            .filter(i => i.allocated_quantity > 0) // Prevents zero-quantity ghost items
            .map(i => ({
              product_id: i.product_id,
              name: i.name,
              unit_cost: i.unit_cost,
              quantity: i.allocated_quantity,
              image_url: i.image_url,
              available_stock: i.available_stock,
              in_stock: i.in_stock
            }));

          this.saveCart(updatedLocal);
        }
      }),
      catchError((err) => {
        console.warn('Backend validation failed, falling back to local storage cache', err);
        return of({
          success: false,
          items: localItems.map(i => ({
            product_id: i.product_id,
            name: i.name || '',
            unit_cost: i.unit_cost || 0,
            requested_quantity: i.quantity,
            allocated_quantity: i.quantity,
            available_stock: i.available_stock || 99,
            in_stock: true,
            image_url: i.image_url || '',
            item_total: (i.unit_cost || 0) * i.quantity
          })),
          subtotal: localItems.reduce((acc, curr) => acc + ((curr.unit_cost || 0) * curr.quantity), 0),
          item_count: localItems.reduce((acc, curr) => acc + curr.quantity, 0)
        });
      })
    );
  }

  private updateCartCount(items: CartItem[]): void {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    this.cartCount.set(count);
  }

  private getCartItemsFromStorage(): CartItem[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse cart items from localStorage', e);
      return [];
    }
  }
}

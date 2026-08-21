import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ProductService } from '../../../core/services/product';
import { Product } from '../../../core/models/product';
import { Auth } from '../../../core/services/auth';
import { Cart } from '../../../core/services/cart'; // Import Cart Service

// NG-ZORRO Modules
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message'; // Notification toast

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    NzButtonModule,
    NzGridModule,
    NzSpinModule,
    NzInputModule,
    NzTagModule,
    NzBadgeModule,
    NzTooltipModule
  ],
  templateUrl: './product-list.html',
  styleUrls: ['./product-list.css']
})
export class ProductList implements OnInit {
  private productService = inject(ProductService);
  private authService = inject(Auth);
  private cartService = inject(Cart); // Inject Cart Service
  private message = inject(NzMessageService);
  private router = inject(Router);

  products$!: Observable<Product[]>;
  isAdmin$ = this.authService.isAdmin$;

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('ALL');

  categories = [
    { label: 'All Items', value: 'ALL' },
    { label: 'Vegetables', value: 'VEGETABLES' },
    { label: 'Fruits', value: 'FRUITS' },
    { label: 'Dairy & Eggs', value: 'DAIRY' },
    { label: 'Bakery', value: 'BAKERY' },
    { label: 'Pantry', value: 'PANTRY' },
    { label: 'Beverages', value: 'BEVERAGES' }
  ];

  ngOnInit(): void {
    this.products$ = this.productService.getProducts();
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  viewProductDetail(id: string | number | undefined): void {
    if (id !== undefined) {
      this.router.navigate(['/products', id]);
    }
  }

  onAddToCart(event: Event, product: Product): void {
    event.stopPropagation(); // Prevents navigating to detail view when clicking button

    if (!product.id) return;

    this.cartService.addToCart({
      product_id: Number(product.id),
      quantity: 1,
      name: product.name,
      unit_cost: product.cost,
      image_url: product.image_url
    });

    this.message.success(`Added ${product.name} to cart!`);
  }

  filterProducts(products: Product[]): Product[] {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();

    return products.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
      const matchesCat = cat === 'ALL' || (p.category && p.category.toUpperCase() === cat);
      return matchesSearch && matchesCat;
    });
  }
}

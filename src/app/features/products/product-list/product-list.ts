import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ProductService } from '../../../core/services/product';
import { Product } from '../../../core/models/product';
import { Auth } from '../../../core/services/auth';

// NG-ZORRO Modules
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

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
    NzIconModule,
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

  products$!: Observable<Product[]>;
  isAdmin$ = this.authService.isAdmin$;

  // Interactive Signals
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('ALL');

  categories = [
    { label: 'All Items', value: 'ALL', icon: 'appstore' },
    { label: 'Vegetables', value: 'VEGETABLES', icon: 'environment' },
    { label: 'Fruits', value: 'FRUITS', icon: 'heart' },
    { label: 'Dairy & Eggs', value: 'DAIRY', icon: 'coffee' },
    { label: 'Bakery', value: 'BAKERY', icon: 'shop' }
  ];

  ngOnInit(): void {
    this.products$ = this.productService.getProducts();
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  // Filter helper for templates
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

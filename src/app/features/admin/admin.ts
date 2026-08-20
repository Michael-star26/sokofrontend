import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

// Feature Components (Paths matched to your layout)
import { Users } from './users/users';
import { ProductAdd } from '../products/product-add/product-add';
import { ProductList } from '../products/product-list/product-list';

// NG-ZORRO Modules
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';

export type AdminTab = 'users' | 'add-product' | 'catalog';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    Users,
    ProductAdd,
    ProductList
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {
  private authService = inject(Auth);
  private router = inject(Router);

  // Active view state signal
  activeTab = signal<AdminTab>('users');
  isAdmin = this.authService.checkAdminState();

  selectTab(tab: AdminTab): void {
    this.activeTab.set(tab);
  }

  onLogout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    this.authService.isAuthenticated$.next(false);
    this.authService.isAdmin$.next(false);
    this.router.navigate(['/login']);
  }
}

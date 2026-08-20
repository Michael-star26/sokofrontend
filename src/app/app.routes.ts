import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
      }
    ]
  },
  {
    path: 'products',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/products/product-list/product-list').then(m => m.ProductList)
      },
      {
        path: 'add',
        canActivate: [authGuard, adminGuard], // Protected: Admin only
        loadComponent: () => import('./features/products/product-add/product-add').then(m => m.ProductAdd)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/products/product-detail/product-detail').then(m => m.ProductDetail)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/admin').then(m => m.Admin),
    children: [
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/users').then(m => m.Users)
      },
      { path: '', redirectTo: 'users', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'products' }
];

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, UserItem } from '../../../core/services/auth';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzPopconfirmModule
  ],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {
  public authService = inject(Auth); // PUBLIC so users.html can access authService.isSuperAdmin()
  private message = inject(NzMessageService);

  users = signal<UserItem[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.authService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.message.error('Failed to load users.');
        this.isLoading.set(false);
      }
    });
  }

  toggleRole(user: UserItem): void {
    this.authService.toggleAdminRole(user.id).subscribe({
      next: (res) => {
        this.message.success(res.message);
        this.users.update(current =>
          current.map(u => u.id === user.id ? {
            ...u,
            is_admin: res.is_admin,
            role: (res.role || (res.is_admin ? 'ADMIN' : 'USER')) as 'USER' | 'ADMIN' | 'SUPER_ADMIN'
          } as UserItem : u)
        );
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Failed to update user role.';
        this.message.error(errorMsg);
      }
    });
  }

  promoteToSuperAdmin(user: UserItem): void {
    this.authService.promoteSuperAdmin(user.id).subscribe({
      next: (res) => {
        this.message.success(res.message);
        this.users.update(current =>
          current.map(u => u.id === user.id ? {
            ...u,
            is_admin: true,
            role: 'SUPER_ADMIN' as const
          } as UserItem : u)
        );
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Failed to promote user to Super Admin.';
        this.message.error(errorMsg);
      }
    });
  }
}

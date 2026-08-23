import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface UserItem {
  id: number;
  username: string;
  email: string;
  phone: string;
  is_admin: boolean;
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private apiUrl = 'michaellee.pythonanywhere.com/api/auth';
  private tokenKey = 'auth_token';

  // Signal-based state
  tokenSignal = signal<string | null>(null);

  // Computed state derived directly from JWT claims
  isAuthenticated = computed(() => !!this.tokenSignal());

  role = computed<'USER' | 'ADMIN' | 'SUPER_ADMIN'>(() => {
    const token = this.tokenSignal();
    if (!token) return 'USER';
    try {
      const payload = this.decodeJwt(token);
      return payload?.role || (payload?.is_admin ? 'ADMIN' : 'USER');
    } catch {
      return 'USER';
    }
  });

  isAdmin = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;
    try {
      const payload = this.decodeJwt(token);
      return !!payload?.is_admin || payload?.role === 'ADMIN' || payload?.role === 'SUPER_ADMIN';
    } catch {
      return false;
    }
  });

  isSuperAdmin = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;
    try {
      const payload = this.decodeJwt(token);
      return !!payload?.is_super_admin || payload?.role === 'SUPER_ADMIN';
    } catch {
      return false;
    }
  });

  // Legacy RxJS Subjects
  public isAuthenticated$ = new BehaviorSubject<boolean>(false);
  public isAdmin$ = new BehaviorSubject<boolean>(false);
  public isSuperAdmin$ = new BehaviorSubject<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const storedToken = localStorage.getItem(this.tokenKey);
      this.tokenSignal.set(storedToken);
      this.syncLegacySubjects();
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  public checkAdminState(): boolean {
    return this.isAdmin();
  }

  public checkSuperAdminState(): boolean {
    return this.isSuperAdmin();
  }

  register(userData: { username: string; email: string; phone: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (isPlatformBrowser(this.platformId) && res.token) {
          localStorage.setItem(this.tokenKey, res.token);
          this.tokenSignal.set(res.token);
          this.syncLegacySubjects();
        }
      })
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
    }
    this.tokenSignal.set(null);
    this.syncLegacySubjects();
  }

  // Admin HTTP Methods
  getUsers(): Observable<UserItem[]> {
    return this.http.get<UserItem[]>(`${this.apiUrl}/users`);
  }

  toggleAdminRole(userId: number): Observable<{ message: string; is_admin: boolean; role?: string }> {
    return this.http.patch<{ message: string; is_admin: boolean; role?: string }>(
      `${this.apiUrl}/users/${userId}/toggle-admin`,
      {}
    );
  }

  promoteSuperAdmin(userId: number): Observable<{ message: string; is_admin: boolean; role: string }> {
    return this.http.patch<{ message: string; is_admin: boolean; role: string }>(
      `${this.apiUrl}/users/${userId}/promote-super-admin`,
      {}
    );
  }

  private decodeJwt(token: string): any {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    if (isPlatformBrowser(this.platformId)) {
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } else {
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(jsonPayload);
    }
  }

  private syncLegacySubjects(): void {
    this.isAuthenticated$.next(this.isAuthenticated());
    this.isAdmin$.next(this.isAdmin());
    this.isSuperAdmin$.next(this.isSuperAdmin());
  }
}

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from '../services/auth';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only execute redirection and client cleanup in the browser
      if (isPlatformBrowser(platformId)) {
        if (error.status === 401 || error.status === 403) {
          authService.logout();
          router.navigate(['/auth/login']);
        }
      }

      return throwError(() => error);
    })
  );
};

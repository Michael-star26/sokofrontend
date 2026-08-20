import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);

  // Check token existence AND decoded admin status
  const hasToken = !!authService.getToken();
  const isAdmin = authService.checkAdminState() || authService.isAdmin$.value;

  if (hasToken && isAdmin) {
    return true;
  }

  // Redirect non-admin users to catalog
  return router.createUrlTree(['/products']);
};

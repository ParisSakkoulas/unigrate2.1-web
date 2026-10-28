import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Logged-in users only; others go to the login page and come back afterwards */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (
    auth.isLoggedIn() ||
    router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })
  );
};

/** Logged-in AND one of the given roles (the backend enforces the same rule) */
export const roleGuard =
  (...roles: Role[]): CanActivateFn =>
  (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    // role() is VISITOR for a user who is looking at another department
    return roles.includes(auth.role() as Role) || router.createUrlTree(['/']);
  };

/** Login / register pages are pointless for logged-in users */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.isLoggedIn() || inject(Router).createUrlTree(['/']);
};

import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/roles.model';

/**
 * Guard funcional que verifica autenticación y rol permitido.
 * Uso en rutas: canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN])]
 */
export const roleGuard = (allowedRoles: Role[]): CanActivateFn => {
  return (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    const userRole = authService.getRole();
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // Redirigir a página de acceso denegado
    router.navigate(['/unauthorized']);
    return false;
  };
};

/**
 * Guard básico de autenticación (redirige a login si no hay sesión)
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

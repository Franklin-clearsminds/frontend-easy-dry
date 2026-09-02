import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/roles.model';

/**
 * Guard que verifica acceso a módulos / roles.
 * SuperAdmin SIEMPRE tiene acceso total e incondicional.
 */
export const roleGuard = (allowedRoles?: (Role | string)[], moduloCodigo?: string): CanActivateFn => {
  return (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      return router.createUrlTree(['/login']);
    }

    // SuperAdmin tiene acceso total a cualquier ruta
    if (authService.isSuperAdmin()) {
      return true;
    }

    // Si se especificó un módulo, validar por módulo
    if (moduloCodigo && authService.hasModuleAccess(moduloCodigo)) {
      return true;
    }

    // O inferir el módulo de la ruta actual si coincide
    const currentPath = route.routeConfig?.path || '';
    if (currentPath && authService.hasModuleAccess(currentPath)) {
      return true;
    }

    // O validar roles permitidos si se proveyeron
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = authService.getRole();
      if (userRole && allowedRoles.includes(userRole)) {
        return true;
      }
    }

    // Redirigir a página de acceso denegado
    return router.createUrlTree(['/unauthorized']);
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

  return router.createUrlTree(['/login']);
};

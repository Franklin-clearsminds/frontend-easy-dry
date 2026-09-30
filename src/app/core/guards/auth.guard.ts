import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que verifica acceso a módulos / roles.
 * SuperAdmin SIEMPRE tiene acceso total e incondicional.
 */
/**
 * Guard de módulo: deja pasar si el rol tiene el módulo en la base de datos (el mismo que arma el menú). Un usuario sin ningún
 * permiso va a la pantalla de «sin acceso». No hay listas de roles escritas a mano.
 */
export const moduloGuard = (moduloCodigo: string): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) return router.createUrlTree(['/login']);
    if (authService.currentUserValue?.debeCambiarPassword) return router.createUrlTree(['/cambiar-password']);
    if (authService.sinAcceso()) return router.createUrlTree(['/sin-acceso']);
    if (authService.isSuperAdmin() || authService.hasModuleAccess(moduloCodigo)) return true;
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
    // Con una contraseña temporal solo se puede cambiar la contraseña.
    if (authService.currentUserValue?.debeCambiarPassword && !state.url.startsWith('/cambiar-password')) {
      return router.createUrlTree(['/cambiar-password']);
    }
    // Sin permisos (p. ej. un lavador) no se usa la plataforma: solo ve la pantalla de «sin acceso».
    if (authService.sinAcceso() && !state.url.startsWith('/sin-acceso')) {
      return router.createUrlTree(['/sin-acceso']);
    }
    return true;
  }

  return router.createUrlTree(['/login']);
};

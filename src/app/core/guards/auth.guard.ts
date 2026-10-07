import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
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
    if (authService.sinAcceso()) return router.createUrlTree(['/sin-acceso']);
    return authService.validarAccesoModulo(moduloCodigo).pipe(
      map((permitido) => permitido ? true : router.createUrlTree(['/unauthorized'])),
    );
  };
};

/**
 * Guard básico de autenticación (redirige a login si no hay sesión)
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // Sin permisos (p. ej. un lavador) no se usa la plataforma: solo ve la pantalla de «sin acceso».
    if (authService.sinAcceso() && !state.url.startsWith('/sin-acceso')) {
      return authService.verificarPermisosActualizados(true).pipe(
        map((actualizado) =>
          actualizado && !authService.sinAcceso()
            ? true
            : router.createUrlTree(['/sin-acceso']),
        ),
      );
    }
    return true;
  }

  return router.createUrlTree(['/login']);
};

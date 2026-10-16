import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * EasyDry® Web — Interceptor JWT
 * Adjunta Bearer, renueva el token antes de vencer y reintenta una vez en 401.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isAuthEndpoint = /\/auth\/(login|refresh|logout)(?:\?|$)/.test(req.url);
  const skipRefresh =
    isAuthEndpoint ||
    req.headers.has('X-Skip-Auth-Refresh') ||
    req.headers.has('x-skip-auth-refresh');

  const attachAuth = (token: string | null) => {
    const requestId =
      req.headers.get('X-Request-Id') ||
      `web_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    let headers = req.headers.set('X-Request-Id', requestId);
    if (token && !isAuthEndpoint) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return req.clone({ headers });
  };

  const sendWithCurrentToken = () =>
    next(attachAuth(authService.getAccessToken())).pipe(
      catchError((error: HttpErrorResponse) => {
        if (skipRefresh || error.status !== 401 || !authService.hasSession()) {
          return throwError(() => error);
        }

        return authService.refreshSession().pipe(
          switchMap(ok => {
            if (!ok) {
              // Solo se cierra la sesión si el servidor la rechazó. Un corte de red o un 5xx no deben sacar al usuario.
              if (authService.refreshRechazado()) authService.logout('expirada');
              return throwError(() => error);
            }
            return next(attachAuth(authService.getAccessToken()));
          })
        );
      })
    );

  if (
    !skipRefresh &&
    authService.isLoggedIn() &&
    authService.isAccessTokenExpiringSoon()
  ) {
    return authService.refreshSession().pipe(
      switchMap(ok => {
        if (!ok && authService.refreshRechazado()) {
          authService.logout('expirada');
          return throwError(
            () => new HttpErrorResponse({ status: 401, statusText: 'Sesión expirada' })
          );
        }
        return sendWithCurrentToken();
      })
    );
  }

  return sendWithCurrentToken();
};

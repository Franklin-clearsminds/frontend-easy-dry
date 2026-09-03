import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * EasyDry® Web — Interceptor de Autenticación JWT y Trazabilidad
 * Alineado con Arquitectura Enterprise v2.0
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const currentUser = authService.currentUserValue;

  // Generar o propagar X-Request-Id para observabilidad
  const requestId = req.headers.get('X-Request-Id') || `web_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  let headers = req.headers.set('X-Request-Id', requestId);

  // Agregar Bearer token si el usuario está autenticado y la petición va a la API
  if (currentUser?.token) {
    headers = headers.set('Authorization', `Bearer ${currentUser.token}`);
  }

  const clonedRequest = req.clone({ headers });
  return next(clonedRequest);
};

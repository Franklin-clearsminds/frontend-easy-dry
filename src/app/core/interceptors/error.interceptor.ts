import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';

let lastToastAt = 0;
let lastToastKey = '';

/**
 * EasyDry® Web — Interceptor Unificado de Errores HTTP
 * Alineado con Arquitectura Enterprise v2.0
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const router = inject(Router);

  const isSilent = req.headers.has('X-Silent-Fallback') || req.headers.has('x-silent');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let userMessage = 'Ha ocurrido un inconveniente al procesar la solicitud.';

      if (error.status === 0) {
        userMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté encendido.';
      } else if (error.status === 401) {
        // El jwtInterceptor ya intentó refresh; solo informar si no es silencioso.
        userMessage = 'Sesión expirada o no autorizada. Inicie sesión nuevamente.';
      } else if (error.status === 403 && /contraseña temporal/i.test(String(error.error?.message ?? ''))) {
        // El servidor bloquea todo hasta cambiar la contraseña temporal: se lleva al usuario a cambiarla.
        userMessage = String(error.error.message);
        if (!router.url.startsWith('/cambiar-password')) void router.navigate(['/cambiar-password']);
      } else if (error.status === 403 && !error.error?.message) {
        userMessage = 'No tiene permisos suficientes para ejecutar esta acción.';
      } else if (error.error?.message) {
        // Los mensajes del servidor (403 incluidos) son claros y en español: se muestran tal cual.
        userMessage = Array.isArray(error.error.message)
          ? error.error.message.join(', ')
          : String(error.error.message);
      } else if (error.status === 404) {
        userMessage = 'El recurso solicitado no fue encontrado.';
      } else if (error.status === 409) {
        userMessage = 'Conflicto de concurrencia: el registro fue modificado recientemente.';
      } else if (error.status >= 500) {
        userMessage = 'Error interno del servidor. Por favor reintente en unos momentos.';
      }

      if (!isSilent) {
        const key = `${error.status}:${userMessage}`;
        const now = Date.now();
        if (key !== lastToastKey || now - lastToastAt > 2500) {
          lastToastKey = key;
          lastToastAt = now;
          toastService.error('Error de Comunicación', userMessage);
        }
      }
      return throwError(() => error);
    })
  );
};

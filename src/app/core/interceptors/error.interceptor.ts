import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';

/**
 * EasyDry® Web — Interceptor Unificado de Errores HTTP
 * Alineado con Arquitectura Enterprise v2.0
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  const isSilent = req.headers.has('X-Silent-Fallback') || req.headers.has('x-silent');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let userMessage = 'Ha ocurrido un inconveniente al procesar la solicitud.';

      if (error.status === 401) {
        // El jwtInterceptor ya intentó refresh; solo informar si no es silencioso.
        userMessage = 'Sesión expirada o no autorizada. Inicie sesión nuevamente.';
      } else if (error.status === 403) {
        userMessage = 'No tiene permisos suficientes para ejecutar esta acción.';
      } else if (error.error?.message) {
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
        toastService.error('Error de Comunicación', userMessage);
      }
      return throwError(() => error);
    })
  );
};

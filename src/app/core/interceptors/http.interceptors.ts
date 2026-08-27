import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem('easydry_access_token');
  const authorized = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  return next(authorized);
};

export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  const requestId = crypto.randomUUID();
  return next(req.clone({ setHeaders: { 'X-Request-Id': requestId } }));
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { APP_ENVIRONMENT } from '../../core/config/env.token';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = APP_ENVIRONMENT.apiBaseUrl;

  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        httpParams = httpParams.set(key, value);
      });
    }
    return firstValueFrom(this.http.get<T>(`${this.baseUrl}${path}`, { params: httpParams }));
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.baseUrl}${path}`, body));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(`${this.baseUrl}${path}`, body));
  }
}

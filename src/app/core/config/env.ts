import { environment } from '../../../environments/environment';
import { AppEnvironment } from '../../../environments/environment.model';

export type { AppEnvironment };
export { environment };

export function apiUrl(path: string): string {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/** Modo demo deshabilitado: la app siempre usa la API. */
export function isMockMode(): boolean {
  return false;
}

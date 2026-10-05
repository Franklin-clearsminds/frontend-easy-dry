import { environment } from '../../../environments/environment';
import { AppEnvironment } from '../../../environments/environment.model';

export type { AppEnvironment };
export { environment };

export function apiUrl(path: string): string {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Origen para el WebSocket de notificaciones: el mismo host que `apiBaseUrl`, sin el prefijo de la
 * API (`/api/v1`) — los namespaces de un gateway de Socket.IO no pasan por ese prefijo HTTP.
 */
export function wsUrl(): string {
  return environment.apiBaseUrl.replace(/\/api\/v\d+\/?$/i, '').replace(/\/$/, '');
}

/** Solo acepta foto real (S3/local). Ignora Unsplash y URLs de demo. */
export function isRealProfilePhoto(value?: string | null): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/unsplash|mixkit|placeholder|via\.placeholder|gravatar|pravatar|ui-avatars|dicebear|robohash|loremflickr|picsum/i.test(v)) {
    return false;
  }
  if (v.startsWith('data:image/') || v.startsWith('blob:')) return true;
  if (v.includes('amazonaws.com/') && v.includes('/usuarios/')) return true;
  if (v.includes('/storage/file?key=')) {
    try {
      return decodeURIComponent(v).includes('usuarios/');
    } catch {
      return v.includes('usuarios/');
    }
  }
  return v.startsWith('usuarios/') && (v.includes('/perfil/') || v.includes('avatar'));
}

import { environment } from '../../../environments/environment';
import { AppEnvironment } from '../../../environments/environment.model';

export type { AppEnvironment };
export { environment };

/**
 * En desarrollo la API se configura con la IP de la red local (para probar desde el celular). Si la app se abre por otro nombre
 * (p. ej. `localhost`), el navegador trata la API como otro sitio y NO envía la cookie del refresh token (SameSite=Lax): al
 * recargar la página la sesión no se puede restaurar y se cierra, y la renovación automática del token falla en silencio.
 * Para evitarlo, si la API está en `localhost` o en una IP privada, se usa el mismo host con el que se abrió la app.
 */
function baseDeApi(): string {
  const configurada = environment.apiBaseUrl.replace(/\/$/, '');
  if (environment.production || typeof window === 'undefined') return configurada;
  try {
    const url = new URL(configurada);
    const esLocal = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(url.hostname);
    if (esLocal && window.location.hostname && url.hostname !== window.location.hostname) {
      url.hostname = window.location.hostname;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    // URL no válida: se usa tal cual
  }
  return configurada;
}

const BASE_API = baseDeApi();

export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_API}${suffix}`;
}

/**
 * Origen para el WebSocket de notificaciones: el mismo host que `apiBaseUrl`, sin el prefijo de la
 * API (`/api/v1`) — los namespaces de un gateway de Socket.IO no pasan por ese prefijo HTTP.
 */
export function wsUrl(): string {
  return BASE_API.replace(/\/api\/v\d+\/?$/i, '').replace(/\/$/, '');
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

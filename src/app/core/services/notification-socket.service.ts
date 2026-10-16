import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { wsUrl } from '../config/env';

export interface NotificationPayload {
  tipo: string;
  titulo: string;
  mensaje: string;
  data?: Record<string, unknown>;
  entidadTipo?: string;
  entidadId?: string;
  leida: boolean;
  createdAt: string;
}

/**
 * Canal en tiempo real de notificaciones (solo web; el push a la app móvil sigue por Expo, aparte).
 * Un socket por sesión, autenticado con el mismo JWT que el resto de la API — conectar/desconectar
 * vive en `AuthService` (único lugar que ya maneja login/logout/arranque de sesión).
 */
@Injectable({ providedIn: 'root' })
export class NotificationSocketService {
  private socket: Socket | null = null;
  private readonly nuevaNotificacion$ = new Subject<NotificationPayload>();

  /** Emite cada vez que llega una notificación nueva mientras el socket está conectado. */
  readonly onNuevaNotificacion = this.nuevaNotificacion$.asObservable();

  /**
   * `obtenerToken` se vuelve a llamar en cada (re)conexión: el access token dura 15 minutos y se renueva, así que un token
   * fijo quedaría vencido y el socket no podría volver a conectarse tras una caída de red.
   */
  connect(obtenerToken: () => string | null): void {
    if (this.socket?.connected) return;
    this.disconnect();
    this.socket = io(`${wsUrl()}/notifications`, {
      auth: (entregar) => entregar({ token: obtenerToken() }),
      reconnection: true,
      transports: ['websocket', 'polling'],
    });
    this.socket.on('notification:new', (payload: NotificationPayload) => {
      this.nuevaNotificacion$.next(payload);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

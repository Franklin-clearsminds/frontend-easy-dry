import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Notificacion, NotificacionCategoria, NotificacionTipo } from '../models/notificacion.model';
import { apiUrl } from '../config/env';
import { NotificationSocketService, NotificationPayload } from './notification-socket.service';

const TIPO_A_NOTIFICACION_TIPO: Record<string, NotificacionTipo> = {
  INCIDENTE_NUEVO: 'alerta',
  MANTENIMIENTO_VENCIDO: 'alerta',
  STOCK_CRITICO: 'alerta',
  LIMPIEZA_ATRASADA: 'alerta',
  DESPACHO_PENDIENTE: 'alerta',
  MAQUINA_DADA_DE_BAJA: 'alerta',
  INCIDENCIA_RESUELTA: 'exito',
  APROBACION_PENDIENTE: 'sistema',
  RETO_CERRADO: 'sistema',
  USUARIO_ACTUALIZADO: 'sistema',
  INCIDENCIA_ASIGNADA: 'info',
  MANTENIMIENTO_ASIGNADO: 'info',
  LIMPIEZA_RECORDATORIO: 'info',
  SERVICIO_DECIDIDO: 'info',
  SERVICIO_ESPECIAL_ASIGNADO: 'info',
  SERVICIO_ESPECIAL_CERRADO: 'info',
  DESPACHO_CONFIRMADO: 'info',
};

/** Módulo funcional de cada tipo de notificación del backend, para agrupar/filtrar por área. */
const CATEGORIA_POR_TIPO: Record<string, NotificacionCategoria> = {
  STOCK_CRITICO: 'inventario',
  DESPACHO_PENDIENTE: 'inventario',
  INCIDENTE_NUEVO: 'mantenimiento',
  INCIDENCIA_ASIGNADA: 'mantenimiento',
  INCIDENCIA_RESUELTA: 'mantenimiento',
  MANTENIMIENTO_ASIGNADO: 'mantenimiento',
  MANTENIMIENTO_VENCIDO: 'mantenimiento',
  APROBACION_PENDIENTE: 'aprobaciones',
  LIMPIEZA_RECORDATORIO: 'limpieza',
  LIMPIEZA_ATRASADA: 'limpieza',
};

const ENLACE_POR_ENTIDAD: Record<string, { enlace: string; enlaceLabel: string }> = {
  MAQUINARIA: { enlace: '/maquinaria', enlaceLabel: 'Ir al Taller' },
  INSUMO: { enlace: '/inventario', enlaceLabel: 'Ver Inventario' },
  SOLICITUD_APROBACION: { enlace: '/aprobaciones', enlaceLabel: 'Revisar Solicitud' },
  MOVIMIENTO_INVENTARIO: { enlace: '/envios', enlaceLabel: 'Confirmar Recepción' },
  SERVICIO_LAVADO: { enlace: '/servicios', enlaceLabel: 'Ver Servicio' },
  SERVICIO_ESPECIAL: { enlace: '/servicios', enlaceLabel: 'Ver Servicio Especial' },
  RETO: { enlace: '/productividad', enlaceLabel: 'Ver Retos' },
  USUARIO: { enlace: '/usuarios', enlaceLabel: 'Ver Usuario' },
  AGENCIA: { enlace: '/sucursales', enlaceLabel: 'Ver Agencia' },
};

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  private http = inject(HttpClient);
  private socket = inject(NotificationSocketService);
  private notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();

  constructor() {
    // Mientras el socket esté conectado (AuthService lo arma en login/arranque de sesión), cada
    // notificación nueva se antepone a la lista en memoria, sin volver a pedir todo el historial.
    this.socket.onNuevaNotificacion.subscribe((payload) => {
      const actuales = this.notificacionesSubject.value;
      this.notificacionesSubject.next([this.mapearPayload(payload), ...actuales]);
    });
  }

  private mapear(n: any): Notificacion {
    const fechaObj = n.createdAt ? new Date(n.createdAt) : new Date();
    const enlaceInfo = n.entidadTipo ? ENLACE_POR_ENTIDAD[n.entidadTipo] : undefined;
    const tipoBackend = typeof n.tipo === 'string' ? n.tipo : undefined;
    return {
      id: n.id,
      titulo: n.titulo,
      mensaje: n.mensaje,
      tipo: TIPO_A_NOTIFICACION_TIPO[n.tipo] || 'info',
      tipoBackend,
      categoria: (tipoBackend && CATEGORIA_POR_TIPO[tipoBackend]) || 'general',
      fecha: fechaObj.toISOString().split('T')[0],
      hora: fechaObj.toTimeString().substring(0, 5),
      timestamp: fechaObj.getTime(),
      leida: !!n.leida,
      enlace: enlaceInfo?.enlace,
      enlaceLabel: enlaceInfo?.enlaceLabel,
    };
  }

  /** La notificación recién llegada por WebSocket todavía no tiene `id` real de BD: se arma una temporal. */
  private mapearPayload(n: NotificationPayload): Notificacion {
    return this.mapear({ ...n, id: `live-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  }

  /** Historial real del usuario (hasta 100 más recientes), desde la tabla de notificaciones. */
  getNotificaciones(): Observable<Notificacion[]> {
    return this.http.post<any>(apiUrl('/notifications/list'), { pageSize: 100 }).pipe(
      map((res) => {
        const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
        return items.map((n: any) => this.mapear(n));
      }),
      tap((items) => this.notificacionesSubject.next(items)),
      catchError(() => of(this.notificacionesSubject.value)),
    );
  }

  /** Cuántas notificaciones sin leer tiene el usuario (para el badge de la campanita). */
  getResumen(): Observable<{ pendientes: number }> {
    return this.http.post<any>(apiUrl('/notifications/resumen'), {}).pipe(
      map((res) => ({ pendientes: Number(res?.pendientes || 0) })),
      catchError(() => of({ pendientes: 0 })),
    );
  }

  recargar(): void {
    this.getNotificaciones().subscribe();
  }

  async marcarComoLeida(id: string | number): Promise<void> {
    const current = this.notificacionesSubject.value;
    const idx = current.findIndex((n) => String(n.id) === String(id));
    if (idx !== -1) {
      const actualizado = [...current];
      actualizado[idx] = { ...actualizado[idx], leida: true };
      this.notificacionesSubject.next(actualizado);
    }
    // Las que llegaron por WS ("live-...") todavía no tienen id real de BD: nada que marcar en el servidor.
    if (String(id).startsWith('live-')) return;
    try {
      await firstValueFrom(this.http.post(apiUrl('/notifications/marcar-leida'), { notificacionId: id }));
    } catch {
      // Sin red: queda marcada localmente, se reconcilia en la próxima carga.
    }
  }

  async marcarTodasComoLeidas(): Promise<void> {
    this.notificacionesSubject.next(this.notificacionesSubject.value.map((n) => ({ ...n, leida: true })));
    try {
      await firstValueFrom(this.http.post(apiUrl('/notifications/marcar-todas-leidas'), {}));
    } catch {
      // Sin red: queda marcado localmente, se reconcilia en la próxima carga.
    }
  }
}

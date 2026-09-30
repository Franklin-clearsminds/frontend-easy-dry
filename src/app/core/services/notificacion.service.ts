import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Notificacion, NotificacionTipo } from '../models/notificacion.model';
import { apiUrl } from '../config/env';
import { AuthService } from './auth.service';
import { ToastService } from '../../shared/services/toast.service';

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toastService = inject(ToastService);
  private notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();

  private avisarErrorCarga(mensaje: string, err: any): void {
    console.error(mensaje, err);
    this.toastService.error('No se pudo cargar', `${mensaje}. Reintentar.`);
  }

  private readonly STORAGE_KEY = 'easydry_notificaciones_leidas_ids';

  private getLeidasIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  private saveLeidasIds(ids: Set<string>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(ids)));
    } catch {}
  }

  /**
   * Consulta las fuentes de verdad en base de datos PostgreSQL:
   * 1. Alertas de stock bajo (/inventario/alertas/list)
   * 2. Incidentes técnicos de maquinaria (/maquinaria/incidentes/list)
   * 3. Solicitudes de aprobación pendientes (/aprobaciones/list)
   */
  getNotificaciones(): Observable<Notificacion[]> {
    const leidas = this.getLeidasIds();

    const alertasStock$ = !this.auth.puede('alertas.ver') ? of([] as any[]) : this.http.post<any[]>(apiUrl('/inventario/alertas/list'), {}).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar las alertas de stock', err);
        return of([]);
      })
    );

    const incidentes$ = !this.auth.puede('incidentes.ver') ? of([] as any[]) : this.http.post<any>(apiUrl('/maquinaria/incidentes/list'), {}).pipe(
      map(res => Array.isArray(res) ? res : (res?.data || [])),
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los incidentes', err);
        return of([]);
      })
    );

    const aprobaciones$ = !this.auth.puede('solicitudes.ver') ? of([] as any[]) : this.http.post<any[]>(apiUrl('/aprobaciones/list'), {}).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar las aprobaciones', err);
        return of([]);
      })
    );

    const despachos$ = !this.auth.puede('despachos.ver') ? of([] as any[]) : this.http.post<any[]>(apiUrl('/inventario/despachos/pendientes'), {}).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los despachos pendientes', err);
        return of([] as any[]);
      })
    );

    return forkJoin([alertasStock$, incidentes$, aprobaciones$, despachos$]).pipe(
      map(([alertasStock, incidentes, aprobaciones, despachos]) => {
        const notifs: Notificacion[] = [];

        // 1. Alertas de Stock
        (alertasStock || []).forEach((a: any) => {
          const idStr = `stock-${a.id}`;
          const isLeida = leidas.has(idStr) || a.estado === 'RESUELTO' || a.estado === 'DESPACHADO';
          const fechaObj = a.createdAt ? new Date(a.createdAt) : new Date();
          notifs.push({
            id: idStr,
            titulo: `Stock Crítico: ${a.insumo?.nombre || 'Insumo'}`,
            mensaje: `Nivel ${a.nivel || 'BAJO'}. Stock actual: ${a.stockActual} (Mín: ${a.stockMinimo}). Sucursal: ${a.agencia?.nombre || 'Bodega Central'}`,
            tipo: 'alerta',
            fecha: fechaObj.toISOString().split('T')[0],
            hora: fechaObj.toTimeString().substring(0, 5),
            leida: isLeida,
            sucursal: a.agencia?.nombre || 'Bodega Central',
            enlace: '/inventario',
            enlaceLabel: 'Ver Inventario'
          });
        });

        // 2. Incidentes Técnicos
        (incidentes || []).forEach((inc: any) => {
          const idStr = `inc-${inc.id}`;
          const isLeida = leidas.has(idStr) || inc.estado === 'RESUELTO' || inc.estado === 'CANCELADO';
          const fechaObj = inc.createdAt ? new Date(inc.createdAt) : new Date();
          notifs.push({
            id: idStr,
            titulo: `Incidente: ${inc.maquinaria?.nombre || inc.maquinaria?.codigo || 'Equipo'}`,
            mensaje: `${inc.titulo || 'Fallo detectado'}: ${inc.descripcion || 'Requiere revisión técnica'}. Estado: ${inc.estado}`,
            tipo: inc.gravedad === 'CRITICA' || inc.gravedad === 'ALTA' ? 'alerta' : 'info',
            fecha: fechaObj.toISOString().split('T')[0],
            hora: fechaObj.toTimeString().substring(0, 5),
            leida: isLeida,
            sucursal: inc.maquinaria?.agencia?.nombre || 'Taller',
            enlace: '/maquinaria',
            enlaceLabel: 'Ir al Taller'
          });
        });

        // 3. Aprobaciones
        (aprobaciones || []).filter((ap: any) => ap.estado === 'PENDIENTE').forEach((ap: any) => {
          const idStr = `aprob-${ap.id}`;
          const isLeida = leidas.has(idStr);
          const fechaObj = ap.createdAt ? new Date(ap.createdAt) : new Date();
          notifs.push({
            id: idStr,
            titulo: `Aprobación Pendiente: OT ${ap.codigoOT || ap.vehiculoServicioId || ''}`,
            mensaje: `Servicio ${ap.tipoServicio || 'Especial'} en ${ap.agencia?.nombre || 'Sucursal'} requiere validación para cierre diario.`,
            tipo: 'sistema',
            fecha: fechaObj.toISOString().split('T')[0],
            hora: fechaObj.toTimeString().substring(0, 5),
            leida: isLeida,
            sucursal: ap.agencia?.nombre || 'Sucursal',
            enlace: '/aprobaciones',
            enlaceLabel: 'Revisar Solicitud'
          });
        });

        // 4. Despachos en Tránsito (Pendientes de Confirmación)
        (despachos || []).forEach((d: any) => {
          const idStr = `desp-${d.id}`;
          const isLeida = leidas.has(idStr) || d.estadoDespacho === 'RECIBIDO' || d.estadoDespacho === 'RECHAZADO';
          const fechaObj = d.fechaDespacho ? new Date(d.fechaDespacho) : (d.createdAt ? new Date(d.createdAt) : new Date());
          const guia = d.numeroGuia || d.codigoDespacho || `ENV-${String(d.id).substring(0, 6)}`;
          const destino = d.destinoUbicacion || 'Destino';
          notifs.push({
            id: idStr,
            titulo: `Despacho en Tránsito: ${guia}`,
            mensaje: `Se han despachado suministros hacia ${destino}. Pendiente de confirmación física de recepción.`,
            tipo: 'alerta',
            fecha: fechaObj.toISOString().split('T')[0],
            hora: fechaObj.toTimeString().substring(0, 5),
            leida: isLeida,
            sucursal: destino,
            enlace: '/envios',
            enlaceLabel: 'Confirmar Recepción'
          });
        });

        return notifs;
      }),
      tap(items => this.notificacionesSubject.next(items))
    );
  }

  recargar(): void {
    this.getNotificaciones().subscribe();
  }

  marcarComoLeida(id: string | number): void {
    const leidas = this.getLeidasIds();
    leidas.add(String(id));
    this.saveLeidasIds(leidas);

    const current = this.notificacionesSubject.value;
    const idx = current.findIndex(n => String(n.id) === String(id));
    if (idx !== -1) {
      current[idx] = { ...current[idx], leida: true };
      this.notificacionesSubject.next([...current]);
    }
  }

  marcarTodasComoLeidas(): void {
    const leidas = this.getLeidasIds();
    const current = this.notificacionesSubject.value;
    current.forEach(n => leidas.add(String(n.id)));
    this.saveLeidasIds(leidas);

    const updated = current.map(n => ({ ...n, leida: true }));
    this.notificacionesSubject.next(updated);
  }
}

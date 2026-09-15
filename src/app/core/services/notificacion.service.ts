import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Notificacion, NotificacionTipo } from '../models/notificacion.model';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  private http = inject(HttpClient);
  private notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();

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

    const alertasStock$ = this.http.post<any[]>(apiUrl('/inventario/alertas/list'), {}).pipe(
      catchError(() => of([]))
    );

    const incidentes$ = this.http.post<any>(apiUrl('/maquinaria/incidentes/list'), {}).pipe(
      map(res => Array.isArray(res) ? res : (res?.data || [])),
      catchError(() => of([]))
    );

    const aprobaciones$ = this.http.post<any[]>(apiUrl('/aprobaciones/list'), {}).pipe(
      catchError(() => of([]))
    );

    return forkJoin([alertasStock$, incidentes$, aprobaciones$]).pipe(
      map(([alertasStock, incidentes, aprobaciones]) => {
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

        return notifs;
      }),
      tap(items => this.notificacionesSubject.next(items))
    );
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

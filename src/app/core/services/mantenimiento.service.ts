import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Mantenimiento } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class MantenimientoService {
  private http = inject(HttpClient);
  private mantenimientosSubject = new BehaviorSubject<Mantenimiento[]>([]);
  public mantenimientos$ = this.mantenimientosSubject.asObservable();

  private mapBackendMantenimiento(m: any): Mantenimiento {
    const maquinaNombre = m.maquinaria?.nombre || m.maquinaria?.codigo || m.maquina || 'Equipo';
    const tecnicoNombre = m.tecnico ? `${m.tecnico.name || ''} ${m.tecnico.lastname || ''}`.trim() : (m.tecnicoNombre || 'Técnico de Turno');
    const fechaStr = m.fechaMantenimiento
      ? new Date(m.fechaMantenimiento).toISOString().split('T')[0]
      : (m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

    return {
      id: m.id,
      maquina: maquinaNombre,
      tipo: m.tipo === 'CORRECTIVO' ? 'Correctivo' : 'Preventivo',
      fecha: fechaStr,
      tecnico: tecnicoNombre,
      estado: m.estado === 'FINALIZADO' ? 'Completado' : (m.estado === 'EN_PROCESO' ? 'En Proceso' : 'Programado'),
      descripcion: m.observaciones || m.descripcion || 'Mantenimiento preventivo de rutina.',
      agencia: m.maquinaria?.agencia?.nombre || 'Taller Central',
      tecnicoAsignadoId: m.tecnicoId || m.tecnicoAsignadoId,
      tecnicoAsignadoNombre: tecnicoNombre,
      observacionCierre: m.observaciones,
      repuestosUtilizados: m.repuestosUsados,
      fotos: m.fotos || [],
      videos: m.videos || []
    };
  }

  getMantenimientos(dto?: { maquinariaId?: string; tecnicoId?: string; tipo?: string }): Observable<Mantenimiento[]> {
    const payload = dto || {};
    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/list'), payload).pipe(
      map(res => {
        const rawItems = Array.isArray(res) ? res : (res?.data || []);
        return rawItems.map((item: any) => this.mapBackendMantenimiento(item));
      }),
      tap(items => this.mantenimientosSubject.next(items)),
      catchError(() => of(this.mantenimientosSubject.value))
    );
  }

  registrarMantenimiento(mant: Omit<Mantenimiento, 'id'>): Observable<Mantenimiento> {
    const tipo = mant.tipo === 'Correctivo' ? 'CORRECTIVO' : 'PREVENTIVO';
    const payload = {
      maquinariaId: String(mant.maquina || ''),
      tipo,
      observaciones: mant.descripcion || 'Mantenimiento registrado',
      repuestosUsados: (mant as any).repuestosUtilizados || undefined,
      costoTotal: (mant as any).costoTotal ? Number((mant as any).costoTotal) : undefined
    };

    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/registrar'), payload).pipe(
      map(res => this.mapBackendMantenimiento(res?.data || res)),
      tap(nuevo => {
        const current = this.mantenimientosSubject.value;
        this.mantenimientosSubject.next([nuevo, ...current]);
      }),
      catchError(err => {
        console.error('Error al registrar mantenimiento:', err);
        // Fallback optimista si no se pudo persistir en backend
        const fallback: Mantenimiento = {
          ...mant,
          id: `MANT-${Date.now().toString().slice(-4)}`
        };
        const current = this.mantenimientosSubject.value;
        this.mantenimientosSubject.next([fallback, ...current]);
        return of(fallback);
      })
    );
  }

  asignarMantenimiento(
    id: string | number,
    tecnicoId: string | number,
    tecnicoNombre: string,
    gestorId: string | number,
    gestorNombre: string
  ): Observable<Mantenimiento | null> {
    const current = this.mantenimientosSubject.value;
    const idx = current.findIndex(m => String(m.id) === String(id));
    if (idx === -1) return of(null);

    const actualizado: Mantenimiento = {
      ...current[idx],
      tecnicoAsignadoId: tecnicoId,
      tecnicoAsignadoNombre: tecnicoNombre,
      tecnico: tecnicoNombre,
      gestorAsignadorId: gestorId,
      gestorAsignadorNombre: gestorNombre,
      fechaAsignacion: new Date().toLocaleString(),
      estado: current[idx].estado === 'Programado' ? 'En Proceso' : current[idx].estado,
    };
    const next = [...current];
    next[idx] = actualizado;
    this.mantenimientosSubject.next(next);
    return of(actualizado);
  }

  actualizarMantenimiento(id: string | number, patch: Partial<Mantenimiento>): Observable<Mantenimiento | null> {
    const current = this.mantenimientosSubject.value;
    const idx = current.findIndex(m => String(m.id) === String(id));
    if (idx === -1) return of(null);

    const actualizado: Mantenimiento = { ...current[idx], ...patch };
    const next = [...current];
    next[idx] = actualizado;
    this.mantenimientosSubject.next(next);
    return of(actualizado);
  }

  cancelarAsignacion(id: string | number): Observable<Mantenimiento | null> {
    const current = this.mantenimientosSubject.value;
    const idx = current.findIndex(m => String(m.id) === String(id));
    if (idx === -1) return of(null);

    const item = current[idx];
    if (!item.tecnicoAsignadoId || item.estado === 'Completado') return of(null);

    const actualizado: Mantenimiento = {
      ...item,
      tecnicoAsignadoId: undefined,
      tecnicoAsignadoNombre: undefined,
      gestorAsignadorId: undefined,
      gestorAsignadorNombre: undefined,
      fechaAsignacion: undefined,
      tecnico: 'Sin asignar',
      estado: 'Programado',
    };
    const next = [...current];
    next[idx] = actualizado;
    this.mantenimientosSubject.next(next);
    return of(actualizado);
  }
}

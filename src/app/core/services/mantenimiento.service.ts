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
      fotos: Array.isArray(m.evidencias) ? m.evidencias.filter((e: any) => String(e.tipo || '').includes('FOTO') || e.tipo === 'imagen').map((e: any) => e.url) : (m.fotos || []),
      videos: Array.isArray(m.evidencias) ? m.evidencias.filter((e: any) => String(e.tipo || '').includes('VIDEO')).map((e: any) => e.url) : (m.videos || []),
      documentos: Array.isArray(m.evidencias) ? m.evidencias.filter((e: any) => String(e.tipo || '').includes('DOC') || e.tipo === 'PDF').map((e: any) => ({
        id: e.id,
        nombre: e.descripcion || 'Documento',
        tipo: 'documento' as const,
        url: e.url,
      })) : []
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
    const evidencias = [
      ...((mant.fotos || []).map((url) => ({ tipo: 'FOTO', url }))),
      ...((mant.videos || []).map((url) => ({ tipo: 'VIDEO', url }))),
      ...(((mant as any).documentos || []).map((d: any) => ({ tipo: 'DOCUMENTO', url: d.url, descripcion: d.nombre }))),
    ].filter((e) => e.url);
    const payload = {
      maquinariaId: String((mant as any).maquinariaId || mant.maquina || ''),
      tipo,
      observaciones: mant.descripcion || 'Mantenimiento registrado',
      repuestosUsados: (mant as any).repuestosUtilizados || undefined,
      costoTotal: (mant as any).costoTotal ? Number((mant as any).costoTotal) : undefined,
      evidencias,
    };

    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/registrar'), payload).pipe(
      map(res => this.mapBackendMantenimiento(res?.data || res)),
      tap(nuevo => {
        const current = this.mantenimientosSubject.value;
        this.mantenimientosSubject.next([nuevo, ...current]);
      }),
      catchError(err => {
        console.error('Error al registrar mantenimiento:', err);
        throw err;
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

    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/asignar'), {
      mantenimientoId: String(id),
      tecnicoId: String(tecnicoId),
    }).pipe(
      map(res => this.mapBackendMantenimiento(res?.data || res)),
      tap(actualizado => {
        const list = this.mantenimientosSubject.value;
        const i = list.findIndex(m => String(m.id) === String(id));
        if (i !== -1) {
          list[i] = {
            ...actualizado,
            tecnicoAsignadoId: tecnicoId,
            tecnicoAsignadoNombre: tecnicoNombre,
            gestorAsignadorId: gestorId,
            gestorAsignadorNombre: gestorNombre,
          };
          this.mantenimientosSubject.next([...list]);
        }
      }),
      catchError(() => of(null))
    );
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

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Mantenimiento, ArchivoAdjunto } from '../models';
import { apiUrl } from '../config/env';
import { StorageUploadService } from './storage-upload.service';

@Injectable({
  providedIn: 'root'
})
export class MantenimientoService {
  private http = inject(HttpClient);
  private storageUpload = inject(StorageUploadService);
  private mantenimientosSubject = new BehaviorSubject<Mantenimiento[]>([]);
  public mantenimientos$ = this.mantenimientosSubject.asObservable();

  private mapBackendMantenimiento(m: any): Mantenimiento {
    const maquinaNombre = m.maquinaria?.nombre || m.maquinaria?.codigo || m.maquina || 'Equipo';
    const tecnicoNombre = m.tecnico ? `${m.tecnico.name || ''} ${m.tecnico.lastname || ''}`.trim() : (m.tecnicoNombre || 'Técnico de Turno');
    const fechaStr = m.fechaMantenimiento
      ? new Date(m.fechaMantenimiento).toISOString().split('T')[0]
      : (m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const proximo = m.proximoMantenimiento
      ? new Date(m.proximoMantenimiento).toISOString().split('T')[0]
      : undefined;

    return {
      id: m.id,
      maquinariaId: m.maquinariaId || m.maquinaria?.id,
      frecuenciaDias: Number(m.frecuenciaDias || 0),
      proximoMantenimiento: proximo,
      maquina: maquinaNombre,
      tipo: m.tipo === 'CALIBRACION' || m.tipo === 'Calibración' ? 'Calibración' : (m.tipo === 'CORRECTIVO' ? 'Correctivo' : 'Preventivo'),
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
      maquinariaId: String(mant.maquinariaId || (mant as any).maquinariaId || ''),
      tipo,
      observaciones: mant.descripcion || 'Mantenimiento registrado',
      fechaProgramada: mant.fecha,
      frecuenciaDias: Number(mant.frecuenciaDias || 0),
      proximoMantenimiento: mant.proximoMantenimiento,
      repuestosUsados: (mant as any).repuestosUtilizados || undefined,
      costoTotal: (mant as any).costoTotal ? Number((mant as any).costoTotal) : undefined,
      evidencias,
      tecnicoId: (mant as any).tecnicoId ? String((mant as any).tecnicoId) : undefined,
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

  async subirEvidenciasMantenimiento(
    archivos: ArchivoAdjunto[],
    opts: { maquinariaId?: string; maquinariaNombre?: string; maquinariaCodigo?: string; agenciaId?: string; mantenimientoId?: string },
  ): Promise<Array<{ tipo: string; url: string; descripcion?: string }>> {
    const subidas: Array<{ tipo: string; url: string; descripcion?: string }> = [];
    for (const archivo of archivos) {
      const blob = archivo.file;
      let url = archivo.url;
      if (blob instanceof File || (blob && typeof (blob as Blob).size === 'number' && !String(url).startsWith('http'))) {
        const type = archivo.tipo === 'video'
          ? 'VIDEO_INCIDENTE'
          : archivo.tipo === 'documento'
            ? 'DOCUMENTO'
            : 'FOTO_INCIDENTE';
        url = await this.storageUpload.uploadMedia(blob || archivo.file as File, {
          category: 'MAQUINARIA_MANTENIMIENTO',
          type,
          maquinariaId: opts.maquinariaId,
          maquinariaNombre: opts.maquinariaNombre,
          maquinariaCodigo: opts.maquinariaCodigo,
          agenciaId: opts.agenciaId,
          mantenimientoId: opts.mantenimientoId,
          fileName: archivo.nombre,
          contentType: (archivo.file as File)?.type,
        });
      }
      if (!url || url.startsWith('blob:')) continue;
      subidas.push({
        tipo: archivo.tipo === 'video' ? 'VIDEO' : archivo.tipo === 'documento' ? 'DOCUMENTO' : 'FOTO',
        url,
        descripcion: archivo.nombre,
      });
    }
    return subidas;
  }

  ejecutarMantenimiento(
    id: string | number,
    payload: {
      observaciones: string;
      fechaFin?: string;
      evidencias: Array<{ tipo: string; url: string; descripcion?: string }>;
    },
  ): Observable<Mantenimiento | null> {
    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/ejecutar'), {
      mantenimientoId: String(id),
      observaciones: payload.observaciones,
      fechaFin: payload.fechaFin,
      evidencias: payload.evidencias,
    }).pipe(
      map(res => this.mapBackendMantenimiento(res?.data || res)),
      tap(actualizado => {
        const list = this.mantenimientosSubject.value;
        const i = list.findIndex(m => String(m.id) === String(id));
        if (i !== -1) {
          list[i] = { ...list[i], ...actualizado };
          this.mantenimientosSubject.next([...list]);
        } else {
          this.mantenimientosSubject.next([actualizado, ...list]);
        }
      }),
      catchError(() => of(null)),
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

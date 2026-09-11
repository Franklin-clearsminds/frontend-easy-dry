import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ServicioExtra } from '../models';
import { apiUrl } from '../config/env';

@Injectable({ providedIn: 'root' })
export class ServiciosExtrasMockService {
  private http = inject(HttpClient);
  private serviciosSubject = new BehaviorSubject<ServicioExtra[]>([]);
  public serviciosExtras$ = this.serviciosSubject.asObservable();

  private mapBackend(item: any): ServicioExtra {
    const estadoMap: Record<string, ServicioExtra['estado']> = {
      'PENDIENTE': 'Pendiente',
      'EN_PROCESO': 'En Proceso',
      'EN PROCESO': 'En Proceso',
      'FINALIZADO': 'Completado',
      'COMPLETADO': 'Completado',
      'CANCELADO': 'Cancelado'
    };

    const estado = estadoMap[String(item.estado || '').toUpperCase()] || (item.estado as ServicioExtra['estado']) || 'Pendiente';
    const sucursales = item.agenciaNombre ? [item.agenciaNombre] : (item.sucursales || (item.regionNombre ? [`Zonal ${item.regionNombre}`] : []));

    return {
      id: item.id,
      codigoSE: item.codigoSE || `SE-${String(item.id).substring(0, 6).toUpperCase()}`,
      servicioNombre: item.tipoServicio || item.servicioNombre || 'Servicio Especial',
      servicioDescripcion: item.observaciones || item.servicioDescripcion || '',
      operadorId: item.operadorId || item.operador?.id || '',
      operadorNombre: item.operadorNombre || (item.operador ? `${item.operador.name || ''} ${item.operador.lastname || ''}`.trim() : 'Sin asignar'),
      regionId: item.regionId || item.region?.id || '',
      regionNombre: item.regionNombre || item.region?.nombre || '',
      placa: item.placa || item.vehiculoInfo?.placa || '',
      vehiculoInfo: item.vehiculoInfo || {
        placa: item.placa || '',
        marca: item.marca || '',
        modelo: item.modelo || '',
        color: item.color || '',
        cliente: item.clienteNombre || ''
      },
      videoInicialUrl: item.videoInicialUrl || item.videoInicial || undefined,
      videoFinalUrl: item.videoFinalUrl || item.videoFinal || undefined,
      calificacionCalidad: item.calificacionCalidad || undefined,
      sucursales,
      insumosReceta: Array.isArray(item.recetaInsumos) ? item.recetaInsumos : (Array.isArray(item.insumosReceta) ? item.insumosReceta : []),
      estado,
      fechaProgramada: item.fechaProgramada || (item.createdAt ? String(item.createdAt).split('T')[0] : new Date().toISOString().substring(0, 10)),
      fechaCompletado: item.fechaFin ? String(item.fechaFin).split('T')[0] : (item.finalizadoEn ? String(item.finalizadoEn).split('T')[0] : item.fechaCompletado),
      notas: item.observaciones || item.notas || '',
      creadoPor: item.creadoPor || 'Coordinador Zonal',
      fechaCreacion: item.createdAt ? String(item.createdAt).split('T')[0] : new Date().toISOString().substring(0, 10)
    };
  }

  getServiciosExtras(filtro?: { regionId?: string; operadorId?: string; estado?: string }): Observable<ServicioExtra[]> {
    const payload = filtro || {};
    return this.http.post<any>(apiUrl('/operaciones/servicios-especiales/list'), payload).pipe(
      map(res => {
        const list = Array.isArray(res) ? res : (res?.items || res?.data || []);
        return list.map((item: any) => this.mapBackend(item));
      }),
      tap(mapped => this.serviciosSubject.next(mapped)),
      catchError(() => of(this.serviciosSubject.value))
    );
  }

  getServicioExtraById(id: number | string): Observable<ServicioExtra | undefined> {
    return this.serviciosExtras$.pipe(
      map(list => list.find(s => String(s.id) === String(id)))
    );
  }

  crearServicioExtra(data: Omit<ServicioExtra, 'id' | 'codigoSE' | 'fechaCreacion'> & { videoInicialUrl?: string; regionId?: string; regionNombre?: string }): Observable<ServicioExtra> {
    const vInfo = data.vehiculoInfo || {
      placa: data.placa || 'ABC-1234',
      marca: 'Vehículo',
      modelo: data.servicioNombre || 'Servicio Especial',
      color: 'Gris'
    };

    const payload = {
      tipoServicio: data.servicioNombre || 'Pulido y Recubrimiento Cerámico',
      observaciones: data.notas || data.servicioDescripcion || '',
      operadorId: data.operadorId ? String(data.operadorId) : undefined,
      regionId: data.regionId,
      regionNombre: data.regionNombre,
      videoInicialUrl: data.videoInicialUrl,
      recetaInsumos: data.insumosReceta,
      vehiculoInfo: vInfo
    };

    return this.http.post<any>(apiUrl('/operaciones/servicios-especiales/crear'), payload).pipe(
      map(res => this.mapBackend(res)),
      tap(created => {
        const current = this.serviciosSubject.value;
        this.serviciosSubject.next([created, ...current]);
      }),
      catchError(err => {
        console.error('Error al crear servicio especial en backend:', err);
        throw err;
      })
    );
  }

  actualizarServicioExtra(id: number | string, updates: Partial<ServicioExtra>): Observable<ServicioExtra | null> {
    if (updates.estado === 'En Proceso') {
      return this.http.post<any>(apiUrl('/operaciones/servicios-especiales/iniciar'), {
        id: String(id),
        operadorId: updates.operadorId,
        videoInicialUrl: updates.videoInicialUrl
      }).pipe(
        map(res => this.mapBackend(res)),
        tap(updated => this._updateLocal(id, updated)),
        catchError(() => of(null))
      );
    }
    if (updates.estado === 'Completado') {
      return this.http.post<any>(apiUrl('/operaciones/servicios-especiales/completar'), {
        id: String(id),
        videoFinalUrl: updates.videoFinalUrl,
        calificacionCalidad: updates.calificacionCalidad || 5,
        observaciones: updates.notas
      }).pipe(
        map(res => this.mapBackend(res)),
        tap(updated => this._updateLocal(id, updated)),
        catchError(() => of(null))
      );
    }
    return of(null);
  }

  cambiarEstado(id: number | string, estado: ServicioExtra['estado'], videoUrl?: string): Observable<ServicioExtra | null> {
    if (estado === 'En Proceso') {
      return this.actualizarServicioExtra(id, { estado, videoInicialUrl: videoUrl });
    }
    if (estado === 'Completado') {
      return this.actualizarServicioExtra(id, { estado, videoFinalUrl: videoUrl });
    }
    return this.actualizarServicioExtra(id, { estado });
  }

  eliminarServicioExtra(id: number | string): Observable<boolean> {
    return this.http.post<any>(apiUrl('/operaciones/servicios-especiales/delete'), { id: String(id) }).pipe(
      map(() => true),
      tap(() => {
        const current = this.serviciosSubject.value.filter(s => String(s.id) !== String(id));
        this.serviciosSubject.next(current);
      }),
      catchError(() => of(false))
    );
  }

  getPulidoresPorRegion(regionId?: string): Observable<any[]> {
    return this.http.post<any[]>(apiUrl('/operaciones/servicios-especiales/pulidores'), { regionId }).pipe(
      catchError(() => of([]))
    );
  }

  getStockPulidor(pulidorId?: string): Observable<any[]> {
    return this.http.post<any[]>(apiUrl('/operaciones/servicios-especiales/stock-pulidor'), { pulidorId }).pipe(
      catchError(() => of([]))
    );
  }

  private _updateLocal(id: number | string, updated: ServicioExtra) {
    const current = this.serviciosSubject.value;
    const idx = current.findIndex(s => String(s.id) === String(id));
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updated };
      this.serviciosSubject.next([...current]);
    }
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ServicioExtra } from '../models';
import { apiUrl } from '../config/env';

@Injectable({ providedIn: 'root' })
export class ServiciosExtrasService {
  private http = inject(HttpClient);
  private serviciosSubject = new BehaviorSubject<ServicioExtra[]>([]);
  public serviciosExtras$ = this.serviciosSubject.asObservable();

  private mapBackend(item: any): ServicioExtra {
    const estadoMap: Record<string, ServicioExtra['estado']> = {
      'PENDIENTE': 'Pendiente',
      'EN_PROCESO': 'En Proceso',
      'EN PROCESO': 'En Proceso',
      'PAUSADO': 'Pausado',
      'FINALIZADO': 'Completado',
      'COMPLETADO': 'Completado',
      'CANCELADO': 'Cancelado'
    };

    const estado = estadoMap[String(item.estado || '').toUpperCase()] || (item.estado as ServicioExtra['estado']) || 'Pendiente';
    const sucursales = item.agenciaNombre ? [item.agenciaNombre] : (item.sucursales || (item.regionNombre ? [`Zonal ${item.regionNombre}`] : []));

    return {
      id: item.id,
      codigoSE: item.codigoSE || `SE-${String(item.id).substring(0, 6).toUpperCase()}`,
      ordenTrabajoOT: item.ordenTrabajoOT || item.codigoSE || '',
      servicioNombre: item.tipoServicio || item.servicioNombre || 'Servicio Especial',
      servicioDescripcion: item.observaciones || item.servicioDescripcion || '',
      operadorId: item.operadorId || item.operador?.id || '',
      operadorNombre: item.operadorNombre || (item.operador ? `${item.operador.name || ''} ${item.operador.lastname || ''}`.trim() : 'Sin asignar'),
      regionId: item.regionId || item.region?.id || '',
      regionNombre: item.regionNombre || item.region?.nombre || '',
      agenciaId: item.agenciaId || item.agencia?.id || '',
      agenciaNombre: item.agenciaNombre || item.agencia?.nombre || '',
      bahiaId: item.bahiaId || '',
      bahia: item.bahia || item.bahiaNombre || '',
      horaIngreso: item.horaIngreso || '',
      horaEstimada: item.horaEstimada || '',
      horaSalida: item.horaSalida || item.horaEstimada || '',
      cliente: item.cliente || item.clienteNombre || item.vehiculoInfo?.cliente || '',
      clienteNombre: item.clienteNombre || item.cliente || '',
      marca: item.marca || item.vehiculoInfo?.marca || '',
      modelo: item.modelo || item.vehiculoInfo?.modelo || '',
      color: item.color || item.vehiculoInfo?.color || '',
      prioridad: item.prioridad || 'Media',
      placa: item.placa || item.vehiculoInfo?.placa || '',
      vehiculoInfo: item.vehiculoInfo || {
        placa: item.placa || '',
        marca: item.marca || '',
        modelo: item.modelo || '',
        color: item.color || '',
        cliente: item.clienteNombre || item.cliente || ''
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
      creadoPor: item.creadoPor || item.operadorNombre || '',
      fechaCreacion: item.createdAt ? String(item.createdAt).split('T')[0] : new Date().toISOString().substring(0, 10),

      // Campos de Pausa, Reanudación y Tiempos de Trabajo
      videoInicial: item.videoInicial || item.videoInicialUrl || null,
      videoFinal: item.videoFinal || item.videoFinalUrl || null,
      videoPausa: item.videoUltimaPausaUrl || item.videoPausa || null,
      videoReanudacion: item.videoUltimaReanudacionUrl || item.videoReanudacion || null,
      videoUltimaPausaUrl: item.videoUltimaPausaUrl || null,
      videoUltimaReanudacionUrl: item.videoUltimaReanudacionUrl || null,
      motivoUltimaPausa: item.motivoUltimaPausa || null,
      fechaUltimaPausa: item.fechaUltimaPausa || null,
      tiempoPausaTotalSeg: Number(item.tiempoPausaTotalSeg || 0),
      tiempoPausaFormateado: item.tiempoPausaFormateado || '0 min',
      tiempoEfectivoSeg: item.tiempoEfectivoSeg !== null && item.tiempoEfectivoSeg !== undefined ? Number(item.tiempoEfectivoSeg) : null,
      tiempoEfectivoFormateado: item.tiempoEfectivoFormateado || '0 min',
      historialPausas: Array.isArray(item.historialPausas) ? item.historialPausas : []
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

  crearServicioExtra(data: any): Observable<ServicioExtra> {
    const rawOT = (data.ordenTrabajoOT || data.codigoSE || '').trim().toUpperCase();
    const placa = (data.vehiculoInfo?.placa || data.placa || '').trim().toUpperCase();
    if (!placa) {
      return throwError(() => new Error('La placa del vehículo es obligatoria.'));
    }
    const servNombre = (data.servicioNombre || data.tipoServicio || '').trim();
    if (!servNombre) {
      return throwError(() => new Error('El tipo de servicio especial es obligatorio.'));
    }

    const cliente = data.cliente || data.clienteNombre || data.vehiculoInfo?.cliente || '';
    const marca = (data.marca || data.vehiculoInfo?.marca || '').trim();
    const modelo = (data.modelo || data.vehiculoInfo?.modelo || '').trim();
    const color = (data.color || data.vehiculoInfo?.color || '').trim();

    const vInfo = {
      placa,
      marca,
      modelo,
      color,
      cliente
    };

    const payload = {
      codigoSE: rawOT || undefined,
      ordenTrabajoOT: rawOT || undefined,
      tipoServicio: servNombre,
      observaciones: data.notas || data.servicioDescripcion || '',
      operadorId: data.operadorId ? String(data.operadorId) : undefined,
      agenciaId: data.agenciaId ? String(data.agenciaId) : undefined,
      bahiaId: data.bahiaId ? String(data.bahiaId) : undefined,
      horaIngreso: data.horaIngreso || undefined,
      horaEstimada: data.horaEstimada || undefined,
      regionId: data.regionId,
      regionNombre: data.regionNombre,
      prioridad: data.prioridad || 'Media',
      videoInicialUrl: data.videoInicialUrl,
      recetaInsumos: data.insumosReceta,
      vehiculoInfo: vInfo,
      placa,
      marca,
      modelo,
      color,
      cliente
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

  pausarServicioExtra(id: number | string, motivo: string, videoPausaUrl: string): Observable<ServicioExtra> {
    return this.http.post<any>(apiUrl('/operaciones/servicios-especiales/pausar'), {
      id: String(id),
      motivo,
      videoPausaUrl
    }).pipe(
      map(res => this.mapBackend(res)),
      tap(updated => this._updateLocal(id, updated)),
      catchError(err => {
        console.error('Error al pausar servicio especial:', err);
        throw err;
      })
    );
  }

  reanudarServicioExtra(id: number | string, videoReanudarUrl: string, observaciones?: string): Observable<ServicioExtra> {
    return this.http.post<any>(apiUrl('/operaciones/servicios-especiales/reanudar'), {
      id: String(id),
      videoReanudarUrl,
      observaciones
    }).pipe(
      map(res => this.mapBackend(res)),
      tap(updated => this._updateLocal(id, updated)),
      catchError(err => {
        console.error('Error al reanudar servicio especial:', err);
        throw err;
      })
    );
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

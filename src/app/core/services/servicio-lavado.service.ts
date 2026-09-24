import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { VehiculoServicio } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class ServicioLavadoService {
  private http = inject(HttpClient);
  private serviciosSubject = new BehaviorSubject<VehiculoServicio[]>([]);
  public servicios$ = this.serviciosSubject.asObservable();

  private mapBackendServicio(s: any): VehiculoServicio {
    const estadoMap: Record<string, string> = {
      'EN_ESPERA': 'EN PROCESO',
      'EN_PROCESO': 'EN PROCESO',
      'FINALIZADO': 'FINALIZADO',
      'APROBADO': 'APROBADO',
      'RECHAZADO': 'RECHAZADO',
      'CANCELADO': 'CANCELADO'
    };

    const horaIngreso = s.horaIngreso ? new Date(s.horaIngreso).toTimeString().substring(0, 5) : '08:00';
    const horaSalida = s.horaSalida ? new Date(s.horaSalida).toTimeString().substring(0, 5) : '--:--';
    const fecha = s.horaIngreso ? new Date(s.horaIngreso).toISOString().split('T')[0] : (s.fecha || new Date().toISOString().split('T')[0]);

    const catRaw = s.categoriaServicio || s.catalogo?.categoria || s.catalogoRel?.categoria || 'GENERAL';
    const isEspecial = catRaw === 'ESPECIAL' || catRaw === 'EXTRA' || String(catRaw).toLowerCase().includes('especial') || String(catRaw).toLowerCase().includes('extra');
    const categoriaServicio = isEspecial ? 'Servicios Especiales' : 'Servicios Generales';

    const servicioNombre = s.servicio || s.servicioNombre || s.catalogo?.nombre || s.catalogoRel?.nombre || '';
    const agenciaNombre = s.agencia || s.agenciaNombre || s.sucursalNombre || s.bahia?.agencia?.nombre || s.bahiaRel?.agencia?.nombre || '';
    const bahiaNombre = s.bahiaNombre || (typeof s.bahia === 'string' ? s.bahia : s.bahia?.nombre) || s.bahiaRel?.nombre || '';
    const empleadoNombre = s.empleado || s.operadorNombre || (s.operador ? `${s.operador.name || ''} ${s.operador.lastname || ''}`.trim() : (s.operadorRel ? `${s.operadorRel.name || ''} ${s.operadorRel.lastname || ''}`.trim() : ''));

    let duracionMinutos = s.duracionMinutos !== undefined && s.duracionMinutos !== null ? Number(s.duracionMinutos) : null;
    let duracionFormateada = s.duracionFormateada || '';
    if (!duracionFormateada && s.horaIngreso) {
      const tIn = new Date(s.horaIngreso).getTime();
      if (s.horaSalida) {
        const tOut = new Date(s.horaSalida).getTime();
        duracionMinutos = Math.max(0, Math.round((tOut - tIn) / 60000));
        const h = Math.floor(duracionMinutos / 60);
        const m = duracionMinutos % 60;
        duracionFormateada = h > 0 ? `${h}h ${m}min` : `${m} min`;
      } else if (s.estado === 'EN_PROCESO' || s.estado === 'EN PROCESO' || s.estado === 'INICIADO') {
        duracionMinutos = Math.max(0, Math.round((Date.now() - tIn) / 60000));
        const h = Math.floor(duracionMinutos / 60);
        const m = duracionMinutos % 60;
        duracionFormateada = h > 0 ? `${h}h ${m}min` : `${m} min`;
      }
    }

    let ordenTrabajoOT = s.ordenTrabajoOT;
    if (!ordenTrabajoOT && (s.fotoIngresoUrl || s.fotoSalidaUrl)) {
      const match = (s.fotoIngresoUrl || s.fotoSalidaUrl).match(/\/servicios\/(?:generales|especiales)\/([^/]+)\//i);
      if (match && match[1] && match[1] !== 'sin-orden') {
        ordenTrabajoOT = match[1].toUpperCase();
      }
    }
    if (!ordenTrabajoOT) {
      ordenTrabajoOT = s.clientUuid ? `OT-${s.clientUuid.substring(0, 6).toUpperCase()}` : `OT-${String(s.id).substring(0, 6)}`;
    }
    const numeroOrden = s.numeroOrden || ordenTrabajoOT;

    return {
      id: s.id,
      numeroOrden,
      ordenTrabajoOT,
      placa: s.placa || '',
      marca: s.marca || s.modelo?.split(' ')[0] || '',
      modelo: s.modelo || '',
      anio: s.anio || new Date().getFullYear(),
      color: s.color || '',
      categoriaServicio,
      servicioId: s.servicioCatalogoId || s.catalogo?.id || s.catalogoRel?.id,
      servicio: servicioNombre,
      categoria: 'Sedán',
      agencia: agenciaNombre,
      bahia: bahiaNombre,
      bahiaId: s.bahiaId || s.bahia?.id || s.bahiaRel?.id || undefined,
      empleado: empleadoNombre,
      fecha,
      horaIngreso,
      horaSalida,
      duracionMinutos,
      duracionFormateada,
      estado: estadoMap[s.estado] || s.estado || 'EN PROCESO',
      foto: s.fotoSalidaUrl || s.fotoIngresoUrl || s.foto || '',
      fotos: s.fotoIngresoUrl ? [s.fotoIngresoUrl] : (s.fotos || []),
      fotoIngresoUrl: s.fotoIngresoUrl || (s.fotos && s.fotos[0]) || '',
      fotoSalidaUrl: s.fotoSalidaUrl || '',
      video: s.fotoSalidaUrl || s.videoFinalUrl || (s.video && s.video !== s.fotoIngresoUrl ? s.video : '') || '',
      videoUrl: s.fotoSalidaUrl || s.videoFinalUrl || (s.videoUrl && s.videoUrl !== s.fotoIngresoUrl ? s.videoUrl : '') || '',
      videoInicialUrl: s.videoInicialUrl || s.videoInicial || s.fotoIngresoUrl || '',
      videoFinalUrl: s.videoFinalUrl || s.videoFinal || s.fotoSalidaUrl || '',
      tiempoEstimadoMin: s.catalogo?.tiempoEstimadoMin ?? s.catalogoRel?.tiempoEstimadoMin ?? 0,
      notas: s.observaciones || s.notas || '',
      observacionGerente: s.observacionGerente || '',
      aprobadoPor: s.aprobadoPor || '',
      fechaAprobacion: s.fechaAprobacion ? new Date(s.fechaAprobacion).toISOString().substring(0, 16) : undefined,
      insumosUtilizados: (s.consumos || []).map((c: any) => ({
        productoId: c.insumoId,
        productoSKU: c.insumo?.codigoSKU || '',
        productoNombre: c.insumo?.nombre || 'Insumo',
        unidadMedida: 'und',
        cantidad: Number(c.cantidadUsada || 0)
      }))
    };
  }

  getServicios(filtros?: { sucursalId?: string; agenciaId?: string; regionId?: string; estado?: string }): Observable<VehiculoServicio[]> {
    const body: any = {};
    if (filtros?.sucursalId) body.sucursalId = filtros.sucursalId;
    if (filtros?.agenciaId) body.agenciaId = filtros.agenciaId;
    if (filtros?.regionId) body.regionId = filtros.regionId;
    if (filtros?.estado) body.estado = filtros.estado;
    return this.http.post<any>(apiUrl('/operaciones/servicios/list'), body).pipe(
      map(res => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        return list.map((s: any) => this.mapBackendServicio(s));
      }),
      tap(mapped => this.serviciosSubject.next(mapped)),
      catchError(() => of(this.serviciosSubject.value))
    );
  }

  getServiciosPorSucursal(sucursal: string): Observable<VehiculoServicio[]> {
    return this.getServicios().pipe(
      map(list => {
        if (!sucursal || sucursal.toLowerCase().includes('toda')) return list;
        return list.filter(s => s.agencia.toLowerCase().includes(sucursal.toLowerCase()) || sucursal.toLowerCase().includes(s.agencia.toLowerCase()));
      })
    );
  }

  getServiciosDelDia(fecha?: string): Observable<VehiculoServicio[]> {
    const target = fecha || new Date().toISOString().split('T')[0];
    return this.getServicios().pipe(
      map(list => list.filter(s => s.fecha.startsWith(target)))
    );
  }

  /**
   * Registra la OT general. Con varios servicios (`servicioCatalogoIds`) el backend crea una fila por servicio
   * con la misma OT y vehículo; siempre devuelve la lista de filas creadas.
   */
  crearRegistroHojaServicio(
    nuevo: Partial<VehiculoServicio> & { bahiaId?: string; servicioCatalogoId?: number; servicioCatalogoIds?: number[] },
  ): Observable<VehiculoServicio[]> {
    const videoOIngreso = nuevo.video || nuevo.videoUrl || (nuevo as any).fotoIngresoUrl || nuevo.foto || null;
    const ordenTrabajoOT = nuevo.ordenTrabajoOT ? nuevo.ordenTrabajoOT.trim() : undefined;
    const servicioCatalogoIds = (nuevo.servicioCatalogoIds || []).map(Number).filter((id) => id > 0);
    const payload = {
      ordenTrabajoOT,
      placa: (nuevo.placa || '').toUpperCase().trim(),
      marca: nuevo.marca || undefined,
      modelo: nuevo.modelo || `${nuevo.marca || ''} ${nuevo.modelo || ''}`.trim(),
      color: nuevo.color || '',
      cliente: (nuevo as any).cliente || '',
      bahiaId: nuevo.bahiaId || (nuevo as any).bahia,
      servicioCatalogoId: servicioCatalogoIds[0] || nuevo.servicioCatalogoId || Number(nuevo.servicioId),
      ...(servicioCatalogoIds.length > 1 ? { servicioCatalogoIds } : {}),
      fotoIngresoUrl: videoOIngreso,
      observaciones: nuevo.notas || '',
      estado: (nuevo.estado as any) || 'EN_PROCESO'
    };

    return this.http.post<any>(apiUrl('/operaciones/servicios/create'), payload).pipe(
      map(res => (Array.isArray(res) ? res : [res]).map((item: any) => this.mapBackendServicio(item))),
      tap(created => {
        const current = this.serviciosSubject.value;
        this.serviciosSubject.next([...created, ...current]);
      }),
      catchError(err => {
        console.error('Error al registrar servicio en backend:', err);
        throw err;
      })
    );
  }

  finalizarServicioOperador(id: string | number, extraData?: { fotoSalidaUrl?: string; videoUrl?: string; observaciones?: string }): Observable<VehiculoServicio | null> {
    const fotoSalidaUrl = extraData?.videoUrl || extraData?.fotoSalidaUrl;
    return this.http.post<any>(apiUrl('/operaciones/servicios/update'), {
      id: String(id),
      estado: 'FINALIZADO',
      horaSalida: new Date().toISOString(),
      ...(fotoSalidaUrl ? { fotoSalidaUrl } : {}),
      ...(extraData?.observaciones ? { observaciones: extraData.observaciones } : {})
    }).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(updated => {
        if (!updated) return;
        const current = this.serviciosSubject.value;
        const idx = current.findIndex(s => s.id === id);
        if (idx !== -1) {
          // Preservar el estado real devuelto por el backend:
          // Si la agencia no tiene aprobador, el backend devuelve APROBADO directamente.
          // Si tiene aprobador, devuelve FINALIZADO para esperar revisión gerencial.
          current[idx] = { ...current[idx], ...updated };
          this.serviciosSubject.next([...current]);
        }
      }),
      catchError(err => {
        console.error('Error al finalizar servicio en backend:', err);
        throw err;
      })
    );
  }

  aprobarServicioGerente(id: string | number, observacion?: string, gerenteNombre?: string): Observable<VehiculoServicio | null> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/aprobar'), {
      id: String(id),
      observacion: observacion || 'Aprobado sin observaciones.'
    }).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(updated => {
        const current = this.serviciosSubject.value;
        const idx = current.findIndex(s => s.id === id);
        if (idx !== -1) {
          current[idx] = {
            ...current[idx],
            ...updated,
            estado: 'APROBADO',
            observacionGerente: observacion,
            aprobadoPor: gerenteNombre
          };
          this.serviciosSubject.next([...current]);
        }
      }),
      catchError(() => of(null))
    );
  }

  rechazarServicioGerente(id: string | number, motivo: string, gerenteNombre?: string): Observable<VehiculoServicio | null> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/rechazar'), {
      id: String(id),
      motivo
    }).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(updated => {
        const current = this.serviciosSubject.value;
        const idx = current.findIndex(s => s.id === id);
        if (idx !== -1) {
          current[idx] = {
            ...current[idx],
            ...updated,
            estado: 'RECHAZADO',
            observacionGerente: `RECHAZADO: ${motivo}`,
            aprobadoPor: gerenteNombre
          };
          this.serviciosSubject.next([...current]);
        }
      }),
      catchError(() => of(null))
    );
  }

  aprobarTodosLosServiciosDelDia(sucursal: string, gerenteNombre?: string): Observable<boolean> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/aprobar-todos'), {
      sucursalId: sucursal
    }).pipe(
      map(res => Boolean(res)),
      tap(() => {
        const current = this.serviciosSubject.value;
        current.forEach(s => {
          if (s.estado === 'FINALIZADO') {
            s.estado = 'APROBADO';
            s.aprobadoPor = gerenteNombre;
          }
        });
        this.serviciosSubject.next([...current]);
      }),
      catchError(() => of(false))
    );
  }
}

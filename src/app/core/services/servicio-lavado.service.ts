import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { VehiculoServicio } from '../models';
import { apiUrl } from '../config/env';
import { OrdenDir, PaginaServidor, normalizarPagina } from '../models/paginacion.model';
import { PAGE_SIZE_MAX } from '../config/paginacion';

/** Consulta paginada de servicios de lavado (todo se resuelve en el servidor). */
export interface ConsultaServicios {
  page?: number;
  pageSize?: number;
  /** fecha | createdAt | ot | placa | modelo | cliente | estado | servicio | operador | agencia | bahia */
  sortField?: string | null;
  sortOrder?: OrdenDir;
  search?: string;
  /** EN_PROCESO | POR_APROBAR | APROBADO | FINALIZADO | RECHAZADO | CANCELADO | valor del enum */
  estado?: string;
  agenciaId?: string;
  regionId?: string;
  bahiaId?: string;
  operadorId?: string;
  servicioId?: number | string;
  clienteId?: string;
  /** Filtros por NOMBRE (los que emite el filter-bar): agencia, bahía y cliente exactos; operador por palabras. */
  agenciaNombre?: string;
  bahiaNombre?: string;
  operadorNombre?: string;
  clienteNombre?: string;
  /** ISO 8601 (inicio del día local) */
  fechaDesde?: string;
  /** ISO 8601 (fin del día local) */
  fechaHasta?: string;
  incluirResumen?: boolean;
}

export interface ResumenServicios {
  porEstado: Record<string, number>;
  porAprobar: number;
  total: number;
}

export interface RespuestaServiciosPagina {
  pagina: PaginaServidor<VehiculoServicio>;
  resumen?: ResumenServicios;
}

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
    const isEspecial = catRaw === 'ESPECIAL' || String(catRaw).toLowerCase().includes('especial');
    const categoriaServicio = isEspecial ? 'Servicios Especiales' : 'Servicios Generales';

    const servicioNombre = s.servicio || s.servicioNombre || s.catalogo?.nombre || s.catalogoRel?.nombre || '';
    const agenciaNombre = s.agencia || s.agenciaNombre || s.sucursalNombre || s.bahia?.agencia?.nombre || s.bahiaRel?.agencia?.nombre || '';
    const bahiaNombre = s.bahiaNombre || (typeof s.bahia === 'string' ? s.bahia : s.bahia?.nombre) || s.bahiaRel?.nombre || '';
    const operadoresAsignados = Array.isArray(s.operadoresAsignados)
      ? s.operadoresAsignados.map((op: any) => ({ id: String(op.id), nombre: op.nombre || '' }))
      : [];
    const empleadoNombre = operadoresAsignados.length
      ? operadoresAsignados.map((op: { nombre: string }) => op.nombre).filter(Boolean).join(', ')
      : s.empleado || s.operadorNombre || (s.operador ? `${s.operador.name || ''} ${s.operador.lastname || ''}`.trim() : (s.operadorRel ? `${s.operadorRel.name || ''} ${s.operadorRel.lastname || ''}`.trim() : ''));

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
    return {
      id: s.id,
      ordenTrabajoOT,
      precio: s.precio != null ? Number(s.precio) : null,
      placa: s.placa || '',
      marca: s.marca || s.modelo?.split(' ')[0] || '',
      modelo: s.modelo || '',
      anio: s.anio || new Date().getFullYear(),
      color: s.color || '',
      cliente: s.cliente || '',
      categoriaServicio,
      servicioId: s.servicioCatalogoId || s.catalogo?.id || s.catalogoRel?.id,
      servicio: servicioNombre,
      categoria: 'Sedán',
      agencia: agenciaNombre,
      bahia: bahiaNombre,
      bahiaId: s.bahiaId || s.bahia?.id || s.bahiaRel?.id || undefined,
      empleado: empleadoNombre,
      operadoresAsignados,
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
      video: s.videoFinalUrl || s.fotoSalidaUrl || (s.video && s.video !== s.fotoIngresoUrl ? s.video : '') || '',
      videoUrl: s.videoFinalUrl || s.fotoSalidaUrl || (s.videoUrl && s.videoUrl !== s.fotoIngresoUrl ? s.videoUrl : '') || '',
      videoInicialUrl: s.videoInicialUrl || s.videoInicial || s.fotoIngresoUrl || '',
      videoFinalUrl: s.videoFinalUrl || s.videoFinal || s.fotoSalidaUrl || '',
      tiempoEstimadoMin: s.catalogo?.tiempoEstimadoMin ?? s.catalogoRel?.tiempoEstimadoMin ?? 0,
      notas: s.observaciones || s.notas || '',
      observacionGerente: s.observacionGerente || '',
      aprobadoPor: s.aprobadoPor || '',
      fechaAprobacion: s.fechaAprobacion ? new Date(s.fechaAprobacion).toISOString() : undefined,
      reglaDecision: s.reglaDecision || null,
      motivoRechazo: s.motivoRechazo || null,
      agenciaId: s.agenciaId || s.bahia?.agencia?.id || s.bahiaRel?.agencia?.id || null,
      puedeDecidir: s.puedeDecidir === true,
      agenciaSinAprobador: s.agenciaSinAprobador === true,
      anuladoPorId: s.anuladoPorId || null,
      anuladoEn: s.anuladoEn || null,
      motivoAnulacion: s.motivoAnulacion || null,
      // Nombre/SKU/unidad: se usa el snapshot congelado al momento del consumo
      // (sobrevive a que el producto cambie de nombre/SKU después). Los registros
      // creados antes de este cambio no tienen snapshot, así que caen al dato actual.
      insumosUtilizados: (s.consumos || []).map((c: any) => ({
        productoId: c.insumoId,
        productoSKU: c.insumoSKU || c.insumo?.codigoSKU || '',
        productoNombre: c.insumoNombre || c.insumo?.nombre || 'Insumo',
        unidadMedida: c.unidadSimbolo || 'und',
        cantidad: Number(c.cantidadUsada || 0)
      }))
    };
  }

  getServicios(filtros?: { sucursalId?: string; agenciaId?: string; regionId?: string; estado?: string }): Observable<VehiculoServicio[]> {
    const body: any = { pageSize: PAGE_SIZE_MAX };
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

  /**
   * Una página de servicios con orden, búsqueda y filtros resueltos en el servidor.
   * NO toca `serviciosSubject` (una página parcial no debe pisar la lista completa que usan otras pantallas).
   */
  getServiciosPagina(consulta: ConsultaServicios): Observable<RespuestaServiciosPagina> {
    const body: Record<string, unknown> = {};
    const c = consulta;
    body['page'] = c.page || 1;
    body['pageSize'] = Math.min(c.pageSize || 25, PAGE_SIZE_MAX);
    if (c.sortField) { body['sortField'] = c.sortField; body['sortOrder'] = c.sortOrder || 'desc'; }
    const texto = (c.search || '').trim();
    if (texto.length >= 2) body['search'] = texto;
    const claves: (keyof ConsultaServicios)[] = [
      'estado', 'agenciaId', 'regionId', 'bahiaId', 'operadorId', 'clienteId',
      'agenciaNombre', 'bahiaNombre', 'operadorNombre', 'clienteNombre', 'fechaDesde', 'fechaHasta',
    ];
    for (const k of claves) {
      const v = c[k];
      if (v !== undefined && v !== null && v !== '') body[k] = v;
    }
    if (c.servicioId !== undefined && c.servicioId !== null && c.servicioId !== '' && Number(c.servicioId) > 0) {
      body['servicioId'] = Number(c.servicioId);
    }
    if (c.incluirResumen) body['incluirResumen'] = true;

    return this.http.post<any>(apiUrl('/operaciones/servicios/list'), body).pipe(
      map((res) => {
        const pagina = normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number);
        return {
          pagina: { ...pagina, items: pagina.items.map((s: any) => this.mapBackendServicio(s)) },
          resumen: (res?.resumen as ResumenServicios | undefined),
        };
      }),
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
    nuevo: Partial<VehiculoServicio> & { bahiaId?: string; servicioCatalogoId?: number; servicioCatalogoIds?: number[]; operadorIds?: string[] },
  ): Observable<VehiculoServicio[]> {
    const video = nuevo.video || nuevo.videoUrl || (nuevo as any).fotoIngresoUrl || null;
    const foto = nuevo.foto || null;
    // Con foto adicional el video y la foto viajan por separado; sin ella, el video sigue yendo como evidencia de ingreso.
    const fotoYVideo = !!(video && foto && foto !== video);
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
      ...(nuevo.operadorIds?.length ? { operadorIds: nuevo.operadorIds } : {}),
      fotoIngresoUrl: fotoYVideo ? foto : (video || foto),
      ...(fotoYVideo ? { videoInicialUrl: video } : {}),
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

  /** Corrige los datos del vehículo y del cliente de una OT (casilla «Editar OT»); el servidor los aplica a todos los servicios de la OT. */
  editarServicio(id: string | number, datos: { placa: string; marca: string; modelo: string; color: string; cliente: string; observaciones: string; servicioCatalogoId?: number }): Observable<VehiculoServicio | null> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/update'), { id: String(id), ...datos }).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(updated => {
        if (!updated) return;
        const current = this.serviciosSubject.value;
        const idx = current.findIndex(s => String(s.id) === String(id));
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...updated };
          this.serviciosSubject.next([...current]);
        }
      }),
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
          // Se conserva el estado real que devuelve el servidor: un servicio finalizado queda pendiente de aprobación.
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

  /**
   * Aprueba un servicio finalizado. Permiso 'servicios.decidir'. Quién aprueba, cuándo y con qué regla lo fija el servidor
   * (no se envía ni se inventa nada del lado web). Los errores del servidor (403/400) se propagan para mostrarlos.
   */
  aprobarServicioGerente(id: string | number, observacion?: string): Observable<VehiculoServicio> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/aprobar'), {
      id: String(id),
      ...(observacion?.trim() ? { observacion: observacion.trim() } : {})
    }).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(updated => this.reemplazarLocal(id, updated)),
    );
  }

  /** Rechaza un servicio finalizado (motivo mínimo 5 caracteres, lo valida el servidor). */
  rechazarServicioGerente(id: string | number, motivo: string): Observable<VehiculoServicio> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/rechazar'), {
      id: String(id),
      motivo: motivo.trim()
    }).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(updated => this.reemplazarLocal(id, updated)),
    );
  }

  /** Anula un servicio con motivo obligatorio (mínimo 5 caracteres); no se borra, queda el registro. Permiso 'servicios.anular'. */
  anularServicio(id: string | number, motivo: string, reponerInsumos = true): Observable<boolean> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/delete'), {
      id: String(id),
      motivo: motivo.trim(),
      reponerInsumos,
    }).pipe(
      map(() => true),
      tap(() => {
        this.serviciosSubject.next(this.serviciosSubject.value.filter(s => String(s.id) !== String(id)));
      }),
    );
  }

  private reemplazarLocal(id: string | number, updated: VehiculoServicio): void {
    const current = this.serviciosSubject.value;
    const idx = current.findIndex(s => String(s.id) === String(id));
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updated };
      this.serviciosSubject.next([...current]);
    }
  }
}

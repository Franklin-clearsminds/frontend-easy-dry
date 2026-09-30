import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Incidente, ArchivoAdjunto, nombrePersona } from '../models';
import { PaginaServidor, OrdenDir, normalizarPagina } from '../models/paginacion.model';
import { PAGE_SIZE_MAX, PAGE_SIZE_TABLA, BUSQUEDA_MIN_CARACTERES } from '../config/paginacion';
import { apiUrl } from '../config/env';
import { mapEvidenciasMaquinaria, fechaISOLocal, fechaLocal } from '../utils/evidencia-maquinaria';

export type GravedadIncidente = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

/** Evidencia ya subida a S3 (URL pública devuelta por el ticket). */
export interface EvidenciaInput {
  tipo?: string;
  url: string;
  descripcion?: string;
}

export interface ReportarIncidentePayload {
  /** Mismo UUID que se usó en el ticket de subida, para que la carpeta de S3 coincida. */
  clientUuid?: string;
  maquinariaId: string;
  titulo: string;
  descripcion: string;
  gravedad: GravedadIncidente | string;
  destinoTallerId?: string;
  evidencias: EvidenciaInput[];
}

/** Consulta paginada de incidencias: todo (orden, búsqueda y filtros) se resuelve en el servidor. */
export interface ConsultaIncidentes {
  page?: number;
  pageSize?: number;
  /** fecha | solucion | estado | gravedad | titulo | maquina | agencia | reportadoPor | tecnico. Sin él: no atendidas, en proceso, cerradas. */
  sortField?: string | null;
  sortOrder?: OrdenDir;
  search?: string;
  maquinariaId?: string;
  /** ABIERTO | EN_PROCESO | RESUELTO | CANCELADO */
  estado?: string;
  gravedad?: string;
  tecnicoId?: string;
  agenciaId?: string;
  regionId?: string;
  clienteId?: string;
  soloNoAtendidas?: boolean;
  /** AAAA-MM-DD o ISO (por fecha de reporte). */
  fechaDesde?: string;
  fechaHasta?: string;
  incluirResumen?: boolean;
}

export interface ResumenIncidentes {
  noAtendidas: number;
  enProceso: number;
  cerradas: number;
  total: number;
}

export interface RespuestaIncidentesPagina {
  pagina: PaginaServidor<Incidente>;
  resumen?: ResumenIncidentes;
}

@Injectable({
  providedIn: 'root'
})
export class IncidenteService {
  private http = inject(HttpClient);
  private incidentesSubject = new BehaviorSubject<Incidente[]>([]);
  public incidentes$ = this.incidentesSubject.asObservable();

  private mapBackendIncidente(item: any): Incidente {
    const maqNombre = item.maquinaria?.nombre || item.maquinaria?.codigo || item.maquina || 'Equipo';
    // El backend ya resuelve la agencia efectiva: si la máquina tiene pulidor asignado, manda su ubicación
    // (agencia del fijo, o "Pulidor Móvil" si no tiene agencia fija) en vez de la agencia física de la máquina.
    const esPulidorMovil = item.esPulidorMovil === true;
    const agNombre = esPulidorMovil
      ? 'Pulidor Móvil'
      : (item.agenciaMostrada || item.maquinaria?.agencia?.nombre || item.agencia || 'Taller Central');
    const repNombre = item.reportadoPor ? (nombrePersona(item.reportadoPor) || item.reportadoPor.email) : (item.reportadoPor || 'Operador');
    const resNombre = item.resueltoPor ? nombrePersona(item.resueltoPor) : (item.solucionadoPor || undefined);
    const evidencias = mapEvidenciasMaquinaria(item.evidencias);
    // Las evidencias sin etapa (datos anteriores) se consideran del reporte.
    const delReporte = evidencias.filter(e => e.etapa !== 'REPARACION');
    const deReparacion = evidencias.filter(e => e.etapa === 'REPARACION');
    const comoAdjunto = (e: (typeof evidencias)[number]): ArchivoAdjunto => ({
      id: e.id,
      nombre: e.descripcion || 'Documento',
      tipo: 'documento',
      url: e.url,
      tamanoBytes: e.tamanoBytes,
    });

    const gravedadRaw = String(item.gravedad || '');
    const estadoRaw = String(item.estado || '');
    const estadoUi = estadoRaw === 'ABIERTO'
      ? 'Pendiente'
      : estadoRaw === 'EN_PROCESO'
        ? 'En Solución'
        : estadoRaw === 'RESUELTO'
          ? 'Solucionado'
          : estadoRaw === 'CANCELADO'
            ? 'Cancelado'
            : (item.estado || 'Pendiente');
    const fechaReporte = item.fechaReporte || item.createdAt;

    return {
      id: item.id,
      codigoIncidente: item.codigoIncidente || (typeof item.id === 'string' ? `INC-${item.id.substring(0, 6).toUpperCase()}` : `INC-2026-${String(item.id).padStart(3, '0')}`),
      maquina: maqNombre,
      agencia: agNombre,
      esPulidorMovil,
      fecha: fechaReporte ? fechaISOLocal(fechaReporte) : (item.fecha || fechaISOLocal(new Date().toISOString())),
      tipo: item.titulo || item.tipo || 'Falla técnica',
      prioridad: gravedadRaw
        ? (gravedadRaw === 'CRITICA' ? 'Crítica' : gravedadRaw === 'ALTA' ? 'Alta' : gravedadRaw === 'BAJA' ? 'Baja' : 'Media')
        : (item.prioridad || 'Media'),
      estado: estadoUi,
      descripcion: item.descripcion || '',
      reportadoPor: repNombre,
      tecnicoAsignadoId: item.tecnicoAsignadoId || item.tecnicoAsignado?.id,
      tecnicoAsignadoNombre: item.tecnicoAsignado
        ? nombrePersona(item.tecnicoAsignado)
        : (resNombre || item.tecnicoAsignadoNombre),
      gestorAsignadorId: item.gestorAsignadorId,
      gestorAsignadorNombre: item.gestorAsignadorNombre,
      fechaAsignacion: item.fechaAsignacion,
      fotosFallo: delReporte.filter(e => e.kind === 'FOTO').map(e => e.url),
      videosFallo: delReporte.filter(e => e.kind === 'VIDEO').map(e => e.url),
      fotosReparacion: deReparacion.filter(e => e.kind === 'FOTO').map(e => e.url),
      videosReparacion: deReparacion.filter(e => e.kind === 'VIDEO').map(e => e.url),
      documentosReparacion: deReparacion.filter(e => e.kind === 'DOCUMENTO').map(comoAdjunto),
      fechaSolucion: item.fechaSolucion ? fechaLocal(item.fechaSolucion) : undefined,
      solucionadoPor: resNombre,
      observacionSolucion: item.solucion || item.observacionSolucion,
      // --- Trazabilidad ---
      noAtendida: item.noAtendida === true,
      maquinariaId: item.maquinariaId || item.maquinaria?.id,
      maquinariaCodigo: item.maquinaria?.codigo,
      regionId: item.maquinaria?.agencia?.regionId || undefined,
      titulo: item.titulo,
      gravedadRaw,
      estadoRaw,
      destinoTallerNombre: item.destinoTaller?.nombre,
      fechaReporteIso: fechaReporte,
      evidencias,
    };
  }

  /**
   * Una página de incidencias con orden, búsqueda y filtros en el servidor. El backend ya las devuelve agrupadas
   * (no atendidas, en proceso, cerradas) cuando no hay `sortField`: NO se reordenan en el cliente.
   * NO toca `incidentesSubject` y propaga los errores (la pantalla muestra "Reintentar").
   */
  getIncidentesPagina(consulta: ConsultaIncidentes = {}): Observable<RespuestaIncidentesPagina> {
    const body: Record<string, unknown> = {};
    const c = consulta;
    body['page'] = c.page || 1;
    body['pageSize'] = Math.min(c.pageSize || PAGE_SIZE_TABLA, PAGE_SIZE_MAX);
    if (c.sortField) { body['sortField'] = c.sortField; body['sortOrder'] = c.sortOrder || 'desc'; }
    const texto = (c.search || '').trim();
    if (texto.length >= BUSQUEDA_MIN_CARACTERES) body['search'] = texto;
    const claves: (keyof ConsultaIncidentes)[] = ['maquinariaId', 'estado', 'gravedad', 'tecnicoId', 'agenciaId', 'regionId', 'clienteId', 'fechaDesde', 'fechaHasta'];
    for (const k of claves) {
      const v = c[k];
      if (v !== undefined && v !== null && v !== '') body[k] = v;
    }
    if (c.soloNoAtendidas) body['soloNoAtendidas'] = true;
    if (c.incluirResumen) body['incluirResumen'] = true;

    return this.http.post<any>(apiUrl('/maquinaria/incidentes/list'), body).pipe(
      map(res => {
        const pagina = normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number);
        return {
          pagina: { ...pagina, items: pagina.items.map((item: any) => this.mapBackendIncidente(item)) as Incidente[] },
          resumen: res?.resumen as ResumenIncidentes | undefined,
        };
      }),
    );
  }

  /** Lista plana (hasta 100, el máximo por petición) para pantallas que aún no paginan. Ante un error conserva lo último. */
  getIncidentes(filtro: ConsultaIncidentes = {}): Observable<Incidente[]> {
    return this.getIncidentesPagina({ ...filtro, pageSize: PAGE_SIZE_MAX }).pipe(
      map(r => r.pagina.items),
      tap(items => this.incidentesSubject.next(items)),
      catchError(() => of(this.incidentesSubject.value))
    );
  }

  /** Reporta una incidencia (solo pulidores o líderes sobre máquinas asignadas; requiere conexión). */
  reportarIncidente(payload: ReportarIncidentePayload): Observable<Incidente> {
    return this.http.post<any>(apiUrl('/maquinaria/incidentes/reportar'), payload).pipe(
      map(res => this.mapBackendIncidente(res?.data || res)),
      tap(nuevo => this.incidentesSubject.next([nuevo, ...this.incidentesSubject.value]))
    );
  }

  /** Compatibilidad con pantallas antiguas (servicios): arma el payload nuevo desde el modelo de UI. */
  crearIncidente(inc: Omit<Incidente, 'id'>): Observable<Incidente> {
    const gravedad = inc.prioridad === 'Crítica' ? 'CRITICA' : inc.prioridad === 'Alta' ? 'ALTA' : inc.prioridad === 'Baja' ? 'BAJA' : 'MEDIA';
    const anyInc = inc as any;
    const evidencias: EvidenciaInput[] = anyInc.evidenciasSubidas || [
      ...(inc.fotosFallo || []).map(url => ({ tipo: 'FOTO_INCIDENTE', url })),
      ...(inc.videosFallo || []).map(url => ({ tipo: 'VIDEO_INCIDENTE', url })),
    ].filter(e => e.url && !e.url.startsWith('blob:'));
    return this.reportarIncidente({
      clientUuid: anyInc.clientUuid,
      maquinariaId: String(anyInc.maquinariaId || inc.maquinariaId || inc.maquina || ''),
      titulo: inc.tipo || 'Falla técnica',
      descripcion: inc.descripcion || '',
      gravedad,
      evidencias,
    });
  }

  /** Asigna la incidencia. Sin tecnicoId se auto-asigna el coordinador que llama. */
  asignarIncidente(incidenteId: string | number, tecnicoId?: string | number, destinoTallerId?: string): Observable<Incidente> {
    return this.http.post<any>(apiUrl('/maquinaria/incidentes/asignar'), {
      incidenteId: String(incidenteId),
      tecnicoId: tecnicoId != null && tecnicoId !== '' ? String(tecnicoId) : undefined,
      destinoTallerId: destinoTallerId || undefined,
    }).pipe(map(res => this.mapBackendIncidente(res?.data || res)));
  }

  /** Resuelve (RESUELTO) o cancela (CANCELADO) la incidencia. RESUELTO exige 1+ foto/video y 1 PDF. */
  resolverIncidente(payload: {
    incidenteId: string | number;
    solucion: string;
    estado?: 'RESUELTO' | 'CANCELADO';
    repuestosUtilizados?: string;
    evidencias: EvidenciaInput[];
  }): Observable<Incidente> {
    return this.http.post<any>(apiUrl('/maquinaria/incidentes/resolver'), {
      ...payload,
      incidenteId: String(payload.incidenteId),
      estado: payload.estado || 'RESUELTO',
    }).pipe(map(res => this.mapBackendIncidente(res?.data || res)));
  }

  /** Edita la incidencia; el backend deja un evento con antes/después. */
  editarIncidente(payload: {
    incidenteId: string | number;
    titulo?: string;
    descripcion?: string;
    gravedad?: GravedadIncidente | string;
    solucion?: string;
  }): Observable<Incidente> {
    return this.http.post<any>(apiUrl('/maquinaria/incidentes/editar'), {
      ...payload,
      incidenteId: String(payload.incidenteId),
    }).pipe(map(res => this.mapBackendIncidente(res?.data || res)));
  }

  /** Agrega (o reemplaza, ocultando la anterior) evidencias a una incidencia o mantenimiento. Nunca se borra. */
  agregarEvidencia(payload: {
    entidad: 'INCIDENTE' | 'MANTENIMIENTO';
    entidadId: string | number;
    etapa?: 'REPORTE' | 'REPARACION';
    evidencias: EvidenciaInput[];
    reemplazaEvidenciaId?: string;
  }): Observable<any> {
    return this.http.post<any>(apiUrl('/maquinaria/evidencias/agregar'), {
      ...payload,
      entidadId: String(payload.entidadId),
    });
  }
}

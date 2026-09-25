import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Incidente, ArchivoAdjunto, PaginaResultado, nombrePersona } from '../models';
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

export interface IncidenteFiltro {
  maquinariaId?: string;
  estado?: string;
  gravedad?: string;
  agenciaId?: string;
  soloNoAtendidas?: boolean;
  page?: number;
  pageSize?: number;
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
    const agNombre = item.maquinaria?.agencia?.nombre || item.agencia || 'Taller Central';
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
   * Lista de incidencias. El backend ya las devuelve ordenadas (no atendidas primero, luego en proceso, luego
   * cerradas): NO se reordenan en el cliente.
   */
  getIncidentesPagina(filtro: IncidenteFiltro = {}): Observable<PaginaResultado<Incidente>> {
    return this.http.post<any>(apiUrl('/maquinaria/incidentes/list'), { pageSize: 200, ...filtro }).pipe(
      map(res => {
        const rawItems = Array.isArray(res) ? res : (res?.data || []);
        return {
          data: rawItems.map((item: any) => this.mapBackendIncidente(item)) as Incidente[],
          total: Number(res?.total ?? rawItems.length),
          page: Number(res?.page ?? 1),
          pageSize: Number(res?.pageSize ?? rawItems.length),
        };
      })
    );
  }

  getIncidentes(filtro?: IncidenteFiltro): Observable<Incidente[]> {
    return this.getIncidentesPagina(filtro || {}).pipe(
      map(p => p.data),
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

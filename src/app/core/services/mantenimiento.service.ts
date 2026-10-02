import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Mantenimiento, ArchivoAdjunto, nombrePersona } from '../models';
import { PaginaServidor, OrdenDir, normalizarPagina } from '../models/paginacion.model';
import { PAGE_SIZE_MAX, PAGE_SIZE_TABLA, BUSQUEDA_MIN_CARACTERES } from '../config/paginacion';
import { apiUrl } from '../config/env';
import { EvidenciaInput } from './incidente.service';
import { mapEvidenciasMaquinaria, fechaProgramadaISO, fechaISOLocal, fechaHoraLocal } from '../utils/evidencia-maquinaria';

/** Consulta paginada de mantenimientos: todo (orden, búsqueda y filtros) se resuelve en el servidor. */
export interface ConsultaMantenimientos {
  page?: number;
  pageSize?: number;
  /** fecha (programada) | ejecucion | estado | tipo | maquina | agencia | tecnico. Sin él: vencidos, pendientes, ejecutados. */
  sortField?: string | null;
  sortOrder?: OrdenDir;
  search?: string;
  maquinariaId?: string;
  tecnicoId?: string;
  tipo?: string;
  /** PENDIENTE | EN_PROCESO | FINALIZADO */
  estado?: string;
  agenciaId?: string;
  regionId?: string;
  clienteId?: string;
  soloNoAtendidos?: boolean;
  /** AAAA-MM-DD o ISO (por fecha programada). */
  fechaDesde?: string;
  fechaHasta?: string;
  incluirResumen?: boolean;
}

export interface ResumenMantenimientos {
  vencidos: number;
  pendientes: number;
  ejecutados: number;
  total: number;
}

export interface RespuestaMantenimientosPagina {
  pagina: PaginaServidor<Mantenimiento>;
  resumen?: ResumenMantenimientos;
}

/** Programación de un mantenimiento (POST /maquinaria/mantenimientos/registrar). */
export interface ProgramarMantenimientoPayload {
  maquinariaId: string;
  tecnicoId?: string;
  tipo: 'PREVENTIVO' | 'CORRECTIVO';
  observaciones: string;
  /** YYYY-MM-DD */
  fechaProgramada?: string;
  frecuenciaDias?: number;
  repuestosUsados?: any;
  costoTotal?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MantenimientoService {
  private http = inject(HttpClient);
  private mantenimientosSubject = new BehaviorSubject<Mantenimiento[]>([]);
  public mantenimientos$ = this.mantenimientosSubject.asObservable();

  private mapBackendMantenimiento(m: any): Mantenimiento {
    const maquinaNombre = m.maquinaria?.nombre || m.maquinaria?.codigo || m.maquina || 'Equipo';
    const tecnicoNombre = m.tecnico ? nombrePersona(m.tecnico) : (m.tecnicoNombre || 'Sin asignar');
    const programada = m.fechaProgramada || m.fechaMantenimiento || m.createdAt;
    const fechaStr = programada ? fechaProgramadaISO(programada) : fechaISOLocal(new Date().toISOString());
    const proximo = m.proximoMantenimiento ? fechaProgramadaISO(m.proximoMantenimiento) : undefined;
    const evidencias = mapEvidenciasMaquinaria(m.evidencias);
    const estadoRaw = String(m.estado || '');
    const tipoRaw = String(m.tipo || '');
    const documentos: ArchivoAdjunto[] = evidencias.filter(e => e.kind === 'DOCUMENTO').map(e => ({
      id: e.id,
      nombre: e.descripcion || 'Documento',
      tipo: 'documento' as const,
      url: e.url,
      tamanoBytes: e.tamanoBytes,
    }));

    return {
      id: m.id,
      maquinariaId: m.maquinariaId || m.maquinaria?.id,
      frecuenciaDias: Number(m.frecuenciaDias || 0),
      proximoMantenimiento: proximo,
      maquina: maquinaNombre,
      tipo: tipoRaw === 'CALIBRACION' || tipoRaw === 'Calibración' ? 'Calibración' : (tipoRaw === 'CORRECTIVO' ? 'Correctivo' : 'Preventivo'),
      fecha: fechaStr,
      tecnico: tecnicoNombre,
      estado: estadoRaw === 'FINALIZADO' ? 'Completado' : (estadoRaw === 'EN_PROCESO' ? 'En Proceso' : (estadoRaw === 'CANCELADO' ? 'Cancelado' : 'Programado')),
      descripcion: m.observaciones || m.descripcion || '',
      agencia: m.maquinaria?.agencia?.nombre || 'Taller Central',
      tecnicoAsignadoId: m.tecnicoId || m.tecnico?.id || m.tecnicoAsignadoId,
      tecnicoAsignadoNombre: tecnicoNombre,
      observacionCierre: m.observaciones,
      repuestosUtilizados: Array.isArray(m.repuestosUsados) ? m.repuestosUsados.map((r: any) => typeof r === 'string' ? r : (r?.nombre || JSON.stringify(r))) : undefined,
      costoTotal: m.costoTotal != null ? Number(m.costoTotal) : undefined,
      fotos: evidencias.filter(e => e.kind === 'FOTO').map(e => e.url),
      videos: evidencias.filter(e => e.kind === 'VIDEO').map(e => e.url),
      documentos,
      // --- Trazabilidad ---
      noAtendido: m.noAtendido === true,
      maquinariaCodigo: m.maquinaria?.codigo,
      regionId: m.maquinaria?.agencia?.regionId || undefined,
      estadoRaw,
      tipoRaw,
      fechaProgramada: m.fechaProgramada || m.fechaMantenimiento || undefined,
      fechaEjecucion: m.fechaEjecucion || undefined,
      fechaFin: m.fechaEjecucion ? fechaISOLocal(m.fechaEjecucion) : undefined,
      fechaCierre: m.fechaEjecucion ? fechaHoraLocal(m.fechaEjecucion) : undefined,
      creadoPorNombre: m.creadoPor ? nombrePersona(m.creadoPor) : undefined,
      ejecutadoPorNombre: m.ejecutadoPor ? nombrePersona(m.ejecutadoPor) : undefined,
      cerradoPor: m.ejecutadoPor ? nombrePersona(m.ejecutadoPor) : undefined,
      repuestosUsadosRaw: m.repuestosUsados,
      evidencias,
    };
  }

  /**
   * Una página de mantenimientos con orden, búsqueda y filtros en el servidor. Sin `sortField` el backend los
   * agrupa (vencidos, pendientes, ejecutados): NO se reordenan en el cliente.
   * NO toca `mantenimientosSubject` y propaga los errores (la pantalla muestra "Reintentar").
   */
  getMantenimientosPagina(consulta: ConsultaMantenimientos = {}): Observable<RespuestaMantenimientosPagina> {
    const body: Record<string, unknown> = {};
    const c = consulta;
    body['page'] = c.page || 1;
    body['pageSize'] = Math.min(c.pageSize || PAGE_SIZE_TABLA, PAGE_SIZE_MAX);
    if (c.sortField) { body['sortField'] = c.sortField; body['sortOrder'] = c.sortOrder || 'desc'; }
    const texto = (c.search || '').trim();
    if (texto.length >= BUSQUEDA_MIN_CARACTERES) body['search'] = texto;
    const claves: (keyof ConsultaMantenimientos)[] = ['maquinariaId', 'tecnicoId', 'tipo', 'estado', 'agenciaId', 'regionId', 'clienteId', 'fechaDesde', 'fechaHasta'];
    for (const k of claves) {
      const v = c[k];
      if (v !== undefined && v !== null && v !== '') body[k] = v;
    }
    if (c.soloNoAtendidos) body['soloNoAtendidos'] = true;
    if (c.incluirResumen) body['incluirResumen'] = true;

    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/list'), body).pipe(
      map(res => {
        const pagina = normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number);
        return {
          pagina: { ...pagina, items: pagina.items.map((item: any) => this.mapBackendMantenimiento(item)) as Mantenimiento[] },
          resumen: res?.resumen as ResumenMantenimientos | undefined,
        };
      }),
    );
  }

  /** Lista plana (hasta 100, el máximo por petición) para pantallas que aún no paginan. Ante un error conserva lo último. */
  getMantenimientos(dto: ConsultaMantenimientos = {}): Observable<Mantenimiento[]> {
    return this.getMantenimientosPagina({ ...dto, pageSize: PAGE_SIZE_MAX }).pipe(
      map(r => r.pagina.items),
      tap(items => this.mantenimientosSubject.next(items)),
      catchError(() => of(this.mantenimientosSubject.value))
    );
  }

  /** Programa un mantenimiento (COORD_MANTENIMIENTO, ADMIN, SUPER_ADMIN). */
  programarMantenimiento(payload: ProgramarMantenimientoPayload): Observable<Mantenimiento> {
    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/registrar'), payload).pipe(
      map(res => this.mapBackendMantenimiento(res?.data || res)),
      tap(nuevo => this.mantenimientosSubject.next([nuevo, ...this.mantenimientosSubject.value]))
    );
  }

  /** Asigna el mantenimiento. Sin tecnicoId se auto-asigna el coordinador. */
  asignarMantenimiento(mantenimientoId: string | number, tecnicoId?: string | number): Observable<Mantenimiento> {
    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/asignar'), {
      mantenimientoId: String(mantenimientoId),
      tecnicoId: tecnicoId != null && tecnicoId !== '' ? String(tecnicoId) : undefined,
    }).pipe(map(res => this.mapBackendMantenimiento(res?.data || res)));
  }

  /**
   * Ejecuta el mantenimiento (técnico asignado). El backend BLOQUEA con 400 si falta más que la ventana de adelanto:
   * el error se propaga tal cual para mostrar su mensaje.
   */
  ejecutarMantenimiento(
    mantenimientoId: string | number,
    payload: { observaciones?: string; costoTotal: number; evidencias: EvidenciaInput[] },
  ): Observable<Mantenimiento> {
    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/ejecutar'), {
      mantenimientoId: String(mantenimientoId),
      observaciones: payload.observaciones?.trim() || undefined,
      costoTotal: payload.costoTotal,
      evidencias: payload.evidencias,
    }).pipe(map(res => this.mapBackendMantenimiento(res?.data || res)));
  }

  editarMantenimiento(payload: {
    mantenimientoId: string | number;
    tipo?: 'PREVENTIVO' | 'CORRECTIVO';
    observaciones?: string;
    repuestosUsados?: any;
    costoTotal?: number;
    fechaProgramada?: string;
    frecuenciaDias?: number;
  }): Observable<Mantenimiento> {
    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/editar'), {
      ...payload,
      mantenimientoId: String(payload.mantenimientoId),
    }).pipe(map(res => this.mapBackendMantenimiento(res?.data || res)));
  }
}

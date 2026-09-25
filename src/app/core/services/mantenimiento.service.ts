import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Mantenimiento, ArchivoAdjunto, PaginaResultado, nombrePersona } from '../models';
import { apiUrl } from '../config/env';
import { EvidenciaInput } from './incidente.service';
import { mapEvidenciasMaquinaria, fechaProgramadaISO, fechaISOLocal, fechaHoraLocal } from '../utils/evidencia-maquinaria';

export interface MantenimientoFiltro {
  maquinariaId?: string;
  tecnicoId?: string;
  tipo?: string;
  estado?: string;
  agenciaId?: string;
  soloNoAtendidos?: boolean;
  page?: number;
  pageSize?: number;
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
   * Lista de mantenimientos. El backend ya los devuelve ordenados (vencidos primero): NO se reordenan en el cliente.
   */
  getMantenimientosPagina(filtro: MantenimientoFiltro = {}): Observable<PaginaResultado<Mantenimiento>> {
    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/list'), { pageSize: 200, ...filtro }).pipe(
      map(res => {
        const rawItems = Array.isArray(res) ? res : (res?.data || []);
        return {
          data: rawItems.map((item: any) => this.mapBackendMantenimiento(item)) as Mantenimiento[],
          total: Number(res?.total ?? rawItems.length),
          page: Number(res?.page ?? 1),
          pageSize: Number(res?.pageSize ?? rawItems.length),
        };
      })
    );
  }

  getMantenimientos(dto?: MantenimientoFiltro): Observable<Mantenimiento[]> {
    return this.getMantenimientosPagina(dto || {}).pipe(
      map(p => p.data),
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
    payload: { observaciones?: string; evidencias: EvidenciaInput[] },
  ): Observable<Mantenimiento> {
    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/ejecutar'), {
      mantenimientoId: String(mantenimientoId),
      observaciones: payload.observaciones?.trim() || undefined,
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

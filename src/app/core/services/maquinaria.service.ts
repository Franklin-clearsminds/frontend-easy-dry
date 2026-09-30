import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  Maquinaria,
  MaquinaFicha,
  MaquinariaEvento,
  HistorialFiltro,
  TallerUbicacion,
  nombrePersona,
} from '../models';
import { apiUrl } from '../config/env';
import { ConsultaTabla, PaginaServidor, normalizarPagina } from '../models/paginacion.model';
import { cuerpoConsulta } from '../utils/tabla-servidor';
import { PAGE_SIZE_INFINITO, PAGE_SIZE_MAX } from '../config/paginacion';

/** Filtros de POST /maquinaria/list (cada rol ve solo lo suyo: lo filtra el backend). */
/** Consulta de la lista de equipos: la de la tabla más los filtros por nombre que emite el filter-bar. */
export interface ConsultaMaquinaria extends Partial<ConsultaTabla> {
  agenciaNombre?: string;
  bahiaNombre?: string;
  regionNombre?: string;
  clienteNombre?: string;
  agenciaId?: string;
  bahiaId?: string;
  tipo?: string;
  estadoOperativo?: string;
  activa?: boolean;
  operadorAsignadoId?: string;
}

export interface MaquinariaFiltro {
  agenciaId?: string;
  bahiaId?: string;
  tipo?: string;
  estadoOperativo?: string;
  search?: string;
  activa?: boolean;
  operadorAsignadoId?: string;
}

/** Campos editables en POST /maquinaria/update (ya NO cambia agencia/bahía: eso es /transferir). */
export interface MaquinariaEdicion {
  nombre?: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  fotoUrl?: string;
  fichaTecnicaUrl?: string;
  horasUso?: number;
  ventanaAdelantoDias?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MaquinariaService {
  private http = inject(HttpClient);
  private maquinariaSubject = new BehaviorSubject<Maquinaria[]>([]);
  public maquinaria$ = this.maquinariaSubject.asObservable();

  private mapBackendMaquinaria(m: any): Maquinaria {
    const activa = m.activa !== false;
    const estadoOperativo: string = m.estadoOperativo || 'OPERATIVA';
    const estadoUi = !activa || estadoOperativo === 'DE_BAJA'
      ? 'Fuera de Servicio'
      : estadoOperativo === 'EN_MANTENIMIENTO'
        ? 'Mantenimiento'
        : (m.estado || 'Operativa');
    return {
      id: m.id,
      codigo: m.codigo || '',
      nombre: m.nombre || '',
      tipo: m.tipo || 'General',
      marca: m.marca || '',
      modelo: m.modelo || '',
      numeroSerie: m.numeroSerie || m.serie || '',
      agencia: m.agencia?.nombre || 'Sin Agencia',
      bahia: m.bahia?.nombre || 'Sin Bahía',
      sucursalId: m.agenciaId || m.agencia?.id,
      sucursalNombre: m.agencia?.nombre,
      bahiaId: m.bahiaId || m.bahia?.id,
      bahiaNombre: m.bahia?.nombre,
      estado: estadoUi,
      fechaMantenimiento: m.mantenimientos?.[0]?.fechaRealizado || '',
      imagen: m.fotoUrl || '',
      fichaTecnicaUrl: m.fichaTecnicaUrl || '',
      horasUso: m.horasUso || 0,
      activa,
      estadoOperativo,
      regionId: m.agencia?.regionId || undefined,
      agenciaTipo: m.agencia?.tipoUbicacion || undefined,
      operadorAsignadoId: m.operadorAsignado?.id || m.operadorAsignadoId || undefined,
      operadorAsignadoNombre: m.operadorAsignado ? nombrePersona(m.operadorAsignado) : undefined,
      operadorResponsable: m.operadorAsignado ? nombrePersona(m.operadorAsignado) : undefined,
      ventanaAdelantoDias: Number(m.ventanaAdelantoDias ?? 0),
      incidentesNoAtendidos: Number(m.incidentesNoAtendidos ?? 0),
      mantenimientosVencidos: Number(m.mantenimientosVencidos ?? 0),
      proximoMantenimiento: m.proximoMantenimiento || null,
    };
  }

  private mapFicha(m: any): MaquinaFicha {
    const persona = (u: any) => (u ? { id: u.id, nombre: nombrePersona(u) } : null);
    return {
      id: m.id,
      codigo: m.codigo || '',
      nombre: m.nombre || '',
      tipo: m.tipo,
      marca: m.marca,
      modelo: m.modelo,
      serie: m.serie,
      estadoOperativo: m.estadoOperativo || 'OPERATIVA',
      activa: m.activa !== false,
      fotoUrl: m.fotoUrl,
      fichaTecnicaUrl: m.fichaTecnicaUrl,
      horasUso: m.horasUso,
      ventanaAdelantoDias: Number(m.ventanaAdelantoDias ?? 0),
      agenciaId: m.agenciaId || m.agencia?.id,
      agenciaNombre: m.agencia?.nombre,
      agenciaTipo: m.agencia?.tipoUbicacion,
      regionId: m.agencia?.regionId,
      bahiaId: m.bahiaId || m.bahia?.id,
      bahiaNombre: m.bahia?.nombre,
      operadorAsignado: persona(m.operadorAsignado),
      creadoPor: persona(m.creadoPor),
      creadaEn: m.createdAt,
      desactivadoPor: persona(m.desactivadoPor),
      fechaDesactivacion: m.fechaDesactivacion || null,
      motivoDesactivacion: m.motivoDesactivacion || null,
      proximoMantenimiento: m.proximoMantenimiento
        ? {
            id: m.proximoMantenimiento.id,
            fechaProgramada: m.proximoMantenimiento.fechaProgramada || null,
            tipo: m.proximoMantenimiento.tipo,
            estado: m.proximoMantenimiento.estado,
          }
        : null,
      incidentesNoAtendidos: Number(m.incidentesNoAtendidos ?? 0),
      mantenimientosVencidos: Number(m.mantenimientosVencidos ?? 0),
      totales: {
        incidentes: Number(m.totales?.incidentes ?? 0),
        mantenimientos: Number(m.totales?.mantenimientos ?? 0),
        movimientos: Number(m.totales?.movimientos ?? 0),
      },
    };
  }

  /** Lista de máquinas visibles para el rol actual (el backend aplica el alcance). */
  getMaquinaria(filtro: MaquinariaFiltro = {}): Observable<Maquinaria[]> {
    return this.http.post<any>(apiUrl('/maquinaria/list'), filtro).pipe(
      map(res => {
        const items = Array.isArray(res) ? res : (res?.data || []);
        return items.map((m: any) => this.mapBackendMaquinaria(m));
      }),
      tap(mapped => this.maquinariaSubject.next(mapped)),
      catchError(() => of(this.maquinariaSubject.value))
    );
  }

  /**
   * Una página de equipos con búsqueda y filtros en el servidor (orden: codigo, nombre, tipo, estado, agencia, bahia, fecha).
   * No toca la caché ni captura errores: la pantalla muestra el suyo.
   */
  getMaquinariaPagina(c: ConsultaMaquinaria): Observable<PaginaServidor<Maquinaria>> {
    const body = cuerpoConsulta(c, [
      'agenciaNombre', 'bahiaNombre', 'regionNombre', 'clienteNombre', 'agenciaId', 'bahiaId', 'tipo', 'estadoOperativo', 'activa', 'operadorAsignadoId',
    ]);
    return this.http.post<any>(apiUrl('/maquinaria/list'), body).pipe(
      map((res) => {
        const pagina = normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number);
        return { ...pagina, items: pagina.items.map((m: any) => this.mapBackendMaquinaria(m)) };
      }),
    );
  }

  /** Ficha completa: máquina + creada por, desactivación, operador, próximo mantenimiento y totales. */
  getDetalle(id: string | number): Observable<MaquinaFicha> {
    return this.http.post<any>(apiUrl('/maquinaria/detalle'), { id: String(id) }).pipe(
      map(res => this.mapFicha(res?.data || res))
    );
  }

  /** Reemplaza una máquina en la caché local tras una acción (evita recargar toda la lista). */
  private refrescarLocal(m: Maquinaria): void {
    const current = this.maquinariaSubject.value;
    const idx = current.findIndex(x => String(x.id) === String(m.id));
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...m };
      this.maquinariaSubject.next([...current]);
    }
  }

  crearMaquinaria(maquina: Omit<Maquinaria, 'id'>): Observable<Maquinaria> {
    const slug = (maquina.nombre || 'MQ').substring(0, 3).toUpperCase();
    const codigo = maquina.codigo?.trim() || `MQ-${slug}-${Date.now().toString().slice(-4)}`;
    return this.http.post<any>(apiUrl('/maquinaria/create'), {
      codigo,
      nombre: maquina.nombre,
      tipo: maquina.tipo || 'HIDROLAVADORA',
      marca: maquina.marca,
      modelo: maquina.modelo,
      serie: maquina.numeroSerie || codigo,
      agenciaId: maquina.sucursalId ? String(maquina.sucursalId) : undefined,
      bahiaId: maquina.bahiaId ? String(maquina.bahiaId) : undefined,
      estadoOperativo: maquina.estado === 'Mantenimiento' ? 'EN_MANTENIMIENTO' : 'OPERATIVA',
      fotoUrl: maquina.imagen || undefined,
      fichaTecnicaUrl: maquina.fichaTecnicaUrl || undefined,
    }).pipe(
      map(res => this.mapBackendMaquinaria(res?.data || res)),
      tap(nueva => {
        const current = this.maquinariaSubject.value;
        this.maquinariaSubject.next([...current, nueva]);
      }),
      catchError(err => {
        console.error('Error al crear maquinaria:', err);
        throw err;
      })
    );
  }

  /** Edita datos de la máquina (ADMIN / SUPER_ADMIN). No cambia agencia/bahía ni pone DE_BAJA. */
  actualizarMaquina(id: string | number, cambios: MaquinariaEdicion): Observable<Maquinaria> {
    return this.http.post<any>(apiUrl('/maquinaria/update'), { id: String(id), ...cambios }).pipe(
      map(res => this.mapBackendMaquinaria(res?.data || res)),
      tap(act => this.refrescarLocal(act))
    );
  }

  /** Activar o desactivar (dar de baja, reversible). El motivo es obligatorio al desactivar. */
  setActiva(maquinariaId: string | number, activa: boolean, motivo?: string): Observable<Maquinaria> {
    return this.http.post<any>(apiUrl('/maquinaria/activar'), {
      maquinariaId: String(maquinariaId),
      activa,
      motivo: motivo?.trim() || undefined,
    }).pipe(
      map(res => this.mapBackendMaquinaria(res?.data || res)),
      tap(act => this.refrescarLocal(act))
    );
  }

  /** Asigna (o quita con null) el operador responsable: usuario con rol PULIDOR* o LIDER*. */
  asignarOperador(maquinariaId: string | number, operadorId: string | null): Observable<Maquinaria> {
    return this.http.post<any>(apiUrl('/maquinaria/asignar-operador'), {
      maquinariaId: String(maquinariaId),
      operadorId,
    }).pipe(
      map(res => this.mapBackendMaquinaria(res?.data || res)),
      tap(act => this.refrescarLocal(act))
    );
  }

  /** Cuánto se puede adelantar un mantenimiento (días + semanas). */
  configurarVentanaAdelanto(maquinariaId: string | number, dias?: number, semanas?: number): Observable<any> {
    return this.http.post<any>(apiUrl('/maquinaria/ventana-adelanto'), {
      maquinariaId: String(maquinariaId),
      dias,
      semanas,
    });
  }

  /**
   * Línea de tiempo de la máquina (ADMIN, SUPER_ADMIN, COORD_MANTENIMIENTO), una página por petición (scroll infinito).
   * Propaga los errores para que la lista muestre "Reintentar".
   */
  getHistorial(filtro: HistorialFiltro): Observable<PaginaServidor<MaquinariaEvento>> {
    const page = filtro.page || 1;
    const pageSize = Math.min(filtro.pageSize || PAGE_SIZE_INFINITO, PAGE_SIZE_MAX);
    return this.http.post<any>(apiUrl('/maquinaria/historial'), {
      ...filtro,
      page,
      pageSize,
      tipos: filtro.tipos?.length ? filtro.tipos : undefined,
      desde: filtro.desde || undefined,
      hasta: filtro.hasta || undefined,
    }).pipe(
      map(res => normalizarPagina<MaquinariaEvento>(res, page, pageSize)),
    );
  }

  /** Talleres (agencias con tipoUbicacion TALLER_*), destino válido de una transferencia. */
  getTalleres(): Observable<TallerUbicacion[]> {
    return this.http.post<any>(apiUrl('/maquinaria/talleres/list'), {}).pipe(
      map(res => (res?.data || []) as TallerUbicacion[]),
      catchError(() => of([]))
    );
  }

  asignarMaquinaria(maquinaId: number | string, sucursalNombre: string, bahiaNombre: string): Observable<Maquinaria | null> {
    const current = this.maquinariaSubject.value;
    const item = current.find(m => String(m.id) === String(maquinaId));
    if (item) {
      item.agencia = sucursalNombre;
      item.bahia = bahiaNombre;
      this.maquinariaSubject.next([...current]);
      return of(item);
    }
    return of(null);
  }

  actualizarFichaTecnica(id: string | number, fichaTecnicaUrl: string): Observable<Maquinaria | null> {
    return this.http.post<any>(apiUrl('/maquinaria/update'), {
      id: String(id),
      fichaTecnicaUrl,
    }).pipe(
      map(res => this.mapBackendMaquinaria(res?.data || res)),
      tap(act => this.refrescarLocal(act)),
      catchError(() => of(null)),
    );
  }

  /** Mueve la máquina a otra agencia, bahía (misma agencia) o taller. Solo coordinación / administración. */
  transferirMaquinaria(payload: {
    maquinariaId: string;
    destinoAgenciaId: string;
    destinoBahiaId?: string;
    motivo: string;
  }): Observable<any> {
    return this.http.post<any>(apiUrl('/maquinaria/transferir'), payload);
  }
}

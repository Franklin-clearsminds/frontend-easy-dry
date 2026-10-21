import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { apiUrl } from '../config/env';
import { NuevoReto, PersonaReto, RankingReto, Reto } from '../models/reto.model';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';

/** Lo que pide el directorio de retos: la de la tabla más la vigencia. */
export interface ConsultaRetos extends Partial<ConsultaTabla> {
  vigencia?: 'ACTIVOS' | 'VENCIDOS' | 'TODOS';
}

const PARTICIPANTES = ['AGENCIA', 'BAHIA', 'LAVADOR', 'PULIDOR'];
const TIPOS_SERVICIO = ['TODOS', 'GENERALES', 'ESPECIALES', 'ESPECIFICOS'];
const METRICAS = ['SERVICIOS', 'AUTOS', 'MONTO'];

@Injectable({
  providedIn: 'root'
})
export class RetosService {
  private http = inject(HttpClient);

  getAllRetos(): Observable<Reto[]> {
    return this.list({ incluirTodos: true, soloActivos: false });
  }

  /**
   * Una página de retos para el directorio: búsqueda por título, vigencia (ACTIVOS, VENCIDOS o TODOS) y orden en el servidor
   * (titulo, inicio, fin, estado, fecha). La visibilidad por rol la aplica el servidor. No captura errores: la tabla muestra el suyo.
   */
  getRetosPagina(c: ConsultaRetos): Observable<PaginaConResumen<Reto>> {
    return postPagina<Reto>(this.http, apiUrl('/retos/list'), cuerpoConsulta(c, ['vigencia']), (item) => this.mapReto(item));
  }

  getRetosVisibles(): Observable<Reto[]> {
    return this.list({ soloActivos: true });
  }

  crearReto(nuevo: NuevoReto): Observable<Reto> {
    const payload: NuevoReto = {
      ...nuevo,
      titulo: nuevo.titulo.trim(),
      descripcion: nuevo.descripcion.trim(),
      premio: nuevo.premio.trim(),
      catalogoServicioIds: nuevo.tipoServicios === 'ESPECIFICOS' ? nuevo.catalogoServicioIds : [],
      pulidoresIds: nuevo.tipoReto === 'PULIDOR' ? nuevo.pulidoresIds : [],
      lavadoresIds: nuevo.tipoReto === 'LAVADOR' ? nuevo.lavadoresIds : [],
      cantidadGanadores: nuevo.modoGanador === 'RANKING' ? nuevo.cantidadGanadores : undefined,
      meta: nuevo.modoGanador === 'META' ? nuevo.meta : undefined,
    };
    return this.http.post<any>(apiUrl('/retos/create'), payload).pipe(
      map((item) => this.mapReto(item)),
    );
  }

  /** Lavadores o pulidores que quien crea el reto puede elegir (los de su alcance). */
  getPersonasReto(tipo: 'LAVADOR' | 'PULIDOR'): Observable<PersonaReto[]> {
    return this.http.post<PersonaReto[]>(apiUrl('/retos/personas'), { tipo });
  }

  getRankingReto(id: string): Observable<RankingReto> {
    return this.http.post<RankingReto>(apiUrl('/retos/ranking'), { id }).pipe(
      map((r) => ({
        ...r,
        meta: r?.meta != null ? Number(r.meta) : null,
        participantes: Array.isArray(r?.participantes) ? r.participantes.map((p) => ({ ...p, valor: Number(p.valor || 0) })) : [],
      })),
    );
  }

  eliminarReto(id: string): Observable<boolean> {
    return this.http.post<any>(apiUrl('/retos/delete'), { id }).pipe(
      map((response) => response?.success === true),
    );
  }

  /** Corrige título, descripción, premio y vigencia de un reto activo. */
  editarReto(id: string, datos: { titulo: string; descripcion: string; premio: string; fechaInicio: string; fechaFin: string }): Observable<Reto> {
    return this.http.post<any>(apiUrl('/retos/update'), { id, ...datos }).pipe(
      map((item) => this.mapReto(item)),
    );
  }

  /** Cierra el reto ya. El ganador no se elige: el servidor lo toma del ranking. */
  cerrarReto(id: string, datos: { resultado?: string }): Observable<Reto> {
    return this.http.post<any>(apiUrl('/retos/cerrar'), { id, ...datos }).pipe(
      map((item) => this.mapReto(item)),
    );
  }

  private list(body: { incluirTodos?: boolean; soloActivos?: boolean }): Observable<Reto[]> {
    return this.http.post<any>(apiUrl('/retos/list'), body).pipe(
      map((response) => (Array.isArray(response) ? response : response?.items || []).map((item: any) => this.mapReto(item))),
      catchError(() => of([])),
    );
  }

  private mapReto(item: any): Reto {
    const lista = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
    return {
      id: String(item.id),
      titulo: String(item.titulo || ''),
      descripcion: String(item.descripcion || ''),
      premio: String(item.premio || ''),
      fechaInicio: String(item.fechaInicio || '').slice(0, 10),
      fechaFin: String(item.fechaFin || '').slice(0, 10),
      regiones: lista(item.regiones),
      marcas: lista(item.marcas),
      sucursalesIds: lista(item.sucursalesIds),
      creadoPorId: String(item.creadoPorId || ''),
      creadorNombre: String(item.creadorNombre || ''),
      creadorRol: String(item.creadorRol || ''),
      estado: item.estado || 'ACTIVO',
      tipoReto: PARTICIPANTES.includes(item.tipoReto) ? item.tipoReto : 'AGENCIA',
      tipoServicios: TIPOS_SERVICIO.includes(item.tipoServicios) ? item.tipoServicios : 'TODOS',
      metrica: METRICAS.includes(item.metrica) ? item.metrica : 'SERVICIOS',
      modoGanador: item.modoGanador === 'META' ? 'META' : 'RANKING',
      cantidadGanadores: Number(item.cantidadGanadores) || 1,
      meta: item.meta != null ? Number(item.meta) : null,
      catalogoServicioIds: Array.isArray(item.catalogoServicioIds) ? item.catalogoServicioIds.map(Number) : [],
      catalogoServicioNombres: Array.isArray(item.catalogoServicios)
        ? item.catalogoServicios.map((servicio: any) => String(servicio.nombre))
        : [],
      pulidoresIds: lista(item.pulidoresIds),
      lavadoresIds: lista(item.lavadoresIds),
      ganadores: Array.isArray(item.ganadores)
        ? item.ganadores.map((g: any) => ({ participanteId: String(g.participanteId), nombre: String(g.nombre), valor: Number(g.valor || 0), posicion: Number(g.posicion) }))
        : [],
      ganadorNombre: item.ganadorNombre ? String(item.ganadorNombre) : undefined,
      resultado: item.resultado ? String(item.resultado) : undefined,
      cerradoPorId: item.cerradoPorId ? String(item.cerradoPorId) : undefined,
      cerradoEn: item.cerradoEn ? String(item.cerradoEn) : undefined,
    };
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { apiUrl } from '../config/env';
import { Reto } from '../models/reto.model';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';

/** Lo que pide el directorio de retos: la de la tabla más la vigencia. */
export interface ConsultaRetos extends Partial<ConsultaTabla> {
  vigencia?: 'ACTIVOS' | 'VENCIDOS' | 'TODOS';
}

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

  crearReto(nuevoReto: Partial<Reto>): Observable<Reto> {
    const payload = {
      titulo: String(nuevoReto.titulo || '').trim(),
      descripcion: String(nuevoReto.descripcion || '').trim(),
      premio: String(nuevoReto.premio || '').trim(),
      fechaInicio: nuevoReto.fechaInicio,
      fechaFin: nuevoReto.fechaFin,
      regiones: nuevoReto.regiones || [],
      marcas: nuevoReto.marcas || [],
      sucursalesIds: (nuevoReto.sucursalesIds || []).map(String),
      estado: nuevoReto.estado || 'ACTIVO',
      criterios: nuevoReto.criterios || [],
    };

    return this.http.post<any>(apiUrl('/retos/create'), payload).pipe(
      map((item) => this.mapReto(item)),
    );
  }

  eliminarReto(id: string): Observable<boolean> {
    return this.http.post<any>(apiUrl('/retos/delete'), { id }).pipe(
      map((response) => response?.success === true),
    );
  }

  private list(body: { incluirTodos?: boolean; soloActivos?: boolean }): Observable<Reto[]> {
    return this.http.post<any>(apiUrl('/retos/list'), body).pipe(
      map((response) => (Array.isArray(response) ? response : response?.items || []).map((item: any) => this.mapReto(item))),
      catchError(() => of([])),
    );
  }

  private mapReto(item: any): Reto {
    return {
      id: String(item.id),
      titulo: String(item.titulo || ''),
      descripcion: String(item.descripcion || ''),
      premio: String(item.premio || ''),
      fechaInicio: String(item.fechaInicio || '').slice(0, 10),
      fechaFin: String(item.fechaFin || '').slice(0, 10),
      regiones: Array.isArray(item.regiones) ? item.regiones.map(String) : [],
      marcas: Array.isArray(item.marcas) ? item.marcas.map(String) : [],
      sucursalesIds: Array.isArray(item.sucursalesIds) ? item.sucursalesIds.map(String) : [],
      creadoPorId: String(item.creadoPorId || ''),
      creadorNombre: String(item.creadorNombre || ''),
      creadorRol: String(item.creadorRol || ''),
      estado: item.estado || 'ACTIVO',
      criterios: Array.isArray(item.criterios) ? item.criterios.map(String) : [],
    };
  }
}

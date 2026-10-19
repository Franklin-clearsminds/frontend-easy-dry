import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from '../config/env';
import { FiltrosReporte, OpcionesReportes, ReporteCatalogo, ReporteGenerado } from '../models/reportes.model';

/**
 * Reportes Operativos. El servidor decide qué reportes ve cada rol (según sus módulos activos), filtra siempre dentro del alcance
 * del usuario y entrega los datos ya agrupados por agencia y periodo; aquí solo se piden y se descargan.
 */
@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);

  catalogo(): Observable<ReporteCatalogo[]> {
    return this.http.post<ReporteCatalogo[]>(apiUrl('/reportes/catalogo'), {});
  }

  /** `incluir`: listas largas que hacen falta además de regiones, clientes y agencias (sin él, el servidor devuelve todo). */
  opciones(incluir?: ('productos' | 'lavadores' | 'pulidores')[]): Observable<OpcionesReportes> {
    return this.http.post<OpcionesReportes>(apiUrl('/reportes/opciones'), incluir ? { incluir } : {});
  }

  generar(filtros: FiltrosReporte): Observable<ReporteGenerado> {
    return this.http.post<ReporteGenerado>(apiUrl('/reportes/generar'), filtros);
  }

  /** Deja constancia en la bitácora de que se exportó el reporte. */
  registrarExportacion(filtros: FiltrosReporte, formato: 'EXCEL' | 'PDF', totalFilas: number, documentoId?: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(apiUrl('/reportes/exportaciones'), { ...filtros, formato, totalFilas, ...(documentoId ? { documentoId } : {}) });
  }
}

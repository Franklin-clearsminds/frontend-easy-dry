import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { apiUrl } from '../config/env';
import {
  AccionCorrectiva,
  Auditoria5sDetalle,
  Auditoria5sFila,
  Catalogo5s,
  FilaComparacion,
  GuardarAuditoria5s,
  Opciones5s,
  Resumen5s,
} from '../models/auditorias.model';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';

export interface ConsultaAuditorias5s extends Partial<ConsultaTabla> {
  agenciaId?: string;
  auditorId?: string;
  area?: string;
  estado?: string;
  semaforo?: string;
  formato?: string;
  desde?: string;
  hasta?: string;
}

/** Todo contra el servidor. Los 20 criterios llegan del catálogo del backend (una sola copia). */
@Injectable({ providedIn: 'root' })
export class Auditoria5sService {
  private readonly http = inject(HttpClient);
  private readonly base = '/auditorias-5s';
  private catalogo$?: Observable<Catalogo5s>;

  getCatalogo(): Observable<Catalogo5s> {
    this.catalogo$ ??= this.http.post<Catalogo5s>(apiUrl(`${this.base}/catalogo`), {}).pipe(shareReplay(1));
    return this.catalogo$;
  }

  getPagina(c: ConsultaAuditorias5s): Observable<PaginaConResumen<Auditoria5sFila>> {
    return postPagina<Auditoria5sFila>(this.http, apiUrl(`${this.base}/list`), cuerpoConsulta(c, ['agenciaId', 'auditorId', 'area', 'formato', 'estado', 'semaforo', 'desde', 'hasta']));
  }

  getResumen(formato?: string): Observable<Resumen5s> {
    return this.http.post<Resumen5s>(apiUrl(`${this.base}/resumen`), formato ? { formato } : {});
  }

  getOpciones(): Observable<Opciones5s> {
    return this.http.post<Opciones5s>(apiUrl(`${this.base}/opciones`), {});
  }

  getDetalle(id: string): Observable<Auditoria5sDetalle> {
    return this.http.post<Auditoria5sDetalle>(apiUrl(`${this.base}/detail`), { id });
  }

  crear(datos: GuardarAuditoria5s): Observable<Auditoria5sDetalle> {
    return this.http.post<Auditoria5sDetalle>(apiUrl(`${this.base}/create`), datos);
  }

  actualizar(datos: GuardarAuditoria5s): Observable<Auditoria5sDetalle> {
    return this.http.post<Auditoria5sDetalle>(apiUrl(`${this.base}/update`), datos);
  }

  finalizar(id: string): Observable<Auditoria5sDetalle> {
    return this.http.post<Auditoria5sDetalle>(apiUrl(`${this.base}/finalizar`), { id });
  }

  cerrar(id: string): Observable<Auditoria5sDetalle> {
    return this.http.post<Auditoria5sDetalle>(apiUrl(`${this.base}/cerrar`), { id });
  }

  eliminar(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(apiUrl(`${this.base}/delete`), { id });
  }

  getAcciones(estado?: string, page = 1, pageSize = 25, agenciaId?: string): Observable<PaginaConResumen<AccionCorrectiva>> {
    const estadoLimpio = estado && estado !== 'Todas' && estado.trim() !== '' ? estado.trim() : undefined;
    return postPagina<AccionCorrectiva>(this.http, apiUrl(`${this.base}/acciones/list`), {
      ...(estadoLimpio ? { estado: estadoLimpio } : {}),
      page,
      pageSize,
      ...(agenciaId ? { agenciaId } : {})
    });
  }

  seguimientoAccion(id: string, estado: string, observaciones?: string, evidenciaCorreccion?: string[]): Observable<Auditoria5sDetalle> {
    return this.http.post<Auditoria5sDetalle>(apiUrl(`${this.base}/acciones/seguimiento`), { id, estado, observaciones, evidenciaCorreccion });
  }

  verificarAccion(id: string, decision: 'CERRAR' | 'DEVOLVER', motivo?: string): Observable<Auditoria5sDetalle> {
    return this.http.post<Auditoria5sDetalle>(apiUrl(`${this.base}/acciones/verificar`), { id, decision, motivo });
  }

  comparar(agenciaId: string, area: string | null, formato: string): Observable<FilaComparacion[]> {
    return this.http.post<FilaComparacion[]>(apiUrl(`${this.base}/comparar`), { agenciaId, ...(area ? { area } : {}), formato });
  }
}

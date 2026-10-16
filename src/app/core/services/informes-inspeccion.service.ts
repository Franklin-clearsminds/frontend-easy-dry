import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../config/env';
import {
  Destinatario,
  GuardarInforme,
  InformeDetalle,
  InformeFila,
  OpcionesInformes,
  PlanAccion,
  ResumenInformes,
} from '../models/auditorias.model';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';

export interface ConsultaInformes extends Partial<ConsultaTabla> {
  agenciaId?: string;
  inspectorId?: string;
  estado?: string;
  calificacion?: string;
  desde?: string;
  hasta?: string;
}

export type PlanConInforme = PlanAccion & { informeId: string; informeNumero: string; agenciaNombre: string };

/** Todo contra el servidor: no hay datos de ejemplo. El estado, las reglas y los permisos los resuelve el backend. */
@Injectable({ providedIn: 'root' })
export class InformesInspeccionService {
  private readonly http = inject(HttpClient);
  private readonly base = '/informes-inspeccion';

  getPagina(c: ConsultaInformes): Observable<PaginaConResumen<InformeFila>> {
    return postPagina<InformeFila>(this.http, apiUrl(`${this.base}/list`), cuerpoConsulta(c, ['agenciaId', 'inspectorId', 'estado', 'calificacion', 'desde', 'hasta']));
  }

  getResumen(): Observable<ResumenInformes> {
    return this.http.post<ResumenInformes>(apiUrl(`${this.base}/resumen`), {});
  }

  getOpciones(): Observable<OpcionesInformes> {
    return this.http.post<OpcionesInformes>(apiUrl(`${this.base}/opciones`), {});
  }

  getDestinatarios(): Observable<Destinatario[]> {
    return this.http.post<Destinatario[]>(apiUrl(`${this.base}/destinatarios`), {});
  }

  getPlanes(estado: string, page = 1, pageSize = 25): Observable<PaginaConResumen<PlanConInforme>> {
    return postPagina<PlanConInforme>(this.http, apiUrl(`${this.base}/planes/list`), { estado, page, pageSize });
  }

  getDetalle(id: string): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/detail`), { id });
  }

  crear(datos: GuardarInforme): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/create`), datos);
  }

  actualizar(datos: GuardarInforme): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/update`), datos);
  }

  enviar(id: string): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/enviar`), { id });
  }

  reabrir(id: string): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/reabrir`), { id });
  }

  revisar(id: string, decision: 'APROBAR' | 'RECHAZAR', motivo?: string): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/revisar`), { id, decision, motivo });
  }

  cerrar(id: string): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/cerrar`), { id });
  }

  eliminar(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(apiUrl(`${this.base}/delete`), { id });
  }

  seguimientoPlan(planId: string, estado: string, observaciones?: string, evidenciaCumplimiento?: string[]): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/planes/seguimiento`), { planId, estado, observaciones, evidenciaCumplimiento });
  }
}

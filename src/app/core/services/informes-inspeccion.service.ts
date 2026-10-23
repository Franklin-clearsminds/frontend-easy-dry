import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../config/env';
import {
  Destinatario,
  GuardarInforme,
  InformeDetalle,
  InformeFila,
  OpcionSello,
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

  /** Guarda el informe de forma definitiva: exige la calificación, el jefe de taller validado y las cuatro firmas. */
  guardar(id: string): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/guardar`), { id });
  }

  /** Jefes de taller que se pueden elegir al calificar. */
  getSellos(): Observable<OpcionSello[]> {
    return this.http.post<OpcionSello[]>(apiUrl(`${this.base}/sellos/opciones`), {});
  }

  /** Valida al jefe de taller con su contraseña: habilita la sección de firmas. */
  validarSello(informeId: string, selloId: string, password: string): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/sello/validar`), { informeId, selloId, password });
  }

  firmar(informeId: string, tipo: string, imagen: string, nombre?: string): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/firmar`), { informeId, tipo, imagen, nombre });
  }

  /** Aprueba un informe guardado firmando la recepción (solo Admin y Super Admin). */
  aprobar(informeId: string, imagen: string): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/aprobar`), { informeId, imagen });
  }

  eliminar(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(apiUrl(`${this.base}/delete`), { id });
  }

  seguimientoPlan(planId: string, estado: string, observaciones?: string, evidenciaCumplimiento?: string[]): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(apiUrl(`${this.base}/planes/seguimiento`), { planId, estado, observaciones, evidenciaCumplimiento });
  }
}

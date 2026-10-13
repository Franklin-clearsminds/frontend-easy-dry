import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Operador, HistorialAsignacionOperador } from '../models';
import { apiUrl } from '../config/env';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';

/** Lo que pide la tabla de operadores: la de la tabla más sus filtros. `agenciaId` acepta el id o el nombre de la agencia. */
export interface ConsultaOperadores extends Partial<ConsultaTabla> {
  agenciaId?: string;
  /** PULIDOR | LAVADOR */
  categoriaRol?: string;
  /** Rol concreto (LAVADOR, PULIDOR, PULIDOR_FIJO, TECNICO…) */
  rol?: string;
  /** 1 activo, 0 inactivo */
  estado?: number;
  bahiaNombre?: string;
  clienteNombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OperadorService {
  private http = inject(HttpClient);
  private operadoresSubject = new BehaviorSubject<Operador[]>([]);
  public operadores$ = this.operadoresSubject.asObservable();

  private historialSubject = new BehaviorSubject<HistorialAsignacionOperador[]>([]);
  public historial$ = this.historialSubject.asObservable();

  getOperadores(agenciaId?: string | number, categoriaRol?: string): Observable<Operador[]> {
    const payload: any = {};
    if (agenciaId && agenciaId !== 'Todas') payload.agenciaId = String(agenciaId);
    if (categoriaRol) payload.categoriaRol = categoriaRol;
    return this.http.post<Operador[]>(apiUrl('/agencias/operadores/list'), payload).pipe(
      tap(list => this.operadoresSubject.next(list || [])),
      catchError(err => {
        console.warn('Error al cargar operadores de BD:', err);
        return of(this.operadoresSubject.value);
      })
    );
  }

  /**
   * Una página de operadores con búsqueda y filtros en el servidor (orden: nombre, agencia, rol, estado, fecha).
   * No toca la caché ni captura errores: la tabla muestra el suyo.
   */
  getOperadoresPagina(c: ConsultaOperadores): Observable<PaginaConResumen<Operador>> {
    return postPagina<Operador>(
      this.http,
      apiUrl('/agencias/operadores/list'),
      cuerpoConsulta(c, ['agenciaId', 'categoriaRol', 'rol', 'estado', 'bahiaNombre', 'clienteNombre']),
    );
  }

  getOperadorById(id: number | string): Observable<Operador | undefined> {
    return this.operadores$.pipe(
      map(list => list.find(o => String(o.id) === String(id)))
    );
  }

  getHistorialPorOperador(operadorId: number | string): Observable<HistorialAsignacionOperador[]> {
    return this.http.post<any>(apiUrl('/agencias/bahias/historial-asignaciones'), { operadorId: String(operadorId) }).pipe(
      map(res => {
        const rawItems = Array.isArray(res) ? res : (res?.data || []);
        return rawItems.map((h: any, index: number) => ({
          id: h.id || index + 1,
          operadorId: h.operadorId,
          operadorNombre: h.operador ? `${h.operador.name || ''} ${h.operador.lastname || ''}`.trim() : 'Lavador',
          fechaInicio: h.fechaInicio ? h.fechaInicio.split('T')[0] : '',
          fechaFin: h.fechaFin ? h.fechaFin.split('T')[0] : undefined,
          sucursal: h.bahia?.agencia?.nombre || 'Agencia',
          bahia: h.bahia?.nombre || 'Bahía',
          realizadoPor: h.asignadoPor ? `${h.asignadoPor.name || ''} ${h.asignadoPor.lastname || ''}`.trim() : 'Supervisor',
          motivo: h.motivo || 'Asignación técnica'
        }));
      }),
      tap(hist => this.historialSubject.next(hist)),
      catchError(() => of([]))
    );
  }

  getHistorialGeneral(agenciaId?: string): Observable<HistorialAsignacionOperador[]> {
    const payload = agenciaId && agenciaId !== 'Todas' ? { agenciaId } : {};
    return this.http.post<any>(apiUrl('/agencias/bahias/historial-asignaciones'), payload).pipe(
      map(res => {
        const rawItems = Array.isArray(res) ? res : (res?.data || []);
        return rawItems.map((h: any, index: number) => ({
          id: h.id || index + 1,
          operadorId: h.operadorId,
          operadorNombre: h.operador ? `${h.operador.name || ''} ${h.operador.lastname || ''}`.trim() : 'Lavador',
          fechaInicio: h.fechaInicio ? h.fechaInicio.split('T')[0] : (h.createdAt ? h.createdAt.split('T')[0] : ''),
          fechaFin: h.fechaFin ? h.fechaFin.split('T')[0] : undefined,
          sucursal: h.bahia?.agencia?.nombre || 'Agencia',
          bahia: h.bahia?.nombre || 'Bahía',
          realizadoPor: h.asignadoPor ? `${h.asignadoPor.name || ''} ${h.asignadoPor.lastname || ''}`.trim() : 'Supervisor',
          motivo: h.motivo || 'Asignación técnica'
        }));
      }),
      tap(hist => this.historialSubject.next(hist)),
      catchError(() => of([]))
    );
  }

  crearOperador(datos: Partial<Operador>): Observable<Operador> {
    const payload = {
      nombre: datos.nombre,
      cedula: datos.cedula,
      telefono: datos.telefono,
      rol: datos.rol || 'LAVADOR',
      agenciaId: datos.sucursalId ? String(datos.sucursalId) : datos.sucursal,
      bahiaId: datos.bahiaId || (datos.bahia && !datos.bahia.includes('Sin') ? datos.bahia : undefined),
      estado: datos.estado === 'Inactivo' ? 0 : 1
    };

    return this.http.post<Operador>(apiUrl('/agencias/operadores/create'), payload).pipe(
      tap(creado => {
        const current = this.operadoresSubject.value;
        this.operadoresSubject.next([creado, ...current.filter(o => o.id !== creado.id)]);
      })
    );
  }

  reasignarOperador(
    operadorId: number | string,
    nuevaSucursal: string,
    nuevaBahia: string,
    motivo: string,
    usuarioAccion: string,
    bahiaIdTarget?: string
  ): Observable<Operador | null> {
    const payload = {
      bahiaId: bahiaIdTarget || nuevaBahia,
      operadorId: nuevaBahia && nuevaBahia.includes('Sin') ? null : String(operadorId),
      notas: motivo || 'Reasignación operativa de bahía'
    };

    return this.http.post<any>(apiUrl('/agencias/bahias/asignar-operador'), payload).pipe(
      map(res => {
        this.getOperadores().subscribe();
        this.getHistorialGeneral().subscribe();
        const current = this.operadoresSubject.value;
        const op = current.find(o => String(o.id) === String(operadorId));
        if (op) {
          op.sucursal = nuevaSucursal;
          op.bahia = nuevaBahia;
        }
        return op || null;
      }),
    );
  }

  /** Quita al operador de su bahía (permiso 'bahias.asignar'). El error del servidor se propaga. */
  desasignarOperadorDeBahia(bahiaId: string | number, operadorId: string | number, motivo: string): Observable<any> {
    return this.http.post<any>(apiUrl('/agencias/bahias/desasignar-operador'), {
      bahiaId: String(bahiaId),
      operadorId: String(operadorId),
      motivo: motivo || undefined
    }).pipe(
      tap(() => {
        this.getOperadores().subscribe();
        this.getHistorialGeneral().subscribe();
      })
    );
  }

  actualizarOperador(op: Operador): Observable<Operador> {
    const payload = {
      id: String(op.id),
      nombre: op.nombre,
      cedula: op.cedula,
      telefono: op.telefono,
      rol: op.rol,
      agenciaId: op.sucursalId ? String(op.sucursalId) : op.sucursal,
      bahiaId: op.bahiaId || undefined,
      estado: op.estado === 'Inactivo' ? 0 : 1
    };

    return this.http.post<Operador>(apiUrl('/agencias/operadores/update'), payload).pipe(
      tap(actualizado => {
        const current = this.operadoresSubject.value;
        const idx = current.findIndex(o => String(o.id) === String(actualizado.id));
        if (idx !== -1) {
          current[idx] = actualizado;
          this.operadoresSubject.next([...current]);
        }
      })
    );
  }
}

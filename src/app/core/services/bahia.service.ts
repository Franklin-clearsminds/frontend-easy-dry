import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, EMPTY } from 'rxjs';
import { map, tap, catchError, expand, reduce } from 'rxjs/operators';
import { Bahia } from '../models';
import { normalizarPagina } from '../models/paginacion.model';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class BahiaService {
  private http = inject(HttpClient);
  private bahiasSubject = new BehaviorSubject<Bahia[]>([]);
  public bahias$ = this.bahiasSubject.asObservable();

  private mapBackendBahia(b: any): Bahia {
    const rawLastname = b.operadorActual?.lastname || '';
    const cleanLastname = rawLastname.replace(/\(CI:[^)]+\)/, '').replace(/CI:[^)]+/, '').trim();
    const nombreOp = b.operadorActual ? `${b.operadorActual.name || ''} ${cleanLastname}`.trim() : null;
    // `b.operadores` es la relación real (BahiaOperador, activo=true): puede traer más de un lavador
    // si la agencia permite varios por bahía (maxLavadoresPorBahia > 1). `operadorActual`/
    // `operadorActualId` es un campo legacy 1:1 que se pisa con el último asignado — no sirve para
    // saber cuántos hay ni para decidir si hay cupo. Ver conversación con el usuario del 2026-09-30.
    const operadoresActivos = Array.isArray(b.operadores)
      ? b.operadores.map((rel: any) => {
          const op = rel.operador || {};
          const lastnameLimpio = String(op.lastname || '').replace(/\(CI:[^)]+\)/, '').replace(/CI:[^)]+/, '').trim();
          return { id: String(op.id), nombre: `${op.name || ''} ${lastnameLimpio}`.trim() || 'Lavador' };
        })
      : [];

    return {
      id: b.id,
      codigo: b.codigo || '',
      nombre: b.nombre || '',
      sucursalId: b.agenciaId || b.agencia?.id || '',
      sucursalNombre: b.agencia?.nombre || 'Agencia',
      agenciaId: b.agenciaId || b.agencia?.id || '',
      agenciaNombre: b.agencia?.nombre || 'Agencia',
      estado: b.activa ? (b.operadorActual ? 'Ocupada' : 'Disponible') : 'Inactiva',
      operadorAsignado: nombreOp || 'Sin Asignar',
      operadorId: b.operadorActualId || b.operadorActual?.id || undefined,
      maquinariaAsignada: [],
      ocupada: b.ocupada
        ? { placa: b.ocupada.placa, ordenTrabajoOT: b.ocupada.ordenTrabajoOT ?? null }
        : null,
      maxLavadoresPorBahia: Number(b.agencia?.maxLavadoresPorBahia) || 1,
      permiteVariasOtPorBahia: b.agencia?.permiteVariasOtPorBahia !== false,
      operadoresActivos,
    };
  }

  getBahias(): Observable<Bahia[]> {
    const pedir = (page: number) => this.http.post<any>(apiUrl('/agencias/bahias/list'), { page, pageSize: 100 });
    return pedir(1).pipe(
      expand(res => (res && res.hasNextPage ? pedir(Number(res.page || 1) + 1) : EMPTY)),
      reduce((acc: any[], res: any) => acc.concat(normalizarPagina<any>(res, 1, 100).items), [] as any[]),
      map(items => (items || []).map(b => this.mapBackendBahia(b))),
      tap(mapped => this.bahiasSubject.next(mapped)),
      catchError(() => of(this.bahiasSubject.value))
    );
  }

  getBahiasPorSucursal(sucursalId: string | number): Observable<Bahia[]> {
    const payload = sucursalId ? { agenciaId: String(sucursalId) } : {};
    return this.http.post<any[]>(apiUrl('/agencias/bahias/list'), payload).pipe(
      map(items => (items || []).map(b => this.mapBackendBahia(b))),
      tap(mapped => {
        const current = this.bahiasSubject.value;
        const others = current.filter(c => c.sucursalId !== sucursalId && c.agenciaId !== sucursalId);
        this.bahiasSubject.next([...others, ...mapped]);
      }),
      catchError(() => of(this.bahiasSubject.value.filter(b => b.sucursalId === sucursalId || b.agenciaId === sucursalId)))
    );
  }

  /** Activa o desactiva la bahía (casilla «Activar o desactivar bahía»). Si el servidor rechaza, el error se propaga. */
  actualizarEstadoBahia(id: string | number, nuevoEstado: Bahia['estado']): Observable<Bahia | null> {
    const activa = nuevoEstado !== 'Inactiva';
    return this.http.post<any>(apiUrl('/agencias/bahias/update'), { id: String(id), activa }).pipe(
      map(updated => this.mapBackendBahia(updated)),
      tap(mapped => {
        const current = this.bahiasSubject.value;
        const idx = current.findIndex(b => b.id === id);
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...mapped, estado: nuevoEstado };
          this.bahiasSubject.next([...current]);
        }
      })
    );
  }

  asignarOperadorABahia(bahiaId: string | number, operadorNombre: string, operadorId?: string | number): Observable<Bahia | null> {
    if (!operadorId) {
      return of(null);
    }
    return this.http.post<any>(apiUrl('/agencias/bahias/asignar-operador'), {
      bahiaId: String(bahiaId),
      operadorId: String(operadorId),
      tipoAsignacion: 'TEMPORAL'
    }).pipe(
      map(updated => this.mapBackendBahia(updated)),
      tap(mapped => {
        const current = this.bahiasSubject.value;
        const idx = current.findIndex(b => b.id === bahiaId);
        if (idx !== -1) {
          current[idx] = {
            ...current[idx],
            ...mapped,
            operadorAsignado: operadorNombre,
            operadorId,
            estado: 'Ocupada'
          };
          this.bahiasSubject.next([...current]);
        }
      })
    );
  }

  crearBahia(dto: { agenciaId: string; codigo: string; nombre: string; activa?: boolean }): Observable<Bahia | null> {
    return this.http.post<any>(apiUrl('/agencias/bahias/create'), dto).pipe(
      map(created => this.mapBackendBahia(created)),
      tap(mapped => {
        const current = this.bahiasSubject.value;
        this.bahiasSubject.next([...current, mapped]);
      })
    );
  }

  sincronizarBahias(sucursalId: string | number, sucursalNombre: string, nuevaCantidad: number): void {
    this.getBahiasPorSucursal(sucursalId).subscribe();
  }
}

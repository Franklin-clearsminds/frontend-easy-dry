import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { MovimientoMaquinaria } from '../models';
import { PaginaServidor, normalizarPagina } from '../models/paginacion.model';
import { PAGE_SIZE_MAX } from '../config/paginacion';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class MovimientoMaquinariaService {
  private http = inject(HttpClient);
  private movimientosSubject = new BehaviorSubject<MovimientoMaquinaria[]>([]);
  public movimientos$ = this.movimientosSubject.asObservable();

  private mapItem(m: any): MovimientoMaquinaria {
    return {
      id: m.id,
      maquinaCodigo: m.maquinaria?.codigo || m.maquinaCodigo || '',
      maquinaNombre: m.maquinaria?.nombre || m.maquinaNombre || '',
      fecha: m.fecha ? new Date(m.fecha).toISOString().replace('T', ' ').substring(0, 16) : '',
      usuarioResponsable: m.usuario ? `${m.usuario.name || ''} ${m.usuario.lastname || ''}`.trim() : (m.usuarioResponsable || ''),
      sucursalAnterior: m.origenAgencia?.nombre || m.sucursalAnterior || '',
      bahiaAnterior: m.origenBahia?.nombre || m.bahiaAnterior || '',
      sucursalNueva: m.destinoAgencia?.nombre || m.sucursalNueva || '',
      bahiaNueva: m.destinoBahia?.nombre || m.bahiaNueva || '',
      motivo: m.motivo || '',
    };
  }

  /** Movimientos (ADMIN, SUPER_ADMIN, COORD_MANTENIMIENTO). Acepta paginación { page, pageSize (máx 100) }. */
  getMovimientos(filtro: { maquinariaId?: string; page?: number; pageSize?: number } = {}): Observable<MovimientoMaquinaria[]> {
    return this.http.post<any>(apiUrl('/maquinaria/movimientos/list'), { ...filtro, pageSize: Math.min(filtro.pageSize || PAGE_SIZE_MAX, PAGE_SIZE_MAX) }).pipe(
      map(res => {
        const items = Array.isArray(res) ? res : (res?.data || []);
        return items.map((m: any) => this.mapItem(m));
      }),
      tap(list => this.movimientosSubject.next(list)),
      catchError(() => of(this.movimientosSubject.value))
    );
  }

  /**
   * Una página de movimientos de una máquina (para el modal de detalle, con scroll infinito).
   * Propaga los errores para que la lista muestre "Reintentar".
   */
  getMovimientosPagina(maquinariaId: string | number, page = 1, pageSize = 30): Observable<PaginaServidor<MovimientoMaquinaria>> {
    const size = Math.min(pageSize, PAGE_SIZE_MAX);
    return this.http.post<any>(apiUrl('/maquinaria/movimientos/list'), { maquinariaId: String(maquinariaId), page, pageSize: size }).pipe(
      map(res => {
        const p = normalizarPagina<any>(res, page, size);
        return { ...p, items: p.items.map((m: any) => this.mapItem(m)) };
      }),
    );
  }

  getMovimientosPorMaquina(codigo: string): Observable<MovimientoMaquinaria[]> {
    return this.getMovimientos().pipe(
      map(list => list.filter(m => m.maquinaCodigo.toLowerCase() === codigo.toLowerCase()))
    );
  }

  registrarMovimiento(mov: Omit<MovimientoMaquinaria, 'id'> & { maquinariaId?: string; destinoAgenciaId?: string; destinoBahiaId?: string }): Observable<MovimientoMaquinaria> {
    if (mov.maquinariaId && mov.destinoAgenciaId) {
      return this.http.post<any>(apiUrl('/maquinaria/transferir'), {
        maquinariaId: mov.maquinariaId,
        destinoAgenciaId: mov.destinoAgenciaId,
        destinoBahiaId: mov.destinoBahiaId,
        motivo: mov.motivo,
      }).pipe(
        map(res => this.mapItem(res?.data?.movimiento || res?.data || mov)),
        tap(nuevo => this.movimientosSubject.next([nuevo, ...this.movimientosSubject.value]))
      );
    }
    const current = this.movimientosSubject.value;
    const nuevo: MovimientoMaquinaria = { ...mov, id: Date.now() };
    this.movimientosSubject.next([nuevo, ...current]);
    return of(nuevo);
  }
}

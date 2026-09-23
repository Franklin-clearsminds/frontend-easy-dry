import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { MovimientoMaquinaria } from '../models';
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
      bahiaAnterior: m.origenBahiaId || m.bahiaAnterior || '',
      sucursalNueva: m.destinoAgencia?.nombre || m.sucursalNueva || '',
      bahiaNueva: m.destinoBahiaId || m.bahiaNueva || '',
      motivo: m.motivo || '',
    };
  }

  getMovimientos(): Observable<MovimientoMaquinaria[]> {
    return this.http.post<any>(apiUrl('/maquinaria/movimientos/list'), {}).pipe(
      map(res => {
        const items = Array.isArray(res) ? res : (res?.data || []);
        return items.map((m: any) => this.mapItem(m));
      }),
      tap(list => this.movimientosSubject.next(list)),
      catchError(() => of(this.movimientosSubject.value))
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

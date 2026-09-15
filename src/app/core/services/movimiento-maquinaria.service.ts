import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { MovimientoMaquinaria } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MovimientoMaquinariaService {
  private movimientosSubject = new BehaviorSubject<MovimientoMaquinaria[]>([]);
  public movimientos$ = this.movimientosSubject.asObservable();

  getMovimientos(): Observable<MovimientoMaquinaria[]> {
    return of(this.movimientosSubject.value);
  }

  getMovimientosPorMaquina(codigo: string): Observable<MovimientoMaquinaria[]> {
    return this.movimientos$.pipe(
      map(list => list.filter(m => m.maquinaCodigo.toLowerCase() === codigo.toLowerCase()))
    );
  }

  registrarMovimiento(mov: Omit<MovimientoMaquinaria, 'id'>): Observable<MovimientoMaquinaria> {
    const current = this.movimientosSubject.value;
    const nuevo: MovimientoMaquinaria = {
      ...mov,
      id: Math.max(...current.map(m => m.id), 0) + 1
    };
    this.movimientosSubject.next([nuevo, ...current]);
    return of(nuevo);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { MovimientoMaquinaria } from '../../domain';
import { MOCK_MOVIMIENTOS_MAQUINARIA } from './data/movimientos-maquinaria.mock';

@Injectable({
  providedIn: 'root'
})
export class MovimientoMaquinariaMockService {
  private movimientosSubject = new BehaviorSubject<MovimientoMaquinaria[]>(MOCK_MOVIMIENTOS_MAQUINARIA);
  public movimientos$ = this.movimientosSubject.asObservable();

  getMovimientos(): Observable<MovimientoMaquinaria[]> {
    return this.movimientos$.pipe(delay(200));
  }

  getMovimientosPorMaquina(codigo: string): Observable<MovimientoMaquinaria[]> {
    return this.movimientos$.pipe(
      map(list => list.filter(m => m.maquinaCodigo.toLowerCase() === codigo.toLowerCase())),
      delay(150)
    );
  }

  registrarMovimiento(mov: Omit<MovimientoMaquinaria, 'id'>): Observable<MovimientoMaquinaria> {
    const current = this.movimientosSubject.value;
    const nuevo: MovimientoMaquinaria = {
      ...mov,
      id: Math.max(...current.map(m => m.id), 0) + 1
    };
    this.movimientosSubject.next([nuevo, ...current]);
    return of(nuevo).pipe(delay(300));
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Mantenimiento } from '../../domain';
import { MOCK_MANTENIMIENTOS } from './data/data.mock';

@Injectable({
  providedIn: 'root'
})
export class MantenimientoMockService {
  private mantenimientosSubject = new BehaviorSubject<Mantenimiento[]>(MOCK_MANTENIMIENTOS);
  public mantenimientos$ = this.mantenimientosSubject.asObservable();

  getMantenimientos(): Observable<Mantenimiento[]> {
    return this.mantenimientos$.pipe(delay(300));
  }

  registrarMantenimiento(mant: Omit<Mantenimiento, 'id'>): Observable<Mantenimiento> {
    const current = this.mantenimientosSubject.value;
    const nuevo: Mantenimiento = {
      ...mant,
      id: Math.max(...current.map(m => m.id), 0) + 1
    };
    this.mantenimientosSubject.next([nuevo, ...current]);
    return of(nuevo).pipe(delay(400));
  }
}

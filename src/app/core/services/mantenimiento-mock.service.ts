import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Mantenimiento } from '../models';
import { MOCK_MANTENIMIENTOS } from '../mocks/data.mock';

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

  asignarMantenimiento(
    id: number,
    tecnicoId: number,
    tecnicoNombre: string,
    gestorId: number,
    gestorNombre: string
  ): Observable<Mantenimiento | null> {
    const current = this.mantenimientosSubject.value;
    const idx = current.findIndex(m => m.id === id);
    if (idx === -1) return of(null);

    const actualizado: Mantenimiento = {
      ...current[idx],
      tecnicoAsignadoId: tecnicoId,
      tecnicoAsignadoNombre: tecnicoNombre,
      tecnico: tecnicoNombre,
      gestorAsignadorId: gestorId,
      gestorAsignadorNombre: gestorNombre,
      fechaAsignacion: new Date().toLocaleString(),
      estado: current[idx].estado === 'Programado' ? 'En Proceso' : current[idx].estado,
    };
    const next = [...current];
    next[idx] = actualizado;
    this.mantenimientosSubject.next(next);
    return of(actualizado).pipe(delay(300));
  }

  cancelarAsignacion(id: number): Observable<Mantenimiento | null> {
    const current = this.mantenimientosSubject.value;
    const idx = current.findIndex(m => m.id === id);
    if (idx === -1) return of(null);

    const item = current[idx];
    if (!item.tecnicoAsignadoId || item.estado === 'Completado') return of(null);

    const actualizado: Mantenimiento = {
      ...item,
      tecnicoAsignadoId: undefined,
      tecnicoAsignadoNombre: undefined,
      gestorAsignadorId: undefined,
      gestorAsignadorNombre: undefined,
      fechaAsignacion: undefined,
      tecnico: 'Sin asignar',
      estado: 'Programado',
    };
    const next = [...current];
    next[idx] = actualizado;
    this.mantenimientosSubject.next(next);
    return of(actualizado).pipe(delay(300));
  }
}

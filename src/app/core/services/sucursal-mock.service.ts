import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Sucursal } from '../models';
import { MOCK_SUCURSALES } from '../mocks/sucursales.mock';

@Injectable({
  providedIn: 'root'
})
export class SucursalMockService {
  private sucursalesSubject = new BehaviorSubject<Sucursal[]>(MOCK_SUCURSALES);
  public sucursales$ = this.sucursalesSubject.asObservable();

  getSucursales(): Observable<Sucursal[]> {
    return this.sucursales$.pipe(delay(200));
  }

  getSucursalById(id: number): Observable<Sucursal | undefined> {
    return this.sucursales$.pipe(
      map(list => list.find(s => s.id === id)),
      delay(150)
    );
  }

  crearSucursal(suc: Omit<Sucursal, 'id'>): Observable<Sucursal> {
    const current = this.sucursalesSubject.value;
    const nueva: Sucursal = {
      ...suc,
      id: Math.max(...current.map(s => s.id), 0) + 1,
      operadoresActivos: 0,
      maquinasAsignadasCount: 0,
      serviciosRealizadosMes: 0
    };
    this.sucursalesSubject.next([...current, nueva]);
    return of(nueva).pipe(delay(300));
  }

  actualizarSucursal(suc: Sucursal): Observable<Sucursal> {
    const current = this.sucursalesSubject.value;
    const index = current.findIndex(s => s.id === suc.id);
    if (index !== -1) {
      current[index] = { ...suc };
      this.sucursalesSubject.next([...current]);
    }
    return of(suc).pipe(delay(200));
  }
}

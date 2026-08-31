import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MarcaSucursal } from '../models';
import { MOCK_MARCAS_SUCURSAL } from '../mocks/sucursales.mock';

@Injectable({
  providedIn: 'root'
})
export class MarcaSucursalMockService {
  private marcasSubject = new BehaviorSubject<MarcaSucursal[]>([...MOCK_MARCAS_SUCURSAL]);
  public marcas$ = this.marcasSubject.asObservable();

  getMarcas(): Observable<MarcaSucursal[]> {
    return this.marcas$.pipe(delay(150));
  }

  getActivas(): MarcaSucursal[] {
    return this.marcasSubject.value.filter(m => m.estado === 'Activa');
  }

  getById(id: number): MarcaSucursal | undefined {
    return this.marcasSubject.value.find(m => m.id === id);
  }

  crear(marca: Omit<MarcaSucursal, 'id' | 'codigo'>): Observable<MarcaSucursal> {
    const current = this.marcasSubject.value;
    const nextId = Math.max(...current.map(m => m.id), 0) + 1;
    const nueva: MarcaSucursal = {
      ...marca,
      id: nextId,
      codigo: `ED-${String(nextId).padStart(3, '0')}`,
      estado: marca.estado || 'Activa',
      color: marca.color || '#004282'
    };
    this.marcasSubject.next([...current, nueva]);
    return of(nueva).pipe(delay(250));
  }

  actualizar(marca: MarcaSucursal): Observable<MarcaSucursal> {
    const current = this.marcasSubject.value;
    const index = current.findIndex(m => m.id === marca.id);
    if (index !== -1) {
      current[index] = { ...marca };
      this.marcasSubject.next([...current]);
    }
    return of(marca).pipe(delay(200));
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { RegionOperativa } from '../models';
import { MOCK_REGIONES } from '../mocks/sucursales.mock';

@Injectable({
  providedIn: 'root'
})
export class RegionMockService {
  private regionesSubject = new BehaviorSubject<RegionOperativa[]>([...MOCK_REGIONES]);
  public regiones$ = this.regionesSubject.asObservable();

  getRegiones(): Observable<RegionOperativa[]> {
    return this.regiones$.pipe(delay(150));
  }

  getActivas(): RegionOperativa[] {
    return this.regionesSubject.value.filter(r => r.estado === 'Activa');
  }

  getById(id: number): RegionOperativa | undefined {
    return this.regionesSubject.value.find(r => r.id === id);
  }

  crear(region: Omit<RegionOperativa, 'id' | 'codigo'>): Observable<RegionOperativa> {
    const current = this.regionesSubject.value;
    const nextId = Math.max(...current.map(r => r.id), 0) + 1;
    const nueva: RegionOperativa = {
      ...region,
      id: nextId,
      codigo: `REG-${String(nextId).padStart(3, '0')}`,
      estado: region.estado || 'Activa'
    };
    this.regionesSubject.next([...current, nueva]);
    return of(nueva).pipe(delay(250));
  }

  actualizar(region: RegionOperativa): Observable<RegionOperativa> {
    const current = this.regionesSubject.value;
    const index = current.findIndex(r => r.id === region.id);
    if (index !== -1) {
      current[index] = { ...region };
      this.regionesSubject.next([...current]);
    }
    return of(region).pipe(delay(200));
  }
}

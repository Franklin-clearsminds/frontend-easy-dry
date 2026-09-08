import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { MarcaSucursal } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class MarcaSucursalMockService {
  private http = inject(HttpClient);
  private marcasSubject = new BehaviorSubject<MarcaSucursal[]>([]);
  public marcas$ = this.marcasSubject.asObservable();

  private mapBackendMarca(m: any): MarcaSucursal {
    return {
      id: m.id,
      codigo: m.codigo || `ED-${(m.id || '').toString().slice(-4)}`,
      nombre: m.nombre || '',
      descripcion: m.descripcion || '',
      color: m.color || '#004282',
      estado: m.estado === 1 ? 'Activa' : 'Inactiva'
    };
  }

  getMarcas(): Observable<MarcaSucursal[]> {
    return this.http.post<any[]>(apiUrl('/agencias/marcas/list'), {}).pipe(
      map(items => (items || []).map(m => this.mapBackendMarca(m))),
      tap(mapped => this.marcasSubject.next(mapped)),
      catchError(() => of(this.marcasSubject.value))
    );
  }

  getActivas(): MarcaSucursal[] {
    return this.marcasSubject.value.filter(m => m.estado === 'Activa');
  }

  getById(id: number | string): MarcaSucursal | undefined {
    return this.marcasSubject.value.find(m => String(m.id) === String(id));
  }

  crear(marca: Omit<MarcaSucursal, 'id' | 'codigo'>): Observable<MarcaSucursal> {
    return this.http.post<any>(apiUrl('/agencias/marcas/create'), {
      nombre: marca.nombre,
      estado: marca.estado === 'Inactiva' ? 0 : 1
    }).pipe(
      map(res => this.mapBackendMarca({ ...res, color: marca.color })),
      tap(nueva => {
        const current = this.marcasSubject.value;
        this.marcasSubject.next([...current, nueva]);
      }),
      catchError(err => {
        console.error('Error al crear marca:', err);
        throw err;
      })
    );
  }

  actualizar(marca: MarcaSucursal): Observable<MarcaSucursal> {
    return this.http.post<any>(apiUrl('/agencias/marcas/update'), {
      id: String(marca.id),
      nombre: marca.nombre,
      estado: marca.estado === 'Inactiva' ? 0 : 1
    }).pipe(
      map(res => this.mapBackendMarca({ ...res, color: marca.color })),
      tap(act => {
        const current = this.marcasSubject.value;
        const index = current.findIndex(m => String(m.id) === String(act.id));
        if (index !== -1) {
          current[index] = { ...act };
          this.marcasSubject.next([...current]);
        }
      }),
      catchError(() => of(marca))
    );
  }
}

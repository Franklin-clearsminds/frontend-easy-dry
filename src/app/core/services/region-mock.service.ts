import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { RegionOperativa } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class RegionMockService {
  private http = inject(HttpClient);
  private regionesSubject = new BehaviorSubject<RegionOperativa[]>([]);
  public regiones$ = this.regionesSubject.asObservable();

  private mapBackendRegion(r: any): RegionOperativa {
    const sup = r.usuarios?.find((u: any) => u.role?.namerol === 'SUPERVISOR') || r.usuarios?.[0];
    const respNombre = r.responsable || (sup ? `${sup.name || ''} ${sup.lastname || ''}`.trim() : '');
    const supId = r.supervisorId || sup?.id || undefined;
    return {
      id: r.id,
      codigo: r.codigo || '',
      nombre: r.nombre || '',
      descripcion: r.descripcion || '',
      responsable: respNombre,
      supervisorId: supId,
      estado: r.estado === 1 ? 'Activa' : 'Inactiva'
    };
  }

  getRegiones(): Observable<RegionOperativa[]> {
    return this.http.post<any[]>(apiUrl('/agencias/regiones/list'), {}).pipe(
      map(items => (items || []).map(r => this.mapBackendRegion(r))),
      tap(mapped => this.regionesSubject.next(mapped)),
      catchError(() => of(this.regionesSubject.value))
    );
  }

  getActivas(): RegionOperativa[] {
    return this.regionesSubject.value.filter(r => r.estado === 'Activa');
  }

  getById(id: number | string): RegionOperativa | undefined {
    return this.regionesSubject.value.find(r => String(r.id) === String(id));
  }

  crear(region: Omit<RegionOperativa, 'id' | 'codigo'>): Observable<RegionOperativa> {
    const slug = region.nombre ? region.nombre.substring(0, 3).toUpperCase() : 'REG';
    const codigo = `REG-${slug}-${Date.now().toString().slice(-4)}`;
    return this.http.post<any>(apiUrl('/agencias/regiones/create'), {
      codigo,
      nombre: region.nombre,
      descripcion: region.descripcion || '',
      supervisorId: region.supervisorId || undefined,
      responsable: region.responsable || undefined,
      estado: region.estado === 'Inactiva' ? 0 : 1
    }).pipe(
      map(res => this.mapBackendRegion(res)),
      tap(nueva => {
        const current = this.regionesSubject.value;
        this.regionesSubject.next([...current, nueva]);
      }),
      catchError(err => {
        console.error('Error al crear región:', err);
        throw err;
      })
    );
  }

  actualizar(region: RegionOperativa): Observable<RegionOperativa> {
    return this.http.post<any>(apiUrl('/agencias/regiones/update'), {
      id: String(region.id),
      codigo: region.codigo,
      nombre: region.nombre,
      descripcion: region.descripcion,
      supervisorId: region.supervisorId || undefined,
      responsable: region.responsable || undefined,
      estado: region.estado === 'Inactiva' ? 0 : 1
    }).pipe(
      map(res => this.mapBackendRegion(res)),
      tap(act => {
        const current = this.regionesSubject.value;
        const index = current.findIndex(r => String(r.id) === String(act.id));
        if (index !== -1) {
          current[index] = { ...act };
          this.regionesSubject.next([...current]);
        }
      }),
      catchError(() => of(region))
    );
  }
}

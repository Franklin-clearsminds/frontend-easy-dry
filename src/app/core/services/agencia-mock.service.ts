import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Agencia } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class AgenciaMockService {
  private http = inject(HttpClient);
  private agenciasSubject = new BehaviorSubject<Agencia[]>([]);
  public agencias$ = this.agenciasSubject.asObservable();

  private mapBackendAgencia(a: any): Agencia {
    return {
      id: a.id,
      nombre: a.nombre,
      ciudad: a.regionRel?.nombre || a.region || 'Quito',
      numeroBahias: a.numeroBahias || (a.bahias?.length ?? a._count?.bahias ?? 0),
      empleados: a.usuarios?.length ?? a._count?.usuarios ?? 0,
      productividad: 100,
      estado: a.estado === 1 ? 'Operativa' : 'Inactiva',
      direccion: a.direccion || '',
      gerenteAsignado: a.usuarios?.[0] ? `${a.usuarios[0].name} ${a.usuarios[0].lastname}`.trim() : 'Sin Asignar',
      marcaId: a.marcaId || a.marca?.id,
      marcaNombre: a.marca?.nombre || 'Sin marca'
    };
  }

  getAgencias(): Observable<Agencia[]> {
    return this.http.post<any[]>(apiUrl('/agencias/list'), {}).pipe(
      map(items => (items || []).map(a => this.mapBackendAgencia(a))),
      tap(mapped => this.agenciasSubject.next(mapped)),
      catchError(() => of(this.agenciasSubject.value))
    );
  }

  getAgenciaById(id: number | string): Observable<Agencia | undefined> {
    const existing = this.agenciasSubject.value.find(a => String(a.id) === String(id));
    if (existing) return of(existing);
    return this.getAgencias().pipe(
      map(list => list.find(a => String(a.id) === String(id)))
    );
  }

  crearAgencia(agencia: Omit<Agencia, 'id'>): Observable<Agencia> {
    const slug = (agencia.nombre || 'AGN').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const codigo = `AGN-${slug}-${Date.now().toString().slice(-4)}`;
    return this.http.post<any>(apiUrl('/agencias/create'), {
      codigo,
      nombre: agencia.nombre,
      region: agencia.ciudad,
      direccion: agencia.direccion,
      numeroBahias: agencia.numeroBahias || 2,
      estado: agencia.estado === 'Inactiva' ? 0 : 1
    }).pipe(
      map(res => this.mapBackendAgencia(res)),
      tap(nueva => {
        const current = this.agenciasSubject.value;
        this.agenciasSubject.next([...current, nueva]);
      }),
      catchError(err => {
        console.error('Error al crear agencia:', err);
        throw err;
      })
    );
  }

  actualizarAgencia(agencia: Agencia): Observable<Agencia> {
    return this.http.post<any>(apiUrl('/agencias/update'), {
      id: String(agencia.id),
      nombre: agencia.nombre,
      region: agencia.ciudad,
      direccion: agencia.direccion,
      numeroBahias: agencia.numeroBahias,
      estado: agencia.estado === 'Inactiva' ? 0 : 1
    }).pipe(
      map(res => this.mapBackendAgencia(res)),
      tap(act => {
        const current = this.agenciasSubject.value;
        const index = current.findIndex(a => String(a.id) === String(act.id));
        if (index !== -1) {
          current[index] = { ...act };
          this.agenciasSubject.next([...current]);
        }
      }),
      catchError(() => of(agencia))
    );
  }
}

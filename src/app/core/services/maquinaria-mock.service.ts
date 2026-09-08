import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Maquinaria } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class MaquinariaMockService {
  private http = inject(HttpClient);
  private maquinariaSubject = new BehaviorSubject<Maquinaria[]>([]);
  public maquinaria$ = this.maquinariaSubject.asObservable();

  private mapBackendMaquinaria(m: any): Maquinaria {
    return {
      id: m.id,
      codigo: m.codigo || '',
      nombre: m.nombre || '',
      tipo: m.tipo || 'General',
      marca: m.marca || '',
      modelo: m.modelo || '',
      numeroSerie: m.numeroSerie || '',
      agencia: m.agencia?.nombre || 'Sin Agencia',
      bahia: m.bahia?.nombre || 'Sin Bahía',
      sucursalId: m.agenciaId || m.agencia?.id,
      sucursalNombre: m.agencia?.nombre,
      bahiaId: m.bahiaId || m.bahia?.id,
      bahiaNombre: m.bahia?.nombre,
      estado: m.estado || 'Operativa',
      fechaMantenimiento: m.mantenimientos?.[0]?.fechaRealizado || '',
      imagen: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80',
      horasUso: m.horasUso || 0
    };
  }

  getMaquinaria(): Observable<Maquinaria[]> {
    return this.http.post<any[]>(apiUrl('/maquinaria/list'), {}).pipe(
      map(items => (items || []).map(m => this.mapBackendMaquinaria(m))),
      tap(mapped => this.maquinariaSubject.next(mapped)),
      catchError(() => of(this.maquinariaSubject.value))
    );
  }

  actualizarEstadoMaquina(id: number | string, estado: Maquinaria['estado']): Observable<Maquinaria | null> {
    return this.http.post<any>(apiUrl('/maquinaria/update'), { id: String(id), estado }).pipe(
      map(res => this.mapBackendMaquinaria(res)),
      tap(act => {
        const current = this.maquinariaSubject.value;
        const idx = current.findIndex(m => String(m.id) === String(id));
        if (idx !== -1) {
          current[idx] = { ...act };
          this.maquinariaSubject.next([...current]);
        }
      }),
      catchError(() => of(null))
    );
  }

  crearMaquinaria(maquina: Omit<Maquinaria, 'id'>): Observable<Maquinaria> {
    const slug = (maquina.nombre || 'MQ').substring(0, 3).toUpperCase();
    const codigo = `MQ-${slug}-${Date.now().toString().slice(-4)}`;
    return this.http.post<any>(apiUrl('/maquinaria/create'), {
      codigo,
      nombre: maquina.nombre,
      tipo: maquina.tipo || 'Lavadora',
      marca: maquina.marca || 'Karcher',
      modelo: maquina.modelo || 'Pro',
      numeroSerie: maquina.numeroSerie || codigo,
      agenciaId: maquina.sucursalId ? String(maquina.sucursalId) : undefined,
      bahiaId: maquina.bahiaId ? String(maquina.bahiaId) : undefined,
      estado: maquina.estado || 'Operativa'
    }).pipe(
      map(res => this.mapBackendMaquinaria(res)),
      tap(nueva => {
        const current = this.maquinariaSubject.value;
        this.maquinariaSubject.next([...current, nueva]);
      }),
      catchError(err => {
        console.error('Error al crear maquinaria:', err);
        throw err;
      })
    );
  }

  asignarMaquinaria(maquinaId: number | string, sucursalNombre: string, bahiaNombre: string): Observable<Maquinaria | null> {
    const current = this.maquinariaSubject.value;
    const item = current.find(m => String(m.id) === String(maquinaId));
    if (item) {
      item.agencia = sucursalNombre;
      item.bahia = bahiaNombre;
      this.maquinariaSubject.next([...current]);
      return of(item);
    }
    return of(null);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ClienteSucursal } from '../models';
import { apiUrl } from '../config/env';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private http = inject(HttpClient);
  private clientesSubject = new BehaviorSubject<ClienteSucursal[]>([]);
  public clientes$ = this.clientesSubject.asObservable();
  public marcas$ = this.clientes$; // alias retrocompatible

  private mapBackendCliente(m: any): ClienteSucursal {
    return {
      id: m.id,
      codigo: m.codigo || `CL-${(m.id || '').toString().slice(-4)}`,
      nombre: m.nombre || '',
      descripcion: m.descripcion || '',
      color: m.color || '#004282',
      estado: m.estado === 1 ? 'Activa' : 'Inactiva'
    };
  }

  getClientes(): Observable<ClienteSucursal[]> {
    return this.http.post<any[]>(apiUrl('/agencias/clientes/list'), {}).pipe(
      map(items => (items || []).map(m => this.mapBackendCliente(m))),
      tap(mapped => this.clientesSubject.next(mapped)),
      catchError(() => of(this.clientesSubject.value))
    );
  }

  /** Una página de clientes para la tabla (búsqueda y orden en el servidor: nombre, estado, agencias, fecha). */
  getClientesPagina(c: Partial<ConsultaTabla>): Observable<PaginaConResumen<ClienteSucursal>> {
    return postPagina<ClienteSucursal>(this.http, apiUrl('/agencias/clientes/list'), cuerpoConsulta(c), (m) => this.mapBackendCliente(m));
  }

  getMarcas(): Observable<ClienteSucursal[]> {
    return this.getClientes();
  }

  getActivos(): ClienteSucursal[] {
    return this.clientesSubject.value.filter(m => m.estado === 'Activa');
  }

  getActivas(): ClienteSucursal[] {
    return this.getActivos();
  }

  getById(id: number | string): ClienteSucursal | undefined {
    return this.clientesSubject.value.find(m => String(m.id) === String(id));
  }

  crear(cliente: Omit<ClienteSucursal, 'id' | 'codigo'>): Observable<ClienteSucursal> {
    return this.http.post<any>(apiUrl('/agencias/clientes/create'), {
      nombre: cliente.nombre,
      estado: cliente.estado === 'Inactiva' ? 0 : 1
    }).pipe(
      map(res => this.mapBackendCliente({ ...res, color: cliente.color })),
      tap(nueva => {
        const current = this.clientesSubject.value;
        this.clientesSubject.next([...current, nueva]);
      }),
      catchError(err => {
        console.error('Error al crear cliente:', err);
        throw err;
      })
    );
  }

  actualizar(cliente: ClienteSucursal): Observable<ClienteSucursal> {
    return this.http.post<any>(apiUrl('/agencias/clientes/update'), {
      id: String(cliente.id),
      nombre: cliente.nombre,
      estado: cliente.estado === 'Inactiva' ? 0 : 1
    }).pipe(
      map(res => this.mapBackendCliente({ ...res, color: cliente.color })),
      tap(act => {
        const current = this.clientesSubject.value;
        const index = current.findIndex(m => String(m.id) === String(act.id));
        if (index !== -1) {
          current[index] = { ...act };
          this.clientesSubject.next([...current]);
        }
      })
    );
  }

  toggleEstado(id: string, estado?: number): Observable<any> {
    return this.http.post<any>(apiUrl('/agencias/clientes/toggle-estado'), { id, estado }).pipe(
      tap(res => {
        const current = this.clientesSubject.value;
        const index = current.findIndex(m => String(m.id) === String(id));
        if (index !== -1) {
          current[index].estado = res.estado === 1 ? 'Activa' : 'Inactiva';
          this.clientesSubject.next([...current]);
        }
      })
    );
  }
}

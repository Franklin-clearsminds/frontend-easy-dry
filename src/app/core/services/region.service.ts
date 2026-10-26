import { FUNCION, conFuncion } from '../utils/funciones-rol';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { RegionOperativa } from '../models';
import { apiUrl } from '../config/env';
import { OpcionesService } from './opciones.service';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';

@Injectable({
  providedIn: 'root'
})
export class RegionService {
  private http = inject(HttpClient);
  private opciones = inject(OpcionesService);
  private regionesSubject = new BehaviorSubject<RegionOperativa[]>([]);
  public regiones$ = this.regionesSubject.asObservable();

  private mapBackendRegion(r: any): RegionOperativa {
    const sup = r.usuarios?.find((u: any) => conFuncion(u, FUNCION.SUPERVISOR)) || r.usuarios?.[0];
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

  /**
   * Regiones para desplegables y filtros (id, nombre, código y estado). Sale de las opciones, que cualquier pantalla con acceso a
   * agencias puede pedir: NO exige la pestaña «Regiones», que es la única que usa `getRegiones()` (con responsables y conteos).
   */
  getRegionesLista(): Observable<RegionOperativa[]> {
    return this.opciones.todas('/agencias/regiones/opciones').pipe(
      map((ops) => ops.map((o): RegionOperativa => ({
        id: o.value,
        codigo: o.sublabel || '',
        nombre: o.label,
        descripcion: '',
        responsable: '',
        estado: o.estado === 0 ? 'Inactiva' : 'Activa',
      }))),
      tap((mapped) => this.regionesSubject.next(mapped)),
      catchError(() => of(this.regionesSubject.value)),
    );
  }

  /** Una página de regiones para la tabla (búsqueda y orden en el servidor: codigo, nombre, estado, agencias, usuarios, fecha). */
  getRegionesPagina(c: Partial<ConsultaTabla>): Observable<PaginaConResumen<RegionOperativa>> {
    return postPagina<RegionOperativa>(this.http, apiUrl('/agencias/regiones/list'), cuerpoConsulta(c), (r) => this.mapBackendRegion(r));
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

  /** Activa o desactiva una región (permiso 'agencias.regiones.estado'). El error del servidor se propaga. */
  cambiarEstado(id: string | number, activa: boolean): Observable<RegionOperativa> {
    return this.http.post<any>(apiUrl('/agencias/regiones/toggle-estado'), { id: String(id), estado: activa ? 1 : 0 }).pipe(
      map(res => this.mapBackendRegion(res)),
      tap(act => {
        const current = this.regionesSubject.value;
        const index = current.findIndex(r => String(r.id) === String(act.id));
        if (index !== -1) {
          current[index] = { ...current[index], estado: act.estado };
          this.regionesSubject.next([...current]);
        }
      })
    );
  }

  /** El estado solo se envía si quien guarda puede activar o desactivar regiones. */
  actualizar(region: RegionOperativa, incluirEstado = true): Observable<RegionOperativa> {
    return this.http.post<any>(apiUrl('/agencias/regiones/update'), {
      id: String(region.id),
      codigo: region.codigo,
      nombre: region.nombre,
      descripcion: region.descripcion,
      supervisorId: region.supervisorId || undefined,
      responsable: region.responsable || undefined,
      ...(incluirEstado ? { estado: region.estado === 'Inactiva' ? 0 : 1 } : {})
    }).pipe(
      map(res => this.mapBackendRegion(res)),
      tap(act => {
        const current = this.regionesSubject.value;
        const index = current.findIndex(r => String(r.id) === String(act.id));
        if (index !== -1) {
          current[index] = { ...act };
          this.regionesSubject.next([...current]);
        }
      })
    );
  }
}

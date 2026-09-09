import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  RolPersonalizado,
  ModuloSistema,
  MODULOS_SISTEMA,
  ROLES_INICIALES,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLES_OFICIALES_NO_ELIMINABLES,
  isRolPermisosInmutable
} from '../models/roles.model';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class RolMockService {
  private http = inject(HttpClient);
  private rolesSubject = new BehaviorSubject<RolPersonalizado[]>([]);
  public roles$ = this.rolesSubject.asObservable();

  constructor() {
    this.cargarRolesIniciales();
  }

  private mapBackendRole(r: any): RolPersonalizado {
    const codigo = r.namerol || '';
    const nombre = ROLE_LABELS[codigo] || r.nombre || codigo;
    const badgeClass = ROLE_COLORS[codigo] || 'bg-slate-100 text-slate-800 border-slate-200';
    const estado = r.estado === 1 || r.estado === 'Activo' ? 'Activo' : 'Inactivo';

    return {
      id: String(r.id),
      codigo,
      nombre,
      descripcion: r.descripcion || '',
      color: r.color || '#004282',
      badgeClass,
      modulos: Array.isArray(r.permisos) ? r.permisos : [],
      estado,
      esSistema: codigo === 'SUPER_ADMIN' || codigo === 'ADMIN',
      fechaCreacion: r.fechaCreacion || new Date().toISOString().split('T')[0],
      fechaModificacion: r.fechaModificacion,
      usuariosCount: r.usuariosCount || 0
    };
  }

  private cargarRolesIniciales(): void {
    this.getRoles().subscribe();
  }

  /** Retorna todos los roles desde el backend (POST /roles/list) */
  getRoles(): Observable<RolPersonalizado[]> {
    return this.http.post<any[]>(apiUrl('/roles/list'), {}).pipe(
      map(list => {
        if (Array.isArray(list) && list.length > 0) {
          return list.map(r => this.mapBackendRole(r));
        }
        return ROLES_INICIALES;
      }),
      tap(roles => this.rolesSubject.next(roles)),
      catchError(err => {
        console.warn('No se pudo obtener la lista de roles del backend, usando catálogo de respaldo', err);
        const fallback = this.rolesSubject.value.length > 0 ? this.rolesSubject.value : ROLES_INICIALES;
        this.rolesSubject.next(fallback);
        return of(fallback);
      })
    );
  }

  /** Retorna el catálogo completo de módulos del sistema */
  getModulos(): ModuloSistema[] {
    return MODULOS_SISTEMA;
  }

  /** Obtiene un rol por ID o código */
  getRolPorCodigo(codigoOId: string): RolPersonalizado | undefined {
    const list = this.rolesSubject.value;
    return list.find(r => r.codigo.toLowerCase() === codigoOId.toLowerCase() || r.id === codigoOId);
  }

  /** Crear un nuevo rol dinámico en la base de datos */
  crearRol(data: {
    nombre: string;
    descripcion: string;
    color?: string;
    modulos: string[];
    estado?: number;
  }): Observable<RolPersonalizado> {
    const codigoGenerado = data.nombre
      .trim()
      .toUpperCase()
      .replace(/[\s\W-]+/g, '_');

    const payload = {
      namerol: codigoGenerado,
      descripcion: data.descripcion?.trim() || '',
      estado: data.estado !== undefined ? data.estado : 1,
      permisos: data.modulos || []
    };

    return this.http.post<any>(apiUrl('/roles/create'), payload).pipe(
      map(res => this.mapBackendRole(res)),
      tap(nuevoRol => {
        const current = this.rolesSubject.value;
        const exists = current.some(r => r.id === nuevoRol.id || r.codigo === nuevoRol.codigo);
        if (!exists) {
          this.rolesSubject.next([...current, nuevoRol]);
        }
      }),
      catchError(err => {
        console.warn('Error al crear rol en backend, aplicando en memoria', err);
        const fallbackRol: RolPersonalizado = {
          id: `rol_${Date.now()}`,
          codigo: codigoGenerado,
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          color: data.color || '#004282',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
          modulos: data.modulos,
          estado: 'Activo',
          esSistema: false,
          fechaCreacion: new Date().toISOString().split('T')[0],
          usuariosCount: 0
        };
        const current = this.rolesSubject.value;
        this.rolesSubject.next([...current, fallbackRol]);
        return of(fallbackRol);
      })
    );
  }

  /** Actualizar un rol existente en la base de datos */
  actualizarRol(id: string, cambios: {
    nombre?: string;
    descripcion?: string;
    color?: string;
    modulos?: string[];
    estado?: number | string;
  }): Observable<RolPersonalizado | null> {
    const current = this.rolesSubject.value;
    const rolExistente = current.find(r => r.id === id);

    if (rolExistente && isRolPermisosInmutable(rolExistente.codigo)) {
      return of(rolExistente);
    }

    const payload: any = { id };
    if (cambios.descripcion !== undefined) payload.descripcion = cambios.descripcion.trim();
    if (cambios.modulos !== undefined) payload.permisos = cambios.modulos;
    if (cambios.estado !== undefined) {
      payload.estado = cambios.estado === 'Activo' || cambios.estado === 1 ? 1 : 0;
    }

    return this.http.post<any>(apiUrl('/roles/update'), payload).pipe(
      map(res => this.mapBackendRole(res)),
      tap(actualizado => {
        const list = this.rolesSubject.value.map(r => r.id === actualizado.id ? actualizado : r);
        this.rolesSubject.next(list);
      }),
      catchError(err => {
        console.warn('Error al actualizar rol en backend, aplicando en memoria', err);
        if (rolExistente) {
          const rolActualizado: RolPersonalizado = {
            ...rolExistente,
            descripcion: cambios.descripcion !== undefined ? cambios.descripcion : rolExistente.descripcion,
            modulos: cambios.modulos !== undefined ? cambios.modulos : rolExistente.modulos,
            estado: cambios.estado !== undefined ? (cambios.estado === 1 || cambios.estado === 'Activo' ? 'Activo' : 'Inactivo') : rolExistente.estado,
          };
          const list = this.rolesSubject.value.map(r => r.id === id ? rolActualizado : r);
          this.rolesSubject.next(list);
          return of(rolActualizado);
        }
        return of(null);
      })
    );
  }

  /** Eliminar o desactivar un rol */
  eliminarRol(id: string): Observable<{ success: boolean; message?: string }> {
    const current = this.rolesSubject.value;
    const rol = current.find(r => r.id === id);

    if (rol && isRolPermisosInmutable(rol.codigo)) {
      return of({ success: false, message: 'El rol SUPER_ADMIN no puede ser eliminado.' });
    }

    return this.http.post<any>(apiUrl('/roles/delete'), { id }).pipe(
      map(res => {
        const actualizados = this.rolesSubject.value.filter(r => r.id !== id);
        this.rolesSubject.next(actualizados);
        return { success: true, message: res?.message || 'Rol eliminado exitosamente.' };
      }),
      catchError(err => {
        console.warn('Error al eliminar rol en backend, aplicando en memoria', err);
        const actualizados = this.rolesSubject.value.filter(r => r.id !== id);
        this.rolesSubject.next(actualizados);
        return of({ success: true, message: 'Rol eliminado exitosamente.' });
      })
    );
  }
}


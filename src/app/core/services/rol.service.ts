import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  RolPersonalizado,
  ModuloSistema,
  ROLE_LABELS,
  ROLE_COLORS,
  isRolPermisosInmutable
} from '../models/roles.model';
import { apiUrl } from '../config/env';

export const DEFAULT_ROLE_HEX_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#6D28D9',
  ADMIN: '#7C3AED',
  APROBADOR: '#6366F1',
  SUPERVISOR: '#004282',
  COORD_MANTENIMIENTO: '#D97706',
  TECNICO: '#EA580C',
  LIDER: '#0D9488',
  LIDER_OPERADOR: '#0D9488',
  LIDER_AGENCIA: '#0D9488',
  LAVADOR: '#059669',
  COORD_COMERCIAL: '#2563EB',
  JEFE_COMERCIAL: '#1D4ED8',
  COORD_SERVICIOS_ESPECIALES: '#004282',
  PULIDOR: '#0891B2',
  PULIDOR_FIJO: '#0891B2',
  PULIDOR_MOVIL: '#0891B2',
  COORD_BODEGA: '#475569',
  DISTRIBUIDOR: '#475569',
  ASISTENTE_BODEGA: '#0F766E',
};

@Injectable({
  providedIn: 'root'
})
export class RolService {
  private http = inject(HttpClient);
  private rolesSubject = new BehaviorSubject<RolPersonalizado[]>([]);
  public roles$ = this.rolesSubject.asObservable();

  private modulosSubject = new BehaviorSubject<ModuloSistema[]>([]);
  public modulos$ = this.modulosSubject.asObservable();

  constructor() {
    this.cargarRolesIniciales();
  }

  private mapBackendRole(r: any): RolPersonalizado {
    const codigo = r.namerol || '';
    const nombre = ROLE_LABELS[codigo] || r.nombre || codigo;
    const badgeClass = ROLE_COLORS[codigo] || 'bg-slate-100 text-slate-800 border-slate-200';
    const estado = r.estado === 1 || r.estado === 'Activo' ? 'Activo' : 'Inactivo';
    const color = r.color || DEFAULT_ROLE_HEX_COLORS[codigo] || '#7C3AED';

    let fechaCreacion = new Date().toISOString().split('T')[0];
    if (r.fechaCreacion) {
      fechaCreacion = String(r.fechaCreacion).split(' ')[0].split('T')[0];
    }

    return {
      id: String(r.id),
      codigo,
      nombre,
      descripcion: r.descripcion || '',
      color,
      badgeClass,
      modulos: Array.isArray(r.permisos) ? r.permisos : [],
      estado,
      esSistema: codigo === 'SUPER_ADMIN' || codigo === 'ADMIN',
      fechaCreacion,
      fechaModificacion: r.fechaModificacion,
      usuariosCount: r.usuariosCount || 0
    };
  }

  private mapBackendModulo(m: any): ModuloSistema {
    return {
      id: String(m.id ?? m.codigo ?? ''),
      codigo: m.codigo || '',
      nombre: m.nombre || m.codigo || '',
      descripcion: m.descripcion || '',
      icono: m.icono || 'circle',
      rutaPrincipal: m.rutaPrincipal || `/${m.codigo || ''}`,
      grupo: m.grupo || 'Otros'
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
        return [];
      }),
      tap(roles => this.rolesSubject.next(roles)),
      catchError(err => {
        console.error('No se pudo obtener la lista de roles del backend', err);
        this.rolesSubject.next([]);
        return of([]);
      })
    );
  }

  /** Catálogo de módulos desde API (POST /roles/modulos/list) */
  getModulos(): Observable<ModuloSistema[]> {
    return this.http.post<any[]>(apiUrl('/roles/modulos/list'), {}).pipe(
      map(list => {
        if (!Array.isArray(list)) return [];
        return list.map(m => this.mapBackendModulo(m));
      }),
      tap(modulos => this.modulosSubject.next(modulos)),
      catchError(err => {
        console.error('No se pudo obtener el catálogo de módulos del backend', err);
        this.modulosSubject.next([]);
        return of([]);
      })
    );
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
        console.error('Error al crear rol en backend', err);
        return throwError(() => err);
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
        console.error('Error al actualizar rol en backend', err);
        return throwError(() => err);
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
        console.error('Error al eliminar rol en backend', err);
        return throwError(() => err);
      })
    );
  }
}

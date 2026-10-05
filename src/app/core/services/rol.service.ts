import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  RolPersonalizado,
  ModuloSistema,
  ROLE_LABELS,
  ROLE_COLORS,
} from '../models/roles.model';
import { apiUrl } from '../config/env';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';
import { BRAND_COLORS } from '../../shared/theme/colors';

export const DEFAULT_ROLE_HEX_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#6D28D9',
  ADMIN: BRAND_COLORS.violet,
  APROBADOR: '#6366F1',
  SUPERVISOR: BRAND_COLORS.blue,
  COORD_MANTENIMIENTO: '#D97706',
  TECNICO: '#EA580C',
  LIDER: '#0D9488',
  LIDER_OPERADOR: '#0D9488',
  LIDER_AGENCIA: '#0D9488',
  LAVADOR: '#059669',
  COORD_COMERCIAL: '#2563EB',
  JEFE_COMERCIAL: '#1D4ED8',
  COORD_SERVICIOS_ESPECIALES: BRAND_COLORS.blue,
  PULIDOR: '#0891B2',
  PULIDOR_FIJO: '#0891B2',
  PULIDOR_MOVIL: '#0891B2',
  COORD_BODEGA: '#475569',
  DISTRIBUIDOR: '#475569',
  ASISTENTE_BODEGA: '#0F766E',
};

/** Un permiso de acción del catálogo del backend (lo que se exige en cada endpoint). */
export interface CapacidadCatalogo {
  codigo: string;
  grupo: string;
  nombre: string;
  descripcion: string;
}

/** Catálogo completo para el editor de roles: módulos de navegación, permisos de acción y ámbitos. */
export interface CatalogoPermisos {
  modulos: ModuloSistema[];
  capacidades: CapacidadCatalogo[];
  ambitos: string[];
}

/** Ámbitos válidos, del más amplio al más estrecho. */
export const AMBITOS_ROL = ['GLOBAL', 'REGION', 'AGENCIA', 'PROPIO'] as const;

/**
 * Convierte el nombre escrito en el código del rol (mayúsculas, sin tildes, guion bajo en vez de espacios),
 * igual que lo normaliza el backend: de 3 a 40 caracteres, empezando por letra.
 */
export function codigoRolDesdeNombre(nombre: string): string {
  return String(nombre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function codigoRolValido(codigo: string): boolean {
  return /^[A-Z][A-Z0-9_]{2,39}$/.test(codigo);
}

/**
 * Las altas, cambios y bajas de roles se piden en silencio: el componente muestra el mensaje en español
 * que trae el servidor (`error.message`) en vez del aviso genérico de 403.
 */
const SILENCIOSO = { headers: { 'x-silent': 'true' } };

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
    const color = r.color || DEFAULT_ROLE_HEX_COLORS[codigo] || BRAND_COLORS.violet;

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
      capacidades: Array.isArray(r.capacidades) ? r.capacidades : [],
      ambito: r.ambito || 'AGENCIA',
      estado,
      esSistema: !!r.esSistema,
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

  /** Una página de roles para la tabla de gestión (búsqueda y orden en el servidor: namerol, estado, usuarios, fecha). No toca la lista completa. */
  getRolesPagina(c: Partial<ConsultaTabla>): Observable<PaginaConResumen<RolPersonalizado>> {
    return postPagina<RolPersonalizado>(this.http, apiUrl('/roles/list'), cuerpoConsulta(c), (r) => this.mapBackendRole(r));
  }

  /**
   * Retorna todos los roles desde el backend (POST /roles/list, exige 'roles.ver').
   * Se pide en silencio: quien no tiene ese permiso simplemente no ve roles. SUPER_ADMIN nunca se expone en UI.
   */
  getRoles(): Observable<RolPersonalizado[]> {
    return this.http.post<any[]>(apiUrl('/roles/list'), {}, SILENCIOSO).pipe(
      map(list => {
        if (Array.isArray(list) && list.length > 0) {
          return list
            .map(r => this.mapBackendRole(r))
            .filter(r => (r.codigo || '').toUpperCase() !== 'SUPER_ADMIN');
        }
        return [];
      }),
      tap(roles => this.rolesSubject.next(roles)),
      catchError(() => {
        this.rolesSubject.next([]);
        return of([]);
      })
    );
  }

  /** Catálogo de módulos desde API (POST /roles/modulos/list, exige 'roles.ver'; en silencio). */
  getModulos(): Observable<ModuloSistema[]> {
    return this.http.post<any[]>(apiUrl('/roles/modulos/list'), {}, SILENCIOSO).pipe(
      map(list => {
        if (!Array.isArray(list)) return [];
        return list.map(m => this.mapBackendModulo(m));
      }),
      tap(modulos => this.modulosSubject.next(modulos)),
      catchError(() => {
        this.modulosSubject.next([]);
        return of([]);
      })
    );
  }

  /** Módulos de navegación + permisos de acción + ámbitos para el editor de roles (POST /roles/permisos/list). */
  getCatalogoPermisos(): Observable<CatalogoPermisos> {
    return this.http.post<any>(apiUrl('/roles/permisos/list'), {}, SILENCIOSO).pipe(
      map(res => ({
        modulos: (Array.isArray(res?.catalogo) ? res.catalogo : []).map((m: any) => this.mapBackendModulo(m)),
        capacidades: (Array.isArray(res?.capacidades) ? res.capacidades : []).map((c: any): CapacidadCatalogo => ({
          codigo: String(c.codigo),
          grupo: c.grupo || 'Otros',
          nombre: c.nombre || c.codigo,
          descripcion: c.descripcion || '',
        })),
        ambitos: Array.isArray(res?.ambitos) ? res.ambitos.map(String) : [...AMBITOS_ROL],
      })),
      tap(cat => this.modulosSubject.next(cat.modulos))
    );
  }

  /** Obtiene un rol por ID o código */
  getRolPorCodigo(codigoOId: string): RolPersonalizado | undefined {
    const list = this.rolesSubject.value;
    return list.find(r => r.codigo.toLowerCase() === codigoOId.toLowerCase() || r.id === codigoOId);
  }

  /** Crear un nuevo rol en la base de datos (solo con 'roles.gestionar'). Errores: los muestra quien llama. */
  crearRol(data: {
    nombre: string;
    descripcion: string;
    modulos: string[];
    capacidades: string[];
    ambito: string;
    estado?: number;
  }): Observable<RolPersonalizado> {
    const payload = {
      namerol: codigoRolDesdeNombre(data.nombre),
      descripcion: data.descripcion?.trim() || '',
      estado: data.estado !== undefined ? data.estado : 1,
      permisos: data.modulos || [],
      capacidades: data.capacidades || [],
      ambito: data.ambito,
    };

    return this.http.post<any>(apiUrl('/roles/create'), payload, SILENCIOSO).pipe(
      map(res => this.mapBackendRole(res)),
      tap(nuevoRol => {
        const current = this.rolesSubject.value;
        const exists = current.some(r => r.id === nuevoRol.id || r.codigo === nuevoRol.codigo);
        if (!exists) {
          this.rolesSubject.next([...current, nuevoRol]);
        }
      })
    );
  }

  /**
   * Actualizar un rol existente (solo con 'roles.gestionar'). El nombre no se envía: no se cambia en roles ya creados.
   * Solo viajan los campos que se pasan.
   */
  actualizarRol(id: string, cambios: {
    descripcion?: string;
    modulos?: string[];
    capacidades?: string[];
    ambito?: string;
    estado?: number | string;
  }): Observable<RolPersonalizado> {
    const payload: any = { id };
    if (cambios.descripcion !== undefined) payload.descripcion = cambios.descripcion.trim();
    if (cambios.modulos !== undefined) payload.permisos = cambios.modulos;
    if (cambios.capacidades !== undefined) payload.capacidades = cambios.capacidades;
    if (cambios.ambito !== undefined) payload.ambito = cambios.ambito;
    if (cambios.estado !== undefined) {
      payload.estado = cambios.estado === 'Activo' || cambios.estado === 1 ? 1 : 0;
    }

    return this.http.post<any>(apiUrl('/roles/update'), payload, SILENCIOSO).pipe(
      map(res => this.mapBackendRole(res)),
      tap(actualizado => {
        const list = this.rolesSubject.value.map(r => r.id === actualizado.id ? actualizado : r);
        this.rolesSubject.next(list);
      })
    );
  }

  /** Eliminar un rol (el servidor rechaza los oficiales y los que tienen usuarios asignados). */
  eliminarRol(id: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<any>(apiUrl('/roles/delete'), { id }, SILENCIOSO).pipe(
      map(res => {
        this.rolesSubject.next(this.rolesSubject.value.filter(r => r.id !== id));
        return { success: true, message: res?.message || 'Rol eliminado exitosamente.' };
      })
    );
  }
}

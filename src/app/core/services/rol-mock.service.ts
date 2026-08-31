import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { RolPersonalizado, ModuloSistema, MODULOS_SISTEMA, ROLES_INICIALES, ROLES_OFICIALES_NO_ELIMINABLES, isRolPermisosInmutable } from '../models/roles.model';

const ROLES_STORAGE_KEY = 'easydry_roles_custom_v1';

@Injectable({
  providedIn: 'root'
})
export class RolMockService {
  private rolesSubject = new BehaviorSubject<RolPersonalizado[]>(this.getStoredRoles());
  public roles$ = this.rolesSubject.asObservable();

  private getStoredRoles(): RolPersonalizado[] {
    try {
      const stored = localStorage.getItem(ROLES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RolPersonalizado[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = this.normalizeRoles(parsed);
          const corrupto = normalized.some(r => !r.id || !r.codigo || !Array.isArray(r.modulos));
          if (corrupto) {
            console.warn('Roles en localStorage incompletos, restaurando catálogo base');
            return [...ROLES_INICIALES];
          }
          return normalized;
        }
      }
    } catch (e) {
      console.warn('Error reading stored roles, using initial defaults', e);
    }
    return [...ROLES_INICIALES];
  }

  /** Fusiona roles guardados con el catálogo base para no perder módulos ni metadatos. */
  private normalizeRoles(stored: RolPersonalizado[]): RolPersonalizado[] {
    const mergedBase = ROLES_INICIALES.map(base => {
      const custom = stored.find(
        s => s.id === base.id || s.codigo?.toLowerCase() === base.codigo.toLowerCase()
      );
      if (!custom) return { ...base };
      return {
        ...base,
        ...custom,
        modulos: Array.isArray(custom.modulos) && custom.modulos.length > 0 ? custom.modulos : base.modulos,
        esSistema: base.esSistema,
        badgeClass: custom.badgeClass || base.badgeClass,
      };
    });

    const customOnly = stored
      .filter(s => !ROLES_INICIALES.some(b => b.id === s.id || b.codigo === s.codigo))
      .map(s => ({
        ...s,
        modulos: Array.isArray(s.modulos) ? s.modulos : [],
        esSistema: !!s.esSistema,
      }));

    return [...mergedBase, ...customOnly];
  }

  private saveRoles(roles: RolPersonalizado[]): void {
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    } catch (e) {
      console.warn('Error saving roles to localStorage', e);
    }
    this.rolesSubject.next(roles);
  }

  /** Retorna todos los roles disponibles */
  getRoles(): Observable<RolPersonalizado[]> {
    return this.roles$.pipe(delay(200));
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

  /** Crear un nuevo rol dinámico */
  crearRol(data: {
    nombre: string;
    descripcion: string;
    color: string;
    modulos: string[];
  }): Observable<RolPersonalizado> {
    const current = this.rolesSubject.value;
    const codigoGenerado = data.nombre
      .trim()
      .toUpperCase()
      .replace(/[\s\W-]+/g, '_');

    // Generar clase de badge basada en el color
    const badgeClass = `bg-slate-100 text-slate-800 border-slate-200`;

    const nuevo: RolPersonalizado = {
      id: `rol_${Date.now()}`,
      codigo: codigoGenerado,
      nombre: data.nombre,
      descripcion: data.descripcion || `Rol personalizado con ${data.modulos.length} módulos habilitados`,
      color: data.color || '#004282',
      badgeClass,
      modulos: data.modulos,
      esSistema: false,
      fechaCreacion: new Date().toISOString().split('T')[0],
      usuariosCount: 0
    };

    const actualizados = [...current, nuevo];
    this.saveRoles(actualizados);
    return of(nuevo).pipe(delay(300));
  }

  /** Actualizar un rol existente */
  actualizarRol(id: string, cambios: Partial<RolPersonalizado>): Observable<RolPersonalizado | null> {
    const current = this.rolesSubject.value;
    const index = current.findIndex(r => r.id === id);

    if (index === -1) {
      return of(null);
    }

    const rolExistente = current[index];
    if (isRolPermisosInmutable(rolExistente.codigo)) {
      return of(rolExistente).pipe(delay(300));
    }

    const rolActualizado: RolPersonalizado = {
      ...rolExistente,
      ...cambios,
      // Si es rol de sistema (ej: SuperAdmin), aseguramos que conserve su condición
      esSistema: rolExistente.esSistema
    };

    current[index] = rolActualizado;
    this.saveRoles([...current]);
    return of(rolActualizado).pipe(delay(300));
  }

  /** Eliminar un rol (solo si no es de sistema) */
  eliminarRol(id: string): Observable<{ success: boolean; message?: string }> {
    const current = this.rolesSubject.value;
    const rol = current.find(r => r.id === id);

    if (!rol) {
      return of({ success: false, message: 'El rol no existe.' });
    }

    if (rol.esSistema || ROLES_OFICIALES_NO_ELIMINABLES.includes(rol.codigo)) {
      return of({ success: false, message: 'Los roles oficiales del sistema no pueden ser eliminados.' });
    }

    const actualizados = current.filter(r => r.id !== id);
    this.saveRoles(actualizados);
    return of({ success: true }).pipe(delay(300));
  }

  /** Restaurar roles por defecto */
  resetearRoles(): void {
    this.saveRoles([...ROLES_INICIALES]);
  }
}

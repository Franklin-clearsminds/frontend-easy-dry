import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { RolPersonalizado, ModuloSistema, MODULOS_SISTEMA, ROLES_INICIALES } from '../../domain';

const ROLES_STORAGE_KEY = 'easydry_roles_custom_v2';

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
          return this.mergeSystemRoles(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading stored roles, using initial defaults', e);
    }
    return [...ROLES_INICIALES];
  }

  /** Si el storage quedó con un catálogo viejo, agrega los roles de sistema que falten. */
  private mergeSystemRoles(current: RolPersonalizado[]): RolPersonalizado[] {
    const codes = new Set(current.map(r => r.codigo));
    const missing = ROLES_INICIALES.filter(r => !codes.has(r.codigo));
    if (missing.length === 0) {
      return current;
    }
    const merged = [...current, ...missing];
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* ignore quota */
    }
    return merged;
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
      color: data.color || '#07558C',
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

    if (rol.esSistema) {
      return of({ success: false, message: 'Los roles del sistema no pueden ser eliminados.' });
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

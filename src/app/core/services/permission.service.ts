import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Role, PermisosRol } from '../models/roles.model';
import { MenuItem, MENU_CONFIG } from '../config/menu.config';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private auth = inject(AuthService);

  /** Verifica un permiso específico del rol actual */
  can(permiso: keyof PermisosRol): boolean {
    return this.auth.can(permiso);
  }

  /** Verifica si el usuario tiene alguno de los roles dados */
  hasAnyRole(roles: Role[]): boolean {
    return this.auth.hasAnyRole(roles);
  }

  /** Filtra el menú de navegación según el rol actual */
  getMenuForCurrentRole(): MenuItem[] {
    const userRole = this.auth.getRole();
    if (!userRole) return [];
    return MENU_CONFIG.filter(item => item.roles.includes(userRole));
  }

  /** ── Helpers semánticos de acciones ── */

  canCrearSucursal(): boolean { return this.can('crearSucursal'); }
  canEditarSucursal(): boolean { return this.can('editarSucursal'); }
  canVerTodasSucursales(): boolean { return this.can('verTodasSucursales'); }
  canCrearUsuarios(): boolean { return this.can('crearUsuarios'); }
  canAsignarRoles(): boolean { return this.can('asignarRoles'); }
  canCambiarSucursalOperador(): boolean { return this.can('cambiarSucursalOperador'); }
  canCambiarBahiaOperador(): boolean { return this.can('cambiarBahiaOperador'); }
  canAprobarServicios(): boolean { return this.can('aprobarServicios'); }
  canRechazarServicios(): boolean { return this.can('rechazarServicios'); }
  canCerrarDia(): boolean { return this.can('cerrarDia'); }
  canRegistrarServicio(): boolean { return this.can('registrarServicio'); }
  canVerMaquinaria(): boolean { return this.can('verMaquinaria'); }
  canGestionarMantenimiento(): boolean { return this.can('gestionarMantenimiento'); }
  canRegistrarIncidente(): boolean { return this.can('registrarIncidente'); }
  canVerReportes(): boolean { return this.can('verReportes'); }
  canVerProductividadGlobal(): boolean { return this.can('verProductividadGlobal'); }
  canVerConfiguracion(): boolean { return this.can('verConfiguracion'); }

  /** Verifica si puede ver servicios de otro operador */
  canVerTodosServicios(): boolean { return this.can('verTodosServicios'); }
}

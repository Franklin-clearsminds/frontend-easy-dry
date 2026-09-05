import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { RolMockService } from './rol-mock.service';
import { Role, PermisosRol } from '../models/roles.model';
import { MenuItem, MENU_CONFIG } from '../config/menu.config';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private auth = inject(AuthService);
  private rolService = inject(RolMockService);

  /** Verifica un permiso específico de acción */
  can(permiso: keyof PermisosRol): boolean {
    return this.auth.can(permiso);
  }

  /** Verifica si el usuario tiene acceso a un módulo específico */
  hasModuleAccess(moduloCodigo: string): boolean {
    return this.auth.hasModuleAccess(moduloCodigo);
  }

  /** Verifica si el usuario tiene alguno de los roles dados */
  hasAnyRole(roles: (Role | string)[]): boolean {
    return this.auth.hasAnyRole(roles);
  }

  /** Filtra el menú de navegación dinámicamente según los módulos autorizados */
  getMenuForCurrentRole(): MenuItem[] {
    if (this.auth.isSuperAdmin()) {
      return MENU_CONFIG;
    }
    return MENU_CONFIG.filter(item => this.auth.hasModuleAccess(item.moduloCodigo));
  }

  /** Helpers semánticos de acciones (SuperAdmin siempre retorna true) */
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
  canVerTodosServicios(): boolean { return this.can('verTodosServicios'); }
  canAccionesEnvios(): boolean { return this.can('accionesEnvios'); }
}

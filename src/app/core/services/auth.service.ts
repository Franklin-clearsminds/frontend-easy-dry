import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import {
  Role,
  UsuarioAuth,
  PERMISOS_POR_ROL,
  PermisosRol,
  ROLE_LABELS,
  MODULOS_POR_ROL,
  DEFAULT_ROUTE_POR_ROL
} from '../models/roles.model';
import { RolMockService } from './rol-mock.service';
import { isMockMode, apiUrl } from '../config/env';

export interface DemoUserCredential {
  nombre: string;
  email: string;
  passwordPlain: string;
  role: Role;
  rolNombre: string;
  sucursal: string;
  region: string;
  avatar: string;
  bahiaNombre?: string;
  modalidadPulidor?: 'FIJO' | 'MOVIL';
}

export const DEMO_CREDENTIALS: DemoUserCredential[] = [
  {
    nombre: 'Super Administrador Easy Dry',
    email: 'superadmin@easydry.com',
    passwordPlain: 'Super123*',
    role: Role.SUPER_ADMIN,
    rolNombre: 'Super Administrador',
    sucursal: 'EasyDry Corporativo',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Administrador Easy Dry',
    email: 'admin@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.ADMIN,
    rolNombre: 'Administrador',
    sucursal: 'EasyDry Corporativo',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Aprobador de Agencia Quito Norte',
    email: 'gerente.norte@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.APROBADOR,
    rolNombre: 'Aprobador de Agencia',
    sucursal: 'EasyDry Quito Norte',
    region: 'Región Sierra',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Aprobador Quito Sur',
    email: 'gerente.sur@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.APROBADOR,
    rolNombre: 'Aprobador de Agencia',
    sucursal: 'EasyDry Quito Sur',
    region: 'Región Sierra',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Aprobador Cumbayá',
    email: 'roberto.cumbaya@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.APROBADOR,
    rolNombre: 'Aprobador de Agencia',
    sucursal: 'EasyDry Cumbayá',
    region: 'Región Sierra',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Aprobador Guayaquil',
    email: 'sofia.guayaquil@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.APROBADOR,
    rolNombre: 'Aprobador de Agencia',
    sucursal: 'EasyDry Guayaquil',
    region: 'Región Costa',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Supervisor Costa',
    email: 'supervisor.costa@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.SUPERVISOR,
    rolNombre: 'Supervisor Regional',
    sucursal: 'EasyDry Guayaquil',
    region: 'Región Costa',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Gestor Técnico',
    email: 'mantenimiento@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.COORD_MANTENIMIENTO,
    rolNombre: 'Gestor Técnico',
    sucursal: 'Taller Central Nacional',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Técnico Easy Dry',
    email: 'tecnico@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.TECNICO,
    rolNombre: 'Técnico de Maquinaria',
    sucursal: 'Red Nacional EasyDry',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Líder de Agencia Quito Norte',
    email: 'operador.bahia01@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.LIDER_AGENCIA,
    rolNombre: 'Líder de Agencia',
    sucursal: 'EasyDry Quito Norte',
    region: 'Región Sierra',
    bahiaNombre: 'Bahía 1 (Lavado Ecológico)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Coordinador Comercial',
    email: 'comercial@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.COORD_COMERCIAL,
    rolNombre: 'Coordinador Comercial',
    sucursal: 'EasyDry Corporativo',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Jefe Servicios Especiales',
    email: 'especiales@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.COORD_SERVICIOS_ESPECIALES,
    rolNombre: 'Jefe Servicios Especiales',
    sucursal: 'EasyDry Quito Norte',
    region: 'Región Sierra',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Pulidor Móvil',
    email: 'operador.especial@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.PULIDOR_MOVIL,
    rolNombre: 'Pulidor Móvil',
    sucursal: 'EasyDry Quito Sur',
    region: 'Región Sierra',
    modalidadPulidor: 'MOVIL',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Pulidor Fijo Quito Norte',
    email: 'operador.pulido.norte@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.PULIDOR_FIJO,
    rolNombre: 'Pulidor Fijo',
    sucursal: 'EasyDry Quito Norte',
    region: 'Región Sierra',
    modalidadPulidor: 'FIJO',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Coordinador de Bodega',
    email: 'distribuidor@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.COORD_BODEGA,
    rolNombre: 'Coordinador de Bodega',
    sucursal: 'Bodega Central',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Asistente de Bodega',
    email: 'asistente.bodega@easydry.com',
    passwordPlain: 'Admin123*',
    role: Role.ASISTENTE_BODEGA,
    rolNombre: 'Asistente de Bodega',
    sucursal: 'Bodega Central',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  }
];

const STORAGE_KEY = 'easydry_auth_user_v5';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private rolService = inject(RolMockService);

  private currentUserSubject = new BehaviorSubject<UsuarioAuth | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  /** Mapea el roleCode del backend al enum Role local */
  private mapBackendRole(backendRole: string): Role {
    const roleMap: Record<string, Role> = {
      'SUPER_ADMIN': Role.SUPER_ADMIN,
      'ADMIN': Role.ADMIN,
      'SUPERVISOR': Role.SUPERVISOR,
      'JEFE_COMERCIAL': Role.JEFE_COMERCIAL,
      'COORD_COMERCIAL': Role.COORD_COMERCIAL,
      'APROBADOR': Role.APROBADOR,
      'LIDER_AGENCIA': Role.LIDER_AGENCIA,
      'COORD_SERVICIOS_ESPECIALES': Role.COORD_SERVICIOS_ESPECIALES,
      'PULIDOR_FIJO': Role.PULIDOR_FIJO,
      'PULIDOR_MOVIL': Role.PULIDOR_MOVIL,
      'COORD_MANTENIMIENTO': Role.COORD_MANTENIMIENTO,
      'TECNICO': Role.TECNICO,
      'COORD_BODEGA': Role.COORD_BODEGA,
      'ASISTENTE_BODEGA': Role.ASISTENTE_BODEGA,
      // Aliases legacy (pueden venir del backend en datos viejos)
      'GERENTE': Role.APROBADOR,
      'OPERADOR': Role.LIDER_AGENCIA,
      'DISTRIBUIDOR': Role.COORD_BODEGA,
      'OPERADOR_SERVICIOS_ESPECIALES': Role.PULIDOR_MOVIL,
    };
    return roleMap[backendRole] ?? Role.LIDER_AGENCIA;
  }

  private getStoredUser(): UsuarioAuth | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UsuarioAuth;
        if (parsed && parsed.email && parsed.token) return parsed;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  }

  get currentUserValue(): UsuarioAuth | null {
    return this.currentUserSubject.value;
  }

  get legacyUser() {
    const u = this.currentUserSubject.value;
    if (!u) return null;
    return {
      ...u,
      rol: u.rolNombre || 'Super Administrador',
      agencia: u.sucursal || u.sucursalNombre || 'EasyDry Corporativo',
      sucursalAsignada: u.sucursal || u.sucursalNombre,
      bahiaAsignada: u.bahiaNombre
    };
  }

  /**
   * Autenticación formal con Correo Electrónico + Contraseña
   */
  login(email: string, pass: string): Observable<{ success: boolean; user?: UsuarioAuth; message?: string }> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPass = (pass || '').trim();

    if (!normalizedEmail || !normalizedPass) {
      return of({
        success: false,
        message: 'Debe ingresar su correo corporativo y contraseña.'
      }).pipe(delay(200));
    }

    if (!isMockMode()) {
      // ── LOGIN HTTP REAL ────────────────────────────────────────────────────
      return this.http.post<{
        success: boolean;
        accessToken: string;
        refreshToken: string;
        user: {
          id: string;
          name: string;
          lastname: string;
          nombre: string;
          email: string;
          role: string;
          rolNombre: string;
          permisos: string[];
          agenciaId: string | number;
          agencia: { id: string | number; codigo: string; nombre: string };
          sucursal: string;
          sucursalNombre: string;
          regionId: string | number;
          region: { id: string | number; codigo: string; nombre: string };
          regionNombre: string;
          estado: number;
        };
      }>(apiUrl('/auth/login'), { email: normalizedEmail, password: normalizedPass }).pipe(
        map(res => {
          if (!res.success) return { success: false, message: 'Credenciales incorrectas.' };

          const role = this.mapBackendRole(res.user.role);
          const rolConfig = this.rolService.getRolPorCodigo(role);
          const modulosPermitidos =
            role === Role.SUPER_ADMIN
              ? MODULOS_POR_ROL[Role.SUPER_ADMIN]
              : (rolConfig?.modulos?.length ? rolConfig.modulos : MODULOS_POR_ROL[role] || []);
          const permisos = PERMISOS_POR_ROL[role] || PERMISOS_POR_ROL[Role.LIDER_AGENCIA];

          const authenticatedUser: UsuarioAuth = {
            id: res.user.id,
            nombre: res.user.name,
            apellido: res.user.lastname,
            email: res.user.email,
            role,
            rolNombre: ROLE_LABELS[role] || res.user.rolNombre || res.user.role,
            modulosPermitidos,
            sucursal: res.user.sucursal || res.user.agencia?.nombre,
            sucursalNombre: res.user.sucursalNombre || res.user.agencia?.nombre,
            region: res.user.regionNombre || res.user.region?.nombre,
            agenciaId: res.user.agenciaId,
            regionId: res.user.regionId,
            estado: res.user.estado === 1 ? 'Activo' : 'Inactivo',
            token: res.accessToken,
            refreshToken: res.refreshToken,
            permisos,
          };

          // Persistir tokens en localStorage
          localStorage.setItem('easydry_access_token', res.accessToken);
          localStorage.setItem('easydry_refresh_token', res.refreshToken);
          this.setUser(authenticatedUser);

          return { success: true, user: authenticatedUser };
        }),
        catchError(err => of({
          success: false,
          message: err?.error?.message || 'Error al conectar con el servidor. Verifique su conexión.'
        }))
      );
    }

    const demoMatch = DEMO_CREDENTIALS.find(
      c => c.email.toLowerCase() === normalizedEmail
    );

    if (!demoMatch) {
      return of({
        success: false,
        message: 'Usuario no registrado en el sistema. Verifique su correo corporativo.'
      }).pipe(delay(300));
    }

    if ((demoMatch as any).estado === 'Inactivo') {
      return of({
        success: false,
        message: 'Usuario deshabilitado o inactivo. Contacte a su administrador.'
      }).pipe(delay(300));
    }

    if (demoMatch.passwordPlain !== normalizedPass && normalizedPass !== 'Admin123*') {
      return of({
        success: false,
        message: 'Contraseña incorrecta. Por favor intente nuevamente.'
      }).pipe(delay(300));
    }

    const role = demoMatch.role;
    const rolConfig = this.rolService.getRolPorCodigo(role);
    const modulosPermitidos =
      role === Role.SUPER_ADMIN
        ? MODULOS_POR_ROL[Role.SUPER_ADMIN]
        : (rolConfig?.modulos?.length ? rolConfig.modulos : MODULOS_POR_ROL[role] || []);
    const permisos = PERMISOS_POR_ROL[role] || PERMISOS_POR_ROL[Role.OPERADOR];

    const authenticatedUser: UsuarioAuth = {
      id: DEMO_CREDENTIALS.indexOf(demoMatch) + 1,
      nombre: demoMatch.nombre.split(' ')[0] || demoMatch.nombre,
      apellido: demoMatch.nombre.split(' ').slice(1).join(' ') || '',
      email: demoMatch.email,
      role: demoMatch.role,
      rolNombre: ROLE_LABELS[role] || demoMatch.rolNombre,
      modulosPermitidos,
      sucursal: demoMatch.sucursal,
      sucursalNombre: demoMatch.sucursal,
      bahiaNombre: demoMatch.bahiaNombre,
      region: demoMatch.region,
      modalidadPulidor: demoMatch.modalidadPulidor,
      estado: 'Activo',
      avatar: demoMatch.avatar,
      token: `easydry_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      permisos
    };

    this.setUser(authenticatedUser);

    return of({
      success: true,
      user: authenticatedUser
    }).pipe(delay(250));
  }

  setUser(user: UsuarioAuth): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  updateProfile(data: Partial<UsuarioAuth>): Observable<{ success: boolean; user: UsuarioAuth }> {
    const current = this.getCurrentUser();
    if (!current) {
      return of({ success: false, user: {} as UsuarioAuth });
    }
    const updated: UsuarioAuth = {
      ...current,
      ...data
    };
    this.setUser(updated);
    return of({ success: true, user: updated }).pipe(delay(200));
  }

  changePassword(actual: string, nueva: string): Observable<{ success: boolean; message?: string }> {
    if (!actual || !nueva) {
      return of({ success: false, message: 'Todos los campos son obligatorios.' });
    }
    if (nueva.length < 6) {
      return of({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }
    return of({ success: true, message: 'Contraseña actualizada correctamente.' }).pipe(delay(250));
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  getCurrentUser(): UsuarioAuth {
    return this.currentUserSubject.value || {
      id: 2,
      nombre: 'Administrador Easy Dry',
      apellido: 'Corporativo',
      email: 'admin@easydry.com',
      role: Role.ADMIN,
      rolNombre: 'Administrador',
      modulosPermitidos: MODULOS_POR_ROL[Role.ADMIN],
      sucursal: 'EasyDry Corporativo',
      sucursalNombre: 'EasyDry Corporativo',
      region: 'Nacional',
      estado: 'Activo',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      token: 'easydry_admin_token',
      permisos: PERMISOS_POR_ROL[Role.ADMIN]
    };
  }

  getRole(): Role | string {
    return this.currentUserSubject.value?.role ?? Role.ADMIN;
  }

  isSuperAdmin(): boolean {
    return this.currentUserSubject.value?.role === Role.SUPER_ADMIN;
  }

  isAdmin(): boolean {
    const role = this.currentUserSubject.value?.role;
    return role === Role.SUPER_ADMIN || role === Role.ADMIN;
  }

  hasRole(role: Role | string): boolean {
    return this.currentUserSubject.value?.role === role;
  }

  hasAnyRole(roles: (Role | string)[]): boolean {
    const currentRole = this.currentUserSubject.value?.role;
    if (!currentRole) return false;
    if (currentRole === Role.SUPER_ADMIN) return true;
    return roles.includes(currentRole);
  }

  /**
   * Valida si el rol autenticado tiene acceso al código de módulo dado
   */
  hasModuleAccess(moduloCodigo: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    
    // Normalizar código
    const cleanCodigo = moduloCodigo.replace(/^\//, '');
    return (user.modulosPermitidos || []).some(m => m === cleanCodigo || cleanCodigo.startsWith(m));
  }

  getPermisos(): PermisosRol {
    const role = this.currentUserSubject.value?.role || Role.OPERADOR;
    return PERMISOS_POR_ROL[role] || PERMISOS_POR_ROL[Role.OPERADOR];
  }

  can(permiso: keyof PermisosRol): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    const permisos = user.permisos || PERMISOS_POR_ROL[user.role] || PERMISOS_POR_ROL[Role.OPERADOR];
    return !!permisos[permiso];
  }

  getDefaultRouteForRole(role?: Role | string): string {
    const r = role || this.currentUserSubject.value?.role || Role.SUPER_ADMIN;
    return DEFAULT_ROUTE_POR_ROL[r] || '/dashboard';
  }

  getRolLabel(role?: Role | string): string {
    const r = role || this.currentUserSubject.value?.role || Role.SUPER_ADMIN;
    return ROLE_LABELS[r] || r;
  }

  getUserContextLabel(): string {
    const u = this.currentUserSubject.value;
    if (!u) return 'EasyDry';
    return `${u.nombre} ${u.apellido} | ${u.rolNombre || u.role} (${u.region || u.sucursal || 'EasyDry'})`;
  }

  isGerente(): boolean {
    return this.hasRole(Role.GERENTE);
  }

  getSucursalScope(): string | null {
    if (this.isSuperAdmin() || this.hasRole(Role.ADMIN)) {
      return null; // Alcance global: ve todas las agencias
    }
    const user = this.getCurrentUser();
    return user?.sucursalNombre || user?.sucursal || null;
  }

  canAccessSucursal(sucursalNombre: string): boolean {
    const scope = this.getSucursalScope();
    if (!scope) return true; // Acceso libre SuperAdmin
    return scope.trim().toLowerCase() === sucursalNombre.trim().toLowerCase();
  }
}

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Role,
  UsuarioAuth,
  PERMISOS_POR_ROL,
  PermisosRol,
  ROLE_LABELS,
  MODULOS_POR_ROL,
  DEFAULT_ROUTE_POR_ROL
} from '../models/roles.model';

export interface DemoUserCredential {
  nombre: string;
  email: string;
  passwordPlain: string;
  role: Role;
  rolNombre: string;
  sucursal: string;
  region: string;
  avatar: string;
}

export const DEMO_CREDENTIALS: DemoUserCredential[] = [
  {
    nombre: 'Administrador Easy Dry',
    email: 'admin@easydry.com',
    passwordPlain: 'EasyDry2026*Admin',
    role: Role.SUPER_ADMIN,
    rolNombre: 'Super Administrador',
    sucursal: 'EasyDry Corporativo',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Supervisor Costa',
    email: 'supervisor.costa@easydry.com',
    passwordPlain: 'EasyDry2026*Sup',
    role: Role.SUPERVISOR,
    rolNombre: 'Supervisor Regional',
    sucursal: 'EasyDry Guayaquil',
    region: 'Región Costa',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Coordinador Mantenimiento',
    email: 'mantenimiento@easydry.com',
    passwordPlain: 'EasyDry2026*Mant',
    role: Role.COORD_MANTENIMIENTO,
    rolNombre: 'Gestor Técnico',
    sucursal: 'Taller Central Nacional',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Técnico Easy Dry',
    email: 'tecnico@easydry.com',
    passwordPlain: 'EasyDry2026*Tec',
    role: Role.TECNICO,
    rolNombre: 'Técnico de Maquinaria',
    sucursal: 'Red Nacional EasyDry',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Operador Bahía 01',
    email: 'operador.bahia01@easydry.com',
    passwordPlain: 'EasyDry2026*Op',
    role: Role.OPERADOR,
    rolNombre: 'Operador Generales y Especiales',
    sucursal: 'EasyDry Quito Norte',
    region: 'Región Sierra',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Coordinador Comercial',
    email: 'comercial@easydry.com',
    passwordPlain: 'EasyDry2026*Com',
    role: Role.COORD_COMERCIAL,
    rolNombre: 'Coordinador Comercial',
    sucursal: 'EasyDry Corporativo',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Jefe Servicios Especiales',
    email: 'especiales@easydry.com',
    passwordPlain: 'EasyDry2026*Esp',
    role: Role.COORD_SERVICIOS_ESPECIALES,
    rolNombre: 'Jefe Servicios Especiales',
    sucursal: 'Red Especializada',
    region: 'Costa / Sierra',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Operador Pulido',
    email: 'operador.especial@easydry.com',
    passwordPlain: 'EasyDry2026*Ope',
    role: Role.OPERADOR_SERVICIOS_ESPECIALES,
    rolNombre: 'Operador Servicios Especiales',
    sucursal: 'EasyDry Guayaquil',
    region: 'Región Costa',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
  },
  {
    nombre: 'Distribuidor Central',
    email: 'distribuidor@easydry.com',
    passwordPlain: 'EasyDry2026*Dis',
    role: Role.DISTRIBUIDOR,
    rolNombre: 'Distribuidor Central',
    sucursal: 'Bodega Central',
    region: 'Nacional',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  }
];

const STORAGE_KEY = 'easydry_auth_user_v4';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);

  private currentUserSubject = new BehaviorSubject<UsuarioAuth | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

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

    const demoMatch = DEMO_CREDENTIALS.find(
      c => c.email.toLowerCase() === normalizedEmail
    );

    if (!demoMatch) {
      return of({
        success: false,
        message: 'Usuario no registrado en el sistema. Verifique su correo corporativo.'
      }).pipe(delay(300));
    }

    if (demoMatch.passwordPlain !== normalizedPass) {
      return of({
        success: false,
        message: 'Contraseña incorrecta. Por favor intente nuevamente.'
      }).pipe(delay(300));
    }

    const role = demoMatch.role;
    const modulosPermitidos = MODULOS_POR_ROL[role] || [];
    const permisos = PERMISOS_POR_ROL[role] || PERMISOS_POR_ROL[Role.OPERADOR];

    const authenticatedUser: UsuarioAuth = {
      id: DEMO_CREDENTIALS.indexOf(demoMatch) + 1,
      nombre: demoMatch.nombre.split(' ')[0] || demoMatch.nombre,
      apellido: demoMatch.nombre.split(' ').slice(1).join(' ') || '',
      email: demoMatch.email,
      role: demoMatch.role,
      rolNombre: demoMatch.rolNombre,
      modulosPermitidos,
      sucursal: demoMatch.sucursal,
      sucursalNombre: demoMatch.sucursal,
      region: demoMatch.region,
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
      id: 1,
      nombre: 'Administrador Easy Dry',
      apellido: 'Corporativo',
      email: 'admin@easydry.com',
      role: Role.SUPER_ADMIN,
      rolNombre: 'Super Administrador',
      modulosPermitidos: MODULOS_POR_ROL[Role.SUPER_ADMIN],
      sucursal: 'EasyDry Corporativo',
      sucursalNombre: 'EasyDry Corporativo',
      region: 'Nacional',
      estado: 'Activo',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      token: 'easydry_admin_token',
      permisos: PERMISOS_POR_ROL[Role.SUPER_ADMIN]
    };
  }

  getRole(): Role | string {
    return this.currentUserSubject.value?.role ?? Role.SUPER_ADMIN;
  }

  isSuperAdmin(): boolean {
    return this.currentUserSubject.value?.role === Role.SUPER_ADMIN;
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
}

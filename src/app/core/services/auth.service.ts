import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Role, UsuarioAuth, PERMISOS_POR_ROL, PermisosRol } from '../models/roles.model';

// ─────────────────────────────────────────────────────────
// Usuarios Demo del Sistema RBAC EasyDry®
// ─────────────────────────────────────────────────────────
const DEMO_USUARIOS: UsuarioAuth[] = [
  {
    id: 1,
    nombre: 'Franklin',
    apellido: 'Administrador',
    email: 'admin@easydry.com',
    role: Role.SUPER_ADMIN,
    estado: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellido: 'Mendoza',
    email: 'gerente.quito@easydry.com',
    role: Role.GERENTE,
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    estado: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 4,
    nombre: 'Mateo',
    apellido: 'Guerrero',
    email: 'supervisor.quito@easydry.com',
    role: Role.SUPERVISOR,
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    estado: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 5,
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'operador.bahia1@easydry.com',
    role: Role.OPERADOR,
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    bahiaId: 101,
    bahiaNombre: 'Bahía 1 (Lavado Ecológico)',
    estado: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 6,
    nombre: 'Esteban',
    apellido: 'Torres',
    email: 'tecnico@easydry.com',
    role: Role.TECNICO,
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    estado: 'Activo',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  }
];

const STORAGE_KEY = 'easydry_auth_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UsuarioAuth | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();
  private router = inject(Router);

  // ── Compatibilidad con código legacy (sidebar usa user.rol) ──
  get legacyUser() {
    const u = this.currentUserSubject.value;
    if (!u) return null;
    return {
      ...u,
      rol: this.getRolLabel(u.role),
      agencia: u.sucursalNombre || 'EasyDry Corporativo',
      sucursalAsignada: u.sucursalNombre,
      bahiaAsignada: u.bahiaNombre
    };
  }

  private getStoredUser(): UsuarioAuth | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as UsuarioAuth;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  }

  /** Login con email + password (password es siempre 123456 en demo) */
  login(email: string, pass: string): Observable<{ success: boolean; user?: UsuarioAuth; message?: string }> {
    const found = DEMO_USUARIOS.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (found && pass === '123456') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
      this.currentUserSubject.next(found);
      return of({ success: true, user: found });
    }

    return of({
      success: false,
      message: 'Credenciales inválidas. Usa los accesos demo con contraseña 123456'
    });
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  getCurrentUser(): UsuarioAuth | null {
    return this.currentUserSubject.value;
  }

  getRole(): Role | null {
    return this.currentUserSubject.value?.role ?? null;
  }

  /** Verifica si el usuario tiene exactamente este rol */
  hasRole(role: Role): boolean {
    return this.currentUserSubject.value?.role === role;
  }

  /** Verifica si el usuario tiene alguno de los roles dados */
  hasAnyRole(roles: Role[]): boolean {
    const userRole = this.currentUserSubject.value?.role;
    return !!userRole && roles.includes(userRole);
  }

  /** Retorna los permisos del usuario actual */
  getPermisos(): PermisosRol | null {
    const role = this.getRole();
    return role ? PERMISOS_POR_ROL[role] : null;
  }

  /** Verifica un permiso específico */
  can(permiso: keyof PermisosRol): boolean {
    const permisos = this.getPermisos();
    return permisos ? permisos[permiso] : false;
  }

  /** Retorna el sucursalId del usuario (para filtrado de datos) */
  getScopedSucursalId(): number | null {
    const u = this.currentUserSubject.value;
    if (!u) return null;
    // SUPER_ADMIN no tiene filtro de sucursal
    if (u.role === Role.SUPER_ADMIN) return null;
    return u.sucursalId ?? null;
  }

  /** Retorna el operadorId del usuario (para OPERADOR) */
  getScopedOperadorId(): number | null {
    const u = this.currentUserSubject.value;
    if (u?.role === Role.OPERADOR) return u.id;
    return null;
  }

  /** Label legible del rol */
  getRolLabel(role: Role): string {
    const labels: Record<Role, string> = {
      [Role.SUPER_ADMIN]: 'Super Admin',
      [Role.GERENTE]: 'Gerente',
      [Role.SUPERVISOR]: 'Supervisor',
      [Role.OPERADOR]: 'OPERADOR',
      [Role.TECNICO]: 'Técnico'
    };
    return labels[role] ?? role;
  }

  /** Nombre completo + contexto del usuario actual para el banner */
  getUserContextLabel(): string {
    const u = this.currentUserSubject.value;
    if (!u) return '';
    const nombre = `${u.nombre} ${u.apellido}`;
    if (u.role === Role.SUPER_ADMIN) return `${nombre} | Red Nacional`;
    if (u.role === Role.OPERADOR && u.bahiaNombre) return `${nombre} | ${u.sucursalNombre} | ${u.bahiaNombre}`;
    if (u.sucursalNombre) return `${nombre} | ${u.sucursalNombre}`;
    return nombre;
  }
}

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Role, UsuarioAuth, PERMISOS_POR_ROL, PermisosRol, ROLE_LABELS } from '../models/roles.model';
import { RolMockService } from './rol-mock.service';

export const SUPER_ADMIN_USER: UsuarioAuth = {
  id: 1,
  nombre: 'Franklin',
  apellido: 'Administrador',
  email: 'admin@easydry.com',
  role: Role.SUPER_ADMIN,
  rolNombre: 'Super Administrador',
  estado: 'Activo',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
};

const STORAGE_KEY = 'easydry_auth_user_v3';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private rolService = inject(RolMockService);
  private router = inject(Router);

  private currentUserSubject = new BehaviorSubject<UsuarioAuth | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  private getStoredUser(): UsuarioAuth | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UsuarioAuth;
        if (parsed && parsed.email) return parsed;
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
      agencia: u.sucursalNombre || 'EasyDry Corporativo',
      sucursalAsignada: u.sucursalNombre,
      bahiaAsignada: u.bahiaNombre
    };
  }

  /** Login con email + password */
  login(email: string, pass: string): Observable<{ success: boolean; user?: UsuarioAuth; message?: string }> {
    if (email.toLowerCase() === 'admin@easydry.com' || email.toLowerCase().includes('admin')) {
      this.setUser(SUPER_ADMIN_USER);
      return of({ success: true, user: SUPER_ADMIN_USER }).pipe(delay(250));
    }

    return of({
      success: false,
      message: 'Credenciales inválidas. Usa admin@easydry.com'
    });
  }

  setUser(user: UsuarioAuth): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  updateProfile(data: Partial<UsuarioAuth>): Observable<{ success: boolean; user: UsuarioAuth }> {
    const current = this.getCurrentUser();
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
    return this.currentUserSubject.value || SUPER_ADMIN_USER;
  }

  getRole(): Role | string {
    return this.currentUserSubject.value?.role ?? Role.SUPER_ADMIN;
  }

  isSuperAdmin(): boolean {
    return true;
  }

  hasRole(role: Role | string): boolean {
    return true;
  }

  hasAnyRole(roles: (Role | string)[]): boolean {
    return true;
  }

  hasModuleAccess(moduloCodigo: string): boolean {
    return true;
  }

  getPermisos(): PermisosRol {
    return PERMISOS_POR_ROL[Role.SUPER_ADMIN];
  }

  can(permiso: keyof PermisosRol): boolean {
    return true;
  }

  getScopedSucursalId(): number | null {
    return null;
  }

  getScopedOperadorId(): number | null {
    return null;
  }

  getRolLabel(role?: Role | string): string {
    return 'Super Administrador';
  }

  getUserContextLabel(): string {
    const u = this.currentUserSubject.value;
    if (!u) return 'EasyDry';
    return `${u.nombre} ${u.apellido} | Red Nacional EasyDry®`;
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, catchError, finalize, shareReplay } from 'rxjs/operators';
import {
  Role,
  UsuarioAuth,
  PermisosRol,
  ROLE_LABELS,
  DEFAULT_ROUTE_POR_ROL,
  ACCIONES_VACIAS
} from '../models/roles.model';
import { RolService } from './rol.service';
import { apiUrl, isRealProfilePhoto } from '../config/env';

const STORAGE_KEY = 'easydry_auth_user_v5';
/** Renovar el access token ~5 min antes de que expire. */
const REFRESH_SKEW_MS = 5 * 60 * 1000;
const FALLBACK_REFRESH_MS = 45 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private rolService = inject(RolService);

  private currentUserSubject = new BehaviorSubject<UsuarioAuth | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  private refreshInFlight$: Observable<boolean> | null = null;
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const user = this.getStoredUser();
    if (user?.token) {
      this.rolService.getRoles().subscribe();
      this.rolService.getModulos().subscribe();
      this.scheduleProactiveRefresh();
    }
  }

  getAccessToken(): string | null {
    return this.currentUserSubject.value?.token
      || localStorage.getItem('easydry_access_token');
  }

  getRefreshToken(): string | null {
    return this.currentUserSubject.value?.refreshToken
      || localStorage.getItem('easydry_refresh_token');
  }

  /** true si el access JWT ya venció o vence dentro de `skewMs`. */
  isAccessTokenExpiringSoon(skewMs = REFRESH_SKEW_MS): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    const exp = this.getJwtExpMs(token);
    if (exp == null) return false;
    return Date.now() >= exp - skewMs;
  }

  isAccessTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    const exp = this.getJwtExpMs(token);
    if (exp == null) return false;
    return Date.now() >= exp;
  }

  /**
   * Renueva access + refresh tokens. Deduplica llamadas concurrentes.
   * No cierra sesión aquí: el caller decide (401 vs refresco proactivo).
   */
  refreshSession(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(false);
    }
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http.post<{
      success: boolean;
      accessToken: string;
      refreshToken: string;
    }>(
      apiUrl('/auth/refresh'),
      { refreshToken },
      {
        headers: {
          'X-Skip-Auth-Refresh': '1',
          'X-Silent-Fallback': '1',
        },
      }
    ).pipe(
      map(res => {
        if (!res?.success || !res.accessToken) return false;
        this.applyTokens(res.accessToken, res.refreshToken || refreshToken);
        return true;
      }),
      catchError(() => of(false)),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    return this.refreshInFlight$;
  }

  private applyTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('easydry_access_token', accessToken);
    localStorage.setItem('easydry_refresh_token', refreshToken);
    const current = this.currentUserSubject.value;
    if (current) {
      const updated: UsuarioAuth = { ...current, token: accessToken, refreshToken };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      this.currentUserSubject.next(updated);
    }
    this.scheduleProactiveRefresh();
  }

  private getJwtExpMs(token: string): number | null {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const padded = part.replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(padded);
      const payload = JSON.parse(json) as { exp?: number };
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  scheduleProactiveRefresh(): void {
    this.clearRefreshTimer();
    if (!this.getRefreshToken()) return;

    const token = this.getAccessToken();
    const exp = token ? this.getJwtExpMs(token) : null;
    const delayMs = exp != null
      ? Math.max(exp - Date.now() - REFRESH_SKEW_MS, 15_000)
      : FALLBACK_REFRESH_MS;

    this.refreshTimerId = setTimeout(() => {
      this.refreshSession().subscribe(ok => {
        if (!ok && this.isAccessTokenExpired()) {
          this.logout();
        } else if (ok) {
          // timer reprogramado en applyTokens
        } else {
          // fallo temporal (red): reintentar en 1 min
          this.refreshTimerId = setTimeout(() => this.scheduleProactiveRefresh(), 60_000);
        }
      });
    }, delayMs);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimerId != null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  /** Mapea el roleCode del backend al enum Role local */
  private mapBackendRole(backendRole: string): Role {
    const roleMap: Record<string, Role> = {
      'SUPER_ADMIN': Role.SUPER_ADMIN,
      'ADMIN': Role.ADMIN,
      'SUPERVISOR': Role.SUPERVISOR,
      'JEFE_COMERCIAL': Role.JEFE_COMERCIAL,
      'COORD_COMERCIAL': Role.COORD_COMERCIAL,
      'APROBADOR': Role.APROBADOR,
      'LIDER': Role.LIDER_OPERADOR,
      'LIDER_OPERADOR': Role.LIDER_OPERADOR,
      'LIDER_AGENCIA': Role.LIDER_OPERADOR,
      'OPERADOR': Role.OPERADOR,
      'COORD_SERVICIOS_ESPECIALES': Role.COORD_SERVICIOS_ESPECIALES,
      'PULIDOR': Role.PULIDOR,
      'PULIDOR_FIJO': Role.PULIDOR,
      'PULIDOR_MOVIL': Role.PULIDOR,
      'COORD_MANTENIMIENTO': Role.COORD_MANTENIMIENTO,
      'TECNICO': Role.TECNICO,
      'COORD_BODEGA': Role.COORD_BODEGA,
      'ASISTENTE_BODEGA': Role.ASISTENTE_BODEGA,
      // Aliases legacy (pueden venir del backend en datos viejos)
      'GERENTE': Role.APROBADOR,
      'DISTRIBUIDOR': Role.COORD_BODEGA,
      'OPERADOR_SERVICIOS_ESPECIALES': Role.PULIDOR,
    };
    return roleMap[backendRole] ?? Role.LIDER_OPERADOR;
  }

  private normalizeAcciones(acciones: unknown): PermisosRol {
    if (acciones && typeof acciones === 'object' && !Array.isArray(acciones)) {
      return { ...ACCIONES_VACIAS, ...(acciones as Partial<PermisosRol>) };
    }
    return { ...ACCIONES_VACIAS };
  }

  private sanitizeAvatar(value?: string | null): string {
    return isRealProfilePhoto(value) ? String(value).trim() : '';
  }

  private getStoredUser(): UsuarioAuth | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UsuarioAuth;
        if (parsed && parsed.email && parsed.token) {
          parsed.modulosPermitidos = Array.isArray(parsed.modulosPermitidos)
            ? parsed.modulosPermitidos
            : [];
          if (parsed.role === Role.PULIDOR && !parsed.modulosPermitidos.includes('envios')) {
            parsed.modulosPermitidos.push('envios');
          }
          parsed.permisos = this.normalizeAcciones(parsed.permisos);
          const cleanedAvatar = this.sanitizeAvatar(parsed.avatar);
          if (cleanedAvatar !== (parsed.avatar || '')) {
            parsed.avatar = cleanedAvatar;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          } else {
            parsed.avatar = cleanedAvatar;
          }
          return parsed;
        }
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
      agencia: u.sucursal || u.sucursalNombre || 'Sin sucursal asignada',
      sucursalAsignada: u.sucursal || u.sucursalNombre,
      bahiaAsignada: u.bahiaNombre
    };
  }

  /**
   * Autenticación formal con Correo Electrónico + Contraseña (siempre vía API)
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
        modulos?: string[];
        acciones?: PermisosRol | null;
        agenciaId: string | number;
        agencia: { id: string | number; codigo: string; nombre: string };
        sucursal: string;
        sucursalNombre: string;
        regionId: string | number;
        region: { id: string | number; codigo: string; nombre: string };
        regionNombre: string;
        bodegaId?: string | number;
        estado: number;
        avatar?: string;
        avatarUrl?: string;
      };
    }>(apiUrl('/auth/login'), { email: normalizedEmail, password: normalizedPass }).pipe(
      map(res => {
        if (!res.success) return { success: false, message: 'Credenciales incorrectas.' };

        const role = this.mapBackendRole(res.user.role);
        const modulosPermitidos = [...(res.user.permisos || res.user.modulos || [])];
        const permisos = this.normalizeAcciones(res.user.acciones);

        const isGlobalAdmin = role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.COORD_BODEGA;
        const isSupervisor = role === Role.SUPERVISOR;
        const isAsistente = role === Role.ASISTENTE_BODEGA;
        const isPulidor = role === Role.PULIDOR;
        if (isPulidor && !modulosPermitidos.includes('envios')) {
          modulosPermitidos.push('envios');
        }
        const modalidadPulidor = isPulidor
          ? (res.user.agenciaId || res.user.agencia?.id ? 'FIJO' : 'MOVIL')
          : undefined;

        const authenticatedUser: UsuarioAuth = {
          id: res.user.id,
          nombre: res.user.name,
          apellido: res.user.lastname,
          email: res.user.email,
          role,
          rolNombre: ROLE_LABELS[role] || res.user.rolNombre || res.user.role,
          modulosPermitidos,
          sucursal: (isGlobalAdmin || isSupervisor || isAsistente || (isPulidor && modalidadPulidor === 'MOVIL')) ? undefined : (res.user.sucursal || res.user.agencia?.nombre),
          sucursalNombre: (isGlobalAdmin || isSupervisor || isAsistente || (isPulidor && modalidadPulidor === 'MOVIL')) ? undefined : (res.user.sucursalNombre || res.user.agencia?.nombre),
          region: res.user.regionNombre || res.user.region?.nombre || (isGlobalAdmin ? 'Nacional' : undefined),
          agenciaId: (isGlobalAdmin || isSupervisor || isAsistente || (isPulidor && modalidadPulidor === 'MOVIL')) ? undefined : res.user.agenciaId,
          regionId: isGlobalAdmin ? undefined : res.user.regionId,
          bodegaId: (res.user as any).bodegaId,
          modalidadPulidor,
          servicioIds: Array.isArray((res.user as any).servicioIds)
            ? (res.user as any).servicioIds.map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0)
            : [],
          estado: res.user.estado === 1 ? 'Activo' : 'Inactivo',
          token: res.accessToken,
          refreshToken: res.refreshToken,
          permisos,
          avatar: this.sanitizeAvatar(res.user.avatar || res.user.avatarUrl || ''),
        };

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

  setUser(user: UsuarioAuth): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    if (user?.token) {
      this.rolService.getRoles().subscribe();
      this.rolService.getModulos().subscribe();
      this.scheduleProactiveRefresh();
    }
  }

  updateProfile(data: Partial<UsuarioAuth>): Observable<{ success: boolean; user: UsuarioAuth }> {
    const current = this.getCurrentUser();
    if (!current) {
      return of({ success: false, user: {} as UsuarioAuth });
    }

    return this.http.post<{ success: boolean; user: any }>(apiUrl('/auth/profile'), {
      avatarUrl: data.avatar,
      name: data.nombre,
      lastname: data.apellido,
      email: data.email,
    }).pipe(
      map((res) => {
        const remote = res?.user || {};
        const updated: UsuarioAuth = {
          ...current,
          ...data,
          nombre: remote.name || remote.nombre || data.nombre || current.nombre,
          apellido: remote.lastname || data.apellido || current.apellido,
          email: remote.email || data.email || current.email,
          avatar: this.sanitizeAvatar(remote.avatar || remote.avatarUrl || data.avatar || ''),
        };
        this.setUser(updated);
        return { success: true, user: updated };
      }),
      catchError(() => of({ success: false, user: current }))
    );
  }

  changePassword(actual: string, nueva: string): Observable<{ success: boolean; message?: string }> {
    if (!actual || !nueva) {
      return of({ success: false, message: 'Todos los campos son obligatorios.' });
    }
    if (nueva.length < 6) {
      return of({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }
    return this.http
      .post<{ ok: boolean; message?: string }>(apiUrl('/auth/change-password'), {
        currentPassword: actual,
        newPassword: nueva,
      })
      .pipe(
        map(res => ({ success: true, message: res?.message || 'Contraseña actualizada correctamente.' })),
        catchError(err => {
          const raw = err?.error?.message;
          const message = Array.isArray(raw) ? raw.join(' ') : raw;
          return of({ success: false, message: message || 'No se pudo actualizar la contraseña.' });
        })
      );
  }

  logout(): void {
    this.clearRefreshTimer();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('easydry_access_token');
    localStorage.removeItem('easydry_refresh_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  getCurrentUser(): UsuarioAuth | null {
    return this.currentUserSubject.value;
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

  isLiderOperador(): boolean {
    return this.currentUserSubject.value?.role === Role.LIDER_OPERADOR;
  }

  isOperador(): boolean {
    return this.currentUserSubject.value?.role === Role.OPERADOR;
  }

  hasRole(role: Role | string): boolean {
    return this.currentUserSubject.value?.role === role;
  }

  hasAnyRole(roles: (Role | string)[]): boolean {
    const currentRole = this.currentUserSubject.value?.role;
    if (!currentRole) return false;
    return roles.includes(currentRole);
  }

  /**
   * Valida si el rol autenticado tiene acceso al código de módulo dado
   * (según modulosPermitidos recibidos desde la BD en el login).
   */
  hasModuleAccess(moduloCodigo: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    if (user.role === Role.SUPER_ADMIN) return true;

    const cleanCodigo = moduloCodigo.replace(/^\//, '');
    if (user.role === Role.PULIDOR && (cleanCodigo === 'envios' || cleanCodigo === 'inventario')) {
      return true;
    }
    return (user.modulosPermitidos || []).some(m => m === cleanCodigo || cleanCodigo.startsWith(m));
  }

  getPermisos(): PermisosRol {
    const user = this.currentUserSubject.value;
    if (!user) return { ...ACCIONES_VACIAS };
    return this.normalizeAcciones(user.permisos);
  }

  can(permiso: keyof PermisosRol): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    // Super Admin tiene acceso total e irrestricto a todas las acciones de la plataforma
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }
    if (user.role === Role.PULIDOR && (permiso === 'accionesEnvios' || permiso === 'gestionarInventario')) {
      return true;
    }
    const permisos = this.normalizeAcciones(user.permisos);
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

  isCoordServiciosEspeciales(): boolean {
    if (this.isAdmin()) return false;
    return this.currentUserSubject.value?.role === Role.COORD_SERVICIOS_ESPECIALES;
  }

  isPulidor(): boolean {
    if (this.isAdmin()) return false;
    if (this.isCoordServiciosEspeciales()) return false;
    const r = this.currentUserSubject.value?.role;
    return r === Role.PULIDOR || r === Role.PULIDOR_MOVIL || r === Role.PULIDOR_FIJO || r === Role.OPERADOR_SERVICIOS_ESPECIALES || (typeof r === 'string' && r.toUpperCase().includes('PULIDOR'));
  }

  isPulidorFijo(): boolean {
    const u = this.currentUserSubject.value;
    if (!u || !this.isPulidor()) return false;
    return u.modalidadPulidor === 'FIJO' || !!(u.agenciaId || u.sucursal);
  }

  isPulidorMovil(): boolean {
    const u = this.currentUserSubject.value;
    if (!u || !this.isPulidor()) return false;
    return !this.isPulidorFijo();
  }

  isStaffServiciosEspeciales(): boolean {
    return this.isCoordServiciosEspeciales() || this.isPulidor();
  }

  isGerente(): boolean {
    return this.hasRole(Role.GERENTE);
  }

  getSucursalScope(): string | null {
    if (this.isSuperAdmin() || this.hasRole(Role.ADMIN)) {
      return null;
    }
    const user = this.getCurrentUser();
    return user?.sucursalNombre || user?.sucursal || null;
  }

  canAccessSucursal(sucursalNombre: string): boolean {
    const scope = this.getSucursalScope();
    if (!scope) return true;
    return scope.trim().toLowerCase() === sucursalNombre.trim().toLowerCase();
  }
}

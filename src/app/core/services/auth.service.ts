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
import { MaquinariaService } from './maquinaria.service';
import { NotificationSocketService } from './notification-socket.service';
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
  private maquinariaService = inject(MaquinariaService);
  private notificationSocket = inject(NotificationSocketService);

  private currentUserSubject = new BehaviorSubject<UsuarioAuth | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  private refreshInFlight$: Observable<boolean> | null = null;
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const user = this.getStoredUser();
    if (user?.token) {
      this.cargarCatalogoDeRoles();
      this.scheduleProactiveRefresh();
      this.refrescarPermisos();
      this.notificationSocket.connect(user.token);
    }
  }

  /** El catálogo de roles y módulos solo lo lee quien tiene el permiso 'roles.ver' (evita llamadas que el servidor rechazaría). */
  private cargarCatalogoDeRoles(): void {
    if (!this.puede('roles.ver')) return;
    this.rolService.getRoles().subscribe();
    this.rolService.getModulos().subscribe();
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
          parsed.capacidades = Array.isArray(parsed.capacidades) ? parsed.capacidades : [];
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
  /**
   * Arma el `UsuarioAuth` completo a partir de la respuesta del backend (login o `/auth/me`): ambos
   * comparten el mismo shape de campos (role, rolNombre, agencia, región, bodega, capacidades...).
   * Centralizar esto evita que `refrescarPermisos()` tenga que duplicar la lógica de `login()` (qué
   * campos se ocultan según el rol, cómo se arma `rolNombre`/`modalidadPulidor`, etc.) y quedar
   * desincronizada si esa lógica cambia en un solo lado.
   *
   * `base`: usuario ya cacheado, para los pocos campos que `/auth/me` no devuelve (hoy: `servicioIds`)
   * y así no perderlos al refrescar — `login()` no tiene base (usuario nuevo, arranca en blanco).
   */
  private construirUsuarioDesdeDatos(
    userData: any,
    token: string,
    refreshToken: string,
    base: UsuarioAuth | null = null,
  ): UsuarioAuth {
    const role = this.mapBackendRole(userData.role);
    const modulosPermitidos = [...(userData.permisos || userData.modulos || [])];
    const permisos = this.normalizeAcciones(userData.acciones);

    const isGlobalAdmin = role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.COORD_BODEGA;
    const isSupervisor = role === Role.SUPERVISOR;
    const isAsistente = role === Role.ASISTENTE_BODEGA;
    const isPulidor = role === Role.PULIDOR;
    const modalidadPulidor = isPulidor
      ? (userData.agenciaId || userData.agencia?.id ? 'FIJO' : 'MOVIL')
      : undefined;
    const ocultaUbicacion = isGlobalAdmin || isSupervisor || isAsistente || (isPulidor && modalidadPulidor === 'MOVIL');

    return {
      id: userData.id,
      nombre: userData.name,
      apellido: userData.lastname,
      email: userData.email,
      role,
      rolNombre: ROLE_LABELS[role] || userData.rolNombre || userData.role,
      modulosPermitidos,
      capacidades: Array.isArray(userData.capacidades) ? userData.capacidades : [],
      ambito: userData.ambito,
      sucursal: ocultaUbicacion ? undefined : (userData.sucursal || userData.agencia?.nombre),
      sucursalNombre: ocultaUbicacion ? undefined : (userData.sucursalNombre || userData.agencia?.nombre),
      region: userData.regionNombre || userData.region?.nombre || (isGlobalAdmin ? 'Nacional' : undefined),
      agenciaId: ocultaUbicacion ? undefined : userData.agenciaId,
      regionId: isGlobalAdmin ? undefined : userData.regionId,
      bodegaId: userData.bodegaId,
      modalidadPulidor,
      servicioIds: Array.isArray(userData.servicioIds)
        ? userData.servicioIds.map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0)
        : (base?.servicioIds ?? []),
      estado: userData.estado === 1 ? 'Activo' : 'Inactivo',
      token,
      refreshToken,
      permisos,
      avatar: this.sanitizeAvatar(userData.avatar || userData.avatarUrl || ''),
    };
  }

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
        capacidades?: string[];
        ambito?: string;
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

        const authenticatedUser = this.construirUsuarioDesdeDatos(res.user, res.accessToken, res.refreshToken);

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
      this.cargarCatalogoDeRoles();
      this.scheduleProactiveRefresh();
      this.notificationSocket.connect(user.token);
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


  logout(): void {
    this.clearRefreshTimer();
    this.notificationSocket.disconnect();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('easydry_access_token');
    localStorage.removeItem('easydry_refresh_token');
    this.currentUserSubject.next(null);
    // Sin esto, un logout→login en la misma pestaña deja el caché en memoria de la sesión anterior:
    // si la próxima carga falla, el servicio puede servir la lista del usuario/rol de antes.
    this.maquinariaService.limpiarCache();
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
    return (user.modulosPermitidos || []).some(m => !!m && (m === cleanCodigo || cleanCodigo.startsWith(m + '/')));
  }

  /**
   * ¿Puede el usuario hacer esta acción? Es la MISMA regla que exige el backend en cada endpoint (los permisos del rol).
   * El SUPER_ADMIN siempre puede. Usa códigos como 'servicios.crear' o 'inventario.ver'.
   */
  puede(codigo: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    return (user.capacidades || []).includes(codigo);
  }

  /** ¿Puede al menos una de estas acciones? */
  puedeAlguno(...codigos: string[]): boolean {
    return codigos.some((c) => this.puede(c));
  }

  /**
   * Un usuario que puede iniciar sesión pero no tiene ningún permiso (por ejemplo, un lavador: hoy solo tiene trazabilidad)
   * no usa la plataforma y ve la pantalla de «sin acceso».
   */
  sinAcceso(): boolean {
    const user = this.currentUserSubject.value;
    if (!user || user.role === Role.SUPER_ADMIN) return false;
    return (user.capacidades || []).length === 0;
  }

  /**
   * Vuelve a leer del servidor los permisos y módulos del rol: si un administrador los cambió, se reflejan sin cerrar sesión.
   * Si el rol quedó sin permisos, el usuario pasa a la pantalla de «sin acceso».
   */
  /**
   * Repuebla TODO el usuario cacheado desde `/auth/me` (rol, agencia, región, bodega, permisos...),
   * no solo capacidades/módulos: si a alguien le cambian de rol (o de agencia/región junto con el
   * rol), esto es lo que hace que se refleje sin necesitar logout — hoy solo se llama al arrancar la
   * app (F5 incluido), así que el cambio se ve recién en la próxima carga, no en caliente.
   */
  refrescarPermisos(): void {
    const actual = this.currentUserSubject.value;
    if (!actual?.token) return;
    this.http.post<any>(apiUrl('/auth/me'), {}, { headers: { 'X-Silent-Fallback': '1' } }).subscribe({
      next: (me) => {
        if (!me || !this.currentUserSubject.value) return;
        const actualizado = this.construirUsuarioDesdeDatos(me, actual.token!, actual.refreshToken!, actual);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizado));
        this.currentUserSubject.next(actualizado);
        if (this.sinAcceso() && !this.router.url.startsWith('/sin-acceso')) {
          void this.router.navigate(['/sin-acceso']);
        }
      },
      error: () => { /* sin conexión: se conservan los permisos guardados */ },
    });
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
    const permisos = this.normalizeAcciones(user.permisos);
    return !!permisos[permiso];
  }

  getDefaultRouteForRole(role?: Role | string): string {
    const r = role || this.currentUserSubject.value?.role || Role.SUPER_ADMIN;
    return DEFAULT_ROUTE_POR_ROL[r] || '/dashboard';
  }

  /** A dónde va el usuario al entrar: sin permisos, a «sin acceso»; si no, la ruta de su rol o el primer módulo permitido. */
  rutaInicial(): string {
    if (this.sinAcceso()) return '/sin-acceso';
    const user = this.currentUserSubject.value;
    const deRol = DEFAULT_ROUTE_POR_ROL[String(user?.role)];
    if (deRol && this.hasModuleAccess(deRol)) return deRol;
    const primero = (user?.modulosPermitidos || []).find((m) => m && m !== 'perfil');
    return primero ? '/' + primero : '/perfil';
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

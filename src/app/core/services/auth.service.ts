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
import { FUNCION, funcionesDeRol, type CodigoFuncion } from '../utils/funciones-rol';
import { MaquinariaService } from './maquinaria.service';
import { NotificationSocketService } from './notification-socket.service';
import { LAST_ACTIVITY_KEY, SessionIdleService } from './session-idle.service';
import { apiUrl, isRealProfilePhoto } from '../config/env';
import { MENU_CONFIG } from '../config/menu.config';
import { ToastService } from '../../shared/services/toast.service';

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
  private toast = inject(ToastService);
  private idle = inject(SessionIdleService);

  private currentUserSubject = new BehaviorSubject<UsuarioAuth | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  /**
   * El access token vive SOLO en memoria: no se escribe en localStorage, así que un XSS no puede llevárselo para usarlo después
   * ni desde otro equipo. Al recargar la página se obtiene uno nuevo con la cookie HttpOnly del refresh token (`restaurarSesion`).
   */
  private accessToken: string | null = null;
  /** Estado HTTP del último refresh fallido (0 = sin red). Distingue «sesión inválida» de «no pude conectar». */
  private ultimoErrorRefresh: number | null = null;

  private refreshInFlight$: Observable<boolean> | null = null;
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;
  private lastPermissionsRefreshAt = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.onWindowFocus);
      window.addEventListener('storage', this.onStorageChange);
    }
  }

  /**
   * La cookie del refresh token se comparte entre pestañas. Si en otra pestaña se cierra la sesión (a mano, por inactividad o porque
   * el servidor la dio por terminada), esta debe cerrarse también: su token en memoria ya no podría renovarse.
   */
  private readonly onStorageChange = (e: StorageEvent): void => {
    if (e.key === STORAGE_KEY && e.newValue === null && this.currentUserSubject.value) {
      this.cerrarSesionLocal();
      void this.router.navigate(['/login']);
    }
  };

  /** Cierra la sesión al agotarse el tiempo sin actividad (con aviso previo, ver SessionIdleDialogComponent). */
  private vigilarInactividad(): void {
    this.idle.iniciar(() => this.logout('inactividad'));
  }

  /**
   * Se ejecuta al arrancar la app, antes de la primera ruta. Si hay un usuario guardado en el navegador (sin token), pide el
   * access token con la cookie del refresh token y recién entonces carga permisos y notificaciones.
   * - Respuesta 401/403: la sesión ya no existe en el servidor → se cierra en este navegador.
   * - Sin red o error del servidor: se conserva el usuario; el siguiente refresh lo intentará de nuevo.
   */
  restaurarSesion(): Observable<boolean> {
    if (!this.currentUserSubject.value) return of(false);
    return this.refreshSession().pipe(
      map(ok => {
        if (ok) {
          this.cargarCatalogoDeRoles();
          this.refrescarPermisos();
          this.notificationSocket.connect(() => this.getAccessToken());
          this.vigilarInactividad();
          return true;
        }
        if (this.refreshRechazado()) this.cerrarSesionLocal();
        return false;
      }),
    );
  }

  private readonly onWindowFocus = (): void => {
    if (Date.now() - this.lastPermissionsRefreshAt < 30_000) return;
    this.refrescarPermisos();
  };

  /** El catálogo de roles y módulos solo lo lee quien tiene el permiso 'roles.ver' (evita llamadas que el servidor rechazaría). */
  private cargarCatalogoDeRoles(): void {
    if (!this.puede('roles.ver')) return;
    this.rolService.getRoles().subscribe();
    this.rolService.getModulos().subscribe();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * El refresh token vive en una cookie HttpOnly que pone el servidor: el JavaScript de la página no puede leerlo, así que un
   * XSS no puede robarlo. Aquí solo se pregunta si hay una sesión que renovar.
   */
  hasSession(): boolean {
    return !!this.currentUserSubject.value;
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
    if (!this.hasSession()) {
      return of(false);
    }
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http.post<{
      success: boolean;
      accessToken: string;
    }>(
      apiUrl('/auth/refresh'),
      {},
      {
        withCredentials: true,
        headers: {
          'X-Client': 'web',
          'X-Skip-Auth-Refresh': '1',
          'X-Silent-Fallback': '1',
        },
      }
    ).pipe(
      map(res => {
        if (!res?.success || !res.accessToken) return false;
        this.ultimoErrorRefresh = null;
        this.applyTokens(res.accessToken);
        return true;
      }),
      catchError((err: { status?: number }) => {
        this.ultimoErrorRefresh = typeof err?.status === 'number' ? err.status : 0;
        return of(false);
      }),
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    return this.refreshInFlight$;
  }

  /** true si el servidor rechazó el último refresh (la sesión ya no existe); false si solo falló la conexión. */
  refreshRechazado(): boolean {
    return this.ultimoErrorRefresh === 401 || this.ultimoErrorRefresh === 403;
  }

  private applyTokens(accessToken: string): void {
    this.accessToken = accessToken;
    this.scheduleProactiveRefresh();
  }

  /** Guarda el usuario en el navegador SIN credenciales: ni access token ni refresh token tocan localStorage. */
  private guardarUsuario(user: UsuarioAuth): void {
    const { token: _token, refreshToken: _refresh, ...sinCredenciales } = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sinCredenciales));
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
    if (!this.hasSession()) return;

    const token = this.getAccessToken();
    const exp = token ? this.getJwtExpMs(token) : null;
    const delayMs = exp != null
      ? Math.max(exp - Date.now() - REFRESH_SKEW_MS, 15_000)
      : FALLBACK_REFRESH_MS;

    this.refreshTimerId = setTimeout(() => {
      this.refreshSession().subscribe(ok => {
        if (!ok && this.refreshRechazado()) {
          this.logout('expirada');
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
      'LIDER': Role.LIDER,
      'BACKUP': Role.BACKUP,
      'AUXILIAR': Role.AUXILIAR,
      'COORD_SERVICIOS_ESPECIALES': Role.COORD_SERVICIOS_ESPECIALES,
      'PULIDOR': Role.PULIDOR,
      'COORD_MANTENIMIENTO': Role.COORD_MANTENIMIENTO,
      'TECNICO': Role.TECNICO,
      'COORD_BODEGA': Role.COORD_BODEGA,
      'ASISTENTE_BODEGA': Role.ASISTENTE_BODEGA,
      'LAVADOR': Role.LAVADOR,
    };
    // Un rol creado desde «Roles y Permisos» conserva su propio código: antes se confundía con el Líder Operador.
    return roleMap[backendRole] ?? (String(backendRole || '').toUpperCase() as Role);
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
      // Versiones anteriores guardaban los tokens en localStorage: se borran, ahora el access token vive en memoria y el
      // refresh token en una cookie HttpOnly.
      localStorage.removeItem('easydry_refresh_token');
      localStorage.removeItem('easydry_access_token');
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UsuarioAuth;
        if (parsed && parsed.email) {
          delete parsed.refreshToken;
          delete parsed.token;
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
    base: UsuarioAuth | null = null,
  ): UsuarioAuth {
    const role = this.mapBackendRole(userData.role);
    const modulosPermitidos = [...(userData.permisos || userData.modulos || [])];
    const permisos = this.normalizeAcciones(userData.acciones);

    const funciones = funcionesDeRol(userData.capacidades, userData.role);
    const isGlobalAdmin = funciones.has(FUNCION.ADMINISTRADOR) || funciones.has(FUNCION.COORD_BODEGA);
    const isSupervisor = funciones.has(FUNCION.SUPERVISOR);
    const isAsistente = funciones.has(FUNCION.ASISTENTE_BODEGA);
    const isPulidor = funciones.has(FUNCION.PULIDOR);
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
    }>(
      apiUrl('/auth/login'),
      { email: normalizedEmail, password: normalizedPass },
      { withCredentials: true, headers: { 'X-Client': 'web' } },
    ).pipe(
      map(res => {
        if (!res.success) return { success: false, message: 'Credenciales incorrectas.' };

        const authenticatedUser = this.construirUsuarioDesdeDatos(res.user);

        this.accessToken = res.accessToken;
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
    this.guardarUsuario(user);
    this.currentUserSubject.next(user);
    if (this.accessToken) {
      this.cargarCatalogoDeRoles();
      this.scheduleProactiveRefresh();
      this.notificationSocket.connect(() => this.getAccessToken());
      this.vigilarInactividad();
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


  /** `motivo`: 'inactividad' o 'expirada' llevan al login con el aviso «Tu sesión expiró». */
  logout(motivo?: 'inactividad' | 'expirada'): void {
    // Revoca la sesión en el servidor y borra la cookie del refresh token. Si no hay red, igual se cierra en este navegador.
    if (this.currentUserSubject.value) {
      this.http.post(apiUrl('/auth/logout'), {}, {
        withCredentials: true,
        headers: { 'X-Client': 'web', 'X-Skip-Auth-Refresh': '1', 'X-Silent-Fallback': '1' },
      }).pipe(catchError(() => of(null))).subscribe();
    }
    this.cerrarSesionLocal();
    this.router.navigate(['/login'], motivo ? { queryParams: { expired: 'true' } } : undefined);
  }

  /** Borra todo rastro de la sesión en este navegador (sin avisar al servidor ni navegar). */
  private cerrarSesionLocal(): void {
    this.clearRefreshTimer();
    this.idle.detener();
    this.notificationSocket.disconnect();
    this.accessToken = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('easydry_access_token');
    localStorage.removeItem('easydry_refresh_token');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    this.currentUserSubject.next(null);
    // Sin esto, un logout→login en la misma pestaña deja el caché en memoria de la sesión anterior:
    // si la próxima carga falla, el servicio puede servir la lista del usuario/rol de antes.
    this.maquinariaService.limpiarCache();
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

  /** ¿El rol del usuario tiene esta función (administrador, líder de agencia, pulidor…)? Ver `core/utils/funciones-rol.ts`. */
  tieneFuncion(funcion: CodigoFuncion): boolean {
    const u = this.currentUserSubject.value;
    if (!u) return false;
    return funcionesDeRol(u.capacidades, u.role).has(funcion);
  }

  isAdmin(): boolean {
    return this.tieneFuncion(FUNCION.ADMINISTRADOR);
  }

  isLiderOperador(): boolean {
    return this.tieneFuncion(FUNCION.LIDER_AGENCIA);
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
   * Refresca permisos desde /auth/me antes de entrar a un módulo. El rol puede haber cambiado
   * mientras la sesión sigue abierta en otra pestaña o dispositivo.
   */
  validarAccesoModulo(moduloCodigo: string): Observable<boolean> {
    return this.verificarPermisosActualizados(true).pipe(
      map((actualizado) => actualizado && (this.isSuperAdmin() || this.hasModuleAccess(moduloCodigo))),
    );
  }

  /** Recarga el usuario y permisos actuales del servidor, sin aceptar el caché como confirmación. */
  verificarPermisosActualizados(notificarError = false): Observable<boolean> {
    const actual = this.currentUserSubject.value;
    if (!actual || !this.accessToken) return of(false);

    this.lastPermissionsRefreshAt = Date.now();
    return this.http.post<any>(apiUrl('/auth/me'), {}, { headers: { 'X-Silent-Fallback': '1' } }).pipe(
      map((me) => {
        if (!me || !this.currentUserSubject.value) return false;
        const actualizado = this.construirUsuarioDesdeDatos(me, this.currentUserSubject.value);
        this.guardarUsuario(actualizado);
        this.currentUserSubject.next(actualizado);
        return true;
      }),
      catchError(() => {
        if (notificarError) {
          this.toast.error('No se pudieron verificar los permisos', 'Revisa tu conexión e inténtalo nuevamente.');
        }
        return of(false);
      }),
    );
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
    const tieneModuloDeUso = (user.modulosPermitidos || []).some((modulo) => modulo && modulo !== 'perfil');
    return (user.capacidades || []).length === 0 && !tieneModuloDeUso;
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
    this.verificarPermisosActualizados().subscribe({
      next: (actualizado) => {
        if (!actualizado) return;
        if (this.sinAcceso() && !this.router.url.startsWith('/sin-acceso')) {
          void this.router.navigate(['/sin-acceso']);
          return;
        }
        const ruta = this.router.url.split('?')[0];
        const moduloActual = MENU_CONFIG.find((item) =>
          ruta === item.route || ruta.startsWith(`${item.route}/`),
        )?.moduloCodigo;
        if (moduloActual && !this.hasModuleAccess(moduloActual)) {
          void this.router.navigateByUrl(this.rutaInicial());
        }
      },
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
    return this.tieneFuncion(FUNCION.COORD_ESPECIALES);
  }

  isPulidor(): boolean {
    if (this.isAdmin()) return false;
    if (this.isCoordServiciosEspeciales()) return false;
    return this.tieneFuncion(FUNCION.PULIDOR);
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

  getSucursalScope(): string | null {
    if (this.isSuperAdmin() || this.isAdmin()) {
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

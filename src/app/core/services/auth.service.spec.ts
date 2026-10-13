import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { apiUrl } from '../config/env';
import { Role, UsuarioAuth } from '../models/roles.model';
import { esperar, iniciarSesion, mundo, postComo, proveedoresApiReal, requiereMundo } from '../../../testing/api-real';

/**
 * Contra el backend REAL y la base local (ver `src/testing/api-real.ts`): inicia sesión de verdad con `/auth/login` y
 * refresca permisos con `/auth/me`. Los cambios de rol los hace un administrador real por la API.
 */
describe('AuthService — sincronización de rol (refrescarPermisos)', () => {
  let service: AuthService;

  const estado = () => (service as unknown as { currentUserSubject: { next: (u: UsuarioAuth) => void } }).currentUserSubject;

  beforeEach(() => {
    requiereMundo();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AuthService, ...proveedoresApiReal()] });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    service?.logout();
    localStorage.clear();
  });

  it('un cambio de rol (a uno distinto) se refleja tras refrescarPermisos, sin logout', async () => {
    await iniciarSesion(service, 'cambiante');
    expect(service.getCurrentUser()?.role).toBe(Role.LIDER);

    await postComo('superadmin', '/agencias/usuarios/update', {
      id: mundo.usuarios['cambiante'].id,
      roleId: mundo.rolId['COORD_MANTENIMIENTO'],
      regionId: mundo.regionId,
    });
    service.refrescarPermisos();
    await esperar(() => service.getCurrentUser()?.role === Role.COORD_MANTENIMIENTO);

    const actual = service.getCurrentUser();
    expect(actual?.capacidades).toContain('mantenimientos.ver');
    expect(actual?.ambito).toBe('REGION');
    expect(service.hasRole(Role.COORD_MANTENIMIENTO)).toBe(true);
  });

  it('lee del servidor los permisos de módulo antes de validar una ruta', async () => {
    await iniciarSesion(service, 'lider');
    // El módulo que el servidor entrega al líder es el que se autoriza; uno que no entrega, no.
    const modulos = service.getCurrentUser()?.modulosPermitidos ?? [];
    expect(modulos.length).toBeGreaterThan(0);
    estado().next({ ...service.getCurrentUser()!, modulosPermitidos: [] }); // permisos locales viejos

    const permitido = await firstValueFrom(service.validarAccesoModulo(modulos.find((m) => m !== 'perfil') ?? modulos[0]));

    expect(permitido).toBe(true);
    expect(service.getCurrentUser()?.modulosPermitidos).toEqual(modulos);
  });

  it('considera operativo a un usuario con módulo funcional aunque no tenga capacidades API', async () => {
    await iniciarSesion(service, 'lider');
    estado().next({ ...service.getCurrentUser()!, modulosPermitidos: ['agencias'], capacidades: [] });

    expect(service.sinAcceso()).toBe(false);
    expect(service.rutaInicial()).toBe('/agencias');
  });

  it('mantiene sin acceso al usuario cuyo único módulo es perfil', async () => {
    await iniciarSesion(service, 'lider');
    estado().next({ ...service.getCurrentUser()!, modulosPermitidos: ['perfil'], capacidades: [] });

    expect(service.sinAcceso()).toBe(true);
    expect(service.rutaInicial()).toBe('/sin-acceso');
  });

  it('no autoriza una ruta con permisos locales antiguos si falla la validación del servidor', async () => {
    await iniciarSesion(service, 'lider');
    // Token que el servidor rechaza (y sin cookie de refresh válida): la verificación falla de verdad.
    (service as unknown as { accessToken: string }).accessToken = 'token-invalido';

    const permitido = await firstValueFrom(service.validarAccesoModulo('maquinaria'));

    expect(permitido).toBe(false);
  });

  it('el servidor no deja degradar a un SUPER_ADMIN, así que su sesión conserva isSuperAdmin() tras refrescar', async () => {
    await iniciarSesion(service, 'degradable');
    expect(service.isSuperAdmin()).toBe(true);

    await expectAsync(postComo('superadmin', '/agencias/usuarios/update', {
      id: mundo.usuarios['degradable'].id,
      roleId: mundo.rolId['LIDER'],
      agenciaId: mundo.agenciaId,
    })).toBeRejectedWithError(/403.*de sistema/);
    await firstValueFrom(service.verificarPermisosActualizados());

    expect(service.isSuperAdmin()).toBe(true);
    expect(service.getCurrentUser()?.role).toBe(Role.SUPER_ADMIN);
  });

  it('refreshSession renueva el access token con la cookie HttpOnly (incluye el preflight CORS de las cabeceras de la app)', async () => {
    await iniciarSesion(service, 'lider');

    const ok = await firstValueFrom(service.refreshSession());

    expect(ok).toBeTrue();
    expect(service.getAccessToken()).toBeTruthy();
    expect(service.refreshRechazado()).toBeFalse();
  });

  it('dos renovaciones seguidas con la misma cookie no cierran la sesión (dos pestañas a la vez)', async () => {
    await iniciarSesion(service, 'lider');
    const http = TestBed.inject(HttpClient);
    const renovar = () => firstValueFrom(http.post<{ success: boolean; accessToken: string }>(
      apiUrl('/auth/refresh'), {}, { withCredentials: true, headers: { 'X-Client': 'web', 'X-Skip-Auth-Refresh': '1', 'X-Silent-Fallback': '1' } }));

    const [a, b] = await Promise.all([renovar(), renovar()]);

    expect(a.accessToken).toBeTruthy();
    expect(b.accessToken).toBeTruthy();
  });

  it('logout revoca la sesión en el servidor: la cookie ya no renueva', async () => {
    await iniciarSesion(service, 'lider');
    const http = TestBed.inject(HttpClient);
    const renovar = () => firstValueFrom(http.post(apiUrl('/auth/refresh'), {},
      { withCredentials: true, headers: { 'X-Client': 'web', 'X-Skip-Auth-Refresh': '1', 'X-Silent-Fallback': '1' } }));

    service.logout();
    await new Promise((r) => setTimeout(r, 600)); // el aviso al servidor es asíncrono

    await expectAsync(renovar()).toBeRejected();
  });

  it('mantiene el token actual (/auth/me no devuelve tokens nuevos)', async () => {
    await iniciarSesion(service, 'lider');
    const token = service.getAccessToken();
    expect(token).toBeTruthy();

    await firstValueFrom(service.verificarPermisosActualizados());

    expect(service.getAccessToken()).toBe(token);
  });

  it('no guarda ningún token en el navegador: el access token vive en memoria y el refresh token es una cookie HttpOnly', async () => {
    await iniciarSesion(service, 'lider');
    const token = service.getAccessToken()!;
    expect(token).toBeTruthy();

    expect(service.getCurrentUser()?.token).toBeFalsy();
    expect(service.getCurrentUser()?.refreshToken).toBeFalsy();
    expect(localStorage.getItem('easydry_access_token')).toBeNull();
    expect(localStorage.getItem('easydry_refresh_token')).toBeNull();
    for (let i = 0; i < localStorage.length; i++) {
      const valor = localStorage.getItem(localStorage.key(i)!) ?? '';
      expect(valor).not.toContain(token);
    }
  });

  it('al cerrar sesión se borra el token de memoria', async () => {
    await iniciarSesion(service, 'lider');
    service.logout();

    expect(service.getAccessToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('preserva servicioIds existentes: /auth/me no los devuelve', async () => {
    await iniciarSesion(service, 'lider');
    estado().next({ ...service.getCurrentUser()!, servicioIds: [7] });

    await firstValueFrom(service.verificarPermisosActualizados());

    expect(service.getCurrentUser()?.servicioIds).toEqual([7]);
  });
});

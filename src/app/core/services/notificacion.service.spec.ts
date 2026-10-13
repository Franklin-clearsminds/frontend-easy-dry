import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { NotificacionService } from './notificacion.service';
import { AuthService } from './auth.service';
import { esperar, iniciarSesion, mundo, postComo, proveedoresApiReal, requiereMundo } from '../../../testing/api-real';

/**
 * Contra el backend REAL, la base local y el socket real (ver `src/testing/api-real.ts`). Cada prueba que modifica
 * notificaciones usa su propio usuario del mundo (`lectorUno`, `lectorTodas`, `enVivo`) para no afectarse entre sí.
 */
describe('NotificacionService', () => {
  let service: NotificacionService;
  let auth: AuthService;

  const lista = () => (service as unknown as { notificacionesSubject: { value: { id: string; titulo: string; leida: boolean }[] } }).notificacionesSubject.value;

  beforeEach(() => {
    requiereMundo();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [NotificacionService, AuthService, ...proveedoresApiReal()] });
    service = TestBed.inject(NotificacionService);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    auth?.logout(); // desconecta el socket
    localStorage.clear();
  });

  it('getNotificaciones trae el historial real, mapea el tipo del backend y actualiza notificaciones$', async () => {
    await iniciarSesion(auth, 'notificado');

    const items = await firstValueFrom(service.getNotificaciones());

    expect(items.map((n) => n.id)).toEqual(mundo.notificaciones['notificado']); // más reciente primero
    expect(items[0]).toEqual(jasmine.objectContaining({ tipo: 'alerta', leida: false, enlace: '/inventario' }));
    expect(items[1]).toEqual(jasmine.objectContaining({ tipo: 'exito', leida: true, enlace: '/maquinaria' }));
    expect(lista().map((n) => n.id)).toEqual(mundo.notificaciones['notificado']);
  });

  it('getPendientes trae del servidor lo pendiente del ámbito del usuario, con enlace según el origen', async () => {
    await iniciarSesion(auth, 'lider');

    const pendientes = await firstValueFrom(service.getPendientes());

    expect(pendientes).not.toBeNull();
    for (const p of pendientes!) {
      expect(['critica', 'advertencia', 'info']).toContain(p.severidad);
      expect(p.enlace).toBe(p.grupo === 'stock' ? '/inventario' : '/maquinaria');
    }
  });

  it('getPendientes devuelve null si el rol no puede ver stock ni mantenimiento (la pestaña no se muestra)', async () => {
    await iniciarSesion(auth, 'soloVer');

    expect(await firstValueFrom(service.getPendientes())).toBeNull();
  });

  it('mapea cambios de permisos del rol como notificación de sistema con enlace a roles', async () => {
    await iniciarSesion(auth, 'notificado');

    const resultado = await firstValueFrom(service.getNotificacionesPagina({ page: 1, pageSize: 20, tipos: ['USUARIO_ACTUALIZADO'] }));

    expect(resultado.items.map((n) => n.id)).toEqual([mundo.notificaciones['notificado'][2]]);
    expect(resultado.items[0]).toEqual(jasmine.objectContaining({ tipo: 'sistema', enlace: '/usuarios', enlaceLabel: 'Ver Roles' }));
  });

  it('getNotificacionesPagina envía página y tipos y devuelve metadatos paginados', async () => {
    await iniciarSesion(auth, 'notificado');

    const segunda = await firstValueFrom(service.getNotificacionesPagina({ page: 2, pageSize: 2 }));
    expect(segunda).toEqual(jasmine.objectContaining({ total: 3, page: 2, pageSize: 2, totalPages: 2 }));
    expect(segunda.items.map((n) => n.id)).toEqual([mundo.notificaciones['notificado'][2]]);

    const filtrada = await firstValueFrom(service.getNotificacionesPagina({ page: 1, pageSize: 20, tipos: ['STOCK_CRITICO'] }));
    expect(filtrada).toEqual(jasmine.objectContaining({ total: 1, page: 1, totalPages: 1 }));
    expect(filtrada.items[0]).toEqual(jasmine.objectContaining({ id: mundo.notificaciones['notificado'][0], tipo: 'alerta' }));
  });

  it('getResumen cuenta las pendientes reales del usuario', async () => {
    await iniciarSesion(auth, 'notificado');
    expect(await firstValueFrom(service.getResumen())).toEqual({ pendientes: 2 });
  });

  it('getNotificaciones sin sesión no rompe: el servidor responde 401 y se conserva la lista anterior', async () => {
    const items = await firstValueFrom(service.getNotificaciones());
    expect(items).toEqual([]);
  });

  it('una notificación nueva por WebSocket se antepone a la lista en memoria', async () => {
    await iniciarSesion(auth, 'enVivo');
    await new Promise((r) => setTimeout(r, 1500)); // el socket real necesita conectarse y autenticarse

    // Un administrador real le cambia el rol: el servidor le notifica en vivo.
    await postComo('superadmin', '/agencias/usuarios/update', {
      id: mundo.usuarios['enVivo'].id,
      roleId: mundo.rolId['COORD_MANTENIMIENTO'],
      regionId: mundo.regionId,
    });
    await esperar(() => lista().length === 1);

    expect(lista()[0].titulo).toBe('Tu cuenta fue actualizada');
    expect(String(lista()[0].id)).toMatch(/^live-/);
  });

  it('marcarComoLeida actualiza localmente y en el servidor', async () => {
    await iniciarSesion(auth, 'lectorUno');
    const [id] = mundo.notificaciones['lectorUno'];
    await firstValueFrom(service.getNotificaciones());
    expect(lista().find((n) => n.id === id)?.leida).toBe(false);

    await service.marcarComoLeida(id);

    expect(lista().find((n) => n.id === id)?.leida).toBe(true);
    // Relee del servidor: quedó guardada como leída.
    const desdeServidor = await firstValueFrom(service.getNotificaciones());
    expect(desdeServidor.find((n) => n.id === id)?.leida).toBe(true);
    expect(await firstValueFrom(service.getResumen())).toEqual({ pendientes: 0 });
  });

  it('marcarTodasComoLeidas marca todo localmente y en el servidor', async () => {
    await iniciarSesion(auth, 'lectorTodas');
    await firstValueFrom(service.getNotificaciones());
    expect(lista().every((n) => n.leida)).toBe(false);

    await service.marcarTodasComoLeidas();

    expect(lista().every((n) => n.leida)).toBe(true);
    const desdeServidor = await firstValueFrom(service.getNotificaciones());
    expect(desdeServidor.length).toBe(2);
    expect(desdeServidor.every((n) => n.leida)).toBe(true);
  });
});

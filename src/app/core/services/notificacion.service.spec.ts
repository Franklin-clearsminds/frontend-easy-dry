import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { NotificacionService } from './notificacion.service';
import { NotificationSocketService, NotificationPayload } from './notification-socket.service';

describe('NotificacionService', () => {
  let httpPost: jasmine.Spy;
  let nuevaNotificacion$: Subject<NotificationPayload>;
  let service: NotificacionService;

  beforeEach(() => {
    httpPost = jasmine.createSpy('post');
    nuevaNotificacion$ = new Subject<NotificationPayload>();

    TestBed.configureTestingModule({
      providers: [
        NotificacionService,
        { provide: HttpClient, useValue: { post: httpPost } },
        { provide: NotificationSocketService, useValue: { onNuevaNotificacion: nuevaNotificacion$.asObservable() } },
      ],
    });
    service = TestBed.inject(NotificacionService);
  });

  it('getNotificaciones mapea el tipo del backend y actualiza notificaciones$', (done) => {
    httpPost.and.returnValue(of({
      items: [
        { id: 'n1', tipo: 'STOCK_CRITICO', titulo: 'Stock crítico', mensaje: 'Shampoo bajo', leida: false, entidadTipo: 'INSUMO', createdAt: '2026-10-02T10:00:00.000Z' },
        { id: 'n2', tipo: 'INCIDENCIA_RESUELTA', titulo: 'Reparado', mensaje: 'OK', leida: true, entidadTipo: 'MAQUINARIA', createdAt: '2026-10-02T09:00:00.000Z' },
      ],
    }));

    service.notificaciones$.subscribe((lista) => {
      if (lista.length === 0) return;
      expect(lista[0]).toEqual(jasmine.objectContaining({ id: 'n1', tipo: 'alerta', leida: false, enlace: '/inventario' }));
      expect(lista[1]).toEqual(jasmine.objectContaining({ id: 'n2', tipo: 'exito', leida: true, enlace: '/maquinaria' }));
      done();
    });

    service.getNotificaciones().subscribe();
  });

  it('getNotificaciones sin red no rompe: conserva la lista anterior', async () => {
    httpPost.and.returnValue(throwError(() => new Error('sin red')));
    const lista = await new Promise((resolve) => service.getNotificaciones().subscribe(resolve));
    expect(lista).toEqual([]);
  });

  it('una notificación nueva por WebSocket se antepone a la lista en memoria', () => {
    nuevaNotificacion$.next({
      tipo: 'INCIDENTE_NUEVO', titulo: 'Incidente', mensaje: 'Falla', leida: false,
      entidadTipo: 'MAQUINARIA', createdAt: new Date().toISOString(),
    });
    const lista = (service as unknown as { notificacionesSubject: { value: unknown[] } }).notificacionesSubject.value;
    expect(lista.length).toBe(1);
    expect((lista[0] as { titulo: string }).titulo).toBe('Incidente');
  });

  it('marcarComoLeida actualiza localmente y llama al backend (salvo que sea una notificación "live")', async () => {
    httpPost.and.returnValue(of({ items: [{ id: 'n1', tipo: 'STOCK_CRITICO', titulo: 'T', mensaje: 'M', leida: false, createdAt: new Date().toISOString() }] }));
    await new Promise((resolve) => service.getNotificaciones().subscribe(resolve));

    httpPost.calls.reset();
    httpPost.and.returnValue(of({ success: true }));
    await service.marcarComoLeida('n1');

    expect(httpPost).toHaveBeenCalledWith(jasmine.stringMatching(/marcar-leida$/), { notificacionId: 'n1' });
    const actualizado = (service as unknown as { notificacionesSubject: { value: { id: string; leida: boolean }[] } }).notificacionesSubject.value;
    expect(actualizado.find((n) => n.id === 'n1')?.leida).toBe(true);
  });

  it('marcarTodasComoLeidas marca todo localmente y llama al backend', async () => {
    httpPost.and.returnValue(of({
      items: [
        { id: 'n1', tipo: 'STOCK_CRITICO', titulo: 'T', mensaje: 'M', leida: false, createdAt: new Date().toISOString() },
        { id: 'n2', tipo: 'STOCK_CRITICO', titulo: 'T2', mensaje: 'M2', leida: false, createdAt: new Date().toISOString() },
      ],
    }));
    await new Promise((resolve) => service.getNotificaciones().subscribe(resolve));

    httpPost.calls.reset();
    httpPost.and.returnValue(of({ success: true }));
    await service.marcarTodasComoLeidas();

    expect(httpPost).toHaveBeenCalledWith(jasmine.stringMatching(/marcar-todas-leidas$/), {});
    const actualizado = (service as unknown as { notificacionesSubject: { value: { leida: boolean }[] } }).notificacionesSubject.value;
    expect(actualizado.every((n) => n.leida)).toBe(true);
  });
});

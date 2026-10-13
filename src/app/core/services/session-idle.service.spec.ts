import { TestBed } from '@angular/core/testing';
import { LAST_ACTIVITY_KEY, SessionIdleService } from './session-idle.service';

/** Reloj simulado: no espera tiempo real. Aquí 10 s de inactividad máxima y aviso en los últimos 3 s. */
describe('SessionIdleService', () => {
  const OPCIONES = { idleMs: 10_000, warningMs: 3_000 };
  let service: SessionIdleService;
  let alAgotarse: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 9, 13, 10, 0, 0));
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionIdleService);
    alAgotarse = jasmine.createSpy('alAgotarse');
    service.iniciar(alAgotarse, OPCIONES);
  });

  afterEach(() => {
    service.detener();
    jasmine.clock().uninstall();
    localStorage.clear();
  });

  it('sin actividad avisa en el margen previo y cierra al agotarse el tiempo', () => {
    jasmine.clock().tick(6_000);
    expect(service.estado().advertencia).toBeFalse();

    jasmine.clock().tick(1_000); // 7 s: quedan 3
    expect(service.estado()).toEqual({ advertencia: true, segundosRestantes: 3 });

    jasmine.clock().tick(2_000); // 9 s: queda 1
    expect(service.estado().segundosRestantes).toBe(1);
    expect(alAgotarse).not.toHaveBeenCalled();

    jasmine.clock().tick(1_000); // 10 s
    expect(alAgotarse).toHaveBeenCalledTimes(1);
    expect(service.estado().advertencia).toBeFalse();
  });

  it('la actividad reinicia la cuenta', () => {
    jasmine.clock().tick(6_000);
    window.dispatchEvent(new Event('mousemove'));
    jasmine.clock().tick(6_000); // 6 s desde la última actividad: todavía sin aviso

    expect(service.estado().advertencia).toBeFalse();
    expect(alAgotarse).not.toHaveBeenCalled();
  });

  it('con el aviso abierto, mover el ratón no lo cancela: hay que pulsar «Seguir conectado»', () => {
    jasmine.clock().tick(8_000);
    expect(service.estado().advertencia).toBeTrue();

    window.dispatchEvent(new Event('mousemove'));
    window.dispatchEvent(new Event('keydown'));
    jasmine.clock().tick(1_000);
    expect(service.estado().advertencia).toBeTrue();

    service.extender();
    expect(service.estado().advertencia).toBeFalse();
    jasmine.clock().tick(9_000);
    expect(alAgotarse).not.toHaveBeenCalled();
  });

  it('la actividad en otra pestaña (misma marca en localStorage) cancela el aviso de esta', () => {
    jasmine.clock().tick(8_000);
    expect(service.estado().advertencia).toBeTrue();

    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); // lo que escribiría la otra pestaña
    jasmine.clock().tick(1_000);

    expect(service.estado().advertencia).toBeFalse();
    expect(alAgotarse).not.toHaveBeenCalled();
  });

  it('si el equipo estuvo suspendido más del límite, cierra en la siguiente comprobación', () => {
    jasmine.clock().mockDate(new Date(2026, 9, 13, 13, 0, 0)); // saltan 3 h de golpe
    jasmine.clock().tick(1_000);

    expect(alAgotarse).toHaveBeenCalledTimes(1);
  });

  it('detener() deja de vigilar y no vuelve a llamar', () => {
    service.detener();
    jasmine.clock().tick(60_000);

    expect(alAgotarse).not.toHaveBeenCalled();
    expect(service.estado().advertencia).toBeFalse();
  });
});

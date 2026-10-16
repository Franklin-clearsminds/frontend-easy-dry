import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OperadorService } from './operador.service';
import { Operador } from '../models';

/** Sin red: HttpTestingController intercepta las peticiones. */
describe('OperadorService.actualizarOperador — bahía en reserva', () => {
  let service: OperadorService;
  let http: HttpTestingController;

  const operador = (bahiaId: Operador['bahiaId']): Operador =>
    ({ id: 'op1', nombre: 'Ana', cedula: '', telefono: '', rol: 'LAVADOR', sucursal: 'A1', sucursalId: 'ag1', bahia: '', bahiaId, estado: 'Activo' }) as Operador;

  const cuerpoEnviado = () => {
    const req = http.expectOne((r) => r.url.endsWith('/agencias/operadores/update'));
    const cuerpo = req.request.body as Record<string, unknown>;
    req.flush({ id: 'op1' });
    return cuerpo;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OperadorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('null = «dejar sin bahía (en reserva)»: viaja como cadena vacía para que el servidor la quite', () => {
    service.actualizarOperador(operador(null)).subscribe();

    const cuerpo = cuerpoEnviado();
    expect('bahiaId' in cuerpo).toBeTrue();
    expect(cuerpo['bahiaId']).toBe('');
  });

  it('una bahía elegida viaja con su id', () => {
    service.actualizarOperador(operador('bahia-7')).subscribe();

    expect(cuerpoEnviado()['bahiaId']).toBe('bahia-7');
  });

  it('undefined = «no tocar la bahía»: el campo no viaja (antes tampoco viajaba al querer dejarla en reserva)', () => {
    service.actualizarOperador(operador(undefined)).subscribe();

    expect(cuerpoEnviado()['bahiaId']).toBeUndefined();
  });
});

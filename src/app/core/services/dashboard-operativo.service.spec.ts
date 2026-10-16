import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardOperativoService } from './dashboard-operativo.service';

/** Sin red: HttpTestingController intercepta las peticiones. */
describe('DashboardOperativoService — alertas de stock según el permiso', () => {
  let service: DashboardOperativoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DashboardOperativoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sin el permiso de ver alertas NO las pide (el servidor respondería 403 y saldría un aviso de error)', () => {
    service.getDashboardDistribuidor({ rango: 'HOY' }, false).subscribe();

    http.expectNone((r) => r.url.endsWith('/inventario/alertas/list'));
    // El consumo de insumos es otro permiso y sí se pide.
    http.expectOne((r) => r.url.endsWith('/analytics/consumo-quimicos')).flush({ insumos: [] });
  });

  it('con el permiso las pide', () => {
    service.getDashboardDistribuidor({ rango: 'HOY' }, true).subscribe();

    http.expectOne((r) => r.url.endsWith('/inventario/alertas/list')).flush([]);
    http.expectOne((r) => r.url.endsWith('/analytics/consumo-quimicos')).flush({ insumos: [] });
  });

  it('por omisión conserva el comportamiento anterior (las pide)', () => {
    service.getDashboardDistribuidor({}).subscribe();

    http.expectOne((r) => r.url.endsWith('/inventario/alertas/list')).flush([]);
    http.expectOne((r) => r.url.endsWith('/analytics/consumo-quimicos')).flush({ insumos: [] });
  });

  it('un 403 de alertas no rompe el resto del tablero: devuelve lista vacía', () => {
    let resultado: unknown;
    service.getDashboardDistribuidor({}, true).subscribe((d) => (resultado = d));

    http.expectOne((r) => r.url.endsWith('/inventario/alertas/list')).flush({ message: 'Tu rol no tiene permiso para esta acción.' }, { status: 403, statusText: 'Forbidden' });
    http.expectOne((r) => r.url.endsWith('/analytics/consumo-quimicos')).flush({ insumos: [] });

    expect(resultado).toBeTruthy();
  });
});

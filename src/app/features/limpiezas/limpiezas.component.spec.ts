import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { of, throwError } from 'rxjs';
import { LimpiezasComponent } from './limpiezas.component';
import { LimpiezaMaquinaria, MaquinariaService } from '../../core/services/maquinaria.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { EASYDRY_ICONS } from '../../shared/icons/lucide-icons';

function registro(over: Partial<LimpiezaMaquinaria> = {}): LimpiezaMaquinaria {
  return {
    id: 'lim-1',
    maquinariaId: 'm1',
    fecha: '2026-01-01T00:00:00.000Z',
    tipo: 'PULIDOR',
    fotos: [],
    observaciones: 'Todo en orden',
    registradoPorId: 'u1',
    maquinaria: { id: 'm1', codigo: 'MQ-01', nombre: 'Hidro' },
    registradoPor: { id: 'u1', name: 'Juan', lastname: 'Pérez' },
    ...over,
  };
}

describe('LimpiezasComponent', () => {
  let fixture: ComponentFixture<LimpiezasComponent>;
  let component: LimpiezasComponent;
  let maquinariaService: jasmine.SpyObj<MaquinariaService>;
  let authService: { puede: jasmine.Spy };
  let toastService: jasmine.SpyObj<ToastService>;

  function configurar(puedeEditar: boolean): void {
    maquinariaService = jasmine.createSpyObj<MaquinariaService>('MaquinariaService', [
      'getLimpiezasPagina', 'getResumenLimpiezas', 'getMaquinaria', 'exportarLimpiezas', 'editarLimpieza', 'eliminarLimpieza',
    ]);
    maquinariaService.getLimpiezasPagina.and.returnValue(
      of({ items: [registro()], total: 1, page: 1, pageSize: 50, totalPages: 1, hasNextPage: false, hasPrevPage: false }),
    );
    maquinariaService.getResumenLimpiezas.and.returnValue(of({ pendientes: 3 }));
    maquinariaService.getMaquinaria.and.returnValue(of([{ id: 'm1', codigo: 'MQ-01', nombre: 'Hidro' } as never]));

    authService = { puede: jasmine.createSpy('puede').and.returnValue(puedeEditar) };
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'warning', 'error', 'info', 'show']);

    TestBed.configureTestingModule({
      imports: [LimpiezasComponent],
      providers: [
        importProvidersFrom(LucideAngularModule.pick(EASYDRY_ICONS)),
        { provide: MaquinariaService, useValue: maquinariaService },
        { provide: AuthService, useValue: authService },
        { provide: ToastService, useValue: toastService },
      ],
    });

    fixture = TestBed.createComponent(LimpiezasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('carga el resumen de atrasadas, la lista y las máquinas del alcance al iniciar', () => {
    configurar(true);
    expect(component.pendientes).toBe(3);
    expect(component.lista.items.length).toBe(1);
    expect(component.maquinas).toEqual([{ id: 'm1', codigo: 'MQ-01', nombre: 'Hidro' }]);
    expect(maquinariaService.getLimpiezasPagina).toHaveBeenCalled();
  });

  it('oculta los botones de editar/eliminar sin el permiso "limpiezas.editar"', () => {
    configurar(false);
    expect(component.puedeEditar).toBe(false);
    const botones = fixture.nativeElement.querySelectorAll('button');
    const textos = Array.from(botones as NodeListOf<HTMLButtonElement>).map((b) => b.textContent || '');
    expect(textos.some((t) => t.includes('Editar'))).toBe(false);
    expect(textos.some((t) => t.includes('Eliminar'))).toBe(false);
  });

  it('muestra los botones de editar/eliminar con el permiso', () => {
    configurar(true);
    const botones = fixture.nativeElement.querySelectorAll('button');
    const textos = Array.from(botones as NodeListOf<HTMLButtonElement>).map((b) => b.textContent || '');
    expect(textos.some((t) => t.includes('Editar'))).toBe(true);
    expect(textos.some((t) => t.includes('Eliminar'))).toBe(true);
  });

  it('cambiar el filtro de máquina reinicia la lista con el maquinariaId elegido', () => {
    configurar(true);
    maquinariaService.getLimpiezasPagina.calls.reset();
    component.filtroMaquinariaId = 'm1';
    component.onFiltroMaquinaChange();
    expect(maquinariaService.getLimpiezasPagina).toHaveBeenCalledWith(
      jasmine.objectContaining({ maquinariaId: 'm1' }),
    );
  });

  it('abrirEditar precarga las observaciones actuales', () => {
    configurar(true);
    const r = registro({ observaciones: 'Faltó secar bien' });
    component.abrirEditar(r);
    expect(component.editando).toBe(r);
    expect(component.editarObservaciones).toBe('Faltó secar bien');
  });

  it('guardarEditar llama al servicio, recarga la lista y muestra un toast de éxito', async () => {
    configurar(true);
    maquinariaService.editarLimpieza.and.returnValue(of({ success: true }));
    component.abrirEditar(registro());
    component.editarObservaciones = 'Nueva observación';
    await component.guardarEditar();
    expect(maquinariaService.editarLimpieza).toHaveBeenCalledWith('lim-1', 'Nueva observación');
    expect(toastService.success).toHaveBeenCalled();
    expect(component.editando).toBeNull();
  });

  it('guardarEditar muestra el error del servidor y no cierra el modal si falla', async () => {
    configurar(true);
    maquinariaService.editarLimpieza.and.returnValue(throwError(() => ({ error: { message: 'No autorizado' } })));
    component.abrirEditar(registro());
    await component.guardarEditar();
    expect(component.editarError).toBe('No autorizado');
    expect(component.editando).not.toBeNull();
  });

  it('eliminar no llama al backend si el usuario cancela la confirmación', async () => {
    configurar(true);
    spyOn(window, 'confirm').and.returnValue(false);
    await component.eliminar(registro());
    expect(maquinariaService.eliminarLimpieza).not.toHaveBeenCalled();
  });

  it('eliminar llama al backend, recarga la lista y muestra un toast al confirmar', async () => {
    configurar(true);
    spyOn(window, 'confirm').and.returnValue(true);
    maquinariaService.eliminarLimpieza.and.returnValue(of({ success: true }));
    await component.eliminar(registro());
    expect(maquinariaService.eliminarLimpieza).toHaveBeenCalledWith('lim-1');
    expect(toastService.success).toHaveBeenCalled();
  });

  it('exportarCsv descarga un CSV con los datos de cada registro y avisa cuántos exportó', async () => {
    configurar(true);
    maquinariaService.exportarLimpiezas.and.returnValue(of([registro({ observaciones: 'Con "comillas"' })]));
    const linkClick = spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(() => {});
    let blobCapturado: Blob | null = null;
    const blobUrl = 'blob:fake-url';
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      blobCapturado = blob;
      return blobUrl;
    });
    spyOn(URL, 'revokeObjectURL').and.callFake(() => {});

    await component.exportarCsv();
    const csvTexto = await blobCapturado!.text();

    expect(maquinariaService.exportarLimpiezas).toHaveBeenCalledWith(undefined);
    expect(linkClick).toHaveBeenCalled();
    expect(component.exportando).toBe(false);
    expect(toastService.success).toHaveBeenCalled();
    expect(csvTexto).toContain('MQ-01');
    expect(csvTexto).toContain('""comillas""');
  });

  it('exportarCsv muestra un toast de error si el backend falla', async () => {
    configurar(true);
    maquinariaService.exportarLimpiezas.and.returnValue(throwError(() => new Error('falló')));
    await component.exportarCsv();
    expect(toastService.error).toHaveBeenCalled();
    expect(component.exportando).toBe(false);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { LimpiezasComponent } from './limpiezas.component';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { EASYDRY_ICONS } from '../../shared/icons/lucide-icons';
import { esperar, iniciarSesion, mundo, proveedoresApiReal, requiereMundo } from '../../../testing/api-real';

/**
 * Contra el backend REAL y la base local (ver `src/testing/api-real.ts`). Solo se observan las APIs del navegador
 * (confirm, descarga de archivos) y el aviso en pantalla; el servicio y los datos son los reales.
 */
describe('LimpiezasComponent', () => {
  let fixture: ComponentFixture<LimpiezasComponent>;
  let component: LimpiezasComponent;
  let auth: AuthService;
  let toast: ToastService;

  /** Inicia sesión como `usuario` (o sin sesión), monta la pantalla y espera a que cargue la lista. */
  async function configurar(usuario: string | null, esperarLista = true): Promise<void> {
    TestBed.configureTestingModule({
      imports: [LimpiezasComponent],
      providers: [importProvidersFrom(LucideAngularModule.pick(EASYDRY_ICONS)), ...proveedoresApiReal()],
    });
    auth = TestBed.inject(AuthService);
    toast = TestBed.inject(ToastService);
    if (usuario) await iniciarSesion(auth, usuario);

    fixture = TestBed.createComponent(LimpiezasComponent);
    component = fixture.componentInstance;
    spyOn(toast, 'success').and.callThrough();
    spyOn(toast, 'error').and.callThrough();
    fixture.detectChanges();
    if (esperarLista) await esperar(() => component.lista.items.length > 0);
    fixture.detectChanges();
  }

  /** Un rol global ve toda la red: se acota a la máquina del mundo para ver siempre los registros propios. */
  async function soloLaMaquina(): Promise<void> {
    component.filtroMaquinariaId = mundo.maquinaria.id;
    component.onFiltroMaquinaChange();
    await esperar(() => component.lista.items.length > 0 && component.lista.items.every((r) => r.maquinariaId === mundo.maquinaria.id));
  }

  const ids = () => component.lista.items.map((r) => r.id);
  const delServidor = () => firstValueFrom(TestBed.inject(MaquinariaService).getLimpiezasPagina({ maquinariaId: mundo.maquinaria.id }));

  beforeEach(() => {
    requiereMundo();
    localStorage.clear();
  });

  afterEach(() => {
    component?.ngOnDestroy();
    auth?.logout();
    localStorage.clear();
  });

  it('carga el resumen de atrasadas, la lista y las máquinas del alcance al iniciar', async () => {
    await configurar('supervisor');
    expect(typeof component.pendientes).toBe('number');
    expect(ids()).toEqual(jasmine.arrayContaining([mundo.limpiezas.paraEditar, mundo.limpiezas.paraExportar]));
    expect(component.lista.items[0].maquinaria).toEqual(jasmine.objectContaining({ codigo: mundo.maquinaria.codigo }));
    await esperar(() => component.maquinas.length > 0);
    expect(component.maquinas.map((m) => m.id)).toContain(mundo.maquinaria.id);
  });

  it('oculta los botones de editar/eliminar sin el permiso "limpiezas.editar"', async () => {
    await configurar('soloVer');
    await soloLaMaquina();
    expect(component.puedeEditar).toBe(false);
    const textos = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).map((b) => b.textContent || '');
    expect(textos.some((t) => t.includes('Editar'))).toBe(false);
    expect(textos.some((t) => t.includes('Eliminar'))).toBe(false);
  });

  it('muestra los botones de editar/eliminar con el permiso', async () => {
    await configurar('supervisor');
    expect(component.puedeEditar).toBe(true);
    const textos = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).map((b) => b.textContent || '');
    expect(textos.some((t) => t.includes('Editar'))).toBe(true);
    expect(textos.some((t) => t.includes('Eliminar'))).toBe(true);
  });

  it('cambiar el filtro de máquina reinicia la lista con el maquinariaId elegido', async () => {
    await configurar('supervisor');
    component.filtroMaquinariaId = mundo.maquinaria.id;
    component.onFiltroMaquinaChange();
    await esperar(() => component.lista.items.length > 0 && component.lista.items.every((r) => r.maquinariaId === mundo.maquinaria.id));
    expect(ids()).toContain(mundo.limpiezas.paraEditar);
  });

  it('abrirEditar precarga las observaciones actuales', async () => {
    await configurar('supervisor');
    const r = component.lista.items.find((x) => x.id === mundo.limpiezas.paraEditar)!;
    component.abrirEditar(r);
    expect(component.editando).toBe(r);
    expect(component.editarObservaciones).toBe(r.observaciones ?? '');
  });

  it('guardarEditar guarda en el servidor, recarga la lista y muestra un aviso de éxito', async () => {
    await configurar('supervisor');
    const r = component.lista.items.find((x) => x.id === mundo.limpiezas.paraEditar)!;
    component.abrirEditar(r);
    component.editarObservaciones = 'Nueva observación';

    await component.guardarEditar();

    expect(toast.success).toHaveBeenCalled();
    expect(component.editando).toBeNull();
    expect((await delServidor()).items.find((x) => x.id === r.id)?.observaciones).toBe('Nueva observación');
  });

  it('guardarEditar muestra el error del servidor y no cierra el modal si falla', async () => {
    await configurar('soloVer'); // sin permiso para editar: el servidor rechaza de verdad
    await soloLaMaquina();
    const r = component.lista.items.find((x) => x.id === mundo.limpiezas.paraExportar)!;
    component.abrirEditar(r);
    component.editarObservaciones = 'No debería guardarse';

    await component.guardarEditar();

    expect(component.editarError).toBeTruthy();
    expect(component.editando).not.toBeNull();
    expect((await delServidor()).items.find((x) => x.id === r.id)?.observaciones).not.toBe('No debería guardarse');
  });

  it('eliminar no toca el servidor si el usuario cancela la confirmación', async () => {
    await configurar('supervisor');
    spyOn(window, 'confirm').and.returnValue(false);
    const r = component.lista.items[0];

    await component.eliminar(r);

    expect((await delServidor()).items.map((x) => x.id)).toContain(r.id);
  });

  it('eliminar borra en el servidor, recarga la lista y muestra un aviso al confirmar', async () => {
    await configurar('supervisor');
    spyOn(window, 'confirm').and.returnValue(true);
    const r = component.lista.items.find((x) => x.id === mundo.limpiezas.paraEliminar)!;

    await component.eliminar(r);

    expect(toast.success).toHaveBeenCalled();
    await esperar(() => !ids().includes(r.id));
    expect((await delServidor()).items.map((x) => x.id)).not.toContain(r.id);
  });

  it('exportarCsv descarga un CSV con los datos reales de cada registro y avisa cuántos exportó', async () => {
    await configurar('supervisor');
    const linkClick = spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(() => {});
    let blobCapturado: Blob | null = null;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      blobCapturado = blob;
      return 'blob:descarga-de-prueba';
    });
    spyOn(URL, 'revokeObjectURL').and.callFake(() => {});

    await component.exportarCsv();
    const csvTexto = await blobCapturado!.text();

    expect(linkClick).toHaveBeenCalled();
    expect(component.exportando).toBe(false);
    expect(toast.success).toHaveBeenCalled();
    expect(csvTexto).toContain(mundo.maquinaria.codigo);
    expect(csvTexto).toContain('""comillas""');
  });

  it('exportarCsv muestra un aviso de error si el servidor rechaza la petición', async () => {
    await configurar(null, false); // sin sesión: el servidor responde 401
    (toast.error as jasmine.Spy).calls.reset();

    await component.exportarCsv();

    expect(toast.error).toHaveBeenCalled();
    expect(component.exportando).toBe(false);
  });
});

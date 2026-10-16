import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideAngularModule } from 'lucide-angular';
import { EASYDRY_ICONS } from '../../../shared/icons/lucide-icons';
import { PaginaCatalogo } from '../../../core/models/roles.model';
import { RolPaginasEditorComponent } from './rol-paginas-editor.component';

const accion = (codigo: string, nombre: string) => ({ codigo, nombre, compartida: false });

/** Catálogo mínimo: dos pantallas de cuenta y una página con una pestaña y dos botones. */
const PAGINAS: PaginaCatalogo[] = [
  { id: 'notificaciones', codigo: 'pagina.notificaciones', nombre: 'Notificaciones', ruta: '/notificaciones', enMenu: true, modulo: 'notificaciones', subs: [], acciones: [] },
  { id: 'perfil', codigo: 'pagina.perfil', nombre: 'Perfil', ruta: '/perfil', enMenu: true, modulo: 'perfil', subs: [], acciones: [] },
  {
    id: 'catalogo', codigo: 'pagina.catalogo', nombre: 'Catálogo de Servicios', ruta: '/configuracion/servicios', enMenu: true, modulo: 'configuracion/servicios',
    subs: [{ id: 'generales', codigo: 'pagina.catalogo.generales', nombre: 'Servicios generales', acciones: [accion('catalogo.generales.crear', 'Crear servicio'), accion('catalogo.generales.editar', 'Editar servicio')] }],
    acciones: [],
  },
] as unknown as PaginaCatalogo[];

describe('RolPaginasEditorComponent — activar y desactivar', () => {
  let fixture: ComponentFixture<RolPaginasEditorComponent>;
  let editor: RolPaginasEditorComponent;
  let emitido: string[] | undefined;

  const montar = (seleccion: string[]) => {
    fixture = TestBed.createComponent(RolPaginasEditorComponent);
    editor = fixture.componentInstance;
    emitido = undefined;
    editor.seleccionChange.subscribe((s) => (emitido = s));
    fixture.componentRef.setInput('paginas', PAGINAS);
    fixture.componentRef.setInput('seleccion', seleccion);
    fixture.detectChanges();
  };
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const interruptores = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav [role="switch"]'));

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RolPaginasEditorComponent, LucideAngularModule.pick(EASYDRY_ICONS)] });
  });

  it('Notificaciones y Perfil van siempre incluidas: sin interruptor, con candado y marcadas como «Siempre»', () => {
    montar([]);

    // Solo la página de catálogo tiene interruptor en la lista.
    expect(interruptores().length).toBe(1);
    expect(texto()).toContain('Siempre');
    expect(editor.activa('pagina.notificaciones')).toBeTrue();
    expect(editor.activa('pagina.perfil')).toBeTrue();
  });

  it('no se pueden apagar: intentarlo no cambia ni emite nada', () => {
    montar(['pagina.catalogo']);

    editor.togglePagina(PAGINAS[0]);

    expect(emitido).toBeUndefined();
    expect(editor.activa('pagina.notificaciones')).toBeTrue();
  });

  it('las pantallas de cuenta no cuentan como «páginas del rol» en el resumen', () => {
    montar([]);

    expect(editor.paginasConMenu).toBe(1);
    expect(editor.paginasActivas).toBe(0);
  });

  it('encender una página enciende sus pestañas pero deja los botones apagados', () => {
    montar([]);

    editor.togglePagina(PAGINAS[2]);

    expect(emitido).toEqual(['pagina.catalogo', 'pagina.catalogo.generales']);
  });

  it('apagar una página apaga también sus pestañas y botones (no deja nada colgando)', () => {
    montar(['pagina.catalogo', 'pagina.catalogo.generales', 'catalogo.generales.crear', 'catalogo.generales.editar']);

    editor.togglePagina(PAGINAS[2]);

    expect(emitido).toEqual([]);
  });

  it('apagar una pestaña apaga sus botones pero deja la página', () => {
    montar(['pagina.catalogo', 'pagina.catalogo.generales', 'catalogo.generales.crear']);

    editor.toggleSub(PAGINAS[2], PAGINAS[2].subs[0]);

    expect(emitido).toEqual(['pagina.catalogo']);
  });

  it('cada botón se enciende y se apaga por separado', () => {
    montar(['pagina.catalogo', 'pagina.catalogo.generales']);
    const [crear, editar] = PAGINAS[2].subs[0].acciones;

    editor.toggleAccion(crear);
    expect(emitido).toContain('catalogo.generales.crear');
    expect(emitido).not.toContain('catalogo.generales.editar');

    editor.toggleAccion(editar);
    expect(emitido).toContain('catalogo.generales.editar');

    editor.toggleAccion(crear);
    expect(emitido).not.toContain('catalogo.generales.crear');
    expect(emitido).toContain('catalogo.generales.editar');
  });
});

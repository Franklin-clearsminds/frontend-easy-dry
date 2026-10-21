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

/** Catálogo mínimo con implicaciones: «Ver trazabilidad» incluye «Ver equipos». */
const PAGINAS_IMPLICA: PaginaCatalogo[] = [
  {
    id: 'maquinaria', codigo: 'pagina.maquinaria', nombre: 'Maquinaria & Equipos', ruta: '/maquinaria', enMenu: true, modulo: 'maquinaria', subs: [],
    acciones: [
      { codigo: 'maquinaria.ver', nombre: 'Ver equipos y su estado', compartida: false, grupo: 'Consultar' },
      { codigo: 'maquinaria.trazabilidad.ver', nombre: 'Ver trazabilidad de cada equipo', compartida: false, grupo: 'Consultar', implica: ['maquinaria.ver'] },
    ],
  },
] as unknown as PaginaCatalogo[];

describe('RolPaginasEditorComponent — activar y desactivar', () => {
  let fixture: ComponentFixture<RolPaginasEditorComponent>;
  let editor: RolPaginasEditorComponent;
  let emitido: string[] | undefined;

  const montar = (seleccion: string[], paginas: PaginaCatalogo[] = PAGINAS) => {
    fixture = TestBed.createComponent(RolPaginasEditorComponent);
    editor = fixture.componentInstance;
    emitido = undefined;
    editor.seleccionChange.subscribe((s) => (emitido = s));
    fixture.componentRef.setInput('paginas', paginas);
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

  it('encender una página no abre nada: cada sección y cada acción se marcan aparte', () => {
    montar([]);

    editor.togglePagina(PAGINAS[2]);

    expect(emitido).toEqual(['pagina.catalogo']);
    expect(editor.paginaSinAcceso(PAGINAS[2])).toBeTrue();
  });

  it('marcar una acción arrastra las que van con ella (ver la pantalla)', () => {
    montar(['pagina.maquinaria'], PAGINAS_IMPLICA);
    const pagina = editor.paginas[0];
    const trazabilidad = pagina.acciones[1];

    editor.toggleAccion(trazabilidad);

    expect(emitido).toContain('maquinaria.trazabilidad.ver');
    expect(emitido).toContain('maquinaria.ver');
    expect(editor.paginaSinAcceso(pagina)).toBeFalse();
  });

  it('una casilla que otra incluye no se apaga: el servidor la devolvería al guardar', () => {
    montar(['pagina.maquinaria', 'maquinaria.ver', 'maquinaria.trazabilidad.ver'], PAGINAS_IMPLICA);
    const ver = editor.paginas[0].acciones[0];

    expect(editor.incluidaPor(ver)).toEqual(['Ver trazabilidad de cada equipo']);
    editor.toggleAccion(ver);

    expect(emitido).toBeUndefined();
    expect(editor.activa('maquinaria.ver')).toBeTrue();
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

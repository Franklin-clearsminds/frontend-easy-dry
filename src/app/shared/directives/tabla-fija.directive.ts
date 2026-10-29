import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/** Filas que siempre deben verse. Si no caben, la página vuelve a scrollear con normalidad. */
const FILAS_MINIMAS = 8;
/** Alto de encabezado y de fila cuando todavía no hay filas que medir (carga inicial o tabla vacía). */
const ALTO_ENCABEZADO = 44;
const ALTO_FILA = 53;
/** Alto que se reserva a la barra superior y al paginador de una tabla cuando hay varias en la misma vista. */
const ALTO_MARCOS = 112;

/**
 * Convierte el área de filas de una tabla en la única zona con scroll: toma todo el alto que queda entre su
 * posición y el final de su contenedor con scroll (la página o el cuerpo de un modal), así lo que hay encima
 * (buscador, "Total") y debajo (paginador) queda siempre a la vista. Va en el elemento con el `<table>` dentro.
 *
 * - Con una sola tabla en la vista ocupa todo el alto disponible; con varias, cada una toma la mitad.
 * - Nunca baja de FILAS_MINIMAS filas: en pantallas bajas o móviles es el contenedor el que scrollea.
 * - Si la tabla es más ancha que su área marca el elemento con `tabla-fija-desborda` (ver styles.css), que fija la
 *   primera columna para no perder a qué fila pertenece cada dato.
 */
@Directive({ selector: '[appTablaFija]', standalone: true, exportAs: 'tablaFija' })
export class TablaFijaDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private observador: ResizeObserver | null = null;
  private pendiente = 0;
  private readonly alRedimensionar = () => this.programar();

  ngAfterViewInit(): void {
    const el = this.el.nativeElement;
    el.classList.add('overflow-auto');
    el.setAttribute('data-tabla-fija', '');
    this.zone.runOutsideAngular(() => {
      window.addEventListener('resize', this.alRedimensionar);
      if (typeof ResizeObserver === 'undefined') return;
      this.observador = new ResizeObserver(() => this.programar());
      this.observador.observe(el);
      const tabla = el.querySelector('table');
      if (tabla) this.observador.observe(tabla);
      const contenedor = this.contenedorConScroll();
      if (contenedor) {
        this.observador.observe(contenedor);
        if (contenedor.firstElementChild) this.observador.observe(contenedor.firstElementChild);
      }
    });
    this.programar();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.alRedimensionar);
    this.observador?.disconnect();
    cancelAnimationFrame(this.pendiente);
  }

  /** Lleva las filas al inicio: al cambiar de página, de tamaño, de orden o de búsqueda los datos son otros. */
  alInicio(): void {
    this.el.nativeElement.scrollTop = 0;
  }

  /** Recalcula el alto; útil cuando el contenido de arriba cambia sin que el navegador lo avise. */
  reajustar(): void {
    this.programar();
  }

  private programar(): void {
    cancelAnimationFrame(this.pendiente);
    this.pendiente = requestAnimationFrame(() => this.ajustar());
  }

  private ajustar(): void {
    const el = this.el.nativeElement;
    if (!el.isConnected || el.offsetParent === null) return;
    const contenedor = this.contenedorConScroll();

    let alto: number;
    if (!contenedor) {
      alto = Math.max(this.altoMinimo(), window.innerHeight - el.getBoundingClientRect().top - 32);
    } else {
      const cr = contenedor.getBoundingClientRect();
      const desplazamiento = el.getBoundingClientRect().top - cr.top + contenedor.scrollTop;
      // Lo que queda debajo del área de filas (paginador, márgenes); no depende de su propio alto.
      const debajo = contenedor.scrollHeight - desplazamiento - el.offsetHeight;
      alto = contenedor.clientHeight - desplazamiento - debajo;
      if (this.tablasVisibles(contenedor) > 1) {
        alto = Math.min(alto, contenedor.clientHeight / 2 - ALTO_MARCOS);
      }
    }

    alto = Math.max(this.altoMinimo(), Math.floor(alto));
    const actual = parseInt(el.style.maxHeight || '0', 10);
    if (Math.abs(actual - alto) > 1) el.style.maxHeight = `${alto}px`;

    const desborda = el.scrollWidth > el.clientWidth + 1;
    el.classList.toggle('tabla-fija-desborda', desborda);
  }

  /** Encabezado más FILAS_MINIMAS filas, medidas sobre la primera fila real para respetar su alto verdadero. */
  private altoMinimo(): number {
    const el = this.el.nativeElement;
    const encabezado = el.querySelector('thead')?.getBoundingClientRect().height || ALTO_ENCABEZADO;
    const fila = el.querySelector('tbody tr:not(.sr-only)')?.getBoundingClientRect().height || ALTO_FILA;
    return Math.ceil(encabezado + fila * FILAS_MINIMAS);
  }

  private tablasVisibles(contenedor: Element): number {
    let n = 0;
    contenedor.querySelectorAll<HTMLElement>('[data-tabla-fija]').forEach((t) => {
      if (t.offsetParent !== null) n++;
    });
    return n;
  }

  /** Primer ancestro con scroll vertical propio; si no hay, la ventana. */
  private contenedorConScroll(): HTMLElement | null {
    let el: HTMLElement | null = this.el.nativeElement.parentElement;
    while (el && el !== document.body) {
      if (/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > 0) return el;
      el = el.parentElement;
    }
    return null;
  }
}

import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output,
  SimpleChanges, ViewChild, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Pie de una lista con scroll infinito: cuando el usuario llega cerca del final pide el siguiente bloque.
 * Se coloca justo después del último elemento de la lista. Busca solo el contenedor con scroll más cercano
 * (un modal, un panel, la página), y usa IntersectionObserver fuera de Angular: no revisa toda la pantalla
 * mientras se hace scroll.
 *
 *   <app-infinite-scroll [hasMore]="lista.hasMore" [loading]="lista.cargando" [error]="lista.error"
 *                        [total]="lista.total" (cargarMas)="lista.siguiente()" (reintentar)="lista.reintentar()">
 *   </app-infinite-scroll>
 */
@Component({
  selector: 'app-infinite-scroll',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div #centinela class="h-px w-full" aria-hidden="true"></div>
    <div class="py-3 text-center text-xs font-semibold text-slate-500">
      @if (error) {
        <div role="alert" class="inline-flex items-center gap-2 text-rose-700">
          <i-lucide name="alert-circle" class="w-4 h-4" aria-hidden="true"></i-lucide>
          <span>{{ error }}</span>
          <button type="button" (click)="reintentar.emit()" class="btn btn-secondary btn-sm">Reintentar</button>
        </div>
      } @else if (loading) {
        <span role="status" aria-live="polite" class="inline-flex items-center gap-2">
          <i-lucide name="loader" class="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true"></i-lucide>
          Cargando más…
        </span>
      } @else if (hasMore) {
        <!-- Alternativa para teclado y lectores de pantalla: aparece solo al recibir el foco -->
        <button type="button" (click)="cargarMas.emit()"
                class="sr-only focus:not-sr-only btn btn-secondary btn-sm">Cargar más</button>
      } @else if (mostrarFin && total > 0) {
        <span>Fin de la lista · {{ total }} en total</span>
      }
    </div>
  `,
})
export class InfiniteScrollComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() hasMore = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() total = 0;
  /** Muestra "Fin de la lista · N en total" al terminar. */
  @Input() mostrarFin = true;
  /** Distancia (px) antes del final a la que ya se empieza a cargar el siguiente bloque. */
  @Input() margen = 240;

  @Output() cargarMas = new EventEmitter<void>();
  @Output() reintentar = new EventEmitter<void>();

  @ViewChild('centinela', { static: true }) private centinela!: ElementRef<HTMLElement>;
  private observador: IntersectionObserver | null = null;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    const raiz = this.contenedorConScroll();
    this.zone.runOutsideAngular(() => {
      this.observador = new IntersectionObserver(
        (entradas) => {
          if (entradas.some((e) => e.isIntersecting)) this.pedir();
        },
        { root: raiz, rootMargin: `0px 0px ${this.margen}px 0px` },
      );
      this.observador.observe(this.centinela.nativeElement);
    });
  }

  ngOnChanges(cambios: SimpleChanges): void {
    // Si la lista sigue corta (el final aún se ve) el observador no vuelve a avisar por sí solo: se vuelve a observar.
    const terminoCarga = cambios['loading'] && !cambios['loading'].firstChange && !this.loading;
    const hayMas = cambios['hasMore'] && this.hasMore;
    if ((terminoCarga || hayMas) && this.observador) {
      this.zone.runOutsideAngular(() => setTimeout(() => this.reobservar(), 0));
    }
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.observador = null;
  }

  private pedir(): void {
    if (!this.hasMore || this.loading || this.error) return;
    this.zone.run(() => this.cargarMas.emit());
  }

  private reobservar(): void {
    if (!this.observador) return;
    const el = this.centinela.nativeElement;
    this.observador.unobserve(el);
    this.observador.observe(el);
  }

  /** Primer ancestro con scroll propio; si no hay, la ventana del navegador (root = null). */
  private contenedorConScroll(): Element | null {
    let el: HTMLElement | null = this.host.nativeElement.parentElement;
    while (el && el !== document.body) {
      const overflowY = getComputedStyle(el).overflowY;
      if (/(auto|scroll|overlay)/.test(overflowY) && el.scrollHeight > 0) return el;
      el = el.parentElement;
    }
    return null;
  }
}

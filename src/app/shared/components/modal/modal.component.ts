import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  host: {
    '[style.zIndex]': 'isOpen ? hostZIndex : null',
    '[style.position]': 'isOpen ? "relative" : null',
  },
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 flex items-center justify-center p-4 animate-fade-in"
        [class.backdrop-blur-sm]="blur && !cubierto"
        [attr.aria-hidden]="cubierto ? 'true' : null"
        [ngClass]="clasesFondo"
        (click)="onBackdropClick($event)">
        <div
          #dialog
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          class="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full overflow-hidden flex flex-col max-h-[90dvh] animate-fade-in"
          [ngClass]="clasesTamano"
          (click)="$event.stopPropagation()">

          <!-- Header fijo -->
          <div class="shrink-0 px-6 py-4 border-b border-slate-100 on-dark bg-gradient-to-r from-easydry-blue to-easydry-blue-dark text-white flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              @if (showBackButton) {
                <button
                  type="button"
                  (click)="onBack()"
                  class="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors mr-1 cursor-pointer shrink-0"
                  aria-label="Regresar"
                  title="Regresar">
                  <i-lucide name="arrow-left" class="w-5 h-5" aria-hidden="true"></i-lucide>
                </button>
              }
              @if (icon) {
                <div class="p-2 rounded-xl bg-white/10 text-easydry-green shrink-0">
                  <i-lucide [name]="icon" class="w-5 h-5" aria-hidden="true"></i-lucide>
                </div>
              }
              <h3 [id]="titleId" tabindex="-1" class="font-bold text-lg font-outfit tracking-wide truncate outline-none">{{ title }}</h3>
            </div>
            <button
              type="button"
              (click)="closeModal()"
              class="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Cerrar"
              title="Cerrar modal (Esc)">
              <i-lucide name="x" class="w-5 h-5" aria-hidden="true"></i-lucide>
            </button>
          </div>

          <!-- Cuerpo con scroll -->
          <div class="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
            <ng-content></ng-content>
          </div>

          <!-- Footer fijo (botones) -->
          <div class="shrink-0 px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <ng-content select="[modal-footer]"></ng-content>
          </div>

        </div>
      </div>
    }
  `,
})
export class ModalComponent implements OnInit, OnChanges, OnDestroy {
  /** Modales abiertos, en orden de apertura: el último es el que está encima. */
  private static readonly abiertos: ModalComponent[] = [];
  private static contador = 0;
  private static readonly instancias = new Set<ModalComponent>();
  private static recalculoPendiente = false;

  /**
   * Recalcula qué modales quedan cubiertos. Se hace en un microtask (no durante la detección de cambios)
   * para no provocar ExpressionChangedAfterItHasBeenChecked cuando un modal abre a otro.
   */
  private static programarRecalculo(): void {
    if (ModalComponent.recalculoPendiente) return;
    ModalComponent.recalculoPendiente = true;
    queueMicrotask(() => {
      ModalComponent.recalculoPendiente = false;
      const arriba = ModalComponent.abiertos[ModalComponent.abiertos.length - 1];
      for (const m of ModalComponent.instancias) {
        m.cubierto = ModalComponent.abiertos.length > 1 && m.isOpen && m !== arriba;
      }
    });
  }

  /** Id único por instancia para aria-labelledby. */
  readonly titleId = 'modal-title-' + (++ModalComponent.contador);
  @ViewChild('dialog') private dialogRef?: ElementRef<HTMLElement>;
  private focoPrevio: HTMLElement | null = null;

  @Input() isOpen = false;
  @Input() title = '';
  @Input() icon = '';
  @Input() showBackButton = false;
  @Input() closeOnBackdrop = false;
  /** Desenfoca el fondo. Se desactiva en visores de imágenes para que el zoom y el arrastre sean fluidos. */
  @Input() blur = true;
  /** Por encima de sidebar (z-[999]) y header (z-30) */
  @Input() zClass = 'z-[10050]';
  /** Ancho máximo del cuadro (por defecto max-w-3xl). Si se indica una clase distinta, tiene prioridad sobre `size`. */
  @Input() sizeClass = 'max-w-3xl';
  /**
   * Tamaño predefinido según el contenido: sm (confirmaciones y 1–2 campos), md (formularios cortos),
   * lg (formularios medianos, por defecto) y xl (detalles, tablas o formularios de varias columnas).
   */
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'lg';

  /** true mientras otro modal está abierto por encima de este (sigue visible, debajo del nuevo). */
  cubierto = false;

  /** Nivel de z-index y velo oscuro: solo el modal de arriba oscurece el fondo. */
  get clasesFondo(): string {
    return this.zClass + (this.cubierto ? ' bg-transparent' : ' bg-slate-900/60');
  }

  /**
   * Altura fija (88 % de la pantalla): el cuadro no cambia de tamaño cuando el contenido cambia,
   * por ejemplo al moverse entre pestañas. Solo el cuerpo hace scroll.
   */
  @Input() altoFijo = false;

  get clasesTamano(): string {
    const ancho = this.sizeClass !== 'max-w-3xl'
      ? this.sizeClass
      : ({ sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[this.size] ?? 'max-w-3xl');
    return this.altoFijo ? ancho + ' h-[88dvh]' : ancho;
  }

  @Output() close = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  private host = inject(ElementRef<HTMLElement>);
  private doc = inject(DOCUMENT);

  get hostZIndex(): number {
    const match = this.zClass.match(/(\d+)/);
    return match ? Number(match[1]) : 10050;
  }

  ngOnInit(): void {
    ModalComponent.instancias.add(this);
    this.bringToFront();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.bringToFront();
      this.doc.body.style.overflow = 'hidden';
      this.registrarAbierto();
      this.guardarFoco();
      setTimeout(() => this.enfocarInicial(), 0);
    } else if (changes['isOpen'] && !this.isOpen) {
      this.quitarAbierto();
      this.restaurarFoco();
      // Si queda otro modal abierto debajo, el fondo sigue sin scroll.
      this.doc.body.style.overflow = ModalComponent.abiertos.length ? 'hidden' : '';
    }
  }

  private registrarAbierto(): void {
    this.quitarAbierto();
    ModalComponent.abiertos.push(this);
    ModalComponent.programarRecalculo();
  }

  private quitarAbierto(): void {
    const i = ModalComponent.abiertos.indexOf(this);
    if (i >= 0) ModalComponent.abiertos.splice(i, 1);
    ModalComponent.programarRecalculo();
  }

  private guardarFoco(): void {
    const activo = this.doc.activeElement as HTMLElement | null;
    if (activo && activo !== this.doc.body) this.focoPrevio = activo;
  }

  private restaurarFoco(): void {
    const el = this.focoPrevio;
    this.focoPrevio = null;
    if (el && this.doc.contains(el)) {
      try { el.focus(); } catch { /* elemento ya no enfocable */ }
    }
  }

  private focusables(): HTMLElement[] {
    const raiz = this.dialogRef?.nativeElement;
    if (!raiz) return [];
    const sel = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    return Array.from(raiz.querySelectorAll<HTMLElement>(sel)).filter(e => !e.hasAttribute('hidden') && e.getClientRects().length > 0);
  }

  private enfocarInicial(): void {
    const raiz = this.dialogRef?.nativeElement;
    if (!raiz || !this.isOpen) return;
    // Si el contenido ya tomó el foco (autofocus), se respeta.
    if (raiz.contains(this.doc.activeElement) && this.doc.activeElement !== raiz) return;
    const cuerpo = raiz.querySelector<HTMLElement>('.overflow-y-auto');
    const primero = cuerpo
      ? Array.from(cuerpo.querySelectorAll<HTMLElement>('input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])'))
          .find(e => e.getClientRects().length > 0)
      : undefined;
    (primero ?? raiz.querySelector<HTMLElement>('h3'))?.focus();
  }

  @HostListener('keydown', ['$event'])
  onKeydownTrap(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.isOpen) return;
    if (ModalComponent.abiertos[ModalComponent.abiertos.length - 1] !== this) return;
    const items = this.focusables();
    if (!items.length) { event.preventDefault(); return; }
    const primero = items[0];
    const ultimo = items[items.length - 1];
    const activo = this.doc.activeElement as HTMLElement | null;
    const dentro = !!activo && !!this.dialogRef?.nativeElement.contains(activo);
    if (event.shiftKey && (activo === primero || !dentro || activo === this.dialogRef?.nativeElement.querySelector('h3'))) {
      event.preventDefault(); ultimo.focus();
    } else if (!event.shiftKey && (activo === ultimo || !dentro)) {
      event.preventDefault(); primero.focus();
    }
  }

  ngOnDestroy(): void {
    const estabaAbierto = this.isOpen;
    ModalComponent.instancias.delete(this);
    this.quitarAbierto();
    if (estabaAbierto) this.restaurarFoco();
    this.doc.body.style.overflow = ModalComponent.abiertos.length ? 'hidden' : '';
    if (this.host.nativeElement.parentNode) {
      this.host.nativeElement.parentNode.removeChild(this.host.nativeElement);
    }
  }

  private bringToFront(): void {
    this.doc.body.appendChild(this.host.nativeElement);
  }

  @HostListener('window:keydown.escape', ['$event'])
  onKeydownHandler(_event: KeyboardEvent): void {
    // Solo se cierra el modal que está encima (por ejemplo, el visor de una ficha sobre el detalle).
    const arriba = ModalComponent.abiertos[ModalComponent.abiertos.length - 1];
    if (this.isOpen && (!arriba || arriba === this)) {
      this.closeModal();
    }
  }

  onBackdropClick(_event: MouseEvent): void {
    if (this.closeOnBackdrop) {
      this.closeModal();
    }
  }

  onBack(): void {
    this.back.emit();
  }

  closeModal(): void {
    this.close.emit();
  }
}

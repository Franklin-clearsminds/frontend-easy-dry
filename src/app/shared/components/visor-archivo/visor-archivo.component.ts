import {
  ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output,
  SimpleChanges, ViewChild, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideAngularModule } from 'lucide-angular';
import { ModalComponent } from '../modal/modal.component';

const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const ZOOM_PASO = 1.5;
const ZOOM_DOBLE_CLIC = 2.5;

/**
 * Visor de archivos en un modal sobre la misma página: imágenes y PDF.
 * Las imágenes se pueden agrandar y mover: rueda del ratón, arrastrar, pellizcar en pantallas táctiles,
 * doble clic y botones +, − y ajustar.
 *
 * Rendimiento: los eventos de arrastre y zoom corren fuera de Angular y la transformación se aplica
 * directo al elemento, un cuadro a la vez (requestAnimationFrame), sin recalcular toda la página.
 */
@Component({
  selector: 'app-visor-archivo',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ModalComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="titulo"
      [icon]="tipo === 'pdf' ? 'file-text' : 'image'"
      sizeClass="max-w-5xl"
      zClass="z-[10300]"
      [blur]="false"
      [closeOnBackdrop]="true"
      (close)="cerrar.emit()">
      @if (cargando) {
        <p class="text-sm text-slate-500 font-semibold py-10 text-center">Cargando...</p>
      }
      @if (error) {
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div>
      }
      @if (srcActual && !error) {
        @if (tipo === 'pdf') {
          <iframe [src]="urlSegura" [title]="titulo" class="w-full h-[70vh] rounded-xl border border-slate-200 bg-white"></iframe>
        } @else {
          <div class="relative">
            <div #viewport
                 class="relative w-full h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-slate-900 select-none cursor-grab"
                 style="touch-action: none;">
              <img #imagen [src]="srcActual" [alt]="titulo" draggable="false" decoding="async" fetchpriority="high"
                   class="absolute inset-0 w-full h-full object-contain pointer-events-none"
                   style="transform-origin: center center; will-change: transform; backface-visibility: hidden;"
                   (load)="imagenCargada = true"
                   (error)="alFallarImagen()">
              @if (!imagenCargada) {
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span class="text-xs font-semibold text-white/70">Cargando imagen...</span>
                </div>
              }
            </div>

            <!-- Controles de zoom -->
            <div class="absolute top-3 right-3 flex items-center gap-1 bg-white rounded-xl shadow-md border border-slate-200 p-1">
              <button type="button" (click)="acercar()" title="Acercar" [disabled]="escala >= ZOOM_MAX"
                      class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-40 cursor-pointer">
                <i-lucide name="zoom-in" class="w-4 h-4"></i-lucide>
              </button>
              <span #pct class="text-[11px] font-bold text-slate-600 w-11 text-center tabular-nums">{{ porcentaje }}%</span>
              <button type="button" (click)="alejar()" title="Alejar" [disabled]="escala <= ZOOM_MIN"
                      class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 disabled:opacity-40 cursor-pointer">
                <i-lucide name="zoom-out" class="w-4 h-4"></i-lucide>
              </button>
              <button type="button" (click)="restablecer()" title="Ajustar a la ventana"
                      class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer">
                <i-lucide name="maximize" class="w-4 h-4"></i-lucide>
              </button>
            </div>
            <p class="mt-2 text-[10px] text-slate-400 font-semibold text-center">
              Rueda del ratón o pellizca para agrandar · arrastra para mover · doble clic para acercar
            </p>
          </div>
        }
      }
      <div modal-footer>
        <button type="button" (click)="cerrar.emit()"
                class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer">Cerrar</button>
      </div>
    </app-modal>
  `,
})
export class VisorArchivoComponent implements OnChanges, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Input() titulo = 'Archivo';
  @Input() tipo: 'imagen' | 'pdf' = 'imagen';
  @Input() cargando = false;
  @Input() error = '';
  @Output() cerrar = new EventEmitter<void>();

  readonly ZOOM_MIN = ZOOM_MIN;
  readonly ZOOM_MAX = ZOOM_MAX;

  private _url = '';
  private _respaldo = '';
  private usandoRespaldo = false;
  urlSegura: SafeResourceUrl | null = null;
  imagenCargada = false;

  /**
   * URL principal, ya resuelta (prefirmada si el archivo es privado). Conviene la vista liviana (1600 px):
   * abre y se mueve mucho más rápido que el original de la cámara.
   */
  @Input() set url(valor: string) {
    this._url = valor || '';
    this.usandoRespaldo = false;
    this.imagenCargada = false;
    this.urlSegura = this.srcActual ? this.sanitizer.bypassSecurityTrustResourceUrl(this.srcActual) : null;
    this.restablecer();
  }
  get url(): string {
    return this._url;
  }

  /** Original a usar si la vista liviana todavía no existe o falla al cargar. */
  @Input() set urlRespaldo(valor: string) {
    this._respaldo = valor || '';
  }

  get srcActual(): string {
    return this.usandoRespaldo && this._respaldo ? this._respaldo : this._url || this._respaldo;
  }

  alFallarImagen(): void {
    if (!this.usandoRespaldo && this._respaldo && this._respaldo !== this._url) {
      this.usandoRespaldo = true;
      this.imagenCargada = false;
      return;
    }
    this.error = 'No se pudo cargar la imagen.';
  }

  // ---- Estado del zoom / desplazamiento (se aplica directo al DOM) ----
  escala = 1;
  private x = 0;
  private y = 0;

  private viewportEl: HTMLElement | null = null;
  private imgEl: HTMLElement | null = null;
  private pctEl: HTMLElement | null = null;
  private caja: DOMRect | null = null;
  private observador: ResizeObserver | null = null;
  private marco = 0;
  private temporizadorCD: ReturnType<typeof setTimeout> | null = null;

  private punteros = new Map<number, { x: number; y: number }>();
  private pinzaDistancia = 0;
  private pinzaEscala = 1;
  private arrastrando = false;
  private arrastreInicio = { px: 0, py: 0, x: 0, y: 0 };

  get porcentaje(): number {
    return Math.round(this.escala * 100);
  }

  @ViewChild('viewport') set viewportRef(ref: ElementRef<HTMLElement> | undefined) {
    const el = ref?.nativeElement ?? null;
    if (el === this.viewportEl) return;
    this.desadjuntar();
    this.viewportEl = el;
    if (el) this.adjuntar(el);
  }

  @ViewChild('imagen') set imagenRef(ref: ElementRef<HTMLElement> | undefined) {
    this.imgEl = ref?.nativeElement ?? null;
    this.programarTransformacion();
  }

  @ViewChild('pct') set pctRef(ref: ElementRef<HTMLElement> | undefined) {
    this.pctEl = ref?.nativeElement ?? null;
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['isOpen'] && !this.isOpen) this.restablecer();
  }

  ngOnDestroy(): void {
    this.desadjuntar();
  }

  // ---- Controles (botones) ----
  acercar(): void { this.zoomEn(this.escala * ZOOM_PASO); }
  alejar(): void { this.zoomEn(this.escala / ZOOM_PASO); }

  restablecer(): void {
    this.escala = 1;
    this.x = 0;
    this.y = 0;
    this.arrastrando = false;
    this.punteros.clear();
    this.pinzaDistancia = 0;
    this.programarTransformacion();
  }

  // ---- Eventos fuera de Angular ----
  private adjuntar(el: HTMLElement): void {
    this.zone.runOutsideAngular(() => {
      el.addEventListener('wheel', this.alRueda, { passive: false });
      el.addEventListener('pointerdown', this.alPresionar);
      el.addEventListener('pointermove', this.alMover);
      el.addEventListener('pointerup', this.alSoltar);
      el.addEventListener('pointercancel', this.alSoltar);
      el.addEventListener('dblclick', this.alDobleClic);
      if (typeof ResizeObserver !== 'undefined') {
        this.observador = new ResizeObserver(() => this.medir());
        this.observador.observe(el);
      }
    });
    this.medir();
  }

  private desadjuntar(): void {
    const el = this.viewportEl;
    if (el) {
      el.removeEventListener('wheel', this.alRueda);
      el.removeEventListener('pointerdown', this.alPresionar);
      el.removeEventListener('pointermove', this.alMover);
      el.removeEventListener('pointerup', this.alSoltar);
      el.removeEventListener('pointercancel', this.alSoltar);
      el.removeEventListener('dblclick', this.alDobleClic);
    }
    this.observador?.disconnect();
    this.observador = null;
    if (this.marco) cancelAnimationFrame(this.marco);
    this.marco = 0;
    if (this.temporizadorCD) clearTimeout(this.temporizadorCD);
    this.temporizadorCD = null;
    this.viewportEl = null;
    this.caja = null;
  }

  private medir(): void {
    this.caja = this.viewportEl?.getBoundingClientRect() ?? null;
  }

  private alRueda = (evento: WheelEvent): void => {
    evento.preventDefault();
    const factor = evento.deltaY < 0 ? 1.15 : 1 / 1.15;
    this.zoomEn(this.escala * factor, evento.clientX, evento.clientY);
    this.refrescarVistaLuego();
  };

  private alDobleClic = (evento: MouseEvent): void => {
    if (this.escala > 1.05) this.restablecer();
    else this.zoomEn(ZOOM_DOBLE_CLIC, evento.clientX, evento.clientY);
    this.refrescarVista();
  };

  private alPresionar = (evento: PointerEvent): void => {
    this.medir();
    this.viewportEl?.setPointerCapture?.(evento.pointerId);
    this.punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    if (this.punteros.size === 1) {
      this.arrastrando = true;
      this.viewportEl?.classList.replace('cursor-grab', 'cursor-grabbing');
      this.arrastreInicio = { px: evento.clientX, py: evento.clientY, x: this.x, y: this.y };
    } else if (this.punteros.size === 2) {
      this.arrastrando = false;
      this.pinzaDistancia = this.distanciaEntrePunteros();
      this.pinzaEscala = this.escala;
    }
  };

  private alMover = (evento: PointerEvent): void => {
    if (!this.punteros.has(evento.pointerId)) return;
    this.punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });

    if (this.punteros.size >= 2 && this.pinzaDistancia > 0) {
      const [a, b] = Array.from(this.punteros.values());
      this.zoomEn(
        this.pinzaEscala * (this.distanciaEntrePunteros() / this.pinzaDistancia),
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
      );
      return;
    }
    if (this.arrastrando && this.escala > 1) {
      this.moverA(
        this.arrastreInicio.x + (evento.clientX - this.arrastreInicio.px),
        this.arrastreInicio.y + (evento.clientY - this.arrastreInicio.py),
      );
      this.programarTransformacion();
    }
  };

  private alSoltar = (evento: PointerEvent): void => {
    this.punteros.delete(evento.pointerId);
    this.viewportEl?.releasePointerCapture?.(evento.pointerId);
    if (this.punteros.size < 2) this.pinzaDistancia = 0;
    if (this.punteros.size === 1) {
      const [restante] = Array.from(this.punteros.values());
      this.arrastrando = true;
      this.arrastreInicio = { px: restante.x, py: restante.y, x: this.x, y: this.y };
    } else if (this.punteros.size === 0) {
      this.arrastrando = false;
      this.viewportEl?.classList.replace('cursor-grabbing', 'cursor-grab');
      if (this.escala < 1.05) this.restablecer();
      this.refrescarVista();
    }
  };

  // ---- Cálculo ----
  private distanciaEntrePunteros(): number {
    const [a, b] = Array.from(this.punteros.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Cambia el zoom manteniendo fijo el punto (clientX, clientY); sin punto, se acerca al centro. */
  private zoomEn(nueva: number, clientX?: number, clientY?: number): void {
    const escala = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nueva));
    const caja = this.caja ?? this.viewportEl?.getBoundingClientRect() ?? null;
    if (!caja || escala === this.escala) {
      if (escala === ZOOM_MIN) this.restablecer();
      return;
    }
    const cx = (clientX ?? caja.left + caja.width / 2) - (caja.left + caja.width / 2);
    const cy = (clientY ?? caja.top + caja.height / 2) - (caja.top + caja.height / 2);
    const razon = escala / this.escala;
    this.escala = escala;
    this.moverA(cx - (cx - this.x) * razon, cy - (cy - this.y) * razon);
    if (escala === ZOOM_MIN) {
      this.x = 0;
      this.y = 0;
    }
    this.programarTransformacion();
  }

  /** Limita el desplazamiento para no sacar la imagen de la ventana. */
  private moverA(x: number, y: number): void {
    const caja = this.caja;
    if (!caja) {
      this.x = x;
      this.y = y;
      return;
    }
    const maxX = Math.max(0, (caja.width * this.escala - caja.width) / 2);
    const maxY = Math.max(0, (caja.height * this.escala - caja.height) / 2);
    this.x = Math.min(maxX, Math.max(-maxX, x));
    this.y = Math.min(maxY, Math.max(-maxY, y));
  }

  /** Aplica la transformación una sola vez por cuadro, directo al elemento (sin detección de cambios). */
  private programarTransformacion(): void {
    if (this.marco) return;
    this.marco = requestAnimationFrame(() => {
      this.marco = 0;
      if (this.imgEl) {
        this.imgEl.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${this.escala})`;
      }
      if (this.pctEl) this.pctEl.textContent = `${this.porcentaje}%`;
    });
  }

  /** Al terminar un gesto, actualiza el estado de los botones (activar/desactivar +/−). */
  private refrescarVista(): void {
    this.zone.run(() => this.cdr.detectChanges());
  }

  /** Igual, pero esperando a que termine una ráfaga de la rueda del ratón. */
  private refrescarVistaLuego(): void {
    if (this.temporizadorCD) clearTimeout(this.temporizadorCD);
    this.temporizadorCD = setTimeout(() => this.refrescarVista(), 150);
  }
}

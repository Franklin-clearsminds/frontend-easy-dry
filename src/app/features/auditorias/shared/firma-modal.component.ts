import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

/** Lo que devuelve el modal al guardar: la imagen del trazo (PNG con fondo transparente) y el nombre de quien firma. */
export interface FirmaCapturada { imagen: string; nombre: string }

/**
 * Modal para firmar directamente en pantalla, con el dedo, un lápiz o el mouse: una línea para firmar y los botones
 * Cancelar, Limpiar y Guardar. Con `marcaAgua` (el logo del jefe de taller) se ve por debajo del trazo de forma opaca; la imagen
 * que se guarda lleva solo el trazo, y la marca de agua se vuelve a poner donde se muestra la firma.
 */
@Component({
  selector: 'app-firma-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <app-modal [isOpen]="true" [title]="titulo" icon="pen-tool" size="md" (close)="cancelar.emit()">
      <div class="space-y-3">
        @if (pedirNombre) {
          <div>
            <label class="field-label" for="firma-nombre">Nombre de quien firma *</label>
            <input id="firma-nombre" class="field" [(ngModel)]="nombre" maxlength="120" autocomplete="off">
          </div>
        } @else if (nombre) {
          <p class="text-sm font-bold text-slate-800">{{ nombre }}</p>
        }
        <p class="text-xs text-slate-500">Firma con el dedo, el lápiz o el mouse sobre la línea.</p>
        <div class="relative rounded-xl border-2 border-slate-300 bg-white overflow-hidden select-none" style="aspect-ratio: 3 / 1">
          @if (marcaAgua) {
            <img [src]="marcaAgua" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-contain p-4 pointer-events-none" style="opacity: 0.16">
          }
          <span class="absolute left-[5%] bottom-[27%] text-slate-400 text-lg font-bold pointer-events-none" aria-hidden="true">✕</span>
          <div class="absolute left-[4%] right-[4%] bottom-[23%] border-b-2 border-slate-400 pointer-events-none" aria-hidden="true"></div>
          <canvas #lienzo width="900" height="300" aria-label="Espacio para firmar"
            class="absolute inset-0 w-full h-full cursor-crosshair"
            style="touch-action: none"
            (pointerdown)="inicio($event)" (pointermove)="mover($event)" (pointerup)="fin($event)" (pointercancel)="fin($event)"></canvas>
        </div>
        @if (error) { <p class="text-xs font-semibold text-rose-700" role="alert">{{ error }}</p> }
      </div>
      <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
        <button type="button" class="btn btn-secondary w-full sm:w-auto" (click)="cancelar.emit()">Cancelar</button>
        <button type="button" class="btn btn-secondary w-full sm:w-auto" (click)="limpiar()" [disabled]="!hayTrazo">Limpiar</button>
        <button type="button" class="btn btn-cta w-full sm:w-auto" (click)="guardar()" [disabled]="!hayTrazo || (pedirNombre && !nombre.trim())">Guardar firma</button>
      </div>
    </app-modal>
  `,
})
export class FirmaModalComponent implements AfterViewInit {
  @Input() titulo = 'Firmar';
  /** Logo del jefe de taller, visible por debajo de la firma. */
  @Input() marcaAgua: string | null = null;
  /** Pide el nombre de quien firma; la firma del jefe de taller ya trae el suyo. */
  @Input() pedirNombre = true;
  @Input() set nombreInicial(v: string) { this.nombre = v ?? ''; }

  @Output() cancelar = new EventEmitter<void>();
  @Output() firmada = new EventEmitter<FirmaCapturada>();

  @ViewChild('lienzo', { static: true }) private lienzo!: ElementRef<HTMLCanvasElement>;

  nombre = '';
  hayTrazo = false;
  error = '';
  private ctx!: CanvasRenderingContext2D;
  private dibujando = false;
  private ultimo: { x: number; y: number } | null = null;

  ngAfterViewInit(): void {
    const c = this.lienzo.nativeElement;
    this.ctx = c.getContext('2d')!;
    this.ctx.lineWidth = 3.4;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#0f172a';
    this.ctx.fillStyle = '#0f172a';
  }

  /** Posición del puntero en el lienzo, que se dibuja a 900×300 aunque en pantalla se muestre más chico o más grande. */
  private punto(e: PointerEvent): { x: number; y: number } {
    const c = this.lienzo.nativeElement;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  }

  inicio(e: PointerEvent): void {
    e.preventDefault();
    this.lienzo.nativeElement.setPointerCapture(e.pointerId);
    this.dibujando = true;
    this.ultimo = this.punto(e);
    this.ctx.beginPath();
    this.ctx.arc(this.ultimo.x, this.ultimo.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.hayTrazo = true;
    this.error = '';
  }

  mover(e: PointerEvent): void {
    if (!this.dibujando || !this.ultimo) return;
    e.preventDefault();
    const p = this.punto(e);
    this.ctx.beginPath();
    this.ctx.moveTo(this.ultimo.x, this.ultimo.y);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.ultimo = p;
  }

  fin(e: PointerEvent): void {
    if (!this.dibujando) return;
    this.dibujando = false;
    this.ultimo = null;
    if (this.lienzo.nativeElement.hasPointerCapture(e.pointerId)) this.lienzo.nativeElement.releasePointerCapture(e.pointerId);
  }

  limpiar(): void {
    const c = this.lienzo.nativeElement;
    this.ctx.clearRect(0, 0, c.width, c.height);
    this.hayTrazo = false;
  }

  guardar(): void {
    if (!this.hayTrazo) { this.error = 'Dibuja tu firma sobre la línea.'; return; }
    if (this.pedirNombre && !this.nombre.trim()) { this.error = 'Escribe el nombre de quien firma.'; return; }
    this.firmada.emit({ imagen: this.lienzo.nativeElement.toDataURL('image/png'), nombre: this.nombre.trim() });
  }
}

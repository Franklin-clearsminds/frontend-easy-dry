import { Component, EventEmitter, HostListener, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ModalPortalDirective } from '../../directives/modal-portal.directive';

const VIEWPORT = 320;
const OUTPUT = 512;

@Component({
  selector: 'app-image-crop-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalPortalDirective],
  template: `
    @if (open && imageSrc) {
      <div appModalPortal class="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[10000] p-4 animate-fade-in">
        <div role="dialog" aria-modal="true" aria-labelledby="crop-modal-title" class="bg-white rounded-2xl p-5 sm:p-6 max-w-lg w-full max-h-[90dvh] overflow-y-auto shadow-2xl border border-slate-100 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 id="crop-modal-title" class="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <i-lucide name="crop" class="w-5 h-5 text-easydry-blue" aria-hidden="true"></i-lucide>
                Ajustar imagen de perfil
              </h3>
              <p class="text-xs text-slate-500 mt-1">Arrastra (o usa las flechas del teclado) para encuadrar y usa el zoom para recortar el círculo.</p>
            </div>
            <button type="button" (click)="cancel.emit()" aria-label="Cerrar" title="Cerrar" class="btn-icon shrink-0">
              <i-lucide name="x" class="w-5 h-5" aria-hidden="true"></i-lucide>
            </button>
          </div>

          <div
            class="relative mx-auto bg-slate-900 overflow-hidden rounded-full shadow-inner select-none touch-none cursor-grab active:cursor-grabbing"
            [style.width.px]="viewport"
            [style.height.px]="viewport"
            tabindex="0"
            role="group"
            aria-label="Área de recorte. Use las flechas para mover la imagen."
            (keydown)="onKeyMove($event)"
            (pointerdown)="onPointerDown($event)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp($event)"
            (pointerleave)="onPointerUp($event)">
            <img
              [src]="imageSrc"
              alt="Imagen a recortar para el perfil"
              class="absolute pointer-events-none max-w-none"
              [style.left.px]="imageLeft"
              [style.top.px]="imageTop"
              [style.width.px]="displayWidth"
              [style.height.px]="displayHeight"
              (load)="onImageLoad($event)"
              draggable="false">
            <div class="absolute inset-0 rounded-full ring-4 ring-white/80 pointer-events-none"></div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-slate-600">
              <label for="crop-zoom" class="flex items-center gap-1.5">
                <i-lucide name="sliders" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                Zoom
              </label>
              <span>{{ zoomLabel }}</span>
            </div>
            <input
              id="crop-zoom"
              type="range"
              min="1"
              max="3"
              step="0.05"
              [ngModel]="zoom"
              (ngModelChange)="onZoomChange($event)"
              class="w-full accent-easydry-blue cursor-pointer">
          </div>

          <div class="flex items-center gap-3 pt-1">
            <button
              type="button"
              (click)="cancel.emit()"
              class="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="button"
              (click)="applyCrop()"
              [disabled]="!naturalWidth || applying"
              class="btn-primary flex-1">
              {{ applying ? 'Recortando…' : 'Aplicar recorte' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ImageCropModalComponent implements OnChanges {
  @Input() open = false;
  @Input() imageSrc = '';
  @Output() apply = new EventEmitter<{ file: File; preview: string }>();
  @Output() cancel = new EventEmitter<void>();

  readonly viewport = VIEWPORT;
  zoom = 1;
  offsetX = 0;
  offsetY = 0;
  naturalWidth = 0;
  naturalHeight = 0;
  applying = false;

  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private originX = 0;
  private originY = 0;

  get scale0(): number {
    if (!this.naturalWidth || !this.naturalHeight) return 1;
    return Math.max(VIEWPORT / this.naturalWidth, VIEWPORT / this.naturalHeight);
  }

  get displayWidth(): number {
    return this.naturalWidth * this.scale0 * this.zoom;
  }

  get displayHeight(): number {
    return this.naturalHeight * this.scale0 * this.zoom;
  }

  get imageLeft(): number {
    return (VIEWPORT - this.displayWidth) / 2 + this.offsetX;
  }

  get imageTop(): number {
    return (VIEWPORT - this.displayHeight) / 2 + this.offsetY;
  }

  get zoomLabel(): string {
    return `${Math.round(this.zoom * 100)}%`;
  }

  ngOnChanges(): void {
    if (this.open) {
      this.zoom = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.applying = false;
    }
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth = img.naturalWidth;
    this.naturalHeight = img.naturalHeight;
    this.clampOffset();
  }

  onZoomChange(value: number | string): void {
    this.zoom = Number(value);
    this.clampOffset();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.open && this.imageSrc) this.cancel.emit();
  }

  onKeyMove(event: KeyboardEvent): void {
    const paso = event.shiftKey ? 30 : 10;
    const mov: Record<string, [number, number]> = {
      ArrowLeft: [paso, 0], ArrowRight: [-paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso],
    };
    const d = mov[event.key];
    if (!d) return;
    event.preventDefault();
    this.offsetX += d[0];
    this.offsetY += d[1];
    this.clampOffset();
  }

  onPointerDown(event: PointerEvent): void {
    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.originX = this.offsetX;
    this.originY = this.offsetY;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    this.offsetX = this.originX + (event.clientX - this.dragStartX);
    this.offsetY = this.originY + (event.clientY - this.dragStartY);
    this.clampOffset();
  }

  onPointerUp(_event: PointerEvent): void {
    this.dragging = false;
  }

  @HostListener('document:pointerup')
  onDocumentPointerUp(): void {
    this.dragging = false;
  }

  async applyCrop(): Promise<void> {
    if (!this.naturalWidth || this.applying) return;
    this.applying = true;

    try {
      const img = await this.loadImage(this.imageSrc);
      const sourceSize = VIEWPORT / (this.scale0 * this.zoom);
      const sourceX = (0 - this.imageLeft) / (this.scale0 * this.zoom);
      const sourceY = (0 - this.imageTop) / (this.scale0 * this.zoom);

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear el recorte.');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT, OUTPUT);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('No se pudo generar la imagen recortada.'));
        }, 'image/jpeg', 0.9);
      });

      const file = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = canvas.toDataURL('image/jpeg', 0.9);
      this.apply.emit({ file, preview });
    } finally {
      this.applying = false;
    }
  }

  private clampOffset(): void {
    const maxX = Math.max(0, (this.displayWidth - VIEWPORT) / 2);
    const maxY = Math.max(0, (this.displayHeight - VIEWPORT) / 2);
    this.offsetX = Math.min(maxX, Math.max(-maxX, this.offsetX));
    this.offsetY = Math.min(maxY, Math.max(-maxY, this.offsetY));
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = src;
    });
  }
}

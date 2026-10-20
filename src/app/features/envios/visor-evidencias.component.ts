import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Fotos de evidencia de un envío: miniaturas que se abren en grande al hacer clic. En el visor, la imagen se ajusta a la pantalla y
 * se puede expandir a su tamaño real (con desplazamiento) o volver a ajustarla.
 */
@Component({
  selector: 'app-visor-evidencias',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (urls.length) {
      <div class="flex flex-wrap gap-2">
        @for (u of urls; track u; let i = $index) {
          <button type="button" (click)="abrir(i)" class="rounded-lg border border-slate-200 overflow-hidden cursor-zoom-in" aria-label="Ver evidencia en grande">
            <img [src]="u" alt="Evidencia del envío" loading="lazy" class="w-14 h-14 object-cover">
          </button>
        }
      </div>
    }
    @if (indice !== null) {
      <div class="fixed inset-0 z-[10300] bg-black/85 flex flex-col" role="dialog" aria-modal="true" aria-label="Evidencia" (click)="cerrar()">
        <div class="flex items-center justify-between gap-2 p-3 text-white" (click)="$event.stopPropagation()">
          <span class="text-xs font-bold">Evidencia {{ indice + 1 }} de {{ urls.length }}</span>
          <div class="flex items-center gap-2">
            <button type="button" class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold cursor-pointer flex items-center gap-1.5" (click)="expandida = !expandida">
              <i-lucide aria-hidden="true" [name]="expandida ? 'minimize-2' : 'maximize-2'" class="w-4 h-4"></i-lucide>
              {{ expandida ? 'Ajustar a pantalla' : 'Expandir' }}
            </button>
            <button type="button" class="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer" (click)="cerrar()" aria-label="Cerrar">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>
        </div>
        <div class="flex-1 min-h-0 flex items-center justify-center gap-2 px-2 pb-3">
          @if (urls.length > 1) {
            <button type="button" class="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0" (click)="mover(-1); $event.stopPropagation()" aria-label="Anterior">
              <i-lucide aria-hidden="true" name="chevron-left" class="w-5 h-5"></i-lucide>
            </button>
          }
          <div class="flex-1 min-w-0 h-full" [ngClass]="expandida ? 'overflow-auto' : 'flex items-center justify-center'" (click)="$event.stopPropagation()">
            <img [src]="urls[indice]" alt="Evidencia del envío"
              [ngClass]="expandida ? 'max-w-none w-auto cursor-zoom-out' : 'max-w-full max-h-full object-contain cursor-zoom-in'"
              (click)="expandida = !expandida">
          </div>
          @if (urls.length > 1) {
            <button type="button" class="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0" (click)="mover(1); $event.stopPropagation()" aria-label="Siguiente">
              <i-lucide aria-hidden="true" name="chevron-right" class="w-5 h-5"></i-lucide>
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class VisorEvidenciasComponent {
  @Input() urls: string[] = [];
  indice: number | null = null;
  expandida = false;

  abrir(i: number): void {
    this.indice = i;
    this.expandida = false;
  }

  cerrar(): void {
    this.indice = null;
  }

  mover(delta: number): void {
    if (this.indice === null || !this.urls.length) return;
    this.indice = (this.indice + delta + this.urls.length) % this.urls.length;
    this.expandida = false;
  }

  @HostListener('document:keydown', ['$event'])
  teclado(e: KeyboardEvent): void {
    if (this.indice === null) return;
    if (e.key === 'Escape') this.cerrar();
    else if (e.key === 'ArrowLeft') this.mover(-1);
    else if (e.key === 'ArrowRight') this.mover(1);
  }
}

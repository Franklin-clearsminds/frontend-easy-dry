import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Muestra una firma capturada. La del jefe de taller lleva por debajo, de forma opaca, el logo de su sello como marca de agua;
 * la marca se ve aunque todavía no haya firmado, para que se note de quién es el espacio.
 */
@Component({
  selector: 'app-firma-imagen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative rounded-lg border border-slate-200 bg-white overflow-hidden" [ngClass]="alto" [class.opacity-50]="atenuada" [class.grayscale]="atenuada">
      @if (marcaAgua) {
        <img [src]="marcaAgua" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none" style="opacity: 0.16">
      }
      @if (imagen) {
        <img [src]="imagen" [alt]="'Firma de ' + etiqueta" class="relative w-full h-full object-contain">
      } @else {
        <span class="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-400">Sin firmar</span>
      }
    </div>
  `,
})
export class FirmaImagenComponent {
  @Input() imagen: string | null = null;
  @Input() marcaAgua: string | null = null;
  @Input() etiqueta = '';
  @Input() alto = 'h-24';
  /** Firma anulada por un cambio del contenido: se ve apagada. */
  @Input() atenuada = false;
}

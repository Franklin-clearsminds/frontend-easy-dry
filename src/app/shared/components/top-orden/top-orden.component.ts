import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { OrdenTop } from '../../utils/serie-top';

/**
 * Control de ranking para gráficos de barras: tamaño del Top (5 o 10) y sentido del orden.
 * Va en la cabecera de la tarjeta, junto a las pestañas del gráfico.
 */
@Component({
  selector: 'app-top-orden',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
      @if (mostrarTamano) {
        @for (t of tamanos; track t) {
        <button type="button" class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap"
          [ngClass]="orden.tamano === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          [attr.aria-pressed]="orden.tamano === t" (click)="cambiarTamano(t)">
          Top {{ t }}
        </button>
        }
        <div class="w-px h-4 bg-slate-200 mx-0.5"></div>
      }
      <button type="button"
        class="px-2.5 py-1 flex items-center gap-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap"
        [ngClass]="'text-slate-500 hover:text-slate-700'"
        [attr.aria-pressed]="orden.direccion === 'ASC'" [title]="tituloDireccion" (click)="cambiarDireccion()">
        <i-lucide aria-hidden="true" [name]="orden.direccion === 'ASC' ? 'arrow-up' : 'arrow-down'" class="w-3 h-3"></i-lucide>
        {{ orden.direccion === 'ASC' ? 'Menor' : 'Mayor' }}
      </button>
    </div>
  `
})
export class TopOrdenComponent {
  @Input() orden: OrdenTop = { tamano: 5, direccion: 'DESC' };
  @Input() mostrarTamano = true;
  @Output() ordenChange = new EventEmitter<OrdenTop>();

  readonly tamanos = [5, 10];

  get tituloDireccion(): string {
    return this.orden.direccion === 'ASC'
      ? 'De menor a mayor: primero los de menos volumen'
      : 'De mayor a menor: primero los de más volumen';
  }

  cambiarTamano(tamano: number): void {
    if (this.orden.tamano === tamano) return;
    this.ordenChange.emit({ ...this.orden, tamano });
  }

  cambiarDireccion(): void {
    this.ordenChange.emit({ ...this.orden, direccion: this.orden.direccion === 'ASC' ? 'DESC' : 'ASC' });
  }
}

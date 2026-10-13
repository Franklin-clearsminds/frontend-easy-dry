import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

/** Fila del ranking: nombre, valor principal y un detalle secundario opcional. */
export interface RankingItem {
  nombre: string;
  valor: number;
  secundario?: string;
}

/**
 * Lista de ranking con barras de progreso (estilo tablero profesional): posición, nombre, valor,
 * barra proporcional al máximo y porcentaje sobre el total.
 */
@Component({
  selector: 'app-ranking-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 h-full flex flex-col">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="min-w-0">
          <h4 class="font-bold text-slate-900 text-base font-outfit">{{ titulo }}</h4>
          @if (subtitulo) { <p class="text-xs text-slate-500 mt-0.5">{{ subtitulo }}</p> }
        </div>
        @if (mostrarPosicion) {
          <span class="text-[11px] font-semibold text-slate-400 shrink-0">Ranking</span>
        }
      </div>

      <div class="flex-1 divide-y divide-slate-100">
        @for (it of items; track it.nombre; let i = $index) {
          <div class="py-3 flex items-center gap-3">
            @if (mostrarPosicion) {
              <span class="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold flex items-center justify-center shrink-0">{{ i + 1 }}</span>
            }
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3">
                <p class="font-bold text-slate-800 truncate">{{ it.nombre }}</p>
                <span class="font-bold shrink-0" [ngClass]="valorClase">{{ prefijo }}{{ it.valor | number:'1.0-2' }}{{ sufijo }}</span>
              </div>
              @if (mostrarProgreso) {
              <div class="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" [ngClass]="barraClase" [style.width.%]="porcentaje(it.valor)"></div>
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-[11px] text-slate-400 truncate">{{ it.secundario }}</span>
                <span class="text-[11px] font-bold text-easydry-blue shrink-0">{{ porcentaje(it.valor) }}% del total</span>
              </div>
              } @else if (it.secundario) {
              <p class="text-[11px] text-slate-400 truncate mt-1">{{ it.secundario }}</p>
              }
            </div>
          </div>
        } @empty {
          <div class="py-8 text-center">
            <i-lucide name="inbox" class="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true"></i-lucide>
            <p class="text-sm text-slate-400">Sin datos en el periodo</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class RankingListComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() items: RankingItem[] = [];
  /** Prefijo del valor (p. ej. "$"). */
  @Input() prefijo = '';
  /** Unidad que se muestra junto al valor (p. ej. " servicios"). */
  @Input() sufijo = '';
  @Input() color: 'verde' | 'azul' | 'rojo' = 'verde';
  /** Muestra la barra proporcional y el % del total. Se oculta en listas de menor actividad, donde no aporta. */
  @Input() mostrarProgreso = true;
  /** Muestra el número de posición y la etiqueta "Ranking". Se oculta cuando el orden no es un mérito (menor actividad). */
  @Input() mostrarPosicion = true;

  get valorClase(): string {
    return this.color === 'rojo' ? 'text-rose-600' : this.color === 'azul' ? 'text-easydry-blue' : 'text-easydry-green-text';
  }

  get barraClase(): string {
    return this.color === 'rojo' ? 'bg-rose-500' : this.color === 'azul' ? 'bg-easydry-blue' : 'bg-easydry-green';
  }

  /** Porcentaje del valor respecto al total (0-100), para la barra y la etiqueta. */
  porcentaje(valor: number): number {
    const total = this.items.reduce((sum, it) => sum + (Number(it.valor) || 0), 0);
    if (total <= 0) return 0;
    return Math.round((Number(valor) || 0) / total * 100);
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

/** Fila del leaderboard (Top/Bottom). */
export interface TopBottomItem {
  nombre: string;
  cantidad: number;
  tiempoPromedioMin?: number;
}

/**
 * Leaderboard adaptativo Top 5 vs Bottom 5 sobre la entidad del nivel activo
 * (Región / Agencia / Bahía / Pulidor). Verde = mejores, rojo = peores.
 */
@Component({
  selector: 'app-top-bottom',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 h-full flex flex-col">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="min-w-0">
          <h4 class="font-bold text-slate-900 text-base font-outfit">{{ titulo }}</h4>
          <p class="text-xs text-slate-500 mt-0.5">{{ entidad }} con mayor y menor volumen del período</p>
        </div>
      </div>

      @if (top.length || bottom.length) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
          <!-- Top -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <i-lucide name="trending-up" class="w-4 h-4 text-easydry-green-text" aria-hidden="true"></i-lucide>
              <span class="text-xs font-extrabold uppercase tracking-wide text-easydry-green-text">Top 5</span>
            </div>
            <ul class="space-y-1.5">
              @for (it of top; track it.nombre; let i = $index) {
                <li class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-md bg-easydry-green/20 text-easydry-green-text text-[10px] font-extrabold flex items-center justify-center shrink-0">{{ i + 1 }}</span>
                  <span class="text-sm text-slate-700 truncate flex-1">{{ it.nombre }}</span>
                  <span class="text-sm font-bold text-slate-900">{{ it.cantidad }}</span>
                </li>
              } @empty {
                <li class="text-xs text-slate-400 italic">Sin datos</li>
              }
            </ul>
          </div>

          <!-- Bottom -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <i-lucide name="trending-down" class="w-4 h-4 text-rose-500" aria-hidden="true"></i-lucide>
              <span class="text-xs font-extrabold uppercase tracking-wide text-rose-500">Bottom 5</span>
            </div>
            <ul class="space-y-1.5">
              @for (it of bottom; track it.nombre; let i = $index) {
                <li class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-md bg-rose-100 text-rose-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">{{ i + 1 }}</span>
                  <span class="text-sm text-slate-700 truncate flex-1">{{ it.nombre }}</span>
                  <span class="text-sm font-bold text-slate-900">{{ it.cantidad }}</span>
                </li>
              } @empty {
                <li class="text-xs text-slate-400 italic">Sin datos suficientes</li>
              }
            </ul>
          </div>
        </div>
      } @else {
        <div class="py-10 text-center">
          <i-lucide name="award" class="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true"></i-lucide>
          <p class="text-sm text-slate-400">Sin datos en el periodo</p>
        </div>
      }
    </div>
  `,
})
export class TopBottomComponent {
  @Input() titulo = 'Top vs Bottom';
  @Input() entidad = 'Entidad';
  @Input() top: TopBottomItem[] = [];
  @Input() bottom: TopBottomItem[] = [];
}

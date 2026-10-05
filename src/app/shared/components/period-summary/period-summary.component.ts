import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

/** Métrica resumida del período (etiqueta, valor ya formateado y color semántico). */
export interface PeriodMetric {
  label: string;
  valor: string;
  color?: 'verde' | 'azul' | 'rojo' | 'slate';
}

/**
 * Barra de resumen del período (estilo tablero profesional): a la izquierda el rango consultado y a la
 * derecha los totales clave del período. Se usa como encabezado de los paneles.
 */
@Component({
  selector: 'app-period-summary',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-12 h-12 rounded-xl bg-[#0066FF] flex items-center justify-center shrink-0 shadow-sm shadow-[#0066FF]/20">
          <i-lucide name="calendar-range" class="w-6 h-6 text-white" aria-hidden="true"></i-lucide>
        </div>
        <div class="min-w-0">
          <span class="inline-block px-3 py-1 rounded-full bg-[#E5F0FF] text-[#0066FF] text-[10px] font-bold uppercase tracking-wider">{{ titulo }}</span>
          <p class="text-lg font-bold text-slate-900 font-outfit mt-1 truncate">{{ rangoTexto }}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
        @for (m of metricas; track m.label; let last = $last) {
          <div class="flex flex-col">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{{ m.label }}</span>
            <span class="text-lg font-extrabold" [ngClass]="colorClase(m.color)">{{ m.valor }}</span>
          </div>
          @if (!last) { <span class="hidden sm:block w-px h-8 bg-slate-100"></span> }
        }
      </div>
    </div>
  `,
})
export class PeriodSummaryComponent {
  @Input() titulo = 'Período consultado';
  @Input() rangoTexto = '';
  @Input() metricas: PeriodMetric[] = [];

  colorClase(color?: string): string {
    switch (color) {
      case 'verde': return 'text-easydry-green-text';
      case 'azul': return 'text-easydry-blue';
      case 'rojo': return 'text-rose-600';
      default: return 'text-slate-900';
    }
  }
}

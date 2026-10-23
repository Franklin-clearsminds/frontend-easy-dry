import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CHART_CATEGORICAL } from '../../theme/colors';

/** Segmento de la distribución: nombre, valor y color opcional. */
export interface DistributionItem {
  nombre: string;
  valor: number;
  /** Monto en USD asociado al ítem (por ejemplo, lo vendido de ese servicio); si viene, se muestra junto al valor. */
  monto?: number;
  color?: string;
}

/**
 * Distribución estilo tablero profesional: dona (con el total al centro) + leyenda en filas con
 * punto de color, valor, porcentaje y barra proporcional. Reemplaza las donas con leyenda lateral.
 */
@Component({
  selector: 'app-distribution-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 h-full flex flex-col">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="min-w-0">
          <h4 class="font-bold text-slate-900 text-base font-outfit">{{ titulo }}</h4>
          @if (subtitulo) { <p class="text-xs text-slate-500 mt-0.5">{{ subtitulo }}</p> }
        </div>
        <ng-content select="[card-actions]"></ng-content>
      </div>

      @if (items.length) {
        @if (layout === 'stacked') {
          <div class="flex flex-col items-center gap-4 flex-1 w-full">
            <div class="relative w-32 h-32 shrink-0 my-1" role="img" [attr.aria-label]="titulo">
              <div class="w-full h-full rounded-full" [style.background]="gradiente"></div>
              <div class="absolute inset-[18%] rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                <span class="text-2xl font-extrabold text-slate-900 font-outfit leading-none">{{ total | number:'1.0-0' }}</span>
                <span class="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">{{ etiquetaTotal }}</span>
              </div>
            </div>

            <div class="w-full min-w-0 divide-y divide-slate-100">
              @for (it of items; track it.nombre; let i = $index) {
                <div class="py-2">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="colorDe(it, i)"></span>
                    <span class="text-xs font-semibold text-slate-700 truncate flex-1" [title]="it.nombre">{{ it.nombre }}</span>
                    <span class="text-xs font-bold text-slate-900 shrink-0">{{ it.valor | number:'1.0-2' }}</span>
                    @if (it.monto != null) { <span class="text-[11px] font-bold text-emerald-700 shrink-0">{{ '$' + (it.monto | number:'1.2-2') }}</span> }
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{{ porcentaje(it.valor) }}%</span>
                  </div>
                  <div class="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" [style.background]="colorDe(it, i)" [style.width.%]="porcentaje(it.valor)"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="flex flex-col sm:flex-row items-center gap-6 flex-1">
            <div class="relative w-40 h-40 shrink-0" role="img" [attr.aria-label]="titulo">
              <div class="w-full h-full rounded-full" [style.background]="gradiente"></div>
              <div class="absolute inset-[18%] rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                <span class="text-2xl font-extrabold text-slate-900 font-outfit leading-none">{{ total | number:'1.0-0' }}</span>
                <span class="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">{{ etiquetaTotal }}</span>
              </div>
            </div>

            <div class="flex-1 w-full min-w-0 divide-y divide-slate-100">
              @for (it of items; track it.nombre; let i = $index) {
                <div class="py-2">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="colorDe(it, i)"></span>
                    <span class="text-sm font-semibold text-slate-700 truncate flex-1" [title]="it.nombre">{{ it.nombre }}</span>
                    <span class="text-sm font-bold text-slate-900 shrink-0">{{ it.valor | number:'1.0-2' }}</span>
                    @if (it.monto != null) { <span class="text-xs font-bold text-emerald-700 shrink-0">{{ '$' + (it.monto | number:'1.2-2') }}</span> }
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{{ porcentaje(it.valor) }}%</span>
                  </div>
                  <div class="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" [style.background]="colorDe(it, i)" [style.width.%]="porcentaje(it.valor)"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
        @if (hayMonto) {
          <p class="mt-3 pt-3 border-t border-slate-100 text-xs font-bold text-slate-600 flex items-center justify-between">
            <span>Total en dólares</span><span class="text-emerald-700">{{ '$' + (totalMonto | number:'1.2-2') }}</span>
          </p>
        }
      } @else {
        <div class="py-10 text-center">
          <i-lucide name="pie-chart" class="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true"></i-lucide>
          <p class="text-sm text-slate-400">Sin datos en el periodo</p>
        </div>
      }
    </div>
  `,
})
export class DistributionCardComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() set title(val: string) { if (val) this.titulo = val; }
  @Input() set subtitle(val: string) { if (val) this.subtitulo = val; }
  @Input() etiquetaTotal = 'Total';
  @Input() items: DistributionItem[] = [];
  @Input() layout: 'auto' | 'side' | 'stacked' = 'auto';

  get total(): number {
    return this.items.reduce((sum, it) => sum + (Number(it.valor) || 0), 0);
  }

  get hayMonto(): boolean {
    return this.items.some((it) => it.monto != null);
  }

  get totalMonto(): number {
    return this.items.reduce((sum, it) => sum + (Number(it.monto) || 0), 0);
  }

  /** Gradiente cónico con un segmento por ítem, en orden. */
  get gradiente(): string {
    const total = this.total;
    if (total <= 0) return '#F1F5F9';
    let acc = 0;
    const partes = this.items.map((it, i) => {
      const inicio = (acc / total) * 100;
      acc += Number(it.valor) || 0;
      const fin = (acc / total) * 100;
      return `${this.colorDe(it, i)} ${inicio.toFixed(2)}% ${fin.toFixed(2)}%`;
    });
    return `conic-gradient(${partes.join(', ')})`;
  }

  porcentaje(valor: number): number {
    const total = this.total;
    if (total <= 0) return 0;
    return Math.round((Number(valor) || 0) / total * 100);
  }

  colorDe(it: DistributionItem, i: number): string {
    return it.color || CHART_CATEGORICAL[i % CHART_CATEGORICAL.length];
  }
}

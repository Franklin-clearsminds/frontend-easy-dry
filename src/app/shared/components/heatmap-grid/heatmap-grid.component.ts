import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Heatmap de saturación: matriz día × hora con intensidad de color según la carga.
 * Se usa para detectar horas/días pico de la operación.
 */
@Component({
  selector: 'app-heatmap-grid',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div [ngClass]="sinTarjeta ? 'flex-1 flex flex-col' : 'bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 h-full flex flex-col'">
      @if (!sinTarjeta) {
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="min-w-0">
          <h4 class="font-bold text-slate-900 text-base font-outfit">{{ titulo }}</h4>
          @if (subtitulo) { <p class="text-xs text-slate-500 mt-0.5">{{ subtitulo }}</p> }
        </div>
        <ng-container *ngTemplateOutlet="leyenda"></ng-container>
      </div>
      } @else if (total > 0) {
      <div class="flex justify-end mb-3">
        <ng-container *ngTemplateOutlet="leyenda"></ng-container>
      </div>
      }

      @if (total > 0) {
        <div class="overflow-x-auto flex-1">
          <table class="w-full border-separate" style="border-spacing: 3px">
            <thead>
              <tr>
                <th class="w-10"></th>
                @for (h of horas; track h) {
                  <th class="text-[9px] font-semibold text-slate-400 text-center">{{ h }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (dia of dias; track dia; let i = $index) {
                <tr>
                  <td class="text-[10px] font-bold text-slate-500 pr-1 text-right">{{ dia }}</td>
                  @for (h of horas; track h; let j = $index) {
                    <td>
                      <div class="w-full h-6 rounded-sm transition-colors"
                        [style.background]="colorCelda(matriz[i][j])"
                        [attr.title]="dia + ' ' + h + ':00 · ' + (matriz[i][j] || 0) + ' servicios'"></div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="py-10 text-center">
          <i-lucide name="calendar-range" class="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true"></i-lucide>
          <p class="text-sm text-slate-400">Sin datos en el periodo</p>
        </div>
      }
    </div>

    <ng-template #leyenda>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-[10px] font-semibold text-slate-400">Menos</span>
        <div class="flex gap-0.5">
          @for (n of [0,1,2,3,4]; track n) {
            <span class="w-3 h-3 rounded-sm" [style.background]="colorEscala(n / 4)"></span>
          }
        </div>
        <span class="text-[10px] font-semibold text-slate-400">Más</span>
      </div>
    </ng-template>
  `,
})
export class HeatmapGridComponent {
  @Input() titulo = 'Mapa de calor por día y hora';
  @Input() subtitulo = '';
  @Input() dias: string[] = [];
  @Input() horas: string[] = [];
  @Input() matriz: number[][] = [];
  /** Sin marco propio: renderiza solo la matriz, para incrustarla dentro de otra tarjeta. */
  @Input() sinTarjeta = false;

  get total(): number {
    return this.matriz.reduce((sum, fila) => sum + fila.reduce((a, b) => a + b, 0), 0);
  }

  private get max(): number {
    let m = 0;
    for (const fila of this.matriz) for (const v of fila) if (v > m) m = v;
    return m;
  }

  colorCelda(valor: number): string {
    if (!valor || this.max <= 0) return '#F1F5F9';
    return this.colorEscala(valor / this.max);
  }

  /** Escala de la marca (azul) con transparencia creciente. */
  colorEscala(ratio: number): string {
    const alpha = 0.12 + Math.min(1, Math.max(0, ratio)) * 0.88;
    return `rgba(0, 66, 130, ${alpha.toFixed(3)})`;
  }
}

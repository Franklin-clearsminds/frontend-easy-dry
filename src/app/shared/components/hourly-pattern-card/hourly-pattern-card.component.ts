import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartCardComponent } from '../chart-card/chart-card.component';
import { HeatmapGridComponent } from '../heatmap-grid/heatmap-grid.component';

/** Vista activa del bloque horario. */
export type VistaHoraria = 'flujo' | 'mapa';

/**
 * Bloque horario unificado: reúne el flujo de atención por hora y el mapa de calor día × hora
 * en una sola tarjeta, alternables con un botón. Ambas vistas responden al mismo periodo.
 */
@Component({
  selector: 'app-hourly-pattern-card',
  standalone: true,
  imports: [CommonModule, ChartCardComponent, HeatmapGridComponent],
  host: { class: 'block h-full' },
  template: `
    <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 h-full flex flex-col">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="min-w-0">
          <h4 class="font-bold text-slate-900 text-base font-outfit truncate">{{ titulo }}</h4>
          @if (subtituloActivo) { <p class="text-xs text-slate-500 mt-0.5">{{ subtituloActivo }}</p> }
        </div>
        <div class="flex shrink-0 bg-slate-100 p-1 rounded-xl">
          <button type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors"
            [ngClass]="vistaActiva === 'flujo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            [attr.aria-pressed]="vistaActiva === 'flujo'" (click)="vista = 'flujo'">
            Flujo
          </button>
          <button type="button" class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors"
            [ngClass]="vistaActiva === 'mapa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            [attr.aria-pressed]="vistaActiva === 'mapa'" (click)="vista = 'mapa'">
            Mapa de calor
          </button>
        </div>
      </div>

      @if (vistaActiva === 'flujo' && flujo) {
        <app-chart-card [sinTarjeta]="true" type="line" [data]="flujo"></app-chart-card>
      } @else if (vistaActiva === 'mapa' && hayMapa) {
        <app-heatmap-grid [sinTarjeta]="true" [dias]="dias" [horas]="horas" [matriz]="matriz"></app-heatmap-grid>
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <p class="text-sm text-slate-400">Sin datos en el periodo</p>
        </div>
      }
    </div>
  `,
})
export class HourlyPatternCardComponent {
  @Input() titulo = 'Flujo Horario de Atención';
  @Input() subtituloFlujo = '';
  @Input() subtituloMapa = '';
  /** Serie del flujo horario (Chart.js); si falta, la tarjeta abre en el mapa de calor. */
  @Input() flujo: any = null;
  @Input() dias: string[] = [];
  @Input() horas: string[] = [];
  @Input() matriz: number[][] = [];

  vista: VistaHoraria = 'flujo';

  get hayMapa(): boolean {
    return this.matriz.some((fila) => fila.some((v) => Number(v) > 0));
  }

  /** Vista efectiva: si la elegida no trae datos, muestra la otra. */
  get vistaActiva(): VistaHoraria {
    if (this.vista === 'flujo' && !this.flujo && this.hayMapa) return 'mapa';
    if (this.vista === 'mapa' && !this.hayMapa && this.flujo) return 'flujo';
    return this.vista;
  }

  get subtituloActivo(): string {
    return this.vistaActiva === 'mapa' ? this.subtituloMapa : this.subtituloFlujo;
  }
}

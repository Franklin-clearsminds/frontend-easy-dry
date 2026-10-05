import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables, ChartType } from 'chart.js';
import { CHART_COLORS } from '../../theme/colors';

Chart.register(...registerables);

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  host: { 
    class: 'block',
    '[attr.title]': 'null' // Previene que Angular ponga el @Input() title como tooltip nativo del navegador
  },
  template: `
    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry flex flex-col h-full" [ngClass]="{'max-h-[400px]': type === 'doughnut' || type === 'pie'}">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="min-w-0">
          <h4 class="font-bold text-slate-900 text-base font-outfit truncate">{{ title }}</h4>
          @if (subtitle) {
            <p class="text-xs text-slate-500 mt-0.5">{{ subtitle }}</p>
          }
        </div>
        <ng-content select="[chart-actions]"></ng-content>
      </div>

      <div class="flex-1 relative w-full min-h-[260px] flex items-center justify-center">
        <canvas #chartCanvas></canvas>
      </div>

      <ng-content select="[chart-footer]"></ng-content>
    </div>
  `
})
export class ChartCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() type: ChartType = 'line';
  @Input() data: any = { labels: [], datasets: [] };
  @Input() options: any = {};

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance?: Chart;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) return;
    
    if (changes['type'] && !changes['type'].firstChange) {
      this.renderChart();
      return;
    }
    
    if (changes['data'] && !changes['data'].firstChange) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private destroyChart(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = undefined;
    }
  }

  private updateChart(): void {
    if (!this.chartInstance || !this.data) {
      this.renderChart();
      return;
    }
    this.chartInstance.data = this.data;
    this.chartInstance.update('none');
  }

  private renderChart(): void {
    if (!this.chartCanvas || !this.data) return;

    this.destroyChart();

    const defaultOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: this.data?.datasets?.length > 1,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            font: { family: 'Inter', size: 12 },
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: CHART_COLORS.blueDark,
          titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 10
        }
      },
      scales: this.type === 'pie' || this.type === 'doughnut' ? {} : {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: CHART_COLORS.slate }
        },
        y: {
          grid: { color: CHART_COLORS.slateLight },
          ticks: { font: { family: 'Inter', size: 11 }, color: CHART_COLORS.slate },
          beginAtZero: true
        }
      }
    };

    // Agregar maxBarThickness si es gráfico de barras, para evitar barras gigantes si hay pocos datos
    if (this.type === 'bar') {
      if (this.data?.datasets) {
        this.data.datasets.forEach((ds: any) => {
          ds.maxBarThickness = 60;
        });
      }
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.chartInstance = new Chart(ctx, {
        type: this.type,
        data: this.data,
        options: { ...defaultOptions, ...this.options }
      });
    }
  }
}

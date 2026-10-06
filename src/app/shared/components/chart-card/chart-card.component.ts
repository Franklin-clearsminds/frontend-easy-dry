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
    class: 'block h-full',
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

      <div class="flex-1 relative w-full min-h-[260px]" [ngClass]="{'overflow-y-auto custom-scrollbar': horizontal}">
        <div [style.height]="chartContainerHeight" class="relative w-full h-full min-h-[260px] flex items-center justify-center">
          <canvas #chartCanvas></canvas>
        </div>
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
  @Input() horizontal = false;
  /** Apila las series (barras): útil para ver composición por estado/nivel dentro de cada categoría. */
  @Input() stacked = false;

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chartInstance?: Chart;
  private viewReady = false;

  get chartContainerHeight(): string {
    if (this.horizontal && this.type === 'bar' && this.data?.labels?.length) {
      // 40px per item + 60px for margins/axis
      const minHeight = this.data.labels.length * 40 + 60;
      return `max(100%, ${minHeight}px)`;
    }
    return '100%';
  }

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

    const isHorizontal = this.horizontal && this.type === 'bar';

    const defaultOptions: any = {
      indexAxis: isHorizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: this.type === 'pie' || this.type === 'doughnut' ? true : this.data?.datasets?.length > 1,
          position: this.type === 'pie' || this.type === 'doughnut' ? 'right' : 'bottom',
          labels: {
            usePointStyle: true,
            font: { family: 'Inter', size: 12 },
            padding: 15,
            generateLabels: (chart: any) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                const isPie = chart.config.type === 'pie' || chart.config.type === 'doughnut';
                if (isPie) {
                  const dataset = data.datasets[0];
                  const total = dataset.data.reduce((acc: number, curr: number) => acc + (curr || 0), 0);
                  
                  return data.labels.map((label: string, i: number) => {
                    const value = dataset.data[i] || 0;
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    const color = dataset.backgroundColor?.[i] || '#000';
                    return {
                      text: `${label}: ${value} (${percentage}%)`,
                      fillStyle: color,
                      strokeStyle: color,
                      lineWidth: 0,
                      hidden: isNaN(dataset.data[i]) || chart.getDatasetMeta(0).data[i]?.hidden,
                      index: i
                    };
                  });
                }
                return Chart.defaults.plugins.legend.labels.generateLabels(chart);
              }
              return [];
            }
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
        [isHorizontal ? 'y' : 'x']: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: CHART_COLORS.slate }
        },
        [isHorizontal ? 'x' : 'y']: {
          grid: { color: CHART_COLORS.slateLight },
          ticks: { font: { family: 'Inter', size: 11 }, color: CHART_COLORS.slate },
          beginAtZero: true
        }
      }
    };

    if (this.stacked && this.type === 'bar') {
      defaultOptions.scales.x.stacked = true;
      defaultOptions.scales.y.stacked = true;
    }

    // Agregar maxBarThickness si es gráfico de barras, para evitar barras gigantes si hay pocos datos
    if (this.type === 'bar') {
      if (this.data?.datasets) {
        this.data.datasets.forEach((ds: any) => {
          ds.maxBarThickness = isHorizontal ? 30 : 60;
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

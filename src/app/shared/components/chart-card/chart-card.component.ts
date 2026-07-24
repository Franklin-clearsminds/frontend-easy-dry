import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables, ChartType } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry flex flex-col h-full">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h4 class="font-bold text-slate-900 text-base font-outfit">{{ title }}</h4>
          @if (subtitle) {
            <p class="text-xs text-slate-500 mt-0.5">{{ subtitle }}</p>
          }
        </div>
      </div>

      <div class="flex-1 relative w-full min-h-[260px] flex items-center justify-center">
        <canvas #chartCanvas></canvas>
      </div>
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
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            font: { family: 'Inter', size: 12 },
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: '#053F67',
          titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 10
        }
      },
      scales: this.type === 'pie' || this.type === 'doughnut' ? {} : {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' }
        },
        y: {
          grid: { color: '#F1F5F9' },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#64748B' }
        }
      }
    };

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

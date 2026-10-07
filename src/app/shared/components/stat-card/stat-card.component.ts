import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { getKpiDescription } from './kpi-descriptions';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  host: { class: 'block h-full' },
  template: `
    <div class="h-full flex flex-col bg-white rounded-3xl p-6 border border-slate-50 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group/card">
      <!-- Glow effect for premium feel -->
      <div class="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-30" [ngClass]="iconWrapperClass"></div>

      <div class="flex items-start justify-between mb-4 relative z-10">
        <div class="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" [ngClass]="iconWrapperClass">
          <i-lucide [name]="icon" class="w-5 h-5" [ngClass]="iconColorClass" aria-hidden="true"></i-lucide>
        </div>
        @if (badge) {
          <span class="px-3 py-1 rounded-full bg-slate-50/80 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-sm border border-slate-100/50 max-w-[62%] min-w-0 truncate"
            [attr.title]="badge">{{ badge }}</span>
        }
      </div>

      <div class="flex items-center gap-1.5 mb-1 relative z-10">
        <p class="text-[13px] font-semibold text-slate-500">{{ title }}</p>
        @if (descripcion) {
          <div class="group/tooltip relative flex items-center justify-center" tabindex="0" [attr.aria-label]="descripcion">
            <i-lucide name="info" class="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" aria-hidden="true"></i-lucide>
            <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 transition-all duration-200 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-1 group-focus/tooltip:opacity-100 bg-slate-800 text-white text-[11px] leading-snug rounded-lg py-2 px-3 z-50 shadow-xl text-center">
              {{ descripcion }}
              <div class="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
            </div>
          </div>
        }
      </div>
      <h3 class="text-3xl font-bold tracking-tight text-slate-800 relative z-10 break-words leading-tight">{{ value }}</h3>

      @if (subtitle) {
        <p class="text-xs text-slate-400 mt-auto pt-4 flex items-center gap-1.5 relative z-10">
          <i-lucide name="arrow-up-right" class="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true"></i-lucide>
          <span class="truncate font-medium">{{ subtitle }}</span>
        </p>
      }
    </div>
  `,
})
export class StatCardComponent {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() icon = 'car';
  @Input() subtitle = '';
  @Input() tooltip?: string = '';
  /** Etiqueta corta en la esquina superior derecha (p. ej. HOY, PERÍODO, REAL). */
  @Input() badge = '';
  @Input() variant: 'primary' | 'success' | 'warning' | 'danger' = 'success';

  /** Tooltip explícito o, en su defecto, la descripción del diccionario central. */
  get descripcion(): string {
    return this.tooltip || getKpiDescription(this.title);
  }

  get iconWrapperClass(): string {
    switch (this.variant) {
      case 'primary': return 'bg-easydry-blue/10';
      case 'warning': return 'bg-amber-100';
      case 'danger': return 'bg-rose-100';
      default: return 'bg-easydry-green/15';
    }
  }

  get iconColorClass(): string {
    switch (this.variant) {
      case 'primary': return 'text-easydry-blue';
      case 'warning': return 'text-amber-600';
      case 'danger': return 'text-rose-600';
      default: return 'text-easydry-green-text';
    }
  }

  get valueColorClass(): string {
    switch (this.variant) {
      case 'warning': return 'text-amber-600';
      case 'danger': return 'text-rose-600';
      default: return 'text-slate-900';
    }
  }
}
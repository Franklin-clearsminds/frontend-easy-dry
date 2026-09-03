import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  host: { class: 'block h-full' },
  template: `
    <div class="h-full flex flex-col justify-between bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry hover:shadow-easydry-hover transition-all duration-300 relative overflow-hidden group">
      
      <!-- Top Accent Bar -->
      <div 
        class="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5"
        [ngClass]="{
          'bg-easydry-green': variant === 'success' || !variant,
          'bg-easydry-blue': variant === 'primary',
          'bg-amber-400': variant === 'warning',
          'bg-rose-500': variant === 'danger'
        }">
      </div>

      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ title }}</p>
          <h3 class="text-2xl font-extrabold text-slate-900 mt-1 font-outfit tracking-tight">{{ value }}</h3>
        </div>

        <div 
          class="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
          [ngClass]="{
            'bg-easydry-green/15 text-easydry-green-dark': variant === 'success' || !variant,
            'bg-easydry-blue/10 text-easydry-blue': variant === 'primary',
            'bg-amber-100 text-amber-700': variant === 'warning',
            'bg-rose-100 text-rose-700': variant === 'danger'
          }">
          <i-lucide [name]="icon" class="w-6 h-6"></i-lucide>
        </div>
      </div>
    </div>
  `
})
export class StatCardComponent {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() icon = 'car';
  @Input() subtitle = '';
  @Input() trend = '';
  @Input() trendPositive = true;
  @Input() variant: 'primary' | 'success' | 'warning' | 'danger' = 'success';
}
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-pulse motion-reduce:animate-none space-y-4" role="status" aria-live="polite" aria-busy="true">
      <span class="sr-only">Cargando…</span>
      @if (type === 'cards') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-white rounded-2xl p-5 border border-slate-100 h-32 flex flex-col justify-between">
              <div class="h-4 bg-slate-200 rounded w-1/2"></div>
              <div class="h-8 bg-slate-200 rounded w-3/4"></div>
              <div class="h-3 bg-slate-200 rounded w-1/3"></div>
            </div>
          }
        </div>
      } @else if (type === 'table') {
        <div class="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
          <div class="h-6 bg-slate-200 rounded w-1/4"></div>
          @for (i of [1,2,3,4,5]; track i) {
            <div class="h-10 bg-slate-100 rounded w-full"></div>
          }
        </div>
      } @else if (type === 'chart') {
        <div class="bg-white rounded-2xl p-6 border border-slate-100 h-80 flex flex-col justify-between">
          <div class="h-6 bg-slate-200 rounded w-1/3"></div>
          <div class="flex-1 my-4 bg-slate-100 rounded-xl"></div>
        </div>
      }
    </div>
  `
})
export class SkeletonLoaderComponent {
  @Input() type: 'cards' | 'table' | 'chart' = 'cards';
}

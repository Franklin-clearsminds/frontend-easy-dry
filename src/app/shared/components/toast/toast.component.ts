import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed top-4 left-4 right-4 sm:top-6 sm:left-auto sm:right-6 z-[999999] flex flex-col gap-3 sm:max-w-sm w-auto sm:w-full pointer-events-none">
      @for (toast of toastService.toasts$ | async; track toast.id) {
        <div 
          class="pointer-events-auto flex items-start p-4 rounded-xl shadow-xl border animate-fade-in transition-all duration-300 bg-white text-slate-800"
          [ngClass]="{
            'border-easydry-green/50': toast.type === 'success',
            'border-amber-400': toast.type === 'warning',
            'border-rose-400': toast.type === 'error',
            'border-easydry-blue/50': toast.type === 'info'
          }">
          <div class="mr-3 mt-0.5 p-1.5 rounded-lg"
            [ngClass]="{
              'bg-easydry-green/20 text-easydry-green-dark': toast.type === 'success',
              'bg-amber-100 text-amber-700': toast.type === 'warning',
              'bg-rose-100 text-rose-700': toast.type === 'error',
              'bg-easydry-blue/15 text-easydry-blue': toast.type === 'info'
            }">
            <i-lucide 
              [name]="toast.type === 'success' ? 'check-circle-2' : toast.type === 'warning' ? 'alert-triangle' : toast.type === 'error' ? 'alert-circle' : 'droplet'" 
              class="w-5 h-5">
            </i-lucide>
          </div>

          <div class="flex-1">
            <h4 class="font-semibold text-sm leading-tight text-slate-900">{{ toast.title }}</h4>
            <p class="text-xs text-slate-600 mt-1 leading-snug">{{ toast.message }}</p>
          </div>

          <button 
            (click)="toastService.remove(toast.id)" 
            class="text-slate-400 hover:text-slate-600 ml-2 p-1 rounded-md transition-colors">
            <i-lucide name="x" class="w-4 h-4"></i-lucide>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  public toastService = inject(ToastService);
}

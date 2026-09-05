import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-servicios-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4 mb-4">
      
      <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[220px]">
        <div class="relative flex-1 min-w-[200px]">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <i-lucide name="search" class="w-4 h-4"></i-lucide>
          </span>
          <input 
            type="text" 
            [ngModel]="searchValue"
            (ngModelChange)="onSearchChange($event)"
            [placeholder]="placeholder"
            class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-easydry-blue transition-all">
        </div>
      </div>

      <div class="text-xs font-bold text-slate-500 whitespace-nowrap">
        {{ label }}: <strong [ngClass]="labelColor">{{ count }} {{ countLabel }}</strong>
      </div>

    </div>
  `
})
export class ServiciosToolbarComponent {
  @Input() count = 0;
  @Input() label = 'Resultados';
  @Input() countLabel = '';
  @Input() labelColor = 'text-easydry-blue';
  @Input() placeholder = 'Buscar...';
  @Input() searchValue = '';
  @Output() searchChange = new EventEmitter<string>();

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }
}

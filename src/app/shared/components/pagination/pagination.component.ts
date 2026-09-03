import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-white rounded-b-2xl">
      <!-- Items per page selector -->
      <div class="flex items-center gap-2 flex-wrap">
        <label class="text-xs font-bold text-slate-500">Mostrar:</label>
        <select 
          [(ngModel)]="pageSize" 
          (change)="onPageSizeChange()"
          class="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 focus:ring-2 focus:ring-easydry-blue/20 outline-none transition-shadow cursor-pointer">
          @for (size of pageSizeOptions; track size) {
            <option [value]="size">{{ size }}</option>
          }
        </select>
        <span class="text-xs font-bold text-slate-500">por página</span>
        <span class="text-slate-300 mx-0.5">•</span>
        <span class="text-xs font-semibold text-slate-600 bg-slate-100/90 px-2.5 py-0.5 rounded-full border border-slate-200/60">
          Total: <strong class="text-easydry-blue font-extrabold">{{ totalItems }}</strong> {{ totalItems === 1 ? 'registro' : 'registros' }}
        </span>
      </div>

      <!-- Pagination controls -->
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold text-slate-500">
          {{ startItem }} - {{ endItem }} de {{ totalItems }}
        </span>
        
        <div class="flex items-center gap-1">
          <button 
            (click)="prevPage()" 
            [disabled]="currentPage === 1"
            class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-easydry-blue disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <i-lucide name="chevron-left" class="w-4 h-4"></i-lucide>
          </button>
          
          <div class="flex items-center px-2 text-xs font-bold text-slate-700">
            Pág {{ currentPage }} / {{ totalPages }}
          </div>

          <button 
            (click)="nextPage()" 
            [disabled]="currentPage === totalPages || totalPages === 0"
            class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-easydry-blue disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <i-lucide name="chevron-right" class="w-4 h-4"></i-lucide>
          </button>
        </div>
      </div>
    </div>
  `
})
export class PaginationComponent implements OnChanges {
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 5;
  @Input() pageSizeOptions = [5, 10, 20, 50];
  
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get startItem(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalItems']) {
      // If total items changed and current page is now out of bounds, adjust
      if (this.currentPage > this.totalPages && this.totalPages > 0) {
        this.pageChange.emit(1);
      }
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  onPageSizeChange() {
    this.pageSizeChange.emit(Number(this.pageSize));
  }
}

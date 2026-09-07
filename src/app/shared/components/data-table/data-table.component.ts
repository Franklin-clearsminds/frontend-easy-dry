import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'badge' | 'date' | 'number' | 'custom';
  badgeMap?: Record<string, string>;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface TableAction {
  id: string;
  label: string;
  icon?: string;
  colorClass?: string;
  tooltip?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden flex flex-col">
      
      <!-- Top Table Toolbar (Search, Info & Actions Slot) -->
      @if (showToolbar) {
        <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div class="flex items-center gap-3 flex-1 max-w-md">
            @if (searchable) {
              <div class="relative w-full">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <i-lucide name="search" class="w-4 h-4"></i-lucide>
                </span>
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (input)="onSearchChange()"
                  [placeholder]="searchPlaceholder"
                  class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-easydry-blue focus:bg-white transition-all">
              </div>
            }
          </div>

          <div class="flex items-center gap-2 justify-end">
            <span class="text-xs font-bold text-slate-500">
              Total: <strong class="text-easydry-blue">{{ filteredData.length }}</strong> registros
            </span>
            <ng-content select="[table-actions]"></ng-content>
          </div>
        </div>
      }

      <!-- Responsive Table View -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <!-- Table Header -->
          <thead class="bg-slate-50/80 text-slate-500 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-100 select-none">
            <tr>
              @for (col of columns; track col.key) {
                <th
                  class="py-3 px-4"
                  [style.width]="col.width || 'auto'"
                  [ngClass]="{
                    'cursor-pointer hover:text-easydry-blue transition-colors': col.sortable,
                    'text-center': col.align === 'center',
                    'text-right': col.align === 'right'
                  }"
                  (click)="col.sortable ? onSort(col.key) : null">
                  <div class="flex items-center gap-1.5" [ngClass]="{ 'justify-center': col.align === 'center', 'justify-end': col.align === 'right' }">
                    <span>{{ col.label }}</span>
                    @if (col.sortable) {
                      <span class="text-slate-400">
                        @if (sortKey === col.key) {
                          <i-lucide [name]="sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                        } @else {
                          <i-lucide name="arrow-up-down" class="w-3 h-3 opacity-40"></i-lucide>
                        }
                      </span>
                    }
                  </div>
                </th>
              }
              @if (actions && actions.length > 0) {
                <th class="py-3 px-4 text-right">Acciones</th>
              }
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
            @if (paginatedData.length === 0) {
              <tr>
                <td [attr.colspan]="columns.length + (actions.length > 0 ? 1 : 0)" class="py-12 text-center text-slate-400">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <i-lucide name="inbox" class="w-6 h-6"></i-lucide>
                    </div>
                    <p class="font-bold text-slate-600 text-sm">No se encontraron registros</p>
                    <p class="text-xs text-slate-400">Prueba ajustando los filtros o criterios de búsqueda</p>
                  </div>
                </td>
              </tr>
            }

            @for (row of paginatedData; track trackByFn(row)) {
              <tr class="hover:bg-slate-50/70 transition-colors">
                @for (col of columns; track col.key) {
                  <td class="py-3.5 px-4" [ngClass]="{ 'text-center': col.align === 'center', 'text-right': col.align === 'right' }">
                    
                    @switch (col.type) {
                      @case ('badge') {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide"
                          [ngClass]="getBadgeClass(col, row[col.key])">
                          {{ row[col.key] || 'N/A' }}
                        </span>
                      }
                      @default {
                        <span class="text-slate-800">{{ row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '-' }}</span>
                      }
                    }

                  </td>
                }

                <!-- Actions Column -->
                @if (actions && actions.length > 0) {
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      @for (act of actions; track act.id) {
                        <button
                          type="button"
                          (click)="onAction(act.id, row)"
                          [title]="act.tooltip || act.label"
                          class="p-1.5 rounded-lg border border-transparent transition-colors cursor-pointer"
                          [ngClass]="act.colorClass || 'text-slate-600 hover:text-easydry-blue hover:bg-slate-100'">
                          @if (act.icon) {
                            <i-lucide [name]="act.icon" class="w-4 h-4"></i-lucide>
                          } @else {
                            <span class="text-[11px] font-bold px-1">{{ act.label }}</span>
                          }
                        </button>
                      }
                    </div>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      @if (totalPages > 1) {
        <div class="p-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div class="text-slate-500 font-medium">
            Mostrando <strong>{{ (currentPage - 1) * pageSize + 1 }}</strong> a <strong>{{ Math.min(currentPage * pageSize, filteredData.length) }}</strong> de <strong>{{ filteredData.length }}</strong> registros
          </div>

          <div class="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              (click)="goToPage(currentPage - 1)"
              [disabled]="currentPage === 1"
              class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <i-lucide name="chevron-left" class="w-4 h-4"></i-lucide>
            </button>

            @for (p of pagesArray; track p) {
              <button
                type="button"
                (click)="goToPage(p)"
                class="w-7 h-7 rounded-lg text-xs font-bold transition-all"
                [ngClass]="currentPage === p ? 'bg-easydry-blue text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'">
                {{ p }}
              </button>
            }

            <button
              type="button"
              (click)="goToPage(currentPage + 1)"
              [disabled]="currentPage === totalPages"
              class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <i-lucide name="chevron-right" class="w-4 h-4"></i-lucide>
            </button>
          </div>
        </div>
      }

    </div>
  `
})
export class DataTableComponent implements OnInit, OnChanges {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() actions: TableAction[] = [];
  @Input() pageSize = 10;
  @Input() searchable = true;
  @Input() searchPlaceholder = 'Buscar en la tabla...';
  @Input() showToolbar = true;
  @Input() trackByProperty = 'id';

  @Output() actionClick = new EventEmitter<{ actionId: string; row: any }>();
  @Output() rowClick = new EventEmitter<any>();

  readonly Math = Math;
  searchQuery = '';
  filteredData: any[] = [];
  sortKey = '';
  sortOrder: 'asc' | 'desc' = 'asc';
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.pageSize) || 1;
  }

  get paginatedData(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredData.slice(start, start + this.pageSize);
  }

  get pagesArray(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  ngOnInit(): void {
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.refresh();
    }
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.filterAndSort();
  }

  onSort(key: string): void {
    if (this.sortKey === key) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortOrder = 'asc';
    }
    this.filterAndSort();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onAction(actionId: string, row: any): void {
    this.actionClick.emit({ actionId, row });
  }

  trackByFn(row: any): any {
    return row[this.trackByProperty] || row;
  }

  getBadgeClass(col: TableColumn, value: any): string {
    if (col.badgeMap && col.badgeMap[value]) {
      return col.badgeMap[value];
    }
    const str = String(value || '').toLowerCase();
    if (str.includes('activ') || str.includes('operativ') || str.includes('aprob') || str.includes('complet')) {
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    }
    if (str.includes('inactiv') || str.includes('rechaz') || str.includes('dañad') || str.includes('cancel')) {
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    }
    if (str.includes('pendient') || str.includes('mantenim') || str.includes('cola') || str.includes('proceso')) {
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  }

  private refresh(): void {
    this.filterAndSort();
  }

  private filterAndSort(): void {
    let result = [...(this.data || [])];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        return this.columns.some(col => {
          const val = item[col.key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        });
      });
    }

    if (this.sortKey) {
      result.sort((a, b) => {
        const valA = a[this.sortKey];
        const valB = b[this.sortKey];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const comparison = valA < valB ? -1 : 1;
        return this.sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredData = result;
  }
}

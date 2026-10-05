import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { PAGE_SIZES_TABLA } from '../../../core/config/paginacion';

/**
 * Paginador con páginas numeradas. No conoce los datos: recibe total, página y tamaño y avisa cuando el usuario
 * cambia de página o de tamaño, así sirve igual para paginación del servidor y del cliente.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <nav aria-label="Paginación" class="flex flex-col lg:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white rounded-b-2xl">
      <!-- Resultados y filas por página -->
      <div class="flex items-center gap-x-4 gap-y-2 flex-wrap justify-center lg:justify-start">
        <p class="text-xs font-semibold text-slate-600" role="status" aria-live="polite">
          @if (totalItems === 0) {
            Sin resultados
          } @else {
            Resultados <strong class="text-slate-800">{{ startItem }}–{{ endItem }}</strong>
            de <strong class="text-easydry-blue font-extrabold">{{ totalItems | number }}</strong>
          }
        </p>
        <div class="flex items-center gap-2">
          <label [for]="idTamano" class="text-xs font-bold text-slate-500">Filas:</label>
          <select
            [id]="idTamano"
            [ngModel]="pageSize"
            (ngModelChange)="onPageSizeChange($event)"
            [disabled]="loading"
            class="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg pl-2 pr-9 py-1.5 select-chevron focus:ring-2 focus:ring-easydry-blue/20 outline-none transition-shadow cursor-pointer disabled:opacity-50">
            @for (size of opciones; track size) {
              <option [ngValue]="size">{{ size }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Páginas -->
      <div class="flex items-center gap-1" [class.opacity-60]="loading" [attr.aria-busy]="loading">
        <button type="button" (click)="ir(1)" [disabled]="currentPage <= 1 || loading"
                aria-label="Primera página" title="Primera página"
                class="btn-icon border border-slate-200 disabled:opacity-40">
          <i-lucide name="chevrons-left" class="w-4 h-4" aria-hidden="true"></i-lucide>
        </button>
        <button type="button" (click)="ir(currentPage - 1)" [disabled]="currentPage <= 1 || loading"
                aria-label="Página anterior" title="Página anterior"
                class="btn-icon border border-slate-200 disabled:opacity-40">
          <i-lucide name="chevron-left" class="w-4 h-4" aria-hidden="true"></i-lucide>
        </button>

        @for (p of paginas; track $index) {
          @if (p === null) {
            <span class="w-6 text-center text-xs font-bold text-slate-500" aria-hidden="true">…</span>
          } @else {
            <button type="button" (click)="ir(p)" [disabled]="loading"
                    [attr.aria-label]="'Página ' + p" [attr.aria-current]="p === currentPage ? 'page' : null"
                    class="min-w-9 h-9 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    [ngClass]="p === currentPage
                      ? 'bg-easydry-blue text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'">
              {{ p }}
            </button>
          }
        }

        <button type="button" (click)="ir(currentPage + 1)" [disabled]="currentPage >= totalPages || loading"
                aria-label="Página siguiente" title="Página siguiente"
                class="btn-icon border border-slate-200 disabled:opacity-40">
          <i-lucide name="chevron-right" class="w-4 h-4" aria-hidden="true"></i-lucide>
        </button>
        <button type="button" (click)="ir(totalPages)" [disabled]="currentPage >= totalPages || loading"
                aria-label="Última página" title="Última página"
                class="btn-icon border border-slate-200 disabled:opacity-40">
          <i-lucide name="chevrons-right" class="w-4 h-4" aria-hidden="true"></i-lucide>
        </button>
      </div>
    </nav>
  `,
})
export class PaginationComponent implements OnChanges {
  private static contador = 0;
  readonly idTamano = 'pag-size-' + (++PaginationComponent.contador);

  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = PAGE_SIZES_TABLA[0];
  @Input() pageSizeOptions: number[] = PAGE_SIZES_TABLA;
  /** true mientras se pide una página al servidor: desactiva los botones. */
  @Input() loading = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  /** Las opciones incluyen siempre el tamaño actual (pantallas antiguas usan 5 o 6 por página). */
  get opciones(): number[] {
    return Array.from(new Set([...this.pageSizeOptions, this.pageSize])).sort((a, b) => a - b);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / Math.max(1, this.pageSize)));
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  /** Números de página con puntos suspensivos (null) cuando hay muchas: 1 … 4 5 [6] 7 8 … 40. */
  get paginas(): Array<number | null> {
    const total = this.totalPages;
    const actual = Math.min(this.currentPage, total);
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const paginas: Array<number | null> = [1];
    const desde = Math.max(2, actual - 1);
    const hasta = Math.min(total - 1, actual + 1);
    if (desde > 2) paginas.push(null);
    for (let p = desde; p <= hasta; p++) paginas.push(p);
    if (hasta < total - 1) paginas.push(null);
    paginas.push(total);
    return paginas;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalItems'] && !changes['totalItems'].firstChange) {
      // Si el total bajó y la página actual ya no existe, se vuelve a la primera.
      if (this.currentPage > this.totalPages) this.pageChange.emit(1);
    }
  }

  ir(pagina: number): void {
    const destino = Math.min(Math.max(1, pagina), this.totalPages);
    if (destino !== this.currentPage) this.pageChange.emit(destino);
  }

  onPageSizeChange(valor: number | string): void {
    this.pageSizeChange.emit(Number(valor));
  }
}

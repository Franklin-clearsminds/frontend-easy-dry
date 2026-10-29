import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { InventarioService } from '../../../core/services/inventario.service';
import { TablaServidor } from '../../../core/utils/tabla-servidor';
import { DataTableCellDirective, DataTableComponent, TableColumn } from '../../../shared/components/data-table/data-table.component';

/**
 * Tabla de los insumos de UNA agencia o de UN kit de pulidor (el interior de cada ficha del monitoreo de suministros).
 * Pide su propia página al servidor —con orden y búsqueda— la primera vez que se muestra, y se vuelve a pedir cuando el
 * padre cambia `refreshToken` (después de despachar, reajustar, etc.).
 */
@Component({
  selector: 'app-stock-ubicacion-insumos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DataTableComponent, DataTableCellDirective],
  template: `
    <app-data-table
      [serverSide]="true"
      [embebida]="true"
      [columns]="columnas"
      [data]="tabla.filas"
      [total]="tabla.total"
      [page]="tabla.pagina"
      [pageSize]="tabla.pageSize"
      [sortField]="tabla.sortField"
      [sortOrder]="tabla.sortOrder"
      [loading]="tabla.cargando"
      [error]="tabla.error"
      [caption]="tipo === 'agencia' ? 'Insumos de la agencia' : 'Insumos del kit del pulidor'"
      searchPlaceholder="Buscar insumo o SKU..."
      [emptyTitle]="tipo === 'agencia' ? 'No hay insumos que coincidan en esta agencia.' : 'No hay insumos que coincidan en el kit de este pulidor.'"
      emptyHint=""
      (queryChange)="tabla.alCambiar($event)"
      (reintentar)="tabla.cargar(true)">

      <ng-template appCell="sku" let-i><span class="font-mono font-bold text-slate-800">{{ i.codigoSKU || i.sku }}</span></ng-template>
      <ng-template appCell="nombre" let-i>
        <span class="font-bold text-slate-900" [class.uppercase]="tipo === 'pulidor'">{{ i.nombre }}</span>
        <span
          *ngIf="i.enTransitoUnidades > 0"
          class="ml-1.5 inline-flex items-center gap-1 align-middle px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap"
          title="Ya se generó un envío de este insumo y está en camino">
          <i-lucide aria-hidden="true" name="truck" class="w-3 h-3"></i-lucide>
          En camino
        </span>
      </ng-template>
      <ng-template appCell="tipo" let-i>
        <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-easydry-blue">{{ i.tipoProducto || i.categoria || 'General' }}</span>
      </ng-template>
      <ng-template appCell="contenido" let-i>
        <span class="font-mono font-bold text-slate-700 whitespace-nowrap">{{ (i.contenidoNeto || 1) | number:'1.0-2' }} {{ i.unidad }}</span>
      </ng-template>
      <ng-template appCell="stockUnidades" let-i>
        <span class="px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block whitespace-nowrap">
          {{ enUnidades(i.stockActual, i.contenidoNeto) | number:'1.0-2' }} und
        </span>
      </ng-template>
      <ng-template appCell="stock" let-i>
        <span
          class="px-2.5 py-0.5 rounded-md font-mono font-bold text-xs whitespace-nowrap"
          [ngClass]="{
            'bg-rose-100 text-rose-800': i.estado === 'Sin Stock' || i.estado === 'Crítico',
            'bg-amber-100 text-amber-800': i.estado === 'Bajo',
            'bg-emerald-100 text-emerald-800': i.estado === 'Óptimo'
          }">
          {{ i.stockActual | number:'1.0-2' }} {{ i.unidad }}
        </span>
      </ng-template>
      <ng-template appCell="transito" let-i>
        <div *ngIf="i.enTransitoUnidades > 0; else sinTransito" class="whitespace-nowrap"
          [title]="i.enTransitoDespachos + (i.enTransitoDespachos === 1 ? ' envío' : ' envíos') + ' en camino'">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-sky-50 text-sky-700 border border-sky-200">
            <i-lucide aria-hidden="true" name="truck" class="w-3 h-3"></i-lucide>
            {{ i.enTransitoUnidades | number:'1.0-2' }} und
          </span>
          <span class="block text-[10px] text-slate-500 mt-0.5">{{ i.enTransitoDespachos }} {{ i.enTransitoDespachos === 1 ? 'envío' : 'envíos' }}</span>
        </div>
        <ng-template #sinTransito><span class="text-slate-400 font-mono">—</span></ng-template>
      </ng-template>
      <ng-template appCell="minimo" let-i>
        <div class="font-mono text-slate-600 whitespace-nowrap">
          <b>{{ enUnidades(i.stockMinimo, i.contenidoNeto) | number:'1.0-2' }} und</b>
          <span class="text-xs text-slate-500 block">({{ i.stockMinimo | number:'1.0-2' }} {{ i.unidad }})</span>
        </div>
      </ng-template>
      <ng-template appCell="deficit" let-i>
        <span class="font-mono font-bold whitespace-nowrap" [ngClass]="i.deficit > 0 ? 'text-rose-600' : 'text-slate-500'">
          {{ i.deficit > 0 ? ('-' + (enUnidades(i.deficit, i.contenidoNeto) | number:'1.0-2') + ' und') : 'Cubierto' }}
        </span>
      </ng-template>
      <ng-template appCell="estado" let-i>
        <span
          class="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
          [ngClass]="{
            'bg-rose-50 text-rose-700 border border-rose-200': i.estado === 'Sin Stock' || i.estado === 'Crítico',
            'bg-amber-50 text-amber-700 border border-amber-200': i.estado === 'Bajo',
            'bg-emerald-50 text-emerald-700 border border-emerald-200': i.estado === 'Óptimo'
          }">
          {{ i.estado }}
        </span>
      </ng-template>
      <ng-template appCell="acciones" let-i>
        <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
          <button
            type="button"
            *ngIf="puedeDespachar"
            (click)="despachar.emit(i)"
            class="px-2.5 py-1 rounded-lg bg-easydry-blue hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer">
            Despachar
          </button>
          <button
            type="button"
            *ngIf="puedeReajustar"
            (click)="reajustar.emit(i)"
            title="Reajustar stock por conteo físico"
            class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1">
            <i-lucide aria-hidden="true" name="sliders" class="w-3 h-3"></i-lucide>
            <span>Reajustar</span>
          </button>
        </div>
      </ng-template>
    </app-data-table>
  `,
})
export class StockUbicacionInsumosComponent implements OnInit, OnChanges, OnDestroy {
  private readonly inventario = inject(InventarioService);

  @Input({ required: true }) tipo!: 'agencia' | 'pulidor';
  /** Id de la agencia o del pulidor cuyos insumos se muestran. */
  @Input({ required: true }) ubicacionId!: string;
  @Input() puedeDespachar = false;
  @Input() puedeReajustar = false;
  /** El padre lo incrementa para pedir de nuevo la página (después de despachar, reajustar…). */
  @Input() refreshToken = 0;

  @Output() despachar = new EventEmitter<any>();
  @Output() reajustar = new EventEmitter<any>();

  readonly columnas: TableColumn[] = [
    { key: 'sku', label: 'Código SKU', sortable: true, defaultSort: 'asc' },
    { key: 'nombre', label: 'Insumo', sortable: true, defaultSort: 'asc' },
    { key: 'tipo', label: 'Tipo', sortable: true, defaultSort: 'asc' },
    { key: 'contenido', label: 'Contenido x Envase', sortable: true, defaultSort: 'desc' },
    { key: 'stockUnidades', label: 'Stock en Unidades' },
    { key: 'stock', label: 'Stock Contenido Total', sortable: true, defaultSort: 'asc' },
    { key: 'transito', label: 'En Tránsito', sortable: true, defaultSort: 'desc' },
    { key: 'minimo', label: 'Stock Mínimo', sortable: true, defaultSort: 'desc' },
    { key: 'deficit', label: 'Déficit', sortable: true, defaultSort: 'desc' },
    { key: 'estado', label: 'Estado de Salud', sortable: true, defaultSort: 'asc' },
    { key: 'acciones', label: 'Acción', align: 'right', sticky: true },
  ];

  /** Por defecto el servidor los ordena por nombre. */
  readonly tabla = new TablaServidor<any>((c) => this.inventario.getInsumosUbicacionPagina(this.tipo, this.ubicacionId, c), {
    sortOrder: 'asc',
  });

  ngOnInit(): void {
    this.tabla.reiniciar();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['refreshToken'] && !cambios['refreshToken'].firstChange) this.tabla.refrescar();
  }

  ngOnDestroy(): void {
    this.tabla.destruir();
  }

  enUnidades(stock: number | null | undefined, contenidoNeto: number | null | undefined): number {
    const s = Number(stock) || 0;
    const c = Number(contenidoNeto) || 1;
    return c <= 0 ? s : Math.round((s / c) * 100) / 100;
  }
}

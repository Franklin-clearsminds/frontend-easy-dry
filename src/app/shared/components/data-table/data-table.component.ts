import {
  Component, ContentChildren, Directive, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, QueryList,
  SimpleChanges, TemplateRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { PaginationComponent } from '../pagination/pagination.component';
import {
  BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZES_TABLA, PAGE_SIZE_TABLA,
} from '../../../core/config/paginacion';
import { ConsultaTabla, OrdenDir } from '../../../core/models/paginacion.model';

export interface TableColumn {
  key: string;
  label: string;
  /** En modo servidor, `key` es lo que se envía como `sortField`: debe estar permitido en el backend. */
  sortable?: boolean;
  /** Dirección del primer clic al ordenar por esta columna (fechas: 'desc' = más reciente primero). */
  defaultSort?: OrdenDir;
  type?: 'text' | 'badge' | 'date' | 'datetime' | 'number' | 'custom';
  badgeMap?: Record<string, string>;
  align?: 'left' | 'center' | 'right';
  width?: string;
  /** Oculta la columna en pantallas angostas (< md). */
  hideOnMobile?: boolean;
  /**
   * Fija la columna al borde derecho: no se mueve con el scroll horizontal. Pensada para "Acciones"
   * en tablas anchas, donde si no, el encabezado y los botones pueden terminar viéndose desalineados
   * entre sí (cada uno recortado de forma distinta por el borde de la pantalla).
   */
  sticky?: boolean;
}

export interface TableAction {
  id: string;
  label: string;
  icon?: string;
  colorClass?: string;
  tooltip?: string;
}

/**
 * Celda personalizada:  <ng-template appCell="estado" let-row>…</ng-template>
 * (una plantilla por columna con `type: 'custom'` o para reemplazar el formato de cualquier columna).
 */
@Directive({ selector: 'ng-template[appCell]', standalone: true })
export class DataTableCellDirective {
  @Input('appCell') columna = '';
  readonly plantilla = inject<TemplateRef<{ $implicit: any }>>(TemplateRef);
}

/**
 * Tabla de datos reutilizable.
 *
 * MODO SERVIDOR (`serverSide`): `data` es solo la página actual y `total` el total del servidor. La tabla no filtra,
 * ordena ni corta nada: cada cambio de página, tamaño, orden o búsqueda emite `queryChange` y el padre pide esa página.
 * MODO CLIENTE (por defecto): igual que antes, filtra, ordena y pagina los datos recibidos (solo para listas pequeñas).
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PaginationComponent],
  template: `
    <div class="bg-white flex flex-col" [ngClass]="embebida ? '' : 'rounded-2xl border border-slate-100 shadow-easydry overflow-hidden'">

      <!-- Barra superior: búsqueda, total y acciones -->
      @if (showToolbar) {
        <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div class="flex-1 max-w-md">
            @if (searchable) {
              <div class="relative w-full">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                  <i-lucide name="search" class="w-4 h-4" aria-hidden="true"></i-lucide>
                </span>
                <input
                  type="search"
                  aria-label="Buscar en la tabla"
                  [ngModel]="searchQuery"
                  (ngModelChange)="onSearchChange($event)"
                  [placeholder]="searchPlaceholder"
                  class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-easydry-blue focus:bg-white transition-colors">
              </div>
              @if (busquedaCorta) {
                <p class="mt-1 text-[11px] font-semibold text-slate-500">Escribe al menos {{ minBusqueda }} letras para buscar.</p>
              }
            }
          </div>

          <div class="flex items-center gap-2 justify-end">
            <span class="text-xs font-bold text-slate-500">
              Total: <strong class="text-easydry-blue">{{ totalMostrado | number }}</strong> registros
            </span>
            <ng-content select="[table-actions]"></ng-content>
          </div>
        </div>
      }

      <!-- Tabla con encabezado fijo. Sin "overscroll-contain": por defecto (maxHeight=none) este div no
           tiene scroll vertical propio, así que contener el rebote aquí bloqueaba que el gesto de scroll
           se propagara a la página apenas tocaba el área de la tabla (había que salir de su borde para
           poder scrollear). Solo se contiene cuando el consumidor sí pide un alto acotado de verdad. -->
      <div class="overflow-auto" [class.overscroll-contain]="maxHeight !== 'none'" [style.max-height]="maxHeight" [attr.aria-busy]="loading">
        <table class="w-full text-left text-xs border-collapse">
          @if (caption) { <caption class="sr-only">{{ caption }}</caption> }
          <thead class="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 select-none"
                 [class.sticky]="stickyHeader" [class.top-0]="stickyHeader" [class.z-10]="stickyHeader">
            <tr>
              @for (col of columns; track col.key) {
                <th
                  scope="col"
                  class="py-3 px-4 bg-slate-50 whitespace-nowrap"
                  [class.hidden]="col.hideOnMobile"
                  [class.md:table-cell]="col.hideOnMobile"
                  [style.width]="col.width || 'auto'"
                  [attr.aria-sort]="col.sortable ? (sortField === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none') : null"
                  [ngClass]="{ 'hidden md:table-cell': col.hideOnMobile, 'text-center': col.align === 'center', 'text-right': col.align === 'right', 'sticky right-0 z-20 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]': col.sticky }">
                  @if (col.sortable) {
                    <button
                      type="button"
                      (click)="onSort(col)"
                      class="flex items-center gap-1.5 w-full uppercase tracking-wider font-extrabold hover:text-easydry-blue transition-colors cursor-pointer"
                      [ngClass]="{ 'justify-center': col.align === 'center', 'justify-end': col.align === 'right' }">
                      <span>{{ col.label }}</span>
                      @if (sortField === col.key) {
                        <i-lucide [name]="sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide>
                      } @else {
                        <i-lucide name="arrow-up-down" class="w-3 h-3 opacity-40" aria-hidden="true"></i-lucide>
                      }
                    </button>
                  } @else {
                    <span>{{ col.label }}</span>
                  }
                </th>
              }
              @if (actions && actions.length > 0) {
                <th scope="col" class="py-3 px-4 text-right bg-slate-50 sticky right-0 z-20 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]">Acciones</th>
              }
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 text-slate-700 font-medium" [class.opacity-60]="loading && filas.length > 0">

            @if (loading && filas.length === 0) {
              <!-- Esqueleto mientras llega la primera página -->
              @for (n of esqueletoFilas; track n) {
                <tr aria-hidden="true">
                  @for (col of columns; track col.key) {
                    <td class="py-3.5 px-4" [ngClass]="{ 'hidden md:table-cell': col.hideOnMobile }">
                      <div class="h-3.5 rounded bg-slate-100 animate-pulse motion-reduce:animate-none" [style.width]="(50 + ((n * 17 + $index * 23) % 40)) + '%'"></div>
                    </td>
                  }
                  @if (actions && actions.length > 0) { <td class="py-3.5 px-4"><div class="h-3.5 w-10 ml-auto rounded bg-slate-100 animate-pulse motion-reduce:animate-none"></div></td> }
                </tr>
              }
              <tr class="sr-only"><td [attr.colspan]="totalColumnas" role="status">Cargando…</td></tr>
            } @else if (error) {
              <tr>
                <td [attr.colspan]="totalColumnas" class="py-10 px-4">
                  <div role="alert" class="flex flex-col items-center gap-3 text-center">
                    <div class="estado-error">{{ error }}</div>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="reintentar.emit()">Reintentar</button>
                  </div>
                </td>
              </tr>
            } @else if (filas.length === 0) {
              <tr>
                <td [attr.colspan]="totalColumnas" class="estado-vacio py-12">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <i-lucide name="inbox" class="w-6 h-6" aria-hidden="true"></i-lucide>
                    </div>
                    <p class="font-bold text-slate-600 text-sm">{{ emptyTitle }}</p>
                    <p class="text-xs text-slate-500 font-normal">{{ emptyHint }}</p>
                  </div>
                </td>
              </tr>
            }

            @for (row of filas; track trackByFn(row, $index)) {
              <tr class="group hover:bg-slate-50/80 transition-colors"
                  [ngClass]="rowClass ? rowClass(row) : ''"
                  [class.cursor-pointer]="rowClickable"
                  [attr.tabindex]="rowClickable ? 0 : null"
                  (click)="abrirFila(row)"
                  (keydown.enter)="abrirFila(row)"
                  (keydown.space)="abrirFilaConEspacio($event, row)">
                @for (col of columns; track col.key) {
                  <td class="py-3 px-4"
                      [ngClass]="{ 'hidden md:table-cell': col.hideOnMobile, 'text-center': col.align === 'center', 'text-right': col.align === 'right', 'sticky right-0 z-[5] bg-white group-hover:bg-slate-50 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]': col.sticky }">
                    @if (plantillaDe(col.key); as tpl) {
                      <ng-container *ngTemplateOutlet="tpl; context: { $implicit: row }"></ng-container>
                    } @else {
                      @switch (col.type) {
                        @case ('badge') {
                          <span class="badge" [ngClass]="getBadgeClass(col, row[col.key])">{{ row[col.key] || 'N/A' }}</span>
                        }
                        @case ('date') { <span class="text-slate-800">{{ row[col.key] | date:'dd/MM/yyyy' }}</span> }
                        @case ('datetime') { <span class="text-slate-800 whitespace-nowrap">{{ row[col.key] | date:'dd/MM/yyyy HH:mm' }}</span> }
                        @case ('number') { <span class="text-slate-800 tabular-nums">{{ row[col.key] | number }}</span> }
                        @default {
                          <span class="text-slate-800 break-words">{{ row[col.key] !== undefined && row[col.key] !== null && row[col.key] !== '' ? row[col.key] : '—' }}</span>
                        }
                      }
                    }
                  </td>
                }

                @if (actions && actions.length > 0) {
                  <td class="py-2 px-4 text-right sticky right-0 z-[5] bg-white group-hover:bg-slate-50 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                    <div class="flex items-center justify-end gap-1">
                      @for (act of actions; track act.id) {
                        <button
                          type="button"
                          (click)="onAction(act.id, row)"
                          [title]="act.tooltip || act.label"
                          [attr.aria-label]="act.tooltip || act.label"
                          class="min-w-9 min-h-9 inline-flex items-center justify-center rounded-lg border border-transparent transition-colors cursor-pointer"
                          [ngClass]="act.colorClass || 'text-slate-600 hover:text-easydry-blue hover:bg-slate-100'">
                          @if (act.icon) {
                            <i-lucide [name]="act.icon" class="w-4 h-4" aria-hidden="true"></i-lucide>
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

      <!-- Paginación con páginas numeradas -->
      @if (totalMostrado > 0 || loading) {
        <app-pagination
          [totalItems]="totalMostrado"
          [currentPage]="paginaActual"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          [loading]="loading"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      }
    </div>
  `,
})
export class DataTableComponent implements OnInit, OnChanges, OnDestroy {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() actions: TableAction[] = [];
  @Input() searchable = true;
  @Input() searchPlaceholder = 'Buscar…';
  @Input() showToolbar = true;
  @Input() trackByProperty = 'id';
  @Input() caption = '';
  @Input() rowClickable = false;
  @Input() emptyTitle = 'No se encontraron registros';
  @Input() emptyHint = 'Prueba ajustando los filtros o el texto de búsqueda';

  // ---- Paginación ----
  @Input() pageSize = PAGE_SIZE_TABLA;
  @Input() pageSizeOptions: number[] = PAGE_SIZES_TABLA;

  // ---- Modo servidor ----
  @Input() serverSide = false;
  /** Total de registros que hay en el servidor con los filtros actuales. */
  @Input() total = 0;
  /** Página actual (1 = primera). En modo servidor la controla el padre. */
  @Input() page = 1;
  @Input() loading = false;
  @Input() error: string | null = null;
  /** Orden inicial. Lo más reciente primero es el acuerdo por defecto: el backend lo aplica si no llega orden. */
  @Input() sortField: string | null = null;
  @Input() sortOrder: OrdenDir = 'desc';

  // ---- Apariencia ----
  /** Dentro de otra tarjeta: sin borde, sombra ni esquinas propias. */
  /** Clases extra para cada fila (por ejemplo, resaltar filas que requieren atención). */
  @Input() rowClass: ((row: any) => string) | null = null;
  @Input() embebida = false;
  @Input() stickyHeader = true;
  /**
   * Por defecto sin tope: la tabla crece con su contenido y la página es la única que scrollea
   * (vertical). Pásale un valor como '70vh' solo cuando la tabla vive dentro de un contenedor con
   * altura fija de verdad (p. ej. un panel lateral), para no generar scroll vertical duplicado
   * (uno en la tabla y otro en la página).
   */
  @Input() maxHeight = 'none';

  // ---- Búsqueda ----
  @Input() debounceMs = BUSQUEDA_DEBOUNCE_MS;
  @Input() minBusqueda = BUSQUEDA_MIN_CARACTERES;

  @Output() queryChange = new EventEmitter<ConsultaTabla>();
  @Output() actionClick = new EventEmitter<{ actionId: string; row: any }>();
  @Output() rowClick = new EventEmitter<any>();
  @Output() reintentar = new EventEmitter<void>();

  @ContentChildren(DataTableCellDirective) private celdas?: QueryList<DataTableCellDirective>;

  searchQuery = '';
  busquedaCorta = false;
  readonly esqueletoFilas = [1, 2, 3, 4, 5, 6];

  private paginaCliente = 1;
  private filtradosCliente: any[] = [];
  private readonly busqueda$ = new Subject<string>();
  private suscripcion?: Subscription;
  private busquedaAplicada = '';

  get totalColumnas(): number {
    return this.columns.length + (this.actions?.length ? 1 : 0);
  }

  get paginaActual(): number {
    return this.serverSide ? this.page : this.paginaCliente;
  }

  get totalMostrado(): number {
    return this.serverSide ? this.total : this.filtradosCliente.length;
  }

  /** Filas a pintar: en modo servidor todas las recibidas; en modo cliente, la página actual. */
  get filas(): any[] {
    if (this.serverSide) return this.data || [];
    const inicio = (this.paginaCliente - 1) * this.pageSize;
    return this.filtradosCliente.slice(inicio, inicio + this.pageSize);
  }

  ngOnInit(): void {
    this.suscripcion = this.busqueda$
      .pipe(debounceTime(this.debounceMs), distinctUntilChanged())
      .subscribe((texto) => this.aplicarBusqueda(texto));
    this.refrescarCliente();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['data'] || cambios['columns']) this.refrescarCliente();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  plantillaDe(clave: string): TemplateRef<{ $implicit: any }> | null {
    return this.celdas?.find((c) => c.columna === clave)?.plantilla ?? null;
  }

  onSearchChange(texto: string): void {
    this.searchQuery = texto;
    const limpio = texto.trim();
    // En el servidor solo se busca con texto suficiente (o vacío para quitar el filtro).
    this.busquedaCorta = this.serverSide && limpio.length > 0 && limpio.length < this.minBusqueda;
    if (this.busquedaCorta) return;
    this.busqueda$.next(limpio);
  }

  onSort(col: TableColumn): void {
    if (this.sortField === col.key) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = col.key;
      this.sortOrder = col.defaultSort ?? 'asc';
    }
    this.cambioDeConsulta(1);
  }

  onPageChange(pagina: number): void {
    this.cambioDeConsulta(pagina);
  }

  onPageSizeChange(tamano: number): void {
    this.pageSize = tamano;
    this.cambioDeConsulta(1);
  }

  abrirFila(row: any): void {
    if (this.rowClickable) this.rowClick.emit(row);
  }

  abrirFilaConEspacio(evento: Event, row: any): void {
    if (!this.rowClickable) return;
    evento.preventDefault();
    this.rowClick.emit(row);
  }

  onAction(actionId: string, row: any): void {
    this.actionClick.emit({ actionId, row });
  }

  trackByFn(row: any, indice: number): any {
    const id = row?.[this.trackByProperty];
    return id !== undefined && id !== null ? id : indice;
  }

  getBadgeClass(col: TableColumn, value: any): string {
    if (col.badgeMap && col.badgeMap[value]) return col.badgeMap[value];
    const str = String(value || '').toLowerCase();
    if (/inactiv|rechaz|dañad|cancel|baja/.test(str)) return 'badge-danger';
    if (/activ|operativ|aprob|complet|solucion|finaliz/.test(str)) return 'badge-ok';
    if (/pendient|mantenim|cola|program/.test(str)) return 'badge-warn';
    if (/proceso|curso/.test(str)) return 'badge-info';
    return 'badge-neutral';
  }

  // ---------------------------------------------------------------------------

  private aplicarBusqueda(texto: string): void {
    if (texto === this.busquedaAplicada) return;
    this.busquedaAplicada = texto;
    this.cambioDeConsulta(1);
  }

  private cambioDeConsulta(pagina: number): void {
    if (this.serverSide) {
      this.queryChange.emit({
        page: pagina,
        pageSize: this.pageSize,
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        search: this.busquedaAplicada,
      });
      return;
    }
    this.paginaCliente = pagina;
    this.refrescarCliente();
    this.queryChange.emit({
      page: pagina, pageSize: this.pageSize, sortField: this.sortField, sortOrder: this.sortOrder, search: this.busquedaAplicada,
    });
  }

  private refrescarCliente(): void {
    if (this.serverSide) return;
    let resultado = [...(this.data || [])];

    const q = this.busquedaAplicada.toLowerCase();
    if (q) {
      resultado = resultado.filter((item) =>
        this.columns.some((col) => {
          const val = item[col.key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        }),
      );
    }

    if (this.sortField) {
      const campo = this.sortField;
      const signo = this.sortOrder === 'asc' ? 1 : -1;
      resultado.sort((a, b) => {
        const x = a[campo];
        const y = b[campo];
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (x < y ? -1 : 1) * signo;
      });
    }

    this.filtradosCliente = resultado;
    const totalPaginas = Math.max(1, Math.ceil(resultado.length / this.pageSize));
    if (this.paginaCliente > totalPaginas) this.paginaCliente = totalPaginas;
  }
}

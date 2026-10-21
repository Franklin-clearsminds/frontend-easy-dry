import { Component, OnDestroy, OnInit, ViewChild, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, Subscription, debounceTime, distinctUntilChanged, map, tap } from 'rxjs';
import { ConsultaMantenimientos, MantenimientoService, ResumenMantenimientos } from '../../core/services/mantenimiento.service';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { AuthService } from '../../core/services/auth.service';
import { Mantenimiento, Maquinaria, Sucursal, etiquetaFrecuenciaMantenimiento } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { DataTableCellDirective, DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import { ListaInfinita } from '../../core/utils/lista-infinita';
import { ConsultaTabla, OrdenDir } from '../../core/models/paginacion.model';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_INFINITO, PAGE_SIZE_TABLA } from '../../core/config/paginacion';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { EvidenciaGaleriaComponent } from '../../shared/components/evidencia-galeria/evidencia-galeria.component';
import { resolverRangoFechas } from '../../core/utils/fecha-rango';
import { SucursalService } from '../../core/services/sucursal.service';
import { fechaHoraLocal, fechaProgramadaLocal } from '../../core/utils/evidencia-maquinaria';
import { puedeGestionarMaquina, puedeEjecutarMantenimientos, puedeEditarMantenimientos, puedeVerMaquinaria, puedeProgramarMantenimiento } from '../../core/utils/maquinaria-permisos';
import { TrabajoAccionesComponent } from '../maquinaria/trabajo-acciones/trabajo-acciones.component';
import { MaquinariaDetalleModalComponent } from '../maquinaria/maquinaria-detalle-modal/maquinaria-detalle-modal.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { badgeClase, BADGE_NO_ATENDIDO } from '../../core/utils/badges';

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LucideAngularModule, ModalComponent, DataTableComponent, DataTableCellDirective, InfiniteScrollComponent, FilterBarComponent,
    EvidenciaGaleriaComponent, TrabajoAccionesComponent, MaquinariaDetalleModalComponent, SkeletonLoaderComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">

      @if (!hideHeader) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Plan de Mantenimiento Preventivo</h1>
            <p class="text-slate-500 text-xs mt-1">Programación de intervenciones técnicas. Los mantenimientos vencidos y sin ejecutar aparecen primero, en rojo.</p>
          </div>
        </div>
      }

      <!-- Resumen real de pendientes -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-4 rounded-2xl border" [ngClass]="totalNoAtendidos > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'">
          <span class="block text-[11px] text-slate-500 font-bold uppercase">No atendidos (vencidos)</span>
          <span class="text-2xl font-extrabold" [ngClass]="totalNoAtendidos > 0 ? 'text-rose-700' : 'text-slate-800'">{{ totalNoAtendidos }}</span>
        </div>
        <div class="p-4 rounded-2xl border bg-white border-slate-100">
          <span class="block text-[11px] text-slate-500 font-bold uppercase">Programados</span>
          <span class="text-2xl font-extrabold text-slate-800">{{ totalProgramados }}</span>
        </div>
        <div class="p-4 rounded-2xl border bg-white border-slate-100">
          <span class="block text-[11px] text-slate-500 font-bold uppercase">Ejecutados</span>
          <span class="text-2xl font-extrabold text-slate-800">{{ totalEjecutados }}</span>
        </div>
      </div>

      <app-filter-bar
        [showSucursal]="true"
        [showOperador]="false"
        [showBahia]="false"
        [showEstado]="true"
        [showFechas]="true"
        [showCliente]="true"
        [showBusqueda]="true"
        [placeholderBusqueda]="'Buscar por máquina, técnico o sucursal...'"
        [listaEstados]="['Todos', 'Programado', 'En Proceso', 'Completado']"
        (filterChange)="aplicarNuevosFiltros($event)">
        <label filter-actions class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input type="checkbox" [(ngModel)]="soloNoAtendidos" (ngModelChange)="reiniciar()" class="w-4 h-4 accent-rose-600">
          Solo no atendidos
        </label>
      </app-filter-bar>
      @if (busquedaCorta) {
        <p class="-mt-3 px-2 text-[11px] font-semibold text-slate-500" role="status">Escribe al menos {{ minBusqueda }} letras para buscar.</p>
      }

      <!-- Mantenimientos (orden del backend: vencidos primero) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-base font-outfit">Registro General de Mantenimientos</h3>
            <span class="text-xs text-slate-500 font-semibold">Total: {{ totalMostrado }}</span>
          </div>
          @if (puedeProgramar) {
            <button
              (click)="programar()"
              type="button"
              class="btn btn-cta">
              <i-lucide name="calendar-clock" class="w-4 h-4" aria-hidden="true"></i-lucide>
              <span class="hidden sm:inline">Programar Mantenimiento</span>
              <span class="sm:hidden">Programar</span>
            </button>
          }
        </div>

        @if (esEscritorio) {
          <!-- Vista de tabla (escritorio): páginas numeradas, orden en el servidor -->
          <app-data-table
            [serverSide]="true"
            [embebida]="true"
            [showToolbar]="false"
            [columns]="columnas"
            [data]="filas"
            [total]="totalTabla"
            [page]="pagina"
            [pageSize]="pageSizeTabla"
            [sortField]="sortField"
            [sortOrder]="sortOrder"
            [loading]="cargandoTabla"
            [error]="errorTabla"
            [rowClickable]="true"
            [rowClass]="claseFila"
            maxHeight="none"
            caption="Mantenimientos de maquinaria"
            [emptyTitle]="tituloVacio"
            emptyHint="Prueba ajustando los filtros o el texto de búsqueda."
            (queryChange)="onTablaCambio($event)"
            (rowClick)="abrirDetalle($event)"
            (reintentar)="cargarPagina(true)">

            <ng-template appCell="fecha" let-m>
              <div class="text-xs font-mono font-bold" [ngClass]="m.noAtendido ? 'text-rose-700' : 'text-easydry-blue'">
                {{ fechaProg(m.fechaProgramada) }}
                @if (m.noAtendido) {
                  <span class="block mt-1 w-fit font-sans" [class]="badgeNoAtendido">No atendido</span>
                }
                <span class="block text-xs text-slate-500 font-sans font-semibold">{{ etiquetaFrecuencia(m.frecuenciaDias) }}</span>
              </div>
            </ng-template>

            <ng-template appCell="maquina" let-m>
              <span class="font-bold text-xs" [ngClass]="m.noAtendido ? 'text-rose-800' : 'text-slate-900'">{{ m.maquina }}</span>
            </ng-template>

            <ng-template appCell="tecnico" let-m>
              @if (m.tecnicoAsignadoNombre) { <span class="text-xs text-slate-700 font-medium">{{ m.tecnicoAsignadoNombre }}</span> } @else { <span class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">Sin técnico asignado</span> }
            </ng-template>

            <ng-template appCell="estado" let-m>
              <span [class]="badgeClase('mantenimiento', m.estado)">{{ m.estado }}</span>
            </ng-template>

            <ng-template appCell="ejecucion" let-m>
              <div class="text-xs text-slate-600">
                @if (m.fechaEjecucion) {
                  <span class="font-mono">{{ hora(m.fechaEjecucion) }}</span>
                  <span class="block text-xs text-slate-500">{{ m.ejecutadoPorNombre }}</span>
                } @else { <span class="text-slate-500">—</span> }
              </div>
            </ng-template>

            <ng-template appCell="acciones" let-m>
              <div class="flex items-center gap-1.5 flex-wrap" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                <button type="button" (click)="abrirDetalle(m)" title="Ver detalle" aria-label="Ver detalle del mantenimiento"
                  class="btn-icon border border-slate-200 bg-white">
                  <i-lucide name="eye" class="w-4 h-4" aria-hidden="true"></i-lucide>
                </button>
                @if (puedeAsignar(m)) {
                  <button type="button" (click)="acciones.asignarMantenimiento(m)" [title]="m.tecnicoAsignadoId ? 'Reasignar técnico' : 'Asignar técnico'"
                    [attr.aria-label]="m.tecnicoAsignadoId ? 'Reasignar técnico' : 'Asignar técnico'"
                    class="btn-icon border border-slate-200 bg-white">
                    <i-lucide name="user-plus" class="w-4 h-4" aria-hidden="true"></i-lucide>
                  </button>
                }
                @if (puedeEjecutar(m)) {
                  <button type="button" (click)="acciones.ejecutarMantenimiento(m)" title="Ejecutar mantenimiento" aria-label="Ejecutar mantenimiento"
                    class="btn-icon bg-easydry-blue text-white hover:bg-easydry-blue-dark hover:text-white">
                    <i-lucide name="check-circle-2" class="w-4 h-4" aria-hidden="true"></i-lucide>
                  </button>
                }
                @if (puedeEditar(m)) {
                  <button type="button" (click)="acciones.editarMantenimiento(m)" title="Editar" aria-label="Editar mantenimiento"
                    class="btn-icon border border-slate-200 bg-white">
                    <i-lucide name="pencil" class="w-4 h-4" aria-hidden="true"></i-lucide>
                  </button>
                }
                <button type="button" (click)="acciones.agregarEvidencia('MANTENIMIENTO', m)" title="Agregar evidencia" aria-label="Agregar evidencia"
                  class="btn-icon border border-slate-200 bg-white">
                  <i-lucide name="camera" class="w-4 h-4" aria-hidden="true"></i-lucide>
                </button>
              </div>
            </ng-template>
          </app-data-table>
        } @else {
          <!-- Vista móvil: tarjetas con scroll infinito -->
          <div class="divide-y divide-slate-100">
            @for (m of lista.items; track m.id) {
              <div class="p-4 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-easydry-blue" [ngClass]="m.noAtendido ? 'bg-rose-50/70' : 'hover:bg-slate-50'"
                tabindex="0" (click)="abrirDetalle(m)" (keydown.enter)="abrirDetalle(m)" (keydown.space)="$event.preventDefault(); abrirDetalle(m)">
                <div class="flex items-start justify-between mb-2 gap-2">
                  <div>
                    <span class="font-mono font-extrabold text-xs px-2 py-0.5 rounded-md" [ngClass]="m.noAtendido ? 'text-rose-700 bg-rose-100' : 'text-easydry-blue bg-easydry-blue/10'">{{ fechaProg(m.fechaProgramada) }}</span>
                    @if (m.noAtendido) { <span class="ml-1.5" [class]="badgeNoAtendido">No atendido</span> }
                    <div class="font-bold text-sm mt-1.5" [ngClass]="m.noAtendido ? 'text-rose-800' : 'text-slate-900'">{{ m.maquina }}</div>
                    <p class="text-xs text-slate-500 mt-0.5">{{ etiquetaFrecuencia(m.frecuenciaDias) }}</p>
                  </div>
                  <span class="text-center" [class]="badgeClase('mantenimiento', m.estado)">{{ m.estado }}</span>
                </div>
                <div class="flex items-center justify-between mt-2 text-xs">
                  <div class="font-semibold text-slate-700 truncate max-w-[150px]">@if (m.tecnicoAsignadoNombre) { {{ m.tecnicoAsignadoNombre }} } @else { <span class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">Sin técnico asignado</span> }</div>
                </div>
                <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100" (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()" (keydown.space)="$event.stopPropagation()">
                  @if (puedeAsignar(m)) {
                    <button type="button" (click)="acciones.asignarMantenimiento(m)" class="btn btn-secondary btn-sm">{{ m.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}</button>
                  }
                  @if (puedeEjecutar(m)) {
                    <button type="button" (click)="acciones.ejecutarMantenimiento(m)" class="btn btn-primary btn-sm">Ejecutar</button>
                  }
                  @if (puedeEditar(m)) {
                    <button type="button" (click)="acciones.editarMantenimiento(m)" class="btn btn-secondary btn-sm">Editar</button>
                  }
                  <button type="button" (click)="acciones.agregarEvidencia('MANTENIMIENTO', m)" class="btn btn-secondary btn-sm">+ Evidencia</button>
                </div>
              </div>
            }
          </div>

          @if (lista.error && lista.items.length === 0) {
            <div role="alert" class="p-6 flex flex-col items-center gap-3 text-center">
              <div class="estado-error">{{ lista.error }}</div>
              <button type="button" class="btn btn-secondary btn-sm" (click)="reiniciar()">Reintentar</button>
            </div>
          } @else if (!lista.inicializada) {
            <div class="p-4" role="status" aria-live="polite">
              <span class="sr-only">Cargando mantenimientos…</span>
              <app-skeleton-loader type="table"></app-skeleton-loader>
            </div>
          } @else if (lista.items.length === 0) {
            <p class="estado-vacio">{{ tituloVacio }}</p>
          } @else {
            <app-infinite-scroll
              [hasMore]="lista.hasMore"
              [loading]="lista.cargando"
              [error]="lista.error"
              [total]="lista.total"
              (cargarMas)="lista.siguiente()"
              (reintentar)="lista.reintentar()">
            </app-infinite-scroll>
          }
        }
      </div>

      <!-- Ficha del mantenimiento -->
      <app-modal
        [isOpen]="modalDetalleOpen"
        [title]="'Ficha técnica: ' + (detalle?.maquina || 'Mantenimiento')"
        icon="clipboard-list"
        size="xl"
        (close)="modalDetalleOpen = false">
        @if (detalle; as m) {
          <div class="space-y-5">
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">Orden #{{ m.id }}</span>
                <h3 class="text-lg font-bold text-slate-900">{{ m.maquina }}</h3>
                <p class="text-xs text-slate-500">{{ m.agencia || 'Sin agencia' }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                @if (m.noAtendido) { <span [class]="badgeNoAtendido">No atendido</span> }
                <span [class]="badgeClase('mantenimiento', m.estado)">{{ m.estado }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs p-4 rounded-2xl border border-easydry-blue/20 bg-easydry-blue/5">
              <div><span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Fecha programada</span><span class="font-mono font-bold text-slate-800">{{ fechaProg(m.fechaProgramada) }}</span></div>
              <div><span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Ejecutado (fecha y hora)</span><span class="font-mono text-slate-800">{{ m.fechaEjecucion ? hora(m.fechaEjecucion) : '—' }}</span></div>
              <div><span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Frecuencia</span><span class="font-bold text-slate-800">{{ etiquetaFrecuencia(m.frecuenciaDias) }}</span></div>
              <div><span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Técnico</span>@if (m.tecnicoAsignadoNombre) { <span class="font-bold text-slate-800">{{ m.tecnicoAsignadoNombre }}</span> } @else { <span class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">Sin técnico asignado</span> }</div>
              <div><span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Creado por</span><span class="font-bold text-slate-800">{{ m.creadoPorNombre || '—' }}</span></div>
              <div><span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Ejecutado por</span><span class="font-bold text-slate-800">{{ m.ejecutadoPorNombre || '—' }}</span></div>
              @if (m.costoTotal != null) {
                <div><span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Costo total</span><span class="font-bold text-slate-800">$ {{ m.costoTotal | number:'1.2-2' }}</span></div>
              }
              @if (m.repuestosUtilizados?.length) {
                <div class="col-span-2"><span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Repuestos</span><span class="font-semibold text-slate-800">{{ m.repuestosUtilizados!.join(', ') }}</span></div>
              }
            </div>

            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 text-xs">
              <span class="block text-[11px] text-slate-500 font-bold uppercase mb-1">Observaciones</span>
              <p class="text-slate-800 leading-relaxed break-words">{{ m.descripcion || 'Sin observaciones.' }}</p>
            </div>

            <div>
              <h4 class="font-bold text-slate-900 text-xs uppercase mb-2">Evidencias</h4>
              <app-evidencia-galeria [evidencias]="m.evidencias || []" vacio="Este mantenimiento no tiene evidencias adjuntas."></app-evidencia-galeria>
            </div>
          </div>
        }
        <div modal-footer>
          @if (detalle && puedeEjecutar(detalle)) {
            <button type="button" (click)="ejecutarDesdeDetalle()" class="btn btn-primary w-full sm:w-auto">
              <i-lucide name="check-circle-2" class="w-4 h-4" aria-hidden="true"></i-lucide> Ejecutar mantenimiento
            </button>
          }
          @if (detalle?.maquinariaId) {
            <button type="button" (click)="verMaquina(detalle!)" class="btn btn-secondary w-full sm:w-auto">Ver máquina y trazabilidad</button>
          }
          <button type="button" (click)="modalDetalleOpen = false" class="btn btn-secondary w-full sm:w-auto">Cerrar ficha</button>
        </div>
      </app-modal>

      <!-- Detalle de máquina reutilizable + diálogos de trabajo -->
      <app-maquinaria-detalle-modal [maquinariaId]="maquinaDetalleId" pestanaInicial="mantenimientos"
        (cerrar)="maquinaDetalleId = null" (cambio)="refrescar()"></app-maquinaria-detalle-modal>
      <app-trabajo-acciones #acciones (hecho)="onAccion()"></app-trabajo-acciones>
    </div>
  `
})
export class MantenimientoComponent implements OnInit, OnDestroy {
  @Input() hideHeader = false;
  listaMaquinas: Maquinaria[] = [];
  soloNoAtendidos = false;

  modalDetalleOpen = false;
  detalle?: Mantenimiento;
  maquinaDetalleId: string | number | null = null;

  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy', marca: 'Todas' };

  // ══════════════════════════════════════════════════════════════════════════
  //  Paginación, orden, búsqueda y filtros en el SERVIDOR
  //  Tabla (escritorio) → páginas numeradas. Tarjetas (móvil) → scroll infinito de a 30.
  // ══════════════════════════════════════════════════════════════════════════

  readonly minBusqueda = BUSQUEDA_MIN_CARACTERES;
  /** true cuando el usuario escribió 1 letra (se pide un mínimo de 2 antes de consultar). */
  busquedaCorta = false;
  private busquedaAplicada = '';
  private readonly busqueda$ = new Subject<string>();
  private suscripcionBusqueda?: Subscription;

  /** Escritorio (>= 1024 px) = tabla; menos = tarjetas. Solo se carga la vista que se muestra. */
  esEscritorio = true;
  private mediaEscritorio?: MediaQueryList;
  private readonly alCambiarPantalla = (e: MediaQueryListEvent) => {
    if (e.matches === this.esEscritorio) return;
    this.esEscritorio = e.matches;
    this.reiniciar();
  };

  private sucursales: Sucursal[] = [];
  /** Contadores de los filtros vigentes (menos el de estado); los da el servidor, no lo cargado. */
  resumen: ResumenMantenimientos | null = null;

  // ── Tabla ──
  readonly columnas: TableColumn[] = [
    { key: 'fecha', label: 'Fecha Programada', sortable: true, defaultSort: 'desc' },
    { key: 'maquina', label: 'Maquinaria', sortable: true, defaultSort: 'asc' },
    { key: 'tecnico', label: 'Técnico', sortable: true, defaultSort: 'asc' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
    { key: 'ejecucion', label: 'Ejecución', sortable: true, defaultSort: 'desc' },
    { key: 'acciones', label: 'Acciones' },
  ];
  filas: Mantenimiento[] = [];
  totalTabla = 0;
  pagina = 1;
  pageSizeTabla = PAGE_SIZE_TABLA;
  /** Sin columna elegida el servidor agrupa: vencidos, pendientes, ejecutados. */
  sortField: string | null = null;
  sortOrder: OrdenDir = 'desc';
  cargandoTabla = false;
  errorTabla: string | null = null;
  private subTabla?: Subscription;
  readonly claseFila = (m: Mantenimiento): string => (m.noAtendido ? 'bg-rose-50/70 hover:bg-rose-100/70' : '');

  // ── Tarjetas ──
  readonly lista = new ListaInfinita<Mantenimiento>(
    (page, size) => this.mantenimientoService
      .getMantenimientosPagina({ ...this.consulta(), sortField: null, page, pageSize: size, incluirResumen: page === 1 })
      .pipe(
        tap((r) => {
          if (r.resumen) this.resumen = r.resumen;
          this.sincronizarDetalle(r.pagina.items);
        }),
        map((r) => r.pagina),
      ),
    PAGE_SIZE_INFINITO,
    (m) => m.id,
  );

  get totalMostrado(): number { return this.esEscritorio ? this.totalTabla : this.lista.total; }

  private mantenimientoService = inject(MantenimientoService);
  private maquinariaService = inject(MaquinariaService);
  public authService = inject(AuthService);
  private sucursalService = inject(SucursalService);

  @ViewChild('acciones') acciones!: TrabajoAccionesComponent;

  private get miId(): string { return String(this.authService.getCurrentUser()?.id || ''); }

  ngOnInit(): void {
    this.suscripcionBusqueda = this.busqueda$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaAplicada = texto;
        this.reiniciar();
      });

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.mediaEscritorio = window.matchMedia('(min-width: 1024px)');
      this.esEscritorio = this.mediaEscritorio.matches;
      this.mediaEscritorio.addEventListener('change', this.alCambiarPantalla);
    }
    // El filter-bar entrega nombres de sucursal/marca y el servidor pide ids: se necesitan las sucursales cargadas.
    this.sucursalService.getSucursales().subscribe((list) => { this.sucursales = list; });
    this.reiniciar();
  }

  /** Máquinas activas para el selector de "Programar": solo hacen falta al abrir ese modal, no en cada visita
   * a la pantalla (el backend limita lo que cada rol ve). */
  private maquinasProgramarCargadas = false;
  private cargarMaquinasParaProgramarSiHaceFalta(onListo: () => void): void {
    if (this.maquinasProgramarCargadas) { onListo(); return; }
    if (!(puedeGestionarMaquina(this.authService) && puedeVerMaquinaria(this.authService))) { onListo(); return; }
    this.maquinariaService.getMaquinaria({ activa: true }).subscribe(list => {
      this.listaMaquinas = list;
      this.maquinasProgramarCargadas = true;
      onListo();
    });
  }

  ngOnDestroy(): void {
    this.suscripcionBusqueda?.unsubscribe();
    this.mediaEscritorio?.removeEventListener('change', this.alCambiarPantalla);
    this.subTabla?.unsubscribe();
    this.lista.destruir();
  }

  /** Vuelve a la primera página/bloque de la vista visible con los filtros vigentes (y pide los contadores). */
  reiniciar(): void {
    if (this.esEscritorio) {
      this.pagina = 1;
      this.cargarPagina(true);
    } else {
      this.lista.reiniciar();
    }
  }

  /** Tras una acción (asignar, ejecutar, editar, programar…): vuelve a pedir lo que se ve y actualiza los contadores. */
  refrescar(): void {
    if (this.esEscritorio) this.cargarPagina(true);
    else this.lista.reiniciar();
  }

  onAccion(): void {
    this.refrescar();
  }

  onTablaCambio(q: ConsultaTabla): void {
    this.pagina = q.page;
    this.pageSizeTabla = q.pageSize;
    this.sortField = q.sortField;
    this.sortOrder = q.sortOrder;
    this.cargarPagina(false);
  }

  /** Pide la página actual de la tabla. `conResumen`: también recalcula los contadores (cambió un filtro o una acción). */
  cargarPagina(conResumen = false): void {
    this.subTabla?.unsubscribe();
    this.cargandoTabla = true;
    this.errorTabla = null;
    this.subTabla = this.mantenimientoService
      .getMantenimientosPagina({
        ...this.consulta(),
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        page: this.pagina,
        pageSize: this.pageSizeTabla,
        incluirResumen: conResumen || !this.resumen,
      })
      .subscribe({
        next: ({ pagina, resumen }) => {
          if (resumen) this.resumen = resumen;
          // Si la página quedó vacía (cambió lo último de la lista) se retrocede a la última que exista.
          if (pagina.items.length === 0 && this.pagina > 1 && pagina.total > 0) {
            this.pagina = Math.max(1, pagina.totalPages);
            this.cargarPagina(false);
            return;
          }
          this.filas = pagina.items;
          this.totalTabla = pagina.total;
          this.pagina = pagina.page;
          this.cargandoTabla = false;
          this.sincronizarDetalle(pagina.items);
        },
        error: (err) => {
          this.filas = [];
          this.totalTabla = 0;
          this.errorTabla = this.mensajeError(err);
          this.cargandoTabla = false;
        },
      });
  }

  private mensajeError(err: unknown): string {
    const e = err as { error?: { message?: string | string[] }; message?: string } | undefined;
    const detalle = e?.error?.message;
    if (Array.isArray(detalle)) return detalle.join('. ');
    return detalle || e?.message || 'No se pudieron cargar los mantenimientos.';
  }

  /** Si la ficha abierta está en lo recién cargado, se actualiza con los datos nuevos. */
  private sincronizarDetalle(items: Mantenimiento[]): void {
    if (!this.detalle) return;
    this.detalle = items.find(x => x.id === this.detalle!.id) || this.detalle;
  }

  aplicarNuevosFiltros(filtros: FilterState) {
    const previo = this.filtrosGlobales;
    this.filtrosGlobales = filtros;
    const busq = (filtros.busqueda ?? '').trim();
    this.busquedaCorta = busq.length > 0 && busq.length < BUSQUEDA_MIN_CARACTERES;

    if (this.huellaFiltros(previo) !== this.huellaFiltros(filtros)) {
      // Cambió un filtro (no el texto): se consulta ya. Si el texto es de una sola letra se conserva la búsqueda anterior.
      if (!this.busquedaCorta) this.busquedaAplicada = busq;
      this.reiniciar();
      return;
    }
    // Solo cambió el texto: espera 300 ms tras la última tecla y exige mínimo 2 letras (o vacío para quitar el filtro).
    if (!this.busquedaCorta) this.busqueda$.next(busq);
  }

  private huellaFiltros(f: FilterState | undefined): string {
    if (!f) return '';
    const { busqueda, ...resto } = f;
    return JSON.stringify(resto);
  }

  private neutro(v: string | undefined | null, ...neutros: string[]): string {
    const t = (v ?? '').trim();
    return !t || neutros.includes(t) ? '' : t;
  }

  /** Estado elegido en el filter-bar → valor del servidor. */
  private estadoServidor(): string | undefined {
    switch (this.neutro(this.filtrosGlobales.estado, 'Todos')) {
      case 'Programado': return 'PENDIENTE';
      case 'En Proceso': return 'EN_PROCESO';
      case 'Completado': return 'FINALIZADO';
      default: return undefined;
    }
  }

  /** Id de la sucursal elegida ('' si no hay filtro; un id imposible si el nombre no existe, para no mostrar todo). */
  private agenciaIdFiltro(): string {
    const nombre = this.neutro(this.filtrosGlobales.sucursal, 'Todas', 'TODAS');
    if (!nombre) return '';
    const n = nombre.toLowerCase();
    const suc = this.sucursales.find((x) => (x.nombre || '').toLowerCase() === n);
    return suc ? String(suc.id) : '__sin_coincidencia__';
  }

  private clienteIdFiltro(): string {
    const f = this.filtrosGlobales;
    const nombre = this.neutro(f.cliente, 'Todas', 'TODAS') || this.neutro(f.marca, 'Todas', 'TODAS');
    if (!nombre) return '';
    const suc = this.sucursales.find((x) => (x.clienteNombre || x.marcaNombre) === nombre && (x.clienteId ?? x.marcaId) !== undefined);
    const id = suc ? (suc.clienteId ?? suc.marcaId) : undefined;
    return id !== undefined && id !== null ? String(id) : '__sin_coincidencia__';
  }

  /** Filtros vigentes para el servidor (sin página, tamaño ni orden). */
  private consulta(): ConsultaMantenimientos {
    const rango = resolverRangoFechas(this.filtrosGlobales);
    return {
      search: this.busquedaAplicada,
      estado: this.estadoServidor(),
      agenciaId: this.agenciaIdFiltro() || undefined,
      clienteId: this.clienteIdFiltro() || undefined,
      soloNoAtendidos: this.soloNoAtendidos || undefined,
      fechaDesde: rango?.inicio,
      fechaHasta: rango?.fin,
    };
  }

  private get hayFiltrosActivos(): boolean {
    const c = this.consulta();
    return !!(c.search || c.estado || c.agenciaId || c.clienteId || c.soloNoAtendidos || c.fechaDesde);
  }

  get tituloVacio(): string {
    return this.hayFiltrosActivos
      ? 'No hay mantenimientos que coincidan con los filtros aplicados.'
      : 'Aún no hay mantenimientos programados.';
  }

  // ---- Permisos de UI (el backend valida siempre) ----
  get puedeProgramar(): boolean { return puedeProgramarMantenimiento(this.authService); }
  puedeAsignar(m: Mantenimiento): boolean { return puedeGestionarMaquina(this.authService) && m.estadoRaw !== 'FINALIZADO'; }
  /** Solo el técnico asignado ejecuta (el backend además bloquea si falta más que la ventana de adelanto). */
  puedeEjecutar(m: Mantenimiento): boolean {
    return m.estadoRaw !== 'FINALIZADO' && puedeEjecutarMantenimientos(this.authService) && String(m.tecnicoAsignadoId || '') === this.miId;
  }
  puedeEditar(m: Mantenimiento): boolean {
    return puedeEditarMantenimientos(this.authService) && (puedeGestionarMaquina(this.authService) || String(m.tecnicoAsignadoId || '') === this.miId);
  }

  programar(): void {
    this.cargarMaquinasParaProgramarSiHaceFalta(() => {
      void this.acciones.programarMantenimiento(null, this.listaMaquinas);
    });
  }

  /** Contadores de los filtros vigentes (dato del servidor). */
  get totalNoAtendidos(): number { return this.resumen?.vencidos ?? 0; }
  get totalProgramados(): number { return this.resumen?.pendientes ?? 0; }
  get totalEjecutados(): number { return this.resumen?.ejecutados ?? 0; }

  abrirDetalle(m: Mantenimiento) {
    this.detalle = m;
    this.modalDetalleOpen = true;
  }

  ejecutarDesdeDetalle(): void {
    if (!this.detalle) return;
    this.modalDetalleOpen = false;
    this.acciones.ejecutarMantenimiento(this.detalle);
  }

  verMaquina(m: Mantenimiento): void {
    this.modalDetalleOpen = false;
    this.maquinaDetalleId = m.maquinariaId ?? null;
  }

  etiquetaFrecuencia(dias?: number | null): string {
    return etiquetaFrecuenciaMantenimiento(dias);
  }

  readonly badgeClase = badgeClase;
  readonly badgeNoAtendido = BADGE_NO_ATENDIDO;

  hora(iso?: string | null): string { return fechaHoraLocal(iso); }
  fechaProg(iso?: string | null): string { return fechaProgramadaLocal(iso); }
}

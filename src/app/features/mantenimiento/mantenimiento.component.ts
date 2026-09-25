import { MemoLista } from '../../core/utils/memo-lista';
import { Component, OnInit, ViewChild, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MantenimientoService } from '../../core/services/mantenimiento.service';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { AuthService } from '../../core/services/auth.service';
import { Mantenimiento, Maquinaria, etiquetaFrecuenciaMantenimiento } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { EvidenciaGaleriaComponent } from '../../shared/components/evidencia-galeria/evidencia-galeria.component';
import { resolverRangoFechas, soloFecha } from '../../core/utils/fecha-rango';
import { SucursalService } from '../../core/services/sucursal.service';
import { fechaHoraLocal, fechaProgramadaLocal } from '../../core/utils/evidencia-maquinaria';
import { puedeGestionarMaquina, puedeTrabajarOrden } from '../../core/utils/maquinaria-permisos';
import { TrabajoAccionesComponent } from '../maquinaria/trabajo-acciones/trabajo-acciones.component';
import { MaquinariaDetalleModalComponent } from '../maquinaria/maquinaria-detalle-modal/maquinaria-detalle-modal.component';

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent,
    EvidenciaGaleriaComponent, TrabajoAccionesComponent, MaquinariaDetalleModalComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">

      @if (!hideHeader) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Plan de Mantenimiento Preventivo & Correctivo</h1>
            <p class="text-slate-500 text-xs mt-1">Programación de intervenciones técnicas. Los mantenimientos vencidos y sin ejecutar aparecen primero, en rojo.</p>
          </div>
        </div>
      }

      <!-- Resumen real de pendientes -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="p-4 rounded-2xl border" [ngClass]="totalNoAtendidos > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'">
          <span class="block text-[10px] text-slate-400 font-bold uppercase">No atendidos (vencidos)</span>
          <span class="text-2xl font-extrabold" [ngClass]="totalNoAtendidos > 0 ? 'text-rose-700' : 'text-slate-800'">{{ totalNoAtendidos }}</span>
        </div>
        <div class="p-4 rounded-2xl border bg-white border-slate-100">
          <span class="block text-[10px] text-slate-400 font-bold uppercase">Programados</span>
          <span class="text-2xl font-extrabold text-slate-800">{{ totalProgramados }}</span>
        </div>
        <div class="p-4 rounded-2xl border bg-white border-slate-100">
          <span class="block text-[10px] text-slate-400 font-bold uppercase">Ejecutados</span>
          <span class="text-2xl font-extrabold text-slate-800">{{ totalEjecutados }}</span>
        </div>
      </div>

      <app-filter-bar
        [showSucursal]="true"
        [showOperador]="false"
        [showBahia]="true"
        [showEstado]="true"
        [showFechas]="true"
        [showCliente]="true"
        [showBusqueda]="true"
        [listaEstados]="['Todos', 'Programado', 'En Proceso', 'Completado']"
        (filterChange)="aplicarNuevosFiltros($event)">
        <label filter-actions class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input type="checkbox" [(ngModel)]="soloNoAtendidos" (ngModelChange)="cargar()" class="w-4 h-4 accent-rose-600">
          Solo no atendidos
        </label>
      </app-filter-bar>

      @if (error) {
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div>
      }

      <!-- Mantenimientos (orden del backend: vencidos primero) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-base font-outfit">Registro General de Mantenimientos</h3>
            <span class="text-xs text-slate-500 font-semibold">Total: {{ mantenimientosFiltrados.length }}</span>
          </div>
          @if (puedeProgramar) {
            <button
              (click)="programar()"
              class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
              <i-lucide name="calendar-clock" class="w-4 h-4"></i-lucide>
              <span class="hidden sm:inline">Programar Mantenimiento</span>
              <span class="sm:hidden">Programar</span>
            </button>
          }
        </div>

        <!-- Vista de escritorio -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Fecha Programada</th>
                <th class="py-3.5 px-4">Maquinaria</th>
                <th class="py-3.5 px-4">Tipo</th>
                <th class="py-3.5 px-4">Técnico</th>
                <th class="py-3.5 px-4">Estado</th>
                <th class="py-3.5 px-4">Ejecución</th>
                <th class="py-3.5 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (m of paginatedMantenimientos; track m.id) {
                <tr class="transition-colors cursor-pointer" [ngClass]="m.noAtendido ? 'bg-rose-50/70 hover:bg-rose-100/70' : 'hover:bg-slate-50/80'" (click)="abrirDetalle(m)">
                  <td class="py-3.5 px-4 text-xs font-mono font-bold" [ngClass]="m.noAtendido ? 'text-rose-700' : 'text-easydry-blue'">
                    {{ fechaProg(m.fechaProgramada) }}
                    @if (m.noAtendido) {
                      <span class="block mt-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white font-sans">No atendido</span>
                    }
                    <span class="block text-[10px] text-slate-400 font-sans font-semibold">{{ etiquetaFrecuencia(m.frecuenciaDias) }}</span>
                  </td>
                  <td class="py-3.5 px-4 font-bold text-xs" [ngClass]="m.noAtendido ? 'text-rose-800' : 'text-slate-900'">{{ m.maquina }}</td>
                  <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      [ngClass]="m.tipo === 'Correctivo' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'">{{ m.tipo }}</span>
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-700 font-medium">{{ m.tecnicoAsignadoNombre || 'Sin asignar' }}</td>
                  <td class="py-3.5 px-4">
                    <span class="px-3 py-1 rounded-full text-xs font-bold"
                      [ngClass]="{
                        'bg-amber-100 text-amber-800': m.estado === 'Programado',
                        'bg-easydry-blue/15 text-easydry-blue': m.estado === 'En Proceso',
                        'bg-easydry-green/20 text-easydry-green-dark': m.estado === 'Completado'
                      }">{{ m.estado }}</span>
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-600">
                    @if (m.fechaEjecucion) {
                      <span class="font-mono">{{ hora(m.fechaEjecucion) }}</span>
                      <span class="block text-[10px] text-slate-400">{{ m.ejecutadoPorNombre }}</span>
                    } @else { <span class="text-slate-400">—</span> }
                  </td>
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-1.5 flex-wrap" (click)="$event.stopPropagation()">
                      <button (click)="abrirDetalle(m)" title="Ver detalle"
                        class="p-1.5 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center">
                        <i-lucide name="eye" class="w-3.5 h-3.5"></i-lucide>
                      </button>
                      @if (puedeAsignar(m)) {
                        <button (click)="acciones.asignarMantenimiento(m)" [title]="m.tecnicoAsignadoId ? 'Reasignar técnico' : 'Asignar técnico'"
                          class="p-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                          <i-lucide name="user-plus" class="w-3.5 h-3.5"></i-lucide>
                        </button>
                      }
                      @if (puedeEjecutar(m)) {
                        <button (click)="acciones.ejecutarMantenimiento(m)" title="Ejecutar mantenimiento"
                          class="p-1.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 rounded-lg transition-colors shadow-glow-green flex items-center justify-center cursor-pointer">
                          <i-lucide name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
                        </button>
                      }
                      @if (puedeEditar(m)) {
                        <button (click)="acciones.editarMantenimiento(m)" title="Editar"
                          class="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer flex items-center justify-center">
                          <i-lucide name="pencil" class="w-3.5 h-3.5"></i-lucide>
                        </button>
                      }
                      <button (click)="acciones.agregarEvidencia('MANTENIMIENTO', m)" title="Agregar evidencia"
                        class="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer flex items-center justify-center">
                        <i-lucide name="camera" class="w-3.5 h-3.5"></i-lucide>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Vista móvil -->
        <div class="block lg:hidden divide-y divide-slate-100">
          @for (m of paginatedMantenimientos; track m.id) {
            <div class="p-4 transition-colors cursor-pointer" [ngClass]="m.noAtendido ? 'bg-rose-50/70' : 'hover:bg-slate-50'" (click)="abrirDetalle(m)">
              <div class="flex items-start justify-between mb-2 gap-2">
                <div>
                  <span class="font-mono font-extrabold text-xs px-2 py-0.5 rounded-md" [ngClass]="m.noAtendido ? 'text-rose-700 bg-rose-100' : 'text-easydry-blue bg-easydry-blue/10'">{{ fechaProg(m.fechaProgramada) }}</span>
                  @if (m.noAtendido) { <span class="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">No atendido</span> }
                  <div class="font-bold text-sm mt-1.5" [ngClass]="m.noAtendido ? 'text-rose-800' : 'text-slate-900'">{{ m.maquina }}</div>
                  <p class="text-[11px] text-slate-500 mt-0.5">{{ etiquetaFrecuencia(m.frecuenciaDias) }}</p>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-center"
                  [ngClass]="{
                    'bg-amber-100 text-amber-800': m.estado === 'Programado',
                    'bg-easydry-blue/15 text-easydry-blue': m.estado === 'En Proceso',
                    'bg-easydry-green/20 text-easydry-green-dark': m.estado === 'Completado'
                  }">{{ m.estado }}</span>
              </div>
              <div class="flex items-center justify-between mt-2 text-xs">
                <span class="px-2 py-0.5 rounded-md font-semibold text-[10px]" [ngClass]="m.tipo === 'Correctivo' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'">{{ m.tipo }}</span>
                <div class="font-semibold text-slate-700 truncate max-w-[150px]">{{ m.tecnicoAsignadoNombre || 'Sin asignar' }}</div>
              </div>
              <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100" (click)="$event.stopPropagation()">
                @if (puedeAsignar(m)) {
                  <button (click)="acciones.asignarMantenimiento(m)" class="px-3 py-1.5 bg-violet-600 text-white font-bold rounded-lg text-[10px] cursor-pointer">{{ m.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}</button>
                }
                @if (puedeEjecutar(m)) {
                  <button (click)="acciones.ejecutarMantenimiento(m)" class="px-3 py-1.5 bg-easydry-green text-slate-950 font-extrabold rounded-lg text-[10px] cursor-pointer">Ejecutar</button>
                }
                @if (puedeEditar(m)) {
                  <button (click)="acciones.editarMantenimiento(m)" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer">Editar</button>
                }
                <button (click)="acciones.agregarEvidencia('MANTENIMIENTO', m)" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-[10px] cursor-pointer">+ Evidencia</button>
              </div>
            </div>
          }
        </div>

        @if (!cargando && mantenimientosFiltrados.length === 0) {
          <p class="text-center text-sm text-slate-400 font-semibold py-8">No hay mantenimientos para los filtros seleccionados.</p>
        }

        <app-pagination
          [totalItems]="mantenimientosFiltrados.length"
          [currentPage]="currentPage"
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Ficha del mantenimiento -->
      <app-modal
        [isOpen]="modalDetalleOpen"
        [title]="'Ficha técnica: ' + (detalle?.maquina || 'Mantenimiento')"
        icon="clipboard-list"
        (close)="modalDetalleOpen = false">
        @if (detalle; as m) {
          <div class="space-y-5">
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Orden #{{ m.id }}</span>
                <h3 class="text-lg font-bold text-slate-900">{{ m.maquina }}</h3>
                <p class="text-xs text-slate-500">{{ m.agencia || 'Sin agencia' }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                @if (m.noAtendido) { <span class="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-600 text-white">No atendido</span> }
                <span class="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">{{ m.estado }}</span>
                <span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{{ m.tipo }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs p-4 rounded-2xl border border-easydry-blue/20 bg-easydry-blue/5">
              <div><span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Fecha programada</span><span class="font-mono font-bold text-slate-800">{{ fechaProg(m.fechaProgramada) }}</span></div>
              <div><span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Ejecutado (fecha y hora)</span><span class="font-mono text-slate-800">{{ m.fechaEjecucion ? hora(m.fechaEjecucion) : '—' }}</span></div>
              <div><span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Frecuencia</span><span class="font-bold text-slate-800">{{ etiquetaFrecuencia(m.frecuenciaDias) }}</span></div>
              <div><span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Técnico</span><span class="font-bold text-slate-800">{{ m.tecnicoAsignadoNombre || 'Sin asignar' }}</span></div>
              <div><span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Creado por</span><span class="font-bold text-slate-800">{{ m.creadoPorNombre || '—' }}</span></div>
              <div><span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Ejecutado por</span><span class="font-bold text-slate-800">{{ m.ejecutadoPorNombre || '—' }}</span></div>
              @if (m.costoTotal != null) {
                <div><span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Costo total</span><span class="font-bold text-slate-800">$ {{ m.costoTotal | number:'1.2-2' }}</span></div>
              }
              @if (m.repuestosUtilizados?.length) {
                <div class="col-span-2"><span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Repuestos</span><span class="font-semibold text-slate-800">{{ m.repuestosUtilizados!.join(', ') }}</span></div>
              }
            </div>

            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 text-xs">
              <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Observaciones</span>
              <p class="text-slate-800 leading-relaxed">{{ m.descripcion || 'Sin observaciones.' }}</p>
            </div>

            <div>
              <h4 class="font-bold text-slate-900 text-xs uppercase mb-2">Evidencias</h4>
              <app-evidencia-galeria [evidencias]="m.evidencias || []" vacio="Este mantenimiento no tiene evidencias adjuntas."></app-evidencia-galeria>
            </div>
          </div>
        }
        <div modal-footer>
          @if (detalle && puedeEjecutar(detalle)) {
            <button (click)="ejecutarDesdeDetalle()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs shadow-glow-green flex items-center gap-2 cursor-pointer">
              <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide> Ejecutar mantenimiento
            </button>
          }
          @if (detalle?.maquinariaId) {
            <button (click)="verMaquina(detalle!)" class="px-4 py-2 bg-easydry-blue/10 text-easydry-blue font-bold rounded-xl text-xs cursor-pointer">Ver máquina y trazabilidad</button>
          }
          <button (click)="modalDetalleOpen = false" class="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cerrar ficha</button>
        </div>
      </app-modal>

      <!-- Detalle de máquina reutilizable + diálogos de trabajo -->
      <app-maquinaria-detalle-modal [maquinariaId]="maquinaDetalleId" pestanaInicial="mantenimientos"
        (cerrar)="maquinaDetalleId = null" (cambio)="cargar()"></app-maquinaria-detalle-modal>
      <app-trabajo-acciones #acciones (hecho)="onAccion()"></app-trabajo-acciones>
    </div>
  `
})
export class MantenimientoComponent implements OnInit {
  @Input() hideHeader = false;
  mantenimientos: Mantenimiento[] = [];
  listaMaquinas: Maquinaria[] = [];
  soloNoAtendidos = false;
  cargando = false;
  error = '';

  modalDetalleOpen = false;
  detalle?: Mantenimiento;
  maquinaDetalleId: string | number | null = null;

  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy', marca: 'Todas' };
  filtroTexto = '';
  currentPage = 1;
  pageSize = 5;

  private mantenimientoService = inject(MantenimientoService);
  private maquinariaService = inject(MaquinariaService);
  public authService = inject(AuthService);
  private sucursalService = inject(SucursalService);

  @ViewChild('acciones') acciones!: TrabajoAccionesComponent;

  private get rol(): string { return String(this.authService.getCurrentUser()?.role || ''); }
  private get miId(): string { return String(this.authService.getCurrentUser()?.id || ''); }

  ngOnInit(): void {
    this.cargar();
    // Máquinas activas para el selector de "Programar" (el backend limita lo que cada rol ve).
    this.maquinariaService.getMaquinaria({ activa: true }).subscribe(list => {
      this.listaMaquinas = list;
    });
  }

  /** Carga los mantenimientos tal cual los ordena el backend (vencidos primero): no se reordenan. */
  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.mantenimientoService.getMantenimientosPagina({ soloNoAtendidos: this.soloNoAtendidos || undefined }).subscribe({
      next: p => {
        this.mantenimientos = p.data;
        this.cargando = false;
        if (this.detalle) {
          this.detalle = this.mantenimientos.find(x => x.id === this.detalle!.id) || this.detalle;
        }
      },
      error: err => {
        this.cargando = false;
        this.error = err?.error?.message ? String(err.error.message) : 'No se pudieron cargar los mantenimientos.';
      },
    });
  }

  onAccion(): void {
    this.cargar();
  }

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    if (filtros.busqueda !== undefined) {
      this.filtroTexto = filtros.busqueda;
    }
    this.currentPage = 1;
  }

  // ---- Permisos de UI (el backend valida siempre) ----
  get puedeProgramar(): boolean { return puedeGestionarMaquina(this.rol); }
  puedeAsignar(m: Mantenimiento): boolean { return puedeGestionarMaquina(this.rol) && m.estadoRaw !== 'FINALIZADO'; }
  /** Solo el técnico asignado ejecuta (el backend además bloquea si falta más que la ventana de adelanto). */
  puedeEjecutar(m: Mantenimiento): boolean {
    return m.estadoRaw !== 'FINALIZADO' && puedeTrabajarOrden(this.rol) && String(m.tecnicoAsignadoId || '') === this.miId;
  }
  puedeEditar(m: Mantenimiento): boolean {
    return puedeTrabajarOrden(this.rol) && (puedeGestionarMaquina(this.rol) || String(m.tecnicoAsignadoId || '') === this.miId);
  }

  programar(): void {
    void this.acciones.programarMantenimiento(null, this.listaMaquinas);
  }

  get totalNoAtendidos(): number { return this.mantenimientos.filter(m => m.noAtendido).length; }
  get totalProgramados(): number { return this.mantenimientos.filter(m => m.estadoRaw !== 'FINALIZADO' && !m.noAtendido).length; }
  get totalEjecutados(): number { return this.mantenimientos.filter(m => m.estadoRaw === 'FINALIZADO').length; }

  private readonly memoFiltrados = new MemoLista();

  /** Se recalcula solo cuando cambian la lista o los filtros (antes se filtraba en cada revisión de pantalla). */
  get mantenimientosFiltrados() {
    // El filtro por marca depende de las sucursales, que cargan aparte: en ese caso no se memoriza.
    const marcaActiva = !!this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas';
    if (marcaActiva) return this.calcularMantenimientosFiltrados();
    return this.memoFiltrados.obtener(
      [this.mantenimientos, this.mantenimientos.length, this.filtroTexto, JSON.stringify(this.filtrosGlobales)],
      () => this.calcularMantenimientosFiltrados(),
    );
  }

  private calcularMantenimientosFiltrados() {
    let resultados = this.mantenimientos;

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(m => m.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal && this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(m =>
        m.agencia && m.agencia.toLowerCase().includes(this.filtrosGlobales.sucursal.toLowerCase())
      );
    }
    if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
      resultados = resultados.filter(item => {
        const suc = this.sucursalService.getSucursalPorNombre(item.agencia);
        return suc?.marcaNombre === this.filtrosGlobales.marca;
      });
    }
    if (this.filtroTexto.trim()) {
      const b = this.filtroTexto.trim().toLowerCase();
      resultados = resultados.filter(m =>
        (m.maquina || '').toLowerCase().includes(b) ||
        (m.tecnico || '').toLowerCase().includes(b) ||
        (m.tecnicoAsignadoNombre || '').toLowerCase().includes(b) ||
        (m.descripcion || '').toLowerCase().includes(b) ||
        (m.tipo || '').toLowerCase().includes(b)
      );
    }

    const rango = resolverRangoFechas(this.filtrosGlobales);
    if (rango) {
      resultados = resultados.filter(m => {
        const d = soloFecha(m.fecha || m.fechaInicio);
        return d >= rango.inicio && d <= rango.fin;
      });
    }

    return resultados;
  }

  get paginatedMantenimientos() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.mantenimientosFiltrados.slice(start, start + this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

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

  hora(iso?: string | null): string { return fechaHoraLocal(iso); }
  fechaProg(iso?: string | null): string { return fechaProgramadaLocal(iso); }
}

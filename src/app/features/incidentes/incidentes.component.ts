import { MemoLista } from '../../core/utils/memo-lista';
import { Component, OnInit, ViewChild, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { IncidenteService } from '../../core/services/incidente.service';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { AuthService } from '../../core/services/auth.service';
import { Incidente, Maquinaria } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { EvidenciaGaleriaComponent } from '../../shared/components/evidencia-galeria/evidencia-galeria.component';
import { resolverRangoFechas, soloFecha } from '../../core/utils/fecha-rango';
import { SucursalService } from '../../core/services/sucursal.service';
import { fechaHoraLocal } from '../../core/utils/evidencia-maquinaria';
import {
  esOperadorMaquina, puedeGestionarMaquina, puedeTrabajarOrden,
} from '../../core/utils/maquinaria-permisos';
import { TrabajoAccionesComponent } from '../maquinaria/trabajo-acciones/trabajo-acciones.component';
import { MaquinariaDetalleModalComponent } from '../maquinaria/maquinaria-detalle-modal/maquinaria-detalle-modal.component';

@Component({
  selector: 'app-incidentes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent,
    EvidenciaGaleriaComponent, TrabajoAccionesComponent, MaquinariaDetalleModalComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Header -->
      @if (!hideHeader) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold mb-2">
              <i-lucide name="alert-triangle" class="w-3.5 h-3.5"></i-lucide>
              <span>Gestión Integral de Desperfectos, Multimedia y Reparaciones</span>
            </div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Control de Fallas y Reparaciones Técnicas</h1>
            <p class="text-slate-500 text-xs mt-1">
              Cada incidencia exige 1 o más fotos/videos y exactamente 1 PDF al reportarse y al repararse. Las no atendidas aparecen primero.
            </p>
          </div>
        </div>
      }

      <!-- Global Filter Bar -->
      <app-filter-bar
        [showSucursal]="true"
        [showOperador]="false"
        [showBahia]="false"
        [showEstado]="true"
        [showBusqueda]="true"
        [placeholderBusqueda]="'Buscar por máquina, código o prioridad...'"
        [showCliente]="true"
        [showFechas]="true"
        [listaEstados]="['Todos', 'Pendiente', 'En Solución', 'Solucionado', 'Cancelado']"
        (filterChange)="aplicarNuevosFiltros($event)">
        <label filter-actions class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input type="checkbox" [(ngModel)]="soloNoAtendidas" (ngModelChange)="cargar()" class="w-4 h-4 accent-rose-600">
          Solo no atendidas
        </label>
        @if (puedeReportar) {
          <button filter-actions
            (click)="abrirReportar()"
            class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide name="plus" class="w-4 h-4"></i-lucide>
            <span class="hidden sm:inline">Reportar Nuevo Fallo</span>
            <span class="sm:hidden">Reportar Fallo</span>
          </button>
        }
      </app-filter-bar>

      @if (totalNoAtendidas > 0) {
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
          <i-lucide name="alert-circle" class="w-4 h-4"></i-lucide>
          {{ totalNoAtendidas }} incidencia(s) no atendida(s): aún no tienen técnico asignado.
        </div>
      }

      @if (error) {
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div>
      }

      <!-- Tarjetas de incidencias (orden del backend: no atendidas, en proceso, cerradas) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        @for (inc of paginatedIncidentes; track inc.id) {
          <div class="rounded-2xl border shadow-easydry p-5 flex flex-col h-full min-h-[280px] hover:shadow-easydry-hover transition-all"
            [ngClass]="inc.noAtendida ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-100'">

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-3">
                <span class="font-mono font-extrabold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg truncate">
                  {{ inc.codigoIncidente }}
                </span>
                <div class="flex items-center gap-1.5 shrink-0">
                  @if (inc.noAtendida) {
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-600 text-white">No atendida</span>
                  }
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold"
                    [ngClass]="{
                      'bg-rose-100 text-rose-800 border border-rose-300': inc.estado === 'Pendiente',
                      'bg-amber-100 text-amber-800 border border-amber-300': inc.estado === 'En Solución',
                      'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40': inc.estado === 'Solucionado',
                      'bg-slate-200 text-slate-600 border border-slate-300': inc.estado === 'Cancelado'
                    }">
                    {{ inc.estado }}
                  </span>
                </div>
              </div>

              <h3 class="font-bold text-base font-outfit leading-snug line-clamp-2" [ngClass]="inc.noAtendida ? 'text-rose-800' : 'text-slate-900'">{{ inc.maquina }}</h3>
              <p class="text-xs text-slate-500 font-semibold mt-0.5 truncate">{{ inc.agencia }} • {{ inc.fecha }}</p>

              <div class="mt-3 p-3 bg-white/70 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div class="flex items-center justify-between gap-1.5">
                  <div class="flex items-center gap-1.5 text-rose-700 font-bold text-[11px] min-w-0">
                    <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    <span class="truncate">Falla: {{ inc.tipo }}</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0" [ngClass]="claseGravedad(inc.gravedadRaw)">{{ inc.prioridad }}</span>
                </div>
                <p class="text-slate-700 font-medium line-clamp-2">{{ inc.descripcion }}</p>
                <p class="text-slate-400 text-[10px] truncate">Reportado por: <strong class="text-slate-600">{{ inc.reportadoPor }}</strong></p>
                @if (inc.tecnicoAsignadoId) {
                  <p class="text-violet-700 text-[10px] font-bold mt-1 truncate">Asignado a: {{ inc.tecnicoAsignadoNombre }}</p>
                } @else if (inc.estadoRaw === 'ABIERTO') {
                  <p class="text-rose-700 text-[10px] font-bold mt-1">Sin asignar — requiere coordinación de mantenimiento</p>
                }
              </div>

              @if (inc.evidencias && inc.evidencias.length > 0) {
                <div class="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Evidencias:</span>
                  <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">{{ inc.evidencias.length }} archivo(s)</span>
                </div>
              }

              @if (inc.estado === 'Solucionado') {
                <div class="mt-3 p-3 bg-easydry-green/10 border border-easydry-green/30 rounded-xl text-xs space-y-1">
                  <span class="font-bold text-easydry-green-dark uppercase text-[10px] flex items-center gap-1">
                    <i-lucide name="check-circle-2" class="w-3.5 h-3.5"></i-lucide> Equipo reparado
                  </span>
                  <p class="text-slate-800 font-medium line-clamp-2">{{ inc.observacionSolucion }}</p>
                </div>
              }
            </div>

            <!-- Acciones (según rol; el backend valida de nuevo) -->
            <div class="pt-3 mt-auto border-t border-slate-100 flex flex-col gap-2">
              <button (click)="abrirDetalle(inc)"
                class="w-full py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <i-lucide name="eye" class="w-4 h-4 text-easydry-blue shrink-0"></i-lucide>
                <span>Ver ficha & evidencias</span>
              </button>

              @if (inc.estadoRaw !== 'RESUELTO' && inc.estadoRaw !== 'CANCELADO') {
                @if (puedeAsignar) {
                  <button (click)="acciones.asignarIncidente(inc)"
                    class="w-full py-2 px-2 bg-violet-600 hover:bg-violet-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                    <i-lucide name="user-cog" class="w-4 h-4 shrink-0"></i-lucide>
                    <span>{{ inc.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}</span>
                  </button>
                }
                @if (puedeResolver(inc)) {
                  <button (click)="acciones.resolverIncidente(inc)"
                    class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center justify-center gap-2 cursor-pointer">
                    <i-lucide name="wrench" class="w-4 h-4 shrink-0"></i-lucide>
                    <span>Resolver incidencia</span>
                  </button>
                }
              }
              <div class="flex gap-2">
                @if (puedeEditar(inc)) {
                  <button (click)="acciones.editarIncidente(inc)"
                    class="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-[11px] cursor-pointer">Editar</button>
                }
                <button (click)="acciones.agregarEvidencia('INCIDENTE', inc)"
                  class="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-[11px] cursor-pointer">+ Evidencia</button>
              </div>
            </div>
          </div>
        }
      </div>

      @if (!cargando && incidentesFiltrados.length === 0) {
        <p class="text-center text-sm text-slate-400 font-semibold py-8">No hay incidencias para los filtros seleccionados.</p>
      }

      <div class="mt-6">
        <app-pagination
          [totalItems]="incidentesFiltrados.length"
          [currentPage]="currentPage"
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Elegir máquina para reportar (solo operadores, sobre máquinas asignadas a ellos) -->
      <app-modal [isOpen]="modalElegirOpen" title="Reportar incidencia" icon="alert-triangle" (close)="modalElegirOpen = false">
        <div class="space-y-3">
          <label class="block text-xs font-bold text-slate-700 uppercase">Equipo afectado (asignado a ti)</label>
          <select [(ngModel)]="maquinaElegidaId" name="maq-elegida" class="w-full p-2.5 border rounded-xl text-sm font-bold bg-white">
            @for (m of misMaquinas; track m.id) {
              <option [value]="m.id">{{ m.codigo }} — {{ m.nombre }} ({{ m.agencia }})</option>
            }
          </select>
        </div>
        <div modal-footer>
          <button (click)="modalElegirOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
          <button (click)="continuarReporte()" class="px-4 py-2 bg-easydry-green text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer">Continuar</button>
        </div>
      </app-modal>

      <!-- Ficha de la incidencia con evidencias (fotos, videos y PDF vía URL temporal) -->
      <app-modal
        [isOpen]="modalDetalleOpen"
        [title]="'Ficha de auditoría técnica: ' + (incidenteDetalle?.codigoIncidente || '')"
        icon="clipboard-list"
        (close)="modalDetalleOpen = false">
        @if (incidenteDetalle; as d) {
          <div class="space-y-5">
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">{{ d.codigoIncidente }}</span>
                <h3 class="text-lg font-bold text-slate-900">{{ d.maquina }}</h3>
                <p class="text-xs text-slate-500">{{ d.agencia }} • Reportado: {{ hora(d.fechaReporteIso) }}</p>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                @if (d.noAtendida) { <span class="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-600 text-white">No atendida</span> }
                <span class="px-3 py-1.5 rounded-xl text-xs font-extrabold" [ngClass]="claseGravedad(d.gravedadRaw)">{{ d.prioridad }}</span>
                <span class="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">{{ d.estado }}</span>
              </div>
            </div>

            <div class="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-2 text-xs">
              <h4 class="font-bold text-rose-900 uppercase flex items-center gap-1.5">
                <i-lucide name="alert-triangle" class="w-4 h-4 text-rose-600"></i-lucide> {{ d.tipo }}
              </h4>
              <p class="text-slate-800 font-medium">{{ d.descripcion }}</p>
              <p class="text-slate-500">Reportado por <strong>{{ d.reportadoPor }}</strong> · Técnico: <strong>{{ d.tecnicoAsignadoId ? d.tecnicoAsignadoNombre : 'Sin asignar' }}</strong></p>
              @if (d.destinoTallerNombre) { <p class="text-slate-500">Taller destino: <strong>{{ d.destinoTallerNombre }}</strong></p> }
            </div>

            @if (d.observacionSolucion) {
              <div class="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-1 text-xs">
                <h4 class="font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                  <i-lucide name="check-circle-2" class="w-4 h-4 text-emerald-600"></i-lucide> Resolución
                </h4>
                <p class="text-slate-800 font-medium">{{ d.observacionSolucion }}</p>
                @if (d.solucionadoPor) { <p class="text-slate-500">Por {{ d.solucionadoPor }} ({{ d.fechaSolucion }})</p> }
              </div>
            }

            <div>
              <h4 class="font-bold text-slate-900 text-xs uppercase mb-2">Evidencias</h4>
              <app-evidencia-galeria [evidencias]="d.evidencias || []" [agruparPorEtapa]="true" vacio="Esta incidencia no tiene evidencias."></app-evidencia-galeria>
            </div>
          </div>
        }
        <div modal-footer>
          @if (incidenteDetalle?.maquinariaId) {
            <button (click)="verMaquina(incidenteDetalle!)" class="px-4 py-2 bg-easydry-blue/10 text-easydry-blue font-bold rounded-xl text-xs cursor-pointer">Ver máquina y trazabilidad</button>
          }
          <button (click)="modalDetalleOpen = false" class="px-5 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer">Cerrar ficha</button>
        </div>
      </app-modal>

      <!-- Detalle de máquina reutilizable + diálogos de trabajo -->
      <app-maquinaria-detalle-modal [maquinariaId]="maquinaDetalleId" pestanaInicial="incidencias"
        (cerrar)="maquinaDetalleId = null" (cambio)="cargar()"></app-maquinaria-detalle-modal>
      <app-trabajo-acciones #acciones (hecho)="onAccion()"></app-trabajo-acciones>
    </div>
  `
})
export class IncidentesComponent implements OnInit {
  @Input() hideHeader = false;
  incidentes: Incidente[] = [];
  misMaquinas: Maquinaria[] = [];

  incidenteDetalle?: Incidente;
  modalDetalleOpen = false;
  modalElegirOpen = false;
  maquinaElegidaId = '';
  maquinaDetalleId: string | number | null = null;

  currentPage = 1;
  pageSize = 6;
  cargando = false;
  error = '';
  soloNoAtendidas = false;

  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy', marca: 'Todas' };

  private incidenteService = inject(IncidenteService);
  private maquinariaService = inject(MaquinariaService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private sucursalService = inject(SucursalService);

  @ViewChild('acciones') acciones!: TrabajoAccionesComponent;

  private get rol(): string { return String(this.authService.getCurrentUser()?.role || ''); }
  private get miId(): string { return String(this.authService.getCurrentUser()?.id || ''); }

  ngOnInit(): void {
    this.cargar();
    if (esOperadorMaquina(this.rol)) {
      this.maquinariaService.getMaquinaria().subscribe(list => {
        this.misMaquinas = list.filter(m => m.activa !== false && String(m.operadorAsignadoId || '') === this.miId);
        this.maquinaElegidaId = this.misMaquinas[0] ? String(this.misMaquinas[0].id) : '';
      });
    }
  }

  /** Carga las incidencias tal cual las ordena el backend (no atendidas primero): no se reordenan. */
  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.incidenteService.getIncidentesPagina({ soloNoAtendidas: this.soloNoAtendidas || undefined }).subscribe({
      next: p => {
        this.incidentes = p.data;
        this.cargando = false;
      },
      error: err => {
        this.cargando = false;
        this.error = err?.error?.message ? String(err.error.message) : 'No se pudieron cargar las incidencias.';
      },
    });
  }

  onAccion(): void {
    this.cargar();
  }

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    this.currentPage = 1;
  }

  // ---- Permisos de UI (el backend valida siempre) ----
  get puedeAsignar(): boolean { return puedeGestionarMaquina(this.rol); }

  /** Reportar: solo pulidor/líder con máquinas asignadas. */
  get puedeReportar(): boolean { return esOperadorMaquina(this.rol) && this.misMaquinas.length > 0; }

  puedeResolver(inc: Incidente): boolean {
    if (!puedeTrabajarOrden(this.rol)) return false;
    // El coordinador/admin puede resolver una no asignada (queda auto-asignado); el técnico solo la suya.
    if (puedeGestionarMaquina(this.rol)) return !inc.tecnicoAsignadoId || String(inc.tecnicoAsignadoId) === this.miId;
    return String(inc.tecnicoAsignadoId || '') === this.miId;
  }

  puedeEditar(inc: Incidente): boolean {
    return puedeTrabajarOrden(this.rol) && (puedeGestionarMaquina(this.rol) || String(inc.tecnicoAsignadoId || '') === this.miId);
  }

  get totalNoAtendidas(): number {
    return this.incidentes.filter(i => i.noAtendida).length;
  }

  private readonly memoFiltrados = new MemoLista();

  /** Se recalcula solo cuando cambian la lista o los filtros (antes se filtraba en cada revisión de pantalla). */
  get incidentesFiltrados() {
    // El filtro por marca depende de las sucursales, que cargan aparte: en ese caso no se memoriza.
    const marcaActiva = !!this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas';
    if (marcaActiva) return this.calcularIncidentesFiltrados();
    return this.memoFiltrados.obtener(
      [this.incidentes, this.incidentes.length, JSON.stringify(this.filtrosGlobales)],
      () => this.calcularIncidentesFiltrados(),
    );
  }

  private calcularIncidentesFiltrados() {
    let resultados = this.incidentes;

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(inc => inc.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(inc => inc.agencia === this.filtrosGlobales.sucursal);
    }
    if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
      resultados = resultados.filter(item => {
        const suc = this.sucursalService.getSucursalPorNombre(item.agencia);
        return suc?.marcaNombre === this.filtrosGlobales.marca;
      });
    }

    const rango = resolverRangoFechas(this.filtrosGlobales);
    if (rango) {
      resultados = resultados.filter(inc => {
        const d = soloFecha(inc.fecha);
        return d >= rango.inicio && d <= rango.fin;
      });
    }

    return resultados;
  }

  get paginatedIncidentes() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.incidentesFiltrados.slice(start, start + this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  abrirReportar(): void {
    if (this.misMaquinas.length === 1) {
      void this.acciones.reportarIncidente(this.misMaquinas[0]);
    } else {
      this.modalElegirOpen = true;
    }
  }

  continuarReporte(): void {
    const m = this.misMaquinas.find(x => String(x.id) === this.maquinaElegidaId);
    if (!m) {
      this.toastService.warning('Equipo requerido', 'Selecciona el equipo afectado.');
      return;
    }
    this.modalElegirOpen = false;
    void this.acciones.reportarIncidente(m);
  }

  abrirDetalle(inc: Incidente) {
    this.incidenteDetalle = inc;
    this.modalDetalleOpen = true;
  }

  verMaquina(inc: Incidente): void {
    this.modalDetalleOpen = false;
    this.maquinaDetalleId = inc.maquinariaId || null;
  }

  hora(iso?: string | null): string { return fechaHoraLocal(iso); }

  claseGravedad(g?: string): string {
    return g === 'CRITICA' ? 'bg-rose-600 text-white' : g === 'ALTA' ? 'bg-orange-100 text-orange-800' : g === 'BAJA' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800';
  }
}

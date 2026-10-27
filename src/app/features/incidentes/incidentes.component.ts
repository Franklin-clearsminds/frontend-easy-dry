import { Component, OnDestroy, OnInit, ViewChild, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, Subscription, debounceTime, distinctUntilChanged, map, tap } from 'rxjs';
import { ConsultaIncidentes, IncidenteService, ResumenIncidentes } from '../../core/services/incidente.service';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { AuthService } from '../../core/services/auth.service';
import { Incidente, Maquinaria } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import { ListaInfinita } from '../../core/utils/lista-infinita';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_INFINITO } from '../../core/config/paginacion';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { EvidenciaGaleriaComponent } from '../../shared/components/evidencia-galeria/evidencia-galeria.component';
import { resolverRangoFechas } from '../../core/utils/fecha-rango';
import { SucursalService } from '../../core/services/sucursal.service';
import { Sucursal } from '../../core/models';
import { fechaHoraLocal } from '../../core/utils/evidencia-maquinaria';
import {
  puedeGestionarMaquina, puedeCancelarIncidentes, puedeEditarIncidentes, puedeReportarIncidente, puedeResolverIncidentes, puedeVerMaquinaria,
} from '../../core/utils/maquinaria-permisos';
import { TrabajoAccionesComponent } from '../maquinaria/trabajo-acciones/trabajo-acciones.component';
import { MaquinariaDetalleModalComponent } from '../maquinaria/maquinaria-detalle-modal/maquinaria-detalle-modal.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { badgeClase, BADGE_NO_ATENDIDO } from '../../core/utils/badges';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-incidentes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LucideAngularModule, ModalComponent, InfiniteScrollComponent, FilterBarComponent,
    EvidenciaGaleriaComponent, TrabajoAccionesComponent, MaquinariaDetalleModalComponent, SkeletonLoaderComponent, StatCardComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Header -->
      @if (!hideHeader) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold mb-2">
              <i-lucide name="alert-triangle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
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
        [placeholderBusqueda]="'Buscar por máquina, falla, reportante o técnico...'"
        [showCliente]="true"
        [showFechas]="true"
        [modoFechas]="'rango'"
        [listaEstados]="['Todos', 'Pendiente', 'En Solución', 'Solucionado', 'Cancelado']"
        (filterChange)="aplicarNuevosFiltros($event)">
        <label filter-actions class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input type="checkbox" [(ngModel)]="soloNoAtendidas" (ngModelChange)="reiniciar()" class="w-4 h-4 accent-rose-600">
          Solo no atendidas
        </label>
        @if (puedeReportar) {
          <button filter-actions
            (click)="abrirReportar()"
            class="btn btn-cta">
            <i-lucide name="plus" class="w-4 h-4" aria-hidden="true"></i-lucide>
            <span class="hidden sm:inline">Reportar Nuevo Fallo</span>
            <span class="sm:hidden">Reportar Fallo</span>
          </button>
        }
      </app-filter-bar>
      @if (busquedaCorta) {
        <p class="-mt-3 px-2 text-[11px] font-semibold text-slate-500" role="status">Escribe al menos {{ minBusqueda }} letras para buscar.</p>
      }

      <!-- Gasto del período con los mismos filtros: solo lo ve quien tiene permiso de precios (el servidor no envía el dato al resto) -->
      @if (resumen?.gastoIncidentes !== undefined) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <app-stat-card title="Gasto por incidentes" [value]="'$' + (resumen?.gastoIncidentes ?? 0 | number:'1.2-2')" icon="alert-triangle"
            variant="danger" subtitle="Reparaciones de incidencias resueltas"></app-stat-card>
          <app-stat-card title="Gasto por mantenimientos" [value]="'$' + (resumen?.gastoMantenimientos ?? 0 | number:'1.2-2')" icon="wrench"
            variant="warning" subtitle="Mantenimientos finalizados"></app-stat-card>
        </div>
      }

      @if (totalNoAtendidas > 0) {
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
          <i-lucide name="alert-circle" class="w-4 h-4" aria-hidden="true"></i-lucide>
          {{ totalNoAtendidas }} incidencia(s) no atendida(s): aún no tienen técnico asignado.
        </div>
      }

      @if (lista.error && lista.items.length === 0) {
        <div role="alert" class="flex flex-col items-center gap-3 text-center py-6">
          <div class="estado-error">{{ lista.error }}</div>
          <button type="button" class="btn btn-secondary btn-sm" (click)="reiniciar()">Reintentar</button>
        </div>
      } @else if (!lista.inicializada) {
        <div role="status" aria-live="polite">
          <span class="sr-only">Cargando incidencias…</span>
          <app-skeleton-loader type="cards"></app-skeleton-loader>
        </div>
      }

      <!-- Tarjetas de incidencias (orden del backend: no atendidas, en proceso, cerradas) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        @for (inc of lista.items; track inc.id) {
          <div class="rounded-2xl border shadow-easydry p-5 flex flex-col h-full min-h-[280px] hover:shadow-easydry-hover transition-shadow"
            [ngClass]="inc.noAtendida ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-100'">

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-3">
                <span class="font-mono font-extrabold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg truncate">
                  {{ inc.codigoIncidente }}
                </span>
                <div class="flex items-center gap-1.5 shrink-0">
                  @if (inc.noAtendida) {
                    <span [class]="badgeNoAtendido">No atendida</span>
                  }
                  <span [class]="badgeClase('incidente', inc.estado)">{{ inc.estado }}</span>
                </div>
              </div>

              <h3 class="font-bold text-base font-outfit leading-snug line-clamp-2" [ngClass]="inc.noAtendida ? 'text-rose-800' : 'text-slate-900'">{{ inc.maquina }}</h3>
              <p class="text-xs font-semibold mt-0.5 truncate" [ngClass]="inc.esPulidorMovil ? 'text-indigo-600' : 'text-slate-500'">
                @if (inc.esPulidorMovil) {
                  <i-lucide name="truck" class="w-3 h-3 inline-block align-text-top mr-0.5" aria-hidden="true"></i-lucide>
                }
                {{ inc.agencia }} • {{ inc.fecha }}
              </p>

              <div class="mt-3 p-3 bg-white/70 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div class="flex items-center justify-between gap-1.5">
                  <div class="flex items-center gap-1.5 text-rose-700 font-bold text-xs min-w-0">
                    <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0" aria-hidden="true"></i-lucide>
                    <span class="truncate">Falla: {{ inc.tipo }}</span>
                  </div>
                  <span class="shrink-0" [class]="badgeClase('gravedad', inc.gravedadRaw)">{{ inc.prioridad }}</span>
                </div>
                <p class="text-slate-700 font-medium line-clamp-2">{{ inc.descripcion }}</p>
                <p class="text-slate-500 text-xs truncate">Reportado por: <strong class="text-slate-600">{{ inc.reportadoPor }}</strong></p>
                @if (inc.tecnicoAsignadoId) {
                  <p class="text-violet-700 text-xs font-bold mt-1 truncate">Asignado a: {{ inc.tecnicoAsignadoNombre }}</p>
                } @else if (inc.estadoRaw === 'ABIERTO') {
                  <p class="text-rose-700 text-xs font-bold mt-1">Sin asignar — requiere coordinación de mantenimiento</p>
                }
              </div>

              @if (inc.evidencias && inc.evidencias.length > 0) {
                <div class="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span class="text-[11px] font-bold text-slate-500 uppercase">Evidencias:</span>
                  <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">{{ inc.evidencias.length }} archivo(s)</span>
                </div>
              }

              @if (inc.estado === 'Solucionado') {
                <div class="mt-3 p-3 bg-easydry-green/10 border border-easydry-green/30 rounded-xl text-xs space-y-1">
                  <span class="font-bold text-easydry-green-text uppercase text-[11px] flex items-center gap-1">
                    <i-lucide name="check-circle-2" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Equipo reparado
                  </span>
                  <p class="text-slate-800 font-medium line-clamp-2">{{ inc.observacionSolucion }}</p>
                </div>
              }
            </div>

            <!-- Acciones (según rol; el backend valida de nuevo) -->
            <div class="pt-3 mt-auto border-t border-slate-100 flex flex-col gap-2">
              <button type="button" (click)="abrirDetalle(inc)"
                class="btn btn-secondary w-full">
                <i-lucide name="eye" class="w-4 h-4 text-easydry-blue shrink-0" aria-hidden="true"></i-lucide>
                <span>Ver ficha & evidencias</span>
              </button>

              @if (inc.estadoRaw !== 'RESUELTO' && inc.estadoRaw !== 'CANCELADO') {
                @if (puedeAsignar) {
                  <button type="button" (click)="acciones.asignarIncidente(inc)"
                    class="btn btn-secondary w-full">
                    <i-lucide name="user-cog" class="w-4 h-4 shrink-0" aria-hidden="true"></i-lucide>
                    <span>{{ inc.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}</span>
                  </button>
                }
                @if (puedeResolver(inc)) {
                  <button type="button" (click)="acciones.resolverIncidente(inc)"
                    class="btn btn-primary">
                    <i-lucide name="wrench" class="w-4 h-4 shrink-0" aria-hidden="true"></i-lucide>
                    <span>Resolver incidencia</span>
                  </button>
                }
                @if (puedeCancelar) {
                  <button type="button" (click)="acciones.cancelarIncidente(inc)" class="btn btn-danger">
                    <i-lucide name="x-circle" class="w-4 h-4 shrink-0" aria-hidden="true"></i-lucide>
                    <span>Cancelar incidencia</span>
                  </button>
                }
              }
              <div class="flex gap-2">
                @if (puedeEditar(inc)) {
                  <button type="button" (click)="acciones.editarIncidente(inc)"
                    class="btn btn-secondary btn-sm flex-1">Editar</button>
                }
                <button type="button" (click)="acciones.agregarEvidencia('INCIDENTE', inc)"
                  class="btn btn-secondary btn-sm flex-1">+ Evidencia</button>
              </div>
            </div>
          </div>
        }
      </div>

      @if (lista.inicializada && !lista.error && lista.items.length === 0) {
        <p class="estado-vacio">{{ tituloVacio }}</p>
      } @else if (lista.items.length > 0) {
        <app-infinite-scroll
          [hasMore]="lista.hasMore"
          [loading]="lista.cargando"
          [error]="lista.error"
          [total]="lista.total"
          (cargarMas)="lista.siguiente()"
          (reintentar)="lista.reintentar()">
        </app-infinite-scroll>
      }

      <!-- Elegir máquina para reportar (solo operadores, sobre máquinas asignadas a ellos) -->
      <app-modal [isOpen]="modalElegirOpen" title="Reportar incidencia" icon="alert-triangle" size="sm" size="sm" (close)="modalElegirOpen = false">
        <div class="space-y-3">
          <label for="inc-maq-elegida" class="field-label">Equipo afectado (asignado a ti)</label>
          <select id="inc-maq-elegida" [(ngModel)]="maquinaElegidaId" name="maq-elegida" class="field select-chevron font-bold">
            @for (m of misMaquinas; track m.id) {
              <option [value]="m.id">{{ m.codigo }} — {{ m.nombre }} ({{ m.agencia }})</option>
            }
          </select>
        </div>
        <div modal-footer>
          <button type="button" (click)="modalElegirOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button type="button" (click)="continuarReporte()" class="btn btn-primary w-full sm:w-auto">Continuar</button>
        </div>
      </app-modal>

      <!-- Ficha de la incidencia con evidencias (fotos, videos y PDF vía URL temporal) -->
      <app-modal
        [isOpen]="modalDetalleOpen"
        [title]="'Ficha de auditoría técnica: ' + (incidenteDetalle?.codigoIncidente || '')"
        icon="clipboard-list"
        size="xl"
        (close)="modalDetalleOpen = false">
        @if (incidenteDetalle; as d) {
          <div class="space-y-5">
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">{{ d.codigoIncidente }}</span>
                <h3 class="text-lg font-bold text-slate-900">{{ d.maquina }}</h3>
                <p class="text-xs" [ngClass]="d.esPulidorMovil ? 'text-indigo-600 font-semibold' : 'text-slate-500'">{{ d.agencia }} • Reportado: {{ hora(d.fechaReporteIso) }}</p>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                @if (d.noAtendida) { <span [class]="badgeNoAtendido">No atendida</span> }
                <span [class]="badgeClase('gravedad', d.gravedadRaw)">{{ d.prioridad }}</span>
                <span [class]="badgeClase('incidente', d.estado)">{{ d.estado }}</span>
              </div>
            </div>

            <div class="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-2 text-xs">
              <h4 class="font-bold text-rose-900 uppercase flex items-center gap-1.5">
                <i-lucide name="alert-triangle" class="w-4 h-4 text-rose-600" aria-hidden="true"></i-lucide> {{ d.tipo }}
              </h4>
              <p class="text-slate-800 font-medium break-words">{{ d.descripcion }}</p>
              <p class="text-slate-500">Reportado por <strong>{{ d.reportadoPor }}</strong> · Técnico: <strong>{{ d.tecnicoAsignadoId ? d.tecnicoAsignadoNombre : 'Sin asignar' }}</strong></p>
              @if (d.destinoTallerNombre) { <p class="text-slate-500">Taller destino: <strong>{{ d.destinoTallerNombre }}</strong></p> }
            </div>

            @if (d.estadoRaw === 'CANCELADO') {
              <div class="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-1 text-xs">
                <h4 class="font-bold text-rose-900 uppercase flex items-center gap-1.5">
                  <i-lucide name="x-circle" class="w-4 h-4 text-rose-600" aria-hidden="true"></i-lucide> Incidencia cancelada
                </h4>
                <p class="text-slate-800 font-medium break-words">{{ d.motivoCancelacion || d.observacionSolucion || 'Sin motivo registrado' }}</p>
                @if (d.canceladoPor) { <p class="text-slate-500">Por {{ d.canceladoPor }}@if (d.fechaCancelacion) { ({{ d.fechaCancelacion }}) }</p> }
              </div>
            } @else if (d.observacionSolucion) {
              <div class="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-1 text-xs">
                <h4 class="font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                  <i-lucide name="check-circle-2" class="w-4 h-4 text-emerald-600" aria-hidden="true"></i-lucide> Resolución
                </h4>
                <p class="text-slate-800 font-medium break-words">{{ d.observacionSolucion }}</p>
                @if (d.solucionadoPor) { <p class="text-slate-500">Por {{ d.solucionadoPor }} ({{ d.fechaSolucion }})</p> }
                @if (d.costoTotal != null) { <p class="text-slate-800 font-bold">Costo: \${{ d.costoTotal | number:'1.2-2' }}</p> }
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
            <button type="button" (click)="verMaquina(incidenteDetalle!)" class="btn btn-secondary w-full sm:w-auto">Ver máquina y trazabilidad</button>
          }
          <button type="button" (click)="modalDetalleOpen = false" class="btn btn-secondary w-full sm:w-auto">Cerrar ficha</button>
        </div>
      </app-modal>

      <!-- Detalle de máquina reutilizable + diálogos de trabajo -->
      <app-maquinaria-detalle-modal [maquinariaId]="maquinaDetalleId" pestanaInicial="incidencias"
        (cerrar)="maquinaDetalleId = null" (cambio)="refrescar()"></app-maquinaria-detalle-modal>
      <app-trabajo-acciones #acciones (hecho)="onAccion()"></app-trabajo-acciones>
    </div>
  `
})
export class IncidentesComponent implements OnInit, OnDestroy {
  @Input() hideHeader = false;
  misMaquinas: Maquinaria[] = [];

  incidenteDetalle?: Incidente;
  modalDetalleOpen = false;
  modalElegirOpen = false;
  maquinaElegidaId = '';
  maquinaDetalleId: string | number | null = null;

  soloNoAtendidas = false;

  // ── Filtros, búsqueda y scroll infinito: todo en el SERVIDOR ──
  readonly minBusqueda = BUSQUEDA_MIN_CARACTERES;
  /** true cuando el usuario escribió 1 letra (se pide un mínimo de 2 antes de consultar). */
  busquedaCorta = false;
  /** Texto que realmente se envía al servidor (con mínimo de letras y espera de 300 ms). */
  private busquedaAplicada = '';
  private readonly busqueda$ = new Subject<string>();
  private suscripcionBusqueda?: Subscription;
  /** Contadores de los filtros vigentes (menos el de estado); los da el servidor, no lo cargado. */
  resumen: ResumenIncidentes | null = null;

  readonly lista = new ListaInfinita<Incidente>(
    (page, size) => this.incidenteService
      .getIncidentesPagina({ ...this.consulta(), page, pageSize: size, incluirResumen: page === 1 })
      .pipe(
        tap((r) => { if (r.resumen) this.resumen = r.resumen; }),
        map((r) => r.pagina),
      ),
    PAGE_SIZE_INFINITO,
    (i) => i.id,
  );

  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy', marca: 'Todas' };

  private incidenteService = inject(IncidenteService);
  private maquinariaService = inject(MaquinariaService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private sucursalService = inject(SucursalService);
  private sucursales: Sucursal[] = [];

  @ViewChild('acciones') acciones!: TrabajoAccionesComponent;

  private get miId(): string { return String(this.authService.getCurrentUser()?.id || ''); }

  ngOnInit(): void {
    this.suscripcionBusqueda = this.busqueda$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaAplicada = texto;
        this.reiniciar();
      });
    // El filter-bar entrega nombres de sucursal/marca y el servidor pide ids: se necesitan las sucursales cargadas.
    // Solo quien puede ver agencias las pide: el técnico no tiene ese permiso y la llamada le mostraba «tu rol no tiene permiso» aunque la lista cargara bien.
    if (this.authService.puede('agencias.ver')) this.sucursalService.getSucursales().subscribe((list) => { this.sucursales = list; });
    this.reiniciar();
    if (puedeReportarIncidente(this.authService) && puedeVerMaquinaria(this.authService)) {
      this.maquinariaService.getMaquinaria().subscribe(list => {
        this.misMaquinas = list.filter(m => m.activa !== false && String(m.operadorAsignadoId || '') === this.miId);
        this.maquinaElegidaId = this.misMaquinas[0] ? String(this.misMaquinas[0].id) : '';
      });
    }
  }

  ngOnDestroy(): void {
    this.suscripcionBusqueda?.unsubscribe();
    this.lista.destruir();
  }

  /** Vuelve al primer bloque con los filtros vigentes (y vuelve a pedir los contadores). */
  reiniciar(): void {
    this.lista.reiniciar();
  }

  /** Tras una acción (asignar, resolver, editar, reportar…): reinicia la lista y actualiza los contadores. */
  refrescar(): void {
    this.reiniciar();
  }

  onAccion(): void {
    this.refrescar();
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
      case 'Pendiente': return 'ABIERTO';
      case 'En Solución': return 'EN_PROCESO';
      case 'Solucionado': return 'RESUELTO';
      case 'Cancelado': return 'CANCELADO';
      default: return undefined;
    }
  }

  /** Id de la sucursal elegida ('' si no hay filtro; un id imposible si el nombre no existe, para no mostrar todo). */
  private agenciaIdFiltro(): string {
    const nombre = this.neutro(this.filtrosGlobales.sucursal, 'Todas', 'TODAS');
    if (!nombre) return '';
    const n = nombre.toLowerCase();
    const suc = this.sucursales.find((s) => (s.nombre || '').toLowerCase() === n);
    return suc ? String(suc.id) : '__sin_coincidencia__';
  }

  private clienteIdFiltro(): string {
    const f = this.filtrosGlobales;
    const nombre = this.neutro(f.cliente, 'Todas', 'TODAS') || this.neutro(f.marca, 'Todas', 'TODAS');
    if (!nombre) return '';
    const suc = this.sucursales.find((s) => (s.clienteNombre || s.marcaNombre) === nombre && (s.clienteId ?? s.marcaId) !== undefined);
    const id = suc ? (suc.clienteId ?? suc.marcaId) : undefined;
    return id !== undefined && id !== null ? String(id) : '__sin_coincidencia__';
  }

  /** Filtros vigentes para el servidor (sin página ni tamaño). El orden por grupos lo hace el servidor. */
  private consulta(): ConsultaIncidentes {
    const rango = resolverRangoFechas(this.filtrosGlobales);
    return {
      search: this.busquedaAplicada,
      estado: this.estadoServidor(),
      agenciaId: this.agenciaIdFiltro() || undefined,
      clienteId: this.clienteIdFiltro() || undefined,
      soloNoAtendidas: this.soloNoAtendidas || undefined,
      fechaDesde: rango?.inicio,
      fechaHasta: rango?.fin,
    };
  }

  private get hayFiltrosActivos(): boolean {
    const c = this.consulta();
    return !!(c.search || c.estado || c.agenciaId || c.clienteId || c.soloNoAtendidas || c.fechaDesde);
  }

  get tituloVacio(): string {
    return this.hayFiltrosActivos
      ? 'No hay incidencias que coincidan con los filtros aplicados.'
      : 'Aún no hay incidencias registradas.';
  }

  // ---- Permisos de UI (el backend valida siempre) ----
  get puedeAsignar(): boolean { return puedeGestionarMaquina(this.authService); }

  /** Reportar: con el permiso y con máquinas asignadas al usuario. */
  get puedeReportar(): boolean { return puedeReportarIncidente(this.authService) && this.misMaquinas.length > 0; }

  get puedeCancelar(): boolean { return puedeCancelarIncidentes(this.authService); }

  puedeResolver(inc: Incidente): boolean {
    if (!puedeResolverIncidentes(this.authService)) return false;
    // El coordinador/admin puede resolver una no asignada (queda auto-asignado); el técnico solo la suya.
    if (puedeGestionarMaquina(this.authService)) return !inc.tecnicoAsignadoId || String(inc.tecnicoAsignadoId) === this.miId;
    return String(inc.tecnicoAsignadoId || '') === this.miId;
  }

  puedeEditar(inc: Incidente): boolean {
    return puedeEditarIncidentes(this.authService, String(inc.tecnicoAsignadoId || '') === this.miId);
  }

  /** Incidencias sin técnico asignado con los filtros vigentes (dato del servidor). */
  get totalNoAtendidas(): number { return this.resumen?.noAtendidas ?? 0; }

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

  readonly badgeClase = badgeClase;
  readonly badgeNoAtendido = BADGE_NO_ATENDIDO;
}

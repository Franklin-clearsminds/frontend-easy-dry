import { Component, HostListener, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { CrearRetoModalComponent } from './components/crear-reto-modal.component';
import { ModalPortalDirective } from '../../shared/directives/modal-portal.directive';
import { AgenciaService } from '../../core/services/agencia.service';
import { AuthService } from '../../core/services/auth.service';
import { Agencia } from '../../core/models';
import { SucursalService } from '../../core/services/sucursal.service';
import { RetosService } from '../../core/services/retos.service';
import { ToastService } from '../../shared/services/toast.service';
import { FormsModule } from '@angular/forms';
import { DataTableCellDirective, DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { TablaServidor } from '../../core/utils/tabla-servidor';
import { Reto } from '../../core/models/reto.model';

@Component({
  selector: 'app-productividad',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ChartCardComponent, FilterBarComponent, CrearRetoModalComponent, ModalPortalDirective, DataTableComponent, DataTableCellDirective],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Top Title Bar -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Métricas de Productividad & Rendimiento</h1>
          <p class="text-slate-500 text-xs mt-1">Monitoreo comparativo de agencias, ranking de personal y desempeño operativo.</p>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 self-start sm:self-auto">
          @if (retosActivos.length > 0) {
            <span class="px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs">
              <i-lucide aria-hidden="true" name="trophy" class="w-4 h-4 text-amber-600"></i-lucide>
              <span>Reto activo: {{ retosActivos[currentRetoIndex].titulo }}</span>
            </span>
          }
          @if (canCreateReto && retosActivos.length > 0) {
            <button (click)="showCrearRetoModal = true" class="btn btn-cta">
              <i-lucide aria-hidden="true" name="plus-circle" class="w-4 h-4"></i-lucide> Crear Nuevo Reto
            </button>
          }
        </div>
      </div>

      <!-- RETO EASYDRY SPECIAL GAMIFIED SECTION -->
      @if (retosActivos.length > 0) {
        <div class="w-full bg-gradient-to-br from-slate-900 via-slate-900 to-zinc-900 rounded-2xl p-6 md:p-8 pb-12 md:pb-14 border border-slate-700/60 shadow-xl relative overflow-hidden flex flex-col mb-8 text-white">
            
            @if (retosActivos.length > 1) {
              <!-- Controles del Carrusel (Flechas + Viñetas) -->
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-950/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-md">
                <!-- Flecha Izquierda -->
                <button (click)="prevReto()" class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors cursor-pointer" title="Anterior" aria-label="Anterior">
                  <i-lucide aria-hidden="true" name="chevron-left" class="w-4 h-4"></i-lucide>
                </button>

                <!-- Indicador de Puntos (Dots) -->
                <div class="flex items-center gap-1.5">
                  @for (reto of retosActivos; track $index) {
                    <span class="block h-2 rounded-full transition-all duration-300 cursor-pointer"
                          (click)="currentRetoIndex = $index; resetCarousel()"
                          [ngClass]="$index === currentRetoIndex ? 'bg-amber-400 w-6 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-slate-700 w-2 hover:bg-slate-600'">
                    </span>
                  }
                </div>

                <!-- Flecha Derecha -->
                <button (click)="nextReto()" class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors cursor-pointer" title="Siguiente" aria-label="Siguiente">
                  <i-lucide aria-hidden="true" name="chevron-right" class="w-4 h-4"></i-lucide>
                </button>
              </div>
            }

            <div class="flex items-center gap-3.5 mb-6 relative z-10 mt-1 px-2 md:px-4">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md shrink-0">
                <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <i-lucide aria-hidden="true" name="trophy" class="w-6 h-6 text-amber-400"></i-lucide>
                </div>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h2 class="text-xl md:text-2xl font-extrabold font-outfit text-white tracking-wide">{{ retosActivos[currentRetoIndex].titulo }}</h2>
                </div>
                <p class="text-xs text-amber-300 font-semibold mt-0.5">{{ retosActivos[currentRetoIndex].descripcion }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 flex-1 px-2 md:px-4">
              
              <!-- Detalles del Premio -->
              <div class="bg-gradient-to-b from-slate-800/80 via-slate-800/60 to-slate-900/70 backdrop-blur-sm rounded-2xl p-5 border border-amber-500/30 shadow-md flex flex-col justify-start items-center text-center">
                <i-lucide aria-hidden="true" name="gift" class="w-7 h-7 text-amber-400 mb-2"></i-lucide>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">El Premio</h3>
                <p class="text-base font-extrabold text-amber-300 font-outfit">{{ retosActivos[currentRetoIndex].premio }}</p>
                <div class="w-full h-px bg-slate-700/70 my-3"></div>
                <p class="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5 w-full">
                  <i-lucide aria-hidden="true" name="calendar" class="w-3.5 h-3.5 text-amber-400"></i-lucide>
                  <span>{{ retosActivos[currentRetoIndex].fechaInicio }} a {{ retosActivos[currentRetoIndex].fechaFin }}</span>
                </p>
                <p class="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5 w-full mt-1.5">
                  <i-lucide aria-hidden="true" name="user" class="w-3.5 h-3.5 text-amber-400"></i-lucide>
                  <span>Reto por: <strong class="text-white">{{ retosActivos[currentRetoIndex].creadorNombre || 'Administración' }}</strong></span>
                </p>
              </div>

              <!-- Criterios -->
              <div class="bg-gradient-to-b from-slate-800/80 via-slate-800/60 to-slate-900/70 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/80 shadow-md">
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-easydry-lime">Criterios de Evaluación</span>
                <ul class="mt-2.5 space-y-2 text-xs text-slate-200 font-medium">
                  @for (crit of retosActivos[currentRetoIndex].criterios; track crit) {
                    <li class="flex items-center gap-2">
                      <i-lucide aria-hidden="true" name="check-circle" class="w-3.5 h-3.5 text-easydry-lime shrink-0"></i-lucide>
                      <span class="line-clamp-2 text-slate-200">{{ crit }}</span>
                    </li>
                  }
                  @if (retosActivos[currentRetoIndex].sucursalesIds && retosActivos[currentRetoIndex].sucursalesIds.length > 0) {
                    <li class="flex items-center gap-2 mt-3 text-amber-300 font-bold border-t border-slate-700/70 pt-2">
                      <i-lucide aria-hidden="true" name="map-pin" class="w-3.5 h-3.5 shrink-0 text-amber-400"></i-lucide>
                      <span>Aplica a agencias seleccionadas.</span>
                    </li>
                  } @else {
                    <li class="flex items-center gap-2 mt-3 text-sky-300 font-bold border-t border-slate-700/70 pt-2">
                      <i-lucide aria-hidden="true" name="globe" class="w-3.5 h-3.5 shrink-0 text-sky-400"></i-lucide>
                      <span>Reto Global para toda la Red.</span>
                    </li>
                  }
                </ul>
              </div>

              <!-- Ranking Posiciones (Top 3) integrado -->
              <div class="bg-gradient-to-b from-slate-800/80 via-slate-800/60 to-slate-900/70 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/80 shadow-md flex flex-col">
                <h3 class="font-extrabold text-slate-500 text-xs uppercase tracking-wider mb-3 flex items-center gap-2 font-outfit">
                  <i-lucide aria-hidden="true" name="bar-chart-2" class="w-4 h-4 text-easydry-lime"></i-lucide> Posiciones Actuales
                </h3>
                
                <ul class="space-y-2 overflow-y-auto flex-1">
                  @for (agencia of getRankingParaReto(); track agencia.nombre; let i = $index) {
                    <li class="flex items-center justify-between p-2.5 rounded-xl transition-all" [ngClass]="i === 0 ? 'bg-amber-500/20 border border-amber-400/40 shadow-2xs' : 'bg-slate-900/50 border border-slate-700/50'">
                      <div class="flex items-center gap-2.5">
                        <span class="font-extrabold text-xs font-mono" [ngClass]="i === 0 ? 'text-amber-300' : 'text-slate-500'">#{{i + 1}}</span>
                        <div>
                          <p class="text-xs font-bold text-white line-clamp-1" [title]="agencia.nombre">{{ agencia.nombre }}</p>
                          <p class="text-xs font-medium text-slate-500">{{ agencia.empleados }} empleados</p>
                        </div>
                      </div>
                      <div class="text-right shrink-0">
                        <span class="text-xs font-extrabold font-outfit" [ngClass]="i === 0 ? 'text-amber-300' : 'text-easydry-lime'">{{ agencia.productividad | number:'1.1-1' }}%</span>
                      </div>
                    </li>
                  }
                </ul>
              </div>
            </div>

        </div>
      } @else if (puedeVerRetos) {
        <!-- Estado Vacío -->
        <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center mb-8">
          <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
             <i-lucide aria-hidden="true" name="trophy" class="w-10 h-10 text-slate-300"></i-lucide>
          </div>
          <h3 class="text-xl font-bold font-outfit text-slate-900 mb-2">No hay retos comerciales activos</h3>
          <p class="text-slate-500 text-sm max-w-md mb-6">Crea un nuevo reto para motivar a tu equipo, medir la productividad y recompensar a los mejores.</p>
          @if (canCreateReto) {
            <button (click)="showCrearRetoModal = true" class="btn btn-cta">
              <i-lucide aria-hidden="true" name="plus-circle" class="w-5 h-5"></i-lucide> Crear el Primer Reto
            </button>
          }
        </div>
      }

      @if (showCrearRetoModal) {
        <app-crear-reto-modal (close)="showCrearRetoModal = false" (created)="onRetoCreado($event)"></app-crear-reto-modal>
      }

      <!-- Modal de Confirmación de Eliminación -->
      @if (showDeleteConfirmModal) {
        <div appModalPortal role="dialog" aria-modal="true" aria-labelledby="reto-eliminar-title" class="fixed inset-0 z-[10050] flex items-center justify-center animate-fade-in">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="showDeleteConfirmModal = false"></div>
          
          <!-- Modal Panel -->
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90dvh] flex flex-col transform transition-all scale-100 border border-slate-100">
            <!-- Header Rojo para eliminar -->
            <div class="shrink-0 bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shadow-sm border border-red-200">
                  <i-lucide aria-hidden="true" name="alert-triangle" class="w-5 h-5 text-red-600"></i-lucide>
                </div>
                <h3 id="reto-eliminar-title" class="font-extrabold text-red-900 text-lg">Eliminar Reto</h3>
              </div>
              <button type="button" aria-label="Cerrar" (click)="showDeleteConfirmModal = false" class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center hover:bg-red-100 rounded-full transition-colors text-red-400 hover:text-red-600">
                <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
              </button>
            </div>
            
            <div class="flex-1 min-h-0 overflow-y-auto p-6">
              <p class="text-sm text-slate-600 mb-2">¿Estás seguro que deseas eliminar el reto <span class="font-bold text-slate-800">"{{ retoToDelete?.titulo }}"</span>?</p>
              <p class="text-xs text-red-500 font-medium">Esta acción no se puede deshacer y borrará permanentemente este reto de la plataforma.</p>
            </div>
            
            <div class="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button (click)="showDeleteConfirmModal = false" class="btn btn-secondary">
                Cancelar
              </button>
              <button (click)="confirmarEliminarReto()" class="px-5 py-2 font-bold text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                <i-lucide aria-hidden="true" name="trash-2" class="w-4 h-4"></i-lucide> Eliminar
              </button>
            </div>
          </div>
        </div>
      }

      @if (puedeVerProductividad) {
      <!-- Filtros Completos (Punto 15: Agencia, Servicio, Operador, Fechas) -->
      <app-filter-bar 
        [showRegion]="true"
        [showSucursal]="true" 
        [showOperador]="true"
        [showServicio]="true"
        [showBahia]="false"
        [showEstado]="false"
        [showCliente]="true"
        [showFechas]="true"
        (filterChange)="aplicarFiltros($event)">
      </app-filter-bar>

      <!-- Rankings Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Ranking Agencias -->
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry">
          <div class="flex items-center justify-between mb-5 px-6">
            <h3 class="font-bold text-slate-900 text-lg font-outfit flex items-center gap-2">
              <i-lucide aria-hidden="true" name="building-2" class="w-5 h-5 text-easydry-blue"></i-lucide>
              <span>Ranking de Agencias por Productividad</span>
            </h3>
            <span class="text-xs text-slate-500 font-semibold">{{ periodoActual }}</span>
          </div>

          <div class="space-y-4">
            @for (agencia of agencias; track agencia.id) {
              <div class="p-4 border border-slate-100 rounded-xl hover:border-easydry-blue/40 transition-all flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div 
                    class="w-10 h-10 rounded-xl font-extrabold text-sm flex items-center justify-center"
                    [ngClass]="{
                      'bg-amber-400 text-slate-950 font-outfit shadow-xs': $index === 0,
                      'bg-slate-200 text-slate-800': $index === 1,
                      'bg-amber-700/20 text-amber-800': $index === 2,
                      'bg-slate-100 text-slate-600': $index > 2
                    }">
                    #{{ $index + 1 }}
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-900 text-sm">{{ agencia.nombre }}</h4>
                    <p class="text-xs text-slate-500">{{ agencia.ciudad }} • {{ agencia.empleados }} Empleados</p>
                  </div>
                </div>

                <div class="text-right">
                  <span class="text-base font-extrabold text-easydry-blue font-outfit">{{ agencia.productividad }}%</span>
                  <p class="text-xs text-slate-500">Eficiencia Operativa</p>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Ranking Empleados -->
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry">
          <div class="flex items-center justify-between mb-5 px-6">
            <h3 class="font-bold text-slate-900 text-lg font-outfit flex items-center gap-2">
              <i-lucide aria-hidden="true" name="users" class="w-5 h-5 text-easydry-blue"></i-lucide>
              <span>Ranking de Personal Operativo</span>
            </h3>
            <span class="text-xs text-slate-500 font-semibold">Destacados</span>
          </div>

          <div class="px-6 py-8 text-center text-sm text-slate-500">
            El ranking de personal se calculará con los servicios registrados en base de datos.
          </div>
        </div>

      </div>

      }

      @if (puedeVerRetos) {
      <!-- Tabla de Retos Comercial & Operativo (Todos los Retos) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden flex flex-col">
        <div class="p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-900 text-lg font-outfit flex items-center gap-2">
              <i-lucide aria-hidden="true" name="trophy" class="w-5 h-5 text-amber-500"></i-lucide>
              <span>Directorio de Retos Empresariales</span>
            </h3>
            <p class="text-slate-500 text-xs mt-0.5">Listado completo de retos activos, inactivos y finalizados en la plataforma.</p>
          </div>
          <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
            Total: <strong class="text-easydry-blue font-extrabold">{{ retosTabla.total }}</strong> retos
          </span>
          <label class="text-xs font-bold text-slate-600 flex items-center gap-2 self-start sm:self-auto">
            <span>Mostrar</span>
            <select
              [(ngModel)]="vigenciaRetos"
              (ngModelChange)="retosTabla.reiniciar()"
              aria-label="Filtrar retos por vigencia"
              class="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-1.5 font-semibold cursor-pointer focus:ring-2 focus:ring-easydry-blue">
              <option value="ACTIVOS">Activos</option>
              <option value="VENCIDOS">Vencidos</option>
              <option value="TODOS">Todos</option>
            </select>
          </label>
        </div>

        <app-data-table
          [serverSide]="true"
          [embebida]="true"
          [columns]="columnasRetos"
          [data]="retosTabla.filas"
          [total]="retosTabla.total"
          [page]="retosTabla.pagina"
          [pageSize]="retosTabla.pageSize"
          [sortField]="retosTabla.sortField"
          [sortOrder]="retosTabla.sortOrder"
          [loading]="retosTabla.cargando"
          [error]="retosTabla.error"
          maxHeight="65vh"
          caption="Directorio de retos"
          searchPlaceholder="Buscar reto por título..."
          emptyTitle="No hay retos que coincidan."
          emptyHint="Prueba con otra vigencia o con otro texto de búsqueda."
          (queryChange)="retosTabla.alCambiar($event)"
          (reintentar)="retosTabla.cargar(true)">

          <ng-template appCell="titulo" let-reto>
            <div class="font-bold text-slate-900 text-xs">{{ reto.titulo }}</div>
            <div class="text-xs text-slate-500 font-medium line-clamp-1">{{ reto.descripcion }}</div>
          </ng-template>

          <ng-template appCell="premio" let-reto>
            <span class="inline-flex items-center gap-1.5 font-extrabold text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <i-lucide aria-hidden="true" name="trophy" class="w-3.5 h-3.5 text-amber-500"></i-lucide>
              <span>{{ reto.premio }}</span>
            </span>
          </ng-template>

          <ng-template appCell="inicio" let-reto>
            <div class="text-xs font-mono text-slate-600">
              <div>{{ reto.fechaInicio }}</div>
              <div class="text-slate-500 text-xs">hasta {{ reto.fechaFin }}</div>
            </div>
          </ng-template>

          <ng-template appCell="regiones" let-reto>
            <span class="text-xs font-semibold text-slate-700">{{ reto.regiones && reto.regiones.length ? reto.regiones.join(', ') : 'Todas' }}</span>
          </ng-template>

          <ng-template appCell="estado" let-reto>
            <span
              class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold inline-block border uppercase"
              [ngClass]="{
                'bg-emerald-50 text-emerald-700 border-emerald-200': (reto.estado || 'ACTIVO').toUpperCase() === 'ACTIVO',
                'bg-slate-100 text-slate-600 border-slate-200': (reto.estado || '').toUpperCase() === 'INACTIVO',
                'bg-amber-50 text-amber-700 border-amber-200': (reto.estado || '').toUpperCase() === 'FINALIZADO'
              }">
              {{ reto.estado || 'ACTIVO' }}
            </span>
          </ng-template>

          <ng-template appCell="acciones" let-reto>
            <div class="flex items-center justify-end gap-1">
              @if (canDeleteReto(reto)) {
                <button
                  type="button"
                  (click)="iniciarEliminarReto(reto)"
                  title="Eliminar Reto"
                  class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" aria-label="Eliminar Reto">
                  <i-lucide aria-hidden="true" name="trash-2" class="w-4 h-4"></i-lucide>
                </button>
              }
            </div>
          </ng-template>
        </app-data-table>
      </div>

      }

      @if (puedeVerProductividad) {
      <!-- Performance Comparison Chart -->
      <app-chart-card 
        title="Productividad por Sucursal"
        subtitle="Indicadores actuales registrados en el sistema"
        type="bar" 
        [data]="comparativaChartData">
      </app-chart-card>

      }

    </div>
  `
})
export class ProductividadComponent implements OnInit, OnDestroy {
  @HostListener('document:keydown.escape')
  cerrarModalEliminarConEsc(): void {
    if (this.showDeleteConfirmModal) this.showDeleteConfirmModal = false;
  }


  readonly periodoActual = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(new Date());
  agencias: Agencia[] = [];
  todasLasAgencias: Agencia[] = [];
  
  /** Directorio de retos: páginas numeradas, búsqueda por título, vigencia y orden en el servidor. */
  vigenciaRetos: 'ACTIVOS' | 'VENCIDOS' | 'TODOS' = 'ACTIVOS';
  readonly columnasRetos: TableColumn[] = [
    { key: 'titulo', label: 'Reto & Descripción', sortable: true, defaultSort: 'asc' },
    { key: 'premio', label: 'Premio' },
    { key: 'inicio', label: 'Vigencia', sortable: true, defaultSort: 'desc' },
    { key: 'regiones', label: 'Región / Sucursal' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
    { key: 'acciones', label: 'Acciones', align: 'right' },
  ];
  readonly retosTabla = new TablaServidor<Reto>((c) => this.retosService.getRetosPagina({ ...c, vigencia: this.vigenciaRetos }));
  retosActivos: Reto[] = [];
  currentRetoIndex = 0;
  showCrearRetoModal = false;
  showDeleteConfirmModal = false;
  retoToDelete: Reto | null = null;
  carouselInterval: any;

  comparativaChartData = {
    labels: [] as string[],
    datasets: [{ label: 'Productividad actual', data: [] as number[], backgroundColor: '#004282' }]
  };

  private agenciaService = inject(AgenciaService);
  public authService = inject(AuthService);
  private sucursalService = inject(SucursalService);
  private retosService = inject(RetosService);
  private toast = inject(ToastService);

  // Permisos: los mismos que exige el servidor en cada endpoint.
  get canCreateReto(): boolean { return this.authService.puede('retos.crear'); }
  get puedeVerRetos(): boolean { return this.authService.puede('retos.ver'); }
  get puedeVerProductividad(): boolean { return this.authService.puede('productividad.ver'); }

  ngOnInit(): void {
    if (this.puedeVerRetos) this.cargarRetos();

    // El ranking de agencias lo calcula y filtra por alcance el servidor.
    if (this.puedeVerProductividad && this.authService.puede('agencias.ver')) {
      this.agenciaService.getAgencias().subscribe(list => {
        this.todasLasAgencias = [...list];
        this.agencias = [...list].sort((a, b) => b.productividad - a.productividad);
        this.actualizarGraficaProductividad();
      });
    }
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    this.retosTabla.destruir();
  }

  cargarRetos() {
    if (!this.puedeVerRetos) return;
    this.retosTabla.refrescar();

    this.retosService.getRetosVisibles().subscribe(retos => {
      this.retosActivos = retos;
      this.currentRetoIndex = 0;
      this.startCarousel();
    });
  }

  startCarousel() {
    this.stopCarousel();
    if (this.retosActivos.length > 1) {
      this.carouselInterval = setInterval(() => {
        this.nextReto(false); // false indica que fue automA?tico
      }, 5000); // 5 segundos
    }
  }

  stopCarousel() {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  resetCarousel() {
    this.startCarousel();
  }

  nextReto(manual = true) {
    if (this.retosActivos.length > 0) {
      this.currentRetoIndex = (this.currentRetoIndex + 1) % this.retosActivos.length;
      if (manual) this.resetCarousel();
    }
  }

  prevReto() {
    if (this.retosActivos.length > 0) {
      this.currentRetoIndex = (this.currentRetoIndex - 1 + this.retosActivos.length) % this.retosActivos.length;
      this.resetCarousel();
    }
  }

  /**
   * Eliminar exige el permiso 'retos.eliminar' y, además, ser el creador del reto o un administrador (el servidor lo valida).
   * Como administrador se toma a quien gestiona usuarios.
   */
  canDeleteReto(reto: Reto): boolean {
    const user = this.authService.getCurrentUser();
    if (!user || !this.authService.puede('retos.eliminar')) return false;
    return String(reto.creadoPorId) === String(user.id) || this.authService.puede('usuarios.gestionar');
  }

  iniciarEliminarReto(reto: Reto) {
    this.retoToDelete = reto;
    this.showDeleteConfirmModal = true;
  }

  confirmarEliminarReto() {
    if (this.retoToDelete) {
      this.retosService.eliminarReto(this.retoToDelete.id).subscribe({
        next: (exito) => {
          if (!exito) {
            this.toast.error('No se pudo eliminar el reto', 'El servidor no confirmó la eliminación.');
            return;
          }
          this.showDeleteConfirmModal = false;
          this.retoToDelete = null;
          this.toast.success('Reto eliminado', 'El reto se eliminó correctamente.');
          this.cargarRetos();
        },
        error: (err) => {
          const m = err?.error?.message;
          this.toast.error('No se pudo eliminar el reto', Array.isArray(m) ? m.join(' ') : (typeof m === 'string' && m ? m : 'El servidor no aceptó la eliminación.'));
        }
      });
    }
  }

  getRankingParaReto(): Agencia[] {
    if (!this.agencias.length) return [];
    
    return [...this.agencias]
      .sort((a, b) => b.productividad - a.productividad)
      .slice(0, 3);
  }

  onRetoCreado(reto: Reto) {
    this.showCrearRetoModal = false;
    this.cargarRetos();
  }

  aplicarFiltros(filtros: FilterState): void {
    let res = [...this.todasLasAgencias];
    if (filtros.sucursal && filtros.sucursal !== 'Todas') {
      res = res.filter(a => a.nombre.toLowerCase().includes(filtros.sucursal.toLowerCase()) ||
                            filtros.sucursal.toLowerCase().includes(a.nombre.toLowerCase()));
    }
    if (filtros.region && filtros.region !== 'Todas') {
      res = res.filter(a => String(a.ciudad || '').trim().toLowerCase() === (filtros.region || '').trim().toLowerCase());
    }
    const fCliente = filtros.cliente || filtros.marca;
    if (fCliente && fCliente !== 'Todas' && fCliente !== 'Todos') {
      res = res.filter(item => {
        const suc = this.sucursalService.getSucursalPorNombre(item.nombre);
        return suc?.clienteNombre === fCliente || suc?.marcaNombre === fCliente || item.clienteNombre === fCliente || item.marcaNombre === fCliente;
      });
    }
    this.agencias = res.sort((a, b) => b.productividad - a.productividad);
    this.actualizarGraficaProductividad();
  }

  private actualizarGraficaProductividad(): void {
    this.comparativaChartData = {
      labels: this.agencias.map(agencia => agencia.nombre),
      datasets: [{
        label: 'Productividad actual',
        data: this.agencias.map(agencia => Number(agencia.productividad || 0)),
        backgroundColor: '#004282'
      }]
    };
  }

}
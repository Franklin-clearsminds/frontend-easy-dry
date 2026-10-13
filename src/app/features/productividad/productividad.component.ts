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
import { DashboardOperativoService } from '../../core/services/dashboard-operativo.service';
import { ToastService } from '../../shared/services/toast.service';
import { FormsModule } from '@angular/forms';
import { DataTableCellDirective, DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { TablaServidor } from '../../core/utils/tabla-servidor';
import {
  ETIQUETA_METRICA,
  ETIQUETA_PARTICIPANTE,
  ETIQUETA_TIPO_SERVICIO,
  FilaRankingReto,
  RankingReto,
  Reto,
  formatearValorReto,
  resumenGanador,
} from '../../core/models/reto.model';

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
                          (click)="seleccionarReto($index)"
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

              <!-- Cómo se juega -->
              <div class="bg-gradient-to-b from-slate-800/80 via-slate-800/60 to-slate-900/70 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/80 shadow-md">
                <span class="text-[11px] font-extrabold uppercase tracking-wider text-easydry-lime">Cómo se juega</span>
                <ul class="mt-2.5 space-y-2 text-xs text-slate-200 font-medium">
                  <li class="flex items-start gap-2">
                    <i-lucide aria-hidden="true" [name]="etiquetaParticipante[retoActual.tipoReto].icono" class="w-3.5 h-3.5 mt-0.5 text-easydry-lime shrink-0"></i-lucide>
                    <span>Compiten: <strong class="text-white">{{ participantesDe(retoActual) }}</strong></span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i-lucide aria-hidden="true" name="car" class="w-3.5 h-3.5 mt-0.5 text-easydry-lime shrink-0"></i-lucide>
                    <span>Cuenta: <strong class="text-white">{{ serviciosDe(retoActual) }}</strong></span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i-lucide aria-hidden="true" name="target" class="w-3.5 h-3.5 mt-0.5 text-easydry-lime shrink-0"></i-lucide>
                    <span>Se mide: <strong class="text-white">{{ etiquetaMetrica[retoActual.metrica].nombre }}</strong></span>
                  </li>
                  <li class="flex items-start gap-2 mt-3 text-amber-300 font-bold border-t border-slate-700/70 pt-2">
                    <i-lucide aria-hidden="true" name="medal" class="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400"></i-lucide>
                    <span>{{ resumenGanador(retoActual) }}. Si empatan, va primero quien llegó antes.</span>
                  </li>
                  <li class="flex items-start gap-2 text-sky-300 font-bold">
                    <i-lucide aria-hidden="true" name="map-pin" class="w-3.5 h-3.5 mt-0.5 shrink-0 text-sky-400"></i-lucide>
                    <span>{{ dondeDe(retoActual) }}</span>
                  </li>
                </ul>
              </div>

              <!-- Ranking Posiciones (Top 3) integrado -->
              <div class="bg-gradient-to-b from-slate-800/80 via-slate-800/60 to-slate-900/70 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/80 shadow-md flex flex-col">
                <h3 class="font-extrabold text-slate-500 text-xs uppercase tracking-wider mb-3 flex items-center gap-2 font-outfit">
                  <i-lucide aria-hidden="true" name="bar-chart-2" class="w-4 h-4 text-easydry-lime"></i-lucide> Posiciones Actuales
                </h3>
                @if (rankingRetoCargando) {
                  <p class="text-xs text-slate-400">Calculando posiciones...</p>
                } @else if (rankingRetoError) {
                  <p role="alert" class="text-xs text-rose-300">{{ rankingRetoError }}</p>
                } @else if (rankingReto && rankingReto.participantes.length) {
                  @if (rankingReto.modoGanador === 'META' && rankingReto.meta) {
                    <p class="text-xs text-slate-400 mb-2">Meta: {{ formatearValor(rankingReto.meta, rankingReto.metrica) }}</p>
                  }
                  <ul class="space-y-1 overflow-y-auto flex-1">
                    @for (fila of rankingReto.participantes.slice(0, 5); track fila.participanteId) {
                      <li class="flex items-center justify-between p-2 rounded-xl transition-all" [ngClass]="fila.gana ? 'bg-amber-500/20 border border-amber-400/40 shadow-2xs' : 'bg-slate-900/50 border border-slate-700/50'">
                        <div class="flex items-center gap-2.5 min-w-0">
                          <span class="font-extrabold text-xs font-mono" [ngClass]="fila.gana ? 'text-amber-300' : 'text-slate-500'">#{{ fila.posicion }}</span>
                          <div class="min-w-0">
                            <p class="text-xs font-bold text-white line-clamp-1" [title]="fila.nombre">{{ fila.nombre }}</p>
                            @if (fila.detalle) {
                              <p class="text-xs text-slate-500">{{ fila.detalle }}</p>
                            }
                            @if (fila.personas?.length) {
                              <p class="text-xs text-slate-300 flex items-center gap-1 mt-0.5" [title]="lavadoresDe(fila, true)">
                                <i-lucide aria-hidden="true" name="user" class="w-3 h-3 shrink-0 text-slate-400"></i-lucide>
                                <span class="line-clamp-1">{{ lavadoresDe(fila) }}</span>
                              </p>
                            }
                          </div>
                        </div>
                        <span class="text-xs font-extrabold font-outfit shrink-0 flex items-center gap-1" [ngClass]="fila.gana ? 'text-amber-300' : 'text-easydry-lime'">
                          @if (fila.gana) { <i-lucide aria-label="Va ganando" name="medal" class="w-3.5 h-3.5"></i-lucide> }
                          {{ formatearValor(fila.valor, rankingReto.metrica) }}
                        </span>
                      </li>
                    }
                  </ul>
                  @if (rankingReto.participantes.length > 5) {
                    <p class="text-xs text-slate-500 mt-2">y {{ rankingReto.participantes.length - 5 }} más.</p>
                  }
                } @else {
                  <p class="text-xs text-slate-400">No hay participantes para este reto.</p>
                }
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

      <!-- Modal de Cierre de Reto -->
      @if (showCerrarModal) {
        <div appModalPortal role="dialog" aria-modal="true" aria-labelledby="reto-cerrar-title" class="fixed inset-0 z-[10050] flex items-center justify-center animate-fade-in">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="showCerrarModal = false"></div>

          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90dvh] flex flex-col transform transition-all scale-100 border border-slate-100">
            <div class="shrink-0 bg-emerald-50 border-b border-emerald-100 px-6 py-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm border border-emerald-200">
                  <i-lucide aria-hidden="true" name="flag" class="w-5 h-5 text-emerald-600"></i-lucide>
                </div>
                <h3 id="reto-cerrar-title" class="font-extrabold text-emerald-900 text-lg">Cerrar Reto</h3>
              </div>
              <button type="button" aria-label="Cerrar" (click)="showCerrarModal = false" class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center hover:bg-emerald-100 rounded-full transition-colors text-emerald-400 hover:text-emerald-600">
                <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
              </button>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              <p class="text-sm text-slate-600">Vas a cerrar ahora el reto <span class="font-bold text-slate-800">"{{ retoToCerrar?.titulo }}"</span>. Esta acción no se puede deshacer.</p>
              <p class="text-xs text-slate-500">El ganador se toma del ranking con los servicios registrados hasta este momento. Si no lo cierras, se cierra solo al terminar su último día.</p>
              <div>
                <label for="reto-cierre-nota" class="block text-xs font-bold text-slate-600 mb-1.5">Nota de cierre</label>
                <textarea id="reto-cierre-nota" [(ngModel)]="cierreResultado" rows="3" placeholder="Detalle del resultado (opcional)" class="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-easydry-blue focus:border-easydry-blue resize-none"></textarea>
              </div>
            </div>

            <div class="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button (click)="showCerrarModal = false" class="btn btn-secondary">
                Cancelar
              </button>
              <button (click)="confirmarCerrarReto()" class="px-5 py-2 font-bold text-sm text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                <i-lucide aria-hidden="true" name="flag" class="w-4 h-4"></i-lucide> Cerrar reto
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

          @if (rankingLavadores.length === 0) {
            <div class="px-6 py-8 text-center text-sm text-slate-500">
              No hay servicios finalizados en el período para calcular el ranking.
            </div>
          } @else {
            <div class="space-y-4">
              @for (lavador of rankingLavadores; track lavador.operadorId) {
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
                      <h4 class="font-bold text-slate-900 text-sm">{{ lavador.nombre }}</h4>
                      <p class="text-xs text-slate-500">{{ lavador.cantidadServicios }} servicios</p>
                    </div>
                  </div>

                  <div class="text-right">
                    <span class="text-base font-extrabold text-easydry-blue font-outfit">{{ formatearTiempo(lavador.tiempoPromedioMin) }}</span>
                    <p class="text-xs text-slate-500">Tiempo promedio</p>
                  </div>
                </div>
              }
            </div>
          }
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
          maxHeight="none"
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
            <span class="text-xs font-bold text-slate-700">{{ participantesDe(reto) }}</span>
            <div class="text-xs text-slate-500">{{ reto.regiones && reto.regiones.length ? reto.regiones.join(', ') : 'Todas' }}</div>
            <div class="text-xs text-slate-500">{{ metricaYGanador(reto) }}</div>
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
            @if (reto.ganadorNombre) {
              <div class="text-xs text-slate-500 font-medium mt-1">{{ reto.ganadores.length > 1 ? 'Ganaron' : 'Ganó' }}: {{ reto.ganadorNombre }}</div>
            }
          </ng-template>

          <ng-template appCell="acciones" let-reto>
            <div class="flex items-center justify-end gap-1">
              @if (canCerrarReto(reto) && (reto.estado || 'ACTIVO').toUpperCase() === 'ACTIVO') {
                <button
                  type="button"
                  (click)="iniciarCerrarReto(reto)"
                  title="Cerrar Reto"
                  class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" aria-label="Cerrar Reto">
                  <i-lucide aria-hidden="true" name="flag" class="w-4 h-4"></i-lucide>
                </button>
              }
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
    { key: 'regiones', label: 'Participantes' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
    { key: 'acciones', label: 'Acciones', align: 'right', sticky: true },
  ];
  readonly retosTabla = new TablaServidor<Reto>((c) => this.retosService.getRetosPagina({ ...c, vigencia: this.vigenciaRetos }));
  retosActivos: Reto[] = [];
  currentRetoIndex = 0;
  rankingReto: RankingReto | null = null;
  rankingRetoCargando = false;
  rankingRetoError = '';
  private rankingRetoConsultados = new Set<string>();
  private rankingRetoPorId = new Map<string, RankingReto>();
  showCrearRetoModal = false;
  showDeleteConfirmModal = false;
  retoToDelete: Reto | null = null;
  showCerrarModal = false;
  retoToCerrar: Reto | null = null;
  cierreResultado = '';
  carouselInterval: any;
  rankingRefreshInterval: any;
  rankingLavadores: any[] = [];

  comparativaChartData = {
    labels: [] as string[],
    datasets: [{ label: 'Productividad actual', data: [] as number[], backgroundColor: '#004282' }]
  };

  private agenciaService = inject(AgenciaService);
  public authService = inject(AuthService);
  private sucursalService = inject(SucursalService);
  private retosService = inject(RetosService);
  private dashboardOperativoService = inject(DashboardOperativoService);
  private toast = inject(ToastService);

  // Permisos: los mismos que exige el servidor en cada endpoint.
  get canCreateReto(): boolean { return this.authService.puede('productividad.retos.crear'); }
  get puedeVerRetos(): boolean { return this.authService.puede('pagina.productividad.retos'); }
  get puedeVerProductividad(): boolean { return this.authService.puede('productividad.ver'); }

  readonly etiquetaParticipante = ETIQUETA_PARTICIPANTE;
  readonly etiquetaMetrica = ETIQUETA_METRICA;
  readonly resumenGanador = resumenGanador;
  readonly formatearValor = formatearValorReto;

  get retoActual(): Reto {
    return this.retosActivos[this.currentRetoIndex];
  }

  /** "Pulidores (4 elegidos)", "Bahías", "Agencias (2 elegidas)". */
  participantesDe(reto: Reto): string {
    const plural = ETIQUETA_PARTICIPANTE[reto.tipoReto].plural;
    const elegidos = reto.tipoReto === 'PULIDOR' ? reto.pulidoresIds.length
      : reto.tipoReto === 'LAVADOR' ? reto.lavadoresIds.length
      : reto.tipoReto === 'AGENCIA' ? reto.sucursalesIds.length
      : 0;
    return elegidos ? `${plural} (${elegidos} elegido${elegidos === 1 ? '' : 's'})` : plural;
  }

  /** "Pedro Mora (2) · Juan Paz (1)" o "Asignado: Luis Vera". Sin `completo`, muestra 2 y "+N". */
  lavadoresDe(fila: FilaRankingReto, completo = false): string {
    const personas = fila.personas || [];
    if (personas.every(p => p.servicios === null)) {
      return `Asignado: ${personas.map(p => p.nombre).join(', ')}`;
    }
    const nombres = personas.map(p => `${p.nombre} (${p.servicios})`);
    if (completo || nombres.length <= 2) return nombres.join(' · ');
    return `${nombres.slice(0, 2).join(' · ')} +${nombres.length - 2}`;
  }

  metricaYGanador(reto: Reto): string {
    return `${ETIQUETA_METRICA[reto.metrica].nombre} · ${resumenGanador(reto)}`;
  }

  serviciosDe(reto: Reto): string {
    return reto.tipoServicios === 'ESPECIFICOS' && reto.catalogoServicioNombres.length
      ? reto.catalogoServicioNombres.join(', ')
      : ETIQUETA_TIPO_SERVICIO[reto.tipoServicios];
  }

  dondeDe(reto: Reto): string {
    const regiones = reto.regiones.filter(r => r.toLowerCase() !== 'todas');
    const marcas = reto.marcas.filter(m => m.toLowerCase() !== 'todas');
    const partes = [regiones.length ? regiones.join(', ') : 'Toda la red', ...marcas];
    if (reto.tipoReto !== 'AGENCIA' && reto.sucursalesIds.length) partes.push(`${reto.sucursalesIds.length} agencia(s)`);
    return partes.join(' · ');
  }

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

    if (this.puedeVerProductividad) {
      this.cargarRankingLavadores();
    }
  }

  cargarRankingLavadores(filtro: { agenciaId?: string; regionId?: string; fechaDesde?: string; fechaHasta?: string } = {}): void {
    this.dashboardOperativoService.getRankingLavadores(filtro).subscribe(data => {
      this.rankingLavadores = data.ranking;
    });
  }

  formatearTiempo(minutos: number): string {
    if (!minutos || minutos <= 0) return 'Sin datos';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    if (this.rankingRefreshInterval) clearInterval(this.rankingRefreshInterval);
    this.retosTabla.destruir();
  }

  cargarRetos() {
    if (!this.puedeVerRetos) return;
    this.retosTabla.refrescar();

    this.retosService.getRetosVisibles().subscribe(retos => {
      this.retosActivos = retos;
      this.currentRetoIndex = 0;
      this.cargarRankingRetoActual();
      this.startCarousel();
      this.startRankingRefresh();
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

  private startRankingRefresh(): void {
    if (this.rankingRefreshInterval) clearInterval(this.rankingRefreshInterval);
    this.rankingRefreshInterval = setInterval(() => {
      const reto = this.retosActivos[this.currentRetoIndex];
      if (!reto || this.rankingRetoCargando) return;
      this.rankingRetoConsultados.delete(reto.id);
      this.rankingRetoPorId.delete(reto.id);
      this.cargarRankingRetoActual();
    }, 60_000);
  }

  resetCarousel() {
    this.startCarousel();
  }

  nextReto(manual = true) {
    if (this.retosActivos.length > 0) {
      this.currentRetoIndex = (this.currentRetoIndex + 1) % this.retosActivos.length;
      this.cargarRankingRetoActual();
      if (manual) this.resetCarousel();
    }
  }

  seleccionarReto(index: number): void {
    this.currentRetoIndex = index;
    this.cargarRankingRetoActual();
    this.resetCarousel();
  }

  prevReto() {
    if (this.retosActivos.length > 0) {
      this.currentRetoIndex = (this.currentRetoIndex - 1 + this.retosActivos.length) % this.retosActivos.length;
      this.cargarRankingRetoActual();
      this.resetCarousel();
    }
  }

  private cargarRankingRetoActual(): void {
    const reto = this.retosActivos[this.currentRetoIndex];
    this.rankingReto = null;
    this.rankingRetoError = '';
    if (!reto) {
      this.rankingRetoCargando = false;
      return;
    }
    const resultadoGuardado = this.rankingRetoPorId.get(reto.id);
    if (resultadoGuardado) {
      this.rankingReto = resultadoGuardado;
      this.rankingRetoCargando = false;
      return;
    }
    if (this.rankingRetoConsultados.has(reto.id)) {
      this.rankingRetoCargando = false;
      this.rankingRetoError = 'No se pudo cargar el ranking del reto.';
      return;
    }

    this.rankingRetoCargando = true;
    this.rankingRetoConsultados.add(reto.id);
    this.retosService.getRankingReto(reto.id).subscribe({
      next: (ranking) => {
        this.rankingRetoPorId.set(reto.id, ranking);
        if (this.retosActivos[this.currentRetoIndex]?.id !== reto.id) return;
        this.rankingReto = ranking;
        this.rankingRetoCargando = false;
      },
      error: () => {
        if (this.retosActivos[this.currentRetoIndex]?.id !== reto.id) return;
        this.rankingRetoCargando = false;
        this.rankingRetoError = 'No se pudo cargar el ranking del reto.';
      },
    });
  }

  /** Cerrar y eliminar exigen su permiso y, además, ser el creador del reto o tener alcance nacional (el servidor lo valida). */
  private esCreadorOGlobal(reto: Reto): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return String(reto.creadoPorId) === String(user.id) || user.ambito === 'GLOBAL' || this.authService.isSuperAdmin();
  }

  canDeleteReto(reto: Reto): boolean {
    return this.authService.puede('productividad.retos.eliminar') && this.esCreadorOGlobal(reto);
  }

  canCerrarReto(reto: Reto): boolean {
    return this.authService.puede('productividad.retos.cerrar') && this.esCreadorOGlobal(reto);
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

  iniciarCerrarReto(reto: Reto) {
    this.retoToCerrar = reto;
    this.cierreResultado = '';
    this.showCerrarModal = true;
  }

  confirmarCerrarReto() {
    if (!this.retoToCerrar) return;
    this.retosService.cerrarReto(this.retoToCerrar.id, {
      resultado: this.cierreResultado.trim() || undefined,
    }).subscribe({
      next: (cerrado) => {
        this.showCerrarModal = false;
        this.retoToCerrar = null;
        this.toast.success('Reto cerrado', cerrado.ganadorNombre ? `Ganador: ${cerrado.ganadorNombre}.` : 'Nadie alcanzó a ganar.');
        this.cargarRetos();
      },
      error: (err) => {
        const m = err?.error?.message;
        this.toast.error('No se pudo cerrar el reto', Array.isArray(m) ? m.join(' ') : (typeof m === 'string' && m ? m : 'El servidor no aceptó el cierre.'));
      }
    });
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

    const agenciaFiltrada = filtros.sucursal && filtros.sucursal !== 'Todas'
      ? this.todasLasAgencias.find(a => a.nombre.toLowerCase() === filtros.sucursal.toLowerCase())
      : undefined;
    this.cargarRankingLavadores({
      agenciaId: agenciaFiltrada ? String(agenciaFiltrada.id) : undefined,
      fechaDesde: filtros.fechaInicio,
      fechaHasta: filtros.fechaFin,
    });
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
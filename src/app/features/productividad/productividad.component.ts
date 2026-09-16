import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
import { Reto } from '../../core/models/reto.model';

@Component({
  selector: 'app-productividad',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ChartCardComponent, FilterBarComponent, CrearRetoModalComponent, ModalPortalDirective],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Top Title Bar -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Métricas de Productividad & Rendimiento</h1>
          <p class="text-slate-500 text-xs mt-1">Monitoreo comparativo de agencias, ranking de personal y desempeño operativo.</p>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 self-start sm:self-auto">
          <span class="px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs">
            <i-lucide name="trophy" class="w-4 h-4 text-amber-600"></i-lucide>
            <span>Reto EasyDry Activo: Edición Julio 2026</span>
          </span>
          @if (canCreateReto && retosActivos.length > 0) {
            <button (click)="showCrearRetoModal = true" class="px-5 py-1.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-900 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              <i-lucide name="plus-circle" class="w-4 h-4"></i-lucide> Crear Nuevo Reto
            </button>
          }
        </div>
      </div>

      <!-- RETO EASYDRY SPECIAL GAMIFIED SECTION -->
      @if (retosActivos.length > 0) {
        <div class="w-full bg-gradient-to-br from-slate-900 via-slate-900 to-zinc-900 rounded-3xl p-6 md:p-8 pb-12 md:pb-14 border border-slate-700/60 shadow-xl relative overflow-hidden flex flex-col mb-8 text-white">
            
            @if (retosActivos.length > 1) {
              <!-- Controles del Carrusel (Flechas + Viñetas) -->
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-md">
                <!-- Flecha Izquierda -->
                <button (click)="prevReto()" class="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer" title="Anterior">
                  <i-lucide name="chevron-left" class="w-4 h-4"></i-lucide>
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
                <button (click)="nextReto()" class="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer" title="Siguiente">
                  <i-lucide name="chevron-right" class="w-4 h-4"></i-lucide>
                </button>
              </div>
            }

            <div class="flex items-center gap-3.5 mb-6 relative z-10 mt-1 px-2 md:px-4">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md shrink-0">
                <div class="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <i-lucide name="trophy" class="w-6 h-6 text-amber-400"></i-lucide>
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
              <div class="bg-gradient-to-b from-slate-800/80 via-slate-800/60 to-slate-900/70 backdrop-blur-md rounded-2xl p-5 border border-amber-500/30 shadow-md flex flex-col justify-start items-center text-center">
                <i-lucide name="gift" class="w-7 h-7 text-amber-400 mb-2"></i-lucide>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">El Premio</h3>
                <p class="text-base font-extrabold text-amber-300 font-outfit">{{ retosActivos[currentRetoIndex].premio }}</p>
                <div class="w-full h-px bg-slate-700/70 my-3"></div>
                <p class="text-[11px] text-slate-300 font-medium flex items-center justify-center gap-1.5 w-full">
                  <i-lucide name="calendar" class="w-3.5 h-3.5 text-amber-400"></i-lucide>
                  <span>{{ retosActivos[currentRetoIndex].fechaInicio }} a {{ retosActivos[currentRetoIndex].fechaFin }}</span>
                </p>
                <p class="text-[11px] text-slate-300 font-medium flex items-center justify-center gap-1.5 w-full mt-1.5">
                  <i-lucide name="user" class="w-3.5 h-3.5 text-amber-400"></i-lucide>
                  <span>Reto por: <strong class="text-white">{{ retosActivos[currentRetoIndex].creadorNombre || 'Administración' }}</strong></span>
                </p>
              </div>

              <!-- Criterios -->
              <div class="bg-gradient-to-b from-slate-800/80 via-slate-800/60 to-slate-900/70 backdrop-blur-md rounded-2xl p-5 border border-slate-700/80 shadow-md">
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-easydry-lime">Criterios de Evaluación</span>
                <ul class="mt-2.5 space-y-2 text-xs text-slate-200 font-medium">
                  @for (crit of retosActivos[currentRetoIndex].criterios; track crit) {
                    <li class="flex items-center gap-2">
                      <i-lucide name="check-circle" class="w-3.5 h-3.5 text-easydry-lime shrink-0"></i-lucide>
                      <span class="line-clamp-2 text-slate-200">{{ crit }}</span>
                    </li>
                  }
                  @if (retosActivos[currentRetoIndex].sucursalesIds && retosActivos[currentRetoIndex].sucursalesIds.length > 0) {
                    <li class="flex items-center gap-2 mt-3 text-amber-300 font-bold border-t border-slate-700/70 pt-2">
                      <i-lucide name="map-pin" class="w-3.5 h-3.5 shrink-0 text-amber-400"></i-lucide>
                      <span>Aplica a agencias seleccionadas.</span>
                    </li>
                  } @else {
                    <li class="flex items-center gap-2 mt-3 text-sky-300 font-bold border-t border-slate-700/70 pt-2">
                      <i-lucide name="globe" class="w-3.5 h-3.5 shrink-0 text-sky-400"></i-lucide>
                      <span>Reto Global para toda la Red.</span>
                    </li>
                  }
                </ul>
              </div>

              <!-- Ranking Posiciones (Top 3) integrado -->
              <div class="bg-gradient-to-b from-slate-800/80 via-slate-800/60 to-slate-900/70 backdrop-blur-md rounded-2xl p-4 border border-slate-700/80 shadow-md flex flex-col">
                <h3 class="font-extrabold text-slate-300 text-xs uppercase tracking-wider mb-3 flex items-center gap-2 font-outfit">
                  <i-lucide name="bar-chart-2" class="w-4 h-4 text-easydry-lime"></i-lucide> Posiciones Actuales
                </h3>
                
                <ul class="space-y-2 overflow-y-auto flex-1">
                  @for (agencia of getRankingParaReto(); track agencia.nombre; let i = $index) {
                    <li class="flex items-center justify-between p-2.5 rounded-xl transition-all" [ngClass]="i === 0 ? 'bg-amber-500/20 border border-amber-400/40 shadow-2xs' : 'bg-slate-900/50 border border-slate-700/50'">
                      <div class="flex items-center gap-2.5">
                        <span class="font-extrabold text-xs font-mono" [ngClass]="i === 0 ? 'text-amber-300' : 'text-slate-400'">#{{i + 1}}</span>
                        <div>
                          <p class="text-xs font-bold text-white line-clamp-1" [title]="agencia.nombre">{{ agencia.nombre }}</p>
                          <p class="text-[10px] font-medium text-slate-400">{{ agencia.empleados }} empleados</p>
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
      } @else {
        <!-- Estado Vacío -->
        <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center mb-8">
          <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
             <i-lucide name="trophy" class="w-10 h-10 text-slate-300"></i-lucide>
          </div>
          <h3 class="text-xl font-bold font-outfit text-slate-900 mb-2">No hay retos comerciales activos</h3>
          <p class="text-slate-500 text-sm max-w-md mb-6">Crea un nuevo reto para motivar a tu equipo, medir la productividad y recompensar a los mejores.</p>
          @if (canCreateReto) {
            <button (click)="showCrearRetoModal = true" class="px-6 py-3 bg-easydry-green hover:bg-easydry-green-dark text-slate-900 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              <i-lucide name="plus-circle" class="w-5 h-5"></i-lucide> Crear el Primer Reto
            </button>
          }
        </div>
      }

      @if (showCrearRetoModal) {
        <app-crear-reto-modal (close)="showCrearRetoModal = false" (created)="onRetoCreado($event)"></app-crear-reto-modal>
      }

      <!-- Modal de Confirmación de Eliminación -->
      @if (showDeleteConfirmModal) {
        <div appModalPortal class="fixed inset-0 z-[10050] flex items-center justify-center animate-fade-in">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="showDeleteConfirmModal = false"></div>
          
          <!-- Modal Panel -->
          <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col transform transition-all scale-100 border border-slate-100">
            <!-- Header Rojo para eliminar -->
            <div class="shrink-0 bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shadow-sm border border-red-200">
                  <i-lucide name="alert-triangle" class="w-5 h-5 text-red-600"></i-lucide>
                </div>
                <h3 class="font-extrabold text-red-900 text-lg">Eliminar Reto</h3>
              </div>
              <button (click)="showDeleteConfirmModal = false" class="p-2 hover:bg-red-100 rounded-full transition-colors text-red-400 hover:text-red-600">
                <i-lucide name="x" class="w-5 h-5"></i-lucide>
              </button>
            </div>
            
            <div class="flex-1 min-h-0 overflow-y-auto p-6">
              <p class="text-sm text-slate-600 mb-2">¿Estás seguro que deseas eliminar el reto <span class="font-bold text-slate-800">"{{ retoToDelete?.titulo }}"</span>?</p>
              <p class="text-xs text-red-500 font-medium">Esta acción no se puede deshacer y borrará permanentemente este reto de la plataforma.</p>
            </div>
            
            <div class="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button (click)="showDeleteConfirmModal = false" class="px-4 py-2 font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button (click)="confirmarEliminarReto()" class="px-5 py-2 font-bold text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm flex items-center gap-2">
                <i-lucide name="trash-2" class="w-4 h-4"></i-lucide> Eliminar
              </button>
            </div>
          </div>
        </div>
      }

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
              <i-lucide name="building-2" class="w-5 h-5 text-easydry-blue"></i-lucide>
              <span>Ranking de Agencias por Productividad</span>
            </h3>
            <span class="text-xs text-slate-400 font-semibold">Julio 2026</span>
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
                  <p class="text-[10px] text-slate-400">Eficiencia Operativa</p>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Ranking Empleados -->
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry">
          <div class="flex items-center justify-between mb-5 px-6">
            <h3 class="font-bold text-slate-900 text-lg font-outfit flex items-center gap-2">
              <i-lucide name="users" class="w-5 h-5 text-easydry-blue"></i-lucide>
              <span>Ranking de Personal Operativo</span>
            </h3>
            <span class="text-xs text-slate-400 font-semibold">Destacados</span>
          </div>

          <div class="space-y-4">
            
            <div class="p-4 border border-slate-100 rounded-xl flex items-center justify-between bg-gradient-to-r from-easydry-blue/5 to-white">
              <div class="flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" alt="Avatar" class="w-10 h-10 rounded-full object-cover border-2 border-easydry-blue">
                <div>
                  <h4 class="font-bold text-slate-900 text-sm">Esteban Torres</h4>
                  <p class="text-xs text-slate-500">Técnico • EasyDry Quito Norte</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-sm font-extrabold text-easydry-blue">68 Lavados</span>
                <p class="text-[10px] text-easydry-blue font-bold">100% Calificación</p>
              </div>
            </div>

            <div class="p-4 border border-slate-100 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80" alt="Avatar" class="w-10 h-10 rounded-full object-cover border-2 border-slate-300">
                <div>
                  <h4 class="font-bold text-slate-900 text-sm">Valeria Paredes</h4>
                  <p class="text-xs text-slate-500">Técnico Detallado • Guayaquil</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-sm font-extrabold text-easydry-blue">62 Lavados</span>
                <p class="text-[10px] text-easydry-blue font-bold">99.2% Calificación</p>
              </div>
            </div>

            <div class="p-4 border border-slate-100 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" alt="Avatar" class="w-10 h-10 rounded-full object-cover border-2 border-slate-300">
                <div>
                  <h4 class="font-bold text-slate-900 text-sm">Mateo Guerrero</h4>
                  <p class="text-xs text-slate-500">Supervisor • Cumbayá</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-sm font-extrabold text-easydry-blue">54 Lavados</span>
                <p class="text-[10px] text-easydry-blue font-bold">98.5% Calificación</p>
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- Tabla de Retos Comercial & Operativo (Todos los Retos) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden flex flex-col">
        <div class="p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-900 text-lg font-outfit flex items-center gap-2">
              <i-lucide name="trophy" class="w-5 h-5 text-amber-500"></i-lucide>
              <span>Directorio de Retos Empresariales</span>
            </h3>
            <p class="text-slate-500 text-xs mt-0.5">Listado completo de retos activos, inactivos y finalizados en la plataforma.</p>
          </div>
          <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
            Total: <strong class="text-easydry-blue font-extrabold">{{ todosLosRetos.length }}</strong> retos registrados
          </span>
        </div>

        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Reto & Descripción</th>
                <th class="py-3.5 px-4">Premio</th>
                <th class="py-3.5 px-4">Vigencia</th>
                <th class="py-3.5 px-4">Región / Sucursal</th>
                <th class="py-3.5 px-4">Estado</th>
                <th class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (reto of todosLosRetos; track reto.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900 text-xs">{{ reto.titulo }}</div>
                    <div class="text-[11px] text-slate-500 font-medium line-clamp-1">{{ reto.descripcion }}</div>
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="font-extrabold text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
                      🏆 {{ reto.premio }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-xs font-mono text-slate-600">
                    <div>{{ reto.fechaInicio }}</div>
                    <div class="text-slate-400 text-[10px]">hasta {{ reto.fechaFin }}</div>
                  </td>
                  <td class="py-3.5 px-4 text-xs font-semibold text-slate-700">
                    <span>{{ reto.regiones && reto.regiones.length ? reto.regiones.join(', ') : 'Todas' }}</span>
                  </td>
                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-block border uppercase"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200': (reto.estado || 'ACTIVO').toUpperCase() === 'ACTIVO',
                        'bg-slate-100 text-slate-600 border-slate-200': (reto.estado || '').toUpperCase() === 'INACTIVO',
                        'bg-amber-50 text-amber-700 border-amber-200': (reto.estado || '').toUpperCase() === 'FINALIZADO'
                      }">
                      {{ reto.estado || 'ACTIVO' }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      @if (canDeleteReto(reto)) {
                        <button 
                          type="button"
                          (click)="iniciarEliminarReto(reto)" 
                          title="Eliminar Reto"
                          class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                          <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Performance Comparison Chart -->
      <app-chart-card 
        title="Comparativa de Crecimiento en Productividad" 
        subtitle="Evolución trimestral por sucursal" 
        type="bar" 
        [data]="comparativaChartData">
      </app-chart-card>

    </div>
  `
})
export class ProductividadComponent implements OnInit, OnDestroy {
  agencias: Agencia[] = [];
  todasLasAgencias: Agencia[] = [];
  
  todosLosRetos: Reto[] = [];
  retosActivos: Reto[] = [];
  currentRetoIndex = 0;
  showCrearRetoModal = false;
  showDeleteConfirmModal = false;
  retoToDelete: Reto | null = null;
  canCreateReto = false;
  carouselInterval: any;

  comparativaChartData = {
    labels: ['Mayo 2026', 'Junio 2026', 'Julio 2026'],
    datasets: [
      { label: 'EasyDry Cumbayá', data: [94, 96, 98.2], backgroundColor: '#9BCB3B' },
      { label: 'EasyDry Quito Norte', data: [92, 94, 96.4], backgroundColor: '#004282' },
      { label: 'EasyDry Guayaquil', data: [90, 92, 94.0], backgroundColor: '#36699B' },
      { label: 'EasyDry Quito Sur', data: [88, 90, 91.8], backgroundColor: '#B2E040' }
    ]
  };

  private agenciaService = inject(AgenciaService);
  public authService = inject(AuthService);
  private sucursalService = inject(SucursalService);
  private retosService = inject(RetosService);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    // Solo Admins y Gerentes pueden crear retos. Coord. Comercial solo visualiza.
    this.canCreateReto = ['SUPER_ADMIN', 'ADMIN', 'GERENTE'].includes(user?.role || '');

    this.cargarRetos();

    this.agenciaService.getAgencias().subscribe(list => {
      let filtered = list;
      if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
        filtered = list.filter(a => a.nombre.toLowerCase() === user.sucursalNombre!.toLowerCase());
      }
      this.todasLasAgencias = [...filtered];
      this.agencias = filtered.sort((a, b) => b.productividad - a.productividad);
    });
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  cargarRetos() {
    this.retosService.getAllRetos().subscribe(todos => {
      this.todosLosRetos = todos;
    });

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

  canDeleteReto(reto: Reto): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    return reto.creadoPorId === user.id;
  }

  iniciarEliminarReto(reto: Reto) {
    this.retoToDelete = reto;
    this.showDeleteConfirmModal = true;
  }

  confirmarEliminarReto() {
    if (this.retoToDelete) {
      this.retosService.eliminarReto(this.retoToDelete.id).subscribe(exito => {
        if (exito) {
          this.showDeleteConfirmModal = false;
          this.retoToDelete = null;
          this.cargarRetos();
        }
      });
    }
  }

  getRankingParaReto(): Agencia[] {
    if (!this.agencias.length) return [];
    
    // Variar determinísticamente las posiciones y porcentajes según el índice del reto
    const offset = this.currentRetoIndex % this.agencias.length;
    let ranking = [...this.agencias];
    
    // Rotar posiciones
    ranking = ranking.slice(offset).concat(ranking.slice(0, offset));
    
    // Variar la productividad un poco para cada reto
    ranking = ranking.map((ag, index) => {
      const modifier = (this.currentRetoIndex * 3.5) - (index * 1.5);
      return {
        ...ag,
        productividad: Math.min(100, Math.max(50, ag.productividad + modifier))
      };
    });

    // Reordenar
    ranking.sort((a, b) => b.productividad - a.productividad);
    return ranking.slice(0, 3);
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
      res = res.filter(a => this.regionDeCiudad(a.ciudad) === filtros.region);
    }
    const fCliente = filtros.cliente || filtros.marca;
    if (fCliente && fCliente !== 'Todas' && fCliente !== 'Todos') {
      res = res.filter(item => {
        const suc = this.sucursalService.getSucursalPorNombre(item.nombre);
        return suc?.clienteNombre === fCliente || suc?.marcaNombre === fCliente || item.clienteNombre === fCliente || item.marcaNombre === fCliente;
      });
    }
    this.agencias = res.sort((a, b) => b.productividad - a.productividad);
  }

  /** Deriva la región a partir de la ciudad de la agencia. */
  private regionDeCiudad(ciudad: string): string {
    const c = (ciudad || '').toLowerCase();
    if (c.includes('quito') || c.includes('cumbaya') || c.includes('cumbayá') || c.includes('sierra')) return 'Sierra';
    if (c.includes('guayaquil') || c.includes('manta') || c.includes('costa') || c.includes('esmeraldas')) return 'Costa';
    if (c.includes('cuenca') || c.includes('austro') || c.includes('loja') || c.includes('ambio')) return 'Austro';
    return 'Costa';
  }
}

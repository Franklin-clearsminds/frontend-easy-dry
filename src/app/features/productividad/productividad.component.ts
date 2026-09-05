import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { CrearRetoModalComponent } from './components/crear-reto-modal.component';
import { AgenciaMockService } from '../../core/services/agencia-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { Agencia } from '../../core/models';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { RetosMockService } from '../../core/services/retos-mock.service';
import { Reto } from '../../core/models/reto.model';

@Component({
  selector: 'app-productividad',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ChartCardComponent, FilterBarComponent, CrearRetoModalComponent],
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
          @if (canCreateReto) {
            <button (click)="showCrearRetoModal = true" class="px-5 py-1.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-900 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm">
              <i-lucide name="plus-circle" class="w-4 h-4"></i-lucide> Crear Nuevo Reto
            </button>
          }
        </div>
      </div>      <!-- RETO EASYDRY SPECIAL GAMIFIED SECTION -->
      @if (retosActivos.length > 0) {
        <div class="w-full bg-gradient-to-r from-easydry-blue-dark via-easydry-blue to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col mb-8">
            
            @if (retosActivos.length > 1) {
              <!-- Flecha Izquierda -->
              <button (click)="prevReto()" class="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors backdrop-blur-md shadow-lg">
                <i-lucide name="chevron-left" class="w-6 h-6 text-white"></i-lucide>
              </button>
              
              <!-- Flecha Derecha -->
              <button (click)="nextReto()" class="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors backdrop-blur-md shadow-lg">
                <i-lucide name="chevron-right" class="w-6 h-6 text-white"></i-lucide>
              </button>

              <!-- Indicador Numérico -->
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                {{ currentRetoIndex + 1 }} / {{ retosActivos.length }}
              </div>
            }

            <div class="flex items-center gap-3 mb-6 relative z-10 mt-2 px-6 md:px-10">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-easydry-lime p-0.5 shadow-glow-green shrink-0">
                <div class="w-full h-full bg-easydry-blue-deep rounded-[14px] flex items-center justify-center">
                  <i-lucide name="trophy" class="w-7 h-7 text-amber-300"></i-lucide>
                </div>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h2 class="text-xl md:text-2xl font-extrabold font-outfit text-white tracking-wide">{{ retosActivos[currentRetoIndex].titulo }}</h2>
                  @if (canDeleteReto(retosActivos[currentRetoIndex])) {
                    <button (click)="iniciarEliminarReto(retosActivos[currentRetoIndex])" class="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 transition-colors" title="Eliminar Reto">
                      <i-lucide name="trash-2" class="w-4 h-4 text-red-200"></i-lucide>
                    </button>
                  }
                </div>
                <p class="text-xs text-easydry-lime font-medium mt-0.5">{{ retosActivos[currentRetoIndex].descripcion }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 flex-1 px-6 md:px-10">
              
              <!-- Detalles del Premio -->
              <div class="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 flex flex-col justify-start items-center text-center">
                <i-lucide name="gift" class="w-8 h-8 text-amber-300 mb-2"></i-lucide>
                <h3 class="text-sm font-bold font-outfit text-white mb-1">El Premio</h3>
                <p class="text-lg font-extrabold text-easydry-lime">{{ retosActivos[currentRetoIndex].premio }}</p>
                <div class="w-full h-px bg-white/10 my-3"></div>
                <p class="text-[10px] text-slate-300 flex items-center justify-center gap-1.5 w-full">
                  <i-lucide name="calendar" class="w-3 h-3"></i-lucide>
                  <span>{{ retosActivos[currentRetoIndex].fechaInicio }} a {{ retosActivos[currentRetoIndex].fechaFin }}</span>
                </p>
                <p class="text-[10px] text-slate-300 flex items-center justify-center gap-1.5 w-full mt-1.5">
                  <i-lucide name="user" class="w-3 h-3"></i-lucide>
                  <span>Reto por: <span class="font-bold text-white">{{ retosActivos[currentRetoIndex].creadorNombre || 'Administración' }}</span></span>
                </p>
              </div>

              <!-- Criterios -->
              <div class="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15">
                <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">Criterios de Evaluación</span>
                <ul class="mt-2 space-y-1.5 text-xs text-slate-200">
                  @for (crit of retosActivos[currentRetoIndex].criterios; track crit) {
                    <li class="flex items-center gap-2">
                      <i-lucide name="check" class="w-3.5 h-3.5 text-easydry-lime shrink-0"></i-lucide>
                      <span class="line-clamp-2">{{ crit }}</span>
                    </li>
                  }
                  @if (retosActivos[currentRetoIndex].sucursalesIds && retosActivos[currentRetoIndex].sucursalesIds.length > 0) {
                    <li class="flex items-center gap-2 mt-3 text-amber-300 border-t border-white/10 pt-2">
                      <i-lucide name="map-pin" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                      <span>Aplica a agencias seleccionadas.</span>
                    </li>
                  } @else {
                    <li class="flex items-center gap-2 mt-3 text-easydry-lime border-t border-white/10 pt-2">
                      <i-lucide name="globe" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                      <span>Reto Global para toda la Red.</span>
                    </li>
                  }
                </ul>
              </div>

              <!-- Ranking Posiciones (Top 3) integrado -->
              <div class="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col">
                <h3 class="font-bold text-easydry-lime text-xs uppercase tracking-widest mb-3 flex items-center gap-2 font-outfit">
                  <i-lucide name="bar-chart-2" class="w-4 h-4"></i-lucide> Posiciones Actuales
                </h3>
                
                <ul class="space-y-2 overflow-y-auto flex-1">
                  @for (agencia of getRankingParaReto(); track agencia.nombre; let i = $index) {
                    <li class="flex items-center justify-between p-2.5 rounded-xl transition-all" [ngClass]="i === 0 ? 'bg-amber-400/20 border border-amber-300/30' : 'bg-white/5'">
                      <div class="flex items-center gap-2.5">
                        <span class="font-extrabold text-sm" [ngClass]="i === 0 ? 'text-amber-300' : 'text-slate-300'">#{{i + 1}}</span>
                        <div>
                          <p class="text-xs font-bold text-white line-clamp-1" [title]="agencia.nombre">{{ agencia.nombre }}</p>
                          <p class="text-[9px] font-medium text-slate-300">{{ agencia.empleados }} empleados</p>
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
        <div class="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="showDeleteConfirmModal = false"></div>
          
          <!-- Modal Panel -->
          <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all scale-100 border border-slate-100">
            <!-- Header Rojo para eliminar -->
            <div class="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
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
            
            <div class="p-6">
              <p class="text-sm text-slate-600 mb-2">¿Estás seguro que deseas eliminar el reto <span class="font-bold text-slate-800">"{{ retoToDelete?.titulo }}"</span>?</p>
              <p class="text-xs text-red-500 font-medium">Esta acción no se puede deshacer y borrará permanentemente este reto de la plataforma.</p>
            </div>
            
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
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
        [showMarca]="true"
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
                  <span class="text-base font-extrabold text-easydry-green-dark font-outfit">{{ agencia.productividad }}%</span>
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
            
            <div class="p-4 border border-slate-100 rounded-xl flex items-center justify-between bg-gradient-to-r from-easydry-green/10 to-white">
              <div class="flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" alt="Avatar" class="w-10 h-10 rounded-full object-cover border-2 border-easydry-green">
                <div>
                  <h4 class="font-bold text-slate-900 text-sm">Esteban Torres</h4>
                  <p class="text-xs text-slate-500">Técnico • EasyDry Quito Norte</p>
                </div>
              </div>
              <div class="text-right">
                <span class="text-sm font-extrabold text-easydry-blue">68 Lavados</span>
                <p class="text-[10px] text-easydry-green-dark font-bold">100% Calificación</p>
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
                <p class="text-[10px] text-easydry-green-dark font-bold">99.2% Calificación</p>
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
                <p class="text-[10px] text-easydry-green-dark font-bold">98.5% Calificación</p>
              </div>
            </div>

          </div>
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

  private agenciaService = inject(AgenciaMockService);
  public authService = inject(AuthService);
  private sucursalService = inject(SucursalMockService);
  private retosService = inject(RetosMockService);

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
    if (filtros.marca && filtros.marca !== 'Todas') {
      res = res.filter(item => {
        const suc = this.sucursalService.getSucursalPorNombre(item.nombre);
        return suc?.marcaNombre === filtros.marca;
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

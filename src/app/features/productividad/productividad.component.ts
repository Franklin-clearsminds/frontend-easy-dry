import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { AgenciaMockService } from '../../core/services/agencia-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { Agencia } from '../../core/models';

@Component({
  selector: 'app-productividad',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ChartCardComponent, FilterBarComponent],
  template: `
    <div class="space-y-8 animate-fade-in">
      
      <!-- Top Title Bar -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Métricas de Productividad & Rendimiento</h1>
          <p class="text-slate-500 text-xs mt-1">Monitoreo comparativo de agencias, ranking de personal y desempeño operativo.</p>
        </div>
        <span class="px-3.5 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-auto shadow-xs">
          <i-lucide name="trophy" class="w-4 h-4 text-amber-600"></i-lucide>
          <span>Reto EasyDry Activo: Edición Julio 2026</span>
        </span>
      </div>

      <!-- Filtros Completos (Punto 15: Agencia, Servicio, Operador, Fechas) -->
      <app-filter-bar 
        [showSucursal]="true" 
        [showOperador]="true"
        [showServicio]="true"
        [showBahia]="false"
        [showEstado]="false"
        [showFechas]="true"
        (filterChange)="aplicarFiltros($event)">
      </app-filter-bar>

      <!-- RETO EASYDRY SPECIAL GAMIFIED SECTION -->
      <div class="bg-gradient-to-r from-easydry-blue-dark via-easydry-blue to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        
        <!-- Top Trophy Header -->
        <div class="flex items-center gap-3 mb-6 relative z-10">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-easydry-lime p-0.5 shadow-glow-green">
            <div class="w-full h-full bg-easydry-blue-deep rounded-[14px] flex items-center justify-center">
              <i-lucide name="trophy" class="w-7 h-7 text-amber-300"></i-lucide>
            </div>
          </div>
          <div>
            <h2 class="text-2xl font-extrabold font-outfit text-white tracking-wide">Reto EasyDry - "Cero Reclamos & Máximo Rendimiento"</h2>
            <p class="text-xs text-easydry-lime font-medium">Competencia mensual entre agencias y técnicos especialistas</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          
          <!-- Winner Agency -->
          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 flex flex-col justify-between">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-300/30">Líder Actual Agencias</span>
              <h3 class="text-xl font-bold font-outfit mt-3">EasyDry Cumbayá</h3>
              <p class="text-xs text-slate-300 mt-1">210 Lavados Completos • 0 Incidencias</p>
            </div>
            <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span class="text-slate-300">Premio: Bonificación Equipo</span>
              <span class="font-extrabold text-easydry-lime">98.2% Puntos</span>
            </div>
          </div>

          <!-- Winner Technician -->
          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 flex flex-col justify-between">
            <div>
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-easydry-lime bg-easydry-green/20 px-2.5 py-1 rounded-full border border-easydry-green/30">Top Técnico del Mes</span>
              <h3 class="text-xl font-bold font-outfit mt-3">Esteban Torres</h3>
              <p class="text-xs text-slate-300 mt-1">Especialista en Recubrimiento Cerámico</p>
            </div>
            <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span class="text-slate-300">42 Tratamientos Cerámicos</span>
              <span class="font-extrabold text-easydry-lime flex items-center gap-1">
                <i-lucide name="star" class="w-3.5 h-3.5 fill-easydry-lime text-easydry-lime"></i-lucide>
                <span>5.0 Rating</span>
              </span>
            </div>
          </div>

          <!-- Challenge Criteria -->
          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15">
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">Criterios de Evaluación</span>
            <ul class="mt-3 space-y-2 text-xs text-slate-200">
              <li class="flex items-center gap-2">
                <i-lucide name="check" class="w-4 h-4 text-easydry-lime"></i-lucide>
                <span>Velocidad promedio &lt; 40 min / auto</span>
              </li>
              <li class="flex items-center gap-2">
                <i-lucide name="check" class="w-4 h-4 text-easydry-lime"></i-lucide>
                <span>Fotos y videos aprobados 100%</span>
              </li>
              <li class="flex items-center gap-2">
                <i-lucide name="check" class="w-4 h-4 text-easydry-lime"></i-lucide>
                <span>Cero incidentes técnicos registrados</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      <!-- Rankings Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Ranking Agencias -->
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry">
          <div class="flex items-center justify-between mb-5">
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
          <div class="flex items-center justify-between mb-5">
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
export class ProductividadComponent implements OnInit {
  agencias: Agencia[] = [];
  todasLasAgencias: Agencia[] = [];

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

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.agenciaService.getAgencias().subscribe(list => {
      let filtered = list;
      if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
        filtered = list.filter(a => a.nombre.toLowerCase() === user.sucursalNombre!.toLowerCase());
      }
      this.todasLasAgencias = [...filtered];
      this.agencias = filtered.sort((a, b) => b.productividad - a.productividad);
    });
  }

  aplicarFiltros(filtros: FilterState): void {
    let res = [...this.todasLasAgencias];
    if (filtros.sucursal && filtros.sucursal !== 'Todas') {
      res = res.filter(a => a.nombre.toLowerCase().includes(filtros.sucursal.toLowerCase()) ||
                            filtros.sucursal.toLowerCase().includes(a.nombre.toLowerCase()));
    }
    this.agencias = res.sort((a, b) => b.productividad - a.productividad);
  }
}

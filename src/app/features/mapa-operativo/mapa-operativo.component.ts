import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { BahiaMockService } from '../../core/services/bahia-mock.service';
import { Sucursal, Bahia } from '../../core/models';

@Component({
  selector: 'app-mapa-operativo',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="bg-gradient-to-r from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-green/20 text-easydry-lime border border-easydry-green/40 text-xs font-bold mb-2">
            <i-lucide name="sliders" class="w-3.5 h-3.5"></i-lucide>
            <span>Estructura Jerárquica Operativa</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold font-outfit">Mapa Operativo en Tiempo Real</h1>
          <p class="text-slate-300 text-xs mt-1">Trazabilidad visual: Sucursal &rarr; Bahía &rarr; Operador &rarr; Maquinaria Asignada</p>
        </div>

        <div class="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10 text-xs font-semibold">
          <span class="w-2.5 h-2.5 rounded-full bg-easydry-green animate-pulse"></span>
          <span>Red Operativa Sincronizada</span>
        </div>
      </div>

      <!-- Sucursal Selector Filter -->
      <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-slate-700">Filtrar por Sucursal:</span>
          <select [(ngModel)]="sucursalFiltro" class="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3.5 py-2 text-easydry-blue">
            <option value="Todas">Mostrar Todas las Sucursales</option>
            @for (s of sucursales; track s.id) {
              <option [value]="s.nombre">{{ s.nombre }}</option>
            }
          </select>
        </div>

        <div class="flex items-center gap-4 text-xs font-bold">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-easydry-green"></span> Ocupada</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-amber-400"></span> Disponible</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-rose-500"></span> Mantenimiento</span>
        </div>
      </div>

      <!-- OPERATIONAL MAP TREE CARDS -->
      <div class="space-y-8">
        @for (suc of sucursalesFiltradas; track suc.id) {
          <div class="bg-white rounded-3xl border border-slate-200 shadow-easydry p-6 space-y-6">
            
            <!-- Level 1: SUCURSAL NODE -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-easydry-blue text-white flex items-center justify-center font-bold shadow-xs">
                  <i-lucide name="building-2" class="w-6 h-6"></i-lucide>
                </div>
                <div>
                  <h2 class="text-xl font-extrabold text-slate-900 font-outfit">{{ suc.nombre }}</h2>
                  <p class="text-xs text-slate-500 font-semibold">{{ suc.ciudad }} • {{ suc.direccion }} • Responsable: <strong>{{ suc.responsable }}</strong></p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="px-3 py-1 bg-slate-100 font-bold text-slate-800 text-xs rounded-xl border border-slate-200">
                  {{ suc.cantidadBahias }} Bahías de Lavado
                </span>
              </div>
            </div>

            <!-- Level 2 & 3 & 4: BAHÍAS -> OPERADOR -> MAQUINARIA NODES -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              @for (b of getBahiasPorSucursal(suc.id); track b.id) {
                <div 
                  class="rounded-2xl border p-5 flex flex-col justify-between space-y-4 relative overflow-hidden transition-all duration-300"
                  [ngClass]="{
                    'bg-slate-50/80 border-easydry-green/50 shadow-xs': b.estado === 'Ocupada',
                    'bg-white border-slate-200': b.estado === 'Disponible',
                    'bg-rose-50/50 border-rose-200': b.estado === 'Mantenimiento'
                  }">
                  
                  <!-- Top accent bar -->
                  <div 
                    class="absolute top-0 left-0 right-0 h-1.5"
                    [ngClass]="{
                      'bg-easydry-green': b.estado === 'Ocupada',
                      'bg-amber-400': b.estado === 'Disponible',
                      'bg-rose-500': b.estado === 'Mantenimiento'
                    }">
                  </div>

                  <div>
                    <!-- Bahía Header -->
                    <div class="flex items-center justify-between mb-3">
                      <span class="font-mono font-extrabold text-xs text-easydry-blue bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
                        {{ b.codigo }}
                      </span>
                      <span 
                        class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold"
                        [ngClass]="{
                          'bg-easydry-green/20 text-easydry-green-dark': b.estado === 'Ocupada',
                          'bg-amber-100 text-amber-800': b.estado === 'Disponible',
                          'bg-rose-100 text-rose-800': b.estado === 'Mantenimiento'
                        }">
                        {{ b.estado }}
                      </span>
                    </div>

                    <h3 class="font-bold text-slate-900 text-sm font-outfit mb-3">{{ b.nombre }}</h3>

                    <!-- Level 3: Operador Node -->
                    <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1 mb-3">
                      <div class="flex items-center justify-between">
                        <span class="text-[10px] text-slate-400 font-extrabold uppercase">Operador Asignado:</span>
                        <i-lucide name="user-check" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                      </div>
                      <p class="font-extrabold text-slate-900 text-xs leading-tight">
                        {{ b.operadorAsignado || 'Sin Operador Asignado' }}
                      </p>
                    </div>

                    <!-- Level 4: Maquinaria Node -->
                    <div class="space-y-1.5">
                      <span class="text-[10px] text-slate-400 font-extrabold uppercase">Equipos en Servicio:</span>
                      <div class="space-y-1">
                        @for (m of b.maquinariaAsignada || []; track m) {
                          <div class="p-2 bg-white rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-800 flex items-center gap-1.5 shadow-2xs">
                            <i-lucide name="hard-drive" class="w-3.5 h-3.5 text-easydry-green-dark flex-shrink-0"></i-lucide>
                            <span class="truncate">{{ m }}</span>
                          </div>
                        }
                      </div>
                    </div>

                  </div>

                </div>
              }
            </div>

          </div>
        }
      </div>

    </div>
  `
})
export class MapaOperativoComponent implements OnInit {
  sucursales: Sucursal[] = [];
  bahias: Bahia[] = [];
  sucursalFiltro = 'Todas';

  private sucursalService = inject(SucursalMockService);
  private bahiaService = inject(BahiaMockService);

  ngOnInit(): void {
    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });

    this.bahiaService.getBahias().subscribe(list => {
      this.bahias = list;
    });
  }

  get sucursalesFiltradas() {
    if (this.sucursalFiltro === 'Todas') {
      return this.sucursales;
    }
    return this.sucursales.filter(s => s.nombre === this.sucursalFiltro);
  }

  getBahiasPorSucursal(sucursalId: number) {
    return this.bahias.filter(b => b.sucursalId === sucursalId);
  }
}

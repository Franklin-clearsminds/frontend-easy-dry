import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OperadorMockService } from '../../core/services/operador-mock.service';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { Operador, HistorialAsignacionOperador, Sucursal } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ToastService } from '../../shared/services/toast.service';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-operadores',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Directorio de Operadores de Bahía</h1>
          <p class="text-slate-500 text-xs mt-1">Control del personal técnico asignado a bahías de lavado, trazabilidad de sucursales e historial de movimientos.</p>
        </div>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="isSuperAdmin" 
        [showOperador]="false"
        [showBahia]="true"
        [showEstado]="true"
        [showFechas]="false"
        [listaEstados]="['Todos', 'Activo', 'Inactivo', 'En Capacitación']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Filters Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4 mb-4">
        
        <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div class="relative flex-1 min-w-[200px]">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <i-lucide name="search" class="w-4 h-4"></i-lucide>
            </span>
            <input 
              type="text" 
              [(ngModel)]="filtroTexto" 
              (input)="aplicarFiltros()"
              placeholder="Buscar por nombre o cédula..." 
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
          </div>
        </div>

        <div class="text-xs font-semibold text-slate-500">
          Operadores: <strong class="text-easydry-blue">{{ operadoresFiltrados.length }} Técnicos</strong>
        </div>

      </div>

      <!-- Operadores Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Operador</th>
                <th class="py-3.5 px-4">Cédula</th>
                <th class="py-3.5 px-4">Sucursal Asignada</th>
                <th class="py-3.5 px-4">Bahía Actual</th>
                <th class="py-3.5 px-4">Fecha Asignación</th>
                <th class="py-3.5 px-4">Productividad</th>
                <th class="py-3.5 px-4">Estado</th>
                <th class="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (op of paginatedOperadores; track op.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      <img [src]="op.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'" alt="Avatar" class="w-9 h-9 rounded-full object-cover border-2 border-easydry-green">
                      <div>
                        <p class="font-bold text-slate-900 text-xs">{{ op.nombre }}</p>
                        <p class="text-[10px] text-easydry-blue font-semibold">{{ op.rol }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 font-mono text-xs text-slate-600">
                    {{ op.cedula }}
                  </td>
                  <td class="py-3.5 px-4 text-xs font-bold text-slate-800">
                    {{ op.sucursal }}
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-lg bg-easydry-blue/10 text-easydry-blue font-bold text-xs">
                      {{ op.bahia }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-xs font-mono text-slate-500">
                    {{ op.fechaAsignacion }}
                  </td>
                  <td class="py-3.5 px-4">
                    <div class="text-xs">
                      <span class="font-extrabold text-easydry-green-dark">{{ op.vehiculosAtendidos }} Vehículos</span>
                      <p class="text-[10px] text-slate-400">Prom: {{ op.promedioDiario }}/día</p>
                    </div>
                  </td>
                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2.5 py-1 rounded-full text-xs font-bold"
                      [ngClass]="op.estado === 'Activo' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-slate-200 text-slate-700'">
                      {{ op.estado }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <button 
                      (click)="verFichaOperador(op)" 
                      class="px-3 py-1.5 bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 font-bold rounded-lg text-xs transition-colors">
                      Ver Historial & Ficha
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <app-pagination 
          [totalItems]="operadoresFiltrados.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal Ficha de Operador -->
      <app-modal 
        [isOpen]="modalFichaOpen" 
        [title]="'Ficha de Operador: ' + (operadorSeleccionado?.nombre || '')" 
        icon="users"
        (close)="modalFichaOpen = false">
        
        @if (operadorSeleccionado) {
          <div class="space-y-6">
            
            <!-- Operator Profile Banner -->
            <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <img [src]="operadorSeleccionado.avatar" alt="Avatar" class="w-14 h-14 rounded-full object-cover border-2 border-easydry-green">
              <div>
                <h3 class="font-extrabold text-slate-900 text-lg font-outfit">{{ operadorSeleccionado.nombre }}</h3>
                <p class="text-xs text-slate-500">Cédula: <strong>{{ operadorSeleccionado.cedula }}</strong> • Correo: <strong>{{ operadorSeleccionado.email }}</strong></p>
                <p class="text-xs text-easydry-blue font-bold mt-1">Ubicación Actual: {{ operadorSeleccionado.sucursal }} ({{ operadorSeleccionado.bahia }})</p>
              </div>
            </div>

            <!-- Productivity Stats Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Vehículos Atendidos</span>
                <span class="font-extrabold text-slate-900 text-base mt-0.5 block">{{ operadorSeleccionado.vehiculosAtendidos }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Servicios Realizados</span>
                <span class="font-extrabold text-easydry-blue text-base mt-0.5 block">{{ operadorSeleccionado.serviciosRealizados }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Promedio Diario</span>
                <span class="font-extrabold text-easydry-green-dark text-base mt-0.5 block">{{ operadorSeleccionado.promedioDiario }}/día</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Ranking Operativo</span>
                <span class="font-extrabold text-amber-600 text-base mt-0.5 block">#{{ operadorSeleccionado.ranking }}</span>
              </div>
            </div>

            <!-- Assignment History Log -->
            <div class="border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider">Historial de Asignaciones a Sucursales & Bahías</h4>
              
              <div class="space-y-2">
                @for (h of historialOperador; track h.id) {
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p class="font-bold text-slate-900">{{ h.sucursal }} — {{ h.bahia }}</p>
                      <p class="text-[11px] text-slate-500">Motivo: {{ h.motivo }} • Autorizado por: {{ h.realizadoPor }}</p>
                    </div>
                    <div class="text-right font-mono font-semibold text-slate-600">
                      <span>{{ h.fechaInicio }}</span>
                      @if (h.fechaFin) {
                        <span> &rarr; {{ h.fechaFin }}</span>
                      } @else {
                        <span class="text-easydry-green-dark font-bold"> (Actual)</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

          </div>
        }

        <div modal-footer>
          <button (click)="modalFichaOpen = false" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs">
            Cerrar Ficha
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class OperadoresComponent implements OnInit {
  operadores: Operador[] = [];
  sucursales: Sucursal[] = [];
  operadorSeleccionado?: Operador;
  historialOperador: HistorialAsignacionOperador[] = [];

  filtroTexto = '';
  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    this.currentPage = 1;
  }

  currentPage = 1;
  pageSize = 5;

  modalFichaOpen = false;

  private operadorService = inject(OperadorMockService);
  private sucursalService = inject(SucursalMockService);
  public authService = inject(AuthService);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.operadorService.getOperadores().subscribe(list => {
      this.operadores = list;
    });

    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
  }

  get isSuperAdmin() {
    return this.authService.isAdmin();
  }

  get userSucursal() {
    return this.authService.getCurrentUser()?.sucursalNombre;
  }

  get operadoresFiltrados() {
    let resultados = this.operadores.filter(op => {
      // ── Scope por Rol ──
      let matchScope = true;
      if (!this.isSuperAdmin && this.userSucursal) {
        matchScope = op.sucursal === this.userSucursal;
      }
      
      const term = this.filtroTexto.toLowerCase();
      const matchTexto = op.nombre.toLowerCase().includes(term) || op.cedula.toLowerCase().includes(term);

      return matchScope && matchTexto;
    });

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(op => op.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(op => op.sucursal === this.filtrosGlobales.sucursal);
    }
    if (this.filtrosGlobales.bahia !== 'Todas') {
      resultados = resultados.filter(op => op.bahia === this.filtrosGlobales.bahia);
    }

    return resultados;
  }

  get paginatedOperadores() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.operadoresFiltrados.slice(start, end);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  verFichaOperador(op: Operador) {
    this.operadorSeleccionado = op;
    this.operadorService.getHistorialPorOperador(op.id).subscribe(h => {
      this.historialOperador = h;
      this.modalFichaOpen = true;
    });
  }
}

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
          <div class="flex items-center gap-2.5">
            <span class="p-2 rounded-xl bg-easydry-blue/10 text-easydry-blue">
              <i-lucide name="user-check" class="w-5 h-5"></i-lucide>
            </span>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Gestión Unificada de Operadores</h1>
          </div>
          <p class="text-slate-500 text-xs mt-1">Directorio de personal técnico, asignación y cambio de bahías, productividad y trazabilidad histórica.</p>
        </div>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="isSuperAdmin" 
        [showOperador]="false"
        [showBahia]="true"
        [showMarca]="true"
        [showEstado]="true"
        [showFechas]="false"
        [listaEstados]="['Todos', 'Activo', 'Inactivo']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Search and Counter Toolbar -->
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
              placeholder="Buscar por nombre, cédula o agencia..." 
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-easydry-blue">
          </div>
        </div>

        <div class="text-xs font-bold text-slate-500">
          Operadores: <strong class="text-easydry-blue">{{ operadoresFiltrados.length }} Técnicos</strong>
        </div>

      </div>

      <!-- Loader / Skeleton mientras cargan los datos -->
      @if (cargando) {
        <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-10 flex flex-col items-center justify-center gap-3">
          <div class="w-10 h-10 border-4 border-easydry-blue border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs font-bold text-slate-500">Cargando operadores...</p>
        </div>
      }

      <!-- Operadores Table (Punto 4) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Operador</th>
                <th class="py-3.5 px-4">Rol</th>
                <th class="py-3.5 px-4">Estado</th>
                <th class="py-3.5 px-4">Agencia Asignada</th>
                <th class="py-3.5 px-4">Bahía Asignada</th>
                <th class="py-3.5 px-4">Productividad</th>
                <th class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              @for (op of paginatedOperadores; track op.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Operador -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      <img 
                        [src]="op.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'" 
                        (error)="onAvatarError($event)"
                        alt="Avatar" 
                        class="w-9 h-9 rounded-full object-cover border-2 border-easydry-green shrink-0">
                      <div>
                        <p class="font-bold text-slate-900 text-xs">{{ op.nombre }}</p>
                        <p class="text-[10px] text-slate-400 font-mono">CI: {{ op.cedula }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Rol -->
                  <td class="py-3.5 px-4 font-semibold text-slate-700 text-xs">
                    {{ op.rol }}
                  </td>

                  <!-- Estado -->
                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold"
                      [ngClass]="op.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'">
                      {{ op.estado }}
                    </span>
                  </td>

                  <!-- Agencia Asignada -->
                  <td class="py-3.5 px-4 text-xs font-bold text-slate-800">
                    {{ op.sucursal }}
                  </td>

                  <!-- Bahía Asignada -->
                  <td class="py-3.5 px-4">
                    @if (op.bahia && !op.bahia.includes('Sin')) {
                      <span class="px-2.5 py-1 rounded-lg bg-easydry-blue/10 text-easydry-blue font-bold text-xs inline-flex items-center gap-1">
                        <i-lucide name="layout-grid" class="w-3 h-3"></i-lucide>
                        {{ op.bahia }}
                      </span>
                    } @else {
                      <span class="text-slate-400 italic text-[11px]">Disponible</span>
                    }
                  </td>

                  <!-- Productividad -->
                  <td class="py-3.5 px-4">
                    <div class="text-xs">
                      <span class="font-extrabold text-easydry-green-dark">{{ op.vehiculosAtendidos }} Autos</span>
                      <p class="text-[10px] text-slate-400">Prom: {{ op.promedioDiario }}/día · Ranking #{{ op.ranking }}</p>
                    </div>
                  </td>

                  <!-- Acciones (Punto 4: Asignar, Cambiar, Desactivar, Ver Productividad) -->
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <!-- Asignar o Cambiar Bahía -->
                      <button 
                        type="button"
                        (click)="abrirModalAsignar(op)" 
                        [title]="op.bahia && !op.bahia.includes('Sin') ? 'Cambiar bahía' : 'Asignar a bahía'"
                        class="p-1.5 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                        <i-lucide name="refresh-cw" class="w-3.5 h-3.5"></i-lucide>
                      </button>

                      <!-- Desactivar Asignación -->
                      @if (op.bahia && !op.bahia.includes('Sin')) {
                        <button 
                          type="button"
                          (click)="desactivarAsignacion(op)" 
                          title="Desactivar asignación de bahía"
                          class="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center">
                          <i-lucide name="user-x" class="w-3.5 h-3.5"></i-lucide>
                        </button>
                      }

                      <!-- Ver Productividad & Ficha -->
                      <button 
                        type="button"
                        (click)="verFichaOperador(op)" 
                        title="Ver productividad y ficha técnica"
                        class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center">
                        <i-lucide name="bar-chart-2" class="w-3.5 h-3.5"></i-lucide>
                      </button>
                    </div>
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

      <!-- Modal Asignar / Cambiar Bahía (Punto 4) -->
      <app-modal
        [isOpen]="modalAsignarBahiaOpen"
        [title]="'Asignar / Cambiar Bahía: ' + (operadorSeleccionado?.nombre || '')"
        icon="layout-grid"
        (close)="modalAsignarBahiaOpen = false">
        @if (operadorSeleccionado) {
          <div class="space-y-4">
            <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs">
              Ubicación actual del operador: <strong>{{ operadorSeleccionado.sucursal }}</strong> — <strong>{{ operadorSeleccionado.bahia }}</strong>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Sucursal / Agencia
                @if (isGerente) {
                  <span class="text-purple-600 font-bold ml-1">(Exclusivo tu Agencia)</span>
                }
              </label>
              <select
                [(ngModel)]="formAsignarBahia.sucursalNombre"
                [disabled]="isGerente"
                (change)="onSucursalChange()"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:opacity-75 disabled:bg-slate-100">
                @for (s of sucursales; track s.id) {
                  <option [value]="s.nombre">{{ s.nombre }} ({{ s.ciudad }})</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía de Destino</label>
              <select
                [(ngModel)]="formAsignarBahia.bahiaNombre"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                @for (b of listaBahiasDisponibles; track b) {
                  <option [value]="b">{{ b }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del Movimiento / Reasignación</label>
              <input
                type="text"
                [(ngModel)]="formAsignarBahia.motivo"
                placeholder="Ej. Cobertura por alta demanda, rotación periódica..."
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">
            </div>
          </div>
        }

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalAsignarBahiaOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            (click)="guardarAsignacionBahia()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-easydry-blue hover:bg-easydry-blue-dark text-white transition-colors cursor-pointer">
            Confirmar Asignación
          </button>
        </div>
      </app-modal>

      <!-- Modal Ficha de Operador & Productividad -->
      <app-modal 
        [isOpen]="modalFichaOpen" 
        [title]="'Ficha de Operador & Productividad: ' + (operadorSeleccionado?.nombre || '')" 
        icon="trophy"
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
  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

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
  modalAsignarBahiaOpen = false;
  cargando = true;
  formAsignarBahia = {
    operadorId: 0,
    sucursalNombre: '',
    bahiaNombre: '',
    motivo: ''
  };
  listaBahiasDisponibles: string[] = ['Bahía 1 (Lavado Ecológico)', 'Bahía 2 (Lavado y Encerado)', 'Bahía 3 (Pulido Especial)', 'Bahía 4 (Secado y Acabado)', 'Bahía 5 (Móvil / Especiales)'];

  private operadorService = inject(OperadorMockService);
  private sucursalService = inject(SucursalMockService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.operadorService.getOperadores().subscribe(list => {
      this.operadores = list;
      this.cargando = false;
    });

    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
  }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin() || this.authService.hasRole('ADMIN');
  }

  get isGerente(): boolean {
    return this.authService.isGerente();
  }

  get userSucursal(): string | undefined {
    return this.authService.getCurrentUser()?.sucursalNombre || this.authService.getCurrentUser()?.sucursal;
  }

  get operadoresFiltrados(): Operador[] {
    let resultados = this.operadores.filter(op => {
      // ── Scope estricto por Rol (SuperAdmin ve todo, Gerente solo ve su agencia) ──
      let matchScope = true;
      if (this.isGerente && this.userSucursal) {
        matchScope = (op.sucursal || '').toLowerCase().includes(this.userSucursal.toLowerCase()) ||
                     this.userSucursal.toLowerCase().includes((op.sucursal || '').toLowerCase());
      } else if (!this.isSuperAdmin && this.userSucursal) {
        matchScope = (op.sucursal || '').toLowerCase() === this.userSucursal.toLowerCase();
      }
      
      const term = (this.filtroTexto || '').trim().toLowerCase();
      const matchTexto = !term ||
                         (op.nombre || '').toLowerCase().includes(term) ||
                         (op.cedula || '').toLowerCase().includes(term) ||
                         (op.sucursal || '').toLowerCase().includes(term);

      return matchScope && matchTexto;
    });

    if (this.filtrosGlobales.estado && this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(op => op.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal && this.filtrosGlobales.sucursal !== 'Todas') {
      const suc = this.filtrosGlobales.sucursal.toLowerCase();
      resultados = resultados.filter(op => (op.sucursal || '').toLowerCase().includes(suc) || suc.includes((op.sucursal || '').toLowerCase()));
    }
    if (this.filtrosGlobales.bahia && this.filtrosGlobales.bahia !== 'Todas') {
      const bah = this.filtrosGlobales.bahia.toLowerCase();
      resultados = resultados.filter(op => (op.bahia || '').toLowerCase().includes(bah) || bah.includes((op.bahia || '').toLowerCase()));
    }
    if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
      resultados = resultados.filter(op => {
        const suc = this.sucursalService.getSucursalPorNombre(op.sucursal);
        return suc?.marcaNombre === this.filtrosGlobales.marca;
      });
    }

    return resultados;
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    }
  }

  get paginatedOperadores(): Operador[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.operadoresFiltrados.slice(start, end);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  abrirModalAsignar(op: Operador): void {
    if (op.estado === 'Inactivo') {
      this.toastService.warning('Operador Inactivo', 'No se puede asignar bahías a un colaborador inactivo. Debe activarlo primero.');
      return;
    }
    this.operadorSeleccionado = op;
    const sucursalTarget = (this.isGerente && this.userSucursal)
      ? this.userSucursal
      : (op.sucursal || (this.sucursales[0]?.nombre || 'EasyDry Quito Norte'));

    this.formAsignarBahia = {
      operadorId: op.id,
      sucursalNombre: sucursalTarget,
      bahiaNombre: op.bahia && !op.bahia.includes('Sin') ? op.bahia : this.listaBahiasDisponibles[0],
      motivo: ''
    };
    this.onSucursalChange();
    this.modalAsignarBahiaOpen = true;
  }

  onSucursalChange(): void {
    const suc = this.sucursales.find(s => s.nombre === this.formAsignarBahia.sucursalNombre);
    const cant = suc?.cantidadBahias || 4;
    this.listaBahiasDisponibles = Array.from({ length: cant }, (_, i) => `Bahía ${i + 1} (${this.formAsignarBahia.sucursalNombre})`);
    if (!this.listaBahiasDisponibles.includes(this.formAsignarBahia.bahiaNombre)) {
      this.formAsignarBahia.bahiaNombre = this.listaBahiasDisponibles[0];
    }
  }

  guardarAsignacionBahia(): void {
    if (!this.operadorSeleccionado) return;

    const op = this.operadorSeleccionado;
    op.sucursal = this.formAsignarBahia.sucursalNombre;
    op.bahia = this.formAsignarBahia.bahiaNombre;
    op.fechaAsignacion = new Date().toISOString().split('T')[0];

    this.operadorService.actualizarOperador(op).subscribe();

    this.modalAsignarBahiaOpen = false;
    this.toastService.success(
      'Asignación Confirmada',
      `Operador ${op.nombre} asignado a ${op.bahia} (${op.sucursal}).`
    );
  }

  desactivarAsignacion(op: Operador): void {
    const anteriorBahia = op.bahia;
    op.bahia = 'Sin Bahía Asignada';
    this.operadorService.actualizarOperador(op).subscribe();
    this.toastService.warning(
      'Asignación Desactivada',
      `Se desvinculó a ${op.nombre} de ${anteriorBahia}. Operador ahora disponible.`
    );
  }

  verFichaOperador(op: Operador): void {
    this.operadorSeleccionado = op;
    this.operadorService.getHistorialPorOperador(op.id).subscribe(h => {
      this.historialOperador = h;
      this.modalFichaOpen = true;
    });
  }
}

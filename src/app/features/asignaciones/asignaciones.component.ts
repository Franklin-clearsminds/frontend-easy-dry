import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OperadorMockService } from '../../core/services/operador-mock.service';
import { BahiaMockService } from '../../core/services/bahia-mock.service';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { Operador, Sucursal, Bahia, HistorialAsignacionOperador } from '../../core/models';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in max-w-6xl mx-auto">
      
      <!-- Header -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Asignación de Operadores a Bahías</h1>
        <p class="text-slate-500 text-xs mt-1">Matriz de asignación dinámica de personal técnico, cumplimiento de reglas de negocio y trazabilidad histórica.</p>
      </div>

      <!-- Assignment Form & Rules Card -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Rules Summary Panel -->
        <div class="bg-gradient-to-br from-easydry-blue to-easydry-blue-dark p-6 rounded-2xl text-white shadow-easydry flex flex-col justify-between space-y-4">
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-easydry-lime bg-easydry-green/20 px-2.5 py-1 rounded-full border border-easydry-green/30">Reglas de Negocio</span>
            <h3 class="text-xl font-bold font-outfit mt-3">Políticas de Asignación</h3>
            <ul class="mt-4 space-y-3 text-xs text-slate-200">
              <li class="flex items-start gap-2">
                <i-lucide name="check" class="w-4 h-4 text-easydry-lime shrink-0 mt-0.5"></i-lucide>
                <span>1 Operador por bahía activa.</span>
              </li>
              <li class="flex items-start gap-2">
                <i-lucide name="check" class="w-4 h-4 text-easydry-lime shrink-0 mt-0.5"></i-lucide>
                <span>El operador sólo pertenece a una bahía principal.</span>
              </li>
              <li class="flex items-start gap-2">
                <i-lucide name="check" class="w-4 h-4 text-easydry-lime shrink-0 mt-0.5"></i-lucide>
                <span>Historial con fecha inicio, fin, responsable y motivo registrado automáticamente.</span>
              </li>
            </ul>
          </div>

          <div class="pt-4 border-t border-white/10 text-[11px] text-slate-300">
            Validador de asignación en tiempo real.
          </div>
        </div>

        <!-- Interactive Form -->
        <div class="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry space-y-5">
          <h3 class="font-bold text-slate-900 text-base font-outfit">Reasignar Operador a Nueva Bahía</h3>

          <form (ngSubmit)="ejecutarAsignacion()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Operador</label>
              <select [(ngModel)]="operadorIdSeleccionado" name="operadorId" class="w-full p-2.5 border rounded-xl text-sm font-semibold" required>
                @for (op of operadores; track op.id) {
                  <option [value]="op.id">{{ op.nombre }} (Actual: {{ op.sucursal }} - {{ op.bahia }})</option>
                }
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal Destino</label>
                <select 
                  [(ngModel)]="sucursalSeleccionadaNombre" 
                  [disabled]="!isSuperAdmin"
                  (change)="onSucursalChange()" 
                  name="sucursal" 
                  class="w-full p-2.5 border rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed">
                  @for (s of sucursales; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }} ({{ s.ciudad }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía Destino</label>
                <select [(ngModel)]="bahiaIdSeleccionada" name="bahia" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                  @for (b of bahiasFiltradas; track b.id) {
                    <option [value]="b.id">{{ b.nombre }} [{{ b.estado }}]</option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del Cambio de Asignación</label>
              <input type="text" [(ngModel)]="motivoCambio" name="motivo" placeholder="ej. Cubrimiento de turno por alta demanda de servicios" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>

            <button 
              type="submit"
              class="w-full py-3 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs">
              <i-lucide name="user-check" class="w-4 h-4 text-easydry-green"></i-lucide>
              <span>Confirmar y Guardar Asignación</span>
            </button>
          </form>
        </div>

      </div>

      <!-- Historical Log Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden mt-6">
        <div class="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-900 text-base font-outfit">Historial General de Cambios de Asignación</h3>
            <span class="text-xs text-slate-500 font-bold">Registro Auditable</span>
          </div>
          
          <!-- Filtro de Sucursal para el Historial -->
          <div class="flex items-center gap-2">
            <label class="text-xs font-bold text-slate-700">Filtrar Historial:</label>
            <select 
              [(ngModel)]="filtroHistorialSucursal" 
              [disabled]="!isSuperAdmin"
              class="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 disabled:opacity-60 disabled:cursor-not-allowed">
              <option value="Todas">Todas las Sucursales</option>
              @for (s of sucursales; track s.id) {
                <option [value]="s.nombre">{{ s.nombre }}</option>
              }
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Operador</th>
                <th class="py-3.5 px-4">Sucursal y Bahía</th>
                <th class="py-3.5 px-4">Fecha Inicio</th>
                <th class="py-3.5 px-4">Fecha Fin</th>
                <th class="py-3.5 px-4">Autorizado Por</th>
                <th class="py-3.5 px-4">Motivo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (h of paginatedHistorial; track h.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4 font-bold text-slate-900 text-xs">
                    {{ h.operadorNombre }}
                  </td>
                  <td class="py-3.5 px-4 text-xs font-semibold text-easydry-blue">
                    {{ h.sucursal }} — {{ h.bahia }}
                  </td>
                  <td class="py-3.5 px-4 text-xs font-mono text-slate-600">
                    {{ h.fechaInicio }}
                  </td>
                  <td class="py-3.5 px-4 text-xs font-mono">
                    @if (h.fechaFin) {
                      <span class="text-slate-500">{{ h.fechaFin }}</span>
                    } @else {
                      <span class="px-2 py-0.5 rounded-full bg-easydry-green/20 text-easydry-green-dark font-bold text-[11px]">Vigente</span>
                    }
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-700">
                    {{ h.realizadoPor }}
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                    {{ h.motivo }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination 
          [totalItems]="historialFiltrado.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

    </div>
  `
})
export class AsignacionesComponent implements OnInit {
  operadores: Operador[] = [];
  sucursales: Sucursal[] = [];
  todasLasBahias: Bahia[] = [];
  bahiasFiltradas: Bahia[] = [];
  historialGeneral: HistorialAsignacionOperador[] = [];

  operadorIdSeleccionado = 1;
  sucursalSeleccionadaNombre = 'EasyDry Quito Norte';
  bahiaIdSeleccionada = 101;
  motivoCambio = 'Reasignación operativa de rutina';

  filtroHistorialSucursal = 'Todas';

  currentPage = 1;
  pageSize = 5;

  private operadorService = inject(OperadorMockService);
  private bahiaService = inject(BahiaMockService);
  private sucursalService = inject(SucursalMockService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);

  get isSuperAdmin() {
    return this.authService.hasRole('SUPER_ADMIN' as any);
  }

  get historialFiltrado() {
    if (this.filtroHistorialSucursal === 'Todas') {
      return this.historialGeneral;
    }
    return this.historialGeneral.filter(h => h.sucursal === this.filtroHistorialSucursal);
  }

  get paginatedHistorial() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.historialFiltrado.slice(start, end);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();

    this.operadorService.getOperadores().subscribe(list => {
      if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
        this.operadores = list.filter(o => o.sucursal.toLowerCase() === user.sucursalNombre!.toLowerCase());
      } else {
        this.operadores = list;
      }
      if (this.operadores.length > 0) {
        this.operadorIdSeleccionado = this.operadores[0].id;
      }
    });

    this.sucursalService.getSucursales().subscribe(list => {
      if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
        this.sucursales = list.filter(s => s.nombre.toLowerCase() === user.sucursalNombre!.toLowerCase());
      } else {
        this.sucursales = list;
      }
      
      if (this.sucursales.length > 0) {
        this.sucursalSeleccionadaNombre = this.sucursales[0].nombre;
        this.onSucursalChange();
      }
    });

    this.bahiaService.getBahias().subscribe(list => {
      this.todasLasBahias = list;
      this.onSucursalChange();
    });

    this.operadorService.historial$.subscribe(hist => {
      if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
        this.historialGeneral = hist.filter(h => h.sucursal.toLowerCase() === user.sucursalNombre!.toLowerCase());
        this.filtroHistorialSucursal = user.sucursalNombre;
      } else {
        this.historialGeneral = hist;
      }
    });
  }

  onSucursalChange() {
    this.bahiasFiltradas = this.todasLasBahias.filter(b => b.sucursalNombre === this.sucursalSeleccionadaNombre);
    if (this.bahiasFiltradas.length > 0) {
      this.bahiaIdSeleccionada = this.bahiasFiltradas[0].id;
    }
  }

  ejecutarAsignacion() {
    const op = this.operadores.find(o => o.id === Number(this.operadorIdSeleccionado));
    const bahiaTarget = this.todasLasBahias.find(b => b.id === Number(this.bahiaIdSeleccionada));

    if (!op || !bahiaTarget) {
      this.toastService.warning('Selección Invalida', 'Seleccione un operador y una bahía válidos.');
      return;
    }

    if (!this.motivoCambio.trim()) {
      this.toastService.warning('Motivo Requerido', 'Escriba la razón de la reasignación.');
      return;
    }

    const user = this.authService.getCurrentUser();
    const autor = user ? `${user.nombre} (${this.authService.getRolLabel(user.role)})` : 'Admin';

    this.operadorService.reasignarOperador(
      op.id, 
      this.sucursalSeleccionadaNombre, 
      bahiaTarget.nombre, 
      this.motivoCambio, 
      autor
    ).subscribe(res => {
      if (res) {
        this.bahiaService.asignarOperadorABahia(bahiaTarget.id, op.nombre, op.id).subscribe();
        this.toastService.success('Asignación Éxitosa', `${op.nombre} reasignado a ${bahiaTarget.nombre} (${this.sucursalSeleccionadaNombre})`);
      }
    });
  }
}

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

      <!-- Sede Operativa Badge para Líder Operador -->
      @if (!isSuperAdmin) {
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-easydry-blue text-white flex items-center justify-center font-bold shrink-0">
              <i-lucide name="shield-check" class="w-5 h-5 text-easydry-lime"></i-lucide>
            </div>
            <div>
              <p class="font-extrabold text-slate-900">
                Alcance Operativo: <span class="text-easydry-blue">{{ sucursalSeleccionadaNombre || authService.getCurrentUser()?.sucursalNombre || 'Agencia Asignada' }}</span>
              </p>
              <p class="text-slate-600 text-[11px] mt-0.5">
                Como Líder Operador, su gestión está restringida al personal técnico y a los movimientos entre bahías de su propia sede.
              </p>
            </div>
          </div>
          <span class="px-3 py-1 bg-white border border-blue-200 rounded-full font-bold text-[11px] text-easydry-blue shadow-xs">
            Líder de Agencia
          </span>
        </div>
      }

      <!-- Assignment Form & Rules Card -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Rules Summary Panel -->
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col justify-between space-y-4">
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-widest text-easydry-blue bg-easydry-blue/10 px-2.5 py-1 rounded-full border border-easydry-blue/20">Reglas de Negocio</span>
            <h3 class="text-xl font-bold font-outfit mt-3 text-slate-900">Políticas de Asignación</h3>
            <ul class="mt-4 space-y-3 text-xs text-slate-600">
              <li class="flex items-start gap-2">
                <i-lucide name="check" class="w-4 h-4 text-easydry-blue shrink-0 mt-0.5"></i-lucide>
                <span>1 Operador por bahía activa.</span>
              </li>
              <li class="flex items-start gap-2">
                <i-lucide name="check" class="w-4 h-4 text-easydry-blue shrink-0 mt-0.5"></i-lucide>
                <span>El operador sólo pertenece a una bahía principal.</span>
              </li>
              <li class="flex items-start gap-2">
                <i-lucide name="check" class="w-4 h-4 text-easydry-blue shrink-0 mt-0.5"></i-lucide>
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
                  <option [value]="op.id">{{ op.nombre }} (Actual: {{ op.sucursal }} — {{ getBahiaLabel(op) }})</option>
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
                  class="w-full p-2.5 border rounded-xl text-sm font-semibold disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed">
                  @for (s of sucursales; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }} ({{ s.ciudad }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía Destino</label>
                <select [(ngModel)]="bahiaIdSeleccionada" name="bahia" class="w-full p-2.5 border rounded-xl text-sm font-semibold" required>
                  @for (b of bahiasFiltradas; track b.id) {
                    <option [value]="b.id">
                      {{ b.nombre }} [{{ b.estado }}] — {{ (b.operadorAsignado && b.operadorAsignado !== 'Sin Asignar') ? ('Ocupada por: ' + b.operadorAsignado) : 'Disponible / Sin Asignar' }}
                    </option>
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
              class="w-full py-3 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer">
              <i-lucide name="user-check" class="w-4 h-4 text-easydry-green"></i-lucide>
              <span>Confirmar y Guardar Asignación</span>
            </button>
          </form>
        </div>

      </div>

      <!-- Historical Assignments Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden flex flex-col mt-6">
        <div class="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-900 text-base font-outfit">Historial General de Cambios de Asignación</h3>
            <span class="text-xs text-slate-500 font-bold">Registro Auditable en Base de Datos</span>
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
                    {{ h.sucursal }} — {{ (h.bahia && !h.bahia.includes('undefined') && !h.bahia.includes('null')) ? h.bahia : 'Bahía' }}
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
              } @empty {
                <tr>
                  <td colspan="6" class="py-8 text-center text-xs text-slate-400 italic">
                    No se registran cambios de asignación en la base de datos para los filtros seleccionados.
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

  operadorIdSeleccionado: string = '';
  sucursalSeleccionadaNombre = '';
  bahiaIdSeleccionada: string = '';
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
    return this.authService.isAdmin();
  }

  getBahiaLabel(op: Operador): string {
    if (!op.bahia || op.bahia === 'undefined' || op.bahia === 'null' || op.bahia.toLowerCase().includes('sin')) {
      return 'Sin Bahía Asignada';
    }
    return op.bahia;
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
    this.currentPage = 1;
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const userAgenciaId = user?.agenciaId ? String(user.agenciaId) : null;
    const userSucursal = (user?.sucursalNombre || user?.sucursal || '').toLowerCase();

    this.operadorService.historial$.subscribe(hist => {
      if (user && !this.isSuperAdmin && (userAgenciaId || userSucursal)) {
        this.historialGeneral = (hist || []).filter(h => 
          (userSucursal && h.sucursal && (h.sucursal.toLowerCase().includes(userSucursal) || userSucursal.includes(h.sucursal.toLowerCase())))
        );
        this.filtroHistorialSucursal = user.sucursalNombre || user.sucursal || 'Todas';
      } else {
        this.historialGeneral = hist || [];
      }
    });

    this.cargarTodo();
  }

  cargarTodo(): void {
    const user = this.authService.getCurrentUser();
    const userAgenciaId = user?.agenciaId ? String(user.agenciaId) : null;
    const userSucursal = (user?.sucursalNombre || user?.sucursal || '').toLowerCase();

    // 1. Cargar operadores restringidos a la agencia del Líder Operador
    this.operadorService.getOperadores(userAgenciaId || undefined).subscribe(list => {
      if (user && !this.isSuperAdmin) {
        this.operadores = (list || []).filter(o => 
          (userAgenciaId && (String(o.sucursalId) === userAgenciaId || String((o as any).agenciaId) === userAgenciaId)) ||
          (userSucursal && o.sucursal && (o.sucursal.toLowerCase().includes(userSucursal) || userSucursal.includes(o.sucursal.toLowerCase())))
        );
      } else {
        this.operadores = list || [];
      }
      if (this.operadores.length > 0 && (!this.operadorIdSeleccionado || !this.operadores.some(o => String(o.id) === String(this.operadorIdSeleccionado)))) {
        this.operadorIdSeleccionado = String(this.operadores[0].id);
      }
    });

    // 2. Cargar sucursales (Líder fijado exclusivamente a su sede)
    this.sucursalService.getSucursales().subscribe(list => {
      if (user && !this.isSuperAdmin) {
        this.sucursales = (list || []).filter(s => 
          (userAgenciaId && String(s.id) === userAgenciaId) ||
          (userSucursal && s.nombre && (s.nombre.toLowerCase().includes(userSucursal) || userSucursal.includes(s.nombre.toLowerCase())))
        );
      } else {
        this.sucursales = list || [];
      }
      
      if (this.sucursales.length > 0) {
        if (!this.sucursalSeleccionadaNombre || !this.sucursales.some(s => s.nombre === this.sucursalSeleccionadaNombre)) {
          this.sucursalSeleccionadaNombre = this.sucursales[0].nombre;
        }
        this.onSucursalChange();
      }
    });

    // 3. Cargar bahías (Líder restringido a las bahías de su sede)
    this.bahiaService.getBahias().subscribe(list => {
      if (user && !this.isSuperAdmin) {
        this.todasLasBahias = (list || []).filter(b => 
          (userAgenciaId && (String(b.agenciaId) === userAgenciaId || String(b.sucursalId) === userAgenciaId)) ||
          (userSucursal && ((b.sucursalNombre && b.sucursalNombre.toLowerCase().includes(userSucursal)) || 
                            (b.agenciaNombre && b.agenciaNombre.toLowerCase().includes(userSucursal))))
        );
      } else {
        this.todasLasBahias = list || [];
      }
      this.onSucursalChange();
    });

    this.operadorService.getHistorialGeneral(userAgenciaId || undefined).subscribe();
  }

  onSucursalChange() {
    const sucNorm = (this.sucursalSeleccionadaNombre || '').trim().toLowerCase();
    this.bahiasFiltradas = this.todasLasBahias.filter(b => 
      (b.sucursalNombre && b.sucursalNombre.trim().toLowerCase() === sucNorm) || 
      (b.agenciaNombre && b.agenciaNombre.trim().toLowerCase() === sucNorm)
    );
    if (this.bahiasFiltradas.length > 0) {
      if (!this.bahiaIdSeleccionada || !this.bahiasFiltradas.some(b => String(b.id) === String(this.bahiaIdSeleccionada))) {
        this.bahiaIdSeleccionada = String(this.bahiasFiltradas[0].id);
      }
    } else {
      this.bahiaIdSeleccionada = '';
    }
  }

  ejecutarAsignacion() {
    const op = this.operadores.find(o => String(o.id) === String(this.operadorIdSeleccionado));
    const bahiaTarget = this.todasLasBahias.find(b => String(b.id) === String(this.bahiaIdSeleccionada));

    if (!op || !bahiaTarget) {
      this.toastService.warning('Selección Inválida', 'Seleccione un operador y una bahía válidos.');
      return;
    }

    const user = this.authService.getCurrentUser();
    const userAgenciaId = user?.agenciaId ? String(user.agenciaId) : null;
    const userSucursal = (user?.sucursalNombre || user?.sucursal || '').toLowerCase();

    // Restricción de seguridad para Líder Operador
    if (!this.isSuperAdmin && user) {
      const bahiaValida = 
        (userAgenciaId && (String(bahiaTarget.agenciaId) === userAgenciaId || String(bahiaTarget.sucursalId) === userAgenciaId)) ||
        (userSucursal && ((bahiaTarget.sucursalNombre && bahiaTarget.sucursalNombre.toLowerCase().includes(userSucursal)) ||
                          (bahiaTarget.agenciaNombre && bahiaTarget.agenciaNombre.toLowerCase().includes(userSucursal))));
      if (!bahiaValida) {
        this.toastService.error('Permiso Denegado', 'Como Líder Operador solo puede mover operadores entre bahías de su propia agencia.');
        return;
      }
    }

    if (!this.motivoCambio.trim()) {
      this.toastService.warning('Motivo Requerido', 'Escriba la razón de la reasignación.');
      return;
    }

    // Alerta si la bahía ya tiene un operador asignado diferente
    const tieneOtroOperador = bahiaTarget.operadorAsignado &&
      bahiaTarget.operadorAsignado !== 'Sin Asignar' &&
      bahiaTarget.operadorId &&
      String(bahiaTarget.operadorId) !== String(op.id);

    if (tieneOtroOperador) {
      const confirmado = window.confirm(
        `⚠️ ADVERTENCIA DE ASIGNACIÓN:\n\n` +
        `La ${bahiaTarget.nombre} ya tiene asignado al operador "${bahiaTarget.operadorAsignado}".\n\n` +
        `Si continúas con la asignación, "${bahiaTarget.operadorAsignado}" quedará sin bahía asignada y "${op.nombre}" pasará a ocupar su lugar.\n\n` +
        `¿Deseas confirmar el cambio sabiendo que el otro operador se quedará sin bahía?`
      );

      if (!confirmado) {
        return;
      }
    }

    const autor = user ? `${user.nombre} (${this.authService.getRolLabel(user.role)})` : 'Admin';

    this.operadorService.reasignarOperador(
      op.id, 
      this.sucursalSeleccionadaNombre, 
      bahiaTarget.nombre, 
      this.motivoCambio, 
      autor,
      String(bahiaTarget.id)
    ).subscribe(res => {
      if (res) {
        this.toastService.success('Asignación Exitosa', `${op.nombre} asignado a ${bahiaTarget.nombre} (${this.sucursalSeleccionadaNombre})`);
        this.cargarTodo();
      } else {
        this.toastService.error('Error', 'No se pudo registrar la asignación en la base de datos.');
      }
    });
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MaquinariaMockService } from '../../core/services/maquinaria-mock.service';
import { MovimientoMaquinariaMockService } from '../../core/services/movimiento-maquinaria-mock.service';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { IncidenteMockService } from '../../core/services/incidente-mock.service';
import { MantenimientoMockService } from '../../core/services/mantenimiento-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { Maquinaria, MovimientoMaquinaria, Sucursal, Incidente, Mantenimiento } from '../../core/models';
import { Role } from '../../core/models/roles.model';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-maquinaria',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Inventario & Movimientos de Maquinaria</h1>
          <p class="text-slate-500 text-xs mt-1">Control de activos industriales, asignación a sucursales/bahías y trazabilidad de transferencias.</p>
        </div>
        @if (canCreate) {
          <button 
            (click)="modalCrearOpen = true"
            class="px-4 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs self-start sm:self-auto">
            <i-lucide name="plus" class="w-4 h-4"></i-lucide>
            <span>Registrar Nuevo Activo</span>
          </button>
        }

      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="canTransfer" 
        [showOperador]="false"
        [showBahia]="true"
        [showEstado]="true"
        [showFechas]="false"
        [listaEstados]="['Todos', 'Operativa', 'Requiere Mantenimiento', 'En Reparación', 'Fuera de Servicio']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Search Bar -->
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
              placeholder="Buscar por código o nombre..." 
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
          </div>
        </div>
        <div class="text-xs font-semibold text-slate-500">
          Equipos: <strong class="text-easydry-blue">{{ maquinasFiltradas.length }}</strong>
        </div>
      </div>

      <!-- Equipment Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (maq of paginatedMaquinaria; track maq.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden group hover:shadow-easydry-hover transition-all duration-300 flex flex-col justify-between">
            
            <div>
              <div class="h-44 bg-slate-900 relative overflow-hidden">
                <img [src]="maq.imagen" [alt]="maq.nombre" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90">
                <div class="absolute top-3 left-3 px-3 py-1 rounded-lg bg-easydry-blue/90 text-white text-xs font-mono font-bold backdrop-blur-xs">
                  {{ maq.codigo }}
                </div>

                <div class="absolute top-3 right-3">
                  <span 
                    class="px-3 py-1 rounded-full text-xs font-bold shadow-xs"
                    [ngClass]="{
                      'bg-easydry-green text-slate-950': maq.estado === 'Operativa',
                      'bg-amber-400 text-slate-950': maq.estado === 'Requiere Mantenimiento',
                      'bg-rose-500 text-white': maq.estado === 'En Reparación' || maq.estado === 'Fuera de Servicio'
                    }">
                    {{ maq.estado }}
                  </span>
                </div>
              </div>

              <div class="p-5 space-y-3">
                <h3 class="font-bold text-slate-900 text-base font-outfit leading-tight group-hover:text-easydry-blue transition-colors">
                  {{ maq.nombre }}
                </h3>
                <p class="text-xs text-slate-500 font-semibold">{{ maq.marca }} • {{ maq.modelo }}</p>

                <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-slate-400 text-[10px] block uppercase font-bold">Sucursal</span>
                    <span class="font-bold text-slate-800">{{ maq.agencia }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 text-[10px] block uppercase font-bold">Bahía</span>
                    <span class="font-bold text-easydry-blue">{{ maq.bahia }}</span>
                  </div>
                </div>

                <div class="p-2 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                  <span class="text-slate-500 font-medium">Responsable:</span>
                  <span class="font-bold text-slate-900">{{ maq.operadorResponsable || 'Juan Pérez' }}</span>
                </div>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="p-5 pt-0" [ngClass]="canTransfer ? 'grid grid-cols-2 gap-2' : 'flex'">
              @if (canTransfer) {
                <button 
                  (click)="openModalTransferir(maq)"
                  class="py-2 bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1">
                  <i-lucide name="refresh-cw" class="w-3.5 h-3.5"></i-lucide>
                  <span>Transferir</span>
                </button>
              }
              <button 
                (click)="verFichaTecnica(maq)"
                class="py-2 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                [ngClass]="canTransfer ? '' : 'w-full'">
                <i-lucide name="hard-drive" class="w-3.5 h-3.5"></i-lucide>
                <span>Ficha & Log</span>
              </button>
            </div>


          </div>
        }
      </div>

      <div class="mt-6">
        <app-pagination 
          [totalItems]="maquinasFiltradas.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal Ficha Técnica & Historial de Movimientos -->
      <app-modal 
        [isOpen]="modalFichaOpen" 
        [title]="'Ficha Técnica: ' + (maquinaSeleccionada?.nombre || '')" 
        icon="hard-drive"
        (close)="modalFichaOpen = false">
        
        @if (maquinaSeleccionada) {
          <div class="space-y-6">
            
            <div class="flex flex-col sm:flex-row gap-5 items-start">
              <img [src]="maquinaSeleccionada.imagen" alt="Foto Equipo" class="w-full sm:w-48 h-36 object-cover rounded-2xl border border-slate-200">
              <div class="space-y-2 flex-1">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-1 bg-easydry-blue text-white font-mono font-bold text-xs rounded-lg">{{ maquinaSeleccionada.codigo }}</span>
                  <span class="font-bold text-slate-900 text-lg font-outfit">{{ maquinaSeleccionada.nombre }}</span>
                </div>
                <p class="text-xs text-slate-600">Fabricante: <strong>{{ maquinaSeleccionada.marca }}</strong> • Modelo: <strong>{{ maquinaSeleccionada.modelo }}</strong></p>
                <p class="text-xs text-slate-600">Ubicación Actual: <strong>{{ maquinaSeleccionada.agencia }} ({{ maquinaSeleccionada.bahia }})</strong></p>
                <p class="text-xs text-slate-600">Operador Responsable: <strong>{{ maquinaSeleccionada.operadorResponsable || 'Juan Pérez' }}</strong></p>
              </div>
            </div>

            <!-- Technical Metrics -->
            <div class="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <div>
                <p class="text-[11px] text-slate-400 font-bold uppercase">Horas de Uso</p>
                <p class="font-extrabold text-slate-900 text-sm mt-0.5">{{ maquinaSeleccionada.horasUso || 1200 }} hrs</p>
              </div>
              <div>
                <p class="text-[11px] text-slate-400 font-bold uppercase">Presión de Agua</p>
                <p class="font-extrabold text-easydry-blue text-sm mt-0.5">{{ maquinaSeleccionada.nivelPresionWaterBar || 0 }} BAR</p>
              </div>
              <div>
                <p class="text-[11px] text-slate-400 font-bold uppercase">Próximo Mantenimiento</p>
                <p class="font-extrabold text-easydry-green-dark text-sm mt-0.5">{{ maquinaSeleccionada.fechaMantenimiento }}</p>
              </div>
            </div>

            <!-- Movements History Log -->
            <div class="border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <i-lucide name="refresh-cw" class="w-4 h-4 text-easydry-blue"></i-lucide> Historial de Transferencias
              </h4>
              <div class="space-y-2 max-h-40 overflow-y-auto pr-2">
                @for (mov of movimientosMaquina; track mov.id) {
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <p class="font-bold text-slate-900">{{ mov.sucursalAnterior }} &rarr; {{ mov.sucursalNueva }}</p>
                      <p class="text-[11px] text-slate-500">Motivo: {{ mov.motivo }}</p>
                    </div>
                    <span class="font-mono text-slate-500 text-[10px]">{{ mov.fecha }}</span>
                  </div>
                }
                @if (movimientosMaquina.length === 0) {
                  <p class="text-xs text-slate-500 italic">No hay transferencias registradas.</p>
                }
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Incidents Log -->
              <div class="border border-slate-200 rounded-2xl p-4 space-y-3">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <i-lucide name="alert-triangle" class="w-4 h-4 text-rose-500"></i-lucide> Fallos y Averías
                  </h4>
                  <button (click)="reportarFallo()" class="text-[10px] flex items-center gap-1 font-bold text-easydry-blue hover:text-easydry-blue-dark bg-easydry-blue/10 hover:bg-easydry-blue/20 px-2 py-1 rounded transition-colors">
                    <i-lucide name="plus" class="w-3 h-3"></i-lucide> Reportar
                  </button>
                </div>
                <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                  @for (inc of incidentesMaquina; track inc.id) {
                    <div class="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex flex-col gap-1 text-xs">
                      <div class="flex justify-between">
                        <span class="font-bold text-slate-900">{{ inc.tipo }}</span>
                        <span class="font-mono text-slate-500 text-[10px]">{{ inc.fecha }}</span>
                      </div>
                      <p class="text-[11px] text-slate-600 line-clamp-2">{{ inc.descripcion }}</p>
                      <div class="flex justify-between items-center mt-1">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                          [ngClass]="inc.estado === 'Resuelto' || inc.estado === 'Solucionado' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-amber-100 text-amber-800'">
                          {{ inc.estado }}
                        </span>
                        <span class="text-[10px] text-slate-400">Por: {{ inc.reportadoPor }}</span>
                      </div>
                    </div>
                  }
                  @if (incidentesMaquina.length === 0) {
                    <p class="text-xs text-slate-500 italic">No hay fallos registrados.</p>
                  }
                </div>
              </div>

              <!-- Maintenance Log -->
              <div class="border border-slate-200 rounded-2xl p-4 space-y-3">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <i-lucide name="wrench" class="w-4 h-4 text-amber-500"></i-lucide> Mantenimientos
                  </h4>
                  <button (click)="programarMantenimiento()" class="text-[10px] flex items-center gap-1 font-bold text-easydry-blue hover:text-easydry-blue-dark bg-easydry-blue/10 hover:bg-easydry-blue/20 px-2 py-1 rounded transition-colors">
                    <i-lucide name="plus" class="w-3 h-3"></i-lucide> Programar
                  </button>
                </div>
                <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                  @for (man of mantenimientosMaquina; track man.id) {
                    <div class="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex flex-col gap-1 text-xs">
                      <div class="flex justify-between">
                        <span class="font-bold text-slate-900">{{ man.tipo }}</span>
                        <span class="font-mono text-slate-500 text-[10px]">{{ man.fecha }}</span>
                      </div>
                      <p class="text-[11px] text-slate-600 line-clamp-2">{{ man.descripcion }}</p>
                      <div class="flex justify-between items-center mt-1">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                          [ngClass]="man.estado === 'Completado' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-blue-100 text-blue-800'">
                          {{ man.estado }}
                        </span>
                        <span class="text-[10px] text-slate-400">Técnico: {{ man.tecnico }}</span>
                      </div>
                    </div>
                  }
                  @if (mantenimientosMaquina.length === 0) {
                    <p class="text-xs text-slate-500 italic">No hay mantenimientos registrados.</p>
                  }
                </div>
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

      <!-- Modal Transferir Maquinaria -->
      <app-modal 
        [isOpen]="modalTransferirOpen" 
        [title]="'Transferir Maquinaria: ' + (maquinaSeleccionada?.codigo || '')" 
        icon="refresh-cw"
        (close)="modalTransferirOpen = false">
        
        @if (maquinaSeleccionada) {
          <form (ngSubmit)="ejecutarTransferencia()" class="space-y-4">
            <div class="p-3 bg-slate-50 rounded-xl border text-xs">
              <p class="font-bold text-slate-800">Ubicación Actual:</p>
              <p class="text-slate-600">{{ maquinaSeleccionada.agencia }} — {{ maquinaSeleccionada.bahia }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal Destino</label>
                <select [(ngModel)]="transferencia.sucursalNueva" name="sucursalNueva" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                  @for (s of sucursales; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía Destino</label>
                <input type="text" [(ngModel)]="transferencia.bahiaNueva" name="bahiaNueva" placeholder="Bahía 1" class="w-full p-2.5 border rounded-xl text-sm" required>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del Movimiento</label>
              <input type="text" [(ngModel)]="transferencia.motivo" name="motivo" placeholder="Mantenimiento o incremento de demanda" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </form>
        }

        <div modal-footer>
          <button (click)="modalTransferirOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="ejecutarTransferencia()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">Confirmar Transferencia</button>
        </div>
      </app-modal>

      <!-- Modal Crear Maquinaria -->
      <app-modal 
        [isOpen]="modalCrearOpen" 
        title="Registrar Nuevo Activo de Maquinaria" 
        icon="plus"
        (close)="modalCrearOpen = false">
        
        <form (ngSubmit)="guardarNuevaMaquinaria()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Código Activo</label>
              <input type="text" [(ngModel)]="nuevaMaquina.codigo" name="codigo" placeholder="ej. HD-006" class="w-full p-2.5 border rounded-xl text-sm font-mono" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Equipo</label>
              <input type="text" [(ngModel)]="nuevaMaquina.nombre" name="nombre" placeholder="Hidrolavadora HD-006" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal Asignada</label>
              <select [(ngModel)]="nuevaMaquina.agencia" name="agencia" class="w-full p-2.5 border rounded-xl text-sm">
                <option value="EasyDry Quito Norte">EasyDry Quito Norte</option>
                <option value="EasyDry Quito Sur">EasyDry Quito Sur</option>
                <option value="EasyDry Cumbayá">EasyDry Cumbayá</option>
                <option value="EasyDry Guayaquil">EasyDry Guayaquil</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía</label>
              <input type="text" [(ngModel)]="nuevaMaquina.bahia" name="bahia" placeholder="Bahía 1" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalCrearOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarNuevaMaquinaria()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">Guardar Activo</button>
        </div>
      </app-modal>

      <!-- Modal Reportar Fallo (desde Ficha) -->
      <app-modal
        [isOpen]="modalReportarOpen"
        title="Reportar Fallo / Avería"
        icon="alert-triangle"
        zClass="z-[60]"
        (close)="modalReportarOpen = false">

        @if (maquinaSeleccionada) {
          <form (ngSubmit)="guardarReporteFallo()" class="space-y-4">
            <div class="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs">
              <p class="font-bold text-slate-800">Equipo</p>
              <p class="text-slate-600 mt-0.5">{{ maquinaSeleccionada.codigo }} — {{ maquinaSeleccionada.nombre }}</p>
              <p class="text-slate-500 mt-1">{{ maquinaSeleccionada.agencia }} · {{ maquinaSeleccionada.bahia }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Falla</label>
                <select [(ngModel)]="nuevoIncidente.tipo" name="tipoFallo" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                  <option value="Fuga de agua">Fuga de agua</option>
                  <option value="Falla eléctrica">Falla eléctrica</option>
                  <option value="Problema hidráulico">Problema hidráulico</option>
                  <option value="Baja presión">Baja presión</option>
                  <option value="Manguera dañada">Manguera dañada</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridad</label>
                <select [(ngModel)]="nuevoIncidente.prioridad" name="prioridadFallo" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítica">Crítica</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Problema</label>
              <textarea
                [(ngModel)]="nuevoIncidente.descripcion"
                name="descFallo"
                rows="3"
                placeholder="Describa el fallo observado en el equipo..."
                class="w-full p-2.5 border rounded-xl text-sm"
                required></textarea>
            </div>
          </form>
        }

        <div modal-footer>
          <button (click)="modalReportarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarReporteFallo()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs">Registrar Reporte</button>
        </div>
      </app-modal>

      <!-- Modal Programar Mantenimiento (desde Ficha) -->
      <app-modal
        [isOpen]="modalProgramarOpen"
        title="Programar Mantenimiento"
        icon="calendar-clock"
        zClass="z-[60]"
        (close)="modalProgramarOpen = false">

        @if (maquinaSeleccionada) {
          <form (ngSubmit)="guardarProgramacionMantenimiento()" class="space-y-4">
            <div class="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs">
              <p class="font-bold text-slate-800">Equipo</p>
              <p class="text-slate-600 mt-0.5">{{ maquinaSeleccionada.codigo }} — {{ maquinaSeleccionada.nombre }}</p>
              <p class="text-slate-500 mt-1">{{ maquinaSeleccionada.agencia }} · {{ maquinaSeleccionada.bahia }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Intervención</label>
                <select [(ngModel)]="nuevoMantenimiento.tipo" name="tipoMant" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                  <option value="Preventivo">Preventivo</option>
                  <option value="Correctivo">Correctivo</option>
                  <option value="Calibración">Calibración</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Programada</label>
                <input type="date" [(ngModel)]="nuevoMantenimiento.fecha" name="fechaMant" class="w-full p-2.5 border rounded-xl text-sm" required>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Técnico / Especialista</label>
                <input type="text" [(ngModel)]="nuevoMantenimiento.tecnico" name="tecnicoMant" placeholder="Ing. Esteban Torres" class="w-full p-2.5 border rounded-xl text-sm" required>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Costo Estimado ($)</label>
                <input type="number" [(ngModel)]="nuevoMantenimiento.costo" name="costoMant" class="w-full p-2.5 border rounded-xl text-sm" min="0" required>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Trabajo</label>
              <textarea
                [(ngModel)]="nuevoMantenimiento.descripcion"
                name="descMant"
                rows="3"
                placeholder="Detalle de tareas, repuestos y alcance..."
                class="w-full p-2.5 border rounded-xl text-sm"
                required></textarea>
            </div>
          </form>
        }

        <div modal-footer>
          <button (click)="modalProgramarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarProgramacionMantenimiento()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">Guardar Mantenimiento</button>
        </div>
      </app-modal>

    </div>
  `
})
export class MaquinariaComponent implements OnInit {
  maquinas: Maquinaria[] = [];
  sucursales: Sucursal[] = [];
  movimientosMaquina: MovimientoMaquinaria[] = [];
  incidentesMaquina: Incidente[] = [];
  mantenimientosMaquina: Mantenimiento[] = [];
  maquinaSeleccionada?: Maquinaria;

  modalFichaOpen = false;
  modalTransferirOpen = false;
  modalCrearOpen = false;
  modalReportarOpen = false;
  modalProgramarOpen = false;

  nuevoIncidente = {
    tipo: 'Falla eléctrica' as Incidente['tipo'],
    prioridad: 'Alta' as Incidente['prioridad'],
    descripcion: ''
  };

  nuevoMantenimiento = {
    tipo: 'Preventivo' as Mantenimiento['tipo'],
    fecha: new Date().toISOString().substring(0, 10),
    tecnico: '',
    costo: 0,
    descripcion: ''
  };

  transferencia = {
    sucursalNueva: 'EasyDry Quito Sur',
    bahiaNueva: 'Bahía 1',
    motivo: 'Refuerzo de capacidad operativa'
  };

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
  pageSize = 6;

  nuevaMaquina = {
    codigo: '',
    nombre: '',
    marca: 'Kärcher Professional',
    modelo: 'HD 2026',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 1',
    estado: 'Operativa' as Maquinaria['estado'],
    fechaMantenimiento: '2026-08-30',
    imagen: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80'
  };

  private maquinariaService = inject(MaquinariaMockService);
  private movimientoService = inject(MovimientoMaquinariaMockService);
  private sucursalService = inject(SucursalMockService);
  private incidenteService = inject(IncidenteMockService);
  private mantenimientoService = inject(MantenimientoMockService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);

  ngOnInit(): void {

    this.maquinariaService.getMaquinaria().subscribe(list => {
      this.maquinas = list;
    });

    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
  }

  get canTransfer() {
    return this.authService.hasRole(Role.SUPER_ADMIN);
  }

  get canCreate() {
    return this.authService.hasRole(Role.SUPER_ADMIN);
  }

  /** Roles con alcance de red/taller nacional: no filtrar por agencia exacta. */
  private debeFiltrarPorSucursal(user: ReturnType<AuthService['getCurrentUser']>): boolean {
    if (!user?.sucursalNombre || user.role === Role.SUPER_ADMIN) return false;
    const rolesAlcanceNacional: Role[] = [
      Role.COORD_MANTENIMIENTO,
      Role.TECNICO,
      Role.SUPERVISOR,
      Role.GERENTE,
    ];
    return !rolesAlcanceNacional.includes(user.role as Role);
  }

  get maquinasFiltradas() {
    const user = this.authService.getCurrentUser();
    let resultados = this.maquinas.filter(m => {
      let matchScope = true;
      if (user && this.debeFiltrarPorSucursal(user)) {
        matchScope = m.agencia === user.sucursalNombre;
      }
      const matchTexto = !this.filtroTexto || 
        m.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) || 
        m.codigo.toLowerCase().includes(this.filtroTexto.toLowerCase());
      
      return matchScope && matchTexto;
    });

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(m => m.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(m => m.agencia === this.filtrosGlobales.sucursal);
    }
    if (this.filtrosGlobales.bahia !== 'Todas') {
      resultados = resultados.filter(m => m.bahia === this.filtrosGlobales.bahia);
    }

    return resultados;
  }

  get paginatedMaquinaria() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.maquinasFiltradas.slice(start, end);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  verFichaTecnica(maq: Maquinaria) {
    this.maquinaSeleccionada = maq;
    
    // Obtener movimientos
    this.movimientoService.getMovimientosPorMaquina(maq.codigo).subscribe(list => {
      this.movimientosMaquina = list;
    });

    // Obtener incidentes de la máquina
    this.incidenteService.getIncidentes().subscribe(list => {
      this.incidentesMaquina = list.filter(i => i.maquina === maq.codigo || i.maquina === maq.nombre);
    });

    // Obtener mantenimientos de la máquina
    this.mantenimientoService.getMantenimientos().subscribe(list => {
      this.mantenimientosMaquina = list.filter(m => m.maquina === maq.codigo || m.maquina === maq.nombre);
    });

    this.modalFichaOpen = true;
  }

  openModalTransferir(maq: Maquinaria) {
    this.maquinaSeleccionada = maq;
    this.modalTransferirOpen = true;
  }

  ejecutarTransferencia() {
    if (!this.maquinaSeleccionada || !this.transferencia.motivo) {
      this.toastService.warning('Datos Requeridos', 'Ingrese la bahía y el motivo de transferencia.');
      return;
    }

    const mov = {
      maquinaCodigo: this.maquinaSeleccionada.codigo,
      maquinaNombre: this.maquinaSeleccionada.nombre,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
      usuarioResponsable: 'Franklin (Admin)',
      sucursalAnterior: this.maquinaSeleccionada.agencia,
      bahiaAnterior: this.maquinaSeleccionada.bahia,
      sucursalNueva: this.transferencia.sucursalNueva,
      bahiaNueva: this.transferencia.bahiaNueva,
      motivo: this.transferencia.motivo
    };

    this.movimientoService.registrarMovimiento(mov).subscribe(() => {
      this.maquinaSeleccionada!.agencia = this.transferencia.sucursalNueva;
      this.maquinaSeleccionada!.bahia = this.transferencia.bahiaNueva;
      this.toastService.success('Transferencia Exitosa', `Maquinaria ${mov.maquinaCodigo} trasladada a ${mov.sucursalNueva}`);
      this.modalTransferirOpen = false;
    });
  }

  guardarNuevaMaquinaria() {
    if (!this.nuevaMaquina.codigo || !this.nuevaMaquina.nombre) {
      this.toastService.warning('Datos Incompletos', 'Ingrese el código y el nombre del equipo.');
      return;
    }

    this.maquinariaService.crearMaquinaria(this.nuevaMaquina).subscribe(creada => {
      this.toastService.success('Activo Guardado', `Equipo ${creada.codigo} registrado exitosamente.`);
      this.modalCrearOpen = false;
    });
  }

  reportarFallo() {
    if (!this.maquinaSeleccionada) return;
    this.nuevoIncidente = {
      tipo: 'Falla eléctrica',
      prioridad: 'Alta',
      descripcion: ''
    };
    this.modalReportarOpen = true;
  }

  programarMantenimiento() {
    if (!this.maquinaSeleccionada) return;
    const user = this.authService.getCurrentUser();
    this.nuevoMantenimiento = {
      tipo: 'Preventivo',
      fecha: new Date().toISOString().substring(0, 10),
      tecnico: user ? `${user.nombre} ${user.apellido}` : 'Esteban Torres',
      costo: 0,
      descripcion: ''
    };
    this.modalProgramarOpen = true;
  }

  guardarReporteFallo() {
    if (!this.maquinaSeleccionada) return;
    if (!this.nuevoIncidente.descripcion.trim()) {
      this.toastService.warning('Descripción Requerida', 'Escriba el fallo presentado por la máquina.');
      return;
    }

    const usuario = this.authService.getCurrentUser();
    const reportadoPor = usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Operador';

    const registro: Omit<Incidente, 'id'> = {
      codigoIncidente: '',
      maquina: this.maquinaSeleccionada.nombre,
      agencia: this.maquinaSeleccionada.agencia,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
      tipo: this.nuevoIncidente.tipo,
      prioridad: this.nuevoIncidente.prioridad,
      estado: 'Pendiente',
      descripcion: this.nuevoIncidente.descripcion.trim(),
      reportadoPor
    };

    this.incidenteService.crearIncidente(registro).subscribe(creado => {
      this.incidentesMaquina = [creado, ...this.incidentesMaquina];
      this.toastService.success('Reporte Creado', `Incidente ${creado.codigoIncidente} registrado en estado Pendiente.`);
      this.modalReportarOpen = false;
    });
  }

  guardarProgramacionMantenimiento() {
    if (!this.maquinaSeleccionada) return;
    if (!this.nuevoMantenimiento.descripcion.trim() || !this.nuevoMantenimiento.tecnico.trim()) {
      this.toastService.warning('Campos Requeridos', 'Complete técnico y descripción del trabajo.');
      return;
    }

    const registro: Omit<Mantenimiento, 'id'> = {
      maquina: this.maquinaSeleccionada.nombre,
      tipo: this.nuevoMantenimiento.tipo,
      fecha: this.nuevoMantenimiento.fecha,
      tecnico: this.nuevoMantenimiento.tecnico.trim(),
      estado: 'Programado',
      costo: Number(this.nuevoMantenimiento.costo) || 0,
      descripcion: this.nuevoMantenimiento.descripcion.trim(),
      agencia: this.maquinaSeleccionada.agencia
    };

    this.mantenimientoService.registrarMantenimiento(registro).subscribe(creado => {
      this.mantenimientosMaquina = [creado, ...this.mantenimientosMaquina];
      this.toastService.success('Mantenimiento Agendado', `Visita programada para ${creado.maquina} el ${creado.fecha}.`);
      this.modalProgramarOpen = false;
    });
  }
}

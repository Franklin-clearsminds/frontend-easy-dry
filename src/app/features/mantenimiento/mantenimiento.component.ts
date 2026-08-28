import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MantenimientoMockService } from '../../core/services/mantenimiento-mock.service';
import { MaquinariaMockService } from '../../core/services/maquinaria-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { Mantenimiento, Maquinaria } from '../../core/models';
import { Role } from '../../core/models/roles.model';
import { DEMO_CREDENTIALS } from '../../core/services/auth.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Top Title & Action Bar -->
      @if (!hideHeader) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Plan de Mantenimiento Preventivo & Correctivo</h1>
            <p class="text-slate-500 text-xs mt-1">Programación de intervenciones técnicas, calendario de visitas y presupuesto de repuestos.</p>
          </div>
          <button 
            (click)="modalCrearOpen = true"
            class="px-4 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs self-start sm:self-auto">
            <i-lucide name="calendar-clock" class="w-4 h-4"></i-lucide>
            <span>Agendar Mantenimiento</span>
          </button>
        </div>
      }

      <!-- Calendar / Visual Timeline Banner -->
      <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry space-y-4">
        <h3 class="font-bold text-slate-900 text-base font-outfit flex items-center gap-2">
          <i-lucide name="calendar-clock" class="w-5 h-5 text-easydry-blue"></i-lucide>
          <span>Línea de Tiempo de Intervenciones (Julio - Agosto 2026)</span>
        </h3>

        <!-- Calendar Days Grid Bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          @for (day of diasCalendario; track day.fecha) {
            <div 
              class="p-3.5 rounded-xl border flex flex-col justify-between transition-all"
              [ngClass]="{
                'bg-easydry-blue/10 border-easydry-blue text-easydry-blue font-bold': day.tieneMantenimiento,
                'bg-slate-50 border-slate-200 text-slate-600': !day.tieneMantenimiento
              }">
              <div class="flex items-center justify-between text-xs">
                <span class="font-mono font-bold">{{ day.dia }}</span>
                <span class="text-[10px] uppercase font-bold">{{ day.nombreDia }}</span>
              </div>
              <p class="text-[11px] font-medium mt-2 truncate">
                {{ day.evento || 'Sin eventos' }}
              </p>
            </div>
          }
        </div>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="true" 
        [showOperador]="false"
        [showBahia]="true"
        [showEstado]="true"
        [showFechas]="true"
        [listaEstados]="['Todos', 'Programado', 'Completado']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Mantenimientos Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-base font-outfit">Registro General de Mantenimientos</h3>
          <span class="text-xs text-slate-500 font-semibold">Total programado: {{ mantenimientosFiltrados.length }}</span>
        </div>

        <!-- Desktop Table View -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Fecha Programada</th>
                <th class="py-3.5 px-4">Maquinaria</th>
                <th class="py-3.5 px-4">Tipo</th>
                <th class="py-3.5 px-4">Técnico Certificado</th>
                <th class="py-3.5 px-4">Estado</th>
                <th class="py-3.5 px-4">Descripción</th>
                @if (puedeAsignar) {
                  <th class="py-3.5 px-4">Acciones</th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (m of paginatedMantenimientos; track m.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4 text-xs font-mono font-bold text-easydry-blue">
                    {{ m.fecha }}
                  </td>
                  <td class="py-3.5 px-4 font-bold text-slate-900 text-xs">
                    {{ m.maquina }}
                  </td>
                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      [ngClass]="{
                        'bg-blue-100 text-blue-800': m.tipo === 'Preventivo',
                        'bg-rose-100 text-rose-800': m.tipo === 'Correctivo',
                        'bg-indigo-100 text-indigo-800': m.tipo === 'Calibración'
                      }">
                      {{ m.tipo }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-700 font-medium">
                    {{ m.tecnico }}
                  </td>
                  <td class="py-3.5 px-4">
                    <span 
                      class="px-3 py-1 rounded-full text-xs font-bold"
                      [ngClass]="{
                        'bg-amber-100 text-amber-800': m.estado === 'Programado',
                        'bg-easydry-blue/15 text-easydry-blue': m.estado === 'En Proceso',
                        'bg-easydry-green/20 text-easydry-green-dark': m.estado === 'Completado'
                      }">
                      {{ m.estado }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                    {{ m.descripcion }}
                  </td>
                  @if (puedeAsignar) {
                    <td class="py-3.5 px-4">
                      @if (m.estado !== 'Completado' && m.estado !== 'Cancelado') {
                        <div class="flex flex-col gap-1.5">
                          @if (m.tecnicoAsignadoNombre) {
                            <span class="text-[10px] font-semibold text-violet-700">{{ m.tecnicoAsignadoNombre }}</span>
                          }
                          <div class="flex flex-wrap gap-1">
                            <button
                              (click)="openModalAsignar(m); $event.stopPropagation()"
                              class="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-[10px]">
                              {{ m.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}
                            </button>
                            @if (m.tecnicoAsignadoId) {
                              <button
                                (click)="cancelarAsignacionMantenimiento(m); $event.stopPropagation()"
                                class="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg text-[10px]">
                                Cancelar
                              </button>
                            }
                          </div>
                        </div>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View -->
        <div class="block lg:hidden divide-y divide-slate-100">
          @for (m of paginatedMantenimientos; track m.id) {
            <div class="p-4 hover:bg-slate-50 transition-colors cursor-pointer" (click)="abrirDetalle(m)">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2 py-0.5 rounded-md">
                    {{ m.fecha }}
                  </span>
                  <div class="font-bold text-slate-900 text-sm mt-1.5">{{ m.maquina }}</div>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-center max-w-[80px]"
                  [ngClass]="{
                    'bg-amber-100 text-amber-800': m.estado === 'Programado',
                    'bg-easydry-blue/15 text-easydry-blue': m.estado === 'En Proceso',
                    'bg-easydry-green/20 text-easydry-green-dark': m.estado === 'Completado'
                  }">
                  {{ m.estado }}
                </span>
              </div>
              
              <div class="flex items-center justify-between mt-3 text-xs">
                <span class="px-2 py-0.5 rounded-md font-semibold text-[10px]"
                  [ngClass]="{
                    'bg-blue-100 text-blue-800': m.tipo === 'Preventivo',
                    'bg-rose-100 text-rose-800': m.tipo === 'Correctivo',
                    'bg-indigo-100 text-indigo-800': m.tipo === 'Calibración'
                  }">
                  {{ m.tipo }}
                </span>
                <div class="font-semibold text-slate-700 truncate max-w-[150px]">
                  {{ m.tecnico }}
                </div>
              </div>
              @if (puedeAsignar && m.estado !== 'Completado' && m.estado !== 'Cancelado') {
                <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100" (click)="$event.stopPropagation()">
                  <button
                    (click)="openModalAsignar(m)"
                    class="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-[10px]">
                    {{ m.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}
                  </button>
                  @if (m.tecnicoAsignadoId) {
                    <button
                      (click)="cancelarAsignacionMantenimiento(m)"
                      class="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg text-[10px]">
                      Cancelar
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
        
        <app-pagination 
          [totalItems]="mantenimientosFiltrados.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal Detalle Mantenimiento -->
      <app-modal 
        [isOpen]="modalDetalleOpen" 
        [title]="'Detalle de Mantenimiento'" 
        icon="wrench"
        (close)="modalDetalleOpen = false">
        
        @if (mantenimientoDetalleSeleccionado) {
          <div class="space-y-4">
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Maquinaria</span>
              <span class="font-bold text-slate-900 text-sm block">{{ mantenimientoDetalleSeleccionado.maquina }}</span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Fecha Programada</span>
                <span class="font-mono font-extrabold text-easydry-blue block">{{ mantenimientoDetalleSeleccionado.fecha }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Estado</span>
                <span class="font-extrabold" [ngClass]="{
                  'text-amber-600': mantenimientoDetalleSeleccionado.estado === 'Programado',
                  'text-easydry-blue': mantenimientoDetalleSeleccionado.estado === 'En Proceso',
                  'text-easydry-green-dark': mantenimientoDetalleSeleccionado.estado === 'Completado'
                }">{{ mantenimientoDetalleSeleccionado.estado }}</span>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-easydry-blue/5 rounded-xl border border-easydry-blue/10">
                <span class="block text-[10px] text-easydry-blue font-bold uppercase mb-1">Tipo de Intervención</span>
                <span class="font-bold text-slate-800 block">{{ mantenimientoDetalleSeleccionado.tipo }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Técnico / Especialista</span>
                <span class="font-bold text-slate-800 block">{{ mantenimientoDetalleSeleccionado.tecnico }}</span>
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Descripción del Trabajo</span>
              <p class="text-slate-700 leading-relaxed">{{ mantenimientoDetalleSeleccionado.descripcion }}</p>
            </div>
          </div>
        }

        <div modal-footer class="flex flex-col gap-2 w-full">
          @if (mantenimientoDetalleSeleccionado && mantenimientoDetalleSeleccionado.estado !== 'Completado') {
             <button
                (click)="modalDetalleOpen = false"
                class="w-full px-4 py-2.5 bg-easydry-blue text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm">
                <i-lucide name="wrench" class="w-4 h-4"></i-lucide> Iniciar / Completar Tarea
             </button>
          }
          <button (click)="modalDetalleOpen = false" class="w-full px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs mt-1">Cerrar Detalle</button>
        </div>
      </app-modal>

      <!-- Modal Agendar Mantenimiento -->
      <app-modal 
        [isOpen]="modalCrearOpen" 
        title="Agendar Mantenimiento Técnico" 
        icon="calendar-clock"
        (close)="modalCrearOpen = false">
        
        <form (ngSubmit)="guardarMantenimiento()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Maquinaria a Servir</label>
            <select [(ngModel)]="nuevoMantenimiento.maquina" name="maquina" class="w-full p-2.5 border rounded-xl text-sm" required>
              @for (mq of listaMaquinas; track mq.id) {
                <option [value]="mq.nombre">{{ mq.codigo }} - {{ mq.nombre }}</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Intervención</label>
              <select [(ngModel)]="nuevoMantenimiento.tipo" name="tipo" class="w-full p-2.5 border rounded-xl text-sm">
                <option value="Preventivo">Preventivo</option>
                <option value="Correctivo">Correctivo</option>
                <option value="Calibración">Calibración</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Programada</label>
              <input type="date" [(ngModel)]="nuevoMantenimiento.fecha" name="fecha" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Técnico / Especialista</label>
              <input type="text" [(ngModel)]="nuevoMantenimiento.tecnico" name="tecnico" placeholder="Ing. Marco Andrade" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Costo Estimado ($)</label>
              <input type="number" [(ngModel)]="nuevoMantenimiento.costo" name="costo" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Trabajo</label>
            <textarea [(ngModel)]="nuevoMantenimiento.descripcion" name="descripcion" rows="3" placeholder="Detalle de repuestos y tareas..." class="w-full p-2.5 border rounded-xl text-sm" required></textarea>
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalCrearOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarMantenimiento()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">Guardar Mantenimiento</button>
        </div>
      </app-modal>

      <app-modal
        [isOpen]="modalAsignarOpen"
        [title]="mantenimientoAsignar?.tecnicoAsignadoId ? 'Reasignar Mantenimiento' : 'Asignar Mantenimiento'"
        icon="user-cog"
        (close)="modalAsignarOpen = false">
        @if (mantenimientoAsignar) {
          <div class="space-y-4">
            <p class="text-xs text-slate-600">
              <strong class="text-slate-900">{{ mantenimientoAsignar.maquina }}</strong>
              · {{ mantenimientoAsignar.fecha }}
            </p>
            <p class="text-xs text-slate-500">
              Ejecuta la tarea tú mismo o delega a un técnico de campo.
            </p>
            @if (mantenimientoAsignar.tecnicoAsignadoNombre) {
              <div class="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800">
                Asignado actualmente a: <strong>{{ mantenimientoAsignar.tecnicoAsignadoNombre }}</strong>
              </div>
            }
            <button
              type="button"
              (click)="asignarMantenimientoAEjecutor(gestorActual.id, gestorActual.nombreCompleto)"
              class="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-extrabold rounded-xl text-xs">
              {{ etiquetaEjecutarYo }}
            </button>
            <p class="text-[10px] font-bold text-slate-400 uppercase">Delegar a técnico</p>
            @for (tec of tecnicosDisponibles; track tec.email) {
              <button
                type="button"
                (click)="asignarMantenimientoAEjecutor(tec.id, tec.nombre)"
                class="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs">
                {{ tec.nombre }}
              </button>
            }
            @if (mantenimientoAsignar.tecnicoAsignadoId) {
              <button
                type="button"
                (click)="cancelarAsignacionMantenimiento(mantenimientoAsignar)"
                class="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-xl text-xs border border-rose-200">
                Cancelar asignación
              </button>
            }
          </div>
        }
      </app-modal>

    </div>
  `
})
export class MantenimientoComponent implements OnInit {
  @Input() hideHeader = false;
  mantenimientos: Mantenimiento[] = [];
  listaMaquinas: Maquinaria[] = [];
  modalCrearOpen = false;
  modalAsignarOpen = false;
  mantenimientoAsignar?: Mantenimiento;

  gestorActual = { id: 0, nombreCompleto: '' };

  tecnicosDisponibles = DEMO_CREDENTIALS
    .filter(c => c.role === Role.TECNICO)
    .map(c => ({
      id: DEMO_CREDENTIALS.indexOf(c) + 1,
      nombre: c.nombre,
      email: c.email,
    }));
  
  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    this.currentPage = 1;
  }

  get mantenimientosFiltrados() {
    let resultados = this.mantenimientos;
    const user = this.authService.getCurrentUser();

    if (this.esTecnico && user) {
      resultados = resultados.filter(m => m.tecnicoAsignadoId === user.id);
    }

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(m => m.estado === this.filtrosGlobales.estado);
    }
    
    return resultados;
  }

  get esGestor(): boolean {
    return this.authService.hasRole(Role.COORD_MANTENIMIENTO);
  }

  get puedeAsignar(): boolean {
    return this.esGestor || this.authService.hasRole(Role.SUPER_ADMIN);
  }

  get etiquetaEjecutarYo(): string {
    if (this.authService.hasRole(Role.SUPER_ADMIN)) {
      return 'Ejecutar yo (Super Administrador)';
    }
    return 'Ejecutar yo (Gestor Técnico)';
  }

  get esTecnico(): boolean {
    return this.authService.hasRole(Role.TECNICO);
  }

  openModalAsignar(m: Mantenimiento) {
    this.mantenimientoAsignar = m;
    this.modalAsignarOpen = true;
  }

  asignarMantenimientoAEjecutor(tecnicoId: number, tecnicoNombre: string) {
    const user = this.authService.getCurrentUser();
    if (!this.mantenimientoAsignar || !user) return;

    this.mantenimientoService.asignarMantenimiento(
      this.mantenimientoAsignar.id,
      tecnicoId,
      tecnicoNombre,
      user.id,
      `${user.nombre} ${user.apellido}`.trim()
    ).subscribe(updated => {
      if (updated) {
        this.toastService.success('Asignación registrada', `Mantenimiento delegado a ${tecnicoNombre}`);
        this.modalAsignarOpen = false;
      }
    });
  }

  cancelarAsignacionMantenimiento(m: Mantenimiento) {
    this.mantenimientoService.cancelarAsignacion(m.id).subscribe(updated => {
      if (updated) {
        this.toastService.success('Asignación cancelada', `El mantenimiento de ${updated.maquina} quedó sin asignar`);
        this.modalAsignarOpen = false;
      }
    });
  }

  modalDetalleOpen = false;
  mantenimientoDetalleSeleccionado?: Mantenimiento;

  currentPage = 1;
  pageSize = 5;

  diasCalendario = [
    { fecha: '2026-07-22', dia: '22', nombreDia: 'Mié', tieneMantenimiento: false, evento: '' },
    { fecha: '2026-07-23', dia: '23', nombreDia: 'Jue', tieneMantenimiento: false, evento: '' },
    { fecha: '2026-07-24', dia: '24', nombreDia: 'Vie', tieneMantenimiento: true, evento: 'AS-002 Correctivo' },
    { fecha: '2026-07-25', dia: '25', nombreDia: 'Sáb', tieneMantenimiento: false, evento: '' },
    { fecha: '2026-07-26', dia: '26', nombreDia: 'Dom', tieneMantenimiento: false, evento: '' },
    { fecha: '2026-07-27', dia: '27', nombreDia: 'Lun', tieneMantenimiento: false, evento: '' },
    { fecha: '2026-08-01', dia: '01', nombreDia: 'Sáb', tieneMantenimiento: true, evento: 'HD-001 Preventivo' },
  ];

  nuevoMantenimiento = {
    maquina: 'Hidrolavadora Ecológica HD-001',
    tipo: 'Preventivo' as Mantenimiento['tipo'],
    fecha: '2026-08-05',
    tecnico: 'Sin asignar',
    estado: 'Programado' as Mantenimiento['estado'],
    costo: 120.00,
    descripcion: ''
  };

  private mantenimientoService = inject(MantenimientoMockService);
  private maquinariaService = inject(MaquinariaMockService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);

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

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.gestorActual = {
        id: user.id,
        nombreCompleto: `${user.nombre} ${user.apellido}`.trim(),
      };
    }

    this.mantenimientoService.mantenimientos$.subscribe(list => {
      if (user && this.debeFiltrarPorSucursal(user)) {
        this.mantenimientos = list.filter(
          m => m.agencia && m.agencia.toLowerCase() === user.sucursalNombre!.toLowerCase()
        );
      } else {
        this.mantenimientos = list;
      }
    });

    this.maquinariaService.getMaquinaria().subscribe(list => {
      if (user && this.debeFiltrarPorSucursal(user)) {
        this.listaMaquinas = list.filter(
          m => m.agencia.toLowerCase() === user.sucursalNombre!.toLowerCase()
        );
      } else {
        this.listaMaquinas = list;
      }
    });
  }

  get paginatedMantenimientos() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.mantenimientosFiltrados.slice(start, start + this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  guardarMantenimiento() {
    if (!this.nuevoMantenimiento.descripcion) {
      this.toastService.warning('Campos Requeridos', 'Por favor ingrese la descripción del trabajo.');
      return;
    }

    this.mantenimientoService.registrarMantenimiento(this.nuevoMantenimiento).subscribe(creado => {
      this.toastService.success('Mantenimiento Agendado', `Visita agendada para ${creado.maquina} el ${creado.fecha}`);
      this.modalCrearOpen = false;
    });
  }
  
  abrirDetalle(mantenimiento: Mantenimiento) {
    this.mantenimientoDetalleSeleccionado = mantenimiento;
    this.modalDetalleOpen = true;
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MantenimientoMockService } from '../../core/services/mantenimiento-mock.service';
import { MaquinariaMockService } from '../../core/services/maquinaria-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { Mantenimiento, Maquinaria } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Top Title & Action Bar -->
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

      <!-- Mantenimientos Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-base font-outfit">Registro General de Mantenimientos</h3>
          <span class="text-xs text-slate-500 font-semibold">Total programado: {{ mantenimientos.length }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Fecha Programada</th>
                <th class="py-3.5 px-4">Maquinaria</th>
                <th class="py-3.5 px-4">Tipo</th>
                <th class="py-3.5 px-4">Técnico Certificado</th>
                <th class="py-3.5 px-4">Estado</th>
                <th class="py-3.5 px-4">Descripción</th>
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
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <app-pagination 
          [totalItems]="mantenimientos.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

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

    </div>
  `
})
export class MantenimientoComponent implements OnInit {
  mantenimientos: Mantenimiento[] = [];
  listaMaquinas: Maquinaria[] = [];
  modalCrearOpen = false;

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
    tecnico: 'Ing. Marco Andrade',
    estado: 'Programado' as Mantenimiento['estado'],
    costo: 120.00,
    descripcion: ''
  };

  private mantenimientoService = inject(MantenimientoMockService);
  private maquinariaService = inject(MaquinariaMockService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();

    this.mantenimientoService.getMantenimientos().subscribe(list => {
      if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
        this.mantenimientos = list.filter(m => m.agencia && m.agencia.toLowerCase() === user.sucursalNombre!.toLowerCase());
      } else {
        this.mantenimientos = list;
      }
    });

    this.maquinariaService.getMaquinaria().subscribe(list => {
      if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
        this.listaMaquinas = list.filter(m => m.agencia.toLowerCase() === user.sucursalNombre!.toLowerCase());
      } else {
        this.listaMaquinas = list;
      }
    });
  }

  get paginatedMantenimientos() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.mantenimientos.slice(start, end);
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
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { IncidenteMockService } from '../../core/services/incidente-mock.service';
import { MaquinariaMockService } from '../../core/services/maquinaria-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { Incidente, Maquinaria } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-incidentes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold mb-2">
            <i-lucide name="alert-triangle" class="w-3.5 h-3.5"></i-lucide>
            <span>Gestión de Desperfectos e Incidentes de Maquinaria</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Reporte y Solución de Desperfectos</h1>
          <p class="text-slate-500 text-xs mt-1">Registro de fallas en equipos de bahía y resolución técnica por el rol Técnico/Gerente (Pendiente ➔ Solucionado).</p>
        </div>

        <button 
          (click)="modalReportarOpen = true"
          class="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-2">
          <i-lucide name="plus" class="w-4 h-4"></i-lucide>
          <span>Reportar Nuevo Desperfecto</span>
        </button>
      </div>

      <!-- Incident Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (inc of paginatedIncidentes; track inc.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 flex flex-col justify-between space-y-4 hover:shadow-easydry-hover transition-all">
            
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="font-mono font-extrabold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {{ inc.codigoIncidente }}
                </span>
                
                <span 
                  class="px-2.5 py-1 rounded-full text-[11px] font-extrabold"
                  [ngClass]="{
                    'bg-rose-100 text-rose-800 border border-rose-300': inc.estado === 'Pendiente',
                    'bg-amber-100 text-amber-800 border border-amber-300': inc.estado === 'En Solución',
                    'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40': inc.estado === 'Solucionado'
                  }">
                  {{ inc.estado }}
                </span>
              </div>

              <h3 class="font-bold text-slate-900 text-base font-outfit">{{ inc.maquina }}</h3>
              <p class="text-xs text-slate-500 font-semibold">{{ inc.agencia }} • Reportado: {{ inc.fecha }}</p>

              <div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                <p class="text-slate-700 font-medium"><strong>Problema:</strong> {{ inc.descripcion }}</p>
                <p class="text-slate-500 text-[11px]">Reportado por: <strong>{{ inc.reportadoPor }}</strong></p>
              </div>

              @if (inc.estado === 'Solucionado') {
                <div class="mt-3 p-3 bg-easydry-green/10 border border-easydry-green/30 rounded-xl text-xs space-y-1">
                  <span class="font-bold text-easydry-green-dark uppercase text-[10px] block">Solución Técnica Aplicada:</span>
                  <p class="text-slate-800 font-medium">{{ inc.observacionSolucion }}</p>
                  <p class="text-[10px] text-slate-500 font-mono mt-1">Resuelto por: {{ inc.solucionadoPor }} ({{ inc.fechaSolucion }})</p>
                </div>
              }
            </div>

            <!-- Resolution Action Button for Technician / Gerente -->
            @if (inc.estado !== 'Solucionado') {
              <div class="pt-3 border-t border-slate-100">
                <button 
                  (click)="openModalSolucionar(inc)"
                  class="w-full py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                  <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide>
                  <span>Marcar como Solucionado</span>
                </button>
              </div>
            }

          </div>
        }
      </div>

      <div class="mt-6">
        <app-pagination 
          [totalItems]="incidentes.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal Reportar Desperfecto -->
      <app-modal 
        [isOpen]="modalReportarOpen" 
        title="Reportar Desperfecto en Maquinaria" 
        icon="alert-triangle"
        (close)="modalReportarOpen = false">
        
        <form (ngSubmit)="guardarReporte()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Equipo de Bahía</label>
            <select [(ngModel)]="nuevoIncidente.maquina" name="maquina" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
              @for (m of maquinasDisponibles; track m.id) {
                <option [value]="m.nombre">{{ m.codigo }} - {{ m.nombre }} ({{ m.agencia }})</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Falla / Desperfecto</label>
            <select [(ngModel)]="nuevoIncidente.tipo" name="tipo" class="w-full p-2.5 border rounded-xl text-xs font-bold">
              <option value="Fuga de agua">Fuga de agua</option>
              <option value="Falla eléctrica">Falla eléctrica</option>
              <option value="Problema hidráulico">Problema hidráulico</option>
              <option value="Baja presión">Baja presión</option>
              <option value="Manguera dañada">Manguera dañada</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Problema</label>
            <textarea [(ngModel)]="nuevoIncidente.descripcion" name="descripcion" placeholder="Describa el fallo en la máquina..." rows="3" class="w-full p-2.5 border rounded-xl text-xs font-medium" required></textarea>
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalReportarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarReporte()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs">Registrar Reporte</button>
        </div>
      </app-modal>

      <!-- Modal Solucionar Desperfecto -->
      <app-modal 
        [isOpen]="modalSolucionarOpen" 
        [title]="'Resolver Desperfecto: ' + (incidenteSolucionar?.codigoIncidente || '')" 
        icon="check-circle-2"
        (close)="modalSolucionarOpen = false">
        
        <div class="space-y-4">
          <div class="p-3 bg-slate-50 rounded-xl border text-xs">
            <p class="font-bold text-slate-800">Equipo:</p>
            <p class="text-slate-600">{{ incidenteSolucionar?.maquina }}</p>
            <p class="font-bold text-slate-800 mt-2">Problema:</p>
            <p class="text-slate-600">{{ incidenteSolucionar?.descripcion }}</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Detalle de la Solución Aplicada</label>
            <textarea 
              [(ngModel)]="observacionSolucion" 
              placeholder="ej. Reemplazo de bomba secundaria y ajuste de contactos térmicos..." 
              rows="3" 
              class="w-full p-3 border rounded-xl text-xs font-semibold">
            </textarea>
          </div>
        </div>

        <div modal-footer>
          <button (click)="modalSolucionarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="confirmarSolucion()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs">Marcar como SOLUCIONADO</button>
        </div>
      </app-modal>

    </div>
  `
})
export class IncidentesComponent implements OnInit {
  incidentes: Incidente[] = [];
  maquinasDisponibles: Maquinaria[] = [];
  incidenteSolucionar?: Incidente;

  currentPage = 1;
  pageSize = 6;

  modalReportarOpen = false;
  modalSolucionarOpen = false;
  observacionSolucion = '';

  nuevoIncidente = {
    maquina: 'Aspiradora Industrial AS-002',
    agencia: 'EasyDry Quito Norte',
    tipo: 'Falla eléctrica' as Incidente['tipo'],
    prioridad: 'Alta' as Incidente['prioridad'],
    descripcion: ''
  };

  private incidenteService = inject(IncidenteMockService);
  private maquinariaService = inject(MaquinariaMockService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    
    if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
      this.nuevoIncidente.agencia = user.sucursalNombre;
    }

    this.incidenteService.getIncidentes().subscribe(list => {
      if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
        this.incidentes = list.filter(i => i.agencia.toLowerCase() === user.sucursalNombre!.toLowerCase());
      } else {
        this.incidentes = list;
      }
    });

    this.maquinariaService.getMaquinaria().subscribe(list => {
      if (user && user.role !== 'SUPER_ADMIN' && user.sucursalNombre) {
        this.maquinasDisponibles = list.filter(m => m.agencia.toLowerCase() === user.sucursalNombre!.toLowerCase());
      } else {
        this.maquinasDisponibles = list;
      }
      
      if (this.maquinasDisponibles.length > 0) {
        this.nuevoIncidente.maquina = this.maquinasDisponibles[0].nombre;
      }
    });
  }

  get paginatedIncidentes() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.incidentes.slice(start, end);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  guardarReporte() {
    if (!this.nuevoIncidente.descripcion) {
      this.toastService.warning('Descripción Requerida', 'Escriba el fallo presentado por la máquina.');
      return;
    }

    const usuario = this.authService.getCurrentUser()?.nombre || 'Carlos Mendoza (Gerente)';
    const registro: Omit<Incidente, 'id'> = {
      codigoIncidente: `INC-2026-00${this.incidentes.length + 1}`,
      maquina: this.nuevoIncidente.maquina,
      agencia: this.nuevoIncidente.agencia,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
      tipo: this.nuevoIncidente.tipo,
      prioridad: this.nuevoIncidente.prioridad,
      estado: 'Pendiente',
      descripcion: this.nuevoIncidente.descripcion,
      reportadoPor: usuario
    };

    this.incidenteService.crearIncidente(registro).subscribe((creado: Incidente) => {
      this.toastService.success('Reporte Creado', `Incidente ${creado.codigoIncidente} registrado en estado Pendiente.`);
      this.modalReportarOpen = false;
    });
  }

  openModalSolucionar(inc: Incidente) {
    this.incidenteSolucionar = inc;
    this.observacionSolucion = '';
    this.modalSolucionarOpen = true;
  }

  confirmarSolucion() {
    if (!this.incidenteSolucionar || !this.observacionSolucion.trim()) {
      this.toastService.warning('Detalle Requerido', 'Escriba la solución técnica aplicada.');
      return;
    }

    const usuario = this.authService.getCurrentUser()?.nombre || 'Esteban Torres (Técnico)';
    const hoy = new Date().toISOString().replace('T', ' ').substring(0, 16);

    this.incidenteSolucionar.estado = 'Solucionado';
    this.incidenteSolucionar.solucionadoPor = usuario;
    this.incidenteSolucionar.fechaSolucion = hoy;
    this.incidenteSolucionar.observacionSolucion = this.observacionSolucion;

    this.toastService.success('Desperfecto Solucionado', `Incidente ${this.incidenteSolucionar.codigoIncidente} resuelto por ${usuario}.`);
    this.modalSolucionarOpen = false;
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ServicioLavadoMockService } from '../../infrastructure/mocks/servicio-lavado-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { VehiculoServicio } from '../../domain';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-aprobaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header Banner -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-green/20 text-easydry-green-dark text-xs font-bold mb-2">
            <i-lucide name="shield-check" class="w-3.5 h-3.5"></i-lucide>
            <span>Módulo de Cierre Diaria y Aprobación Gerencial</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Aprobación Diaria del Gerente de Local</h1>
          <p class="text-slate-500 text-xs mt-1">Revisión de vehículos atendidos hoy, evidencias en video, horarios y confirmación para cierre diario de operaciones.</p>
        </div>

        <div class="flex items-center gap-3">
          <button 
            (click)="aprobarTodos()"
            class="px-5 py-3 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2">
            <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide>
            <span>Aprobar Todos los Servicios del Día</span>
          </button>
        </div>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="true" 
        [showOperador]="true"
        [showBahia]="false"
        [showEstado]="true"
        [showFechas]="false"
        [listaEstados]="['Todos', 'FINALIZADO', 'APROBADO', 'RECHAZADO']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Day Status Summary Card -->
      <div class="bg-gradient-to-r from-easydry-blue to-easydry-blue-dark p-6 rounded-2xl text-white shadow-xl flex items-center justify-between">
        <div class="space-y-1">
          <p class="text-xs text-slate-300 uppercase font-bold tracking-wider">Estado de Cierre Operativo</p>
          <h3 class="text-xl font-bold font-outfit">
            @if (esDiaCerrado) {
              <span class="text-easydry-lime font-extrabold flex items-center gap-2">
                <i-lucide name="check-circle-2" class="w-6 h-6"></i-lucide>
                DÍA CERRADO (100% SERVICIOS APROBADOS)
              </span>
            } @else {
              <span class="text-amber-300 font-extrabold flex items-center gap-2">
                <i-lucide name="clock" class="w-6 h-6 animate-pulse"></i-lucide>
                DÍA EN REVISIÓN (PENDIENTE APROBACIÓN DE GERENCIA)
              </span>
            }
          </h3>
          <p class="text-xs text-slate-200">Sucursal: <strong>EasyDry Quito Norte</strong> • Fecha: <strong>22 de Julio 2026</strong></p>
        </div>

        <div class="text-right">
          <span class="text-3xl font-extrabold font-outfit text-easydry-lime">{{ totalAprobados }} / {{ serviciosDelDia.length }}</span>
          <span class="text-xs text-slate-300 block font-semibold">Servicios Aprobados</span>
        </div>
      </div>

      <!-- Services Grid for Manager Inspection -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (item of paginatedServicios; track item.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-4 flex flex-col justify-between hover:border-easydry-blue/30 transition-colors">
            
            <div>
              <!-- Top Row OT & Status -->
              <div class="flex items-center justify-between mb-3">
                <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2.5 py-1 rounded-lg">
                  {{ item.ordenTrabajoOT || 'OT-9800' }}
                </span>
                
                <span 
                  class="px-2.5 py-1 rounded-full text-[11px] font-extrabold"
                  [ngClass]="{
                    'bg-amber-100 text-amber-800 border border-amber-300': item.estado === 'EN PROCESO',
                    'bg-easydry-blue/15 text-easydry-blue border border-easydry-blue/30': item.estado === 'FINALIZADO',
                    'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40': item.estado === 'APROBADO',
                    'bg-rose-100 text-rose-800 border border-rose-300': item.estado === 'RECHAZADO'
                  }">
                  {{ item.estado }}
                </span>
              </div>

              <!-- Vehicle Detail -->
              <h3 class="font-bold text-slate-900 text-base font-outfit">{{ item.marca }} {{ item.modelo }}</h3>
              <p class="text-xs font-mono font-extrabold text-easydry-blue">{{ item.placa }} • {{ item.color }} ({{ item.anio }})</p>

              <!-- Service Type -->
              <div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400 font-bold uppercase text-[10px]">Servicio:</span>
                  <span class="font-bold text-slate-900">{{ item.servicio }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-400 font-bold uppercase text-[10px]">Técnico:</span>
                  <span class="font-bold text-easydry-green-dark">{{ item.empleado }}</span>
                </div>
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-slate-400 font-bold uppercase text-[10px]">Horarios:</span>
                  <span class="text-slate-700 font-bold">{{ item.horaIngreso || '08:30' }} - {{ item.horaSalida || '09:30' }}</span>
                </div>
              </div>

              <!-- Gerente Observation if existing -->
              @if (item.observacionGerente) {
                <div class="mt-3 p-2.5 bg-easydry-green/10 border border-easydry-green/30 rounded-xl text-xs">
                  <span class="font-bold text-easydry-green-dark block text-[10px] uppercase">Observación Gerente:</span>
                  <p class="text-slate-800 font-medium">{{ item.observacionGerente }}</p>
                </div>
              }
            </div>

            <!-- Card Actions for Gerente -->
            <div class="pt-3 border-t border-slate-100 space-y-2">
              <button 
                (click)="verVideo(item)" 
                class="w-full py-2 bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                <i-lucide name="film" class="w-3.5 h-3.5 text-easydry-green"></i-lucide>
                <span>Inspeccionar Evidencia Vídeo</span>
              </button>

              @if (item.estado !== 'APROBADO') {
                <div class="grid grid-cols-2 gap-2">
                  <button 
                    (click)="aprobarIndividual(item)" 
                    class="py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-colors">
                    Aprobar
                  </button>
                  <button 
                    (click)="openModalRechazar(item)" 
                    class="py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs transition-colors">
                    Rechazar
                  </button>
                </div>
              }
            </div>

          </div>
        }
      </div>
      
      <div class="mt-6">
        <app-pagination 
          [totalItems]="serviciosParaAprobar.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal Rechazar Servicio -->
      <app-modal 
        [isOpen]="modalRechazarOpen" 
        [title]="'Rechazar Servicio: ' + (servicioRechazar?.placa || '')" 
        icon="alert-triangle"
        (close)="modalRechazarOpen = false">
        
        <div class="space-y-4">
          <p class="text-xs text-slate-600">Ingrese la observación de inconsistencia detectada en el servicio realizado:</p>
          <textarea 
            [(ngModel)]="motivoRechazo" 
            placeholder="ej. El detallado interior requiere repaso de aspirado en cajuela..." 
            rows="3" 
            class="w-full p-3 border rounded-xl text-xs font-semibold">
          </textarea>
        </div>

        <div modal-footer>
          <button (click)="modalRechazarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="confirmarRechazo()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs">Confirmar Rechazo</button>
        </div>
      </app-modal>

      <!-- Modal Reproductor Vídeo -->
      <app-modal 
        [isOpen]="modalVideoOpen" 
        [title]="'Inspección de Evidencia: ' + (servicioVideo?.placa || '')" 
        icon="film"
        (close)="modalVideoOpen = false">
        
        @if (servicioVideo) {
          <div class="space-y-4">
            <div class="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              <video 
                [src]="servicioVideo.videoUrl || servicioVideo.video || 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4'" 
                controls 
                autoplay 
                class="w-full h-full object-contain">
              </video>
            </div>
            <p class="text-xs text-slate-600 font-bold text-center">Vídeo de evidencia tomado en ingreso a bahía.</p>
          </div>
        }

        <div modal-footer>
          <button (click)="modalVideoOpen = false" class="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs">Cerrar Inspección</button>
        </div>
      </app-modal>

    </div>
  `
})
export class AprobacionesComponent implements OnInit {
  serviciosDelDia: VehiculoServicio[] = [];
  serviciosParaAprobar: VehiculoServicio[] = [];
  servicioSeleccionado?: VehiculoServicio;
  servicioRechazar?: VehiculoServicio;
  servicioVideo?: VehiculoServicio;

  currentPage = 1;
  pageSize = 5;

  modalRechazarOpen = false;
  modalVideoOpen = false;
  motivoRechazo = '';

  private servicioService = inject(ServicioLavadoMockService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  get totalAprobados() {
    return this.serviciosDelDia.filter(s => s.estado === 'APROBADO').length;
  }

  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  get serviciosFiltrados() {
    let resultados = this.serviciosDelDia;

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(s => s.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(s => s.agencia === this.filtrosGlobales.sucursal);
    }
    if (this.filtrosGlobales.operador !== 'Todos') {
      resultados = resultados.filter(s => s.empleado?.includes(this.filtrosGlobales.operador || ''));
    }

    return resultados;
  }

  get esDiaCerrado() {
    return this.serviciosDelDia.length > 0 && this.serviciosDelDia.every(s => s.estado === 'APROBADO');
  }

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    this.currentPage = 1;
  }

  ngOnInit(): void {
    this.servicioService.getServicios().subscribe(list => {
      this.serviciosDelDia = list;
      this.serviciosParaAprobar = list;
    });
  }

  aprobarIndividual(item: VehiculoServicio) {
    const gerente = this.authService.getCurrentUser()?.nombre || 'Carlos Mendoza (Gerente)';
    this.servicioService.aprobarServicioGerente(item.id, 'Servicio verificado y aprobado.', gerente).subscribe(res => {
      if (res) {
        this.toastService.success('Servicio Aprobado', `${item.placa} aprobado exitosamente.`);
      }
    });
  }

  openModalRechazar(item: VehiculoServicio) {
    this.servicioRechazar = item;
    this.motivoRechazo = '';
    this.modalRechazarOpen = true;
  }

  confirmarRechazo() {
    if (!this.servicioRechazar || !this.motivoRechazo.trim()) {
      this.toastService.warning('Observación Requerida', 'Escriba el motivo del rechazo.');
      return;
    }

    const gerente = this.authService.getCurrentUser()?.nombre || 'Carlos Mendoza (Gerente)';
    this.servicioService.rechazarServicioGerente(this.servicioRechazar.id, this.motivoRechazo, gerente).subscribe(res => {
      if (res) {
        this.toastService.error('Servicio Rechazado', `Servicio ${this.servicioRechazar?.placa} marcado como RECHAZADO.`);
        this.modalRechazarOpen = false;
      }
    });
  }

  get paginatedServicios() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.serviciosFiltrados.slice(start, start + this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  aprobarTodos() {
    const gerente = this.authService.getCurrentUser()?.nombre || 'Carlos Mendoza (Gerente)';
    this.servicioService.aprobarTodosLosServiciosDelDia('EasyDry Quito Norte', gerente).subscribe(() => {
      this.toastService.success('Cierre Diario Exitoso', 'Todos los servicios de hoy fueron APROBADOS. Día Cerrado.');
    });
  }

  verVideo(item: VehiculoServicio) {
    this.servicioVideo = item;
    this.modalVideoOpen = true;
  }
}

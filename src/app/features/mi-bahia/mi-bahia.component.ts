import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ServicioLavadoMockService } from '../../core/services/servicio-lavado-mock.service';
import { VehiculoServicio } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mi-bahia',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ModalComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Encabezado de Contexto del Operador -->
      <div class="bg-gradient-to-r from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep rounded-3xl p-6 text-white relative overflow-hidden">
        <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-green/20 text-easydry-lime border border-easydry-green/40 text-xs font-bold mb-3">
              <i-lucide name="map-pin" class="w-3.5 h-3.5"></i-lucide>
              <span>Mi Área de Trabajo</span>
            </div>
            <h1 class="text-2xl font-extrabold font-outfit">{{ user?.nombre }} {{ user?.apellido }}</h1>
            <p class="text-easydry-lime font-semibold text-sm mt-1">Operador de Bahía</p>

            <div class="flex items-center gap-4 mt-3 flex-wrap">
              <div class="flex items-center gap-2 text-slate-200 text-sm">
                <i-lucide name="building-2" class="w-4 h-4 text-easydry-green"></i-lucide>
                <span class="font-semibold">{{ user?.sucursalNombre || 'Sin sucursal' }}</span>
              </div>
              <div class="flex items-center gap-2 text-slate-200 text-sm">
                <i-lucide name="hard-drive" class="w-4 h-4 text-easydry-lime"></i-lucide>
                <span class="font-semibold">{{ user?.bahiaNombre || 'Sin bahía asignada' }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <a routerLink="/servicios"
              class="px-5 py-3 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-bold rounded-xl text-sm transition-all shadow-glow-green flex items-center gap-2">
              <i-lucide name="plus-circle" class="w-4 h-4"></i-lucide>
              <span>Registrar Servicio</span>
            </a>
          </div>
        </div>
        <div class="absolute -right-16 -bottom-16 w-72 h-72 bg-easydry-green/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      <!-- KPIs del Operador -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-easydry-blue/10 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="car" class="w-5 h-5 text-easydry-blue"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ misServicios.length }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Servicios Hoy</p>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="clock" class="w-5 h-5 text-amber-600"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ enProceso }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">En Proceso</p>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-easydry-green/15 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="check-circle-2" class="w-5 h-5 text-easydry-green-dark"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ finalizados }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Finalizados</p>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="shield-check" class="w-5 h-5 text-indigo-600"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ aprobados }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Aprobados</p>
        </div>
      </div>

      <!-- Mis Servicios del Día -->
      <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="font-bold text-slate-900 text-lg font-outfit">Mis Servicios del Día</h3>
            <p class="text-xs text-slate-500">Solo ves tus registros en tu bahía asignada</p>
          </div>
          <a routerLink="/servicios"
            class="px-4 py-2 bg-easydry-blue/10 text-easydry-blue font-bold rounded-xl text-xs hover:bg-easydry-blue/20 transition-colors flex items-center gap-1.5">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide>
            <span>Nuevo Servicio</span>
          </a>
        </div>

        @if (misServicios.length === 0) {
          <div class="text-center py-12">
            <i-lucide name="car" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i-lucide>
            <p class="text-slate-500 font-medium">No tienes servicios registrados hoy</p>
            <p class="text-slate-400 text-xs mt-1">Usa el botón "Registrar Servicio" para comenzar</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (s of misServicios; track s.id) {
              <div class="p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer" (click)="abrirDetalle(s)">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2 py-0.5 rounded-md">
                      {{ s.ordenTrabajoOT || 'OT-9800' }}
                    </span>
                    <div class="font-bold text-slate-900 text-sm mt-1.5">{{ s.marca }} {{ s.modelo }}</div>
                    <div class="text-[11px] font-mono font-extrabold text-slate-500">{{ s.placa }}</div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-center max-w-[80px]"
                    [ngClass]="{
                      'bg-amber-100 text-amber-800': s.estado === 'EN PROCESO',
                      'bg-easydry-blue/15 text-easydry-blue': s.estado === 'FINALIZADO',
                      'bg-easydry-green/20 text-easydry-green-dark': s.estado === 'APROBADO',
                      'bg-rose-100 text-rose-800': s.estado === 'RECHAZADO'
                    }">
                    {{ s.estado }}
                  </span>
                </div>
                
                <div class="flex items-center justify-between mt-3 text-xs">
                  <div class="flex items-center gap-1.5 text-slate-500">
                    <i-lucide name="clock" class="w-3.5 h-3.5"></i-lucide>
                    <span>{{ s.horaIngreso || '08:30' }}</span>
                  </div>
                  <div class="font-semibold text-slate-700">
                    {{ s.servicio }}
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Modal Detalle Servicio (Mobile) -->
      <app-modal 
        [isOpen]="modalDetalleOpen" 
        [title]="'Detalle: ' + (servicioDetalleSeleccionado?.placa || '')" 
        icon="info"
        (close)="modalDetalleOpen = false">
        
        @if (servicioDetalleSeleccionado) {
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Orden / OT</span>
                <span class="font-mono font-extrabold text-easydry-blue">{{ servicioDetalleSeleccionado.ordenTrabajoOT }}</span>
                <span class="block text-[10px] text-slate-500 mt-0.5">{{ servicioDetalleSeleccionado.numeroOrden }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Vehículo</span>
                <span class="font-bold text-slate-800">{{ servicioDetalleSeleccionado.marca }} {{ servicioDetalleSeleccionado.modelo }}</span>
                <span class="block text-[10px] text-slate-500 mt-0.5">{{ servicioDetalleSeleccionado.color }}</span>
              </div>
            </div>

            <div class="p-3 bg-easydry-blue/5 rounded-xl border border-easydry-blue/10 text-xs">
              <span class="block text-[10px] text-easydry-blue font-bold uppercase mb-1">Servicio</span>
              <span class="font-bold text-slate-800 text-sm block mb-0.5">{{ servicioDetalleSeleccionado.servicio }}</span>
              <span class="text-slate-500 font-semibold">{{ servicioDetalleSeleccionado.categoriaServicio }}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Sucursal / Bahía</span>
                <span class="font-bold text-slate-800 block">{{ servicioDetalleSeleccionado.agencia }}</span>
                <span class="text-slate-500 mt-0.5">{{ servicioDetalleSeleccionado.bahia || 'Bahía 1' }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Horarios</span>
                <span class="font-bold text-slate-800 block">Ingreso: {{ servicioDetalleSeleccionado.horaIngreso || '08:30' }}</span>
                <span class="text-slate-500 mt-0.5">Salida: {{ servicioDetalleSeleccionado.horaSalida || '09:30' }}</span>
              </div>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
              <div>
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Operador</span>
                <span class="font-bold text-slate-800">{{ servicioDetalleSeleccionado.empleado }}</span>
              </div>
              <div class="text-right">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Estado</span>
                <span class="font-extrabold" [ngClass]="{
                  'text-amber-600': servicioDetalleSeleccionado.estado === 'EN PROCESO',
                  'text-easydry-blue': servicioDetalleSeleccionado.estado === 'FINALIZADO',
                  'text-easydry-green-dark': servicioDetalleSeleccionado.estado === 'APROBADO',
                  'text-rose-600': servicioDetalleSeleccionado.estado === 'RECHAZADO'
                }">{{ servicioDetalleSeleccionado.estado }}</span>
              </div>
            </div>
          </div>
        }

        <div modal-footer class="flex flex-col gap-2 w-full">
          @if (servicioDetalleSeleccionado) {
            @if (canFinalizar(servicioDetalleSeleccionado)) {
              <button
                (click)="finalizarServicio(servicioDetalleSeleccionado); modalDetalleOpen = false"
                class="w-full px-4 py-2.5 bg-easydry-blue text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm">
                <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide> Finalizar Servicio
              </button>
            }
          }
          <button (click)="modalDetalleOpen = false" class="w-full px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs mt-1">Cerrar Detalle</button>
        </div>
      </app-modal>

      <!-- Aviso de privacidad de datos -->
      <div class="bg-easydry-blue/5 border border-easydry-blue/15 rounded-2xl p-4 flex items-start gap-3">
        <i-lucide name="info" class="w-5 h-5 text-easydry-blue flex-shrink-0 mt-0.5"></i-lucide>
        <div>
          <p class="text-sm font-bold text-easydry-blue">Alcance de tu sesión</p>
          <p class="text-xs text-slate-600 mt-0.5">
            Solo puedes ver y registrar servicios asignados a tu bahía ({{ user?.bahiaNombre }})
            en la sucursal {{ user?.sucursalNombre }}. Para reportar problemas de maquinaria contacta al Supervisor.
          </p>
        </div>
      </div>

    </div>
  `
})
export class MiBahiaComponent implements OnInit {
  private auth = inject(AuthService);
  private serviciosService = inject(ServicioLavadoMockService);

  misServicios: VehiculoServicio[] = [];

  get user() { return this.auth.getCurrentUser(); }
  get enProceso() { return this.misServicios.filter(s => s.estado === 'EN PROCESO').length; }
  get finalizados() { return this.misServicios.filter(s => s.estado === 'FINALIZADO').length; }
  get aprobados() { return this.misServicios.filter(s => s.estado === 'APROBADO').length; }

  ngOnInit(): void {
    const nombreOperador = `${this.user?.nombre} ${this.user?.apellido}`;
    this.serviciosService.getServicios().subscribe(list => {
      // Filtrar solo los servicios de este operador
      this.misServicios = list.filter(s =>
        s.empleado?.toLowerCase().includes(this.user?.nombre?.toLowerCase() ?? '')
      );
    });
  }

  modalDetalleOpen = false;
  servicioDetalleSeleccionado?: VehiculoServicio;

  abrirDetalle(item: VehiculoServicio) {
    this.servicioDetalleSeleccionado = item;
    this.modalDetalleOpen = true;
  }

  canFinalizar(item: VehiculoServicio): boolean {
    return item.estado === 'EN PROCESO';
  }

  finalizarServicio(item: VehiculoServicio) {
    this.serviciosService.finalizarServicioOperador(item.id).subscribe(res => {
      if (res) {
        // En una app real, actualizaríamos el item en el arreglo o refrescaríamos la lista.
        // Para este prototipo, simplemente cambiamos el estado visualmente
        item.estado = 'FINALIZADO';
      }
    });
  }
}

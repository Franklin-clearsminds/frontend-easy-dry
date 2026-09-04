import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ServicioLavadoMockService } from '../../core/services/servicio-lavado-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { InventarioMockService } from '../../core/services/inventario-mock.service';
import { 
  VehiculoServicio, 
  CatalogoServicio, 
  InsumoConsumidoServicio, 
  InventarioItem, 
  ArchivoAdjunto, 
  Incidente, 
  Maquinaria,
  Operador,
  ServicioExtra,
  RecetaInsumoServicio
} from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { Role } from '../../core/models/roles.model';
import { CatalogoServiciosMockService } from '../../core/services/catalogo-servicios-mock.service';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { ServiciosExtrasMockService } from '../../core/services/servicios-extras-mock.service';
import { OperadorMockService } from '../../core/services/operador-mock.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { MaquinariaMockService } from '../../core/services/maquinaria-mock.service';
import { IncidenteMockService } from '../../core/services/incidente-mock.service';
import { PermissionService } from '../../core/services/permission.service';
import { formatearPlaca, placasEquivalentes, validarPlaca } from '../../core/utils/placa.util';
import { resolverRangoFechas, soloFecha } from '../../core/utils/fecha-rango';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header Banner -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-2">
            <i-lucide name="car" class="w-3.5 h-3.5"></i-lucide>
            <span>Digitalización de Hoja de Control de Servicio</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Control y Registro de Servicios de Lavado</h1>
          <p class="text-slate-500 text-xs mt-1">Digitalización del proceso físico: OT, placa, evidencias en vídeo/fotos y flujo de aprobación por Gerencia.</p>
        </div>
      </div>

      <!-- Tab Navigation: Generales y Especiales -->
      <div class="flex flex-wrap gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
        
        <!-- Pestaña 1: Servicios Generales -->
        <button
          (click)="cambiarTab('generales')"
          [ngClass]="tabActiva === 'generales' ? 'bg-white text-easydry-blue shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900 font-semibold'"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
          <i-lucide name="droplet" class="w-4 h-4 text-easydry-blue"></i-lucide>
          <span>Servicios Generales</span>
        </button>

        <!-- Pestaña 2: Servicios Especiales -->
        <button
          (click)="cambiarTab('especiales')"
          [ngClass]="tabActiva === 'especiales' ? 'bg-white text-amber-700 shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900 font-semibold'"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
          <i-lucide name="star" class="w-4 h-4 text-amber-500 fill-amber-500/20"></i-lucide>
          <span>Servicios Especiales</span>
        </button>

      </div>

      <!-- Banner contextual para Servicios Especiales -->
      @if (tabActiva === 'especiales') {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-200/60 animate-fade-in">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <i-lucide name="star" class="w-5 h-5 fill-amber-500 text-amber-600"></i-lucide>
            </div>
            <div>
              <h2 class="text-sm font-extrabold text-slate-900 font-outfit">Hojas de Control de Servicios Especiales</h2>
              <p class="text-xs text-slate-600 mt-0.5">Seguimiento de vehículos atendidos con Pulido, Recubrimiento Cerámico, Lavado de Motor y Chasis.</p>
            </div>
          </div>
          <span class="text-xs font-bold text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-200 self-start sm:self-auto">
            {{ serviciosFiltrados.length }} OTs Especiales
          </span>
        </div>
      }

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="!isOperador" 
        [showOperador]="!isOperador"
        [showBahia]="!isOperador"
        [showServicio]="true"
        [showRegion]="true"
        [showMarca]="true"
        [showEstado]="true"
        [showFechas]="false"
        [showBusqueda]="true"
        [placeholderBusqueda]="tabActiva === 'generales' ? 'Buscar placa (ej. PBX-8932) u Orden OT...' : 'Buscar placa u OT especial...'"
        [listaServicios]="listaServiciosFiltro"
        [listaEstados]="['Todos', 'EN PROCESO', 'FINALIZADO', 'APROBADO', 'RECHAZADO']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Additional Category Counters -->
      <div class="flex justify-end mb-4">
        <div class="text-xs font-semibold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-xs">
          {{ tabActiva === 'generales' ? 'Servicios Generales Registrados:' : 'OTs de Servicios Especiales:' }}
          <strong [ngClass]="tabActiva === 'generales' ? 'text-easydry-blue' : 'text-amber-700'">{{ serviciosFiltrados.length }} Vehículos</strong>
        </div>
      </div>

      <!-- Services List / Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        
        <!-- Cabecera de la sección -->
        <div class="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-lg font-outfit">{{ tabActiva === 'generales' ? 'Servicios Generales' : 'Servicios Especiales' }}</h3>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            @if (puedeReportarFalla) {
              <button
                (click)="abrirModalReportarFalla()"
                class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs">
                <i-lucide name="alert-triangle" class="w-4 h-4"></i-lucide>
                <span class="hidden sm:inline">Reportar Falla / Avería</span>
                <span class="sm:hidden">Falla</span>
              </button>
            }
            <button
              (click)="abrirModalNuevaOT()"
              class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
              <i-lucide name="plus" class="w-4 h-4"></i-lucide>
              <span class="hidden sm:inline">{{ tabActiva === 'especiales' ? 'Nueva OT (Especial)' : 'Nueva Hoja de Control (OT)' }}</span>
              <span class="sm:hidden">Nueva OT</span>
            </button>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Nº OT</th>
                <th class="py-3.5 px-4">Vehículo</th>
                <th class="py-3.5 px-4">Categoría & Servicio</th>
                <th class="py-3.5 px-4">Sucursal / Bahía</th>
                <th class="py-3.5 px-4">Horarios</th>
                <th class="py-3.5 px-4">Operador</th>
                <th class="py-3.5 px-4">Estado Workflow</th>
                <th class="py-3.5 px-4 text-center">Evidencia</th>
                <th class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (item of paginatedServicios; track item.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4">
                    <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2.5 py-1 rounded-lg block w-fit">
                      {{ item.ordenTrabajoOT || 'OT-9800' }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900 text-xs">{{ item.marca }} {{ item.modelo }}</div>
                    <div class="text-xs font-mono font-extrabold text-easydry-blue">{{ item.placa }}</div>
                    <div class="text-[10px] text-slate-500 font-semibold">{{ item.color }} ({{ item.anio }})</div>
                  </td>

                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2 py-0.5 rounded text-[10px] font-extrabold block w-fit mb-1 border"
                      [ngClass]="{
                        'bg-amber-100 text-amber-800 border-amber-300': item.categoriaServicio === 'ESPECIAL' || item.categoriaServicio === 'Servicios Especiales' || item.categoriaServicio === 'EXTRA' || item.categoriaServicio === 'Servicios Extras',
                        'bg-blue-100 text-blue-800 border-blue-300': item.categoriaServicio === 'GENERAL' || item.categoriaServicio === 'Servicios Generales' || !item.categoriaServicio
                      }">
                      {{ 
                        item.categoriaServicio === 'ESPECIAL' || item.categoriaServicio === 'Servicios Especiales' || item.categoriaServicio === 'EXTRA' || item.categoriaServicio === 'Servicios Extras' ? 'Servicios Especiales' : 
                        'Servicios Generales'
                      }}
                    </span>
                    <span class="font-bold text-slate-900 text-xs">{{ item.servicio }}</span>
                  </td>

                  <td class="py-3.5 px-4 text-xs">
                    <p class="font-bold text-slate-800">{{ item.agencia }}</p>
                    <p class="text-[11px] text-easydry-blue font-semibold">{{ item.bahia || 'Bahía 1' }}</p>
                  </td>

                  <td class="py-3.5 px-4 text-xs font-mono">
                    <p class="text-slate-700 font-semibold">Ing: {{ item.horaIngreso || '08:30' }}</p>
                    <p class="text-slate-400">Sal: {{ item.horaSalida || '09:30' }}</p>
                    <span class="mt-0.5 inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                      {{ calcularDuracion(item.horaIngreso || '', item.horaSalida || '') }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4 text-xs font-bold text-slate-800">
                    {{ item.empleado }}
                  </td>

                  <td class="py-3.5 px-4">
                    <span 
                      class="px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5"
                      [ngClass]="{
                        'bg-amber-100 text-amber-800 border border-amber-300': item.estado === 'EN PROCESO',
                        'bg-easydry-blue/15 text-easydry-blue border border-easydry-blue/30': item.estado === 'FINALIZADO',
                        'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40': item.estado === 'APROBADO',
                        'bg-rose-100 text-rose-800 border border-rose-300': item.estado === 'RECHAZADO'
                      }">
                      <span>{{ item.estado }}</span>
                    </span>
                  </td>

                  <td class="py-3.5 px-4 text-center">
                    @if (item.video || item.videoUrl) {
                      <button 
                        (click)="verVideoEvidencia(item)"
                        title="Ver video evidencia"
                        class="p-1.5 bg-slate-100 hover:bg-easydry-blue hover:text-white text-easydry-blue rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center">
                        <i-lucide name="film" class="w-4 h-4"></i-lucide>
                      </button>
                    } @else {
                      <span class="text-[11px] text-slate-400 italic">Sin vídeo</span>
                    }
                  </td>

                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      @if (canFinalizar(item)) {
                        <button
                          (click)="finalizarServicio(item)"
                          title="Finalizar servicio"
                          class="p-1.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                          <i-lucide name="check-circle" class="w-4 h-4"></i-lucide>
                        </button>
                      }

                      @if (item.estado === 'FINALIZADO' && canApprove) {
                        <button
                          (click)="aprobarServicio(item)"
                          title="Aprobar servicio"
                          class="p-1.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center justify-center">
                          <i-lucide name="check" class="w-4 h-4"></i-lucide>
                        </button>
                      }

                      @if (item.estado === 'APROBADO') {
                        <span class="p-1.5 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                          <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide>
                        </span>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile / Tablet Card View -->
        <div class="block lg:hidden divide-y divide-slate-100">
          @for (item of paginatedServicios; track item.id) {
            <div class="p-4 hover:bg-slate-50 transition-colors cursor-pointer" (click)="abrirDetalle(item)">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2 py-0.5 rounded-md">
                    {{ item.ordenTrabajoOT || 'OT-9800' }}
                  </span>
                  <div class="font-bold text-slate-900 text-sm mt-1.5">{{ item.marca }} {{ item.modelo }}</div>
                  <div class="text-[11px] font-mono font-extrabold text-slate-500">{{ item.placa }}</div>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-center max-w-[80px]"
                  [ngClass]="{
                    'bg-amber-100 text-amber-800': item.estado === 'EN PROCESO',
                    'bg-easydry-blue/15 text-easydry-blue': item.estado === 'FINALIZADO',
                    'bg-easydry-green/20 text-easydry-green-dark': item.estado === 'APROBADO',
                    'bg-rose-100 text-rose-800': item.estado === 'RECHAZADO'
                  }">
                  {{ item.estado }}
                </span>
              </div>
              
              <div class="flex items-center justify-between mt-3 text-xs">
                <div class="flex items-center gap-1.5 text-slate-500">
                  <i-lucide name="clock" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ item.horaIngreso || '08:30' }}</span>
                </div>
                <div class="font-semibold text-slate-700">
                  {{ item.servicio }}
                </div>
              </div>
            </div>
          }
        </div>

        <app-pagination 
          [totalItems]="serviciosFiltrados.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
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
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Nº OT</span>
                <span class="font-mono font-extrabold text-easydry-blue">{{ servicioDetalleSeleccionado.ordenTrabajoOT }}</span>
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

            <!-- Insumos Utilizados en este Servicio -->
            @if (servicioDetalleSeleccionado.insumosUtilizados && servicioDetalleSeleccionado.insumosUtilizados.length > 0) {
              <div class="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] text-blue-950 font-extrabold uppercase flex items-center gap-1.5">
                    <i-lucide name="boxes" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                    Insumos & Recursos Utilizados
                  </span>
                  <span class="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                    Descontado de {{ servicioDetalleSeleccionado.agencia }}
                  </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (ins of servicioDetalleSeleccionado.insumosUtilizados; track ins.productoId) {
                    <div class="p-2.5 bg-white rounded-xl border border-blue-100/80 flex items-center justify-between shadow-2xs">
                      <div>
                        <p class="font-bold text-slate-900 text-xs">{{ ins.productoNombre }}</p>
                        <span class="font-mono text-[10px] text-slate-400">{{ ins.productoSKU }}</span>
                      </div>
                      <span class="font-mono font-extrabold text-xs text-easydry-blue bg-blue-50 px-2 py-1 rounded-lg">
                        {{ ins.cantidad }} {{ ins.unidadMedida }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <div modal-footer class="flex flex-col gap-2 w-full">
          @if (servicioDetalleSeleccionado) {
            @if (servicioDetalleSeleccionado.video || servicioDetalleSeleccionado.videoUrl) {
              <button 
                (click)="verVideoEvidencia(servicioDetalleSeleccionado); modalDetalleOpen = false"
                class="w-full px-4 py-2.5 bg-slate-100 hover:bg-easydry-blue hover:text-white text-easydry-blue rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                <i-lucide name="film" class="w-4 h-4"></i-lucide> Ver Vídeo Evidencia
              </button>
            }
            
            @if (canFinalizar(servicioDetalleSeleccionado)) {
              <button
                (click)="finalizarServicio(servicioDetalleSeleccionado); modalDetalleOpen = false"
                class="w-full px-4 py-2.5 bg-easydry-blue text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm">
                <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide> Finalizar Servicio
              </button>
            }

            @if (servicioDetalleSeleccionado.estado === 'FINALIZADO' && canApprove) {
              <button
                (click)="aprobarServicio(servicioDetalleSeleccionado); modalDetalleOpen = false"
                class="w-full px-4 py-2.5 bg-easydry-green text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm">
                <i-lucide name="thumbs-up" class="w-4 h-4"></i-lucide> Aprobar Servicio
              </button>
            }
          }
          <button (click)="modalDetalleOpen = false" class="w-full px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs mt-1">Cerrar Detalle</button>
        </div>
      </app-modal>

      <!-- Modal Digital HOJA DE CONTROL DE SERVICIO (Nueva OT) -->
      <app-modal 
        [isOpen]="modalNuevoRegistroOpen" 
        title="Digitalización: HOJA DE CONTROL DE SERVICIO" 
        icon="car"
        (close)="modalNuevoRegistroOpen = false">
        
        <form (ngSubmit)="guardarHojaServicio()" class="space-y-4">
          
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-easydry-blue flex items-center justify-between">
            <span>REGISTRO DE ORDEN DE TRABAJO (OT)</span>
            <span class="font-mono">Fecha: {{ nuevoRegistro.fecha }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nº OT (Orden Trabajo)</label>
              <input type="text" [(ngModel)]="nuevoRegistro.ordenTrabajoOT" name="ordenTrabajoOT" placeholder="OT-9840" class="w-full p-2 border rounded-xl text-xs font-mono font-bold text-easydry-blue" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Placa Vehículo</label>
              <input
                type="text"
                [ngModel]="nuevoRegistro.placa"
                (ngModelChange)="onPlacaChange($event)"
                name="placa"
                placeholder="PBX-1234"
                maxlength="8"
                autocomplete="off"
                class="w-full p-2 border rounded-xl text-xs font-mono font-bold uppercase tracking-wide"
                [class.border-rose-400]="placaTocada && !placaValida"
                [class.border-easydry-green]="placaValida"
                required>
              <p class="text-[10px] mt-1 font-semibold"
                [class.text-easydry-green-dark]="placaValida"
                [class.text-rose-600]="placaTocada && !placaValida"
                [class.text-slate-400]="!placaTocada && !placaValida">
                {{ placaMensaje }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Marca</label>
              <input type="text" [(ngModel)]="nuevoRegistro.marca" name="marca" placeholder="Toyota" class="w-full p-2 border rounded-xl text-xs" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Modelo</label>
              <input type="text" [(ngModel)]="nuevoRegistro.modelo" name="modelo" placeholder="Corolla Cross" class="w-full p-2 border rounded-xl text-xs" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Color</label>
              <input type="text" [(ngModel)]="nuevoRegistro.color" name="color" placeholder="Blanco" class="w-full p-2 border rounded-xl text-xs" required>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Hora Ingreso</label>
              <input type="time" [(ngModel)]="nuevoRegistro.horaIngreso" name="horaIngreso" class="w-full p-2 border rounded-xl text-xs font-mono" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Hora Salida Estimada</label>
              <input type="time" [(ngModel)]="nuevoRegistro.horaSalida" name="horaSalida" class="w-full p-2 border rounded-xl text-xs font-mono" required>
            </div>
          </div>

          <!-- Category and Specific Service -->
          <div class="p-3 bg-easydry-blue/5 rounded-2xl border border-easydry-blue/20 space-y-3">
            <label class="block text-xs font-extrabold text-easydry-blue uppercase">Categoría de Servicio</label>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label 
                class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold transition-all"
                [ngClass]="nuevoRegistro.categoriaServicio === 'GENERAL' ? 'bg-easydry-blue text-white border-easydry-blue shadow-xs' : 'bg-white text-slate-700 hover:border-slate-300'">
                <input type="radio" [(ngModel)]="nuevoRegistro.categoriaServicio" name="catRadio" value="GENERAL" (change)="onCategoriaChange()" class="hidden">
                <span class="flex items-center gap-1.5"><i-lucide name="droplet" class="w-4 h-4"></i-lucide> Generales</span>
              </label>

              <label 
                class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold transition-all"
                [ngClass]="nuevoRegistro.categoriaServicio === 'ESPECIAL' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 hover:border-slate-300'">
                <input type="radio" [(ngModel)]="nuevoRegistro.categoriaServicio" name="catRadio" value="ESPECIAL" (change)="onCategoriaChange()" class="hidden">
                <span class="flex items-center gap-1.5"><i-lucide name="star" class="w-4 h-4"></i-lucide> Especiales</span>
              </label>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Servicio Específico</label>
              <select [(ngModel)]="nuevoRegistro.servicio" name="servicio" (change)="onServicioSelect()" class="w-full p-2.5 border rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-easydry-blue">
                @for (s of opcionesServicios; track s.id) {
                  <option [value]="s.nombre">{{ s.nombre }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Insumos y Recursos Utilizados (Descuento Automático de Stock) -->
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <i-lucide name="boxes" class="w-4 h-4 text-easydry-blue"></i-lucide>
                Insumos a Consumir en este Servicio
              </label>
              <span class="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border">
                Descuento automático de: {{ nuevoRegistro.agencia }}
              </span>
            </div>

            @if (insumosConsumoForm.length === 0) {
              <p class="text-xs text-slate-400 italic">No hay insumos agregados para este servicio.</p>
            } @else {
              <div class="space-y-2">
                @for (ins of insumosConsumoForm; track ins.productoId; let idx = $index) {
                  <div class="p-2.5 bg-white rounded-xl border flex items-center justify-between gap-3 shadow-2xs">
                    <div class="overflow-hidden flex-1">
                      <p class="font-bold text-slate-900 text-xs truncate">{{ ins.productoNombre }}</p>
                      <div class="flex items-center gap-2 text-[10px] text-slate-500">
                        <span class="font-mono bg-slate-100 px-1 py-0.2 rounded">{{ ins.productoSKU }}</span>
                        <span>•</span>
                        <span class="text-easydry-blue font-semibold">Stock en {{ nuevoRegistro.agencia }}: {{ getStockDisponible(ins.productoId) }} {{ ins.unidadMedida }}</span>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <button type="button" (click)="disminuirCantidadInsumo(idx)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 font-extrabold flex items-center justify-center text-slate-700">-</button>
                      <input type="number" [(ngModel)]="ins.cantidad" [name]="'cant_' + idx" min="0.1" step="0.5" class="w-14 text-center p-1 border rounded-lg text-xs font-mono font-bold text-easydry-blue">
                      <span class="text-[10px] text-slate-500 font-bold">{{ ins.unidadMedida }}</span>
                      <button type="button" (click)="aumentarCantidadInsumo(idx)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 font-extrabold flex items-center justify-center text-slate-700">+</button>
                      <button type="button" (click)="eliminarInsumoConsumo(idx)" class="p-1 text-rose-500 hover:bg-rose-50 rounded-lg ml-1">
                        <i-lucide name="trash-2" class="w-3.5 h-3.5"></i-lucide>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Selector para añadir insumo extra -->
            <div class="flex items-center gap-2 pt-1">
              <select #selectInsumoExtra class="flex-1 p-2 bg-white border rounded-xl text-xs font-medium">
                <option value="">+ Añadir otro insumo del inventario...</option>
                @for (item of productosInventario; track item.producto.id) {
                  <option [value]="item.producto.id">
                    {{ item.producto.nombre }} ({{ item.producto.unidadMedida }}) - SKU: {{ item.producto.codigoSKU }}
                  </option>
                }
              </select>
              <button 
                type="button" 
                (click)="agregarInsumoExtra(selectInsumoExtra.value); selectInsumoExtra.value = ''"
                class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                + Agregar
              </button>
            </div>
          </div>

          <!-- Video Proof Upload -->
          <div class="space-y-1.5">
            <label class="block text-[11px] font-bold text-slate-700 uppercase">Evidencia Vídeo de Ingreso</label>
            
            <div class="relative w-full border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                 (click)="fileInput.click()">
              <input 
                #fileInput
                type="file" 
                accept="video/*" 
                capture="environment"
                class="hidden"
                (change)="onFileSelected($event)">
              
              @if (videoFileSelected) {
                <div class="flex items-center gap-2 text-easydry-green-dark">
                  <i-lucide name="check-circle-2" class="w-6 h-6"></i-lucide>
                  <span class="text-xs font-bold">{{ videoFileName }}</span>
                </div>
                <p class="text-[10px] text-slate-500 mt-1">Vídeo listo para subir</p>
              } @else {
                <div class="p-3 bg-easydry-blue/10 text-easydry-blue rounded-full mb-2">
                  <i-lucide name="video" class="w-6 h-6"></i-lucide>
                </div>
                <p class="text-xs font-bold text-slate-700 text-center">Toca para grabar o seleccionar vídeo</p>
                <p class="text-[10px] text-slate-400 text-center mt-1">Accede a la cámara o galería</p>
              }
            </div>
          </div>

        </form>

        <div modal-footer class="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
          <button (click)="modalNuevoRegistroOpen = false" class="w-full sm:w-auto px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex justify-center">Cancelar</button>
          <button (click)="guardarHojaServicio()" class="w-full sm:w-auto px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs flex justify-center">Guardar e Iniciar Servicio</button>
        </div>
      </app-modal>

      <!-- Modal Reproductor de Vídeo Evidencia -->
      <app-modal 
        [isOpen]="modalVideoOpen" 
        [title]="'Evidencia en Vídeo: ' + (servicioSeleccionado?.placa || '')" 
        icon="film"
        (close)="modalVideoOpen = false">
        
        @if (servicioSeleccionado) {
          <div class="space-y-4">
            <div class="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              <video 
                [src]="servicioSeleccionado.videoUrl || servicioSeleccionado.video || 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4'" 
                controls 
                autoplay 
                class="w-full h-full object-contain">
              </video>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p class="font-bold text-slate-900">{{ servicioSeleccionado.marca }} {{ servicioSeleccionado.modelo }} ({{ servicioSeleccionado.placa }})</p>
              <p class="text-slate-500">Orden: <strong>{{ servicioSeleccionado.ordenTrabajoOT }}</strong> • Atendido por: <strong>{{ servicioSeleccionado.empleado }}</strong></p>
            </div>
          </div>
        }

        <div modal-footer class="w-full sm:w-auto">
          <button (click)="modalVideoOpen = false" class="w-full sm:w-auto px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex justify-center">Cerrar Vídeo</button>
        </div>
      </app-modal>

      <app-modal
        [isOpen]="modalReportarFallaOpen"
        title="Reportar Desperfecto o Falla de Maquinaria"
        icon="alert-triangle"
        (close)="modalReportarFallaOpen = false">

        <form (ngSubmit)="guardarReporteFalla()" class="space-y-4">
          @if (maquinasReporte.length === 0) {
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              {{ isOperadorEspeciales
                ? 'No hay equipos móviles de servicios especiales registrados. Contacta al jefe de especiales.'
                : 'No hay equipos registrados en tu bahía. Contacta al supervisor si necesitas reportar un equipo nuevo.' }}
            </div>
          } @else {
            <p class="text-xs text-slate-500">
              {{ isOperadorEspeciales
                ? 'Reporta fallos de tu equipo móvil. El taller técnico gestiona la reparación.'
                : 'Solo puedes subir el reporte. La reparación la gestiona el taller técnico.' }}
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Equipo Afectado</label>
                <select [(ngModel)]="maquinaSeleccionadaId" name="maquinaFalla" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
                  @for (m of maquinasReporte; track m.id) {
                    <option [ngValue]="m.id">{{ m.codigo }} — {{ m.nombre }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Falla</label>
                <select [(ngModel)]="nuevoIncidente.tipo" name="tipoFalla" class="w-full p-2.5 border rounded-xl text-xs font-bold">
                  @for (tipo of tiposFallaDisponibles; track tipo) {
                    <option [value]="tipo">{{ tipo }}</option>
                  }
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Problema</label>
              <textarea
                [(ngModel)]="nuevoIncidente.descripcion"
                name="descripcionFalla"
                placeholder="Describa ruidos, sobrecalentamiento, pads desgastados u otros síntomas..."
                rows="3"
                class="w-full p-3 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                required>
              </textarea>
            </div>
            <div class="border-2 border-dashed border-rose-200 bg-rose-50/40 rounded-2xl p-4 space-y-3">
              <label class="text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
                <i-lucide name="camera" class="w-4 h-4 text-rose-600"></i-lucide>
                Evidencias del Fallo (opcional)
              </label>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="cursor-pointer px-4 py-2.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-2">
                  <i-lucide name="upload-cloud" class="w-4 h-4"></i-lucide>
                  <span>Seleccionar Archivos</span>
                  <input type="file" multiple accept="image/*,video/*" (change)="onSubirArchivosFallo($event)" class="hidden">
                </label>
                <button type="button" (click)="agregarEvidenciaFalloDemo()"
                  class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
                  + Evidencia de prueba
                </button>
              </div>
              @if (archivosFalloSubidos.length > 0) {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  @for (arch of archivosFalloSubidos; track arch.id; let idx = $index) {
                    <div class="relative bg-white border rounded-xl p-2 shadow-xs">
                      @if (arch.tipo === 'imagen') {
                        <img [src]="arch.url" alt="Fallo" class="w-full h-24 object-cover rounded-lg">
                      } @else {
                        <div class="w-full h-24 bg-slate-900 rounded-lg flex items-center justify-center">
                          <i-lucide name="film" class="w-8 h-8 text-purple-400"></i-lucide>
                        </div>
                      }
                      <p class="text-[10px] font-semibold text-slate-700 truncate mt-1">{{ arch.nombre }}</p>
                      <button type="button" (click)="eliminarArchivoFallo(idx)"
                        class="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full">
                        <i-lucide name="x" class="w-3 h-3"></i-lucide>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </form>

        <div modal-footer>
          <button (click)="modalReportarFallaOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button
            (click)="guardarReporteFalla()"
            [disabled]="maquinasReporte.length === 0"
            class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs">
            Enviar Reporte
          </button>
        </div>
      </app-modal>



    </div>
  `
})
export class ServiciosComponent implements OnInit {
  // ── Pestaña Activa: Servicios Generales vs Servicios Especiales ──
  tabActiva: 'generales' | 'especiales' = 'generales';

  cambiarTab(tab: 'generales' | 'especiales') {
    this.tabActiva = tab;
    this.currentPage = 1;
    this.recalcularServiciosFiltrados();
  }

  abrirModalNuevaOT() {
    this.nuevoRegistro.categoriaServicio = this.tabActiva === 'especiales' ? 'ESPECIAL' : 'GENERAL';
    this.onCategoriaChange();
    this.modalNuevoRegistroOpen = true;
  }

  get countServiciosGenerales(): number {
    return this.servicios.filter(s => s.categoriaServicio === 'Servicios Generales' || s.categoriaServicio === 'GENERAL' || !s.categoriaServicio).length;
  }

  get countServiciosEspeciales(): number {
    return this.servicios.filter(s => s.categoriaServicio === 'Servicios Especiales' || s.categoriaServicio === 'ESPECIAL' || s.categoriaServicio === 'EXTRA' || s.categoriaServicio === 'Servicios Extras').length;
  }

  servicios: VehiculoServicio[] = [];
  serviciosFiltrados: VehiculoServicio[] = [];
  servicioSeleccionado?: VehiculoServicio;

  filtroTexto = '';
  filtroCategoria = 'Todas';
  
  // Guardamos el estado global
  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  // Lista de servicios disponibles para el filtro de tipo de servicio
  listaServiciosFiltro: string[] = ['Express', 'Completo', 'Deluxe', 'Retoque', 'Pulido', 'Micro pulido', 'Recubrimiento Cerámico', 'Lavado motor', 'Tratamientos especiales'];

  // Mapa sucursal -> región (para poder filtrar servicios por región)
  mapaRegionSucursal: Record<string, string> = {};
  // Mapa sucursal -> marca (para poder filtrar servicios por marca)
  mapaMarcaSucursal: Record<string, string> = {};

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    if (filtros.busqueda !== undefined) {
      this.filtroTexto = filtros.busqueda;
    }
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    this.currentPage = 1;
    this.recalcularServiciosFiltrados();
  }

  currentPage = 1;
  pageSize = 5;

  modalNuevoRegistroOpen = false;
  modalVideoOpen = false;
  modalReportarFallaOpen = false;
  maquinasReporte: Maquinaria[] = [];
  maquinaSeleccionadaId = 0;
  archivosFalloSubidos: ArchivoAdjunto[] = [];
  tiposFallaDisponibles: string[] = [
    'Falla eléctrica',
    'Fuga de agua',
    'Problema hidráulico',
    'Baja presión',
    'Manguera dañada',
    'Desgaste',
    'Rotura de pieza'
  ];
  nuevoIncidente = {
    tipo: 'Falla eléctrica' as Incidente['tipo'],
    prioridad: 'Alta' as Incidente['prioridad'],
    descripcion: ''
  };

  modalDetalleOpen = false;
  servicioDetalleSeleccionado?: VehiculoServicio;

  opcionesServicios: CatalogoServicio[] = [];
  catalogoCompleto: CatalogoServicio[] = [];
  sucursalServicioIds: number[] | null = null;

  videoFileSelected = false;
  videoFileName = '';

  nuevoRegistro = {
    numeroOrden: 'ORD-2026-005',
    ordenTrabajoOT: 'OT-9840',
    placa: 'PDK-5510',
    marca: 'Kia',
    modelo: 'Sportage R',
    anio: 2024,
    color: 'Rojo Pasión',
    categoriaServicio: 'GENERAL',
    servicio: '',
    servicioId: 0,
    categoria: 'SUV',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 1 (Lavado Ecológico)',
    empleado: 'Juan Pérez',
    fecha: '2026-07-22',
    horaIngreso: '10:00',
    horaSalida: '10:45',
    foto: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4'
  };

  placaTocada = false;

  get resultadoPlaca() {
    return validarPlaca(this.nuevoRegistro.placa);
  }

  get placaValida(): boolean {
    return this.resultadoPlaca.valida;
  }

  get placaMensaje(): string {
    if (!this.nuevoRegistro.placa) {
      return 'Formato ANT Ecuador: AAA-1234 (auto) o AAA-123 (moto).';
    }
    return this.resultadoPlaca.mensaje;
  }

  onPlacaChange(valor: string): void {
    this.placaTocada = true;
    this.nuevoRegistro.placa = formatearPlaca(valor);
  }

  productosInventario: InventarioItem[] = [];
  insumosConsumoForm: InsumoConsumidoServicio[] = [];

  private catalogoMock = inject(CatalogoServiciosMockService);
  private sucursalService = inject(SucursalMockService);
  private extrasMock = inject(ServiciosExtrasMockService);
  private operadorService = inject(OperadorMockService);
  private inventarioService = inject(InventarioMockService);
  private servicioService = inject(ServicioLavadoMockService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  private maquinariaService = inject(MaquinariaMockService);
  private incidenteService = inject(IncidenteMockService);
  private permissions = inject(PermissionService);

  // ── Servicios Extras / Asignaciones Especiales ──
  serviciosExtras: ServicioExtra[] = [];
  operadores: Operador[] = [];
  sucursalesDisponibles: string[] = ['EasyDry Quito Norte', 'EasyDry Quito Sur', 'EasyDry Cumbayá', 'EasyDry Guayaquil'];

  busquedaExtras = '';
  filtroEstadoExtras = 'TODOS';
  filtroOperadorExtras = 0;

  currentPageExtras = 1;
  pageSizeExtras = 5;

  showModalExtras = false;
  isEditingExtras = false;
  editandoExtraId: number | null = null;

  extraForm: {
    servicioNombre: string;
    servicioDescripcion: string;
    operadorId: number;
    operadorNombre: string;
    sucursalesSeleccionadas: string[];
    insumosReceta: RecetaInsumoServicio[];
    estado: ServicioExtra['estado'];
    fechaProgramada: string;
    notas: string;
  } = {
    servicioNombre: '',
    servicioDescripcion: '',
    operadorId: 0,
    operadorNombre: '',
    sucursalesSeleccionadas: [],
    insumosReceta: [],
    estado: 'Pendiente',
    fechaProgramada: new Date().toISOString().substring(0, 10),
    notas: ''
  };

  // ── Role helpers ──
  get isOperador() { return this.authService.hasRole(Role.OPERADOR); }
  get isOperadorEspeciales() {
    return this.authService.hasAnyRole([Role.OPERADOR_SERVICIOS_ESPECIALES, Role.COORD_SERVICIOS_ESPECIALES]);
  }
  get isGerente() { return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN, Role.GERENTE]); }
  get isSuperAdmin() { return this.authService.hasRole(Role.SUPER_ADMIN); }
  get isAdmin() { return this.authService.isAdmin(); }
  get puedeReportarFalla() {
    return this.authService.hasAnyRole([Role.OPERADOR, Role.OPERADOR_SERVICIOS_ESPECIALES])
      && this.permissions.canRegistrarIncidente();
  }

  /** Solo Gerente y SuperAdmin pueden aprobar servicios */
  get canApprove() {
    return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN, Role.GERENTE]);
  }

  /** El operador solo puede finalizar sus PROPIOS servicios */
  canFinalizar(item: VehiculoServicio): boolean {
    if (!this.isOperador) return item.estado === 'EN PROCESO';
    const nombreOperador = `${this.authService.getCurrentUser()?.nombre} ${this.authService.getCurrentUser()?.apellido}`;
    return item.estado === 'EN PROCESO' && item.empleado?.toLowerCase().includes(
      (this.authService.getCurrentUser()?.nombre ?? '').toLowerCase()
    );
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();

    // Pre-rellenar el formulario de nueva OT con el contexto del usuario autenticado
    if (user) {
      const nombreCompleto = `${user.nombre} ${user.apellido}`;
      this.nuevoRegistro.empleado = nombreCompleto;
      if (user.sucursalNombre) this.nuevoRegistro.agencia = user.sucursalNombre;
      if (user.bahiaNombre) this.nuevoRegistro.bahia = user.bahiaNombre;
    }

    this.servicioService.getServicios().subscribe(list => {
      this.servicios = list;
      this.recalcularServiciosFiltrados();
    });

    this.catalogoMock.getServiciosActivos().subscribe(cat => {
      this.catalogoCompleto = cat;
      const nombres = cat.map(c => c.nombre).filter(Boolean);
      if (nombres.length) this.listaServiciosFiltro = Array.from(new Set(nombres));
      this.onCategoriaChange();
    });

    this.sucursalService.getSucursales().subscribe(list => {
      const sucNombre = user?.sucursalNombre || user?.sucursal;
      const suc = this.sucursalService.getSucursalPorNombre(sucNombre);
      this.sucursalServicioIds = suc?.servicioIds?.length ? suc.servicioIds : null;

      // Construir mapa sucursal -> región para el filtro de región
      this.mapaRegionSucursal = {};
      this.mapaMarcaSucursal = {};
      list.forEach(s => {
        if (s.nombre && s.regionNombre) this.mapaRegionSucursal[s.nombre] = s.regionNombre;
        if (s.nombre && s.marcaNombre) this.mapaMarcaSucursal[s.nombre] = s.marcaNombre;
      });

      this.onCategoriaChange();
    });

    this.inventarioService.getItems().subscribe(items => {
      this.productosInventario = items;
    });

    this.operadorService.getOperadores().subscribe(ops => {
      this.operadores = ops;
    });

    this.extrasMock.getServiciosExtras().subscribe(extras => {
      this.serviciosExtras = extras;
    });

    if (this.isOperadorEspeciales) {
      this.tiposFallaDisponibles = [
        'Sobrecalentamiento',
        'Pad / disco desgastado',
        'Vibración anormal',
        'Falla eléctrica',
        'Lámpara dañada',
        'Desgaste',
        'Rotura de pieza'
      ];
      this.nuevoIncidente.tipo = 'Sobrecalentamiento';
    }

    if (this.puedeReportarFalla) {
      this.maquinariaService.getMaquinaria().subscribe(list => {
        this.maquinasReporte = this.isOperadorEspeciales
          ? list.filter(m => this.esEquipoServiciosEspeciales(m))
          : list.filter(m => {
              const sucursal = user?.sucursalNombre || user?.sucursal || '';
              const bahia = user?.bahiaNombre || '';
              const mismaSucursal = m.agencia === sucursal || m.sucursalNombre === sucursal;
              if (!bahia) return mismaSucursal;
              return mismaSucursal && (m.bahia === bahia || m.bahiaNombre === bahia);
            });
        if (this.maquinasReporte.length > 0) {
          this.maquinaSeleccionadaId = this.maquinasReporte[0].id;
        }
      });
    }
  }

  private esEquipoServiciosEspeciales(m: Maquinaria): boolean {
    const tipos = ['Pulidora', 'Lámpara Infrarroja', 'Extractor'];
    if (m.tipo && tipos.includes(m.tipo)) return true;
    const bahia = `${m.bahiaNombre || ''} ${m.bahia || ''}`.toLowerCase();
    const sucursal = `${m.sucursalNombre || ''} ${m.agencia || ''}`.toLowerCase();
    return bahia.includes('móvil') || bahia.includes('especial') || sucursal.includes('servicios especiales');
  }

  abrirModalReportarFalla(): void {
    this.archivosFalloSubidos = [];
    this.nuevoIncidente.descripcion = '';
    this.modalReportarFallaOpen = true;
  }

  onSubirArchivosFallo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    Array.from(input.files).forEach(file => {
      const isVideo = file.type.startsWith('video');
      this.archivosFalloSubidos.push({
        id: `arch-${Date.now()}-${Math.random()}`,
        nombre: file.name,
        tipo: isVideo ? 'video' : 'imagen',
        extension: file.name.split('.').pop()?.toUpperCase() || (isVideo ? 'MP4' : 'JPG'),
        url: URL.createObjectURL(file),
        tamanio: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        fechaSubida: new Date().toLocaleTimeString()
      });
    });
    this.toastService.success('Archivos cargados', `${input.files.length} evidencia(s) lista(s).`);
  }

  agregarEvidenciaFalloDemo(): void {
    this.archivosFalloSubidos.push({
      id: `demo-f-${Date.now()}`,
      nombre: 'falla_equipo_especial.jpg',
      tipo: 'imagen',
      extension: 'JPG',
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      tamanio: '2.1 MB',
      fechaSubida: 'Hoy'
    });
  }

  eliminarArchivoFallo(index: number): void {
    this.archivosFalloSubidos.splice(index, 1);
  }

  guardarReporteFalla(): void {
    const maquina = this.maquinasReporte.find(m => m.id === this.maquinaSeleccionadaId);
    if (!maquina) {
      this.toastService.warning('Equipo requerido', 'Seleccione el equipo afectado.');
      return;
    }
    if (!this.nuevoIncidente.descripcion.trim()) {
      this.toastService.warning('Descripción requerida', 'Describa el fallo observado.');
      return;
    }

    const user = this.authService.getCurrentUser()!;
    const fotos = this.archivosFalloSubidos.filter(a => a.tipo === 'imagen').map(a => a.url);
    const videos = this.archivosFalloSubidos.filter(a => a.tipo === 'video').map(a => a.url);
    const reportadoPor = `${user.nombre} ${user.apellido}`.trim()
      + (this.isOperadorEspeciales ? ' (Servicios Especiales)' : ' (Operador)');

    const registro: Omit<Incidente, 'id'> = {
      codigoIncidente: '',
      maquina: maquina.nombre,
      agencia: maquina.agencia || maquina.sucursalNombre || user.sucursalNombre || '',
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
      tipo: this.nuevoIncidente.tipo,
      prioridad: this.nuevoIncidente.prioridad,
      estado: 'Pendiente',
      descripcion: this.nuevoIncidente.descripcion.trim(),
      reportadoPor,
      fotosFallo: fotos.length > 0 ? fotos : undefined,
      videosFallo: videos.length > 0 ? videos : undefined,
      archivosFallo: this.archivosFalloSubidos.length > 0 ? [...this.archivosFalloSubidos] : undefined
    };

    this.incidenteService.crearIncidente(registro).subscribe(creado => {
      this.toastService.success('Reporte enviado', `Incidente ${creado.codigoIncidente} registrado. El taller lo procesará.`);
      this.modalReportarFallaOpen = false;
    });
  }

  onCategoriaChange() {
    if (this.nuevoRegistro.categoriaServicio === 'ESPECIAL') {
      this.opcionesServicios = this.catalogoCompleto.filter(
        s => s.categoria === 'ESPECIAL' || s.categoria === 'EXTRA'
      );
    } else {
      this.opcionesServicios = this.catalogoCompleto.filter(s => s.categoria === 'GENERAL');
    }
    if (this.sucursalServicioIds?.length) {
      this.opcionesServicios = this.opcionesServicios.filter(s => this.sucursalServicioIds!.includes(s.id));
    }
    if (this.opcionesServicios.length > 0) {
      this.nuevoRegistro.servicio = this.opcionesServicios[0].nombre;
      this.nuevoRegistro.servicioId = this.opcionesServicios[0].id;
      this.onServicioSelect();
    } else {
      this.nuevoRegistro.servicio = '';
      this.nuevoRegistro.servicioId = 0;
      this.insumosConsumoForm = [];
    }
  }

  onServicioSelect() {
    const serv = this.opcionesServicios.find(s => s.nombre === this.nuevoRegistro.servicio) ||
                 this.catalogoCompleto.find(s => s.nombre === this.nuevoRegistro.servicio);
    if (serv && serv.insumosReceta && serv.insumosReceta.length > 0) {
      this.insumosConsumoForm = serv.insumosReceta.map(r => ({
        productoId: r.productoId,
        productoSKU: r.productoSKU,
        productoNombre: r.productoNombre,
        unidadMedida: r.unidadMedida,
        cantidad: r.cantidadSugerida
      }));
    } else {
      // Default: 1 Shampoo + 1 Paño Microfibra
      this.insumosConsumoForm = [
        { productoId: 1, productoSKU: 'QUIM-001', productoNombre: 'Shampoo Ecológico Ultra-Espuma pH Neutro', unidadMedida: 'Caneca 20L', cantidad: 1 },
        { productoId: 5, productoSKU: 'TEX-001', productoNombre: 'Paños de Microfibra Premium', unidadMedida: 'Pack x10', cantidad: 1 }
      ];
    }
  }

  aumentarCantidadInsumo(idx: number) {
    if (this.insumosConsumoForm[idx]) {
      this.insumosConsumoForm[idx].cantidad = Math.round((this.insumosConsumoForm[idx].cantidad + 0.5) * 10) / 10;
    }
  }

  disminuirCantidadInsumo(idx: number) {
    if (this.insumosConsumoForm[idx] && this.insumosConsumoForm[idx].cantidad > 0.5) {
      this.insumosConsumoForm[idx].cantidad = Math.round((this.insumosConsumoForm[idx].cantidad - 0.5) * 10) / 10;
    }
  }

  eliminarInsumoConsumo(idx: number) {
    this.insumosConsumoForm.splice(idx, 1);
  }

  agregarInsumoExtra(productoIdStr: string) {
    if (!productoIdStr) return;
    const prodId = Number(productoIdStr);
    const item = this.productosInventario.find(i => i.producto.id === prodId);
    if (!item) return;

    const existe = this.insumosConsumoForm.find(ins => ins.productoId === prodId);
    if (existe) {
      existe.cantidad += 1;
    } else {
      this.insumosConsumoForm.push({
        productoId: item.producto.id,
        productoSKU: item.producto.codigoSKU,
        productoNombre: item.producto.nombre,
        unidadMedida: item.producto.unidadMedida,
        cantidad: 1
      });
    }
  }

  getStockDisponible(productoId: number): number {
    return this.inventarioService.getStockDisponibleSucursal(productoId, this.nuevoRegistro.agencia);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.videoFileSelected = true;
      this.videoFileName = file.name;
    }
  }

  /**
   * Filtrado de servicios con scoping por rol:
   * - OPERADOR: solo ve sus propios servicios (filtrado por nombre)
   * - GERENTE: solo ve servicios de su sucursal
   * - SUPER_ADMIN: ve todos
   */
  private recalcularServiciosFiltrados(): void {
    const user = this.authService.getCurrentUser();
    const role = this.authService.getRole();
    const texto = this.filtroTexto.toLowerCase();

    let resultados = this.servicios.filter(s => {
      // ── Scope por Rol ──
      if (role === Role.OPERADOR && user) {
        const mismoOperador = s.empleado?.toLowerCase().includes(user.nombre.toLowerCase());
        if (!mismoOperador) return false;
      } else if ((role === Role.GERENTE || role === Role.SUPERVISOR) && user?.sucursalNombre) {
        const mismoSucursal = s.agencia?.toLowerCase().includes(
          user.sucursalNombre!.replace('EasyDry ', '').toLowerCase()
        );
        if (!mismoSucursal) return false;
      }

      const matchTexto = !texto ||
        s.placa.toLowerCase().includes(texto) ||
        (s.ordenTrabajoOT?.toLowerCase().includes(texto) ?? false);

      let matchCat = true;
      if (this.filtroCategoria !== 'Todas') {
        if (this.filtroCategoria === 'Servicios Generales') {
          matchCat = s.categoriaServicio === 'Servicios Generales' || s.categoriaServicio === 'GENERAL';
        } else if (this.filtroCategoria === 'Servicios Especiales') {
          matchCat = s.categoriaServicio === 'Servicios Especiales' || s.categoriaServicio === 'ESPECIAL'
            || s.categoriaServicio === 'Servicios Extras' || s.categoriaServicio === 'EXTRA';
        }
      }

      // ── Filtrado estricto por pestaña activa (Generales vs Especiales) ──
      const tabMatch = this.tabActiva === 'generales'
        ? (s.categoriaServicio === 'Servicios Generales' || s.categoriaServicio === 'GENERAL' || !s.categoriaServicio)
        : (s.categoriaServicio === 'Servicios Especiales' || s.categoriaServicio === 'ESPECIAL' || s.categoriaServicio === 'EXTRA' || s.categoriaServicio === 'Servicios Extras');

      return matchTexto && matchCat && tabMatch;
    });

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(s => s.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(s => s.agencia === this.filtrosGlobales.sucursal);
    }
    if (this.filtrosGlobales.bahia !== 'Todas') {
      resultados = resultados.filter(s => s.bahia === this.filtrosGlobales.bahia);
    }
    if (this.filtrosGlobales.operador !== 'Todos') {
      resultados = resultados.filter(s => s.empleado?.includes(this.filtrosGlobales.operador));
    }
    if (this.filtrosGlobales.servicio && this.filtrosGlobales.servicio !== 'Todos') {
      resultados = resultados.filter(s =>
        s.servicio?.toLowerCase().includes(this.filtrosGlobales.servicio!.toLowerCase())
      );
    }
    if (this.filtrosGlobales.region && this.filtrosGlobales.region !== 'Todas') {
      resultados = resultados.filter(s =>
        this.mapaRegionSucursal[s.agencia] === this.filtrosGlobales.region
      );
    }
    if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
      resultados = resultados.filter(s =>
        this.mapaMarcaSucursal[s.agencia] === this.filtrosGlobales.marca
      );
    }
    if (this.filtrosGlobales.busqueda?.trim()) {
      const b = this.filtrosGlobales.busqueda.trim().toLowerCase();
      resultados = resultados.filter(s =>
        s.placa?.toLowerCase().includes(b) ||
        s.marca?.toLowerCase().includes(b) ||
        s.modelo?.toLowerCase().includes(b) ||
        s.empleado?.toLowerCase().includes(b) ||
        s.servicio?.toLowerCase().includes(b) ||
        s.ordenTrabajoOT?.toLowerCase().includes(b) ||
        s.numeroOrden?.toLowerCase().includes(b)
      );
    }

    const rango = resolverRangoFechas(this.filtrosGlobales);
    if (rango) {
      resultados = resultados.filter(s => {
        const d = soloFecha(s.fecha);
        return d >= rango.inicio && d <= rango.fin;
      });
    }

    this.serviciosFiltrados = resultados;
  }

  get paginatedServicios() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.serviciosFiltrados.slice(start, end);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  calcularDuracion(inicio: string, fin: string): string {
    if (!inicio || !fin) return '';
    const parse = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    let min = parse(fin) - parse(inicio);
    if (min < 0) min += 24 * 60;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  guardarHojaServicio() {
    this.placaTocada = true;
    const resultado = validarPlaca(this.nuevoRegistro.placa);
    if (!resultado.valida) {
      this.toastService.warning('Placa inválida', resultado.mensaje);
      return;
    }
    this.nuevoRegistro.placa = resultado.placa;

    if (!this.nuevoRegistro.ordenTrabajoOT) {
      this.toastService.warning('Campos Incompletos', 'Ingrese el Nº de OT.');
      return;
    }

    const ocupada = this.servicios.find(s =>
      placasEquivalentes(s.placa, resultado.placa) && s.estado === 'EN PROCESO'
    );
    if (ocupada) {
      this.toastService.warning(
        'Placa en bahía',
        `${resultado.placa} ya tiene la OT ${ocupada.ordenTrabajoOT} en proceso.`
      );
      return;
    }

    const payload = {
      ...this.nuevoRegistro,
      insumosUtilizados: [...this.insumosConsumoForm]
    };

    // 1. Descuento automático de stock de la sucursal y registro de consumo
    if (this.insumosConsumoForm.length > 0) {
      this.inventarioService.consumirInsumosServicio(
        this.nuevoRegistro.agencia,
        this.nuevoRegistro.ordenTrabajoOT,
        this.nuevoRegistro.placa,
        this.insumosConsumoForm,
        this.nuevoRegistro.empleado
      ).subscribe(res => {
        // Disparar toasts de alerta si algún insumo cayó en nivel bajo/crítico
        if (res.alertasGeneradas && res.alertasGeneradas.length > 0) {
          res.alertasGeneradas.forEach(msg => {
            this.toastService.warning('Alerta de Stock Insumos', msg);
          });
        }
      });
    }

    // 2. Guardar registro de servicio
    this.servicioService.crearRegistroHojaServicio(payload as any).subscribe(creado => {
      this.toastService.success(
        'Hoja de Control Creada',
        `Servicio ${creado.ordenTrabajoOT} (${creado.placa}) registrado. Insumos descontados de ${this.nuevoRegistro.agencia}.`
      );
      this.modalNuevoRegistroOpen = false;
      this.recalcularServiciosFiltrados();
    });
  }

  finalizarServicio(item: VehiculoServicio) {
    this.servicioService.finalizarServicioOperador(item.id).subscribe(res => {
      if (res) {
        this.toastService.success('Servicio Finalizado', `Vehículo ${item.placa} finalizado. Enviado a Aprobación del Gerente.`);
        this.recalcularServiciosFiltrados();
      }
    });
  }

  aprobarServicio(item: VehiculoServicio) {
    this.servicioService.aprobarServicioGerente(item.id).subscribe(res => {
      if (res) {
        this.toastService.success('Servicio Aprobado', `Servicio ${item.placa} aprobado por Gerencia.`);
        this.recalcularServiciosFiltrados();
      }
    });
  }

  verVideoEvidencia(item: VehiculoServicio) {
    this.servicioSeleccionado = item;
    this.modalVideoOpen = true;
  }

  abrirDetalle(item: VehiculoServicio) {
    this.servicioDetalleSeleccionado = item;
    this.modalDetalleOpen = true;
  }

  // ── Métodos para Asignaciones Especiales (Extras) ──────────────────────
  get extrasPendientes()  { return this.serviciosExtras.filter(e => e.estado === 'Pendiente').length; }
  get extrasEnProceso()   { return this.serviciosExtras.filter(e => e.estado === 'En Proceso').length; }
  get extrasCompletados() { return this.serviciosExtras.filter(e => e.estado === 'Completado').length; }
  get extrasCancelados()  { return this.serviciosExtras.filter(e => e.estado === 'Cancelado').length; }

  get extrasFiltrados() {
    return this.serviciosExtras.filter(e => {
      const matchEst = this.filtroEstadoExtras === 'TODOS' || e.estado === this.filtroEstadoExtras;
      const matchOp = this.filtroOperadorExtras === 0 || e.operadorId === this.filtroOperadorExtras;
      const matchTxt = this.busquedaExtras === '' ||
        e.servicioNombre.toLowerCase().includes(this.busquedaExtras.toLowerCase()) ||
        e.codigoSE.toLowerCase().includes(this.busquedaExtras.toLowerCase()) ||
        e.operadorNombre.toLowerCase().includes(this.busquedaExtras.toLowerCase());
      return matchEst && matchOp && matchTxt;
    });
  }

  get paginatedExtras() {
    const start = (this.currentPageExtras - 1) * this.pageSizeExtras;
    return this.extrasFiltrados.slice(start, start + this.pageSizeExtras);
  }

  onPageChangeExtras(page: number) { this.currentPageExtras = page; }
  onPageSizeChangeExtras(size: number) { this.pageSizeExtras = size; this.currentPageExtras = 1; }

  abrirModalNuevoExtra() {
    this.isEditingExtras = false;
    this.editandoExtraId = null;
    this.extraForm = {
      servicioNombre: '',
      servicioDescripcion: '',
      operadorId: this.operadores[0]?.id || 0,
      operadorNombre: this.operadores[0]?.nombre || '',
      sucursalesSeleccionadas: [],
      insumosReceta: [],
      estado: 'Pendiente',
      fechaProgramada: new Date().toISOString().substring(0, 10),
      notas: ''
    };
    this.showModalExtras = true;
  }

  abrirModalEditarExtra(extra: ServicioExtra) {
    this.isEditingExtras = true;
    this.editandoExtraId = extra.id;
    this.extraForm = {
      servicioNombre: extra.servicioNombre,
      servicioDescripcion: extra.servicioDescripcion || '',
      operadorId: extra.operadorId,
      operadorNombre: extra.operadorNombre,
      sucursalesSeleccionadas: [...extra.sucursales],
      insumosReceta: JSON.parse(JSON.stringify(extra.insumosReceta)),
      estado: extra.estado,
      fechaProgramada: extra.fechaProgramada,
      notas: extra.notas || ''
    };
    this.showModalExtras = true;
  }

  cerrarModalExtras() { this.showModalExtras = false; }

  onOperadorExtraChange() {
    const op = this.operadores.find(o => o.id === Number(this.extraForm.operadorId));
    if (op) this.extraForm.operadorNombre = op.nombre;
  }

  toggleSucursalExtra(sucursal: string) {
    const idx = this.extraForm.sucursalesSeleccionadas.indexOf(sucursal);
    if (idx === -1) {
      this.extraForm.sucursalesSeleccionadas.push(sucursal);
    } else {
      this.extraForm.sucursalesSeleccionadas.splice(idx, 1);
    }
  }

  isSucursalExtraSeleccionada(sucursal: string): boolean {
    return this.extraForm.sucursalesSeleccionadas.includes(sucursal);
  }

  agregarInsumoRecetaExtra(productoIdStr: string) {
    if (!productoIdStr) return;
    const prodId = Number(productoIdStr);
    const item = this.productosInventario.find(i => i.producto.id === prodId);
    if (!item) return;
    const existe = this.extraForm.insumosReceta.find(r => r.productoId === prodId);
    if (existe) {
      existe.cantidadSugerida += 1;
    } else {
      this.extraForm.insumosReceta.push({
        productoId: item.producto.id,
        productoSKU: item.producto.codigoSKU,
        productoNombre: item.producto.nombre,
        unidadMedida: item.producto.unidadMedida,
        cantidadSugerida: 1
      });
    }
  }

  aumentarInsumoRecetaExtra(index: number) {
    const ins = this.extraForm.insumosReceta[index];
    if (ins) ins.cantidadSugerida = Math.round((ins.cantidadSugerida + 0.5) * 10) / 10;
  }

  disminuirInsumoRecetaExtra(index: number) {
    const ins = this.extraForm.insumosReceta[index];
    if (ins && ins.cantidadSugerida > 0.5) {
      ins.cantidadSugerida = Math.round((ins.cantidadSugerida - 0.5) * 10) / 10;
    }
  }

  eliminarInsumoRecetaExtra(index: number) {
    this.extraForm.insumosReceta.splice(index, 1);
  }

  guardarServicioExtra() {
    if (!this.extraForm.servicioNombre.trim() || !this.extraForm.operadorId) {
      this.toastService.warning('Datos incompletos', 'Ingrese el nombre del servicio y seleccione un operador.');
      return;
    }
    const payload = {
      servicioNombre: this.extraForm.servicioNombre.trim(),
      servicioDescripcion: this.extraForm.servicioDescripcion.trim(),
      operadorId: Number(this.extraForm.operadorId),
      operadorNombre: this.extraForm.operadorNombre,
      sucursales: this.extraForm.sucursalesSeleccionadas,
      insumosReceta: this.extraForm.insumosReceta,
      estado: this.extraForm.estado,
      fechaProgramada: this.extraForm.fechaProgramada,
      notas: this.extraForm.notas,
      creadoPor: 'Franklin Administrador'
    };

    if (this.isEditingExtras && this.editandoExtraId) {
      this.extrasMock.actualizarServicioExtra(this.editandoExtraId, payload).subscribe(() => {
        this.toastService.success('Asignación Actualizada', 'Los cambios han sido guardados.');
        this.cerrarModalExtras();
      });
    } else {
      this.extrasMock.crearServicioExtra(payload).subscribe(() => {
        this.toastService.success('Asignación Creada', 'El servicio especial ha sido asignado al operador.');
        this.cerrarModalExtras();
      });
    }
  }

  cambiarEstadoExtra(extra: ServicioExtra, estado: ServicioExtra['estado']) {
    this.extrasMock.cambiarEstado(extra.id, estado).subscribe(() => {
      this.toastService.success('Estado Actualizado', `Asignación ${extra.codigoSE} marcada como ${estado}.`);
    });
  }

  eliminarExtra(id: number) {
    this.extrasMock.eliminarServicioExtra(id).subscribe(() => {
      this.toastService.info('Asignación Eliminada', 'El registro ha sido removido del sistema.');
    });
  }

  estadoExtraClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'bg-amber-50 text-amber-700 border-amber-200',
      'En Proceso': 'bg-blue-50 text-blue-700 border-blue-200',
      'Completado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Cancelado': 'bg-slate-100 text-slate-500 border-slate-200'
    };
    return map[estado] || 'bg-slate-100 text-slate-500 border-slate-200';
  }
}

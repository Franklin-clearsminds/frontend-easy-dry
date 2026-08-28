import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ServicioLavadoMockService } from '../../infrastructure/mocks/servicio-lavado-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { InventarioMockService } from '../../infrastructure/mocks/inventario-mock.service';
import { VehiculoServicio, CatalogoServicio, InsumoConsumidoServicio, InventarioItem } from '../../domain';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { Role } from '../../domain';
import { CatalogoServiciosMockService } from '../../infrastructure/mocks/catalogo-servicios-mock.service';
import { ServiciosExtrasMockService } from '../../infrastructure/mocks/servicios-extras-mock.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

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

        <button
          (click)="modalNuevoRegistroOpen = true"
          class="px-4 py-3 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
          <i-lucide name="plus" class="w-4 h-4"></i-lucide>
          <span>Nueva Hoja de Control (OT)</span>
        </button>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="!isOperador" 
        [showOperador]="!isOperador"
        [showBahia]="!isOperador"
        [showEstado]="true"
        [showFechas]="true"
        [listaEstados]="['Todos', 'EN PROCESO', 'FINALIZADO', 'APROBADO', 'RECHAZADO']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Additional Search and Categories -->
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
              placeholder="Buscar por placa (ej. PBX-8932) u Orden OT..." 
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
          </div>

          <select [(ngModel)]="filtroCategoria" (change)="aplicarFiltros()" class="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2">
            <option value="Todas">Todas las Categorías</option>
            <option value="Servicios Generales">Servicios Generales</option>
            <option value="Servicios Especiales">Servicios Especiales</option>
            <option value="Servicios Extras">Servicios Extras</option>
          </select>
        </div>

        <div class="text-xs font-semibold text-slate-500">
          Servicios Registrados: <strong class="text-easydry-blue">{{ serviciosFiltrados.length }} Vehículos</strong>
        </div>
      </div>

      <!-- Services List / Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <!-- Desktop Table View -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Orden & OT</th>
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
                    <span class="text-[10px] text-slate-400 font-mono block mt-0.5">{{ item.numeroOrden || 'ORD-2026' }}</span>
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
                        'bg-amber-100 text-amber-800 border-amber-300': item.categoriaServicio === 'ESPECIAL' || item.categoriaServicio === 'Servicios Especiales',
                        'bg-purple-100 text-purple-800 border-purple-300': item.categoriaServicio === 'EXTRA' || item.categoriaServicio === 'Servicios Extras',
                        'bg-blue-100 text-blue-800 border-blue-300': item.categoriaServicio === 'GENERAL' || item.categoriaServicio === 'Servicios Generales' || !item.categoriaServicio
                      }">
                      {{ 
                        item.categoriaServicio === 'ESPECIAL' || item.categoriaServicio === 'Servicios Especiales' ? 'Servicios Especiales' : 
                        (item.categoriaServicio === 'EXTRA' || item.categoriaServicio === 'Servicios Extras' ? 'Servicios Extras' : 'Servicios Generales') 
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
                        class="p-2 bg-slate-100 hover:bg-easydry-blue hover:text-white text-easydry-blue rounded-xl text-xs transition-colors inline-flex items-center gap-1 font-bold shadow-2xs">
                        <i-lucide name="film" class="w-4 h-4 text-easydry-green"></i-lucide>
                        <span>Ver Vídeo</span>
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
                          class="px-3 py-1.5 bg-easydry-blue text-white font-bold rounded-lg text-xs hover:bg-easydry-blue-dark transition-colors">
                          Finalizar Servicio
                        </button>
                      }

                      @if (item.estado === 'FINALIZADO' && canApprove) {
                        <button
                          (click)="aprobarServicio(item)"
                          class="px-3 py-1.5 bg-easydry-green text-slate-950 font-extrabold rounded-lg text-xs hover:bg-easydry-green-dark transition-colors shadow-xs">
                          Aprobar
                        </button>
                      }

                      @if (item.estado === 'APROBADO') {
                        <span class="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-bold flex items-center gap-1">
                          <i-lucide name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
                          Aprobado
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

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nº Orden</label>
              <input type="text" [(ngModel)]="nuevoRegistro.numeroOrden" name="numeroOrden" placeholder="ORD-2026-005" class="w-full p-2 border rounded-xl text-xs font-mono" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nº OT (Orden Trabajo)</label>
              <input type="text" [(ngModel)]="nuevoRegistro.ordenTrabajoOT" name="ordenTrabajoOT" placeholder="OT-9840" class="w-full p-2 border rounded-xl text-xs font-mono" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Placa Vehículo</label>
              <input type="text" [(ngModel)]="nuevoRegistro.placa" name="placa" placeholder="PBX-1234" class="w-full p-2 border rounded-xl text-xs font-mono font-bold uppercase" required>
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
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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

              <label 
                class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold transition-all"
                [ngClass]="nuevoRegistro.categoriaServicio === 'EXTRA' ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-white text-slate-700 hover:border-slate-300'">
                <input type="radio" [(ngModel)]="nuevoRegistro.categoriaServicio" name="catRadio" value="EXTRA" (change)="onCategoriaChange()" class="hidden">
                <span class="flex items-center gap-1.5"><i-lucide name="sparkles" class="w-4 h-4"></i-lucide> Extras</span>
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
                class="px-3 py-2 bg-easydry-blue text-white rounded-xl text-xs font-bold whitespace-nowrap">
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

    </div>
  `
})
export class ServiciosComponent implements OnInit {
  servicios: VehiculoServicio[] = [];
  serviciosFiltrados: VehiculoServicio[] = [];
  servicioSeleccionado?: VehiculoServicio;

  filtroTexto = '';
  filtroCategoria = 'Todas';
  
  // Guardamos el estado global
  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
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

  modalDetalleOpen = false;
  servicioDetalleSeleccionado?: VehiculoServicio;

  opcionesServicios: CatalogoServicio[] = [];
  catalogoCompleto: CatalogoServicio[] = [];

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

  productosInventario: InventarioItem[] = [];
  insumosConsumoForm: InsumoConsumidoServicio[] = [];

  private catalogoMock = inject(CatalogoServiciosMockService);
  private extrasMock = inject(ServiciosExtrasMockService);
  private inventarioService = inject(InventarioMockService);
  private servicioService = inject(ServicioLavadoMockService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);

  // ── Role helpers ──
  get isOperador() { return this.authService.hasRole(Role.OPERADOR); }
  get isGerente() { return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.GERENTE]); }
  get isSuperAdmin() { return this.authService.hasRole(Role.SUPER_ADMIN); }

  /** Solo Gerente y SuperAdmin pueden aprobar servicios */
  get canApprove() {
    return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.GERENTE]);
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
      this.onCategoriaChange();
    });

    this.inventarioService.getItems().subscribe(items => {
      this.productosInventario = items;
    });
  }

  onCategoriaChange() {
    if (this.nuevoRegistro.categoriaServicio === 'EXTRA') {
      // Cargar lista de servicios extras
      this.extrasMock.getServiciosExtras().subscribe(extras => {
        this.opcionesServicios = extras.map(e => ({
          id: e.id,
          nombre: e.servicioNombre,
          codigo: e.codigoSE,
          categoria: 'EXTRA',
          descripcion: e.servicioDescripcion || '',
          estado: 'Activo',
          requiereFoto: true,
          requiereVideo: true,
          insumosReceta: e.insumosReceta
        }));
        if (this.opcionesServicios.length > 0) {
          this.nuevoRegistro.servicio = this.opcionesServicios[0].nombre;
          this.nuevoRegistro.servicioId = this.opcionesServicios[0].id;
          this.onServicioSelect();
        }
      });
    } else {
      this.opcionesServicios = this.catalogoCompleto.filter(s => s.categoria === this.nuevoRegistro.categoriaServicio);
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
          matchCat = s.categoriaServicio === 'Servicios Especiales' || s.categoriaServicio === 'ESPECIAL';
        } else if (this.filtroCategoria === 'Servicios Extras') {
          matchCat = s.categoriaServicio === 'Servicios Extras' || s.categoriaServicio === 'EXTRA';
        }
      }

      return matchTexto && matchCat;
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

  guardarHojaServicio() {
    if (!this.nuevoRegistro.placa || !this.nuevoRegistro.ordenTrabajoOT) {
      this.toastService.warning('Campos Incompletos', 'Ingrese placa y Nº de OT.');
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
}

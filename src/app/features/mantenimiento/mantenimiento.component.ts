import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MantenimientoMockService } from '../../core/services/mantenimiento-mock.service';
import { MaquinariaMockService } from '../../core/services/maquinaria-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { Mantenimiento, Maquinaria, ArchivoAdjunto } from '../../core/models';
import { Role } from '../../core/models/roles.model';
import { DEMO_CREDENTIALS } from '../../core/services/auth.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { FileUploaderComponent } from '../../shared/components/file-uploader/file-uploader.component';
import { ModalPortalDirective } from '../../shared/directives/modal-portal.directive';

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent, FileUploaderComponent, ModalPortalDirective],
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
            class="px-4 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs self-start sm:self-auto cursor-pointer">
            <i-lucide name="calendar-clock" class="w-4 h-4"></i-lucide>
            <span>Agendar Mantenimiento</span>
          </button>
        </div>
      }

      <!-- Calendar / Visual Timeline Banner (Punto 17) -->
      <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-base font-outfit flex items-center gap-2">
            <i-lucide name="calendar-clock" class="w-5 h-5 text-easydry-blue"></i-lucide>
            <span>Línea de Tiempo de Intervenciones Técnicas (Julio - Agosto 2026)</span>
          </h3>
          <span class="text-xs text-slate-400">Haga clic en una fecha para ver la ficha técnica</span>
        </div>

        <!-- Calendar Days Grid Bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          @for (day of diasCalendario; track day.fecha) {
            <div 
              (click)="seleccionarDia(day)"
              class="p-3.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer hover:shadow-xs hover:border-easydry-blue"
              [ngClass]="{
                'bg-easydry-blue/15 border-easydry-blue text-easydry-blue font-bold ring-2 ring-easydry-blue/30': diaSeleccionado?.fecha === day.fecha,
                'bg-easydry-blue/10 border-easydry-blue text-easydry-blue font-bold': day.tieneMantenimiento && diaSeleccionado?.fecha !== day.fecha,
                'bg-slate-50 border-slate-200 text-slate-600': !day.tieneMantenimiento && diaSeleccionado?.fecha !== day.fecha
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

        <!-- Ficha de Intervención Técnica Desplegable (Punto 17) -->
        @if (diaSeleccionado) {
          <div class="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fade-in">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div class="flex items-center gap-2.5">
                <span class="p-2 bg-easydry-blue text-white rounded-xl">
                  <i-lucide name="wrench" class="w-4 h-4"></i-lucide>
                </span>
                <div>
                  <h4 class="font-bold text-slate-900 text-sm">Ficha Técnica de Intervención: {{ diaSeleccionado.fecha }}</h4>
                  <p class="text-xs text-slate-500">{{ diaSeleccionado.evento || 'Visita preventiva programada' }}</p>
                </div>
              </div>
              <button (click)="diaSeleccionado = null" class="text-slate-400 hover:text-slate-600 text-xs font-bold">Cerrar ✕</button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div class="p-3 bg-white rounded-xl border border-slate-200">
                <span class="text-[10px] text-slate-400 font-bold uppercase block">Técnico Asignado</span>
                <span class="font-bold text-slate-900 block mt-0.5">{{ diaSeleccionado.tecnico || 'Ing. Marco Andrade' }}</span>
              </div>
              <div class="p-3 bg-white rounded-xl border border-slate-200">
                <span class="text-[10px] text-slate-400 font-bold uppercase block">Estado de la Visita</span>
                <span class="font-bold text-emerald-700 block mt-0.5">{{ diaSeleccionado.estado || 'Programado' }}</span>
              </div>
              <div class="p-3 bg-white rounded-xl border border-slate-200">
                <span class="text-[10px] text-slate-400 font-bold uppercase block">Duración Estimada</span>
                <span class="font-bold text-easydry-blue block mt-0.5">{{ diaSeleccionado.duracion || '120 min (2 Horas)' }}</span>
              </div>
              <div class="p-3 bg-white rounded-xl border border-slate-200">
                <span class="text-[10px] text-slate-400 font-bold uppercase block">Evidencias Multimedia</span>
                <span class="font-bold text-purple-700 block mt-0.5">2 Fotos / 1 Video S3</span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="true" 
        [showOperador]="false"
        [showBahia]="true"
        [showEstado]="true"
        [showFechas]="true"
        [listaEstados]="['Todos', 'Programado', 'En Proceso', 'Completado']"
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
                <th class="py-3.5 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (m of paginatedMantenimientos; track m.id) {
                <tr class="hover:bg-slate-50/80 transition-colors cursor-pointer" (click)="abrirDetalle(m)">
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
                  <td class="py-3.5 px-4">
                    <div class="flex flex-col gap-1.5">
                      @if (m.estado !== 'Completado' && m.estado !== 'Cancelado') {
                        @if (puedeAsignar) {
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
                        }
                        @if (puedeCompletar(m)) {
                          <button
                            (click)="abrirModalCompletar(m); $event.stopPropagation()"
                            class="px-3 py-1.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-lg text-[10px] inline-flex items-center gap-1">
                            <i-lucide name="check-circle-2" class="w-3 h-3"></i-lucide>
                            Registrar realización
                          </button>
                        }
                      } @else if (m.estado === 'Completado') {
                        <button
                          (click)="abrirDetalle(m); $event.stopPropagation()"
                          class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[10px] inline-flex items-center gap-1">
                          <i-lucide name="eye" class="w-3 h-3"></i-lucide>
                          Ver cierre
                        </button>
                      }
                    </div>
                  </td>
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
              @if (m.estado !== 'Completado' && m.estado !== 'Cancelado') {
                <div class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100" (click)="$event.stopPropagation()">
                  @if (puedeAsignar) {
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
                  }
                  @if (puedeCompletar(m)) {
                    <button
                      (click)="abrirModalCompletar(m)"
                      class="px-3 py-1.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-lg text-[10px]">
                      Registrar realización
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
        [title]="'Ficha Técnica: ' + (mantenimientoDetalleSeleccionado?.maquina || 'Mantenimiento')" 
        icon="clipboard-list"
        (close)="modalDetalleOpen = false">
        
        @if (mantenimientoDetalleSeleccionado; as m) {
          <div class="space-y-5 max-h-[65vh] overflow-y-auto pr-1">

            <!-- Resumen superior -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Orden #MNT-{{ m.id }}</span>
                <h3 class="text-lg font-bold text-slate-900">{{ m.maquina }}</h3>
                <p class="text-xs text-slate-500">{{ m.agencia || 'Sin agencia' }} · Programado: {{ m.fecha }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-3 py-1.5 rounded-xl text-xs font-extrabold"
                  [ngClass]="{
                    'bg-amber-100 text-amber-800 border border-amber-300': m.estado === 'Programado',
                    'bg-easydry-blue/15 text-easydry-blue border border-easydry-blue/30': m.estado === 'En Proceso',
                    'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40': m.estado === 'Completado',
                    'bg-rose-100 text-rose-800 border border-rose-300': m.estado === 'Cancelado'
                  }">
                  {{ m.estado }}
                </span>
                @if (m.costo) {
                  <span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    \${{ m.costo }} USD
                  </span>
                }
              </div>
            </div>

            <!-- Sección 1: Programación -->
            <div class="p-4 rounded-2xl border border-easydry-blue/20 bg-easydry-blue/5 space-y-3">
              <div class="flex items-center justify-between border-b border-easydry-blue/20 pb-2">
                <h4 class="font-bold text-easydry-blue text-xs uppercase flex items-center gap-1.5">
                  <i-lucide name="calendar-clock" class="w-4 h-4"></i-lucide>
                  1. Programación e Intervención
                </h4>
                <span class="text-[11px] text-slate-500">{{ m.tipo }}</span>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Fecha Programada</span>
                  <span class="font-mono font-extrabold text-easydry-blue">{{ m.fecha }}</span>
                </div>
                <div>
                  <span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Técnico Asignado</span>
                  <span class="font-bold text-slate-800">{{ m.tecnicoAsignadoNombre || m.tecnico }}</span>
                </div>
                @if (m.gestorAsignadorNombre) {
                  <div>
                    <span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Asignado por</span>
                    <span class="font-semibold text-slate-700">{{ m.gestorAsignadorNombre }}</span>
                  </div>
                }
                @if (m.fechaAsignacion) {
                  <div>
                    <span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Fecha Asignación</span>
                    <span class="font-mono text-slate-700">{{ m.fechaAsignacion }}</span>
                  </div>
                }
              </div>

              <div class="pt-1">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Descripción del Trabajo</span>
                <p class="text-xs text-slate-800 leading-relaxed">{{ m.descripcion }}</p>
              </div>
            </div>

            <!-- Sección 2: Cierre (solo completados) -->
            @if (m.estado === 'Completado') {
              <div class="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                <div class="flex items-center justify-between border-b border-emerald-200/60 pb-2 flex-wrap gap-2">
                  <h4 class="font-bold text-emerald-900 text-xs uppercase flex items-center gap-1.5">
                    <i-lucide name="check-circle-2" class="w-4 h-4 text-emerald-600"></i-lucide>
                    2. Informe de Cierre Técnico
                  </h4>
                  <span class="text-[11px] text-slate-500">
                    Cerrado por: <strong>{{ m.cerradoPor || m.tecnico }}</strong>
                    @if (m.fechaFin) { · {{ m.fechaFin }} @if (m.horaFin) { {{ m.horaFin }} } }
                  </span>
                </div>

                @if (m.observacionCierre) {
                  <p class="text-xs text-slate-800 leading-relaxed font-medium">{{ m.observacionCierre }}</p>
                } @else {
                  <p class="text-xs text-slate-500 italic">Sin informe de cierre registrado.</p>
                }

                @if (m.costo) {
                  <p class="text-xs text-slate-700">
                    <strong>Costo final:</strong>
                    <span class="font-bold text-emerald-700 font-mono ml-1">\${{ m.costo }} USD</span>
                  </p>
                }
              </div>
            }

            <!-- Sección 3: Evidencias -->
            @if (tieneEvidencias(m)) {
              <div class="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/20 space-y-4">
                <div class="flex items-center justify-between border-b border-indigo-200/60 pb-2">
                  <h4 class="font-bold text-indigo-900 text-xs uppercase flex items-center gap-1.5">
                    <i-lucide name="camera" class="w-4 h-4 text-indigo-600"></i-lucide>
                    {{ m.estado === 'Completado' ? '3. Evidencias del Mantenimiento Realizado' : '2. Evidencias Adjuntas' }}
                  </h4>
                  <span class="text-[10px] text-slate-500 font-mono">
                    {{ getFotosMantenimiento(m).length }} foto(s) · {{ getVideosMantenimiento(m).length }} video(s) · {{ getDocumentosMantenimiento(m).length }} doc(s)
                  </span>
                </div>

                @if (getFotosMantenimiento(m).length > 0) {
                  <div>
                    <p class="text-[10px] font-bold text-slate-500 uppercase mb-2">Fotografías:</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      @for (foto of getFotosMantenimiento(m); track foto) {
                        <div class="relative group rounded-xl overflow-hidden border border-emerald-200 shadow-xs cursor-pointer" (click)="verMediaZoom(foto, 'imagen')">
                          <img [src]="foto" alt="Evidencia mantenimiento" class="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-200">
                          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <i-lucide name="zoom-in" class="w-5 h-5"></i-lucide>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (getVideosMantenimiento(m).length > 0) {
                  <div>
                    <p class="text-[10px] font-bold text-slate-500 uppercase mb-2">Vídeos de prueba operativa:</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      @for (video of getVideosMantenimiento(m); track video) {
                        <div class="rounded-xl overflow-hidden border bg-black shadow-xs">
                          <video [src]="video" controls class="w-full h-40 object-cover"></video>
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (getDocumentosMantenimiento(m).length > 0) {
                  <div class="pt-2 border-t border-indigo-200/50">
                    <p class="text-[10px] font-bold text-indigo-900 uppercase mb-2 flex items-center gap-1">
                      <i-lucide name="file-text" class="w-3.5 h-3.5 text-indigo-600"></i-lucide>
                      Documentos (Informes / Facturas):
                    </p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      @for (doc of getDocumentosMantenimiento(m); track doc.id) {
                        <div class="p-2.5 bg-white border border-indigo-100 rounded-xl flex items-center justify-between shadow-2xs">
                          <div class="flex items-center gap-2 overflow-hidden min-w-0">
                            <div class="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 flex-shrink-0">
                              <i-lucide name="file-text" class="w-4 h-4"></i-lucide>
                            </div>
                            <div class="overflow-hidden min-w-0">
                              <p class="text-xs font-bold text-slate-800 truncate">{{ doc.nombre }}</p>
                              <p class="text-[10px] text-slate-400 font-mono">{{ doc.tamanio || '1 MB' }} · {{ doc.extension || 'PDF' }}</p>
                            </div>
                          </div>
                          <button type="button" (click)="descargarDocumento(doc)"
                            class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 flex-shrink-0">
                            <i-lucide name="download" class="w-3.5 h-3.5"></i-lucide>
                            <span>Descargar</span>
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else if (m.estado === 'Completado') {
              <div class="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <i-lucide name="image" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i-lucide>
                <p class="text-xs text-slate-500">Este mantenimiento no tiene evidencias multimedia adjuntas.</p>
              </div>
            }

          </div>
        }

        <div modal-footer class="flex flex-col gap-2 w-full">
          @if (mantenimientoDetalleSeleccionado && mantenimientoDetalleSeleccionado.estado !== 'Completado' && puedeCompletar(mantenimientoDetalleSeleccionado)) {
             <button
                (click)="abrirModalCompletarDesdeDetalle()"
                class="w-full px-4 py-2.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm">
                <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide> Registrar Mantenimiento Realizado
             </button>
          }
          <button (click)="modalDetalleOpen = false" class="w-full px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs mt-1">Cerrar Ficha</button>
        </div>
      </app-modal>

      <!-- Lightbox evidencias -->
      @if (mediaZoomUrl) {
        <div appModalPortal class="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6 animate-fade-in" (click)="cerrarMediaZoom()">
          <div class="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center" (click)="$event.stopPropagation()">
            <button (click)="cerrarMediaZoom()" class="absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors">
              <i-lucide name="x" class="w-6 h-6"></i-lucide>
            </button>
            <img [src]="mediaZoomUrl" alt="Evidencia ampliada" class="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/20">
          </div>
        </div>
      }

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
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Duración Estimada (Horas)</label>
              <input type="number" [(ngModel)]="nuevoMantenimiento.duracionHoras" name="duracionHoras" class="w-full p-2.5 border rounded-xl text-sm" min="1" required>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Trabajo</label>
            <textarea [(ngModel)]="nuevoMantenimiento.descripcion" name="descripcion" rows="3" placeholder="Detalle de repuestos y tareas..." class="w-full p-2.5 border rounded-xl text-sm" required></textarea>
          </div>

          <!-- Subida de Evidencias S3 (Punto 8) -->
          <div class="pt-2">
            <app-file-uploader
              label="Evidencias / Fotos y Videos (Almacenamiento S3)"
              (archivosChange)="evidenciasSubidas = $event">
            </app-file-uploader>
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

      <!-- Modal Registrar Mantenimiento Realizado -->
      <app-modal
        [isOpen]="modalCompletarOpen"
        [title]="'Registrar realización: ' + (mantenimientoCompletar?.maquina || '')"
        icon="check-circle-2"
        zClass="z-[10050]"
        (close)="modalCompletarOpen = false">

        @if (mantenimientoCompletar) {
          <div class="space-y-4">
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="font-bold text-slate-800">{{ mantenimientoCompletar.maquina }}</span>
                <span class="font-mono text-easydry-blue">{{ mantenimientoCompletar.fecha }}</span>
              </div>
              <p class="text-slate-600"><strong>Tipo:</strong> {{ mantenimientoCompletar.tipo }} · <strong>Técnico:</strong> {{ mantenimientoCompletar.tecnico }}</p>
              <p class="text-slate-500">{{ mantenimientoCompletar.descripcion }}</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Informe Técnico del Trabajo Realizado</label>
              <textarea
                [(ngModel)]="completarForm.observacionCierre"
                rows="3"
                placeholder="Describa las tareas ejecutadas, repuestos cambiados y pruebas de funcionamiento..."
                class="w-full p-3 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-easydry-green"></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Finalización</label>
                <input type="date" [(ngModel)]="completarForm.fechaFin" class="w-full p-2.5 border rounded-xl text-sm">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Costo Real ($ USD)</label>
                <input type="number" [(ngModel)]="completarForm.costo" min="0" step="0.01" placeholder="85.00" class="w-full p-2.5 border rounded-xl text-sm font-mono font-bold">
              </div>
            </div>

            <div class="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <label class="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                  <i-lucide name="camera" class="w-4 h-4 text-emerald-600"></i-lucide>
                  Evidencias del Mantenimiento (Fotos / Vídeos)
                </label>
                <span class="text-[11px] text-slate-500">Fotos del trabajo y video de prueba</span>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="cursor-pointer px-4 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-2">
                  <i-lucide name="upload-cloud" class="w-4 h-4"></i-lucide>
                  <span>Subir Fotos / Videos</span>
                  <input type="file" multiple accept="image/*,video/*" (change)="onSubirMultimediaCompletar($event)" class="hidden">
                </label>
                <button type="button" (click)="agregarMultimediaCompletarDemo()"
                  class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
                  + Cargar Fotos/Video Demo
                </button>
              </div>
              @if (multimediaCompletar.length > 0) {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  @for (m of multimediaCompletar; track m.id; let idx = $index) {
                    <div class="relative bg-white border rounded-xl p-2 shadow-xs">
                      @if (m.tipo === 'imagen') {
                        <img [src]="m.url" alt="Evidencia" class="w-full h-24 object-cover rounded-lg">
                      } @else {
                        <div class="w-full h-24 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white">
                          <i-lucide name="film" class="w-8 h-8 text-emerald-400"></i-lucide>
                          <span class="text-[9px] mt-1 font-mono">Vídeo</span>
                        </div>
                      }
                      <p class="text-[10px] font-semibold text-slate-700 truncate mt-1">{{ m.nombre }}</p>
                      <button type="button" (click)="eliminarMultimediaCompletar(idx)"
                        class="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full">
                        <i-lucide name="x" class="w-3 h-3"></i-lucide>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <label class="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1.5">
                  <i-lucide name="file-text" class="w-4 h-4 text-indigo-600"></i-lucide>
                  Documentos (PDF / Factura / Informe)
                </label>
                <span class="text-[11px] text-slate-500">PDF, DOC, XLS</span>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="cursor-pointer px-4 py-2.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-2">
                  <i-lucide name="file-plus" class="w-4 h-4"></i-lucide>
                  <span>Adjuntar Documento</span>
                  <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" (change)="onSubirDocumentosCompletar($event)" class="hidden">
                </label>
                <button type="button" (click)="agregarDocumentosCompletarDemo()"
                  class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
                  + Adjuntar PDF Demo
                </button>
              </div>
              @if (documentosCompletar.length > 0) {
                <div class="space-y-2 pt-2">
                  @for (doc of documentosCompletar; track doc.id; let idx = $index) {
                    <div class="p-2.5 bg-white border border-indigo-100 rounded-xl flex items-center justify-between">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <div class="p-2 rounded-lg bg-indigo-100 text-indigo-700 flex-shrink-0">
                          <i-lucide name="file-text" class="w-4 h-4"></i-lucide>
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs font-bold text-slate-900 truncate">{{ doc.nombre }}</p>
                          <p class="text-[10px] text-slate-400 font-mono">{{ doc.tamanio || '1.4 MB' }} · {{ doc.extension || 'PDF' }}</p>
                        </div>
                      </div>
                      <button type="button" (click)="eliminarDocumentoCompletar(idx)"
                        class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                        <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <div modal-footer>
          <button (click)="modalCompletarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarCompletarMantenimiento()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs">
            Confirmar Mantenimiento Realizado
          </button>
        </div>
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
  modalCompletarOpen = false;
  mantenimientoAsignar?: Mantenimiento;
  mantenimientoCompletar?: Mantenimiento;

  completarForm = {
    observacionCierre: '',
    fechaFin: new Date().toISOString().substring(0, 10),
    costo: 0
  };
  multimediaCompletar: ArchivoAdjunto[] = [];
  documentosCompletar: ArchivoAdjunto[] = [];
  mediaZoomUrl: string | null = null;

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

  diaSeleccionado: any = null;
  evidenciasSubidas: ArchivoAdjunto[] = [];

  nuevoMantenimiento = {
    maquina: 'Hidrolavadora Ecológica HD-001',
    tipo: 'Preventivo' as Mantenimiento['tipo'],
    fecha: '2026-08-05',
    tecnico: 'Sin asignar',
    estado: 'Programado' as Mantenimiento['estado'],
    duracionHoras: 2,
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

  seleccionarDia(day: any): void {
    if (this.diaSeleccionado?.fecha === day.fecha) {
      this.diaSeleccionado = null;
    } else {
      this.diaSeleccionado = day;
    }
  }

  guardarMantenimiento() {
    if (!this.nuevoMantenimiento.descripcion) {
      this.toastService.warning('Campos Requeridos', 'Por favor ingrese la descripción del trabajo.');
      return;
    }

    const payload: any = {
      ...this.nuevoMantenimiento,
      duracionMin: (this.nuevoMantenimiento.duracionHoras || 2) * 60,
      archivos: this.evidenciasSubidas.length > 0 ? [...this.evidenciasSubidas] : undefined
    };
    delete payload.costo;

    this.mantenimientoService.registrarMantenimiento(payload).subscribe(creado => {
      this.toastService.success('Mantenimiento Agendado', `Visita agendada para ${creado.maquina} el ${creado.fecha}`);
      this.modalCrearOpen = false;
      this.evidenciasSubidas = [];
    });
  }
  
  abrirDetalle(mantenimiento: Mantenimiento) {
    this.mantenimientoDetalleSeleccionado =
      this.mantenimientos.find(m => m.id === mantenimiento.id) || mantenimiento;
    this.modalDetalleOpen = true;
  }

  getFotosMantenimiento(m: Mantenimiento): string[] {
    const fromArchivos = (m.archivos || []).filter(a => a.tipo === 'imagen').map(a => a.url);
    const fotos = m.fotos || [];
    return [...fotos, ...fromArchivos.filter(u => !fotos.includes(u))];
  }

  getVideosMantenimiento(m: Mantenimiento): string[] {
    const fromArchivos = (m.archivos || []).filter(a => a.tipo === 'video').map(a => a.url);
    const videos = m.videos || [];
    return [...videos, ...fromArchivos.filter(u => !videos.includes(u))];
  }

  getDocumentosMantenimiento(m: Mantenimiento): ArchivoAdjunto[] {
    if (m.documentos?.length) return m.documentos;
    return (m.archivos || []).filter(a => a.tipo === 'documento');
  }

  tieneEvidencias(m: Mantenimiento): boolean {
    return this.getFotosMantenimiento(m).length > 0
      || this.getVideosMantenimiento(m).length > 0
      || this.getDocumentosMantenimiento(m).length > 0;
  }

  verMediaZoom(url: string, _tipo: 'imagen' | 'video'): void {
    this.mediaZoomUrl = url;
  }

  cerrarMediaZoom(): void {
    this.mediaZoomUrl = null;
  }

  descargarDocumento(doc: ArchivoAdjunto): void {
    if (doc.url && doc.url !== '#') {
      window.open(doc.url, '_blank');
    } else {
      this.toastService.info('Demo', `Descarga simulada: ${doc.nombre}`);
    }
  }

  puedeCompletar(m: Mantenimiento): boolean {
    if (m.estado === 'Completado' || m.estado === 'Cancelado') return false;
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    if (this.authService.hasRole(Role.SUPER_ADMIN) || this.authService.hasRole(Role.COORD_MANTENIMIENTO)) {
      return true;
    }
    return this.esTecnico && m.tecnicoAsignadoId === user.id;
  }

  abrirModalCompletar(m: Mantenimiento) {
    this.mantenimientoCompletar = m;
    this.completarForm = {
      observacionCierre: '',
      fechaFin: new Date().toISOString().substring(0, 10),
      costo: m.costo || 0
    };
    this.multimediaCompletar = [];
    this.documentosCompletar = [];
    this.modalCompletarOpen = true;
  }

  abrirModalCompletarDesdeDetalle() {
    if (!this.mantenimientoDetalleSeleccionado) return;
    this.modalDetalleOpen = false;
    this.abrirModalCompletar(this.mantenimientoDetalleSeleccionado);
  }

  private archivoDesdeFile(file: File, tipoForzado?: ArchivoAdjunto['tipo']): ArchivoAdjunto {
    const isVideo = file.type.startsWith('video');
    const isDoc = !file.type.startsWith('image') && !isVideo;
    const tipo: ArchivoAdjunto['tipo'] = tipoForzado || (isVideo ? 'video' : isDoc ? 'documento' : 'imagen');
    return {
      id: `arch-${Date.now()}-${Math.random()}`,
      nombre: file.name,
      tipo,
      extension: file.name.split('.').pop()?.toUpperCase() || (isVideo ? 'MP4' : isDoc ? 'PDF' : 'JPG'),
      url: URL.createObjectURL(file),
      tamanio: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      fechaSubida: new Date().toLocaleTimeString()
    };
  }

  onSubirMultimediaCompletar(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    Array.from(input.files).forEach(file => {
      this.multimediaCompletar.push(this.archivoDesdeFile(file));
    });
    this.toastService.success('Archivos cargados', `${input.files.length} evidencia(s) lista(s).`);
    input.value = '';
  }

  agregarMultimediaCompletarDemo(): void {
    this.multimediaCompletar.push({
      id: `demo-mc-${Date.now()}-1`,
      nombre: 'mantenimiento_realizado.jpg',
      tipo: 'imagen',
      extension: 'JPG',
      url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&auto=format&fit=crop&q=80',
      tamanio: '1.8 MB',
      fechaSubida: 'Hoy'
    });
    this.multimediaCompletar.push({
      id: `demo-mc-${Date.now()}-2`,
      nombre: 'video_prueba_operacion.mp4',
      tipo: 'video',
      extension: 'MP4',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-details-close-up-42289-large.mp4',
      tamanio: '8.2 MB',
      fechaSubida: 'Hoy'
    });
  }

  eliminarMultimediaCompletar(index: number): void {
    this.multimediaCompletar.splice(index, 1);
  }

  onSubirDocumentosCompletar(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    Array.from(input.files).forEach(file => {
      this.documentosCompletar.push(this.archivoDesdeFile(file, 'documento'));
    });
    this.toastService.success('Documentos cargados', `${input.files.length} documento(s) listo(s).`);
    input.value = '';
  }

  agregarDocumentosCompletarDemo(): void {
    this.documentosCompletar.push({
      id: `demo-dc-${Date.now()}`,
      nombre: 'informe_mantenimiento.pdf',
      tipo: 'documento',
      extension: 'PDF',
      url: '#',
      tamanio: '1.4 MB',
      fechaSubida: 'Hoy'
    });
  }

  eliminarDocumentoCompletar(index: number): void {
    this.documentosCompletar.splice(index, 1);
  }

  guardarCompletarMantenimiento() {
    if (!this.mantenimientoCompletar) return;
    if (!this.completarForm.observacionCierre.trim()) {
      this.toastService.warning('Informe requerido', 'Describa el trabajo realizado en el mantenimiento.');
      return;
    }

    const user = this.authService.getCurrentUser();
    const fotos = this.multimediaCompletar.filter(a => a.tipo === 'imagen').map(a => a.url);
    const videos = this.multimediaCompletar.filter(a => a.tipo === 'video').map(a => a.url);
    const ahora = new Date();
    const horaFin = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    this.mantenimientoService.actualizarMantenimiento(this.mantenimientoCompletar.id, {
      estado: 'Completado',
      observacionCierre: this.completarForm.observacionCierre.trim(),
      fechaCierre: this.completarForm.fechaFin,
      cerradoPor: user ? `${user.nombre} ${user.apellido}`.trim() : 'Usuario',
      fechaFin: this.completarForm.fechaFin,
      horaFin,
      costo: this.completarForm.costo || this.mantenimientoCompletar.costo,
      fotos: fotos.length ? fotos : undefined,
      videos: videos.length ? videos : undefined,
      archivos: this.multimediaCompletar.length ? [...this.multimediaCompletar] : undefined,
      documentos: this.documentosCompletar.length ? [...this.documentosCompletar] : undefined
    }).subscribe(actualizado => {
      if (!actualizado) return;
      if (this.mantenimientoDetalleSeleccionado?.id === actualizado.id) {
        this.mantenimientoDetalleSeleccionado = actualizado;
      }
      this.toastService.success(
        'Mantenimiento completado',
        `${actualizado.maquina} registrado como realizado con ${this.multimediaCompletar.length + this.documentosCompletar.length} evidencia(s).`
      );
      this.modalCompletarOpen = false;
    });
  }
}

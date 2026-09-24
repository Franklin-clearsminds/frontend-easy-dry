import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { IncidenteService } from '../../core/services/incidente.service';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { AuthService } from '../../core/services/auth.service';
import { Incidente, Maquinaria, ArchivoAdjunto } from '../../core/models';
import { Role, ROLE_LABELS, esRolTallerMantenimiento } from '../../core/models/roles.model';
import { TecnicoSearchSelectComponent, TecnicoOpcion } from '../../shared/components/tecnico-search-select/tecnico-search-select.component';
import { UsuarioService } from '../../core/services/usuario.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { resolverRangoFechas, soloFecha } from '../../core/utils/fecha-rango';
import { ModalPortalDirective } from '../../shared/directives/modal-portal.directive';
import { SucursalService } from '../../core/services/sucursal.service';
import { StorageUploadService } from '../../core/services/storage-upload.service';

@Component({
  selector: 'app-incidentes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent, ModalPortalDirective, TecnicoSearchSelectComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      @if (!hideHeader) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold mb-2">
              <i-lucide name="alert-triangle" class="w-3.5 h-3.5"></i-lucide>
              <span>Gestión Integral de Desperfectos, Multimedia y Reparaciones</span>
            </div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Control de Fallas y Reparaciones Técnicas</h1>
            <p class="text-slate-500 text-xs mt-1">
              Registro de fallos con fotos/videos de evidencia, y resolución con fotos de reparación, videos de prueba y documentos adjuntos (PDF/facturas).
            </p>
          </div>
        </div>
      }

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="true" 
        [showOperador]="false"
        [showBahia]="false"
        [showEstado]="true"
        [showBusqueda]="true"
        [placeholderBusqueda]="'Buscar por máquina, código o prioridad...'"
        [showCliente]="true"
        [showFechas]="true"
        [listaEstados]="['Todos', 'Pendiente', 'En Solución', 'Solucionado']"
        (filterChange)="aplicarNuevosFiltros($event)">
        <button filter-actions
          (click)="abrirModalReportar()"
          class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
          <i-lucide name="plus" class="w-4 h-4"></i-lucide>
          <span class="hidden sm:inline">Reportar Nuevo Fallo</span>
          <span class="sm:hidden">Reportar Fallo</span>
        </button>
      </app-filter-bar>

      <!-- Incident Cards Grid (Optimized for PC/Laptop) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        @for (inc of paginatedIncidentes; track inc.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 flex flex-col h-full min-h-[280px] hover:shadow-easydry-hover transition-all">
            
            <div class="flex-1 min-w-0">
              <!-- Top bar: ID and Status badge -->
              <div class="flex items-center justify-between gap-2 mb-3">
                <span class="font-mono font-extrabold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg truncate">
                  {{ inc.codigoIncidente }}
                </span>
                
                <span 
                  class="px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0"
                  [ngClass]="{
                    'bg-rose-100 text-rose-800 border border-rose-300': inc.estado === 'Pendiente',
                    'bg-amber-100 text-amber-800 border border-amber-300': inc.estado === 'En Solución',
                    'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40': inc.estado === 'Solucionado'
                  }">
                  {{ inc.estado }}
                </span>
              </div>

              <!-- Title & Branch -->
              <h3 class="font-bold text-slate-900 text-base font-outfit leading-snug line-clamp-2">{{ inc.maquina }}</h3>
              <p class="text-xs text-slate-500 font-semibold mt-0.5 truncate">{{ inc.agencia }} • {{ inc.fecha }}</p>

              <!-- Problem Summary Box -->
              <div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                <div class="flex items-center gap-1.5 text-rose-700 font-bold text-[11px]">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                  <span class="truncate">Falla: {{ inc.tipo }}</span>
                </div>
                <p class="text-slate-700 font-medium line-clamp-2">{{ inc.descripcion }}</p>
                <p class="text-slate-400 text-[10px] truncate">Reportado por: <strong class="text-slate-600">{{ inc.reportadoPor }}</strong></p>
                @if (inc.tecnicoAsignadoNombre) {
                  <p class="text-violet-700 text-[10px] font-bold mt-1 truncate">Asignado a: {{ inc.tecnicoAsignadoNombre }}</p>
                }
                @if (!inc.tecnicoAsignadoId && inc.estado === 'Pendiente') {
                  <p class="text-amber-700 text-[10px] font-bold mt-1">Sin asignar — requiere gestor técnico</p>
                }
              </div>

              <!-- Evidencias del Fallo (Badges / Miniatura) -->
              @if ((inc.fotosFallo && inc.fotosFallo.length > 0) || (inc.videosFallo && inc.videosFallo.length > 0)) {
                <div class="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Fallo:</span>
                  @if (inc.fotosFallo && inc.fotosFallo.length > 0) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                      <i-lucide name="image" class="w-3 h-3"></i-lucide>
                      {{ inc.fotosFallo.length }} foto(s)
                    </span>
                  }
                  @if (inc.videosFallo && inc.videosFallo.length > 0) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                      <i-lucide name="film" class="w-3 h-3"></i-lucide>
                      {{ inc.videosFallo.length }} video(s)
                    </span>
                  }
                </div>
              }

              <!-- Solución Resumen (Si está solucionado) -->
              @if (inc.estado === 'Solucionado') {
                <div class="mt-3 p-3 bg-easydry-green/10 border border-easydry-green/30 rounded-xl text-xs space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-easydry-green-dark uppercase text-[10px] flex items-center gap-1">
                      <i-lucide name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
                      Equipo Reparado
                    </span>
                  </div>
                  <p class="text-slate-800 font-medium line-clamp-2">{{ inc.observacionSolucion }}</p>
                  
                  <!-- Evidencias de reparación y documentos -->
                  <div class="flex items-center gap-2 pt-1 border-t border-easydry-green/20 flex-wrap">
                    @if (inc.fotosReparacion && inc.fotosReparacion.length > 0) {
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        <i-lucide name="image" class="w-2.5 h-2.5"></i-lucide>
                        {{ inc.fotosReparacion.length }} foto(s) reparado
                      </span>
                    }
                    @if (inc.videosReparacion && inc.videosReparacion.length > 0) {
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">
                        <i-lucide name="film" class="w-2.5 h-2.5"></i-lucide>
                        {{ inc.videosReparacion.length }} video prueba
                      </span>
                    }
                    @if (inc.documentosReparacion && inc.documentosReparacion.length > 0) {
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold">
                        <i-lucide name="file-text" class="w-2.5 h-2.5"></i-lucide>
                        {{ inc.documentosReparacion.length }} doc(s)
                      </span>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Action Buttons -->
            <div class="pt-3 mt-auto border-t border-slate-100 flex flex-col gap-2">
              <button 
                (click)="abrirDetalle(inc)"
                class="w-full py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                <i-lucide name="eye" class="w-4 h-4 text-easydry-blue shrink-0"></i-lucide>
                <span>Ver Ficha & Evidencias</span>
              </button>

              @if (inc.estado !== 'Solucionado') {
                @if (puedeAsignar) {
                  <button 
                    (click)="openModalAsignar(inc)"
                    class="w-full py-2 px-2 bg-violet-600 hover:bg-violet-700 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs">
                    <i-lucide name="user-cog" class="w-4 h-4 shrink-0"></i-lucide>
                    <span>{{ inc.tecnicoAsignadoId ? 'Reasignar o Delegar' : 'Asignar o Ejecutar' }}</span>
                  </button>
                  @if (inc.tecnicoAsignadoId) {
                    <button 
                      (click)="cancelarAsignacionIncidente(inc)"
                      class="w-full py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-rose-200">
                      <i-lucide name="x-circle" class="w-4 h-4 shrink-0"></i-lucide>
                      <span>Cancelar Asignación</span>
                    </button>
                  }
                }
                @if (puedeSolucionar(inc)) {
                  <button 
                    (click)="openModalSolucionar(inc)"
                    class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                    <i-lucide name="wrench" class="w-4 h-4 shrink-0"></i-lucide>
                    <span>Registrar Reparación</span>
                  </button>
                }
              }
            </div>

          </div>
        }
      </div>

      <div class="mt-6">
        <app-pagination 
          [totalItems]="incidentesFiltrados.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL 1: REPORTAR NUEVO FALLO (CON SUBIDA DE FOTOS Y VIDEOS) -->
      <!-- ============================================================== -->
      <app-modal 
        [isOpen]="modalReportarOpen" 
        title="Reportar Desperfecto o Falla de Maquinaria" 
        icon="alert-triangle"
        (close)="modalReportarOpen = false">
        
        <form (ngSubmit)="guardarReporte()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Equipo Afectado</label>
              <select [(ngModel)]="nuevoIncidente.maquinaId" name="maquina" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
                @for (m of maquinasDisponibles; track m.id) {
                  <option [value]="m.id">{{ m.codigo }} - {{ m.nombre }} ({{ m.agencia }})</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Falla / Desperfecto</label>
              <select [(ngModel)]="nuevoIncidente.tipo" name="tipo" class="w-full p-2.5 border rounded-xl text-xs font-bold">
                <option value="Falla eléctrica">Falla eléctrica</option>
                <option value="Fuga de agua">Fuga de agua</option>
                <option value="Problema hidráulico">Problema hidráulico</option>
                <option value="Baja presión">Baja presión</option>
                <option value="Manguera dañada">Manguera dañada</option>
                <option value="Desgaste">Desgaste mecánico</option>
                <option value="Rotura de pieza">Rotura de pieza</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción Detallada del Problema</label>
            <textarea 
              [(ngModel)]="nuevoIncidente.descripcion" 
              name="descripcion" 
              placeholder="Describa el comportamiento anómalo, ruidos, fugas o síntomas observados..." 
              rows="3" 
              class="w-full p-3 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500" 
              required>
            </textarea>
          </div>

          <!-- Zona de Subida de Fotos / Videos del Fallo -->
          <div class="border-2 border-dashed border-rose-200 bg-rose-50/40 rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
                <i-lucide name="camera" class="w-4 h-4 text-rose-600"></i-lucide>
                Evidencias del Fallo (Fotos / Vídeos)
              </label>
              <span class="text-[11px] text-slate-500">JPG, PNG, MP4, MOV</span>
            </div>

            <div class="flex items-center gap-3">
              <label class="cursor-pointer px-4 py-2.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-2xs">
                <i-lucide name="upload-cloud" class="w-4 h-4"></i-lucide>
                <span>Seleccionar Archivos</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,video/*" 
                  (change)="onSubirArchivosFallo($event)" 
                  class="hidden">
              </label>

            </div>

            <!-- Previsualización de archivos subidos del fallo -->
            @if (archivosFalloSubidos.length > 0) {
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                @for (arch of archivosFalloSubidos; track arch.id; let idx = $index) {
                  <div class="relative group bg-white border rounded-xl p-2 shadow-xs">
                    @if (arch.tipo === 'imagen') {
                      <img [src]="arch.url" alt="Fallo" class="w-full h-24 object-cover rounded-lg">
                    } @else if (arch.tipo === 'video') {
                      <div class="w-full h-24 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white relative overflow-hidden">
                        <i-lucide name="film" class="w-8 h-8 text-purple-400"></i-lucide>
                        <span class="text-[9px] mt-1 font-mono">Vídeo MP4</span>
                      </div>
                    }
                    <p class="text-[10px] font-semibold text-slate-700 truncate mt-1">{{ arch.nombre }}</p>
                    <button 
                      type="button"
                      (click)="eliminarArchivoFallo(idx)"
                      class="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-sm">
                      <i-lucide name="x" class="w-3 h-3"></i-lucide>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalReportarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarReporte()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">Registrar Reporte con Evidencias</button>
        </div>
      </app-modal>

      <!-- ========================================================================= -->
      <!-- MODAL 2: RESOLVER DESPERFECTO (SUBIDA DE FOTOS, VIDEOS Y DOCUMENTOS/PDF) -->
      <!-- ========================================================================= -->
      <app-modal 
        [isOpen]="modalSolucionarOpen" 
        [title]="'Registrar Reparación: ' + (incidenteSolucionar?.codigoIncidente || '')" 
        icon="wrench"
        (close)="modalSolucionarOpen = false">
        
        <div class="space-y-5">
          <!-- Resumen del Fallo -->
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-800">Equipo: <strong>{{ incidenteSolucionar?.maquina }}</strong></span>
              <span class="font-mono text-slate-500">{{ incidenteSolucionar?.agencia }}</span>
            </div>
            <p class="text-slate-600 mt-1"><strong>Falla Original:</strong> {{ incidenteSolucionar?.descripcion }}</p>
          </div>

          <!-- Diagnóstico y Reparación -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Informe Técnico de la Solución Aplicada</label>
            <textarea 
              [(ngModel)]="solucionForm.observacionSolucion" 
              placeholder="Detalle la reparación realizada (ej. sustitución de bomba, calibración de presostato, sellado de juntas)..." 
              rows="3" 
              class="w-full p-3 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-easydry-green">
            </textarea>
          </div>

          <!-- Repuestos -->
          <div class="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Repuestos Utilizados</label>
                <input type="text" 
                [(ngModel)]="solucionForm.repuestosUtilizados" 
                placeholder="Ej: Empaques O-Ring, Acoples M22" 
                class="w-full p-2.5 border rounded-xl text-sm font-medium">
              </div>
            </div>
          </div>

          <!-- Subida de Fotos y Videos de Reparación -->
          <div class="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                <i-lucide name="camera" class="w-4 h-4 text-emerald-600"></i-lucide>
                Evidencias de la Máquina Reparada (Fotos / Vídeos)
              </label>
              <span class="text-[11px] text-slate-500">Fotos del trabajo y video de prueba</span>
            </div>

            <div class="flex items-center gap-3">
              <label class="cursor-pointer px-4 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-2xs">
                <i-lucide name="upload-cloud" class="w-4 h-4"></i-lucide>
                <span>Subir Fotos / Videos de Reparación</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,video/*" 
                  (change)="onSubirMultimediaReparacion($event)" 
                  class="hidden">
              </label>
            </div>

            @if (solucionForm.multimedia.length > 0) {
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                @for (m of solucionForm.multimedia; track m.id; let idx = $index) {
                  <div class="relative group bg-white border rounded-xl p-2 shadow-xs">
                    @if (m.tipo === 'imagen') {
                      <img [src]="m.url" alt="Reparado" class="w-full h-24 object-cover rounded-lg">
                    } @else if (m.tipo === 'video') {
                      <div class="w-full h-24 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white relative overflow-hidden">
                        <i-lucide name="film" class="w-8 h-8 text-emerald-400"></i-lucide>
                        <span class="text-[9px] mt-1 font-mono">Vídeo Prueba</span>
                      </div>
                    }
                    <p class="text-[10px] font-semibold text-slate-700 truncate mt-1">{{ m.nombre }}</p>
                    <button 
                      type="button"
                      (click)="eliminarMultimediaReparacion(idx)"
                      class="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-sm">
                      <i-lucide name="x" class="w-3 h-3"></i-lucide>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Subida de Documentos Técnicos, Facturas y Garantías -->
          <div class="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1.5">
                <i-lucide name="file-text" class="w-4 h-4 text-indigo-600"></i-lucide>
                Documentos Técnicos Adjuntos (PDF / Facturas / Garantía)
              </label>
              <span class="text-[11px] text-slate-500">PDF, DOC, XLS</span>
            </div>

            <div class="flex items-center gap-3">
              <label class="cursor-pointer px-4 py-2.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-2xs">
                <i-lucide name="file-plus" class="w-4 h-4"></i-lucide>
                <span>Adjuntar Documento PDF</span>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" 
                  (change)="onSubirDocumentosReparacion($event)" 
                  class="hidden">
              </label>
            </div>

            @if (solucionForm.documentos.length > 0) {
              <div class="space-y-2 pt-2">
                @for (doc of solucionForm.documentos; track doc.id; let idx = $index) {
                  <div class="p-2.5 bg-white border border-indigo-100 rounded-xl flex items-center justify-between shadow-2xs">
                    <div class="flex items-center gap-2.5 overflow-hidden">
                      <div class="p-2 rounded-lg bg-indigo-100 text-indigo-700 flex-shrink-0">
                        <i-lucide name="file-text" class="w-4 h-4"></i-lucide>
                      </div>
                      <div class="overflow-hidden">
                        <p class="text-xs font-bold text-slate-900 truncate">{{ doc.nombre }}</p>
                        <p class="text-[10px] text-slate-400 font-mono">{{ doc.tamanio || '1.4 MB' }} • {{ doc.extension || 'PDF' }}</p>
                      </div>
                    </div>

                    <button 
                      type="button"
                      (click)="eliminarDocumentoReparacion(idx)"
                      class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                      <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div modal-footer>
          <button (click)="modalSolucionarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="confirmarSolucion()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs">Guardar Reparación y Documentos</button>
        </div>
      </app-modal>

      <!-- ========================================================================= -->
      <!-- MODAL 3: AUDITORÍA Y DETALLE COMPLETO (EVIDENCIAS FALLO + REPARACIÓN + DOCS) -->
      <!-- ========================================================================= -->
      <app-modal 
        [isOpen]="modalDetalleOpen" 
        [title]="'Ficha de Auditoría Técnica: ' + (incidenteDetalle?.codigoIncidente || '')" 
        icon="clipboard-list"
        (close)="modalDetalleOpen = false">
        
        @if (incidenteDetalle) {
          <div class="space-y-6">
            
            <!-- Resumen Superior -->
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">{{ incidenteDetalle.codigoIncidente }}</span>
                <h3 class="text-lg font-bold text-slate-900">{{ incidenteDetalle.maquina }}</h3>
                <p class="text-xs text-slate-500">{{ incidenteDetalle.agencia }} • Reportado: {{ incidenteDetalle.fecha }}</p>
              </div>

              <div class="flex items-center gap-2">
                <span 
                  class="px-3 py-1.5 rounded-xl text-xs font-extrabold"
                  [ngClass]="{
                    'bg-rose-100 text-rose-800 border border-rose-300': incidenteDetalle.estado === 'Pendiente',
                    'bg-amber-100 text-amber-800 border border-amber-300': incidenteDetalle.estado === 'En Solución',
                    'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40': incidenteDetalle.estado === 'Solucionado'
                  }">
                  {{ incidenteDetalle.estado }}
                </span>
              </div>
            </div>

            <!-- SECCIÓN 1: Evidencias del Fallo (Antes) -->
            <div class="p-4 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-3">
              <div class="flex items-center justify-between border-b border-rose-200/60 pb-2">
                <h4 class="font-bold text-rose-900 text-xs uppercase flex items-center gap-1.5">
                  <i-lucide name="alert-triangle" class="w-4 h-4 text-rose-600"></i-lucide>
                  1. Reporte y Evidencias de la Falla
                </h4>
                <span class="text-[11px] text-slate-500">Reportado por: <strong>{{ incidenteDetalle.reportadoPor }}</strong></span>
              </div>

              <p class="text-xs text-slate-800 font-medium">{{ incidenteDetalle.descripcion }}</p>

              <!-- Galería de Fotos del Fallo -->
              @if (incidenteDetalle.fotosFallo && incidenteDetalle.fotosFallo.length > 0) {
                <div>
                  <p class="text-[10px] font-bold text-slate-500 uppercase mb-2">Fotografías del Desperfecto:</p>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    @for (foto of incidenteDetalle.fotosFallo; track foto) {
                      <div class="relative group rounded-xl overflow-hidden border border-rose-200 shadow-xs cursor-pointer" (click)="verMediaZoom(foto, 'imagen')">
                        <img [src]="foto" alt="Fallo" class="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200">
                        <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <i-lucide name="zoom-in" class="w-5 h-5"></i-lucide>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Reproductor de Videos del Fallo -->
              @if (incidenteDetalle.videosFallo && incidenteDetalle.videosFallo.length > 0) {
                <div>
                  <p class="text-[10px] font-bold text-slate-500 uppercase mb-2">Vídeo(s) de la Falla en Operación:</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    @for (video of incidenteDetalle.videosFallo; track video) {
                      <div class="rounded-xl overflow-hidden border bg-black shadow-xs">
                        <video [src]="video" controls class="w-full h-40 object-cover"></video>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- SECCIÓN 2: Evidencias de la Reparación (Después) -->
            @if (incidenteDetalle.estado === 'Solucionado') {
              <div class="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                <div class="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <h4 class="font-bold text-emerald-900 text-xs uppercase flex items-center gap-1.5">
                    <i-lucide name="check-circle-2" class="w-4 h-4 text-emerald-600"></i-lucide>
                    2. Resolución Técnica & Evidencias del Trabajo
                  </h4>
                  <span class="text-[11px] text-slate-500">Resuelto por: <strong>{{ incidenteDetalle.solucionadoPor }}</strong> ({{ incidenteDetalle.fechaSolucion }})</span>
                </div>

                <div class="space-y-1.5 text-xs">
                  <p class="text-slate-800 font-medium"><strong>Diagnóstico y Reparación:</strong> {{ incidenteDetalle.observacionSolucion }}</p>
                  @if (incidenteDetalle.repuestosUtilizados) {
                    <p class="text-slate-700"><strong>Repuestos Utilizados:</strong> {{ incidenteDetalle.repuestosUtilizados }}</p>
                  }
                </div>

                <!-- Galería de Fotos del Equipo Reparado -->
                @if (incidenteDetalle.fotosReparacion && incidenteDetalle.fotosReparacion.length > 0) {
                  <div>
                    <p class="text-[10px] font-bold text-emerald-800 uppercase mb-2">Fotografías del Equipo Reparado:</p>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      @for (foto of incidenteDetalle.fotosReparacion; track foto) {
                        <div class="relative group rounded-xl overflow-hidden border border-emerald-200 shadow-xs cursor-pointer" (click)="verMediaZoom(foto, 'imagen')">
                          <img [src]="foto" alt="Reparado" class="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-200">
                          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <i-lucide name="zoom-in" class="w-5 h-5"></i-lucide>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Videos de Prueba de Funcionamiento -->
                @if (incidenteDetalle.videosReparacion && incidenteDetalle.videosReparacion.length > 0) {
                  <div>
                    <p class="text-[10px] font-bold text-emerald-800 uppercase mb-2">Vídeo(s) de Prueba Operativa Tras Reparación:</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      @for (video of incidenteDetalle.videosReparacion; track video) {
                        <div class="rounded-xl overflow-hidden border bg-black shadow-xs">
                          <video [src]="video" controls class="w-full h-40 object-cover"></video>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Documentos Técnicos Adjuntos -->
                @if (incidenteDetalle.documentosReparacion && incidenteDetalle.documentosReparacion.length > 0) {
                  <div class="pt-2 border-t border-emerald-200/50">
                    <p class="text-[10px] font-bold text-indigo-900 uppercase mb-2 flex items-center gap-1">
                      <i-lucide name="file-text" class="w-3.5 h-3.5 text-indigo-600"></i-lucide>
                      Documentos Adjuntos (Informes / Facturas / Garantías):
                    </p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      @for (doc of incidenteDetalle.documentosReparacion; track doc.id) {
                        <div class="p-2.5 bg-white border border-indigo-100 rounded-xl flex items-center justify-between shadow-2xs">
                          <div class="flex items-center gap-2 overflow-hidden">
                            <div class="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                              <i-lucide name="file-text" class="w-4 h-4"></i-lucide>
                            </div>
                            <div class="overflow-hidden">
                              <p class="text-xs font-bold text-slate-800 truncate">{{ doc.nombre }}</p>
                              <p class="text-[10px] text-slate-400 font-mono">{{ doc.tamanio || '1 MB' }} • {{ doc.fechaSubida }}</p>
                            </div>
                          </div>

                          <button 
                            type="button"
                            (click)="descargarDocumento(doc)"
                            class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                            <i-lucide name="download" class="w-3.5 h-3.5"></i-lucide>
                            <span>Descargar</span>
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }

          </div>
        }

        <div modal-footer>
          <button (click)="modalDetalleOpen = false" class="px-5 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs">Cerrar Ficha</button>
        </div>
      </app-modal>

      <!-- ============================================================== -->
      <!-- MODAL 4: LIGHTBOX / VISOR DE FOTO O VIDEO EN ALTA RESOLUCIÓN  -->
      <!-- ============================================================== -->
      @if (mediaZoomUrl) {
        <div appModalPortal class="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6 animate-fade-in" (click)="cerrarMediaZoom()">
          <div class="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center" (click)="$event.stopPropagation()">
            <button 
              (click)="cerrarMediaZoom()" 
              class="absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors">
              <i-lucide name="x" class="w-6 h-6"></i-lucide>
            </button>
            <img [src]="mediaZoomUrl" alt="Zoom Media" class="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/20">
          </div>
        </div>
      }

      <!-- MODAL: ASIGNAR TÉCNICO (Gestor Técnico / Super Admin) -->
      <app-modal
        [isOpen]="modalAsignarOpen"
        [title]="incidenteAsignar?.tecnicoAsignadoId ? 'Reasignar Reparación' : 'Asignar Reparación'"
        icon="user-cog"
        (close)="modalAsignarOpen = false">
        @if (incidenteAsignar) {
          <div class="space-y-4">
            <p class="text-xs text-slate-600">
              <strong class="text-slate-900">{{ incidenteAsignar.codigoIncidente }}</strong>
              · {{ incidenteAsignar.maquina }}
            </p>
            <p class="text-xs text-slate-500">
              Ejecuta la reparación tú mismo o asígnala a un coordinador de mantenimiento o técnico de maquinaria.
            </p>
            @if (incidenteAsignar.tecnicoAsignadoNombre) {
              <div class="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800">
                Asignado actualmente a: <strong>{{ incidenteAsignar.tecnicoAsignadoNombre }}</strong>
              </div>
            }

            <button
              type="button"
              (click)="asignarAEjecutor(gestorActual.id, gestorActual.nombreCompleto)"
              class="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2">
              <i-lucide name="wrench" class="w-4 h-4"></i-lucide>
              {{ etiquetaEjecutarYo }}
            </button>

            <p class="text-[10px] font-bold text-slate-400 uppercase">Delegar a coordinador o técnico</p>
            <app-tecnico-search-select
              [tecnicos]="tecnicosParaDelegar"
              placeholder="Buscar por nombre, rol o correo..."
              (selected)="onSeleccionarTecnicoAsignacion($event)">
            </app-tecnico-search-select>

            @if (incidenteAsignar.tecnicoAsignadoId) {
              <button
                type="button"
                (click)="cancelarAsignacionIncidente(incidenteAsignar)"
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
export class IncidentesComponent implements OnInit {
  @Input() hideHeader = false;
  incidentes: Incidente[] = [];
  maquinasDisponibles: Maquinaria[] = [];
  
  incidenteSolucionar?: Incidente;
  incidenteDetalle?: Incidente;

  currentPage = 1;
  pageSize = 6;

  modalReportarOpen = false;
  modalSolucionarOpen = false;
  modalDetalleOpen = false;
  modalAsignarOpen = false;

  incidenteAsignar?: Incidente;

  tecnicosDisponibles: TecnicoOpcion[] = [];

  gestorActual: { id: string | number; nombreCompleto: string } = { id: 0, nombreCompleto: '' };

  mediaZoomUrl: string | null = null;
  mediaZoomTipo: 'imagen' | 'video' = 'imagen';

  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy', marca: 'Todas' };

  nuevoIncidente = {
    maquinaId: '' as string,
    maquina: '',
    agencia: '',
    tipo: 'Falla eléctrica' as Incidente['tipo'],
    prioridad: 'Alta' as Incidente['prioridad'],
    descripcion: ''
  };

  archivosFalloSubidos: ArchivoAdjunto[] = [];

  solucionForm = {
    observacionSolucion: '',
    repuestosUtilizados: '',
    multimedia: [] as ArchivoAdjunto[],
    documentos: [] as ArchivoAdjunto[]
  };

  private incidenteService = inject(IncidenteService);
  private maquinariaService = inject(MaquinariaService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private sucursalService = inject(SucursalService);
  private usuarioService = inject(UsuarioService);
  private storageUpload = inject(StorageUploadService);

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.gestorActual = {
        id: user.id,
        nombreCompleto: `${user.nombre} ${user.apellido}`.trim(),
      };
    }

    this.usuarioService.getUsuarios(true, true).subscribe(list => {
      this.tecnicosDisponibles = (list || [])
        .filter(u => esRolTallerMantenimiento(u.rolNombre) || esRolTallerMantenimiento(u.rol))
        .map(u => ({
          id: u.id,
          nombre: `${u.nombre} ${u.apellido}`.trim(),
          email: u.email,
          rolLabel: ROLE_LABELS[u.rolNombre || ''] || u.rol,
        }));
    });

    this.incidenteService.getIncidentes().subscribe();
    this.incidenteService.incidentes$.subscribe(list => {
      this.incidentes = list;
    });

    this.maquinariaService.getMaquinaria().subscribe(list => {
      this.maquinasDisponibles = list;
      if (this.maquinasDisponibles.length > 0 && !this.nuevoIncidente.maquinaId) {
        this.nuevoIncidente.maquinaId = String(this.maquinasDisponibles[0].id);
        this.nuevoIncidente.maquina = this.maquinasDisponibles[0].nombre;
        this.nuevoIncidente.agencia = this.maquinasDisponibles[0].agencia;
      }
    });
  }

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    this.currentPage = 1;
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

  puedeSolucionar(inc: Incidente): boolean {
    const user = this.authService.getCurrentUser();
    if (!user || inc.estado === 'Solucionado') return false;
    if (this.authService.hasRole(Role.SUPER_ADMIN)) return true;
    if (this.puedeAsignar || this.esTecnico) {
      return inc.tecnicoAsignadoId === user.id;
    }
    return true;
  }

  get tecnicosParaDelegar(): TecnicoOpcion[] {
    const yo = String(this.gestorActual.id || '');
    return this.tecnicosDisponibles.filter(t => String(t.id) !== yo);
  }

  onSeleccionarTecnicoAsignacion(tec: TecnicoOpcion | null) {
    if (!tec) return;
    this.asignarAEjecutor(tec.id, tec.nombre);
  }

  openModalAsignar(inc: Incidente) {
    this.incidenteAsignar = inc;
    this.modalAsignarOpen = true;
  }

  asignarAEjecutor(tecnicoId: string | number, tecnicoNombre: string) {
    const user = this.authService.getCurrentUser();
    if (!this.incidenteAsignar || !user) return;

    this.incidenteService.asignarIncidente(
      this.incidenteAsignar.id,
      tecnicoId,
      tecnicoNombre,
      user.id,
      `${user.nombre} ${user.apellido}`.trim()
    ).subscribe(updated => {
      if (updated) {
        this.toastService.success('Asignación registrada', `Reparación delegada a ${tecnicoNombre}`);
        this.modalAsignarOpen = false;
        if (tecnicoId === user.id) {
          this.openModalSolucionar(updated);
        }
      }
    });
  }

  cancelarAsignacionIncidente(inc: Incidente) {
    this.incidenteService.cancelarAsignacion(inc.id).subscribe(updated => {
      if (updated) {
        this.toastService.success('Asignación cancelada', `${updated.codigoIncidente} quedó pendiente de asignación`);
        this.modalAsignarOpen = false;
      }
    });
  }

  get incidentesFiltrados() {
    let resultados = this.incidentes;
    const user = this.authService.getCurrentUser();

    if (this.esTecnico && user) {
      resultados = resultados.filter(inc => inc.tecnicoAsignadoId === user.id);
    }

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(inc => inc.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(inc => inc.agencia === this.filtrosGlobales.sucursal);
    }
    if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
      resultados = resultados.filter(item => {
        const suc = this.sucursalService.getSucursalPorNombre(item.agencia);
        return suc?.marcaNombre === this.filtrosGlobales.marca;
      });
    }

    const rango = resolverRangoFechas(this.filtrosGlobales);
    if (rango) {
      resultados = resultados.filter(inc => {
        const d = soloFecha(inc.fecha);
        return d >= rango.inicio && d <= rango.fin;
      });
    }
    
    return resultados;
  }

  get paginatedIncidentes() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.incidentesFiltrados.slice(start, start + this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  abrirModalReportar() {
    this.archivosFalloSubidos = [];
    this.nuevoIncidente.descripcion = '';
    this.modalReportarOpen = true;
  }

  onSubirArchivosFallo(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => {
        const isVideo = file.type.startsWith('video');
        const url = URL.createObjectURL(file);
        this.archivosFalloSubidos.push({
          id: `arch-${Date.now()}-${Math.random()}`,
          nombre: file.name,
          tipo: isVideo ? 'video' : 'imagen',
          extension: file.name.split('.').pop()?.toUpperCase() || (isVideo ? 'MP4' : 'JPG'),
          url: url,
          tamanio: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fechaSubida: new Date().toLocaleTimeString(),
          file,
        });
      });
      this.toastService.success('Archivos Cargados', `${input.files.length} archivo(s) de evidencia listos.`);
    }
  }

  eliminarArchivoFallo(index: number) {
    this.archivosFalloSubidos.splice(index, 1);
  }

  async guardarReporte() {
    if (!this.nuevoIncidente.descripcion.trim()) {
      this.toastService.warning('Descripción Requerida', 'Escriba el fallo presentado por la máquina.');
      return;
    }

    const user = this.authService.getCurrentUser();
    const usuario = user ? `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.email : 'Usuario autenticado';
    const equipo = this.maquinasDisponibles.find(m => String(m.id) === String(this.nuevoIncidente.maquinaId));

    try {
      const urls = await this.subirEvidenciasIncidente(this.archivosFalloSubidos, {
        maquinariaId: String(this.nuevoIncidente.maquinaId || equipo?.id || ''),
        maquinariaNombre: equipo?.nombre || this.nuevoIncidente.maquina,
        maquinariaCodigo: equipo?.codigo,
        agenciaId: equipo?.sucursalId ? String(equipo.sucursalId) : equipo?.agencia,
        incidenteFase: 'fallas',
      });
      const videos = this.archivosFalloSubidos
        .map((a, i) => a.tipo === 'video' ? urls[i] : '')
        .filter(Boolean);

      const registro: Omit<Incidente, 'id'> = {
        codigoIncidente: `INC-${Date.now().toString().slice(-6)}`,
        maquina: equipo?.nombre || this.nuevoIncidente.maquina,
        agencia: equipo?.agencia || this.nuevoIncidente.agencia,
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
        tipo: this.nuevoIncidente.tipo,
        prioridad: this.nuevoIncidente.prioridad,
        estado: 'Pendiente',
        descripcion: this.nuevoIncidente.descripcion,
        reportadoPor: usuario,
        fotosFallo: urls,
        videosFallo: videos,
        archivosFallo: [...this.archivosFalloSubidos]
      };
      (registro as any).maquinariaId = this.nuevoIncidente.maquinaId || equipo?.id;

      this.incidenteService.crearIncidente(registro).subscribe((creado: Incidente) => {
        this.toastService.success('Reporte Creado', `Incidente ${creado.codigoIncidente} registrado con ${this.archivosFalloSubidos.length} evidencia(s).`);
        this.modalReportarOpen = false;
      });
    } catch {
      this.toastService.error('Error de subida', 'No se pudieron guardar las evidencias de la falla en S3.');
    }
  }

  openModalSolucionar(inc: Incidente) {
    this.incidenteSolucionar = inc;
    this.solucionForm = {
      observacionSolucion: '',
      repuestosUtilizados: '',
      multimedia: [],
      documentos: []
    };
    this.modalSolucionarOpen = true;
  }

  onSubirMultimediaReparacion(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => {
        const isVideo = file.type.startsWith('video');
        const url = URL.createObjectURL(file);
        this.solucionForm.multimedia.push({
          id: `rep-${Date.now()}-${Math.random()}`,
          nombre: file.name,
          tipo: isVideo ? 'video' : 'imagen',
          extension: file.name.split('.').pop()?.toUpperCase() || (isVideo ? 'MP4' : 'JPG'),
          url: url,
          tamanio: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fechaSubida: 'Hoy',
          file,
        });
      });
      this.toastService.success('Evidencias Agregadas', 'Fotos y videos de reparación listos.');
    }
  }

  eliminarMultimediaReparacion(index: number) {
    this.solucionForm.multimedia.splice(index, 1);
  }

  onSubirDocumentosReparacion(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => {
        this.solucionForm.documentos.push({
          id: `doc-${Date.now()}-${Math.random()}`,
          nombre: file.name,
          tipo: 'documento',
          extension: file.name.split('.').pop()?.toUpperCase() || 'PDF',
          url: '#',
          tamanio: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fechaSubida: new Date().toLocaleDateString(),
          file,
        });
      });
      this.toastService.success('Documentos Adjuntos', 'Documentos técnicos listos.');
    }
  }

  eliminarDocumentoReparacion(index: number) {
    this.solucionForm.documentos.splice(index, 1);
  }

  async confirmarSolucion() {
    if (!this.incidenteSolucionar || !this.solucionForm.observacionSolucion.trim()) {
      this.toastService.warning('Informe Requerido', 'Escriba el detalle de la solución técnica aplicada.');
      return;
    }

    const user = this.authService.getCurrentUser();
    const usuario = user
      ? `${user.nombre || ''} ${user.apellido || ''}`.trim() || user.email
      : 'Usuario autenticado';
    const hoy = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const equipo = this.maquinasDisponibles.find(m =>
      String(m.id) === String((this.incidenteSolucionar as any).maquinariaId)
      || m.nombre === this.incidenteSolucionar?.maquina
    );

    try {
      const adjuntos = [...this.solucionForm.multimedia, ...this.solucionForm.documentos];
      const urls = await this.subirEvidenciasIncidente(adjuntos, {
        maquinariaId: String((this.incidenteSolucionar as any).maquinariaId || equipo?.id || ''),
        maquinariaNombre: this.incidenteSolucionar.maquina,
        maquinariaCodigo: equipo?.codigo,
        agenciaId: equipo?.sucursalId ? String(equipo.sucursalId) : this.incidenteSolucionar.agencia,
        incidenteId: String(this.incidenteSolucionar.id),
        incidenteFase: 'resoluciones',
      });

      const fotos = this.solucionForm.multimedia
        .map((m, i) => m.tipo === 'imagen' ? urls[i] : '')
        .filter(Boolean);
      const videos = this.solucionForm.multimedia
        .map((m, i) => m.tipo === 'video' ? urls[i] : '')
        .filter(Boolean);

      const evidencias = adjuntos
        .map((item, i) => ({
          tipo: item.tipo === 'documento'
            ? 'DOCUMENTO_INCIDENTE'
            : item.tipo === 'video' ? 'VIDEO_INCIDENTE' : 'FOTO_INCIDENTE',
          url: urls[i],
          descripcion: item.nombre,
        }))
        .filter(e => e.url);

      this.incidenteService.actualizarEstado(
        this.incidenteSolucionar.id,
        'Solucionado',
        this.solucionForm.observacionSolucion,
        {
          evidencias,
          repuestosUtilizados: this.solucionForm.repuestosUtilizados,
        }
      ).subscribe(actualizado => {
        if (actualizado) {
          this.incidenteSolucionar!.estado = 'Solucionado';
          this.incidenteSolucionar!.solucionadoPor = usuario;
          this.incidenteSolucionar!.fechaSolucion = hoy;
          this.incidenteSolucionar!.observacionSolucion = this.solucionForm.observacionSolucion;
          this.incidenteSolucionar!.repuestosUtilizados = this.solucionForm.repuestosUtilizados;
          this.incidenteSolucionar!.fotosReparacion = fotos;
          this.incidenteSolucionar!.videosReparacion = videos;
          this.incidenteSolucionar!.documentosReparacion = [...this.solucionForm.documentos];
        }
        this.toastService.success(
          'Desperfecto Solucionado',
          `Incidente ${this.incidenteSolucionar?.codigoIncidente} resuelto con ${fotos.length} foto(s), ${videos.length} video(s) y ${this.solucionForm.documentos.length} documento(s) adjuntos.`
        );
        this.modalSolucionarOpen = false;
      });
    } catch {
      this.toastService.error('Error de subida', 'No se pudieron guardar las evidencias de la resolución en S3.');
    }
  }

  private async subirEvidenciasIncidente(
    archivos: ArchivoAdjunto[],
    opts: {
      maquinariaId?: string;
      maquinariaNombre?: string;
      maquinariaCodigo?: string;
      agenciaId?: string;
      incidenteId?: string;
      incidenteFase: 'fallas' | 'resoluciones';
    },
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const archivo of archivos) {
      if (archivo.file) {
        const type = archivo.tipo === 'video'
          ? 'VIDEO_INCIDENTE'
          : archivo.tipo === 'documento'
            ? 'DOCUMENTO_INCIDENTE'
            : 'FOTO_INCIDENTE';
        urls.push(await this.storageUpload.uploadMedia(archivo.file, {
          category: 'MAQUINARIA_INCIDENTE',
          type,
          maquinariaId: opts.maquinariaId,
          maquinariaNombre: opts.maquinariaNombre,
          maquinariaCodigo: opts.maquinariaCodigo,
          agenciaId: opts.agenciaId,
          incidenteId: opts.incidenteId,
          incidenteFase: opts.incidenteFase,
          fileName: archivo.nombre,
          contentType: archivo.file.type,
        }));
      } else if (archivo.url && archivo.url !== '#' && !archivo.url.startsWith('blob:')) {
        urls.push(archivo.url);
      }
    }
    return urls;
  }

  abrirDetalle(inc: Incidente) {
    this.incidenteDetalle = inc;
    this.modalDetalleOpen = true;
  }

  verMediaZoom(url: string, tipo: 'imagen' | 'video') {
    this.mediaZoomUrl = url;
    this.mediaZoomTipo = tipo;
  }

  cerrarMediaZoom() {
    this.mediaZoomUrl = null;
  }

  descargarDocumento(doc: ArchivoAdjunto) {
    this.toastService.info('Descargando Documento', `Descargando "${doc.nombre}" (${doc.tamanio || 'PDF'})...`);
  }
}

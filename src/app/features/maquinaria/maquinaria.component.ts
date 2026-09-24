import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { MovimientoMaquinariaService } from '../../core/services/movimiento-maquinaria.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { IncidenteService } from '../../core/services/incidente.service';
import { MantenimientoService } from '../../core/services/mantenimiento.service';
import { BahiaService } from '../../core/services/bahia.service';
import { AuthService } from '../../core/services/auth.service';
import { Maquinaria, MovimientoMaquinaria, Sucursal, Incidente, Mantenimiento, ArchivoAdjunto, Bahia, FRECUENCIAS_MANTENIMIENTO, etiquetaFrecuenciaMantenimiento } from '../../core/models';
import { Role, ROLE_LABELS, esRolTallerMantenimiento } from '../../core/models/roles.model';
import { UsuarioService } from '../../core/services/usuario.service';
import { TecnicoSearchSelectComponent, TecnicoOpcion } from '../../shared/components/tecnico-search-select/tecnico-search-select.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { StorageUploadService } from '../../core/services/storage-upload.service';

@Component({
  selector: 'app-maquinaria',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent, TecnicoSearchSelectComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Inventario & Movimientos de Maquinaria</h1>
          <p class="text-slate-500 text-xs mt-1">Control de activos industriales, asignación a sucursales/bahías y trazabilidad de transferencias.</p>
        </div>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="canTransfer" 
        [showOperador]="false"
        [showBahia]="true"
        [showRegion]="true"
        [showCliente]="true"
        [showEstado]="true"
        [showFechas]="false"
        [showBusqueda]="true"
        placeholderBusqueda="Buscar por código de activo (ej. HD-001), nombre o modelo..."
        [listaEstados]="['Todos', 'Operativa', 'Requiere Mantenimiento', 'En Reparación', 'Fuera de Servicio']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Ficha de Selección Sucursal -> Bahía (Punto 7: Responsable, Ubicación, Estado) -->
      @if (filtrosGlobales.sucursal !== 'Todas' || filtrosGlobales.bahia !== 'Todas') {
        <div class="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-2xs">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-easydry-blue text-white flex items-center justify-center font-bold">
              <i-lucide name="wrench" class="w-5 h-5"></i-lucide>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-extrabold text-slate-900 text-sm font-outfit">{{ filtrosGlobales.sucursal }} — {{ filtrosGlobales.bahia }}</h4>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Estado: Activo & Operativo
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                <strong>Ubicación:</strong> Módulo de Lavado / Estación Técnica · <strong>Responsable Agencia:</strong> <span class="text-purple-700 font-bold">{{ getResponsableEquipo(filtrosGlobales.sucursal) }}</span>
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Encabezado de Lista de Activos -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="font-bold text-slate-900 text-base font-outfit">Inventario Físico y Maquinaria Asignada</h3>
          <p class="text-xs text-slate-500 mt-1">
            Visualización y control de estado de todos los equipos registrados en el sistema.
          </p>
        </div>
        @if (canCreate) {
          <button
            (click)="abrirModalCrear()"
            class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide name="plus" class="w-4 h-4"></i-lucide>
            <span class="hidden sm:inline">Registrar Nuevo Activo</span>
            <span class="sm:hidden">Registrar Activo</span>
          </button>
        }
      </div>

      <!-- Equipment Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (maq of paginatedMaquinaria; track maq.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden group hover:shadow-easydry-hover transition-all duration-300 flex flex-col justify-between">
            
            <div>
              <div class="h-44 bg-slate-900 relative overflow-hidden">
                <img [src]="urlMedia(maq.imagen)" [alt]="maq.nombre" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90">
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

            <div class="border border-slate-200 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <i-lucide name="file-text" class="w-4 h-4 text-easydry-blue"></i-lucide>
                  Imagen de ficha técnica
                </h4>
                @if (maquinaSeleccionada.fichaTecnicaUrl || fichaPendientePreview) {
                  <button type="button" (click)="abrirFichaTecnicaCompleta()"
                    class="text-[11px] font-bold text-easydry-blue hover:underline cursor-pointer">
                    Ver en tamaño completo
                  </button>
                }
              </div>

              @if ((maquinaSeleccionada.fichaTecnicaUrl || fichaPendientePreview) && !cambiandoFichaTecnica) {
                <button type="button" (click)="abrirFichaTecnicaCompleta()"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 min-h-48 flex items-center justify-center cursor-pointer">
                  @if (fichaPendientePreview || fichaTecnicaDisplayUrl) {
                    <img
                      [src]="fichaPendientePreview || fichaTecnicaDisplayUrl"
                      alt="Ficha técnica"
                      class="w-full max-h-80 object-contain rounded-lg bg-white">
                  } @else {
                    <p class="text-xs text-slate-400 font-semibold">Cargando ficha técnica...</p>
                  }
                </button>
                <div class="flex justify-end">
                  <button type="button" (click)="cambiandoFichaTecnica = true"
                    class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">
                    Reemplazar ficha
                  </button>
                </div>
              } @else {
                <label class="block border-2 border-dashed border-slate-200 hover:border-easydry-blue rounded-2xl p-5 text-center cursor-pointer bg-slate-50/70">
                  <i-lucide name="image-plus" class="w-8 h-8 text-easydry-blue mx-auto mb-2"></i-lucide>
                  <p class="text-xs font-bold text-slate-800">Haz clic para subir la imagen de la ficha técnica</p>
                  <p class="text-[11px] text-slate-400 mt-1">Se guarda tal cual, sin recortar ni ajustar</p>
                  <input type="file" accept="image/*" (change)="onSeleccionarFichaTecnica($event)" class="hidden">
                </label>
                @if (fichaPendientePreview) {
                  <img [src]="fichaPendientePreview" alt="Vista previa ficha" class="w-full max-h-64 object-contain rounded-xl border border-slate-200 bg-white">
                }
                <div class="flex justify-end gap-2">
                  @if (maquinaSeleccionada.fichaTecnicaUrl && cambiandoFichaTecnica) {
                    <button type="button" (click)="cancelarCambioFicha()"
                      class="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">
                      Cancelar
                    </button>
                  }
                  @if (fichaPendienteFile) {
                    <button type="button" (click)="guardarFichaTecnicaExistente()" [disabled]="guardandoFicha"
                      class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50">
                      {{ guardandoFicha ? 'Guardando...' : 'Guardar ficha técnica' }}
                    </button>
                  }
                </div>
              }
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
                      <div class="flex justify-between items-center mt-1 gap-2 flex-wrap">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                          [ngClass]="inc.estado === 'Resuelto' || inc.estado === 'Solucionado' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-amber-100 text-amber-800'">
                          {{ inc.estado }}
                        </span>
                        <span class="text-[10px] text-slate-400">Por: {{ inc.reportadoPor }}</span>
                      </div>
                      @if (tieneEvidenciasFallo(inc)) {
                        <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          @if (inc.fotosFallo?.length) {
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-rose-100 text-[10px] font-bold text-rose-700">
                              <i-lucide name="image" class="w-3 h-3"></i-lucide> {{ inc.fotosFallo?.length }} foto(s)
                            </span>
                          }
                          @if (inc.videosFallo?.length) {
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-rose-100 text-[10px] font-bold text-purple-700">
                              <i-lucide name="film" class="w-3 h-3"></i-lucide> {{ inc.videosFallo?.length }} video(s)
                            </span>
                          }
                        </div>
                      }
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
                    <i-lucide name="wrench" class="w-4 h-4 text-amber-500"></i-lucide> Mantenimientos Programados
                  </h4>
                  <button (click)="programarMantenimiento()" class="text-[10px] flex items-center gap-1 font-bold text-easydry-blue hover:text-easydry-blue-dark bg-easydry-blue/10 hover:bg-easydry-blue/20 px-2 py-1 rounded transition-colors">
                    <i-lucide name="plus" class="w-3 h-3"></i-lucide> Programar
                  </button>
                </div>
                <div class="space-y-2 max-h-56 overflow-y-auto pr-2">
                  @for (man of mantenimientosMaquina; track man.id) {
                    <div class="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex flex-col gap-1 text-xs">
                      <div class="flex justify-between">
                        <span class="font-bold text-slate-900">{{ man.tipo }}</span>
                        <span class="font-mono text-slate-500 text-[10px]">{{ man.fecha }}</span>
                      </div>
                      <p class="text-[11px] text-slate-600 line-clamp-2">{{ man.descripcion }}</p>
                      <p class="text-[11px] font-semibold text-slate-500">{{ etiquetaFrecuencia(man.frecuenciaDias) }}</p>
                      <div class="flex justify-between items-center mt-1 gap-2 flex-wrap">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                          [ngClass]="man.estado === 'Completado' ? 'bg-easydry-green/20 text-easydry-green-dark' : man.estado === 'En Proceso' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'">
                          {{ man.estado }}
                        </span>
                        <span class="text-[10px] text-slate-400">Técnico: {{ man.tecnico }}</span>
                      </div>
                      <div class="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          @if (man.fotos?.length) {
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-amber-100 text-[10px] font-bold text-emerald-700">
                              <i-lucide name="image" class="w-3 h-3"></i-lucide> {{ man.fotos?.length }}
                            </span>
                          }
                          @if (man.videos?.length) {
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-amber-100 text-[10px] font-bold text-purple-700">
                              <i-lucide name="film" class="w-3 h-3"></i-lucide> {{ man.videos?.length }}
                            </span>
                          }
                          @if (man.documentos?.length) {
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-amber-100 text-[10px] font-bold text-indigo-700">
                              <i-lucide name="file-text" class="w-3 h-3"></i-lucide> {{ man.documentos?.length }}
                            </span>
                          }
                        </div>
                        <button
                          type="button"
                          (click)="abrirEvidenciasMantenimiento(man)"
                          class="text-[10px] font-extrabold text-easydry-blue hover:underline">
                          {{ man.estado === 'Completado' ? 'Ver evidencias' : 'Ejecutar (foto obligatoria)' }}
                        </button>
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

      <app-modal
        [isOpen]="modalFichaZoomOpen"
        title="Ficha técnica"
        icon="file-text"
        zClass="z-[12000]"
        (close)="modalFichaZoomOpen = false">
        <div class="bg-slate-950 rounded-2xl p-3 min-h-64 flex items-center justify-center">
          @if (fichaPendientePreview || fichaTecnicaDisplayUrl) {
            <img
              [src]="fichaPendientePreview || fichaTecnicaDisplayUrl"
              alt="Ficha técnica completa"
              class="w-full max-h-[80vh] object-contain">
          } @else {
            <p class="text-sm text-white/70">No hay imagen de ficha técnica.</p>
          }
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
                <select [(ngModel)]="transferencia.sucursalNueva" (ngModelChange)="onCambioSucursalTransferencia($event)" name="sucursalNueva" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white cursor-pointer">
                  <option value="" disabled>Seleccione una sucursal</option>
                  @for (s of sucursales; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía Destino</label>
                <select [(ngModel)]="transferencia.bahiaNueva" name="bahiaNueva" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white cursor-pointer" required>
                  @for (b of getBahiasDisponibles(transferencia.sucursalNueva); track b) {
                    <option [value]="b">{{ b }}</option>
                  }
                </select>
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
        icon="hard-drive"
        (close)="modalCrearOpen = false">
        
        <form (ngSubmit)="guardarNuevaMaquinaria()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Código Activo</label>
              <input type="text" [(ngModel)]="nuevaMaquina.codigo" name="codigo" placeholder="ej. HD-006" 
                [ngClass]="erroresMaquina.codigo ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
                class="w-full p-2.5 border rounded-xl text-sm font-mono" required
                (input)="erroresMaquina.codigo = ''">
              @if (erroresMaquina.codigo) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresMaquina.codigo }}
                </p>
              }
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Equipo</label>
              <input type="text" [(ngModel)]="nuevaMaquina.nombre" name="nombre" placeholder="Hidrolavadora HD-006" 
                [ngClass]="erroresMaquina.nombre ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
                class="w-full p-2.5 border rounded-xl text-sm" required
                (input)="erroresMaquina.nombre = ''">
              @if (erroresMaquina.nombre) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresMaquina.nombre }}
                </p>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal Asignada</label>
                <select [(ngModel)]="nuevaMaquina.agencia" (ngModelChange)="onCambioSucursalNuevaMaquina($event)" name="agencia" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white cursor-pointer">
                  <option value="" disabled>Seleccione una sucursal</option>
                @if (sucursales.length > 0) {
                  @for (s of sucursales; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }}</option>
                  }
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía</label>
              <select [(ngModel)]="nuevaMaquina.bahia" name="bahia" 
                [ngClass]="erroresMaquina.bahia ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
                class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white cursor-pointer" required
                (change)="erroresMaquina.bahia = ''">
                @for (b of getBahiasDisponibles(nuevaMaquina.agencia); track b) {
                  <option [value]="b">{{ b }}</option>
                }
              </select>
              @if (erroresMaquina.bahia) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresMaquina.bahia }}
                </p>
              }
            </div>
          </div>

          <!-- SECCIÓN: FOTO DE LA MÁQUINA (OBLIGATORIA) -->
          <div class="space-y-2 pt-2 border-t border-slate-100">
            <label class="block text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <i-lucide name="camera" class="w-4 h-4 text-easydry-blue"></i-lucide>
                Foto de la Máquina <span class="text-rose-500">*</span>
              </span>
              <span class="text-[10px] text-slate-400 font-normal">PNG, JPG o WebP (máx. 5 MB)</span>
            </label>

            @if (nuevaMaquina.imagen) {
              <!-- Preview de Foto Cargada -->
              <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                <div class="relative w-full sm:w-36 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-2xs flex-shrink-0 bg-slate-900">
                  <img [src]="nuevaMaquina.imagen" alt="Foto de la Máquina" class="w-full h-full object-cover">
                  <div class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-bold backdrop-blur-xs">
                    Foto lista
                  </div>
                </div>
                <div class="space-y-2 flex-1 w-full text-left">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <p class="text-xs font-bold text-slate-800">Foto cargada exitosamente</p>
                  </div>
                  <p class="text-[11px] text-slate-500">Puedes cambiar la foto subiendo un nuevo archivo desde tu dispositivo.</p>
                  <div class="flex items-center gap-2 flex-wrap pt-1">
                    <button 
                      type="button" 
                      (click)="fotoMaquinaInput.click()"
                      class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
                      <i-lucide name="upload" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                      <span>Subir Otra Foto</span>
                    </button>
                    <button 
                      type="button" 
                      (click)="eliminarFotoMaquina()"
                      class="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                      <i-lucide name="trash-2" class="w-3.5 h-3.5"></i-lucide>
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <!-- Uploader sin foto -->
              <div 
                (click)="fotoMaquinaInput.click()" 
                [ngClass]="erroresMaquina.imagen ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-100' : 'border-slate-200 hover:border-easydry-blue bg-slate-50/70 hover:bg-blue-50/20'"
                class="border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all group">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 group-hover:border-blue-300 flex items-center justify-center text-slate-400 group-hover:text-easydry-blue transition-colors shadow-2xs mb-2">
                  <i-lucide name="camera" class="w-6 h-6"></i-lucide>
                </div>
                <p class="text-xs font-bold text-slate-800 group-hover:text-easydry-blue transition-colors">
                  Haz clic aquí para subir la foto de la máquina
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5">Sube la foto del equipo desde tu computadora o dispositivo móvil</p>
              </div>
              @if (erroresMaquina.imagen) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresMaquina.imagen }}
                </p>
              }
            }

            <input 
              type="file" 
              #fotoMaquinaInput 
              (change)="onSubirFotoMaquina($event)" 
              accept="image/*" 
              class="hidden">
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-100">
            <label class="block text-xs font-bold text-slate-700 uppercase">Imagen de ficha técnica</label>
            <label class="block border-2 border-dashed border-slate-200 hover:border-easydry-blue rounded-2xl p-5 text-center cursor-pointer bg-slate-50/70">
              <i-lucide name="image-plus" class="w-8 h-8 text-easydry-blue mx-auto mb-2"></i-lucide>
              <p class="text-xs font-bold text-slate-800">Sube la ficha técnica (opcional)</p>
              <p class="text-[11px] text-slate-400 mt-1">Se guarda tal cual, sin recortar ni ajustar</p>
              <input type="file" accept="image/*" (change)="onSeleccionarFichaTecnica($event)" class="hidden">
            </label>
            @if (fichaPendientePreview) {
              <img [src]="fichaPendientePreview" alt="Vista previa ficha" class="w-full max-h-56 object-contain rounded-xl border border-slate-200 bg-white">
            }
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalCrearOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
          <button (click)="guardarNuevaMaquinaria()" [disabled]="guardandoActivo" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50">{{ guardandoActivo ? 'Guardando...' : 'Guardar Activo' }}</button>
        </div>
      </app-modal>

      <!-- Modal Reportar Fallo (desde Ficha) — z-index por encima de la ficha -->
      <app-modal
        [isOpen]="modalReportarOpen"
        title="Reportar Fallo / Avería"
        icon="alert-triangle"
        zClass="z-[10050]"
        [showBackButton]="true"
        (close)="modalReportarOpen = false"
        (back)="modalReportarOpen = false">

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
                [ngClass]="erroresFallo.descripcion ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
                class="w-full p-2.5 border rounded-xl text-sm"
                (input)="erroresFallo.descripcion = ''"
                required></textarea>
              @if (erroresFallo.descripcion) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresFallo.descripcion }}
                </p>
              }
            </div>

            <div class="border-2 border-dashed border-rose-200 bg-rose-50/40 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <label class="text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
                  <i-lucide name="camera" class="w-4 h-4 text-rose-600"></i-lucide>
                  Evidencias del Fallo (Fotos / Vídeos)
                </label>
                <span class="text-[11px] text-slate-500">Foto o video de la avería</span>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="cursor-pointer px-4 py-2.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-2">
                  <i-lucide name="upload-cloud" class="w-4 h-4"></i-lucide>
                  <span>Subir Fotos / Videos del Fallo</span>
                  <input type="file" multiple accept="image/*,video/*" (change)="onSubirArchivosFallo($event)" class="hidden">
                </label>
              </div>
              @if (archivosFalloSubidos.length > 0) {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  @for (arch of archivosFalloSubidos; track arch.id; let idx = $index) {
                    <div class="relative bg-white border rounded-xl p-2 shadow-xs">
                      @if (arch.tipo === 'imagen') {
                        <img [src]="arch.url" alt="Fallo" class="w-full h-24 object-cover rounded-lg">
                      } @else {
                        <div class="w-full h-24 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white">
                          <i-lucide name="film" class="w-8 h-8 text-purple-400"></i-lucide>
                          <span class="text-[9px] mt-1 font-mono">Vídeo</span>
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
          </form>
        }

        <div modal-footer>
          <button (click)="modalReportarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarReporteFallo()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">Registrar Reporte con Evidencias</button>
        </div>
      </app-modal>

      <!-- Modal Programar Mantenimiento (desde Ficha) — z-index por encima de la ficha -->
      <app-modal
        [isOpen]="modalProgramarOpen"
        title="Programar Mantenimiento"
        icon="calendar-clock"
        zClass="z-[10050]"
        [showBackButton]="true"
        (close)="modalProgramarOpen = false"
        (back)="modalProgramarOpen = false">

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

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cada cuánto se debe hacer</label>
              <select [(ngModel)]="nuevoMantenimiento.frecuenciaDias" name="frecuenciaMant" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                @for (f of frecuenciasMantenimiento; track f.dias) {
                  <option [ngValue]="f.dias">{{ f.label }}</option>
                }
              </select>
              <p class="mt-1 text-[11px] text-slate-500">Al ejecutarlo se agenda sola la siguiente visita si no es única vez.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Técnico / Especialista</label>
                <app-tecnico-search-select
                  [tecnicos]="tecnicosDisponibles"
                  [selectedId]="nuevoMantenimiento.tecnicoId"
                  [invalid]="!!erroresMant.tecnico"
                  placeholder="Buscar coordinador o técnico..."
                  (selected)="onSeleccionarTecnicoAgenda($event)">
                </app-tecnico-search-select>
                @if (erroresMant.tecnico) {
                  <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                    {{ erroresMant.tecnico }}
                  </p>
                }
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Duración Estimada (Horas)</label>
                <input type="number" [(ngModel)]="nuevoMantenimiento.duracionHoras" name="duracionMant" 
                  [ngClass]="erroresMant.duracionHoras ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
                  class="w-full p-2.5 border rounded-xl text-sm" min="1"
                  (input)="erroresMant.duracionHoras = ''" required>
                @if (erroresMant.duracionHoras) {
                  <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                    {{ erroresMant.duracionHoras }}
                  </p>
                }
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Trabajo</label>
              <textarea
                [(ngModel)]="nuevoMantenimiento.descripcion"
                name="descMant"
                rows="3"
                placeholder="Detalle de tareas, repuestos y alcance..."
                [ngClass]="erroresMant.descripcion ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
                class="w-full p-2.5 border rounded-xl text-sm"
                (input)="erroresMant.descripcion = ''"
                required></textarea>
              @if (erroresMant.descripcion) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresMant.descripcion }}
                </p>
              }
            </div>

            <div class="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <label class="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                  <i-lucide name="camera" class="w-4 h-4 text-emerald-600"></i-lucide>
                  Evidencias (opcional al agendar)
                </label>
                <span class="text-[11px] text-slate-500">La foto se exige al ejecutar, no al programar</span>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="cursor-pointer px-4 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-2">
                  <i-lucide name="upload-cloud" class="w-4 h-4"></i-lucide>
                  <span>Subir Fotos / Videos</span>
                  <input type="file" multiple accept="image/*,video/*" (change)="onSubirMultimediaMant($event)" class="hidden">
                </label>

              </div>
              @if (multimediaMantSubida.length > 0) {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  @for (m of multimediaMantSubida; track m.id; let idx = $index) {
                    <div class="relative bg-white border rounded-xl p-2 shadow-xs">
                      @if (m.tipo === 'imagen') {
                        <img [src]="m.url" alt="Mantenimiento" class="w-full h-24 object-cover rounded-lg">
                      } @else {
                        <div class="w-full h-24 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white">
                          <i-lucide name="film" class="w-8 h-8 text-emerald-400"></i-lucide>
                          <span class="text-[9px] mt-1 font-mono">Vídeo</span>
                        </div>
                      }
                      <p class="text-[10px] font-semibold text-slate-700 truncate mt-1">{{ m.nombre }}</p>
                      <button type="button" (click)="eliminarMultimediaMant(idx)"
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
                  Documentos Técnicos (PDF / Facturas / Informe)
                </label>
                <span class="text-[11px] text-slate-500">PDF, DOC, XLS</span>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="cursor-pointer px-4 py-2.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-2">
                  <i-lucide name="file-text" class="w-4 h-4"></i-lucide>
                  <span>Adjuntar Documento</span>
                  <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" (change)="onSubirDocumentosMant($event)" class="hidden">
                </label>

              </div>
              @if (documentosMantSubidos.length > 0) {
                <div class="space-y-2 pt-2">
                  @for (doc of documentosMantSubidos; track doc.id; let idx = $index) {
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
                      <button type="button" (click)="eliminarDocumentoMant(idx)"
                        class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                        <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </form>
        }

        <div modal-footer>
          <button (click)="modalProgramarOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarProgramacionMantenimiento()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">Guardar Mantenimiento</button>
        </div>
      </app-modal>

      <app-modal
        [isOpen]="modalEvidenciasMantOpen"
        [title]="'Evidencias: ' + (mantenimientoEvidencias?.tipo || 'Mantenimiento')"
        icon="camera"
        zClass="z-[10050]"
        [showBackButton]="true"
        (close)="modalEvidenciasMantOpen = false"
        (back)="modalEvidenciasMantOpen = false">

        @if (mantenimientoEvidencias) {
          <div class="space-y-4">
            <div class="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs">
              <p class="font-bold text-slate-800">{{ mantenimientoEvidencias.maquina }}</p>
              <p class="text-slate-600 mt-0.5">{{ mantenimientoEvidencias.fecha }} · {{ mantenimientoEvidencias.tecnico }} · {{ mantenimientoEvidencias.estado }}</p>
              <p class="text-slate-500 mt-1">{{ mantenimientoEvidencias.descripcion }}</p>
            </div>

            <div class="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <label class="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                  <i-lucide name="camera" class="w-4 h-4 text-emerald-600"></i-lucide>
                  Fotos / Vídeos del trabajo <span class="text-rose-500">*</span>
                </label>
                <span class="text-[11px] text-slate-500">Obligatorio: al menos una foto para ejecutar</span>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="cursor-pointer px-4 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-2">
                  <i-lucide name="upload-cloud" class="w-4 h-4"></i-lucide>
                  <span>Subir Fotos / Videos</span>
                  <input type="file" multiple accept="image/*,video/*" (change)="onSubirMultimediaMant($event)" class="hidden">
                </label>

              </div>
              @if (multimediaMantSubida.length > 0) {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  @for (m of multimediaMantSubida; track m.id; let idx = $index) {
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
                      <button type="button" (click)="eliminarMultimediaMant(idx)"
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
                  Documentos (PDF / Informe / Factura)
                </label>
                <span class="text-[11px] text-slate-500">PDF, DOC, XLS</span>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="cursor-pointer px-4 py-2.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-2">
                  <i-lucide name="file-text" class="w-4 h-4"></i-lucide>
                  <span>Adjuntar Documento</span>
                  <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" (change)="onSubirDocumentosMant($event)" class="hidden">
                </label>

              </div>
              @if (documentosMantSubidos.length > 0) {
                <div class="space-y-2 pt-2">
                  @for (doc of documentosMantSubidos; track doc.id; let idx = $index) {
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
                      <button type="button" (click)="eliminarDocumentoMant(idx)"
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
          <button (click)="modalEvidenciasMantOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarEvidenciasMantenimiento()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">
            {{ mantenimientoEvidencias?.estado === 'Completado' ? 'Guardar Evidencias' : 'Ejecutar mantenimiento' }}
          </button>
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
  modalEvidenciasMantOpen = false;
  mantenimientoEvidencias?: Mantenimiento;

  archivosFalloSubidos: ArchivoAdjunto[] = [];
  multimediaMantSubida: ArchivoAdjunto[] = [];
  documentosMantSubidos: ArchivoAdjunto[] = [];

  nuevoIncidente = {
    tipo: 'Falla eléctrica' as Incidente['tipo'],
    prioridad: 'Alta' as Incidente['prioridad'],
    descripcion: ''
  };

  frecuenciasMantenimiento = FRECUENCIAS_MANTENIMIENTO;

  nuevoMantenimiento = {
    tipo: 'Preventivo' as Mantenimiento['tipo'],
    fecha: new Date().toISOString().substring(0, 10),
    tecnico: '',
    tecnicoId: '' as string | number,
    duracionHoras: 2,
    descripcion: '',
    frecuenciaDias: 30
  };

  tecnicosDisponibles: TecnicoOpcion[] = [];

  transferencia = {
    sucursalNueva: '',
    bahiaNueva: '',
    motivo: ''
  };

  filtroTexto = '';

  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', cliente: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  // Mapa sucursal -> región (para el filtro de región)
  mapaRegionSucursal: Record<string, string> = {};
  // Mapa sucursal -> marca (para el filtro de marca)
  mapaMarcaSucursal: Record<string, string> = {};

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    if (filtros.busqueda !== undefined) {
      this.filtroTexto = filtros.busqueda;
    }
    this.currentPage = 1;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    this.currentPage = 1;
  }

  currentPage = 1;
  pageSize = 6;

  guardandoActivo = false;
  guardandoFicha = false;
  cambiandoFichaTecnica = false;
  modalFichaZoomOpen = false;
  fichaTecnicaDisplayUrl = '';
  fichaPendienteFile: File | null = null;
  fichaPendientePreview = '';
  fotoMaquinaFile: File | null = null;

  nuevaMaquina = {
    codigo: '',
    nombre: '',
    marca: '',
    modelo: '',
    agencia: '',
    bahia: '',
    estado: 'Operativa' as Maquinaria['estado'],
    fechaMantenimiento: '',
    imagen: '',
    fichaTecnicaUrl: ''
  };

  erroresMaquina = {
    codigo: '',
    nombre: '',
    bahia: '',
    imagen: ''
  };

  erroresFallo = {
    descripcion: ''
  };

  erroresMant = {
    tecnico: '',
    duracionHoras: '',
    descripcion: ''
  };

  todasLasBahias: Bahia[] = [];

  private maquinariaService = inject(MaquinariaService);
  private movimientoService = inject(MovimientoMaquinariaService);
  private sucursalService = inject(SucursalService);
  private incidenteService = inject(IncidenteService);
  private mantenimientoService = inject(MantenimientoService);
  private bahiaService = inject(BahiaService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);
  private storageUpload = inject(StorageUploadService);
  private usuarioService = inject(UsuarioService);

  ngOnInit(): void {
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

    this.maquinariaService.getMaquinaria().subscribe(list => {
      this.maquinas = list;
    });

    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
      this.mapaRegionSucursal = {};
      this.mapaMarcaSucursal = {};
      list.forEach(s => {
        if (s.nombre && s.regionNombre) this.mapaRegionSucursal[s.nombre] = s.regionNombre;
        const cNom = s.clienteNombre || s.marcaNombre;
        if (s.nombre && cNom) this.mapaMarcaSucursal[s.nombre] = cNom;
      });
    });

    this.bahiaService.getBahias().subscribe(list => {
      this.todasLasBahias = list;
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
        m.codigo.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (m.modelo || '').toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (m.numeroSerie || '').toLowerCase().includes(this.filtroTexto.toLowerCase());
      
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
    if (this.filtrosGlobales.region && this.filtrosGlobales.region !== 'Todas') {
      resultados = resultados.filter(m => this.mapaRegionSucursal[m.agencia] === this.filtrosGlobales.region);
    }
    const fCliente = this.filtrosGlobales.cliente || this.filtrosGlobales.marca;
    if (fCliente && fCliente !== 'Todas' && fCliente !== 'Todos') {
      resultados = resultados.filter(m => this.mapaMarcaSucursal[m.agencia] === fCliente);
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
    this.mantenimientoService.getMantenimientos({ maquinariaId: String(maq.id) }).subscribe(list => {
      this.mantenimientosMaquina = list
        .filter(m => String(m.maquinariaId || '') === String(maq.id) || m.maquina === maq.codigo || m.maquina === maq.nombre)
        .sort((a, b) => {
          const orden: Record<string, number> = { Programado: 0, 'En Proceso': 1, Completado: 2, Cancelado: 3 };
          return (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9);
        });
    });

    this.cambiandoFichaTecnica = !maq.fichaTecnicaUrl;
    this.fichaTecnicaDisplayUrl = '';
    this.limpiarFichaPendiente();
    this.modalFichaOpen = true;
    void this.cargarVistaFichaTecnica(maq.fichaTecnicaUrl);
  }

  urlMedia(url?: string | null): string {
    return this.storageUpload.resolveBackendUrl(url);
  }

  async cargarVistaFichaTecnica(url?: string | null): Promise<void> {
    if (!url) {
      this.fichaTecnicaDisplayUrl = '';
      return;
    }
    try {
      this.fichaTecnicaDisplayUrl = await this.storageUpload.getDirectStreamingUrl(url);
    } catch {
      this.fichaTecnicaDisplayUrl = this.urlMedia(url);
    }
  }

  onSeleccionarFichaTecnica(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toastService.warning('Archivo inválido', 'La ficha técnica debe ser una imagen.');
      input.value = '';
      return;
    }
    if (this.fichaPendientePreview) URL.revokeObjectURL(this.fichaPendientePreview);
    this.fichaPendienteFile = file;
    this.fichaPendientePreview = URL.createObjectURL(file);
    input.value = '';
  }

  cancelarCambioFicha(): void {
    this.limpiarFichaPendiente();
    this.cambiandoFichaTecnica = false;
  }

  abrirFichaTecnicaCompleta(): void {
    if (!this.fichaPendientePreview && !this.fichaTecnicaDisplayUrl && this.maquinaSeleccionada?.fichaTecnicaUrl) {
      void this.cargarVistaFichaTecnica(this.maquinaSeleccionada.fichaTecnicaUrl);
    }
    this.modalFichaZoomOpen = true;
  }

  private limpiarFichaPendiente(): void {
    if (this.fichaPendientePreview) URL.revokeObjectURL(this.fichaPendientePreview);
    this.fichaPendienteFile = null;
    this.fichaPendientePreview = '';
  }

  private async subirFichaPendiente(nombre: string, agenciaId?: string, maquinariaId?: string, codigo?: string): Promise<string> {
    if (!this.fichaPendienteFile) return '';
    return this.storageUpload.uploadMedia(this.fichaPendienteFile, {
      category: 'MAQUINARIA_FICHA',
      type: 'FICHA_TECNICA',
      agenciaId,
      maquinariaId,
      maquinariaNombre: nombre,
      maquinariaCodigo: codigo,
      fileName: this.fichaPendienteFile.name || 'ficha-tecnica.jpg',
      contentType: this.fichaPendienteFile.type || 'image/jpeg',
    });
  }

  private async subirFotoPendiente(nombre: string, agenciaId?: string, maquinariaId?: string, codigo?: string): Promise<string> {
    if (!this.fotoMaquinaFile) return this.nuevaMaquina.imagen || '';
    return this.storageUpload.uploadMedia(this.fotoMaquinaFile, {
      category: 'MAQUINARIA_IMAGEN',
      type: 'FOTO_MAQUINA',
      agenciaId,
      maquinariaId,
      maquinariaNombre: nombre,
      maquinariaCodigo: codigo,
      fileName: this.fotoMaquinaFile.name || 'foto-maquina.jpg',
      contentType: this.fotoMaquinaFile.type || 'image/jpeg',
    });
  }

  openModalTransferir(maq: Maquinaria) {
    this.maquinaSeleccionada = maq;
    const sucursalInicial = this.sucursales[0]?.nombre || '';
    const bahias = this.getBahiasDisponibles(sucursalInicial);
    this.transferencia = {
      sucursalNueva: sucursalInicial,
      bahiaNueva: bahias[0] || '',
      motivo: ''
    };
    this.modalTransferirOpen = true;
  }

  ejecutarTransferencia() {
    if (!this.maquinaSeleccionada || !this.transferencia.sucursalNueva || !this.transferencia.bahiaNueva || !this.transferencia.motivo.trim()) {
      this.toastService.warning('Datos Requeridos', 'Seleccione la sucursal, la bahía e ingrese el motivo de transferencia.');
      return;
    }

    const user = this.authService.getCurrentUser();

    const mov = {
      maquinaCodigo: this.maquinaSeleccionada.codigo,
      maquinaNombre: this.maquinaSeleccionada.nombre,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
      usuarioResponsable: user ? `${user.nombre} ${user.apellido}`.trim() : '',
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

  getBahiasDisponibles(sucursalNombre: string): string[] {
    if (!sucursalNombre) return [];
    return this.todasLasBahias
      .filter(b => b.sucursalNombre === sucursalNombre)
      .map(b => b.nombre);
  }

  onCambioSucursalNuevaMaquina(sucursalNombre: string): void {
    this.nuevaMaquina.agencia = sucursalNombre;
    const bahias = this.getBahiasDisponibles(sucursalNombre);
    this.nuevaMaquina.bahia = bahias[0] || '';
    this.erroresMaquina.bahia = '';
  }

  onCambioSucursalTransferencia(sucursalNombre: string): void {
    this.transferencia.sucursalNueva = sucursalNombre;
    const bahias = this.getBahiasDisponibles(sucursalNombre);
    this.transferencia.bahiaNueva = bahias[0] || '';
  }

  abrirModalCrear() {
    const sucursalInicial = this.sucursales[0]?.nombre || '';
    const bahiasIniciales = this.getBahiasDisponibles(sucursalInicial);
    this.nuevaMaquina = {
      codigo: '',
      nombre: '',
      marca: '',
      modelo: '',
      agencia: sucursalInicial,
      bahia: bahiasIniciales[0] || '',
      estado: 'Operativa',
      fechaMantenimiento: new Date().toISOString().substring(0, 10),
      imagen: '',
      fichaTecnicaUrl: ''
    };
    this.erroresMaquina = { codigo: '', nombre: '', bahia: '', imagen: '' };
    this.limpiarFichaPendiente();
    this.limpiarFotoPendiente();
    this.modalCrearOpen = true;
  }

  onSubirFotoMaquina(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.warning('Tamaño Excedido', 'La imagen no debe superar los 5 MB.');
      input.value = '';
      return;
    }
    if (this.nuevaMaquina.imagen?.startsWith('blob:')) {
      URL.revokeObjectURL(this.nuevaMaquina.imagen);
    }
    this.fotoMaquinaFile = file;
    this.nuevaMaquina.imagen = URL.createObjectURL(file);
    this.erroresMaquina.imagen = '';
    input.value = '';
    this.toastService.success('Foto Cargada', 'Se ha cargado la foto de la máquina.');
  }

  eliminarFotoMaquina(): void {
    this.limpiarFotoPendiente();
  }

  private limpiarFotoPendiente(): void {
    if (this.nuevaMaquina.imagen?.startsWith('blob:')) {
      URL.revokeObjectURL(this.nuevaMaquina.imagen);
    }
    this.fotoMaquinaFile = null;
    this.nuevaMaquina.imagen = '';
  }

  sucursalIdDeNombre(nombre?: string): string | undefined {
    if (!nombre) return undefined;
    const sucursal = this.sucursales.find(s => s.nombre === nombre);
    return sucursal?.id != null ? String(sucursal.id) : undefined;
  }

  bahiaIdDeNombre(sucursalNombre?: string, bahiaNombre?: string): string | undefined {
    if (!sucursalNombre || !bahiaNombre) return undefined;
    const bahia = this.todasLasBahias.find(b =>
      (b.sucursalNombre === sucursalNombre || b.agenciaNombre === sucursalNombre) && b.nombre === bahiaNombre
    );
    return bahia?.id != null ? String(bahia.id) : undefined;
  }

  async guardarNuevaMaquinaria() {
    this.erroresMaquina = { codigo: '', nombre: '', bahia: '', imagen: '' };
    let valido = true;

    if (!this.nuevaMaquina.codigo?.trim()) {
      this.erroresMaquina.codigo = 'El código del activo es obligatorio.';
      valido = false;
    }
    if (!this.nuevaMaquina.nombre?.trim()) {
      this.erroresMaquina.nombre = 'El nombre del equipo es obligatorio.';
      valido = false;
    }
    if (!this.nuevaMaquina.bahia?.trim()) {
      this.erroresMaquina.bahia = 'Indique la bahía de destino.';
      valido = false;
    }
    if (!this.nuevaMaquina.imagen?.trim()) {
      this.erroresMaquina.imagen = 'Debes subir la foto de la máquina obligatoriamente.';
      valido = false;
    }

    if (!valido) {
      this.toastService.warning('Campos Requeridos', 'Complete los campos marcados en rojo.');
      return;
    }

    this.guardandoActivo = true;
    try {
      const sucursalId = this.sucursalIdDeNombre(this.nuevaMaquina.agencia);
      const bahiaId = this.bahiaIdDeNombre(this.nuevaMaquina.agencia, this.nuevaMaquina.bahia);
      const codigo = this.nuevaMaquina.codigo.trim();

      this.nuevaMaquina.imagen = await this.subirFotoPendiente(
        this.nuevaMaquina.nombre,
        sucursalId,
        undefined,
        codigo,
      );

      if (this.fichaPendienteFile) {
        this.nuevaMaquina.fichaTecnicaUrl = await this.subirFichaPendiente(
          this.nuevaMaquina.nombre,
          sucursalId,
          undefined,
          codigo,
        );
      }

      this.maquinariaService.crearMaquinaria({
        ...this.nuevaMaquina,
        sucursalId,
        bahiaId,
      } as Omit<Maquinaria, 'id'>).subscribe({
        next: creada => {
          this.guardandoActivo = false;
          this.limpiarFichaPendiente();
          this.limpiarFotoPendiente();
          this.toastService.success('Activo Guardado', `Equipo ${creada.codigo} registrado exitosamente.`);
          this.modalCrearOpen = false;
        },
        error: () => {
          this.guardandoActivo = false;
          this.toastService.error('No se pudo guardar', 'Revisa los datos del equipo e inténtalo de nuevo.');
        },
      });
    } catch {
      this.guardandoActivo = false;
      this.toastService.error('Error de subida', 'No se pudo guardar la foto o la ficha técnica en S3.');
    }
  }

  async guardarFichaTecnicaExistente() {
    if (!this.maquinaSeleccionada) return;
    if (!this.fichaPendienteFile) {
      this.toastService.warning('Ficha requerida', 'Sube la imagen de la ficha técnica.');
      return;
    }
    this.guardandoFicha = true;
    try {
      const url = await this.subirFichaPendiente(
        this.maquinaSeleccionada.nombre,
        this.sucursalIdDeNombre(this.maquinaSeleccionada.agencia),
        String(this.maquinaSeleccionada.id),
        this.maquinaSeleccionada.codigo,
      );
      this.maquinariaService.actualizarFichaTecnica(this.maquinaSeleccionada.id, url).subscribe({
        next: actualizada => {
          this.guardandoFicha = false;
          if (actualizada) {
            this.maquinaSeleccionada = { ...this.maquinaSeleccionada!, ...actualizada };
            const idx = this.maquinas.findIndex(m => String(m.id) === String(actualizada.id));
            if (idx !== -1) this.maquinas[idx] = { ...this.maquinas[idx], ...actualizada };
          }
          this.cambiandoFichaTecnica = false;
          this.limpiarFichaPendiente();
          void this.cargarVistaFichaTecnica(actualizada?.fichaTecnicaUrl || url);
          this.toastService.success('Ficha guardada', 'La imagen de ficha técnica quedó en S3 y se puede consultar.');
        },
        error: () => {
          this.guardandoFicha = false;
          this.toastService.error('No se pudo guardar', 'La ficha técnica no se actualizó en base.');
        },
      });
    } catch {
      this.guardandoFicha = false;
      this.toastService.error('Error de subida', 'No se pudo guardar la imagen de ficha técnica en S3.');
    }
  }

  reportarFallo() {
    if (!this.maquinaSeleccionada) return;
    this.nuevoIncidente = {
      tipo: 'Falla eléctrica',
      prioridad: 'Alta',
      descripcion: ''
    };
    this.erroresFallo = { descripcion: '' };
    this.archivosFalloSubidos = [];
    this.modalReportarOpen = true;
  }

  onSeleccionarTecnicoAgenda(tec: TecnicoOpcion | null) {
    this.nuevoMantenimiento.tecnicoId = tec?.id || '';
    this.nuevoMantenimiento.tecnico = tec?.nombre || '';
    this.erroresMant.tecnico = '';
  }

  programarMantenimiento() {
    if (!this.maquinaSeleccionada) return;
    this.nuevoMantenimiento = {
      tipo: 'Preventivo',
      fecha: new Date().toISOString().substring(0, 10),
      tecnico: '',
      tecnicoId: '',
      duracionHoras: 2,
      descripcion: '',
      frecuenciaDias: 30
    };
    this.multimediaMantSubida = [];
    this.documentosMantSubidos = [];
    this.erroresMant = { tecnico: '', duracionHoras: '', descripcion: '' };
    this.modalProgramarOpen = true;
  }

  tieneEvidenciasFallo(inc: Incidente): boolean {
    return !!(inc.fotosFallo?.length || inc.videosFallo?.length || inc.archivosFallo?.length);
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
      fechaSubida: new Date().toLocaleTimeString(),
      file,
    };
  }

  onSubirArchivosFallo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    Array.from(input.files).forEach(file => {
      this.archivosFalloSubidos.push(this.archivoDesdeFile(file));
    });
    this.toastService.success('Archivos cargados', `${input.files.length} evidencia(s) del fallo lista(s).`);
    input.value = '';
  }

  eliminarArchivoFallo(index: number): void {
    this.archivosFalloSubidos.splice(index, 1);
  }

  onSubirMultimediaMant(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    Array.from(input.files).forEach(file => {
      this.multimediaMantSubida.push(this.archivoDesdeFile(file));
    });
    this.toastService.success('Archivos cargados', `${input.files.length} evidencia(s) lista(s).`);
    input.value = '';
  }

  eliminarMultimediaMant(index: number): void {
    this.multimediaMantSubida.splice(index, 1);
  }

  onSubirDocumentosMant(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    Array.from(input.files).forEach(file => {
      this.documentosMantSubidos.push(this.archivoDesdeFile(file, 'documento'));
    });
    this.toastService.success('Documentos cargados', `${input.files.length} documento(s) listo(s).`);
    input.value = '';
  }

  eliminarDocumentoMant(index: number): void {
    this.documentosMantSubidos.splice(index, 1);
  }

  abrirEvidenciasMantenimiento(man: Mantenimiento): void {
    this.mantenimientoEvidencias = man;
    this.multimediaMantSubida = [
      ...(man.archivos || []).filter(a => a.tipo !== 'documento'),
      ...(man.fotos || []).map((url, i) => ({
        id: `foto-${man.id}-${i}`,
        nombre: `foto_${i + 1}.jpg`,
        tipo: 'imagen' as const,
        extension: 'JPG',
        url
      })),
      ...(man.videos || []).map((url, i) => ({
        id: `video-${man.id}-${i}`,
        nombre: `video_${i + 1}.mp4`,
        tipo: 'video' as const,
        extension: 'MP4',
        url
      }))
    ];
    this.documentosMantSubidos = [...(man.documentos || [])];
    this.modalEvidenciasMantOpen = true;
  }

  etiquetaFrecuencia(dias?: number | null): string {
    return etiquetaFrecuenciaMantenimiento(dias);
  }

  async guardarEvidenciasMantenimiento(): Promise<void> {
    if (!this.mantenimientoEvidencias) return;
    const fotosLocales = this.multimediaMantSubida.filter(a => a.tipo === 'imagen');
    if (this.mantenimientoEvidencias.estado !== 'Completado' && !fotosLocales.length) {
      this.toastService.warning('Imagen requerida', 'Para ejecutar el mantenimiento debes adjuntar al menos una foto.');
      return;
    }

    try {
      const evidencias = await this.mantenimientoService.subirEvidenciasMantenimiento(
        [...this.multimediaMantSubida, ...this.documentosMantSubidos],
        {
          maquinariaId: this.maquinaSeleccionada ? String(this.maquinaSeleccionada.id) : undefined,
          maquinariaNombre: this.maquinaSeleccionada?.nombre || this.mantenimientoEvidencias.maquina,
          maquinariaCodigo: this.maquinaSeleccionada?.codigo,
          agenciaId: this.maquinaSeleccionada?.sucursalId ? String(this.maquinaSeleccionada.sucursalId) : this.maquinaSeleccionada?.agencia,
          mantenimientoId: String(this.mantenimientoEvidencias.id),
        },
      );

      if (this.mantenimientoEvidencias.estado !== 'Completado') {
        if (!evidencias.some(e => e.tipo === 'FOTO')) {
          this.toastService.warning('Imagen requerida', 'La foto de evidencia no se pudo guardar. Inténtalo de nuevo.');
          return;
        }
        this.mantenimientoService.ejecutarMantenimiento(this.mantenimientoEvidencias.id, {
          observaciones: this.mantenimientoEvidencias.descripcion,
          fechaFin: new Date().toISOString().substring(0, 10),
          evidencias,
        }).subscribe(actualizado => {
          if (!actualizado) {
            this.toastService.error('No se pudo ejecutar', 'El mantenimiento no se actualizó en el servidor.');
            return;
          }
          this.mantenimientosMaquina = this.mantenimientosMaquina.map(m =>
            String(m.id) === String(actualizado.id) ? { ...m, ...actualizado } : m
          );
          this.toastService.success('Mantenimiento ejecutado', `${actualizado.maquina} quedó realizado.`);
          this.modalEvidenciasMantOpen = false;
          if (this.maquinaSeleccionada) {
            this.mantenimientoService.getMantenimientos({ maquinariaId: String(this.maquinaSeleccionada.id) }).subscribe(list => {
              this.mantenimientosMaquina = list;
            });
          }
        });
        return;
      }

      const fotos = evidencias.filter(e => e.tipo === 'FOTO').map(e => e.url);
      const videos = evidencias.filter(e => e.tipo === 'VIDEO').map(e => e.url);
      this.mantenimientoService.actualizarMantenimiento(this.mantenimientoEvidencias.id, {
        fotos,
        videos,
        archivos: [...this.multimediaMantSubida],
        documentos: [...this.documentosMantSubidos]
      }).subscribe(actualizado => {
        if (!actualizado) return;
        this.mantenimientosMaquina = this.mantenimientosMaquina.map(m =>
          m.id === actualizado.id ? actualizado : m
        );
        this.toastService.success('Evidencias guardadas', 'Fotos, videos y documentos adjuntos al mantenimiento.');
        this.modalEvidenciasMantOpen = false;
      });
    } catch {
      this.toastService.error('Error de subida', 'No se pudieron guardar las evidencias en S3.');
    }
  }

  guardarReporteFallo() {
    if (!this.maquinaSeleccionada) return;
    this.erroresFallo = { descripcion: '' };
    if (!this.nuevoIncidente.descripcion?.trim()) {
      this.erroresFallo.descripcion = 'Describa el fallo presentado por la máquina.';
      this.toastService.warning('Descripción Requerida', 'Escriba el fallo presentado por la máquina.');
      return;
    }

    const usuario = this.authService.getCurrentUser();
    const reportadoPor = usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Operador';
    const fotos = this.archivosFalloSubidos.filter(a => a.tipo === 'imagen').map(a => a.url);
    const videos = this.archivosFalloSubidos.filter(a => a.tipo === 'video').map(a => a.url);

    const registro: Omit<Incidente, 'id'> = {
      codigoIncidente: '',
      maquina: this.maquinaSeleccionada.nombre,
      agencia: this.maquinaSeleccionada.agencia,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
      tipo: this.nuevoIncidente.tipo,
      prioridad: this.nuevoIncidente.prioridad,
      estado: 'Pendiente',
      descripcion: this.nuevoIncidente.descripcion.trim(),
      reportadoPor,
      fotosFallo: fotos.length ? fotos : undefined,
      videosFallo: videos.length ? videos : undefined,
      archivosFallo: this.archivosFalloSubidos.length ? [...this.archivosFalloSubidos] : undefined
    };

    this.incidenteService.crearIncidente(registro).subscribe(creado => {
      this.incidentesMaquina = [creado, ...this.incidentesMaquina];
      this.toastService.success(
        'Reporte Creado',
        `Incidente ${creado.codigoIncidente} registrado con ${this.archivosFalloSubidos.length} evidencia(s).`
      );
      this.modalReportarOpen = false;
    });
  }

  guardarProgramacionMantenimiento() {
    if (!this.maquinaSeleccionada) return;
    this.erroresMant = { tecnico: '', duracionHoras: '', descripcion: '' };
    let valido = true;

    if (!this.nuevoMantenimiento.tecnicoId || !this.nuevoMantenimiento.tecnico?.trim()) {
      this.erroresMant.tecnico = 'Selecciona un coordinador de mantenimiento o técnico de maquinaria.';
      valido = false;
    }
    if (!this.nuevoMantenimiento.duracionHoras || this.nuevoMantenimiento.duracionHoras < 1) {
      this.erroresMant.duracionHoras = 'La duración debe ser al menos 1 hora.';
      valido = false;
    }
    if (!this.nuevoMantenimiento.descripcion?.trim()) {
      this.erroresMant.descripcion = 'Describa el alcance del trabajo.';
      valido = false;
    }

    if (!valido) {
      this.toastService.warning('Campos Requeridos', 'Complete los campos marcados en rojo.');
      return;
    }

    const fotos = this.multimediaMantSubida.filter(a => a.tipo === 'imagen').map(a => a.url);
    const videos = this.multimediaMantSubida.filter(a => a.tipo === 'video').map(a => a.url);

    const registro: Omit<Mantenimiento, 'id'> = {
      maquinariaId: this.maquinaSeleccionada.id,
      maquina: this.maquinaSeleccionada.nombre,
      tipo: this.nuevoMantenimiento.tipo,
      fecha: this.nuevoMantenimiento.fecha,
      tecnico: this.nuevoMantenimiento.tecnico.trim(),
      tecnicoId: this.nuevoMantenimiento.tecnicoId,
      estado: 'Programado',
      duracionMin: (this.nuevoMantenimiento.duracionHoras || 2) * 60,
      descripcion: this.nuevoMantenimiento.descripcion.trim(),
      agencia: this.maquinaSeleccionada.agencia,
      frecuenciaDias: Number(this.nuevoMantenimiento.frecuenciaDias || 0),
      fotos: fotos.length ? fotos : undefined,
      videos: videos.length ? videos : undefined,
      archivos: this.multimediaMantSubida.length ? [...this.multimediaMantSubida] : undefined,
      documentos: this.documentosMantSubidos.length ? [...this.documentosMantSubidos] : undefined
    };

    this.mantenimientoService.registrarMantenimiento(registro).subscribe(creado => {
      this.mantenimientosMaquina = [creado, ...this.mantenimientosMaquina];
      this.toastService.success(
        'Mantenimiento Agendado',
        `Visita de ${creado.maquina} el ${creado.fecha} · ${this.etiquetaFrecuencia(creado.frecuenciaDias)}.`
      );
      this.modalProgramarOpen = false;
    });
  }

  getResponsableEquipo(sucursal: string): string {
    return sucursal?.trim() || 'Sin asignar';
  }
}

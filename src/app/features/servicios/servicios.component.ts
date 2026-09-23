import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ServicioLavadoService } from '../../core/services/servicio-lavado.service';
import { AuthService } from '../../core/services/auth.service';
import { InventarioService } from '../../core/services/inventario.service';
import { StorageUploadService } from '../../core/services/storage-upload.service';
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
  RecetaInsumoServicio,
  Bahia,
  Sucursal
} from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { Role } from '../../core/models/roles.model';
import { CatalogoServiciosService } from '../../core/services/catalogo-servicios.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { ServiciosExtrasService } from '../../core/services/servicios-extras.service';
import { OperadorService } from '../../core/services/operador.service';
import { BahiaService } from '../../core/services/bahia.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { IncidenteService } from '../../core/services/incidente.service';
import { PermissionService } from '../../core/services/permission.service';
import { formatearPlaca, placasEquivalentes, validarPlaca } from '../../core/utils/placa.util';
import { resolverRangoFechas, soloFecha } from '../../core/utils/fecha-rango';

import { RouterModule } from '@angular/router';
import { VideoRecorderComponent } from '../../shared/components/video-recorder/video-recorder.component';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent, VideoRecorderComponent],
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
        <div class="flex flex-wrap items-center gap-2">
          @if (!isAprobador && !isPulidor) {
            <a
              routerLink="/configuracion/servicios"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs border border-slate-200">
              <i-lucide name="layout-list" class="w-4 h-4 text-easydry-blue"></i-lucide>
              <span class="hidden sm:inline">{{ isLiderOperador ? 'Catálogo de Servicios' : 'Catálogo & Crear Servicios' }}</span>
              <span class="sm:hidden">Catálogo</span>
            </a>
          }

          @if (puedeReportarFalla) {
            <button
              (click)="abrirModalReportarFalla()"
              class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs">
              <i-lucide name="alert-triangle" class="w-4 h-4"></i-lucide>
              <span class="hidden sm:inline">Reportar Falla / Avería</span>
              <span class="sm:hidden">Falla</span>
            </button>
          }

          @if (canCrearOT) {
            <button
              (click)="abrirModalNuevaOT()"
              class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
              <i-lucide name="plus" class="w-4 h-4"></i-lucide>
              <span class="hidden sm:inline">{{ (tabActiva === 'especiales' || isPulidor || isCoordServiciosEspeciales) ? 'Nueva OT (Especial)' : 'Nueva Hoja de Control (OT)' }}</span>
              <span class="sm:hidden">Nueva OT</span>
            </button>
          }
        </div>
      </div>

      <!-- Alerta de Suministros en Camino para Líder de Bahía -->
      @if (isLiderOperador && despachosPendientesLider.length > 0) {
        <div class="p-4 bg-indigo-50/95 border-2 border-indigo-300 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <i-lucide name="truck" class="w-4 h-4"></i-lucide>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-xs font-black text-indigo-950 uppercase tracking-wide">
                  ¡Suministros en Camino para tu Sede!
                </h3>
                <span class="px-2 py-0.2 rounded-full text-[10px] font-black bg-indigo-200 text-indigo-900 font-mono">
                  Guía: {{ despachosPendientesLider[0].numeroGuia }}
                </span>
                <span class="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                  {{ despachosPendientesLider.length }} despacho(s) en tránsito
                </span>
              </div>
              <p class="text-[11px] text-indigo-800 mt-0.5">
                Bodega Central ha enviado suministros para tus servicios. Revisa la carga y confirma o rechaza la recepción.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <a
              routerLink="/inventario"
              class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer">
              <i-lucide name="check-circle" class="w-3.5 h-3.5"></i-lucide>
              <span>Revisar y Confirmar en Inventario</span>
            </a>
          </div>
        </div>
      }

      <!-- Tab Navigation: Generales y Especiales -->
      <div class="flex flex-wrap gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
        
        <!-- Pestaña 1: Servicios Generales (visible para Admin, Super Admin y personal operativo general) -->
        @if ((!isPulidor && !isCoordServiciosEspeciales) || isSuperAdmin || isAdmin) {
          <button
            (click)="cambiarTab('generales')"
            [ngClass]="tabActiva === 'generales' ? 'bg-white text-easydry-blue shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900 font-semibold'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
            <i-lucide name="droplet" class="w-4 h-4 text-easydry-blue"></i-lucide>
            <span>Servicios Generales</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold ml-1">
              {{ countServiciosGenerales }}
            </span>
          </button>
        }

        <!-- Pestaña 2: Servicios Especiales (visible para Admin, Super Admin, pulidores y agencias con especiales) -->
        @if (tieneServiciosEspeciales || isPulidor || isCoordServiciosEspeciales || isSuperAdmin || isAdmin) {
          <button
            (click)="cambiarTab('especiales')"
            [ngClass]="tabActiva === 'especiales' ? 'bg-white text-amber-700 shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900 font-semibold'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
            <i-lucide name="star" class="w-4 h-4 text-amber-500 fill-amber-500/20"></i-lucide>
            <span>Servicios Especiales</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold ml-1">
              {{ countServiciosEspeciales }}
            </span>
          </button>
        }

      </div>


      <!-- Global Filter Bar (Contenedor Unificado de Filtros y Búsqueda) -->
      <app-filter-bar 
        [showSucursal]="!isOperador && tabActiva === 'generales'" 
        [showOperador]="!isOperador"
        [showBahia]="!isOperador && tabActiva === 'generales'"
        [showServicio]="true"
        [showRegion]="true"
        [showCliente]="true"
        [showEstado]="true"
        [showFechas]="false"
        [showBusqueda]="true"
        [placeholderBusqueda]="tabActiva === 'generales' ? 'Buscar placa (ej. PBX-8932) u Orden OT...' : 'Buscar placa u OT especial (ej. SE-SIE-0001)...'"
        [listaServicios]="listaServiciosFiltro"
        [listaEstados]="tabActiva === 'generales' ? ['Todos', 'En Proceso', 'Por Aprobar', 'Realizados / Aprobados', 'Rechazados'] : ['Todos', 'Pendiente', 'En Proceso', 'Pausado', 'Completado', 'Cancelado']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Services List / Table Container (Componente Compuesto Unificado) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden flex flex-col">
        
        <!-- Cabecera de la sección -->
        <div class="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-lg font-outfit">{{ tabActiva === 'generales' ? 'Servicios Generales' : 'Servicios Especiales (Zonal ' + userRegionNombre + ')' }}</h3>
          </div>
        </div>

        @if (tabActiva === 'generales') {
          <!-- Desktop Table View: Servicios Generales -->
          <div class="hidden lg:block overflow-x-auto flex-1">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th class="py-3.5 px-4">Nº OT</th>
                  <th class="py-3.5 px-4">Vehículo</th>
                  <th class="py-3.5 px-4">Categoría & Servicio</th>
                  <th class="py-3.5 px-4">Sucursal / Bahía</th>
                  <th class="py-3.5 px-4">Horarios</th>
                  <th class="py-3.5 px-4">Lavador</th>
                  <th class="py-3.5 px-4">Estado Workflow</th>
                  <th class="py-3.5 px-4 text-center">Evidencia Inicio</th>
                  <th class="py-3.5 px-4 text-center">Evidencia Fin</th>
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
                        class="px-2 py-0.5 rounded text-[10px] font-extrabold block w-fit mb-1 border bg-blue-100 text-blue-800 border-blue-300">
                        Servicios Generales
                      </span>
                      <span class="font-bold text-slate-900 text-xs">{{ item.servicio }}</span>
                    </td>

                    <td class="py-3.5 px-4 text-xs">
                      <p class="font-bold text-slate-800">{{ item.agencia }}</p>
                      <p class="text-[11px] text-easydry-blue font-semibold">{{ item.bahia || 'Sin bahía' }}</p>
                    </td>

                    <td class="py-3.5 px-4 text-xs font-mono">
                      <p class="text-slate-700 font-semibold">Ing: {{ item.horaIngreso || '08:30' }}</p>
                      <p class="text-slate-400">Sal: {{ item.horaSalida || '--:--' }}</p>
                      <span class="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono border"
                        [ngClass]="{
                          'bg-emerald-50 text-emerald-800 border-emerald-200': item.estado === 'FINALIZADO' || item.estado === 'APROBADO',
                          'bg-amber-50 text-amber-800 border-amber-200': item.estado === 'EN PROCESO',
                          'bg-slate-100 text-slate-600 border-slate-200': item.estado !== 'FINALIZADO' && item.estado !== 'APROBADO' && item.estado !== 'EN PROCESO'
                        }"
                        title="Duración total del servicio de lavado">
                        <i-lucide name="timer" class="w-3.5 h-3.5"></i-lucide>
                        <span>{{ item.duracionFormateada || calcularDuracion(item.horaIngreso || '', item.horaSalida || '') }}</span>
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

                    <!-- Evidencia Inicio (Servicios Generales) -->
                    <td class="py-3.5 px-4 text-center">
                      @if (getVideoInicial(item); as vidIni) {
                        <button 
                          (click)="verVideoGenerico(vidIni, 'Evidencia de Inicio — OT: ' + (item.ordenTrabajoOT || item.placa))"
                          title="Ver evidencia de inicio"
                          class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                          <i-lucide name="video" class="w-3.5 h-3.5 text-amber-600"></i-lucide>
                          <span>Inicio</span>
                        </button>
                      } @else {
                        <span class="text-xs text-slate-400 font-mono">-</span>
                      }
                    </td>

                    <!-- Evidencia Fin (Servicios Generales) -->
                    <td class="py-3.5 px-4 text-center">
                      @if (getVideoFinal(item); as vidFin) {
                        <button 
                          (click)="verVideoGenerico(vidFin, 'Evidencia Final / Entrega — OT: ' + (item.ordenTrabajoOT || item.placa))"
                          title="Ver evidencia final / entrega"
                          class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                          <i-lucide name="film" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                          <span>Fin</span>
                        </button>
                      } @else {
                        <span class="text-xs text-slate-400 font-mono" [title]="(item.estado === 'EN PROCESO' || item.estado === 'EN_PROCESO') ? 'Pendiente hasta finalizar el servicio' : 'Sin evidencia final'">-</span>
                      }
                    </td>

                    <td class="py-3.5 px-4 text-right">
                      <div class="flex items-center justify-end gap-1">
                        @if (canFinalizar(item)) {
                          <button
                            (click)="abrirModalFinalizarServicio(item)"
                            title="Finalizar servicio y adjuntar evidencia en vídeo"
                            class="px-2.5 py-1 bg-easydry-blue/10 hover:bg-easydry-blue text-easydry-blue hover:text-white rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold shadow-2xs">
                            <i-lucide name="check-circle" class="w-3.5 h-3.5"></i-lucide>
                            <span>Finalizar</span>
                          </button>
                        }

                        @if (item.estado === 'FINALIZADO' && canCrearOT) {
                          <button
                            (click)="abrirModalAgregarServicioAOT(item); $event.stopPropagation()"
                            title="Agregar otro servicio a esta misma OT"
                            class="px-2.5 py-1 bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white border border-violet-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold shadow-2xs">
                            <i-lucide name="plus-circle" class="w-3.5 h-3.5"></i-lucide>
                            <span>+ Servicio</span>
                          </button>
                        }

                        @if (item.estado === 'FINALIZADO' && canApprove) {
                          <button
                            (click)="aprobarServicio(item)"
                            title="Aprobar servicio"
                            class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                            <i-lucide name="check" class="w-4 h-4"></i-lucide>
                          </button>
                        }

                        @if (item.estado === 'APROBADO') {
                          <span class="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg flex items-center justify-center" title="Servicio Aprobado">
                            <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide>
                          </span>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="py-12 text-center text-slate-400 text-xs font-medium">
                      No hay servicios generales registrados para esta categoría o filtros aplicados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile / Tablet Card View: Generales -->
          <div class="block lg:hidden divide-y divide-slate-100 flex-1">
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
                  @if (item.estado === 'FINALIZADO' && canCrearOT) {
                    <button
                      (click)="abrirModalAgregarServicioAOT(item); $event.stopPropagation()"
                      title="Agregar otro servicio a esta misma OT"
                      class="mb-2 w-full px-2.5 py-1.5 bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white border border-violet-200 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs font-bold">
                      <i-lucide name="plus-circle" class="w-3.5 h-3.5"></i-lucide>
                      <span>+ Agregar servicio a esta OT</span>
                    </button>
                  }
                  <div class="flex items-center gap-1.5 text-slate-500">
                    <i-lucide name="clock" class="w-3.5 h-3.5"></i-lucide>
                    <span>{{ item.horaIngreso || '08:30' }}</span>
                    @if (item.duracionFormateada || calcularDuracion(item.horaIngreso || '', item.horaSalida || '')) {
                      <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold font-mono border"
                        [ngClass]="{
                          'bg-emerald-50 text-emerald-800 border-emerald-200': item.estado === 'FINALIZADO' || item.estado === 'APROBADO',
                          'bg-amber-50 text-amber-800 border-amber-200': item.estado === 'EN PROCESO',
                          'bg-slate-100 text-slate-600 border-slate-200': item.estado !== 'FINALIZADO' && item.estado !== 'APROBADO' && item.estado !== 'EN PROCESO'
                        }">
                        <i-lucide name="clock" class="w-3 h-3"></i-lucide>
                        <span>{{ item.duracionFormateada || calcularDuracion(item.horaIngreso || '', item.horaSalida || '') }}</span>
                      </span>
                    }
                  </div>
                  <div class="font-semibold text-slate-700">
                    {{ item.servicio }}
                  </div>
                </div>

                @if (getVideoInicial(item) || getVideoFinal(item)) {
                  <div class="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
                    @if (getVideoInicial(item); as vidIni) {
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); verVideoGenerico(vidIni, 'Evidencia de Inicio — OT: ' + (item.ordenTrabajoOT || item.placa))"
                        class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                        <i-lucide name="video" class="w-3 h-3 text-amber-600"></i-lucide>
                        <span>Evidencia Inicio</span>
                      </button>
                    }
                    @if (getVideoFinal(item); as vidFin) {
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); verVideoGenerico(vidFin, 'Evidencia Final — OT: ' + (item.ordenTrabajoOT || item.placa))"
                        class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                        <i-lucide name="film" class="w-3 h-3 text-emerald-600"></i-lucide>
                        <span>Evidencia Fin</span>
                      </button>
                    }
                  </div>
                }
              </div>
            } @empty {
              <div class="py-8 text-center text-slate-400 text-xs font-medium">
                No hay servicios registrados para esta categoría o filtros aplicados.
              </div>
            }
          </div>

          <!-- Paginación Generales -->
          <app-pagination 
            [totalItems]="serviciosFiltrados.length" 
            [currentPage]="currentPage" 
            [pageSize]="pageSize"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)">
          </app-pagination>
        } @else {
          <!-- Desktop Table View: Servicios Especiales -->
          <div class="hidden lg:block overflow-x-auto flex-1">
            <table class="w-full text-left text-sm">
              <thead class="bg-amber-50/70 text-amber-900 text-xs font-bold uppercase tracking-wider border-b border-amber-200">
                <tr>
                  <th class="py-3.5 px-4">Nº OT</th>
                  <th class="py-3.5 px-4">Vehículo & Placa</th>
                  <th class="py-3.5 px-4">Servicio Especial</th>
                  <th class="py-3.5 px-4">Agencia / Sucursal</th>
                  <th class="py-3.5 px-4">Región</th>
                  <th class="py-3.5 px-4">Pulidor Responsable</th>
                  <th class="py-3.5 px-4 text-center">T. Pausa</th>
                  <th class="py-3.5 px-4 text-center">T. Efectivo</th>
                  <th class="py-3.5 px-4 text-center">Evidencia Inicio</th>
                  <th class="py-3.5 px-4 text-center">Evidencias Pausas</th>
                  <th class="py-3.5 px-4 text-center">Evidencia Fin</th>
                  <th class="py-3.5 px-4">Estado</th>
                  <th class="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (extra of paginatedExtras; track extra.id) {
                  <tr class="hover:bg-amber-50/30 transition-colors">
                    <td class="py-3.5 px-4">
                      <span class="font-mono font-black text-xs text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg block w-fit border border-amber-300">
                        {{ extra.ordenTrabajoOT || extra.codigoSE }}
                      </span>
                      <span class="text-[10px] text-slate-400 font-mono mt-0.5 block">{{ extra.fechaProgramada }}</span>
                    </td>

                    <td class="py-3.5 px-4">
                      <div class="font-extrabold text-slate-900 text-xs">{{ extra.vehiculoInfo?.marca }} {{ extra.vehiculoInfo?.modelo }}</div>
                      <div class="text-xs font-mono font-black text-easydry-blue">{{ extra.vehiculoInfo?.placa || extra.placa }}</div>
                      <div class="text-[10px] text-slate-500 font-semibold">{{ extra.vehiculoInfo?.color }}</div>
                    </td>

                    <td class="py-3.5 px-4">
                      <span class="font-bold text-slate-900 text-xs block">{{ extra.servicioNombre }}</span>
                      @if (extra.insumosReceta && extra.insumosReceta.length > 0) {
                        <span class="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 inline-block font-medium">
                          {{ extra.insumosReceta.length }} insumo(s) químico(s)
                        </span>
                      }
                    </td>

                    <td class="py-3.5 px-4 text-xs font-bold text-slate-800">
                      <div class="flex items-center gap-1.5">
                        <i-lucide name="building-2" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i-lucide>
                        <span class="truncate">{{ extra.agenciaNombre || extra.agencia?.nombre || 'Sede Zonal' }}</span>
                      </div>
                    </td>

                    <td class="py-3.5 px-4 text-xs font-bold text-slate-700">
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-mono text-[11px]">
                        {{ extra.regionNombre || ('Zonal ' + userRegionNombre) }}
                      </span>
                    </td>

                    <td class="py-3.5 px-4 text-xs font-bold text-slate-800">
                      <div class="flex items-center gap-1.5">
                        <i-lucide name="user" class="w-3.5 h-3.5 text-amber-600"></i-lucide>
                        <span>{{ extra.operadorNombre }}</span>
                      </div>
                    </td>

                    <!-- Tiempo Total de Pausa -->
                    <td class="py-3.5 px-4 text-center">
                      @if (extra.tiempoPausaTotalSeg && extra.tiempoPausaTotalSeg > 0) {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-extrabold bg-amber-50 text-amber-900 border border-amber-200" title="Tiempo total acumulado de pausas">
                          <i-lucide name="pause-circle" class="w-3 h-3"></i-lucide>
                          <span>{{ extra.tiempoPausaFormateado || '0 min' }}</span>
                        </span>
                      } @else {
                        <span class="text-xs text-slate-400 font-mono">-</span>
                      }
                    </td>

                    <!-- Tiempo Efectivo Desarrollado -->
                    <td class="py-3.5 px-4 text-center">
                      @if (extra.tiempoEfectivoFormateado || (extra.tiempoEfectivoSeg && extra.tiempoEfectivoSeg > 0)) {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-extrabold bg-blue-50 text-blue-900 border border-blue-200" title="Tiempo neto de trabajo desarrollado">
                          <i-lucide name="timer" class="w-3 h-3"></i-lucide>
                          <span>{{ extra.tiempoEfectivoFormateado || '0 min' }}</span>
                        </span>
                      } @else {
                        <span class="text-xs text-slate-400 font-mono">-</span>
                      }
                    </td>

                    <!-- Evidencia Vídeo Inicial -->
                    <td class="py-3.5 px-4 text-center">
                      @if (extra.videoInicialUrl || extra.videoInicial) {
                        <button
                          (click)="verVideoGenerico(extra.videoInicialUrl || extra.videoInicial, 'Vídeo Inicial OT: ' + extra.codigoSE)"
                          class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                          <i-lucide name="video" class="w-3.5 h-3.5 text-amber-600"></i-lucide>
                          <span>Inicio</span>
                        </button>
                      } @else {
                        <span class="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                          Al Iniciar
                        </span>
                      }
                    </td>

                    <!-- Evidencias Vídeos de Pausas -->
                    <td class="py-3.5 px-4 text-center">
                      @if ((extra.historialPausas && extra.historialPausas.length > 0) || extra.videoUltimaPausaUrl || extra.videoPausa) {
                        <button
                          (click)="verEvidenciasPausas(extra)"
                          title="Ver evidencias de pausas y reanudaciones"
                          class="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                          <i-lucide name="pause-circle" class="w-3.5 h-3.5 text-orange-600"></i-lucide>
                          <span>Pausas {{ extra.historialPausas && extra.historialPausas.length > 0 ? '(' + extra.historialPausas.length + ')' : '' }}</span>
                        </button>
                      } @else {
                        <span class="text-xs text-slate-400 font-mono">-</span>
                      }
                    </td>

                    <!-- Evidencia Vídeo Final -->
                    <td class="py-3.5 px-4 text-center">
                      @if (extra.videoFinalUrl || extra.videoFinal) {
                        <button
                          (click)="verVideoGenerico(extra.videoFinalUrl || extra.videoFinal, 'Vídeo Final OT: ' + extra.codigoSE)"
                          class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                          <i-lucide name="film" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                          <span>Fin</span>
                        </button>
                      } @else {
                        <span class="text-xs text-slate-400 font-mono">-</span>
                      }
                    </td>

                    <!-- Estado Workflow -->
                    <td class="py-3.5 px-4">
                      <span 
                        class="px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5"
                        [ngClass]="estadoExtraClass(extra.estado)">
                        <span>{{ extra.estado }}</span>
                      </span>
                    </td>

                    <!-- Acciones -->
                    <td class="py-3.5 px-4 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        @if (extra.estado === 'Pendiente') {
                          @if (puedeRealizarOT(extra)) {
                            <button
                              (click)="abrirModalIniciarEspecial(extra)"
                              class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                              <i-lucide name="play" class="w-3 h-3"></i-lucide>
                              <span>Iniciar</span>
                            </button>
                          } @else {
                            <span class="text-[10px] text-slate-400 italic px-1.5 py-0.5 bg-slate-100 rounded">Asignado a otro</span>
                          }
                        }

                        @if (extra.estado === 'En Proceso') {
                          @if (puedeRealizarOT(extra)) {
                            <button
                              (click)="abrirModalPausarEspecial(extra)"
                              title="Pausar servicio con motivo y vídeo de pausa"
                              class="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-400 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                              <i-lucide name="pause" class="w-3.5 h-3.5"></i-lucide>
                              <span>Pausar</span>
                            </button>

                            <button
                              (click)="abrirModalFinalizarEspecial(extra)"
                              class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                              <i-lucide name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
                              <span>Finalizar</span>
                            </button>
                          } @else {
                            <span class="text-[10px] text-amber-700 font-semibold px-1.5 py-0.5 bg-amber-50 rounded">En proceso</span>
                          }
                        }

                        @if (extra.estado === 'Pausado') {
                          @if (puedeRealizarOT(extra)) {
                            <button
                              (click)="abrirModalReanudarEspecial(extra)"
                              title="Reanudar servicio con vídeo de reanudación"
                              class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                              <i-lucide name="play" class="w-3.5 h-3.5"></i-lucide>
                              <span>Reanudar</span>
                            </button>
                          } @else {
                            <span class="text-[10px] text-orange-700 font-semibold px-1.5 py-0.5 bg-orange-50 rounded">Pausado</span>
                          }
                        }

                        @if (extra.estado === 'Completado') {
                          <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs inline-flex items-center gap-1 border border-emerald-200">
                            <i-lucide name="check" class="w-3.5 h-3.5"></i-lucide>
                            <span>Listo</span>
                          </span>
                        }

                        <button
                          (click)="abrirDetalleEspecial(extra)"
                          title="Ver detalle del servicio"
                          class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                          <i-lucide name="info" class="w-4 h-4"></i-lucide>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="12" class="py-12 text-center text-slate-400 text-xs font-medium">
                      No hay servicios especiales asignados o registrados en la región {{ userRegionNombre }}.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile Card View: Servicios Especiales -->
          <div class="block lg:hidden divide-y divide-slate-100 flex-1">
            @for (extra of paginatedExtras; track extra.id) {
              <div class="p-4 hover:bg-amber-50/20 transition-colors">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <span class="font-mono font-black text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                      {{ extra.ordenTrabajoOT || extra.codigoSE }}
                    </span>
                    <div class="font-bold text-slate-900 text-sm mt-1.5">{{ extra.vehiculoInfo?.marca }} {{ extra.vehiculoInfo?.modelo }}</div>
                    <div class="text-[11px] font-mono font-black text-easydry-blue">{{ extra.vehiculoInfo?.placa || extra.placa }}</div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-center"
                    [ngClass]="estadoExtraClass(extra.estado)">
                    {{ extra.estado }}
                  </span>
                </div>

                <div class="text-xs font-semibold text-slate-700 mb-1">
                  {{ extra.servicioNombre }}
                </div>
                <div class="text-[11px] text-slate-600 flex items-center gap-1 mb-2">
                  <i-lucide name="building-2" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i-lucide>
                  <span>{{ extra.agenciaNombre || extra.agencia?.nombre || 'Sede Zonal' }}</span>
                </div>

                @if ((extra.tiempoPausaTotalSeg && extra.tiempoPausaTotalSeg > 0) || extra.tiempoEfectivoFormateado) {
                  <div class="flex flex-wrap items-center gap-1.5 mb-2 text-[10px] font-mono font-bold">
                    @if (extra.tiempoPausaTotalSeg && extra.tiempoPausaTotalSeg > 0) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md">
                        <i-lucide name="pause-circle" class="w-3 h-3"></i-lucide>
                        <span>Pausa: {{ extra.tiempoPausaFormateado }}</span>
                      </span>
                    }
                    @if (extra.tiempoEfectivoFormateado) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-md">
                        <i-lucide name="timer" class="w-3 h-3"></i-lucide>
                        <span>Neto: {{ extra.tiempoEfectivoFormateado }}</span>
                      </span>
                    }
                  </div>
                }

                <!-- Botones de Evidencia en Móvil -->
                <div class="flex flex-wrap items-center gap-2 mb-2.5">
                  @if (extra.videoInicialUrl || extra.videoInicial) {
                    <button
                      type="button"
                      (click)="verVideoGenerico(extra.videoInicialUrl || extra.videoInicial, 'Vídeo Inicial OT: ' + extra.codigoSE)"
                      class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                      <i-lucide name="video" class="w-3 h-3 text-amber-600"></i-lucide>
                      <span>Vídeo Inicio</span>
                    </button>
                  }
                  @if ((extra.historialPausas && extra.historialPausas.length > 0) || extra.videoUltimaPausaUrl || extra.videoPausa) {
                    <button
                      type="button"
                      (click)="verEvidenciasPausas(extra)"
                      class="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                      <i-lucide name="pause-circle" class="w-3 h-3 text-orange-600"></i-lucide>
                      <span>Pausas {{ extra.historialPausas && extra.historialPausas.length > 0 ? '(' + extra.historialPausas.length + ')' : '' }}</span>
                    </button>
                  }
                  @if (extra.videoFinalUrl || extra.videoFinal) {
                    <button
                      type="button"
                      (click)="verVideoGenerico(extra.videoFinalUrl || extra.videoFinal, 'Vídeo Final OT: ' + extra.codigoSE)"
                      class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs">
                      <i-lucide name="film" class="w-3 h-3 text-emerald-600"></i-lucide>
                      <span>Vídeo Fin</span>
                    </button>
                  }
                </div>

                <div class="flex items-center justify-between mt-3 text-xs gap-2 pt-2 border-t border-slate-100">
                  <div class="flex items-center gap-1 text-slate-500 truncate">
                    <i-lucide name="user" class="w-3.5 h-3.5 text-amber-600 shrink-0"></i-lucide>
                    <span class="truncate">{{ extra.operadorNombre }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    @if (extra.estado === 'Pendiente') {
                      @if (puedeRealizarOT(extra)) {
                        <button (click)="abrirModalIniciarEspecial(extra)" class="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold">Iniciar</button>
                      } @else {
                        <span class="text-[10px] text-slate-400 italic">Asignado</span>
                      }
                    }
                    @if (extra.estado === 'En Proceso') {
                      @if (puedeRealizarOT(extra)) {
                        <button (click)="abrirModalPausarEspecial(extra)" class="px-2 py-1 bg-amber-500/20 text-amber-900 border border-amber-400 rounded-lg text-xs font-bold">Pausar</button>
                        <button (click)="abrirModalFinalizarEspecial(extra)" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">Finalizar</button>
                      } @else {
                        <span class="text-[10px] text-amber-600">En proceso</span>
                      }
                    }
                    @if (extra.estado === 'Pausado') {
                      @if (puedeRealizarOT(extra)) {
                        <button (click)="abrirModalReanudarEspecial(extra)" class="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">Reanudar</button>
                      } @else {
                        <span class="text-[10px] text-orange-600">Pausado</span>
                      }
                    }
                    <button (click)="abrirDetalleEspecial(extra)" class="p-1 text-slate-500 hover:bg-slate-100 rounded-lg"><i-lucide name="info" class="w-4 h-4"></i-lucide></button>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="py-8 text-center text-slate-400 text-xs font-medium">
                No hay servicios especiales registrados.
              </div>
            }
          </div>

          <!-- Paginación Especiales -->
          <app-pagination 
            [totalItems]="extrasFiltrados.length" 
            [currentPage]="currentPageExtras" 
            [pageSize]="pageSizeExtras"
            (pageChange)="onPageChangeExtras($event)"
            (pageSizeChange)="onPageSizeChangeExtras($event)">
          </app-pagination>
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
                <span class="text-slate-500 mt-0.5">{{ servicioDetalleSeleccionado.bahia || 'Sin bahía' }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Horarios</span>
                <span class="font-bold text-slate-800 block">Ingreso: {{ servicioDetalleSeleccionado.horaIngreso || '08:30' }}</span>
                <span class="text-slate-500 mt-0.5">Salida: {{ servicioDetalleSeleccionado.horaSalida || '09:30' }}</span>
              </div>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
              <div>
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Lavador</span>
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
            <!-- Evidencias en Vídeo (Ingreso y Salida) -->
            @if (servicioDetalleSeleccionado.fotoIngresoUrl || servicioDetalleSeleccionado.fotoSalidaUrl || servicioDetalleSeleccionado.video || servicioDetalleSeleccionado.videoUrl) {
              <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <span class="text-[11px] text-slate-800 font-extrabold uppercase flex items-center gap-1.5">
                  <i-lucide name="film" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                  Evidencias en Vídeo Registradas
                </span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @if (servicioDetalleSeleccionado.fotoIngresoUrl || servicioDetalleSeleccionado.video || servicioDetalleSeleccionado.videoUrl) {
                    <button
                      type="button"
                      (click)="verVideoGenerico(servicioDetalleSeleccionado.fotoIngresoUrl || servicioDetalleSeleccionado.video || servicioDetalleSeleccionado.videoUrl, 'Vídeo de Ingreso: ' + servicioDetalleSeleccionado.placa)"
                      class="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 font-bold text-slate-800 text-xs transition-colors cursor-pointer shadow-2xs">
                      <div class="w-7 h-7 rounded-lg bg-easydry-blue/10 text-easydry-blue flex items-center justify-center">
                        <i-lucide name="play" class="w-3.5 h-3.5"></i-lucide>
                      </div>
                      <div class="text-left">
                        <p class="text-xs font-bold text-slate-900">Vídeo de Ingreso</p>
                        <p class="text-[10px] text-slate-400 font-normal">Recepción del auto</p>
                      </div>
                    </button>
                  }
                  @if (servicioDetalleSeleccionado.fotoSalidaUrl) {
                    <button
                      type="button"
                      (click)="verVideoGenerico(servicioDetalleSeleccionado.fotoSalidaUrl, 'Vídeo de Salida: ' + servicioDetalleSeleccionado.placa)"
                      class="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 font-bold text-slate-800 text-xs transition-colors cursor-pointer shadow-2xs">
                      <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <i-lucide name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
                      </div>
                      <div class="text-left">
                        <p class="text-xs font-bold text-slate-900">Vídeo de Salida</p>
                        <p class="text-[10px] text-slate-400 font-normal">Entrega y acabado</p>
                      </div>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <div modal-footer class="flex flex-col gap-2 w-full">
          @if (servicioDetalleSeleccionado) {
            @if (canFinalizar(servicioDetalleSeleccionado)) {
              <button
                (click)="modalDetalleOpen = false; abrirModalFinalizarServicio(servicioDetalleSeleccionado)"
                class="w-full px-4 py-2.5 bg-easydry-blue text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer">
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
        [title]="agregarServicioOTFuente ? 'Agregar Servicio — OT: ' + (agregarServicioOTFuente.ordenTrabajoOT || '') : 'Digitalización: HOJA DE CONTROL DE SERVICIO'" 
        icon="car"
        (close)="agregarServicioOTFuente = null; modalNuevoRegistroOpen = false">
        
        <form (ngSubmit)="guardarHojaServicio()" class="space-y-5">

          @if (agregarServicioOTFuente) {
            <div class="p-3 bg-violet-50 rounded-xl border border-violet-200 flex items-start gap-2.5">
              <i-lucide name="plus-circle" class="w-4 h-4 text-violet-600 mt-0.5 shrink-0"></i-lucide>
              <div>
                <p class="text-xs font-extrabold text-violet-900 uppercase tracking-wide">Agregando servicio a trabajo existente</p>
                <p class="text-[11px] text-violet-700 mt-0.5">
                  OT: <strong class="font-mono">{{ agregarServicioOTFuente.ordenTrabajoOT }}</strong>
                  &nbsp;&bull;&nbsp; Placa: <strong class="font-mono">{{ agregarServicioOTFuente.placa }}</strong>
                  &nbsp;&bull;&nbsp; {{ agregarServicioOTFuente.marca }} {{ agregarServicioOTFuente.modelo }}
                  &nbsp;&bull;&nbsp; Color: {{ agregarServicioOTFuente.color }}
                </p>
                <p class="text-[10px] text-violet-500 mt-1">Los datos del vehículo están bloqueados. Solo selecciona la bahía, el lavador y el nuevo servicio.</p>
              </div>
            </div>
          }
          
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-easydry-blue flex items-center justify-between">
            <span>REGISTRO DE ORDEN DE TRABAJO (OT)</span>
            <span class="font-mono">Fecha: {{ nuevoRegistro.fecha }}</span>
          </div>

          <!-- Asignación Operativa: Sucursal, Bahía y Operador (Trazabilidad) -->
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <i-lucide name="map-pin" class="w-4 h-4 text-easydry-blue"></i-lucide>
                Asignación de Sucursal, Bahía & Lavador
              </span>
              @if (isLiderOperador) {
                <span class="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold border border-teal-200">
                  Líder: {{ userSucursal }}
                </span>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <!-- Sucursal -->
              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Sucursal / Agencia</label>
                <select
                  [(ngModel)]="nuevoRegistro.agencia"
                  name="agenciaSelect"
                  (change)="onSucursalFormChange()"
                  [disabled]="isLiderOperador || (!isAdmin && !isSuperAdmin && !!userSucursal)"
                  class="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:bg-slate-100 disabled:opacity-80">
                  @for (suc of sucursales; track suc.id) {
                    <option [value]="suc.nombre">{{ suc.nombre }}</option>
                  }
                </select>
              </div>

              <!-- Bahía -->
              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Bahía de Atención *
                  @if (bahiaOcupadaActual) {
                    <span class="text-rose-600 font-extrabold text-[10px] ml-1">
                      (Ocupada por {{ bahiaOcupadaActual.placa }})
                    </span>
                  }
                </label>
                <select
                  [(ngModel)]="nuevoRegistro.bahiaId"
                  name="bahiaSelect"
                  (change)="onBahiaFormChange()"
                  [ngClass]="bahiaOcupadaActual ? 'border-rose-400 bg-rose-50/70 text-rose-900 font-bold' : 'border-slate-200 bg-white'"
                  class="w-full p-2 border rounded-xl text-xs font-semibold text-slate-800">
                  <option value="">Sin Bahía Específica</option>
                  @for (b of bahiasSucursalForm; track b.id) {
                    @let ocupante = getVehiculoOcupanteBahia(b.id, b.nombre);
                    <option [value]="b.id">
                      {{ b.nombre }} {{ ocupante ? '[En uso: ' + ocupante.placa + ' - ' + ocupante.ordenTrabajoOT + ']' : '[Disponible]' }}
                    </option>
                  }
                </select>
                @if (bahiaOcupadaActual) {
                  <p class="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1.5">
                    <i-lucide name="alert-triangle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    <span>La {{ nuevoRegistro.bahia || 'bahía seleccionada' }} ya tiene un vehículo en proceso ({{ bahiaOcupadaActual.placa }} - {{ bahiaOcupadaActual.ordenTrabajoOT }}). Selecciona una bahía disponible.</span>
                  </p>
                }
              </div>

              <!-- Operador Técnico (Trazabilidad) -->
              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Lavador
                  <span class="text-easydry-blue font-bold text-[10px]">(Trazabilidad)</span>
                </label>
                <select
                  [(ngModel)]="nuevoRegistro.empleado"
                  name="empleadoSelect"
                  class="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                  @for (op of operadoresSucursalForm; track op.id) {
                    <option [value]="op.nombre">{{ op.nombre }} ({{ op.bahia }})</option>
                  }
                  @if (operadoresSucursalForm.length === 0) {
                    <option [value]="nuevoRegistro.empleado">{{ nuevoRegistro.empleado }}</option>
                  }
                </select>
              </div>
            </div>
            <p class="text-[11px] text-slate-500">
              El servicio computará en la trazabilidad operativa y conteo de servicios del lavador seleccionado.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nº OT (Orden Trabajo) *</label>
              <input type="text" [(ngModel)]="nuevoRegistro.ordenTrabajoOT" name="ordenTrabajoOT" placeholder="OT-9840"
                [disabled]="!!agregarServicioOTFuente"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-easydry-blue focus:border-easydry-blue focus:ring-easydry-blue disabled:bg-violet-50 disabled:border-violet-200 disabled:text-violet-800 disabled:opacity-90" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Placa Vehículo *</label>
              <input
                type="text"
                [ngModel]="nuevoRegistro.placa"
                (ngModelChange)="agregarServicioOTFuente ? null : onPlacaChange($event)"
                name="placa"
                placeholder="PBX-1234"
                maxlength="8"
                autocomplete="off"
                [disabled]="!!agregarServicioOTFuente"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wide focus:border-easydry-blue focus:ring-easydry-blue disabled:bg-violet-50 disabled:border-violet-200 disabled:text-violet-800 disabled:opacity-90"
                [class.border-rose-400]="!agregarServicioOTFuente && placaTocada && !placaValida"
                [class.border-easydry-green]="!agregarServicioOTFuente && placaValida"
                required>
              @if (!agregarServicioOTFuente) {
                <p class="text-[10px] mt-1 font-semibold"
                  [class.text-easydry-green-dark]="placaValida"
                  [class.text-rose-600]="placaTocada && !placaValida"
                  [class.text-slate-400]="!placaTocada && !placaValida">
                  {{ placaMensaje }}
                </p>
              }
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Marca *</label>
              <input type="text" [(ngModel)]="nuevoRegistro.marca" name="marca" placeholder="Toyota"
                [disabled]="!!agregarServicioOTFuente"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue disabled:bg-violet-50 disabled:border-violet-200 disabled:text-violet-800 disabled:opacity-90" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Modelo *</label>
              <input type="text" [(ngModel)]="nuevoRegistro.modelo" name="modelo" placeholder="Corolla Cross"
                [disabled]="!!agregarServicioOTFuente"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue disabled:bg-violet-50 disabled:border-violet-200 disabled:text-violet-800 disabled:opacity-90" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Color *</label>
              <input type="text" [(ngModel)]="nuevoRegistro.color" name="color" placeholder="Blanco"
                [disabled]="!!agregarServicioOTFuente"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue disabled:bg-violet-50 disabled:border-violet-200 disabled:text-violet-800 disabled:opacity-90" required>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Ingreso *</label>
              <div class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>{{ nuevoRegistro.horaIngreso || '--:--' }}</span>
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Automática</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Salida Estimada *</label>
              <div class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>{{ nuevoRegistro.horaSalida || '--:--' }}</span>
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Automática</span>
              </div>
            </div>
          </div>

          <!-- Category and Specific Service -->
          <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Categoría de Servicio *</label>
            
            <div class="grid gap-2.5" [ngClass]="(!isPulidor && agenciaFormTieneEspeciales) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'">
              @if (!isPulidor) {
                <label 
                  class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold transition-all"
                  [ngClass]="nuevoRegistro.categoriaServicio === 'GENERAL' ? 'bg-easydry-blue text-white border-easydry-blue shadow-xs' : 'bg-white text-slate-700 hover:border-slate-300'">
                  <input type="radio" [(ngModel)]="nuevoRegistro.categoriaServicio" name="catRadio" value="GENERAL" (change)="onCategoriaChange()" class="hidden">
                  <span class="flex items-center gap-1.5"><i-lucide name="droplet" class="w-4 h-4"></i-lucide> Generales</span>
                </label>
              }

              @if (agenciaFormTieneEspeciales || isPulidor) {
                <label 
                  class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold transition-all"
                  [ngClass]="nuevoRegistro.categoriaServicio === 'ESPECIAL' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 hover:border-slate-300'">
                  <input type="radio" [(ngModel)]="nuevoRegistro.categoriaServicio" name="catRadio" value="ESPECIAL" (change)="onCategoriaChange()" class="hidden">
                  <span class="flex items-center gap-1.5"><i-lucide name="star" class="w-4 h-4"></i-lucide> Especiales</span>
                </label>
              }
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Servicio Específico *</label>
              <select [(ngModel)]="nuevoRegistro.servicio" name="servicio" (change)="onServicioSelect()" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
                @for (s of opcionesServicios; track s.id) {
                  <option [value]="s.nombre">{{ s.nombre }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Insumos y Recursos Utilizados (Descuento Automático de Stock) -->
          <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <i-lucide name="boxes" class="w-4 h-4 text-easydry-blue"></i-lucide>
                Insumos a Consumir en este Servicio
              </label>
              <span class="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                Descuento automático de: {{ nuevoRegistro.agencia }}
              </span>
            </div>
            <p class="text-[10px] text-slate-500">
              Cantidades fijas según la receta del servicio. Para cambiarlas, edita el servicio en Catálogo de Servicios.
            </p>

            @if (insumosConsumoForm.length === 0) {
              <p class="text-xs text-slate-400 italic">No hay insumos asignados a la receta de este servicio.</p>
            } @else {
              <div class="space-y-2">
                @for (ins of insumosConsumoForm; track ins.productoId; let idx = $index) {
                  @let stockDisp = getStockDisponible(ins.productoId, ins.productoSKU);
                  @let faltaStock = stockDisp < ins.cantidad;
                  <div 
                    class="p-2.5 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition-all"
                    [ngClass]="faltaStock ? 'bg-rose-50/90 border-2 border-rose-400 ring-2 ring-rose-400/20' : 'bg-white border-slate-200'">
                    <div class="overflow-hidden flex-1">
                      <div class="flex items-center gap-1.5">
                        @if (faltaStock) {
                          <i-lucide name="alert-triangle" class="w-3.5 h-3.5 text-rose-600 shrink-0"></i-lucide>
                        }
                        <p class="font-bold text-xs truncate" [ngClass]="faltaStock ? 'text-rose-950 font-extrabold' : 'text-slate-900'">{{ ins.productoNombre }}</p>
                      </div>
                      <div class="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap mt-0.5">
                        <span class="font-mono bg-slate-100 px-1 py-0.2 rounded">{{ ins.productoSKU }}</span>
                        <span>•</span>
                        <span [class.text-rose-700]="faltaStock" [class.font-extrabold]="faltaStock" [class.text-easydry-blue]="!faltaStock" class="font-semibold">
                          Stock en {{ nuevoRegistro.agencia }}: {{ stockDisp }} {{ ins.unidadMedida }}
                        </span>
                        @if (stockDisp <= 0) {
                          <span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider animate-pulse">¡Agotado en Agencia!</span>
                        } @else if (faltaStock) {
                          <span class="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[9px]">¡Stock Insuficiente (Faltan {{ (ins.cantidad - stockDisp).toFixed(1) }} {{ ins.unidadMedida }})!</span>
                        }
                      </div>
                    </div>

                    <div class="shrink-0 text-right">
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs"
                        [ngClass]="faltaStock ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'">
                        {{ ins.cantidad }} {{ ins.unidadMedida }}
                      </span>
                      <p class="text-[9px] font-semibold mt-0.5" [ngClass]="faltaStock ? 'text-rose-600 font-bold' : 'text-slate-400'">{{ faltaStock ? 'Sin existencias' : 'Receta fija' }}</p>
                    </div>
                  </div>
                }
              </div>
            }

            @if (tieneInsumosSinStock) {
              <div class="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs shadow-2xs">
                <i-lucide name="alert-triangle" class="w-4 h-4 text-rose-600 mt-0.5 shrink-0"></i-lucide>
                <div>
                  <p class="font-bold">No se puede iniciar el servicio: Stock Insuficiente</p>
                  <p class="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                    No hay existencias suficientes de uno o más suministros en esta agencia. Para realizar este servicio se requiere solicitar y recibir suministros desde Bodega Central.
                  </p>
                </div>
              </div>
            }
          </div>

          <!-- Video Proof Upload with Live Device Camera -->
          <app-video-recorder
            #videoIngresoRecorder
            label="Vídeo de Evidencia de Ingreso (Recepción)"
            description="Graba con la cámara del dispositivo las condiciones y detalles del vehículo al ingresar a la bahía."
            [evidenceType]="'VIDEO_INICIAL'"
            [category]="'SERVICIOS_GENERALES'"
            [agenciaId]="agenciaFormId || userSucursal"
            [servicioId]="nuevoRegistro.ordenTrabajoOT || nuevoRegistro.placa"
            [(videoUrl)]="nuevoRegistro.videoUrl"
            [required]="true">
          </app-video-recorder>

        </form>

        <div modal-footer class="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
          <button (click)="agregarServicioOTFuente = null; modalNuevoRegistroOpen = false" [disabled]="guardandoServicio" class="w-full sm:w-auto px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex justify-center disabled:opacity-50">Cancelar</button>
          <button 
            (click)="guardarHojaServicio()" 
            [disabled]="tieneInsumosSinStock || !!bahiaOcupadaActual || guardandoServicio"
            [class.opacity-50]="tieneInsumosSinStock || !!bahiaOcupadaActual || guardandoServicio"
            [class.cursor-not-allowed]="tieneInsumosSinStock || !!bahiaOcupadaActual || guardandoServicio"
            class="w-full sm:w-auto px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer">
            <i-lucide *ngIf="guardandoServicio" name="loader" class="w-4 h-4 animate-spin"></i-lucide>
            <span>{{ guardandoServicio ? 'Guardando...' : agregarServicioOTFuente ? '+ Agregar Servicio a OT' : 'Guardar e Iniciar Servicio' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Finalizar Servicio de Lavado General (Vídeo de Salida con Cámara) -->
      <app-modal
        [isOpen]="modalFinalizarServicioOpen"
        [title]="tituloModalFinalizar"
        icon="check-circle-2"
        (close)="cerrarModalFinalizarServicio()">

        @if (servicioAFinalizar) {
          <div class="space-y-4">
            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
              <p class="font-extrabold text-emerald-950">
                {{ servicioAFinalizar.marca }} {{ servicioAFinalizar.modelo }} — Placa: {{ servicioAFinalizar.placa }}
              </p>
              <p class="text-emerald-800">
                Servicio: <strong>{{ servicioAFinalizar.servicio }}</strong> • Bahía: <strong>{{ servicioAFinalizar.bahia }}</strong> • Operador: <strong>{{ servicioAFinalizar.empleado }}</strong>
              </p>
            </div>

            <!-- Grabador de Vídeo de Salida con Cámara del Dispositivo -->
            <app-video-recorder
              #videoSalidaRecorder
              label="Vídeo de Evidencia de Salida (Entrega del Vehículo)"
              description="Graba con la cámara del dispositivo el acabado y limpieza del vehículo antes de liberarlo."
              [evidenceType]="'VIDEO_FINAL'"
              [category]="'SERVICIOS_GENERALES'"
              [agenciaId]="servicioAFinalizar.agencia || userSucursal"
              [servicioId]="servicioAFinalizar.ordenTrabajoOT || servicioAFinalizar.placa || servicioAFinalizar.id"
              [(videoUrl)]="videoSalidaInput"
              [required]="true">
            </app-video-recorder>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones de Entrega (Opcional)</label>
              <input
                type="text"
                [(ngModel)]="observacionesSalidaInput"
                placeholder="Ej. Servicio concluido, aspirado y secado verificado..."
                class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
            </div>
          </div>
        }

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button (click)="cerrarModalFinalizarServicio()" [disabled]="finalizandoServicio" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarFinalizarServicio()"
            [disabled]="finalizandoServicio"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50">
            <i-lucide *ngIf="finalizandoServicio" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide *ngIf="!finalizandoServicio" name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ finalizandoServicio ? 'Finalizando...' : 'Confirmar y Finalizar Servicio' }}</span>
          </button>
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
              @if (servicioSeleccionado.videoUrl || servicioSeleccionado.video || servicioSeleccionado.fotoIngresoUrl || servicioSeleccionado.fotoSalidaUrl) {
                <video 
                  [src]="storageUploadService.resolveBackendUrl(servicioSeleccionado.videoUrl || servicioSeleccionado.video || servicioSeleccionado.fotoIngresoUrl || servicioSeleccionado.fotoSalidaUrl)" 
                  controls 
                  autoplay 
                  class="w-full h-full object-contain">
                </video>
              } @else {
                <p class="text-white/80 text-sm font-medium px-6 text-center">No hay vídeo de evidencia registrado para este servicio.</p>
              }
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

      <!-- Modal Iniciar Servicio Especial (Obligatorio Vídeo Inicial) -->
      <app-modal
        [isOpen]="modalIniciarServicioEspecialOpen"
        [title]="'Iniciar Servicio Especial: ' + (servicioEspecialSeleccionado?.codigoSE || '')"
        icon="play"
        (close)="modalIniciarServicioEspecialOpen = false">

        @if (servicioEspecialSeleccionado) {
          <div class="space-y-4">
            <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
              <p class="font-extrabold text-amber-950">
                {{ servicioEspecialSeleccionado.vehiculoInfo?.marca }} {{ servicioEspecialSeleccionado.vehiculoInfo?.modelo }} — Placa: {{ servicioEspecialSeleccionado.vehiculoInfo?.placa || servicioEspecialSeleccionado.placa }}
              </p>
              <p class="text-amber-800">
                Servicio: <strong>{{ servicioEspecialSeleccionado.servicioNombre }}</strong> • Región: <strong>{{ servicioEspecialSeleccionado.regionNombre || userRegionNombre }}</strong>
              </p>
            </div>

            <!-- Grabador de Vídeo Inicial con Cámara del Dispositivo -->
            <app-video-recorder
              #videoInicialRecorder
              label="Vídeo de Evidencia Inicial (Obligatorio para Iniciar)"
              description="Graba con la cámara del dispositivo el estado de recepción y pintura del vehículo antes de iniciar."
              [evidenceType]="'VIDEO_INICIAL'"
              [category]="'SERVICIOS_ESPECIALES'"
              [agenciaId]="servicioEspecialSeleccionado.agenciaId || userSucursal"
              [servicioId]="servicioEspecialSeleccionado.codigoSE || servicioEspecialSeleccionado.placa || servicioEspecialSeleccionado.id"
              [(videoUrl)]="videoInicialInput"
              [required]="true">
            </app-video-recorder>
          </div>
        }

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button (click)="modalIniciarServicioEspecialOpen = false" [disabled]="iniciandoEspecial" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarIniciarEspecial()"
            [disabled]="iniciandoEspecial || (!videoInicialInput && !videoInicialRecorder?.hasPendingUpload)"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <i-lucide *ngIf="iniciandoEspecial" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide *ngIf="!iniciandoEspecial" name="play" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ iniciandoEspecial ? 'Iniciando Trabajo...' : 'Iniciar Trabajo' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Finalizar Servicio Especial (Obligatorio Vídeo Final + Descuento Químicos) -->
      <app-modal
        [isOpen]="modalFinalizarServicioEspecialOpen"
        [title]="'Finalizar Servicio Especial: ' + (servicioEspecialSeleccionado?.codigoSE || '')"
        icon="check-circle"
        (close)="modalFinalizarServicioEspecialOpen = false">

        @if (servicioEspecialSeleccionado) {
          <div class="space-y-4">
            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
              <p class="font-extrabold text-emerald-950">
                {{ servicioEspecialSeleccionado.vehiculoInfo?.marca }} {{ servicioEspecialSeleccionado.vehiculoInfo?.modelo }} ({{ servicioEspecialSeleccionado.vehiculoInfo?.placa || servicioEspecialSeleccionado.placa }})
              </p>
              <p class="text-emerald-800">
                Servicio: <strong>{{ servicioEspecialSeleccionado.servicioNombre }}</strong> • Pulidor: <strong>{{ servicioEspecialSeleccionado.operadorNombre }}</strong>
              </p>
            </div>

            <!-- Insumos que se descontarán del Pulidor -->
            @if (servicioEspecialSeleccionado.insumosReceta && servicioEspecialSeleccionado.insumosReceta.length > 0) {
              <div class="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-1.5">
                <p class="font-bold text-blue-950 flex items-center gap-1.5">
                  <i-lucide name="boxes" class="w-4 h-4 text-blue-600"></i-lucide>
                  <span>Deducción de Insumos de tu Custodia:</span>
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  @for (ins of servicioEspecialSeleccionado.insumosReceta; track ins.productoId) {
                    <div class="p-2 bg-white rounded-lg border border-blue-100 flex items-center justify-between text-[11px]">
                      <span class="font-bold text-slate-800">{{ ins.productoNombre }}</span>
                      <span class="font-mono font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{{ ins.cantidadSugerida }} {{ ins.unidadMedida }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Grabador de Vídeo Final con Cámara del Dispositivo -->
            <app-video-recorder
              #videoFinalRecorder
              label="Vídeo de Evidencia Final / Entrega (Obligatorio)"
              description="Graba con la cámara del dispositivo el acabado de brillo, protección cerámica y corrección de pintura."
              [evidenceType]="'VIDEO_FINAL'"
              [category]="'SERVICIOS_ESPECIALES'"
              [agenciaId]="servicioEspecialSeleccionado.agenciaId || userSucursal"
              [servicioId]="servicioEspecialSeleccionado.codigoSE || servicioEspecialSeleccionado.placa || servicioEspecialSeleccionado.id"
              [(videoUrl)]="videoFinalInput"
              [required]="true">
            </app-video-recorder>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones / Notas</label>
              <input
                type="text"
                [(ngModel)]="notasFinalizacionInput"
                placeholder="Ej. Pulido de 3 pasos finalizado sin novedades..."
                class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
            </div>
          </div>
        }

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button (click)="modalFinalizarServicioEspecialOpen = false" [disabled]="finalizandoEspecial" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarFinalizarEspecial()"
            [disabled]="finalizandoEspecial"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer">
            <i-lucide *ngIf="finalizandoEspecial" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide *ngIf="!finalizandoEspecial" name="check-circle" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ finalizandoEspecial ? 'Finalizando...' : 'Finalizar y Descontar Químicos' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Pausar Servicio Especial (Motivo + Vídeo Obligatorio) -->
      <app-modal
        [isOpen]="modalPausarServicioEspecialOpen"
        [title]="'Pausar Servicio Especial: ' + (servicioEspecialSeleccionado?.codigoSE || '')"
        icon="pause"
        (close)="modalPausarServicioEspecialOpen = false">

        @if (servicioEspecialSeleccionado) {
          <div class="space-y-4">
            <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
              <p class="font-extrabold text-amber-950">
                {{ servicioEspecialSeleccionado.vehiculoInfo?.marca }} {{ servicioEspecialSeleccionado.vehiculoInfo?.modelo }} ({{ servicioEspecialSeleccionado.vehiculoInfo?.placa || servicioEspecialSeleccionado.placa }})
              </p>
              <p class="text-amber-800">
                Servicio: <strong>{{ servicioEspecialSeleccionado.servicioNombre }}</strong> • Pulidor: <strong>{{ servicioEspecialSeleccionado.operadorNombre }}</strong>
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo de la Pausa *</label>
              <select
                [(ngModel)]="motivoPausaInput"
                class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500">
                <option value="Pausa para almuerzo / descanso reglamentario">Pausa para almuerzo / descanso reglamentario</option>
                <option value="Esperando insumos o repuestos adicionados">Esperando insumos o repuestos adicionados</option>
                <option value="Condiciones climáticas / lluvia intensa">Condiciones climáticas / lluvia intensa</option>
                <option value="Vehículo retirado temporalmente por cliente / concesionario">Vehículo retirado temporalmente por cliente / concesionario</option>
                <option value="Mantenimiento o calibración de pulidora / pad">Mantenimiento o calibración de pulidora / pad</option>
                <option value="Otro motivo operativo">Otro motivo operativo</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Detalle o Justificación Adicional</label>
              <textarea
                [(ngModel)]="motivoPausaDetalleInput"
                rows="2"
                placeholder="Explica brevemente la razón de la pausa..."
                class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
              </textarea>
            </div>

            <!-- Grabador de Vídeo de Pausa con Cámara del Dispositivo -->
            <app-video-recorder
              #videoPausaRecorder
              label="Vídeo de Evidencia de Pausa (Obligatorio)"
              description="Graba con la cámara del dispositivo el estado actual en el que queda el vehículo al detener el proceso."
              [evidenceType]="'VIDEO_PAUSA'"
              [category]="'SERVICIOS_ESPECIALES'"
              [agenciaId]="servicioEspecialSeleccionado.agenciaId || userSucursal"
              [servicioId]="servicioEspecialSeleccionado.codigoSE || servicioEspecialSeleccionado.placa || servicioEspecialSeleccionado.id"
              [(videoUrl)]="videoPausaInput"
              [required]="true">
            </app-video-recorder>
          </div>
        }

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button (click)="modalPausarServicioEspecialOpen = false" [disabled]="pausandoEspecial" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarPausarEspecial()"
            [disabled]="pausandoEspecial"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer">
            <i-lucide *ngIf="pausandoEspecial" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide *ngIf="!pausandoEspecial" name="pause" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ pausandoEspecial ? 'Pausando...' : 'Pausar Servicio' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Reanudar Servicio Especial (Vídeo Obligatorio) -->
      <app-modal
        [isOpen]="modalReanudarEspecialOpen"
        [title]="'Reanudar Servicio Especial: ' + (servicioEspecialSeleccionado?.codigoSE || '')"
        icon="play"
        (close)="modalReanudarEspecialOpen = false">

        @if (servicioEspecialSeleccionado) {
          <div class="space-y-4">
            <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-1">
              <p class="font-extrabold text-blue-950">
                {{ servicioEspecialSeleccionado.vehiculoInfo?.marca }} {{ servicioEspecialSeleccionado.vehiculoInfo?.modelo }} ({{ servicioEspecialSeleccionado.vehiculoInfo?.placa || servicioEspecialSeleccionado.placa }})
              </p>
              <p class="text-blue-800">
                Servicio: <strong>{{ servicioEspecialSeleccionado.servicioNombre }}</strong> • Pulidor: <strong>{{ servicioEspecialSeleccionado.operadorNombre }}</strong>
              </p>
              @if (servicioEspecialSeleccionado.motivoUltimaPausa) {
                <p class="text-[11px] text-amber-800 font-bold mt-1 inline-flex items-center gap-1">
                  <i-lucide name="pause-circle" class="w-3.5 h-3.5"></i-lucide>
                  <span>Motivo de pausa: {{ servicioEspecialSeleccionado.motivoUltimaPausa }}</span>
                </p>
              }
            </div>

            <!-- Grabador de Vídeo de Reanudación con Cámara del Dispositivo -->
            <app-video-recorder
              #videoReanudarRecorder
              label="Vídeo de Evidencia al Reanudar (Obligatorio)"
              description="Graba con la cámara del dispositivo las condiciones del vehículo al retomar el servicio de pulido."
              [evidenceType]="'VIDEO_REANUDAR'"
              [category]="'SERVICIOS_ESPECIALES'"
              [agenciaId]="servicioEspecialSeleccionado.agenciaId || userSucursal"
              [servicioId]="servicioEspecialSeleccionado.codigoSE || servicioEspecialSeleccionado.placa || servicioEspecialSeleccionado.id"
              [(videoUrl)]="videoReanudarInput"
              [required]="true">
            </app-video-recorder>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones de Reanudación</label>
              <input
                type="text"
                [(ngModel)]="observacionesReanudarInput"
                placeholder="Ej. Se retoma pulido tras descanso..."
                class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
            </div>
          </div>
        }

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button (click)="modalReanudarEspecialOpen = false" [disabled]="reanudandoEspecial" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarReanudarEspecial()"
            [disabled]="reanudandoEspecial"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer">
            <i-lucide *ngIf="reanudandoEspecial" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide *ngIf="!reanudandoEspecial" name="play" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ reanudandoEspecial ? 'Reanudando...' : 'Reanudar Servicio' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Detalle Servicio Especial -->
      <app-modal
        [isOpen]="modalDetalleEspecialOpen"
        [title]="'Detalle Especial: ' + (servicioEspecialSeleccionado?.codigoSE || '')"
        icon="star"
        (close)="modalDetalleEspecialOpen = false">

        @if (servicioEspecialSeleccionado) {
          <div class="space-y-4 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Nº OT</span>
                <span class="font-mono font-black text-amber-800">{{ servicioEspecialSeleccionado.ordenTrabajoOT || servicioEspecialSeleccionado.codigoSE }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Región</span>
                <span class="font-bold text-slate-800">{{ servicioEspecialSeleccionado.regionNombre || userRegionNombre }}</span>
              </div>
            </div>

            <div class="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <span class="block text-[10px] text-amber-800 font-bold uppercase mb-0.5">Vehículo Asignado</span>
              <p class="font-extrabold text-slate-900 text-sm">
                {{ servicioEspecialSeleccionado.vehiculoInfo?.marca }} {{ servicioEspecialSeleccionado.vehiculoInfo?.modelo }}
              </p>
              <p class="font-mono font-black text-easydry-blue text-xs mt-0.5">
                Placa: {{ servicioEspecialSeleccionado.vehiculoInfo?.placa || servicioEspecialSeleccionado.placa }} • Color: {{ servicioEspecialSeleccionado.vehiculoInfo?.color }}
              </p>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Pulidor Responsable</span>
                <span class="font-bold text-slate-800">{{ servicioEspecialSeleccionado.operadorNombre }}</span>
              </div>
              <div class="text-right">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Estado</span>
                <span class="px-2.5 py-1 rounded-full text-xs font-black inline-block" [ngClass]="estadoExtraClass(servicioEspecialSeleccionado.estado)">
                  {{ servicioEspecialSeleccionado.estado }}
                </span>
              </div>
            </div>

            <!-- Tiempos de Pausa y Efectivo -->
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                <span class="block text-[10px] text-amber-800 font-bold uppercase mb-0.5">Tiempo Pausado</span>
                <span class="inline-flex items-center gap-1 font-mono font-black text-amber-900 text-xs">
                  <i-lucide name="pause-circle" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ servicioEspecialSeleccionado.tiempoPausaFormateado || '0 min' }}</span>
                </span>
                @if (servicioEspecialSeleccionado.motivoUltimaPausa) {
                  <p class="text-[10px] text-slate-500 mt-1 truncate" [title]="servicioEspecialSeleccionado.motivoUltimaPausa">
                    {{ servicioEspecialSeleccionado.motivoUltimaPausa }}
                  </p>
                }
              </div>
              <div class="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                <span class="block text-[10px] text-blue-800 font-bold uppercase mb-0.5">Tiempo Efectivo (Neto)</span>
                <span class="inline-flex items-center gap-1 font-mono font-black text-blue-900 text-xs">
                  <i-lucide name="timer" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ servicioEspecialSeleccionado.tiempoEfectivoFormateado || '0 min' }}</span>
                </span>
              </div>
            </div>

            <!-- Evidencias en Vídeo -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[10px] text-slate-400 font-bold uppercase mb-1">Vídeo Inicial</span>
                @if (servicioEspecialSeleccionado.videoInicialUrl || servicioEspecialSeleccionado.videoInicial) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoInicialUrl || servicioEspecialSeleccionado.videoInicial, 'Vídeo Inicial: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide name="play" class="w-3 h-3"></i-lucide>
                    <span>Inicial</span>
                  </button>
                } @else {
                  <span class="text-[10px] text-slate-400 italic text-center py-1">-</span>
                }
              </div>

              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[10px] text-slate-400 font-bold uppercase mb-1">Vídeo Pausa</span>
                @if (servicioEspecialSeleccionado.videoPausa || servicioEspecialSeleccionado.videoUltimaPausaUrl) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoPausa || servicioEspecialSeleccionado.videoUltimaPausaUrl, 'Vídeo de Pausa: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide name="pause" class="w-3 h-3"></i-lucide>
                    <span>Pausa</span>
                  </button>
                } @else {
                  <span class="text-[10px] text-slate-400 italic text-center py-1">-</span>
                }
              </div>

              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[10px] text-slate-400 font-bold uppercase mb-1">Vídeo Reanudar</span>
                @if (servicioEspecialSeleccionado.videoReanudacion || servicioEspecialSeleccionado.videoUltimaReanudacionUrl) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoReanudacion || servicioEspecialSeleccionado.videoUltimaReanudacionUrl, 'Vídeo Reanudación: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide name="play" class="w-3 h-3"></i-lucide>
                    <span>Reanudar</span>
                  </button>
                } @else {
                  <span class="text-[10px] text-slate-400 italic text-center py-1">-</span>
                }
              </div>

              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[10px] text-slate-400 font-bold uppercase mb-1">Vídeo Final</span>
                @if (servicioEspecialSeleccionado.videoFinalUrl || servicioEspecialSeleccionado.videoFinal) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoFinalUrl || servicioEspecialSeleccionado.videoFinal, 'Vídeo Final: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide name="play" class="w-3 h-3"></i-lucide>
                    <span>Final</span>
                  </button>
                } @else {
                  <span class="text-[10px] text-slate-400 italic text-center py-1">-</span>
                }
              </div>
            </div>
          </div>
        }

        <div modal-footer class="w-full">
          <button (click)="modalDetalleEspecialOpen = false" class="w-full px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cerrar</button>
        </div>
      </app-modal>

      <!-- Modal Reproductor de Vídeo Genérico -->
      <app-modal
        [isOpen]="modalVideoGenericoOpen"
        [title]="videoGenericoTitulo"
        icon="film"
        (close)="modalVideoGenericoOpen = false">

        <div class="space-y-3">
          <!-- Visor de Video Principal -->
          <div class="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center group">
            <video
              #modalVideoPlayer
              [src]="videoGenericoUrl"
              controls
              autoplay
              playsinline
              preload="auto"
              (loadedmetadata)="onVideoMetadataLoaded($event)"
              (progress)="onVideoProgress($event)"
              (timeupdate)="onVideoTimeUpdate($event)"
              (canplay)="onVideoCanPlay($event)"
              (waiting)="onVideoWaiting()"
              (playing)="onVideoPlaying()"
              class="w-full h-full object-contain">
            </video>

            <!-- Rueda de carga (Spinner) centrada sin texto -->
            @if (videoCargandoBuffer) {
              <div class="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none z-10 transition-all">
                <div class="w-10 h-10 border-4 border-easydry-green border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
          </div>
        </div>

        <div modal-footer class="w-full sm:w-auto">
          <button (click)="modalVideoGenericoOpen = false" class="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer transition-colors">Cerrar Reproductor</button>
        </div>
      </app-modal>

      <!-- Modal Historial de Evidencias de Pausas -->
      <app-modal
        [isOpen]="modalPausasDetalleOpen"
        [title]="'Evidencias de Pausas: ' + (servicioPausasSeleccionado?.codigoSE || '')"
        icon="pause-circle"
        (close)="modalPausasDetalleOpen = false">

        @if (servicioPausasSeleccionado) {
          <div class="space-y-4">
            <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
              <div>
                <p class="font-extrabold text-amber-950">
                  {{ servicioPausasSeleccionado.vehiculoInfo?.marca }} {{ servicioPausasSeleccionado.vehiculoInfo?.modelo }} — Placa: {{ servicioPausasSeleccionado.vehiculoInfo?.placa || servicioPausasSeleccionado.placa }}
                </p>
                <p class="text-amber-800">
                  Servicio: <strong>{{ servicioPausasSeleccionado.servicioNombre }}</strong> • Pulidor: <strong>{{ servicioPausasSeleccionado.operadorNombre }}</strong>
                </p>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-amber-800 font-bold uppercase block">Tiempo Pausado</span>
                <span class="inline-flex items-center gap-1 font-mono font-black text-amber-950 text-xs">
                  <i-lucide name="pause-circle" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ servicioPausasSeleccionado.tiempoPausaFormateado || '0 min' }}</span>
                </span>
              </div>
            </div>

            <div class="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              @for (p of pausasSeleccionadas; track p.id || $index; let idx = $index) {
                <div class="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                        #{{ idx + 1 }}
                      </span>
                      <div>
                        <span class="font-extrabold text-xs text-slate-900 block">{{ p.motivo || 'Pausa Operativa' }}</span>
                        @if (p.fechaInicio) {
                          <span class="text-[10px] text-slate-400 font-mono">{{ p.fechaInicio | date:'short' }}</span>
                        }
                      </div>
                    </div>
                    @if (p.duracionSegundos) {
                      <span class="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {{ p.duracionFormateada || (Math.round(p.duracionSegundos / 60) + ' min') }}
                      </span>
                    }
                  </div>

                  <div class="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                    @if (p.videoPausaUrl) {
                      <button
                        type="button"
                        (click)="verVideoGenerico(p.videoPausaUrl, 'Vídeo de Pausa #' + (idx + 1) + ' — OT: ' + (servicioPausasSeleccionado.codigoSE || ''))"
                        class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs cursor-pointer">
                        <i-lucide name="pause" class="w-3.5 h-3.5"></i-lucide>
                        <span>Vídeo de Pausa</span>
                      </button>
                    } @else {
                      <span class="text-[10px] text-slate-400 italic">Sin vídeo de pausa</span>
                    }

                    @if (p.videoReanudacionUrl) {
                      <button
                        type="button"
                        (click)="verVideoGenerico(p.videoReanudacionUrl, 'Vídeo de Reanudación #' + (idx + 1) + ' — OT: ' + (servicioPausasSeleccionado.codigoSE || ''))"
                        class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs cursor-pointer">
                        <i-lucide name="play" class="w-3.5 h-3.5"></i-lucide>
                        <span>Vídeo de Reanudación</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div modal-footer class="w-full">
          <button (click)="modalPausasDetalleOpen = false" class="w-full px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cerrar</button>
        </div>
      </app-modal>

      <!-- Modal Crear / Asignar Servicio Especial (Restringido a Región) -->
      <app-modal
        [isOpen]="showModalExtras"
        [title]="isCoordServiciosEspeciales ? 'Asignar Servicio Especial a Pulidor Móvil (Zonal ' + userRegionNombre + ')' : 'Registrar Nuevo Servicio Especial'"
        icon="star"
        (close)="cerrarModalExtras()">

        <form (ngSubmit)="guardarServicioExtra()" class="space-y-4">
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 flex items-center justify-between">
            <span>REGISTRO DE ORDEN DE TRABAJO (SERVICIO ESPECIAL)</span>
            <span class="font-mono">Fecha: {{ extraForm.fechaProgramada }}</span>
          </div>

          <!-- Asignación Operativa: Sucursal & Pulidor (Trazabilidad) -->
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <i-lucide name="map-pin" class="w-4 h-4 text-amber-600"></i-lucide>
                Asignación de Sucursal & Pulidor
              </span>
              @if (isPulidorFijo) {
                <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                  Fijo en Sede: {{ miAgenciaNombre }}
                </span>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Sucursal / Agencia -->
              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Sucursal / Agencia *</label>
                @if (isPulidorFijo) {
                  <div class="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span>{{ miAgenciaNombre || 'Agencia Asignada' }}</span>
                  </div>
                } @else {
                  <select
                    [(ngModel)]="extraFormAgenciaId"
                    name="agenciaIdExtra"
                    (change)="onSucursalExtraFormChange()"
                    class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                    required>
                    <option value="">Seleccione la agencia...</option>
                    @for (ag of agenciasDisponiblesParaEspecial; track ag.id) {
                      <option [value]="ag.id">{{ ag.nombre }} ({{ ag.regionNombre || ag.region?.nombre || userRegionNombre }})</option>
                    }
                  </select>
                }
              </div>

              <!-- Pulidor Asignado (Fijo bloqueado o Selección de Móvil) -->
              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Pulidor Asignado *
                  @if (pulidorFijoAgenciaSeleccionada) {
                    <span class="text-emerald-700 font-bold text-[10px]">(Fijo en Sede)</span>
                  } @else {
                    <span class="text-blue-700 font-bold text-[10px]">(Pulidor Móvil Requerido)</span>
                  }
                </label>

                @if (isPulidor) {
                  <div class="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>{{ extraForm.operadorNombre || 'Pulidor' }}</span>
                    <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold border border-blue-200">
                      Tú
                    </span>
                  </div>
                } @else if (pulidorFijoAgenciaSeleccionada) {
                  <!-- Si la agencia tiene pulidor fijo: se autorrellenan los campos y NO se puede editar -->
                  <div class="p-2.5 bg-slate-100 border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between shadow-xs">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200 flex items-center gap-1">
                        <i-lucide name="award" class="w-3 h-3 text-emerald-700"></i-lucide>
                        <span>Pulidor Fijo</span>
                      </span>
                      <span class="text-slate-900 font-bold">{{ pulidorFijoAgenciaSeleccionada.name }} {{ pulidorFijoAgenciaSeleccionada.lastname }}</span>
                    </div>
                    <i-lucide name="lock" class="w-3.5 h-3.5 text-slate-400"></i-lucide>
                  </div>
                  <p class="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <i-lucide name="lock" class="w-3 h-3 text-slate-400 shrink-0"></i-lucide>
                    <span>Esta agencia cuenta con pulidor fijo asignado permanentemente.</span>
                  </p>
                } @else {
                  <!-- Si NO tiene pulidor fijo: se salta la lista de pulidores móviles -->
                  <select
                    [(ngModel)]="extraForm.operadorId"
                    name="operadorIdExtra"
                    (change)="onOperadorExtraChange()"
                    class="w-full p-2.5 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs"
                    required>
                    <option value="">Seleccione el pulidor móvil que acudirá...</option>
                    @for (p of pulidoresMovilesDisponibles; track p.id) {
                      <option [value]="p.id">{{ p.name }} {{ p.lastname }} (Pulidor Móvil Zonal)</option>
                    }
                  </select>
                  <p class="text-[10px] text-blue-700 font-semibold mt-1 flex items-center gap-1">
                    <i-lucide name="car" class="w-3 h-3 text-blue-600 shrink-0"></i-lucide>
                    <span>Esta agencia no tiene pulidor fijo. Selecciona el pulidor móvil que viajará a atender la orden.</span>
                  </p>
                }
              </div>
            </div>
            <p class="text-[11px] text-slate-500">
              El servicio especial computará en la trazabilidad operativa y kit en custodia del pulidor asignado.
            </p>
          </div>

          <!-- Identificación del Servicio: OT y Placa -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nº OT (Orden Trabajo) *</label>
              <input
                type="text"
                [(ngModel)]="extraFormOT"
                name="extraOT"
                placeholder="OT-9840"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-800 focus:border-amber-500 focus:ring-amber-500"
                required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Placa Vehículo *</label>
              <input
                type="text"
                [(ngModel)]="extraFormPlaca"
                name="extraPlaca"
                placeholder="PBX-1234"
                maxlength="8"
                autocomplete="off"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wide focus:border-amber-500 focus:ring-amber-500"
                required>
            </div>
          </div>

          <!-- Datos del Vehículo -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Marca *</label>
              <input type="text" [(ngModel)]="extraFormMarca" name="extraMarca" placeholder="Toyota" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-amber-500" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Modelo *</label>
              <input type="text" [(ngModel)]="extraFormModelo" name="extraModelo" placeholder="Fortuner" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-amber-500" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Color *</label>
              <input type="text" [(ngModel)]="extraFormColor" name="extraColor" placeholder="Negro" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-amber-500" required>
            </div>
          </div>

          <!-- Horas de Ingreso y Salida Estimada -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Ingreso *</label>
              <div class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>{{ extraFormHoraIngreso || '--:--' }}</span>
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Automática</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Salida Estimada *</label>
              <div class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>{{ extraFormHoraSalida || '--:--' }}</span>
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Estimada Catálogo</span>
              </div>
            </div>
          </div>

          <!-- Selección del Servicio Especial -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Servicio Especial *</label>
            @if (serviciosEspecialesOpciones.length > 0) {
              <select
                [(ngModel)]="extraForm.servicioNombre"
                name="servicioNombreExtra"
                (ngModelChange)="onServicioEspecialFormChange($event)"
                class="w-full p-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                required>
                <option value="">Seleccione un servicio...</option>
                @for (s of serviciosEspecialesOpciones; track s.id) {
                  <option [value]="s.nombre">{{ s.nombre }} ({{ s.tiempoEstimadoMin || 60 }} min)</option>
                }
              </select>
            } @else {
              <input
                type="text"
                [(ngModel)]="extraForm.servicioNombre"
                name="servicioNombreExtra"
                placeholder="Ej. Pulido y Corrección de Pintura en 3 Pasos"
                class="w-full p-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                required>
            }
          </div>

          <!-- Insumos Requeridos por el Servicio Especial -->
          @if (extraForm.insumosReceta && extraForm.insumosReceta.length > 0) {
            <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <i-lucide name="boxes" class="w-4 h-4 text-amber-600"></i-lucide>
                  Insumos Requeridos (Receta del Servicio)
                </label>
                @if (extraForm.operadorId) {
                  <span class="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full" [ngClass]="pulidorSeleccionadoActual?.esMovil ? 'bg-blue-500' : 'bg-emerald-500'"></span>
                    Kit de: <b class="text-slate-800">{{ extraForm.operadorNombre || 'Pulidor asignado' }}</b>
                    <span class="text-[9px] text-slate-400">({{ pulidorSeleccionadoActual?.esMovil ? 'Móvil' : 'Fijo' }})</span>
                  </span>
                } @else {
                  <span class="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Sin pulidor seleccionado
                  </span>
                }
              </div>
              <p class="text-[10px] text-slate-500">
                Cantidades fijas según la receta del servicio especial. Se verifica el kit del pulidor asignado (móvil o fijo) en tiempo real.
              </p>

              @if (validandoStockPulidorOT) {
                <div class="p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-900 flex items-center gap-2 animate-pulse">
                  <i-lucide name="loader" class="w-4 h-4 animate-spin text-blue-600 shrink-0"></i-lucide>
                  <span>Verificando inventario en custodia del pulidor {{ extraForm.operadorNombre ? '(' + extraForm.operadorNombre + ')' : '' }}...</span>
                </div>
              }

              <div class="space-y-2">
                @for (ins of extraForm.insumosReceta; track ins.productoId; let idx = $index) {
                  @if (!extraForm.operadorId) {
                    <!-- Sin pulidor: muestra receta fija indicando asignación pendiente -->
                    <div class="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs">
                      <div class="overflow-hidden flex-1">
                        <p class="font-bold text-xs text-slate-900 truncate">{{ ins.productoNombre || ins.insumoNombre }}</p>
                        <div class="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap mt-0.5">
                          <span class="font-mono bg-slate-100 px-1 py-0.2 rounded">{{ ins.productoSKU || ins.codigoSKU || '—' }}</span>
                          <span>•</span>
                          <span class="italic text-amber-700">Seleccione un pulidor para validar existencias</span>
                        </div>
                      </div>
                      <div class="shrink-0 text-right">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200">
                          {{ ins.cantidadSugerida || ins.cantidad || 0 }} {{ ins.unidadMedida || '' }}
                        </span>
                        <p class="text-[9px] font-semibold text-slate-400 mt-0.5">Receta requerida</p>
                      </div>
                    </div>
                  } @else {
                    <!-- Pulidor seleccionado: muestra stock en kit vs necesario con validación en tiempo real -->
                    <div
                      class="p-2.5 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition-all"
                      [ngClass]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0) ? 'bg-rose-50/90 border-2 border-rose-400 ring-2 ring-rose-400/20' : 'bg-white border-slate-200'">
                      <div class="overflow-hidden flex-1">
                        <div class="flex items-center gap-1.5">
                          @if (getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0)) {
                            <i-lucide name="alert-triangle" class="w-3.5 h-3.5 text-rose-600 shrink-0"></i-lucide>
                          } @else {
                            <i-lucide name="check-circle" class="w-3.5 h-3.5 text-emerald-500 shrink-0"></i-lucide>
                          }
                          <p class="font-bold text-xs truncate"
                            [ngClass]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0) ? 'text-rose-950 font-extrabold' : 'text-slate-900'">
                            {{ ins.productoNombre || ins.insumoNombre }}
                          </p>
                        </div>
                        <div class="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap mt-0.5">
                          <span class="font-mono bg-slate-100 px-1 py-0.2 rounded">{{ ins.productoSKU || ins.codigoSKU || '—' }}</span>
                          <span>•</span>
                          <span class="font-semibold"
                            [class.text-rose-700]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0)"
                            [class.font-extrabold]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0)"
                            [class.text-emerald-700]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) >= (ins.cantidadSugerida || ins.cantidad || 0)">
                            Kit del pulidor: {{ getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) }} {{ ins.unidadMedida || '' }}
                          </span>
                          @if (getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) <= 0) {
                            <span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider animate-pulse">¡Agotado!</span>
                          } @else if (getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0)) {
                            <span class="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[9px]">
                              ¡Insuficiente!
                            </span>
                          }
                        </div>
                      </div>
                      <div class="shrink-0 text-right">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs"
                          [ngClass]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0) ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'">
                          {{ ins.cantidadSugerida || ins.cantidad || 0 }} {{ ins.unidadMedida || '' }}
                        </span>
                        <p class="text-[9px] font-semibold mt-0.5"
                          [ngClass]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0) ? 'text-rose-600 font-bold' : 'text-slate-400'">
                          {{ getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0) ? 'Insuficiente' : 'Verificado' }}
                        </p>
                      </div>
                    </div>
                  }
                }
              </div>

              @if (faltantesInsumosOT.length > 0 && extraForm.operadorId) {
                <div class="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs shadow-2xs">
                  <i-lucide name="alert-triangle" class="w-4 h-4 text-rose-600 mt-0.5 shrink-0"></i-lucide>
                  <div>
                    <p class="font-bold">No se puede crear la OT: insumos insuficientes en el kit del pulidor</p>
                    <p class="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      El pulidor asignado ({{ extraForm.operadorNombre || 'pulidor' }}) no cuenta con todos los insumos requeridos. Solicite un despacho y asegúrese de que el pulidor lo confirme antes de asignarle esta OT.
                    </p>
                  </div>
                </div>
              }
              @if (!validandoStockPulidorOT && faltantesInsumosOT.length === 0 && extraForm.insumosReceta.length > 0 && extraForm.operadorId) {
                <div class="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                  <i-lucide name="check-circle" class="w-4 h-4 text-emerald-600"></i-lucide>
                  <span>Kit del pulidor verificado y suficiente para ejecutar este servicio.</span>
                </div>
              }
            </div>
          } @else if (extraForm.servicioNombre && !validandoStockPulidorOT) {
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
              <i-lucide name="info" class="w-4 h-4 text-slate-400 shrink-0"></i-lucide>
              <span>Este servicio no tiene una receta de insumos configurada en el catálogo.</span>
            </div>
          }

          @if (isSuperAdmin || isAdmin) {
            <div class="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-xs text-indigo-900 font-semibold flex items-center gap-2">
              <i-lucide name="shield-check" class="w-4 h-4 text-indigo-600 shrink-0"></i-lucide>
              <span>Acceso Administrativo Global: Creación directa con asignación de sucursal, bahía y pulidor.</span>
            </div>
          }

          @if (!isSuperAdmin && !isAdmin && !isCoordServiciosEspeciales) {
            <!-- Vídeo de Evidencia de Ingreso (Solo si es pulidor registrando directamente) -->
            <app-video-recorder
              #videoIngresoExtraRecorder
              label="Vídeo de Evidencia de Ingreso (Recepción)"
              description="Graba con la cámara del dispositivo las condiciones y detalles del vehículo al ingresar."
              [evidenceType]="'VIDEO_INICIAL'"
              [category]="'SERVICIOS_ESPECIALES'"
              [agenciaId]="extraFormAgenciaId || userSucursal"
              [servicioId]="extraFormOT || extraFormPlaca"
              [(videoUrl)]="extraFormVideoUrl"
              [required]="false">
            </app-video-recorder>
          } @else {
            <div class="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
              <i-lucide name="film" class="w-4 h-4 text-amber-600 shrink-0"></i-lucide>
              <div class="space-y-0.5">
                <p class="font-bold">Evidencia de Vídeo Inicial diferida al Pulidor</p>
                <p class="text-[11px] text-amber-800/90">El pulidor asignado grabará obligatoriamente el vídeo de recepción con la cámara de su dispositivo al momento de iniciar el trabajo en la bahía o sede.</p>
              </div>
            </div>
          }

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones / Instrucciones</label>
            <textarea
              [(ngModel)]="extraForm.notas"
              name="notasExtra"
              placeholder="Instrucciones para el pulidor..."
              rows="2"
              class="w-full p-2.5 border rounded-xl text-xs">
            </textarea>
          </div>
        </form>

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button (click)="cerrarModalExtras()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button
            (click)="guardarServicioExtra()"
            [disabled]="!puedeCrearOTEspecialConInsumos"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ isCoordServiciosEspeciales ? 'Crear y Asignar OT a Pulidor' : 'Crear y Notificar Servicio' }}</span>
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
    if (this.isPulidor && !this.isSuperAdmin && !this.isAdmin && tab === 'generales') {
      tab = 'especiales';
    }
    this.tabActiva = tab;
    this.currentPage = 1;
    this.currentPageExtras = 1;
    this.recalcularServiciosFiltrados();
  }

  abrirModalNuevaOT() {
    if (this.isAprobador) {
      this.toastService.warning('Acceso Restringido', 'El rol Aprobador no tiene permisos para crear órdenes de trabajo.');
      return;
    }
    // Pulidores solo crean OT especiales
    if (this.isPulidor || this.tabActiva === 'especiales' || this.isCoordServiciosEspeciales) {
      this.abrirModalNuevoExtra();
      return;
    }
    this.agregarServicioOTFuente = null;
    this.nuevoRegistro.categoriaServicio = 'GENERAL';
    const user = this.authService.getCurrentUser();
    if (user) {
      const nombreCompleto = `${user.nombre} ${user.apellido}`.trim();
      this.nuevoRegistro.empleado = nombreCompleto;
      if (user.sucursalNombre) this.nuevoRegistro.agencia = user.sucursalNombre;
      if (user.bahiaNombre) this.nuevoRegistro.bahia = user.bahiaNombre;
    }
    if (!this.nuevoRegistro.agencia && this.sucursales.length > 0) {
      this.nuevoRegistro.agencia = this.sucursales[0].nombre;
    }
    const randNum = Math.floor(1000 + Math.random() * 9000);
    this.nuevoRegistro.ordenTrabajoOT = `OT-${randNum}`;
    this.nuevoRegistro.numeroOrden = `ORD-${new Date().getFullYear()}-${randNum}`;
    this.nuevoRegistro.placa = '';
    this.nuevoRegistro.marca = '';
    this.nuevoRegistro.modelo = '';
    this.nuevoRegistro.color = '';
    this.nuevoRegistro.foto = '';
    this.nuevoRegistro.videoUrl = '';
    this.nuevoRegistro.bahiaId = '';
    this.nuevoRegistro.fecha = new Date().toISOString().substring(0, 10);
    this.asignarHorasAutomaticasOT();
    this.placaTocada = false;
    this.videoFileSelected = false;
    this.videoFileName = '';
    this.inventarioService.cargarItems();
    this.onSucursalFormChange();
    if (!this.agenciaFormTieneEspeciales) {
      this.nuevoRegistro.categoriaServicio = 'GENERAL';
    }
    this.onCategoriaChange();
    this.modalNuevoRegistroOpen = true;
  }

  /**
   * Abre el modal de nueva OT en modo "agregar servicio a OT existente".
   * Pre-rellena los datos del vehículo y bloquea los campos de identidad del
   * vehículo, permitiendo solo elegir bahía, lavador y servicio nuevo.
   */
  abrirModalAgregarServicioAOT(item: VehiculoServicio): void {
    if (item.estado !== 'FINALIZADO') return;
    if (this.isAprobador) {
      this.toastService.warning('Acceso Restringido', 'El rol Aprobador no puede agregar servicios.');
      return;
    }

    this.agregarServicioOTFuente = item;

    // Misma inicialización base que abrirModalNuevaOT pero manteniendo los datos del vehículo
    const user = this.authService.getCurrentUser();
    if (user) {
      const nombreCompleto = `${user.nombre} ${user.apellido}`.trim();
      this.nuevoRegistro.empleado = nombreCompleto;
    }

    // Preservar datos del vehículo original
    this.nuevoRegistro.ordenTrabajoOT = item.ordenTrabajoOT || '';
    this.nuevoRegistro.placa = item.placa || '';
    this.nuevoRegistro.marca = item.marca || '';
    this.nuevoRegistro.modelo = item.modelo || '';
    this.nuevoRegistro.color = item.color || '';
    this.nuevoRegistro.agencia = item.agencia || '';
    this.nuevoRegistro.foto = '';
    this.nuevoRegistro.videoUrl = '';
    this.nuevoRegistro.bahiaId = item.bahiaId ? String(item.bahiaId) : '';
    this.nuevoRegistro.fecha = new Date().toISOString().substring(0, 10);
    this.nuevoRegistro.categoriaServicio = 'GENERAL';

    this.asignarHorasAutomaticasOT();
    this.placaTocada = false;
    this.videoFileSelected = false;
    this.videoFileName = '';
    this.inventarioService.cargarItems();
    this.onSucursalFormChange();
    this.onCategoriaChange();
    this.modalNuevoRegistroOpen = true;
  }

  get countServiciosGenerales(): number {
    return this.servicios.filter(s => s.categoriaServicio === 'Servicios Generales' || s.categoriaServicio === 'GENERAL' || !s.categoriaServicio).length;
  }

  get countServiciosEspeciales(): number {
    return this.serviciosExtras.length || this.servicios.filter(s => s.categoriaServicio === 'Servicios Especiales' || s.categoriaServicio === 'ESPECIAL' || s.categoriaServicio === 'EXTRA' || s.categoriaServicio === 'Servicios Extras').length;
  }

  /** En el modal OT: Especiales solo si la agencia de la OT los tiene habilitados. */
  /** Devuelve el UUID de la agencia seleccionada en el form de nueva OT para usar como agenciaId en S3. */
  get agenciaFormId(): string {
    const key = String(this.nuevoRegistro?.agencia || '').trim();
    if (!key) return this.authService.getCurrentUser()?.agenciaId ? String(this.authService.getCurrentUser()!.agenciaId) : '';
    const suc = this.sucursales.find(s => String(s.id) === key || s.nombre === key || s.nombre?.toLowerCase() === key.toLowerCase());
    return suc ? String(suc.id) : key;
  }

  get agenciaFormTieneEspeciales(): boolean {
    const key = String(this.nuevoRegistro?.agencia || '').trim();
    if (!key) return false;
    const suc = this.sucursales.find(
      (s) => String(s.id) === key || s.nombre === key || s.nombre?.toLowerCase() === key.toLowerCase(),
    );
    if (!suc) {
      return this.sucursalService.hasServiciosEspecialesActivos(key, key);
    }
    if ((suc as any).tieneServiciosEspeciales === true) return true;
    if ((suc as any).tieneServiciosEspeciales === false) return false;

    const espIds = new Set(
      (this.catalogoCompleto || [])
        .filter((c) => c.categoria === 'ESPECIAL' || c.categoria === 'EXTRA')
        .map((c) => c.id),
    );
    return Boolean(suc.servicioIds?.some((id: number) => espIds.has(id)));
  }

  servicios: VehiculoServicio[] = [];
  serviciosFiltrados: VehiculoServicio[] = [];
  servicioSeleccionado?: VehiculoServicio;

  filtroTexto = '';
  filtroCategoria = 'Todas';
  
  // Guardamos el estado global
  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  // Lista de servicios disponibles para el filtro (cargados dinámicamente desde backend)
  listaServiciosFiltro: string[] = [];

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

  onToolbarSearchChange(valor: string) {
    this.filtroTexto = valor;
    this.filtrosGlobales.busqueda = valor;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    this.currentPage = 1;
    this.currentPageExtras = 1;
    this.recalcularServiciosFiltrados();
  }

  currentPage = 1;
  pageSize = 5;

  modalNuevoRegistroOpen = false;
  modalVideoOpen = false;
  modalReportarFallaOpen = false;
  maquinasReporte: Maquinaria[] = [];
  maquinaSeleccionadaId: number | string = 0;
  archivosFalloSubidos: ArchivoAdjunto[] = [];
  tieneServiciosEspeciales: boolean = false;
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
    numeroOrden: '',
    ordenTrabajoOT: '',
    placa: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    color: '',
    categoriaServicio: 'GENERAL',
    servicio: '',
    servicioId: 0,
    categoria: 'Sedán',
    agencia: '',
    bahia: '',
    bahiaId: '',
    empleado: '',
    fecha: new Date().toISOString().substring(0, 10),
    horaIngreso: new Date().toTimeString().substring(0, 5),
    horaSalida: '',
    foto: '',
    videoUrl: ''
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

  /**
   * REGLA DE NEGOCIO: Bloquear y advertir si no se dispone de stock suficiente del insumo en la agencia de la OT
   */
  get tieneInsumosSinStock(): boolean {
    if (!this.insumosConsumoForm || this.insumosConsumoForm.length === 0) return false;
    return this.insumosConsumoForm.some(ins => {
      const stock = this.getStockDisponible(ins.productoId, ins.productoSKU);
      return stock < ins.cantidad;
    });
  }

  get insumosSinStockDetalle(): string[] {
    if (!this.insumosConsumoForm) return [];
    return this.insumosConsumoForm
      .filter(ins => this.getStockDisponible(ins.productoId, ins.productoSKU) < ins.cantidad)
      .map(ins => {
        const stock = this.getStockDisponible(ins.productoId, ins.productoSKU);
        return `${ins.productoNombre} (Disponible en ${this.nuevoRegistro.agencia}: ${stock} ${ins.unidadMedida}, Requerido: ${ins.cantidad} ${ins.unidadMedida})`;
      });
  }

  getVehiculoOcupanteBahia(bahiaId: string | number, bahiaNombre?: string): VehiculoServicio | undefined {
    return this.servicios.find(s => {
      const enProceso = s.estado === 'EN PROCESO' || s.estado === 'EN_PROCESO' || s.estado === 'EN_ESPERA' || s.estado === 'EN COLA';
      if (!enProceso) return false;
      const matchAgencia = !s.agencia || !this.nuevoRegistro.agencia ||
        s.agencia.toLowerCase().includes(this.nuevoRegistro.agencia.toLowerCase()) ||
        this.nuevoRegistro.agencia.toLowerCase().includes(s.agencia.toLowerCase());
      if (!matchAgencia) return false;
      return (s.bahiaId && String(s.bahiaId) === String(bahiaId)) ||
        (bahiaNombre && s.bahia && s.bahia.trim().toLowerCase() === bahiaNombre.trim().toLowerCase());
    });
  }

  isBahiaOcupada(b: Bahia): boolean {
    return Boolean(this.getVehiculoOcupanteBahia(b.id, b.nombre));
  }

  get bahiaOcupadaActual(): VehiculoServicio | undefined {
    if (!this.nuevoRegistro.bahiaId && !this.nuevoRegistro.bahia) return undefined;
    return this.getVehiculoOcupanteBahia(this.nuevoRegistro.bahiaId, this.nuevoRegistro.bahia);
  }

  productosInventario: InventarioItem[] = [];
  insumosConsumoForm: InsumoConsumidoServicio[] = [];
  despachosPendientesLider: any[] = [];

  private catalogoService = inject(CatalogoServiciosService);
  private sucursalService = inject(SucursalService);
  private extrasService = inject(ServiciosExtrasService);
  private operadorService = inject(OperadorService);
  private bahiaService = inject(BahiaService);
  private inventarioService = inject(InventarioService);
  private servicioService = inject(ServicioLavadoService);
  public storageUploadService = inject(StorageUploadService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  private maquinariaService = inject(MaquinariaService);
  private incidenteService = inject(IncidenteService);
  private permissions = inject(PermissionService);

  // ── Servicios Extras / Asignaciones Especiales ──
  serviciosExtras: ServicioExtra[] = [];
  operadores: Operador[] = [];
  sucursales: Sucursal[] = [];
  bahiasSucursalForm: Bahia[] = [];
  sucursalesDisponibles: string[] = [];

  busquedaExtras = '';
  filtroEstadoExtras = 'TODOS';
  filtroOperadorExtras = 0;

  currentPageExtras = 1;
  pageSizeExtras = 5;

  /** Servicio de lavado FINALIZADO que activa el modo 'agregar a OT existente' */
  agregarServicioOTFuente: VehiculoServicio | null = null;

  showModalExtras = false;
  isEditingExtras = false;
  editandoExtraId: number | null = null;

  extraFormOT = '';
  extraFormPlaca = '';
  extraFormMarca = '';
  extraFormModelo = '';
  extraFormColor = '';
  extraFormCliente = '';
  extraFormAgenciaId = '';
  extraFormBahiaId = '';
  extraFormBahia = '';
  extraFormHoraIngreso = '';
  extraFormHoraSalida = '';
  extraFormPrioridad = 'Media';
  extraFormVideoUrl = '';
  bahiasSucursalExtraForm: Bahia[] = [];
  @ViewChild('videoIngresoExtraRecorder') videoIngresoExtraRecorder?: VideoRecorderComponent;

  extraForm: {
    servicioNombre: string;
    servicioDescripcion: string;
    operadorId: number | string;
    operadorNombre: string;
    sucursalesSeleccionadas: string[];
    insumosReceta: RecetaInsumoServicio[];
    estado: ServicioExtra['estado'];
    fechaProgramada: string;
    notas: string;
  } = {
    servicioNombre: '',
    servicioDescripcion: '',
    operadorId: '' as number | string,
    operadorNombre: '',
    sucursalesSeleccionadas: [],
    insumosReceta: [],
    estado: 'Pendiente',
    fechaProgramada: new Date().toISOString().substring(0, 10),
    notas: ''
  };

  // ── Control Regional & Evidencias en Vídeo de Especiales ──
  stockPulidor: any[] = [];
  faltantesInsumosOT: string[] = [];
  serviciosEspecialesOpciones: CatalogoServicio[] = [];
  pulidoresDisponiblesRegion: any[] = [];
  modalFinalizarServicioOpen = false;
  servicioAFinalizar: VehiculoServicio | null = null;
  get tituloModalFinalizar(): string {
    if (!this.servicioAFinalizar) return 'Finalizar Servicio';
    const ot = this.servicioAFinalizar.ordenTrabajoOT ? ` — ${this.servicioAFinalizar.ordenTrabajoOT}` : '';
    return `Finalizar Servicio: ${this.servicioAFinalizar.placa || ''}${ot}`;
  }
  videoSalidaInput = '';
  observacionesSalidaInput = '';
  modalIniciarServicioEspecialOpen = false;
  modalFinalizarServicioEspecialOpen = false;
  modalPausarServicioEspecialOpen = false;
  modalReanudarEspecialOpen = false;
  modalDetalleEspecialOpen = false;
  modalVideoGenericoOpen = false;
  videoGenericoUrl = '';
  videoGenericoTitulo = '';
  videoCurrentTime = 0;
  videoDuration = 0;
  videoBufferedSeconds = 0;
  videoBufferedPercent = 0;
  videoPlaybackPercent = 0;
  videoCargandoBuffer = false;
  videoBufferListo = false;
  modalPausasDetalleOpen = false;
  servicioPausasSeleccionado: ServicioExtra | null = null;
  pausasSeleccionadas: any[] = [];
  Math = Math;
  servicioEspecialSeleccionado?: ServicioExtra;
  videoInicialInput = '';
  videoFinalInput = '';
  videoPausaInput = '';
  videoReanudarInput = '';
  motivoPausaInput = 'Pausa para almuerzo / descanso reglamentario';
  motivoPausaDetalleInput = '';
  observacionesReanudarInput = '';
  calificacionCalidadInput = 5;
  notasFinalizacionInput = '';

  // ── ViewChild Recorders para Evidencias en Vídeo con Carga Diferida a S3 ──
  @ViewChild('videoIngresoRecorder') videoIngresoRecorder?: VideoRecorderComponent;
  @ViewChild('videoSalidaRecorder') videoSalidaRecorder?: VideoRecorderComponent;
  @ViewChild('videoInicialRecorder') videoInicialRecorder?: VideoRecorderComponent;
  @ViewChild('videoFinalRecorder') videoFinalRecorder?: VideoRecorderComponent;
  @ViewChild('videoPausaRecorder') videoPausaRecorder?: VideoRecorderComponent;
  @ViewChild('videoReanudarRecorder') videoReanudarRecorder?: VideoRecorderComponent;

  guardandoServicio = false;
  finalizandoServicio = false;
  iniciandoEspecial = false;
  finalizandoEspecial = false;
  pausandoEspecial = false;
  reanudandoEspecial = false;

  // ── Role helpers ──
  get isSuperAdmin() { return this.authService.isSuperAdmin() || this.authService.hasRole(Role.SUPER_ADMIN); }
  get isAdmin() { return this.authService.isAdmin() || this.isSuperAdmin; }
  get isOperador() {
    if (this.isSuperAdmin || this.isAdmin) return false;
    return this.authService.hasRole(Role.OPERADOR);
  }
  get isLiderOperador() {
    if (this.isSuperAdmin || this.isAdmin) return false;
    return this.authService.isLiderOperador();
  }
  get isCoordServiciosEspeciales() {
    if (this.isSuperAdmin || this.isAdmin) return false;
    return this.authService.hasRole(Role.COORD_SERVICIOS_ESPECIALES) || this.authService.isCoordServiciosEspeciales();
  }
  get isPulidor() {
    if (this.isSuperAdmin || this.isAdmin) return false;
    if (this.isCoordServiciosEspeciales) return false;
    return this.authService.hasRole(Role.PULIDOR) || this.authService.isPulidor();
  }
  get isPulidorFijo(): boolean {
    if (this.isSuperAdmin || this.isAdmin) return false;
    const user = this.authService.getCurrentUser();
    const rol = (user?.role || '').toUpperCase();
    return (rol.includes('PULIDOR_FIJO') || (rol.includes('PULIDOR') && !!user?.agenciaId));
  }
  get isPulidorMovil(): boolean {
    if (this.isSuperAdmin || this.isAdmin) return false;
    const user = this.authService.getCurrentUser();
    const rol = (user?.role || '').toUpperCase();
    return rol.includes('PULIDOR_MOVIL') || (rol.includes('PULIDOR') && !user?.agenciaId);
  }
  get miAgenciaNombre(): string {
    const user = this.authService.getCurrentUser();
    return user?.sucursalNombre || (user as any)?.agenciaNombre || (this.sucursales.find(s => String(s.id) === String(user?.agenciaId))?.nombre) || '';
  }
  sucursalTieneEspeciales(suc: Sucursal): boolean {
    if (!suc) return false;
    if (suc.tieneServiciosEspeciales === true) return true;
    if (this.sucursalService.hasServiciosEspecialesActivos(suc.id, suc.nombre)) return true;

    const espIds = new Set(
      (this.catalogoCompleto || [])
        .filter((c) => {
          const cat = (c.categoria || '').toUpperCase();
          return cat === 'ESPECIAL' || cat === 'EXTRA' || cat.includes('ESPECIAL');
        })
        .map((c) => c.id),
    );
    return Boolean(suc.servicioIds?.some((id: number) => espIds.has(id)));
  }

  get agenciasDisponiblesParaEspecial(): Sucursal[] {
    const user = this.authService.getCurrentUser();
    let lista = [...this.sucursales];
    if (!this.isSuperAdmin && !this.isAdmin) {
      const regId = user?.regionId;
      if (regId) {
        lista = lista.filter(s => String(s.regionId) === String(regId) || String((s as any).region?.id) === String(regId));
      }
    }
    // Todas las sucursales con o sin servicios especiales
    return lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  get pulidorFijoAgenciaSeleccionada(): any | undefined {
    const agId = String(this.extraFormAgenciaId || '');
    if (!agId) return undefined;
    return this.pulidoresDisponiblesRegion.find(p => String(p.agenciaId || p.agencia?.id) === agId);
  }

  get pulidoresFijosAgenciaSeleccionada(): any[] {
    const agId = String(this.extraFormAgenciaId || '');
    if (!agId) return [];
    return this.pulidoresDisponiblesRegion.filter(p => String(p.agenciaId || p.agencia?.id) === agId);
  }

  get pulidoresMovilesDisponibles(): any[] {
    return this.pulidoresDisponiblesRegion.filter(p => !p.agenciaId && !p.agencia?.id);
  }

  get otrosPulidoresRegion(): any[] {
    const agId = String(this.extraFormAgenciaId || '');
    return this.pulidoresDisponiblesRegion.filter(p => (p.agenciaId || p.agencia?.id) && String(p.agenciaId || p.agencia?.id) !== agId);
  }

  get pulidorSeleccionadoActual(): any | undefined {
    const op = this.pulidoresDisponiblesRegion.find(p => String(p.id) === String(this.extraForm.operadorId));
    if (!op) return undefined;
    const esMovil = !op.agenciaId && !op.agencia?.id;
    return { ...op, esMovil };
  }

  isPulidorDeAgenciaActual(op: any): boolean {
    return Boolean(op?.agenciaId && String(op.agenciaId) === String(this.extraFormAgenciaId));
  }
  puedeRealizarOT(extra?: ServicioExtra): boolean {
    if (!extra) return false;
    if (this.isSuperAdmin || this.isAdmin) return true;
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return String(extra.operadorId) === String(user.id);
  }
  get isOperadorEspeciales() {
    if (this.isSuperAdmin || this.isAdmin) return false;
    return this.isCoordServiciosEspeciales || this.isPulidor;
  }
  get userRegionNombre(): string {
    const u = this.authService.getCurrentUser();
    return u?.regionNombre || u?.region || '';
  }
  get isGerente() { return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN, Role.GERENTE]); }
  get isSupervisor(): boolean {
    const user = this.authService.getCurrentUser();
    const rol = (user?.role || '').toUpperCase();
    return (rol === 'SUPERVISOR' || rol === 'GERENTE_REGIONAL' || rol.includes('SUPERVISOR') || rol.includes('REGIONAL')) && !this.isAdmin && !this.isSuperAdmin;
  }
  get isAprobador(): boolean {
    const user = this.authService.getCurrentUser();
    const rol = (user?.role || '').toUpperCase();
    return (rol === 'APROBADOR' || rol === 'GERENTE' || user?.role === Role.APROBADOR || user?.role === Role.GERENTE) && !this.isAdmin && !this.isSuperAdmin;
  }
  get canCrearOT(): boolean {
    if (this.isAprobador) return false;
    return this.permissions.canRegistrarServicio() || this.isOperador || this.isLiderOperador || this.isOperadorEspeciales || this.isAdmin || this.isSuperAdmin;
  }
  get userSucursal(): string | undefined {
    return this.authService.getCurrentUser()?.sucursalNombre || this.authService.getCurrentUser()?.sucursal;
  }
  get puedeReportarFalla() {
    return !this.isAprobador && this.authService.hasAnyRole([Role.OPERADOR, Role.LIDER_OPERADOR, Role.OPERADOR_SERVICIOS_ESPECIALES])
      && this.permissions.canRegistrarIncidente();
  }

  /** Solo Gerente, SuperAdmin y Admin pueden aprobar servicios */
  get canApprove() {
    return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN, Role.GERENTE, Role.APROBADOR]);
  }

  /** Helper para obtener filtros de alcance del usuario */
  private _getFiltrosUsuario(): { agenciaId?: string; regionId?: string } | undefined {
    const user = this.authService.getCurrentUser();
    if (this.isAprobador && user?.agenciaId) {
      return { agenciaId: String(user.agenciaId) };
    }
    if (this.isSupervisor && user?.regionId) {
      return { regionId: String(user.regionId) };
    }
    return undefined;
  }

  /** El operador / líder / admin puede finalizar servicios en proceso o en cola (Aprobador NO puede) */
  canFinalizar(item: VehiculoServicio): boolean {
    if (this.isAprobador) return false;
    const estado = (item.estado || '').toUpperCase();
    return estado === 'EN PROCESO' || estado === 'EN_PROCESO' || estado === 'EN COLA' || estado === 'EN_ESPERA';
  }

  /** Obtiene la evidencia de inicio del servicio si existe */
  getVideoInicial(item: VehiculoServicio): string | null {
    if (!item) return null;
    return item.videoInicialUrl || item.fotoIngresoUrl || item.foto || item.videoInicial || null;
  }

  /**
   * REGLA ESTRICTA: La evidencia final solo está disponible cuando el servicio ha sido formalmente finalizado
   * y cuenta con su archivo propio de fin/salida (nunca muestra ni reproduce la evidencia de inicio).
   */
  getVideoFinal(item: VehiculoServicio): string | null {
    if (!item) return null;
    const estado = (item.estado || '').toUpperCase();
    const enProceso = estado === 'EN PROCESO' || estado === 'EN_PROCESO' || estado === 'EN COLA' || estado === 'EN_ESPERA';
    if (enProceso) return null;
    const url = item.fotoSalidaUrl || item.videoFinalUrl || item.videoFinal;
    if (url && url !== item.fotoIngresoUrl && url !== item.videoInicialUrl) {
      return url;
    }
    return null;
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();

    // Si el usuario es de servicios especiales (pulidor o coord exclusivo), pre-seleccionar pestaña de especiales
    if ((this.isCoordServiciosEspeciales || this.isPulidor) && !this.isSuperAdmin && !this.isAdmin) {
      this.tabActiva = 'especiales';
      this.tieneServiciosEspeciales = true;
    } else {
      this.tabActiva = 'generales';
    }

    if (this.isSuperAdmin || this.isAdmin) {
      this.tieneServiciosEspeciales = true;
    }

    // Pre-rellenar el formulario de nueva OT con el contexto del usuario autenticado
    if (user) {
      const nombreCompleto = `${user.nombre} ${user.apellido}`;
      this.nuevoRegistro.empleado = nombreCompleto;
      if (user.sucursalNombre) this.nuevoRegistro.agencia = user.sucursalNombre;
      if (user.bahiaNombre) this.nuevoRegistro.bahia = user.bahiaNombre;
    }

    this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
      this.servicios = list;
      this.recalcularServiciosFiltrados();
    });

    this.catalogoService.getServiciosActivos().subscribe(cat => {
      this.catalogoCompleto = cat;
      const nombres = cat.map(c => c.nombre).filter(Boolean);
      if (nombres.length) this.listaServiciosFiltro = Array.from(new Set(nombres));
      this.onCategoriaChange();
      this.recalcularTieneServiciosEspeciales();
    });

    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
      const sucClean = (user?.sucursalNombre || user?.sucursal || (user as any)?.agencia || '').toLowerCase().trim();
      const suc = list.find(s =>
        (user?.agenciaId && String(s.id) === String(user.agenciaId)) ||
        (s.liderOperadorId && (user as any)?.id && String(s.liderOperadorId) === String((user as any)?.id)) ||
        (s.nombre && s.nombre.toLowerCase() === sucClean) ||
        (s.nombre && sucClean && (s.nombre.toLowerCase().includes(sucClean) || sucClean.includes(s.nombre.toLowerCase())))
      ) || this.sucursalService.getSucursalPorNombre(user?.sucursalNombre || user?.sucursal);
      this.sucursalServicioIds = Array.isArray(suc?.servicioIds) ? suc.servicioIds.map(Number) : [];

      // Construir mapa sucursal -> región para el filtro de región y lista disponible
      this.sucursalesDisponibles = list.map(s => s.nombre).filter(Boolean);
      this.mapaRegionSucursal = {};
      this.mapaMarcaSucursal = {};
      list.forEach(s => {
        if (s.nombre && s.regionNombre) this.mapaRegionSucursal[s.nombre] = s.regionNombre;
        const clNombre = s.clienteNombre || s.marcaNombre;
        if (s.nombre && clNombre) this.mapaMarcaSucursal[s.nombre] = clNombre;
      });

      this.onSucursalFormChange();
      this.onCategoriaChange();
      this.recalcularTieneServiciosEspeciales();
    });

    this.inventarioService.getItems().subscribe((items: any) => {
      this.productosInventario = items;
    });

    if (this.isLiderOperador) {
      const agId = user?.agenciaId || user?.sucursalNombre || user?.sucursal || '';
      this.inventarioService.getDespachosPendientesAgencia(String(agId)).subscribe(list => {
        this.despachosPendientesLider = list || [];
      });
    }

    this.operadorService.getOperadores().subscribe(ops => {
      this.operadores = ops;
    });

    // Cargar Servicios Especiales Regionales
    this.cargarServiciosEspeciales();
    this.cargarPulidoresRegion();
    if (this.isPulidor) {
      this.cargarStockPulidor();
    }

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

  cargarServiciosEspeciales() {
    const user = this.authService.getCurrentUser();
    const filtro: any = {};
    if (this.isSuperAdmin || this.isAdmin) {
      // Super Admin y Admin: acceso nacional completo
    } else if (this.isSupervisor && user?.regionId) {
      filtro.regionId = String(user.regionId);
    } else if (this.isAprobador && user?.agenciaId) {
      filtro.agenciaId = String(user.agenciaId);
    } else if (this.isCoordServiciosEspeciales && user?.regionId) {
      filtro.regionId = String(user.regionId);
    } else if (this.isPulidor && user?.id) {
      filtro.operadorId = String(user.id);
    }

    this.extrasService.getServiciosExtras(filtro).subscribe(extras => {
      this.serviciosExtras = extras || [];
      if (this.serviciosExtras.length > 0 || this.isSuperAdmin || this.isAdmin || this.isSupervisor) {
        this.tieneServiciosEspeciales = true;
      }
    });
  }

  cargarPulidoresRegion() {
    const user = this.authService.getCurrentUser();
    const regId = user?.regionId ? String(user.regionId) : undefined;
    this.extrasService.getPulidoresPorRegion(regId).subscribe(list => {
      this.pulidoresDisponiblesRegion = list || [];
    });
  }

  cargarStockPulidor() {
    const user = this.authService.getCurrentUser();
    const pulId = user?.id ? String(user.id) : undefined;
    this.extrasService.getStockPulidor(pulId).subscribe(st => {
      this.stockPulidor = st || [];
      if (this.showModalExtras) {
        this.recalcularFaltantesInsumosOT();
      }
    });
  }

  recalcularTieneServiciosEspeciales(): void {
    const user = this.authService.getCurrentUser();
    if (!user) { this.tieneServiciosEspeciales = false; return; }

    // Admin y Super Admin: siempre tienen acceso completo a servicios especiales y generales
    if (this.isSuperAdmin || this.isAdmin) {
      this.tieneServiciosEspeciales = true;
      return;
    }

    // Coord/pulidor de especiales: siempre ven el módulo regional
    if (this.isOperadorEspeciales) {
      this.tieneServiciosEspeciales = true;
      return;
    }

    const sucClean = (user.sucursalNombre || user.sucursal || (user as any).agencia || '').toLowerCase().trim();
    const suc = this.sucursales.find(s =>
      (user.agenciaId && String(s.id) === String(user.agenciaId)) ||
      (s.liderOperadorId && (user as any).id && String(s.liderOperadorId) === String((user as any).id)) ||
      (s.nombre && s.nombre.toLowerCase() === sucClean) ||
      (s.nombre && sucClean && (s.nombre.toLowerCase().includes(sucClean) || sucClean.includes(s.nombre.toLowerCase())))
    ) || this.sucursalService.getSucursalPorNombre(user.sucursalNombre || user.sucursal);

    // Admin / supervisor sin agencia fija: pueden ver el módulo completo
    if ((this.isSuperAdmin || this.isAdmin || this.isSupervisor || this.isGerente) && !suc && !user.agenciaId) {
      this.tieneServiciosEspeciales = true;
      return;
    }

    if (!suc) {
      this.tieneServiciosEspeciales =
        Boolean(user.agenciaId !== undefined && user.agenciaId !== null && user.agenciaId !== ''
          ? this.sucursalService.hasServiciosEspecialesActivos(user.agenciaId, sucClean)
          : false);
      if (!this.tieneServiciosEspeciales && this.tabActiva === 'especiales' && !this.isPulidor) {
        this.cambiarTab('generales');
      }
      return;
    }

    // Fuente de verdad: flag de la agencia (Sucursales)
    if ((suc as any).tieneServiciosEspeciales === true) {
      this.tieneServiciosEspeciales = true;
    } else if ((suc as any).tieneServiciosEspeciales === false) {
      this.tieneServiciosEspeciales = false;
    } else {
      const espIds = new Set(
        (this.catalogoCompleto || [])
          .filter(c => c.categoria === 'ESPECIAL' || c.categoria === 'EXTRA')
          .map(c => c.id)
      );
      this.tieneServiciosEspeciales = Boolean(suc.servicioIds?.some((id: number) => espIds.has(id)));
    }

    if (!this.tieneServiciosEspeciales && this.tabActiva === 'especiales' && !this.isPulidor) {
      this.cambiarTab('generales');
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
    // Solo servicios de la lista asignada a la agencia (nunca catálogo global completo)
    const idsAgencia = this.sucursalServicioIds;
    if (idsAgencia === null) {
      // Aún no se resolvió la sucursal: no mostrar nada hasta tener lista
      this.opcionesServicios = [];
    } else if (idsAgencia.length === 0) {
      this.opcionesServicios = [];
    } else {
      this.opcionesServicios = this.opcionesServicios.filter(s => idsAgencia.includes(s.id));
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
                 (this.sucursalServicioIds?.length
                   ? this.catalogoCompleto.find(
                       s =>
                         s.nombre === this.nuevoRegistro.servicio &&
                         this.sucursalServicioIds!.includes(s.id),
                     )
                   : undefined);
    if (serv) {
      this.nuevoRegistro.servicioId = serv.id;
      this.asignarHorasAutomaticasOT(Number(serv.tiempoEstimadoMin) || 30);
      if (serv.insumosReceta && serv.insumosReceta.length > 0) {
        this.insumosConsumoForm = serv.insumosReceta.map(r => ({
          productoId: r.productoId,
          productoSKU: r.productoSKU,
          productoNombre: r.productoNombre,
          unidadMedida: r.unidadMedida,
          cantidad: r.cantidadSugerida
        }));
      } else {
        this.insumosConsumoForm = [];
      }
    } else {
      this.nuevoRegistro.servicioId = 0;
      this.insumosConsumoForm = [];
      this.asignarHorasAutomaticasOT(30);
    }
  }

  /** Hora ingreso = ahora; salida estimada = ingreso + duración del servicio (min). */
  private asignarHorasAutomaticasOT(duracionMin = 30): void {
    const ahora = new Date();
    this.nuevoRegistro.horaIngreso = ahora.toTimeString().substring(0, 5);
    const salida = new Date(ahora.getTime() + Math.max(1, duracionMin) * 60_000);
    this.nuevoRegistro.horaSalida = salida.toTimeString().substring(0, 5);
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

  getStockDisponible(productoId: number | string, productoSKU?: string): number {
    const suc = this.sucursales.find(s => s.nombre === this.nuevoRegistro.agencia || String(s.id) === this.nuevoRegistro.agencia);
    const sucId = suc ? String(suc.id) : undefined;
    const sucNombre = suc ? suc.nombre : this.nuevoRegistro.agencia;
    return this.inventarioService.getStockDisponibleSucursal(productoId, sucId, sucNombre, productoSKU);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.videoFileSelected = true;
      this.videoFileName = file.name;
    }
  }

  onSucursalFormChange(): void {
    const suc = this.sucursales.find(s => s.nombre === this.nuevoRegistro.agencia || String(s.id) === this.nuevoRegistro.agencia);
    this.sucursalServicioIds = Array.isArray(suc?.servicioIds) ? suc!.servicioIds.map(Number) : [];
    if (!this.agenciaFormTieneEspeciales && this.nuevoRegistro.categoriaServicio === 'ESPECIAL') {
      this.nuevoRegistro.categoriaServicio = 'GENERAL';
    }
    this.onCategoriaChange();
    const sucId = suc ? String(suc.id) : this.nuevoRegistro.agencia;
    if (sucId) {
      this.bahiaService.getBahiasPorSucursal(sucId).subscribe(bahias => {
        this.bahiasSucursalForm = bahias || [];
        if (this.bahiasSucursalForm.length > 0) {
          const matchBahia = this.bahiasSucursalForm.find(b => String(b.id) === String(this.nuevoRegistro.bahiaId));
          if (matchBahia && !this.isBahiaOcupada(matchBahia)) {
            this.nuevoRegistro.bahia = matchBahia.nombre;
            this.nuevoRegistro.bahiaId = String(matchBahia.id);
          } else {
            const libre = this.bahiasSucursalForm.find(b => !this.isBahiaOcupada(b)) || this.bahiasSucursalForm[0];
            this.nuevoRegistro.bahia = libre.nombre;
            this.nuevoRegistro.bahiaId = String(libre.id);
          }
          this.onBahiaFormChange();
        } else {
          this.nuevoRegistro.bahia = 'Sin Bahía Específica';
          this.nuevoRegistro.bahiaId = '';
        }
      });
    }
  }

  onBahiaFormChange(): void {
    const b = this.bahiasSucursalForm.find(x => String(x.id) === String(this.nuevoRegistro.bahiaId));
    if (b) {
      this.nuevoRegistro.bahia = b.nombre;
      this.nuevoRegistro.bahiaId = String(b.id);
      if (b.operadorAsignado && b.operadorAsignado !== 'Sin Asignar') {
        this.nuevoRegistro.empleado = b.operadorAsignado;
      }
    } else if (this.nuevoRegistro.bahiaId === '') {
      this.nuevoRegistro.bahia = 'Sin Bahía Específica';
    }
  }

  onSucursalExtraFormChange(): void {
    const agId = this.extraFormAgenciaId;
    this.extraFormBahiaId = '';
    this.extraFormBahia = '';

    if (this.isPulidor) return;

    // Buscar si la agencia tiene un pulidor fijo asignado
    const fijo = this.pulidoresDisponiblesRegion.find(p => String(p.agenciaId || p.agencia?.id) === String(agId));
    if (fijo) {
      // Tiene pulidor fijo: se autorrellenan los campos y queda asignado
      this.extraForm.operadorId = String(fijo.id);
      this.extraForm.operadorNombre = `${fijo.name} ${fijo.lastname}`.trim();
      this.cargarStockPulidorParaOT(fijo.id);
    } else {
      // NO tiene pulidor fijo: asignar pulidor móvil
      const opActual = this.pulidoresDisponiblesRegion.find(p => String(p.id) === String(this.extraForm.operadorId));
      const esMovil = opActual && !opActual.agenciaId && !opActual.agencia?.id;
      if (!esMovil) {
        const primerMovil = this.pulidoresMovilesDisponibles[0];
        if (primerMovil) {
          this.extraForm.operadorId = String(primerMovil.id);
          this.extraForm.operadorNombre = `${primerMovil.name} ${primerMovil.lastname}`.trim();
          this.cargarStockPulidorParaOT(primerMovil.id);
        } else {
          this.extraForm.operadorId = '';
          this.extraForm.operadorNombre = '';
          this.stockPulidor = [];
          this.recalcularFaltantesInsumosOT();
        }
      } else {
        // Ya tenía un pulidor móvil asignado, verificar sus existencias
        this.cargarStockPulidorParaOT(opActual.id);
      }
    }
  }

  onBahiaExtraFormChange(): void {
    const b = this.bahiasSucursalExtraForm.find(x => String(x.id) === String(this.extraFormBahiaId));
    if (b) {
      this.extraFormBahia = b.nombre;
      this.extraFormBahiaId = String(b.id);
    } else {
      this.extraFormBahia = 'Sin Bahía Específica';
      this.extraFormBahiaId = '';
    }
  }

  get bahiaExtraOcupadaActual(): VehiculoServicio | undefined {
    if (!this.extraFormBahiaId && !this.extraFormBahia) return undefined;
    return this.getVehiculoOcupanteBahia(this.extraFormBahiaId, this.extraFormBahia);
  }

  get operadoresSucursalForm(): Operador[] {
    const agencia = (this.nuevoRegistro.agencia || '').toLowerCase();
    const ops = this.operadores.filter(op => {
      const opSuc = (op.sucursal || '').toLowerCase();
      return !agencia || opSuc.includes(agencia) || agencia.includes(opSuc);
    });
    return ops.length > 0 ? ops : this.operadores;
  }

  private recalcularServiciosFiltrados(): void {
    const user = this.authService.getCurrentUser();
    const role = this.authService.getRole();
    const texto = this.filtroTexto.toLowerCase().trim();

    const isSuper = role === Role.SUPER_ADMIN || role === Role.ADMIN || role === 'SUPER_ADMIN' || role === 'ADMIN';
    const isSupervisor = this.isSupervisor;
    const isAprobador = this.isAprobador;
    const userSucClean = (this.userSucursal || user?.sucursalNombre || user?.sucursal || (user as any)?.agencia || '').replace(/EasyDry\s*/i, '').toLowerCase().trim();
    const uReg = (user?.regionNombre || user?.region || '').toLowerCase();

    let resultados = this.servicios.filter(s => {
      if (isAprobador && userSucClean) {
        const itemSucClean = (s.agencia || '').replace(/EasyDry\s*/i, '').toLowerCase().trim();
        const matchSucursal = !itemSucClean || itemSucClean.includes(userSucClean) || userSucClean.includes(itemSucClean);
        if (!matchSucursal) return false;
      } else if (isSupervisor && uReg) {
        if (this.mapaRegionSucursal[s.agencia]) {
          const sReg = (this.mapaRegionSucursal[s.agencia] || '').toLowerCase();
          if (!sReg.includes(uReg) && !uReg.includes(sReg)) return false;
        }
      } else if (!isSuper && !isSupervisor && userSucClean) {
        const itemSucClean = (s.agencia || '').replace(/EasyDry\s*/i, '').toLowerCase().trim();
        const matchSucursal = !itemSucClean || itemSucClean.includes(userSucClean) || userSucClean.includes(itemSucClean);
        const matchOperador = user && s.empleado?.toLowerCase().includes((user.nombre || '').toLowerCase());
        if (!matchSucursal && !matchOperador) return false;
      }

      const matchTexto = !texto ||
        s.placa.toLowerCase().includes(texto) ||
        (s.ordenTrabajoOT?.toLowerCase().includes(texto) ?? false) ||
        (s.numeroOrden?.toLowerCase().includes(texto) ?? false) ||
        (s.modelo?.toLowerCase().includes(texto) ?? false);

      return matchTexto;
    });

    if (this.filtrosGlobales.estado !== 'Todos') {
      const fe = this.filtrosGlobales.estado.toUpperCase();
      resultados = resultados.filter(s => {
        const se = (s.estado || '').toUpperCase();
        if (fe === 'EN PROCESO' || fe === 'EN_PROCESO') {
          return se === 'EN PROCESO' || se === 'EN_PROCESO' || se === 'EN COLA' || se === 'EN_ESPERA';
        }
        if (fe === 'POR APROBAR' || fe === 'POR_APROBAR' || fe === 'FALTAN DE APROBAR') {
          return se === 'FINALIZADO' && (!s.aprobadoPor || s.aprobadoPor.trim() === '');
        }
        if (fe === 'REALIZADOS / APROBADOS' || fe === 'REALIZADO' || fe === 'REALIZADOS' || fe === 'APROBADO') {
          return se === 'APROBADO' || se === 'FINALIZADO';
        }
        if (fe === 'RECHAZADOS' || fe === 'RECHAZADO') {
          return se === 'RECHAZADO';
        }
        return se === fe;
      });
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      const fs = (this.filtrosGlobales.sucursal || '').replace(/EasyDry\s*/i, '').toLowerCase().trim();
      resultados = resultados.filter(s => {
        const sa = (s.agencia || '').replace(/EasyDry\s*/i, '').toLowerCase().trim();
        return sa.includes(fs) || fs.includes(sa);
      });
    }
    if (this.filtrosGlobales.bahia !== 'Todas') {
      const fb = (this.filtrosGlobales.bahia || '').toLowerCase().trim();
      resultados = resultados.filter(s => {
        const sb = (s.bahia || '').toLowerCase().trim();
        return sb.includes(fb) || fb.includes(sb);
      });
    }
    if (this.filtrosGlobales.operador !== 'Todos') {
      const fo = (this.filtrosGlobales.operador || '').toLowerCase().trim();
      resultados = resultados.filter(s => (s.empleado || '').toLowerCase().includes(fo));
    }
    if (this.filtrosGlobales.servicio && this.filtrosGlobales.servicio !== 'Todos') {
      const fserv = this.filtrosGlobales.servicio.toLowerCase().trim();
      resultados = resultados.filter(s =>
        (s.servicio || '').toLowerCase().includes(fserv)
      );
    }
    if (this.filtrosGlobales.region && this.filtrosGlobales.region !== 'Todas') {
      resultados = resultados.filter(s =>
        this.mapaRegionSucursal[s.agencia] === this.filtrosGlobales.region
      );
    }
    const targetClienteFiltro = (this.filtrosGlobales.cliente && this.filtrosGlobales.cliente !== 'Todas')
      ? this.filtrosGlobales.cliente
      : (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas' ? this.filtrosGlobales.marca : null);
    if (targetClienteFiltro) {
      resultados = resultados.filter(s =>
        this.mapaMarcaSucursal[s.agencia] === targetClienteFiltro
      );
    }
    if (this.filtrosGlobales.busqueda?.trim()) {
      const b = this.filtrosGlobales.busqueda.trim().toLowerCase();
      resultados = resultados.filter(s =>
        s.placa?.toLowerCase().includes(b) ||
        s.ordenTrabajoOT?.toLowerCase().includes(b) ||
        s.numeroOrden?.toLowerCase().includes(b) ||
        s.marca?.toLowerCase().includes(b) ||
        s.modelo?.toLowerCase().includes(b) ||
        s.color?.toLowerCase().includes(b)
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
    this.currentPage = 1;
  }

  calcularDuracion(inicio: string, fin: string): string {
    if (!inicio) return '';
    const parse = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    if (!fin || fin === '--:--') {
      const ahora = new Date();
      const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
      let min = parse(horaActual) - parse(inicio);
      if (min < 0) min += 24 * 60;
      const h = Math.floor(min / 60);
      const m = min % 60;
      return h > 0 ? `${h}h ${m}min` : `${m}min`;
    }
    let min = parse(fin) - parse(inicio);
    if (min < 0) min += 24 * 60;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }

  async guardarHojaServicio() {
    this.placaTocada = true;
    const resultado = validarPlaca(this.nuevoRegistro.placa);
    if (!resultado.valida) {
      this.toastService.warning('Placa inválida', resultado.mensaje);
      return;
    }
    this.nuevoRegistro.placa = resultado.placa;

    if (!this.nuevoRegistro.ordenTrabajoOT?.trim()) {
      this.toastService.warning('Campos Incompletos', 'Ingrese el Nº de OT.');
      return;
    }
    const otGenUpper = this.nuevoRegistro.ordenTrabajoOT.trim().toUpperCase();
    this.nuevoRegistro.ordenTrabajoOT = otGenUpper;

    const existeEnGenerales = this.servicios.some(s =>
      s.ordenTrabajoOT?.toUpperCase() === otGenUpper && s.estado !== 'CANCELADO'
    );
    const existeEnEspeciales = this.serviciosExtras.some(e =>
      (e.codigoSE || (e as any).ordenTrabajoOT)?.toUpperCase() === otGenUpper && e.estado !== 'Cancelado'
    );
    if (existeEnGenerales || existeEnEspeciales) {
      this.toastService.warning('Orden de Trabajo Duplicada', `La OT "${otGenUpper}" ya se encuentra registrada en el sistema. Ingrese un número de OT único.`);
      return;
    }

    if (!this.nuevoRegistro.marca?.trim()) {
      this.toastService.warning('Campos Incompletos', 'Ingrese la marca del vehículo.');
      return;
    }
    if (!this.nuevoRegistro.modelo?.trim()) {
      this.toastService.warning('Campos Incompletos', 'Ingrese el modelo del vehículo.');
      return;
    }
    if (!this.nuevoRegistro.servicioId) {
      this.toastService.warning('Servicio Requerido', 'Seleccione un servicio del catálogo.');
      return;
    }

    if (this.tieneInsumosSinStock) {
      const detalles = this.insumosSinStockDetalle.join('\n• ');
      this.toastService.error(
        'Stock Insuficiente en Agencia',
        `No se puede iniciar el servicio. Faltan suministros en ${this.nuevoRegistro.agencia}:\n• ${detalles}\nSolicite suministros a Bodega Central.`
      );
      return;
    }

    if (this.bahiaOcupadaActual) {
      this.toastService.warning(
        'Bahía ocupada',
        `La "${this.nuevoRegistro.bahia || 'bahía seleccionada'}" ya se encuentra ocupada por el vehículo ${this.bahiaOcupadaActual.placa} (OT: ${this.bahiaOcupadaActual.ordenTrabajoOT || 'En curso'}). Seleccione otra bahía disponible.`
      );
      this.guardandoServicio = false;
      return;
    }

    const ocupada = this.servicios.find(s =>
      placasEquivalentes(s.placa, resultado.placa) &&
      (s.estado === 'EN PROCESO' || s.estado === 'EN_PROCESO' || s.estado === 'EN_ESPERA')
    );
    if (ocupada) {
      this.toastService.warning(
        'Placa en bahía',
        `${resultado.placa} ya tiene la OT ${ocupada.ordenTrabajoOT} en proceso.`
      );
      return;
    }

    // Subir vídeo de ingreso a S3 al guardar si fue grabado o seleccionado
    if (this.videoIngresoRecorder?.hasPendingUpload) {
      try {
        this.guardandoServicio = true;
        this.videoIngresoRecorder.servicioId = this.nuevoRegistro.ordenTrabajoOT || this.nuevoRegistro.placa;
        this.videoIngresoRecorder.agenciaId = this.nuevoRegistro.agencia || this.userSucursal;
        const uploadedUrl = await this.videoIngresoRecorder.uploadNow();
        if (uploadedUrl) {
          this.nuevoRegistro.videoUrl = uploadedUrl;
        }
      } catch (err: any) {
        console.error('Error al subir vídeo de ingreso:', err);
        this.toastService.error('Error de Subida a S3', err?.message || 'No se pudo subir la evidencia en vídeo al bucket.');
        this.guardandoServicio = false;
        return;
      }
    }

    if (!this.nuevoRegistro.videoUrl?.trim()) {
      this.toastService.warning(
        'Vídeo de Ingreso Requerido',
        'El vídeo de evidencia de ingreso (recepción) es un campo obligatorio para registrar la orden de trabajo.'
      );
      this.guardandoServicio = false;
      return;
    }

    const bMatch = this.bahiasSucursalForm.find(b => String(b.id) === String(this.nuevoRegistro.bahiaId))
      || this.bahiasSucursalForm.find(b => b.nombre === this.nuevoRegistro.bahia)
      || this.bahiasSucursalForm[0];
    const bahiaId = bMatch ? String(bMatch.id) : this.nuevoRegistro.bahiaId;
    const bahiaNombre = bMatch ? bMatch.nombre : this.nuevoRegistro.bahia;

    const hoyStr = new Date().toISOString().substring(0, 10);
    const ahoraStr = new Date().toTimeString().substring(0, 5);

    const payload = {
      ...this.nuevoRegistro,
      fecha: this.nuevoRegistro.fecha || hoyStr,
      horaIngreso: this.nuevoRegistro.horaIngreso || ahoraStr,
      estado: 'EN_PROCESO',
      bahiaId,
      bahia: bahiaNombre,
      servicioCatalogoId: this.nuevoRegistro.servicioId,
      insumosUtilizados: [...this.insumosConsumoForm]
    };

    this.guardandoServicio = true;
    this.servicioService.crearRegistroHojaServicio(payload as any).subscribe({
      next: (creado) => {
        this.guardandoServicio = false;
        this.toastService.success(
          'Hoja de Control Creada',
          `Servicio ${creado?.ordenTrabajoOT || this.nuevoRegistro.ordenTrabajoOT} (${creado?.placa || this.nuevoRegistro.placa}) registrado e iniciado con éxito.`
        );
        this.modalNuevoRegistroOpen = false;
        this.videoIngresoRecorder?.eliminarVideo();

        this.filtroTexto = '';
        this.filtroCategoria = 'Todas';
        this.filtrosGlobales.busqueda = '';
        this.filtrosGlobales.estado = 'Todos';
        this.currentPage = 1;
        this.agregarServicioOTFuente = null;

        this.inventarioService.cargarItems();
        this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
          this.servicios = list;
          this.recalcularServiciosFiltrados();
        });
      },
      error: (err) => {
        this.guardandoServicio = false;
        console.error('Error al crear servicio:', err);
        const backendMsg = err?.error?.message || err?.message || 'Error de comunicación al registrar el servicio.';
        this.toastService.error('No se pudo registrar servicio', Array.isArray(backendMsg) ? backendMsg.join('. ') : backendMsg);
      }
    });
  }

  abrirModalFinalizarServicio(item: VehiculoServicio) {
    if (this.isAprobador) {
      this.toastService.warning('Acceso Restringido', 'El rol Aprobador no puede finalizar servicios; solo auditar y aprobar/rechazar.');
      return;
    }

    // Resolver la OT real del servicio
    let otReal = item.ordenTrabajoOT;
    const urlBusqueda = item.videoInicialUrl || item.fotoIngresoUrl || item.video || item.foto;
    if (urlBusqueda) {
      const match = urlBusqueda.match(/\/servicios\/(?:generales|especiales)\/([^/]+)\//i);
      if (match && match[1] && match[1] !== 'sin-orden') {
        otReal = match[1].toUpperCase();
      }
    }
    if (otReal) {
      item.ordenTrabajoOT = otReal;
    }

    this.servicioAFinalizar = item;
    this.videoSalidaInput = '';
    this.observacionesSalidaInput = '';
    this.videoSalidaRecorder?.eliminarVideo();
    this.modalFinalizarServicioOpen = true;
  }

  cerrarModalFinalizarServicio() {
    this.modalFinalizarServicioOpen = false;
    this.servicioAFinalizar = null;
    this.videoSalidaRecorder?.eliminarVideo();
    this.videoSalidaInput = '';
    this.observacionesSalidaInput = '';
  }

  async confirmarFinalizarServicio() {
    if (!this.servicioAFinalizar) return;
    const item = this.servicioAFinalizar;

    // Subir vídeo de salida a S3 al finalizar si fue grabado o seleccionado
    if (this.videoSalidaRecorder?.hasPendingUpload) {
      try {
        this.finalizandoServicio = true;
        const targetOT = item.ordenTrabajoOT ||
          (item.fotoIngresoUrl || item.videoInicialUrl)?.match(/\/servicios\/(?:generales|especiales)\/([^/]+)\//i)?.[1]?.toUpperCase() ||
          item.placa ||
          item.id;

        this.videoSalidaRecorder.servicioId = targetOT;
        this.videoSalidaRecorder.agenciaId = item.agencia || item.sucursalNombre || this.userSucursal;
        const uploadedUrl = await this.videoSalidaRecorder.uploadNow();
        if (uploadedUrl) {
          this.videoSalidaInput = uploadedUrl;
        }
      } catch (err: any) {
        console.error('Error al subir vídeo de salida:', err);
        this.toastService.error('Error de Subida a S3', err?.message || 'No se pudo subir la evidencia en vídeo al bucket.');
        this.finalizandoServicio = false;
        return;
      }
    }

    if (!this.videoSalidaInput?.trim()) {
      this.toastService.warning(
        'Vídeo Final Requerido',
        'El vídeo de evidencia final (entrega del vehículo) es obligatorio para finalizar el servicio.'
      );
      this.finalizandoServicio = false;
      return;
    }

    this.finalizandoServicio = true;
    this.servicioService.finalizarServicioOperador(item.id, {
      videoUrl: this.videoSalidaInput.trim() || undefined,
      observaciones: this.observacionesSalidaInput.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.finalizandoServicio = false;
        this.modalFinalizarServicioOpen = false;
        this.servicioAFinalizar = null;
        if (res) {
          const autoAprobado = res.estado === 'APROBADO';
          const titulo = autoAprobado ? 'Servicio Finalizado y Aprobado' : 'Servicio Finalizado';
          const msg = autoAprobado
            ? `Vehículo ${item.placa} finalizado con evidencia y aprobado automáticamente.`
            : `Vehículo ${item.placa} finalizado con evidencia de entrega. Enviado a revisión del Gerente/Aprobador.`;
          this.toastService.success(titulo, msg);
          this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
            this.servicios = list;
            this.recalcularServiciosFiltrados();
          });
        }
      },
      error: (err) => {
        this.finalizandoServicio = false;
        console.error('Error al finalizar servicio:', err);
        const msg = err?.error?.message || err?.message || 'No se pudo finalizar el servicio.';
        this.toastService.error('Error al Finalizar', Array.isArray(msg) ? msg.join('. ') : msg);
      }
    });
  }

  finalizarServicio(item: VehiculoServicio) {
    this.abrirModalFinalizarServicio(item);
  }

  aprobarServicio(item: VehiculoServicio) {
    this.servicioService.aprobarServicioGerente(item.id).subscribe({
      next: (res) => {
        if (res) {
          this.toastService.success('Servicio Aprobado', `Servicio ${item.placa} aprobado por Gerencia.`);
          this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
            this.servicios = list;
            this.recalcularServiciosFiltrados();
          });
        }
      },
      error: (err) => {
        console.error('Error al aprobar servicio:', err);
        const msg = err?.error?.message || err?.message || 'No se pudo aprobar el servicio.';
        this.toastService.error('Error al Aprobar', Array.isArray(msg) ? msg.join('. ') : msg);
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
    const user = this.authService.getCurrentUser();
    const isSupervisor = this.isSupervisor;
    const isAprobador = this.isAprobador;
    const uReg = (user?.regionNombre || user?.region || '').toLowerCase();
    const uSuc = (this.userSucursal || user?.sucursalNombre || user?.sucursal || '').toLowerCase().trim();

    return this.serviciosExtras.filter(e => {
      // Scope RBAC para Especiales:
      if (this.isPulidor && !this.isSuperAdmin && !this.isAdmin) {
        // Los servicios especiales solo le salen al pulidor al que se le asignó la OT
        if (String(e.operadorId) !== String(user?.id)) return false;
      } else if (isAprobador && uSuc) {
        const hasSuc = (e.sucursales || []).some(s => s.toLowerCase().includes(uSuc) || uSuc.includes(s.toLowerCase()));
        if (!hasSuc) return false;
      } else if (isSupervisor && uReg) {
        const eReg = (e.regionNombre || '').toLowerCase();
        if (eReg && !eReg.includes(uReg) && !uReg.includes(eReg)) return false;
      }

      const matchEst = this.filtrosGlobales.estado === 'Todos' ||
        e.estado?.toLowerCase() === this.filtrosGlobales.estado?.toLowerCase() ||
        (this.filtrosGlobales.estado === 'En Proceso' && (e.estado === 'En Proceso' || e.estado === 'Pendiente')) ||
        ((this.filtrosGlobales.estado === 'Completado' || this.filtrosGlobales.estado === 'Realizados / Aprobados') && (e.estado === 'Completado' || (e.estado as string) === 'FINALIZADO'));

      const matchReg = !this.filtrosGlobales.region || this.filtrosGlobales.region === 'Todas' ||
        (e.regionNombre || '').toLowerCase().includes(this.filtrosGlobales.region.toLowerCase());

      const matchSuc = !this.filtrosGlobales.sucursal || this.filtrosGlobales.sucursal === 'Todas' ||
        (e.sucursales || []).some(s => s.toLowerCase().includes(this.filtrosGlobales.sucursal.toLowerCase()));

      const matchOp = !this.filtrosGlobales.operador || this.filtrosGlobales.operador === 'Todos' ||
        (e.operadorNombre || '').toLowerCase().includes(this.filtrosGlobales.operador.toLowerCase());

      const busq = (this.filtrosGlobales.busqueda || this.filtroTexto || '').trim().toLowerCase();
      const matchTxt = !busq ||
        e.servicioNombre.toLowerCase().includes(busq) ||
        (e.ordenTrabajoOT || '').toLowerCase().includes(busq) ||
        e.codigoSE.toLowerCase().includes(busq) ||
        (e.vehiculoInfo?.placa || e.placa || '').toLowerCase().includes(busq) ||
        e.operadorNombre.toLowerCase().includes(busq);

      return matchEst && matchReg && matchSuc && matchOp && matchTxt;
    });
  }

  get paginatedExtras() {
    const start = (this.currentPageExtras - 1) * this.pageSizeExtras;
    return this.extrasFiltrados.slice(start, start + this.pageSizeExtras);
  }

  onPageChangeExtras(page: number) { this.currentPageExtras = page; }
  onPageSizeChangeExtras(size: number) { this.pageSizeExtras = size; this.currentPageExtras = 1; }

  get puedeCrearOTEspecialConInsumos(): boolean {
    if (this.validandoStockPulidorOT) return false;
    if (!this.extraForm.servicioNombre?.trim() || !this.extraForm.operadorId || !this.extraFormPlaca?.trim()) return false;
    if (!this.extraForm.insumosReceta?.length) return false;
    return this.faltantesInsumosOT.length === 0;
  }

  validandoStockPulidorOT = false;

  private getStockCantidadInsumo(productoId: string | number, sku?: string, nombre?: string): number {
    const id = String(productoId || '');
    const byId = this.stockPulidor.find(s => String(s.insumoId) === id);
    if (byId) return Number(byId.cantidadActual || 0);
    if (sku) {
      const bySku = this.stockPulidor.find(s => String(s.codigoSKU || '').toLowerCase() === String(sku).toLowerCase());
      if (bySku) return Number(bySku.cantidadActual || 0);
    }
    if (nombre) {
      const byName = this.stockPulidor.find(s => String(s.nombre || '').toLowerCase() === String(nombre).toLowerCase());
      if (byName) return Number(byName.cantidadActual || 0);
    }
    return 0;
  }

  /** Wrapper público de getStockCantidadInsumo para uso en templates (@let). */
  getStockCantidadInsumoPublic(productoId: string | number, sku?: string, nombre?: string): number {
    return this.getStockCantidadInsumo(productoId, sku, nombre);
  }

  private recalcularFaltantesInsumosOT(): void {
    this.faltantesInsumosOT = [];
    const receta = this.extraForm.insumosReceta || [];
    if (!receta.length) {
      this.faltantesInsumosOT = ['El servicio no tiene receta de insumos configurada.'];
      return;
    }
    if (!this.extraForm.operadorId) {
      this.faltantesInsumosOT = ['Seleccione un pulidor asignado para validar su kit de insumos.'];
      return;
    }
    const totalKit = this.stockPulidor.reduce((acc, s) => acc + Number(s.cantidadActual || 0), 0);
    if (totalKit <= 0) {
      const opLabel = this.extraForm.operadorNombre ? `El pulidor ${this.extraForm.operadorNombre}` : 'El pulidor asignado';
      this.faltantesInsumosOT = [`${opLabel} no tiene insumos en su kit. Debe recibir y confirmar un despacho antes de que se le asigne la OT.`];
      return;
    }
    for (const r of receta) {
      const need = Number(r.cantidadSugerida || r.cantidad || 0);
      if (need <= 0) continue;
      const have = this.getStockCantidadInsumo(r.productoId || r.insumoId || '', r.productoSKU || r.codigoSKU, r.productoNombre || r.insumoNombre);
      if (have < need) {
        this.faltantesInsumosOT.push(
          `${r.productoNombre || r.insumoNombre || r.productoSKU}: requiere ${need} ${r.unidadMedida || ''}, disponible ${have}`
        );
      }
    }
  }

  private cargarStockPulidorParaOT(pulidorId: string | number | undefined, thenOpen = false): void {
    if (!pulidorId) {
      this.stockPulidor = [];
      this.recalcularFaltantesInsumosOT();
      if (thenOpen) this.showModalExtras = true;
      return;
    }
    this.validandoStockPulidorOT = true;
    this.extrasService.getStockPulidor(String(pulidorId)).subscribe({
      next: (st) => {
        this.stockPulidor = st || [];
        this.validandoStockPulidorOT = false;
        this.recalcularFaltantesInsumosOT();
        if (thenOpen) {
          this.showModalExtras = true;
        }
      },
      error: () => {
        this.stockPulidor = [];
        this.validandoStockPulidorOT = false;
        this.recalcularFaltantesInsumosOT();
        if (thenOpen) this.showModalExtras = true;
      }
    });
  }

  private cargarOpcionesServiciosEspeciales(): void {
    const especiales = (this.catalogoCompleto || []).filter(s => {
      const cat = String(s.categoria || '').toUpperCase();
      const activo = s.estado === 'Activo' || (s as any).estado === 1 || s.estado == null;
      return activo && cat === 'ESPECIAL';
    });
    if (this.isPulidor && this.authService.isPulidorMovil()) {
      const ids = (this.authService.getCurrentUser()?.servicioIds || []).map(Number);
      this.serviciosEspecialesOpciones = ids.length
        ? especiales.filter(s => ids.includes(Number(s.id)))
        : especiales;
    } else {
      this.serviciosEspecialesOpciones = especiales;
    }
  }

  onServicioEspecialFormChange(nombre: string): void {
    const serv = this.serviciosEspecialesOpciones.find(s => s.nombre === nombre)
      || this.catalogoCompleto.find(s => s.nombre === nombre);
    this.extraForm.servicioDescripcion = serv?.descripcion || '';
    this.extraForm.insumosReceta = serv?.insumosReceta
      ? JSON.parse(JSON.stringify(serv.insumosReceta))
      : [];
    if (this.extraFormHoraIngreso) {
      const partes = this.extraFormHoraIngreso.split(':');
      const d = new Date();
      if (partes.length === 2) {
        d.setHours(Number(partes[0]), Number(partes[1]), 0, 0);
      }
      const durMin = serv?.tiempoEstimadoMin || 60;
      const salida = new Date(d.getTime() + Math.max(1, durMin) * 60_000);
      this.extraFormHoraSalida = salida.toTimeString().substring(0, 5);
    }
    // Validar en tiempo real los insumos del pulidor asignado (móvil o fijo)
    if (this.extraForm.operadorId) {
      this.cargarStockPulidorParaOT(this.extraForm.operadorId);
    } else {
      this.recalcularFaltantesInsumosOT();
    }
  }

  abrirModalNuevoExtra() {
    this.isEditingExtras = false;
    this.editandoExtraId = null;

    // Asegurar que la lista de pulidores esté cargada antes de inicializar el formulario:
    if (this.pulidoresDisponiblesRegion.length === 0) {
      const user = this.authService.getCurrentUser();
      const regId = (this.isSuperAdmin || this.isAdmin) ? undefined : (user?.regionId ? String(user.regionId) : undefined);
      this.extrasService.getPulidoresPorRegion(regId).subscribe(list => {
        this.pulidoresDisponiblesRegion = list || [];
        this.abrirModalNuevoExtraConDatos();
      });
      return;
    }

    // Si es pulidor directo (operador de campo), validar que él mismo tenga kit antes de abrir
    if (this.isPulidor && !this.isCoordServiciosEspeciales) {
      const user = this.authService.getCurrentUser();
      const pulId = user?.id ? String(user.id) : undefined;
      this.extrasService.getStockPulidor(pulId).subscribe(st => {
        this.stockPulidor = st || [];
        const totalKit = this.stockPulidor.reduce((acc, s) => acc + Number(s.cantidadActual || 0), 0);
        if (totalKit <= 0) {
          this.toastService.warning(
            'Sin insumos en kit',
            'No puede crear una OT especial sin insumos en custodia. Solicite un despacho y confírmelo primero.'
          );
          return;
        }
        this.abrirModalNuevoExtraConDatos();
      });
      return;
    }

    this.abrirModalNuevoExtraConDatos();
  }

  private abrirModalNuevoExtraConDatos() {
    const user = this.authService.getCurrentUser();
    this.cargarOpcionesServiciosEspeciales();

    this.extraFormOT = '';
    this.extraFormPlaca = '';
    this.extraFormMarca = '';
    this.extraFormModelo = '';
    this.extraFormColor = '';
    this.extraFormCliente = '';
    this.extraFormBahiaId = '';
    this.extraFormBahia = '';
    this.extraFormVideoUrl = '';

    const ahora = new Date();
    this.extraFormHoraIngreso = ahora.toTimeString().substring(0, 5);
    const primerServicio = this.serviciosEspecialesOpciones[0];
    const durMin = primerServicio?.tiempoEstimadoMin || 60;
    const salida = new Date(ahora.getTime() + Math.max(1, durMin) * 60_000);
    this.extraFormHoraSalida = salida.toTimeString().substring(0, 5);

    // Asignación de Agencia:
    if (this.isPulidorFijo) {
      this.extraFormAgenciaId = user?.agenciaId ? String(user.agenciaId) : '';
    } else {
      const ags = this.agenciasDisponiblesParaEspecial;
      this.extraFormAgenciaId = ags.length > 0 ? String(ags[0].id) : '';
    }
    this.extraFormPrioridad = 'Media';

    // Asignar pulidor: si es pulidor, él mismo. Si es Admin o Coordinador, sugerir el fijo de la agencia o el primer móvil
    let opId = '';
    let opNombre = '';
    if (this.isPulidor) {
      opId = String(user?.id || '');
      opNombre = `${user?.nombre || ''} ${user?.apellido || ''}`.trim();
    } else {
      const fijo = this.pulidoresDisponiblesRegion.find(p => String(p.agenciaId || p.agencia?.id) === String(this.extraFormAgenciaId));
      const movil = this.pulidoresDisponiblesRegion.find(p => !p.agenciaId && !p.agencia?.id);
      const primerPulidor = fijo || movil || this.pulidoresDisponiblesRegion[0];
      if (primerPulidor) {
        opId = String(primerPulidor.id);
        opNombre = `${primerPulidor.name || ''} ${primerPulidor.lastname}`.trim();
      }
    }

    this.extraForm = {
      servicioNombre: primerServicio?.nombre || '',
      servicioDescripcion: primerServicio?.descripcion || '',
      operadorId: opId,
      operadorNombre: opNombre,
      sucursalesSeleccionadas: [],
      insumosReceta: primerServicio?.insumosReceta
        ? JSON.parse(JSON.stringify(primerServicio.insumosReceta))
        : [],
      estado: 'Pendiente',
      fechaProgramada: new Date().toISOString().substring(0, 10),
      notas: ''
    };

    this.onSucursalExtraFormChange();

    this.showModalExtras = true;
    const finalOpId = this.extraForm.operadorId || opId;
    if (finalOpId) {
      this.cargarStockPulidorParaOT(finalOpId);
    } else {
      this.stockPulidor = [];
      this.recalcularFaltantesInsumosOT();
    }
  }

  cerrarModalExtras() { this.showModalExtras = false; }

  onOperadorExtraChange() {
    const op = this.pulidoresDisponiblesRegion.find(o => String(o.id) === String(this.extraForm.operadorId));
    if (op) this.extraForm.operadorNombre = `${op.name} ${op.lastname}`.trim();
    if (this.extraForm.operadorId) {
      this.cargarStockPulidorParaOT(this.extraForm.operadorId);
    } else {
      this.stockPulidor = [];
      this.recalcularFaltantesInsumosOT();
    }
  }

  async guardarServicioExtra() {
    if (!this.extraFormOT?.trim()) {
      this.toastService.warning('Campos Incompletos', 'Ingrese el Nº de Orden de Trabajo (OT).');
      return;
    }
    const otUpper = this.extraFormOT.trim().toUpperCase();

    // Validar unicidad de OT en el cliente antes de enviar
    const existeEnEspeciales = this.serviciosExtras.some(e =>
      (e.codigoSE || (e as any).ordenTrabajoOT)?.toUpperCase() === otUpper && e.estado !== 'Cancelado'
    );
    const existeEnGenerales = this.servicios.some(s =>
      s.ordenTrabajoOT?.toUpperCase() === otUpper && s.estado !== 'CANCELADO'
    );
    if (existeEnEspeciales || existeEnGenerales) {
      this.toastService.warning('Orden de Trabajo Duplicada', `La OT "${otUpper}" ya se encuentra registrada en el sistema. Ingrese un número de OT único.`);
      return;
    }

    if (!this.extraForm.servicioNombre?.trim()) {
      this.toastService.warning('Datos incompletos', 'Ingrese el tipo de servicio especial.');
      return;
    }
    if (!this.extraForm.operadorId) {
      this.toastService.warning('Datos incompletos', 'Seleccione un pulidor asignado.');
      return;
    }
    if (!this.extraFormPlaca.trim()) {
      this.toastService.warning('Placa requerida', 'Ingrese la placa del vehículo.');
      return;
    }

    const user = this.authService.getCurrentUser();
    const agenciaIdFinal = this.isPulidorFijo ? (user?.agenciaId || '') : this.extraFormAgenciaId;
    if (!agenciaIdFinal) {
      this.toastService.warning('Agencia requerida', 'Debe seleccionar la agencia en la cual se realizará el servicio.');
      return;
    }
    if (!this.extraFormMarca.trim() || !this.extraFormModelo.trim()) {
      this.toastService.warning('Datos incompletos', 'Ingrese marca y modelo del vehículo.');
      return;
    }

    this.recalcularFaltantesInsumosOT();
    if (!this.puedeCrearOTEspecialConInsumos) {
      this.toastService.error(
        'Insumos insuficientes',
        this.faltantesInsumosOT[0] || 'No puede crear la OT: el pulidor asignado no cuenta con los insumos requeridos en su kit.'
      );
      return;
    }

    const agenciaSeleccionada = this.sucursales.find(s => String(s.id) === String(agenciaIdFinal));
    const regId = user?.regionId ? String(user.regionId) : (agenciaSeleccionada?.regionId ? String(agenciaSeleccionada.regionId) : '');
    const regNombre = this.userRegionNombre || agenciaSeleccionada?.region?.nombre || agenciaSeleccionada?.regionNombre || '';
    if (!regId && !this.isSuperAdmin && !this.isAdmin) {
      this.toastService.warning('Región requerida', 'El usuario o agencia seleccionada no tiene una región asignada en la base de datos.');
      return;
    }

    // Subida de vídeo de recepción/ingreso si está pendiente en el componente de grabación
    if (this.videoIngresoExtraRecorder?.hasPendingUpload) {
      try {
        this.videoIngresoExtraRecorder.servicioId = otUpper || this.extraFormPlaca;
        this.videoIngresoExtraRecorder.agenciaId = agenciaIdFinal || this.userSucursal;
        const uploadedUrl = await this.videoIngresoExtraRecorder.uploadNow();
        if (uploadedUrl) {
          this.extraFormVideoUrl = uploadedUrl;
        }
      } catch (err: any) {
        console.error('Error al subir vídeo de ingreso especial:', err);
        this.toastService.error('Error de Subida a S3', err?.message || 'No se pudo subir la evidencia en vídeo al bucket.');
        return;
      }
    }

    const payload: any = {
      codigoSE: otUpper,
      ordenTrabajoOT: otUpper,
      servicioNombre: this.extraForm.servicioNombre.trim(),
      tipoServicio: this.extraForm.servicioNombre.trim(),
      servicioDescripcion: this.extraForm.servicioDescripcion.trim(),
      operadorId: this.extraForm.operadorId ? String(this.extraForm.operadorId) : undefined,
      operadorNombre: this.extraForm.operadorNombre,
      agenciaId: agenciaIdFinal || undefined,
      bahiaId: this.extraFormBahiaId || undefined,
      bahia: this.extraFormBahia || undefined,
      horaIngreso: this.extraFormHoraIngreso || undefined,
      horaEstimada: this.extraFormHoraSalida || undefined,
      regionId: regId,
      regionNombre: regNombre,
      prioridad: this.extraFormPrioridad || 'Media',
      placa: this.extraFormPlaca.trim().toUpperCase(),
      color: this.extraFormColor.trim(),
      cliente: this.extraFormCliente?.trim() || undefined,
      clienteNombre: this.extraFormCliente?.trim() || undefined,
      videoInicialUrl: this.extraFormVideoUrl || undefined,
      vehiculoInfo: {
        placa: this.extraFormPlaca.trim().toUpperCase(),
        marca: this.extraFormMarca.trim(),
        modelo: this.extraFormModelo.trim(),
        color: this.extraFormColor.trim(),
        cliente: this.extraFormCliente?.trim() || undefined
      },
      insumosReceta: (this.extraForm.insumosReceta || []).map(r => ({
        ...r,
        insumoId: r.insumoId || r.productoId,
        productoId: r.insumoId || r.productoId,
        codigoSKU: r.codigoSKU || r.productoSKU,
        productoSKU: r.codigoSKU || r.productoSKU,
        insumoNombre: r.insumoNombre || r.productoNombre || (r as any).nombre,
        productoNombre: r.insumoNombre || r.productoNombre || (r as any).nombre,
        cantidad: Number(r.cantidadSugerida || r.cantidad || 0),
        cantidadSugerida: Number(r.cantidadSugerida || r.cantidad || 0),
      })),
      estado: this.extraForm.estado,
      fechaProgramada: this.extraForm.fechaProgramada,
      notas: this.extraForm.notas,
      creadoPor: `${user?.nombre || ''} ${user?.apellido || ''}`.trim()
    };

    this.extrasService.crearServicioExtra(payload).subscribe({
      next: (creado) => {
        this.toastService.success('Servicio Asignado', `Servicio ${creado.codigoSE} asignado en ${regNombre}.`);
        this.cerrarModalExtras();
        this.cargarServiciosEspeciales();
      },
      error: (err) => {
        console.error('Error al crear servicio especial:', err);
        const msg = err?.error?.message || err?.message || 'No se pudo crear el servicio especial.';
        this.toastService.error('Error al crear', Array.isArray(msg) ? msg.join('. ') : msg);
      }
    });
  }

  // ── Flujo de Evidencias en Vídeo de Especiales ──
  abrirModalIniciarEspecial(extra: ServicioExtra) {
    if (!this.puedeRealizarOT(extra)) {
      this.toastService.warning('Acceso Restringido', 'Solo el pulidor asignado a esta orden de trabajo puede iniciarla.');
      return;
    }
    this.servicioEspecialSeleccionado = extra;
    this.videoInicialInput = extra.videoInicialUrl || '';
    this.modalIniciarServicioEspecialOpen = true;
  }

  async confirmarIniciarEspecial() {
    if (!this.puedeRealizarOT(this.servicioEspecialSeleccionado)) {
      this.toastService.warning('Acceso Restringido', 'Solo el pulidor asignado a esta orden de trabajo puede iniciar el servicio.');
      return;
    }
    if (!this.servicioEspecialSeleccionado) return;

    if (this.videoInicialRecorder?.hasPendingUpload) {
      try {
        this.iniciandoEspecial = true;
        this.videoInicialRecorder.servicioId = this.servicioEspecialSeleccionado.codigoSE || this.servicioEspecialSeleccionado.placa || this.servicioEspecialSeleccionado.id;
        this.videoInicialRecorder.agenciaId = this.servicioEspecialSeleccionado.agenciaId || this.userSucursal;
        const uploadedUrl = await this.videoInicialRecorder.uploadNow();
        if (uploadedUrl) {
          this.videoInicialInput = uploadedUrl;
        }
      } catch (err: any) {
        console.error('Error al subir vídeo inicial:', err);
        this.toastService.error('Error de Subida a S3', err?.message || 'No se pudo subir la evidencia inicial al bucket.');
        this.iniciandoEspecial = false;
        return;
      }
    }

    if (!this.videoInicialInput.trim()) {
      this.toastService.warning('Vídeo Inicial Requerido', 'Debe adjuntar la evidencia en vídeo del estado inicial del vehículo.');
      this.iniciandoEspecial = false;
      return;
    }

    this.iniciandoEspecial = true;
    this.extrasService.cambiarEstado(this.servicioEspecialSeleccionado.id, 'En Proceso', this.videoInicialInput.trim()).subscribe({
      next: () => {
        this.iniciandoEspecial = false;
        this.toastService.success('Servicio Iniciado', `OT ${this.servicioEspecialSeleccionado?.codigoSE} en proceso. Evidencia inicial grabada.`);
        this.modalIniciarServicioEspecialOpen = false;
        this.cargarServiciosEspeciales();
      },
      error: (err) => {
        this.iniciandoEspecial = false;
        console.error('Error al iniciar:', err);
        this.toastService.error('Error al iniciar', 'No se pudo registrar el inicio del servicio.');
      }
    });
  }

  abrirModalFinalizarEspecial(extra: ServicioExtra) {
    if (!this.puedeRealizarOT(extra)) {
      this.toastService.warning('Acceso Restringido', 'Solo el pulidor asignado a esta orden de trabajo puede finalizarla.');
      return;
    }
    this.servicioEspecialSeleccionado = extra;
    this.videoFinalInput = extra.videoFinalUrl || '';
    this.calificacionCalidadInput = 5;
    this.notasFinalizacionInput = extra.notas || '';
    this.modalFinalizarServicioEspecialOpen = true;
  }

  async confirmarFinalizarEspecial() {
    if (!this.puedeRealizarOT(this.servicioEspecialSeleccionado)) {
      this.toastService.warning('Acceso Restringido', 'Solo el pulidor asignado a esta orden de trabajo puede finalizar el servicio.');
      return;
    }
    if (!this.servicioEspecialSeleccionado) return;

    if (this.videoFinalRecorder?.hasPendingUpload) {
      try {
        this.finalizandoEspecial = true;
        this.videoFinalRecorder.servicioId = this.servicioEspecialSeleccionado.codigoSE || this.servicioEspecialSeleccionado.placa || this.servicioEspecialSeleccionado.id;
        this.videoFinalRecorder.agenciaId = this.servicioEspecialSeleccionado.agenciaId || this.userSucursal;
        const uploadedUrl = await this.videoFinalRecorder.uploadNow();
        if (uploadedUrl) {
          this.videoFinalInput = uploadedUrl;
        }
      } catch (err: any) {
        console.error('Error al subir vídeo final:', err);
        this.toastService.error('Error de Subida a S3', err?.message || 'No se pudo subir la evidencia final al bucket.');
        this.finalizandoEspecial = false;
        return;
      }
    }

    if (!this.videoFinalInput.trim()) {
      this.toastService.warning('Vídeo Final Requerido', 'Debe adjuntar la evidencia en vídeo del vehículo terminado.');
      this.finalizandoEspecial = false;
      return;
    }

    this.finalizandoEspecial = true;
    this.extrasService.actualizarServicioExtra(this.servicioEspecialSeleccionado.id, {
      estado: 'Completado',
      videoFinalUrl: this.videoFinalInput.trim(),
      notas: this.notasFinalizacionInput
    }).subscribe({
      next: () => {
        this.finalizandoEspecial = false;
        this.toastService.success('Servicio Completado', `OT ${this.servicioEspecialSeleccionado?.codigoSE} finalizada con éxito. Insumos descontados de tu custodia.`);
        this.modalFinalizarServicioEspecialOpen = false;
        this.cargarServiciosEspeciales();
        if (this.isPulidor) {
          this.cargarStockPulidor();
        }
      },
      error: (err) => {
        this.finalizandoEspecial = false;
        console.error('Error al finalizar:', err);
        this.toastService.error('Error al finalizar', 'No se pudo completar el servicio.');
      }
    });
  }

  // ── Flujo de Pausa y Reanudación de Servicios Especiales ──
  abrirModalPausarEspecial(extra: ServicioExtra) {
    if (!this.puedeRealizarOT(extra)) {
      this.toastService.warning('Acceso Restringido', 'Solo el pulidor asignado a esta orden de trabajo puede pausar el servicio.');
      return;
    }
    this.servicioEspecialSeleccionado = extra;
    this.motivoPausaInput = 'Pausa para almuerzo / descanso reglamentario';
    this.motivoPausaDetalleInput = '';
    this.videoPausaInput = '';
    this.modalPausarServicioEspecialOpen = true;
  }

  async confirmarPausarEspecial() {
    if (!this.puedeRealizarOT(this.servicioEspecialSeleccionado)) {
      this.toastService.warning('Acceso Restringido', 'Solo el pulidor asignado a esta orden de trabajo puede pausar el servicio.');
      return;
    }
    if (!this.servicioEspecialSeleccionado) return;

    if (this.videoPausaRecorder?.hasPendingUpload) {
      try {
        this.pausandoEspecial = true;
        this.videoPausaRecorder.servicioId = this.servicioEspecialSeleccionado.codigoSE || this.servicioEspecialSeleccionado.placa || this.servicioEspecialSeleccionado.id;
        this.videoPausaRecorder.agenciaId = this.servicioEspecialSeleccionado.agenciaId || this.userSucursal;
        const uploadedUrl = await this.videoPausaRecorder.uploadNow();
        if (uploadedUrl) {
          this.videoPausaInput = uploadedUrl;
        }
      } catch (err: any) {
        console.error('Error al subir vídeo de pausa:', err);
        this.toastService.error('Error de Subida a S3', err?.message || 'No se pudo subir la evidencia de pausa al bucket.');
        this.pausandoEspecial = false;
        return;
      }
    }

    if (!this.videoPausaInput.trim()) {
      this.toastService.warning('Vídeo de Pausa Requerido', 'Debe adjuntar la evidencia en vídeo del estado en que se deja el vehículo.');
      this.pausandoEspecial = false;
      return;
    }

    const motivoFinal = this.motivoPausaDetalleInput.trim()
      ? `${this.motivoPausaInput}: ${this.motivoPausaDetalleInput.trim()}`
      : this.motivoPausaInput;

    this.pausandoEspecial = true;
    this.extrasService.pausarServicioExtra(this.servicioEspecialSeleccionado.id, motivoFinal, this.videoPausaInput.trim()).subscribe({
      next: (res) => {
        this.pausandoEspecial = false;
        this.toastService.success('Servicio Pausado', `OT ${res.codigoSE || this.servicioEspecialSeleccionado?.codigoSE} ha sido pausada exitosamente.`);
        this.modalPausarServicioEspecialOpen = false;
        this.cargarServiciosEspeciales();
      },
      error: (err) => {
        this.pausandoEspecial = false;
        console.error('Error al pausar servicio especial:', err);
        const msg = err?.error?.message || err?.message || 'No se pudo pausar el servicio especial.';
        this.toastService.error('Error al pausar', Array.isArray(msg) ? msg.join('. ') : msg);
      }
    });
  }

  abrirModalReanudarEspecial(extra: ServicioExtra) {
    if (!this.puedeRealizarOT(extra)) {
      this.toastService.warning('Acceso Restringido', 'Solo el pulidor asignado a esta orden de trabajo puede reanudar el servicio.');
      return;
    }
    this.servicioEspecialSeleccionado = extra;
    this.videoReanudarInput = '';
    this.observacionesReanudarInput = '';
    this.modalReanudarEspecialOpen = true;
  }

  async confirmarReanudarEspecial() {
    if (!this.puedeRealizarOT(this.servicioEspecialSeleccionado)) {
      this.toastService.warning('Acceso Restringido', 'Solo el pulidor asignado a esta orden de trabajo puede reanudar el servicio.');
      return;
    }
    if (!this.servicioEspecialSeleccionado) return;

    if (this.videoReanudarRecorder?.hasPendingUpload) {
      try {
        this.reanudandoEspecial = true;
        this.videoReanudarRecorder.servicioId = this.servicioEspecialSeleccionado.codigoSE || this.servicioEspecialSeleccionado.placa || this.servicioEspecialSeleccionado.id;
        this.videoReanudarRecorder.agenciaId = this.servicioEspecialSeleccionado.agenciaId || this.userSucursal;
        const uploadedUrl = await this.videoReanudarRecorder.uploadNow();
        if (uploadedUrl) {
          this.videoReanudarInput = uploadedUrl;
        }
      } catch (err: any) {
        console.error('Error al subir vídeo de reanudación:', err);
        this.toastService.error('Error de Subida a S3', err?.message || 'No se pudo subir la evidencia de reanudación al bucket.');
        this.reanudandoEspecial = false;
        return;
      }
    }

    if (!this.videoReanudarInput.trim()) {
      this.toastService.warning('Vídeo de Reanudación Requerido', 'Debe adjuntar la evidencia en vídeo de las condiciones del vehículo al reanudar.');
      this.reanudandoEspecial = false;
      return;
    }

    this.reanudandoEspecial = true;
    this.extrasService.reanudarServicioExtra(this.servicioEspecialSeleccionado.id, this.videoReanudarInput.trim(), this.observacionesReanudarInput.trim()).subscribe({
      next: (res) => {
        this.reanudandoEspecial = false;
        this.toastService.success('Servicio Reanudado', `OT ${res.codigoSE || this.servicioEspecialSeleccionado?.codigoSE} retomada en proceso.`);
        this.modalReanudarEspecialOpen = false;
        this.cargarServiciosEspeciales();
      },
      error: (err) => {
        this.reanudandoEspecial = false;
        console.error('Error al reanudar servicio especial:', err);
        const msg = err?.error?.message || err?.message || 'No se pudo reanudar el servicio especial.';
        this.toastService.error('Error al reanudar', Array.isArray(msg) ? msg.join('. ') : msg);
      }
    });
  }

  abrirDetalleEspecial(extra: ServicioExtra) {
    this.servicioEspecialSeleccionado = extra;
    this.modalDetalleEspecialOpen = true;
  }

  async verVideoGenerico(url?: string | null, titulo: string = 'Vídeo de Evidencia') {
    if (!url) {
      this.toastService.warning('Vídeo no disponible', 'No hay vídeo registrado para esta evidencia.');
      return;
    }
    this.videoGenericoTitulo = titulo;
    this.videoCurrentTime = 0;
    this.videoDuration = 0;
    this.videoBufferedSeconds = 0;
    this.videoBufferedPercent = 0;
    this.videoPlaybackPercent = 0;
    this.videoCargandoBuffer = true;
    this.videoBufferListo = false;
    this.modalVideoGenericoOpen = true;

    // Obtener URL de streaming directa (S3 Presigned) para soporte nativo de HTTP 206 Partial Content
    try {
      this.videoGenericoUrl = await this.storageUploadService.getDirectStreamingUrl(url);
    } catch {
      this.videoGenericoUrl = this.storageUploadService.resolveBackendUrl(url);
    }
  }

  onVideoMetadataLoaded(event: any): void {
    const video = event.target as HTMLVideoElement;
    if (video) {
      this.videoDuration = video.duration || 0;
      this.updateVideoBuffer(video);
    }
  }

  onVideoProgress(event: any): void {
    const video = event.target as HTMLVideoElement;
    if (video) {
      this.updateVideoBuffer(video);
    }
  }

  onVideoTimeUpdate(event: any): void {
    const video = event.target as HTMLVideoElement;
    if (video) {
      this.videoCurrentTime = video.currentTime || 0;
      this.videoPlaybackPercent = this.videoDuration > 0 ? (this.videoCurrentTime / this.videoDuration) * 100 : 0;
      this.updateVideoBuffer(video);
    }
  }

  onVideoCanPlay(event: any): void {
    const video = event.target as HTMLVideoElement;
    if (video) {
      this.updateVideoBuffer(video);
      this.videoCargandoBuffer = false;
      // Arrancar inmediatamente tan pronto los primeros 2-3 segundos de búfer estén listos
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  }

  onVideoWaiting(): void {
    this.videoCargandoBuffer = true;
  }

  onVideoPlaying(): void {
    this.videoCargandoBuffer = false;
  }

  formatTimeSec(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  private updateVideoBuffer(video: HTMLVideoElement): void {
    if (!video) return;
    if (video.buffered && video.buffered.length > 0) {
      let currentBufferEnd = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.currentTime >= video.buffered.start(i) && video.currentTime <= video.buffered.end(i)) {
          currentBufferEnd = video.buffered.end(i);
          break;
        }
      }
      if (currentBufferEnd === 0 && video.buffered.length > 0) {
        currentBufferEnd = video.buffered.end(video.buffered.length - 1);
      }
      this.videoBufferedSeconds = Math.round(currentBufferEnd * 10) / 10;
      this.videoBufferedPercent = this.videoDuration > 0 ? Math.min(100, (currentBufferEnd / this.videoDuration) * 100) : 0;
      if (this.videoBufferedSeconds >= 2.5 || this.videoBufferedPercent >= 10 || currentBufferEnd >= this.videoDuration) {
        this.videoBufferListo = true;
      }
    }
  }

  verEvidenciasPausas(extra: ServicioExtra) {
    this.servicioPausasSeleccionado = extra;
    const historial = Array.isArray(extra.historialPausas) ? extra.historialPausas : [];
    if (historial.length > 0) {
      this.pausasSeleccionadas = historial;
      this.modalPausasDetalleOpen = true;
    } else if (extra.videoUltimaPausaUrl || extra.videoPausa) {
      this.pausasSeleccionadas = [{
        id: '1',
        motivo: extra.motivoUltimaPausa || 'Pausa operativa',
        fechaInicio: extra.fechaUltimaPausa,
        videoPausaUrl: extra.videoUltimaPausaUrl || extra.videoPausa,
        videoReanudacionUrl: extra.videoUltimaReanudacionUrl || extra.videoReanudacion,
        duracionSegundos: extra.tiempoPausaTotalSeg || 0
      }];
      this.modalPausasDetalleOpen = true;
    } else {
      this.toastService.warning('Sin pausas registradas', 'Este servicio no tiene pausas registradas con evidencia.');
    }
  }

  estadoExtraClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'bg-amber-50 text-amber-700 border border-amber-300',
      'En Proceso': 'bg-blue-50 text-blue-700 border border-blue-300',
      'Pausado': 'bg-orange-100 text-orange-800 border border-orange-300',
      'Completado': 'bg-emerald-50 text-emerald-700 border border-emerald-300',
      'FINALIZADO': 'bg-emerald-50 text-emerald-700 border border-emerald-300',
      'Cancelado': 'bg-slate-100 text-slate-500 border border-slate-200'
    };
    return map[estado] || 'bg-slate-100 text-slate-500 border border-slate-200';
  }
}

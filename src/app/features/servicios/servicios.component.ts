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
  RecetaInsumoServicio,
  Bahia,
  Sucursal
} from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { Role } from '../../core/models/roles.model';
import { CatalogoServiciosMockService } from '../../core/services/catalogo-servicios-mock.service';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { ServiciosExtrasMockService } from '../../core/services/servicios-extras-mock.service';
import { OperadorMockService } from '../../core/services/operador-mock.service';
import { BahiaMockService } from '../../core/services/bahia-mock.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { MaquinariaMockService } from '../../core/services/maquinaria-mock.service';
import { IncidenteMockService } from '../../core/services/incidente-mock.service';
import { PermissionService } from '../../core/services/permission.service';
import { formatearPlaca, placasEquivalentes, validarPlaca } from '../../core/utils/placa.util';
import { resolverRangoFechas, soloFecha } from '../../core/utils/fecha-rango';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent],
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
          @if (!isAprobador) {
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
              <span class="hidden sm:inline">{{ tabActiva === 'especiales' ? 'Nueva OT (Especial)' : 'Nueva Hoja de Control (OT)' }}</span>
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
        
        <!-- Pestaña 1: Servicios Generales -->
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

        <!-- Pestaña 2: Servicios Especiales -->
        @if (tieneServiciosEspeciales) {
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

      <!-- Banner contextual para Servicios Especiales con contexto de Región y Rol -->
      @if (tabActiva === 'especiales' && tieneServiciosEspeciales) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-200/60 animate-fade-in">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <i-lucide name="star" class="w-5 h-5 fill-amber-500 text-amber-600"></i-lucide>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-sm font-extrabold text-slate-900 font-outfit">Control Regional de Servicios Especiales</h2>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 font-mono">
                  {{ userRegionNombre }}
                </span>
                @if (isCoordServiciosEspeciales) {
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                    Coordinador Zonal
                  </span>
                } @else if (isPulidor) {
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                    Pulidor Regional en Campo
                  </span>
                }
              </div>
              <p class="text-xs text-slate-600 mt-0.5">
                Flujo con evidencias en vídeo (Inicial & Final) y deducción automática de insumos en custodia del pulidor.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            @if (isCoordServiciosEspeciales || isPulidor || isAdmin || isSuperAdmin) {
              <button
                (click)="abrirModalNuevoExtra()"
                class="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide>
                <span>{{ isCoordServiciosEspeciales ? '+ Asignar a Pulidor' : '+ Nuevo Servicio Especial' }}</span>
              </button>
            }
            <span class="text-xs font-bold text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-200 self-start sm:self-auto">
              {{ extrasFiltrados.length }} OTs Especiales
            </span>
          </div>
        </div>

        <!-- Widget de Stock de Insumos en Custodia del Pulidor -->
        @if (isPulidor && stockPulidor.length > 0) {
          <div class="p-4 bg-slate-900 text-white rounded-2xl shadow-easydry border border-slate-800 animate-fade-in space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div class="flex items-center gap-2">
                <i-lucide name="package-check" class="w-4 h-4 text-emerald-400"></i-lucide>
                <h3 class="text-xs font-black uppercase tracking-wider text-slate-200">
                  Mi Inventario de Químicos en Custodia (Unidad Móvil {{ userRegionNombre }})
                </h3>
              </div>
              <span class="text-[11px] text-slate-400">
                Se descuenta automáticamente al finalizar cada servicio especial
              </span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              @for (st of stockPulidor; track st.id) {
                <div class="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                  <div class="text-[11px] font-bold text-slate-200 truncate" [title]="st.producto?.nombre">
                    {{ st.producto?.nombre }}
                  </div>
                  <div class="mt-1.5 flex items-baseline justify-between">
                    <span class="font-mono text-base font-black text-emerald-400">{{ st.cantidadDisponible }}</span>
                    <span class="text-[10px] text-slate-400 font-semibold">{{ st.producto?.unidadMedida || 'und' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Global Filter Bar (Contenedor Unificado de Filtros y Búsqueda) -->
      <app-filter-bar 
        [showSucursal]="!isOperador && tabActiva === 'generales'" 
        [showOperador]="!isOperador"
        [showBahia]="!isOperador && tabActiva === 'generales'"
        [showServicio]="true"
        [showRegion]="true"
        [showMarca]="true"
        [showEstado]="true"
        [showFechas]="false"
        [showBusqueda]="true"
        [placeholderBusqueda]="tabActiva === 'generales' ? 'Buscar placa (ej. PBX-8932) u Orden OT...' : 'Buscar placa u OT especial (ej. SE-SIE-0001)...'"
        [listaServicios]="listaServiciosFiltro"
        [listaEstados]="['Todos', 'Pendiente', 'En Proceso', 'Completado']"
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
                        class="px-2 py-0.5 rounded text-[10px] font-extrabold block w-fit mb-1 border bg-blue-100 text-blue-800 border-blue-300">
                        Servicios Generales
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
                      <div class="flex items-center justify-end gap-1">
                        @if (canFinalizar(item)) {
                          <button
                            (click)="finalizarServicio(item)"
                            title="Finalizar servicio e ingresar insumos"
                            class="px-2.5 py-1 bg-easydry-blue/10 hover:bg-easydry-blue text-easydry-blue hover:text-white rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold shadow-2xs">
                            <i-lucide name="check-circle" class="w-3.5 h-3.5"></i-lucide>
                            <span>Finalizar</span>
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
                  <div class="flex items-center gap-1.5 text-slate-500">
                    <i-lucide name="clock" class="w-3.5 h-3.5"></i-lucide>
                    <span>{{ item.horaIngreso || '08:30' }}</span>
                  </div>
                  <div class="font-semibold text-slate-700">
                    {{ item.servicio }}
                  </div>
                </div>
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
                  <th class="py-3.5 px-4">Nº OT Especial</th>
                  <th class="py-3.5 px-4">Vehículo & Placa</th>
                  <th class="py-3.5 px-4">Servicio Especial</th>
                  <th class="py-3.5 px-4">Región</th>
                  <th class="py-3.5 px-4">Pulidor Responsable</th>
                  <th class="py-3.5 px-4 text-center">Vídeo Inicial</th>
                  <th class="py-3.5 px-4 text-center">Vídeo Final</th>
                  <th class="py-3.5 px-4 text-center">Calidad</th>
                  <th class="py-3.5 px-4">Estado</th>
                  <th class="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (extra of paginatedExtras; track extra.id) {
                  <tr class="hover:bg-amber-50/30 transition-colors">
                    <td class="py-3.5 px-4">
                      <span class="font-mono font-black text-xs text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg block w-fit border border-amber-300">
                        {{ extra.codigoSE }}
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

                    <!-- Evidencia Vídeo Inicial -->
                    <td class="py-3.5 px-4 text-center">
                      @if (extra.videoInicialUrl) {
                        <button
                          (click)="verVideoGenerico(extra.videoInicialUrl, 'Vídeo Inicial OT: ' + extra.codigoSE)"
                          class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                          <i-lucide name="video" class="w-3.5 h-3.5 text-amber-600"></i-lucide>
                          <span>Ver Inicial</span>
                        </button>
                      } @else {
                        <span class="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                          Requerido al Iniciar
                        </span>
                      }
                    </td>

                    <!-- Evidencia Vídeo Final -->
                    <td class="py-3.5 px-4 text-center">
                      @if (extra.videoFinalUrl) {
                        <button
                          (click)="verVideoGenerico(extra.videoFinalUrl, 'Vídeo Final OT: ' + extra.codigoSE)"
                          class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                          <i-lucide name="film" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                          <span>Ver Final</span>
                        </button>
                      } @else {
                        <span class="text-xs text-slate-400 font-mono">-</span>
                      }
                    </td>

                    <!-- Calificación de Calidad -->
                    <td class="py-3.5 px-4 text-center">
                      @if (extra.calificacionCalidad) {
                        <span class="text-amber-500 font-black text-xs inline-flex items-center gap-0.5">
                          ★ {{ extra.calificacionCalidad }}/5
                        </span>
                      } @else {
                        <span class="text-xs text-slate-400">-</span>
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
                          <button
                            (click)="abrirModalIniciarEspecial(extra)"
                            class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                            <i-lucide name="play" class="w-3 h-3"></i-lucide>
                            <span>Iniciar</span>
                          </button>
                        }

                        @if (extra.estado === 'En Proceso') {
                          <button
                            (click)="abrirModalFinalizarEspecial(extra)"
                            class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                            <i-lucide name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
                            <span>Finalizar</span>
                          </button>
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
                    <td colspan="10" class="py-12 text-center text-slate-400 text-xs font-medium">
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
                      {{ extra.codigoSE }}
                    </span>
                    <div class="font-bold text-slate-900 text-sm mt-1.5">{{ extra.vehiculoInfo?.marca }} {{ extra.vehiculoInfo?.modelo }}</div>
                    <div class="text-[11px] font-mono font-black text-easydry-blue">{{ extra.vehiculoInfo?.placa || extra.placa }}</div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-center"
                    [ngClass]="estadoExtraClass(extra.estado)">
                    {{ extra.estado }}
                  </span>
                </div>

                <div class="text-xs font-semibold text-slate-700 mb-2">
                  {{ extra.servicioNombre }}
                </div>

                <div class="flex items-center justify-between mt-3 text-xs gap-2 pt-2 border-t border-slate-100">
                  <div class="flex items-center gap-1 text-slate-500 truncate">
                    <i-lucide name="user" class="w-3.5 h-3.5 text-amber-600 shrink-0"></i-lucide>
                    <span class="truncate">{{ extra.operadorNombre }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    @if (extra.estado === 'Pendiente') {
                      <button (click)="abrirModalIniciarEspecial(extra)" class="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold">Iniciar</button>
                    }
                    @if (extra.estado === 'En Proceso') {
                      <button (click)="abrirModalFinalizarEspecial(extra)" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">Finalizar</button>
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
        
        <form (ngSubmit)="guardarHojaServicio()" class="space-y-5">
          
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-easydry-blue flex items-center justify-between">
            <span>REGISTRO DE ORDEN DE TRABAJO (OT)</span>
            <span class="font-mono">Fecha: {{ nuevoRegistro.fecha }}</span>
          </div>

          <!-- Asignación Operativa: Sucursal, Bahía y Operador (Trazabilidad) -->
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <i-lucide name="map-pin" class="w-4 h-4 text-easydry-blue"></i-lucide>
                Asignación de Sucursal, Bahía & Operador
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
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Bahía de Atención</label>
                <select
                  [(ngModel)]="nuevoRegistro.bahia"
                  name="bahiaSelect"
                  (change)="onBahiaFormChange()"
                  class="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                  <option value="Sin Bahía Específica">Sin Bahía Específica</option>
                  @for (b of bahiasSucursalForm; track b.id) {
                    <option [value]="b.nombre">{{ b.nombre }} - {{ b.operadorAsignado ? b.operadorAsignado : 'Sin asignar' }}</option>
                  }
                </select>
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
              <input type="text" [(ngModel)]="nuevoRegistro.ordenTrabajoOT" name="ordenTrabajoOT" placeholder="OT-9840" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-easydry-blue focus:border-easydry-blue focus:ring-easydry-blue" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Placa Vehículo *</label>
              <input
                type="text"
                [ngModel]="nuevoRegistro.placa"
                (ngModelChange)="onPlacaChange($event)"
                name="placa"
                placeholder="PBX-1234"
                maxlength="8"
                autocomplete="off"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wide focus:border-easydry-blue focus:ring-easydry-blue"
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

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Marca *</label>
              <input type="text" [(ngModel)]="nuevoRegistro.marca" name="marca" placeholder="Toyota" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Modelo *</label>
              <input type="text" [(ngModel)]="nuevoRegistro.modelo" name="modelo" placeholder="Corolla Cross" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Color *</label>
              <input type="text" [(ngModel)]="nuevoRegistro.color" name="color" placeholder="Blanco" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" required>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Ingreso *</label>
              <input type="time" [(ngModel)]="nuevoRegistro.horaIngreso" name="horaIngreso" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Salida Estimada *</label>
              <input type="time" [(ngModel)]="nuevoRegistro.horaSalida" name="horaSalida" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" required>
            </div>
          </div>

          <!-- Category and Specific Service -->
          <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Categoría de Servicio *</label>
            
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

            @if (insumosConsumoForm.length === 0) {
              <p class="text-xs text-slate-400 italic">No hay insumos agregados para este servicio.</p>
            } @else {
              <div class="space-y-2">
                @for (ins of insumosConsumoForm; track ins.productoId; let idx = $index) {
                  <div 
                    class="p-2.5 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition-colors"
                    [ngClass]="getStockDisponible(ins.productoId) < ins.cantidad ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200'">
                    <div class="overflow-hidden flex-1">
                      <p class="font-bold text-slate-900 text-xs truncate">{{ ins.productoNombre }}</p>
                      <div class="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                        <span class="font-mono bg-slate-100 px-1 py-0.2 rounded">{{ ins.productoSKU }}</span>
                        <span>•</span>
                        <span [class.text-rose-700]="getStockDisponible(ins.productoId) < ins.cantidad" [class.text-easydry-blue]="getStockDisponible(ins.productoId) >= ins.cantidad" class="font-semibold">
                          Stock en {{ nuevoRegistro.agencia }}: {{ getStockDisponible(ins.productoId) }} {{ ins.unidadMedida }}
                        </span>
                        @if (getStockDisponible(ins.productoId) <= 0) {
                          <span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold text-[9px]">¡Agotado en Agencia!</span>
                        } @else if (getStockDisponible(ins.productoId) < ins.cantidad) {
                          <span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold text-[9px]">¡Stock Insuficiente (Faltan {{ (ins.cantidad - getStockDisponible(ins.productoId)).toFixed(2) }} {{ ins.unidadMedida }})!</span>
                        }
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <button type="button" (click)="disminuirCantidadInsumo(idx)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 font-extrabold flex items-center justify-center text-slate-700">-</button>
                      <input type="number" [(ngModel)]="ins.cantidad" [name]="'cant_' + idx" min="0.01" step="0.1" class="w-14 text-center p-1 border rounded-lg text-xs font-mono font-bold text-easydry-blue">
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

            <!-- Selector para añadir insumo extra -->
            <div class="flex items-center gap-2 pt-1">
              <select #selectInsumoExtra class="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800">
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
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Evidencia Vídeo de Ingreso</label>
            
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
          <button 
            (click)="guardarHojaServicio()" 
            [disabled]="tieneInsumosSinStock"
            [class.opacity-50]="tieneInsumosSinStock"
            [class.cursor-not-allowed]="tieneInsumosSinStock"
            class="w-full sm:w-auto px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all">
            Guardar e Iniciar Servicio
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

            <div class="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-amber-300 space-y-3">
              <label class="block text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                <i-lucide name="video" class="w-4 h-4 text-amber-600"></i-lucide>
                <span>Vídeo de Evidencia Inicial (Obligatorio para Iniciar)</span>
              </label>
              <p class="text-[11px] text-slate-500">
                Registra o sube el vídeo del estado de recepción y pintura del vehículo antes de iniciar el pulido.
              </p>

              <div>
                <input
                  type="text"
                  [(ngModel)]="videoInicialInput"
                  placeholder="URL o enlace del vídeo inicial (ej. https://.../video_inicial.mp4)"
                  class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono">
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  (click)="agregarVideoInicialDemo()"
                  class="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer">
                  <i-lucide name="sparkles" class="w-3.5 h-3.5 text-amber-700"></i-lucide>
                  <span>+ Usar Vídeo de Inspección Inicial Demo</span>
                </button>
              </div>
            </div>
          </div>
        }

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button (click)="modalIniciarServicioEspecialOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button
            (click)="confirmarIniciarEspecial()"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs">
            <i-lucide name="play" class="w-3.5 h-3.5"></i-lucide>
            <span>Iniciar Trabajo</span>
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

            <div class="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-emerald-300 space-y-3">
              <label class="block text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                <i-lucide name="film" class="w-4 h-4 text-emerald-600"></i-lucide>
                <span>Vídeo de Evidencia Final / Entrega (Obligatorio)</span>
              </label>
              <p class="text-[11px] text-slate-500">
                Registra o sube el vídeo demostrando el acabado de brillo, protección cerámica y corrección de pintura.
              </p>

              <div>
                <input
                  type="text"
                  [(ngModel)]="videoFinalInput"
                  placeholder="URL o enlace del vídeo final (ej. https://.../video_final.mp4)"
                  class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono">
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  (click)="agregarVideoFinalDemo()"
                  class="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer">
                  <i-lucide name="sparkles" class="w-3.5 h-3.5 text-emerald-700"></i-lucide>
                  <span>+ Usar Vídeo de Acabado Final Demo</span>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Calificación de Calidad</label>
                <select [(ngModel)]="calificacionCalidadInput" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                  <option [ngValue]="5">⭐⭐⭐⭐⭐ 5 Estrellas (Excelente)</option>
                  <option [ngValue]="4">⭐⭐⭐⭐ 4 Estrellas (Muy Bueno)</option>
                  <option [ngValue]="3">⭐⭐⭐ 3 Estrellas (Aceptable)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones / Notas</label>
                <input
                  type="text"
                  [(ngModel)]="notasFinalizacionInput"
                  placeholder="Ej. Pulido de 3 pasos finalizado sin novedades..."
                  class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
              </div>
            </div>
          </div>
        }

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button (click)="modalFinalizarServicioEspecialOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button
            (click)="confirmarFinalizarEspecial()"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs">
            <i-lucide name="check-circle" class="w-3.5 h-3.5"></i-lucide>
            <span>Finalizar y Descontar Químicos</span>
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
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Nº OT Especial</span>
                <span class="font-mono font-black text-amber-800">{{ servicioEspecialSeleccionado.codigoSE }}</span>
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

            <!-- Evidencias en Vídeo -->
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[10px] text-slate-400 font-bold uppercase mb-1">Vídeo Inicial</span>
                @if (servicioEspecialSeleccionado.videoInicialUrl) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoInicialUrl, 'Vídeo Inicial OT: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide name="play" class="w-3.5 h-3.5"></i-lucide>
                    <span>Ver Inicial</span>
                  </button>
                } @else {
                  <span class="text-[11px] text-slate-400 italic">No registrado</span>
                }
              </div>

              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[10px] text-slate-400 font-bold uppercase mb-1">Vídeo Final</span>
                @if (servicioEspecialSeleccionado.videoFinalUrl) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoFinalUrl, 'Vídeo Final OT: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide name="play" class="w-3.5 h-3.5"></i-lucide>
                    <span>Ver Final</span>
                  </button>
                } @else {
                  <span class="text-[11px] text-slate-400 italic">No registrado</span>
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

        <div class="space-y-4">
          <div class="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            <video
              [src]="videoGenericoUrl"
              controls
              autoplay
              class="w-full h-full object-contain">
            </video>
          </div>
        </div>

        <div modal-footer class="w-full sm:w-auto">
          <button (click)="modalVideoGenericoOpen = false" class="w-full sm:w-auto px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs">Cerrar Reproductor</button>
        </div>
      </app-modal>

      <!-- Modal Crear / Asignar Servicio Especial (Restringido a Región) -->
      <app-modal
        [isOpen]="showModalExtras"
        [title]="isCoordServiciosEspeciales ? 'Asignar Servicio Especial a Pulidor de ' + userRegionNombre : 'Registrar Nuevo Servicio Especial'"
        icon="star"
        (close)="cerrarModalExtras()">

        <form (ngSubmit)="guardarServicioExtra()" class="space-y-4">
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 flex items-center justify-between">
            <span>ZONA OPERATIVA: {{ userRegionNombre }}</span>
            <span class="font-mono">Fecha: {{ extraForm.fechaProgramada }}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Servicio Especial *</label>
              <input
                type="text"
                [(ngModel)]="extraForm.servicioNombre"
                name="servicioNombreExtra"
                placeholder="Ej. Pulido y Corrección de Pintura en 3 Pasos"
                class="w-full p-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Pulidor Asignado *</label>
              <select
                [(ngModel)]="extraForm.operadorId"
                name="operadorIdExtra"
                (change)="onOperadorExtraChange()"
                [disabled]="isPulidor"
                class="w-full p-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100">
                @for (p of pulidoresDisponiblesRegion; track p.id) {
                  <option [value]="p.id">{{ p.name }} {{ p.lastname }} ({{ p.email }})</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Placa *</label>
              <input
                type="text"
                [(ngModel)]="extraFormPlaca"
                name="extraPlaca"
                placeholder="PBX-1001"
                class="w-full p-2.5 border rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-amber-500"
                required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Marca *</label>
              <input
                type="text"
                [(ngModel)]="extraFormMarca"
                name="extraMarca"
                placeholder="Toyota"
                class="w-full p-2.5 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Modelo *</label>
              <input
                type="text"
                [(ngModel)]="extraFormModelo"
                name="extraModelo"
                placeholder="Fortuner"
                class="w-full p-2.5 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                required>
            </div>
          </div>

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
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide>
            <span>Crear y Notificar Servicio</span>
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
    if (this.isAprobador) {
      this.toastService.warning('Acceso Restringido', 'El rol Aprobador no tiene permisos para crear órdenes de trabajo.');
      return;
    }
    if (this.tabActiva === 'especiales' || this.isCoordServiciosEspeciales || this.isPulidor) {
      this.abrirModalNuevoExtra();
      return;
    }
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
    this.nuevoRegistro.horaSalida = '';
    this.nuevoRegistro.foto = '';
    this.nuevoRegistro.videoUrl = '';
    this.nuevoRegistro.fecha = new Date().toISOString().substring(0, 10);
    this.nuevoRegistro.horaIngreso = new Date().toTimeString().substring(0, 5);
    this.placaTocada = false;
    this.videoFileSelected = false;
    this.videoFileName = '';
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
   * REGLA DE NEGOCIO: Solo no permitir si no se dispone de stock de uno de los suministros necesarios
   */
  get tieneInsumosSinStock(): boolean {
    if (!this.insumosConsumoForm || this.insumosConsumoForm.length === 0) return false;
    return this.insumosConsumoForm.some(ins => {
      const stock = this.getStockDisponible(ins.productoId);
      return stock < ins.cantidad;
    });
  }

  get insumosSinStockDetalle(): string[] {
    if (!this.insumosConsumoForm) return [];
    return this.insumosConsumoForm
      .filter(ins => this.getStockDisponible(ins.productoId) < ins.cantidad)
      .map(ins => {
        const stock = this.getStockDisponible(ins.productoId);
        return `${ins.productoNombre} (Disponible: ${stock} ${ins.unidadMedida}, Requerido: ${ins.cantidad} ${ins.unidadMedida})`;
      });
  }

  productosInventario: InventarioItem[] = [];
  insumosConsumoForm: InsumoConsumidoServicio[] = [];
  despachosPendientesLider: any[] = [];

  private catalogoMock = inject(CatalogoServiciosMockService);
  private sucursalService = inject(SucursalMockService);
  private extrasMock = inject(ServiciosExtrasMockService);
  private operadorService = inject(OperadorMockService);
  private bahiaService = inject(BahiaMockService);
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
  sucursales: Sucursal[] = [];
  bahiasSucursalForm: Bahia[] = [];
  sucursalesDisponibles: string[] = [];

  busquedaExtras = '';
  filtroEstadoExtras = 'TODOS';
  filtroOperadorExtras = 0;

  currentPageExtras = 1;
  pageSizeExtras = 5;

  showModalExtras = false;
  isEditingExtras = false;
  editandoExtraId: number | null = null;

  extraFormPlaca = '';
  extraFormMarca = '';
  extraFormModelo = '';
  extraFormColor = 'Plata';

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
  pulidoresDisponiblesRegion: any[] = [];
  modalIniciarServicioEspecialOpen = false;
  modalFinalizarServicioEspecialOpen = false;
  modalDetalleEspecialOpen = false;
  modalVideoGenericoOpen = false;
  videoGenericoUrl = '';
  videoGenericoTitulo = '';
  servicioEspecialSeleccionado?: ServicioExtra;
  videoInicialInput = '';
  videoFinalInput = '';
  calificacionCalidadInput = 5;
  notasFinalizacionInput = '';

  // ── Role helpers ──
  get isOperador() { return this.authService.hasRole(Role.OPERADOR); }
  get isLiderOperador() { return this.authService.isLiderOperador(); }
  get isCoordServiciosEspeciales() { return this.authService.hasRole(Role.COORD_SERVICIOS_ESPECIALES); }
  get isPulidor() {
    return this.authService.hasAnyRole([Role.PULIDOR_MOVIL, Role.PULIDOR_FIJO, Role.OPERADOR_SERVICIOS_ESPECIALES]);
  }
  get isOperadorEspeciales() {
    return this.isCoordServiciosEspeciales || this.isPulidor;
  }
  get userRegionNombre(): string {
    const u = this.authService.getCurrentUser();
    return u?.region || u?.regionNombre || (u?.regionId === 'REG-COSTA' ? 'Costa' : 'Sierra');
  }
  get isGerente() { return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN, Role.GERENTE]); }
  get isSuperAdmin() { return this.authService.hasRole(Role.SUPER_ADMIN); }
  get isAdmin() { return this.authService.isAdmin(); }
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
    return !this.isAprobador && this.authService.hasAnyRole([Role.OPERADOR, Role.LIDER_OPERADOR, Role.LIDER_AGENCIA, Role.OPERADOR_SERVICIOS_ESPECIALES])
      && this.permissions.canRegistrarIncidente();
  }

  /** Solo Gerente y SuperAdmin pueden aprobar servicios */
  get canApprove() {
    return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.ADMIN, Role.GERENTE]);
  }

  /** Helper para obtener filtros de alcance del usuario */
  private _getFiltrosUsuario(): { agenciaId?: string } | undefined {
    const user = this.authService.getCurrentUser();
    if (this.isAprobador && user?.agenciaId) {
      return { agenciaId: String(user.agenciaId) };
    }
    return undefined;
  }

  /** El operador / líder / admin puede finalizar servicios en proceso o en cola (Aprobador NO puede) */
  canFinalizar(item: VehiculoServicio): boolean {
    if (this.isAprobador) return false;
    const estado = (item.estado || '').toUpperCase();
    return estado === 'EN PROCESO' || estado === 'EN_PROCESO' || estado === 'EN COLA' || estado === 'EN_ESPERA';
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();

    // Si el usuario es de servicios especiales, pre-seleccionar pestaña de especiales
    if (this.isCoordServiciosEspeciales || this.isPulidor) {
      this.tabActiva = 'especiales';
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

    this.catalogoMock.getServiciosActivos().subscribe(cat => {
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
      this.sucursalServicioIds = suc?.servicioIds?.length ? suc.servicioIds : null;

      // Construir mapa sucursal -> región para el filtro de región y lista disponible
      this.sucursalesDisponibles = list.map(s => s.nombre).filter(Boolean);
      this.mapaRegionSucursal = {};
      this.mapaMarcaSucursal = {};
      list.forEach(s => {
        if (s.nombre && s.regionNombre) this.mapaRegionSucursal[s.nombre] = s.regionNombre;
        if (s.nombre && s.marcaNombre) this.mapaMarcaSucursal[s.nombre] = s.marcaNombre;
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
    if (this.isCoordServiciosEspeciales && user?.regionId) {
      filtro.regionId = String(user.regionId);
    } else if (this.isPulidor && user?.id) {
      filtro.operadorId = String(user.id);
    }

    this.extrasMock.getServiciosExtras(filtro).subscribe(extras => {
      this.serviciosExtras = extras || [];
      if (this.serviciosExtras.length > 0) {
        this.tieneServiciosEspeciales = true;
      }
    });
  }

  cargarPulidoresRegion() {
    const user = this.authService.getCurrentUser();
    const regId = user?.regionId ? String(user.regionId) : undefined;
    this.extrasMock.getPulidoresPorRegion(regId).subscribe(list => {
      this.pulidoresDisponiblesRegion = list || [];
    });
  }

  cargarStockPulidor() {
    const user = this.authService.getCurrentUser();
    const pulId = user?.id ? String(user.id) : undefined;
    this.extrasMock.getStockPulidor(pulId).subscribe(st => {
      this.stockPulidor = st || [];
    });
  }

  recalcularTieneServiciosEspeciales(): void {
    const user = this.authService.getCurrentUser();
    if (!user) { this.tieneServiciosEspeciales = false; return; }

    if (this.isSuperAdmin || this.isAdmin || this.isGerente || this.isOperadorEspeciales) {
      this.tieneServiciosEspeciales = true;
      return;
    }

    const hayServiciosEspeciales = this.servicios.some(s =>
      s.categoriaServicio === 'Servicios Especiales' ||
      s.categoriaServicio === 'ESPECIAL' ||
      s.categoriaServicio === 'EXTRA' ||
      s.categoriaServicio === 'Servicios Extras'
    ) || this.serviciosExtras.length > 0;
    
    if (hayServiciosEspeciales) {
      this.tieneServiciosEspeciales = true;
      return;
    }

    const sucClean = (user.sucursalNombre || user.sucursal || (user as any).agencia || '').toLowerCase().trim();

    if (!sucClean && !user.agenciaId) {
      this.tieneServiciosEspeciales = true;
      return;
    }

    const suc = this.sucursales.find(s =>
      (user.agenciaId && String(s.id) === String(user.agenciaId)) ||
      (s.liderOperadorId && (user as any).id && String(s.liderOperadorId) === String((user as any).id)) ||
      (s.nombre && s.nombre.toLowerCase() === sucClean) ||
      (s.nombre && sucClean && (s.nombre.toLowerCase().includes(sucClean) || sucClean.includes(s.nombre.toLowerCase())))
    ) || this.sucursalService.getSucursalPorNombre(user.sucursalNombre || user.sucursal);

    if (!suc) {
      this.tieneServiciosEspeciales =
        Boolean(user.agenciaId !== undefined && user.agenciaId !== null && user.agenciaId !== ''
          ? this.sucursalService.hasServiciosEspecialesActivos(user.agenciaId, sucClean)
          : false);
      return;
    }

    const espIds = new Set(
      (this.catalogoCompleto || [])
        .filter(c => c.categoria === 'ESPECIAL' || c.categoria === 'EXTRA')
        .map(c => c.id)
    );
    const espNombres = new Set(
      (this.catalogoCompleto || [])
        .filter(c => c.categoria === 'ESPECIAL' || c.categoria === 'EXTRA')
        .map(c => c.nombre?.toLowerCase().trim())
    );

    this.tieneServiciosEspeciales =
      Boolean((suc as any).tieneServiciosEspeciales) ||
      Boolean(suc.servicioIds?.some((id: number) => espIds.has(id))) ||
      Boolean(suc.serviciosNombres?.some((n: string) => espNombres.has(String(n).toLowerCase().trim())));

    if (!this.tieneServiciosEspeciales && this.tabActiva === 'especiales') {
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
    if (serv) {
      this.nuevoRegistro.servicioId = serv.id;
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

  getStockDisponible(productoId: number | string): number {
    return this.inventarioService.getStockDisponibleSucursal(productoId, this.nuevoRegistro.agencia);
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
    if (suc?.servicioIds?.length) {
      this.sucursalServicioIds = suc.servicioIds;
    }
    const sucId = suc ? String(suc.id) : this.nuevoRegistro.agencia;
    if (sucId) {
      this.bahiaService.getBahiasPorSucursal(sucId).subscribe(bahias => {
        this.bahiasSucursalForm = bahias || [];
        if (this.bahiasSucursalForm.length > 0) {
          const matchBahia = this.bahiasSucursalForm.find(b => b.nombre === this.nuevoRegistro.bahia || b.id === this.nuevoRegistro.bahiaId);
          if (matchBahia) {
            this.nuevoRegistro.bahia = matchBahia.nombre;
            this.nuevoRegistro.bahiaId = String(matchBahia.id);
          } else {
            this.nuevoRegistro.bahia = this.bahiasSucursalForm[0].nombre;
            this.nuevoRegistro.bahiaId = String(this.bahiasSucursalForm[0].id);
          }
          this.onBahiaFormChange();
        }
      });
    }
  }

  onBahiaFormChange(): void {
    const b = this.bahiasSucursalForm.find(x => x.nombre === this.nuevoRegistro.bahia || x.id === this.nuevoRegistro.bahiaId);
    if (b) {
      this.nuevoRegistro.bahia = b.nombre;
      this.nuevoRegistro.bahiaId = String(b.id);
      if (b.operadorAsignado && b.operadorAsignado !== 'Sin Asignar') {
        this.nuevoRegistro.empleado = b.operadorAsignado;
      }
    }
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
    const userSucClean = (this.userSucursal || user?.sucursalNombre || user?.sucursal || (user as any)?.agencia || '').replace(/EasyDry\s*/i, '').toLowerCase().trim();

    let resultados = this.servicios.filter(s => {
      if (!isSuper && userSucClean) {
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
    if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
      resultados = resultados.filter(s =>
        this.mapaMarcaSucursal[s.agencia] === this.filtrosGlobales.marca
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
        'Stock Insuficiente',
        `No se puede iniciar el servicio. Faltan suministros en la agencia:\n• ${detalles}\nSolicite suministros a Bodega Central.`
      );
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

    const bMatch = this.bahiasSucursalForm.find(b => b.nombre === this.nuevoRegistro.bahia || b.id === this.nuevoRegistro.bahiaId)
      || this.bahiasSucursalForm[0];
    const bahiaId = bMatch?.id || this.nuevoRegistro.bahiaId;

    const hoyStr = new Date().toISOString().substring(0, 10);
    const ahoraStr = new Date().toTimeString().substring(0, 5);

    const payload = {
      ...this.nuevoRegistro,
      fecha: this.nuevoRegistro.fecha || hoyStr,
      horaIngreso: this.nuevoRegistro.horaIngreso || ahoraStr,
      estado: 'EN_PROCESO',
      bahiaId,
      servicioCatalogoId: this.nuevoRegistro.servicioId,
      insumosUtilizados: [...this.insumosConsumoForm]
    };

    this.servicioService.crearRegistroHojaServicio(payload as any).subscribe({
      next: (creado) => {
        this.toastService.success(
          'Hoja de Control Creada',
          `Servicio ${creado?.ordenTrabajoOT || this.nuevoRegistro.ordenTrabajoOT} (${creado?.placa || this.nuevoRegistro.placa}) registrado e iniciado con éxito.`
        );
        this.modalNuevoRegistroOpen = false;

        this.filtroTexto = '';
        this.filtroCategoria = 'Todas';
        this.filtrosGlobales.busqueda = '';
        this.filtrosGlobales.estado = 'Todos';
        this.currentPage = 1;

        this.inventarioService.cargarItems();
        this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
          this.servicios = list;
          this.recalcularServiciosFiltrados();
        });
      },
      error: (err) => {
        console.error('Error al crear servicio:', err);
        const backendMsg = err?.error?.message || err?.message || 'Error de comunicación al registrar el servicio.';
        this.toastService.error('No se pudo registrar servicio', Array.isArray(backendMsg) ? backendMsg.join('. ') : backendMsg);
      }
    });
  }

  finalizarServicio(item: VehiculoServicio) {
    if (this.isAprobador) {
      this.toastService.warning('Acceso Restringido', 'El rol Aprobador no puede finalizar servicios; solo auditar y aprobar/rechazar.');
      return;
    }
    this.servicioService.finalizarServicioOperador(item.id).subscribe({
      next: (res) => {
        if (res) {
          const autoAprobado = res.estado === 'APROBADO';
          const titulo = autoAprobado ? 'Servicio Finalizado y Aprobado' : 'Servicio Finalizado';
          const msg = autoAprobado
            ? `Vehículo ${item.placa} finalizado y aprobado automáticamente (agencia sin aprobador asignado).`
            : `Vehículo ${item.placa} finalizado. Enviado a revisión del Gerente/Aprobador.`;
          this.toastService.success(titulo, msg);
          this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
            this.servicios = list;
            this.recalcularServiciosFiltrados();
          });
        }
      },
      error: (err) => {
        console.error('Error al finalizar servicio:', err);
        const msg = err?.error?.message || err?.message || 'No se pudo finalizar el servicio.';
        this.toastService.error('Error al Finalizar', Array.isArray(msg) ? msg.join('. ') : msg);
      }
    });
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
    return this.serviciosExtras.filter(e => {
      const matchEst = this.filtrosGlobales.estado === 'Todos' ||
        e.estado?.toLowerCase() === this.filtrosGlobales.estado?.toLowerCase() ||
        (this.filtrosGlobales.estado === 'En Proceso' && e.estado === 'En Proceso') ||
        (this.filtrosGlobales.estado === 'Completado' && (e.estado === 'Completado' || (e.estado as string) === 'FINALIZADO'));

      const matchReg = !this.filtrosGlobales.region || this.filtrosGlobales.region === 'Todas' ||
        (e.regionNombre || '').toLowerCase().includes(this.filtrosGlobales.region.toLowerCase());

      const matchOp = !this.filtrosGlobales.operador || this.filtrosGlobales.operador === 'Todos' ||
        (e.operadorNombre || '').toLowerCase().includes(this.filtrosGlobales.operador.toLowerCase());

      const matchTxt = !this.filtroTexto ||
        e.servicioNombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        e.codigoSE.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (e.vehiculoInfo?.placa || e.placa || '').toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        e.operadorNombre.toLowerCase().includes(this.filtroTexto.toLowerCase());

      return matchEst && matchReg && matchOp && matchTxt;
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
    const user = this.authService.getCurrentUser();
    
    // Asignar primer pulidor disponible de la región
    const primerPulidor = this.pulidoresDisponiblesRegion[0];
    const opId = this.isPulidor ? (user?.id || '') : (primerPulidor?.id || '');
    const opNombre = this.isPulidor ? `${user?.nombre || ''} ${user?.apellido || ''}`.trim() : (primerPulidor ? `${primerPulidor.name} ${primerPulidor.lastname}`.trim() : 'Sin asignar');

    this.extraFormPlaca = '';
    this.extraFormMarca = 'Toyota';
    this.extraFormModelo = 'Fortuner';
    this.extraFormColor = 'Plata';

    this.extraForm = {
      servicioNombre: 'Pulido y Corrección de Pintura en 3 Pasos',
      servicioDescripcion: 'Corrección con pad de corte, pulido de acabado y sellado sintético',
      operadorId: opId,
      operadorNombre: opNombre,
      sucursalesSeleccionadas: [],
      insumosReceta: [
        { productoId: 1, productoSKU: 'QUI-COR-01', productoNombre: 'Compound de Corte Rápido 1L', unidadMedida: 'L', cantidadSugerida: 0.2 },
        { productoId: 2, productoSKU: 'QUI-POL-01', productoNombre: 'Polish de Acabado Brillo Espejo 1L', unidadMedida: 'L', cantidadSugerida: 0.15 }
      ],
      estado: 'Pendiente',
      fechaProgramada: new Date().toISOString().substring(0, 10),
      notas: ''
    };
    this.showModalExtras = true;
  }

  cerrarModalExtras() { this.showModalExtras = false; }

  onOperadorExtraChange() {
    const op = this.pulidoresDisponiblesRegion.find(o => String(o.id) === String(this.extraForm.operadorId));
    if (op) this.extraForm.operadorNombre = `${op.name} ${op.lastname}`.trim();
  }

  guardarServicioExtra() {
    if (!this.extraForm.servicioNombre.trim() || !this.extraForm.operadorId) {
      this.toastService.warning('Datos incompletos', 'Ingrese el tipo de servicio y seleccione un pulidor.');
      return;
    }
    if (!this.extraFormPlaca.trim()) {
      this.toastService.warning('Placa requerida', 'Ingrese la placa del vehículo.');
      return;
    }

    const user = this.authService.getCurrentUser();
    const regId = user?.regionId ? String(user.regionId) : (user?.region === 'Costa' ? 'REG-COSTA' : 'REG-SIERRA');
    const regNombre = this.userRegionNombre;

    const payload: any = {
      servicioNombre: this.extraForm.servicioNombre.trim(),
      servicioDescripcion: this.extraForm.servicioDescripcion.trim(),
      operadorId: String(this.extraForm.operadorId),
      operadorNombre: this.extraForm.operadorNombre,
      regionId: regId,
      regionNombre: regNombre,
      placa: this.extraFormPlaca.trim().toUpperCase(),
      vehiculoInfo: {
        placa: this.extraFormPlaca.trim().toUpperCase(),
        marca: this.extraFormMarca.trim(),
        modelo: this.extraFormModelo.trim(),
        color: this.extraFormColor.trim()
      },
      insumosReceta: this.extraForm.insumosReceta,
      estado: this.extraForm.estado,
      fechaProgramada: this.extraForm.fechaProgramada,
      notas: this.extraForm.notas,
      creadoPor: `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'Coordinador Zonal'
    };

    this.extrasMock.crearServicioExtra(payload).subscribe({
      next: (creado) => {
        this.toastService.success('Servicio Asignado', `Servicio ${creado.codigoSE} asignado a ${this.extraForm.operadorNombre} en ${regNombre}.`);
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
    this.servicioEspecialSeleccionado = extra;
    this.videoInicialInput = extra.videoInicialUrl || '';
    this.modalIniciarServicioEspecialOpen = true;
  }

  agregarVideoInicialDemo() {
    this.videoInicialInput = 'https://assets.mixkit.co/videos/preview/mixkit-car-polishing-process-in-auto-detailing-shop-41485-large.mp4';
    this.toastService.info('Vídeo demo asignado', 'Se adjuntó la inspección inicial.');
  }

  confirmarIniciarEspecial() {
    if (!this.videoInicialInput.trim()) {
      this.toastService.warning('Vídeo Inicial Requerido', 'Debe adjuntar la evidencia en vídeo del estado inicial del vehículo.');
      return;
    }
    if (!this.servicioEspecialSeleccionado) return;

    this.extrasMock.cambiarEstado(this.servicioEspecialSeleccionado.id, 'En Proceso', this.videoInicialInput.trim()).subscribe({
      next: () => {
        this.toastService.success('Servicio Iniciado', `OT ${this.servicioEspecialSeleccionado?.codigoSE} en proceso. Evidencia inicial grabada.`);
        this.modalIniciarServicioEspecialOpen = false;
        this.cargarServiciosEspeciales();
      },
      error: (err) => {
        console.error('Error al iniciar:', err);
        this.toastService.error('Error al iniciar', 'No se pudo registrar el inicio del servicio.');
      }
    });
  }

  abrirModalFinalizarEspecial(extra: ServicioExtra) {
    this.servicioEspecialSeleccionado = extra;
    this.videoFinalInput = extra.videoFinalUrl || '';
    this.calificacionCalidadInput = 5;
    this.notasFinalizacionInput = extra.notas || '';
    this.modalFinalizarServicioEspecialOpen = true;
  }

  agregarVideoFinalDemo() {
    this.videoFinalInput = 'https://assets.mixkit.co/videos/preview/mixkit-shiny-black-luxury-car-after-detailing-41486-large.mp4';
    this.toastService.info('Vídeo demo asignado', 'Se adjuntó la evidencia de entrega y brillo final.');
  }

  confirmarFinalizarEspecial() {
    if (!this.videoFinalInput.trim()) {
      this.toastService.warning('Vídeo Final Requerido', 'Debe adjuntar la evidencia en vídeo del vehículo terminado.');
      return;
    }
    if (!this.servicioEspecialSeleccionado) return;

    this.extrasMock.actualizarServicioExtra(this.servicioEspecialSeleccionado.id, {
      estado: 'Completado',
      videoFinalUrl: this.videoFinalInput.trim(),
      calificacionCalidad: this.calificacionCalidadInput,
      notas: this.notasFinalizacionInput
    }).subscribe({
      next: () => {
        this.toastService.success('Servicio Completado', `OT ${this.servicioEspecialSeleccionado?.codigoSE} finalizada con éxito. Insumos descontados de tu custodia.`);
        this.modalFinalizarServicioEspecialOpen = false;
        this.cargarServiciosEspeciales();
        if (this.isPulidor) {
          this.cargarStockPulidor();
        }
      },
      error: (err) => {
        console.error('Error al finalizar:', err);
        this.toastService.error('Error al finalizar', 'No se pudo completar el servicio.');
      }
    });
  }

  abrirDetalleEspecial(extra: ServicioExtra) {
    this.servicioEspecialSeleccionado = extra;
    this.modalDetalleEspecialOpen = true;
  }

  verVideoGenerico(url: string, titulo: string) {
    this.videoGenericoUrl = url;
    this.videoGenericoTitulo = titulo;
    this.modalVideoGenericoOpen = true;
  }

  estadoExtraClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'bg-amber-50 text-amber-700 border border-amber-300',
      'En Proceso': 'bg-blue-50 text-blue-700 border border-blue-300',
      'Completado': 'bg-emerald-50 text-emerald-700 border border-emerald-300',
      'FINALIZADO': 'bg-emerald-50 text-emerald-700 border border-emerald-300',
      'Cancelado': 'bg-slate-100 text-slate-500 border border-slate-200'
    };
    return map[estado] || 'bg-slate-100 text-slate-500 border border-slate-200';
  }
}

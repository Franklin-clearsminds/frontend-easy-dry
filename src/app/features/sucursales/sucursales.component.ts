import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AvatarSrcDirective } from '../../shared/directives/avatar-src.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SucursalService, PrecioServicioAgencia } from '../../core/services/sucursal.service';
import { RegionService } from '../../core/services/region.service';
import { ClienteService } from '../../core/services/cliente.service';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { Maquinaria } from '../../core/models';
import { MarcaSucursalService } from '../../core/services/marca-sucursal.service';
import { BahiaService } from '../../core/services/bahia.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { Sucursal, CatalogoServicio, Bahia, Usuario, MarcaSucursal, MovimientoRedSucursal, RegionOperativa } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { CatalogoServiciosService } from '../../core/services/catalogo-servicios.service';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableCellDirective, TableColumn } from '../../shared/components/data-table/data-table.component';
import { TablaServidor } from '../../core/utils/tabla-servidor';
import { OpcionesService } from '../../core/services/opciones.service';
import { SelectSearchComponent } from '../../shared/components/select-search/select-search.component';
import { ListaInfinita } from '../../core/utils/lista-infinita';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import { Observable, Subject, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_INFINITO } from '../../core/config/paginacion';
import { ConsultaAgencias } from '../../core/services/sucursal.service';

/** Listas de referencia de la pantalla de agencias; cada pestaña pide solo las suyas. */
type GrupoReferencia = 'regiones' | 'marcas' | 'sucursales' | 'catalogo' | 'usuarios';
const TODAS_LAS_REFERENCIAS: GrupoReferencia[] = ['regiones', 'marcas', 'sucursales', 'catalogo', 'usuarios'];

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [AvatarSrcDirective, CommonModule, FormsModule, RouterModule, LucideAngularModule, ModalComponent, FilterBarComponent, DataTableComponent, DataTableCellDirective, InfiniteScrollComponent, SelectSearchComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-2">
            <i-lucide aria-hidden="true" name="building-2" class="w-3.5 h-3.5"></i-lucide>
            <span>Gestión de Red Física y Operatividad en Vivo</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Agencias & Mapa de Red EasyDry®</h1>
          <p class="text-slate-500 text-xs mt-1">Control administrativo de sedes, regiones operativas, clientes corporativos y trazabilidad jerárquica de bahías en tiempo real.</p>
        </div>
        <button
          *ngIf="(tabActiva === 'agencias' || tabActiva === 'sucursales') && puedeCrearAgencia"
          (click)="abrirModalCrearSucursal()"
          class="btn btn-cta">
          <i-lucide aria-hidden="true" name="plus" class="w-4 h-4"></i-lucide>
          <span>Registrar Agencia</span>
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        @for (tab of tabsVisibles; track tab.id) {
          <button
            (click)="seleccionarTab(tab.id)"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer"
            [ngClass]="tabActiva === tab.id
              ? 'bg-easydry-blue text-white border-easydry-blue shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-easydry-blue/40'">
            <i-lucide aria-hidden="true" [name]="tab.icon" class="w-4 h-4" [ngClass]="tabActiva === tab.id ? 'text-white' : 'text-slate-500'"></i-lucide>
            <span>{{ tab.label }}</span>
          </button>
        }
      </div>

      <!-- ====================================================================== -->
      <!-- TAB 0: MAPA OPERATIVO LIVE DE LA RED                                   -->
      <!-- ====================================================================== -->
      @if (tabActiva === 'mapa') {
        <div class="space-y-6 animate-fade-in">
          
          <!-- Buscador y filtros del mapa (se aplican a lo ya cargado: agencias, bahías y operadores) -->
          <app-filter-bar
            [showRegion]="true"
            [showCliente]="true"
            [showSucursal]="true"
            [showOperador]="false"
            [showBahia]="false"
            [showEstado]="true"
            [listaEstados]="estadosBahiaMapa"
            [showFechas]="false"
            [showBusqueda]="true"
            placeholderBusqueda="Buscar agencia, ciudad, responsable, bahía, operador o placa…"
            (filterChange)="aplicarFiltrosMapa($event)">
          </app-filter-bar>

          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3 flex-wrap flex-1">
              <div class="flex items-center gap-2">
                <i-lucide aria-hidden="true" name="filter" class="w-4 h-4 text-easydry-blue"></i-lucide>
                <span class="text-xs font-bold text-slate-700 uppercase">Filtrar Agencia:</span>
              </div>
              <select [(ngModel)]="filtroSucursalMapaId" class="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 min-w-56 focus:ring-2 focus:ring-easydry-blue">
                <option [ngValue]="0">Toda la Red Nacional (Todas las agencias)</option>
                @for (suc of sucursales; track suc.id) {
                  <option [ngValue]="suc.id">{{ suc.nombre }} ({{ suc.ciudad }})</option>
                }
              </select>
              <div class="relative min-w-48 sm:min-w-64">
                <i-lucide aria-hidden="true" name="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i-lucide>
                <input type="text" [(ngModel)]="busquedaTextoMapa" placeholder="Buscar por nombre o ciudad…"
                       class="w-full bg-slate-50 border border-slate-200 text-xs font-medium rounded-xl pl-8 pr-3 py-2 focus:ring-2 focus:ring-easydry-blue focus:bg-white outline-none">
              </div>
              <span class="text-xs font-bold text-slate-600">
                {{ sucursalesMapa.length }} de {{ sucursales.length }} agencias
              </span>
              @if (filtroSucursalMapaId && filtroSucursalMapaId !== 0 && filtroSucursalMapaId !== '0') {
                <button type="button" (click)="filtroSucursalMapaId = 0"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-easydry-blue/10 text-easydry-blue text-xs font-bold cursor-pointer hover:bg-easydry-blue/20"
                  aria-label="Quitar el filtro de agencia elegido desde otra pantalla">
                  <span>Solo una agencia elegida</span>
                  <i-lucide aria-hidden="true" name="x" class="w-3.5 h-3.5"></i-lucide>
                </button>
              }
            </div>

            <!-- Leyenda de Estados de Bahía -->
            <div class="flex items-center gap-3 flex-wrap text-xs font-bold text-slate-600">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Disponible</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Lavado</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Secado</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Aspirado</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Mantenimiento</span>
            </div>
          </div>

          <!-- Árbol Operativo Jerárquico: Sucursal -> Bahía -> Operador & Maquinaria -->
          <div class="space-y-6">
            @if (sucursalesMapa.length === 0) {
              <div class="bg-white rounded-2xl border border-slate-100 p-12 text-center text-sm text-slate-500">
                Ninguna agencia coincide con la búsqueda y los filtros.
              </div>
            }
            @for (suc of sucursalesMapa; track suc.id) {
              <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
                <!-- Cabecera de la Sucursal -->
                <div class="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center font-bold">
                      <i-lucide aria-hidden="true" name="building-2" class="w-5 h-5"></i-lucide>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="font-extrabold text-base text-slate-900 font-outfit">{{ suc.nombre }}</h3>
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                          [ngClass]="suc.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                          {{ suc.estado }}
                        </span>
                      </div>
                      <p class="text-xs text-slate-500 font-medium mt-0.5">
                        {{ suc.ciudad }} · Responsable: <strong class="text-slate-700">{{ suc.responsable }}</strong> · Líder Op: <strong class="text-easydry-blue">{{ getLiderOperador(suc) }}</strong> · Tel: {{ suc.telefono }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                      {{ getBahiasDeSucursal(suc.id).length }} Bahías Registradas
                    </span>
                    @if (puedeVerDetalleAgencia) {
                      <a [routerLink]="['/agencias', suc.id]" class="px-3 py-1.5 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-xl text-xs transition-colors flex items-center gap-1">
                        <span>Gestionar</span>
                        <i-lucide aria-hidden="true" name="chevron-right" class="w-3.5 h-3.5"></i-lucide>
                      </a>
                    }
                  </div>
                </div>

                <!-- Grilla de Bahías de la Sucursal -->
                <div class="p-5">
                  @if (bahiasVisibles(suc).length === 0) {
                    <p class="text-xs text-slate-500 italic py-4 text-center">{{ getBahiasDeSucursal(suc.id).length === 0 ? 'No hay bahías configuradas para esta agencia.' : 'Ninguna bahía de esta agencia coincide con los filtros.' }}</p>
                  } @else {
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      @for (bahia of bahiasVisibles(suc); track bahia.id) {
                        <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between">
                          <div>
                            <!-- Header de Bahía -->
                            <div class="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Bahía #{{ bahia.id }}</span>
                                <h4 class="font-extrabold text-sm text-slate-900">{{ bahia.nombre }}</h4>
                              </div>
                              <span class="px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border"
                                [ngClass]="getEstadoBahiaBadge(bahia.estado)">
                                {{ bahia.estado }}
                              </span>
                            </div>

                            <!-- Responsable y Operador asignado (Punto 16) -->
                            <div class="mt-3 p-2.5 bg-white rounded-xl border border-slate-100 text-xs space-y-2">
                              <div>
                                <div class="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                  <i-lucide aria-hidden="true" name="shield" class="w-3 h-3 text-purple-600"></i-lucide>
                                  <span>Responsable de Agencia</span>
                                </div>
                                <p class="font-bold text-slate-800 text-xs truncate">{{ suc.responsable || 'Sin asignar' }}</p>
                              </div>
                              <div>
                                <div class="text-[11px] font-extrabold text-easydry-blue uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                  <i-lucide aria-hidden="true" name="user" class="w-3 h-3 text-easydry-blue"></i-lucide>
                                  <span>Operador Asignado</span>
                                </div>
                                @if (!mapaVeLavador) {
                                  <p class="text-slate-400 italic text-xs">Sin acceso</p>
                                } @else if (bahia.operadorAsignado) {
                                  <p class="font-bold text-slate-800 text-xs truncate">{{ bahia.operadorAsignado }}</p>
                                } @else {
                                  <p class="text-slate-500 italic text-xs">Sin operador asignado</p>
                                }
                              </div>
                            </div>

                            <!-- Maquinaria e Insumos vinculados -->
                            <div class="mt-2 text-xs text-slate-500 space-y-1">
                              @if (mapaVeMaquinaria && maquinasDeBahia(bahia.id).length > 0) {
                                <div class="flex items-center gap-1 text-slate-600">
                                  <i-lucide aria-hidden="true" name="wrench" class="w-3 h-3 text-slate-400"></i-lucide>
                                  <span>{{ maquinasDeBahia(bahia.id).length }} máquina(s) asignada(s)</span>
                                </div>
                              }
                              @if (mapaVeVehiculo && bahia.ocupada) {
                                <div class="flex items-center gap-1 text-easydry-blue font-bold">
                                  <i-lucide aria-hidden="true" name="car" class="w-3 h-3"></i-lucide>
                                  <span>En atención: {{ bahia.ocupada.placa }}</span>
                                </div>
                              }
                            </div>
                          </div>

                          <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span class="text-slate-500">Tipo: {{ bahia.tipo || 'General' }}</span>
                            @if (puedeVerDetalleAgencia) {
                              <a [routerLink]="['/agencias', suc.id]" class="text-easydry-blue font-bold hover:underline flex items-center gap-0.5">
                                <span>Ver detalle</span>
                                <i-lucide aria-hidden="true" name="arrow-right" class="w-3 h-3"></i-lucide>
                              </a>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            } @empty {
              <div class="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
                <i-lucide aria-hidden="true" name="building-2" class="w-12 h-12 mx-auto mb-2 opacity-30"></i-lucide>
                <p class="font-bold text-sm">No se encontraron agencias para el filtro seleccionado.</p>
              </div>
            }
          </div>

        </div>
      }

      @if (tabActiva === 'agencias' || tabActiva === 'sucursales') {
        <app-filter-bar
          [showRegion]="true"
          [showCliente]="true"
          [showSucursal]="false"
          [showOperador]="false"
          [showBahia]="false"
          [showEstado]="true"
          [listaEstados]="['Todos', 'Activo', 'Mantenimiento', 'Inactivo']"
          [showFechas]="false"
          [showBusqueda]="true"
          (filterChange)="aplicarNuevosFiltros($event)">
        </app-filter-bar>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          @for (suc of agenciasLista.items; track suc.id) {
            <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry hover:shadow-easydry-hover transition-shadow duration-300 p-5 flex flex-col justify-between group">
              <div class="space-y-4">
                <!-- Cabecera: nombre, código, estado y cliente -->
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3 min-w-0">
                    <div class="w-11 h-11 shrink-0 rounded-2xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center">
                      <i-lucide aria-hidden="true" name="building-2" class="w-5 h-5"></i-lucide>
                    </div>
                    <div class="min-w-0">
                      <h3 class="font-bold text-slate-900 text-base font-outfit leading-tight group-hover:text-easydry-blue transition-colors">{{ suc.nombre }}</h3>
                      @if (suc.codigo) { <p class="text-[11px] font-mono text-slate-500 mt-0.5">{{ suc.codigo }}</p> }
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-1.5 shrink-0">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold"
                      [ngClass]="suc.estado === 'Activo' ? 'bg-easydry-green/20 text-easydry-green-text' : (suc.estado === 'Mantenimiento' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')">
                      {{ suc.estado }}
                    </span>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-extrabold uppercase text-white"
                      [style.background-color]="colorMarca(suc.marcaId)">
                      <i-lucide aria-hidden="true" name="tag" class="w-3 h-3"></i-lucide>
                      {{ suc.clienteNombre || suc.marcaNombre || 'Sin cliente' }}
                    </span>
                  </div>
                </div>

                <!-- Ubicación -->
                <div class="space-y-1 text-xs text-slate-600">
                  <p class="flex items-center gap-1.5 font-semibold">
                    <i-lucide aria-hidden="true" name="map-pin" class="w-3.5 h-3.5 text-easydry-blue shrink-0"></i-lucide>
                    <span>{{ suc.regionNombre || 'Sin región' }}@if (suc.ciudad && suc.ciudad !== suc.regionNombre) { · {{ suc.ciudad }} }</span>
                  </p>
                  @if (suc.direccion) { <p class="pl-5 text-slate-500 line-clamp-2">{{ suc.direccion }}</p> }
                  @if (suc.telefono) {
                    <p class="flex items-center gap-1.5 text-slate-500">
                      <i-lucide aria-hidden="true" name="phone" class="w-3.5 h-3.5 shrink-0"></i-lucide><span>{{ suc.telefono }}</span>
                    </p>
                  }
                </div>

                <!-- Personas -->
                <div class="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-slate-500">Responsable</span>
                    <span class="font-bold text-slate-800 text-right truncate">{{ suc.responsable || 'Sin Asignar' }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-slate-500">Líder operador</span>
                    <span class="font-bold text-right truncate" [ngClass]="getLiderOperador(suc) !== 'Sin Asignar' ? 'text-easydry-blue' : 'text-slate-500'">{{ getLiderOperador(suc) }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-slate-500">Aprobación gerencial</span>
                    <span class="font-bold" [ngClass]="suc.requiereAprobacion ? 'text-emerald-700' : 'text-slate-500'">{{ suc.requiereAprobacion ? 'Requerida' : 'No requerida' }}</span>
                  </div>
                </div>

                <!-- Capacidad -->
                <div class="grid grid-cols-4 gap-2 text-center">
                  <div class="p-2 bg-slate-50 rounded-xl"><span class="block font-extrabold text-easydry-blue text-sm">{{ suc.cantidadBahias }}</span><span class="text-[10px] uppercase font-bold text-slate-500">Bahías</span></div>
                  <div class="p-2 bg-slate-50 rounded-xl"><span class="block font-extrabold text-slate-800 text-sm">{{ suc.maxLavadoresPorBahia || 1 }}</span><span class="text-[10px] uppercase font-bold text-slate-500">Lav./bahía</span></div>
                  <div class="p-2 bg-slate-50 rounded-xl"><span class="block font-extrabold text-easydry-green-text text-sm">{{ suc.operadoresActivos ?? 0 }}</span><span class="text-[10px] uppercase font-bold text-slate-500">Operad.</span></div>
                  <div class="p-2 bg-slate-50 rounded-xl"><span class="block font-extrabold text-slate-800 text-sm">{{ suc.maquinasAsignadasCount ?? 0 }}</span><span class="text-[10px] uppercase font-bold text-slate-500">Máquinas</span></div>
                </div>

                <!-- Servicios -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-700 flex items-center gap-1.5">
                      <i-lucide aria-hidden="true" name="sparkles" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>{{ cantidadServicios(suc) }} servicios
                    </span>
                    @if (suc.tieneServiciosEspeciales) {
                      <span class="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-extrabold">Atiende especiales</span>
                    }
                  </div>
                  <div class="flex flex-wrap gap-1">
                    @for (n of (suc.serviciosNombres || []).slice(0, 3); track n) {
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">{{ n }}</span>
                    }
                    @if ((suc.serviciosNombres || []).length > 3) {
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-bold">+{{ (suc.serviciosNombres || []).length - 3 }}</span>
                    }
                  </div>
                </div>

                <!-- Actividad -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500">Productividad del mes</span>
                    <span class="font-extrabold text-slate-800">{{ suc.productividad ?? 0 }}%</span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-easydry-green rounded-full" [style.width.%]="suc.productividad ?? 0"></div>
                  </div>
                </div>
              </div>

              <!-- Acciones -->
              <div class="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                @if (puedeVerMapa) {
                  <button (click)="verEnMapa(suc)" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                    <i-lucide aria-hidden="true" name="map" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide><span>Mapa</span>
                  </button>
                }
                <a [routerLink]="['/agencias', suc.id]" class="flex-1 py-2 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                  <i-lucide aria-hidden="true" name="eye" class="w-3.5 h-3.5"></i-lucide><span>Detalle</span>
                </a>
@if (puedeTransferirAlguno) {
                <button (click)="abrirModalTransferir(suc)" class="p-2 min-w-9 min-h-9 inline-flex items-center justify-center bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white rounded-xl transition-colors" title="Transferir región o marca" aria-label="Transferir región o marca">
                  <i-lucide aria-hidden="true" name="refresh-cw" class="w-4 h-4"></i-lucide>
                </button>
                }
                @if (puedeCambiarEstadoAgencia) {
                <button (click)="alternarEstadoAgencia(suc)" class="px-2.5 min-h-9 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors" [title]="suc.estado === 'Inactivo' ? 'Activar agencia' : 'Desactivar agencia'">
                  {{ suc.estado === 'Inactivo' ? 'Activar' : 'Desactivar' }}
                </button>
                }
                @if (puedeEditarAgencia) {
                <button (click)="abrirModalEditar(suc)" class="p-2 min-w-9 min-h-9 inline-flex items-center justify-center bg-slate-100 hover:bg-easydry-blue text-slate-500 hover:text-white rounded-xl transition-colors" title="Editar Agencia" aria-label="Editar Agencia">
                  <i-lucide aria-hidden="true" name="pencil" class="w-4 h-4"></i-lucide>
                </button>
                }
              </div>
            </div>
          }
        </div>

        @if (agenciasLista.inicializada && agenciasLista.items.length === 0 && !agenciasLista.error) {
          <div class="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
            <i-lucide aria-hidden="true" name="building-2" class="w-12 h-12 mx-auto mb-2 opacity-30"></i-lucide>
            <p class="font-bold text-sm">No hay agencias que coincidan con los filtros.</p>
          </div>
        }
        <app-infinite-scroll
          [hasMore]="agenciasLista.hasMore"
          [loading]="agenciasLista.cargando"
          [error]="agenciasLista.error"
          [total]="agenciasLista.total"
          (cargarMas)="agenciasLista.siguiente()"
          (reintentar)="agenciasLista.reintentar()">
        </app-infinite-scroll>

        @if (movimientos.length > 0) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5">
            <h3 class="font-bold text-slate-900 text-sm font-outfit mb-3 flex items-center gap-2">
              <i-lucide aria-hidden="true" name="history" class="w-4 h-4 text-easydry-blue"></i-lucide>
              Historial de transferencias
            </h3>
            <div class="space-y-2">
              @for (mov of movimientos.slice(0, 6); track mov.id) {
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span class="font-extrabold text-slate-800">{{ mov.sucursalNombre }}</span>
                    <span class="text-slate-500 mx-1">·</span>
                    <span class="font-bold" [class.text-easydry-blue]="mov.tipo === 'REGION'" [class.text-amber-700]="mov.tipo === 'MARCA'">
                      {{ mov.tipo === 'REGION' ? 'Región' : 'Marca' }}
                    </span>
                    <span class="text-slate-500"> {{ mov.valorAnterior }} → {{ mov.valorNuevo }}</span>
                  </div>
                  <span class="text-slate-500">{{ mov.fecha }} · {{ mov.realizadoPor }}</span>
                </div>
              }
            </div>
          </div>
        }
      }

      @if (tabActiva === 'regiones') {
        <div class="flex items-center justify-between">
          <p class="text-xs text-slate-500">Crea regiones y luego pasa sucursales a cada una.</p>
          @if (puedeCrearRegion) {
          <button (click)="abrirModalRegion()" class="btn btn-cta">
            <i-lucide aria-hidden="true" name="plus" class="w-3.5 h-3.5"></i-lucide> Nueva Región
          </button>
          }
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <app-data-table
            [serverSide]="true"
            [embebida]="true"
            [columns]="columnasRegiones"
            [data]="regionesTabla.filas"
            [total]="regionesTabla.total"
            [page]="regionesTabla.pagina"
            [pageSize]="regionesTabla.pageSize"

            [sortField]="regionesTabla.sortField"
            [sortOrder]="regionesTabla.sortOrder"
            [loading]="regionesTabla.cargando"
            [error]="regionesTabla.error"
            [rowClickable]="true"
            [rowClass]="claseFilaRegion"
            maxHeight="none"
            caption="Regiones operativas"
            searchPlaceholder="Buscar región..."
            emptyTitle="No hay regiones que coincidan."
            emptyHint="Crea una con «Nueva Región» o cambia la búsqueda."
            (rowClick)="regionSeleccionada = $event"
            (queryChange)="regionesTabla.alCambiar($event)"
            (reintentar)="regionesTabla.cargar(true)">
            <ng-template appCell="nombre" let-r>
              <p class="font-extrabold text-slate-900 text-sm">{{ r.nombre }}</p>
              <p class="text-xs font-mono text-slate-500">{{ r.codigo }}</p>
              <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ r.descripcion }}</p>
              <p class="text-xs font-semibold text-slate-600 mt-1">Supervisor: <b class="text-slate-800">{{ r.responsable || 'Sin supervisor' }}</b></p>
            </ng-template>
            <ng-template appCell="estado" let-r>
              <span class="px-2 py-0.5 rounded-lg text-xs font-extrabold"
                [ngClass]="r.estado === 'Activa' ? 'bg-easydry-green/20 text-easydry-green-text' : 'bg-slate-100 text-slate-500'">
                {{ r.estado }}
              </span>
            </ng-template>
          </app-data-table>
          <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 min-h-[280px]">
            @if (!regionSeleccionada) {
              <p class="text-sm text-slate-500">Selecciona una región para ver y asignar agencias.</p>
            } @else {
              <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 class="font-extrabold text-slate-900 font-outfit text-lg">{{ regionSeleccionada.nombre }}</h3>
                  <p class="text-xs text-slate-500">{{ regionSeleccionada.descripcion }}</p>
                  <p class="text-xs text-slate-500 mt-1">Responsable: {{ regionSeleccionada.responsable || '—' }}</p>
                </div>
                <div class="flex gap-2">
                  @if (puedeEditarRegion) {
                  <button (click)="abrirModalRegion(regionSeleccionada)" class="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">Editar</button>
                  }
                  @if (puedeCambiarEstadoRegion) {
                  <button (click)="cambiarEstadoRegion(regionSeleccionada)" class="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">
                    {{ regionSeleccionada.estado === 'Activa' ? 'Desactivar' : 'Activar' }}
                  </button>
                  }
                  @if (puedeTransferirRegion) {
                  <button (click)="abrirAsignarARegion(regionSeleccionada)" class="px-3 py-2 bg-easydry-green text-slate-950 font-bold rounded-xl text-xs">
                    Pasar agencia a esta región
                  </button>
                  }
                </div>
              </div>
              <div class="space-y-2">
                @for (suc of sucursalesDeRegion(regionSeleccionada.id); track suc.id) {
                  <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div>
                      <p class="text-sm font-bold text-slate-900">{{ suc.nombre }}</p>
                      <p class="text-xs text-slate-500">{{ suc.ciudad }} · {{ suc.marcaNombre }}</p>
                    </div>
                    <div class="flex gap-2">
                      @if (puedeTransferirRegion) {
                      <button (click)="abrirModalTransferir(suc)" class="px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 rounded-lg">Transferir</button>
                      }
                      <a [routerLink]="['/agencias', suc.id]" class="px-2.5 py-1.5 text-xs font-bold text-easydry-blue bg-easydry-blue/10 rounded-lg">Ver</a>
                    </div>
                  </div>
                } @empty {
                  <p class="text-xs text-slate-500">Aún no hay agencias en esta región. Usa «Pasar agencia a esta región».</p>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (tabActiva === 'clientes' || tabActiva === 'marcas') {
        <div class="flex items-center justify-between">
          <p class="text-xs text-slate-500">Crea clientes corporativos de agencia y asígnalos o transfiérelos entre locales.</p>
          @if (puedeCrearCliente) {
          <button (click)="abrirModalMarca()" class="btn btn-cta">
            <i-lucide aria-hidden="true" name="plus" class="w-3.5 h-3.5"></i-lucide> Nuevo Cliente
          </button>
          }
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <app-data-table
            [serverSide]="true"
            [embebida]="true"
            [columns]="columnasClientes"
            [data]="clientesTabla.filas"
            [total]="clientesTabla.total"
            [page]="clientesTabla.pagina"
            [pageSize]="clientesTabla.pageSize"

            [sortField]="clientesTabla.sortField"
            [sortOrder]="clientesTabla.sortOrder"
            [loading]="clientesTabla.cargando"
            [error]="clientesTabla.error"
            [rowClickable]="true"
            [rowClass]="claseFilaCliente"
            maxHeight="none"
            caption="Clientes corporativos"
            searchPlaceholder="Buscar cliente..."
            emptyTitle="No hay clientes que coincidan."
            emptyHint="Crea uno con «Nuevo Cliente» o cambia la búsqueda."
            (rowClick)="marcaSeleccionada = $event"
            (queryChange)="clientesTabla.alCambiar($event)"
            (reintentar)="clientesTabla.cargar(true)">
            <ng-template appCell="nombre" let-m>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full flex-shrink-0" [style.background-color]="m.color"></span>
                <div>
                  <p class="font-extrabold text-slate-900 text-sm">{{ m.nombre }}</p>
                  <p class="text-xs font-mono text-slate-500">{{ m.codigo }}</p>
                </div>
              </div>
            </ng-template>
            <ng-template appCell="estado" let-m>
              <span class="px-2 py-0.5 rounded-lg text-xs font-extrabold"
                [ngClass]="m.estado === 'Activa' ? 'bg-easydry-green/20 text-easydry-green-text' : 'bg-slate-100 text-slate-500'">
                {{ m.estado }}
              </span>
            </ng-template>
          </app-data-table>
          <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 min-h-[280px]">
            @if (!marcaSeleccionada) {
              <p class="text-sm text-slate-500">Selecciona un cliente para ver, asignar o transferir agencias.</p>
            } @else {
              <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 class="font-extrabold text-slate-900 font-outfit text-lg">{{ marcaSeleccionada.nombre }}</h3>
                  <p class="text-xs text-slate-500">{{ marcaSeleccionada.descripcion }}</p>
                </div>
                <div class="flex gap-2">
                  @if (puedeEditarCliente) {
                  <button (click)="abrirModalMarca(marcaSeleccionada)" class="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">Editar</button>
                  }
                  @if (puedeCambiarEstadoCliente) {
                  <button (click)="cambiarEstadoCliente(marcaSeleccionada)" class="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">
                    {{ marcaSeleccionada.estado === 'Activa' ? 'Desactivar' : 'Activar' }}
                  </button>
                  }
                  @if (puedeTransferirCliente) {
                  <button (click)="abrirAsignarAMarca(marcaSeleccionada)" class="px-3 py-2 bg-easydry-green text-slate-950 font-bold rounded-xl text-xs">
                    Asignar agencia a este cliente
                  </button>
                  }
                </div>
              </div>
              <div class="space-y-2">
                @for (suc of sucursalesDeMarca(marcaSeleccionada.id); track suc.id) {
                  <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div>
                      <p class="text-sm font-bold text-slate-900">{{ suc.nombre }}</p>
                      <p class="text-xs text-slate-500">{{ suc.ciudad }} · Región {{ suc.regionNombre }}</p>
                    </div>
                    <div class="flex gap-2">
                      @if (puedeTransferirCliente) {
                      <button (click)="abrirModalTransferir(suc)" class="px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 rounded-lg">Cambiar</button>
                      }
                      <a [routerLink]="['/agencias', suc.id]" class="px-2.5 py-1.5 text-xs font-bold text-easydry-blue bg-easydry-blue/10 rounded-lg">Ver</a>
                    </div>
                  </div>
                } @empty {
                  <p class="text-xs text-slate-500">Ninguna agencia pertenece a este cliente. Asigna una desde este panel.</p>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- ====================================================================== -->
      <!-- TAB 4: GESTIÓN DE GERENTES DE SUCURSAL (PUNTO 3)                       -->
      <!-- ====================================================================== -->
      @if (tabActiva === 'gerentes') {
        <div class="space-y-6 animate-fade-in">
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <i-lucide aria-hidden="true" name="user-check" class="w-5 h-5"></i-lucide>
                </span>
                <h2 class="text-lg font-extrabold text-slate-900 font-outfit">Gestión Exclusiva de Gerentes de Agencia</h2>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Aprobador designado de cada agencia. Solo usuarios con rol <strong class="text-purple-700">APROBADOR</strong>.
              </p>
            </div>

            @if (puedeAsignarPersonas) {
            <button
              type="button"
              (click)="abrirModalAsignarGerente()"
              class="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer">
              <i-lucide aria-hidden="true" name="plus" class="w-4 h-4"></i-lucide>
              <span>Asignar Agencia a Aprobador</span>
            </button>
            }
          </div>

          <!-- Barra de Filtro para Gerentes / Aprobadores -->
          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3 flex-wrap flex-1">
              <div class="relative min-w-56 flex-1 max-w-md">
                <i-lucide aria-hidden="true" name="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i-lucide>
                <input type="text" [(ngModel)]="busquedaGerentesTexto" placeholder="Buscar aprobador por nombre, email o agencia…"
                       class="w-full bg-slate-50 border border-slate-200 text-xs font-medium rounded-xl pl-8 pr-3 py-2 focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none">
              </div>
              <select [(ngModel)]="filtroGerentesAgencia" class="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 min-w-44 focus:ring-2 focus:ring-purple-500">
                <option value="">Todas las agencias</option>
                <option value="__SIN_ASIGNAR__">Sin agencia asignada</option>
                @for (suc of sucursales; track suc.id) {
                  <option [value]="suc.nombre">{{ suc.nombre }}</option>
                }
              </select>
            </div>
            <span class="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {{ gerentesUsuariosFiltrados.length }} aprobador(es)
            </span>
          </div>

          <!-- Matriz de Gerentes y Agencias Asignadas -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @if (gerentesUsuariosFiltrados.length === 0) {
              <div class="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-100">
                <p class="text-xs font-bold text-slate-500">No se encontraron aprobadores con los filtros aplicados.</p>
              </div>
            }
            @for (ger of gerentesUsuariosFiltrados; track ger.id) {
              <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 flex flex-col justify-between hover:border-purple-200 transition-all">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex items-center gap-3">
                      @if (ger.avatar) {
                        <img loading="lazy" decoding="async"
                          [appAvatar]="ger.avatar" [appAvatarIniciales]="(ger.nombre || '?').charAt(0) + (ger.apellido || '').charAt(0)"
                          alt="Foto de gerente"
                          class="w-11 h-11 rounded-full object-cover ring-2 ring-purple-300">
                      } @else {
                        <div class="w-11 h-11 rounded-full bg-slate-100 ring-2 ring-purple-300 flex items-center justify-center text-xs font-extrabold text-slate-500">
                          {{ (ger.nombre || '?').charAt(0) }}{{ (ger.apellido || '').charAt(0) }}
                        </div>
                      }
                      <div>
                        <h4 class="font-bold text-sm text-slate-900 leading-tight">{{ ger.nombre }} {{ ger.apellido }}</h4>
                        @if (ger.email) { <p class="text-xs text-slate-500 truncate">{{ ger.email }}</p> }
                      </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                      Rol: {{ ger.rolNombre || ger.rol || 'APROBADOR' }}
                    </span>
                  </div>

                  <!-- Información de Sucursal Asignada -->
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 mt-2">
                    <div class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <i-lucide aria-hidden="true" name="building-2" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                      <span>Agencia Asignada</span>
                    </div>
                    @if (ger.agencia) {
                      <div class="flex items-center justify-between">
                        <span class="font-extrabold text-slate-900 text-xs">{{ ger.agencia }}</span>
                        <span class="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                          Asignada
                        </span>
                      </div>
                    } @else {
                      <span class="text-xs text-amber-600 font-semibold italic">Sin sucursal asignada</span>
                    }
                  </div>
                </div>

                <!-- Acciones de Gestión de Gerente -->
                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5 text-xs text-slate-500">
                    <i-lucide aria-hidden="true" name="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                    <span>Aprobador Oficial</span>
                  </div>

                  @if (puedeAsignarPersonas) {
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      (click)="abrirModalReasignar(ger)"
                      class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1">
                      <i-lucide aria-hidden="true" name="refresh-cw" class="w-3.5 h-3.5"></i-lucide>
                      <span>Reasignar</span>
                    </button>
                    @if (ger.agencia) {
                      <button
                        type="button"
                        (click)="desasignarGerente(ger)"
                        class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Remover asignación">
                        <i-lucide aria-hidden="true" name="user-x" class="w-3.5 h-3.5"></i-lucide>
                        <span>Remover</span>
                      </button>
                    }
                  </div>
                  }
                </div>

              </div>
            } @empty {
              <div class="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-500 space-y-3">
                <p>No hay usuarios con rol Aprobador dados de alta en el directorio.</p>
                <a routerLink="/usuarios" class="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-xl text-xs transition-colors">
                  <i-lucide aria-hidden="true" name="user-plus" class="w-4 h-4"></i-lucide>
                  <span>Crear Aprobador en Directorio</span>
                </a>
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal Asignar / Reasignar Agencia a Aprobador (rol APROBADOR) -->
      <app-modal
        [isOpen]="modalAsignarGerenteOpen" size="lg"
        title="Asignación Exclusiva de Agencia a Gerente"
        icon="shield"
        (close)="modalAsignarGerenteOpen = false">
        <div class="space-y-4">
          <div class="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
            <i-lucide aria-hidden="true" name="info" class="w-4 h-4 shrink-0"></i-lucide>
            <span>Solo usuarios con rol <strong>APROBADOR</strong> pueden ser designados como aprobador de una agencia.</span>
          </div>

          <div>
            <label for="sucursales-f1" class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Usuario Aprobador
            </label>
            <select id="sucursales-f1"
              [(ngModel)]="formAsignarGerente.gerenteId"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
              <option [ngValue]="0" disabled>Selecciona un usuario con rol Aprobador...</option>
              @for (g of gerentesUsuarios; track g.id) {
                <option [ngValue]="g.id">{{ g.nombre }} {{ g.apellido }}@if (g.email) { ({{ g.email }}) }</option>
              }
            </select>
          </div>

          <div>
            <label for="sucursales-f2" class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Agencia a Asignar
            </label>
            <select id="sucursales-f2"
              [(ngModel)]="formAsignarGerente.sucursalId"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
              <option [ngValue]="0" disabled>Selecciona la agencia...</option>
              @for (s of sucursales; track s.id) {
                <option [ngValue]="s.id">{{ s.nombre }} ({{ s.ciudad }})</option>
              }
            </select>
          </div>
        </div>

        <div modal-footer class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalAsignarGerenteOpen = false"
            class="btn btn-secondary w-full sm:w-auto">
            Cancelar
          </button>
          <button
            type="button"
            (click)="guardarAsignacionGerente()"
            class="btn btn-primary w-full sm:w-auto">
            Confirmar Asignación
          </button>
        </div>
      </app-modal>

      <!-- Modal Crear / Editar Agencia -->
      <app-modal
        [isOpen]="modalCrearOpen" size="xl"
        [title]="editandoSucursal ? 'Editar Agencia EasyDry' : 'Registrar Nueva Agencia EasyDry'"
        [icon]="editandoSucursal ? 'pencil' : 'building-2'"
        (close)="cerrarModal()">

        <form (ngSubmit)="guardarSucursal()" class="space-y-4">
          <div>
            <label for="sucursales-f3" class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de Agencia</label>
            <input id="sucursales-f3" type="text" [(ngModel)]="nuevaSucursal.nombre" name="nombre" placeholder="ej. EasyDry Guayaquil Samborondón" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>

          @if (puedeElegirRegionCliente) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @if (puedeElegirRegion) {
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">Región</label>
                @if (puedeCrearRegion) { <button type="button" (click)="mostrarAltaRegion = !mostrarAltaRegion" class="btn btn-cta">Crear región</button> }
              </div>
              <app-select-search
                [cargar]="opcRegiones"
                [value]="nuevaSucursal.regionId ? '' + nuevaSucursal.regionId : null"
                [valueLabel]="nuevaSucursal.regionNombre || nombreRegion(nuevaSucursal.regionId)"
                [todasLabel]="null"
                [clearable]="false"
                placeholder="Seleccione región"
                buscadorPlaceholder="Buscar…"
                ariaLabel="Región"
                (valueChange)="nuevaSucursal.regionId = $event || 0"
                (seleccion)="$event && (nuevaSucursal.regionNombre = $event.label)">
              </app-select-search>
              @if (mostrarAltaRegion) {
                <div class="mt-2 flex gap-2">
                  <input type="text" [(ngModel)]="altaRapidaRegion" name="altaRapidaRegion" placeholder="Nombre de la región" class="flex-1 p-2 border rounded-xl text-xs">
                  <button type="button" (click)="crearRegionRapida()" class="btn btn-cta">Crear</button>
                </div>
              }
            </div>
            }
            @if (puedeElegirCliente) {
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">Cliente de agencia</label>
                @if (puedeCrearCliente) { <button type="button" (click)="mostrarAltaMarca = !mostrarAltaMarca" class="btn btn-cta">Crear cliente</button> }
              </div>
              <app-select-search
                [cargar]="opcClientes"
                [value]="nuevaSucursal.marcaId ? '' + nuevaSucursal.marcaId : null"
                [valueLabel]="nuevaSucursal.marcaNombre || nombreCliente(nuevaSucursal.marcaId)"
                [todasLabel]="null"
                [clearable]="false"
                placeholder="Seleccione cliente"
                buscadorPlaceholder="Buscar…"
                ariaLabel="Cliente de agencia"
                (valueChange)="nuevaSucursal.marcaId = $event || 0; nuevaSucursal.clienteId = $event || 0"
                (seleccion)="$event && (nuevaSucursal.marcaNombre = $event.label)">
              </app-select-search>
              @if (mostrarAltaMarca) {
                <div class="mt-2 flex gap-2">
                  <input type="text" [(ngModel)]="altaRapidaMarca" name="altaRapidaMarca" placeholder="Nombre del cliente" class="flex-1 p-2 border rounded-xl text-xs">
                  <button type="button" (click)="crearMarcaRapida()" class="btn btn-cta">Crear</button>
                </div>
              }
            </div>
            }
          </div>

          }

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="sucursales-f4" class="block text-xs font-bold text-slate-700 uppercase mb-1">Ciudad</label>
              <input id="sucursales-f4" type="text" [(ngModel)]="nuevaSucursal.ciudad" [disabled]="!puedeCrearAgencia" name="ciudad" placeholder="Quito / Guayaquil / Cuenca" class="w-full p-2.5 border rounded-xl text-sm disabled:opacity-60 disabled:bg-slate-100" required>
            </div>
            <div>
              <label for="sucursales-f5" class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad de Bahías</label>
              <input id="sucursales-f5" type="number" [(ngModel)]="nuevaSucursal.cantidadBahias" [disabled]="!puedeCrearBahias" name="cantidadBahias" min="1" max="12" class="w-full p-2.5 border rounded-xl text-sm disabled:opacity-60 disabled:bg-slate-100" required>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="sucursales-f6" class="block text-xs font-bold text-slate-700 uppercase mb-1">Máximo Lavadores por Bahía</label>
              <input id="sucursales-f6" type="number" [(ngModel)]="nuevaSucursal.maxLavadoresPorBahia" [disabled]="!puedeCrearBahias" name="maxLavadoresPorBahia" min="1" max="10" class="w-full p-2.5 border rounded-xl text-sm disabled:opacity-60" required>
            </div>
            <div>
              <label for="sucursales-f7" class="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección Exacta</label>
              <input id="sucursales-f7" type="text" [(ngModel)]="nuevaSucursal.direccion" name="direccion" placeholder="Av. Principal N45-120" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          @if (puedeAsignarPersonas) {
          <div>
            <label for="sucursales-f8" class="text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
              <i-lucide aria-hidden="true" name="crown" class="w-3.5 h-3.5 text-teal-600"></i-lucide>
              Líder Operador
            </label>
            <select id="sucursales-f8" [(ngModel)]="nuevaSucursal.liderOperadorId" (ngModelChange)="alCambiarLiderOperador($event)" name="liderOperadorId"
                    class="w-full p-2.5 border rounded-xl text-sm font-semibold">
              <option [ngValue]="undefined">— Sin Líder Operador asignado —</option>
              @for (lid of lideresOperadoresUsuarios; track lid.id) {
                <option [ngValue]="lid.id">{{ lid.nombre }} {{ lid.apellido }}@if (lid.email) { ({{ lid.email }}) }</option>
              }
            </select>
            @if (!lideresOperadoresUsuarios.length) {
              <p class="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-3 h-3"></i-lucide>
                No hay usuarios con rol Líder registrados. Créalos en Gestión de Usuarios.
              </p>
            }
          </div>


          <!-- ─── Aprobación Gerencial ─── -->
          <div class="rounded-2xl border-2 transition-all"
               [ngClass]="nuevaSucursal.requiereAprobacion ? 'border-easydry-green bg-easydry-green/5' : 'border-slate-200 bg-slate-50'">
            <div class="flex items-center justify-between p-4 cursor-pointer select-none"
                 (click)="alCambiarToggleAprobacion(!nuevaSucursal.requiereAprobacion)" tabindex="0" role="button" (keydown.enter)="alCambiarToggleAprobacion(!nuevaSucursal.requiereAprobacion)" (keydown.space)="alCambiarToggleAprobacion(!nuevaSucursal.requiereAprobacion); $event.preventDefault()">
               <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center"
                     [ngClass]="nuevaSucursal.requiereAprobacion ? 'bg-easydry-green/20 text-easydry-green-text' : 'bg-slate-200 text-slate-500'">
                  <i-lucide aria-hidden="true" name="shield-check" class="w-4 h-4"></i-lucide>
                </div>
                <div>
                  <p class="text-xs font-extrabold text-slate-800 uppercase">Requiere Aprobador</p>
                  <p class="text-xs text-slate-500">Los servicios finalizados deben ser aprobados antes del cierre del día</p>
                </div>
              </div>
              <!-- Toggle switch -->
              <div class="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                   [ngClass]="nuevaSucursal.requiereAprobacion ? 'bg-easydry-green' : 'bg-slate-300'">
                <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      [ngClass]="nuevaSucursal.requiereAprobacion ? 'left-5' : 'left-0.5'"></span>
              </div>
            </div>
            <!-- Selector de Gerente (solo si aprobación activa) -->
            @if (nuevaSucursal.requiereAprobacion) {
              <div class="px-4 pb-4 border-t border-easydry-green/20 pt-3">
                <label for="sucursales-f9" class="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  <i-lucide aria-hidden="true" name="user-check" class="w-3.5 h-3.5 inline mr-1 text-easydry-green-text"></i-lucide>
                  Aprobador
                </label>
                <select id="sucursales-f9" [(ngModel)]="nuevaSucursal.gerenteId" (ngModelChange)="alCambiarGerente($event)" name="gerenteId"
                        class="w-full p-2.5 border border-easydry-green/30 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-easydry-green/30">
                  <option [ngValue]="undefined">— Seleccione un Aprobador —</option>
                  @for (ger of gerentesUsuarios; track ger.id) {
                    <option [ngValue]="ger.id">{{ ger.nombre }} {{ ger.apellido }} · {{ ger.sucursalAsignada || 'Red Nacional' }}</option>
                  }
                </select>
                @if (!gerentesUsuarios.length) {
                  <p class="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <i-lucide aria-hidden="true" name="alert-triangle" class="w-3 h-3"></i-lucide>
                    No hay usuarios con rol Aprobador registrados aún.
                  </p>
                }
              </div>
            }
          </div>

          }

          <!-- ─── Servicios Especiales ─── -->
          <div class="rounded-2xl border-2 transition-all"
               [ngClass]="nuevaSucursal.tieneServiciosEspeciales ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-slate-50'">
            <div class="flex items-center justify-between p-4 cursor-pointer select-none"
                 (click)="alCambiarToggleServiciosEspeciales(!nuevaSucursal.tieneServiciosEspeciales)" tabindex="0" role="button" (keydown.enter)="alCambiarToggleServiciosEspeciales(!nuevaSucursal.tieneServiciosEspeciales)" (keydown.space)="alCambiarToggleServiciosEspeciales(!nuevaSucursal.tieneServiciosEspeciales); $event.preventDefault()">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center"
                     [ngClass]="nuevaSucursal.tieneServiciosEspeciales ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-500'">
                  <i-lucide aria-hidden="true" name="star" class="w-4 h-4"></i-lucide>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-xs font-extrabold text-slate-800 uppercase">Cuenta con Servicios Especiales</p>
                    @if (nuevaSucursal.tieneServiciosEspeciales) {
                      <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-200 text-amber-900 border border-amber-300">
                        {{ serviciosEspeciales.length }} servicios especiales habilitados
                      </span>
                    }
                  </div>
                  <p class="text-xs text-slate-500">Pulido, tratamiento cerámico, limpieza de motor y otros servicios premium</p>
                </div>
              </div>
              <!-- Toggle switch -->
              <div class="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                   [ngClass]="nuevaSucursal.tieneServiciosEspeciales ? 'bg-amber-400' : 'bg-slate-300'">
                <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      [ngClass]="nuevaSucursal.tieneServiciosEspeciales ? 'left-5' : 'left-0.5'"></span>
              </div>
            </div>
            <!-- Información de servicios especiales automáticos -->
            @if (nuevaSucursal.tieneServiciosEspeciales) {
              <div class="px-4 pb-4 border-t border-amber-200 pt-3">
                <div class="flex items-center gap-3 p-3 bg-amber-100/70 border border-amber-300/80 rounded-xl text-amber-950">
                  <div class="w-7 h-7 rounded-lg bg-amber-200 flex items-center justify-center flex-shrink-0 text-amber-800">
                    <i-lucide aria-hidden="true" name="sparkles" class="w-4 h-4"></i-lucide>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-amber-900">Catálogo Completo de Servicios Especiales Asignado</p>
                    <p class="text-xs text-amber-800 leading-snug">
                      Esta sucursal queda habilitada con los <strong>{{ serviciosEspeciales.length }} servicios especiales corporativos</strong> (pulido fino/medio/corte, vitrificados cerámicos, sellados acrílicos y detallado). No requiere selección individual.
                    </p>
                  </div>
                </div>
                @if (puedeGestionarPrecios) {
                  <div class="mt-3 space-y-1.5">
                    <p class="text-xs font-bold text-amber-900">Precio de cada servicio especial en esta agencia</p>
                    @for (s of serviciosEspeciales; track s.id) {
                      <div class="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white/70 border border-amber-200">
                        <span class="text-xs font-semibold text-slate-800 min-w-0 break-words">{{ s.nombre }}</span>
                        <div class="flex items-center gap-1 shrink-0">
                          <span class="text-xs text-slate-500">$</span>
                          <input type="number" min="0" step="0.01"
                            class="w-20 text-xs rounded-lg border border-slate-200 px-2 py-1"
                            [value]="precioMostrado(s.id)"
                            (change)="onPrecioServicioChange(s.id, $any($event.target).value)"
                            placeholder="0.00">
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- ─── Servicios Generales del Catálogo ─── -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700 uppercase">Servicios Generales de esta Sucursal</label>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-easydry-blue/10 text-easydry-blue border border-easydry-blue/20">
                  <i-lucide aria-hidden="true" name="check" class="w-3 h-3"></i-lucide>
                  {{ cantidadGeneralesSeleccionados }} de {{ serviciosGenerales.length }} seleccionados
                </span>
                <button type="button" (click)="seleccionarTodosGenerales()" class="text-xs text-easydry-blue font-bold hover:underline cursor-pointer">Todos</button>
                <span class="text-slate-500 text-xs">|</span>
                <button type="button" (click)="deseleccionarTodosGenerales()" class="text-xs text-slate-500 font-bold hover:underline cursor-pointer">Ninguno</button>
              </div>
            </div>
            <p class="text-xs text-slate-500 mb-2">Del catálogo corporativo. Márquelos ahora; podrá editarlos después.</p>
            <div class="border border-slate-200 rounded-xl p-3 bg-slate-50/80 max-h-48 overflow-y-auto">
              @for (s of serviciosGenerales; track s.id) {
                <div class="flex items-center gap-2 py-1.5 hover:bg-slate-100/80 px-2 rounded-lg transition-colors">
                  <label class="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" class="mt-0.5 rounded border-slate-300 text-easydry-blue focus:ring-easydry-blue" [checked]="servicioSeleccionado(s.id)" [disabled]="editandoSucursal && !puedeHabilitarServicios" (change)="toggleServicio(s.id, s.nombre)">
                    <span class="text-xs font-semibold text-slate-800">{{ s.nombre }}</span>
                  </label>
                  @if (puedeGestionarPrecios && servicioSeleccionado(s.id)) {
                    <div class="flex items-center gap-1 shrink-0" title="Precio para esta agencia">
                      <span class="text-xs text-slate-500">$</span>
                      <input type="number" min="0" step="0.01"
                        class="w-20 text-xs rounded-lg border border-slate-200 px-2 py-1"
                        [value]="precioMostrado(s.id)"
                        (change)="onPrecioServicioChange(s.id, $any($event.target).value)"
                        [placeholder]="precioServicio(s.id)?.precioCatalogo?.toString() || '0.00'">
                    </div>
                  }
                </div>
              }
            </div>
            @if (editandoSucursal && puedeGestionarPrecios) {
              <div class="mt-2 flex items-center justify-between gap-2">
                <p class="text-xs text-slate-500">Precio de cada servicio en esta agencia. El catálogo no tiene precio base: un servicio sin precio fijado vale $0.</p>
                <button type="button" (click)="guardarPreciosServicios()" [disabled]="!hayPreciosPendientes || guardandoPrecios"
                  class="btn btn-secondary btn-sm shrink-0">
                  {{ guardandoPrecios ? 'Guardando...' : 'Guardar precios' }}
                </button>
              </div>
            }

            <!-- Resumen de servicios visibles dentro del formulario -->
            <div class="mt-2.5 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs">
              <div class="flex items-center gap-1.5 text-slate-700 font-bold">
                <i-lucide aria-hidden="true" name="sparkles" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                <span>Total asignados a la sucursal:</span>
              </div>
              <span class="font-extrabold text-easydry-blue bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-xs">
                {{ totalServiciosSeleccionados }} servicios ({{ cantidadGeneralesSeleccionados }} generales, {{ cantidadEspecialesSeleccionados }} especiales)
              </span>
            </div>
          </div>
        </form>


        <div modal-footer class="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-easydry-blue/10 text-easydry-blue border border-easydry-blue/20">
              <i-lucide aria-hidden="true" name="sparkles" class="w-4 h-4 text-easydry-blue"></i-lucide>
              <span class="text-xs font-extrabold">{{ totalServiciosSeleccionados }} servicios seleccionados</span>
            </div>
            <span class="text-xs text-slate-500 font-semibold hidden md:inline">
              ({{ cantidadGeneralesSeleccionados }} generales + {{ cantidadEspecialesSeleccionados }} especiales)
            </span>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" (click)="cerrarModal()" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
            <button type="button" (click)="guardarSucursal()" [disabled]="guardando" class="btn btn-primary w-full sm:w-auto">
              {{ editandoSucursal ? 'Guardar Cambios' : 'Guardar Sucursal' }}
            </button>
          </div>
        </div>
      </app-modal>

      <!-- Modal Región -->
      <app-modal [isOpen]="modalRegionOpen" size="md" [title]="editandoRegion ? 'Editar Región' : 'Nueva Región'" icon="map-pin" (close)="modalRegionOpen = false">
        <form class="space-y-4">
          <div>
            <label for="sucursales-f10" class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
            <input id="sucursales-f10" type="text" [(ngModel)]="formRegion.nombre" name="regionNombre" class="w-full p-2.5 border rounded-xl text-sm" placeholder="ej. Amazonía">
          </div>
          <div>
            <label for="sucursales-f11" class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
            <input id="sucursales-f11" type="text" [(ngModel)]="formRegion.descripcion" name="regionDesc" class="w-full p-2.5 border rounded-xl text-sm">
          </div>
          <div>
            <label for="sucursales-f12" class="text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
              <span>
                <i-lucide aria-hidden="true" name="user-check" class="w-3.5 h-3.5 inline mr-1 text-easydry-blue"></i-lucide>
                Responsable (Supervisor Regional)
              </span>
              @if (formRegion.responsable) {
                <span class="text-xs font-semibold text-emerald-600 normal-case bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Asignado: {{ formRegion.responsable }}
                </span>
              }
            </label>
            <select id="sucursales-f12"
              [(ngModel)]="formRegion.supervisorId"
              (ngModelChange)="alCambiarSupervisorRegion($event)"
              name="regionRespSelect"
              class="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-easydry-blue/30 focus:border-easydry-blue text-slate-800">
              <option value="">— Seleccione un Supervisor Regional —</option>
              @for (sup of supervisoresUsuarios; track sup.id) {
                <option [value]="sup.id">
                  {{ sup.nombre }} {{ sup.apellido }}@if (sup.email) { · {{ sup.email }} }
                </option>
              }
            </select>
            @if (!supervisoresUsuarios.length) {
              <p class="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-3 h-3"></i-lucide>
                No hay usuarios con rol Supervisor registrados aún en el sistema.
              </p>
            } @else {
              <p class="text-xs text-slate-500 mt-1">
                Seleccione el supervisor que estará a cargo de esta región operativa.
              </p>
            }
          </div>
          <div>
            <label for="sucursales-f13" class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
            <select id="sucursales-f13" [(ngModel)]="formRegion.estado" [disabled]="!puedeCambiarEstadoRegion" name="regionEstado" class="w-full p-2.5 border rounded-xl text-sm font-semibold disabled:opacity-60">
              <option value="Activa">Activa</option>
              <option value="Inactiva">Inactiva</option>
            </select>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalRegionOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button (click)="guardarRegion()" class="btn btn-primary w-full sm:w-auto">Guardar Región</button>
        </div>
      </app-modal>

      <!-- Modal Cliente -->
      <app-modal [isOpen]="modalMarcaOpen" size="md" [title]="editandoMarca ? 'Editar Cliente de Agencia' : 'Nuevo Cliente de Agencia'" icon="briefcase" (close)="modalMarcaOpen = false">
        <form class="space-y-4">
          <div>
            <label for="sucursales-f14" class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre comercial del cliente</label>
            <input id="sucursales-f14" type="text" [(ngModel)]="formMarca.nombre" name="marcaNombre" class="w-full p-2.5 border rounded-xl text-sm" placeholder="ej. Casabaca, Toyota, EasyDry">
          </div>
          <div>
            <label for="sucursales-f15" class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
            <textarea id="sucursales-f15" [(ngModel)]="formMarca.descripcion" name="marcaDescripcion" rows="2" class="w-full p-2.5 border rounded-xl text-sm" placeholder="Detalles o notas del cliente corporativo..."></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="sucursales-f16" class="block text-xs font-bold text-slate-700 uppercase mb-1">Color distintivo</label>
              <input id="sucursales-f16" type="color" [(ngModel)]="formMarca.color" name="marcaColor" class="w-full h-10 border rounded-xl p-1 cursor-pointer">
            </div>
            <div>
              <label for="sucursales-f17" class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
              <select id="sucursales-f17" [(ngModel)]="formMarca.estado" [disabled]="!puedeCambiarEstadoCliente" name="marcaEstado" class="w-full p-2.5 border rounded-xl text-sm disabled:opacity-60">
                <option value="Activa">Activa</option>
                <option value="Inactiva">Inactiva</option>
              </select>
            </div>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalMarcaOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button (click)="guardarMarca()" class="btn btn-primary w-full sm:w-auto">Guardar Cliente</button>
        </div>
      </app-modal>

      <!-- Modal Transferir -->
      <app-modal [isOpen]="modalTransferirOpen" size="md" title="Transferir sucursal" icon="refresh-cw" (close)="modalTransferirOpen = false">
        <form class="space-y-4">
          <div>
            <label for="sucursales-f18" class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal</label>
            <select id="sucursales-f18" [(ngModel)]="formTransfer.sucursalId" name="transfSucursal" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
              @for (s of sucursales; track s.id) {
                <option [ngValue]="s.id">{{ s.nombre }} ({{ s.regionNombre }} · {{ s.marcaNombre }})</option>
              }
            </select>
          </div>
          <div class="space-y-4">
            @if (puedeTransferirRegion) {
            <div>
              <label for="sucursales-f19" class="block text-xs font-bold text-slate-700 uppercase mb-1">Nueva región</label>
              <app-select-search
                [cargar]="opcRegiones"
                [value]="formTransfer.regionId ? '' + formTransfer.regionId : null"
                [valueLabel]="nombreRegion(formTransfer.regionId)"
                [todasLabel]="null"
                [clearable]="false"
                placeholder="Seleccione región"
                buscadorPlaceholder="Buscar…"
                ariaLabel="Nueva región"
                (valueChange)="formTransfer.regionId = $event || 0"
                (seleccion)="null">
              </app-select-search>
            </div>
            }
            @if (puedeTransferirCliente) {
            <div>
              <label for="sucursales-f20" class="block text-xs font-bold text-slate-700 uppercase mb-1">Nuevo cliente</label>
              <app-select-search
                [cargar]="opcClientes"
                [value]="formTransfer.marcaId ? '' + formTransfer.marcaId : null"
                [valueLabel]="nombreCliente(formTransfer.marcaId)"
                [todasLabel]="null"
                [clearable]="false"
                placeholder="Seleccione cliente"
                buscadorPlaceholder="Buscar…"
                ariaLabel="Nuevo cliente"
                (valueChange)="formTransfer.marcaId = $event || 0"
                (seleccion)="null">
              </app-select-search>
            </div>
            }
          </div>
          <div>
            <label for="sucursales-f21" class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del cambio</label>
            <textarea id="sucursales-f21" [(ngModel)]="formTransfer.motivo" name="transfMotivo" rows="2" class="w-full p-2.5 border rounded-xl text-sm" placeholder="ej. Reorganización territorial / cambio de banner comercial"></textarea>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalTransferirOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button (click)="guardarTransferencia()" class="btn bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto">Confirmar transferencia</button>
        </div>
      </app-modal>

      <!-- Modal Confirmar Cambio de Estado de Agencia (Reemplaza alert/confirm nativo) -->
      <app-modal
        [isOpen]="modalConfirmarEstadoOpen" size="sm"
        [title]="agenciaEstadoCambiar?.activar ? 'Activar Agencia' : 'Desactivar Agencia'"
        [icon]="agenciaEstadoCambiar?.activar ? 'check-circle' : 'alert-triangle'"
        (close)="modalConfirmarEstadoOpen = false">
        <div class="space-y-3 py-2 text-slate-700">
          <p class="text-sm">
            ¿Confirmas que deseas <strong>{{ agenciaEstadoCambiar?.activar ? 'activar' : 'desactivar' }}</strong> la agencia <strong>{{ agenciaEstadoCambiar?.suc?.nombre }}</strong>?
          </p>
          <p class="text-xs text-slate-500" *ngIf="!agenciaEstadoCambiar?.activar">
            Al desactivarla, dejará de operar y no recibirá nuevos servicios hasta que sea reactivada.
          </p>
        </div>
        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button (click)="modalConfirmarEstadoOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button (click)="ejecutarCambioEstadoAgencia()"
                  [class]="agenciaEstadoCambiar?.activar ? 'btn btn-primary w-full sm:w-auto' : 'px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors w-full sm:w-auto'">
            {{ agenciaEstadoCambiar?.activar ? 'Activar Agencia' : 'Sí, Desactivar' }}
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class SucursalesComponent implements OnInit, OnDestroy {
  ngOnDestroy(): void {
    this.busquedaSub?.unsubscribe();
    this.agenciasLista.destruir();
    this.regionesTabla.destruir();
    this.clientesTabla.destruir();
  }

  sucursales: Sucursal[] = [];
  regiones: RegionOperativa[] = [];
  marcas: MarcaSucursal[] = [];
  catalogoServicios: CatalogoServicio[] = [];
  movimientos: MovimientoRedSucursal[] = [];

  tabActiva: 'mapa' | 'agencias' | 'sucursales' | 'regiones' | 'marcas' | 'clientes' | 'gerentes' = 'agencias';
  busquedaTextoMapa = '';
  busquedaGerentesTexto = '';
  filtroGerentesAgencia = '';
  modalConfirmarEstadoOpen = false;
  agenciaEstadoCambiar: { suc: Sucursal; activar: boolean } | null = null;
  /** Cada pestaña es una sub-página de «Agencias & Mapa Red»: se ve solo si el rol tiene su permiso. */
  tabs = [
    { id: 'agencias' as const, label: 'Gestión de Agencias', icon: 'building-2', permiso: 'pagina.agencias.agencias' },
    { id: 'mapa' as const, label: 'Mapa Operativo en Vivo', icon: 'map', permiso: 'pagina.agencias.mapa' },
    { id: 'gerentes' as const, label: 'Aprobadores', icon: 'user-cog', permiso: 'pagina.agencias.aprobadores' },
    { id: 'regiones' as const, label: 'Regiones', icon: 'map-pin', permiso: 'pagina.agencias.regiones' },
    { id: 'clientes' as const, label: 'Clientes', icon: 'briefcase', permiso: 'pagina.agencias.clientes' }
  ];

  /** Equipos de las bahías del mapa (solo se piden si el rol ve el bloque de maquinaria). */
  maquinasMapa: Maquinaria[] = [];

  maquinasDeBahia(bahiaId: string | number): Maquinaria[] {
    return this.maquinasMapa.filter(m => m.bahiaId !== undefined && String(m.bahiaId) === String(bahiaId) && m.activa !== false);
  }

  filtroRegionId: number | string = 0;
  filtroMarcaId: number | string = 0;
  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Mes' };
  filtroSucursalMapaId: number | string = 0;
  /** Listas de regiones y clientes con páginas numeradas, búsqueda y orden en el servidor (los arreglos completos siguen para los desplegables). */
  readonly columnasRegiones: TableColumn[] = [
    { key: 'nombre', label: 'Región', sortable: true, defaultSort: 'asc' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
  ];
  readonly columnasClientes: TableColumn[] = [
    { key: 'nombre', label: 'Cliente', sortable: true, defaultSort: 'asc' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
  ];
  readonly regionesTabla = new TablaServidor<RegionOperativa>((c) => this.regionService.getRegionesPagina(c), { sortField: 'nombre', sortOrder: 'asc' });
  readonly clientesTabla = new TablaServidor<MarcaSucursal>((c) => this.marcaService.getMarcasPagina(c), { sortField: 'nombre', sortOrder: 'asc' });
  readonly claseFilaRegion = (r: RegionOperativa): string => (this.regionSeleccionada?.id === r.id ? 'bg-easydry-blue/5' : '');
  readonly claseFilaCliente = (m: MarcaSucursal): string => (this.marcaSeleccionada?.id === m.id ? 'bg-easydry-blue/5' : '');
  regionSeleccionada: RegionOperativa | null = null;
  marcaSeleccionada: MarcaSucursal | null = null;
  bahiasTodas: Bahia[] = [];
  todosLosUsuarios: Usuario[] = [];

  gerentesUsuarios: Usuario[] = [];

  get gerentesUsuariosFiltrados(): Usuario[] {
    let lista = this.gerentesUsuarios;
    if (this.filtroGerentesAgencia) {
      if (this.filtroGerentesAgencia === '__SIN_ASIGNAR__') {
        lista = lista.filter(g => !g.agencia);
      } else {
        lista = lista.filter(g => g.agencia === this.filtroGerentesAgencia);
      }
    }
    if (this.busquedaGerentesTexto?.trim()) {
      const q = this.busquedaGerentesTexto.trim().toLowerCase();
      lista = lista.filter(g =>
        (g.nombre && g.nombre.toLowerCase().includes(q)) ||
        (g.apellido && g.apellido.toLowerCase().includes(q)) ||
        (g.email && g.email.toLowerCase().includes(q)) ||
        (g.agencia && g.agencia.toLowerCase().includes(q))
      );
    }
    return lista;
  }
  modalAsignarGerenteOpen = false;
  formAsignarGerente: {
    gerenteId: string | number;
    sucursalId: string | number;
  } = {
    gerenteId: 0,
    sucursalId: 0
  };

  modalCrearOpen = false;
  editandoSucursal = false;
  preciosServicios: PrecioServicioAgencia[] = [];
  preciosEditados: Record<number, number> = {};
  guardandoPrecios = false;
  mostrarAltaRegion = false;
  mostrarAltaMarca = false;
  altaRapidaRegion = '';
  altaRapidaMarca = '';

  modalRegionOpen = false;
  editandoRegion = false;
  formRegion: Omit<RegionOperativa, 'id' | 'codigo'> & { id?: number | string; codigo?: string; supervisorId?: string | number } = {
    nombre: '',
    descripcion: '',
    responsable: '',
    supervisorId: '',
    estado: 'Activa'
  };
  supervisoresUsuarios: Usuario[] = [];

  modalMarcaOpen = false;
  editandoMarca = false;
  formMarca: Omit<MarcaSucursal, 'id' | 'codigo'> & { id?: number | string; codigo?: string } = {
    nombre: '',
    descripcion: '',
    color: '#004282',
    estado: 'Activa'
  };

  modalTransferirOpen = false;
  formTransfer = {
    sucursalId: 0 as number | string,
    regionId: 0 as number | string,
    marcaId: 0 as number | string,
    motivo: ''
  };

  nuevaSucursal: Sucursal = this.sucursalVacia();

  private sucursalService = inject(SucursalService);
  private regionService = inject(RegionService);
  private marcaService = inject(MarcaSucursalService);
  private catalogoService = inject(CatalogoServiciosService);
  private bahiaService = inject(BahiaService);
  private clienteService = inject(ClienteService);
  private maquinariaService = inject(MaquinariaService);
  private usuarioService = inject(UsuarioService);
  private toastService = inject(ToastService);
  public auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  // Permisos: son los mismos que el servidor exige en cada endpoint. Sin ellos la pantalla queda en solo lectura.
  get puedeCrearAgencia(): boolean { return this.auth.puede('agencias.agencias.crear'); }
  get puedeTransferirCliente(): boolean { return this.auth.puede('agencias.clientes.transferir'); }
  get puedeTransferirRegion(): boolean { return this.auth.puede('agencias.regiones.transferir'); }
  get puedeTransferirAlguno(): boolean { return this.puedeTransferirCliente || this.puedeTransferirRegion; }
  /** Región y cliente se eligen al crear la agencia (permiso de crear) y se cambian al editarla (permiso de transferir). */
  get puedeElegirRegion(): boolean { return this.editandoSucursal ? this.puedeTransferirRegion : this.puedeCrearAgencia; }
  get puedeElegirCliente(): boolean { return this.editandoSucursal ? this.puedeTransferirCliente : this.puedeCrearAgencia; }
  get puedeElegirRegionCliente(): boolean { return this.puedeElegirRegion || this.puedeElegirCliente; }
  get puedeEditarAgencia(): boolean { return this.auth.puede('agencias.agencias.editar'); }
  get puedeHabilitarServicios(): boolean { return this.auth.puede('agencias.agencias.servicios'); }
  get puedeCambiarEstadoAgencia(): boolean { return this.auth.puede('agencias.agencias.estado'); }
  get puedeGestionarPrecios(): boolean { return this.auth.puede('agencias.precios.fijar'); }
  get puedeCrearRegion(): boolean { return this.auth.puede('agencias.regiones.crear'); }
  get puedeEditarRegion(): boolean { return this.auth.puede('agencias.regiones.editar'); }
  get puedeCambiarEstadoRegion(): boolean { return this.auth.puede('agencias.regiones.estado'); }
  get puedeGestionarRegiones(): boolean { return this.puedeCrearRegion || this.puedeEditarRegion || this.auth.puede('agencias.regiones.estado'); }
  get puedeCrearCliente(): boolean { return this.auth.puede('agencias.clientes.crear'); }
  get puedeEditarCliente(): boolean { return this.auth.puede('agencias.clientes.editar'); }
  get puedeCambiarEstadoCliente(): boolean { return this.auth.puede('agencias.clientes.estado'); }
  get puedeGestionarClientes(): boolean { return this.puedeCrearCliente || this.puedeEditarCliente || this.auth.puede('agencias.clientes.estado'); }
  get puedeAsignarPersonas(): boolean { return this.auth.puede('agencias.aprobadores.asignar'); }
  get puedeVerUsuarios(): boolean { return this.auth.puedeAlguno('agencias.personal.ver', 'agencias.aprobadores.asignar'); }
  /** Al crear una agencia se define el número de bahías; al editar, aumentarlo crea bahías nuevas (lo permite editar la agencia). */
  get puedeCrearBahias(): boolean { return !this.editandoSucursal || this.auth.puede('agencias.agencias.editar'); }
  guardando = false;

  get tabsVisibles() {
    return this.tabs.filter(t => this.auth.puede(t.permiso));
  }

  /** Si la pestaña en uso no está permitida (o nunca lo estuvo), pasa a la primera que sí. */
  private asegurarTabPermitida(): void {
    const visibles = this.tabsVisibles;
    const actual = this.tabActiva === 'sucursales' ? 'agencias' : this.tabActiva === 'marcas' ? 'clientes' : this.tabActiva;
    if (visibles.length && !visibles.some(t => t.id === actual)) this.tabActiva = visibles[0].id;
  }

  // Bloques del mapa: cada uno se enciende por separado en el editor de roles.
  get mapaVeLavador(): boolean { return this.auth.puede('mapa.lavador.ver'); }
  get mapaVeMaquinaria(): boolean { return this.auth.puede('mapa.maquinaria.ver'); }
  get mapaVeVehiculo(): boolean { return this.auth.puede('mapa.vehiculo.ver'); }
  get puedeVerDetalleAgencia(): boolean { return this.auth.puede('pagina.agencias.agencias'); }
  get puedeVerMapa(): boolean { return this.auth.puede('pagina.agencias.mapa'); }

  /** Mensaje del servidor (viene en español); si no hay, el de respaldo. */
  private mensajeError(err: any, respaldo: string): string {
    const m = err?.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    return (typeof m === 'string' && m) ? m : respaldo;
  }
  private opciones = inject(OpcionesService);
  /** Desplegables con buscador y scroll infinito: regiones y clientes activos (el servidor busca y pagina). */
  readonly opcRegiones = this.opciones.regiones({ estado: 1 });
  readonly opcClientes = this.opciones.clientes({ estado: 1 });

  /** Etiqueta de un valor ya elegido (los arreglos completos solo sirven para rotular; la lista la trae el servidor). */
  nombreRegion(id: number | string | undefined): string {
    return this.regiones.find(r => String(r.id) === String(id))?.nombre || '';
  }
  nombreCliente(id: number | string | undefined): string {
    return this.marcas.find(m => String(m.id) === String(id))?.nombre || '';
  }

  get regionesActivas(): RegionOperativa[] {
    const list = this.regiones.filter(r => r.estado === 'Activa' || (r as any).estado === 1 || (r as any).estado === 'Activo' || !r.estado);
    return list.length ? list : this.regiones;
  }

  get marcasActivas(): MarcaSucursal[] {
    const list = this.marcas.filter(m => m.estado === 'Activa' || (m as any).estado === 1 || (m as any).estado === 'Activo' || !m.estado);
    return list.length ? list : this.marcas;
  }

  get lideresOperadoresUsuarios(): Usuario[] {
    return this.todosLosUsuarios.filter(u => {
      const r = (u.rol || u.rolNombre || '').toUpperCase();
      const activo = u.estado === 'Activo' || (u as any).estado === 1;
      return activo && (r.includes('LIDER') || r.includes('LÍDER')) && !r.includes('APROBADOR');
    });
  }

  get serviciosGenerales(): CatalogoServicio[] {
    return this.catalogoServicios.filter(s => s.categoria?.trim().toUpperCase() === 'GENERAL' && s.estado === 'Activo');
  }

  get serviciosEspeciales(): CatalogoServicio[] {
    return this.catalogoServicios.filter(s => 
      s.categoria?.trim().toUpperCase() === 'ESPECIAL' && s.estado === 'Activo'
    );
  }

  /** Tarjetas de agencias con scroll infinito de 30 en 30: búsqueda, estado, región y cliente los resuelve el servidor, que también aplica el alcance por rol. */
  readonly agenciasLista = new ListaInfinita<Sucursal>(
    (page, size) => this.sucursalService.getSucursalesPagina({ ...this.consultaAgencias(), page, pageSize: size }),
    PAGE_SIZE_INFINITO,
    (s) => s.id,
  );
  private busquedaAgencias = '';
  private readonly busqueda$ = new Subject<string>();
  private busquedaSub?: Subscription;

  private neutro(v: string | undefined | null, ...neutros: string[]): string {
    const t = (v ?? '').trim();
    return !t || neutros.includes(t) ? '' : t;
  }

  private consultaAgencias(): ConsultaAgencias {
    const f = this.filtrosGlobales;
    const estados: Record<string, number> = { Activo: 1, Inactivo: 0, Mantenimiento: 2 };
    const estado = estados[this.neutro(f.estado, 'Todos')];
    return {
      search: this.busquedaAgencias,
      regionNombre: this.neutro(f.region, 'Todas') || undefined,
      clienteNombre: this.neutro(f.cliente || f.marca, 'Todas', 'Todos') || undefined,
      estado,
    };
  }

  private huellaFiltros(f: FilterState): string {
    const { busqueda, ...resto } = f;
    return JSON.stringify(resto);
  }

  /** Cantidad de servicios que ofrece la sede según lo guardado en la agencia (ids o, si faltan, nombres). */
  cantidadServicios(suc: Sucursal): number {
    return Math.max((suc.servicioIds || []).length, (suc.serviciosNombres || []).length);
  }

  aplicarNuevosFiltros(filtros: FilterState): void {
    const previo = this.huellaFiltros(this.filtrosGlobales);
    this.filtrosGlobales = filtros;
    const texto = (filtros.busqueda ?? '').trim();
    if (previo !== this.huellaFiltros(filtros)) {
      // Cambió un filtro (no el texto): se consulta ya.
      if (texto.length === 0 || texto.length >= BUSQUEDA_MIN_CARACTERES) this.busquedaAgencias = texto;
      this.agenciasLista.reiniciar();
      return;
    }
    // Solo cambió el texto: espera 300 ms tras la última tecla y exige 2 letras (o vacío para quitar el filtro).
    if (texto.length === 0 || texto.length >= BUSQUEDA_MIN_CARACTERES) this.busqueda$.next(texto);
  }

  ngOnInit(): void {
    this.asegurarTabPermitida();
    this.busquedaSub = this.busqueda$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaAgencias = texto;
        this.agenciasLista.reiniciar();
      });
    // La primera emisión de queryParams es síncrona (el valor actual de la URL): solo fija la pestaña, la
    // carga inicial la hace `cargarTodo()` justo abajo. Las emisiones siguientes sí son navegación real
    // (p.ej. un enlace "ver en mapa" desde otra pantalla) y ahí sí hay que pedir los datos de la pestaña nueva.
    let primeraEmisionQueryParams = true;
    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['mapa', 'agencias', 'sucursales', 'regiones', 'marcas', 'clientes', 'gerentes'].includes(params['tab'])) {
        this.tabActiva = params['tab'] === 'sucursales' ? 'agencias' : (params['tab'] === 'marcas' ? 'clientes' : params['tab'] as any);
      }
      if (params['sucursalId']) {
        this.filtroSucursalMapaId = Number(params['sucursalId']);
      }
      this.asegurarTabPermitida();
      if (!primeraEmisionQueryParams) this.cargarSegunTab(this.tabActiva);
      primeraEmisionQueryParams = false;
    });
    this.cargarTodo();
  }

  abrirModalAsignarGerente(): void {
    if (!this.conReferencias(() => this.abrirModalAsignarGerente())) return;
    if (!this.puedeAsignarPersonas) return;
    this.formAsignarGerente = {
      gerenteId: this.gerentesUsuarios[0]?.id || 0,
      sucursalId: this.sucursales[0]?.id || 0
    };
    this.modalAsignarGerenteOpen = true;
  }

  abrirModalReasignar(ger: Usuario): void {
    if (!this.conReferencias(() => this.abrirModalReasignar(ger))) return;
    if (!this.puedeAsignarPersonas) return;
    const suc = this.sucursales.find(s => s.nombre === ger.agencia);
    this.formAsignarGerente = {
      gerenteId: ger.id,
      sucursalId: suc?.id || this.sucursales[0]?.id || 0
    };
    this.modalAsignarGerenteOpen = true;
  }

  /**
   * Designa al aprobador de una agencia. Se guarda en el servidor (la agencia queda con ese aprobador) y solo se avisa del
   * éxito cuando el servidor responde; si rechaza, se muestra su mensaje. Se reenvía el líder actual para que no se pierda.
   */
  guardarAsignacionGerente(): void {
    const ger = this.gerentesUsuarios.find(g => String(g.id) === String(this.formAsignarGerente.gerenteId));
    const suc = this.sucursales.find(s => s.id === this.formAsignarGerente.sucursalId);
    if (!ger || !suc) {
      this.toastService.warning('Campos requeridos', 'Selecciona un aprobador y una agencia.');
      return;
    }
    const nombreGer = (ger.nombre + ' ' + (ger.apellido || '')).trim();
    const cambio: Sucursal = { ...suc, gerenteId: ger.id, gerenteNombre: nombreGer, responsable: nombreGer, requiereAprobacion: true };
    this.sucursalService.actualizarSucursal(cambio, { motivo: 'Aprobador designado', realizadoPor: this.nombreUsuarioActual() }, { personas: true }).subscribe({
      next: () => {
        this.modalAsignarGerenteOpen = false;
        this.toastService.success('Aprobador designado', nombreGer + ' es ahora el aprobador de ' + suc.nombre + '.');
        this.cargarTodo();
      },
      error: (err) => this.toastService.error('No se pudo asignar', this.mensajeError(err, 'El servidor no aceptó la asignación.'))
    });
  }

  desasignarGerente(ger: Usuario): void {
    const suc = this.sucursales.find(s => s.nombre === ger.agencia);
    if (!suc) {
      this.toastService.warning('Sin agencia', 'Este aprobador no tiene una agencia asignada.');
      return;
    }
    const cambio: Sucursal = { ...suc, gerenteId: undefined, gerenteNombre: undefined, responsable: 'Sin Asignar', requiereAprobacion: false };
    this.sucursalService.actualizarSucursal(cambio, { motivo: 'Aprobador removido', realizadoPor: this.nombreUsuarioActual() }, { personas: true }).subscribe({
      next: () => {
        this.toastService.info('Asignación removida', (ger.nombre + ' ' + (ger.apellido || '')).trim() + ' ya no es aprobador de ' + suc.nombre + '.');
        this.cargarTodo();
      },
      error: (err) => this.toastService.error('No se pudo remover', this.mensajeError(err, 'El servidor no aceptó el cambio.'))
    });
  }

  private nombreUsuarioActual(): string {
    const u = this.auth.getCurrentUser();
    return ((u?.nombre || '') + ' ' + (u?.apellido || '')).trim() || 'Sistema';
  }

  alternarEstadoAgencia(suc: Sucursal): void {
    if (!this.puedeCambiarEstadoAgencia) return;
    const activar = suc.estado === 'Inactivo';
    this.agenciaEstadoCambiar = { suc, activar };
    this.modalConfirmarEstadoOpen = true;
  }

  ejecutarCambioEstadoAgencia(): void {
    if (!this.agenciaEstadoCambiar) return;
    const { suc, activar } = this.agenciaEstadoCambiar;
    this.modalConfirmarEstadoOpen = false;
    this.sucursalService.cambiarEstadoAgencia(suc.id, activar).subscribe({
      next: () => {
        this.toastService.success(activar ? 'Agencia activada' : 'Agencia desactivada', suc.nombre);
        this.agenciasLista.reiniciar();
      },
      error: (err) => this.toastService.error('No se pudo cambiar el estado', this.mensajeError(err, 'El servidor no aceptó el cambio.'))
    });
  }

  /** Pestañas cuyos datos pesados (listas paginadas, movimientos, bahías/maquinaria del mapa) ya se pidieron. */
  private tabsCargadas = new Set<string>();

  /**
   * Antes esto se pedía TODO de una sola vez en `cargarTodo()`, sin importar en qué pestaña estaba el usuario
   * (Mapa, Regiones, Clientes y los movimientos de Agencias se cargaban siempre, aunque no se fueran a ver).
   * Ahora cada pestaña pide lo suyo la primera vez que se entra a ella.
   */
  private cargarSegunTab(tab: typeof this.tabActiva): void {
    const clave = tab === 'sucursales' ? 'agencias' : tab === 'marcas' ? 'clientes' : tab;
    this.cargarReferencias(this.referenciasDeTab(clave));
    if (this.tabsCargadas.has(clave)) return;
    this.tabsCargadas.add(clave);
    switch (clave) {
      case 'mapa':
        this.bahiaService.getBahias().subscribe(list => { this.bahiasTodas = list; });
        if (this.mapaVeMaquinaria) this.maquinariaService.getMaquinaria({ activa: true }).subscribe(list => { this.maquinasMapa = list; });
        break;
      case 'agencias':
        this.agenciasLista.reiniciar();
        this.sucursalService.getMovimientos().subscribe(list => { this.movimientos = list; });
        break;
      case 'regiones':
        if (this.auth.puede('pagina.agencias.regiones')) this.regionesTabla.reiniciar();
        break;
      case 'clientes':
        if (this.auth.puede('pagina.agencias.clientes')) this.clientesTabla.reiniciar();
        break;
    }
  }

  /** Cambia de pestaña desde los botones de arriba (y pide los datos de esa pestaña si es la primera vez). */
  seleccionarTab(tab: typeof this.tabActiva): void {
    this.tabActiva = tab;
    this.cargarSegunTab(tab);
  }

  cargarTodo(): void {
    this.tabsCargadas.clear();
    this.referenciasCargadas.clear();
    this.cargarSegunTab(this.tabActiva);
  }

  /**
   * Listas de referencia (regiones, clientes, agencias, catálogo y usuarios) que alimentan las tablas y los desplegables de los modales.
   * Antes se pedían todas al entrar; ahora cada pestaña pide las suyas y los modales completan lo que falte antes de abrirse.
   */
  private referenciasCargadas = new Set<GrupoReferencia>();

  private referenciasDeTab(clave: string): GrupoReferencia[] {
    switch (clave) {
      case 'mapa': return ['sucursales', 'usuarios'];
      case 'agencias': return ['sucursales', 'marcas', 'regiones', 'catalogo', 'usuarios'];
      case 'regiones': return ['regiones', 'sucursales', 'usuarios'];
      case 'clientes': return ['marcas', 'sucursales'];
      case 'gerentes': return ['sucursales', 'usuarios', 'regiones', 'marcas', 'catalogo'];
      default: return [];
    }
  }

  private referenciasListas(grupos: GrupoReferencia[]): boolean {
    return grupos.every((g) => this.referenciasCargadas.has(g));
  }

  /** Pide las listas que faltan (una sola vez cada una) y avisa cuando todas llegaron. */
  private cargarReferencias(grupos: GrupoReferencia[], alTerminar?: () => void): void {
    const peticiones: Observable<unknown>[] = [];
    for (const g of grupos) {
      if (this.referenciasCargadas.has(g)) continue;
      this.referenciasCargadas.add(g);
      const peticion = this.peticionReferencia(g);
      if (peticion) peticiones.push(peticion.pipe(catchError(() => of(null))));
    }
    if (!peticiones.length) {
      alTerminar?.();
      return;
    }
    forkJoin(peticiones).subscribe(() => alTerminar?.());
  }

  /** Abre un modal solo cuando ya están todas las listas que usa su formulario (las pide la primera vez). */
  private conReferencias(abrir: () => void): boolean {
    if (this.referenciasListas(TODAS_LAS_REFERENCIAS)) return true;
    this.cargarReferencias(TODAS_LAS_REFERENCIAS, abrir);
    return false;
  }

  private peticionReferencia(grupo: GrupoReferencia): Observable<unknown> | null {
    switch (grupo) {
      case 'regiones': {
        // Sin la pestaña Regiones se usa la lista de opciones (la que ya piden los desplegables).
        const verRegiones = this.auth.puede('pagina.agencias.regiones');
        return (verRegiones ? this.regionService.getRegiones() : this.regionService.getRegionesLista()).pipe(tap((list) => {
          this.regiones = list;
          this.regionSeleccionada = this.regionSeleccionada
            ? list.find(r => r.id === this.regionSeleccionada!.id) || list[0]
            : list[0] || null;
        }));
      }
      case 'marcas': {
        const verClientes = this.auth.puede('pagina.agencias.clientes');
        return (verClientes ? this.marcaService.getMarcas() : this.clienteService.getClientesLista()).pipe(tap((list) => {
          this.marcas = list;
          this.marcaSeleccionada = this.marcaSeleccionada
            ? list.find(m => m.id === this.marcaSeleccionada!.id) || list[0]
            : list[0] || null;
        }));
      }
      case 'sucursales':
        return this.sucursalService.getSucursales().pipe(tap((list) => { this.sucursales = list; }));
      case 'catalogo':
        if (!this.auth.puede('catalogo.ver')) return null;
        return this.catalogoService.getServiciosActivos().pipe(tap((list) => { this.catalogoServicios = list; }));
      case 'usuarios': {
        const aplicar = (list: Usuario[]) => {
          if (!list || !list.length) return;
          this.todosLosUsuarios = list;
          this.gerentesUsuarios = list.filter(u => {
            const r = (u.rol || u.rolNombre || '').toUpperCase();
            const activo = u.estado === 'Activo' || (u as any).estado === 1;
            return activo && r === 'APROBADOR';
          });
          this.supervisoresUsuarios = list.filter(u =>
            (u.estado === 'Activo' || (u as any).estado === 1) &&
            (u.rol === 'SUPERVISOR' || u.rol === 'Supervisor Regional' || u.rol.toLowerCase().includes('supervisor'))
          );
        };
        this.usuarioService.usuarios$.subscribe(aplicar);
        return this.puedeVerUsuarios ? this.usuarioService.getUsuarios().pipe(tap(aplicar)) : null;
      }
    }
  }

  getLiderOperador(suc: Sucursal): string {
    if (suc.liderOperador && suc.liderOperador !== 'Sin Asignar' && suc.liderOperador !== 'Sin asignar') {
      return suc.liderOperador;
    }
    const lider = this.todosLosUsuarios.find(u => {
      const r = (u.rol || u.rolNombre || '').toLowerCase();
      const esLider = r.includes('lider') || r.includes('líder');
      const activo = u.estado === 'Activo' || (u as any).estado === 1;
      const coincideSucursal =
        String(u.agenciaId) === String(suc.id) ||
        (u.agencia && (u.agencia.toLowerCase() === suc.nombre.toLowerCase() || suc.nombre.toLowerCase().includes(u.agencia.toLowerCase()))) ||
        (u.sucursal && (u.sucursal.toLowerCase() === suc.nombre.toLowerCase() || suc.nombre.toLowerCase().includes(u.sucursal.toLowerCase())));
      return esLider && activo && coincideSucursal;
    });

    if (lider) {
      return `${lider.nombre} ${lider.apellido}`.trim() || lider.nombre;
    }
    return suc.liderOperador || 'Sin Asignar';
  }

  sucursalesDeRegion(regionId: number | string): Sucursal[] {
    return this.sucursales.filter(s => String(s.regionId) === String(regionId));
  }

  sucursalesDeMarca(marcaId: number | string): Sucursal[] {
    return this.sucursales.filter(s => String(s.marcaId) === String(marcaId));
  }

  colorMarca(marcaId?: number | string): string {
    return this.marcas.find(m => String(m.id) === String(marcaId))?.color || '#004282';
  }

  verEnMapa(suc: Sucursal): void {
    this.filtroSucursalMapaId = suc.id;
    this.tabActiva = 'mapa';
  }

  /** Estados de bahía que se pueden filtrar en el mapa («Ocupada» agrupa lo que está en atención). */
  readonly estadosBahiaMapa = ['Todos', 'Disponible', 'Ocupada', 'Lavado', 'Secado', 'Aspirado', 'Mantenimiento', 'Inactiva'];

  private filtrosMapa: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Mes' };

  aplicarFiltrosMapa(filtros: FilterState): void {
    this.filtrosMapa = filtros;
  }

  private neutroMapa(v: unknown, ...neutros: string[]): string {
    const t = String(v ?? '').trim();
    return !t || neutros.includes(t) ? '' : t.toLowerCase();
  }

  private incluyeMapa(texto: unknown, buscado: string): boolean {
    return String(texto ?? '').toLowerCase().includes(buscado);
  }

  /** ¿La bahía está en el estado elegido? «Ocupada» incluye lavado, secado, aspirado y cualquier vehículo en atención. */
  private bahiaEnEstado(b: Bahia, estado: string): boolean {
    const e = String(b.estado ?? '').toLowerCase();
    if (estado === 'ocupada') return e === 'ocupada' || e === 'lavado' || e === 'secado' || e === 'aspirado' || !!b.ocupada;
    return e === estado;
  }

  /** ¿La bahía coincide con el texto buscado (nombre, operador o placa en atención)? */
  private bahiaCoincideTexto(b: Bahia, q: string): boolean {
    return this.incluyeMapa(b.nombre, q) || this.incluyeMapa(b.operadorAsignado, q) || this.incluyeMapa(b.ocupada?.placa, q);
  }

  private agenciaCoincideTexto(s: Sucursal, q: string): boolean {
    return [s.nombre, s.codigo, s.ciudad, s.responsable, s.regionNombre, s.clienteNombre, s.marcaNombre, this.getLiderOperador(s)].some((v) => this.incluyeMapa(v, q));
  }

  get sucursalesMapa(): Sucursal[] {
    const f = this.filtrosMapa;
    const region = this.neutroMapa(f.region, 'Todas', 'Todos');
    const cliente = this.neutroMapa(f.cliente ?? f.marca, 'Todas', 'Todos');
    const agencia = this.neutroMapa(f.sucursal, 'Todas', 'Todos');
    const estado = this.neutroMapa(f.estado, 'Todos');
    const q = this.neutroMapa(f.busqueda) || this.neutroMapa(this.busquedaTextoMapa);
    const unaSola = this.filtroSucursalMapaId && this.filtroSucursalMapaId !== 0 && this.filtroSucursalMapaId !== '0' ? String(this.filtroSucursalMapaId) : '';
    return this.sucursales.filter((s) => {
      if (unaSola && String(s.id) !== unaSola) return false;
      if (region && String(s.regionNombre ?? '').toLowerCase() !== region) return false;
      if (cliente && String(s.clienteNombre || s.marcaNombre || '').toLowerCase() !== cliente) return false;
      if (agencia && String(s.nombre ?? '').toLowerCase() !== agencia) return false;
      const bahias = this.getBahiasDeSucursal(s.id);
      if (estado && !bahias.some((b) => this.bahiaEnEstado(b, estado))) return false;
      if (q && !this.agenciaCoincideTexto(s, q) && !bahias.some((b) => this.bahiaCoincideTexto(b, q))) return false;
      return true;
    });
  }

  /** Bahías de la agencia que se muestran: las del estado elegido y, si se buscó texto que no es de la agencia, las que coinciden. */
  bahiasVisibles(suc: Sucursal): Bahia[] {
    const f = this.filtrosMapa;
    const estado = this.neutroMapa(f.estado, 'Todos');
    const q = this.neutroMapa(f.busqueda) || this.neutroMapa(this.busquedaTextoMapa);
    let bahias = this.getBahiasDeSucursal(suc.id);
    if (estado) bahias = bahias.filter((b) => this.bahiaEnEstado(b, estado));
    if (q && !this.agenciaCoincideTexto(suc, q)) bahias = bahias.filter((b) => this.bahiaCoincideTexto(b, q));
    return bahias;
  }

  getBahiasDeSucursal(sucursalId: number | string): Bahia[] {
    return this.bahiasTodas.filter(b => String(b.sucursalId) === String(sucursalId) || String(b.agenciaId) === String(sucursalId));
  }

  getEstadoBahiaBadge(estado: string): string {
    const map: Record<string, string> = {
      'Disponible': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Lavado': 'bg-blue-50 text-blue-700 border-blue-200',
      'Secado': 'bg-amber-50 text-amber-700 border-amber-200',
      'Aspirado': 'bg-purple-50 text-purple-700 border-purple-200',
      'Mantenimiento': 'bg-rose-50 text-rose-700 border-rose-200',
      'Inactiva': 'bg-slate-100 text-slate-500 border-slate-200'
    };
    return map[estado] || 'bg-slate-100 text-slate-600 border-slate-200';
  }

  abrirModalCrearSucursal(): void {
    if (!this.conReferencias(() => this.abrirModalCrearSucursal())) return;
    if (!this.puedeCrearAgencia) return;
    this.editandoSucursal = false;
    this.nuevaSucursal = this.sucursalVacia();
    // Cargar catálogo actualizado desde la BD
    this.catalogoService.getServiciosActivos().subscribe(list => {
      this.catalogoServicios = list;
      if (this.serviciosGenerales.length > 0) {
        this.nuevaSucursal.servicioIds = this.serviciosGenerales.map(s => Number(s.id));
        this.nuevaSucursal.serviciosNombres = this.serviciosGenerales.map(s => s.nombre);
      }
    });
    this.modalCrearOpen = true;
  }

  abrirModalEditar(suc: Sucursal): void {
    if (!this.conReferencias(() => this.abrirModalEditar(suc))) return;
    if (!this.puedeEditarAgencia) return;
    this.editandoSucursal = true;
    this.preciosServicios = [];
    this.preciosEditados = {};
    if (this.puedeGestionarPrecios) {
      this.sucursalService.getPreciosServicios(suc.id).subscribe(lista => {
        this.preciosServicios = lista;
      });
    }

    // Asegurarse de tener el catálogo actualizado desde la BD
    if (this.auth.puede('catalogo.ver')) {
      this.catalogoService.getServiciosActivos().subscribe(list => {
        this.catalogoServicios = list;
      });
    }

    const catalogoIds = new Set(this.catalogoServicios.map(s => Number(s.id)));
    const idsEspeciales = new Set(this.serviciosEspeciales.map(s => Number(s.id)));

    // Origen de verdad: IDs guardados en la BD para esta sucursal
    let sIds: number[] = [];
    if (Array.isArray(suc.servicioIds)) {
      sIds = suc.servicioIds
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id > 0 && (catalogoIds.size === 0 || catalogoIds.has(id)));
    } else {
      // Si la sucursal nunca ha tenido servicios configurados en BD, sugerir generales
      sIds = this.serviciosGenerales.map(s => Number(s.id));
    }

    const tieneEsp = suc.tieneServiciosEspeciales !== undefined
      ? Boolean(suc.tieneServiciosEspeciales)
      : sIds.some(id => idsEspeciales.has(id));

    if (!tieneEsp) {
      sIds = sIds.filter(id => !idsEspeciales.has(id));
    } else {
      this.serviciosEspeciales.forEach(s => sIds.push(Number(s.id)));
    }

    sIds = Array.from(new Set(sIds));
    suc.servicioIds = sIds;
    suc.tieneServiciosEspeciales = tieneEsp;

    const tieneGer = !!suc.gerenteId || (!!suc.responsable && suc.responsable !== 'Sin Asignar' && !suc.responsable.toLowerCase().includes('operación directa'));

    let gId = suc.gerenteId;
    let gNombre = suc.gerenteNombre;
    if (!gId && suc.responsable && suc.responsable !== 'Sin Asignar') {
      const g = this.gerentesUsuarios.find(u => `${u.nombre} ${u.apellido || ''}`.trim().toLowerCase() === suc.responsable.trim().toLowerCase());
      if (g) {
        gId = g.id;
        gNombre = `${g.nombre} ${g.apellido || ''}`.trim();
      }
    }

    this.nuevaSucursal = {
      ...suc,
      ciudad: suc.ciudad || suc.regionNombre || '',
      direccion: suc.direccion || '',
      cantidadBahias: suc.cantidadBahias || 1,
      maxLavadoresPorBahia: suc.maxLavadoresPorBahia || 1,
      servicioIds: sIds,
      serviciosNombres: this.catalogoServicios.filter(s => sIds.includes(Number(s.id))).map(s => s.nombre),
      requiereAprobacion: suc.requiereAprobacion !== undefined ? suc.requiereAprobacion : tieneGer,
      gerenteId: gId,
      gerenteNombre: gNombre || (suc.responsable !== 'Sin Asignar' ? suc.responsable : undefined),
      responsable: suc.responsable || 'Sin Asignar',
      tieneServiciosEspeciales: tieneEsp
    };
    this.modalCrearOpen = true;
  }

  alCambiarToggleServiciosEspeciales(activo: boolean): void {
    this.nuevaSucursal.tieneServiciosEspeciales = activo;
    const idsEspeciales = new Set(this.serviciosEspeciales.map(s => Number(s.id)));
    if (activo) {
      const actuales = new Set((this.nuevaSucursal.servicioIds || []).map(Number));
      this.serviciosEspeciales.forEach(s => actuales.add(Number(s.id)));
      this.nuevaSucursal.servicioIds = Array.from(actuales);
    } else {
      this.nuevaSucursal.servicioIds = (this.nuevaSucursal.servicioIds || [])
        .map(Number)
        .filter(id => !idsEspeciales.has(id));
    }
    this.actualizarNombresServicios();
  }

  alCambiarToggleAprobacion(activo: boolean): void {
    this.nuevaSucursal.requiereAprobacion = activo;
    if (!activo) {
      this.nuevaSucursal.gerenteId = undefined;
      this.nuevaSucursal.gerenteNombre = undefined;
      this.nuevaSucursal.responsable = 'Sin Asignar';
    } else if (!this.nuevaSucursal.gerenteId && this.gerentesUsuarios.length > 0) {
      this.nuevaSucursal.gerenteId = this.gerentesUsuarios[0].id;
      this.nuevaSucursal.gerenteNombre = `${this.gerentesUsuarios[0].nombre} ${this.gerentesUsuarios[0].apellido || ''}`.trim();
      this.nuevaSucursal.responsable = this.nuevaSucursal.gerenteNombre;
    }
  }

  alCambiarGerente(gerId: any): void {
    if (gerId) {
      const ger = this.gerentesUsuarios.find(g => String(g.id) === String(gerId));
      if (ger) {
        this.nuevaSucursal.gerenteNombre = `${ger.nombre} ${ger.apellido || ''}`.trim();
        this.nuevaSucursal.responsable = this.nuevaSucursal.gerenteNombre;
      }
    } else {
      this.nuevaSucursal.gerenteNombre = undefined;
      this.nuevaSucursal.responsable = this.nuevaSucursal.requiereAprobacion ? 'Por Asignar' : 'Sin Asignar';
    }
  }

  alCambiarLiderOperador(id: any): void {
    if (id) {
      const lid = this.lideresOperadoresUsuarios.find(u => String(u.id) === String(id));
      this.nuevaSucursal.liderOperador = lid ? `${lid.nombre} ${lid.apellido || ''}`.trim() : undefined;
      this.nuevaSucursal.liderOperadorNombre = this.nuevaSucursal.liderOperador;
    } else {
      this.nuevaSucursal.liderOperador = undefined;
      this.nuevaSucursal.liderOperadorNombre = undefined;
    }
  }

  cerrarModal(): void {
    this.modalCrearOpen = false;
    this.editandoSucursal = false;
    this.mostrarAltaRegion = false;
    this.mostrarAltaMarca = false;
    this.altaRapidaRegion = '';
    this.altaRapidaMarca = '';
    this.nuevaSucursal = this.sucursalVacia();
  }

  crearRegionRapida(): void {
    if (!this.altaRapidaRegion.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre de la región.');
      return;
    }
    this.regionService.crear({
      nombre: this.altaRapidaRegion.trim(),
      descripcion: '',
      responsable: '',
      estado: 'Activa'
    }).subscribe({
      next: (creada) => {
        this.regiones = [...this.regiones, creada];
        this.nuevaSucursal.regionId = creada.id;
        this.altaRapidaRegion = '';
        this.mostrarAltaRegion = false;
        this.toastService.success('Región creada', creada.nombre + ' lista para asignar.');
      },
      error: (err) => this.toastService.error('No se pudo crear la región', this.mensajeError(err, 'El servidor no aceptó la región.'))
    });
  }

  crearMarcaRapida(): void {
    if (!this.altaRapidaMarca.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre del cliente.');
      return;
    }
    this.marcaService.crear({
      nombre: this.altaRapidaMarca.trim(),
      descripcion: '',
      color: '#004282',
      estado: 'Activa'
    }).subscribe({
      next: (creada) => {
        this.marcas = [...this.marcas, creada];
        this.nuevaSucursal.marcaId = creada.id;
        this.nuevaSucursal.clienteId = creada.id;
        this.altaRapidaMarca = '';
        this.mostrarAltaMarca = false;
        this.toastService.success('Cliente creado', creada.nombre + ' listo para asignar.');
      },
      error: (err) => this.toastService.error('No se pudo crear el cliente', this.mensajeError(err, 'El servidor no aceptó el cliente.'))
    });
  }

  guardarSucursal(): void {
    if (!this.nuevaSucursal.nombre?.trim()) {
      this.toastService.warning('Datos Incompletos', 'Ingrese el nombre de la agencia.');
      return;
    }

    // Quien crea la agencia debe elegir región y cliente (no se asignan por su cuenta).
    if (this.puedeElegirRegion && (!this.nuevaSucursal.regionId || this.nuevaSucursal.regionId === 0 || this.nuevaSucursal.regionId === '0')) {
      this.toastService.warning('Región requerida', 'Seleccione la región de la agencia.');
      return;
    }
    if (this.puedeElegirCliente) {
      if (!this.nuevaSucursal.marcaId || this.nuevaSucursal.marcaId === 0 || this.nuevaSucursal.marcaId === '0') {
        this.toastService.warning('Cliente requerido', 'Seleccione el cliente de la agencia.');
        return;
      }
    }

    // Sincronizar nombres de región y marca
    const regObj = this.regiones.find(r => String(r.id) === String(this.nuevaSucursal.regionId));
    if (regObj) this.nuevaSucursal.regionNombre = regObj.nombre;

    const marcaObj = this.marcas.find(m => String(m.id) === String(this.nuevaSucursal.marcaId));
    if (marcaObj) this.nuevaSucursal.marcaNombre = marcaObj.nombre;

    // Normalizar y filtrar servicios estrictamente al catálogo activo
    const catalogoIds = new Set(this.catalogoServicios.map(s => Number(s.id)));
    const idsEspeciales = new Set(this.serviciosEspeciales.map(s => Number(s.id)));

    let serviciosLimpios = (this.nuevaSucursal.servicioIds || [])
      .map(id => Number(id))
      .filter(id => !isNaN(id) && id > 0 && (catalogoIds.size === 0 || catalogoIds.has(id)));

    // Si servicios especiales está activo, incorporar TODOS los servicios especiales
    if (this.nuevaSucursal.tieneServiciosEspeciales) {
      this.serviciosEspeciales.forEach(s => serviciosLimpios.push(Number(s.id)));
    } else {
      serviciosLimpios = serviciosLimpios.filter(id => !idsEspeciales.has(id));
    }

    this.nuevaSucursal.servicioIds = Array.from(new Set(serviciosLimpios));
    this.nuevaSucursal.serviciosNombres = this.catalogoServicios
      .filter(s => this.nuevaSucursal.servicioIds!.includes(Number(s.id)))
      .map(s => s.nombre);

    // Aprobador y líder: solo los define quien puede gestionar usuarios (los demás no los envían ni los cambian).
    if (this.puedeAsignarPersonas) {
      if (this.nuevaSucursal.requiereAprobacion && this.nuevaSucursal.gerenteId) {
        const ger = this.gerentesUsuarios.find(g => String(g.id) === String(this.nuevaSucursal.gerenteId));
        this.nuevaSucursal.gerenteNombre = ger ? (ger.nombre + ' ' + (ger.apellido ?? '')).trim() : this.nuevaSucursal.gerenteNombre;
        this.nuevaSucursal.responsable = this.nuevaSucursal.gerenteNombre || 'Por Asignar';
      } else if (this.nuevaSucursal.requiereAprobacion) {
        this.nuevaSucursal.gerenteId = undefined;
        this.nuevaSucursal.gerenteNombre = undefined;
        this.nuevaSucursal.responsable = 'Por Asignar';
      } else {
        this.nuevaSucursal.gerenteId = undefined;
        this.nuevaSucursal.gerenteNombre = undefined;
        this.nuevaSucursal.responsable = 'Sin Asignar';
      }

      if (this.nuevaSucursal.liderOperadorId) {
        const lid = this.lideresOperadoresUsuarios.find(u => String(u.id) === String(this.nuevaSucursal.liderOperadorId));
        this.nuevaSucursal.liderOperador = lid ? (lid.nombre + ' ' + (lid.apellido ?? '')).trim() : (this.nuevaSucursal.liderOperador || 'Sin Asignar');
        this.nuevaSucursal.liderOperadorNombre = this.nuevaSucursal.liderOperador;
      } else {
        this.nuevaSucursal.liderOperador = undefined;
        this.nuevaSucursal.liderOperadorNombre = undefined;
      }
    }

    if (!this.nuevaSucursal.ciudad?.trim()) {
      this.toastService.warning('Ciudad requerida', 'Ingrese la ciudad donde se ubica la agencia.');
      return;
    }
    if (!this.nuevaSucursal.direccion?.trim()) {
      this.toastService.warning('Dirección requerida', 'Ingrese la dirección de la agencia.');
      return;
    }
    if (this.puedeCrearBahias && (!this.nuevaSucursal.cantidadBahias || this.nuevaSucursal.cantidadBahias <= 0)) {
      this.toastService.warning('Bahías requeridas', 'Indique cuántas bahías tiene la agencia.');
      return;
    }
    if (!this.nuevaSucursal.maxLavadoresPorBahia || this.nuevaSucursal.maxLavadoresPorBahia <= 0) {
      this.nuevaSucursal.maxLavadoresPorBahia = 1;
    }

    this.guardando = true;
    if (this.editandoSucursal) {
      this.sucursalService.actualizarSucursal(this.nuevaSucursal, {
        motivo: 'Actualización desde ficha de agencia',
        realizadoPor: this.nombreUsuarioActual()
      }, {
        region: this.puedeTransferirRegion,
        cliente: this.puedeTransferirCliente,
        bahias: this.puedeCrearBahias,
        personas: this.puedeAsignarPersonas
      }).subscribe({
        next: (actualizada) => {
          this.guardando = false;
          this.bahiaService.sincronizarBahias(actualizada.id, actualizada.nombre, actualizada.cantidadBahias);
          this.toastService.success('Agencia Actualizada', 'Se guardaron los cambios de ' + actualizada.nombre + '.');
          this.guardarPreciosPendientesTras(actualizada.id);
          this.cerrarModal();
          this.cargarTodo();
        },
        error: (err) => {
          this.guardando = false;
          this.toastService.error('No se pudo actualizar la agencia', this.mensajeError(err, 'El servidor no aceptó los cambios.'));
        }
      });
    } else {
      this.sucursalService.crearSucursal(this.nuevaSucursal).subscribe({
        next: (creada) => {
          this.guardando = false;
          this.bahiaService.sincronizarBahias(creada.id, creada.nombre, creada.cantidadBahias);
          this.toastService.success('Agencia Registrada', 'Se configuró ' + creada.nombre + ' correctamente.');
          this.guardarPreciosPendientesTras(creada.id);
          this.cerrarModal();
          this.cargarTodo();
        },
        error: (err) => {
          this.guardando = false;
          this.toastService.error('No se pudo registrar la agencia', this.mensajeError(err, 'El servidor no aceptó la agencia.'));
        }
      });
    }
  }

  abrirModalRegion(region?: RegionOperativa): void {
    if (!this.conReferencias(() => this.abrirModalRegion(region))) return;
    if (region ? !this.puedeEditarRegion : !this.puedeCrearRegion) return;
    this.editandoRegion = !!region;
    let supId: string | number = '';
    if (region) {
      if (region.supervisorId) {
        supId = region.supervisorId;
      } else if (region.responsable) {
        const found = this.supervisoresUsuarios.find(s =>
          `${s.nombre} ${s.apellido}`.trim().toLowerCase() === region.responsable?.trim().toLowerCase() ||
          region.responsable?.toLowerCase().includes(s.nombre.toLowerCase())
        );
        if (found) supId = found.id;
      }
    }
    this.formRegion = region
      ? { ...region, supervisorId: supId }
      : { nombre: '', descripcion: '', responsable: '', supervisorId: '', estado: 'Activa' };
    this.modalRegionOpen = true;
  }

  alCambiarSupervisorRegion(supId: any): void {
    if (!supId) {
      this.formRegion.responsable = '';
      this.formRegion.supervisorId = '';
      return;
    }
    const sup = this.supervisoresUsuarios.find(s => String(s.id) === String(supId));
    if (sup) {
      this.formRegion.responsable = `${sup.nombre} ${sup.apellido}`.trim();
      this.formRegion.supervisorId = sup.id;
    }
  }

  cambiarEstadoRegion(region: RegionOperativa): void {
    if (!this.puedeCambiarEstadoRegion) return;
    const activar = region.estado !== 'Activa';
    this.regionService.cambiarEstado(region.id, activar).subscribe({
      next: (actualizada) => {
        this.toastService.success(activar ? 'Región activada' : 'Región desactivada', actualizada.nombre);
        this.regionSeleccionada = { ...region, estado: actualizada.estado };
        this.regionesTabla.refrescar();
        this.cargarTodo();
      },
      error: (err) => this.toastService.error('No se pudo cambiar el estado', this.mensajeError(err, 'El servidor no aceptó el cambio.'))
    });
  }

  guardarRegion(): void {
    if (!this.formRegion.nombre?.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre de la región.');
      return;
    }
    if (this.editandoRegion && this.formRegion.id) {
      this.regionService.actualizar(this.formRegion as RegionOperativa, this.puedeCambiarEstadoRegion).subscribe({
        next: (actualizada) => {
          this.sucursalService.sincronizarNombresCatalogo();
          this.toastService.success('Región actualizada', actualizada.nombre);
          this.modalRegionOpen = false;
          this.regionSeleccionada = actualizada;
          this.regionesTabla.refrescar();
          this.cargarTodo();
        },
        error: (err) => this.toastService.error('No se pudo guardar la región', this.mensajeError(err, 'El servidor no aceptó los cambios.'))
      });
    } else {
      this.regionService.crear(this.formRegion).subscribe({
        next: (creada) => {
          this.toastService.success('Región creada', creada.nombre + ' lista para recibir agencias.');
          this.modalRegionOpen = false;
          this.regionSeleccionada = creada;
          this.tabActiva = 'regiones';
          this.regionesTabla.refrescar();
          this.cargarTodo();
        },
        error: (err) => this.toastService.error('No se pudo crear la región', this.mensajeError(err, 'El servidor no aceptó la región.'))
      });
    }
  }

  abrirModalMarca(marca?: MarcaSucursal): void {
    if (!this.conReferencias(() => this.abrirModalMarca(marca))) return;
    if (marca ? !this.puedeEditarCliente : !this.puedeCrearCliente) return;
    this.editandoMarca = !!marca;
    this.formMarca = marca
      ? { ...marca }
      : { nombre: '', descripcion: '', color: '#004282', estado: 'Activa' };
    this.modalMarcaOpen = true;
  }

  cambiarEstadoCliente(marca: MarcaSucursal): void {
    if (!this.puedeCambiarEstadoCliente) return;
    const activar = marca.estado !== 'Activa';
    this.marcaService.cambiarEstado(marca.id, activar).subscribe({
      next: (res) => {
        this.toastService.success(activar ? 'Cliente activado' : 'Cliente desactivado', marca.nombre);
        this.marcaSeleccionada = { ...marca, estado: res?.estado === 1 ? 'Activa' : 'Inactiva' };
        this.clientesTabla.refrescar();
        this.cargarTodo();
      },
      error: (err) => this.toastService.error('No se pudo cambiar el estado', this.mensajeError(err, 'El servidor no aceptó el cambio.'))
    });
  }

  guardarMarca(): void {
    if (!this.formMarca.nombre?.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre del cliente.');
      return;
    }
    if (this.editandoMarca && this.formMarca.id) {
      this.marcaService.actualizar(this.formMarca as MarcaSucursal, this.puedeCambiarEstadoCliente).subscribe({
        next: (actualizada) => {
          this.sucursalService.sincronizarNombresCatalogo();
          this.toastService.success('Cliente actualizado', actualizada.nombre);
          this.modalMarcaOpen = false;
          this.marcaSeleccionada = actualizada;
          this.clientesTabla.refrescar();
          this.cargarTodo();
        },
        error: (err) => this.toastService.error('No se pudo guardar el cliente', this.mensajeError(err, 'El servidor no aceptó los cambios.'))
      });
    } else {
      this.marcaService.crear(this.formMarca).subscribe({
        next: (creada) => {
          this.toastService.success('Cliente creado', creada.nombre + ' listo para asignar.');
          this.modalMarcaOpen = false;
          this.marcaSeleccionada = creada;
          this.tabActiva = 'clientes';
          this.clientesTabla.refrescar();
          this.cargarTodo();
        },
        error: (err) => this.toastService.error('No se pudo crear el cliente', this.mensajeError(err, 'El servidor no aceptó el cliente.'))
      });
    }
  }

  abrirModalTransferir(suc: Sucursal): void {
    if (!this.conReferencias(() => this.abrirModalTransferir(suc))) return;
    if (!this.puedeTransferirAlguno) return;
    this.formTransfer = {
      sucursalId: suc.id,
      regionId: suc.regionId || 0,
      marcaId: suc.marcaId || 0,
      motivo: ''
    };
    this.modalTransferirOpen = true;
  }

  abrirAsignarARegion(region: RegionOperativa): void {
    if (!this.conReferencias(() => this.abrirAsignarARegion(region))) return;
    if (!this.puedeTransferirRegion) return;
    const candidata = this.sucursales.find(s => String(s.regionId) !== String(region.id)) || this.sucursales[0];
    this.formTransfer = {
      sucursalId: candidata?.id || 0,
      regionId: region.id,
      marcaId: candidata?.marcaId || 0,
      motivo: `Paso de sucursal a la región ${region.nombre}`
    };
    this.modalTransferirOpen = true;
  }

  abrirAsignarAMarca(marca: MarcaSucursal): void {
    if (!this.conReferencias(() => this.abrirAsignarAMarca(marca))) return;
    if (!this.puedeTransferirCliente) return;
    const candidata = this.sucursales.find(s => String(s.marcaId) !== String(marca.id)) || this.sucursales[0];
    this.formTransfer = {
      sucursalId: candidata?.id || 0,
      regionId: candidata?.regionId || 0,
      marcaId: marca.id,
      motivo: `Asignación a marca ${marca.nombre}`
    };
    this.modalTransferirOpen = true;
  }

  guardarTransferencia(): void {
    const suc = this.sucursales.find(s => String(s.id) === String(this.formTransfer.sucursalId));
    if (!suc) {
      this.toastService.warning('Agencia requerida', 'Seleccione la agencia a transferir.');
      return;
    }
    if (!this.formTransfer.motivo.trim()) {
      this.toastService.warning('Motivo requerido', 'Indique por qué se transfiere o cambia.');
      return;
    }
    const cambiaRegion = this.puedeTransferirRegion && this.formTransfer.regionId !== suc.regionId;
    const cambiaCliente = this.puedeTransferirCliente && this.formTransfer.marcaId !== suc.marcaId;
    if (!cambiaRegion && !cambiaCliente) {
      this.toastService.warning('Sin cambios', 'Seleccione una región o marca distinta.');
      return;
    }

    this.sucursalService.transferirSucursal({
      sucursalId: suc.id,
      regionId: cambiaRegion ? this.formTransfer.regionId : undefined,
      marcaId: cambiaCliente ? this.formTransfer.marcaId : undefined,
      motivo: this.formTransfer.motivo.trim(),
      realizadoPor: this.nombreUsuarioActual()
    }).subscribe({
      next: (actualizada) => {
        if (!actualizada) return;
        this.toastService.success(
          'Transferencia aplicada',
          actualizada.nombre + ' quedó en ' + actualizada.regionNombre + ' · ' + actualizada.marcaNombre + '.'
        );
        this.modalTransferirOpen = false;
        this.agenciasLista.reiniciar();
        this.cargarTodo();
      },
      error: (err) => this.toastService.error('No se pudo transferir', this.mensajeError(err, 'El servidor no aceptó la transferencia.'))
    });
  }

  servicioSeleccionado(id: number | string): boolean {
    const numId = Number(id);
    return (this.nuevaSucursal.servicioIds || []).some(x => Number(x) === numId);
  }

  toggleServicio(id: number | string, nombre: string): void {
    const numId = Number(id);
    const ids = (this.nuevaSucursal.servicioIds || []).map(Number);
    const idx = ids.indexOf(numId);
    if (idx >= 0) {
      ids.splice(idx, 1);
    } else {
      ids.push(numId);
    }
    this.nuevaSucursal.servicioIds = Array.from(new Set(ids));
    this.actualizarNombresServicios();
  }

  get totalServiciosSeleccionados(): number {
    return this.cantidadGeneralesSeleccionados + this.cantidadEspecialesSeleccionados;
  }

  precioServicio(id: number | string): PrecioServicioAgencia | undefined {
    return this.preciosServicios.find(p => p.catalogoServicioId === Number(id));
  }

  precioMostrado(id: number | string): number | null {
    const numId = Number(id);
    if (this.preciosEditados[numId] !== undefined) return this.preciosEditados[numId];
    return this.precioServicio(numId)?.precioEfectivo ?? null;
  }

  onPrecioServicioChange(id: number | string, valor: string): void {
    const numId = Number(id);
    const num = Number(valor);
    if (valor === '' || Number.isNaN(num)) {
      delete this.preciosEditados[numId];
    } else {
      this.preciosEditados[numId] = num;
    }
  }

  get hayPreciosPendientes(): boolean {
    return Object.keys(this.preciosEditados).length > 0;
  }

  /**
   * Los precios escritos en el formulario se guardan junto con la agencia: antes solo se guardaban con el botón «Guardar precios»,
   * y si el servicio recién marcado aún no existía en la agencia, el valor escrito se perdía en silencio al guardar.
   */
  private guardarPreciosPendientesTras(agenciaId: string | number): void {
    if (!this.puedeGestionarPrecios || !this.hayPreciosPendientes) return;
    const seleccionados = new Set((this.nuevaSucursal.servicioIds || []).map(Number));
    const precios = Object.entries(this.preciosEditados)
      .map(([catalogoServicioId, precio]) => ({ catalogoServicioId: Number(catalogoServicioId), precio }))
      .filter(p => seleccionados.has(p.catalogoServicioId));
    this.preciosEditados = {};
    if (!precios.length) return;
    this.sucursalService.setPreciosServicios(agenciaId, precios).subscribe({
      error: (err) => this.toastService.error('Precios sin guardar', this.mensajeError(err, 'La agencia se guardó, pero el servidor no aceptó los precios.')),
    });
  }

  guardarPreciosServicios(): void {
    if (!this.hayPreciosPendientes || !this.nuevaSucursal.id) return;
    // El backend solo acepta precios de servicios ya guardados en la agencia; los recién marcados
    // en este modal aún no existen en la BD hasta pulsar "Guardar Cambios".
    const guardados = new Set(this.preciosServicios.map(p => p.catalogoServicioId));
    const seleccionados = new Set((this.nuevaSucursal.servicioIds || []).map(Number));
    const editados = Object.entries(this.preciosEditados)
      .map(([catalogoServicioId, precio]) => ({ catalogoServicioId: Number(catalogoServicioId), precio }))
      .filter(p => seleccionados.has(p.catalogoServicioId));
    const precios = editados.filter(p => guardados.has(p.catalogoServicioId));
    if (precios.length < editados.length) {
      this.toastService.warning(
        'Guarda la agencia primero',
        'Hay servicios recién marcados que aún no están guardados. Pulsa "Guardar Cambios" y luego fija sus precios.'
      );
      if (precios.length === 0) return;
    }
    this.guardandoPrecios = true;
    this.sucursalService.setPreciosServicios(this.nuevaSucursal.id, precios).subscribe({
      next: (lista) => {
        this.guardandoPrecios = false;
        this.preciosServicios = lista;
        precios.forEach(p => delete this.preciosEditados[p.catalogoServicioId]);
        this.toastService.success('Precios actualizados', 'Los precios de la agencia se guardaron correctamente.');
      },
      error: (err) => {
        this.guardandoPrecios = false;
        this.toastService.error('No se pudo guardar', this.mensajeError(err, 'El servidor no aceptó los precios.'));
      }
    });
  }

  get cantidadGeneralesSeleccionados(): number {
    const ids = new Set((this.nuevaSucursal.servicioIds || []).map(Number));
    return this.serviciosGenerales.filter(s => ids.has(Number(s.id))).length;
  }

  get cantidadEspecialesSeleccionados(): number {
    if (!this.nuevaSucursal.tieneServiciosEspeciales) return 0;
    return this.serviciosEspeciales.length;
  }

  seleccionarTodosGenerales(): void {
    const ids = new Set((this.nuevaSucursal.servicioIds || []).map(Number));
    this.serviciosGenerales.forEach(s => ids.add(Number(s.id)));
    this.nuevaSucursal.servicioIds = Array.from(ids);
    this.actualizarNombresServicios();
  }

  deseleccionarTodosGenerales(): void {
    const genIds = new Set(this.serviciosGenerales.map(s => Number(s.id)));
    this.nuevaSucursal.servicioIds = (this.nuevaSucursal.servicioIds || [])
      .map(Number)
      .filter(id => !genIds.has(id));
    this.actualizarNombresServicios();
  }

  seleccionarTodosEspeciales(event?: Event): void {
    if (event) event.stopPropagation();
    const ids = new Set((this.nuevaSucursal.servicioIds || []).map(Number));
    this.serviciosEspeciales.forEach(s => ids.add(Number(s.id)));
    this.nuevaSucursal.servicioIds = Array.from(ids);
    this.actualizarNombresServicios();
  }

  deseleccionarTodosEspeciales(event?: Event): void {
    if (event) event.stopPropagation();
    const espIds = new Set(this.serviciosEspeciales.map(s => Number(s.id)));
    this.nuevaSucursal.servicioIds = (this.nuevaSucursal.servicioIds || [])
      .map(Number)
      .filter(id => !espIds.has(id));
    this.actualizarNombresServicios();
  }

  private actualizarNombresServicios(): void {
    const ids = new Set((this.nuevaSucursal.servicioIds || []).map(Number));
    this.nuevaSucursal.serviciosNombres = this.catalogoServicios
      .filter(s => ids.has(Number(s.id)))
      .map(s => s.nombre);
  }

  contarServiciosSucursal(suc: Sucursal): number {
    if (!suc) return 0;
    const ids = (suc.servicioIds || []).map(Number);
    const idsSet = new Set(ids);

    if (this.catalogoServicios && this.catalogoServicios.length > 0) {
      const generales = this.serviciosGenerales.filter(s => idsSet.has(Number(s.id))).length;
      const especiales = this.serviciosEspeciales.filter(s => idsSet.has(Number(s.id))).length;
      const tieneEsp = Boolean(suc.tieneServiciosEspeciales);
      return generales + (tieneEsp ? especiales : 0);
    }

    if (suc.serviciosNombres && suc.serviciosNombres.length > 0) {
      return suc.serviciosNombres.length;
    }

    return (suc.servicioIds || []).length;
  }

  private sucursalVacia(): Sucursal {
    const defaultReg = this.regionesActivas[0]?.id || (this.regiones[0]?.id ? this.regiones[0].id : undefined);
    const defaultMarca = this.marcasActivas[0]?.id || (this.marcas[0]?.id ? this.marcas[0].id : undefined);
    const serviciosGenIds = this.serviciosGenerales.length 
      ? this.serviciosGenerales.map(s => Number(s.id)) 
      : [];

    return {
      id: 0,
      nombre: '',
      ciudad: '',
      direccion: '',
      cantidadBahias: 1,
      maxLavadoresPorBahia: 1,
      estado: 'Activo',
      responsable: 'Sin Asignar',
      regionId: defaultReg,
      regionNombre: this.regionesActivas[0]?.nombre || '',
      marcaId: defaultMarca,
      marcaNombre: this.marcasActivas[0]?.nombre || '',
      servicioIds: [...serviciosGenIds],
      serviciosNombres: this.catalogoServicios.filter(s => serviciosGenIds.includes(s.id)).map(s => s.nombre),
      requiereAprobacion: false,
      gerenteId: undefined,
      gerenteNombre: undefined,
      tieneServiciosEspeciales: false,
      liderOperador: undefined,
      liderOperadorId: undefined,
      liderOperadorNombre: undefined
    };
  }

}

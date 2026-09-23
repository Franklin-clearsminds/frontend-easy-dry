import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SucursalService } from '../../core/services/sucursal.service';
import { RegionService } from '../../core/services/region.service';
import { MarcaSucursalService } from '../../core/services/marca-sucursal.service';
import { BahiaService } from '../../core/services/bahia.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { Sucursal, CatalogoServicio, Bahia, Usuario, MarcaSucursal, MovimientoRedSucursal, RegionOperativa } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { CatalogoServiciosService } from '../../core/services/catalogo-servicios.service';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, ModalComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-2">
            <i-lucide name="building-2" class="w-3.5 h-3.5"></i-lucide>
            <span>Gestión de Red Física y Operatividad en Vivo</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Agencias & Mapa de Red EasyDry®</h1>
          <p class="text-slate-500 text-xs mt-1">Control administrativo de sedes, regiones operativas, clientes corporativos y trazabilidad jerárquica de bahías en tiempo real.</p>
        </div>
        <button
          *ngIf="tabActiva === 'agencias' || tabActiva === 'sucursales'"
          (click)="abrirModalCrearSucursal()"
          class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
          <i-lucide name="plus" class="w-4 h-4"></i-lucide>
          <span>Registrar Agencia</span>
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        @for (tab of tabs; track tab.id) {
          <button
            (click)="tabActiva = tab.id"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer"
            [ngClass]="tabActiva === tab.id
              ? 'bg-easydry-blue text-white border-easydry-blue shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-easydry-blue/40'">
            <i-lucide [name]="tab.icon" class="w-4 h-4" [ngClass]="tabActiva === tab.id ? 'text-white' : 'text-slate-500'"></i-lucide>
            <span>{{ tab.label }}</span>
          </button>
        }
      </div>

      <!-- ====================================================================== -->
      <!-- TAB 0: MAPA OPERATIVO LIVE DE LA RED                                   -->
      <!-- ====================================================================== -->
      @if (tabActiva === 'mapa') {
        <div class="space-y-6 animate-fade-in">
          
          <!-- Barra de Filtro de Sucursal para el Mapa -->
          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3 flex-wrap flex-1">
              <div class="flex items-center gap-2">
                <i-lucide name="filter" class="w-4 h-4 text-easydry-blue"></i-lucide>
                <span class="text-xs font-bold text-slate-700 uppercase">Filtrar Agencia:</span>
              </div>
              <select [(ngModel)]="filtroSucursalMapaId" class="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 min-w-56 focus:ring-2 focus:ring-easydry-blue">
                <option [ngValue]="0">Toda la Red Nacional (Todas las agencias)</option>
                @for (suc of sucursales; track suc.id) {
                  <option [ngValue]="suc.id">{{ suc.nombre }} ({{ suc.ciudad }})</option>
                }
              </select>
            </div>

            <!-- Leyenda de Estados de Bahía -->
            <div class="flex items-center gap-3 flex-wrap text-[11px] font-bold text-slate-600">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Disponible</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Lavado</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Secado</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Aspirado</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Mantenimiento</span>
            </div>
          </div>

          <!-- Árbol Operativo Jerárquico: Sucursal -> Bahía -> Operador & Maquinaria -->
          <div class="space-y-6">
            @for (suc of sucursalesMapa; track suc.id) {
              <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
                <!-- Cabecera de la Sucursal -->
                <div class="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center font-bold">
                      <i-lucide name="building-2" class="w-5 h-5"></i-lucide>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="font-extrabold text-base text-slate-900 font-outfit">{{ suc.nombre }}</h3>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
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
                    <a [routerLink]="['/agencias', suc.id]" class="px-3 py-1.5 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-xl text-xs transition-colors flex items-center gap-1">
                      <span>Gestionar</span>
                      <i-lucide name="chevron-right" class="w-3.5 h-3.5"></i-lucide>
                    </a>
                  </div>
                </div>

                <!-- Grilla de Bahías de la Sucursal -->
                <div class="p-5">
                  @if (getBahiasDeSucursal(suc.id).length === 0) {
                    <p class="text-xs text-slate-400 italic py-4 text-center">No hay bahías configuradas para esta agencia.</p>
                  } @else {
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      @for (bahia of getBahiasDeSucursal(suc.id); track bahia.id) {
                        <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between">
                          <div>
                            <!-- Header de Bahía -->
                            <div class="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Bahía #{{ bahia.id }}</span>
                                <h4 class="font-extrabold text-sm text-slate-900">{{ bahia.nombre }}</h4>
                              </div>
                              <span class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border"
                                [ngClass]="getEstadoBahiaBadge(bahia.estado)">
                                {{ bahia.estado }}
                              </span>
                            </div>

                            <!-- Responsable y Operador asignado (Punto 16) -->
                            <div class="mt-3 p-2.5 bg-white rounded-xl border border-slate-100 text-xs space-y-2">
                              <div>
                                <div class="text-[9px] font-extrabold text-purple-700 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                  <i-lucide name="shield" class="w-3 h-3 text-purple-600"></i-lucide>
                                  <span>Responsable de Agencia</span>
                                </div>
                                <p class="font-bold text-slate-800 text-[11px] truncate">{{ suc.responsable || 'Sin asignar' }}</p>
                              </div>
                              <div>
                                <div class="text-[9px] font-extrabold text-easydry-blue uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                  <i-lucide name="user" class="w-3 h-3 text-easydry-blue"></i-lucide>
                                  <span>Operador Asignado</span>
                                </div>
                                @if (bahia.operadorAsignado) {
                                  <p class="font-bold text-slate-800 text-[11px] truncate">{{ bahia.operadorAsignado }}</p>
                                } @else {
                                  <p class="text-slate-400 italic text-[11px]">Sin operador asignado</p>
                                }
                              </div>
                            </div>

                            <!-- Maquinaria e Insumos vinculados -->
                            <div class="mt-2 text-[11px] text-slate-500 space-y-1">
                              @if (bahia.maquinariaAsignada && bahia.maquinariaAsignada.length > 0) {
                                <div class="flex items-center gap-1 text-slate-600">
                                  <i-lucide name="wrench" class="w-3 h-3 text-slate-400"></i-lucide>
                                  <span>{{ bahia.maquinariaAsignada.length }} máquina(s) en línea</span>
                                </div>
                              }
                              @if (bahia.vehiculoActual) {
                                <div class="flex items-center gap-1 text-easydry-blue font-bold">
                                  <i-lucide name="car" class="w-3 h-3"></i-lucide>
                                  <span>En atención: {{ bahia.vehiculoActual }}</span>
                                </div>
                              }
                            </div>
                          </div>

                          <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span class="text-slate-400">Tipo: {{ bahia.tipo || 'General' }}</span>
                            <a [routerLink]="['/agencias', suc.id]" class="text-easydry-blue font-bold hover:underline flex items-center gap-0.5">
                              <span>Ver detalle</span>
                              <i-lucide name="arrow-right" class="w-3 h-3"></i-lucide>
                            </a>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            } @empty {
              <div class="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                <i-lucide name="building-2" class="w-12 h-12 mx-auto mb-2 opacity-30"></i-lucide>
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
          [showBusqueda]="false"
          (filterChange)="aplicarNuevosFiltros($event)">
        </app-filter-bar>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (suc of sucursalesFiltradas; track suc.id) {
            <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry hover:shadow-easydry-hover transition-all duration-300 p-6 flex flex-col justify-between group">
              <div>
                <div class="flex items-start justify-between mb-4">
                  <div class="w-12 h-12 rounded-2xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center font-bold">
                    <i-lucide name="building-2" class="w-6 h-6"></i-lucide>
                  </div>
                  <div class="flex items-center gap-2">
                    <button (click)="abrirModalTransferir(suc)" class="p-1.5 bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white rounded-lg transition-colors" title="Transferir región o marca">
                      <i-lucide name="refresh-cw" class="w-4 h-4"></i-lucide>
                    </button>
                    <button (click)="abrirModalEditar(suc)" class="p-1.5 bg-slate-100 hover:bg-easydry-blue text-slate-400 hover:text-white rounded-lg transition-colors" title="Editar Agencia">
                      <i-lucide name="pencil" class="w-4 h-4"></i-lucide>
                    </button>
                    <span
                      class="px-2.5 py-1 rounded-full text-xs font-bold"
                      [ngClass]="suc.estado === 'Activo' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-rose-100 text-rose-800'">
                      {{ suc.estado }}
                    </span>
                  </div>
                </div>

                <h3 class="font-bold text-slate-900 text-lg font-outfit group-hover:text-easydry-blue transition-colors">{{ suc.nombre }}</h3>
                <p class="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-1">
                  <i-lucide name="building-2" class="w-3.5 h-3.5 text-slate-400"></i-lucide>
                  <span>{{ suc.ciudad }}</span>
                </p>
                <div class="flex flex-wrap gap-1.5 mt-3">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-easydry-blue/10 text-easydry-blue text-[10px] font-extrabold uppercase">
                    <i-lucide name="map-pin" class="w-3 h-3"></i-lucide>
                    {{ suc.regionNombre || 'Sin región' }}
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase text-white"
                    [style.background-color]="colorMarca(suc.marcaId)">
                    <i-lucide name="tag" class="w-3 h-3"></i-lucide>
                    {{ suc.marcaNombre || 'Sin marca' }}
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                    <i-lucide name="sparkles" class="w-3 h-3"></i-lucide>
                    {{ contarServiciosSucursal(suc) }} servicios
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-2 line-clamp-2">{{ suc.direccion }}</p>
              </div>

              <div class="mt-6 pt-4 border-t border-slate-100 space-y-3">
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div class="p-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Bahías</span>
                    <span class="font-extrabold text-easydry-blue text-sm">{{ suc.cantidadBahias }} Bahías</span>
                  </div>
                  <div class="p-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Operadores</span>
                    <span class="font-extrabold text-easydry-green-dark text-sm">{{ suc.operadoresActivos ?? 0 }} Activos</span>
                  </div>
                </div>

                <div class="space-y-1 pt-1 border-t border-slate-100 mt-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500">Responsable:</span>
                    <span class="font-bold text-slate-800">{{ suc.responsable || 'Sin Asignar' }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500">Líder:</span>
                    <span class="font-bold" [ngClass]="getLiderOperador(suc) !== 'Sin Asignar' ? 'text-easydry-blue' : 'text-slate-400'">
                      {{ getLiderOperador(suc) }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <button
                    (click)="verEnMapa(suc)"
                    class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                    <i-lucide name="map" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                    <span>Ver en Mapa</span>
                  </button>
                  <a
                    [routerLink]="['/agencias', suc.id]"
                    class="flex-1 py-2 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                    <i-lucide name="eye" class="w-3.5 h-3.5"></i-lucide>
                    <span>Detalle Bahías</span>
                  </a>
                </div>
              </div>
            </div>
          }
        </div>

        @if (movimientos.length > 0) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5">
            <h3 class="font-bold text-slate-900 text-sm font-outfit mb-3 flex items-center gap-2">
              <i-lucide name="history" class="w-4 h-4 text-easydry-blue"></i-lucide>
              Historial de transferencias
            </h3>
            <div class="space-y-2">
              @for (mov of movimientos.slice(0, 6); track mov.id) {
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span class="font-extrabold text-slate-800">{{ mov.sucursalNombre }}</span>
                    <span class="text-slate-400 mx-1">·</span>
                    <span class="font-bold" [class.text-easydry-blue]="mov.tipo === 'REGION'" [class.text-amber-700]="mov.tipo === 'MARCA'">
                      {{ mov.tipo === 'REGION' ? 'Región' : 'Marca' }}
                    </span>
                    <span class="text-slate-500"> {{ mov.valorAnterior }} → {{ mov.valorNuevo }}</span>
                  </div>
                  <span class="text-slate-400">{{ mov.fecha }} · {{ mov.realizadoPor }}</span>
                </div>
              }
            </div>
          </div>
        }
      }

      @if (tabActiva === 'regiones') {
        <div class="flex items-center justify-between">
          <p class="text-xs text-slate-500">Crea regiones y luego pasa sucursales a cada una.</p>
          <button (click)="abrirModalRegion()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide> Nueva Región
          </button>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="space-y-3">
            @for (r of regiones; track r.id) {
              <button
                (click)="regionSeleccionada = r"
                class="w-full text-left bg-white rounded-2xl border p-4 shadow-xs hover:shadow-easydry transition-all"
                [ngClass]="regionSeleccionada?.id === r.id ? 'border-easydry-blue ring-2 ring-easydry-blue/20' : 'border-slate-100'">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-extrabold text-slate-900 text-sm">{{ r.nombre }}</p>
                    <p class="text-[10px] font-mono text-slate-400">{{ r.codigo }}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded-lg text-[10px] font-extrabold"
                    [ngClass]="r.estado === 'Activa' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-slate-100 text-slate-500'">
                    {{ r.estado }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ r.descripcion }}</p>
                <p class="text-[11px] font-semibold text-slate-600 mt-1 flex items-center gap-1">
                  <i-lucide name="user-check" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                  <span>Supervisor: <b class="text-slate-800">{{ r.responsable || 'Sin supervisor' }}</b></span>
                </p>
                <p class="text-[11px] font-bold text-easydry-blue mt-1">{{ sucursalesDeRegion(r.id).length }} agencias</p>
              </button>
            }
          </div>
          <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 min-h-[280px]">
            @if (!regionSeleccionada) {
              <p class="text-sm text-slate-500">Selecciona una región para ver y asignar agencias.</p>
            } @else {
              <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 class="font-extrabold text-slate-900 font-outfit text-lg">{{ regionSeleccionada.nombre }}</h3>
                  <p class="text-xs text-slate-500">{{ regionSeleccionada.descripcion }}</p>
                  <p class="text-xs text-slate-400 mt-1">Responsable: {{ regionSeleccionada.responsable || '—' }}</p>
                </div>
                <div class="flex gap-2">
                  <button (click)="abrirModalRegion(regionSeleccionada)" class="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">Editar</button>
                  <button (click)="abrirAsignarARegion(regionSeleccionada)" class="px-3 py-2 bg-easydry-green text-slate-950 font-bold rounded-xl text-xs">
                    Pasar agencia a esta región
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                @for (suc of sucursalesDeRegion(regionSeleccionada.id); track suc.id) {
                  <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div>
                      <p class="text-sm font-bold text-slate-900">{{ suc.nombre }}</p>
                      <p class="text-[11px] text-slate-500">{{ suc.ciudad }} · {{ suc.marcaNombre }}</p>
                    </div>
                    <div class="flex gap-2">
                      <button (click)="abrirModalTransferir(suc)" class="px-2.5 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 rounded-lg">Transferir</button>
                      <a [routerLink]="['/agencias', suc.id]" class="px-2.5 py-1.5 text-[11px] font-bold text-easydry-blue bg-easydry-blue/10 rounded-lg">Ver</a>
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
          <button (click)="abrirModalMarca()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide> Nuevo Cliente
          </button>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="space-y-3">
            @for (m of marcas; track m.id) {
              <button
                (click)="marcaSeleccionada = m"
                class="w-full text-left bg-white rounded-2xl border p-4 shadow-xs hover:shadow-easydry transition-all"
                [ngClass]="marcaSeleccionada?.id === m.id ? 'border-easydry-blue ring-2 ring-easydry-blue/20' : 'border-slate-100'">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" [style.background-color]="m.color"></span>
                    <div>
                      <p class="font-extrabold text-slate-900 text-sm">{{ m.nombre }}</p>
                      <p class="text-[10px] font-mono text-slate-400">{{ m.codigo }}</p>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-lg text-[10px] font-extrabold"
                    [ngClass]="m.estado === 'Activa' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-slate-100 text-slate-500'">
                    {{ m.estado }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ m.descripcion }}</p>
                <p class="text-[11px] font-bold text-easydry-blue mt-2">{{ sucursalesDeMarca(m.id).length }} agencias</p>
              </button>
            }
          </div>
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
                  <button (click)="abrirModalMarca(marcaSeleccionada)" class="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">Editar</button>
                  <button (click)="abrirAsignarAMarca(marcaSeleccionada)" class="px-3 py-2 bg-easydry-green text-slate-950 font-bold rounded-xl text-xs">
                    Asignar agencia a este cliente
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                @for (suc of sucursalesDeMarca(marcaSeleccionada.id); track suc.id) {
                  <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div>
                      <p class="text-sm font-bold text-slate-900">{{ suc.nombre }}</p>
                      <p class="text-[11px] text-slate-500">{{ suc.ciudad }} · Región {{ suc.regionNombre }}</p>
                    </div>
                    <div class="flex gap-2">
                      <button (click)="abrirModalTransferir(suc)" class="px-2.5 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 rounded-lg">Cambiar</button>
                      <a [routerLink]="['/agencias', suc.id]" class="px-2.5 py-1.5 text-[11px] font-bold text-easydry-blue bg-easydry-blue/10 rounded-lg">Ver</a>
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
                  <i-lucide name="user-check" class="w-5 h-5"></i-lucide>
                </span>
                <h2 class="text-lg font-extrabold text-slate-900 font-outfit">Gestión Exclusiva de Gerentes de Agencia</h2>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                Asignación de agencias restringida exclusivamente a usuarios con rol <strong class="text-purple-700">GERENTE</strong>.
              </p>
            </div>

            <button
              type="button"
              (click)="abrirModalAsignarGerente()"
              class="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer">
              <i-lucide name="plus" class="w-4 h-4"></i-lucide>
              <span>Asignar Agencia a Gerente</span>
            </button>
          </div>

          <!-- Matriz de Gerentes y Agencias Asignadas -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (ger of gerentesUsuarios; track ger.id) {
              <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 flex flex-col justify-between hover:border-purple-200 transition-all">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex items-center gap-3">
                      @if (ger.avatar) {
                        <img
                          [src]="ger.avatar"
                          alt="Avatar"
                          class="w-11 h-11 rounded-full object-cover ring-2 ring-purple-300">
                      } @else {
                        <div class="w-11 h-11 rounded-full bg-slate-100 ring-2 ring-purple-300 flex items-center justify-center text-xs font-extrabold text-slate-500">
                          {{ (ger.nombre || '?').charAt(0) }}{{ (ger.apellido || '').charAt(0) }}
                        </div>
                      }
                      <div>
                        <h4 class="font-bold text-sm text-slate-900 leading-tight">{{ ger.nombre }} {{ ger.apellido }}</h4>
                        <p class="text-[11px] text-slate-500 truncate">{{ ger.email }}</p>
                      </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-800 border border-purple-200">
                      Rol: {{ ger.rolNombre || ger.rol || 'GERENTE' }}
                    </span>
                  </div>

                  <!-- Información de Sucursal Asignada -->
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 mt-2">
                    <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <i-lucide name="building-2" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                      <span>Agencia Asignada</span>
                    </div>
                    @if (ger.agencia) {
                      <div class="flex items-center justify-between">
                        <span class="font-extrabold text-slate-900 text-xs">{{ ger.agencia }}</span>
                        <span class="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800">
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
                  <div class="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <i-lucide name="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                    <span>Aprobador Oficial</span>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      (click)="abrirModalReasignar(ger)"
                      class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1">
                      <i-lucide name="refresh-cw" class="w-3.5 h-3.5"></i-lucide>
                      <span>Reasignar</span>
                    </button>
                    @if (ger.agencia) {
                      <button
                        type="button"
                        (click)="desasignarGerente(ger)"
                        class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Remover asignación">
                        <i-lucide name="user-x" class="w-3.5 h-3.5"></i-lucide>
                        <span>Remover</span>
                      </button>
                    }
                  </div>
                </div>

              </div>
            } @empty {
              <div class="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 space-y-3">
                <p>No hay usuarios con rol Aprobador dados de alta en el directorio.</p>
                <a routerLink="/usuarios" class="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold rounded-xl text-xs transition-colors">
                  <i-lucide name="user-plus" class="w-4 h-4"></i-lucide>
                  <span>Crear Aprobador en Directorio</span>
                </a>
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal Asignar / Reasignar Agencia a Gerente (Validación Exclusiva Rol GERENTE) -->
      <app-modal
        [isOpen]="modalAsignarGerenteOpen"
        title="Asignación Exclusiva de Agencia a Gerente"
        icon="shield"
        (close)="modalAsignarGerenteOpen = false">
        <div class="space-y-4">
          <div class="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
            <i-lucide name="info" class="w-4 h-4 shrink-0"></i-lucide>
            <span>Por política de seguridad RBAC, solo usuarios con rol <strong>GERENTE</strong> pueden ser seleccionados.</span>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Usuario Gerente (Exclusivo Rol GERENTE)
            </label>
            <select
              [(ngModel)]="formAsignarGerente.gerenteId"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
              <option [ngValue]="0" disabled>Selecciona un usuario con rol GERENTE...</option>
              @for (g of gerentesUsuarios; track g.id) {
                <option [ngValue]="g.id">{{ g.nombre }} {{ g.apellido }} ({{ g.email }}) · Rol: GERENTE</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Agencia a Asignar
            </label>
            <select
              [(ngModel)]="formAsignarGerente.sucursalId"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
              <option [ngValue]="0" disabled>Selecciona la agencia...</option>
              @for (s of sucursales; track s.id) {
                <option [ngValue]="s.id">{{ s.nombre }} ({{ s.ciudad }})</option>
              }
            </select>
          </div>
        </div>

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalAsignarGerenteOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            (click)="guardarAsignacionGerente()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white transition-colors">
            Confirmar Asignación
          </button>
        </div>
      </app-modal>

      <!-- Modal Crear / Editar Agencia -->
      <app-modal
        [isOpen]="modalCrearOpen"
        [title]="editandoSucursal ? 'Editar Agencia EasyDry' : 'Registrar Nueva Agencia EasyDry'"
        [icon]="editandoSucursal ? 'pencil' : 'building-2'"
        (close)="cerrarModal()">

        <form (ngSubmit)="guardarSucursal()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de Agencia</label>
            <input type="text" [(ngModel)]="nuevaSucursal.nombre" name="nombre" placeholder="ej. EasyDry Guayaquil Samborondón" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">Región</label>
                <button type="button" (click)="mostrarAltaRegion = !mostrarAltaRegion" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">Crear región</button>
              </div>
              <select [(ngModel)]="nuevaSucursal.regionId" name="regionId" class="w-full p-2.5 border rounded-xl text-sm font-semibold" required>
                <option [ngValue]="0">Seleccione región</option>
                @for (r of regionesActivas; track r.id) {
                  <option [ngValue]="r.id">{{ r.nombre }}</option>
                }
              </select>
              @if (mostrarAltaRegion) {
                <div class="mt-2 flex gap-2">
                  <input type="text" [(ngModel)]="altaRapidaRegion" name="altaRapidaRegion" placeholder="Nombre de la región" class="flex-1 p-2 border rounded-xl text-xs">
                  <button type="button" (click)="crearRegionRapida()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">Crear</button>
                </div>
              }
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">Cliente de agencia</label>
                <button type="button" (click)="mostrarAltaMarca = !mostrarAltaMarca" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">Crear cliente</button>
              </div>
              <select [(ngModel)]="nuevaSucursal.marcaId" (ngModelChange)="nuevaSucursal.clienteId = $event" name="marcaId" class="w-full p-2.5 border rounded-xl text-sm font-semibold" required>
                <option [ngValue]="0">Seleccione cliente</option>
                @for (m of marcasActivas; track m.id) {
                  <option [ngValue]="m.id">{{ m.nombre }}</option>
                }
              </select>
              @if (mostrarAltaMarca) {
                <div class="mt-2 flex gap-2">
                  <input type="text" [(ngModel)]="altaRapidaMarca" name="altaRapidaMarca" placeholder="Nombre del cliente" class="flex-1 p-2 border rounded-xl text-xs">
                  <button type="button" (click)="crearMarcaRapida()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">Crear</button>
                </div>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Ciudad</label>
              <input type="text" [(ngModel)]="nuevaSucursal.ciudad" name="ciudad" placeholder="Quito / Guayaquil / Cuenca" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad de Bahías</label>
              <input type="number" [(ngModel)]="nuevaSucursal.cantidadBahias" name="cantidadBahias" min="1" max="12" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Máximo Lavadores por Bahía</label>
              <input type="number" [(ngModel)]="nuevaSucursal.maxLavadoresPorBahia" name="maxLavadoresPorBahia" min="1" max="10" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección Exacta</label>
              <input type="text" [(ngModel)]="nuevaSucursal.direccion" name="direccion" placeholder="Av. Principal N45-120" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
              <i-lucide name="crown" class="w-3.5 h-3.5 text-teal-600"></i-lucide>
              Líder Operador
            </label>
            <select [(ngModel)]="nuevaSucursal.liderOperadorId" (ngModelChange)="alCambiarLiderOperador($event)" name="liderOperadorId"
                    class="w-full p-2.5 border rounded-xl text-sm font-semibold">
              <option [ngValue]="undefined">— Sin Líder Operador asignado —</option>
              @for (lid of lideresOperadoresUsuarios; track lid.id) {
                <option [ngValue]="lid.id">{{ lid.nombre }} {{ lid.apellido }} ({{ lid.email }})</option>
              }
            </select>
            @if (!lideresOperadoresUsuarios.length) {
              <p class="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                <i-lucide name="alert-triangle" class="w-3 h-3"></i-lucide>
                No hay usuarios con rol Líder registrados. Créalos en Gestión de Usuarios.
              </p>
            }
          </div>


          <!-- ─── Aprobación Gerencial ─── -->
          <div class="rounded-2xl border-2 transition-all"
               [ngClass]="nuevaSucursal.requiereAprobacion ? 'border-easydry-green bg-easydry-green/5' : 'border-slate-200 bg-slate-50'">
            <div class="flex items-center justify-between p-4 cursor-pointer select-none"
                 (click)="alCambiarToggleAprobacion(!nuevaSucursal.requiereAprobacion)">
               <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center"
                     [ngClass]="nuevaSucursal.requiereAprobacion ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-slate-200 text-slate-500'">
                  <i-lucide name="shield-check" class="w-4 h-4"></i-lucide>
                </div>
                <div>
                  <p class="text-xs font-extrabold text-slate-800 uppercase">Requiere Aprobador</p>
                  <p class="text-[11px] text-slate-500">Los servicios finalizados deben ser aprobados antes del cierre del día</p>
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
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  <i-lucide name="user-check" class="w-3.5 h-3.5 inline mr-1 text-easydry-green-dark"></i-lucide>
                  Aprobador
                </label>
                <select [(ngModel)]="nuevaSucursal.gerenteId" (ngModelChange)="alCambiarGerente($event)" name="gerenteId"
                        class="w-full p-2.5 border border-easydry-green/30 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-easydry-green/30">
                  <option [ngValue]="undefined">— Seleccione un Aprobador —</option>
                  @for (ger of gerentesUsuarios; track ger.id) {
                    <option [ngValue]="ger.id">{{ ger.nombre }} {{ ger.apellido }} · {{ ger.sucursalAsignada || 'Red Nacional' }}</option>
                  }
                </select>
                @if (!gerentesUsuarios.length) {
                  <p class="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                    <i-lucide name="alert-triangle" class="w-3 h-3"></i-lucide>
                    No hay usuarios con rol Aprobador registrados aún.
                  </p>
                }
              </div>
            }
          </div>

          <!-- ─── Servicios Especiales ─── -->
          <div class="rounded-2xl border-2 transition-all"
               [ngClass]="nuevaSucursal.tieneServiciosEspeciales ? 'border-amber-400 bg-amber-50/60' : 'border-slate-200 bg-slate-50'">
            <div class="flex items-center justify-between p-4 cursor-pointer select-none"
                 (click)="alCambiarToggleServiciosEspeciales(!nuevaSucursal.tieneServiciosEspeciales)">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center"
                     [ngClass]="nuevaSucursal.tieneServiciosEspeciales ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-500'">
                  <i-lucide name="star" class="w-4 h-4"></i-lucide>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-xs font-extrabold text-slate-800 uppercase">Cuenta con Servicios Especiales</p>
                    @if (nuevaSucursal.tieneServiciosEspeciales) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300">
                        {{ serviciosEspeciales.length }} servicios especiales habilitados
                      </span>
                    }
                  </div>
                  <p class="text-[11px] text-slate-500">Pulido, tratamiento cerámico, limpieza de motor y otros servicios premium</p>
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
                    <i-lucide name="sparkles" class="w-4 h-4"></i-lucide>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-amber-900">Catálogo Completo de Servicios Especiales Asignado</p>
                    <p class="text-[11px] text-amber-800 leading-snug">
                      Esta sucursal queda habilitada con los <strong>{{ serviciosEspeciales.length }} servicios especiales corporativos</strong> (pulido fino/medio/corte, vitrificados cerámicos, sellados acrílicos y detallado). No requiere selección individual.
                    </p>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- ─── Servicios Generales del Catálogo ─── -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700 uppercase">Servicios Generales de esta Sucursal</label>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-easydry-blue/10 text-easydry-blue border border-easydry-blue/20">
                  <i-lucide name="check" class="w-3 h-3"></i-lucide>
                  {{ cantidadGeneralesSeleccionados }} de {{ serviciosGenerales.length }} seleccionados
                </span>
                <button type="button" (click)="seleccionarTodosGenerales()" class="text-[10px] text-easydry-blue font-bold hover:underline cursor-pointer">Todos</button>
                <span class="text-slate-300 text-xs">|</span>
                <button type="button" (click)="deseleccionarTodosGenerales()" class="text-[10px] text-slate-500 font-bold hover:underline cursor-pointer">Ninguno</button>
              </div>
            </div>
            <p class="text-[11px] text-slate-500 mb-2">Del catálogo corporativo. Márquelos ahora; podrá editarlos después.</p>
            <div class="border border-slate-200 rounded-xl p-3 bg-slate-50/80 max-h-48 overflow-y-auto">
              @for (s of serviciosGenerales; track s.id) {
                <label class="flex items-start gap-2 py-1.5 cursor-pointer hover:bg-slate-100/80 px-2 rounded-lg transition-colors">
                  <input type="checkbox" class="mt-0.5 rounded border-slate-300 text-easydry-blue focus:ring-easydry-blue" [checked]="servicioSeleccionado(s.id)" (change)="toggleServicio(s.id, s.nombre)">
                  <span class="text-xs font-semibold text-slate-800">{{ s.nombre }}</span>
                </label>
              }
            </div>
            
            <!-- Resumen de servicios visibles dentro del formulario -->
            <div class="mt-2.5 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs">
              <div class="flex items-center gap-1.5 text-slate-700 font-bold">
                <i-lucide name="sparkles" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
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
              <i-lucide name="sparkles" class="w-4 h-4 text-easydry-blue"></i-lucide>
              <span class="text-xs font-extrabold">{{ totalServiciosSeleccionados }} servicios seleccionados</span>
            </div>
            <span class="text-[11px] text-slate-500 font-semibold hidden md:inline">
              ({{ cantidadGeneralesSeleccionados }} generales + {{ cantidadEspecialesSeleccionados }} especiales)
            </span>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" (click)="cerrarModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">Cancelar</button>
            <button type="button" (click)="guardarSucursal()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm">
              {{ editandoSucursal ? 'Guardar Cambios' : 'Guardar Sucursal' }}
            </button>
          </div>
        </div>
      </app-modal>

      <!-- Modal Región -->
      <app-modal [isOpen]="modalRegionOpen" [title]="editandoRegion ? 'Editar Región' : 'Nueva Región'" icon="map-pin" (close)="modalRegionOpen = false">
        <form class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
            <input type="text" [(ngModel)]="formRegion.nombre" name="regionNombre" class="w-full p-2.5 border rounded-xl text-sm" placeholder="ej. Amazonía">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
            <input type="text" [(ngModel)]="formRegion.descripcion" name="regionDesc" class="w-full p-2.5 border rounded-xl text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
              <span>
                <i-lucide name="user-check" class="w-3.5 h-3.5 inline mr-1 text-easydry-blue"></i-lucide>
                Responsable (Supervisor Regional)
              </span>
              @if (formRegion.responsable) {
                <span class="text-[10px] font-semibold text-emerald-600 normal-case bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Asignado: {{ formRegion.responsable }}
                </span>
              }
            </label>
            <select
              [(ngModel)]="formRegion.supervisorId"
              (ngModelChange)="alCambiarSupervisorRegion($event)"
              name="regionRespSelect"
              class="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-easydry-blue/30 focus:border-easydry-blue text-slate-800">
              <option value="">— Seleccione un Supervisor Regional —</option>
              @for (sup of supervisoresUsuarios; track sup.id) {
                <option [value]="sup.id">
                  {{ sup.nombre }} {{ sup.apellido }} · {{ sup.email }}
                </option>
              }
            </select>
            @if (!supervisoresUsuarios.length) {
              <p class="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                <i-lucide name="alert-triangle" class="w-3 h-3"></i-lucide>
                No hay usuarios con rol Supervisor registrados aún en el sistema.
              </p>
            } @else {
              <p class="text-[11px] text-slate-400 mt-1">
                Seleccione el supervisor que estará a cargo de esta región operativa.
              </p>
            }
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
            <select [(ngModel)]="formRegion.estado" name="regionEstado" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
              <option value="Activa">Activa</option>
              <option value="Inactiva">Inactiva</option>
            </select>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalRegionOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarRegion()" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs">Guardar Región</button>
        </div>
      </app-modal>

      <!-- Modal Cliente -->
      <app-modal [isOpen]="modalMarcaOpen" [title]="editandoMarca ? 'Editar Cliente de Agencia' : 'Nuevo Cliente de Agencia'" icon="briefcase" (close)="modalMarcaOpen = false">
        <form class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre comercial del cliente</label>
            <input type="text" [(ngModel)]="formMarca.nombre" name="marcaNombre" class="w-full p-2.5 border rounded-xl text-sm" placeholder="ej. Casabaca, Toyota, EasyDry">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
            <textarea [(ngModel)]="formMarca.descripcion" name="marcaDescripcion" rows="2" class="w-full p-2.5 border rounded-xl text-sm" placeholder="Detalles o notas del cliente corporativo..."></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Color distintivo</label>
              <input type="color" [(ngModel)]="formMarca.color" name="marcaColor" class="w-full h-10 border rounded-xl p-1 cursor-pointer">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
              <select [(ngModel)]="formMarca.estado" name="marcaEstado" class="w-full p-2.5 border rounded-xl text-sm">
                <option value="Activa">Activa</option>
                <option value="Inactiva">Inactiva</option>
              </select>
            </div>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalMarcaOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarMarca()" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs">Guardar Cliente</button>
        </div>
      </app-modal>

      <!-- Modal Transferir -->
      <app-modal [isOpen]="modalTransferirOpen" title="Transferir sucursal" icon="refresh-cw" (close)="modalTransferirOpen = false">
        <form class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal</label>
            <select [(ngModel)]="formTransfer.sucursalId" name="transfSucursal" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
              @for (s of sucursales; track s.id) {
                <option [ngValue]="s.id">{{ s.nombre }} ({{ s.regionNombre }} · {{ s.marcaNombre }})</option>
              }
            </select>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nueva región</label>
              <select [(ngModel)]="formTransfer.regionId" name="transfRegion" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                @for (r of regionesActivas; track r.id) {
                  <option [ngValue]="r.id">{{ r.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nuevo cliente</label>
              <select [(ngModel)]="formTransfer.marcaId" name="transfMarca" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                @for (m of marcasActivas; track m.id) {
                  <option [ngValue]="m.id">{{ m.nombre }}</option>
                }
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del cambio</label>
            <textarea [(ngModel)]="formTransfer.motivo" name="transfMotivo" rows="2" class="w-full p-2.5 border rounded-xl text-sm" placeholder="ej. Reorganización territorial / cambio de banner comercial"></textarea>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalTransferirOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarTransferencia()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs">Confirmar transferencia</button>
        </div>
      </app-modal>

    </div>
  `
})
export class SucursalesComponent implements OnInit {
  sucursales: Sucursal[] = [];
  regiones: RegionOperativa[] = [];
  marcas: MarcaSucursal[] = [];
  catalogoServicios: CatalogoServicio[] = [];
  movimientos: MovimientoRedSucursal[] = [];

  tabActiva: 'mapa' | 'agencias' | 'sucursales' | 'regiones' | 'marcas' | 'clientes' | 'gerentes' = 'agencias';
  tabs = [
    { id: 'agencias' as const, label: 'Gestión de Agencias', icon: 'building-2' },
    { id: 'mapa' as const, label: 'Mapa Operativo en Vivo', icon: 'map' },
    { id: 'gerentes' as const, label: 'Gestión de Gerentes', icon: 'user-cog' },
    { id: 'regiones' as const, label: 'Regiones', icon: 'map-pin' },
    { id: 'clientes' as const, label: 'Clientes', icon: 'briefcase' }
  ];

  filtroRegionId: number | string = 0;
  filtroMarcaId: number | string = 0;
  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Mes' };
  filtroSucursalMapaId: number | string = 0;
  regionSeleccionada: RegionOperativa | null = null;
  marcaSeleccionada: MarcaSucursal | null = null;
  bahiasTodas: Bahia[] = [];
  todosLosUsuarios: Usuario[] = [];

  gerentesUsuarios: Usuario[] = [];
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
  private usuarioService = inject(UsuarioService);
  private toastService = inject(ToastService);
  public auth = inject(AuthService);
  private route = inject(ActivatedRoute);

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
      return activo && (r.includes('LIDER') || r.includes('LÍDER')) && !r.includes('APROBADOR') && !r.includes('GERENTE');
    });
  }

  get serviciosGenerales(): CatalogoServicio[] {
    return this.catalogoServicios.filter(s => s.categoria?.trim().toUpperCase() === 'GENERAL' && s.estado === 'Activo');
  }

  get serviciosEspeciales(): CatalogoServicio[] {
    return this.catalogoServicios.filter(s => 
      (s.categoria?.trim().toUpperCase() === 'ESPECIAL' || s.categoria?.trim().toUpperCase() === 'EXTRA') && s.estado === 'Activo'
    );
  }

  get sucursalesFiltradas(): Sucursal[] {
    const isGer = this.auth.isGerente();
    const userScope = this.auth.getSucursalScope();

    return this.sucursales.filter(s => {
      if (isGer && userScope) {
        const matches = s.nombre.toLowerCase().includes(userScope.toLowerCase()) ||
                        userScope.toLowerCase().includes(s.nombre.toLowerCase());
        if (!matches) return false;
      }
      const okRegion = this.filtrosGlobales.region === 'Todas' || s.regionNombre === this.filtrosGlobales.region;
      const fCliente = this.filtrosGlobales.cliente || this.filtrosGlobales.marca;
      const okMarca = !fCliente || fCliente === 'Todas' || fCliente === 'Todos' || s.clienteNombre === fCliente || s.marcaNombre === fCliente;
      const okEstado = this.filtrosGlobales.estado === 'Todos' || s.estado === this.filtrosGlobales.estado;
      return okRegion && okMarca && okEstado;
    });
  }

  aplicarNuevosFiltros(filtros: FilterState): void {
    this.filtrosGlobales = filtros;
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['mapa', 'agencias', 'sucursales', 'regiones', 'marcas', 'clientes', 'gerentes'].includes(params['tab'])) {
        this.tabActiva = params['tab'] === 'sucursales' ? 'agencias' : (params['tab'] === 'marcas' ? 'clientes' : params['tab'] as any);
      }
      if (params['sucursalId']) {
        this.filtroSucursalMapaId = Number(params['sucursalId']);
      }
    });
    this.cargarTodo();
  }

  abrirModalAsignarGerente(): void {
    this.formAsignarGerente = {
      gerenteId: this.gerentesUsuarios[0]?.id || 0,
      sucursalId: this.sucursales[0]?.id || 0
    };
    this.modalAsignarGerenteOpen = true;
  }

  abrirModalReasignar(ger: Usuario): void {
    const suc = this.sucursales.find(s => s.nombre === ger.agencia);
    this.formAsignarGerente = {
      gerenteId: ger.id,
      sucursalId: suc?.id || this.sucursales[0]?.id || 0
    };
    this.modalAsignarGerenteOpen = true;
  }

  guardarAsignacionGerente(): void {
    const ger = this.gerentesUsuarios.find(g => String(g.id) === String(this.formAsignarGerente.gerenteId));
    const suc = this.sucursales.find(s => s.id === this.formAsignarGerente.sucursalId);
    if (!ger || !suc) {
      this.toastService.warning('Campos requeridos', 'Selecciona un usuario gerente y una agencia.');
      return;
    }

    const rolLower = (ger.rol || ger.rolNombre || '').toLowerCase();
    if (!rolLower.includes('gerente') && !rolLower.includes('aprobador')) {
      this.toastService.error('Violación RBAC', 'Solo usuarios con rol GERENTE o Aprobador de Sucursal pueden ser designados como responsables.');
      return;
    }

    ger.agencia = suc.nombre;
    suc.responsable = `${ger.nombre} ${ger.apellido}`;

    this.usuarioService.actualizarUsuario(ger).subscribe();
    this.sucursalService.actualizarSucursal(suc).subscribe();

    this.modalAsignarGerenteOpen = false;
    this.toastService.success('Agencia Asignada', `Se asignó ${suc.nombre} a ${ger.nombre} ${ger.apellido}.`);
  }

  desasignarGerente(ger: Usuario): void {
    const anteriorAgencia = ger.agencia;
    ger.agencia = '';
    this.usuarioService.actualizarUsuario(ger).subscribe();

    if (anteriorAgencia) {
      const suc = this.sucursales.find(s => s.nombre === anteriorAgencia);
      if (suc) {
        suc.responsable = 'Sin Asignar';
        this.sucursalService.actualizarSucursal(suc).subscribe();
      }
    }
    this.toastService.info('Asignación Removida', `El gerente ${ger.nombre} ${ger.apellido} ha sido desvinculado.`);
  }

  cargarTodo(): void {
    this.regionService.getRegiones().subscribe(list => {
      this.regiones = list;
      this.regionSeleccionada = this.regionSeleccionada
        ? list.find(r => r.id === this.regionSeleccionada!.id) || list[0]
        : list[0] || null;
    });
    this.marcaService.getMarcas().subscribe(list => {
      this.marcas = list;
      this.marcaSeleccionada = this.marcaSeleccionada
        ? list.find(m => m.id === this.marcaSeleccionada!.id) || list[0]
        : list[0] || null;
    });
    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
    this.catalogoService.getServiciosActivos().subscribe(list => {
      this.catalogoServicios = list;
    });
    this.sucursalService.getMovimientos().subscribe(list => {
      this.movimientos = list;
    });
    this.bahiaService.getBahias().subscribe(list => {
      this.bahiasTodas = list;
    });
    this.usuarioService.usuarios$.subscribe(list => {
      if (list && list.length) {
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
      }
    });
    this.usuarioService.getUsuarios().subscribe(list => {
      if (list && list.length) {
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
      }
    });
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

  get sucursalesMapa(): Sucursal[] {
    if (!this.filtroSucursalMapaId || this.filtroSucursalMapaId === 0 || this.filtroSucursalMapaId === '0') return this.sucursales;
    return this.sucursales.filter(s => String(s.id) === String(this.filtroSucursalMapaId));
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
    this.editandoSucursal = true;

    // Asegurarse de tener el catálogo actualizado desde la BD
    this.catalogoService.getServiciosActivos().subscribe(list => {
      this.catalogoServicios = list;
    });

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
      ciudad: suc.ciudad || suc.regionNombre || 'Quito',
      direccion: suc.direccion || '',
      cantidadBahias: suc.cantidadBahias || 4,
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
    }).subscribe(creada => {
      this.regiones = [...this.regiones, creada];
      this.nuevaSucursal.regionId = creada.id;
      this.altaRapidaRegion = '';
      this.mostrarAltaRegion = false;
      this.toastService.success('Región creada', `${creada.nombre} lista para asignar.`);
    });
  }

  crearMarcaRapida(): void {
    if (!this.altaRapidaMarca.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre de la marca.');
      return;
    }
    this.marcaService.crear({
      nombre: this.altaRapidaMarca.trim(),
      descripcion: '',
      color: '#004282',
      estado: 'Activa'
    }).subscribe(creada => {
      this.marcas = [...this.marcas, creada];
      this.nuevaSucursal.marcaId = creada.id;
      this.altaRapidaMarca = '';
      this.mostrarAltaMarca = false;
      this.toastService.success('Marca creada', `${creada.nombre} lista para asignar.`);
    });
  }

  guardarSucursal(): void {
    if (!this.nuevaSucursal.nombre?.trim()) {
      this.toastService.warning('Datos Incompletos', 'Ingrese el nombre de la agencia.');
      return;
    }

    // Auto-asignar primera región si no está definida
    if (!this.nuevaSucursal.regionId || this.nuevaSucursal.regionId === 0 || this.nuevaSucursal.regionId === '0') {
      const defaultReg = this.regionesActivas[0]?.id || this.regiones[0]?.id;
      if (defaultReg) {
        this.nuevaSucursal.regionId = defaultReg;
      }
    }

    // Auto-asignar primera marca si no está definida
    if (!this.nuevaSucursal.marcaId || this.nuevaSucursal.marcaId === 0 || this.nuevaSucursal.marcaId === '0') {
      const defaultMarca = this.marcasActivas[0]?.id || this.marcas[0]?.id;
      if (defaultMarca) {
        this.nuevaSucursal.marcaId = defaultMarca;
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

    // Caso 1 y 2: Manejo de Gerente Aprobador (con o sin gerente)
    if (this.nuevaSucursal.requiereAprobacion && this.nuevaSucursal.gerenteId) {
      const ger = this.gerentesUsuarios.find(g => String(g.id) === String(this.nuevaSucursal.gerenteId));
      this.nuevaSucursal.gerenteNombre = ger ? `${ger.nombre} ${ger.apellido ?? ''}`.trim() : (this.nuevaSucursal.gerenteNombre || 'Gerente Asignado');
      this.nuevaSucursal.responsable = this.nuevaSucursal.gerenteNombre;
    } else if (this.nuevaSucursal.requiereAprobacion) {
      this.nuevaSucursal.gerenteId = undefined;
      this.nuevaSucursal.gerenteNombre = undefined;
      this.nuevaSucursal.responsable = 'Por Asignar';
    } else {
      this.nuevaSucursal.gerenteId = undefined;
      this.nuevaSucursal.gerenteNombre = undefined;
      this.nuevaSucursal.responsable = 'Sin Asignar';
    }

    // Resolver líder operador seleccionado
    if (this.nuevaSucursal.liderOperadorId) {
      const lid = this.lideresOperadoresUsuarios.find(u => String(u.id) === String(this.nuevaSucursal.liderOperadorId));
      this.nuevaSucursal.liderOperador = lid ? `${lid.nombre} ${lid.apellido ?? ''}`.trim() : (this.nuevaSucursal.liderOperador || 'Sin Asignar');
      this.nuevaSucursal.liderOperadorNombre = this.nuevaSucursal.liderOperador;
    } else {
      this.nuevaSucursal.liderOperador = undefined;
      this.nuevaSucursal.liderOperadorNombre = undefined;
    }

    if (!this.nuevaSucursal.ciudad?.trim()) {
      this.nuevaSucursal.ciudad = 'Quito';
    }
    if (!this.nuevaSucursal.direccion?.trim()) {
      this.nuevaSucursal.direccion = 'Sede Principal';
    }
    if (!this.nuevaSucursal.cantidadBahias || this.nuevaSucursal.cantidadBahias <= 0) {
      this.nuevaSucursal.cantidadBahias = 4;
    }
    if (!this.nuevaSucursal.maxLavadoresPorBahia || this.nuevaSucursal.maxLavadoresPorBahia <= 0) {
      this.nuevaSucursal.maxLavadoresPorBahia = 1;
    }

    if (this.editandoSucursal) {
      const user = this.auth.getCurrentUser();
      this.sucursalService.actualizarSucursal(this.nuevaSucursal, {
        motivo: 'Actualización desde ficha de agencia',
        realizadoPor: `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'Sistema'
      }).subscribe({
        next: (actualizada) => {
          this.bahiaService.sincronizarBahias(actualizada.id, actualizada.nombre, actualizada.cantidadBahias);
          this.toastService.success('Agencia Actualizada', `Se guardaron los cambios para ${actualizada.nombre}.`);
          this.cerrarModal();
          this.cargarTodo();
        },
        error: () => {
          this.toastService.error('Error', 'No se pudo actualizar la agencia.');
        }
      });
    } else {
      this.sucursalService.crearSucursal(this.nuevaSucursal).subscribe({
        next: (creada) => {
          this.bahiaService.sincronizarBahias(creada.id, creada.nombre, creada.cantidadBahias);
          this.toastService.success('Agencia Registrada', `Se configuró ${creada.nombre} correctamente.`);
          this.cerrarModal();
          this.cargarTodo();
        },
        error: () => {
          this.toastService.error('Error', 'No se pudo registrar la agencia.');
        }
      });
    }
  }

  abrirModalRegion(region?: RegionOperativa): void {
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

  guardarRegion(): void {
    if (!this.formRegion.nombre?.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre de la región.');
      return;
    }
    if (this.editandoRegion && this.formRegion.id) {
      this.regionService.actualizar(this.formRegion as RegionOperativa).subscribe(actualizada => {
        this.sucursalService.sincronizarNombresCatalogo();
        this.toastService.success('Región actualizada', actualizada.nombre);
        this.modalRegionOpen = false;
        this.regionSeleccionada = actualizada;
        this.cargarTodo();
      });
    } else {
      this.regionService.crear(this.formRegion).subscribe(creada => {
        this.toastService.success('Región creada', `${creada.nombre} lista para recibir sucursales.`);
        this.modalRegionOpen = false;
        this.regionSeleccionada = creada;
        this.tabActiva = 'regiones';
        this.cargarTodo();
      });
    }
  }

  abrirModalMarca(marca?: MarcaSucursal): void {
    this.editandoMarca = !!marca;
    this.formMarca = marca
      ? { ...marca }
      : { nombre: '', descripcion: '', color: '#004282', estado: 'Activa' };
    this.modalMarcaOpen = true;
  }

  guardarMarca(): void {
    if (!this.formMarca.nombre?.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre de la marca.');
      return;
    }
    if (this.editandoMarca && this.formMarca.id) {
      this.marcaService.actualizar(this.formMarca as MarcaSucursal).subscribe(actualizada => {
        this.sucursalService.sincronizarNombresCatalogo();
        this.toastService.success('Marca actualizada', actualizada.nombre);
        this.modalMarcaOpen = false;
        this.marcaSeleccionada = actualizada;
        this.cargarTodo();
      });
    } else {
      this.marcaService.crear(this.formMarca).subscribe(creada => {
        this.toastService.success('Marca creada', `${creada.nombre} lista para asignar.`);
        this.modalMarcaOpen = false;
        this.marcaSeleccionada = creada;
        this.tabActiva = 'marcas';
        this.cargarTodo();
      });
    }
  }

  abrirModalTransferir(suc: Sucursal): void {
    this.formTransfer = {
      sucursalId: suc.id,
      regionId: suc.regionId || 0,
      marcaId: suc.marcaId || 0,
      motivo: ''
    };
    this.modalTransferirOpen = true;
  }

  abrirAsignarARegion(region: RegionOperativa): void {
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
    if (this.formTransfer.regionId === suc.regionId && this.formTransfer.marcaId === suc.marcaId) {
      this.toastService.warning('Sin cambios', 'Seleccione una región o marca distinta.');
      return;
    }

    const user = this.auth.getCurrentUser();
    this.sucursalService.transferirSucursal({
      sucursalId: suc.id,
      regionId: this.formTransfer.regionId,
      marcaId: this.formTransfer.marcaId,
      motivo: this.formTransfer.motivo.trim(),
      realizadoPor: `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'Sistema'
    }).subscribe(actualizada => {
      if (!actualizada) return;
      this.toastService.success(
        'Transferencia aplicada',
        `${actualizada.nombre} quedó en ${actualizada.regionNombre} · ${actualizada.marcaNombre}.`
      );
      this.modalTransferirOpen = false;
      this.cargarTodo();
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
      ciudad: 'Quito',
      direccion: '',
      cantidadBahias: 4,
      maxLavadoresPorBahia: 1,
      estado: 'Activo',
      responsable: 'Operación Directa',
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


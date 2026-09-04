import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { InventarioMockService } from '../../core/services/inventario-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { EnvioSuministro } from '../../core/models';
import {
  EnvaseUnidad,
  ProductoInsumo,
  InventarioItem,
  MovimientoStock,
  AlertaReabastecimiento,
  BodegaInventario,
  BODEGA_CENTRAL_ID,
  stockEnBodega
} from '../../core/models/inventario.model';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in pb-12">

      <!-- ============================================================== -->
      <!-- HEADER PRINCIPAL & ACCIONES EN FILA                            -->
      <!-- ============================================================== -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry">
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          <!-- Título y Badge -->
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-easydry-blue/10 text-easydry-blue text-[11px] font-bold mb-1">
              <i-lucide name="boxes" class="w-3.5 h-3.5"></i-lucide>
              <span>Control de Recursos, Insumos & Bodega Multi-Sucursal</span>
            </div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Inventario Central & Suministros</h1>
            <p class="text-slate-500 text-xs mt-0.5">
              Bodega Central siempre activa. El Gestor puede crear bodegas satélite y despachar a sucursales.
            </p>
          </div>

        </div>

        <!-- 4 Tarjetas de Métricas Compactas -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase text-slate-500 block">Total Insumos</span>
              <p class="text-xl font-extrabold text-slate-900 font-outfit">{{ inventarioItems.length }} <span class="text-xs font-normal text-slate-500">activos</span></p>
            </div>
            <div class="p-2 rounded-lg bg-blue-100/60 text-easydry-blue">
              <i-lucide name="package" class="w-4 h-4"></i-lucide>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-blue-50/50 border border-blue-100/80 flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase text-blue-800 block">Bodegas</span>
              <p class="text-xl font-extrabold text-blue-950 font-outfit">{{ bodegas.length }} <span class="text-xs font-normal text-blue-700">· {{ totalUnidadesBodega }} uds.</span></p>
            </div>
            <div class="p-2 rounded-lg bg-blue-500 text-white">
              <i-lucide name="warehouse" class="w-4 h-4"></i-lucide>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-amber-50/60 border border-amber-100/80 flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase text-amber-800 block">Alertas de Stock</span>
              <p class="text-xl font-extrabold text-amber-950 font-outfit">{{ alertas.length }} <span class="text-xs font-normal text-amber-700">({{ alertasCriticasCount }} críticas)</span></p>
            </div>
            <div class="p-2 rounded-lg bg-amber-500 text-white">
              <i-lucide name="alert-triangle" class="w-4 h-4"></i-lucide>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-purple-50/50 border border-purple-100/80 flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase text-purple-800 block">Total en Sucursales</span>
              <p class="text-xl font-extrabold text-purple-950 font-outfit">{{ totalUnidadesSucursales }} <span class="text-xs font-normal text-purple-700">unidades</span></p>
            </div>
            <div class="p-2 rounded-lg bg-purple-600 text-white">
              <i-lucide name="store" class="w-4 h-4"></i-lucide>
            </div>
          </div>
        </div>

        <!-- Pestañas de Navegación -->
        <div class="flex items-center gap-4 sm:gap-6 mt-4 pt-2 border-b border-slate-200 overflow-x-auto">
          <button
            (click)="activeTab = 'matriz'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'matriz' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="layout-grid" class="w-4 h-4"></i-lucide>
            Matriz de Stock Red & Sucursales
          </button>

          <button
            (click)="activeTab = 'catalogo'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'catalogo' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="package-search" class="w-4 h-4"></i-lucide>
            Catálogo de Insumos
          </button>

          <button
            (click)="activeTab = 'bodegas'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors hidden md:flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'bodegas' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="warehouse" class="w-4 h-4"></i-lucide>
            Bodegas
          </button>

          <button
            (click)="activeTab = 'despachos'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'despachos' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="truck" class="w-4 h-4"></i-lucide>
            Movimientos & Despachos
          </button>

          <button
            (click)="activeTab = 'tipos_envases'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'tipos_envases' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="package" class="w-4 h-4"></i-lucide>
            Envases & Unidades de Medida
          </button>

          <button
            (click)="activeTab = 'envios'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'envios' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="send" class="w-4 h-4 text-emerald-600"></i-lucide>
            <span>Envíos & Confirmación (Punto 9)</span>
            @if (envios.length > 0) {
              <span class="inline-flex items-center justify-center -translate-y-1 ml-0.5">
                <svg class="w-3.5 h-3.5 shrink-0 drop-shadow-xs" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#10B981"/>
                  <path d="M8 12.5l2.8 2.8 5.4-5.4" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            }
          </button>

          <button
            (click)="activeTab = 'alertas'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'alertas' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="alert-circle" class="w-4 h-4"></i-lucide>
            <span>Alertas de Reabastecimiento</span>
            @if (alertas.length > 0) {
              <span class="inline-flex items-center justify-center -translate-y-1 ml-0.5">
                <svg class="w-3.5 h-3.5 shrink-0 drop-shadow-xs" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#FF2B2B"/>
                  <path d="M10.2 6.4C10.2 5.4 11 4.6 12 4.6C13 4.6 13.8 5.4 13.8 6.4L13.4 14.2C13.4 15 12.8 15.6 12 15.6C11.2 15.6 10.6 15 10.6 14.2L10.2 6.4Z" fill="white"/>
                  <circle cx="12" cy="18.6" r="1.6" fill="white"/>
                </svg>
              </span>
            }
          </button>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- PESTAÑA 1: MATRIZ DE STOCK GLOBAL & SUCURSALES (TABLA VISIBLE) -->
      <!-- ============================================================== -->
      @if (activeTab === 'matriz') {
        <div class="space-y-6 animate-fade-in">
          
          <!-- Filtros, Selector Sucursal/Bahía y Búsqueda Directa (Punto 7 y Punto 18) -->
          <app-filter-bar
            [showSucursal]="true"
            [showMarca]="true"
            [showEstado]="true"
            [showRegion]="false"
            [showOperador]="false"
            [showBahia]="false"
            [showFechas]="false"
            [showBusqueda]="true"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>



          <!-- Ficha de Selección Sucursal -> Bahía (Punto 7: Responsable, Ubicación, Estado) -->
          @if (filtroSucursal !== 'Todas' || filtroBahia !== 'Todas') {
            <div class="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-2xs">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-easydry-blue text-white flex items-center justify-center font-bold">
                  <i-lucide name="map-pin" class="w-5 h-5"></i-lucide>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-extrabold text-slate-900 text-sm font-outfit">{{ filtroSucursal }} — {{ filtroBahia }}</h4>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Estado: Activa & Operativa
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 mt-0.5">
                    <strong>Ubicación:</strong> Sector Operativo / Red Nacional · <strong>Responsable de Sucursal:</strong> <span class="text-purple-700 font-bold">{{ getResponsableSucursal(filtroSucursal) }}</span>
                  </p>
                </div>
              </div>
            </div>
          }

          <!-- Tabla de Matriz de Stock -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
              <h3 class="font-bold text-slate-900 text-lg font-outfit">Matriz de Stock Red & Sucursales</h3>
              @if (puedeDespachar) {
                <button
                  (click)="abrirModalEntradaBodega()"
                  class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                  <i-lucide name="arrow-down-circle" class="w-4 h-4 text-emerald-600"></i-lucide>
                  <span>Entrada Bodega (Compra)</span>
                </button>
              }
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th class="py-3.5 px-4">Insumo / Producto</th>
                    <th class="py-3.5 px-3">Presentación / Envase</th>
                    @for (bod of bodegas; track bod.id) {
                      <th class="py-3.5 px-3 text-center font-bold"
                        [ngClass]="bod.esCentral ? 'bg-blue-50/40 text-easydry-blue' : 'bg-teal-50/40 text-teal-800'">
                        {{ bod.nombre }}
                      </th>
                    }
                    <th class="py-3.5 px-3 text-center">Quito Norte</th>
                    <th class="py-3.5 px-3 text-center">Quito Sur</th>
                    <th class="py-3.5 px-3 text-center">Cumbayá</th>
                    <th class="py-3.5 px-3 text-center">Guayaquil</th>
                    <th class="py-3.5 px-3 text-center font-bold text-slate-800">Total Red</th>
                    <th class="py-3.5 px-3 text-center">Estado</th>
                    <th class="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  @for (item of itemsFiltrados; track item.producto.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors group">
                      
                      <!-- Insumo -->
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center shadow-2xs">
                            <img
                              [src]="item.producto.imagen"
                              [alt]="item.producto.nombre"
                              class="w-full h-full object-cover">
                          </div>
                          <div>
                            <span class="font-mono font-extrabold text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {{ item.producto.codigoSKU }}
                            </span>
                            <p class="font-bold text-slate-900 text-xs mt-0.5">{{ item.producto.nombre }}</p>
                          </div>
                        </div>
                      </td>

                      <!-- Envase -->
                      <td class="py-3 px-3">
                        <span class="font-bold text-slate-800 text-xs">
                          {{ item.producto.unidadMedida }}
                        </span>
                      </td>

                      @for (bod of bodegas; track bod.id) {
                        <td class="py-3 px-3 text-center font-mono font-extrabold"
                          [ngClass]="{
                            'text-rose-600 bg-rose-50/40': stockBodega(item, bod.id) <= item.producto.stockAlertaBodega,
                            'bg-blue-50/20 text-blue-900': bod.esCentral && stockBodega(item, bod.id) > item.producto.stockAlertaBodega,
                            'bg-teal-50/20 text-teal-900': !bod.esCentral && stockBodega(item, bod.id) > item.producto.stockAlertaBodega
                          }">
                          {{ stockBodega(item, bod.id) }}
                        </td>
                      }

                      <!-- Sucursales -->
                      <td class="py-3 px-3 text-center font-mono font-semibold"
                        [ngClass]="{ 'text-amber-600 font-extrabold bg-amber-50/30': (item.stockPorSucursal['EasyDry Quito Norte'] || 0) <= 2 }">
                        {{ item.stockPorSucursal['EasyDry Quito Norte'] || 0 }}
                      </td>

                      <td class="py-3 px-3 text-center font-mono font-semibold"
                        [ngClass]="{ 'text-amber-600 font-extrabold bg-amber-50/30': (item.stockPorSucursal['EasyDry Quito Sur'] || 0) <= 2 }">
                        {{ item.stockPorSucursal['EasyDry Quito Sur'] || 0 }}
                      </td>

                      <td class="py-3 px-3 text-center font-mono font-semibold"
                        [ngClass]="{ 'text-amber-600 font-extrabold bg-amber-50/30': (item.stockPorSucursal['EasyDry Cumbayá'] || 0) <= 2 }">
                        {{ item.stockPorSucursal['EasyDry Cumbayá'] || 0 }}
                      </td>

                      <td class="py-3 px-3 text-center font-mono font-semibold"
                        [ngClass]="{ 'text-amber-600 font-extrabold bg-amber-50/30': (item.stockPorSucursal['EasyDry Guayaquil'] || 0) <= 2 }">
                        {{ item.stockPorSucursal['EasyDry Guayaquil'] || 0 }}
                      </td>

                      <!-- Total Red -->
                      <td class="py-3 px-3 text-center font-mono font-extrabold text-slate-900 text-sm">
                        {{ item.stockTotalRed }}
                      </td>

                      <!-- Estado -->
                      <td class="py-3 px-3 text-center">
                        <span 
                          class="px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1"
                          [ngClass]="{
                            'bg-emerald-100 text-emerald-800 border border-emerald-300': item.estadoGeneral === 'Optimo',
                            'bg-amber-100 text-amber-800 border border-amber-300': item.estadoGeneral === 'Bajo',
                            'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse': item.estadoGeneral === 'Critico'
                          }">
                          @if (item.estadoGeneral === 'Critico') {
                            <i-lucide name="alert-triangle" class="w-3 h-3"></i-lucide>
                          }
                          {{ item.estadoGeneral }}
                        </span>
                      </td>

                      <!-- Acciones -->
                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          @if (puedeDespachar) {
                            <button
                              (click)="abrirDespachoDirecto(item)"
                              title="Despachar a Sucursal"
                              class="p-1.5 rounded-lg bg-easydry-blue/10 hover:bg-easydry-blue text-easydry-blue hover:text-white transition-colors">
                              <i-lucide name="truck" class="w-4 h-4"></i-lucide>
                            </button>
                          }
                          @if (puedeGestionarCatalogo) {
                            <button
                              (click)="abrirAjusteStock(item)"
                              title="Ajustar Stock Sucursal"
                              class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                              <i-lucide name="sliders" class="w-4 h-4"></i-lucide>
                            </button>
                          }
                        </div>
                      </td>

                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- PESTAÑA 2: CATÁLOGO DE INSUMOS (TABLA COMPLETA DE PRODUCTOS)   -->
      <!-- ============================================================== -->
      @if (activeTab === 'catalogo') {
        <div class="space-y-6 animate-fade-in">
          
          <app-filter-bar
            [showEstado]="true"
            [showBusqueda]="true"
            [placeholderBusqueda]="'Buscar en el catálogo por SKU o nombre...'"
            [showSucursal]="false"
            [showFechas]="false"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>

          <!-- TABLA PRINCIPAL DEL CATÁLOGO DE INSUMOS -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
              <h3 class="font-bold text-slate-900 text-lg font-outfit">Catálogo Oficial de Insumos</h3>
              @if (puedeGestionarCatalogo) {
                <button
                  (click)="abrirModalCrearProducto()"
                  class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                  <i-lucide name="plus-circle" class="w-4 h-4"></i-lucide>
                  <span>Nuevo Insumo</span>
                </button>
              }
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th class="py-3.5 px-4">Código SKU</th>
                    <th class="py-3.5 px-4">Insumo / Producto</th>
                    <th class="py-3.5 px-3">Presentación / Envase</th>
                    <th class="py-3.5 px-3 text-center bg-blue-50/40 text-easydry-blue font-bold">Bodega Central</th>
                    @if (bodegasSatelite.length > 0) {
                      <th class="py-3.5 px-3 text-center bg-teal-50/40 text-teal-800 font-bold">Otras bodegas</th>
                    }
                    <th class="py-3.5 px-3 text-center">Stock Mínimo (Alerta)</th>
                    <th class="py-3.5 px-3 text-center font-bold text-slate-800">Total en Red</th>
                    <th class="py-3.5 px-3 text-center">Estado</th>
                    <th class="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  @for (item of itemsFiltrados; track item.producto.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors group">
                      
                      <!-- SKU -->
                      <td class="py-3 px-4 font-mono font-extrabold text-slate-700">
                        <span class="bg-slate-100 px-2 py-1 rounded-md border text-[11px]">
                          {{ item.producto.codigoSKU }}
                        </span>
                      </td>

                      <!-- Insumo -->
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center shadow-2xs">
                            <img
                              [src]="item.producto.imagen"
                              [alt]="item.producto.nombre"
                              class="w-full h-full object-cover">
                          </div>
                          <div>
                            <p class="font-bold text-slate-900 text-xs">{{ item.producto.nombre }}</p>
                            <p class="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">{{ item.producto.descripcion }}</p>
                          </div>
                        </div>
                      </td>

                      <!-- Envase / Presentación -->
                      <td class="py-3 px-3">
                        <span class="font-bold text-slate-800">{{ item.producto.unidadMedida }}</span>
                      </td>

                      <!-- Stock Bodega Central -->
                      <td class="py-3 px-3 text-center font-mono font-extrabold bg-blue-50/20 text-blue-900">
                        {{ stockBodega(item, bodegaCentralId) }} {{ item.producto.unidadMedida }}
                      </td>
                      @if (bodegasSatelite.length > 0) {
                        <td class="py-3 px-3 text-center font-mono font-extrabold bg-teal-50/20 text-teal-900">
                          {{ stockOtrasBodegas(item) }}
                        </td>
                      }

                      <!-- Stock Mínimo -->
                      <td class="py-3 px-3 text-center font-mono font-bold text-rose-700">
                        {{ item.producto.stockAlertaBodega }} {{ item.producto.unidadMedida }}
                      </td>

                      <!-- Total en Red -->
                      <td class="py-3 px-3 text-center font-mono font-extrabold text-slate-900 text-sm">
                        {{ item.stockTotalRed }} {{ item.producto.unidadMedida }}
                      </td>

                      <!-- Estado -->
                      <td class="py-3 px-3 text-center">
                        <span 
                          class="px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1"
                          [ngClass]="{
                            'bg-emerald-100 text-emerald-800 border border-emerald-300': item.estadoGeneral === 'Optimo',
                            'bg-amber-100 text-amber-800 border border-amber-300': item.estadoGeneral === 'Bajo',
                            'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse': item.estadoGeneral === 'Critico'
                          }">
                          {{ item.estadoGeneral }}
                        </span>
                      </td>

                      <!-- Acciones -->
                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button
                            (click)="editarProducto(item.producto)"
                            title="Editar insumo"
                            class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                            <i-lucide name="edit-3" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                          </button>
                          <button
                            (click)="abrirDespachoDirecto(item)"
                            title="Despachar"
                            class="p-1.5 bg-easydry-blue/10 hover:bg-easydry-blue text-easydry-blue hover:text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                            <i-lucide name="truck" class="w-3.5 h-3.5"></i-lucide>
                          </button>
                        </div>
                      </td>

                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- PESTAÑA: BODEGAS (Central fija + satélites)                    -->
      <!-- ============================================================== -->
      @if (activeTab === 'bodegas') {
        <div class="space-y-6 animate-fade-in">
          <app-filter-bar
            [showRegion]="true"
            [showEstado]="true"
            [showSucursal]="false"
            [showFechas]="false"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 class="font-extrabold text-slate-900 text-base font-outfit">Red de Bodegas</h3>
              <p class="text-slate-500 text-xs mt-0.5">
                <strong>Bodega Central</strong> es permanente. El Gestor de Inventario puede abrir bodegas satélite (Costa, Sierra, etc.).
              </p>
            </div>
            @if (puedeGestionarCatalogo) {
              <button
                (click)="abrirModalCrearBodega()"
                class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                <i-lucide name="plus" class="w-4 h-4"></i-lucide>
                <span>Nueva Bodega</span>
              </button>
            }
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (bod of bodegas; track bod.id) {
              <div class="bg-white rounded-2xl border p-5 shadow-easydry"
                [class.border-easydry-blue]="bod.esCentral"
                [class.border-slate-100]="!bod.esCentral">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <div class="p-2.5 rounded-xl"
                      [ngClass]="bod.esCentral ? 'bg-easydry-blue text-white' : 'bg-teal-50 text-teal-800'">
                      <i-lucide name="warehouse" class="w-5 h-5"></i-lucide>
                    </div>
                    <div>
                      <p class="font-extrabold text-slate-900 text-sm">{{ bod.nombre }}</p>
                      <p class="text-[11px] text-slate-500 font-mono">{{ bod.codigo }}</p>
                    </div>
                  </div>
                  @if (bod.esCentral) {
                    <span class="px-2 py-0.5 rounded-full bg-blue-100 text-easydry-blue text-[10px] font-extrabold uppercase">Sistema</span>
                  }
                </div>
                <p class="text-xs text-slate-500 mt-3">
                  {{ bod.ciudad || 'Sin ciudad' }}{{ bod.region ? ' · ' + bod.region : '' }}
                </p>
                <p class="text-lg font-extrabold text-slate-900 mt-2 font-outfit">
                  {{ unidadesEnBodega(bod.id) }}
                  <span class="text-xs font-normal text-slate-500">unidades en stock</span>
                </p>
                @if (!bod.esCentral && puedeGestionarCatalogo) {
                  <button
                    (click)="eliminarBodega(bod)"
                    class="mt-3 text-[11px] font-bold text-rose-600 hover:underline">
                    Eliminar bodega
                  </button>
                }
                @if (bod.esCentral) {
                  <p class="mt-3 text-[11px] text-slate-400 font-medium">No se puede eliminar ni desactivar.</p>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- PESTAÑA 3: HISTORIAL DE DESPACHOS                              -->
      <!-- ============================================================== -->
      @if (activeTab === 'despachos') {
        <div class="space-y-6 animate-fade-in">
          
          <app-filter-bar
            [showFechas]="true"
            [showSucursal]="true"
            [showEstado]="true"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>
          
          <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-easydry">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-900 text-base font-outfit flex items-center gap-2">
                <i-lucide name="history" class="w-5 h-5 text-easydry-blue"></i-lucide>
                Historial de Movimientos y Despachos Recientes
              </h3>
              @if (puedeDespachar) {
                <button (click)="abrirModalDespacho()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                  <i-lucide name="truck" class="w-4 h-4"></i-lucide>
                  <span>Nuevo Despacho</span>
                </button>
              }
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b">
                    <th class="py-3 px-4">Código</th>
                    <th class="py-3 px-3">Fecha</th>
                    <th class="py-3 px-3">Tipo de Operación</th>
                    <th class="py-3 px-4">Insumo / Producto</th>
                    <th class="py-3 px-3">Origen / Destino</th>
                    <th class="py-3 px-3 text-center">Cantidad</th>
                    <th class="py-3 px-4">Responsable</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (mov of movimientos; track mov.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3 px-4 font-mono font-bold text-slate-600">{{ mov.codigoMovimiento }}</td>
                      <td class="py-3 px-3 text-slate-500">{{ mov.fecha }}</td>
                      <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                          [ngClass]="{
                            'bg-emerald-100 text-emerald-800': mov.tipo === 'Entrada Bodega',
                            'bg-blue-100 text-blue-800': mov.tipo === 'Despacho a Sucursal',
                            'bg-amber-100 text-amber-800': mov.tipo === 'Ajuste de Inventario'
                          }">
                          {{ mov.tipo }}
                        </span>
                      </td>
                      <td class="py-3 px-4 font-semibold text-slate-900">{{ mov.productoNombre }}</td>
                      <td class="py-3 px-3 text-slate-600 font-medium">{{ mov.origen }} &rarr; <strong class="text-easydry-blue">{{ mov.destino }}</strong></td>
                      <td class="py-3 px-3 text-center font-mono font-extrabold text-slate-800">{{ mov.cantidad }} {{ mov.unidad }}</td>
                      <td class="py-3 px-4 text-slate-500">{{ mov.responsable }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- PESTAÑA 3.5: GESTIÓN DE ENVÍOS Y CONFIRMACIÓN (PUNTO 9)        -->
      <!-- ============================================================== -->
      @if (activeTab === 'envios') {
        <div class="space-y-6 animate-fade-in">
          <app-filter-bar
            [showFechas]="true"
            [showSucursal]="true"
            [showEstado]="true"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>
          <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <i-lucide name="send" class="w-5 h-5"></i-lucide>
                </span>
                <h3 class="font-extrabold text-slate-900 text-base font-outfit">Flujo de Envíos y Confirmación de Recepción</h3>
              </div>
              <p class="text-slate-500 text-xs">
                Control logístico de envíos desde Bodega/Distribuidor hacia Agencias receptoras con validación de estado y tiempos.
              </p>
            </div>
            @if (puedeDespachar) {
              <button
                type="button"
                (click)="abrirModalCrearEnvio()"
                class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                <i-lucide name="plus" class="w-4 h-4"></i-lucide>
                <span>Crear Envío de Suministro</span>
              </button>
            }
          </div>

          <!-- Tabla de Envíos -->
          <div class="bg-white rounded-3xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b">
                    <th class="py-3.5 px-4">Código Envío</th>
                    <th class="py-3.5 px-3">Fecha & Salida</th>
                    <th class="py-3.5 px-4">Agencia Destino</th>
                    <th class="py-3.5 px-4">Insumos Enviados</th>
                    <th class="py-3.5 px-3">Resp. Envío</th>
                    <th class="py-3.5 px-3">Resp. Recepción</th>
                    <th class="py-3.5 px-3 text-center">Tiempos</th>
                    <th class="py-3.5 px-3 text-center">Estado</th>
                    <th class="py-3.5 px-4 text-right">Acciones de Agencia</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  @for (env of envios; track env.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3.5 px-4 font-mono font-extrabold text-easydry-blue">{{ env.codigoEnvio }}</td>
                      <td class="py-3.5 px-3">
                        <p class="font-bold text-slate-800">{{ env.fecha }}</p>
                        <span class="text-[10px] text-slate-400 font-mono">{{ env.horaInicio || '08:00' }}</span>
                      </td>
                      <td class="py-3.5 px-4 font-bold text-slate-900">
                        {{ env.sucursalNombre }}
                        <p class="text-[10px] text-slate-400 font-normal">{{ env.ciudad }}</p>
                      </td>
                      <td class="py-3.5 px-4">
                        <div class="space-y-0.5">
                          @for (p of env.productos; track p.nombreProducto) {
                            <div class="text-[11px] text-slate-700">
                              <strong>{{ p.cantidad }} {{ p.unidad }}</strong> - {{ p.nombreProducto }}
                            </div>
                          }
                        </div>
                      </td>
                      <td class="py-3.5 px-3 text-slate-600 text-[11px]">{{ env.responsableEnvio }}</td>
                      <td class="py-3.5 px-3 text-[11px]">
                        @if (env.responsableRecepcion) {
                          <span class="font-bold text-purple-800">{{ env.responsableRecepcion }}</span>
                        } @else {
                          <span class="text-slate-400 italic">Pendiente de arribo</span>
                        }
                      </td>
                      <td class="py-3.5 px-3 text-center">
                        @if (env.duracionMin) {
                          <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                            {{ env.duracionMin }} min
                          </span>
                        } @else {
                          <span class="text-[10px] text-slate-400 font-mono">En ruta</span>
                        }
                      </td>
                      <td class="py-3.5 px-3 text-center">
                        <span
                          class="px-2.5 py-1 rounded-full text-[10px] font-extrabold"
                          [ngClass]="{
                            'bg-amber-100 text-amber-800 border border-amber-200': env.estado === 'PENDIENTE',
                            'bg-blue-100 text-blue-800 border border-blue-200': env.estado === 'ENVIADO',
                            'bg-emerald-100 text-emerald-800 border border-emerald-200': env.estado === 'RECIBIDO',
                            'bg-rose-100 text-rose-800 border border-rose-200': env.estado === 'RECHAZADO'
                          }">
                          {{ env.estado }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        @if (env.estado === 'ENVIADO') {
                          <div class="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              (click)="confirmarRecepcionEnvio(env)"
                              class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1">
                              <i-lucide name="check" class="w-3.5 h-3.5"></i-lucide>
                              <span>Confirmar</span>
                            </button>
                            <button
                              type="button"
                              (click)="abrirModalRechazo(env)"
                              class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1">
                              <i-lucide name="x" class="w-3.5 h-3.5"></i-lucide>
                              <span>Rechazar</span>
                            </button>
                          </div>
                        } @else if (env.estado === 'RECIBIDO') {
                          <span class="text-[11px] font-bold text-emerald-700">✓ Recepción Verificada</span>
                        } @else if (env.estado === 'RECHAZADO') {
                          <span class="text-[11px] font-bold text-rose-700" [title]="env.motivoRechazo || 'Rechazado'">✕ Rechazado: {{ env.motivoRechazo || 'Discrepancia' }}</span>
                        } @else {
                          <span class="text-[11px] text-slate-400 italic">En alistamiento</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- PESTAÑA 4: ENVASES & UNIDADES DE MEDIDA                        -->
      <!-- ============================================================== -->
      @if (activeTab === 'tipos_envases') {
        <div class="space-y-6 animate-fade-in">
          
          <app-filter-bar
            [showBusqueda]="true"
            [placeholderBusqueda]="'Buscar envase...'"
            [showFechas]="false"
            [showSucursal]="false"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>
          
          <!-- Encabezado de Envases & Unidades -->
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="p-2 rounded-xl bg-easydry-blue/10 text-easydry-blue">
                  <i-lucide name="package" class="w-5 h-5"></i-lucide>
                </span>
                <h3 class="font-extrabold text-slate-900 text-base font-outfit">Envases & Unidades de Medida</h3>
              </div>
              <p class="text-slate-500 text-xs">
                Presentaciones oficiales para compras, almacenamiento en Bodega Central, recetas de servicios y despacho a sucursales.
              </p>
            </div>
            @if (puedeGestionarCatalogo) {
              <button
                (click)="abrirModalCrearEnvase()" 
                class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                <i-lucide name="plus" class="w-4 h-4"></i-lucide>
                <span>Crear Envase / Unidad</span>
              </button>
            }
          </div>

          <!-- TABLA PRINCIPAL DE ENVASES & UNIDADES -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th class="py-3.5 px-5">Presentación / Envase</th>
                    <th class="py-3.5 px-4 text-center">Abreviatura / Código</th>
                    <th class="py-3.5 px-4 text-center">Tipo de Insumo</th>
                    <th class="py-3.5 px-4">Capacidad / Equivalencia</th>
                    <th class="py-3.5 px-5">Uso Operativo en EasyDry®</th>
                    <th class="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  @for (e of envases; track e.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors group">
                      
                      <!-- Nombre -->
                      <td class="py-3.5 px-5">
                        <div class="flex items-center gap-2.5">
                          <div class="p-2 rounded-xl bg-slate-100 text-slate-700 font-extrabold group-hover:bg-easydry-blue group-hover:text-white transition-colors">
                            <i-lucide [name]="e.tipoAplicable === 'liquido' ? 'droplet' : 'package'" class="w-4 h-4"></i-lucide>
                          </div>
                          <div>
                            <span class="font-bold text-slate-900 text-xs">{{ e.nombre }}</span>
                            <span class="font-mono text-[10px] text-slate-400 block">{{ e.codigo }}</span>
                          </div>
                        </div>
                      </td>

                      <!-- Abreviatura -->
                      <td class="py-3.5 px-4 text-center">
                        <span class="font-mono font-extrabold text-[11px] text-easydry-blue bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          {{ e.abreviatura }}
                        </span>
                      </td>

                      <!-- Tipo Aplicable -->
                      <td class="py-3.5 px-4 text-center">
                        <span 
                          class="px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1.5"
                          [ngClass]="e.tipoAplicable === 'liquido' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-amber-100 text-amber-800 border border-amber-200'">
                          <i-lucide [name]="e.tipoAplicable === 'liquido' ? 'droplet' : 'package'" class="w-3 h-3"></i-lucide>
                          <span>{{ e.tipoAplicable === 'liquido' ? 'Líquidos / Granel' : 'Unitario / Conteo' }}</span>
                        </span>
                      </td>

                      <!-- Capacidad -->
                      <td class="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {{ e.capacidadTexto || '1 Unidad' }}
                      </td>

                      <!-- Descripción -->
                      <td class="py-3.5 px-5 text-slate-500">
                        {{ e.descripcion || 'Formato estándar registrado para inventario y bahías.' }}
                      </td>

                      <!-- Acciones -->
                      <td class="py-3.5 px-4 text-right">
                        <button 
                          (click)="eliminarEnvase(e.id)" 
                          title="Eliminar Envase"
                          class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
                        </button>
                      </td>

                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

        </div>
      }

      <!-- ============================================================== -->
      <!-- PESTAÑA 5: ALERTAS DE REABASTECIMIENTO                         -->
      <!-- ============================================================== -->
      @if (activeTab === 'alertas') {
        <div class="space-y-6 animate-fade-in">
          <app-filter-bar
            [showSucursal]="true"
            [showEstado]="true"
            [showFechas]="false"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>
          <div class="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-2xl bg-amber-500 text-white shadow-xs">
                <i-lucide name="alert-triangle" class="w-6 h-6"></i-lucide>
              </div>
              <div>
                <h3 class="font-bold text-amber-950 text-sm">Monitoreo de Stock Bajo y Crítico</h3>
                <p class="text-xs text-amber-800">Insumos cuyo nivel actual está por debajo del umbral mínimo de seguridad.</p>
              </div>
            </div>
            <span class="text-xs font-extrabold bg-amber-200 text-amber-900 px-3 py-1 rounded-full">
              {{ alertas.length }} Alertas Activas
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (al of alertas; track al.productoId + al.ubicacion) {
              <div class="bg-white rounded-3xl border p-5 space-y-3 shadow-easydry"
                [ngClass]="al.nivel === 'Critico' ? 'border-rose-200 bg-rose-50/20' : 'border-amber-200 bg-amber-50/20'">
                
                <div class="flex items-center justify-between">
                  <span class="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border">
                    {{ al.productoSKU }}
                  </span>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1"
                    [ngClass]="al.nivel === 'Critico' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'">
                    <i-lucide [name]="al.nivel === 'Critico' ? 'alert-octagon' : 'alert-triangle'" class="w-3 h-3"></i-lucide>
                    <span>{{ al.nivel === 'Critico' ? 'Stock Crítico' : 'Stock Bajo' }}</span>
                  </span>
                </div>

                <div>
                  <h4 class="font-bold text-slate-900 text-sm leading-snug">{{ al.productoNombre }}</h4>
                  <p class="text-xs text-slate-600 font-semibold mt-1">Ubicación: <strong class="text-easydry-blue">{{ al.ubicacion }}</strong></p>
                </div>

                <div class="p-3 bg-white rounded-2xl border space-y-1 text-xs">
                  <div class="flex justify-between">
                    <span class="text-slate-500">Stock Actual:</span>
                    <span class="font-extrabold text-rose-700 font-mono">{{ al.stockActual }} {{ al.unidad }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Stock Mínimo Requerido:</span>
                    <span class="font-bold text-slate-700 font-mono">{{ al.stockMinimo }} {{ al.unidad }}</span>
                  </div>
                  <div class="flex justify-between text-emerald-800 font-bold pt-1 border-t">
                    <span>Sugerencia Envío:</span>
                    <span class="font-mono">+{{ al.sugerenciaReabastecimiento }} {{ al.unidad }}</span>
                  </div>
                </div>

                <button
                  (click)="atenderAlerta(al)"
                  class="w-full py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
                  <i-lucide name="truck" class="w-3.5 h-3.5 text-easydry-lime"></i-lucide>
                  <span>Reabastecer / Despachar Ahora</span>
                </button>

              </div>
            }
          </div>
        </div>
      }

      <!-- ============================================================== -->
      <!-- MODAL 1: NUEVO / EDITAR PRODUCTO                               -->
      <!-- ============================================================== -->
      <app-modal
        [isOpen]="modalProductoOpen"
        [title]="editandoProductoId ? 'Editar Insumo' : 'Registrar Nuevo Producto / Insumo'"
        icon="package-plus"
        (close)="modalProductoOpen = false">
        
        <form id="formProducto" (ngSubmit)="guardarProducto()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Código SKU</label>
              <input type="text" [(ngModel)]="productoForm.codigoSKU" name="codigoSKU" placeholder="QUIM-010" class="w-full p-2.5 border rounded-xl text-xs font-mono font-bold" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Insumo / Producto</label>
              <input type="text" [(ngModel)]="productoForm.nombre" name="nombre" placeholder="ej. Cera Líquida Polimérica" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Envase & Unidad de Medida</label>
              <select [(ngModel)]="productoForm.envaseId" name="envaseId" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
                @for (e of envases; track e.id) {
                  <option [value]="e.id">{{ e.nombre }} ({{ e.abreviatura }})</option>
                }
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Alerta en Bodega (Unidades)</label>
              <input type="number" [(ngModel)]="productoForm.stockAlertaBodega" name="stockAlertaBodega" min="1" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Alerta en Sucursal (Unidades)</label>
              <input type="number" [(ngModel)]="productoForm.stockAlertaSucursal" name="stockAlertaSucursal" min="1" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
            </div>
          </div>

          @if (!editandoProductoId) {
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Stock Inicial en Bodega Central</label>
              <input type="number" [(ngModel)]="productoForm.stockInicialBodega" name="stockInicialBodega" min="0" class="w-full p-2.5 border rounded-xl text-xs font-bold">
            </div>
          }

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción de Uso</label>
            <textarea [(ngModel)]="productoForm.descripcion" name="descripcion" rows="2" placeholder="Indicaciones de dilución, uso en bahía, etc." class="w-full p-2.5 border rounded-xl text-xs font-medium"></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Imagen del Insumo</label>
            <div class="flex items-center gap-4">
              @if (productoForm.imagen) {
                <img [src]="productoForm.imagen" class="w-12 h-12 rounded-xl object-cover border border-slate-200">
              }
              <input type="file" accept="image/*" (change)="onImageSelected($event)" class="w-full p-2 border rounded-xl text-xs font-bold" [required]="!productoForm.imagen">
            </div>
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalProductoOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button type="submit" form="formProducto" class="px-4 py-2 bg-easydry-green text-slate-950 font-extrabold rounded-xl text-xs">Guardar Insumo</button>
        </div>
      </app-modal>

      <!-- ============================================================== -->
      <!-- MODAL 2: DESPACHAR INSUMOS A SUCURSAL                          -->
      <!-- ============================================================== -->
      <app-modal
        [isOpen]="modalDespachoOpen"
        title="Despachar Insumos desde Bodega a Sucursal"
        icon="truck"
        (close)="modalDespachoOpen = false">
        
        <form (ngSubmit)="ejecutarDespacho()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bodega de origen</label>
            <select [(ngModel)]="despachoForm.bodegaOrigenId" name="bodegaOrigenId" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
              @for (bod of bodegas; track bod.id) {
                <option [value]="bod.id">{{ bod.nombre }}{{ bod.esCentral ? ' (fija)' : '' }}</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Insumo</label>
            <select [(ngModel)]="despachoForm.productoId" name="productoId" (change)="onDespachoProductoChange()" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
              @for (item of inventarioItems; track item.producto.id) {
                <option [value]="item.producto.id">
                  {{ item.producto.codigoSKU }} - {{ item.producto.nombre }} (Disp. {{ nombreBodega(despachoForm.bodegaOrigenId) }}: {{ stockBodega(item, despachoForm.bodegaOrigenId) }} {{ item.producto.unidadMedida }})
                </option>
              }
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal Destino</label>
              <select [(ngModel)]="despachoForm.sucursalDestino" name="sucursalDestino" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
                <option value="EasyDry Quito Norte">EasyDry Quito Norte</option>
                <option value="EasyDry Quito Sur">EasyDry Quito Sur</option>
                <option value="EasyDry Cumbayá">EasyDry Cumbayá</option>
                <option value="EasyDry Guayaquil">EasyDry Guayaquil</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad a Transferir</label>
              <input type="number" [(ngModel)]="despachoForm.cantidad" name="cantidad" min="1" class="w-full p-2.5 border rounded-xl text-xs font-mono font-bold text-easydry-blue" required>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Notas / Motivo del Despacho</label>
            <input type="text" [(ngModel)]="despachoForm.observacion" name="observacion" placeholder="ej. Reposición quincenal de químicos para 8 bahías" class="w-full p-2.5 border rounded-xl text-xs">
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalDespachoOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="ejecutarDespacho()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">Confirmar y Despachar</button>
        </div>
      </app-modal>

      <!-- ============================================================== -->
      <!-- MODAL 3: ENTRADA DE COMPRA A BODEGA CENTRAL                    -->
      <!-- ============================================================== -->
      <app-modal
        [isOpen]="modalEntradaOpen"
        title="Registrar Entrada de Compra a Bodega"
        icon="arrow-down-circle"
        (close)="modalEntradaOpen = false">
        
        <form (ngSubmit)="guardarEntradaBodega()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bodega destino</label>
            <select [(ngModel)]="entradaForm.bodegaDestinoId" name="bodegaDestinoId" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
              @for (bod of bodegas; track bod.id) {
                <option [value]="bod.id">{{ bod.nombre }}{{ bod.esCentral ? ' (fija)' : '' }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Insumo Comprado</label>
            <select [(ngModel)]="entradaForm.productoId" name="productoId" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
              @for (item of inventarioItems; track item.producto.id) {
                <option [value]="item.producto.id">
                  {{ item.producto.codigoSKU }} - {{ item.producto.nombre }}
                </option>
              }
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad Comprada (Unidades / Envases)</label>
            <input type="number" [(ngModel)]="entradaForm.cantidad" name="cantidad" min="1" class="w-full p-2.5 border rounded-xl text-xs font-mono font-bold text-emerald-700" required>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor / Factura</label>
            <input type="text" [(ngModel)]="entradaForm.proveedor" name="proveedor" placeholder="ej. Factura #4920 - EcoChemicals" class="w-full p-2.5 border rounded-xl text-xs font-medium">
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalEntradaOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarEntradaBodega()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">Registrar Ingreso de Stock</button>
        </div>
      </app-modal>

      <!-- ============================================================== -->
      <!-- MODAL 4: CREAR ENVASE O UNIDAD                                 -->
      <!-- ============================================================== -->
      <app-modal
        [isOpen]="modalEnvaseOpen"
        title="Crear Nuevo Envase o Unidad de Medida"
        icon="package"
        (close)="modalEnvaseOpen = false">
        
        <form (ngSubmit)="guardarEnvase()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Envase / Unidad</label>
              <input type="text" [(ngModel)]="envaseForm.nombre" name="nombreEnvase" placeholder="ej. Garrafa 10L" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Abreviatura</label>
              <input type="text" [(ngModel)]="envaseForm.abreviatura" name="abrevEnvase" placeholder="ej. Garrafa 10L" class="w-full p-2.5 border rounded-xl text-xs font-semibold" required>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo Aplicable</label>
            <select [(ngModel)]="envaseForm.tipoAplicable" name="tipoAplicable" class="w-full p-2.5 border rounded-xl text-xs font-semibold">
              <option value="liquido">Líquidos / Fluidos (Canecas, Galones, Litros)</option>
              <option value="unitario">Unitarios / Conteo (Packs, Rollos, Unidades, Pares)</option>
            </select>
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalEnvaseOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarEnvase()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">Crear Envase</button>
        </div>
      </app-modal>

      <!-- ============================================================== -->
      <!-- MODAL 5: AJUSTE DE STOCK FÍSICO                                -->
      <!-- ============================================================== -->
      <app-modal
        [isOpen]="modalAjusteOpen"
        title="Ajuste Manual de Existencias"
        icon="sliders"
        (close)="modalAjusteOpen = false">
        
        @if (itemAjustar) {
          <div class="space-y-4">
            <div class="p-3 bg-slate-50 rounded-2xl border text-xs flex items-center justify-between">
              <div>
                <p class="font-bold text-slate-900">{{ itemAjustar.producto.nombre }}</p>
                <span class="font-mono text-slate-500 font-bold">{{ itemAjustar.producto.codigoSKU }}</span>
              </div>
              <span class="px-2 py-1 bg-white rounded-lg border font-bold text-slate-700 text-[11px]">{{ itemAjustar.producto.unidadMedida }}</span>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal o Bodega a Calibrar</label>
              <select [(ngModel)]="ajusteForm.sucursal" class="w-full p-2.5 border rounded-xl text-xs font-bold">
                @for (bod of bodegas; track bod.id) {
                  <option [value]="bod.id">{{ bod.nombre }}{{ bod.esCentral ? ' (fija)' : '' }}</option>
                }
                <option value="EasyDry Quito Norte">EasyDry Quito Norte</option>
                <option value="EasyDry Quito Sur">EasyDry Quito Sur</option>
                <option value="EasyDry Cumbayá">EasyDry Cumbayá</option>
                <option value="EasyDry Guayaquil">EasyDry Guayaquil</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nueva Cantidad Real Constatada</label>
              <input type="number" [(ngModel)]="ajusteForm.nuevaCantidad" min="0" class="w-full p-2.5 border rounded-xl text-xs font-mono font-bold text-easydry-blue">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del Ajuste</label>
              <input type="text" [(ngModel)]="ajusteForm.motivo" placeholder="ej. Conteo físico de inventario de fin de mes" class="w-full p-2.5 border rounded-xl text-xs">
            </div>
          </div>
        }

        <div modal-footer>
          <button (click)="modalAjusteOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarAjusteStock()" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs">Guardar Ajuste</button>
        </div>
      </app-modal>

      <app-modal
        [isOpen]="modalBodegaOpen"
        title="Crear Nueva Bodega"
        icon="warehouse"
        (close)="modalBodegaOpen = false">
        <form (ngSubmit)="guardarBodega()" class="space-y-4">
          <p class="text-xs text-slate-500">
            Bodega Central ya existe y no se reemplaza. Esta bodega se suma a la red de almacenamiento.
          </p>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la bodega</label>
            <input type="text" [(ngModel)]="bodegaForm.nombre" name="nombreBodega" placeholder="ej. Bodega Costa Guayaquil" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Ciudad</label>
              <input type="text" [(ngModel)]="bodegaForm.ciudad" name="ciudadBodega" placeholder="ej. Guayaquil" class="w-full p-2.5 border rounded-xl text-xs">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Región</label>
              <input type="text" [(ngModel)]="bodegaForm.region" name="regionBodega" placeholder="ej. Costa" class="w-full p-2.5 border rounded-xl text-xs">
            </div>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalBodegaOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarBodega()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">Crear Bodega</button>
        </div>
      </app-modal>

      <!-- MODAL RECHAZO DE ENVÍO (Punto 9) -->
      <app-modal
        [isOpen]="modalRechazoOpen"
        title="Rechazar Envío de Suministros"
        icon="alert-triangle"
        (close)="modalRechazoOpen = false">
        @if (envioSeleccionadoRechazo) {
          <div class="space-y-4">
            <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              Está a punto de registrar una disconformidad para el envío <strong>{{ envioSeleccionadoRechazo.codigoEnvio }}</strong> hacia <strong>{{ envioSeleccionadoRechazo.sucursalNombre }}</strong>.
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del Rechazo / No Conformidad</label>
              <textarea
                [(ngModel)]="motivoRechazoTexto"
                rows="3"
                placeholder="Indique la causa: Insumos dañados en tránsito, discrepancia en unidades recibidas, producto equivocado..."
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                required>
              </textarea>
            </div>
          </div>
        }
        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalRechazoOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            (click)="confirmarRechazoEnvio()"
            [disabled]="!motivoRechazoTexto.trim()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer">
            Confirmar Rechazo
          </button>
        </div>
      </app-modal>

      <!-- MODAL CREAR ENVÍO (Punto 9) -->
      <app-modal
        [isOpen]="modalCrearEnvioOpen"
        title="Crear y Despachar Envío de Suministros"
        icon="send"
        (close)="modalCrearEnvioOpen = false">
        <form (ngSubmit)="guardarNuevoEnvio()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia / Sucursal Destino</label>
            <select
              [(ngModel)]="nuevoEnvioForm.sucursalNombre"
              name="sucursalDestino"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
              <option value="EasyDry Quito Norte">EasyDry Quito Norte (Quito)</option>
              <option value="EasyDry Quito Sur">EasyDry Quito Sur (Quito)</option>
              <option value="EasyDry Cumbayá">EasyDry Cumbayá (Quito)</option>
              <option value="EasyDry Guayaquil">EasyDry Guayaquil (Guayaquil)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Insumo Principal</label>
            <select
              [(ngModel)]="nuevoEnvioForm.insumoNombre"
              name="insumo"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
              <option value="Shampoo Ecológico Concentrado">Shampoo Ecológico Concentrado (Galón)</option>
              <option value="Cera Línea Brillo Espejo">Cera Línea Brillo Espejo (Galón)</option>
              <option value="Microfibras Ultra Absorbentes 40x40">Microfibras Ultra Absorbentes (Pack x10)</option>
              <option value="Desengrasante Biodegradable">Desengrasante Biodegradable (Caneca)</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad</label>
              <input
                type="number"
                [(ngModel)]="nuevoEnvioForm.cantidad"
                name="cantidad"
                min="1"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridad / Observación</label>
              <input
                type="text"
                [(ngModel)]="nuevoEnvioForm.observacion"
                name="obs"
                placeholder="Ej. Despacho urgente para fin de semana"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">
            </div>
          </div>
        </form>
        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalCrearEnvioOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            (click)="guardarNuevoEnvio()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
            Despachar Envío
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class InventarioComponent implements OnInit {
  private auth = inject(AuthService);
  private toastService = inject(ToastService);

  get puedeGestionarCatalogo(): boolean {
    return this.auth.can('gestionarInventario');
  }

  get puedeDespachar(): boolean {
    return this.auth.can('despacharSuministros');
  }

  activeTab: 'matriz' | 'catalogo' | 'bodegas' | 'despachos' | 'tipos_envases' | 'alertas' | 'envios' = 'matriz';
  filtroTexto = '';
  filtroEstado = 'Todos';
  filtroSucursal = 'Todas';
  filtroBahia = 'Todas';
  filtrosGlobales: FilterState = {
    sucursal: 'Todas',
    marca: 'Todas',
    estado: 'Todos',
    operador: 'Todos',
    bahia: 'Todas',
    fecha: ''
  };
  bodegaCentralId = BODEGA_CENTRAL_ID;

  // Envíos y Confirmación (Punto 9)
  modalRechazoOpen = false;
  modalCrearEnvioOpen = false;
  envioSeleccionadoRechazo: EnvioSuministro | null = null;
  motivoRechazoTexto = '';
  nuevoEnvioForm = {
    sucursalNombre: 'EasyDry Quito Norte',
    insumoNombre: 'Shampoo Ecológico Concentrado',
    cantidad: 5,
    observacion: ''
  };

  envios: EnvioSuministro[] = [
    {
      id: 1,
      codigoEnvio: 'ENV-2026-001',
      fecha: '2026-09-01',
      fechaEnvio: '2026-09-01 08:30',
      horaInicio: '08:30',
      fechaRecepcion: '2026-09-01 11:15',
      horaFin: '11:15',
      duracionMin: 165,
      sucursalId: 1,
      sucursalNombre: 'EasyDry Quito Norte',
      ciudad: 'Quito',
      productos: [
        { productoId: 1, nombreProducto: 'Shampoo Ecológico Concentrado', cantidad: 5, unidad: 'Galón' },
        { productoId: 2, nombreProducto: 'Cera Línea Brillo Espejo', cantidad: 3, unidad: 'Galón' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      responsableRecepcion: 'Carlos Mendoza (Gerente)',
      estado: 'RECIBIDO',
      observaciones: 'Despacho prioritario recibido en perfecto estado.'
    },
    {
      id: 2,
      codigoEnvio: 'ENV-2026-002',
      fecha: '2026-09-02',
      fechaEnvio: '2026-09-02 07:45',
      horaInicio: '07:45',
      sucursalId: 2,
      sucursalNombre: 'EasyDry Guayaquil',
      ciudad: 'Guayaquil',
      productos: [
        { productoId: 3, nombreProducto: 'Microfibras Ultra Absorbentes 40x40', cantidad: 20, unidad: 'Pack x10' },
        { productoId: 4, nombreProducto: 'Desengrasante Biodegradable', cantidad: 4, unidad: 'Caneca' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      estado: 'ENVIADO',
      observaciones: 'Envío en tránsito terrestre hacia la agencia.'
    },
    {
      id: 3,
      codigoEnvio: 'ENV-2026-003',
      fecha: '2026-09-02',
      horaInicio: '09:00',
      sucursalId: 3,
      sucursalNombre: 'EasyDry Cumbayá',
      ciudad: 'Quito',
      productos: [
        { productoId: 1, nombreProducto: 'Shampoo Ecológico Concentrado', cantidad: 2, unidad: 'Galón' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      estado: 'PENDIENTE',
      observaciones: 'Por embalar en bodega central.'
    }
  ];

  envases: EnvaseUnidad[] = [];
  bodegas: BodegaInventario[] = [];
  inventarioItems: InventarioItem[] = [];
  movimientos: MovimientoStock[] = [];
  alertas: AlertaReabastecimiento[] = [];

  // Modales
  modalProductoOpen = false;
  modalDespachoOpen = false;
  modalEntradaOpen = false;
  modalEnvaseOpen = false;
  modalAjusteOpen = false;
  modalBodegaOpen = false;

  editandoProductoId: number | null = null;
  itemAjustar: InventarioItem | null = null;

  // Formularios (Sin valores monetarios y sin Tipo de Producto)
  productoForm = {
    codigoSKU: 'INS-005',
    nombre: '',
    envaseId: 'env_galon',
    stockAlertaBodega: 10,
    stockAlertaSucursal: 2,
    stockInicialBodega: 15,
    descripcion: '',
    imagen: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'
  };

  despachoForm = {
    productoId: 1,
    bodegaOrigenId: BODEGA_CENTRAL_ID,
    sucursalDestino: 'EasyDry Quito Norte',
    cantidad: 2,
    observacion: ''
  };

  entradaForm = {
    productoId: 1,
    bodegaDestinoId: BODEGA_CENTRAL_ID,
    cantidad: 10,
    proveedor: 'EcoChemicals Ecuador S.A.'
  };

  bodegaForm = {
    nombre: '',
    ciudad: '',
    region: ''
  };

  envaseForm = {
    nombre: '',
    abreviatura: '',
    tipoAplicable: 'liquido'
  };

  ajusteForm = {
    sucursal: 'EasyDry Quito Norte',
    nuevaCantidad: 5,
    motivo: 'Inventario físico mensual'
  };

  private inventarioService = inject(InventarioMockService);
  public authService = inject(AuthService);

  ngOnInit(): void {
    if (!this.puedeGestionarCatalogo && this.puedeDespachar) {
      this.activeTab = 'despachos';
    }
    this.inventarioService.getEnvases().subscribe(e => this.envases = e);
    this.inventarioService.getBodegas().subscribe(b => this.bodegas = b);
    this.inventarioService.getItems().subscribe(items => this.inventarioItems = items);
    this.inventarioService.getMovimientos().subscribe(m => this.movimientos = m);
    this.inventarioService.getAlertasReabastecimiento().subscribe(a => this.alertas = a);
  }

  get itemsFiltrados(): InventarioItem[] {
    const sucursalSel = this.filtroSucursal;
    const sucursalDeBahia = this.sucursalDeBahiaSeleccionada();

    return this.inventarioItems.filter(item => {
      const matchText = !this.filtroTexto.trim() ||
        item.producto.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        item.producto.codigoSKU.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (item.producto.unidadMedida && item.producto.unidadMedida.toLowerCase().includes(this.filtroTexto.toLowerCase()));

      const matchEstado = this.filtroEstado === 'Todos' || item.estadoGeneral === this.filtroEstado;

      // Sucursal: stock real reportado en esa sucursal (0 o ausente = sin existencias).
      let matchSucursal = true;
      const sc = (sucursalSel !== 'Todas') ? sucursalSel : sucursalDeBahia;
      if (sc) {
        matchSucursal = (item.stockPorSucursal?.[sc] ?? 0) > 0;
      }

      return matchText && matchEstado && matchSucursal;
    });
  }

  /** Devuelve la sucursal a la que pertenece la bahía seleccionada (si aplica). */
  private sucursalDeBahiaSeleccionada(): string {
    if (this.filtroBahia === 'Todas') return '';
    const map: Record<string, string> = {
      'Bahía 1': 'EasyDry Quito Norte',
      'Bahía 2': 'EasyDry Quito Sur',
      'Bahía 3': 'EasyDry Cumbayá',
      'Bahía 4': 'EasyDry Guayaquil',
    };
    return map[this.filtroBahia] || '';
  }

  /** Catálogo maestro: filtra por texto y estado, sin restricción de sucursal/bahía. */
  get productosCatalogoFiltrados(): InventarioItem[] {
    return this.inventarioItems.filter(item => {
      const matchText = !this.filtroTexto.trim() ||
        item.producto.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        item.producto.codigoSKU.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (item.producto.unidadMedida && item.producto.unidadMedida.toLowerCase().includes(this.filtroTexto.toLowerCase()));

      const matchEstado = this.filtroEstado === 'Todos' || item.estadoGeneral === this.filtroEstado;

      return matchText && matchEstado;
    });
  }

  get bodegasSatelite(): BodegaInventario[] {
    return this.bodegas.filter(b => !b.esCentral);
  }

  stockBodega(item: InventarioItem, bodegaId: string): number {
    return stockEnBodega(item, bodegaId);
  }

  stockOtrasBodegas(item: InventarioItem): number {
    return this.bodegasSatelite.reduce((acc, b) => acc + stockEnBodega(item, b.id), 0);
  }

  nombreBodega(id: string): string {
    return this.bodegas.find(b => b.id === id)?.nombre || 'Bodega';
  }

  unidadesEnBodega(bodegaId: string): number {
    return this.inventarioItems.reduce((acc, item) => acc + stockEnBodega(item, bodegaId), 0);
  }

  get totalUnidadesBodega(): number {
    return this.inventarioItems.reduce((acc, item) => {
      const enBodegas = Object.values(item.stockPorBodega || {}).reduce((a, b) => a + b, 0);
      return acc + (enBodegas || item.stockBodegaCentral || 0);
    }, 0);
  }

  get totalUnidadesSucursales(): number {
    return this.inventarioItems.reduce((acc, item) => {
      const sucursales = Object.values(item.stockPorSucursal).reduce((a, b) => a + b, 0);
      return acc + sucursales;
    }, 0);
  }

  get totalUnidadesEnRed(): number {
    return this.totalUnidadesBodega + this.totalUnidadesSucursales;
  }

  get alertasCriticasCount(): number {
    return this.alertas.filter(a => a.nivel === 'Critico').length;
  }

  // =========================================================================
  // GESTIÓN DE PRODUCTOS
  // =========================================================================

  abrirModalCrearProducto() {
    this.editandoProductoId = null;
    const nextSKU = `INS-00${this.inventarioItems.length + 1}`;
    this.productoForm = {
      codigoSKU: nextSKU,
      nombre: '',
      envaseId: this.envases[0]?.id || 'env_galon',
      stockAlertaBodega: 10,
      stockAlertaSucursal: 2,
      stockInicialBodega: 12,
      descripcion: '',
      imagen: ''
    };
    this.modalProductoOpen = true;
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productoForm.imagen = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  editarProducto(prod: ProductoInsumo) {
    this.editandoProductoId = prod.id;
    this.productoForm = {
      codigoSKU: prod.codigoSKU,
      nombre: prod.nombre,
      envaseId: prod.envaseId,
      stockAlertaBodega: prod.stockAlertaBodega ?? 10,
      stockAlertaSucursal: prod.stockAlertaSucursal ?? 2,
      stockInicialBodega: 0,
      descripcion: prod.descripcion,
      imagen: prod.imagen
    };
    this.modalProductoOpen = true;
  }

  guardarProducto() {
    if (!this.productoForm.nombre.trim() || !this.productoForm.codigoSKU.trim()) {
      this.toastService.warning('Campos Requeridos', 'Ingrese el nombre y código SKU del insumo.');
      return;
    }

    const envaseObj = this.envases.find(e => e.id === this.productoForm.envaseId);

    if (this.editandoProductoId) {
      this.inventarioService.actualizarProducto(this.editandoProductoId, {
        codigoSKU: this.productoForm.codigoSKU.trim(),
        nombre: this.productoForm.nombre.trim(),
        envaseId: this.productoForm.envaseId,
        envaseNombre: envaseObj?.nombre || 'Unidad',
        unidadMedida: envaseObj?.abreviatura || envaseObj?.nombre || 'Unidad',
        stockAlertaBodega: this.productoForm.stockAlertaBodega,
        stockAlertaSucursal: this.productoForm.stockAlertaSucursal,
        descripcion: this.productoForm.descripcion,
        imagen: this.productoForm.imagen
      }).subscribe(() => {
        this.toastService.success('Insumo Actualizado', `Insumo ${this.productoForm.nombre} actualizado.`);
        this.modalProductoOpen = false;
        this.inventarioService.getItems().subscribe(items => this.inventarioItems = items);
      });
    } else {
      this.inventarioService.crearProducto({
        codigoSKU: this.productoForm.codigoSKU.trim(),
        nombre: this.productoForm.nombre.trim(),
        envaseId: this.productoForm.envaseId,
        envaseNombre: envaseObj?.nombre || 'Unidad',
        unidadMedida: envaseObj?.abreviatura || envaseObj?.nombre || 'Unidad',
        descripcion: this.productoForm.descripcion,
        stockAlertaBodega: this.productoForm.stockAlertaBodega,
        stockAlertaSucursal: this.productoForm.stockAlertaSucursal,
        imagen: this.productoForm.imagen,
        activo: true
      }, this.productoForm.stockInicialBodega).subscribe(() => {
        this.toastService.success('Insumo Registrado', `Insumo ${this.productoForm.nombre} registrado con éxito.`);
        this.modalProductoOpen = false;
        this.inventarioService.getItems().subscribe(items => this.inventarioItems = items);
      });
    }
  }

  // =========================================================================
  // DESPACHOS Y ENTRADAS
  // =========================================================================

  abrirModalDespacho() {
    if (this.inventarioItems.length > 0) {
      this.despachoForm.productoId = this.inventarioItems[0].producto.id;
    }
    this.despachoForm.bodegaOrigenId = this.bodegas.find(b => b.esCentral)?.id || BODEGA_CENTRAL_ID;
    this.despachoForm.cantidad = 2;
    this.modalDespachoOpen = true;
  }

  abrirDespachoDirecto(item: InventarioItem) {
    this.despachoForm.productoId = item.producto.id;
    this.despachoForm.bodegaOrigenId = this.bodegas.find(b => b.esCentral)?.id || BODEGA_CENTRAL_ID;
    this.despachoForm.cantidad = 2;
    this.modalDespachoOpen = true;
  }

  onDespachoProductoChange() {}

  ejecutarDespacho() {
    if (this.despachoForm.cantidad <= 0) {
      this.toastService.warning('Cantidad Inválida', 'La cantidad a transferir debe ser mayor a cero.');
      return;
    }

    this.inventarioService.despacharASucursal(
      Number(this.despachoForm.productoId),
      this.despachoForm.sucursalDestino,
      Number(this.despachoForm.cantidad),
      this.auth.getCurrentUser()?.nombre || 'Operación Bodega',
      this.despachoForm.observacion,
      this.despachoForm.bodegaOrigenId
    ).subscribe(res => {
      if (res.success) {
        this.toastService.success('Despacho Exitoso', `Transferidos ${this.despachoForm.cantidad} a ${this.despachoForm.sucursalDestino}.`);
        this.modalDespachoOpen = false;
      } else {
        this.toastService.error('Error en Despacho', res.message || 'No fue posible realizar el despacho.');
      }
    });
  }

  abrirModalEntradaBodega() {
    if (this.inventarioItems.length > 0) {
      this.entradaForm.productoId = this.inventarioItems[0].producto.id;
    }
    this.entradaForm.bodegaDestinoId = this.bodegas.find(b => b.esCentral)?.id || BODEGA_CENTRAL_ID;
    this.entradaForm.cantidad = 10;
    this.modalEntradaOpen = true;
  }

  guardarEntradaBodega() {
    const bodegaNombre = this.nombreBodega(this.entradaForm.bodegaDestinoId);
    this.inventarioService.registrarEntradaBodega(
      Number(this.entradaForm.productoId),
      Number(this.entradaForm.cantidad),
      this.entradaForm.proveedor,
      this.auth.getCurrentUser()?.nombre || 'Operación Bodega',
      '',
      this.entradaForm.bodegaDestinoId
    ).subscribe(res => {
      if (res.success) {
        this.toastService.success('Entrada Registrada', `Ingresaron ${this.entradaForm.cantidad} unidades a ${bodegaNombre}.`);
        this.modalEntradaOpen = false;
      }
    });
  }

  abrirModalCrearBodega() {
    this.bodegaForm = { nombre: '', ciudad: '', region: '' };
    this.modalBodegaOpen = true;
  }

  guardarBodega() {
    this.inventarioService.crearBodega(this.bodegaForm).subscribe(res => {
      if (res.success) {
        this.toastService.success('Bodega Creada', `${res.bodega?.nombre} agregada a la red. Bodega Central se mantiene.`);
        this.modalBodegaOpen = false;
        this.activeTab = 'bodegas';
      } else {
        this.toastService.warning('No se pudo crear', res.message || 'Revise el nombre de la bodega.');
      }
    });
  }

  eliminarBodega(bod: BodegaInventario) {
    this.inventarioService.eliminarBodega(bod.id).subscribe(res => {
      if (res.success) {
        this.toastService.info('Bodega eliminada', `${bod.nombre} fue retirada de la red.`);
      } else {
        this.toastService.warning('No permitido', res.message || 'No se puede eliminar esta bodega.');
      }
    });
  }

  // =========================================================================
  // ENVASES & UNIDADES DE MEDIDA
  // =========================================================================

  abrirModalCrearEnvase() {
    this.envaseForm = { nombre: '', abreviatura: '', tipoAplicable: 'liquido' };
    this.modalEnvaseOpen = true;
  }

  guardarEnvase() {
    if (!this.envaseForm.nombre.trim() || !this.envaseForm.abreviatura.trim()) return;
    this.inventarioService.crearEnvase({
      codigo: this.envaseForm.abreviatura.toUpperCase().replace(/\s+/g, '_'),
      nombre: this.envaseForm.nombre,
      abreviatura: this.envaseForm.abreviatura,
      tipoAplicable: this.envaseForm.tipoAplicable,
      descripcion: `Presentación en ${this.envaseForm.nombre}`
    }).subscribe(() => {
      this.toastService.success('Envase Creado', `Envase "${this.envaseForm.nombre}" agregado con éxito.`);
      this.modalEnvaseOpen = false;
    });
  }

  eliminarEnvase(id: string) {
    this.inventarioService.eliminarEnvase(id).subscribe(() => {
      this.toastService.info('Envase Eliminado', 'La presentación/envase fue removida.');
    });
  }

  // =========================================================================
  // AJUSTE DE STOCK Y ALERTAS
  // =========================================================================

  abrirAjusteStock(item: InventarioItem) {
    this.itemAjustar = item;
    this.ajusteForm = {
      sucursal: BODEGA_CENTRAL_ID,
      nuevaCantidad: stockEnBodega(item, BODEGA_CENTRAL_ID),
      motivo: 'Inventario físico mensual'
    };
    this.modalAjusteOpen = true;
  }

  guardarAjusteStock() {
    if (!this.itemAjustar) return;
    this.inventarioService.ajustarStockSucursal(
      this.itemAjustar.producto.id,
      this.ajusteForm.sucursal,
      Number(this.ajusteForm.nuevaCantidad),
      this.ajusteForm.motivo
    ).subscribe(() => {
      this.toastService.success('Stock Actualizado', `Stock de ${this.ajusteForm.sucursal} ajustado a ${this.ajusteForm.nuevaCantidad}.`);
      this.modalAjusteOpen = false;
    });
  }

  atenderAlerta(al: AlertaReabastecimiento) {
    this.despachoForm.productoId = al.productoId;
    this.despachoForm.sucursalDestino = al.ubicacion.includes('Bodega') ? 'EasyDry Quito Norte' : al.ubicacion;
    this.despachoForm.cantidad = al.sugerenciaReabastecimiento;
    this.despachoForm.observacion = `Reabastecimiento urgente por alerta de stock (${al.nivel}).`;
    this.modalDespachoOpen = true;
  }

  // =========================================================================
  // PUNTO 7 & 18: FILTROS DE MATRIZ, RESPONSABLE Y LIMPIAR
  // =========================================================================

  limpiarFiltrosMatriz(): void {
    this.filtroTexto = '';
    this.filtroEstado = 'Todos';
    this.filtroSucursal = 'Todas';
    this.filtroBahia = 'Todas';
    this.filtrosGlobales = {
      sucursal: 'Todas',
      marca: 'Todas',
      estado: 'Todos',
      operador: 'Todos',
      bahia: 'Todas',
      fecha: ''
    };
    this.toastService.info('Filtros Restablecidos', 'Se limpiaron los filtros de búsqueda e inventario.');
  }

  aplicarNuevosFiltros(filtros: FilterState): void {
    this.filtrosGlobales = filtros;
    this.filtroSucursal = filtros.sucursal || 'Todas';
    this.filtroEstado = filtros.estado || 'Todos';
  }

  aplicarFiltros(): void {
    // Triggers re-evaluation of itemsFiltrados getter
  }

  getResponsableSucursal(sucursal: string): string {
    const s = sucursal.toLowerCase();
    if (s.includes('norte')) return 'Carlos Mendoza (Gerente de Sucursal)';
    if (s.includes('sur')) return 'Esteban Paredes (Gerente de Sucursal)';
    if (s.includes('cumbayá') || s.includes('cumbaya')) return 'Mateo Villacís (Gerente de Sucursal)';
    if (s.includes('guayaquil')) return 'Diana Salazar (Gerente de Sucursal)';
    return 'Gerencia General EasyDry';
  }

  // =========================================================================
  // PUNTO 9: ENVÍOS Y CONFIRMACIÓN / RECHAZO
  // =========================================================================

  abrirModalCrearEnvio(): void {
    this.nuevoEnvioForm = {
      sucursalNombre: 'EasyDry Quito Norte',
      insumoNombre: 'Shampoo Ecológico Concentrado',
      cantidad: 5,
      observacion: ''
    };
    this.modalCrearEnvioOpen = true;
  }

  guardarNuevoEnvio(): void {
    const nextId = this.envios.length + 1;
    const nuevo: EnvioSuministro = {
      id: nextId,
      codigoEnvio: `ENV-2026-00${nextId}`,
      fecha: new Date().toISOString().split('T')[0],
      fechaEnvio: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString().substring(0, 5)}`,
      horaInicio: new Date().toLocaleTimeString().substring(0, 5),
      sucursalId: nextId,
      sucursalNombre: this.nuevoEnvioForm.sucursalNombre,
      ciudad: this.nuevoEnvioForm.sucursalNombre.includes('Guayaquil') ? 'Guayaquil' : 'Quito',
      productos: [
        {
          productoId: 1,
          nombreProducto: this.nuevoEnvioForm.insumoNombre,
          cantidad: this.nuevoEnvioForm.cantidad,
          unidad: 'Unidades'
        }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      estado: 'ENVIADO',
      observaciones: this.nuevoEnvioForm.observacion || 'Envío despachado desde Bodega Central'
    };

    this.envios.unshift(nuevo);
    this.modalCrearEnvioOpen = false;
    this.toastService.success(
      'Envío Despachado',
      `Envío ${nuevo.codigoEnvio} en tránsito hacia ${nuevo.sucursalNombre}.`
    );
  }

  confirmarRecepcionEnvio(env: EnvioSuministro): void {
    const ahora = new Date();
    env.estado = 'RECIBIDO';
    env.fechaRecepcion = ahora.toISOString().split('T')[0];
    env.horaFin = ahora.toLocaleTimeString().substring(0, 5);
    env.responsableRecepcion = this.auth.getCurrentUser()?.nombre
      ? `${this.auth.getCurrentUser()?.nombre} ${this.auth.getCurrentUser()?.apellido || ''} (Receptor)`.trim()
      : 'Gerente de Sucursal';
    env.duracionMin = 140;

    this.toastService.success(
      'Recepción Confirmada',
      `El envío ${env.codigoEnvio} fue verificado y recibido en ${env.sucursalNombre}.`
    );
  }

  abrirModalRechazo(env: EnvioSuministro): void {
    this.envioSeleccionadoRechazo = env;
    this.motivoRechazoTexto = '';
    this.modalRechazoOpen = true;
  }

  confirmarRechazoEnvio(): void {
    if (!this.envioSeleccionadoRechazo || !this.motivoRechazoTexto.trim()) return;

    this.envioSeleccionadoRechazo.estado = 'RECHAZADO';
    this.envioSeleccionadoRechazo.motivoRechazo = this.motivoRechazoTexto.trim();
    this.modalRechazoOpen = false;

    this.toastService.warning(
      'Envío Rechazado',
      `Se registró disconformidad para ${this.envioSeleccionadoRechazo.codigoEnvio}: ${this.motivoRechazoTexto}`
    );
  }
}



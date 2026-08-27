import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { InventarioMockService } from '../../core/services/inventario-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import {
  TipoProducto,
  EnvaseUnidad,
  ProductoInsumo,
  InventarioItem,
  MovimientoStock,
  AlertaReabastecimiento
} from '../../core/models/inventario.model';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent],
  template: `
    <div class="space-y-4 animate-fade-in pb-12">

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
              Balance en tiempo real entre Bodega Central y Sucursales, transferencias y alertas automáticas por consumo en OT.
            </p>
          </div>

          <!-- BOTONES ORGANIZADOS EN UNA SOLA FILA -->
          <div class="flex items-center gap-2.5 flex-nowrap shrink-0 overflow-x-auto pb-1 xl:pb-0">
            <button
              (click)="abrirModalEntradaBodega()"
              class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs whitespace-nowrap flex items-center gap-2 transition-colors shadow-2xs">
              <i-lucide name="arrow-down-circle" class="w-4 h-4 text-emerald-600"></i-lucide>
              <span>+ Entrada Bodega (Compra)</span>
            </button>

            <button
              (click)="abrirModalDespacho()"
              class="px-3.5 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs whitespace-nowrap flex items-center gap-2 transition-colors shadow-xs">
              <i-lucide name="truck" class="w-4 h-4 text-easydry-lime"></i-lucide>
              <span>Despachar a Sucursal</span>
            </button>

            <button
              (click)="abrirModalCrearProducto()"
              class="px-3.5 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs whitespace-nowrap flex items-center gap-2 transition-all shadow-glow-green">
              <i-lucide name="plus-circle" class="w-4 h-4"></i-lucide>
              <span>+ Nuevo Insumo</span>
            </button>
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
              <span class="text-[10px] font-bold uppercase text-blue-800 block">Bodega Central HUB</span>
              <p class="text-xl font-extrabold text-blue-950 font-outfit">{{ totalUnidadesBodega }} <span class="text-xs font-normal text-blue-700">unidades</span></p>
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
        <div class="flex items-center gap-4 sm:gap-6 mt-4 border-b border-slate-200 overflow-x-auto">
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
            (click)="activeTab = 'despachos'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'despachos' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="truck" class="w-4 h-4"></i-lucide>
            Bodega Central & Despachos
          </button>

          <button
            (click)="activeTab = 'tipos_envases'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'tipos_envases' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="package" class="w-4 h-4"></i-lucide>
            Envases & Unidades de Medida
          </button>

          <button
            (click)="activeTab = 'alertas'"
            class="pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 relative whitespace-nowrap cursor-pointer"
            [ngClass]="activeTab === 'alertas' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="alert-circle" class="w-4 h-4"></i-lucide>
            Alertas de Reabastecimiento
            @if (alertas.length > 0) {
              <span class="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {{ alertas.length }}
              </span>
            }
          </button>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- PESTAÑA 1: MATRIZ DE STOCK GLOBAL & SUCURSALES (TABLA VISIBLE) -->
      <!-- ============================================================== -->
      @if (activeTab === 'matriz') {
        <div class="space-y-4 animate-fade-in">
          
          <!-- Filtros y Búsqueda Directa -->
          <div class="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-1 max-w-md">
              <div class="relative w-full">
                <i-lucide name="search" class="w-4 h-4 absolute left-3 top-2.5 text-slate-400"></i-lucide>
                <input
                  type="text"
                  [(ngModel)]="filtroTexto"
                  placeholder="Buscar por insumo, SKU o presentación..."
                  class="w-full pl-9 pr-4 py-1.5 bg-slate-50 border rounded-xl text-xs focus:ring-2 focus:ring-easydry-blue">
              </div>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap">
              <select [(ngModel)]="filtroEstado" class="py-1.5 px-3 border rounded-xl text-xs font-medium bg-slate-50">
                <option value="Todos">Todos los Estados</option>
                <option value="Optimo">Stock Óptimo</option>
                <option value="Bajo">Stock Bajo</option>
                <option value="Critico">Stock Crítico</option>
              </select>
            </div>
          </div>

          <!-- Tabla de Matriz de Stock -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th class="py-3.5 px-4">Insumo / Producto</th>
                    <th class="py-3.5 px-3">Presentación / Envase</th>
                    <th class="py-3.5 px-3 text-center bg-blue-50/40 text-easydry-blue font-bold">Bodega Central HUB</th>
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

                      <!-- Bodega Central -->
                      <td class="py-3 px-3 text-center font-mono font-extrabold bg-blue-50/20 text-blue-900"
                       [ngClass]="{ 'text-rose-600 bg-rose-50/40': item.stockBodegaCentral <= item.producto.stockAlertaBodega }">
                        {{ item.stockBodegaCentral }} {{ item.producto.unidadMedida }}
                      </td>

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
                          <button
                            (click)="abrirDespachoDirecto(item)"
                            title="Despachar a Sucursal"
                            class="p-1.5 rounded-lg bg-easydry-blue/10 hover:bg-easydry-blue text-easydry-blue hover:text-white transition-colors">
                            <i-lucide name="truck" class="w-4 h-4"></i-lucide>
                          </button>
                          <button
                            (click)="abrirAjusteStock(item)"
                            title="Ajustar Stock Sucursal"
                            class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                            <i-lucide name="sliders" class="w-4 h-4"></i-lucide>
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
      <!-- PESTAÑA 2: CATÁLOGO DE INSUMOS (TABLA COMPLETA DE PRODUCTOS)   -->
      <!-- ============================================================== -->
      @if (activeTab === 'catalogo') {
        <div class="space-y-4 animate-fade-in">
          
          <!-- Filtros de Catálogo -->
          <div class="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-center gap-2 flex-1 max-w-md">
              <div class="relative w-full">
                <i-lucide name="search" class="w-4 h-4 absolute left-3 top-2.5 text-slate-400"></i-lucide>
                <input
                  type="text"
                  [(ngModel)]="filtroTexto"
                  placeholder="Buscar en el catálogo por SKU o nombre..."
                  class="w-full pl-9 pr-4 py-1.5 bg-slate-50 border rounded-xl text-xs focus:ring-2 focus:ring-easydry-blue">
              </div>
            </div>

            <button
              (click)="abrirModalCrearProducto()"
              class="px-3.5 py-1.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs">
              <i-lucide name="plus" class="w-4 h-4"></i-lucide>
              <span>+ Nuevo Insumo</span>
            </button>
          </div>

          <!-- TABLA PRINCIPAL DEL CATÁLOGO DE INSUMOS -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    <th class="py-3.5 px-4">Código SKU</th>
                    <th class="py-3.5 px-4">Insumo / Producto</th>
                    <th class="py-3.5 px-3">Presentación / Envase</th>
                    <th class="py-3.5 px-3 text-center bg-blue-50/40 text-easydry-blue font-bold">Bodega Central</th>
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
                        {{ item.stockBodegaCentral }} {{ item.producto.unidadMedida }}
                      </td>

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
                            class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                            <i-lucide name="edit-3" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                            <span>Editar</span>
                          </button>
                          <button
                            (click)="abrirDespachoDirecto(item)"
                            class="px-2.5 py-1.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                            <i-lucide name="truck" class="w-3.5 h-3.5 text-easydry-lime"></i-lucide>
                            <span>Despachar</span>
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
      <!-- PESTAÑA 3: BODEGA CENTRAL & HISTORIAL DE DESPACHOS            -->
      <!-- ============================================================== -->
      @if (activeTab === 'despachos') {
        <div class="space-y-6 animate-fade-in">
          
          <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-easydry">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-900 text-base font-outfit flex items-center gap-2">
                <i-lucide name="history" class="w-5 h-5 text-easydry-blue"></i-lucide>
                Historial de Movimientos y Despachos Recientes
              </h3>
              <button (click)="abrirModalDespacho()" class="px-4 py-2 bg-easydry-blue text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <i-lucide name="truck" class="w-4 h-4"></i-lucide>
                Nuevo Despacho
              </button>
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
      <!-- PESTAÑA 4: ENVASES & UNIDADES DE MEDIDA                        -->
      <!-- ============================================================== -->
      @if (activeTab === 'tipos_envases') {
        <div class="space-y-4 animate-fade-in">
          
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

            <button 
              (click)="abrirModalCrearEnvase()" 
              class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-glow-green transition-all self-start md:self-auto">
              <i-lucide name="plus" class="w-4 h-4"></i-lucide>
              <span>+ Crear Envase / Unidad</span>
            </button>
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
        <div class="space-y-4 animate-fade-in">
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
        
        <form (ngSubmit)="guardarProducto()" class="space-y-4">
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
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor Principal</label>
              <input type="text" [(ngModel)]="productoForm.proveedorPrincipal" name="proveedorPrincipal" placeholder="ej. EcoChemicals Ecuador S.A." class="w-full p-2.5 border rounded-xl text-xs font-medium">
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
        </form>

        <div modal-footer>
          <button (click)="modalProductoOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarProducto()" class="px-4 py-2 bg-easydry-green text-slate-950 font-extrabold rounded-xl text-xs">Guardar Insumo</button>
        </div>
      </app-modal>

      <!-- ============================================================== -->
      <!-- MODAL 2: DESPACHAR INSUMOS A SUCURSAL                          -->
      <!-- ============================================================== -->
      <app-modal
        [isOpen]="modalDespachoOpen"
        title="Despachar Insumos desde Bodega Central a Sucursal"
        icon="truck"
        (close)="modalDespachoOpen = false">
        
        <form (ngSubmit)="ejecutarDespacho()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Insumo</label>
            <select [(ngModel)]="despachoForm.productoId" name="productoId" (change)="onDespachoProductoChange()" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
              @for (item of inventarioItems; track item.producto.id) {
                <option [value]="item.producto.id">
                  {{ item.producto.codigoSKU }} - {{ item.producto.nombre }} (Disp. Bodega: {{ item.stockBodegaCentral }} {{ item.producto.unidadMedida }})
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
        title="Registrar Entrada de Compra a Bodega Central"
        icon="arrow-down-circle"
        (close)="modalEntradaOpen = false">
        
        <form (ngSubmit)="guardarEntradaBodega()" class="space-y-4">
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
          <button (click)="guardarEntradaBodega()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs">Registrar Ingreso de Stock</button>
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
          <button (click)="guardarEnvase()" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs">Crear Envase</button>
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
                <option value="Bodega Central HUB">Bodega Central HUB</option>
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

    </div>
  `
})
export class InventarioComponent implements OnInit {
  activeTab: 'matriz' | 'catalogo' | 'despachos' | 'tipos_envases' | 'alertas' = 'matriz';
  filtroTexto = '';
  filtroEstado = 'Todos';

  envases: EnvaseUnidad[] = [];
  inventarioItems: InventarioItem[] = [];
  movimientos: MovimientoStock[] = [];
  alertas: AlertaReabastecimiento[] = [];

  // Modales
  modalProductoOpen = false;
  modalDespachoOpen = false;
  modalEntradaOpen = false;
  modalEnvaseOpen = false;
  modalAjusteOpen = false;

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
    proveedorPrincipal: 'EcoChemicals Ecuador S.A.',
    descripcion: '',
    imagen: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'
  };

  despachoForm = {
    productoId: 1,
    sucursalDestino: 'EasyDry Quito Norte',
    cantidad: 2,
    observacion: ''
  };

  entradaForm = {
    productoId: 1,
    cantidad: 10,
    proveedor: 'EcoChemicals Ecuador S.A.'
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
  private toastService = inject(ToastService);
  public authService = inject(AuthService);

  ngOnInit(): void {
    this.inventarioService.getEnvases().subscribe(e => this.envases = e);
    this.inventarioService.getItems().subscribe(items => this.inventarioItems = items);
    this.inventarioService.getMovimientos().subscribe(m => this.movimientos = m);
    this.inventarioService.getAlertasReabastecimiento().subscribe(a => this.alertas = a);
  }

  get itemsFiltrados(): InventarioItem[] {
    return this.inventarioItems.filter(item => {
      const matchText = !this.filtroTexto.trim() ||
        item.producto.nombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        item.producto.codigoSKU.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (item.producto.unidadMedida && item.producto.unidadMedida.toLowerCase().includes(this.filtroTexto.toLowerCase()));

      const matchEstado = this.filtroEstado === 'Todos' || item.estadoGeneral === this.filtroEstado;

      return matchText && matchEstado;
    });
  }

  get totalUnidadesBodega(): number {
    return this.inventarioItems.reduce((acc, item) => acc + item.stockBodegaCentral, 0);
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
      proveedorPrincipal: 'EcoChemicals Ecuador S.A.',
      descripcion: '',
      imagen: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'
    };
    this.modalProductoOpen = true;
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
      proveedorPrincipal: prod.proveedorPrincipal,
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
        proveedorPrincipal: this.productoForm.proveedorPrincipal,
        descripcion: this.productoForm.descripcion,
        imagen: this.productoForm.imagen
      }).subscribe(() => {
        this.toastService.success('Insumo Actualizado', `Insumo ${this.productoForm.nombre} actualizado.`);
        this.modalProductoOpen = false;
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
        proveedorPrincipal: this.productoForm.proveedorPrincipal,
        imagen: this.productoForm.imagen,
        activo: true
      }, this.productoForm.stockInicialBodega).subscribe(() => {
        this.toastService.success('Insumo Registrado', `Insumo ${this.productoForm.nombre} registrado con éxito.`);
        this.modalProductoOpen = false;
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
    this.despachoForm.cantidad = 2;
    this.modalDespachoOpen = true;
  }

  abrirDespachoDirecto(item: InventarioItem) {
    this.despachoForm.productoId = item.producto.id;
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
      'Franklin Administrador',
      this.despachoForm.observacion
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
    this.entradaForm.cantidad = 10;
    this.modalEntradaOpen = true;
  }

  guardarEntradaBodega() {
    this.inventarioService.registrarEntradaBodega(
      Number(this.entradaForm.productoId),
      Number(this.entradaForm.cantidad),
      0,
      this.entradaForm.proveedor
    ).subscribe(res => {
      if (res.success) {
        this.toastService.success('Entrada Registrada', `Ingresaron ${this.entradaForm.cantidad} unidades a Bodega Central.`);
        this.modalEntradaOpen = false;
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
      sucursal: 'EasyDry Quito Norte',
      nuevaCantidad: item.stockPorSucursal['EasyDry Quito Norte'] || 0,
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
}


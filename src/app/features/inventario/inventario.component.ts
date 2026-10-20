import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { AvatarSrcDirective } from '../../shared/directives/avatar-src.directive';
import { Component, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { VerMediaDirective } from '../../shared/directives/ver-media.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, tap } from 'rxjs/operators';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ModalPortalDirective } from '../../shared/directives/modal-portal.directive';
import { ImageUploaderComponent } from '../../shared/components/image-uploader/image-uploader.component';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { InventarioService } from '../../core/services/inventario.service';
import { AuthService } from '../../core/services/auth.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { ToastService } from '../../shared/services/toast.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { RegionService } from '../../core/services/region.service';
import { Usuario } from '../../core/models';
import {
  ProductoInsumo,
  TipoProductoCatalog,
  UnidadMedidaCatalog,
  PresentacionInsumoCatalog,
  TipoMovimientoCatalog,
  MovimientoInventarioGlobalItem,
  DashboardInventarioResumen,
  BodegaInventario,
} from '../../core/models/inventario.model';
import { apiUrl } from '../../core/config/env';
import { ConsumoServiciosComponent } from './consumo-servicios/consumo-servicios.component';
import { ThumbSrcDirective } from '../../shared/directives/thumb-src.directive';
import { DataTableCellDirective, DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_INFINITO, PAGE_SIZE_TABLA } from '../../core/config/paginacion';
import { ConsultaTabla, OrdenDir } from '../../core/models/paginacion.model';
import { TablaServidor } from '../../core/utils/tabla-servidor';
import { ConsultaFichas, MetaBodega, ResumenAlertas } from '../../core/services/inventario.service';
import { ListaInfinita } from '../../core/utils/lista-infinita';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import { StockUbicacionInsumosComponent } from './stock-ubicacion-insumos/stock-ubicacion-insumos.component';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [AvatarSrcDirective, CommonModule, FormsModule, LucideAngularModule, VerMediaDirective, ModalComponent, ModalPortalDirective, ImageUploaderComponent, ConsumoServiciosComponent, ThumbSrcDirective, DataTableComponent, DataTableCellDirective, InfiniteScrollComponent, StockUbicacionInsumosComponent, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in pb-16">

      <!-- ============================================================== -->
      <!-- HEADER PRINCIPAL & ACCIONES                                    -->
      <!-- ============================================================== -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-1">
              <i-lucide aria-hidden="true" name="boxes" class="w-3.5 h-3.5"></i-lucide>
              <span>Gestión Integral de Inventario & Insumos</span>
            </div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Inventario de Productos & Insumos</h1>
            <p class="text-slate-500 text-xs mt-0.5">
              Control de existencias en unidad base, presentaciones operativas, kardex transaccional y catálogos dinámicos.
            </p>
          </div>

          <!-- Acciones Rápidas -->
          <div class="flex items-center gap-2 flex-wrap">
            <button
              *ngIf="puedeGenerarDespacho || puedeDespacharABodega"
              (click)="abrirModalDespacho()"
              class="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer">
              <i-lucide aria-hidden="true" name="truck" class="w-4 h-4"></i-lucide>
              <span>Despachar</span>
            </button>

            <button
              *ngIf="puedeRegistrarIngreso"
              (click)="abrirModalEntrada()"
              class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer">
              <i-lucide aria-hidden="true" name="plus-circle" class="w-4 h-4"></i-lucide>
              <span>Registrar Entrada</span>
            </button>

            <button
              *ngIf="puedeGestionarCatalogos"
              (click)="abrirModalNuevoProducto()"
              class="px-3.5 py-2 rounded-xl bg-easydry-blue hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer">
              <i-lucide aria-hidden="true" name="plus" class="w-4 h-4"></i-lucide>
              <span>Nuevo Insumo / Producto</span>
            </button>
          </div>
        </div>

        <!-- Barra de Submenús Principales (orden por prioridad operativa) -->
        <div class="flex items-center gap-2 sm:gap-4 mt-5 pt-3 border-t border-slate-100 overflow-x-auto">
          <!-- 1. Productos — catálogo de insumos (para el líder: los insumos de su propia agencia) -->
          <button
            *ngIf="puedeVerInventario && (puedeOperarBodega || operaDesdeAgencia) && puedeSubProductos"
            (click)="activeTab = 'productos'; abrirProductos()"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            [ngClass]="activeTab === 'productos' ? 'bg-blue-50 text-easydry-blue font-extrabold shadow-2xs' : 'text-slate-600 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="package" class="w-4 h-4"></i-lucide>
            <span>Productos</span>
            <span class="px-1.5 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700 ml-1">{{ productos.length }}</span>
          </button>

          <!-- 2. Bodegas — CENTRAL / REGIONAL -->
          <button
            *ngIf="puedeVerInventario && puedeOperarBodega && puedeSubBodegas"
            (click)="activeTab = 'bodegas'; cargarDatosDeTab('bodegas')"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            [ngClass]="activeTab === 'bodegas' ? 'bg-blue-50 text-easydry-blue font-extrabold shadow-2xs' : 'text-slate-600 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="warehouse" class="w-4 h-4"></i-lucide>
            <span>Bodegas</span>
          </button>

          <!-- 3. Agencias — stock / monitoreo de sedes (no para el líder: solo ve su propia agencia,
               para elegir destino de despacho ya usa el botón "Despachar", que no depende de esta pestaña) -->
          <button
            *ngIf="puedeVerInventario && !operaDesdeAgencia && puedeSubAgencias"
            (click)="activeTab = 'agencias'; cargarDatosDeTab('agencias')"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            [ngClass]="activeTab === 'agencias' ? 'bg-purple-50 text-purple-700 font-extrabold border border-purple-200 shadow-2xs' : 'text-slate-600 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="store" class="w-4 h-4"></i-lucide>
            <span>Agencias</span>
            <span *ngIf="resumenAgencias.agenciasEnAlerta > 0" class="px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white ml-1">
              {{ resumenAgencias.agenciasEnAlerta }}
            </span>
          </button>

          <!-- 4. Pulidores — kits de pulidores móviles y fijos (no para el líder: ver el stock de los
               pulidores de otras sedes/región no es suyo; el botón "Despachar" ya permite enviarles insumos) -->
          <button
            *ngIf="puedeVerInventario && !operaDesdeAgencia && puedeVerKits"
            (click)="activeTab = 'pulidores'; cargarStockPulidoresResumen()"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            [ngClass]="activeTab === 'pulidores' ? 'bg-cyan-50 text-cyan-800 font-extrabold border border-cyan-200 shadow-2xs' : 'text-slate-600 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="sparkles" class="w-4 h-4 text-cyan-600"></i-lucide>
            <span>Pulidores</span>
            <span *ngIf="resumenPulidores?.pulidoresEnAlerta > 0" class="px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white ml-1">
              {{ resumenPulidores.pulidoresEnAlerta }}
            </span>
          </button>

          <!-- 5. Stock Bajo — déficit del catálogo de Bodega Central (no es por agencia: no aplica al
               líder, que ya tiene "Alertas de Reabastecimiento" filtrado a su propia sede) -->
          <button
            *ngIf="puedeVerStockBajoBodegaCentral"
            (click)="activeTab = 'stock_bajo'; cargarDatosDeTab('stock_bajo')"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            [ngClass]="activeTab === 'stock_bajo' ? 'bg-rose-50 text-rose-700 font-extrabold border border-rose-200 shadow-2xs' : 'text-slate-600 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4"></i-lucide>
            <span>Stock Bajo</span>
            <span *ngIf="stockBajoTabla.total > 0" class="px-1.5 py-0.5 rounded-full text-xs bg-rose-500 text-white ml-1">
              {{ stockBajoTabla.total }}
            </span>
          </button>

          <!-- 6. Alertas de Reabastecimiento -->
          <button
            *ngIf="puedeVerAlertas"
            (click)="activeTab = 'alertas_reabastecimiento'; cargarDatosDeTab('alertas_reabastecimiento')"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            [ngClass]="activeTab === 'alertas_reabastecimiento' ? 'bg-amber-50 text-amber-800 font-extrabold border border-amber-200 shadow-2xs' : 'text-slate-600 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="bell-ring" class="w-4 h-4 text-amber-600"></i-lucide>
            <span>Alertas de Reabastecimiento</span>
            <span *ngIf="(alertasTabla.resumen?.activas ?? 0) > 0" class="px-1.5 py-0.5 rounded-full text-xs bg-rose-500 text-white ml-1">
              {{ alertasTabla.resumen?.activas }}
            </span>
          </button>

          <!-- 7. Movimientos (Kardex) -->
          <button
            *ngIf="puedeVerInventario && puedeOperarBodega && puedeSubMovimientos"
            (click)="activeTab = 'movimientos'; cargarDatosDeTab('movimientos')"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            [ngClass]="activeTab === 'movimientos' ? 'bg-blue-50 text-easydry-blue font-extrabold shadow-2xs' : 'text-slate-600 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="refresh-cw" class="w-4 h-4"></i-lucide>
            <span>Movimientos (Kardex)</span>
          </button>

          <!-- 7b. Consumo por Servicio (trazabilidad: qué descontó cada servicio) -->
          <button
            *ngIf="puedeVerConsumoServicios"
            (click)="activeTab = 'consumo_servicios'"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            [ngClass]="activeTab === 'consumo_servicios' ? 'bg-blue-50 text-easydry-blue font-extrabold shadow-2xs' : 'text-slate-600 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="history" class="w-4 h-4"></i-lucide>
            <span>Consumo por Servicio</span>
          </button>

          <!-- 8. Configuración -->
          <button
            *ngIf="puedeGestionarCatalogos && puedeSubConfiguracion"
            (click)="activeTab = 'configuracion'; abrirConfiguracion()"
            class="px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            [ngClass]="activeTab === 'configuracion' ? 'bg-purple-50 text-purple-700 font-extrabold shadow-2xs' : 'text-slate-600 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="settings" class="w-4 h-4"></i-lucide>
            <span>Configuración</span>
          </button>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- TAB 0: INSUMOS POR SERVICIOS DE LA SEDE (LÍDER OPERADOR)       -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'insumos_servicios'" class="space-y-6 animate-fade-in">
        
        <!-- Header de la Sede y Contexto de Insumos según Recetas -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold mb-2">
                <i-lucide aria-hidden="true" name="store" class="w-3.5 h-3.5 text-teal-600"></i-lucide>
                <span>{{ isPulidor ? (isPulidorFijo ? ('Pulidor Fijo · ' + (infoAgenciaInsumos?.nombre || miAgenciaNombre || 'Sucursal')) : (infoAgenciaInsumos?.nombre || 'Kit móvil')) : ('Sede: ' + (infoAgenciaInsumos?.nombre || miAgenciaNombre)) }}</span>
                <span class="text-teal-400">•</span>
                <span class="text-teal-700 font-normal">{{ isPulidor ? (isPulidorFijo ? 'Servicios de Pulido de Sucursal' : 'Servicios asignados al pulidor') : 'Recetas de Servicios Autorizados' }}</span>
              </div>
              <h2 class="text-xl font-extrabold text-slate-900 font-outfit">
                {{ isPulidor
                  ? (isPulidorFijo ? 'Insumos y químicos de mi kit asignado a sucursal' : 'Insumos de mi kit según servicios asignados')
                  : (operaDesdeAgencia ? 'Insumos de mi Sede Requeridos por Servicios' : 'Insumos Requeridos por Servicios de Sede') }}
              </h2>
              <p class="text-slate-500 text-xs mt-1 max-w-3xl">
                {{ isPulidor
                  ? (isPulidorFijo
                      ? 'Control y existencias de los insumos en tu custodia para los servicios especiales de tu sucursal. Tu inventario se descuenta automáticamente con cada servicio atendido.'
                      : 'Muestra los insumos que necesitas según los servicios especiales que te asignaron. El stock refleja tu kit personal.')
                  : 'Control de insumos indispensables según las recetas de cada servicio de lavado. El stock se descuenta automáticamente con cada Orden de Trabajo (OT) creada, alertando de niveles críticos antes de que afecten la operación.' }}
              </p>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap">
              <!-- Selector de Sede para Insumos por Servicios -->
              <div *ngIf="sucursalesActivas.length > 0 && !isPulidor" class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <i-lucide aria-hidden="true" name="store" class="w-3.5 h-3.5 text-teal-600"></i-lucide>
                <label for="inv-f1" class="text-xs font-bold text-slate-600 whitespace-nowrap">Sede:</label>
                <select id="inv-f1"
                  [ngModel]="miAgenciaId"
                  (ngModelChange)="onCambiarSede($event)"
                  class="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1">
                  <option *ngFor="let suc of sucursalesActivas" [value]="suc.id">
                    {{ suc.nombre }}
                  </option>
                </select>
              </div>

              <button
                (click)="cargarInsumosPorServicios(); cargarDespachosPendientes()"
                class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                <i-lucide aria-hidden="true" name="refresh-cw" class="w-3.5 h-3.5" [ngClass]="{'animate-spin': cargandoInsumosServicios || procesandoRecepcion}"></i-lucide>
                <span>Actualizar Stock</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ============================================================== -->
        <!-- BANNER ALERTA: DESPACHOS RECHAZADOS (SUPER ADMIN / BODEGA)     -->
        <!-- ============================================================== -->
        <div *ngIf="despachosRechazadosSuperAdmin.length > 0 && !isOperador" class="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-md space-y-3 animate-fade-in">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-5 h-5"></i-lucide>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-extrabold text-rose-950 uppercase tracking-wide">
                    Alerta Logística: {{ despachosRechazadosSuperAdmin.length }} Despacho(s) Rechazado(s) por Sedes
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-200 text-rose-900">
                    Stock Reintegrado a Bodega Central
                  </span>
                </div>
                <p class="text-xs text-rose-800 mt-0.5">
                  Una o más agencias reportaron anomalías o no recepción. A continuación se detalla la causa reportada para su gestión.
                </p>
              </div>
            </div>

            <button
              (click)="cargarDespachosRechazadosSuperAdmin()"
              class="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-800 text-xs font-bold transition border border-rose-200 shadow-2xs self-end sm:self-auto cursor-pointer flex items-center gap-1">
              <i-lucide aria-hidden="true" name="refresh-cw" class="w-3.5 h-3.5"></i-lucide>
              <span>Actualizar Alertas</span>
            </button>
          </div>

          <!-- Listado de Despachos Rechazados con Razón Reportada -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div *ngFor="let rech of despachosRechazadosSuperAdmin" class="p-4 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-2.5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded font-mono font-extrabold text-xs bg-rose-100 text-rose-900 border border-rose-200">
                    {{ rech.numeroGuia }}
                  </span>
                  <span class="font-bold text-slate-800 text-xs">
                    {{ rech.destinoUbicacion }}
                  </span>
                </div>
                <span class="text-xs font-mono text-slate-500">
                  {{ (rech.fechaRecepcion || rech.updatedAt) | date:'medium' }}
                </span>
              </div>

              <!-- Insumos y cantidades involucradas -->
              <div class="space-y-1">
                <span class="text-[11px] font-bold text-slate-500 uppercase">Insumos y Cantidades Despachadas:</span>
                <div class="flex flex-wrap gap-1">
                  <div *ngFor="let det of rech.detalles" class="px-2 py-1 bg-slate-100 rounded-lg text-slate-800 font-semibold text-xs border border-slate-200">
                    <span class="font-mono text-rose-700 font-extrabold">{{ det.cantidadEnviada }} und</span> - {{ det.insumo?.nombre }}
                  </div>
                </div>
              </div>

              <!-- Comentario reportado -->
              <div class="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-950">
                <span class="font-extrabold text-rose-800 uppercase text-[11px] mb-0.5 inline-flex items-center gap-1">
                  <i-lucide aria-hidden="true" name="info" class="w-3 h-3 text-rose-600"></i-lucide>
                  <span>Razón de Rechazo Indicada por la Agencia:</span>
                </span>
                <p class="font-medium italic">"{{ rech.motivoRechazo || rech.observaciones || 'Sin motivo reportado' }}"</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ============================================================== -->
        <!-- BANNER INTERACTIVO: DESPACHOS DE SUMINISTROS EN CAMINO         -->
        <!-- ============================================================== -->
        <div *ngIf="despachosPendientesAgencia.length > 0" class="p-5 rounded-2xl bg-indigo-50/95 border-2 border-indigo-300 shadow-md space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <i-lucide aria-hidden="true" name="truck" class="w-5 h-5"></i-lucide>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-extrabold text-indigo-950 uppercase tracking-wide">
                    ¡Suministros en Camino para tu Sede!
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-200 text-indigo-900">
                    {{ despachosPendientesAgencia.length }} Despacho(s) Pendiente(s)
                  </span>
                </div>
                <p class="text-xs text-indigo-800 mt-0.5">
                  Bodega Central ha enviado suministros. Verifica la entrega física y presiona <b>Aceptar y Recibir</b> para sumarlo al stock, o <b>Rechazar</b> si el transporte no llegó o presenta anomalías.
                </p>
              </div>
            </div>
          </div>

          <!-- Tarjetas de cada despacho en camino -->
          <div class="space-y-3">
            <div *ngFor="let desp of despachosPendientesAgencia" class="p-4 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                    Guía: {{ desp.numeroGuia }}
                  </span>
                  <span class="text-xs text-slate-600">
                    Origen: <b>{{ desp.origenUbicacion }}</b>
                  </span>
                  <span class="text-slate-500">•</span>
                  <span class="text-xs text-slate-500">
                    Fecha de salida: {{ desp.fechaDespacho | date:'medium' }}
                  </span>
                </div>

                <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1 w-fit">
                  <i-lucide aria-hidden="true" name="clock" class="w-3 h-3"></i-lucide>
                  <span>En Tránsito hacia tu Sede</span>
                </span>
              </div>

              <!-- Lista de Insumos Despachados -->
              <div class="space-y-1.5">
                <span class="text-[11px] font-bold text-slate-500 uppercase">Insumos & Cantidades en este Envío:</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <div *ngFor="let det of desp.detalles" class="p-2 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
                    <div class="truncate mr-2">
                      <p class="font-bold text-slate-800 text-xs truncate">{{ det.insumo?.nombre || 'Insumo' }}</p>
                      <span class="text-xs font-mono text-slate-500">{{ det.insumo?.codigoSKU }}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-extrabold text-xs shrink-0">
                      {{ det.cantidadEnviada }} und
                    </span>
                  </div>
                </div>
              </div>

              <!-- Botones de Aprobación / Rechazo -->
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  *ngIf="puedeRecibirDespacho"
                  (click)="abrirModalRechazoDespacho(desp)"
                  class="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold transition border border-rose-200 cursor-pointer flex items-center gap-1.5">
                  <i-lucide aria-hidden="true" name="x-circle" class="w-4 h-4"></i-lucide>
                  <span>Rechazar (No Llegó / Incompleto)</span>
                </button>

                <button
                  type="button"
                  *ngIf="puedeRecibirDespacho"
                  (click)="confirmarRecepcionDespacho(desp)"
                  [disabled]="procesandoRecepcion"
                  class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shadow-sm cursor-pointer flex items-center gap-1.5">
                  <i-lucide aria-hidden="true" name="check-circle" class="w-4 h-4"></i-lucide>
                  <span>Aceptar y Recibir Suministros</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Banner de Alertas Activas de Stock de Insumos -->
        <div *ngIf="resumenInsumosServicios?.totalAlertas > 0" class="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4"></i-lucide>
              </div>
              <div>
                <h3 class="text-xs font-extrabold text-amber-900 uppercase tracking-wide">
                  Alertas de Reabastecimiento de Insumos en Sede
                </h3>
                <p class="text-xs text-amber-700">
                  Existen {{ resumenInsumosServicios.totalAlertas }} insumo(s) en nivel bajo o agotado que condicionan la capacidad de lavado.
                </p>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-200/80 text-amber-900">
              {{ resumenInsumosServicios.totalAlertas }} en Alerta
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            <div *ngFor="let alerta of resumenInsumosServicios.alertas" class="p-2.5 bg-white/90 rounded-xl border border-amber-200/60 text-xs font-medium text-slate-800 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0" [ngClass]="alerta.includes('AGOTADO') ? 'bg-rose-500' : 'bg-amber-500'"></span>
              <span class="truncate">{{ alerta }}</span>
            </div>
          </div>
        </div>

        <!-- 4 Tarjetas de Métricas de Insumos de la Sede -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Insumos Requeridos</span>
              <p class="text-2xl font-extrabold text-slate-900 font-outfit mt-1">{{ resumenInsumosServicios.totalInsumosRequeridos || 0 }}</p>
              <span class="text-xs text-slate-500">Definidos en recetas de la sede</span>
            </div>
            <div class="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <i-lucide aria-hidden="true" name="boxes" class="w-6 h-6"></i-lucide>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">Stock Óptimo</span>
              <p class="text-2xl font-extrabold text-emerald-600 font-outfit mt-1">{{ resumenInsumosServicios.insumosOptimos || 0 }}</p>
              <span class="text-xs text-emerald-600">Disponibilidad completa</span>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i-lucide aria-hidden="true" name="check-circle" class="w-6 h-6"></i-lucide>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">Bajo Mínimo</span>
              <p class="text-2xl font-extrabold text-amber-600 font-outfit mt-1">{{ resumenInsumosServicios.insumosBajoMinimo || 0 }}</p>
              <span class="text-xs text-amber-600">Requieren reabastecimiento</span>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <i-lucide aria-hidden="true" name="alert-triangle" class="w-6 h-6"></i-lucide>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">Agotados / Crítico</span>
              <p class="text-2xl font-extrabold text-rose-600 font-outfit mt-1">{{ resumenInsumosServicios.insumosAgotados || 0 }}</p>
              <span class="text-xs text-rose-600">Bloquea lavado</span>
            </div>
            <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <i-lucide aria-hidden="true" name="x-circle" class="w-6 h-6"></i-lucide>
            </div>
          </div>
        </div>

        <!-- Barra de Búsqueda y Filtros de Insumos -->
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
          <div class="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
            <div class="relative flex-1 max-w-sm">
              <i-lucide aria-hidden="true" name="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5"></i-lucide>
              <input aria-label="Buscar por insumo, SKU o servicio..."
                type="text"
                [(ngModel)]="filtroTextoInsumosServicio"
                (ngModelChange)="filtrarInsumosServicios()"
                placeholder="Buscar por insumo, SKU o servicio..."
                class="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-easydry-blue" />
            </div>

            <select
              [(ngModel)]="filtroEstadoInsumosServicio"
              (change)="filtrarInsumosServicios()"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
              <option value="">Todos los Estados</option>
              <option value="OPTIMO">Óptimo</option>
              <option value="BAJO">Bajo Mínimo</option>
              <option value="CRITICO">Crítico</option>
              <option value="AGOTADO">Agotado</option>
              <option value="NO_NECESARIO">No necesario</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-medium whitespace-nowrap">
            Mostrando <b>{{ insumosServiciosFiltrados.length }}</b> de <b>{{ insumosServiciosList.length }}</b> insumos requeridos
          </div>
        </div>

        <!-- Tabla estilo Productos (alcance: solo insumos de la sede / servicios) -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" class="py-3 px-4">Código SKU</th>
                  <th scope="col" class="py-3 px-4">Producto</th>
                  <th scope="col" class="py-3 px-4">Tipo</th>
                  <th scope="col" class="py-3 px-4">Contenido x Envase</th>
                  <th scope="col" class="py-3 px-4">Stock en Unidades</th>
                  <th scope="col" class="py-3 px-4">Stock Contenido Total</th>
                  <th scope="col" class="py-3 px-4">Stock Mín. Agencia</th>
                  <th scope="col" class="py-3 px-4">Stock Óptimo Agencia</th>
                  <th scope="col" class="py-3 px-4">Alerta de Stock</th>
                  <th scope="col" class="py-3 px-4">Estado</th>
                  <th scope="col" class="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngIf="cargandoInsumosServicios">
                  <td colspan="11" class="estado-vacio">
                    <i-lucide aria-hidden="true" name="refresh-cw" class="w-5 h-5 mx-auto animate-spin text-teal-600 mb-2"></i-lucide>
                    <span>Cargando insumos de la sede...</span>
                  </td>
                </tr>

                <tr *ngIf="!cargandoInsumosServicios && insumosServiciosFiltrados.length === 0">
                  <td colspan="11" class="estado-vacio">
                    No se encontraron insumos de servicios asignados a esta sede.
                  </td>
                </tr>

                <tr *ngFor="let item of insumosServiciosFiltrados" class="hover:bg-slate-50/60 transition">
                  <td class="p-3.5 font-mono font-bold text-slate-800">{{ item.codigoSKU }}</td>
                  <td class="p-3.5">
                    <div>
                      <span class="font-bold text-slate-900 block">{{ item.nombre }}</span>
                      <span class="text-xs text-slate-500 line-clamp-1">{{ item.descripcion || 'Sin descripción' }}</span>
                      <div *ngIf="item.serviciosQueLoUsan?.length && item.estado !== 'NO_NECESARIO'" class="flex flex-wrap gap-1 mt-1.5">
                        <span *ngFor="let s of item.serviciosQueLoUsan" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-easydry-blue border border-blue-200">
                          <i-lucide aria-hidden="true" name="sparkles" class="w-2.5 h-2.5"></i-lucide>
                          <span>{{ s.nombre }}</span>
                          <span *ngIf="s.cantidadPorServicio" class="font-mono">({{ s.cantidadPorServicio }} {{ s.unidad || item.unidadMedida }})</span>
                        </span>
                      </div>
                      <div *ngIf="item.estado === 'NO_NECESARIO'" class="mt-1.5">
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Sin servicio de la sede que lo requiera
                        </span>
                      </div>
                    </div>
                  </td>
                  <td class="p-3.5 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-easydry-blue border border-blue-100">
                      {{ item.tipoProducto || item.categoria || 'General' }}
                    </span>
                  </td>
                  <td class="p-3.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                    {{ (item.contenidoNeto || 1) | number:'1.0-2' }} {{ item.unidadMedida }}
                  </td>
                  <td class="p-3.5 whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
                      {{ getStockEnUnidades(item.stockActual, item.contenidoNeto) | number:'1.0-2' }} und
                    </span>
                  </td>
                  <td class="p-3.5 whitespace-nowrap">
                    <span
                      class="px-2.5 py-1 rounded-md font-mono font-bold text-xs inline-block"
                      [ngClass]="{
                        'bg-rose-100 text-rose-800 border border-rose-200': item.estado === 'AGOTADO' || item.estado === 'CRITICO',
                        'bg-amber-100 text-amber-800 border border-amber-200': item.estado === 'BAJO',
                        'bg-emerald-100 text-emerald-800 border border-emerald-200': item.estado === 'OPTIMO',
                        'bg-slate-100 text-slate-600 border border-slate-200': item.estado === 'NO_NECESARIO'
                      }">
                      {{ item.stockActual | number:'1.0-2' }} {{ item.unidadMedida }}
                    </span>
                  </td>
                  <td class="p-3.5 text-slate-600 font-mono whitespace-nowrap">
                    <b>{{ getStockEnUnidades(item.stockMinimoAgencia || item.stockMinimo, item.contenidoNeto) | number:'1.0-2' }} und</b>
                    <span class="text-xs text-slate-500 block">({{ (item.stockMinimoAgencia || item.stockMinimo || 0) | number:'1.0-2' }} {{ item.unidadMedida }})</span>
                  </td>
                  <td class="p-3.5 text-slate-500 font-mono whitespace-nowrap">
                    <b>{{ getStockEnUnidades(item.stockOptimoAgencia, item.contenidoNeto) | number:'1.0-2' }} und</b>
                    <span class="text-xs text-slate-500 block">({{ (item.stockOptimoAgencia || 0) | number:'1.0-2' }} {{ item.unidadMedida }})</span>
                  </td>
                  <td class="p-3.5 whitespace-nowrap">
                    <span
                      class="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"
                      [ngClass]="{
                        'bg-rose-100 text-rose-800': item.estado === 'AGOTADO' || item.estado === 'CRITICO',
                        'bg-amber-100 text-amber-800': item.estado === 'BAJO',
                        'bg-emerald-100 text-emerald-800': item.estado === 'OPTIMO',
                        'bg-slate-100 text-slate-600': item.estado === 'NO_NECESARIO'
                      }"
                      [title]="item.mensajeAlerta || ''">
                      <i-lucide aria-hidden="true"
                        [name]="item.estado === 'NO_NECESARIO' ? 'minus-circle' : (item.estado === 'OPTIMO' ? 'check-circle' : (item.estado === 'AGOTADO' ? 'x-circle' : 'alert-triangle'))"
                        class="w-3.5 h-3.5"></i-lucide>
                      <span>{{ getLabelEstadoInsumoServicio(item.estado) }}</span>
                    </span>
                  </td>
                  <td class="p-3.5 whitespace-nowrap">
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-bold"
                      [ngClass]="item.activo !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                      {{ item.activo !== false ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="p-3.5 text-right space-x-1 whitespace-nowrap">
                    <button
                      *ngIf="puedeDespacharStockBajo && item.estado !== 'NO_NECESARIO'"
                      (click)="abrirModalDespachoAgencia(undefined, item)"
                      title="Despachar a otra agencia o pulidor"
                      class="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 border border-purple-200">
                      <i-lucide aria-hidden="true" name="truck" class="w-3 h-3"></i-lucide>
                      <span>Despachar</span>
                    </button>
                    <button
                      *ngIf="puedeDespacharStockBajo && item.estado === 'NO_NECESARIO' && item.stockActual > 0"
                      (click)="abrirModalDespachoAgencia(undefined, item)"
                      title="Reubicar stock no requerido por servicios"
                      class="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 border border-slate-200">
                      <i-lucide aria-hidden="true" name="send" class="w-3 h-3"></i-lucide>
                      <span>Reubicar</span>
                    </button>
                    <button
                      *ngIf="puedeCrearAlerta && item.estado !== 'NO_NECESARIO'"
                      (click)="solicitarReabastecimiento(item)"
                      class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1">
                      <i-lucide aria-hidden="true" name="truck" class="w-3 h-3 text-slate-500"></i-lucide>
                      <span>Pedir Reabastecimiento</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- ============================================================== -->
      <!-- TAB 2: PRODUCTOS / INSUMOS MAESTROS                            -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'productos'" class="space-y-4 animate-fade-in">
        <!-- Filtros de Productos -->
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
          <div class="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
            <!-- Selector de Sede para Productos: el líder solo tiene la suya, nunca una lista para
                 elegir otra agencia (no debe poder ampliar su alcance ni por accidente). -->
            <div *ngIf="operaDesdeAgencia" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
              <i-lucide aria-hidden="true" name="store" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
              <span class="text-xs font-bold text-slate-600">Sede:</span>
              <span class="text-xs text-slate-800 font-semibold">{{ miAgenciaNombre }}</span>
            </div>
            <div *ngIf="!operaDesdeAgencia && sucursalesActivas.length > 0" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs">
              <i-lucide aria-hidden="true" name="store" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
              <label for="inv-f2" class="text-xs font-bold text-slate-600 whitespace-nowrap">Sede:</label>
              <select id="inv-f2"
                [ngModel]="miAgenciaId"
                (ngModelChange)="onCambiarSede($event)"
                class="text-xs bg-transparent focus:outline-none text-slate-800 font-semibold cursor-pointer">
                <option value="">Todas las Sedes (Global)</option>
                <option *ngFor="let suc of sucursalesActivas" [value]="suc.id">
                  {{ suc.nombre }}
                </option>
              </select>
            </div>

            <!-- Filtro Dinámico por Tipo de Producto (de BD) -->
            <select
              [(ngModel)]="filtroTipoProductoId"
              (change)="reiniciarProductos()"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
              <option value="">Todos los Tipos</option>
              <option *ngFor="let t of tiposProducto" [value]="t.id">{{ t.nombre }}</option>
            </select>

            <!-- Filtro por Nivel de Alerta de Stock -->
            <select
              [(ngModel)]="filtroAlertaStock"
              (change)="reiniciarProductos()"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
              <option value="">Todos los Niveles de Stock</option>
              <option value="alerta_total">En Alerta (Agotado o Bajo Mínimo)</option>
              <option value="agotado">Agotado (Sin Existencias)</option>
              <option value="bajo_minimo">Bajo Mínimo</option>
              <option value="moderado">Stock Moderado</option>
              <option value="optimo">Stock Óptimo</option>
            </select>

            <!-- Filtro Activo / Inactivo (inactivos siguen visibles) -->
            <select
              [(ngModel)]="filtroEstadoProducto"
              (change)="reiniciarProductos()"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
              <option value="">Todos (Activos e Inactivos)</option>
              <option value="activo">Solo Activos</option>
              <option value="inactivo">Solo Inactivos</option>
            </select>
          </div>

        </div>

        <!-- Banner informativo: Insumos vinculados a servicios -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-slate-700">
          <div class="flex items-center gap-2">
            <i-lucide aria-hidden="true" name="check-circle-2" class="w-4 h-4 text-easydry-blue shrink-0"></i-lucide>
            <span class="font-medium">
              {{ operaDesdeAgencia ? 'Insumos requeridos por los servicios autorizados de tu sede.' : 'Catálogo maestro de insumos y suministros registrados en el sistema.' }}
            </span>
          </div>
        </div>

        <!-- Tabla de productos: páginas numeradas, orden, búsqueda y filtros en el servidor -->
        <app-data-table
          [serverSide]="true"
          [columns]="columnasProductos"
          [data]="productosTabla.filas"
          [total]="productosTabla.total"
          [page]="productosTabla.pagina"
          [pageSize]="productosTabla.pageSize"
          [sortField]="productosTabla.sortField"
          [sortOrder]="productosTabla.sortOrder"
          [loading]="productosTabla.cargando"
          [error]="productosTabla.error"
          maxHeight="none"
          caption="Productos e insumos"
          searchPlaceholder="Buscar por código SKU, nombre o descripción..."
          emptyTitle="No se encontraron productos que coincidan con los filtros aplicados."
          (queryChange)="productosTabla.alCambiar($event)"
          (reintentar)="productosTabla.cargar(true)">

          <ng-template appCell="sku" let-p><span class="font-mono font-bold text-slate-800">{{ p.codigoSKU }}</span></ng-template>

          <ng-template appCell="nombre" let-p>
            <div class="flex items-center gap-3 min-w-56">
              <!-- Miniatura Cuadrada (1:1) con Lightbox Zoom -->
              <div
                *ngIf="p.imagenUrl || p.imagen; else defaultIcon"
                (click)="abrirZoomImagen(p.imagenUrl || p.imagen || '', 'Foto del insumo')"
                (keydown.enter)="abrirZoomImagen(p.imagenUrl || p.imagen || '', 'Foto del insumo')"
                tabindex="0" role="button" aria-label="Ampliar foto del insumo"
                class="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-2xs flex-shrink-0 bg-slate-50 cursor-pointer group relative">
                <img loading="lazy" decoding="async" [appThumb]="resolverUrlImagen(p.imagenUrl || p.imagen)" [alt]="'Foto de ' + (p.nombre || 'insumo')" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <i-lucide aria-hidden="true" name="zoom-in" class="w-4 h-4 text-white"></i-lucide>
                </div>
              </div>
              <ng-template #defaultIcon>
                <div class="w-12 h-12 rounded-xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center flex-shrink-0 border border-slate-200/60">
                  <i-lucide aria-hidden="true" name="package" class="w-6 h-6"></i-lucide>
                </div>
              </ng-template>
              <div>
                <span class="font-bold text-slate-900 block">{{ p.nombre }}</span>
                <span class="text-xs text-slate-500 line-clamp-1">{{ p.descripcion || 'Sin descripción' }}</span>
              </div>
            </div>
          </ng-template>

          <ng-template appCell="tipo" let-p>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-easydry-blue border border-blue-100 whitespace-nowrap">
              {{ p.tipoProducto?.nombre || 'General' }}
            </span>
          </ng-template>

          <ng-template appCell="contenido" let-p>
            <span class="font-mono font-bold text-slate-700 whitespace-nowrap">{{ (p.contenidoNeto || 1) | number:'1.0-2' }} {{ p.unidadMedida }}</span>
          </ng-template>

          <ng-template appCell="stockUnidades" let-p>
            <span class="px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block whitespace-nowrap">
              {{ getStockEnUnidades(p.stockActual, p.contenidoNeto) | number:'1.0-2' }} und
            </span>
          </ng-template>

          <ng-template appCell="stock" let-p>
            <span
              class="px-2.5 py-1 rounded-md font-mono font-bold text-xs inline-block whitespace-nowrap"
              [ngClass]="{
                'bg-rose-100 text-rose-800 border border-rose-200': p.stockActual <= (p.stockMinimoBodega || 0),
                'bg-amber-100 text-amber-800 border border-amber-200': p.stockActual > (p.stockMinimoBodega || 0) && (p.stockOptimoBodega ? p.stockActual < p.stockOptimoBodega : false),
                'bg-emerald-100 text-emerald-800 border border-emerald-200': p.stockActual >= (p.stockOptimoBodega || (p.stockMinimoBodega || 1))
              }">
              {{ p.stockActual | number:'1.0-2' }} {{ p.unidadMedida }}
            </span>
          </ng-template>

          <ng-template appCell="stockMinimoBodega" let-p>
            <div class="text-slate-600 font-mono whitespace-nowrap">
              <b>{{ getStockEnUnidades(p.stockMinimoBodega, p.contenidoNeto) | number:'1.0-2' }} und</b>
              <span class="text-xs text-slate-500 block">({{ (p.stockMinimoBodega || 0) | number:'1.0-2' }} {{ p.unidadMedida }})</span>
            </div>
          </ng-template>

          <ng-template appCell="stockOptimoBodega" let-p>
            <div class="text-slate-500 font-mono whitespace-nowrap">
              <b>{{ getStockEnUnidades(p.stockOptimoBodega, p.contenidoNeto) | number:'1.0-2' }} und</b>
              <span class="text-xs text-slate-500 block">({{ (p.stockOptimoBodega || 0) | number:'1.0-2' }} {{ p.unidadMedida }})</span>
            </div>
          </ng-template>

          <ng-template appCell="stockMinimoAgencia" let-p>
            <div class="text-slate-600 font-mono whitespace-nowrap">
              <b>{{ getStockEnUnidades(p.stockMinimoAgencia, p.contenidoNeto) | number:'1.0-2' }} und</b>
              <span class="text-xs text-slate-500 block">({{ (p.stockMinimoAgencia || 0) | number:'1.0-2' }} {{ p.unidadMedida }})</span>
            </div>
          </ng-template>

          <ng-template appCell="stockOptimoAgencia" let-p>
            <div class="text-slate-500 font-mono whitespace-nowrap">
              <b>{{ getStockEnUnidades(p.stockOptimoAgencia, p.contenidoNeto) | number:'1.0-2' }} und</b>
              <span class="text-xs text-slate-500 block">({{ (p.stockOptimoAgencia || 0) | number:'1.0-2' }} {{ p.unidadMedida }})</span>
            </div>
          </ng-template>

          <ng-template appCell="alerta" let-p>
            <span
              class="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap"
              [ngClass]="getInfoAlertaStock(p).badgeClass">
              <i-lucide aria-hidden="true" [name]="getInfoAlertaStock(p).icon" class="w-3.5 h-3.5"></i-lucide>
              <span>{{ getInfoAlertaStock(p).label }}</span>
            </span>
          </ng-template>

          <ng-template appCell="estado" let-p>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold" [ngClass]="p.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
              {{ p.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </ng-template>

          <ng-template appCell="acciones" let-p>
            <div class="flex items-center justify-end gap-1 whitespace-nowrap">
              <button
                type="button"
                *ngIf="puedeRegistrarIngreso"
                (click)="seleccionarParaEntrada(p)"
                title="Registrar Entrada de Stock (solo Bodega Central)"
                class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition cursor-pointer" aria-label="Registrar Entrada de Stock (solo Bodega Central)">
                <i-lucide aria-hidden="true" name="plus-circle" class="w-3.5 h-3.5"></i-lucide>
              </button>
              <button
                type="button"
                *ngIf="puedeGestionarCatalogos"
                (click)="abrirModalEditarProducto(p)"
                title="Editar Producto"
                class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-easydry-blue transition cursor-pointer" aria-label="Editar Producto">
                <i-lucide aria-hidden="true" name="pencil" class="w-3.5 h-3.5"></i-lucide>
              </button>
              <button
                type="button"
                *ngIf="puedeCambiarEstadoProducto()"
                (click)="toggleEstadoProducto(p)"
                [title]="p.activo ? 'Desactivar producto (conserva historial)' : 'Activar producto'"
                [attr.aria-label]="p.activo ? 'Desactivar producto' : 'Activar producto'"
                class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                [ngClass]="p.activo ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-400 hover:text-emerald-600'">
                <i-lucide aria-hidden="true" [name]="p.activo ? 'x-circle' : 'check-circle'" class="w-3.5 h-3.5"></i-lucide>
              </button>
            </div>
          </ng-template>
        </app-data-table>
      </div>

      <!-- ============================================================== -->
      <!-- TAB: BODEGAS DE ALMACENAMIENTO & ASISTENTES EN CUSTODIA         -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'bodegas'" class="space-y-6 animate-fade-in">

        <!-- Selector de Bodegas Creadas (Grid) -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-easydry-blue text-xs font-bold mb-1 border border-blue-100">
                <i-lucide aria-hidden="true" name="warehouse" class="w-3.5 h-3.5"></i-lucide>
                <span>Red de Distribución & Almacenamiento</span>
              </div>
              <h2 class="text-xl font-extrabold text-slate-900 font-outfit">Bodegas del Sistema & Asistentes</h2>
              <p class="text-slate-500 text-xs mt-0.5">
                Selecciona una bodega para inspeccionar su inventario en tiempo real y el personal de asistentes asignado a su custodia.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                *ngIf="puedeGestionarBodegas"
                (click)="abrirModalCrearBodega()"
                class="px-4 py-2 rounded-xl bg-easydry-green hover:bg-easydry-green-dark text-slate-950 text-xs font-extrabold transition flex items-center gap-2 shadow-glow-green cursor-pointer">
                <i-lucide aria-hidden="true" name="plus-circle" class="w-4 h-4"></i-lucide>
                <span>Registrar Nueva Bodega</span>
              </button>

              <button
                (click)="cargarBodegasDisponibles(); cargarUsuariosYAsistentes(); cargarStockBodega()"
                class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                <i-lucide aria-hidden="true" name="refresh-cw" class="w-3.5 h-3.5" [ngClass]="{'animate-spin': cargandoBodegas}"></i-lucide>
                <span>Actualizar Bodegas</span>
              </button>
            </div>
          </div>

          <!-- Grid de Selección de Bodegas -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
            <div
              *ngFor="let bod of getBodegasParaVisualizacion()"
              (click)="seleccionarBodega(bod.id)"
              (keydown.enter)="seleccionarBodega(bod.id)"
              (keydown.space)="seleccionarBodega(bod.id); $event.preventDefault()"
              tabindex="0"
              role="button"
              [attr.aria-pressed]="bodegaSeleccionadaId === bod.id"
              class="p-4 rounded-xl border transition-shadow cursor-pointer relative overflow-hidden group flex flex-col justify-between"
              [ngClass]="bodegaSeleccionadaId === bod.id ? 'border-easydry-blue bg-blue-50/40 ring-2 ring-easydry-blue/20 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'">
              
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0"
                  [ngClass]="bod.esCentral ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-easydry-blue'">
                  <i-lucide aria-hidden="true" name="warehouse" class="w-4 h-4"></i-lucide>
                </div>
                <div class="flex items-center gap-1">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-bold"
                    [ngClass]="(bod.tipo === 'CENTRAL' || bod.esCentral) ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-700 border border-slate-200'">
                    {{ (bod.tipo === 'CENTRAL' || bod.esCentral) ? 'CENTRAL' : 'REGIONAL' }}
                  </span>
                  <button
                    *ngIf="puedeGestionarBodegas"
                    type="button"
                    (click)="$event.stopPropagation(); abrirModalEditarBodega(bod)"
                    class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-easydry-blue transition"
                    title="Editar Bodega" aria-label="Editar Bodega">
                    <i-lucide aria-hidden="true" name="edit-2" class="w-3.5 h-3.5"></i-lucide>
                  </button>
                  <button
                    *ngIf="!bod.esCentral && puedeGestionarBodegas"
                    type="button"
                    (click)="$event.stopPropagation(); eliminarBodega(bod)"
                    class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                    title="Eliminar Bodega" aria-label="Eliminar Bodega">
                    <i-lucide aria-hidden="true" name="trash-2" class="w-3.5 h-3.5"></i-lucide>
                  </button>
                </div>
              </div>

              <div>
                <h3 class="font-extrabold text-sm text-slate-900 group-hover:text-easydry-blue transition line-clamp-1">
                  {{ bod.nombre }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <i-lucide aria-hidden="true" name="map-pin" class="w-3 h-3 text-slate-400"></i-lucide>
                  <span>{{ bod.ciudad }} ({{ bod.region }})</span>
                </p>
              </div>

              <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end text-xs">
                <span class="inline-flex items-center gap-1 font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                  <i-lucide aria-hidden="true" name="users" class="w-3 h-3 text-easydry-blue"></i-lucide>
                  <span>{{ getAsistentesDeBodega(bod).length }} Asistente(s)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ficha / Header de Bodega Seleccionada -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-easydry-blue flex items-center justify-center font-bold shrink-0">
              <i-lucide aria-hidden="true" name="warehouse" class="w-6 h-6"></i-lucide>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-extrabold text-slate-900 font-outfit">
                  {{ bodegaSeleccionada?.nombre || resumenBodegas.bodega?.nombre || 'Bodega Central Nacional' }}
                </h2>
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-bold"
                  [ngClass]="(bodegaSeleccionada?.esCentral || resumenBodegas.bodega?.esCentral) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-purple-50 text-purple-700 border border-purple-200'">
                  {{ (bodegaSeleccionada?.esCentral || resumenBodegas.bodega?.esCentral) ? 'HUB Principal Operativo' : 'Sede Logística Regional' }}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                Ubicación: {{ bodegaSeleccionada?.ciudad || resumenBodegas.bodega?.ciudad || 'Quito' }}
                <span *ngIf="bodegaSeleccionada?.region || resumenBodegas.bodega?.region">
                  ({{ bodegaSeleccionada?.region || resumenBodegas.bodega?.region }})
                </span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap justify-end" *ngIf="esBodegaCentralActual && puedeRegistrarIngreso">
            <button
              (click)="abrirModalEntrada()"
              class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer">
              <i-lucide aria-hidden="true" name="plus-circle" class="w-4 h-4"></i-lucide>
              <span>Ingresar Stock a Bodega Central</span>
            </button>
          </div>
          <div class="flex items-center gap-2 flex-wrap justify-end" *ngIf="!esBodegaCentralActual && puedeAjustarStock">
            <span class="text-xs text-slate-500 font-medium max-w-xs text-right">
              Esta bodega se abastece por <b>Envíos</b> desde Central (no admite ingresos directos).
            </span>
            <button
              *ngIf="puedeAbastecerBodegas"
              type="button"
              (click)="abrirModalDespachoHaciaBodegaSeleccionada()"
              class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0">
              <i-lucide aria-hidden="true" name="warehouse" class="w-4 h-4"></i-lucide>
              <span>Despachar a esta Bodega</span>
            </button>
          </div>
        </div>

        <!-- SECCIÓN: ASISTENTES DE BODEGA ASIGNADOS -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <i-lucide aria-hidden="true" name="users" class="w-4 h-4"></i-lucide>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Asistentes de Bodega Asignados
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
                    {{ getAsistentesDeBodega(bodegaSeleccionada).length }} en custodia
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  Personal operativo a cargo del control de stock físico, recepción de compras y despacho hacia las sedes.
                </p>
              </div>
            </div>
          </div>

          <!-- Listado de Asistentes -->
          <div *ngIf="getAsistentesDeBodega(bodegaSeleccionada).length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            <div
              *ngFor="let asis of getAsistentesDeBodega(bodegaSeleccionada)"
              class="p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition flex items-start gap-3">
              <div class="relative shrink-0">
                <img loading="lazy" decoding="async"
                  *ngIf="asis.avatar"
                  [appAvatar]="asis.avatar" [appAvatarIniciales]="(asis.nombre || 'A').charAt(0)"
                  [alt]="asis.nombre"
                  class="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs" />
                <div
                  *ngIf="!asis.avatar"
                  class="w-11 h-11 rounded-full bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                  {{ (asis.nombre || 'A').charAt(0).toUpperCase() }}
                </div>
                <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" title="Activo"></span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-1">
                  <h4 class="text-xs font-extrabold text-slate-900 truncate">
                    {{ asis.nombre }} {{ asis.apellido }}
                  </h4>
                  <span class="px-1.5 py-0.5 rounded text-xs font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                    Activo
                  </span>
                </div>
                
                <span class="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-teal-50 text-teal-700 border border-teal-100 mt-1">
                  {{ asis.rol || asis.rolNombre || 'Asistente de Bodega' }}
                </span>

                <div class="mt-2 space-y-1 text-xs text-slate-500">
                  <div class="flex items-center gap-1.5 truncate">
                    <i-lucide aria-hidden="true" name="mail" class="w-3 h-3 text-slate-400 shrink-0"></i-lucide>
                    <a [href]="'mailto:' + asis.email" class="text-easydry-blue hover:underline truncate">{{ asis.email }}</a>
                  </div>
                  <div class="flex items-center gap-1.5 truncate text-xs text-slate-500">
                    <i-lucide aria-hidden="true" name="map-pin" class="w-3 h-3 text-slate-400 shrink-0"></i-lucide>
                    <span class="truncate">{{ asis.region || asis.agencia || bodegaSeleccionada?.region || 'Región Asignada' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Estado Vacío cuando no hay asistentes -->
          <div *ngIf="getAsistentesDeBodega(bodegaSeleccionada).length === 0" class="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
            <div class="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
              <i-lucide aria-hidden="true" name="users" class="w-5 h-5"></i-lucide>
            </div>
            <p class="text-xs font-bold text-slate-700">Sin Asistentes de Bodega asignados a esta ubicación</p>
            <p class="text-xs text-slate-500 max-w-md mx-auto">
              Para asignar personal operativo a esta bodega, accede al módulo de <b>Gestión de Usuarios</b> y crea o edita un usuario con el rol de <b>Asistente de Bodega</b> en la región o bodega correspondiente.
            </p>
          </div>
        </div>

        <!-- Tarjetas de Métricas de Bodega -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">Insumos en Custodia</span>
              <div class="w-8 h-8 rounded-lg bg-blue-50 text-easydry-blue flex items-center justify-center">
                <i-lucide aria-hidden="true" name="boxes" class="w-4 h-4"></i-lucide>
              </div>
            </div>
            <div class="mt-2 text-2xl font-extrabold text-slate-900 font-outfit">
              {{ resumenBodegas.metricas?.totalInsumos || 0 }}
            </div>
            <span class="text-xs text-slate-500">Productos registrados en inventario</span>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">Existencias Totales</span>
              <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <i-lucide aria-hidden="true" name="layers" class="w-4 h-4"></i-lucide>
              </div>
            </div>
            <div class="mt-2 text-2xl font-extrabold text-indigo-700 font-outfit font-mono">
              {{ (resumenBodegas.metricas?.stockTotalUnidades || 0) | number:'1.0-2' }}
            </div>
            <span class="text-xs text-slate-500">Unidades base almacenadas</span>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">Bajo Mínimo en Bodega</span>
              <div class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4"></i-lucide>
              </div>
            </div>
            <div class="mt-2 text-2xl font-extrabold text-rose-600 font-outfit">
              {{ resumenBodegas.metricas?.insumosBajoMinimo || 0 }}
            </div>
            <span class="text-xs text-rose-500 font-medium">Requieren compra a proveedor</span>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">Insumos con Stock Óptimo</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i-lucide aria-hidden="true" name="check-circle" class="w-4 h-4"></i-lucide>
              </div>
            </div>
            <div class="mt-2 text-2xl font-extrabold text-emerald-600 font-outfit">
              {{ resumenBodegas.metricas?.insumosOptimos || 0 }}
            </div>
            <span class="text-xs text-emerald-600 font-medium">Abastecimiento adecuado</span>
          </div>
        </div>

        <!-- Filtro de estado (la búsqueda está en la barra de la tabla) -->
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
          <select
            [(ngModel)]="filtroEstadoBodega"
            (change)="reiniciarBodega()"
            aria-label="Filtrar insumos de la bodega por estado"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
            <option value="">Todos los Estados</option>
            <option value="Óptimo">Óptimo</option>
            <option value="Bajo">Bajo</option>
            <option value="Crítico">Crítico</option>
            <option value="Agotado">Agotado</option>
            <option value="No necesario">No necesario</option>
          </select>
        </div>

        <!-- Tabla de Insumos en Bodega: páginas numeradas, orden, búsqueda y filtro de estado en el servidor -->
        <app-data-table
          [serverSide]="true"
          [columns]="columnasBodega"
          [data]="bodegaTabla.filas"
          [total]="bodegaTabla.total"
          [page]="bodegaTabla.pagina"
          [pageSize]="bodegaTabla.pageSize"
          [sortField]="bodegaTabla.sortField"
          [sortOrder]="bodegaTabla.sortOrder"
          [loading]="bodegaTabla.cargando"
          [error]="bodegaTabla.error"
          maxHeight="none"
          caption="Insumos en bodega"
          searchPlaceholder="Buscar por SKU, nombre o tipo..."
          emptyTitle="No se encontraron insumos almacenados en la bodega que coincidan con el filtro."
          emptyHint=""
          (queryChange)="bodegaTabla.alCambiar($event)"
          (reintentar)="bodegaTabla.cargar(true)">

          <ng-template appCell="sku" let-item><span class="font-mono font-bold text-slate-800">{{ item.codigoSKU }}</span></ng-template>
          <ng-template appCell="nombre" let-item><span class="font-bold text-slate-900">{{ item.nombre }}</span></ng-template>
          <ng-template appCell="tipo" let-item>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-easydry-blue border border-blue-100">{{ item.tipoProducto }}</span>
          </ng-template>
          <ng-template appCell="contenido" let-item>
            <span class="font-mono font-bold text-slate-700 whitespace-nowrap">{{ (item.contenidoNeto || 1) | number:'1.0-2' }} {{ item.unidad }}</span>
          </ng-template>
          <ng-template appCell="stockUnidades" let-item>
            <span class="px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block whitespace-nowrap">
              {{ getStockEnUnidades(item.stockActual, item.contenidoNeto) | number:'1.0-2' }} und
            </span>
          </ng-template>
          <ng-template appCell="stock" let-item>
            <span
              class="px-2.5 py-1 rounded-md font-mono font-bold text-xs inline-block whitespace-nowrap"
              [ngClass]="{
                'bg-rose-100 text-rose-800 border border-rose-200': item.estado === 'Agotado' || item.estado === 'Crítico',
                'bg-amber-100 text-amber-800 border border-amber-200': item.estado === 'Bajo',
                'bg-emerald-100 text-emerald-800 border border-emerald-200': item.estado === 'Óptimo',
                'bg-slate-100 text-slate-600 border border-slate-200': item.estado === 'No necesario'
              }">
              {{ item.stockActual | number:'1.0-2' }} {{ item.unidad }}
            </span>
          </ng-template>
          <ng-template appCell="minimo" let-item>
            <div class="font-mono text-slate-600 whitespace-nowrap">
              <b>{{ getStockEnUnidades(item.stockMinimo, item.contenidoNeto) | number:'1.0-2' }} und</b>
              <span class="text-xs text-slate-500 block">({{ item.stockMinimo | number:'1.0-2' }} {{ item.unidad }})</span>
            </div>
          </ng-template>
          <ng-template appCell="umbral" let-item>
            <span class="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 font-mono whitespace-nowrap">
              <span>{{ item.umbralAlerta || (item.stockMinimo * 1.2) | number:'1.0-2' }} {{ item.unidad }}</span>
              <span class="text-xs font-extrabold text-amber-600">(+{{ item.porcentajeAlerta || 20 }}%)</span>
            </span>
          </ng-template>
          <ng-template appCell="optimo" let-item>
            <div class="font-mono text-slate-500 whitespace-nowrap">
              <b>{{ getStockEnUnidades(item.stockOptimo, item.contenidoNeto) | number:'1.0-2' }} und</b>
              <span class="text-xs text-slate-500 block">({{ item.stockOptimo | number:'1.0-2' }} {{ item.unidad }})</span>
            </div>
          </ng-template>
          <ng-template appCell="estado" let-item>
            <span
              class="px-2.5 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1 whitespace-nowrap"
              [ngClass]="{
                'bg-rose-100 text-rose-800 border border-rose-200': item.estado === 'Agotado' || item.estado === 'Crítico',
                'bg-amber-100 text-amber-800 border border-amber-200': item.estado === 'Bajo',
                'bg-emerald-100 text-emerald-800 border border-emerald-200': item.estado === 'Óptimo',
                'bg-slate-100 text-slate-600 border border-slate-200': item.estado === 'No necesario'
              }">
              <span>{{ getLabelEstadoBodega(item) }}</span>
            </span>
          </ng-template>
          <ng-template appCell="acciones" let-item>
            <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
              <button
                type="button"
                *ngIf="puedeDespacharBodega && puedeAjustarStock"
                (click)="abrirModalDespachoDesdeBodegaActual(item)"
                title="Despachar este insumo desde la bodega seleccionada"
                class="px-2.5 py-1 rounded-lg bg-easydry-blue hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1">
                <i-lucide aria-hidden="true" name="truck" class="w-3 h-3"></i-lucide>
                <span>Despachar</span>
              </button>
              <button
                type="button"
                *ngIf="esBodegaCentralActual && puedeRegistrarIngreso"
                (click)="seleccionarParaEntrada(item)"
                class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer">
                Ingresar Stock
              </button>
              <button
                type="button"
                *ngIf="puedeReajustarBodega"
                (click)="abrirModalReajuste(item)"
                title="Reajustar stock por conteo físico"
                class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1">
                <i-lucide aria-hidden="true" name="sliders" class="w-3 h-3"></i-lucide>
                <span>Reajustar</span>
              </button>
            </div>
          </ng-template>
        </app-data-table>
      </div>

      <!-- ============================================================== -->
      <!-- TAB: OTRAS AGENCIAS (MONITOREO DE SUMINISTROS POR SEDE)        -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'agencias'" class="space-y-6 animate-fade-in">
        <!-- Header de Otras Agencias -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <i-lucide aria-hidden="true" name="store" class="w-6 h-6"></i-lucide>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-extrabold text-slate-900 font-outfit">
                  Monitoreo de Suministros en Otras Agencias
                </h2>
                <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Red de Sucursales
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                Supervisión en tiempo real de existencias, suministros críticos y necesidades de reabastecimiento en cada agencia.
              </p>
            </div>
          </div>

          <button
            *ngIf="puedeDespacharBodega"
            (click)="abrirModalDespachoAgencia()"
            class="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer shrink-0">
            <i-lucide aria-hidden="true" name="truck" class="w-4 h-4"></i-lucide>
            <span>Despachar a otra Agencia</span>
          </button>
        </div>

        <!-- Tarjetas de Métricas de la Red -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">Agencias Monitoreadas</span>
              <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <i-lucide aria-hidden="true" name="building-2" class="w-4 h-4"></i-lucide>
              </div>
            </div>
            <div class="mt-2 text-2xl font-extrabold text-slate-900 font-outfit">
              {{ resumenAgencias.totalAgencias || 0 }}
            </div>
            <span class="text-xs text-slate-500">Sedes operativas conectadas</span>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">Agencias en Alerta</span>
              <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4"></i-lucide>
              </div>
            </div>
            <div class="mt-2 text-2xl font-extrabold text-amber-600 font-outfit">
              {{ resumenAgencias.agenciasEnAlerta || 0 }}
            </div>
            <span class="text-xs text-amber-600 font-medium">Presentan déficit de insumos</span>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500">Insumos Críticos en la Red</span>
              <div class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <i-lucide aria-hidden="true" name="x-circle" class="w-4 h-4"></i-lucide>
              </div>
            </div>
            <div class="mt-2 text-2xl font-extrabold text-rose-600 font-outfit">
              {{ resumenAgencias.insumosCriticosTotal || 0 }}
            </div>
            <span class="text-xs text-rose-500 font-medium">Insumos bajo mínimo o agotados</span>
          </div>
        </div>

        <!-- Filtros de Agencias -->
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
          <div class="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
            <select
              [(ngModel)]="filtroEstadoAgencia"
              (change)="reiniciarAgencias()"
              aria-label="Filtrar sedes por estado"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
              <option value="">Todos los Estados</option>
              <option value="alerta">Solo Sedes en Alerta</option>
              <option value="optimo">Solo Sedes Óptimas</option>
            </select>

            <div class="relative flex-1 max-w-xs">
              <i-lucide aria-hidden="true" name="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i-lucide>
              <input aria-label="Buscar agencia, región o insumo..."
                type="search"
                [ngModel]="textoAgencias"
                (ngModelChange)="onBusquedaAgencias($event)"
                placeholder="Buscar agencia, región o insumo..."
                class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-easydry-blue" />
            </div>
            <span *ngIf="busquedaAgenciasCorta" class="text-[11px] font-semibold text-slate-500" role="status">Escribe al menos 2 letras para buscar.</span>
          </div>
          <span class="text-xs font-bold text-slate-500">Total: <strong class="text-easydry-blue">{{ agenciasLista.total }}</strong> agencias</span>
        </div>

        <!-- Estado vacío -->
        <div *ngIf="agenciasLista.inicializada && agenciasLista.total === 0 && !agenciasLista.error" class="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-3 shadow-easydry">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <i-lucide aria-hidden="true" name="store" class="w-7 h-7"></i-lucide>
          </div>
          <h3 class="text-base font-bold text-slate-800 font-outfit">
            {{ (resumenAgencias.totalAgencias || 0) === 0 ? 'No hay agencias registradas en el sistema' : 'No se encontraron agencias con estos filtros' }}
          </h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            {{ (resumenAgencias.totalAgencias || 0) === 0
              ? 'Para monitorear cómo van de insumos y suministros en otras sedes, crea agencias o sucursales en la sección correspondiente. El monitoreo de inventario se sincronizará automáticamente.'
              : 'Prueba ajustando el estado o el texto de búsqueda.' }}
          </p>
        </div>

        <!-- Listado de Agencias (scroll infinito) y su Detalle de Insumos (tabla con páginas, al expandir la ficha) -->
        <div class="space-y-6">
          <div *ngFor="let itemAg of agenciasLista.items; trackBy: trackFicha" class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <!-- Header de la Ficha de la Agencia -->
            <div class="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0">
                  <i-lucide aria-hidden="true" name="building-2" class="w-4 h-4 text-purple-600"></i-lucide>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 text-sm font-outfit">{{ itemAg.agencia.nombre }}</span>
                    <span class="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-200 text-slate-700">
                      {{ itemAg.agencia.codigo }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500">
                    Región: <b>{{ itemAg.agencia.region || 'N/A' }}</b> • Bahías: {{ itemAg.agencia.numeroBahias || 0 }} • Insumos monitoreados: {{ itemAg.totalInsumos }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"
                  [ngClass]="itemAg.tieneAlerta ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
                  <i-lucide aria-hidden="true" [name]="itemAg.tieneAlerta ? 'alert-circle' : 'check-circle'" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ itemAg.tieneAlerta ? (itemAg.insumosCriticos + ' insumos en alerta') : 'Suministros Óptimos' }}</span>
                </span>
                <button
                  type="button"
                  (click)="alternarFicha(agenciasExpandidas, itemAg.agencia.id)"
                  [attr.aria-expanded]="agenciasExpandidas.has(itemAg.agencia.id)"
                  class="btn btn-secondary btn-sm inline-flex items-center gap-1.5 cursor-pointer">
                  <i-lucide aria-hidden="true" [name]="agenciasExpandidas.has(itemAg.agencia.id) ? 'chevron-up' : 'chevron-down'" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ agenciasExpandidas.has(itemAg.agencia.id) ? 'Ocultar insumos' : 'Ver insumos' }}</span>
                </button>
              </div>
            </div>

            <!-- Tabla de Insumos de la Agencia (se pide al servidor solo al expandir) -->
            <app-stock-ubicacion-insumos
              *ngIf="agenciasExpandidas.has(itemAg.agencia.id)"
              tipo="agencia"
              [ubicacionId]="itemAg.agencia.id"
              [puedeDespachar]="puedeDespacharAgencia"
              [puedeReajustar]="puedeReajustarAgencia"
              [refreshToken]="stockRefreshToken"
              (despachar)="seleccionarParaDespachoAgencia(itemAg.agencia, $event)"
              (reajustar)="abrirModalReajusteAgencia(itemAg.agencia, $event)">
            </app-stock-ubicacion-insumos>
          </div>

          <app-infinite-scroll
            [hasMore]="agenciasLista.hasMore"
            [loading]="agenciasLista.cargando"
            [error]="agenciasLista.error"
            [total]="agenciasLista.total"
            (cargarMas)="agenciasLista.siguiente()"
            (reintentar)="agenciasLista.reintentar()">
          </app-infinite-scroll>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- TAB 4: PULIDORES (KITS Y SUMINISTROS EN CUSTODIA)              -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'pulidores'" class="space-y-6 animate-fade-in">
        
        <!-- Header de Pulidores -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold mb-2">
                <i-lucide aria-hidden="true" name="sparkles" class="w-3.5 h-3.5 text-cyan-600"></i-lucide>
                <span>Gestión de Suministros en Kits de Pulidores</span>
                <span class="text-cyan-400">•</span>
                <span class="text-cyan-700 font-normal">Pulidores Móviles & Fijos de Red</span>
              </div>
              <h2 class="text-xl font-extrabold text-slate-900 font-outfit">
                {{ isPulidor ? 'Insumos Químicos en Custodia de mi Kit' : 'Monitoreo de Insumos en Kits de Pulidores' }}
              </h2>
              <p class="text-slate-500 text-xs mt-1 max-w-3xl">
                {{ isPulidor
                  ? 'Control y existencias de los productos químicos asignados a tu kit personal. El stock se actualiza con cada servicio atendido o despacho recibido.'
                  : 'Supervisión en tiempo real de los insumos y químicos asignados a cada pulidor. Permite despachar producto directamente para reabastecer sus kits de trabajo.' }}
              </p>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap">
              <button
                (click)="cargarStockPulidoresResumen()"
                class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                <i-lucide aria-hidden="true" name="refresh-cw" class="w-3.5 h-3.5" [ngClass]="{'animate-spin': pulidoresLista.cargando}"></i-lucide>
                <span>Actualizar Kits</span>
              </button>

              <button
                *ngIf="puedeDespacharPulidor"
                (click)="abrirModalDespacho('pulidor')"
                class="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm">
                <i-lucide aria-hidden="true" name="send" class="w-3.5 h-3.5"></i-lucide>
                <span>Despachar a Pulidor</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Métricas Rápidas de Pulidores (si no es pulidor individual) -->
        <div *ngIf="!isPulidor" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Pulidores</span>
              <p class="text-2xl font-extrabold text-slate-900 font-outfit mt-1">{{ resumenPulidores.totalPulidores }}</p>
              <span class="text-xs text-slate-500">Móviles y asignados a sede</span>
            </div>
            <div class="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <i-lucide aria-hidden="true" name="users" class="w-6 h-6"></i-lucide>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Kits en Alerta</span>
              <p class="text-2xl font-extrabold text-amber-600 font-outfit mt-1">{{ resumenPulidores.pulidoresEnAlerta }}</p>
              <span class="text-xs text-amber-600">Requieren reabastecimiento</span>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <i-lucide aria-hidden="true" name="alert-triangle" class="w-6 h-6"></i-lucide>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Insumos Críticos</span>
              <p class="text-2xl font-extrabold text-rose-600 font-outfit mt-1">{{ resumenPulidores.insumosCriticosTotal }}</p>
              <span class="text-xs text-rose-600">Agotados o bajo mínimo</span>
            </div>
            <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <i-lucide aria-hidden="true" name="package-x" class="w-6 h-6"></i-lucide>
            </div>
          </div>
        </div>

        <!-- Filtros de Pulidores -->
        <div *ngIf="!isPulidor" class="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
          <div class="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
            <select
              [(ngModel)]="filtroPulidorTipo"
              (change)="reiniciarPulidores()"
              aria-label="Filtrar por tipo de pulidor"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
              <option value="">Todos los Tipos</option>
              <option value="PULIDOR_MOVIL">Pulidor Móvil (En Ruta)</option>
              <option value="PULIDOR_FIJO">Pulidor Fijo (Sucursal)</option>
            </select>

            <select
              [(ngModel)]="filtroPulidorEstado"
              (change)="reiniciarPulidores()"
              aria-label="Filtrar kits por estado"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
              <option value="">Todos los Estados</option>
              <option value="alerta">Solo Kits en Alerta</option>
              <option value="optimo">Solo Kits Óptimos</option>
            </select>

            <div class="relative flex-1 max-w-xs">
              <i-lucide aria-hidden="true" name="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i-lucide>
              <input aria-label="Buscar pulidor o insumo..."
                type="search"
                [ngModel]="textoPulidores"
                (ngModelChange)="onBusquedaPulidores($event)"
                placeholder="Buscar pulidor o insumo..."
                class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-easydry-blue" />
            </div>
            <span *ngIf="busquedaPulidoresCorta" class="text-[11px] font-semibold text-slate-500" role="status">Escribe al menos 2 letras para buscar.</span>
          </div>
          <span class="text-xs font-bold text-slate-500">Total: <strong class="text-easydry-blue">{{ pulidoresLista.total }}</strong> pulidores</span>
        </div>

        <!-- Estado Vacío Si no hay pulidores -->
        <div *ngIf="pulidoresLista.inicializada && pulidoresLista.total === 0 && !pulidoresLista.error" class="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-3 shadow-easydry">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
            <i-lucide aria-hidden="true" name="sparkles" class="w-7 h-7"></i-lucide>
          </div>
          <h3 class="text-base font-bold text-slate-800 font-outfit">No se encontraron pulidores disponibles</h3>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            Verifica los filtros seleccionados o los pulidores asignados a tu región.
          </p>
        </div>

        <!-- Listado de Pulidores (scroll infinito) y su Detalle de Insumos (tabla con páginas, al expandir la ficha) -->
        <div class="space-y-6">
          <div *ngFor="let p of pulidoresLista.items; trackBy: trackFicha" class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <!-- Header de la Ficha del Pulidor -->
            <div class="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold shrink-0"
                  [ngClass]="p.tipoPulidor === 'PULIDOR_FIJO' ? 'text-purple-600' : 'text-cyan-600'">
                  <i-lucide aria-hidden="true" [name]="p.tipoPulidor === 'PULIDOR_FIJO' ? 'user-check' : 'sparkles'" class="w-4 h-4"></i-lucide>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 text-sm font-outfit uppercase">{{ p.nombre }}</span>
                    <span
                      class="px-2 py-0.5 rounded-md font-mono text-xs font-bold"
                      [ngClass]="p.tipoPulidor === 'PULIDOR_FIJO' ? 'bg-purple-100 text-purple-800' : 'bg-cyan-100 text-cyan-800'">
                      {{ p.tipoPulidor === 'PULIDOR_FIJO' ? 'PULIDOR-FIJO' : 'PULIDOR-MOVIL' }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500">
                    Región: <b>{{ p.regionNombre || 'N/A' }}</b> • Sede: <b>{{ p.agenciaNombre || (p.tipoPulidor === 'PULIDOR_FIJO' ? 'Sucursal' : 'En Ruta') }}</b> • Insumos monitoreados: {{ p.totalInsumos || 0 }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"
                  [ngClass]="p.tieneAlerta ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
                  <i-lucide aria-hidden="true" [name]="p.tieneAlerta ? 'alert-circle' : 'check-circle'" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ p.tieneAlerta ? (p.insumosCriticos + ' insumos en alerta') : 'Kit Óptimo' }}</span>
                </span>
                <button
                  type="button"
                  (click)="alternarFicha(pulidoresExpandidos, p.id)"
                  [attr.aria-expanded]="pulidoresExpandidos.has(p.id)"
                  class="btn btn-secondary btn-sm inline-flex items-center gap-1.5 cursor-pointer">
                  <i-lucide aria-hidden="true" [name]="pulidoresExpandidos.has(p.id) ? 'chevron-up' : 'chevron-down'" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ pulidoresExpandidos.has(p.id) ? 'Ocultar insumos' : 'Ver insumos' }}</span>
                </button>
              </div>
            </div>

            <!-- Tabla de Insumos del Kit del Pulidor (se pide al servidor solo al expandir) -->
            <app-stock-ubicacion-insumos
              *ngIf="pulidoresExpandidos.has(p.id)"
              tipo="pulidor"
              [ubicacionId]="p.id"
              [puedeDespachar]="puedeDespacharPulidor"
              [puedeReajustar]="puedeReajustarPulidor"
              [refreshToken]="stockRefreshToken"
              (despachar)="seleccionarParaDespachoPulidor(p, $event)"
              (reajustar)="abrirModalReajustePulidor(p, $event)">
            </app-stock-ubicacion-insumos>
          </div>

          <app-infinite-scroll
            [hasMore]="pulidoresLista.hasMore"
            [loading]="pulidoresLista.cargando"
            [error]="pulidoresLista.error"
            [total]="pulidoresLista.total"
            (cargarMas)="pulidoresLista.siguiente()"
            (reintentar)="pulidoresLista.reintentar()">
          </app-infinite-scroll>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- TAB 7: MOVIMIENTOS / KARDEX HISTORIAL                          -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'consumo_servicios' && puedeVerConsumoServicios" class="animate-fade-in">
        <app-consumo-servicios></app-consumo-servicios>
      </div>

      <div *ngIf="activeTab === 'movimientos'" class="space-y-4 animate-fade-in">
        <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col gap-3">
          <div class="flex items-center gap-3 w-full flex-wrap">
            <div class="relative w-full sm:w-64">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                <i-lucide aria-hidden="true" name="search" class="w-4 h-4"></i-lucide>
              </span>
              <input
                type="search"
                aria-label="Buscar en el Kardex"
                [ngModel]="busquedaMovimientos"
                (ngModelChange)="onBusquedaMovimientos($event)"
                placeholder="Buscar comprobante, producto, responsable…"
                class="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-500 outline-none focus:border-easydry-blue transition-colors">
            </div>

            <select
              [(ngModel)]="filtroMovimientoTipoId"
              (change)="alCambiarFiltroMovimientos()"
              aria-label="Filtrar por tipo de movimiento"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
              <option value="">Todos los Tipos de Movimiento</option>
              <option *ngFor="let tm of tiposMovimiento" [value]="tm.id">{{ tm.nombre }}</option>
            </select>

            <select
              [(ngModel)]="filtroMovimientoInsumoId"
              (change)="alCambiarFiltroMovimientos()"
              aria-label="Filtrar por producto"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
              <option value="">Todos los Productos</option>
              <option *ngFor="let prod of productos" [value]="prod.id">{{ prod.nombre }}</option>
            </select>

            <label class="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span>Desde</span>
              <input
                type="date"
                [(ngModel)]="filtroMovimientoFechaDesde"
                (change)="alCambiarFiltroMovimientos()"
                class="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
            </label>
            <label class="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span>Hasta</span>
              <input
                type="date"
                [(ngModel)]="filtroMovimientoFechaHasta"
                (change)="alCambiarFiltroMovimientos()"
                class="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue text-slate-700">
            </label>

            <button
              *ngIf="hayFiltrosMovimientos"
              type="button"
              (click)="limpiarFiltrosMovimientos()"
              class="btn btn-secondary btn-sm">
              Limpiar filtros
            </button>

            <div class="text-xs text-slate-600 font-medium sm:ml-auto">
              Total Asientos: <b>{{ totalMovimientos }}</b>
            </div>
          </div>
          <p *ngIf="busquedaMovimientosCorta" class="text-[11px] font-semibold text-slate-500">Escribe al menos 2 letras para buscar.</p>
        </div>

        <app-data-table
          [serverSide]="true"
          [showToolbar]="false"
          [columns]="columnasMovimientos"
          [data]="historialMovimientos"
          [total]="totalMovimientos"
          [page]="paginaMovimientos"
          [pageSize]="pageSizeMovimientos"
          [sortField]="sortFieldMovimientos"
          [sortOrder]="sortOrderMovimientos"
          [loading]="cargandoMovimientos"
          [error]="errorMovimientos"
          maxHeight="none"
          caption="Movimientos del Kardex de inventario"
          [emptyTitle]="hayFiltrosMovimientos ? 'No hay movimientos con estos filtros' : 'No hay movimientos registrados en el Kardex.'"
          emptyHint="Prueba ajustando los filtros o el texto de búsqueda."
          (queryChange)="onTablaMovimientosCambio($event)"
          (reintentar)="cargarHistorialMovimientos()">
          <ng-template appCell="fecha" let-m>
            <span class="text-slate-600 whitespace-nowrap">{{ m.fechaMovimiento | date:'dd/MM/yyyy HH:mm' }}</span>
          </ng-template>
          <ng-template appCell="comprobante" let-m>
            <span class="font-mono font-bold text-slate-700">{{ m.numeroComprobante }}</span>
          </ng-template>
          <ng-template appCell="producto" let-m>
            <span class="font-bold text-slate-900">{{ m.insumo?.nombre || '—' }}</span>
          </ng-template>
          <ng-template appCell="tipo" let-m>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold inline-block" [ngClass]="getClaseTipoMovimiento(m)">
              {{ getLabelTipoMovimiento(m) }}
            </span>
          </ng-template>
          <ng-template appCell="ruta" let-m>
            <div class="flex flex-col gap-0.5 leading-tight min-w-[200px]">
              <span class="text-[11px] text-slate-500 font-bold uppercase tracking-wide">Desde</span>
              <span class="font-semibold text-slate-700">{{ m.origenUbicacion || '—' }}</span>
              <span class="text-[11px] text-slate-500 font-bold uppercase tracking-wide mt-1">Hacia</span>
              <span class="font-semibold text-easydry-blue">{{ m.destinoUbicacion || '—' }}</span>
            </div>
          </ng-template>
          <ng-template appCell="cantidad" let-m>
            <span class="text-slate-700">
              <span *ngIf="m.presentacion">{{ m.cantidad }} × {{ m.presentacion.nombre }}</span>
              <span *ngIf="!m.presentacion">{{ m.cantidad }} {{ m.unidad?.simbolo || m.insumo?.unidadMedida?.simbolo || '' }}</span>
            </span>
          </ng-template>
          <ng-template appCell="cantidadBase" let-m>
            <span class="font-mono font-bold" [ngClass]="m.cantidadBase >= 0 ? 'text-emerald-600' : 'text-amber-600'">
              {{ m.cantidadBase > 0 ? '+' : '' }}{{ m.cantidadBase | number:'1.0-2' }} {{ m.insumo?.unidadMedida?.simbolo || m.unidad?.simbolo || '' }}
            </span>
          </ng-template>
          <ng-template appCell="stockAnterior" let-m>
            <span class="font-mono text-slate-600">{{ m.stockAnterior | number:'1.0-2' }}</span>
          </ng-template>
          <ng-template appCell="stockNuevo" let-m>
            <span class="font-mono font-bold text-slate-800">{{ m.stockNuevo | number:'1.0-2' }}</span>
          </ng-template>
          <ng-template appCell="responsable" let-m>
            <span class="text-slate-600 whitespace-nowrap">{{ m.responsable ? (m.responsable.name + ' ' + m.responsable.lastname) : 'Sistema' }}</span>
          </ng-template>
          <ng-template appCell="observacion" let-m>
            <span class="text-slate-600 text-xs block max-w-xs truncate" [attr.title]="m.observaciones || m.referencia || null">{{ m.observaciones || m.referencia || '-' }}</span>
          </ng-template>
          <ng-template appCell="evidencia" let-m>
            <button
              *ngIf="getEvidenciaReajusteUrl(m) as evidenciaUrl"
              type="button"
              (click)="abrirZoomImagen(evidenciaUrl, tituloEvidenciaKardex(m))"
              class="text-xs font-bold text-easydry-blue hover:underline cursor-pointer bg-transparent border-0 p-0">
              Ver foto
            </button>
            <span *ngIf="!getEvidenciaReajusteUrl(m)">—</span>
          </ng-template>
        </app-data-table>
      </div>

      <!-- ============================================================== -->
      <!-- TAB 6: ALERTAS DE REABASTECIMIENTO                             -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'alertas_reabastecimiento'" class="space-y-6 animate-fade-in">

        <!-- ============================================================== -->
        <!-- BANDEJA DE ALERTAS DE STOCK BAJO EN SUCURSALES                 -->
        <!-- ============================================================== -->
        <div class="space-y-4">
          <div class="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-amber-500/10 border border-rose-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div class="flex items-start gap-3.5">
              <div class="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-200 shrink-0">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-6 h-6"></i-lucide>
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-extrabold text-slate-900 font-outfit">
                    {{ operaDesdeAgencia ? 'Alertas de Stock Bajo de mi Sede' : 'Alertas de Stock Bajo emitidas por Sucursales' }}
                  </h3>
                  <span *ngIf="ambitoGlobal" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                    <i-lucide aria-hidden="true" name="globe" class="w-3 h-3 text-blue-700"></i-lucide>
                    <span>Red Nacional Completa · Ver Todo de Todos</span>
                  </span>
                  <span *ngIf="operaBodegaPropia" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                    <i-lucide aria-hidden="true" name="map-pin" class="w-3 h-3 text-purple-700"></i-lucide>
                    <span>Región {{ userRegionDisplay }} · Solo Sucursales de tu Región</span>
                  </span>
                  <span *ngIf="operaDesdeAgencia" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
                    <i-lucide aria-hidden="true" name="building-2" class="w-3 h-3 text-teal-700"></i-lucide>
                    <span>Solo mi sede · {{ miAgenciaNombre || 'Agencia asignada' }}</span>
                  </span>
                </div>
                <p class="text-xs text-slate-600 mt-1">
                  {{ ambitoGlobal
                    ? 'Monitoreo consolidado de alertas de desabastecimiento generadas por todas las sedes del país.'
                    : (operaDesdeAgencia
                      ? 'Solo alertas generadas o asociadas a tu sucursal. No verás alertas de otras sedes ni de Bodega Central.'
                      : 'Alertas generadas por consumo o déficit exclusivamente de las sedes de tu región asignada.') }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 self-end md:self-center shrink-0">
              <span class="px-3 py-1.5 rounded-xl font-mono text-xs font-extrabold bg-white text-rose-700 border border-rose-200 shadow-2xs">
                {{ alertasTabla.resumen?.activas ?? 0 }} alerta(s) activa(s)
              </span>
              <button
                (click)="cargarAlertasStock(true)"
                class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs transition cursor-pointer"
                title="Actualizar alertas" aria-label="Actualizar alertas">
                <i-lucide aria-hidden="true" name="refresh-cw" class="w-4 h-4" [ngClass]="{ 'animate-spin': cargandoAlertasStock }"></i-lucide>
              </button>
            </div>
          </div>

          <!-- Filtros de la Bandeja de Alertas -->
          <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs">
            <div class="flex flex-wrap items-center gap-2 flex-1">
              <select
                [(ngModel)]="filtroAlertaNivel"
                aria-label="Filtrar por nivel de alerta"
                (ngModelChange)="reiniciarAlertas()"
                class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-rose-500 text-slate-700">
                <option value="">Todos los Niveles</option>
                <option value="CRITICO">Crítico / Agotado</option>
                <option value="BAJO">Bajo Mínimo</option>
              </select>
            </div>
          </div>

          <!-- Tabla de Alertas de Sucursales: páginas numeradas, orden, búsqueda y filtros en el servidor -->
          <app-data-table
            [serverSide]="true"
            [columns]="columnasAlertas"
            [data]="alertasTabla.filas"
            [total]="alertasTabla.total"
            [page]="alertasTabla.pagina"
            [pageSize]="alertasTabla.pageSize"
            [sortField]="alertasTabla.sortField"
            [sortOrder]="alertasTabla.sortOrder"
            [loading]="alertasTabla.cargando"
            [error]="alertasTabla.error"
            maxHeight="none"
            caption="Alertas de stock bajo"
            searchPlaceholder="Buscar por sucursal, insumo o detalle..."
            [emptyTitle]="mensajeSinAlertas"
            emptyHint="Prueba ajustando los filtros o el texto de búsqueda."
            (queryChange)="alertasTabla.alCambiar($event)"
            (reintentar)="alertasTabla.cargar(true)">

            <ng-template appCell="sede" let-a>
              <div class="font-bold text-slate-800" *ngIf="a.pulidor">Kit · {{ a.pulidor.name }} {{ a.pulidor.lastname }}</div>
              <div class="font-bold text-slate-800" *ngIf="!a.pulidor">{{ a.agencia?.nombre || 'Bodega Central' }}</div>
              <span *ngIf="a.agencia?.region" class="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 mt-0.5 inline-block">
                {{ a.agencia.region }}
              </span>
            </ng-template>

            <ng-template appCell="insumo" let-a>
              <div class="font-bold text-slate-900">{{ a.insumo?.nombre || 'Insumo' }}</div>
              <span class="font-mono text-xs text-slate-500">{{ a.insumo?.codigoSKU }}</span>
            </ng-template>

            <ng-template appCell="nivel" let-a>
              <span
                class="px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 border whitespace-nowrap"
                [ngClass]="(a.nivel === 'CRITICO' || a.nivel === 'AGOTADO') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'">
                <i-lucide aria-hidden="true" [name]="(a.nivel === 'CRITICO' || a.nivel === 'AGOTADO') ? 'alert-triangle' : 'alert-circle'" class="w-3.5 h-3.5"></i-lucide>
                <span>{{ (a.nivel === 'CRITICO' || a.nivel === 'AGOTADO') ? 'Crítico / Agotado' : 'Bajo Mínimo' }}</span>
              </span>
            </ng-template>

            <ng-template appCell="mensaje" let-a>
              <span class="block max-w-xs text-slate-700 font-medium">{{ a.mensaje || 'Nivel de existencias por debajo del umbral mínimo configurado.' }}</span>
            </ng-template>

            <ng-template appCell="fecha" let-a>
              <span class="whitespace-nowrap font-mono text-slate-500 text-xs">{{ a.createdAt | date:'short' }}</span>
            </ng-template>

            <ng-template appCell="estado" let-a>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase"
                [ngClass]="a.estado === 'RESUELTO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'">
                {{ a.estado || 'PENDIENTE' }}
              </span>
            </ng-template>

            <ng-template appCell="acciones" let-a>
              <div class="flex items-center justify-end gap-1.5 whitespace-nowrap">
                <button
                  type="button"
                  *ngIf="(puedeDespacharAgencia || puedeDespacharPulidor) && (a.agencia || a.pulidor)"
                  (click)="abrirDespachoDesdeAlerta(a)"
                  class="px-2.5 py-1 rounded-lg bg-easydry-blue hover:bg-blue-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer inline-flex items-center gap-1">
                  <i-lucide aria-hidden="true" name="truck" class="w-3 h-3"></i-lucide>
                  <span>Despachar</span>
                </button>
                <button
                  type="button"
                  *ngIf="puedeAtenderAlertas && a.estado !== 'RESUELTO'"
                  (click)="resolverAlerta(a)"
                  class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 cursor-pointer inline-flex items-center gap-1">
                  <i-lucide aria-hidden="true" name="check" class="w-3 h-3"></i-lucide>
                  <span>Atendida</span>
                </button>
              </div>
            </ng-template>
          </app-data-table>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- TAB 5: STOCK BAJO (Déficit y reposición física)                -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'stock_bajo'" class="space-y-6 animate-fade-in">

        <!-- Header explicativo de Stock Bajo -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold mb-2">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-3.5 h-3.5 text-rose-600"></i-lucide>
                <span>Déficit de Inventario y Reposición Física</span>
              </div>
              <h2 class="text-xl font-extrabold text-slate-900 font-outfit">
                {{ operaDesdeAgencia ? 'Insumos Bajo Mínimo en mi Sede' : 'Insumos con Stock Bajo / Déficit' }}
              </h2>
              <p class="text-slate-500 text-xs mt-1 max-w-3xl">
                {{ operaDesdeAgencia
                  ? 'Listado de insumos críticos que se encuentran por debajo del nivel mínimo operativo en tu sede según los servicios asignados.'
                  : 'Monitoreo de productos cuyo stock actual en bodega está por debajo del umbral mínimo de seguridad establecido para reposición.' }}
              </p>
            </div>

            <div class="flex items-center gap-2.5 flex-wrap">
              <button
                (click)="cargarStockBajo()"
                class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                <i-lucide aria-hidden="true" name="refresh-cw" class="w-3.5 h-3.5"></i-lucide>
                <span>Actualizar</span>
              </button>
              <button
                *ngIf="puedeRegistrarIngreso"
                (click)="abrirModalEntrada()"
                class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm">
                <i-lucide aria-hidden="true" name="plus" class="w-3.5 h-3.5"></i-lucide>
                <span>Abastecer Productos</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ============================================================== -->
        <!-- SECCIÓN: INSUMOS BAJO MÍNIMO EN BODEGA (solo bodega/admin)    -->
        <!-- ============================================================== -->
        <div *ngIf="puedeVerStockBajoBodegaCentral" class="space-y-4">
          <div class="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                <i-lucide aria-hidden="true" name="package-x" class="w-5 h-5"></i-lucide>
              </div>
              <div>
                <h3 class="text-sm font-bold text-rose-900">Insumos con Stock Bajo en Bodega</h3>
                <p class="text-xs text-rose-700">Productos cuyo stock es menor o igual al umbral mínimo de reposición establecido.</p>
              </div>
            </div>
            <button
              *ngIf="puedeRegistrarIngreso"
              (click)="abrirModalEntrada()"
              class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              <i-lucide aria-hidden="true" name="plus" class="w-4 h-4"></i-lucide>
              <span>Abastecer Productos</span>
            </button>
          </div>

          <app-data-table
            [serverSide]="true"
            [columns]="columnasStockBajo"
            [data]="stockBajoTabla.filas"
            [total]="stockBajoTabla.total"
            [page]="stockBajoTabla.pagina"
            [pageSize]="stockBajoTabla.pageSize"
            [sortField]="stockBajoTabla.sortField"
            [sortOrder]="stockBajoTabla.sortOrder"
            [loading]="stockBajoTabla.cargando"
            [error]="stockBajoTabla.error"
            [rowClass]="claseFilaStockBajo"
            maxHeight="none"
            caption="Insumos con stock bajo en bodega"
            searchPlaceholder="Buscar por SKU o nombre..."
            emptyTitle="¡Excelente! Todos los productos cuentan con existencias óptimas en bodega."
            emptyHint=""
            (queryChange)="stockBajoTabla.alCambiar($event)"
            (reintentar)="stockBajoTabla.cargar(true)">

            <ng-template appCell="sku" let-p><span class="font-mono font-bold text-slate-800">{{ p.codigoSKU }}</span></ng-template>
            <ng-template appCell="nombre" let-p><span class="font-bold text-slate-900">{{ p.nombre }}</span></ng-template>
            <ng-template appCell="tipo" let-p><span>{{ p.tipoProducto?.nombre || 'General' }}</span></ng-template>
            <ng-template appCell="contenido" let-p>
              <span class="font-mono font-bold text-slate-700 whitespace-nowrap">{{ (p.contenidoNeto || 1) | number:'1.0-2' }} {{ p.unidadMedida }}</span>
            </ng-template>
            <ng-template appCell="stockUnidades" let-p>
              <span class="px-2.5 py-1 rounded-md font-mono font-bold text-xs bg-rose-50 text-rose-700 border border-rose-200 inline-block whitespace-nowrap">
                {{ getStockEnUnidades(p.stockActual, p.contenidoNeto) | number:'1.0-2' }} und
              </span>
            </ng-template>
            <ng-template appCell="stock" let-p>
              <span class="font-mono font-bold text-rose-600 whitespace-nowrap">{{ p.stockActual | number:'1.0-2' }} {{ p.unidadMedida }}</span>
            </ng-template>
            <ng-template appCell="minimo" let-p>
              <div class="font-mono text-slate-600 whitespace-nowrap">
                <b>{{ getStockEnUnidades(p.stockMinimoBodega, p.contenidoNeto) | number:'1.0-2' }} und</b>
                <span class="text-xs text-slate-500 block">({{ (p.stockMinimoBodega || 0) | number:'1.0-2' }} {{ p.unidadMedida }})</span>
              </div>
            </ng-template>
            <ng-template appCell="deficit" let-p>
              <div class="font-mono font-bold text-rose-700 whitespace-nowrap">
                <b>-{{ getStockEnUnidades(((p.stockMinimoBodega || 0) - p.stockActual), p.contenidoNeto) | number:'1.0-2' }} und</b>
                <span class="text-xs text-rose-500 block">(-{{ ((p.stockMinimoBodega || 0) - p.stockActual) | number:'1.0-2' }} {{ p.unidadMedida }})</span>
              </div>
            </ng-template>
            <ng-template appCell="acciones" let-p>
              <button
                type="button"
                (click)="seleccionarParaEntrada(p)"
                class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer">
                Ingresar Stock
              </button>
            </ng-template>
          </app-data-table>
        </div>

        <!-- Líder / Asistente: stock bajo operativo de su alcance (no Bodega Central) -->
        <div *ngIf="operaDesdeAgencia && insumosBajosMiSede.length > 0" class="space-y-4 pt-4 border-t border-slate-200">
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <i-lucide aria-hidden="true" name="package-x" class="w-5 h-5"></i-lucide>
            </div>
            <div>
              <h3 class="text-sm font-bold text-amber-900">Insumos bajo mínimo en mi sede</h3>
              <p class="text-xs text-amber-800">Validados contra los servicios asignados a tu sucursal (excluye “No necesario”).</p>
            </div>
          </div>
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-600">
                <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th scope="col" class="py-3 px-4">SKU</th>
                    <th scope="col" class="py-3 px-4">Producto</th>
                    <th scope="col" class="py-3 px-4">Stock und</th>
                    <th scope="col" class="py-3 px-4">Estado</th>
                    <th scope="col" class="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngFor="let item of insumosBajosPagina" class="hover:bg-amber-50/40 transition">
                    <td class="p-3.5 font-mono font-bold">{{ item.codigoSKU }}</td>
                    <td class="p-3.5 font-bold text-slate-900">{{ item.nombre }}</td>
                    <td class="p-3.5 font-mono">
                      {{ getStockEnUnidades(item.stockActual, item.contenidoNeto) | number:'1.0-2' }} und
                    </td>
                    <td class="p-3.5">
                      <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                        [ngClass]="item.estado === 'AGOTADO' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'">
                        {{ getLabelEstadoInsumoServicio(item.estado) }}
                      </span>
                    </td>
                    <td class="p-3.5 text-right">
                      <button
                        *ngIf="puedeCrearAlerta"
                        (click)="solicitarReabastecimiento(item)"
                        class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                        Pedir Reabastecimiento
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <app-pagination
              [totalItems]="insumosBajosMiSede.length"
              [currentPage]="paginaBajosSede"
              [pageSize]="pageSizeBajosSede"
              (pageChange)="paginaBajosSede = $event"
              (pageSizeChange)="pageSizeBajosSede = $event; paginaBajosSede = 1">
            </app-pagination>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- TAB 5: CONFIGURACIÓN DINÁMICA (TIPOS Y UNIDADES)               -->
      <!-- ============================================================== -->
      <div *ngIf="activeTab === 'configuracion'" class="space-y-6 animate-fade-in">
        <!-- Subpestañas de Configuración -->
        <div class="flex items-center gap-3 border-b border-slate-200 pb-2">
          <button
            (click)="cambiarSubTabConfig('tipos')"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            [ngClass]="subTabConfig === 'tipos' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
            Tipos de Producto
          </button>
          <button
            (click)="cambiarSubTabConfig('unidades')"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            [ngClass]="subTabConfig === 'unidades' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
            Unidades de Medida
          </button>
        </div>

        <!-- 5.1 Sub-tab Tipos de Producto -->
        <div *ngIf="subTabConfig === 'tipos'" class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-800">Catálogo de Tipos de Producto</h3>
              <p class="text-xs text-slate-500">Administre tipos de insumo como Líquido, Polvo, Unidad, Gel, Espuma, etc. sin modificar código.</p>
            </div>
            <button
              (click)="abrirModalTipoProducto()"
              class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer">
              <i-lucide aria-hidden="true" name="plus" class="w-3.5 h-3.5"></i-lucide>
              <span>Nuevo Tipo</span>
            </button>
          </div>

          <app-data-table
            [serverSide]="true"
            [columns]="columnasTipos"
            [data]="tiposTabla.filas"
            [total]="tiposTabla.total"
            [page]="tiposTabla.pagina"
            [pageSize]="tiposTabla.pageSize"
            [sortField]="tiposTabla.sortField"
            [sortOrder]="tiposTabla.sortOrder"
            [loading]="tiposTabla.cargando"
            [error]="tiposTabla.error"
            maxHeight="none"
            caption="Tipos de producto"
            searchPlaceholder="Buscar por código, nombre o descripción..."
            emptyTitle="No hay tipos de producto que coincidan."
            (queryChange)="tiposTabla.alCambiar($event)"
            (reintentar)="tiposTabla.cargar(true)">
            <ng-template appCell="codigo" let-t><span class="font-mono font-bold text-slate-800">{{ t.codigo }}</span></ng-template>
            <ng-template appCell="nombre" let-t><span class="font-bold text-slate-900">{{ t.nombre }}</span></ng-template>
            <ng-template appCell="descripcion" let-t><span class="text-slate-500">{{ t.descripcion || '-' }}</span></ng-template>
            <ng-template appCell="estado" let-t>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold" [ngClass]="t.estado === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                {{ t.estado === 1 ? 'Activo' : 'Inactivo' }}
              </span>
            </ng-template>
            <ng-template appCell="acciones" let-t>
              <div class="flex items-center justify-end gap-1">
                <button type="button" (click)="editarTipoProducto(t)" class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-purple-600 cursor-pointer" aria-label="Editar">
                  <i-lucide aria-hidden="true" name="pencil" class="w-3.5 h-3.5"></i-lucide>
                </button>
                <button type="button" (click)="toggleEstadoTipo(t)" class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-slate-100 cursor-pointer" [ngClass]="t.estado === 1 ? 'text-rose-500' : 'text-emerald-500'" [attr.aria-label]="t.estado === 1 ? 'Desactivar' : 'Activar'">
                  <i-lucide aria-hidden="true" [name]="t.estado === 1 ? 'x-circle' : 'check-circle'" class="w-3.5 h-3.5"></i-lucide>
                </button>
              </div>
            </ng-template>
          </app-data-table>
        </div>

        <!-- 5.2 Sub-tab Unidades de Medida -->
        <div *ngIf="subTabConfig === 'unidades'" class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-800">Catálogo de Unidades de Medida</h3>
              <p class="text-xs text-slate-500">Configuración de unidades base (Mililitro, Litro, Gramo, Unidad, etc.).</p>
            </div>
            <button
              (click)="abrirModalUnidad()"
              class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer">
              <i-lucide aria-hidden="true" name="plus" class="w-3.5 h-3.5"></i-lucide>
              <span>Nueva Unidad</span>
            </button>
          </div>

          <app-data-table
            [serverSide]="true"
            [columns]="columnasUnidades"
            [data]="unidadesTabla.filas"
            [total]="unidadesTabla.total"
            [page]="unidadesTabla.pagina"
            [pageSize]="unidadesTabla.pageSize"
            [sortField]="unidadesTabla.sortField"
            [sortOrder]="unidadesTabla.sortOrder"
            [loading]="unidadesTabla.cargando"
            [error]="unidadesTabla.error"
            maxHeight="none"
            caption="Unidades de medida"
            searchPlaceholder="Buscar por código, nombre o símbolo..."
            emptyTitle="No hay unidades de medida que coincidan."
            (queryChange)="unidadesTabla.alCambiar($event)"
            (reintentar)="unidadesTabla.cargar(true)">
            <ng-template appCell="codigo" let-u><span class="font-mono font-bold text-slate-800">{{ u.codigo }}</span></ng-template>
            <ng-template appCell="nombre" let-u><span class="font-bold text-slate-900">{{ u.nombre }}</span></ng-template>
            <ng-template appCell="simbolo" let-u><span class="font-mono font-bold text-easydry-blue">{{ u.simbolo }}</span></ng-template>
            <ng-template appCell="tipo" let-u><span class="text-slate-500">{{ u.tipo }}</span></ng-template>
            <ng-template appCell="factorBase" let-u><span class="font-mono text-slate-600">{{ u.factorBase || 1 }}</span></ng-template>
            <ng-template appCell="estado" let-u>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold" [ngClass]="u.estado === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                {{ u.estado === 1 ? 'Activo' : 'Inactivo' }}
              </span>
            </ng-template>
            <ng-template appCell="acciones" let-u>
              <div class="flex items-center justify-end gap-1">
                <button type="button" (click)="editarUnidad(u)" class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-purple-600 cursor-pointer" aria-label="Editar">
                  <i-lucide aria-hidden="true" name="pencil" class="w-3.5 h-3.5"></i-lucide>
                </button>
                <button type="button" (click)="toggleEstadoUnidad(u)" class="inline-flex items-center justify-center min-w-9 min-h-9 rounded-lg hover:bg-slate-100 cursor-pointer" [ngClass]="u.estado === 1 ? 'text-rose-500' : 'text-emerald-500'" [attr.aria-label]="u.estado === 1 ? 'Desactivar' : 'Activar'">
                  <i-lucide aria-hidden="true" [name]="u.estado === 1 ? 'x-circle' : 'check-circle'" class="w-3.5 h-3.5"></i-lucide>
                </button>
              </div>
            </ng-template>
          </app-data-table>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: REGISTRAR ENTRADA DE STOCK                              -->
      <!-- ============================================================== -->
      <div *ngIf="modalEntradaAbierto" appModalPortal role="dialog" aria-modal="true" aria-labelledby="inv-modal-titulo-1" class="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90dvh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
          <div class="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <i-lucide aria-hidden="true" name="plus-circle" class="w-5 h-5"></i-lucide>
              </div>
              <h3 id="inv-modal-titulo-1" class="text-base font-bold text-slate-900 truncate">{{ productoEntradaFijo?.nombre || 'Registrar Entrada de Inventario' }}</h3>
            </div>
            <button (click)="cerrarModalEntrada()" class="text-slate-500 hover:text-slate-600 cursor-pointer shrink-0" aria-label="Cerrar">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 text-xs">
            <div *ngIf="formEntrada.bodegaId || bodegaSeleccionada" class="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-easydry-blue font-bold flex items-center gap-2">
              <i-lucide aria-hidden="true" name="warehouse" class="w-3.5 h-3.5 shrink-0"></i-lucide>
              <span>Destino del ingreso: <b>Bodega Central Nacional</b> (única que admite compras/ingresos)</span>
            </div>
            <!-- Insumo Fijo (Bloqueado) si viene preseleccionado -->
            <div *ngIf="productoEntradaFijo" class="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div class="flex items-center gap-2.5 truncate mr-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <i-lucide aria-hidden="true" name="package" class="w-4 h-4"></i-lucide>
                </div>
                <div class="truncate">
                  <p class="font-extrabold text-slate-900 text-xs truncate">{{ productoEntradaFijo.nombre }}</p>
                  <span class="text-xs font-mono text-emerald-900/80 block">
                    SKU: {{ productoEntradaFijo.codigoSKU }} | Unidad: {{ productoEntradaFijo.unidadMedida || 'u' }}
                  </span>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-200/80 text-emerald-900 border border-emerald-300 shrink-0">
                Insumo Fijo (Bloqueado)
              </span>
            </div>

            <!-- Buscador y selector normal SOLO si no viene fijo -->
            <div *ngIf="!productoEntradaFijo" class="space-y-4">
              <!-- Buscador de Producto / Insumo -->
              <div>
                <label for="inv-f3" class="block font-bold text-slate-700 mb-1">Buscar Producto / Insumo</label>
                <div class="relative flex items-center">
                  <span class="absolute left-3 inset-y-0 flex items-center pointer-events-none text-slate-400">
                    <i-lucide aria-hidden="true" name="search" class="w-4 h-4"></i-lucide>
                  </span>
                  <input id="inv-f3"
                    type="text"
                    [(ngModel)]="busquedaProductoEntrada"
                    (input)="filtrarProductosEntrada()"
                    placeholder="Buscar por código SKU o nombre de producto..."
                    class="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-easydry-blue" />
                  <button
                    *ngIf="busquedaProductoEntrada"
                    (click)="busquedaProductoEntrada = ''; filtrarProductosEntrada()"
                    class="absolute right-3 inset-y-0 flex items-center text-slate-500 hover:text-slate-600 cursor-pointer" aria-label="Cerrar">
                    <i-lucide aria-hidden="true" name="x" class="w-4 h-4"></i-lucide>
                  </button>
                </div>
              </div>

              <!-- Selector de Producto / Insumo -->
              <div>
                <label for="inv-f4" class="block font-bold text-slate-700 mb-1">Producto / Insumo Seleccionado *</label>
                <select id="inv-f4"
                  [(ngModel)]="formEntrada.insumoId"
                  (change)="alCambiarProductoEntrada()"
                  class="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue">
                  <option value="">Seleccione un producto...</option>
                  <option *ngFor="let p of productosEntradaFiltrados" [value]="p.id">
                    {{ p.nombre }} (SKU: {{ p.codigoSKU }}) — Stock: {{ getStockEnUnidades(p.stockActual, p.contenidoNeto) | number:'1.0-2' }} und ({{ p.stockActual | number:'1.0-2' }} {{ p.unidadMedida }})
                  </option>
                </select>
                <p *ngIf="productosEntradaFiltrados.length === 0" class="text-xs text-amber-600 mt-1">
                  No se encontraron productos que coincidan con la búsqueda.
                </p>
              </div>
            </div>

            <!-- Ficha informativa de contenido del producto -->
            <div *ngIf="productoEntradaSeleccionado" class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-slate-600">Contenido por Unidad / Envase:</span>
                <span class="font-bold font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {{ (productoEntradaSeleccionado.contenidoNeto || 1) | number:'1.0-2' }} {{ productoEntradaSeleccionado.unidadMedida }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 pt-1.5 border-t border-slate-200/60">
                <span>Existencias actuales:</span>
                <span class="font-bold text-slate-800">
                  {{ getStockEnUnidades(productoEntradaSeleccionado.stockActual, productoEntradaSeleccionado.contenidoNeto) | number:'1.0-2' }} und
                  <span class="text-slate-500 font-normal">({{ productoEntradaSeleccionado.stockActual | number:'1.0-2' }} {{ productoEntradaSeleccionado.unidadMedida }})</span>
                </span>
              </div>
            </div>

            <!-- Cantidad de Unidades a Ingresar -->
            <div>
              <label for="inv-f5" class="block font-bold text-slate-700 mb-1">
                Cantidad de Unidades / Envases a Ingresar *
              </label>
              <div class="relative">
                <input id="inv-f5"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="formEntrada.cantidadUnidades"
                  (input)="calcularPreviewEntrada()"
                  placeholder="ej. 5"
                  class="w-full p-2.5 pr-24 rounded-xl border border-slate-200 focus:outline-none focus:border-easydry-blue font-mono text-base font-bold text-slate-800" />
                <span class="absolute right-3 top-2.5 text-xs font-bold text-slate-500">
                  unidades
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-1">
                El ingreso siempre se registra por unidades físicas del producto (bidones, cajas, frascos, piezas), sin importar si es líquido, polvo o unitario.
              </p>
            </div>

            <!-- Observaciones -->
            <div>
              <label for="inv-f6" class="block font-bold text-slate-700 mb-1">Observaciones</label>
              <input id="inv-f6"
                type="text"
                [(ngModel)]="formEntrada.observaciones"
                placeholder="Detalles del ingreso o notas adicionales"
                class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-easydry-blue" />
            </div>

            <!-- Evidencia Fotográfica de Entrada (Estilo Dropzone) -->
            <div class="space-y-1.5 pt-1">
              <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">Evidencia Fotográfica de Entrada</label>
              
              <div class="relative w-full border-2 border-dashed border-emerald-300 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-emerald-50/50 transition-colors cursor-pointer"
                   (click)="imageEntradaInput.click()">
                <input 
                  #imageEntradaInput
                  type="file" 
                  accept="image/*" 
                  class="hidden"
                  (change)="onImagenEntradaSeleccionada($event)">
                
                <div *ngIf="imagenEntradaPreview" class="relative w-full flex flex-col items-center justify-center">
                  <img loading="lazy" decoding="async" [src]="imagenEntradaPreview" [appVerMedia]="imagenEntradaPreview" appVerMediaTitulo="Evidencia de entrada" alt="Evidencia de Entrada" class="max-h-36 rounded-lg object-contain border border-emerald-200 mb-2 shadow-xs" />
                  <div class="flex items-center gap-2 text-emerald-800">
                    <i-lucide aria-hidden="true" name="check-circle-2" class="w-4 h-4"></i-lucide>
                    <span class="text-xs font-bold">{{ imagenEntradaNombre || 'Evidencia cargada' }}</span>
                  </div>
                  <div class="flex items-center gap-3 mt-2">
                    <span class="text-xs text-slate-500 hover:underline">Toca para cambiar la imagen</span>
                    <button type="button" (click)="$event.stopPropagation(); eliminarImagenEntrada()" class="text-xs font-bold text-rose-600 hover:underline">Eliminar foto</button>
                  </div>
                </div>

                <div *ngIf="!imagenEntradaPreview" class="flex flex-col items-center justify-center">
                  <div class="p-3 bg-emerald-100/80 text-emerald-700 rounded-full mb-2">
                    <i-lucide aria-hidden="true" name="camera" class="w-6 h-6"></i-lucide>
                  </div>
                  <p class="text-xs font-bold text-slate-700 text-center">Toca para capturar o subir evidencia del ingreso</p>
                  <p class="text-xs text-slate-500 text-center mt-1">Foto de factura, guía de remisión o producto recibido</p>
                </div>
              </div>
            </div>

            <!-- Vista Previa de Cálculo Dinámico (Unidades + Contenido Total) -->
            <div *ngIf="previewEntradaCantidadBase > 0 && productoEntradaSeleccionado" class="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Ingreso en Unidades Físicas:</span>
                  <span class="text-base font-extrabold text-emerald-700 font-mono">
                    +{{ formEntrada.cantidadUnidades | number:'1.0-2' }} und
                  </span>
                </div>
                <div class="text-right">
                  <span class="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Contenido Total Equivalente:</span>
                  <span class="text-base font-extrabold text-emerald-700 font-mono">
                    +{{ previewEntradaCantidadBase | number:'1.0-2' }} {{ productoEntradaSeleccionado.unidadMedida }}
                  </span>
                </div>
              </div>
              <div class="border-t border-emerald-200/80 pt-2 flex items-center justify-between text-xs text-emerald-800">
                <span>Nuevo Stock Resultante Estimado:</span>
                <span class="font-extrabold font-mono">
                  {{ (getStockEnUnidades(productoEntradaSeleccionado.stockActual, productoEntradaSeleccionado.contenidoNeto) + (formEntrada.cantidadUnidades || 0)) | number:'1.0-2' }} und
                  <span class="font-medium text-emerald-700">({{ ((productoEntradaSeleccionado.stockActual || 0) + previewEntradaCantidadBase) | number:'1.0-2' }} {{ productoEntradaSeleccionado.unidadMedida }})</span>
                </span>
              </div>
            </div>
          </div>

          <div class="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              (click)="cerrarModalEntrada()"
              class="btn-secondary w-full sm:w-auto">
              Cancelar
            </button>
            <button
              (click)="guardarEntrada()"
              [disabled]="guardandoMovimiento"
              class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center">
              <i-lucide aria-hidden="true" *ngIf="!guardandoMovimiento" name="check" class="w-4 h-4"></i-lucide>
              <span>{{ guardandoMovimiento ? 'Procesando...' : 'Confirmar Ingreso' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: REAJUSTE DE STOCK (auditoría + foto S3)                 -->
      <!-- ============================================================== -->
      <div *ngIf="modalReajusteAbierto" appModalPortal role="dialog" aria-modal="true" aria-labelledby="inv-modal-titulo-2" class="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90dvh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
          <div class="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <i-lucide aria-hidden="true" name="sliders" class="w-5 h-5"></i-lucide>
              </div>
              <div class="min-w-0">
                <h3 id="inv-modal-titulo-2" class="text-base font-bold text-slate-900 truncate">Reajuste de stock</h3>
                <p class="text-xs text-slate-500 truncate">{{ itemReajuste?.nombre }} · {{ itemReajuste?.ubicacionLabel }}</p>
              </div>
            </div>
            <button (click)="cerrarModalReajuste()" [disabled]="guardandoReajuste" class="text-slate-500 hover:text-slate-600 cursor-pointer shrink-0" aria-label="Cerrar">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div class="flex justify-between gap-3">
                <span class="text-slate-500 font-bold">SKU</span>
                <span class="font-mono font-extrabold text-slate-800">{{ itemReajuste?.codigoSKU }}</span>
              </div>
              <div class="flex justify-between gap-3 mt-1.5">
                <span class="text-slate-500 font-bold">Stock actual</span>
                <span class="font-mono font-extrabold text-slate-800 text-right">
                  {{ getStockEnUnidades(itemReajuste?.stockActual, reajusteContenidoNeto) | number:'1.0-2' }} und
                  <span class="block text-xs font-bold text-slate-500">
                    {{ itemReajuste?.stockActual | number:'1.0-2' }} {{ itemReajuste?.unidad }}
                  </span>
                </span>
              </div>
              <div *ngIf="puedeElegirModoReajuste" class="flex justify-between gap-3 mt-1.5">
                <span class="text-slate-500 font-bold">Contenido x envase</span>
                <span class="font-mono font-extrabold text-slate-800">{{ reajusteContenidoNeto | number:'1.0-2' }} {{ itemReajuste?.unidad }}</span>
              </div>
            </div>

            <div *ngIf="puedeElegirModoReajuste" class="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                (click)="cambiarModoReajuste('unidades')"
                class="flex-1 px-3 py-2 text-xs font-bold transition"
                [ngClass]="formReajuste.modo === 'unidades' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'">
                Por unidades
              </button>
              <button
                type="button"
                (click)="cambiarModoReajuste('cantidad')"
                class="flex-1 px-3 py-2 text-xs font-bold transition border-l border-slate-200"
                [ngClass]="formReajuste.modo === 'cantidad' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'">
                Por cantidad ({{ itemReajuste?.unidad }})
              </button>
            </div>

            <div>
              <label for="inv-f7" class="block text-xs font-bold text-slate-700 mb-1">
                {{ formReajuste.modo === 'unidades' ? 'Unidades contadas *' : 'Cantidad contada *' }}
              </label>
              <input id="inv-f7"
                type="number"
                min="0"
                [step]="formReajuste.modo === 'unidades' ? '1' : '0.01'"
                [(ngModel)]="formReajuste.cantidadContada"
                name="cantidadContadaReajuste"
                class="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                [placeholder]="formReajuste.modo === 'unidades' ? '0' : '0.00'" />
              <p class="mt-1 text-xs font-bold" [ngClass]="deltaReajuste === 0 ? 'text-slate-500' : (deltaReajuste > 0 ? 'text-emerald-700' : 'text-rose-700')">
                {{ deltaReajuste > 0 ? 'Aumento' : (deltaReajuste < 0 ? 'Disminución' : 'Sin cambio') }}:
                {{ deltaReajuste > 0 ? '+' : '' }}{{ getStockEnUnidades(deltaReajuste, reajusteContenidoNeto) | number:'1.0-2' }} und
                <span class="font-semibold">
                  ({{ deltaReajuste > 0 ? '+' : '' }}{{ deltaReajuste | number:'1.0-2' }} {{ itemReajuste?.unidad }})
                </span>
              </p>
            </div>

            <div>
              <label for="inv-f8" class="block text-xs font-bold text-slate-700 mb-1">Motivo *</label>
              <textarea id="inv-f8"
                [(ngModel)]="formReajuste.motivoTexto"
                name="motivoTextoReajuste"
                rows="3"
                placeholder="Escribe por qué aumentas o disminuyes este stock..."
                class="w-full p-2.5 rounded-xl border border-slate-200 text-sm"></textarea>
            </div>

            <app-image-uploader
              #reajusteUploader
              [(imageUrl)]="formReajuste.evidenciaUrl"
              [insumoId]="itemReajuste?.insumoId"
              [insumoNombre]="itemReajuste?.nombre"
              [agenciaId]="itemReajuste?.agenciaId || itemReajuste?.pulidorId || itemReajuste?.bodegaId || bodegaSeleccionadaId"
              label="Foto de evidencia del conteo"
              category="CATALOGO_INSUMOS"
              type="FOTO_AJUSTE_INVENTARIO"
              [required]="true">
            </app-image-uploader>
          </div>

          <div class="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              (click)="cerrarModalReajuste()"
              [disabled]="guardandoReajuste"
              class="btn-secondary w-full sm:w-auto disabled:opacity-50">
              Cancelar
            </button>
            <button
              (click)="guardarReajuste()"
              [disabled]="guardandoReajuste"
              class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center">
              <span>{{ guardandoReajuste ? 'Guardando...' : 'Confirmar reajuste' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: GESTIÓN DE PRESENTACIONES POR PRODUCTO                  -->
      <!-- ============================================================== -->
      <div *ngIf="modalPresentacionesAbierto" appModalPortal role="dialog" aria-modal="true" aria-labelledby="inv-modal-titulo-3" class="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90dvh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
          <div class="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
            <div class="min-w-0">
              <h3 id="inv-modal-titulo-3" class="text-base font-bold text-slate-900 truncate">Presentaciones del Producto</h3>
              <p class="text-xs text-slate-500 truncate">{{ productoPresentacionesSeleccionado?.nombre }} (Base: {{ productoPresentacionesSeleccionado?.unidadMedida }})</p>
            </div>
            <button (click)="modalPresentacionesAbierto = false" class="text-slate-500 hover:text-slate-600 cursor-pointer shrink-0" aria-label="Cerrar">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <!-- Formulario Agregar Presentación -->
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 mb-4 text-xs">
            <h4 class="font-bold text-slate-800">Agregar Nueva Presentación</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="inv-f9" class="block font-bold text-slate-700 mb-1">Nombre Presentación *</label>
                <input id="inv-f9"
                  type="text"
                  [(ngModel)]="nuevaPres.nombre"
                  placeholder="ej. Botella 1000 ml, Galón"
                  class="w-full p-2 rounded-lg border border-slate-200 bg-white" />
              </div>
              <div>
                <label for="inv-f10" class="block font-bold text-slate-700 mb-1">Unidad de Presentación *</label>
                <select id="inv-f10"
                  [(ngModel)]="nuevaPres.unidadId"
                  class="w-full p-2 rounded-lg border border-slate-200 bg-white">
                  <option value="">Seleccione unidad...</option>
                  <option *ngFor="let u of unidadesMedida" [value]="u.id">{{ u.nombre }} ({{ u.simbolo }})</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="inv-f11" class="block font-bold text-slate-700 mb-1">Cantidad *</label>
                <input id="inv-f11"
                  type="number"
                  [(ngModel)]="nuevaPres.cantidad"
                  placeholder="1"
                  class="w-full p-2 rounded-lg border border-slate-200 bg-white" />
              </div>
              <div>
                <label for="inv-f12" class="block font-bold text-slate-700 mb-1">Equivalente en Unidad Base *</label>
                <input id="inv-f12"
                  type="number"
                  [(ngModel)]="nuevaPres.factorAUnidadBase"
                  placeholder="ej. 1000 para 1 Litro en base ml"
                  class="w-full p-2 rounded-lg border border-slate-200 bg-white" />
              </div>
            </div>

            <div class="flex justify-end gap-2">
              <button
                *ngIf="presEditandoId"
                (click)="cancelarEdicionPresentacion()"
                class="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer">
                Cancelar
              </button>
              <button
                (click)="guardarNuevaPresentacion()"
                class="px-4 py-1.5 rounded-lg bg-easydry-blue text-white font-bold hover:bg-blue-700 transition cursor-pointer">
                {{ presEditandoId ? 'Actualizar Presentación' : 'Guardar Presentación' }}
              </button>
            </div>
          </div>

          <!-- Listado de Presentaciones Existentes -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold uppercase text-slate-500">Presentaciones Registradas</h4>
            <div *ngIf="presentacionesProductoActual.length === 0" class="text-center py-4 text-xs text-slate-500">
              No hay presentaciones registradas para este producto.
            </div>

            <div *ngFor="let pres of presentacionesProductoActual" class="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span class="font-bold text-slate-800 block">{{ pres.nombre }}</span>
                <span class="text-slate-500">
                  1 presentación = <b>{{ pres.factorAUnidadBase }} {{ productoPresentacionesSeleccionado?.unidadMedida }}</b>
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full text-xs font-bold" [ngClass]="pres.estado === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                  {{ pres.estado === 1 ? 'Activa' : 'Inactiva' }}
                </span>
                <button
                  (click)="iniciarEdicionPresentacion(pres)"
                  title="Editar"
                  class="p-1.5 min-w-8 min-h-8 inline-flex items-center justify-center text-slate-500 hover:text-easydry-blue hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" aria-label="Editar presentación">
                  <i-lucide aria-hidden="true" name="pencil" class="w-3.5 h-3.5"></i-lucide>
                </button>
                <button
                  (click)="toggleEstadoPresentacion(pres)"
                  [title]="pres.estado === 1 ? 'Desactivar' : 'Activar'"
                  class="p-1.5 min-w-8 min-h-8 inline-flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" [attr.aria-label]="pres.estado === 1 ? 'Desactivar presentación' : 'Activar presentación'">
                  <i-lucide aria-hidden="true" [name]="pres.estado === 1 ? 'toggle-right' : 'toggle-left'" class="w-3.5 h-3.5"></i-lucide>
                </button>
              </div>
            </div>
          </div>
          </div>

          <div class="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              (click)="modalPresentacionesAbierto = false"
              class="btn-secondary w-full sm:w-auto">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: CREAR / EDITAR PRODUCTO                                 -->
      <!-- ============================================================== -->
      <app-modal size="lg"
        [isOpen]="modalProductoAbierto"
        [title]="editandoProducto ? 'Editar Insumo / Producto EasyDry' : 'Registrar Nuevo Insumo / Producto EasyDry'"
        icon="package"
        (close)="cerrarModalProducto()">
        
        <form (submit)="$event.preventDefault(); guardarProducto()" class="space-y-4">
          <div class="space-y-3 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="inv-f13" class="block font-bold text-slate-700 mb-1">Código SKU *</label>
                <input id="inv-f13"
                  type="text"
                  [(ngModel)]="formProducto.codigoSKU"
                  name="codigoSKU"
                  placeholder="ej. ALC-001"
                  class="w-full p-2.5 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label for="inv-f14" class="block font-bold text-slate-700 mb-1">Nombre del Insumo *</label>
                <input id="inv-f14"
                  type="text"
                  [(ngModel)]="formProducto.nombre"
                  name="nombreInsumo"
                  placeholder="ej. Alcohol Industrial 70%"
                  class="w-full p-2.5 rounded-xl border border-slate-200" />
              </div>
            </div>

            <!-- Categoría del Insumo -->
            <div>
              <label for="inv-f-categoria" class="block font-bold text-slate-700 mb-1">Categoría *</label>
              <select id="inv-f-categoria"
                [(ngModel)]="formProducto.categoria"
                name="categoria"
                class="w-full p-2.5 rounded-xl border border-slate-200 bg-white">
                <option value="">Seleccione categoría...</option>
                <option *ngFor="let c of CATEGORIAS_INSUMO" [value]="c.valor">{{ c.etiqueta }}</option>
              </select>
            </div>

            <!-- Tipo de Producto & Unidad Base -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="inv-f15" class="block font-bold text-slate-700 mb-1">Tipo de Producto *</label>
                <select id="inv-f15"
                  [(ngModel)]="formProducto.tipoProductoId"
                  name="tipoProductoId"
                  class="w-full p-2.5 rounded-xl border border-slate-200 bg-white">
                  <option value="">Seleccione tipo de producto...</option>
                  <option *ngFor="let t of tiposProducto" [value]="t.id">{{ t.nombre }}</option>
                </select>
              </div>

              <div>
                <label for="inv-f16" class="block font-bold text-slate-700 mb-1">Unidad Base de Inventario *</label>
                <select id="inv-f16"
                  [(ngModel)]="formProducto.unidadMedidaId"
                  name="unidadMedidaId"
                  class="w-full p-2.5 rounded-xl border border-slate-200 bg-white">
                  <option value="">Seleccione unidad base...</option>
                  <option *ngFor="let u of unidadesMedida" [value]="u.id">{{ u.nombre }} ({{ u.simbolo }})</option>
                </select>
              </div>
            </div>

            <!-- Cantidad en base a la unidad elegida -->
            <div>
              <label for="inv-f17" class="block font-bold text-slate-700 mb-1">
                Cantidad {{ getSimboloUnidadSeleccionada() ? 'en ' + getSimboloUnidadSeleccionada() : 'en Base a Unidad Seleccionada' }} *
              </label>
              <input id="inv-f17"
                type="number"
                min="0.001"
                step="any"
                [(ngModel)]="formProducto.contenidoNeto"
                name="contenidoNeto"
                placeholder="ej. 1, 1000, 3.78"
                class="w-full p-2.5 rounded-xl border border-slate-200" />
              <p class="text-xs text-slate-500 mt-1">
                Indique la cantidad del producto en función de la unidad de medida elegida.
              </p>
            </div>

            <!-- Stocks obligatorios (ingreso en unidades físicas; se guarda en cantidad base) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label for="inv-f18" class="block font-bold text-slate-700 mb-1">Stock Mín. Bodega *</label>
                <div class="relative">
                  <input id="inv-f18"
                    type="number"
                    min="1"
                    step="1"
                    [(ngModel)]="formProducto.stockMinimoBodega"
                    name="stockMinimoBodega"
                    placeholder="ej. 5"
                    required
                    class="w-full p-2.5 pr-14 rounded-xl border border-slate-200" />
                  <span class="absolute right-3 top-2.5 text-xs font-bold text-slate-500">und</span>
                </div>
                <p *ngIf="formProducto.stockMinimoBodega && formProducto.stockMinimoBodega > 0" class="text-xs text-slate-500 mt-1">
                  ≈ {{ getCantidadDesdeUnidades(formProducto.stockMinimoBodega, formProducto.contenidoNeto) | number:'1.0-2' }}
                  <span *ngIf="getSimboloUnidadSeleccionada()"> {{ getSimboloUnidadSeleccionada() }}</span>
                  <span *ngIf="!getSimboloUnidadSeleccionada()"> (cantidad base)</span>
                </p>
              </div>
              <div>
                <label for="inv-f19" class="block font-bold text-slate-700 mb-1">Stock Óptimo Bodega *</label>
                <div class="relative">
                  <input id="inv-f19"
                    type="number"
                    min="1"
                    step="1"
                    [(ngModel)]="formProducto.stockOptimoBodega"
                    name="stockOptimoBodega"
                    placeholder="ej. 20"
                    required
                    class="w-full p-2.5 pr-14 rounded-xl border border-slate-200" />
                  <span class="absolute right-3 top-2.5 text-xs font-bold text-slate-500">und</span>
                </div>
                <p *ngIf="formProducto.stockOptimoBodega && formProducto.stockOptimoBodega > 0" class="text-xs text-slate-500 mt-1">
                  ≈ {{ getCantidadDesdeUnidades(formProducto.stockOptimoBodega, formProducto.contenidoNeto) | number:'1.0-2' }}
                  <span *ngIf="getSimboloUnidadSeleccionada()"> {{ getSimboloUnidadSeleccionada() }}</span>
                  <span *ngIf="!getSimboloUnidadSeleccionada()"> (cantidad base)</span>
                </p>
              </div>
              <div>
                <label for="inv-f20" class="block font-bold text-slate-700 mb-1">Stock Mín. Agencia *</label>
                <div class="relative">
                  <input id="inv-f20"
                    type="number"
                    min="1"
                    step="1"
                    [(ngModel)]="formProducto.stockMinimoAgencia"
                    name="stockMinimoAgencia"
                    placeholder="ej. 2"
                    required
                    class="w-full p-2.5 pr-14 rounded-xl border border-slate-200" />
                  <span class="absolute right-3 top-2.5 text-xs font-bold text-slate-500">und</span>
                </div>
                <p *ngIf="formProducto.stockMinimoAgencia && formProducto.stockMinimoAgencia > 0" class="text-xs text-slate-500 mt-1">
                  ≈ {{ getCantidadDesdeUnidades(formProducto.stockMinimoAgencia, formProducto.contenidoNeto) | number:'1.0-2' }}
                  <span *ngIf="getSimboloUnidadSeleccionada()"> {{ getSimboloUnidadSeleccionada() }}</span>
                  <span *ngIf="!getSimboloUnidadSeleccionada()"> (cantidad base)</span>
                </p>
              </div>
              <div>
                <label for="inv-f21" class="block font-bold text-slate-700 mb-1">Stock Óptimo Agencia *</label>
                <div class="relative">
                  <input id="inv-f21"
                    type="number"
                    min="1"
                    step="1"
                    [(ngModel)]="formProducto.stockOptimoAgencia"
                    name="stockOptimoAgencia"
                    placeholder="ej. 5"
                    required
                    class="w-full p-2.5 pr-14 rounded-xl border border-slate-200" />
                  <span class="absolute right-3 top-2.5 text-xs font-bold text-slate-500">und</span>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  ≈ {{ getCantidadDesdeUnidades(formProducto.stockOptimoAgencia, formProducto.contenidoNeto) | number:'1.0-2' }}
                  <span *ngIf="getSimboloUnidadSeleccionada()"> {{ getSimboloUnidadSeleccionada() }}</span>
                  <span *ngIf="!getSimboloUnidadSeleccionada()"> (cantidad base)</span>
                </p>
              </div>
            </div>

            <!-- Estado Activo / Inactivo (edición) -->
            <div *ngIf="editandoProducto" class="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80">
              <div>
                <p class="text-xs font-bold text-slate-800">Estado del producto</p>
                <p class="text-xs text-slate-500">Desactivar conserva historial; no elimina el registro.</p>
              </div>
              <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                <span class="text-xs font-bold" [ngClass]="formProducto.estado === 1 ? 'text-emerald-600' : 'text-slate-500'">
                  {{ formProducto.estado === 1 ? 'Activo' : 'Inactivo' }}
                </span>
                <button
                  type="button"
                  (click)="formProducto.estado = formProducto.estado === 1 ? 0 : 1"
                  class="relative w-11 h-6 rounded-full transition-colors cursor-pointer"
                  [ngClass]="formProducto.estado === 1 ? 'bg-emerald-500' : 'bg-slate-300'"
                  [attr.aria-pressed]="formProducto.estado === 1">
                  <span
                    class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    [style.transform]="formProducto.estado === 1 ? 'translateX(1.25rem)' : 'translateX(0)'"></span>
                </button>
              </label>
            </div>

            <!-- Descripción -->
            <div>
              <label for="inv-f22" class="block font-bold text-slate-700 mb-1">Descripción</label>
              <textarea id="inv-f22"
                [(ngModel)]="formProducto.descripcion"
                name="descripcion"
                rows="2"
                placeholder="Detalles sobre uso, dosificación o almacenamiento..."
                class="w-full p-2.5 rounded-xl border border-slate-200"></textarea>
            </div>

            <!-- Imagen del Insumo / Producto con Componente Reutilizable S3 + Cámara + Encuadre Cuadrado -->
            <div class="pt-2">
              <app-image-uploader
                #imageUploader
                [(imageUrl)]="formProducto.imagenUrl"
                [insumoId]="formProducto.nombre || formProducto.codigoSKU || formProducto.id"
                [insumoNombre]="formProducto.nombre || formProducto.codigoSKU"
                label="Foto del Insumo / Producto"
                category="CATALOGO_INSUMOS"
                type="IMAGEN_PRODUCTO">
              </app-image-uploader>
            </div>
          </div>
        </form>

        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button
            type="button"
            (click)="cerrarModalProducto()"
            [disabled]="guardandoProducto"
            class="btn-secondary w-full sm:w-auto disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            (click)="guardarProducto()"
            [disabled]="guardandoProducto"
            class="px-5 py-2 rounded-xl bg-easydry-blue hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 w-full sm:w-auto justify-center">
            <i-lucide aria-hidden="true" *ngIf="guardandoProducto" name="loader" class="w-4 h-4 animate-spin"></i-lucide>
            <span>{{ guardandoProducto ? 'Guardando en S3 y BD...' : (editandoProducto ? 'Actualizar Producto' : 'Guardar Producto') }}</span>
          </button>
        </div>
      </app-modal>

      <!-- ============================================================== -->
      <!-- MODAL: CONFIGURAR TIPO DE PRODUCTO (CRUD DINÁMICO)             -->
      <!-- ============================================================== -->
      <div *ngIf="modalTipoAbierto" appModalPortal role="dialog" aria-modal="true" aria-labelledby="inv-modal-titulo-4" class="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 max-h-[90dvh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
          <div class="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
            <h3 id="inv-modal-titulo-4" class="text-base font-bold text-slate-900 truncate">{{ formTipo.id ? 'Editar Tipo de Producto' : 'Nuevo Tipo de Producto' }}</h3>
            <button (click)="modalTipoAbierto = false" class="text-slate-500 hover:text-slate-600 cursor-pointer shrink-0" aria-label="Cerrar">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3 text-xs">
            <div>
              <label for="inv-f23" class="block font-bold text-slate-700 mb-1">Código Único *</label>
              <input id="inv-f23"
                type="text"
                [(ngModel)]="formTipo.codigo"
                placeholder="ej. GEL, ESPUMA, LIQUIDO"
                class="w-full p-2.5 rounded-xl border border-slate-200 uppercase font-mono" />
            </div>
            <div>
              <label for="inv-f24" class="block font-bold text-slate-700 mb-1">Nombre Visual *</label>
              <input id="inv-f24"
                type="text"
                [(ngModel)]="formTipo.nombre"
                placeholder="ej. Gel Industrial, Espuma Activa"
                class="w-full p-2.5 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label for="inv-f25" class="block font-bold text-slate-700 mb-1">Descripción</label>
              <textarea id="inv-f25"
                [(ngModel)]="formTipo.descripcion"
                rows="2"
                placeholder="Descripción opcional..."
                class="w-full p-2.5 rounded-xl border border-slate-200"></textarea>
            </div>
          </div>

          <div class="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button (click)="modalTipoAbierto = false" class="btn-secondary w-full sm:w-auto">
              Cancelar
            </button>
            <button (click)="guardarTipoProducto()" class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer w-full sm:w-auto justify-center">
              Guardar Tipo
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: CONFIGURAR UNIDAD DE MEDIDA (CRUD DINÁMICO)             -->
      <!-- ============================================================== -->
      <div *ngIf="modalUnidadAbierto" appModalPortal role="dialog" aria-modal="true" aria-labelledby="inv-modal-titulo-5" class="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90dvh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
          <div class="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
            <h3 id="inv-modal-titulo-5" class="text-base font-bold text-slate-900 truncate">{{ formUnidad.id ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida' }}</h3>
            <button (click)="modalUnidadAbierto = false" class="text-slate-500 hover:text-slate-600 cursor-pointer shrink-0" aria-label="Cerrar">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="inv-f26" class="block font-bold text-slate-700 mb-1">Código *</label>
                <input id="inv-f26"
                  type="text"
                  [(ngModel)]="formUnidad.codigo"
                  placeholder="ej. ML, L, KG"
                  class="w-full p-2.5 rounded-xl border border-slate-200 uppercase font-mono" />
              </div>
              <div>
                <label for="inv-f27" class="block font-bold text-slate-700 mb-1">Símbolo *</label>
                <input id="inv-f27"
                  type="text"
                  [(ngModel)]="formUnidad.simbolo"
                  placeholder="ej. ml, L, g"
                  class="w-full p-2.5 rounded-xl border border-slate-200 font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="inv-f28" class="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input id="inv-f28"
                  type="text"
                  [(ngModel)]="formUnidad.nombre"
                  placeholder="ej. Mililitro, Litro"
                  class="w-full p-2.5 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label for="inv-f29" class="block font-bold text-slate-700 mb-1">Familia / Tipo *</label>
                <input id="inv-f29"
                  type="text"
                  [(ngModel)]="formUnidad.tipo"
                  placeholder="VOLUMEN, MASA, UNITARIO"
                  class="w-full p-2.5 rounded-xl border border-slate-200 uppercase" />
              </div>
            </div>

            <div>
              <label for="inv-f30" class="block font-bold text-slate-700 mb-1">Factor a Unidad Base de Familia</label>
              <input id="inv-f30"
                type="number"
                step="any"
                [(ngModel)]="formUnidad.factorBase"
                placeholder="ej. 0.001 para ml a Litro"
                class="w-full p-2.5 rounded-xl border border-slate-200" />
            </div>
          </div>

          <div class="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button (click)="modalUnidadAbierto = false" class="btn-secondary w-full sm:w-auto">
              Cancelar
            </button>
            <button (click)="guardarUnidadMedida()" class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer w-full sm:w-auto justify-center">
              Guardar Unidad
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: RECHAZAR DESPACHO DE SUMINISTROS (NO LLEGÓ / ANOMALÍA)  -->
      <!-- ============================================================== -->
      <div *ngIf="modalRechazoDespachoOpen" appModalPortal role="dialog" aria-modal="true" aria-labelledby="inv-modal-titulo-6" class="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 max-h-[90dvh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">
          <div class="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4"></i-lucide>
              </div>
              <h3 id="inv-modal-titulo-6" class="text-sm font-extrabold text-slate-900 truncate">Rechazar Recepción de Suministros</h3>
            </div>
            <button (click)="modalRechazoDespachoOpen = false" class="text-slate-500 hover:text-slate-600 cursor-pointer shrink-0" aria-label="Cerrar">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
            <p class="font-bold">Guía: {{ despachoSeleccionadoRechazo?.numeroGuia }}</p>
            <p class="text-xs">
              Al rechazar el despacho, los insumos <b>no se sumarán</b> al inventario de tu agencia y se notificará de inmediato a Bodega Central para resolver la incidencia.
            </p>
          </div>

          <div class="space-y-3 text-xs">
            <label class="block font-bold text-slate-700">Seleccione el Motivo del Rechazo *</label>
            <div class="space-y-2">
              <label *ngFor="let m of motivosRechazoPredefinidos" class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input type="radio" [(ngModel)]="motivoRechazoSeleccionado" [value]="m" name="motivoRadio" class="text-rose-600 focus:ring-rose-500">
                <span class="font-medium text-slate-700">{{ m }}</span>
              </label>
            </div>

            <div>
              <label for="inv-f31" class="block font-bold text-slate-700 mb-1">Detalle u Observación Adicional</label>
              <textarea id="inv-f31"
                [(ngModel)]="observacionRechazoTexto"
                rows="2"
                placeholder="Indique detalles adicionales si aplica (ej. el transporte no llegó a la sede, rotura de envase...)"
                class="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-rose-500"></textarea>
            </div>
          </div>
          </div>

          <div class="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              (click)="modalRechazoDespachoOpen = false"
              class="btn-secondary w-full sm:w-auto">
              Cancelar
            </button>
            <button
              (click)="ejecutarRechazoDespacho()"
              [disabled]="procesandoRecepcion"
              class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer w-full sm:w-auto justify-center">
              Confirmar Rechazo
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: DESPACHAR SUMINISTRO (AGENCIA / BODEGA / PULIDOR)       -->
      <!-- ============================================================== -->
      <div *ngIf="modalDespachoAgenciaOpen" appModalPortal role="dialog" aria-modal="true" aria-labelledby="inv-modal-titulo-7" class="fixed inset-0 z-[10050] overflow-y-auto p-4 sm:p-6 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 my-auto flex flex-col max-h-[90dvh] overflow-hidden animate-fade-in" (click)="$event.stopPropagation()">
          
          <!-- Header Fijo Superior (Sticky) -->
          <div class="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-20">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors"
                [ngClass]="modoDespachoDestino === 'bodega' ? 'bg-indigo-100 text-indigo-700' : (modoDespachoDestino === 'pulidor' ? 'bg-cyan-100 text-cyan-700' : (modoDespachoDestino === 'pulidor_fijo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'))">
                <i-lucide aria-hidden="true" [name]="modoDespachoDestino === 'bodega' ? 'warehouse' : (modoDespachoDestino === 'pulidor' ? 'user' : (modoDespachoDestino === 'pulidor_fijo' ? 'user-check' : 'truck'))" class="w-5 h-5"></i-lucide>
              </div>
              <div class="min-w-0">
                <h3 id="inv-modal-titulo-7" class="text-sm font-extrabold text-slate-900 truncate">
                  {{ modoDespachoDestino === 'bodega'
                    ? 'Despachar Suministro a Bodega'
                    : (modoDespachoDestino === 'pulidor_fijo'
                      ? 'Despachar a Pulidor Fijo (Sucursal)'
                      : (modoDespachoDestino === 'pulidor' ? 'Despachar a Pulidor Móvil' : 'Despachar Suministro a Sede')) }}
                </h3>
                <p class="text-xs text-slate-500 truncate">
                  {{ modoDespachoDestino === 'bodega'
                    ? 'Envío entre bodegas con confirmación obligatoria en destino'
                    : (modoDespachoDestino === 'pulidor_fijo'
                      ? 'Envío a pulidor fijo de sucursal; confirmación requerida al recibir'
                      : (modoDespachoDestino === 'pulidor'
                        ? 'Envío a pulidor móvil regional; confirmación requerida al recibir'
                        : 'Envío con confirmación obligatoria en la agencia destino')) }}
                </p>
              </div>
            </div>
            <button
              type="button"
              (click)="modalDespachoAgenciaOpen = false"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
              title="Cerrar modal" aria-label="Cerrar modal">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>

          <!-- Cuerpo con Scroll Interno -->
          <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 text-xs">
            
            <!-- ─── ORIGEN DEL DESPACHO ("Desde dónde") ─── -->
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <!-- Admin / Super Admin: Selector libre de Bodega Origen -->
              <div *ngIf="origenLibre">
                <div class="flex items-center justify-between mb-1.5">
                  <label class="font-bold text-slate-800 flex items-center gap-1.5">
                    <i-lucide aria-hidden="true" name="arrow-up-right" class="w-4 h-4 text-purple-600"></i-lucide>
                    <span>Origen del Despacho (Bodega de Salida) *</span>
                  </label>
                  <span class="text-xs font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                    Control Nacional Admin
                  </span>
                </div>
                <select
                  [(ngModel)]="despachoAgenciaForm.origenBodegaId"
                  (change)="alCambiarOrigenBodegaAdmin()"
                  name="origenBodegaId"
                  class="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:border-purple-500 shadow-2xs"
                  required>
                  <option value="" disabled>Seleccione la bodega de salida...</option>
                  <option *ngFor="let b of bodegasDisponibles" [value]="b.id">
                    {{ b.nombre }} · {{ b.esCentral || b.tipo === 'CENTRAL' ? 'Bodega Central' : ('Regional · ' + (b.region || '')) }}
                  </option>
                </select>
                <p class="text-xs text-slate-500 mt-1 font-medium">
                  Como administrador puedes despachar suministros desde cualquiera de las bodegas del país.
                </p>
              </div>

              <!-- Gestor / Asistente de Bodega: Bodega Fija Asignada -->
              <div *ngIf="!origenLibre && puedeAjustarStock">
                <label class="block font-bold text-slate-700 mb-1">Origen del Despacho (Tu Bodega)</label>
                <div class="p-2.5 bg-white rounded-xl border border-indigo-200 flex items-center justify-between shadow-2xs">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                      <i-lucide aria-hidden="true" name="warehouse" class="w-4 h-4"></i-lucide>
                    </div>
                    <div>
                      <p class="font-bold text-slate-800 text-xs">{{ getNombreBodegaOrigenContexto() }}</p>
                      <p class="text-xs text-slate-500">Bodega autorizada para tu usuario</p>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-md text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Origen Fijo
                  </span>
                </div>
              </div>

              <!-- Líder Operador: Sede Fija Asignada -->
              <div *ngIf="operaDesdeAgencia">
                <label class="block font-bold text-slate-700 mb-1">Origen del Despacho (Tu Sucursal)</label>
                <div class="p-2.5 bg-white rounded-xl border border-purple-200 flex items-center justify-between shadow-2xs">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                      <i-lucide aria-hidden="true" name="store" class="w-4 h-4"></i-lucide>
                    </div>
                    <div>
                      <p class="font-bold text-slate-800 text-xs">{{ getNombreAgenciaOrigenContexto() }}</p>
                      <p class="text-xs text-slate-500">Despacho desde las existencias físicas de tu sede</p>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-md text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                    Sede Asignada
                  </span>
                </div>
              </div>
            </div>

            <!-- Selector de Tipo de Destino (Agencia / Bodega / Pulidor Móvil / Pulidor Fijo) -->
            <div *ngIf="!agenciaDespachoFija">
              <label class="block font-bold text-slate-700 mb-1.5">Destino del Despacho *</label>
              <div class="grid gap-2" [ngClass]="puedeDespacharABodega ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'">
                <button
                  type="button"
                  (click)="cambiarTipoDestinoDespacho('agencia')"
                  class="px-2.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer"
                  [ngClass]="modoDespachoDestino === 'agencia' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">
                  <i-lucide aria-hidden="true" name="store" class="w-4 h-4"></i-lucide>
                  <span>A Agencia</span>
                </button>
                <button
                  *ngIf="puedeDespacharABodega"
                  type="button"
                  (click)="cambiarTipoDestinoDespacho('bodega')"
                  class="px-2.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer"
                  [ngClass]="modoDespachoDestino === 'bodega' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">
                  <i-lucide aria-hidden="true" name="warehouse" class="w-4 h-4"></i-lucide>
                  <span>A Bodega</span>
                </button>
                <button
                  type="button"
                  (click)="cambiarTipoDestinoDespacho('pulidor')"
                  class="px-2.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer"
                  [ngClass]="modoDespachoDestino === 'pulidor' ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">
                  <i-lucide aria-hidden="true" name="user" class="w-4 h-4"></i-lucide>
                  <span>Pulidor Móvil</span>
                </button>
                <button
                  type="button"
                  (click)="cambiarTipoDestinoDespacho('pulidor_fijo')"
                  class="px-2.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer"
                  [ngClass]="modoDespachoDestino === 'pulidor_fijo' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'">
                  <i-lucide aria-hidden="true" name="user-check" class="w-4 h-4"></i-lucide>
                  <span>Pulidor Fijo</span>
                </button>
              </div>
            </div>

            <!-- Destino Agencia -->
            <div *ngIf="modoDespachoDestino === 'agencia'">
              <label class="block font-bold text-slate-700 mb-1">Agencia / Sede Receptora *</label>
              <div *ngIf="agenciaDespachoFija" class="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i-lucide aria-hidden="true" name="store" class="w-4 h-4 text-purple-700 shrink-0"></i-lucide>
                  <span class="font-bold text-slate-800 text-xs">{{ agenciaDespachoFija.nombre }}</span>
                  <span *ngIf="agenciaDespachoFija.ciudad" class="text-slate-500 text-xs">({{ agenciaDespachoFija.ciudad }})</span>
                </div>
                <span class="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-200/80 text-purple-800 shrink-0">
                  Sede Asignada
                </span>
              </div>
              <div *ngIf="!agenciaDespachoFija">
                <select
                  [(ngModel)]="despachoAgenciaForm.agenciaId"
                  (change)="alCambiarAgenciaDespacho()"
                  name="agenciaId"
                  class="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-purple-500"
                  required>
                  <option value="" disabled>Seleccione sede destino...</option>
                  <option *ngFor="let ag of getAgenciasDestinoDisponibles()" [value]="ag.id">
                    {{ ag.nombre }} ({{ ag.ciudad || 'Sede' }})
                  </option>
                </select>
                <p *ngIf="getAgenciasDestinoDisponibles().length === 0" class="text-xs text-rose-600 mt-1 font-semibold">
                  No hay otras agencias disponibles en tu alcance.
                </p>
              </div>
            </div>

            <!-- Destino Bodega -->
            <div *ngIf="modoDespachoDestino === 'bodega'">
              <label for="inv-f32" class="block font-bold text-slate-700 mb-1">Bodega Receptora *</label>
              <select id="inv-f32"
                [(ngModel)]="despachoAgenciaForm.bodegaId"
                name="bodegaIdDestino"
                class="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                required>
                <option value="" disabled>Seleccione bodega destino...</option>
                <option *ngFor="let bod of getBodegasDestinoDespacho()" [value]="bod.id">
                  {{ bod.nombre }} ({{ bod.ciudad || bod.region || 'Bodega' }})
                </option>
              </select>
              <p *ngIf="getBodegasDestinoDespacho().length === 0" class="text-xs text-amber-600 mt-1">
                No hay otras bodegas regionales registradas.
              </p>
              <p *ngIf="getBodegasDestinoDespacho().length > 0" class="text-xs text-slate-500 mt-1">
                No se lista tu bodega de origen. El receptor deberá confirmar el envío al llegar.
              </p>
            </div>

            <!-- Destino Pulidor Móvil -->
            <div *ngIf="modoDespachoDestino === 'pulidor'">
              <label for="inv-f33" class="block font-bold text-slate-700 mb-1">Pulidor Móvil *</label>
              <select id="inv-f33"
                [(ngModel)]="despachoAgenciaForm.pulidorId"
                name="pulidorIdDestino"
                class="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-cyan-500"
                required>
                <option value="" disabled>Seleccione pulidor móvil destino...</option>
                <option *ngFor="let p of getPulidoresDestino('pulidor')" [value]="p.id">
                  {{ p.nombre || (p.name + ' ' + (p.lastname || '')) }} {{ p.regionNombre ? '· Región: ' + p.regionNombre : '(Móvil)' }}
                </option>
              </select>
              <p *ngIf="getPulidoresDestino('pulidor').length === 0" class="text-xs text-rose-600 mt-1 font-semibold">
                No hay pulidores móviles disponibles en tu región.
              </p>
            </div>

            <!-- Destino Pulidor Fijo -->
            <div *ngIf="modoDespachoDestino === 'pulidor_fijo'">
              <label for="inv-f34" class="block font-bold text-slate-700 mb-1">Pulidor Fijo (Asignado a Sucursal) *</label>
              <select id="inv-f34"
                [(ngModel)]="despachoAgenciaForm.pulidorId"
                name="pulidorFijoIdDestino"
                class="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                required>
                <option value="" disabled>Seleccione pulidor fijo destino...</option>
                <option *ngFor="let p of getPulidoresDestino('pulidor_fijo')" [value]="p.id">
                  {{ p.nombre || (p.name + ' ' + (p.lastname || '')) }} {{ p.agenciaNombre ? '· Sucursal: ' + p.agenciaNombre : '(Sede Fija)' }}
                </option>
              </select>
              <p *ngIf="getPulidoresDestino('pulidor_fijo').length === 0" class="text-xs text-rose-600 mt-1 font-semibold">
                No hay pulidores fijos asignados a sucursal disponibles.
              </p>
            </div>

            <!-- Insumo a Despachar -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Insumo / Producto a Despachar *</label>
              
              <!-- Caso 1: Producto Fijo Bloqueado -->
              <div *ngIf="productoDespachoFijo" class="p-3 bg-purple-50/70 rounded-xl border border-purple-200 flex items-center justify-between">
                <div class="flex items-center gap-2.5 truncate mr-2">
                  <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                    <i-lucide aria-hidden="true" name="package" class="w-4 h-4"></i-lucide>
                  </div>
                  <div class="truncate">
                    <p class="font-extrabold text-slate-900 text-xs truncate">{{ productoDespachoFijo.nombre }}</p>
                    <span class="text-xs font-mono text-purple-900/80 block">
                      SKU: {{ productoDespachoFijo.codigoSKU }} | Contenido: {{ (productoDespachoFijo.contenidoNeto || 1) | number:'1.0-2' }} {{ productoDespachoFijo.unidadMedida || 'u' }}
                      <span *ngIf="productoDespachoFijo.stockActual !== undefined">
                        • Stock: <b>{{ getStockEnUnidades(productoDespachoFijo.stockActual, productoDespachoFijo.contenidoNeto) | number:'1.0-0' }} und</b>
                      </span>
                    </span>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-purple-200/80 text-purple-900 border border-purple-300 shrink-0">
                  Insumo Fijo
                </span>
              </div>

              <!-- Caso 2: Selector normal -->
              <div *ngIf="!productoDespachoFijo" class="space-y-1">
                <select
                  [(ngModel)]="despachoAgenciaForm.insumoId"
                  name="insumoId"
                  class="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-purple-500"
                  required>
                  <option value="" disabled>Seleccione insumo a despachar...</option>
                  <option *ngFor="let p of insumosDisponiblesDespacho" [value]="p.id" [disabled]="getStockEnUnidades(p.stockActual, p.contenidoNeto) <= 0">
                    {{ p.nombre }} (SKU: {{ p.codigoSKU }} | Stock: {{ getStockEnUnidades(p.stockActual, p.contenidoNeto) | number:'1.0-0' }} und{{ getStockEnUnidades(p.stockActual, p.contenidoNeto) <= 0 ? ' — SIN STOCK' : '' }})
                  </option>
                </select>
                <p *ngIf="insumosDisponiblesDespacho.length === 0" class="text-xs text-rose-600 font-medium">
                  No hay insumos disponibles.
                </p>
                <p *ngIf="insumosDisponiblesDespacho.length > 0" class="text-xs text-slate-500">
                  {{ operaDesdeAgencia ? 'Solo se listan los insumos que tu sede utiliza para sus servicios.' : 'Listado de insumos con stock en bodega.' }}
                </p>
              </div>
            </div>

            <!-- Cantidad y Nota -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="inv-f35" class="block font-bold text-slate-700 mb-1">Cantidad a Enviar (unidades) *</label>
                <input id="inv-f35"
                  type="number"
                  [(ngModel)]="despachoAgenciaForm.cantidad"
                  name="cantidad"
                  min="1"
                  step="1"
                  placeholder="1"
                  class="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 bg-white focus:outline-none focus:border-purple-500"
                  required />
                <p class="text-xs text-slate-500 mt-1">Solo unidades completas (envases). No se envía por volumen (L/ml).</p>
              </div>
              <div>
                <label for="inv-f36" class="block font-bold text-slate-700 mb-1">Nota u Observación</label>
                <input id="inv-f36"
                  type="text"
                  [(ngModel)]="despachoAgenciaForm.observacion"
                  name="observacion"
                  placeholder="ej. Reposición de químicos"
                  class="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-purple-500" />
              </div>
            </div>

            <!-- Información del Flujo -->
            <div
              class="p-3.5 rounded-xl text-xs space-y-1"
              [ngClass]="modoDespachoDestino === 'bodega'
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                : (modoDespachoDestino === 'pulidor_fijo'
                  ? 'bg-blue-50 border border-blue-200 text-blue-900'
                  : (modoDespachoDestino === 'pulidor' ? 'bg-cyan-50 border border-cyan-200 text-cyan-900' : 'bg-purple-50 border border-purple-200 text-purple-900'))">
              <p class="font-bold flex items-center gap-1.5">
                <i-lucide aria-hidden="true" name="info" class="w-3.5 h-3.5"></i-lucide>
                <span>Información del Flujo:</span>
              </p>
              <p>1. La cantidad es en <b>unidades completas</b> (envases). El sistema convierte a volumen al reservar stock.</p>
              <p>2. Se creará una guía en estado <b>EN TRÁNSITO</b> visible de inmediato en <b>Envíos & Confirmación</b>.</p>
              <p *ngIf="modoDespachoDestino === 'agencia'">
                3. La sede receptora deberá verificar físicamente y presionar <b>Confirmar</b> para alimentar su stock o <b>Rechazar</b> con una razón obligatoria.
              </p>
              <p *ngIf="modoDespachoDestino === 'bodega'">
                3. La bodega receptora deberá verificar físicamente y presionar <b>Confirmar</b> para alimentar su stock o <b>Rechazar</b> con una razón obligatoria.
              </p>
              <p *ngIf="modoDespachoDestino === 'pulidor'">
                3. El pulidor móvil deberá verificar físicamente y presionar <b>Confirmar</b> para alimentar su stock personal o <b>Rechazar</b> con una razón obligatoria.
              </p>
              <p *ngIf="modoDespachoDestino === 'pulidor_fijo'">
                3. El pulidor fijo de sede deberá verificar físicamente y presionar <b>Confirmar</b> para alimentar su inventario local asignado o <b>Rechazar</b> con una razón obligatoria.
              </p>
            </div>

          </div>

          <!-- Footer Fijo Inferior (Sticky) -->
          <div class="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-20">
            <button
              type="button"
              (click)="modalDespachoAgenciaOpen = false"
              class="btn-secondary w-full sm:w-auto">
              Cancelar
            </button>
            <button
              type="button"
              (click)="ejecutarDespachoAgencia()"
              [disabled]="procesandoDespachoAgencia || !puedeConfirmarDespachoModal() || (!productoDespachoFijo && !despachoAgenciaForm.insumoId) || !despachoAgenciaForm.cantidad || despachoAgenciaForm.cantidad <= 0"
              class="px-5 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-md inline-flex w-full sm:w-auto justify-center items-center gap-2 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              [ngClass]="modoDespachoDestino === 'bodega'
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : (modoDespachoDestino === 'pulidor_fijo'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : (modoDespachoDestino === 'pulidor' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-purple-600 hover:bg-purple-700'))">
              <i-lucide aria-hidden="true" name="send" class="w-4 h-4"></i-lucide>
              <span>{{ procesandoDespachoAgencia
                ? 'Despachando...'
                : (modoDespachoDestino === 'bodega'
                  ? 'Confirmar Envío a Bodega'
                  : (modoDespachoDestino === 'pulidor_fijo'
                    ? 'Confirmar Envío a Pulidor Fijo'
                    : (modoDespachoDestino === 'pulidor' ? 'Confirmar Envío a Pulidor Móvil' : 'Confirmar Envío a Sede'))) }}</span>
            </button>
          </div>

        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL: REGISTRAR / EDITAR BODEGA                               -->
      <!-- ============================================================== -->
      <app-modal size="md"
        [isOpen]="modalBodegaOpen"
        [title]="editandoBodega ? 'Editar Bodega Regional' : 'Registrar Nueva Bodega Regional'"
        icon="warehouse"
        (close)="modalBodegaOpen = false">
        <form (ngSubmit)="guardarBodega()" class="space-y-4">
          <div>
            <label for="inv-f37" class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nombre de la Bodega <span class="text-rose-500">*</span>
            </label>
            <input id="inv-f37"
              type="text"
              [(ngModel)]="bodegaForm.nombre"
              name="bodegaNombre"
              placeholder="ej. Bodega Regional Manabí - Manta"
              class="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-easydry-blue outline-none"
              required />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="inv-f38" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tipo de Bodega <span class="text-rose-500">*</span>
              </label>
              <select id="inv-f38"
                [(ngModel)]="bodegaForm.tipo"
                name="bodegaTipo"
                class="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:border-easydry-blue outline-none"
                required>
                <option value="REGIONAL">REGIONAL</option>
                <option value="CENTRAL">CENTRAL (única nacional)</option>
              </select>
              <p class="text-xs text-slate-500 mt-1">
                Solo puede existir una bodega CENTRAL a nivel nacional.
              </p>
            </div>
            <div>
              <label for="inv-f39" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Región Asignada <span *ngIf="bodegaForm.tipo !== 'CENTRAL'" class="text-rose-500">*</span>
              </label>
              <select id="inv-f39"
                [(ngModel)]="bodegaForm.regionId"
                name="bodegaRegion"
                class="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:border-easydry-blue outline-none"
                [required]="bodegaForm.tipo !== 'CENTRAL'">
                <option value="" disabled>Seleccione una región</option>
                <option *ngFor="let r of regionesDisponibles" [value]="r.id">
                  {{ r.nombre }} ({{ r.codigo }})
                </option>
              </select>
              <p class="text-xs text-slate-500 mt-1">
                Obligatoria para REGIONAL; opcional para CENTRAL.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="inv-f40" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Ciudad Principal
              </label>
              <input id="inv-f40"
                type="text"
                [(ngModel)]="bodegaForm.ciudad"
                name="bodegaCiudad"
                placeholder="ej. Manta"
                class="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-easydry-blue outline-none" />
            </div>
            <div>
              <label for="inv-f41" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Teléfono de Contacto
              </label>
              <input id="inv-f41"
                type="text"
                [(ngModel)]="bodegaForm.telefono"
                name="bodegaTelefono"
                placeholder="ej. 0991234567"
                class="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-easydry-blue outline-none" />
            </div>
          </div>

          <div>
              <label for="inv-f42" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Dirección Física / HUB Logístico
              </label>
              <input id="inv-f42"
                type="text"
                [(ngModel)]="bodegaForm.direccion"
                name="bodegaDireccion"
                placeholder="ej. Av. 4 de Noviembre y Calle 114"
                class="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-easydry-blue outline-none" />
          </div>

          <div>
              <label for="inv-f43" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                % Umbral Alerta Mínimo de Stock
              </label>
              <div class="relative flex items-center">
                <input id="inv-f43"
                  type="number"
                  min="1"
                  max="100"
                  [(ngModel)]="bodegaForm.porcentajeAlerta"
                  name="bodegaPorcentajeAlerta"
                  placeholder="ej. 20"
                  class="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:border-easydry-blue outline-none pr-8" />
                <span class="absolute right-3 text-slate-500 font-bold text-xs">%</span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                Margen sobre el mínimo para alerta preventiva.
              </p>
          </div>

          <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
            <i-lucide aria-hidden="true" name="shield-check" class="w-4 h-4 text-easydry-blue shrink-0 mt-0.5"></i-lucide>
            <p>
              Esta bodega quedará disponible inmediatamente para la asignación de <b>Asistentes de Bodega</b> en Gestión de Usuarios y despachos zonales.
            </p>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              (click)="modalBodegaOpen = false"
              class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="guardandoBodega || !bodegaForm.nombre.trim() || (bodegaForm.tipo !== 'CENTRAL' && !bodegaForm.regionId)"
              class="px-5 py-2 rounded-xl bg-easydry-blue hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50">
              <i-lucide aria-hidden="true" name="save" class="w-3.5 h-3.5"></i-lucide>
              <span>{{ guardandoBodega ? 'Guardando...' : (editandoBodega ? 'Guardar Cambios' : 'Registrar Bodega') }}</span>
            </button>
          </div>
        </form>
      </app-modal>

      <!-- ============================================================== -->
      <!-- MODAL LIGHTBOX ZOOM DE IMAGEN DEL INSUMO                       -->
      <!-- ============================================================== -->
      <div *ngIf="imagenModalZoom" appModalPortal role="dialog" aria-modal="true" aria-labelledby="inv-modal-titulo-8" class="fixed inset-0 z-[10060] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" (click)="cerrarZoomImagen()">
        <div class="relative max-w-3xl w-full bg-white rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3 overflow-hidden" (click)="$event.stopPropagation()">
          <div class="w-full flex items-center justify-between pb-2 border-b border-slate-100">
            <span id="inv-modal-titulo-8" class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <i-lucide aria-hidden="true" name="image" class="w-4 h-4 text-easydry-blue"></i-lucide>
              {{ imagenModalTitulo }}
            </span>
            <button type="button" (click)="cerrarZoomImagen()" class="inline-flex items-center justify-center min-w-9 min-h-9 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer" aria-label="Cerrar">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>
          <div class="w-full min-h-64 max-h-[80vh] rounded-2xl overflow-auto bg-slate-950 border border-slate-200 shadow-inner flex items-center justify-center p-3">
            <img loading="lazy" decoding="async" [src]="imagenModalUrl" [alt]="imagenModalTitulo" class="max-w-full max-h-[76vh] object-contain" />
          </div>
          <div class="w-full flex items-center justify-end pt-1">
            <button type="button" (click)="cerrarZoomImagen()" class="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
})
export class InventarioComponent implements OnInit, OnDestroy {
  private inventarioService = inject(InventarioService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  /** Stock de los kits de pulidores: permiso aparte, los perfiles comerciales no lo tienen. */
  get puedeVerKits(): boolean { return this.auth.puede('inventario.kits.ver'); }
  private sucursalService = inject(SucursalService);
  private usuarioService = inject(UsuarioService);
  private regionService = inject(RegionService);
  private http = inject(HttpClient);
  private storageUploadService = inject(StorageUploadService);

  @ViewChild('imageUploader') imageUploader?: ImageUploaderComponent;
  @ViewChild('reajusteUploader') reajusteUploader?: ImageUploaderComponent;
  public guardandoProducto: boolean = false;

  // Lightbox Zoom
  public imagenModalZoom: string | null = null;
  public imagenModalTitulo = 'Foto adjunta';
  /**
   * URL ya resuelta (prefirmada si el archivo es privado) para el modal de zoom. Nunca se usa
   * resolverUrlImagen()/resolveBackendUrl directo como [src]: para evidencias privadas de kardex
   * eso pega primero contra /storage/file sin firmar y responde 403 antes de poder pedir la prefirmada.
   */
  public imagenModalUrl = '';

  public async abrirZoomImagen(url: string, titulo = 'Foto adjunta'): Promise<void> {
    const limpia = url && url.trim();
    if (!limpia) return;
    this.imagenModalZoom = limpia;
    this.imagenModalTitulo = titulo;
    this.imagenModalUrl = '';
    try {
      this.imagenModalUrl = await this.storageUploadService.resolveMediaUrlStrict(limpia);
    } catch {
      this.imagenModalUrl = this.storageUploadService.resolveBackendUrl(limpia);
    }
  }

  /** Cierra con Esc el modal manual que este en primer plano. */
  @HostListener('document:keydown.escape')
  onEscapeModales(): void {
    if (this.imagenModalZoom) { this.cerrarZoomImagen(); return; }
    if (this.modalEntradaAbierto) { this.cerrarModalEntrada(); return; }
    if (this.modalReajusteAbierto && !this.guardandoReajuste) { this.cerrarModalReajuste(); return; }
    if (this.modalPresentacionesAbierto) { this.modalPresentacionesAbierto = false; return; }
    if (this.modalTipoAbierto) { this.modalTipoAbierto = false; return; }
    if (this.modalUnidadAbierto) { this.modalUnidadAbierto = false; return; }
    if (this.modalRechazoDespachoOpen) { this.modalRechazoDespachoOpen = false; return; }
    if (this.modalDespachoAgenciaOpen) { this.modalDespachoAgenciaOpen = false; }
  }

  public cerrarZoomImagen(): void {
    this.imagenModalZoom = null;
    this.imagenModalUrl = '';
  }

  public resolverUrlImagen(url: string | null | undefined): string {
    if (!url) return '';
    return this.storageUploadService.resolveBackendUrl(url);
  }

  // Navegación
  activeTab: 'productos' | 'bodegas' | 'agencias' | 'pulidores' | 'stock_bajo' | 'alertas_reabastecimiento' | 'movimientos' | 'consumo_servicios' | 'configuracion' | 'insumos_servicios' = 'productos';

  /** Trazabilidad de consumo por servicio (mismo permiso que el endpoint de consumos). */
  get puedeVerConsumoServicios(): boolean {
    return this.auth.puede('consumos.ver');
  }
  subTabConfig: 'tipos' | 'unidades' = 'tipos';

  // ── Configuración: catálogos con páginas numeradas, orden y búsqueda en el servidor ──
  // (las listas `tiposProducto` / `unidadesMedida` de arriba siguen siendo los catálogos completos de los selectores)
  readonly columnasTipos: TableColumn[] = [
    { key: 'codigo', label: 'Código', sortable: true, defaultSort: 'asc' },
    { key: 'nombre', label: 'Nombre', sortable: true, defaultSort: 'asc' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
    { key: 'acciones', label: 'Acciones', align: 'right', sticky: true },
  ];
  readonly columnasUnidades: TableColumn[] = [
    { key: 'codigo', label: 'Código', sortable: true, defaultSort: 'asc' },
    { key: 'nombre', label: 'Nombre', sortable: true, defaultSort: 'asc' },
    { key: 'simbolo', label: 'Símbolo', sortable: true, defaultSort: 'asc' },
    { key: 'tipo', label: 'Familia / Tipo', sortable: true, defaultSort: 'asc' },
    { key: 'factorBase', label: 'Factor Base', sortable: true, defaultSort: 'asc' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
    { key: 'acciones', label: 'Acciones', align: 'right', sticky: true },
  ];
  readonly tiposTabla = new TablaServidor<TipoProductoCatalog>((c) => this.inventarioService.getTiposPagina(c));
  readonly unidadesTabla = new TablaServidor<UnidadMedidaCatalog>((c) => this.inventarioService.getUnidadesPagina(c));

  /** Al abrir Configuración se pide (una sola vez) la tabla de la subpestaña visible. */
  public abrirConfiguracion(): void {
    this.cambiarSubTabConfig(this.subTabConfig);
  }

  public cambiarSubTabConfig(sub: 'tipos' | 'unidades'): void {
    this.subTabConfig = sub;
    const tabla = sub === 'tipos' ? this.tiposTabla : this.unidadesTabla;
    if (!tabla.inicializada && !tabla.cargando) tabla.reiniciar();
  }

  // Bodegas & Asistentes
  bodegasDisponibles: BodegaInventario[] = [];
  bodegaSeleccionadaId: string = '';
  bodegaSeleccionada: BodegaInventario | null = null;
  private stockBodegaRequestSeq = 0;
  todosLosUsuarios: Usuario[] = [];
  cargandoBodegas: boolean = false;
  regionesDisponibles: any[] = [];
  modalBodegaOpen: boolean = false;
  editandoBodega: BodegaInventario | null = null;
  guardandoBodega: boolean = false;
  bodegaForm = {
    nombre: '',
    codigo: '',
    regionId: '',
    tipo: 'REGIONAL' as 'CENTRAL' | 'REGIONAL',
    ciudad: '',
    direccion: '',
    telefono: '',
    porcentajeAlerta: 20
  };

  // ── Permisos: los mismos códigos que el backend exige en cada endpoint (el rol no se consulta por nombre) ──
  get puedeVerInventario(): boolean { return this.auth.puede('inventario.ver'); }
  get puedeGestionarCatalogos(): boolean { return this.auth.puedeAlguno('inventario.productos.gestionar', 'inventario.config.tipos', 'inventario.config.unidades'); }
  get puedeGestionarBodegas(): boolean { return this.auth.puede('inventario.bodegas.gestionar'); }
  get puedeEstadoBodegas(): boolean { return this.auth.puede('inventario.bodegas.estado'); }
  get puedeEliminarBodegas(): boolean { return this.auth.puede('inventario.bodegas.eliminar'); }
  get puedeAjustarStock(): boolean { return this.auth.puedeAlguno('inventario.bodegas.reajustar', 'inventario.agencias.reajustar', 'inventario.pulidores.reajustar'); }
  get puedeVerDespachos(): boolean { return this.auth.puede('despachos.ver'); }
  get puedeRecibirDespacho(): boolean { return this.auth.puede('despachos.recibir'); }
  get puedeVerAlertas(): boolean { return this.auth.puede('alertas.ver'); }
  get puedeCrearAlerta(): boolean { return this.auth.puede('inventario.alertas.crear'); }
  get puedeAtenderAlertas(): boolean { return this.auth.puede('inventario.alertas.atender'); }

  /** Opera el stock de bodegas (ajustes, catálogo o compras): ve las pestañas de gestión de bodega. */
  get puedeOperarBodega(): boolean {
    return this.puedeAjustarStock || this.puedeGestionarCatalogos || this.auth.puede('inventario.productos.compra');
  }

  /** Contexto de alcance del usuario (dato de su perfil, no un permiso). */
  get ambitoGlobal(): boolean {
    return this.auth.getCurrentUser()?.ambito === 'GLOBAL';
  }

  /** Opera una bodega regional propia (ajusta stock pero no con alcance nacional). */
  get operaBodegaPropia(): boolean {
    return this.puedeAjustarStock && !this.ambitoGlobal;
  }

  /** Puede elegir libremente la bodega de origen del despacho (alcance nacional). */
  get origenLibre(): boolean {
    return this.puedeGenerarDespacho && this.ambitoGlobal;
  }

  /** Abastecer bodegas regionales desde la central. */
  get puedeAbastecerBodegas(): boolean {
    return this.puedeAjustarStock && this.puedeGenerarDespacho && this.ambitoGlobal;
  }

  /** Solo Bodega Central admite ingresos; regionales se abastecen por envíos. */
  get esBodegaCentralActual(): boolean {
    const bod = this.bodegaSeleccionada || this.resumenBodegas?.bodega;
    if (!bod) {
      return this.bodegaSeleccionadaId === 'bod_central';
    }
    return !!(bod.esCentral || bod.tipo === 'CENTRAL' || bod.id === 'bod_central' || bod.codigo === 'BOD-CENTRAL');
  }

  /** Registrar compra/ingreso (siempre a la Bodega Central): permiso 'compras.registrar'. */
  get puedeRegistrarIngreso(): boolean {
    return this.auth.puede('inventario.productos.compra');
  }

  get puedeReajustarStock(): boolean {
    return this.puedeAjustarStock;
  }

  /** Generar despachos: permiso 'despachos.crear' (el servidor limita origen y destino según el alcance). */
  get puedeGenerarDespacho(): boolean {
    return this.auth.puedeAlguno('inventario.productos.despachar', 'inventario.bodegas.despachar', 'inventario.agencias.despachar', 'inventario.pulidores.despachar', 'inventario.stockbajo.despachar');
  }

  // Cada pestaña se muestra solo si el rol tiene su sub-página.
  get puedeSubProductos(): boolean { return this.auth.puede('pagina.inventario.productos'); }
  get puedeSubBodegas(): boolean { return this.auth.puede('pagina.inventario.bodegas'); }
  get puedeSubAgencias(): boolean { return this.auth.puede('pagina.inventario.agencias'); }
  get puedeSubMovimientos(): boolean { return this.auth.puede('pagina.inventario.movimientos'); }
  get puedeSubConfiguracion(): boolean { return this.auth.puede('pagina.inventario.configuracion'); }
  get puedeReajustarBodega(): boolean { return this.auth.puede('inventario.bodegas.reajustar'); }
  get puedeReajustarAgencia(): boolean { return this.auth.puede('inventario.agencias.reajustar'); }
  get puedeReajustarPulidor(): boolean { return this.auth.puede('inventario.pulidores.reajustar'); }
  // Cada pestaña despacha con su propia casilla.
  get puedeDespacharStockBajo(): boolean { return this.auth.puede('inventario.stockbajo.despachar'); }
  get puedeDespacharBodega(): boolean { return this.auth.puede('inventario.bodegas.despachar'); }
  get puedeDespacharAgencia(): boolean { return this.auth.puede('inventario.agencias.despachar'); }
  get puedeDespacharPulidor(): boolean { return this.auth.puede('inventario.pulidores.despachar'); }

  /** Despacho hacia bodegas: quien despacha y no opera desde una agencia (el líder nunca despacha a bodegas). */
  get puedeDespacharABodega(): boolean {
    return this.puedeGenerarDespacho && !this.operaDesdeAgencia;
  }

  /** Estado de la bodega central (stock bajo): mismo permiso que 'stock-bajo/list'. */
  get puedeVerStockBajoBodegaCentral(): boolean {
    return this.auth.puede('pagina.inventario.stock-bajo');
  }

  /** Insumos de la sede del líder con alerta real (no “No necesario”). */
  get insumosBajosMiSede(): any[] {
    return (this.insumosServiciosList || []).filter(
      (i: any) =>
        i.necesario !== false &&
        i.estado !== 'NO_NECESARIO' &&
        (i.estado === 'BAJO' || i.estado === 'CRITICO' || i.estado === 'AGOTADO'),
    );
  }

  /** Alertas de la sede con páginas numeradas (la lista ya viene acotada a la sede, así que se corta en el navegador). */
  paginaBajosSede = 1;
  pageSizeBajosSede = PAGE_SIZE_TABLA;
  get insumosBajosPagina(): any[] {
    const ultima = Math.max(1, Math.ceil(this.insumosBajosMiSede.length / this.pageSizeBajosSede));
    if (this.paginaBajosSede > ultima) this.paginaBajosSede = ultima;
    const desde = (this.paginaBajosSede - 1) * this.pageSizeBajosSede;
    return this.insumosBajosMiSede.slice(desde, desde + this.pageSizeBajosSede);
  }

  get contadorBadgeStockBajo(): number {
    // Alertas sin resolver dentro del alcance del usuario (dato del servidor).
    const alertas = this.alertasTabla.resumen?.activas ?? 0;
    if (this.operaDesdeAgencia) {
      return alertas + this.insumosBajosMiSede.length;
    }
    if (this.operaBodegaPropia) {
      return alertas;
    }
    return alertas > 0 ? alertas : Number(this.resumenDashboard?.productosStockBajo || 0);
  }

  private obtenerIdBodegaCentral(): string {
    const central = (this.bodegasDisponibles || []).find(
      (b) => b.esCentral || b.tipo === 'CENTRAL' || b.id === 'bod_central' || b.codigo === 'BOD-CENTRAL'
    );
    return (central?.id || 'bod_central').toString();
  }

  // Usuario y Sede Actual
  currentUser: any = null;
  isOperador: boolean = false;
  isPulidor: boolean = false;
  isPulidorMovil: boolean = false;
  isPulidorFijo: boolean = false;
  /** Contexto: trabaja desde su agencia (despacha y recibe con el stock de su sede). */
  operaDesdeAgencia: boolean = false;
  miAgenciaId: string = '';
  miAgenciaNombre: string = '';
  sucursalesActivas: any[] = [];

  // Insumos basados en servicios de la sede
  cargandoInsumosServicios: boolean = false;
  resumenInsumosServicios: any = {
    totalInsumosRequeridos: 0,
    insumosOptimos: 0,
    insumosBajoMinimo: 0,
    insumosAgotados: 0,
    totalAlertas: 0,
    alertas: []
  };
  infoAgenciaInsumos: any = null;
  insumosServiciosList: any[] = [];
  insumosServiciosFiltrados: any[] = [];
  filtroTextoInsumosServicio: string = '';
  filtroEstadoInsumosServicio: string = '';

  // Despachos en camino para la agencia (Aprobación / Recepción Líder de Bahía)
  despachosPendientesAgencia: any[] = [];
  modalRechazoDespachoOpen = false;
  despachoSeleccionadoRechazo: any = null;
  motivoRechazoSeleccionado = 'El transporte / encomienda nunca llegó a la sede';
  observacionRechazoTexto = '';
  procesandoRecepcion = false;
  motivosRechazoPredefinidos = [
    'El transporte / encomienda nunca llegó a la sede',
    'Mercadería incompleta o faltante de insumos',
    'Envases rotos / derrame de químicos en traslado',
    'Insumos enviados no coinciden con lo solicitado'
  ];

  // Despachos rechazados para visibilidad de Super Admin
  despachosRechazadosSuperAdmin: any[] = [];
  modalDespachoAgenciaOpen: boolean = false;
  modoDespachoDestino: 'agencia' | 'bodega' | 'pulidor' | 'pulidor_fijo' = 'agencia';
  pulidoresDestinoDisponibles: any[] = [];
  productoDespachoFijo: any = null;
  agenciaDespachoFija: any = null;
  despachoAgenciaForm = {
    agenciaId: '',
    bodegaId: '',
    pulidorId: '',
    origenBodegaId: '',
    insumoId: '',
    insumoNombre: '',
    cantidad: 1,
    observacion: ''
  };
  insumosDisponiblesDespacho: any[] = [];
  procesandoDespachoAgencia: boolean = false;

  // Catálogos cargados de BD
  productos: ProductoInsumo[] = [];
  productosFiltrados: ProductoInsumo[] = [];
  tiposProducto: TipoProductoCatalog[] = [];
  unidadesMedida: UnidadMedidaCatalog[] = [];
  tiposMovimiento: TipoMovimientoCatalog[] = [];

  // Datos Dashboard & Kardex
  resumenDashboard: DashboardInventarioResumen = {
    totalProductos: 0,
    productosStockBajo: 0,
    entradasMes: 0,
    consumosMes: 0,
    totalMovimientosMes: 0,
    ultimosMovimientos: [],
  };
  historialMovimientos: MovimientoInventarioGlobalItem[] = [];
  totalMovimientos = 0;

  // Bandeja de Alertas de Stock Bajo en Sucursales (AlertaStock)
  cargandoAlertasStock = false;
  filtroAlertaNivel = '';
  userRegionDisplay = '';

  // Estado Bodegas & Otras Agencias
  resumenBodegas: any = {
    bodega: null,
    metricas: { totalInsumos: 0, stockTotalUnidades: 0, insumosBajoMinimo: 0, insumosOptimos: 0 },
    insumos: [],
  };
  filtroEstadoBodega = '';

  resumenAgencias: any = {
    totalAgencias: 0,
    agenciasEnAlerta: 0,
    insumosCriticosTotal: 0,
  };
  filtroEstadoAgencia = '';
  textoAgencias = '';
  busquedaAgenciasCorta = false;
  private busquedaAgenciasAplicada = '';
  private readonly busquedaAgencias$ = new Subject<string>();
  private busquedaAgenciasSub?: Subscription;
  /** Fichas de agencia que tienen abierta su tabla de insumos. */
  readonly agenciasExpandidas = new Set<string>();
  /** Se incrementa para que las tablas de insumos abiertas vuelvan a pedir su página (tras despachar, reajustar…). */
  stockRefreshToken = 0;

    resumenPulidores: any = {
    totalPulidores: 0,
    pulidoresEnAlerta: 0,
    insumosCriticosTotal: 0,
  };
  filtroPulidorTipo: string = '';
  filtroPulidorEstado: string = '';
  textoPulidores = '';
  busquedaPulidoresCorta = false;
  private busquedaPulidoresAplicada = '';
  private readonly busquedaPulidores$ = new Subject<string>();
  private busquedaPulidoresSub?: Subscription;
  readonly pulidoresExpandidos = new Set<string>();

  // Filtros
  filtroTextoProducto = '';
  filtroTipoProductoId = '';
  filtroAlertaStock = '';
  filtroEstadoProducto = '';
  filtroMovimientoTipoId = '';
  filtroMovimientoInsumoId = '';
  filtroMovimientoFechaDesde = '';
  filtroMovimientoFechaHasta = '';

  // ── Kardex (tabla con páginas numeradas; orden, búsqueda y filtros en el servidor) ──
  readonly columnasMovimientos: TableColumn[] = [
    { key: 'fecha', label: 'Fecha', sortable: true, defaultSort: 'desc' },
    { key: 'comprobante', label: 'Comprobante', sortable: true },
    { key: 'producto', label: 'Producto', sortable: true },
    { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'ruta', label: 'Origen → Destino', sortable: true },
    { key: 'cantidad', label: 'Movimiento', sortable: true },
    { key: 'cantidadBase', label: 'Cantidad Base', sortable: true },
    { key: 'stockAnterior', label: 'Stock Anterior', sortable: true },
    { key: 'stockNuevo', label: 'Stock Nuevo', sortable: true },
    { key: 'responsable', label: 'Responsable', sortable: true },
    { key: 'observacion', label: 'Observación' },
    { key: 'evidencia', label: 'Evidencia' },
  ];
  paginaMovimientos = 1;
  pageSizeMovimientos = PAGE_SIZE_TABLA;
  sortFieldMovimientos: string | null = 'fecha';
  sortOrderMovimientos: OrdenDir = 'desc';
  cargandoMovimientos = false;
  errorMovimientos: string | null = null;
  busquedaMovimientos = '';
  busquedaMovimientosCorta = false;
  private busquedaMovimientosAplicada = '';
  private readonly busquedaMovimientos$ = new Subject<string>();
  private busquedaMovimientosSub?: Subscription;
  private cargaMovimientosSub?: Subscription;

  // Estados de Modales
  modalEntradaAbierto = false;
  modalReajusteAbierto = false;
  guardandoReajuste = false;
  itemReajuste: any = null;
  formReajuste = {
    modo: 'cantidad' as 'unidades' | 'cantidad',
    cantidadContada: 0,
    motivoTexto: '',
    evidenciaUrl: '',
  };
  modalProductoAbierto = false;
  modalPresentacionesAbierto = false;
  modalTipoAbierto = false;
  modalUnidadAbierto = false;
  guardandoMovimiento = false;

  // Formulario de Entrada
  formEntrada = {
    insumoId: '',
    cantidadUnidades: 1,
    observaciones: '',
    bodegaId: '' as string,
  };
  busquedaProductoEntrada = '';
  productosEntradaFiltrados: ProductoInsumo[] = [];
  productoEntradaSeleccionado: ProductoInsumo | null = null;
  productoEntradaFijo: any = null;
  previewEntradaCantidadBase = 0;

  readonly CATEGORIAS_INSUMO = [
    { valor: 'QUIMICOS_LAVADO', etiqueta: 'Químicos de Lavado' },
    { valor: 'CERAS_SELLADORES', etiqueta: 'Ceras y Selladores' },
    { valor: 'PULIMENTOS', etiqueta: 'Pulimentos' },
    { valor: 'DESENGRASANTES', etiqueta: 'Desengrasantes' },
    { valor: 'TEXTILES', etiqueta: 'Textiles' },
    { valor: 'EPP', etiqueta: 'EPP (Equipo de Protección Personal)' },
    { valor: 'ACCESORIOS', etiqueta: 'Accesorios' },
  ];

  // Formulario Producto
  editandoProducto = false;
  formProducto: any = {
    id: '',
    codigoSKU: '',
    nombre: '',
    categoria: '',
    tipoProductoId: '',
    unidadMedidaId: '',
    contenidoNeto: 1,
    stockMinimoBodega: null as number | null,
    stockMinimoAgencia: null as number | null,
    stockOptimoBodega: null as number | null,
    stockOptimoAgencia: null as number | null,
    estado: 1,
    descripcion: '',
  };

  // Formulario Presentaciones
  productoPresentacionesSeleccionado: ProductoInsumo | null = null;
  presentacionesProductoActual: PresentacionInsumoCatalog[] = [];
  presEditandoId: string | null = null;
  nuevaPres = {
    nombre: '',
    unidadId: '',
    cantidad: 1,
    factorAUnidadBase: 1,
  };

  // Formularios Configuración
  formTipo = { id: '', codigo: '', nombre: '', descripcion: '', estado: 1 };
  formUnidad = { id: '', codigo: '', nombre: '', simbolo: '', tipo: 'VOLUMEN', factorBase: 1, estado: 1 };

  ngOnDestroy(): void {
    this.busquedaMovimientosSub?.unsubscribe();
    this.cargaMovimientosSub?.unsubscribe();
    this.busquedaAgenciasSub?.unsubscribe();
    this.busquedaPulidoresSub?.unsubscribe();
    this.bodegaTabla.destruir();
    this.agenciasLista.destruir();
    this.pulidoresLista.destruir();
    this.tiposTabla.destruir();
    this.unidadesTabla.destruir();
    this.productosTabla.destruir();
    this.stockBajoTabla.destruir();
    this.alertasTabla.destruir();
  }

  ngOnInit(): void {
    this.busquedaMovimientosSub = this.busquedaMovimientos$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        if (texto === this.busquedaMovimientosAplicada) return;
        this.busquedaMovimientosAplicada = texto;
        this.paginaMovimientos = 1;
        this.cargarHistorialMovimientos();
      });
    // Búsqueda de fichas (agencias y kits): espera 300 ms tras la última tecla y exige 2 letras.
    this.busquedaAgenciasSub = this.busquedaAgencias$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaAgenciasAplicada = texto;
        this.agenciasLista.reiniciar();
      });
    this.busquedaPulidoresSub = this.busquedaPulidores$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaPulidoresAplicada = texto;
        this.pulidoresLista.reiniciar();
      });
    this.currentUser = this.auth.getCurrentUser();

    // Contexto del usuario, derivado de sus permisos y su ámbito (no del nombre de su rol).
    this.isOperador = !this.puedeOperarBodega;
    this.isPulidor = this.isOperador && this.auth.puede('especiales.operar');
    this.isPulidorMovil = this.isPulidor && !this.currentUser?.agenciaId;
    this.isPulidorFijo = this.isPulidor && !this.isPulidorMovil;
    this.operaDesdeAgencia = this.isOperador && !this.isPulidor && this.currentUser?.ambito === 'AGENCIA';
    this.userRegionDisplay = this.currentUser?.region || this.currentUser?.regionNombre || (this.ambitoGlobal ? 'Red Nacional (Ver todo de todos)' : '');

    this.miAgenciaNombre = this.currentUser?.sucursalNombre || this.currentUser?.sucursal || '';
    this.miAgenciaId = (this.currentUser?.agenciaId ? String(this.currentUser.agenciaId) : '') || this.miAgenciaNombre;

    // Quien opera una bodega regional propia: su contexto es su bodega asignada (nunca Central por defecto)
    if (this.operaBodegaPropia && this.currentUser?.bodegaId) {
      this.bodegaSeleccionadaId = String(this.currentUser.bodegaId);
    } else if (!this.operaBodegaPropia) {
      this.bodegaSeleccionadaId = this.bodegaSeleccionadaId || 'bod_central';
    }

    if (this.isPulidor) {
      this.activeTab = 'pulidores';
    } else {
      // El líder ve primero el catálogo de su agencia; los perfiles de solo lectura empiezan en Agencias.
      this.activeTab = !this.puedeOperarBodega && !this.operaDesdeAgencia ? 'agencias' : 'productos';
    }

    // Sin permiso de lectura de inventario no se consulta nada (evita errores 403 de fondo).
    if (!this.puedeVerInventario) return;

    this.cargarTodosLosCatalogos();
    if (this.puedeGestionarBodegas) this.cargarRegiones();
    this.cargarBodegasDisponibles();
    if (this.puedeOperarBodega && this.auth.puede('usuarios.ver')) this.cargarUsuariosYAsistentes();
    if (this.puedeGenerarDespacho) this.cargarPulidoresDestino();
    this.cargarInsumosPorServicios();
    this.cargarDespachosPendientes();
    this.cargarDespachosRechazadosSuperAdmin();
    this.cargarDatosDeTab(this.activeTab);

    // Cargar sedes activas para el selector de agencias
    if (this.auth.puede('agencias.ver')) this.sucursalService.getSucursales().subscribe((sucursales) => {
      this.sucursalesActivas = (sucursales || []).filter((s) => s.estado === 'Activo' || (s.estado as any) === 1);
      if (this.sucursalesActivas.length > 0) {
        const encontrada = this.sucursalesActivas.find(
          (s) => String(s.id) === String(this.miAgenciaId) || s.nombre.toLowerCase() === this.miAgenciaNombre.toLowerCase()
        );
        // Solo se recarga si `miAgenciaId` realmente cambió con esta respuesta: si ya venía correcto desde
        // `currentUser`, repetir aquí las mismas peticiones del inicio era puro duplicado.
        const idPrevio = this.miAgenciaId;
        if (encontrada) {
          this.miAgenciaId = String(encontrada.id);
          this.miAgenciaNombre = encontrada.nombre;
        } else if (!this.isPulidorMovil && !this.currentUser?.agenciaId && !this.miAgenciaId) {
          this.miAgenciaId = String(this.sucursalesActivas[0].id);
          this.miAgenciaNombre = this.sucursalesActivas[0].nombre;
        }
        if (String(idPrevio) !== String(this.miAgenciaId)) {
          this.cargarInsumosPorServicios();
          this.cargarDespachosPendientes();
          this.cargarProductos();
          // "Otras agencias" excluye la propia por su id: se vuelve a pedir ahora que ya se conoce.
          if (this.isOperador) this.cargarStockAgencias();
        }
      }
    });
  }

  public onCambiarSede(nuevaAgenciaId: string): void {
    this.miAgenciaId = nuevaAgenciaId;
    const found = this.sucursalesActivas.find((s) => String(s.id) === String(nuevaAgenciaId));
    if (found) {
      this.miAgenciaNombre = found.nombre;
    } else {
      this.miAgenciaNombre = '';
    }
    this.cargarInsumosPorServicios();
    this.cargarDespachosPendientes();
    this.cargarProductos();
    if (this.isOperador) this.cargarStockAgencias();
  }

  // ==============================================================
  // CARGA DE DATOS DESDE BACKEND & DESPACHOS
  // ==============================================================

  public cargarDespachosRechazadosSuperAdmin(): void {
    if (this.isOperador || !this.puedeVerDespachos) return;
    this.inventarioService.getDespachosRechazados().subscribe({
      next: (list) => {
        this.despachosRechazadosSuperAdmin = list || [];
      },
      error: (err) => console.error('Error al consultar despachos rechazados:', err)
    });
  }

  public getAgenciasDestinoDisponibles(): any[] {
    const restringeARegion = this.operaBodegaPropia;
    const userRegion = (this.currentUser?.region || this.currentUser?.regionNombre || '').toLowerCase().trim();
    const userRegionId = (this.currentUser as any)?.regionId;
    const miId = String(this.miAgenciaId || '');

    const sameRegion = (s: any) =>
      (userRegionId && s.regionId && String(s.regionId) === String(userRegionId)) ||
      (userRegion && s.regionNombre && String(s.regionNombre).toLowerCase().includes(userRegion)) ||
      (userRegion && s.region && String(s.region).toLowerCase().includes(userRegion)) ||
      (userRegion && s.ciudad && String(s.ciudad).toLowerCase().includes(userRegion));

    // Líder: solo otras agencias de su región (nunca la propia)
    if (this.operaDesdeAgencia) {
      const otras = this.sucursalesActivas.filter(
        (s) =>
          String(s.id) !== miId &&
          s.nombre?.toLowerCase() !== (this.miAgenciaNombre || '').toLowerCase() &&
          (!userRegion && !userRegionId ? true : sameRegion(s)),
      );
      return otras;
    }

    if (restringeARegion) {
      const regionales = this.sucursalesActivas.filter((s) => sameRegion(s));
      return regionales.length > 0 ? regionales : this.sucursalesActivas;
    }

    // Coord / Admin: todas
    return this.sucursalesActivas;
  }

  public esPulidorFijo(p: any): boolean {
    return p?.modalidad === 'FIJO' || Boolean(p?.agenciaId);
  }

  public esPulidorMovil(p: any): boolean {
    return p?.modalidad === 'MOVIL' || (!p?.agenciaId && p?.modalidad !== 'FIJO');
  }

  public getPulidoresDestino(tipo: 'pulidor' | 'pulidor_fijo'): any[] {
    const userRegion = (this.currentUser?.region || this.currentUser?.regionNombre || '').toLowerCase().trim();
    const userRegionId = (this.currentUser as any)?.regionId;
    let list = (this.pulidoresDestinoDisponibles || []);

    if (this.operaDesdeAgencia && (userRegion || userRegionId)) {
      list = list.filter((p) =>
        (userRegionId && p.regionId && String(p.regionId) === String(userRegionId)) ||
        (userRegion && p.regionNombre && String(p.regionNombre).toLowerCase().includes(userRegion))
      );
    }

    if (tipo === 'pulidor_fijo') {
      return list.filter((p) => this.esPulidorFijo(p));
    } else {
      return list.filter((p) => this.esPulidorMovil(p));
    }
  }

  public cargarPulidoresDestino(): void {
    const isDirector = this.ambitoGlobal;
    const regionId = isDirector ? undefined : ((this.currentUser as any)?.regionId || undefined);
    this.http
      .post<any[]>(apiUrl('/operaciones/servicios-especiales/pulidores'), { regionId })
      .pipe(catchError(() => of([])))
      .subscribe((list) => {
        this.pulidoresDestinoDisponibles = (list || []).map((p: any) => {
          const esFijo = p.modalidad === 'FIJO' || Boolean(p.agenciaId);
          return {
            id: String(p.id),
            nombre:
              `${p.name || p.nombre || ''} ${p.lastname || p.apellido || ''}`.trim() ||
              p.email ||
              p.id,
            email: p.email,
            agenciaId: p.agenciaId || null,
            agenciaNombre: p.agencia?.nombre || null,
            regionId: p.regionId || null,
            regionNombre: p.region?.nombre || null,
            modalidad: esFijo ? 'FIJO' : 'MOVIL',
          };
        });

        if (
          (this.modoDespachoDestino === 'pulidor' || this.modoDespachoDestino === 'pulidor_fijo') &&
          !this.despachoAgenciaForm.pulidorId
        ) {
          const disponibles = this.getPulidoresDestino(this.modoDespachoDestino);
          if (disponibles.length > 0) {
            this.despachoAgenciaForm.pulidorId = String(disponibles[0].id);
          }
        }
      });
  }

  public cambiarTipoDestinoDespacho(tipo: 'agencia' | 'bodega' | 'pulidor' | 'pulidor_fijo'): void {
    this.modoDespachoDestino = tipo;
    this.agenciaDespachoFija = null;

    if (tipo === 'agencia') {
      this.despachoAgenciaForm.pulidorId = '';
      this.despachoAgenciaForm.bodegaId = '';
      const ops = this.getAgenciasDestinoDisponibles();
      this.despachoAgenciaForm.agenciaId = ops[0] ? String(ops[0].id) : '';
      if (!this.operaDesdeAgencia) {
        this.alCambiarAgenciaDespacho();
      } else {
        this.insumosDisponiblesDespacho = (this.insumosServiciosList || [])
          .filter((i: any) => i.necesario !== false && i.estado !== 'NO_NECESARIO')
          .map((i: any) => ({
            id: i.id || i.insumoId,
            nombre: i.nombre,
            codigoSKU: i.codigoSKU,
            unidadMedida: i.unidadMedida || 'u',
            contenidoNeto: Number(i.contenidoNeto || 1),
            stockActual: Number(i.stockActual || 0),
          }));
      }
    } else if (tipo === 'bodega') {
      this.despachoAgenciaForm.agenciaId = '';
      this.despachoAgenciaForm.pulidorId = '';
      const destinos = this.getBodegasDestinoDespacho();
      this.despachoAgenciaForm.bodegaId = destinos[0] ? String(destinos[0].id) : '';
      this.despachoAgenciaForm.origenBodegaId = String(
        this.obtenerBodegaIdContexto() || this.obtenerIdBodegaCentral() || ''
      );
      this.insumosDisponiblesDespacho = [...this.productos];
    } else {
      // 'pulidor' o 'pulidor_fijo'
      this.despachoAgenciaForm.agenciaId = '';
      this.despachoAgenciaForm.bodegaId = '';
      if (this.pulidoresDestinoDisponibles.length === 0) {
        this.cargarPulidoresDestino();
      }
      const disponibles = this.getPulidoresDestino(tipo);
      this.despachoAgenciaForm.pulidorId = disponibles[0]
        ? String(disponibles[0].id)
        : '';
      this.insumosDisponiblesDespacho = [...this.productos];
    }

    if (!this.productoDespachoFijo && this.insumosDisponiblesDespacho.length > 0) {
      const currentId = this.despachoAgenciaForm.insumoId;
      const exists = this.insumosDisponiblesDespacho.some((p) => String(p.id) === String(currentId));
      if (!exists) {
        this.despachoAgenciaForm.insumoId = String(this.insumosDisponiblesDespacho[0].id);
      }
    }
  }

  public abrirModalDespacho(destinoInicial?: 'agencia' | 'bodega' | 'pulidor' | 'pulidor_fijo', agenciaParam?: any, insumoParam?: any): void {
    if (this.pulidoresDestinoDisponibles.length === 0) {
      this.cargarPulidoresDestino();
    }
    if (!this.productos || this.productos.length === 0) {
      this.cargarProductos();
    }
    if (!this.bodegasDisponibles || this.bodegasDisponibles.length === 0) {
      this.cargarBodegasDisponibles();
    }
    const dest = destinoInicial || 'agencia';
    this.abrirModalDespachoAgencia(agenciaParam, insumoParam);
    if (dest !== 'agencia') {
      this.cambiarTipoDestinoDespacho(dest);
    }
  }

  public abrirModalDespachoHaciaBodegaSeleccionada(): void {
    if (!this.puedeDespacharABodega) {
      this.toast.warning('Sin permiso', 'No tienes permiso para despachar a bodegas.');
      return;
    }
    const destinoId = String(this.bodegaSeleccionadaId || this.bodegaSeleccionada?.id || '').trim();
    if (!destinoId) {
      this.toast.warning('Bodega requerida', 'Selecciona una bodega regional destino');
      return;
    }
    if (this.esBodegaCentralActual) {
      this.toast.warning('Destino inválido', 'Usa Despachar a Bodega para enviar a otra bodega desde Central');
      return;
    }
    this.modoDespachoDestino = 'bodega';
    this.agenciaDespachoFija = null;
    this.productoDespachoFijo = null;
    this.insumosDisponiblesDespacho = [...this.productos];
    const bod = this.bodegaSeleccionada || this.bodegasDisponibles.find((b) => String(b.id) === destinoId);
    this.despachoAgenciaForm = {
      agenciaId: '',
      bodegaId: destinoId,
      pulidorId: '',
      origenBodegaId: this.obtenerIdBodegaCentral(),
      insumoId: this.productos.length > 0 ? String(this.productos[0].id) : '',
      insumoNombre: '',
      cantidad: 1,
      observacion: `Abastecimiento desde Central hacia ${bod?.nombre || 'bodega regional'}`,
    };
    this.modalDespachoAgenciaOpen = true;
  }

  public abrirModalDespachoDesdeBodegaActual(insumoParam?: any): void {
    const origenId = String(this.bodegaSeleccionadaId || this.bodegaSeleccionada?.id || '').trim();
    this.abrirModalDespachoAgencia(undefined, insumoParam);
    this.despachoAgenciaForm.origenBodegaId = origenId || this.obtenerIdBodegaCentral();
    if (origenId && this.bodegaSeleccionada?.nombre) {
      this.despachoAgenciaForm.observacion =
        this.despachoAgenciaForm.observacion ||
        `Despacho desde ${this.bodegaSeleccionada.nombre} hacia sede`;
    }
  }

  public getBodegasDestinoDespacho(): BodegaInventario[] {
    const origenId = String(
      this.despachoAgenciaForm?.origenBodegaId ||
        this.bodegaSeleccionadaId ||
        this.currentUser?.bodegaId ||
        '',
    ).trim();
    return (this.bodegasDisponibles || []).filter((b) => String(b.id) !== origenId);
  }

  public alCambiarOrigenBodegaAdmin(): void {
    if (this.despachoAgenciaForm.bodegaId === this.despachoAgenciaForm.origenBodegaId) {
      this.despachoAgenciaForm.bodegaId = '';
    }
  }

  public getNombreBodegaOrigenContexto(): string {
    if (this.despachoAgenciaForm?.origenBodegaId) {
      const b = this.bodegasDisponibles.find((x) => String(x.id) === String(this.despachoAgenciaForm.origenBodegaId));
      if (b) return `${b.nombre} (${b.esCentral || b.tipo === 'CENTRAL' ? 'Central' : (b.region || 'Regional')})`;
    }
    const bodId = this.obtenerBodegaIdContexto() || this.currentUser?.bodegaId;
    const b = this.bodegasDisponibles.find((x) => String(x.id) === String(bodId));
    return b ? `${b.nombre} (${b.esCentral || b.tipo === 'CENTRAL' ? 'Central' : (b.region || 'Regional')})` : 'Bodega Asignada';
  }

  public getNombreAgenciaOrigenContexto(): string {
    return this.miAgenciaNombre || (this.currentUser as any)?.agencia?.nombre || 'Mi Sucursal Asignada';
  }

  public puedeConfirmarDespachoModal(): boolean {
    if (this.modoDespachoDestino === 'bodega') {
      return !!this.despachoAgenciaForm.bodegaId;
    }
    if (this.modoDespachoDestino === 'pulidor' || this.modoDespachoDestino === 'pulidor_fijo') {
      return !!this.despachoAgenciaForm.pulidorId;
    }
    return !!this.despachoAgenciaForm.agenciaId;
  }

  public abrirModalDespachoBodega(insumoParam?: any): void {
    if (!this.puedeDespacharABodega) {
      this.toast.warning(
        'Sin permiso',
        'No tienes permisos suficientes para generar envíos entre bodegas.'
      );
      return;
    }
    this.modoDespachoDestino = 'bodega';
    this.agenciaDespachoFija = null;

    const destinos = this.getBodegasDestinoDespacho();
    if (!destinos.length) {
      this.toast.warning('Sin Destino', 'No hay otras bodegas disponibles para despachar');
      return;
    }

    let insId = '';
    let prodFijo: any = null;
    let cantidad = 1;

    if (insumoParam) {
      insId = String(insumoParam.insumoId || insumoParam.id || '');
      const found = this.productos.find((p) => String(p.id) === insId);
      prodFijo = found
        ? { ...found, stockActual: Number(insumoParam.stockActual ?? found.stockActual ?? 0) }
        : {
            id: insId,
            nombre: insumoParam.nombre || '',
            codigoSKU: insumoParam.codigoSKU || 'SKU',
            unidadMedida: insumoParam.unidad || insumoParam.unidadMedida || 'u',
            stockActual: Number(insumoParam.stockActual || 0)
          };
      cantidad = Number(insumoParam.deficit) > 0 ? Number(insumoParam.deficit) : 1;
    } else {
      insId = this.productos.length > 0 ? String(this.productos[0].id) : '';
    }

    this.productoDespachoFijo = insumoParam ? prodFijo : null;
    this.insumosDisponiblesDespacho = [...this.productos];
    this.despachoAgenciaForm = {
      agenciaId: '',
      bodegaId: String(destinos[0].id),
      pulidorId: '',
      origenBodegaId: String(this.obtenerBodegaIdContexto() || this.obtenerIdBodegaCentral() || ''),
      insumoId: insId,
      insumoNombre: prodFijo ? prodFijo.nombre : '',
      cantidad,
      observacion: `Despacho entre bodegas hacia: ${destinos[0].nombre || ''}`
    };
    this.modalDespachoAgenciaOpen = true;
  }

  public abrirModalDespachoAgencia(agenciaParam?: any, insumoParam?: any): void {
    if (!this.puedeGenerarDespacho) {
      this.toast.warning(
        'Sin permiso',
        'No estás autorizado para generar despachos.'
      );
      return;
    }
    // Líder nunca despacha a bodega desde este modal
    this.modoDespachoDestino = 'agencia';
    let agId = '';
    let agObj: any = null;

    const agenciasOpciones = this.getAgenciasDestinoDisponibles();
    if (agenciaParam) {
      if (typeof agenciaParam === 'object') {
        agId = String(agenciaParam.id || agenciaParam.agenciaId || '');
        agObj = agenciaParam;
      } else {
        agId = String(agenciaParam);
        agObj = this.sucursalesActivas.find((s) => String(s.id) === agId) || null;
      }
    } else if (agenciasOpciones.length > 0) {
      agId = String(agenciasOpciones[0].id);
      agObj = agenciasOpciones[0];
    }

    this.agenciaDespachoFija = agenciaParam ? agObj : null;

    // Catálogo modal líder: solo insumos que SÍ requieren los servicios de la sede
    const catalogoInsumos = this.operaDesdeAgencia
      ? (this.insumosServiciosList || [])
          .filter((i: any) => i.necesario !== false && i.estado !== 'NO_NECESARIO')
          .map((i: any) => ({
            id: i.id || i.insumoId,
            nombre: i.nombre,
            codigoSKU: i.codigoSKU,
            unidadMedida: i.unidadMedida || 'u',
            contenidoNeto: Number(i.contenidoNeto || 1),
            stockActual: Number(i.stockActual || 0),
          }))
      : [...this.productos];

    let insId = '';
    let insNombre = '';
    let insDeficit = 1;
    let prodFijo: any = null;

    if (insumoParam) {
      insId = (insumoParam.insumoId || insumoParam.id || '').toString();
      insNombre = insumoParam.nombre || '';
      insDeficit = Number(insumoParam.deficit) > 0 ? Number(insumoParam.deficit) : 1;

      const found = catalogoInsumos.find(
        (p: any) =>
          String(p.id) === insId ||
          (insumoParam.insumoId && String(p.id) === String(insumoParam.insumoId)),
      );
      prodFijo = found || insumoParam;
    } else if (catalogoInsumos.length > 0) {
      prodFijo = catalogoInsumos[0];
      insId = String(prodFijo.id);
      insNombre = prodFijo.nombre;
    }

    this.productoDespachoFijo = insumoParam ? prodFijo : null;
    this.insumosDisponiblesDespacho = catalogoInsumos;

    if (this.operaDesdeAgencia && agenciasOpciones.length === 0 && this.pulidoresDestinoDisponibles.length === 0) {
      this.toast.warning(
        'Sin destinos',
        'No hay otras agencias ni pulidores en tu región para despachar.'
      );
    }

    const defaultOrigenBodega = this.origenLibre
      ? (this.obtenerBodegaIdContexto() || this.bodegasDisponibles[0]?.id || this.obtenerIdBodegaCentral())
      : (this.obtenerBodegaIdContexto() || this.obtenerIdBodegaCentral() || '');

    this.despachoAgenciaForm = {
      agenciaId: agId,
      bodegaId: '',
      pulidorId: '',
      // Líder despacha desde stock de su agencia (BE usa usuario.agenciaId)
      origenBodegaId: this.operaDesdeAgencia
        ? ''
        : String(this.despachoAgenciaForm?.origenBodegaId || defaultOrigenBodega || ''),
      insumoId: insId,
      insumoNombre: prodFijo ? prodFijo.nombre : '',
      cantidad: insDeficit,
      observacion: agObj
        ? `Despacho hacia sede: ${agObj.nombre || ''} (${agObj.codigo || ''})`
        : (this.operaDesdeAgencia ? 'Despacho desde stock de mi sede' : ''),
    };
    if (!this.operaDesdeAgencia) {
      this.alCambiarAgenciaDespacho();
    } else if (agenciasOpciones.length === 0 && this.pulidoresDestinoDisponibles.length > 0) {
      this.cambiarTipoDestinoDespacho('pulidor');
    }
    this.modalDespachoAgenciaOpen = true;
  }

  public alCambiarAgenciaDespacho(): void {
    const agId = this.despachoAgenciaForm.agenciaId;
    if (!this.operaDesdeAgencia) {
      this.insumosDisponiblesDespacho = this.productos && this.productos.length > 0 ? [...this.productos] : [];
      if (
        this.insumosDisponiblesDespacho.length > 0 &&
        (!this.despachoAgenciaForm.insumoId ||
          !this.insumosDisponiblesDespacho.some((p) => String(p.id) === String(this.despachoAgenciaForm.insumoId)))
      ) {
        this.despachoAgenciaForm.insumoId = String(this.insumosDisponiblesDespacho[0].id);
      }
      return;
    }

    if (!agId) {
      this.insumosDisponiblesDespacho = [...this.productos];
      return;
    }

    // Insumos de la agencia destino: se piden al servidor (antes salían de un resumen de todas las agencias en memoria).
    // Mientras llegan se ofrece el catálogo completo; si la agencia no tiene insumos propios, queda así.
    this.insumosDisponiblesDespacho = [...this.productos];
    this.corregirInsumoDespachoSeleccionado();
    this.inventarioService.getInsumosUbicacionPagina('agencia', String(agId), { page: 1, pageSize: 100 }).subscribe({
      next: ({ pagina }) => this.aplicarInsumosDespachoDeAgencia(pagina.items, String(agId)),
      error: () => undefined,
    });
  }

  private aplicarInsumosDespachoDeAgencia(insumosAgencia: any[], agId: string): void {
    // Si mientras tanto eligió otra agencia, esta respuesta ya no vale.
    if (String(this.despachoAgenciaForm.agenciaId) !== agId || insumosAgencia.length === 0) return;
    const idsValidos = new Set(insumosAgencia.map((i: any) => String(i.insumoId || i.id)));
    const filtrados = this.productos.filter((p) => idsValidos.has(String(p.id)));
    this.insumosDisponiblesDespacho = filtrados.length > 0
      ? filtrados
      : insumosAgencia.map((i: any) => ({
          id: i.insumoId || i.id,
          nombre: i.nombre,
          codigoSKU: i.codigoSKU,
          unidadMedida: i.unidad || 'u',
          contenidoNeto: Number(i.contenidoNeto || 1),
          stockActual: i.stockActual || 0,
        })) as any;
    this.corregirInsumoDespachoSeleccionado();
  }

  private corregirInsumoDespachoSeleccionado(): void {
    if (
      this.insumosDisponiblesDespacho.length > 0 &&
      !this.insumosDisponiblesDespacho.some((p) => String(p.id) === String(this.despachoAgenciaForm.insumoId))
    ) {
      this.despachoAgenciaForm.insumoId = String(this.insumosDisponiblesDespacho[0].id);
    }
  }

  public ejecutarDespachoAgencia(): void {
    if (!this.puedeGenerarDespacho && !this.puedeDespacharABodega) {
      this.toast.warning('Sin permiso', 'No tienes permiso para crear despachos.');
      return;
    }
    const esBodega = this.modoDespachoDestino === 'bodega';
    const esPulidor = this.modoDespachoDestino === 'pulidor' || this.modoDespachoDestino === 'pulidor_fijo';
    if (esBodega && !this.despachoAgenciaForm.bodegaId) {
      this.toast.warning('Bodega Requerida', 'Selecciona la bodega de destino');
      return;
    }
    if (esPulidor && !this.despachoAgenciaForm.pulidorId) {
      this.toast.warning('Pulidor Requerido', this.modoDespachoDestino === 'pulidor_fijo' ? 'Selecciona el pulidor fijo de destino' : 'Selecciona el pulidor móvil de destino');
      return;
    }
    if (!esBodega && !esPulidor && !this.despachoAgenciaForm.agenciaId) {
      this.toast.warning('Agencia Requerida', 'Selecciona la agencia o sucursal de destino');
      return;
    }
    const targetInsumoId = this.productoDespachoFijo ? this.productoDespachoFijo.id : this.despachoAgenciaForm.insumoId;
    if (!targetInsumoId) {
      this.toast.warning('Insumo Requerido', 'Selecciona el insumo a despachar');
      return;
    }
    const insumoSel = this.productoDespachoFijo || this.insumosDisponiblesDespacho.find((p) => String(p.id) === String(targetInsumoId)) || this.productos.find((p) => String(p.id) === String(targetInsumoId));
    if (insumoSel) {
      const stockDisponible = this.getStockEnUnidades(insumoSel.stockActual ?? insumoSel.stock ?? 0, insumoSel.contenidoNeto);
      if (stockDisponible <= 0) {
        this.toast.warning('Stock Insuficiente', `El insumo "${insumoSel.nombre}" no cuenta con existencias disponibles en origen (0 und). No es posible despachar.`);
        return;
      }
      if (Number(this.despachoAgenciaForm.cantidad) > stockDisponible) {
        this.toast.warning('Stock Insuficiente', `Stock insuficiente de "${insumoSel.nombre}": disponible ${stockDisponible} und, requerido ${this.despachoAgenciaForm.cantidad} und.`);
        return;
      }
    }
    if (!this.despachoAgenciaForm.cantidad || this.despachoAgenciaForm.cantidad <= 0) {
      this.toast.warning('Cantidad Inválida', 'La cantidad debe ser mayor a 0');
      return;
    }
    const cantUnd = Number(this.despachoAgenciaForm.cantidad);
    if (!Number.isFinite(cantUnd) || Math.abs(cantUnd - Math.round(cantUnd)) > 1e-9) {
      this.toast.warning('Cantidad Inválida', 'Solo se permiten unidades completas (números enteros).');
      return;
    }
    const unidades = Math.round(cantUnd);

    this.procesandoDespachoAgencia = true;
    const origenBodegaId = this.operaDesdeAgencia
      ? undefined
      : String(this.despachoAgenciaForm.origenBodegaId || this.obtenerBodegaIdContexto() || this.obtenerIdBodegaCentral() || '');

    let payload: any;
    if (esBodega) {
      payload = {
        tipo: 'DESPACHO_BODEGA',
        destinoBodegaId: String(this.despachoAgenciaForm.bodegaId),
        origenBodegaId: origenBodegaId || undefined,
        observaciones: this.despachoAgenciaForm.observacion || 'Despacho entre bodegas desde sección de suministros',
        detalles: [{ insumoId: String(targetInsumoId), cantidadEnviada: unidades }],
      };
    } else if (esPulidor) {
      const esFijo = this.modoDespachoDestino === 'pulidor_fijo';
      payload = {
        tipo: 'DESPACHO_PULIDOR',
        pulidorDestinoId: String(this.despachoAgenciaForm.pulidorId),
        destinoPulidorId: String(this.despachoAgenciaForm.pulidorId),
        origenBodegaId: origenBodegaId || undefined,
        origenAgenciaId: this.operaDesdeAgencia ? (this.miAgenciaId || undefined) : undefined,
        observaciones: this.despachoAgenciaForm.observacion || (esFijo ? 'Despacho a pulidor fijo desde sección de suministros' : 'Despacho a pulidor móvil desde sección de suministros'),
        detalles: [{ insumoId: String(targetInsumoId), cantidadEnviada: unidades }],
      };
    } else {
      payload = {
        tipo: 'DESPACHO_AGENCIA',
        agenciaId: String(this.despachoAgenciaForm.agenciaId),
        sucursalDestinoId: String(this.despachoAgenciaForm.agenciaId),
        agenciaDestinoId: String(this.despachoAgenciaForm.agenciaId),
        origenBodegaId: origenBodegaId || undefined,
        origenAgenciaId: this.operaDesdeAgencia ? (this.miAgenciaId || undefined) : undefined,
        observaciones: this.despachoAgenciaForm.observacion || 'Despacho directo desde sección de suministros',
        detalles: [{ insumoId: String(targetInsumoId), cantidadEnviada: unidades }],
      };
    }

    this.inventarioService.crearDespacho(payload).subscribe({
      next: (res: any) => {
        this.procesandoDespachoAgencia = false;
        this.modalDespachoAgenciaOpen = false;
        this.toast.success(
          'Despacho Generado con Éxito',
          `Guía ${res.numeroGuia || ''} en tránsito (stock reservado). El destino debe confirmar en Envíos.`
        );
        this.cargarProductos();
        this.cargarDespachosPendientes();
        this.cargarDespachosRechazadosSuperAdmin();
        this.cargarStockAgencias();
        this.cargarStockBodega(this.bodegaSeleccionadaId || origenBodegaId);
        if (this.operaDesdeAgencia) {
          this.cargarInsumosPorServicios();
        }
      },
      error: (err: any) => {
        this.procesandoDespachoAgencia = false;
        const msg = this.mensajeServidor(err, 'Error al despachar el suministro desde bodega');
        this.toast.error('Error en Despacho', msg);
      }
    });
  }

  /** Mensaje en español que trae el servidor (cadena o lista); si no viene, el de respaldo. */
  private mensajeServidor(err: any, respaldo: string): string {
    const m = err?.error?.message;
    if (Array.isArray(m)) return m.join('. ');
    return m || respaldo;
  }

  public cargarDespachosPendientes(): void {
    if (!this.puedeVerDespachos) return;
    this.inventarioService.getDespachosPendientesAgencia(this.miAgenciaId).subscribe({
      next: (list) => {
        this.despachosPendientesAgencia = list || [];
      },
      error: (err) => console.error('Error al consultar despachos pendientes:', err)
    });
  }

  public confirmarRecepcionDespacho(desp: any): void {
    this.procesandoRecepcion = true;
    this.inventarioService.confirmarRecepcionDespacho(desp.id, this.miAgenciaId).subscribe({
      next: () => {
        this.procesandoRecepcion = false;
        this.toast.success(
          'Suministros Recibidos en Sede',
          `El despacho ${desp.numeroGuia} fue aceptado. Los insumos han sido ingresados al stock de ${this.miAgenciaNombre}.`
        );
        this.cargarDespachosPendientes();
        this.cargarInsumosPorServicios();
        this.cargarProductos();
        this.cargarDespachosRechazadosSuperAdmin();
        this.cargarStockAgencias();
        this.cargarStockBodega();
      },
      error: (err: any) => {
        this.procesandoRecepcion = false;
        this.toast.error('Error', this.mensajeServidor(err, 'No se pudo registrar la recepción del despacho'));
      }
    });
  }

  public abrirModalRechazoDespacho(desp: any): void {
    this.despachoSeleccionadoRechazo = desp;
    this.motivoRechazoSeleccionado = this.motivosRechazoPredefinidos[0];
    this.observacionRechazoTexto = '';
    this.modalRechazoDespachoOpen = true;
  }

  public ejecutarRechazoDespacho(): void {
    if (!this.despachoSeleccionadoRechazo) return;

    const motivoFinal = `${this.motivoRechazoSeleccionado}. ${this.observacionRechazoTexto}`.trim();
    this.procesandoRecepcion = true;

    this.inventarioService.rechazarDespacho(
      this.despachoSeleccionadoRechazo.id,
      motivoFinal,
      this.miAgenciaId
    ).subscribe({
      next: () => {
        this.procesandoRecepcion = false;
        this.modalRechazoDespachoOpen = false;
        this.toast.warning(
          'Despacho Rechazado',
          `Se reportó la no conformidad del despacho ${this.despachoSeleccionadoRechazo.numeroGuia} a Bodega Central.`
        );
        this.cargarDespachosPendientes();
        this.cargarDespachosRechazadosSuperAdmin();
      },
      error: (err: any) => {
        this.procesandoRecepcion = false;
        this.toast.error('Error', this.mensajeServidor(err, 'No se pudo procesar el rechazo del despacho'));
      }
    });
  }

  public cargarInsumosPorServicios(): void {
    this.ejecutarCargaInsumosServicios();
  }

  private ejecutarCargaInsumosServicios(servicioIds?: number[]): void {
    this.cargandoInsumosServicios = true;

    const applyRes = (res: any) => {
      this.cargandoInsumosServicios = false;
      if (res) {
        this.infoAgenciaInsumos = res.agencia;
        this.resumenInsumosServicios = res.resumen || {
          totalInsumosRequeridos: 0,
          insumosOptimos: 0,
          insumosBajoMinimo: 0,
          insumosAgotados: 0,
          totalAlertas: 0,
          alertas: []
        };
        this.insumosServiciosList = res.insumos || [];
      } else {
        this.insumosServiciosList = [];
      }
      this.filtrarInsumosServicios();
    };

    if (this.isPulidor) {
      const pulidorId = this.currentUser?.id ? String(this.currentUser.id) : undefined;
      const ids = servicioIds?.length
        ? servicioIds
        : (Array.isArray((this.currentUser as any)?.servicioIds)
          ? (this.currentUser as any).servicioIds
          : undefined);
      this.inventarioService.getInsumosPorServiciosPulidor(pulidorId, ids).subscribe({
        next: applyRes,
        error: (err) => {
          this.cargandoInsumosServicios = false;
          console.error('Error al cargar insumos del pulidor:', err);
        }
      });
      return;
    }

    if (!this.miAgenciaId) {
      this.cargandoInsumosServicios = false;
      return;
    }

    this.inventarioService.getInsumosPorServiciosAgencia(this.miAgenciaId, servicioIds).subscribe({
      next: applyRes,
      error: (err) => {
        this.cargandoInsumosServicios = false;
        console.error('Error al cargar insumos por servicios:', err);
      }
    });
  }

  public filtrarInsumosServicios(): void {
    let list = [...(this.insumosServiciosList || [])];
    if (this.filtroTextoInsumosServicio.trim()) {
      const q = this.filtroTextoInsumosServicio.toLowerCase();
      list = list.filter((i: any) =>
        i.nombre?.toLowerCase().includes(q) ||
        i.codigoSKU?.toLowerCase().includes(q) ||
        i.serviciosQueLoUsan?.some((s: any) => s.nombre?.toLowerCase().includes(q))
      );
    }
    if (this.filtroEstadoInsumosServicio) {
      list = list.filter((i: any) => i.estado === this.filtroEstadoInsumosServicio);
    }
    this.insumosServiciosFiltrados = list;
  }

  public solicitarReabastecimiento(item: any): void {
    const stockAct = Number(item.stockActual || 0);
    const nivel = stockAct <= 0 ? 'AGOTADO' : 'BAJO';
    const payload = {
      insumoId: String(item.id || item.insumoId),
      nivel: nivel as any,
      sucursalId: this.miAgenciaId ? String(this.miAgenciaId) : undefined,
      mensaje: `Solicitud de reabastecimiento manual desde ${this.miAgenciaNombre || 'sede'}. Stock actual: ${stockAct} ${item.unidadMedida || 'u'}.`,
      stockReportado: stockAct,
    };

    this.inventarioService.crearAlerta(payload).subscribe({
      next: () => {
        this.toast.success(
          'Solicitud Enviada a Bodega',
          `Se generó la alerta de reabastecimiento en base de datos para ${item.nombre}.`
        );
        this.cargarAlertasStock();
      },
      error: (err) => {
        this.toast.error('Error', err?.error?.message || 'No se pudo registrar la alerta en base de datos');
      },
    });
  }

  public cargarTodosLosCatalogos(): void {
    this.cargarTiposProducto();
    this.cargarUnidadesMedida();
    this.cargarTiposMovimiento();
    this.cargarProductos();
    this.cargarDashboardResumen();
    // El Kardex, el stock bajo, el de bodega y el de agencias son datos de pestaña: se piden con `cargarDatosDeTab`
    // al abrir cada una (antes también se pedían aquí, todos de golpe y otra vez al entrar a su pestaña).
  }

  public cargarTiposProducto(): void {
    this.inventarioService.getTiposProducto().subscribe((tipos) => {
      this.tiposProducto = tipos;
    });
  }

  public cargarUnidadesMedida(): void {
    this.inventarioService.getUnidadesMedida().subscribe((unidades) => {
      this.unidadesMedida = unidades;
    });
  }


  public cargarTiposMovimiento(): void {
    this.inventarioService.getTiposMovimiento().subscribe((tipos) => {
      this.tiposMovimiento = tipos;
    });
  }

  private obtenerBodegaIdContexto(): string {
    if (this.operaBodegaPropia) {
      return String(this.currentUser?.bodegaId || this.bodegaSeleccionadaId || '').trim();
    }
    return String(
      this.bodegaSeleccionadaId || this.bodegaSeleccionada?.id || this.currentUser?.bodegaId || this.obtenerIdBodegaCentral() || '',
    ).trim();
  }

  /** Contexto del stock que se muestra: la sede (si es de sede) o la bodega elegida. */
  private dtoContextoProductos(): { agenciaId?: string; bodegaId?: string } {
    const dto: { agenciaId?: string; bodegaId?: string } = {};
    if (this.isOperador && this.miAgenciaId) {
      dto.agenciaId = this.miAgenciaId;
    } else {
      const bodegaId = this.obtenerBodegaIdContexto();
      if (bodegaId) dto.bodegaId = bodegaId;
    }
    return dto;
  }

  /**
   * Catálogo completo para los selectores y formularios (modo heredado: hasta 100). La tabla de la pestaña Productos
   * se pide aparte, paginada, y aquí solo se refresca si ya está en uso.
   */
  public cargarProductos(): void {
    this.inventarioService.getProductos(this.dtoContextoProductos()).subscribe((prods) => {
      this.productos = prods;
      this.filtrarProductos();
    });
    if (this.activeTab === 'productos' || this.productosTabla.inicializada) this.productosTabla.refrescar();
  }

  // ── Tabla de productos: páginas numeradas, orden, búsqueda y filtros en el servidor ──
  readonly columnasProductos: TableColumn[] = [
    { key: 'sku', label: 'Código SKU', sortable: true, defaultSort: 'asc' },
    { key: 'nombre', label: 'Producto', sortable: true, defaultSort: 'asc' },
    { key: 'tipo', label: 'Tipo', sortable: true, defaultSort: 'asc' },
    { key: 'contenido', label: 'Contenido x Envase', sortable: true, defaultSort: 'desc' },
    { key: 'stockUnidades', label: 'Stock en Unidades' },
    { key: 'stock', label: 'Stock Contenido Total', sortable: true, defaultSort: 'asc' },
    { key: 'stockMinimoBodega', label: 'Stock Mín. Bodega', sortable: true, defaultSort: 'desc' },
    { key: 'stockOptimoBodega', label: 'Stock Óptimo Bodega', sortable: true, defaultSort: 'desc' },
    { key: 'stockMinimoAgencia', label: 'Stock Mín. Agencia', sortable: true, defaultSort: 'desc' },
    { key: 'stockOptimoAgencia', label: 'Stock Óptimo Agencia', sortable: true, defaultSort: 'desc' },
    { key: 'alerta', label: 'Alerta de Stock', sortable: true, defaultSort: 'asc' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
    { key: 'acciones', label: 'Acciones', align: 'right', sticky: true },
  ];
  readonly productosTabla = new TablaServidor<ProductoInsumo>((c) =>
    this.inventarioService.getProductosPagina({ ...c, ...this.dtoContextoProductos(), ...this.filtrosProductosServidor() }),
  );

  private filtrosProductosServidor(): { tipoProductoId?: string; estado?: number; nivelStock?: string } {
    return {
      tipoProductoId: this.filtroTipoProductoId || undefined,
      estado: this.filtroEstadoProducto === 'activo' ? 1 : this.filtroEstadoProducto === 'inactivo' ? 0 : undefined,
      nivelStock: this.filtroAlertaStock || undefined,
    };
  }

  /** Al abrir la pestaña Productos se pide (una sola vez) su tabla. */
  public abrirProductos(): void {
    if (!this.productosTabla.inicializada && !this.productosTabla.cargando) this.productosTabla.reiniciar();
  }

  /** Cambió un selector de la barra de filtros: vuelve a la primera página. */
  public reiniciarProductos(): void {
    this.productosTabla.reiniciar();
  }

  public filtrarProductos(): void {
    let list = [...this.productos];
    if (this.filtroTextoProducto.trim()) {
      const q = this.filtroTextoProducto.toLowerCase();
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.codigoSKU.toLowerCase().includes(q) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(q))
      );
    }
    if (this.filtroTipoProductoId) {
      list = list.filter((p) => p.tipoProductoId === this.filtroTipoProductoId);
    }
    if (this.filtroAlertaStock) {
      list = list.filter((p) => {
        const info = this.getInfoAlertaStock(p);
        if (this.filtroAlertaStock === 'alerta_total') {
          return info.nivel === 'agotado' || info.nivel === 'critico';
        }
        return info.nivel === this.filtroAlertaStock;
      });
    }
    if (this.filtroEstadoProducto === 'activo') {
      list = list.filter((p) => !!p.activo);
    } else if (this.filtroEstadoProducto === 'inactivo') {
      list = list.filter((p) => !p.activo);
    }
    this.productosFiltrados = list;
  }

  private alertaStockCache = new WeakMap<ProductoInsumo, { nivel: string; label: string; badgeClass: string; icon: string }>();

  public getInfoAlertaStock(p: ProductoInsumo): { nivel: string; label: string; badgeClass: string; icon: string } {
    if (!p) {
      return { nivel: 'optimo', label: 'Stock Óptimo', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: 'check-circle' };
    }
    const cached = this.alertaStockCache.get(p);
    if (cached) return cached;

    const stock = Number(p.stockActual) || 0;
    const min = Number(p.stockMinimoBodega) || 0;
    const opt = Number(p.stockOptimoBodega) || (min * 2) || 10;

    let res: { nivel: string; label: string; badgeClass: string; icon: string };
    if (stock <= 0) {
      res = {
        nivel: 'agotado',
        label: 'Agotado (Sin Existencias)',
        badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
        icon: 'x-circle',
      };
    } else if (stock <= min) {
      res = {
        nivel: 'bajo_minimo',
        label: 'Bajo Mínimo (Crítico)',
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
        icon: 'alert-triangle',
      };
    } else if (stock < opt) {
      res = {
        nivel: 'moderado',
        label: 'Stock Moderado',
        badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: 'alert-circle',
      };
    } else {
      res = {
        nivel: 'optimo',
        label: 'Stock Óptimo',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        icon: 'check-circle',
      };
    }

    this.alertaStockCache.set(p, res);
    return res;
  }

  public cargarDashboardResumen(): void {
    this.inventarioService.getDashboardResumen().subscribe((res) => {
      this.resumenDashboard = res;
    });
  }

  /** Vuelve a pedir la página actual del Kardex con los filtros vigentes (también tras registrar un movimiento). */
  public cargarHistorialMovimientos(): void {
    this.cargaMovimientosSub?.unsubscribe();
    this.cargandoMovimientos = true;
    this.errorMovimientos = null;
    this.cargaMovimientosSub = this.inventarioService
      .getMovimientosPagina({
        page: this.paginaMovimientos,
        pageSize: this.pageSizeMovimientos,
        sortField: this.sortFieldMovimientos,
        sortOrder: this.sortOrderMovimientos,
        search: this.busquedaMovimientosAplicada,
        tipoMovimientoId: this.filtroMovimientoTipoId || undefined,
        insumoId: this.filtroMovimientoInsumoId || undefined,
        fechaDesde: this.inicioDelDiaIso(this.filtroMovimientoFechaDesde),
        fechaHasta: this.finDelDiaIso(this.filtroMovimientoFechaHasta),
      })
      .subscribe({
        next: ({ pagina }) => {
          // Si la página quedó vacía (cambió lo último de la lista) se retrocede a la última que exista.
          if (pagina.items.length === 0 && this.paginaMovimientos > 1 && pagina.total > 0) {
            this.paginaMovimientos = Math.max(1, pagina.totalPages);
            this.cargarHistorialMovimientos();
            return;
          }
          this.historialMovimientos = pagina.items;
          this.totalMovimientos = pagina.total;
          this.paginaMovimientos = pagina.page;
          this.cargandoMovimientos = false;
        },
        error: (err) => {
          this.historialMovimientos = [];
          this.totalMovimientos = 0;
          this.errorMovimientos = err?.error?.message || 'No se pudo cargar el historial de movimientos.';
          this.cargandoMovimientos = false;
        },
      });
  }

  public onTablaMovimientosCambio(q: ConsultaTabla): void {
    this.paginaMovimientos = q.page;
    this.pageSizeMovimientos = q.pageSize;
    this.sortFieldMovimientos = q.sortField || 'fecha';
    this.sortOrderMovimientos = q.sortOrder;
    this.cargarHistorialMovimientos();
  }

  /** Cambiar un filtro vuelve a la primera página. */
  public alCambiarFiltroMovimientos(): void {
    this.paginaMovimientos = 1;
    this.cargarHistorialMovimientos();
  }

  public onBusquedaMovimientos(texto: string): void {
    this.busquedaMovimientos = texto;
    const limpio = (texto || '').trim();
    // Con una sola letra no se consulta (y se conserva la búsqueda anterior); vacío quita el filtro.
    this.busquedaMovimientosCorta = limpio.length > 0 && limpio.length < BUSQUEDA_MIN_CARACTERES;
    if (this.busquedaMovimientosCorta) return;
    this.busquedaMovimientos$.next(limpio);
  }

  get hayFiltrosMovimientos(): boolean {
    return !!(
      this.filtroMovimientoTipoId ||
      this.filtroMovimientoInsumoId ||
      this.filtroMovimientoFechaDesde ||
      this.filtroMovimientoFechaHasta ||
      this.busquedaMovimientosAplicada
    );
  }

  public limpiarFiltrosMovimientos(): void {
    this.filtroMovimientoTipoId = '';
    this.filtroMovimientoInsumoId = '';
    this.filtroMovimientoFechaDesde = '';
    this.filtroMovimientoFechaHasta = '';
    this.busquedaMovimientos = '';
    this.busquedaMovimientosCorta = false;
    this.busquedaMovimientosAplicada = '';
    this.alCambiarFiltroMovimientos();
  }

  /** "2026-09-01" (campo de fecha) → inicio de ese día en la hora local, en ISO. */
  private inicioDelDiaIso(fecha: string): string | undefined {
    if (!fecha) return undefined;
    const d = new Date(`${fecha}T00:00:00`);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  private finDelDiaIso(fecha: string): string | undefined {
    if (!fecha) return undefined;
    const d = new Date(`${fecha}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  public getLabelTipoMovimiento(m: {
    tipoMovimiento?: { codigo?: string; nombre?: string };
  }): string {
    const codigo = (m?.tipoMovimiento?.codigo || '').toUpperCase();
    const map: Record<string, string> = {
      ENTRY: 'Ingreso',
      CONSUMPTION: 'Consumo',
      POSITIVE_ADJUSTMENT: 'Ajuste (+)',
      NEGATIVE_ADJUSTMENT: 'Ajuste (−)',
      WASTE: 'Merma',
      RETURN: 'Devolución',
      TRANSFER: 'Envío / Transferencia',
    };
    return map[codigo] || m?.tipoMovimiento?.nombre || 'Movimiento';
  }

  public getClaseTipoMovimiento(m: {
    tipoMovimiento?: { codigo?: string; esEntrada?: boolean };
  }): string {
    const codigo = (m?.tipoMovimiento?.codigo || '').toUpperCase();
    if (codigo === 'TRANSFER') {
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    }
    if (codigo === 'WASTE' || codigo === 'NEGATIVE_ADJUSTMENT') {
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    }
    if (m?.tipoMovimiento?.esEntrada) {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  }

  // ── Stock bajo en bodega: páginas numeradas, orden y búsqueda en el servidor ──
  readonly columnasStockBajo: TableColumn[] = [
    { key: 'sku', label: 'SKU', sortable: true, defaultSort: 'asc' },
    { key: 'nombre', label: 'Producto', sortable: true, defaultSort: 'asc' },
    { key: 'tipo', label: 'Tipo', sortable: true, defaultSort: 'asc' },
    { key: 'contenido', label: 'Contenido x Envase' },
    { key: 'stockUnidades', label: 'Stock en Unidades' },
    { key: 'stock', label: 'Stock Contenido', sortable: true, defaultSort: 'asc' },
    { key: 'minimo', label: 'Stock Mínimo', sortable: true, defaultSort: 'desc' },
    { key: 'deficit', label: 'Déficit', sortable: true, defaultSort: 'desc' },
    { key: 'acciones', label: 'Acción', align: 'right', sticky: true },
  ];
  /** Por defecto el servidor muestra primero el de menor stock. */
  readonly stockBajoTabla = new TablaServidor<ProductoInsumo>((c) => this.inventarioService.getStockBajoPagina(c));
  readonly claseFilaStockBajo = (): string => 'hover:bg-rose-50/30';

  public cargarStockBajo(): void {
    if (!this.puedeVerStockBajoBodegaCentral) return;
    this.stockBajoTabla.refrescar();
  }

  /**
   * Pide el resumen de la pestaña dada la primera vez que se entra a ella (bodegas/agencias/stock bajo/alertas
   * usan esto). Antes `ngOnInit` pedía el resumen de las 5 pestañas de golpe, sin importar cuál se iba a ver.
   */
  private readonly tabsInventarioCargadas = new Set<string>();
  cargarDatosDeTab(tab: string): void {
    if (this.tabsInventarioCargadas.has(tab)) return;
    this.tabsInventarioCargadas.add(tab);
    switch (tab) {
      case 'bodegas': this.cargarStockBodega(); break;
      case 'agencias': this.cargarStockAgencias(); break;
      case 'pulidores': this.cargarStockPulidoresResumen(); break;
      case 'stock_bajo': this.cargarStockBajo(); break;
      case 'alertas_reabastecimiento': this.cargarAlertasStock(); break;
      case 'movimientos': this.cargarHistorialMovimientos(); break;
    }
  }

  // ── Alertas de stock: páginas numeradas, orden, búsqueda y filtros en el servidor ──
  readonly columnasAlertas: TableColumn[] = [
    { key: 'sede', label: 'Sucursal / Región', sortable: true, defaultSort: 'asc' },
    { key: 'insumo', label: 'Insumo Requerido', sortable: true, defaultSort: 'asc' },
    { key: 'nivel', label: 'Nivel Alerta', sortable: true, defaultSort: 'desc' },
    { key: 'mensaje', label: 'Detalle Reportado' },
    { key: 'fecha', label: 'Fecha Reporte', sortable: true, defaultSort: 'desc' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
    { key: 'acciones', label: 'Acciones', align: 'right', sticky: true },
  ];
  readonly alertasTabla = new TablaServidor<any, ResumenAlertas>((c) =>
    this.inventarioService.getAlertasPagina({ ...c, ...this.filtrosAlertasServidor() }),
  );

  private filtrosAlertasServidor(): { grupoNivel?: string; agenciaId?: string; sucursalId?: string } {
    const f: { grupoNivel?: string; agenciaId?: string; sucursalId?: string } = {};
    if (this.filtroAlertaNivel) f.grupoNivel = this.filtroAlertaNivel;
    // El servidor limita al líder a su sede de todos modos; aquí se envía para dejarlo explícito.
    if (this.operaDesdeAgencia && this.miAgenciaId) {
      f.sucursalId = this.miAgenciaId;
      f.agenciaId = this.miAgenciaId;
    }
    return f;
  }

  get mensajeSinAlertas(): string {
    if (this.filtroAlertaNivel) return 'No hay alertas que coincidan con los filtros aplicados.';
    if (this.operaDesdeAgencia) return 'No hay alertas de stock bajo pendientes en tu sede.';
    if (this.operaBodegaPropia) return 'No hay alertas de stock bajo pendientes en las sucursales de tu región.';
    return 'No hay alertas de stock bajo pendientes en las sucursales.';
  }

  /**
   * Genera en el servidor las alertas de insumos requeridos sin stock (el listado paginado ya no escribe) y recarga la
   * bandeja. forzar: ignora el límite de frecuencia (botón "Actualizar").
   */
  public cargarAlertasStock(forzar = false): void {
    if (!this.puedeVerAlertas) return;
    // Sincronizar alertas exige 'alertas.atender'; quien solo puede ver, solo recarga la lista.
    if (!this.puedeAtenderAlertas) {
      this.alertasTabla.reiniciar();
      return;
    }
    this.cargandoAlertasStock = true;
    this.inventarioService.sincronizarAlertas(forzar).subscribe(() => {
      this.cargandoAlertasStock = false;
      this.alertasTabla.reiniciar();
    });
  }

  /** Cambió el filtro de nivel: vuelve a la primera página. */
  public reiniciarAlertas(): void {
    this.alertasTabla.reiniciar();
  }

  public abrirDespachoDesdeAlerta(alerta: any): void {
    if (!alerta) return;

    if (alerta.pulidor?.id) {
      const pulidorId = String(alerta.pulidor.id);
      if (!this.pulidoresDestinoDisponibles.some((p) => String(p.id) === pulidorId)) {
        this.pulidoresDestinoDisponibles = [
          ...this.pulidoresDestinoDisponibles,
          {
            id: pulidorId,
            nombre:
              `${alerta.pulidor.name || ''} ${alerta.pulidor.lastname || ''}`.trim() ||
              pulidorId,
          },
        ];
      }

      this.abrirModalDespachoAgencia(undefined, alerta.insumo);
      if (!this.modalDespachoAgenciaOpen) return;
      this.modoDespachoDestino = 'pulidor';
      this.agenciaDespachoFija = null;
      this.despachoAgenciaForm.agenciaId = '';
      this.despachoAgenciaForm.bodegaId = '';
      this.despachoAgenciaForm.pulidorId = pulidorId;
      this.despachoAgenciaForm.observacion =
        `Despacho por alerta al kit de ${alerta.pulidor.name || 'pulidor'} ${alerta.pulidor.lastname || ''}`.trim();
      return;
    }

    this.abrirModalDespachoAgencia(alerta.agencia, alerta.insumo);
  }

  public resolverAlerta(alerta: any): void {
    if (!alerta?.id) return;
    this.inventarioService.atenderAlertaStock({ id: alerta.id, estado: 'RESUELTO', observacion: 'Atendida desde bandeja' }).subscribe({
      next: () => {
        this.toast.success('Alerta resuelta', 'La alerta de stock bajo ha sido atendida correctamente.');
        this.cargarAlertasStock();
      },
      error: (err: any) => this.toast.error('Error', this.mensajeServidor(err, 'No se pudo actualizar el estado de la alerta.'))
    });
  }

  public cargarBodegasDisponibles(): void {
    this.cargandoBodegas = true;
    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => {
        const todas = bodegas || [];
        const miBodegaId = String(this.currentUser?.bodegaId || '').trim();

        if (this.operaBodegaPropia) {
          // Solo su bodega asignada
          const propia = miBodegaId ? todas.filter((b) => String(b.id) === miBodegaId) : [];
          this.bodegasDisponibles = propia.length > 0 ? propia : todas.filter((b) => !b.esCentral && b.tipo !== 'CENTRAL');
          if (this.bodegasDisponibles.length > 0) {
            this.bodegaSeleccionadaId = String(this.bodegasDisponibles[0].id);
          }
        } else {
          this.bodegasDisponibles = todas;
          if (this.bodegasDisponibles.length > 0) {
            const match = this.bodegasDisponibles.find((b) => b.id === this.bodegaSeleccionadaId);
            if (!match) {
              this.bodegaSeleccionadaId = this.bodegasDisponibles[0].id;
            }
          }
        }

        this.bodegaSeleccionada =
          this.bodegasDisponibles.find((b) => b.id === this.bodegaSeleccionadaId) ||
          this.bodegasDisponibles[0] ||
          null;
        this.cargandoBodegas = false;
        this.cargarStockBodega(this.bodegaSeleccionadaId);
        this.cargarProductos();
      },
      error: (err) => {
        this.cargandoBodegas = false;
        console.error('Error al consultar bodegas:', err);
      },
    });
  }

  public cargarRegiones(): void {
    this.regionService.getRegionesLista().subscribe({
      next: (regs) => {
        this.regionesDisponibles = (regs || []).filter((r) => r.estado === 'Activa' || (r.estado as any) === 1);
        if (!this.bodegaForm.regionId && this.regionesDisponibles.length > 0) {
          this.bodegaForm.regionId = this.regionesDisponibles[0].id;
        }
      },
      error: (err) => console.error('Error al cargar regiones:', err),
    });
  }

  public abrirModalCrearBodega(): void {
    this.editandoBodega = null;
    this.cargarRegiones();
    const primeraRegion = this.regionesDisponibles[0]?.id || '';
    this.bodegaForm = {
      nombre: '',
      codigo: '',
      regionId: primeraRegion,
      tipo: 'REGIONAL' as 'CENTRAL' | 'REGIONAL',
      ciudad: '',
      direccion: '',
      telefono: '',
      porcentajeAlerta: 20,
    };
    this.modalBodegaOpen = true;
  }

  public abrirModalEditarBodega(bod: BodegaInventario): void {
    this.editandoBodega = bod;
    this.cargarRegiones();
    const regMatch = this.regionesDisponibles.find(
      (r) => r.id === bod.regionId || r.nombre.toLowerCase() === (bod.region || '').toLowerCase()
    );
    this.bodegaForm = {
      nombre: bod.nombre,
      codigo: bod.codigo,
      regionId: bod.regionId || regMatch?.id || this.regionesDisponibles[0]?.id || '',
      tipo: (bod.tipo === 'CENTRAL' || bod.esCentral) ? 'CENTRAL' : 'REGIONAL',
      ciudad: bod.ciudad || '',
      direccion: bod.direccion || '',
      telefono: bod.telefono || '',
      porcentajeAlerta: Number(bod.porcentajeAlerta || 20),
    };
    this.modalBodegaOpen = true;
  }

  public guardarBodega(): void {
    if (!this.bodegaForm.nombre?.trim()) {
      this.toast.warning('Nombre requerido', 'Debe ingresar el nombre de la bodega.');
      return;
    }

    if (this.bodegaForm.tipo !== 'CENTRAL' && !this.bodegaForm.regionId) {
      this.toast.warning('Región obligatoria', 'Cada bodega regional debe estar vinculada a una región.');
      return;
    }

    this.guardandoBodega = true;

    if (this.editandoBodega) {
      this.inventarioService
        .actualizarBodega({
          id: this.editandoBodega.id,
          nombre: this.bodegaForm.nombre.trim(),
          codigo: this.bodegaForm.codigo?.trim() || undefined,
          regionId: this.bodegaForm.tipo === 'CENTRAL' ? (this.bodegaForm.regionId || undefined) : this.bodegaForm.regionId,
          tipo: this.bodegaForm.tipo,
          ciudad: this.bodegaForm.ciudad?.trim() || undefined,
          direccion: this.bodegaForm.direccion?.trim() || undefined,
          telefono: this.bodegaForm.telefono?.trim() || undefined,
          porcentajeAlerta: Number(this.bodegaForm.porcentajeAlerta) || 20,
        })
        .subscribe({
          next: (res) => {
            this.guardandoBodega = false;
            this.modalBodegaOpen = false;
            this.toast.success('Bodega Actualizada', res.message || 'Bodega actualizada correctamente.');
            this.cargarBodegasDisponibles();
          },
          error: (err) => {
            this.guardandoBodega = false;
            console.error('Error al actualizar bodega:', err);
            this.toast.error('Error', err.error?.message || 'No se pudo actualizar la bodega.');
          },
        });
    } else {
      this.inventarioService
        .crearBodega({
          nombre: this.bodegaForm.nombre.trim(),
          codigo: this.bodegaForm.codigo?.trim() || undefined,
          regionId: this.bodegaForm.tipo === 'CENTRAL' ? (this.bodegaForm.regionId || undefined) : this.bodegaForm.regionId,
          tipo: this.bodegaForm.tipo,
          ciudad: this.bodegaForm.ciudad?.trim() || undefined,
          direccion: this.bodegaForm.direccion?.trim() || undefined,
          telefono: this.bodegaForm.telefono?.trim() || undefined,
          porcentajeAlerta: Number(this.bodegaForm.porcentajeAlerta) || 20,
        })
        .subscribe({
          next: (res) => {
            this.guardandoBodega = false;
            this.modalBodegaOpen = false;
            this.toast.success('Bodega Registrada', res.message || 'Bodega creada exitosamente.');
            this.cargarBodegasDisponibles();
          },
          error: (err) => {
            this.guardandoBodega = false;
            console.error('Error al crear bodega:', err);
            this.toast.error('Error', err.error?.message || 'No se pudo registrar la bodega.');
          },
        });
    }
  }

  public eliminarBodega(bod: BodegaInventario): void {
    if (bod.esCentral || bod.tipo === 'CENTRAL') {
      this.toast.warning('Acción no permitida', 'La Bodega Central Nacional no puede eliminarse.');
      return;
    }

    if (!confirm(`¿Está seguro de eliminar la bodega "${bod.nombre}"? Esta acción removerá el almacén del sistema.`)) {
      return;
    }

    this.inventarioService.eliminarBodega(bod.id).subscribe({
      next: (res) => {
        this.toast.success('Bodega Eliminada', res.message || 'Bodega eliminada correctamente.');
        this.cargarBodegasDisponibles();
      },
      error: (err) => {
        console.error('Error al eliminar bodega:', err);
        this.toast.error('Error', err.error?.message || 'No se pudo eliminar la bodega.');
      },
    });
  }

  public cargarUsuariosYAsistentes(): void {
    this.usuarioService.getUsuarios(true).subscribe({
      next: (usuarios) => {
        this.todosLosUsuarios = usuarios || [];
      },
      error: (err) => console.error('Error al cargar usuarios:', err),
    });
  }

  public seleccionarBodega(bodegaId: string): void {
    this.bodegaSeleccionadaId = bodegaId;
    this.bodegaSeleccionada = this.bodegasDisponibles.find((b) => b.id === bodegaId) || null;
    // Limpiar tabla de inmediato para no mostrar stock de otra bodega mientras carga
    this.bodegaTabla.limpiar();
    this.resumenBodegas = {
      bodega: this.bodegaSeleccionada,
      metricas: { totalInsumos: 0, stockTotalUnidades: 0, insumosBajoMinimo: 0, insumosOptimos: 0 },
      insumos: [],
    };
    this.bodegaConsultadaId = String(bodegaId || '').trim();
    this.cargarStockBodega(bodegaId);
    this.cargarProductos();
  }

  // ── Insumos de la bodega: páginas numeradas, orden, búsqueda y estado en el servidor ──
  readonly columnasBodega: TableColumn[] = [
    { key: 'sku', label: 'Código SKU', sortable: true, defaultSort: 'asc' },
    { key: 'nombre', label: 'Producto', sortable: true, defaultSort: 'asc' },
    { key: 'tipo', label: 'Tipo', sortable: true, defaultSort: 'asc' },
    { key: 'contenido', label: 'Contenido x Envase', sortable: true, defaultSort: 'desc' },
    { key: 'stockUnidades', label: 'Stock en Unidades' },
    { key: 'stock', label: 'Stock Contenido Total', sortable: true, defaultSort: 'asc' },
    { key: 'minimo', label: 'Stock Mínimo', sortable: true, defaultSort: 'desc' },
    { key: 'umbral', label: 'Umbral Alerta (% config)' },
    { key: 'optimo', label: 'Stock Óptimo', sortable: true, defaultSort: 'desc' },
    { key: 'estado', label: 'Estado / Nivel Alerta', sortable: true, defaultSort: 'asc' },
    { key: 'acciones', label: 'Acciones', align: 'right', sticky: true },
  ];
  /** Bodega que consulta la tabla (la fija `cargarStockBodega`). */
  private bodegaConsultadaId = '';
  readonly bodegaTabla = new TablaServidor<any, MetaBodega>((c) => {
    const pedida = this.bodegaConsultadaId;
    return this.inventarioService
      .getStockBodegaPagina({ ...c, bodegaId: pedida, estado: this.filtroEstadoBodega || undefined })
      .pipe(tap(({ resumen }) => this.alRecibirBodega(resumen, pedida)));
  });

  /** Cada página trae la bodega y las métricas de todos sus insumos; aquí se conservan para las tarjetas y el encabezado. */
  private alRecibirBodega(meta: MetaBodega | undefined, pedida: string): void {
    if (!meta || pedida !== this.bodegaConsultadaId) return; // respuesta atrasada de otra bodega
    if (meta.bodega?.id && String(meta.bodega.id) !== String(pedida)) return;
    this.resumenBodegas = { bodega: meta.bodega ?? this.bodegaSeleccionada, bodegas: meta.bodegas, metricas: meta.metricas, insumos: [] };
    if (meta.bodega) {
      this.bodegaSeleccionada = meta.bodega;
      this.bodegaSeleccionadaId = meta.bodega.id;
    }
  }

  public cargarStockBodega(bodegaId?: string): void {
    const id = (bodegaId || this.bodegaSeleccionadaId || '').toString().trim();
    if (!id) return;
    this.bodegaConsultadaId = id;
    this.bodegaTabla.refrescar();
  }

  /** Cambió el filtro de estado de la bodega: vuelve a la primera página. */
  public reiniciarBodega(): void {
    if (this.bodegaConsultadaId) this.bodegaTabla.reiniciar();
  }

  public getAsistentesDeBodega(bodega: BodegaInventario | null): Usuario[] {
    if (!bodega || !this.todosLosUsuarios || this.todosLosUsuarios.length === 0) return [];

    return this.todosLosUsuarios.filter((u) => {
      const rol = (u.rol || u.rolNombre || '').toUpperCase();
      const esAsistente =
        rol.includes('ASISTENTE') || rol.includes('BODEGA') || rol === 'ASISTENTE_BODEGA';
      if (!esAsistente) return false;

      // Si es bodega central
      if (bodega.esCentral || bodega.id === 'bod_central') {
        const ag = (u.agencia || u.sucursal || '').toLowerCase();
        const reg = (u.region || '').toLowerCase();
        return (
          ag.includes('central') ||
          ag.includes('corporativo') ||
          reg.includes('nacional') ||
          reg.includes('pichincha') ||
          !u.regionId ||
          ag.includes('bodega')
        );
      }

      // Si es bodega regional (Costa, Sierra, Austro, etc.)
      const bodRegion = (bodega.region || '').toLowerCase();
      const bodNombre = (bodega.nombre || '').toLowerCase();
      const bodCiudad = (bodega.ciudad || '').toLowerCase();

      const userRegion = (u.region || '').toLowerCase();
      const userAgencia = (u.agencia || u.sucursal || '').toLowerCase();

      const matchRegionId =
        bodega.regionId && u.regionId && String(bodega.regionId) === String(u.regionId);
      const matchRegionName =
        bodRegion && userRegion && (userRegion.includes(bodRegion) || bodRegion.includes(userRegion));
      const matchAgencia =
        userAgencia.includes(bodRegion) ||
        userAgencia.includes(bodCiudad) ||
        userAgencia.includes(bodNombre);

      return matchRegionId || matchRegionName || matchAgencia;
    });
  }

  public getBodegasParaVisualizacion(): BodegaInventario[] {
    const soloSuRegion = this.operaBodegaPropia;
    const userRegion = (this.currentUser?.region || this.currentUser?.regionNombre || '').toLowerCase().trim();
    const userRegionId = (this.currentUser as any)?.regionId;

    if (soloSuRegion && (userRegion || userRegionId)) {
      const asignadas = this.bodegasDisponibles.filter(
        (b) =>
          (userRegionId && b.regionId && String(b.regionId) === String(userRegionId)) ||
          (userRegion && b.region && b.region.toLowerCase().includes(userRegion)) ||
          (userRegion && b.ciudad && b.ciudad.toLowerCase().includes(userRegion))
      );
      if (asignadas.length > 0) return asignadas;
    }

    // Admin, SuperAdmin, Gestor de Inventario (COORD_BODEGA): todas las bodegas creadas a nivel nacional
    return this.bodegasDisponibles;
  }

  public getLabelEstadoBodega(item: { estado?: string; porcentajeAlerta?: number }): string {
    if (item.estado === 'Crítico') return 'Crítico (< Mín)';
    if (item.estado === 'Bajo') return `Stock Bajo (Umbral ${item.porcentajeAlerta || 20}%)`;
    if (item.estado === 'No necesario') return 'No necesario';
    return item.estado || 'Óptimo';
  }

  public getLabelEstadoInsumoServicio(estado?: string): string {
    switch (estado) {
      case 'OPTIMO':
        return 'Stock Óptimo';
      case 'BAJO':
        return 'Bajo Mínimo';
      case 'CRITICO':
        return 'Crítico';
      case 'AGOTADO':
        return 'Agotado';
      case 'NO_NECESARIO':
        return 'No necesario';
      default:
        return estado || '—';
    }
  }

  // ── Fichas de agencias (scroll infinito) y sus insumos (tabla al expandir) ──
  readonly agenciasLista = new ListaInfinita<any>(
    (page, size) =>
      this.inventarioService
        .getAgenciasFichasPagina({
          page,
          pageSize: size,
          search: this.busquedaAgenciasAplicada,
          estadoUbicacion: (this.filtroEstadoAgencia as 'alerta' | 'optimo' | '') || undefined,
          // "Otras agencias": quien opera una sede no ve la propia en la lista.
          excluirAgenciaId: this.isOperador && this.miAgenciaId ? this.miAgenciaId : undefined,
        })
        .pipe(
          tap(({ pagina, metricas }) => {
            if (metricas) this.resumenAgencias = { ...this.resumenAgencias, ...metricas };
            // Con pocas fichas se muestran abiertas para no obligar a un clic por cada una.
            if (pagina.page === 1 && pagina.total <= 3) pagina.items.forEach((a) => this.agenciasExpandidas.add(String(a.agencia?.id)));
          }),
          map(({ pagina }) => pagina),
        ),
    PAGE_SIZE_INFINITO,
    (a) => a.agencia?.id,
  );

  public cargarStockAgencias(): void {
    this.agenciasLista.reiniciar();
    this.stockRefreshToken++;
  }

  public reiniciarAgencias(): void {
    this.agenciasLista.reiniciar();
  }

  public onBusquedaAgencias(texto: string): void {
    this.textoAgencias = texto;
    const limpio = texto.trim();
    this.busquedaAgenciasCorta = limpio.length > 0 && limpio.length < BUSQUEDA_MIN_CARACTERES;
    if (!this.busquedaAgenciasCorta) this.busquedaAgencias$.next(limpio);
  }

  public alternarFicha(abiertas: Set<string>, id: string): void {
    const clave = String(id);
    if (abiertas.has(clave)) abiertas.delete(clave);
    else abiertas.add(clave);
  }

  public trackFicha = (_: number, ficha: any): string => String(ficha?.agencia?.id ?? ficha?.id);

  public seleccionarParaDespachoAgencia(agencia: any, insumo: any): void {
    this.abrirModalDespachoAgencia(agencia, insumo);
  }

  // ==============================================================
  // GESTIÓN DE STOCK DE PULIDORES
  // ==============================================================

  // ── Kits de pulidores (scroll infinito) y sus insumos (tabla al expandir) ──
  readonly pulidoresLista = new ListaInfinita<any>(
    (page, size) => {
      const consulta: ConsultaFichas = {
        page,
        pageSize: size,
        search: this.busquedaPulidoresAplicada,
        estadoUbicacion: (this.filtroPulidorEstado as 'alerta' | 'optimo' | '') || undefined,
        tipoPulidor: this.filtroPulidorTipo || undefined,
      };
      // El servidor limita al pulidor a su propio kit y al asistente a su región; aquí se envía para dejarlo explícito.
      if (this.isPulidor && this.currentUser?.id) consulta.pulidorId = String(this.currentUser.id);
      else if (this.operaBodegaPropia && this.currentUser?.regionId) consulta.regionId = String(this.currentUser.regionId);
      return this.inventarioService.getPulidoresFichasPagina(consulta).pipe(
        tap(({ pagina, metricas }) => {
          if (metricas) this.resumenPulidores = { ...this.resumenPulidores, ...metricas };
          if (pagina.page === 1 && pagina.total <= 3) pagina.items.forEach((p) => this.pulidoresExpandidos.add(String(p.id)));
        }),
        map(({ pagina }) => pagina),
      );
    },
    PAGE_SIZE_INFINITO,
    (p) => p.id,
  );

  public cargarStockPulidoresResumen(): void {
    this.pulidoresLista.reiniciar();
    this.stockRefreshToken++;
  }

  public reiniciarPulidores(): void {
    this.pulidoresLista.reiniciar();
  }

  public onBusquedaPulidores(texto: string): void {
    this.textoPulidores = texto;
    const limpio = texto.trim();
    this.busquedaPulidoresCorta = limpio.length > 0 && limpio.length < BUSQUEDA_MIN_CARACTERES;
    if (!this.busquedaPulidoresCorta) this.busquedaPulidores$.next(limpio);
  }

  public abrirDespachoAPulidor(p: any, insumo?: any): void {
    if (p && p.id) {
      const pId = String(p.id);
      if (!this.pulidoresDestinoDisponibles.some((x) => String(x.id) === pId)) {
        this.pulidoresDestinoDisponibles = [
          ...this.pulidoresDestinoDisponibles,
          {
            id: pId,
            nombre: p.nombre || pId,
            email: p.email,
            agenciaId: p.agenciaId || null,
            agenciaNombre: p.agenciaNombre || null,
            regionId: p.regionId || null,
            regionNombre: p.regionNombre || null,
            modalidad: p.tipoPulidor === 'PULIDOR_FIJO' ? 'FIJO' : 'MOVIL',
          },
        ];
      }
    }
    const destinoTipo = p.tipoPulidor === 'PULIDOR_FIJO' ? 'pulidor_fijo' : 'pulidor';
    this.abrirModalDespacho(destinoTipo, undefined, insumo);
    if (p?.id) {
      this.despachoAgenciaForm.pulidorId = String(p.id);
      if (p.tipoPulidor === 'PULIDOR_FIJO' && p.agenciaId) {
        this.despachoAgenciaForm.agenciaId = String(p.agenciaId);
      }
    }
    if (insumo) {
      const insId = String(insumo.insumoId || insumo.id || '');
      this.despachoAgenciaForm.insumoId = insId;
      this.despachoAgenciaForm.insumoNombre = insumo.nombre || '';
      this.despachoAgenciaForm.cantidad = Number(insumo.deficit) > 0 ? Number(insumo.deficit) : (insumo.stockMinimoUnidades || 1);
      this.despachoAgenciaForm.observacion = `Reabastecimiento para kit de ${p.nombre || 'pulidor'}: ${insumo.nombre || ''}`;
      this.productoDespachoFijo = insumo;
    }
  }

  public seleccionarParaDespachoPulidor(pulidor: any, insumo: any): void {
    this.abrirDespachoAPulidor(pulidor, insumo);
  }

  // ==============================================================
  // REGISTRAR ENTRADA
  // ==============================================================

  public getStockEnUnidades(stock: number | undefined | null, contenidoNeto: number | undefined | null): number {
    const s = Number(stock) || 0;
    const c = Number(contenidoNeto) || 1;
    if (c <= 0) return s;
    return Math.round((s / c) * 100) / 100;
  }

  /** Convierte unidades físicas → cantidad en unidad base (ej. 10 und × 4 L = 40 L) */
  public getCantidadDesdeUnidades(unidades: number | undefined | null, contenidoNeto: number | undefined | null): number {
    const u = Number(unidades) || 0;
    const c = Number(contenidoNeto) || 1;
    if (c <= 0) return u;
    return Math.round(u * c * 100) / 100;
  }

  public getEvidenciaReajusteUrl(m: { evidenciasUrls?: string[] | null }): string | null {
    const url = m?.evidenciasUrls?.[0];
    return url && String(url).trim() ? String(url).trim() : null;
  }

  public tituloEvidenciaKardex(m: { tipoMovimiento?: { codigo?: string; nombre?: string } | null; observaciones?: string | null }): string {
    const codigo = String(m?.tipoMovimiento?.codigo || '').toUpperCase();
    const texto = `${m?.tipoMovimiento?.nombre || ''} ${m?.observaciones || ''}`.toUpperCase();
    if (codigo.includes('ADJUST') || texto.includes('REAJUSTE')) return 'Evidencia de reajuste';
    if (codigo === 'ENTRY' || texto.includes('INGRESO')) return 'Evidencia de ingreso';
    return 'Evidencia del movimiento';
  }

  get reajusteContenidoNeto(): number {
    const c = Number(this.itemReajuste?.contenidoNeto || 1);
    return c > 0 ? c : 1;
  }

  get puedeElegirModoReajuste(): boolean {
    return this.reajusteContenidoNeto > 1;
  }

  get cantidadContadaBase(): number {
    const valor = Number(this.formReajuste.cantidadContada);
    if (!Number.isFinite(valor) || valor < 0) return 0;
    if (this.formReajuste.modo === 'unidades') {
      return this.getCantidadDesdeUnidades(valor, this.reajusteContenidoNeto);
    }
    return Math.round(valor * 100) / 100;
  }

  get deltaReajuste(): number {
    const actual = Number(this.itemReajuste?.stockActual || 0);
    return Math.round((this.cantidadContadaBase - actual) * 100) / 100;
  }

  public cambiarModoReajuste(modo: 'unidades' | 'cantidad'): void {
    if (this.formReajuste.modo === modo) return;
    const base = this.cantidadContadaBase;
    this.formReajuste.modo = modo;
    this.formReajuste.cantidadContada = modo === 'unidades'
      ? this.getStockEnUnidades(base, this.reajusteContenidoNeto)
      : base;
  }

  public abrirModalReajuste(item: any): void {
    if (!this.puedeReajustarStock) {
      this.toast.warning('Sin permiso', 'No tienes permiso para reajustar stock.');
      return;
    }
    this.itemReajuste = {
      ...item,
      insumoId: item?.insumoId || item?.id,
      contenidoNeto: Number(item?.contenidoNeto || 1),
      ubicacionLabel: item?.ubicacionLabel
        || item?.bodegaNombre
        || this.bodegaSeleccionada?.nombre
        || 'Bodega',
    };
    const contenido = Number(this.itemReajuste.contenidoNeto || 1);
    const modo: 'unidades' | 'cantidad' = contenido > 1 ? 'unidades' : 'cantidad';
    const actual = Number(item?.stockActual || 0);
    this.formReajuste = {
      modo,
      cantidadContada: modo === 'unidades' ? this.getStockEnUnidades(actual, contenido) : actual,
      motivoTexto: '',
      evidenciaUrl: '',
    };
    this.modalReajusteAbierto = true;
  }

  public abrirModalReajusteAgencia(agencia: any, ins: any): void {
    this.abrirModalReajuste({
      ...ins,
      insumoId: ins?.insumoId || ins?.id,
      agenciaId: agencia?.id,
      ubicacionLabel: agencia?.nombre || 'Agencia',
    });
  }

  public abrirModalReajustePulidor(pulidor: any, ins: any): void {
    this.abrirModalReajuste({
      ...ins,
      insumoId: ins?.insumoId || ins?.id,
      pulidorId: pulidor?.id,
      ubicacionLabel: pulidor?.nombre || 'Pulidor',
    });
  }

  public cerrarModalReajuste(): void {
    if (this.guardandoReajuste) return;
    this.modalReajusteAbierto = false;
    this.itemReajuste = null;
    this.formReajuste = { modo: 'cantidad', cantidadContada: 0, motivoTexto: '', evidenciaUrl: '' };
  }

  public async guardarReajuste(): Promise<void> {
    if (!this.itemReajuste?.insumoId) {
      this.toast.warning('Datos incompletos', 'No se identificó el insumo.');
      return;
    }
    const bodegaId = String(this.itemReajuste.bodegaId || (!this.itemReajuste.agenciaId && !this.itemReajuste.pulidorId ? this.bodegaSeleccionadaId : '') || '').trim();
    const agenciaId = String(this.itemReajuste.agenciaId || '').trim();
    const pulidorId = String(this.itemReajuste.pulidorId || '').trim();
    if (!bodegaId && !agenciaId && !pulidorId) {
      this.toast.warning('Ubicación requerida', 'Indica la bodega, agencia o pulidor a reajustar.');
      return;
    }
    const cantidadContada = this.cantidadContadaBase;
    if (!Number.isFinite(cantidadContada) || cantidadContada < 0) {
      this.toast.warning('Cantidad inválida', 'La cantidad contada debe ser 0 o mayor.');
      return;
    }
    if (this.deltaReajuste === 0) {
      this.toast.warning('Sin cambios', 'La cantidad contada es igual al stock actual.');
      return;
    }
    if (this.formReajuste.motivoTexto.trim().length < 10) {
      this.toast.warning('Detalle requerido', 'Explica por qué se reajusta (mínimo 10 caracteres).');
      return;
    }
    if (!this.formReajuste.evidenciaUrl.trim() && !this.reajusteUploader?.hasPendingUpload) {
      this.toast.warning('Foto requerida', 'Sube la foto de evidencia del conteo.');
      return;
    }

    this.guardandoReajuste = true;
    let evidenciaUrl = this.formReajuste.evidenciaUrl.trim();
    try {
      if (this.reajusteUploader?.hasPendingUpload) {
        evidenciaUrl = String(await this.reajusteUploader.uploadNow() || '').trim();
        this.formReajuste.evidenciaUrl = evidenciaUrl;
      }
    } catch (err: any) {
      this.guardandoReajuste = false;
      this.toast.error('Error al subir la foto', err?.message || 'No se pudo guardar la evidencia en S3.');
      return;
    }
    if (!evidenciaUrl) {
      this.guardandoReajuste = false;
      this.toast.warning('Foto requerida', 'Sube la foto de evidencia del conteo.');
      return;
    }

    this.inventarioService.reajustarStock({
      insumoId: String(this.itemReajuste.insumoId),
      ...(bodegaId ? { bodegaId } : {}),
      ...(agenciaId ? { agenciaId } : {}),
      ...(pulidorId ? { pulidorId } : {}),
      cantidadContada,
      motivoTexto: this.formReajuste.motivoTexto.trim(),
      evidenciaUrl,
    }).subscribe({
      next: (res) => {
        this.guardandoReajuste = false;
        this.toast.success(
          'Reajuste registrado',
          `${res?.numeroComprobante || 'OK'}: ${this.itemReajuste.nombre} ahora tiene ${cantidadContada} ${this.itemReajuste.unidad}.`,
        );
        this.cerrarModalReajuste();
        if (bodegaId) this.cargarStockBodega(bodegaId);
        if (agenciaId) this.cargarStockAgencias();
        if (pulidorId) this.cargarStockPulidoresResumen();
        this.cargarProductos();
        this.cargarDashboardResumen();
        this.cargarHistorialMovimientos();
        this.cargarStockBajo();
      },
      error: (err) => {
        this.guardandoReajuste = false;
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join('. ')
          : (err?.error?.message || 'No se pudo registrar el reajuste.');
        this.toast.error('Error al reajustar', msg);
      },
    });
  }

  // ==============================================================
  // REGISTRAR ENTRADA
  // ==============================================================

  public abrirModalEntrada(prodFijo?: any): void {
    if (!this.puedeRegistrarIngreso) {
      this.toast.warning(
        'Ingreso no permitido',
        'No tienes permiso para registrar compras en la Bodega Central. Las demás bodegas se abastecen por envíos.'
      );
      return;
    }

    // Los ingresos siempre van a Bodega Central
    const bodegaDestino = this.obtenerIdBodegaCentral();

    if (prodFijo) {
      const pId = (prodFijo.id || prodFijo.insumoId || '').toString();
      this.productoEntradaFijo = {
        id: pId,
        nombre: prodFijo.nombre || '',
        codigoSKU: prodFijo.codigoSKU || 'SKU',
        unidadMedida: prodFijo.unidadMedida || prodFijo.unidad || 'u',
        contenidoNeto: Number(prodFijo.contenidoNeto || 1),
        stockActual: Number(prodFijo.stockActual || 0)
      };
      this.formEntrada = {
        insumoId: pId,
        cantidadUnidades: 1,
        observaciones: '',
        bodegaId: bodegaDestino,
      };
      this.productoEntradaSeleccionado = this.productoEntradaFijo;
      this.calcularPreviewEntrada();
    } else {
      this.productoEntradaFijo = null;
      this.busquedaProductoEntrada = '';
      this.productosEntradaFiltrados = [...this.productos];
      this.formEntrada = {
        insumoId: this.productos[0]?.id?.toString() || '',
        cantidadUnidades: 1,
        observaciones: '',
        bodegaId: bodegaDestino,
      };
      this.alCambiarProductoEntrada();
    }
    this.modalEntradaAbierto = true;
  }

  public filtrarProductosEntrada(): void {
    if (!this.busquedaProductoEntrada.trim()) {
      this.productosEntradaFiltrados = [...this.productos];
      return;
    }
    const q = this.busquedaProductoEntrada.toLowerCase();
    this.productosEntradaFiltrados = this.productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigoSKU.toLowerCase().includes(q)
    );
    if (
      this.productosEntradaFiltrados.length > 0 &&
      !this.productosEntradaFiltrados.some((p) => p.id.toString() === this.formEntrada.insumoId)
    ) {
      this.formEntrada.insumoId = this.productosEntradaFiltrados[0].id.toString();
      this.alCambiarProductoEntrada();
    }
  }

  public seleccionarParaEntrada(p: any): void {
    const id = (p.insumoId || p.id)?.toString();
    const targetProd = this.productos.find(
      (prod) => prod.id.toString() === id || prod.nombre?.toLowerCase().trim() === (p.nombre || '').toLowerCase().trim()
    );
    this.abrirModalEntrada({
      ...(targetProd || {}),
      ...p,
      id: id || targetProd?.id,
      insumoId: id,
      stockActual: p.stockActual ?? targetProd?.stockActual ?? 0,
      bodegaId: this.obtenerIdBodegaCentral(),
    });
  }

  public alCambiarProductoEntrada(): void {
    this.productoEntradaSeleccionado =
      this.productos.find((p) => p.id.toString() === this.formEntrada.insumoId) || null;
    this.calcularPreviewEntrada();
  }

  public calcularPreviewEntrada(): void {
    if (!this.productoEntradaSeleccionado) {
      this.previewEntradaCantidadBase = 0;
      return;
    }
    const cNeto = Number(this.productoEntradaSeleccionado.contenidoNeto) || 1;
    const unidades = Number(this.formEntrada.cantidadUnidades) || 0;
    this.previewEntradaCantidadBase = Math.round(unidades * cNeto * 100) / 100;
  }

  public imagenEntradaPreview: string | null = null;
  public imagenEntradaNombre: string = '';
  public imagenEntradaFile: File | null = null;

  public onImagenEntradaSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (this.imagenEntradaPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagenEntradaPreview);
    }
    this.imagenEntradaFile = file;
    this.imagenEntradaNombre = file.name;
    this.imagenEntradaPreview = URL.createObjectURL(file);
    input.value = '';
    this.toast.success('Evidencia de entrada cargada', `${file.name} lista para guardar.`);
  }

  public eliminarImagenEntrada(): void {
    if (this.imagenEntradaPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagenEntradaPreview);
    }
    this.imagenEntradaPreview = null;
    this.imagenEntradaNombre = '';
    this.imagenEntradaFile = null;
  }

  public cerrarModalEntrada(): void {
    this.modalEntradaAbierto = false;
    this.productoEntradaFijo = null;
    this.eliminarImagenEntrada();
  }

  /** Resuelve el UUID de unidad de medida del producto (nunca undefined) */
  private resolverUnidadIdProducto(producto: ProductoInsumo | null): string {
    if (!producto) return '';
    const fromProduct = (producto.unidadMedidaId || (producto as any).unidadMedidaObj?.id || '').toString().trim();
    if (fromProduct) return fromProduct;

    const simbolo = (producto.unidadMedida || '').toString().trim().toLowerCase();
    if (!simbolo) return '';

    const match = this.unidadesMedida.find((u) => {
      const s = (u.simbolo || '').toLowerCase();
      const n = (u.nombre || '').toLowerCase();
      const c = (u.codigo || '').toLowerCase();
      return s === simbolo || n === simbolo || c === simbolo;
    });
    return match?.id?.toString() || '';
  }

  public async guardarEntrada(): Promise<void> {
    if (!this.formEntrada.insumoId) {
      this.toast.warning('Advertencia', 'Seleccione el producto a ingresar');
      return;
    }
    const cantUnidades = Number(this.formEntrada.cantidadUnidades);
    if (!cantUnidades || cantUnidades <= 0) {
      this.toast.warning('Advertencia', 'La cantidad de unidades debe ser mayor a cero');
      return;
    }

    const tipoEntry = this.tiposMovimiento.find((t) => t.codigo === 'ENTRY');
    if (!tipoEntry) {
      this.toast.error('Error', 'Tipo de movimiento ENTRY no encontrado');
      return;
    }

    const unidadId = this.resolverUnidadIdProducto(this.productoEntradaSeleccionado);
    if (!unidadId) {
      this.toast.error('Error', 'El producto no tiene una unidad de medida válida configurada');
      return;
    }

    const cNeto = Number(this.productoEntradaSeleccionado?.contenidoNeto) || 1;
    const totalContenidoBase = Math.round(cantUnidades * cNeto * 100) / 100;
    const uMedida = this.productoEntradaSeleccionado?.unidadMedida || 'und';

    const detalleIngreso = `[Ingreso: ${cantUnidades} und × ${cNeto} ${uMedida}]`;
    const obsFinal = this.formEntrada.observaciones
      ? `${this.formEntrada.observaciones} ${detalleIngreso}`
      : detalleIngreso;

    const bodegaDestino = this.obtenerIdBodegaCentral();

    if (!bodegaDestino) {
      this.toast.warning('Bodega requerida', 'No se encontró la Bodega Central para registrar el ingreso');
      return;
    }

    this.guardandoMovimiento = true;
    let evidenciaUrl = '';
    try {
      if (this.imagenEntradaFile) {
        evidenciaUrl = await this.storageUploadService.uploadMedia(this.imagenEntradaFile, {
          category: 'CATALOGO_INSUMOS',
          type: 'FOTO_INGRESO_INVENTARIO',
          insumoId: String(this.formEntrada.insumoId),
          insumoNombre: this.productoEntradaSeleccionado?.nombre,
          agenciaId: bodegaDestino,
          fileName: this.imagenEntradaFile.name || 'evidencia-ingreso.jpg',
          contentType: this.imagenEntradaFile.type || 'image/jpeg',
        });
      }
    } catch (err: any) {
      this.guardandoMovimiento = false;
      this.toast.error('Error al subir la foto', err?.message || 'No se pudo guardar la evidencia del ingreso en S3.');
      return;
    }

    const payload: any = {
      insumoId: String(this.formEntrada.insumoId),
      tipoMovimientoId: String(tipoEntry.id),
      cantidad: totalContenidoBase,
      unidadId: String(unidadId),
      observaciones: obsFinal,
      ubicacionId: bodegaDestino,
      bodegaId: bodegaDestino,
      evidenciasUrls: evidenciaUrl ? [evidenciaUrl] : [],
    };

    this.inventarioService.registrarMovimiento(payload).subscribe({
      next: (res) => {
        this.guardandoMovimiento = false;
        this.toast.success(
          'Éxito',
          `Ingreso registrado: +${cantUnidades} und (+${totalContenidoBase} ${uMedida}). Comprobante ${res.numeroComprobante}`
        );
        this.cerrarModalEntrada();
        this.cargarProductos();
        this.cargarDashboardResumen();
        this.cargarHistorialMovimientos();
        this.cargarStockBajo();
        this.cargarStockBodega(bodegaDestino);
        this.cargarStockAgencias();
      },
      error: (err) => {
        this.guardandoMovimiento = false;
        this.toast.error('Error', err?.error?.message || 'Error al registrar entrada');
      },
    });
  }

  // ==============================================================
  // PRESENTACIONES POR PRODUCTO
  // ==============================================================

  public abrirModalPresentaciones(p: ProductoInsumo): void {
    this.productoPresentacionesSeleccionado = p;
    this.presEditandoId = null;
    this.nuevaPres = {
      nombre: '',
      unidadId: this.unidadesMedida[0]?.id || '',
      cantidad: 1,
      factorAUnidadBase: 1,
    };
    this.inventarioService.getPresentaciones(p.id.toString()).subscribe((pres) => {
      this.presentacionesProductoActual = pres;
      this.modalPresentacionesAbierto = true;
    });
  }

  public iniciarEdicionPresentacion(pres: PresentacionInsumoCatalog): void {
    this.presEditandoId = pres.id;
    this.nuevaPres = {
      nombre: pres.nombre,
      unidadId: pres.unidadId,
      cantidad: pres.cantidad,
      factorAUnidadBase: pres.factorAUnidadBase,
    };
  }

  public cancelarEdicionPresentacion(): void {
    this.presEditandoId = null;
    this.nuevaPres = {
      nombre: '',
      unidadId: this.unidadesMedida[0]?.id || '',
      cantidad: 1,
      factorAUnidadBase: 1,
    };
  }

  public toggleEstadoPresentacion(pres: PresentacionInsumoCatalog): void {
    this.inventarioService.actualizarPresentacion({ id: pres.id, estado: pres.estado === 1 ? 0 : 1 }).subscribe({
      next: () => {
        this.toast.success('Éxito', pres.estado === 1 ? 'Presentación desactivada' : 'Presentación activada');
        this.abrirModalPresentaciones(this.productoPresentacionesSeleccionado!);
        this.cargarProductos();
      },
      error: (err) => {
        this.toast.error('Error', err?.error?.message || 'Error al actualizar el estado de la presentación');
      },
    });
  }

  public guardarNuevaPresentacion(): void {
    if (!this.productoPresentacionesSeleccionado) return;
    if (!this.nuevaPres.nombre.trim()) {
      this.toast.warning('Advertencia', 'Ingrese el nombre de la presentación (ej. Botella 1000 ml)');
      return;
    }
    if (!this.nuevaPres.factorAUnidadBase || this.nuevaPres.factorAUnidadBase <= 0) {
      this.toast.warning('Advertencia', 'El factor de equivalencia a unidad base debe ser mayor a cero');
      return;
    }

    if (this.presEditandoId) {
      const payload = {
        id: this.presEditandoId,
        nombre: this.nuevaPres.nombre.trim(),
        unidadId: this.nuevaPres.unidadId,
        cantidad: Number(this.nuevaPres.cantidad) || 1,
        factorAUnidadBase: Number(this.nuevaPres.factorAUnidadBase),
      };
      this.inventarioService.actualizarPresentacion(payload).subscribe({
        next: () => {
          this.toast.success('Éxito', 'Presentación actualizada con éxito');
          this.presEditandoId = null;
          this.abrirModalPresentaciones(this.productoPresentacionesSeleccionado!);
          this.cargarProductos();
        },
        error: (err) => {
          this.toast.error('Error', err?.error?.message || 'Error al actualizar presentación');
        },
      });
      return;
    }

    const payload = {
      insumoId: this.productoPresentacionesSeleccionado.id.toString(),
      nombre: this.nuevaPres.nombre.trim(),
      unidadId: this.nuevaPres.unidadId,
      cantidad: Number(this.nuevaPres.cantidad) || 1,
      factorAUnidadBase: Number(this.nuevaPres.factorAUnidadBase),
      estado: 1,
    };

    this.inventarioService.crearPresentacion(payload).subscribe({
      next: () => {
        this.toast.success('Éxito', 'Presentación agregada con éxito');
        this.abrirModalPresentaciones(this.productoPresentacionesSeleccionado!);
        this.cargarProductos();
      },
      error: (err) => {
        this.toast.error('Error', err?.error?.message || 'Error al crear presentación');
      },
    });
  }

  // ==============================================================
  // PRODUCTOS CRUD
  // ==============================================================

  public getSimboloUnidadSeleccionada(): string {
    const u = this.unidadesMedida.find((x) => x.id === this.formProducto.unidadMedidaId);
    return u ? `${u.nombre} (${u.simbolo})` : '';
  }

  public imagenInsumoPreview: string | null = null;
  public imagenInsumoNombre: string = '';

  public onImagenInsumoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.imagenInsumoNombre = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        this.imagenInsumoPreview = result;
        this.formProducto.imagenUrl = result;
        this.formProducto.imagen = result;
        this.toast.success('Imagen cargada', `${file.name} lista para guardar.`);
      };
      reader.readAsDataURL(file);
    }
  }

  public eliminarImagenInsumo(): void {
    this.imagenInsumoPreview = null;
    this.imagenInsumoNombre = '';
    this.formProducto.imagenUrl = '';
    this.formProducto.imagen = '';
  }

  public alCambiarUrlImagenInsumo(): void {
    if (this.formProducto.imagenUrl && this.formProducto.imagenUrl.trim()) {
      this.imagenInsumoPreview = this.formProducto.imagenUrl.trim();
      this.imagenInsumoNombre = 'Imagen desde URL externa';
      this.formProducto.imagen = this.formProducto.imagenUrl.trim();
    } else if (!this.formProducto.imagen) {
      this.imagenInsumoPreview = null;
      this.imagenInsumoNombre = '';
    }
  }

  public abrirModalNuevoProducto(): void {
    this.editandoProducto = false;
    this.guardandoProducto = false;
    this.imagenInsumoPreview = null;
    this.imagenInsumoNombre = '';
    this.imageUploader?.reset();
    const tipoInicial = this.tiposProducto[0];
    const esTipoLiquido = tipoInicial && /líquido|liquido|químico|quimico/i.test(tipoInicial.nombre);
    const unidadVolumen = this.unidadesMedida.find(u => /mililitro|litro|ml|l\b/i.test(u.nombre) || /ml|l/i.test(u.simbolo));
    const unidadIdInicial = (esTipoLiquido && unidadVolumen ? unidadVolumen.id : (this.unidadesMedida[0]?.id || ''));

    this.formProducto = {
      id: '',
      codigoSKU: `INS-${Date.now().toString().slice(-4)}`,
      nombre: '',
      categoria: '',
      tipoProductoId: tipoInicial?.id || '',
      unidadMedidaId: unidadIdInicial,
      contenidoNeto: 1,
      stockMinimoBodega: null,
      stockMinimoAgencia: null,
      stockOptimoBodega: null,
      stockOptimoAgencia: null,
      estado: 1,
      descripcion: '',
      imagenUrl: '',
      imagen: '',
    };
    this.modalProductoAbierto = true;
  }

  public abrirModalEditarProducto(p: ProductoInsumo): void {
    this.editandoProducto = true;
    this.guardandoProducto = false;
    this.imagenInsumoPreview = p.imagenUrl || p.imagen || null;
    this.imagenInsumoNombre = (p.imagenUrl || p.imagen) ? 'Imagen actual del insumo' : '';
    this.imageUploader?.reset();
    const cNeto = Number(p.contenidoNeto) || 1;
    this.formProducto = {
      id: p.id.toString(),
      codigoSKU: p.codigoSKU,
      nombre: p.nombre,
      categoria: (p as any).categoria || '',
      tipoProductoId: p.tipoProductoId || '',
      unidadMedidaId: p.unidadMedidaId || this.unidadesMedida[0]?.id || '',
      contenidoNeto: cNeto,
      // Formulario en unidades físicas; en BD se guarda cantidad base
      stockMinimoBodega: p.stockMinimoBodega != null ? this.getStockEnUnidades(p.stockMinimoBodega, cNeto) : null,
      stockMinimoAgencia: p.stockMinimoAgencia != null ? this.getStockEnUnidades(p.stockMinimoAgencia, cNeto) : null,
      stockOptimoBodega: p.stockOptimoBodega != null ? this.getStockEnUnidades(p.stockOptimoBodega, cNeto) : null,
      stockOptimoAgencia: p.stockOptimoAgencia != null ? this.getStockEnUnidades(p.stockOptimoAgencia, cNeto) : null,
      estado: (p.activo || p.estado === 1) ? 1 : 0,
      descripcion: p.descripcion || '',
      imagenUrl: p.imagenUrl || p.imagen || '',
      imagen: p.imagen || p.imagenUrl || '',
    };
    this.modalProductoAbierto = true;
  }

  public cerrarModalProducto(): void {
    this.modalProductoAbierto = false;
    this.guardandoProducto = false;
    this.imageUploader?.reset();
  }

  public puedeCambiarEstadoProducto(): boolean {
    return this.puedeGestionarCatalogos;
  }

  public async guardarProducto(): Promise<void> {
    if (!this.formProducto.codigoSKU.trim() || !this.formProducto.nombre.trim()) {
      this.toast.warning('Advertencia', 'El código SKU y el nombre del producto son obligatorios');
      return;
    }
    if (!this.formProducto.categoria) {
      this.toast.warning('Advertencia', 'Seleccione la categoría del insumo');
      return;
    }
    if (!this.formProducto.tipoProductoId) {
      this.toast.warning('Advertencia', 'Seleccione un tipo de producto');
      return;
    }
    if (!this.formProducto.unidadMedidaId) {
      this.toast.warning('Advertencia', 'Seleccione la unidad de medida base');
      return;
    }
    if (!this.formProducto.contenidoNeto || this.formProducto.contenidoNeto <= 0) {
      this.toast.warning('Advertencia', 'La cantidad del producto debe ser mayor a cero');
      return;
    }

    const minBodUnd = Number(this.formProducto.stockMinimoBodega);
    const minAgeUnd = Number(this.formProducto.stockMinimoAgencia);
    const optBodUnd = Number(this.formProducto.stockOptimoBodega);
    const optAgeUnd = Number(this.formProducto.stockOptimoAgencia);

    if (!minBodUnd || minBodUnd <= 0) {
      this.toast.warning('Advertencia', 'El stock mínimo de bodega es obligatorio (en unidades) y debe ser mayor a 0');
      return;
    }
    if (!minAgeUnd || minAgeUnd <= 0) {
      this.toast.warning('Advertencia', 'El stock mínimo de agencia es obligatorio (en unidades) y debe ser mayor a 0');
      return;
    }
    if (!optBodUnd || optBodUnd <= 0) {
      this.toast.warning('Advertencia', 'El stock óptimo de bodega es obligatorio (en unidades) y debe ser mayor a 0');
      return;
    }
    if (optBodUnd < minBodUnd) {
      this.toast.warning('Advertencia', 'El stock óptimo de bodega debe ser mayor o igual al stock mínimo de bodega');
      return;
    }
    if (!optAgeUnd || optAgeUnd <= 0) {
      this.toast.warning('Advertencia', 'El stock óptimo de agencia es obligatorio (en unidades) y debe ser mayor a 0');
      return;
    }
    if (optAgeUnd < minAgeUnd) {
      this.toast.warning('Advertencia', 'El stock óptimo de agencia debe ser mayor o igual al stock mínimo de agencia');
      return;
    }

    this.guardandoProducto = true;

    // Si hay una foto recién ajustada, se sube ahora a S3
    if (this.imageUploader?.hasPendingUpload) {
      try {
        this.imageUploader.insumoId = this.formProducto.nombre || this.formProducto.codigoSKU || this.formProducto.id;
        this.imageUploader.insumoNombre = this.formProducto.nombre || this.formProducto.codigoSKU;
        const s3Url = await this.imageUploader.uploadNow();
        this.formProducto.imagenUrl = s3Url;
        this.formProducto.imagen = s3Url;
      } catch (err: any) {
        this.guardandoProducto = false;
        this.toast.error('Error al subir imagen a S3', err?.message || 'Fallo de transferencia');
        return;
      }
    }

    const cNeto = Number(this.formProducto.contenidoNeto) || 1;
    const minBod = this.getCantidadDesdeUnidades(minBodUnd, cNeto);
    const minAge = this.getCantidadDesdeUnidades(minAgeUnd, cNeto);
    const optBod = this.getCantidadDesdeUnidades(optBodUnd, cNeto);
    const optAge = this.getCantidadDesdeUnidades(optAgeUnd, cNeto);

    if (this.editandoProducto) {
      const payload: any = {
        id: this.formProducto.id,
        codigoSKU: this.formProducto.codigoSKU,
        nombre: this.formProducto.nombre,
        categoria: this.formProducto.categoria,
        tipoProductoId: this.formProducto.tipoProductoId,
        unidadMedidaId: this.formProducto.unidadMedidaId,
        contenidoNeto: Number(this.formProducto.contenidoNeto),
        stockMinimoBodega: minBod,
        stockMinimoAgencia: minAge,
        stockOptimoBodega: optBod,
        stockOptimoAgencia: optAge,
        estado: Number(this.formProducto.estado) === 1 ? 1 : 0,
        descripcion: this.formProducto.descripcion,
        imagenUrl: this.formProducto.imagenUrl || this.formProducto.imagen || undefined,
        imagen: this.formProducto.imagen || this.formProducto.imagenUrl || undefined,
      };
      this.inventarioService.actualizarProducto(payload).subscribe({
        next: () => {
          this.guardandoProducto = false;
          this.toast.success('Éxito', 'Producto actualizado correctamente con su imagen');
          this.cerrarModalProducto();
          this.cargarProductos();
          this.cargarStockBodega();
          this.cargarStockAgencias();
        },
        error: (err) => {
          this.guardandoProducto = false;
          this.toast.error('Error', err?.error?.message || 'Error al actualizar producto');
        },
      });
    } else {
      const payload: any = {
        codigoSKU: this.formProducto.codigoSKU,
        nombre: this.formProducto.nombre,
        tipoProductoId: this.formProducto.tipoProductoId,
        unidadMedidaId: this.formProducto.unidadMedidaId,
        contenidoNeto: Number(this.formProducto.contenidoNeto),
        stockMinimoBodega: minBod,
        stockMinimoAgencia: minAge,
        stockOptimoBodega: optBod,
        stockOptimoAgencia: optAge,
        descripcion: this.formProducto.descripcion,
        imagenUrl: this.formProducto.imagenUrl || this.formProducto.imagen || undefined,
        imagen: this.formProducto.imagen || this.formProducto.imagenUrl || undefined,
        categoria: this.formProducto.categoria,
      };
      this.inventarioService.crearProducto(payload).subscribe({
        next: () => {
          this.guardandoProducto = false;
          this.toast.success('Éxito', 'Producto registrado exitosamente con su imagen');
          this.cerrarModalProducto();
          this.cargarProductos();
          this.cargarDashboardResumen();
          this.cargarStockBodega();
          this.cargarStockAgencias();
        },
        error: (err) => {
          this.guardandoProducto = false;
          this.toast.error('Error', err?.error?.message || 'Error al registrar producto');
        },
      });
    }
  }

  public toggleEstadoProducto(p: ProductoInsumo): void {
    if (!this.puedeCambiarEstadoProducto()) {
      this.toast.warning('Sin permiso', 'No tienes permiso para gestionar el catálogo de insumos.');
      return;
    }
    const nuevoEstado = p.activo ? 0 : 1;
    this.inventarioService.actualizarProducto({ id: p.id.toString(), estado: nuevoEstado }).subscribe({
      next: () => {
        p.activo = nuevoEstado === 1;
        p.estado = nuevoEstado;
        this.toast.success('Éxito', `Producto ${nuevoEstado === 1 ? 'activado' : 'desactivado'} (se conserva el historial)`);
        this.filtrarProductos();
      },
      error: () => this.toast.error('Error', 'No se pudo cambiar el estado del producto'),
    });
  }

  // ==============================================================
  // CONFIGURACIÓN DINÁMICA CRUD (TIPOS Y UNIDADES)
  // ==============================================================

  public abrirModalTipoProducto(): void {
    this.formTipo = { id: '', codigo: '', nombre: '', descripcion: '', estado: 1 };
    this.modalTipoAbierto = true;
  }

  public editarTipoProducto(t: TipoProductoCatalog): void {
    this.formTipo = {
      id: t.id,
      codigo: t.codigo,
      nombre: t.nombre,
      descripcion: t.descripcion || '',
      estado: t.estado ?? 1,
    };
    this.modalTipoAbierto = true;
  }

  public guardarTipoProducto(): void {
    if (!this.formTipo.codigo.trim() || !this.formTipo.nombre.trim()) {
      this.toast.warning('Advertencia', 'Código y nombre del tipo son obligatorios');
      return;
    }
    const obs = this.formTipo.id
      ? this.inventarioService.actualizarTipoProducto(this.formTipo)
      : this.inventarioService.crearTipoProducto(this.formTipo);

    obs.subscribe({
      next: () => {
        this.toast.success('Éxito', 'Tipo de producto guardado con éxito');
        this.modalTipoAbierto = false;
        this.cargarTiposProducto();
        this.tiposTabla.refrescar();
      },
      error: (err) => this.toast.error('Error', err?.error?.message || 'Error al guardar tipo de producto'),
    });
  }

  public toggleEstadoTipo(t: TipoProductoCatalog): void {
    const nuevoEstado = t.estado === 1 ? 0 : 1;
    this.inventarioService.actualizarTipoProducto({ id: t.id, estado: nuevoEstado }).subscribe({
      next: () => {
        t.estado = nuevoEstado;
        this.toast.success('Éxito', `Tipo ${nuevoEstado === 1 ? 'activado' : 'desactivado'}`);
        this.cargarTiposProducto();
      },
    });
  }

  public abrirModalUnidad(): void {
    this.formUnidad = { id: '', codigo: '', nombre: '', simbolo: '', tipo: 'VOLUMEN', factorBase: 1, estado: 1 };
    this.modalUnidadAbierto = true;
  }

  public editarUnidad(u: UnidadMedidaCatalog): void {
    this.formUnidad = {
      id: u.id,
      codigo: u.codigo,
      nombre: u.nombre,
      simbolo: u.simbolo,
      tipo: u.tipo,
      factorBase: u.factorBase || 1,
      estado: u.estado ?? 1,
    };
    this.modalUnidadAbierto = true;
  }

  public guardarUnidadMedida(): void {
    if (!this.formUnidad.codigo.trim() || !this.formUnidad.nombre.trim() || !this.formUnidad.simbolo.trim()) {
      this.toast.warning('Advertencia', 'Código, nombre y símbolo son obligatorios');
      return;
    }
    const obs = this.formUnidad.id
      ? this.inventarioService.actualizarUnidadMedida(this.formUnidad)
      : this.inventarioService.crearUnidadMedida(this.formUnidad);

    obs.subscribe({
      next: () => {
        this.toast.success('Éxito', 'Unidad de medida guardada con éxito');
        this.modalUnidadAbierto = false;
        this.cargarUnidadesMedida();
        this.unidadesTabla.refrescar();
      },
      error: (err) => this.toast.error('Error', err?.error?.message || 'Error al guardar unidad de medida'),
    });
  }

  public toggleEstadoUnidad(u: UnidadMedidaCatalog): void {
    const nuevoEstado = u.estado === 1 ? 0 : 1;
    this.inventarioService.actualizarUnidadMedida({ id: u.id, estado: nuevoEstado }).subscribe({
      next: () => {
        u.estado = nuevoEstado;
        this.toast.success('Éxito', `Unidad ${nuevoEstado === 1 ? 'activada' : 'desactivada'}`);
        this.cargarUnidadesMedida();
      },
    });
  }
}

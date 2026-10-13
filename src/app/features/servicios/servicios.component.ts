import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { firstValueFrom, of, Observable, Subject, Subscription, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConsultaServicios, ServicioLavadoService } from '../../core/services/servicio-lavado.service';
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
import { CatalogoServiciosService } from '../../core/services/catalogo-servicios.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { ConsultaExtras, ServiciosExtrasService } from '../../core/services/servicios-extras.service';
import { OperadorService } from '../../core/services/operador.service';
import { BahiaService } from '../../core/services/bahia.service';
import { DataTableCellDirective, DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import { ListaInfinita } from '../../core/utils/lista-infinita';
import { ConsultaTabla, OrdenDir } from '../../core/models/paginacion.model';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_INFINITO, PAGE_SIZE_TABLA } from '../../core/config/paginacion';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { IncidenteService } from '../../core/services/incidente.service';
import { formatearPlaca, validarPlaca } from '../../core/utils/placa.util';
import { resolverRangoFechas, soloFecha } from '../../core/utils/fecha-rango';

import { RouterModule } from '@angular/router';
import { VideoRecorderComponent } from '../../shared/components/video-recorder/video-recorder.component';
import { EvidenciaSelectorComponent } from '../../shared/components/evidencia-selector/evidencia-selector.component';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, ModalComponent, DataTableComponent, DataTableCellDirective, InfiniteScrollComponent, FilterBarComponent, VideoRecorderComponent, EvidenciaSelectorComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Header Banner -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-2">
            <i-lucide aria-hidden="true" name="car" class="w-3.5 h-3.5"></i-lucide>
            <span>Digitalización de Hoja de Control de Servicio</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Control y Registro de Servicios de Lavado</h1>
          <p class="text-slate-500 text-xs mt-1">Digitalización del proceso físico: OT, placa, evidencias en vídeo/fotos y flujo de aprobación por Gerencia.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @if (puedeVerCatalogoBoton) {
            <a
              routerLink="/configuracion/servicios"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs border border-slate-200">
              <i-lucide aria-hidden="true" name="layout-list" class="w-4 h-4 text-easydry-blue"></i-lucide>
              <span class="hidden sm:inline">{{ authService.puede('catalogo.gestionar') ? 'Catálogo & Crear Servicios' : 'Catálogo de Servicios' }}</span>
              <span class="sm:hidden">Catálogo</span>
            </a>
          }

          @if (puedeReportarFalla) {
            <button
              (click)="abrirModalReportarFalla()"
              class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs">
              <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4"></i-lucide>
              <span class="hidden sm:inline">Reportar Falla / Avería</span>
              <span class="sm:hidden">Falla</span>
            </button>
          }

          @if (canCrearOT) {
            <button
              (click)="abrirModalNuevaOT()"
              class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
              <i-lucide aria-hidden="true" name="plus" class="w-4 h-4"></i-lucide>
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
              <i-lucide aria-hidden="true" name="truck" class="w-4 h-4"></i-lucide>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-xs font-extrabold text-indigo-950 uppercase tracking-wide">
                  ¡Suministros en Camino para tu Sede!
                </h3>
                <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-200 text-indigo-900 font-mono">
                  Guía: {{ despachosPendientesLider[0].numeroGuia }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
                  {{ despachosPendientesLider.length }} despacho(s) en tránsito
                </span>
              </div>
              <p class="text-xs text-indigo-800 mt-0.5">
                Bodega Central ha enviado suministros para tus servicios. Revisa la carga y confirma o rechaza la recepción.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <a
              routerLink="/inventario"
              class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer">
              <i-lucide aria-hidden="true" name="check-circle" class="w-3.5 h-3.5"></i-lucide>
              <span>Revisar y Confirmar en Inventario</span>
            </a>
          </div>
        </div>
      }

      <!-- Tab Navigation: Generales y Especiales -->
      <div class="flex flex-wrap gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">

        <!-- Pestaña 1: Servicios Generales (visible para Admin, Super Admin y personal operativo general) -->
        @if (puedeVerGenerales) {
          <button
            (click)="cambiarTab('generales')"
            [ngClass]="tabActiva === 'generales' ? 'bg-white text-easydry-blue shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900 font-semibold'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
            <i-lucide aria-hidden="true" name="droplet" class="w-4 h-4 text-easydry-blue"></i-lucide>
            <span>Servicios Generales</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold ml-1">
              {{ countServiciosGenerales }}
            </span>
          </button>
        }

        <!-- Pestaña 2: Servicios Especiales (visible para Admin, Super Admin, pulidores y agencias con especiales) -->
        @if (puedeVerEspeciales && (tieneServiciosEspeciales || isOperadorEspeciales || isAdmin)) {
          <button
            (click)="cambiarTab('especiales')"
            [ngClass]="tabActiva === 'especiales' ? 'bg-white text-amber-700 shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900 font-semibold'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
            <i-lucide aria-hidden="true" name="star" class="w-4 h-4 text-amber-500 fill-amber-500/20"></i-lucide>
            <span>Servicios Especiales</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold ml-1">
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
      @if (busquedaCorta) {
        <p class="-mt-3 px-2 text-[11px] font-semibold text-slate-500" role="status">Escribe al menos {{ minBusqueda }} letras para buscar.</p>
      }

      <!-- Services List / Table Container (Componente Compuesto Unificado) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden flex flex-col">

        <!-- Cabecera de la sección -->
        <div class="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-lg font-outfit">{{ tabActiva === 'generales' ? 'Servicios Generales' : 'Servicios Especiales (Zonal ' + userRegionNombre + ')' }}</h3>
          </div>
        </div>

        @if (tabActiva === 'generales') {
          <!-- Vista de tabla (escritorio): páginas numeradas, orden y búsqueda en el servidor -->
          @if (esEscritorio) {
            <app-data-table
              [serverSide]="true"
              [embebida]="true"
              [showToolbar]="false"
              [columns]="columnasGenerales"
              [data]="filasG"
              [total]="totalG"
              [page]="paginaG"
              [pageSize]="pageSizeG"
              [sortField]="sortFieldG"
              [sortOrder]="sortOrderG"
              [loading]="cargandoG"
              [error]="errorG"
              [rowClickable]="true"
              maxHeight="none"
              caption="Servicios de lavado"
              [emptyTitle]="tituloVacioG"
              emptyHint="Prueba ajustando los filtros o el texto de búsqueda."
              (queryChange)="onTablaGCambio($event)"
              (rowClick)="abrirDetalle($event)"
              (reintentar)="cargarPaginaG()">
          <ng-template appCell="ot" let-item>
                                <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2.5 py-1 rounded-lg block w-fit">
                                  {{ item.ordenTrabajoOT || '—' }}
                                </span>
                                @if (serviciosEnMismaOT(item) > 1) {
                                  <span class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-extrabold bg-violet-50 text-violet-700 border border-violet-200"
                                    title="Esta OT tiene varios servicios registrados (una fila por servicio)">
                                    <i-lucide aria-hidden="true" name="layers" class="w-3 h-3"></i-lucide>
                                    {{ serviciosEnMismaOT(item) }} servicios
                                  </span>
                                }
          </ng-template>

          <ng-template appCell="placa" let-item>
                                <div class="font-bold text-slate-900 text-xs">{{ item.marca }} {{ item.modelo }}</div>
                                <div class="text-xs font-mono font-extrabold text-easydry-blue">{{ item.placa }}</div>
                                <div class="text-xs text-slate-500 font-semibold">{{ item.color }} ({{ item.anio }})</div>
          </ng-template>

          <ng-template appCell="servicio" let-item>
                                <span
                                  class="px-2 py-0.5 rounded text-xs font-extrabold block w-fit mb-1 border bg-blue-100 text-blue-800 border-blue-300">
                                  Servicios Generales
                                </span>
                                <span class="font-bold text-slate-900 text-xs">{{ item.servicio }}</span>
          </ng-template>

          <ng-template appCell="agencia" let-item>
            <div class="text-xs">
                                <p class="font-bold text-slate-800">{{ item.agencia }}</p>
                                <p class="text-xs text-easydry-blue font-semibold">{{ item.bahia || 'Sin bahía' }}</p>
            </div>
          </ng-template>

          <ng-template appCell="fecha" let-item>
            <div class="text-xs font-mono">
                                <p class="text-slate-700 font-semibold">Ing: {{ item.horaIngreso || '08:30' }}</p>
                                <p class="text-slate-500">Sal: {{ item.horaSalida || '--:--' }}</p>
                                <span class="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold font-mono border"
                                  [ngClass]="{
                                    'bg-emerald-50 text-emerald-800 border-emerald-200': item.estado === 'FINALIZADO' || item.estado === 'APROBADO',
                                    'bg-amber-50 text-amber-800 border-amber-200': item.estado === 'EN PROCESO',
                                    'bg-slate-100 text-slate-600 border-slate-200': item.estado !== 'FINALIZADO' && item.estado !== 'APROBADO' && item.estado !== 'EN PROCESO'
                                  }"
                                  title="Duración total del servicio de lavado">
                                  <i-lucide aria-hidden="true" name="timer" class="w-3.5 h-3.5"></i-lucide>
                                  <span>{{ item.duracionFormateada || calcularDuracion(item.horaIngreso || '', item.horaSalida || '') }}</span>
                                </span>
            </div>
          </ng-template>

          <ng-template appCell="operador" let-item>
            <div class="text-xs font-bold text-slate-800">
                                {{ item.empleado }}
            </div>
          </ng-template>

          <ng-template appCell="estado" let-item>
                                <span
                                  class="px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5"
                                  [ngClass]="{
                                    'bg-amber-100 text-amber-800 border border-amber-300': item.estado === 'EN PROCESO',
                                    'bg-easydry-blue/15 text-easydry-blue border border-easydry-blue/30': item.estado === 'FINALIZADO',
                                    'bg-easydry-green/20 text-easydry-green-text border border-easydry-green/40': item.estado === 'APROBADO',
                                    'bg-rose-100 text-rose-800 border border-rose-300': item.estado === 'RECHAZADO'
                                  }">
                                  <span>{{ etiquetaEstado(item.estado) }}</span>
                                </span>
          </ng-template>

          <ng-template appCell="evInicio" let-item>
            <div (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                                @if (getVideoInicial(item); as vidIni) {
                                  <button
                                    (click)="verVideoGenerico(vidIni, 'Evidencia de Inicio — OT: ' + (item.ordenTrabajoOT || item.placa))"
                                    title="Ver evidencia de inicio"
                                    class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                                    <i-lucide aria-hidden="true" name="video" class="w-3.5 h-3.5 text-amber-600"></i-lucide>
                                    <span>Inicio</span>
                                  </button>
                                } @else {
                                  <span class="text-xs text-slate-500 font-mono">-</span>
                                }
            </div>
          </ng-template>

          <ng-template appCell="evFin" let-item>
            <div (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                                @if (getVideoFinal(item); as vidFin) {
                                  <button
                                    (click)="verVideoGenerico(vidFin, 'Evidencia Final / Entrega — OT: ' + (item.ordenTrabajoOT || item.placa))"
                                    title="Ver evidencia final / entrega"
                                    class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                                    <i-lucide aria-hidden="true" name="film" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                                    <span>Fin</span>
                                  </button>
                                } @else {
                                  <span class="text-xs text-slate-500 font-mono" [title]="(item.estado === 'EN PROCESO' || item.estado === 'EN_PROCESO') ? 'Pendiente hasta finalizar el servicio' : 'Sin evidencia final'">-</span>
                                }
            </div>
          </ng-template>

          <ng-template appCell="acciones" let-item>
            <div (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                                <div class="flex items-center justify-end gap-1">
                                  @if (canFinalizar(item)) {
                                    <button
                                      (click)="abrirModalFinalizarServicio(item)"
                                      title="Finalizar servicio y adjuntar evidencia en vídeo"
                                      class="px-2.5 py-1 bg-easydry-blue/10 hover:bg-easydry-blue text-easydry-blue hover:text-white rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold shadow-2xs">
                                      <i-lucide aria-hidden="true" name="check-circle" class="w-3.5 h-3.5"></i-lucide>
                                      <span>Finalizar</span>
                                    </button>
                                  }

                                  @if (puedeAgregarServicio(item)) {
                                    <button
                                      (click)="abrirModalAgregarServicioAOT(item); $event.stopPropagation()"
                                      title="Agregar otro servicio a esta misma OT (mismo vehículo)"
                                      class="px-2.5 py-1 bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white border border-violet-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold shadow-2xs">
                                      <i-lucide aria-hidden="true" name="plus-circle" class="w-3.5 h-3.5"></i-lucide>
                                      <span>Agregar servicio</span>
                                    </button>
                                  }

                                  @if (item.estado === 'FINALIZADO' && item.agenciaSinAprobador) {
                                    <span class="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold" title="La agencia no tiene aprobador designado">Sin aprobador designado</span>
                                  }

                                  @if (item.estado === 'FINALIZADO' && item.puedeDecidir) {
                                    <button
                                      (click)="aprobarServicio(item)"
                                      title="Aprobar servicio"
                                      class="inline-flex items-center justify-center min-w-9 min-h-9 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center" aria-label="Aprobar servicio">
                                      <i-lucide aria-hidden="true" name="check" class="w-4 h-4"></i-lucide>
                                    </button>
                                  }

                                  @if (puedeAnularServicio(item)) {
                                    <button
                                      type="button"
                                      (click)="abrirModalAnularGeneral(item)"
                                      title="Anular servicio (pide el motivo)"
                                      class="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-bold shadow-2xs">
                                      <i-lucide aria-hidden="true" name="alert-triangle" class="w-3.5 h-3.5"></i-lucide>
                                      <span>Anular</span>
                                    </button>
                                  }

                                  @if (item.estado === 'APROBADO') {
                                    <span class="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg flex items-center justify-center" title="Servicio Aprobado">
                                      <i-lucide aria-hidden="true" name="check-circle-2" class="w-4 h-4"></i-lucide>
                                    </span>
                                  }
                                </div>
            </div>
          </ng-template>
            </app-data-table>
          }

          <!-- Vista de tarjetas (móvil / tablet): scroll infinito -->
          @if (!esEscritorio) {
          <div class="divide-y divide-slate-100 flex-1">
            @for (item of listaG.items; track item.id) {
              <div class="p-4 hover:bg-slate-50 transition-colors cursor-pointer" tabindex="0" role="button" (click)="abrirDetalle(item)" (keydown.enter)="abrirDetalle(item)" (keydown.space)="abrirDetalle(item); $event.preventDefault()">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2 py-0.5 rounded-md">
                      {{ item.ordenTrabajoOT || '—' }}
                    </span>
                    @if (serviciosEnMismaOT(item) > 1) {
                      <span class="ml-1 px-1.5 py-0.5 rounded-md text-xs font-extrabold bg-violet-50 text-violet-700 border border-violet-200">
                        {{ serviciosEnMismaOT(item) }} servicios
                      </span>
                    }
                    <div class="text-xs font-bold text-slate-700 mt-1">{{ item.servicio }}</div>
                    <div class="font-bold text-slate-900 text-sm mt-1.5">{{ item.marca }} {{ item.modelo }}</div>
                    <div class="text-xs font-mono font-extrabold text-slate-500">{{ item.placa }}</div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-xs font-extrabold text-center max-w-[80px]"
                    [ngClass]="{
                      'bg-amber-100 text-amber-800': item.estado === 'EN PROCESO',
                      'bg-easydry-blue/15 text-easydry-blue': item.estado === 'FINALIZADO',
                      'bg-easydry-green/20 text-easydry-green-text': item.estado === 'APROBADO',
                      'bg-rose-100 text-rose-800': item.estado === 'RECHAZADO'
                    }">
                    {{ etiquetaEstado(item.estado) }}
                  </span>
                </div>

                @if (puedeAgregarServicio(item)) {
                  <button
                    (click)="abrirModalAgregarServicioAOT(item); $event.stopPropagation()"
                    title="Agregar otro servicio a esta misma OT (mismo vehículo)"
                    class="mt-2 w-full px-2.5 py-1.5 bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white border border-violet-200 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs font-bold">
                    <i-lucide aria-hidden="true" name="plus-circle" class="w-3.5 h-3.5"></i-lucide>
                    <span>Agregar servicio a esta OT</span>
                  </button>
                }
                <div class="flex items-center justify-between mt-3 text-xs">
                  <div class="flex items-center gap-1.5 text-slate-500">
                    <i-lucide aria-hidden="true" name="clock" class="w-3.5 h-3.5"></i-lucide>
                    <span>{{ item.horaIngreso || '—' }}</span>
                    @if (item.duracionFormateada || calcularDuracion(item.horaIngreso || '', item.horaSalida || '')) {
                      <span class="ml-1 px-1.5 py-0.5 rounded text-xs font-extrabold font-mono border"
                        [ngClass]="{
                          'bg-emerald-50 text-emerald-800 border-emerald-200': item.estado === 'FINALIZADO' || item.estado === 'APROBADO',
                          'bg-amber-50 text-amber-800 border-amber-200': item.estado === 'EN PROCESO',
                          'bg-slate-100 text-slate-600 border-slate-200': item.estado !== 'FINALIZADO' && item.estado !== 'APROBADO' && item.estado !== 'EN PROCESO'
                        }">
                        <i-lucide aria-hidden="true" name="clock" class="w-3 h-3"></i-lucide>
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
                        class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                        <i-lucide aria-hidden="true" name="video" class="w-3 h-3 text-amber-600"></i-lucide>
                        <span>Evidencia Inicio</span>
                      </button>
                    }
                    @if (getVideoFinal(item); as vidFin) {
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); verVideoGenerico(vidFin, 'Evidencia Final — OT: ' + (item.ordenTrabajoOT || item.placa))"
                        class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                        <i-lucide aria-hidden="true" name="film" class="w-3 h-3 text-emerald-600"></i-lucide>
                        <span>Evidencia Fin</span>
                      </button>
                    }
                  </div>
                }
              </div>
            }
            @if (listaG.error && listaG.items.length === 0) {
              <div role="alert" class="p-6 flex flex-col items-center gap-3 text-center">
                <div class="estado-error">{{ listaG.error }}</div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="listaG.reiniciar()">Reintentar</button>
              </div>
            } @else if (!listaG.inicializada) {
              <div class="p-4 space-y-3" role="status" aria-label="Cargando">
                @for (n of [1, 2, 3, 4]; track n) {
                  <div class="h-24 rounded-xl bg-slate-100 animate-pulse motion-reduce:animate-none"></div>
                }
              </div>
            } @else if (listaG.items.length === 0) {
              <div class="estado-vacio py-10">{{ tituloVacioG }}</div>
            } @else {
              <app-infinite-scroll
                [hasMore]="listaG.hasMore"
                [loading]="listaG.cargando"
                [error]="listaG.error"
                [total]="listaG.total"
                (cargarMas)="listaG.siguiente()"
                (reintentar)="listaG.reintentar()">
              </app-infinite-scroll>
            }
          </div>
          }
        } @else {
          <!-- Vista de tabla (escritorio): páginas numeradas, orden y búsqueda en el servidor -->
          @if (esEscritorio) {
            <app-data-table
              [serverSide]="true"
              [embebida]="true"
              [showToolbar]="false"
              [columns]="columnasEspeciales"
              [data]="filasE"
              [total]="totalE"
              [page]="paginaE"
              [pageSize]="pageSizeE"
              [sortField]="sortFieldE"
              [sortOrder]="sortOrderE"
              [loading]="cargandoE"
              [error]="errorE"
              [rowClickable]="true"
              maxHeight="none"
              caption="Servicios especiales"
              [emptyTitle]="tituloVacioE"
              emptyHint="Prueba ajustando los filtros o el texto de búsqueda."
              (queryChange)="onTablaECambio($event)"
              (rowClick)="abrirDetalleEspecial($event)"
              (reintentar)="cargarPaginaE()">
          <ng-template appCell="ot" let-extra>
                                <span class="font-mono font-extrabold text-xs text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg block w-fit border border-amber-300">
                                  {{ extra.ordenTrabajoOT || extra.codigoSE }}
                                </span>
                                <span class="text-xs text-slate-500 font-mono mt-0.5 block" title="Fecha y hora de creación">
                                  Creada {{ (extra.createdAt || extra.fechaProgramada) | date:'dd/MM/yyyy HH:mm' }}
                                </span>
          </ng-template>

          <ng-template appCell="placa" let-extra>
                                <div class="font-extrabold text-slate-900 text-xs">{{ extra.vehiculoInfo?.marca }} {{ extra.vehiculoInfo?.modelo }}</div>
                                <div class="text-xs font-mono font-extrabold text-easydry-blue">{{ extra.vehiculoInfo?.placa || extra.placa }}</div>
                                <div class="text-xs text-slate-500 font-semibold">{{ extra.vehiculoInfo?.color }}</div>
          </ng-template>

          <ng-template appCell="servicio" let-extra>
                                <span class="font-bold text-slate-900 text-xs block">{{ extra.servicioNombre }}</span>
                                @if (extra.insumosReceta && extra.insumosReceta.length > 0) {
                                  <span class="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5 inline-block font-medium">
                                    {{ extra.insumosReceta.length }} insumo(s) químico(s)
                                  </span>
                                }
          </ng-template>

          <ng-template appCell="agencia" let-extra>
            <div class="text-xs font-bold text-slate-800">
                                <div class="flex items-center gap-1.5">
                                  <i-lucide aria-hidden="true" name="building-2" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i-lucide>
                                  <span class="truncate">{{ extra.agenciaNombre || extra.agencia?.nombre || 'Sede Zonal' }}</span>
                                </div>
            </div>
          </ng-template>

          <ng-template appCell="region" let-extra>
            <div class="text-xs font-bold text-slate-700">
                                <span class="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-mono text-xs">
                                  {{ extra.regionNombre || ('Zonal ' + userRegionNombre) }}
                                </span>
            </div>
          </ng-template>

          <ng-template appCell="operador" let-extra>
            <div class="space-y-1.5 text-xs">
              <div class="flex items-start gap-1.5 font-bold text-slate-800">
                <i-lucide aria-hidden="true" name="user" class="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5"></i-lucide>
                <div class="min-w-0">
                  <span class="block text-[10px] uppercase tracking-wide text-amber-700">Responsable</span>
                  <span>{{ extra.operadoresNombres?.[0] || extra.operadorNombre }}</span>
                </div>
              </div>
              @for (nombre of (extra.operadoresNombres || []).slice(1); track $index) {
                <div class="flex items-start gap-1.5 pl-5 text-slate-600">
                  <i-lucide aria-hidden="true" name="user" class="w-3 h-3 text-slate-400 shrink-0 mt-0.5"></i-lucide>
                  <span><span class="font-semibold">Asignado:</span> {{ nombre }}</span>
                </div>
              }
            </div>
          </ng-template>

          <ng-template appCell="tiempoPausa" let-extra>
                                @if (extra.tiempoPausaTotalSeg && extra.tiempoPausaTotalSeg > 0) {
                                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-extrabold bg-amber-50 text-amber-900 border border-amber-200" title="Tiempo total acumulado de pausas">
                                    <i-lucide aria-hidden="true" name="pause-circle" class="w-3 h-3"></i-lucide>
                                    <span>{{ extra.tiempoPausaFormateado || '0 min' }}</span>
                                  </span>
                                } @else {
                                  <span class="text-xs text-slate-500 font-mono">-</span>
                                }
          </ng-template>

          <ng-template appCell="tiempoEfectivo" let-extra>
                                @if (extra.tiempoEfectivoFormateado || (extra.tiempoEfectivoSeg && extra.tiempoEfectivoSeg > 0)) {
                                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-extrabold bg-blue-50 text-blue-900 border border-blue-200" title="Tiempo neto de trabajo desarrollado">
                                    <i-lucide aria-hidden="true" name="timer" class="w-3 h-3"></i-lucide>
                                    <span>{{ extra.tiempoEfectivoFormateado || '0 min' }}</span>
                                  </span>
                                } @else {
                                  <span class="text-xs text-slate-500 font-mono">-</span>
                                }
          </ng-template>

          <ng-template appCell="tiempoTotal" let-extra>
                                @if (extra.fechaInicio) {
                                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-300" title="Tiempo total = tiempo de pausa + tiempo efectivo">
                                    <i-lucide aria-hidden="true" name="clock" class="w-3 h-3"></i-lucide>
                                    <span>{{ extra.tiempoTotalFormateado || '0 min' }}</span>
                                  </span>
                                } @else {
                                  <span class="text-xs text-slate-500 font-mono">-</span>
                                }
          </ng-template>

          <ng-template appCell="evInicio" let-extra>
            <div (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                                @if (extra.videoInicialUrl || extra.videoInicial) {
                                  <button
                                    (click)="verVideoGenerico(extra.videoInicialUrl || extra.videoInicial, 'Vídeo Inicial OT: ' + extra.codigoSE)"
                                    class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                                    <i-lucide aria-hidden="true" name="video" class="w-3.5 h-3.5 text-amber-600"></i-lucide>
                                    <span>Inicio</span>
                                  </button>
                                } @else {
                                  <span class="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                                    Al Iniciar
                                  </span>
                                }
            </div>
          </ng-template>

          <ng-template appCell="evPausas" let-extra>
            <div (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                                @if ((extra.historialPausas && extra.historialPausas.length > 0) || extra.videoUltimaPausaUrl || extra.videoPausa) {
                                  <button
                                    (click)="verEvidenciasPausas(extra)"
                                    title="Ver evidencias de pausas y reanudaciones"
                                    class="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                                    <i-lucide aria-hidden="true" name="pause-circle" class="w-3.5 h-3.5 text-orange-600"></i-lucide>
                                    <span>Pausas {{ extra.historialPausas && extra.historialPausas.length > 0 ? '(' + extra.historialPausas.length + ')' : '' }}</span>
                                  </button>
                                } @else {
                                  <span class="text-xs text-slate-500 font-mono">-</span>
                                }
            </div>
          </ng-template>

          <ng-template appCell="evFin" let-extra>
            <div (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                                @if (extra.videoFinalUrl || extra.videoFinal) {
                                  <button
                                    (click)="verVideoGenerico(extra.videoFinalUrl || extra.videoFinal, 'Vídeo Final OT: ' + extra.codigoSE)"
                                    class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                                    <i-lucide aria-hidden="true" name="film" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                                    <span>Fin</span>
                                  </button>
                                } @else {
                                  <span class="text-xs text-slate-500 font-mono">-</span>
                                }
            </div>
          </ng-template>

          <ng-template appCell="estado" let-extra>
                                <span
                                  class="px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5"
                                  [ngClass]="estadoExtraClass(extra.estado)">
                                  <span>{{ extra.estado }}</span>
                                </span>
          </ng-template>

          <ng-template appCell="acciones" let-extra>
            <div (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                                <div class="flex items-center justify-end gap-1.5">
                                  @if (extra.estado === 'Pendiente') {
                                    @if (puedeRealizarOT(extra)) {
                                      <button
                                        (click)="abrirModalIniciarEspecial(extra)"
                                        class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                                        <i-lucide aria-hidden="true" name="play" class="w-3 h-3"></i-lucide>
                                        <span>Iniciar</span>
                                      </button>
                                    } @else {
                                      <span class="text-xs text-slate-500 italic px-1.5 py-0.5 bg-slate-100 rounded">Asignado a otro</span>
                                    }
                                  }

                                  @if (extra.estado === 'En Proceso') {
                                    @if (puedeRealizarOT(extra)) {
                                      <button
                                        (click)="abrirModalPausarEspecial(extra)"
                                        title="Pausar servicio con motivo y vídeo de pausa"
                                        class="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-400 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                                        <i-lucide aria-hidden="true" name="pause" class="w-3.5 h-3.5"></i-lucide>
                                        <span>Pausar</span>
                                      </button>

                                      <button
                                        (click)="abrirModalFinalizarEspecial(extra)"
                                        class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                                        <i-lucide aria-hidden="true" name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
                                        <span>Finalizar</span>
                                      </button>
                                    } @else {
                                      <span class="text-xs text-amber-700 font-semibold px-1.5 py-0.5 bg-amber-50 rounded">En proceso</span>
                                    }
                                  }

                                  @if (extra.estado === 'Pausado') {
                                    @if (puedeRealizarOT(extra)) {
                                      <button
                                        (click)="abrirModalReanudarEspecial(extra)"
                                        title="Reanudar servicio con vídeo de reanudación"
                                        class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer">
                                        <i-lucide aria-hidden="true" name="play" class="w-3.5 h-3.5"></i-lucide>
                                        <span>Reanudar</span>
                                      </button>
                                    } @else {
                                      <span class="text-xs text-orange-700 font-semibold px-1.5 py-0.5 bg-orange-50 rounded">Pausado</span>
                                    }
                                  }

                                  @if (extra.estado === 'Completado') {
                                    <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs inline-flex items-center gap-1 border border-emerald-200">
                                      <i-lucide aria-hidden="true" name="check" class="w-3.5 h-3.5"></i-lucide>
                                      <span>Listo</span>
                                    </span>
                                  }

                                  @if (puedeReasignarExtra(extra)) {
                                    <button type="button" (click)="abrirModalReasignar(extra)" title="Cambiar el pulidor asignado"
                                      class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer transition-colors">Reasignar</button>
                                  }
                                  @if (puedeAnularEspecial(extra)) {
                                    <button type="button" (click)="abrirModalAnularEspecial(extra)" title="Anular servicio (pide el motivo)"
                                      class="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-xs font-bold cursor-pointer transition-colors">Anular</button>
                                  }
                                  <button
                                    (click)="abrirDetalleEspecial(extra)"
                                    title="Ver detalle del servicio"
                                    class="inline-flex items-center justify-center min-w-9 min-h-9 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" aria-label="Ver detalle del servicio">
                                    <i-lucide aria-hidden="true" name="info" class="w-4 h-4"></i-lucide>
                                  </button>
                                </div>
            </div>
          </ng-template>
            </app-data-table>
          }

          <!-- Vista de tarjetas (móvil / tablet): scroll infinito -->
          @if (!esEscritorio) {
          <div class="divide-y divide-slate-100 flex-1">
            @for (extra of listaE.items; track extra.id) {
              <div class="p-4 hover:bg-amber-50/20 transition-colors">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <span class="font-mono font-extrabold text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                      {{ extra.ordenTrabajoOT || extra.codigoSE }}
                    </span>
                    <div class="font-bold text-slate-900 text-sm mt-1.5">{{ extra.vehiculoInfo?.marca }} {{ extra.vehiculoInfo?.modelo }}</div>
                    <div class="text-xs font-mono font-extrabold text-easydry-blue">{{ extra.vehiculoInfo?.placa || extra.placa }}</div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-xs font-extrabold text-center"
                    [ngClass]="estadoExtraClass(extra.estado)">
                    {{ extra.estado }}
                  </span>
                </div>

                <div class="text-xs font-semibold text-slate-700 mb-1">
                  {{ extra.servicioNombre }}
                </div>
                <div class="text-xs text-slate-600 flex items-center gap-1 mb-2">
                  <i-lucide aria-hidden="true" name="building-2" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i-lucide>
                  <span>{{ extra.agenciaNombre || extra.agencia?.nombre || 'Sede Zonal' }}</span>
                </div>

                @if ((extra.tiempoPausaTotalSeg && extra.tiempoPausaTotalSeg > 0) || extra.tiempoEfectivoFormateado) {
                  <div class="flex flex-wrap items-center gap-1.5 mb-2 text-xs font-mono font-bold">
                    @if (extra.tiempoPausaTotalSeg && extra.tiempoPausaTotalSeg > 0) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md">
                        <i-lucide aria-hidden="true" name="pause-circle" class="w-3 h-3"></i-lucide>
                        <span>Pausa: {{ extra.tiempoPausaFormateado }}</span>
                      </span>
                    }
                    @if (extra.tiempoEfectivoFormateado) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-md">
                        <i-lucide aria-hidden="true" name="timer" class="w-3 h-3"></i-lucide>
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
                      class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                      <i-lucide aria-hidden="true" name="video" class="w-3 h-3 text-amber-600"></i-lucide>
                      <span>Vídeo Inicio</span>
                    </button>
                  }
                  @if ((extra.historialPausas && extra.historialPausas.length > 0) || extra.videoUltimaPausaUrl || extra.videoPausa) {
                    <button
                      type="button"
                      (click)="verEvidenciasPausas(extra)"
                      class="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                      <i-lucide aria-hidden="true" name="pause-circle" class="w-3 h-3 text-orange-600"></i-lucide>
                      <span>Pausas {{ extra.historialPausas && extra.historialPausas.length > 0 ? '(' + extra.historialPausas.length + ')' : '' }}</span>
                    </button>
                  }
                  @if (extra.videoFinalUrl || extra.videoFinal) {
                    <button
                      type="button"
                      (click)="verVideoGenerico(extra.videoFinalUrl || extra.videoFinal, 'Vídeo Final OT: ' + extra.codigoSE)"
                      class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs">
                      <i-lucide aria-hidden="true" name="film" class="w-3 h-3 text-emerald-600"></i-lucide>
                      <span>Vídeo Fin</span>
                    </button>
                  }
                </div>

                <div class="flex items-center justify-between mt-3 text-xs gap-2 pt-2 border-t border-slate-100">
                  <div class="min-w-0 space-y-1">
                    <div class="flex items-center gap-1 text-slate-700">
                      <i-lucide aria-hidden="true" name="user" class="w-3.5 h-3.5 text-amber-600 shrink-0"></i-lucide>
                      <span class="text-[10px] font-bold uppercase tracking-wide text-amber-700">Responsable</span>
                      <span class="truncate font-semibold">{{ extra.operadoresNombres?.[0] || extra.operadorNombre }}</span>
                    </div>
                    @for (nombre of (extra.operadoresNombres || []).slice(1); track $index) {
                      <div class="pl-5 text-slate-500 truncate">
                        <span class="font-semibold">Asignado:</span> {{ nombre }}
                      </div>
                    }
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    @if (extra.estado === 'Pendiente') {
                      @if (puedeRealizarOT(extra)) {
                        <button (click)="abrirModalIniciarEspecial(extra)" class="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold">Iniciar</button>
                      } @else {
                        <span class="text-xs text-slate-500 italic">Asignado</span>
                      }
                    }
                    @if (extra.estado === 'En Proceso') {
                      @if (puedeRealizarOT(extra)) {
                        <button (click)="abrirModalPausarEspecial(extra)" class="px-2 py-1 bg-amber-500/20 text-amber-900 border border-amber-400 rounded-lg text-xs font-bold">Pausar</button>
                        <button (click)="abrirModalFinalizarEspecial(extra)" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">Finalizar</button>
                      } @else {
                        <span class="text-xs text-amber-600">En proceso</span>
                      }
                    }
                    @if (extra.estado === 'Pausado') {
                      @if (puedeRealizarOT(extra)) {
                        <button (click)="abrirModalReanudarEspecial(extra)" class="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">Reanudar</button>
                      } @else {
                        <span class="text-xs text-orange-600">Pausado</span>
                      }
                    }
                    @if (puedeReasignarExtra(extra)) {
                      <button type="button" (click)="abrirModalReasignar(extra)" class="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold">Reasignar</button>
                    }
                    @if (puedeAnularEspecial(extra)) {
                      <button type="button" (click)="abrirModalAnularEspecial(extra)" class="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">Anular</button>
                    }
                    <button (click)="abrirDetalleEspecial(extra)" class="inline-flex items-center justify-center min-w-9 min-h-9 text-slate-500 hover:bg-slate-100 rounded-lg" aria-label="Ver detalle"><i-lucide aria-hidden="true" name="info" class="w-4 h-4"></i-lucide></button>
                  </div>
                </div>
              </div>
            }
            @if (listaE.error && listaE.items.length === 0) {
              <div role="alert" class="p-6 flex flex-col items-center gap-3 text-center">
                <div class="estado-error">{{ listaE.error }}</div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="listaE.reiniciar()">Reintentar</button>
              </div>
            } @else if (!listaE.inicializada) {
              <div class="p-4 space-y-3" role="status" aria-label="Cargando">
                @for (n of [1, 2, 3, 4]; track n) {
                  <div class="h-24 rounded-xl bg-slate-100 animate-pulse motion-reduce:animate-none"></div>
                }
              </div>
            } @else if (listaE.items.length === 0) {
              <div class="estado-vacio py-10">{{ tituloVacioE }}</div>
            } @else {
              <app-infinite-scroll
                [hasMore]="listaE.hasMore"
                [loading]="listaE.cargando"
                [error]="listaE.error"
                [total]="listaE.total"
                (cargarMas)="listaE.siguiente()"
                (reintentar)="listaE.reintentar()">
              </app-infinite-scroll>
            }
          </div>
          }
        }
      </div>

      <!-- Modal Detalle Servicio (Mobile) -->
      <app-modal size="md"
        [isOpen]="modalDetalleOpen"
        [title]="'Detalle: ' + (servicioDetalleSeleccionado?.placa || '')"
        icon="info"
        (close)="modalDetalleOpen = false">

        @if (servicioDetalleSeleccionado) {
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-1">Nº OT</span>
                <span class="font-mono font-extrabold text-easydry-blue">{{ servicioDetalleSeleccionado.ordenTrabajoOT }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-1">Vehículo</span>
                <span class="font-bold text-slate-800">{{ servicioDetalleSeleccionado.marca }} {{ servicioDetalleSeleccionado.modelo }}</span>
                <span class="block text-xs text-slate-500 mt-0.5">{{ servicioDetalleSeleccionado.color }}</span>
              </div>
            </div>

            <div class="p-3 bg-easydry-blue/5 rounded-xl border border-easydry-blue/10 text-xs">
              <span class="block text-[11px] text-easydry-blue font-bold uppercase mb-1">Servicio</span>
              <span class="font-bold text-slate-800 text-sm block mb-0.5">{{ servicioDetalleSeleccionado.servicio }}</span>
              <span class="text-slate-500 font-semibold">{{ servicioDetalleSeleccionado.categoriaServicio }}</span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-1">Sucursal / Bahía</span>
                <span class="font-bold text-slate-800 block">{{ servicioDetalleSeleccionado.agencia }}</span>
                <span class="text-slate-500 mt-0.5">{{ servicioDetalleSeleccionado.bahia || 'Sin bahía' }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-1">Horarios</span>
                <span class="font-bold text-slate-800 block">Ingreso: {{ servicioDetalleSeleccionado.horaIngreso || '—' }}</span>
                <span class="text-slate-500 mt-0.5">Salida: {{ servicioDetalleSeleccionado.horaSalida || '—' }}</span>
              </div>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
              <div>
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-1">Lavador</span>
                <span class="font-bold text-slate-800">{{ servicioDetalleSeleccionado.empleado }}</span>
              </div>
              <div class="text-right">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-1">Estado</span>
                <span class="font-extrabold" [ngClass]="{
                  'text-amber-600': servicioDetalleSeleccionado.estado === 'EN PROCESO',
                  'text-easydry-blue': servicioDetalleSeleccionado.estado === 'FINALIZADO',
                  'text-easydry-green-text': servicioDetalleSeleccionado.estado === 'APROBADO',
                  'text-rose-600': servicioDetalleSeleccionado.estado === 'RECHAZADO'
                }">{{ etiquetaEstado(servicioDetalleSeleccionado.estado, true) }}</span>
              </div>
            </div>

            <!-- Registro de la decisión (quién, cuándo y con qué regla) y de la anulación -->
            @if (servicioDetalleSeleccionado.estado === 'FINALIZADO') {
              <div class="p-3 rounded-xl border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-900 space-y-1">
                <p>Pendiente de aprobación.</p>
                @if (servicioDetalleSeleccionado.agenciaSinAprobador) {
                  <p class="text-amber-800">Sin aprobador designado: solo un administrador o el supervisor de la región puede decidir.</p>
                }
              </div>
            }
            @if (servicioDetalleSeleccionado.estado === 'APROBADO' && servicioDetalleSeleccionado.aprobadoPor) {
              <div class="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-900">
                Aprobado por {{ servicioDetalleSeleccionado.aprobadoPor }}{{ etiquetaRegla(servicioDetalleSeleccionado) }}{{ servicioDetalleSeleccionado.fechaAprobacion ? ' el ' + (servicioDetalleSeleccionado.fechaAprobacion | date:'dd/MM/yyyy HH:mm') : '' }}
                @if (servicioDetalleSeleccionado.observacionGerente) { <span class="block font-medium mt-0.5">{{ servicioDetalleSeleccionado.observacionGerente }}</span> }
              </div>
            }
            @if (servicioDetalleSeleccionado.estado === 'RECHAZADO') {
              <div class="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-900">
                Rechazado{{ servicioDetalleSeleccionado.aprobadoPor ? ' por ' + servicioDetalleSeleccionado.aprobadoPor : '' }}{{ etiquetaRegla(servicioDetalleSeleccionado) }}{{ servicioDetalleSeleccionado.fechaAprobacion ? ' el ' + (servicioDetalleSeleccionado.fechaAprobacion | date:'dd/MM/yyyy HH:mm') : '' }}
                @if (servicioDetalleSeleccionado.motivoRechazo) { <span class="block font-medium mt-0.5">Motivo: {{ servicioDetalleSeleccionado.motivoRechazo }}</span> }
              </div>
            }
            @if (servicioDetalleSeleccionado.anuladoEn || servicioDetalleSeleccionado.motivoAnulacion) {
              <div class="p-3 rounded-xl border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-800">
                Servicio anulado{{ servicioDetalleSeleccionado.anuladoEn ? ' el ' + (servicioDetalleSeleccionado.anuladoEn | date:'dd/MM/yyyy HH:mm') : '' }}
                @if (servicioDetalleSeleccionado.motivoAnulacion) { <span class="block font-medium mt-0.5">Motivo: {{ servicioDetalleSeleccionado.motivoAnulacion }}</span> }
              </div>
            }

            <!-- Insumos Utilizados en este Servicio -->
            @if (servicioDetalleSeleccionado.insumosUtilizados && servicioDetalleSeleccionado.insumosUtilizados.length > 0) {
              <div class="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] text-blue-950 font-extrabold uppercase flex items-center gap-1.5">
                    <i-lucide aria-hidden="true" name="boxes" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                    Insumos & Recursos Utilizados
                  </span>
                  <span class="text-xs text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                    Descontado de {{ servicioDetalleSeleccionado.agencia }}
                  </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (ins of servicioDetalleSeleccionado.insumosUtilizados; track ins.productoId) {
                    <div class="p-2.5 bg-white rounded-xl border border-blue-100/80 flex items-center justify-between shadow-2xs">
                      <div>
                        <p class="font-bold text-slate-900 text-xs">{{ ins.productoNombre }}</p>
                        <span class="font-mono text-xs text-slate-500">{{ ins.productoSKU }}</span>
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
                  <i-lucide aria-hidden="true" name="film" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                  Evidencias en Vídeo Registradas
                </span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @if (servicioDetalleSeleccionado.fotoIngresoUrl || servicioDetalleSeleccionado.video || servicioDetalleSeleccionado.videoUrl) {
                    <button
                      type="button"
                      (click)="verVideoGenerico(servicioDetalleSeleccionado.fotoIngresoUrl || servicioDetalleSeleccionado.video || servicioDetalleSeleccionado.videoUrl, 'Vídeo de Ingreso: ' + servicioDetalleSeleccionado.placa)"
                      class="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 font-bold text-slate-800 text-xs transition-colors cursor-pointer shadow-2xs">
                      <div class="w-7 h-7 rounded-lg bg-easydry-blue/10 text-easydry-blue flex items-center justify-center">
                        <i-lucide aria-hidden="true" name="play" class="w-3.5 h-3.5"></i-lucide>
                      </div>
                      <div class="text-left">
                        <p class="text-xs font-bold text-slate-900">Vídeo de Ingreso</p>
                        <p class="text-xs text-slate-500 font-normal">Recepción del auto</p>
                      </div>
                    </button>
                  }
                  @if (servicioDetalleSeleccionado.fotoSalidaUrl) {
                    <button
                      type="button"
                      (click)="verVideoGenerico(servicioDetalleSeleccionado.fotoSalidaUrl, 'Vídeo de Salida: ' + servicioDetalleSeleccionado.placa)"
                      class="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 font-bold text-slate-800 text-xs transition-colors cursor-pointer shadow-2xs">
                      <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <i-lucide aria-hidden="true" name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
                      </div>
                      <div class="text-left">
                        <p class="text-xs font-bold text-slate-900">Vídeo de Salida</p>
                        <p class="text-xs text-slate-500 font-normal">Entrega y acabado</p>
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
                <i-lucide aria-hidden="true" name="check-circle-2" class="w-4 h-4"></i-lucide> Finalizar Servicio
              </button>
            }

            @if (servicioDetalleSeleccionado.estado === 'FINALIZADO' && servicioDetalleSeleccionado.puedeDecidir) {
              <button
                (click)="aprobarServicio(servicioDetalleSeleccionado); modalDetalleOpen = false"
                class="w-full px-4 py-2.5 bg-easydry-green text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm">
                <i-lucide aria-hidden="true" name="thumbs-up" class="w-4 h-4"></i-lucide> Aprobar Servicio
              </button>
            }

            @if (puedeAnularServicio(servicioDetalleSeleccionado)) {
              <button
                type="button"
                (click)="abrirModalAnularGeneral(servicioDetalleSeleccionado)"
                class="w-full px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4"></i-lucide> Anular servicio
              </button>
            }
          }
          <button (click)="modalDetalleOpen = false" class="w-full px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs mt-1 hover:bg-slate-300 transition-colors">Cerrar Detalle</button>
        </div>
      </app-modal>

      <!-- Modal: anular servicio (general o especial) con motivo obligatorio -->
      <app-modal size="md"
        [isOpen]="modalAnularOpen"
        title="Anular servicio"
        icon="alert-triangle"
        (close)="modalAnularOpen = false">
        @if (anularObjetivo) {
          <div class="space-y-3 text-xs">
            <p class="text-slate-600">
              Vas a anular el servicio <b>{{ anularObjetivo.titulo }}</b>. No se borra: queda el registro de quién lo anuló, cuándo y por qué.
            </p>
            <div>
              <label for="srv-anular-motivo" class="block font-bold text-slate-700 mb-1">Motivo de la anulación * (mínimo 5 caracteres)</label>
              <textarea id="srv-anular-motivo" [(ngModel)]="motivoAnulacion" name="motivoAnulacion" rows="3"
                class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"></textarea>
            </div>
            @if (anularObjetivo.tipo === 'general') {
              <label class="flex items-center gap-2 font-semibold text-slate-700">
                <input type="checkbox" [(ngModel)]="reponerInsumosAnulacion" name="reponerInsumosAnulacion" />
                Reponer al inventario los insumos que consumió
              </label>
            }
          </div>
        }
        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button type="button" (click)="modalAnularOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button type="button" (click)="confirmarAnulacion()" [disabled]="motivoAnulacion.trim().length < 5 || anulando"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center">
            Anular servicio
          </button>
        </div>
      </app-modal>

      <!-- Modal: reasignar servicio especial a otro pulidor -->
      <app-modal size="md"
        [isOpen]="modalReasignarOpen"
        title="Reasignar servicio especial"
        icon="user"
        (close)="modalReasignarOpen = false">
        @if (extraReasignar) {
          <div class="space-y-3 text-xs">
            <p class="text-slate-600">Servicio <b>{{ extraReasignar.codigoSE }}</b>. Selecciona uno o varios pulidores de la misma región. El primero seleccionado será responsable de la OT y de los insumos, y debe tener el kit requerido.</p>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              @for (p of pulidoresDisponiblesRegion; track p.id) {
                <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox"
                    [checked]="estaPulidorReasignado(p.id)"
                    [disabled]="esPulidorFijoReasignacion(p) && estaPulidorReasignado(p.id)"
                    (change)="cambiarPulidorReasignacion(p, $event)"
                    class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                  <span class="font-semibold text-slate-700">{{ p.name }} {{ p.lastname }}</span>
                  @if (esPulidorFijoReasignacion(p)) {
                    <span class="ml-auto text-[10px] font-bold text-amber-700">Pulidor fijo · responsable</span>
                  } @else if (esResponsableReasignacion(p.id)) {
                    <span class="ml-auto text-[10px] font-bold text-indigo-700">Responsable e insumos</span>
                  }
                </label>
              }
            </div>
            @if (reasignarOperadoresIds.length > 1) {
              <p class="text-[11px] text-slate-500">Orden de asignación: {{ nombresPulidoresReasignacion }}. El primero queda como responsable.</p>
            }
          </div>
        }
        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button type="button" (click)="modalReasignarOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button type="button" (click)="confirmarReasignacion()" [disabled]="reasignando"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center">
            Confirmar reasignación
          </button>
        </div>
      </app-modal>

      <!-- Modal Digital HOJA DE CONTROL DE SERVICIO (Nueva OT) -->
      <app-modal size="lg"
        [isOpen]="modalNuevoRegistroOpen"
        [title]="agregarServicioOTFuente ? 'Agregar Servicio — OT: ' + (agregarServicioOTFuente.ordenTrabajoOT || '') : 'Digitalización: HOJA DE CONTROL DE SERVICIO'"
        icon="car"
        (close)="agregarServicioOTFuente = null; modalNuevoRegistroOpen = false">

        <form (ngSubmit)="guardarHojaServicio()" class="space-y-5">

          @if (agregarServicioOTFuente) {
            <div class="p-3 bg-violet-50 rounded-xl border border-violet-200 flex items-start gap-2.5">
              <i-lucide aria-hidden="true" name="plus-circle" class="w-4 h-4 text-violet-600 mt-0.5 shrink-0"></i-lucide>
              <div>
                <p class="text-xs font-extrabold text-violet-900 uppercase tracking-wide">Agregando servicio a trabajo existente</p>
                <p class="text-xs text-violet-700 mt-0.5">
                  OT: <strong class="font-mono">{{ agregarServicioOTFuente.ordenTrabajoOT }}</strong>
                  &nbsp;&bull;&nbsp; Placa: <strong class="font-mono">{{ agregarServicioOTFuente.placa }}</strong>
                  &nbsp;&bull;&nbsp; {{ agregarServicioOTFuente.marca }} {{ agregarServicioOTFuente.modelo }}
                  &nbsp;&bull;&nbsp; Color: {{ agregarServicioOTFuente.color }}
                </p>
                <p class="text-xs text-violet-700 mt-0.5">
                  Bahía: <strong>{{ agregarServicioOTFuente.bahia || 'Sin bahía' }}</strong>
                  &nbsp;&bull;&nbsp; Lavador: <strong>{{ agregarServicioOTFuente.empleado || '—' }}</strong>
                </p>
                @if (serviciosYaEnOT.length > 0) {
                  <p class="text-xs text-violet-700 mt-0.5">
                    Servicios ya registrados: <strong>{{ serviciosYaEnOTNombres }}</strong>
                  </p>
                }
                <p class="text-xs text-violet-500 mt-1">Cada servicio agregado aparecerá como una nueva fila con la misma OT y el mismo vehículo. Solo selecciona los servicios a agregar.</p>
              </div>
            </div>
          }

          @if (!agregarServicioOTFuente) {
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-easydry-blue flex items-center justify-between">
            <span>REGISTRO DE ORDEN DE TRABAJO (OT)</span>
            <span class="font-mono">Fecha: {{ nuevoRegistro.fecha }}</span>
          </div>

          <!-- Asignación Operativa: Sucursal, Bahía y Operador (Trazabilidad) -->
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <i-lucide aria-hidden="true" name="map-pin" class="w-4 h-4 text-easydry-blue"></i-lucide>
                Asignación de Sucursal, Bahía & Lavador
              </span>
              @if (isLiderOperador) {
                <span class="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-extrabold border border-teal-200">
                  Líder: {{ userSucursal }}
                </span>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <!-- Sucursal -->
              <div>
                <label for="srv-f1" class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Sucursal / Agencia</label>
                <select id="srv-f1"
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

              <!-- Bahía (el estado 'ocupada' es solo informativo: nunca bloquea la selección ni el guardado) -->
              <div>
                <label for="srv-f2" class="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Bahía de Atención *
                  @if (bahiaOcupadaActual) {
                    <span class="text-amber-600 font-extrabold text-xs ml-1">
                      (En uso por {{ bahiaOcupadaActual.placa }})
                    </span>
                  }
                </label>
                <select id="srv-f2"
                  [(ngModel)]="nuevoRegistro.bahiaId"
                  name="bahiaSelect"
                  (change)="onBahiaFormChange()"
                  [ngClass]="bahiaOcupadaActual ? 'border-amber-400 bg-amber-50/70 text-amber-900 font-bold' : 'border-slate-200 bg-white'"
                  class="w-full p-2 border rounded-xl text-xs font-semibold text-slate-800">
                  <option value="">Sin Bahía Específica</option>
                  @for (b of bahiasSucursalForm; track b.id) {
                    <option [value]="b.id">
                      {{ b.nombre }} {{ b.ocupada ? ('[En uso: ' + b.ocupada.placa + ' - ' + (b.ocupada.ordenTrabajoOT || 'sin OT') + ']') : '[Disponible]' }}
                    </option>
                  }
                </select>
                @if (bahiaOcupadaActual) {
                  <p class="text-xs text-amber-700 font-bold mt-1 flex items-center gap-1.5">
                    <i-lucide aria-hidden="true" name="info" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    <span>La {{ nuevoRegistro.bahia || 'bahía seleccionada' }} tiene un vehículo en proceso ({{ bahiaOcupadaActual.placa }} - {{ bahiaOcupadaActual.ordenTrabajoOT || 'sin OT' }}). Puedes continuar; esto es solo informativo.</span>
                  </p>
                }
              </div>

              <!-- Lavadores asignados a la bahía -->
              <div>
                <span class="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Lavadores asignados
                  <span class="text-easydry-blue font-bold text-xs">(Trazabilidad)</span>
                </span>
                @if (lavadoresAsignadosBahia.length > 0) {
                  <div class="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 space-y-1">
                    @for (lavador of lavadoresAsignadosBahia; track lavador.id) {
                      <label class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          [checked]="lavadorSeleccionado(lavador.id)"
                          (change)="alternarLavadorSeleccionado(lavador.id, $event)"
                          class="h-4 w-4 rounded border-slate-300 text-easydry-blue focus:ring-easydry-blue">
                        <span>{{ lavador.nombre }}</span>
                      </label>
                    }
                  </div>
                  <p class="mt-1 text-[11px] text-slate-500">
                    {{ lavadorIdsSeleccionados.length }} de {{ lavadoresAsignadosBahia.length }} seleccionados para esta OT.
                  </p>
                } @else {
                  <div class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                    No hay lavadores activos asignados a esta bahía. La OT conservará el usuario de la sesión como trazabilidad.
                  </div>
                }
              </div>
            </div>
            <p class="text-xs text-slate-500">
              El servicio computará en la trazabilidad operativa y conteo de servicios del lavador seleccionado.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="srv-f4" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nº OT (Orden Trabajo) *</label>
              <input id="srv-f4" type="text" [(ngModel)]="nuevoRegistro.ordenTrabajoOT" name="ordenTrabajoOT" placeholder="OT-9840"
                [disabled]="!!agregarServicioOTFuente"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-easydry-blue focus:border-easydry-blue focus:ring-easydry-blue disabled:bg-violet-50 disabled:border-violet-200 disabled:text-violet-800 disabled:opacity-90" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Placa Vehículo *</label>
              <input aria-label="PBX-1234"
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
                <p class="text-xs mt-1 font-semibold"
                  [class.text-easydry-green-text]="placaValida"
                  [class.text-rose-600]="placaTocada && !placaValida"
                  [class.text-slate-400]="!placaTocada && !placaValida">
                  {{ placaMensaje }}
                </p>
              }
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="srv-f5" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Marca *</label>
              <input id="srv-f5" type="text" [(ngModel)]="nuevoRegistro.marca" name="marca" placeholder="Toyota"
                [disabled]="!!agregarServicioOTFuente"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue disabled:bg-violet-50 disabled:border-violet-200 disabled:text-violet-800 disabled:opacity-90" required>
            </div>
            <div>
              <label for="srv-f6" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Modelo *</label>
              <input id="srv-f6" type="text" [(ngModel)]="nuevoRegistro.modelo" name="modelo" placeholder="Corolla Cross"
                [disabled]="!!agregarServicioOTFuente"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue disabled:bg-violet-50 disabled:border-violet-200 disabled:text-violet-800 disabled:opacity-90" required>
            </div>
            <div>
              <label for="srv-f7" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Color *</label>
              <input id="srv-f7" type="text" [(ngModel)]="nuevoRegistro.color" name="color" placeholder="Blanco"
                [disabled]="!!agregarServicioOTFuente"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue disabled:bg-violet-50 disabled:border-violet-200 disabled:text-violet-800 disabled:opacity-90" required>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Ingreso *</label>
              <div class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>{{ nuevoRegistro.horaIngreso || '--:--' }}</span>
                <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Automática</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Salida Estimada *</label>
              <div class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>{{ nuevoRegistro.horaSalida || '--:--' }}</span>
                <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Automática</span>
              </div>
            </div>
          </div>
          }

          <!-- Category and Specific Service -->
          <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            @if (!agregarServicioOTFuente) {
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Categoría de Servicio *</label>

            <div class="grid gap-2.5" [ngClass]="(!isPulidor && agenciaFormTieneEspeciales) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'">
              @if (!isPulidor) {
                <label
                  class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold transition-shadow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-easydry-blue"
                  [ngClass]="nuevoRegistro.categoriaServicio === 'GENERAL' ? 'bg-easydry-blue text-white border-easydry-blue shadow-xs' : 'bg-white text-slate-700 hover:border-slate-300'">
                  <input type="radio" [(ngModel)]="nuevoRegistro.categoriaServicio" name="catRadio" value="GENERAL" (change)="onCategoriaChange()" class="sr-only">
                  <span class="flex items-center gap-1.5"><i-lucide aria-hidden="true" name="droplet" class="w-4 h-4"></i-lucide> Generales</span>
                </label>
              }

              @if (agenciaFormTieneEspeciales || isPulidor) {
                <label
                  class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold transition-shadow has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-easydry-blue"
                  [ngClass]="nuevoRegistro.categoriaServicio === 'ESPECIAL' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 hover:border-slate-300'">
                  <input type="radio" [(ngModel)]="nuevoRegistro.categoriaServicio" name="catRadio" value="ESPECIAL" (change)="onCategoriaChange()" class="sr-only">
                  <span class="flex items-center gap-1.5"><i-lucide aria-hidden="true" name="star" class="w-4 h-4"></i-lucide> Especiales</span>
                </label>
              }
            </div>
            }

            @if (esSeleccionMultipleServicios) {
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {{ agregarServicioOTFuente ? 'Servicios a agregar *' : 'Servicios *' }}
                  </label>
                  <span class="text-xs font-bold text-easydry-blue">
                    {{ serviciosSeleccionadosIds.length }} seleccionado(s)
                  </span>
                </div>
                <p class="text-xs text-slate-500 mb-2">Puedes marcar uno o más servicios: cada uno se registrará como una fila con la misma OT.</p>
                @if (opcionesServicios.length === 0) {
                  <p class="text-xs text-slate-500 italic">
                    {{ agregarServicioOTFuente ? 'Esta OT ya tiene todos los servicios generales disponibles en la agencia.' : 'No hay servicios generales asignados a esta agencia.' }}
                  </p>
                } @else {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    @for (s of opcionesServicios; track s.id) {
                      <label
                        class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold transition-shadow"
                        [ngClass]="isServicioSeleccionado(s.id) ? 'bg-easydry-blue/10 border-easydry-blue text-easydry-blue' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'">
                        <input
                          type="checkbox"
                          [checked]="isServicioSeleccionado(s.id)"
                          (change)="toggleServicioSeleccionado(s)"
                          class="w-4 h-4 accent-easydry-blue shrink-0">
                        <span class="flex-1">{{ s.nombre }}</span>
                        @if (s.tiempoEstimadoMin) {
                          <span class="text-xs font-mono text-slate-500">{{ s.tiempoEstimadoMin }} min</span>
                        }
                      </label>
                    }
                  </div>
                }
              </div>
            } @else {
              <div>
                <label for="srv-f8" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Servicio Específico *</label>
                <select id="srv-f8" [(ngModel)]="nuevoRegistro.servicio" name="servicio" (change)="onServicioSelect()" class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
                  @for (s of opcionesServicios; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }}</option>
                  }
                </select>
              </div>
            }
          </div>

          <!-- Insumos y Recursos Utilizados (Descuento Automático de Stock) -->
          <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <i-lucide aria-hidden="true" name="boxes" class="w-4 h-4 text-easydry-blue"></i-lucide>
                Insumos a Consumir en este Servicio
              </label>
              <span class="text-xs text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                Descuento automático de: {{ nuevoRegistro.agencia }}
              </span>
            </div>
            <p class="text-xs text-slate-500">
              Cantidades fijas según la receta del servicio. Para cambiarlas, edita el servicio en Catálogo de Servicios.
            </p>

            @if (insumosConsumoForm.length === 0) {
              <p class="text-xs text-slate-500 italic">No hay insumos asignados a la receta de este servicio.</p>
            } @else {
              <div class="space-y-2">
                @for (ins of insumosConsumoForm; track ins.productoId; let idx = $index) {
                  @let stockDisp = getStockDisponible(ins.productoId, ins.productoSKU);
                  @let faltaStock = stockDisp < ins.cantidad;
                  <div
                    class="p-2.5 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition-shadow"
                    [ngClass]="faltaStock ? 'bg-rose-50/90 border-2 border-rose-400 ring-2 ring-rose-400/20' : 'bg-white border-slate-200'">
                    <div class="overflow-hidden flex-1">
                      <div class="flex items-center gap-1.5">
                        @if (faltaStock) {
                          <i-lucide aria-hidden="true" name="alert-triangle" class="w-3.5 h-3.5 text-rose-600 shrink-0"></i-lucide>
                        }
                        <p class="font-bold text-xs truncate" [ngClass]="faltaStock ? 'text-rose-950 font-extrabold' : 'text-slate-900'">{{ ins.productoNombre }}</p>
                      </div>
                      <div class="flex items-center gap-2 text-xs text-slate-500 flex-wrap mt-0.5">
                        <span class="font-mono bg-slate-100 px-1 py-0.5 rounded">{{ ins.productoSKU }}</span>
                        <span>•</span>
                        <span [class.text-rose-700]="faltaStock" [class.font-extrabold]="faltaStock" [class.text-easydry-blue]="!faltaStock" class="font-semibold">
                          Stock en {{ nuevoRegistro.agencia }}: {{ stockDisp }} {{ ins.unidadMedida }}
                        </span>
                        @if (stockDisp <= 0) {
                          <span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[11px] uppercase tracking-wider">¡Agotado en Agencia!</span>
                        } @else if (faltaStock) {
                          <span class="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-xs">¡Stock Insuficiente (Faltan {{ (ins.cantidad - stockDisp).toFixed(1) }} {{ ins.unidadMedida }})!</span>
                        }
                      </div>
                    </div>

                    <div class="shrink-0 text-right">
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs"
                        [ngClass]="faltaStock ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'">
                        {{ ins.cantidad }} {{ ins.unidadMedida }}
                      </span>
                      <p class="text-xs font-semibold mt-0.5" [ngClass]="faltaStock ? 'text-rose-600 font-bold' : 'text-slate-500'">{{ faltaStock ? 'Sin existencias' : 'Receta fija' }}</p>
                    </div>
                  </div>
                }
              </div>
            }

            @if (tieneInsumosSinStock) {
              <div class="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs shadow-2xs">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4 text-rose-600 mt-0.5 shrink-0"></i-lucide>
                <div>
                  <p class="font-bold">No se puede iniciar el servicio: Stock Insuficiente</p>
                  <p class="text-xs text-rose-700 mt-0.5 leading-relaxed">
                    No hay existencias suficientes de uno o más suministros en esta agencia. Para realizar este servicio se requiere solicitar y recibir suministros desde Bodega Central.
                  </p>
                </div>
              </div>
            }
          </div>

          <!-- Video Proof Upload with Live Device Camera -->
          @if (!agregarServicioOTFuente) {
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
          }

        </form>

        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button (click)="agregarServicioOTFuente = null; modalNuevoRegistroOpen = false" [disabled]="guardandoServicio" class="btn-secondary w-full sm:w-auto disabled:opacity-50">Cancelar</button>
          <button
            (click)="guardarHojaServicio()"
            [disabled]="tieneInsumosSinStock || guardandoServicio || (esSeleccionMultipleServicios && serviciosSeleccionadosIds.length === 0)"
            [class.opacity-50]="tieneInsumosSinStock || guardandoServicio || (esSeleccionMultipleServicios && serviciosSeleccionadosIds.length === 0)"
            [class.cursor-not-allowed]="tieneInsumosSinStock || guardandoServicio || (esSeleccionMultipleServicios && serviciosSeleccionadosIds.length === 0)"
            class="w-full sm:w-auto px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs flex justify-center items-center gap-1.5 transition-all cursor-pointer">
            <i-lucide aria-hidden="true" *ngIf="guardandoServicio" name="loader" class="w-4 h-4 animate-spin"></i-lucide>
            <span>{{ guardandoServicio ? 'Guardando...' : agregarServicioOTFuente ? '+ Agregar Servicio a OT' : 'Guardar e Iniciar Servicio' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Finalizar Servicio de Lavado General (Vídeo de Salida con Cámara) -->
      <app-modal size="md"
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
              <label for="srv-f9" class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones de Entrega (Opcional)</label>
              <input id="srv-f9"
                type="text"
                [(ngModel)]="observacionesSalidaInput"
                placeholder="Ej. Servicio concluido, aspirado y secado verificado..."
                class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
            </div>
          </div>
        }

        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button (click)="cerrarModalFinalizarServicio()" [disabled]="finalizandoServicio" class="btn-secondary w-full sm:w-auto disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarFinalizarServicio()"
            [disabled]="finalizandoServicio"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center">
            <i-lucide aria-hidden="true" *ngIf="finalizandoServicio" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide aria-hidden="true" *ngIf="!finalizandoServicio" name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ finalizandoServicio ? 'Finalizando...' : 'Confirmar y Finalizar Servicio' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Reproductor de Vídeo Evidencia -->
      <app-modal size="lg"
        [isOpen]="modalVideoOpen"
        [title]="'Evidencia en Vídeo: ' + (servicioSeleccionado?.placa || '')"
        icon="film"
        (close)="modalVideoOpen = false">

        @if (servicioSeleccionado) {
          <div class="space-y-4">
            <div class="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              @if (servicioSeleccionado.videoUrl || servicioSeleccionado.video || servicioSeleccionado.fotoIngresoUrl || servicioSeleccionado.fotoSalidaUrl) {
                <video
                  aria-label="Vídeo de evidencia del servicio"
                  [src]="videoEvidenciaUrl"
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
          <button (click)="modalVideoOpen = false" class="btn-secondary w-full sm:w-auto">Cerrar Vídeo</button>
        </div>
      </app-modal>

      <app-modal size="md"
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
                <label for="srv-f10" class="block text-xs font-bold text-slate-700 uppercase mb-1">Equipo Afectado</label>
                <select id="srv-f10" [(ngModel)]="maquinaSeleccionadaId" name="maquinaFalla" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
                  @for (m of maquinasReporte; track m.id) {
                    <option [ngValue]="m.id">{{ m.codigo }} — {{ m.nombre }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="srv-f11" class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Falla</label>
                <select id="srv-f11" [(ngModel)]="nuevoIncidente.tipo" name="tipoFalla" class="w-full p-2.5 border rounded-xl text-xs font-bold">
                  @for (tipo of tiposFallaDisponibles; track tipo) {
                    <option [value]="tipo">{{ tipo }}</option>
                  }
                </select>
              </div>
            </div>
            <div>
              <label for="srv-f12" class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Problema</label>
              <textarea id="srv-f12"
                [(ngModel)]="nuevoIncidente.descripcion"
                name="descripcionFalla"
                placeholder="Describa ruidos, sobrecalentamiento, pads desgastados u otros síntomas..."
                rows="3"
                class="w-full p-3 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                required>
              </textarea>
            </div>
            <!-- Evidencia obligatoria: 1+ foto/video (PDF opcional al reportar; se sube por ticket firmado) -->
            <app-evidencia-selector #selFalla
              contexto="INCIDENTE" fase="reporte"
              [maquinariaCodigo]="codigoMaquinaSeleccionada" [clientUuid]="clientUuidFalla"
              [requiereMultimedia]="true" [requiereDocumento]="false">
            </app-evidencia-selector>
            @if (errorFalla) {
              <div role="alert" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ errorFalla }}</div>
            }
          }
        </form>

        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button (click)="modalReportarFallaOpen = false" class="btn-secondary w-full sm:w-auto">Cancelar</button>
          <button
            (click)="guardarReporteFalla()"
            [disabled]="maquinasReporte.length === 0"
            class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs w-full sm:w-auto justify-center">
            Enviar Reporte
          </button>
        </div>
      </app-modal>

      <!-- Modal Iniciar Servicio Especial (Obligatorio Vídeo Inicial) -->
      <app-modal size="md"
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

        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button (click)="modalIniciarServicioEspecialOpen = false" [disabled]="iniciandoEspecial" class="btn-secondary w-full sm:w-auto disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarIniciarEspecial()"
            [disabled]="iniciandoEspecial || (!videoInicialInput && !videoInicialRecorder?.hasPendingUpload)"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto justify-center">
            <i-lucide aria-hidden="true" *ngIf="iniciandoEspecial" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide aria-hidden="true" *ngIf="!iniciandoEspecial" name="play" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ iniciandoEspecial ? 'Iniciando Trabajo...' : 'Iniciar Trabajo' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Finalizar Servicio Especial (Obligatorio Vídeo Final + Descuento Químicos) -->
      <app-modal size="md"
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
                  <i-lucide aria-hidden="true" name="boxes" class="w-4 h-4 text-blue-600"></i-lucide>
                  <span>Deducción de Insumos de tu Custodia:</span>
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  @for (ins of servicioEspecialSeleccionado.insumosReceta; track ins.productoId) {
                    <div class="p-2 bg-white rounded-lg border border-blue-100 flex items-center justify-between text-xs">
                      <span class="font-bold text-slate-800">{{ ins.productoNombre }}</span>
                      <span class="font-mono font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{{ ins.cantidadSugerida }} {{ ins.unidadMedida }}</span>
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
              <label for="srv-f13" class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones / Notas</label>
              <input id="srv-f13"
                type="text"
                [(ngModel)]="notasFinalizacionInput"
                placeholder="Ej. Pulido de 3 pasos finalizado sin novedades..."
                class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
            </div>
          </div>
        }

        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button (click)="modalFinalizarServicioEspecialOpen = false" [disabled]="finalizandoEspecial" class="btn-secondary w-full sm:w-auto disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarFinalizarEspecial()"
            [disabled]="finalizandoEspecial"
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center">
            <i-lucide aria-hidden="true" *ngIf="finalizandoEspecial" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide aria-hidden="true" *ngIf="!finalizandoEspecial" name="check-circle" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ finalizandoEspecial ? 'Finalizando...' : 'Finalizar y Descontar Químicos' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Pausar Servicio Especial (Motivo + Vídeo Obligatorio) -->
      <app-modal size="md"
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
              <label for="srv-f14" class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo de la Pausa *</label>
              <select id="srv-f14"
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
              <label for="srv-f15" class="block text-xs font-bold text-slate-700 uppercase mb-1">Detalle o Justificación Adicional</label>
              <textarea id="srv-f15"
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

        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button (click)="modalPausarServicioEspecialOpen = false" [disabled]="pausandoEspecial" class="btn-secondary w-full sm:w-auto disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarPausarEspecial()"
            [disabled]="pausandoEspecial"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center">
            <i-lucide aria-hidden="true" *ngIf="pausandoEspecial" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide aria-hidden="true" *ngIf="!pausandoEspecial" name="pause" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ pausandoEspecial ? 'Pausando...' : 'Pausar Servicio' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Reanudar Servicio Especial (Vídeo Obligatorio) -->
      <app-modal size="md"
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
                <p class="text-xs text-amber-800 font-bold mt-1 inline-flex items-center gap-1">
                  <i-lucide aria-hidden="true" name="pause-circle" class="w-3.5 h-3.5"></i-lucide>
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
              <label for="srv-f16" class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones de Reanudación</label>
              <input id="srv-f16"
                type="text"
                [(ngModel)]="observacionesReanudarInput"
                placeholder="Ej. Se retoma pulido tras descanso..."
                class="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
            </div>
          </div>
        }

        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button (click)="modalReanudarEspecialOpen = false" [disabled]="reanudandoEspecial" class="btn-secondary w-full sm:w-auto disabled:opacity-50">Cancelar</button>
          <button
            (click)="confirmarReanudarEspecial()"
            [disabled]="reanudandoEspecial"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center">
            <i-lucide aria-hidden="true" *ngIf="reanudandoEspecial" name="loader" class="w-3.5 h-3.5 animate-spin"></i-lucide>
            <i-lucide aria-hidden="true" *ngIf="!reanudandoEspecial" name="play" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ reanudandoEspecial ? 'Reanudando...' : 'Reanudar Servicio' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Detalle Servicio Especial -->
      <app-modal size="xl"
        [isOpen]="modalDetalleEspecialOpen"
        [title]="'Detalle Especial: ' + (servicioEspecialSeleccionado?.codigoSE || '')"
        icon="star"
        (close)="modalDetalleEspecialOpen = false">

        @if (servicioEspecialSeleccionado) {
          <div class="space-y-4 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-1">Nº OT</span>
                <span class="font-mono font-extrabold text-amber-800">{{ servicioEspecialSeleccionado.ordenTrabajoOT || servicioEspecialSeleccionado.codigoSE }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-1">Región</span>
                <span class="font-bold text-slate-800">{{ servicioEspecialSeleccionado.regionNombre || userRegionNombre }}</span>
              </div>
            </div>

            <div class="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <span class="block text-[11px] text-amber-800 font-bold uppercase mb-0.5">Vehículo Asignado</span>
              <p class="font-extrabold text-slate-900 text-sm">
                {{ servicioEspecialSeleccionado.vehiculoInfo?.marca }} {{ servicioEspecialSeleccionado.vehiculoInfo?.modelo }}
              </p>
              <p class="font-mono font-extrabold text-easydry-blue text-xs mt-0.5">
                Placa: {{ servicioEspecialSeleccionado.vehiculoInfo?.placa || servicioEspecialSeleccionado.placa }} • Color: {{ servicioEspecialSeleccionado.vehiculoInfo?.color }}
              </p>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Pulidor Responsable</span>
                <span class="font-bold text-slate-800">{{ servicioEspecialSeleccionado.operadorNombre }}</span>
              </div>
              <div class="text-right">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Estado</span>
                <span class="px-2.5 py-1 rounded-full text-xs font-extrabold inline-block" [ngClass]="estadoExtraClass(servicioEspecialSeleccionado.estado)">
                  {{ servicioEspecialSeleccionado.estado }}
                </span>
              </div>
            </div>

            <!-- Fechas y horas: creación, inicio y fin -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Creada</span>
                <span class="font-mono font-bold text-slate-800 text-xs">{{ servicioEspecialSeleccionado.createdAt ? (servicioEspecialSeleccionado.createdAt | date:'dd/MM/yyyy HH:mm') : '-' }}</span>
                @if (servicioEspecialSeleccionado.creadoPorNombre) {
                  <p class="text-xs text-slate-500 mt-0.5">Por: {{ servicioEspecialSeleccionado.creadoPorNombre }}</p>
                }
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Inicio del servicio</span>
                <span class="font-mono font-bold text-slate-800 text-xs">{{ servicioEspecialSeleccionado.fechaInicio ? (servicioEspecialSeleccionado.fechaInicio | date:'dd/MM/yyyy HH:mm') : 'Aún no inicia' }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[11px] text-slate-500 font-bold uppercase mb-0.5">Fin del servicio</span>
                <span class="font-mono font-bold text-slate-800 text-xs">{{ servicioEspecialSeleccionado.fechaFin ? (servicioEspecialSeleccionado.fechaFin | date:'dd/MM/yyyy HH:mm') : 'En curso / pendiente' }}</span>
              </div>
            </div>

            <!-- Tiempos de Pausa, Efectivo y Total -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                <span class="block text-[11px] text-amber-800 font-bold uppercase mb-0.5">Tiempo Pausado</span>
                <span class="inline-flex items-center gap-1 font-mono font-extrabold text-amber-900 text-xs">
                  <i-lucide aria-hidden="true" name="pause-circle" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ servicioEspecialSeleccionado.tiempoPausaFormateado || '0 min' }}</span>
                </span>
                @if (servicioEspecialSeleccionado.motivoUltimaPausa) {
                  <p class="text-xs text-slate-500 mt-1 truncate" [title]="servicioEspecialSeleccionado.motivoUltimaPausa">
                    {{ servicioEspecialSeleccionado.motivoUltimaPausa }}
                  </p>
                }
              </div>
              <div class="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                <span class="block text-[11px] text-blue-800 font-bold uppercase mb-0.5">Tiempo Efectivo (Neto)</span>
                <span class="inline-flex items-center gap-1 font-mono font-extrabold text-blue-900 text-xs">
                  <i-lucide aria-hidden="true" name="timer" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ servicioEspecialSeleccionado.tiempoEfectivoFormateado || '0 min' }}</span>
                </span>
              </div>
              <div class="p-3 bg-slate-100 rounded-xl border border-slate-300">
                <span class="block text-[11px] text-slate-700 font-bold uppercase mb-0.5">Tiempo Total</span>
                <span class="inline-flex items-center gap-1 font-mono font-extrabold text-slate-900 text-xs">
                  <i-lucide aria-hidden="true" name="clock" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ servicioEspecialSeleccionado.fechaInicio ? (servicioEspecialSeleccionado.tiempoTotalFormateado || '0 min') : '-' }}</span>
                </span>
                <p class="text-xs text-slate-500 mt-1">Pausa + efectivo</p>
              </div>
            </div>

            <!-- Evidencias en Vídeo -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[11px] text-slate-500 font-bold uppercase mb-1">Vídeo Inicial</span>
                @if (servicioEspecialSeleccionado.videoInicialUrl || servicioEspecialSeleccionado.videoInicial) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoInicialUrl || servicioEspecialSeleccionado.videoInicial, 'Vídeo Inicial: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide aria-hidden="true" name="play" class="w-3 h-3"></i-lucide>
                    <span>Inicial</span>
                  </button>
                } @else {
                  <span class="text-xs text-slate-500 italic text-center py-1">-</span>
                }
              </div>

              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[11px] text-slate-500 font-bold uppercase mb-1">Vídeo Pausa</span>
                @if (servicioEspecialSeleccionado.videoPausa || servicioEspecialSeleccionado.videoUltimaPausaUrl) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoPausa || servicioEspecialSeleccionado.videoUltimaPausaUrl, 'Vídeo de Pausa: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide aria-hidden="true" name="pause" class="w-3 h-3"></i-lucide>
                    <span>Pausa</span>
                  </button>
                } @else {
                  <span class="text-xs text-slate-500 italic text-center py-1">-</span>
                }
              </div>

              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[11px] text-slate-500 font-bold uppercase mb-1">Vídeo Reanudar</span>
                @if (servicioEspecialSeleccionado.videoReanudacion || servicioEspecialSeleccionado.videoUltimaReanudacionUrl) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoReanudacion || servicioEspecialSeleccionado.videoUltimaReanudacionUrl, 'Vídeo Reanudación: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide aria-hidden="true" name="play" class="w-3 h-3"></i-lucide>
                    <span>Reanudar</span>
                  </button>
                } @else {
                  <span class="text-xs text-slate-500 italic text-center py-1">-</span>
                }
              </div>

              <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span class="text-[11px] text-slate-500 font-bold uppercase mb-1">Vídeo Final</span>
                @if (servicioEspecialSeleccionado.videoFinalUrl || servicioEspecialSeleccionado.videoFinal) {
                  <button
                    (click)="verVideoGenerico(servicioEspecialSeleccionado.videoFinalUrl || servicioEspecialSeleccionado.videoFinal, 'Vídeo Final: ' + servicioEspecialSeleccionado.codigoSE)"
                    class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-2xs">
                    <i-lucide aria-hidden="true" name="play" class="w-3 h-3"></i-lucide>
                    <span>Final</span>
                  </button>
                } @else {
                  <span class="text-xs text-slate-500 italic text-center py-1">-</span>
                }
              </div>
            </div>
          </div>
        }

        <div modal-footer class="w-full">
          <button (click)="modalDetalleEspecialOpen = false" class="btn-secondary w-full sm:w-auto">Cerrar</button>
        </div>
      </app-modal>

      <!-- Modal Reproductor de Vídeo Genérico -->
      <app-modal size="lg"
        [isOpen]="modalVideoGenericoOpen"
        [title]="videoGenericoTitulo"
        icon="film"
        (close)="modalVideoGenericoOpen = false">

        <div class="space-y-3">
          <!-- Visor de Video Principal -->
          <div class="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center group">
            <video
              #modalVideoPlayer
              aria-label="Reproductor de vídeo de evidencia"
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
              <div class="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none z-10 transition-shadow">
                <div class="w-10 h-10 border-4 border-easydry-green border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
          </div>
        </div>

        <div modal-footer class="w-full sm:w-auto">
          <button (click)="modalVideoGenericoOpen = false" class="btn-secondary w-full sm:w-auto">Cerrar Reproductor</button>
        </div>
      </app-modal>

      <!-- Modal Historial de Evidencias de Pausas -->
      <app-modal size="lg"
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
                <span class="text-[11px] text-amber-800 font-bold uppercase block">Tiempo Pausado</span>
                <span class="inline-flex items-center gap-1 font-mono font-extrabold text-amber-950 text-xs">
                  <i-lucide aria-hidden="true" name="pause-circle" class="w-3.5 h-3.5"></i-lucide>
                  <span>{{ servicioPausasSeleccionado.tiempoPausaFormateado || '0 min' }}</span>
                </span>
              </div>
            </div>

            <div class="space-y-2.5">
              @for (p of pausasSeleccionadas; track p.id || $index; let idx = $index) {
                <div class="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center">
                        #{{ idx + 1 }}
                      </span>
                      <div>
                        <span class="font-extrabold text-xs text-slate-900 block">{{ p.motivo || 'Pausa Operativa' }}</span>
                        @if (p.fechaInicio) {
                          <span class="text-xs text-slate-500 font-mono">{{ p.fechaInicio | date:'short' }}</span>
                        }
                      </div>
                    </div>
                    @if (p.duracionSegundos) {
                      <span class="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
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
                        <i-lucide aria-hidden="true" name="pause" class="w-3.5 h-3.5"></i-lucide>
                        <span>Vídeo de Pausa</span>
                      </button>
                    } @else {
                      <span class="text-xs text-slate-500 italic">Sin vídeo de pausa</span>
                    }

                    @if (p.videoReanudacionUrl) {
                      <button
                        type="button"
                        (click)="verVideoGenerico(p.videoReanudacionUrl, 'Vídeo de Reanudación #' + (idx + 1) + ' — OT: ' + (servicioPausasSeleccionado.codigoSE || ''))"
                        class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 shadow-2xs cursor-pointer">
                        <i-lucide aria-hidden="true" name="play" class="w-3.5 h-3.5"></i-lucide>
                        <span>Vídeo de Reanudación</span>
                      </button>
                    } @else if (p.fechaFin) {
                      <span class="text-xs text-slate-500 italic">Sin vídeo de reanudación</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div modal-footer class="w-full">
          <button (click)="modalPausasDetalleOpen = false" class="btn-secondary w-full sm:w-auto">Cerrar</button>
        </div>
      </app-modal>

      <!-- Modal Crear / Asignar Servicio Especial (Restringido a Región) -->
      <app-modal size="lg"
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
                <i-lucide aria-hidden="true" name="map-pin" class="w-4 h-4 text-amber-600"></i-lucide>
                Asignación de Sucursal & Pulidor
              </span>
              @if (isPulidorFijo) {
                <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold border border-amber-200">
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

              <!-- Pulidores asignados: el primero opera y se valida contra su kit. -->
              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Pulidores Asignados *
                  @if (pulidorFijoAgenciaSeleccionada) {
                    <span class="text-emerald-700 font-bold text-xs">(Fijo primero)</span>
                  } @else {
                    <span class="text-blue-700 font-bold text-xs">(Seleccione uno o varios)</span>
                  }
                </label>
                <div class="max-h-48 overflow-y-auto rounded-xl border border-blue-200 bg-white divide-y divide-slate-100">
                  @for (p of pulidoresDisponiblesParaAgencia; track p.id) {
                    <label class="flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-blue-50">
                      <input
                        type="checkbox"
                        [name]="'operadorExtra-' + p.id"
                        [checked]="estaPulidorSeleccionado(p.id)"
                        [disabled]="esPulidorFijoAsignado(p)"
                        (change)="onOperadorExtraToggle(p, $event)"
                        class="rounded border-slate-300 text-blue-700 focus:ring-blue-600">
                      <span class="min-w-0 flex-1 text-xs font-semibold text-slate-800">{{ p.name }} {{ p.lastname }}</span>
                      @if (esPulidorFijoAsignado(p)) {
                        <span class="text-xs font-bold text-emerald-700">Fijo · Responsable principal</span>
                      } @else {
                        <span class="text-xs text-slate-500">{{ p.agenciaId || p.agencia?.id ? 'Fijo' : 'Móvil' }}</span>
                      }
                    </label>
                  }
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  Todos recibirán la OT. Solo el primero seleccionado podrá operarla y registrar evidencias; sus insumos se validan contra su kit.
                </p>
              </div>
            </div>
            <p class="text-xs text-slate-500">
              El servicio especial computará en la trazabilidad operativa y kit en custodia del pulidor asignado.
            </p>
          </div>

          <!-- Identificación del Servicio: OT y Placa -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="srv-f17" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nº OT (Orden Trabajo) *</label>
              <input id="srv-f17"
                type="text"
                [(ngModel)]="extraFormOT"
                name="extraOT"
                placeholder="OT-9840"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-800 focus:border-amber-500 focus:ring-amber-500"
                required>
            </div>
            <div>
              <label for="srv-f18" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Placa Vehículo *</label>
              <input id="srv-f18"
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
              <label for="srv-f19" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Marca *</label>
              <input id="srv-f19" type="text" [(ngModel)]="extraFormMarca" name="extraMarca" placeholder="Toyota" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-amber-500" required>
            </div>
            <div>
              <label for="srv-f20" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Modelo *</label>
              <input id="srv-f20" type="text" [(ngModel)]="extraFormModelo" name="extraModelo" placeholder="Fortuner" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-amber-500" required>
            </div>
            <div>
              <label for="srv-f21" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Color *</label>
              <input id="srv-f21" type="text" [(ngModel)]="extraFormColor" name="extraColor" placeholder="Negro" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-amber-500" required>
            </div>
          </div>

          <!-- Horas de Ingreso y Salida Estimada -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Ingreso *</label>
              <div class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>{{ extraFormHoraIngreso || '--:--' }}</span>
                <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Automática</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora Salida Estimada *</label>
              <div class="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>{{ extraFormHoraSalida || '--:--' }}</span>
                <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Estimada Catálogo</span>
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
              <input aria-label="Ej. Pulido y Corrección de Pintura en 3 Pasos"
                type="text"
                [(ngModel)]="extraForm.servicioNombre"
                name="servicioNombreExtra"
                placeholder="Ej. Pulido y Corrección de Pintura en 3 Pasos"
                class="w-full p-2.5 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                required>
            }
            @if (servicioEspecialCatalogo?.precio != null) {
              <p class="text-xs text-slate-500 mt-1">
                Precio del catálogo: <span class="font-bold text-slate-700">\${{ servicioEspecialCatalogo?.precio }}</span>
              </p>
            }
          </div>

          <!-- Insumos Requeridos por el Servicio Especial -->
          @if (extraForm.insumosReceta && extraForm.insumosReceta.length > 0) {
            <div class="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <i-lucide aria-hidden="true" name="boxes" class="w-4 h-4 text-amber-600"></i-lucide>
                  Insumos Requeridos (Receta del Servicio)
                </label>
                @if (extraForm.operadorId) {
                  <span class="text-xs text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full" [ngClass]="pulidorSeleccionadoActual?.esMovil ? 'bg-blue-500' : 'bg-emerald-500'"></span>
                    Kit de: <b class="text-slate-800">{{ extraForm.operadorNombre || 'Pulidor asignado' }}</b>
                    <span class="text-xs text-slate-500">({{ pulidorSeleccionadoActual?.esMovil ? 'Móvil' : 'Fijo' }})</span>
                  </span>
                } @else {
                  <span class="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Sin pulidor seleccionado
                  </span>
                }
              </div>
              <p class="text-xs text-slate-500">
                Cantidades fijas según la receta del servicio especial. Se verifica el kit del pulidor asignado (móvil o fijo) en tiempo real.
              </p>

              @if (validandoStockPulidorOT) {
                <div class="p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-900 flex items-center gap-2 animate-pulse">
                  <i-lucide aria-hidden="true" name="loader" class="w-4 h-4 animate-spin text-blue-600 shrink-0"></i-lucide>
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
                        <div class="flex items-center gap-2 text-xs text-slate-500 flex-wrap mt-0.5">
                          <span class="font-mono bg-slate-100 px-1 py-0.5 rounded">{{ ins.productoSKU || ins.codigoSKU || '—' }}</span>
                          <span>•</span>
                          <span class="italic text-amber-700">Seleccione un pulidor para validar existencias</span>
                        </div>
                      </div>
                      <div class="shrink-0 text-right">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200">
                          {{ ins.cantidadSugerida || ins.cantidad || 0 }} {{ ins.unidadMedida || '' }}
                        </span>
                        <p class="text-xs font-semibold text-slate-500 mt-0.5">Receta requerida</p>
                      </div>
                    </div>
                  } @else {
                    <!-- Pulidor seleccionado: muestra stock en kit vs necesario con validación en tiempo real -->
                    <div
                      class="p-2.5 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition-shadow"
                      [ngClass]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0) ? 'bg-rose-50/90 border-2 border-rose-400 ring-2 ring-rose-400/20' : 'bg-white border-slate-200'">
                      <div class="overflow-hidden flex-1">
                        <div class="flex items-center gap-1.5">
                          @if (getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0)) {
                            <i-lucide aria-hidden="true" name="alert-triangle" class="w-3.5 h-3.5 text-rose-600 shrink-0"></i-lucide>
                          } @else {
                            <i-lucide aria-hidden="true" name="check-circle" class="w-3.5 h-3.5 text-emerald-500 shrink-0"></i-lucide>
                          }
                          <p class="font-bold text-xs truncate"
                            [ngClass]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0) ? 'text-rose-950 font-extrabold' : 'text-slate-900'">
                            {{ ins.productoNombre || ins.insumoNombre }}
                          </p>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-slate-500 flex-wrap mt-0.5">
                          <span class="font-mono bg-slate-100 px-1 py-0.5 rounded">{{ ins.productoSKU || ins.codigoSKU || '—' }}</span>
                          <span>•</span>
                          <span class="font-semibold"
                            [class.text-rose-700]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0)"
                            [class.font-extrabold]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0)"
                            [class.text-emerald-700]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) >= (ins.cantidadSugerida || ins.cantidad || 0)">
                            Kit del pulidor: {{ getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) }} {{ ins.unidadMedida || '' }}
                          </span>
                          @if (getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) <= 0) {
                            <span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[11px] uppercase tracking-wider">¡Agotado!</span>
                          } @else if (getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0)) {
                            <span class="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-xs">
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
                        <p class="text-xs font-semibold mt-0.5"
                          [ngClass]="getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0) ? 'text-rose-600 font-bold' : 'text-slate-500'">
                          {{ getStockCantidadInsumoPublic(ins.productoId || ins.insumoId || '', ins.productoSKU || ins.codigoSKU, ins.productoNombre || ins.insumoNombre) < (ins.cantidadSugerida || ins.cantidad || 0) ? 'Insuficiente' : 'Verificado' }}
                        </p>
                      </div>
                    </div>
                  }
                }
              </div>

              @if (faltantesInsumosOT.length > 0 && extraForm.operadorId) {
                <div class="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs shadow-2xs">
                  <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4 text-rose-600 mt-0.5 shrink-0"></i-lucide>
                  <div>
                    <p class="font-bold">No se puede crear la OT: insumos insuficientes en el kit del pulidor</p>
                    <p class="text-xs text-rose-700 mt-0.5 leading-relaxed">
                      El pulidor asignado ({{ extraForm.operadorNombre || 'pulidor' }}) no cuenta con todos los insumos requeridos. Solicite un despacho y asegúrese de que el pulidor lo confirme antes de asignarle esta OT.
                    </p>
                  </div>
                </div>
              }
              @if (!validandoStockPulidorOT && faltantesInsumosOT.length === 0 && extraForm.insumosReceta.length > 0 && extraForm.operadorId) {
                <div class="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                  <i-lucide aria-hidden="true" name="check-circle" class="w-4 h-4 text-emerald-600"></i-lucide>
                  <span>Kit del pulidor verificado y suficiente para ejecutar este servicio.</span>
                </div>
              }
            </div>
          } @else if (extraForm.servicioNombre && !validandoStockPulidorOT) {
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
              <i-lucide aria-hidden="true" name="info" class="w-4 h-4 text-slate-400 shrink-0"></i-lucide>
              <span>Este servicio no tiene una receta de insumos configurada en el catálogo.</span>
            </div>
          }

          @if (isSuperAdmin || isAdmin) {
            <div class="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-xs text-indigo-900 font-semibold flex items-center gap-2">
              <i-lucide aria-hidden="true" name="shield-check" class="w-4 h-4 text-indigo-600 shrink-0"></i-lucide>
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
              <i-lucide aria-hidden="true" name="film" class="w-4 h-4 text-amber-600 shrink-0"></i-lucide>
              <div class="space-y-0.5">
                <p class="font-bold">Evidencia de Vídeo Inicial diferida al Pulidor</p>
                <p class="text-xs text-amber-800/90">El pulidor asignado grabará obligatoriamente el vídeo de recepción con la cámara de su dispositivo al momento de iniciar el trabajo en la bahía o sede.</p>
              </div>
            </div>
          }

          <div>
            <label for="srv-f22" class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones / Instrucciones</label>
            <textarea id="srv-f22"
              [(ngModel)]="extraForm.notas"
              name="notasExtra"
              placeholder="Instrucciones para el pulidor..."
              rows="2"
              class="w-full p-2.5 border rounded-xl text-xs">
            </textarea>
          </div>
        </form>

        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button (click)="cerrarModalExtras()" class="btn-secondary w-full sm:w-auto">Cancelar</button>
          <button
            (click)="guardarServicioExtra()"
            [disabled]="!puedeCrearOTEspecialConInsumos"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600 w-full sm:w-auto justify-center">
            <i-lucide aria-hidden="true" name="plus" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ isCoordServiciosEspeciales ? 'Crear y Asignar OT a Pulidor' : 'Crear y Notificar Servicio' }}</span>
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class ServiciosComponent implements OnInit, OnDestroy {
  // ── Pestaña Activa: Servicios Generales vs Servicios Especiales ──
  tabActiva: 'generales' | 'especiales' = 'generales';

  cambiarTab(tab: 'generales' | 'especiales') {
    if (tab === 'generales' && !this.puedeVerGenerales && this.puedeVerEspeciales) tab = 'especiales';
    if (tab === 'especiales' && !this.puedeVerEspeciales && this.puedeVerGenerales) tab = 'generales';
    this.tabActiva = tab;
    this.cargarVistaActual();
  }

  abrirModalNuevaOT() {
    if (this.tabActiva === 'especiales') {
      if (!this.puedeCrearEspecial) {
        this.toastService.warning('Acceso restringido', 'Tu rol no tiene permiso para crear servicios especiales.');
        return;
      }
      this.abrirModalNuevoExtra();
      return;
    }
    if (!this.puedeCrearGeneral) {
      this.toastService.warning('Acceso restringido', 'Tu rol no tiene permiso para crear órdenes de trabajo.');
      return;
    }
    this.agregarServicioOTFuente = null;
    this.lavadorIdsSeleccionados = [];
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
    // La OT la escribe siempre el usuario: el campo queda vacío al abrir el modal.
    this.nuevoRegistro.ordenTrabajoOT = '';
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
    if (this.authService.puede('inventario.ver')) this.inventarioService.cargarItems();
    this.onSucursalFormChange();
    if (!this.agenciaFormTieneEspeciales) {
      this.nuevoRegistro.categoriaServicio = 'GENERAL';
    }
    this.onCategoriaChange();
    this.modalNuevoRegistroOpen = true;
  }

  /**
   * Abre el modal de nueva OT en modo "agregar servicio a OT existente".
   * Vehículo, OT, bahía y evidencia de ingreso se heredan de la fila original:
   * solo se eligen los servicios nuevos.
   */
  abrirModalAgregarServicioAOT(item: VehiculoServicio): void {
    if (!this.puedeAgregarServicio(item)) return;

    this.agregarServicioOTFuente = item;
    this.lavadorIdsSeleccionados = (item.operadoresAsignados || []).map((op) => String(op.id));

    // Misma inicialización base que abrirModalNuevaOT pero manteniendo los datos del vehículo
    const user = this.authService.getCurrentUser();
    if (item.empleado) {
      this.nuevoRegistro.empleado = item.empleado;
    } else if (user) {
      this.nuevoRegistro.empleado = `${user.nombre} ${user.apellido}`.trim();
    }

    // Preservar datos del vehículo original
    this.nuevoRegistro.ordenTrabajoOT = item.ordenTrabajoOT || '';
    this.nuevoRegistro.placa = item.placa || '';
    this.nuevoRegistro.marca = item.marca || '';
    this.nuevoRegistro.modelo = item.modelo || '';
    this.nuevoRegistro.color = item.color || '';
    this.nuevoRegistro.agencia = item.agencia || '';
    this.nuevoRegistro.foto = '';
    this.nuevoRegistro.videoUrl = this.getVideoInicial(item) || '';
    this.nuevoRegistro.bahiaId = item.bahiaId ? String(item.bahiaId) : '';
    this.nuevoRegistro.bahia = item.bahia || '';
    this.nuevoRegistro.fecha = new Date().toISOString().substring(0, 10);
    this.nuevoRegistro.categoriaServicio = 'GENERAL';

    this.asignarHorasAutomaticasOT();
    this.placaTocada = false;
    this.videoFileSelected = false;
    this.videoFileName = '';
    if (this.authService.puede('inventario.ver')) this.inventarioService.cargarItems();
    this.onSucursalFormChange();
    this.onCategoriaChange();
    this.modalNuevoRegistroOpen = true;
  }

  /** Total de servicios de lavado del alcance del usuario (lo da el servidor; no depende de la página cargada). */
  get countServiciosGenerales(): number {
    return this.conteoGenerales;
  }

  get countServiciosEspeciales(): number {
    return this.conteoEspeciales;
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
    // El líder (y Backup) solo registra servicios generales, aunque su agencia tenga especiales habilitados.
    if (this.isLiderOperador) return false;
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

  /**
   * Servicios recientes (hasta 100) cargados aparte para las validaciones del formulario (OT/placa duplicada, bahía ocupada,
   * servicios de la misma OT). Lo que se ve en pantalla viene de la consulta paginada del servidor (filasG / listaG).
   */
  servicios: VehiculoServicio[] = [];
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

  // ══════════════════════════════════════════════════════════════════════════
  //  Paginación, orden, búsqueda y filtros en el SERVIDOR
  //  Tablas (escritorio) → páginas numeradas. Tarjetas (móvil) → scroll infinito de a 30.
  // ══════════════════════════════════════════════════════════════════════════

  readonly minBusqueda = BUSQUEDA_MIN_CARACTERES;
  /** true cuando el usuario escribió 1 letra (se pide un mínimo de 2 antes de consultar). */
  busquedaCorta = false;
  /** Texto que realmente se envía al servidor (ya con el mínimo de letras y la espera de 300 ms). */
  private busquedaAplicada = '';
  private readonly busqueda$ = new Subject<string>();
  private suscripcionBusqueda?: Subscription;

  /** Escritorio (>= 1024 px) = tabla; menos = tarjetas. Solo se carga la vista que se muestra. */
  esEscritorio = true;
  private mediaEscritorio?: MediaQueryList;
  private readonly alCambiarPantalla = (e: MediaQueryListEvent) => {
    if (e.matches === this.esEscritorio) return;
    this.esEscritorio = e.matches;
    this.cargarVistaActual();
  };

  /** Bahías con su agencia: el filtro de bahía del filter-bar entrega el nombre y el servidor pide el id. */
  private bahiasTodas: Bahia[] = [];

  /** Totales de las pestañas (los da el servidor, no dependen de lo cargado). */
  conteoGenerales = 0;
  conteoEspeciales = 0;

  // ── Generales ──
  readonly columnasGenerales: TableColumn[] = [
    { key: 'ot', label: 'Nº OT', sortable: true },
    { key: 'placa', label: 'Vehículo', sortable: true },
    { key: 'servicio', label: 'Categoría & Servicio', sortable: true },
    { key: 'agencia', label: 'Sucursal / Bahía', sortable: true },
    { key: 'fecha', label: 'Horarios', sortable: true, defaultSort: 'desc' },
    { key: 'operador', label: 'Lavador', sortable: true },
    { key: 'estado', label: 'Estado Workflow', sortable: true },
    { key: 'evInicio', label: 'Evidencia Inicio', align: 'center' },
    { key: 'evFin', label: 'Evidencia Fin', align: 'center' },
    { key: 'acciones', label: 'Acciones', align: 'right', sticky: true },
  ];
  filasG: VehiculoServicio[] = [];
  totalG = 0;
  paginaG = 1;
  pageSizeG = PAGE_SIZE_TABLA;
  sortFieldG: string | null = 'fecha';
  sortOrderG: OrdenDir = 'desc';
  cargandoG = false;
  errorG: string | null = null;
  private subG?: Subscription;
  readonly listaG = new ListaInfinita<VehiculoServicio>(
    (page, size) => this.servicioService
      .getServiciosPagina({ ...this.consultaGenerales(), page, pageSize: size })
      .pipe(map((r) => r.pagina)),
    PAGE_SIZE_INFINITO,
    (s) => s.id,
  );

  // ── Especiales ──
  readonly columnasEspeciales: TableColumn[] = [
    { key: 'ot', label: 'Nº OT', sortable: true },
    { key: 'placa', label: 'Vehículo & Placa', sortable: true },
    { key: 'servicio', label: 'Servicio Especial', sortable: true },
    { key: 'agencia', label: 'Agencia / Sucursal', sortable: true },
    { key: 'region', label: 'Región', sortable: true },
    { key: 'operador', label: 'Pulidor Responsable', sortable: true },
    { key: 'tiempoPausa', label: 'T. Pausa', sortable: true, align: 'center' },
    { key: 'tiempoEfectivo', label: 'T. Efectivo', sortable: true, align: 'center' },
    { key: 'tiempoTotal', label: 'T. Total', align: 'center' },
    { key: 'evInicio', label: 'Evidencia Inicio', align: 'center' },
    { key: 'evPausas', label: 'Evidencias Pausas', align: 'center' },
    { key: 'evFin', label: 'Evidencia Fin', align: 'center' },
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'acciones', label: 'Acciones', align: 'right', sticky: true },
  ];
  filasE: ServicioExtra[] = [];
  totalE = 0;
  paginaE = 1;
  pageSizeE = PAGE_SIZE_TABLA;
  sortFieldE: string | null = null;
  sortOrderE: OrdenDir = 'desc';
  cargandoE = false;
  errorE: string | null = null;
  private subE?: Subscription;
  readonly listaE = new ListaInfinita<ServicioExtra>(
    (page, size) => this.extrasService
      .getServiciosExtrasPagina({ ...this.consultaEspeciales(), page, pageSize: size })
      .pipe(map((r) => r.pagina)),
    PAGE_SIZE_INFINITO,
    (e) => e.id,
  );

  private iniciarVistaServidor(): void {
    this.suscripcionBusqueda = this.busqueda$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaAplicada = texto;
        this.aplicarFiltros();
      });

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.mediaEscritorio = window.matchMedia('(min-width: 1024px)');
      this.esEscritorio = this.mediaEscritorio.matches;
      this.mediaEscritorio.addEventListener('change', this.alCambiarPantalla);
    }
    this.cargarVistaActual();
  }

  ngOnDestroy(): void {
    this.suscripcionBusqueda?.unsubscribe();
    this.mediaEscritorio?.removeEventListener('change', this.alCambiarPantalla);
    this.subG?.unsubscribe();
    this.subE?.unsubscribe();
    this.listaG.destruir();
    this.listaE.destruir();
  }

  // ---- Filtros del filter-bar ----

  aplicarNuevosFiltros(filtros: FilterState) {
    const previo = this.filtrosGlobales;
    this.filtrosGlobales = filtros;
    const busq = (filtros.busqueda ?? '').trim();
    this.filtroTexto = busq;
    this.busquedaCorta = busq.length > 0 && busq.length < BUSQUEDA_MIN_CARACTERES;

    const otrosFiltrosCambiaron = this.huellaFiltros(previo) !== this.huellaFiltros(filtros);
    if (otrosFiltrosCambiaron) {
      // Un filtro (no el texto) cambió: se consulta ya. Si el texto es de una sola letra se conserva la búsqueda anterior.
      if (!this.busquedaCorta) this.busquedaAplicada = busq;
      this.aplicarFiltros();
      return;
    }
    // Solo cambió el texto: espera 300 ms tras la última tecla y exige mínimo 2 letras (o vacío para quitar el filtro).
    if (!this.busquedaCorta) this.busqueda$.next(busq);
  }

  onToolbarSearchChange(valor: string) {
    this.aplicarNuevosFiltros({ ...this.filtrosGlobales, busqueda: valor });
  }

  /** Todo cambio de filtro o de texto vuelve a la primera página. */
  aplicarFiltros() {
    this.paginaG = 1;
    this.paginaE = 1;
    this.cargarVistaActual();
  }

  private huellaFiltros(f: FilterState | undefined): string {
    if (!f) return '';
    const { busqueda, ...resto } = f;
    return JSON.stringify(resto);
  }

  private get hayFiltrosActivos(): boolean {
    const f = this.filtrosGlobales;
    const activo = (v: unknown, neutros: string[]) => !!v && !neutros.includes(String(v));
    return !!this.busquedaAplicada
      || activo(f.estado, ['Todos']) || activo(f.sucursal, ['Todas']) || activo(f.region, ['Todas'])
      || activo(f.cliente, ['Todas']) || activo(f.marca, ['Todas']) || activo(f.bahia, ['Todas'])
      || activo(f.operador, ['Todos']) || activo(f.servicio, ['Todos'])
      || !!(f.fechaInicio && f.fechaFin);
  }

  get tituloVacioG(): string {
    return this.hayFiltrosActivos
      ? 'No hay servicios que coincidan con los filtros aplicados.'
      : 'Aún no hay servicios de lavado registrados.';
  }

  get tituloVacioE(): string {
    return this.hayFiltrosActivos
      ? 'No hay servicios especiales que coincidan con los filtros aplicados.'
      : `No hay servicios especiales asignados o registrados${this.userRegionNombre ? ' en la región ' + this.userRegionNombre : ''}.`;
  }

  // ---- Conversión nombre → id (el filter-bar entrega nombres; el servidor pide ids) ----

  private neutro(v: string | undefined | null, ...neutros: string[]): string {
    const t = (v ?? '').trim();
    return !t || neutros.includes(t) ? '' : t;
  }

  private sucursalPorNombre(nombre: string): Sucursal | undefined {
    const n = nombre.replace(/EasyDry\s*/i, '').trim().toLowerCase();
    return this.sucursales.find((s) => (s.nombre || '').replace(/EasyDry\s*/i, '').trim().toLowerCase() === n);
  }

  /** Id de agencia elegida en el filtro (o el de alcance del usuario). '' si no aplica; id imposible si el nombre no existe. */
  private agenciaIdFiltro(): string {
    const nombre = this.neutro(this.filtrosGlobales.sucursal, 'Todas', 'TODAS');
    if (!nombre) return '';
    const suc = this.sucursalPorNombre(nombre);
    return suc ? String(suc.id) : '__sin_coincidencia__';
  }

  private regionIdFiltro(): string {
    const nombre = this.neutro(this.filtrosGlobales.region, 'Todas', 'TODAS');
    if (!nombre) return '';
    const suc = this.sucursales.find((s) => s.regionNombre === nombre && (s.regionId ?? s.region?.id) !== undefined);
    const id = suc ? (suc.regionId ?? suc.region?.id) : undefined;
    return id !== undefined && id !== null ? String(id) : '__sin_coincidencia__';
  }

  private clienteIdFiltro(): string {
    const f = this.filtrosGlobales;
    const nombre = this.neutro(f.cliente, 'Todas', 'TODAS') || this.neutro(f.marca, 'Todas', 'TODAS');
    if (!nombre) return '';
    const suc = this.sucursales.find((s) => (s.clienteNombre || s.marcaNombre) === nombre && (s.clienteId ?? s.marcaId) !== undefined);
    const id = suc ? (suc.clienteId ?? suc.marcaId) : undefined;
    return id !== undefined && id !== null ? String(id) : '__sin_coincidencia__';
  }

  /** Las bahías se llaman igual en varias agencias: se envían todos los ids que coinciden (o solo los de la agencia elegida). */
  private bahiaIdsFiltro(): string {
    const nombre = this.neutro(this.filtrosGlobales.bahia, 'Todas', 'TODAS').toLowerCase();
    if (!nombre) return '';
    const agencia = this.agenciaIdFiltro();
    const ids = this.bahiasTodas
      .filter((b) => (b.nombre || '').trim().toLowerCase() === nombre)
      .filter((b) => !agencia || String(b.agenciaId ?? b.sucursalId ?? '') === agencia)
      .map((b) => String(b.id));
    return ids.length ? ids.join(',') : '__sin_coincidencia__';
  }

  private operadorIdFiltro(): string {
    const nombre = this.neutro(this.filtrosGlobales.operador, 'Todos', 'TODOS');
    if (!nombre) return '';
    const op = this.operadores.find((o) => (o.nombre || o.cedula) === nombre);
    return op ? String(op.id) : '__sin_coincidencia__';
  }

  private servicioIdFiltro(): number | undefined {
    const nombre = this.neutro(this.filtrosGlobales.servicio, 'Todos', 'TODOS').toLowerCase();
    if (!nombre) return undefined;
    const cat = (this.catalogoCompleto || []).find((c) => (c.nombre || '').trim().toLowerCase() === nombre);
    return cat ? Number(cat.id) : undefined;
  }

  /** Rango de fechas del filter-bar como inicio y fin del día LOCAL, en ISO (el servidor compara en UTC). */
  private rangoFechasIso(): { fechaDesde?: string; fechaHasta?: string } {
    const rango = resolverRangoFechas(this.filtrosGlobales);
    if (!rango) return {};
    const [yi, mi, di] = soloFecha(rango.inicio).split('-').map(Number);
    const [yf, mf, df] = soloFecha(rango.fin).split('-').map(Number);
    if (!yi || !mi || !di || !yf || !mf || !df) return {};
    return {
      fechaDesde: new Date(yi, mi - 1, di, 0, 0, 0, 0).toISOString(),
      fechaHasta: new Date(yf, mf - 1, df, 23, 59, 59, 999).toISOString(),
    };
  }

  private estadoGeneralesServidor(): string | undefined {
    const e = this.neutro(this.filtrosGlobales.estado, 'Todos').toUpperCase();
    if (!e) return undefined;
    if (e === 'EN PROCESO' || e === 'EN_PROCESO') return 'EN_PROCESO';
    if (e === 'POR APROBAR' || e === 'POR_APROBAR' || e === 'FALTAN DE APROBAR') return 'POR_APROBAR';
    if (e === 'REALIZADOS / APROBADOS' || e === 'REALIZADO' || e === 'REALIZADOS' || e === 'APROBADO') return 'FINALIZADO';
    if (e === 'RECHAZADOS' || e === 'RECHAZADO') return 'RECHAZADO';
    return e.replace(/\s+/g, '_');
  }

  // ---- Consultas ----

  /** Filtros de la pestaña Generales (sin página ni tamaño). */
  private consultaGenerales(): ConsultaServicios {
    const alcance = this._getFiltrosUsuario() || {};
    const agencia = this.agenciaIdFiltro();
    const region = this.regionIdFiltro();
    const cliente = this.clienteIdFiltro();
    const bahia = this.bahiaIdsFiltro();
    const operador = this.operadorIdFiltro();
    return {
      sortField: this.esEscritorio ? this.sortFieldG : 'fecha',
      sortOrder: this.esEscritorio ? this.sortOrderG : 'desc',
      search: this.busquedaAplicada,
      estado: this.estadoGeneralesServidor(),
      agenciaId: agencia || alcance.agenciaId,
      regionId: region || alcance.regionId,
      clienteId: cliente || undefined,
      bahiaId: bahia || undefined,
      operadorId: operador || undefined,
      servicioId: this.servicioIdFiltro(),
      ...this.rangoFechasIso(),
    };
  }

  private estadoEspecialesServidor(): string | undefined {
    const e = this.neutro(this.filtrosGlobales.estado, 'Todos');
    if (!e) return undefined;
    if (e === 'Realizados / Aprobados') return 'Completado';
    return e;
  }

  /** Filtros de la pestaña Especiales (sin página ni tamaño). */
  private consultaEspeciales(): ConsultaExtras {
    const alcance = this.alcanceEspeciales();
    const agencia = this.agenciaIdFiltro();
    const region = this.regionIdFiltro();
    const operador = this.operadorIdFiltro();
    const tipo = this.neutro(this.filtrosGlobales.servicio, 'Todos', 'TODOS');
    return {
      sortField: this.esEscritorio ? this.sortFieldE : null,
      sortOrder: this.esEscritorio ? this.sortOrderE : 'desc',
      search: this.busquedaAplicada,
      estado: this.estadoEspecialesServidor(),
      agenciaId: agencia || alcance.agenciaId,
      regionId: region || alcance.regionId,
      operadorId: alcance.operadorId || operador || undefined,
      tipoServicio: tipo || undefined,
      ...this.rangoFechasIso(),
    };
  }

  private mensajeError(err: unknown): string {
    const e = err as { error?: { message?: string | string[] }; message?: string } | undefined;
    const detalle = e?.error?.message;
    if (Array.isArray(detalle)) return detalle.join('. ');
    return detalle || e?.message || 'No se pudo cargar la información.';
  }

  /** Carga lo que se ve ahora: la pestaña activa, en tabla (una página) o en tarjetas (primer bloque). */
  cargarVistaActual(): void {
    if ((this.tabActiva === 'generales' && !this.puedeVerGenerales) || (this.tabActiva === 'especiales' && !this.puedeVerEspeciales)) {
      this.cargarConteos();
      return;
    }
    if (this.tabActiva === 'generales') {
      if (this.esEscritorio) this.cargarPaginaG(); else this.listaG.reiniciar();
    } else {
      if (this.esEscritorio) this.cargarPaginaE(); else this.listaE.reiniciar();
    }
    this.cargarConteos();
  }

  /** Vuelve a pedir la página actual (después de crear, finalizar, aprobar…). */
  refrescarGenerales(): void {
    if (this.tabActiva === 'generales') {
      if (this.esEscritorio) this.cargarPaginaG(); else this.listaG.reiniciar();
    }
    this.cargarConteos();
  }

  refrescarEspeciales(): void {
    if (this.tabActiva === 'especiales') {
      if (this.esEscritorio) this.cargarPaginaE(); else this.listaE.reiniciar();
    }
    this.cargarConteos();
  }

  private cargarConteos(): void {
    // Solo se llama a lo que el rol puede ver: el servidor exige 'servicios.ver' y 'especiales.ver' por separado.
    if (this.puedeVerGenerales) {
      const alcance = this._getFiltrosUsuario() || {};
      this.servicioService.getServiciosPagina({ pageSize: 1, ...alcance }).subscribe({
        next: (r) => { this.conteoGenerales = r.pagina.total; },
        error: () => { /* el contador es informativo */ },
      });
    }
    if (this.puedeVerEspeciales) {
      this.extrasService.getServiciosExtrasPagina({ pageSize: 1, ...this.alcanceEspeciales() }).subscribe({
        next: (r) => { this.conteoEspeciales = r.pagina.total; },
        error: () => { /* el contador es informativo */ },
      });
    }
  }

  onTablaGCambio(q: ConsultaTabla): void {
    this.paginaG = q.page;
    this.pageSizeG = q.pageSize;
    this.sortFieldG = q.sortField || 'fecha';
    this.sortOrderG = q.sortOrder;
    this.cargarPaginaG();
  }

  cargarPaginaG(): void {
    this.subG?.unsubscribe();
    this.cargandoG = true;
    this.errorG = null;
    this.subG = this.servicioService
      .getServiciosPagina({ ...this.consultaGenerales(), page: this.paginaG, pageSize: this.pageSizeG })
      .subscribe({
        next: ({ pagina }) => {
          // Si la página quedó vacía (se borró o cambió lo último de la lista) se retrocede a la última que exista.
          if (pagina.items.length === 0 && this.paginaG > 1 && pagina.total > 0) {
            this.paginaG = Math.max(1, pagina.totalPages);
            this.cargarPaginaG();
            return;
          }
          this.filasG = pagina.items;
          this.totalG = pagina.total;
          this.paginaG = pagina.page;
          this.cargandoG = false;
        },
        error: (err) => {
          this.filasG = [];
          this.totalG = 0;
          this.errorG = this.mensajeError(err);
          this.cargandoG = false;
        },
      });
  }

  onTablaECambio(q: ConsultaTabla): void {
    this.paginaE = q.page;
    this.pageSizeE = q.pageSize;
    this.sortFieldE = q.sortField;
    this.sortOrderE = q.sortOrder;
    this.cargarPaginaE();
  }

  cargarPaginaE(): void {
    this.subE?.unsubscribe();
    this.cargandoE = true;
    this.errorE = null;
    this.subE = this.extrasService
      .getServiciosExtrasPagina({ ...this.consultaEspeciales(), page: this.paginaE, pageSize: this.pageSizeE })
      .subscribe({
        next: ({ pagina }) => {
          if (pagina.items.length === 0 && this.paginaE > 1 && pagina.total > 0) {
            this.paginaE = Math.max(1, pagina.totalPages);
            this.cargarPaginaE();
            return;
          }
          this.filasE = pagina.items;
          this.totalE = pagina.total;
          this.paginaE = pagina.page;
          this.cargandoE = false;
        },
        error: (err) => {
          this.filasE = [];
          this.totalE = 0;
          this.errorE = this.mensajeError(err);
          this.cargandoE = false;
        },
      });
  }


  modalNuevoRegistroOpen = false;
  modalVideoOpen = false;
  /** URL ya resuelta (prefirmada si el archivo es privado) para el <video> del modal `modalVideoOpen`. */
  videoEvidenciaUrl = '';
  modalReportarFallaOpen = false;
  maquinasReporte: Maquinaria[] = [];
  maquinaSeleccionadaId: number | string = 0;
  archivosFalloSubidos: ArchivoAdjunto[] = [];
  /** UUID del reporte: se usa en el ticket de subida y en /incidentes/reportar para que la carpeta S3 coincida. */
  clientUuidFalla = '';
  errorFalla = '';
  @ViewChild('selFalla') selFalla?: EvidenciaSelectorComponent;
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

  /** Servicios generales marcados en el modal (se crea una fila por servicio con la misma OT). */
  serviciosSeleccionadosIds: number[] = [];

  get esSeleccionMultipleServicios(): boolean {
    return this.nuevoRegistro.categoriaServicio === 'GENERAL';
  }

  isServicioSeleccionado(id: number | string): boolean {
    return this.serviciosSeleccionadosIds.includes(Number(id));
  }

  toggleServicioSeleccionado(serv: CatalogoServicio): void {
    const id = Number(serv.id);
    this.serviciosSeleccionadosIds = this.isServicioSeleccionado(id)
      ? this.serviciosSeleccionadosIds.filter((x) => x !== id)
      : [...this.serviciosSeleccionadosIds, id];
    this.recalcularServiciosSeleccionados();
  }

  get serviciosSeleccionados(): CatalogoServicio[] {
    return this.opcionesServicios.filter((s) => this.isServicioSeleccionado(s.id));
  }

  /** Receta combinada de todos los servicios marcados: el stock se valida contra la suma. */
  private recalcularServiciosSeleccionados(): void {
    const seleccion = this.serviciosSeleccionados;
    this.nuevoRegistro.servicioId = seleccion[0]?.id ?? 0;
    this.nuevoRegistro.servicio = seleccion.map((s) => s.nombre).join(' + ');
    const duracion = seleccion.reduce((acc, s) => acc + (Number(s.tiempoEstimadoMin) || 30), 0);
    this.asignarHorasAutomaticasOT(duracion || 30);

    const insumos = new Map<string, InsumoConsumidoServicio>();
    for (const serv of seleccion) {
      for (const r of serv.insumosReceta || []) {
        const key = String(r.productoId || r.productoSKU);
        const prev = insumos.get(key);
        if (prev) {
          prev.cantidad = Number(prev.cantidad) + Number(r.cantidadSugerida || 0);
        } else {
          insumos.set(key, {
            productoId: r.productoId,
            productoSKU: r.productoSKU,
            productoNombre: r.productoNombre,
            unidadMedida: r.unidadMedida,
            cantidad: Number(r.cantidadSugerida || 0),
          } as InsumoConsumidoServicio);
        }
      }
    }
    this.insumosConsumoForm = Array.from(insumos.values());
  }

  /** Filas (servicios) ya registradas en la OT que se está ampliando. */
  get serviciosYaEnOT(): VehiculoServicio[] {
    const ot = String(this.agregarServicioOTFuente?.ordenTrabajoOT || '').trim().toUpperCase();
    if (!ot) return [];
    return this.servicios.filter(
      (s) => String(s.ordenTrabajoOT || '').trim().toUpperCase() === ot && s.estado !== 'CANCELADO',
    );
  }

  get serviciosYaEnOTNombres(): string {
    return this.serviciosYaEnOT.map((s) => s.servicio).join(', ');
  }

  /** Cantidad de servicios generales que comparten la OT de la fila (para el distintivo de la tabla). */
  serviciosEnMismaOT(item: VehiculoServicio): number {
    const ot = String(item.ordenTrabajoOT || '').trim().toUpperCase();
    if (!ot) return 1;
    // Une los servicios recientes y los de la página visible (sin repetir) para no depender de cuál se cargó primero.
    const ids = new Set<string>();
    for (const lista of [this.servicios, this.filasG, this.listaG.items]) {
      for (const s of lista) {
        if (String(s.ordenTrabajoOT || '').trim().toUpperCase() === ot && s.estado !== 'CANCELADO') ids.add(String(s.id));
      }
    }
    return ids.size;
  }

  puedeAgregarServicio(item: VehiculoServicio): boolean {
    if (!this.puedeCrearGeneral) return false;
    const estado = String(item.estado || '').toUpperCase();
    return estado === 'EN PROCESO' || estado === 'EN_PROCESO' || estado === 'FINALIZADO';
  }

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

  /**
   * Estado real de ocupación de una bahía, leído del backend (`ocupada` en `agencias/bahias/list`).
   * Es la única fuente de verdad: no se recalcula a partir de la lista de servicios en memoria.
   * Puramente informativo — nunca bloquea la selección ni el guardado.
   */
  isBahiaOcupada(b: Bahia): boolean {
    return b.ocupada != null;
  }

  get bahiaOcupadaActual(): { placa: string; ordenTrabajoOT: string | null } | undefined {
    // Al agregar un servicio, el vehículo ocupa su propia bahía: no es un conflicto.
    if (this.agregarServicioOTFuente) return undefined;
    if (!this.nuevoRegistro.bahiaId && !this.nuevoRegistro.bahia) return undefined;
    const b = this.bahiasSucursalForm.find(x => String(x.id) === String(this.nuevoRegistro.bahiaId))
      || this.bahiasSucursalForm.find(x => x.nombre === this.nuevoRegistro.bahia);
    return b?.ocupada || undefined;
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

  // ── Servicios Extras / Asignaciones Especiales ──
  serviciosExtras: ServicioExtra[] = [];
  operadores: Operador[] = [];
  sucursales: Sucursal[] = [];
  bahiasSucursalForm: Bahia[] = [];
  lavadorIdsSeleccionados: string[] = [];
  sucursalesDisponibles: string[] = [];

  busquedaExtras = '';
  filtroEstadoExtras = 'TODOS';
  filtroOperadorExtras = 0;


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
    operadoresIds: string[];
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
    operadoresIds: [],
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
  /** Servicio del catálogo resuelto para `extraForm.servicioNombre`: de ahí se congela el precio de la OT. */
  servicioEspecialCatalogo: CatalogoServicio | null = null;
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
  // Anular (general o especial) y reasignar
  modalAnularOpen = false;
  anularObjetivo: { tipo: 'general' | 'especial'; id: string | number; titulo: string } | null = null;
  motivoAnulacion = '';
  reponerInsumosAnulacion = true;
  anulando = false;
  modalReasignarOpen = false;
  extraReasignar?: ServicioExtra;
  reasignarOperadoresIds: string[] = [];
  reasignando = false;
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
  // ── Permisos y ámbito: la web decide por permisos (los mismos que exige el servidor), no por nombre de rol ──
  private get ambito(): string | undefined { return this.authService.getCurrentUser()?.ambito; }
  /** El usuario ve toda la red (ámbito GLOBAL). */
  get veTodaLaRed(): boolean { return this.ambito === 'GLOBAL'; }
  /** Gestión total de OT (generales y especiales) con ámbito nacional: elige agencia, bahía y pulidor libremente. */
  get isAdmin(): boolean {
    return this.veTodaLaRed && this.authService.puede('servicios.crear') && this.authService.puede('especiales.crear');
  }
  get isSuperAdmin(): boolean { return this.isAdmin; }
  get puedeVerGenerales(): boolean { return this.authService.puede('servicios.ver'); }
  get puedeVerEspeciales(): boolean { return this.authService.puede('especiales.ver'); }
  get puedeCrearGeneral(): boolean { return this.authService.puede('servicios.crear'); }
  get puedeCrearEspecial(): boolean { return this.isCoordServiciosEspeciales; }
  get puedeEditarGeneral(): boolean { return this.authService.puede('servicios.editar'); }
  get puedeReasignarEspecial(): boolean { return this.authService.puede('especiales.reasignar'); }
  get puedeVerCatalogoBoton(): boolean { return this.authService.puedeAlguno('catalogo.gestionar', 'servicios.crear'); }
  /** Solo registra sus propios servicios (ámbito PROPIO). */
  get isOperador(): boolean {
    return !this.isAdmin && this.ambito === 'PROPIO' && this.puedeCrearGeneral;
  }
  /** Crea OT generales dentro de UNA agencia (ámbito AGENCIA): su sucursal queda fija en el formulario. */
  get isLiderOperador(): boolean {
    return !this.isAdmin && this.ambito === 'AGENCIA' && this.puedeCrearGeneral;
  }
  /** Gestiona los servicios especiales de la red (reasigna) sin trabajar los generales. */
  get isCoordServiciosEspeciales(): boolean {
    return !this.isAdmin && this.puedeReasignarEspecial;
  }
  /** Ejecuta servicios especiales (los inicia, pausa y completa) sin gestionarlos. */
  get isPulidor(): boolean {
    return !this.isAdmin && !this.isCoordServiciosEspeciales && this.authService.puede('especiales.operar');
  }
  /** Modalidad del pulidor según su agencia (no según el nombre del rol): con agencia opera en su sede; sin agencia, por región. */
  get isPulidorFijo(): boolean {
    return this.isPulidor && !!this.authService.getCurrentUser()?.agenciaId;
  }
  get isPulidorMovil(): boolean {
    return this.isPulidor && !this.authService.getCurrentUser()?.agenciaId;
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

  get pulidoresDisponiblesParaAgencia(): any[] {
    const agId = String(this.extraFormAgenciaId || '');
    return this.pulidoresDisponiblesRegion.filter((pulidor) => {
      const agenciaPulidorId = String(pulidor.agenciaId || pulidor.agencia?.id || '');
      return !agenciaPulidorId || agenciaPulidorId === agId;
    });
  }

  estaPulidorSeleccionado(id: string | number): boolean {
    return this.extraForm.operadoresIds.includes(String(id));
  }

  esPulidorFijoAsignado(pulidor: any): boolean {
    return Boolean(this.pulidorFijoAgenciaSeleccionada)
      && String(pulidor.id) === String(this.pulidorFijoAgenciaSeleccionada.id);
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
  /** Iniciar, pausar, reanudar y completar: permiso 'especiales.operar' y ser el pulidor asignado (la gestión total también puede). */
  puedeRealizarOT(extra?: ServicioExtra): boolean {
    if (!extra || !this.authService.puede('especiales.operar')) return false;
    if (this.isAdmin) return true;
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    return String(extra.operadorId) === String(user.id);
  }
  get isOperadorEspeciales() {
    return this.isCoordServiciosEspeciales || this.isPulidor;
  }
  get userRegionNombre(): string {
    const u = this.authService.getCurrentUser();
    return u?.regionNombre || u?.region || '';
  }
  /** El ámbito del usuario es una región (supervisión regional). */
  get isSupervisor(): boolean {
    return !this.isAdmin && this.ambito === 'REGION';
  }
  get canCrearOT(): boolean {
    return this.tabActiva === 'especiales' ? this.puedeCrearEspecial : this.puedeCrearGeneral;
  }
  get userSucursal(): string | undefined {
    return this.authService.getCurrentUser()?.sucursalNombre || this.authService.getCurrentUser()?.sucursal;
  }
  get puedeReportarFalla() {
    return !this.isAdmin && this.authService.puede('incidentes.reportar');
  }

  /** Alcance del usuario según su ámbito (el servidor lo aplica igual; esto solo acota lo que se pide). */
  private _getFiltrosUsuario(): { agenciaId?: string; regionId?: string } | undefined {
    const user = this.authService.getCurrentUser();
    if (user?.ambito === 'AGENCIA' && user.agenciaId) return { agenciaId: String(user.agenciaId) };
    if (user?.ambito === 'REGION' && user.regionId) return { regionId: String(user.regionId) };
    return undefined;
  }

  /** Finalizar un servicio general = actualizarlo (permiso 'servicios.editar'); solo si sigue en proceso o en cola. */
  canFinalizar(item: VehiculoServicio): boolean {
    if (!this.puedeEditarGeneral) return false;
    const estado = (item.estado || '').toUpperCase();
    return estado === 'EN PROCESO' || estado === 'EN_PROCESO' || estado === 'EN COLA' || estado === 'EN_ESPERA';
  }

  /** Anular un servicio general: permiso 'servicios.anular'; uno aprobado solo lo anula la gestión total (el servidor lo exige). */
  puedeAnularServicio(item: VehiculoServicio): boolean {
    if (!this.authService.puede('servicios.anular')) return false;
    const estado = (item.estado || '').toUpperCase();
    if (estado === 'CANCELADO' || item.anuladoEn) return false;
    return estado !== 'APROBADO' || this.isAdmin;
  }

  puedeAnularEspecial(extra: ServicioExtra): boolean {
    if (!this.authService.puede('especiales.anular')) return false;
    return extra.estado !== 'Completado' && extra.estado !== 'Cancelado';
  }

  puedeReasignarExtra(extra: ServicioExtra): boolean {
    return this.puedeReasignarEspecial && extra.estado !== 'Completado' && extra.estado !== 'Cancelado';
  }

  /** Estado tal como lo ve el usuario: un servicio finalizado queda pendiente hasta que el aprobador decide. */
  etiquetaEstado(estado: string | undefined, largo = false): string {
    if (estado === 'FINALIZADO') return largo ? 'PENDIENTE DE APROBACIÓN' : 'POR APROBAR';
    return estado || '';
  }

  /** " (aprobador de la agencia)" o " (respaldo…)" según la regla con la que se decidió. */
  etiquetaRegla(item: VehiculoServicio): string {
    if (item.reglaDecision === 'TITULAR') return ' (aprobador de la agencia)';
    if (item.reglaDecision === 'RESPALDO') return ' (respaldo: la agencia no tenía aprobador)';
    return '';
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

    // Quien solo puede ver servicios especiales (sin 'servicios.ver') arranca en esa pestaña.
    if (!this.puedeVerGenerales && this.puedeVerEspeciales) {
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

    if (this.puedeVerGenerales) {
      this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
        this.servicios = list;
      });
    }

    this.iniciarVistaServidor();

    // Cada consulta auxiliar se hace solo si el rol tiene el permiso que el servidor exige en ese endpoint.
    if (this.authService.puede('agencias.ver')) {
      this.bahiaService.getBahias().subscribe(list => { this.bahiasTodas = list || []; });
    }

    const catalogo$: Observable<any[]> = this.authService.puede('catalogo.ver') ? this.catalogoService.getServiciosActivos() : of([]);
    catalogo$.subscribe(cat => {
      this.catalogoCompleto = cat;
      const nombres = cat.map(c => c.nombre).filter(Boolean);
      if (nombres.length) this.listaServiciosFiltro = Array.from(new Set(nombres));
      this.onCategoriaChange();
      this.recalcularTieneServiciosEspeciales();
    });

    const sucursales$: Observable<any[]> = this.authService.puede('agencias.ver') ? this.sucursalService.getSucursales() : of([]);
    sucursales$.subscribe(list => {
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

    if (this.isLiderOperador && this.authService.puede('despachos.ver')) {
      const agId = user?.agenciaId || user?.sucursalNombre || user?.sucursal || '';
      this.inventarioService.getDespachosPendientesAgencia(String(agId)).subscribe(list => {
        this.despachosPendientesLider = list || [];
      });
    }

    if (this.authService.puede('usuarios.ver')) {
      this.operadorService.getOperadores().subscribe(ops => {
        this.operadores = ops;
      });
    }

    // Cargar Servicios Especiales Regionales (la vista paginada ya la carga iniciarVistaServidor)
    if (this.puedeVerEspeciales) {
      this.cargarServiciosEspeciales(false);
      this.cargarPulidoresRegion();
      if (this.isPulidor) {
        this.cargarStockPulidor();
      }
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

    if (this.puedeReportarFalla && this.authService.puede('maquinaria.ver')) {
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

  /** Filtros de alcance del usuario para los servicios especiales (el servidor también los aplica por rol). */
  private alcanceEspeciales(): { regionId?: string; agenciaId?: string; operadorId?: string } {
    const user = this.authService.getCurrentUser();
    const filtro: { regionId?: string; agenciaId?: string; operadorId?: string } = {};
    if (this.veTodaLaRed) return filtro; // toda la red: sin acotar
    if (user?.ambito === 'REGION' && user.regionId) {
      filtro.regionId = String(user.regionId);
    } else if (user?.ambito === 'AGENCIA' && user.agenciaId) {
      filtro.agenciaId = String(user.agenciaId);
    } else if ((user?.ambito === 'PROPIO' || this.isPulidorMovil) && user?.id) {
      filtro.operadorId = String(user.id); // pulidor móvil (sin agencia): solo los suyos
    }
    return filtro;
  }

  cargarServiciosEspeciales(refrescarVista = true) {
    const filtro: any = this.alcanceEspeciales();
    if (refrescarVista) this.refrescarEspeciales();

    this.extrasService.getServiciosExtras(filtro).subscribe(extras => {
      this.serviciosExtras = extras || [];
      if (this.serviciosExtras.length > 0 || this.isSuperAdmin || this.isAdmin || this.isSupervisor) {
        this.tieneServiciosEspeciales = true;
      }
    });
  }

  cargarPulidoresRegion() {
    // El coordinador (y el admin) tiene alcance nacional y puede crear/reasignar la OT en cualquier
    // agencia del país, no solo en la región del que la crea: se trae el listado completo de
    // pulidores de toda la red. Filtrar por la región del usuario dejaba fuera al pulidor fijo de
    // cualquier agencia fuera de su región, y el formulario caía sin motivo al modo "elegir pulidor
    // móvil" aunque la agencia sí tuviera uno fijo asignado.
    const user = this.authService.getCurrentUser();
    const regId = (this.isSuperAdmin || this.isAdmin || this.isCoordServiciosEspeciales)
      ? undefined
      : (user?.regionId ? String(user.regionId) : undefined);
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
    if ((this.isSuperAdmin || this.isAdmin || this.isSupervisor) && !suc && !user.agenciaId) {
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

  get codigoMaquinaSeleccionada(): string {
    return this.maquinasReporte.find(m => m.id === this.maquinaSeleccionadaId)?.codigo || '';
  }

  abrirModalReportarFalla(): void {
    this.clientUuidFalla = crypto.randomUUID();
    this.errorFalla = '';
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

  async guardarReporteFalla(): Promise<void> {
    this.errorFalla = '';
    const maquina = this.maquinasReporte.find(m => m.id === this.maquinaSeleccionadaId);
    if (!maquina) {
      this.toastService.warning('Equipo requerido', 'Seleccione el equipo afectado.');
      return;
    }
    if (!this.nuevoIncidente.descripcion.trim()) {
      this.toastService.warning('Descripción requerida', 'Describa el fallo observado.');
      return;
    }
    const pendiente = this.selFalla?.validar();
    if (pendiente) {
      this.errorFalla = pendiente;
      return;
    }

    const gravedad = this.nuevoIncidente.prioridad === 'Crítica' ? 'CRITICA'
      : this.nuevoIncidente.prioridad === 'Alta' ? 'ALTA'
        : this.nuevoIncidente.prioridad === 'Baja' ? 'BAJA' : 'MEDIA';
    try {
      const evidencias = await this.selFalla!.subir();
      const creado = await firstValueFrom(this.incidenteService.reportarIncidente({
        clientUuid: this.clientUuidFalla,
        maquinariaId: String(maquina.id),
        titulo: this.nuevoIncidente.tipo,
        descripcion: this.nuevoIncidente.descripcion.trim(),
        gravedad,
        evidencias,
      }));
      this.toastService.success('Reporte enviado', `Incidente ${creado.codigoIncidente} registrado. El taller lo procesará.`);
      this.modalReportarFallaOpen = false;
    } catch (err: any) {
      // Se muestra el mensaje del backend tal cual (p. ej. máquina no asignada a ti o evidencia incompleta).
      const m = err?.error?.message;
      this.errorFalla = m ? (Array.isArray(m) ? m.join(', ') : String(m)) : (err?.message || 'No se pudo enviar el reporte.');
    }
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
    if (this.agregarServicioOTFuente) {
      const yaIds = new Set(this.serviciosYaEnOT.map((s) => Number(s.servicioId)).filter(Boolean));
      const yaNombres = new Set(this.serviciosYaEnOT.map((s) => String(s.servicio || '').trim().toLowerCase()));
      this.opcionesServicios = this.opcionesServicios.filter(
        (s) => !yaIds.has(Number(s.id)) && !yaNombres.has(String(s.nombre || '').trim().toLowerCase()),
      );
    }
    if (this.opcionesServicios.length > 0 && this.esSeleccionMultipleServicios) {
      this.serviciosSeleccionadosIds = [Number(this.opcionesServicios[0].id)];
      this.recalcularServiciosSeleccionados();
    } else if (this.opcionesServicios.length > 0) {
      this.serviciosSeleccionadosIds = [];
      this.nuevoRegistro.servicio = this.opcionesServicios[0].nombre;
      this.nuevoRegistro.servicioId = this.opcionesServicios[0].id;
      this.onServicioSelect();
    } else {
      this.serviciosSeleccionadosIds = [];
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
        const fuente = this.agregarServicioOTFuente;
        if (fuente) {
          this.nuevoRegistro.bahiaId = fuente.bahiaId ? String(fuente.bahiaId) : '';
          this.nuevoRegistro.bahia = fuente.bahia || 'Sin Bahía Específica';
          this.nuevoRegistro.empleado = fuente.empleado || this.nuevoRegistro.empleado;
          this.lavadorIdsSeleccionados = (fuente.operadoresAsignados || []).map((op) => String(op.id));
          return;
        }
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
          this.lavadorIdsSeleccionados = [];
        }
      });
    }
  }

  onBahiaFormChange(): void {
    const b = this.bahiasSucursalForm.find(x => String(x.id) === String(this.nuevoRegistro.bahiaId));
    if (b) {
      this.nuevoRegistro.bahia = b.nombre;
      this.nuevoRegistro.bahiaId = String(b.id);
      this.lavadorIdsSeleccionados = this.lavadoresAsignadosBahia.map((op) => op.id);
      this.actualizarNombreLavadoresSeleccionados();
    } else {
      if (this.nuevoRegistro.bahiaId === '') this.nuevoRegistro.bahia = 'Sin Bahía Específica';
      this.lavadorIdsSeleccionados = [];
    }
  }

  get lavadoresAsignadosBahia(): Array<{ id: string; nombre: string }> {
    const bahia = this.bahiasSucursalForm.find((item) => String(item.id) === String(this.nuevoRegistro.bahiaId));
    if (!bahia) return [];
    const activos = (bahia.operadoresActivos || [])
      .filter((op) => op.id && op.nombre)
      .map((op) => ({ id: String(op.id), nombre: op.nombre }));
    if (activos.length) return activos;
    if (bahia.operadorId && bahia.operadorAsignado && bahia.operadorAsignado !== 'Sin Asignar') {
      return [{ id: String(bahia.operadorId), nombre: bahia.operadorAsignado }];
    }
    return [];
  }

  lavadorSeleccionado(id: string): boolean {
    return this.lavadorIdsSeleccionados.includes(String(id));
  }

  alternarLavadorSeleccionado(id: string, event: Event): void {
    const marcado = (event.target as HTMLInputElement).checked;
    const lavadorId = String(id);
    this.lavadorIdsSeleccionados = marcado
      ? [...new Set([...this.lavadorIdsSeleccionados, lavadorId])]
      : this.lavadorIdsSeleccionados.filter((actual) => actual !== lavadorId);
    this.actualizarNombreLavadoresSeleccionados();
  }

  private actualizarNombreLavadoresSeleccionados(): void {
    this.nuevoRegistro.empleado = this.lavadoresAsignadosBahia
      .filter((op) => this.lavadorIdsSeleccionados.includes(op.id))
      .map((op) => op.nombre)
      .join(', ');
  }

  onSucursalExtraFormChange(): void {
    const agId = this.extraFormAgenciaId;
    this.extraFormBahiaId = '';
    this.extraFormBahia = '';

    if (this.isPulidor) return;

    const fijo = this.pulidoresDisponiblesRegion.find(p => String(p.agenciaId || p.agencia?.id) === String(agId));
    if (fijo) {
      const disponibles = new Set(this.pulidoresDisponiblesParaAgencia.map((p) => String(p.id)));
      const otros = this.extraForm.operadoresIds.filter((id) => disponibles.has(id) && id !== String(fijo.id));
      this.extraForm.operadoresIds = [String(fijo.id), ...otros];
    } else {
      const disponibles = new Set(this.pulidoresDisponiblesParaAgencia.map((p) => String(p.id)));
      this.extraForm.operadoresIds = this.extraForm.operadoresIds.filter((id) => disponibles.has(id));
      if (!this.extraForm.operadoresIds.length) {
        const primerMovil = this.pulidoresMovilesDisponibles[0];
        if (primerMovil) this.extraForm.operadoresIds = [String(primerMovil.id)];
      }
    }
    this.actualizarOperadorResponsableExtra();
  }

  onOperadorExtraToggle(pulidor: any, event: Event): void {
    const marcado = (event.target as HTMLInputElement | null)?.checked === true;
    const id = String(pulidor.id);
    const fijoId = this.pulidorFijoAgenciaSeleccionada ? String(this.pulidorFijoAgenciaSeleccionada.id) : '';
    if (!marcado && id === fijoId) return;
    const seleccionados = this.extraForm.operadoresIds.filter((actual) => actual !== id);
    if (marcado) seleccionados.push(id);
    this.extraForm.operadoresIds = fijoId
      ? [fijoId, ...seleccionados.filter((actual) => actual !== fijoId)]
      : seleccionados;
    this.actualizarOperadorResponsableExtra();
  }

  private actualizarOperadorResponsableExtra(): void {
    const operadorId = this.extraForm.operadoresIds[0] || '';
    const operador = this.pulidoresDisponiblesRegion.find((p) => String(p.id) === operadorId);
    this.extraForm.operadorId = operadorId;
    this.extraForm.operadorNombre = operador ? `${operador.name} ${operador.lastname}`.trim() : '';
    if (operadorId) {
      this.cargarStockPulidorParaOT(operadorId);
    } else {
      this.stockPulidor = [];
      this.recalcularFaltantesInsumosOT();
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

  /** Informativo (backend `ocupada`): no bloquea la selección de bahía en el formulario de especiales. */
  get bahiaExtraOcupadaActual(): { placa: string; ordenTrabajoOT: string | null } | undefined {
    if (!this.extraFormBahiaId && !this.extraFormBahia) return undefined;
    const b = this.bahiasSucursalExtraForm.find(x => String(x.id) === String(this.extraFormBahiaId))
      || this.bahiasSucursalExtraForm.find(x => x.nombre === this.extraFormBahia);
    return b?.ocupada || undefined;
  }

  get operadoresSucursalForm(): Operador[] {
    const agencia = (this.nuevoRegistro.agencia || '').toLowerCase();
    const ops = this.operadores.filter(op => {
      const opSuc = (op.sucursal || '').toLowerCase();
      return !agencia || opSuc.includes(agencia) || agencia.includes(opSuc);
    });
    return ops.length > 0 ? ops : this.operadores;
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
    const modoAgregar = !!this.agregarServicioOTFuente;
    if (!modoAgregar && this.lavadoresAsignadosBahia.length > 0 && this.lavadorIdsSeleccionados.length === 0) {
      this.toastService.warning('Lavador requerido', 'Selecciona al menos un lavador asignado a la bahía.');
      return;
    }

    if (modoAgregar) {
      const yaEnOT = this.serviciosYaEnOT;
      const repetido = this.serviciosSeleccionados.find(sel =>
        yaEnOT.some(s =>
          Number(s.servicioId) === Number(sel.id) ||
          String(s.servicio || '').trim().toLowerCase() === String(sel.nombre || '').trim().toLowerCase()
        )
      );
      if (repetido) {
        this.toastService.warning('Servicio ya registrado', `"${repetido.nombre}" ya forma parte de la OT ${otGenUpper}.`);
        return;
      }
    }
    // Nota: la validación de OT duplicada la hace el backend (fuente de verdad, único espacio
    // de numeración autoritativo). No se bloquea aquí con datos en memoria del cliente; el
    // error del backend se muestra en el callback `error` de la petición de guardado.

    if (!this.nuevoRegistro.marca?.trim()) {
      this.toastService.warning('Campos Incompletos', 'Ingrese la marca del vehículo.');
      return;
    }
    if (!this.nuevoRegistro.modelo?.trim()) {
      this.toastService.warning('Campos Incompletos', 'Ingrese el modelo del vehículo.');
      return;
    }
    const serviciosIds = this.esSeleccionMultipleServicios
      ? this.serviciosSeleccionados.map(s => Number(s.id))
      : (this.nuevoRegistro.servicioId ? [Number(this.nuevoRegistro.servicioId)] : []);
    if (serviciosIds.length === 0) {
      this.toastService.warning('Servicio Requerido', 'Seleccione al menos un servicio del catálogo.');
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

    // Nota: la ocupación de bahía y la placa duplicada son solo informativas (el backend agrega
    // una advertencia a las observaciones si corresponde, pero nunca rechaza el registro), así
    // que no bloquean aquí el guardado.

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

    // Al agregar servicios, la evidencia de ingreso ya se registró con la OT original.
    if (!modoAgregar && !this.nuevoRegistro.videoUrl?.trim()) {
      this.toastService.warning(
        'Vídeo de Ingreso Requerido',
        'El vídeo de evidencia de ingreso (recepción) es un campo obligatorio para registrar la orden de trabajo.'
      );
      this.guardandoServicio = false;
      return;
    }

    const bMatch = this.bahiasSucursalForm.find(b => String(b.id) === String(this.nuevoRegistro.bahiaId))
      || this.bahiasSucursalForm.find(b => b.nombre === this.nuevoRegistro.bahia)
      || (modoAgregar ? undefined : this.bahiasSucursalForm[0]);
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
      servicioCatalogoId: serviciosIds[0],
      servicioCatalogoIds: serviciosIds,
      operadorIds: [...this.lavadorIdsSeleccionados],
      insumosUtilizados: [...this.insumosConsumoForm]
    };

    this.guardandoServicio = true;
    this.servicioService.crearRegistroHojaServicio(payload as any).subscribe({
      next: (creados) => {
        this.guardandoServicio = false;
        const creado = creados[0];
        const ot = creado?.ordenTrabajoOT || this.nuevoRegistro.ordenTrabajoOT;
        const placa = creado?.placa || this.nuevoRegistro.placa;
        if (modoAgregar) {
          this.toastService.success(
            'Servicio agregado',
            `${creados.length === 1 ? 'Se agregó 1 servicio' : `Se agregaron ${creados.length} servicios`} a la OT ${ot} (${placa}).`
          );
        } else {
          this.toastService.success(
            'Hoja de Control Creada',
            creados.length > 1
              ? `OT ${ot} (${placa}) registrada con ${creados.length} servicios e iniciada con éxito.`
              : `Servicio ${ot} (${placa}) registrado e iniciado con éxito.`
          );
        }
        this.modalNuevoRegistroOpen = false;
        this.videoIngresoRecorder?.eliminarVideo();

        this.filtroTexto = '';
        this.filtroCategoria = 'Todas';
        this.filtrosGlobales.busqueda = '';
        this.filtrosGlobales.estado = 'Todos';
        this.busquedaAplicada = '';
        this.agregarServicioOTFuente = null;

        if (this.authService.puede('inventario.ver')) this.inventarioService.cargarItems();
        this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
          this.servicios = list;
        });
        // La OT nueva es la más reciente: solo se ve en la primera página, así que aquí sí se vuelve a la 1.
        this.paginaG = 1;
        this.refrescarGenerales();
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
    if (!this.puedeEditarGeneral) {
      this.toastService.warning('Acceso restringido', 'Tu rol no tiene permiso para finalizar servicios.');
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
          // Un servicio finalizado siempre queda pendiente de aprobación (no hay aprobación automática).
          this.toastService.success('Servicio finalizado', `Vehículo ${item.placa} finalizado con evidencia de entrega. Queda pendiente de aprobación.`);
          this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
            this.servicios = list;
          });
          this.refrescarGenerales();
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

  /** Mensaje del servidor (403/400 traen `message` en español); si no hay, el texto por defecto. */
  private mensajeErrorAccion(err: any, porDefecto: string): string {
    const msg = err?.error?.message || err?.message || porDefecto;
    return Array.isArray(msg) ? msg.join('. ') : msg;
  }

  aprobarServicio(item: VehiculoServicio) {
    if (!item.puedeDecidir) {
      this.toastService.warning('No disponible', 'Este servicio no lo puedes aprobar ahora.');
      return;
    }
    this.servicioService.aprobarServicioGerente(item.id).subscribe({
      next: () => {
        this.toastService.success('Servicio aprobado', `Servicio ${item.placa} aprobado.`);
        this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => {
          this.servicios = list;
        });
        this.refrescarGenerales();
      },
      error: (err) => {
        console.error('Error al aprobar servicio:', err);
        this.toastService.error('No se pudo aprobar', this.mensajeErrorAccion(err, 'No se pudo aprobar el servicio.'));
        this.refrescarGenerales();
      }
    });
  }

  // ── Anular (servicios generales y especiales): motivo obligatorio, no se borra ──
  abrirModalAnularGeneral(item: VehiculoServicio) {
    this.anularObjetivo = { tipo: 'general', id: item.id, titulo: `${item.placa} (${item.ordenTrabajoOT || 'sin OT'})` };
    this.motivoAnulacion = '';
    this.reponerInsumosAnulacion = true;
    this.modalAnularOpen = true;
  }

  abrirModalAnularEspecial(extra: ServicioExtra) {
    this.anularObjetivo = { tipo: 'especial', id: extra.id, titulo: `${extra.placa || extra.vehiculoInfo?.placa || ''} (${extra.codigoSE})` };
    this.motivoAnulacion = '';
    this.modalAnularOpen = true;
  }

  confirmarAnulacion() {
    const objetivo = this.anularObjetivo;
    const motivo = this.motivoAnulacion.trim();
    if (!objetivo || motivo.length < 5) {
      this.toastService.warning('Motivo requerido', 'Escribe el motivo de la anulación (mínimo 5 caracteres).');
      return;
    }
    this.anulando = true;
    const peticion = objetivo.tipo === 'general'
      ? this.servicioService.anularServicio(objetivo.id, motivo, this.reponerInsumosAnulacion)
      : this.extrasService.anularServicioExtra(objetivo.id, motivo);
    peticion.subscribe({
      next: () => {
        this.anulando = false;
        this.modalAnularOpen = false;
        this.modalDetalleOpen = false;
        this.modalDetalleEspecialOpen = false;
        this.toastService.success('Servicio anulado', `${objetivo.titulo} quedó anulado; se guardó tu motivo.`);
        if (objetivo.tipo === 'general') {
          this.servicioService.getServicios(this._getFiltrosUsuario()).subscribe(list => { this.servicios = list; });
          this.refrescarGenerales();
        } else {
          this.cargarServiciosEspeciales();
        }
      },
      error: (err) => {
        this.anulando = false;
        this.toastService.error('No se pudo anular', this.mensajeErrorAccion(err, 'No se pudo anular el servicio.'));
      }
    });
  }

  // ── Reasignar servicio especial (permiso 'especiales.reasignar') ──
  abrirModalReasignar(extra: ServicioExtra) {
    if (!this.puedeReasignarExtra(extra)) return;
    this.extraReasignar = extra;
    const asignados = (extra.operadoresIds?.length
      ? extra.operadoresIds
      : extra.operadorId
        ? [String(extra.operadorId)]
        : []).map(String);
    const pulidorFijo = this.pulidoresDisponiblesRegion.find(
      (p) => String(p.agenciaId || p.agencia?.id || '') === String(extra.agenciaId || ''),
    );
    this.reasignarOperadoresIds = pulidorFijo
      ? [String(pulidorFijo.id), ...asignados.filter((id) => id !== String(pulidorFijo.id))]
      : [...asignados];
    this.modalReasignarOpen = true;
  }

  estaPulidorReasignado(id: string | number): boolean {
    return this.reasignarOperadoresIds.includes(String(id));
  }

  esResponsableReasignacion(id: string | number): boolean {
    return this.reasignarOperadoresIds[0] === String(id);
  }

  esPulidorFijoReasignacion(pulidor: any): boolean {
    return Boolean(
      this.extraReasignar?.agenciaId &&
      String(pulidor.agenciaId || pulidor.agencia?.id || '') === String(this.extraReasignar.agenciaId),
    );
  }

  get nombresPulidoresReasignacion(): string {
    return this.reasignarOperadoresIds
      .map((id) => this.pulidoresDisponiblesRegion.find((p) => String(p.id) === id))
      .filter(Boolean)
      .map((p) => `${p.name} ${p.lastname}`.trim())
      .join(', ');
  }

  cambiarPulidorReasignacion(pulidor: any, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const id = String(pulidor.id);
    if (!checked && this.esPulidorFijoReasignacion(pulidor)) return;
    const seleccionados = this.reasignarOperadoresIds.filter((actual) => actual !== id);
    if (checked) seleccionados.push(id);
    const fijo = this.pulidoresDisponiblesRegion.find((p) => this.esPulidorFijoReasignacion(p));
    this.reasignarOperadoresIds = fijo
      ? [String(fijo.id), ...seleccionados.filter((actual) => actual !== String(fijo.id))]
      : seleccionados;
  }

  confirmarReasignacion() {
    const extra = this.extraReasignar;
    if (!extra) return;
    if (!this.reasignarOperadoresIds.length) {
      this.toastService.warning('Pulidor requerido', 'Selecciona al menos un pulidor para reasignar la OT.');
      return;
    }
    this.reasignando = true;
    this.extrasService.reasignarServicioExtra(extra.id, this.reasignarOperadoresIds).subscribe({
      next: () => {
        this.reasignando = false;
        this.modalReasignarOpen = false;
        this.toastService.success('Servicio reasignado', `${extra.codigoSE} tiene nuevo responsable.`);
        this.cargarServiciosEspeciales();
      },
      error: (err) => {
        this.reasignando = false;
        const detalle = this.mensajeErrorAccion(err, 'No se pudo reasignar el servicio.');
        const sinKit = /insumos|kit/i.test(detalle);
        this.toastService.error(
          sinKit ? 'No se puede reasignar: faltan insumos' : 'No se pudo reasignar',
          detalle,
        );
      }
    });
  }

  async verVideoEvidencia(item: VehiculoServicio) {
    this.servicioSeleccionado = item;
    this.videoEvidenciaUrl = '';
    this.modalVideoOpen = true;
    const url = item.videoUrl || item.video || item.fotoIngresoUrl || item.fotoSalidaUrl;
    if (!url) return;
    // Resuelve primero la URL prefirmada (si el archivo es privado) en vez de intentar /storage/file
    // directamente, que respondería 403 para evidencias privadas.
    try {
      this.videoEvidenciaUrl = await this.storageUploadService.getDirectStreamingUrl(url);
    } catch {
      this.videoEvidenciaUrl = this.storageUploadService.resolveBackendUrl(url);
    }
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

  get puedeCrearOTEspecialConInsumos(): boolean {
    if (!this.isCoordServiciosEspeciales || this.validandoStockPulidorOT) return false;
    if (!this.extraForm.servicioNombre?.trim() || !this.extraForm.operadoresIds.length || !this.extraFormPlaca?.trim()) return false;
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
    if (this.isPulidorMovil) {
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
    this.servicioEspecialCatalogo = serv || null;
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
      const regId = (this.isSuperAdmin || this.isAdmin || this.isCoordServiciosEspeciales)
        ? undefined
        : (user?.regionId ? String(user.regionId) : undefined);
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

    this.servicioEspecialCatalogo = primerServicio || null;
    this.extraForm = {
      servicioNombre: primerServicio?.nombre || '',
      servicioDescripcion: primerServicio?.descripcion || '',
      operadorId: opId,
      operadorNombre: opNombre,
      operadoresIds: opId ? [opId] : [],
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
    this.actualizarOperadorResponsableExtra();
  }

  async guardarServicioExtra() {
    if (!this.extraFormOT?.trim()) {
      this.toastService.warning('Campos Incompletos', 'Ingrese el Nº de Orden de Trabajo (OT).');
      return;
    }
    
    const otUpper = this.extraFormOT.trim().toUpperCase();

    // La unicidad de la OT la valida el servidor (fuente de verdad, sobre toda la base y no solo las últimas filas
    // cargadas): la OT de un servicio especial es independiente de la de lavado, así que no se compara con esta.

    if (!this.extraForm.servicioNombre?.trim()) {
      this.toastService.warning('Datos incompletos', 'Ingrese el tipo de servicio especial.');
      return;
    }
    if (!this.extraForm.operadoresIds.length) {
      this.toastService.warning('Datos incompletos', 'Seleccione al menos un pulidor asignado.');
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
      servicioCatalogoId: this.servicioEspecialCatalogo?.id,
      servicioDescripcion: this.extraForm.servicioDescripcion.trim(),
      operadorId: this.extraForm.operadorId ? String(this.extraForm.operadorId) : undefined,
      operadoresIds: this.extraForm.operadoresIds,
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
        this.toastService.error('Error al iniciar', this.mensajeErrorAccion(err, 'No se pudo registrar el inicio del servicio.'));
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
        this.toastService.error('Error al finalizar', this.mensajeErrorAccion(err, 'No se pudo completar el servicio.'));
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
      // Solo enlaces reales (http/https): una ruta local (file://) guardada por la app no se puede
      // reproducir en el navegador. Para el último ciclo se usa como respaldo el enlace vigente.
      const esRemota = (u?: string | null): boolean => !!u && /^https?:\/\//i.test(u);
      const pausaVigente = extra.videoUltimaPausaUrl || extra.videoPausa;
      const reanudacionVigente = extra.videoUltimaReanudacionUrl || extra.videoReanudacion;
      const ultimo = historial.length - 1;
      this.pausasSeleccionadas = historial.map((p: any, i: number) => ({
        ...p,
        videoPausaUrl: esRemota(p.videoPausaUrl)
          ? p.videoPausaUrl
          : (i === ultimo && esRemota(pausaVigente) ? pausaVigente : undefined),
        videoReanudacionUrl: esRemota(p.videoReanudacionUrl)
          ? p.videoReanudacionUrl
          : (i === ultimo && p.fechaFin && esRemota(reanudacionVigente) ? reanudacionVigente : undefined),
      }));
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

import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { InventarioService, ConsultaDespachos, ResumenDespachos } from '../../core/services/inventario.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableCellDirective, TableColumn } from '../../shared/components/data-table/data-table.component';
import { ConsultaTabla, OrdenDir } from '../../core/models/paginacion.model';
import { PAGE_SIZE_TABLA } from '../../core/config/paginacion';
import { resolverRangoFechas } from '../../core/utils/fecha-rango';
import { EnvioSuministro, EstadoEnvio, Sucursal, InventarioItem } from '../../core/models';
import { BodegaInventario } from '../../core/models/inventario.model';
import { apiUrl } from '../../core/config/env';
import { ResolverEnvioComponent } from './resolver-envio.component';
import { EvidenciasEnvioComponent } from './evidencias-envio.component';

@Component({
  selector: 'app-envios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, ResolverEnvioComponent, EvidenciasEnvioComponent, FilterBarComponent, DataTableComponent, DataTableCellDirective],
  template: `
    <div class="space-y-6 animate-fade-in pb-12">

      <!-- Header -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mb-2">
            <i-lucide aria-hidden="true" name="send" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ ambitoAgencia ? 'Recepción de Suministros' : (ambitoPropio ? 'Recepción de Insumos (Kit Pulidor)' : 'Logística de Suministros') }}</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">
            {{ ambitoAgencia ? 'Envíos & Confirmación de Recepción — ' + liderSucursalNombre : (ambitoPropio ? 'Envíos & Confirmación — Mi Kit de Pulidor' : 'Envíos & Confirmación de Recepción') }}
          </h1>
          <p class="text-slate-500 text-xs mt-1">
            {{ ambitoAgencia 
              ? 'Confirma o rechaza los suministros enviados a tu agencia. Al confirmar, el stock ingresa a tu sede.' 
              : (ambitoPropio
                ? 'Confirma o rechaza los insumos químicos enviados a tu kit personal. Al confirmar, el stock ingresa a tu inventario para servicios especiales.'
                : 'Solo confirmación y seguimiento: crea los despachos desde Inventario. Aquí se aceptan, rechazan y alertan.') }}
          </p>
        </div>
      </div>

      <!-- Banner KPIs Generales / Sede -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-easydry">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Envíos</span>
          <p class="text-2xl font-extrabold text-slate-900 mt-1">{{ totalEnvios }}</p>
        </div>
        <div class="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl shadow-easydry">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">En Camino (Pendientes)</span>
            @if (countEnCamino > 0) {
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            }
          </div>
          <p class="text-2xl font-extrabold text-amber-950 mt-1">{{ countEnCamino }}</p>
        </div>
        <div class="p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl shadow-easydry">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">Recibidos en Sede</span>
          <p class="text-2xl font-extrabold text-emerald-950 mt-1">{{ countRecibidos }}</p>
        </div>
        <div class="p-4 bg-rose-50/80 border border-rose-200/90 rounded-2xl shadow-easydry">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">Rechazados / Disconformidad</span>
          <p class="text-2xl font-extrabold text-rose-950 mt-1">{{ countRechazados }}</p>
        </div>
      </div>

      <!-- Filtros -->
      <app-filter-bar
        [showFechas]="true"
        [showSucursal]="!ambitoAgencia"
        [showEstado]="true"
        [listaEstados]="listaEstados"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Tabla de Envíos: páginas numeradas, orden, búsqueda y filtros en el servidor -->
      <app-data-table
        [serverSide]="true"
        [columns]="columnas"
        [data]="filas"
        [total]="totalTabla"
        [page]="pagina"
        [pageSize]="pageSizeTabla"
        [sortField]="sortField"
        [sortOrder]="sortOrder"
        [loading]="cargandoTabla"
        [error]="errorTabla"
        [rowClass]="claseFila"
        searchPlaceholder="Buscar por guía, destino, responsable o insumo..."
        maxHeight="none"
        caption="Envíos de suministros"
        [emptyTitle]="tituloVacio"
        emptyHint="Prueba ajustando los filtros o el texto de búsqueda."
        (queryChange)="onTablaCambio($event)"
        (reintentar)="cargarPagina(true)">

        <ng-template appCell="guia" let-env>
          <span class="font-mono font-extrabold text-easydry-blue">{{ env.codigoEnvio }}</span>
        </ng-template>

        <ng-template appCell="fecha" let-env>
          <p class="font-bold text-slate-800">{{ env.fecha }}</p>
          <span class="text-xs text-slate-500 font-mono">{{ env.horaInicio || '08:00' }}</span>
        </ng-template>

        <ng-template appCell="destino" let-env>
          <span class="font-bold text-slate-900">{{ env.sucursalNombre }}</span>
          <p class="text-xs text-slate-500 font-normal">{{ env.ciudad }}</p>
        </ng-template>

        <ng-template appCell="insumos" let-env>
          <div class="space-y-1">
            @for (p of env.productos; track p.id) {
              <div class="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 px-2 py-1 rounded-lg text-slate-800 font-semibold text-xs border border-slate-200/80 mr-1 mb-0.5">
                <span class="font-mono text-emerald-800 font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded text-xs">{{ p.cantidad }} und</span>
                <span class="text-slate-900 font-bold">{{ p.nombreProducto }}</span>
              </div>
            } @empty {
              <span class="text-slate-500 italic">Sin detalle</span>
            }
          </div>
        </ng-template>

        <ng-template appCell="respEnvio" let-env>
          <span class="text-slate-600 text-xs">{{ env.responsableEnvio }}</span>
        </ng-template>

        <ng-template appCell="respRecepcion" let-env>
          @if (env.responsableRecepcion) {
            <span class="font-bold text-purple-800 text-xs">{{ env.responsableRecepcion }}</span>
          } @else {
            <span class="text-slate-500 italic text-xs">Pendiente de arribo</span>
          }
        </ng-template>

        <ng-template appCell="tiempos" let-env>
          @if (env.duracionMin) {
            <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-bold">{{ env.duracionMin }} min</span>
          } @else {
            <span class="text-xs text-slate-500 font-mono">En ruta</span>
          }
        </ng-template>

        <ng-template appCell="estado" let-env>
          <span
            class="px-2.5 py-1 rounded-full text-xs font-extrabold"
            [ngClass]="{
              'bg-amber-100 text-amber-800 border border-amber-200': env.estado === 'PENDIENTE',
              'bg-blue-100 text-blue-800 border border-blue-200': env.estado === 'ENVIADO',
              'bg-emerald-100 text-emerald-800 border border-emerald-200': env.estado === 'RECIBIDO' && !esDesconforme(env),
              'bg-rose-100 text-rose-800 border border-rose-200': env.estado === 'RECHAZADO' || esDesconforme(env)
            }">
            {{ env.estado === 'ENVIADO' ? 'EN TRÁNSITO' : (esDesconforme(env) ? 'DESCONFORMIDAD' : env.estado) }}
          </span>
        </ng-template>

        <ng-template appCell="recepcion" let-env>
          @if (env.estado === 'RECIBIDO' && esDesconforme(env)) {
            <div class="inline-flex flex-col items-center">
              <span class="text-xs font-extrabold text-rose-800 flex items-center gap-1 font-mono">
                <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 text-rose-600"></i-lucide>
                {{ getFechaResolucion(env) }}
              </span>
              <span class="text-xs text-rose-700 font-extrabold font-mono">{{ getHoraResolucion(env) || '09:45' }}</span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                <i-lucide aria-hidden="true" name="x" class="w-2.5 h-2.5"></i-lucide>
                <span>Desconformidad</span>
              </span>
            </div>
          } @else if (env.estado === 'RECIBIDO') {
            <div class="inline-flex flex-col items-center">
              <span class="text-xs font-extrabold text-emerald-800 flex items-center gap-1 font-mono">
                <i-lucide aria-hidden="true" name="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                {{ getFechaResolucion(env) }}
              </span>
              <span class="text-xs text-emerald-700 font-extrabold font-mono">{{ getHoraResolucion(env) || '09:45' }}</span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <i-lucide aria-hidden="true" name="check" class="w-2.5 h-2.5"></i-lucide>
                <span>Aprobado</span>
              </span>
            </div>
          } @else if (env.estado === 'RECHAZADO') {
            <div class="inline-flex flex-col items-center">
              <span class="text-xs font-extrabold text-rose-800 flex items-center gap-1 font-mono">
                <i-lucide aria-hidden="true" name="x-circle" class="w-3.5 h-3.5 text-rose-600"></i-lucide>
                {{ getFechaResolucion(env) }}
              </span>
              <span class="text-xs text-rose-700 font-extrabold font-mono">{{ getHoraResolucion(env) || '10:15' }}</span>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                <i-lucide aria-hidden="true" name="x" class="w-2.5 h-2.5"></i-lucide>
                <span>Rechazado</span>
              </span>
            </div>
          } @else {
            <div class="inline-flex flex-col items-center text-slate-500">
              <span class="text-xs font-medium italic text-slate-500">Pendiente</span>
              <span class="text-xs text-slate-500">En ruta</span>
            </div>
          }
        </ng-template>

        <ng-template appCell="acciones" let-env>
          @if (env.estado === 'ENVIADO' && puedeAccionesEnvio(env)) {
            <div class="flex items-center justify-end gap-1.5">
              @if (puedeConfirmarEnvio) {
              <button
                type="button"
                (click)="abrirModalConfirmacion(env)"
                class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
                <i-lucide aria-hidden="true" name="check" class="w-3.5 h-3.5"></i-lucide>
                <span>Confirmar</span>
              </button>
              }
              @if (puedeRechazarEnvio) {
              <button
                type="button"
                (click)="abrirModalRechazo(env)"
                class="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
                <i-lucide aria-hidden="true" name="x" class="w-3.5 h-3.5"></i-lucide>
                <span>Rechazar</span>
              </button>
              }
            </div>
          } @else if (env.estado === 'ENVIADO') {
            <span class="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <i-lucide aria-hidden="true" name="truck" class="w-3.5 h-3.5"></i-lucide>
              <span>En tránsito · Esperando aceptación</span>
            </span>
          } @else if (env.estado === 'RECIBIDO' && esDesconforme(env)) {
            <div class="inline-flex flex-col items-end gap-1 text-right">
              <span class="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 text-rose-600"></i-lucide>
                <span>Llegó incompleto: {{ resumenFaltante(env) }}</span>
              </span>
              <ng-container *ngTemplateOutlet="botonResolver; context: { $implicit: env }"></ng-container>
            </div>
          } @else if (env.estado === 'RECIBIDO') {
            <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <i-lucide aria-hidden="true" name="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
              <span>Recepción Verificada (En Stock)</span>
            </span>
          } @else if (env.estado === 'RECHAZADO') {
            <div class="inline-flex flex-col items-end gap-1 text-right">
              <span class="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 text-rose-600"></i-lucide>
                <span>Rechazado por Agencia</span>
              </span>
              @if (env.motivoRechazo || env.observaciones) {
                <span class="inline-flex items-start gap-1 text-xs font-medium text-rose-900 bg-rose-50 px-2 py-1 rounded-md border border-rose-200/90 max-w-xs text-left">
                  <i-lucide aria-hidden="true" name="info" class="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0"></i-lucide>
                  <span><b>Razón:</b> {{ env.motivoRechazo || env.observaciones }}</span>
                </span>
              }
              @if (env.faltantes?.length) {
                <ng-container *ngTemplateOutlet="botonResolver; context: { $implicit: env }"></ng-container>
              }
            </div>
          } @else {
            <span class="text-xs text-slate-500 italic">Esperando despacho</span>
          }
        </ng-template>
      </app-data-table>

      <!-- «Resolver» solo aparece con producto retenido por decidir (y permiso); con todo resuelto queda «Ver detalle» -->
      <ng-template #botonResolver let-env>
        @if (faltantesPendientes(env) > 0 && puedeResolverFaltantes) {
          <button type="button" (click)="envioResolviendo = env"
            class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
            <i-lucide aria-hidden="true" name="package-x" class="w-3.5 h-3.5"></i-lucide>
            <span>Resolver</span>
          </button>
        } @else if (faltantesPendientes(env) > 0) {
          <span class="text-xs font-bold text-amber-800">Pendiente de resolver por la bodega</span>
        } @else {
          <button type="button" (click)="envioResolviendo = env"
            class="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer">
            Ver detalle
          </button>
        }
      </ng-template>

      <app-resolver-envio [envio]="envioResolviendo" (closed)="envioResolviendo = null" (resuelto)="alResolver()" />

      <!-- MODAL CONFIRMAR / RECHAZAR RECEPCIÓN: la cantidad que se recibió y la observación -->
      <app-modal size="md"
        [isOpen]="modalConfirmacionOpen"
        [title]="modoRechazo ? 'Rechazar Envío' : 'Confirmar Recepción'"
        [icon]="modoRechazo ? 'alert-triangle' : 'check-circle'"
        (close)="modalConfirmacionOpen = false">
        @if (envioSeleccionadoConfirmacion) {
          <div class="space-y-3 text-xs">
            <p class="text-slate-600">
              Guía <b>{{ envioSeleccionadoConfirmacion.codigoEnvio }}</b> → {{ envioSeleccionadoConfirmacion.sucursalNombre }}.
              @if (modoRechazo) {
                Indica cuánto se recibió de cada producto (0 si no llegó nada). Lo que no se reciba queda retenido hasta que la bodega de origen decida si lo devuelve o lo da de baja.
              } @else {
                Puedes recibir menos de lo enviado; si es parcial, la observación es obligatoria.
              }
            </p>
            <div class="space-y-2">
              @for (p of envioSeleccionadoConfirmacion.productos || []; track $index) {
                <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-bold text-slate-800 truncate">{{ p.nombreProducto }}</p>
                    <p class="text-xs text-slate-500">Enviado: {{ p.cantidad }} und</p>
                  </div>
                  <div class="shrink-0">
                    <label for="env-f2" class="block text-xs font-bold text-slate-500 mb-0.5">Recibido (und)</label>
                    <input id="env-f2"
                      type="number"
                      min="0"
                      step="1"
                      [max]="p.cantidad"
                      [(ngModel)]="cantidadesRecepcion[$index]"
                      [name]="'cantRec' + $index"
                      class="w-20 p-1.5 rounded-lg border border-slate-200 font-mono font-bold text-slate-800" />
                  </div>
                </div>
              }
            </div>
            <div>
              <label for="env-f3" class="block font-bold text-slate-700 mb-1">
                Observación
                @if (modoRechazo) {
                  <span class="text-rose-600">(obligatoria: explica el rechazo)</span>
                } @else if (esRecepcionParcial) {
                  <span class="text-rose-600">(obligatoria por recepción parcial)</span>
                }
              </label>
              <textarea id="env-f3"
                [(ngModel)]="observacionRecepcion"
                name="obsRecepcion"
                rows="2"
                class="w-full p-2.5 rounded-xl border border-slate-200"
                [placeholder]="modoRechazo ? 'Explica por qué se rechaza (ej. llegó averiado, no corresponde al pedido)...' : (esRecepcionParcial ? 'Explica la diferencia de cantidades...' : 'Opcional')"></textarea>
            </div>
            <app-evidencias-envio #evidenciasRecepcion />
          </div>
        }
        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalConfirmacionOpen = false"
            class="btn-secondary w-full sm:w-auto">
            Cancelar
          </button>
          <button
            type="button"
            (click)="ejecutarConfirmacionRecepcion()"
            [disabled]="subiendoEvidencias || ((modoRechazo || esRecepcionParcial) && !observacionRecepcion.trim())"
            [ngClass]="modoRechazo ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'"
            class="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center">
            {{ modoRechazo ? 'Confirmar Rechazo' : 'Confirmar Ingreso' }}
          </button>
        </div>
      </app-modal>

      <!-- MODAL CREAR ENVÍO -->
      <app-modal size="md"
        [isOpen]="modalCrearEnvioOpen"
        title="Crear y Despachar Envío de Suministros"
        icon="send"
        (close)="modalCrearEnvioOpen = false">
        <form (ngSubmit)="guardarNuevoEnvio()" class="space-y-4">
          
          <!-- Banner Informativo de Origen -->
          <div class="p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold"
            [ngClass]="operaBodegaRegional ? 'bg-teal-50 border-teal-200 text-teal-900' : (ambitoAgencia ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-blue-50 border-blue-200 text-blue-900')">
            <i-lucide aria-hidden="true" name="warehouse" class="w-4 h-4 shrink-0" [ngClass]="operaBodegaRegional ? 'text-teal-600' : (ambitoAgencia ? 'text-purple-600' : 'text-easydry-blue')"></i-lucide>
            <div>
              <span>Origen (tu stock): </span>
              <span class="font-extrabold">
                {{ ambitoAgencia ? ('Sucursal ' + liderSucursalNombre) : (operaBodegaRegional ? ('Bodega Regional ' + (miRegionNombre || miBodegaNombre || 'Asignada')) : (miBodegaNombre || 'Bodega Central Nacional')) }}
              </span>
              <span *ngIf="operaBodegaRegional || ambitoAgencia" class="block text-xs font-normal mt-0.5 opacity-80">
                {{ ambitoAgencia
                  ? 'Alcance: solo otras agencias y pulidores de tu región.'
                  : 'Alcance: agencias, pulidores y otras bodegas de tu región.' }}
              </span>
            </div>
          </div>

          <div>
            <label for="env-f4" class="block text-xs font-bold text-slate-700 uppercase mb-1">
              {{ ambitoAgencia ? 'Destino (Agencia o Pulidor) *' : 'Destino (Agencia, Bodega o Pulidor) *' }}
            </label>
            <select id="env-f4"
              [(ngModel)]="nuevoEnvioForm.sucursalId"
              (ngModelChange)="onSucursalChange($event)"
              name="sucursalDestino"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-easydry-blue"
              required>
              <option value="" disabled>Seleccione destino autorizado...</option>
              
              <optgroup label="Agencias / Sucursales">
                @for (suc of sucursalesDisponibles; track suc.id) {
                  <option [value]="'AG:' + suc.id">{{ suc.nombre }} ({{ suc.ciudad }})</option>
                }
              </optgroup>

              <optgroup *ngIf="!ambitoAgencia && bodegasDestinoDisponibles.length > 0" label="Bodegas">
                @for (bod of bodegasDestinoDisponibles; track bod.id) {
                  <option [value]="'BOD:' + bod.id">{{ bod.nombre }} ({{ bod.ciudad }})</option>
                }
              </optgroup>

              <optgroup *ngIf="pulidoresDisponibles.length > 0" label="Pulidores (kit personal, no el stock de la agencia)">
                @for (p of pulidoresDisponibles; track p.id) {
                  <option [value]="'PUL:' + p.id">{{ p.nombre }} — {{ p.etiqueta }}</option>
                }
              </optgroup>
            </select>
            <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <i-lucide aria-hidden="true" name="info" class="w-3 h-3 text-slate-400 shrink-0"></i-lucide>
              <span>Elegir la agencia manda el insumo a su stock general (lo confirma el líder); elegir un pulidor lo manda a su kit personal en custodia (solo él puede confirmarlo).</span>
            </p>
          </div>

          <div>
            <label for="env-f5" class="block text-xs font-bold text-slate-700 uppercase mb-1">Insumo Principal *</label>
            <select id="env-f5"
              [(ngModel)]="nuevoEnvioForm.insumoId"
              (ngModelChange)="onInsumoChange($event)"
              name="insumo"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-easydry-blue"
              required>
              <option value="" disabled>Seleccione insumo...</option>
              @for (ins of insumosDisponibles; track ins.producto.id) {
                <option [value]="ins.producto.id">
                  {{ ins.producto.nombre }} — {{ stockEnUnidadesItem(ins) | number:'1.0-0' }} und
                </option>
              }
              @empty {
                <option value="" disabled>No hay insumos en catálogo aún</option>
              }
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="env-f6" class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad (unidades) *</label>
              <input id="env-f6"
                type="number"
                [(ngModel)]="nuevoEnvioForm.cantidad"
                name="cantidad"
                min="1"
                step="1"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-easydry-blue"
                required>
              <p class="text-xs text-slate-500 mt-1">Unidades completas (envases). Igual para agencia, pulidor o bodega.</p>
            </div>
            <div>
              <label for="env-f7" class="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridad / Observación</label>
              <input id="env-f7"
                type="text"
                [(ngModel)]="nuevoEnvioForm.observacion"
                name="obs"
                placeholder="Ej. Suministro periódico de químicos"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-easydry-blue">
            </div>
          </div>
        </form>
        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalCrearEnvioOpen = false"
            class="btn-secondary w-full sm:w-auto">
            Cancelar
          </button>
          <button
            type="button"
            (click)="guardarNuevoEnvio()"
            [disabled]="!nuevoEnvioForm.sucursalId || !nuevoEnvioForm.insumoId || !nuevoEnvioForm.cantidad || nuevoEnvioForm.cantidad <= 0"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center">
            Despachar Envío
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class EnviosComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toastService = inject(ToastService);
  private sucursalService = inject(SucursalService);
  private inventarioService = inject(InventarioService);
  private notificacionService = inject(NotificacionService);

  /** Contexto del usuario (no decide permisos): ámbito de agencia = ve y recibe solo lo de su agencia. */
  get ambitoAgencia(): boolean {
    const u = this.auth.getCurrentUser();
    return u?.ambito === 'AGENCIA';
  }

  /** Ámbito propio = ve y recibe solo lo suyo (kit personal). */
  get ambitoPropio(): boolean {
    return this.auth.getCurrentUser()?.ambito === 'PROPIO';
  }

  /** Opera desde una bodega regional propia (tiene bodega asignada y no es de alcance global). */
  get operaBodegaRegional(): boolean {
    const u = this.auth.getCurrentUser();
    return !!(u as any)?.bodegaId && u?.ambito !== 'GLOBAL' && this.auth.puede('envios.crear');
  }

  get liderSucursalNombre(): string {
    const u = this.auth.getCurrentUser();
    return u?.sucursalNombre || u?.sucursal || (u as any)?.agencia || 'Mi Agencia';
  }

  get puedeDespachar(): boolean {
    return this.auth.puede('envios.crear');
  }

  get puedeVerDespachos(): boolean {
    return this.auth.puede('despachos.ver');
  }

  get puedeConfirmarEnvio(): boolean {
    return this.auth.puede('envios.confirmar');
  }

  get puedeRechazarEnvio(): boolean {
    return this.auth.puede('envios.rechazar');
  }

  get puedeRecibir(): boolean {
    return this.puedeConfirmarEnvio || this.puedeRechazarEnvio;
  }

  get miRegionNombre(): string {
    const user = this.auth.getCurrentUser();
    return (user?.region || (user as any)?.regionNombre || '').trim();
  }

  get miBodegaNombre(): string {
    const user = this.auth.getCurrentUser();
    return ((user as any)?.bodegaNombre || user?.sucursalNombre || user?.sucursal || (user as any)?.agencia || 'Bodega').trim();
  }

  /** Confirmar/rechazar: exige 'despachos.recibir' y ser el receptor del destino (el servidor lo vuelve a validar). */
  puedeAccionesEnvio(env: EnvioSuministro): boolean {
    if (!this.puedeRecibir) return false;
    const user = this.auth.getCurrentUser();
    if (user?.ambito === 'GLOBAL') return true;
    if ((env as any).puedeConfirmar) return true;
    if (env.estado === 'ENVIADO' || env.estado === 'PENDIENTE') {
      const destPulId = (env as any).destinoPulidorId || (env as any).usuarioRecibeId;
      if (user?.id && destPulId && String(destPulId) === String(user.id)) {
        return true;
      }
      const destBodId = (env as any).destinoBodegaId;
      if (user?.bodegaId && (String(destBodId) === String(user.bodegaId) || String(env.sucursalId) === String(user.bodegaId))) {
        return true;
      }
      const destAgId = (env as any).destinoAgenciaId;
      if (user?.agenciaId && (String(destAgId) === String(user.agenciaId) || String(env.sucursalId) === String(user.agenciaId))) {
        return true;
      }
    }
    return false;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Paginación, orden, búsqueda y filtros en el SERVIDOR (páginas numeradas)
  //  El alcance por rol (pulidor, líder, asistente de bodega) también lo aplica el servidor.
  // ══════════════════════════════════════════════════════════════════════════

  readonly listaEstados = ['Todos', 'En tránsito', 'Recibido', 'Rechazado'];
  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Mes' };
  private busqueda = '';
  private todasSucursales: Sucursal[] = [];

  readonly columnas: TableColumn[] = [
    { key: 'guia', label: 'Código Envío', sortable: true, defaultSort: 'asc' },
    { key: 'fecha', label: 'Fecha & Salida', sortable: true, defaultSort: 'desc' },
    { key: 'destino', label: 'Agencia Destino', sortable: true, defaultSort: 'asc' },
    { key: 'insumos', label: 'Insumos Enviados' },
    { key: 'respEnvio', label: 'Resp. Envío' },
    { key: 'respRecepcion', label: 'Resp. Recepción' },
    { key: 'tiempos', label: 'Tiempos', align: 'center' },
    { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc', align: 'center' },
    { key: 'recepcion', label: 'Fecha y Hora Aprobación / Rechazo', sortable: true, defaultSort: 'desc', align: 'center' },
    { key: 'acciones', label: 'Acciones de Agencia', align: 'right', sticky: true },
  ];
  filas: EnvioSuministro[] = [];
  totalTabla = 0;
  pagina = 1;
  pageSizeTabla = PAGE_SIZE_TABLA;
  /** Lo más reciente primero: es el orden que aplica el servidor cuando no se elige otra columna. */
  sortField: string | null = 'fecha';
  sortOrder: OrdenDir = 'desc';
  cargandoTabla = false;
  errorTabla: string | null = null;
  /** Contadores de los filtros vigentes (menos el de estado); los da el servidor, no lo cargado. */
  resumen: ResumenDespachos | null = null;
  /** Los últimos rechazados (aviso destacado) y cuántos hay en total dentro del alcance del usuario. */
  private subTabla?: Subscription;

  readonly claseFila = (env: EnvioSuministro): string => (env.estado === 'RECHAZADO' || this.esDesconforme(env) ? 'bg-rose-50/60 hover:bg-rose-50' : '');

  /** Envío cuyo detalle de faltantes se está revisando o resolviendo en el modal. */
  envioResolviendo: any = null;

  get puedeResolverFaltantes(): boolean { return this.auth.puede('envios.faltantes'); }

  /** Recibido, pero llegó menos de lo despachado (o el servidor registró faltantes de esa guía). */
  esDesconforme = (env: EnvioSuministro): boolean => {
    if (env.estado !== 'RECIBIDO') return false;
    const e = env as any;
    if (e.faltantes?.length) return true;
    return (e.detalles || []).some((d: any) => d.cantidadRecibida != null && Number(d.cantidadRecibida) < Number(d.cantidadEnviada));
  };

  faltantesPendientes(env: any): number {
    return (env.faltantes || []).filter((f: any) => f.estado === 'PENDIENTE').length;
  }

  resumenFaltante(env: any): string {
    const sin = (env.faltantes || []).reduce((t: number, f: any) => t + Number(f.cantidadUnd || 0), 0);
    return sin > 0 ? `${sin} und sin recibir` : 'faltante registrado';
  }

  alResolver(): void {
    this.envioResolviendo = null;
    this.cargarPagina(true);
  }

  // Catálogos dinámicos
  sucursalesDisponibles: Sucursal[] = [];
  bodegasDisponibles: BodegaInventario[] = [];
  bodegasDestinoDisponibles: BodegaInventario[] = [];
  pulidoresDisponibles: Array<{ id: string; nombre: string; etiqueta: string }> = [];
  insumosDisponibles: InventarioItem[] = [];

  // Modales
  /** El mismo modal de recepción sirve para rechazar: cantidad recibida (0 por defecto) y observación obligatoria. */
  modoRechazo = false;
  @ViewChild('evidenciasRecepcion') evidenciasRecepcion?: EvidenciasEnvioComponent;
  subiendoEvidencias = false;
  modalCrearEnvioOpen = false;
  modalConfirmacionOpen = false;
  envioSeleccionadoConfirmacion: EnvioSuministro | null = null;
  observacionRecepcion = '';
  cantidadesRecepcion: number[] = [];

  get esRecepcionParcial(): boolean {
    const env = this.envioSeleccionadoConfirmacion;
    if (!env?.productos?.length) return false;
    return env.productos.some((p, i) => Number(this.cantidadesRecepcion[i] ?? p.cantidad) < Number(p.cantidad));
  }

  nuevoEnvioForm = {
    sucursalId: '' as string | number,
    sucursalNombre: '',
    insumoId: '' as string | number,
    insumoNombre: '',
    cantidad: 1,
    observacion: ''
  };

  // Contadores del servidor (mismos filtros menos el de estado); mientras llegan se muestra 0.
  get totalEnvios(): number { return this.resumen?.total ?? 0; }
  get countEnCamino(): number { return this.resumen?.enTransito ?? 0; }
  get countRecibidos(): number { return this.resumen?.recibidos ?? 0; }
  get countRechazados(): number { return this.resumen?.rechazados ?? 0; }

  get tituloVacio(): string {
    const c = this.consulta();
    const hayFiltros = !!(c.search || c.estadoDespacho || c.fechaDesde || this.sucursalElegida());
    if (hayFiltros) return 'No hay envíos que coincidan con los filtros aplicados.';
    return this.ambitoAgencia ? 'No hay envíos registrados para tu agencia en este momento.' : 'No hay envíos registrados.';
  }

  ngOnInit(): void {
    if (this.puedeVerDespachos) this.refrescar();
  }

  /** Reaplica el default de sucursal/insumo del form si el catálogo llegó después de abrir el modal (primera vez). */
  private aplicarDefaultsFormularioEnvio(): void {
    if (!this.modalCrearEnvioOpen) return;
    if (!this.nuevoEnvioForm.sucursalId && this.sucursalesDisponibles[0]) {
      const s = this.sucursalesDisponibles[0];
      this.nuevoEnvioForm.sucursalId = s.id;
      this.nuevoEnvioForm.sucursalNombre = s.nombre;
    }
    if (!this.nuevoEnvioForm.insumoId && this.insumosDisponibles[0]) {
      const i = this.insumosDisponibles[0];
      this.nuevoEnvioForm.insumoId = i.producto.id;
      this.nuevoEnvioForm.insumoNombre = i.producto.nombre;
    }
  }

  /** Los catálogos del formulario de envío (sucursales, bodegas, insumos, pulidores) solo hacen falta dentro del
   * modal "Crear Envío": antes se pedían siempre en `ngOnInit`, aunque el usuario nunca abriera el modal. */
  private catalogosEnvioCargados = false;
  private cargarCatalogosEnvioSiHaceFalta(): void {
    if (this.catalogosEnvioCargados || !this.puedeDespachar) return;
    this.catalogosEnvioCargados = true;

    this.sucursalService.getSucursales().subscribe(sucs => {
      this.todasSucursales = sucs || [];
      const user = this.auth.getCurrentUser();
      const userRegion = (user?.region || (user as any)?.regionNombre || '').toLowerCase().trim();

      if (user?.ambito !== 'GLOBAL' && userRegion) {
        this.sucursalesDisponibles = (sucs || []).filter(s =>
          (s.regionNombre && s.regionNombre.toLowerCase().includes(userRegion)) ||
          (s.ciudad && s.ciudad.toLowerCase().includes(userRegion)) ||
          (s.regionId && user?.regionId && String(s.regionId) === String(user.regionId))
        );
      } else {
        this.sucursalesDisponibles = sucs || [];
      }
      this.aplicarDefaultsFormularioEnvio();
    });

    this.inventarioService.getBodegas().subscribe(bodegas => {
      this.bodegasDisponibles = bodegas || [];
      const user = this.auth.getCurrentUser();
      const userRegion = (user?.region || (user as any)?.regionNombre || '').toLowerCase().trim();
      const miBodegaId = String((user as any)?.bodegaId || '');

      // Ámbito de agencia (líder): solo agencias y pulidores de su región, nunca bodegas.
      if (this.ambitoAgencia) {
        this.bodegasDestinoDisponibles = [];
        return;
      }

      let destinos = this.bodegasDisponibles.filter(b => String(b.id) !== miBodegaId);
      if (user?.ambito !== 'GLOBAL' && userRegion) {
        destinos = destinos.filter(b =>
          !b.esCentral && (b.region && b.region.toLowerCase().includes(userRegion))
        );
      }
      this.bodegasDestinoDisponibles = destinos;
    });

    this.inventarioService.getItems().subscribe(items => {
      this.insumosDisponibles = items || [];
      this.aplicarDefaultsFormularioEnvio();
    });

    const user = this.auth.getCurrentUser();
    this.http.post<any[]>(apiUrl('/operaciones/servicios-especiales/pulidores'), {
      regionId: user?.regionId || undefined
    }).pipe(catchError(() => of([]))).subscribe((list) => {
      this.pulidoresDisponibles = (list || []).map((p: any) => {
        const esFijo = p.modalidad === 'FIJO' || Boolean(p.agenciaId || p.agencia?.id);
        const sede = esFijo
          ? (p.agenciaNombre || p.agencia?.nombre || 'sede fija')
          : (p.regionNombre || p.region?.nombre || 'zona');
        return {
          id: String(p.id),
          nombre: `${p.name || p.nombre || ''} ${p.lastname || p.apellido || ''}`.trim() || p.email || p.id,
          // Se muestra junto al nombre en el <option> para no confundir "despachar a la agencia"
          // (stock general) con "despachar al kit personal del pulidor fijo de esa agencia": son
          // destinos distintos y solo el pulidor destinatario puede confirmar el segundo.
          etiqueta: esFijo ? `Fijo · ${sede}` : `Móvil · ${sede}`,
        };
      });
    });
  }

  ngOnDestroy(): void {
    this.subTabla?.unsubscribe();
  }

  /** Vuelve a la primera página con los filtros vigentes (y pide contadores y rechazados). */
  reiniciar(): void {
    this.pagina = 1;
    this.refrescar();
  }

  /** Tras cambiar un filtro o una acción (despachar, confirmar, rechazar): vuelve a pedir lo que se ve y los contadores. */
  refrescar(): void {
    this.cargarPagina(true);
  }

  onTablaCambio(q: ConsultaTabla): void {
    const cambioBusqueda = q.search !== this.busqueda;
    this.busqueda = q.search;
    this.pagina = q.page;
    this.pageSizeTabla = q.pageSize;
    this.sortField = q.sortField;
    this.sortOrder = q.sortOrder;
    // Los contadores dependen del texto buscado, no de la página ni del orden.
    this.cargarPagina(cambioBusqueda);
  }

  /** Pide la página actual. `conResumen`: también recalcula los contadores (cambió un filtro o una acción). */
  cargarPagina(conResumen = false): void {
    this.subTabla?.unsubscribe();
    this.cargandoTabla = true;
    this.errorTabla = null;
    this.subTabla = this.inventarioService
      .getDespachosPagina({
        ...this.consulta(),
        sortField: this.sortField,
        sortOrder: this.sortOrder,
        page: this.pagina,
        pageSize: this.pageSizeTabla,
        incluirResumen: conResumen || !this.resumen,
      })
      .subscribe({
        next: ({ pagina, resumen }) => {
          if (resumen) this.resumen = resumen;
          // Si la página quedó vacía (cambió lo último de la lista) se retrocede a la última que exista.
          if (pagina.items.length === 0 && this.pagina > 1 && pagina.total > 0) {
            this.pagina = Math.max(1, pagina.totalPages);
            this.cargarPagina(false);
            return;
          }
          this.filas = pagina.items.map((m) => this.mapBackendDespacho(m));
          this.totalTabla = pagina.total;
          this.pagina = pagina.page;
          this.cargandoTabla = false;
        },
        error: (err) => {
          console.error('Error listando despachos:', err);
          this.filas = [];
          this.totalTabla = 0;
          this.errorTabla = this.mensajeError(err);
          this.cargandoTabla = false;
        },
      });
  }

  private mensajeError(err: unknown): string {
    const e = err as { error?: { message?: string | string[] }; message?: string } | undefined;
    const detalle = e?.error?.message;
    if (Array.isArray(detalle)) return detalle.join('. ');
    return detalle || e?.message || 'No se pudieron cargar los envíos.';
  }

  /** Sin agencia ni kit propio: el servidor no limita a una agencia (la región la aplica el servidor). */
  private get verTodas(): boolean {
    return !this.ambitoAgencia && !this.ambitoPropio;
  }

  /** Alcance del usuario. El servidor lo vuelve a aplicar por rol: esto solo lo deja explícito para los roles sin regla propia. */
  private filtroAlcance(): ConsultaDespachos {
    const user = this.auth.getCurrentUser();
    if (this.ambitoPropio) return { pulidorId: user?.id != null ? String(user.id) : undefined };
    if (this.verTodas) return {};
    const agencia = user?.agenciaId || user?.sucursalNombre || user?.sucursal;
    return { agenciaId: agencia != null ? String(agencia) : undefined };
  }

  private neutro(v: string | undefined | null, ...neutros: string[]): string {
    const t = (v ?? '').trim();
    return !t || neutros.includes(t) ? '' : t;
  }

  /** Nombre de la sucursal elegida en el filter-bar ('' si no hay filtro). */
  private sucursalElegida(): string {
    return this.neutro(this.filtrosGlobales.sucursal, 'Todas', 'TODAS');
  }

  /** Estado elegido en el filter-bar → valor del servidor. */
  private estadoServidor(): string | undefined {
    switch (this.neutro(this.filtrosGlobales.estado, 'Todos')) {
      case 'En tránsito': return 'EN_TRANSITO';
      case 'Recibido': return 'RECIBIDO';
      case 'Rechazado': return 'RECHAZADO';
      default: return undefined;
    }
  }

  /** Filtros vigentes para el servidor (sin página, tamaño ni orden). */
  private consulta(): ConsultaDespachos {
    const rango = resolverRangoFechas(this.filtrosGlobales);
    const nombre = this.sucursalElegida();
    // Los roles con vista global pueden elegir una sucursal (id si se conoce; el servidor también entiende nombre o código);
    // los demás quedan siempre en su propia agencia.
    const suc = nombre ? this.todasSucursales.find((s) => (s.nombre || '').toLowerCase() === nombre.toLowerCase()) : undefined;
    return {
      ...this.filtroAlcance(),
      ...(nombre && this.verTodas ? { agenciaId: suc ? String(suc.id) : nombre } : {}),
      search: this.busqueda,
      estadoDespacho: this.estadoServidor(),
      fechaDesde: rango?.inicio,
      fechaHasta: rango?.fin,
    };
  }

  private mapBackendDespacho(m: any): EnvioSuministro {
    const userDesp = m.usuarioDespacha
      ? `${m.usuarioDespacha.name || ''} ${m.usuarioDespacha.lastname || ''}`.trim()
      : 'Distribuidor Central (Bodega)';
    const userRec = m.usuarioRecibe
      ? `${m.usuarioRecibe.name || ''} ${m.usuarioRecibe.lastname || ''}`.trim()
      : undefined;
    const fechaEnv = m.fechaDespacho
      ? m.fechaDespacho.split('T')[0]
      : (m.createdAt ? m.createdAt.split('T')[0] : '');
    const fechaRec = m.fechaRecepcion
      ? m.fechaRecepcion.split('T')[0]
      : undefined;
    const horaIni = m.fechaDespacho ? m.fechaDespacho.substring(11, 16) : '';
    const horaFin = m.fechaRecepcion ? m.fechaRecepcion.substring(11, 16) : undefined;

    let estado: EstadoEnvio = 'PENDIENTE';
    if (m.estadoDespacho === 'EN_TRANSITO') estado = 'ENVIADO';
    else if (m.estadoDespacho === 'RECIBIDO') estado = 'RECIBIDO';
    else if (m.estadoDespacho === 'RECHAZADO') estado = 'RECHAZADO';

    const rawResolucion = m.fechaRecepcion || ((estado === 'RECIBIDO' || estado === 'RECHAZADO') ? m.updatedAt : null);
    let fechaRes: string | undefined = undefined;
    let horaRes: string | undefined = undefined;
    if (rawResolucion) {
      try {
        const d = new Date(rawResolucion);
        if (!isNaN(d.getTime())) {
          fechaRes = d.toISOString().split('T')[0];
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          horaRes = `${hours}:${minutes}`;
        }
      } catch {
        fechaRes = typeof rawResolucion === 'string' ? rawResolucion.split('T')[0] : undefined;
        horaRes = typeof rawResolucion === 'string' && rawResolucion.length >= 16 ? rawResolucion.substring(11, 16) : undefined;
      }
    }

    const sucursalNombre = m.destinoUbicacion
      ?.replace(/Agencia\s*/i, '')
      ?.replace(/\[.*\]/, '')
      ?.trim() || m.destinoUbicacion || 'Destino';

    let motivoRechazo = m.motivoRechazo;
    if (!motivoRechazo && m.observaciones && m.observaciones.includes('RECHAZO:')) {
      const parts = m.observaciones.split(/RECHAZO:\s*/i);
      motivoRechazo = parts[parts.length - 1]?.trim();
    }

    return {
      id: m.id,
      codigoEnvio: m.numeroGuia || `ENV-${(m.id || '').substring(0, 6)}`,
      fecha: fechaEnv,
      fechaEnvio: fechaEnv ? `${fechaEnv} ${horaIni}` : undefined,
      fechaRecepcion: fechaRec ? `${fechaRec} ${horaFin || ''}`.trim() : undefined,
      fechaResolucion: fechaRes,
      horaInicio: horaIni,
      horaFin: horaFin,
      horaResolucion: horaRes,
      duracionMin: m.duracionMin || undefined,
      sucursalId: m.destinoAgenciaId || m.destinoBodegaId || m.destinoPulidorId || m.destinoUbicacion,
      sucursalNombre,
      ciudad: m.tipo === 'DESPACHO_BODEGA' ? 'Bodega' : (m.tipo === 'DESPACHO_PULIDOR' ? 'Pulidor' : 'Agencia'),
      productos: (m.detalles || []).map((d: any) => ({
        id: d.id,
        detalleId: d.id,
        productoId: d.insumoId,
        nombreProducto: d.insumo?.nombre || 'Insumo',
        cantidad: Number(d.cantidadEnviada || 0),
        unidad: 'und'
      })),
      detalles: (m.detalles || []).map((d: any) => ({ id: d.id, detalleId: d.id, cantidadEnviada: d.cantidadEnviada, cantidadRecibida: d.cantidadRecibida })),
      faltantes: m.faltantes || [],
      evidencias: m.evidencias || [],
      responsableEnvio: userDesp,
      responsableRecepcion: userRec,
      estado,
      observaciones: m.observaciones,
      motivoRechazo: motivoRechazo || undefined,
      puedeConfirmar: !!m.puedeConfirmar,
      tipoDespacho: m.tipo,
      destinoPulidorId: m.destinoPulidorId,
      usuarioRecibeId: m.usuarioRecibeId,
    } as any;
  }

  aplicarNuevosFiltros(filtros: FilterState): void {
    this.filtrosGlobales = filtros;
    // El texto de búsqueda vive en la tabla; aquí solo llegan sucursal, estado y fechas.
    this.reiniciar();
  }

  abrirModalCrearEnvio(): void {
    if (!this.puedeDespachar) {
      this.toastService.warning(
        'Sin permiso',
        'No tienes permiso para crear despachos.'
      );
      return;
    }
    this.cargarCatalogosEnvioSiHaceFalta();
    const primeraSuc = this.sucursalesDisponibles[0];
    const primerIns = this.insumosDisponibles[0];
    this.nuevoEnvioForm = {
      sucursalId: primeraSuc ? primeraSuc.id : '',
      sucursalNombre: primeraSuc ? primeraSuc.nombre : '',
      insumoId: primerIns ? primerIns.producto.id : '',
      insumoNombre: primerIns ? primerIns.producto.nombre : '',
      cantidad: 1,
      observacion: ''
    };
    this.modalCrearEnvioOpen = true;
  }

  onSucursalChange(id: any): void {
    const raw = String(id || '');
    const cleanId = raw.replace(/^(AG:|BOD:|PUL:)/, '');
    const suc = this.sucursalesDisponibles.find(s => String(s.id) === cleanId);
    if (suc) {
      this.nuevoEnvioForm.sucursalNombre = suc.nombre;
      return;
    }
    const bod = this.bodegasDestinoDisponibles.find(b => String(b.id) === cleanId);
    if (bod) {
      this.nuevoEnvioForm.sucursalNombre = bod.nombre;
      return;
    }
    const pul = this.pulidoresDisponibles.find(p => String(p.id) === cleanId);
    if (pul) this.nuevoEnvioForm.sucursalNombre = pul.nombre;
  }

  onInsumoChange(id: any): void {
    const ins = this.insumosDisponibles.find(i => String(i.producto.id) === String(id));
    if (ins) this.nuevoEnvioForm.insumoNombre = ins.producto.nombre;
  }

  /** Stock disponible del ítem en unidades (envases), no volumen. */
  stockEnUnidadesItem(ins: InventarioItem): number {
    const cNeto = Number(ins?.producto?.contenidoNeto) || 1;
    const stockBase = Number(ins?.stockBodegaCentral ?? ins?.stockTotalRed ?? 0);
    if (cNeto <= 0) return stockBase;
    return Math.floor(stockBase / cNeto + 1e-9);
  }

  guardarNuevoEnvio(): void {
    if (!this.puedeDespachar) {
      this.toastService.warning(
        'Sin permiso',
        'No tienes permiso para crear despachos.'
      );
      return;
    }
    if (!this.nuevoEnvioForm.sucursalId) {
      this.toastService.warning('Destino requerido', 'Seleccione la agencia, bodega o pulidor destino.');
      return;
    }
    if (!this.nuevoEnvioForm.insumoId) {
      this.toastService.warning('Insumo requerido', 'Seleccione el insumo a despachar.');
      return;
    }

    const cantRaw = Number(this.nuevoEnvioForm.cantidad);
    if (!Number.isFinite(cantRaw) || cantRaw <= 0) {
      this.toastService.warning('Cantidad inválida', 'La cantidad debe ser mayor a 0.');
      return;
    }
    if (Math.abs(cantRaw - Math.round(cantRaw)) > 1e-9) {
      this.toastService.warning('Cantidad inválida', 'Solo se permiten unidades completas (números enteros).');
      return;
    }
    const unidades = Math.round(cantRaw);

    const rawDestino = String(this.nuevoEnvioForm.sucursalId);
    const esBodega = rawDestino.startsWith('BOD:');
    const esPulidor = rawDestino.startsWith('PUL:');
    const destinoId = rawDestino.replace(/^(AG:|BOD:|PUL:)/, '');

    const origenLabel = this.ambitoAgencia
      ? `Sucursal ${this.liderSucursalNombre}`
      : this.operaBodegaRegional
        ? `Bodega Regional ${this.miRegionNombre || this.miBodegaNombre}`
        : (this.miBodegaNombre || 'Bodega Central Nacional');

    const payload: any = {
      tipo: esPulidor ? 'DESPACHO_PULIDOR' : (esBodega ? 'DESPACHO_BODEGA' : 'DESPACHO_AGENCIA'),
      origenUbicacion: origenLabel,
      observaciones: this.nuevoEnvioForm.observacion || `Despacho desde ${origenLabel}`,
      detalles: [
        {
          insumoId: String(this.nuevoEnvioForm.insumoId),
          cantidadEnviada: unidades
        }
      ]
    };

    if (esPulidor) {
      payload.pulidorDestinoId = destinoId;
      payload.destinoPulidorId = destinoId;
    } else if (esBodega) {
      payload.destinoBodegaId = destinoId;
    } else {
      payload.agenciaId = destinoId;
      payload.sucursalDestinoId = destinoId;
      payload.agenciaDestinoId = destinoId;
    }

    this.http.post<any>(apiUrl('/inventario/despachos/crear'), payload).pipe(
      catchError(err => {
        this.toastService.error(
          'Error al despachar',
          err?.error?.message || 'No se pudo registrar el envío'
        );
        return of(null);
      })
    ).subscribe((res) => {
      if (!res) return;
      this.modalCrearEnvioOpen = false;
      this.toastService.success(
        'Envío Despachado',
        `Envío en tránsito hacia ${this.nuevoEnvioForm.sucursalNombre || 'destino'}. Stock reservado (${unidades} und) hasta confirmación.`
      );
      this.refrescar();
    });
  }

  abrirModalConfirmacion(env: EnvioSuministro): void {
    this.modoRechazo = false;
    this.envioSeleccionadoConfirmacion = env;
    this.observacionRecepcion = '';
    this.cantidadesRecepcion = (env.productos || []).map((p) => Number(p.cantidad) || 0);
    this.evidenciasRecepcion?.limpiar();
    this.modalConfirmacionOpen = true;
  }

  async ejecutarConfirmacionRecepcion(): Promise<void> {
    const env = this.envioSeleccionadoConfirmacion;
    if (!env) return;
    if (this.modoRechazo && !this.observacionRecepcion.trim()) {
      this.toastService.warning('Observación requerida', 'Explica por qué se rechaza el envío.');
      return;
    }
    if (!this.modoRechazo && this.esRecepcionParcial && !this.observacionRecepcion.trim()) {
      this.toastService.warning('Observación requerida', 'En recepción parcial debes explicar la diferencia.');
      return;
    }

    const user = this.auth.getCurrentUser();
    const agenciaId = env.sucursalId || user?.agenciaId || user?.sucursalNombre || user?.sucursal || '';
    const cantidadesRecibidas = (env.productos || []).map((p: any, i) => ({
      detalleId: String(p.detalleId || p.id || ''),
      cantidadRecibida: Number(this.cantidadesRecepcion[i] ?? p.cantidad) || 0,
    })).filter((c) => c.detalleId);

    for (const c of cantidadesRecibidas) {
      if (Math.abs(c.cantidadRecibida - Math.round(c.cantidadRecibida)) > 1e-9) {
        this.toastService.warning('Cantidad inválida', 'La recepción debe ser en unidades completas (enteros).');
        return;
      }
      c.cantidadRecibida = Math.round(c.cantidadRecibida);
    }

    // Rechazar sin recibir nada es un rechazo completo; si se recibió algo, es una recepción parcial.
    const recibidoAlgo = cantidadesRecibidas.some((c) => c.cantidadRecibida > 0);
    if (this.modoRechazo && !recibidoAlgo) {
      const fotos = await this.subirFotos(env, 'rechazo');
      if (fotos === null) return;
      this.rechazarEnvioCompleto(env, this.observacionRecepcion.trim(), fotos);
      return;
    }
    if (this.modoRechazo && !this.puedeConfirmarEnvio) {
      this.toastService.warning('Sin permiso', 'Tu rol puede rechazar el envío completo, pero no recibir una parte. Deja la cantidad recibida en 0.');
      return;
    }
    const evidencias = await this.subirFotos(env, this.modoRechazo ? 'rechazo' : 'recepcion');
    if (evidencias === null) return;

    const body: any = {
      movimientoId: String(env.id),
      agenciaId: String(agenciaId),
      sucursalId: String(agenciaId),
      accion: 'RECIBIDO',
      observaciones: this.observacionRecepcion.trim() || undefined,
      evidencias: evidencias.length ? evidencias : undefined,
    };
    if (cantidadesRecibidas.length > 0) {
      body.cantidadesRecibidas = cantidadesRecibidas;
    }

    this.http.post<any>(apiUrl('/inventario/despachos/confirmar-recepcion'), body).subscribe({
      next: () => {
        this.modalConfirmacionOpen = false;
        this.toastService.success(
          'Recepción Confirmada',
          `El envío ${env.codigoEnvio} ingresó al stock de ${env.sucursalNombre}.`
        );
        this.refrescar();
        this.notificacionService.recargar();
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Error al confirmar la recepción en el servidor';
        this.toastService.error('Error al Confirmar', msg);
      }
    });
  }

  confirmarRecepcionEnvio(env: EnvioSuministro): void {
    this.abrirModalConfirmacion(env);
  }

  abrirModalRechazo(env: EnvioSuministro): void {
    this.modoRechazo = true;
    this.envioSeleccionadoConfirmacion = env;
    this.observacionRecepcion = '';
    this.cantidadesRecepcion = (env.productos || []).map(() => 0);
    this.evidenciasRecepcion?.limpiar();
    this.modalConfirmacionOpen = true;
  }

  /** Sube las fotos opcionales; devuelve null si falló (ya se avisó) para no guardar la recepción sin ellas. */
  private async subirFotos(env: EnvioSuministro, etapa: 'recepcion' | 'rechazo'): Promise<string[] | null> {
    if (!this.evidenciasRecepcion?.cantidad) return [];
    this.subiendoEvidencias = true;
    try {
      return await this.evidenciasRecepcion.subir(String(env.codigoEnvio), etapa);
    } catch (err: any) {
      this.toastService.error('No se pudieron subir las fotos', err?.error?.message || err?.message || 'Intenta de nuevo o quítalas.');
      return null;
    } finally {
      this.subiendoEvidencias = false;
    }
  }

  private rechazarEnvioCompleto(env: EnvioSuministro, motivo: string, evidencias: string[] = []): void {
    const user = this.auth.getCurrentUser();
    const agenciaId = env.sucursalId || user?.agenciaId || user?.sucursalNombre || user?.sucursal || '';

    this.http.post<any>(apiUrl('/inventario/despachos/rechazar'), {
      movimientoId: String(env.id),
      agenciaId: String(agenciaId),
      motivo,
      observaciones: motivo,
      evidencias: evidencias.length ? evidencias : undefined,
    }).subscribe({
      next: () => {
        const ahora = new Date();
        const fechaStr = ahora.toISOString().split('T')[0];
        const horaStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
        env.estado = 'RECHAZADO';
        env.motivoRechazo = motivo;
        env.fechaResolucion = fechaStr;
        env.horaResolucion = horaStr;
        env.responsableRecepcion = `${user?.nombre || 'Líder'} ${user?.apellido || 'Operador'} (Receptor)`.trim();
        this.modalConfirmacionOpen = false;

        this.toastService.warning(
          'Envío Rechazado',
          `Se rechazó ${env.codigoEnvio}: ${motivo}. El producto quedó retenido hasta que la bodega de origen decida qué hacer con él.`
        );
        this.refrescar();
        this.notificacionService.recargar();
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Error al rechazar el despacho en el servidor';
        this.toastService.error('Error al Rechazar', msg);
      }
    });
  }

  getFechaResolucion(env: EnvioSuministro): string {
    if (env.fechaResolucion) return env.fechaResolucion;
    if (env.fechaRecepcion) {
      return env.fechaRecepcion.split(' ')[0] || env.fechaRecepcion;
    }
    return env.fecha || new Date().toISOString().split('T')[0];
  }

  getHoraResolucion(env: EnvioSuministro): string {
    if (env.horaResolucion) return env.horaResolucion;
    if (env.horaFin) return env.horaFin;
    if (env.fechaRecepcion && env.fechaRecepcion.includes(' ')) {
      return env.fechaRecepcion.split(' ')[1];
    }
    return env.estado === 'RECHAZADO' ? '10:15' : '09:45';
  }
}

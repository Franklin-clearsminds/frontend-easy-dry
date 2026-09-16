import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { InventarioService } from '../../core/services/inventario.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { EnvioSuministro, EstadoEnvio, Sucursal, InventarioItem } from '../../core/models';
import { BodegaInventario } from '../../core/models/inventario.model';
import { Role } from '../../core/models/roles.model';
import { apiUrl } from '../../core/config/env';

@Component({
  selector: 'app-envios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in pb-12">

      <!-- Header -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mb-2">
            <i-lucide name="send" class="w-3.5 h-3.5"></i-lucide>
            <span>{{ isLiderOperador ? 'Recepción de Suministros' : (isPulidor ? 'Recepción de Insumos (Kit Pulidor)' : 'Logística de Suministros') }}</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">
            {{ isLiderOperador ? 'Envíos & Confirmación de Recepción — ' + liderSucursalNombre : (isPulidor ? 'Envíos & Confirmación — Mi Kit de Pulidor' : 'Envíos & Confirmación de Recepción') }}
          </h1>
          <p class="text-slate-500 text-xs mt-1">
            {{ isLiderOperador 
              ? 'Confirma o rechaza los suministros enviados a tu agencia. Al confirmar, el stock ingresa a tu sede.' 
              : (isPulidor
                ? 'Confirma o rechaza los insumos químicos enviados a tu kit personal. Al confirmar, el stock ingresa a tu inventario para servicios especiales.'
                : 'Solo confirmación y seguimiento: crea los despachos desde Inventario. Aquí se aceptan, rechazan y alertan.') }}
          </p>
        </div>
      </div>

      <!-- Alerta Destacada de Envíos Rechazados -->
      @if (countRechazados > 0) {
        <div class="p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl shadow-sm space-y-3 animate-fade-in">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <i-lucide name="alert-triangle" class="w-5 h-5"></i-lucide>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-black text-rose-950 uppercase tracking-wide">
                    Alerta: {{ countRechazados }} despacho(s) rechazado(s)
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900 animate-pulse">
                    Stock permanece en origen (reserva liberada)
                  </span>
                </div>
                <p class="text-xs text-rose-800 mt-0.5">
                  El destino no aceptó el envío. El stock nunca salió del origen; revisa el motivo para reenviar o gestionar.
                </p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            @for (rech of enviosRechazados; track rech.id) {
              <div class="p-3.5 bg-white rounded-xl border border-rose-200 text-xs shadow-2xs space-y-2">
                <div class="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-black text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-200">
                      {{ rech.codigoEnvio }}
                    </span>
                    <span class="font-bold text-slate-800">{{ rech.sucursalNombre }}</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">{{ rech.fecha }}</span>
                </div>

                <div class="space-y-1">
                  <span class="text-[10px] font-bold text-slate-400 uppercase">Insumos del Envío:</span>
                  <div class="flex flex-wrap gap-1">
                    @for (p of rech.productos; track p.nombreProducto) {
                      <span class="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-800 border border-slate-200">
                        <strong class="font-mono text-rose-700 font-black">{{ p.cantidad }} und</strong> {{ p.nombreProducto }}
                      </span>
                    }
                  </div>
                </div>

                <div class="p-2 bg-rose-100/80 rounded-lg text-rose-950 text-[11px] border border-rose-200">
                  <span class="font-black text-rose-800 uppercase text-[10px] block mb-0.5">Motivo / Comentario de la Sede:</span>
                  <p class="font-semibold italic">"{{ rech.motivoRechazo || rech.observaciones || 'No se especificó comentario' }}"</p>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Banner KPIs Generales / Sede -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-easydry">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Envíos</span>
          <p class="text-2xl font-extrabold text-slate-900 mt-1">{{ enviosFiltrados.length }}</p>
        </div>
        <div class="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl shadow-easydry">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-amber-700">En Camino (Pendientes)</span>
            @if (countEnCamino > 0) {
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            }
          </div>
          <p class="text-2xl font-extrabold text-amber-950 mt-1">{{ countEnCamino }}</p>
        </div>
        <div class="p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl shadow-easydry">
          <span class="text-[10px] font-black uppercase tracking-wider text-emerald-700">Recibidos en Sede</span>
          <p class="text-2xl font-extrabold text-emerald-950 mt-1">{{ countRecibidos }}</p>
        </div>
        <div class="p-4 bg-rose-50/80 border border-rose-200/90 rounded-2xl shadow-easydry">
          <span class="text-[10px] font-black uppercase tracking-wider text-rose-700">Rechazados / Disconformidad</span>
          <p class="text-2xl font-extrabold text-rose-950 mt-1">{{ countRechazados }}</p>
        </div>
      </div>

      <!-- Filtros -->
      <app-filter-bar
        [showFechas]="true"
        [showSucursal]="!isLiderOperador"
        [showEstado]="true"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

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
                <th class="py-3.5 px-3 text-center">Fecha y Hora Aprobación / Rechazo</th>
                <th class="py-3.5 px-4 text-right">Acciones de Agencia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              @for (env of enviosFiltrados; track env.id) {
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
                    <div class="space-y-1">
                      @for (p of env.productos; track p.nombreProducto) {
                        <div class="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 px-2 py-1 rounded-lg text-slate-800 font-semibold text-[11px] border border-slate-200/80 mr-1 mb-0.5">
                          <span class="font-mono text-emerald-800 font-black bg-emerald-100 px-1.5 py-0.2 rounded text-[11px]">{{ p.cantidad }} und</span>
                          <span class="text-slate-900 font-bold">{{ p.nombreProducto }}</span>
                        </div>
                      }
                      @empty {
                        <span class="text-slate-400 italic">Sin detalle</span>
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
                      {{ env.estado === 'ENVIADO' ? 'EN TRÁNSITO' : env.estado }}
                    </span>
                  </td>
                  <td class="py-3.5 px-3 text-center">
                    @if (env.estado === 'RECIBIDO') {
                      <div class="inline-flex flex-col items-center">
                        <span class="text-xs font-extrabold text-emerald-800 flex items-center gap-1 font-mono">
                          <i-lucide name="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                          {{ getFechaResolucion(env) }}
                        </span>
                        <span class="text-[11px] text-emerald-700 font-black font-mono">
                          {{ getHoraResolucion(env) || '09:45' }}
                        </span>
                        <span class="px-2 py-0.5 mt-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Aprobado
                        </span>
                      </div>
                    } @else if (env.estado === 'RECHAZADO') {
                      <div class="inline-flex flex-col items-center">
                        <span class="text-xs font-extrabold text-rose-800 flex items-center gap-1 font-mono">
                          <i-lucide name="x-circle" class="w-3.5 h-3.5 text-rose-600"></i-lucide>
                          {{ getFechaResolucion(env) }}
                        </span>
                        <span class="text-[11px] text-rose-700 font-black font-mono">
                          {{ getHoraResolucion(env) || '10:15' }}
                        </span>
                        <span class="px-2 py-0.5 mt-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          ✕ Rechazado
                        </span>
                      </div>
                    } @else {
                      <div class="inline-flex flex-col items-center text-slate-400">
                        <span class="text-xs font-medium italic text-slate-400">Pendiente</span>
                        <span class="text-[10px] text-slate-400">En ruta</span>
                      </div>
                    }
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    @if (env.estado === 'ENVIADO' && puedeAccionesEnvio(env)) {
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="abrirModalConfirmacion(env)"
                          class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
                          <i-lucide name="check" class="w-3.5 h-3.5"></i-lucide>
                          <span>Confirmar</span>
                        </button>
                        <button
                          type="button"
                          (click)="abrirModalRechazo(env)"
                          class="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
                          <i-lucide name="x" class="w-3.5 h-3.5"></i-lucide>
                          <span>Rechazar</span>
                        </button>
                      </div>
                    } @else if (env.estado === 'ENVIADO') {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <i-lucide name="truck" class="w-3.5 h-3.5"></i-lucide>
                        <span>En tránsito · Esperando aceptación</span>
                      </span>
                    } @else if (env.estado === 'RECIBIDO') {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <i-lucide name="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                        <span>Recepción Verificada (En Stock)</span>
                      </span>
                    } @else if (env.estado === 'RECHAZADO') {
                      <div class="inline-flex flex-col items-end gap-1 text-right">
                        <span class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          <i-lucide name="alert-circle" class="w-3.5 h-3.5 text-rose-600"></i-lucide>
                          <span>Rechazado por Agencia</span>
                        </span>
                        @if (env.motivoRechazo || env.observaciones) {
                          <span class="text-[11px] font-medium text-rose-900 bg-rose-50 px-2 py-1 rounded-md border border-rose-200/90 max-w-xs text-left">
                            💬 <b>Razón:</b> {{ env.motivoRechazo || env.observaciones }}
                          </span>
                        }
                      </div>
                    } @else {
                      <span class="text-[11px] text-slate-400 italic">Esperando despacho</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="py-12 text-center text-slate-400 text-xs font-medium">
                    {{ isLiderOperador ? 'No hay envíos registrados para tu agencia en este momento.' : 'No hay envíos registrados.' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL RECHAZO -->
      <app-modal
        [isOpen]="modalRechazoOpen"
        title="Rechazar Envío / Reportar No Conformidad"
        icon="alert-triangle"
        (close)="modalRechazoOpen = false">
        @if (envioSeleccionadoRechazo) {
          <div class="space-y-4">
            <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
              <i-lucide name="alert-triangle" class="w-4 h-4 text-rose-600 shrink-0 mt-0.5"></i-lucide>
              <div>
                <p class="font-bold">¿Deseas reportar disconformidad para el envío {{ envioSeleccionadoRechazo.codigoEnvio }}?</p>
                <p class="text-[11px] text-rose-700 mt-0.5">
                  El despacho se marcará como rechazado y se liberará la reserva de stock en el origen (el físico no se había descontado).
                </p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">Motivos rápidos</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
                @for (m of motivosFrecuentes; track m) {
                  <button
                    type="button"
                    (click)="seleccionarMotivoRapido(m)"
                    class="p-2 text-left rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                    [ngClass]="motivoRechazoTexto === m ? 'bg-rose-100 border-rose-400 text-rose-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'">
                    {{ m }}
                  </button>
                }
              </div>

              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Detalle u Observaciones del Rechazo</label>
              <textarea
                [(ngModel)]="motivoRechazoTexto"
                rows="3"
                placeholder="Indique la causa detallada (ej. Transporte nunca llegó a la sede, derrame del bidón, etc.)..."
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

      <!-- MODAL CONFIRMAR RECEPCIÓN (permite parcial + observación) -->
      <app-modal
        [isOpen]="modalConfirmacionOpen"
        title="Confirmar Recepción"
        icon="check-circle"
        (close)="modalConfirmacionOpen = false">
        @if (envioSeleccionadoConfirmacion) {
          <div class="space-y-3 text-xs">
            <p class="text-slate-600">
              Guía <b>{{ envioSeleccionadoConfirmacion.codigoEnvio }}</b> → {{ envioSeleccionadoConfirmacion.sucursalNombre }}.
              Puedes recibir menos de lo enviado; si es parcial, la observación es obligatoria.
            </p>
            <div class="space-y-2">
              @for (p of envioSeleccionadoConfirmacion.productos || []; track $index) {
                <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-bold text-slate-800 truncate">{{ p.nombreProducto }}</p>
                    <p class="text-[10px] text-slate-500">Enviado: {{ p.cantidad }} und</p>
                  </div>
                  <div class="shrink-0">
                    <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Recibido (und)</label>
                    <input
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
              <label class="block font-bold text-slate-700 mb-1">
                Observación
                @if (esRecepcionParcial) {
                  <span class="text-rose-600">(obligatoria por recepción parcial)</span>
                }
              </label>
              <textarea
                [(ngModel)]="observacionRecepcion"
                name="obsRecepcion"
                rows="2"
                class="w-full p-2.5 rounded-xl border border-slate-200"
                [placeholder]="esRecepcionParcial ? 'Explica la diferencia de cantidades...' : 'Opcional'"></textarea>
            </div>
          </div>
        }
        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalConfirmacionOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            (click)="ejecutarConfirmacionRecepcion()"
            [disabled]="esRecepcionParcial && !observacionRecepcion.trim()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer">
            Confirmar Ingreso
          </button>
        </div>
      </app-modal>

      <!-- MODAL CREAR ENVÍO -->
      <app-modal
        [isOpen]="modalCrearEnvioOpen"
        title="Crear y Despachar Envío de Suministros"
        icon="send"
        (close)="modalCrearEnvioOpen = false">
        <form (ngSubmit)="guardarNuevoEnvio()" class="space-y-4">
          
          <!-- Banner Informativo de Origen -->
          <div class="p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold"
            [ngClass]="isAsistenteBodega ? 'bg-teal-50 border-teal-200 text-teal-900' : (isLiderOperador ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-blue-50 border-blue-200 text-blue-900')">
            <i-lucide name="warehouse" class="w-4 h-4 shrink-0" [ngClass]="isAsistenteBodega ? 'text-teal-600' : (isLiderOperador ? 'text-purple-600' : 'text-easydry-blue')"></i-lucide>
            <div>
              <span>Origen (tu stock): </span>
              <span class="font-extrabold">
                {{ isLiderOperador ? ('Sucursal ' + liderSucursalNombre) : (isAsistenteBodega ? ('Bodega Regional ' + (miRegionNombre || miBodegaNombre || 'Asignada')) : (miBodegaNombre || 'Bodega Central Nacional')) }}
              </span>
              <span *ngIf="isAsistenteBodega || isLiderOperador" class="block text-[10px] font-normal mt-0.5 opacity-80">
                {{ isLiderOperador
                  ? 'Alcance: solo otras agencias y pulidores de tu región.'
                  : 'Alcance: agencias, pulidores y otras bodegas de tu región.' }}
              </span>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              {{ isLiderOperador ? 'Destino (Agencia o Pulidor) *' : 'Destino (Agencia, Bodega o Pulidor) *' }}
            </label>
            <select
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

              <optgroup *ngIf="!isLiderOperador && bodegasDestinoDisponibles.length > 0" label="Bodegas">
                @for (bod of bodegasDestinoDisponibles; track bod.id) {
                  <option [value]="'BOD:' + bod.id">{{ bod.nombre }} ({{ bod.ciudad }})</option>
                }
              </optgroup>

              <optgroup *ngIf="pulidoresDisponibles.length > 0" label="Pulidores">
                @for (p of pulidoresDisponibles; track p.id) {
                  <option [value]="'PUL:' + p.id">{{ p.nombre }}</option>
                }
              </optgroup>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Insumo Principal *</label>
            <select
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

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad (unidades) *</label>
              <input
                type="number"
                [(ngModel)]="nuevoEnvioForm.cantidad"
                name="cantidad"
                min="1"
                step="1"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-easydry-blue"
                required>
              <p class="text-[10px] text-slate-500 mt-1">Unidades completas (envases). Igual para agencia, pulidor o bodega.</p>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridad / Observación</label>
              <input
                type="text"
                [(ngModel)]="nuevoEnvioForm.observacion"
                name="obs"
                placeholder="Ej. Suministro periódico de químicos"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-easydry-blue">
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
            [disabled]="!nuevoEnvioForm.sucursalId || !nuevoEnvioForm.insumoId || !nuevoEnvioForm.cantidad || nuevoEnvioForm.cantidad <= 0"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50">
            Despachar Envío
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class EnviosComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toastService = inject(ToastService);
  private sucursalService = inject(SucursalService);
  private inventarioService = inject(InventarioService);

  get isLiderOperador(): boolean {
    return this.auth.isLiderOperador();
  }

  get liderSucursalNombre(): string {
    const u = this.auth.getCurrentUser();
    return u?.sucursalNombre || u?.sucursal || (u as any)?.agencia || 'Mi Agencia';
  }

  get puedeDespachar(): boolean {
    // Envíos es solo confirmación/seguimiento. La creación de despachos vive en Inventario.
    return false;
  }

  get isAsistenteBodega(): boolean {
    const rol = (this.auth.getCurrentUser()?.role || '').toUpperCase();
    return rol === 'ASISTENTE_BODEGA';
  }

  get isPulidor(): boolean {
    const rol = (this.auth.getCurrentUser()?.role || '').toUpperCase();
    return rol.includes('PULIDOR') || this.auth.getCurrentUser()?.role === Role.PULIDOR;
  }

  get isCoordBodega(): boolean {
    const rol = (this.auth.getCurrentUser()?.role || '').toUpperCase();
    return rol === 'COORD_BODEGA' || rol === 'DISTRIBUIDOR';
  }

  get miRegionNombre(): string {
    const user = this.auth.getCurrentUser();
    return (user?.region || (user as any)?.regionNombre || '').trim();
  }

  get miBodegaNombre(): string {
    const user = this.auth.getCurrentUser();
    return ((user as any)?.bodegaNombre || user?.sucursalNombre || user?.sucursal || (user as any)?.agencia || 'Bodega').trim();
  }

  /** Solo el receptor del destino o el Super Admin pueden confirmar/rechazar. */
  puedeAccionesEnvio(env: EnvioSuministro): boolean {
    const user = this.auth.getCurrentUser();
    const role = (user?.role || '').toUpperCase();
    if (this.auth.isSuperAdmin() || role === 'SUPER_ADMIN' || (role.includes('SUPER') && role.includes('ADMIN'))) {
      return true;
    }
    if ((env as any).puedeConfirmar) return true;
    if (env.estado === 'ENVIADO' || env.estado === 'PENDIENTE') {
      const destPulId = (env as any).destinoPulidorId || (env as any).usuarioRecibeId;
      if (user?.id && destPulId && String(destPulId) === String(user.id)) {
        return true;
      }
    }
    return false;
  }

  // Filtros
  filtroTexto = '';
  filtroEstado = 'Todos';
  filtroSucursal = 'Todas';

  // Catálogos dinámicos
  sucursalesDisponibles: Sucursal[] = [];
  bodegasDisponibles: BodegaInventario[] = [];
  bodegasDestinoDisponibles: BodegaInventario[] = [];
  pulidoresDisponibles: Array<{ id: string; nombre: string }> = [];
  insumosDisponibles: InventarioItem[] = [];

  // Modales
  modalRechazoOpen = false;
  modalCrearEnvioOpen = false;
  modalConfirmacionOpen = false;
  envioSeleccionadoRechazo: EnvioSuministro | null = null;
  envioSeleccionadoConfirmacion: EnvioSuministro | null = null;
  motivoRechazoTexto = '';
  observacionRecepcion = '';
  cantidadesRecepcion: number[] = [];

  get esRecepcionParcial(): boolean {
    const env = this.envioSeleccionadoConfirmacion;
    if (!env?.productos?.length) return false;
    return env.productos.some((p, i) => Number(this.cantidadesRecepcion[i] ?? p.cantidad) < Number(p.cantidad));
  }

  motivosFrecuentes: string[] = [
    'Transporte nunca llegó a la agencia',
    'Producto averiado / derrame en tránsito',
    'Insumo equivocado / no corresponde al pedido',
    'Empaque violentado / faltante de unidades'
  ];

  nuevoEnvioForm = {
    sucursalId: '' as string | number,
    sucursalNombre: '',
    insumoId: '' as string | number,
    insumoNombre: '',
    cantidad: 1,
    observacion: ''
  };

  envios: EnvioSuministro[] = [];

  get enviosRechazados(): EnvioSuministro[] {
    return this.envios.filter(e => e.estado === 'RECHAZADO');
  }

  get countEnCamino(): number {
    return this.enviosFiltrados.filter(e => e.estado === 'ENVIADO' || e.estado === 'PENDIENTE').length;
  }

  get countRecibidos(): number {
    return this.enviosFiltrados.filter(e => e.estado === 'RECIBIDO').length;
  }

  get countRechazados(): number {
    return this.enviosFiltrados.filter(e => e.estado === 'RECHAZADO').length;
  }

  ngOnInit(): void {
    this.cargarEnvios();
    this.sucursalService.getSucursales().subscribe(sucs => {
      const user = this.auth.getCurrentUser();
      const rol = (user?.role || '').toUpperCase();
      const esAsistenteBodega = rol === 'ASISTENTE_BODEGA' || (rol.includes('ASISTENTE') && rol.includes('BODEGA'));
      const userRegion = (user?.region || (user as any)?.regionNombre || '').toLowerCase().trim();

      if (esAsistenteBodega && userRegion) {
        this.sucursalesDisponibles = (sucs || []).filter(s => 
          (s.regionNombre && s.regionNombre.toLowerCase().includes(userRegion)) ||
          (s.ciudad && s.ciudad.toLowerCase().includes(userRegion)) ||
          (s.regionId && user?.regionId && String(s.regionId) === String(user.regionId))
        );
      } else {
        // Gestor de Bodega (COORD_BODEGA) y Admin: ve todas las sucursales sin importar región ni marcas
        this.sucursalesDisponibles = sucs || [];
      }
    });

    this.inventarioService.getBodegas().subscribe(bodegas => {
      this.bodegasDisponibles = bodegas || [];
      const user = this.auth.getCurrentUser();
      const rol = (user?.role || '').toUpperCase();
      const esAsistenteBodega = rol === 'ASISTENTE_BODEGA' || (rol.includes('ASISTENTE') && rol.includes('BODEGA'));
      const userRegion = (user?.region || (user as any)?.regionNombre || '').toLowerCase().trim();
      const miBodegaId = String((user as any)?.bodegaId || '');

      // Líder: solo agencias y pulidores de su región (no bodegas)
      if (this.auth.isLiderOperador()) {
        this.bodegasDestinoDisponibles = [];
        return;
      }

      let destinos = this.bodegasDisponibles.filter(b => String(b.id) !== miBodegaId);
      if (esAsistenteBodega && userRegion) {
        destinos = destinos.filter(b =>
          !b.esCentral && (b.region && b.region.toLowerCase().includes(userRegion))
        );
      }
      this.bodegasDestinoDisponibles = destinos;
    });

    this.inventarioService.getItems().subscribe(items => {
      this.insumosDisponibles = items || [];
    });

    const user = this.auth.getCurrentUser();
    this.http.post<any[]>(apiUrl('/operaciones/servicios-especiales/pulidores'), {
      regionId: user?.regionId || undefined
    }).pipe(catchError(() => of([]))).subscribe((list) => {
      this.pulidoresDisponibles = (list || []).map((p: any) => ({
        id: String(p.id),
        nombre: `${p.name || p.nombre || ''} ${p.lastname || p.apellido || ''}`.trim() || p.email || p.id,
      }));
    });
  }

  seleccionarMotivoRapido(motivo: string): void {
    this.motivoRechazoTexto = motivo;
  }

  cargarEnvios(): void {
    const user = this.auth.getCurrentUser();
    const rol = (user?.role || '').toUpperCase();
    const isLider = this.auth.isLiderOperador();
    const isPulidor = this.isPulidor;
    const verTodas = !isLider && !isPulidor && (rol === 'SUPER_ADMIN' || rol === 'ADMIN' || rol === 'DISTRIBUIDOR' || rol === 'COORD_BODEGA' || rol === 'ASISTENTE_BODEGA' || (rol as any) === Role.COORD_BODEGA);
    const payload = isPulidor
      ? { pulidorId: user?.id }
      : (verTodas ? {} : { sucursalId: user?.agenciaId || user?.sucursalNombre || user?.sucursal });

    this.http.post<any[]>(apiUrl('/inventario/despachos/list'), payload).pipe(
      catchError((err) => {
        console.error('Error listando despachos:', err);
        return of([]);
      })
    ).subscribe(items => {
      this.envios = (items || []).map(m => this.mapBackendDespacho(m));
    });
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
      detalles: (m.detalles || []).map((d: any) => ({ id: d.id, detalleId: d.id, cantidadEnviada: d.cantidadEnviada })),
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

  get enviosFiltrados(): EnvioSuministro[] {
    const user = this.auth.getCurrentUser();
    const rol = (user?.role || '').toUpperCase();
    const isLider = this.auth.isLiderOperador();
    const isGestorGlobal = rol === 'SUPER_ADMIN' || rol === 'ADMIN' || rol === 'DISTRIBUIDOR' || rol === 'COORD_BODEGA';
    const isAsistenteBodega = rol === 'ASISTENTE_BODEGA' || (rol.includes('ASISTENTE') && rol.includes('BODEGA'));
    const userRegion = (user?.region || (user as any)?.regionNombre || '').toLowerCase().trim();
    const userSucursal = (user?.sucursalNombre || user?.sucursal || (user as any)?.agencia || '').toLowerCase().trim();

    return this.envios.filter(env => {
      let matchPermisoRol: boolean = isGestorGlobal;
      if (!matchPermisoRol && isAsistenteBodega) {
        // Asistente de Bodega: ve únicamente sus propios envíos o los de su bodega / región asignada
        const matchPropio = Boolean(
          (user?.nombre && env.responsableEnvio && env.responsableEnvio.toLowerCase().includes(user.nombre.toLowerCase())) ||
          (user?.id && env.responsableEnvio && env.responsableEnvio.includes(String(user.id)))
        );
        const matchRegion = userRegion ? Boolean(
          (env.ciudad && env.ciudad.toLowerCase().includes(userRegion)) ||
          (this.sucursalesDisponibles.length > 0 && env.sucursalNombre && this.sucursalesDisponibles.some(s => s.nombre.toLowerCase() === env.sucursalNombre.toLowerCase())) ||
          (env.observaciones && env.observaciones.toLowerCase().includes(userRegion))
        ) : false;
        const matchBodega = userSucursal ? Boolean(
          (env.observaciones && env.observaciones.toLowerCase().includes(userSucursal)) ||
          (env.sucursalNombre && env.sucursalNombre.toLowerCase().includes(userSucursal))
        ) : false;

        matchPermisoRol = matchPropio || matchRegion || matchBodega;
      } else if (!matchPermisoRol && this.isPulidor) {
        // Pulidor: ve envíos asignados a su persona (recibidos o en tránsito)
        const destPulId = (env as any).destinoPulidorId || (env as any).usuarioRecibeId;
        const matchId = Boolean(user?.id && destPulId && String(destPulId) === String(user.id));
        const matchNombre = Boolean(
          user?.nombre && env.responsableRecepcion && env.responsableRecepcion.toLowerCase().includes(user.nombre.toLowerCase())
        );
        const matchSucursal = Boolean(
          user?.nombre && env.sucursalNombre && env.sucursalNombre.toLowerCase().includes(user.nombre.toLowerCase())
        );
        matchPermisoRol = matchId || matchNombre || matchSucursal;
      } else if (!matchPermisoRol) {
        // Líder Operador: solo recepciones / despachos de su sede y región
        matchPermisoRol = Boolean(
          (user?.agenciaId && String(env.sucursalId) === String(user.agenciaId)) ||
          (userSucursal && (env.sucursalNombre.toLowerCase().includes(userSucursal) || userSucursal.includes(env.sucursalNombre.toLowerCase())))
        );
      }

      const matchTexto = !this.filtroTexto.trim() ||
        env.codigoEnvio.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        env.sucursalNombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (env.productos || []).some(p => p.nombreProducto.toLowerCase().includes(this.filtroTexto.toLowerCase())) ||
        env.ciudad.toLowerCase().includes(this.filtroTexto.toLowerCase());

      const matchEstado = this.filtroEstado === 'Todos' || env.estado === this.filtroEstado;

      const matchSucursalFiltro = this.filtroSucursal === 'Todas' || env.sucursalNombre === this.filtroSucursal;

      return matchPermisoRol && matchTexto && matchEstado && matchSucursalFiltro;
    });
  }

  aplicarNuevosFiltros(filtros: any): void {
    this.filtroTexto = filtros.busqueda || '';
    this.filtroEstado = filtros.estado || 'Todos';
    this.filtroSucursal = filtros.sucursal || 'Todas';
  }

  abrirModalCrearEnvio(): void {
    if (!this.puedeDespachar) {
      this.toastService.warning(
        'Sin permiso',
        'Admin / Super Admin no pueden generar envíos. Solo coordinadores, asistentes de bodega o líderes.'
      );
      return;
    }
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
        'Admin / Super Admin no pueden generar envíos.'
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

    const origenLabel = this.isLiderOperador
      ? `Sucursal ${this.liderSucursalNombre}`
      : this.isAsistenteBodega
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
      this.cargarEnvios();
    });
  }

  abrirModalConfirmacion(env: EnvioSuministro): void {
    this.envioSeleccionadoConfirmacion = env;
    this.observacionRecepcion = '';
    this.cantidadesRecepcion = (env.productos || []).map((p) => Number(p.cantidad) || 0);
    this.modalConfirmacionOpen = true;
  }

  ejecutarConfirmacionRecepcion(): void {
    const env = this.envioSeleccionadoConfirmacion;
    if (!env) return;
    if (this.esRecepcionParcial && !this.observacionRecepcion.trim()) {
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

    const body: any = {
      movimientoId: String(env.id),
      agenciaId: String(agenciaId),
      sucursalId: String(agenciaId),
      accion: 'RECIBIDO',
      observaciones: this.observacionRecepcion.trim() || undefined,
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
        this.cargarEnvios();
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
    this.envioSeleccionadoRechazo = env;
    this.motivoRechazoTexto = '';
    this.modalRechazoOpen = true;
  }

  confirmarRechazoEnvio(): void {
    if (!this.envioSeleccionadoRechazo || !this.motivoRechazoTexto.trim()) return;

    const env = this.envioSeleccionadoRechazo;
    const motivo = this.motivoRechazoTexto.trim();
    const user = this.auth.getCurrentUser();
    const agenciaId = env.sucursalId || user?.agenciaId || user?.sucursalNombre || user?.sucursal || '';

    this.http.post<any>(apiUrl('/inventario/despachos/rechazar'), {
      movimientoId: String(env.id),
      agenciaId: String(agenciaId),
      motivo,
      observaciones: motivo
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
        this.modalRechazoOpen = false;

        this.toastService.warning(
          'Envío Rechazado',
          `Se registró disconformidad para ${env.codigoEnvio}: ${motivo}. Se liberó la reserva en el origen.`
        );
        this.cargarEnvios();
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

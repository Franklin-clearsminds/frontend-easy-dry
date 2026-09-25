import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import {
  Incidente, Mantenimiento, MaquinaFicha, MaquinariaEvento, MovimientoMaquinaria,
  TIPOS_EVENTO_MAQUINARIA, etiquetaEventoMaquinaria, colorEventoMaquinaria,
} from '../../../core/models';
import { MaquinariaService } from '../../../core/services/maquinaria.service';
import { IncidenteService } from '../../../core/services/incidente.service';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { MovimientoMaquinariaService } from '../../../core/services/movimiento-maquinaria.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { VisorArchivoComponent } from '../../../shared/components/visor-archivo/visor-archivo.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { EvidenciaGaleriaComponent } from '../../../shared/components/evidencia-galeria/evidencia-galeria.component';
import { ThumbSrcDirective } from '../../../shared/directives/thumb-src.directive';
import { TrabajoAccionesComponent, mensajeError } from '../trabajo-acciones/trabajo-acciones.component';
import { MaquinaAccionesComponent } from '../maquina-acciones/maquina-acciones.component';
import { fechaHoraLocal, fechaProgramadaLocal } from '../../../core/utils/evidencia-maquinaria';
import {
  esOperadorMaquina, puedeEditarMaquina, puedeActivarMaquina, puedeGestionarMaquina,
  puedeVerTrazabilidad, puedeVerMantenimientos, puedeTrabajarOrden, ROLES_VER_MAQUINARIA,
} from '../../../core/utils/maquinaria-permisos';

export type PestanaMaquina = 'resumen' | 'incidencias' | 'movimientos' | 'mantenimientos' | 'timeline';

/** Línea resumida de un evento para la línea de tiempo. */
interface EventoVista {
  evento: MaquinariaEvento;
  etiqueta: string;
  color: string;
  lineas: string[];
  cambios: { campo: string; antes: string; despues: string }[];
}

/**
 * Modal de detalle de una máquina: Resumen, Incidencias, Movimientos, Mantenimientos y Línea de tiempo.
 * Reutilizable desde cualquier pantalla: `<app-maquinaria-detalle-modal [maquinariaId]="id" (cerrar)="id = null">`.
 * Se abre cuando `maquinariaId` tiene valor y emite `cambio` cuando algo se modificó (para que el host recargue).
 */
@Component({
  selector: 'app-maquinaria-detalle-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, LucideAngularModule, ModalComponent, EvidenciaGaleriaComponent, VisorArchivoComponent,
    ThumbSrcDirective, TrabajoAccionesComponent, MaquinaAccionesComponent,
  ],
  template: `
    <app-modal
      [isOpen]="maquinariaId !== null && maquinariaId !== undefined"
      [title]="ficha ? ('Máquina ' + ficha.codigo + ' — ' + ficha.nombre) : 'Detalle de máquina'"
      icon="hard-drive"
      sizeClass="max-w-5xl"
      (close)="fichaModalOpen ? null : cerrar.emit()">

      @if (cargando && !ficha) {
        <p class="text-sm text-slate-500 font-semibold py-8 text-center">Cargando ficha...</p>
      }
      @if (errorFicha) {
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ errorFicha }}</div>
      }

      @if (ficha) {
        <div class="space-y-5">
          <!-- Cabecera -->
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            @if (ficha.fotoUrl) {
              <img [appThumb]="ficha.fotoUrl" [alt]="ficha.nombre" class="w-full sm:w-44 h-32 object-cover rounded-2xl border border-slate-200 bg-slate-100">
            }
            <div class="flex-1 min-w-0 space-y-2">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-1 bg-easydry-blue text-white font-mono font-bold text-xs rounded-lg">{{ ficha.codigo }}</span>
                <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold" [ngClass]="claseEstado(ficha)">{{ etiquetaEstado(ficha) }}</span>
                @if (!ficha.activa) {
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">Dada de baja</span>
                }
                @if (ficha.incidentesNoAtendidos > 0) {
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-600 text-white">{{ ficha.incidentesNoAtendidos }} incidencia(s) no atendida(s)</span>
                }
                @if (ficha.mantenimientosVencidos > 0) {
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-600 text-white">{{ ficha.mantenimientosVencidos }} mantenimiento(s) vencido(s)</span>
                }
              </div>
              <p class="text-xs text-slate-600">{{ ficha.marca }} {{ ficha.modelo }} @if (ficha.serie) { · Serie {{ ficha.serie }} } @if (ficha.tipo) { · {{ ficha.tipo }} }</p>

              <!-- Acciones (según rol; el backend valida de nuevo) -->
              <div class="flex flex-wrap gap-2 pt-1">
                @if (puedeEditar) {
                  <button (click)="maquinaAcc.editar(ficha)" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer">
                    <i-lucide name="pencil" class="w-3.5 h-3.5"></i-lucide> Editar
                  </button>
                }
                @if (puedeActivar) {
                  @if (ficha.activa) {
                    <button (click)="maquinaAcc.cambiarActiva(ficha, false)" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer">
                      <i-lucide name="x-circle" class="w-3.5 h-3.5"></i-lucide> Dar de baja
                    </button>
                  } @else {
                    <button (click)="maquinaAcc.cambiarActiva(ficha, true)" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer">
                      <i-lucide name="check-circle-2" class="w-3.5 h-3.5"></i-lucide> Reactivar
                    </button>
                  }
                }
                @if (puedeGestionar) {
                  <button (click)="maquinaAcc.asignarOperador(ficha)" class="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer">
                    <i-lucide name="user-cog" class="w-3.5 h-3.5"></i-lucide> Asignar operador
                  </button>
                  <button (click)="maquinaAcc.configurarVentana(ficha)" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer">
                    <i-lucide name="timer" class="w-3.5 h-3.5"></i-lucide> Ventana de adelanto
                  </button>
                  <button (click)="maquinaAcc.transferir(ficha)" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer">
                    <i-lucide name="refresh-cw" class="w-3.5 h-3.5"></i-lucide> Transferir
                  </button>
                  @if (ficha.activa) {
                    <button (click)="trabajoAcc.programarMantenimiento(fichaComoMaquinaria(), [])" class="px-3 py-1.5 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer">
                      <i-lucide name="calendar-clock" class="w-3.5 h-3.5"></i-lucide> Programar mantenimiento
                    </button>
                  }
                }
                @if (puedeReportar) {
                  <button (click)="trabajoAcc.reportarIncidente(ficha)" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer">
                    <i-lucide name="alert-triangle" class="w-3.5 h-3.5"></i-lucide> Reportar incidencia
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Pestañas -->
          <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            @for (t of pestanas; track t.id) {
              <button type="button" (click)="cambiarPestana(t.id)"
                class="flex-1 min-w-fit py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                [ngClass]="pestana === t.id ? 'bg-white text-easydry-blue shadow-xs' : 'text-slate-500 hover:text-slate-700'">
                <i-lucide [name]="t.icono" class="w-4 h-4"></i-lucide>
                {{ t.label }}
                @if (t.id === 'incidencias' && ficha.incidentesNoAtendidos > 0) {
                  <span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold">{{ ficha.incidentesNoAtendidos }}</span>
                }
                @if (t.id === 'mantenimientos' && ficha.mantenimientosVencidos > 0) {
                  <span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold">{{ ficha.mantenimientosVencidos }}</span>
                }
              </button>
            }
          </div>

          <!-- ================= RESUMEN ================= -->
          @if (pestana === 'resumen') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <h4 class="font-bold text-slate-900 uppercase text-xs border-b border-slate-200 pb-2">Estado y ubicación</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Estado operativo</span><span class="font-bold text-slate-800">{{ etiquetaEstado(ficha) }}</span></div>
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Activa</span><span class="font-bold" [ngClass]="ficha.activa ? 'text-emerald-700' : 'text-rose-700'">{{ ficha.activa ? 'Sí' : 'No (de baja)' }}</span></div>
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Agencia / ubicación</span><span class="font-bold text-slate-800">{{ ficha.agenciaNombre || 'Sin agencia' }}@if (esTaller) { <span class="text-amber-700"> (Taller)</span> }</span></div>
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Bahía</span><span class="font-bold text-slate-800">{{ ficha.bahiaNombre || 'Sin bahía' }}</span></div>
                </div>
                @if (!ficha.activa) {
                  <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <p class="font-bold text-rose-800">Motivo de la baja</p>
                    <p class="text-rose-700">{{ ficha.motivoDesactivacion || '—' }}</p>
                    <p class="text-[10px] text-rose-600">{{ ficha.desactivadoPor?.nombre || '—' }} · {{ hora(ficha.fechaDesactivacion) }}</p>
                  </div>
                }
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <h4 class="font-bold text-slate-900 uppercase text-xs border-b border-slate-200 pb-2">Responsables</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Operador asignado</span><span class="font-bold text-slate-800">{{ ficha.operadorAsignado?.nombre || 'Sin asignar' }}</span></div>
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Creada por</span><span class="font-bold text-slate-800">{{ ficha.creadoPor?.nombre || '—' }}</span></div>
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Fecha de creación</span><span class="font-mono text-slate-700">{{ hora(ficha.creadaEn) }}</span></div>
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Horas de uso</span><span class="font-mono text-slate-700">{{ ficha.horasUso || 0 }}</span></div>
                </div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <h4 class="font-bold text-slate-900 uppercase text-xs border-b border-slate-200 pb-2">Mantenimiento</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Ventana de adelanto</span>
                    <span class="font-bold text-slate-800">{{ ficha.ventanaAdelantoDias }} día(s)@if (ficha.ventanaAdelantoDias >= 7) { <span class="text-slate-500 font-semibold"> (~{{ ficha.ventanaAdelantoDias / 7 | number:'1.0-1' }} sem)</span> }</span></div>
                  <div><span class="block text-[10px] text-slate-400 font-bold uppercase">Próximo mantenimiento</span>
                    @if (ficha.proximoMantenimiento) {
                      <span class="font-bold text-slate-800">{{ fechaProg(ficha.proximoMantenimiento.fechaProgramada) }}</span>
                      <span class="block text-[10px] text-slate-500">{{ ficha.proximoMantenimiento.tipo }} · {{ ficha.proximoMantenimiento.estado }}</span>
                    } @else { <span class="font-bold text-slate-500">Sin programar</span> }
                  </div>
                </div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <h4 class="font-bold text-slate-900 uppercase text-xs border-b border-slate-200 pb-2">Pendientes y totales</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-2 rounded-xl" [ngClass]="ficha.incidentesNoAtendidos > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-white border border-slate-200'">
                    <span class="block text-[10px] text-slate-400 font-bold uppercase">Incidencias no atendidas</span>
                    <span class="text-lg font-extrabold" [ngClass]="ficha.incidentesNoAtendidos > 0 ? 'text-rose-700' : 'text-slate-800'">{{ ficha.incidentesNoAtendidos }}</span>
                  </div>
                  <div class="p-2 rounded-xl" [ngClass]="ficha.mantenimientosVencidos > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-white border border-slate-200'">
                    <span class="block text-[10px] text-slate-400 font-bold uppercase">Mantenimientos vencidos</span>
                    <span class="text-lg font-extrabold" [ngClass]="ficha.mantenimientosVencidos > 0 ? 'text-rose-700' : 'text-slate-800'">{{ ficha.mantenimientosVencidos }}</span>
                  </div>
                </div>
                <p class="text-slate-600">Totales históricos: <strong>{{ ficha.totales.incidentes }}</strong> incidencias · <strong>{{ ficha.totales.mantenimientos }}</strong> mantenimientos · <strong>{{ ficha.totales.movimientos }}</strong> movimientos</p>
                @if (ficha.fichaTecnicaUrl) {
                  <button (click)="abrirFichaTecnica()" class="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-easydry-blue font-bold rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer">
                    <i-lucide name="file-text" class="w-3.5 h-3.5"></i-lucide> Ver ficha técnica
                  </button>
                }
              </div>
            </div>
          }

          <!-- ================= INCIDENCIAS ================= -->
          @if (pestana === 'incidencias') {
            @if (cargandoLista) { <p class="text-xs text-slate-500 font-semibold">Cargando incidencias...</p> }
            @if (errorLista) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ errorLista }}</div> }
            @if (!cargandoLista && incidencias.length === 0 && !errorLista) {
              <p class="text-xs text-slate-400 font-semibold text-center py-6">Esta máquina no tiene incidencias registradas.</p>
            }
            <div class="space-y-3">
              @for (inc of incidencias; track inc.id) {
                <div class="rounded-2xl border p-4 space-y-2"
                  [ngClass]="inc.noAtendida ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 bg-white'">
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-mono font-extrabold text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{{ inc.codigoIncidente }}</span>
                        @if (inc.noAtendida) {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">No atendida</span>
                        }
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold" [ngClass]="claseGravedad(inc.gravedadRaw)">{{ inc.prioridad }}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold" [ngClass]="claseEstadoIncidente(inc)">{{ inc.estado }}</span>
                      </div>
                      <p class="font-bold text-sm mt-1" [ngClass]="inc.noAtendida ? 'text-rose-800' : 'text-slate-900'">{{ inc.tipo }}</p>
                      <p class="text-[11px] text-slate-500">Reportada {{ hora(inc.fechaReporteIso) }} por {{ inc.reportadoPor }} · Técnico: {{ inc.tecnicoAsignadoId ? inc.tecnicoAsignadoNombre : 'Sin asignar' }}</p>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <button (click)="alternarIncidencia(inc)" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] cursor-pointer">{{ incExpandida === inc.id ? 'Ocultar' : 'Ver detalle' }}</button>
                      @if (puedeAsignarInc(inc)) {
                        <button (click)="trabajoAcc.asignarIncidente(inc)" class="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-[11px] cursor-pointer">{{ inc.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}</button>
                      }
                      @if (puedeResolverInc(inc)) {
                        <button (click)="trabajoAcc.resolverIncidente(inc)" class="px-2.5 py-1.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-lg text-[11px] cursor-pointer">Resolver</button>
                      }
                      @if (puedeEditarInc(inc)) {
                        <button (click)="trabajoAcc.editarIncidente(inc)" class="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer">Editar</button>
                      }
                      @if (puedeAgregarEvidencia) {
                        <button (click)="trabajoAcc.agregarEvidencia('INCIDENTE', inc)" class="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer">+ Evidencia</button>
                      }
                    </div>
                  </div>
                  @if (incExpandida === inc.id) {
                    <div class="pt-2 border-t border-slate-200/70 space-y-3 text-xs">
                      <p class="text-slate-700"><strong>Descripción:</strong> {{ inc.descripcion }}</p>
                      @if (inc.destinoTallerNombre) { <p class="text-slate-700"><strong>Taller destino:</strong> {{ inc.destinoTallerNombre }}</p> }
                      @if (inc.observacionSolucion) { <p class="text-slate-700"><strong>Solución:</strong> {{ inc.observacionSolucion }} @if (inc.solucionadoPor) { <span class="text-slate-500">({{ inc.solucionadoPor }}, {{ inc.fechaSolucion }})</span> }</p> }
                      <app-evidencia-galeria [evidencias]="inc.evidencias || []" [agruparPorEtapa]="true"></app-evidencia-galeria>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- ================= MOVIMIENTOS ================= -->
          @if (pestana === 'movimientos') {
            @if (cargandoLista) { <p class="text-xs text-slate-500 font-semibold">Cargando movimientos...</p> }
            @if (errorLista) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ errorLista }}</div> }
            @if (!cargandoLista && movimientos.length === 0 && !errorLista) {
              <p class="text-xs text-slate-400 font-semibold text-center py-6">Esta máquina no tiene movimientos registrados.</p>
            }
            @if (movimientos.length > 0) {
              <div class="overflow-x-auto rounded-2xl border border-slate-200">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr><th class="py-2.5 px-3">Fecha y hora</th><th class="py-2.5 px-3">Responsable</th><th class="py-2.5 px-3">Origen</th><th class="py-2.5 px-3">Destino</th><th class="py-2.5 px-3">Motivo</th></tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (mv of movimientos; track mv.id) {
                      <tr>
                        <td class="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{{ mv.fecha }}</td>
                        <td class="py-2.5 px-3 font-semibold text-slate-800">{{ mv.usuarioResponsable || '—' }}</td>
                        <td class="py-2.5 px-3">{{ mv.sucursalAnterior || '—' }} <span class="text-slate-400">/ {{ mv.bahiaAnterior || 'Sin bahía' }}</span></td>
                        <td class="py-2.5 px-3 font-semibold text-easydry-blue">{{ mv.sucursalNueva || '—' }} <span class="text-slate-400 font-normal">/ {{ mv.bahiaNueva || 'Sin bahía' }}</span></td>
                        <td class="py-2.5 px-3 text-slate-600">{{ mv.motivo || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }

          <!-- ================= MANTENIMIENTOS ================= -->
          @if (pestana === 'mantenimientos') {
            @if (cargandoLista) { <p class="text-xs text-slate-500 font-semibold">Cargando mantenimientos...</p> }
            @if (errorLista) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ errorLista }}</div> }
            @if (!cargandoLista && mantenimientos.length === 0 && !errorLista) {
              <p class="text-xs text-slate-400 font-semibold text-center py-6">Esta máquina no tiene mantenimientos registrados.</p>
            }
            <div class="space-y-3">
              @for (m of mantenimientos; track m.id) {
                <div class="rounded-2xl border p-4 space-y-2"
                  [ngClass]="m.noAtendido ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 bg-white'">
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        @if (m.noAtendido) {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">No atendido</span>
                        }
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold" [ngClass]="claseEstadoMant(m)">{{ m.estado }}</span>
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">{{ m.tipo }}</span>
                      </div>
                      <p class="font-bold text-sm mt-1" [ngClass]="m.noAtendido ? 'text-rose-800' : 'text-slate-900'">Programado: {{ fechaProg(m.fechaProgramada) }}</p>
                      <p class="text-[11px] text-slate-500">
                        Técnico: {{ m.tecnicoAsignadoNombre || 'Sin asignar' }} · Creado por {{ m.creadoPorNombre || '—' }}
                        @if (m.fechaEjecucion) { · Ejecutado {{ hora(m.fechaEjecucion) }} por {{ m.ejecutadoPorNombre || '—' }} }
                      </p>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <button (click)="alternarMantenimiento(m)" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] cursor-pointer">{{ mantExpandido === m.id ? 'Ocultar' : 'Ver detalle' }}</button>
                      @if (puedeAsignarMant(m)) {
                        <button (click)="trabajoAcc.asignarMantenimiento(m)" class="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-[11px] cursor-pointer">{{ m.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}</button>
                      }
                      @if (puedeEjecutarMant(m)) {
                        <button (click)="trabajoAcc.ejecutarMantenimiento(m)" class="px-2.5 py-1.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-lg text-[11px] cursor-pointer">Ejecutar</button>
                      }
                      @if (puedeEditarMant(m)) {
                        <button (click)="trabajoAcc.editarMantenimiento(m)" class="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer">Editar</button>
                      }
                      @if (puedeAgregarEvidencia) {
                        <button (click)="trabajoAcc.agregarEvidencia('MANTENIMIENTO', m)" class="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer">+ Evidencia</button>
                      }
                    </div>
                  </div>
                  @if (mantExpandido === m.id) {
                    <div class="pt-2 border-t border-slate-200/70 space-y-3 text-xs">
                      <p class="text-slate-700"><strong>Observaciones:</strong> {{ m.descripcion || '—' }}</p>
                      @if (m.frecuenciaDias) { <p class="text-slate-700"><strong>Frecuencia:</strong> cada {{ m.frecuenciaDias }} días</p> }
                      @if (m.repuestosUtilizados?.length) { <p class="text-slate-700"><strong>Repuestos:</strong> {{ m.repuestosUtilizados!.join(', ') }}</p> }
                      <app-evidencia-galeria [evidencias]="m.evidencias || []"></app-evidencia-galeria>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- ================= LÍNEA DE TIEMPO ================= -->
          @if (pestana === 'timeline') {
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div class="flex flex-wrap gap-1.5">
                @for (t of tiposEvento; track t.codigo) {
                  <button type="button" (click)="alternarTipo(t.codigo)"
                    class="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer"
                    [ngClass]="tiposSeleccionados.has(t.codigo) ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'">
                    {{ t.label }}
                  </button>
                }
              </div>
              <div class="flex flex-wrap items-end gap-3">
                <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desde</label>
                  <input type="date" [(ngModel)]="filtroDesde" name="tl-desde" class="p-2 border rounded-lg text-xs bg-white"></div>
                <div><label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hasta</label>
                  <input type="date" [(ngModel)]="filtroHasta" name="tl-hasta" class="p-2 border rounded-lg text-xs bg-white"></div>
                <button (click)="cargarLinea(true)" class="px-3 py-2 bg-easydry-blue text-white font-bold rounded-lg text-xs cursor-pointer">Aplicar filtros</button>
                <button (click)="limpiarFiltrosLinea()" class="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer">Limpiar</button>
              </div>
            </div>

            @if (errorLista) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ errorLista }}</div> }
            @if (!cargandoLista && eventos.length === 0 && !errorLista) {
              <p class="text-xs text-slate-400 font-semibold text-center py-6">No hay eventos con los filtros seleccionados.</p>
            }

            <div class="relative pl-5 space-y-4">
              @for (ev of eventos; track ev.evento.id) {
                <div class="relative">
                  <span class="absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-slate-100" [ngClass]="ev.color"></span>
                  <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                      <p class="text-xs font-extrabold text-slate-900">{{ ev.etiqueta }}</p>
                      <p class="text-[11px] font-mono text-slate-500">{{ hora(ev.evento.ocurridoEn) }}</p>
                    </div>
                    <p class="text-[11px] text-slate-600">
                      Por <strong>{{ ev.evento.actor?.nombre || 'Sistema' }}</strong>@if (ev.evento.actor?.rol) { <span class="text-slate-400"> ({{ ev.evento.actor?.rol }})</span> }
                    </p>
                    @for (l of ev.lineas; track $index) { <p class="text-[11px] text-slate-700">{{ l }}</p> }
                    @if (ev.cambios.length > 0) {
                      <div class="mt-1 overflow-x-auto">
                        <table class="w-full text-[11px]">
                          <thead><tr class="text-slate-400 uppercase text-[9px] text-left"><th class="pr-3 py-1">Campo</th><th class="pr-3 py-1">Antes</th><th class="py-1">Después</th></tr></thead>
                          <tbody>
                            @for (c of ev.cambios; track c.campo) {
                              <tr class="border-t border-slate-100">
                                <td class="pr-3 py-1 font-bold text-slate-700">{{ c.campo }}</td>
                                <td class="pr-3 py-1 text-rose-700 line-through decoration-rose-300">{{ c.antes }}</td>
                                <td class="py-1 text-emerald-700 font-semibold">{{ c.despues }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            @if (cargandoLista) { <p class="text-xs text-slate-500 font-semibold">Cargando...</p> }
            @if (eventos.length < totalEventos) {
              <div class="text-center">
                <button (click)="cargarLinea(false)" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer">Cargar más ({{ eventos.length }} de {{ totalEventos }})</button>
              </div>
            }
          }
        </div>
      }

      <div modal-footer>
        <button (click)="cerrar.emit()" class="px-5 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer">Cerrar</button>
      </div>
    </app-modal>

    <!-- Diálogos de acciones (se abren por encima del modal) -->
    <!-- Ficha técnica: se ve en un modal sobre la misma página, con zoom y desplazamiento -->
    <app-visor-archivo
      [isOpen]="fichaModalOpen"
      [titulo]="'Ficha técnica' + (ficha ? ' — ' + ficha.codigo : '')"
      tipo="imagen"
      [url]="fichaUrl"
      [urlRespaldo]="fichaRespaldo"
      [cargando]="fichaCargando"
      [error]="fichaError"
      (cerrar)="fichaModalOpen = false">
    </app-visor-archivo>

    <app-maquina-acciones #maquinaAcc (hecho)="onAccionHecha($event)"></app-maquina-acciones>
    <app-trabajo-acciones #trabajoAcc (hecho)="onAccionHecha($event)"></app-trabajo-acciones>
  `,
})
export class MaquinariaDetalleModalComponent implements OnChanges {
  private maquinariaService = inject(MaquinariaService);
  private incidenteService = inject(IncidenteService);
  private mantenimientoService = inject(MantenimientoService);
  private movimientoService = inject(MovimientoMaquinariaService);
  private storage = inject(StorageUploadService);
  private authService = inject(AuthService);

  /** Id de la máquina a mostrar; con null/undefined el modal está cerrado. */
  @Input() maquinariaId: string | number | null | undefined = null;
  @Input() pestanaInicial: PestanaMaquina = 'resumen';
  @Output() cerrar = new EventEmitter<void>();
  /** Se emite cuando una acción cambió datos (para que el host recargue su lista). */
  @Output() cambio = new EventEmitter<void>();

  @ViewChild('trabajoAcc') trabajoAcc!: TrabajoAccionesComponent;
  @ViewChild('maquinaAcc') maquinaAcc!: MaquinaAccionesComponent;

  ficha: MaquinaFicha | null = null;
  cargando = false;
  errorFicha = '';
  pestana: PestanaMaquina = 'resumen';

  incidencias: Incidente[] = [];
  mantenimientos: Mantenimiento[] = [];
  movimientos: MovimientoMaquinaria[] = [];
  eventos: EventoVista[] = [];
  totalEventos = 0;
  cargandoLista = false;
  errorLista = '';
  incExpandida: string | number | null = null;
  mantExpandido: string | number | null = null;

  // Filtros de la línea de tiempo
  tiposEvento = TIPOS_EVENTO_MAQUINARIA;
  tiposSeleccionados = new Set<string>();
  filtroDesde = '';
  filtroHasta = '';
  private paginaLinea = 1;
  private readonly tamanoPaginaLinea = 30;

  // ---- Roles y permisos de UI (el backend valida siempre) ----
  private get rol(): string { return String(this.authService.getCurrentUser()?.role || ''); }
  private get miId(): string { return String(this.authService.getCurrentUser()?.id || ''); }
  private esMio(id?: string | number | null): boolean { return !!id && String(id) === this.miId; }

  get puedeEditar(): boolean { return puedeEditarMaquina(this.rol); }
  get puedeActivar(): boolean { return puedeActivarMaquina(this.rol); }
  get puedeGestionar(): boolean { return puedeGestionarMaquina(this.rol); }
  get puedeVerLinea(): boolean { return puedeVerTrazabilidad(this.rol); }
  get puedeVerMant(): boolean { return puedeVerMantenimientos(this.rol); }
  get puedeVerInc(): boolean { return ROLES_VER_MAQUINARIA.includes(this.rol) && this.rol !== 'COORD_BODEGA'; }
  get puedeAgregarEvidencia(): boolean { return this.puedeVerInc; }
  /** Reportar: solo pulidor/líder sobre máquinas asignadas a ellos (y activas). */
  get puedeReportar(): boolean {
    return esOperadorMaquina(this.rol) && !!this.ficha?.activa && this.esMio(this.ficha?.operadorAsignado?.id);
  }
  get esTaller(): boolean { return String(this.ficha?.agenciaTipo || '').startsWith('TALLER'); }

  get pestanas(): { id: PestanaMaquina; label: string; icono: string }[] {
    const lista: { id: PestanaMaquina; label: string; icono: string }[] = [{ id: 'resumen', label: 'Resumen', icono: 'clipboard-list' }];
    if (this.puedeVerInc) lista.push({ id: 'incidencias', label: 'Incidencias', icono: 'alert-triangle' });
    if (this.puedeVerLinea) lista.push({ id: 'movimientos', label: 'Movimientos', icono: 'refresh-cw' });
    if (this.puedeVerMant) lista.push({ id: 'mantenimientos', label: 'Mantenimientos', icono: 'calendar-clock' });
    if (this.puedeVerLinea) lista.push({ id: 'timeline', label: 'Línea de tiempo', icono: 'history' });
    return lista;
  }

  puedeAsignarInc(i: Incidente): boolean {
    return this.puedeGestionar && i.estadoRaw !== 'RESUELTO' && i.estadoRaw !== 'CANCELADO';
  }
  /** Técnico asignado, o coordinador/admin (que puede resolver una no asignada o una propia). */
  puedeResolverInc(i: Incidente): boolean {
    if (i.estadoRaw === 'RESUELTO' || i.estadoRaw === 'CANCELADO' || !puedeTrabajarOrden(this.rol)) return false;
    if (this.puedeGestionar) return !i.tecnicoAsignadoId || this.esMio(i.tecnicoAsignadoId);
    return this.esMio(i.tecnicoAsignadoId);
  }
  puedeEditarInc(i: Incidente): boolean {
    return puedeTrabajarOrden(this.rol) && (this.puedeGestionar || this.esMio(i.tecnicoAsignadoId));
  }
  puedeAsignarMant(m: Mantenimiento): boolean {
    return this.puedeGestionar && m.estadoRaw !== 'FINALIZADO';
  }
  puedeEjecutarMant(m: Mantenimiento): boolean {
    return m.estadoRaw !== 'FINALIZADO' && puedeTrabajarOrden(this.rol) && this.esMio(m.tecnicoAsignadoId);
  }
  puedeEditarMant(m: Mantenimiento): boolean {
    return puedeTrabajarOrden(this.rol) && (this.puedeGestionar || this.esMio(m.tecnicoAsignadoId));
  }

  // ---- Carga ----
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['maquinariaId']) {
      this.ficha = null;
      this.errorFicha = '';
      this.incidencias = [];
      this.mantenimientos = [];
      this.movimientos = [];
      this.eventos = [];
      this.totalEventos = 0;
      this.incExpandida = null;
      this.mantExpandido = null;
      this.limpiarFiltrosLinea(false);
      if (this.maquinariaId !== null && this.maquinariaId !== undefined && this.maquinariaId !== '') {
        this.pestana = 'resumen';
        void this.cargarFicha(true);
      }
    }
  }

  private async cargarFicha(inicial: boolean): Promise<void> {
    if (this.maquinariaId === null || this.maquinariaId === undefined) return;
    this.cargando = true;
    try {
      this.ficha = await firstValueFrom(this.maquinariaService.getDetalle(this.maquinariaId));
      this.errorFicha = '';
      if (inicial) {
        const permitida = this.pestanas.some(p => p.id === this.pestanaInicial);
        this.cambiarPestana(permitida ? this.pestanaInicial : 'resumen');
      }
    } catch (err) {
      this.errorFicha = mensajeError(err);
    } finally {
      this.cargando = false;
    }
  }

  cambiarPestana(id: PestanaMaquina): void {
    this.pestana = id;
    this.errorLista = '';
    void this.cargarPestana();
  }

  private async cargarPestana(): Promise<void> {
    if (!this.ficha) return;
    const id = String(this.ficha.id);
    this.cargandoLista = true;
    this.errorLista = '';
    try {
      switch (this.pestana) {
        case 'incidencias':
          // El backend ya las ordena (no atendidas primero): no se reordenan aquí.
          this.incidencias = (await firstValueFrom(this.incidenteService.getIncidentesPagina({ maquinariaId: id }))).data;
          break;
        case 'mantenimientos':
          this.mantenimientos = (await firstValueFrom(this.mantenimientoService.getMantenimientosPagina({ maquinariaId: id }))).data;
          break;
        case 'movimientos':
          this.movimientos = (await firstValueFrom(this.movimientoService.getMovimientosPagina(id))).data;
          break;
        case 'timeline':
          await this.cargarLinea(true);
          break;
      }
    } catch (err) {
      this.errorLista = mensajeError(err);
    } finally {
      this.cargandoLista = false;
    }
  }

  /** Tras una acción: recarga la ficha y la pestaña visible, y avisa al host. */
  onAccionHecha(_evento: string): void {
    void this.cargarFicha(false);
    void this.cargarPestana();
    this.cambio.emit();
  }

  // ---- Línea de tiempo ----
  alternarTipo(codigo: string): void {
    if (this.tiposSeleccionados.has(codigo)) this.tiposSeleccionados.delete(codigo);
    else this.tiposSeleccionados.add(codigo);
    this.tiposSeleccionados = new Set(this.tiposSeleccionados);
  }

  limpiarFiltrosLinea(recargar = true): void {
    this.tiposSeleccionados = new Set<string>();
    this.filtroDesde = '';
    this.filtroHasta = '';
    if (recargar && this.ficha) void this.cargarLinea(true);
  }

  async cargarLinea(reiniciar: boolean): Promise<void> {
    if (!this.ficha) return;
    if (reiniciar) {
      this.paginaLinea = 1;
      this.eventos = [];
    }
    this.cargandoLista = true;
    this.errorLista = '';
    try {
      const desde = this.filtroDesde ? new Date(`${this.filtroDesde}T00:00:00`).toISOString() : undefined;
      const hasta = this.filtroHasta ? new Date(`${this.filtroHasta}T23:59:59.999`).toISOString() : undefined;
      const pagina = await firstValueFrom(this.maquinariaService.getHistorial({
        maquinariaId: String(this.ficha.id),
        tipos: [...this.tiposSeleccionados],
        desde, hasta,
        page: this.paginaLinea,
        pageSize: this.tamanoPaginaLinea,
      }));
      this.eventos = [...this.eventos, ...pagina.data.map(e => this.aVista(e))];
      this.totalEventos = pagina.total;
      this.paginaLinea++;
    } catch (err) {
      this.errorLista = mensajeError(err);
    } finally {
      this.cargandoLista = false;
    }
  }

  private aVista(e: MaquinariaEvento): EventoVista {
    const d = e.datos || {};
    const lineas: string[] = [];
    let cambios: { campo: string; antes: string; despues: string }[] = [];

    if (d['cambios'] && typeof d['cambios'] === 'object') {
      cambios = Object.entries(d['cambios'] as Record<string, any>).map(([campo, v]) => ({
        campo, antes: this.fmt(v?.antes), despues: this.fmt(v?.despues),
      }));
    }
    if (d['motivo']) lineas.push(`Motivo: ${d['motivo']}`);
    if (e.tipo === 'MOVIMIENTO' && (d['origen'] || d['destino'])) {
      lineas.push(`Origen: ${this.ubicacion(d['origen'])}  →  Destino: ${this.ubicacion(d['destino'])}`);
    }
    if (d['anterior'] !== undefined || d['nuevo'] !== undefined) {
      cambios.push({ campo: e.tipo.includes('MANTENIMIENTO') ? 'Técnico' : 'Técnico asignado', antes: this.fmt(d['anterior']), despues: this.fmt(d['nuevo']) });
    }
    if (d['minutosHastaReparar'] != null) lineas.push(`Tiempo hasta reparar: ${this.duracion(Number(d['minutosHastaReparar']))}`);
    if (d['programadoPara']) lineas.push(`Programado para: ${this.fmt(d['programadoPara'])}`);
    if (d['ejecutadoEn']) lineas.push(`Ejecutado en: ${this.fmt(d['ejecutadoEn'])}`);

    // Resto de datos simples que no se hayan mostrado arriba
    const mostrados = new Set(['cambios', 'motivo', 'origen', 'destino', 'anterior', 'nuevo', 'minutosHastaReparar', 'programadoPara', 'ejecutadoEn']);
    for (const [k, v] of Object.entries(d)) {
      if (mostrados.has(k) || v === null || v === undefined || typeof v === 'object') continue;
      lineas.push(`${this.humano(k)}: ${this.fmt(v)}`);
    }

    return { evento: e, etiqueta: etiquetaEventoMaquinaria(e.tipo), color: colorEventoMaquinaria(e.tipo), lineas, cambios };
  }

  private ubicacion(u: any): string {
    if (!u) return '—';
    return `${u.agencia?.nombre || u.agencia || '—'} / ${u.bahia?.nombre || u.bahia || 'Sin bahía'}`;
  }

  private humano(k: string): string {
    const t = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }

  private duracion(min: number): string {
    if (!Number.isFinite(min)) return '—';
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${h} h ${m} min`;
  }

  /** Formatea un valor de evento (antes/después) para mostrarlo. */
  private fmt(v: any): string {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    if (typeof v === 'object') return v.nombre || v.name || JSON.stringify(v);
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fechaHoraLocal(v);
    return String(v);
  }

  // ---- Presentación ----
  hora(iso?: string | null): string { return fechaHoraLocal(iso); }
  fechaProg(iso?: string | null): string { return fechaProgramadaLocal(iso); }

  etiquetaEstado(f: MaquinaFicha): string {
    return f.estadoOperativo === 'DE_BAJA' ? 'De baja' : f.estadoOperativo === 'EN_MANTENIMIENTO' ? 'En mantenimiento' : 'Operativa';
  }
  claseEstado(f: MaquinaFicha): string {
    return f.estadoOperativo === 'DE_BAJA'
      ? 'bg-rose-100 text-rose-800 border border-rose-300'
      : f.estadoOperativo === 'EN_MANTENIMIENTO'
        ? 'bg-amber-100 text-amber-800 border border-amber-300'
        : 'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40';
  }
  claseGravedad(g?: string): string {
    return g === 'CRITICA' ? 'bg-rose-600 text-white' : g === 'ALTA' ? 'bg-orange-100 text-orange-800' : g === 'BAJA' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800';
  }
  claseEstadoIncidente(i: Incidente): string {
    return i.estadoRaw === 'RESUELTO' ? 'bg-easydry-green/20 text-easydry-green-dark' : i.estadoRaw === 'CANCELADO' ? 'bg-slate-200 text-slate-600' : i.estadoRaw === 'EN_PROCESO' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
  }
  claseEstadoMant(m: Mantenimiento): string {
    return m.estadoRaw === 'FINALIZADO' ? 'bg-easydry-green/20 text-easydry-green-dark' : m.estadoRaw === 'EN_PROCESO' ? 'bg-easydry-blue/15 text-easydry-blue' : 'bg-amber-100 text-amber-800';
  }

  alternarIncidencia(i: Incidente): void { this.incExpandida = this.incExpandida === i.id ? null : i.id; }
  alternarMantenimiento(m: Mantenimiento): void { this.mantExpandido = this.mantExpandido === m.id ? null : m.id; }

  fichaModalOpen = false;
  fichaCargando = false;
  fichaError = '';
  fichaUrl = '';
  fichaRespaldo = '';

  /** Abre la ficha técnica en un modal dentro de la misma página (la URL prefirmada se resuelve con la sesión). */
  async abrirFichaTecnica(): Promise<void> {
    this.fichaModalOpen = true;
    this.fichaError = '';
    this.fichaUrl = '';
    this.fichaRespaldo = '';
    this.fichaCargando = true;
    try {
      // Vista liviana (1600 px) primero; el original solo si la vista aún no existe.
      const original = await this.storage.resolveMediaUrl(this.ficha?.fichaTecnicaUrl);
      if (!original) throw new Error('sin url');
      const vista = await this.storage.resolveVariantUrl(this.ficha?.fichaTecnicaUrl, 'view');
      this.fichaUrl = vista || original;
      this.fichaRespaldo = vista ? original : '';
    } catch {
      this.fichaError = 'No se pudo cargar la ficha técnica.';
    } finally {
      this.fichaCargando = false;
    }
  }

  /** Adaptador mínimo para reutilizar los diálogos de programación con la ficha. */
  fichaComoMaquinaria() {
    const f = this.ficha!;
    return {
      id: f.id, codigo: f.codigo, nombre: f.nombre, marca: f.marca || '', modelo: f.modelo || '',
      agencia: f.agenciaNombre || '', bahia: f.bahiaNombre || '', estado: this.etiquetaEstado(f),
      fechaMantenimiento: '', imagen: f.fotoUrl || '', regionId: f.regionId,
    };
  }
}

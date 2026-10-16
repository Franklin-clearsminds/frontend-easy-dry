import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom, map } from 'rxjs';
import {
  Incidente, Mantenimiento, MaquinaFicha, MaquinariaEvento, MovimientoMaquinaria,
  TIPOS_EVENTO_MAQUINARIA, etiquetaEventoMaquinaria, colorEventoMaquinaria,
} from '../../../core/models';
import { LimpiezaMaquinaria, MaquinariaService } from '../../../core/services/maquinaria.service';
import { IncidenteService } from '../../../core/services/incidente.service';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { MovimientoMaquinariaService } from '../../../core/services/movimiento-maquinaria.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { VisorArchivoComponent } from '../../../shared/components/visor-archivo/visor-archivo.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { InfiniteScrollComponent } from '../../../shared/components/infinite-scroll/infinite-scroll.component';
import { ListaInfinita } from '../../../core/utils/lista-infinita';
import { PAGE_SIZE_INFINITO } from '../../../core/config/paginacion';
import { EvidenciaGaleriaComponent } from '../../../shared/components/evidencia-galeria/evidencia-galeria.component';
import { ThumbSrcDirective } from '../../../shared/directives/thumb-src.directive';
import { TrabajoAccionesComponent, mensajeError } from '../trabajo-acciones/trabajo-acciones.component';
import { ChecklistOrdenComponent } from '../../mantenimiento/checklist-orden/checklist-orden.component';
import { MaquinaAccionesComponent } from '../maquina-acciones/maquina-acciones.component';
import { fechaHoraLocal, fechaProgramadaLocal, validarFotos } from '../../../core/utils/evidencia-maquinaria';
import { badgeClase, BADGE_NO_ATENDIDO } from '../../../core/utils/badges';
import {
  puedeEditarMaquina, puedeCambiarArchivosMaquina, puedeActivarMaquina, puedeGestionarMaquina, puedeReportarIncidente,
  puedeVerTrazabilidad, puedeVerMantenimientos, puedeVerIncidentes, puedeResolverIncidentes,
  puedeEjecutarMantenimientos, puedeEditarMantenimientos, puedeAgregarEvidenciaMaquinaria, puedeSubirEvidenciaLimpieza, puedeVerLimpiezas, puedeAsignarTecnico, puedeProgramarMantenimiento } from '../../../core/utils/maquinaria-permisos';

export type PestanaMaquina = 'resumen' | 'incidencias' | 'movimientos' | 'mantenimientos' | 'limpieza' | 'timeline';

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
    ThumbSrcDirective, TrabajoAccionesComponent, MaquinaAccionesComponent, InfiniteScrollComponent, ChecklistOrdenComponent,
  ],
  template: `
    <app-modal
      [isOpen]="maquinariaId !== null && maquinariaId !== undefined"
      [title]="ficha ? ('Máquina ' + ficha.codigo + ' — ' + ficha.nombre) : 'Detalle de máquina'"
      icon="hard-drive"
      size="xl"
      [altoFijo]="true"
      (close)="fichaModalOpen ? null : cerrar.emit()">

      @if (cargando && !ficha) {
        <p class="text-sm text-slate-500 font-semibold py-8 text-center" role="status" aria-live="polite">Cargando ficha...</p>
      }
      @if (errorFicha) {
        <div class="estado-error" role="alert">{{ errorFicha }}</div>
      }

      @if (ficha) {
        <div class="space-y-5">
          <!-- Cabecera -->
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            @if (ficha.fotoUrl) {
              <img [appThumb]="ficha.fotoUrl" [alt]="'Foto de ' + ficha.nombre" class="w-full sm:w-44 h-32 object-cover rounded-2xl border border-slate-200 bg-slate-100">
            }
            <div class="flex-1 min-w-0 space-y-2">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-1 bg-easydry-blue text-white font-mono font-bold text-xs rounded-lg">{{ ficha.codigo }}</span>
                <span [class]="badgeClase('maquina', etiquetaEstado(ficha), { activa: ficha.activa })">{{ etiquetaEstado(ficha) }}</span>
                @if (ficha.incidentesNoAtendidos > 0) {
                  <span [class]="badgeNoAtendido">{{ ficha.incidentesNoAtendidos }} incidencia(s) no atendida(s)</span>
                }
                @if (ficha.mantenimientosVencidos > 0) {
                  <span [class]="badgeNoAtendido">{{ ficha.mantenimientosVencidos }} mantenimiento(s) vencido(s)</span>
                }
              </div>
              <p class="text-xs text-slate-600">{{ ficha.marca }} {{ ficha.modelo }} @if (ficha.serie) { · Serie {{ ficha.serie }} } @if (ficha.tipo) { · {{ ficha.tipo }} }</p>

              <!-- Acciones (según rol; el backend valida de nuevo) -->
              <div class="flex flex-wrap gap-2 pt-1">
                @if (puedeEditar) {
                  <button type="button" (click)="maquinaAcc.editar(ficha)" class="btn btn-secondary btn-sm">
                    <i-lucide name="pencil" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Editar
                  </button>
                }
                @if (puedeActivar) {
                  @if (ficha.activa) {
                    <button type="button" (click)="maquinaAcc.cambiarActiva(ficha, false)" class="btn btn-danger btn-sm">
                      <i-lucide name="x-circle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Dar de baja
                    </button>
                  } @else {
                    <button type="button" (click)="maquinaAcc.cambiarActiva(ficha, true)" class="btn btn-secondary btn-sm">
                      <i-lucide name="check-circle-2" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Reactivar
                    </button>
                  }
                }
                @if (puedeGestionar) {
                  <button type="button" (click)="maquinaAcc.configurarVentana(ficha)" class="btn btn-secondary btn-sm">
                    <i-lucide name="timer" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Ventana de adelanto
                  </button>
                  <button type="button" (click)="maquinaAcc.transferir(ficha)" class="btn btn-secondary btn-sm">
                    <i-lucide name="refresh-cw" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Transferir / Asignar
                  </button>
                  @if (ficha.activa) {
                    <button type="button" (click)="trabajoAcc.programarMantenimiento(fichaComoMaquinaria(), [])" class="btn btn-secondary btn-sm">
                      <i-lucide name="calendar-clock" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Programar mantenimiento
                    </button>
                  }
                }
                @if (puedeReportar) {
                  <button type="button" (click)="trabajoAcc.reportarIncidente(ficha)" class="btn btn-cta btn-sm">
                    <i-lucide name="alert-triangle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Reportar incidencia
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Pestañas -->
          <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto" role="tablist" aria-label="Secciones de la máquina">
            @for (t of pestanas; track t.id) {
              <button type="button" (click)="cambiarPestana(t.id)"
                role="tab" [id]="'tab-maq-' + t.id" [attr.aria-selected]="pestana === t.id"
                [attr.aria-controls]="pestana === t.id ? 'panel-maq-' + t.id : null"
                class="flex-1 min-w-fit min-h-9 py-2 px-3 rounded-lg text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                [ngClass]="pestana === t.id ? 'bg-white text-easydry-blue shadow-xs' : 'text-slate-500 hover:text-slate-700'">
                <i-lucide [name]="t.icono" class="w-4 h-4" aria-hidden="true"></i-lucide>
                {{ t.label }}
                @if (t.id === 'incidencias' && ficha.incidentesNoAtendidos > 0) {
                  <span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">{{ ficha.incidentesNoAtendidos }}<span class="sr-only"> incidencias sin atender</span></span>
                }
                @if (t.id === 'mantenimientos' && ficha.mantenimientosVencidos > 0) {
                  <span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">{{ ficha.mantenimientosVencidos }}<span class="sr-only"> mantenimientos vencidos</span></span>
                }
              </button>
            }
          </div>

          <div role="tabpanel" [id]="'panel-maq-' + pestana" [attr.aria-labelledby]="'tab-maq-' + pestana" class="space-y-5">
          <!-- ================= RESUMEN ================= -->
          @if (pestana === 'resumen') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <h4 class="font-bold text-slate-900 uppercase text-xs border-b border-slate-200 pb-2">Estado y ubicación</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Estado operativo</span><span class="font-bold text-slate-800">{{ etiquetaEstado(ficha) }}</span></div>
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Activa</span><span class="font-bold" [ngClass]="ficha.activa ? 'text-emerald-700' : 'text-rose-700'">{{ ficha.activa ? 'Sí' : 'No (de baja)' }}</span></div>
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Agencia / ubicación</span><span class="font-bold text-slate-800">{{ ficha.agenciaNombre || 'Sin agencia' }}@if (esTaller) { <span class="text-amber-700"> (Taller)</span> }</span></div>
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Bahía</span><span class="font-bold text-slate-800">{{ ficha.bahiaNombre || 'Sin bahía' }}</span></div>
                </div>
                @if (!ficha.activa) {
                  <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <p class="font-bold text-rose-800">Motivo de la baja</p>
                    <p class="text-rose-700 break-words">{{ ficha.motivoDesactivacion || '—' }}</p>
                    <p class="text-xs text-rose-700">{{ ficha.desactivadoPor?.nombre || '—' }} · {{ hora(ficha.fechaDesactivacion) }}</p>
                  </div>
                }
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <h4 class="font-bold text-slate-900 uppercase text-xs border-b border-slate-200 pb-2">Responsables</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Operador asignado</span><span class="font-bold text-slate-800">{{ ficha.operadorAsignado?.nombre || 'Sin asignar' }}</span></div>
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Creada por</span><span class="font-bold text-slate-800">{{ ficha.creadoPor?.nombre || '—' }}</span></div>
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Fecha de creación</span><span class="font-mono text-slate-700">{{ hora(ficha.creadaEn) }}</span></div>
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Horas de uso</span><span class="font-mono text-slate-700">{{ ficha.horasUso || 0 }}</span></div>
                </div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <h4 class="font-bold text-slate-900 uppercase text-xs border-b border-slate-200 pb-2">Mantenimiento</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Ventana de adelanto</span>
                    <span class="font-bold text-slate-800">{{ ficha.ventanaAdelantoDias }} día(s)@if (ficha.ventanaAdelantoDias >= 7) { <span class="text-slate-500 font-semibold"> (~{{ ficha.ventanaAdelantoDias / 7 | number:'1.0-1' }} sem)</span> }</span></div>
                  <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Próximo mantenimiento</span>
                    @if (ficha.proximoMantenimiento) {
                      <span class="font-bold text-slate-800">{{ fechaProg(ficha.proximoMantenimiento.fechaProgramada) }}</span>
                      <span class="block text-xs text-slate-500">{{ ficha.proximoMantenimiento.tipo }} · {{ ficha.proximoMantenimiento.estado }}</span>
                    } @else { <span class="font-bold text-slate-500">Sin programar</span> }
                  </div>
                </div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                <h4 class="font-bold text-slate-900 uppercase text-xs border-b border-slate-200 pb-2">Pendientes y totales</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-2 rounded-xl" [ngClass]="ficha.incidentesNoAtendidos > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-white border border-slate-200'">
                    <span class="block text-[11px] text-slate-500 font-bold uppercase">Incidencias no atendidas</span>
                    <span class="text-lg font-extrabold" [ngClass]="ficha.incidentesNoAtendidos > 0 ? 'text-rose-700' : 'text-slate-800'">{{ ficha.incidentesNoAtendidos }}</span>
                  </div>
                  <div class="p-2 rounded-xl" [ngClass]="ficha.mantenimientosVencidos > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-white border border-slate-200'">
                    <span class="block text-[11px] text-slate-500 font-bold uppercase">Mantenimientos vencidos</span>
                    <span class="text-lg font-extrabold" [ngClass]="ficha.mantenimientosVencidos > 0 ? 'text-rose-700' : 'text-slate-800'">{{ ficha.mantenimientosVencidos }}</span>
                  </div>
                </div>
                <p class="text-slate-600">Totales históricos: <strong>{{ ficha.totales.incidentes }}</strong> incidencias · <strong>{{ ficha.totales.mantenimientos }}</strong> mantenimientos · <strong>{{ ficha.totales.movimientos }}</strong> movimientos</p>
                @if (ficha.fichaTecnicaUrl) {
                  <button type="button" (click)="abrirFichaTecnica()" class="btn btn-secondary btn-sm text-easydry-blue">
                    <i-lucide name="file-text" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Ver ficha técnica
                  </button>
                }
              </div>

            </div>
          }

          <!-- ================= INCIDENCIAS ================= -->
          @if (pestana === 'incidencias') {
            @if (listaInc.error && listaInc.items.length === 0) {
              <div role="alert" class="flex flex-col items-center gap-3 text-center py-4">
                <div class="estado-error">{{ listaInc.error }}</div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="listaInc.reiniciar()">Reintentar</button>
              </div>
            } @else if (!listaInc.inicializada) {
              <p class="text-xs text-slate-500 font-semibold" role="status" aria-live="polite">Cargando incidencias...</p>
            } @else if (listaInc.items.length === 0) {
              <p class="estado-vacio">Esta máquina no tiene incidencias registradas.</p>
            }
            <div class="space-y-3">
              @for (inc of listaInc.items; track inc.id) {
                <div class="rounded-2xl border p-4 space-y-2"
                  [ngClass]="inc.noAtendida ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 bg-white'">
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-mono font-extrabold text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{{ inc.codigoIncidente }}</span>
                        @if (inc.noAtendida) {
                          <span [class]="badgeNoAtendido">No atendida</span>
                        }
                        <span [class]="badgeClase('gravedad', inc.gravedadRaw)">{{ inc.prioridad }}</span>
                        <span [class]="badgeClase('incidente', inc.estadoRaw)">{{ inc.estado }}</span>
                      </div>
                      <p class="font-bold text-sm mt-1" [ngClass]="inc.noAtendida ? 'text-rose-800' : 'text-slate-900'">{{ inc.tipo }}</p>
                      <p class="text-xs text-slate-500">Reportada {{ hora(inc.fechaReporteIso) }} por {{ inc.reportadoPor }} · Técnico: {{ inc.tecnicoAsignadoId ? inc.tecnicoAsignadoNombre : 'Sin asignar' }}</p>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <button type="button" (click)="alternarIncidencia(inc)" [attr.aria-expanded]="incExpandida === inc.id" class="btn btn-secondary btn-sm">{{ incExpandida === inc.id ? 'Ocultar' : 'Ver detalle' }}</button>
                      @if (puedeAsignarInc(inc)) {
                        <button type="button" (click)="trabajoAcc.asignarIncidente(inc)" class="btn btn-secondary btn-sm">{{ inc.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}</button>
                      }
                      @if (puedeResolverInc(inc)) {
                        <button type="button" (click)="trabajoAcc.resolverIncidente(inc)" class="btn btn-primary btn-sm">Resolver</button>
                      }
                      @if (puedeEditarInc(inc)) {
                        <button type="button" (click)="trabajoAcc.editarIncidente(inc)" class="btn btn-secondary btn-sm">Editar</button>
                      }
                      @if (puedeAgregarEvidencia) {
                        <button type="button" (click)="trabajoAcc.agregarEvidencia('INCIDENTE', inc)" class="btn btn-secondary btn-sm">+ Evidencia</button>
                      }
                    </div>
                  </div>
                  @if (incExpandida === inc.id) {
                    <div class="pt-2 border-t border-slate-200/70 space-y-3 text-xs">
                      <p class="text-slate-700 break-words"><strong>Descripción:</strong> {{ inc.descripcion }}</p>
                      @if (inc.destinoTallerNombre) { <p class="text-slate-700"><strong>Taller destino:</strong> {{ inc.destinoTallerNombre }}</p> }
                      @if (inc.observacionSolucion) { <p class="text-slate-700"><strong>Solución:</strong> {{ inc.observacionSolucion }} @if (inc.solucionadoPor) { <span class="text-slate-500">({{ inc.solucionadoPor }}, {{ inc.fechaSolucion }})</span> }</p> }
                      <app-evidencia-galeria [evidencias]="inc.evidencias || []" [agruparPorEtapa]="true"></app-evidencia-galeria>
                    </div>
                  }
                </div>
              }
            </div>
            @if (listaInc.items.length > 0) {
              <app-infinite-scroll
                [hasMore]="listaInc.hasMore"
                [loading]="listaInc.cargando"
                [error]="listaInc.error"
                [total]="listaInc.total"
                (cargarMas)="listaInc.siguiente()"
                (reintentar)="listaInc.reintentar()">
              </app-infinite-scroll>
            }
          }

          <!-- ================= MOVIMIENTOS ================= -->
          @if (pestana === 'movimientos') {
            @if (listaMov.error && listaMov.items.length === 0) {
              <div role="alert" class="flex flex-col items-center gap-3 text-center py-4">
                <div class="estado-error">{{ listaMov.error }}</div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="listaMov.reiniciar()">Reintentar</button>
              </div>
            } @else if (!listaMov.inicializada) {
              <p class="text-xs text-slate-500 font-semibold" role="status" aria-live="polite">Cargando movimientos...</p>
            } @else if (listaMov.items.length === 0) {
              <p class="estado-vacio">Esta máquina no tiene movimientos registrados.</p>
            }
            @if (listaMov.items.length > 0) {
              <div class="overflow-x-auto rounded-2xl border border-slate-200">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr><th scope="col" class="py-3 px-4">Fecha y hora</th><th scope="col" class="py-3 px-4">Responsable</th><th scope="col" class="py-3 px-4">Origen</th><th scope="col" class="py-3 px-4">Destino</th><th scope="col" class="py-3 px-4">Motivo</th></tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (mv of listaMov.items; track mv.id) {
                      <tr>
                        <td class="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">{{ mv.fecha }}</td>
                        <td class="py-3 px-4 font-semibold text-slate-800">{{ mv.usuarioResponsable || '—' }}</td>
                        <td class="py-3 px-4">{{ mv.sucursalAnterior || '—' }} <span class="text-slate-500">/ {{ mv.bahiaAnterior || 'Sin bahía' }}</span></td>
                        <td class="py-3 px-4 font-semibold text-easydry-blue">{{ mv.sucursalNueva || '—' }} <span class="text-slate-500 font-normal">/ {{ mv.bahiaNueva || 'Sin bahía' }}</span></td>
                        <td class="py-3 px-4 text-slate-600">{{ mv.motivo || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (listaMov.items.length > 0) {
                <app-infinite-scroll
                  [hasMore]="listaMov.hasMore"
                  [loading]="listaMov.cargando"
                  [error]="listaMov.error"
                  [total]="listaMov.total"
                  (cargarMas)="listaMov.siguiente()"
                  (reintentar)="listaMov.reintentar()">
                </app-infinite-scroll>
              }
            }
          }

          <!-- ================= MANTENIMIENTOS ================= -->
          @if (pestana === 'mantenimientos') {
            @if (listaMant.error && listaMant.items.length === 0) {
              <div role="alert" class="flex flex-col items-center gap-3 text-center py-4">
                <div class="estado-error">{{ listaMant.error }}</div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="listaMant.reiniciar()">Reintentar</button>
              </div>
            } @else if (!listaMant.inicializada) {
              <p class="text-xs text-slate-500 font-semibold" role="status" aria-live="polite">Cargando mantenimientos...</p>
            } @else if (listaMant.items.length === 0) {
              <p class="estado-vacio">Esta máquina no tiene mantenimientos registrados.</p>
            }
            <div class="space-y-3">
              @for (m of listaMant.items; track m.id) {
                <div class="rounded-2xl border p-4 space-y-2"
                  [ngClass]="m.noAtendido ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 bg-white'">
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        @if (m.noAtendido) {
                          <span [class]="badgeNoAtendido">No atendido</span>
                        }
                        <span [class]="badgeClase('mantenimiento', m.estadoRaw)">{{ m.estado }}</span>
                        <span class="badge badge-neutral">{{ m.tipo }}</span>
                      </div>
                      <p class="font-bold text-sm mt-1" [ngClass]="m.noAtendido ? 'text-rose-800' : 'text-slate-900'">Programado: {{ fechaProg(m.fechaProgramada) }}</p>
                      <p class="text-xs text-slate-500">
                        Técnico: {{ m.tecnicoAsignadoNombre || 'Sin asignar' }} · Creado por {{ m.creadoPorNombre || '—' }}
                        @if (m.fechaEjecucion) { · Ejecutado {{ hora(m.fechaEjecucion) }} por {{ m.ejecutadoPorNombre || '—' }} }
                      </p>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <button type="button" (click)="alternarMantenimiento(m)" [attr.aria-expanded]="mantExpandido === m.id" class="btn btn-secondary btn-sm">{{ mantExpandido === m.id ? 'Ocultar' : 'Ver detalle' }}</button>
                      @if (puedeAsignarMant(m)) {
                        <button type="button" (click)="trabajoAcc.asignarMantenimiento(m)" class="btn btn-secondary btn-sm">{{ m.tecnicoAsignadoId ? 'Reasignar' : 'Asignar' }}</button>
                      }
                      @if (puedeEjecutarMant(m)) {
                        <button type="button" (click)="trabajoAcc.ejecutarMantenimiento(m)" class="btn btn-primary btn-sm">Ejecutar</button>
                      }
                      @if (puedeEditarMant(m)) {
                        <button type="button" (click)="trabajoAcc.editarMantenimiento(m)" class="btn btn-secondary btn-sm">Editar</button>
                      }
                      @if (puedeAgregarEvidencia) {
                        <button type="button" (click)="trabajoAcc.agregarEvidencia('MANTENIMIENTO', m)" class="btn btn-secondary btn-sm">+ Evidencia</button>
                      }
                    </div>
                  </div>
                  @if (mantExpandido === m.id) {
                    <div class="pt-2 border-t border-slate-200/70 space-y-3 text-xs">
                      <p class="text-slate-700 break-words"><strong>Observaciones:</strong> {{ m.descripcion || '—' }}</p>
                      @if (m.frecuenciaDias) { <p class="text-slate-700"><strong>Frecuencia:</strong> cada {{ m.frecuenciaDias }} días</p> }
                      @if (m.repuestosUtilizados?.length) { <p class="text-slate-700"><strong>Repuestos:</strong> {{ m.repuestosUtilizados!.join(', ') }}</p> }
                      @if (m.estadoRaw === 'FINALIZADO') {
                        <app-checklist-orden [mantenimientoId]="'' + m.id" [editable]="false"></app-checklist-orden>
                      }
                      <app-evidencia-galeria [evidencias]="m.evidencias || []"></app-evidencia-galeria>
                    </div>
                  }
                </div>
              }
            </div>
            @if (listaMant.items.length > 0) {
              <app-infinite-scroll
                [hasMore]="listaMant.hasMore"
                [loading]="listaMant.cargando"
                [error]="listaMant.error"
                [total]="listaMant.total"
                (cargarMas)="listaMant.siguiente()"
                (reintentar)="listaMant.reintentar()">
              </app-infinite-scroll>
            }
          }

          <!-- ================= LIMPIEZA ================= -->
          @if (pestana === 'limpieza' && ficha.limpieza.regla) {
            <div class="p-4 rounded-2xl border space-y-3 text-xs"
              [ngClass]="ficha.limpieza.atrasada ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-slate-50/60'">
              <h4 class="font-bold uppercase text-xs border-b pb-2 flex items-center justify-between"
                [ngClass]="ficha.limpieza.atrasada ? 'text-rose-900 border-rose-200' : 'text-slate-900 border-slate-200'">
                <span class="flex items-center gap-1.5"><i-lucide name="sparkles" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Estado actual</span>
                @if (ficha.limpieza.atrasada) { <span class="text-rose-700">Atrasada</span> }
              </h4>
              <div class="grid grid-cols-2 gap-3">
                <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Regla</span>
                  <span class="font-bold text-slate-800">{{ ficha.limpieza.regla === 'AGENCIA' ? 'Miércoles y sábado' : 'Diaria' }}</span></div>
                <div><span class="block text-[11px] text-slate-500 font-bold uppercase">Última limpieza</span>
                  <span class="font-bold text-slate-800">{{ ficha.limpieza.ultimaFecha ? fechaProg(ficha.limpieza.ultimaFecha) : 'Nunca registrada' }}</span></div>
              </div>
              @if (ficha.limpieza.ultimasFotos.length) {
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (foto of ficha.limpieza.ultimasFotos; track foto) {
                    <img [appThumb]="foto" class="w-10 h-10 rounded-lg object-cover border border-slate-200" alt="Foto de la última limpieza">
                  }
                </div>
              }
              @if (puedeRegistrarLimpieza) {
                <button type="button" (click)="abrirRegistrarLimpieza()" class="btn btn-primary btn-sm w-full">
                  <i-lucide name="camera" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Registrar limpieza de hoy
                </button>
              }
            </div>

            @if (listaLimp.error && listaLimp.items.length === 0) {
              <div role="alert" class="flex flex-col items-center gap-3 text-center py-4">
                <div class="estado-error">{{ listaLimp.error }}</div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="listaLimp.reiniciar()">Reintentar</button>
              </div>
            } @else if (!listaLimp.inicializada) {
              <p class="text-xs text-slate-500 font-semibold" role="status" aria-live="polite">Cargando historial de limpieza...</p>
            } @else if (listaLimp.items.length === 0) {
              <p class="estado-vacio">Esta máquina no tiene limpiezas registradas.</p>
            }
            <div class="space-y-3">
              @for (l of listaLimp.items; track l.id) {
                <div class="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide"
                          [ngClass]="l.tipo === 'AGENCIA' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'">
                          {{ l.tipo === 'AGENCIA' ? 'Agencia' : 'Pulidor' }}
                        </span>
                      </div>
                      <p class="font-bold text-sm mt-1 text-slate-900">{{ fechaProg(l.fecha) }}</p>
                      <p class="text-xs text-slate-500">Registró: {{ (l.registradoPor?.name || '') + ' ' + (l.registradoPor?.lastname || '') }}</p>
                    </div>
                  </div>
                  @if (l.observaciones) {
                    <p class="text-xs text-slate-700 break-words">{{ l.observaciones }}</p>
                  }
                  @if (l.fotos.length) {
                    <div class="flex items-center gap-1.5 flex-wrap">
                      @for (foto of l.fotos; track foto) {
                        <img [appThumb]="foto" class="w-12 h-12 rounded-lg object-cover border border-slate-200" alt="Foto de limpieza">
                      }
                    </div>
                  }
                </div>
              }
            </div>
            @if (listaLimp.items.length > 0) {
              <app-infinite-scroll
                [hasMore]="listaLimp.hasMore"
                [loading]="listaLimp.cargando"
                [error]="listaLimp.error"
                [total]="listaLimp.total"
                (cargarMas)="listaLimp.siguiente()"
                (reintentar)="listaLimp.reintentar()">
              </app-infinite-scroll>
            }
          }

          <!-- ================= LÍNEA DE TIEMPO ================= -->
          @if (pestana === 'timeline') {
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div class="flex flex-wrap gap-1.5">
                @for (t of tiposEvento; track t.codigo) {
                  <button type="button" (click)="alternarTipo(t.codigo)" [attr.aria-pressed]="tiposSeleccionados.has(t.codigo)"
                    class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer"
                    [ngClass]="tiposSeleccionados.has(t.codigo) ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'">
                    {{ t.label }}
                  </button>
                }
              </div>
              <div class="flex flex-wrap items-end gap-3">
                <div><label for="tl-desde" class="field-label">Desde</label>
                  <input id="tl-desde" type="date" [(ngModel)]="filtroDesde" name="tl-desde" class="field"></div>
                <div><label for="tl-hasta" class="field-label">Hasta</label>
                  <input id="tl-hasta" type="date" [(ngModel)]="filtroHasta" name="tl-hasta" class="field"></div>
                <button type="button" (click)="cargarLinea()" class="btn btn-primary">Aplicar filtros</button>
                <button type="button" (click)="limpiarFiltrosLinea()" class="btn btn-secondary">Limpiar</button>
              </div>
            </div>

            @if (listaLinea.error && listaLinea.items.length === 0) {
              <div role="alert" class="flex flex-col items-center gap-3 text-center py-4">
                <div class="estado-error">{{ listaLinea.error }}</div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="listaLinea.reiniciar()">Reintentar</button>
              </div>
            } @else if (!listaLinea.inicializada) {
              <p class="text-xs text-slate-500 font-semibold" role="status" aria-live="polite">Cargando eventos...</p>
            } @else if (listaLinea.items.length === 0) {
              <p class="estado-vacio">No hay eventos con los filtros seleccionados.</p>
            }

            <div class="relative pl-5 space-y-4">
              @for (ev of listaLinea.items; track ev.evento.id) {
                <div class="relative">
                  <span class="absolute -left-[21px] top-1 w-3 h-3 rounded-full ring-4 ring-slate-100" [ngClass]="ev.color" aria-hidden="true"></span>
                  <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                      <p class="text-xs font-extrabold text-slate-900">{{ ev.etiqueta }}</p>
                      <p class="text-xs font-mono text-slate-500">{{ hora(ev.evento.ocurridoEn) }}</p>
                    </div>
                    <p class="text-xs text-slate-600">
                      Por <strong>{{ ev.evento.actor?.nombre || 'Sistema' }}</strong>@if (ev.evento.actor?.rol) { <span class="text-slate-500"> ({{ ev.evento.actor?.rol }})</span> }
                    </p>
                    @for (l of ev.lineas; track $index) { <p class="text-xs text-slate-700">{{ l }}</p> }
                    @if (ev.cambios.length > 0) {
                      <div class="mt-1 overflow-x-auto">
                        <table class="w-full text-xs">
                          <thead><tr class="text-slate-500 uppercase text-[11px] text-left"><th scope="col" class="pr-3 py-1">Campo</th><th scope="col" class="pr-3 py-1">Antes</th><th scope="col" class="py-1">Después</th></tr></thead>
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
            @if (listaLinea.items.length > 0) {
              <app-infinite-scroll
                [hasMore]="listaLinea.hasMore"
                [loading]="listaLinea.cargando"
                [error]="listaLinea.error"
                [total]="listaLinea.total"
                (cargarMas)="listaLinea.siguiente()"
                (reintentar)="listaLinea.reintentar()">
              </app-infinite-scroll>
            }
          }
          </div>
        </div>
      }

      <div modal-footer>
        <button type="button" (click)="cerrar.emit()" class="btn btn-secondary w-full sm:w-auto">Cerrar</button>
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

    <!-- Registrar limpieza: fotos tomadas con la cámara (nunca de archivos guardados), hoy por defecto -->
    <app-modal [isOpen]="limpiezaModalOpen" title="Registrar limpieza" icon="sparkles" size="md" (close)="cerrarRegistrarLimpieza()">
      <div class="space-y-4">
        <div>
          <span class="field-label">Fotos (con la cámara)</span>
          <div class="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 min-h-56 flex flex-col items-center justify-center text-white">
            @if (limpiezaCameraLoading) {
              <div class="p-6 text-center space-y-2" role="status" aria-live="polite">
                <i-lucide name="loader" class="w-7 h-7 text-easydry-blue animate-spin mx-auto" aria-hidden="true"></i-lucide>
                <p class="text-xs font-bold text-slate-300">Iniciando cámara del dispositivo...</p>
              </div>
            }
            @if (limpiezaCameraError) {
              <div class="p-5 text-center space-y-3" role="alert">
                <i-lucide name="alert-circle" class="w-7 h-7 text-rose-400 mx-auto" aria-hidden="true"></i-lucide>
                <p class="text-xs font-bold text-rose-300">{{ limpiezaCameraError }}</p>
                <button type="button" (click)="iniciarCamaraLimpieza()" class="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer">
                  Reintentar acceso a cámara
                </button>
              </div>
            }
            <video #limpiezaVideo autoplay playsinline [class.hidden]="limpiezaCameraLoading || limpiezaCameraError" class="w-full max-h-64 object-contain"></video>
            @if (!limpiezaCameraLoading && !limpiezaCameraError) {
              <div class="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 px-4">
                <button type="button" (click)="cambiarCamaraLimpieza()" title="Cambiar cámara" aria-label="Cambiar cámara"
                  class="p-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition cursor-pointer">
                  <i-lucide name="refresh-cw" class="w-4 h-4" aria-hidden="true"></i-lucide>
                </button>
                <button type="button" (click)="capturarFotoLimpieza()"
                  class="px-5 py-2.5 rounded-full bg-easydry-blue hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition transform active:scale-95 cursor-pointer">
                  <i-lucide name="camera" class="w-4 h-4" aria-hidden="true"></i-lucide>
                  <span>Capturar foto</span>
                </button>
              </div>
            }
          </div>
          @if (limpiezaPreviews.length) {
            <div class="mt-2 flex items-center gap-1.5 flex-wrap">
              @for (foto of limpiezaPreviews; track $index) {
                <div class="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                  <img [src]="foto" class="w-full h-full object-cover" alt="Foto capturada">
                  <button type="button" (click)="quitarFotoLimpieza($index)" title="Quitar foto" aria-label="Quitar foto"
                    class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px] leading-none cursor-pointer">
                    <i-lucide name="x" class="w-2.5 h-2.5" aria-hidden="true"></i-lucide>
                  </button>
                </div>
              }
            </div>
            <p class="text-xs text-slate-500 mt-1">{{ limpiezaPreviews.length }} foto(s) capturada(s).</p>
          }
        </div>
        <div>
          <label for="maq-limpieza-obs" class="field-label">Observaciones (opcional)</label>
          <textarea id="maq-limpieza-obs" [(ngModel)]="limpiezaObservaciones" name="limpieza-obs" rows="2" class="field"></textarea>
        </div>
        @if (limpiezaError) { <div class="estado-error" role="alert">{{ limpiezaError }}</div> }
      </div>
      <div modal-footer>
        <button type="button" (click)="cerrarRegistrarLimpieza()" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarRegistrarLimpieza()" [disabled]="subiendoLimpieza || !limpiezaArchivos.length" class="btn btn-primary w-full sm:w-auto">
          {{ subiendoLimpieza ? 'Subiendo…' : 'Registrar' }}
        </button>
      </div>
    </app-modal>

    <app-maquina-acciones #maquinaAcc (hecho)="onAccionHecha($event)"></app-maquina-acciones>
    <app-trabajo-acciones #trabajoAcc (hecho)="onAccionHecha($event)"></app-trabajo-acciones>
  `,
})
export class MaquinariaDetalleModalComponent implements OnChanges, OnDestroy {
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

  // Cada pestaña con lista tiene la suya, con scroll infinito de a 30 (el cuerpo del modal es el que hace scroll).
  // El servidor ordena las incidencias (no atendidas primero) y los movimientos/eventos (más reciente primero).
  readonly listaInc = new ListaInfinita<Incidente>(
    (page, size) => this.incidenteService
      .getIncidentesPagina({ maquinariaId: this.idMaquina(), page, pageSize: size })
      .pipe(map((r) => r.pagina)),
    PAGE_SIZE_INFINITO,
    (i) => i.id,
  );
  readonly listaMant = new ListaInfinita<Mantenimiento>(
    (page, size) => this.mantenimientoService
      .getMantenimientosPagina({ maquinariaId: this.idMaquina(), page, pageSize: size })
      .pipe(map((r) => r.pagina)),
    PAGE_SIZE_INFINITO,
    (m) => m.id,
  );
  readonly listaMov = new ListaInfinita<MovimientoMaquinaria>(
    (page, size) => this.movimientoService.getMovimientosPagina(this.idMaquina(), page, size),
    PAGE_SIZE_INFINITO,
    (m) => m.id,
  );
  readonly listaLimp = new ListaInfinita<LimpiezaMaquinaria>(
    (page, size) => this.maquinariaService.getLimpiezasPagina({ maquinariaId: this.idMaquina(), page, pageSize: size }),
    PAGE_SIZE_INFINITO,
    (l) => l.id,
  );
  readonly listaLinea = new ListaInfinita<EventoVista>(
    (page, size) => this.maquinariaService
      .getHistorial({ maquinariaId: this.idMaquina(), ...this.filtrosLineaAplicados, page, pageSize: size })
      .pipe(map((p) => ({ ...p, items: p.items.map((e) => this.aVista(e)) }))),
    PAGE_SIZE_INFINITO,
    (ev) => ev.evento.id,
  );
  /** Pestañas cuya lista ya se cargó para esta máquina (se cargan solo al abrirlas). */
  private cargadas = new Set<PestanaMaquina>();
  private filtrosLineaAplicados: { tipos?: string[]; desde?: string; hasta?: string } = {};
  incExpandida: string | number | null = null;
  mantExpandido: string | number | null = null;

  // Filtros de la línea de tiempo
  tiposEvento = TIPOS_EVENTO_MAQUINARIA;
  tiposSeleccionados = new Set<string>();
  filtroDesde = '';
  filtroHasta = '';

  // ---- Roles y permisos de UI (el backend valida siempre) ----
  private get miId(): string { return String(this.authService.getCurrentUser()?.id || ''); }
  private esMio(id?: string | number | null): boolean { return !!id && String(id) === this.miId; }

  get puedeEditar(): boolean { return puedeEditarMaquina(this.authService) || puedeCambiarArchivosMaquina(this.authService); }
  get puedeActivar(): boolean { return puedeActivarMaquina(this.authService); }
  get puedeGestionar(): boolean { return puedeGestionarMaquina(this.authService); }
  get puedeVerLinea(): boolean { return puedeVerTrazabilidad(this.authService); }
  get puedeVerMant(): boolean { return puedeVerMantenimientos(this.authService); }
  get puedeVerInc(): boolean { return puedeVerIncidentes(this.authService); }
  get puedeVerLimp(): boolean { return puedeVerLimpiezas(this.authService); }
  get puedeAgregarEvidencia(): boolean { return puedeAgregarEvidenciaMaquinaria(this.authService); }
  get puedeSubirEvidenciaLimpieza(): boolean {
    return puedeSubirEvidenciaLimpieza(this.authService)
      && (this.authService.isLiderOperador() || this.authService.hasRole('PULIDOR'));
  }
  /**
   * Reportar: con el permiso, sobre máquinas activas. El líder puede reportar cualquier máquina de su agencia
   * (el servidor ya lo valida así); el resto de roles con el permiso, solo la asignada a él.
   */
  get puedeReportar(): boolean {
    if (!puedeReportarIncidente(this.authService) || !this.ficha?.activa) return false;
    if (this.authService.isLiderOperador()) return true;
    return this.esMio(this.ficha?.operadorAsignado?.id);
  }
  get esTaller(): boolean { return String(this.ficha?.agenciaTipo || '').startsWith('TALLER'); }

  get pestanas(): { id: PestanaMaquina; label: string; icono: string }[] {
    const lista: { id: PestanaMaquina; label: string; icono: string }[] = [{ id: 'resumen', label: 'Resumen', icono: 'clipboard-list' }];
    if (this.puedeVerInc) lista.push({ id: 'incidencias', label: 'Incidencias', icono: 'alert-triangle' });
    if (this.puedeVerLinea) lista.push({ id: 'movimientos', label: 'Movimientos', icono: 'refresh-cw' });
    if (this.puedeVerMant) lista.push({ id: 'mantenimientos', label: 'Mantenimientos', icono: 'calendar-clock' });
    if (this.puedeVerLimp && this.ficha?.limpieza.regla) lista.push({ id: 'limpieza', label: 'Limpieza', icono: 'sparkles' });
    if (this.puedeVerLinea) lista.push({ id: 'timeline', label: 'Línea de tiempo', icono: 'history' });
    return lista;
  }

  puedeAsignarInc(i: Incidente): boolean {
    return puedeAsignarTecnico(this.authService) && i.estadoRaw !== 'RESUELTO' && i.estadoRaw !== 'CANCELADO';
  }
  /** Técnico asignado, o coordinador/admin (que puede resolver una no asignada o una propia). */
  puedeResolverInc(i: Incidente): boolean {
    if (i.estadoRaw === 'RESUELTO' || i.estadoRaw === 'CANCELADO' || !puedeResolverIncidentes(this.authService)) return false;
    if (this.puedeGestionar) return !i.tecnicoAsignadoId || this.esMio(i.tecnicoAsignadoId);
    return this.esMio(i.tecnicoAsignadoId);
  }
  puedeEditarInc(i: Incidente): boolean {
    return puedeResolverIncidentes(this.authService) && (this.puedeGestionar || this.esMio(i.tecnicoAsignadoId));
  }
  puedeAsignarMant(m: Mantenimiento): boolean {
    return puedeProgramarMantenimiento(this.authService) && m.estadoRaw !== 'FINALIZADO';
  }
  puedeEjecutarMant(m: Mantenimiento): boolean {
    return m.estadoRaw !== 'FINALIZADO' && puedeEjecutarMantenimientos(this.authService) && this.esMio(m.tecnicoAsignadoId);
  }
  puedeEditarMant(m: Mantenimiento): boolean {
    return puedeEditarMantenimientos(this.authService) && (this.puedeGestionar || this.esMio(m.tecnicoAsignadoId));
  }

  // ---- Carga ----
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['maquinariaId']) {
      this.ficha = null;
      this.errorFicha = '';
      this.destruirListas();
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
    // Cada lista se pide al abrir su pestaña por primera vez (o si quedó desactualizada tras una acción).
    if (!this.cargadas.has(id)) this.cargarPestana(id);
  }

  private idMaquina(): string {
    return String(this.ficha?.id ?? this.maquinariaId ?? '');
  }

  private listaDe(id: PestanaMaquina): { reiniciar(): void } | null {
    switch (id) {
      case 'incidencias': return this.listaInc;
      case 'mantenimientos': return this.listaMant;
      case 'movimientos': return this.listaMov;
      case 'limpieza': return this.listaLimp;
      case 'timeline': return this.listaLinea;
      default: return null;
    }
  }

  private cargarPestana(id: PestanaMaquina): void {
    const lista = this.listaDe(id);
    if (!lista || !this.ficha) return;
    if (id === 'timeline') this.aplicarFiltrosLinea();
    this.cargadas.add(id);
    lista.reiniciar();
  }

  private destruirListas(): void {
    this.listaInc.destruir();
    this.listaMant.destruir();
    this.listaMov.destruir();
    this.listaLimp.destruir();
    this.listaLinea.destruir();
    this.cargadas.clear();
  }

  ngOnDestroy(): void {
    this.destruirListas();
    this.detenerCamaraLimpieza();
  }

  /** Tras una acción: recarga la ficha y la pestaña visible (las demás se piden de nuevo al abrirlas), y avisa al host. */
  onAccionHecha(_evento: string): void {
    void this.cargarFicha(false);
    this.cargadas.clear();
    this.cargarPestana(this.pestana);
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
    if (recargar && this.ficha) this.cargarLinea();
  }

  /** Congela los filtros de la línea de tiempo: el scroll infinito sigue pidiendo con los mismos hasta que se vuelvan a aplicar. */
  private aplicarFiltrosLinea(): void {
    const desde = this.filtroDesde ? new Date(`${this.filtroDesde}T00:00:00`).toISOString() : undefined;
    const hasta = this.filtroHasta ? new Date(`${this.filtroHasta}T23:59:59.999`).toISOString() : undefined;
    this.filtrosLineaAplicados = { tipos: [...this.tiposSeleccionados], desde, hasta };
  }

  /** Aplica los filtros de tipo y fechas: reinicia la línea de tiempo desde el evento más reciente. */
  cargarLinea(): void {
    if (!this.ficha) return;
    this.cargarPestana('timeline');
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

  readonly badgeClase = badgeClase;
  readonly badgeNoAtendido = BADGE_NO_ATENDIDO;

  etiquetaEstado(f: MaquinaFicha): string {
    return (f.estadoOperativo === 'DE_BAJA' || f.activa === false) ? 'De baja' : f.estadoOperativo === 'EN_MANTENIMIENTO' ? 'En mantenimiento' : 'Operativa';
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

  // ---- Registrar limpieza (líder de su agencia, pulidor de la suya; el backend valida de nuevo) ----
  // Las fotos se toman con la cámara del dispositivo (nunca se eligen de archivos ya guardados): así
  // la evidencia es del momento, igual que el resto de evidencias obligatorias del sistema.
  get puedeRegistrarLimpieza(): boolean {
    return this.puedeSubirEvidenciaLimpieza;
  }

  @ViewChild('limpiezaVideo') limpiezaVideoEl?: ElementRef<HTMLVideoElement>;

  limpiezaModalOpen = false;
  limpiezaArchivos: File[] = [];
  limpiezaPreviews: string[] = [];
  limpiezaObservaciones = '';
  limpiezaError = '';
  subiendoLimpieza = false;

  limpiezaCameraLoading = false;
  limpiezaCameraError: string | null = null;
  private limpiezaStream: MediaStream | null = null;
  private limpiezaFacingMode: 'environment' | 'user' = 'environment';

  abrirRegistrarLimpieza(): void {
    this.limpiezaArchivos = [];
    this.limpiezaPreviews = [];
    this.limpiezaObservaciones = '';
    this.limpiezaError = '';
    this.limpiezaModalOpen = true;
    void this.iniciarCamaraLimpieza();
  }

  cerrarRegistrarLimpieza(): void {
    this.detenerCamaraLimpieza();
    this.limpiezaModalOpen = false;
  }

  async iniciarCamaraLimpieza(): Promise<void> {
    this.detenerCamaraLimpieza();
    this.limpiezaCameraLoading = true;
    this.limpiezaCameraError = null;
    try {
      this.limpiezaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.limpiezaFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      this.limpiezaCameraLoading = false;
      setTimeout(() => {
        if (this.limpiezaVideoEl && this.limpiezaStream) {
          this.limpiezaVideoEl.nativeElement.srcObject = this.limpiezaStream;
        }
      }, 100);
    } catch {
      this.limpiezaCameraLoading = false;
      this.limpiezaCameraError = 'No se pudo acceder a la cámara. Revisa los permisos de tu navegador.';
    }
  }

  detenerCamaraLimpieza(): void {
    this.limpiezaStream?.getTracks().forEach((track) => track.stop());
    this.limpiezaStream = null;
  }

  cambiarCamaraLimpieza(): void {
    this.limpiezaFacingMode = this.limpiezaFacingMode === 'environment' ? 'user' : 'environment';
    void this.iniciarCamaraLimpieza();
  }

  async capturarFotoLimpieza(): Promise<void> {
    const video = this.limpiezaVideoEl?.nativeElement;
    if (!video || !this.limpiezaStream) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return;
    const archivo = new File([blob], `limpieza_${Date.now()}.jpg`, { type: 'image/jpeg' });
    this.limpiezaArchivos = [...this.limpiezaArchivos, archivo];
    this.limpiezaPreviews = [...this.limpiezaPreviews, canvas.toDataURL('image/jpeg', 0.85)];
    this.limpiezaError = '';
  }

  quitarFotoLimpieza(indice: number): void {
    this.limpiezaArchivos = this.limpiezaArchivos.filter((_, i) => i !== indice);
    this.limpiezaPreviews = this.limpiezaPreviews.filter((_, i) => i !== indice);
  }

  async confirmarRegistrarLimpieza(): Promise<void> {
    if (!this.limpiezaArchivos.length) {
      this.limpiezaError = 'Captura al menos una foto con la cámara.';
      return;
    }
    const errorArchivos = validarFotos(this.limpiezaArchivos);
    if (errorArchivos) {
      this.limpiezaError = errorArchivos;
      return;
    }
    this.limpiezaError = '';
    const f = this.ficha!;
    this.subiendoLimpieza = true;
    try {
      const urls = await Promise.all(this.limpiezaArchivos.map((archivo) => this.storage.uploadMedia(archivo, {
        category: 'MAQUINARIA_LIMPIEZA',
        type: 'FOTO_LIMPIEZA',
        maquinariaId: f.id,
        maquinariaNombre: f.nombre,
        maquinariaCodigo: f.codigo,
        fileName: archivo.name,
        contentType: archivo.type || 'image/jpeg',
      })));
      await firstValueFrom(this.maquinariaService.registrarLimpieza({
        maquinariaId: f.id,
        fotos: urls.map((url) => ({ url })),
        observaciones: this.limpiezaObservaciones.trim() || undefined,
      }));
      this.cerrarRegistrarLimpieza();
      void this.cargarFicha(false);
      if (this.cargadas.has('limpieza')) this.listaLimp.reiniciar();
      this.cambio.emit();
    } catch (err) {
      this.limpiezaError = mensajeError(err);
    } finally {
      this.subiendoLimpieza = false;
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

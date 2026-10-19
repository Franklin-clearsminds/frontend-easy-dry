import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ServicioLavadoService, ConsultaServicios, ResumenServicios } from '../../core/services/servicio-lavado.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, tap } from 'rxjs/operators';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_INFINITO } from '../../core/config/paginacion';
import { ListaInfinita } from '../../core/utils/lista-infinita';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import { AuthService } from '../../core/services/auth.service';
import { VehiculoServicio } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { VisorMediaService } from '../../shared/services/visor-media.service';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-aprobaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, InfiniteScrollComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Header Banner -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-green/20 text-easydry-green-text text-xs font-bold mb-2">
            <i-lucide aria-hidden="true" name="shield-check" class="w-3.5 h-3.5"></i-lucide>
            <span>Módulo de Cierre Diario y Aprobación Gerencial</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Aprobación Diaria de Servicios</h1>
          <p class="text-slate-500 text-xs mt-1">Revisión de vehículos atendidos hoy, evidencias en video, horarios y confirmación para cierre diario de operaciones.</p>
        </div>

      </div>

      @if (!puedeVer) {
        <p class="estado-vacio" role="status">Tu rol no tiene permiso para consultar servicios, así que no hay nada que aprobar aquí.</p>
      } @else {

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="true"
        [showOperador]="true"
        [showBahia]="true"
        [showEstado]="true"
        [showFechas]="false"
        [showCliente]="true"
        [showBusqueda]="true"
        [listaEstados]="['Todos', 'FINALIZADO', 'APROBADO', 'RECHAZADO']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Day Status Summary Card -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex items-center justify-between">
        <div class="space-y-1">
          <p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Estado de Cierre Operativo</p>
          <h3 class="text-xl font-bold font-outfit">
            @if (esDiaCerrado) {
              <span class="text-emerald-600 font-extrabold flex items-center gap-2">
                <i-lucide aria-hidden="true" name="check-circle-2" class="w-6 h-6"></i-lucide>
                DÍA CERRADO (100% SERVICIOS APROBADOS)
              </span>
            } @else {
              <span class="text-amber-600 font-extrabold flex items-center gap-2">
                <i-lucide aria-hidden="true" name="clock" class="w-6 h-6 animate-pulse"></i-lucide>
                DÍA EN REVISIÓN (SERVICIOS PENDIENTES DE APROBACIÓN)
              </span>
            }
          </h3>
          <p class="text-xs text-slate-200">
            Sucursal: <strong>{{ filtrosGlobales.sucursal === 'Todas' ? 'Todas las sucursales (elige una para cerrar su día)' : filtrosGlobales.sucursal }}</strong>
            • Bahía: <strong>{{ filtrosGlobales.bahia === 'Todas' ? 'Todas las Bahías' : filtrosGlobales.bahia }}</strong>
            • Fecha: <strong>{{ fechaActual }}</strong>
          </p>
        </div>

        <div class="text-right flex flex-col items-end gap-3">
          <div>
            <span class="text-3xl font-extrabold font-outfit text-easydry-lime">{{ totalAprobados }} / {{ totalServicios }}</span>
            <span class="text-xs text-slate-500 block font-semibold">Servicios Aprobados</span>
          </div>
          @if (puedeAprobarTodosPermiso) {
            @if (agenciaObjetivo; as ag) {
              @if (hayDecidiblesEnAgencia) {
                <button
                  type="button"
                  (click)="modalAprobarTodosOpen = true"
                  class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                  <i-lucide aria-hidden="true" name="check-circle-2" class="w-4 h-4"></i-lucide>
                  <span>Aprobar todos de {{ ag.nombre }}</span>
                </button>
              }
            } @else {
              <span class="text-[11px] font-semibold text-slate-500 max-w-[260px]">Para aprobar todos, elige una sucursal en el filtro: el cierre se hace de una agencia a la vez.</span>
            }
          }
        </div>
      </div>

      <!-- Services Grid for Manager Inspection -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (item of lista.items; track item.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-4 flex flex-col justify-between hover:border-easydry-blue/30 transition-colors">

            <div>
              <!-- Top Row OT & Status -->
              <div class="flex items-center justify-between mb-3">
                <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2.5 py-1 rounded-lg">
                  {{ item.ordenTrabajoOT || '—' }}
                </span>

                <span
                  class="px-2.5 py-1 rounded-full text-xs font-extrabold"
                  [ngClass]="{
                    'bg-amber-100 text-amber-800 border border-amber-300': item.estado === 'EN PROCESO',
                    'bg-easydry-blue/15 text-easydry-blue border border-easydry-blue/30': item.estado === 'FINALIZADO',
                    'bg-easydry-green/20 text-easydry-green-text border border-easydry-green/40': item.estado === 'APROBADO',
                    'bg-rose-100 text-rose-800 border border-rose-300': item.estado === 'RECHAZADO'
                  }">
                  {{ item.estado === 'FINALIZADO' ? 'PENDIENTE DE APROBACIÓN' : item.estado }}
                </span>
              </div>

              <!-- Vehicle Detail -->
              <h3 class="font-bold text-slate-900 text-base font-outfit">{{ item.marca }} {{ item.modelo }}</h3>
              <p class="text-xs font-mono font-extrabold text-easydry-blue">{{ item.placa }} • {{ item.color }} ({{ item.anio }})</p>

              <!-- Service Type -->
              <div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 font-bold uppercase text-[11px]">Sucursal / Bahía:</span>
                  <span class="font-bold text-slate-700 text-right truncate max-w-[180px]">{{ item.agencia }} • {{ item.bahia || 'Sin bahía' }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 font-bold uppercase text-[11px]">Servicio:</span>
                  <span class="font-bold text-slate-900">{{ item.servicio }}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 font-bold uppercase text-[11px]">Técnico:</span>
                  <span class="font-bold text-easydry-green-text">{{ item.empleado }}</span>
                </div>
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="text-slate-500 font-bold uppercase text-[11px]">Horarios:</span>
                  <span class="text-slate-700 font-bold">{{ item.horaIngreso || '—' }} - {{ item.horaSalida || '—' }}</span>
                </div>
              </div>

              <!-- Registro de la decisión: quién, cuándo y con qué regla; o motivo del rechazo -->
              @if (item.estado === 'APROBADO' && item.aprobadoPor) {
                <p class="mt-3 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                  Aprobado por {{ item.aprobadoPor }}{{ etiquetaRegla(item) }}{{ item.fechaAprobacion ? ' el ' + (item.fechaAprobacion | date:'dd/MM HH:mm') : '' }}
                </p>
              }
              @if (item.estado === 'RECHAZADO') {
                <p class="mt-3 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  Rechazado{{ item.aprobadoPor ? ' por ' + item.aprobadoPor : '' }}{{ etiquetaRegla(item) }}{{ item.fechaAprobacion ? ' el ' + (item.fechaAprobacion | date:'dd/MM HH:mm') : '' }}
                  @if (item.motivoRechazo) { <span class="block font-medium mt-0.5">Motivo: {{ item.motivoRechazo }}</span> }
                </p>
              }

              <!-- Gerente Observation if existing -->
              @if (item.observacionGerente) {
                <div class="mt-3 p-2.5 bg-easydry-green/10 border border-easydry-green/30 rounded-xl text-xs">
                  <span class="font-bold text-easydry-green-text block text-[11px] uppercase">Observación del aprobador:</span>
                  <p class="text-slate-800 font-medium">{{ item.observacionGerente }}</p>
                </div>
              }
            </div>

            <!-- Card Actions for Gerente -->
            <div class="pt-3 border-t border-slate-100 space-y-2">
              <button
                (click)="verVideo(item)"
                class="w-full py-2 bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                <i-lucide aria-hidden="true" name="film" class="w-3.5 h-3.5 text-easydry-green"></i-lucide>
                <span>Inspeccionar evidencia (vídeos y fotos)</span>
              </button>

              @if (item.estado === 'FINALIZADO') {
                @if (item.agenciaSinAprobador) {
                  <div class="flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
                    <i-lucide aria-hidden="true" name="alert-triangle" class="w-3.5 h-3.5"></i-lucide>
                    <span>Sin aprobador designado</span>
                  </div>
                }
                @if (item.puedeDecidir && puedeDecidirPermiso) {
                  <div class="flex gap-2">
                    @if (puedeAprobarPermiso) {
                    <button
                      type="button"
                      (click)="aprobarIndividual(item)"
                      [disabled]="procesandoId === item.id"
                      class="flex-1 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-colors disabled:opacity-50">
                      Aprobar
                    </button>
                    }
                    @if (puedeRechazarPermiso) {
                    <button
                      type="button"
                      (click)="openModalRechazar(item)"
                      [disabled]="procesandoId === item.id"
                      class="flex-1 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs transition-colors disabled:opacity-50">
                      Rechazar
                    </button>
                    }
                  </div>
                } @else if (!item.agenciaSinAprobador && puedeDecidirPermiso) {
                  <p class="text-center text-[11px] font-semibold text-slate-500 py-1">Lo decide el aprobador de la agencia.</p>
                }
                @if (puedeAnularPermiso) {
                  <button
                    type="button"
                    (click)="abrirModalAnular(item)"
                    class="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition-colors">
                    Anular servicio
                  </button>
                }
              }
              @if (item.estado === 'EN PROCESO' || item.estado === 'EN_PROCESO' || item.estado === 'EN_ESPERA') {
                <div class="flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
                  <i-lucide aria-hidden="true" name="clock" class="w-3.5 h-3.5 animate-pulse"></i-lucide>
                  <span>En progreso — debe finalizarse primero</span>
                </div>
              }
            </div>

          </div>
        }
      </div>

      @if (lista.inicializada && lista.items.length === 0 && !lista.error) {
        <p class="estado-vacio">No hay servicios que coincidan con los filtros aplicados.</p>
      }

      <!-- Scroll infinito: de 30 en 30 -->
      <app-infinite-scroll
        [hasMore]="lista.hasMore"
        [loading]="lista.cargando"
        [error]="lista.error"
        [total]="lista.total"
        (cargarMas)="lista.siguiente()"
        (reintentar)="lista.reintentar()">
      </app-infinite-scroll>

      }

      <!-- Modal: confirmar aprobar todos de una agencia -->
      <app-modal size="md"
        [isOpen]="modalAprobarTodosOpen"
        title="Aprobar todos los servicios de la agencia"
        icon="check-circle-2"
        (close)="modalAprobarTodosOpen = false">
        @if (agenciaObjetivo; as ag) {
          <p class="text-xs text-slate-600">
            Se aprobarán todos los servicios finalizados de <b>{{ ag.nombre }}</b> que tengan evidencia de salida. Quedará registrado tu nombre, la fecha y la regla con la que decides.
            Los que no tengan evidencia se omiten.
          </p>
        }
        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button type="button" (click)="modalAprobarTodosOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button type="button" (click)="aprobarTodos()" [disabled]="aprobandoTodos"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-easydry-green hover:bg-easydry-green-dark text-slate-950 disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center">
            Confirmar aprobación
          </button>
        </div>
      </app-modal>

      <!-- Modal: anular con motivo -->
      <app-modal size="md"
        [isOpen]="modalAnularOpen"
        title="Anular servicio"
        icon="alert-triangle"
        (close)="modalAnularOpen = false">
        @if (servicioAnular) {
          <div class="space-y-3 text-xs">
            <p class="text-slate-600">
              Vas a anular el servicio de <b>{{ servicioAnular.placa }}</b> ({{ servicioAnular.ordenTrabajoOT }}). No se borra: queda el registro de quién, cuándo y por qué. Los insumos se reponen.
            </p>
            <div>
              <label for="aprob-anular-motivo" class="block font-bold text-slate-700 mb-1">Motivo de la anulación * (mínimo 5 caracteres)</label>
              <textarea id="aprob-anular-motivo" [(ngModel)]="motivoAnulacion" name="motivoAnulacion" rows="3"
                class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"></textarea>
            </div>
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

      <!-- Modal: motivo del rechazo -->
      <app-modal size="md"
        [isOpen]="modalRechazarOpen"
        title="Rechazar Servicio"
        icon="alert-triangle"
        (close)="modalRechazarOpen = false">
        @if (servicioRechazar) {
          <div class="space-y-3 text-xs">
            <p class="text-slate-600">
              Vas a rechazar el servicio de <b>{{ servicioRechazar.placa }}</b> ({{ servicioRechazar.marca }} {{ servicioRechazar.modelo }}).
              Escribe el motivo: el operador lo verá y deberá corregirlo.
            </p>
            <div>
              <label for="aprob-motivo" class="block font-bold text-slate-700 mb-1">Motivo del rechazo * (mínimo 5 caracteres)</label>
              <textarea id="aprob-motivo"
                [(ngModel)]="motivoRechazo"
                name="motivoRechazo"
                rows="3"
                placeholder="Ej. La evidencia en video no muestra el vehículo terminado..."
                class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"></textarea>
            </div>
          </div>
        }
        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button type="button" (click)="modalRechazarOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button type="button" (click)="confirmarRechazo()" [disabled]="motivoRechazo.trim().length < 5 || procesandoId === servicioRechazar?.id"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center">
            Confirmar Rechazo
          </button>
        </div>
      </app-modal>

      <!-- Modal: evidencia del servicio. Lista todo lo registrado y cada archivo se abre en el visor común -->
      <app-modal size="md"
        [isOpen]="modalVideoOpen"
        [title]="'Evidencia del servicio: ' + (servicioVideo?.placa || '')"
        icon="film"
        (close)="modalVideoOpen = false">
        @if (servicioVideo) {
          <div class="space-y-4">
            @for (e of evidenciasServicio; track e.url) {
              <button type="button" (click)="abrirEvidencia(e)"
                class="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-easydry-blue transition-colors cursor-pointer text-left">
                <span class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  [ngClass]="e.tipo === 'video' ? 'bg-slate-900 text-white' : 'bg-easydry-blue/10 text-easydry-blue'">
                  <i-lucide aria-hidden="true" [name]="e.tipo === 'video' ? 'play' : 'image'" class="w-5 h-5"></i-lucide>
                </span>
                <span class="flex-1 min-w-0">
                  <span class="block text-sm font-bold text-slate-900">{{ e.etiqueta }}</span>
                  <span class="block text-xs text-slate-500">{{ e.tipo === 'video' ? 'Clic para reproducir' : 'Clic para ver en grande' }}</span>
                </span>
              </button>
            } @empty {
              <p class="estado-vacio">Este servicio no tiene evidencia multimedia registrada.</p>
            }
            <div class="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p class="font-bold text-slate-900">{{ servicioVideo.marca }} {{ servicioVideo.modelo }} ({{ servicioVideo.placa }})</p>
              <p class="text-slate-500">Orden: <strong>{{ servicioVideo.ordenTrabajoOT }}</strong> • Atendido por: <strong>{{ servicioVideo.empleado }}</strong></p>
            </div>
          </div>
        }
        <div modal-footer>
          <button (click)="modalVideoOpen = false" class="btn btn-secondary w-full sm:w-auto">Cerrar</button>
        </div>
      </app-modal>
    </div>
  `
})
export class AprobacionesComponent implements OnInit, OnDestroy {
  readonly fechaActual = new Intl.DateTimeFormat('es-EC', { dateStyle: 'long' }).format(new Date());
  servicioSeleccionado?: VehiculoServicio;
  servicioRechazar?: VehiculoServicio;
  servicioVideo?: VehiculoServicio;

  /** Tarjetas con scroll infinito de 30; los filtros, la búsqueda y el alcance por rol los resuelve el servidor. */
  readonly lista = new ListaInfinita<VehiculoServicio>(
    (page, size) =>
      this.servicioService
        .getServiciosPagina({ ...this.consulta(), page, pageSize: size, sortField: 'fecha', sortOrder: 'desc', incluirResumen: page === 1 })
        .pipe(
          tap((r) => { if (r.resumen) this.resumen = r.resumen; }),
          map((r) => r.pagina),
        ),
    PAGE_SIZE_INFINITO,
    (s) => s.id,
  );
  /** Contadores de los filtros vigentes (menos el de estado). */
  resumen: ResumenServicios | null = null;

  modalRechazarOpen = false;
  modalVideoOpen = false;
  modalAprobarTodosOpen = false;
  modalAnularOpen = false;
  motivoRechazo = '';
  motivoAnulacion = '';
  servicioAnular?: VehiculoServicio;
  /** Servicio que se está aprobando o rechazando (evita doble clic). */
  procesandoId: string | number | null = null;
  aprobandoTodos = false;
  anulando = false;

  private servicioService = inject(ServicioLavadoService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  readonly storageUploadService = inject(StorageUploadService);
  private readonly visorMedia = inject(VisorMediaService);

  get totalAprobados(): number { return this.resumen?.porEstado?.['APROBADO'] ?? 0; }
  get totalServicios(): number { return this.resumen?.total ?? 0; }

  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy', marca: 'Todas' };
  filtroTexto = '';
  private busquedaAplicada = '';
  private readonly busqueda$ = new Subject<string>();
  private busquedaSub?: Subscription;

  get esDiaCerrado() {
    return this.totalServicios > 0 && this.totalAprobados === this.totalServicios;
  }

  aplicarNuevosFiltros(filtros: FilterState) {
    const previo = this.huellaFiltros(this.filtrosGlobales);
    this.filtrosGlobales = filtros;
    const texto = (filtros.busqueda ?? '').trim();
    this.filtroTexto = texto;
    if (previo !== this.huellaFiltros(filtros)) {
      if (texto.length === 0 || texto.length >= BUSQUEDA_MIN_CARACTERES) this.busquedaAplicada = texto;
      this.lista.reiniciar();
      return;
    }
    if (texto.length === 0 || texto.length >= BUSQUEDA_MIN_CARACTERES) this.busqueda$.next(texto);
  }

  private huellaFiltros(f: FilterState): string {
    const { busqueda, ...resto } = f;
    return JSON.stringify(resto);
  }

  private neutro(v: string | undefined | null, ...neutros: string[]): string {
    const t = (v ?? '').trim();
    return !t || neutros.includes(t) ? '' : t;
  }

  /** Estado del filter-bar → valor del servidor. "FINALIZADO" aquí significa finalizado y aún sin aprobar. */
  private estadoServidor(): string | undefined {
    switch (this.neutro(this.filtrosGlobales.estado, 'Todos')) {
      case 'FINALIZADO': return 'POR_APROBAR';
      case 'APROBADO': return 'APROBADO';
      case 'RECHAZADO': return 'RECHAZADO';
      default: return undefined;
    }
  }

  private consulta(): ConsultaServicios {
    const f = this.filtrosGlobales;
    const alcance = this._getFiltrosUsuario() || {};
    return {
      search: this.busquedaAplicada,
      estado: this.estadoServidor(),
      agenciaId: alcance.agenciaId,
      regionId: alcance.regionId,
      agenciaNombre: this.neutro(f.sucursal, 'Todas') || undefined,
      bahiaNombre: this.neutro(f.bahia, 'Todas') || undefined,
      operadorNombre: this.neutro(f.operador, 'Todos') || undefined,
      clienteNombre: this.neutro(f.marca || f.cliente, 'Todas', 'Todos') || undefined,
    };
  }

  ngOnInit(): void {
    this.busquedaSub = this.busqueda$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaAplicada = texto;
        this.lista.reiniciar();
      });
    // Sin permiso de lectura de servicios no se llama al servidor: la pantalla avisa y no muestra nada.
    if (!this.puedeVer) return;

    // Quien trabaja en el ámbito de UNA agencia (p. ej. el aprobador) arranca con su sucursal en el filtro.
    const user = this.authService.getCurrentUser();
    if (user?.ambito === 'AGENCIA' && user.sucursalNombre) {
      this.filtrosGlobales.sucursal = user.sucursalNombre;
    }
    this.lista.reiniciar();
  }

  ngOnDestroy(): void {
    this.busquedaSub?.unsubscribe();
    this.lista.destruir();
  }

  /** Alcance del usuario según su ámbito (el servidor lo aplica igual; esto solo acota lo que se pide). */
  private _getFiltrosUsuario(): { agenciaId?: string; regionId?: string } | undefined {
    const user = this.authService.getCurrentUser();
    if (user?.ambito === 'AGENCIA' && user.agenciaId) return { agenciaId: String(user.agenciaId) };
    if (user?.ambito === 'REGION' && user.regionId) return { regionId: String(user.regionId) };
    return undefined;
  }

  // ── Permisos (los mismos que exige el servidor en cada endpoint) ──
  get puedeVer(): boolean { return this.authService.puede('servicios.ver'); }
  get puedeAprobarPermiso(): boolean { return this.authService.puede('aprobaciones.aprobar'); }
  get puedeRechazarPermiso(): boolean { return this.authService.puede('aprobaciones.rechazar'); }
  get puedeAprobarTodosPermiso(): boolean { return this.authService.puede('aprobaciones.aprobar.todos'); }
  get puedeDecidirPermiso(): boolean { return this.puedeAprobarPermiso || this.puedeRechazarPermiso; }
  get puedeAnularPermiso(): boolean { return this.authService.puede('aprobaciones.anular'); }

  /** Agencia sobre la que opera «Aprobar todos»: la del filtro (su id sale de los servicios cargados) o la del ámbito del usuario. */
  get agenciaObjetivo(): { id: string; nombre: string } | null {
    const user = this.authService.getCurrentUser();
    const nombreFiltro = this.neutro(this.filtrosGlobales.sucursal, 'Todas');
    if (nombreFiltro) {
      const conId = this.lista.items.find((s) => s.agenciaId && s.agencia === nombreFiltro);
      if (conId?.agenciaId) return { id: String(conId.agenciaId), nombre: nombreFiltro };
      if (user?.agenciaId && (user.sucursalNombre === nombreFiltro)) return { id: String(user.agenciaId), nombre: nombreFiltro };
      return null;
    }
    if (user?.ambito === 'AGENCIA' && user.agenciaId) {
      return { id: String(user.agenciaId), nombre: user.sucursalNombre || 'tu agencia' };
    }
    return null;
  }

  /** Hay al menos un servicio finalizado de la agencia objetivo que el usuario puede decidir ahora. */
  get hayDecidiblesEnAgencia(): boolean {
    const ag = this.agenciaObjetivo;
    if (!ag) return false;
    return this.lista.items.some((s) => s.estado === 'FINALIZADO' && s.puedeDecidir && String(s.agenciaId) === ag.id);
  }

  /** " (aprobador de la agencia)" o " (respaldo)" según la regla con la que se decidió. */
  etiquetaRegla(item: VehiculoServicio): string {
    if (item.reglaDecision === 'TITULAR') return ' (aprobador de la agencia)';
    if (item.reglaDecision === 'RESPALDO') return ' (respaldo: la agencia no tenía aprobador)';
    return '';
  }

  private mensajeError(err: any, porDefecto: string): string {
    const msg = err?.error?.message || err?.message || porDefecto;
    return Array.isArray(msg) ? msg.join('. ') : msg;
  }

  aprobarIndividual(item: VehiculoServicio) {
    if (item.estado !== 'FINALIZADO' || !item.puedeDecidir) {
      this.toastService.warning('No disponible', 'Este servicio no lo puedes aprobar ahora.');
      return;
    }
    this.procesandoId = item.id;
    this.servicioService.aprobarServicioGerente(item.id).subscribe({
      next: () => {
        this.procesandoId = null;
        this.toastService.success('Servicio aprobado', `${item.placa} aprobado.`);
        this.lista.reiniciar();
      },
      error: (err) => {
        this.procesandoId = null;
        this.toastService.error('No se pudo aprobar', this.mensajeError(err, 'No se pudo aprobar el servicio.'));
        this.lista.reiniciar();
      }
    });
  }

  openModalRechazar(item: VehiculoServicio) {
    this.servicioRechazar = item;
    this.motivoRechazo = '';
    this.modalRechazarOpen = true;
  }

  confirmarRechazo() {
    const servicio = this.servicioRechazar;
    const motivo = this.motivoRechazo.trim();
    if (!servicio || motivo.length < 5) {
      this.toastService.warning('Motivo requerido', 'Escribe el motivo del rechazo (mínimo 5 caracteres).');
      return;
    }
    this.procesandoId = servicio.id;
    this.servicioService.rechazarServicioGerente(servicio.id, motivo).subscribe({
      next: () => {
        this.procesandoId = null;
        this.toastService.success('Servicio rechazado', `${servicio.placa} volvió al operador con tu motivo.`);
        this.modalRechazarOpen = false;
        this.lista.reiniciar();
      },
      error: (err) => {
        this.procesandoId = null;
        this.toastService.error('No se pudo rechazar', this.mensajeError(err, 'No se pudo rechazar el servicio.'));
      }
    });
  }

  abrirModalAnular(item: VehiculoServicio) {
    this.servicioAnular = item;
    this.motivoAnulacion = '';
    this.modalAnularOpen = true;
  }

  confirmarAnulacion() {
    const servicio = this.servicioAnular;
    const motivo = this.motivoAnulacion.trim();
    if (!servicio || motivo.length < 5) {
      this.toastService.warning('Motivo requerido', 'Escribe el motivo de la anulación (mínimo 5 caracteres).');
      return;
    }
    this.anulando = true;
    this.servicioService.anularServicio(servicio.id, motivo).subscribe({
      next: () => {
        this.anulando = false;
        this.modalAnularOpen = false;
        this.toastService.success('Servicio anulado', `${servicio.placa} quedó anulado con tu motivo.`);
        this.lista.reiniciar();
      },
      error: (err) => {
        this.anulando = false;
        this.toastService.error('No se pudo anular', this.mensajeError(err, 'No se pudo anular el servicio.'));
      }
    });
  }

  /** Cierre de UNA agencia: el servidor solo aprueba lo que el usuario puede decidir y devuelve cuántos y cuántos omitió. */
  aprobarTodos() {
    const ag = this.agenciaObjetivo;
    if (!ag) {
      this.toastService.warning('Elige una agencia', 'Selecciona una sucursal en el filtro: el cierre se hace de una agencia a la vez.');
      return;
    }
    this.aprobandoTodos = true;
    this.servicioService.aprobarTodosLosServiciosDelDia(ag.id).subscribe({
      next: (r) => {
        this.aprobandoTodos = false;
        this.modalAprobarTodosOpen = false;
        this.toastService.success('Cierre registrado', r.mensaje || `Se aprobaron ${r.aprobadosCount} servicios de ${ag.nombre}.`);
        this.lista.reiniciar();
      },
      error: (err) => {
        this.aprobandoTodos = false;
        this.toastService.error('No se pudo aprobar todos', this.mensajeError(err, 'No se pudo cerrar el día de la agencia.'));
      }
    });
  }

  /** Evidencias del servicio abierto: video de ingreso, video de salida y fotos, cada una con su nombre. */
  evidenciasServicio: { tipo: 'video' | 'imagen'; etiqueta: string; url: string }[] = [];

  verVideo(item: VehiculoServicio): void {
    this.servicioVideo = item;
    const lista: { tipo: 'video' | 'imagen'; etiqueta: string; url: string }[] = [];
    const agregar = (etiqueta: string, url?: string | null) => {
      const limpia = String(url ?? '').trim();
      if (!limpia || lista.some((e) => e.url === limpia)) return;
      lista.push({ tipo: this.visorMedia.tipoDe(limpia) === 'video' ? 'video' : 'imagen', etiqueta, url: limpia });
    };
    // `videoUrl` del servidor es «el final, o el inicial si no hay final»: solo sirve si no llegaron los dos de verdad.
    agregar('Video de ingreso', item.videoInicialUrl);
    agregar('Video de salida', item.videoFinalUrl);
    if (!item.videoInicialUrl && !item.videoFinalUrl) agregar('Video del servicio', item.videoUrl || item.video);
    agregar('Foto de ingreso', item.fotoIngresoUrl);
    agregar('Foto de salida', item.fotoSalidaUrl);
    this.evidenciasServicio = lista;
    this.modalVideoOpen = true;
  }

  abrirEvidencia(e: { tipo: 'video' | 'imagen'; etiqueta: string; url: string }): void {
    void this.visorMedia.abrir(e.url, { titulo: `${e.etiqueta}: ${this.servicioVideo?.placa ?? ''}`.trim(), tipo: e.tipo });
  }
}

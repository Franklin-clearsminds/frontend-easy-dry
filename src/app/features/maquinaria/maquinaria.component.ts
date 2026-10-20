import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { BahiaService } from '../../core/services/bahia.service';
import { AuthService } from '../../core/services/auth.service';
import { Maquinaria, Sucursal, Bahia } from '../../core/models';
import { puedeCrearMaquina, puedeGestionarMaquina, puedeTrasladarMaquina } from '../../core/utils/maquinaria-permisos';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_INFINITO } from '../../core/config/paginacion';
import { ListaInfinita } from '../../core/utils/lista-infinita';
import { ConsultaMaquinaria } from '../../core/services/maquinaria.service';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { ThumbSrcDirective } from '../../shared/directives/thumb-src.directive';
import { MaquinariaDetalleModalComponent } from './maquinaria-detalle-modal/maquinaria-detalle-modal.component';
import { MaquinaAccionesComponent } from './maquina-acciones/maquina-acciones.component';
import { mensajeError } from './trabajo-acciones/trabajo-acciones.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { badgeClase, BADGE_NO_ATENDIDO } from '../../core/utils/badges';
import { fechaProgramadaLocal, fechaProgramadaISO } from '../../core/utils/evidencia-maquinaria';

@Component({
  selector: 'app-maquinaria',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, InfiniteScrollComponent, FilterBarComponent, ThumbSrcDirective, MaquinariaDetalleModalComponent, MaquinaAccionesComponent, SkeletonLoaderComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Inventario & Movimientos de Maquinaria</h1>
          <p class="text-slate-500 text-xs mt-1">Control de activos industriales, asignación a sucursales/bahías y trazabilidad de transferencias.</p>
        </div>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar
        [showSucursal]="canTransfer"
        [showOperador]="false"
        [showBahia]="true"
        [showRegion]="true"
        [showCliente]="true"
        [showEstado]="true"
        [showFechas]="false"
        [showBusqueda]="true"
        placeholderBusqueda="Buscar por código de activo (ej. HD-001), nombre o modelo..."
        [listaEstados]="['Todos', 'Operativa', 'Mantenimiento', 'Fuera de Servicio']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Ficha de Selección Sucursal -> Bahía (Punto 7: Responsable, Ubicación, Estado) -->
      @if (filtrosGlobales.sucursal !== 'Todas' || filtrosGlobales.bahia !== 'Todas') {
        <div class="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in shadow-2xs">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-easydry-blue text-white flex items-center justify-center font-bold">
              <i-lucide name="wrench" class="w-5 h-5" aria-hidden="true"></i-lucide>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-extrabold text-slate-900 text-sm font-outfit">{{ filtrosGlobales.sucursal }} — {{ filtrosGlobales.bahia }}</h4>
                <span class="badge-ok">
                  Estado: Activo & Operativo
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                <strong>Ubicación:</strong> Módulo de Lavado / Estación Técnica · <strong>Responsable Agencia:</strong> <span class="text-purple-700 font-bold">{{ getResponsableEquipo(filtrosGlobales.sucursal) }}</span>
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Encabezado de Lista de Activos -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="font-bold text-slate-900 text-base font-outfit">Inventario Físico y Maquinaria Asignada</h3>
          <p class="text-xs text-slate-500 mt-1">
            Visualización y control de estado de todos los equipos registrados en el sistema.
          </p>
        </div>
        @if (canCreate) {
          <button
            type="button"
            (click)="abrirModalCrear()"
            class="btn btn-cta">
            <i-lucide name="plus" class="w-4 h-4" aria-hidden="true"></i-lucide>
            <span class="hidden sm:inline">Registrar Nuevo Activo</span>
            <span class="sm:hidden">Registrar Activo</span>
          </button>
        }
      </div>

      @if (lista.cargando && lista.items.length === 0) {
        <div role="status" aria-live="polite">
          <span class="sr-only">Cargando maquinaria…</span>
          <app-skeleton-loader type="cards"></app-skeleton-loader>
        </div>
      }

      <!-- Equipment Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (maq of lista.items; track maq.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden group hover:shadow-easydry-hover transition-shadow duration-300 flex flex-col justify-between">

            <div>
              <div class="h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                <div class="w-full h-full flex flex-col items-center justify-center text-slate-600 absolute inset-0 select-none">
                  <i-lucide aria-hidden="true" name="wrench" class="w-10 h-10 stroke-[1.5] text-slate-700"></i-lucide>
                  <span class="text-[10px] text-slate-600 font-medium mt-1">EasyDry® Activo</span>
                </div>
                <img loading="lazy" decoding="async" [appThumb]="urlMedia(maq.imagen)" [alt]="'Foto de ' + maq.nombre" (error)="$any($event.target).classList.add('opacity-0')" class="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90">
                <div class="absolute top-3 left-3 px-3 py-1 rounded-lg bg-easydry-blue/90 text-white text-xs font-mono font-bold backdrop-blur-xs z-20">
                  {{ maq.codigo }}
                </div>

                <div class="absolute top-3 right-3 z-20">
                  <span class="inline-flex rounded-full bg-white shadow-xs">
                    <span [class]="badgeClase('maquina', maq.estado, { activa: maq.activa })">
                      {{ maq.activa === false ? 'De baja' : maq.estado }}
                    </span>
                  </span>
                </div>
              </div>

              <div class="p-5 space-y-3">
                <h3 class="font-bold text-slate-900 text-base font-outfit leading-tight group-hover:text-easydry-blue transition-colors">
                  {{ maq.nombre }}
                </h3>
                <p class="text-xs text-slate-500 font-semibold">{{ maq.marca }} • {{ maq.modelo }}</p>

                <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-slate-500 text-[11px] block uppercase font-bold">Sucursal</span>
                    <span class="font-bold text-slate-800">{{ maq.agencia }}</span>
                  </div>
                  <div>
                    <span class="text-slate-500 text-[11px] block uppercase font-bold">Bahía</span>
                    <span class="font-bold text-easydry-blue">{{ maq.bahia }}</span>
                  </div>
                </div>

                <div class="p-2 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                  <span class="text-slate-500 font-medium">Operador asignado:</span>
                  <span class="font-bold text-slate-900">{{ maq.operadorAsignadoNombre || 'Sin asignar' }}</span>
                </div>

                <div class="p-2 rounded-xl text-xs flex items-center justify-between" [ngClass]="maquinaVencida(maq) ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50'">
                  <span class="text-slate-500 font-medium">Próximo mantenimiento:</span>
                  @if (maq.proximoMantenimiento) {
                    <span class="font-bold" [ngClass]="maquinaVencida(maq) ? 'text-rose-700' : 'text-slate-900'">
                      {{ fechaProg(maq.proximoMantenimiento) }}{{ maquinaVencida(maq) ? ' (vencido)' : '' }}
                    </span>
                  } @else {
                    <span class="font-bold text-slate-500">Sin programar</span>
                  }
                </div>

                @if ((maq.incidentesNoAtendidos || 0) > 0 || (maq.mantenimientosVencidos || 0) > 0) {
                  <div class="flex flex-wrap gap-1.5">
                    @if ((maq.incidentesNoAtendidos || 0) > 0) {
                      <span [class]="badgeNoAtendido">{{ maq.incidentesNoAtendidos }} incidencia(s) no atendida(s)</span>
                    }
                    @if ((maq.mantenimientosVencidos || 0) > 0) {
                      <span [class]="badgeNoAtendido">{{ maq.mantenimientosVencidos }} mantenimiento(s) vencido(s)</span>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Card Actions -->
            <div class="p-5 pt-0" [ngClass]="canTransfer ? 'grid grid-cols-2 gap-2' : 'flex'">
              @if (canTransfer) {
                <button
                  type="button"
                  (click)="abrirTransferir(maq)"
                  class="btn btn-secondary">
                  <i-lucide name="refresh-cw" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                  <span>Transferir / Asignar</span>
                </button>
              }
              <button
                type="button"
                (click)="abrirDetalle(maq)"
                class="btn btn-primary"
                [ngClass]="canTransfer ? '' : 'w-full'">
                <i-lucide name="hard-drive" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                <span>Detalle & Trazabilidad</span>
              </button>
            </div>


          </div>
        }
      </div>

      @if (lista.inicializada && lista.items.length === 0 && !lista.error) {
        <p class="estado-vacio">No hay maquinaria para los filtros seleccionados.</p>
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

      <!-- Modal de detalle reutilizable: Resumen, Incidencias, Movimientos, Mantenimientos y Línea de tiempo -->
      <app-maquinaria-detalle-modal
        [maquinariaId]="detalleId"
        (cerrar)="detalleId = null"
        (cambio)="recargar()">
      </app-maquinaria-detalle-modal>

      <!-- Diálogos de acciones sobre la máquina (transferir desde la tarjeta) -->
      <app-maquina-acciones #maqAcc (hecho)="recargar()"></app-maquina-acciones>

      <!-- Modal Crear Maquinaria -->
      <app-modal
        [isOpen]="modalCrearOpen"
        title="Registrar Nuevo Activo de Maquinaria"
        icon="hard-drive" size="lg"
        (close)="modalCrearOpen = false">

        <form (ngSubmit)="guardarNuevaMaquinaria()" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="maq-codigo" class="field-label">Código Activo</label>
              <input id="maq-codigo" type="text" [(ngModel)]="nuevaMaquina.codigo" name="codigo" placeholder="ej. HD-006"
                [ngClass]="{ 'field-error': erroresMaquina.codigo }"
                class="field font-mono placeholder:text-slate-500" required
                (input)="erroresMaquina.codigo = ''">
              @if (erroresMaquina.codigo) {
                <p class="field-help" role="alert">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                  {{ erroresMaquina.codigo }}
                </p>
              }
            </div>
            <div>
              <label for="maq-nombre" class="field-label">Nombre del Equipo</label>
              <input id="maq-nombre" type="text" [(ngModel)]="nuevaMaquina.nombre" name="nombre" placeholder="Hidrolavadora HD-006"
                [ngClass]="{ 'field-error': erroresMaquina.nombre }"
                class="field placeholder:text-slate-500" required
                (input)="erroresMaquina.nombre = ''">
              @if (erroresMaquina.nombre) {
                <p class="field-help" role="alert">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                  {{ erroresMaquina.nombre }}
                </p>
              }
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="maq-agencia" class="field-label">Sucursal Asignada</label>
                <select id="maq-agencia" [(ngModel)]="nuevaMaquina.agencia" (ngModelChange)="onCambioSucursalNuevaMaquina($event)" name="agencia" class="field select-chevron font-semibold cursor-pointer">
                  <option value="" disabled>Seleccione una sucursal</option>
                @if (sucursales.length > 0) {
                  @for (s of sucursales; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }}</option>
                  }
                }
              </select>
            </div>
            <div>
              <label for="maq-bahia" class="field-label">Bahía</label>
              <select id="maq-bahia" [(ngModel)]="nuevaMaquina.bahia" name="bahia"
                [ngClass]="{ 'field-error': erroresMaquina.bahia }"
                class="field select-chevron font-semibold cursor-pointer" required
                (change)="erroresMaquina.bahia = ''">
                @for (b of getBahiasDisponibles(nuevaMaquina.agencia); track b) {
                  <option [value]="b">{{ b }}</option>
                }
              </select>
              @if (erroresMaquina.bahia) {
                <p class="field-help" role="alert">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                  {{ erroresMaquina.bahia }}
                </p>
              }
            </div>
          </div>

          <!-- SECCIÓN: FOTO DE LA MÁQUINA (OBLIGATORIA) -->
          <div class="space-y-2 pt-2 border-t border-slate-100">
            <label for="maq-foto" class="field-label flex flex-wrap items-center justify-between gap-1">
              <span class="flex items-center gap-1.5">
                <i-lucide name="camera" class="w-4 h-4 text-easydry-blue" aria-hidden="true"></i-lucide>
                Foto de la Máquina <span class="text-rose-500" aria-hidden="true">*</span>
              </span>
              <span class="text-[11px] text-slate-500 font-normal normal-case tracking-normal">PNG, JPG o WebP (máx. 5 MB)</span>
            </label>

            @if (nuevaMaquina.imagen) {
              <!-- Preview de Foto Cargada -->
              <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                <div class="relative w-full sm:w-36 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-2xs flex-shrink-0 bg-slate-900">
                  <img loading="lazy" decoding="async" [src]="nuevaMaquina.imagen" alt="Foto de la Máquina" class="w-full h-full object-cover">
                  <div class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[11px] text-white font-bold backdrop-blur-xs">
                    Foto lista
                  </div>
                </div>
                <div class="space-y-2 flex-1 w-full text-left">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                    <p class="text-xs font-bold text-slate-800">Foto cargada exitosamente</p>
                  </div>
                  <p class="text-xs text-slate-500">Puedes cambiar la foto subiendo un nuevo archivo desde tu dispositivo.</p>
                  <div class="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      (click)="fotoMaquinaInput.click()"
                      class="btn btn-secondary btn-sm">
                      <i-lucide name="upload" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide>
                      <span>Subir Otra Foto</span>
                    </button>
                    <button
                      type="button"
                      (click)="eliminarFotoMaquina()"
                      class="btn btn-danger btn-sm">
                      <i-lucide name="trash-2" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <!-- Uploader sin foto -->
              <div
                role="button" tabindex="0" aria-label="Subir la foto de la máquina"
                (click)="fotoMaquinaInput.click()"
                (keydown.enter)="fotoMaquinaInput.click()"
                (keydown.space)="$event.preventDefault(); fotoMaquinaInput.click()"
                [ngClass]="erroresMaquina.imagen ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-100' : 'border-slate-200 hover:border-easydry-blue bg-slate-50/70 hover:bg-blue-50/20'"
                class="border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors group focus-visible:ring-2 focus-visible:ring-easydry-blue">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 group-hover:border-blue-300 flex items-center justify-center text-slate-400 group-hover:text-easydry-blue transition-colors shadow-2xs mb-2">
                  <i-lucide name="camera" class="w-6 h-6" aria-hidden="true"></i-lucide>
                </div>
                <p class="text-xs font-bold text-slate-800 group-hover:text-easydry-blue transition-colors">
                  Haz clic aquí para subir la foto de la máquina
                </p>
                <p class="text-xs text-slate-500 mt-0.5">Sube la foto del equipo desde tu computadora o dispositivo móvil</p>
              </div>
              @if (erroresMaquina.imagen) {
                <p class="field-help" role="alert">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                  {{ erroresMaquina.imagen }}
                </p>
              }
            }

            <input
              id="maq-foto"
              type="file"
              #fotoMaquinaInput
              tabindex="-1"
              (change)="onSubirFotoMaquina($event)"
              accept="image/*"
              class="sr-only">
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-100">
            <label for="maq-ficha" class="field-label">Imagen de ficha técnica</label>
            <label class="block border-2 border-dashed border-slate-200 hover:border-easydry-blue focus-within:ring-2 focus-within:ring-easydry-blue rounded-2xl p-5 text-center cursor-pointer bg-slate-50/70">
              <i-lucide name="image-plus" class="w-8 h-8 text-easydry-blue mx-auto mb-2" aria-hidden="true"></i-lucide>
              <p class="text-xs font-bold text-slate-800">Sube la ficha técnica (opcional)</p>
              <p class="text-xs text-slate-500 mt-1">Se guarda tal cual, sin recortar ni ajustar</p>
              <input id="maq-ficha" type="file" accept="image/*" (change)="onSeleccionarFichaTecnica($event)" class="sr-only">
            </label>
            @if (fichaPendientePreview) {
              <img loading="lazy" decoding="async" [src]="fichaPendientePreview" alt="Vista previa ficha" class="w-full max-h-56 object-contain rounded-xl border border-slate-200 bg-white">
            }
          </div>
        </form>

        <div modal-footer>
          <button type="button" (click)="modalCrearOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button type="button" (click)="guardarNuevaMaquinaria()" [disabled]="guardandoActivo" class="btn btn-primary w-full sm:w-auto">{{ guardandoActivo ? 'Guardando...' : 'Guardar Activo' }}</button>
        </div>
      </app-modal>

    </div>
  `
})
export class MaquinariaComponent implements OnInit, OnDestroy {
  /** Tarjetas con scroll infinito: de 30 en 30, con búsqueda y filtros resueltos en el servidor. */
  readonly lista = new ListaInfinita<Maquinaria>(
    (page, size) => this.maquinariaService.getMaquinariaPagina({ ...this.consulta(), page, pageSize: size }),
    PAGE_SIZE_INFINITO,
    (m) => m.id,
  );
  sucursales: Sucursal[] = [];
  todasLasBahias: Bahia[] = [];

  /** Id de la máquina cuyo detalle está abierto (modal reutilizable con pestañas). */
  detalleId: string | number | null = null;

  modalCrearOpen = false;
  guardandoActivo = false;
  cargando = false;
  readonly badgeClase = badgeClase;
  readonly badgeNoAtendido = BADGE_NO_ATENDIDO;
  fichaPendienteFile: File | null = null;
  fichaPendientePreview = '';
  fotoMaquinaFile: File | null = null;

  nuevaMaquina = {
    codigo: '',
    nombre: '',
    marca: '',
    modelo: '',
    agencia: '',
    bahia: '',
    estado: 'Operativa' as Maquinaria['estado'],
    fechaMantenimiento: '',
    imagen: '',
    fichaTecnicaUrl: ''
  };

  erroresMaquina = {
    codigo: '',
    nombre: '',
    bahia: '',
    imagen: ''
  };

  filtroTexto = '';
  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', cliente: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  private busquedaAplicada = '';
  private readonly busqueda$ = new Subject<string>();
  private busquedaSub?: Subscription;

  private maquinariaService = inject(MaquinariaService);
  private sucursalService = inject(SucursalService);
  private bahiaService = inject(BahiaService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);
  private storageUpload = inject(StorageUploadService);

  @ViewChild('maqAcc') maqAcc!: MaquinaAccionesComponent;

  aplicarNuevosFiltros(filtros: FilterState) {
    const previo = this.huellaFiltros(this.filtrosGlobales);
    this.filtrosGlobales = filtros;
    const texto = (filtros.busqueda ?? '').trim();
    this.filtroTexto = texto;
    if (previo !== this.huellaFiltros(filtros)) {
      // Cambió un filtro (no el texto): se consulta ya.
      if (texto.length === 0 || texto.length >= BUSQUEDA_MIN_CARACTERES) this.busquedaAplicada = texto;
      this.lista.reiniciar();
      return;
    }
    // Solo cambió el texto: espera 300 ms tras la última tecla y exige 2 letras (o vacío para quitar el filtro).
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

  /** Filtros vigentes para el servidor: el filter-bar emite nombres y el servidor los entiende (exactos, sin distinguir mayúsculas). */
  private consulta(): ConsultaMaquinaria {
    const f = this.filtrosGlobales;
    const c: ConsultaMaquinaria = {
      search: this.busquedaAplicada,
      agenciaNombre: this.neutro(f.sucursal, 'Todas') || undefined,
      bahiaNombre: this.neutro(f.bahia, 'Todas') || undefined,
      regionNombre: this.neutro(f.region, 'Todas') || undefined,
      clienteNombre: this.neutro(f.cliente || f.marca, 'Todas', 'Todos') || undefined,
    };
    switch (this.neutro(f.estado, 'Todos')) {
      case 'Operativa': c.estadoOperativo = 'OPERATIVA'; c.activa = true; break;
      case 'Mantenimiento': c.estadoOperativo = 'EN_MANTENIMIENTO'; break;
      case 'Fuera de Servicio': c.activa = false; break;
    }
    return c;
  }

  ngOnInit(): void {
    this.busquedaSub = this.busqueda$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaAplicada = texto;
        this.lista.reiniciar();
      });
    this.recargar();
  }

  /** Sucursales/bahías solo hacen falta en el modal "Registrar Nuevo Activo": antes se pedían siempre al entrar
   * a la pantalla, aunque el usuario nunca fuera a registrar nada. */
  private catalogosMaquinariaCargados = false;
  private cargarCatalogosMaquinariaSiHaceFalta(): void {
    if (this.catalogosMaquinariaCargados) return;
    this.catalogosMaquinariaCargados = true;
    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
      this.aplicarDefaultSucursalNuevaMaquina();
    });
    this.bahiaService.getBahias().subscribe(list => {
      this.todasLasBahias = list;
    });
  }

  /** Reaplica el default de sucursal/bahía si el catálogo llegó después de abrir el modal (primera vez). */
  private aplicarDefaultSucursalNuevaMaquina(): void {
    if (!this.modalCrearOpen || this.nuevaMaquina.agencia) return;
    const sucursalInicial = this.sucursales[0]?.nombre || '';
    if (!sucursalInicial) return;
    this.nuevaMaquina.agencia = sucursalInicial;
    this.nuevaMaquina.bahia = this.getBahiasDisponibles(sucursalInicial)[0] || '';
  }

  ngOnDestroy(): void {
    this.busquedaSub?.unsubscribe();
    this.lista.destruir();
  }

  /** Vuelve a la primera página; el backend ya filtra lo que cada rol puede ver. */
  recargar(): void {
    this.lista.reiniciar();
  }

  /** Transferir (agencia, bahía o taller): permiso maquinaria.gestionar. */
  get canTransfer() {
    return puedeTrasladarMaquina(this.authService);
  }

  /** Crear máquina: permiso maquinaria.crear. */
  get canCreate() {
    return puedeCrearMaquina(this.authService);
  }

  getResponsableEquipo(sucursal: string): string {
    return sucursal?.trim() || 'Sin asignar';
  }

  /** Fecha del próximo mantenimiento (dd/mm/aaaa), lista para mostrar en la tarjeta. */
  fechaProg(iso?: string | null): string {
    return fechaProgramadaLocal(iso);
  }

  /** Vencido: hay un próximo mantenimiento programado con fecha ya pasada. */
  maquinaVencida(maq: Maquinaria): boolean {
    const iso = maq.proximoMantenimiento;
    if (!iso) return false;
    const fecha = fechaProgramadaISO(iso);
    if (!fecha) return false;
    return fecha < fechaProgramadaISO(new Date().toISOString());
  }

  abrirDetalle(maq: Maquinaria) {
    this.detalleId = maq.id;
  }

  /** Atajo desde la tarjeta: carga la ficha y abre el diálogo de transferencia. */
  abrirTransferir(maq: Maquinaria) {
    this.maquinariaService.getDetalle(maq.id).subscribe({
      next: ficha => void this.maqAcc.transferir(ficha),
      error: err => this.toastService.error('No se pudo abrir', mensajeError(err)),
    });
  }

  urlMedia(url?: string | null): string {
    return this.storageUpload.resolveBackendUrl(url);
  }

  onSeleccionarFichaTecnica(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toastService.warning('Archivo inválido', 'La ficha técnica debe ser una imagen.');
      input.value = '';
      return;
    }
    if (this.fichaPendientePreview) URL.revokeObjectURL(this.fichaPendientePreview);
    this.fichaPendienteFile = file;
    this.fichaPendientePreview = URL.createObjectURL(file);
    input.value = '';
  }

  private limpiarFichaPendiente(): void {
    if (this.fichaPendientePreview) URL.revokeObjectURL(this.fichaPendientePreview);
    this.fichaPendienteFile = null;
    this.fichaPendientePreview = '';
  }

  private async subirFichaPendiente(nombre: string, agenciaId?: string, maquinariaId?: string, codigo?: string): Promise<string> {
    if (!this.fichaPendienteFile) return '';
    return this.storageUpload.uploadMedia(this.fichaPendienteFile, {
      category: 'MAQUINARIA_FICHA',
      type: 'FICHA_TECNICA',
      agenciaId,
      maquinariaId,
      maquinariaNombre: nombre,
      maquinariaCodigo: codigo,
      fileName: this.fichaPendienteFile.name || 'ficha-tecnica.jpg',
      contentType: this.fichaPendienteFile.type || 'image/jpeg',
    });
  }

  private async subirFotoPendiente(nombre: string, agenciaId?: string, maquinariaId?: string, codigo?: string): Promise<string> {
    if (!this.fotoMaquinaFile) return this.nuevaMaquina.imagen || '';
    return this.storageUpload.uploadMedia(this.fotoMaquinaFile, {
      category: 'MAQUINARIA_IMAGEN',
      type: 'FOTO_MAQUINA',
      agenciaId,
      maquinariaId,
      maquinariaNombre: nombre,
      maquinariaCodigo: codigo,
      fileName: this.fotoMaquinaFile.name || 'foto-maquina.jpg',
      contentType: this.fotoMaquinaFile.type || 'image/jpeg',
    });
  }

  getBahiasDisponibles(sucursalNombre: string): string[] {
    if (!sucursalNombre) return [];
    return this.todasLasBahias
      .filter(b => b.sucursalNombre === sucursalNombre || b.agenciaNombre === sucursalNombre)
      .map(b => b.nombre);
  }

  onCambioSucursalNuevaMaquina(sucursalNombre: string): void {
    this.nuevaMaquina.agencia = sucursalNombre;
    const suc = this.sucursales.find(s => s.nombre === sucursalNombre);
    if (suc?.id) {
      this.bahiaService.getBahiasPorSucursal(suc.id).subscribe(bahias => {
        const otras = this.todasLasBahias.filter(b => String(b.sucursalId) !== String(suc.id) && String(b.agenciaId) !== String(suc.id));
        this.todasLasBahias = [...otras, ...bahias];
        if (!this.nuevaMaquina.bahia && bahias.length > 0) {
          this.nuevaMaquina.bahia = bahias[0].nombre;
        }
      });
    }
    const bahias = this.getBahiasDisponibles(sucursalNombre);
    this.nuevaMaquina.bahia = bahias[0] || '';
    this.erroresMaquina.bahia = '';
  }

  abrirModalCrear() {
    this.cargarCatalogosMaquinariaSiHaceFalta();
    const sucursalInicial = this.sucursales[0]?.nombre || '';
    const bahiasIniciales = this.getBahiasDisponibles(sucursalInicial);
    this.nuevaMaquina = {
      codigo: '',
      nombre: '',
      marca: '',
      modelo: '',
      agencia: sucursalInicial,
      bahia: bahiasIniciales[0] || '',
      estado: 'Operativa',
      fechaMantenimiento: new Date().toISOString().substring(0, 10),
      imagen: '',
      fichaTecnicaUrl: ''
    };
    this.erroresMaquina = { codigo: '', nombre: '', bahia: '', imagen: '' };
    this.limpiarFichaPendiente();
    this.limpiarFotoPendiente();
    this.modalCrearOpen = true;
  }

  onSubirFotoMaquina(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.warning('Tamaño Excedido', 'La imagen no debe superar los 5 MB.');
      input.value = '';
      return;
    }
    if (this.nuevaMaquina.imagen?.startsWith('blob:')) {
      URL.revokeObjectURL(this.nuevaMaquina.imagen);
    }
    this.fotoMaquinaFile = file;
    this.nuevaMaquina.imagen = URL.createObjectURL(file);
    this.erroresMaquina.imagen = '';
    input.value = '';
    this.toastService.success('Foto Cargada', 'Se ha cargado la foto de la máquina.');
  }

  eliminarFotoMaquina(): void {
    this.limpiarFotoPendiente();
  }

  private limpiarFotoPendiente(): void {
    if (this.nuevaMaquina.imagen?.startsWith('blob:')) {
      URL.revokeObjectURL(this.nuevaMaquina.imagen);
    }
    this.fotoMaquinaFile = null;
    this.nuevaMaquina.imagen = '';
  }

  sucursalIdDeNombre(nombre?: string): string | undefined {
    if (!nombre) return undefined;
    const sucursal = this.sucursales.find(s => s.nombre === nombre);
    return sucursal?.id != null ? String(sucursal.id) : undefined;
  }

  bahiaIdDeNombre(sucursalNombre?: string, bahiaNombre?: string): string | undefined {
    if (!sucursalNombre || !bahiaNombre) return undefined;
    const bahia = this.todasLasBahias.find(b =>
      (b.sucursalNombre === sucursalNombre || b.agenciaNombre === sucursalNombre) && b.nombre === bahiaNombre
    );
    return bahia?.id != null ? String(bahia.id) : undefined;
  }

  async guardarNuevaMaquinaria() {
    this.erroresMaquina = { codigo: '', nombre: '', bahia: '', imagen: '' };
    let valido = true;

    if (!this.nuevaMaquina.codigo?.trim()) {
      this.erroresMaquina.codigo = 'El código del activo es obligatorio.';
      valido = false;
    }
    if (!this.nuevaMaquina.nombre?.trim()) {
      this.erroresMaquina.nombre = 'El nombre del equipo es obligatorio.';
      valido = false;
    }
    if (!this.nuevaMaquina.bahia?.trim()) {
      this.erroresMaquina.bahia = 'Indique la bahía de destino.';
      valido = false;
    }
    if (!this.nuevaMaquina.imagen?.trim()) {
      this.erroresMaquina.imagen = 'Debes subir la foto de la máquina obligatoriamente.';
      valido = false;
    }

    if (!valido) {
      this.toastService.warning('Campos Requeridos', 'Complete los campos marcados en rojo.');
      return;
    }

    this.guardandoActivo = true;
    try {
      let sucursalId = this.sucursalIdDeNombre(this.nuevaMaquina.agencia);
      const bahiaId = this.bahiaIdDeNombre(this.nuevaMaquina.agencia, this.nuevaMaquina.bahia);

      if (bahiaId) {
        const bahiaObj = this.todasLasBahias.find(b => String(b.id) === String(bahiaId));
        if (bahiaObj?.sucursalId || bahiaObj?.agenciaId) {
          sucursalId = String(bahiaObj.sucursalId || bahiaObj.agenciaId);
        }
      }

      const codigo = this.nuevaMaquina.codigo.trim();

      this.nuevaMaquina.imagen = await this.subirFotoPendiente(
        this.nuevaMaquina.nombre,
        sucursalId,
        undefined,
        codigo,
      );

      if (this.fichaPendienteFile) {
        this.nuevaMaquina.fichaTecnicaUrl = await this.subirFichaPendiente(
          this.nuevaMaquina.nombre,
          sucursalId,
          undefined,
          codigo,
        );
      }

      this.maquinariaService.crearMaquinaria({
        ...this.nuevaMaquina,
        sucursalId,
        bahiaId,
      } as Omit<Maquinaria, 'id'>).subscribe({
        next: creada => {
          this.guardandoActivo = false;
          this.limpiarFichaPendiente();
          this.limpiarFotoPendiente();
          this.toastService.success('Activo Guardado', `Equipo ${creada.codigo} registrado exitosamente.`);
          this.modalCrearOpen = false;
          this.recargar();
        },
        error: err => {
          this.guardandoActivo = false;
          this.toastService.error('No se pudo guardar', mensajeError(err));
        },
      });
    } catch {
      this.guardandoActivo = false;
      this.toastService.error('Error de subida', 'No se pudo guardar la foto o la ficha técnica en S3.');
    }
  }
}

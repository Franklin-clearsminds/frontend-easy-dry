import { MemoLista } from '../../core/utils/memo-lista';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MaquinariaService } from '../../core/services/maquinaria.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { BahiaService } from '../../core/services/bahia.service';
import { AuthService } from '../../core/services/auth.service';
import { Maquinaria, Sucursal, Bahia } from '../../core/models';
import { puedeCrearMaquina, puedeGestionarMaquina } from '../../core/utils/maquinaria-permisos';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { ThumbSrcDirective } from '../../shared/directives/thumb-src.directive';
import { MaquinariaDetalleModalComponent } from './maquinaria-detalle-modal/maquinaria-detalle-modal.component';
import { MaquinaAccionesComponent } from './maquina-acciones/maquina-acciones.component';
import { mensajeError } from './trabajo-acciones/trabajo-acciones.component';

@Component({
  selector: 'app-maquinaria',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent, ThumbSrcDirective, MaquinariaDetalleModalComponent, MaquinaAccionesComponent],
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
              <i-lucide name="wrench" class="w-5 h-5"></i-lucide>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-extrabold text-slate-900 text-sm font-outfit">{{ filtrosGlobales.sucursal }} — {{ filtrosGlobales.bahia }}</h4>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
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
            (click)="abrirModalCrear()"
            class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide name="plus" class="w-4 h-4"></i-lucide>
            <span class="hidden sm:inline">Registrar Nuevo Activo</span>
            <span class="sm:hidden">Registrar Activo</span>
          </button>
        }
      </div>

      <!-- Equipment Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (maq of paginatedMaquinaria; track maq.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden group hover:shadow-easydry-hover transition-all duration-300 flex flex-col justify-between">
            
            <div>
              <div class="h-44 bg-slate-900 relative overflow-hidden">
                <img loading="lazy" decoding="async" [appThumb]="urlMedia(maq.imagen)" [alt]="maq.nombre" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90">
                <div class="absolute top-3 left-3 px-3 py-1 rounded-lg bg-easydry-blue/90 text-white text-xs font-mono font-bold backdrop-blur-xs">
                  {{ maq.codigo }}
                </div>

                <div class="absolute top-3 right-3">
                  <span 
                    class="px-3 py-1 rounded-full text-xs font-bold shadow-xs"
                    [ngClass]="{
                      'bg-easydry-green text-slate-950': maq.estado === 'Operativa',
                      'bg-amber-400 text-slate-950': maq.estado === 'Mantenimiento',
                      'bg-rose-500 text-white': maq.estado === 'Fuera de Servicio'
                    }">
                    {{ maq.activa === false ? 'De baja' : maq.estado }}
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
                    <span class="text-slate-400 text-[10px] block uppercase font-bold">Sucursal</span>
                    <span class="font-bold text-slate-800">{{ maq.agencia }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 text-[10px] block uppercase font-bold">Bahía</span>
                    <span class="font-bold text-easydry-blue">{{ maq.bahia }}</span>
                  </div>
                </div>

                <div class="p-2 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                  <span class="text-slate-500 font-medium">Operador asignado:</span>
                  <span class="font-bold text-slate-900">{{ maq.operadorAsignadoNombre || 'Sin asignar' }}</span>
                </div>

                @if ((maq.incidentesNoAtendidos || 0) > 0 || (maq.mantenimientosVencidos || 0) > 0) {
                  <div class="flex flex-wrap gap-1.5">
                    @if ((maq.incidentesNoAtendidos || 0) > 0) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">{{ maq.incidentesNoAtendidos }} incidencia(s) no atendida(s)</span>
                    }
                    @if ((maq.mantenimientosVencidos || 0) > 0) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">{{ maq.mantenimientosVencidos }} mantenimiento(s) vencido(s)</span>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Card Actions -->
            <div class="p-5 pt-0" [ngClass]="canTransfer ? 'grid grid-cols-2 gap-2' : 'flex'">
              @if (canTransfer) {
                <button 
                  (click)="abrirTransferir(maq)"
                  class="py-2 bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1">
                  <i-lucide name="refresh-cw" class="w-3.5 h-3.5"></i-lucide>
                  <span>Transferir</span>
                </button>
              }
              <button 
                (click)="abrirDetalle(maq)"
                class="py-2 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                [ngClass]="canTransfer ? '' : 'w-full'">
                <i-lucide name="hard-drive" class="w-3.5 h-3.5"></i-lucide>
                <span>Detalle & Trazabilidad</span>
              </button>
            </div>


          </div>
        }
      </div>

      <div class="mt-6">
        <app-pagination 
          [totalItems]="maquinasFiltradas.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

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
        icon="hard-drive"
        (close)="modalCrearOpen = false">
        
        <form (ngSubmit)="guardarNuevaMaquinaria()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Código Activo</label>
              <input type="text" [(ngModel)]="nuevaMaquina.codigo" name="codigo" placeholder="ej. HD-006" 
                [ngClass]="erroresMaquina.codigo ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
                class="w-full p-2.5 border rounded-xl text-sm font-mono" required
                (input)="erroresMaquina.codigo = ''">
              @if (erroresMaquina.codigo) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresMaquina.codigo }}
                </p>
              }
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Equipo</label>
              <input type="text" [(ngModel)]="nuevaMaquina.nombre" name="nombre" placeholder="Hidrolavadora HD-006" 
                [ngClass]="erroresMaquina.nombre ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
                class="w-full p-2.5 border rounded-xl text-sm" required
                (input)="erroresMaquina.nombre = ''">
              @if (erroresMaquina.nombre) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresMaquina.nombre }}
                </p>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal Asignada</label>
                <select [(ngModel)]="nuevaMaquina.agencia" (ngModelChange)="onCambioSucursalNuevaMaquina($event)" name="agencia" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white cursor-pointer">
                  <option value="" disabled>Seleccione una sucursal</option>
                @if (sucursales.length > 0) {
                  @for (s of sucursales; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }}</option>
                  }
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía</label>
              <select [(ngModel)]="nuevaMaquina.bahia" name="bahia" 
                [ngClass]="erroresMaquina.bahia ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
                class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white cursor-pointer" required
                (change)="erroresMaquina.bahia = ''">
                @for (b of getBahiasDisponibles(nuevaMaquina.agencia); track b) {
                  <option [value]="b">{{ b }}</option>
                }
              </select>
              @if (erroresMaquina.bahia) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresMaquina.bahia }}
                </p>
              }
            </div>
          </div>

          <!-- SECCIÓN: FOTO DE LA MÁQUINA (OBLIGATORIA) -->
          <div class="space-y-2 pt-2 border-t border-slate-100">
            <label class="block text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <i-lucide name="camera" class="w-4 h-4 text-easydry-blue"></i-lucide>
                Foto de la Máquina <span class="text-rose-500">*</span>
              </span>
              <span class="text-[10px] text-slate-400 font-normal">PNG, JPG o WebP (máx. 5 MB)</span>
            </label>

            @if (nuevaMaquina.imagen) {
              <!-- Preview de Foto Cargada -->
              <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                <div class="relative w-full sm:w-36 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-2xs flex-shrink-0 bg-slate-900">
                  <img loading="lazy" decoding="async" [src]="nuevaMaquina.imagen" alt="Foto de la Máquina" class="w-full h-full object-cover">
                  <div class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-bold backdrop-blur-xs">
                    Foto lista
                  </div>
                </div>
                <div class="space-y-2 flex-1 w-full text-left">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <p class="text-xs font-bold text-slate-800">Foto cargada exitosamente</p>
                  </div>
                  <p class="text-[11px] text-slate-500">Puedes cambiar la foto subiendo un nuevo archivo desde tu dispositivo.</p>
                  <div class="flex items-center gap-2 flex-wrap pt-1">
                    <button 
                      type="button" 
                      (click)="fotoMaquinaInput.click()"
                      class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
                      <i-lucide name="upload" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                      <span>Subir Otra Foto</span>
                    </button>
                    <button 
                      type="button" 
                      (click)="eliminarFotoMaquina()"
                      class="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
                      <i-lucide name="trash-2" class="w-3.5 h-3.5"></i-lucide>
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <!-- Uploader sin foto -->
              <div 
                (click)="fotoMaquinaInput.click()" 
                [ngClass]="erroresMaquina.imagen ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-100' : 'border-slate-200 hover:border-easydry-blue bg-slate-50/70 hover:bg-blue-50/20'"
                class="border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all group">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 group-hover:border-blue-300 flex items-center justify-center text-slate-400 group-hover:text-easydry-blue transition-colors shadow-2xs mb-2">
                  <i-lucide name="camera" class="w-6 h-6"></i-lucide>
                </div>
                <p class="text-xs font-bold text-slate-800 group-hover:text-easydry-blue transition-colors">
                  Haz clic aquí para subir la foto de la máquina
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5">Sube la foto del equipo desde tu computadora o dispositivo móvil</p>
              </div>
              @if (erroresMaquina.imagen) {
                <p class="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                  {{ erroresMaquina.imagen }}
                </p>
              }
            }

            <input 
              type="file" 
              #fotoMaquinaInput 
              (change)="onSubirFotoMaquina($event)" 
              accept="image/*" 
              class="hidden">
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-100">
            <label class="block text-xs font-bold text-slate-700 uppercase">Imagen de ficha técnica</label>
            <label class="block border-2 border-dashed border-slate-200 hover:border-easydry-blue rounded-2xl p-5 text-center cursor-pointer bg-slate-50/70">
              <i-lucide name="image-plus" class="w-8 h-8 text-easydry-blue mx-auto mb-2"></i-lucide>
              <p class="text-xs font-bold text-slate-800">Sube la ficha técnica (opcional)</p>
              <p class="text-[11px] text-slate-400 mt-1">Se guarda tal cual, sin recortar ni ajustar</p>
              <input type="file" accept="image/*" (change)="onSeleccionarFichaTecnica($event)" class="hidden">
            </label>
            @if (fichaPendientePreview) {
              <img loading="lazy" decoding="async" [src]="fichaPendientePreview" alt="Vista previa ficha" class="w-full max-h-56 object-contain rounded-xl border border-slate-200 bg-white">
            }
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalCrearOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
          <button (click)="guardarNuevaMaquinaria()" [disabled]="guardandoActivo" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50">{{ guardandoActivo ? 'Guardando...' : 'Guardar Activo' }}</button>
        </div>
      </app-modal>

    </div>
  `
})
export class MaquinariaComponent implements OnInit {
  maquinas: Maquinaria[] = [];
  sucursales: Sucursal[] = [];
  todasLasBahias: Bahia[] = [];

  /** Id de la máquina cuyo detalle está abierto (modal reutilizable con pestañas). */
  detalleId: string | number | null = null;

  modalCrearOpen = false;
  guardandoActivo = false;
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

  // Mapa sucursal -> región (para el filtro de región)
  mapaRegionSucursal: Record<string, string> = {};
  // Mapa sucursal -> marca (para el filtro de marca)
  mapaMarcaSucursal: Record<string, string> = {};

  currentPage = 1;
  pageSize = 6;

  private maquinariaService = inject(MaquinariaService);
  private sucursalService = inject(SucursalService);
  private bahiaService = inject(BahiaService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);
  private storageUpload = inject(StorageUploadService);

  @ViewChild('maqAcc') maqAcc!: MaquinaAccionesComponent;

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    if (filtros.busqueda !== undefined) {
      this.filtroTexto = filtros.busqueda;
    }
    this.currentPage = 1;
  }

  ngOnInit(): void {
    this.recargar();

    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
      this.mapaRegionSucursal = {};
      this.mapaMarcaSucursal = {};
      list.forEach(s => {
        if (s.nombre && s.regionNombre) this.mapaRegionSucursal[s.nombre] = s.regionNombre;
        const cNom = s.clienteNombre || s.marcaNombre;
        if (s.nombre && cNom) this.mapaMarcaSucursal[s.nombre] = cNom;
      });
    });

    this.bahiaService.getBahias().subscribe(list => {
      this.todasLasBahias = list;
    });
  }

  /** Recarga la lista; el backend ya filtra lo que cada rol puede ver. */
  recargar(): void {
    this.maquinariaService.getMaquinaria().subscribe(list => {
      this.maquinas = list;
    });
  }

  private get rol(): string {
    return String(this.authService.getCurrentUser()?.role || '');
  }

  /** Transferir (agencia, bahía o taller): COORD_MANTENIMIENTO, ADMIN, SUPER_ADMIN. */
  get canTransfer() {
    return puedeGestionarMaquina(this.rol);
  }

  /** Crear máquina: ADMIN, SUPER_ADMIN, COORD_BODEGA. */
  get canCreate() {
    return puedeCrearMaquina(this.rol);
  }

  private readonly memoFiltradas = new MemoLista();

  /** Se recalcula solo cuando cambian la lista o los filtros (antes se filtraba en cada revisión de pantalla). */
  get maquinasFiltradas() {
    return this.memoFiltradas.obtener(
      [
        this.maquinas, this.maquinas.length, this.filtroTexto, JSON.stringify(this.filtrosGlobales),
        this.mapaRegionSucursal, Object.keys(this.mapaRegionSucursal || {}).length,
        this.mapaMarcaSucursal, Object.keys(this.mapaMarcaSucursal || {}).length,
      ],
      () => this.calcularMaquinasFiltradas(),
    );
  }

  private calcularMaquinasFiltradas() {
    let resultados = this.maquinas.filter(m => {
      const q = this.filtroTexto.toLowerCase();
      return !this.filtroTexto ||
        m.nombre.toLowerCase().includes(q) ||
        m.codigo.toLowerCase().includes(q) ||
        (m.modelo || '').toLowerCase().includes(q) ||
        (m.numeroSerie || '').toLowerCase().includes(q);
    });

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(m => m.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(m => m.agencia === this.filtrosGlobales.sucursal);
    }
    if (this.filtrosGlobales.bahia !== 'Todas') {
      resultados = resultados.filter(m => m.bahia === this.filtrosGlobales.bahia);
    }
    if (this.filtrosGlobales.region && this.filtrosGlobales.region !== 'Todas') {
      resultados = resultados.filter(m => this.mapaRegionSucursal[m.agencia] === this.filtrosGlobales.region);
    }
    const fCliente = this.filtrosGlobales.cliente || this.filtrosGlobales.marca;
    if (fCliente && fCliente !== 'Todas' && fCliente !== 'Todos') {
      resultados = resultados.filter(m => this.mapaMarcaSucursal[m.agencia] === fCliente);
    }

    return resultados;
  }

  get paginatedMaquinaria() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.maquinasFiltradas.slice(start, start + this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  getResponsableEquipo(sucursal: string): string {
    return sucursal?.trim() || 'Sin asignar';
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
      .filter(b => b.sucursalNombre === sucursalNombre)
      .map(b => b.nombre);
  }

  onCambioSucursalNuevaMaquina(sucursalNombre: string): void {
    this.nuevaMaquina.agencia = sucursalNombre;
    const bahias = this.getBahiasDisponibles(sucursalNombre);
    this.nuevaMaquina.bahia = bahias[0] || '';
    this.erroresMaquina.bahia = '';
  }

  abrirModalCrear() {
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
      const sucursalId = this.sucursalIdDeNombre(this.nuevaMaquina.agencia);
      const bahiaId = this.bahiaIdDeNombre(this.nuevaMaquina.agencia, this.nuevaMaquina.bahia);
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

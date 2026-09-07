import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ServicioLavadoMockService } from '../../core/services/servicio-lavado-mock.service';
import { MaquinariaMockService } from '../../core/services/maquinaria-mock.service';
import { IncidenteMockService } from '../../core/services/incidente-mock.service';
import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../shared/services/toast.service';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { BahiaMockService } from '../../core/services/bahia-mock.service';
import { ArchivoAdjunto, Bahia, Incidente, Maquinaria, Sucursal, VehiculoServicio } from '../../core/models';
import { Role } from '../../core/models/roles.model';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-mi-bahia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, ModalComponent, DataTableComponent, FilterBarComponent, StatCardComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Encabezado de Contexto del Operador / Super Admin -->
      <div class="bg-gradient-to-r from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep rounded-3xl p-6 text-white relative overflow-hidden">
        <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-green/20 text-easydry-lime border border-easydry-green/40 text-xs font-bold mb-3">
              <i-lucide name="map-pin" class="w-3.5 h-3.5"></i-lucide>
              <span>Mi Área de Trabajo</span>
            </div>
            <h1 class="text-2xl font-extrabold font-outfit">{{ user.nombre }} {{ user.apellido }}</h1>
            <p class="text-easydry-lime font-semibold text-sm mt-1">
              {{ isOperadorEspeciales ? 'Operador de Servicios Especiales' : (isSuperAdmin ? 'Supervisión de Bahía' : 'Operador de Bahía') }}
            </p>
          </div>

          <div class="flex items-center gap-4 mt-3 flex-wrap">
            <!-- Chip Responsable Agencia -->
            <div class="flex items-center gap-2 text-slate-200 text-sm">
              <i-lucide name="shield" class="w-4 h-4 text-purple-300"></i-lucide>
              <span class="font-semibold">Responsable Agencia: {{ responsableAgencia }}</span>
            </div>

            <!-- Chip Operador -->
            <div class="flex items-center gap-2 text-slate-200 text-sm">
              <i-lucide name="user" class="w-4 h-4 text-cyan-300"></i-lucide>
              <span class="font-semibold">Operador: {{ isSuperAdmin ? operadorAsignadoTexto : (user.nombre + ' ' + user.apellido) }}</span>
            </div>
          </div>
        </div>
        <div class="absolute -right-16 -bottom-16 w-72 h-72 bg-easydry-green/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      <!-- KPIs del Operador -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <app-stat-card title="Servicios Hoy" [value]="misServicios.length" icon="car" variant="primary"></app-stat-card>
        <app-stat-card title="En Proceso" [value]="enProceso" icon="clock" variant="warning"></app-stat-card>
        <app-stat-card title="Finalizados" [value]="finalizados" icon="check-circle-2" variant="success"></app-stat-card>
        <app-stat-card title="Aprobados" [value]="aprobados" icon="award" variant="primary"></app-stat-card>
      </div>

      <!-- Filtros de Marca -->
      <app-filter-bar
        [showMarca]="true"
        [showRegion]="true"
        [showSucursal]="true"
        [showBahia]="true"
        [showEstado]="false"
        [showFechas]="false"
        [showBusqueda]="true"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Mis Servicios del Día -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <!-- Cabecera de la sección -->
        <div class="p-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 class="font-bold text-slate-900 text-lg font-outfit">Servicios del Día</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ isSuperAdmin ? 'Servicios registrados en la bahía y sucursal seleccionada' : 'Solo ves tus registros en tu bahía asignada' }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
            @if (puedeReportarFalla) {
              <button
                (click)="abrirModalReportarFalla()"
                class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer">
                <i-lucide name="alert-triangle" class="w-4 h-4"></i-lucide>
                <span class="hidden sm:inline">Reportar Falla</span>
                <span class="sm:hidden">Falla</span>
              </button>
            }
            <a routerLink="/servicios"
              class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
              <i-lucide name="plus-circle" class="w-4 h-4"></i-lucide>
              <span class="hidden sm:inline">Registrar Servicio</span>
              <span class="sm:hidden">Servicio</span>
            </a>
          </div>
        </div>

        <!-- Tabla paginada -->
        <app-data-table
          [columns]="serviciosColumns"
          [data]="misServiciosTabla"
          [actions]="serviciosActions"
          [pageSize]="8"
          [searchable]="false"
          searchPlaceholder="Buscar por placa, OT, servicio..."
          [showToolbar]="true"
          (actionClick)="onServicioAction($event)">
        </app-data-table>
      </div>

      <!-- Modal Detalle Servicio (Mobile) -->
      <app-modal 
        [isOpen]="modalDetalleOpen" 
        [title]="'Detalle: ' + (servicioDetalleSeleccionado?.placa || '')" 
        icon="info"
        (close)="modalDetalleOpen = false">
        
        @if (servicioDetalleSeleccionado) {
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Nº OT</span>
                <span class="font-mono font-extrabold text-easydry-blue">{{ servicioDetalleSeleccionado.ordenTrabajoOT }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Vehículo</span>
                <span class="font-bold text-slate-800">{{ servicioDetalleSeleccionado.marca }} {{ servicioDetalleSeleccionado.modelo }}</span>
                <span class="block text-[10px] text-slate-500 mt-0.5">{{ servicioDetalleSeleccionado.color }}</span>
              </div>
            </div>

            <div class="p-3 bg-easydry-blue/5 rounded-xl border border-easydry-blue/10 text-xs">
              <span class="block text-[10px] text-easydry-blue font-bold uppercase mb-1">Servicio</span>
              <span class="font-bold text-slate-800 text-sm block mb-0.5">{{ servicioDetalleSeleccionado.servicio }}</span>
              <span class="text-slate-500 font-semibold">{{ servicioDetalleSeleccionado.categoriaServicio }}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Sucursal / Bahía</span>
                <span class="font-bold text-slate-800 block">{{ servicioDetalleSeleccionado.agencia }}</span>
                <span class="text-slate-500 mt-0.5">{{ servicioDetalleSeleccionado.bahia || 'Bahía 1' }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Horarios</span>
                <span class="font-bold text-slate-800 block">Ingreso: {{ servicioDetalleSeleccionado.horaIngreso || '08:30' }}</span>
                <span class="text-slate-500 mt-0.5">Salida: {{ servicioDetalleSeleccionado.horaSalida || '09:30' }}</span>
              </div>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
              <div>
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Operador</span>
                <span class="font-bold text-slate-800">{{ servicioDetalleSeleccionado.empleado }}</span>
              </div>
              <div class="text-right">
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Estado</span>
                <span class="font-extrabold" [ngClass]="{
                  'text-amber-600': servicioDetalleSeleccionado.estado === 'EN PROCESO',
                  'text-easydry-blue': servicioDetalleSeleccionado.estado === 'FINALIZADO',
                  'text-easydry-green-dark': servicioDetalleSeleccionado.estado === 'APROBADO',
                  'text-rose-600': servicioDetalleSeleccionado.estado === 'RECHAZADO'
                }">{{ servicioDetalleSeleccionado.estado }}</span>
              </div>
            </div>
            <!-- Evidencia multimedia -->
            @if (servicioDetalleSeleccionado.foto || (servicioDetalleSeleccionado.fotos && servicioDetalleSeleccionado.fotos!.length > 0) || servicioDetalleSeleccionado.video || servicioDetalleSeleccionado.videoUrl) {
              <div class="border-t border-slate-100 pt-3 space-y-3">
                <span class="block text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <i-lucide name="image" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                  Evidencia del Servicio
                </span>

                <!-- Fotos -->
                @if (servicioDetalleSeleccionado.fotos && servicioDetalleSeleccionado.fotos!.length > 0) {
                  <div class="grid grid-cols-3 gap-2">
                    @for (fotoUrl of servicioDetalleSeleccionado.fotos!; track fotoUrl) {
                      <a [href]="fotoUrl" target="_blank" class="block">
                        <img [src]="fotoUrl" alt="Evidencia" class="w-full h-20 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity">
                      </a>
                    }
                  </div>
                } @else if (servicioDetalleSeleccionado.foto) {
                  <a [href]="servicioDetalleSeleccionado.foto" target="_blank" class="block">
                    <img [src]="servicioDetalleSeleccionado.foto" alt="Evidencia" class="w-full h-32 object-cover rounded-xl border border-slate-200 hover:opacity-90 transition-opacity">
                  </a>
                }

                <!-- Video -->
                @if (servicioDetalleSeleccionado.video || servicioDetalleSeleccionado.videoUrl) {
                  <div class="rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                    <div class="flex items-center gap-2 px-3 py-2 bg-slate-800">
                      <i-lucide name="film" class="w-4 h-4 text-purple-400"></i-lucide>
                      <span class="text-xs font-bold text-slate-300">Video del servicio</span>
                    </div>
                    <video
                      [src]="servicioDetalleSeleccionado.videoUrl || servicioDetalleSeleccionado.video"
                      controls
                      class="w-full max-h-56 bg-black"
                      preload="metadata">
                      Tu navegador no soporta la reproducción de video.
                    </video>
                  </div>
                }
              </div>
            }
          </div>
        }

        <div modal-footer class="flex flex-col gap-2 w-full">
          @if (servicioDetalleSeleccionado) {
            @if (canFinalizar(servicioDetalleSeleccionado)) {
              <button
                (click)="finalizarServicio(servicioDetalleSeleccionado); modalDetalleOpen = false"
                class="w-full px-4 py-2.5 bg-easydry-blue text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm">
                <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide> Finalizar Servicio
              </button>
            }
          }
          <button (click)="modalDetalleOpen = false" class="w-full px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs mt-1">Cerrar Detalle</button>
        </div>
      </app-modal>

      <!-- Modal Reportar Falla -->
      <app-modal
        [isOpen]="modalReportarFallaOpen"
        title="Reportar Desperfecto o Falla de Maquinaria"
        icon="alert-triangle"
        (close)="modalReportarFallaOpen = false">

        <form (ngSubmit)="guardarReporteFalla()" class="space-y-4">
          @if (maquinasBahia.length === 0) {
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              {{ isOperadorEspeciales
                ? 'No hay equipos móviles de servicios especiales registrados. Contacta al jefe de especiales.'
                : 'No hay equipos registrados en tu bahía. Contacta al supervisor si necesitas reportar un equipo nuevo.' }}
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Equipo Afectado</label>
                <select [(ngModel)]="maquinaSeleccionadaId" name="maquina" class="w-full p-2.5 border rounded-xl text-xs font-bold" required>
                  @for (m of maquinasBahia; track m.id) {
                    <option [ngValue]="m.id">{{ m.codigo }} — {{ m.nombre }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Falla</label>
                <select [(ngModel)]="nuevoIncidente.tipo" name="tipo" class="w-full p-2.5 border rounded-xl text-xs font-bold">
                  @for (tipo of tiposFallaDisponibles; track tipo) {
                    <option [value]="tipo">{{ tipo }}</option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Problema</label>
              <textarea
                [(ngModel)]="nuevoIncidente.descripcion"
                name="descripcion"
                placeholder="Describa el comportamiento anómalo, ruidos, fugas o síntomas observados..."
                rows="3"
                class="w-full p-3 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                required>
              </textarea>
            </div>

            <div class="border-2 border-dashed border-rose-200 bg-rose-50/40 rounded-2xl p-4 space-y-3">
              <label class="text-xs font-bold text-rose-900 uppercase flex items-center gap-1.5">
                <i-lucide name="camera" class="w-4 h-4 text-rose-600"></i-lucide>
                Evidencias del Fallo (opcional)
              </label>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="cursor-pointer px-4 py-2.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-2">
                  <i-lucide name="upload-cloud" class="w-4 h-4"></i-lucide>
                  <span>Seleccionar Archivos</span>
                  <input type="file" multiple accept="image/*,video/*" (change)="onSubirArchivosFallo($event)" class="hidden">
                </label>
                <button type="button" (click)="agregarEvidenciaFalloDemo()"
                  class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
                  + Evidencia de prueba
                </button>
              </div>
              @if (archivosFalloSubidos.length > 0) {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  @for (arch of archivosFalloSubidos; track arch.id; let idx = $index) {
                    <div class="relative bg-white border rounded-xl p-2 shadow-xs">
                      @if (arch.tipo === 'imagen') {
                        <img [src]="arch.url" alt="Fallo" class="w-full h-24 object-cover rounded-lg">
                      } @else {
                        <div class="w-full h-24 bg-slate-900 rounded-lg flex items-center justify-center">
                          <i-lucide name="film" class="w-8 h-8 text-purple-400"></i-lucide>
                        </div>
                      }
                      <p class="text-[10px] font-semibold text-slate-700 truncate mt-1">{{ arch.nombre }}</p>
                      <button type="button" (click)="eliminarArchivoFallo(idx)"
                        class="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full">
                        <i-lucide name="x" class="w-3 h-3"></i-lucide>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </form>

        <div modal-footer>
          <button (click)="modalReportarFallaOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button
            (click)="guardarReporteFalla()"
            [disabled]="maquinasBahia.length === 0"
            class="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs">
            Enviar Reporte
          </button>
        </div>
      </app-modal>

      <!-- Aviso de privacidad de datos -->
      <div class="bg-easydry-blue/5 border border-easydry-blue/15 rounded-2xl p-4 flex items-start gap-3">
        <i-lucide name="info" class="w-5 h-5 text-easydry-blue flex-shrink-0 mt-0.5"></i-lucide>
        <div>
          <p class="text-sm font-bold text-easydry-blue">Alcance de tu sesión</p>
          <p class="text-xs text-slate-600 mt-0.5">
            @if (isOperadorEspeciales) {
              Puedes ejecutar tus asignaciones premium y <strong>reportar fallas o averías</strong> de tu equipo.
              @if (user.modalidadPulidor === 'FIJO') {
                Operas como <strong>pulidor fijo</strong> de {{ user.sucursalNombre || 'tu sucursal' }}.
              } @else {
                Operas como <strong>pulidor móvil</strong> entre sucursales.
              }
              El taller técnico gestiona la reparación.
            } @else {
              Solo puedes ver y registrar servicios en tu bahía ({{ user.bahiaNombre || 'asignada' }}).
              @if (puedeReportarFalla) {
                Puedes <strong>reportar fallas o averías</strong> de equipos de tu bahía, pero no gestionar reparaciones ni el taller.
              } @else {
                Para reportar problemas de maquinaria contacta al Supervisor.
              }
            }
          </p>
        </div>
      </div>

    </div>
  `
})
export class MiBahiaComponent implements OnInit {
  private auth = inject(AuthService);
  private serviciosService = inject(ServicioLavadoMockService);
  private maquinariaService = inject(MaquinariaMockService);
  private incidenteService = inject(IncidenteMockService);
  private sucursalService = inject(SucursalMockService);
  private bahiaService = inject(BahiaMockService);
  private permissions = inject(PermissionService);
  private toast = inject(ToastService);

  user = this.auth.getCurrentUser()!;
  misServicios: VehiculoServicio[] = [];

  // ── Tabla paginada de servicios del día ──
  misServiciosTabla: Record<string, unknown>[] = [];

  serviciosColumns: TableColumn[] = [
    { key: 'ot',      label: 'OT',       sortable: true,  width: '110px' },
    { key: 'vehiculo',label: 'Vehículo', sortable: true },
    { key: 'placa',   label: 'Placa',    sortable: true,  width: '110px' },
    { key: 'servicio',label: 'Servicio', sortable: true },
    { key: 'hora',    label: 'Hora',     sortable: false, width: '80px', align: 'center' },
    { key: 'duracion',label: 'Duración', sortable: false, width: '90px', align: 'center' },
    {
      key: 'estado', label: 'Estado', sortable: true, type: 'badge', align: 'center', width: '110px',
      badgeMap: {
        'EN PROCESO': 'bg-amber-100 text-amber-800',
        'FINALIZADO': 'bg-easydry-blue/15 text-easydry-blue',
        'APROBADO':   'bg-easydry-green/20 text-easydry-green-dark',
        'RECHAZADO':  'bg-rose-100 text-rose-800'
      }
    }
  ];

  serviciosActions: TableAction[] = [
    { id: 'ver',   label: 'Ver detalle', icon: 'eye',  tooltip: 'Ver detalle del servicio',
      colorClass: 'text-easydry-blue hover:bg-easydry-blue/10' },
    { id: 'video', label: 'Ver video',   icon: 'film', tooltip: 'Ver video de evidencia',
      colorClass: 'text-purple-600 hover:bg-purple-50' }
  ];

  onServicioAction(event: { actionId: string; row: Record<string, unknown> }): void {
    const servicio = this.misServicios.find(s => s.id === event.row['_id']);
    if (servicio) {
      this.abrirDetalle(servicio);
    }
  }
  todosLosServicios: VehiculoServicio[] = [];
  todasLasBahias: Bahia[] = [];
  responsableAgencia = 'Gerente Carlos Mendoza';
  enProceso = 0;
  finalizados = 0;
  aprobados = 0;

  // ── Navegación Multi-Sucursal y Multi-Bahía para Super Admin ──
  isSuperAdmin = false;
  listaSucursales: Sucursal[] = [];
  bahiasDisponibles: Bahia[] = [];
  sucursalSeleccionada = 'Todas';
  bahiaSeleccionada = 'Todas';
  operadorAsignadoTexto = 'Múltiples Operadores';

  modalDetalleOpen = false;
  servicioDetalleSeleccionado?: VehiculoServicio;

  puedeReportarFalla = false;
  isOperadorEspeciales = false;
  modalReportarFallaOpen = false;
  maquinasBahia: Maquinaria[] = [];
  maquinaSeleccionadaId = 0;
  archivosFalloSubidos: ArchivoAdjunto[] = [];
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

  filtrosGlobales: FilterState = { sucursal: '', operador: '', bahia: '', estado: '', fecha: '' };
  filtroTexto = '';

  aplicarNuevosFiltros(filtros: FilterState): void {
    this.filtrosGlobales = filtros;
    if (filtros.busqueda !== undefined) {
      this.filtroTexto = filtros.busqueda;
    }
    this.filtrarServicios();
  }

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser()!;
    this.isSuperAdmin = this.user.role === Role.SUPER_ADMIN || this.user.role === Role.ADMIN || this.user.role === Role.SUPERVISOR;
    this.isOperadorEspeciales = this.user.role === Role.OPERADOR_SERVICIOS_ESPECIALES
      || this.user.role === Role.COORD_SERVICIOS_ESPECIALES;
    this.puedeReportarFalla = this.permissions.canRegistrarIncidente();

    // Cargar catálogo de sucursales para Super Admin
    this.sucursalService.getSucursales().subscribe(sucursales => {
      this.listaSucursales = sucursales;
      this.actualizarBahiasDisponibles();

      // Responsable de agencia inicial
      const s = sucursales.find(suc =>
        suc.nombre.toLowerCase().includes((this.user.sucursalNombre || '').toLowerCase()) ||
        (this.user.sucursalNombre || '').toLowerCase().includes(suc.nombre.toLowerCase())
      );
      if (s && s.responsable) {
        this.responsableAgencia = s.responsable;
      }
    });

    // Cargar catálogo de bahías
    this.bahiaService.getBahias().subscribe(list => {
      this.todasLasBahias = list;
      this.actualizarBahiasDisponibles();
    });

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

    this.serviciosService.getServicios().subscribe(list => {
      this.todosLosServicios = list;
      this.filtrarServicios();
    });

    this.actualizarMaquinasBahia();
  }

  actualizarBahiasDisponibles(): void {
    if (this.sucursalSeleccionada === 'Todas') {
      const mapa = new Map<string, Bahia>();
      this.todasLasBahias.forEach(b => {
        if (!mapa.has(b.nombre)) {
          mapa.set(b.nombre, b);
        }
      });
      this.bahiasDisponibles = Array.from(mapa.values());
    } else {
      const suc = this.listaSucursales.find(s => s.nombre === this.sucursalSeleccionada);
      if (suc) {
        this.bahiasDisponibles = this.todasLasBahias.filter(b => b.sucursalId === suc.id || b.sucursalNombre === suc.nombre);
      } else {
        this.bahiasDisponibles = [];
      }
    }
  }

  onSucursalChange(): void {
    this.bahiaSeleccionada = 'Todas';
    this.actualizarBahiasDisponibles();

    if (this.sucursalSeleccionada !== 'Todas') {
      const suc = this.listaSucursales.find(s => s.nombre === this.sucursalSeleccionada);
      this.responsableAgencia = suc?.responsable || 'Gerente de Sede';
    } else {
      this.responsableAgencia = 'Supervisión Nacional';
    }

    this.operadorAsignadoTexto = 'Múltiples Operadores';
    this.filtrarServicios();
    this.actualizarMaquinasBahia();
  }

  onBahiaChange(): void {
    if (this.bahiaSeleccionada !== 'Todas') {
      const bah = this.bahiasDisponibles.find(b => b.nombre === this.bahiaSeleccionada);
      this.operadorAsignadoTexto = bah?.operadorAsignado || 'Sin operador fijo asignado';
    } else {
      this.operadorAsignadoTexto = 'Múltiples Operadores';
    }

    this.filtrarServicios();
    this.actualizarMaquinasBahia();
  }

  resetearSuperAdmin(): void {
    this.sucursalSeleccionada = 'Todas';
    this.bahiaSeleccionada = 'Todas';
    this.actualizarBahiasDisponibles();
    this.responsableAgencia = 'Supervisión Nacional';
    this.operadorAsignadoTexto = 'Múltiples Operadores';
    this.filtrarServicios();
    this.actualizarMaquinasBahia();
  }

  filtrarServicios(): void {
    if (this.isSuperAdmin) {
      let res = this.todosLosServicios;
      if (this.sucursalSeleccionada !== 'Todas') {
        const suc = this.sucursalSeleccionada.toLowerCase();
        res = res.filter(s => s.agencia?.toLowerCase().includes(suc) || suc.includes(s.agencia?.toLowerCase() || ''));
      }
      if (this.bahiaSeleccionada !== 'Todas') {
        const bah = this.bahiaSeleccionada.toLowerCase();
        res = res.filter(s => s.bahia?.toLowerCase().includes(bah) || bah.includes(s.bahia?.toLowerCase() || ''));
      }
      if (this.filtrosGlobales.region && this.filtrosGlobales.region !== 'Todas') {
        const region = this.filtrosGlobales.region.toLowerCase();
        res = res.filter(s => {
          const suc = this.sucursalService.getSucursalPorNombre(s.agencia);
          return suc?.regionNombre?.toLowerCase().includes(region);
        });
      }
      if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
        res = res.filter(s => {
          const suc = this.sucursalService.getSucursalPorNombre(s.agencia);
          return suc?.marcaNombre === this.filtrosGlobales.marca;
        });
      }
      this.misServicios = res;
    } else {
      this.misServicios = this.todosLosServicios.filter(s =>
        s.empleado?.toLowerCase().includes(this.user?.nombre?.toLowerCase() ?? '')
      );
    }
    if (this.filtroTexto?.trim()) {
      const term = this.filtroTexto.trim().toLowerCase();
      this.misServicios = this.misServicios.filter(s =>
        (s.placa || '').toLowerCase().includes(term) ||
        (s.ordenTrabajoOT || '').toLowerCase().includes(term) ||
        (s.servicio || '').toLowerCase().includes(term) ||
        (s.marca || '').toLowerCase().includes(term) ||
        (s.modelo || '').toLowerCase().includes(term)
      );
    }
    this.recalcularKpis();
    this.construirTablaServicios();
  }

  private construirTablaServicios(): void {
    this.misServiciosTabla = this.misServicios.map(s => ({
      _id:      s.id,
      ot:       s.ordenTrabajoOT || 'OT-????',
      vehiculo: `${s.marca || ''} ${s.modelo || ''}`.trim(),
      placa:    s.placa || '-',
      servicio: s.servicio || '-',
      hora:     s.horaInicio || s.horaIngreso || '-',
      duracion: s.estado === 'EN PROCESO'
                  ? `${this.calcularMinutosTranscurridos(s)} min ⏱`
                  : `${s.duracionMin || 35} min`,
      estado:   s.estado || '-'
    }));
  }

  actualizarMaquinasBahia(): void {
    if (!this.puedeReportarFalla) return;
    this.maquinariaService.getMaquinaria().subscribe(list => {
      if (this.isOperadorEspeciales) {
        this.maquinasBahia = list.filter(m => this.esEquipoServiciosEspeciales(m));
      } else if (this.isSuperAdmin) {
        this.maquinasBahia = list.filter(m => {
          const matchSuc = this.sucursalSeleccionada === 'Todas' || m.agencia === this.sucursalSeleccionada || m.sucursalNombre === this.sucursalSeleccionada;
          const matchBah = this.bahiaSeleccionada === 'Todas' || m.bahia === this.bahiaSeleccionada || m.bahiaNombre === this.bahiaSeleccionada;
          return matchSuc && matchBah;
        });
      } else {
        this.maquinasBahia = list.filter(m => {
          const sucursal = this.user.sucursalNombre || this.user.sucursal || '';
          const bahia = this.user.bahiaNombre || '';
          const mismaSucursal = m.agencia === sucursal || m.sucursalNombre === sucursal;
          if (!bahia) return mismaSucursal;
          return mismaSucursal && (m.bahia === bahia || m.bahiaNombre === bahia);
        });
      }
      if (this.maquinasBahia.length > 0) {
        this.maquinaSeleccionadaId = this.maquinasBahia[0].id;
      }
    });
  }

  private esEquipoServiciosEspeciales(m: Maquinaria): boolean {
    const tipos = ['Pulidora', 'Lámpara Infrarroja', 'Extractor'];
    if (m.tipo && tipos.includes(m.tipo)) return true;
    const bahia = `${m.bahiaNombre || ''} ${m.bahia || ''}`.toLowerCase();
    const sucursal = `${m.sucursalNombre || ''} ${m.agencia || ''}`.toLowerCase();
    return bahia.includes('móvil') || bahia.includes('especial') || sucursal.includes('servicios especiales');
  }

  abrirModalReportarFalla(): void {
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
    this.toast.success('Archivos cargados', `${input.files.length} evidencia(s) lista(s).`);
  }

  agregarEvidenciaFalloDemo(): void {
    this.archivosFalloSubidos.push({
      id: `demo-f-${Date.now()}`,
      nombre: 'falla_equipo_bahia.jpg',
      tipo: 'imagen',
      extension: 'JPG',
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      tamanio: '2.1 MB',
      fechaSubida: 'Hoy'
    });
  }

  eliminarArchivoFallo(index: number): void {
    this.archivosFalloSubidos.splice(index, 1);
  }

  guardarReporteFalla(): void {
    const maquina = this.maquinasBahia.find(m => m.id === this.maquinaSeleccionadaId);
    if (!maquina) {
      this.toast.warning('Equipo requerido', 'Seleccione el equipo afectado.');
      return;
    }
    if (!this.nuevoIncidente.descripcion.trim()) {
      this.toast.warning('Descripción requerida', 'Describa el fallo observado.');
      return;
    }

    const fotos = this.archivosFalloSubidos.filter(a => a.tipo === 'imagen').map(a => a.url);
    const videos = this.archivosFalloSubidos.filter(a => a.tipo === 'video').map(a => a.url);
    const reportadoPor = `${this.user.nombre} ${this.user.apellido}`.trim()
      + (this.isOperadorEspeciales ? ' (Servicios Especiales)' : ' (Operador)');

    const registro: Omit<Incidente, 'id'> = {
      codigoIncidente: '',
      maquina: maquina.nombre,
      agencia: maquina.agencia || maquina.sucursalNombre || this.user.sucursalNombre || '',
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
      tipo: this.nuevoIncidente.tipo,
      prioridad: this.nuevoIncidente.prioridad,
      estado: 'Pendiente',
      descripcion: this.nuevoIncidente.descripcion.trim(),
      reportadoPor,
      fotosFallo: fotos.length > 0 ? fotos : undefined,
      videosFallo: videos.length > 0 ? videos : undefined,
      archivosFallo: this.archivosFalloSubidos.length > 0 ? [...this.archivosFalloSubidos] : undefined
    };

    this.incidenteService.crearIncidente(registro).subscribe(creado => {
      this.toast.success('Reporte enviado', `Incidente ${creado.codigoIncidente} registrado. El taller lo procesará.`);
      this.modalReportarFallaOpen = false;
    });
  }

  private recalcularKpis(): void {
    this.enProceso = this.misServicios.filter(s => s.estado === 'EN PROCESO').length;
    this.finalizados = this.misServicios.filter(s => s.estado === 'FINALIZADO').length;
    this.aprobados = this.misServicios.filter(s => s.estado === 'APROBADO').length;
  }

  abrirDetalle(item: VehiculoServicio) {
    this.servicioDetalleSeleccionado = item;
    this.modalDetalleOpen = true;
  }

  canFinalizar(item: VehiculoServicio): boolean {
    return item.estado === 'EN PROCESO';
  }

  finalizarServicio(item: VehiculoServicio) {
    this.serviciosService.finalizarServicioOperador(item.id).subscribe(res => {
      if (res) {
        item.estado = 'FINALIZADO';
        this.recalcularKpis();
      }
    });
  }

  calcularMinutosTranscurridos(s: VehiculoServicio): number {
    if (s.tiempoTranscurridoMin) return s.tiempoTranscurridoMin;
    const hora = s.horaInicio || s.horaIngreso || '08:30';
    const [h, m] = hora.split(':').map(Number);
    const ahora = new Date();
    const minutosInicio = (h || 8) * 60 + (m || 30);
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const diff = minutosAhora - minutosInicio;
    return diff > 0 && diff < 300 ? diff : 24;
  }
}

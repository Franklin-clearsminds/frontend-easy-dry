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
import { ArchivoAdjunto, Incidente, Maquinaria, VehiculoServicio } from '../../core/models';
import { Role } from '../../core/models/roles.model';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mi-bahia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, ModalComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Encabezado de Contexto del Operador -->
      <div class="bg-gradient-to-r from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep rounded-3xl p-6 text-white relative overflow-hidden">
        <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-green/20 text-easydry-lime border border-easydry-green/40 text-xs font-bold mb-3">
              <i-lucide name="map-pin" class="w-3.5 h-3.5"></i-lucide>
              <span>Mi Área de Trabajo</span>
            </div>
            <h1 class="text-2xl font-extrabold font-outfit">{{ user.nombre }} {{ user.apellido }}</h1>
            <p class="text-easydry-lime font-semibold text-sm mt-1">
              {{ isOperadorEspeciales ? 'Operador de Servicios Especiales' : 'Operador de Bahía' }}
            </p>

            <div class="flex items-center gap-4 mt-3 flex-wrap">
              <div class="flex items-center gap-2 text-slate-200 text-sm">
                <i-lucide name="building-2" class="w-4 h-4 text-easydry-green"></i-lucide>
                <span class="font-semibold">{{ isOperadorEspeciales ? (user.modalidadPulidor === 'FIJO' ? (user.sucursalNombre || 'Sucursal asignada') : 'Red Nacional · Móvil') : (user.sucursalNombre || 'Sin sucursal') }}</span>
              </div>
              <div class="flex items-center gap-2 text-slate-200 text-sm">
                <i-lucide name="hard-drive" class="w-4 h-4 text-easydry-lime"></i-lucide>
                <span class="font-semibold">{{ isOperadorEspeciales ? (user.modalidadPulidor === 'FIJO' ? 'Pulidor fijo en sucursal' : 'Equipo móvil · Multi-sucursal') : (user.bahiaNombre || 'Sin bahía asignada') }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 flex-wrap">
            <a routerLink="/servicios"
              class="px-5 py-3 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-bold rounded-xl text-sm transition-all shadow-glow-green flex items-center gap-2">
              <i-lucide name="plus-circle" class="w-4 h-4"></i-lucide>
              <span>Registrar Servicio</span>
            </a>
            @if (puedeReportarFalla) {
              <button
                (click)="abrirModalReportarFalla()"
                class="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2">
                <i-lucide name="alert-triangle" class="w-4 h-4"></i-lucide>
                <span>Reportar Falla / Avería</span>
              </button>
            }
          </div>
        </div>
        <div class="absolute -right-16 -bottom-16 w-72 h-72 bg-easydry-green/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      <!-- KPIs del Operador -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-easydry-blue/10 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="car" class="w-5 h-5 text-easydry-blue"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ misServicios.length }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Servicios Hoy</p>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="clock" class="w-5 h-5 text-amber-600"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ enProceso }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">En Proceso</p>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-easydry-green/15 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="check-circle-2" class="w-5 h-5 text-easydry-green-dark"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ finalizados }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Finalizados</p>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="shield-check" class="w-5 h-5 text-indigo-600"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ aprobados }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Aprobados</p>
        </div>
      </div>

      <!-- Reporte de maquinaria (solo creación) -->
      @if (puedeReportarFalla) {
        <div class="bg-white rounded-2xl p-6 border border-rose-100 shadow-easydry">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-start gap-3">
              <div class="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <i-lucide name="alert-triangle" class="w-5 h-5 text-rose-600"></i-lucide>
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-lg font-outfit">Reportar Falla o Avería</h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  @if (isOperadorEspeciales) {
                    Registra un desperfecto de tu equipo móvil (pulidora, lámpara, extractor). El Gestor Técnico recibirá el reporte.
                  } @else {
                    Registra un desperfecto del equipo de tu bahía. El Gestor Técnico recibirá el reporte para asignarlo.
                  }
                </p>
              </div>
            </div>
            <button
              (click)="abrirModalReportarFalla()"
              class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-center">
              <i-lucide name="upload" class="w-3.5 h-3.5"></i-lucide>
              <span>Subir Reporte</span>
            </button>
          </div>
        </div>
      }

      <!-- Mis Servicios del Día -->
      <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="font-bold text-slate-900 text-lg font-outfit">Mis Servicios del Día</h3>
            <p class="text-xs text-slate-500">Solo ves tus registros en tu bahía asignada</p>
          </div>
          <a routerLink="/servicios"
            class="px-4 py-2 bg-easydry-blue/10 text-easydry-blue font-bold rounded-xl text-xs hover:bg-easydry-blue/20 transition-colors flex items-center gap-1.5">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide>
            <span>Nuevo Servicio</span>
          </a>
        </div>

        @if (misServicios.length === 0) {
          <div class="text-center py-12">
            <i-lucide name="car" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i-lucide>
            <p class="text-slate-500 font-medium">No tienes servicios registrados hoy</p>
            <p class="text-slate-400 text-xs mt-1">Usa el botón "Registrar Servicio" para comenzar</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (s of misServicios; track s.id) {
              <div class="p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer" (click)="abrirDetalle(s)">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2 py-0.5 rounded-md">
                      {{ s.ordenTrabajoOT || 'OT-9800' }}
                    </span>
                    <div class="font-bold text-slate-900 text-sm mt-1.5">{{ s.marca }} {{ s.modelo }}</div>
                    <div class="text-[11px] font-mono font-extrabold text-slate-500">{{ s.placa }}</div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-center max-w-[80px]"
                    [ngClass]="{
                      'bg-amber-100 text-amber-800': s.estado === 'EN PROCESO',
                      'bg-easydry-blue/15 text-easydry-blue': s.estado === 'FINALIZADO',
                      'bg-easydry-green/20 text-easydry-green-dark': s.estado === 'APROBADO',
                      'bg-rose-100 text-rose-800': s.estado === 'RECHAZADO'
                    }">
                    {{ s.estado }}
                  </span>
                </div>
                
                <div class="flex items-center justify-between mt-3 text-xs">
                  <div class="flex items-center gap-1.5 text-slate-500">
                    <i-lucide name="clock" class="w-3.5 h-3.5"></i-lucide>
                    <span>{{ s.horaIngreso || '08:30' }}</span>
                  </div>
                  <div class="font-semibold text-slate-700">
                    {{ s.servicio }}
                  </div>
                </div>
              </div>
            }
          </div>
        }
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
                <span class="block text-[10px] text-slate-400 font-bold uppercase mb-1">Orden / OT</span>
                <span class="font-mono font-extrabold text-easydry-blue">{{ servicioDetalleSeleccionado.ordenTrabajoOT }}</span>
                <span class="block text-[10px] text-slate-500 mt-0.5">{{ servicioDetalleSeleccionado.numeroOrden }}</span>
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
  private permissions = inject(PermissionService);
  private toast = inject(ToastService);

  user = this.auth.getCurrentUser()!;
  misServicios: VehiculoServicio[] = [];
  enProceso = 0;
  finalizados = 0;
  aprobados = 0;

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

  ngOnInit(): void {
    this.user = this.auth.getCurrentUser()!;
    this.isOperadorEspeciales = this.user.role === Role.OPERADOR_SERVICIOS_ESPECIALES
      || this.user.role === Role.COORD_SERVICIOS_ESPECIALES;
    this.puedeReportarFalla = this.permissions.canRegistrarIncidente();

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
      this.misServicios = list.filter(s =>
        s.empleado?.toLowerCase().includes(this.user?.nombre?.toLowerCase() ?? '')
      );
      this.recalcularKpis();
    });

    if (this.puedeReportarFalla) {
      this.maquinariaService.getMaquinaria().subscribe(list => {
        this.maquinasBahia = this.isOperadorEspeciales
          ? list.filter(m => this.esEquipoServiciosEspeciales(m))
          : list.filter(m => {
              const sucursal = this.user.sucursalNombre || this.user.sucursal || '';
              const bahia = this.user.bahiaNombre || '';
              const mismaSucursal = m.agencia === sucursal || m.sucursalNombre === sucursal;
              if (!bahia) return mismaSucursal;
              return mismaSucursal && (m.bahia === bahia || m.bahiaNombre === bahia);
            });
        if (this.maquinasBahia.length > 0) {
          this.maquinaSeleccionadaId = this.maquinasBahia[0].id;
        }
      });
    }
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
}

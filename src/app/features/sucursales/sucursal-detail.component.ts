import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SucursalService } from '../../core/services/sucursal.service';
import { BahiaService } from '../../core/services/bahia.service';
import { Sucursal, Bahia, Maquinaria, CatalogoServicio } from '../../core/models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';
import { CatalogoServiciosService } from '../../core/services/catalogo-servicios.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sucursal-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, StatCardComponent, ModalComponent, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Back Link & Header -->
      <div>
        <a [routerLink]="['/agencias']" class="inline-flex items-center gap-1.5 text-xs font-bold text-easydry-blue hover:underline mb-3">
          <i-lucide aria-hidden="true" name="chevron-right" class="w-4 h-4 transform rotate-180"></i-lucide>
          <span>Volver al Directorio de Agencias</span>
        </a>

        @if (sucursal) {
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-easydry-blue text-white flex items-center justify-center font-bold">
                  <i-lucide aria-hidden="true" name="building-2" class="w-6 h-6"></i-lucide>
                </div>
                <div>
                  <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 font-outfit">{{ sucursal.nombre }}</h1>
                  <p class="text-xs text-slate-500 font-medium mt-0.5">{{ sucursal.ciudad }} • {{ sucursal.direccion }}</p>
                  <div class="flex flex-wrap gap-2 mt-2">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-easydry-blue/10 text-easydry-blue text-[11px] font-extrabold uppercase">
                      <i-lucide aria-hidden="true" name="map-pin" class="w-3 h-3"></i-lucide>
                      Región {{ sucursal.regionNombre || 'Sin asignar' }}
                    </span>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-easydry-green/20 text-easydry-green-text text-[11px] font-extrabold uppercase">
                      <i-lucide aria-hidden="true" name="tag" class="w-3 h-3"></i-lucide>
                      {{ sucursal.marcaNombre || 'Sin marca' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span class="px-3 py-1.5 rounded-full text-xs font-bold bg-easydry-green/20 text-easydry-green-text border border-easydry-green/40">
                Aprobador: {{ sucursal.responsable || 'Sin asignar' }}
              </span>
              @if (puedeAsignarOperadores) {
              <a [routerLink]="['/asignaciones']" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs hover:bg-easydry-blue-dark transition-colors flex items-center gap-1.5">
                <i-lucide aria-hidden="true" name="users" class="w-3.5 h-3.5"></i-lucide> Asignar Operadores
              </a>
              }
              <!-- Note: Editing branch is done from the main branch list as implemented in sucursales.component, 
                   but we could link back or handle it here if requested. -->
            </div>
          </div>
        }
      </div>

      @if (sucursal) {
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="font-extrabold text-slate-900 font-outfit">Servicios de esta agencia</h2>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-easydry-blue/10 text-easydry-blue border border-easydry-blue/20">
                  {{ (sucursal.serviciosNombres || []).length || (sucursal.servicioIds || []).length || 0 }} activos
                </span>
              </div>
              <p class="text-xs text-slate-500">Servicios del catálogo que ofrece esta agencia.</p>
            </div>
            @if (puedeEditarServicios) {
            <button (click)="abrirModalServicios()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer">
              <i-lucide aria-hidden="true" name="pencil" class="w-3.5 h-3.5"></i-lucide>
              Editar servicios
            </button>
            }
          </div>
          <div class="flex flex-wrap gap-2">
            @if (!(sucursal.serviciosNombres || []).length) {
              <span class="text-xs text-slate-500 font-semibold">Sin servicios asignados.</span>
            }
            @for (nombre of sucursal.serviciosNombres || []; track nombre) {
              <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">{{ nombre }}</span>
            }
          </div>
        </div>
      }

      <!-- Summary KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <app-stat-card 
          title="Bahías de Lavado" 
          [value]="(sucursal?.cantidadBahias ?? 0) + ' Bahías'" 
          icon="building-2" 
          subtitle="Infraestructura activa" 
          variant="primary">
        </app-stat-card>

        <app-stat-card 
          title="Operadores Activos" 
          [value]="(sucursal?.operadoresActivos ?? 0) + ' Operadores'" 
          icon="users" 
          subtitle="Personal activo de la agencia" 
          variant="success">
        </app-stat-card>

        <app-stat-card 
          title="Maquinaria Asignada" 
          [value]="(sucursal?.maquinasAsignadasCount ?? 0) + ' Equipos'" 
          icon="hard-drive" 
          subtitle="Asignadas a la agencia" 
          variant="primary">
        </app-stat-card>

        <app-stat-card 
          title="Servicios Realizados" 
          [value]="(sucursal?.serviciosRealizadosMes ?? 0) + ' Solicitudes'" 
          icon="check-circle-2" 
          subtitle="Solicitudes de aprobación" 
          variant="success">
        </app-stat-card>
      </div>

      <!-- SECCIÓN DE BAHÍAS -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 font-outfit">Distribución Operativa de Bahías</h2>
            <p class="text-xs text-slate-500">Estado en tiempo real, técnico a cargo y equipos asignados en cada bahía.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (b of bahias; track b.id) {
            <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 flex flex-col justify-between space-y-4 hover:shadow-easydry-hover transition-shadow">
              
              <div>
                <!-- Top Status Badge -->
                <div class="flex items-center justify-between mb-3">
                  <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2.5 py-1 rounded-lg">
                    {{ b.codigo }}
                  </span>
                  <span 
                    class="px-2.5 py-0.5 rounded-full text-xs font-extrabold"
                    [ngClass]="{
                      'bg-amber-100 text-amber-800 border border-amber-300': b.estado === 'Ocupada',
                      'bg-easydry-green/20 text-easydry-green-text border border-easydry-green/40': b.estado === 'Disponible',
                      'bg-rose-100 text-rose-800 border border-rose-300': b.estado === 'Mantenimiento',
                      'bg-slate-100 text-slate-600': b.estado === 'Inactiva'
                    }">
                    {{ b.estado }}
                  </span>
                </div>

                <h3 class="font-bold text-slate-900 text-base font-outfit">{{ b.nombre }}</h3>

                <!-- Operator Assigned Card -->
                <div class="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span class="text-[11px] font-extrabold uppercase text-slate-500">Operador Principal:</span>
                  <div class="flex items-center gap-2">
                    <i-lucide aria-hidden="true" name="user-check" class="w-4 h-4 text-easydry-green-text"></i-lucide>
                    <span class="font-bold text-slate-900 text-xs">{{ b.operadorAsignado || 'Sin Asignar' }}</span>
                  </div>
                </div>

              </div>

              <div class="pt-3 border-t border-slate-100 flex flex-col gap-2">
                @if (puedeEditarBahias) {
                <button
                  (click)="cambiarEstadoBahia(b)"
                  class="w-full py-2 bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-colors">
                  {{ b.estado === 'Inactiva' ? 'Activar bahía' : 'Desactivar bahía' }}
                </button>
                }
              </div>

            </div>
          }
        </div>
      </div>

      <app-modal
        [isOpen]="modalServiciosOpen" size="lg"
        title="Editar servicios de la sucursal"
        icon="sparkles"
        (close)="modalServiciosOpen = false">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          
          <!-- Columna Izquierda: Servicios Generales (Scroll interno independiente) -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 flex flex-col">
            <div class="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/80">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-easydry-blue"></span>
                <p class="text-xs font-extrabold uppercase tracking-wide text-slate-800">Servicios Generales</p>
              </div>
              <span class="text-xs font-extrabold text-easydry-blue bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                {{ cantidadGeneralesSeleccionadosEdit }} de {{ serviciosGenerales.length }} seleccionados
              </span>
            </div>

            <p class="text-[11px] text-slate-500 mb-2">Selecciona los servicios de lavado estándar disponibles en la agencia:</p>

            <div class="max-h-72 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
              @for (s of serviciosGenerales; track s.id) {
                <label class="flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer border select-none"
                       [ngClass]="servicioSeleccionado(s.id) ? 'bg-white border-easydry-blue/30 shadow-2xs text-slate-900' : 'bg-slate-100/50 border-transparent hover:bg-white text-slate-600'">
                  <input type="checkbox"
                         class="rounded border-slate-300 text-easydry-blue focus:ring-easydry-blue/30 w-4 h-4 cursor-pointer"
                         [checked]="servicioSeleccionado(s.id)"
                         (change)="toggleServicio(s.id, s.nombre)">
                  <span class="text-xs font-semibold leading-tight flex-1">{{ s.nombre }}</span>
                </label>
              }
            </div>
          </div>

          <!-- Columna Derecha: Servicios Especiales (Compacta, directa y 100% visible sin scroll) -->
          <div class="border border-amber-200/90 rounded-2xl p-4 bg-gradient-to-b from-amber-50/70 to-amber-100/30 flex flex-col gap-3">
            
            <!-- Cabecera Especiales -->
            <div class="flex items-center justify-between pb-3 border-b border-amber-200/80">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center">
                  <i-lucide aria-hidden="true" name="star" class="w-3.5 h-3.5 fill-amber-500 text-amber-700"></i-lucide>
                </div>
                <p class="text-xs font-extrabold uppercase tracking-wide text-amber-900">Servicios Especiales</p>
              </div>
              <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full border transition-colors"
                    [ngClass]="tieneServiciosEspecialesEdit ? 'bg-amber-200 text-amber-900 border-amber-300' : 'bg-slate-200/80 text-slate-600 border-slate-300'">
                {{ tieneServiciosEspecialesEdit ? 'Catálogo Completo (' + serviciosEspeciales.length + ')' : 'Deshabilitados (0)' }}
              </span>
            </div>

            <!-- Switch Todo o Nada -->
            <div (click)="toggleTieneEspecialesEdit()"
                 class="flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none"
                 [ngClass]="tieneServiciosEspecialesEdit ? 'bg-white border-amber-400 shadow-xs' : 'bg-white/80 border-slate-200 hover:border-slate-300'">
              <div class="pr-2">
                <div class="flex items-center gap-2">
                  <p class="text-xs font-extrabold" [ngClass]="tieneServiciosEspecialesEdit ? 'text-amber-900' : 'text-slate-700'">
                    {{ tieneServiciosEspecialesEdit ? 'Servicios Especiales Habilitados' : 'Servicios Especiales Deshabilitados' }}
                  </p>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {{ tieneServiciosEspecialesEdit ? 'Esta agencia ofrece todos los vitrificados, sellados y pulidos.' : 'La agencia no realiza servicios especiales.' }}
                </p>
              </div>

              <!-- Switch Pill -->
              <div class="relative w-11 h-6 rounded-full transition-colors shrink-0"
                   [ngClass]="tieneServiciosEspecialesEdit ? 'bg-amber-500' : 'bg-slate-300'">
                <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
                      [ngClass]="tieneServiciosEspecialesEdit ? 'left-5.5' : 'left-0.5'"></span>
              </div>
            </div>


            <!-- Micro-resumen cuando está activo -->
            @if (tieneServiciosEspecialesEdit) {
              <div class="px-3 py-2 bg-white/80 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] text-amber-900">
                <span class="font-semibold flex items-center gap-1.5">
                  <i-lucide aria-hidden="true" name="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                  Pulidos y tratamientos activos
                </span>
                <span class="font-mono font-bold bg-amber-100 px-2 py-0.5 rounded-md text-amber-900">
                  +{{ serviciosEspeciales.length }} servicios
                </span>
              </div>
            }

          </div>

        </div>

        <div modal-footer class="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-easydry-blue/10 text-easydry-blue border border-easydry-blue/20 text-xs font-extrabold">
            <i-lucide aria-hidden="true" name="sparkles" class="w-4 h-4 text-easydry-blue"></i-lucide>
            <span>{{ totalServiciosSeleccionadosEdit }} servicios activos en total</span>
          </div>
          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button (click)="modalServiciosOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
            <button (click)="guardarServiciosSucursal()" class="btn btn-primary w-full sm:w-auto">Guardar servicios</button>
          </div>
        </div>
      </app-modal>

    </div>
  `
})
export class SucursalDetailComponent implements OnInit {
  sucursal?: Sucursal;
  bahias: Bahia[] = [];
  catalogoServicios: CatalogoServicio[] = [];
  idsServiciosEdit: number[] = [];
  nombresServiciosEdit: string[] = [];
  modalServiciosOpen = false;

  private route = inject(ActivatedRoute);
  private sucursalService = inject(SucursalService);
  private bahiaService = inject(BahiaService);
  private catalogoService = inject(CatalogoServiciosService);
  private auth = inject(AuthService);
  private toastService = inject(ToastService);

  // Permisos: los mismos que exige el servidor.
  get puedeEditarServicios(): boolean { return this.auth.puede('agencias.agencias.servicios'); }
  get puedeEditarBahias(): boolean { return this.auth.puede('agencias.agencias.editar'); }
  get puedeAsignarOperadores(): boolean { return this.auth.puede('agencias.bahias.asignar'); }

  private mensajeError(err: any, respaldo: string): string {
    const m = err?.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    return (typeof m === 'string' && m) ? m : respaldo;
  }

  get serviciosGenerales(): CatalogoServicio[] {
    return this.catalogoServicios.filter(s => s.categoria?.trim().toUpperCase() === 'GENERAL' && s.estado === 'Activo');
  }

  get serviciosEspeciales(): CatalogoServicio[] {
    return this.catalogoServicios.filter(s =>
      s.categoria?.trim().toUpperCase() === 'ESPECIAL' && s.estado === 'Activo'
    );
  }

  get cantidadGeneralesSeleccionadosEdit(): number {
    const ids = new Set(this.idsServiciosEdit.map(Number));
    return this.serviciosGenerales.filter(s => ids.has(Number(s.id))).length;
  }

  get cantidadEspecialesSeleccionadosEdit(): number {
    const ids = new Set(this.idsServiciosEdit.map(Number));
    return this.serviciosEspeciales.filter(s => ids.has(Number(s.id))).length;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';

    this.sucursalService.getSucursalById(id).subscribe(suc => {
      this.sucursal = suc;
    });

    // El catálogo solo se necesita para editar los servicios de la agencia.
    if (this.puedeEditarServicios && this.auth.puede('catalogo.ver')) {
      this.catalogoService.getServiciosActivos().subscribe(list => {
        this.catalogoServicios = list;
      });
    }

    this.bahiaService.getBahiasPorSucursal(id).subscribe(list => {
      this.bahias = list;
    });

  }

  /** Activa o desactiva la bahía; el servidor solo maneja ese estado. */
  cambiarEstadoBahia(bahia: Bahia) {
    if (!this.puedeEditarBahias) return;
    const nextState: Bahia['estado'] = bahia.estado === 'Inactiva' ? 'Disponible' : 'Inactiva';

    this.bahiaService.actualizarEstadoBahia(bahia.id, nextState).subscribe({
      next: (res) => {
        if (res) {
          bahia.estado = res.estado;
          bahia.operadorAsignado = res.operadorAsignado;
          this.toastService.success('Bahía actualizada', bahia.nombre + ': ' + res.estado);
        }
      },
      error: (err) => this.toastService.error('No se pudo cambiar la bahía', this.mensajeError(err, 'El servidor no aceptó el cambio.'))
    });
  }

  tieneServiciosEspecialesEdit = false;

  get totalServiciosSeleccionadosEdit(): number {
    return this.cantidadGeneralesSeleccionadosEdit + (this.tieneServiciosEspecialesEdit ? this.serviciosEspeciales.length : 0);
  }

  toggleTieneEspecialesEdit(): void {
    this.tieneServiciosEspecialesEdit = !this.tieneServiciosEspecialesEdit;
  }

  abrirModalServicios() {
    if (!this.sucursal || !this.puedeEditarServicios) return;
    this.idsServiciosEdit = [...(this.sucursal.servicioIds || [])];
    this.nombresServiciosEdit = [...(this.sucursal.serviciosNombres || [])];
    this.tieneServiciosEspecialesEdit = this.sucursal.tieneServiciosEspeciales === true ||
      this.serviciosEspeciales.some(s => this.idsServiciosEdit.includes(Number(s.id)));
    this.modalServiciosOpen = true;
  }

  servicioSeleccionado(id: number): boolean {
    return this.idsServiciosEdit.includes(id);
  }

  toggleServicio(id: number, nombre: string) {
    const idx = this.idsServiciosEdit.indexOf(id);
    if (idx >= 0) {
      this.idsServiciosEdit.splice(idx, 1);
      const ni = this.nombresServiciosEdit.indexOf(nombre);
      if (ni >= 0) this.nombresServiciosEdit.splice(ni, 1);
    } else {
      this.idsServiciosEdit.push(id);
      this.nombresServiciosEdit.push(nombre);
    }
  }

  guardarServiciosSucursal() {
    if (!this.sucursal) return;
    const user = this.auth.getCurrentUser();

    // Filtrar solo los servicios generales seleccionados
    const generalesIds = new Set(this.serviciosGenerales.map(s => Number(s.id)));
    let cleanIds = this.idsServiciosEdit.map(Number).filter(id => generalesIds.has(id));

    if (this.tieneServiciosEspecialesEdit) {
      // Si está activo, son TODOS los servicios especiales corporativos
      const espIds = this.serviciosEspeciales.map(s => Number(s.id));
      cleanIds = Array.from(new Set([...cleanIds, ...espIds]));
    }

    if (!cleanIds.length) {
      this.toastService.warning('Servicios requeridos', 'Seleccione al menos un servicio del catálogo.');
      return;
    }

    const actualizada: Sucursal = {
      ...this.sucursal,
      servicioIds: cleanIds,
      serviciosNombres: this.catalogoServicios
        .filter(s => cleanIds.includes(Number(s.id)))
        .map(s => s.nombre),
      tieneServiciosEspeciales: this.tieneServiciosEspecialesEdit
    };
    this.sucursalService.actualizarSucursal(actualizada, {
      motivo: 'Actualización de servicios de sucursal',
      realizadoPor: `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'Sistema'
    }).subscribe({
      next: (res) => {
        this.sucursal = res;
        this.modalServiciosOpen = false;
        this.toastService.success('Servicios actualizados', res.nombre + ' ahora ofrece ' + (res.serviciosNombres?.length || 0) + ' servicios.');
      },
      error: (err) => this.toastService.error('No se pudieron guardar los servicios', this.mensajeError(err, 'El servidor no aceptó los cambios.'))
    });
  }
}


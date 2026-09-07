import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AgenciaMockService } from '../../core/services/agencia-mock.service';
import { MarcaSucursalMockService } from '../../core/services/marca-sucursal-mock.service';
import { Agencia, MarcaSucursal } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-agencias',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Top Title Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Gestión de Agencias EasyDry®</h1>
          <p class="text-slate-500 text-xs mt-1">Administración de sucursales, infraestructura de bahías y métricas de desempeño.</p>
        </div>
      </div>

      <!-- Filtros inline -->
      <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-[170px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="tag" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Marca
          </label>
          <select [(ngModel)]="filtroMarcaId" (change)="aplicarFiltros()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option [ngValue]="0">Todas las Marcas</option>
            @for (m of marcasActivas; track m.id) {
              <option [ngValue]="m.id">{{ m.nombre }}</option>
            }
          </select>
        </div>

        <div class="flex-1 min-w-[170px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="map-pin" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Agencia
          </label>
          <select [(ngModel)]="filtroNombreAgencia" (change)="aplicarFiltros()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todas">Todas las Agencias</option>
            @for (a of nombresAgencias; track a) {
              <option [value]="a">{{ a }}</option>
            }
          </select>
        </div>

        <div class="flex-1 min-w-[140px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="check-circle" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Estado
          </label>
          <select [(ngModel)]="filtroEstado" (change)="aplicarFiltros()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todos">Todos</option>
            <option value="Operativa">Operativa</option>
            <option value="Capacidad Máxima">Capacidad Máxima</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Inactiva">Inactiva</option>
          </select>
        </div>

        <div class="flex items-center gap-3 mt-4 sm:mt-0 ml-auto">
          <button 
            (click)="openModalNuevaAgencia()"
            class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide name="plus" class="w-4 h-4"></i-lucide>
            <span class="hidden sm:inline">Registrar Nueva Agencia</span>
            <span class="sm:hidden">Nueva Agencia</span>
          </button>
        </div>

        <div class="w-auto flex items-center self-end pb-0.5 ml-auto">
          <button
            type="button"
            (click)="limpiarFiltros()"
            class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-200 hover:border-rose-200 cursor-pointer shadow-2xs">
            <i-lucide name="rotate-ccw" class="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-600"></i-lucide>
            <span>Limpiar filtros</span>
          </button>
        </div>
      </div>

      <!-- Conteo de resultados -->
      <div class="text-xs font-semibold text-slate-500">
        Agencias encontradas: <strong class="text-easydry-blue">{{ agenciasFiltradas.length }}</strong>
      </div>

      <!-- Agency Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (agencia of agenciasFiltradas; track agencia.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry hover:shadow-easydry-hover transition-all duration-300 p-6 flex flex-col justify-between group">
            
            <div>
              <!-- Header & Badge -->
              <div class="flex items-start justify-between mb-4">
                <div class="w-12 h-12 rounded-2xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center font-bold">
                  <i-lucide name="building-2" class="w-6 h-6"></i-lucide>
                </div>
                <span 
                  class="px-2.5 py-1 rounded-full text-xs font-bold"
                  [ngClass]="{
                    'bg-easydry-green/20 text-easydry-green-dark': agencia.estado === 'Operativa',
                    'bg-amber-100 text-amber-800': agencia.estado === 'Capacidad Máxima',
                    'bg-rose-100 text-rose-800': agencia.estado === 'Mantenimiento'
                  }">
                  {{ agencia.estado }}
                </span>
              </div>

              <h3 class="font-bold text-slate-900 text-lg font-outfit group-hover:text-easydry-blue transition-colors">{{ agencia.nombre }}</h3>
              <p class="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                <i-lucide name="building-2" class="w-3.5 h-3.5 text-slate-400"></i-lucide>
                <span>{{ agencia.ciudad }}</span>
              </p>
              
              <p class="text-xs text-slate-400 mt-2 line-clamp-2">{{ agencia.direccion }}</p>
            </div>

            <!-- Stats & Progress -->
            <div class="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-medium">Bahías Activas:</span>
                <span class="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{{ agencia.numeroBahias }} Bahías</span>
              </div>

              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-medium">Personal Asignado:</span>
                <span class="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{{ agencia.empleados }} Empleados</span>
              </div>

              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500 font-medium">Productividad:</span>
                  <span class="font-extrabold text-easydry-green-dark">{{ agencia.productividad }}%</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-easydry-blue to-easydry-green rounded-full" 
                    [style.width.%]="agencia.productividad">
                  </div>
                </div>
              </div>

              <button 
                (click)="verDetalle(agencia)"
                class="w-full mt-2 py-2 bg-slate-50 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                <i-lucide name="eye" class="w-3.5 h-3.5"></i-lucide>
                <span>Ver Ficha Técnica Completa</span>
              </button>
            </div>

          </div>
        }
      </div>

      <!-- Detail Modal -->
      <app-modal 
        [isOpen]="modalDetalleOpen" 
        [title]="agenciaSeleccionada?.nombre || 'Detalle de Agencia'" 
        icon="building-2"
        (close)="modalDetalleOpen = false">
        
        @if (agenciaSeleccionada) {
          <div class="space-y-6">
            
            <!-- Quick Summary Bar -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p class="text-[11px] text-slate-400 font-bold uppercase">Ciudad</p>
                <p class="font-bold text-slate-900 text-sm mt-0.5">{{ agenciaSeleccionada.ciudad }}</p>
              </div>
              <div>
                <p class="text-[11px] text-slate-400 font-bold uppercase">Gerente Sucursal</p>
                <p class="font-bold text-slate-900 text-sm mt-0.5">{{ agenciaSeleccionada.gerenteAsignado }}</p>
              </div>
              <div>
                <p class="text-[11px] text-slate-400 font-bold uppercase">Bahías de Lavado</p>
                <p class="font-bold text-easydry-blue text-sm mt-0.5">{{ agenciaSeleccionada.numeroBahias }} Operativas</p>
              </div>
              <div>
                <p class="text-[11px] text-slate-400 font-bold uppercase">Productividad Mes</p>
                <p class="font-bold text-easydry-green-dark text-sm mt-0.5">{{ agenciaSeleccionada.productividad }}%</p>
              </div>
            </div>

            <!-- Operational Bays Grid Preview -->
            <div>
              <h4 class="font-bold text-slate-900 text-sm mb-3">Distribución de Bahías de Servicio</h4>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                @for (b of [1,2,3,4,5,6,7,8]; track b) {
                  @if (b <= agenciaSeleccionada.numeroBahias) {
                    <div class="p-3 bg-easydry-green/10 border border-easydry-green/30 rounded-xl flex flex-col justify-between">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-900">Bahía #{{ b }}</span>
                        <span class="w-2 h-2 rounded-full bg-easydry-green"></span>
                      </div>
                      <p class="text-[10px] text-slate-500 mt-2">En Servicio Eco-Dry</p>
                    </div>
                  }
                }
              </div>
            </div>

            <!-- Assigned Equipment & Staff -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-4 border border-slate-200 rounded-2xl">
                <h4 class="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                  <i-lucide name="users" class="w-4 h-4 text-easydry-blue"></i-lucide>
                  <span>Equipo Humano Asignado</span>
                </h4>
                <p class="text-xs text-slate-600">Total: <strong>{{ agenciaSeleccionada.empleados }} operarios y especialistas</strong> capacitados en técnicas de lavado sin agua y recubrimientos cerámicos.</p>
              </div>

              <div class="p-4 border border-slate-200 rounded-2xl">
                <h4 class="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                  <i-lucide name="hard-drive" class="w-4 h-4 text-easydry-blue"></i-lucide>
                  <span>Infraestructura Técnica</span>
                </h4>
                <p class="text-xs text-slate-600">Cuenta con hidrolavadoras de alta eficiencia, sistemas de filtrado ecológico y generadores de vapor industrial.</p>
              </div>
            </div>

          </div>
        }

        <div modal-footer>
          <button (click)="modalDetalleOpen = false" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs">
            Cerrar Ficha
          </button>
        </div>
      </app-modal>

      <!-- Modal Crear Agencia -->
      <app-modal 
        [isOpen]="modalCrearOpen" 
        title="Registrar Nueva Agencia EasyDry" 
        icon="building-2"
        (close)="modalCrearOpen = false">
        
        <form (ngSubmit)="guardarNuevaAgencia()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de Agencia</label>
            <input type="text" [(ngModel)]="nuevaAgencia.nombre" name="nombre" placeholder="ej. EasyDry Cumbayá 2" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Ciudad</label>
              <input type="text" [(ngModel)]="nuevaAgencia.ciudad" name="ciudad" placeholder="Quito / Guayaquil" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Número de Bahías</label>
              <input type="number" [(ngModel)]="nuevaAgencia.numeroBahias" name="numeroBahias" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección Física</label>
            <input type="text" [(ngModel)]="nuevaAgencia.direccion" name="direccion" placeholder="Av. Principal #123" class="w-full p-2.5 border rounded-xl text-sm">
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalCrearOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarNuevaAgencia()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">Guardar Agencia</button>
        </div>
      </app-modal>

    </div>
  `
})
export class AgenciasComponent implements OnInit {
  agencias: Agencia[] = [];
  agenciasFiltradas: Agencia[] = [];
  agenciaSeleccionada?: Agencia;
  modalDetalleOpen = false;
  modalCrearOpen = false;

  filtroMarcaId = 0;
  filtroNombreAgencia = 'Todas';
  filtroEstado = 'Todos';
  marcasActivas: MarcaSucursal[] = [];
  nombresAgencias: string[] = [];

  nuevaAgencia = {
    nombre: '',
    ciudad: 'Quito',
    numeroBahias: 6,
    empleados: 12,
    productividad: 95.0,
    estado: 'Operativa' as Agencia['estado'],
    direccion: '',
    gerenteAsignado: 'Asignación Pendiente'
  };

  private agenciaService = inject(AgenciaMockService);
  private marcaService = inject(MarcaSucursalMockService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.marcasActivas = this.marcaService.getActivas();
    this.agenciaService.getAgencias().subscribe(list => {
      this.agencias = list;
      this.nombresAgencias = Array.from(new Set(list.map(a => a.nombre))).sort();
      this.aplicarFiltros();
    });
  }

  aplicarFiltros(): void {
    this.agenciasFiltradas = this.agencias.filter(a => {
      const okMarca = this.filtroMarcaId === 0 || a.marcaId === this.filtroMarcaId;
      const okNombre = this.filtroNombreAgencia === 'Todas' || a.nombre === this.filtroNombreAgencia;
      const okEstado = this.filtroEstado === 'Todos' || a.estado === this.filtroEstado;
      return okMarca && okNombre && okEstado;
    });
  }

  limpiarFiltros(): void {
    this.filtroMarcaId = 0;
    this.filtroNombreAgencia = 'Todas';
    this.filtroEstado = 'Todos';
    this.aplicarFiltros();
  }

  verDetalle(agencia: Agencia) {
    this.agenciaSeleccionada = agencia;
    this.modalDetalleOpen = true;
  }

  openModalNuevaAgencia() {
    this.modalCrearOpen = true;
  }

  guardarNuevaAgencia() {
    if (!this.nuevaAgencia.nombre) {
      this.toastService.warning('Datos Incompletos', 'Ingrese el nombre de la nueva agencia.');
      return;
    }

    this.agenciaService.crearAgencia(this.nuevaAgencia).subscribe(creada => {
      this.toastService.success('Agencia Creada', `Se ha registrado ${creada.nombre} con éxito.`);
      this.modalCrearOpen = false;
    });
  }
}

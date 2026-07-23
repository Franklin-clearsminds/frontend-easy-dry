import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { BahiaMockService } from '../../core/services/bahia-mock.service';
import { Sucursal } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, ModalComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Control de Sucursales EasyDry®</h1>
          <p class="text-slate-500 text-xs mt-1">Gestión de infraestructura de bahías, personal operativo por sucursal y asignación de maquinaria.</p>
        </div>
        
        <div class="flex items-center gap-3">
          <a [routerLink]="['/mapa-operativo']" class="px-4 py-2.5 bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-2">
            <i-lucide name="sliders" class="w-4 h-4"></i-lucide>
            <span>Ver Mapa Operativo Global</span>
          </a>
          <button 
            (click)="modalCrearOpen = true"
            class="px-4 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs">
            <i-lucide name="plus" class="w-4 h-4"></i-lucide>
            <span>Registrar Nueva Sucursal</span>
          </button>
        </div>
      </div>

      <!-- Sucursales Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (suc of sucursales; track suc.id) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry hover:shadow-easydry-hover transition-all duration-300 p-6 flex flex-col justify-between group">
            
            <div>
              <div class="flex items-start justify-between mb-4">
                <div class="w-12 h-12 rounded-2xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center font-bold">
                  <i-lucide name="building-2" class="w-6 h-6"></i-lucide>
                </div>
                  <div class="flex items-center gap-2">
                    <button (click)="abrirModalEditar(suc)" class="p-1.5 bg-slate-100 hover:bg-easydry-blue text-slate-400 hover:text-white rounded-lg transition-colors" title="Editar Sucursal">
                      <i-lucide name="pencil" class="w-4 h-4"></i-lucide>
                    </button>
                    <span 
                      class="px-2.5 py-1 rounded-full text-xs font-bold"
                      [ngClass]="suc.estado === 'Activo' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-rose-100 text-rose-800'">
                      {{ suc.estado }}
                    </span>
                  </div>
              </div>

              <h3 class="font-bold text-slate-900 text-lg font-outfit group-hover:text-easydry-blue transition-colors">{{ suc.nombre }}</h3>
              <p class="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-1">
                <i-lucide name="building-2" class="w-3.5 h-3.5 text-slate-400"></i-lucide>
                <span>{{ suc.ciudad }}</span>
              </p>
              
              <p class="text-xs text-slate-400 mt-2 line-clamp-2">{{ suc.direccion }}</p>
            </div>

            <!-- Operational Metrics -->
            <div class="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="p-2 bg-slate-50 rounded-xl">
                  <span class="text-[10px] text-slate-400 uppercase font-bold block">Bahías</span>
                  <span class="font-extrabold text-easydry-blue text-sm">{{ suc.cantidadBahias }} Bahías</span>
                </div>
                <div class="p-2 bg-slate-50 rounded-xl">
                  <span class="text-[10px] text-slate-400 uppercase font-bold block">Operadores</span>
                  <span class="font-extrabold text-easydry-green-dark text-sm">{{ suc.operadoresActivos || 4 }} Activos</span>
                </div>
              </div>

              <div class="flex items-center justify-between text-xs pt-1">
                <span class="text-slate-500">Responsable:</span>
                <span class="font-bold text-slate-800">{{ suc.responsable }}</span>
              </div>

              <a 
                [routerLink]="['/sucursales', suc.id]" 
                class="w-full mt-2 py-2 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                <i-lucide name="eye" class="w-3.5 h-3.5"></i-lucide>
                <span>Ver Bahías & Operación</span>
              </a>
            </div>

          </div>
        }
      </div>

      <!-- Modal Crear / Editar Sucursal -->
      <app-modal 
        [isOpen]="modalCrearOpen" 
        [title]="editandoSucursal ? 'Editar Sucursal EasyDry' : 'Registrar Nueva Sucursal EasyDry'" 
        [icon]="editandoSucursal ? 'pencil' : 'building-2'"
        (close)="cerrarModal()">
        
        <form (ngSubmit)="guardarSucursal()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de Sucursal</label>
            <input type="text" [(ngModel)]="nuevaSucursal.nombre" name="nombre" placeholder="ej. EasyDry Guayaquil Samborondón" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Ciudad</label>
              <input type="text" [(ngModel)]="nuevaSucursal.ciudad" name="ciudad" placeholder="Quito / Guayaquil / Cuenca" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad de Bahías</label>
              <input type="number" [(ngModel)]="nuevaSucursal.cantidadBahias" name="cantidadBahias" min="1" max="12" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección Exacta</label>
            <input type="text" [(ngModel)]="nuevaSucursal.direccion" name="direccion" placeholder="Av. Principal N45-120" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Gerente / Responsable</label>
            <input type="text" [(ngModel)]="nuevaSucursal.responsable" name="responsable" placeholder="Nombre de Responsable" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>
        </form>

        <div modal-footer>
          <button (click)="cerrarModal()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarSucursal()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">
            {{ editandoSucursal ? 'Guardar Cambios' : 'Guardar Sucursal' }}
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class SucursalesComponent implements OnInit {
  sucursales: Sucursal[] = [];
  modalCrearOpen = false;
  editandoSucursal = false;

  nuevaSucursal = {
    id: 0,
    nombre: '',
    ciudad: 'Quito',
    direccion: '',
    cantidadBahias: 4,
    estado: 'Activo' as Sucursal['estado'],
    responsable: ''
  };

  private sucursalService = inject(SucursalMockService);
  private bahiaService = inject(BahiaMockService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.cargarSucursales();
  }

  cargarSucursales() {
    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
  }

  abrirModalEditar(suc: Sucursal) {
    this.editandoSucursal = true;
    this.nuevaSucursal = { ...suc };
    this.modalCrearOpen = true;
  }

  cerrarModal() {
    this.modalCrearOpen = false;
    this.editandoSucursal = false;
    this.nuevaSucursal = {
      id: 0,
      nombre: '',
      ciudad: 'Quito',
      direccion: '',
      cantidadBahias: 4,
      estado: 'Activo',
      responsable: ''
    };
  }

  guardarSucursal() {
    if (!this.nuevaSucursal.nombre || !this.nuevaSucursal.responsable) {
      this.toastService.warning('Datos Incompletos', 'Ingrese nombre y responsable de la sucursal.');
      return;
    }

    if (this.editandoSucursal) {
      this.sucursalService.actualizarSucursal(this.nuevaSucursal as Sucursal).subscribe(actualizada => {
        // Synchronize bays if amount changed
        this.bahiaService.sincronizarBahias(actualizada.id, actualizada.nombre, actualizada.cantidadBahias);
        this.toastService.success('Sucursal Actualizada', `Se guardaron los cambios para ${actualizada.nombre}.`);
        this.cerrarModal();
        this.cargarSucursales();
      });
    } else {
      this.sucursalService.crearSucursal(this.nuevaSucursal).subscribe(creada => {
        // Automatically synchronize bays for a new branch
        this.bahiaService.sincronizarBahias(creada.id, creada.nombre, creada.cantidadBahias);
        this.toastService.success('Sucursal Registrada', `Se configuró ${creada.nombre} con ${creada.cantidadBahias} bahías.`);
        this.cerrarModal();
        this.cargarSucursales();
      });
    }
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UsuarioMockService } from '../../core/services/usuario-mock.service';
import { Usuario } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ToastService } from '../../shared/services/toast.service';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Administración de Usuarios & Roles</h1>
          <p class="text-slate-500 text-xs mt-1">Gestión del personal administrativo, gerentes de agencia, supervisores y técnicos.</p>
        </div>
        <button 
          (click)="modalCrearOpen = true"
          class="px-4 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs self-start sm:self-auto">
          <i-lucide name="plus" class="w-4 h-4"></i-lucide>
          <span>Registrar Nuevo Usuario</span>
        </button>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="true" 
        [showOperador]="false"
        [showBahia]="false"
        [showEstado]="true"
        [showFechas]="false"
        [listaEstados]="['Todos', 'Activo', 'Inactivo', 'Suspendido']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Users Grid / Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-base font-outfit">Directorio de Equipo Humano EasyDry</h3>
          <span class="text-xs text-slate-500 font-bold">{{ usuariosFiltrados.length }} Usuarios Registrados</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Usuario</th>
                <th class="py-3.5 px-4">Rol / Nivel</th>
                <th class="py-3.5 px-4">Agencia Asignada</th>
                <th class="py-3.5 px-4">Correo Electrónico</th>
                <th class="py-3.5 px-4">Fecha Asignación</th>
                <th class="py-3.5 px-4">Estado</th>
                <th class="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (u of paginatedUsuarios; track u.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      <img [src]="u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'" alt="Avatar" class="w-9 h-9 rounded-full object-cover border-2 border-easydry-blue/20">
                      <div>
                        <p class="font-bold text-slate-900 text-xs">{{ u.nombre }} {{ u.apellido }}</p>
                        <p class="text-[10px] text-slate-400 font-mono">ID: USR-00{{ u.id }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2.5 py-1 rounded-lg text-xs font-bold"
                      [ngClass]="{
                        'bg-purple-100 text-purple-900 border border-purple-300': u.rol === 'SuperAdmin',
                        'bg-easydry-blue/15 text-easydry-blue': u.rol === 'Gerente',
                        'bg-blue-100 text-blue-800': u.rol === 'Supervisor',
                        'bg-slate-100 text-slate-700': u.rol.includes('Técnico')
                      }">
                      {{ u.rol }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-xs font-semibold text-slate-700">
                    {{ u.agencia }}
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-600 font-mono">
                    {{ u.email }}
                  </td>
                  <td class="py-3.5 px-4 text-xs font-mono text-slate-500">
                    {{ u.fechaAsignacion }}
                  </td>
                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2.5 py-1 rounded-full text-xs font-bold"
                      [ngClass]="u.estado === 'Activo' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-slate-200 text-slate-700'">
                      {{ u.estado }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <button (click)="editarUsuario(u)" class="p-1.5 text-slate-400 hover:text-easydry-blue rounded-lg hover:bg-slate-100 transition-colors">
                      <i-lucide name="settings" class="w-4 h-4"></i-lucide>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <app-pagination 
          [totalItems]="usuarios.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal Crear / Editar Usuario -->
      <app-modal 
        [isOpen]="modalCrearOpen" 
        title="Registrar Usuario en la Plataforma" 
        icon="users"
        (close)="modalCrearOpen = false">
        
        <form (ngSubmit)="guardarUsuario()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
              <input type="text" [(ngModel)]="nuevoUsuario.nombre" name="nombre" placeholder="Nombre" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Apellido</label>
              <input type="text" [(ngModel)]="nuevoUsuario.apellido" name="apellido" placeholder="Apellido" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Rol en el Sistema</label>
              <select [(ngModel)]="nuevoUsuario.rol" name="rol" class="w-full p-2.5 border rounded-xl text-sm">
                <option value="SuperAdmin">SuperAdmin</option>
                <option value="Gerente">Gerente de Agencia</option>
                <option value="Supervisor">Supervisor de Operaciones</option>
                <option value="Técnico Especialista">Técnico Especialista</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia</label>
              <select [(ngModel)]="nuevoUsuario.agencia" name="agencia" class="w-full p-2.5 border rounded-xl text-sm">
                <option value="EasyDry Corporativo">EasyDry Corporativo</option>
                <option value="EasyDry Quito Norte">EasyDry Quito Norte</option>
                <option value="EasyDry Quito Sur">EasyDry Quito Sur</option>
                <option value="EasyDry Cumbayá">EasyDry Cumbayá</option>
                <option value="EasyDry Guayaquil">EasyDry Guayaquil</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Correo Electrónico Corporativo</label>
              <input type="email" [(ngModel)]="nuevoUsuario.email" name="email" placeholder="usuario@easydry.com" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña</label>
              <input type="password" [(ngModel)]="nuevoUsuario.password" name="password" placeholder="••••••••" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>
        </form>

        <div modal-footer>
          <button (click)="modalCrearOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarUsuario()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">Guardar Usuario</button>
        </div>
      </app-modal>

    </div>
  `
})
export class UsuariosComponent implements OnInit {
  usuarios: Usuario[] = [];
  modalCrearOpen = false;

  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    this.currentPage = 1;
  }

  get usuariosFiltrados() {
    let resultados = this.usuarios;

    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(u => u.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(u => u.agencia === this.filtrosGlobales.sucursal);
    }
    
    return resultados;
  }

  currentPage = 1;
  pageSize = 5;

  nuevoUsuario = {
    nombre: '',
    apellido: '',
    rol: 'Gerente' as Usuario['rol'],
    agencia: 'EasyDry Quito Norte',
    estado: 'Activo' as Usuario['estado'],
    fechaAsignacion: new Date().toISOString().split('T')[0],
    email: '',
    password: '',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  };

  private usuarioService = inject(UsuarioMockService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.usuarioService.getUsuarios().subscribe(list => {
      this.usuarios = list;
    });
  }

  get paginatedUsuarios() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.usuariosFiltrados.slice(start, start + this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  editarUsuario(u: Usuario) {
    this.toastService.info('Editar Usuario', `Modificando perfil de ${u.nombre} ${u.apellido}`);
  }

  guardarUsuario() {
    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.email || !this.nuevoUsuario.password) {
      this.toastService.warning('Datos Incompletos', 'Ingrese nombre, correo y contraseña.');
      return;
    }

    this.usuarioService.crearUsuario(this.nuevoUsuario).subscribe(creado => {
      this.toastService.success('Usuario Creado', `Usuario ${creado.nombre} ${creado.apellido} registrado.`);
      this.modalCrearOpen = false;
    });
  }
}

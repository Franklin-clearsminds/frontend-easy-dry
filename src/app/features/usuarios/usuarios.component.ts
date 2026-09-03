import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UsuarioMockService } from '../../core/services/usuario-mock.service';
import { RolMockService } from '../../core/services/rol-mock.service';
import { DEMO_CREDENTIALS } from '../../core/services/auth.service';
import { Usuario, ModuloSistema, RolPersonalizado, MODULOS_SISTEMA, Sucursal, ModalidadPulidor } from '../../core/models';
import { isRolPermisosInmutable, PermisoModuloAcciones } from '../../core/models/roles.model';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { esRolOperadorEspeciales } from '../../core/utils/modalidad-especiales.util';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ToastService } from '../../shared/services/toast.service';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

interface ModuloGrupo {
  grupo: string;
  modulos: ModuloSistema[];
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Top Banner Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2 border border-purple-200">
            <i-lucide name="shield" class="w-3.5 h-3.5"></i-lucide>
            <span>Control de Acceso y Estructura Organizacional</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Gestión de Usuarios, Roles y Permisos</h1>
          <p class="text-slate-500 text-xs mt-1">
            Administra el equipo de trabajo y define roles dinámicos con asignación granular de acceso a cada módulo del sistema.
          </p>
        </div>

        <div class="flex items-center gap-3">
          @if (activeTab === 'usuarios') {
            <button 
              (click)="abrirModalCrearUsuario()"
              class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
              <i-lucide name="user-plus" class="w-4 h-4"></i-lucide>
              <span>Registrar Usuario</span>
            </button>
          } @else {
            <button 
              (click)="abrirModalCrearRol()"
              class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
              <i-lucide name="shield-plus" class="w-4 h-4"></i-lucide>
              <span>Crear Nuevo Rol</span>
            </button>
          }
        </div>
      </div>

      <!-- Navigation Tabs (Usuarios vs Roles) -->
      <div class="bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center gap-2 shadow-xs max-w-md">
        <button
          (click)="activeTab = 'usuarios'"
          class="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2"
          [ngClass]="activeTab === 'usuarios' ? 'bg-easydry-blue text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'">
          <i-lucide name="users" class="w-4 h-4"></i-lucide>
          <span>Directorio de Usuarios ({{ usuarios.length }})</span>
        </button>

        <button
          (click)="activeTab = 'roles'"
          class="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2"
          [ngClass]="activeTab === 'roles' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'">
          <i-lucide name="shield" class="w-4 h-4"></i-lucide>
          <span>Roles y Permisos ({{ roles.length }})</span>
        </button>
      </div>

      <!-- ======================================================== -->
      <!-- TAB 1: DIRECTORIO DE USUARIOS                           -->
      <!-- ======================================================== -->
      @if (activeTab === 'usuarios') {
        <div class="space-y-6">
          <!-- Global Filter Bar -->
          <app-filter-bar 
            [showSucursal]="true" 
            [showOperador]="false"
            [showBahia]="false"
            [showEstado]="true"
            [showBusqueda]="true"
            [placeholderBusqueda]="'Buscar por nombre, correo o rol...'"
            [showFechas]="false"
            [listaEstados]="['Todos', 'Activo', 'Inactivo', 'Suspendido']"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>

          <!-- Users Grid / Table -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-slate-900 text-base font-outfit">Directorio de Colaboradores EasyDry</h3>
                <p class="text-xs text-slate-500">Personal asignado a sedes con roles dinámicos del sistema</p>
              </div>
              <span class="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                {{ usuariosFiltrados.length }} Usuarios Encontrados
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="py-3.5 px-4">Usuario</th>
                    <th class="py-3.5 px-4">Rol Asignado</th>
                    <th class="py-3.5 px-4">Agencia / Local</th>
                    <th class="py-3.5 px-4">Correo Electrónico</th>
                    <th class="py-3.5 px-4">Fecha Ingreso</th>
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
                          class="px-2.5 py-1 rounded-lg text-xs font-bold border"
                          [ngClass]="getRolBadgeClass(u.rol)">
                          {{ u.rol }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        <div class="flex flex-col gap-1">
                          <span>{{ u.agencia }}</span>
                          @if (esOperadorEspecialesRol(u.rol)) {
                            <span
                              class="w-fit px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide"
                              [ngClass]="u.modalidadPulidor === 'FIJO'
                                ? 'bg-easydry-blue/10 text-easydry-blue border border-easydry-blue/20'
                                : 'bg-cyan-50 text-cyan-800 border border-cyan-200'">
                              {{ u.modalidadPulidor === 'FIJO' ? 'Pulidor fijo' : 'Pulidor móvil' }}
                            </span>
                          }
                        </div>
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
                        <button 
                          (click)="editarUsuario(u)" 
                          title="Editar Usuario"
                          class="p-1.5 text-slate-400 hover:text-easydry-blue rounded-lg hover:bg-slate-100 transition-colors">
                          <i-lucide name="edit-3" class="w-4 h-4"></i-lucide>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            
            <app-pagination 
              [totalItems]="usuariosFiltrados.length" 
              [currentPage]="currentPage" 
              [pageSize]="pageSize"
              (pageChange)="onPageChange($event)"
              (pageSizeChange)="onPageSizeChange($event)">
            </app-pagination>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- TAB 2: MATRIZ DE ROLES Y PERMISOS MODULARES             -->
      <!-- ======================================================== -->
      @if (activeTab === 'roles') {
        <div class="space-y-6">

          <!-- Summary Metric Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <i-lucide name="shield-check" class="w-6 h-6"></i-lucide>
              </div>
              <div>
                <p class="text-2xl font-extrabold text-slate-900 font-outfit">{{ roles.length }}</p>
                <p class="text-xs text-slate-500 font-medium">Roles Configurados</p>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center flex-shrink-0">
                <i-lucide name="layout-grid" class="w-6 h-6"></i-lucide>
              </div>
              <div>
                <p class="text-2xl font-extrabold text-slate-900 font-outfit">{{ modulosDisponibles.length }}</p>
                <p class="text-xs text-slate-500 font-medium">Módulos del Sistema</p>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-easydry-green/15 text-easydry-green-dark flex items-center justify-center flex-shrink-0">
                <i-lucide name="users" class="w-6 h-6"></i-lucide>
              </div>
              <div>
                <p class="text-2xl font-extrabold text-slate-900">{{ rolesConUsuarios }}</p>
                <p class="text-xs text-slate-500 font-medium">Roles con Usuarios Activos</p>
              </div>
            </div>
          </div>

          <!-- Tabla de roles activos en la plataforma -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-slate-900 text-base font-outfit">Roles Activos en la Plataforma</h3>
                <p class="text-xs text-slate-500">Perfiles del sistema RBAC en uso con cuentas demo y módulos habilitados</p>
              </div>
              <span class="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                {{ roles.length }} roles configurados
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="py-3.5 px-4">Rol</th>
                    <th class="py-3.5 px-4">Código</th>
                    <th class="py-3.5 px-4">Usuarios</th>
                    <th class="py-3.5 px-4">Módulos</th>
                    <th class="py-3.5 px-4">Tipo</th>
                    <th class="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (rol of roles; track rol.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-3">
                          <div
                            class="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                            [style.background-color]="rol.color || '#7C3AED'">
                            <i-lucide name="shield" class="w-4 h-4"></i-lucide>
                          </div>
                          <div>
                            <p class="font-bold text-slate-900 text-xs">{{ rol.nombre }}</p>
                            <p class="text-[10px] text-slate-500 line-clamp-1 max-w-xs">{{ rol.descripcion }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{{ rol.codigo }}</span>
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="text-xs font-extrabold text-slate-800">{{ getUsuariosCountForRol(rol.nombre) }}</span>
                        @if (getCuentasDemoForRol(rol).length > 0) {
                          <p class="text-[10px] text-slate-400 mt-0.5">{{ getCuentasDemoForRol(rol)[0].email }}</p>
                        }
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="text-xs font-bold text-purple-700">{{ getModulosCount(rol) }} / {{ modulosDisponibles.length }}</span>
                      </td>
                      <td class="py-3.5 px-4">
                        @if (isRolPermisosInmutable(rol.codigo)) {
                          <span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase border border-purple-200">Inmutable</span>
                        } @else if (rol.esSistema) {
                          <span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase border border-purple-200">Sistema</span>
                        } @else if (rol.codigo === 'ADMIN') {
                          <span class="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-extrabold uppercase border border-violet-200">Configurable</span>
                        } @else {
                          <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">Personalizado</span>
                        }
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <button
                          (click)="abrirModalEditarRol(rol)"
                          title="Configurar permisos"
                          class="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors cursor-pointer flex items-center justify-center">
                          <i-lucide name="settings" class="w-4 h-4"></i-lucide>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="py-10 px-4 text-center text-sm text-slate-500">
                        No hay roles configurados. Use «Crear Nuevo Rol» para agregar uno.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Roles Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (rol of roles; track rol.id) {
              <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-easydry flex flex-col justify-between space-y-5 hover:border-purple-300 transition-all">
                <div>
                  <!-- Card Header -->
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <div 
                        class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-xs"
                        [style.background-color]="rol.color || '#7C3AED'">
                        <i-lucide name="shield" class="w-5 h-5"></i-lucide>
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h3 class="font-extrabold text-slate-900 text-base font-outfit">{{ rol.nombre }}</h3>
                          @if (isRolPermisosInmutable(rol.codigo)) {
                            <span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase border border-purple-200">
                              Inmutable
                            </span>
                          } @else if (rol.esSistema) {
                            <span class="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase border border-purple-200">
                              Sistema
                            </span>
                          } @else if (rol.codigo === 'ADMIN') {
                            <span class="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-extrabold uppercase border border-violet-200">
                              Configurable
                            </span>
                          }
                        </div>
                        <p class="text-[11px] text-slate-400 font-mono">Código: {{ rol.codigo }}</p>
                      </div>
                    </div>

                    <span class="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {{ getUsuariosCountForRol(rol.nombre) }} usuarios
                    </span>
                  </div>

                  <!-- Description -->
                  <p class="text-xs text-slate-600 mt-3 leading-relaxed">
                    {{ rol.descripcion }}
                  </p>

                  <!-- Modulos count bar -->
                  <div class="mt-4 pt-3 border-t border-slate-100">
                    <div class="flex items-center justify-between text-xs mb-1.5">
                      <span class="font-bold text-slate-700">Módulos Habilitados:</span>
                      <span class="font-extrabold text-purple-700">
                        {{ getModulosCount(rol) }} de {{ modulosDisponibles.length }} módulos
                      </span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        class="h-2 rounded-full transition-all duration-500"
                        [style.background-color]="rol.color || '#7C3AED'"
                        [style.width.%]="getModulosProgress(rol)">
                      </div>
                    </div>
                  </div>

                  <!-- Mini Badges of Allowed Modules -->
                  <div class="mt-3 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    @for (modCodigo of rol.modulos; track modCodigo) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700">
                        <i-lucide [name]="getModuloIcon(modCodigo)" class="w-3 h-3 text-easydry-blue"></i-lucide>
                        <span>{{ getModuloNombre(modCodigo) }}</span>
                      </span>
                    }
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 font-mono">Creado: {{ rol.fechaCreacion }}</span>

                  <div class="flex items-center gap-2">
                    <button
                      (click)="abrirModalEditarRol(rol)"
                      class="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors flex items-center gap-1.5 border border-purple-200">
                      <i-lucide name="sliders" class="w-3.5 h-3.5"></i-lucide>
                      <span>Configurar Permisos</span>
                    </button>

                    @if (!rol.esSistema) {
                      <button
                        (click)="eliminarRol(rol)"
                        title="Eliminar Rol"
                        class="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors">
                        <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
                      </button>
                    }
                  </div>
                </div>

              </div>
            }
          </div>

        </div>
      }

      <!-- ======================================================== -->
      <!-- MODAL: CREAR / EDITAR USUARIO                           -->
      <!-- ======================================================== -->
      <app-modal 
        [isOpen]="modalUsuarioOpen" 
        [title]="editandoUsuario ? 'Modificar Usuario y Rol' : 'Registrar Nuevo Usuario'" 
        icon="users"
        (close)="modalUsuarioOpen = false">
        
        <form (ngSubmit)="guardarUsuario()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
              <input type="text" [(ngModel)]="usuarioForm.nombre" name="nombre" placeholder="Nombre" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Apellido</label>
              <input type="text" [(ngModel)]="usuarioForm.apellido" name="apellido" placeholder="Apellido" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Rol Asignado (Dinámico)</label>
              <select [(ngModel)]="usuarioForm.rol" name="rol" (ngModelChange)="onRolUsuarioChange()" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                @for (r of roles; track r.id) {
                  <option [value]="r.nombre">{{ r.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
              <select [(ngModel)]="usuarioForm.estado" name="estado" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Suspendido">Suspendido</option>
              </select>
            </div>
          </div>

          @if (esOperadorEspecialesRol(usuarioForm.rol)) {
            <div class="p-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 space-y-3">
              <div>
                <p class="text-xs font-extrabold text-cyan-900 uppercase tracking-wide">Modalidad del pulidor</p>
                <p class="text-[11px] text-cyan-800 mt-0.5">Fijo: trabaja solo en una sucursal. Móvil: se desplaza entre sedes.</p>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  (click)="setModalidadPulidor('FIJO')"
                  class="px-3 py-2.5 rounded-xl text-xs font-extrabold border transition-colors"
                  [ngClass]="usuarioForm.modalidadPulidor === 'FIJO'
                    ? 'bg-easydry-blue text-white border-easydry-blue'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-easydry-blue'">
                  Fijo en sucursal
                </button>
                <button
                  type="button"
                  (click)="setModalidadPulidor('MOVIL')"
                  class="px-3 py-2.5 rounded-xl text-xs font-extrabold border transition-colors"
                  [ngClass]="usuarioForm.modalidadPulidor === 'MOVIL'
                    ? 'bg-cyan-700 text-white border-cyan-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-400'">
                  Móvil · Red nacional
                </button>
              </div>
              @if (usuarioForm.modalidadPulidor === 'FIJO') {
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal asignada</label>
                  <select [(ngModel)]="usuarioForm.agencia" name="agenciaFijo" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white" required>
                    @for (s of sucursales; track s.id) {
                      <option [value]="s.nombre">{{ s.nombre }} ({{ s.ciudad }})</option>
                    }
                  </select>
                </div>
              } @else {
                <p class="text-xs font-semibold text-cyan-900">Ubicación: Red Nacional · Móvil entre sucursales</p>
              }
            </div>
          } @else {
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia / Local</label>
              <select [(ngModel)]="usuarioForm.agencia" name="agencia" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                <option value="EasyDry Corporativo">EasyDry Corporativo</option>
                @for (s of sucursales; track s.id) {
                  <option [value]="s.nombre">{{ s.nombre }}</option>
                }
              </select>
            </div>
          }

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Correo Electrónico</label>
            <input type="email" [(ngModel)]="usuarioForm.email" name="email" placeholder="usuario@easydry.com" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>

          @if (!editandoUsuario) {
            <div class="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900">
              <i-lucide name="mail-check" class="w-5 h-5 text-easydry-blue shrink-0 mt-0.5"></i-lucide>
              <div>
                <p class="font-bold">Invitación de Seguridad (Amazon Cognito)</p>
                <p class="text-[11px] text-blue-800/90 mt-0.5">
                  No se ingresa contraseña manualmente. Se enviará un correo electrónico de activación seguro al usuario para que establezca su contraseña según las políticas de seguridad.
                </p>
              </div>
            </div>
          }
        </form>

        <div modal-footer>
          <button (click)="modalUsuarioOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarUsuario()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            {{ editandoUsuario ? 'Actualizar Usuario' : 'Registrar y Enviar Invitación' }}
          </button>
        </div>
      </app-modal>

      <!-- ======================================================== -->
      <!-- MODAL: CONFIGURAR ROL Y MATRIZ DE PERMISOS MODULARES    -->
      <!-- ======================================================== -->
      <app-modal 
        [isOpen]="modalRolOpen" 
        [title]="editandoRol ? 'Configurar Permisos de: ' + rolForm.nombre : 'Crear Nuevo Rol de Usuario'" 
        icon="shield"
        (close)="modalRolOpen = false">
        
        <div class="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          
          <!-- Role Main Data -->
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Rol</label>
                <input 
                  type="text" 
                  [(ngModel)]="rolForm.nombre" 
                  placeholder="Ej: Auditor Operativo, Jefe de Patio, Cajero" 
                  [disabled]="isRolPermisosInmutable(rolForm.codigo) || rolForm.esSistema"
                  class="w-full p-2.5 border rounded-xl text-sm font-bold text-slate-900">
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Color Identificador</label>
                <div class="flex items-center gap-2">
                  <input type="color" [(ngModel)]="rolForm.color" class="w-10 h-10 rounded-xl cursor-pointer border p-0.5">
                  <span class="text-xs font-mono text-slate-600 font-bold">{{ rolForm.color }}</span>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Rol</label>
              <textarea 
                [(ngModel)]="rolForm.descripcion" 
                rows="2" 
                placeholder="Describe las responsabilidades y alcance de este perfil..." 
                class="w-full p-2.5 border rounded-xl text-xs"></textarea>
            </div>
          </div>

          <!-- Modular Permissions Matrix Header (Punto 10) -->
          <div class="border-t border-slate-200 pt-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 class="font-extrabold text-slate-900 text-sm font-outfit">Matriz de Acceso y Acciones por Módulo</h4>
                <p class="text-xs text-slate-500">Configuración granular de permisos: Ver, Crear, Editar y Configurar por cada módulo.</p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="seleccionarTodosModulos()"
                  class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors">
                  Seleccionar Todos
                </button>
                <button
                  type="button"
                  (click)="desmarcarTodosModulos()"
                  [disabled]="isRolPermisosInmutable(rolForm.codigo) || rolForm.esSistema"
                  class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                  Desmarcar Todos
                </button>
              </div>
            </div>

            <!-- Modules Matrix Grouped by Functional Area -->
            <div class="space-y-5">
              @for (grupo of modulosAgrupados; track grupo.grupo) {
                <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold text-easydry-blue uppercase tracking-wider">
                      {{ grupo.grupo }}
                    </span>
                    <span class="text-[11px] font-bold text-slate-400">
                      {{ getSelectedInGroupCount(grupo) }} / {{ grupo.modulos.length }}
                    </span>
                  </div>

                  <div class="space-y-2.5">
                    @for (mod of grupo.modulos; track mod.id) {
                      <div
                        class="p-3.5 rounded-xl border bg-white transition-all space-y-2.5"
                        [ngClass]="isModuloSelected(mod.codigo) ? 'border-purple-300 ring-1 ring-purple-200 bg-purple-50/15' : 'border-slate-200'">
                        
                        <div class="flex items-center justify-between">
                          <label class="flex items-center gap-2.5 cursor-pointer">
                            <input 
                              type="checkbox"
                              [checked]="isModuloSelected(mod.codigo)"
                              [disabled]="isRolPermisosInmutable(rolForm.codigo) || rolForm.esSistema"
                              (change)="toggleModulo(mod.codigo)"
                              class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer">
                            <div class="flex items-center gap-1.5">
                              <i-lucide [name]="mod.icono" class="w-4 h-4 text-purple-600 flex-shrink-0"></i-lucide>
                              <span class="font-bold text-xs text-slate-900">{{ mod.nombre }}</span>
                            </div>
                          </label>
                          <span class="text-[10px] font-mono text-slate-400">Ruta: {{ mod.rutaPrincipal }}</span>
                        </div>

                        <!-- Matriz de Acciones Granulares (Punto 10: Ver, Crear, Editar, Configurar) -->
                        @if (isModuloSelected(mod.codigo)) {
                          <div class="pt-2 border-t border-slate-100 flex items-center gap-5 flex-wrap text-xs">
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Acciones:</span>
                            <label class="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                [checked]="getPermisoAccion(mod.codigo, 'ver')"
                                (change)="togglePermisoAccion(mod.codigo, 'ver')"
                                class="rounded text-purple-600 focus:ring-purple-500 cursor-pointer">
                              <span class="font-semibold text-slate-700 text-xs">Ver</span>
                            </label>

                            <label class="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                [checked]="getPermisoAccion(mod.codigo, 'crear')"
                                (change)="togglePermisoAccion(mod.codigo, 'crear')"
                                class="rounded text-purple-600 focus:ring-purple-500 cursor-pointer">
                              <span class="font-semibold text-slate-700 text-xs">Crear</span>
                            </label>

                            <label class="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                [checked]="getPermisoAccion(mod.codigo, 'editar')"
                                (change)="togglePermisoAccion(mod.codigo, 'editar')"
                                class="rounded text-purple-600 focus:ring-purple-500 cursor-pointer">
                              <span class="font-semibold text-slate-700 text-xs">Editar</span>
                            </label>

                            <label class="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                [checked]="getPermisoAccion(mod.codigo, 'configurar')"
                                (change)="togglePermisoAccion(mod.codigo, 'configurar')"
                                class="rounded text-purple-600 focus:ring-purple-500 cursor-pointer">
                              <span class="font-semibold text-slate-700 text-xs">Configurar</span>
                            </label>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

          </div>

        </div>

        <div modal-footer>
          <button (click)="modalRolOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarRol()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide name="check" class="w-4 h-4"></i-lucide>
            <span>{{ editandoRol ? 'Guardar Cambios de Rol' : 'Crear Rol' }}</span>
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class UsuariosComponent implements OnInit {
  activeTab: 'usuarios' | 'roles' = 'usuarios';

  usuarios: Usuario[] = [];
  roles: RolPersonalizado[] = [];
  sucursales: Sucursal[] = [];
  modulosDisponibles: ModuloSistema[] = MODULOS_SISTEMA;
  modulosAgrupados: ModuloGrupo[] = [];

  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  currentPage = 1;
  pageSize = 5;

  // Modales
  modalUsuarioOpen = false;
  editandoUsuario: Usuario | null = null;
  usuarioForm: {
    nombre: string;
    apellido: string;
    rol: string;
    agencia: string;
    estado: string;
    email: string;
    modalidadPulidor: ModalidadPulidor;
  } = {
    nombre: '',
    apellido: '',
    rol: 'Gerente de Sucursal',
    agencia: 'EasyDry Quito Norte',
    estado: 'Activo',
    email: '',
    modalidadPulidor: 'MOVIL'
  };

  modalRolOpen = false;
  editandoRol: RolPersonalizado | null = null;
  rolForm: {
    id?: string;
    codigo?: string;
    nombre: string;
    descripcion: string;
    color: string;
    modulos: string[];
    esSistema: boolean;
    accionesPorModulo: Record<string, PermisoModuloAcciones>;
  } = {
    nombre: '',
    descripcion: '',
    color: '#7C3AED',
    modulos: [],
    esSistema: false,
    accionesPorModulo: {}
  };

  private usuarioService = inject(UsuarioMockService);
  private rolService = inject(RolMockService);
  private sucursalService = inject(SucursalMockService);
  private toastService = inject(ToastService);

  isRolPermisosInmutable = isRolPermisosInmutable;
  esOperadorEspecialesRol = esRolOperadorEspeciales;

  ngOnInit(): void {
    this.agruparModulos();

    this.usuarioService.getUsuarios().subscribe(list => {
      this.usuarios = list;
    });

    this.rolService.roles$.subscribe(list => {
      this.roles = list.map(rol => ({
        ...rol,
        modulos: Array.isArray(rol.modulos) ? rol.modulos : [],
      }));
    });

    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
  }

  get rolesConUsuarios(): number {
    return this.roles.filter(r => this.getUsuariosCountForRol(r.nombre) > 0).length;
  }

  getModulosCount(rol: RolPersonalizado): number {
    return rol.modulos?.length ?? 0;
  }

  getModulosProgress(rol: RolPersonalizado): number {
    if (!this.modulosDisponibles.length) return 0;
    return (this.getModulosCount(rol) / this.modulosDisponibles.length) * 100;
  }

  getCuentasDemoForRol(rol: RolPersonalizado) {
    return DEMO_CREDENTIALS.filter(
      c => c.role === rol.codigo || c.rolNombre.toLowerCase() === rol.nombre.toLowerCase()
    );
  }

  private agruparModulos() {
    const grupos: Record<string, ModuloSistema[]> = {};
    for (const m of this.modulosDisponibles) {
      if (!grupos[m.grupo]) grupos[m.grupo] = [];
      grupos[m.grupo].push(m);
    }
    this.modulosAgrupados = Object.entries(grupos).map(([grupo, modulos]) => ({
      grupo,
      modulos
    }));
  }

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
    if (this.filtrosGlobales.busqueda?.trim()) {
      const b = this.filtrosGlobales.busqueda.trim().toLowerCase();
      resultados = resultados.filter(u =>
        (u.nombre || '').toLowerCase().includes(b) ||
        (u.apellido || '').toLowerCase().includes(b) ||
        `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase().includes(b) ||
        (u.email || '').toLowerCase().includes(b) ||
        (u.rol || '').toLowerCase().includes(b) ||
        (u.agencia || '').toLowerCase().includes(b)
      );
    }
    return resultados;
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
    this.currentPage = 1;
  }

  getRolBadgeClass(rolNombre: string): string {
    const rol = this.roles.find(r => r.nombre.toLowerCase() === rolNombre.toLowerCase() || r.codigo.toLowerCase() === rolNombre.toLowerCase());
    if (rol) return rol.badgeClass;
    if (rolNombre.includes('Admin') || rolNombre.includes('Super')) return 'bg-purple-100 text-purple-900 border-purple-300';
    if (rolNombre.includes('Gerente')) return 'bg-easydry-blue/15 text-easydry-blue border-easydry-blue/20';
    if (rolNombre.includes('Supervisor')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (rolNombre.includes('Operador')) return 'bg-easydry-green/20 text-easydry-green-dark border-easydry-green/30';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  getUsuariosCountForRol(rolNombre: string): number {
    return this.usuarios.filter(u => 
      u.rol.toLowerCase() === rolNombre.toLowerCase() || 
      rolNombre.toLowerCase().includes(u.rol.toLowerCase())
    ).length;
  }

  getModuloIcon(codigo: string): string {
    const m = this.modulosDisponibles.find(mod => mod.codigo === codigo);
    return m?.icono || 'circle';
  }

  getModuloNombre(codigo: string): string {
    const m = this.modulosDisponibles.find(mod => mod.codigo === codigo);
    return m?.nombre || codigo;
  }

  // ── Acciones de Usuario ──
  abrirModalCrearUsuario() {
    this.editandoUsuario = null;
    this.usuarioForm = {
      nombre: '',
      apellido: '',
      rol: this.roles[0]?.nombre || 'Super Administrador',
      agencia: this.sucursales[0]?.nombre || 'EasyDry Quito Norte',
      estado: 'Activo',
      email: '',
      modalidadPulidor: 'MOVIL'
    };
    this.modalUsuarioOpen = true;
  }

  editarUsuario(u: Usuario) {
    this.editandoUsuario = u;
    this.usuarioForm = {
      nombre: u.nombre,
      apellido: u.apellido,
      rol: u.rol,
      agencia: u.agencia,
      estado: u.estado,
      email: u.email,
      modalidadPulidor: u.modalidadPulidor || (esRolOperadorEspeciales(u.rol) ? 'MOVIL' : 'MOVIL')
    };
    this.modalUsuarioOpen = true;
  }

  onRolUsuarioChange() {
    if (esRolOperadorEspeciales(this.usuarioForm.rol)) {
      if (!this.usuarioForm.modalidadPulidor) {
        this.usuarioForm.modalidadPulidor = 'MOVIL';
      }
      this.setModalidadPulidor(this.usuarioForm.modalidadPulidor);
    }
  }

  setModalidadPulidor(modalidad: ModalidadPulidor) {
    this.usuarioForm.modalidadPulidor = modalidad;
    if (modalidad === 'MOVIL') {
      this.usuarioForm.agencia = 'Red Nacional · Móvil';
    } else if (!this.sucursales.some(s => s.nombre === this.usuarioForm.agencia)) {
      this.usuarioForm.agencia = this.sucursales[0]?.nombre || 'EasyDry Quito Norte';
    }
  }

  private payloadModalidad(): { agencia: string; modalidadPulidor?: ModalidadPulidor } {
    if (!esRolOperadorEspeciales(this.usuarioForm.rol)) {
      return { agencia: this.usuarioForm.agencia, modalidadPulidor: undefined };
    }
    if (this.usuarioForm.modalidadPulidor === 'FIJO') {
      return { agencia: this.usuarioForm.agencia, modalidadPulidor: 'FIJO' };
    }
    return { agencia: 'Red Nacional · Móvil', modalidadPulidor: 'MOVIL' };
  }

  guardarUsuario() {
    if (!this.usuarioForm.nombre || !this.usuarioForm.email) {
      this.toastService.warning('Datos Incompletos', 'Ingrese el nombre y correo del colaborador.');
      return;
    }

    if (esRolOperadorEspeciales(this.usuarioForm.rol) && this.usuarioForm.modalidadPulidor === 'FIJO' && !this.usuarioForm.agencia) {
      this.toastService.warning('Sucursal requerida', 'Un pulidor fijo debe quedar asignado a una sucursal.');
      return;
    }

    const modalidad = this.payloadModalidad();

    if (this.editandoUsuario) {
      const actualizado: Usuario = {
        ...this.editandoUsuario,
        nombre: this.usuarioForm.nombre,
        apellido: this.usuarioForm.apellido,
        rol: this.usuarioForm.rol,
        agencia: modalidad.agencia,
        estado: this.usuarioForm.estado as Usuario['estado'],
        email: this.usuarioForm.email,
        modalidadPulidor: modalidad.modalidadPulidor
      };

      this.usuarioService.actualizarUsuario(actualizado).subscribe(() => {
        this.toastService.success('Usuario Actualizado', `Perfil de ${actualizado.nombre} actualizado correctamente.`);
        this.modalUsuarioOpen = false;
      });
    } else {
      const nuevo: Omit<Usuario, 'id'> = {
        nombre: this.usuarioForm.nombre,
        apellido: this.usuarioForm.apellido,
        rol: this.usuarioForm.rol,
        agencia: modalidad.agencia,
        estado: this.usuarioForm.estado as Usuario['estado'],
        email: this.usuarioForm.email,
        fechaAsignacion: new Date().toISOString().split('T')[0],
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        modalidadPulidor: modalidad.modalidadPulidor
      };

      this.usuarioService.crearUsuario(nuevo).subscribe(creado => {
        this.toastService.success(
          'Invitación Enviada',
          `Usuario ${creado.nombre} registrado. Se envió el correo de activación (Amazon Cognito) a ${creado.email}.`
        );
        this.modalUsuarioOpen = false;
      });
    }
  }

  // ── Acciones de Roles ──
  abrirModalCrearRol() {
    this.editandoRol = null;
    this.rolForm = {
      nombre: '',
      descripcion: '',
      color: '#004282',
      modulos: ['dashboard', 'servicios'],
      esSistema: false,
      accionesPorModulo: {
        dashboard: { ver: true, crear: false, editar: false, configurar: false },
        servicios: { ver: true, crear: true, editar: true, configurar: false }
      }
    };
    this.modalRolOpen = true;
  }

  abrirModalEditarRol(rol: RolPersonalizado) {
    this.editandoRol = rol;
    const acciones: Record<string, PermisoModuloAcciones> = {};
    for (const m of rol.modulos) {
      acciones[m] = {
        ver: true,
        crear: true,
        editar: true,
        configurar: rol.codigo === 'SUPER_ADMIN' || rol.codigo === 'ADMIN'
      };
    }
    this.rolForm = {
      id: rol.id,
      codigo: rol.codigo,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      color: rol.color,
      modulos: [...rol.modulos],
      esSistema: rol.esSistema,
      accionesPorModulo: acciones
    };
    this.modalRolOpen = true;
  }

  isModuloSelected(codigo: string): boolean {
    return this.rolForm.modulos.includes(codigo);
  }

  getPermisoAccion(modCodigo: string, accion: 'ver' | 'crear' | 'editar' | 'configurar'): boolean {
    if (!this.rolForm.accionesPorModulo[modCodigo]) {
      this.rolForm.accionesPorModulo[modCodigo] = { ver: true, crear: true, editar: true, configurar: false };
    }
    return !!this.rolForm.accionesPorModulo[modCodigo][accion];
  }

  togglePermisoAccion(modCodigo: string, accion: 'ver' | 'crear' | 'editar' | 'configurar'): void {
    if (isRolPermisosInmutable(this.rolForm.codigo) || this.rolForm.esSistema) return;
    if (!this.rolForm.accionesPorModulo[modCodigo]) {
      this.rolForm.accionesPorModulo[modCodigo] = { ver: true, crear: true, editar: true, configurar: false };
    }
    this.rolForm.accionesPorModulo[modCodigo][accion] = !this.rolForm.accionesPorModulo[modCodigo][accion];
  }

  toggleModulo(codigo: string) {
    if (isRolPermisosInmutable(this.rolForm.codigo)) return;
    if (this.rolForm.esSistema) return;
    const idx = this.rolForm.modulos.indexOf(codigo);
    if (idx !== -1) {
      this.rolForm.modulos.splice(idx, 1);
    } else {
      this.rolForm.modulos.push(codigo);
      if (!this.rolForm.accionesPorModulo[codigo]) {
        this.rolForm.accionesPorModulo[codigo] = { ver: true, crear: true, editar: true, configurar: false };
      }
    }
  }

  seleccionarTodosModulos() {
    this.rolForm.modulos = this.modulosDisponibles.map(m => m.codigo);
  }

  desmarcarTodosModulos() {
    if (isRolPermisosInmutable(this.rolForm.codigo)) return;
    if (this.rolForm.esSistema) return;
    this.rolForm.modulos = [];
  }

  getSelectedInGroupCount(grupo: ModuloGrupo): number {
    return grupo.modulos.filter(m => this.isModuloSelected(m.codigo)).length;
  }

  guardarRol() {
    if (isRolPermisosInmutable(this.rolForm.codigo)) {
      this.toastService.warning('Rol inmutable', 'Los permisos del Super Administrador no pueden modificarse.');
      return;
    }

    if (!this.rolForm.nombre.trim()) {
      this.toastService.warning('Nombre Requerido', 'Ingrese un nombre descriptivo para el rol.');
      return;
    }

    if (this.rolForm.modulos.length === 0) {
      this.toastService.warning('Permisos Requeridos', 'Debe seleccionar al menos 1 módulo accesible para este rol.');
      return;
    }

    if (this.editandoRol) {
      this.rolService.actualizarRol(this.editandoRol.id, {
        nombre: this.rolForm.nombre,
        descripcion: this.rolForm.descripcion,
        color: this.rolForm.color,
        modulos: this.rolForm.modulos
      }).subscribe(res => {
        if (res) {
          this.toastService.success('Rol Actualizado', `Permisos para "${res.nombre}" actualizados correctamente.`);
        }
        this.modalRolOpen = false;
      });
    } else {
      this.rolService.crearRol({
        nombre: this.rolForm.nombre,
        descripcion: this.rolForm.descripcion,
        color: this.rolForm.color,
        modulos: this.rolForm.modulos
      }).subscribe(creado => {
        this.toastService.success('Rol Creado', `Nuevo rol "${creado.nombre}" disponible en la plataforma.`);
        this.modalRolOpen = false;
      });
    }
  }

  eliminarRol(rol: RolPersonalizado) {
    if (confirm(`¿Estás seguro de eliminar el rol "${rol.nombre}"?`)) {
      this.rolService.eliminarRol(rol.id).subscribe(res => {
        if (res.success) {
          this.toastService.success('Rol Eliminado', `El rol "${rol.nombre}" ha sido eliminado.`);
        } else {
          this.toastService.error('Acción no permitida', res.message || 'No se pudo eliminar el rol.');
        }
      });
    }
  }
}

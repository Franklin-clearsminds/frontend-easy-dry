import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UsuarioMockService } from '../../core/services/usuario-mock.service';
import { RolMockService } from '../../core/services/rol-mock.service';
import { AuthService, DEMO_CREDENTIALS } from '../../core/services/auth.service';
import { Usuario, ModuloSistema, RolPersonalizado, MODULOS_SISTEMA, Sucursal, ModalidadPulidor, BodegaInventario } from '../../core/models';
import { isRolPermisosInmutable, PermisoModuloAcciones } from '../../core/models/roles.model';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { InventarioMockService } from '../../core/services/inventario-mock.service';
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
      </div>

      <!-- Navigation Tabs (Usuarios vs Roles) -->
      <div class="bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center gap-2 shadow-xs max-w-md">
        <button
          (click)="activeTab = 'usuarios'"
          class="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2"
          [ngClass]="activeTab === 'usuarios' ? 'bg-easydry-blue text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'">
          <i-lucide name="users" class="w-4 h-4"></i-lucide>
          <span>Directorio de Usuarios ({{ usuariosVisibles.length }})</span>
        </button>

        <button
          (click)="activeTab = 'roles'"
          class="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2"
          [ngClass]="activeTab === 'roles' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'">
          <i-lucide name="shield" class="w-4 h-4"></i-lucide>
          <span>Roles y Permisos ({{ rolesVisibles.length }})</span>
        </button>
      </div>

      <!-- ======================================================== -->
      <!-- TAB 1: DIRECTORIO DE USUARIOS                           -->
      <!-- ======================================================== -->
      @if (activeTab === 'usuarios') {
        <div class="space-y-6">
          <!-- Global Filter Bar -->
          <app-filter-bar 
            [showRegion]="true"
            [showSucursal]="true" 
            [showOperador]="false"
            [showBahia]="false"
            [showMarca]="true"
            [showEstado]="true"
            [showFechas]="false"
            [showBusqueda]="true"
            placeholderBusqueda="Buscar por nombre, apellido, correo o rol..."
            [listaEstados]="['Todos', 'Activo', 'Inactivo']"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>

          <!-- Users Grid / Table -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-slate-900 text-base font-outfit">Directorio de Colaboradores EasyDry</h3>
                <p class="text-xs text-slate-500">Personal asignado a sedes con roles dinámicos del sistema</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  {{ usuariosFiltrados.length }} Usuarios Encontrados
                </span>
                <button
                  (click)="abrirModalCrearUsuario()"
                  class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                  <i-lucide name="user-plus" class="w-4 h-4"></i-lucide>
                  <span>Registrar Usuario</span>
                </button>
              </div>
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
                    <tr class="hover:bg-slate-50/80 transition-colors" [ngClass]="{'opacity-60 bg-slate-50/40': u.estado === 'Inactivo'}">
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-3">
                          <img [src]="u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'" alt="Avatar" class="w-9 h-9 rounded-full object-cover border-2" [ngClass]="u.estado === 'Activo' ? 'border-easydry-blue/20' : 'border-slate-300 grayscale'">
                          <div>
                            <div class="flex items-center gap-1.5">
                              <p class="font-bold text-slate-900 text-xs">{{ u.nombre }} {{ u.apellido }}</p>
                              @if (u.estado === 'Inactivo') {
                                <span class="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded border border-rose-200">Inactivo</span>
                              }
                            </div>
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
                          @if (esGestorBodegaRol(u.rol)) {
                            <span class="inline-flex items-center gap-1.5 text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 w-fit">
                              <i-lucide name="globe" class="w-3.5 h-3.5"></i-lucide>
                              <span>Global · Inventario Nacional</span>
                            </span>
                          } @else if (esAsistenteBodegaRol(u.rol)) {
                            <span class="inline-flex items-center gap-1.5 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 w-fit">
                              <i-lucide name="archive" class="w-3.5 h-3.5"></i-lucide>
                              <span>{{ u.agencia || 'Bodega Central Nacional' }}</span>
                            </span>
                          } @else {
                            <span>{{ u.agencia }}</span>
                          }
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
                        <button
                          type="button"
                          (click)="toggleEstadoUsuario(u)"
                          [title]="u.estado === 'Activo' ? 'Click para marcar como Inactivo (Bloqueará login y asignación)' : 'Click para activar usuario'"
                          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer select-none"
                          [ngClass]="u.estado === 'Activo' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300' 
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'">
                          <span class="w-2 h-2 rounded-full" [ngClass]="u.estado === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                          <span>{{ u.estado }}</span>
                        </button>
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            (click)="toggleEstadoUsuario(u)"
                            [title]="u.estado === 'Activo' ? 'Desactivar usuario' : 'Activar usuario'"
                            class="p-1.5 rounded-lg transition-colors cursor-pointer"
                            [ngClass]="u.estado === 'Activo' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'">
                            <i-lucide [name]="u.estado === 'Activo' ? 'user-x' : 'user-check'" class="w-4 h-4"></i-lucide>
                          </button>
                          <button 
                            type="button"
                            (click)="editarUsuario(u)" 
                            title="Editar Usuario"
                            class="p-1.5 text-slate-400 hover:text-easydry-blue rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                            <i-lucide name="edit-3" class="w-4 h-4"></i-lucide>
                          </button>
                          <button
                            type="button"
                            (click)="abrirModalEliminarUsuario(u)"
                            title="Eliminar Usuario"
                            class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer">
                            <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
                          </button>
                        </div>
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
                <i-lucide name="check-circle" class="w-6 h-6"></i-lucide>
              </div>
              <div>
                <p class="text-2xl font-extrabold text-slate-900">{{ rolesActivosCount }}</p>
                <p class="text-xs text-slate-500 font-medium">Roles Activos en Base de Datos</p>
              </div>
            </div>
          </div>

          <!-- Tabla de roles activos en la plataforma -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-slate-900 text-base font-outfit">Roles Registrados en la Base de Datos</h3>
                <p class="text-xs text-slate-500">Estructura RBAC sincronizada directamente con la tabla roles de PostgreSQL</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                  {{ roles.length }} roles en BD
                </span>
                <button 
                  (click)="abrirModalCrearRol()"
                  class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
                  <i-lucide name="shield-plus" class="w-4 h-4"></i-lucide>
                  <span>Crear Nuevo Rol</span>
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="py-3.5 px-5">Rol / Perfil</th>
                    <th class="py-3.5 px-4">Descripción</th>
                    <th class="py-3.5 px-4">Permisos Asignados</th>
                    <th class="py-3.5 px-4">Estado</th>
                    <th class="py-3.5 px-4">Fecha Creación</th>
                    <th class="py-3.5 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (rol of rolesVisibles; track rol.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors" [ngClass]="{'opacity-60 bg-slate-50/40': rol.estado === 'Inactivo'}">
                      <td class="py-4 px-5">
                        <div class="flex items-center gap-3">
                          <div
                            class="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                            [style.background-color]="rol.color || '#7C3AED'">
                            <i-lucide name="shield" class="w-4 h-4"></i-lucide>
                          </div>
                          <span class="font-extrabold text-slate-900 text-xs">{{ rol.nombre }}</span>
                        </div>
                      </td>
                      <td class="py-4 px-4 text-xs text-slate-600 max-w-xs">
                        <p class="line-clamp-2" [title]="rol.descripcion">
                          {{ rol.descripcion || 'Sin descripción registrada' }}
                        </p>
                      </td>
                      <td class="py-4 px-4">
                        <div class="flex items-center gap-2">
                          <div class="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div class="bg-purple-600 h-full rounded-full" [style.width.%]="getModulosProgress(rol)"></div>
                          </div>
                          <span class="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                            {{ getModulosCount(rol) }} permisos
                          </span>
                        </div>
                      </td>
                      <td class="py-4 px-4">
                        <button
                          type="button"
                          (click)="toggleEstadoRol(rol)"
                          [disabled]="isRolPermisosInmutable(rol.codigo)"
                          [title]="isRolPermisosInmutable(rol.codigo) ? 'Rol del sistema inmutable' : (rol.estado === 'Activo' ? 'Click para desactivar rol' : 'Click para activar rol')"
                          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all select-none"
                          [ngClass]="rol.estado === 'Activo' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer' 
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 cursor-pointer'">
                          <span class="w-2 h-2 rounded-full" [ngClass]="rol.estado === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                          <span>{{ rol.estado || 'Activo' }}</span>
                        </button>
                      </td>
                      <td class="py-4 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {{ rol.fechaCreacion }}
                      </td>
                      <td class="py-4 px-5 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button
                            (click)="abrirModalEditarRol(rol)"
                            title="Editar Rol"
                            class="p-2 text-slate-500 hover:text-easydry-blue hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                            <i-lucide name="edit-3" class="w-4 h-4"></i-lucide>
                          </button>
                          <button
                            (click)="abrirModalEditarRol(rol)"
                            title="Modificar Permisos"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer border border-purple-200">
                            <i-lucide name="sliders" class="w-3.5 h-3.5"></i-lucide>
                            <span>Permisos</span>
                          </button>
                          @if (rol.codigo !== 'SUPER_ADMIN') {
                            <button
                              (click)="abrirModalEliminarRol(rol)"
                              title="Eliminar Rol"
                              class="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200">
                              <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="py-10 px-4 text-center text-sm text-slate-500">
                        No hay roles configurados en la base de datos. Use «Crear Nuevo Rol» para agregar uno.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Roles Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (rol of rolesVisibles; track rol.id) {
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
                      <h3 class="font-extrabold text-slate-900 text-base font-outfit">{{ rol.nombre }}</h3>
                    </div>

                    <span 
                      class="text-xs font-bold px-2.5 py-1 rounded-lg border"
                      [ngClass]="rol.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'">
                      {{ rol.estado || 'Activo' }}
                    </span>
                  </div>

                  <!-- Description -->
                  <p class="text-xs text-slate-600 mt-3 leading-relaxed">
                    {{ rol.descripcion || 'Sin descripción registrada en base de datos.' }}
                  </p>

                  <!-- Modulos count bar -->
                  <div class="mt-4 pt-3 border-t border-slate-100">
                    <div class="flex items-center justify-between text-xs mb-1.5">
                      <span class="font-bold text-slate-700">Permisos Asignados:</span>
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
                      title="Editar Rol"
                      class="p-2 text-slate-500 hover:text-easydry-blue hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200">
                      <i-lucide name="edit-3" class="w-4 h-4"></i-lucide>
                    </button>

                    <button
                      (click)="abrirModalEditarRol(rol)"
                      title="Modificar Permisos"
                      class="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors flex items-center gap-1.5 border border-purple-200 cursor-pointer">
                      <i-lucide name="sliders" class="w-3.5 h-3.5"></i-lucide>
                      <span>Permisos</span>
                    </button>

                    @if (rol.codigo !== 'SUPER_ADMIN') {
                      <button
                        (click)="abrirModalEliminarRol(rol)"
                        title="Eliminar Rol"
                        class="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer border border-slate-200 hover:border-rose-200">
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
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nombre <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                [(ngModel)]="usuarioForm.nombre"
                name="nombre"
                placeholder="ej. Stalyn"
                class="w-full p-2.5 border rounded-xl text-sm transition-all outline-none"
                [ngClass]="nombreInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : 'border-slate-200 focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20'"
                required>
              @if (nombreInvalido) {
                <p class="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                  <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                  El nombre del colaborador es obligatorio.
                </p>
              }
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Apellido</label>
              <input
                type="text"
                [(ngModel)]="usuarioForm.apellido"
                name="apellido"
                placeholder="ej. Moposita"
                class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20 outline-none">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Rol Asignado (Dinámico)</label>
              <select [(ngModel)]="usuarioForm.rol" name="rol" (ngModelChange)="onRolUsuarioChange()" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                @for (r of rolesVisibles; track r.id) {
                  <option [value]="r.nombre">{{ r.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
              <select [(ngModel)]="usuarioForm.estado" name="estado" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          @if (esOperadorEspecialesRol(usuarioForm.rol)) {
            <div class="p-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 space-y-3">
              <div>
                <p class="text-xs font-extrabold text-cyan-900 uppercase tracking-wide">Modalidad del pulidor</p>
                <p class="text-[11px] text-cyan-800 mt-0.5">Fijo: trabaja solo en una agencia. Móvil: se desplaza entre sedes.</p>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  (click)="setModalidadPulidor('FIJO')"
                  class="px-3 py-2.5 rounded-xl text-xs font-extrabold border transition-colors"
                  [ngClass]="usuarioForm.modalidadPulidor === 'FIJO'
                    ? 'bg-easydry-blue text-white border-easydry-blue'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-easydry-blue'">
                  Fijo en agencia
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
                  <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia asignada</label>
                  <select [(ngModel)]="usuarioForm.agencia" name="agenciaFijo" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white" required>
                    @for (s of sucursales; track s.id) {
                      <option [value]="s.nombre">{{ s.nombre }} ({{ s.ciudad }})</option>
                    }
                  </select>
                </div>
              } @else {
                <p class="text-xs font-semibold text-cyan-900">Ubicación: Red Nacional · Móvil entre agencias</p>
              }
            </div>
          } @else if (esGestorBodegaRol(usuarioForm.rol)) {
            <div class="p-4 rounded-2xl border border-purple-200 bg-purple-50/70 space-y-2">
              <div class="flex items-center gap-2 text-purple-900">
                <i-lucide name="globe" class="w-4 h-4 text-purple-600 shrink-0"></i-lucide>
                <span class="text-xs font-extrabold uppercase tracking-wide">Alcance Global · Gestión de Inventario Nacional</span>
              </div>
              <p class="text-xs text-purple-800 leading-relaxed">
                El <b>Gestor de Bodega</b> administra el inventario de <b>todas las bodegas y agencias del país</b>. No requiere asignación de sucursal específica ya que coordina y despacha insumos a nivel nacional sin restricciones.
              </p>
            </div>
          } @else if (esAsistenteBodegaRol(usuarioForm.rol)) {
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">
                  Asignar Bodega <span class="text-amber-500">*</span>
                </label>
                <span class="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Control Regional
                </span>
              </div>
              <select [(ngModel)]="usuarioForm.agencia" name="bodegaAsistente" class="w-full p-2.5 border rounded-xl text-sm font-semibold border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200" required>
                @for (b of bodegasDisponibles; track b.id) {
                  <option [value]="b.nombre">{{ b.nombre }} ({{ b.ciudad || 'Quito' }} - Región: {{ b.region || 'Nacional' }})</option>
                }
              </select>
              <p class="text-[11px] text-slate-400 mt-1">
                El Asistente gestionará el inventario y despachos de las agencias pertenecientes a su bodega y región asignada.
              </p>
            </div>
          } @else {
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">
                  Agencia {{ esLiderOperadorRol(usuarioForm.rol) ? '(Recomendada)' : '(Opcional)' }}
                </label>
                <span class="text-[10px] text-slate-400 font-medium">
                  {{ esLiderOperadorRol(usuarioForm.rol) ? 'Sede operativa' : 'No obligatorio' }}
                </span>
              </div>
              <select [(ngModel)]="usuarioForm.agencia" name="agencia" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                <option value="">Sin sucursal asignada (Opcional - Asignar luego)</option>
                @for (s of sucursales; track s.id) {
                  <option [value]="s.nombre">{{ s.nombre }}</option>
                }
              </select>
              <p class="text-[11px] text-slate-400 mt-1">
                {{ esLiderOperadorRol(usuarioForm.rol) 
                  ? 'Asigna la agencia donde este Líder gestionará las OTs y servicios.' 
                  : 'No es obligatorio asignar sucursal ni región al crear el usuario.' }}
              </p>
            </div>
          }

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Correo Electrónico <span class="text-rose-500">*</span>
            </label>
            <input
              type="email"
              [(ngModel)]="usuarioForm.email"
              name="email"
              placeholder="ej. stalyn.moposita@easydry.com"
              class="w-full p-2.5 border rounded-xl text-sm transition-all outline-none"
              [ngClass]="emailInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : 'border-slate-200 focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20'"
              required>
            @if (emailInvalido) {
              <p class="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                {{ !usuarioForm.email.trim() ? 'El correo electrónico es obligatorio.' : 'Ingrese un correo electrónico válido (ej. usuario@easydry.com).' }}
              </p>
            }
          </div>

          <!-- Credenciales Directas de Acceso (Sin Cognito) -->
          @if (!editandoUsuario) {
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-easydry-blue/10 text-easydry-blue flex items-center justify-center">
                  <i-lucide name="lock" class="w-4 h-4"></i-lucide>
                </div>
                <div>
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Credenciales de Acceso</h4>
                  <p class="text-[11px] text-slate-500">Ingresa la contraseña para que el usuario inicie sesión directamente.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <!-- Contraseña -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contraseña <span class="text-rose-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      [type]="showPassword ? 'text' : 'password'"
                      [(ngModel)]="usuarioForm.password"
                      name="password"
                      placeholder="Mínimo 6 caracteres"
                      class="w-full p-2.5 pr-10 border rounded-xl text-sm font-medium transition-all outline-none"
                      [ngClass]="passwordInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : (usuarioForm.password && usuarioForm.password.length < 6 ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 bg-white focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20')"
                      required
                      minlength="6">
                    <button
                      type="button"
                      (click)="showPassword = !showPassword"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabindex="-1">
                      <i-lucide [name]="showPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                    </button>
                  </div>
                  @if (passwordInvalido) {
                    <p class="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                      <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                      La contraseña debe tener al menos 6 caracteres.
                    </p>
                  }
                </div>

                <!-- Verificación de Contraseña -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Verificación de Contraseña <span class="text-rose-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      [type]="showConfirmPassword ? 'text' : 'password'"
                      [(ngModel)]="usuarioForm.confirmPassword"
                      name="confirmPassword"
                      placeholder="Repetir contraseña"
                      class="w-full p-2.5 pr-10 border rounded-xl text-sm font-medium transition-all outline-none"
                      [ngClass]="confirmPasswordInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : (passwordsMatch ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-white focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20')"
                      required>
                    <button
                      type="button"
                      (click)="showConfirmPassword = !showConfirmPassword"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabindex="-1">
                      <i-lucide [name]="showConfirmPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                    </button>
                  </div>
                  @if (confirmPasswordInvalido) {
                    <p class="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                      <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                      La verificación no coincide con la contraseña.
                    </p>
                  }
                </div>
              </div>

              <!-- Indicador de validación de contraseñas -->
              <div class="pt-0.5 text-[11px]">
                @if (passwordsMismatch) {
                  <span class="text-rose-600 font-semibold flex items-center gap-1.5">
                    <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    Las contraseñas no coinciden. Verifique el texto ingresado.
                  </span>
                } @else if (passwordsMatch) {
                  <span class="text-emerald-600 font-semibold flex items-center gap-1.5">
                    <i-lucide name="check-circle-2" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    Contraseña verificada correctamente.
                  </span>
                } @else if (usuarioForm.password && usuarioForm.password.length < 6) {
                  <span class="text-amber-600 font-medium flex items-center gap-1.5">
                    <i-lucide name="alert-triangle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    La contraseña debe tener al menos 6 caracteres.
                  </span>
                } @else {
                  <span class="text-slate-400 flex items-center gap-1.5">
                    <i-lucide name="info" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    Mínimo 6 caracteres. Se almacenará de forma cifrada en el sistema.
                  </span>
                }
              </div>
            </div>
          } @else {
            <!-- Edición de usuario existente: opción de cambiar contraseña -->
            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  [(ngModel)]="usuarioForm.cambiarPassword"
                  name="cambiarPassword"
                  class="w-4 h-4 rounded border-slate-300 text-easydry-blue focus:ring-easydry-blue/30 cursor-pointer">
                <span class="text-xs font-bold text-slate-700">Cambiar / Restablecer Contraseña del Usuario</span>
              </label>

              @if (usuarioForm.cambiarPassword) {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nueva Contraseña <span class="text-rose-500">*</span>
                    </label>
                    <div class="relative">
                      <input
                        [type]="showPassword ? 'text' : 'password'"
                        [(ngModel)]="usuarioForm.password"
                        name="password"
                        placeholder="Mínimo 6 caracteres"
                        class="w-full p-2.5 pr-10 border rounded-xl text-sm font-medium transition-all outline-none"
                        [ngClass]="passwordInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : 'border-slate-200 bg-white focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20'"
                        minlength="6">
                      <button
                        type="button"
                        (click)="showPassword = !showPassword"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        tabindex="-1">
                        <i-lucide [name]="showPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                      </button>
                    </div>
                    @if (passwordInvalido) {
                      <p class="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                        <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                        La nueva contraseña debe tener al menos 6 caracteres.
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Verificación <span class="text-rose-500">*</span>
                    </label>
                    <div class="relative">
                      <input
                        [type]="showConfirmPassword ? 'text' : 'password'"
                        [(ngModel)]="usuarioForm.confirmPassword"
                        name="confirmPassword"
                        placeholder="Repetir nueva contraseña"
                        class="w-full p-2.5 pr-10 border rounded-xl text-sm font-medium transition-all outline-none"
                        [ngClass]="confirmPasswordInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : (passwordsMatch ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-white focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20')">
                      <button
                        type="button"
                        (click)="showConfirmPassword = !showConfirmPassword"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        tabindex="-1">
                        <i-lucide [name]="showConfirmPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                      </button>
                    </div>
                    @if (confirmPasswordInvalido) {
                      <p class="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                        <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                        La confirmación no coincide con la nueva contraseña.
                      </p>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </form>

        <div modal-footer>
          <button (click)="modalUsuarioOpen = false" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancelar</button>
          <button (click)="guardarUsuario()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide [name]="editandoUsuario ? 'save' : 'user-plus'" class="w-4 h-4"></i-lucide>
            {{ editandoUsuario ? 'Actualizar Usuario' : 'Registrar Usuario' }}
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

      <!-- ======================================================== -->
      <!-- MODAL: CONFIRMAR ELIMINACIÓN DE USUARIO                  -->
      <!-- ======================================================== -->
      <app-modal
        [isOpen]="modalEliminarUsuarioOpen"
        title="Confirmar Eliminación de Usuario"
        icon="alert-triangle"
        (close)="modalEliminarUsuarioOpen = false">
        
        <div class="space-y-4 py-2">
          <div class="flex items-center gap-3.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <i-lucide name="trash-2" class="w-5 h-5"></i-lucide>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">¿Estás seguro de eliminar este usuario?</h4>
              <p class="text-xs text-rose-700 font-medium">Esta acción eliminará el acceso y los registros del colaborador en la plataforma.</p>
            </div>
          </div>

          @if (usuarioAEliminar) {
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-bold uppercase">Colaborador:</span>
                <span class="font-bold text-slate-900">{{ usuarioAEliminar.nombre }} {{ usuarioAEliminar.apellido }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-bold uppercase">Correo Electrónico:</span>
                <span class="font-mono text-slate-700">{{ usuarioAEliminar.email }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-bold uppercase">Rol Asignado:</span>
                <span class="font-bold text-easydry-blue">{{ usuarioAEliminar.rol }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-bold uppercase">Agencia / Local:</span>
                <span class="text-slate-700 font-medium">{{ usuarioAEliminar.agencia || 'Sin asignar' }}</span>
              </div>
            </div>
          }
        </div>

        <div modal-footer class="flex items-center justify-end gap-2.5">
          <button
            type="button"
            (click)="modalEliminarUsuarioOpen = false"
            class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            (click)="confirmarEliminarUsuario()"
            class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-glow-red flex items-center gap-2 cursor-pointer">
            <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
            <span>Eliminar Usuario</span>
          </button>
        </div>
      </app-modal>

      <!-- ======================================================== -->
      <!-- MODAL: CONFIRMAR ELIMINACIÓN DE ROL                      -->
      <!-- ======================================================== -->
      <app-modal
        [isOpen]="modalEliminarRolOpen"
        title="Confirmar Eliminación de Rol"
        icon="alert-triangle"
        (close)="modalEliminarRolOpen = false">
        
        <div class="space-y-4 py-2">
          <div class="flex items-center gap-3.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <i-lucide name="shield-alert" class="w-5 h-5"></i-lucide>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">¿Estás seguro de eliminar este rol?</h4>
              <p class="text-xs text-rose-700 font-medium">Esta acción eliminará el perfil del sistema de roles RBAC.</p>
            </div>
          </div>

          @if (rolAEliminar) {
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-bold uppercase">Nombre del Rol:</span>
                <span class="font-bold text-slate-900">{{ rolAEliminar.nombre }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-bold uppercase">Código del Rol:</span>
                <span class="font-mono text-slate-700">{{ rolAEliminar.codigo }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-bold uppercase">Permisos Asociados:</span>
                <span class="font-bold text-purple-700">{{ rolAEliminar.modulos.length }} módulos</span>
              </div>
            </div>
          }
        </div>

        <div modal-footer class="flex items-center justify-end gap-2.5">
          <button
            type="button"
            (click)="modalEliminarRolOpen = false"
            class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            (click)="confirmarEliminarRol()"
            class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-glow-red flex items-center gap-2 cursor-pointer">
            <i-lucide name="trash-2" class="w-4 h-4"></i-lucide>
            <span>Eliminar Rol</span>
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

  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };
  filtroTexto = '';

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
    estado: 'Activo' | 'Inactivo';
    email: string;
    password?: string;
    confirmPassword?: string;
    cambiarPassword?: boolean;
    modalidadPulidor: ModalidadPulidor;
  } = {
    nombre: '',
    apellido: '',
    rol: 'Gerente de Agencia',
    agencia: 'EasyDry Quito Norte',
    estado: 'Activo',
    email: '',
    password: '',
    confirmPassword: '',
    cambiarPassword: false,
    modalidadPulidor: 'MOVIL'
  };

  showPassword = false;
  showConfirmPassword = false;

  usuarioFormSubmitted = false;

  get nombreInvalido(): boolean {
    return this.usuarioFormSubmitted && !this.usuarioForm.nombre?.trim();
  }

  get emailInvalido(): boolean {
    if (!this.usuarioFormSubmitted) return false;
    const email = this.usuarioForm.email?.trim();
    if (!email) return true;
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  get passwordInvalido(): boolean {
    if (!this.usuarioFormSubmitted) return false;
    if (this.editandoUsuario && !this.usuarioForm.cambiarPassword) return false;
    const pass = this.usuarioForm.password?.trim();
    return !pass || pass.length < 6;
  }

  get confirmPasswordInvalido(): boolean {
    if (!this.usuarioFormSubmitted) return false;
    if (this.editandoUsuario && !this.usuarioForm.cambiarPassword) return false;
    const pass = this.usuarioForm.password?.trim();
    const confirm = this.usuarioForm.confirmPassword?.trim();
    return !confirm || pass !== confirm;
  }

  get passwordsMatch(): boolean {
    const p = this.usuarioForm.password?.trim();
    const c = this.usuarioForm.confirmPassword?.trim();
    return !!p && p.length >= 6 && p === c;
  }

  get passwordsMismatch(): boolean {
    const p = this.usuarioForm.password?.trim();
    const c = this.usuarioForm.confirmPassword?.trim();
    return !!p && !!c && p !== c;
  }

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

  modalEliminarUsuarioOpen = false;
  usuarioAEliminar: Usuario | null = null;

  modalEliminarRolOpen = false;
  rolAEliminar: RolPersonalizado | null = null;

  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioMockService);
  private rolService = inject(RolMockService);
  private sucursalService = inject(SucursalMockService);
  private inventarioService = inject(InventarioMockService);
  private toastService = inject(ToastService);

  bodegasDisponibles: BodegaInventario[] = [];

  isRolPermisosInmutable = isRolPermisosInmutable;
  esOperadorEspecialesRol = esRolOperadorEspeciales;

  esGestorBodegaRol(rol?: string): boolean {
    if (!rol) return false;
    const n = rol.toUpperCase().trim();
    return (
      n === 'COORD_BODEGA' ||
      n === 'DISTRIBUIDOR' ||
      n === 'GESTOR_BODEGA' ||
      n.includes('GESTOR DE BODEGA') ||
      n.includes('COORDINADOR DE BODEGA') ||
      n.includes('COORD. BODEGA') ||
      n.includes('GESTOR DE INVENTARIO') ||
      (n.includes('BODEGA') && !n.includes('ASISTENTE'))
    );
  }

  esAsistenteBodegaRol(rol?: string): boolean {
    if (!rol) return false;
    const n = rol.toUpperCase().trim();
    return (
      n === 'ASISTENTE_BODEGA' ||
      n.includes('ASISTENTE DE BODEGA') ||
      n.includes('ASISTENTE BODEGA') ||
      (n.includes('ASISTENTE') && n.includes('BODEGA'))
    );
  }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get usuariosVisibles(): Usuario[] {
    if (this.isSuperAdmin) {
      return this.usuarios;
    }
    return this.usuarios.filter(u => {
      const r = (u.rol || '').toUpperCase();
      return r !== 'SUPER_ADMIN' && !r.includes('SUPER ADMIN') && !r.includes('SUPERADMIN') && !r.includes('SUPER ADMINISTRADOR');
    });
  }

  get rolesVisibles(): RolPersonalizado[] {
    if (this.isSuperAdmin) {
      return this.roles;
    }
    return this.roles.filter(r => r.codigo !== 'SUPER_ADMIN' && r.nombre !== 'Super Administrador');
  }

  ngOnInit(): void {
    this.agruparModulos();

    this.inventarioService.bodegas$.subscribe(list => {
      if (list && list.length) {
        this.bodegasDisponibles = list;
      }
    });

    this.inventarioService.getBodegas().subscribe(list => {
      if (list && list.length) {
        this.bodegasDisponibles = list;
      }
    });

    this.usuarioService.usuarios$.subscribe(list => {
      if (list && list.length) {
        this.usuarios = list;
      }
    });

    this.usuarioService.getUsuarios().subscribe(list => {
      if (list && list.length) {
        this.usuarios = list;
      }
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

  get rolesActivosCount(): number {
    return this.rolesVisibles.filter(r => r.estado === 'Activo' || r.estado === 1).length;
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
    if (filtros.busqueda !== undefined) {
      this.filtroTexto = filtros.busqueda;
    }
    this.currentPage = 1;
  }

  aplicarFiltros() {
    this.currentPage = 1;
  }

  get usuariosFiltrados() {
    let resultados = this.usuariosVisibles;
    if (this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(u => u.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(u => u.agencia === this.filtrosGlobales.sucursal);
    }
    if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
      resultados = resultados.filter(u => {
        const suc = this.sucursalService.getSucursalPorNombre(u.agencia);
        return suc?.marcaNombre === this.filtrosGlobales.marca;
      });
    }
    if (this.filtroTexto.trim()) {
      const b = this.filtroTexto.trim().toLowerCase();
      resultados = resultados.filter(u =>
        (u.nombre || '').toLowerCase().includes(b) ||
        (u.apellido || '').toLowerCase().includes(b) ||
        `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase().includes(b) ||
        (u.email || '').toLowerCase().includes(b) ||
        (u.rol || '').toLowerCase().includes(b)
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
    if (rol?.badgeClass) return rol.badgeClass;
    if (rolNombre.includes('Admin') || rolNombre.includes('Super')) return 'bg-purple-100 text-purple-900 border-purple-300';
    if (rolNombre.includes('Gerente')) return 'bg-easydry-blue/15 text-easydry-blue border-easydry-blue/20';
    if (rolNombre.includes('Supervisor')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (rolNombre.includes('Operador') || rolNombre.includes('Lavador')) return 'bg-easydry-green/20 text-easydry-green-dark border-easydry-green/30';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  getUsuariosCountForRol(rolNombre: string): number {
    return this.usuariosVisibles.filter(u => 
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
    this.usuarioFormSubmitted = false;
    const primerRol = this.rolesVisibles[0]?.nombre || 'Administrador';
    let agenciaInicial = '';
    if (this.esGestorBodegaRol(primerRol)) {
      agenciaInicial = 'Bodega Central Nacional';
    } else if (this.esAsistenteBodegaRol(primerRol)) {
      agenciaInicial = this.bodegasDisponibles[0]?.nombre || 'Bodega Central Nacional';
    }
    this.usuarioForm = {
      nombre: '',
      apellido: '',
      rol: primerRol,
      agencia: agenciaInicial,
      estado: 'Activo',
      email: '',
      password: '',
      confirmPassword: '',
      cambiarPassword: true,
      modalidadPulidor: 'MOVIL'
    };
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.modalUsuarioOpen = true;
  }

  editarUsuario(u: Usuario) {
    this.editandoUsuario = u;
    this.usuarioFormSubmitted = false;
    let agenciaActual = (u.agencia && u.agencia !== 'Sin asignar' && u.agencia !== 'EasyDry Corporativo')
      ? u.agencia
      : (u.sucursal && u.sucursal !== 'Sin asignar' && u.sucursal !== 'EasyDry Corporativo')
        ? u.sucursal
        : '';

    if (this.esGestorBodegaRol(u.rol)) {
      agenciaActual = 'Bodega Central Nacional';
    } else if (this.esAsistenteBodegaRol(u.rol)) {
      if (u.regionId) {
        const matchingBodega = this.bodegasDisponibles.find(b => b.regionId === u.regionId);
        if (matchingBodega) {
          agenciaActual = matchingBodega.nombre;
        }
      }
      if (!agenciaActual || agenciaActual === 'Sin asignar') {
        agenciaActual = this.bodegasDisponibles[0]?.nombre || 'Bodega Central Nacional';
      }
    }

    this.usuarioForm = {
      nombre: u.nombre,
      apellido: u.apellido,
      rol: u.rol,
      agencia: agenciaActual,
      estado: u.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
      email: u.email,
      password: '',
      confirmPassword: '',
      cambiarPassword: false,
      modalidadPulidor: u.modalidadPulidor || (esRolOperadorEspeciales(u.rol) ? 'MOVIL' : 'MOVIL')
    };
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.modalUsuarioOpen = true;
  }

  esLiderOperadorRol(rol: string): boolean {
    const r = (rol || '').toLowerCase();
    return r.includes('lider') || r.includes('líder');
  }

  toggleEstadoUsuario(u: Usuario) {
    const nuevoEstado: 'Activo' | 'Inactivo' = u.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.usuarioService.toggleEstado(u.id, nuevoEstado).subscribe({
      next: () => {
        u.estado = nuevoEstado;
        if (nuevoEstado === 'Inactivo') {
          this.toastService.warning(
            'Usuario Desactivado',
            `${u.nombre} ${u.apellido} ha sido marcado como Inactivo. No podrá iniciar sesión ni aparecerá en listas de asignación.`
          );
        } else {
          this.toastService.success(
            'Usuario Reactivado',
            `${u.nombre} ${u.apellido} ahora está Activo y disponible para iniciar sesión y ser asignado.`
          );
        }
      },
      error: () => {
        this.toastService.error('Error', 'No se pudo cambiar el estado del usuario.');
      }
    });
  }

  abrirModalEliminarUsuario(u: Usuario) {
    this.usuarioAEliminar = u;
    this.modalEliminarUsuarioOpen = true;
  }

  confirmarEliminarUsuario() {
    if (!this.usuarioAEliminar) return;
    const u = this.usuarioAEliminar;
    this.usuarioService.eliminarUsuario(u.id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(user => String(user.id) !== String(u.id));
        this.toastService.success(
          'Usuario Eliminado',
          `El usuario ${u.nombre} ${u.apellido} ha sido eliminado del sistema.`
        );
        this.modalEliminarUsuarioOpen = false;
        this.usuarioAEliminar = null;
      },
      error: () => {
        this.modalEliminarUsuarioOpen = false;
        this.usuarioAEliminar = null;
      }
    });
  }

  onRolUsuarioChange() {
    if (this.esOperadorEspecialesRol(this.usuarioForm.rol)) {
      if (!this.usuarioForm.modalidadPulidor) {
        this.usuarioForm.modalidadPulidor = 'MOVIL';
      }
      this.setModalidadPulidor(this.usuarioForm.modalidadPulidor);
    } else if (this.esGestorBodegaRol(this.usuarioForm.rol)) {
      this.usuarioForm.agencia = 'Bodega Central Nacional';
    } else if (this.esAsistenteBodegaRol(this.usuarioForm.rol)) {
      if (!this.usuarioForm.agencia || !this.bodegasDisponibles.some(b => b.nombre === this.usuarioForm.agencia)) {
        this.usuarioForm.agencia = this.bodegasDisponibles[0]?.nombre || 'Bodega Central Nacional';
      }
    }
  }

  setModalidadPulidor(modalidad: ModalidadPulidor) {
    this.usuarioForm.modalidadPulidor = modalidad;
    if (modalidad === 'MOVIL') {
      this.usuarioForm.agencia = 'Red Nacional · Móvil';
    }
  }

  private payloadModalidad(): { agencia: string; modalidadPulidor?: ModalidadPulidor } {
    if (this.esGestorBodegaRol(this.usuarioForm.rol)) {
      return { agencia: 'Bodega Central Nacional', modalidadPulidor: undefined };
    }
    if (this.esAsistenteBodegaRol(this.usuarioForm.rol)) {
      return { agencia: this.usuarioForm.agencia?.trim() || 'Bodega Central Nacional', modalidadPulidor: undefined };
    }
    if (!esRolOperadorEspeciales(this.usuarioForm.rol)) {
      return { agencia: this.usuarioForm.agencia?.trim() || 'Sin asignar', modalidadPulidor: undefined };
    }
    if (this.usuarioForm.modalidadPulidor === 'FIJO') {
      return { agencia: this.usuarioForm.agencia?.trim() || 'Sin asignar', modalidadPulidor: 'FIJO' };
    }
    return { agencia: 'Red Nacional · Móvil', modalidadPulidor: 'MOVIL' };
  }

  guardarUsuario() {
    this.usuarioFormSubmitted = true;
    if (this.nombreInvalido || this.emailInvalido || this.passwordInvalido || this.confirmPasswordInvalido) {
      this.toastService.warning('Campos Requeridos', 'Por favor complete los campos obligatorios señalados en rojo.');
      return;
    }

    // Validación de contraseñas
    if (!this.editandoUsuario) {
      const p = this.usuarioForm.password?.trim() || '';
      const c = this.usuarioForm.confirmPassword?.trim() || '';
      if (!p) {
        this.toastService.warning('Contraseña Requerida', 'Debe ingresar una contraseña para el nuevo usuario.');
        return;
      }
      if (p.length < 6) {
        this.toastService.warning('Contraseña Corta', 'La contraseña debe contener al menos 6 caracteres.');
        return;
      }
      if (p !== c) {
        this.toastService.error('Verificación Fallida', 'La verificación de la contraseña no coincide.');
        return;
      }
    } else if (this.usuarioForm.cambiarPassword) {
      const p = this.usuarioForm.password?.trim() || '';
      const c = this.usuarioForm.confirmPassword?.trim() || '';
      if (!p) {
        this.toastService.warning('Contraseña Requerida', 'Ingrese la nueva contraseña o desmarque la opción de cambio.');
        return;
      }
      if (p.length < 6) {
        this.toastService.warning('Contraseña Corta', 'La nueva contraseña debe contener al menos 6 caracteres.');
        return;
      }
      if (p !== c) {
        this.toastService.error('Verificación Fallida', 'La verificación de la nueva contraseña no coincide.');
        return;
      }
    }

    if (esRolOperadorEspeciales(this.usuarioForm.rol) && this.usuarioForm.modalidadPulidor === 'FIJO' && !this.usuarioForm.agencia) {
      this.toastService.warning('Agencia requerida', 'Un pulidor fijo debe quedar asignado a una agencia.');
      return;
    }

    if (this.esAsistenteBodegaRol(this.usuarioForm.rol) && !this.usuarioForm.agencia) {
      this.usuarioForm.agencia = this.bodegasDisponibles[0]?.nombre || 'Bodega Central Nacional';
    }

    const modalidad = this.payloadModalidad();
    const isAsistente = this.esAsistenteBodegaRol(this.usuarioForm.rol);
    const isGestor = this.esGestorBodegaRol(this.usuarioForm.rol);

    let bodegaMatch: BodegaInventario | undefined = undefined;
    if (isAsistente || isGestor) {
      bodegaMatch = this.bodegasDisponibles.find(b =>
        b.nombre === this.usuarioForm.agencia ||
        b.id === this.usuarioForm.agencia ||
        b.codigo === this.usuarioForm.agencia
      );
    }

    const rolEncontrado = this.rolesVisibles.find(r =>
      r.nombre.toLowerCase() === this.usuarioForm.rol.toLowerCase() ||
      r.codigo.toLowerCase() === this.usuarioForm.rol.toLowerCase() ||
      (isGestor && (r.codigo === 'COORD_BODEGA' || r.codigo === 'DISTRIBUIDOR')) ||
      (isAsistente && r.codigo === 'ASISTENTE_BODEGA')
    );

    const roleIdToSend = rolEncontrado?.id ||
      (isGestor ? this.rolesVisibles.find(r => r.codigo === 'COORD_BODEGA')?.id : undefined) ||
      (isAsistente ? this.rolesVisibles.find(r => r.codigo === 'ASISTENTE_BODEGA')?.id : undefined);

    if (this.editandoUsuario) {
      const nuevoEstado: 'Activo' | 'Inactivo' = this.usuarioForm.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
      const agenciaVal = modalidad.agencia === 'Sin asignar' ? '' : modalidad.agencia;
      const sucursalMatch = this.sucursales.find(s => s.nombre === agenciaVal || String(s.id) === agenciaVal);
      const actualizado: Usuario & { password?: string; roleId?: string; regionId?: string; region?: string } = {
        ...this.editandoUsuario,
        nombre: this.usuarioForm.nombre.trim(),
        apellido: this.usuarioForm.apellido.trim(),
        rol: rolEncontrado?.nombre || this.usuarioForm.rol,
        agencia: agenciaVal || 'Sin asignar',
        sucursal: agenciaVal || 'Sin asignar',
        agenciaId: sucursalMatch ? String(sucursalMatch.id) : undefined,
        regionId: isAsistente ? (bodegaMatch?.regionId || this.editandoUsuario.regionId) : undefined,
        region: isAsistente ? (bodegaMatch?.region || this.editandoUsuario.region) : undefined,
        estado: nuevoEstado,
        email: this.usuarioForm.email.trim(),
        modalidadPulidor: modalidad.modalidadPulidor,
        ...(this.usuarioForm.cambiarPassword && this.usuarioForm.password?.trim()
          ? { password: this.usuarioForm.password.trim() }
          : {}),
        roleId: roleIdToSend || (this.editandoUsuario as any).roleId || undefined
      };

      this.usuarioService.actualizarUsuario(actualizado).subscribe({
        next: (res) => {
          const uFinal = res || actualizado;
          const idx = this.usuarios.findIndex(u => String(u.id) === String(uFinal.id));
          if (idx !== -1) {
            this.usuarios[idx] = uFinal;
            this.usuarios = [...this.usuarios];
          }
          this.usuarioService.getUsuarios(undefined, true).subscribe(refreshed => {
            if (refreshed && refreshed.length) {
              this.usuarios = [...refreshed];
            }
          });
          if (nuevoEstado === 'Inactivo') {
            this.toastService.warning('Usuario Actualizado', `Perfil de ${actualizado.nombre} actualizado como Inactivo. Se bloqueará su login y no aparecerá en selectores de asignación.`);
          } else {
            this.toastService.success('Usuario Actualizado', `Perfil de ${actualizado.nombre} actualizado correctamente.`);
          }
          this.modalUsuarioOpen = false;
        },
        error: (err) => {
          console.error('Error al actualizar usuario', err);
          this.toastService.error('Error', 'No se pudo actualizar el usuario. Verifique los datos e intente de nuevo.');
        }
      });
    } else {
      const agenciaVal = modalidad.agencia === 'Sin asignar' ? '' : modalidad.agencia;
      const sucursalMatch = this.sucursales.find(s => s.nombre === agenciaVal || String(s.id) === agenciaVal);
      const nuevo: Omit<Usuario, 'id'> & { password?: string; roleId?: string; regionId?: string; region?: string } = {
        nombre: this.usuarioForm.nombre.trim(),
        apellido: this.usuarioForm.apellido.trim(),
        rol: rolEncontrado?.nombre || this.usuarioForm.rol,
        agencia: agenciaVal || 'Sin asignar',
        sucursal: agenciaVal || 'Sin asignar',
        agenciaId: sucursalMatch ? String(sucursalMatch.id) : undefined,
        regionId: isAsistente ? bodegaMatch?.regionId : undefined,
        region: isAsistente ? bodegaMatch?.region : undefined,
        estado: this.usuarioForm.estado,
        email: this.usuarioForm.email.trim(),
        fechaAsignacion: new Date().toISOString().split('T')[0],
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        modalidadPulidor: modalidad.modalidadPulidor,
        password: this.usuarioForm.password?.trim(),
        roleId: roleIdToSend
      };

      this.usuarioService.crearUsuario(nuevo).subscribe({
        next: (creado) => {
          const existe = this.usuarios.some(u => String(u.id) === String(creado.id) || (u.email && u.email.toLowerCase() === creado.email.toLowerCase()));
          if (!existe) {
            this.usuarios = [creado, ...this.usuarios];
          } else {
            this.usuarios = this.usuarios.map(u => (String(u.id) === String(creado.id) || u.email.toLowerCase() === creado.email.toLowerCase()) ? creado : u);
          }
          this.currentPage = 1;
          this.usuarioService.getUsuarios(undefined, true).subscribe(refreshed => {
            if (refreshed && refreshed.length) {
              this.usuarios = [...refreshed];
            }
          });
          this.toastService.success(
            'Usuario Registrado',
            `Usuario ${creado.nombre} ${creado.apellido} registrado exitosamente con sus credenciales de acceso.`
          );
          this.modalUsuarioOpen = false;
        },
        error: () => {
          const fallback: Usuario = {
            ...nuevo,
            id: 'usr-' + Date.now().toString().slice(-4),
            sucursal: nuevo.agencia,
            region: isAsistente && bodegaMatch?.region ? bodegaMatch.region : 'Sin asignar'
          };
          this.usuarios = [fallback, ...this.usuarios];
          this.currentPage = 1;
          this.toastService.success(
            'Usuario Registrado',
            `Usuario ${nuevo.nombre} ${nuevo.apellido} registrado exitosamente.`
          );
          this.modalUsuarioOpen = false;
        }
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
      color: rol.color || '#004282',
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
      const rolId = this.editandoRol.id;
      this.rolService.actualizarRol(rolId, {
        nombre: this.rolForm.nombre,
        descripcion: this.rolForm.descripcion,
        color: this.rolForm.color,
        modulos: this.rolForm.modulos
      }).subscribe(res => {
        if (res) {
          this.roles = this.roles.map(r => r.id === rolId ? { ...r, ...res } : r);
          this.toastService.success('Rol Actualizado', `Permisos para "${res.nombre}" actualizados correctamente.`);
        }
        this.rolService.getRoles().subscribe(rolesList => {
          if (rolesList && rolesList.length) {
            this.roles = [...rolesList];
          }
        });
        this.modalRolOpen = false;
      });
    } else {
      this.rolService.crearRol({
        nombre: this.rolForm.nombre,
        descripcion: this.rolForm.descripcion,
        color: this.rolForm.color,
        modulos: this.rolForm.modulos
      }).subscribe(creado => {
        if (creado) {
          this.roles = [...this.roles, creado];
        }
        this.toastService.success('Rol Creado', `Nuevo rol "${creado.nombre}" disponible en la plataforma.`);
        this.rolService.getRoles().subscribe(rolesList => {
          if (rolesList && rolesList.length) {
            this.roles = [...rolesList];
          }
        });
        this.modalRolOpen = false;
      });
    }
  }

  toggleEstadoRol(rol: RolPersonalizado) {
    if (isRolPermisosInmutable(rol.codigo)) {
      this.toastService.warning('Rol inmutable', 'El estado del Super Administrador no puede modificarse.');
      return;
    }
    const nuevoEstado = rol.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.rolService.actualizarRol(rol.id, { estado: nuevoEstado === 'Activo' ? 1 : 0 }).subscribe({
      next: (res) => {
        if (res) {
          rol.estado = nuevoEstado;
          this.roles = this.roles.map(r => r.id === rol.id ? { ...r, estado: nuevoEstado } : r);
          if (nuevoEstado === 'Inactivo') {
            this.toastService.warning('Rol Desactivado', `El rol "${rol.nombre}" ha sido marcado como Inactivo.`);
          } else {
            this.toastService.success('Rol Activado', `El rol "${rol.nombre}" ha sido activado correctamente.`);
          }
        }
      },
      error: () => {
        this.toastService.error('Error', 'No se pudo cambiar el estado del rol.');
      }
    });
  }

  abrirModalEliminarRol(rol: RolPersonalizado) {
    this.rolAEliminar = rol;
    this.modalEliminarRolOpen = true;
  }

  confirmarEliminarRol() {
    if (!this.rolAEliminar) return;
    const rol = this.rolAEliminar;
    this.rolService.eliminarRol(rol.id).subscribe(res => {
      if (res.success) {
        this.roles = this.roles.filter(r => r.id !== rol.id);
        this.toastService.success('Rol Eliminado', `El rol "${rol.nombre}" ha sido eliminado.`);
        this.rolService.getRoles().subscribe(rolesList => {
          if (rolesList && rolesList.length) {
            this.roles = [...rolesList];
          }
        });
      } else {
        this.toastService.error('Acción no permitida', res.message || 'No se pudo eliminar el rol.');
      }
      this.modalEliminarRolOpen = false;
      this.rolAEliminar = null;
    });
  }
}

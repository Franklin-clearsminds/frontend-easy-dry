import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UsuarioService } from '../../core/services/usuario.service';
import { RolService } from '../../core/services/rol.service';
import { AuthService } from '../../core/services/auth.service';
import { Usuario, ModuloSistema, RolPersonalizado, Sucursal, ModalidadPulidor, BodegaInventario, RegionOperativa, CatalogoServicio } from '../../core/models';
import { isRolPermisosInmutable, PermisoModuloAcciones } from '../../core/models/roles.model';
import { SucursalService } from '../../core/services/sucursal.service';
import { InventarioService } from '../../core/services/inventario.service';
import { RegionService } from '../../core/services/region.service';
import { CatalogoServiciosService } from '../../core/services/catalogo-servicios.service';
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
          (click)="seleccionarTab('usuarios')"
          class="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2"
          [ngClass]="activeTab === 'usuarios' ? 'bg-easydry-blue text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'">
          <i-lucide name="users" class="w-4 h-4"></i-lucide>
          <span>Directorio de Usuarios ({{ usuariosVisibles.length }})</span>
        </button>

        <button
          (click)="seleccionarTab('roles')"
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
          <!-- Global Filter Bar con Filtro de Rol y Cascada -->
          <app-filter-bar 
            [showRol]="true"
            [listaRoles]="rolesParaFiltro"
            [showRegion]="true"
            [listaRegiones]="regionesParaFiltro"
            [showSucursal]="true" 
            [listaSucursales]="sucursalesParaFiltro"
            [showOperador]="false"
            [showBahia]="false"
            [showCliente]="true"
            [showEstado]="true"
            [showFechas]="false"
            [showBusqueda]="true"
            placeholderBusqueda="Buscar por nombre, correo, rol, agencia o ID (USR-...)..."
            [listaEstados]="['Todos', 'Activo', 'Inactivo']"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>

          <!-- Píldoras Rápidas de Segmentación en 1 Clic -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 select-none scrollbar-none">
            <button
              type="button"
              (click)="setQuickPill('todos')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'todos' ? 'bg-easydry-blue text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <span>Todos</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" [ngClass]="filtroPillRapida === 'todos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ usuariosVisibles.length }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('lavadores')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'lavadores' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide name="sparkles" class="w-3.5 h-3.5"></i-lucide>
              <span>Lavadores</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" [ngClass]="filtroPillRapida === 'lavadores' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ countLavadores }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('supervisores')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'supervisores' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide name="user-check" class="w-3.5 h-3.5"></i-lucide>
              <span>Supervisores</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" [ngClass]="filtroPillRapida === 'supervisores' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ countSupervisores }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('bodega')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'bodega' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide name="warehouse" class="w-3.5 h-3.5"></i-lucide>
              <span>Bodega e Inventario</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" [ngClass]="filtroPillRapida === 'bodega' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ countBodega }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('admins')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'admins' ? 'bg-slate-800 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide name="shield" class="w-3.5 h-3.5"></i-lucide>
              <span>Administrativos</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" [ngClass]="filtroPillRapida === 'admins' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ countAdmins }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('inactivos')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'inactivos' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide name="user-x" class="w-3.5 h-3.5"></i-lucide>
              <span>Inactivos</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px]" [ngClass]="filtroPillRapida === 'inactivos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ countInactivos }}
              </span>
            </button>
          </div>

          <!-- Etiquetas (Chips) de Filtros Activos -->
          @if (hayFiltrosActivos) {
            <div class="flex items-center gap-2 flex-wrap text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 animate-fade-in">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <i-lucide name="filter" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Filtros Activos:
              </span>

              @if (filtroPillRapida !== 'todos') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-easydry-blue/10 text-easydry-blue font-bold border border-easydry-blue/20">
                  Segmento: {{ filtroPillRapida | titlecase }}
                  <button type="button" (click)="removerFiltro('pill')" class="hover:text-easydry-blue-dark cursor-pointer"><i-lucide name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.rol && filtrosGlobales.rol !== 'Todos') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold border border-purple-200">
                  Rol: {{ filtrosGlobales.rol }}
                  <button type="button" (click)="removerFiltro('rol')" class="hover:text-purple-950 cursor-pointer"><i-lucide name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.region && filtrosGlobales.region !== 'Todas') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold border border-blue-200">
                  Región: {{ filtrosGlobales.region }}
                  <button type="button" (click)="removerFiltro('region')" class="hover:text-blue-950 cursor-pointer"><i-lucide name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.sucursal && filtrosGlobales.sucursal !== 'Todas') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-100 text-cyan-800 font-bold border border-cyan-200">
                  Agencia: {{ filtrosGlobales.sucursal }}
                  <button type="button" (click)="removerFiltro('sucursal')" class="hover:text-cyan-950 cursor-pointer"><i-lucide name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.cliente && filtrosGlobales.cliente !== 'Todas') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  Cliente: {{ filtrosGlobales.cliente }}
                  <button type="button" (click)="removerFiltro('cliente')" class="hover:text-amber-950 cursor-pointer"><i-lucide name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.estado && filtrosGlobales.estado !== 'Todos') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 font-bold border border-slate-300">
                  Estado: {{ filtrosGlobales.estado }}
                  <button type="button" (click)="removerFiltro('estado')" class="hover:text-black cursor-pointer"><i-lucide name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtroTexto.trim()) {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  "{{ filtroTexto }}"
                  <button type="button" (click)="removerFiltro('busqueda')" class="hover:text-emerald-950 cursor-pointer"><i-lucide name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }

              <button
                type="button"
                (click)="limpiarTodosFiltros()"
                class="ml-auto text-[11px] font-extrabold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1">
                <i-lucide name="trash-2" class="w-3 h-3"></i-lucide>
                Limpiar filtros
              </button>
            </div>
          }

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
                  type="button"
                  (click)="exportarUsuariosCSV()"
                  title="Exportar listado a CSV / Excel"
                  class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200">
                  <i-lucide name="download" class="w-4 h-4 text-slate-600"></i-lucide>
                  <span>Exportar</span>
                </button>
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
                <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200 select-none">
                  <tr>
                    <th (click)="toggleSort('nombre')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div class="flex items-center gap-1.5">
                        <span>Usuario</span>
                        <i-lucide [name]="sortColumn === 'nombre' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'" class="w-3.5 h-3.5" [ngClass]="sortColumn === 'nombre' ? 'text-easydry-blue' : 'text-slate-300'"></i-lucide>
                      </div>
                    </th>
                    <th (click)="toggleSort('rol')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div class="flex items-center gap-1.5">
                        <span>Rol Asignado</span>
                        <i-lucide [name]="sortColumn === 'rol' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'" class="w-3.5 h-3.5" [ngClass]="sortColumn === 'rol' ? 'text-easydry-blue' : 'text-slate-300'"></i-lucide>
                      </div>
                    </th>
                    <th (click)="toggleSort('agencia')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div class="flex items-center gap-1.5">
                        <span>Agencia o Región</span>
                        <i-lucide [name]="sortColumn === 'agencia' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'" class="w-3.5 h-3.5" [ngClass]="sortColumn === 'agencia' ? 'text-easydry-blue' : 'text-slate-300'"></i-lucide>
                      </div>
                    </th>
                    <th (click)="toggleSort('email')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div class="flex items-center gap-1.5">
                        <span>Correo Electrónico</span>
                        <i-lucide [name]="sortColumn === 'email' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'" class="w-3.5 h-3.5" [ngClass]="sortColumn === 'email' ? 'text-easydry-blue' : 'text-slate-300'"></i-lucide>
                      </div>
                    </th>
                    <th (click)="toggleSort('fechaAsignacion')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div class="flex items-center gap-1.5">
                        <span>Fecha Ingreso</span>
                        <i-lucide [name]="sortColumn === 'fechaAsignacion' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'" class="w-3.5 h-3.5" [ngClass]="sortColumn === 'fechaAsignacion' ? 'text-easydry-blue' : 'text-slate-300'"></i-lucide>
                      </div>
                    </th>
                    <th (click)="toggleSort('estado')" class="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div class="flex items-center gap-1.5">
                        <span>Estado</span>
                        <i-lucide [name]="sortColumn === 'estado' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'" class="w-3.5 h-3.5" [ngClass]="sortColumn === 'estado' ? 'text-easydry-blue' : 'text-slate-300'"></i-lucide>
                      </div>
                    </th>
                    <th class="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @if (usuariosFiltrados.length === 0) {
                    <tr>
                      <td colspan="7" class="py-12 px-4 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                          <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                            <i-lucide name="search-x" class="w-6 h-6"></i-lucide>
                          </div>
                          <p class="font-bold text-slate-700 text-sm">No se encontraron colaboradores</p>
                          <p class="text-xs text-slate-400 mt-1">No hay usuarios que coincidan con los criterios y filtros seleccionados.</p>
                          <button
                            type="button"
                            (click)="limpiarTodosFiltros()"
                            class="mt-3 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">
                            Limpiar filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @else {
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
                          @if (esAdminOGlobal(u.rol)) {
                            <span class="inline-flex items-center gap-1.5 text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 w-fit">
                              <i-lucide name="globe" class="w-3.5 h-3.5 text-slate-500"></i-lucide>
                              <span>Acceso Global (Sin Agencia)</span>
                            </span>
                          } @else if (esGestorBodegaRol(u.rol)) {
                            <span class="inline-flex items-center gap-1.5 text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 w-fit">
                              <i-lucide name="globe" class="w-3.5 h-3.5 text-purple-600"></i-lucide>
                              <span>Acceso Global (Todo de Todos)</span>
                            </span>
                          } @else if (esSupervisorRol(u.rol)) {
                            <span class="inline-flex items-center gap-1.5 text-blue-800 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 w-fit">
                              <i-lucide name="map-pin" class="w-3.5 h-3.5 text-blue-600"></i-lucide>
                              <span>Región {{ u.region || 'Regional' }}</span>
                            </span>
                          } @else if (esAsistenteBodegaRol(u.rol)) {
                            <span class="inline-flex items-center gap-1.5 text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 w-fit">
                              <i-lucide name="map-pin" class="w-3.5 h-3.5 text-amber-600"></i-lucide>
                              <span>{{ u.agencia || ('Bodega Región ' + (u.region || 'Regional')) }}</span>
                            </span>
                          } @else if (u.agencia && u.agencia !== 'Sin asignar' && !u.agencia.includes('Sin') && !u.agencia.startsWith('Región') && !u.agencia.startsWith('Móvil')) {
                            <div class="flex flex-col">
                              <span class="font-bold text-slate-900">{{ u.agencia }}</span>
                              @if (u.region && u.region !== 'Sin asignar' && u.region !== 'Nacional') {
                                <span class="text-[10px] text-slate-500 font-normal">Región {{ u.region }}</span>
                              }
                            </div>
                          } @else if (u.region && u.region !== 'Sin asignar' && u.region !== 'Nacional') {
                            <span class="inline-flex items-center gap-1.5 text-blue-800 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 w-fit">
                              <i-lucide name="map-pin" class="w-3.5 h-3.5 text-blue-600"></i-lucide>
                              <span>Región {{ u.region }}</span>
                            </span>
                          } @else {
                            <span class="text-slate-500">{{ u.agencia || 'Sin asignar' }}</span>
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
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Rol Asignado (Base de Datos)</label>
              <select [(ngModel)]="usuarioForm.roleId" name="roleId" (ngModelChange)="onRoleIdChange($event)" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white border-slate-200 focus:border-easydry-blue">
                @for (r of rolesVisibles; track r.id) {
                  <option [value]="r.id">{{ r.nombre }} ({{ r.codigo }})</option>
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
                <p class="text-xs font-extrabold text-cyan-900 uppercase tracking-wide">Asignación del pulidor</p>
                <p class="text-[11px] text-cyan-800 mt-0.5">Con agencia = fijo (solo su sede). Sin agencia = móvil (exige región).</p>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia (opcional)</label>
                <select
                  [(ngModel)]="usuarioForm.agencia"
                  name="agenciaPulidor"
                  (ngModelChange)="onPulidorAgenciaChange($event)"
                  class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white">
                  <option value="">Sin agencia · Pulidor móvil</option>
                  @for (s of sucursales; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }} ({{ s.ciudad }})</option>
                  }
                </select>
              </div>
              @if (!(usuarioForm.agencia || '').trim()) {
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Región operativa <span class="text-cyan-600">*</span>
                  </label>
                  <select [(ngModel)]="usuarioForm.region" name="regionPulidorMovil" class="w-full p-2.5 border rounded-xl text-sm font-semibold border-cyan-300 focus:border-cyan-500 bg-white" required>
                    <option value="">Selecciona una región...</option>
                    @for (r of regionesDisponibles; track r.id) {
                      <option [value]="r.nombre">{{ r.nombre }}</option>
                    }
                  </select>
                  <p class="text-[11px] text-cyan-800 mt-1">El pulidor móvil opera solo en agencias de su región.</p>
                </div>
                <div class="p-3 rounded-xl border border-cyan-300/80 bg-white/95 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700 flex-shrink-0">
                    <i-lucide name="sparkles" class="w-4 h-4"></i-lucide>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-cyan-900">Catálogo Completo Asignado Automáticamente</p>
                    <p class="text-[11px] text-cyan-800 leading-snug">
                      Este pulidor móvil realiza todos los <strong>{{ serviciosEspecialesCatalogo.length }} servicios especiales</strong> de la empresa. Su kit incluirá todos los insumos correspondientes.
                    </p>
                  </div>
                </div>
              } @else {
                <div class="p-3 rounded-xl border border-cyan-300/80 bg-white/95 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700 flex-shrink-0">
                    <i-lucide name="sparkles" class="w-4 h-4"></i-lucide>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-cyan-900">Pulidor Fijo · Catálogo Completo Habilitado</p>
                    <p class="text-[11px] text-cyan-800 leading-snug">
                      Asignado a <strong>{{ usuarioForm.agencia }}</strong> con los <strong>{{ serviciosEspecialesCatalogo.length }} servicios especiales</strong> y su kit de insumos.
                    </p>
                  </div>
                </div>
              }
            </div>
          } @else if (esAdminOGlobal(usuarioForm.rol)) {
            <div class="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 space-y-2">
              <div class="flex items-center gap-2 text-blue-900">
                <i-lucide name="globe" class="w-4 h-4 text-blue-600 shrink-0"></i-lucide>
                <span class="text-xs font-extrabold uppercase tracking-wide">Acceso Global Directivo · Red Nacional</span>
              </div>
              <p class="text-xs text-blue-800 leading-relaxed">
                El <b>Super Administrador</b> y <b>Administrador</b> cuentan con alcance directivo a nivel nacional y <b>no están vinculados a ninguna agencia en particular</b>.
              </p>
            </div>
          } @else if (esSupervisorRol(usuarioForm.rol) || esRolRegional(usuarioForm.rol)) {
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">
                  Asignar Región <span class="text-blue-500">*</span>
                </label>
                <span class="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Control y Ámbito Regional
                </span>
              </div>
              <select [(ngModel)]="usuarioForm.region" name="regionSupervisor" class="w-full p-2.5 border rounded-xl text-sm font-semibold border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white" required>
                <option value="">Selecciona una región...</option>
                @for (r of regionesDisponibles; track r.id) {
                  <option [value]="r.nombre">{{ r.nombre }}</option>
                }
              </select>
              <p class="text-[11px] text-slate-400 mt-1">
                Este perfil opera en todas las agencias y bahías pertenecientes a su región asignada.
              </p>
            </div>
          } @else if (esGestorBodegaRol(usuarioForm.rol)) {
            <div class="p-4 rounded-2xl border border-purple-200 bg-purple-50/70 space-y-2">
              <div class="flex items-center gap-2 text-purple-900">
                <i-lucide name="globe" class="w-4 h-4 text-purple-600 shrink-0"></i-lucide>
                <span class="text-xs font-extrabold uppercase tracking-wide">Alcance Global · Coordinador de Bodega</span>
              </div>
              <p class="text-xs text-purple-800 leading-relaxed">
                El <b>Coordinador de Bodega</b> opera todo el stock nacional (compras a central y despachos a cualquier lugar). <b>No requiere</b> agencia, región ni bodega fija.
              </p>
            </div>
          } @else if (esAsistenteBodegaRol(usuarioForm.rol)) {
            <div class="space-y-3">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-700 uppercase">
                    Bodega regional <span class="text-amber-500">*</span>
                  </label>
                  <span class="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Obligatoria
                  </span>
                </div>
                <select [(ngModel)]="usuarioForm.bodegaId" name="bodegaAsistente" (ngModelChange)="onBodegaAsistenteChange($event)" class="w-full p-2.5 border rounded-xl text-sm font-semibold border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200" required>
                  <option value="">Seleccione una bodega regional...</option>
                  @for (b of bodegasRegionales; track b.id) {
                    <option [value]="b.id">{{ b.nombre }}{{ b.region ? ' · ' + b.region : '' }}</option>
                  }
                </select>
                <p class="text-[11px] text-slate-500 mt-1">
                  El Asistente despacha solo a agencias de la región de su bodega asignada.
                </p>
              </div>
            </div>
          } @else {
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">
                  Agencia {{ esLiderOperadorRol(usuarioForm.rol) ? '' : '(Opcional)' }}
                  @if (esLiderOperadorRol(usuarioForm.rol)) {
                    <span class="text-rose-500">*</span>
                  }
                </label>
                <span class="text-[10px] text-slate-400 font-medium">
                  {{ esLiderOperadorRol(usuarioForm.rol) ? 'Obligatoria · Líder Operador' : 'No obligatorio' }}
                </span>
              </div>
              <select [(ngModel)]="usuarioForm.agencia" name="agencia" class="w-full p-2.5 border rounded-xl text-sm font-semibold" [required]="esLiderOperadorRol(usuarioForm.rol)">
                <option value="">{{ esLiderOperadorRol(usuarioForm.rol) ? 'Selecciona una agencia...' : 'Sin sucursal asignada (Opcional)' }}</option>
                @for (s of sucursales; track s.id) {
                  <option [value]="s.nombre">{{ s.nombre }}</option>
                }
              </select>
              <p class="text-[11px] text-slate-400 mt-1">
                {{ esLiderOperadorRol(usuarioForm.rol)
                  ? 'El Líder Operador gestiona inventario, OTs y despachos intra-región desde su agencia.'
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
  modulosDisponibles: ModuloSistema[] = [];
  modulosAgrupados: ModuloGrupo[] = [];

  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', cliente: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', rol: 'Todos', fecha: 'Hoy' };
  filtroTexto = '';
  filtroPillRapida: 'todos' | 'lavadores' | 'supervisores' | 'bodega' | 'admins' | 'inactivos' = 'todos';

  sortColumn: 'nombre' | 'rol' | 'agencia' | 'email' | 'fechaAsignacion' | 'estado' = 'nombre';
  sortDirection: 'asc' | 'desc' = 'asc';

  currentPage = 1;
  pageSize = 10;

  // Modales
  modalUsuarioOpen = false;
  editandoUsuario: Usuario | null = null;
  usuarioForm: {
    nombre: string;
    apellido: string;
    rol: string;
    roleId?: string;
    agencia: string;
    region?: string;
    bodegaId?: string;
    estado: 'Activo' | 'Inactivo';
    email: string;
    password?: string;
    confirmPassword?: string;
    cambiarPassword?: boolean;
    modalidadPulidor: ModalidadPulidor;
    servicioIds: number[];
  } = {
    nombre: '',
    apellido: '',
    rol: 'Aprobador',
    roleId: undefined,
    agencia: '',
    region: '',
    bodegaId: '',
    estado: 'Activo',
    email: '',
    password: '',
    confirmPassword: '',
    cambiarPassword: false,
    modalidadPulidor: 'MOVIL',
    servicioIds: []
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
  private usuarioService = inject(UsuarioService);
  private rolService = inject(RolService);
  private sucursalService = inject(SucursalService);
  private inventarioService = inject(InventarioService);
  private regionService = inject(RegionService);
  private catalogoServiciosService = inject(CatalogoServiciosService);
  private toastService = inject(ToastService);

  bodegasDisponibles: BodegaInventario[] = [];
  regionesDisponibles: RegionOperativa[] = [];
  serviciosEspecialesCatalogo: CatalogoServicio[] = [];

  get bodegasRegionales(): BodegaInventario[] {
    return (this.bodegasDisponibles || []).filter(b =>
      !b.esCentral && (b.tipo !== 'CENTRAL')
    );
  }

  isRolPermisosInmutable = isRolPermisosInmutable;
  esOperadorEspecialesRol = esRolOperadorEspeciales;

  esAdminOGlobal(rol?: string): boolean {
    if (!rol) return false;
    const r = rol.toUpperCase().trim();
    return (r.includes('SUPER') && r.includes('ADMIN')) || r === 'ADMIN' || r === 'ADMINISTRADOR';
  }

  esSupervisorRol(rol?: string): boolean {
    if (!rol) return false;
    const r = rol.toUpperCase().trim();
    return r.includes('SUPERVISOR');
  }

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

  esRolRegional(rol?: string): boolean {
    if (!rol) return false;
    const r = rol.toUpperCase().trim();
    return (
      r.includes('SUPERVISOR') ||
      r.includes('COORD_SERVICIOS_ESPECIALES') ||
      r.includes('COORD_COMERCIAL') ||
      r.includes('SERVICIOS ESPECIALES') ||
      (r.includes('COORD') && r.includes('COMERCIAL'))
    );
  }

  onRoleIdChange(roleId: string) {
    const rolEncontrado = this.rolesVisibles.find(r => r.id === roleId);
    if (rolEncontrado) {
      this.usuarioForm.rol = rolEncontrado.nombre;
      this.usuarioForm.roleId = rolEncontrado.id;
      this.onRolUsuarioChange();
    }
  }

  seleccionarTab(tab: 'usuarios' | 'roles') {
    this.activeTab = tab;
    if (tab === 'roles') {
      this.rolService.getRoles().subscribe(list => {
        if (list && list.length) {
          this.roles = list.map(rol => ({
            ...rol,
            modulos: Array.isArray(rol.modulos) ? rol.modulos : [],
          }));
        }
      });
    } else {
      this.usuarioService.getUsuarios(undefined, true).subscribe();
    }
  }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get usuariosVisibles(): Usuario[] {
    return this.usuarios.filter(u => !this.esRolSuperAdmin(u.rolNombre || u.rol));
  }

  get rolesVisibles(): RolPersonalizado[] {
    return this.roles.filter(r => !this.esRolSuperAdmin(r.codigo || r.nombre));
  }

  /** SUPER_ADMIN nunca se lista en directorio de usuarios ni en catálogo de roles */
  private esRolSuperAdmin(valor?: string | null): boolean {
    const r = (valor || '').toUpperCase().trim();
    return (
      r === 'SUPER_ADMIN' ||
      r.includes('SUPER ADMIN') ||
      r.includes('SUPERADMIN') ||
      r.includes('SUPER ADMINISTRADOR')
    );
  }

  ngOnInit(): void {
    this.rolService.getModulos().subscribe(list => {
      this.modulosDisponibles = list || [];
      this.agruparModulos();
    });

    this.regionService.getRegiones().subscribe(list => {
      if (list && list.length) {
        this.regionesDisponibles = list.filter(r => r.estado === 'Activa' || (r as any).estado === 1);
      }
    });

    this.catalogoServiciosService.getServicios().subscribe(list => {
      this.serviciosEspecialesCatalogo = (list || []).filter(s => {
        const cat = String(s.categoria || '').trim().toUpperCase();
        const activo = s.estado === 'Activo' || (s as any).estado === 1 || s.estado == null;
        return activo && (cat === 'ESPECIAL' || cat === 'EXTRA' || cat.includes('ESPECIAL'));
      });
    });

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

    // Cargar directamente los roles de la base de datos PostgreSQL
    this.rolService.getRoles().subscribe(list => {
      if (list && list.length) {
        this.roles = list.map(rol => ({
          ...rol,
          modulos: Array.isArray(rol.modulos) ? rol.modulos : [],
        }));
      }
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

  // -------------------------------------------------------------
  // GETTERS PARA DROPDOWNS Y FILTROS EN CASCADA
  // -------------------------------------------------------------
  get rolesParaFiltro(): string[] {
    const set = new Set<string>();
    this.rolesVisibles.forEach(r => { if (r.nombre) set.add(r.nombre); });
    this.usuariosVisibles.forEach(u => { if (u.rol) set.add(u.rol); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }

  get regionesParaFiltro(): string[] {
    const set = new Set<string>();
    this.regionesDisponibles.forEach(r => { if (r.nombre) set.add(r.nombre); });
    this.sucursales.forEach(s => {
      const reg = s.regionNombre || s.region?.nombre;
      if (reg) set.add(reg);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }

  get sucursalesParaFiltro(): string[] {
    let list = this.sucursales;
    if (this.filtrosGlobales.region && this.filtrosGlobales.region !== 'Todas') {
      const reg = this.filtrosGlobales.region.toLowerCase().trim();
      list = list.filter(s => (s.regionNombre || s.region?.nombre || '').toLowerCase().trim() === reg);
    }
    if (this.filtrosGlobales.cliente && this.filtrosGlobales.cliente !== 'Todas') {
      const cli = this.filtrosGlobales.cliente.toLowerCase().trim();
      list = list.filter(s => (s.clienteNombre || s.marcaNombre || '').toLowerCase().trim() === cli);
    }
    return Array.from(new Set(list.map(s => s.nombre).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  }

  // -------------------------------------------------------------
  // CONTEOS PARA PÍLDORAS RÁPIDAS
  // -------------------------------------------------------------
  get countLavadores(): number {
    return this.usuariosVisibles.filter(u => {
      const r = (u.rol || '').toLowerCase();
      return r.includes('lavador') || r.includes('pulidor') || r.includes('operador');
    }).length;
  }

  get countSupervisores(): number {
    return this.usuariosVisibles.filter(u => {
      const r = (u.rol || '').toLowerCase();
      return r.includes('supervisor') || r.includes('coordinador');
    }).length;
  }

  get countBodega(): number {
    return this.usuariosVisibles.filter(u => {
      const r = (u.rol || '').toLowerCase();
      return r.includes('bodega') || r.includes('distribuidor') || r.includes('inventario');
    }).length;
  }

  get countAdmins(): number {
    return this.usuariosVisibles.filter(u => {
      const r = (u.rol || '').toLowerCase();
      return r.includes('admin') || r.includes('gerente') || r.includes('auditor');
    }).length;
  }

  get countInactivos(): number {
    return this.usuariosVisibles.filter(u => u.estado === 'Inactivo').length;
  }

  setQuickPill(pill: 'todos' | 'lavadores' | 'supervisores' | 'bodega' | 'admins' | 'inactivos'): void {
    this.filtroPillRapida = pill;
    this.currentPage = 1;
  }

  // -------------------------------------------------------------
  // CHIPS DE FILTROS ACTIVOS Y LIMPIEZA
  // -------------------------------------------------------------
  get hayFiltrosActivos(): boolean {
    return (
      (!!this.filtrosGlobales.rol && this.filtrosGlobales.rol !== 'Todos') ||
      (!!this.filtrosGlobales.region && this.filtrosGlobales.region !== 'Todas') ||
      (!!this.filtrosGlobales.sucursal && this.filtrosGlobales.sucursal !== 'Todas') ||
      (!!this.filtrosGlobales.cliente && this.filtrosGlobales.cliente !== 'Todas') ||
      (!!this.filtrosGlobales.estado && this.filtrosGlobales.estado !== 'Todos') ||
      !!this.filtroTexto.trim() ||
      this.filtroPillRapida !== 'todos'
    );
  }

  limpiarTodosFiltros(): void {
    this.filtrosGlobales = {
      sucursal: 'Todas',
      region: 'Todas',
      cliente: 'Todas',
      marca: 'Todas',
      bodega: 'Todas',
      operador: 'Todos',
      servicio: 'Todos',
      bahia: 'Todas',
      estado: 'Todos',
      rol: 'Todos',
      fecha: 'Mes',
      fechaInicio: '',
      fechaFin: '',
      busqueda: ''
    };
    this.filtroTexto = '';
    this.filtroPillRapida = 'todos';
    this.currentPage = 1;
  }

  removerFiltro(tipo: 'rol' | 'region' | 'sucursal' | 'cliente' | 'estado' | 'busqueda' | 'pill'): void {
    if (tipo === 'rol') this.filtrosGlobales.rol = 'Todos';
    if (tipo === 'region') this.filtrosGlobales.region = 'Todas';
    if (tipo === 'sucursal') this.filtrosGlobales.sucursal = 'Todas';
    if (tipo === 'cliente') this.filtrosGlobales.cliente = 'Todas';
    if (tipo === 'estado') this.filtrosGlobales.estado = 'Todos';
    if (tipo === 'busqueda') {
      this.filtroTexto = '';
      this.filtrosGlobales.busqueda = '';
    }
    if (tipo === 'pill') this.filtroPillRapida = 'todos';
    this.currentPage = 1;
  }

  // -------------------------------------------------------------
  // ORDENAMIENTO DINÁMICO POR COLUMNAS
  // -------------------------------------------------------------
  toggleSort(columna: 'nombre' | 'rol' | 'agencia' | 'email' | 'fechaAsignacion' | 'estado'): void {
    if (this.sortColumn === columna) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columna;
      this.sortDirection = 'asc';
    }
  }

  // -------------------------------------------------------------
  // EXPORTAR COLABORADORES FILTRADOS A CSV
  // -------------------------------------------------------------
  exportarUsuariosCSV(): void {
    const rows = this.usuariosFiltrados.map(u => ({
      ID: `USR-00${u.id}`,
      Nombre: u.nombre,
      Apellido: u.apellido,
      Rol: u.rol,
      Agencia: u.agencia,
      Region: u.region || '-',
      Email: u.email,
      FechaIngreso: u.fechaAsignacion || '-',
      Estado: u.estado
    }));
    if (!rows.length) {
      this.toastService.warning('Exportación', 'No hay colaboradores para exportar con los filtros actuales.');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(';'),
      ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `usuarios_easydry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.success('Exportación Exitosa', `${rows.length} colaboradores exportados a CSV.`);
  }

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = { ...this.filtrosGlobales, ...filtros };
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

    // 1. Filtro rápido por píldoras
    if (this.filtroPillRapida === 'lavadores') {
      resultados = resultados.filter(u => {
        const r = (u.rol || '').toLowerCase();
        return r.includes('lavador') || r.includes('pulidor') || r.includes('operador');
      });
    } else if (this.filtroPillRapida === 'supervisores') {
      resultados = resultados.filter(u => {
        const r = (u.rol || '').toLowerCase();
        return r.includes('supervisor') || r.includes('coordinador');
      });
    } else if (this.filtroPillRapida === 'bodega') {
      resultados = resultados.filter(u => {
        const r = (u.rol || '').toLowerCase();
        return r.includes('bodega') || r.includes('distribuidor') || r.includes('inventario');
      });
    } else if (this.filtroPillRapida === 'admins') {
      resultados = resultados.filter(u => {
        const r = (u.rol || '').toLowerCase();
        return r.includes('admin') || r.includes('gerente') || r.includes('auditor');
      });
    } else if (this.filtroPillRapida === 'inactivos') {
      resultados = resultados.filter(u => u.estado === 'Inactivo');
    }

    // 2. Filtro por Rol (dropdown)
    if (this.filtrosGlobales.rol && this.filtrosGlobales.rol !== 'Todos') {
      const targetRol = this.filtrosGlobales.rol.toLowerCase().trim();
      resultados = resultados.filter(u => (u.rol || '').toLowerCase().trim() === targetRol);
    }

    // 3. Filtro por Estado
    if (this.filtrosGlobales.estado && this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(u => u.estado === this.filtrosGlobales.estado);
    }

    // 4. Filtro por Región (directo o por la agencia asignada)
    if (this.filtrosGlobales.region && this.filtrosGlobales.region !== 'Todas') {
      const reg = this.filtrosGlobales.region.toLowerCase().trim();
      resultados = resultados.filter(u => {
        const uReg = (u.region || '').toLowerCase().trim();
        if (uReg === reg) return true;
        const suc = this.sucursalService.getSucursalPorNombre(u.agencia);
        const sucReg = (suc?.regionNombre || suc?.region?.nombre || '').toLowerCase().trim();
        return sucReg === reg;
      });
    }

    // 5. Filtro por Agencia / Sucursal
    if (this.filtrosGlobales.sucursal && this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(u => u.agencia === this.filtrosGlobales.sucursal);
    }

    // 6. Filtro por Cliente
    const targetClienteFiltro = (this.filtrosGlobales.cliente && this.filtrosGlobales.cliente !== 'Todas')
      ? this.filtrosGlobales.cliente
      : (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas' ? this.filtrosGlobales.marca : null);
    if (targetClienteFiltro) {
      resultados = resultados.filter(u => {
        const suc = this.sucursalService.getSucursalPorNombre(u.agencia);
        return (suc?.clienteNombre || suc?.marcaNombre) === targetClienteFiltro;
      });
    }

    // 7. Búsqueda por texto (Universal: nombre, apellido, correo, rol, agencia, ID)
    if (this.filtroTexto.trim()) {
      const b = this.filtroTexto.trim().toLowerCase();
      resultados = resultados.filter(u => {
        const nombreCompleto = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
        const idStr = `usr-00${u.id || ''}`.toLowerCase();
        const rawId = String(u.id || '').toLowerCase();
        return (
          nombreCompleto.includes(b) ||
          (u.nombre || '').toLowerCase().includes(b) ||
          (u.apellido || '').toLowerCase().includes(b) ||
          (u.email || '').toLowerCase().includes(b) ||
          (u.rol || '').toLowerCase().includes(b) ||
          (u.agencia || '').toLowerCase().includes(b) ||
          (u.region || '').toLowerCase().includes(b) ||
          idStr.includes(b) ||
          rawId.includes(b)
        );
      });
    }

    // 8. Ordenamiento dinámico
    resultados = [...resultados].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';
      switch (this.sortColumn) {
        case 'nombre':
          valA = `${a.nombre} ${a.apellido}`.toLowerCase();
          valB = `${b.nombre} ${b.apellido}`.toLowerCase();
          break;
        case 'rol':
          valA = (a.rol || '').toLowerCase();
          valB = (b.rol || '').toLowerCase();
          break;
        case 'agencia':
          valA = (a.agencia || '').toLowerCase();
          valB = (b.agencia || '').toLowerCase();
          break;
        case 'email':
          valA = (a.email || '').toLowerCase();
          valB = (b.email || '').toLowerCase();
          break;
        case 'fechaAsignacion':
          valA = (a.fechaAsignacion || '').toLowerCase();
          valB = (b.fechaAsignacion || '').toLowerCase();
          break;
        case 'estado':
          valA = (a.estado || '').toLowerCase();
          valB = (b.estado || '').toLowerCase();
          break;
      }
      const cmp = valA.localeCompare(valB, 'es', { numeric: true });
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });

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
    const defaultRol = this.rolesVisibles.find(r => r.codigo === 'APROBADOR') || this.rolesVisibles[0];
    const primerRol = defaultRol?.nombre || 'Aprobador';
    let agenciaInicial = '';
    if (this.esAdminOGlobal(primerRol) || this.esSupervisorRol(primerRol) || this.esGestorBodegaRol(primerRol) || this.esAsistenteBodegaRol(primerRol) || this.esRolRegional(primerRol)) {
      agenciaInicial = '';
    }
    this.usuarioForm = {
      nombre: '',
      apellido: '',
      rol: primerRol,
      roleId: defaultRol?.id,
      agencia: agenciaInicial,
      region: this.regionesDisponibles[0]?.nombre || '',
      bodegaId: '',
      estado: 'Activo',
      email: '',
      password: '',
      confirmPassword: '',
      cambiarPassword: true,
      modalidadPulidor: 'MOVIL',
      servicioIds: []
    };
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.modalUsuarioOpen = true;
  }

  editarUsuario(u: Usuario) {
    this.editandoUsuario = u;
    this.usuarioFormSubmitted = false;
    let agenciaActual = (u.agencia && u.agencia !== 'Sin asignar' && u.agencia !== 'EasyDry Corporativo' && !u.agencia.startsWith('Región') && !u.agencia.startsWith('Móvil') && !u.agencia.startsWith('Bodega Región'))
      ? u.agencia
      : (u.sucursal && u.sucursal !== 'Sin asignar' && u.sucursal !== 'EasyDry Corporativo' && !u.sucursal.startsWith('Región') && !u.sucursal.startsWith('Móvil') && !u.sucursal.startsWith('Bodega Región'))
        ? u.sucursal
        : '';

    if (this.esAdminOGlobal(u.rol) || this.esSupervisorRol(u.rol) || this.esGestorBodegaRol(u.rol) || this.esAsistenteBodegaRol(u.rol) || this.esRolRegional(u.rol)) {
      agenciaActual = '';
    }

    const regionActual = (u.region && u.region !== 'Sin asignar' && u.region !== 'Nacional')
      ? u.region
      : (this.regionesDisponibles[0]?.nombre || '');

    const rolMatch = this.roles.find(r =>
      (u.roleId && r.id === u.roleId) ||
      r.codigo === u.rolNombre ||
      r.codigo === u.rol ||
      r.nombre.toLowerCase() === u.rol?.toLowerCase() ||
      r.nombre.toLowerCase() === u.rolNombre?.toLowerCase()
    );

    const isPul = this.esOperadorEspecialesRol(u.rol) || (rolMatch && this.esOperadorEspecialesRol(rolMatch.nombre));
    const finalServiciosPulidor = isPul
      ? this.serviciosEspecialesCatalogo.map(s => Number(s.id))
      : (Array.isArray(u.servicioIds) ? u.servicioIds.map(Number).filter(n => !isNaN(n) && n > 0) : []);

    this.usuarioForm = {
      nombre: u.nombre,
      apellido: u.apellido,
      rol: rolMatch ? rolMatch.nombre : u.rol,
      roleId: rolMatch?.id || u.roleId,
      agencia: agenciaActual,
      region: regionActual,
      bodegaId: u.bodegaId ? String(u.bodegaId) : '',
      estado: u.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
      email: u.email,
      password: '',
      confirmPassword: '',
      cambiarPassword: false,
      modalidadPulidor: u.modalidadPulidor || (agenciaActual ? 'FIJO' : 'MOVIL'),
      servicioIds: finalServiciosPulidor
    };
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.modalUsuarioOpen = true;
  }

  esLiderOperadorRol(rol: string): boolean {
    const r = (rol || '').toUpperCase().trim();
    return r === 'LIDER' || r === 'LIDER_OPERADOR' || r === 'LIDER_AGENCIA'
      || r.includes('LÍDER OPERADOR') || r.includes('LIDER OPERADOR')
      || ((r.includes('LIDER') || r.includes('LÍDER')) && !r.includes('BODEGA'));
  }

  onPulidorAgenciaChange(agencia: string) {
    this.usuarioForm.servicioIds = this.serviciosEspecialesCatalogo.map(s => Number(s.id));
    if (agencia?.trim()) {
      this.usuarioForm.modalidadPulidor = 'FIJO';
    } else {
      this.usuarioForm.modalidadPulidor = 'MOVIL';
      if (!this.usuarioForm.region || this.usuarioForm.region === 'Nacional') {
        this.usuarioForm.region = this.regionesDisponibles[0]?.nombre || '';
      }
    }
  }

  servicioPulidorSeleccionado(id: number | string): boolean {
    const numId = Number(id);
    return (this.usuarioForm.servicioIds || []).some(x => Number(x) === numId);
  }

  toggleServicioPulidor(id: number | string): void {
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) return;
    const ids = (this.usuarioForm.servicioIds || []).map(Number);
    const idx = ids.indexOf(numId);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(numId);
    this.usuarioForm.servicioIds = Array.from(new Set(ids));
  }

  onBodegaAsistenteChange(bodegaId: string) {
    const bod = this.bodegasRegionales.find(b => String(b.id) === String(bodegaId));
    if (bod?.region) {
      this.usuarioForm.region = bod.region;
    }
    this.usuarioForm.agencia = bod?.nombre || '';
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
      this.onPulidorAgenciaChange(this.usuarioForm.agencia || '');
    } else if (this.esGestorBodegaRol(this.usuarioForm.rol)) {
      this.usuarioForm.agencia = '';
      this.usuarioForm.region = 'Nacional';
      this.usuarioForm.bodegaId = '';
    } else if (this.esAsistenteBodegaRol(this.usuarioForm.rol)) {
      this.usuarioForm.agencia = '';
      this.usuarioForm.bodegaId = this.usuarioForm.bodegaId || this.bodegasRegionales[0]?.id || '';
      this.onBodegaAsistenteChange(this.usuarioForm.bodegaId);
    }
  }

  setModalidadPulidor(modalidad: ModalidadPulidor) {
    this.usuarioForm.modalidadPulidor = modalidad;
    if (modalidad === 'MOVIL') {
      this.usuarioForm.agencia = '';
      if (!this.usuarioForm.region || this.usuarioForm.region === 'Nacional') {
        this.usuarioForm.region = this.regionesDisponibles[0]?.nombre || '';
      }
    }
  }

  private payloadModalidad(): { agencia: string; modalidadPulidor?: ModalidadPulidor } {
    if (this.esGestorBodegaRol(this.usuarioForm.rol)) {
      return { agencia: 'Nacional (Acceso Global)', modalidadPulidor: undefined };
    }
    if (this.esAsistenteBodegaRol(this.usuarioForm.rol)) {
      const bod = this.bodegasRegionales.find(b => String(b.id) === String(this.usuarioForm.bodegaId));
      return { agencia: bod?.nombre || `Bodega Regional ${this.usuarioForm.region || 'Regional'}`, modalidadPulidor: undefined };
    }
    if (!esRolOperadorEspeciales(this.usuarioForm.rol)) {
      return { agencia: this.usuarioForm.agencia?.trim() || 'Sin asignar', modalidadPulidor: undefined };
    }
    if (this.usuarioForm.agencia?.trim()) {
      return { agencia: this.usuarioForm.agencia.trim(), modalidadPulidor: 'FIJO' };
    }
    return { agencia: 'Sin asignar', modalidadPulidor: 'MOVIL' };
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

    if (esRolOperadorEspeciales(this.usuarioForm.rol) && this.usuarioForm.modalidadPulidor === 'FIJO' && !this.usuarioForm.agencia?.trim()) {
      this.toastService.warning('Agencia requerida', 'Un pulidor fijo debe quedar asignado a una agencia.');
      return;
    }

    if (esRolOperadorEspeciales(this.usuarioForm.rol) && !this.usuarioForm.agencia?.trim() && !this.usuarioForm.region?.trim()) {
      this.toastService.warning('Región requerida', 'Un pulidor móvil debe tener una región operativa asignada.');
      return;
    }

    if (esRolOperadorEspeciales(this.usuarioForm.rol)) {
      this.usuarioForm.servicioIds = this.serviciosEspecialesCatalogo.map(s => Number(s.id));
    }

    if (this.esLiderOperadorRol(this.usuarioForm.rol) && !this.usuarioForm.agencia?.trim()) {
      this.toastService.warning('Agencia requerida', 'El Líder Operador debe estar asignado a una agencia.');
      return;
    }

    if (this.esAsistenteBodegaRol(this.usuarioForm.rol) && !this.usuarioForm.bodegaId) {
      this.toastService.warning('Bodega requerida', 'El asistente de bodega debe estar asignado a una bodega regional.');
      return;
    }

    const modalidad = this.payloadModalidad();
    const isAsistente = this.esAsistenteBodegaRol(this.usuarioForm.rol);
    const isGestor = this.esGestorBodegaRol(this.usuarioForm.rol);
    const isPulidor = esRolOperadorEspeciales(this.usuarioForm.rol);
    const isPulidorMovil = isPulidor && modalidad.modalidadPulidor === 'MOVIL';

    let bodegaMatch: BodegaInventario | undefined = undefined;
    if (isAsistente) {
      bodegaMatch = this.bodegasRegionales.find(b => String(b.id) === String(this.usuarioForm.bodegaId));
    }

    const rolEncontrado = this.roles.find(r =>
      (this.usuarioForm.roleId && r.id === this.usuarioForm.roleId) ||
      r.id === this.usuarioForm.rol ||
      r.codigo.toLowerCase() === this.usuarioForm.rol.toLowerCase() ||
      r.nombre.toLowerCase() === this.usuarioForm.rol.toLowerCase() ||
      (isGestor && (r.codigo === 'COORD_BODEGA' || r.codigo === 'DISTRIBUIDOR')) ||
      (isAsistente && r.codigo === 'ASISTENTE_BODEGA')
    );

    const roleIdToSend = rolEncontrado?.id || this.usuarioForm.roleId;

    const isGlobalAdmin = this.esAdminOGlobal(this.usuarioForm.rol);
    const isSupervisor = this.esSupervisorRol(this.usuarioForm.rol);
    const isRegional = this.esRolRegional(this.usuarioForm.rol);

    if ((isSupervisor || isRegional) && !this.usuarioForm.region) {
      this.toastService.warning('Región requerida', 'Este perfil requiere tener una región operativa asignada.');
      return;
    }

    if (isAsistente && !this.usuarioForm.bodegaId) {
      this.toastService.warning('Bodega requerida', 'El asistente de bodega debe estar registrado a una bodega regional.');
      return;
    }

    let regionMatch: RegionOperativa | undefined = undefined;
    if ((isSupervisor || isAsistente || isRegional || isPulidorMovil) && this.usuarioForm.region) {
      regionMatch = this.regionesDisponibles.find(r =>
        r.nombre.toLowerCase() === this.usuarioForm.region?.toLowerCase() ||
        String(r.id) === this.usuarioForm.region
      );
    }
    if (isAsistente && bodegaMatch?.regionId) {
      regionMatch = this.regionesDisponibles.find(r => String(r.id) === String(bodegaMatch!.regionId)) || regionMatch;
    }

    if (this.editandoUsuario) {
      const nuevoEstado: 'Activo' | 'Inactivo' = this.usuarioForm.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
      const agenciaVal = modalidad.agencia === 'Sin asignar' ? '' : modalidad.agencia;
      const sucursalMatch = this.sucursales.find(s => s.nombre === agenciaVal || String(s.id) === agenciaVal);

      let finalAgencia = agenciaVal || 'Sin asignar';
      let finalAgenciaId: string | undefined = sucursalMatch ? String(sucursalMatch.id) : undefined;
      let finalRegionId: string | undefined = undefined;
      let finalRegion: string | undefined = undefined;

      if (isGlobalAdmin || isGestor) {
        finalAgencia = 'Nacional (Acceso Global)';
        finalAgenciaId = undefined;
        finalRegion = 'Nacional';
        finalRegionId = undefined;
      } else if (isSupervisor || isRegional) {
        finalRegion = regionMatch?.nombre || this.usuarioForm.region || '';
        finalRegionId = regionMatch?.id ? String(regionMatch.id) : this.editandoUsuario.regionId;
        finalAgencia = `Región ${finalRegion}`;
        finalAgenciaId = undefined;
      } else if (isAsistente) {
        finalRegion = bodegaMatch?.region || regionMatch?.nombre || this.usuarioForm.region || '';
        finalRegionId = bodegaMatch?.regionId
          ? String(bodegaMatch.regionId)
          : (regionMatch?.id ? String(regionMatch.id) : this.editandoUsuario.regionId);
        finalAgencia = bodegaMatch?.nombre || `Bodega Regional ${finalRegion}`;
        finalAgenciaId = undefined;
      } else if (isPulidorMovil) {
        finalRegion = regionMatch?.nombre || this.usuarioForm.region || '';
        finalRegionId = regionMatch?.id ? String(regionMatch.id) : this.editandoUsuario.regionId;
        finalAgencia = `Móvil · Región ${finalRegion}`;
        finalAgenciaId = undefined;
      } else {
        finalRegionId = this.editandoUsuario.regionId;
        finalRegion = this.editandoUsuario.region;
      }

      const actualizado: Usuario & { password?: string; roleId?: string; regionId?: string; region?: string; bodegaId?: string } = {
        ...this.editandoUsuario,
        nombre: this.usuarioForm.nombre.trim(),
        apellido: this.usuarioForm.apellido.trim(),
        rol: rolEncontrado?.nombre || this.usuarioForm.rol,
        agencia: finalAgencia,
        sucursal: finalAgencia,
        agenciaId: finalAgenciaId,
        regionId: finalRegionId,
        region: finalRegion,
        bodegaId: isAsistente ? (this.usuarioForm.bodegaId || undefined) : undefined,
        estado: nuevoEstado,
        email: this.usuarioForm.email.trim(),
        modalidadPulidor: modalidad.modalidadPulidor,
        servicioIds: isPulidor ? this.serviciosEspecialesCatalogo.map(s => Number(s.id)) : [],
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

      let finalAgencia = agenciaVal || 'Sin asignar';
      let finalAgenciaId: string | undefined = sucursalMatch ? String(sucursalMatch.id) : undefined;
      let finalRegionId: string | undefined = undefined;
      let finalRegion: string | undefined = undefined;

      if (isGlobalAdmin || isGestor) {
        finalAgencia = 'Nacional (Acceso Global)';
        finalAgenciaId = undefined;
        finalRegion = 'Nacional';
        finalRegionId = undefined;
      } else if (isSupervisor || isRegional) {
        finalRegion = regionMatch?.nombre || this.usuarioForm.region || '';
        finalRegionId = regionMatch?.id ? String(regionMatch.id) : undefined;
        finalAgencia = `Región ${finalRegion}`;
        finalAgenciaId = undefined;
      } else if (isAsistente) {
        finalRegion = bodegaMatch?.region || regionMatch?.nombre || this.usuarioForm.region || '';
        finalRegionId = bodegaMatch?.regionId
          ? String(bodegaMatch.regionId)
          : (regionMatch?.id ? String(regionMatch.id) : undefined);
        finalAgencia = bodegaMatch?.nombre || `Bodega Regional ${finalRegion}`;
        finalAgenciaId = undefined;
      } else if (isPulidorMovil) {
        finalRegion = regionMatch?.nombre || this.usuarioForm.region || '';
        finalRegionId = regionMatch?.id ? String(regionMatch.id) : undefined;
        finalAgencia = `Móvil · Región ${finalRegion}`;
        finalAgenciaId = undefined;
      }

      const nuevo: Omit<Usuario, 'id'> & { password?: string; roleId?: string; regionId?: string; region?: string; bodegaId?: string } = {
        nombre: this.usuarioForm.nombre.trim(),
        apellido: this.usuarioForm.apellido.trim(),
        rol: rolEncontrado?.nombre || this.usuarioForm.rol,
        agencia: finalAgencia,
        sucursal: finalAgencia,
        agenciaId: finalAgenciaId,
        regionId: finalRegionId,
        region: finalRegion,
        bodegaId: isAsistente ? (this.usuarioForm.bodegaId || undefined) : undefined,
        estado: this.usuarioForm.estado,
        email: this.usuarioForm.email.trim(),
        fechaAsignacion: new Date().toISOString().split('T')[0],
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        modalidadPulidor: modalidad.modalidadPulidor,
        servicioIds: isPulidor ? this.serviciosEspecialesCatalogo.map(s => Number(s.id)) : [],
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

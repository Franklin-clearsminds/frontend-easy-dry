import { resolverRangoFechas } from '../../core/utils/fecha-rango';
import { celdaCsv } from '../../core/utils/csv';
import { AvatarSrcDirective } from '../../shared/directives/avatar-src.directive';
import { PasswordRequisitosComponent } from '../../shared/components/password-requisitos/password-requisitos.component';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, finalize, firstValueFrom, forkJoin, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConsultaUsuarios, ResumenUsuarios, UsuarioService } from '../../core/services/usuario.service';
import { AMBITOS_ROL, CapacidadCatalogo, RolService, codigoRolDesdeNombre, codigoRolValido } from '../../core/services/rol.service';
import { AuthService } from '../../core/services/auth.service';
import { Usuario, ModuloSistema, RolPersonalizado, Sucursal, ModalidadPulidor, BodegaInventario, RegionOperativa, CatalogoServicio } from '../../core/models';
import { PaginaCatalogo, ROLE_LABELS } from '../../core/models/roles.model';
import { SucursalService } from '../../core/services/sucursal.service';
import { InventarioService } from '../../core/services/inventario.service';
import { RegionService } from '../../core/services/region.service';
import { CatalogoServiciosService } from '../../core/services/catalogo-servicios.service';
import { esRolOperadorEspeciales } from '../../core/utils/modalidad-especiales.util';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { RolPaginasEditorComponent } from './rol-paginas-editor/rol-paginas-editor.component';
import { DataTableComponent, DataTableCellDirective, TableColumn } from '../../shared/components/data-table/data-table.component';
import { TablaServidor } from '../../core/utils/tabla-servidor';
import { ConsultaTabla } from '../../core/models/paginacion.model';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_TABLA } from '../../core/config/paginacion';
import { ToastService } from '../../shared/services/toast.service';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { isRealProfilePhoto } from '../../core/config/env';
import { NotaAmbito, construirNotaAmbito } from './ambito-rol';
import { motivoPasswordDebil, passwordCumplePolitica } from '../../core/utils/password-politica';

interface AmbitoInfo {
  codigo: string;
  corto: string;
  detalle: string;
}

/** Qué significa cada ámbito, en palabras de quien administra (de más amplio a más estrecho). */
const AMBITOS_INFO: AmbitoInfo[] = [
  { codigo: 'GLOBAL', corto: 'Todo el país', detalle: 'Ve y actúa sobre los datos de toda la red: todas las regiones y agencias.' },
  { codigo: 'REGION', corto: 'Su región', detalle: 'Solo los datos de la región asignada al usuario (todas las agencias de esa región).' },
  { codigo: 'AGENCIA', corto: 'Su agencia', detalle: 'Solo los datos de la agencia asignada al usuario.' },
  { codigo: 'PROPIO', corto: 'Solo lo asignado a él', detalle: 'Solo lo que se le asignó personalmente: sus equipos, los envíos dirigidos a él, sus órdenes. En los listados por agencia (stock, bodegas) no verá datos.' },
];

const COLUMNAS_USUARIOS: TableColumn[] = [
  { key: 'nombre', label: 'Usuario', sortable: true, type: 'custom' },
  { key: 'rol', label: 'Rol Asignado', sortable: true, type: 'custom' },
  { key: 'agencia', label: 'Agencia o Región', sortable: true, type: 'custom' },
  { key: 'email', label: 'Correo Electrónico', sortable: true, type: 'custom' },
  { key: 'telefono', label: 'Teléfono', type: 'custom' },
  { key: 'creado', label: 'Fecha Ingreso', sortable: true, defaultSort: 'desc', type: 'custom' },
  { key: 'estado', label: 'Estado', sortable: true, type: 'custom' },
  { key: 'acciones', label: 'Acción', align: 'right', type: 'custom', sticky: true },
];

const COLUMNAS_ROLES: TableColumn[] = [
  { key: 'namerol', label: 'Rol / Perfil', sortable: true, defaultSort: 'asc' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'ambito', label: 'Ámbito' },
  { key: 'permisos', label: 'Permisos' },
  { key: 'usuarios', label: 'Usuarios', sortable: true },
  { key: 'estado', label: 'Estado', sortable: true, defaultSort: 'asc' },
  { key: 'fecha', label: 'Fecha Creación', sortable: true, defaultSort: 'desc' },
  { key: 'acciones', label: 'Acciones', align: 'right', sticky: true },
];

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [AvatarSrcDirective, CommonModule, FormsModule, LucideAngularModule, ModalComponent, DataTableComponent, DataTableCellDirective, FilterBarComponent, RolPaginasEditorComponent, PasswordRequisitosComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Top Banner Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2 border border-purple-200">
            <i-lucide aria-hidden="true" name="shield" class="w-3.5 h-3.5"></i-lucide>
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
          <i-lucide aria-hidden="true" name="users" class="w-4 h-4"></i-lucide>
          <span>Directorio de Usuarios ({{ totalDirectorio }})</span>
        </button>

        @if (puedeVerRoles) {
          <button
            type="button"
            (click)="seleccionarTab('roles')"
            class="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2"
            [ngClass]="activeTab === 'roles' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" name="shield" class="w-4 h-4"></i-lucide>
            <span>Roles y Permisos ({{ rolesVisibles.length }})</span>
          </button>
        }
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
            [showFechas]="true"
            [modoFechas]="'rango'"
            [showBusqueda]="true"
            placeholderBusqueda="Buscar por nombre, correo, rol, agencia o región..."
            [listaEstados]="['Todos', 'Activo', 'Inactivo']"
            (filterChange)="aplicarNuevosFiltros($event)">
          </app-filter-bar>
          @if (busquedaCorta) {
            <p class="-mt-3 px-2 text-[11px] font-semibold text-slate-500" role="status">Escribe al menos {{ minBusqueda }} letras para buscar.</p>
          }

          <!-- Píldoras Rápidas de Segmentación en 1 Clic -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 select-none scrollbar-none">
            <button
              type="button"
              (click)="setQuickPill('todos')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'todos' ? 'bg-easydry-blue text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <span>Todos</span>
              <span class="px-1.5 py-0.5 rounded-full text-xs" [ngClass]="filtroPillRapida === 'todos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ resumenU?.total ?? 0 }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('lavadores')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'lavadores' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide aria-hidden="true" name="sparkles" class="w-3.5 h-3.5"></i-lucide>
              <span>Lavadores</span>
              <span class="px-1.5 py-0.5 rounded-full text-xs" [ngClass]="filtroPillRapida === 'lavadores' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ resumenU?.lavadores ?? 0 }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('supervisores')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'supervisores' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide aria-hidden="true" name="user-check" class="w-3.5 h-3.5"></i-lucide>
              <span>Supervisores</span>
              <span class="px-1.5 py-0.5 rounded-full text-xs" [ngClass]="filtroPillRapida === 'supervisores' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ resumenU?.supervisores ?? 0 }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('bodega')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'bodega' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide aria-hidden="true" name="warehouse" class="w-3.5 h-3.5"></i-lucide>
              <span>Bodega e Inventario</span>
              <span class="px-1.5 py-0.5 rounded-full text-xs" [ngClass]="filtroPillRapida === 'bodega' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ resumenU?.bodega ?? 0 }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('admins')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'admins' ? 'bg-slate-800 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide aria-hidden="true" name="shield" class="w-3.5 h-3.5"></i-lucide>
              <span>Administrativos</span>
              <span class="px-1.5 py-0.5 rounded-full text-xs" [ngClass]="filtroPillRapida === 'admins' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ resumenU?.admins ?? 0 }}
              </span>
            </button>
            <button
              type="button"
              (click)="setQuickPill('inactivos')"
              class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              [ngClass]="filtroPillRapida === 'inactivos' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide aria-hidden="true" name="user-x" class="w-3.5 h-3.5"></i-lucide>
              <span>Inactivos</span>
              <span class="px-1.5 py-0.5 rounded-full text-xs" [ngClass]="filtroPillRapida === 'inactivos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'">
                {{ resumenU?.inactivos ?? 0 }}
              </span>
            </button>
          </div>

          <!-- Etiquetas (Chips) de Filtros Activos -->
          @if (hayFiltrosActivos) {
            <div class="flex items-center gap-2 flex-wrap text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 animate-fade-in">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <i-lucide aria-hidden="true" name="filter" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Filtros Activos:
              </span>

              @if (filtroPillRapida !== 'todos') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-easydry-blue/10 text-easydry-blue font-bold border border-easydry-blue/20">
                  Segmento: {{ filtroPillRapida | titlecase }}
                  <button type="button" aria-label="Quitar filtro" (click)="removerFiltro('pill')" class="hover:text-easydry-blue-dark cursor-pointer"><i-lucide aria-hidden="true" name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.rol && filtrosGlobales.rol !== 'Todos') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold border border-purple-200">
                  Rol: {{ filtrosGlobales.rol }}
                  <button type="button" aria-label="Quitar filtro" (click)="removerFiltro('rol')" class="hover:text-purple-950 cursor-pointer"><i-lucide aria-hidden="true" name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.region && filtrosGlobales.region !== 'Todas') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold border border-blue-200">
                  Región: {{ filtrosGlobales.region }}
                  <button type="button" aria-label="Quitar filtro" (click)="removerFiltro('region')" class="hover:text-blue-950 cursor-pointer"><i-lucide aria-hidden="true" name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.sucursal && filtrosGlobales.sucursal !== 'Todas') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-100 text-cyan-800 font-bold border border-cyan-200">
                  Agencia: {{ filtrosGlobales.sucursal }}
                  <button type="button" aria-label="Quitar filtro" (click)="removerFiltro('sucursal')" class="hover:text-cyan-950 cursor-pointer"><i-lucide aria-hidden="true" name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.cliente && filtrosGlobales.cliente !== 'Todas') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  Cliente: {{ filtrosGlobales.cliente }}
                  <button type="button" aria-label="Quitar filtro" (click)="removerFiltro('cliente')" class="hover:text-amber-950 cursor-pointer"><i-lucide aria-hidden="true" name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtrosGlobales.estado && filtrosGlobales.estado !== 'Todos') {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 font-bold border border-slate-300">
                  Estado: {{ filtrosGlobales.estado }}
                  <button type="button" aria-label="Quitar filtro" (click)="removerFiltro('estado')" class="hover:text-black cursor-pointer"><i-lucide aria-hidden="true" name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }
              @if (filtroTexto.trim()) {
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  "{{ filtroTexto }}"
                  <button type="button" aria-label="Quitar filtro" (click)="removerFiltro('busqueda')" class="hover:text-emerald-950 cursor-pointer"><i-lucide aria-hidden="true" name="x" class="w-3 h-3"></i-lucide></button>
                </span>
              }

              <button
                type="button"
                (click)="limpiarTodosFiltros()"
                class="ml-auto text-xs font-extrabold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1">
                <i-lucide aria-hidden="true" name="trash-2" class="w-3 h-3"></i-lucide>
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
                  {{ totalU }} Usuarios Encontrados
                </span>
                <button
                  type="button"
                  (click)="exportarUsuariosCSV()"
                  title="Exportar listado a CSV / Excel"
                  class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200">
                  <i-lucide aria-hidden="true" name="download" class="w-4 h-4 text-slate-600"></i-lucide>
                  <span>Exportar</span>
                </button>
                @if (puedeCrearUsuarios) {
                  <button
                    type="button"
                    (click)="abrirModalCrearUsuario()"
                    class="btn btn-cta">
                    <i-lucide aria-hidden="true" name="user-plus" class="w-4 h-4"></i-lucide>
                    <span>{{ puedeCrearUsuario ? 'Registrar Usuario' : 'Registrar Backup' }}</span>
                  </button>
                }
              </div>
            </div>

            <app-data-table
              [serverSide]="true"
              [embebida]="true"
              [showToolbar]="false"
              [columns]="columnasUsuarios"
              [data]="filasU"
              [total]="totalU"
              [page]="paginaU"
              [pageSize]="pageSizeU"
              [sortField]="sortFieldU"
              [sortOrder]="sortOrderU"
              [loading]="cargandoU"
              [error]="errorU"
              [rowClass]="claseFilaUsuario"
              maxHeight="none"
              caption="Directorio de colaboradores"
              [emptyTitle]="tituloVacioU"
              emptyHint="No hay usuarios que coincidan con los criterios y filtros seleccionados."
              (queryChange)="onTablaUsuariosCambio($event)"
              (reintentar)="cargarPaginaU()">

              <ng-template appCell="nombre" let-u>
                <div class="flex items-center gap-3">
                  @if (isRealProfilePhoto(u.avatar)) {
                    <img loading="lazy" decoding="async" [appAvatar]="u.avatar" [appAvatarIniciales]="(u.nombre || '?').charAt(0) + (u.apellido || '').charAt(0)" alt="Foto de {{ u.nombre }} {{ u.apellido }}" class="w-9 h-9 rounded-full object-cover border-2" [ngClass]="u.estado === 'Activo' ? 'border-easydry-blue/20' : 'border-slate-300 grayscale'">
                  } @else {
                    <div class="w-9 h-9 rounded-full bg-slate-100 border-2 flex items-center justify-center text-xs font-extrabold text-slate-500" [ngClass]="u.estado === 'Activo' ? 'border-easydry-blue/20' : 'border-slate-300 grayscale'">
                      {{ (u.nombre || '?').charAt(0) }}{{ (u.apellido || '').charAt(0) }}
                    </div>
                  }
                  <div>
                    <div class="flex items-center gap-1.5">
                      <p class="font-bold text-slate-900 text-xs">{{ u.nombre }} {{ u.apellido }}</p>
                      @if (u.estado === 'Inactivo') {
                        <span class="badge badge-danger">Inactivo</span>
                      }
                    </div>
                    <p class="text-xs text-slate-500 font-mono">ID: USR-00{{ u.id }}</p>
                  </div>
                </div>
              </ng-template>

              <ng-template appCell="rol" let-u>
                <span
                  class="px-2.5 py-1 rounded-lg text-xs font-bold border"
                  [ngClass]="getRolBadgeClass(u.rol)">
                  {{ u.rol }}
                </span>
              </ng-template>

              <ng-template appCell="agencia" let-u>
                <div class="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  @if (ambitoDeUsuario(u) === 'GLOBAL') {
                    <span class="inline-flex items-center gap-1.5 text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 w-fit">
                      <i-lucide aria-hidden="true" name="globe" class="w-3.5 h-3.5 text-slate-500"></i-lucide>
                      <span>Todo el país (sin agencia)</span>
                    </span>
                  } @else if (ambitoDeUsuario(u) === 'REGION' && !esAsistenteBodegaRol(u.rol)) {
                    <span class="inline-flex items-center gap-1.5 text-blue-800 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 w-fit">
                      <i-lucide aria-hidden="true" name="map-pin" class="w-3.5 h-3.5 text-blue-600"></i-lucide>
                      <span>{{ u.region && u.region !== 'Sin asignar' ? 'Región ' + u.region : 'Sin región asignada' }}</span>
                    </span>
                  } @else if (esAsistenteBodegaRol(u.rol)) {
                    <span class="inline-flex items-center gap-1.5 text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 w-fit">
                      <i-lucide aria-hidden="true" name="map-pin" class="w-3.5 h-3.5 text-amber-600"></i-lucide>
                      <span>{{ u.agencia || ('Bodega Región ' + (u.region || 'Regional')) }}</span>
                    </span>
                  } @else if (u.agencia && u.agencia !== 'Sin asignar' && !u.agencia.includes('Sin') && !u.agencia.startsWith('Región') && !u.agencia.startsWith('Móvil')) {
                    <div class="flex flex-col">
                      <span class="font-bold text-slate-900">{{ u.agencia }}</span>
                      @if (u.region && u.region !== 'Sin asignar' && u.region !== 'Nacional') {
                        <span class="text-xs text-slate-500 font-normal">Región {{ u.region }}</span>
                      }
                    </div>
                  } @else if (u.region && u.region !== 'Sin asignar' && u.region !== 'Nacional') {
                    <span class="inline-flex items-center gap-1.5 text-blue-800 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 w-fit">
                      <i-lucide aria-hidden="true" name="map-pin" class="w-3.5 h-3.5 text-blue-600"></i-lucide>
                      <span>Región {{ u.region }}</span>
                    </span>
                  } @else {
                    <span class="text-slate-500">{{ u.agencia || 'Sin asignar' }}</span>
                  }
                  @if (esBackupRol(u.rolNombre || u.rol)) {
                    <span class="w-fit px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-violet-50 text-violet-800 border border-violet-200">
                      {{ u.agenciaId ? 'Backup asignado' : 'Backup disponible' }}
                    </span>
                  }
                  @if (esOperadorEspecialesRol(u.rol)) {
                    <span
                      class="w-fit px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide"
                      [ngClass]="u.modalidadPulidor === 'FIJO'
                        ? 'bg-easydry-blue/10 text-easydry-blue border border-easydry-blue/20'
                        : 'bg-cyan-50 text-cyan-800 border border-cyan-200'">
                      {{ u.modalidadPulidor === 'FIJO' ? 'Pulidor fijo' : 'Pulidor móvil' }}
                    </span>
                  }
                </div>
              </ng-template>

              <ng-template appCell="email" let-u>
                <span class="text-xs text-slate-600 font-mono break-all">{{ u.email }}</span>
              </ng-template>

              <ng-template appCell="telefono" let-u>
                <span class="text-xs text-slate-700 font-mono whitespace-nowrap">{{ u.telefono || '—' }}</span>
              </ng-template>

              <ng-template appCell="creado" let-u>
                <span class="text-xs font-mono text-slate-500">{{ u.fechaAsignacion }}</span>
              </ng-template>

              <ng-template appCell="estado" let-u>
                <button
                  type="button"
                  (click)="toggleEstadoUsuario(u)"
                  [disabled]="!puedeEstadoUsuario"
                  [title]="!puedeEstadoUsuario ? 'Tu rol no puede cambiar el estado de usuarios' : (u.estado === 'Activo' ? 'Click para marcar como Inactivo (Bloqueará login y asignación)' : 'Click para activar usuario')"
                  [attr.aria-label]="u.estado === 'Activo' ? 'Usuario activo. Marcar como inactivo' : 'Usuario inactivo. Activar usuario'"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer select-none disabled:cursor-default"
                  [ngClass]="u.estado === 'Activo'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'">
                  <span class="w-2 h-2 rounded-full" [ngClass]="u.estado === 'Activo' ? 'bg-emerald-500' : 'bg-slate-500'"></span>
                  <span>{{ u.estado }}</span>
                </button>
              </ng-template>

              <ng-template appCell="acciones" let-u>
                <div class="flex items-center justify-end gap-1">
                  @if (puedeEstadoUsuario) {
                    <button
                      type="button"
                      (click)="toggleEstadoUsuario(u)"
                      [title]="u.estado === 'Activo' ? 'Desactivar usuario' : 'Activar usuario'"
                      class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer"
                      [ngClass]="u.estado === 'Activo' ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'" [attr.aria-label]="u.estado === 'Activo' ? 'Desactivar usuario' : 'Activar usuario'">
                      <i-lucide aria-hidden="true" [name]="u.estado === 'Activo' ? 'user-x' : 'user-check'" class="w-4 h-4"></i-lucide>
                    </button>
                  }
                  @if (puedeGestionarFilaUsuario(u)) {
                    <button
                      type="button"
                      (click)="editarUsuario(u)"
                      title="Editar Usuario"
                      class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-easydry-blue rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" aria-label="Editar Usuario">
                      <i-lucide aria-hidden="true" name="edit-3" class="w-4 h-4"></i-lucide>
                    </button>
                  }
                  @if (puedeSoloPassword(u)) {
                    <button
                      type="button"
                      (click)="abrirModalPassword(u)"
                      title="Cambiar contraseña"
                      class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-easydry-blue rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" aria-label="Cambiar contraseña">
                      <i-lucide aria-hidden="true" name="key" class="w-4 h-4"></i-lucide>
                    </button>
                  }
                </div>
              </ng-template>
            </app-data-table>
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
                <i-lucide aria-hidden="true" name="shield-check" class="w-6 h-6"></i-lucide>
              </div>
              <div>
                <p class="text-2xl font-extrabold text-slate-900 font-outfit">{{ roles.length }}</p>
                <p class="text-xs text-slate-500 font-medium">Roles Configurados</p>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center flex-shrink-0">
                <i-lucide aria-hidden="true" name="layout-grid" class="w-6 h-6"></i-lucide>
              </div>
              <div>
                <p class="text-2xl font-extrabold text-slate-900 font-outfit">{{ modulosDisponibles.length }}</p>
                <p class="text-xs text-slate-500 font-medium">Módulos del Sistema</p>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-easydry-green/15 text-easydry-green-text flex items-center justify-center flex-shrink-0">
                <i-lucide aria-hidden="true" name="check-circle" class="w-6 h-6"></i-lucide>
              </div>
              <div>
                <p class="text-2xl font-extrabold text-slate-900">{{ rolesActivosCount }}</p>
                <p class="text-xs text-slate-500 font-medium">Roles Activos en Base de Datos</p>
              </div>
            </div>
          </div>

          @if (!puedeGestionarRoles) {
            <div class="flex items-start gap-3 p-4 rounded-2xl border border-blue-200 bg-blue-50 text-xs text-blue-900" role="note">
              <i-lucide aria-hidden="true" name="eye" class="w-4 h-4 mt-0.5 shrink-0 text-blue-600"></i-lucide>
              <p>Puedes consultar los roles y sus permisos, pero no modificarlos. Solo el Super Administrador crea, edita o elimina roles.</p>
            </div>
          }

          <!-- Tabla de roles activos en la plataforma -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-slate-900 text-base font-outfit">Roles Registrados en la Base de Datos</h3>
                <p class="text-xs text-slate-500">Cada rol define qué acciones puede hacer y sobre qué datos (ámbito). El servidor exige estos permisos en cada operación.</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                  {{ roles.length }} roles en BD
                </span>
                @if (puedeCrearRol) {
                  <button
                    type="button"
                    (click)="abrirModalCrearRol()"
                    class="btn btn-cta">
                    <i-lucide aria-hidden="true" name="shield-plus" class="w-4 h-4"></i-lucide>
                    <span>Crear Nuevo Rol</span>
                  </button>
                }
              </div>
            </div>

            <app-data-table
              [serverSide]="true"
              [embebida]="true"
              [columns]="columnasRoles"
              [data]="rolesTabla.filas"
              [total]="rolesTabla.total"
              [page]="rolesTabla.pagina"
              [pageSize]="rolesTabla.pageSize"
              [sortField]="rolesTabla.sortField"
              [sortOrder]="rolesTabla.sortOrder"
              [loading]="rolesTabla.cargando"
              [error]="rolesTabla.error"
              maxHeight="none"
              caption="Roles y permisos"
              searchPlaceholder="Buscar rol por nombre o descripción..."
              emptyTitle="No hay roles que coincidan."
              emptyHint="Cambie la búsqueda o cree un rol nuevo."
              (queryChange)="rolesTabla.alCambiar($event)"
              (reintentar)="rolesTabla.cargar(true)">

              <ng-template appCell="namerol" let-rol>
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                    [style.background-color]="rol.color || '#7C3AED'">
                    <i-lucide aria-hidden="true" name="shield" class="w-4 h-4"></i-lucide>
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-extrabold text-slate-900 text-xs">{{ rol.nombre }}</span>
                      @if (rol.esSistema) {
                        <span class="badge" title="Rol oficial del sistema: no se elimina ni cambia de nombre">Oficial</span>
                      }
                    </div>
                    <p class="text-[11px] font-mono text-slate-500">{{ rol.codigo }}</p>
                  </div>
                </div>
              </ng-template>

              <ng-template appCell="descripcion" let-rol>
                <p class="line-clamp-2 text-xs text-slate-600 max-w-xs" [title]="rol.descripcion">
                  {{ rol.descripcion || 'Sin descripción registrada' }}
                </p>
              </ng-template>

              <ng-template appCell="ambito" let-rol>
                <span class="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg whitespace-nowrap" [title]="ambitoInfo(rol.ambito).detalle">
                  {{ ambitoInfo(rol.ambito).corto }}
                </span>
              </ng-template>

              <ng-template appCell="permisos" let-rol>
                <div class="flex flex-col gap-1">
                  @if (getCapacidadesCount(rol) === 0) {
                    <span class="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg w-fit" title="Un rol sin permisos no puede usar el sistema">
                      Sin permisos
                    </span>
                  } @else {
                    <div class="flex items-center gap-2">
                      <div class="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                        <div class="bg-purple-600 h-full rounded-full" [style.width.%]="getCapacidadesProgress(rol)"></div>
                      </div>
                      <span class="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                        {{ getCapacidadesCount(rol) }} permisos
                      </span>
                    </div>
                  }
                  <span class="text-[11px] text-slate-500">{{ getModulosCount(rol) }} módulos de navegación</span>
                </div>
              </ng-template>

              <ng-template appCell="usuarios" let-rol>
                <span class="text-xs font-bold text-slate-700">{{ rol.usuariosCount || 0 }}</span>
              </ng-template>

              <ng-template appCell="estado" let-rol>
                <button
                  type="button"
                  (click)="toggleEstadoRol(rol)"
                  [disabled]="!puedeEditarRol"
                  [title]="!puedeEditarRol ? 'Solo el Super Administrador cambia el estado de un rol' : (rol.estado === 'Activo' ? 'Click para desactivar rol' : 'Click para activar rol')"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all select-none disabled:cursor-default"
                  [ngClass]="rol.estado === 'Activo'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 cursor-pointer'">
                  <span class="w-2 h-2 rounded-full" [ngClass]="rol.estado === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                  <span>{{ rol.estado || 'Activo' }}</span>
                </button>
              </ng-template>

              <ng-template appCell="fecha" let-rol>
                <span class="text-xs font-mono text-slate-500 whitespace-nowrap">{{ rol.fechaCreacion }}</span>
              </ng-template>

              <ng-template appCell="acciones" let-rol>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    (click)="abrirModalEditarRol(rol)"
                    [title]="puedeEditarRol ? 'Editar rol y permisos' : 'Ver permisos del rol'"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer border border-purple-200">
                    <i-lucide aria-hidden="true" [name]="puedeEditarRol ? 'sliders' : 'eye'" class="w-3.5 h-3.5"></i-lucide>
                    <span>{{ puedeEditarRol ? 'Editar' : 'Ver' }}</span>
                  </button>
                  @if (puedeEliminarRol && !rol.esSistema) {
                    <button
                      type="button"
                      (click)="abrirModalEliminarRol(rol)"
                      title="Eliminar Rol"
                      class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200" aria-label="Eliminar Rol">
                      <i-lucide aria-hidden="true" name="trash-2" class="w-4 h-4"></i-lucide>
                    </button>
                  }
                </div>
              </ng-template>
            </app-data-table>
          </div>

        </div>
      }

      <!-- ======================================================== -->
      <!-- MODAL: CREAR / EDITAR USUARIO                           -->
      <!-- ======================================================== -->
      <app-modal 
        [isOpen]="modalUsuarioOpen" size="lg" 
        [title]="editandoUsuario ? 'Modificar Usuario y Rol' : 'Registrar Nuevo Usuario'" 
        icon="users"
        (close)="modalUsuarioOpen = false">
        
        <form (ngSubmit)="guardarUsuario()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="usuarios-f1" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nombre <span class="text-rose-500">*</span>
              </label>
              <input id="usuarios-f1"
                type="text"
                [(ngModel)]="usuarioForm.nombre"
                name="nombre"
                placeholder="ej. Stalyn"
                class="w-full p-2.5 border rounded-xl text-sm transition-all outline-none"
                [ngClass]="nombreInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : 'border-slate-200 focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20'"
                required>
              @if (nombreInvalido) {
                <p class="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                  <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                  El nombre del colaborador es obligatorio.
                </p>
              }
            </div>
            <div>
              <label for="usuarios-f2" class="block text-xs font-bold text-slate-700 uppercase mb-1">Apellido</label>
              <input id="usuarios-f2"
                type="text"
                [(ngModel)]="usuarioForm.apellido"
                name="apellido"
                placeholder="ej. Moposita"
                class="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20 outline-none">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="usuarios-f3" class="block text-xs font-bold text-slate-700 uppercase mb-1">Rol Asignado (Base de Datos)</label>
              @if (rolesAsignables.length) {
                <select id="usuarios-f3" [(ngModel)]="usuarioForm.roleId" name="roleId" (ngModelChange)="onRoleIdChange($event)" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white border-slate-200 focus:border-easydry-blue">
                  @for (r of rolesAsignables; track r.id) {
                    <option [value]="r.id">{{ r.nombre }} ({{ ambitoInfo(r.ambito).corto }})</option>
                  }
                </select>
              } @else {
                <p id="usuarios-f3" class="p-2.5 border rounded-xl text-sm font-semibold bg-slate-50 border-slate-200 text-slate-600">{{ usuarioForm.rol || 'Sin rol' }}</p>
                <p class="text-xs text-amber-700 mt-1">Para elegir o cambiar el rol necesitas el permiso «Ver roles».</p>
              }
            </div>
            <div>
              <label for="usuarios-f4" class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
              <select id="usuarios-f4" [(ngModel)]="usuarioForm.estado" name="estado" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          @if (esOperadorEspecialesRol(usuarioForm.rol)) {
            <div class="p-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 space-y-3">
              <div>
                <p class="text-xs font-extrabold text-cyan-900 uppercase tracking-wide">Asignación del pulidor</p>
                <p class="text-xs text-cyan-800 mt-0.5">Con agencia = fijo (solo su sede). Sin agencia = móvil (exige región).</p>
              </div>
              <div>
                <label for="usuarios-f5" class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia (opcional)</label>
                <select id="usuarios-f5"
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
                  <label for="usuarios-f6" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Región operativa <span class="text-cyan-600">*</span>
                  </label>
                  <select id="usuarios-f6" [(ngModel)]="usuarioForm.region" name="regionPulidorMovil" class="w-full p-2.5 border rounded-xl text-sm font-semibold border-cyan-300 focus:border-cyan-500 bg-white" required>
                    <option value="">Selecciona una región...</option>
                    @for (r of regionesDisponibles; track r.id) {
                      <option [value]="r.nombre">{{ r.nombre }}</option>
                    }
                  </select>
                  <p class="text-xs text-cyan-800 mt-1">El pulidor móvil opera solo en agencias de su región.</p>
                </div>
                <div class="p-3 rounded-xl border border-cyan-300/80 bg-white/95 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700 flex-shrink-0">
                    <i-lucide aria-hidden="true" name="sparkles" class="w-4 h-4"></i-lucide>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-cyan-900">Catálogo Completo Asignado Automáticamente</p>
                    <p class="text-xs text-cyan-800 leading-snug">
                      Este pulidor móvil realiza todos los <strong>{{ serviciosEspecialesCatalogo.length }} servicios especiales</strong> de la empresa. Su kit incluirá todos los insumos correspondientes.
                    </p>
                  </div>
                </div>
              } @else {
                <div class="p-3 rounded-xl border border-cyan-300/80 bg-white/95 flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700 flex-shrink-0">
                    <i-lucide aria-hidden="true" name="sparkles" class="w-4 h-4"></i-lucide>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-cyan-900">Pulidor Fijo · Catálogo Completo Habilitado</p>
                    <p class="text-xs text-cyan-800 leading-snug">
                      Asignado a <strong>{{ usuarioForm.agencia }}</strong> con los <strong>{{ serviciosEspecialesCatalogo.length }} servicios especiales</strong> y su kit de insumos.
                    </p>
                  </div>
                </div>
              }
            </div>
          } @else if (esBackupRol(usuarioForm.rol)) {
            <div class="p-4 rounded-2xl border border-violet-200 bg-violet-50/70 space-y-3">
              <div class="flex items-center gap-2 text-violet-900">
                <i-lucide aria-hidden="true" name="replace" class="w-4 h-4 text-violet-600 shrink-0"></i-lucide>
                <span class="text-xs font-extrabold uppercase tracking-wide">Backup regional · Cobertura temporal</span>
              </div>
              <p class="text-xs text-violet-800 leading-relaxed">
                El Backup pertenece a una región. El ámbito seleccionado en Roles y Permisos determina si cubre una sola agencia o todas las agencias de esa región.
              </p>
              <div>
                <label for="usuarios-backup-region" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Región <span class="text-violet-600">*</span>
                </label>
                <select id="usuarios-backup-region" [(ngModel)]="usuarioForm.region" name="regionBackup"
                  (ngModelChange)="onBackupRegionChange($event)"
                  class="w-full p-2.5 border rounded-xl text-sm font-semibold border-violet-300 focus:border-violet-500 bg-white" required>
                  <option value="">Selecciona una región...</option>
                  @for (r of regionesDisponibles; track r.id) {
                    <option [value]="r.nombre">{{ r.nombre }}</option>
                  }
                </select>
              </div>
              @if (ambitoForm === 'AGENCIA') {
                <div>
                <label for="usuarios-backup-agencia" class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia asignada (opcional)</label>
                <select id="usuarios-backup-agencia" [(ngModel)]="usuarioForm.agencia" name="agenciaBackup"
                  class="w-full p-2.5 border rounded-xl text-sm font-semibold border-violet-300 bg-white"
                  [disabled]="!usuarioForm.region">
                  <option value="">Sin agencia · Backup disponible</option>
                  @for (s of agenciasBackupDisponibles; track s.id) {
                    <option [value]="s.nombre">{{ s.nombre }} ({{ s.ciudad }})</option>
                  }
                </select>
                <p class="mt-1 text-xs text-violet-700">Sin agencia asignada, el Backup no tendrá alcance operativo hasta asignarlo a una sede.</p>
                </div>
              } @else {
                <p class="rounded-xl border border-violet-200 bg-white p-3 text-xs text-violet-900">
                  Ámbito regional: el Backup verá y operará en todas las agencias de la región seleccionada; no se asigna a una agencia específica.
                </p>
              }
            </div>
          } @else if (ambitoForm === 'GLOBAL') {
            <div class="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 space-y-2">
              <div class="flex items-center gap-2 text-blue-900">
                <i-lucide aria-hidden="true" name="globe" class="w-4 h-4 text-blue-600 shrink-0"></i-lucide>
                <span class="text-xs font-extrabold uppercase tracking-wide">Alcance global · Red nacional</span>
              </div>
              <p class="text-xs text-blue-800 leading-relaxed">
                El ámbito de este rol es <b>todo el país</b>: el usuario <b>no se vincula a ninguna agencia ni región</b>.
              </p>
            </div>
          } @else if (esAsistenteBodegaRol(usuarioForm.rol)) {
            <div class="space-y-3">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-700 uppercase">
                    Bodega regional <span class="text-amber-500">*</span>
                  </label>
                  <span class="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Obligatoria
                  </span>
                </div>
                <select [(ngModel)]="usuarioForm.bodegaId" name="bodegaAsistente" (ngModelChange)="onBodegaAsistenteChange($event)" class="w-full p-2.5 border rounded-xl text-sm font-semibold border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200" required>
                  <option value="">Seleccione una bodega regional...</option>
                  @for (b of bodegasRegionales; track b.id) {
                    <option [value]="b.id">{{ b.nombre }}{{ b.region ? ' · ' + b.region : '' }}</option>
                  }
                </select>
                <p class="text-xs text-slate-500 mt-1">
                  El Asistente despacha solo a agencias de la región de su bodega asignada.
                </p>
              </div>
            </div>
          } @else if (ambitoForm === 'REGION') {
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">
                  Asignar Región <span class="text-blue-500">*</span>
                </label>
                <span class="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Ámbito regional
                </span>
              </div>
              <select [(ngModel)]="usuarioForm.region" name="regionRol" class="w-full p-2.5 border rounded-xl text-sm font-semibold border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white" required>
                <option value="">Selecciona una región...</option>
                @for (r of regionesDisponibles; track r.id) {
                  <option [value]="r.nombre">{{ r.nombre }}</option>
                }
              </select>
              <p class="text-xs text-slate-500 mt-1">
                Este perfil opera sobre todas las agencias y bahías de su región. Sin región no verá ningún dato.
              </p>
            </div>
          } @else {
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">
                  Agencia {{ agenciaObligatoria ? '' : '(Opcional)' }}
                  @if (agenciaObligatoria) {
                    <span class="text-rose-500">*</span>
                  }
                </label>
                <span class="text-xs text-slate-500 font-medium">
                  {{ agenciaObligatoria ? 'Obligatoria · ámbito de agencia' : 'No obligatorio' }}
                </span>
              </div>
              <select [(ngModel)]="usuarioForm.agencia" name="agencia" class="w-full p-2.5 border rounded-xl text-sm font-semibold" [required]="agenciaObligatoria">
                <option value="">{{ agenciaObligatoria ? 'Selecciona una agencia...' : 'Sin agencia asignada (Opcional)' }}</option>
                @for (s of sucursales; track s.id) {
                  <option [value]="s.nombre">{{ s.nombre }}</option>
                }
              </select>
              <p class="text-xs text-slate-500 mt-1">
                {{ agenciaObligatoria
                  ? 'Este rol trabaja sobre los datos de su agencia: sin agencia asignada no verá ningún dato.'
                  : 'Este rol trabaja sobre lo que se le asigna personalmente; la agencia es opcional.' }}
              </p>
            </div>
          }

          <div>
            <label for="usuarios-f7" class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Correo Electrónico <span class="text-rose-500">*</span>
            </label>
            <input id="usuarios-f7"
              type="email"
              [(ngModel)]="usuarioForm.email"
              name="email"
              placeholder="ej. stalyn.moposita@easydry.com"
              class="w-full p-2.5 border rounded-xl text-sm transition-all outline-none"
              [ngClass]="emailInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : 'border-slate-200 focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20'"
              required>
            @if (emailInvalido) {
              <p class="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                {{ !usuarioForm.email.trim() ? 'El correo electrónico es obligatorio.' : 'Ingrese un correo electrónico válido (ej. usuario@easydry.com).' }}
              </p>
            }
          </div>

          <!-- Teléfono (celular de 10 dígitos; obligatorio para los líderes) -->
          <div>
            <label for="usuarios-f7t" class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Teléfono @if (requiereTelefono) { <span class="text-rose-500">*</span> }
            </label>
            <input id="usuarios-f7t"
              type="tel"
              inputmode="numeric"
              maxlength="16"
              [(ngModel)]="usuarioForm.telefono"
              name="telefono"
              placeholder="ej. 0991234567"
              class="w-full p-2.5 border rounded-xl text-sm font-mono transition-all outline-none"
              [ngClass]="telefonoInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : 'border-slate-200 focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20'">
            @if (telefonoInvalido) {
              <p class="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                {{ !usuarioForm.telefono.trim() ? 'El teléfono es obligatorio para los líderes.' : 'Ingrese un celular de 10 dígitos que empiece con 09 (ej. 0991234567).' }}
              </p>
            }
          </div>

          <!-- Credenciales de acceso JWT -->
          @if (!editandoUsuario) {
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-easydry-blue/10 text-easydry-blue flex items-center justify-center">
                  <i-lucide aria-hidden="true" name="lock" class="w-4 h-4"></i-lucide>
                </div>
                <div>
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Credenciales de Acceso</h4>
                  <p class="text-xs text-slate-500">Ingresa la contraseña para que el usuario inicie sesión directamente.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <!-- Contraseña -->
                <div>
                  <label for="usuarios-f8" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contraseña <span class="text-rose-500">*</span>
                  </label>
                  <div class="relative">
                    <input id="usuarios-f8"
                      [type]="showPassword ? 'text' : 'password'"
                      [(ngModel)]="usuarioForm.password"
                      name="password"
                      placeholder="Mínimo 10 caracteres"
                      class="w-full p-2.5 pr-10 border rounded-xl text-sm font-medium transition-all outline-none"
                      [ngClass]="passwordInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : (usuarioForm.password && !passwordValida(usuarioForm.password) ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 bg-white focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20')"
                      required
                      minlength="6">
                    <button
                      type="button"
                      [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" (click)="showPassword = !showPassword"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-slate-600 transition-colors cursor-pointer">
                      <i-lucide aria-hidden="true" [name]="showPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                    </button>
                  </div>
                  <app-password-requisitos [password]="usuarioForm.password" [email]="usuarioForm.email"></app-password-requisitos>
                </div>

                <!-- Verificación de Contraseña -->
                <div>
                  <label for="usuarios-f9" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Verificación de Contraseña <span class="text-rose-500">*</span>
                  </label>
                  <div class="relative">
                    <input id="usuarios-f9"
                      [type]="showConfirmPassword ? 'text' : 'password'"
                      [(ngModel)]="usuarioForm.confirmPassword"
                      name="confirmPassword"
                      placeholder="Repetir contraseña"
                      class="w-full p-2.5 pr-10 border rounded-xl text-sm font-medium transition-all outline-none"
                      [ngClass]="confirmPasswordInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : (passwordsMatch ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-white focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20')"
                      required>
                    <button
                      type="button"
                      [attr.aria-label]="showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'" (click)="showConfirmPassword = !showConfirmPassword"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-slate-600 transition-colors cursor-pointer">
                      <i-lucide aria-hidden="true" [name]="showConfirmPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                    </button>
                  </div>
                  @if (confirmPasswordInvalido) {
                    <p class="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                      <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                      La verificación no coincide con la contraseña.
                    </p>
                  }
                </div>
              </div>

              <!-- Indicador de validación de contraseñas -->
              <div class="pt-0.5 text-xs">
                @if (passwordsMismatch) {
                  <span class="text-rose-600 font-semibold flex items-center gap-1.5">
                    <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    Las contraseñas no coinciden. Verifique el texto ingresado.
                  </span>
                } @else if (passwordsMatch) {
                  <span class="text-emerald-600 font-semibold flex items-center gap-1.5">
                    <i-lucide aria-hidden="true" name="check-circle-2" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    Contraseña verificada correctamente.
                  </span>
                } @else if (usuarioForm.password && !passwordValida(usuarioForm.password, usuarioForm.email)) {
                  <span class="text-rose-600 font-semibold flex items-center gap-1.5">
                    <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    Cumple todos los requisitos de arriba antes de continuar.
                  </span>
                } @else {
                  <span class="text-slate-500 flex items-center gap-1.5">
                    <i-lucide aria-hidden="true" name="info" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                    Se almacenará de forma cifrada en el sistema.
                  </span>
                }
              </div>
            </div>
          } @else {
            <!-- Edición de usuario existente: opción de cambiar contraseña -->
            @if (puedeReiniciarPasswordEditando) {
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
                    <label for="usuarios-f10" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nueva Contraseña <span class="text-rose-500">*</span>
                    </label>
                    <div class="relative">
                      <input id="usuarios-f10"
                        [type]="showPassword ? 'text' : 'password'"
                        [(ngModel)]="usuarioForm.password"
                        name="password"
                        placeholder="Mínimo 10 caracteres"
                        class="w-full p-2.5 pr-10 border rounded-xl text-sm font-medium transition-all outline-none"
                        [ngClass]="passwordInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : 'border-slate-200 bg-white focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20'"
                        minlength="6">
                      <button
                        type="button"
                        [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" (click)="showPassword = !showPassword"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-slate-600 transition-colors cursor-pointer">
                        <i-lucide aria-hidden="true" [name]="showPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                      </button>
                    </div>
                    <app-password-requisitos [password]="usuarioForm.password" [email]="usuarioForm.email"></app-password-requisitos>
                  </div>

                  <div>
                    <label for="usuarios-f11" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Verificación <span class="text-rose-500">*</span>
                    </label>
                    <div class="relative">
                      <input id="usuarios-f11"
                        [type]="showConfirmPassword ? 'text' : 'password'"
                        [(ngModel)]="usuarioForm.confirmPassword"
                        name="confirmPassword"
                        placeholder="Repetir nueva contraseña"
                        class="w-full p-2.5 pr-10 border rounded-xl text-sm font-medium transition-all outline-none"
                        [ngClass]="confirmPasswordInvalido ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-200' : (passwordsMatch ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-white focus:border-easydry-blue focus:ring-2 focus:ring-easydry-blue/20')">
                      <button
                        type="button"
                        [attr.aria-label]="showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'" (click)="showConfirmPassword = !showConfirmPassword"
                        class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-slate-600 transition-colors cursor-pointer">
                        <i-lucide aria-hidden="true" [name]="showConfirmPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                      </button>
                    </div>
                    @if (confirmPasswordInvalido) {
                      <p class="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                        <i-lucide aria-hidden="true" name="alert-circle" class="w-3.5 h-3.5 shrink-0"></i-lucide>
                        La confirmación no coincide con la nueva contraseña.
                      </p>
                    }
                  </div>
                </div>
              }
            </div>
            } @else {
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-800 flex items-center gap-2">
              <i-lucide aria-hidden="true" name="shield" class="w-3.5 h-3.5 shrink-0"></i-lucide>
              {{ motivoSinReinicioPassword }}
            </div>
            }
          }
        </form>

        <div modal-footer>
          <button (click)="modalUsuarioOpen = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button type="button" (click)="guardarUsuario()" [disabled]="guardandoUsuario" [attr.aria-busy]="guardandoUsuario"
                  class="btn w-full sm:w-auto" [class.btn-cta]="!editandoUsuario" [class.btn-primary]="editandoUsuario">
            <i-lucide aria-hidden="true" [name]="guardandoUsuario ? 'loader' : (editandoUsuario ? 'save' : 'user-plus')" class="w-4 h-4"
                      [class.animate-spin]="guardandoUsuario"></i-lucide>
            {{ guardandoUsuario ? 'Guardando…' : (editandoUsuario ? 'Actualizar Usuario' : 'Registrar Usuario') }}
          </button>
        </div>
      </app-modal>

      <!-- ======================================================== -->
      <!-- MODAL: CONFIGURAR ROL Y MATRIZ DE PERMISOS MODULARES    -->
      <!-- ======================================================== -->
      <app-modal
        [isOpen]="modalRolOpen" size="xl" sizeClass="max-w-[90rem]"
        [title]="editandoRol ? (soloLecturaRol ? 'Permisos del rol: ' : 'Configurar rol: ') + rolForm.nombre : 'Crear Nuevo Rol de Usuario'"
        icon="shield"
        (close)="modalRolOpen = false">

        <div class="space-y-6">

          @if (soloLecturaRol) {
            <div class="flex items-start gap-3 p-3.5 rounded-2xl border border-blue-200 bg-blue-50 text-xs text-blue-900" role="note">
              <i-lucide aria-hidden="true" name="eye" class="w-4 h-4 mt-0.5 shrink-0 text-blue-600"></i-lucide>
              <p>Vista de solo lectura: tu rol puede consultar los roles pero no modificarlos.</p>
            </div>
          }

          <!-- Datos principales -->
          <div class="space-y-4">
            <div>
              <label for="usuarios-rol-nombre" class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Rol</label>
              <input id="usuarios-rol-nombre"
                type="text"
                [(ngModel)]="rolForm.nombre"
                name="rolNombre"
                maxlength="40"
                placeholder="Ej: Auditor Operativo, Jefe de Patio"
                [disabled]="!!editandoRol || soloLecturaRol"
                class="w-full p-2.5 border rounded-xl text-sm font-bold text-slate-900 disabled:bg-slate-50 disabled:text-slate-500">
              @if (editandoRol) {
                <p class="text-xs text-slate-500 mt-1">
                  @if (rolForm.esSistema) {
                    Es un rol oficial: el sistema lo usa internamente por su nombre, por eso no se puede cambiar (sí puedes ajustar su descripción, ámbito y permisos).
                  } @else {
                    El nombre de un rol ya creado no se puede cambiar. Si necesitas otro nombre, crea un rol nuevo.
                  }
                  Código: <span class="font-mono font-bold">{{ rolForm.codigo }}</span>
                </p>
              } @else {
                <p class="text-xs text-slate-500 mt-1">
                  Se guardará con el código
                  <span class="font-mono font-bold" [ngClass]="codigoRolPreview && !codigoRolPreviewValido ? 'text-rose-600' : 'text-slate-700'">{{ codigoRolPreview || '—' }}</span>.
                  Debe tener de 3 a 40 caracteres: letras, números y espacios, empezando por letra.
                </p>
              }
            </div>

            <div>
              <label for="usuarios-rol-desc" class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del Rol</label>
              <textarea id="usuarios-rol-desc"
                [(ngModel)]="rolForm.descripcion"
                name="rolDescripcion"
                rows="2"
                [disabled]="soloLecturaRol"
                placeholder="Describe las responsabilidades y alcance de este perfil..."
                class="w-full p-2.5 border rounded-xl text-xs disabled:bg-slate-50 disabled:text-slate-500"></textarea>
            </div>

            <!-- Alcance de los datos -->
            <fieldset>
              <legend class="block text-xs font-bold text-slate-700 uppercase mb-1">Alcance de los datos</legend>
              <p class="text-xs text-slate-500 mb-2">Elige sobre qué datos actúa este rol: todo el país, una región o solo una agencia. Los permisos de abajo dicen <b>qué puede hacer</b>; el alcance dice <b>sobre qué datos</b>.</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (a of ambitosParaRol; track a.codigo) {
                  <label class="flex items-start gap-3 p-3 rounded-xl border min-h-11 transition-colors"
                    [ngClass]="[
                      rolForm.ambito === a.codigo ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-300' : 'border-slate-200 bg-white',
                      ambitoBloqueado(a.codigo)
                        ? (rolForm.ambito === a.codigo ? 'cursor-not-allowed' : 'opacity-60 cursor-not-allowed')
                        : 'cursor-pointer hover:bg-slate-50'
                    ]">
                    <input type="radio" name="rolAmbito" [value]="a.codigo" [(ngModel)]="rolForm.ambito"
                      [disabled]="ambitoBloqueado(a.codigo)"
                      class="mt-0.5 w-4 h-4 text-purple-600 focus:ring-purple-500 shrink-0">
                    <span class="min-w-0">
                      <span class="block text-xs font-extrabold text-slate-900">{{ a.corto }}</span>
                      <span class="block text-[11px] text-slate-500 leading-snug">{{ a.detalle }}</span>
                    </span>
                  </label>
                }
              </div>
              <p class="mt-1.5 text-xs"
                [ngClass]="notaAmbitoRol.tono === 'backup' ? 'text-violet-800' : (notaAmbitoRol.tono === 'fijo' ? 'text-slate-700' : 'text-slate-500')">
                {{ notaAmbitoRol.texto }}
              </p>
              <p class="text-xs text-slate-500 mt-1.5">Si a un usuario le falta el dato de su alcance (su agencia o su región), no verá ningún dato.</p>
            </fieldset>
          </div>

          <!-- Aviso: rol sin páginas -->
          @if (rolForm.paginas.length === 0) {
            <div class="flex items-start gap-3 p-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-xs text-amber-900" role="alert">
              <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4 mt-0.5 shrink-0 text-amber-600"></i-lucide>
              <p><b>Este rol no tiene ninguna página activa.</b> Un rol sin páginas no puede usar el sistema: quien lo tenga asignado verá la pantalla de «sin acceso».</p>
            </div>
          }

          <!-- Pantallas que verá el rol: salen de las páginas activas -->
          <div class="border-t border-slate-200 pt-4">
            <div class="mb-3">
              <h4 class="font-extrabold text-slate-900 text-sm font-outfit">Menú de este rol</h4>
              <p class="text-xs text-slate-500">Las páginas activas aparecen en el menú. Las que existen también en el celular se marcan «App».</p>
            </div>
            @if (pantallasRolForm.length) {
              <div class="flex flex-wrap gap-2">
                @for (mod of pantallasRolForm; track mod.codigo) {
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50/40 text-xs font-bold text-slate-800">
                    <i-lucide aria-hidden="true" [name]="mod.icono" class="w-3.5 h-3.5 text-purple-600"></i-lucide>
                    {{ mod.nombre }}
                    <span class="ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide"
                      [ngClass]="mod.disponibleEnApp ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'">
                      {{ mod.disponibleEnApp ? 'App' : 'Solo web' }}
                    </span>
                  </span>
                }
              </div>
            } @else {
              <p class="text-xs text-slate-500" aria-live="polite">Ninguna: activa al menos una página para que el rol vea alguna pantalla.</p>
            }
          </div>

          <!-- Páginas, sub-páginas y acciones -->
          <div class="border-t border-slate-200 pt-4">
            @if (cargandoCatalogo) {
              <p class="text-xs text-slate-500 py-4" role="status">Cargando el catálogo de páginas…</p>
            } @else if (errorCatalogo) {
              <p class="text-xs text-rose-600 font-semibold py-4">{{ errorCatalogo }}</p>
            } @else {
              <app-rol-paginas-editor
                [paginas]="catalogoPaginas"
                [seleccion]="rolForm.paginas"
                (seleccionChange)="rolForm.paginas = $event"
                [soloLectura]="soloLecturaRol"
                [puedeOtorgar]="puedeOtorgarFn">
              </app-rol-paginas-editor>
            }
          </div>

        </div>

        <div modal-footer>
          <button type="button" (click)="modalRolOpen = false" class="btn btn-secondary w-full sm:w-auto">{{ soloLecturaRol ? 'Cerrar' : 'Cancelar' }}</button>
          @if (!soloLecturaRol) {
            <button type="button" (click)="guardarRol()" [disabled]="guardandoRol" [attr.aria-busy]="guardandoRol" class="btn w-full sm:w-auto" [class.btn-cta]="!editandoRol" [class.btn-primary]="editandoRol">
              <i-lucide aria-hidden="true" [name]="guardandoRol ? 'loader' : 'check'" class="w-4 h-4" [class.animate-spin]="guardandoRol"></i-lucide>
              <span>{{ guardandoRol ? 'Guardando…' : (editandoRol ? 'Guardar Cambios de Rol' : 'Crear Rol') }}</span>
            </button>
          }
        </div>
      </app-modal>

      <!-- ======================================================== -->
      <!-- MODAL: CAMBIAR CONTRASEÑA (solo el permiso de contraseñas) -->
      <!-- ======================================================== -->
      <app-modal [isOpen]="modalPasswordOpen" size="sm" title="Cambiar contraseña" icon="key" (close)="cerrarModalPassword()">
        <div class="space-y-4 py-2">
          @if (usuarioPassword) {
            <p class="text-xs text-slate-600">
              Nueva contraseña de <strong class="text-slate-900">{{ usuarioPassword.nombre }} {{ usuarioPassword.apellido }}</strong>
              <span class="font-mono text-slate-500">({{ usuarioPassword.email }})</span>. Las sesiones abiertas del usuario se cerrarán.
            </p>
          }
          <div>
            <label for="usuarios-pw-nueva" class="block text-xs font-bold text-slate-700 uppercase mb-1">Nueva contraseña <span class="text-rose-500">*</span></label>
            <input id="usuarios-pw-nueva" type="password" autocomplete="new-password" [(ngModel)]="passwordNueva" name="passwordNueva" class="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-easydry-blue/30"
              [ngClass]="passwordNueva && motivoPasswordNueva ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 bg-white'" placeholder="Mínimo 10 caracteres" />
            <app-password-requisitos [password]="passwordNueva" [email]="usuarioPassword?.email"></app-password-requisitos>
          </div>
          <div>
            <label for="usuarios-pw-confirmar" class="block text-xs font-bold text-slate-700 uppercase mb-1">Confirmar contraseña <span class="text-rose-500">*</span></label>
            <input id="usuarios-pw-confirmar" type="password" autocomplete="new-password" [(ngModel)]="passwordConfirmar" name="passwordConfirmar" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-easydry-blue/30" placeholder="Repite la contraseña" />
            @if (passwordConfirmar && passwordConfirmar.trim() !== passwordNueva.trim()) { <p class="text-xs text-rose-600 font-semibold mt-1">Las contraseñas no coinciden.</p> }
          </div>
        </div>
        <div modal-footer class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button type="button" (click)="cerrarModalPassword()" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
          <button type="button" (click)="guardarPassword()" [disabled]="guardandoPassword || !passwordLista" class="btn btn-primary w-full sm:w-auto">
            <i-lucide aria-hidden="true" name="key" class="w-4 h-4"></i-lucide>
            <span>{{ guardandoPassword ? 'Guardando…' : 'Guardar contraseña' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- ======================================================== -->
      <!-- MODAL: CONFIRMAR ELIMINACIÓN DE ROL                      -->
      <!-- ======================================================== -->
      <app-modal
        [isOpen]="modalEliminarRolOpen" size="sm"
        title="Confirmar Eliminación de Rol"
        icon="alert-triangle"
        (close)="modalEliminarRolOpen = false">
        
        <div class="space-y-4 py-2">
          <div class="flex items-center gap-3.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
            <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <i-lucide aria-hidden="true" name="shield-alert" class="w-5 h-5"></i-lucide>
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
                <span class="font-bold text-purple-700">{{ rolAEliminar.capacidades?.length || 0 }} permisos · {{ rolAEliminar.modulos.length }} módulos</span>
              </div>
            </div>
          }
        </div>

        <div modal-footer class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            (click)="modalEliminarRolOpen = false"
            class="btn btn-secondary w-full sm:w-auto">
            Cancelar
          </button>
          <button
            type="button"
            (click)="confirmarEliminarRol()"
            class="btn btn-danger w-full sm:w-auto">
            <i-lucide aria-hidden="true" name="trash-2" class="w-4 h-4"></i-lucide>
            <span>Eliminar Rol</span>
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class UsuariosComponent implements OnInit, OnDestroy {
  readonly isRealProfilePhoto = isRealProfilePhoto;
  activeTab: 'usuarios' | 'roles' = 'usuarios';

  usuarios: Usuario[] = [];
  roles: RolPersonalizado[] = [];
  sucursales: Sucursal[] = [];
  modulosDisponibles: ModuloSistema[] = [];

  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', cliente: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', rol: 'Todos', fecha: 'Hoy' };
  filtroTexto = '';
  filtroPillRapida: 'todos' | 'lavadores' | 'supervisores' | 'bodega' | 'admins' | 'inactivos' = 'todos';

  // ── Paginación, orden, búsqueda y filtros en el SERVIDOR (directorio de usuarios) ──
  readonly minBusqueda = BUSQUEDA_MIN_CARACTERES;
  /** Sin 'usuarios.gestionar' la tabla no lleva la columna de acciones (se ajusta al iniciar). */
  columnasUsuarios: TableColumn[] = COLUMNAS_USUARIOS;
  filasU: Usuario[] = [];
  totalU = 0;
  paginaU = 1;
  pageSizeU = PAGE_SIZE_TABLA;
  /** Por defecto lo más reciente primero (el servidor aplica el mismo orden si no llega ninguno). */
  sortFieldU: string | null = 'creado';
  sortOrderU: 'asc' | 'desc' = 'desc';
  cargandoU = false;
  errorU: string | null = null;
  resumenU: ResumenUsuarios | null = null;
  /** Total de usuarios del directorio sin filtros (para el título de la pestaña). */
  totalDirectorio = 0;
  /** true cuando el usuario escribió 1 letra (se pide un mínimo de 2 antes de consultar). */
  busquedaCorta = false;
  private busquedaAplicada = '';
  private readonly busqueda$ = new Subject<string>();
  private suscripcionBusqueda?: Subscription;
  private subU?: Subscription;

  readonly claseFilaUsuario = (u: Usuario): string => (u.estado === 'Inactivo' ? 'bg-slate-50/60 text-slate-500' : '');

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
    telefono: string;
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
    telefono: '',
    password: '',
    confirmPassword: '',
    cambiarPassword: false,
    modalidadPulidor: 'MOVIL',
    servicioIds: []
  };

  showPassword = false;
  showConfirmPassword = false;

  usuarioFormSubmitted = false;
  /** true mientras se envía el formulario de usuario: bloquea el botón y evita dobles envíos. */
  guardandoUsuario = false;

  get nombreInvalido(): boolean {
    return this.usuarioFormSubmitted && !this.usuarioForm.nombre?.trim();
  }

  /** El teléfono es obligatorio para los líderes (el servidor lo exige igual). */
  get requiereTelefono(): boolean {
    const rol = this.roles.find((r) => r.id === this.usuarioForm.roleId || r.nombre === this.usuarioForm.rol);
    return ['LIDER', 'BACKUP'].includes(String(rol?.codigo || '').toUpperCase());
  }

  get telefonoInvalido(): boolean {
    if (!this.usuarioFormSubmitted && !this.usuarioForm.telefono?.trim()) return false;
    const valor = String(this.usuarioForm.telefono || '').trim();
    if (!valor) return this.usuarioFormSubmitted && this.requiereTelefono;
    const digitos = valor.replace(/[\s\-().]/g, '').replace(/^\+593/, '0').replace(/^593(?=9\d{8}$)/, '0');
    return !/^09\d{8}$/.test(digitos);
  }

  get emailInvalido(): boolean {
    if (!this.usuarioFormSubmitted) return false;
    const email = this.usuarioForm.email?.trim();
    if (!email) return true;
    return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  passwordValida(p: string | null | undefined, email?: string | null): boolean {
    return passwordCumplePolitica(p, email ?? this.usuarioForm?.email);
  }

  get passwordInvalido(): boolean {
    if (!this.usuarioFormSubmitted) return false;
    if (this.editandoUsuario && !this.usuarioForm.cambiarPassword) return false;
    const pass = this.usuarioForm.password?.trim();
    return !pass || !passwordCumplePolitica(pass, this.usuarioForm.email);
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
    return !!p && passwordCumplePolitica(p, this.usuarioForm.email) && p === c;
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
    ambito: string;
    /** Códigos del catálogo de páginas activos (páginas, sub-páginas y acciones). */
    paginas: string[];
    esSistema: boolean;
  } = {
    nombre: '',
    descripcion: '',
    ambito: 'AGENCIA',
    paginas: [],
    esSistema: false,
  };

  // Catálogo de permisos de acción y ámbitos (editor de roles)
  readonly ambitosLista = AMBITOS_INFO;
  get esRolBackupEditado(): boolean {
    return (this.rolForm.codigo || '').toUpperCase() === 'BACKUP';
  }

  get ambitosParaRol(): AmbitoInfo[] {
    return this.esRolBackupEditado
      ? this.ambitosLista.filter(a => a.codigo === 'AGENCIA' || a.codigo === 'REGION')
      : this.ambitosLista;
  }

  /**
   * Rol oficial distinto de BACKUP: el servidor no deja cambiar su alcance (roles.service.ts),
   * así que la vista tampoco lo ofrece.
   */
  get esRolAmbitoFijo(): boolean {
    return !!this.editandoRol && this.rolForm.esSistema && !this.esRolBackupEditado;
  }

  get puedeEditarAmbitoRol(): boolean {
    if (this.soloLecturaRol) return false;
    if (this.esRolAmbitoFijo) return false;
    return !this.esRolBackupEditado || this.authService.isSuperAdmin();
  }

  /** Una opción de alcance que no se puede elegir (se atenúa y se desactiva). */
  ambitoBloqueado(codigo: string): boolean {
    return !this.puedeEditarAmbitoRol || (!this.puedeOtorgarAmbito(codigo) && codigo !== this.rolForm.ambito);
  }

  /** Explicación del alcance de este rol: qué significa y si se puede cambiar. */
  get notaAmbitoRol(): NotaAmbito {
    return construirNotaAmbito({
      codigoRol: this.rolForm.codigo,
      nombreRol: this.rolForm.nombre,
      ambito: this.rolForm.ambito,
      ambitoCorto: this.ambitoInfo(this.rolForm.ambito).corto,
      esSistema: this.rolForm.esSistema,
      editando: !!this.editandoRol,
      soloLectura: this.soloLecturaRol,
      esSuperAdmin: this.authService.isSuperAdmin(),
    });
  }

  catalogoPaginas: PaginaCatalogo[] = [];
  /** El actor solo puede dar páginas, sub-páginas y acciones que su propio rol tiene. */
  readonly puedeOtorgarFn = (codigo: string): boolean => this.authService.puede(codigo);
  catalogoCapacidades: CapacidadCatalogo[] = [];
  cargandoCatalogo = false;
  errorCatalogo: string | null = null;
  guardandoRol = false;

  modalPasswordOpen = false;
  usuarioPassword: Usuario | null = null;
  passwordNueva = '';
  passwordConfirmar = '';
  guardandoPassword = false;

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

  esOperadorEspecialesRol = esRolOperadorEspeciales;

  esBackupRol(rol?: string): boolean {
    return (rol || '').toUpperCase().trim() === 'BACKUP';
  }

  get agenciasBackupDisponibles(): Sucursal[] {
    const region = this.regionesDisponibles.find(r =>
      r.nombre.toLowerCase() === (this.usuarioForm.region || '').toLowerCase() ||
      String(r.id) === String(this.usuarioForm.region || ''),
    );
    if (!region) return [];
    return this.sucursales.filter(s => {
      const idRegionAgencia = s.regionId || s.region?.id;
      return idRegionAgencia
        ? String(idRegionAgencia) === String(region.id)
        : (s.regionNombre || s.region?.nombre || '').toLowerCase() === region.nombre.toLowerCase();
    });
  }

  onBackupRegionChange(region: string): void {
    const regionValida = this.regionesDisponibles.some(r =>
      r.nombre.toLowerCase() === region.toLowerCase() || String(r.id) === String(region),
    );
    if (!regionValida || !this.agenciasBackupDisponibles.some(a => a.nombre === this.usuarioForm.agencia)) {
      this.usuarioForm.agencia = '';
    }
  }

  /** Regla de rol que el backend define por rol: el asistente de bodega se asigna a una bodega regional. */
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

  /** Rol (de la lista cargada) al que corresponde el usuario: por id, por código o por nombre. */
  private rolDeUsuario(u: { roleId?: string; rolNombre?: string; rol?: string }): RolPersonalizado | undefined {
    const codigo = (u.rolNombre || '').toLowerCase();
    const nombre = (u.rol || '').toLowerCase();
    return this.roles.find(r =>
      (u.roleId && r.id === u.roleId) ||
      (codigo && r.codigo.toLowerCase() === codigo) ||
      (nombre && (r.nombre.toLowerCase() === nombre || r.codigo.toLowerCase() === nombre))
    );
  }

  /** Ámbito (GLOBAL, REGION, AGENCIA o PROPIO) del rol elegido en el formulario. Sin dato: AGENCIA. */
  get ambitoForm(): string {
    const rol = this.rolDeUsuario({ roleId: this.usuarioForm.roleId, rol: this.usuarioForm.rol });
    return rol?.ambito || 'AGENCIA';
  }

  /** Un rol de ámbito agencia sin agencia no vería ningún dato: la agencia es obligatoria. */
  get agenciaObligatoria(): boolean {
    return this.ambitoForm === 'AGENCIA' && !this.esBackupRol(this.usuarioForm.rol);
  }

  /** Roles que se pueden asignar: los activos (más el que el usuario ya tiene al editar). */
  get rolesAsignables(): RolPersonalizado[] {
    const actual = this.usuarioForm.roleId;
    const disponibles = this.rolesVisibles.filter(r => r.estado === 'Activo' || r.estado === 1 || r.id === actual);
    return this.puedeGestionarUsuarios
      ? disponibles
      : disponibles.filter(r => r.codigo.toUpperCase() === 'BACKUP');
  }

  onRoleIdChange(roleId: string) {
    const rolEncontrado = this.rolesVisibles.find(r => r.id === roleId);
    if (rolEncontrado) {
      this.usuarioForm.rol = rolEncontrado.nombre;
      this.usuarioForm.roleId = rolEncontrado.id;
      this.onRolUsuarioChange();
    }
  }

  /** Ámbito del rol de un usuario del directorio (para mostrar su alcance). */
  ambitoDeUsuario(u: Usuario): string {
    return this.rolDeUsuario(u)?.ambito || '';
  }

  seleccionarTab(tab: 'usuarios' | 'roles') {
    // Sin 'roles.ver' no existe la pestaña de roles: el servidor rechazaría todas sus llamadas.
    if (tab === 'roles' && !this.puedeVerRoles) return;
    this.activeTab = tab;
    if (tab === 'roles') {
      this.rolesTabla.reiniciar();
      this.rolService.getRoles().subscribe(list => {
        this.roles = list.map(rol => ({
          ...rol,
          modulos: Array.isArray(rol.modulos) ? rol.modulos : [],
        }));
      });
      if (!this.catalogoCapacidades.length && !this.cargandoCatalogo) this.cargarCatalogoPermisos();
    } else {
      this.refrescarUsuarios(true);
    }
    if (tab === 'roles') {
      // Los conteos por rol de la pestaña Roles usan la lista completa (solo se pide al abrirla).
      this.usuarioService.getUsuarios(undefined, true).subscribe();
    }
  }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  /** Reinicio de contraseña: no a uno mismo (usa su perfil) y a un ADMIN solo lo reinicia el SUPER_ADMIN. */
  get puedeReiniciarPasswordEditando(): boolean {
    return this.motivoSinReinicioPassword === '';
  }

  get motivoSinReinicioPassword(): string {
    const u = this.editandoUsuario;
    if (!u) return '';
    if (!this.puedePasswordUsuario) {
      return 'Tu rol no tiene el permiso para asignar contraseñas.';
    }
    const actual = this.authService.getCurrentUser();
    if (actual && String(actual.id) === String(u.id)) {
      return 'No puedes cambiar tu propia contraseña: debe asignártela otro administrador.';
    }
    if (String(u.rolNombre || '').toUpperCase() === 'ADMIN' && !this.authService.isSuperAdmin()) {
      return 'Solo el Super Administrador puede reiniciar la contraseña de un Administrador.';
    }
    return '';
  }

  get usuariosVisibles(): Usuario[] {
    return this.usuarios.filter(u => !this.esRolSuperAdmin(u.rolNombre || u.rol));
  }

  /** Tabla de gestión de roles: páginas numeradas, búsqueda y orden en el servidor (la lista completa `roles` sigue para tarjetas y selectores). */
  readonly columnasRoles: TableColumn[] = COLUMNAS_ROLES;
  readonly rolesTabla = new TablaServidor<RolPersonalizado>((c) => this.rolService.getRolesPagina(c));

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

  /**
   * Servicios especiales y bodegas solo alimentan el formulario de crear o editar usuario: se piden la primera vez que se abre,
   * no al entrar a la pantalla. El formulario se abre cuando ya llegaron (usa el catálogo al elegir el rol).
   */
  private catalogosFormularioPedidos = false;
  private conCatalogosDelFormulario(abrir: () => void): boolean {
    if (this.catalogosFormularioPedidos) return true;
    this.catalogosFormularioPedidos = true;
    this.inventarioService.bodegas$.subscribe(list => {
      if (list && list.length) {
        this.bodegasDisponibles = list;
      }
    });
    forkJoin([
      this.catalogoServiciosService.getServicios().pipe(catchError(() => of([] as CatalogoServicio[]))),
      this.inventarioService.getBodegas().pipe(catchError(() => of([] as BodegaInventario[]))),
    ]).subscribe(([servicios, bodegas]) => {
      this.serviciosEspecialesCatalogo = (servicios || []).filter(s => {
        const cat = String(s.categoria || '').trim().toUpperCase();
        const activo = s.estado === 'Activo' || (s as any).estado === 1 || s.estado == null;
        return activo && cat.includes('ESPECIAL');
      });
      if (bodegas && bodegas.length) this.bodegasDisponibles = bodegas;
      abrir();
    });
    return false;
  }

  ngOnInit(): void {
    if (!this.puedeCrearUsuarios) {
      this.columnasUsuarios = COLUMNAS_USUARIOS.filter(c => c.key !== 'acciones');
    }
    // Catálogo de módulos y permisos: solo hace falta en la pestaña Roles (su modal de crear/editar rol y sus
    // contadores). Si se arranca en Usuarios, `seleccionarTab('roles')` ya lo pide al entrar por primera vez.
    if (this.activeTab === 'roles') this.cargarCatalogoPermisos();

    this.regionService.getRegionesLista().subscribe(list => {
      if (list && list.length) {
        this.regionesDisponibles = list.filter(r => r.estado === 'Activa' || (r as any).estado === 1);
      }
    });

    this.usuarioService.usuarios$.subscribe(list => {
      if (list && list.length) {
        this.usuarios = list;
      }
    });

    this.suscripcionBusqueda = this.busqueda$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaAplicada = texto;
        this.aplicarFiltros();
      });
    this.refrescarUsuarios(true);

    this.rolService.roles$.subscribe(list => {
      this.roles = list.map(rol => ({
        ...rol,
        modulos: Array.isArray(rol.modulos) ? rol.modulos : [],
      }));
    });

    // Roles de la base de datos (solo con 'roles.ver'; alimentan tarjetas, selectores y el ámbito del formulario)
    if (this.puedeVerRoles) {
      this.rolService.getRoles().subscribe(list => {
        this.roles = list.map(rol => ({
          ...rol,
          modulos: Array.isArray(rol.modulos) ? rol.modulos : [],
        }));
      });
    }

    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
  }

  ngOnDestroy(): void {
    this.suscripcionBusqueda?.unsubscribe();
    this.subU?.unsubscribe();
    this.rolesTabla.destruir();
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

  /** Pantallas que verá el rol que se está editando: las mismas que calcula el servidor a partir de sus permisos. */
  get pantallasRolForm(): ModuloSistema[] {
    const propias = this.rolForm.paginas;
    if (!propias.length) return [];
    const activos = new Set(this.catalogoPaginas.filter(p => p.modulo && propias.includes(p.codigo)).map(p => p.modulo as string));
    return this.modulosDisponibles.filter(m => !m.permisos.length || activos.has(m.codigo));
  }

  get pantallasAppRolForm(): ModuloSistema[] {
    return this.pantallasRolForm.filter(m => m.disponibleEnApp);
  }

  get pantallasSoloWebRolForm(): ModuloSistema[] {
    return this.pantallasRolForm.filter(m => !m.disponibleEnApp);
  }

  nombresDe(lista: ModuloSistema[]): string {
    return lista.map(m => m.nombre).join(', ');
  }

  /** Nombres de las pantallas que habilita un permiso (vacío si no habilita ninguna por sí solo). */

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
  setQuickPill(pill: 'todos' | 'lavadores' | 'supervisores' | 'bodega' | 'admins' | 'inactivos'): void {
    this.filtroPillRapida = pill;
    this.aplicarFiltros();
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
    this.busquedaAplicada = '';
    this.busquedaCorta = false;
    this.aplicarFiltros();
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
      this.busquedaAplicada = '';
      this.busquedaCorta = false;
    }
    if (tipo === 'pill') this.filtroPillRapida = 'todos';
    this.aplicarFiltros();
  }

  // -------------------------------------------------------------
  // EXPORTAR COLABORADORES FILTRADOS A CSV
  // -------------------------------------------------------------
  /** Exporta lo que coincide con los filtros actuales: pide todas las páginas al servidor (de a 100). */
  exportarUsuariosCSV(): void {
    this.obtenerTodosFiltrados()
      .then((lista) => this.generarCSV(lista))
      .catch(() => this.toastService.error('Exportación', 'No se pudo obtener el listado para exportar.'));
  }

  private async obtenerTodosFiltrados(): Promise<Usuario[]> {
    const todos: Usuario[] = [];
    for (let pagina = 1; pagina <= 100; pagina++) {
      const { pagina: p } = await firstValueFrom(
        this.usuarioService.getUsuariosPagina({ ...this.consultaUsuarios(), page: pagina, pageSize: 100 }),
      );
      todos.push(...p.items);
      if (!p.hasNextPage) break;
    }
    return todos;
  }

  private generarCSV(lista: Usuario[]): void {
    const rows = lista.map(u => ({
      ID: `USR-00${u.id}`,
      Nombre: u.nombre,
      Apellido: u.apellido,
      Rol: u.rol,
      Agencia: u.agencia,
      Region: u.region || '-',
      Email: u.email,
      Teléfono: u.telefono || '',
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
      ...rows.map(r => Object.values(r).map(celdaCsv).join(';'))
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
    const previo = this.filtrosGlobales;
    this.filtrosGlobales = { ...this.filtrosGlobales, ...filtros };
    const busq = (this.filtrosGlobales.busqueda ?? '').trim();
    this.filtroTexto = filtros.busqueda !== undefined ? filtros.busqueda : this.filtroTexto;
    this.busquedaCorta = busq.length > 0 && busq.length < BUSQUEDA_MIN_CARACTERES;

    if (this.huellaFiltros(previo) !== this.huellaFiltros(this.filtrosGlobales)) {
      // Cambió un filtro (no el texto): se consulta ya. Si el texto es de una sola letra se conserva la búsqueda anterior.
      if (!this.busquedaCorta) this.busquedaAplicada = busq;
      this.aplicarFiltros();
      return;
    }
    // Solo cambió el texto: espera 300 ms tras la última tecla y exige mínimo 2 letras (o vacío para quitar el filtro).
    if (!this.busquedaCorta) this.busqueda$.next(busq);
  }

  private huellaFiltros(f: FilterState | undefined): string {
    if (!f) return '';
    return JSON.stringify([f.rol, f.region, f.sucursal, f.cliente, f.marca, f.estado]);
  }

  /** Todo cambio de filtro, píldora o texto vuelve a la primera página. */
  aplicarFiltros() {
    this.paginaU = 1;
    this.refrescarUsuarios();
  }

  get tituloVacioU(): string {
    return this.hayFiltrosActivos
      ? 'No se encontraron colaboradores con los filtros aplicados.'
      : 'Aún no hay usuarios registrados.';
  }

  // ---- Conversión nombre → id/código (el filter-bar entrega nombres; el servidor pide ids y códigos) ----

  private neutro(v: string | undefined | null, ...neutros: string[]): string {
    const t = (v ?? '').trim();
    return !t || neutros.includes(t) ? '' : t;
  }

  private agenciaIdFiltro(): string {
    const nombre = this.neutro(this.filtrosGlobales.sucursal, 'Todas', 'TODAS');
    if (!nombre) return '';
    const n = nombre.replace(/EasyDry\s*/i, '').trim().toLowerCase();
    const suc = this.sucursales.find((x) => (x.nombre || '').replace(/EasyDry\s*/i, '').trim().toLowerCase() === n);
    return suc ? String(suc.id) : '__sin_coincidencia__';
  }

  private regionIdFiltro(): string {
    const nombre = this.neutro(this.filtrosGlobales.region, 'Todas', 'TODAS');
    if (!nombre) return '';
    const reg = this.regionesDisponibles.find((r) => r.nombre === nombre);
    if (reg) return String(reg.id);
    const suc = this.sucursales.find((x) => x.regionNombre === nombre && (x.regionId ?? x.region?.id) !== undefined);
    const id = suc ? (suc.regionId ?? suc.region?.id) : undefined;
    return id !== undefined && id !== null ? String(id) : '__sin_coincidencia__';
  }

  private clienteIdFiltro(): string {
    const f = this.filtrosGlobales;
    const nombre = this.neutro(f.cliente, 'Todas', 'TODAS') || this.neutro(f.marca, 'Todas', 'TODAS');
    if (!nombre) return '';
    const suc = this.sucursales.find((x) => (x.clienteNombre || x.marcaNombre) === nombre && (x.clienteId ?? x.marcaId) !== undefined);
    const id = suc ? (suc.clienteId ?? suc.marcaId) : undefined;
    return id !== undefined && id !== null ? String(id) : '__sin_coincidencia__';
  }

  /** El filtro de rol muestra el nombre del rol; el servidor filtra por su código (uno o varios separados por coma). */
  private rolCodigosFiltro(): string {
    const nombre = this.neutro(this.filtrosGlobales.rol, 'Todos', 'TODOS').toLowerCase();
    if (!nombre) return '';
    const codigos = new Set<string>();
    for (const r of this.roles) {
      if ((r.nombre || '').trim().toLowerCase() === nombre && r.codigo) codigos.add(r.codigo);
    }
    for (const [codigo, etiqueta] of Object.entries(ROLE_LABELS)) {
      if (etiqueta.trim().toLowerCase() === nombre) codigos.add(codigo);
    }
    return codigos.size ? Array.from(codigos).join(',') : '__sin_coincidencia__';
  }

  private consultaUsuarios(): ConsultaUsuarios {
    const estado = this.neutro(this.filtrosGlobales.estado, 'Todos');
    return {
      sortField: this.sortFieldU,
      sortOrder: this.sortOrderU,
      search: this.busquedaAplicada,
      rolNombre: this.rolCodigosFiltro() || undefined,
      agenciaId: this.agenciaIdFiltro() || undefined,
      regionId: this.regionIdFiltro() || undefined,
      clienteId: this.clienteIdFiltro() || undefined,
      estado: estado === 'Activo' ? 1 : estado === 'Inactivo' ? 0 : undefined,
      segmento: this.filtroPillRapida,
      // Fecha de ingreso
      fechaDesde: resolverRangoFechas(this.filtrosGlobales)?.inicio || undefined,
      fechaHasta: resolverRangoFechas(this.filtrosGlobales)?.fin || undefined,
    };
  }

  private mensajeError(err: unknown): string {
    const e = err as { error?: { message?: string | string[] }; message?: string } | undefined;
    const detalle = e?.error?.message;
    if (Array.isArray(detalle)) return detalle.join('. ');
    return detalle || e?.message || 'No se pudo cargar la información.';
  }

  onTablaUsuariosCambio(q: ConsultaTabla): void {
    this.paginaU = q.page;
    this.pageSizeU = q.pageSize;
    this.sortFieldU = q.sortField || 'creado';
    this.sortOrderU = q.sortOrder;
    this.cargarPaginaU();
  }

  /**
   * Vuelve a pedir la página actual (después de crear, editar, eliminar o activar) y, con `conTotal`,
   * el total del directorio sin filtros para el título de la pestaña.
   */
  refrescarUsuarios(conTotal = false): void {
    this.cargarPaginaU();
    if (conTotal) {
      this.usuarioService.getUsuariosPagina({ pageSize: 1 }).subscribe({
        next: (r) => { this.totalDirectorio = r.pagina.total; },
        error: () => { /* el contador es informativo */ },
      });
    }
  }

  cargarPaginaU(): void {
    this.subU?.unsubscribe();
    this.cargandoU = true;
    this.errorU = null;
    this.subU = this.usuarioService
      .getUsuariosPagina({ ...this.consultaUsuarios(), page: this.paginaU, pageSize: this.pageSizeU, incluirResumen: true })
      .subscribe({
        next: ({ pagina, resumen }) => {
          // Si la página quedó vacía (se borró o cambió lo último de la lista) se retrocede a la última que exista.
          if (pagina.items.length === 0 && this.paginaU > 1 && pagina.total > 0) {
            this.paginaU = Math.max(1, pagina.totalPages);
            this.cargarPaginaU();
            return;
          }
          this.filasU = pagina.items;
          this.totalU = pagina.total;
          this.paginaU = pagina.page;
          if (resumen) this.resumenU = resumen;
          this.cargandoU = false;
        },
        error: (err) => {
          this.filasU = [];
          this.totalU = 0;
          this.errorU = this.mensajeError(err);
          this.cargandoU = false;
        },
      });
  }

  getRolBadgeClass(rolNombre: string): string {
    const rol = this.roles.find(r => r.nombre.toLowerCase() === rolNombre.toLowerCase() || r.codigo.toLowerCase() === rolNombre.toLowerCase());
    if (rol?.badgeClass) return rol.badgeClass;
    if (rolNombre.includes('Admin') || rolNombre.includes('Super')) return 'bg-purple-100 text-purple-900 border-purple-300';
    if (rolNombre.includes('Gerente')) return 'bg-easydry-blue/15 text-easydry-blue border-easydry-blue/20';
    if (rolNombre.includes('Supervisor')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (rolNombre.includes('Operador') || rolNombre.includes('Lavador')) return 'bg-easydry-green/20 text-easydry-green-text border-easydry-green/30';
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
    if (!this.conCatalogosDelFormulario(() => this.abrirModalCrearUsuario())) return;
    if (!this.puedeCrearUsuarios) return;
    this.editandoUsuario = null;
    this.usuarioFormSubmitted = false;
    const defaultRol = this.puedeGestionarUsuarios
      ? (this.rolesVisibles.find(r => r.codigo === 'APROBADOR') || this.rolesVisibles[0])
      : this.rolesVisibles.find(r => r.codigo.toUpperCase() === 'BACKUP');
    const primerRol = defaultRol?.nombre || 'Aprobador';
    const regionActual = this.authService.currentUserValue?.regionId
      ? this.regionesDisponibles.find(r => String(r.id) === String(this.authService.currentUserValue?.regionId))?.nombre || ''
      : '';
    this.usuarioForm = {
      nombre: '',
      apellido: '',
      rol: primerRol,
      roleId: defaultRol?.id,
      agencia: '',
      region: this.esBackupRol(defaultRol?.codigo) ? regionActual : '',
      bodegaId: '',
      estado: 'Activo',
      email: '',
      telefono: '',
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
    if (!this.conCatalogosDelFormulario(() => this.editarUsuario(u))) return;
    if (!this.puedeGestionarFilaUsuario(u)) return;
    this.editandoUsuario = u;
    this.usuarioFormSubmitted = false;
    let agenciaActual = (u.agencia && u.agencia !== 'Sin asignar' && u.agencia !== 'EasyDry Corporativo' && !u.agencia.startsWith('Región') && !u.agencia.startsWith('Móvil') && !u.agencia.startsWith('Bodega Región'))
      ? u.agencia
      : (u.sucursal && u.sucursal !== 'Sin asignar' && u.sucursal !== 'EasyDry Corporativo' && !u.sucursal.startsWith('Región') && !u.sucursal.startsWith('Móvil') && !u.sucursal.startsWith('Bodega Región'))
        ? u.sucursal
        : '';

    const rolMatch = this.rolDeUsuario(u);

    // Roles de ámbito global o regional (y el asistente de bodega) no se vinculan a una agencia.
    const ambitoUsr = rolMatch?.ambito || '';
    if (ambitoUsr === 'GLOBAL' || ambitoUsr === 'REGION' || this.esAsistenteBodegaRol(u.rol)) {
      agenciaActual = '';
    }

    const regionActual = (u.region && u.region !== 'Sin asignar' && u.region !== 'Nacional') ? u.region : '';

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
      telefono: u.telefono || '',
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

  onPulidorAgenciaChange(agencia: string) {
    this.usuarioForm.servicioIds = this.serviciosEspecialesCatalogo.map(s => Number(s.id));
    if (agencia?.trim()) {
      this.usuarioForm.modalidadPulidor = 'FIJO';
    } else {
      this.usuarioForm.modalidadPulidor = 'MOVIL';
      if (this.usuarioForm.region === 'Nacional') {
        this.usuarioForm.region = '';
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
    if (!this.puedeEstadoUsuario) return;
    const nuevoEstado: 'Activo' | 'Inactivo' = u.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.usuarioService.toggleEstado(u.id, nuevoEstado).subscribe({
      next: () => {
        u.estado = nuevoEstado;
        this.refrescarUsuarios();
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

  /**
   * El botón «Cambiar contraseña» de la fila es para quien tiene SOLO ese permiso (quien también puede editar usuarios la cambia desde el
   * formulario de edición). No se ofrece sobre uno mismo ni sobre el Super Administrador, ni sobre un Administrador si no se es Super Administrador.
   */
  puedeSoloPassword(u: Usuario): boolean {
    if (!this.puedePasswordUsuario || this.puedeGestionarFilaUsuario(u)) return false;
    const actual = this.authService.getCurrentUser();
    if (actual && String(actual.id) === String(u.id)) return false;
    const rol = String(u.rolNombre || u.rol || '').toUpperCase();
    if (rol === 'SUPER_ADMIN') return false;
    return !(rol === 'ADMIN' && !this.authService.isSuperAdmin());
  }

  abrirModalPassword(u: Usuario): void {
    this.usuarioPassword = u;
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.modalPasswordOpen = true;
  }

  cerrarModalPassword(): void {
    this.modalPasswordOpen = false;
    this.usuarioPassword = null;
    this.passwordNueva = '';
    this.passwordConfirmar = '';
  }

  get motivoPasswordNueva(): string | null {
    return motivoPasswordDebil(this.passwordNueva, this.usuarioPassword?.email);
  }

  get passwordLista(): boolean {
    return !!this.passwordNueva.trim() && this.motivoPasswordNueva === null && this.passwordNueva.trim() === this.passwordConfirmar.trim();
  }

  guardarPassword(): void {
    const u = this.usuarioPassword;
    if (!u || !this.passwordLista || this.guardandoPassword) return;
    this.guardandoPassword = true;
    this.usuarioService.asignarPassword(u.id, this.passwordNueva).subscribe({
      next: () => {
        this.toastService.success('Contraseña actualizada', `Se asignó la nueva contraseña de ${u.nombre} ${u.apellido}. Sus sesiones abiertas se cerraron.`);
        this.guardandoPassword = false;
        this.cerrarModalPassword();
      },
      error: (err) => {
        this.guardandoPassword = false;
        this.toastService.error('No se pudo cambiar la contraseña', err?.error?.message || 'El servidor no aceptó el cambio.');
      },
    });
  }

  onRolUsuarioChange() {
    if (this.esOperadorEspecialesRol(this.usuarioForm.rol)) {
      this.onPulidorAgenciaChange(this.usuarioForm.agencia || '');
    } else {
      this.usuarioForm.modalidadPulidor = undefined as any;
      this.usuarioForm.servicioIds = [];
    }
    if (this.esBackupRol(this.usuarioForm.rol)) {
      this.usuarioForm.bodegaId = '';
      if (!this.usuarioForm.region && this.authService.currentUserValue?.regionId) {
        this.usuarioForm.region = this.regionesDisponibles.find(
          r => String(r.id) === String(this.authService.currentUserValue?.regionId),
        )?.nombre || '';
      }
      this.onBackupRegionChange(this.usuarioForm.region || '');
    } else if (this.esAsistenteBodegaRol(this.usuarioForm.rol)) {
      this.usuarioForm.agencia = '';
      this.usuarioForm.bodegaId = this.usuarioForm.bodegaId || this.bodegasRegionales[0]?.id || '';
      this.onBodegaAsistenteChange(this.usuarioForm.bodegaId);
    } else if (this.ambitoForm === 'GLOBAL') {
      // Todo el país: sin agencia, región ni bodega.
      this.usuarioForm.agencia = '';
      this.usuarioForm.region = '';
      this.usuarioForm.bodegaId = '';
    } else if (this.ambitoForm === 'REGION') {
      // Su región: la agencia no aplica; la región se elige en el formulario.
      this.usuarioForm.agencia = '';
      this.usuarioForm.bodegaId = '';
    }
  }

  setModalidadPulidor(modalidad: ModalidadPulidor) {
    this.usuarioForm.modalidadPulidor = modalidad;
    if (modalidad === 'MOVIL') {
      this.usuarioForm.agencia = '';
      if (this.usuarioForm.region === 'Nacional') {
        this.usuarioForm.region = '';
      }
    }
  }

  private payloadModalidad(): { agencia: string; modalidadPulidor?: ModalidadPulidor } {
    if (this.esAsistenteBodegaRol(this.usuarioForm.rol)) {
      const bod = this.bodegasRegionales.find(b => String(b.id) === String(this.usuarioForm.bodegaId));
      return { agencia: bod?.nombre || `Bodega Regional ${this.usuarioForm.region || 'Regional'}`, modalidadPulidor: undefined };
    }
    if (!esRolOperadorEspeciales(this.usuarioForm.rol)) {
      this.usuarioForm.modalidadPulidor = undefined as any;
      this.usuarioForm.servicioIds = [];
      return { agencia: this.usuarioForm.agencia?.trim() || 'Sin asignar', modalidadPulidor: undefined };
    }
    if (this.usuarioForm.agencia?.trim()) {
      return { agencia: this.usuarioForm.agencia.trim(), modalidadPulidor: 'FIJO' };
    }
    return { agencia: 'Sin asignar', modalidadPulidor: 'MOVIL' };
  }

  guardarUsuario() {
    if (this.guardandoUsuario) return;
    this.usuarioFormSubmitted = true;
    if (this.nombreInvalido || this.emailInvalido || this.telefonoInvalido || this.passwordInvalido || this.confirmPasswordInvalido) {
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
      if (!passwordCumplePolitica(p, this.usuarioForm.email)) {
        this.toastService.warning('Contraseña Corta', 'La contraseña debe tener al menos 10 caracteres, con mayúscula, minúscula, número y un carácter especial (! @ # $ % & * ?).');
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
      if (!passwordCumplePolitica(p, this.usuarioForm.email)) {
        this.toastService.warning('Contraseña Corta', 'La nueva contraseña debe tener al menos 10 caracteres, con mayúscula, minúscula, número y un carácter especial (! @ # $ % & * ?).');
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

    if (!this.usuarioForm.roleId) {
      this.toastService.warning('Rol requerido', 'Elige el rol que tendrá el usuario.');
      return;
    }

    if (this.agenciaObligatoria && !esRolOperadorEspeciales(this.usuarioForm.rol) && !this.esAsistenteBodegaRol(this.usuarioForm.rol) && !this.usuarioForm.agencia?.trim()) {
      this.toastService.warning('Agencia requerida', 'Este rol trabaja sobre los datos de su agencia: asigna una agencia al usuario.');
      return;
    }

    if (this.esAsistenteBodegaRol(this.usuarioForm.rol) && !this.usuarioForm.bodegaId) {
      this.toastService.warning('Bodega requerida', 'El asistente de bodega debe estar asignado a una bodega regional.');
      return;
    }

    const modalidad = this.payloadModalidad();
    const isAsistente = this.esAsistenteBodegaRol(this.usuarioForm.rol);
    const isPulidor = esRolOperadorEspeciales(this.usuarioForm.rol);
    const isPulidorMovil = isPulidor && modalidad.modalidadPulidor === 'MOVIL';

    let bodegaMatch: BodegaInventario | undefined = undefined;
    if (isAsistente) {
      bodegaMatch = this.bodegasRegionales.find(b => String(b.id) === String(this.usuarioForm.bodegaId));
    }

    const rolEncontrado = this.rolDeUsuario({ roleId: this.usuarioForm.roleId, rol: this.usuarioForm.rol });

    const roleIdToSend = rolEncontrado?.id || this.usuarioForm.roleId;

    // Alcance según el ámbito del rol (el pulidor y el asistente de bodega tienen su propia regla).
    const ambitoRol = this.ambitoForm;
    const isGlobal = ambitoRol === 'GLOBAL' && !isPulidor && !isAsistente;
    const isRegional = ambitoRol === 'REGION' && !isPulidor && !isAsistente;
    const isBackup = this.esBackupRol(this.usuarioForm.rol);

    if (isRegional && !this.usuarioForm.region) {
      this.toastService.warning('Región requerida', 'Este rol trabaja sobre su región: asigna una región al usuario.');
      return;
    }

    if (isAsistente && !this.usuarioForm.bodegaId) {
      this.toastService.warning('Bodega requerida', 'El asistente de bodega debe estar registrado a una bodega regional.');
      return;
    }

    let regionMatch: RegionOperativa | undefined = undefined;
    if ((isAsistente || isRegional || isPulidorMovil || isBackup) && this.usuarioForm.region) {
      regionMatch = this.regionesDisponibles.find(r =>
        r.nombre.toLowerCase() === this.usuarioForm.region?.toLowerCase() ||
        String(r.id) === this.usuarioForm.region
      );
    }
    if (isAsistente && bodegaMatch?.regionId) {
      regionMatch = this.regionesDisponibles.find(r => String(r.id) === String(bodegaMatch!.regionId)) || regionMatch;
    }
    if (isBackup && !regionMatch) {
      this.toastService.warning('Región requerida', 'Selecciona una región válida para el usuario Backup.');
      return;
    }

    if (this.editandoUsuario) {
      const nuevoEstado: 'Activo' | 'Inactivo' = this.usuarioForm.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
      const agenciaVal = modalidad.agencia === 'Sin asignar' ? '' : modalidad.agencia;
      const sucursalMatch = this.sucursales.find(s => s.nombre === agenciaVal || String(s.id) === agenciaVal);

      let finalAgencia = agenciaVal || 'Sin asignar';
      let finalAgenciaId: string | undefined = sucursalMatch ? String(sucursalMatch.id) : undefined;
      let finalRegionId: string | undefined = undefined;
      let finalRegion: string | undefined = undefined;

      if (isGlobal) {
        finalAgencia = '';
        finalAgenciaId = undefined;
        finalRegion = undefined;
        finalRegionId = undefined;
      } else if (isRegional) {
        finalRegion = regionMatch?.nombre || this.usuarioForm.region || '';
        finalRegionId = regionMatch?.id ? String(regionMatch.id) : this.editandoUsuario.regionId;
        finalAgencia = '';
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
        finalAgencia = '';
        finalAgenciaId = undefined;
      } else if (isBackup) {
        finalRegion = regionMatch?.nombre || '';
        finalRegionId = regionMatch?.id ? String(regionMatch.id) : this.editandoUsuario.regionId;
        if (ambitoRol === 'REGION') {
          finalAgencia = '';
          finalAgenciaId = undefined;
        }
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
        telefono: this.usuarioForm.telefono.trim(),
        modalidadPulidor: isPulidor ? modalidad.modalidadPulidor : undefined,
        servicioIds: isPulidor ? this.serviciosEspecialesCatalogo.map(s => Number(s.id)) : [],
        ...(this.usuarioForm.cambiarPassword && this.usuarioForm.password?.trim()
          ? { password: this.usuarioForm.password.trim() }
          : {}),
        roleId: roleIdToSend || (this.editandoUsuario as any).roleId || undefined
      };

      this.guardandoUsuario = true;
      this.usuarioService.actualizarUsuario(actualizado).pipe(finalize(() => { this.guardandoUsuario = false; })).subscribe({
        next: (res) => {
          const uFinal = res || actualizado;
          const idx = this.usuarios.findIndex(u => String(u.id) === String(uFinal.id));
          if (idx !== -1) {
            this.usuarios[idx] = uFinal;
            this.usuarios = [...this.usuarios];
          }
          this.refrescarUsuarios();
          if (nuevoEstado === 'Inactivo') {
            this.toastService.warning('Usuario Actualizado', `Perfil de ${actualizado.nombre} actualizado como Inactivo. Se bloqueará su login y no aparecerá en selectores de asignación.`);
          } else {
            this.toastService.success('Usuario Actualizado', `Perfil de ${actualizado.nombre} actualizado correctamente.`);
          }
          this.modalUsuarioOpen = false;
        },
        error: (err) => {
          console.error('Error al actualizar usuario', err);
          this.toastService.error('No se pudo actualizar el usuario', this.mensajeError(err));
        }
      });
    } else {
      const agenciaVal = modalidad.agencia === 'Sin asignar' ? '' : modalidad.agencia;
      const sucursalMatch = this.sucursales.find(s => s.nombre === agenciaVal || String(s.id) === agenciaVal);

      let finalAgencia = agenciaVal || 'Sin asignar';
      let finalAgenciaId: string | undefined = sucursalMatch ? String(sucursalMatch.id) : undefined;
      let finalRegionId: string | undefined = undefined;
      let finalRegion: string | undefined = undefined;

      if (isGlobal) {
        finalAgencia = '';
        finalAgenciaId = undefined;
        finalRegion = undefined;
        finalRegionId = undefined;
      } else if (isRegional) {
        finalRegion = regionMatch?.nombre || this.usuarioForm.region || '';
        finalRegionId = regionMatch?.id ? String(regionMatch.id) : undefined;
        finalAgencia = '';
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
        finalAgencia = '';
        finalAgenciaId = undefined;
      } else if (isBackup) {
        finalRegion = regionMatch?.nombre || '';
        finalRegionId = regionMatch?.id ? String(regionMatch.id) : undefined;
        if (ambitoRol === 'REGION') {
          finalAgencia = '';
          finalAgenciaId = undefined;
        }
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
        telefono: this.usuarioForm.telefono.trim(),
        fechaAsignacion: new Date().toISOString().split('T')[0],
        avatar: '',
        modalidadPulidor: isPulidor ? modalidad.modalidadPulidor : undefined,
        servicioIds: isPulidor ? this.serviciosEspecialesCatalogo.map(s => Number(s.id)) : [],
        password: this.usuarioForm.password?.trim(),
        roleId: roleIdToSend
      };

      this.guardandoUsuario = true;
      this.usuarioService.crearUsuario(nuevo).pipe(finalize(() => { this.guardandoUsuario = false; })).subscribe({
        next: (creado) => {
          const existe = this.usuarios.some(u => String(u.id) === String(creado.id) || (u.email && u.email.toLowerCase() === creado.email.toLowerCase()));
          if (!existe) {
            this.usuarios = [creado, ...this.usuarios];
          } else {
            this.usuarios = this.usuarios.map(u => (String(u.id) === String(creado.id) || u.email.toLowerCase() === creado.email.toLowerCase()) ? creado : u);
          }
          this.mostrarNuevoUsuario();
          this.toastService.success(
            'Usuario Registrado',
            `Usuario ${creado.nombre} ${creado.apellido} registrado exitosamente con sus credenciales de acceso.`
          );
          this.modalUsuarioOpen = false;
        },
        error: (err) => {
          // Antes esta rama fingía el éxito: mostraba "Usuario Registrado", agregaba una fila falsa solo en el
          // navegador y cerraba el modal, aunque el usuario nunca se hubiera creado en el servidor.
          // Ahora el modal sigue abierto con los datos escritos y la lista no se toca.
          console.error('Error al crear usuario', err);
          // Los errores HTTP ya muestran su motivo (correo repetido, contraseña inválida…) por el interceptor global.
          if (!(err instanceof HttpErrorResponse)) {
            this.toastService.error('No se pudo registrar el usuario', err?.message || 'Intenta de nuevo.');
          }
        }
      });
    }
  }

  /** Un usuario nuevo es el más reciente: se vuelve a la primera página, ordenada por fecha de ingreso descendente. */
  private mostrarNuevoUsuario(): void {
    this.paginaU = 1;
    this.sortFieldU = 'creado';
    this.sortOrderU = 'desc';
    this.refrescarUsuarios(true);
  }

  // ── Permisos de la pantalla (los mismos que exige el backend en cada endpoint) ──
  get puedeVerRoles(): boolean {
    return this.authService.puede('roles.ver');
  }

  get puedeCrearRol(): boolean { return this.authService.puede('usuarios.roles.crear'); }
  get puedeEditarRol(): boolean { return this.authService.puede('usuarios.roles.editar'); }
  get puedeEliminarRol(): boolean { return this.authService.puede('usuarios.roles.eliminar'); }
  /** Alguna acción sobre roles: con solo «ver» el editor se abre en lectura. */
  get puedeGestionarRoles(): boolean { return this.puedeCrearRol || this.puedeEditarRol || this.puedeEliminarRol; }

  get puedeCrearUsuario(): boolean { return this.authService.puede('usuarios.usuarios.crear'); }
  get puedeEditarUsuario(): boolean { return this.authService.puede('usuarios.usuarios.editar'); }
  get puedeEstadoUsuario(): boolean { return this.authService.puede('usuarios.usuarios.estado'); }
  get puedePasswordUsuario(): boolean { return this.authService.puede('usuarios.usuarios.password'); }
  /** Crea o edita usuarios de cualquier rol (a diferencia de quien solo gestiona Backups de su región). */
  get puedeGestionarUsuarios(): boolean { return this.puedeCrearUsuario || this.puedeEditarUsuario; }

  get puedeGestionarBackups(): boolean {
    return this.authService.puede('usuarios.usuarios.backup');
  }

  get puedeCrearUsuarios(): boolean {
    return this.puedeCrearUsuario || this.puedeGestionarBackups;
  }

  puedeGestionarFilaUsuario(usuario: Usuario): boolean {
    if (this.puedeEditarUsuario) return true;
    const regionActor = this.authService.currentUserValue?.regionId;
    return this.puedeGestionarBackups &&
      this.esBackupRol(usuario.rolNombre || usuario.rol) &&
      !!regionActor &&
      String(usuario.regionId) === String(regionActor);
  }

  /** Con solo 'roles.ver' el editor se abre en modo lectura. */
  get soloLecturaRol(): boolean {
    return this.editandoRol ? !this.puedeEditarRol : !this.puedeCrearRol;
  }

  // ── Catálogo de permisos y ámbitos ──
  ambitoInfo(codigo?: string): AmbitoInfo {
    return AMBITOS_INFO.find(a => a.codigo === codigo) ?? { codigo: codigo || '', corto: codigo || 'Sin definir', detalle: '' };
  }

  /** Solo se ofrecen permisos que quien edita posee (el backend rechaza otorgar los que no tiene). */
  puedeOtorgar(codigo: string): boolean {
    return this.authService.puede(codigo);
  }

  /** Un ámbito no puede ser más amplio que el del propio rol de quien edita (el SUPER_ADMIN puede todos). */
  puedeOtorgarAmbito(ambito: string): boolean {
    if (this.authService.isSuperAdmin()) return true;
    const propio = this.authService.getCurrentUser()?.ambito || 'PROPIO';
    return this.amplitudAmbito(ambito) <= this.amplitudAmbito(propio);
  }

  private amplitudAmbito(a: string): number {
    const i = AMBITOS_ROL.indexOf(a as (typeof AMBITOS_ROL)[number]);
    return i < 0 ? 0 : AMBITOS_ROL.length - 1 - i;
  }

  get codigoRolPreview(): string {
    return codigoRolDesdeNombre(this.rolForm.nombre);
  }

  get codigoRolPreviewValido(): boolean {
    return codigoRolValido(this.codigoRolPreview);
  }

  private cargarCatalogoPermisos(): void {
    if (!this.puedeVerRoles) return;
    this.cargandoCatalogo = true;
    this.errorCatalogo = null;
    this.rolService.getCatalogoPermisos().pipe(finalize(() => { this.cargandoCatalogo = false; })).subscribe({
      next: (cat) => {
        this.modulosDisponibles = cat.modulos;
        this.catalogoCapacidades = cat.capacidades;
        this.catalogoPaginas = cat.paginas;
      },
      error: (err) => {
        this.errorCatalogo = 'No se pudo cargar el catálogo de permisos. ' + this.mensajeError(err);
      },
    });
  }

  private normalizarTexto(t: string): string {
    return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /** Páginas, sub-páginas y acciones que el rol tiene activas. */
  getCapacidadesCount(rol: RolPersonalizado): number {
    return rol.paginas?.length ?? 0;
  }

  getCapacidadesProgress(rol: RolPersonalizado): number {
    const total = this.totalCodigosCatalogo;
    if (!total) return 0;
    return (this.getCapacidadesCount(rol) / total) * 100;
  }

  private get totalCodigosCatalogo(): number {
    const codigos = new Set<string>();
    for (const p of this.catalogoPaginas) {
      codigos.add(p.codigo);
      p.acciones.forEach(a => codigos.add(a.codigo));
      p.subs.forEach(sp => { codigos.add(sp.codigo); sp.acciones.forEach(a => codigos.add(a.codigo)); });
    }
    return codigos.size;
  }

  // ── Acciones de Roles ──
  abrirModalCrearRol() {
    if (!this.puedeCrearRol) return;
    this.editandoRol = null;
    this.rolForm = {
      nombre: '',
      descripcion: '',
      ambito: 'AGENCIA',
      paginas: [],
      esSistema: false,
    };
    if (!this.catalogoPaginas.length && !this.cargandoCatalogo) this.cargarCatalogoPermisos();
    this.modalRolOpen = true;
  }

  abrirModalEditarRol(rol: RolPersonalizado) {
    this.editandoRol = rol;
    this.rolForm = {
      id: rol.id,
      codigo: rol.codigo,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      ambito: rol.ambito || 'AGENCIA',
      paginas: [...(rol.paginas || [])],
      esSistema: rol.esSistema,
    };
    if (!this.catalogoPaginas.length && !this.cargandoCatalogo) this.cargarCatalogoPermisos();
    this.modalRolOpen = true;
  }

  /** Vuelve a pedir la tabla de roles y la lista completa que usan las tarjetas y los selectores. */
  private refrescarRoles(): void {
    this.rolesTabla.refrescar();
    this.rolService.getRoles().subscribe(rolesList => {
      this.roles = [...rolesList];
    });
  }

  guardarRol() {
    if (this.soloLecturaRol || this.guardandoRol) return;

    if (!this.editandoRol) {
      if (!this.rolForm.nombre.trim()) {
        this.toastService.warning('Nombre Requerido', 'Ingrese un nombre descriptivo para el rol.');
        return;
      }
      if (!this.codigoRolPreviewValido) {
        this.toastService.warning('Nombre no válido', 'El nombre debe tener de 3 a 40 caracteres: letras, números y espacios, empezando por letra.');
        return;
      }
    }

    this.guardandoRol = true;
    if (this.editandoRol) {
      const rolId = this.editandoRol.id;
      this.rolService.actualizarRol(rolId, {
        descripcion: this.rolForm.descripcion,
        ambito: this.rolForm.ambito,
        capacidades: this.rolForm.paginas,
      }).pipe(finalize(() => { this.guardandoRol = false; })).subscribe({
        next: (res) => {
          this.toastService.success('Rol Actualizado', `Permisos para "${res.nombre}" actualizados correctamente.`);
          this.refrescarRoles();
          this.modalRolOpen = false;
        },
        error: (err) => this.toastService.error('No se pudo guardar el rol', this.mensajeError(err)),
      });
    } else {
      this.rolService.crearRol({
        nombre: this.rolForm.nombre,
        descripcion: this.rolForm.descripcion,
        ambito: this.rolForm.ambito,
        capacidades: this.rolForm.paginas,
      }).pipe(finalize(() => { this.guardandoRol = false; })).subscribe({
        next: (creado) => {
          this.toastService.success('Rol Creado', `Nuevo rol "${creado.nombre}" disponible para asignar a usuarios.`);
          this.refrescarRoles();
          this.modalRolOpen = false;
        },
        error: (err) => this.toastService.error('No se pudo crear el rol', this.mensajeError(err)),
      });
    }
  }

  toggleEstadoRol(rol: RolPersonalizado) {
    if (!this.puedeEditarRol) return;
    const nuevoEstado = rol.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.rolService.actualizarRol(rol.id, { estado: nuevoEstado === 'Activo' ? 1 : 0 }).subscribe({
      next: () => {
        if (nuevoEstado === 'Inactivo') {
          this.toastService.warning('Rol Desactivado', `El rol "${rol.nombre}" ha sido marcado como Inactivo.`);
        } else {
          this.toastService.success('Rol Activado', `El rol "${rol.nombre}" ha sido activado correctamente.`);
        }
        this.refrescarRoles();
      },
      error: (err) => this.toastService.error('No se pudo cambiar el estado del rol', this.mensajeError(err)),
    });
  }

  abrirModalEliminarRol(rol: RolPersonalizado) {
    if (!this.puedeEliminarRol || rol.esSistema) return;
    this.rolAEliminar = rol;
    this.modalEliminarRolOpen = true;
  }

  confirmarEliminarRol() {
    if (!this.rolAEliminar) return;
    const rol = this.rolAEliminar;
    this.rolService.eliminarRol(rol.id).subscribe({
      next: () => {
        this.toastService.success('Rol Eliminado', `El rol "${rol.nombre}" ha sido eliminado.`);
        this.refrescarRoles();
        this.modalEliminarRolOpen = false;
        this.rolAEliminar = null;
      },
      error: (err) => {
        // Ej.: el rol tiene usuarios asignados o es un rol oficial: el servidor explica el motivo.
        this.toastService.error('No se pudo eliminar el rol', this.mensajeError(err));
        this.modalEliminarRolOpen = false;
        this.rolAEliminar = null;
      },
    });
  }
}

import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { OpcionesService, opcionesPorNombre } from '../../../core/services/opciones.service';
import { SelectSearchComponent } from '../select-search/select-search.component';

export interface FilterState {
  sucursal: string;
  region?: string;
  cliente?: string;
  marca?: string;
  bodega?: string;
  operador: string;
  servicio?: string;
  bahia: string;
  estado: string;
  fecha: string;
  fechaInicio?: string;
  fechaFin?: string;
  busqueda?: string;
  rol?: string;
  [customKey: string]: any;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SelectSearchComponent],
  host: { class: 'block' },
  template: `
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry flex flex-wrap gap-3 items-end z-20 relative animate-fade-in">

      <!-- Búsqueda por texto (Doble de espacio / Ancho prominente) -->
      @if (showBusqueda) {
        <div class="flex-[2_2_320px] min-w-[280px] sm:min-w-[340px] max-w-full">
          <label [attr.for]="uid + '-c1'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="search" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Búsqueda
          </label>
          <div class="relative">
            <input [id]="uid + '-c1'"
              type="text"
              [(ngModel)]="filters.busqueda"
              (input)="emitFilters()"
              [placeholder]="placeholderBusqueda"
              class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-9 pr-8 py-2 focus:ring-2 focus:ring-easydry-blue focus:bg-white focus:border-transparent transition-colors placeholder:text-slate-500 font-medium">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <i-lucide name="search" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
            </span>
            @if (filters.busqueda) {
              <button
                type="button"
                (click)="clearBusqueda()"
                aria-label="Limpiar búsqueda"
                class="absolute inset-y-0 right-0 px-2.5 flex items-center text-slate-500 hover:text-slate-700 cursor-pointer">
                <i-lucide name="x" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
              </button>
            }
          </div>
        </div>
      }

      <!-- Región -->
      @if (showRegion) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label [attr.for]="usaBuscador('region') ? null : uid + '-c2'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="globe" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Región
          </label>
          @if (usaBuscador('region')) {
            <app-select-search
              [cargar]="cargadorRegiones"
              [value]="valorBuscador(filters.region, 'Todas')"
              [valueLabel]="valorBuscador(filters.region, 'Todas') || ''"
              placeholder="Todas las Regiones"
              todasLabel="Todas las Regiones"
              ariaLabel="Todas las Regiones"
              (valueChange)="alElegir('region', $event, 'Todas')">
            </app-select-search>
          } @else {
            <select [id]="uid + '-c2'" [(ngModel)]="filters.region" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
              <option value="Todas">Todas las Regiones</option>
              @for (reg of listaRegiones; track reg) {
                <option [value]="reg">{{ reg }}</option>
              }
            </select>
          }
        </div>
      }

      <!-- Agencia -->
      @if (showSucursal) {
        <div class="flex-1 min-w-[150px] max-w-full">
          <label [attr.for]="usaBuscador('sucursal') ? null : uid + '-c3'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="map-pin" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Agencia
          </label>
          @if (usaBuscador('sucursal')) {
            <app-select-search
              [cargar]="cargadorSucursales"
              [value]="valorBuscador(filters.sucursal, 'Todas')"
              [valueLabel]="valorBuscador(filters.sucursal, 'Todas') || ''"
              placeholder="Todas las Agencias"
              todasLabel="Todas las Agencias"
              ariaLabel="Todas las Agencias"
              (valueChange)="alElegir('sucursal', $event, 'Todas')">
            </app-select-search>
          } @else {
            <select [id]="uid + '-c3'" [(ngModel)]="filters.sucursal" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
              <option value="Todas">Todas las Agencias</option>
              @for (suc of listaSucursales; track suc) {
                <option [value]="suc">{{ suc }}</option>
              }
            </select>
          }
        </div>
      }

      <!-- Cliente -->
      @if (showCliente || showMarca) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label [attr.for]="usaBuscador('cliente') ? null : uid + '-c4'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="briefcase" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Cliente
          </label>
          @if (usaBuscador('cliente')) {
            <app-select-search
              [cargar]="cargadorClientes"
              [value]="valorBuscador(filters.cliente, 'Todas')"
              [valueLabel]="valorBuscador(filters.cliente, 'Todas') || ''"
              placeholder="Todos los Clientes"
              todasLabel="Todos los Clientes"
              ariaLabel="Todos los Clientes"
              (valueChange)="alElegirCliente($event)">
            </app-select-search>
          } @else {
            <select [id]="uid + '-c4'" [(ngModel)]="filters.cliente" (ngModelChange)="syncClienteMarca($event); emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
              <option value="Todas">Todos los Clientes</option>
              @for (m of listaClientes; track m) {
                <option [value]="m">{{ m }}</option>
              }
            </select>
          }
        </div>
      }

      <!-- Bodega -->
      @if (showBodega) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label [attr.for]="uid + '-c5'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="warehouse" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Bodega
          </label>
          <select [id]="uid + '-c5'" [(ngModel)]="filters.bodega" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
            <option value="Todas">Todas las Bodegas</option>
            @for (b of listaBodegas; track b) {
              <option [value]="b">{{ b }}</option>
            }
          </select>
        </div>
      }

      <!-- Lavador -->
      @if (showOperador) {
        <div class="flex-1 min-w-[150px] max-w-full">
          <label [attr.for]="usaBuscador('operador') ? null : uid + '-c6'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="users" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Lavador
          </label>
          @if (usaBuscador('operador')) {
            <app-select-search
              [cargar]="cargadorOperadores"
              [value]="valorBuscador(filters.operador, 'Todos')"
              [valueLabel]="valorBuscador(filters.operador, 'Todos') || ''"
              placeholder="Todos los Lavadores"
              todasLabel="Todos los Lavadores"
              ariaLabel="Todos los Lavadores"
              (valueChange)="alElegir('operador', $event, 'Todos')">
            </app-select-search>
          } @else {
            <select [id]="uid + '-c6'" [(ngModel)]="filters.operador" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
              <option value="Todos">Todos los Lavadores</option>
              @for (op of listaOperadores; track op) {
                <option [value]="op">{{ op }}</option>
              }
            </select>
          }
        </div>
      }

      <!-- Servicio -->
      @if (showServicio) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label [attr.for]="usaBuscador('servicio') ? null : uid + '-c7'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="sparkles" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Tipo de Servicio
          </label>
          @if (usaBuscador('servicio')) {
            <app-select-search
              [cargar]="cargadorServicios"
              [value]="valorBuscador(filters.servicio, 'Todos')"
              [valueLabel]="valorBuscador(filters.servicio, 'Todos') || ''"
              placeholder="Todos los Servicios"
              todasLabel="Todos los Servicios"
              ariaLabel="Todos los Servicios"
              (valueChange)="alElegir('servicio', $event, 'Todos')">
            </app-select-search>
          } @else {
            <select [id]="uid + '-c7'" [(ngModel)]="filters.servicio" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
              <option value="Todos">Todos los Servicios</option>
              @for (serv of listaServicios; track serv) {
                <option [value]="serv">{{ serv }}</option>
              }
            </select>
          }
        </div>
      }

      <!-- Bahía -->
      @if (showBahia) {
        <div class="flex-1 min-w-[110px] max-w-full">
          <label [attr.for]="usaBuscador('bahia') ? null : uid + '-c8'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="layout-grid" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Bahía
          </label>
          @if (usaBuscador('bahia')) {
            <app-select-search
              [cargar]="cargadorBahias"
              [value]="valorBuscador(filters.bahia, 'Todas')"
              [valueLabel]="valorBuscador(filters.bahia, 'Todas') || ''"
              placeholder="Todas"
              todasLabel="Todas"
              ariaLabel="Todas"
              (valueChange)="alElegir('bahia', $event, 'Todas')">
            </app-select-search>
          } @else {
            <select [id]="uid + '-c8'" [(ngModel)]="filters.bahia" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
              <option value="Todas">Todas</option>
              @for (bahia of listaBahias; track bahia) {
                <option [value]="bahia">{{ bahia }}</option>
              }
            </select>
          }
        </div>
      }

      <!-- Rol -->
      @if (showRol) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label [attr.for]="uid + '-c9'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="shield" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Rol
          </label>
          <select [id]="uid + '-c9'" [(ngModel)]="filters.rol" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
            <option value="Todos">Todos los Roles</option>
            @for (r of listaRoles; track r) {
              <option [value]="r">{{ r }}</option>
            }
          </select>
        </div>
      }

      <!-- Estado -->
      @if (showEstado) {
        <div class="flex-1 min-w-[120px] max-w-full">
          <label [attr.for]="uid + '-c10'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="check-circle" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Estado
          </label>
          <select [id]="uid + '-c10'" [(ngModel)]="filters.estado" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
            <option value="Todos">Todos</option>
            @for (est of listaEstados; track est) {
              <option [value]="est">{{ est }}</option>
            }
          </select>
        </div>
      }

      <!-- Período / Fechas -->
      @if (showFechas) {
        <div class="flex-1 min-w-[120px] max-w-full">
          <label [attr.for]="uid + '-c11'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="calendar-days" class="w-3.5 h-3.5 text-easydry-blue" aria-hidden="true"></i-lucide> Rango
          </label>
          <select [id]="uid + '-c11'" [(ngModel)]="filters.fecha" (change)="onUnidadCambio()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors select-chevron font-semibold cursor-pointer">
            @for (fec of listaFechas; track fec) {
              <option [value]="fec">{{ fec }}</option>
            }
          </select>
        </div>
      }

      @if (showFechas && (filters.fecha === 'Rango Personalizado' || filters.fecha === 'Personalizado')) {
        <div class="flex-1 min-w-[220px] max-w-full flex items-end gap-2">
          <div class="flex-1">
            <label [attr.for]="uid + '-c12'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Desde</label>
          <input [id]="uid + '-c12'" type="date" [value]="filters.fechaInicio || ''" (input)="onDesdeCambio($event)" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors font-medium">
          </div>
          <div class="flex-1">
            <label [attr.for]="uid + '-c13'" class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hasta</label>
          <input [id]="uid + '-c13'" type="date" [value]="filters.fechaFin || ''" (input)="onHastaCambio($event)" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors font-medium">
          </div>
        </div>
      }

      <!-- Botones Inyectados y Limpiar Filtros (Siempre al fondo derecho) -->
      <div class="ml-auto flex items-center justify-end gap-2 pb-0.5 mt-2 sm:mt-0 flex-initial">
        <ng-content select="[filter-actions]"></ng-content>
        <button
          type="button"
          (click)="resetFilters()"
          title="Limpiar filtros"
          aria-label="Limpiar filtros"
          class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold transition-colors border border-slate-200 hover:border-rose-200 cursor-pointer shadow-2xs group flex items-center justify-center">
          <i-lucide name="rotate-ccw" aria-hidden="true" class="w-4 h-4 text-slate-500 group-hover:text-rose-600 transition-transform group-hover:rotate-[-45deg]"></i-lucide>
        </button>
      </div>

    </div>
  `
})
export class FilterBarComponent implements OnInit {
  private static seq = 0;
  /** Prefijo único por instancia para enlazar label y control. */
  readonly uid = 'fb' + (++FilterBarComponent.seq);

  @Input() showRegion = false;
  @Input() showCliente = false;
  @Input() showMarca = false;
  @Input() showSucursal = true;
  @Input() showBodega = false;
  @Input() showOperador = false;
  @Input() showServicio = false;
  @Input() showBahia = false;
  @Input() showEstado = false;
  @Input() showRol = false;
  @Input() showFechas = true;
  @Input() showBusqueda = false;

  @Input() placeholderBusqueda = 'Buscar por nombre, documento u otro criterio...';

  @Input() set listaRoles(v: string[]) { this._listaRoles = v; this.customRoles = true; }
  get listaRoles(): string[] { return this._listaRoles; }
  @Input() set listaRegiones(v: string[]) { this._listaRegiones = v; this.customRegiones = true; }
  get listaRegiones(): string[] { return this._listaRegiones; }
  @Input() set listaClientes(v: string[]) { this._listaMarcas = v; this.customMarcas = true; }
  get listaClientes(): string[] { return this._listaMarcas; }
  @Input() set listaMarcas(v: string[]) { this._listaMarcas = v; this.customMarcas = true; }
  get listaMarcas(): string[] { return this._listaMarcas; }
  @Input() set listaBodegas(v: string[]) { this._listaBodegas = v; this.customBodegas = true; }
  get listaBodegas(): string[] { return this._listaBodegas; }
  @Input() set listaSucursales(v: string[]) { this._listaSucursales = v; this.customSucursales = true; }
  get listaSucursales(): string[] { return this._listaSucursales; }
  @Input() set listaOperadores(v: string[]) { this._listaOperadores = v; this.customOperadores = true; }
  get listaOperadores(): string[] { return this._listaOperadores; }
  @Input() set listaServicios(v: string[]) { this._listaServicios = v; this.customServicios = true; }
  get listaServicios(): string[] { return this._listaServicios; }
  @Input() set listaBahias(v: string[]) { this._listaBahias = v; this.customBahias = true; }
  get listaBahias(): string[] { return this._listaBahias; }
  @Input() set listaEstados(v: string[]) { this._listaEstados = v; this.customEstados = true; }
  get listaEstados(): string[] { return this._listaEstados; }
  @Input() listaFechas = ['Día', 'Semana', 'Mes', 'Año'];

  @Output() filterChange = new EventEmitter<FilterState>();

  private authService = inject(AuthService);
  private inventarioService = inject(InventarioService);
  private opciones = inject(OpcionesService);

  // ── Desplegables con buscador y scroll infinito ──
  // Si la pantalla no pasa su propia lista, agencias, regiones, clientes, lavadores, servicios y bahías se piden al servidor
  // por bloques (con búsqueda). El valor que se emite sigue siendo el NOMBRE, así que las pantallas no cambian.
  readonly cargadorRegiones = opcionesPorNombre(this.opciones.regiones({ estado: 1 }));
  readonly cargadorSucursales = opcionesPorNombre(this.opciones.agencias());
  readonly cargadorClientes = opcionesPorNombre(this.opciones.clientes({ estado: 1 }));
  readonly cargadorOperadores = opcionesPorNombre(this.opciones.operadores({ estado: 1 }));
  readonly cargadorServicios = opcionesPorNombre(this.opciones.servicios());
  readonly cargadorBahias = opcionesPorNombre(this.opciones.bahias());

  /** Controles con lista fija (la pantalla la pasó, o el rol solo puede elegir una opción): usan el <select> de siempre. */
  private fijos = new Set<string>();

  usaBuscador(clave: 'region' | 'sucursal' | 'cliente' | 'operador' | 'servicio' | 'bahia'): boolean {
    if (this.fijos.has(clave)) return false;
    switch (clave) {
      case 'region': return !this.customRegiones;
      case 'sucursal': return !this.customSucursales;
      case 'cliente': return !this.customMarcas;
      case 'operador': return !this.customOperadores;
      case 'servicio': return !this.customServicios;
      case 'bahia': return !this.customBahias;
    }
  }

  /** Valor mostrado por el buscador: null cuando está en "todas". */
  valorBuscador(valor: string | undefined, neutro: string): string | null {
    return !valor || valor === neutro ? null : valor;
  }

  alElegir(campo: 'region' | 'sucursal' | 'operador' | 'servicio' | 'bahia', valor: string | null, neutro: string): void {
    this.filters[campo] = valor ?? neutro;
    this.emitFilters();
  }

  alElegirCliente(valor: string | null): void {
    this.syncClienteMarca(valor ?? 'Todas');
    this.emitFilters();
  }

  private _listaRegiones: string[] = [];
  private _listaRoles: string[] = [];
  private _listaMarcas: string[] = [];
  private _listaBodegas: string[] = [];
  private _listaSucursales: string[] = [];
  private _listaOperadores: string[] = [];
  private _listaServicios: string[] = [];
  private _listaBahias: string[] = [];
  private _listaEstados: string[] = ['Activo', 'Inactivo', 'Pendiente', 'Aprobado', 'Rechazado'];

  private customSucursales = false;
  private customRoles = false;
  private customBahias = false;
  private customOperadores = false;
  private customRegiones = false;
  private customMarcas = false;
  private customServicios = false;
  private customEstados = false;
  private customBodegas = false;

  filters: FilterState = {
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

  ngOnInit(): void {
    this.fijarSegunRol();
    if (!this.customEstados) this.cargarEstados();
    // Solo cuando el desplegable de bodegas está visible: si no, se pedía el listado (y el rol sin
    // `inventario.ver` recibía un 403) en toda pantalla que use la barra de filtros.
    if (this.showBodega && !this.customBodegas) this.cargarBodegas();
  }

  /**
   * Roles que solo pueden elegir una opción: un aprobador o gerente queda en su sede y un supervisor en su región. Para
   * ellos no hace falta pedir nada: el desplegable tiene esa única opción y ya viene elegida (como antes).
   * (Los demás desplegables piden sus opciones al servidor, que aplica el alcance del rol.)
   */
  private fijarSegunRol(): void {
    const user = this.authService?.getCurrentUser();
    const rol = (user?.role || '').toUpperCase();
    const esSupervisor = rol === 'SUPERVISOR' || rol === 'GERENTE_REGIONAL' || rol.includes('SUPERVISOR') || rol.includes('REGIONAL');
    const esAprobador = rol === 'APROBADOR' || rol === 'GERENTE';

    const regionUsuario = String(user?.regionNombre || user?.region || '').trim();
    if (!this.customRegiones && esSupervisor && regionUsuario) {
      this.fijos.add('region');
      this._listaRegiones = [regionUsuario];
      this.filters.region = regionUsuario;
      this.emitFilters();
    }

    const sedeUsuario = String(user?.sucursalNombre || user?.sucursal || '').trim();
    if (!this.customSucursales && esAprobador && sedeUsuario) {
      this.fijos.add('sucursal');
      this._listaSucursales = [sedeUsuario];
      this.filters.sucursal = sedeUsuario;
      this.emitFilters();
    }
  }

  /** Las bodegas son pocas: se piden completas (no hay buscador). */
  cargarBodegas(): void {
    this.inventarioService.getBodegas().subscribe(list => {
      this._listaBodegas = Array.from(new Set(
        (list || []).filter(b => b.activa !== false).map(b => b.nombre).filter(Boolean)
      )).sort();
    });
  }

  cargarEstados(): void {
    this._listaEstados = ['Activo', 'Inactivo', 'Pendiente', 'Aprobado', 'Rechazado'];
  }

  syncClienteMarca(val: string): void {
    this.filters.cliente = val;
    this.filters.marca = val;
  }

  emitFilters(): void {
    if (this.filters.cliente && (!this.filters.marca || this.filters.marca === 'Todas')) {
      this.filters.marca = this.filters.cliente;
    } else if (this.filters.marca && (!this.filters.cliente || this.filters.cliente === 'Todas')) {
      this.filters.cliente = this.filters.marca;
    }
    this.filterChange.emit({ ...this.filters });
  }

  // ── Fechas: auto-cálculo del rango según la unidad ──

  /** Convierte un valor de <input type="date"> (YYYY-MM-DD) en un Date local. */
  private parseFecha(valor: string): Date | null {
    if (!valor) return null;
    const [y, m, d] = valor.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  /** Formatea un Date a YYYY-MM-DD. */
  private formatearFecha(d: Date): string {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  /** Último día del mes de una fecha. */
  private finDeMes(d: Date): string {
    return this.formatearFecha(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }

  /** Primer día del mes de una fecha. */
  private inicioDeMes(d: Date): string {
    return this.formatearFecha(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  /**
   * Al cambiar la unidad (Semana/Mes/Año/Día): si ya hay un rango establecido,
   * lo recalcula tomando la fecha "Desde" como ancla.
   */
  onUnidadCambio(): void {
    if (this.filters.fechaInicio) {
      this.filters.fechaFin = this.calcularFinDesdeInicio(this.filters.fechaInicio);
    }
    this.emitFilters();
  }

  private calcularFinDesdeInicio(desde: string): string {
    const d = this.parseFecha(desde);
    if (!d) return '';
    switch (this.filters.fecha) {
      case 'Día': return desde;
      case 'Semana': return this.formatearFecha(new Date(d.getTime() + 6 * 86400000));
      case 'Año': return `${d.getFullYear()}-12-31`;
      case 'Mes':
      default: return this.finDeMes(d);
    }
  }

  private calcularInicioDesdeFin(hasta: string): string {
    const d = this.parseFecha(hasta);
    if (!d) return '';
    switch (this.filters.fecha) {
      case 'Día': return hasta;
      case 'Semana': return this.formatearFecha(new Date(d.getTime() - 6 * 86400000));
      case 'Año': return `${d.getFullYear()}-01-01`;
      case 'Mes':
      default: return this.inicioDeMes(d);
    }
  }

  onDesdeCambio(ev: Event): void {
    const desde = (ev.target as HTMLInputElement).value;
    this.filters.fechaInicio = desde;
    if (!desde) {
      this.emitFilters();
      return;
    }
    // Auto-cálculo de la fecha final a partir de la inicial (excepto en "Día" donde el rango es libre).
    if (this.filters.fecha !== 'Día') {
      this.filters.fechaFin = this.calcularFinDesdeInicio(desde);
    }
    this.emitFilters();
  }

  onHastaCambio(ev: Event): void {
    const hasta = (ev.target as HTMLInputElement).value;
    this.filters.fechaFin = hasta;
    if (!hasta) {
      this.emitFilters();
      return;
    }
    // Auto-cálculo de la fecha inicial a partir de la final (excepto en "Día" donde el rango es libre).
    if (this.filters.fecha !== 'Día') {
      this.filters.fechaInicio = this.calcularInicioDesdeFin(hasta);
    }
    this.emitFilters();
  }

  clearBusqueda(): void {
    this.filters.busqueda = '';
    this.emitFilters();
  }

  resetFilters(): void {
    this.filters = {
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
    this.emitFilters();
  }
}

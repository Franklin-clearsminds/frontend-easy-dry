import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SucursalService } from '../../../core/services/sucursal.service';
import { BahiaService } from '../../../core/services/bahia.service';
import { OperadorService } from '../../../core/services/operador.service';
import { RegionService } from '../../../core/services/region.service';
import { MarcaSucursalService } from '../../../core/services/marca-sucursal.service';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogoServiciosService } from '../../../core/services/catalogo-servicios.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { MarcaSucursal } from '../../../core/models';

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
  [customKey: string]: any;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  host: { class: 'block' },
  template: `
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry flex flex-wrap gap-3 items-end z-20 relative animate-fade-in">

      <!-- Búsqueda por texto (Doble de espacio / Ancho prominente) -->
      @if (showBusqueda) {
        <div class="flex-[2_2_320px] min-w-[280px] sm:min-w-[340px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="search" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Búsqueda
          </label>
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="filters.busqueda"
              (input)="emitFilters()"
              [placeholder]="placeholderBusqueda"
              class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-9 pr-8 py-2 focus:ring-2 focus:ring-easydry-blue focus:bg-white focus:border-transparent transition-all placeholder:text-slate-400 font-medium">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <i-lucide name="search" class="w-3.5 h-3.5"></i-lucide>
            </span>
            @if (filters.busqueda) {
              <button
                type="button"
                (click)="clearBusqueda()"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
                <i-lucide name="x" class="w-3.5 h-3.5"></i-lucide>
              </button>
            }
          </div>
        </div>
      }

      <!-- Región -->
      @if (showRegion) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="globe" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Región
          </label>
          <select [(ngModel)]="filters.region" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todas">Todas las Regiones</option>
            @for (reg of listaRegiones; track reg) {
              <option [value]="reg">{{ reg }}</option>
            }
          </select>
        </div>
      }

      <!-- Agencia -->
      @if (showSucursal) {
        <div class="flex-1 min-w-[150px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="map-pin" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Agencia
          </label>
          <select [(ngModel)]="filters.sucursal" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todas">Todas las Agencias</option>
            @for (suc of listaSucursales; track suc) {
              <option [value]="suc">{{ suc }}</option>
            }
          </select>
        </div>
      }

      <!-- Cliente -->
      @if (showCliente || showMarca) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="briefcase" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Cliente
          </label>
          <select [(ngModel)]="filters.cliente" (ngModelChange)="syncClienteMarca($event); emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todas">Todos los Clientes</option>
            @for (m of listaClientes; track m) {
              <option [value]="m">{{ m }}</option>
            }
          </select>
        </div>
      }

      <!-- Bodega -->
      @if (showBodega) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="warehouse" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Bodega
          </label>
          <select [(ngModel)]="filters.bodega" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
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
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="users" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Lavador
          </label>
          <select [(ngModel)]="filters.operador" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todos">Todos los Lavadores</option>
            @for (op of listaOperadores; track op) {
              <option [value]="op">{{ op }}</option>
            }
          </select>
        </div>
      }

      <!-- Servicio -->
      @if (showServicio) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="sparkles" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Tipo de Servicio
          </label>
          <select [(ngModel)]="filters.servicio" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todos">Todos los Servicios</option>
            @for (serv of listaServicios; track serv) {
              <option [value]="serv">{{ serv }}</option>
            }
          </select>
        </div>
      }

      <!-- Bahía -->
      @if (showBahia) {
        <div class="flex-1 min-w-[110px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="layout-grid" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Bahía
          </label>
          <select [(ngModel)]="filters.bahia" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todas">Todas</option>
            @for (bahia of listaBahias; track bahia) {
              <option [value]="bahia">{{ bahia }}</option>
            }
          </select>
        </div>
      }

      <!-- Estado -->
      @if (showEstado) {
        <div class="flex-1 min-w-[120px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="check-circle" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Estado
          </label>
          <select [(ngModel)]="filters.estado" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
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
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="calendar-days" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Rango
          </label>
          <select [(ngModel)]="filters.fecha" (change)="onUnidadCambio()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            @for (fec of listaFechas; track fec) {
              <option [value]="fec">{{ fec }}</option>
            }
          </select>
        </div>
      }
      
      @if (showFechas && (filters.fecha === 'Rango Personalizado' || filters.fecha === 'Personalizado')) {
        <div class="flex-1 min-w-[220px] max-w-full flex items-end gap-2">
          <div class="flex-1">
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Desde</label>
            <input type="date" [value]="filters.fechaInicio || ''" (input)="onDesdeCambio($event)" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors font-medium">
          </div>
          <div class="flex-1">
            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hasta</label>
            <input type="date" [value]="filters.fechaFin || ''" (input)="onHastaCambio($event)" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors font-medium">
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
          class="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold transition-all border border-slate-200 hover:border-rose-200 cursor-pointer shadow-2xs group flex items-center justify-center">
          <i-lucide name="rotate-ccw" class="w-4 h-4 text-slate-500 group-hover:text-rose-600 transition-transform group-hover:rotate-[-45deg]"></i-lucide>
        </button>
      </div>

    </div>
  `
})
export class FilterBarComponent implements OnInit {
  @Input() showRegion = false;
  @Input() showCliente = false;
  @Input() showMarca = false;
  @Input() showSucursal = true;
  @Input() showBodega = false;
  @Input() showOperador = false;
  @Input() showServicio = false;
  @Input() showBahia = false;
  @Input() showEstado = false;
  @Input() showFechas = true;
  @Input() showBusqueda = false;

  @Input() placeholderBusqueda = 'Buscar por nombre, documento u otro criterio...';

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

  private sucursalService = inject(SucursalService);
  private bahiaService = inject(BahiaService);
  private operadorService = inject(OperadorService);
  private regionService = inject(RegionService);
  private marcaService = inject(MarcaSucursalService);
  private authService = inject(AuthService);
  private catalogoServicios = inject(CatalogoServiciosService);
  private inventarioService = inject(InventarioService);

  private _listaRegiones: string[] = [];
  private _listaMarcas: string[] = [];
  private _listaBodegas: string[] = [];
  private _listaSucursales: string[] = [];
  private _listaOperadores: string[] = [];
  private _listaServicios: string[] = [];
  private _listaBahias: string[] = [];
  private _listaEstados: string[] = ['Activo', 'Inactivo', 'Pendiente', 'Aprobado', 'Rechazado'];

  private customSucursales = false;
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
    fecha: 'Mes',
    fechaInicio: '',
    fechaFin: '',
    busqueda: ''
  };

  ngOnInit(): void {
    if (!this.customSucursales) this.cargarSucursales();
    if (!this.customBahias) this.cargarBahias();
    if (!this.customOperadores) this.cargarOperadores();
    if (!this.customRegiones) this.cargarRegiones();
    if (!this.customMarcas) this.cargarMarcas();
    if (!this.customServicios) this.cargarServicios();
    if (!this.customEstados) this.cargarEstados();
    if (!this.customBodegas) this.cargarBodegas();
  }

  cargarSucursales(): void {
    const user = this.authService?.getCurrentUser();
    const rol = (user?.role || '').toUpperCase();
    const isSupervisor = rol === 'SUPERVISOR' || rol === 'GERENTE_REGIONAL' || rol.includes('SUPERVISOR') || rol.includes('REGIONAL');
    const isAprobador = rol === 'APROBADOR' || rol === 'GERENTE';

    this.sucursalService.getSucursales().subscribe(list => {
      let filtered = list;
      if (isSupervisor && (user?.regionId || user?.region || user?.regionNombre)) {
        const uReg = (user.regionNombre || user.region || '').toLowerCase();
        filtered = list.filter(s =>
          (user.regionId && String(s.regionId) === String(user.regionId)) ||
          (uReg && s.regionNombre && s.regionNombre.toLowerCase() === uReg) ||
          (uReg && s.ciudad && s.ciudad.toLowerCase() === uReg)
        );
      } else if (isAprobador && (user?.agenciaId || user?.sucursalNombre || user?.sucursal)) {
        filtered = list.filter(s =>
          (user.agenciaId && String(s.id) === String(user.agenciaId)) ||
          (user.sucursalNombre && s.nombre.toLowerCase() === user.sucursalNombre.toLowerCase()) ||
          (user.sucursal && s.nombre.toLowerCase() === user.sucursal.toLowerCase())
        );
      }
      const nombres = Array.from(new Set(filtered.map(s => s.nombre))).sort();
      this._listaSucursales = nombres;
      if (isAprobador && nombres.length === 1) {
        this.filters.sucursal = nombres[0];
        this.emitFilters();
      }
    });
  }

  cargarBahias(): void {
    this.bahiaService.getBahias().subscribe(list => {
      this._listaBahias = Array.from(new Set(list.map(b => b.nombre))).sort();
    });
  }

  cargarOperadores(): void {
    this.operadorService.getOperadores().subscribe(list => {
      this._listaOperadores = Array.from(new Set(
        list.filter(o => o.estado === 'Activo').map(o => o.nombre || o.cedula).filter(Boolean)
      )).sort();
    });
  }

  cargarRegiones(): void {
    const user = this.authService?.getCurrentUser();
    const rol = (user?.role || '').toUpperCase();
    const isSupervisor = rol === 'SUPERVISOR' || rol === 'GERENTE_REGIONAL' || rol.includes('SUPERVISOR') || rol.includes('REGIONAL');

    this.regionService.getRegiones().subscribe(list => {
      let regiones = list.filter(r => r.estado === 'Activa');
      if (isSupervisor && (user?.regionId || user?.region || user?.regionNombre)) {
        const uReg = (user.regionNombre || user.region || '').toLowerCase();
        regiones = regiones.filter(r =>
          (user.regionId && String(r.id) === String(user.regionId)) ||
          (uReg && r.nombre.toLowerCase() === uReg)
        );
      }
      this._listaRegiones = [...new Set(regiones.map(r => r.nombre).filter(Boolean))];
      if (isSupervisor && this._listaRegiones.length === 1) {
        this.filters.region = this._listaRegiones[0];
        this.emitFilters();
      }
    });
  }

  cargarMarcas(): void {
    this.marcaService.getMarcas().subscribe(marcas => {
      this._listaMarcas = [...new Set(marcas.filter((m: MarcaSucursal) => m.estado === 'Activa').map((m: MarcaSucursal) => m.nombre).filter(Boolean))];
    });
  }

  cargarServicios(): void {
    this.catalogoServicios.getServicios().subscribe(list => {
      this._listaServicios = Array.from(new Set(
        (list || []).map(s => s.nombre).filter(Boolean)
      )).sort();
    });
  }

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
      fecha: 'Mes',
      fechaInicio: '',
      fechaFin: '',
      busqueda: ''
    };
    this.emitFilters();
  }
}

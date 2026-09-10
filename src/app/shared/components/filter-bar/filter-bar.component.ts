import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SucursalMockService } from '../../../core/services/sucursal-mock.service';
import { BahiaMockService } from '../../../core/services/bahia-mock.service';
import { OperadorMockService } from '../../../core/services/operador-mock.service';
import { RegionMockService } from '../../../core/services/region-mock.service';
import { MarcaSucursalMockService } from '../../../core/services/marca-sucursal-mock.service';
import { MarcaSucursal } from '../../../core/models';

export interface FilterState {
  sucursal: string;
  region?: string;
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

      <!-- Marca -->
      @if (showMarca) {
        <div class="flex-1 min-w-[140px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="tag" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Marca
          </label>
          <select [(ngModel)]="filters.marca" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todas">Todas las Marcas</option>
            @for (m of listaMarcas; track m) {
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

      <!-- Operador -->
      @if (showOperador) {
        <div class="flex-1 min-w-[150px] max-w-full">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="users" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Operador Técnico
          </label>
          <select [(ngModel)]="filters.operador" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todos">Todos los Operadores</option>
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
  @Input() set listaMarcas(v: string[]) { this._listaMarcas = v; this.customMarcas = true; }
  get listaMarcas(): string[] { return this._listaMarcas; }
  @Input() set listaBodegas(v: string[]) { this._listaBodegas = v; }
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

  private sucursalService = inject(SucursalMockService);
  private bahiaService = inject(BahiaMockService);
  private operadorService = inject(OperadorMockService);
  private regionService = inject(RegionMockService);
  private marcaService = inject(MarcaSucursalMockService);

  private _listaRegiones: string[] = ['Región Sierra', 'Región Costa', 'Región Austro'];
  private _listaMarcas: string[] = ['EasyDry', 'EasyDry Premium', 'EasyDry Express'];
  private _listaBodegas: string[] = ['Bodega Central', 'Bodega Norte', 'Bodega Sur'];
  private _listaSucursales: string[] = ['Quito Norte', 'Quito Sur', 'Cumbayá', 'Guayaquil', 'Cuenca'];
  private _listaOperadores: string[] = ['Carlos Torres', 'Marta Ruiz', 'Luis Mendez', 'Ana Gómez', 'Diego Pulido Norte'];
  private _listaServicios: string[] = ['Express', 'Completo', 'Deluxe', 'Pulido Especial', 'Micro pulido', 'Recubrimiento Cerámico', 'Lavado motor'];
  private _listaBahias: string[] = ['Bahía 1', 'Bahía 2', 'Bahía 3', 'Bahía 4', 'Bahía 5'];
  private _listaEstados: string[] = ['Activo', 'Inactivo', 'Pendiente', 'Aprobado', 'Rechazado'];

  private customSucursales = false;
  private customBahias = false;
  private customOperadores = false;
  private customRegiones = false;
  private customMarcas = false;
  private customServicios = false;
  private customEstados = false;

  filters: FilterState = {
    sucursal: 'Todas',
    region: 'Todas',
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
  }

  cargarSucursales(): void {
    this.sucursalService.getSucursales().subscribe(list => {
      const nombres = Array.from(new Set(list.map(s => s.nombre))).sort();
      if (nombres.length) this._listaSucursales = nombres;
    });
  }

  cargarBahias(): void {
    this.bahiaService.getBahias().subscribe(list => {
      const nombres = Array.from(new Set(list.map(b => b.nombre))).sort();
      if (nombres.length) this._listaBahias = nombres;
    });
  }

  cargarOperadores(): void {
    this.operadorService.getOperadores().subscribe(list => {
      const nombres = Array.from(new Set(list.filter(o => o.estado === 'Activo').map(o => o.nombre || o.cedula).filter(Boolean))).sort();
      if (nombres.length) this._listaOperadores = nombres;
    });
  }

  cargarRegiones(): void {
    const nombres = this.regionService.getActivas().map(r => r.nombre).filter(Boolean);
    if (nombres.length) this._listaRegiones = [...new Set(nombres)];
  }

  cargarMarcas(): void {
    const marcas = this.marcaService.getActivas();
    const nombres = marcas.map((m: MarcaSucursal) => m.nombre).filter(Boolean);
    if (nombres.length) this._listaMarcas = [...new Set(nombres)];
  }

  cargarServicios(): void {
    // Mantener una lista base razonable de servicios de lavado del catálogo.
    this._listaServicios = ['Express', 'Completo', 'Deluxe', 'Retoque', 'Pulido', 'Micro pulido', 'Recubrimiento Cerámico', 'Lavado motor', 'Tratamientos especiales'];
  }

  cargarEstados(): void {
    this._listaEstados = ['Activo', 'Inactivo', 'Pendiente', 'Aprobado', 'Rechazado'];
  }

  emitFilters(): void {
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

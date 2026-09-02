import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface FilterState {
  sucursal: string;
  region?: string;
  operador: string;
  servicio?: string;
  bahia: string;
  estado: string;
  fecha: string;
  fechaInicio?: string;
  fechaFin?: string;
  [customKey: string]: any;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry flex flex-wrap gap-4 items-end z-20 relative animate-fade-in mb-6">
      
      <!-- Región -->
      @if (showRegion) {
        <div class="flex-1 min-w-[170px]">
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

      <!-- Sucursal -->
      @if (showSucursal) {
        <div class="flex-1 min-w-[190px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="map-pin" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Sucursal / Agencia
          </label>
          <select [(ngModel)]="filters.sucursal" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            <option value="Todas">Todas las Sucursales</option>
            @for (suc of listaSucursales; track suc) {
              <option [value]="suc">{{ suc }}</option>
            }
          </select>
        </div>
      }

      <!-- Operador -->
      @if (showOperador) {
        <div class="flex-1 min-w-[180px]">
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
        <div class="flex-1 min-w-[170px]">
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
        <div class="flex-1 min-w-[140px]">
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
        <div class="flex-1 min-w-[140px]">
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
        <div class="flex-1 min-w-[180px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="calendar-days" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Período
          </label>
          <select [(ngModel)]="filters.fecha" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-semibold cursor-pointer">
            @for (fec of listaFechas; track fec) {
              <option [value]="fec">{{ fec }}</option>
            }
          </select>
        </div>

        @if (filters.fecha === 'Personalizado') {
          <div class="flex-1 min-w-[280px] flex items-end gap-2 animate-fade-in">
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Desde</label>
              <input type="date" [(ngModel)]="filters.fechaInicio" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors font-medium">
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hasta</label>
              <input type="date" [(ngModel)]="filters.fechaFin" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors font-medium">
            </div>
          </div>
        }
      }

      <!-- Botón Limpiar Filtros con Icono y Estado Activo -->
      <div class="w-auto flex items-center self-end pb-0.5">
        <button
          type="button"
          (click)="resetFilters()"
          title="Restaurar valores iniciales de filtro"
          class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-200 hover:border-rose-200 cursor-pointer shadow-2xs">
          <i-lucide name="rotate-ccw" class="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-600"></i-lucide>
          <span>Limpiar filtros</span>
        </button>
      </div>

    </div>
  `
})
export class FilterBarComponent {
  @Input() showRegion = false;
  @Input() showSucursal = true;
  @Input() showOperador = false;
  @Input() showServicio = false;
  @Input() showBahia = false;
  @Input() showEstado = false;
  @Input() showFechas = true;

  @Input() listaRegiones: string[] = ['Región Sierra', 'Región Costa', 'Región Austro'];
  @Input() listaSucursales = ['Quito Norte', 'Quito Sur', 'Cumbayá', 'Guayaquil', 'Cuenca'];
  @Input() listaOperadores = ['Carlos Torres', 'Marta Ruiz', 'Luis Mendez', 'Ana Gómez', 'Diego Pulido Norte'];
  @Input() listaServicios = ['Express', 'Completo', 'Deluxe', 'Pulido Especial', 'Micro pulido', 'Recubrimiento Cerámico', 'Lavado motor'];
  @Input() listaBahias = ['Bahía 1', 'Bahía 2', 'Bahía 3', 'Bahía 4', 'Bahía 5'];
  @Input() listaEstados: string[] = ['Activo', 'Inactivo', 'Pendiente', 'Aprobado', 'Rechazado'];
  @Input() listaFechas = ['Hoy', 'Esta Semana', 'Este Mes', 'Este Año', 'Personalizado'];

  @Output() filterChange = new EventEmitter<FilterState>();

  filters: FilterState = {
    sucursal: 'Todas',
    region: 'Todas',
    operador: 'Todos',
    servicio: 'Todos',
    bahia: 'Todas',
    estado: 'Todos',
    fecha: 'Hoy',
    fechaInicio: '',
    fechaFin: ''
  };

  emitFilters(): void {
    this.filterChange.emit({ ...this.filters });
  }

  resetFilters(): void {
    this.filters = {
      sucursal: 'Todas',
      region: 'Todas',
      operador: 'Todos',
      servicio: 'Todos',
      bahia: 'Todas',
      estado: 'Todos',
      fecha: 'Hoy',
      fechaInicio: '',
      fechaFin: ''
    };
    this.emitFilters();
  }
}

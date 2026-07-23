import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface FilterState {
  sucursal: string;
  operador: string;
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
      
      <!-- Sucursal -->
      @if (showSucursal) {
        <div class="flex-1 min-w-[200px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="map-pin" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Sucursal
          </label>
          <select [(ngModel)]="filters.sucursal" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-medium cursor-pointer">
            <option value="Todas">Todas las Sucursales</option>
            @for (suc of listaSucursales; track suc) {
              <option [value]="suc">{{ suc }}</option>
            }
          </select>
        </div>
      }

      <!-- Operador -->
      @if (showOperador) {
        <div class="flex-1 min-w-[200px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="users" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Operador
          </label>
          <select [(ngModel)]="filters.operador" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-medium cursor-pointer">
            <option value="Todos">Todos los Operadores</option>
            @for (op of listaOperadores; track op) {
              <option [value]="op">{{ op }}</option>
            }
          </select>
        </div>
      }

      <!-- Bahía -->
      @if (showBahia) {
        <div class="flex-1 min-w-[150px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="layout-grid" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Bahía
          </label>
          <select [(ngModel)]="filters.bahia" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-medium cursor-pointer">
            <option value="Todas">Todas</option>
            @for (bahia of listaBahias; track bahia) {
              <option [value]="bahia">{{ bahia }}</option>
            }
          </select>
        </div>
      }

      <!-- Estado -->
      @if (showEstado) {
        <div class="flex-1 min-w-[150px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="check-circle" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Estado
          </label>
          <select [(ngModel)]="filters.estado" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-medium cursor-pointer">
            <option value="Todos">Todos</option>
            @for (est of listaEstados; track est) {
              <option [value]="est">{{ est }}</option>
            }
          </select>
        </div>
      }

      <!-- Período / Fechas -->
      @if (showFechas) {
        <div class="flex-1 min-w-[200px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <i-lucide name="calendar-days" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide> Período
          </label>
          <select [(ngModel)]="filters.fecha" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors appearance-none font-medium cursor-pointer">
            @for (fec of listaFechas; track fec) {
              <option [value]="fec">{{ fec }}</option>
            }
          </select>
        </div>

        @if (filters.fecha === 'Personalizado') {
          <div class="flex-1 min-w-[300px] flex items-end gap-2 animate-fade-in">
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Desde</label>
              <input type="date" [(ngModel)]="filters.fechaInicio" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors">
            </div>
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Hasta</label>
              <input type="date" [(ngModel)]="filters.fechaFin" (change)="emitFilters()" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-easydry-blue transition-colors">
            </div>
          </div>
        }
      }

      <!-- Botón Limpiar -->
      <div class="w-auto flex items-center">
        <button (click)="resetFilters()" class="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-2 transition-colors flex items-center gap-1">
          <i-lucide name="x-circle" class="w-4 h-4"></i-lucide> Limpiar
        </button>
      </div>

    </div>
  `
})
export class FilterBarComponent {
  @Input() showSucursal = true;
  @Input() showOperador = false;
  @Input() showBahia = false;
  @Input() showEstado = false;
  @Input() showFechas = true;

  @Input() listaEstados: string[] = ['Activo', 'Inactivo', 'Pendiente', 'Aprobado', 'Rechazado']; // Puede ser sobreescrito

  @Output() filterChange = new EventEmitter<FilterState>();

  listaSucursales = ['Quito Norte', 'Quito Sur', 'Cumbayá', 'Guayaquil'];
  listaOperadores = ['Carlos Torres', 'Marta Ruiz', 'Luis Mendez', 'Ana Gómez'];
  listaBahias = ['Bahía 1', 'Bahía 2', 'Bahía 3', 'Bahía 4', 'Bahía 5'];
  listaFechas = ['Hoy', 'Esta Semana', 'Este Mes', 'Este Año', 'Personalizado'];

  filters: FilterState = {
    sucursal: 'Todas',
    operador: 'Todos',
    bahia: 'Todas',
    estado: 'Todos',
    fecha: 'Hoy',
    fechaInicio: '',
    fechaFin: ''
  };

  emitFilters() {
    // Clona el estado actual y lo emite
    this.filterChange.emit({ ...this.filters });
  }

  resetFilters() {
    this.filters = {
      sucursal: 'Todas',
      operador: 'Todos',
      bahia: 'Todas',
      estado: 'Todos',
      fecha: 'Hoy',
      fechaInicio: '',
      fechaFin: ''
    };
    this.emitFilters();
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { IncidentesComponent } from '../incidentes/incidentes.component';
import { MantenimientoComponent } from '../mantenimiento/mantenimiento.component';

@Component({
  selector: 'app-taller-tecnico',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, IncidentesComponent, MantenimientoComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Unified Header -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-2">
              <i-lucide name="wrench" class="w-3.5 h-3.5"></i-lucide>
              <span>Gestión Técnica y Taller</span>
            </div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Centro de Control Técnico</h1>
            <p class="text-slate-500 text-xs mt-1">
              Administración unificada de mantenimientos preventivos y resolución de fallos de maquinaria.
            </p>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="flex items-center gap-6 mt-6 pt-2 border-b border-slate-200">
          <button 
            (click)="activeTab = 'mantenimiento'"
            class="pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2"
            [ngClass]="activeTab === 'mantenimiento' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="calendar-clock" class="w-4 h-4"></i-lucide>
            Mantenimientos
          </button>
          
          <button 
            (click)="activeTab = 'incidentes'"
            class="pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5"
            [ngClass]="activeTab === 'incidentes' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="alert-triangle" class="w-4 h-4"></i-lucide>
            <span>Registro de Incidentes</span>
            <span class="inline-flex items-center justify-center -translate-y-1 ml-0.5">
              <svg class="w-3.5 h-3.5 shrink-0 drop-shadow-xs" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#FF2B2B"/>
                <path d="M10.2 6.4C10.2 5.4 11 4.6 12 4.6C13 4.6 13.8 5.4 13.8 6.4L13.4 14.2C13.4 15 12.8 15.6 12 15.6C11.2 15.6 10.6 15 10.6 14.2L10.2 6.4Z" fill="white"/>
                <circle cx="12" cy="18.6" r="1.6" fill="white"/>
              </svg>
            </span>
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="mt-4">
        @if (activeTab === 'mantenimiento') {
          <app-mantenimiento [hideHeader]="true"></app-mantenimiento>
        }
        @if (activeTab === 'incidentes') {
          <app-incidentes [hideHeader]="true"></app-incidentes>
        }
      </div>
      
    </div>
  `
})
export class TallerTecnicoComponent {
  activeTab: 'mantenimiento' | 'incidentes' = 'mantenimiento';
}

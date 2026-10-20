import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { IncidentesComponent } from '../incidentes/incidentes.component';
import { AuthService } from '../../core/services/auth.service';
import { puedeVerIncidentes, puedeVerMantenimientos } from '../../core/utils/maquinaria-permisos';
import { MantenimientoComponent } from '../mantenimiento/mantenimiento.component';
import { LimpiezasComponent } from '../limpiezas/limpiezas.component';
import { IncidenteService } from '../../core/services/incidente.service';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-taller-tecnico',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, IncidentesComponent, MantenimientoComponent, LimpiezasComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Unified Header -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-2">
              <i-lucide name="wrench" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
              <span>Gestión Técnica y Taller</span>
            </div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Centro de Control Técnico</h1>
            <p class="text-slate-500 text-xs mt-1">
              Administración unificada de mantenimientos preventivos y resolución de fallos de maquinaria.
            </p>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="flex items-center gap-6 mt-6 pt-2 border-b border-slate-200" role="tablist" aria-label="Secciones del centro técnico">
          @if (verMantenimientos) {
          <button 
            type="button"
            role="tab"
            id="tab-taller-mantenimiento"
            aria-controls="panel-taller-mantenimiento"
            [attr.aria-selected]="activeTab === 'mantenimiento'"
            (click)="activeTab = 'mantenimiento'"
            class="pb-3 min-h-10 text-sm font-bold border-b-2 transition-colors flex items-center gap-2"
            [ngClass]="activeTab === 'mantenimiento' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="calendar-clock" class="w-4 h-4" aria-hidden="true"></i-lucide>
            Mantenimientos
          </button>
          }
          
          @if (verIncidentes) {
          <button 
            type="button"
            role="tab"
            id="tab-taller-incidentes"
            aria-controls="panel-taller-incidentes"
            [attr.aria-selected]="activeTab === 'incidentes'"
            (click)="activeTab = 'incidentes'"
            class="pb-3 min-h-10 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5"
            [ngClass]="activeTab === 'incidentes' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="alert-triangle" class="w-4 h-4" aria-hidden="true"></i-lucide>
            <span>Registro de Incidentes</span>
            @if (hayIncidentesPendientes$ | async) {
              <span class="inline-flex items-center justify-center -translate-y-1 ml-0.5">
                <svg class="w-3.5 h-3.5 shrink-0 drop-shadow-xs text-rose-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="12" cy="12" r="12" fill="currentColor"/>
                  <path d="M10.2 6.4C10.2 5.4 11 4.6 12 4.6C13 4.6 13.8 5.4 13.8 6.4L13.4 14.2C13.4 15 12.8 15.6 12 15.6C11.2 15.6 10.6 15 10.6 14.2L10.2 6.4Z" fill="white"/>
                  <circle cx="12" cy="18.6" r="1.6" fill="white"/>
                </svg>
                <span class="sr-only">Hay incidencias sin atender</span>
              </span>
            }
          </button>
          }

          @if (verLimpiezas) {
          <button
            type="button"
            role="tab"
            id="tab-taller-limpiezas"
            aria-controls="panel-taller-limpiezas"
            [attr.aria-selected]="activeTab === 'limpiezas'"
            (click)="activeTab = 'limpiezas'"
            class="pb-3 min-h-10 text-sm font-bold border-b-2 transition-colors flex items-center gap-2"
            [ngClass]="activeTab === 'limpiezas' ? 'border-cyan-500 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide name="sparkles" class="w-4 h-4" aria-hidden="true"></i-lucide>
            Limpiezas
          </button>
          }
        </div>
      </div>

      <!-- Tab Content -->
      <div class="mt-4">
        @if (activeTab === 'mantenimiento' && verMantenimientos) {
          <div role="tabpanel" id="panel-taller-mantenimiento" aria-labelledby="tab-taller-mantenimiento">
            <app-mantenimiento [hideHeader]="true"></app-mantenimiento>
          </div>
        }
        @if (activeTab === 'incidentes' && verIncidentes) {
          <div role="tabpanel" id="panel-taller-incidentes" aria-labelledby="tab-taller-incidentes">
            <app-incidentes [hideHeader]="true"></app-incidentes>
          </div>
        }
        @if (activeTab === 'limpiezas' && verLimpiezas) {
          <div role="tabpanel" id="panel-taller-limpiezas" aria-labelledby="tab-taller-limpiezas">
            <app-limpiezas [hideHeader]="true"></app-limpiezas>
          </div>
        }
      </div>

    </div>
  `
})
export class TallerTecnicoComponent {
  private auth = inject(AuthService);
  verMantenimientos = puedeVerMantenimientos(this.auth);
  verIncidentes = puedeVerIncidentes(this.auth);
  // Auditoría de limpiezas: admin/super admin (todo el país), supervisor y coord. mantenimiento (su
  // región), coord. de servicios especiales (sus pulidores) — el backend resuelve el alcance.
  verLimpiezas = this.auth.puede('limpiezas.ver');
  activeTab: 'mantenimiento' | 'incidentes' | 'limpiezas' =
    this.verMantenimientos ? 'mantenimiento' : (this.verIncidentes ? 'incidentes' : 'limpiezas');

  private incidenteService = inject(IncidenteService);
  hayIncidentesPendientes$ = this.verIncidentes
    ? this.incidenteService.getIncidentesPagina({ soloNoAtendidas: true, pageSize: 1, incluirResumen: true }).pipe(
        map(res => (res.resumen?.noAtendidas ?? res.pagina.total ?? res.pagina.items?.length ?? 0) > 0),
        catchError(() => of(false))
      )
    : of(false);
}

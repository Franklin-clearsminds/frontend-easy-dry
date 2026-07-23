import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ServicioLavadoMockService } from '../../core/services/servicio-lavado-mock.service';
import { VehiculoServicio } from '../../core/models';

@Component({
  selector: 'app-mi-bahia',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Encabezado de Contexto del Operador -->
      <div class="bg-gradient-to-r from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep rounded-3xl p-6 text-white relative overflow-hidden">
        <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-green/20 text-easydry-lime border border-easydry-green/40 text-xs font-bold mb-3">
              <i-lucide name="map-pin" class="w-3.5 h-3.5"></i-lucide>
              <span>Mi Área de Trabajo</span>
            </div>
            <h1 class="text-2xl font-extrabold font-outfit">{{ user?.nombre }} {{ user?.apellido }}</h1>
            <p class="text-easydry-lime font-semibold text-sm mt-1">Operador de Bahía</p>

            <div class="flex items-center gap-4 mt-3 flex-wrap">
              <div class="flex items-center gap-2 text-slate-200 text-sm">
                <i-lucide name="building-2" class="w-4 h-4 text-easydry-green"></i-lucide>
                <span class="font-semibold">{{ user?.sucursalNombre || 'Sin sucursal' }}</span>
              </div>
              <div class="flex items-center gap-2 text-slate-200 text-sm">
                <i-lucide name="hard-drive" class="w-4 h-4 text-easydry-lime"></i-lucide>
                <span class="font-semibold">{{ user?.bahiaNombre || 'Sin bahía asignada' }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <a routerLink="/servicios"
              class="px-5 py-3 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-bold rounded-xl text-sm transition-all shadow-glow-green flex items-center gap-2">
              <i-lucide name="plus-circle" class="w-4 h-4"></i-lucide>
              <span>Registrar Servicio</span>
            </a>
          </div>
        </div>
        <div class="absolute -right-16 -bottom-16 w-72 h-72 bg-easydry-green/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      <!-- KPIs del Operador -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-easydry-blue/10 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="car" class="w-5 h-5 text-easydry-blue"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ misServicios.length }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Servicios Hoy</p>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="clock" class="w-5 h-5 text-amber-600"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ enProceso }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">En Proceso</p>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-easydry-green/15 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="check-circle-2" class="w-5 h-5 text-easydry-green-dark"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ finalizados }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Finalizados</p>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-easydry text-center">
          <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-2">
            <i-lucide name="shield-check" class="w-5 h-5 text-indigo-600"></i-lucide>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ aprobados }}</p>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Aprobados</p>
        </div>
      </div>

      <!-- Mis Servicios del Día -->
      <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h3 class="font-bold text-slate-900 text-lg font-outfit">Mis Servicios del Día</h3>
            <p class="text-xs text-slate-500">Solo ves tus registros en tu bahía asignada</p>
          </div>
          <a routerLink="/servicios"
            class="px-4 py-2 bg-easydry-blue/10 text-easydry-blue font-bold rounded-xl text-xs hover:bg-easydry-blue/20 transition-colors flex items-center gap-1.5">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide>
            <span>Nuevo Servicio</span>
          </a>
        </div>

        @if (misServicios.length === 0) {
          <div class="text-center py-12">
            <i-lucide name="car" class="w-12 h-12 text-slate-300 mx-auto mb-3"></i-lucide>
            <p class="text-slate-500 font-medium">No tienes servicios registrados hoy</p>
            <p class="text-slate-400 text-xs mt-1">Usa el botón "Registrar Servicio" para comenzar</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (s of misServicios; track s.id) {
              <div class="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                <div class="w-10 h-10 rounded-xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {{ s.placa.substring(0, 3) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-slate-900 text-sm">{{ s.marca }} {{ s.modelo }}</p>
                  <p class="text-xs text-slate-500">{{ s.placa }} · {{ s.servicio }} · {{ s.horaIngreso }}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0"
                  [ngClass]="{
                    'bg-amber-100 text-amber-800': s.estado === 'EN PROCESO',
                    'bg-blue-100 text-blue-800': s.estado === 'FINALIZADO',
                    'bg-indigo-100 text-indigo-800': s.estado === 'PENDIENTE APROBACIÓN',
                    'bg-green-100 text-green-800': s.estado === 'APROBADO',
                    'bg-rose-100 text-rose-800': s.estado === 'RECHAZADO'
                  }">
                  {{ s.estado }}
                </span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Aviso de privacidad de datos -->
      <div class="bg-easydry-blue/5 border border-easydry-blue/15 rounded-2xl p-4 flex items-start gap-3">
        <i-lucide name="info" class="w-5 h-5 text-easydry-blue flex-shrink-0 mt-0.5"></i-lucide>
        <div>
          <p class="text-sm font-bold text-easydry-blue">Alcance de tu sesión</p>
          <p class="text-xs text-slate-600 mt-0.5">
            Solo puedes ver y registrar servicios asignados a tu bahía ({{ user?.bahiaNombre }})
            en la sucursal {{ user?.sucursalNombre }}. Para reportar problemas de maquinaria contacta al Supervisor.
          </p>
        </div>
      </div>

    </div>
  `
})
export class MiBahiaComponent implements OnInit {
  private auth = inject(AuthService);
  private serviciosService = inject(ServicioLavadoMockService);

  misServicios: VehiculoServicio[] = [];

  get user() { return this.auth.getCurrentUser(); }
  get enProceso() { return this.misServicios.filter(s => s.estado === 'EN PROCESO').length; }
  get finalizados() { return this.misServicios.filter(s => s.estado === 'FINALIZADO').length; }
  get aprobados() { return this.misServicios.filter(s => s.estado === 'APROBADO').length; }

  ngOnInit(): void {
    const nombreOperador = `${this.user?.nombre} ${this.user?.apellido}`;
    this.serviciosService.getServicios().subscribe(list => {
      // Filtrar solo los servicios de este operador
      this.misServicios = list.filter(s =>
        s.empleado?.toLowerCase().includes(this.user?.nombre?.toLowerCase() ?? '')
      );
    });
  }
}

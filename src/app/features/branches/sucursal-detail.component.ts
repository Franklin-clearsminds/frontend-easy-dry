import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SucursalMockService } from '../../infrastructure/mocks/sucursal-mock.service';
import { BahiaMockService } from '../../infrastructure/mocks/bahia-mock.service';
import { MaquinariaMockService } from '../../infrastructure/mocks/maquinaria-mock.service';
import { Sucursal, Bahia, Maquinaria } from '../../domain';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-sucursal-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, StatCardComponent, ModalComponent, FormsModule],
  template: `
    <div class="space-y-8 animate-fade-in">
      
      <!-- Back Link & Header -->
      <div>
        <a [routerLink]="['/sucursales']" class="inline-flex items-center gap-1.5 text-xs font-bold text-easydry-blue hover:underline mb-3">
          <i-lucide name="chevron-right" class="w-4 h-4 transform rotate-180"></i-lucide>
          <span>Volver al Directorio de Sucursales</span>
        </a>

        @if (sucursal) {
          <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-easydry-blue text-white flex items-center justify-center font-bold">
                  <i-lucide name="building-2" class="w-6 h-6"></i-lucide>
                </div>
                <div>
                  <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 font-outfit">{{ sucursal.nombre }}</h1>
                  <p class="text-xs text-slate-500 font-medium mt-0.5">{{ sucursal.ciudad }} • {{ sucursal.direccion }}</p>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span class="px-3 py-1.5 rounded-full text-xs font-bold bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40">
                Gerente: {{ sucursal.responsable }}
              </span>
              <a [routerLink]="['/asignaciones']" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs hover:bg-easydry-blue-dark transition-colors flex items-center gap-1.5">
                <i-lucide name="users" class="w-3.5 h-3.5"></i-lucide> Asignar Operadores
              </a>
              <!-- Note: Editing branch is done from the main branch list as implemented in sucursales.component, 
                   but we could link back or handle it here if requested. -->
            </div>
          </div>
        }
      </div>

      <!-- Summary KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <app-stat-card 
          title="Bahías de Lavado" 
          [value]="(sucursal?.cantidadBahias || 4) + ' Bahías'" 
          icon="building-2" 
          subtitle="Infraestructura activa" 
          variant="primary">
        </app-stat-card>

        <app-stat-card 
          title="Operadores Activos" 
          [value]="(sucursal?.operadoresActivos || 4) + ' Técnicos'" 
          icon="users" 
          subtitle="Personal en bahía" 
          variant="success">
        </app-stat-card>

        <app-stat-card 
          title="Maquinaria Asignada" 
          [value]="(sucursal?.maquinasAsignadasCount || 6) + ' Equipos'" 
          icon="hard-drive" 
          subtitle="Hidrolavadoras & Vapor" 
          variant="primary">
        </app-stat-card>

        <app-stat-card 
          title="Servicios Realizados" 
          [value]="(sucursal?.serviciosRealizadosMes || 380) + ' Autos'" 
          icon="check-circle-2" 
          subtitle="Rendimiento este mes" 
          variant="success">
        </app-stat-card>
      </div>

      <!-- SECCIÓN DE BAHÍAS -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 font-outfit">Distribución Operativa de Bahías</h2>
            <p class="text-xs text-slate-500">Estado en tiempo real, técnico a cargo y equipos asignados en cada bahía.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (b of bahias; track b.id) {
            <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 flex flex-col justify-between space-y-4 hover:shadow-easydry-hover transition-all">
              
              <div>
                <!-- Top Status Badge -->
                <div class="flex items-center justify-between mb-3">
                  <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2.5 py-1 rounded-lg">
                    {{ b.codigo }}
                  </span>
                  <span 
                    class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold"
                    [ngClass]="{
                      'bg-amber-100 text-amber-800 border border-amber-300': b.estado === 'Ocupada',
                      'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40': b.estado === 'Disponible',
                      'bg-rose-100 text-rose-800 border border-rose-300': b.estado === 'Mantenimiento',
                      'bg-slate-100 text-slate-600': b.estado === 'Inactiva'
                    }">
                    {{ b.estado }}
                  </span>
                </div>

                <h3 class="font-bold text-slate-900 text-base font-outfit">{{ b.nombre }}</h3>

                <!-- Operator Assigned Card -->
                <div class="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span class="text-[10px] font-extrabold uppercase text-slate-400">Operador Principal:</span>
                  <div class="flex items-center gap-2">
                    <i-lucide name="user-check" class="w-4 h-4 text-easydry-green-dark"></i-lucide>
                    <span class="font-bold text-slate-900 text-xs">{{ b.operadorAsignado || 'Sin Asignar' }}</span>
                  </div>
                </div>

                <!-- Assigned Machinery List -->
                <div class="mt-3 space-y-1.5">
                  <span class="text-[10px] font-extrabold uppercase text-slate-400">Maquinaria en Bahía:</span>
                  <div class="space-y-1">
                    @for (m of b.maquinariaAsignada || []; track m) {
                      <div class="text-xs bg-white p-2 rounded-lg border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5">
                        <i-lucide name="hard-drive" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                        <span class="truncate">{{ m }}</span>
                      </div>
                    }
                  </div>
                </div>

              </div>

              <div class="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <button 
                  (click)="cambiarEstadoBahia(b)" 
                  class="w-full py-2 bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-colors">
                  Cambiar Estado
                </button>
                <button 
                  (click)="abrirModalAsignarMaquinaria(b)" 
                  class="w-full py-2 bg-easydry-green/10 hover:bg-easydry-green hover:text-slate-900 text-easydry-green-dark font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                  <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide> Asignar Equipo
                </button>
              </div>

            </div>
          }
        </div>
      </div>

      <!-- Modal Asignar Maquinaria -->
      <app-modal 
        [isOpen]="modalMaquinariaOpen" 
        [title]="'Asignar Equipo a ' + (bahiaSeleccionada?.nombre || '')" 
        icon="hard-drive"
        (close)="cerrarModalMaquinaria()">
        
        <div class="space-y-4">
          <p class="text-xs text-slate-600">Selecciona una máquina disponible o transfiérela desde otra ubicación para asignarla a esta bahía.</p>
          
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Máquina a Asignar</label>
            <select [(ngModel)]="maquinaSeleccionadaId" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
              <option [value]="null" disabled selected>Seleccione una máquina...</option>
              @for (m of maquinasDisponibles; track m.id) {
                <option [value]="m.id">{{ m.codigo }} - {{ m.nombre }} (Actualmente en: {{ m.agencia }} - {{ m.bahia }})</option>
              }
            </select>
          </div>
        </div>

        <div modal-footer>
          <button (click)="cerrarModalMaquinaria()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="confirmarAsignacionMaquinaria()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">Asignar Equipo</button>
        </div>
      </app-modal>

    </div>
  `
})
export class SucursalDetailComponent implements OnInit {
  sucursal?: Sucursal;
  bahias: Bahia[] = [];
  
  // Maquinaria Asignación
  modalMaquinariaOpen = false;
  bahiaSeleccionada?: Bahia;
  maquinasDisponibles: Maquinaria[] = [];
  maquinaSeleccionadaId: number | null = null;

  private route = inject(ActivatedRoute);
  private sucursalService = inject(SucursalMockService);
  private bahiaService = inject(BahiaMockService);
  private maquinariaService = inject(MaquinariaMockService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id')) || 1;
    
    this.sucursalService.getSucursalById(id).subscribe(suc => {
      this.sucursal = suc;
    });

    this.bahiaService.getBahiasPorSucursal(id).subscribe(list => {
      this.bahias = list;
    });

    this.maquinariaService.getMaquinaria().subscribe(list => {
      this.maquinasDisponibles = list; // En un caso real se filtrarían las operativas/no asignadas si corresponde.
    });
  }

  cambiarEstadoBahia(bahia: Bahia) {
    const estados: Bahia['estado'][] = ['Disponible', 'Ocupada', 'Mantenimiento', 'Inactiva'];
    const idx = estados.indexOf(bahia.estado);
    const nextState = estados[(idx + 1) % estados.length];

    this.bahiaService.actualizarEstadoBahia(bahia.id, nextState).subscribe(res => {
      if (res) {
        bahia.estado = nextState;
        this.toastService.success('Bahía Actualizada', `${bahia.nombre} cambió a: ${nextState}`);
      }
    });
  }

  abrirModalAsignarMaquinaria(bahia: Bahia) {
    this.bahiaSeleccionada = bahia;
    this.maquinaSeleccionadaId = null;
    this.modalMaquinariaOpen = true;
  }

  cerrarModalMaquinaria() {
    this.modalMaquinariaOpen = false;
    this.bahiaSeleccionada = undefined;
    this.maquinaSeleccionadaId = null;
  }

  confirmarAsignacionMaquinaria() {
    if (!this.maquinaSeleccionadaId || !this.bahiaSeleccionada || !this.sucursal) return;

    this.maquinariaService.asignarMaquinaria(
      this.maquinaSeleccionadaId, 
      this.sucursal.nombre, 
      this.bahiaSeleccionada.nombre
    ).subscribe(maquina => {
      if (maquina) {
        // Update bay locally
        if (!this.bahiaSeleccionada!.maquinariaAsignada) {
          this.bahiaSeleccionada!.maquinariaAsignada = [];
        }
        if (!this.bahiaSeleccionada!.maquinariaAsignada.includes(maquina.nombre)) {
          this.bahiaSeleccionada!.maquinariaAsignada.push(maquina.nombre);
        }
        this.toastService.success('Equipo Asignado', `${maquina.nombre} ha sido asignada a ${this.bahiaSeleccionada!.nombre}`);
        this.cerrarModalMaquinaria();
      }
    });
  }
}

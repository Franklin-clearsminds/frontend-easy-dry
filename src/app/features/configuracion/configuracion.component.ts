import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-6 max-w-5xl mx-auto animate-fade-in">
      
      <!-- Header -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Configuración General del Sistema</h1>
        <p class="text-slate-500 text-xs mt-1">Parámetros corporativos, catálogo de tarifas de servicios, alertas y políticas de retención.</p>
      </div>

      <!-- Settings Sections -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Navigation Tabs Sidebar -->
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry space-y-1 self-start">
          <button 
            (click)="activeTab = 'general'" 
            class="w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-2.5"
            [ngClass]="activeTab === 'general' ? 'bg-easydry-blue text-white' : 'text-slate-700 hover:bg-slate-50'">
            <i-lucide name="sliders" class="w-4 h-4"></i-lucide>
            <span>Parámetros Operativos</span>
          </button>
          
          <button 
            (click)="activeTab = 'tarifas'" 
            class="w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-2.5"
            [ngClass]="activeTab === 'tarifas' ? 'bg-easydry-blue text-white' : 'text-slate-700 hover:bg-slate-50'">
            <i-lucide name="sparkles" class="w-4 h-4"></i-lucide>
            <span>Catálogo de Tarifas</span>
          </button>

          <button 
            (click)="activeTab = 'notificaciones'" 
            class="w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-2.5"
            [ngClass]="activeTab === 'notificaciones' ? 'bg-easydry-blue text-white' : 'text-slate-700 hover:bg-slate-50'">
            <i-lucide name="bell" class="w-4 h-4"></i-lucide>
            <span>Alertas & Notificaciones</span>
          </button>
        </div>

        <!-- Main Settings Form Panel -->
        <div class="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry space-y-6">
          
          @if (activeTab === 'general') {
            <div class="space-y-4">
              <h3 class="font-bold text-slate-900 text-base font-outfit border-b pb-2">Parámetros Operativos EasyDry®</h3>
              
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Comercial Corporativo</label>
                <input type="text" [(ngModel)]="config.empresaNombre" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tiempo Máximo Express (min)</label>
                  <input type="number" [(ngModel)]="config.tiempoMaxExpress" class="w-full p-2.5 border rounded-xl text-sm">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tiempo Máximo Completo (min)</label>
                  <input type="number" [(ngModel)]="config.tiempoMaxCompleto" class="w-full p-2.5 border rounded-xl text-sm">
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Moneda del Sistema</label>
                <select [(ngModel)]="config.moneda" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                  <option value="USD">USD ($) - Dólar Estadounidense</option>
                </select>
              </div>
            </div>
          } @else if (activeTab === 'tarifas') {
            <div class="space-y-4">
              <h3 class="font-bold text-slate-900 text-base font-outfit border-b pb-2">Tarifario de Servicios de Lavado</h3>
              
              <div class="space-y-3">
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p class="font-bold text-xs text-slate-900">Lavado Express Eco-Dry</p>
                    <p class="text-[11px] text-slate-400">Exterior + Llantas sin agua</p>
                  </div>
                  <input type="number" [(ngModel)]="config.precioExpress" class="w-24 p-1.5 border rounded-lg text-xs font-bold text-right">
                </div>

                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p class="font-bold text-xs text-slate-900">Lavado Completo Premium</p>
                    <p class="text-[11px] text-slate-400">Interior a vapor + Exterior</p>
                  </div>
                  <input type="number" [(ngModel)]="config.precioCompleto" class="w-24 p-1.5 border rounded-lg text-xs font-bold text-right">
                </div>

                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p class="font-bold text-xs text-slate-900">Recubrimiento Cerámico 9H</p>
                    <p class="text-[11px] text-slate-400">Tratamiento nanotecnológico 2 años</p>
                  </div>
                  <input type="number" [(ngModel)]="config.precioCeramico" class="w-24 p-1.5 border rounded-lg text-xs font-bold text-right">
                </div>
              </div>
            </div>
          } @else if (activeTab === 'notificaciones') {
            <div class="space-y-4">
              <h3 class="font-bold text-slate-900 text-base font-outfit border-b pb-2">Preferencias de Alertas de Incidencias</h3>
              
              <div class="space-y-3 text-xs">
                <label class="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer">
                  <span>Notificar fallas de maquinaria vía email al Gerente</span>
                  <input type="checkbox" [(ngModel)]="config.notifyEmail" class="rounded text-easydry-blue focus:ring-easydry-blue w-4 h-4">
                </label>

                <label class="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer">
                  <span>Generar alertas automáticas de mantenimiento preventivo</span>
                  <input type="checkbox" [(ngModel)]="config.notifyMaintenance" class="rounded text-easydry-blue focus:ring-easydry-blue w-4 h-4">
                </label>
              </div>
            </div>
          }

          <!-- Save Button Footer -->
          <div class="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              (click)="guardarConfiguracion()" 
              class="px-5 py-2.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-colors shadow-glow-green">
              Guardar Cambios de Configuración
            </button>
          </div>

        </div>

      </div>

    </div>
  `
})
export class ConfiguracionComponent {
  activeTab = 'general';

  config = {
    empresaNombre: 'EasyDry Ecuador S.A.',
    tiempoMaxExpress: 25,
    tiempoMaxCompleto: 45,
    moneda: 'USD',
    precioExpress: 18.00,
    precioCompleto: 35.00,
    precioCeramico: 180.00,
    notifyEmail: true,
    notifyMaintenance: true
  };

  private toastService = inject(ToastService);

  guardarConfiguracion() {
    this.toastService.success('Configuración Guardada', 'Se actualizaron los parámetros globales del sistema.');
  }
}

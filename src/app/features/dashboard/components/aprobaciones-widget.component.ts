import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-aprobaciones-widget',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry h-full">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-bold text-slate-900 text-lg font-outfit flex items-center gap-2">
          <i-lucide aria-hidden="true" name="shield-check" class="w-5 h-5 text-easydry-green-text"></i-lucide>
          Pendientes de Aprobación
        </h4>
        <span class="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">{{ aprobaciones.length }} Pendientes</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm whitespace-nowrap">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
            <tr>
              <th scope="col" class="px-4 py-2">Vehículo</th>
              <th scope="col" class="px-4 py-2">Operador / Hora</th>
              <th scope="col" class="px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (item of aprobaciones; track item.id) {
              <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-4 py-3">
                  <p class="font-bold text-slate-900 text-xs">{{ item.vehiculo }}</p>
                  <p class="text-xs text-slate-500">{{ item.servicio }}</p>
                </td>
                <td class="px-4 py-3 text-xs">
                  <p class="font-semibold text-slate-700">{{ item.operador }}</p>
                  <p class="text-xs text-slate-500 font-mono">{{ item.hora }}</p>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors" title="Rechazar" aria-label="Rechazar">
                      <i-lucide aria-hidden="true" name="x" class="w-3.5 h-3.5"></i-lucide>
                    </button>
                    <button class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center bg-easydry-green text-slate-900 hover:bg-easydry-green-dark rounded-lg transition-colors" title="Aprobar" aria-label="Aprobar">
                      <i-lucide aria-hidden="true" name="check" class="w-3.5 h-3.5"></i-lucide>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="px-4 py-8 text-center text-slate-500 text-sm italic">
                  Todo al día. No hay servicios pendientes.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AprobacionesWidgetComponent {
  @Input() aprobaciones: any[] = [];
}

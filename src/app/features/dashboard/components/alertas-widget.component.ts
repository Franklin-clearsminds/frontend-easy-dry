import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-alertas-widget',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry h-full">
      <h4 class="font-bold text-slate-900 text-lg font-outfit mb-4 flex items-center gap-2">
        <i-lucide aria-hidden="true" name="bell" class="w-5 h-5 text-easydry-blue"></i-lucide>
        Alertas Operativas
      </h4>
      <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        @for (alerta of alertas; track alerta.mensaje) {
          <div class="p-3 rounded-xl border flex items-start gap-3"
               [ngClass]="{
                 'bg-rose-50 border-rose-200': alerta.tipo === 'critica',
                 'bg-amber-50 border-amber-200': alerta.tipo === 'advertencia',
                 'bg-blue-50 border-blue-200': alerta.tipo === 'info'
               }">
            <div class="mt-0.5">
              @if (alerta.tipo === 'critica') {
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4 text-rose-600"></i-lucide>
              } @else if (alerta.tipo === 'advertencia') {
                <i-lucide aria-hidden="true" name="alert-circle" class="w-4 h-4 text-amber-600"></i-lucide>
              } @else {
                <i-lucide aria-hidden="true" name="info" class="w-4 h-4 text-easydry-blue"></i-lucide>
              }
            </div>
            <div>
              <p class="text-sm font-bold"
                 [ngClass]="{
                   'text-rose-900': alerta.tipo === 'critica',
                   'text-amber-900': alerta.tipo === 'advertencia',
                   'text-blue-900': alerta.tipo === 'info'
                 }">
                {{ alerta.mensaje }}
              </p>
              <p class="text-xs opacity-70 mt-0.5"
                 [ngClass]="{
                   'text-rose-700': alerta.tipo === 'critica',
                   'text-amber-700': alerta.tipo === 'advertencia',
                   'text-blue-700': alerta.tipo === 'info'
                 }">
                {{ alerta.fecha }}
              </p>
            </div>
          </div>
        } @empty {
          <div class="p-4 text-center text-slate-500 text-sm italic">
            No hay alertas activas
          </div>
        }
      </div>
    </div>
  `
})
export class AlertasWidgetComponent {
  @Input() alertas: any[] = [];
}

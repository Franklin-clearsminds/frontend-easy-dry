import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

/** Estado vacío reutilizable: <app-empty-state icon="inbox" title="Sin registros" hint="Prueba otros filtros"/> */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="estado-vacio flex flex-col items-center justify-center gap-2">
      @if (icon) {
        <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
          <i-lucide [name]="icon" class="w-6 h-6" aria-hidden="true"></i-lucide>
        </div>
      }
      <p class="font-bold text-slate-600 text-sm">{{ title }}</p>
      @if (hint) {
        <p class="text-xs text-slate-500 font-normal">{{ hint }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'No se encontraron registros';
  @Input() hint = '';
}

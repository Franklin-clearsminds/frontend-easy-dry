import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SEMAFORO, Semaforo } from '../../../core/models/auditorias.model';

/** Indicador de cumplimiento. Verde, amarillo y rojo se reservan para comunicar este resultado y no se pueden elegir a mano. */
@Component({
  selector: 'app-semaforo-5s',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (semaforo) {
      @if (grande) {
        <div class="flex items-center gap-4 rounded-2xl border-2 px-5 py-4" [ngClass]="[info.fondo, info.borde]" role="status"
          [attr.aria-label]="'Semáforo de cumplimiento: ' + info.nombre">
          <span class="w-14 h-14 rounded-full shadow-inner shrink-0" [ngClass]="info.punto" aria-hidden="true"></span>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wider" [ngClass]="info.texto">Semáforo de cumplimiento</p>
            <p class="text-3xl font-extrabold font-outfit leading-tight" [ngClass]="info.texto">{{ info.nombre.toUpperCase() }}</p>
            @if (detalle) { <p class="text-xs font-semibold mt-0.5" [ngClass]="info.texto">{{ detalle }}</p> }
          </div>
        </div>
      } @else {
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border" [ngClass]="[info.fondo, info.texto, info.borde]">
          <span class="w-2 h-2 rounded-full" [ngClass]="info.punto" aria-hidden="true"></span>{{ info.nombre }}
        </span>
      }
    } @else {
      <span class="text-xs text-slate-400">—</span>
    }
  `,
})
export class Semaforo5sComponent {
  @Input() semaforo: Semaforo | null | undefined;
  @Input() grande = false;
  @Input() detalle = '';

  get info() {
    return SEMAFORO[this.semaforo as Semaforo];
  }
}

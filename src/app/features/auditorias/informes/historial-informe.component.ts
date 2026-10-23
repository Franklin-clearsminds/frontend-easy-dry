import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistorialInforme } from '../../../core/models/auditorias.model';

const ETIQUETAS: Record<string, string> = {
  CREADO: 'Creado',
  SELLO_VALIDADO: 'Jefe de taller validado',
  FIRMADO: 'Firma registrada',
  APROBADO: 'Aprobado y recepción firmada',
  JEFE_AUSENTE: 'Jefe de taller no estuvo presente',
  JEFE_PRESENTE: 'Jefe de taller sí estuvo presente',
  FIRMAS_ANULADAS: 'Firmas anuladas por un cambio',
  GUARDADO: 'Guardado de forma definitiva',
  CALIFICADO: 'Calificación registrada',
  ELIMINADO: 'Eliminado',
  SEGUIMIENTO_PLAN: 'Seguimiento de plan',
  CREADA: 'Creada',
  GUARDADA: 'Guardada de forma definitiva',
  ELIMINADA: 'Eliminada',
  ACCION_SEGUIMIENTO: 'Seguimiento de acción',
  ACCION_VERIFICADA: 'Acción verificada',
};

/** Línea de tiempo de los hechos de un informe o auditoría: quién, cuándo y qué cambió. */
@Component({
  selector: 'app-historial-informe',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (items.length) {
      <ol class="relative border-l-2 border-slate-200 ml-2 space-y-4">
        @for (h of items; track h.id) {
          <li class="ml-4">
            <span class="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-easydry-blue border-2 border-white" aria-hidden="true"></span>
            <p class="text-sm font-bold text-slate-900">{{ etiqueta(h.accion) }}
              @if (h.estadoNuevo && h.estadoAnterior !== h.estadoNuevo) { <span class="ml-1 text-xs font-semibold text-slate-500">→ {{ h.estadoNuevo }}</span> }
            </p>
            @if (h.detalle) { <p class="text-xs text-slate-600 mt-0.5">{{ h.detalle }}</p> }
            <p class="text-[11px] text-slate-500 mt-0.5">{{ h.usuarioNombre }} · {{ h.rol }} · {{ h.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>
          </li>
        }
      </ol>
    } @else {
      <p class="text-sm text-slate-500">Sin movimientos registrados.</p>
    }
  `,
})
export class HistorialInformeComponent {
  @Input() items: HistorialInforme[] = [];
  etiqueta = (a: string) => ETIQUETAS[a] ?? a;
}

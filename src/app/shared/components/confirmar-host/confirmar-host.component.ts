import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ModalComponent } from '../modal/modal.component';
import { ConfirmarService } from '../../services/confirmar.service';

/** Muestra la confirmación pendiente de `ConfirmarService` con el modal de la app. Va una sola vez, en la raíz. */
@Component({
  selector: 'app-confirmar-host',
  standalone: true,
  imports: [ModalComponent, LucideAngularModule],
  template: `
    @if (servicio.pendiente(); as c) {
      <app-modal [isOpen]="true" [title]="c.titulo" [icon]="c.icono || (c.tipo === 'peligro' ? 'alert-triangle' : 'check-circle')" size="sm" (close)="servicio.responder(false)">
        <p class="text-sm text-slate-700 leading-relaxed">{{ c.mensaje }}</p>
        <div modal-footer class="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <button type="button" class="btn btn-secondary w-full sm:w-auto" (click)="servicio.responder(false)">{{ c.textoCancelar || 'Cancelar' }}</button>
          <button type="button" class="btn w-full sm:w-auto" [class.btn-danger]="c.tipo === 'peligro'" [class.btn-cta]="c.tipo !== 'peligro'" (click)="servicio.responder(true)">{{ c.textoConfirmar || 'Confirmar' }}</button>
        </div>
      </app-modal>
    }
  `,
})
export class ConfirmarHostComponent {
  readonly servicio = inject(ConfirmarService);
}

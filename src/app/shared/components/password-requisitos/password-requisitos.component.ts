import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { RequisitoPassword, requisitosPassword } from '../../../core/utils/password-politica';

/**
 * Lista de condiciones de la contraseña que se actualiza mientras se escribe: lo que falta sale en rojo y lo que ya cumple, en verde.
 * Mientras el campo está vacío se muestran en gris, sin reclamar nada todavía.
 *
 *   <app-password-requisitos [password]="form.password" [email]="form.email" />
 */
@Component({
  selector: 'app-password-requisitos',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <ul class="mt-2 space-y-1" role="status" aria-live="polite" aria-label="Requisitos de la contraseña">
      @for (r of requisitos; track r.clave) {
        <li class="flex items-start gap-1.5 text-xs font-semibold"
          [class.text-slate-500]="!escribiendo" [class.text-rose-600]="escribiendo && !r.cumple" [class.text-emerald-600]="escribiendo && r.cumple">
          <i-lucide aria-hidden="true" [name]="escribiendo ? (r.cumple ? 'check-circle-2' : 'x-circle') : 'circle'" class="w-3.5 h-3.5 shrink-0 mt-px"></i-lucide>
          <span>{{ r.texto }}<span class="sr-only"> — {{ r.cumple ? 'cumple' : 'falta' }}</span></span>
        </li>
      }
    </ul>
  `,
})
export class PasswordRequisitosComponent {
  @Input() password: string | null | undefined = '';
  @Input() email: string | null | undefined = '';

  get escribiendo(): boolean {
    return !!(this.password ?? '').trim();
  }

  get requisitos(): RequisitoPassword[] {
    return requisitosPassword(this.password, this.email ?? undefined);
  }
}

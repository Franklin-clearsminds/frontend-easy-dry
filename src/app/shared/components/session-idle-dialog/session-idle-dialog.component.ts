import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { SessionIdleService } from '../../../core/services/session-idle.service';
import { AuthService } from '../../../core/services/auth.service';

/** Aviso previo al cierre de sesión por inactividad, con cuenta regresiva. */
@Component({
  selector: 'app-session-idle-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (idle.estado().advertencia) {
      <div class="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
           role="alertdialog" aria-modal="true" aria-labelledby="idle-titulo" aria-describedby="idle-descripcion">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 animate-fade-in">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <i-lucide aria-hidden="true" name="clock" class="w-6 h-6 text-amber-600"></i-lucide>
            </div>
            <div class="min-w-0">
              <h2 id="idle-titulo" class="text-lg font-extrabold text-slate-900 font-outfit">¿Sigues ahí?</h2>
              <p id="idle-descripcion" class="text-sm text-slate-600 mt-1 leading-relaxed">
                Tu sesión se cerrará por inactividad en
                <strong class="text-slate-900 tabular-nums">{{ idle.estado().segundosRestantes }} s</strong>.
                Se cierra para proteger tu cuenta.
              </p>
            </div>
          </div>
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
            <button type="button" (click)="cerrarAhora()"
              class="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Cerrar sesión
            </button>
            <button type="button" (click)="idle.extender()" autofocus
              class="px-4 py-2.5 rounded-xl bg-easydry-green hover:bg-easydry-green-dark text-slate-950 text-sm font-extrabold transition-colors">
              Seguir conectado
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SessionIdleDialogComponent {
  protected idle = inject(SessionIdleService);
  private auth = inject(AuthService);

  protected cerrarAhora(): void {
    this.auth.logout();
  }
}

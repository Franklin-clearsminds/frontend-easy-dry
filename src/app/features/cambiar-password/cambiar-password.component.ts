import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';

/**
 * Pantalla obligatoria para quien entra con una contraseña temporal (usuario nuevo, importado o con la contraseña reiniciada).
 * El servidor bloquea todo lo demás hasta que la cambie.
 */
@Component({
  selector: 'app-cambiar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <main class="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form class="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-easydry p-8 space-y-4" (ngSubmit)="guardar()" autocomplete="off">
        <div class="text-center">
          <div class="w-14 h-14 rounded-2xl bg-easydry-blue/10 flex items-center justify-center mx-auto mb-3">
            <i-lucide aria-hidden="true" name="key-round" class="w-7 h-7 text-easydry-blue"></i-lucide>
          </div>
          <h1 class="text-xl font-extrabold text-slate-900 font-outfit">Cambia tu contraseña</h1>
          <p class="text-sm text-slate-600 mt-1">Entraste con una contraseña temporal. Elige una nueva para continuar.</p>
        </div>

        <div>
          <label for="pw-actual" class="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña temporal</label>
          <input id="pw-actual" type="password" name="actual" [(ngModel)]="actual" required autocomplete="current-password"
            class="w-full p-2.5 border rounded-xl text-sm">
        </div>
        <div>
          <label for="pw-nueva" class="block text-xs font-bold text-slate-700 uppercase mb-1">Nueva contraseña</label>
          <input id="pw-nueva" type="password" name="nueva" [(ngModel)]="nueva" required minlength="8" autocomplete="new-password"
            class="w-full p-2.5 border rounded-xl text-sm">
          <p class="text-xs text-slate-500 mt-1">Mínimo 8 caracteres y distinta de la temporal.</p>
        </div>
        <div>
          <label for="pw-confirmar" class="block text-xs font-bold text-slate-700 uppercase mb-1">Confirmar nueva contraseña</label>
          <input id="pw-confirmar" type="password" name="confirmar" [(ngModel)]="confirmar" required autocomplete="new-password"
            class="w-full p-2.5 border rounded-xl text-sm">
        </div>

        @if (mensaje) {
          <p class="text-sm font-semibold text-rose-600" role="alert">{{ mensaje }}</p>
        }

        <div class="flex flex-col sm:flex-row gap-2 pt-2">
          <button type="submit" class="btn btn-cta flex-1" [disabled]="guardando">{{ guardando ? 'Guardando…' : 'Guardar y continuar' }}</button>
          <button type="button" class="btn btn-secondary" (click)="salir()">Cerrar sesión</button>
        </div>
      </form>
    </main>
  `,
})
export class CambiarPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  actual = '';
  nueva = '';
  confirmar = '';
  mensaje = '';
  guardando = false;

  guardar(): void {
    this.mensaje = '';
    if (this.nueva !== this.confirmar) {
      this.mensaje = 'La confirmación no coincide con la nueva contraseña.';
      return;
    }
    this.guardando = true;
    this.auth.changePassword(this.actual, this.nueva).subscribe((res) => {
      this.guardando = false;
      if (!res.success) {
        this.mensaje = res.message || 'No se pudo cambiar la contraseña.';
        return;
      }
      void this.router.navigateByUrl(this.auth.rutaInicial());
    });
  }

  salir(): void {
    this.auth.logout();
  }
}

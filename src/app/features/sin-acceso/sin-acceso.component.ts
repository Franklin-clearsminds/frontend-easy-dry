import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';

/**
 * Pantalla para usuarios que pueden iniciar sesión pero cuyo rol no tiene ningún permiso en la plataforma (por ahora, el
 * lavador: solo tiene trazabilidad). Si más adelante se le da funcionalidad al rol, deja de ver esta pantalla.
 */
@Component({
  selector: 'app-sin-acceso',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <main class="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <section class="w-full max-w-md text-center bg-white rounded-2xl border border-slate-100 shadow-easydry p-8">
        <div class="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <i-lucide aria-hidden="true" name="lock" class="w-8 h-8 text-amber-600"></i-lucide>
        </div>
        <h1 class="text-xl font-extrabold text-slate-900 font-outfit mb-2">No tienes acceso al sistema</h1>
        <p class="text-sm text-slate-600 leading-relaxed mb-4">
          Por ahora tu perfil{{ rol ? ' (' + rol + ')' : '' }} solo tiene trazabilidad de tu productividad en bahía, que
          registra tu líder de agencia. No necesitas usar esta plataforma.
        </p>
        <p class="text-xs text-slate-500 mb-6">
          Si crees que deberías tener acceso, comunícate con el administrador de tu agencia.
        </p>
        <div class="flex flex-col sm:flex-row gap-2 justify-center">
          <button type="button" (click)="verificar()" class="btn btn-secondary">Volver a comprobar</button>
          <button type="button" (click)="salir()" class="btn btn-cta">Cerrar sesión</button>
        </div>
      </section>
    </main>
  `,
})
export class SinAccesoComponent {
  private readonly auth = inject(AuthService);
  readonly rol = this.auth.getCurrentUser()?.rolNombre || '';

  /** Vuelve a leer los permisos del rol por si ya se le dio acceso. */
  verificar(): void {
    this.auth.refrescarPermisos();
    if (!this.auth.sinAcceso()) window.location.assign(this.auth.rutaInicial());
  }

  salir(): void {
    this.auth.logout();
  }
}

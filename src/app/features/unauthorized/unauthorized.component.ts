import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ROLE_LABELS } from '../../domain';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-[70vh] flex items-center justify-center p-8 animate-fade-in">
      <div class="text-center max-w-md">

        <!-- Icon -->
        <div class="w-20 h-20 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-6 shadow-md">
          <i-lucide name="shield-x" class="w-10 h-10 text-rose-500"></i-lucide>
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-extrabold text-slate-900 font-outfit mb-2">Acceso Denegado</h1>
        <p class="text-slate-500 text-sm mb-4 leading-relaxed">
          Tu rol actual no tiene permiso para ver esta sección.
        </p>

        <!-- Current Role Badge -->
        @if (rolLabel) {
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold mb-6">
            <i-lucide name="user-circle" class="w-4 h-4"></i-lucide>
            <span>Rol actual: {{ rolLabel }}</span>
          </div>
        }

        <!-- Context info for operator -->
        @if (contexto) {
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 mb-6 text-left space-y-1">
            <p class="font-bold text-slate-800 mb-2">Tu contexto de acceso:</p>
            <p>{{ contexto }}</p>
          </div>
        }

        <!-- Actions -->
        <div class="flex items-center justify-center gap-3 flex-wrap">
          <button
            (click)="goBack()"
            class="px-5 py-2.5 bg-easydry-blue text-white font-bold rounded-xl text-sm hover:bg-easydry-blue-dark transition-colors flex items-center gap-2">
            <i-lucide name="arrow-left" class="w-4 h-4"></i-lucide>
            <span>Volver</span>
          </button>
          <a routerLink="/dashboard"
            class="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
            <i-lucide name="layout-dashboard" class="w-4 h-4"></i-lucide>
            <span>Ir al Dashboard</span>
          </a>
        </div>

      </div>
    </div>
  `
})
export class UnauthorizedComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  get rolLabel(): string | null {
    const role = this.auth.getRole();
    return role ? ROLE_LABELS[role] : null;
  }

  get contexto(): string {
    return this.auth.getUserContextLabel();
  }

  goBack(): void {
    window.history.back();
  }
}

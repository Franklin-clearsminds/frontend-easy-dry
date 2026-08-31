import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../services/toast.service';
import { MOCK_NOTIFICACIONES } from '../../../core/mocks/notificaciones.mock';
import { environment } from '../../../core/config/env';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <header class="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">

      <!-- Left: Context Info / Network Status -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <div class="w-2.5 h-2.5 rounded-full bg-easydry-green animate-pulse"></div>
          <i-lucide name="building-2" class="w-4 h-4 text-easydry-blue"></i-lucide>
          <span class="text-xs font-bold text-slate-700 font-outfit">
            Red Nacional {{ env.appName }}
          </span>
        </div>
        @if (!env.production) {
          <span class="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
            {{ env.environmentName }}
          </span>
        }
      </div>

      <!-- Center: Global Search Bar (PC / Laptop) -->
      <div class="flex flex-1 max-w-md mx-6">
        <div class="relative w-full">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <i-lucide name="search" class="w-4 h-4"></i-lucide>
          </span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()"
            placeholder="Buscar placa, orden OT, cliente, sucursal o equipo..."
            class="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-easydry-blue focus:bg-white focus:border-transparent transition-all placeholder:text-slate-400">
        </div>
      </div>

      <!-- Right: SuperAdmin Badge, Notifications & Profile -->
      <div class="flex items-center gap-4">

        <!-- Role Badge -->
        <div class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold shadow-2xs">
          <i-lucide name="shield-check" class="w-4 h-4 text-purple-600"></i-lucide>
          <span>Super Administrador</span>
        </div>

        <!-- Notifications -->
        <a
          routerLink="/notificaciones"
          class="p-2.5 rounded-xl text-slate-600 hover:text-easydry-blue hover:bg-slate-100 transition-colors relative focus:outline-none inline-flex"
          title="Notificaciones">
          <i-lucide name="bell" class="w-5 h-5"></i-lucide>
          @if (unreadCount > 0) {
            <span class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
          }
        </a>

        <div class="h-8 w-px bg-slate-200"></div>

        <!-- User Profile Quick Info -->
        <div class="flex items-center gap-3 pl-1">
          <img
            [src]="user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'"
            alt="User Avatar"
            class="w-10 h-10 rounded-full object-cover ring-2 ring-purple-400/40">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-slate-900 leading-tight">{{ user.nombre }} {{ user.apellido }}</span>
            <span class="text-[10px] font-extrabold text-purple-700 leading-tight uppercase tracking-wider">SuperAdmin</span>
          </div>
        </div>

      </div>
    </header>
  `
})
export class HeaderComponent {
  @Output() search = new EventEmitter<string>();

  readonly env = environment;
  public authService = inject(AuthService);
  private toastService = inject(ToastService);

  searchQuery = '';
  unreadCount = MOCK_NOTIFICACIONES.filter(n => !n.leida).length;

  get user() { return this.authService.getCurrentUser(); }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.search.emit(this.searchQuery);
      this.toastService.info('Búsqueda', `Buscando: "${this.searchQuery}"`);
    }
  }
}

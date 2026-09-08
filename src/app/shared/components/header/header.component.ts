import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../core/config/env';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <header class="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs select-none">

      <!-- Left: Context Info / Network Status -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <div class="w-2.5 h-2.5 rounded-full bg-easydry-green animate-pulse"></div>
          <i-lucide name="building-2" class="w-4 h-4 text-easydry-blue"></i-lucide>
          <span class="text-xs font-bold text-slate-700 font-outfit">
            Red Nacional {{ env.appName }}
          </span>
        </div>

      </div>

      <!-- Right: User Context, Notifications & Profile -->
      <div class="flex items-center gap-4">

        <!-- Role Badge -->
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold shadow-2xs">
          <i-lucide name="shield-check" class="w-4 h-4 text-purple-600"></i-lucide>
          <span>{{ user.rolNombre || user.role }}</span>
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
            <span class="text-[10px] font-extrabold text-purple-700 leading-tight uppercase tracking-wider">
              {{ user.sucursal || 'EasyDry' }}
            </span>
          </div>
        </div>

      </div>
    </header>
  `
})
export class HeaderComponent {
  readonly env = environment;
  public authService = inject(AuthService);

  unreadCount = 0;

  get user() { return this.authService.getCurrentUser(); }
}

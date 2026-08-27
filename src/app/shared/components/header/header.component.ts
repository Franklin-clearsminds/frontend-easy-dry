import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <header class="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">

      <!-- Left: Context Info / Network Status -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <div class="w-2.5 h-2.5 rounded-full bg-easydry-green animate-pulse"></div>
          <i-lucide name="building-2" class="w-4 h-4 text-easydry-blue"></i-lucide>
          <span class="text-xs font-bold text-slate-700 font-outfit">
            Red Nacional EasyDry®
          </span>
        </div>
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

        <!-- Notifications Bell -->
        <div class="relative">
          <button
            (click)="toggleNotifications()"
            class="p-2.5 rounded-xl text-slate-600 hover:text-easydry-blue hover:bg-slate-100 transition-colors relative focus:outline-none">
            <i-lucide name="bell" class="w-5 h-5"></i-lucide>
            @if (unreadCount > 0) {
              <span class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
            }
          </button>

          @if (showNotifications) {
            <div class="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 animate-fade-in">
              <div class="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <h4 class="font-bold text-slate-900 text-sm">Notificaciones del Sistema</h4>
                <span class="text-[11px] font-semibold bg-easydry-blue/10 text-easydry-blue px-2 py-0.5 rounded-full">{{ unreadCount }} Nuevas</span>
              </div>
              <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                <div class="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3">
                  <div class="p-2 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                    <i-lucide name="alert-triangle" class="w-4 h-4"></i-lucide>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-slate-800">Incidente en Aspiradora AS-002</p>
                    <p class="text-[11px] text-slate-500">EasyDry Quito Norte • hace 25 min</p>
                  </div>
                </div>
                <div class="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3">
                  <div class="p-2 rounded-lg bg-easydry-green/20 text-easydry-green-dark mt-0.5">
                    <i-lucide name="check-circle-2" class="w-4 h-4"></i-lucide>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-slate-800">Toyota RAV4 - Pendiente Aprobación</p>
                    <p class="text-[11px] text-slate-500">EasyDry Quito Norte • hace 40 min</p>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

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

  public authService = inject(AuthService);
  private toastService = inject(ToastService);

  searchQuery = '';
  showNotifications = false;
  unreadCount = 2;

  get user() { return this.authService.getCurrentUser(); }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.search.emit(this.searchQuery);
      this.toastService.info('Búsqueda', `Buscando: "${this.searchQuery}"`);
    }
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }
}

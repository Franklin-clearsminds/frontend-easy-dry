import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../services/toast.service';
import { UsuarioMockService } from '../../../core/services/usuario-mock.service';
import { SucursalMockService } from '../../../core/services/sucursal-mock.service';
import { MOCK_NOTIFICACIONES } from '../../../core/mocks/notificaciones.mock';
import { environment } from '../../../core/config/env';
import { Usuario, Sucursal } from '../../../core/models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
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
        @if (!env.production) {
          <span class="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
            {{ env.environmentName }}
          </span>
        }
      </div>

      <!-- Center: Global Smart Search Bar -->
      <div class="flex flex-1 max-w-lg mx-6 relative">
        <div class="relative w-full">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <i-lucide name="search" class="w-4 h-4"></i-lucide>
          </span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (input)="onSearchInput()"
            (focus)="searchFocused = true"
            (blur)="onBlurSearch()"
            placeholder="Búsqueda Inteligente: nombre, correo, rol o agencia..."
            class="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-8 py-2.5 focus:ring-2 focus:ring-easydry-blue focus:bg-white focus:border-transparent transition-all placeholder:text-slate-400 font-medium">
          
          @if (searchQuery) {
            <button
              type="button"
              (click)="clearSearch()"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer">
              <i-lucide name="x" class="w-3.5 h-3.5"></i-lucide>
            </button>
          }
        </div>

        <!-- Smart Search Live Dropdown Results Popover -->
        @if (searchFocused && searchQuery.trim().length >= 2) {
          <div class="absolute top-12 left-0 right-0 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-slate-100 max-h-96 overflow-y-auto">
            
            <!-- Category 1: Colaboradores / Usuarios -->
            <div class="p-3">
              <div class="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                <span class="flex items-center gap-1.5">
                  <i-lucide name="users" class="w-3 h-3 text-easydry-blue"></i-lucide>
                  Colaboradores Relacionados ({{ matchingUsers.length }})
                </span>
                <span>Directorio</span>
              </div>

              @if (matchingUsers.length === 0) {
                <p class="text-xs text-slate-400 italic px-2 py-1">Sin coincidencias en usuarios</p>
              } @else {
                <div class="space-y-1">
                  @for (u of matchingUsers.slice(0, 4); track u.id) {
                    <div
                      (mousedown)="selectUser(u)"
                      class="p-2 rounded-xl hover:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors group">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-7 h-7 rounded-full bg-easydry-blue/10 text-easydry-blue font-bold text-xs flex items-center justify-center shrink-0">
                          {{ u.nombre.charAt(0) }}
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs font-bold text-slate-900 group-hover:text-easydry-blue transition-colors truncate">
                            {{ u.nombre }} {{ u.apellido }}
                          </p>
                          <p class="text-[10px] text-slate-400 truncate">{{ u.email }} · {{ u.agencia }}</p>
                        </div>
                      </div>
                      <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        {{ u.rol }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Category 2: Agencias y Sucursales -->
            <div class="p-3">
              <div class="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                <span class="flex items-center gap-1.5">
                  <i-lucide name="building-2" class="w-3 h-3 text-easydry-blue"></i-lucide>
                  Agencias y Sucursales ({{ matchingBranches.length }})
                </span>
                <span>Red Operativa</span>
              </div>

              @if (matchingBranches.length === 0) {
                <p class="text-xs text-slate-400 italic px-2 py-1">Sin coincidencias en agencias</p>
              } @else {
                <div class="space-y-1">
                  @for (s of matchingBranches.slice(0, 3); track s.id) {
                    <div
                      (mousedown)="selectBranch(s)"
                      class="p-2 rounded-xl hover:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors group">
                      <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <i-lucide name="map-pin" class="w-4 h-4"></i-lucide>
                        </div>
                        <div>
                          <p class="text-xs font-bold text-slate-900 group-hover:text-easydry-blue transition-colors">
                            {{ s.nombre }}
                          </p>
                          <p class="text-[10px] text-slate-400">{{ s.ciudad }} · Resp: {{ s.responsable }}</p>
                        </div>
                      </div>
                      <span class="text-[10px] font-bold text-easydry-blue">
                        {{ s.cantidadBahias }} Bahías
                      </span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Footer: Indicador de Inteligencia de Búsqueda -->
            <div class="p-2 px-3 bg-slate-50 flex items-center justify-between text-[10px] font-semibold text-slate-400">
              <span>Búsqueda Multi-Entidad EasyDry®</span>
              <span class="font-mono text-cyan-600">Cognito / RBAC Ready</span>
            </div>

          </div>
        }
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
  @Output() search = new EventEmitter<string>();

  readonly env = environment;
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  private usuarioService = inject(UsuarioMockService);
  private sucursalService = inject(SucursalMockService);
  private router = inject(Router);

  searchQuery = '';
  searchFocused = false;
  unreadCount = MOCK_NOTIFICACIONES.filter(n => !n.leida).length;

  matchingUsers: Usuario[] = [];
  matchingBranches: Sucursal[] = [];

  get user() { return this.authService.getCurrentUser(); }

  onSearchInput(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      this.matchingUsers = [];
      this.matchingBranches = [];
      return;
    }

    // Búsqueda inteligente en usuarios (nombre, apellido, email, rol, agencia)
    this.usuarioService.getUsuarios().subscribe(users => {
      this.matchingUsers = users.filter(u =>
        u.nombre.toLowerCase().includes(q) ||
        u.apellido.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.rol.toLowerCase().includes(q) ||
        (u.agencia && u.agencia.toLowerCase().includes(q))
      );
    });

    // Búsqueda inteligente en sucursales / agencias
    this.sucursalService.getSucursales().subscribe(branches => {
      this.matchingBranches = branches.filter(b =>
        b.nombre.toLowerCase().includes(q) ||
        b.ciudad.toLowerCase().includes(q) ||
        b.responsable.toLowerCase().includes(q)
      );
    });
  }

  onBlurSearch(): void {
    // Retraso para permitir el click en los items del dropdown
    setTimeout(() => {
      this.searchFocused = false;
    }, 250);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.matchingUsers = [];
    this.matchingBranches = [];
  }

  selectUser(user: Usuario): void {
    this.searchFocused = false;
    this.toastService.info('Colaborador Seleccionado', `${user.nombre} ${user.apellido} (${user.rol})`);
    this.router.navigate(['/usuarios']);
  }

  selectBranch(branch: Sucursal): void {
    this.searchFocused = false;
    this.toastService.info('Sucursal Seleccionada', `${branch.nombre} - ${branch.ciudad}`);
    this.router.navigate(['/sucursales']);
  }
}

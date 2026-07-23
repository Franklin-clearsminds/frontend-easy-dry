import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Role, ROLE_LABELS } from '../../../core/models/roles.model';
import { Router } from '@angular/router';

interface DemoRolEntry {
  value: Role;
  email: string;
  label: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <header class="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">

      <!-- Left: Mobile Hamburger & Context Label -->
      <div class="flex items-center gap-3 sm:gap-4">
        <!-- Mobile Sidebar Toggle -->
        <button 
          (click)="onToggleSidebar()"
          class="md:hidden p-2 -ml-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 hover:bg-easydry-blue hover:text-white transition-colors focus:outline-none shadow-sm">
          <i-lucide name="menu" class="w-5 h-5"></i-lucide>
        </button>

        <div class="hidden sm:flex items-center gap-2">
          <i-lucide name="building-2" class="w-4 h-4 text-easydry-blue"></i-lucide>
          <span class="text-sm font-semibold text-slate-600">
            {{ contextLabel }}
          </span>
        </div>
      </div>

      <!-- Center: Global Search Bar -->
      <div class="hidden md:flex flex-1 max-w-sm mx-4">
        <div class="relative w-full">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <i-lucide name="search" class="w-4 h-4"></i-lucide>
          </span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()"
            placeholder="Buscar placa, OT, cliente..."
            class="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all placeholder:text-slate-400">
        </div>
      </div>

      <!-- Right: Demo Role Switcher, Notifications & Profile -->
      <div class="flex items-center gap-3">

        <!-- Live Role Switcher (Demo Quick Switch) -->
        <div class="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <span class="text-[10px] font-extrabold uppercase text-slate-400 hidden lg:inline">Rol Demo:</span>
          <select
            [ngModel]="currentRole"
            (ngModelChange)="onCambiarRolDemo($event)"
            class="bg-white border-0 text-slate-900 text-xs font-bold rounded-lg px-2 py-1 shadow-2xs focus:ring-2 focus:ring-easydry-blue cursor-pointer">
            @for (entry of demoRoles; track entry.value) {
              <option [value]="entry.value">{{ entry.label }}</option>
            }
          </select>
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
                <h4 class="font-bold text-slate-900 text-sm">Notificaciones</h4>
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

        <!-- User Quick Profile -->
        <div class="flex items-center gap-3 pl-1">
          <img
            [src]="user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'"
            alt="User Avatar"
            class="w-9 h-9 rounded-full object-cover ring-2 ring-easydry-blue/20">
          <div class="hidden xl:flex flex-col">
            <span class="text-xs font-bold text-slate-900 leading-tight">{{ user?.nombre }} {{ user?.apellido }}</span>
            <span class="text-[10px] font-extrabold text-easydry-blue leading-tight uppercase">{{ rolLabel }}</span>
          </div>
        </div>

      </div>
    </header>
  `
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() agenciaChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();

  public authService = inject(AuthService);
  private toastService = inject(ToastService);

  searchQuery = '';
  showNotifications = false;
  unreadCount = 2;

  demoRoles: DemoRolEntry[] = [
    { value: Role.SUPER_ADMIN, email: 'admin@easydry.com', label: 'Super Admin' },
    { value: Role.GERENTE, email: 'gerente.quito@easydry.com', label: 'Gerente (Quito Norte)' },
    { value: Role.SUPERVISOR, email: 'supervisor.quito@easydry.com', label: 'Supervisor' },
    { value: Role.OPERADOR, email: 'operador.bahia1@easydry.com', label: 'Operador (Bahía 1)' },
    { value: Role.TECNICO, email: 'tecnico@easydry.com', label: 'Técnico Maquinaria' }
  ];

  get user() { return this.authService.getCurrentUser(); }
  get currentRole(): Role | null { return this.authService.getRole(); }
  get rolLabel(): string {
    const r = this.currentRole;
    return r ? ROLE_LABELS[r] : '';
  }
  get contextLabel(): string {
    return this.authService.getUserContextLabel();
  }

  private router: Router = inject(Router);

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.search.emit(this.searchQuery);
      this.toastService.info('Búsqueda', `Buscando: "${this.searchQuery}"`);
    }
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  onCambiarRolDemo(nuevoRole: Role) {
    const entry = this.demoRoles.find(r => r.value === nuevoRole);
    if (!entry) return;

    this.authService.login(entry.email, '123456').subscribe(res => {
      if (res.success) {
        this.toastService.info('Rol Demo Cambiado', `Ahora eres: ${ROLE_LABELS[nuevoRole]}`);
        
        // Navegar siempre a la raíz del Dashboard al cambiar de rol
        this.router.navigate(['/dashboard']).then(() => {
          window.location.reload();
        });
      }
    });
  }
}

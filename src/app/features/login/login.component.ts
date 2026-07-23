import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { Role, ROLE_LABELS } from '../../core/models/roles.model';

interface DemoAccount {
  label: string;
  email: string;
  role: Role;
  icon: string;
  color: string;
  description: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-easydry-blue-deep via-easydry-blue to-easydry-blue-dark flex items-center justify-center p-4 relative overflow-hidden">

      <!-- Background Decorative Elements -->
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-easydry-green/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-easydry-lime/15 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Main Login Card -->
      <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 relative z-10 animate-fade-in">

        <!-- Logo Branding Header -->
        <div class="flex flex-col items-center text-center mb-6">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-easydry-green to-easydry-lime p-0.5 shadow-glow-green mb-3 flex items-center justify-center">
            <div class="w-full h-full bg-easydry-blue-dark rounded-[14px] flex items-center justify-center">
              <i-lucide name="droplet" class="w-10 h-10 text-easydry-green fill-easydry-green/30"></i-lucide>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <span class="font-extrabold text-3xl tracking-tight text-easydry-blue font-outfit">easy</span>
            <span class="font-extrabold text-3xl tracking-tight text-easydry-green font-outfit">dry</span>
            <span class="text-xs font-bold text-easydry-lime align-super ml-0.5">®</span>
          </div>
          <p class="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-1">Sistema de Gestión Operativa</p>
        </div>

        <!-- Quick Demo Login Presets - 5 Roles -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-6 space-y-2">
          <p class="font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center mb-3">
            Acceso Demo por Rol · Contraseña: <span class="text-easydry-blue font-mono">123456</span>
          </p>
          <div class="grid grid-cols-1 gap-1.5">
            @for (account of demoAccounts; track account.email) {
              <button
                type="button"
                (click)="fillCredentials(account)"
                [class]="'w-full py-2 px-3 rounded-xl text-left text-[11px] transition-all flex items-center gap-2.5 border ' + account.color + (selectedEmail === account.email ? ' ring-2 ring-offset-1 ring-easydry-blue' : '')">
                <i-lucide [name]="account.icon" class="w-3.5 h-3.5 flex-shrink-0"></i-lucide>
                <div class="flex-1 min-w-0">
                  <p class="font-bold truncate">{{ account.label }}</p>
                  <p class="text-[10px] opacity-70 truncate">{{ account.email }}</p>
                </div>
                @if (selectedEmail === account.email) {
                  <i-lucide name="check-circle-2" class="w-3.5 h-3.5 flex-shrink-0 text-easydry-green"></i-lucide>
                }
              </button>
            }
          </div>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onLogin()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Correo Corporativo</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <i-lucide name="mail" class="w-4 h-4"></i-lucide>
              </span>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="usuario@easydry.com"
                class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-easydry-blue focus:border-easydry-blue transition-all">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Contraseña</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <i-lucide name="lock" class="w-4 h-4"></i-lucide>
              </span>
              <input
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                required
                placeholder="••••••••"
                class="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-easydry-blue focus:border-easydry-blue transition-all">
              <button
                type="button"
                (click)="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                <i-lucide name="eye" class="w-4 h-4"></i-lucide>
              </button>
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loading"
            class="w-full py-3.5 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl shadow-lg hover:shadow-glow-green transition-all duration-300 flex items-center justify-center gap-2 text-sm">
            @if (loading) {
              <i-lucide name="refresh-cw" class="w-4 h-4 animate-spin"></i-lucide>
              <span>Ingresando...</span>
            } @else {
              <i-lucide name="log-in" class="w-4 h-4"></i-lucide>
              <span>Ingresar a la Plataforma</span>
            }
          </button>
        </form>

        <div class="mt-6 text-center border-t border-slate-100 pt-3">
          <p class="text-xs text-slate-400">© 2026 EasyDry® Ecuador. Sistema de Gestión Operativa v2.0</p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  selectedEmail = '';

  demoAccounts: DemoAccount[] = [
    {
      label: 'Super Administrador',
      email: 'admin@easydry.com',
      role: Role.SUPER_ADMIN,
      icon: 'shield-check',
      color: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100',
      description: 'Acceso total a toda la red'
    },
    {
      label: 'Gerente · Quito Norte',
      email: 'gerente.quito@easydry.com',
      role: Role.GERENTE,
      icon: 'building-2',
      color: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
      description: 'Solo su sucursal'
    },
    {
      label: 'Supervisor Operativo',
      email: 'supervisor.quito@easydry.com',
      role: Role.SUPERVISOR,
      icon: 'eye',
      color: 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
      description: 'Control operativo'
    },
    {
      label: 'Operador · Bahía 1',
      email: 'operador.bahia1@easydry.com',
      role: Role.OPERADOR,
      icon: 'user-check',
      color: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
      description: 'Solo su bahía asignada'
    },
    {
      label: 'Técnico de Mantenimiento',
      email: 'tecnico@easydry.com',
      role: Role.TECNICO,
      icon: 'wrench',
      color: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
      description: 'Equipos y mantenimientos'
    }
  ];

  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  fillCredentials(account: DemoAccount) {
    this.email = account.email;
    this.password = '123456';
    this.selectedEmail = account.email;
    this.toastService.info(`Acceso ${account.label}`, account.description);
  }

  onLogin() {
    if (!this.email || !this.password) {
      this.toastService.warning('Campos Incompletos', 'Ingrese su usuario y contraseña.');
      return;
    }

    this.loading = true;
    this.authService.login(this.email, this.password).subscribe(res => {
      this.loading = false;
      if (res.success && res.user) {
        const rolLabel = ROLE_LABELS[res.user.role] ?? res.user.role;
        this.toastService.success('Acceso Exitoso', `Bienvenido(a), ${res.user.nombre}! (${rolLabel})`);

        // Redirigir siempre al dashboard
        this.router.navigate(['/dashboard']);
      } else {
        this.toastService.error('Error de Inicio de Sesión', res.message || 'Credenciales incorrectas');
      }
    });
  }
}

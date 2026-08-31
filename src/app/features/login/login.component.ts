import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { environment } from '../../core/config/env';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-easydry-blue-deep via-easydry-blue to-easydry-blue-dark flex items-center justify-center p-4 sm:p-6 relative overflow-y-auto">

      <!-- Background Decorative Ambient Glows -->
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] bg-easydry-green/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-easydry-lime/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-md flex flex-col gap-4 relative z-10 animate-fade-in py-4">
        
        <!-- Main Corporate Login Card -->
        <div class="w-full bg-white rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10">

          <!-- Logo Branding Header -->
          <div class="flex flex-col items-center text-center mb-8">
            <img
              src="assets/images/easydry-logo-stacked.png"
              alt="EasyDry®"
              class="h-32 w-32 object-contain mb-3">
            <p class="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1.5">Autenticación & Control de Acceso</p>
            @if (!env.production) {
              <p class="mt-2 text-[10px] font-bold uppercase tracking-wider text-easydry-blue/70">
                {{ env.environmentName }} · {{ env.useMocks ? 'datos mock' : env.apiBaseUrl }}
              </p>
            }
          </div>

          <!-- Error Alert Banner -->
          @if (errorMessage) {
            <div class="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-shake">
              <i-lucide name="alert-circle" class="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600"></i-lucide>
              <div class="flex-1">
                <p class="font-bold">Error de Autenticación</p>
                <p class="text-rose-700 mt-0.5">{{ errorMessage }}</p>
              </div>
            </div>
          }

          <!-- Login Form -->
          <form (ngSubmit)="onLogin()" novalidate class="space-y-4">
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
                  (input)="errorMessage = ''"
                  class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-easydry-blue focus:bg-white focus:border-easydry-blue transition-all outline-none">
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
                  placeholder="••••••••••••"
                  (input)="errorMessage = ''"
                  class="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-easydry-blue focus:bg-white focus:border-easydry-blue transition-all outline-none">
                <button
                  type="button"
                  (click)="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                  <i-lucide [name]="showPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                </button>
              </div>
            </div>

            <button
              type="submit"
              [disabled]="loading"
              class="w-full py-3.5 mt-3 bg-easydry-green hover:bg-easydry-green-dark active:scale-[0.99] text-slate-950 font-extrabold rounded-xl shadow-lg hover:shadow-glow-green transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
              @if (loading) {
                <i-lucide name="refresh-cw" class="w-4 h-4 animate-spin"></i-lucide>
                <span>Validando credenciales...</span>
              } @else {
                <i-lucide name="log-in" class="w-4 h-4"></i-lucide>
                <span>Ingresar al Sistema</span>
              }
            </button>
          </form>
        </div>

        <p class="text-center text-[11px] text-white/50">
          © 2026 EasyDry® Red Nacional. Acceso Seguro RBAC.
        </p>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  readonly env = environment;
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      const targetRoute = this.authService.getDefaultRouteForRole(user?.role);
      this.router.navigateByUrl(targetRoute);
    }
  }

  onLogin() {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor ingrese su correo corporativo y contraseña.';
      this.toastService.warning('Campos Requeridos', this.errorMessage);
      return;
    }

    this.loading = true;
    this.authService.login(this.email, this.password).subscribe(res => {
      this.loading = false;
      if (res.success && res.user) {
        this.toastService.success('Acceso Correcto', `Bienvenido(a) ${res.user.nombre} (${res.user.rolNombre})`);
        const targetRoute = this.authService.getDefaultRouteForRole(res.user.role);
        this.router.navigateByUrl(targetRoute);
      } else {
        this.errorMessage = res.message || 'Credenciales incorrectas. Verifique su correo y contraseña.';
        this.toastService.error('Error de Acceso', this.errorMessage);
      }
    });
  }
}

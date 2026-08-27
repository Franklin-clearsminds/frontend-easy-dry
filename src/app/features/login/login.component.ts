import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-easydry-blue-deep via-easydry-blue to-easydry-blue-dark flex items-center justify-center p-6 relative overflow-hidden">

      <!-- Background Decorative Ambient Glows -->
      <div class="absolute -top-32 -left-32 w-[500px] h-[500px] bg-easydry-green/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-easydry-lime/15 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Main Corporate Login Card (Desktop / Laptop Optimized) -->
      <div class="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-white/20 p-10 relative z-10 animate-fade-in">

        <!-- Logo Branding Header -->
        <div class="flex flex-col items-center text-center mb-8">
          <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-easydry-green to-easydry-lime p-0.5 shadow-glow-green mb-4 flex items-center justify-center">
            <div class="w-full h-full bg-easydry-blue-dark rounded-[22px] flex items-center justify-center">
              <i-lucide name="droplet" class="w-12 h-12 text-easydry-green fill-easydry-green/30"></i-lucide>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <span class="font-extrabold text-4xl tracking-tight text-easydry-blue font-outfit">easy</span>
            <span class="font-extrabold text-4xl tracking-tight text-easydry-green font-outfit">dry</span>
            <span class="text-sm font-bold text-easydry-lime align-super ml-0.5">®</span>
          </div>
          <p class="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Plataforma de Gestión Operativa & Control</p>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onLogin()" class="space-y-5">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Correo Corporativo</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <i-lucide name="mail" class="w-5 h-5"></i-lucide>
              </span>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="admin@easydry.com"
                class="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-easydry-blue focus:bg-white focus:border-easydry-blue transition-all">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Contraseña</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <i-lucide name="lock" class="w-5 h-5"></i-lucide>
              </span>
              <input
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                required
                placeholder="••••••••"
                class="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-easydry-blue focus:bg-white focus:border-easydry-blue transition-all">
              <button
                type="button"
                (click)="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
                <i-lucide [name]="showPassword ? 'eye-off' : 'eye'" class="w-5 h-5"></i-lucide>
              </button>
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loading"
            class="w-full py-4 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl shadow-lg hover:shadow-glow-green transition-all duration-300 flex items-center justify-center gap-2 text-sm">
            @if (loading) {
              <i-lucide name="refresh-cw" class="w-4 h-4 animate-spin"></i-lucide>
              <span>Autenticando...</span>
            } @else {
              <i-lucide name="log-in" class="w-4 h-4"></i-lucide>
              <span>Iniciar Sesión en EasyDry</span>
            }
          </button>
        </form>

        <div class="mt-8 text-center border-t border-slate-100 pt-4">
          <p class="text-xs text-slate-400 font-medium">© 2026 EasyDry® Ecuador. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  email = 'admin@easydry.com';
  password = 'admin';
  showPassword = false;
  loading = false;

  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLogin() {
    if (!this.email || !this.password) {
      this.toastService.warning('Campos Requeridos', 'Por favor ingrese su usuario y contraseña.');
      return;
    }

    this.loading = true;
    this.authService.login(this.email, this.password).subscribe(res => {
      this.loading = false;
      if (res.success && res.user) {
        this.toastService.success('Acceso Correcto', `Bienvenido al sistema EasyDry®, ${res.user.nombre}`);
        this.router.navigate(['/dashboard']);
      } else {
        this.toastService.error('Error de Acceso', res.message || 'Credenciales incorrectas');
      }
    });
  }
}

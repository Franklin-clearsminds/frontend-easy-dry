import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { environment } from '../../core/config/env';

interface FloatingParticle {
  id: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  styles: [`
    @keyframes floatParticle {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-26px); }
    }
    @keyframes pulseHalo {
      0%, 100% { opacity: 0.35; transform: scale(0.99); }
      50% { opacity: 0.75; transform: scale(1.02); }
    }
    @keyframes waveSlowH1 {
      0% { transform: translateX(0); }
      50% { transform: translateX(-40px); }
      100% { transform: translateX(0); }
    }
    @keyframes waveSlowH2 {
      0% { transform: translateX(0); }
      50% { transform: translateX(35px); }
      100% { transform: translateX(0); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    .anim-wave-1 {
      animation: waveSlowH1 12s ease-in-out infinite;
    }
    .anim-wave-2 {
      animation: waveSlowH2 10s ease-in-out infinite;
    }
    .anim-halo {
      animation: pulseHalo 3.5s ease-in-out infinite;
    }
    .animate-shake {
      animation: shake 0.4s ease-in-out;
    }
  `],
  template: `
    <!-- Contenedor Principal: Fondo Oceánico con Gradiente Idéntico a Mobile -->
    <div class="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-[#000d1a] via-[#001f3f] to-[#000b14] select-none">
      
      <!-- Ambient Glow Orbs -->
      <div class="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-teal-400/15 blur-3xl pointer-events-none"></div>

      <!-- Fluid Animated SVG Water Waves in Background (Bottom) -->
      <div class="absolute bottom-0 left-0 right-0 h-64 overflow-hidden pointer-events-none">
        <div class="absolute bottom-0 left-0 w-[200%] h-60 opacity-20 anim-wave-1">
          <svg viewBox="0 0 1440 320" fill="none" class="w-full h-full text-cyan-500" preserveAspectRatio="none">
            <path fill="currentColor" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,170.7C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L0,320Z"></path>
          </svg>
        </div>
        <div class="absolute bottom-0 left-0 w-[200%] h-52 opacity-25 anim-wave-2">
          <svg viewBox="0 0 1440 320" fill="none" class="w-full h-full text-teal-400" preserveAspectRatio="none">
            <path fill="currentColor" d="M0,96L48,128C96,160,192,224,288,229.3C384,235,480,181,576,170.7C672,160,768,192,864,208C960,224,1056,224,1152,197.3C1248,171,1344,117,1392,90.7L1440,64L1440,320L0,320Z"></path>
          </svg>
        </div>
      </div>

      <!-- Wrapper de la Tarjeta con Halo y Partículas Flotantes -->
      <div class="w-full max-w-[420px] relative z-10 animate-fade-in-up my-auto">
        
        <!-- Ambient Aqua Halo behind Card -->
        <div class="absolute -inset-3 rounded-[36px] bg-cyan-500/25 blur-xl pointer-events-none anim-halo"></div>

        <!-- Floating Bubble Particles around Card (12 exact particles from mobile app) -->
        @for (p of particles; track p.id) {
          <div
            class="absolute pointer-events-none z-20 flex items-center justify-center rounded-full"
            [style.top]="p.top || 'auto'"
            [style.bottom]="p.bottom || 'auto'"
            [style.left]="p.left || 'auto'"
            [style.right]="p.right || 'auto'"
            [style.width.px]="p.size"
            [style.height.px]="p.size"
            [style.backgroundColor]="p.color"
            [style.boxShadow]="'0 0 14px ' + p.color"
            [style.animation]="'floatParticle ' + p.duration + 's ease-in-out infinite ' + p.delay + 's'">
            <div class="w-[35%] h-[35%] rounded-full bg-white/90 mt-[15%] ml-[15%]"></div>
          </div>
        }

        <!-- Tarjeta Principal Glassmorphic Idéntica a la App -->
        <div
          class="relative rounded-[24px] bg-white/[0.96] border-[1.5px] border-white/80 shadow-[0_16px_35px_rgba(6,182,212,0.35)] overflow-hidden pt-6 px-6 pb-7 sm:pt-7 sm:px-8 sm:pb-8">
          
          <!-- Top Accent Gradient Line -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#004282] via-[#22d3ee] to-[#2dd4bf]"></div>

          <!-- Logo Section: easydry-logo-stacked.png -->
          <div class="flex items-center justify-center pt-2 pb-1 mb-2">
            <img
              src="assets/images/easydry-logo-stacked.png"
              alt="EasyDry®"
              class="h-24 sm:h-28 w-auto object-contain">
          </div>

          <!-- Title Section -->
          <h1 class="text-[19px] sm:text-xl font-black text-[#0F172A] text-center tracking-tight mb-5 font-outfit">
            Bienvenido al Sistema EasyDry
          </h1>

          <!-- Error Alert Box -->
          @if (errorMessage) {
            <div class="mb-4 py-2.5 px-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl flex items-start gap-2.5 text-[#BE123C] text-xs font-semibold animate-shake">
              <i-lucide name="alert-circle" class="w-4 h-4 text-[#BE123C] flex-shrink-0 mt-0.5"></i-lucide>
              <span class="flex-1 leading-snug">{{ errorMessage }}</span>
            </div>
          }

          <!-- Formulario -->
          <form (ngSubmit)="onLogin()" novalidate class="space-y-4">
            
            <!-- Campo 1: Correo Corporativo -->
            <div>
              <label class="block text-[10px] font-extrabold uppercase tracking-[0.6px] text-[#334155] mb-1.5">
                CORREO CORPORATIVO
              </label>
              <div class="h-[50px] bg-[#F8FAFC] border border-[#E2E8F0] focus-within:border-[#06b6d4] focus-within:bg-white focus-within:shadow-[0_0_8px_rgba(6,182,212,0.25)] rounded-[14px] px-3 flex items-center transition-all">
                <i-lucide name="mail" class="w-[18px] h-[18px] text-slate-400 mr-2.5 flex-shrink-0"></i-lucide>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  placeholder="usuario@easydry.com"
                  (input)="errorMessage = ''"
                  class="w-full bg-transparent text-sm font-semibold text-[#0F172A] placeholder:text-slate-400 placeholder:font-normal outline-none">
              </div>
            </div>

            <!-- Campo 2: Contraseña -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-[10px] font-extrabold uppercase tracking-[0.6px] text-[#334155]">
                  CONTRASEÑA
                </label>
                <button
                  type="button"
                  (click)="onForgotPassword()"
                  class="text-[11px] font-bold text-[#0e7490] hover:text-[#0891b2] transition-colors cursor-pointer">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div class="h-[50px] bg-[#F8FAFC] border border-[#E2E8F0] focus-within:border-[#06b6d4] focus-within:bg-white focus-within:shadow-[0_0_8px_rgba(6,182,212,0.25)] rounded-[14px] px-3 flex items-center transition-all relative">
                <i-lucide name="lock" class="w-[18px] h-[18px] text-slate-400 mr-2.5 flex-shrink-0"></i-lucide>
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  placeholder="••••••••••••"
                  (input)="errorMessage = ''"
                  class="w-full bg-transparent text-sm font-semibold text-[#0F172A] placeholder:text-slate-400 placeholder:font-normal outline-none pr-8">
                <button
                  type="button"
                  (click)="showPassword = !showPassword"
                  class="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer flex items-center justify-center">
                  <i-lucide [name]="showPassword ? 'eye-off' : 'eye'" class="w-[18px] h-[18px]"></i-lucide>
                </button>
              </div>
            </div>

            <!-- Botón Principal con Degradado -->
            <button
              type="submit"
              [disabled]="loading"
              class="w-full mt-2 h-[52px] rounded-[14px] bg-gradient-to-r from-[#004282] via-[#0891b2] to-[#14b8a6] hover:opacity-95 active:scale-[0.99] text-white font-black text-sm tracking-wide shadow-[0_8px_16px_rgba(8,145,178,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed">
              @if (loading) {
                <i-lucide name="refresh-cw" class="w-4 h-4 animate-spin text-white"></i-lucide>
                <span>Ingresando al Sistema...</span>
              } @else {
                <span>Ingresar al Sistema</span>
                <i-lucide name="arrow-right" class="w-[18px] h-[18px] text-white"></i-lucide>
              }
            </button>
          </form>

        </div>

        <!-- Footer Idéntico a Mobile -->
        <div class="text-center mt-6 space-y-1 text-xs">
          <p class="text-[11px] text-white/45">
            © 2026 EasyDry® Ecuador. Todos los derechos reservados.
          </p>
          <div class="flex items-center justify-center gap-1.5 text-[11px]">
            <span class="font-bold text-[#22d3ee]/80">Red Nacional v2.4.0</span>
            <span class="text-white/30">·</span>
            <button
              type="button"
              (click)="onPrivacyPolicy()"
              class="text-white/65 hover:text-white underline transition-colors cursor-pointer">
              Política de Privacidad
            </button>
          </div>
        </div>

      </div>

    </div>
  `
})
export class LoginComponent implements OnInit {
  readonly env = environment;

  email = '';
  password = '';
  rememberMe = true;
  showPassword = false;
  loading = false;
  errorMessage = '';

  readonly particles: FloatingParticle[] = [
    { id: 1, top: '-15px', left: '25px', size: 9, duration: 4.2, delay: 0, color: 'rgba(34, 211, 238, 0.85)' },
    { id: 2, top: '-22px', left: '42%', size: 12, duration: 4.8, delay: 0.8, color: 'rgba(45, 212, 191, 0.9)' },
    { id: 3, top: '-12px', right: '22%', size: 8, duration: 3.9, delay: 1.6, color: 'rgba(56, 189, 248, 0.8)' },
    { id: 4, top: '60px', left: '-16px', size: 10, duration: 5.2, delay: 0.4, color: 'rgba(45, 212, 191, 0.85)' },
    { id: 5, top: '180px', left: '-20px', size: 13, duration: 4.4, delay: 2.0, color: 'rgba(34, 211, 238, 0.95)' },
    { id: 6, top: '310px', left: '-14px', size: 8, duration: 4.9, delay: 1.1, color: 'rgba(125, 211, 252, 0.75)' },
    { id: 7, top: '70px', right: '-16px', size: 11, duration: 4.6, delay: 1.4, color: 'rgba(34, 211, 238, 0.9)' },
    { id: 8, top: '210px', right: '-20px', size: 12, duration: 5.4, delay: 0.3, color: 'rgba(45, 212, 191, 0.85)' },
    { id: 9, top: '350px', right: '-16px', size: 9, duration: 3.8, delay: 2.4, color: 'rgba(56, 189, 248, 0.8)' },
    { id: 10, bottom: '-15px', left: '40px', size: 10, duration: 4.5, delay: 0.7, color: 'rgba(34, 211, 238, 0.85)' },
    { id: 11, bottom: '-22px', left: '46%', size: 14, duration: 4.3, delay: 1.9, color: 'rgba(45, 212, 191, 0.9)' },
    { id: 12, bottom: '-16px', right: '70px', size: 8, duration: 5.0, delay: 0.35, color: 'rgba(125, 211, 252, 0.8)' },
  ];

  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  ngOnInit(): void {
    // Si ya está autenticado, redirigir a su vista principal
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      const targetRoute = this.authService.getDefaultRouteForRole(user?.role);
      this.router.navigateByUrl(targetRoute);
      return;
    }

    // Verificar si la sesión expiró (Cognito TokenExpiredException)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
      this.errorMessage = 'Su sesión ha expirado por inactividad. Ingrese nuevamente sus credenciales (TokenExpiredException).';
      this.toastService.warning('Sesión Expirada', this.errorMessage);
    }

    const rememberedEmail = localStorage.getItem('easydry_remembered_email');
    if (rememberedEmail) {
      this.email = rememberedEmail;
      this.rememberMe = true;
    }
  }

  onLogin(): void {
    this.errorMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = 'Debe ingresar su correo corporativo.';
      this.toastService.warning('Campo Requerido', this.errorMessage);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email.trim())) {
      this.errorMessage = 'El formato del correo corporativo no es válido.';
      this.toastService.warning('Correo Inválido', this.errorMessage);
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Debe ingresar su contraseña corporativa.';
      this.toastService.warning('Campo Requerido', this.errorMessage);
      return;
    }

    this.loading = true;

    if (this.rememberMe) {
      localStorage.setItem('easydry_remembered_email', this.email.trim());
    } else {
      localStorage.removeItem('easydry_remembered_email');
    }

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.user) {
          this.toastService.success('Acceso Correcto', `Bienvenido(a) ${res.user.nombre} (${res.user.rolNombre})`);
          const targetRoute = this.authService.getDefaultRouteForRole(res.user.role);
          this.router.navigateByUrl(targetRoute);
        } else {
          const rawMsg = res.message || '';
          if (rawMsg.toLowerCase().includes('no registrado') || rawMsg.toLowerCase().includes('no encontrado')) {
            this.errorMessage = 'Usuario no encontrado en el directorio corporativo (UserNotFoundException).';
          } else if (rawMsg.toLowerCase().includes('contraseña incorrecta')) {
            this.errorMessage = 'Contraseña incorrecta. Verifique sus credenciales (NotAuthorizedException).';
          } else if (rawMsg.toLowerCase().includes('inactiv') || rawMsg.toLowerCase().includes('suspendid')) {
            this.errorMessage = 'Su cuenta se encuentra inactiva o deshabilitada. Contacte a TI (UserDisabledException).';
          } else {
            this.errorMessage = rawMsg || 'Error de autenticación. Verifique sus credenciales.';
          }
          this.toastService.error('Error de Acceso', this.errorMessage);
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Error de conexión con el servicio de autenticación corporativo.';
        this.toastService.error('Error de Servidor', this.errorMessage);
      }
    });
  }

  onForgotPassword(): void {
    this.toastService.info(
      'Recuperación de Acceso',
      'Por políticas de seguridad institucional, contacta a tu Administrador de Red o envía un correo a soporte@easydry.com.'
    );
  }

  onPrivacyPolicy(): void {
    this.toastService.info(
      'Política de Privacidad',
      'Plataforma corporativa EasyDry® protegida con cifrado TLS 1.3 y autenticación basada en roles (RBAC).'
    );
  }
}

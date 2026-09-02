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
  styles: [`
    /* Animación de Ondas Fluidas */
    @keyframes waveSlow1 {
      0% { transform: translateY(0) scale(1) rotate(0deg); }
      50% { transform: translateY(-25px) scale(1.05) rotate(1.5deg); }
      100% { transform: translateY(0) scale(1) rotate(0deg); }
    }
    @keyframes waveSlow2 {
      0% { transform: translateY(0) scale(1) rotate(0deg); }
      50% { transform: translateY(30px) scale(1.06) rotate(-2deg); }
      100% { transform: translateY(0) scale(1) rotate(0deg); }
    }
    @keyframes oceanSurge {
      0% { transform: translateX(0) translateY(0); }
      50% { transform: translateX(-30px) translateY(-15px); }
      100% { transform: translateX(0) translateY(0); }
    }

    .anim-wave-1 {
      animation: waveSlow1 12s ease-in-out infinite;
    }
    .anim-wave-2 {
      animation: waveSlow2 16s ease-in-out infinite;
    }
    .anim-wave-bottom {
      animation: oceanSurge 10s ease-in-out infinite;
    }

    /* Animaciones Flotantes Orgánicas de Burbujas de Agua */
    @keyframes floatBubbleA {
      0% { transform: translateY(0px) translateX(0px) scale(1); }
      33% { transform: translateY(-16px) translateX(5px) scale(1.05); }
      66% { transform: translateY(-30px) translateX(-4px) scale(0.97); }
      100% { transform: translateY(0px) translateX(0px) scale(1); }
    }
    @keyframes floatBubbleB {
      0% { transform: translateY(0px) translateX(0px) scale(1); }
      40% { transform: translateY(-26px) translateX(-6px) scale(1.08); }
      75% { transform: translateY(-12px) translateX(4px) scale(0.95); }
      100% { transform: translateY(0px) translateX(0px) scale(1); }
    }
    @keyframes floatBubbleC {
      0% { transform: translateY(0px) translateX(0px) scale(1); }
      50% { transform: translateY(-38px) translateX(7px) scale(1.1); }
      100% { transform: translateY(0px) translateX(0px) scale(1); }
    }

    .anim-bubble-1 { animation: floatBubbleA 6s ease-in-out infinite; }
    .anim-bubble-2 { animation: floatBubbleB 7.5s ease-in-out infinite 0.8s; }
    .anim-bubble-3 { animation: floatBubbleC 9s ease-in-out infinite 1.5s; }
    .anim-bubble-4 { animation: floatBubbleA 8s ease-in-out infinite 2.2s; }
    .anim-bubble-5 { animation: floatBubbleB 6.8s ease-in-out infinite 1.2s; }
    .anim-bubble-6 { animation: floatBubbleC 10s ease-in-out infinite 0.5s; }
  `],
  template: `
    <!-- Contenedor Principal: Fondo Oceánico Profundo con Ondas y Burbujas de Agua en Movimiento -->
    <div class="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-b from-[#023E73] via-[#012E57] to-[#011C38] select-none">
      
      <!-- ================================================================= -->
      <!-- ONDAS ORGÁNICAS DE AGUA EN EL FONDO (LATERALES Y EN MOVIMIENTO)   -->
      <!-- ================================================================= -->
      <!-- Ondas laterales izquierda animadas -->
      <div class="absolute -left-28 top-0 w-[600px] h-full pointer-events-none opacity-35 anim-wave-1">
        <svg viewBox="0 0 500 1000" fill="none" class="w-full h-full text-cyan-400" preserveAspectRatio="none">
          <path d="M0,0 C150,200 50,450 180,650 C260,780 120,900 0,1000 L0,0 Z" fill="currentColor" fill-opacity="0.18"></path>
          <path d="M0,50 C220,250 80,500 240,750 C320,880 180,950 0,1000 L0,50 Z" fill="#006699" fill-opacity="0.25"></path>
        </svg>
      </div>

      <!-- Ondas laterales derecha animadas -->
      <div class="absolute -right-28 top-0 w-[600px] h-full pointer-events-none opacity-35 anim-wave-2">
        <svg viewBox="0 0 500 1000" fill="none" class="w-full h-full text-teal-400" preserveAspectRatio="none">
          <path d="M500,0 C350,180 450,420 320,620 C240,750 380,880 500,1000 L500,0 Z" fill="currentColor" fill-opacity="0.15"></path>
          <path d="M500,80 C280,280 420,520 260,770 C180,900 320,960 500,1000 L500,80 Z" fill="#007799" fill-opacity="0.22"></path>
        </svg>
      </div>

      <!-- Marea ondulatoria inferior -->
      <div class="absolute -bottom-10 left-0 right-0 h-72 pointer-events-none opacity-20 anim-wave-bottom">
        <svg viewBox="0 0 1440 320" fill="none" class="w-full h-full text-cyan-500" preserveAspectRatio="none">
          <path fill="currentColor" d="M0,192L48,186.7C96,181,192,171,288,181.3C384,192,480,224,576,213.3C672,203,768,149,864,138.7C960,128,1056,160,1152,176C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,968,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <!-- ================================================================= -->
      <!-- BURBUJAS DE AGUA FLOTANTES CON ANIMACIÓN REALISTA                -->
      <!-- ================================================================= -->
      <!-- Burbujas lado izquierdo -->
      <div class="absolute left-[8%] top-[28%] w-8 h-8 rounded-full border border-white/60 bg-gradient-to-tr from-cyan-400/20 via-white/40 to-white/80 shadow-[0_0_14px_rgba(56,189,248,0.6),inset_0_0_6px_rgba(255,255,255,0.8)] backdrop-blur-xs pointer-events-none anim-bubble-1">
        <div class="w-1.5 h-1.5 rounded-full bg-white/90 absolute top-1.5 left-2"></div>
      </div>
      <div class="absolute left-[13%] top-[35%] w-4 h-4 rounded-full border border-white/60 bg-white/40 shadow-[0_0_8px_rgba(56,189,248,0.5)] pointer-events-none anim-bubble-2">
        <div class="w-0.5 h-0.5 rounded-full bg-white absolute top-1 left-1"></div>
      </div>
      <div class="absolute left-[10%] top-[45%] w-6 h-6 rounded-full border border-white/50 bg-gradient-to-tr from-cyan-400/30 to-white/70 shadow-[0_0_10px_rgba(56,189,248,0.5)] pointer-events-none anim-bubble-3">
        <div class="w-1 h-1 rounded-full bg-white/90 absolute top-1 left-1.5"></div>
      </div>
      <div class="absolute left-[15%] top-[52%] w-3 h-3 rounded-full border border-white/60 bg-white/50 pointer-events-none anim-bubble-4"></div>
      <div class="absolute left-[7%] top-[60%] w-9 h-9 rounded-full border border-white/50 bg-gradient-to-tr from-teal-400/20 via-white/30 to-white/70 shadow-[0_0_14px_rgba(45,212,191,0.5)] pointer-events-none anim-bubble-5">
        <div class="w-1.5 h-1.5 rounded-full bg-white/90 absolute top-2 left-2.5"></div>
      </div>
      <div class="absolute left-[12%] top-[68%] w-5 h-5 rounded-full border border-white/50 bg-white/40 shadow-[0_0_8px_rgba(56,189,248,0.4)] pointer-events-none anim-bubble-6"></div>

      <!-- Burbujas lado derecho -->
      <div class="absolute right-[9%] top-[25%] w-5 h-5 rounded-full border border-white/50 bg-white/50 shadow-[0_0_10px_rgba(56,189,248,0.5)] pointer-events-none anim-bubble-2">
        <div class="w-1 h-1 rounded-full bg-white/90 absolute top-1 left-1.5"></div>
      </div>
      <div class="absolute right-[14%] top-[32%] w-8 h-8 rounded-full border border-white/60 bg-gradient-to-tr from-cyan-400/20 via-white/40 to-white/80 shadow-[0_0_14px_rgba(56,189,248,0.6),inset_0_0_6px_rgba(255,255,255,0.8)] pointer-events-none anim-bubble-1">
        <div class="w-1.5 h-1.5 rounded-full bg-white/90 absolute top-1.5 left-2"></div>
      </div>
      <div class="absolute right-[8%] top-[42%] w-4 h-4 rounded-full border border-white/60 bg-white/40 pointer-events-none anim-bubble-4"></div>
      <div class="absolute right-[15%] top-[48%] w-7 h-7 rounded-full border border-white/50 bg-gradient-to-tr from-cyan-400/30 to-white/70 shadow-[0_0_10px_rgba(56,189,248,0.5)] pointer-events-none anim-bubble-3">
        <div class="w-1 h-1 rounded-full bg-white/90 absolute top-1.5 left-2"></div>
      </div>
      <div class="absolute right-[11%] top-[58%] w-4 h-4 rounded-full border border-white/50 bg-white/40 pointer-events-none anim-bubble-5"></div>
      <div class="absolute right-[13%] top-[65%] w-6 h-6 rounded-full border border-white/40 bg-gradient-to-tr from-teal-400/20 via-white/30 to-white/70 shadow-[0_0_10px_rgba(45,212,191,0.4)] pointer-events-none anim-bubble-6">
        <div class="w-1 h-1 rounded-full bg-white absolute top-1 left-1.5"></div>
      </div>

      <!-- ================================================================= -->
      <!-- TARJETA DE LOGIN CON BORDE NEÓN CYAN Y GLASSMORPHISM             -->
      <!-- ================================================================= -->
      <div class="w-full max-w-[390px] relative z-10 animate-fade-in-up">
        
        <div
          class="rounded-[1.75rem] p-7 sm:p-8 transition-all duration-300 relative overflow-hidden"
          style="
            background: rgba(220, 233, 245, 0.82);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 2px solid rgba(125, 211, 252, 0.85);
            box-shadow: 
              0 0 35px rgba(56, 189, 248, 0.45),
              0 0 15px rgba(56, 189, 248, 0.25),
              inset 0 0 20px rgba(255, 255, 255, 0.45),
              0 25px 60px rgba(0, 0, 0, 0.5);
          ">

          <!-- Resplandor sutil superior derecho en el interior de la tarjeta -->
          <div class="absolute -top-12 -right-12 w-36 h-36 bg-cyan-200/50 rounded-full blur-2xl pointer-events-none"></div>

          <!-- Logo EasyDry Centrado (Gota azul-turquesa + texto easydry) -->
          <div class="flex items-center justify-center gap-2 mb-3">
            <!-- Icono Gota de Agua con Degradado Oficial -->
            <svg class="w-8 h-8 flex-shrink-0" viewBox="0 0 100 100" fill="none">
              <defs>
                <linearGradient id="easyDropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#38BDF8" />
                  <stop offset="45%" stop-color="#0284C7" />
                  <stop offset="100%" stop-color="#0E7490" />
                </linearGradient>
              </defs>
              <path d="M50 6 C50 6, 16 52, 16 70 C16 88, 31 96, 50 96 C69 96, 84 88, 84 70 C84 52, 50 6, 50 6 Z" fill="url(#easyDropGrad)" />
            </svg>
            <span class="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#0B2A4A] font-outfit lowercase leading-none">
              easydry
            </span>
          </div>

          <!-- Título y Subtítulo Exactos -->
          <h1 class="text-center font-black text-xs sm:text-[13px] tracking-wider text-[#0B2A4A] uppercase font-outfit">
            BIENVENIDO AL SISTEMA EASYDRY
          </h1>
          <p class="text-center text-xs text-slate-500 font-medium mt-1 mb-5">
            Identifícate para continuar
          </p>

          <!-- Mensaje de Error en caso de credencial inválida -->
          @if (errorMessage) {
            <div class="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs animate-shake">
              <i-lucide name="alert-circle" class="w-4 h-4 text-rose-600 flex-shrink-0"></i-lucide>
              <p class="font-bold flex-1 text-[11px]">{{ errorMessage }}</p>
            </div>
          }

          <!-- Formulario -->
          <form (ngSubmit)="onLogin()" novalidate class="space-y-3.5">
            
            <!-- Campo 1: Correo Corporativo -->
            <div>
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                CORREO CORPORATIVO
              </label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <i-lucide name="mail" class="w-4 h-4"></i-lucide>
                </span>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  placeholder="usuario@easydry.com"
                  (input)="errorMessage = ''"
                  class="w-full pl-9 pr-3 py-2 bg-slate-100/90 border border-teal-500/60 focus:border-teal-600 focus:ring-2 focus:ring-teal-400/25 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-inner">
              </div>
            </div>

            <!-- Campo 2: Contraseña -->
            <div>
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                CONTRASEÑA
              </label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <i-lucide name="lock" class="w-4 h-4"></i-lucide>
                </span>
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  placeholder="••••••••••••"
                  (input)="errorMessage = ''"
                  class="w-full pl-9 pr-9 py-2 bg-slate-100/90 border border-slate-200/90 focus:border-teal-600 focus:ring-2 focus:ring-teal-400/25 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-inner">
                <button
                  type="button"
                  (click)="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <i-lucide [name]="showPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                </button>
              </div>
            </div>

            <!-- Opciones: Recuérdame y ¿Olvidaste tu contraseña? -->
            <div class="flex items-center justify-between text-xs pt-0.5">
              <label class="flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="rememberMe"
                  name="rememberMe"
                  class="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500/30 cursor-pointer">
                <span class="text-[11px]">Recuérdame</span>
              </label>

              <button
                type="button"
                (click)="onForgotPassword()"
                class="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <!-- Botón Principal: Ingresar al Sistema -->
            <button
              type="submit"
              [disabled]="loading"
              class="w-full mt-2.5 py-2.5 px-4 bg-gradient-to-r from-[#0E6D68] via-[#107F79] to-[#128C7E] hover:from-[#0C5A56] hover:to-[#0F756A] active:scale-[0.99] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(14,109,104,0.4)] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              @if (loading) {
                <i-lucide name="refresh-cw" class="w-4 h-4 animate-spin text-white"></i-lucide>
                <span>Validando credenciales...</span>
              } @else {
                <i-lucide name="log-in" class="w-4 h-4 text-cyan-200"></i-lucide>
                <span>Ingresar al Sistema</span>
              }
            </button>
          </form>

        </div>

        <!-- =============================================================== -->
        <!-- PIE DE PÁGINA (EXACTO COMO LA IMAGEN)                           -->
        <!-- =============================================================== -->
        <div class="text-center mt-4 space-y-0.5 text-xs text-white/80 font-normal">
          <p class="text-[11px]">
            © 2026 EasyDry® Red Nacional. Acceso Seguro RBAC. Todos los derechos reservados.
          </p>
          <p class="text-[11px]">
            Todos los derechos reservados en la 
            <button
              type="button"
              (click)="onPrivacyPolicy()"
              class="underline hover:text-white transition-colors cursor-pointer">
              página de la política de Privacidad
            </button>.
          </p>
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
          // Errores específicos preparados para Amazon Cognito
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
      'Recuperación de Acceso (Cognito)',
      'Por directiva corporativa, solicite el restablecimiento de su clave a Soporte TI (soporte@easydry.com) o su administrador.'
    );
  }

  onPrivacyPolicy(): void {
    this.toastService.info('Política de Privacidad', 'Consulta el manual de seguridad y privacidad en el repositorio corporativo.');
  }
}

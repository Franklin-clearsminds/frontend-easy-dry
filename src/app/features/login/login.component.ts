import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
    }

    @keyframes enterPanel {
      from { opacity: 0; transform: translateY(16px) scale(.99); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes drift {
      0%, 100% { transform: translate3d(0, 0, 0); }
      50% { transform: translate3d(18px, -14px, 0); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes floatBubble {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      45% { transform: translate3d(var(--bubble-x, 8px), -18px, 0) scale(1.06); }
      75% { transform: translate3d(calc(var(--bubble-x, 8px) * -.45), -8px, 0) scale(.97); }
    }

    .login-page {
      --brand: #064a86;
      --brand-deep: #062f57;
      --ink: #132238;
      --muted: #66758a;
      min-height: 100dvh;
      height: 100dvh;
      position: relative;
      display: grid;
      place-items: center;
      overflow: hidden;
      padding: 32px;
      background:
        radial-gradient(circle at 8% 10%, rgba(84, 174, 225, .18), transparent 28%),
        radial-gradient(circle at 92% 85%, rgba(155, 203, 59, .14), transparent 24%),
        linear-gradient(145deg, #eef6fb 0%, #f8fbfd 48%, #edf5f8 100%);
    }

    .ambient {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(2px);
      animation: drift 12s ease-in-out infinite;
    }

    .ambient-one {
      width: 320px;
      height: 320px;
      left: -160px;
      bottom: -130px;
      border: 1px solid rgba(6, 74, 134, .13);
      box-shadow: 0 0 0 46px rgba(6, 74, 134, .035), 0 0 0 92px rgba(6, 74, 134, .025);
    }

    .ambient-two {
      width: 220px;
      height: 220px;
      right: -90px;
      top: -70px;
      background: rgba(155, 203, 59, .08);
      animation-delay: -5s;
    }

    .login-shell {
      width: min(1160px, 100%);
      min-height: 680px;
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1.04fr .96fr;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, .9);
      border-radius: 30px;
      background: #fff;
      box-shadow: 0 30px 80px rgba(26, 55, 84, .16), 0 4px 18px rgba(26, 55, 84, .07);
      animation: enterPanel .65s cubic-bezier(.16, 1, .3, 1) both;
    }

    .brand-panel {
      position: relative;
      isolation: isolate;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding: 42px 52px 34px;
      color: #fff;
      background:
        radial-gradient(circle at 15% 5%, rgba(72, 174, 225, .28), transparent 30%),
        linear-gradient(150deg, #07538f 0%, #063f75 48%, #052d52 100%);
    }

    .bubble-field {
      position: absolute;
      inset: 0;
      z-index: -1;
      overflow: hidden;
      pointer-events: none;
    }

    .bubble {
      --bubble-size: 18px;
      --bubble-x: 8px;
      position: absolute;
      width: var(--bubble-size);
      height: var(--bubble-size);
      border: 1px solid rgba(255, 255, 255, .48);
      border-radius: 50%;
      background:
        radial-gradient(circle at 32% 26%, rgba(255, 255, 255, .92) 0 7%, transparent 9%),
        radial-gradient(circle at 64% 70%, rgba(99, 205, 230, .08), rgba(255, 255, 255, .22) 66%, rgba(255, 255, 255, .4) 100%);
      box-shadow:
        inset 2px 2px 6px rgba(255, 255, 255, .24),
        0 0 14px rgba(104, 210, 239, .2);
      opacity: .72;
      animation: floatBubble var(--bubble-duration, 7s) ease-in-out var(--bubble-delay, 0s) infinite;
    }

    .brand-panel::before,
    .brand-panel::after {
      content: '';
      position: absolute;
      z-index: -1;
      border-radius: 50%;
      pointer-events: none;
    }

    .brand-panel::before {
      width: 380px;
      height: 380px;
      right: -230px;
      top: 82px;
      border: 1px solid rgba(255, 255, 255, .11);
      box-shadow: 0 0 0 54px rgba(255, 255, 255, .025), 0 0 0 108px rgba(255, 255, 255, .018);
    }

    .brand-panel::after {
      width: 340px;
      height: 160px;
      left: -70px;
      bottom: -92px;
      transform: rotate(-7deg);
      border-radius: 50% 50% 0 0;
      background: linear-gradient(90deg, rgba(56, 171, 204, .26), rgba(155, 203, 59, .14));
    }

    .brand-logo {
      width: 184px;
      display: flex;
      align-items: center;
      filter: drop-shadow(0 8px 16px rgba(0, 20, 40, .18));
    }

    .brand-logo img,
    .mobile-logo img {
      display: block;
      width: 100%;
      height: auto;
    }

    .brand-copy {
      max-width: 470px;
      margin-top: 32px;
    }

    .brand-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 17px;
      padding: 6px 10px;
      border: 1px solid rgba(184, 224, 88, .28);
      border-radius: 999px;
      color: #dff2a9;
      background: rgba(155, 203, 59, .1);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .09em;
      text-transform: uppercase;
    }

    .brand-kicker-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #b2e040;
      box-shadow: 0 0 0 5px rgba(178, 224, 64, .12);
    }

    .brand-copy h1 {
      max-width: 430px;
      margin: 0;
      font-family: 'Outfit', sans-serif;
      font-size: clamp(38px, 3.35vw, 49px);
      font-weight: 650;
      line-height: 1.04;
      letter-spacing: -.035em;
    }

    .brand-copy > p {
      max-width: 445px;
      margin: 15px 0 0;
      color: rgba(235, 246, 255, .76);
      font-size: 15px;
      line-height: 1.58;
    }

    .feature-list {
      display: grid;
      gap: 9px;
      margin-top: 21px;
    }

    .feature-item {
      display: grid;
      grid-template-columns: 34px 1fr;
      align-items: center;
      gap: 12px;
      padding: 9px 11px;
      border: 1px solid rgba(255, 255, 255, .1);
      border-radius: 13px;
      background: rgba(255, 255, 255, .055);
      backdrop-filter: blur(8px);
    }

    .feature-icon {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      color: #cce889;
      background: rgba(155, 203, 59, .12);
    }

    .feature-item strong {
      display: block;
      margin-bottom: 2px;
      font-size: 11px;
      font-weight: 700;
    }

    .feature-item span {
      display: block;
      color: rgba(226, 240, 250, .64);
      font-size: 10px;
      line-height: 1.45;
    }

    .brand-status {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 18px;
      color: rgba(232, 244, 252, .7);
      font-size: 11px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #a9d84d;
      box-shadow: 0 0 0 5px rgba(169, 216, 77, .12);
    }

    .form-panel {
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 58px 68px 28px;
      background: linear-gradient(180deg, #fff 0%, #fff 72%, #fbfdfe 100%);
    }

    .form-content {
      width: min(100%, 410px);
      margin: auto;
    }

    .mobile-logo {
      display: none;
      width: 150px;
      margin-bottom: 28px;
    }

    .form-eyebrow {
      margin: 0 0 10px;
      color: #08726f;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
    }

    .form-content h2 {
      margin: 0;
      color: var(--ink);
      font-family: 'Outfit', sans-serif;
      font-size: 34px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -.025em;
    }

    .form-intro {
      margin: 12px 0 30px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }

    .error-box {
      display: grid;
      grid-template-columns: 20px 1fr;
      align-items: start;
      gap: 10px;
      margin-bottom: 18px;
      padding: 12px 13px;
      border: 1px solid #fecdd3;
      border-radius: 12px;
      color: #9f1239;
      background: #fff1f2;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.5;
    }

    .login-form {
      display: grid;
      gap: 19px;
    }

    .field label {
      display: block;
      margin-bottom: 8px;
      color: #334155;
      font-size: 12px;
      font-weight: 700;
    }

    .input-wrap {
      position: relative;
    }

    .input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      width: 18px;
      height: 18px;
      transform: translateY(-50%);
      color: #8290a3;
      pointer-events: none;
      transition: color .2s ease;
    }

    .input-wrap input {
      width: 100%;
      height: 52px;
      padding: 0 46px;
      border: 1px solid #d9e1e9;
      border-radius: 13px;
      outline: none;
      color: #1e293b;
      background: #fbfcfd;
      font: 500 13px/1 'Inter', sans-serif;
      box-shadow: 0 1px 2px rgba(15, 23, 42, .025);
      transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
    }

    .input-wrap input::placeholder { color: #a1adbc; }
    .input-wrap input:hover { border-color: #b9c7d4; }
    .input-wrap input:focus {
      border-color: #178b88;
      background: #fff;
      box-shadow: 0 0 0 4px rgba(23, 139, 136, .11);
    }

    .input-wrap:focus-within .input-icon { color: #08726f; }

    .password-toggle {
      position: absolute;
      right: 9px;
      top: 50%;
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      transform: translateY(-50%);
      border: 0;
      border-radius: 9px;
      color: #7b899b;
      background: transparent;
      cursor: pointer;
      transition: color .2s ease, background .2s ease;
    }

    .password-toggle:hover { color: #07518b; background: #edf5fa; }
    .password-toggle:focus-visible { outline: 3px solid rgba(23, 139, 136, .18); }

    .form-options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-top: -2px;
    }

    .remember {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      color: #526174;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .remember input {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: #087f7a;
    }

    .text-action {
      border: 0;
      padding: 0;
      color: #07518b;
      background: transparent;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .text-action:hover { color: #087f7a; text-decoration: underline; }
    .text-action:focus-visible { outline: 3px solid rgba(23, 139, 136, .18); outline-offset: 4px; }

    .submit-button {
      width: 100%;
      height: 52px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: 0;
      border-radius: 13px;
      color: #fff;
      background: linear-gradient(110deg, #07518b 0%, #087f7a 100%);
      box-shadow: 0 12px 24px rgba(6, 91, 124, .2);
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
      transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
    }

    .submit-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 16px 28px rgba(6, 91, 124, .25);
      filter: saturate(1.08);
    }

    .submit-button:active:not(:disabled) { transform: translateY(0); }
    .submit-button:focus-visible { outline: 4px solid rgba(23, 139, 136, .18); outline-offset: 3px; }
    .submit-button:disabled { opacity: .68; cursor: wait; }

    .spinner { animation: spin .8s linear infinite; }

    .security-note {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 22px;
      padding-top: 20px;
      border-top: 1px solid #edf1f4;
      color: #79879a;
      font-size: 11px;
      line-height: 1.55;
    }

    .security-note i-lucide {
      flex: 0 0 auto;
      margin-top: 1px;
      color: #7da62d;
    }

    .form-footer {
      width: min(100%, 410px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin: 34px auto 0;
      color: #8a97a7;
      font-size: 10px;
    }

    .form-footer .text-action {
      color: #64748b;
      font-size: 10px;
      font-weight: 600;
    }

    @media (max-width: 900px) {
      .login-page { height: auto; padding: 20px; align-items: start; }
      .login-shell {
        width: min(560px, 100%);
        min-height: auto;
        grid-template-columns: 1fr;
        margin: auto;
        border-radius: 25px;
      }
      .brand-panel {
        min-height: 190px;
        padding: 30px 34px;
      }
      .brand-logo, .feature-list, .brand-status { display: none; }
      .brand-copy { margin-top: 0; }
      .brand-kicker { margin-bottom: 14px; }
      .brand-copy h1 { max-width: 420px; font-size: 34px; }
      .brand-copy > p { margin-top: 12px; font-size: 13px; line-height: 1.55; }
      .form-panel { padding: 38px 44px 24px; }
      .mobile-logo { display: block; }
    }

    @media (max-width: 560px) {
      .login-page { display: block; min-height: 100dvh; height: auto; padding: 0; background: #fff; }
      .ambient { display: none; }
      .login-shell {
        width: 100%;
        min-height: 100dvh;
        margin: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
      .brand-panel {
        min-height: 168px;
        padding: 28px 24px;
        border-radius: 0 0 28px 28px;
      }
      .brand-copy h1 { font-size: 29px; }
      .brand-copy > p { display: none; }
      .form-panel { padding: 31px 24px 22px; }
      .mobile-logo { width: 138px; margin-bottom: 24px; }
      .form-content h2 { font-size: 29px; }
      .form-intro { margin-bottom: 25px; }
      .form-footer { margin-top: 30px; }
    }

    @media (max-height: 760px) and (min-width: 901px) {
      .login-page { padding: 18px 28px; }
      .login-shell { min-height: 630px; }
      .brand-panel { padding: 30px 44px 25px; }
      .brand-logo { width: 168px; }
      .brand-copy { margin-top: 22px; }
      .brand-kicker { margin-bottom: 13px; }
      .brand-copy h1 { max-width: 390px; font-size: 40px; }
      .brand-copy > p { max-width: 410px; margin-top: 11px; font-size: 13px; line-height: 1.5; }
      .feature-list { gap: 7px; margin-top: 16px; }
      .feature-item { grid-template-columns: 30px 1fr; gap: 10px; padding: 7px 9px; }
      .feature-icon { width: 30px; height: 30px; border-radius: 8px; }
      .brand-status { display: none; }
      .form-panel { padding-top: 38px; padding-bottom: 20px; }
      .form-intro { margin-bottom: 24px; }
    }

    @media (min-width: 901px) {
      .login-page { overflow: hidden; }
      .login-shell {
        height: min(680px, calc(100dvh - 40px));
        min-height: 620px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .login-shell, .ambient, .spinner { animation: none !important; }
      * { scroll-behavior: auto !important; }
    }
  `],
  template: `
    <main class="login-page">
      <div class="ambient ambient-one" aria-hidden="true"></div>
      <div class="ambient ambient-two" aria-hidden="true"></div>

      <section class="login-shell" aria-label="Acceso a EasyDry">
        <aside class="brand-panel">
          <div class="bubble-field" aria-hidden="true">
            <span class="bubble" style="--bubble-size:25px;--bubble-duration:7.2s;left:8%;top:18%"></span>
            <span class="bubble" style="--bubble-size:11px;--bubble-duration:6s;--bubble-delay:-2s;left:20%;top:10%"></span>
            <span class="bubble" style="--bubble-size:16px;--bubble-x:-9px;--bubble-duration:8.4s;--bubble-delay:-4s;right:10%;top:21%"></span>
            <span class="bubble" style="--bubble-size:9px;--bubble-duration:5.8s;--bubble-delay:-1s;right:23%;top:11%"></span>
            <span class="bubble" style="--bubble-size:32px;--bubble-x:-7px;--bubble-duration:9s;--bubble-delay:-3s;right:8%;top:55%;opacity:.55"></span>
            <span class="bubble" style="--bubble-size:13px;--bubble-duration:6.7s;--bubble-delay:-5s;left:9%;top:64%"></span>
            <span class="bubble" style="--bubble-size:7px;--bubble-x:-5px;--bubble-duration:5.5s;--bubble-delay:-2.5s;left:43%;top:72%"></span>
            <span class="bubble" style="--bubble-size:19px;--bubble-duration:8s;--bubble-delay:-6s;right:18%;top:79%;opacity:.5"></span>
          </div>

          <div>
            <div class="brand-logo">
              <img src="assets/images/easydry-withe.png" alt="EasyDry" />
            </div>

            <div class="brand-copy">
              <div class="brand-kicker">
                <span class="brand-kicker-dot"></span>
                Plataforma operativa nacional
              </div>
              <h1>La operación completa, en un solo lugar.</h1>
              <p>
                Coordina servicios, equipos e inventario con información confiable
                para cada agencia de la red EasyDry.
              </p>

              <div class="feature-list" aria-label="Beneficios de la plataforma">
                <div class="feature-item">
                  <div class="feature-icon"><i-lucide name="layout-dashboard" class="w-4 h-4"></i-lucide></div>
                  <div>
                    <strong>Visibilidad en tiempo real</strong>
                    <span>Indicadores y operación diaria en una sola vista.</span>
                  </div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon"><i-lucide name="building-2" class="w-4 h-4"></i-lucide></div>
                  <div>
                    <strong>Red de agencias conectada</strong>
                    <span>Procesos consistentes para todos los equipos.</span>
                  </div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon"><i-lucide name="shield-check" class="w-4 h-4"></i-lucide></div>
                  <div>
                    <strong>Acceso seguro por rol</strong>
                    <span>Cada colaborador accede únicamente a lo necesario.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="brand-status">
            <span class="status-dot"></span>
            Red EasyDry conectada y protegida
          </div>
        </aside>

        <section class="form-panel">
          <div class="form-content">
            <div class="mobile-logo">
              <img src="assets/images/easydry-logo-horizontal.png" alt="EasyDry" />
            </div>

            <p class="form-eyebrow">Portal corporativo</p>
            <h2>Bienvenido de nuevo</h2>
            <p class="form-intro">Ingresa con tus credenciales para continuar a tu espacio de trabajo.</p>

            @if (errorMessage) {
              <div class="error-box" role="alert" aria-live="assertive">
                <i-lucide name="alert-circle" class="w-5 h-5"></i-lucide>
                <span>{{ errorMessage }}</span>
              </div>
            }

            <form class="login-form" (ngSubmit)="onLogin()" novalidate>
              <div class="field">
                <label for="login-email">Correo corporativo</label>
                <div class="input-wrap">
                  <i-lucide name="mail" class="input-icon"></i-lucide>
                  <input
                    id="login-email"
                    type="email"
                    [(ngModel)]="email"
                    name="email"
                    autocomplete="username"
                    inputmode="email"
                    required
                    [disabled]="loading"
                    placeholder="nombre@easydry.com"
                    (input)="errorMessage = ''"
                  />
                </div>
              </div>

              <div class="field">
                <label for="login-password">Contraseña</label>
                <div class="input-wrap">
                  <i-lucide name="lock" class="input-icon"></i-lucide>
                  <input
                    id="login-password"
                    [type]="showPassword ? 'text' : 'password'"
                    [(ngModel)]="password"
                    name="password"
                    autocomplete="current-password"
                    required
                    [disabled]="loading"
                    placeholder="Ingresa tu contraseña"
                    (input)="errorMessage = ''"
                  />
                  <button
                    class="password-toggle"
                    type="button"
                    [disabled]="loading"
                    [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                    [title]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                    (click)="showPassword = !showPassword"
                  >
                    <i-lucide [name]="showPassword ? 'eye-off' : 'eye'" class="w-[18px] h-[18px]"></i-lucide>
                  </button>
                </div>
              </div>

              <div class="form-options">
                <label class="remember" for="remember-email">
                  <input id="remember-email" type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
                  Recordar mi correo
                </label>
              </div>

              <button class="submit-button" type="submit" [disabled]="loading">
                @if (loading) {
                  <i-lucide name="refresh-cw" class="w-[18px] h-[18px] spinner"></i-lucide>
                  <span>Validando acceso...</span>
                } @else {
                  <span>Ingresar a la plataforma</span>
                  <i-lucide name="arrow-right" class="w-[18px] h-[18px]"></i-lucide>
                }
              </button>
            </form>

            <div class="security-note">
              <i-lucide name="shield-check" class="w-[17px] h-[17px]"></i-lucide>
              <span>Conexión segura. El acceso y las acciones quedan protegidos según tu rol corporativo.</span>
            </div>
          </div>

          <footer class="form-footer">
            <span>© {{ currentYear }} EasyDry®</span>
            <button class="text-action" type="button" (click)="onPrivacyPolicy()">Privacidad y seguridad</button>
          </footer>
        </section>
      </section>
    </main>
  `
})
export class LoginComponent implements OnInit {
  readonly currentYear = new Date().getFullYear();

  email = '';
  password = '';
  rememberMe = true;
  showPassword = false;
  loading = false;
  errorMessage = '';

  private authService = inject(AuthService);
  private uiState = inject(UiStateService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  ngOnInit(): void {
    this.uiState.setSidebarExpanded(false);

    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      const targetRoute = this.authService.getDefaultRouteForRole(user?.role);
      this.router.navigateByUrl(targetRoute);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
      this.errorMessage = 'Tu sesión expiró por inactividad. Ingresa nuevamente para continuar.';
      this.toastService.warning('Sesión expirada', this.errorMessage);
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
      this.errorMessage = 'Ingresa tu correo corporativo.';
      this.toastService.warning('Campo requerido', this.errorMessage);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email.trim())) {
      this.errorMessage = 'Revisa el formato del correo corporativo.';
      this.toastService.warning('Correo inválido', this.errorMessage);
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Ingresa tu contraseña.';
      this.toastService.warning('Campo requerido', this.errorMessage);
      return;
    }

    this.loading = true;

    if (this.rememberMe) {
      localStorage.setItem('easydry_remembered_email', this.email.trim());
    } else {
      localStorage.removeItem('easydry_remembered_email');
    }

    this.uiState.setSidebarExpanded(false);

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.user) {
          this.uiState.setSidebarExpanded(false);
          this.toastService.success('Acceso correcto', `Bienvenido(a) ${res.user.nombre} (${res.user.rolNombre})`);
          const targetRoute = this.authService.getDefaultRouteForRole(res.user.role);
          this.router.navigateByUrl(targetRoute);
        } else {
          const rawMsg = res.message || '';
          const normalizedMessage = rawMsg.toLowerCase();

          if (normalizedMessage.includes('no registrado') || normalizedMessage.includes('no encontrado')) {
            this.errorMessage = 'No encontramos una cuenta asociada a este correo.';
          } else if (normalizedMessage.includes('contraseña incorrecta')) {
            this.errorMessage = 'La contraseña es incorrecta. Inténtalo nuevamente.';
          } else if (
            normalizedMessage.includes('inactiv') ||
            normalizedMessage.includes('deshabilitad') ||
            normalizedMessage.includes('suspendid')
          ) {
            this.errorMessage = 'Tu cuenta está inactiva. Comunícate con el administrador de EasyDry.';
          } else {
            this.errorMessage = rawMsg || 'No pudimos validar tus credenciales. Inténtalo nuevamente.';
          }
          this.toastService.error('No fue posible ingresar', this.errorMessage);
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No pudimos conectar con el servicio de acceso. Inténtalo en unos minutos.';
        this.toastService.error('Error de conexión', this.errorMessage);
      }
    });
  }

  onPrivacyPolicy(): void {
    this.toastService.info(
      'Privacidad y seguridad',
      'Consulta el manual de seguridad y privacidad en el repositorio corporativo.'
    );
  }
}

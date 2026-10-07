import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { environment, isRealProfilePhoto } from '../../../core/config/env';
import { ESCALA_POR_PRESET, ETIQUETA_PRESET, UiScaleService } from '../../../core/services/ui-scale.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <header class="h-20 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 2xl:px-10 flex items-center justify-between sticky top-0 z-30 shadow-xs select-none">

      <!-- Left: Menú móvil / Context Info / Network Status -->
      <div class="flex items-center gap-2 sm:gap-4">
        <!-- Botón de menú: solo en pantallas angostas, abre el cajón del sidebar -->
        <button
          type="button"
          (click)="uiState.openMobile()"
          class="lg:hidden p-2.5 -ml-1 rounded-xl text-slate-600 hover:text-easydry-blue hover:bg-slate-100 transition-colors"
          aria-label="Abrir menú de navegación">
          <i-lucide name="menu" class="w-5 h-5" aria-hidden="true"></i-lucide>
        </button>

        <div class="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
          <div class="w-2.5 h-2.5 rounded-full bg-easydry-green animate-pulse motion-reduce:animate-none" aria-hidden="true"></div>
          <i-lucide name="building-2" class="w-4 h-4 text-easydry-blue" aria-hidden="true"></i-lucide>
          <span class="text-xs font-bold text-slate-700 font-outfit">
            Red Nacional {{ env.appName }}
          </span>
        </div>

      </div>

      <!-- Right: User Context, Notifications & Profile -->
      <div class="flex items-center gap-2 sm:gap-4">

        <!-- Escala general de texto/íconos/espaciado: cicla Pequeño → Normal → Grande → Extra grande -->
        <button
          type="button"
          (click)="siguienteEscala()"
          class="flex items-center gap-1.5 p-2.5 rounded-xl text-slate-600 hover:text-easydry-blue hover:bg-slate-100 transition-colors"
          [attr.aria-label]="'Tamaño de la interfaz: ' + etiquetaEscalaActual() + '. Toca para cambiar al siguiente tamaño.'"
          [title]="'Tamaño: ' + etiquetaEscalaActual()">
          <i-lucide name="sliders" class="w-5 h-5" aria-hidden="true"></i-lucide>
          <span class="hidden lg:inline text-xs font-bold">{{ etiquetaEscalaActual() }}</span>
        </button>

        @if (user; as u) {
          <!-- Role Badge -->
          <div class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold shadow-2xs">
            <i-lucide name="shield-check" class="w-4 h-4 text-purple-600" aria-hidden="true"></i-lucide>
            <span>{{ u.rolNombre || u.role }}</span>
          </div>
        }

        <!-- Notifications -->
        <a
          routerLink="/notificaciones"
          class="p-2.5 rounded-xl text-slate-600 hover:text-easydry-blue hover:bg-slate-100 transition-colors relative inline-flex"
          [attr.aria-label]="unreadCount > 0 ? 'Notificaciones, ' + unreadCount + ' sin leer' : 'Notificaciones'"
          title="Notificaciones">
          <i-lucide name="bell" class="w-5 h-5" aria-hidden="true"></i-lucide>
          @if (unreadCount > 0) {
            <span class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" aria-hidden="true"></span>
          }
        </a>

        <div class="h-8 w-px bg-slate-200" aria-hidden="true"></div>

        @if (user; as u) {
          <!-- User Profile Quick Info -->
          <div class="flex items-center gap-3 pl-1" [attr.title]="u.rolNombre || u.role" [attr.aria-label]="'Usuario: ' + u.nombre + ' ' + u.apellido + ', ' + (u.rolNombre || u.role)" role="group">
            @if (avatarUrl(u.avatar) && !avatarFailed) {
              <img
                [src]="avatarUrl(u.avatar)"
                [alt]="'Foto de ' + u.nombre + ' ' + u.apellido"
                (error)="avatarFailed = true"
                class="w-10 h-10 rounded-full object-cover ring-2 ring-purple-400/40">
            } @else {
              <div class="w-10 h-10 rounded-full bg-slate-100 ring-2 ring-purple-400/40 flex items-center justify-center text-xs font-extrabold text-slate-500" aria-hidden="true">
                {{ (u.nombre || '?').charAt(0) }}{{ (u.apellido || '').charAt(0) }}
              </div>
            }
            <div class="hidden md:flex flex-col">
              <span class="text-xs font-bold text-slate-900 leading-tight">{{ u.nombre }} {{ u.apellido }}</span>
              <span class="text-[11px] font-extrabold text-purple-700 leading-tight uppercase tracking-wider">
                {{ u.sucursal || 'EasyDry' }}
              </span>
            </div>
          </div>
        }

      </div>
    </header>
  `
})
export class HeaderComponent implements OnInit {
  readonly env = environment;
  public authService = inject(AuthService);
  public uiState = inject(UiStateService);
  private notificacionService = inject(NotificacionService);
  private storageUpload = inject(StorageUploadService);
  private uiScaleService = inject(UiScaleService);

  etiquetaEscalaActual(): string {
    return ETIQUETA_PRESET[this.uiScaleService.preset];
  }

  /** Ciclo Pequeño → Normal → Grande → Extra grande → Pequeño... en cada clic. */
  siguienteEscala(): void {
    const presets = Object.keys(ESCALA_POR_PRESET) as Array<keyof typeof ESCALA_POR_PRESET>;
    const indiceActual = presets.indexOf(this.uiScaleService.preset);
    const siguiente = presets[(indiceActual + 1) % presets.length];
    this.uiScaleService.establecer(siguiente);
  }

  avatarFailed = false;
  private lastAvatarSrc = '';

  avatarUrl(value?: string): string {
    if (!isRealProfilePhoto(value)) return '';
    const resolved = this.storageUpload.resolveBackendUrl(value);
    if (resolved !== this.lastAvatarSrc) {
      this.lastAvatarSrc = resolved;
      this.avatarFailed = false;
    }
    return resolved;
  }

  unreadCount = 0;

  get user() { return this.authService.getCurrentUser(); }

  ngOnInit(): void {
    this.notificacionService.notificaciones$.subscribe((list) => {
      this.unreadCount = (list || []).filter(n => !n.leida).length;
    });
    this.notificacionService.getNotificaciones().subscribe();
  }
}


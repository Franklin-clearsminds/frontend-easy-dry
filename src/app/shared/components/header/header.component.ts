import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { environment, isRealProfilePhoto } from '../../../core/config/env';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
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

      </div>

      <!-- Right: User Context, Notifications & Profile -->
      <div class="flex items-center gap-4">

        @if (user; as u) {
          <!-- Role Badge -->
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold shadow-2xs">
            <i-lucide name="shield-check" class="w-4 h-4 text-purple-600"></i-lucide>
            <span>{{ u.rolNombre || u.role }}</span>
          </div>
        }

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

        @if (user; as u) {
          <!-- User Profile Quick Info -->
          <div class="flex items-center gap-3 pl-1">
            @if (avatarUrl(u.avatar) && !avatarFailed) {
              <img
                [src]="avatarUrl(u.avatar)"
                alt="User Avatar"
                (error)="avatarFailed = true"
                class="w-10 h-10 rounded-full object-cover ring-2 ring-purple-400/40">
            } @else {
              <div class="w-10 h-10 rounded-full bg-slate-100 ring-2 ring-purple-400/40 flex items-center justify-center text-xs font-extrabold text-slate-500">
                {{ (u.nombre || '?').charAt(0) }}{{ (u.apellido || '').charAt(0) }}
              </div>
            }
            <div class="flex flex-col">
              <span class="text-xs font-bold text-slate-900 leading-tight">{{ u.nombre }} {{ u.apellido }}</span>
              <span class="text-[10px] font-extrabold text-purple-700 leading-tight uppercase tracking-wider">
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
  private notificacionService = inject(NotificacionService);
  private storageUpload = inject(StorageUploadService);

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


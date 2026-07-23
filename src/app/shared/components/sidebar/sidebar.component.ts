import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ROLE_LABELS, ROLE_COLORS, Role } from '../../../core/models/roles.model';
import { MenuItem } from '../../../core/config/menu.config';

// Agrupar items del menú por grupo
interface MenuGroup {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <!-- Static w-20 Layout Placeholder (Prevents Main Content from Moving) -->
    <div class="w-20 h-screen flex-shrink-0 relative z-40">

      <aside
        (mouseenter)="isHovered = true"
        (mouseleave)="isHovered = false"
        class="absolute top-0 left-0 h-screen bg-gradient-to-b from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep text-white flex flex-col transition-all duration-300 ease-in-out select-none z-50 overflow-hidden border-r border-white/10"
        [ngClass]="isHovered ? 'w-72 shadow-2xl' : 'w-20 shadow-xl'">

        <!-- Logo Header -->
        <div class="h-20 flex items-center px-4 border-b border-white/15 flex-shrink-0 bg-easydry-blue-dark/60">
          <div class="flex items-center gap-3 overflow-hidden cursor-pointer w-full" [routerLink]="['/dashboard']">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-easydry-green to-easydry-lime p-0.5 shadow-glow-green flex-shrink-0 flex items-center justify-center">
              <div class="w-full h-full bg-easydry-blue-dark rounded-[10px] flex items-center justify-center relative overflow-hidden">
                <i-lucide name="droplet" class="w-6 h-6 text-easydry-green fill-easydry-green/30"></i-lucide>
              </div>
            </div>

            @if (isHovered) {
              <div class="flex flex-col animate-fade-in whitespace-nowrap">
                <div class="flex items-center gap-0.5">
                  <span class="font-extrabold text-xl tracking-tight text-white font-outfit">easy</span>
                  <span class="font-extrabold text-xl tracking-tight text-easydry-green font-outfit">dry</span>
                  <span class="text-[9px] align-super text-easydry-lime ml-0.5 font-bold">®</span>
                </div>
                <span class="text-[9px] tracking-widest text-slate-300 uppercase font-bold">Plataforma Admin</span>
              </div>
            }
          </div>
        </div>

        <!-- Rol Badge (expandido) -->
        @if (isHovered && currentRole) {
          <div class="px-4 py-2.5 border-b border-white/10 animate-fade-in flex-shrink-0">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-white">
              <i-lucide name="shield" class="w-3 h-3 text-easydry-lime"></i-lucide>
              <span>{{ rolLabel }}</span>
            </div>
            @if (contextLabel) {
              <p class="text-[9px] text-slate-400 mt-1 truncate">{{ contextLabel }}</p>
            }
          </div>
        }

        <!-- Navigation Menu Groups -->
        <div class="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          @for (group of menuGroups; track group.title) {
            @if (group.items.length > 0) {
              <div class="space-y-1">
                @if (isHovered) {
                  <div class="px-3 pt-1 pb-1 animate-fade-in">
                    <span class="text-[10px] font-extrabold text-easydry-lime/90 uppercase tracking-widest">
                      {{ group.title }}
                    </span>
                  </div>
                }

                <div class="space-y-1">
                  @for (item of group.items; track item.route) {
                    <a
                      [routerLink]="[item.route]"
                      routerLinkActive="bg-white/20 text-easydry-green border-l-4 border-easydry-green shadow-md font-bold"
                      [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                      class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200 group text-xs relative"
                      [ngClass]="{ 'justify-center': !isHovered }">

                      <i-lucide
                        [name]="item.icon"
                        class="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 text-easydry-green">
                      </i-lucide>

                      @if (isHovered) {
                        <span class="flex-1 whitespace-nowrap font-medium text-xs animate-fade-in">{{ item.label }}</span>
                        @if (item.badge) {
                          <span
                            class="px-2 py-0.5 text-[10px] font-extrabold rounded-full flex-shrink-0 shadow-xs animate-fade-in"
                            [ngClass]="item.badgeColor || 'bg-easydry-green text-slate-950'">
                            {{ item.badge }}
                          </span>
                        }
                      } @else {
                        <!-- Tooltip Floating on Rail Mode -->
                        <div class="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl z-50">
                          {{ item.label }}
                        </div>
                      }
                    </a>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- User Profile & Status Footer -->
        <div class="p-3 border-t border-white/10 bg-black/20 flex-shrink-0">
          @if (isHovered) {
            <div class="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10 animate-fade-in">
              <img
                [src]="user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'"
                alt="Avatar"
                class="w-9 h-9 rounded-full object-cover border-2 border-easydry-green flex-shrink-0">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-white truncate">{{ user?.nombre }} {{ user?.apellido }}</p>
                <p class="text-[10px] text-easydry-lime truncate font-bold uppercase tracking-wider">{{ rolLabel }}</p>
              </div>
              <button
                (click)="authService.logout()"
                title="Cerrar Sesión"
                class="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <i-lucide name="log-out" class="w-4 h-4"></i-lucide>
              </button>
            </div>
          } @else {
            <button
              (click)="authService.logout()"
              title="Cerrar Sesión"
              class="w-full flex justify-center py-2 text-slate-300 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors">
              <i-lucide name="log-out" class="w-5 h-5"></i-lucide>
            </button>
          }
        </div>

      </aside>

    </div>
  `
})
export class SidebarComponent {
  isHovered = false;

  public authService = inject(AuthService);
  private permissionService = inject(PermissionService);

  get user() { return this.authService.getCurrentUser(); }
  get currentRole() { return this.authService.getRole(); }
  get rolLabel(): string {
    const r = this.currentRole;
    return r ? ROLE_LABELS[r] : '';
  }
  get contextLabel(): string {
    const u = this.user;
    if (!u) return '';
    if (u.role === Role.SUPER_ADMIN) return 'Red Nacional EasyDry®';
    if (u.role === Role.OPERADOR && u.bahiaNombre) return `${u.sucursalNombre} · ${u.bahiaNombre}`;
    return u.sucursalNombre || '';
  }

  get menuGroups(): MenuGroup[] {
    const items = this.permissionService.getMenuForCurrentRole();
    const groups: Record<string, MenuGroup> = {};

    for (const item of items) {
      const g = item.group || 'General';
      if (!groups[g]) groups[g] = { title: g, items: [] };
      groups[g].items.push(item);
    }

    return Object.values(groups);
  }
}

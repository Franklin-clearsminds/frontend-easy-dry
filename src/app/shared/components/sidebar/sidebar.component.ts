import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { MenuItem } from '../../../core/config/menu.config';

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Desktop / Laptop Sidebar Container -->
    <div class="flex-shrink-0 relative z-40 h-screen transition-all duration-300" [ngClass]="isExpanded() ? 'w-72' : 'w-20'">

      <aside
        class="absolute top-0 left-0 h-screen bg-gradient-to-b from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep text-white flex flex-col transition-all duration-300 ease-in-out select-none overflow-hidden border-r border-white/10 shadow-xl"
        [ngClass]="isExpanded() ? 'w-72' : 'w-20'">

        <!-- Logo Header & Collapse Toggle -->
        <div class="h-20 flex items-center justify-between px-4 border-b border-white/15 flex-shrink-0 bg-easydry-blue-dark/60">
          <div class="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" [routerLink]="['/dashboard']">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-easydry-green to-easydry-lime p-0.5 shadow-glow-green flex-shrink-0 flex items-center justify-center">
              <div class="w-full h-full bg-easydry-blue-dark rounded-[10px] flex items-center justify-center relative overflow-hidden">
                <i-lucide name="droplet" class="w-6 h-6 text-easydry-green fill-easydry-green/30"></i-lucide>
              </div>
            </div>

            @if (isExpanded()) {
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

          <!-- Toggle Expand / Collapse Button -->
          <button
            (click)="toggleExpand()"
            [title]="isExpanded() ? 'Colapsar barra lateral' : 'Expandir barra lateral'"
            class="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
            <i-lucide [name]="isExpanded() ? 'chevron-left' : 'chevron-right'" class="w-4 h-4"></i-lucide>
          </button>
        </div>

        <!-- SuperAdmin Badge -->
        @if (isExpanded()) {
          <div class="px-4 py-2.5 border-b border-white/10 animate-fade-in flex-shrink-0">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-bold text-purple-200">
              <i-lucide name="shield-check" class="w-3.5 h-3.5 text-easydry-lime"></i-lucide>
              <span>Super Administrador</span>
            </div>
            <p class="text-[9px] text-slate-300 mt-1 truncate font-medium">Red Nacional EasyDry®</p>
          </div>
        }

        <!-- Navigation Menu Groups -->
        <div class="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          @for (group of menuGroups; track group.title) {
            @if (group.items.length > 0) {
              <div class="space-y-1">
                @if (isExpanded()) {
                  <div class="px-3 pt-1 pb-1 animate-fade-in">
                    <span class="text-[10px] font-extrabold text-easydry-lime/90 uppercase tracking-widest">
                      {{ group.title }}
                    </span>
                  </div>
                }

                <div class="space-y-1">
                  @for (item of group.items; track item.label + item.route) {
                    <a
                      [routerLink]="[item.route]"
                      routerLinkActive="bg-white/20 text-easydry-green border-l-4 border-easydry-green shadow-md font-bold"
                      [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                      class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-all duration-200 group text-xs relative"
                      [ngClass]="{ 'justify-center': !isExpanded() }">

                      <i-lucide
                        [name]="item.icon"
                        class="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 text-easydry-green">
                      </i-lucide>

                      @if (isExpanded()) {
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
          @if (isExpanded()) {
            <div class="flex flex-col gap-1 animate-fade-in">
              <a 
                routerLink="/perfil"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium">
                <i-lucide name="user" class="w-5 h-5 flex-shrink-0 text-easydry-lime"></i-lucide>
                <span class="whitespace-nowrap">Configuración de Perfil</span>
              </a>
              <button 
                (click)="authService.logout()" 
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 transition-colors text-xs font-medium w-full text-left">
                <i-lucide name="log-out" class="w-5 h-5 flex-shrink-0"></i-lucide>
                <span class="whitespace-nowrap">Cerrar Sesión</span>
              </button>
            </div>
          } @else {
            <div class="flex flex-col gap-2">
              <a 
                routerLink="/perfil"
                title="Configuración de Perfil"
                class="w-full flex justify-center py-2 text-slate-400 hover:text-easydry-lime hover:bg-white/10 rounded-xl transition-colors">
                <i-lucide name="user" class="w-5 h-5"></i-lucide>
              </a>
              <button
                (click)="authService.logout()"
                title="Cerrar Sesión"
                class="w-full flex justify-center py-2 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors">
                <i-lucide name="log-out" class="w-5 h-5"></i-lucide>
              </button>
            </div>
          }
        </div>

      </aside>

    </div>
  `
})
export class SidebarComponent implements OnInit {
  isExpanded = signal(true);

  public authService = inject(AuthService);
  private permissionService = inject(PermissionService);
  private cdr = inject(ChangeDetectorRef);

  menuGroups: MenuGroup[] = [];

  ngOnInit(): void {
    this.refreshMenu();

    this.authService.currentUser$.subscribe(() => {
      this.refreshMenu();
      this.cdr.markForCheck();
    });
  }

  private refreshMenu(): void {
    const items = this.permissionService.getMenuForCurrentRole();
    const groups: Record<string, MenuGroup> = {};
    for (const item of items) {
      const g = item.group || 'General';
      if (!groups[g]) groups[g] = { title: g, items: [] };
      groups[g].items.push(item);
    }
    this.menuGroups = Object.values(groups);
  }

  toggleExpand(): void {
    this.isExpanded.update(v => !v);
  }
}

import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { MenuItem } from '../../../core/config/menu.config';
import { isMobileAppRole } from '../../../core/config/mobile-roles.config';

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

/** Ancho interno expandido del sidebar (w-72 = 288px) */
const SIDEBAR_INNER_W = '288px';
const SIDEBAR_RAIL_W = '80px';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- En el flujo del layout: 80px colapsado / 288px expandido, sin tapar el contenido -->
    <div
      class="h-screen flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out shadow-2xl z-50"
      [style.width]="isExpanded() ? sidebarInnerW : sidebarRailW"
      (mouseenter)="isExpanded.set(true)"
      (mouseleave)="isExpanded.set(false)">

      <aside
        class="h-full w-72 bg-gradient-to-b from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep text-white flex flex-col select-none overflow-hidden border-r border-white/10">

        <!-- Rail 80px: isotipo fijo a la izquierda. Expandido: wordmark + plataforma -->
        <div class="relative h-24 flex-shrink-0 border-b border-white/15 bg-easydry-blue-dark/60">
          <a
            [routerLink]="['/dashboard']"
            class="absolute left-0 top-0 w-20 h-24 flex items-center justify-center transition-opacity duration-200"
            [class.opacity-0]="isExpanded()"
            [class.pointer-events-none]="isExpanded()"
            [attr.tabindex]="isExpanded() ? -1 : 0"
            aria-label="EasyDry®">
            <div class="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center">
              <img
                src="assets/images/easydry-logo-mark.png"
                alt=""
                class="w-full h-full object-contain">
            </div>
          </a>
          <a
            [routerLink]="['/dashboard']"
            class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 transition-opacity duration-200"
            [class.opacity-0]="!isExpanded()"
            [class.pointer-events-none]="!isExpanded()"
            [attr.tabindex]="isExpanded() ? 0 : -1"
            aria-label="EasyDry®">
            <div class="bg-white rounded-lg px-3 py-2">
              <img
                src="assets/images/easydry-logo-horizontal.png"
                alt=""
                class="h-11 w-auto max-w-[230px] object-contain">
            </div>
            <span class="text-[9px] tracking-widest text-slate-300 uppercase font-bold whitespace-nowrap">{{ platformLabel }}</span>
          </a>
        </div>

        <!-- Menú -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden py-3 sidebar-nav-scroll">
          @for (group of menuGroups; track group.title; let groupIndex = $index) {
            @if (group.items.length > 0) {
              <div [class.mt-2]="groupIndex > 0">
                <div
                  class="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
                  [style.grid-template-rows]="isExpanded() ? '1fr' : '0fr'"
                  [class.opacity-100]="isExpanded()"
                  [class.opacity-0]="!isExpanded()">
                  <div class="overflow-hidden" [style.min-width]="sidebarInnerW">
                    <div class="flex h-6 items-center">
                      <div class="w-20 flex-shrink-0"></div>
                      <span class="text-[10px] font-extrabold text-easydry-lime/90 uppercase tracking-widest whitespace-nowrap pr-4">
                        {{ group.title }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="space-y-0.5">
                  @for (item of group.items; track item.label + item.route) {
                    <a
                      [routerLink]="[item.route]"
                      routerLinkActive="bg-white/20 text-easydry-green !border-l-4 !border-easydry-green shadow-md font-bold"
                      [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                      class="flex items-center h-10 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors duration-200 group text-xs relative border-l-4 border-transparent"
                      [style.min-width]="sidebarInnerW">

                      <div class="w-20 flex-shrink-0 flex items-center justify-center">
                        <i-lucide
                          [name]="item.icon"
                          class="w-5 h-5 text-easydry-green transition-transform duration-200 group-hover:scale-110">
                        </i-lucide>
                      </div>

                      <span
                        class="flex-1 whitespace-nowrap font-medium text-xs pr-2 transition-opacity duration-300 ease-in-out"
                        [class.opacity-100]="isExpanded()"
                        [class.opacity-0]="!isExpanded()">
                        {{ item.label }}
                      </span>

                      @if (item.badge) {
                        <span
                          class="px-2 py-0.5 mr-3 text-[10px] font-extrabold rounded-full flex-shrink-0 shadow-xs whitespace-nowrap transition-opacity duration-300 ease-in-out"
                          [ngClass]="item.badgeColor || 'bg-easydry-green text-slate-950'"
                          [class.opacity-100]="isExpanded()"
                          [class.opacity-0]="!isExpanded()">
                          {{ item.badge }}
                        </span>
                      }

                      @if (!isExpanded()) {
                        <div class="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-all duration-150 whitespace-nowrap shadow-xl z-[60]">
                          {{ item.label }}
                          @if (item.badge) {
                            <span class="ml-2 opacity-80">· {{ item.badge }}</span>
                          }
                        </div>
                      }
                    </a>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- Footer -->
        <div class="py-2 border-t border-white/10 bg-black/20 flex-shrink-0 space-y-0.5">
          <a
            routerLink="/perfil"
            [title]="!isExpanded() ? 'Configuración de Perfil' : ''"
            class="flex items-center h-10 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors duration-200 text-xs font-medium"
            [style.min-width]="sidebarInnerW">
            <div class="w-20 flex-shrink-0 flex items-center justify-center">
              <i-lucide name="user" class="w-5 h-5 text-easydry-lime"></i-lucide>
            </div>
            <span
              class="whitespace-nowrap transition-opacity duration-300 ease-in-out"
              [class.opacity-100]="isExpanded()"
              [class.opacity-0]="!isExpanded()">
              Configuración de Perfil
            </span>
          </a>
          <button
            (click)="authService.logout()"
            [title]="!isExpanded() ? 'Cerrar Sesión' : ''"
            class="flex items-center h-10 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 transition-colors duration-200 text-xs font-medium w-full"
            [style.min-width]="sidebarInnerW">
            <div class="w-20 flex-shrink-0 flex items-center justify-center">
              <i-lucide name="log-out" class="w-5 h-5"></i-lucide>
            </div>
            <span
              class="whitespace-nowrap transition-opacity duration-300 ease-in-out text-left"
              [class.opacity-100]="isExpanded()"
              [class.opacity-0]="!isExpanded()">
              Cerrar Sesión
            </span>
          </button>
        </div>

      </aside>
    </div>
  `,
  styles: [`
    .sidebar-nav-scroll {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }
    .sidebar-nav-scroll::-webkit-scrollbar {
      width: 4px;
    }
    .sidebar-nav-scroll::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  isExpanded = signal(false);
  readonly sidebarInnerW = SIDEBAR_INNER_W;
  readonly sidebarRailW = SIDEBAR_RAIL_W;

  public authService = inject(AuthService);
  private permissionService = inject(PermissionService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private subs = new Subscription();

  menuGroups: MenuGroup[] = [];

  get platformLabel(): string {
    const role = this.authService.getRole();
    return isMobileAppRole(role) ? 'App Móvil & Web' : 'Plataforma Admin';
  }

  ngOnInit(): void {
    this.refreshMenu();
    this.cdr.markForCheck();

    this.subs.add(
      this.authService.currentUser$.subscribe(() => {
        this.refreshMenu();
        this.cdr.markForCheck();
      })
    );

    this.subs.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
        this.isExpanded.set(false);
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
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
}

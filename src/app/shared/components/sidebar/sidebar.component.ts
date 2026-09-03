import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { UiStateService, SIDEBAR_INNER_W, SIDEBAR_RAIL_W } from '../../../core/services/ui-state.service';
import { MenuItem } from '../../../core/config/menu.config';
import { isMobileAppRole } from '../../../core/config/mobile-roles.config';

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
    <!-- Overlay backdrop when expanded: opaca suavemente el fondo -->
    @if (isExpanded()) {
      <div
        class="fixed inset-0 bg-slate-950/30 backdrop-blur-[1.5px] z-[990] transition-opacity duration-300 animate-fade-in cursor-pointer"
        (click)="isExpanded.set(false)">
      </div>
    }

    <!-- Sidebar flotante: fixed a la izquierda, sobrepone el contenido -->
    <div
      class="fixed top-0 left-0 h-screen overflow-hidden transition-[width] duration-200 ease-in-out shadow-2xl z-[999]"
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
                      routerLinkActive="bg-white/15 text-easydry-green shadow-md font-bold"
                      #rla="routerLinkActive"
                      [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                      class="flex items-center h-10 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors duration-200 group text-xs relative"
                      [style.min-width]="sidebarInnerW">

                      @if (rla.isActive) {
                        <span class="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-easydry-green shadow-xs"></span>
                      }

                      <div class="w-20 flex-shrink-0 flex items-center justify-center relative">
                        <i-lucide
                          [name]="item.icon"
                          class="w-5 h-5 text-easydry-green transition-transform duration-200 group-hover:scale-110">
                        </i-lucide>
                        @if (!isExpanded() && (item.badgeIcon || item.badge)) {
                          <span class="absolute top-2 right-5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-easydry-blue animate-pulse"></span>
                        }
                      </div>

                      <span
                        class="flex-1 whitespace-nowrap font-medium text-xs pr-2 transition-opacity duration-300 ease-in-out"
                        [class.opacity-100]="isExpanded()"
                        [class.opacity-0]="!isExpanded()">
                        {{ item.label }}
                      </span>

                      @if (item.badgeIcon || item.badge) {
                        <span
                          class="mr-3 flex-shrink-0 whitespace-nowrap transition-opacity duration-300 ease-in-out flex items-center justify-center"
                          [class.opacity-100]="isExpanded()"
                          [class.opacity-0]="!isExpanded()">
                          @if (item.badgeIcon === 'alert-circle-filled' || item.badgeIcon === 'alert-triangle' || item.badge === '!') {
                            <svg class="w-4 h-4 shrink-0 drop-shadow-xs" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="12" fill="#FF2B2B"/>
                              <path d="M10.2 6.4C10.2 5.4 11 4.6 12 4.6C13 4.6 13.8 5.4 13.8 6.4L13.4 14.2C13.4 15 12.8 15.6 12 15.6C11.2 15.6 10.6 15 10.6 14.2L10.2 6.4Z" fill="white"/>
                              <circle cx="12" cy="18.6" r="1.6" fill="white"/>
                            </svg>
                          } @else if (item.badgeIcon) {
                            <span class="w-5 h-5 rounded-full flex items-center justify-center" [ngClass]="item.badgeColor || 'bg-rose-500 text-white'">
                              <i-lucide [name]="item.badgeIcon" class="w-3 h-3 text-white stroke-[2.5]"></i-lucide>
                            </span>
                          } @else {
                            <span class="px-2 py-0.5 text-[10px] font-extrabold rounded-full shadow-xs" [ngClass]="item.badgeColor || 'bg-easydry-green text-slate-950'">
                              {{ item.badge }}
                            </span>
                          }
                        </span>
                      }

                      @if (!isExpanded()) {
                        <div class="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none transition-all duration-150 whitespace-nowrap shadow-xl z-[60] flex items-center gap-1.5">
                          <span>{{ item.label }}</span>
                          @if (item.badgeIcon === 'alert-circle-filled' || item.badgeIcon === 'alert-triangle' || item.badge === '!') {
                            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="12" fill="#FF2B2B"/>
                              <path d="M10.2 6.4C10.2 5.4 11 4.6 12 4.6C13 4.6 13.8 5.4 13.8 6.4L13.4 14.2C13.4 15 12.8 15.6 12 15.6C11.2 15.6 10.6 15 10.6 14.2L10.2 6.4Z" fill="white"/>
                              <circle cx="12" cy="18.6" r="1.6" fill="white"/>
                            </svg>
                          } @else if (item.badge) {
                            <span class="opacity-80">· {{ item.badge }}</span>
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
            routerLinkActive="bg-white/15 text-easydry-green shadow-md font-bold"
            #rlaPerfil="routerLinkActive"
            [title]="!isExpanded() ? 'Configuración de Perfil' : ''"
            class="flex items-center h-10 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors duration-200 text-xs font-medium relative"
            [style.min-width]="sidebarInnerW">
            @if (rlaPerfil.isActive) {
              <span class="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-easydry-green shadow-xs"></span>
            }
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
  readonly uiState = inject(UiStateService);
  /** Signal compartido: el layout lo lee para reservar el espacio del rail. */
  readonly isExpanded = this.uiState.sidebarExpanded;
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

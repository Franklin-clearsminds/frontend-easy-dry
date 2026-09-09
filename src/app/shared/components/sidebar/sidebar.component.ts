import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { UiStateService, SIDEBAR_INNER_W, SIDEBAR_RAIL_W } from '../../../core/services/ui-state.service';
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
    <!-- Overlay backdrop when expanded: opaca suavemente el fondo -->
    @if (isExpanded()) {
      <div
        class="fixed inset-0 bg-slate-950/30 backdrop-blur-[1.5px] z-[990] transition-opacity duration-300 animate-fade-in cursor-pointer"
        (click)="closeSidebar()">
      </div>
    }

    <!-- Sidebar flotante: fixed a la izquierda, sobrepone el contenido -->
    <div
      class="fixed top-0 left-0 h-screen overflow-hidden transition-[width] duration-200 ease-in-out shadow-2xl z-[999]"
      [style.width]="isExpanded() ? sidebarInnerW : sidebarRailW"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()">

      <aside
        class="h-full w-[296px] bg-gradient-to-b from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep text-white flex flex-col select-none overflow-hidden border-r border-white/10">

        <!-- Header / Logo -->
        <div class="relative h-20 flex-shrink-0 border-b border-white/15 bg-easydry-blue-dark/60 flex items-center">
          <!-- Rail 80px: Isotipo centrado con exactitud vertical -->
          <a
            [routerLink]="['/dashboard']"
            class="absolute left-0 top-0 w-20 h-20 flex items-center justify-center transition-opacity duration-200"
            [class.opacity-0]="isExpanded()"
            [class.pointer-events-none]="isExpanded()"
            [attr.tabindex]="isExpanded() ? -1 : 0"
            aria-label="EasyDry®">
            <div class="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-sm">
              <img
                src="assets/images/easydry-logo-mark.png"
                alt="EasyDry"
                class="w-full h-full object-contain">
            </div>
          </a>
          <!-- Expandido: Wordmark horizontal completo con letras azules (mismo eje vertical exacto h-12) -->
          <a
            [routerLink]="['/dashboard']"
            class="absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-200"
            [class.opacity-0]="!isExpanded()"
            [class.pointer-events-none]="!isExpanded()"
            [attr.tabindex]="isExpanded() ? 0 : -1"
            aria-label="EasyDry®">
            <div class="h-12 w-full max-w-[240px] bg-white rounded-xl px-3.5 py-1 flex items-center justify-center shadow-sm">
              <img
                src="assets/images/easydry-logo-horizontal.png"
                alt="EasyDry"
                class="h-8 w-auto max-w-[210px] object-contain">
            </div>
          </a>
        </div>

        <!-- Menú de Navegación -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden py-3 sidebar-nav-scroll space-y-1">
          @for (group of menuGroups; track group.title; let groupIndex = $index) {
            @if (group.items.length > 0) {
              <div>
                <!-- Separador de grupo con altura fija idéntica en ambos modos (24px = h-6) para eliminar saltos verticales -->
                <div class="h-6 flex items-center overflow-hidden">
                  @if (!isExpanded()) {
                    <div class="w-20 flex items-center justify-center">
                      <div class="w-8 h-[1px] bg-white/15 rounded-full"></div>
                    </div>
                  } @else {
                    <div class="px-3.5 flex items-center gap-2">
                      <span class="text-[10px] font-extrabold text-easydry-lime/90 uppercase tracking-widest whitespace-nowrap">
                        {{ group.title }}
                      </span>
                    </div>
                  }
                </div>

                <!-- Lista de Ítems del Grupo -->
                <div class="space-y-1">
                  @for (item of group.items; track item.label + item.route) {
                    <a
                      [routerLink]="[item.route]"
                      routerLinkActive="active-menu-item"
                      #rla="routerLinkActive"
                      [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                      class="flex items-center h-10 rounded-xl transition-all duration-200 group text-xs relative cursor-pointer"
                      [class.w-12]="!isExpanded()"
                      [class.ml-3.5]="!isExpanded()"
                      [class.justify-center]="!isExpanded()"
                      [class.w-[calc(100%-1.25rem)]]="isExpanded()"
                      [class.ml-2.5]="isExpanded()"
                      [class.px-3]="isExpanded()"
                      [ngClass]="rla.isActive
                        ? 'bg-white/15 text-white shadow-md font-bold ring-1 ring-white/15'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'"
                      (click)="onItemClick()">

                      <!-- Indicador vertical verde en el lateral cuando está activo (solo en expandido) -->
                      @if (rla.isActive && isExpanded()) {
                        <span class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-easydry-green shadow-xs"></span>
                      }

                      <!-- Icono -->
                      <div class="flex items-center justify-center relative flex-shrink-0"
                           [class.w-5]="isExpanded()"
                           [class.h-5]="isExpanded()">
                        <i-lucide
                          [name]="item.icon"
                          class="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
                          [ngClass]="rla.isActive ? 'text-easydry-green stroke-[2.2]' : 'text-slate-300 group-hover:text-white'">
                        </i-lucide>

                        <!-- Dot de badge en modo retraído (rail) -->
                        @if (!isExpanded() && (item.badgeIcon || item.badge)) {
                          <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-easydry-blue animate-pulse"></span>
                        }
                      </div>

                      <!-- Label expandido -->
                      <span
                        class="flex-1 whitespace-nowrap font-medium text-xs pr-1 truncate transition-opacity duration-200 ml-3"
                        [class.opacity-100]="isExpanded()"
                        [class.opacity-0]="!isExpanded()"
                        [class.hidden]="!isExpanded()">
                        {{ item.label }}
                      </span>

                      <!-- Badge expandido -->
                      @if (isExpanded() && (item.badgeIcon || item.badge)) {
                        <span class="ml-auto flex-shrink-0 whitespace-nowrap flex items-center justify-center transition-opacity duration-200">
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
                    </a>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- Footer -->
        <div class="py-2 border-t border-white/10 bg-black/20 flex-shrink-0 space-y-1">
          <!-- Perfil -->
          <a
            routerLink="/perfil"
            routerLinkActive="active-menu-item"
            #rlaPerfil="routerLinkActive"
            [title]="!isExpanded() ? 'Configuración de Perfil' : ''"
            class="flex items-center h-10 rounded-xl transition-all duration-200 text-xs font-medium relative cursor-pointer"
            [class.w-12]="!isExpanded()"
            [class.ml-3.5]="!isExpanded()"
            [class.justify-center]="!isExpanded()"
            [class.w-[calc(100%-1.25rem)]]="isExpanded()"
            [class.ml-2.5]="isExpanded()"
            [class.px-3]="isExpanded()"
            [ngClass]="rlaPerfil.isActive
              ? 'bg-white/15 text-white shadow-md font-bold ring-1 ring-white/15'
              : 'text-slate-300 hover:text-white hover:bg-white/10'"
            (click)="onItemClick()">
            @if (rlaPerfil.isActive && isExpanded()) {
              <span class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-easydry-green shadow-xs"></span>
            }
            <div class="flex items-center justify-center flex-shrink-0">
              <i-lucide name="user" class="w-5 h-5 text-easydry-lime"></i-lucide>
            </div>
            <span
              class="whitespace-nowrap transition-opacity duration-200 ml-3"
              [class.opacity-100]="isExpanded()"
              [class.opacity-0]="!isExpanded()"
              [class.hidden]="!isExpanded()">
              Configuración de Perfil
            </span>
          </a>

          <!-- Logout -->
          <button
            (click)="authService.logout()"
            [title]="!isExpanded() ? 'Cerrar Sesión' : ''"
            class="flex items-center h-10 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 transition-all duration-200 text-xs font-medium cursor-pointer"
            [class.w-12]="!isExpanded()"
            [class.ml-3.5]="!isExpanded()"
            [class.justify-center]="!isExpanded()"
            [class.w-[calc(100%-1.25rem)]]="isExpanded()"
            [class.ml-2.5]="isExpanded()"
            [class.px-3]="isExpanded()">
            <div class="flex items-center justify-center flex-shrink-0">
              <i-lucide name="log-out" class="w-5 h-5"></i-lucide>
            </div>
            <span
              class="whitespace-nowrap transition-opacity duration-200 text-left ml-3"
              [class.opacity-100]="isExpanded()"
              [class.opacity-0]="!isExpanded()"
              [class.hidden]="!isExpanded()">
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
  private expandTimeout: ReturnType<typeof setTimeout> | null = null;
  private collapseTimeout: ReturnType<typeof setTimeout> | null = null;
  private isNavigationCooldown = true;


  ngOnInit(): void {
    this.closeSidebarImmediate();
    this.refreshMenu();
    this.cdr.markForCheck();

    setTimeout(() => {
      this.isNavigationCooldown = false;
    }, 400);

    this.subs.add(
      this.authService.currentUser$.subscribe(() => {
        this.closeSidebarImmediate();
        this.refreshMenu();
        this.cdr.markForCheck();
      })
    );

    this.subs.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
        this.closeSidebarImmediate();
        this.isNavigationCooldown = true;
        setTimeout(() => {
          this.isNavigationCooldown = false;
        }, 400);
      })
    );
  }

  ngOnDestroy(): void {
    if (this.expandTimeout) {
      clearTimeout(this.expandTimeout);
      this.expandTimeout = null;
    }
    if (this.collapseTimeout) {
      clearTimeout(this.collapseTimeout);
      this.collapseTimeout = null;
    }
    this.subs.unsubscribe();
  }

  public onMouseEnter(): void {
    if (this.isNavigationCooldown) return;

    if (this.collapseTimeout) {
      clearTimeout(this.collapseTimeout);
      this.collapseTimeout = null;
    }

    if (!this.isExpanded()) {
      if (this.expandTimeout) {
        clearTimeout(this.expandTimeout);
      }
      this.expandTimeout = setTimeout(() => {
        if (!this.isExpanded()) {
          this.isExpanded.set(true);
          this.cdr.markForCheck();
        }
      }, 70);
    }
  }

  public onMouseLeave(): void {
    if (this.expandTimeout) {
      clearTimeout(this.expandTimeout);
      this.expandTimeout = null;
    }
    if (this.collapseTimeout) {
      clearTimeout(this.collapseTimeout);
    }
    this.collapseTimeout = setTimeout(() => {
      if (this.isExpanded()) {
        this.isExpanded.set(false);
        this.cdr.markForCheck();
      }
    }, 140);
  }

  public onItemClick(): void {
    this.closeSidebarImmediate();
  }

  public closeSidebar(): void {
    this.closeSidebarImmediate();
  }

  private closeSidebarImmediate(): void {
    if (this.expandTimeout) {
      clearTimeout(this.expandTimeout);
      this.expandTimeout = null;
    }
    if (this.collapseTimeout) {
      clearTimeout(this.collapseTimeout);
      this.collapseTimeout = null;
    }
    if (this.isExpanded()) {
      this.isExpanded.set(false);
      this.cdr.markForCheck();
    }
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

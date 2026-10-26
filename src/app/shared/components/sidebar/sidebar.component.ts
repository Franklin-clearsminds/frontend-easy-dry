import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../../../core/services/permission.service';
import { UiStateService } from '../../../core/services/ui-state.service';
import { MenuIndicadoresService } from '../../../core/services/menu-indicadores.service';
import { SIDEBAR_HOVER_CLOSE_DELAY_MS, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_HOVER_PREVIEW, SIDEBAR_WIDTH_MINI } from '../../../core/config/sidebar.constants';
import { MenuItem } from '../../../core/config/menu.config';

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

/**
 * Sidebar de navegación corporativo con cuatro modos: fijado expandido (empuja el layout), mini
 * (empuja el layout, solo íconos), vista previa flotante al pasar el cursor sobre el mini (no empuja
 * el layout) y cajón móvil en pantallas angostas. El estado (modo, grupos plegados) vive en
 * `UiStateService` y se recuerda entre sesiones vía localStorage.
 *
 * Estructura en dos capas (clave para que la animación se vea fluida y sincronizada):
 *  - Envoltura exterior: sin contenido propio, solo recorta (overflow-hidden) y anima su `width`. Al
 *    no tener hijos que reflujen, redimensionarla es barato.
 *  - `<aside>` interior: SIEMPRE 260px de ancho por dentro (nunca cambia), así los íconos, textos y
 *    badges no se recalculan en cada fotograma de la transición — solo se revelan o recortan según el
 *    ancho de la envoltura. Esto es lo que evita que el logo (u otro elemento con opacidad) se vea
 *    "adelantado" respecto al resto: nada dentro del aside vuelve a calcular su layout durante el
 *    cambio de modo, todo el costo de la animación vive en una sola caja vacía.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop del cajón móvil -->
    @if (!uiState.isLargeScreen() && uiState.mobileOpen()) {
      <div
        class="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[990] transition-opacity duration-300 animate-fade-in cursor-pointer"
        (click)="uiState.closeMobile()"
        aria-hidden="true">
      </div>
    }

    <!-- Backdrop sutil detrás de la vista previa flotante (modo mini + hover) -->
    @if (isHoverOverlay()) {
      <div class="fixed inset-0 z-[38]" (click)="uiState.setHoverPreview(false)" aria-hidden="true"></div>
    }

    <!-- Envoltura exterior: única responsable de animar el ancho (4.25/16.25rem, escalan con --ui-scale) y de recortar el contenido. -->
    <div
      class="fixed top-0 left-0 h-dvh overflow-hidden transition-[width] duration-200 ease-out
             [contain:layout_style_size] [will-change:width]"
      [style.width.rem]="wrapperWidthPx() / 16"
      [ngClass]="wrapperExtraClasses()"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
      (focusin)="onMouseEnter()"
      (focusout)="onFocusOut($event)"
      (keydown.escape)="uiState.setHoverPreview(false); uiState.closeMobile()">

      <!-- Aside interior: ancho fijo de 260px siempre, nunca anima ni reflowea sus hijos. -->
      <aside class="h-full w-[16.25rem] flex flex-col select-none border-r border-white/10
                     bg-gradient-to-b from-easydry-blue via-easydry-blue-dark to-easydry-blue-deep text-white">

        <!-- Cabecera / logo -->
        <div class="h-20 flex-shrink-0 border-b border-white/15 bg-easydry-blue-dark/60 relative flex items-center">
          <!-- Isotipo centrado: solo visible en modo mini sin vista previa -->
          <a
            [routerLink]="['/dashboard']"
            class="absolute left-0 top-0 bottom-0 w-[4.25rem] flex items-center justify-center transition-opacity duration-200 ease-out"
            [style.opacity]="showLabels() ? '0' : '0.92'"
            [class.pointer-events-none]="showLabels()"
            [attr.tabindex]="showLabels() ? -1 : 0"
            aria-label="EasyDry®">
            <img src="assets/images/easydry-logo-mark.png" alt=""
              style="height: 36px; width: auto; filter: brightness(0) invert(1); display: block;">
          </a>
          <!-- Logo horizontal: visible en fijado-expandido, vista previa y cajón móvil -->
          <a
            [routerLink]="['/dashboard']"
            class="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center transition-opacity duration-200 ease-out"
            [style.opacity]="showLabels() ? '0.92' : '0'"
            [class.pointer-events-none]="!showLabels()"
            [attr.tabindex]="showLabels() ? 0 : -1"
            aria-label="EasyDry®">
            <img src="assets/images/easydry-logo-horizontal.png" alt=""
              style="height: 36px; width: auto; filter: brightness(0) invert(1); display: block;">
          </a>
        </div>

        <!-- Menú de navegación -->
        <nav aria-label="Navegación principal" class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 sidebar-nav-scroll space-y-0.5">
          @for (group of menuGroups; track group.title) {
            @if (group.items.length > 0) {
              <div>
                <!-- Cabecera de grupo: título + chevron de acordeón (solo si hay etiquetas visibles) -->
                <div class="h-5 flex items-center overflow-hidden mt-1">
                  @if (!showLabels()) {
                    <div class="w-[4.25rem] flex items-center justify-center">
                      <div class="w-8 h-px bg-white/15 rounded-full" aria-hidden="true"></div>
                    </div>
                  } @else {
                    <button
                      type="button"
                      class="w-full px-3.5 flex items-center gap-1.5 group/accordion cursor-pointer"
                      (click)="uiState.toggleGrupo(group.title)"
                      [attr.aria-expanded]="!uiState.isGrupoPlegado(group.title)"
                      [attr.aria-label]="'Grupo ' + group.title">
                      <span class="text-[11px] font-extrabold text-easydry-lime/90 uppercase tracking-widest whitespace-nowrap">
                        {{ group.title }}
                      </span>
                      <i-lucide name="chevron-down" aria-hidden="true"
                        class="w-3 h-3 text-easydry-lime/70 transition-transform duration-200 ml-auto mr-1 group-hover/accordion:text-easydry-lime"
                        [class.-rotate-90]="uiState.isGrupoPlegado(group.title)">
                      </i-lucide>
                    </button>
                  }
                </div>

                @if (!showLabels() || !uiState.isGrupoPlegado(group.title)) {
                  <div class="space-y-0.5">
                    @for (item of group.items; track item.label + item.route) {
                      <a
                        [routerLink]="[item.route]"
                        routerLinkActive="active-menu-item"
                        ariaCurrentWhenActive="page"
                        [attr.aria-label]="item.label"
                        [attr.title]="!showLabels() ? item.label : null"
                        #rla="routerLinkActive"
                        [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                        class="flex items-center h-9 rounded-xl ml-2.5 transition-[background-color,color,width,margin,padding] duration-200 ease-out group text-xs relative cursor-pointer"
                        [class.w-12]="!showLabels()"
                        [class.justify-center]="!showLabels()"
                        [class.w-[calc(100%-1.25rem)]]="showLabels()"
                        [class.px-3.5]="showLabels()"
                        [ngClass]="rla.isActive
                          ? 'bg-white/15 text-white shadow-md font-bold ring-1 ring-white/15'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'"
                        (click)="onItemClick()">

                        @if (rla.isActive && showLabels()) {
                          <span class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-easydry-green shadow-xs" aria-hidden="true"></span>
                        }

                        <div class="flex items-center justify-center relative flex-shrink-0 w-5 h-5">
                          <i-lucide [name]="item.icon" class="w-5 h-5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true"
                            [ngClass]="rla.isActive ? 'text-easydry-green stroke-[2.2]' : 'text-slate-300 group-hover:text-white'">
                          </i-lucide>
                          @if (!showLabels() && tieneBadge(item)) {
                            <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-easydry-blue" aria-hidden="true"></span>
                          }
                        </div>

                        <span class="whitespace-nowrap font-medium text-xs pr-1 truncate transition-opacity duration-200 ease-out"
                          [class.opacity-100]="showLabels()" [class.opacity-0]="!showLabels()"
                          [class.flex-1]="showLabels()" [class.ml-3]="showLabels()"
                          [class.w-0]="!showLabels()">
                          {{ item.label }}
                        </span>

                        @if (showLabels() && tieneBadge(item)) {
                          <span class="ml-auto flex-shrink-0 whitespace-nowrap flex items-center justify-center transition-opacity duration-200 ease-out">
                            @if (item.badgeIcon === 'alert-circle-filled' || item.badgeIcon === 'alert-triangle' || item.badge === '!') {
                              <svg class="w-4 h-4 shrink-0 drop-shadow-xs" aria-hidden="true" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="12" fill="#FF2B2B"/>
                                <path d="M10.2 6.4C10.2 5.4 11 4.6 12 4.6C13 4.6 13.8 5.4 13.8 6.4L13.4 14.2C13.4 15 12.8 15.6 12 15.6C11.2 15.6 10.6 15 10.6 14.2L10.2 6.4Z" fill="white"/>
                                <circle cx="12" cy="18.6" r="1.6" fill="white"/>
                              </svg>
                            } @else if (item.badgeIcon) {
                              <span class="w-5 h-5 rounded-full flex items-center justify-center" [ngClass]="item.badgeColor || 'bg-rose-500 text-white'">
                                <i-lucide [name]="item.badgeIcon" class="w-3 h-3 text-white stroke-[2.5]" aria-hidden="true"></i-lucide>
                              </span>
                            } @else {
                              <span class="px-2 py-0.5 text-[11px] font-extrabold rounded-full shadow-xs" [ngClass]="item.badgeColor || 'bg-easydry-green text-slate-950'">
                                {{ item.badge }}
                              </span>
                            }
                          </span>
                        }
                      </a>
                    }
                  </div>
                }
              </div>
            }
          }
        </nav>

        <!-- Banda inferior: doble switch en píldora (fijado/expandido) o un solo botón centrado en
             68px para volver a fijar (mini puro): con el sidebar en mini, "Mini" ya está activo y
             sobra; los dos botones lado a lado no caben en la ventana visible de 68px. -->
        @if (showLabels()) {
          <div class="px-3 pt-2 pb-1 flex-shrink-0 border-t border-white/10 bg-black/20">
            <div class="flex items-center gap-1 bg-black/20 rounded-xl p-1">
              <button
                type="button"
                (click)="uiState.setCollapsed(false)"
                [attr.aria-pressed]="!uiState.collapsed()"
                title="Fijar expandido"
                class="flex items-center justify-center h-8 flex-1 rounded-lg transition-colors duration-200 ease-out cursor-pointer"
                [ngClass]="!uiState.collapsed() ? 'bg-white/15 text-white shadow-xs' : 'text-slate-400 hover:text-white'">
                <i-lucide name="panel-left-open" class="w-4 h-4 flex-shrink-0" aria-hidden="true"></i-lucide>
                <span class="ml-1.5 text-[11px] font-bold whitespace-nowrap">Fijado</span>
              </button>
              <button
                type="button"
                (click)="uiState.setCollapsed(true)"
                [attr.aria-pressed]="uiState.collapsed()"
                title="Modo mini"
                class="flex items-center justify-center h-8 flex-1 rounded-lg transition-colors duration-200 ease-out cursor-pointer"
                [ngClass]="uiState.collapsed() ? 'bg-white/15 text-white shadow-xs' : 'text-slate-400 hover:text-white'">
                <i-lucide name="panel-left-close" class="w-4 h-4 flex-shrink-0" aria-hidden="true"></i-lucide>
                <span class="ml-1.5 text-[11px] font-bold whitespace-nowrap">Mini</span>
              </button>
            </div>
          </div>
        } @else {
          <div class="pt-2 pb-1 border-t border-white/10 bg-black/20 flex-shrink-0 w-[4.25rem] flex items-center justify-center">
            <button
              type="button"
              (click)="uiState.setCollapsed(false)"
              title="Fijar expandido"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-200 ease-out cursor-pointer">
              <i-lucide name="panel-left-open" class="w-4 h-4 flex-shrink-0" aria-hidden="true"></i-lucide>
            </button>
          </div>
        }

        <!-- Perfil y cierre de sesión: sin padding horizontal en modo mini (el nav de arriba tampoco lo
             tiene); si no, el p-2.5 se suma al ml-2.5 de cada fila y corre todo el bloque hacia la
             derecha, desalineándolo de la columna de íconos del menú. -->
        <div class="bg-black/20 flex-shrink-0 pt-1 pb-2.5 space-y-1" [class.px-2.5]="showLabels()">
          <!-- Perfil -->
          <a routerLink="/perfil" routerLinkActive="active-menu-item" ariaCurrentWhenActive="page"
            aria-label="Configuración de Perfil" #rlaPerfil="routerLinkActive"
            [title]="!showLabels() ? 'Configuración de Perfil' : ''"
            class="flex items-center h-9 rounded-xl ml-2.5 transition-[background-color,color,width,margin,padding] duration-200 ease-out text-xs font-medium relative cursor-pointer"
            [class.w-12]="!showLabels()" [class.justify-center]="!showLabels()"
            [class.w-[calc(100%-1.25rem)]]="showLabels()" [class.px-3.5]="showLabels()"
            [ngClass]="rlaPerfil.isActive ? 'bg-white/15 text-white shadow-md font-bold ring-1 ring-white/15' : 'text-slate-300 hover:text-white hover:bg-white/10'"
            (click)="onItemClick()">
            <div class="flex items-center justify-center flex-shrink-0 w-5 h-5">
              <i-lucide name="user" class="w-[18px] h-[18px] text-easydry-lime" aria-hidden="true"></i-lucide>
            </div>
            <span class="whitespace-nowrap transition-opacity duration-200 ease-out"
              [class.opacity-100]="showLabels()" [class.opacity-0]="!showLabels()"
              [class.ml-3]="showLabels()" [class.w-0]="!showLabels()" [class.overflow-hidden]="!showLabels()">
              Configuración de Perfil
            </span>
          </a>

          <!-- Cerrar sesión -->
          <button type="button" (click)="authService.logout()" aria-label="Cerrar Sesión"
            [title]="!showLabels() ? 'Cerrar Sesión' : ''"
            class="flex items-center h-9 rounded-xl ml-2.5 text-rose-300 hover:text-rose-200 hover:bg-rose-400/10 transition-[background-color,color,width,margin,padding] duration-200 ease-out text-xs font-medium cursor-pointer"
            [class.w-12]="!showLabels()" [class.justify-center]="!showLabels()"
            [class.w-[calc(100%-1.25rem)]]="showLabels()" [class.px-3.5]="showLabels()">
            <div class="flex items-center justify-center flex-shrink-0 w-5 h-5">
              <i-lucide name="log-out" class="w-[18px] h-[18px]" aria-hidden="true"></i-lucide>
            </div>
            <span class="whitespace-nowrap transition-opacity duration-200 ease-out text-left"
              [class.opacity-100]="showLabels()" [class.opacity-0]="!showLabels()"
              [class.ml-3]="showLabels()" [class.w-0]="!showLabels()" [class.overflow-hidden]="!showLabels()">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    /* El menú sigue siendo desplazable (rueda, touch, teclado); solo se oculta el riel para que no
       se vea una línea junto al borde del sidebar, sobre todo en el modo mini de 68px. */
    .sidebar-nav-scroll {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .sidebar-nav-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
  `],
})
export class SidebarComponent implements OnInit, OnDestroy {
  readonly uiState = inject(UiStateService);

  /**
   * Si el sistema anfitrión implementa modo oscuro, pásalo en true junto con `isDark`/`onToggleTheme`
   * para mostrar la píldora Sol/Luna. EasyDry hoy no tiene modo oscuro, así que queda apagado por
   * defecto y no deja un hueco vacío en la banda inferior.
   */
  @Input() enableThemeToggle = false;

  public authService = inject(AuthService);
  private permissionService = inject(PermissionService);
  private cdr = inject(ChangeDetectorRef);
  private indicadores = inject(MenuIndicadoresService);
  private router = inject(Router);
  private subs = new Subscription();

  menuGroups: MenuGroup[] = [];
  private hoverCloseTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Vista previa flotante activa: modo mini, pantalla grande y con el cursor/foco encima. */
  readonly isHoverOverlay = computed(() => this.uiState.isLargeScreen() && this.uiState.collapsed() && this.uiState.hoverPreview());

  /** Se muestran etiquetas de texto (no solo íconos) en fijado-expandido, vista previa y cajón móvil. */
  readonly showLabels = computed(() =>
    !this.uiState.isLargeScreen() || !this.uiState.collapsed() || this.uiState.hoverPreview(),
  );

  /** Clases extra de la envoltura exterior según el modo activo (overlay flotante vs. cajón móvil). */
  readonly wrapperExtraClasses = computed(() => ({
    'z-40 shadow-2xl ring-1 ring-white/10': this.isHoverOverlay(),
    'z-[995] shadow-2xl': !this.uiState.isLargeScreen(),
    '-translate-x-full': !this.uiState.isLargeScreen() && !this.uiState.mobileOpen(),
    'translate-x-0': this.uiState.isLargeScreen() || this.uiState.mobileOpen(),
  }));

  /** Único valor que realmente anima: el ancho de la envoltura exterior (sin hijos, barato de redimensionar). */
  readonly wrapperWidthPx = computed(() => {
    if (!this.uiState.isLargeScreen()) return SIDEBAR_WIDTH_EXPANDED; // cajón móvil: siempre a todo su ancho, se oculta con translate-x
    if (this.uiState.collapsed()) return this.uiState.hoverPreview() ? SIDEBAR_WIDTH_HOVER_PREVIEW : SIDEBAR_WIDTH_MINI;
    return SIDEBAR_WIDTH_EXPANDED;
  });

  ngOnInit(): void {
    this.uiState.resetTransientState();
    this.refreshMenu();
    this.cdr.markForCheck();

    this.subs.add(
      this.authService.currentUser$.subscribe(() => {
        this.refreshMenu();
        this.cdr.markForCheck();
      }),
    );

    this.indicadores.iniciar();

    this.subs.add(
      this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
        this.indicadores.refrescar();
        this.uiState.resetTransientState();
        this.autoExpandGrupoActivo();
      }),
    );

    this.autoExpandGrupoActivo();
  }

  ngOnDestroy(): void {
    if (this.hoverCloseTimeout) clearTimeout(this.hoverCloseTimeout);
    this.subs.unsubscribe();
  }

  /** Al pasar el cursor o enfocar por teclado sobre el sidebar en modo mini, despliega la vista previa. */
  onMouseEnter(): void {
    if (!this.uiState.isLargeScreen() || !this.uiState.collapsed()) return;
    if (this.hoverCloseTimeout) {
      clearTimeout(this.hoverCloseTimeout);
      this.hoverCloseTimeout = null;
    }
    if (!this.uiState.hoverPreview()) {
      this.uiState.setHoverPreview(true);
      this.cdr.markForCheck();
    }
  }

  /** Colapsa la vista previa solo si el foco realmente sale del sidebar (no entre sus propios hijos). */
  onFocusOut(event: FocusEvent): void {
    const container = event.currentTarget as HTMLElement | null;
    const next = event.relatedTarget as Node | null;
    if (container && next && container.contains(next)) return;
    this.onMouseLeave();
  }

  onMouseLeave(): void {
    if (this.hoverCloseTimeout) clearTimeout(this.hoverCloseTimeout);
    this.hoverCloseTimeout = setTimeout(() => {
      this.uiState.setHoverPreview(false);
      this.cdr.markForCheck();
    }, SIDEBAR_HOVER_CLOSE_DELAY_MS);
  }

  onItemClick(): void {
    this.uiState.closeMobile();
    this.uiState.setHoverPreview(false);
  }

  /** Punto del menú: los ítems con indicador solo lo muestran mientras haya algo por atender; el resto, si traen insignia fija. */
  tieneBadge(item: MenuItem): boolean {
    if (item.indicador) return this.indicadores.conteos()[item.indicador] > 0;
    return !!(item.badgeIcon || item.badge);
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

  /** Si la ruta activa pertenece a un grupo plegado, lo despliega (sin tocar los demás grupos). */
  private autoExpandGrupoActivo(): void {
    const url = this.router.url.split('?')[0];
    for (const group of this.menuGroups) {
      const activo = group.items.some((item) => url === item.route || url.startsWith(item.route + '/'));
      if (activo && this.uiState.isGrupoPlegado(group.title)) {
        this.uiState.toggleGrupo(group.title);
      }
    }
  }
}

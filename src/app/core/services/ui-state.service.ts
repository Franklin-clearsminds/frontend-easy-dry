import { Injectable, signal, computed, type WritableSignal } from '@angular/core';
import {
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_MINI,
  SIDEBAR_BREAKPOINT_PX,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  SIDEBAR_GROUPS_STORAGE_KEY,
} from '../config/sidebar.constants';

// Compatibilidad con código existente que aún importa estos nombres (anchos en px como string).
export const SIDEBAR_INNER_W = `${SIDEBAR_WIDTH_EXPANDED}px`;
export const SIDEBAR_RAIL_W = `${SIDEBAR_WIDTH_MINI}px`;

function leerColapsadoGuardado(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function leerGruposPlegadosGuardados(): Set<string> {
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Estado de UI compartido entre el sidebar y el layout que lo contiene: si está fijado expandido o
 * en modo mini (persistido), si la pantalla es grande (>= 1024px, el sidebar empuja el contenido) o
 * pequeña (el sidebar es un cajón que flota encima), si el cajón móvil está abierto, si la vista previa
 * flotante del modo mini está desplegada, y qué grupos del menú están plegados.
 */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  /** true = modo mini (68px); false = fijado expandido (260px). Se recuerda entre sesiones. */
  readonly collapsed: WritableSignal<boolean> = signal(leerColapsadoGuardado());

  /** true si el ancho de pantalla permite que el sidebar empuje el contenido (>= 1024px). */
  readonly isLargeScreen: WritableSignal<boolean> = signal(
    typeof window !== 'undefined' ? window.innerWidth >= SIDEBAR_BREAKPOINT_PX : true,
  );

  /** Cajón móvil (pantallas < 1024px) abierto o cerrado. */
  readonly mobileOpen: WritableSignal<boolean> = signal(false);

  /** Vista previa flotante del sidebar en modo mini (al pasar el cursor o enfocar por teclado). */
  readonly hoverPreview: WritableSignal<boolean> = signal(false);

  /** Códigos de grupo de menú plegados manualmente por el usuario. */
  readonly gruposPlegados: WritableSignal<Set<string>> = signal(leerGruposPlegadosGuardados());

  /** Ancho real que el sidebar reserva en el layout (el `<main>` sincroniza su margen con esto). */
  readonly sidebarReservedWidth = computed(() => {
    if (!this.isLargeScreen()) return 0;
    return this.collapsed() ? SIDEBAR_WIDTH_MINI : SIDEBAR_WIDTH_EXPANDED;
  });

  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    this.mediaQuery = window.matchMedia(`(min-width: ${SIDEBAR_BREAKPOINT_PX}px)`);
    this.isLargeScreen.set(this.mediaQuery.matches);
    this.mediaQuery.addEventListener('change', (e) => {
      this.isLargeScreen.set(e.matches);
      if (e.matches) this.mobileOpen.set(false);
    });
  }

  toggleCollapsed(): void {
    this.setCollapsed(!this.collapsed());
  }

  setCollapsed(value: boolean): void {
    this.collapsed.set(value);
    this.hoverPreview.set(false);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? '1' : '0');
    } catch {
      // localStorage puede no estar disponible (navegación privada); el estado en memoria sigue funcionando.
    }
  }

  openMobile(): void {
    this.mobileOpen.set(true);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  setHoverPreview(value: boolean): void {
    this.hoverPreview.set(value);
  }

  isGrupoPlegado(codigo: string): boolean {
    return this.gruposPlegados().has(codigo);
  }

  toggleGrupo(codigo: string): void {
    const actual = new Set(this.gruposPlegados());
    if (actual.has(codigo)) actual.delete(codigo);
    else actual.add(codigo);
    this.gruposPlegados.set(actual);
    try {
      localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify([...actual]));
    } catch {
      // idem: sin localStorage el acordeón sigue funcionando, solo no se recuerda entre sesiones.
    }
  }

  /** Se llama al entrar a la app o cambiar de sesión: cierra el cajón móvil y la vista previa flotante. */
  resetTransientState(): void {
    this.mobileOpen.set(false);
    this.hoverPreview.set(false);
  }

  /** @deprecated usa resetTransientState(); se conserva por compatibilidad con llamadas existentes. */
  setSidebarExpanded(_value: boolean): void {
    this.resetTransientState();
  }
}

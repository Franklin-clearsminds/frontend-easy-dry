import { Injectable, signal, computed, type WritableSignal } from '@angular/core';

/** Ancho interno expandido del sidebar (w-72 = 288px) */
export const SIDEBAR_INNER_W = '288px';
/** Ancho del rail retraído del sidebar (80px) */
export const SIDEBAR_RAIL_W = '80px';

/**
 * Estado de UI compartido entre componentes del layout (sidebar + contenido).
 * Permite que el rail retraído reserve su espacio y que el panel expandido
 * flote sobre el contenido con overlay.
 */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  /** Estado writable compartido: el sidebar se lee/escribe tanto en el componente como en el layout. */
  readonly sidebarExpanded: WritableSignal<boolean> = signal(false);

  /** Anchura a reservar para el sidebar en el contenido (rail cuando retraído, 0 al expandir para flotar). */
  readonly sidebarReservedWidth = computed(() =>
    this.sidebarExpanded() ? '0px' : SIDEBAR_RAIL_W
  );

  setSidebarExpanded(value: boolean): void {
    this.sidebarExpanded.set(value);
  }
}

/**
 * Tokens de dimensión y tiempos del sidebar de navegación.
 * Fuente única: si se cambia un ancho o un tiempo, se cambia aquí.
 */

/** Ancho del sidebar fijado y expandido (empuja el contenido). */
export const SIDEBAR_WIDTH_EXPANDED = 260;
/** Ancho del sidebar en modo mini (empuja el contenido, solo íconos). */
export const SIDEBAR_WIDTH_MINI = 60;
/** Ancho de la vista previa flotante al pasar el cursor sobre el sidebar en modo mini. */
export const SIDEBAR_WIDTH_HOVER_PREVIEW = 260;

/** Debajo de este ancho de pantalla el sidebar deja de empujar contenido y pasa a ser un cajón (drawer). */
export const SIDEBAR_BREAKPOINT_PX = 1024;

/** Espera antes de cerrar la vista previa flotante al retirar el cursor (evita parpadeos). */
export const SIDEBAR_HOVER_CLOSE_DELAY_MS = 150;

/** Clave de localStorage donde se recuerda si el sidebar está en modo mini. */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'easydry_sidebar_collapsed_v1';
/** Clave de localStorage donde se recuerdan los grupos de menú plegados manualmente. */
export const SIDEBAR_GROUPS_STORAGE_KEY = 'easydry_sidebar_groups_v1';

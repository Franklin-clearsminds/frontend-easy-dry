/**
 * Valores de paginación acordados para toda la web.
 * Las tablas usan páginas numeradas (10, 25 o 50 filas); todo lo demás (tarjetas, líneas de tiempo, listas en modales y
 * desplegables) usa scroll infinito.
 */

/** Opciones del selector "filas por página" en las tablas. */
export const PAGE_SIZES_TABLA = [10, 25, 50];

/** Filas por página por defecto en las tablas. */
export const PAGE_SIZE_TABLA = 25;

/** Filas que se cargan cada vez que el scroll infinito llega al final. */
export const PAGE_SIZE_INFINITO = 30;

/** Máximo que el servidor acepta por petición (pedir más se recorta). */
export const PAGE_SIZE_MAX = 100;

/** La búsqueda de texto espera este tiempo tras la última tecla antes de consultar al servidor. */
export const BUSQUEDA_DEBOUNCE_MS = 300;

/** Mínimo de letras para consultar al servidor (menos de eso se ignora, salvo vacío = sin filtro). */
export const BUSQUEDA_MIN_CARACTERES = 2;

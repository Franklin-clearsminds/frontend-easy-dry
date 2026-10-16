import { PAGE_SIZE_TABLA } from '../config/paginacion';

/**
 * Respuesta paginada estándar del servidor. Los endpoints antiguos devolvían otras formas
 * ({data}, arreglos planos…): `normalizarPagina` las convierte a esta.
 */
export interface PaginaServidor<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type OrdenDir = 'asc' | 'desc';

/** Lo que una tabla le pide al servidor: página, tamaño, orden y texto de búsqueda. */
export interface ConsultaTabla {
  page: number;
  pageSize: number;
  sortField: string | null;
  sortOrder: OrdenDir;
  search: string;
}

/** Opción de un selector con buscador. */
export interface OpcionSelect {
  value: string;
  label: string;
  sublabel?: string;
  /** Solo en las opciones de regiones y clientes: 1 = activo, 0 = inactivo. */
  estado?: number;
}

/**
 * Convierte cualquier respuesta de listado al formato estándar. Acepta `{items}`, `{data}` o un arreglo plano
 * (en ese caso `total` es el largo del arreglo y no hay más páginas).
 */
export function normalizarPagina<T>(
  respuesta: unknown,
  page = 1,
  pageSize = PAGE_SIZE_TABLA,
): PaginaServidor<T> {
  const r = (respuesta ?? {}) as Record<string, unknown>;
  const items: T[] = Array.isArray(respuesta)
    ? (respuesta as T[])
    : ((r['items'] as T[] | undefined) ?? (r['data'] as T[] | undefined) ?? []);

  const total = Number(r['total'] ?? items.length) || 0;
  const size = Number(r['pageSize'] ?? pageSize) || pageSize;
  const pg = Number(r['page'] ?? page) || page;
  const totalPages = Number(r['totalPages']) || Math.max(1, Math.ceil(total / size));

  return {
    items,
    total,
    page: pg,
    pageSize: size,
    totalPages,
    hasNextPage: typeof r['hasNextPage'] === 'boolean' ? (r['hasNextPage'] as boolean) : pg < totalPages,
    hasPrevPage: typeof r['hasPrevPage'] === 'boolean' ? (r['hasPrevPage'] as boolean) : pg > 1,
  };
}

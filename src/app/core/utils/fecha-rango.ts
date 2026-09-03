import { FilterState } from '../../shared/components/filter-bar/filter-bar.component';

export interface RangoFechas {
  inicio: string;
  fin: string;
}

/**
 * Resuelve un rango de fechas [inicio, fin] (formato YYYY-MM-DD) a partir de la
 * selección del FilterBar. Devuelve null cuando NO debe filtrarse por fecha
 * (ninguna fecha elegida o el rango está incompleto).
 *
 * Norma: las fechas de los datos viven en strings 'YYYY-MM-DD' o
 * 'YYYY-MM-DD HH:mm'; se compara únicamente la parte de fecha, y por ser un
 * formato lexicográfico las comparaciones de string son correctas.
 */
export function resolverRangoFechas(filtros: FilterState): RangoFechas | null {
  const inicio = (filtros.fechaInicio || '').trim();
  const fin = (filtros.fechaFin || '').trim();
  if (!inicio || !fin) return null;
  return { inicio, fin };
}

/** Extrae solo la parte de fecha (YYYY-MM-DD) de un valor que puede incluir hora. */
export function soloFecha(valor: string | undefined | null): string {
  return (valor || '').slice(0, 10);
}

/** Aplica el filtro de rango de fechas sobre una lista por un campo de fecha dado. */
export function filtrarPorRango<T>(
  items: T[],
  campoFecha: (item: T) => string | undefined,
  rango: RangoFechas | null
): T[] {
  if (!rango) return items;
  return items.filter(item => {
    const d = soloFecha(campoFecha(item));
    if (!d) return false;
    return d >= rango.inicio && d <= rango.fin;
  });
}

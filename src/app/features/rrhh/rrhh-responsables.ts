/**
 * Responsable de la tarea de cada novedad de un informe (prototipo de RRHH). El backend no sabe nada de esto: se guarda en el navegador
 * (`localStorage`), por informe y por novedad, para que sobreviva a recargar la página o a retomar el borrador. El formulario nunca
 * lo envía al servidor.
 */

const CLAVE = 'rrhh_responsables_novedad_v1';

type Almacen = Record<string, Record<string, string>>;

function leer(): Almacen {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Almacen) : {};
  } catch {
    return {};
  }
}

function escribir(a: Almacen): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(a));
  } catch {
    // Sin almacenamiento disponible (modo privado, cuota): el responsable vive solo mientras la página siga abierta.
  }
}

/** Operador elegido por cada novedad (por id de novedad) de un informe. */
export function leerResponsables(informeId: string): Record<string, string> {
  return { ...(leer()[informeId] ?? {}) };
}

/** Deja exactamente este mapa para el informe (las novedades sin responsable no aparecen). */
export function guardarResponsables(informeId: string, mapa: Record<string, string>): void {
  const todo = leer();
  const limpio = Object.fromEntries(Object.entries(mapa).filter(([, v]) => !!v));
  if (Object.keys(limpio).length) todo[informeId] = limpio;
  else delete todo[informeId];
  escribir(todo);
}

export function guardarResponsable(informeId: string, novedadId: string, operadorId: string): void {
  const mapa = leerResponsables(informeId);
  if (operadorId) mapa[novedadId] = operadorId;
  else delete mapa[novedadId];
  guardarResponsables(informeId, mapa);
}

/**
 * Guarda el último resultado de un cálculo (por ejemplo, filtrar una lista) y solo lo recalcula cuando cambia
 * alguna de sus dependencias.
 *
 * Sirve para los `get` que las plantillas leen en cada revisión de pantalla: sin esto, filtrar cientos de
 * registros se repetía varias veces por cada clic, tecla o movimiento del ratón.
 */
export class MemoLista {
  private deps: unknown[] = [];
  private valor: unknown;
  private listo = false;

  obtener<T>(deps: unknown[], calcular: () => T): T {
    if (
      this.listo &&
      deps.length === this.deps.length &&
      deps.every((d, i) => Object.is(d, this.deps[i]))
    ) {
      return this.valor as T;
    }
    this.deps = deps;
    this.valor = calcular();
    this.listo = true;
    return this.valor as T;
  }
}

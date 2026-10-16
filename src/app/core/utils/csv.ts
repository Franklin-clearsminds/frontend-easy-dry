/**
 * Celda de un CSV segura. Excel y Calc interpretan como FÓRMULA el texto que empieza por `=`, `+`, `-`, `@` (o tabulador/retorno): un
 * nombre, una observación o una placa escritos así podrían ejecutar una fórmula al abrir el archivo (inyección de fórmulas). Se
 * antepone un apóstrofo, que las hojas de cálculo muestran como texto, y se escapan las comillas.
 */
export function celdaCsv(valor: unknown): string {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

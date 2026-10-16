import { TipoColumna, TotalReporte, ValorCelda } from '../../core/models/reportes.model';

/**
 * Formato de valores de reportes (fechas, números, dinero): lo usan tanto la vista previa en pantalla como la
 * exportación a Excel/PDF. Vive separado de `reportes-export.ts` para que importarlo no arrastre jsPDF/jspdf-autotable
 * (pesados) al bundle inicial de la pantalla — esos solo se cargan de verdad al exportar (`import('./reportes-export')`).
 */

export const NUMERO = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 3 });
export const DINERO = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });

export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

export function fechaHoraCorta(iso: string): string {
  const f = new Date(iso);
  return `${fechaCorta(`${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`)} ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
}

/** Texto de una celda tal como se ve en pantalla y en el PDF. */
export function formatearCelda(valor: ValorCelda | undefined, tipo: TipoColumna): string {
  if (valor === null || valor === undefined || valor === '') return '';
  switch (tipo) {
    case 'fecha': return fechaCorta(String(valor));
    case 'numero': return typeof valor === 'number' ? NUMERO.format(valor) : String(valor);
    case 'dinero': return typeof valor === 'number' ? DINERO.format(valor) : String(valor);
    default: return String(valor);
  }
}

export function formatearTotal(t: TotalReporte): string {
  return t.tipo === 'dinero' ? DINERO.format(t.valor) : NUMERO.format(t.valor);
}

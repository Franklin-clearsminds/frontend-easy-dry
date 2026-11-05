import { FilaReporte, ReporteGenerado } from '../../core/models/reportes.model';

/**
 * Datos del reporte «Servicios de lavado» listos para armar el Excel y el PDF: una hoja por cliente (y por periodo si se
 * dividió), con todas las OT en una sola tabla —la agencia va en la primera columna, «Taller»— y las cuatro tablas resumen.
 */

export const SIN_CLIENTE = 'Sin cliente';
export const SIN_MODELO = '(Sin modelo)';
export const SIN_SERVICIO = '(Sin tipo de servicio)';

export interface FilaServicio {
  taller: string;
  fila: FilaReporte;
}

export interface HojaServicios {
  cliente: string;
  /** Clave y etiqueta del periodo cuando el reporte se dividió; vacías si no. */
  clave: string;
  etiqueta: string;
  /** Todas las OT del cliente en el periodo, ordenadas por fecha y hora. */
  filas: FilaServicio[];
  /** Agencias del cliente que tienen servicios, ordenadas por nombre: son las columnas de las tablas resumen. */
  agencias: string[];
}

export type TipoResumen = 'numero' | 'dinero';

export interface TablaResumen {
  id: 'fecha-cantidad' | 'modelo-cantidad' | 'fecha-monto' | 'servicio-monto';
  titulo: string;
  /** Encabezado de la primera columna (Fecha, Modelo, Tipo de servicio). */
  etiquetaFilas: string;
  /** Campo de la fila que define las filas de la tabla. */
  campo: 'fecha' | 'modelo' | 'servicio';
  tipo: TipoResumen;
  filas: string[];
  columnas: string[];
  /** datos[fila][columna] */
  datos: number[][];
}

const porTexto = (a: string, b: string) => a.localeCompare(b, 'es');

/** Hojas del reporte: una por cliente y, si el reporte se dividió por periodo, una por cliente y periodo. */
export function hojasDeServicios(r: ReporteGenerado): HojaServicios[] {
  const clientes = new Map<string, Map<string, { etiqueta: string; filas: FilaServicio[] }>>();
  for (const g of r.grupos) {
    const cliente = g.cliente?.trim() || SIN_CLIENTE;
    if (!clientes.has(cliente)) clientes.set(cliente, new Map());
    const periodos = clientes.get(cliente)!;
    for (const b of g.bloques) {
      if (!periodos.has(b.clave)) periodos.set(b.clave, { etiqueta: b.etiqueta, filas: [] });
      for (const fila of b.filas) periodos.get(b.clave)!.filas.push({ taller: g.titulo, fila });
    }
  }
  const salida: HojaServicios[] = [];
  for (const cliente of [...clientes.keys()].sort(porTexto)) {
    for (const clave of [...clientes.get(cliente)!.keys()].sort()) {
      const { etiqueta, filas } = clientes.get(cliente)!.get(clave)!;
      filas.sort((a, b) => String(a.fila['fecha'] ?? '').localeCompare(String(b.fila['fecha'] ?? '')) || String(a.fila['horaIngreso'] ?? '').localeCompare(String(b.fila['horaIngreso'] ?? '')));
      salida.push({ cliente, clave, etiqueta, filas, agencias: [...new Set(filas.map((f) => f.taller))].sort(porTexto) });
    }
  }
  return salida;
}

/** ¿El reporte trae el precio? (solo con permiso de precios) */
export const conPrecios = (r: ReporteGenerado): boolean => r.columnas.some((c) => c.clave === 'precio');

const valorDe = (f: FilaServicio, campo: TablaResumen['campo']): string => {
  const v = String(f.fila[campo] ?? '').trim();
  if (v) return v;
  return campo === 'modelo' ? SIN_MODELO : campo === 'servicio' ? SIN_SERVICIO : '';
};

function armarTabla(hoja: HojaServicios, id: TablaResumen['id'], titulo: string, etiquetaFilas: string, campo: TablaResumen['campo'], tipo: TipoResumen): TablaResumen {
  const filas = [...new Set(hoja.filas.map((f) => valorDe(f, campo)))].sort(campo === 'fecha' ? undefined : porTexto);
  const fila = new Map(filas.map((f, i) => [f, i]));
  const columna = new Map(hoja.agencias.map((a, i) => [a, i]));
  const datos = filas.map(() => hoja.agencias.map(() => 0));
  for (const f of hoja.filas) {
    const i = fila.get(valorDe(f, campo))!;
    const j = columna.get(f.taller)!;
    datos[i][j] += tipo === 'numero' ? 1 : Number(f.fila['precio']) || 0;
  }
  if (tipo === 'dinero') for (const d of datos) for (let j = 0; j < d.length; j++) d[j] = Math.round(d[j] * 100) / 100;
  return { id, titulo, etiquetaFilas, campo, tipo, filas, columnas: hoja.agencias, datos };
}

/** Las cuatro tablas resumen; las de dinero solo existen con permiso de precios. */
export function tablasResumen(hoja: HojaServicios, verPrecios: boolean): TablaResumen[] {
  const tablas = [
    armarTabla(hoja, 'fecha-cantidad', 'SERVICIOS POR FECHA', 'Fecha', 'fecha', 'numero'),
    armarTabla(hoja, 'modelo-cantidad', 'SERVICIOS POR MODELO', 'Modelo', 'modelo', 'numero'),
  ];
  if (verPrecios) {
    tablas.push(armarTabla(hoja, 'fecha-monto', 'MONTO POR FECHA', 'Fecha', 'fecha', 'dinero'));
    tablas.push(armarTabla(hoja, 'servicio-monto', 'MONTO POR TIPO DE SERVICIO', 'Tipo de servicio', 'servicio', 'dinero'));
  }
  return tablas;
}

export const totalFila = (t: TablaResumen, i: number): number => Math.round(t.datos[i].reduce((a, b) => a + b, 0) * 100) / 100;
export const totalColumna = (t: TablaResumen, j: number): number => Math.round(t.datos.reduce((a, d) => a + d[j], 0) * 100) / 100;
export const totalGeneral = (t: TablaResumen): number => Math.round(t.datos.reduce((a, d) => a + d.reduce((x, y) => x + y, 0), 0) * 100) / 100;

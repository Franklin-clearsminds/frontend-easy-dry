/** Paleta de marca EasyDry. Única fuente de color para gráficas y datos dinámicos. */
export const BRAND_COLORS = {
  blue: '#004282',
  blueDark: '#003A7C',
  blueDeep: '#002952',
  green: '#9BCB3B',
  amber: '#F59E0B',
  rose: '#E11D48',
  violet: '#7C3AED',
  slate: '#64748B',
  slateLight: '#F1F5F9',
} as const;

/** Colores para series de gráficas (distinguibles entre sí). */
export const CHART_COLORS = {
  ...BRAND_COLORS,
  /** Tono claro de la marca para series secundarias azules. */
  blueLight: '#3D7CC0',
  teal: '#0D9488',
} as const;

/** Secuencia por defecto para series categóricas. */
export const CHART_SERIES: readonly string[] = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.violet,
  CHART_COLORS.slate,
];

/**
 * Paleta categórica ampliada: primero los 6 colores de marca (mantiene el aspecto actual de las gráficas)
 * y después 6 tonos más para series largas. Sin esto, al pasar de 6 categorías Chart.js rellenaba con su
 * paleta por defecto y se veían gris/negro, difíciles de distinguir.
 */
export const CHART_CATEGORICAL: readonly string[] = [
  ...CHART_SERIES,
  '#EA580C', // naranja
  '#0EA5E9', // celeste
  '#DB2777', // magenta
  '#4D7C0F', // verde oliva
  '#4F46E5', // índigo
  '#115E59', // verde azulado oscuro
];

/** Devuelve `n` colores categóricos distintos; solo repite cuando hay más series que colores disponibles. */
export function coloresCategoricos(n: number): string[] {
  const total = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return Array.from({ length: total }, (_, i) => CHART_CATEGORICAL[i % CHART_CATEGORICAL.length]);
}

/**
 * Interpola dos colores hex en RGB. `t` va de 0 (color inicial) a 1 (color final).
 * Sirve para escalas de severidad: p. ej. ámbar → rojo según qué tan lento es un servicio.
 */
export function interpolarHex(desde: string, hasta: string, t: number): string {
  const k = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  const inicial = hexARgb(desde);
  const final = hexARgb(hasta);
  const mezcla = inicial.map((v, i) => Math.round(v + (final[i] - v) * k));
  return `rgb(${mezcla.join(', ')})`;
}

function hexARgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const completo = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(completo.slice(0, 2), 16),
    parseInt(completo.slice(2, 4), 16),
    parseInt(completo.slice(4, 6), 16),
  ];
}

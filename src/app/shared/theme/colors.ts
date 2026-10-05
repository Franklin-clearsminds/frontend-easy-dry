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

export interface DashboardChartData {
  labels: string[];
  datasets: {
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    borderDash?: number[];
    tension?: number;
    fill?: boolean;
    pointBackgroundColor?: string;
    pointBorderColor?: string;
    pointRadius?: number;
    pointHoverRadius?: number;
    hoverOffset?: number;
  }[];
}

export interface DashboardTecnicoData {
  incidentesAbiertos: number;
  mantenimientosPendientes: number;
  equiposOperativos: number;
  equiposEnReparacion: number;
  // Nuevos campos del endpoint dedicado
  maquinariaFueraServicio?: number;
  costoTotalReparaciones?: number;
  tiempoPromedioResolucionHoras?: number;
  mantenimientosEjecutados30d?: number;
  // Gráficos - todos opcionales para compatibilidad
  chartIncidentesPorEstado?: DashboardChartData | null;
  chartEstadoParque?: DashboardChartData | null;
  chartGravedadIncidentes?: DashboardChartData | null;
  chartEstadoIncidentes?: DashboardChartData | null;
  chartTopMaquinas?: DashboardChartData | null;
  chartCostoMaquinas?: DashboardChartData | null;
  chartTipoMantenimiento?: DashboardChartData | null;
  chartTipoMaquinaria?: DashboardChartData | null;
  proxMantenimientos?: any[];
  // Costos y fiabilidad del parque
  costoMantenimientos30d?: number;
  mantenimientosVencidos?: number;
  chartCostoTipoMantenimiento?: DashboardChartData | null;
  chartCostoPorAgencia?: DashboardChartData | null;
  /** Tiempo medio de resolución por gravedad (BAJA · MEDIA · ALTA · CRÍTICA). */
  chartMttrGravedad?: DashboardChartData | null;
  /** Tiempo medio de resolución por agencia, de la más lenta a la más rápida. */
  chartMttrAgencia?: DashboardChartData | null;
  mttrGravedad?: MttrItem[];
  mttrAgencia?: MttrItem[];
}

/** Tiempo medio de resolución: horas promedio e incidentes resueltos que lo respaldan. */
export interface MttrItem {
  nombre: string;
  horas: number;
  incidentes: number;
}

export interface DashboardDistribuidorData {
  skusCriticos?: number;
  chartConsumoInsumos?: DashboardChartData | null;
}

export interface ResumenEjecutivoKPI {
  label: string;
  value: string;
  icon: string;
  variant: string;
}

export interface ResumenEjecutivoData {
  kpis: ResumenEjecutivoKPI[];
}

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
  tiempoMedioReparacionHrs: number;
  chartIncidentesPorEstado: DashboardChartData;
  chartMantenimientosSemana: DashboardChartData;
  chartFallosPorTipo: DashboardChartData;
}

export interface DashboardOperadorData {
  otsHoy: number;
  enProceso: number;
  finalizados: number;
  aprobados: number;
  tiempoPromedioMin: number;
  metaDiaria: number;
  chartOtsPorHora: DashboardChartData;
  chartServiciosTipo: DashboardChartData;
}

export interface DashboardOperadorEspecialesData {
  asignacionesPendientes: number;
  enProceso: number;
  completadasSemana: number;
  calificacionPromedio: number;
  sucursalesActivas: number;
  chartColaPorPrioridad: DashboardChartData;
  chartCompletadosSemana: DashboardChartData;
}

export interface DashboardDistribuidorData {
  skusCriticos: number;
  pedidosPendientes: number;
  entregasSemana: number;
  chartConsumoInsumos: DashboardChartData;
  chartStockEstado: DashboardChartData;
}

export interface DashboardComercialData {
  serviciosMes: number;
  tasaAprobacion: number;
  especialesVendidos: number;
  chartMixServicios: DashboardChartData;
}

export interface ResumenEjecutivoKPI {
  label: string;
  value: string;
  icon: string;
  trend: string;
  trendPositive: boolean;
  variant: string;
}

export interface ResumenEjecutivoSugerencia {
  texto: string;
  icono: string;
  prioridad: string;
}

export interface ResumenEjecutivoData {
  kpis: ResumenEjecutivoKPI[];
  tendencia: DashboardChartData;
  sugerencias: ResumenEjecutivoSugerencia[];
}

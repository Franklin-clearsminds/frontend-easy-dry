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
  chartIncidentesPorEstado: DashboardChartData;
}

export interface DashboardDistribuidorData {
  skusCriticos: number;
  chartConsumoInsumos: DashboardChartData;
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

/** KPIs y gráficos por rol — complementa el dashboard ejecutivo */

export const MOCK_DASHBOARD_TECNICO = {
  incidentesAbiertos: 3,
  mantenimientosPendientes: 5,
  equiposOperativos: 18,
  equiposEnReparacion: 2,
  tiempoMedioReparacionHrs: 4.2,
  chartIncidentesPorEstado: {
    labels: ['Pendiente', 'En Solución', 'Solucionado'],
    datasets: [{
      data: [2, 3, 12],
      backgroundColor: ['#FECDD3', '#FDE68A', '#EDF7DB'],
      borderWidth: 0
    }]
  },
  chartMantenimientosSemana: {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    datasets: [{
      label: 'Órdenes',
      data: [2, 1, 3, 2, 4, 1],
      backgroundColor: '#004282',
      borderRadius: 6
    }]
  },
  chartFallosPorTipo: {
    labels: ['Eléctrica', 'Hidráulica', 'Fuga', 'Desgaste'],
    datasets: [{
      data: [4, 3, 5, 2],
      backgroundColor: ['#004282', '#9BCB3B', '#E11D48', '#F59E0B'],
      borderWidth: 0
    }]
  }
};

export const MOCK_DASHBOARD_OPERADOR = {
  otsHoy: 14,
  enProceso: 2,
  finalizados: 9,
  aprobados: 3,
  tiempoPromedioMin: 22,
  metaDiaria: 18,
  chartOtsPorHora: {
    labels: ['8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h'],
    datasets: [{
      label: 'OTs',
      data: [1, 2, 3, 2, 1, 2, 2, 1],
      borderColor: '#004282',
      backgroundColor: 'rgba(0, 66, 130, 0.12)',
      tension: 0.35,
      fill: true
    }]
  },
  chartServiciosTipo: {
    labels: ['Generales', 'Especiales'],
    datasets: [{
      data: [11, 3],
      backgroundColor: ['#004282', '#9BCB3B'],
      borderWidth: 0
    }]
  }
};

export const MOCK_DASHBOARD_OPERADOR_ESPECIALES = {
  asignacionesPendientes: 4,
  enProceso: 2,
  completadasSemana: 11,
  calificacionPromedio: 4.7,
  sucursalesActivas: 3,
  chartColaPorPrioridad: {
    labels: ['Alta', 'Media', 'Baja'],
    datasets: [{
      data: [2, 3, 1],
      backgroundColor: ['#E11D48', '#F59E0B', '#94A3B8'],
      borderRadius: 6
    }]
  },
  chartCompletadosSemana: {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
    datasets: [{
      label: 'Completados',
      data: [2, 3, 1, 2, 3],
      backgroundColor: '#9BCB3B',
      borderRadius: 6
    }]
  }
};

export const MOCK_DASHBOARD_DISTRIBUIDOR = {
  skusCriticos: 3,
  pedidosPendientes: 7,
  entregasSemana: 24,
  chartConsumoInsumos: {
    labels: ['Shampoo', 'Cera', 'Químicos', 'Repuestos'],
    datasets: [{
      label: 'Unidades',
      data: [120, 45, 80, 30],
      backgroundColor: '#004282',
      borderRadius: 6
    }]
  },
  chartStockEstado: {
    labels: ['Óptimo', 'Bajo', 'Crítico'],
    datasets: [{
      data: [65, 22, 13],
      backgroundColor: ['#EDF7DB', '#FDE68A', '#FECDD3'],
      borderWidth: 0
    }]
  }
};

export const MOCK_DASHBOARD_COMERCIAL = {
  serviciosMes: 842,
  tasaAprobacion: 94,
  especialesVendidos: 156,
  chartMixServicios: {
    labels: ['Generales', 'Especiales Premium'],
    datasets: [{
      data: [520, 186, 136],
      backgroundColor: ['#004282', '#36699B', '#9BCB3B'],
      borderWidth: 0
    }]
  }
};

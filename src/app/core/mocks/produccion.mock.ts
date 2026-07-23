export const MOCK_PRODUCCION = {
  vehiculosHoy: 850,
  variacionVehiculos: '12%',
  tendenciaVehiculos: 'up',

  historicoComparativo: {
    semanaAnterior: 3500,
    semanaActual: 4200,
    crecimientoPct: 20
  },

  produccionPorHora: {
    labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
    datasets: [
      {
        label: 'Vehículos',
        data: [20, 50, 80, 120, 110, 95, 105, 140, 90, 40],
        borderColor: '#07558C',
        backgroundColor: 'rgba(7, 85, 140, 0.15)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#9BCB3B',
        pointBorderColor: '#07558C',
      }
    ]
  },

  productividadBahias: {
    labels: ['Bahía 1', 'Bahía 2', 'Bahía 3', 'Bahía 4', 'Bahía 5'],
    datasets: [
      {
        label: 'Vehículos Procesados',
        data: [50, 42, 60, 35, 48],
        backgroundColor: '#9BCB3B',
        borderRadius: 4
      }
    ]
  }
};

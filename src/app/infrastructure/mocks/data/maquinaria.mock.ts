export const MOCK_MAQUINARIA = {
  total: 120,
  operativas: 112,
  mantenimiento: 5,
  danadas: 3,

  fallasPorTipo: {
    labels: ['Hidrolavadoras', 'Aspiradoras', 'Vaporizadoras', 'Pulidoras'],
    datasets: [{
      data: [5, 2, 1, 0],
      backgroundColor: ['#07558C', '#9BCB3B', '#F59E0B', '#EF4444']
    }]
  }
};

export const MOCK_SERVICIOS_DATA = {
  total: 850,
  generales: 700,
  especiales: 150,
  pendientesAprobacion: 25,

  distribucionGenerales: {
    labels: ['Express', 'Completo', 'Deluxe'],
    datasets: [{
      data: [350, 250, 100],
      backgroundColor: ['#004282', '#9BCB3B', '#F59E0B']
    }]
  },

  distribucionEspeciales: {
    labels: ['Pulido', 'Cerámico', 'Lavado Motor'],
    datasets: [{
      data: [70, 50, 30],
      backgroundColor: ['#EF4444', '#8B5CF6', '#14B8A6']
    }]
  },

  aprobacionesPendientes: [
    { id: 1, vehiculo: 'Toyota Corolla (PBX-123)', operador: 'Juan Pérez', servicio: 'Lavado Completo', hora: '10:30', estado: 'Pendiente' },
    { id: 2, vehiculo: 'Ford F-150 (GCA-987)', operador: 'Carlos López', servicio: 'Pulido', hora: '11:15', estado: 'Pendiente' },
    { id: 3, vehiculo: 'Kia Sportage (PDT-551)', operador: 'Luis Martínez', servicio: 'Lavado Motor', hora: '11:40', estado: 'Pendiente' }
  ]
};

import { MarcaSucursal, MovimientoRedSucursal, RegionOperativa, Sucursal } from '../models';

export const MOCK_REGIONES: RegionOperativa[] = [
  {
    id: 1,
    codigo: 'REG-SIE',
    nombre: 'Sierra',
    descripcion: 'Quito, Cumbayá y valles de la sierra centro-norte.',
    responsable: 'Supervisor Costa',
    estado: 'Activa'
  },
  {
    id: 2,
    codigo: 'REG-COS',
    nombre: 'Costa',
    descripcion: 'Guayaquil, Samborondón y litoral.',
    responsable: 'Sofía Larrea',
    estado: 'Activa'
  },
  {
    id: 3,
    codigo: 'REG-AUS',
    nombre: 'Austro',
    descripcion: 'Cuenca y zona austral. Lista para nuevas sucursales.',
    responsable: 'Pendiente de asignar',
    estado: 'Activa'
  }
];

export const MOCK_MARCAS_SUCURSAL: MarcaSucursal[] = [
  {
    id: 1,
    codigo: 'ED-STD',
    nombre: 'EasyDry',
    descripcion: 'Marca estándar de lavado ecológico.',
    color: '#004282',
    estado: 'Activa'
  },
  {
    id: 2,
    codigo: 'ED-PREM',
    nombre: 'EasyDry Premium',
    descripcion: 'Banner premium: detallado, cerámicos y servicios especiales.',
    color: '#9BCB3B',
    estado: 'Activa'
  },
  {
    id: 3,
    codigo: 'ED-EXP',
    nombre: 'EasyDry Express',
    descripcion: 'Formato rápido de alto volumen. Disponible para asignar.',
    color: '#F59E0B',
    estado: 'Activa'
  }
];

export const MOCK_SUCURSALES: Sucursal[] = [
  {
    id: 1,
    nombre: 'EasyDry Quito Norte',
    ciudad: 'Quito',
    direccion: 'Av. de los Granados N39-102 y 6 de Diciembre',
    cantidadBahias: 4,
    estado: 'Activo',
    responsable: 'Carlos Mendoza',
    operadoresActivos: 4,
    maquinasAsignadasCount: 6,
    serviciosRealizadosMes: 380,
    regionId: 1,
    regionNombre: 'Sierra',
    marcaId: 1,
    marcaNombre: 'EasyDry',
    servicioIds: [1, 2, 3, 5],
    serviciosNombres: ['Lavado Express', 'Lavado Completo', 'Deluxe', 'Pulido']
  },
  {
    id: 2,
    nombre: 'EasyDry Quito Sur',
    ciudad: 'Quito',
    direccion: 'Av. Maldonado S12-45 y Moraspungo',
    cantidadBahias: 4,
    estado: 'Activo',
    responsable: 'Diana Salazar',
    operadoresActivos: 3,
    maquinasAsignadasCount: 5,
    serviciosRealizadosMes: 290,
    regionId: 1,
    regionNombre: 'Sierra',
    marcaId: 1,
    marcaNombre: 'EasyDry',
    servicioIds: [1, 2, 4],
    serviciosNombres: ['Lavado Express', 'Lavado Completo', 'Retoque']
  },
  {
    id: 3,
    nombre: 'EasyDry Cumbayá',
    ciudad: 'Quito - Cumbayá',
    direccion: 'Av. Interoceánica Km 11.5 y Pampite',
    cantidadBahias: 3,
    estado: 'Activo',
    responsable: 'Roberto Benítez',
    operadoresActivos: 3,
    maquinasAsignadasCount: 4,
    serviciosRealizadosMes: 210,
    regionId: 1,
    regionNombre: 'Sierra',
    marcaId: 2,
    marcaNombre: 'EasyDry Premium',
    servicioIds: [1, 2, 3, 5, 6, 7, 8],
    serviciosNombres: ['Lavado Express', 'Lavado Completo', 'Deluxe', 'Pulido', 'Micro Pulido', 'Recubrimiento Cerámico 1 año', 'Recubrimiento Cerámico 3 años']
  },
  {
    id: 4,
    nombre: 'EasyDry Guayaquil',
    ciudad: 'Guayaquil',
    direccion: 'Av. Samborondón Km 2.5 Plaza Batán',
    cantidadBahias: 5,
    estado: 'Activo',
    responsable: 'Sofía Larrea',
    operadoresActivos: 5,
    maquinasAsignadasCount: 7,
    serviciosRealizadosMes: 368,
    regionId: 2,
    regionNombre: 'Costa',
    marcaId: 1,
    marcaNombre: 'EasyDry',
    servicioIds: [1, 2, 3, 9],
    serviciosNombres: ['Lavado Express', 'Lavado Completo', 'Deluxe', 'Lavado de motor']
  }
];

export const MOCK_MOVIMIENTOS_RED: MovimientoRedSucursal[] = [
  {
    id: 1,
    sucursalId: 3,
    sucursalNombre: 'EasyDry Cumbayá',
    tipo: 'MARCA',
    valorAnterior: 'EasyDry',
    valorNuevo: 'EasyDry Premium',
    motivo: 'Reclasificación a banner premium por mix de servicios especiales.',
    realizadoPor: 'Super Administrador Easy Dry',
    fecha: '2026-08-10 09:30'
  }
];

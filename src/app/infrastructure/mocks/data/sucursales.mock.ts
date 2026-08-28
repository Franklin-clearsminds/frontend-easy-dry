import { Sucursal } from '../../../domain';

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
    serviciosRealizadosMes: 380
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
    serviciosRealizadosMes: 290
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
    serviciosRealizadosMes: 210
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
    serviciosRealizadosMes: 368
  }
];

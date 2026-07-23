import { Operador } from '../models';

export const MOCK_OPERADORES: Operador[] = [
  {
    id: 1,
    nombre: 'Juan Pérez',
    cedula: '1723456789',
    rol: 'OPERADOR',
    sucursal: 'EasyDry Cumbayá',
    bahia: 'Bahía 1',
    estado: 'Activo',
    fechaAsignacion: '2026-07-20',
    vehiculosAtendidos: 120,
    serviciosRealizados: 150,
    promedioDiario: 12.5,
    ranking: 1,
    email: 'juan.perez@easydry.com'
  },
  {
    id: 2,
    nombre: 'Carlos López',
    cedula: '0912345678',
    rol: 'OPERADOR',
    sucursal: 'EasyDry Guayaquil',
    bahia: 'Bahía 2',
    estado: 'Activo',
    fechaAsignacion: '2026-07-15',
    vehiculosAtendidos: 95,
    serviciosRealizados: 110,
    promedioDiario: 10.2,
    ranking: 3,
    email: 'carlos.lopez@easydry.com'
  },
  {
    id: 3,
    nombre: 'Luis Martínez',
    cedula: '1756789123',
    rol: 'OPERADOR',
    sucursal: 'EasyDry Quito Norte',
    bahia: 'Bahía 1',
    estado: 'En Capacitación',
    fechaAsignacion: '2026-07-21',
    vehiculosAtendidos: 10,
    serviciosRealizados: 12,
    promedioDiario: 5.0,
    ranking: 15,
    email: 'luis.martinez@easydry.com'
  }
];

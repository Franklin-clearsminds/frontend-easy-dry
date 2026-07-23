import { Bahia } from '../models';

export const MOCK_BAHIAS: Bahia[] = [
  // Quito Norte (4 Bahías)
  {
    id: 101,
    codigo: 'B-QN-01',
    nombre: 'Bahía 1 (Lavado Ecológico)',
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    estado: 'Ocupada',
    operadorAsignado: 'Juan Pérez',
    operadorId: 1,
    maquinariaAsignada: ['Hidrolavadora HD-001', 'Aspiradora AS-001']
  },
  {
    id: 102,
    codigo: 'B-QN-02',
    nombre: 'Bahía 2 (Cerámico & Detallado)',
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    estado: 'Ocupada',
    operadorAsignado: 'Esteban Torres',
    operadorId: 5,
    maquinariaAsignada: ['Pulidora PL-001', 'Lampara Infrarroja RC-001']
  },
  {
    id: 103,
    codigo: 'B-QN-03',
    nombre: 'Bahía 3 (Express Exterior)',
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    estado: 'Disponible',
    operadorAsignado: 'Carlos Rivas',
    operadorId: 2,
    maquinariaAsignada: ['Hidrolavadora HD-002']
  },
  {
    id: 104,
    codigo: 'B-QN-04',
    nombre: 'Bahía 4 (Mantenimiento Técnico)',
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    estado: 'Mantenimiento',
    operadorAsignado: 'Sin Asignar',
    maquinariaAsignada: ['Generador Vapor GV-001']
  },

  // Quito Sur (4 Bahías)
  {
    id: 201,
    codigo: 'B-QS-01',
    nombre: 'Bahía 1 (Completo Interior)',
    sucursalId: 2,
    sucursalNombre: 'EasyDry Quito Sur',
    estado: 'Ocupada',
    operadorAsignado: 'Luis Morales',
    operadorId: 3,
    maquinariaAsignada: ['Aspiradora Industrial AS-002']
  },
  {
    id: 202,
    codigo: 'B-QS-02',
    nombre: 'Bahía 2 (Express)',
    sucursalId: 2,
    sucursalNombre: 'EasyDry Quito Sur',
    estado: 'Disponible',
    operadorAsignado: 'Ana Gómez',
    operadorId: 4,
    maquinariaAsignada: ['Hidrolavadora HD-003']
  },

  // Cumbayá (3 Bahías)
  {
    id: 301,
    codigo: 'B-CB-01',
    nombre: 'Bahía 1 (Deluxe & Pulido)',
    sucursalId: 3,
    sucursalNombre: 'EasyDry Cumbayá',
    estado: 'Ocupada',
    operadorAsignado: 'Mateo Guerrero',
    operadorId: 7,
    maquinariaAsignada: ['Pulidora Orbital PL-003']
  },

  // Guayaquil (5 Bahías)
  {
    id: 401,
    codigo: 'B-GY-01',
    nombre: 'Bahía 1 (Vapor Eco-Dry)',
    sucursalId: 4,
    sucursalNombre: 'EasyDry Guayaquil',
    estado: 'Ocupada',
    operadorAsignado: 'Valeria Paredes',
    operadorId: 6,
    maquinariaAsignada: ['Sistema Generador Vapor RC-004']
  }
];

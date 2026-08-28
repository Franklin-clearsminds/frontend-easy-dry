import { MovimientoMaquinaria, HistorialAsignacionOperador } from '../../../domain';

export const MOCK_MOVIMIENTOS_MAQUINARIA: MovimientoMaquinaria[] = [
  {
    id: 1,
    maquinaCodigo: 'HD-001',
    maquinaNombre: 'Hidrolavadora Ecológica HD-001',
    fecha: '2026-06-15 10:30',
    usuarioResponsable: 'Carlos Mendoza (Gerente)',
    sucursalAnterior: 'EasyDry Quito Sur',
    bahiaAnterior: 'Bahía 1',
    sucursalNueva: 'EasyDry Quito Norte',
    bahiaNueva: 'Bahía 1 (Lavado Ecológico)',
    motivo: 'Refuerzo de capacidad operativa por alta demanda'
  },
  {
    id: 2,
    maquinaCodigo: 'PL-003',
    maquinaNombre: 'Pulidora Orbital de Precisión PL-003',
    fecha: '2026-05-20 14:00',
    usuarioResponsable: 'Roberto Benítez (Gerente)',
    sucursalAnterior: 'EasyDry Quito Norte',
    bahiaAnterior: 'Bahía 2',
    sucursalNueva: 'EasyDry Cumbayá',
    bahiaNueva: 'Bahía 1 (Deluxe & Pulido)',
    motivo: 'Reasignación de equipo de pulido cerámico'
  },
  ...Array.from({ length: 45 }).map((_, i) => ({
    id: i + 3,
    maquinaCodigo: `EQ-${String((i % 15) + 1).padStart(3, '0')}`,
    maquinaNombre: `Equipo de Lavado Modelo ${String((i % 15) + 1)}`,
    fecha: `2026-${String(Math.floor(Math.random() * 6) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} 10:00`,
    usuarioResponsable: i % 2 === 0 ? 'Carlos Mendoza (Gerente)' : 'Diana Salazar (Gerente)',
    sucursalAnterior: i % 2 === 0 ? 'EasyDry Quito Sur' : 'EasyDry Quito Norte',
    bahiaAnterior: `Bahía ${Math.floor(Math.random() * 4) + 1}`,
    sucursalNueva: i % 2 !== 0 ? 'EasyDry Quito Sur' : 'EasyDry Quito Norte',
    bahiaNueva: `Bahía ${Math.floor(Math.random() * 4) + 1}`,
    motivo: i % 3 === 0 ? 'Refuerzo de capacidad operativa' : 'Traslado por falla técnica en sucursal'
  }))
];

export const MOCK_HISTORIAL_ASIGNACIONES_OPERADOR: HistorialAsignacionOperador[] = [
  {
    id: 1,
    operadorId: 1,
    operadorNombre: 'Juan Pérez',
    fechaInicio: '2024-01-15',
    fechaFin: '2024-03-30',
    sucursal: 'EasyDry Quito Norte',
    bahia: 'Bahía 1',
    realizadoPor: 'Carlos Mendoza',
    motivo: 'Asignación Inicial de Contratación'
  },
  {
    id: 2,
    operadorId: 1,
    operadorNombre: 'Juan Pérez',
    fechaInicio: '2024-04-01',
    fechaFin: undefined,
    sucursal: 'EasyDry Quito Sur',
    bahia: 'Bahía 3',
    realizadoPor: 'Diana Salazar',
    motivo: 'Transferencia Temporal por Vacaciones de Personal'
  },
  ...Array.from({ length: 45 }).map((_, i) => ({
    id: i + 3,
    operadorId: (i % 10) + 1,
    operadorNombre: `Operador ${i + 3}`,
    fechaInicio: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
    fechaFin: i % 3 === 0 ? undefined : `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-28`,
    sucursal: i % 2 === 0 ? 'EasyDry Quito Norte' : 'EasyDry Cumbayá',
    bahia: `Bahía ${Math.floor(Math.random() * 5) + 1}`,
    realizadoPor: 'Gerencia Central',
    motivo: i % 2 === 0 ? 'Rotación de Personal Programada' : 'Cobertura de Turno Extra'
  }))
];

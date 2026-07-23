import { Agencia, VehiculoServicio, Maquinaria, Mantenimiento, Incidente, Usuario, Reporte } from '../models';

export const MOCK_AGENCIAS: Agencia[] = [
  {
    id: 1,
    nombre: 'EasyDry Quito Norte',
    ciudad: 'Quito',
    numeroBahias: 8,
    empleados: 16,
    productividad: 96.4,
    estado: 'Operativa',
    direccion: 'Av. de los Granados N39-102 y 6 de Diciembre',
    gerenteAsignado: 'Carlos Mendoza'
  },
  {
    id: 2,
    nombre: 'EasyDry Quito Sur',
    ciudad: 'Quito',
    numeroBahias: 6,
    empleados: 12,
    productividad: 91.8,
    estado: 'Operativa',
    direccion: 'Av. Maldonado S12-45 y Moraspungo',
    gerenteAsignado: 'Diana Salazar'
  },
  {
    id: 3,
    nombre: 'EasyDry Cumbayá',
    ciudad: 'Quito - Cumbayá',
    numeroBahias: 5,
    empleados: 10,
    productividad: 98.2,
    estado: 'Capacidad Máxima',
    direccion: 'Av. Interoceánica Km 11.5 y Pampite',
    gerenteAsignado: 'Roberto Benítez'
  },
  {
    id: 4,
    nombre: 'EasyDry Guayaquil',
    ciudad: 'Guayaquil',
    numeroBahias: 10,
    empleados: 20,
    productividad: 94.0,
    estado: 'Operativa',
    direccion: 'Av. Samborondón Km 2.5 Plaza Batán',
    gerenteAsignado: 'Sofía Larrea'
  }
];

export const MOCK_USUARIOS: Usuario[] = [
  {
    id: 1,
    nombre: 'Franklin',
    apellido: 'Administrador',
    rol: 'SuperAdmin',
    agencia: 'Todas',
    estado: 'Activo',
    fechaAsignacion: '2024-01-15',
    email: 'admin@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellido: 'Mendoza',
    rol: 'Gerente',
    agencia: 'EasyDry Quito Norte',
    estado: 'Activo',
    fechaAsignacion: '2024-02-01',
    email: 'gerente.quito@easydry.com',
    sucursalAsignada: 'EasyDry Quito Norte',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    nombre: 'Diana',
    apellido: 'Salazar',
    rol: 'Gerente',
    agencia: 'EasyDry Quito Sur',
    estado: 'Activo',
    fechaAsignacion: '2024-02-10',
    email: 'dsalazar@easydry.com',
    sucursalAsignada: 'EasyDry Quito Sur',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 4,
    nombre: 'Mateo',
    apellido: 'Guerrero',
    rol: 'Supervisor',
    agencia: 'EasyDry Quito Norte',
    estado: 'Activo',
    fechaAsignacion: '2024-03-12',
    email: 'supervisor.quito@easydry.com',
    sucursalAsignada: 'EasyDry Quito Norte',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 5,
    nombre: 'Juan',
    apellido: 'Pérez',
    rol: 'OPERADOR',
    agencia: 'EasyDry Quito Norte',
    sucursalAsignada: 'EasyDry Quito Norte',
    bahiaAsignada: 'Bahía 1 (Lavado Ecológico)',
    estado: 'Activo',
    fechaAsignacion: '2024-01-15',
    email: 'operador.bahia1@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 6,
    nombre: 'Esteban',
    apellido: 'Torres',
    rol: 'Técnico',
    agencia: 'EasyDry Quito Norte',
    estado: 'Activo',
    fechaAsignacion: '2024-04-05',
    email: 'tecnico@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&auto=format&fit=crop&q=80'
  },
  ...Array.from({ length: 40 }).map((_, i) => ({
    id: i + 7,
    nombre: `Usuario ${i + 7}`,
    apellido: `Apellido ${i + 7}`,
    rol: i % 4 === 0 ? 'Gerente' : (i % 3 === 0 ? 'Supervisor' : 'Técnico Especialista'),
    agencia: i % 2 === 0 ? 'EasyDry Quito Norte' : 'EasyDry Quito Sur',
    estado: i % 5 === 0 ? 'Inactivo' : 'Activo',
    fechaAsignacion: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
    email: `usuario${i + 7}@easydry.com`,
    avatar: `https://images.unsplash.com/photo-${1500000000000 + i}?w=150&auto=format&fit=crop&q=80`
  }))
];


export const MOCK_SERVICIOS: VehiculoServicio[] = [
  {
    id: 101,
    numeroOrden: 'ORD-2026-001',
    ordenTrabajoOT: 'OT-8932',
    placa: 'PBX-8932',
    marca: 'Toyota',
    modelo: 'RAV4 Hybrid',
    anio: 2024,
    color: 'Blanco Perla',
    categoriaServicio: 'Servicios Especiales',
    servicio: 'Recubrimiento Cerámico',
    categoria: 'SUV',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 2 (Cerámico & Detallado)',
    empleado: 'Juan Pérez',
    fecha: '2026-07-22',
    horaIngreso: '08:30',
    horaSalida: '10:30',
    estado: 'EN PROCESO',
    foto: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&auto=format&fit=crop&q=80',
    fotos: [
      'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800&auto=format&fit=crop&q=80'
    ],
    video: 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4',
    tiempoEstimadoMin: 120,
    costo: 180.00,
    notas: 'Aplicación de tratamiento cerámico titanio a presión Eco-Dry'
  },
  {
    id: 102,
    numeroOrden: 'ORD-2026-002',
    ordenTrabajoOT: 'OT-4521',
    placa: 'GSB-4521',
    marca: 'Chevrolet',
    modelo: 'Tracker Turbo',
    anio: 2023,
    color: 'Gris Plata',
    categoriaServicio: 'Servicios Generales',
    servicio: 'Completo',
    categoria: 'SUV',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 1 (Lavado Ecológico)',
    empleado: 'Juan Pérez',
    fecha: '2026-07-22',
    horaIngreso: '09:15',
    horaSalida: '10:00',
    estado: 'FINALIZADO',
    foto: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-man-cleaning-a-car-interior-with-a-vacuum-cleaner-41487-large.mp4',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-cleaning-a-car-interior-with-a-vacuum-cleaner-41487-large.mp4',
    tiempoEstimadoMin: 45,
    costo: 35.00,
    notas: 'Servicio concluido, listo para inspección y aprobación del Gerente'
  },
  {
    id: 103,
    numeroOrden: 'ORD-2026-003',
    ordenTrabajoOT: 'OT-1109',
    placa: 'PCD-1109',
    marca: 'BMW',
    modelo: 'M3 Competition',
    anio: 2025,
    color: 'Azul Isar',
    categoriaServicio: 'Servicios Especiales',
    servicio: 'Pulido',
    categoria: 'Sedán',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 2 (Cerámico & Detallado)',
    empleado: 'Esteban Torres',
    fecha: '2026-07-22',
    horaIngreso: '07:45',
    horaSalida: '09:15',
    estado: 'APROBADO',
    foto: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4',
    tiempoEstimadoMin: 90,
    costo: 120.00,
    observacionGerente: 'Trabajo impecable. Acabado espejo confirmado.',
    aprobadoPor: 'Carlos Mendoza (Gerente)',
    fechaAprobacion: '2026-07-22 09:30',
    notas: 'Eliminación micro-rayones con pad de lana sintética'
  },
  {
    id: 104,
    numeroOrden: 'ORD-2026-004',
    ordenTrabajoOT: 'OT-7743',
    placa: 'PBA-7743',
    marca: 'Hyundai',
    modelo: 'Tucson NX4',
    anio: 2024,
    color: 'Negro Phantom',
    categoriaServicio: 'Servicios Generales',
    servicio: 'Express',
    categoria: 'SUV',
    agencia: 'EasyDry Quito Sur',
    bahia: 'Bahía 1 (Completo Interior)',
    empleado: 'Luis Morales',
    fecha: '2026-07-22',
    horaIngreso: '08:00',
    horaSalida: '08:30',
    estado: 'APROBADO',
    foto: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
    video: '',
    tiempoEstimadoMin: 25,
    costo: 18.00,
    observacionGerente: 'Servicio Express OK',
    aprobadoPor: 'Diana Salazar (Gerente)',
    fechaAprobacion: '2026-07-22 08:40',
    notas: 'Lavado ecológico rápido exterior'
  }
];

export const MOCK_MAQUINARIA: Maquinaria[] = [
  {
    id: 1,
    codigo: 'HD-001',
    nombre: 'Hidrolavadora Ecológica Presión HD-001',
    tipo: 'Hidrolavadora',
    marca: 'Kärcher Professional',
    modelo: 'HD 10/25-4 S',
    numeroSerie: 'SN-98234-KCH',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 1 (Lavado Ecológico)',
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    bahiaId: 101,
    bahiaNombre: 'Bahía 1 (Lavado Ecológico)',
    operadorResponsable: 'Juan Pérez',
    estado: 'Operativa',
    fechaMantenimiento: '2026-08-15',
    imagen: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80',
    horasUso: 1420,
    nivelPresionWaterBar: 250
  },
  {
    id: 2,
    codigo: 'AS-002',
    nombre: 'Aspiradora Industrial Seco/Húmedo AS-002',
    tipo: 'Aspiradora',
    marca: 'Kärcher',
    modelo: 'NT 65/2 Tact²',
    numeroSerie: 'SN-44120-AS',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 1 (Lavado Ecológico)',
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    bahiaId: 101,
    bahiaNombre: 'Bahía 1 (Lavado Ecológico)',
    operadorResponsable: 'Juan Pérez',
    estado: 'Dañada',
    fechaMantenimiento: '2026-07-10',
    imagen: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500&auto=format&fit=crop&q=80',
    horasUso: 890
  },
  {
    id: 3,
    codigo: 'PL-003',
    nombre: 'Pulidora Orbital Dual Action PL-003',
    tipo: 'Pulidora',
    marca: 'Rupes Bigfoot',
    modelo: 'LHR21 Mark III',
    numeroSerie: 'SN-11209-RUP',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 2 (Cerámico & Detallado)',
    sucursalId: 1,
    sucursalNombre: 'EasyDry Quito Norte',
    bahiaId: 102,
    bahiaNombre: 'Bahía 2 (Cerámico & Detallado)',
    operadorResponsable: 'Esteban Torres',
    estado: 'Operativa',
    fechaMantenimiento: '2026-09-01',
    imagen: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=500&auto=format&fit=crop&q=80',
    horasUso: 610
  }
];

export const MOCK_MANTENIMIENTOS: Mantenimiento[] = [
  {
    id: 1,
    maquina: 'Hidrolavadora HD-001',
    tipo: 'Preventivo',
    fecha: '2026-06-15',
    tecnico: 'Esteban Torres (Técnico)',
    estado: 'Completado',
    costo: 85.00,
    descripcion: 'Cambio de sellos cerámicos de bomba y aceite hidráulico.',
    agencia: 'EasyDry Quito Norte'
  },
  ...Array.from({ length: 45 }).map((_, i) => ({
    id: i + 2,
    maquina: `Máquina HD-${String((i % 10) + 1).padStart(3, '0')}`,
    tipo: i % 3 === 0 ? 'Correctivo' : 'Preventivo',
    fecha: `2026-07-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    tecnico: i % 2 === 0 ? 'Esteban Torres (Técnico)' : 'Pedro Martínez (Técnico)',
    estado: i % 4 === 0 ? 'Programado' : (i % 5 === 0 ? 'En Curso' : 'Completado'),
    costo: Math.floor(Math.random() * 200) + 50,
    descripcion: `Revisión y mantenimiento de componentes rutinarios (Orden #${202600 + i}).`,
    agencia: i % 2 === 0 ? 'EasyDry Quito Norte' : 'EasyDry Quito Sur'
  }))
];

export const MOCK_INCIDENTES: Incidente[] = [
  {
    id: 1,
    codigoIncidente: 'INC-2026-001',
    maquina: 'Aspiradora Industrial AS-002',
    agencia: 'EasyDry Quito Norte',
    fecha: '2026-07-20 11:30',
    tipo: 'Falla eléctrica',
    prioridad: 'Alta',
    estado: 'Pendiente',
    descripcion: 'Bomba de succión no enciende al accionar switch secundario. Fuga de aire detectada.',
    reportadoPor: 'Carlos Mendoza (Gerente)'
  },
  {
    id: 2,
    codigoIncidente: 'INC-2026-002',
    maquina: 'Hidrolavadora HD-001',
    agencia: 'EasyDry Quito Norte',
    fecha: '2026-07-15 09:00',
    tipo: 'Fuga de agua',
    prioridad: 'Media',
    estado: 'Solucionado',
    descripcion: 'Fuga leve de agua en acople rápido de manguera de alta presión.',
    reportadoPor: 'Juan Pérez (Operador)',
    fechaSolucion: '2026-07-15 14:20',
    solucionadoPor: 'Esteban Torres (Técnico)',
    observacionSolucion: 'Reemplazo de empaque O-ring y niple de latón reforzado.'
  },
  ...Array.from({ length: 45 }).map((_, i) => {
    const isSolucionado = i % 2 !== 0;
    return {
      id: i + 3,
      codigoIncidente: `INC-2026-${String(i + 3).padStart(3, '0')}`,
      maquina: `Equipo-${String((i % 8) + 1).padStart(3, '0')}`,
      agencia: i % 3 === 0 ? 'EasyDry Quito Sur' : 'EasyDry Quito Norte',
      fecha: `2026-07-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} 10:00`,
      tipo: i % 3 === 0 ? 'Desgaste' : (i % 2 === 0 ? 'Falla eléctrica' : 'Rotura de pieza'),
      prioridad: i % 4 === 0 ? 'Alta' : (i % 2 === 0 ? 'Media' : 'Baja'),
      estado: isSolucionado ? 'Solucionado' : (i % 5 === 0 ? 'Pendiente' : 'En Solución'),
      descripcion: `Falla detectada durante operación. Incidente #${i + 3} registrado automáticamente.`,
      reportadoPor: 'Operador del sistema',
      ...(isSolucionado ? {
        fechaSolucion: `2026-07-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')} 16:30`,
        solucionadoPor: 'Esteban Torres (Técnico)',
        observacionSolucion: 'Reparación completada y verificada.'
      } : {})
    };
  })
];

export const MOCK_REPORTES: Reporte[] = [
  {
    id: 1,
    titulo: 'Reporte Diario de Operaciones',
    tipo: 'Diario',
    agencia: 'EasyDry Quito Norte',
    fechaGeneracion: '2026-07-22',
    totalServicios: 24,
    ingresosTotales: 890.00,
    eficienciaGeneral: 96.5
  }
];

import { Agencia, VehiculoServicio, Maquinaria, Mantenimiento, Incidente, Usuario, Reporte, ArchivoAdjunto } from '../models';

const DEMO_EVIDENCIAS_MANTENIMIENTO = {
  fotos: [
    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80',
  ],
  videos: [
    'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-details-close-up-42289-large.mp4',
  ],
  documentos: [
    { id: 'doc-m-1', nombre: 'informe_mantenimiento.pdf', tipo: 'documento' as const, extension: 'PDF', url: '#', tamanio: '1.4 MB', fechaSubida: '2026-07-12' },
    { id: 'doc-m-2', nombre: 'factura_repuestos.pdf', tipo: 'documento' as const, extension: 'PDF', url: '#', tamanio: '890 KB', fechaSubida: '2026-07-12' },
  ] satisfies ArchivoAdjunto[],
};

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
    nombre: 'Super Administrador Easy Dry',
    apellido: 'Corporativo',
    rol: 'Super Administrador',
    agencia: 'EasyDry Corporativo Nacional',
    estado: 'Activo',
    fechaAsignacion: '2024-01-15',
    email: 'superadmin@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    nombre: 'Administrador Easy Dry',
    apellido: 'Corporativo',
    rol: 'Administrador',
    agencia: 'EasyDry Corporativo Nacional',
    estado: 'Activo',
    fechaAsignacion: '2024-01-15',
    email: 'admin@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    nombre: 'Supervisor Costa',
    apellido: 'Operaciones',
    rol: 'Supervisor Regional',
    agencia: 'EasyDry Guayaquil (Costa)',
    estado: 'Activo',
    fechaAsignacion: '2024-02-01',
    email: 'supervisor.costa@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 4,
    nombre: 'Gestor Técnico',
    apellido: 'Taller',
    rol: 'Gestor Técnico',
    agencia: 'Taller Central Nacional',
    estado: 'Activo',
    fechaAsignacion: '2024-02-10',
    email: 'mantenimiento@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 5,
    nombre: 'Técnico Easy Dry',
    apellido: 'Mantenimiento',
    rol: 'Técnico de Maquinaria',
    agencia: 'Red Nacional EasyDry',
    estado: 'Activo',
    fechaAsignacion: '2024-03-01',
    email: 'tecnico@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 6,
    nombre: 'Operador Bahía 01',
    apellido: 'Quito',
    rol: 'Operador de Bahía',
    agencia: 'EasyDry Quito Norte',
    estado: 'Activo',
    fechaAsignacion: '2024-03-15',
    email: 'operador.bahia01@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 7,
    nombre: 'Coordinador Comercial',
    apellido: 'Ventas',
    rol: 'Coordinador Comercial',
    agencia: 'EasyDry Corporativo Nacional',
    estado: 'Activo',
    fechaAsignacion: '2024-04-01',
    email: 'comercial@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 8,
    nombre: 'Jefe Servicios Especiales',
    apellido: 'Detallado VIP',
    rol: 'Jefe Servicios Especiales',
    agencia: 'Región Costa / Sierra',
    estado: 'Activo',
    fechaAsignacion: '2024-04-10',
    email: 'especiales@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 9,
    nombre: 'Operador Pulido',
    apellido: 'Especiales',
    rol: 'Operador Servicios Especiales',
    agencia: 'Red Nacional · Móvil',
    estado: 'Activo',
    fechaAsignacion: '2024-05-01',
    email: 'operador.especial@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    modalidadPulidor: 'MOVIL'
  },
  {
    id: 11,
    nombre: 'Diego',
    apellido: 'Pulido Norte',
    rol: 'Operador Servicios Especiales',
    agencia: 'EasyDry Quito Norte',
    estado: 'Activo',
    fechaAsignacion: '2024-06-01',
    email: 'operador.pulido.norte@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    modalidadPulidor: 'FIJO'
  },
  {
    id: 12,
    nombre: 'Carlos',
    apellido: 'Mendoza',
    rol: 'Gerente de Sucursal',
    agencia: 'EasyDry Quito Norte',
    estado: 'Activo',
    fechaAsignacion: '2024-02-01',
    email: 'gerente.norte@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 13,
    nombre: 'Diana',
    apellido: 'Salazar',
    rol: 'Gerente de Sucursal',
    agencia: 'EasyDry Guayaquil (Costa)',
    estado: 'Activo',
    fechaAsignacion: '2024-02-15',
    email: 'diana.gerente@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 10,
    nombre: 'Gestor de Inventario',
    apellido: 'Suministros',
    rol: 'Gestor de Inventario',
    agencia: 'Bodega Central EasyDry',
    estado: 'Activo',
    fechaAsignacion: '2024-05-15',
    email: 'distribuidor@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 12,
    nombre: 'Luis',
    apellido: 'Bodega',
    rol: 'Asistente de Bodega',
    agencia: 'Bodega Central EasyDry',
    estado: 'Activo',
    fechaAsignacion: '2024-06-10',
    email: 'asistente.bodega@easydry.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  }
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
  },
  {
    id: 105,
    numeroOrden: 'ORD-2026-005',
    ordenTrabajoOT: 'OT-9840',
    placa: 'PDK-5510',
    marca: 'Kia',
    modelo: 'Sportage R',
    anio: 2024,
    color: 'Rojo Pasión',
    categoriaServicio: 'Servicios Especiales',
    servicio: 'Lavado Motor & Chasis Completo',
    categoria: 'SUV',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 1 (Lavado Ecológico)',
    empleado: 'Juan Pérez',
    fecha: '2026-07-22',
    horaIngreso: '10:00',
    horaSalida: '10:45',
    estado: 'EN PROCESO',
    foto: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4',
    tiempoEstimadoMin: 45,
    costo: 45.00,
    notas: 'Servicio Extra programado: Desengrase a fondo de motor y chasis'
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
  },
  {
    id: 4,
    codigo: 'PL-101',
    nombre: 'Pulidora Orbital Dual Action PL-101',
    tipo: 'Pulidora',
    marca: 'Rupes Bigfoot',
    modelo: 'LHR15 Mark III',
    numeroSerie: 'SN-SE-101-RUP',
    agencia: 'Red Nacional · Servicios Especiales',
    bahia: 'Equipo Móvil',
    sucursalNombre: 'Red Nacional · Servicios Especiales',
    bahiaNombre: 'Equipo Móvil',
    operadorResponsable: 'Operador Pulido',
    estado: 'Operativa',
    fechaMantenimiento: '2026-08-20',
    imagen: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=500&auto=format&fit=crop&q=80',
    horasUso: 340
  },
  {
    id: 5,
    codigo: 'IR-201',
    nombre: 'Lámpara Infrarroja de Curado IR-201',
    tipo: 'Lámpara Infrarroja',
    marca: 'IRtad',
    modelo: 'SmartCure 2K',
    numeroSerie: 'SN-SE-201-IR',
    agencia: 'Red Nacional · Servicios Especiales',
    bahia: 'Equipo Móvil',
    sucursalNombre: 'Red Nacional · Servicios Especiales',
    bahiaNombre: 'Equipo Móvil',
    operadorResponsable: 'Operador Pulido',
    estado: 'Operativa',
    fechaMantenimiento: '2026-08-12',
    imagen: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&auto=format&fit=crop&q=80',
    horasUso: 210
  },
  {
    id: 6,
    codigo: 'EX-301',
    nombre: 'Extractor de Motor Portátil EX-301',
    tipo: 'Extractor',
    marca: 'Kärcher',
    modelo: 'Puzzi 10/1',
    numeroSerie: 'SN-SE-301-EX',
    agencia: 'Red Nacional · Servicios Especiales',
    bahia: 'Equipo Móvil',
    sucursalNombre: 'Red Nacional · Servicios Especiales',
    bahiaNombre: 'Equipo Móvil',
    operadorResponsable: 'Operador Pulido',
    estado: 'Operativa',
    fechaMantenimiento: '2026-08-05',
    imagen: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500&auto=format&fit=crop&q=80',
    horasUso: 180
  }
];

export const MOCK_MANTENIMIENTOS: Mantenimiento[] = [
  {
    id: 1,
    maquina: 'Hidrolavadora HD-001',
    tipo: 'Preventivo',
    fecha: '2026-08-28',
    tecnico: 'Sin asignar',
    estado: 'Programado',
    costo: 85.00,
    descripcion: 'Cambio de sellos cerámicos de bomba y aceite hidráulico. Pendiente de asignación.',
    agencia: 'EasyDry Quito Norte'
  },
  {
    id: 100,
    maquina: 'Compresor de Aire CA-003',
    tipo: 'Preventivo',
    fecha: '2026-08-28',
    tecnico: 'Técnico Easy Dry',
    tecnicoAsignadoId: 4,
    tecnicoAsignadoNombre: 'Técnico Easy Dry',
    gestorAsignadorId: 3,
    gestorAsignadorNombre: 'Gestor Técnico',
    fechaAsignacion: '2026-08-28 07:30',
    estado: 'En Proceso',
    costo: 25.00,
    descripcion: 'Mantenimiento delegado al técnico de campo.',
    agencia: 'EasyDry Quito Norte'
  },
  ...Array.from({ length: 45 }).map((_, i) => {
    const estado = i % 4 === 0 ? 'Programado' : (i % 5 === 0 ? 'En Proceso' : 'Completado');
    const fecha = `2026-07-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
    const base: Mantenimiento = {
      id: i + 2,
      maquina: `Máquina HD-${String((i % 10) + 1).padStart(3, '0')}`,
      tipo: i % 3 === 0 ? 'Correctivo' : 'Preventivo',
      fecha,
      tecnico: i % 2 === 0 ? 'Esteban Torres (Técnico)' : 'Pedro Martínez (Técnico)',
      estado,
      costo: Math.floor(Math.random() * 200) + 50,
      descripcion: `Revisión y mantenimiento de componentes rutinarios (Orden #${202600 + i}).`,
      agencia: i % 2 === 0 ? 'EasyDry Quito Norte' : 'EasyDry Quito Sur'
    };
    if (estado === 'Completado') {
      const dia = Math.min(parseInt(fecha.split('-')[2], 10) + 1, 28);
      const fechaFin = `2026-07-${String(dia).padStart(2, '0')}`;
      return {
        ...base,
        observacionCierre: `Se ejecutó ${base.tipo.toLowerCase()} completo: lubricación de componentes, cambio de filtros, ajuste de presión y prueba operativa. Equipo en condiciones óptimas.`,
        fechaFin,
        horaFin: '15:45',
        fechaCierre: fechaFin,
        cerradoPor: base.tecnico,
        fotos: [...DEMO_EVIDENCIAS_MANTENIMIENTO.fotos],
        videos: [...DEMO_EVIDENCIAS_MANTENIMIENTO.videos],
        documentos: DEMO_EVIDENCIAS_MANTENIMIENTO.documentos.map(d => ({ ...d, id: `${d.id}-${i}` })),
      };
    }
    return base;
  })
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
    descripcion: 'Bomba de succión no enciende al accionar switch secundario. Fuga de aire y recalentamiento detectado.',
    reportadoPor: 'Franklin Administrador',
    fotosFallo: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'
    ],
    videosFallo: [
      'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-details-close-up-42289-large.mp4'
    ],
    archivosFallo: [
      {
        id: 'f-1',
        nombre: 'panel_electrico_danado.jpg',
        tipo: 'imagen',
        extension: 'JPG',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        tamanio: '2.4 MB',
        fechaSubida: '2026-07-20 11:32'
      },
      {
        id: 'f-2',
        nombre: 'video_falla_succion.mp4',
        tipo: 'video',
        extension: 'MP4',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-details-close-up-42289-large.mp4',
        tamanio: '14.8 MB',
        fechaSubida: '2026-07-20 11:35'
      }
    ]
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
    descripcion: 'Fuga de agua continua en el cabezal de la manguera de alta presión y desgaste en el acople rápido.',
    reportadoPor: 'Franklin Administrador',
    fotosFallo: [
      'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&auto=format&fit=crop&q=80'
    ],
    videosFallo: [
      'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4'
    ],
    fechaSolucion: '2026-07-15 14:20',
    solucionadoPor: 'Esteban Torres (Taller Central)',
    observacionSolucion: 'Sustitución completa del juego de empaques O-ring reforzados de alta presión y acople de bronce industrial. Se realizaron pruebas a 180 BAR durante 15 minutos sin goteo.',
    costoReparacion: 45.00,
    repuestosUtilizados: 'Empaques O-Ring Viton 1/2", Acople Rápido M22 Bronce',
    fotosReparacion: [
      'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80'
    ],
    videosReparacion: [
      'https://assets.mixkit.co/videos/preview/mixkit-water-spraying-from-a-hose-close-up-41508-large.mp4'
    ],
    documentosReparacion: [
      {
        id: 'doc-1',
        nombre: 'Informe_Tecnico_HD001_Reparacion.pdf',
        tipo: 'documento',
        extension: 'PDF',
        url: '#',
        tamanio: '1.2 MB',
        fechaSubida: '2026-07-15 14:25'
      },
      {
        id: 'doc-2',
        nombre: 'Factura_Repuestos_Acoples_Bronce.pdf',
        tipo: 'documento',
        extension: 'PDF',
        url: '#',
        tamanio: '450 KB',
        fechaSubida: '2026-07-15 14:28'
      },
      {
        id: 'doc-3',
        nombre: 'Certificado_Garantia_Piezas_Karcher.pdf',
        tipo: 'documento',
        extension: 'PDF',
        url: '#',
        tamanio: '890 KB',
        fechaSubida: '2026-07-15 14:30'
      }
    ]
  },
  {
    id: 3,
    codigoIncidente: 'INC-2026-003',
    maquina: 'Generador de Ozono OZ-001',
    agencia: 'EasyDry Cumbayá',
    fecha: '2026-07-18 15:40',
    tipo: 'Falla eléctrica',
    prioridad: 'Crítica',
    estado: 'Solucionado',
    descripcion: 'Generador no produce descarga iónica. Fusible térmico saltado repetidamente.',
    reportadoPor: 'Franklin Administrador',
    fotosFallo: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'
    ],
    fechaSolucion: '2026-07-19 11:00',
    solucionadoPor: 'Esteban Torres (Taller Central)',
    observacionSolucion: 'Reemplazo de placa cerámica de alta tensión y fusible cerámico de 10A.',
    costoReparacion: 65.00,
    repuestosUtilizados: 'Placa Cerámica Ozono 10g/h, Fusible Cerámico 10A',
    fotosReparacion: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80'
    ],
    documentosReparacion: [
      {
        id: 'doc-4',
        nombre: 'Protocolo_Calibracion_Ozono.pdf',
        tipo: 'documento',
        extension: 'PDF',
        url: '#',
        tamanio: '2.1 MB',
        fechaSubida: '2026-07-19 11:15'
      }
    ]
  },
  {
    id: 4,
    codigoIncidente: 'INC-2026-004',
    maquina: 'Compresor de Aire CA-003',
    agencia: 'EasyDry Quito Norte',
    fecha: '2026-08-28 06:45',
    tipo: 'Baja presión',
    prioridad: 'Media',
    estado: 'En Solución',
    descripcion: 'Caída de presión en tanque. Posible fuga en válvula de retención.',
    reportadoPor: 'Operador Bahía 02',
    tecnicoAsignadoId: 4,
    tecnicoAsignadoNombre: 'Técnico Easy Dry',
    gestorAsignadorId: 3,
    gestorAsignadorNombre: 'Gestor Técnico',
    fechaAsignacion: '2026-08-28 07:00',
    fotosFallo: [
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'
    ]
  }
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

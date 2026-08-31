import { InsumoConsumidoServicio } from './inventario.model';
export * from './roles.model';
export * from './catalogo-servicio.model';
export * from './inventario.model';
export type ModalidadPulidor = 'FIJO' | 'MOVIL';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  rol: 'SuperAdmin' | 'Gerente' | 'Supervisor' | 'Técnico' | 'OPERADOR' | string;
  agencia: string;
  estado: 'Activo' | 'Inactivo' | 'En Capacitación' | string;
  fechaAsignacion: string;
  email: string;
  avatar?: string;
  sucursalAsignada?: string;
  bahiaAsignada?: string;
  /** Solo operadores de servicios especiales (pulidores): fijo en sucursal o móvil entre sedes. */
  modalidadPulidor?: ModalidadPulidor;
}

export interface Sucursal {
  id: number;
  nombre: string;
  ciudad: string;
  direccion: string;
  estado: 'Activo' | 'Mantenimiento' | 'Inactivo' | string;
  cantidadBahias: number;
  responsable: string;
  operadoresActivos?: number;
  maquinasAsignadasCount?: number;
  serviciosRealizadosMes?: number;
  regionId?: number;
  regionNombre?: string;
  marcaId?: number;
  marcaNombre?: string;
  /** IDs del catálogo de servicios que esta sucursal ofrece. */
  servicioIds?: number[];
  /** Nombres denormalizados para listados. */
  serviciosNombres?: string[];
}

export interface RegionOperativa {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  responsable?: string;
  estado: 'Activa' | 'Inactiva';
}

export interface MarcaSucursal {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  color: string;
  estado: 'Activa' | 'Inactiva';
}

export interface MovimientoRedSucursal {
  id: number;
  sucursalId: number;
  sucursalNombre: string;
  tipo: 'REGION' | 'MARCA';
  valorAnterior: string;
  valorNuevo: string;
  motivo: string;
  realizadoPor: string;
  fecha: string;
}

export interface Bahia {
  id: number;
  codigo: string;
  nombre: string;
  sucursalId: number;
  sucursalNombre: string;
  estado: 'Disponible' | 'Ocupada' | 'Mantenimiento' | 'Inactiva' | string;
  operadorAsignado?: string;
  operadorId?: number;
  maquinariaAsignada?: string[];
}

export interface Operador {
  id: number;
  nombre: string;
  cedula: string;
  rol: 'OPERADOR';
  sucursal: string;
  bahia: string;
  estado: 'Activo' | 'Inactivo' | 'En Capacitación' | string;
  fechaAsignacion: string;
  vehiculosAtendidos: number;
  serviciosRealizados: number;
  promedioDiario: number;
  ranking: number;
  email: string;
  avatar?: string;
}

export interface HistorialAsignacionOperador {
  id: number;
  operadorId: number;
  operadorNombre: string;
  fechaInicio: string;
  fechaFin?: string;
  sucursal: string;
  bahia: string;
  realizadoPor: string;
  motivo: string;
}

export interface MovimientoMaquinaria {
  id: number;
  maquinaCodigo: string;
  maquinaNombre: string;
  fecha: string;
  usuarioResponsable: string;
  sucursalAnterior: string;
  bahiaAnterior: string;
  sucursalNueva: string;
  bahiaNueva: string;
  motivo: string;
}

export interface Agencia {
  id: number;
  nombre: string;
  ciudad: string;
  numeroBahias: number;
  empleados: number;
  productividad: number;
  estado: 'Operativa' | 'Capacidad Máxima' | 'Mantenimiento' | 'Inactiva' | string;
  direccion?: string;
  gerenteAsignado?: string;
}

export interface VehiculoServicio {
  id: number;
  numeroOrden: string;
  ordenTrabajoOT: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  categoriaServicio: 'Servicios Generales' | 'Servicios Especiales' | 'Servicios Extras' | 'GENERAL' | 'ESPECIAL' | 'EXTRA' | string;
  servicioId?: number;
  servicio: 'Express' | 'Completo' | 'Deluxe' | 'Retoque' | 'Pulido' | 'Micro pulido' | 'Recubrimiento Cerámico' | 'Lavado motor' | 'Tratamientos especiales' | string;
  categoria: 'Sedán' | 'SUV' | 'Camioneta' | 'Hatchback' | string;
  agencia: string;
  bahia?: string;
  empleado: string;
  fecha: string;
  horaIngreso: string;
  horaSalida: string;
  estado: 'EN PROCESO' | 'FINALIZADO' | 'APROBADO' | 'RECHAZADO' | 'En Cola' | 'Entregado' | string;
  foto: string;
  fotos?: string[];
  video: string;
  videoUrl?: string;
  tiempoEstimadoMin?: number;
  costo?: number;
  notas?: string;
  insumosUtilizados?: InsumoConsumidoServicio[];
  observacionGerente?: string;
  aprobadoPor?: string;
  fechaAprobacion?: string;
}

export interface Maquinaria {
  id: number;
  codigo: string;
  nombre: string;
  tipo?: string;
  marca: string;
  modelo: string;
  numeroSerie?: string;
  agencia: string;
  bahia: string;
  sucursalId?: number;
  sucursalNombre?: string;
  bahiaId?: number;
  bahiaNombre?: string;
  operadorResponsable?: string;
  estado: 'Operativa' | 'Mantenimiento' | 'Dañada' | 'Fuera de Servicio' | 'Requiere Mantenimiento' | 'En Reparación' | string;
  fechaMantenimiento: string;
  fechaAsignacion?: string;
  imagen: string;
  horasUso?: number;
  nivelPresionWaterBar?: number;
}

export interface Mantenimiento {
  id: number;
  maquina: string;
  tipo: 'Preventivo' | 'Correctivo' | 'Calibración' | string;
  fecha: string;
  tecnico: string;
  estado: 'Programado' | 'En Proceso' | 'Completado' | 'Cancelado' | string;
  costo: number;
  descripcion: string;
  agencia?: string;
  fotos?: string[];
  tecnicoAsignadoId?: number;
  tecnicoAsignadoNombre?: string;
  gestorAsignadorId?: number;
  gestorAsignadorNombre?: string;
  fechaAsignacion?: string;
}

export interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: 'imagen' | 'video' | 'documento';
  extension?: string;
  url: string;
  tamanio?: string;
  fechaSubida?: string;
}

export interface Incidente {
  id: number;
  codigoIncidente: string;
  maquina: string;
  agencia: string;
  fecha: string;
  tipo: 'Manguera dañada' | 'Falla eléctrica' | 'Problema hidráulico' | 'Fuga de agua' | 'Baja presión' | 'Desgaste' | 'Rotura de pieza' | string;
  prioridad: 'Alta' | 'Media' | 'Baja' | 'Crítica' | string;
  estado: 'Pendiente' | 'En Solución' | 'Solucionado' | 'Abierto' | 'En Revisión' | 'Resuelto' | string;
  descripcion: string;
  reportadoPor: string;

  tecnicoAsignadoId?: number;
  tecnicoAsignadoNombre?: string;
  gestorAsignadorId?: number;
  gestorAsignadorNombre?: string;
  fechaAsignacion?: string;

  // Evidencias del Fallo (Fotos y Videos al reportar)
  fotosFallo?: string[];
  videosFallo?: string[];
  archivosFallo?: ArchivoAdjunto[];

  // Evidencias de la Reparación / Solución (Fotos, Videos y Documentos al solucionar)
  fechaSolucion?: string;
  solucionadoPor?: string;
  observacionSolucion?: string;
  costoReparacion?: number;
  repuestosUtilizados?: string;
  fotosReparacion?: string[];
  videosReparacion?: string[];
  documentosReparacion?: ArchivoAdjunto[];
}

export interface Reporte {
  id: number;
  titulo: string;
  tipo: 'Diario' | 'Mensual' | 'Productividad' | 'Servicios Especiales' | string;
  agencia: string;
  fechaGeneracion: string;
  totalServicios: number;
  ingresosTotales: number;
  eficienciaGeneral: number;
}

// =========================================================================
// SERVICIOS EXTRAS
// =========================================================================

import { RecetaInsumoServicio } from './inventario.model';

/** Asignación de Servicio Extra a un Operador específico */
export interface ServicioExtra {
  id: number;
  codigoSE: string;                      // Ej: SE-2026-001
  servicioNombre: string;                // Nombre del servicio extra
  servicioDescripcion?: string;
  operadorId: number;
  operadorNombre: string;
  sucursales: string[];                  // Lista de sucursales asignadas
  insumosReceta: RecetaInsumoServicio[]; // Insumos y cantidades
  estado: 'Pendiente' | 'En Proceso' | 'Completado' | 'Cancelado';
  fechaProgramada: string;
  fechaCompletado?: string;
  notas?: string;
  creadoPor: string;
  fechaCreacion: string;
}


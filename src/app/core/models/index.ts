import { InsumoConsumidoServicio } from './inventario.model';
export * from './roles.model';
export * from './catalogo-servicio.model';
export * from './inventario.model';
export * from './reto.model';
export * from './notificacion.model';
export * from './dashboard.model';
export * from './maquinaria-trazabilidad.model';
import type { EvidenciaMaquinaria } from './maquinaria-trazabilidad.model';
export type ModalidadPulidor = 'FIJO' | 'MOVIL';

export interface Usuario {
  id: string | number;
  nombre: string;
  apellido: string;
  rol: 'SuperAdmin' | 'Gerente' | 'Supervisor' | 'Técnico' | 'OPERADOR' | string;
  rolNombre?: string;
  agencia: string;
  sucursal?: string;
  region?: string;
  estado: 'Activo' | 'Inactivo';
  fechaAsignacion?: string;
  email: string;
  avatar?: string;
  sucursalAsignada?: string;
  bahiaAsignada?: string;
  /** Solo operadores de servicios especiales (pulidores): fijo en sucursal o móvil entre sedes. */
  modalidadPulidor?: ModalidadPulidor;
  agenciaId?: string;
  regionId?: string;
  /** Bodega asignada (obligatoria para ASISTENTE_BODEGA → regional) */
  bodegaId?: string;
  roleId?: string;
  /** Servicios especiales asignados (pulidor móvil) */
  servicioIds?: number[];
}

export interface Sucursal {
  id: number | string;
  codigo?: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  estado: 'Activo' | 'Mantenimiento' | 'Inactivo' | string;
  cantidadBahias: number;
  maxLavadoresPorBahia?: number;
  responsable: string;
  liderOperador?: string;
  liderOperadorId?: string | number;
  liderOperadorNombre?: string;
  operadoresActivos?: number;
  maquinasAsignadasCount?: number;
  serviciosRealizadosMes?: number;
  /** % de servicios del mes finalizados o aprobados (lo calcula el servidor). */
  productividad?: number;
  regionId?: number | string;
  regionNombre?: string;
  region?: { id?: string | number; nombre?: string; [key: string]: any } | any;
  clienteId?: number | string;
  clienteNombre?: string;
  marcaId?: number | string;
  marcaNombre?: string;
  /** IDs del catálogo de servicios que esta sucursal ofrece. */
  servicioIds?: number[];
  /** Nombres denormalizados para listados. */
  serviciosNombres?: string[];
  telefono?: string;
  /** Si los servicios completados requieren aprobación gerencial antes del cierre diario. */
  requiereAprobacion?: boolean;
  /** ID del usuario con rol GERENTE asignado como aprobador de esta sucursal. */
  gerenteId?: number | string;
  /** Nombre denormalizado del gerente aprobador. */
  gerenteNombre?: string;
  /** Si la sucursal ofrece servicios especiales (pulido, cerámico, motor, etc.). */
  tieneServiciosEspeciales?: boolean;
}


export interface RegionOperativa {
  id: number | string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  responsable?: string;
  supervisorId?: string | number;
  estado: 'Activa' | 'Inactiva' | string;
}

export interface ClienteSucursal {
  id: number | string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  color: string;
  estado: 'Activa' | 'Inactiva' | string;
}

export type MarcaSucursal = ClienteSucursal;

export interface MovimientoRedSucursal {
  id: number | string;
  sucursalId: number | string;
  sucursalNombre: string;
  tipo: 'REGION' | 'CLIENTE' | 'MARCA';
  valorAnterior: string;
  valorNuevo: string;
  motivo: string;
  realizadoPor: string;
  fecha: string;
}

export interface Bahia {
  id: number | string;
  codigo: string;
  nombre: string;
  sucursalId?: number | string;
  sucursalNombre?: string;
  agenciaId?: string;
  agenciaNombre?: string;
  estado: 'Disponible' | 'Ocupada' | 'Mantenimiento' | 'Inactiva' | string;
  tipo?: string;
  vehiculoActual?: string;
  operadorAsignado?: string;
  operadorId?: number | string;
  maquinariaAsignada?: string[];
  /**
   * Estado real de ocupación reportado por el backend (fuente de verdad).
   * null = bahía disponible. No calcular esto en el cliente a partir de otras listas.
   */
  ocupada?: { placa: string; ordenTrabajoOT: string | null } | null;
  /** Máximo de lavadores simultáneos que la agencia permite por bahía (Agencia.maxLavadoresPorBahia). */
  maxLavadoresPorBahia?: number;
  /** Todos los lavadores con asignación ACTIVA a esta bahía (puede haber más de uno si el máximo > 1). */
  operadoresActivos?: Array<{ id: string; nombre: string }>;
}


export interface Operador {
  id: number | string;
  nombre: string;
  cedula: string;
  rol: 'OPERADOR' | string;
  sucursal: string;
  bahia: string;
  estado: 'Activo' | 'Inactivo' | 'En Capacitación' | string;
  fechaAsignacion: string;
  fechaCreacion?: string;
  fechaModificacion?: string;
  vehiculosAtendidos: number;
  serviciosRealizados: number;
  promedioDiario: number;
  ranking: number;
  email: string;
  avatar?: string;
  telefono?: string;
  sucursalId?: string | number;
  bahiaId?: string | null;
}

export interface HistorialAsignacionOperador {
  id: number | string;
  operadorId: number | string;
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
  id: number | string;
  nombre: string;
  ciudad: string;
  numeroBahias: number;
  empleados: number;
  productividad: number;
  estado: 'Operativa' | 'Capacidad Máxima' | 'Mantenimiento' | 'Inactiva' | string;
  direccion?: string;
  gerenteAsignado?: string;
  clienteId?: number | string;
  clienteNombre?: string;
  marcaId?: number | string;
  marcaNombre?: string;
}

export interface VehiculoServicio {
  id: number | string;
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
  bahiaId?: string;
  empleado: string;
  fecha: string;
  horaIngreso: string;
  horaSalida: string;
  estado: 'EN PROCESO' | 'FINALIZADO' | 'APROBADO' | 'RECHAZADO' | 'En Cola' | 'Entregado' | string;
  foto: string;
  fotos?: string[];
  fotoIngresoUrl?: string;
  fotoSalidaUrl?: string;
  video: string;
  videoUrl?: string;
  videoInicial?: string;
  videoInicialUrl?: string;
  videoFinal?: string;
  videoFinalUrl?: string;
  tiempoEstimadoMin?: number;
  duracionMin?: number;
  duracionMinutos?: number | null;
  duracionFormateada?: string;
  fechaInicio?: string;
  horaInicio?: string;
  fechaFin?: string;
  horaFin?: string;
  tiempoTranscurridoMin?: number;
  notas?: string;
  insumosUtilizados?: InsumoConsumidoServicio[];
  observacionGerente?: string;
  aprobadoPor?: string;
  /** ISO 8601 completo de la decisión (aprobar o rechazar). */
  fechaAprobacion?: string;
  /** TITULAR = decidió el aprobador de la agencia; RESPALDO = decidió un administrador o supervisor por no haber aprobador. */
  reglaDecision?: 'TITULAR' | 'RESPALDO' | string | null;
  motivoRechazo?: string | null;
  agenciaId?: string | null;
  /** Solo en servicios FINALIZADOS: el servidor dice si quien consulta puede aprobar o rechazar este servicio ahora. */
  puedeDecidir?: boolean;
  /** Solo en servicios FINALIZADOS: la agencia no tiene aprobador designado. */
  agenciaSinAprobador?: boolean;
  anuladoPorId?: string | null;
  anuladoEn?: string | null;
  motivoAnulacion?: string | null;
  servicios?: string[];
  regionNombre?: string;
  sucursalNombre?: string;
  documentos?: ArchivoAdjunto[];
}

export interface Maquinaria {
  id: number | string;
  codigo: string;
  nombre: string;
  tipo?: string;
  marca: string;
  modelo: string;
  numeroSerie?: string;
  agencia: string;
  bahia: string;
  sucursalId?: number | string;
  sucursalNombre?: string;
  bahiaId?: number | string;
  bahiaNombre?: string;
  operadorResponsable?: string;
  estado: 'Operativa' | 'Mantenimiento' | 'Dañada' | 'Fuera de Servicio' | 'Requiere Mantenimiento' | 'En Reparación' | string;
  fechaMantenimiento: string;
  fechaAsignacion?: string;
  imagen: string;
  fichaTecnicaUrl?: string;
  horasUso?: number;
  nivelPresionWaterBar?: number;
  // --- Trazabilidad ---
  /** false = dada de baja (reversible). */
  activa?: boolean;
  estadoOperativo?: 'OPERATIVA' | 'EN_MANTENIMIENTO' | 'DE_BAJA' | string;
  regionId?: string;
  agenciaTipo?: string;
  operadorAsignadoId?: string;
  operadorAsignadoNombre?: string;
  ventanaAdelantoDias?: number;
  incidentesNoAtendidos?: number;
  mantenimientosVencidos?: number;
  /** Fecha ISO del mantenimiento pendiente más próximo (el más cercano programado), o null si no hay ninguno programado. */
  proximoMantenimiento?: string | null;
}

export interface Mantenimiento {
  id: string | number;
  maquina: string;
  tipo: 'Preventivo' | 'Correctivo' | 'Calibración' | string;
  fecha: string;
  fechaInicio?: string;
  horaInicio?: string;
  fechaFin?: string;
  horaFin?: string;
  duracionMin?: number;
  tiempoTranscurridoMin?: number;
  tecnico: string;
  estado: 'Programado' | 'En Proceso' | 'Completado' | 'Cancelado' | string;
  descripcion: string;
  agencia?: string;
  fotos?: string[];
  videos?: string[];
  documentos?: ArchivoAdjunto[];
  archivos?: ArchivoAdjunto[];
  tecnicoAsignadoId?: string | number;
  tecnicoAsignadoNombre?: string;
  gestorAsignadorId?: string | number;
  gestorAsignadorNombre?: string;
  fechaAsignacion?: string;
  observacionCierre?: string;
  fechaCierre?: string;
  cerradoPor?: string;
  repuestosUtilizados?: string[];
  costoTotal?: number;
  maquinariaId?: string | number;
  tecnicoId?: string | number;
  frecuenciaDias?: number;
  proximoMantenimiento?: string;
  // --- Trazabilidad ---
  /** Fecha programada vencida y no finalizado: se muestra en rojo y primero. */
  noAtendido?: boolean;
  maquinariaCodigo?: string;
  regionId?: string;
  estadoRaw?: string;
  tipoRaw?: string;
  fechaProgramada?: string;
  /** Fecha y hora reales de ejecución (independiente de la programada). */
  fechaEjecucion?: string;
  creadoPorNombre?: string;
  ejecutadoPorNombre?: string;
  repuestosUsadosRaw?: any;
  evidencias?: EvidenciaMaquinaria[];
}

export const FRECUENCIAS_MANTENIMIENTO: { dias: number; label: string }[] = [
  { dias: 0, label: 'Única vez' },
  { dias: 7, label: 'Cada 7 días' },
  { dias: 15, label: 'Cada 15 días' },
  { dias: 30, label: 'Cada mes' },
  { dias: 60, label: 'Cada 2 meses' },
  { dias: 90, label: 'Cada 3 meses' },
  { dias: 180, label: 'Cada 6 meses' },
  { dias: 365, label: 'Cada año' },
];

export function etiquetaFrecuenciaMantenimiento(dias?: number | null): string {
  if (!dias) return 'Única vez';
  return FRECUENCIAS_MANTENIMIENTO.find(f => f.dias === dias)?.label || `Cada ${dias} días`;
}

export interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: 'imagen' | 'video' | 'documento';
  extension?: string;
  url: string;
  tamanio?: string;
  tamanoBytes?: number;
  fechaSubida?: string;
  s3Key?: string;
  file?: File;
}

export type EstadoEnvio = 'PENDIENTE' | 'ENVIADO' | 'RECIBIDO' | 'RECHAZADO';

export interface EnvioSuministroItem {
  productoId: number | string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
}

export interface EnvioSuministro {
  id: number | string;
  codigoEnvio: string;
  fecha: string;
  fechaEnvio?: string;
  fechaRecepcion?: string;
  fechaResolucion?: string;
  horaInicio?: string;
  horaFin?: string;
  horaResolucion?: string;
  duracionMin?: number;
  sucursalId?: number | string;
  sucursalNombre: string;
  ciudad: string;
  productos: EnvioSuministroItem[];
  responsableEnvio: string;
  responsableRecepcion?: string;
  estado: EstadoEnvio;
  observaciones?: string;
  motivoRechazo?: string;
  /** Solo true si el usuario actual es el receptor del destino */
  puedeConfirmar?: boolean;
}

export interface Incidente {
  id: string | number;
  codigoIncidente: string;
  maquina: string;
  /** Agencia del pulidor fijo dueño de la máquina, o "Pulidor Móvil" si el operador no tiene agencia fija. */
  agencia: string;
  esPulidorMovil?: boolean;
  fecha: string;
  tipo: 'Manguera dañada' | 'Falla eléctrica' | 'Problema hidráulico' | 'Fuga de agua' | 'Baja presión' | 'Desgaste' | 'Rotura de pieza' | string;
  prioridad: 'Alta' | 'Media' | 'Baja' | 'Crítica' | string;
  estado: 'Pendiente' | 'En Solución' | 'Solucionado' | 'Abierto' | 'En Revisión' | 'Resuelto' | string;
  descripcion: string;
  reportadoPor: string;

  tecnicoAsignadoId?: string | number;
  tecnicoAsignadoNombre?: string;
  gestorAsignadorId?: string | number;
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
  repuestosUtilizados?: string;
  fotosReparacion?: string[];
  videosReparacion?: string[];
  documentosReparacion?: ArchivoAdjunto[];

  // --- Trazabilidad ---
  /** Incidencia ABIERTA sin técnico asignado: se muestra en rojo y primero. */
  noAtendida?: boolean;
  maquinariaId?: string;
  maquinariaCodigo?: string;
  regionId?: string;
  titulo?: string;
  gravedadRaw?: string;
  estadoRaw?: string;
  destinoTallerNombre?: string;
  fechaReporteIso?: string;
  evidencias?: EvidenciaMaquinaria[];
}

export interface Reporte {
  id: number;
  titulo: string;
  tipo: 'Diario' | 'Mensual' | 'Productividad' | 'Servicios Especiales' | string;
  agencia: string;
  fechaGeneracion: string;
  totalServicios: number | null;
  /** Null cuando el servidor no calcula la eficiencia. */
  eficienciaGeneral: number | null;
}

// =========================================================================
// SERVICIOS EXTRAS
// =========================================================================

import { RecetaInsumoServicio } from './inventario.model';

/** Asignación de Servicio Extra a un Operador específico */
export interface ServicioExtra {
  id: number | string;
  codigoSE: string;                      // Ej: SE-2026-001
  servicioNombre: string;                // Nombre del servicio extra
  servicioDescripcion?: string;
  operadorId: number | string;
  operadorNombre: string;
  regionId?: string;
  regionNombre?: string;
  agenciaId?: string;
  agenciaNombre?: string;
  agencia?: {
    id?: string | number;
    nombre?: string;
    [key: string]: any;
  } | any;
  ordenTrabajoOT?: string;
  cliente?: string;
  clienteNombre?: string;
  bahiaId?: string;
  bahia?: string;
  horaIngreso?: string;
  horaEstimada?: string;
  horaSalida?: string;
  marca?: string;
  modelo?: string;
  color?: string;
  placa?: string;
  prioridad?: string;
  vehiculoInfo?: {
    placa?: string;
    marca?: string;
    modelo?: string;
    color?: string;
    cliente?: string;
  };
  videoInicialUrl?: string;
  videoFinalUrl?: string;
  calificacionCalidad?: number;
  sucursales: string[];                  // Lista de sucursales asignadas
  insumosReceta: RecetaInsumoServicio[]; // Insumos y cantidades
  estado: 'Pendiente' | 'En Proceso' | 'Pausado' | 'Completado' | 'Cancelado';
  fechaProgramada: string;
  fechaCompletado?: string;
  notas?: string;
  creadoPor: string;
  fechaCreacion: string;

  // Evidencias de Pausa y Reanudación y Tiempos Efectivos
  videoInicial?: string | null;
  videoFinal?: string | null;
  videoPausa?: string | null;
  videoReanudacion?: string | null;
  videoUltimaPausaUrl?: string | null;
  videoUltimaReanudacionUrl?: string | null;
  motivoUltimaPausa?: string | null;
  fechaUltimaPausa?: string | null;
  tiempoPausaTotalSeg?: number;
  tiempoPausaFormateado?: string;
  tiempoEfectivoSeg?: number | null;
  tiempoEfectivoFormateado?: string;
  /** Tiempo total = pausa + efectivo (fin - inicio). */
  tiempoTotalSeg?: number | null;
  tiempoTotalFormateado?: string;
  /** Fecha y hora exactas (ISO) de creación, inicio y fin del servicio. */
  createdAt?: string;
  fechaInicio?: string;
  fechaFin?: string;
  creadoPorNombre?: string;
  historialPausas?: any[];
}


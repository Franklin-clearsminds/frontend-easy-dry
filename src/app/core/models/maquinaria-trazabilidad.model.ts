// =========================================================
// EasyDry® - Modelos de trazabilidad de maquinaria
// (línea de tiempo, evidencias, ficha y respuestas paginadas)
// =========================================================

/** Respuesta estándar del backend para listas paginadas. */
export interface PaginaResultado<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type TipoEventoMaquinaria =
  | 'MAQUINA_CREADA'
  | 'MAQUINA_EDITADA'
  | 'MAQUINA_ACTIVADA'
  | 'MAQUINA_DESACTIVADA'
  | 'OPERADOR_ASIGNADO'
  | 'MOVIMIENTO'
  | 'INCIDENTE_REPORTADO'
  | 'INCIDENTE_ASIGNADO'
  | 'INCIDENTE_REPARADO'
  | 'INCIDENTE_CANCELADO'
  | 'INCIDENTE_EDITADO'
  | 'MANTENIMIENTO_PROGRAMADO'
  | 'MANTENIMIENTO_ASIGNADO'
  | 'MANTENIMIENTO_EJECUTADO'
  | 'MANTENIMIENTO_EDITADO'
  | 'EVIDENCIA_AGREGADA';

/** Catálogo de tipos de evento con etiqueta, color y grupo para la línea de tiempo. */
export const TIPOS_EVENTO_MAQUINARIA: { codigo: TipoEventoMaquinaria; label: string; grupo: string; color: string }[] = [
  { codigo: 'MAQUINA_CREADA', label: 'Máquina creada', grupo: 'Máquina', color: 'bg-easydry-blue' },
  { codigo: 'MAQUINA_EDITADA', label: 'Máquina editada', grupo: 'Máquina', color: 'bg-slate-500' },
  { codigo: 'MAQUINA_ACTIVADA', label: 'Máquina activada', grupo: 'Máquina', color: 'bg-emerald-500' },
  { codigo: 'MAQUINA_DESACTIVADA', label: 'Máquina dada de baja', grupo: 'Máquina', color: 'bg-rose-600' },
  { codigo: 'OPERADOR_ASIGNADO', label: 'Operador asignado', grupo: 'Máquina', color: 'bg-cyan-500' },
  { codigo: 'MOVIMIENTO', label: 'Movimiento', grupo: 'Ubicación', color: 'bg-indigo-500' },
  { codigo: 'INCIDENTE_REPORTADO', label: 'Incidencia reportada', grupo: 'Incidencias', color: 'bg-rose-500' },
  { codigo: 'INCIDENTE_ASIGNADO', label: 'Incidencia asignada', grupo: 'Incidencias', color: 'bg-violet-500' },
  { codigo: 'INCIDENTE_REPARADO', label: 'Incidencia reparada', grupo: 'Incidencias', color: 'bg-emerald-500' },
  { codigo: 'INCIDENTE_CANCELADO', label: 'Incidencia cancelada', grupo: 'Incidencias', color: 'bg-slate-500' },
  { codigo: 'INCIDENTE_EDITADO', label: 'Incidencia editada', grupo: 'Incidencias', color: 'bg-amber-500' },
  { codigo: 'MANTENIMIENTO_PROGRAMADO', label: 'Mantenimiento programado', grupo: 'Mantenimientos', color: 'bg-amber-500' },
  { codigo: 'MANTENIMIENTO_ASIGNADO', label: 'Mantenimiento asignado', grupo: 'Mantenimientos', color: 'bg-violet-500' },
  { codigo: 'MANTENIMIENTO_EJECUTADO', label: 'Mantenimiento ejecutado', grupo: 'Mantenimientos', color: 'bg-emerald-500' },
  { codigo: 'MANTENIMIENTO_EDITADO', label: 'Mantenimiento editado', grupo: 'Mantenimientos', color: 'bg-amber-500' },
  { codigo: 'EVIDENCIA_AGREGADA', label: 'Evidencia agregada', grupo: 'Evidencias', color: 'bg-teal-500' },
];

export function etiquetaEventoMaquinaria(tipo: string): string {
  return TIPOS_EVENTO_MAQUINARIA.find(t => t.codigo === tipo)?.label || tipo;
}

export function colorEventoMaquinaria(tipo: string): string {
  return TIPOS_EVENTO_MAQUINARIA.find(t => t.codigo === tipo)?.color || 'bg-slate-400';
}

export interface MaquinariaEventoActor {
  id: string;
  nombre: string;
  rol: string | null;
}

/** Evento inmutable de la línea de tiempo de una máquina. */
export interface MaquinariaEvento {
  id: string;
  tipo: TipoEventoMaquinaria | string;
  ocurridoEn: string;
  entidadId?: string | null;
  agenciaId?: string | null;
  regionId?: string | null;
  /** Carga variable según el tipo (cambios{campo:{antes,despues}}, motivo, origen/destino, etc.). */
  datos: Record<string, any> | null;
  actor: MaquinariaEventoActor | null;
}

export interface HistorialFiltro {
  maquinariaId: string;
  tipos?: string[];
  desde?: string;
  hasta?: string;
  actorId?: string;
  page?: number;
  pageSize?: number;
}

export interface PersonaResumen {
  id: string;
  nombre: string;
}

/** Evidencia (foto, video o PDF) asociada a una incidencia o mantenimiento. Nunca se borra. */
export interface EvidenciaMaquinaria {
  id: string;
  tipo: string;
  url: string;
  descripcion?: string;
  etapa?: 'REPORTE' | 'REPARACION' | 'EJECUCION' | string;
  mimeType?: string;
  tamanoBytes?: number;
  duracionSeg?: number | null;
  subidoPorId?: string;
  subidoPorNombre?: string;
  creadaEn?: string;
  /** Clasificación práctica para pintar la evidencia. */
  kind: 'FOTO' | 'VIDEO' | 'DOCUMENTO';
}

export interface ProximoMantenimiento {
  id: string;
  fechaProgramada: string | null;
  tipo: string;
  estado: string;
}

/** Ficha completa de una máquina (POST /maquinaria/detalle). */
export interface MaquinaFicha {
  id: string;
  codigo: string;
  nombre: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  estadoOperativo: 'OPERATIVA' | 'EN_MANTENIMIENTO' | 'DE_BAJA' | string;
  activa: boolean;
  fotoUrl?: string;
  fichaTecnicaUrl?: string;
  horasUso?: number;
  ventanaAdelantoDias: number;
  agenciaId?: string;
  agenciaNombre?: string;
  agenciaTipo?: string;
  regionId?: string;
  bahiaId?: string;
  bahiaNombre?: string;
  operadorAsignado?: PersonaResumen | null;
  creadoPor?: PersonaResumen | null;
  creadaEn?: string;
  desactivadoPor?: PersonaResumen | null;
  fechaDesactivacion?: string | null;
  motivoDesactivacion?: string | null;
  proximoMantenimiento?: ProximoMantenimiento | null;
  incidentesNoAtendidos: number;
  mantenimientosVencidos: number;
  totales: { incidentes: number; mantenimientos: number; movimientos: number };
  /** Agencia: miércoles y sábado. Pulidor: diaria. `regla` es null si la máquina no tiene ni agencia ni operador. */
  limpieza: { regla: 'AGENCIA' | 'PULIDOR' | null; ultimaFecha: string | null; ultimasFotos: string[]; atrasada: boolean };
}

/** Agencia con tipoUbicacion TALLER_* (destino válido de transferencia). */
export interface TallerUbicacion {
  id: string;
  codigo?: string;
  nombre: string;
  tipoUbicacion: string;
  regionId?: string | null;
}

export interface MovimientoMaquinariaDetalle {
  id: string;
  fecha: string;
  usuario: string;
  origenAgencia: string;
  origenBahia: string;
  destinoAgencia: string;
  destinoBahia: string;
  motivo: string;
}

/** Nombre completo a partir de un objeto usuario del backend ({name, lastname} o {nombre}). */
export function nombrePersona(u: any): string {
  if (!u) return '';
  if (typeof u === 'string') return u;
  return `${u.name || u.nombre || ''} ${u.lastname || u.apellido || ''}`.trim() || u.email || '';
}

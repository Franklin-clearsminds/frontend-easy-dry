/** Quiénes compiten en un reto. */
export type ParticipanteReto = 'AGENCIA' | 'BAHIA' | 'LAVADOR' | 'PULIDOR';
/** Qué servicios cuentan (ESPECIFICOS = los elegidos del catálogo). */
export type TipoServicioReto = 'TODOS' | 'GENERALES' | 'ESPECIALES' | 'ESPECIFICOS';
/** Qué se mide: cantidad de servicios, autos distintos (placas) o monto vendido. */
export type MetricaReto = 'SERVICIOS' | 'AUTOS' | 'MONTO';
/** Cómo se gana: los primeros N del ranking, o todos los que lleguen a una meta. */
export type ModoGanadorReto = 'RANKING' | 'META';

export interface GanadorReto {
  participanteId: string;
  nombre: string;
  valor: number;
  posicion: number;
}

export interface Reto {
  id: string;
  titulo: string;
  descripcion: string;
  premio: string;
  fechaInicio: string; // ISO string (YYYY-MM-DD)
  fechaFin: string;    // ISO string (YYYY-MM-DD)
  regiones: string[];  // Ej: ['Todas'] o ['Sierra', 'Costa']
  marcas: string[];    // Ej: ['Todas'] o ['EasyDry', 'EasyDry Premium']
  sucursalesIds: Array<string | number>;
  creadoPorId: string | number;
  creadorNombre: string;
  creadorRol: string;
  estado: 'ACTIVO' | 'FINALIZADO' | 'PENDIENTE' | 'INACTIVO';
  tipoReto: ParticipanteReto;
  tipoServicios: TipoServicioReto;
  metrica: MetricaReto;
  modoGanador: ModoGanadorReto;
  cantidadGanadores: number;
  meta: number | null;
  catalogoServicioIds: number[];
  catalogoServicioNombres: string[];
  pulidoresIds: string[];
  lavadoresIds: string[];
  ganadores: GanadorReto[];
  ganadorNombre?: string;
  resultado?: string;
  cerradoPorId?: string;
  cerradoEn?: string;
}

/** Lo que se envía al crear un reto. */
export interface NuevoReto {
  titulo: string;
  descripcion: string;
  premio: string;
  fechaInicio: string;
  fechaFin: string;
  regiones: string[];
  marcas: string[];
  sucursalesIds: string[];
  tipoReto: ParticipanteReto;
  tipoServicios: TipoServicioReto;
  catalogoServicioIds: number[];
  metrica: MetricaReto;
  modoGanador: ModoGanadorReto;
  cantidadGanadores?: number;
  meta?: number;
  pulidoresIds: string[];
  lavadoresIds: string[];
}

export interface FilaRankingReto {
  posicion: number;
  participanteId: string;
  nombre: string;
  detalle?: string;
  valor: number;
  /** Cuándo llegó a su valor: decide los empates (gana quien llegó primero). */
  alcanzadoEn: string | null;
  gana: boolean;
  /** Retos de bahías: quién hizo los servicios (servicios = cuántos) o, si aún no hay, quién está asignado (servicios = null). */
  personas?: Array<{ id: string; nombre: string; servicios: number | null }>;
}

export interface RankingReto {
  tipoReto: ParticipanteReto;
  metrica: MetricaReto;
  modoGanador: ModoGanadorReto;
  cantidadGanadores: number;
  meta: number | null;
  participantes: FilaRankingReto[];
}

/** Lavador o pulidor que se puede elegir como participante. */
export interface PersonaReto {
  id: string;
  nombre: string;
  regionNombre: string;
  agenciaId: string;
  agenciaNombre: string;
  clienteNombre: string;
}
/** @deprecated usar PersonaReto */
export type PulidorReto = PersonaReto;

export const ETIQUETA_PARTICIPANTE: Record<ParticipanteReto, { singular: string; plural: string; icono: string }> = {
  AGENCIA: { singular: 'Agencia', plural: 'Agencias', icono: 'building-2' },
  BAHIA: { singular: 'Bahía', plural: 'Bahías', icono: 'square-parking' },
  LAVADOR: { singular: 'Lavador', plural: 'Lavadores', icono: 'droplets' },
  PULIDOR: { singular: 'Pulidor', plural: 'Pulidores', icono: 'sparkles' },
};

export const ETIQUETA_TIPO_SERVICIO: Record<TipoServicioReto, string> = {
  TODOS: 'Todos los servicios',
  GENERALES: 'Servicios generales (lavado)',
  ESPECIALES: 'Servicios especiales',
  ESPECIFICOS: 'Servicios específicos',
};

/** Tipos de servicio que admite cada participante (lavadores: solo generales; pulidores: solo especiales). */
export const TIPOS_SERVICIO_POR_PARTICIPANTE: Record<ParticipanteReto, TipoServicioReto[]> = {
  AGENCIA: ['TODOS', 'GENERALES', 'ESPECIALES', 'ESPECIFICOS'],
  BAHIA: ['TODOS', 'GENERALES', 'ESPECIALES', 'ESPECIFICOS'],
  LAVADOR: ['GENERALES', 'ESPECIFICOS'],
  PULIDOR: ['ESPECIALES', 'ESPECIFICOS'],
};

export const ETIQUETA_METRICA: Record<MetricaReto, { nombre: string; unidad: string }> = {
  SERVICIOS: { nombre: 'Cantidad de servicios', unidad: 'servicios' },
  AUTOS: { nombre: 'Autos distintos atendidos', unidad: 'autos' },
  MONTO: { nombre: 'Monto vendido', unidad: 'USD' },
};

/** Valor de un reto con su unidad: "7 servicios", "3 autos", "$1.250,00". */
export function formatearValorReto(valor: number, metrica: MetricaReto): string {
  if (metrica === 'MONTO') {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(valor || 0);
  }
  const n = Math.round(valor || 0);
  const unidad = ETIQUETA_METRICA[metrica].unidad;
  return `${n} ${n === 1 ? unidad.replace(/s$/, '') : unidad}`;
}

/** Frase corta de cómo se gana: "Gana el 1.º" / "Ganan los 3 primeros" / "Meta: 20 servicios". */
export function resumenGanador(reto: Pick<Reto, 'modoGanador' | 'cantidadGanadores' | 'meta' | 'metrica'>): string {
  if (reto.modoGanador === 'META') {
    return `Ganan todos los que lleguen a ${formatearValorReto(reto.meta ?? 0, reto.metrica)}`;
  }
  return reto.cantidadGanadores > 1 ? `Ganan los ${reto.cantidadGanadores} primeros` : 'Gana el primer lugar';
}

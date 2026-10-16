/**
 * Modelos del módulo de Auditorías (informes de inspección y auditorías 5S). Reflejan lo que responde el servidor: el estado,
 * el resultado, el semáforo y lo que cada usuario puede hacer (`permisos`) se calculan allá y aquí solo se muestran.
 */

// ───────────────────────── Compartidos ─────────────────────────

export type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export const PRIORIDADES: { id: Prioridad; nombre: string }[] = [
  { id: 'BAJA', nombre: 'Baja' },
  { id: 'MEDIA', nombre: 'Media' },
  { id: 'ALTA', nombre: 'Alta' },
  { id: 'CRITICA', nombre: 'Crítica' },
];

/** `lider`: el líder de bahía de la agencia, para marcarlo solo al elegirla. */
export interface OpcionAgencia { id: string; codigo: string; nombre: string; lider?: { id: string; nombre: string } | null }
export interface OpcionPersona { id: string; nombre: string }

// ───────────────────────── Informes de inspección ─────────────────────────

export type EstadoInforme = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO' | 'CERRADO';
export type Calificacion = 'EXCELENTE' | 'BUENO' | 'REGULAR' | 'MALO';
export type EstadoPlan = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'VENCIDO' | 'CANCELADO';

export const ESTADOS_INFORME: { id: EstadoInforme; nombre: string; clase: string }[] = [
  { id: 'BORRADOR', nombre: 'Borrador', clase: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'EN_REVISION', nombre: 'En revisión', clase: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'APROBADO', nombre: 'Aprobado', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'RECHAZADO', nombre: 'Rechazado', clase: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'CERRADO', nombre: 'Cerrado', clase: 'bg-slate-800 text-white border-slate-800' },
];
export const CALIFICACIONES: { id: Calificacion; nombre: string; clase: string }[] = [
  { id: 'EXCELENTE', nombre: 'Excelente', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'BUENO', nombre: 'Bueno', clase: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'REGULAR', nombre: 'Regular', clase: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'MALO', nombre: 'Malo', clase: 'bg-rose-100 text-rose-800 border-rose-200' },
];
export const TIPOS_INSPECCION: { id: string; nombre: string }[] = [
  { id: 'RUTINA', nombre: 'Rutina' },
  { id: 'SEGUIMIENTO', nombre: 'Seguimiento' },
  { id: 'EXTRAORDINARIA', nombre: 'Extraordinaria' },
  { id: 'CIERRE_MENSUAL', nombre: 'Cierre mensual' },
  { id: 'APERTURA_AGENCIA', nombre: 'Apertura de agencia' },
  { id: 'CIERRE_AGENCIA', nombre: 'Cierre de agencia' },
  { id: 'NOVEDADES', nombre: 'Novedades' },
];
export const CATEGORIAS_NOVEDAD: { id: string; nombre: string }[] = [
  { id: 'INFRAESTRUCTURA', nombre: 'Infraestructura' },
  { id: 'MAQUINARIA', nombre: 'Maquinaria y equipos' },
  { id: 'INSUMOS', nombre: 'Insumos' },
  { id: 'LIMPIEZA', nombre: 'Limpieza y orden' },
  { id: 'SEGURIDAD', nombre: 'Seguridad' },
  { id: 'OPERACION', nombre: 'Operación' },
  { id: 'PERSONAL', nombre: 'Personal' },
  { id: 'OTROS', nombre: 'Otros' },
];
export const ESTADOS_NOVEDAD: { id: string; nombre: string }[] = [
  { id: 'ABIERTA', nombre: 'Abierta' },
  { id: 'EN_SEGUIMIENTO', nombre: 'En seguimiento' },
  { id: 'RESUELTA', nombre: 'Resuelta' },
];
export const ESTADOS_PLAN: { id: EstadoPlan; nombre: string; clase: string }[] = [
  { id: 'PENDIENTE', nombre: 'Pendiente', clase: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'EN_PROCESO', nombre: 'En proceso', clase: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'COMPLETADO', nombre: 'Completado', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'VENCIDO', nombre: 'Vencido', clase: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'CANCELADO', nombre: 'Cancelado', clase: 'bg-slate-100 text-slate-600 border-slate-200' },
];
export interface InformeFila {
  id: string;
  numero: string;
  numeroMensual: number;
  agenciaId: string;
  agenciaNombre: string;
  inspectorId: string;
  inspectorNombre: string;
  destinatarioNombre: string;
  fecha: string | null;
  fechaVisita: string | null;
  tipoInspeccion: string;
  asunto: string;
  estado: EstadoInforme;
  calificacion: Calificacion | null;
  totalNovedades: number;
  totalPlanes: number;
}

export interface Novedad {
  id?: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: Prioridad;
  area: string;
  fotos: string[];
  estadoSeguimiento: string;
  registradaEn?: string;
}

export interface Actividad {
  id?: string;
  nombre: string;
  descripcion: string;
  responsable: string;
  fecha: string | null;
  resultado: string;
  observaciones: string;
  fotos: string[];
}

export interface PlanAccion {
  id?: string;
  problema: string;
  accionRequerida: string;
  areaResponsable: string;
  personaResponsable: string;
  fechaCompromiso: string | null;
  prioridad: Prioridad;
  estado: EstadoPlan;
  estadoEfectivo?: EstadoPlan;
  observaciones: string;
  evidenciaCumplimiento: string[];
  completadoEn?: string | null;
}

export interface HistorialInforme {
  id: string;
  accion: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  usuarioNombre: string;
  rol: string;
  detalle: string | null;
  createdAt: string;
}

export interface PermisosInforme {
  puedeEditar: boolean;
  puedeEnviar: boolean;
  puedeCalificar: boolean;
  puedeRevisar: boolean;
  puedeReabrir: boolean;
  puedeCerrar: boolean;
  puedeEliminar: boolean;
  puedeSeguimiento: boolean;
}

export interface InformeDetalle {
  id: string;
  numero: string;
  numeroMensual: number;
  periodo: string;
  estado: EstadoInforme;
  agencia: OpcionAgencia;
  inspectorId: string;
  inspectorNombre: string;
  destinatarioId: string | null;
  destinatarioNombre: string;
  fecha: string;
  fechaVisita: string;
  tipoInspeccion: string;
  asunto: string;
  antecedentes: string;
  desarrollo: string;
  actividadesGeneral: string;
  planesGeneral: string;
  observacionesJefeTaller: string;
  calificacion: Calificacion | null;
  calificadoPorNombre: string | null;
  calificadoEn: string | null;
  motivoRechazo: string | null;
  enviadoEn: string | null;
  aprobadoEn: string | null;
  cerradoEn: string | null;
  createdAt: string;
  updatedAt: string;
  novedades: Novedad[];
  actividades: Actividad[];
  planes: PlanAccion[];
  historial: HistorialInforme[];
  permisos: PermisosInforme;
}

/** Lo que el formulario manda al guardar. */
export interface GuardarInforme {
  id?: string;
  agenciaId: string;
  destinatarioId?: string;
  destinatarioNombre?: string;
  fecha?: string;
  fechaVisita?: string;
  tipoInspeccion?: string;
  asunto?: string;
  antecedentes?: string;
  desarrollo?: string;
  actividadesGeneral?: string;
  planesGeneral?: string;
  observacionesJefeTaller?: string;
  calificacion?: Calificacion;
  novedades?: Novedad[];
  actividades?: Actividad[];
  planes?: PlanAccion[];
}

export interface ResumenInformes {
  total: number;
  esteMes: number;
  pendientesAprobacion: number;
  aprobados: number;
  planesPendientes: number;
  planesVencidos: number;
  porEstado: { estado: EstadoInforme; total: number }[];
  porCalificacion: { calificacion: Calificacion; total: number }[];
  porAgencia: { agenciaId: string; agenciaNombre: string; total: number; promedio: number | null }[];
  porPeriodo: { periodo: string; total: number }[];
  recientes: InformeFila[];
  proximosPlanes: {
    id: string;
    informeId: string;
    informeNumero: string;
    agenciaNombre: string;
    problema: string;
    prioridad: Prioridad;
    estado: EstadoPlan;
    fechaCompromiso: string | null;
    personaResponsable: string;
  }[];
}

export interface OpcionesInformes { agencias: OpcionAgencia[]; responsables: OpcionPersona[] }
export interface Destinatario { id: string; nombre: string; cargo: string; rol: string; agenciaId: string | null }

// ───────────────────────── Auditoría 5S ─────────────────────────

export type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO';
export type EstadoAuditoria5s = 'BORRADOR' | 'EN_PROCESO' | 'FINALIZADA' | 'CERRADA';
export type EstadoAccion = 'PENDIENTE' | 'EN_PROCESO' | 'EN_VERIFICACION' | 'CERRADA' | 'VENCIDA';
export type CategoriaId = 'SEIRI' | 'SEITON' | 'SEISO' | 'SEIKETSU' | 'SHITSUKE';

const JAPONES_5S: Record<CategoriaId, string> = { SEIRI: 'Seiri', SEITON: 'Seiton', SEISO: 'Seiso', SEIKETSU: 'Seiketsu', SHITSUKE: 'Shitsuke' };
/**
 * Nombre de una S en las dos lenguas: «Clasificar / Seiri». Según el formato de la auditoría, el catálogo trae el nombre en español
 * (con la explicación en `traduccion`) o el japonés (con el español en `traduccion`): se resuelve aquí para mostrar siempre los dos.
 */
export function nombre5s(c: { id: CategoriaId; nombre: string; traduccion: string }): string {
  const japones = JAPONES_5S[c.id];
  const espanol = c.nombre === japones ? c.traduccion : c.nombre;
  return `${espanol} / ${japones}`;
}


export const ESTADOS_AUDITORIA_5S: { id: EstadoAuditoria5s; nombre: string; clase: string }[] = [
  { id: 'BORRADOR', nombre: 'Borrador', clase: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'EN_PROCESO', nombre: 'En proceso', clase: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'FINALIZADA', nombre: 'Finalizada', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'CERRADA', nombre: 'Cerrada', clase: 'bg-slate-800 text-white border-slate-800' },
];
export const ESTADOS_ACCION: { id: EstadoAccion; nombre: string; clase: string }[] = [
  { id: 'PENDIENTE', nombre: 'Pendiente', clase: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'EN_PROCESO', nombre: 'En proceso', clase: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'EN_VERIFICACION', nombre: 'En verificación', clase: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'CERRADA', nombre: 'Cerrada', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'VENCIDA', nombre: 'Vencida', clase: 'bg-rose-100 text-rose-800 border-rose-200' },
];

/** El verde, amarillo y rojo se reservan para comunicar resultados. */
export const SEMAFORO: Record<Semaforo, { nombre: string; fondo: string; texto: string; borde: string; punto: string; hex: string }> = {
  VERDE: { nombre: 'Verde', fondo: 'bg-emerald-100', texto: 'text-emerald-800', borde: 'border-emerald-300', punto: 'bg-emerald-500', hex: '#10b981' },
  AMARILLO: { nombre: 'Amarillo', fondo: 'bg-amber-100', texto: 'text-amber-800', borde: 'border-amber-300', punto: 'bg-amber-400', hex: '#f59e0b' },
  ROJO: { nombre: 'Rojo', fondo: 'bg-rose-100', texto: 'text-rose-800', borde: 'border-rose-300', punto: 'bg-rose-500', hex: '#f43f5e' },
};

export type FormatoId = 'LISTA_20' | 'PUNTOS_25' | 'SI_NO_50';
export const FORMATOS_ETIQUETA: Record<FormatoId, { corto: string; largo: string }> = {
  LISTA_20: { corto: 'Lista 20', largo: 'Check list 5S — área de lavado (20 criterios)' },
  PUNTOS_25: { corto: '25 criterios', largo: 'Auditoría 5S (25 criterios, 0 a 4)' },
  SI_NO_50: { corto: 'SI / NO', largo: 'Cuestionario 5S SI / NO (50 preguntas)' },
};

export interface Criterio5sCatalogo { numero: number; categoria: CategoriaId; descripcion: string; favorable?: 'SI' | 'NO' }
export interface Categoria5sCatalogo { id: CategoriaId; nombre: string; traduccion: string; maximo: number; criterios: Criterio5sCatalogo[] }
export interface Formato5sCatalogo {
  id: FormatoId;
  nombre: string;
  descripcion: string;
  /** PUNTAJE: valor de 0 a maxCriterio. SI_NO: se guarda 1 (SI) o 0 (NO). */
  tipo: 'PUNTAJE' | 'SI_NO';
  maxCriterio: number;
  escala: { valor: number; descripcion: string }[];
  nota: string | null;
  puntajeMaximo: number;
  categorias: Categoria5sCatalogo[];
}
export interface Catalogo5s {
  areas: { id: string; nombre: string }[];
  formatos: Formato5sCatalogo[];
  semaforo: { id: Semaforo; regla: string }[];
}

export interface Auditoria5sFila {
  id: string;
  codigo: string;
  formato: FormatoId;
  formatoNombre: string;
  grupoId: string | null;
  agenciaId: string;
  agenciaNombre: string;
  auditorId: string;
  auditorNombre: string;
  area: string;
  areaNombre: string;
  fecha: string | null;
  estado: EstadoAuditoria5s;
  puntaje: number | null;
  puntajeMaximo: number;
  porcentaje: number | null;
  semaforo: Semaforo | null;
  evaluados: number;
  totalCriterios: number;
  accionesAbiertas: number;
  accionesTotal: number;
}

export interface CriterioEvaluado {
  numero: number;
  categoria: CategoriaId;
  descripcion: string;
  favorable: 'SI' | 'NO' | null;
  puntajeMaximo: number;
  /** Lo guardado: el puntaje; en SI/NO, 1 = SI y 0 = NO. */
  puntaje: number | null;
  /** Lo que vale para el cálculo (en SI/NO, 1 si la respuesta es la favorable). */
  puntajeEfectivo: number | null;
  cumple: boolean | null;
  hallazgo: string;
  observaciones: string;
  accionCorrectiva: string;
  responsable: string;
  fechaCompromiso: string | null;
  fotos: string[];
  estadoAccion: EstadoAccion | null;
}

export interface ResultadoAuditoria5s {
  evaluados: number;
  total: number;
  puntaje: number;
  puntajeMaximo: number;
  porcentaje: number;
  semaforo: Semaforo;
  completa: boolean;
  porCategoria: { categoria: CategoriaId; nombre: string; traduccion: string; puntaje: number; maximo: number; evaluados: number; noConformes: number }[];
}

export interface AccionCorrectiva {
  id: string;
  codigo: string;
  auditoriaId: string;
  criterio: number;
  categoria: CategoriaId | null;
  criterioDescripcion: string;
  hallazgo: string;
  accion: string;
  responsable: string;
  fechaCompromiso: string | null;
  prioridad: Prioridad;
  estado: EstadoAccion;
  estadoEfectivo: EstadoAccion;
  evidenciaInicial: string[];
  evidenciaCorreccion: string[];
  observaciones: string;
  cerradaEn: string | null;
  verificadaPorNombre: string | null;
  auditoriaCodigo?: string;
  areaNombre?: string;
  agenciaNombre?: string;
}

export interface PermisosAuditoria5s {
  puedeEditar: boolean;
  puedeFinalizar: boolean;
  puedeEliminar: boolean;
  puedeCerrar: boolean;
  puedeSeguimiento: boolean;
  puedeVerificar: boolean;
}

export interface Auditoria5sDetalle {
  id: string;
  codigo: string;
  estado: EstadoAuditoria5s;
  formato: FormatoId;
  formatoNombre: string;
  grupoId: string | null;
  /** Las auditorías de la misma visita (cada formato se guarda por separado). */
  hermanas: { id: string; codigo: string; formato: FormatoId; formatoNombre: string; estado: EstadoAuditoria5s }[];
  agencia: OpcionAgencia;
  auditorId: string;
  auditorNombre: string;
  responsableAgencia: string;
  equipoPersona: string;
  area: string;
  areaNombre: string;
  fecha: string;
  comentarios: string;
  comentariosCategoria: Record<string, string>;
  finalizadaEn: string | null;
  cerradaEn: string | null;
  anterior: { id: string; codigo: string; fecha: string | null; puntaje: number | null; porcentaje: number | null; semaforo: Semaforo | null; diferencia: number | null } | null;
  resultado: ResultadoAuditoria5s;
  criterios: CriterioEvaluado[];
  acciones: AccionCorrectiva[];
  historial: HistorialInforme[];
  permisos: PermisosAuditoria5s;
}

export interface GuardarAuditoria5s {
  id?: string;
  agenciaId: string;
  area?: string;
  /** Solo al crear: los formatos de esta visita; cada uno se guarda como una auditoría aparte. */
  formatos?: FormatoId[];
  fecha?: string;
  responsableAgencia?: string;
  equipoPersona?: string;
  comentarios?: string;
  comentariosCategoria?: Record<string, string>;
  respuestas?: {
    criterio: number;
    puntaje: number | null;
    hallazgo?: string;
    observaciones?: string;
    accionCorrectiva?: string;
    responsable?: string;
    fechaCompromiso?: string | null;
    fotos?: string[];
  }[];
}

export interface Resumen5s {
  total: number;
  realizadas: number;
  delMes: number;
  promedioGeneral: number | null;
  agenciasVerde: number;
  agenciasAmarillo: number;
  agenciasRojo: number;
  accionesPendientes: number;
  accionesVencidas: number;
  porAgencia: { agenciaId: string; agenciaNombre: string; porcentaje: number; semaforo: Semaforo }[];
  evolucion: { periodo: string; auditorias: number; promedio: number | null }[];
  porS: { categoria: CategoriaId; nombre: string; traduccion: string; porcentaje: number }[];
}

export interface Opciones5s { agencias: OpcionAgencia[]; auditores: OpcionPersona[] }

export interface FilaComparacion {
  id: string;
  codigo: string;
  fecha: string;
  auditorNombre: string;
  puntaje: number;
  porcentaje: number;
  semaforo: Semaforo;
  variacion: number | null;
  porCategoria: { categoria: CategoriaId; nombre: string; puntaje: number; maximo: number }[];
  puntajeMaximo: number;
  accionesAbiertas: number;
  accionesCerradas: number;
}

/** Mensaje legible de un error HTTP del servidor. */
export function mensajeError(err: unknown, porDefecto = 'No se pudo completar la acción.'): string {
  const e = err as { error?: { message?: string | string[] }; message?: string } | undefined;
  const detalle = e?.error?.message;
  if (Array.isArray(detalle)) return detalle.join('. ');
  return detalle || e?.message || porDefecto;
}

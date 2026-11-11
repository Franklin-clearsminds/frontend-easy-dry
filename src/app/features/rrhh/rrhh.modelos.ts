/**
 * RRHH · reglas puras de las pantallas (sin servidor): agrupar las timbradas por día, tipo de archivo y límites de los adjuntos.
 * Las reglas que deciden de verdad (hora de Ecuador, entrada o salida, distancia, precisión) viven en el backend.
 */
import type { DiaHorario, EstadoDia, EvaluacionDiaApi, SemanaHorario, TimbradaApi } from '../../core/services/rrhh.service';

export type TipoAdjunto = 'imagen' | 'video' | 'documento';

export const MAX_ADJUNTOS = 5;
export const MAX_ADJUNTO_BYTES = 10 * 1024 * 1024;
/** Formatos que el servidor acepta como evidencia de una tarea. */
export const ACEPTA_ADJUNTOS = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,application/pdf';

/** Zona horaria de las marcas: así se ven iguales en cualquier computadora. */
export const ZONA_ECUADOR = '-0500';

export interface DiaTimbrado {
  dia: string;
  userId: string;
  persona: string;
  entrada: TimbradaApi | null;
  salida: TimbradaApi | null;
  /** Horas trabajadas con entrada y salida; null si el día está incompleto. */
  horas: number | null;
  incompleto: boolean;
}

/** Horas entre dos instantes (con dos decimales); null si la salida no es posterior. */
export function horasEntre(entrada: string, salida: string): number | null {
  const h = (new Date(salida).getTime() - new Date(entrada).getTime()) / 3_600_000;
  return h > 0 ? Math.round(h * 100) / 100 : null;
}

/** Agrupa las timbradas por persona y día; el día con una sola marca queda «incompleto». */
export function agruparPorDia(timbradas: readonly TimbradaApi[]): DiaTimbrado[] {
  const dias = new Map<string, DiaTimbrado>();
  for (const t of timbradas) {
    const clave = `${t.userId}|${t.dia}`;
    const d = dias.get(clave) ?? { dia: t.dia, userId: t.userId, persona: t.persona, entrada: null, salida: null, horas: null, incompleto: true };
    if (t.tipo === 'ENTRADA') d.entrada = t;
    else d.salida = t;
    dias.set(clave, d);
  }
  return [...dias.values()]
    .map((d) => ({ ...d, horas: d.entrada && d.salida ? horasEntre(d.entrada.marcadaEn, d.salida.marcadaEn) : null, incompleto: !(d.entrada && d.salida) }))
    .sort((a, b) => b.dia.localeCompare(a.dia) || a.persona.localeCompare(b.persona));
}

/** Tipo de archivo a partir de su tipo MIME. */
export function tipoAdjuntoDe(mime: string): TipoAdjunto {
  if (mime.startsWith('image/')) return 'imagen';
  if (mime.startsWith('video/')) return 'video';
  return 'documento';
}

/** Tipo de evidencia que entiende el almacenamiento, según el archivo. */
export function tipoEvidenciaDe(mime: string): 'FOTO_TAREA' | 'VIDEO_TAREA' | 'DOCUMENTO_TAREA' {
  if (mime.startsWith('image/')) return 'FOTO_TAREA';
  if (mime.startsWith('video/')) return 'VIDEO_TAREA';
  return 'DOCUMENTO_TAREA';
}

const FORMATOS_ACEPTADOS = new Set(ACEPTA_ADJUNTOS.split(','));

/** Motivo por el que un archivo no se puede agregar, o null si es válido. */
export function motivoAdjuntoInvalido(archivo: { size: number; type: string }, cantidadActual: number): string | null {
  if (cantidadActual >= MAX_ADJUNTOS) return `Máximo ${MAX_ADJUNTOS} archivos.`;
  if (!FORMATOS_ACEPTADOS.has(archivo.type)) return 'Formato no permitido. Usa JPG, PNG, WEBP, MP4, MOV o PDF.';
  if (archivo.size > MAX_ADJUNTO_BYTES) return `Cada archivo pesa hasta ${MAX_ADJUNTO_BYTES / 1024 / 1024} MB.`;
  return null;
}

export const ESTADOS_TAREA: { id: 'PENDIENTE' | 'COMPLETADA' | 'REVISADA' | 'CANCELADA'; nombre: string; clase: string }[] = [
  { id: 'PENDIENTE', nombre: 'Pendiente', clase: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'COMPLETADA', nombre: 'Completada', clase: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'REVISADA', nombre: 'Revisada', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'CANCELADA', nombre: 'Cancelada', clase: 'bg-slate-100 text-slate-600 border-slate-200' },
];

export const ETIQUETA_EVENTO: Record<string, string> = {
  ASIGNADA: 'Asignada',
  COMPLETADA: 'Completada',
  REVISADA: 'Revisada',
  DEVUELTA: 'Devuelta a pendiente',
  CANCELADA: 'Cancelada',
  REASIGNADA: 'Reasignada',
};

export const ETIQUETA_VERIFICACION: Record<string, string> = {
  VERIFICADA: 'Dentro del radio',
  SIN_VERIFICAR: 'Solo foto',
  SIN_REFERENCIA: 'Sin ubicación de referencia',
};

// ───────────────────────── Horarios ─────────────────────────

export const NOMBRES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
const ABREVIATURA_DIA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

/** Horario con el que parte todo el personal: 08:00 a 15:00 los siete días. */
export const HORARIO_POR_DEFECTO: SemanaHorario = Array.from({ length: 7 }, () => ({ trabaja: true, entrada: '08:00', salida: '15:00' }));

export const copiarSemana = (s: SemanaHorario): SemanaHorario => s.map((d) => ({ ...d }));

/** ¿Son iguales dos semanas? Un día libre no se compara por sus horas. */
export function semanasIguales(a: SemanaHorario, b: SemanaHorario): boolean {
  return a.length === b.length && a.every((d, i) => d.trabaja === b[i].trabaja && (!d.trabaja || (d.entrada === b[i].entrada && d.salida === b[i].salida)));
}

/** Primer problema de una semana (o null si está bien): igual de estricto que el servidor para avisar antes de enviar. */
export function problemaDeSemana(semana: SemanaHorario): string | null {
  for (let i = 0; i < semana.length; i++) {
    const d = semana[i];
    if (!d.trabaja) continue;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.entrada) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.salida)) return `${NOMBRES_DIA[i]}: escribe la entrada y la salida.`;
    if (d.entrada >= d.salida) return `${NOMBRES_DIA[i]}: la salida debe ser posterior a la entrada (no se admiten turnos que cruzan la medianoche).`;
  }
  return null;
}

/** La semana en pocas líneas: los días seguidos con el mismo horario se juntan («Lun a Vie · 08:00–15:00»). */
export function resumenSemana(semana: SemanaHorario): string[] {
  const clave = (d: DiaHorario) => (d.trabaja ? `${d.entrada}–${d.salida}` : 'Libre');
  const grupos: { desde: number; hasta: number; texto: string }[] = [];
  semana.forEach((d, i) => {
    const texto = clave(d);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.texto === texto) ultimo.hasta = i;
    else grupos.push({ desde: i, hasta: i, texto });
  });
  return grupos.map((g) => `${g.desde === g.hasta ? ABREVIATURA_DIA[g.desde] : `${ABREVIATURA_DIA[g.desde]} a ${ABREVIATURA_DIA[g.hasta]}`} · ${g.texto}`);
}

export const ETIQUETA_ESTADO_DIA: Record<EstadoDia, { nombre: string; clase: string }> = {
  CUMPLE: { nombre: 'Cumple', clase: 'badge-ok' },
  ATRASO: { nombre: 'Atraso', clase: 'badge-warn' },
  ENTRADA_TEMPRANA: { nombre: 'Entrada temprana', clase: 'badge-info' },
  SALIDA_ANTICIPADA: { nombre: 'Salida anticipada', clase: 'badge-warn' },
  SALIDA_TARDIA: { nombre: 'Salida tardía', clase: 'badge-info' },
  INCOMPLETO: { nombre: 'Incompleto', clase: 'badge-warn' },
  SIN_MARCA: { nombre: 'Sin marca', clase: 'badge-danger' },
  DIA_LIBRE: { nombre: 'Día libre', clase: 'badge-neutral' },
  PENDIENTE: { nombre: 'Pendiente', clase: 'badge-neutral' },
  EN_CURSO: { nombre: 'En curso', clase: 'badge-neutral' },
  SIN_HORARIO: { nombre: 'Sin horario', clase: 'badge-neutral' },
};

/** Estados que merecen atención (los demás son normales o aún no se pueden juzgar). */
export const ESTADOS_NOVEDAD: ReadonlySet<EstadoDia> = new Set<EstadoDia>(['ATRASO', 'ENTRADA_TEMPRANA', 'SALIDA_ANTICIPADA', 'SALIDA_TARDIA', 'INCOMPLETO', 'SIN_MARCA']);

/** «+40 min», «−5 min» o «a tiempo» (dentro de la tolerancia, o sin dato). */
export function textoMinutos(min: number | null, toleranciaMin: number): string {
  if (min === null) return '';
  if (Math.abs(min) <= toleranciaMin) return 'a tiempo';
  return `${min > 0 ? '+' : '−'}${Math.abs(min)} min`;
}

/** Un día evaluado, con las marcas del día para poder ver sus fotos. */
export interface FilaDia extends EvaluacionDiaApi {
  persona: string;
  entrada: TimbradaApi | null;
  salida: TimbradaApi | null;
}

/** Une la evaluación de cada día con las marcas de esa persona y día; del día más reciente al más antiguo. */
export function filasDelRango(evaluacion: readonly EvaluacionDiaApi[], marcas: readonly TimbradaApi[], nombres: ReadonlyMap<string, string>): FilaDia[] {
  const porClave = new Map<string, { entrada: TimbradaApi | null; salida: TimbradaApi | null }>();
  for (const m of marcas) {
    const k = `${m.userId}|${m.dia}`;
    const c = porClave.get(k) ?? { entrada: null, salida: null };
    if (m.tipo === 'ENTRADA') c.entrada = m; else c.salida = m;
    porClave.set(k, c);
  }
  return evaluacion
    .map((e) => ({ ...e, persona: nombres.get(e.userId) ?? '', ...(porClave.get(`${e.userId}|${e.dia}`) ?? { entrada: null, salida: null }) }))
    .sort((a, b) => b.dia.localeCompare(a.dia) || a.persona.localeCompare(b.persona));
}

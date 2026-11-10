/**
 * RRHH · reglas puras de las pantallas (sin servidor): agrupar las timbradas por día, tipo de archivo y límites de los adjuntos.
 * Las reglas que deciden de verdad (hora de Ecuador, entrada o salida, distancia, precisión) viven en el backend.
 */
import type { TimbradaApi } from '../../core/services/rrhh.service';

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

/**
 * RRHH · prototipo. Tipos y reglas puras del módulo (sin datos ni servidor): tareas y timbradas.
 * Todo lo que usa la pantalla vive en memoria (ver `rrhh-mock.service.ts`); estas funciones no dependen de eso.
 */

export type EstadoTarea = 'PENDIENTE' | 'COMPLETADA' | 'REVISADA' | 'CANCELADA';
export type TipoAdjunto = 'imagen' | 'video' | 'documento';

export interface AdjuntoMock {
  id: string;
  nombre: string;
  tipo: TipoAdjunto;
  /** URL para previsualizar (archivo elegido o imagen de muestra). Vacía en los archivos de ejemplo sin contenido. */
  url: string;
  tamano: number;
}

export interface EventoTarea {
  accion: 'ASIGNADA' | 'COMPLETADA' | 'REVISADA' | 'DEVUELTA' | 'CANCELADA';
  /** ISO con fecha y hora. */
  fecha: string;
  detalle?: string;
}

export interface TareaMock {
  id: string;
  titulo: string;
  descripcion: string;
  operadorId: string;
  /** AAAA-MM-DD; opcional. */
  fechaLimite: string | null;
  estado: EstadoTarea;
  adjuntos: AdjuntoMock[];
  respuesta: string;
  evidencias: AdjuntoMock[];
  asignadaEn: string;
  completadaEn: string | null;
  revisadaEn: string | null;
  canceladaEn: string | null;
  motivoDevolucion: string;
  motivoCancelacion: string;
  historial: EventoTarea[];
  /** Si la tarea nació de la novedad de un informe: de cuál. */
  origen?: { informeId: string; informeNumero: string; novedadId: string; novedadTitulo: string };
}

export type TipoAvisoTarea = 'ASIGNADA' | 'COMPLETADA' | 'REVISADA' | 'DEVUELTA' | 'CANCELADA' | 'INFORME';

/** Aviso del módulo. Sin backend se muestra en una lista propia: el destinatario dice a quién le llegaría. */
export interface AvisoMock {
  id: string;
  tipo: TipoAvisoTarea;
  titulo: string;
  mensaje: string;
  destinatario: string;
  tareaId: string;
  fecha: string;
  leida: boolean;
  /** Ruta que abre el informe de origen (avisos que nacen de un informe). */
  enlace?: string;
}

export interface AgenciaMock {
  id: string;
  nombre: string;
  /** Ubicación de ejemplo de la agencia (no sale de la base). */
  lat: number;
  lng: number;
}

export interface OperadorMock {
  id: string;
  nombre: string;
  cargo: string;
  agenciaId: string;
}

export type TipoMarca = 'ENTRADA' | 'SALIDA';

export interface TimbradaMock {
  id: string;
  operadorId: string;
  agenciaId: string;
  /** AAAA-MM-DD */
  fecha: string;
  /** HH:mm */
  hora: string;
  tipo: TipoMarca;
  distanciaM: number;
  /** Foto tomada al timbrar (data URL). */
  foto: string;
}

export interface DiaTimbrado {
  fecha: string;
  operadorId: string;
  entrada: TimbradaMock | null;
  salida: TimbradaMock | null;
  /** Horas trabajadas con entrada y salida; null si el día está incompleto. */
  horas: number | null;
  incompleto: boolean;
}

export const RADIO_TIMBRADA_M = 100;
export const HORA_CAMBIO_MARCA = 12;
export const MAX_ADJUNTOS = 5;
export const MAX_ADJUNTO_BYTES = 10 * 1024 * 1024;

/** Distancia en metros entre dos puntos (fórmula de Haversine). */
export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Antes de las 12:00 la marca es entrada; desde las 12:00, salida. */
export function tipoMarcaPorHora(hora: number): TipoMarca {
  return hora < HORA_CAMBIO_MARCA ? 'ENTRADA' : 'SALIDA';
}

const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Horas entre una entrada y una salida «HH:mm» (con dos decimales); null si la salida no es posterior. */
export function horasTrabajadas(entrada: string, salida: string): number | null {
  const min = aMinutos(salida) - aMinutos(entrada);
  return min > 0 ? Math.round((min / 60) * 100) / 100 : null;
}

/** Una tarea pendiente con fecha límite anterior a hoy está vencida (no es un estado guardado: se calcula). */
export function estaVencida(t: Pick<TareaMock, 'estado' | 'fechaLimite'>, hoy: string): boolean {
  return t.estado === 'PENDIENTE' && !!t.fechaLimite && t.fechaLimite < hoy;
}

/** Agrupa las timbradas por operador y día; el día con una sola marca queda «incompleto». */
export function agruparPorDia(timbradas: readonly TimbradaMock[]): DiaTimbrado[] {
  const dias = new Map<string, DiaTimbrado>();
  for (const t of timbradas) {
    const clave = `${t.operadorId}|${t.fecha}`;
    const dia = dias.get(clave) ?? { fecha: t.fecha, operadorId: t.operadorId, entrada: null, salida: null, horas: null, incompleto: true };
    if (t.tipo === 'ENTRADA') dia.entrada = t;
    else dia.salida = t;
    dias.set(clave, dia);
  }
  return [...dias.values()]
    .map((d) => {
      const horas = d.entrada && d.salida ? horasTrabajadas(d.entrada.hora, d.salida.hora) : null;
      return { ...d, horas, incompleto: !(d.entrada && d.salida) };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.operadorId.localeCompare(b.operadorId));
}

/** Tipo de archivo a partir de su tipo MIME. */
export function tipoAdjuntoDe(mime: string): TipoAdjunto {
  if (mime.startsWith('image/')) return 'imagen';
  if (mime.startsWith('video/')) return 'video';
  return 'documento';
}

/** Motivo por el que un archivo no se puede agregar, o null si es válido. */
export function motivoAdjuntoInvalido(archivo: { size: number; type: string }, cantidadActual: number): string | null {
  if (cantidadActual >= MAX_ADJUNTOS) return `Máximo ${MAX_ADJUNTOS} archivos.`;
  if (archivo.size > MAX_ADJUNTO_BYTES) return `Cada archivo pesa hasta ${MAX_ADJUNTO_BYTES / 1024 / 1024} MB.`;
  return null;
}

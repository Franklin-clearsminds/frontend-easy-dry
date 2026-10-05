/**
 * Mapa único de colores de estado. Un mismo significado tiene siempre el mismo color en toda la web.
 *
 * Uso en plantillas:   <span [class]="badgeClase('incidente', inc.estadoRaw)">{{ inc.estado }}</span>
 * Las clases `badge-*` están definidas en `src/styles.css`.
 */

export type BadgeTono = 'ok' | 'info' | 'warn' | 'high' | 'danger' | 'critical' | 'neutral';
export type BadgeTipo = 'maquina' | 'gravedad' | 'incidente' | 'mantenimiento';

const CLASE_POR_TONO: Record<BadgeTono, string> = {
  ok: 'badge-ok',
  info: 'badge-info',
  warn: 'badge-warn',
  high: 'badge-high',
  danger: 'badge-danger',
  critical: 'badge-critical',
  neutral: 'badge-neutral',
};

/** Mayúsculas, sin tildes y con guiones bajos: "En Solución" → "EN_SOLUCION". */
function normalizar(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

const MAPA: Record<BadgeTipo, Record<string, BadgeTono>> = {
  // Máquina
  maquina: {
    OPERATIVA: 'ok',
    OPERATIVO: 'ok',
    EN_MANTENIMIENTO: 'warn',
    MANTENIMIENTO: 'warn',
    DE_BAJA: 'danger',
    DADA_DE_BAJA: 'danger',
    FUERA_DE_SERVICIO: 'danger',
    DESACTIVADA: 'danger',
  },
  // Gravedad de una incidencia
  gravedad: {
    CRITICA: 'critical',
    ALTA: 'high',
    MEDIA: 'warn',
    BAJA: 'neutral',
  },
  // Incidencia: pendiente → en solución → solucionado
  incidente: {
    ABIERTO: 'danger',
    PENDIENTE: 'danger',
    EN_PROCESO: 'info',
    EN_SOLUCION: 'info',
    RESUELTO: 'ok',
    SOLUCIONADO: 'ok',
    CANCELADO: 'neutral',
  },
  // Mantenimiento: programado → en proceso → completado
  mantenimiento: {
    PENDIENTE: 'warn',
    PROGRAMADO: 'warn',
    EN_PROCESO: 'info',
    FINALIZADO: 'ok',
    COMPLETADO: 'ok',
    CANCELADO: 'neutral',
  },
};

export function badgeTono(tipo: BadgeTipo, valor: unknown, opciones?: { activa?: boolean; noAtendido?: boolean }): BadgeTono {
  if (opciones?.noAtendido) return 'critical';
  // Una máquina desactivada se ve como dada de baja aunque su último estado operativo fuera "Operativa".
  if (tipo === 'maquina' && opciones?.activa === false) return 'danger';
  return MAPA[tipo][normalizar(valor)] ?? 'neutral';
}

/** Clase CSS del badge (`badge-ok`, `badge-warn`, …) para un estado. */
export function badgeClase(tipo: BadgeTipo, valor: unknown, opciones?: { activa?: boolean; noAtendido?: boolean }): string {
  return CLASE_POR_TONO[badgeTono(tipo, valor, opciones)];
}

/** Clase del badge "No atendida / No atendido" (siempre rojo sólido). */
export const BADGE_NO_ATENDIDO = CLASE_POR_TONO.critical;

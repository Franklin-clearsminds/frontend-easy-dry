/** Tipo visual de la notificación (define color e ícono). */
export type NotificacionTipo = 'alerta' | 'info' | 'exito' | 'sistema';

/** Módulo del sistema al que pertenece la notificación (permite agrupar y filtrar por área de trabajo). */
export type NotificacionCategoria = 'inventario' | 'mantenimiento' | 'aprobaciones' | 'limpieza' | 'general';

export interface Notificacion {
  id: number | string;
  titulo: string;
  mensaje: string;
  /** Tipo visual (color/ícono). */
  tipo: NotificacionTipo;
  /** Tipo original del backend (enum `TipoNotificacion`), útil para métricas y enlaces. */
  tipoBackend?: string;
  /** Área de trabajo a la que pertenece, para agrupar y filtrar. */
  categoria?: NotificacionCategoria;
  /** Fecha en formato YYYY-MM-DD (zona local del navegador). */
  fecha: string;
  /** Hora en formato HH:mm. */
  hora: string;
  /** Marca de tiempo completa (epoch ms) para ordenar y calcular tiempo relativo. */
  timestamp?: number;
  leida: boolean;
  sucursal?: string;
  enlace?: string;
  enlaceLabel?: string;
}

/** Severidad de un pendiente operativo. */
export type PendienteSeveridad = 'critica' | 'advertencia' | 'info';

/**
 * Algo que sigue mal ahora mismo (stock bajo o crítico, incidente abierto, preventivo vencido). A diferencia de un aviso no se
 * «lee»: desaparece de la bandeja cuando se resuelve el problema de fondo.
 */
export interface Pendiente {
  id: string;
  grupo: 'stock' | 'mantenimiento';
  severidad: PendienteSeveridad;
  titulo: string;
  detalle: string;
  origen: string | null;
  agencia: string | null;
  pulidor: string | null;
  region: string | null;
  estado: string;
  timestamp: number;
  enlace: string;
  enlaceLabel: string;
}

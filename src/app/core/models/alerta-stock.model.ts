/** Severidad visual de una alerta de stock. */
export type AlertaSeveridad = 'critica' | 'advertencia' | 'info';

/** Alerta de stock aplanada y lista para filtrar/ordenar/mostrar en el dashboard. */
export interface AlertaStockVM {
  id: string;
  /** crítica (CRITICO/AGOTADO) | advertencia (BAJO) | info */
  tipo: AlertaSeveridad;
  /** Nivel original del backend: BAJO | CRITICO | AGOTADO. */
  nivel: string;
  /** PENDIENTE | EN_PROCESO | DESPACHADO | RESUELTO. */
  estado: string;
  insumo: string;
  sku?: string;
  categoria?: string;
  /** Agencia o pulidor que originó la alerta. */
  origen: string | null;
  region: string | null;
  mensaje: string;
  fecha: string;
  /** Marca de tiempo para ordenar. */
  timestamp: number;
}

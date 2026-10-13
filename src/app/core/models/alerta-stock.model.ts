/** Severidad visual de una alerta. */
export type AlertaSeveridad = 'critica' | 'advertencia' | 'info';

/** Origen de la alerta operativa: stock (inventario) o mantenimiento (incidentes/mantenimientos). */
export type AlertaGrupo = 'stock' | 'mantenimiento';

/** Alerta de stock aplanada y lista para filtrar/ordenar/mostrar en el dashboard. */
export interface AlertaStockVM {
  id: string;
  /** crítica (CRITICO/AGOTADO) | advertencia (BAJO) | info */
  tipo: AlertaSeveridad;
  /** Área de origen: stock (inventario) o mantenimiento (incidentes/mantenimientos). */
  grupo?: AlertaGrupo;
  /** Texto principal (insumo o título de la alerta). */
  titulo?: string;
  /** Detalle secundario (mensaje / descripción). */
  detalle?: string;
  /** Nivel original del backend: BAJO | CRITICO | AGOTADO. */
  nivel: string;
  /** PENDIENTE | EN_PROCESO | DESPACHADO | RESUELTO. */
  estado: string;
  insumo: string;
  sku?: string;
  categoria?: string;
  /** Agencia o pulidor que originó la alerta. */
  origen: string | null;
  /** Agencia a la que pertenece la alerta (explícita: en incidentes, `origen` es la máquina). */
  agencia?: string | null;
  /** Pulidor relacionado: dueño del kit (stock) o quien reportó el incidente. */
  pulidor?: string | null;
  region: string | null;
  mensaje: string;
  fecha: string;
  /** Marca de tiempo para ordenar. */
  timestamp: number;
}

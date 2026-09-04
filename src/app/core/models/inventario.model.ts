// =========================================================
// EasyDry® - Modelo de Gestión de Inventario e Insumos
// =========================================================

/** Identificador inmutable de la Bodega Central (siempre existe, no se elimina). */
export const BODEGA_CENTRAL_ID = 'bod_central';

/** Bodega de almacenamiento de insumos (HUB nacional o satélite). */
export interface BodegaInventario {
  id: string;
  codigo: string;
  nombre: string;
  ciudad?: string;
  region?: string;
  /** Solo Bodega Central. No se puede eliminar ni desactivar. */
  esCentral: boolean;
  activa: boolean;
  fechaCreacion: string;
}

/** Tipo o Naturaleza del Producto (ej. Líquido, Químico, Unitario, EPP, Textil) */
export interface TipoProducto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  esLiquido: boolean;
  colorBadge: string;
  activo: boolean;
}

/** Tipo de Envase o Unidad de Medida (ej. Galón, Caneca 20L, Litro, Unidad, Pack x10, Caja x50) */
export interface EnvaseUnidad {
  id: string;
  codigo: string;
  nombre: string;
  abreviatura: string;
  tipoAplicable: 'liquido' | 'unitario' | 'ambos' | string;
  capacidadTexto?: string;
  descripcion?: string;
}

/** Producto / Insumo Maestro del Sistema */
export interface ProductoInsumo {
  id: number;
  codigoSKU: string;
  nombre: string;
  tipoId?: string;
  tipoNombre?: string;
  envaseId: string;
  envaseNombre: string;
  unidadMedida: string;
  descripcion: string;
  stockAlertaBodega: number; // Umbral de alerta en Bodega Central
  stockAlertaSucursal: number; // Umbral de alerta en Sucursal
  stockMinimoGlobal?: number; // Compatibilidad
  stockOptimoGlobal?: number; // Nivel recomendado
  imagen: string;
  activo: boolean;
  fechaCreacion: string;
}

/** Estado de existencias de un insumo en una sucursal específica */
export interface StockSucursal {
  sucursalId: number;
  sucursalNombre: string;
  cantidad: number;
  stockMinimo: number;
  estadoStock: 'Optimo' | 'Bajo' | 'Critico';
  ultimaActualizacion?: string;
}

/** Item Consolidado del Inventario General (bodegas + sucursales) */
export interface InventarioItem {
  producto: ProductoInsumo;
  /** Stock de Bodega Central (espejo de stockPorBodega[bod_central]). */
  stockBodegaCentral: number;
  /** Stock por bodega (clave = BodegaInventario.id). Bodega Central siempre presente. */
  stockPorBodega?: Record<string, number>;
  stockPorSucursal: Record<string, number>;
  stockTotalRed: number;
  estadoGeneral: 'Optimo' | 'Bajo' | 'Critico';
  sucursalesEnAlerta: string[];
}

export function stockEnBodega(item: InventarioItem, bodegaId: string): number {
  if (item.stockPorBodega && item.stockPorBodega[bodegaId] != null) {
    return item.stockPorBodega[bodegaId];
  }
  if (bodegaId === BODEGA_CENTRAL_ID) {
    return item.stockBodegaCentral ?? 0;
  }
  return 0;
}

/** Historial de Movimientos / Despachos / Transferencias de Stock */
export interface MovimientoStock {
  id: number;
  codigoMovimiento: string;
  fecha: string;
  tipo: 'Entrada Bodega' | 'Despacho a Sucursal' | 'Consumo en Bahía' | 'Ajuste de Inventario' | string;
  productoId: number;
  productoNombre: string;
  productoSKU: string;
  origen: string;
  destino: string;
  cantidad: number;
  unidad: string;
  responsable: string;
  observaciones?: string;
}

/** Resumen de Alertas de Reabastecimiento */
export interface AlertaReabastecimiento {
  productoId: number;
  productoSKU: string;
  productoNombre: string;
  ubicacion: string; // 'Bodega Central' o nombre de la sucursal
  stockActual: number;
  stockMinimo: number;
  deficit: number;
  unidad: string;
  nivel: 'Bajo' | 'Critico';
  sugerenciaReabastecimiento: number;
}

/** Insumo consumido en una Orden de Trabajo (OT) de servicio */
export interface InsumoConsumidoServicio {
  productoId: number;
  productoSKU: string;
  productoNombre: string;
  unidadMedida: string;
  cantidad: number;
}

/** Insumo configurado como receta predeterminada en el catálogo */
export interface RecetaInsumoServicio {
  productoId: number;
  productoSKU: string;
  productoNombre: string;
  unidadMedida: string;
  cantidadSugerida: number;
}


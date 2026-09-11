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
  direccion?: string;
  telefono?: string;
  region?: string;
  regionId?: string;
  /** Solo Bodega Central. No se puede eliminar ni desactivar. */
  esCentral: boolean;
  activa: boolean;
  porcentajeAlerta?: number;
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
  id: number | string;
  codigoSKU: string;
  nombre: string;
  categoria?: string;
  tipoId?: string;
  tipoNombre?: string;
  tipoProductoId?: string;
  tipoProducto?: TipoProductoCatalog;
  unidadMedida: string;
  unidadMedidaId?: string;
  unidadMedidaObj?: UnidadMedidaCatalog;
  contenidoNeto?: number;
  stockActual: number;
  stockMinimoBodega?: number;
  stockMinimoAgencia?: number;
  stockOptimoBodega?: number;
  porcentajeAlerta?: number;
  umbralAlerta?: number;
  descripcion?: string;
  stockAlertaBodega?: number; // Umbral de alerta en Bodega Central
  stockAlertaSucursal?: number; // Umbral de alerta en Sucursal
  stockMinimoGlobal?: number; // Compatibilidad
  stockOptimoGlobal?: number; // Nivel recomendado
  costoUnitarioUSD?: number;
  proveedorPrincipal?: string;
  imagen?: string;
  imagenUrl?: string;
  activo: boolean;
  estado?: number;
  fechaCreacion?: string;
  presentaciones?: PresentacionInsumoCatalog[];
  serviciosAsociados?: Array<{
    id: number;
    codigo: string;
    nombre: string;
    categoria: string;
    cantidadUsada?: number;
    unidad?: string;
  }>;
}

/** Catálogo Dinámico de Tipos de Producto (Líquido, Polvo, Gel, Sólido, etc.) */
export interface TipoProductoCatalog {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: number;
  createdAt?: string;
}

/** Catálogo Dinámico de Unidades de Medida (ml, L, g, kg, und, gal, etc.) */
export interface UnidadMedidaCatalog {
  id: string;
  codigo: string;
  nombre: string;
  simbolo: string;
  tipo: string;
  factorBase?: number;
  estado: number;
  createdAt?: string;
}

/** Presentación Comercial / Operativa de un Producto */
export interface PresentacionInsumoCatalog {
  id: string;
  insumoId: string;
  nombre: string;
  unidadId: string;
  unidad?: UnidadMedidaCatalog;
  cantidad: number;
  factorAUnidadBase: number;
  estado: number;
  createdAt?: string;
}

/** Tipo de Movimiento Configurable en BD (ENTRY, CONSUMPTION, etc.) */
export interface TipoMovimientoCatalog {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  esEntrada: boolean;
  estado: number;
}

/** Motivo de Movimiento Configurable en BD */
export interface MotivoMovimientoCatalog {
  id: string;
  tipoMovimientoId?: string;
  tipoMovimiento?: TipoMovimientoCatalog;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: number;
}

/** Registro de Kardex / Movimiento de Inventario Global */
export interface MovimientoInventarioGlobalItem {
  id: string;
  numeroComprobante: string;
  tipoMovimientoId: string;
  tipoMovimiento: TipoMovimientoCatalog;
  insumoId: string;
  insumo: {
    id: string;
    codigoSKU: string;
    nombre: string;
    unidadMedida?: { simbolo: string; nombre: string };
  };
  cantidad: number;
  unidadId: string;
  unidad: { id: string; simbolo: string; nombre: string };
  cantidadBase: number;
  stockAnterior: number;
  stockNuevo: number;
  presentacionId?: string;
  presentacion?: { id: string; nombre: string; factorAUnidadBase: number };
  ubicacionId?: string;
  responsableId?: string;
  responsable?: { id: string; name: string; lastname: string; email: string };
  motivoId?: string;
  motivo?: { id: string; nombre: string; codigo: string };
  referencia?: string;
  observaciones?: string;
  fechaMovimiento: string;
  createdAt?: string;
}

/** Resumen para Dashboard de Inventario */
export interface DashboardInventarioResumen {
  totalProductos: number;
  productosStockBajo: number;
  entradasMes: number;
  consumosMes: number;
  totalMovimientosMes: number;
  ultimosMovimientos: MovimientoInventarioGlobalItem[];
}

/** Payload para Registro Operativo de Movimiento */
export interface RegistrarMovimientoPayload {
  insumoId: string;
  tipoMovimientoId: string;
  cantidad: number;
  unidadId: string;
  presentacionId?: string;
  motivoId?: string;
  ubicacionId?: string;
  referencia?: string;
  observaciones?: string;
}

/** Estado de existencias de un insumo en una sucursal específica */
export interface StockSucursal {
  sucursalId: number | string;
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
  id: number | string;
  codigoMovimiento: string;
  fecha: string;
  tipo: 'Entrada Bodega' | 'Despacho a Sucursal' | 'Consumo en Bahía' | 'Ajuste de Inventario' | string;
  productoId: number | string;
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
  productoId: number | string;
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
  productoId: number | string;
  productoSKU: string;
  productoNombre: string;
  unidadMedida: string;
  cantidad: number;
}

/** Insumo configurado como receta predeterminada en el catálogo */
export interface RecetaInsumoServicio {
  productoId: number | string;
  productoSKU: string;
  productoNombre: string;
  unidadMedida: string;
  unidadMedidaId?: string;
  cantidadSugerida: number;
}


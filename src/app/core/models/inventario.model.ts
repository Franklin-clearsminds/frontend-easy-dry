// =========================================================
// EasyDry® - Modelo de Gestión de Inventario e Insumos
// =========================================================

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
  costoUnitarioUSD?: number;
  proveedorPrincipal: string;
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

/** Item Consolidado del Inventario General (Bodega Central + Red) */
export interface InventarioItem {
  producto: ProductoInsumo;
  stockBodegaCentral: number;
  stockPorSucursal: Record<string, number>; // Ej: { 'EasyDry Quito Norte': 12, 'EasyDry Quito Sur': 4, ... }
  stockTotalRed: number;
  estadoGeneral: 'Optimo' | 'Bajo' | 'Critico';
  sucursalesEnAlerta: string[];
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
  costoTotalUSD?: number;
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
  costoUnitarioUSD?: number;
  costoTotalUSD?: number;
}

/** Insumo configurado como receta predeterminada en el catálogo */
export interface RecetaInsumoServicio {
  productoId: number;
  productoSKU: string;
  productoNombre: string;
  unidadMedida: string;
  cantidadSugerida: number;
}


/**
 * Reportes Operativos que habilita cada página. Es la misma regla del servidor (el reporte exige el permiso de lectura de su
 * módulo), expresada por página para mostrarla en el editor de roles. Si cambia el catálogo de reportes, se actualiza aquí.
 */
export interface ReporteDePagina {
  nombre: string;
  /** `id` de la página del catálogo cuyo permiso de lectura habilita el reporte. */
  pagina: string;
}

export const REPORTES_POR_PAGINA: readonly ReporteDePagina[] = [
  { nombre: 'Listado de agencias', pagina: 'agencias' },
  { nombre: 'Listado de lavadores', pagina: 'operadores' },
  { nombre: 'Servicios generales', pagina: 'servicios' },
  { nombre: 'Servicios especiales', pagina: 'servicios' },
  { nombre: 'Catálogo de servicios y precios', pagina: 'catalogo' },
  { nombre: 'Maquinaria asignada', pagina: 'maquinaria' },
  { nombre: 'Incidentes de maquinaria', pagina: 'taller' },
  { nombre: 'Mantenimientos', pagina: 'taller' },
  { nombre: 'Inventario completo de insumos', pagina: 'inventario' },
  { nombre: 'Stock por agencia, pulidor o bodega', pagina: 'inventario' },
  { nombre: 'Alertas de stock', pagina: 'inventario' },
  { nombre: 'Kardex de un producto', pagina: 'inventario' },
  { nombre: 'Productividad de agencias', pagina: 'productividad' },
  { nombre: 'Productividad de operarios', pagina: 'productividad' },
  { nombre: 'Retos', pagina: 'productividad' },
  { nombre: 'Informes de inspección', pagina: 'informes' },
  { nombre: 'Auditorías 5S', pagina: 'inspecciones' },
];

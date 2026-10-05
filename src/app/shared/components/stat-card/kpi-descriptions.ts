/**
 * Diccionario central de descripciones breves de KPIs.
 * StatCardComponent lo usa como respaldo cuando no recibe un `tooltip` explícito,
 * garantizando que todas las tarjetas del dashboard (todos los roles) tengan su ícono informativo.
 */
export const KPI_DESCRIPTIONS: Record<string, string> = {
  // Administrador / financieros
  'ingreso hoy': 'Total facturado por servicios finalizados en el día de hoy',
  'ingreso del mes': 'Total facturado por servicios finalizados en el mes en curso',
  'ingreso (30d)': 'Total facturado en los últimos 30 días',
  'ticket promedio': 'Ingreso promedio por cada servicio realizado (ventas ÷ servicios)',
  'crecimiento vs mes ant.': 'Variación porcentual de ingresos frente al mes anterior',
  'servicios completados hoy': 'Cantidad de servicios finalizados en el día de hoy',
  'servicios del mes': 'Cantidad de servicios finalizados en el mes en curso',
  'tiempo promedio': 'Duración media de un servicio, desde su inicio hasta su finalización',
  'costo reparaciones (30d)': 'Gasto total en repuestos y mano de obra de reparaciones en los últimos 30 días',
  'valor inventario': 'Valor en USD del stock disponible en todas las bodegas y locales',
  'inventario en tránsito': 'Valor en USD de productos despachados que aún no han sido recibidos',

  // Aprobador
  'solicitudes hoy': 'Solicitudes de aprobación recibidas en el día',
  'pendientes': 'Elementos que aún esperan acción o revisión',
  'aprobadas': 'Solicitudes aprobadas en el día',
  'rechazadas': 'Solicitudes rechazadas en el día',
  'anuladas hoy': 'Servicios anulados en el día de hoy',
  'descuentos fuera de rango (30d)': 'Descuentos que superaron el límite permitido en los últimos 30 días',

  // Comercial
  'lavados hoy': 'Cantidad de lavados registrados en el día',
  'lavados 30 días': 'Cantidad de lavados registrados en los últimos 30 días',
  'descuentos pendientes': 'Solicitudes de descuento que esperan aprobación',
  'costo químicos (30d)': 'Gasto en químicos e insumos consumidos en los últimos 30 días',
  'cumplimiento sla (30d)': '% de vehículos entregados dentro del tiempo prometido (30 días)',
  'cumplimiento sla': '% de vehículos entregados dentro del tiempo prometido',
  'desviación vs estimado': 'Promedio de minutos de adelanto (-) o retraso (+) frente al tiempo estimado',
  '% premium/especiales (30d)': 'Porcentaje de servicios del catálogo Especial/Premium',

  // Supervisor / operativo
  'lavados hoy (región)': 'Lavados registrados hoy en los locales de tu región',
  'lavados de hoy': 'Lavados registrados hoy en tu local',
  'finalizados': 'Servicios que ya fueron completados y entregados',
  'incidentes abiertos': 'Incidentes de maquinaria o servicio aún sin resolver',
  'en espera': 'Vehículos en cola esperando iniciar su servicio',
  'en proceso': 'Servicios que se están ejecutando en este momento',
  'alertas activas': 'Alertas vigentes que aún no han sido atendidas',
  'alertas de stock': 'Productos con stock por debajo del mínimo configurado',
  'alertas críticas': 'Productos agotados o en nivel crítico que requieren resurtido urgente',

  // Técnico
  'incidentes activos': 'Incidentes abiertos o en proceso de atención',
  'equipos operativos': 'Máquinas funcionando y disponibles para operar',
  'en mantenimiento': 'Máquinas actualmente intervenidas por mantenimiento',
  'fuera de servicio': 'Máquinas dadas de baja o inoperativas',
  'tiempo promedio resolución': 'Horas promedio desde que se reporta un incidente hasta que se resuelve',
  'mantenimientos (30d)': 'Mantenimientos preventivos y correctivos ejecutados en los últimos 30 días',

  // Servicios especiales
  'ots hoy': 'Órdenes de trabajo especiales creadas hoy',
  'completados': 'Órdenes de trabajo finalizadas hoy',
  'calificación promedio': 'Puntuación media de calidad otorgada a los servicios (escala 1 a 5)',

  // Bodega
  'críticas / agotadas': 'Productos agotados o en nivel crítico que requieren despacho urgente',
  'despachos en tránsito': 'Envíos de mercadería que están en camino a su destino',
  'despachos pendientes': 'Despachos creados que aún no han sido enviados',
  'valor en tránsito': 'Valor en USD de la mercadería enviada y aún no recibida',
  'valor del stock disponible': 'Valor en USD del stock disponible, según costo unitario actual',
};

export function getKpiDescription(title: string): string {
  return KPI_DESCRIPTIONS[(title ?? '').trim().toLowerCase()] ?? '';
}

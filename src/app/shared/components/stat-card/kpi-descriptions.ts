/**
 * Diccionario central de descripciones breves de KPIs.
 * StatCardComponent lo usa como respaldo cuando no recibe un `tooltip` explícito,
 * garantizando que todas las tarjetas del dashboard (todos los roles) tengan su ícono informativo.
 */
export const KPI_DESCRIPTIONS: Record<string, string> = {
  // Administrador / financieros
  'ingreso hoy': 'Total facturado por servicios finalizados en el día de hoy',
  'ingreso del mes': 'Total facturado por servicios finalizados en el mes en curso',
  'ingreso (período)': 'Total facturado por servicios finalizados en el período seleccionado',
  'ticket promedio': 'Ingreso promedio por cada servicio realizado (ventas ÷ servicios)',
  'crecimiento vs mes ant.': 'Variación porcentual de ingresos frente al mes anterior',
  'servicios completados hoy': 'Cantidad de servicios finalizados en el día de hoy',
  'servicios del mes': 'Cantidad de servicios finalizados en el mes en curso',
  'tiempo promedio': 'Duración media de un servicio, desde su inicio hasta su finalización',
  'costo reparaciones': 'Gasto en repuestos y mano de obra de reparaciones dentro del período seleccionado',
  'inventario': 'Unidades de stock disponibles en las bodegas y locales del alcance (no se convierte a USD)',
  'inventario en tránsito': 'Unidades despachadas que aún no han sido recibidas',

  // Aprobador
  'solicitudes hoy': 'Solicitudes de aprobación recibidas en el día',
  'pendientes': 'Elementos que aún esperan acción o revisión',
  'aprobadas': 'Solicitudes aprobadas en el día',
  'rechazadas': 'Solicitudes rechazadas en el día',
  'anuladas hoy': 'Servicios anulados en el día de hoy',
  'descuentos fuera de rango': 'Descuentos que superaron el límite permitido dentro del período seleccionado',

  // Comercial
  'lavados hoy': 'Cantidad de lavados registrados en el día',
  'lavados del período': 'Cantidad de lavados registrados en el período seleccionado',
  'descuentos pendientes': 'Solicitudes de descuento que esperan aprobación',
  'químicos consumidos': 'Unidades de químicos e insumos consumidas en el período seleccionado',
  'cumplimiento sla': '% de vehículos entregados dentro del tiempo prometido, en el período seleccionado',
  'desviación vs estimado': 'Promedio de minutos de adelanto (-) o retraso (+) frente al tiempo estimado',
  '% premium/especiales': 'Porcentaje de servicios del catálogo Especial/Premium en el período seleccionado',

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
  'costo mantenimiento': 'Costo de los mantenimientos del período seleccionado',
  'costo de mantenimiento': 'Costo de los mantenimientos acumulado en el período seleccionado',
  'gasto en reparaciones': 'Gasto acumulado en reparaciones y repuestos de maquinaria dentro del período',
  'tiempo promedio resolución': 'Horas promedio desde que se reporta un incidente hasta que se resuelve',
  'tiempo de resolución (mttr)': 'Horas promedio desde que se reporta un incidente hasta que se resuelve, sobre los resueltos del período',
  'mantenimientos': 'Mantenimientos ejecutados en el período seleccionado',
  // Dashboard de mantenimiento (Coordinador de Mantenimiento · Técnico)
  'equipos con fallas': 'Equipos distintos que registraron al menos un incidente en el período seleccionado',
  'costo total del parque': 'Reparaciones por fallas más mantenimiento del período',
  'mantenimientos vencidos': 'Mantenimientos programados cuya fecha ya pasó y siguen pendientes, sin filtrar por tipo',
  'mantenimientos ejecutados': 'Mantenimientos ejecutados dentro del período seleccionado',

  // Servicios especiales
  'ots hoy': 'Órdenes de trabajo especiales creadas hoy',
  'ots del período': 'Total de órdenes de trabajo especiales creadas en el período seleccionado',
  'completados': 'Órdenes de trabajo finalizadas en el período seleccionado',
  'completados hoy': 'Órdenes de trabajo finalizadas en el día de hoy',
  'ingresos del período': 'Facturación total por órdenes de trabajo especiales completadas en el período',
  'ingreso 30 días': 'Ingreso acumulado por servicios especiales en el período de análisis',
  'calificación promedio': 'Puntuación media de calidad otorgada a los servicios (escala 1 a 5)',
  'equipos totales': 'Total de maquinaria y herramientas registradas en el parque técnico',
  'operativas': 'Máquinas y herramientas en estado operativo disponibles para trabajar',

  // Bodega
  'críticas / agotadas': 'Productos agotados o en nivel crítico que requieren despacho urgente',
  'despachos en tránsito': 'Envíos de mercadería que están en camino a su destino',
  'despachos pendientes': 'Despachos creados que aún no han sido enviados',
  'despachos del período': 'Movimientos de salida de bodega registrados en el período seleccionado',
  'valor en tránsito': 'Valor en USD de la mercadería enviada y aún no recibida',
  'valor del stock disponible': 'Valor en USD del stock disponible, según costo unitario actual',
  // Dashboard de bodega (Coordinador · Asistente)
  'posiciones evaluadas': 'Ubicaciones de stock con insumo asignado que se pueden evaluar contra su mínimo e ideal',
  'bajo el mínimo': 'Posiciones agotadas, en nivel crítico o por debajo del mínimo configurado',
  'bajo el ideal': 'Posiciones que aún superan el mínimo pero no llegan al nivel ideal, sin reserva',
  '% bajo el ideal': 'Proporción de las posiciones evaluadas que están por debajo de su nivel ideal',
  'unidades a reponer': 'Unidades totales que faltan para llevar cada insumo a su nivel ideal',
  'insumos con déficit': 'Insumos del catálogo monitoreado con al menos una posición bajo su nivel ideal',
  'ubicaciones con déficit': 'Puntos de stock que requieren resurtido, en cualquier insumo',
  'cobertura crítica': 'Insumos con menos de 7 días de stock al ritmo de consumo actual',
  'unidades en stock': 'Unidades disponibles en las ubicaciones del alcance, en unidad base',
  'posiciones óptimas': 'Posiciones de stock dentro de su rango ideal, sin exceso ni faltante',
  'posiciones en sobrestock': 'Posiciones por encima del 150% de su nivel ideal: capital inmovilizado',
};

export function getKpiDescription(title: string): string {
  return KPI_DESCRIPTIONS[(title ?? '').trim().toLowerCase()] ?? '';
}

/**
 * Orden y tamaño de una serie de gráfico de ranking (Top N, ascendente o descendente).
 */
export interface OrdenTop {
  /** Cuántas entidades se muestran (5 o 10). */
  tamano: number;
  /** DESC = de mayor a menor; ASC = de menor a mayor. */
  direccion: 'ASC' | 'DESC';
}

/**
 * Reordena y recorta una serie de Chart.js (`labels` + `datasets`) según el orden elegido.
 *
 * El criterio es el primer dataset: es la magnitud que representa cada barra en todos los gráficos que usan
 * este control. El reordenamiento se aplica a TODOS los datasets y a `backgroundColor` para que las series
 * no se desalineen; así cada entidad conserva su color tanto en orden ascendente como descendente.
 */
export function ordenarSerieTop(serie: any, orden: OrdenTop): any {
  const labels: any[] = Array.isArray(serie?.labels) ? serie.labels : [];
  const datasets: any[] = Array.isArray(serie?.datasets) ? serie.datasets : [];
  if (!labels.length || !datasets.length) return serie;

  const total = labels.length;
  const tamano = Math.min(Math.max(1, Number(orden?.tamano) || total), total);
  const base: any[] = Array.isArray(datasets[0]?.data) ? datasets[0].data : [];
  const signo = orden?.direccion === 'ASC' ? 1 : -1;

  const indices = labels
    .map((_, i) => i)
    .sort((a, b) => signo * ((Number(base[a]) || 0) - (Number(base[b]) || 0)))
    .slice(0, tamano);

  // `backgroundColor` puede ser un color único o un color por barra: solo se reordena cuando es una lista.
  const reordenar = (valor: any) => (Array.isArray(valor) ? indices.map((i) => valor[i]) : valor);

  return {
    ...serie,
    labels: reordenar(labels),
    datasets: datasets.map((ds) => ({ ...ds, data: reordenar(ds.data), backgroundColor: reordenar(ds.backgroundColor) })),
  };
}

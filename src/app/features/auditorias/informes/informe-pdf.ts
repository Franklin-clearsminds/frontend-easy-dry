import { StorageUploadService } from '../../../core/services/storage-upload.service';
import {
  CALIFICACIONES,
  CATEGORIAS_NOVEDAD,
  ESTADOS_PLAN,
  InformeDetalle,

} from '../../../core/models/auditorias.model';
import { AZUL_TITULO, GRIS, PdfFlow, TEXTO, cargarImagen, fechaHora, fechaLarga, guardarPdf } from '../shared/pdf-flow';

const nombreDe = (lista: { id: string; nombre: string }[], id: string) => lista.find((x) => x.id === id)?.nombre ?? id;

/**
 * PDF del informe de inspección con el orden y el estilo del documento original de EasyDry: página 1 hasta las actividades,
 * página 2 desde los planes de acción hasta las firmas, y las fotos de evidencia como anexos. Muestra lo que está guardado,
 * sin alterar ningún registro.
 */
export async function descargarPdfInforme(i: InformeDetalle, storage: StorageUploadService): Promise<void> {
  const flow = new PdfFlow((doc) => {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRIS).text(`${i.numero} · ${i.agencia.nombre}`, 12, 292);
  });
  const { doc } = flow;

  // Encabezado: franja azul con el logo y el título
  const logo = await cargarImagen('assets/images/easydry-logo-horizontal.png');
  doc.setFillColor(169, 200, 236).rect(12, 10, flow.ancho, 16, 'F');
  if (logo) flow.imagen(logo, 15, 11, 42, 14);
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...AZUL_TITULO).text('INFORME DE INSPECCIÓN', 62, 21);
  flow.y = 30;

  flow.filaEtiquetada([
    { etiqueta: 'PARA', valor: i.destinatarioNombre, ancho: 22 },
    { etiqueta: 'DE', valor: `${i.inspectorNombre} — ${i.agencia.nombre}`, ancho: 44 },
    { etiqueta: 'FECHA', valor: fechaLarga(i.fecha), ancho: 16 },
    { etiqueta: 'N.º DE VISITA', valor: `${i.numeroMensual} (${i.numero})`, ancho: 18 },
  ]);
  flow.espacio(3);
  flow.filaEtiquetaValor('ASUNTO:', i.asunto);
  flow.filaEtiquetaValor('ANTECEDENTES:', i.antecedentes);
  flow.espacio(3);

  flow.encabezado('DESARROLLO Y NOVEDADES ENCONTRADAS');
  const novedades = i.novedades
    .map((n, k) => `${k + 1}. ${n.titulo} [${nombreDe(CATEGORIAS_NOVEDAD, n.categoria)} · Prioridad ${n.prioridad.toLowerCase()}${n.area ? ' · ' + n.area : ''}]${n.descripcion ? '\n    ' + n.descripcion : ''}`)
    .join('\n');
  flow.caja([i.desarrollo, novedades && 'Novedades registradas:\n' + novedades].filter(Boolean).join('\n\n'), { minAlto: 60 });

  flow.encabezado('ACTIVIDADES REALIZADAS EN LA AGENCIA DURANTE LA VISITA');
  const actividades = i.actividades
    .map((a, k) => `${k + 1}. ${a.nombre}${a.responsable ? ' — Resp.: ' + a.responsable : ''}${a.fecha ? ' (' + fechaLarga(a.fecha) + ')' : ''}${a.resultado ? '\n    Resultado: ' + a.resultado : ''}${a.descripcion ? '\n    ' + a.descripcion : ''}${a.observaciones ? '\n    Obs.: ' + a.observaciones : ''}`)
    .join('\n');
  flow.caja([i.actividadesGeneral, actividades && 'Actividades:\n' + actividades].filter(Boolean).join('\n\n'), { minAlto: 60 });

  // Página 2: planes de acción, observaciones y aprobación, firmas
  flow.paginaNueva();
  flow.encabezado('PLANES DE ACCIÓN PENDIENTES DE OTRAS ÁREAS');
  const planes = i.planes
    .map((p, k) => `${k + 1}. ${p.problema}\n    Acción: ${p.accionRequerida || '—'} | Responsable: ${p.personaResponsable || i.agencia.nombre}\n    Fecha: ${p.fechaCompromiso ? fechaLarga(p.fechaCompromiso) : '—'} | Prioridad: ${p.prioridad.toLowerCase()} | Estado: ${nombreDe(ESTADOS_PLAN, p.estadoEfectivo ?? p.estado)}${p.observaciones ? '\n    Obs.: ' + p.observaciones : ''}`)
    .join('\n');
  flow.caja([i.planesGeneral, planes].filter(Boolean).join('\n\n'), { minAlto: 55 });
  flow.espacio(4);

  flow.encabezado('OBSERVACIONES Y APROBACIÓN');
  flow.asegurar(52);
  const yCaja = flow.y;
  const ladoIzq = flow.ancho * 0.62;
  doc.setDrawColor(...TEXTO).setLineWidth(0.2).rect(flow.margen, yCaja, ladoIzq, 50).rect(flow.margen + ladoIzq, yCaja, flow.ancho - ladoIzq, 50);
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEXTO).text('OBSERVACIONES DEL JEFE DE TALLER', flow.margen + 4, yCaja + 6);
  doc.setFont('helvetica', 'normal').setFontSize(9).text(doc.splitTextToSize(i.observacionesJefeTaller, ladoIzq - 8).slice(0, 10), flow.margen + 4, yCaja + 12);
  doc.setFont('helvetica', 'bold').setFontSize(8.5).text('CALIFIQUE NUESTRO SERVICIO', flow.margen + ladoIzq + 4, yCaja + 6);
  CALIFICACIONES.forEach((c, k) => {
    const y = yCaja + 14 + k * 8.5;
    doc.setFillColor(i.calificacion === c.id ? 11 : 169, i.calificacion === c.id ? 79 : 200, i.calificacion === c.id ? 156 : 236).setDrawColor(...TEXTO).rect(flow.margen + ladoIzq + 5, y, 8, 6, 'FD');
    if (i.calificacion === c.id) doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(9).text('X', flow.margen + ladoIzq + 9, y + 4.5, { align: 'center' });
    doc.setTextColor(...TEXTO).setFont('helvetica', 'bold').setFontSize(8.5).text(c.nombre.toUpperCase(), flow.margen + ladoIzq + 16, y + 4.5);
  });
  if (i.calificadoPorNombre) {
    doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...GRIS).text(`Registrada por ${i.calificadoPorNombre}, ${fechaHora(i.calificadoEn)}`, flow.margen + ladoIzq + 4, yCaja + 47, { maxWidth: flow.ancho - ladoIzq - 6 });
  }
  flow.y = yCaja + 50;
  flow.espacio(8);

  // Firmas: cuatro espacios en blanco para firmar a mano al imprimir (el sistema no guarda firmas)
  flow.asegurar(45);
  flow.espacio(14);
  const mitad = flow.ancho / 2;
  const espacios: string[] = ['Firma: Responsable informe', 'Firma: Jefe de taller', 'Firma: Líder de bahía EasyDry', 'Recepción de informe'];
  for (let fila = 0; fila < 2; fila++) {
    const y0 = flow.y;
    for (let col = 0; col < 2; col++) {
      const x0 = flow.margen + col * mitad + 10;
      doc.setDrawColor(...TEXTO).setLineWidth(0.3).line(x0, y0, x0 + mitad - 20, y0);
      doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEXTO).text(espacios[fila * 2 + col], x0 + (mitad - 20) / 2, y0 + 4.5, { align: 'center' });
    }
    flow.y = y0 + 22;
  }

  // Anexos: fotografías de evidencia (novedades, actividades y cumplimiento de planes)
  const grupos: { titulo: string; fotos: string[] }[] = [
    ...i.novedades.filter((n) => n.fotos.length).map((n) => ({ titulo: `Novedad: ${n.titulo}`, fotos: n.fotos })),
    ...i.actividades.filter((a) => a.fotos.length).map((a) => ({ titulo: `Actividad: ${a.nombre}`, fotos: a.fotos })),
    ...i.planes.filter((p) => p.evidenciaCumplimiento.length).map((p) => ({ titulo: `Cumplimiento del plan: ${p.problema.slice(0, 60)}`, fotos: p.evidenciaCumplimiento })),
  ];
  if (grupos.length) {
    flow.paginaNueva();
    flow.encabezado('ANEXOS — EVIDENCIA FOTOGRÁFICA');
    flow.espacio(3);
    for (const g of grupos) {
      flow.asegurar(60);
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...TEXTO).text(doc.splitTextToSize(g.titulo, flow.ancho)[0], flow.margen, flow.y + 3);
      flow.y += 6;
      let x = flow.margen;
      for (const url of g.fotos) {
        const img = await cargarImagen(url, storage);
        if (x + 56 > flow.margen + flow.ancho + 1) { x = flow.margen; flow.y += 52; }
        flow.asegurar(52);
        if (img) flow.imagen(img, x, flow.y, 56, 48);
        else doc.setFont('helvetica', 'italic').setFontSize(7.5).setTextColor(...GRIS).text('Foto no disponible', x + 2, flow.y + 20);
        x += 58;
      }
      flow.y += 54;
    }
  }

  guardarPdf(flow, `Informe_inspeccion_${i.numero}`);
}


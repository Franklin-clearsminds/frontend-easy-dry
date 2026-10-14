import * as XLSX from 'xlsx';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { Auditoria5sDetalle, Formato5sCatalogo, FormatoId, SEMAFORO } from '../../../core/models/auditorias.model';
import { AZUL_ENCABEZADO, AZUL_TITULO, GRIS, PdfFlow, TEXTO, cargarImagen, fechaLarga, guardarPdf } from '../shared/pdf-flow';

const TITULOS: Record<FormatoId, string> = {
  LISTA_20: 'CHECK LIST DE AUDITORÍA 5S – ÁREA DE LAVADO DE AUTOS',
  PUNTOS_25: 'AUDITORÍA 5S',
  SI_NO_50: 'AUDITORÍA 5S – CUESTIONARIO SI / NO',
};

const nombreCategoria = (f: Formato5sCatalogo, id: string) => f.categorias.find((c) => c.id === id)?.nombre.toUpperCase() ?? id;
const respuesta = (puntaje: number | null) => (puntaje === null ? '' : puntaje === 1 ? 'SI' : 'NO');
const estadoDe = (a: Auditoria5sDetalle, numero: number) => a.criterios.find((c) => c.numero === numero)?.estadoAccion ?? (a.criterios.find((c) => c.numero === numero)?.cumple ? 'Sin hallazgo' : '');

/** Excel con las columnas originales de la hoja «Checklist 5S» y su resumen (puntaje máximo y obtenido, % y semáforo). */
export function descargarExcel5s(a: Auditoria5sDetalle, cat: Formato5sCatalogo): void {
  const r = a.resultado;
  const siNo = cat.tipo === 'SI_NO';
  const filas: (string | number)[][] = [
    [TITULOS[a.formato]],
    [],
    ['Agencia:', a.agencia.nombre],
    ['Fecha:', fechaLarga(a.fecha)],
    ['Auditor:', a.auditorNombre],
    ['Responsable de agencia:', a.responsableAgencia],
    ...(a.area !== 'GENERAL' ? [['Área auditada:', a.areaNombre]] : []),
    ['Código de auditoría:', a.codigo],
    ['Formato:', a.formatoNombre],
    [],
    ['N.º', 'S', siNo ? 'Pregunta' : 'Criterio de auditoría', ...(siNo ? ['Cumple con', 'Respuesta'] : []), 'Puntaje máx.', 'Puntaje obtenido', 'Evidencia / hallazgo', 'Responsable', 'Fecha compromiso', 'Estado', 'Acción correctiva', 'Observaciones'],
    ...a.criterios.map((c) => [
      c.numero,
      nombreCategoria(cat, c.categoria),
      c.descripcion,
      ...(siNo ? [c.favorable ?? '', respuesta(c.puntaje)] : []),
      c.puntajeMaximo,
      c.puntajeEfectivo ?? '',
      c.hallazgo,
      c.responsable,
      c.fechaCompromiso ? fechaLarga(c.fechaCompromiso) : '',
      estadoDe(a, c.numero),
      c.accionCorrectiva,
      c.observaciones,
    ]),
    [],
    ['RESUMEN DE AUDITORÍA'],
    ['Puntaje máximo', r.puntajeMaximo],
    ['Puntaje obtenido', r.puntaje],
    ['% Cumplimiento', `${r.porcentaje}%`],
    ['Semáforo', SEMAFORO[r.semaforo].nombre.toUpperCase()],
    ['Criterio', '≥90% Verde | 75–89% Amarillo | <75% Rojo'],
    ...(a.anterior ? [['Puntuación de la auditoría anterior', a.anterior.puntaje ?? ''], ['Diferencia (+/−)', a.anterior.diferencia ?? '']] : []),
    [],
    ['Puntaje por S', ...r.porCategoria.map((c) => `${c.nombre}: ${c.puntaje}/${c.maximo}`)],
    ...cat.categorias.filter((c) => a.comentariosCategoria[c.id]).map((c) => [`Comentarios / acciones — ${c.nombre}`, a.comentariosCategoria[c.id]]),
  ];
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 60 }, ...(siNo ? [{ wch: 11 }, { wch: 11 }] : []), { wch: 12 }, { wch: 14 }, { wch: 36 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 36 }, { wch: 36 }];
  hoja['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: siNo ? 12 : 10 } }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Checklist 5S');
  XLSX.writeFile(libro, `Auditoria_5S_${a.codigo}.xlsx`);
}

/** PDF de la auditoría: encabezado, los 20 criterios con sus hallazgos, resumen, semáforo, gráfica de las cinco S y anexos fotográficos. */
export async function descargarPdf5s(a: Auditoria5sDetalle, cat: Formato5sCatalogo, storage: StorageUploadService): Promise<void> {
  const flow = new PdfFlow((doc) => {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRIS).text(`${a.codigo} · ${a.agencia.nombre}${a.area !== 'GENERAL' ? ' · ' + a.areaNombre : ''}`, 12, 292);
  });
  const { doc } = flow;
  const r = a.resultado;
  const sem = SEMAFORO[r.semaforo];

  const logo = await cargarImagen('assets/images/easydry-logo-horizontal.png');
  doc.setFillColor(...AZUL_ENCABEZADO).rect(12, 10, flow.ancho, 16, 'F');
  if (logo) flow.imagen(logo, 15, 11, 42, 14);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...AZUL_TITULO).text(doc.splitTextToSize(TITULOS[a.formato], 120), 62, 17);
  flow.y = 30;

  flow.filaEtiquetada([
    { etiqueta: 'AGENCIA', valor: a.agencia.nombre, ancho: 30 },
    { etiqueta: 'FECHA', valor: fechaLarga(a.fecha), ancho: 16 },
    { etiqueta: 'AUDITOR', valor: a.auditorNombre, ancho: 24 },
    { etiqueta: 'RESPONSABLE DE AGENCIA', valor: a.responsableAgencia, ancho: 30 },
  ]);
  flow.espacio(2);
  flow.filaEtiquetaValor(a.area !== 'GENERAL' ? 'ÁREA AUDITADA:' : 'CÓDIGO:', a.area !== 'GENERAL' ? `${a.areaNombre}   ·   Código ${a.codigo}` : a.codigo);
  flow.espacio(3);

  // Tabla de los 20 criterios, agrupados por S
  const anchos = [8, 62, 12, 12, 32, 26, 22, 12];
  const titulos = ['N.º', 'Criterio de auditoría', 'Máx.', 'Obt.', 'Evidencia / hallazgo', 'Responsable', 'Acción correctiva', 'Estado'];
  const x = (k: number) => flow.margen + anchos.slice(0, k).reduce((s, v) => s + v, 0) * (flow.ancho / 186);
  const w = (k: number) => anchos[k] * (flow.ancho / 186);
  const cabecera = () => {
    flow.asegurar(14);
    doc.setFillColor(...AZUL_TITULO).rect(flow.margen, flow.y, flow.ancho, 6, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(255, 255, 255);
    titulos.forEach((t, k) => doc.text(t, x(k) + 1, flow.y + 4.1));
    flow.y += 6;
  };
  cabecera();
  for (const c of cat.categorias) {
    flow.asegurar(14);
    doc.setFillColor(...AZUL_ENCABEZADO).rect(flow.margen, flow.y, flow.ancho, 5.5, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...TEXTO).text(`${c.nombre.toUpperCase()} — ${c.traduccion.toUpperCase()}`, flow.margen + 2, flow.y + 3.9);
    const rc = r.porCategoria.find((p) => p.categoria === c.id);
    doc.text(`Subtotal ${rc?.puntaje ?? 0}/${c.maximo}`, flow.margen + flow.ancho - 2, flow.y + 3.9, { align: 'right' });
    flow.y += 5.5;
    for (const crit of c.criterios) {
      const ev = a.criterios.find((k) => k.numero === crit.numero)!;
      doc.setFont('helvetica', 'normal').setFontSize(7);
      const celdas = [
        String(ev.numero),
        doc.splitTextToSize(ev.descripcion, w(1) - 2),
        String(ev.puntajeMaximo),
        ev.puntaje === null ? '—' : cat.tipo === 'SI_NO' ? (ev.puntaje === 1 ? 'SI' : 'NO') : String(ev.puntaje),
        doc.splitTextToSize([ev.hallazgo, ev.observaciones].filter(Boolean).join(' · ') || '—', w(4) - 2),
        doc.splitTextToSize([ev.responsable, ev.fechaCompromiso ? fechaLarga(ev.fechaCompromiso) : ''].filter(Boolean).join(' · ') || '—', w(5) - 2),
        doc.splitTextToSize(ev.accionCorrectiva || '—', w(6) - 2),
        doc.splitTextToSize(ev.estadoAccion ?? (ev.puntaje === 5 ? 'Sin hallazgo' : '—'), w(7) - 2),
      ] as (string | string[])[];
      const lineas = Math.max(...celdas.map((v) => (Array.isArray(v) ? v.length : 1)));
      const alto = Math.max(6, lineas * 2.9 + 2.2);
      if (flow.y + alto > flow.alturaUtil) { flow.paginaNueva(); cabecera(); }
      doc.setDrawColor(203, 213, 225).setLineWidth(0.15).rect(flow.margen, flow.y, flow.ancho, alto);
      doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...TEXTO);
      celdas.forEach((v, k) => doc.text(v as string | string[], x(k) + 1, flow.y + 3.4));
      flow.y += alto;
    }
    const comentario = a.comentariosCategoria[c.id];
    if (comentario) {
      doc.setFont('helvetica', 'italic').setFontSize(7.5);
      const lineas: string[] = doc.splitTextToSize(`Comentarios / acciones: ${comentario}`, flow.ancho - 4);
      flow.asegurar(lineas.length * 3.2 + 3);
      doc.setTextColor(...TEXTO).text(lineas, flow.margen + 2, flow.y + 3.5);
      flow.y += lineas.length * 3.2 + 3;
    }
  }

  // Resumen, semáforo y gráfica de las cinco S
  flow.asegurar(70);
  flow.espacio(5);
  flow.encabezado('RESUMEN DE AUDITORÍA');
  const y0 = flow.y + 4;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...TEXTO);
  doc.text(`Puntaje máximo: ${r.puntajeMaximo}`, flow.margen + 2, y0 + 3);
  if (a.anterior) doc.setFontSize(8).text(`Anterior: ${a.anterior.puntaje ?? '—'}  ·  Diferencia: ${(a.anterior.diferencia ?? 0) > 0 ? '+' : ''}${a.anterior.diferencia ?? 0}`, flow.margen + 2, y0 + 38).setFontSize(9);
  doc.text(`Puntaje obtenido: ${r.puntaje}`, flow.margen + 2, y0 + 9);
  doc.text(`% Cumplimiento: ${r.porcentaje}%`, flow.margen + 2, y0 + 15);
  const [rr, gg, bb] = hexARgb(sem.hex);
  doc.setFillColor(rr, gg, bb).circle(flow.margen + 7, y0 + 25, 5, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...TEXTO).text(`SEMÁFORO: ${sem.nombre.toUpperCase()}`, flow.margen + 15, y0 + 27);
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRIS).text('Criterio: ≥90% Verde | 75–89% Amarillo | <75% Rojo', flow.margen + 2, y0 + 35);
  // Barras por S
  const bx = flow.margen + 92;
  r.porCategoria.forEach((c, k) => {
    const by = y0 + k * 8;
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...TEXTO).text(`${c.nombre}`, bx, by + 4);
    doc.setFillColor(226, 232, 240).rect(bx + 22, by, 50, 5, 'F');
    const color = SEMAFORO[c.puntaje / c.maximo >= 0.9 ? 'VERDE' : c.puntaje / c.maximo >= 0.75 ? 'AMARILLO' : 'ROJO'].hex;
    const [cr, cg, cb] = hexARgb(color);
    doc.setFillColor(cr, cg, cb).rect(bx + 22, by, 50 * (c.puntaje / c.maximo), 5, 'F');
    doc.setFontSize(8).setTextColor(...TEXTO).text(`${c.puntaje}/${c.maximo}`, bx + 75, by + 4);
  });
  flow.y = y0 + 42;
  if (a.comentarios) { flow.encabezado('COMENTARIOS'); flow.caja(a.comentarios); }

  // Anexos fotográficos
  const conFotos = a.criterios.filter((c) => c.fotos.length);
  if (conFotos.length) {
    flow.paginaNueva();
    flow.encabezado('ANEXOS — EVIDENCIA FOTOGRÁFICA');
    flow.espacio(3);
    for (const c of conFotos) {
      flow.asegurar(60);
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...TEXTO).text(doc.splitTextToSize(`${cat.tipo === 'SI_NO' ? 'Pregunta' : 'Criterio'} ${c.numero}: ${c.descripcion}`, flow.ancho)[0], flow.margen, flow.y + 3);
      flow.y += 6;
      let px = flow.margen;
      for (const url of c.fotos) {
        const img = await cargarImagen(url, storage);
        if (px + 56 > flow.margen + flow.ancho + 1) { px = flow.margen; flow.y += 52; }
        flow.asegurar(52);
        if (img) flow.imagen(img, px, flow.y, 56, 48);
        else doc.setFont('helvetica', 'italic').setFontSize(7.5).setTextColor(...GRIS).text('Foto no disponible', px + 2, flow.y + 20);
        px += 58;
      }
      flow.y += 54;
    }
  }

  guardarPdf(flow, `Auditoria_5S_${a.codigo}`);
}

function hexARgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

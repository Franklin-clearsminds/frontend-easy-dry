import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ETIQUETA_ESTADO_DIA, FilaDia } from './rrhh.modelos';

/**
 * Exportable de cumplimiento de horario: una fila por persona y día con el horario, las marcas reales, los minutos de atraso o adelanto,
 * las horas reales y las horas dentro del horario. Sin columnas fijas ni colores de relleno que estorben al imprimir.
 */

const ENCABEZADOS = ['Fecha', 'Persona', 'Horario', 'Entrada', 'Salida', 'Min. entrada', 'Min. salida', 'Horas reales', 'Horas en horario', 'Estado', 'Observaciones'] as const;

const fecha = (dia: string): string => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const minutos = (m: number | null): string => (m === null ? '' : `${m > 0 ? '+' : ''}${m}`);

/** Las filas del exportable como texto, en el orden de los encabezados. */
export function filasParaExportar(filas: readonly FilaDia[]): string[][] {
  return filas.map((f) => [
    fecha(f.dia),
    f.persona,
    f.horario ? `${f.horario.entrada}–${f.horario.salida}` : '',
    f.entradaReal ?? '',
    f.salidaReal ?? '',
    minutos(f.minutosEntrada),
    minutos(f.minutosSalida),
    f.horasReales === null ? '' : String(f.horasReales),
    f.horasDentroHorario === null ? '' : String(f.horasDentroHorario),
    ETIQUETA_ESTADO_DIA[f.estado].nombre,
    f.observaciones.map((o) => ETIQUETA_ESTADO_DIA[o].nombre).join(', '),
  ]);
}

function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const nombreArchivo = (desde: string, hasta: string, ext: string) => `cumplimiento-horario_${desde}_${hasta}.${ext}`;

export async function exportarCumplimientoExcel(filas: readonly FilaDia[], desde: string, hasta: string): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Cumplimiento de horario');
  hoja.views = [{ showGridLines: false }];
  hoja.addRow([`Cumplimiento de horario del ${fecha(desde)} al ${fecha(hasta)}`]).font = { bold: true, size: 14 };
  hoja.addRow([]);
  const encabezado = hoja.addRow([...ENCABEZADOS]);
  encabezado.font = { bold: true };
  encabezado.alignment = { vertical: 'middle', wrapText: true };
  encabezado.eachCell((c) => { c.border = { bottom: { style: 'thin' } }; });
  for (const fila of filasParaExportar(filas)) {
    const r = hoja.addRow(fila);
    // Las cifras van como número para poder sumarlas y filtrarlas en Excel.
    for (const col of [8, 9]) { const v = fila[col - 1]; if (v !== '') r.getCell(col).value = Number(v); }
  }
  hoja.columns = [12, 28, 14, 9, 9, 12, 12, 13, 15, 20, 40].map((width) => ({ width }));
  hoja.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: ENCABEZADOS.length } };
  hoja.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '3:3' };
  const buffer = await libro.xlsx.writeBuffer();
  descargar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombreArchivo(desde, hasta, 'xlsx'));
}

export function exportarCumplimientoPdf(filas: readonly FilaDia[], desde: string, hasta: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(`Cumplimiento de horario del ${fecha(desde)} al ${fecha(hasta)}`, 40, 40);
  autoTable(doc, {
    startY: 58,
    head: [[...ENCABEZADOS]],
    body: filasParaExportar(filas),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });
  doc.save(nombreArchivo(desde, hasta, 'pdf'));
}

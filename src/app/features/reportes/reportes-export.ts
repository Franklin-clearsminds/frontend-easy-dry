import { jsPDF } from 'jspdf';
import autoTable, { CellDef, RowInput } from 'jspdf-autotable';
import { cargarImagen, ImagenCargada } from '../auditorias/shared/pdf-flow';
import { ColumnaReporte, FilaReporte, GrupoReporte, ReporteGenerado, TipoColumna, TotalReporte, ValorCelda } from '../../core/models/reportes.model';
import { DINERO, NUMERO, fechaCorta, fechaHoraCorta, formatearCelda, formatearTotal } from './reportes-formato';
import { HojaServicios, SIN_MODELO, SIN_SERVICIO, TablaResumen, conPrecios, hojasDeServicios, tablasResumen, totalColumna, totalFila, totalGeneral } from './reportes-servicios';

export { fechaCorta, fechaHoraCorta, formatearCelda, formatearTotal };

/**
 * Exportación de Reportes Operativos a Excel y PDF. Ambos archivos comparten el diseño de la hoja «Control de servicios» de
 * EasyDry: logo, bloque de datos (taller, responsable, región, cliente…), leyenda de iconos (realizado / no realizado), tabla con cabecera azul y filas
 * alternadas, y totales por periodo y por agencia. Cada agencia va en su propia hoja (Excel) o sección (PDF).
 */

const LOGO = 'assets/images/easydry-logo-horizontal.png';

// Colores de marca (los mismos de la hoja original y de las auditorías).
const AZUL_OSCURO: [number, number, number] = [0, 66, 130];
const AZUL_ENCABEZADO: [number, number, number] = [169, 200, 236];
const FILA_ALTERNA: [number, number, number] = [241, 245, 249];
const VERDE_TOTAL: [number, number, number] = [226, 241, 213];
const TEXTO: [number, number, number] = [15, 23, 42];
const GRIS: [number, number, number] = [100, 116, 139];
const VERDE_OK: [number, number, number] = [22, 128, 61];
const ROJO_NO: [number, number, number] = [190, 18, 60];

const hex = (c: [number, number, number]): string => c.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();

const textoTotales = (totales: TotalReporte[]): string => totales.map((t) => `${t.etiqueta}: ${formatearTotal(t)}`).join('   ·   ');

// ---------------------------------------------------------------------------------------------------------------------
// Encabezado común (datos del taller, responsable, filtros…)
// ---------------------------------------------------------------------------------------------------------------------

interface Par { etiqueta: string; valor: string; marca?: 'SI' | 'NO' }
interface Encabezado { titulo: string; pares: Par[] }

/** Título del reporte de servicios según lo que se sacó: generales, especiales o ambos. */
function tituloDe(r: ReporteGenerado): string {
  if (r.reporte.plantilla === 'SERVICIOS') {
    const cat = r.filtros.extras.find((e) => e.etiqueta === 'Servicios')?.valor;
    return `CONTROL DE SERVICIOS ${cat === 'Generales' ? 'GENERALES' : cat === 'Especiales' ? 'ESPECIALES' : 'GENERALES Y ESPECIALES'}`;
  }
  return r.reporte.nombre.toUpperCase();
}

/** Encabezado reducido de los reportes de servicios y de las hojas continuas: título, cliente, periodo, filtros y quién lo generó. */
function encabezadoReducido(r: ReporteGenerado, cliente: string, etiquetaPeriodo = ''): Encabezado {
  const generado = `${r.generadoPor} · ${fechaHoraCorta(r.generadoEn)}`;
  const extras: Par[] = r.filtros.extras.filter((e) => !(r.reporte.plantilla === 'SERVICIOS' && e.etiqueta === 'Servicios')).map((e) => ({ etiqueta: e.etiqueta.toUpperCase(), valor: e.valor }));
  return {
    titulo: tituloDe(r),
    pares: [
      { etiqueta: 'CLIENTE', valor: cliente },
      { etiqueta: 'PERIODO', valor: etiquetaPeriodo ? `${r.filtros.periodo} · ${etiquetaPeriodo}` : r.filtros.periodo },
      ...extras,
      { etiqueta: 'GENERADO POR', valor: generado },
    ],
  };
}

function encabezadoDe(r: ReporteGenerado, g: GrupoReporte | null): Encabezado {
  const digitalizado = `${r.generadoPor} · ${fechaHoraCorta(r.generadoEn)}`;
  // Cada hoja de un reto lleva los datos del propio reto en vez de los de una agencia.
  if (g?.datos?.length) {
    return { titulo: 'AVANCE DEL RETO', pares: [...g.datos.map((d) => ({ etiqueta: d.etiqueta, valor: d.valor })), { etiqueta: 'GENERADO POR', valor: digitalizado }] };
  }
  const extras: Par[] = r.filtros.extras.map((e) => ({ etiqueta: e.etiqueta.toUpperCase(), valor: e.valor }));
  const agencia = g && g.tipo !== 'GENERAL';
  const region = agencia ? g!.region : r.filtros.region;
  const cliente = agencia ? g!.cliente : r.filtros.cliente;
  return {
    titulo: tituloDe(r),
    pares: [
      { etiqueta: agencia ? (g!.tipo === 'AGENCIA' ? 'AGENCIA' : 'UBICACIÓN') : 'AGENCIAS', valor: g?.titulo && agencia ? g.titulo : r.filtros.agencias },
      { etiqueta: 'REGIÓN', valor: region },
      { etiqueta: 'RESPONSABLE', valor: g?.responsable ?? '' },
      { etiqueta: 'CLIENTE', valor: cliente },
      { etiqueta: 'PERIODO', valor: r.filtros.periodo },
      { etiqueta: 'GENERADO POR', valor: digitalizado },
      ...extras,
    ],
  };
}

const slug = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** `sufijo` distingue los archivos de un mismo reporte (p. ej. uno por agencia): sin él todos se llamarían igual. */
function nombreArchivo(r: ReporteGenerado, extension: 'xlsx' | 'pdf', sufijo?: string): string {
  const extra = sufijo ? `-${slug(sufijo)}` : '';
  return `reporte-${slug(r.reporte.nombre)}${extra}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

/** Columnas de los totales que se repiten en todos los grupos (para la hoja de resumen). */
function columnasDeResumen(r: ReporteGenerado): { clave: string; etiqueta: string; tipo: 'numero' | 'dinero' }[] {
  const vistas = new Map<string, { clave: string; etiqueta: string; tipo: 'numero' | 'dinero' }>();
  for (const g of r.grupos) for (const t of g.totales) if (!vistas.has(t.clave)) vistas.set(t.clave, { clave: t.clave, etiqueta: t.etiqueta, tipo: t.tipo });
  return [...vistas.values()];
}

const necesitaResumen = (r: ReporteGenerado): boolean => r.reporte.agrupar === 'AGENCIA' && r.grupos.length > 1;

// ---------------------------------------------------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------------------------------------------------

function nombreHoja(base: string, usados: Set<string>): string {
  const limpio = base.replace(/[\[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28) || 'Reporte';
  let nombre = limpio;
  for (let i = 2; usados.has(nombre.toLowerCase()); i++) nombre = `${limpio.slice(0, 28 - String(i).length - 1)} ${i}`;
  usados.add(nombre.toLowerCase());
  return nombre;
}

const argb = (c: [number, number, number]): string => `FF${hex(c)}`;

export async function exportarExcel(r: ReporteGenerado, sufijo?: string): Promise<void> {
  const wb = await construirExcel(r);
  const buffer = await wb.xlsx.writeBuffer();
  descargar(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombreArchivo(r, 'xlsx', sufijo));
}

/** Arma el libro (una hoja por agencia más el resumen) sin descargarlo. */
export async function construirExcel(r: ReporteGenerado, logoPropio?: ImagenCargada | null) {
  const ExcelJS = (await import('exceljs')).default;
  const logo = logoPropio === undefined ? await cargarImagen(LOGO) : logoPropio;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EasyDry';
  wb.created = new Date();
  const imagenId = logo ? wb.addImage({ base64: logo.dataUrl.split(',')[1], extension: logo.formato === 'PNG' ? 'png' : 'jpeg' }) : null;
  // Las tablas resumen llevan fórmulas: Excel las calcula al abrir el archivo.
  wb.calcProperties = { fullCalcOnLoad: true };

  const borde = { style: 'thin' as const, color: { argb: argb(TEXTO) } };
  const bordes = { top: borde, left: borde, bottom: borde, right: borde };
  const relleno = (c: [number, number, number]) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: argb(c) } });
  const n = r.columnas.length;
  const usados = new Set<string>();

  if (r.reporte.plantilla === 'SERVICIOS') {
    const hojas = hojasDeServicios(r);
    for (const h of hojas.length ? hojas : [{ cliente: r.filtros.cliente === 'Todos' ? 'Servicios' : r.filtros.cliente, clave: '', etiqueta: '', filas: [], agencias: [] } as HojaServicios]) {
      agregarHojaServicios(wb, r, h, usados, imagenId, logo, bordes, relleno);
    }
    return wb;
  }
  // Una sola hoja continua con filtros en los encabezados; solo los retos siguen con una hoja por reto.
  if (r.reporte.agrupar !== 'RETO') {
    agregarHojaContinua(wb, r, usados, imagenId, logo, bordes, relleno);
    if (necesitaResumen(r)) agregarResumenExcel(wb, r, usados, bordes, relleno);
    return wb;
  }

  const grupos: (GrupoReporte | null)[] = r.grupos.length ? r.grupos : [null];

  for (const g of grupos) {
    const ws = wb.addWorksheet(nombreHoja(g ? g.titulo : r.reporte.nombre, usados), { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    ws.columns = r.columnas.map((c) => ({ width: Math.max(6, Math.round(c.ancho * 1.35)) }));
    const ultima = n;
    // Las marcas (realizado, aprobado) se guardan como 1 / 0 y Excel las muestra como icono de verificación o de cruz.
    const iconos: string[] = [];

    // --- Encabezado: logo + título + datos ---
    const enc = encabezadoDe(r, g);
    const porFila = n >= 7 ? 2 : 1;
    const filasPares = Math.ceil(enc.pares.length / porFila);
    const izquierda = Math.min(2, n - 1);
    const mitad = porFila === 2 ? izquierda + 1 + Math.floor((n - izquierda - 1) / 2) : n;

    // Las columnas de etiquetas necesitan ancho para «RESPONSABLE» y «DIGITALIZADO POR».
    const anchoMinimo = (col: number, min: number) => { const c = ws.getColumn(col); c.width = Math.max(c.width ?? 0, min); };
    anchoMinimo(izquierda + 1, 16);
    if (porFila === 2) anchoMinimo(mitad + 1, 19);

    ws.mergeCells(1, 1, 1 + filasPares, izquierda);
    if (imagenId !== null && logo) {
      // El logo se ajusta al recuadro que forman las columnas de la izquierda y las filas del encabezado (px = ancho·7+5; pt·4/3).
      const anchosPx = Array.from({ length: izquierda }, (_, i) => Math.round((ws.getColumn(i + 1).width ?? 8) * 7 + 5));
      const disponibleAncho = anchosPx.reduce((a, b) => a + b, 0) - 12;
      const disponibleAlto = Math.round(((26 + 18 * filasPares) * 4) / 3) - 12;
      const escala = Math.min(disponibleAncho / logo.ancho, disponibleAlto / logo.alto);
      const ancho = Math.round(logo.ancho * escala);
      const alto = Math.round(logo.alto * escala);
      const x = (disponibleAncho + 12 - ancho) / 2;
      const y = (disponibleAlto + 12 - alto) / 2;
      let acumulado = 0;
      let colInicio = 0;
      while (colInicio < izquierda - 1 && x >= acumulado + anchosPx[colInicio]) { acumulado += anchosPx[colInicio]; colInicio++; }
      ws.addImage(imagenId, {
        tl: { col: colInicio + (x - acumulado) / anchosPx[colInicio], row: y < 35 ? y / 35 : 1 + (y - 35) / 24 },
        ext: { width: ancho, height: alto },
        editAs: 'oneCell',
      });
    }
    ws.mergeCells(1, izquierda + 1, 1, ultima);
    const titulo = ws.getCell(1, izquierda + 1);
    titulo.value = enc.titulo;
    titulo.font = { bold: true, size: 14, color: { argb: argb(AZUL_OSCURO) } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 26;

    const etiquetaCelda = (fila: number, col: number, texto: string) => {
      const c = ws.getCell(fila, col);
      c.value = texto;
      c.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
      c.fill = relleno(AZUL_ENCABEZADO);
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = bordes;
    };
    const valorCelda = (fila: number, desde: number, hasta: number, par: Par) => {
      if (hasta > desde) ws.mergeCells(fila, desde, fila, hasta);
      const c = ws.getCell(fila, desde);
      c.value = par.marca ? (par.marca === 'SI' ? 1 : 0) : par.valor;
      c.font = { size: 9, color: { argb: argb(TEXTO) } };
      if (par.marca) iconos.push(c.address);
      c.alignment = { horizontal: par.marca ? 'center' : 'left', vertical: 'middle', wrapText: true };
      for (let col = desde; col <= hasta; col++) ws.getCell(fila, col).border = bordes;
    };
    enc.pares.forEach((par, i) => {
      const fila = 2 + Math.floor(i / porFila);
      const segundo = porFila === 2 && i % 2 === 1;
      const colEtiqueta = segundo ? mitad + 1 : izquierda + 1;
      const finValor = segundo ? ultima : porFila === 2 ? mitad : ultima;
      etiquetaCelda(fila, colEtiqueta, par.etiqueta);
      valorCelda(fila, colEtiqueta + 1, finValor, par);
    });
    for (let f = 2; f <= 1 + filasPares; f++) ws.getRow(f).height = 18;
    for (let f = 1; f <= 1 + filasPares; f++) for (let c = 1; c <= izquierda; c++) ws.getCell(f, c).border = bordes;
    for (let c = izquierda + 1; c <= ultima; c++) ws.getCell(1, c).border = bordes;

    let fila = filasPares + 3;

    // --- Bloques por periodo ---
    const bloques = g ? g.bloques : [];
    for (const b of bloques) {
      if (b.etiqueta) {
        ws.mergeCells(fila, 1, fila, ultima);
        const banda = ws.getCell(fila, 1);
        banda.value = b.etiqueta.toUpperCase();
        banda.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        banda.fill = relleno(AZUL_OSCURO);
        banda.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        ws.getRow(fila).height = 20;
        fila++;
      }
      r.columnas.forEach((c, i) => {
        const cel = ws.getCell(fila, i + 1);
        cel.value = c.titulo.toUpperCase();
        cel.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
        cel.fill = relleno(AZUL_ENCABEZADO);
        cel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cel.border = bordes;
      });
      ws.getRow(fila).height = 24;
      fila++;

      const primeraFila = fila;
      b.filas.forEach((datos, idx) => {
        r.columnas.forEach((c, i) => {
          const cel = ws.getCell(fila, i + 1);
          cel.value = valorExcel(datos[c.clave], c.tipo);
          cel.font = { size: 9, color: { argb: argb(TEXTO) } };
          cel.alignment = { horizontal: alineacion(c.tipo), vertical: 'middle', wrapText: c.tipo === 'texto' };
          cel.border = bordes;
          if (idx % 2 === 1) cel.fill = relleno(FILA_ALTERNA);
          if (c.tipo === 'fecha') cel.numFmt = 'dd/mm/yyyy';
          else if (c.tipo === 'dinero') cel.numFmt = '"$"#,##0.00';
          else if (c.tipo === 'numero' && typeof datos[c.clave] === 'number' && !Number.isInteger(datos[c.clave])) cel.numFmt = '#,##0.###';
        });
        // Las celdas de texto se ajustan al ancho: la fila crece según las líneas que necesite su texto más largo.
        const lineas = Math.max(1, ...r.columnas.map((c, i) => {
          if (c.tipo !== 'texto') return 1;
          // Las mayúsculas y las palabras largas ocupan más que el ancho medio de un carácter: se estima por lo alto.
          const capacidad = Math.max(4, Math.floor((ws.getColumn(i + 1).width ?? 10) * 0.9) - 1);
          return String(datos[c.clave] ?? '').split(/\r?\n/).reduce((a, parte) => {
            const peso = parte.length + 0.3 * (parte.match(/[A-ZÁÉÍÓÚÑ]/g)?.length ?? 0);
            return a + Math.max(1, Math.ceil(peso / capacidad));
          }, 0);
        }));
        ws.getRow(fila).height = Math.max(17, lineas * 14 + 8);
        fila++;
      });

      if (b.filas.length) {
        r.columnas.forEach((c, i) => {
          if (c.tipo === 'marca') iconos.push(`${ws.getColumn(i + 1).letter}${primeraFila}:${ws.getColumn(i + 1).letter}${fila - 1}`);
        });
      }

      if (b.totales.length) {
        ws.mergeCells(fila, 1, fila, ultima);
        const t = ws.getCell(fila, 1);
        t.value = `${b.etiqueta ? `TOTAL ${b.etiqueta.toUpperCase()}:   ` : 'TOTAL:   '}${textoTotales(b.totales)}`;
        t.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
        t.fill = relleno(VERDE_TOTAL);
        t.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        for (let c = 1; c <= ultima; c++) ws.getCell(fila, c).border = bordes;
        ws.getRow(fila).height = 20;
        fila++;
      }
      fila++;
    }

    if (g && bloques.length > 1 && g.totales.length) {
      ws.mergeCells(fila, 1, fila, ultima);
      const t = ws.getCell(fila, 1);
      t.value = `TOTAL ${g.titulo.toUpperCase()}:   ${textoTotales(g.totales)}`;
      t.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      t.fill = relleno(AZUL_OSCURO);
      t.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      ws.getRow(fila).height = 22;
    }

    if (!bloques.length) {
      ws.mergeCells(fila, 1, fila, ultima);
      const vacio = ws.getCell(fila, 1);
      vacio.value = 'No hay registros con los filtros elegidos.';
      vacio.font = { italic: true, size: 10, color: { argb: argb(GRIS) } };
      vacio.alignment = { horizontal: 'center' };
    }

    iconos.forEach((ref, i) => {
      ws.addConditionalFormatting({
        ref,
        rules: [{ type: 'iconSet', iconSet: '3Symbols2', showValue: false, priority: i + 1, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 0.5 }, { type: 'num', value: 1 }] }],
      });
    });
  }

  if (necesitaResumen(r)) agregarResumenExcel(wb, r, usados, bordes, relleno);
  return wb;
}


type Relleno = (c: [number, number, number]) => any;

/** Logo y encabezado reducido (título, cliente, periodo, filtros) en las filas de arriba de una hoja. Devuelve la fila del encabezado de la tabla. */
function escribirCabecera(ws: any, enc: Encabezado, n: number, imagenId: number | null, logo: ImagenCargada | null, bordes: any, relleno: Relleno): number {
  const filas = enc.pares.length;
  ws.mergeCells(1, 1, 1 + filas, 1);
  if (imagenId !== null && logo) {
    const anchoPx = Math.round((ws.getColumn(1).width ?? 14) * 7 + 5) - 10;
    const altoPx = Math.round(((26 + 18 * filas) * 4) / 3) - 10;
    const escala = Math.min(anchoPx / logo.ancho, altoPx / logo.alto);
    ws.addImage(imagenId, { tl: { col: 0.04, row: 0.1 }, ext: { width: Math.round(logo.ancho * escala), height: Math.round(logo.alto * escala) }, editAs: 'oneCell' });
  }
  ws.mergeCells(1, 2, 1, n);
  const titulo = ws.getCell(1, 2);
  titulo.value = enc.titulo;
  titulo.font = { bold: true, size: 14, color: { argb: argb(AZUL_OSCURO) } };
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;
  enc.pares.forEach((par, i) => {
    const fila = 2 + i;
    const et = ws.getCell(fila, 2);
    et.value = par.etiqueta;
    et.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
    et.fill = relleno(AZUL_ENCABEZADO);
    et.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    et.border = bordes;
    if (n > 3) ws.mergeCells(fila, 3, fila, n);
    const val = ws.getCell(fila, 3);
    val.value = par.valor;
    val.font = { size: 9, color: { argb: argb(TEXTO) } };
    val.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    for (let c = 3; c <= n; c++) ws.getCell(fila, c).border = bordes;
    ws.getRow(fila).height = 18;
  });
  for (let c = 1; c <= n; c++) ws.getCell(1, c).border = bordes;
  for (let f = 1; f <= 1 + filas; f++) ws.getCell(f, 1).border = bordes;
  return filas + 3;
}

interface ColumnaHoja { clave: string; titulo: string; tipo: TipoColumna; ancho: number }

/** Escribe encabezados con filtro y todas las filas; devuelve la última fila usada. */
function escribirTabla(ws: any, columnas: ColumnaHoja[], filas: FilaReporte[], filaEncabezado: number, bordes: any, relleno: Relleno): number {
  columnas.forEach((c, i) => {
    const cel = ws.getCell(filaEncabezado, i + 1);
    cel.value = c.titulo.toUpperCase();
    cel.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
    cel.fill = relleno(AZUL_ENCABEZADO);
    cel.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cel.border = bordes;
  });
  ws.getRow(filaEncabezado).height = 24;
  filas.forEach((datos, idx) => {
    const fila = filaEncabezado + 1 + idx;
    columnas.forEach((c, i) => {
      const cel = ws.getCell(fila, i + 1);
      cel.value = valorExcel(datos[c.clave], c.tipo);
      cel.font = { size: 9, color: { argb: argb(TEXTO) } };
      cel.alignment = { horizontal: alineacion(c.tipo), vertical: 'middle' };
      cel.border = bordes;
      if (idx % 2 === 1) cel.fill = relleno(FILA_ALTERNA);
      if (c.tipo === 'fecha') cel.numFmt = 'dd/mm/yyyy';
      else if (c.tipo === 'dinero') cel.numFmt = '"$"#,##0.00';
      else if (c.tipo === 'numero' && typeof datos[c.clave] === 'number' && !Number.isInteger(datos[c.clave])) cel.numFmt = '#,##0.###';
    });
  });
  const ultima = filaEncabezado + filas.length;
  columnas.forEach((c, i) => {
    if (c.tipo === 'marca' && filas.length) {
      const letra = ws.getColumn(i + 1).letter;
      ws.addConditionalFormatting({
        ref: `${letra}${filaEncabezado + 1}:${letra}${ultima}`,
        rules: [{ type: 'iconSet', iconSet: '3Symbols2', showValue: false, priority: i + 1, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 0.5 }, { type: 'num', value: 1 }] }],
      });
    }
  });
  // Filtros en los encabezados y encabezado + primera columna congelados.
  if (filas.length) ws.autoFilter = { from: { row: filaEncabezado, column: 1 }, to: { row: ultima, column: columnas.length } };
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: filaEncabezado, topLeftCell: `B${filaEncabezado + 1}` }];
  return ultima;
}

function sinRegistros(ws: any, fila: number, n: number): void {
  ws.mergeCells(fila, 1, fila, Math.max(2, n));
  const vacio = ws.getCell(fila, 1);
  vacio.value = 'No hay registros con los filtros elegidos.';
  vacio.font = { italic: true, size: 10, color: { argb: argb(GRIS) } };
  vacio.alignment = { horizontal: 'center' };
}

const hojaPagina = { pageSetup: { orientation: 'landscape' as const, fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } };

/** Una sola hoja con todos los registros: el grupo (agencia, bodega, pulidor…) pasa a ser la primera columna y se puede filtrar. */
function agregarHojaContinua(wb: any, r: ReporteGenerado, usados: Set<string>, imagenId: number | null, logo: ImagenCargada | null, bordes: any, relleno: Relleno): void {
  const ws = wb.addWorksheet(nombreHoja(r.reporte.nombre, usados), hojaPagina);
  const conGrupo = r.reporte.agrupar === 'AGENCIA';
  const etiquetaGrupo = r.grupos.some((g) => g.tipo !== 'AGENCIA') ? 'Ubicación' : 'Agencia';
  const columnas: ColumnaHoja[] = [...(conGrupo ? [{ clave: '_grupo', titulo: etiquetaGrupo, tipo: 'texto' as TipoColumna, ancho: 14 }] : []), ...r.columnas];
  ws.columns = columnas.map((c) => ({ width: Math.max(6, Math.round(c.ancho * 1.35)) }));
  const filas: FilaReporte[] = [];
  for (const g of r.grupos) for (const b of g.bloques) for (const f of b.filas) filas.push(conGrupo ? { _grupo: g.titulo, ...f } : f);
  const cliente = r.filtros.cliente;
  // Con pocas columnas no cabe el bloque de datos al lado del logo: se deja al menos 4 columnas de ancho.
  const ancho = Math.max(columnas.length, 4);
  const filaEnc = escribirCabecera(ws, encabezadoReducido(r, cliente), ancho, imagenId, logo, bordes, relleno);
  escribirTabla(ws, columnas, filas, filaEnc, bordes, relleno);
  if (!filas.length) sinRegistros(ws, filaEnc + 1, columnas.length);
}

const formatoNumero = '#,##0;-#,##0;;@';
const formatoDinero = '"$"#,##0.00;-"$"#,##0.00;;@';

/** Una hoja por cliente (y periodo): tabla larga con filtros a la izquierda y las cuatro tablas resumen, con fórmulas, a la derecha. */
function agregarHojaServicios(wb: any, r: ReporteGenerado, hoja: HojaServicios, usados: Set<string>, imagenId: number | null, logo: ImagenCargada | null, bordes: any, relleno: Relleno): void {
  const base = hoja.etiqueta ? `${hoja.cliente.slice(0, Math.max(6, 28 - hoja.etiqueta.length - 3))} · ${hoja.etiqueta}` : hoja.cliente;
  const ws = wb.addWorksheet(nombreHoja(base, usados), hojaPagina);
  const columnas: ColumnaHoja[] = [{ clave: '_taller', titulo: 'Taller', tipo: 'texto', ancho: 13 }, ...r.columnas];
  const n = columnas.length;
  ws.columns = columnas.map((c) => ({ width: Math.max(6, Math.round(c.ancho * 1.35)) }));
  const filaEnc = escribirCabecera(ws, encabezadoReducido(r, hoja.cliente, hoja.etiqueta), Math.max(n, 4), imagenId, logo, bordes, relleno);
  const filas = hoja.filas.map((f) => ({ _taller: f.taller, ...f.fila }));
  const ultima = escribirTabla(ws, columnas, filas, filaEnc, bordes, relleno);
  if (!filas.length) {
    sinRegistros(ws, filaEnc + 1, n);
    return;
  }

  // --- Tablas resumen a la derecha, con fórmulas que respetan el filtro de la tabla larga ---
  const tablas = tablasResumen(hoja, conPrecios(r));
  const colEtiqueta = n + 2;
  const colTotal = colEtiqueta + hoja.agencias.length + 1;
  ws.getColumn(n + 1).width = 3;
  ws.getColumn(colEtiqueta).width = 22;
  for (let j = 0; j < hoja.agencias.length; j++) ws.getColumn(colEtiqueta + 1 + j).width = 13;
  ws.getColumn(colTotal).width = 14;

  const letra = (clave: string) => ws.getColumn(columnas.findIndex((c) => c.clave === clave) + 1).letter as string;
  const primera = filaEnc + 1;
  const rango = (l: string) => `$${l}$${primera}:$${l}$${ultima}`;
  const visibles = `SUBTOTAL(103,OFFSET($A$${primera},ROW(${rango('A')})-ROW($A$${primera}),0))`;
  const col = (c: number) => ws.getColumn(c).letter as string;

  let fila = filaEnc - 1;
  for (const t of tablas) {
    const titulo = ws.getCell(fila, colEtiqueta);
    titulo.value = t.titulo;
    titulo.font = { bold: true, size: 10, color: { argb: argb(AZUL_OSCURO) } };
    const filaCab = fila + 1;
    const cabecera = [t.etiquetaFilas, ...t.columnas, 'TOTAL GENERAL'];
    cabecera.forEach((texto, i) => {
      const c = ws.getCell(filaCab, colEtiqueta + i);
      c.value = texto.toUpperCase();
      c.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
      c.fill = relleno(AZUL_ENCABEZADO);
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = bordes;
    });
    const formato = t.tipo === 'dinero' ? formatoDinero : formatoNumero;
    const campoLetra = letra(t.campo);
    const sentinela = t.campo === 'modelo' ? SIN_MODELO : t.campo === 'servicio' ? SIN_SERVICIO : null;
    t.filas.forEach((etiqueta, i) => {
      const f = filaCab + 1 + i;
      const cel = ws.getCell(f, colEtiqueta);
      if (t.campo === 'fecha') {
        const [a, m, d] = etiqueta.split('-').map(Number);
        cel.value = new Date(Date.UTC(a, m - 1, d));
        cel.numFmt = 'dd/mm/yyyy';
      } else {
        cel.value = etiqueta;
      }
      cel.font = { size: 9, color: { argb: argb(TEXTO) } };
      cel.alignment = { horizontal: 'left', vertical: 'middle' };
      cel.border = bordes;
      const condicion = etiqueta === sentinela ? `(${rango(campoLetra)}="")` : `(${rango(campoLetra)}=$${col(colEtiqueta)}${f})`;
      t.columnas.forEach((_, j) => {
        const c = ws.getCell(f, colEtiqueta + 1 + j);
        const encabezadoAgencia = `${col(colEtiqueta + 1 + j)}$${filaCab}`;
        const producto = `${visibles}*(${rango(letra('_taller'))}=${encabezadoAgencia})*${condicion}${t.tipo === 'dinero' ? `*${rango(letra('precio'))}` : ''}`;
        c.value = { formula: `SUMPRODUCT(${producto})`, result: t.datos[i][j] };
        c.numFmt = formato;
        c.font = { size: 9, color: { argb: argb(TEXTO) } };
        c.alignment = { horizontal: 'right', vertical: 'middle' };
        c.border = bordes;
      });
      const total = ws.getCell(f, colTotal);
      total.value = { formula: `SUM(${col(colEtiqueta + 1)}${f}:${col(colTotal - 1)}${f})`, result: totalFila(t, i) };
      total.numFmt = formato;
      total.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
      total.fill = relleno(VERDE_TOTAL);
      total.alignment = { horizontal: 'right', vertical: 'middle' };
      total.border = bordes;
    });
    // Fila de total por agencia y total general en la esquina.
    const filaTot = filaCab + 1 + t.filas.length;
    const etTot = ws.getCell(filaTot, colEtiqueta);
    etTot.value = 'TOTAL GENERAL';
    etTot.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
    etTot.fill = relleno(VERDE_TOTAL);
    etTot.border = bordes;
    for (let j = 0; j <= t.columnas.length; j++) {
      const c = ws.getCell(filaTot, colEtiqueta + 1 + j);
      const esEsquina = j === t.columnas.length;
      c.value = { formula: `SUM(${col(colEtiqueta + 1 + j)}${filaCab + 1}:${col(colEtiqueta + 1 + j)}${filaTot - 1})`, result: esEsquina ? totalGeneral(t) : totalColumna(t, j) };
      c.numFmt = formato;
      c.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
      c.fill = relleno(VERDE_TOTAL);
      c.alignment = { horizontal: 'right', vertical: 'middle' };
      c.border = bordes;
    }
    fila = filaTot + 3;
  }
}

function agregarResumenExcel(wb: any, r: ReporteGenerado, usados: Set<string>, bordes: any, relleno: (c: [number, number, number]) => any): void {
  const ws = wb.addWorksheet(nombreHoja('Resumen', usados), { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
  const totales = columnasDeResumen(r);
  const cabecera = ['AGENCIA', 'REGIÓN', 'CLIENTE', 'RESPONSABLE', ...totales.map((t) => t.etiqueta.toUpperCase())];
  ws.columns = cabecera.map((_, i) => ({ width: i < 4 ? 26 : 16 }));

  ws.mergeCells(1, 1, 1, cabecera.length);
  const titulo = ws.getCell(1, 1);
  titulo.value = `RESUMEN GENERAL · ${r.reporte.nombre.toUpperCase()}`;
  titulo.font = { bold: true, size: 14, color: { argb: argb(AZUL_OSCURO) } };
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;
  ws.mergeCells(2, 1, 2, cabecera.length);
  const sub = ws.getCell(2, 1);
  sub.value = `${r.filtros.periodo} · ${r.filtros.region} · ${r.filtros.cliente} · ${r.filtros.agencias}`;
  sub.font = { size: 9, color: { argb: argb(GRIS) } };
  sub.alignment = { horizontal: 'center' };

  cabecera.forEach((t, i) => {
    const c = ws.getCell(4, i + 1);
    c.value = t;
    c.font = { bold: true, size: 9, color: { argb: argb(TEXTO) } };
    c.fill = relleno(AZUL_ENCABEZADO);
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = bordes;
  });
  ws.getRow(4).height = 24;

  const escribir = (fila: number, valores: (string | number)[], formatos: (string | null)[], negrita: boolean, fondo: [number, number, number] | null) => {
    valores.forEach((v, i) => {
      const c = ws.getCell(fila, i + 1);
      c.value = v;
      c.font = { size: 9, bold: negrita, color: { argb: argb(TEXTO) } };
      c.alignment = { horizontal: i < 4 ? 'left' : 'right', vertical: 'middle' };
      c.border = bordes;
      if (fondo) c.fill = relleno(fondo);
      const f = formatos[i];
      if (f) c.numFmt = f;
    });
  };
  const formatos = ['', '', '', '', ...totales.map((t) => (t.tipo === 'dinero' ? '"$"#,##0.00' : '#,##0.###'))].map((f) => f || null);
  r.grupos.forEach((g, idx) => {
    const por = new Map(g.totales.map((t) => [t.clave, t.valor]));
    escribir(5 + idx, [g.titulo, g.region, g.cliente, g.responsable, ...totales.map((t) => por.get(t.clave) ?? 0)], formatos, false, idx % 2 === 1 ? FILA_ALTERNA : null);
  });
  const generales = new Map(r.totales.map((t) => [t.clave, t.valor]));
  escribir(5 + r.grupos.length, ['TOTAL GENERAL', '', '', '', ...totales.map((t) => generales.get(t.clave) ?? 0)], formatos, true, VERDE_TOTAL);
}

function valorExcel(valor: ValorCelda | undefined, tipo: TipoColumna): string | number | Date | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (tipo === 'marca') return valor === 'SI' ? 1 : valor === 'NO' ? 0 : null;
  if (tipo === 'fecha') {
    const [a, m, d] = String(valor).split('-').map(Number);
    return a && m && d ? new Date(Date.UTC(a, m - 1, d)) : String(valor);
  }
  return valor;
}

/** Todas las celdas de datos van centradas. */
function alineacion(_tipo: TipoColumna): 'center' {
  return 'center';
}

function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------------------------------------------------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------------------------------------------------

const PAGINA = { ancho: 297, alto: 210, margen: 10 };

export async function exportarPdf(r: ReporteGenerado, sufijo?: string): Promise<void> {
  if (r.reporte.plantilla === 'SERVICIOS') {
    const documentos = await construirPdfsServicios(r);
    if (documentos.length > 1) {
      // Un PDF por cliente, juntos en un ZIP.
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const d of documentos) zip.file(nombreArchivo(r, 'pdf', d.cliente), d.doc.output('arraybuffer'));
      descargar(await zip.generateAsync({ type: 'blob' }), nombreArchivo(r, 'xlsx', sufijo).replace(/\.xlsx$/, '.zip'));
      return;
    }
    documentos[0].doc.save(nombreArchivo(r, 'pdf', sufijo ?? (documentos[0].cliente !== SIN_CLIENTE_PDF ? documentos[0].cliente : undefined)));
    return;
  }
  (await construirPdf(r)).save(nombreArchivo(r, 'pdf', sufijo));
}

/** Arma el documento (una sección por agencia más el resumen) sin descargarlo. */
export async function construirPdf(r: ReporteGenerado, logoPropio?: ImagenCargada | null): Promise<jsPDF> {
  const logo = logoPropio === undefined ? await cargarImagen(LOGO) : logoPropio;
  if (r.reporte.plantilla === 'SERVICIOS') return (await construirPdfsServicios(r, logo))[0].doc;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const util = PAGINA.ancho - PAGINA.margen * 2;
  const grupos: (GrupoReporte | null)[] = r.grupos.length ? r.grupos : [null];
  let primera = true;

  for (const g of grupos) {
    if (!primera) doc.addPage();
    primera = false;
    const paginaInicial = doc.getNumberOfPages();
    let y = dibujarEncabezadoPdf(doc, encabezadoDe(r, g), logo, util);

    const bloques = g ? g.bloques : [];
    if (!bloques.length) {
      doc.setFont('helvetica', 'italic').setFontSize(10).setTextColor(...GRIS).text('No hay registros con los filtros elegidos.', PAGINA.ancho / 2, y + 10, { align: 'center' });
      continue;
    }

    for (const b of bloques) {
      if (y > PAGINA.alto - 45) {
        doc.addPage();
        y = cintaContinuacion(doc, r, g);
      }
      const cabecera: RowInput[] = [];
      if (b.etiqueta) cabecera.push([{ content: b.etiqueta.toUpperCase(), colSpan: r.columnas.length, styles: { fillColor: AZUL_OSCURO, textColor: [255, 255, 255], halign: 'left', fontStyle: 'bold', fontSize: 9 } }]);
      cabecera.push(r.columnas.map((c) => ({ content: c.titulo.toUpperCase(), styles: { halign: 'center' as const } })));

      autoTable(doc, {
        startY: y,
        margin: { top: 16, left: PAGINA.margen, right: PAGINA.margen, bottom: 14 },
        theme: 'grid',
        head: cabecera,
        body: b.filas.map((f) => r.columnas.map((c) => celdaPdf(f[c.clave], c))),
        foot: b.totales.length ? [[{ content: `${b.etiqueta ? `TOTAL ${b.etiqueta.toUpperCase()}:   ` : 'TOTAL:   '}${textoTotales(b.totales)}`, colSpan: r.columnas.length, styles: { halign: 'left', fillColor: VERDE_TOTAL, textColor: TEXTO, fontStyle: 'bold' } }]] : undefined,
        showFoot: 'lastPage',
        styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.6, textColor: TEXTO, lineColor: TEXTO, lineWidth: 0.15, valign: 'middle', minCellHeight: 6 },
        headStyles: { fillColor: AZUL_ENCABEZADO, textColor: TEXTO, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: FILA_ALTERNA },
        columnStyles: Object.fromEntries(r.columnas.map((c, i) => [i, { cellWidth: (c.ancho / r.columnas.reduce((a, x) => a + x.ancho, 0)) * util, halign: alineacion(c.tipo) }])),
        didDrawPage: () => {
          if (doc.getCurrentPageInfo().pageNumber !== paginaInicial) cintaContinuacion(doc, r, g);
        },
        didDrawCell: dibujarMarcas(doc),
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (g && bloques.length > 1 && g.totales.length) {
      if (y > PAGINA.alto - 25) {
        doc.addPage();
        y = cintaContinuacion(doc, r, g);
      }
      doc.setFillColor(...AZUL_OSCURO).rect(PAGINA.margen, y, util, 8, 'F');
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(255, 255, 255).text(`TOTAL ${g.titulo.toUpperCase()}:   ${textoTotales(g.totales)}`, PAGINA.margen + 3, y + 5.4);
    }
  }

  if (necesitaResumen(r)) resumenPdf(doc, r, util);
  numerarPaginas(doc, r);
  return doc;
}


const SIN_CLIENTE_PDF = 'Sin cliente';

/** Un PDF por cliente: todas las OT ordenadas por fecha (con la agencia en la primera columna) y, al final, las tablas resumen. */
export async function construirPdfsServicios(r: ReporteGenerado, logoPropio?: ImagenCargada | null): Promise<{ cliente: string; doc: jsPDF }[]> {
  const logo = logoPropio === undefined ? await cargarImagen(LOGO) : logoPropio;
  const hojas = hojasDeServicios(r);
  const clientes = [...new Set(hojas.map((h) => h.cliente))];
  if (!clientes.length) clientes.push(r.filtros.cliente === 'Todos' ? SIN_CLIENTE_PDF : r.filtros.cliente);
  const util = PAGINA.ancho - PAGINA.margen * 2;
  const verPrecios = conPrecios(r);
  const columnas = [{ clave: '_taller', titulo: 'Taller', tipo: 'texto' as TipoColumna, ancho: 13 }, ...r.columnas];
  const pesoTotal = columnas.reduce((a, c) => a + c.ancho, 0);

  return clientes.map((cliente) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const propias = hojas.filter((h) => h.cliente === cliente);
    let primera = true;
    for (const hoja of propias.length ? propias : [{ cliente, clave: '', etiqueta: '', filas: [], agencias: [] } as HojaServicios]) {
      if (!primera) doc.addPage();
      primera = false;
      let y = dibujarEncabezadoPdf(doc, encabezadoReducido(r, cliente, hoja.etiqueta), logo, util);
      if (!hoja.filas.length) {
        doc.setFont('helvetica', 'italic').setFontSize(10).setTextColor(...GRIS).text('No hay registros con los filtros elegidos.', PAGINA.ancho / 2, y + 10, { align: 'center' });
        continue;
      }
      const paginaInicial = doc.getNumberOfPages();
      autoTable(doc, {
        startY: y,
        margin: { top: 16, left: PAGINA.margen, right: PAGINA.margen, bottom: 14 },
        theme: 'grid',
        head: [columnas.map((c) => ({ content: c.titulo.toUpperCase(), styles: { halign: 'center' as const } }))],
        body: hoja.filas.map((f) => columnas.map((c) => (c.clave === '_taller' ? { content: f.taller } : celdaPdf(f.fila[c.clave], c as ColumnaReporte)))),
        styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 1.2, textColor: TEXTO, lineColor: TEXTO, lineWidth: 0.15, valign: 'middle', minCellHeight: 6 },
        headStyles: { fillColor: AZUL_ENCABEZADO, textColor: TEXTO, fontStyle: 'bold', fontSize: 6.5 },
        alternateRowStyles: { fillColor: FILA_ALTERNA },
        columnStyles: Object.fromEntries(columnas.map((c, i) => [i, { cellWidth: (c.ancho / pesoTotal) * util, halign: 'center' as const }])),
        didDrawPage: () => {
          if (doc.getCurrentPageInfo().pageNumber !== paginaInicial) cintaContinuacion(doc, r, null);
        },
        didDrawCell: dibujarMarcas(doc),
      });
      y = (doc as any).lastAutoTable.finalY;

      // Tablas resumen al final, con los valores del periodo (sin filtros).
      doc.addPage();
      y = cintaContinuacion(doc, r, null);
      for (const t of tablasResumen(hoja, verPrecios)) {
        if (y > PAGINA.alto - 40) {
          doc.addPage();
          y = cintaContinuacion(doc, r, null);
        }
        y = tablaResumenPdf(doc, t, y, util) + 8;
      }
    }
    numerarPaginas(doc, r);
    return { cliente, doc };
  });
}

function tablaResumenPdf(doc: jsPDF, t: TablaResumen, y: number, util: number): number {
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...AZUL_OSCURO).text(t.titulo, PAGINA.margen, y + 3);
  const texto = (v: number): string => (v ? (t.tipo === 'dinero' ? DINERO.format(v) : NUMERO.format(v)) : '');
  const derecha = { halign: 'right' as const };
  autoTable(doc, {
    startY: y + 5,
    margin: { top: 16, left: PAGINA.margen, right: PAGINA.margen, bottom: 14 },
    theme: 'grid',
    head: [[t.etiquetaFilas.toUpperCase(), ...t.columnas.map((c) => c.toUpperCase()), 'TOTAL GENERAL']],
    body: t.filas.map((etiqueta, i) => [t.campo === 'fecha' ? fechaCorta(etiqueta) : etiqueta, ...t.datos[i].map((v) => ({ content: texto(v), styles: derecha })), { content: texto(totalFila(t, i)), styles: { ...derecha, fontStyle: 'bold' as const, fillColor: VERDE_TOTAL } }]),
    foot: [['TOTAL GENERAL', ...t.columnas.map((_, j): CellDef => ({ content: texto(totalColumna(t, j)), styles: derecha })), { content: texto(totalGeneral(t)), styles: derecha }]],
    showFoot: 'lastPage',
    styles: { font: 'helvetica', fontSize: 6.8, cellPadding: 1.2, textColor: TEXTO, lineColor: TEXTO, lineWidth: 0.15, valign: 'middle' },
    headStyles: { fillColor: AZUL_ENCABEZADO, textColor: TEXTO, fontStyle: 'bold', halign: 'center', fontSize: 6.5 },
    footStyles: { fillColor: VERDE_TOTAL, textColor: TEXTO, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
    tableWidth: util,
  });
  return (doc as any).lastAutoTable.finalY;
}

/** Celda de datos: las marcas (realizado, aprobado) se dibujan como trazos porque la fuente estándar del PDF no las incluye. */
function celdaPdf(valor: ValorCelda | undefined, c: ColumnaReporte): CellDef {
  if (c.tipo === 'marca' && (valor === 'SI' || valor === 'NO')) return { content: '', styles: { halign: 'center' }, marca: valor } as CellDef;
  return { content: formatearCelda(valor, c.tipo) };
}

function dibujarMarcas(doc: jsPDF) {
  return (d: any) => {
    const marca = d.cell?.raw?.marca as 'SI' | 'NO' | undefined;
    if (!marca) return;
    const cx = d.cell.x + d.cell.width / 2;
    const cy = d.cell.y + d.cell.height / 2;
    doc.setLineWidth(0.6).setLineCap('round');
    if (marca === 'SI') {
      doc.setDrawColor(...VERDE_OK).line(cx - 1.8, cy, cx - 0.5, cy + 1.5).line(cx - 0.5, cy + 1.5, cx + 2, cy - 1.8);
    } else {
      doc.setDrawColor(...ROJO_NO).line(cx - 1.6, cy - 1.6, cx + 1.6, cy + 1.6).line(cx - 1.6, cy + 1.6, cx + 1.6, cy - 1.6);
    }
    doc.setLineWidth(0.15).setDrawColor(...TEXTO);
  };
}

/** Bloque de arriba: logo, título y datos del taller (igual que la hoja de control). Devuelve la siguiente `y` libre. */
function dibujarEncabezadoPdf(doc: jsPDF, enc: Encabezado, logo: ImagenCargada | null, util: number): number {
  const filas: RowInput[] = [];
  filas.push([
    { content: '', rowSpan: 1 + Math.ceil(enc.pares.length / 2), styles: { cellWidth: 46 } },
    { content: enc.titulo, colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fontSize: 13, textColor: AZUL_OSCURO, minCellHeight: 10 } },
  ]);
  for (let i = 0; i < enc.pares.length; i += 2) {
    const fila: CellDef[] = [];
    for (const par of enc.pares.slice(i, i + 2)) {
      fila.push({ content: par.etiqueta, styles: { fillColor: AZUL_ENCABEZADO, fontStyle: 'bold', halign: 'center', fontSize: 7.5 } });
      fila.push({ content: par.marca ? '' : par.valor, styles: { fontSize: 8 }, marca: par.marca } as CellDef);
    }
    while (fila.length < 4) fila.push({ content: '' }, { content: '' });
    filas.push(fila);
  }
  const valorAncho = (util - 46 - 60) / 2;
  autoTable(doc, {
    startY: 10,
    margin: { left: PAGINA.margen, right: PAGINA.margen },
    theme: 'grid',
    body: filas,
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.4, textColor: TEXTO, lineColor: TEXTO, lineWidth: 0.2, valign: 'middle' },
    columnStyles: { 0: { cellWidth: 46 }, 1: { cellWidth: 30 }, 2: { cellWidth: valorAncho }, 3: { cellWidth: 30 }, 4: { cellWidth: valorAncho } },
    didDrawCell: (d: any) => {
      if (d.section === 'body' && d.row.index === 0 && d.column.index === 0 && logo) {
        const alto = Math.min(d.cell.height - 4, 16);
        const ancho = Math.min((alto * logo.ancho) / logo.alto, d.cell.width - 4);
        doc.addImage(logo.dataUrl, logo.formato, d.cell.x + (d.cell.width - ancho) / 2, d.cell.y + (d.cell.height - ancho * (logo.alto / logo.ancho)) / 2, ancho, ancho * (logo.alto / logo.ancho));
      }
      dibujarMarcas(doc)(d);
    },
  });
  return (doc as any).lastAutoTable.finalY + 5;
}

/** Cinta fina que se repite en las páginas siguientes de una agencia. */
function cintaContinuacion(doc: jsPDF, r: ReporteGenerado, g: GrupoReporte | null): number {
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...AZUL_OSCURO).text(`${r.reporte.nombre}${g && g.tipo !== 'GENERAL' ? ` · ${g.titulo}` : ''}`, PAGINA.margen, 9);
  doc.setFont('helvetica', 'normal').setTextColor(...GRIS).text(r.filtros.periodo, PAGINA.ancho - PAGINA.margen, 9, { align: 'right' });
  doc.setDrawColor(...AZUL_ENCABEZADO).setLineWidth(0.4).line(PAGINA.margen, 11, PAGINA.ancho - PAGINA.margen, 11);
  doc.setDrawColor(...TEXTO).setLineWidth(0.15);
  return 16;
}

function resumenPdf(doc: jsPDF, r: ReporteGenerado, util: number): void {
  doc.addPage();
  const totales = columnasDeResumen(r);
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...AZUL_OSCURO).text(`RESUMEN GENERAL · ${r.reporte.nombre.toUpperCase()}`, PAGINA.ancho / 2, 14, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...GRIS).text(`${r.filtros.periodo} · Región: ${r.filtros.region} · Cliente: ${r.filtros.cliente}`, PAGINA.ancho / 2, 19.5, { align: 'center' });
  const celda = (t: TotalReporte | undefined, tipo: 'numero' | 'dinero'): string => (t ? formatearTotal(t) : formatearTotal({ clave: '', etiqueta: '', valor: 0, tipo }));
  autoTable(doc, {
    startY: 24,
    margin: { top: 16, left: PAGINA.margen, right: PAGINA.margen, bottom: 14 },
    theme: 'grid',
    head: [['AGENCIA', 'REGIÓN', 'CLIENTE', 'RESPONSABLE', ...totales.map((t) => t.etiqueta.toUpperCase())]],
    body: r.grupos.map((g) => [g.titulo, g.region, g.cliente, g.responsable, ...totales.map((t) => celda(g.totales.find((x) => x.clave === t.clave), t.tipo))]),
    foot: [['TOTAL GENERAL', '', '', '', ...totales.map((t): CellDef => ({ content: celda(r.totales.find((x) => x.clave === t.clave), t.tipo), styles: { halign: 'right' } }))]],
    showFoot: 'lastPage',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, textColor: TEXTO, lineColor: TEXTO, lineWidth: 0.15, valign: 'middle' },
    headStyles: { fillColor: AZUL_ENCABEZADO, textColor: TEXTO, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: VERDE_TOTAL, textColor: TEXTO, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
    columnStyles: Object.fromEntries(totales.map((_, i) => [i + 4, { halign: 'right' as const }])),
    tableWidth: util,
  });
}

function numerarPaginas(doc: jsPDF, r: ReporteGenerado): void {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRIS);
    doc.text(`EasyDry · ${r.reporte.nombre} · Generado por ${r.generadoPor} el ${fechaHoraCorta(r.generadoEn)}`, PAGINA.margen, PAGINA.alto - 6);
    doc.text(`Página ${p} de ${total}`, PAGINA.ancho - PAGINA.margen, PAGINA.alto - 6, { align: 'right' });
  }
}

/** Expuestos para las pruebas unitarias. */
export { encabezadoDe, encabezadoReducido, nombreArchivo, nombreHoja };

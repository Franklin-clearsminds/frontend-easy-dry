import { GrupoReporte, ReporteGenerado, TotalReporte } from '../../core/models/reportes.model';
import { construirExcel, construirPdf, construirPdfsServicios, encabezadoDe, encabezadoReducido, fechaCorta, formatearCelda, nombreArchivo, nombreHoja } from './reportes-export';

const totales = (n: number): TotalReporte[] => [{ clave: 'total', etiqueta: 'Total de registros', valor: n, tipo: 'numero' }];

function grupo(titulo: string, filas: number): GrupoReporte {
  return {
    clave: titulo,
    titulo,
    tipo: 'AGENCIA',
    region: 'Sierra',
    cliente: 'Toyota',
    agencia: titulo,
    responsable: 'Luis Mora',
    bloques: [
      {
        clave: '2026-01',
        etiqueta: 'Enero 2026',
        filas: Array.from({ length: filas }, (_, i) => ({ ord: i + 1, fecha: '2026-01-10', ot: `OT-${i}`, realizado: i % 2 ? 'NO' : 'SI' })),
        totales: totales(filas),
      },
    ],
    totales: totales(filas),
  };
}

function reporte(plantilla: ReporteGenerado['reporte']['plantilla'], grupos: GrupoReporte[]): ReporteGenerado {
  return {
    reporte: { id: 'servicios-especiales', nombre: 'Servicios especiales', modulo: 'Servicios de lavado', plantilla, periodo: true, agrupar: 'AGENCIA' },
    generadoEn: '2026-10-14T16:00:00.000Z',
    generadoPor: 'Ana Pérez',
    filtros: { region: 'Sierra', cliente: 'Todos', agencias: `Todas (${grupos.length})`, periodo: 'Este año · 2026', division: 'MES', extras: [] },
    columnas: [
      { clave: 'ord', titulo: 'Ord.', tipo: 'numero', ancho: 5 },
      { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', ancho: 9 },
      { clave: 'ot', titulo: 'OT', tipo: 'texto', ancho: 12 },
      { clave: 'realizado', titulo: 'Realizado', tipo: 'marca', ancho: 9 },
    ],
    grupos,
    totales: totales(grupos.reduce((a, g) => a + g.bloques[0].filas.length, 0)),
    totalFilas: grupos.reduce((a, g) => a + g.bloques[0].filas.length, 0),
    umbrales: { PDF: 2000, EXCEL: 20000 },
  };
}

/** Servicios de lavado de dos clientes (Toyota con dos agencias y Hino con una), con precio. */
function reporteServicios(): ReporteGenerado {
  const fila = (ot: string, fecha: string, modelo: string, servicio: string, precio: number) => ({ ot, fecha, horaIngreso: '08:00', modelo, servicio, precio });
  const g = (titulo: string, cliente: string, filas: ReturnType<typeof fila>[]): GrupoReporte => ({
    clave: titulo, titulo, tipo: 'AGENCIA', region: 'Sierra', cliente, agencia: titulo, responsable: '',
    bloques: [{ clave: 'todo', etiqueta: '', filas, totales: totales(filas.length) }],
    totales: totales(filas.length),
  });
  const grupos = [
    g('TJ Manta', 'Toyota', [fila('OT-1', '2026-09-16', 'H300', 'LAVADO COMPLETO', 10), fila('OT-2', '2026-09-17', 'BUS', 'LAVADO DELUXE', 20)]),
    g('TJ Cuenca', 'Toyota', [fila('OT-3', '2026-09-16', 'H300', 'LAVADO DELUXE', 15)]),
    g('HN Quito', 'Hino', [fila('OT-4', '2026-09-16', 'H500', 'LAVADO COMPLETO', 8)]),
  ];
  return {
    reporte: { id: 'servicios-lavado', nombre: 'Servicios de lavado', modulo: 'Servicios de lavado', plantilla: 'SERVICIOS', periodo: true, agrupar: 'AGENCIA' },
    generadoEn: '2026-10-14T16:00:00.000Z',
    generadoPor: 'Ana Pérez',
    filtros: { region: 'Todas', cliente: 'Todos', agencias: 'Todas (3)', periodo: 'Septiembre 2026', division: 'UNICO', extras: [{ etiqueta: 'Servicios', valor: 'Generales y especiales' }] },
    columnas: [
      { clave: 'ot', titulo: 'OT', tipo: 'texto', ancho: 11 },
      { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', ancho: 11 },
      { clave: 'horaIngreso', titulo: 'Ingreso', tipo: 'hora', ancho: 9.5 },
      { clave: 'modelo', titulo: 'Modelo', tipo: 'texto', ancho: 10 },
      { clave: 'servicio', titulo: 'Tipo de servicio', tipo: 'texto', ancho: 13 },
      { clave: 'precio', titulo: 'Precio', tipo: 'dinero', ancho: 9 },
    ],
    grupos,
    totales: totales(4),
    totalFilas: 4,
    umbrales: { PDF: 2000, EXCEL: 20000 },
  };
}

describe('reportes-export', () => {
  describe('formato de valores', () => {
    it('muestra las fechas como día/mes/año', () => {
      expect(fechaCorta('2026-10-05')).toBe('05/10/2026');
      expect(formatearCelda('2026-01-31', 'fecha')).toBe('31/01/2026');
    });

    it('deja vacío lo que no tiene valor', () => {
      expect(formatearCelda(null, 'texto')).toBe('');
      expect(formatearCelda('', 'numero')).toBe('');
      expect(formatearCelda(undefined, 'dinero')).toBe('');
    });

    it('da formato de dinero y de número', () => {
      expect(formatearCelda(25, 'dinero')).toContain('25');
      expect(formatearCelda(1234.5, 'numero')).toMatch(/1.?234,5/);
    });
  });

  describe('encabezado', () => {
    it('el reporte de servicios lleva título, cliente, periodo y quién lo generó, sin agencia, responsable ni aprobador', () => {
      const r = reporte('SERVICIOS', [grupo('Agencia Norte', 2)]);
      const enc = encabezadoReducido(r, 'Toyota');
      expect(enc.titulo).toBe('CONTROL DE SERVICIOS GENERALES Y ESPECIALES');
      const etiquetas = enc.pares.map((p) => p.etiqueta);
      expect(etiquetas).toEqual(['CLIENTE', 'PERIODO', 'GENERADO POR']);
      expect(enc.pares.find((p) => p.etiqueta === 'GENERADO POR')!.valor).toContain('Ana Pérez');
    });

    it('el título sigue a lo que se sacó: generales o especiales', () => {
      const r = reporte('SERVICIOS', [grupo('Agencia Norte', 1)]);
      r.filtros.extras = [{ etiqueta: 'Servicios', valor: 'Especiales' }];
      expect(encabezadoReducido(r, 'Toyota').titulo).toBe('CONTROL DE SERVICIOS ESPECIALES');
      r.filtros.extras = [{ etiqueta: 'Servicios', valor: 'Generales' }];
      expect(encabezadoReducido(r, 'Toyota').titulo).toBe('CONTROL DE SERVICIOS GENERALES');
    });

    it('los demás reportes llevan agencia, región, cliente y periodo', () => {
      const r = reporte('TABLA', [grupo('Agencia Norte', 1)]);
      const etiquetas = encabezadoDe(r, r.grupos[0]).pares.map((p) => p.etiqueta);
      expect(etiquetas).toEqual(jasmine.arrayContaining(['AGENCIA', 'REGIÓN', 'CLIENTE', 'PERIODO', 'GENERADO POR']));
    });
  });

  describe('nombres', () => {
    it('el archivo lleva el nombre del reporte sin tildes ni espacios', () => {
      const r = reporte('TABLA', []);
      r.reporte.nombre = 'Catálogo de servicios y precios';
      expect(nombreArchivo(r, 'xlsx')).toMatch(/^reporte-catalogo-de-servicios-y-precios-\d{4}-\d{2}-\d{2}\.xlsx$/);
    });

    it('los nombres de hoja respetan el límite de Excel, quitan caracteres prohibidos y no se repiten', () => {
      const usados = new Set<string>();
      const a = nombreHoja('Easydry Quito Norte / Sector: [A]', usados);
      const b = nombreHoja('Easydry Quito Norte / Sector: [A]', usados);
      expect(a).not.toMatch(/[\[\]:*?/\\]/);
      expect(a.length).toBeLessThanOrEqual(31);
      expect(b).not.toBe(a);
      expect(b.length).toBeLessThanOrEqual(31);
    });
  });

  describe('archivos', () => {
    it('los reportes de tabla salen en una sola hoja continua con filtros, la agencia a la izquierda y sin filas ni columnas congeladas', async () => {
      const wb = await construirExcel(reporte('TABLA', [grupo('Agencia Norte', 3), grupo('Agencia Sur', 2)]), null);
      expect(wb.worksheets.map((w: any) => w.name)).toEqual(['Servicios especiales', 'Resumen']);
      const ws = wb.worksheets[0];
      const filaEnc = 2 + 3 + 1; // título + cliente, periodo y generado por + una fila en blanco
      expect(ws.getCell(filaEnc, 1).value).toBe('AGENCIA');
      expect(ws.getCell(filaEnc + 1, 1).value).toBe('Agencia Norte');
      expect(ws.getCell(filaEnc + 4, 1).value).toBe('Agencia Sur');
      expect(ws.autoFilter).toBeTruthy();
      expect(ws.views.some((v: any) => v.state === 'frozen' || v.xSplit || v.ySplit)).toBe(false);
    });

    it('con una sola agencia no agrega resumen', async () => {
      const wb = await construirExcel(reporte('TABLA', [grupo('Agencia Norte', 3)]), null);
      expect(wb.worksheets.map((w: any) => w.name)).toEqual(['Servicios especiales']);
    });

    it('servicios de lavado: una hoja por cliente, con la tabla larga y las cuatro tablas resumen a la derecha', async () => {
      const wb = await construirExcel(reporteServicios(), null);
      expect(wb.worksheets.map((w: any) => w.name)).toEqual(['Hino', 'Toyota']);
      const ws = wb.worksheets[1];
      const filaEnc = 2 + 3 + 1;
      // La agencia es la primera columna y las demás columnas siguen igual.
      expect(ws.getCell(filaEnc, 1).value).toBe('TALLER');
      expect(ws.getCell(filaEnc, 2).value).toBe('OT');
      expect(ws.autoFilter).toBeTruthy();
      // Tablas a la derecha: con precios salen las cuatro.
      const textos: string[] = [];
      ws.eachRow((fila: any) => fila.eachCell((c: any) => { if (typeof c.value === 'string') textos.push(c.value); }));
      for (const t of ['SERVICIOS POR FECHA', 'SERVICIOS POR MODELO', 'MONTO POR FECHA', 'MONTO POR TIPO DE SERVICIO']) expect(textos).toContain(t);
      // Las celdas de las tablas son fórmulas que respetan el filtro.
      let formulas = 0;
      ws.eachRow((fila: any) => fila.eachCell((c: any) => { if (c.value && typeof c.value === 'object' && c.value.formula?.includes('SUBTOTAL(103')) formulas++; }));
      expect(formulas).toBeGreaterThan(0);
    });

    it('servicios de lavado sin permiso de precios: sin columna Precio ni tablas de dinero', async () => {
      const r = reporteServicios();
      r.columnas = r.columnas.filter((c) => c.clave !== 'precio');
      const ws = (await construirExcel(r, null)).worksheets[1];
      const textos: string[] = [];
      ws.eachRow((fila: any) => fila.eachCell((c: any) => { if (typeof c.value === 'string') textos.push(c.value); }));
      expect(textos).toContain('SERVICIOS POR FECHA');
      expect(textos).not.toContain('MONTO POR FECHA');
      expect(textos).not.toContain('MONTO POR TIPO DE SERVICIO');
      expect(textos).not.toContain('PRECIO');
    });

    it('el libro de servicios de lavado se puede guardar como archivo .xlsx válido', async () => {
      const wb = await construirExcel(reporteServicios(), null);
      const buffer = await wb.xlsx.writeBuffer();
      expect(buffer.byteLength).toBeGreaterThan(2000);
      // Un .xlsx es un ZIP: empieza con «PK».
      expect(String.fromCharCode(...new Uint8Array(buffer).slice(0, 2))).toBe('PK');
    });

    it('si el reporte se dividió por periodo, hay una hoja por cliente y periodo', async () => {
      const r = reporteServicios();
      const g = r.grupos[0];
      g.bloques.push({ ...g.bloques[0], clave: '2026-02', etiqueta: 'Febrero 2026' });
      const nombres = (await construirExcel(r, null)).worksheets.map((w: any) => w.name);
      expect(nombres.filter((n: string) => n.startsWith('Toyota'))).toHaveSize(2);
    });

    it('el PDF abre cada agencia en su propia página y agrega el resumen', async () => {
      const doc = await construirPdf(reporte('TABLA', [grupo('Agencia Norte', 3), grupo('Agencia Sur', 2)]), null);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
    });

    it('servicios de lavado: un PDF por cliente con las OT y las tablas resumen al final', async () => {
      const pdfs = await construirPdfsServicios(reporteServicios(), null);
      expect(pdfs.map((p) => p.cliente)).toEqual(['Hino', 'Toyota']);
      expect(pdfs[1].doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    });

    it('un reporte sin registros igual genera sus archivos', async () => {
      const vacio = reporte('TABLA', []);
      expect((await construirExcel(vacio, null)).worksheets).toHaveSize(1);
      expect((await construirPdf(vacio, null)).getNumberOfPages()).toBe(1);
      const sin = reporte('SERVICIOS', []);
      expect((await construirExcel(sin, null)).worksheets).toHaveSize(1);
      expect((await construirPdfsServicios(sin, null))[0].doc.getNumberOfPages()).toBe(1);
    });
  });
});

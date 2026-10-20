import { GrupoReporte, ReporteGenerado, TotalReporte } from '../../core/models/reportes.model';
import { construirExcel, construirPdf, encabezadoDe, fechaCorta, formatearCelda, nombreArchivo, nombreHoja } from './reportes-export';

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
    it('las plantillas de control llevan taller, responsable y la leyenda de realizado y no realizado', () => {
      const r = reporte('CONTROL_ESPECIAL', [grupo('Agencia Norte', 2)]);
      const enc = encabezadoDe(r, r.grupos[0]);
      expect(enc.titulo).toBe('CONTROL DE SERVICIOS ESPECIALES');
      const por = Object.fromEntries(enc.pares.map((p) => [p.etiqueta, p]));
      expect(por['TALLER'].valor).toBe('Agencia Norte');
      expect(por['RESPONSABLE'].valor).toBe('Luis Mora');
      expect(por['REALIZADO'].marca).toBe('SI');
      expect(por['NO REALIZADO'].marca).toBe('NO');
      expect(por['REGIÓN'].valor).toBe('Sierra');
      expect(por['CLIENTE'].valor).toBe('Toyota');
      expect(por['DIGITALIZADO POR'].valor).toContain('Ana Pérez');
    });

    it('el control general usa su propio título', () => {
      const r = reporte('CONTROL_GENERAL', [grupo('Agencia Norte', 1)]);
      expect(encabezadoDe(r, r.grupos[0]).titulo).toBe('CONTROL DE SERVICIOS GENERALES');
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
    it('el Excel lleva una hoja por agencia y una de resumen', async () => {
      const wb = await construirExcel(reporte('CONTROL_ESPECIAL', [grupo('Agencia Norte', 3), grupo('Agencia Sur', 2)]), null);
      expect(wb.worksheets.map((w: any) => w.name)).toEqual(['Agencia Norte', 'Agencia Sur', 'Resumen']);
    });

    it('con una sola agencia no agrega resumen', async () => {
      const wb = await construirExcel(reporte('TABLA', [grupo('Agencia Norte', 3)]), null);
      expect(wb.worksheets.map((w: any) => w.name)).toEqual(['Agencia Norte']);
    });

    it('el PDF abre cada agencia en su propia página y agrega el resumen', async () => {
      const doc = await construirPdf(reporte('CONTROL_ESPECIAL', [grupo('Agencia Norte', 3), grupo('Agencia Sur', 2)]), null);
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
    });

    it('un reporte sin registros igual genera sus archivos', async () => {
      const vacio = reporte('TABLA', []);
      expect((await construirExcel(vacio, null)).worksheets).toHaveSize(1);
      expect((await construirPdf(vacio, null)).getNumberOfPages()).toBe(1);
    });
  });
});

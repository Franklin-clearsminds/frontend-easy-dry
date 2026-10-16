import { FiltrosReporte, ReporteGenerado } from '../../core/models/reportes.model';
import { AgenciaDestino, DependenciasPorAgencia, ProgresoPorAgencia, exportarPorAgencia } from './reporte-por-agencia';

const AGENCIAS: AgenciaDestino[] = [
  { id: 'a1', nombre: 'Quito Norte' },
  { id: 'a2', nombre: 'Guayaquil' },
  { id: 'a3', nombre: 'Cuenca' },
];
const BASE: FiltrosReporte = { reporteId: 'servicios-generales', periodo: { modo: 'ANIO', anio: 2025 } };

const resultado = (totalFilas: number) => ({ totalFilas } as unknown as ReporteGenerado);

function dependencias(filas: Record<string, number>, extra: Partial<DependenciasPorAgencia> = {}) {
  const pedidos: FiltrosReporte[] = [];
  const exportadas: string[] = [];
  const registradas: Array<[string[] | undefined, number]> = [];
  const progreso: ProgresoPorAgencia[] = [];
  const deps: DependenciasPorAgencia = {
    generar: async (f) => {
      pedidos.push(f);
      return resultado(filas[f.agenciaIds![0]] ?? 0);
    },
    exportar: async (_res, agencia) => void exportadas.push(agencia.nombre),
    registrar: async (f, total) => void registradas.push([f.agenciaIds, total]),
    progreso: (p) => progreso.push(p),
    pausa: async () => undefined,
    ...extra,
  };
  return { deps, pedidos, exportadas, registradas, progreso };
}

describe('exportarPorAgencia', () => {
  it('pide cada agencia por separado y exporta un archivo por agencia con datos', async () => {
    const t = dependencias({ a1: 10, a2: 5, a3: 7 });

    const r = await exportarPorAgencia(BASE, AGENCIAS, t.deps);

    expect(t.pedidos.map((p) => p.agenciaIds)).toEqual([['a1'], ['a2'], ['a3']]);
    expect(t.pedidos.every((p) => p.reporteId === 'servicios-generales' && p.periodo?.anio === 2025)).toBeTrue();
    expect(t.exportadas).toEqual(['Quito Norte', 'Guayaquil', 'Cuenca']);
    expect(r.exportadas).toEqual(['Quito Norte', 'Guayaquil', 'Cuenca']);
    expect(r.fallidas).toEqual([]);
    expect(r.cancelado).toBeFalse();
  });

  it('las agencias sin filas no generan archivo y se informan aparte', async () => {
    const t = dependencias({ a1: 10, a2: 0, a3: 3 });

    const r = await exportarPorAgencia(BASE, AGENCIAS, t.deps);

    expect(t.exportadas).toEqual(['Quito Norte', 'Cuenca']);
    expect(r.sinDatos).toEqual(['Guayaquil']);
  });

  it('un error en una agencia no detiene a las demás', async () => {
    const t = dependencias({ a1: 10, a2: 5, a3: 7 }, {
      generar: async (f) => {
        if (f.agenciaIds![0] === 'a2') throw new Error('Tiempo agotado');
        return resultado(4);
      },
    });

    const r = await exportarPorAgencia(BASE, AGENCIAS, t.deps);

    expect(r.exportadas).toEqual(['Quito Norte', 'Cuenca']);
    expect(r.fallidas).toEqual([{ agencia: 'Guayaquil', motivo: 'Tiempo agotado' }]);
  });

  it('si falla el armado del archivo de una agencia, la marca como fallida y sigue', async () => {
    const t = dependencias({ a1: 1, a2: 1, a3: 1 }, {
      exportar: async (_r, a) => {
        if (a.id === 'a1') throw new Error('Sin memoria');
      },
    });

    const r = await exportarPorAgencia(BASE, AGENCIAS, t.deps);

    expect(r.fallidas.map((f) => f.agencia)).toEqual(['Quito Norte']);
    expect(r.exportadas).toEqual(['Guayaquil', 'Cuenca']);
  });

  it('registra en la bitácora cada archivo con su agencia y sus filas', async () => {
    const t = dependencias({ a1: 10, a2: 0, a3: 7 });

    await exportarPorAgencia(BASE, AGENCIAS, t.deps);

    expect(t.registradas).toEqual([[['a1'], 10], [['a3'], 7]]);
  });

  it('si la bitácora falla, el archivo cuenta como exportado y se avisa cuántos quedaron sin registrar', async () => {
    const t = dependencias({ a1: 1, a2: 1, a3: 1 }, { registrar: async () => Promise.reject(new Error('sin red')) });

    const r = await exportarPorAgencia(BASE, AGENCIAS, t.deps);

    expect(r.exportadas.length).toBe(3);
    expect(r.sinBitacora).toBe(3);
  });

  it('al cancelar deja de pedir agencias y devuelve las que no se procesaron', async () => {
    let procesadas = 0;
    const t = dependencias({ a1: 1, a2: 1, a3: 1 }, { cancelado: () => procesadas >= 1 });
    const original = t.deps.exportar;
    t.deps.exportar = async (res, agencia) => {
      await original(res, agencia);
      procesadas++;
    };

    const r = await exportarPorAgencia(BASE, AGENCIAS, t.deps);

    expect(r.cancelado).toBeTrue();
    expect(r.exportadas).toEqual(['Quito Norte']);
    expect(r.pendientes).toEqual(['Guayaquil', 'Cuenca']);
    expect(t.pedidos.length).toBe(1);
  });

  it('informa el avance agencia por agencia', async () => {
    const t = dependencias({ a1: 2, a2: 0, a3: 2 });

    await exportarPorAgencia(BASE, AGENCIAS, t.deps);

    expect(t.progreso.map((p) => `${p.actual}/${p.total} ${p.agencia} ${p.estado}`)).toEqual([
      '1/3 Quito Norte generando',
      '1/3 Quito Norte exportada',
      '2/3 Guayaquil generando',
      '2/3 Guayaquil sin-datos',
      '3/3 Cuenca generando',
      '3/3 Cuenca exportada',
    ]);
  });

  it('espera entre descargas (no antes de la primera) para que el navegador no las descarte', async () => {
    const pausas: number[] = [];
    const t = dependencias({ a1: 1, a2: 1, a3: 1 }, { pausa: async (ms) => void pausas.push(ms) });

    await exportarPorAgencia(BASE, AGENCIAS, t.deps);

    expect(pausas.length).toBe(2);
    expect(pausas.every((ms) => ms > 0)).toBeTrue();
  });

  it('sin agencias no hace nada', async () => {
    const t = dependencias({});
    const r = await exportarPorAgencia(BASE, [], t.deps);
    expect(r.exportadas).toEqual([]);
    expect(t.pedidos.length).toBe(0);
  });
});

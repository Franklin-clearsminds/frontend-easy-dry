import { FiltrosReporte, ReporteGenerado } from '../../core/models/reportes.model';

export interface AgenciaDestino {
  id: string;
  nombre: string;
}

export interface ProgresoPorAgencia {
  /** Agencia en curso (1 a `total`). */
  actual: number;
  total: number;
  agencia: string;
  estado: 'generando' | 'exportada' | 'sin-datos' | 'fallida';
}

export interface ResultadoPorAgencia {
  exportadas: string[];
  sinDatos: string[];
  fallidas: { agencia: string; motivo: string }[];
  /** Agencias que no llegaron a procesarse porque el usuario canceló. */
  pendientes: string[];
  cancelado: boolean;
  /** Archivos que sí se descargaron pero cuya exportación no pudo anotarse en la bitácora. */
  sinBitacora: number;
}

export interface DependenciasPorAgencia {
  generar(filtros: FiltrosReporte): Promise<ReporteGenerado>;
  exportar(res: ReporteGenerado, agencia: AgenciaDestino): Promise<void>;
  registrar(filtros: FiltrosReporte, totalFilas: number): Promise<void>;
  progreso?(p: ProgresoPorAgencia): void;
  cancelado?(): boolean;
  /** Espera entre descargas: los navegadores descartan descargas que llegan todas juntas. */
  pausa?(ms: number): Promise<void>;
}

const PAUSA_ENTRE_ARCHIVOS_MS = 600;
const esperar = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));
const motivoDe = (e: unknown): string => (e instanceof Error && e.message ? e.message : 'No se pudo generar el archivo.');

/**
 * Un archivo por agencia: pide el reporte de una agencia a la vez (cada pedido es chico, el servidor ya filtra por el ámbito
 * del usuario) y descarga su archivo antes de pasar a la siguiente. Así un reporte de años enteros nunca se arma completo en
 * memoria. Un error en una agencia no detiene a las demás; las agencias sin filas no generan archivo.
 */
export async function exportarPorAgencia(base: FiltrosReporte, agencias: AgenciaDestino[], deps: DependenciasPorAgencia): Promise<ResultadoPorAgencia> {
  const resultado: ResultadoPorAgencia = { exportadas: [], sinDatos: [], fallidas: [], pendientes: [], cancelado: false, sinBitacora: 0 };
  const pausa = deps.pausa ?? esperar;
  let descargo = false;

  for (let i = 0; i < agencias.length; i++) {
    const agencia = agencias[i];
    if (deps.cancelado?.()) {
      resultado.cancelado = true;
      resultado.pendientes = agencias.slice(i).map((a) => a.nombre);
      break;
    }
    const aviso = (estado: ProgresoPorAgencia['estado']) => deps.progreso?.({ actual: i + 1, total: agencias.length, agencia: agencia.nombre, estado });
    aviso('generando');
    const filtros: FiltrosReporte = { ...base, agenciaIds: [agencia.id] };
    try {
      const res = await deps.generar(filtros);
      if (!res.totalFilas) {
        resultado.sinDatos.push(agencia.nombre);
        aviso('sin-datos');
        continue;
      }
      if (descargo) await pausa(PAUSA_ENTRE_ARCHIVOS_MS);
      await deps.exportar(res, agencia);
      descargo = true;
      resultado.exportadas.push(agencia.nombre);
      aviso('exportada');
      try {
        await deps.registrar(filtros, res.totalFilas);
      } catch {
        resultado.sinBitacora++;
      }
    } catch (e) {
      resultado.fallidas.push({ agencia: agencia.nombre, motivo: motivoDe(e) });
      aviso('fallida');
    }
  }
  return resultado;
}

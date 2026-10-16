/** Tipos de los Reportes Operativos: reflejan lo que devuelve `POST /reportes/*`. */

export type TipoColumna = 'texto' | 'numero' | 'dinero' | 'fecha' | 'hora' | 'marca';
export type PlantillaReporte = 'CONTROL_ESPECIAL' | 'CONTROL_GENERAL' | 'TABLA';
export type FiltroExtra = 'estado' | 'lavador' | 'pulidor' | 'producto' | 'ubicacion' | 'semaforo';
export type ModoPeriodo = 'HOY' | 'SEMANA' | 'MES' | 'ANIO' | 'DIA' | 'SEMANA_DE' | 'MES_DE' | 'ANIO_DE' | 'RANGO';
export type ValorCelda = string | number | null;
export type FilaReporte = Record<string, ValorCelda>;

export interface ColumnaReporte {
  clave: string;
  titulo: string;
  tipo: TipoColumna;
  ancho: number;
}

export interface OpcionFiltroReporte {
  valor: string;
  etiqueta: string;
}

export interface ReporteCatalogo {
  id: string;
  nombre: string;
  modulo: string;
  descripcion: string;
  periodo: boolean;
  agrupar: 'AGENCIA' | 'UNICO' | 'RETO';
  plantilla: PlantillaReporte;
  extras: FiltroExtra[];
  estados: OpcionFiltroReporte[];
  ubicaciones: OpcionFiltroReporte[];
  semaforos: OpcionFiltroReporte[];
  columnas: ColumnaReporte[];
}

export interface OpcionesReportes {
  regiones: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string }[];
  agencias: { id: string; codigo: string; nombre: string; activa: boolean; regionId: string | null; clienteId: string | null }[];
  productos: { id: string; nombre: string }[];
  lavadores: { id: string; nombre: string; agenciaId: string | null }[];
  /** Pulidores fijos (con agencia) y móviles (sin agencia, con su región). */
  pulidores: { id: string; nombre: string; agenciaId: string | null; regionId: string | null }[];
}

export interface PeriodoReporte {
  modo: ModoPeriodo;
  fecha?: string;
  mes?: string;
  anio?: number;
  desde?: string;
  hasta?: string;
}

export interface FiltrosReporte {
  reporteId: string;
  regionId?: string;
  clienteId?: string;
  agenciaIds?: string[];
  periodo?: PeriodoReporte;
  estado?: string;
  lavadorId?: string;
  pulidorId?: string;
  productoId?: string;
  ubicacion?: 'AGENCIA' | 'PULIDOR' | 'BODEGA';
  semaforo?: 'VERDE' | 'AMARILLO' | 'ROJO';
}

export interface TotalReporte {
  clave: string;
  etiqueta: string;
  valor: number;
  tipo: 'numero' | 'dinero';
}

export interface BloqueReporte {
  clave: string;
  etiqueta: string;
  filas: FilaReporte[];
  totales: TotalReporte[];
}

export interface GrupoReporte {
  clave: string;
  titulo: string;
  tipo: 'AGENCIA' | 'BODEGA' | 'PULIDOR' | 'RETO' | 'GENERAL';
  /** Datos propios del grupo para su encabezado (p. ej. los de un reto). */
  datos?: { etiqueta: string; valor: string }[];
  region: string;
  cliente: string;
  agencia: string;
  responsable: string;
  bloques: BloqueReporte[];
  totales: TotalReporte[];
}

export interface ReporteGenerado {
  reporte: { id: string; nombre: string; modulo: string; plantilla: PlantillaReporte; periodo: boolean; agrupar: 'AGENCIA' | 'UNICO' | 'RETO' };
  generadoEn: string;
  generadoPor: string;
  filtros: {
    region: string;
    cliente: string;
    agencias: string;
    periodo: string;
    division: 'MES' | 'SEMANA' | 'DIA' | 'UNICO' | null;
    extras: { etiqueta: string; valor: string }[];
  };
  columnas: ColumnaReporte[];
  grupos: GrupoReporte[];
  totales: TotalReporte[];
  totalFilas: number;
  umbrales: { PDF: number; EXCEL: number };
}

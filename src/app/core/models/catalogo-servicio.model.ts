import { RecetaInsumoServicio } from './inventario.model';

export interface CatalogoServicio {
  id: number;
  nombre: string;
  codigo: string;
  categoria: 'GENERAL' | 'ESPECIAL' | 'EXTRA' | string;
  descripcion: string;
  estado: 'Activo' | 'Inactivo';
  requiereFoto?: boolean;
  requiereVideo?: boolean;
  insumosReceta?: RecetaInsumoServicio[];
  fechaCreacion?: string;
  precio?: number;
  /** Duración en minutos (BD). Calcula hora de salida en OT. */
  tiempoEstimadoMin: number;
}

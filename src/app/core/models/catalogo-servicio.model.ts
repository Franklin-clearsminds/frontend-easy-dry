export interface CatalogoServicio {
  id: number;
  nombre: string;
  codigo: string;
  categoria: 'GENERAL' | 'ESPECIAL';
  descripcion: string;
  estado: 'Activo' | 'Inactivo';
  requiereFoto: boolean;
  requiereVideo: boolean;
  fechaCreacion?: string;
}

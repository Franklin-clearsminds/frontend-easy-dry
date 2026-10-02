export interface Reto {
  id: string;
  titulo: string;
  descripcion: string;
  premio: string;
  fechaInicio: string; // ISO string (YYYY-MM-DD)
  fechaFin: string;    // ISO string (YYYY-MM-DD)
  regiones: string[];  // Ej: ['Todas'] o ['Sierra', 'Costa']
  marcas: string[];    // Ej: ['Todas'] o ['EasyDry', 'EasyDry Premium']
  sucursalesIds: Array<string | number>;
  creadoPorId: string | number;
  creadorNombre: string;
  creadorRol: string;
  estado: 'ACTIVO' | 'FINALIZADO' | 'PENDIENTE' | 'INACTIVO';
  criterios: string[]; // Ej: ['Velocidad promedio < 40 min', '0 Reclamos']
  ganadorNombre?: string;
  resultado?: string;
  cerradoPorId?: string;
  cerradoEn?: string;
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from '../config/env';

/** Paso de la checklist de una orden de mantenimiento (copia de la plantilla + lo que marcó el técnico). */
export interface PasoChecklistOrden {
  id: string;
  orden: number;
  texto: string;
  obligatorio: boolean;
  completado: boolean;
  observacion?: string | null;
  marcadoPorId?: string | null;
  marcadoPorNombre?: string | null;
  marcadoEn?: string | null;
}

export interface ChecklistOrden {
  success: boolean;
  pasos: PasoChecklistOrden[];
  requerido: boolean;
  obligatoriosPendientes: number;
  completo: boolean;
}

export type TipoChecklist = 'PREVENTIVO' | 'CORRECTIVO';

export interface PlantillaChecklist {
  id: string;
  tipo: TipoChecklist;
  nombre: string;
  version: number;
  activa: boolean;
  creadaPorNombre?: string | null;
  createdAt?: string;
  pasos: { orden: number; texto: string; obligatorio: boolean }[];
}

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private http = inject(HttpClient);

  /** Checklist de una orden; la primera consulta copia los pasos de la plantilla activa. */
  obtener(mantenimientoId: string): Observable<ChecklistOrden> {
    return this.http.post<ChecklistOrden>(apiUrl('/maquinaria/mantenimientos/checklist'), { mantenimientoId });
  }

  marcar(mantenimientoId: string, pasoId: string, completado: boolean, observacion?: string): Observable<any> {
    return this.http.post<any>(apiUrl('/maquinaria/mantenimientos/checklist/marcar'), {
      mantenimientoId, pasoId, completado, observacion: observacion?.trim() || undefined,
    });
  }

  plantillas(): Observable<PlantillaChecklist[]> {
    return this.http.post<PlantillaChecklist[]>(apiUrl('/maquinaria/checklist/plantillas/list'), {});
  }

  guardarPlantilla(tipo: TipoChecklist, pasos: { texto: string; obligatorio: boolean }[], nombre?: string): Observable<PlantillaChecklist> {
    return this.http.post<PlantillaChecklist>(apiUrl('/maquinaria/checklist/plantillas/guardar'), { tipo, nombre, pasos });
  }
}

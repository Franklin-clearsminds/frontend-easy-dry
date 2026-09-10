import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { CatalogoServicio, RecetaInsumoServicio } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class CatalogoServiciosMockService {
  private http = inject(HttpClient);

  // Estado reactivo: inicializa vacío — todo viene del backend
  private serviciosSubject = new BehaviorSubject<CatalogoServicio[]>([]);
  public servicios$ = this.serviciosSubject.asObservable();

  // Contexto de agencia devuelto por el backend para roles acotados (LIDER/APROBADOR)
  private agenciaCtxSubject = new BehaviorSubject<{ tieneServiciosEspeciales: boolean; servicioIds: number[] } | null>(null);
  public agenciaCtx$ = this.agenciaCtxSubject.asObservable();

  constructor() {
    this.getServicios().subscribe();
  }

  private mapBackendServicio(s: any): CatalogoServicio {
    const recetas: RecetaInsumoServicio[] = (s.recetas || []).map((r: any) => ({
      productoId: r.insumoId || r.insumo?.id,
      productoSKU: r.insumo?.codigoSKU || '',
      productoNombre: r.insumo?.nombre || 'Insumo',
      unidadMedida: r.unidadConsumo?.simbolo || r.unidadConsumo?.nombre || 'unidad',
      cantidadSugerida: Number(r.cantidadUsada || 0)
    }));

    return {
      id: s.id,
      codigo: s.codigo || '',
      nombre: s.nombre || '',
      categoria: s.categoria || 'GENERAL',
      descripcion: s.descripcion || '',
      estado: 'Activo',
      precio: Number(s.precio || 0),
      tiempoEstimadoMin: Number(s.tiempoEstimadoMin || 30),
      requiereFoto: s.categoria === 'ESPECIAL',
      requiereVideo: s.categoria === 'ESPECIAL',
      insumosReceta: recetas,
      fechaCreacion: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    };
  }

  getServicios(): Observable<CatalogoServicio[]> {
    return this.http.post<any>(apiUrl('/catalogos/servicios/list'), {}).pipe(
      map(res => {
        // El backend retorna un array plano para admins o {servicios, agencia} para líderes
        if (res && Array.isArray(res)) {
          this.agenciaCtxSubject.next(null);
          return (res as any[]).map(s => this.mapBackendServicio(s));
        }
        if (res && Array.isArray(res.servicios)) {
          // Guardar contexto de agencia para que el componente lo use
          this.agenciaCtxSubject.next(res.agencia ?? null);
          return (res.servicios as any[]).map(s => this.mapBackendServicio(s));
        }
        return [];
      }),
      tap(mapped => this.serviciosSubject.next(mapped)),
      catchError(() => of(this.serviciosSubject.value))
    );
  }

  getServiciosActivos(): Observable<CatalogoServicio[]> {
    return this.getServicios().pipe(
      map(list => list.filter(s => s.estado === 'Activo'))
    );
  }

  crearServicio(servicio: Omit<CatalogoServicio, 'id' | 'fechaCreacion'>): Observable<CatalogoServicio> {
    const payload = {
      codigo: servicio.codigo,
      nombre: servicio.nombre,
      categoria: servicio.categoria || 'GENERAL',
      descripcion: servicio.descripcion || '',
      precio: servicio.precio ?? 0,
      tiempoEstimadoMin: servicio.tiempoEstimadoMin ?? 30
    };

    return this.http.post<any>(apiUrl('/catalogos/servicios/create'), payload).pipe(
      map(res => {
        const mapped = this.mapBackendServicio(res);
        if (servicio.insumosReceta && servicio.insumosReceta.length > 0) {
          mapped.insumosReceta = [...servicio.insumosReceta];
        }
        return mapped;
      }),
      tap(created => {
        const current = this.serviciosSubject.value;
        this.serviciosSubject.next([...current, created]);

        if (servicio.insumosReceta && servicio.insumosReceta.length > 0) {
          this.guardarRecetasServicio(created.id, servicio.insumosReceta).subscribe();
        }
      }),
      catchError(err => {
        console.error('Error al crear servicio de catálogo:', err);
        throw err;
      })
    );
  }

  actualizarServicio(id: number, cambios: Partial<CatalogoServicio>): Observable<CatalogoServicio> {
    const payload = {
      id,
      codigo: cambios.codigo,
      nombre: cambios.nombre,
      categoria: cambios.categoria,
      descripcion: cambios.descripcion,
      precio: cambios.precio,
      tiempoEstimadoMin: cambios.tiempoEstimadoMin
    };

    return this.http.post<any>(apiUrl('/catalogos/servicios/update'), payload).pipe(
      map(res => {
        const mapped = this.mapBackendServicio(res);
        if (cambios.insumosReceta) {
          mapped.insumosReceta = [...cambios.insumosReceta];
        }
        return mapped;
      }),
      tap(updated => {
        const current = this.serviciosSubject.value;
        const idx = current.findIndex(s => s.id === id);
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...updated };
          this.serviciosSubject.next([...current]);
        }
        if (cambios.insumosReceta) {
          this.guardarRecetasServicio(id, cambios.insumosReceta).subscribe();
        }
      }),
      catchError(err => {
        console.error('Error al actualizar servicio de catálogo:', err);
        throw err;
      })
    );
  }

  eliminarServicio(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.post<any>(apiUrl('/catalogos/servicios/delete'), { id }).pipe(
      tap(() => {
        const current = this.serviciosSubject.value.filter(s => s.id !== id);
        this.serviciosSubject.next(current);
      }),
      catchError(err => {
        console.error('Error al eliminar servicio de catálogo:', err);
        throw err;
      })
    );
  }

  cambiarEstado(id: number, estado: 'Activo' | 'Inactivo'): Observable<boolean> {
    const current = this.serviciosSubject.value;
    const item = current.find(s => s.id === id);
    if (item) {
      item.estado = estado;
      this.serviciosSubject.next([...current]);
    }
    return of(true);
  }

  guardarRecetasServicio(catalogoServicioId: number, recetas: RecetaInsumoServicio[]): Observable<any> {
    if (!recetas || recetas.length === 0) {
      return of(null);
    }
    const items = recetas
      .filter(r => r.productoId && Number(r.cantidadSugerida) > 0)
      .map(r => ({
        insumoId: String(r.productoId),
        cantidadUsada: Number(r.cantidadSugerida),
        unidadConsumoId: String(r.unidadMedidaId || 'und_default'),
        esOpcional: false
      }));

    if (items.length === 0) return of(null);

    return this.http.post<any>(apiUrl('/operaciones/catalogos/recetas/asignar'), {
      catalogoServicioId,
      items
    }).pipe(
      catchError(err => {
        console.warn('Recetas guardadas en memoria local (endpoint opcional):', err?.message);
        return of(null);
      })
    );
  }

  asignarRecetaInsumo(catalogoServicioId: number, insumoId: string, cantidadUsada: number, unidadConsumoId?: string): Observable<any> {
    return this.guardarRecetasServicio(catalogoServicioId, [{
      productoId: insumoId,
      productoSKU: '',
      productoNombre: '',
      unidadMedida: '',
      unidadMedidaId: unidadConsumoId,
      cantidadSugerida: cantidadUsada
    }]);
  }

  eliminarRecetaInsumo(catalogoServicioId: number, insumoId: string): Observable<any> {
    return this.http.post<any>(apiUrl('/operaciones/catalogos/recetas/eliminar'), { catalogoServicioId, insumoId }).pipe(
      catchError(err => {
        console.error('Error al eliminar ítem de receta:', err);
        return of(null);
      })
    );
  }
}

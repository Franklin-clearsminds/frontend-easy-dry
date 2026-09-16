import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { CatalogoServicio, RecetaInsumoServicio } from '../models';
import { apiUrl } from '../config/env';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogoServiciosService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private serviciosSubject = new BehaviorSubject<CatalogoServicio[]>([]);
  public servicios$ = this.serviciosSubject.asObservable();

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
      unidadMedidaId: r.unidadConsumoId || r.unidadConsumo?.id || r.insumo?.unidadMedidaId,
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

  getServicios(agenciaId?: string): Observable<CatalogoServicio[]> {
    const user = this.auth.getCurrentUser();
    const role = String(user?.role || '').toUpperCase();
    const esLider =
      role.includes('LIDER') || role === 'APROBADOR' || role === 'LIDER_OPERADOR';
    const agenciaEfectiva =
      agenciaId ||
      (esLider && user?.agenciaId ? String(user.agenciaId) : undefined);

    const body: any = {};
    if (agenciaEfectiva) body.agenciaId = agenciaEfectiva;

    return this.http.post<any>(apiUrl('/catalogos/servicios/list'), body).pipe(
      map(res => {
        if (res && Array.isArray(res)) {
          this.agenciaCtxSubject.next(null);
          return (res as any[]).map(s => this.mapBackendServicio(s));
        }
        if (res && Array.isArray(res.servicios)) {
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
      codigo: (servicio.codigo || '').trim().toUpperCase(),
      nombre: (servicio.nombre || '').trim(),
      categoria: (servicio.categoria || 'GENERAL').trim().toUpperCase(),
      descripcion: (servicio.descripcion || '').trim(),
      precio: Number(servicio.precio || 0),
      tiempoEstimadoMin: Math.max(1, Math.round(Number(servicio.tiempoEstimadoMin ?? 30))),
    };

    return this.http.post<any>(apiUrl('/catalogos/servicios/create'), payload).pipe(
      switchMap(res => {
        if (servicio.insumosReceta && servicio.insumosReceta.length > 0) {
          return this.guardarRecetasServicio(res.id, servicio.insumosReceta).pipe(
            map(() => res),
            catchError(err => {
              console.error('Error al guardar recetas al crear servicio:', err);
              return of(res);
            })
          );
        }
        return of(res);
      }),
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
        this.getServicios().subscribe();
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
      precio: cambios.precio !== undefined ? Number(cambios.precio) : undefined,
      tiempoEstimadoMin: Math.max(
        1,
        Math.round(Number(cambios.tiempoEstimadoMin ?? 30)),
      ),
    };

    return this.http.post<any>(apiUrl('/catalogos/servicios/update'), payload).pipe(
      switchMap(res => {
        if (cambios.insumosReceta !== undefined) {
          return this.guardarRecetasServicio(id, cambios.insumosReceta).pipe(
            map(() => res),
            catchError(err => {
              console.error('Error al guardar recetas al actualizar servicio:', err);
              return of(res);
            })
          );
        }
        return of(res);
      }),
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
        this.getServicios().subscribe();
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
    const items = (recetas || [])
      .filter(r => r.productoId && Number(r.cantidadSugerida) > 0)
      .map(r => ({
        insumoId: String(r.productoId),
        cantidadUsada: Number(r.cantidadSugerida),
        unidadConsumoId: r.unidadMedidaId && r.unidadMedidaId !== 'und_default' ? String(r.unidadMedidaId) : undefined,
        esOpcional: false
      }));

    return this.http.post<any>(apiUrl('/operaciones/catalogos/recetas/asignar'), {
      catalogoServicioId,
      items
    }).pipe(
      tap(() => {
        this.getServicios().subscribe();
      }),
      catchError(err => {
        console.error('Error al guardar recetas de catálogo en backend:', err);
        throw err;
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

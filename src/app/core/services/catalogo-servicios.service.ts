import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { CatalogoServicio, RecetaInsumoServicio } from '../models';
import { apiUrl } from '../config/env';
import { AuthService } from './auth.service';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta } from '../utils/tabla-servidor';
import { normalizarPagina } from '../models/paginacion.model';

/** Sede a la que el servidor acotó el catálogo (solo llega cuando el usuario no es Admin ni Súper Admin y tiene sede). */
export interface AgenciaCatalogoCtx {
  tieneServiciosEspeciales: boolean;
  servicioIds: number[];
  nombre?: string;
}

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
      estado: s.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
      precio: Number(s.precio || 0),
      tiempoEstimadoMin: s.tiempoEstimadoMin != null ? Number(s.tiempoEstimadoMin) : 0,
      requiereFoto: s.categoria === 'ESPECIAL',
      requiereVideo: s.categoria === 'ESPECIAL',
      insumosReceta: recetas,
      fechaCreacion: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    };
  }

  getServicios(agenciaId?: string): Observable<CatalogoServicio[]> {
    // El alcance por sede lo resuelve el servidor; solo se envía la agencia si quien llama la pide.
    if (!this.auth.puede('catalogo.ver')) return of([]);
    const body: any = {};
    if (agenciaId) body.agenciaId = agenciaId;

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

  /**
   * Una página del catálogo: búsqueda por código o nombre, categoría (una o varias separadas por coma) y orden
   * (codigo, nombre, categoria, precio, tiempo, fecha) en el servidor. El alcance por sede lo aplica el servidor y, si
   * acota, viene en `resumen` (la sede). No toca el estado compartido de `servicios$`.
   */
  getServiciosPagina(c: Partial<ConsultaTabla> & { categoria?: string }): Observable<PaginaConResumen<CatalogoServicio, AgenciaCatalogoCtx>> {
    const body = cuerpoConsulta(c, ['categoria']);
    return this.http.post<any>(apiUrl('/catalogos/servicios/list'), body).pipe(
      map(res => {
        const pagina = normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number);
        return {
          pagina: { ...pagina, items: pagina.items.map(s => this.mapBackendServicio(s)) },
          resumen: (res?.agencia ?? undefined) as AgenciaCatalogoCtx | undefined,
        };
      })
    );
  }

  /** Siguiente código libre (SER-### o ESP-###) calculado por el servidor. */
  getSiguienteCodigo(categoria: string): Observable<string> {
    return this.http.post<{ codigo: string }>(apiUrl('/catalogos/servicios/siguiente-codigo'), { categoria }).pipe(
      map(r => r.codigo)
    );
  }

  getServiciosActivos(): Observable<CatalogoServicio[]> {
    return this.getServicios().pipe(
      map(list => list.filter(s => s.estado === 'Activo'))
    );
  }

  getServiciosEspeciales(): Observable<CatalogoServicio[]> {
    return this.http.post<any>(apiUrl('/catalogos/servicios/list'), { categoria: 'ESPECIAL' }).pipe(
      map(res => {
        const raw = Array.isArray(res) ? res : (Array.isArray(res?.servicios) ? res.servicios : []);
        return raw
          .map((s: any) => this.mapBackendServicio(s))
          .filter((s: CatalogoServicio) => String(s.categoria || '').toUpperCase() === 'ESPECIAL' && (s.estado === 'Activo' || !s.estado));
      }),
      catchError(() => of([]))
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
      estado: servicio.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
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
      estado: cambios.estado,
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
    return this.actualizarServicio(id, { estado }).pipe(
      map(() => true),
      catchError(err => {
        console.error('Error al cambiar el estado del servicio de catálogo:', err);
        throw err;
      })
    );
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

  /**
   * Historial de cambios de la receta de un servicio: qué insumo entró, cuál salió,
   * qué cantidad cambió, cuándo y quién lo hizo. Solo para roles de administración/bodega.
   */
  getHistorialReceta(catalogoServicioId: number): Observable<RecetaHistorialCambio[]> {
    return this.http.post<any[]>(apiUrl('/operaciones/catalogos/recetas/historial'), { catalogoServicioId }).pipe(
      map(res => (Array.isArray(res) ? res : []).map(h => ({
        id: h.id,
        loteId: h.loteId,
        tipoCambio: h.tipoCambio,
        insumoNombre: h.insumoNombre,
        insumoSKU: h.insumoSKU,
        unidadSimbolo: h.unidadSimbolo,
        cantidadAnterior: h.cantidadAnterior != null ? Number(h.cantidadAnterior) : null,
        cantidadNueva: h.cantidadNueva != null ? Number(h.cantidadNueva) : null,
        usuarioNombre: h.usuario ? `${h.usuario.name || ''} ${h.usuario.lastname || ''}`.trim() : '',
        fecha: h.createdAt,
      }))),
      catchError(err => {
        console.error('Error al obtener historial de receta:', err);
        return of([]);
      })
    );
  }
}

export interface RecetaHistorialCambio {
  id: string;
  loteId: string;
  tipoCambio: 'AGREGADO' | 'MODIFICADO' | 'ELIMINADO';
  insumoNombre: string;
  insumoSKU: string;
  unidadSimbolo: string;
  cantidadAnterior: number | null;
  cantidadNueva: number | null;
  usuarioNombre: string;
  fecha: string;
}

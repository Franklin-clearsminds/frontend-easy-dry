import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { CatalogoServicio, RecetaInsumoServicio } from '../models';
import { apiUrl } from '../config/env';

const INITIAL_CATALOGO_SERVICIOS: CatalogoServicio[] = [
  {
    id: 6,
    codigo: 'SER-001',
    nombre: 'Lavado Express Ecológico',
    categoria: 'GENERAL',
    descripcion: 'Lavado exterior en seco con formulación bio-degradable, limpieza de rines y vidrios exteriores.',
    estado: 'Activo',
    precio: 8.0,
    tiempoEstimadoMin: 20,
    insumosReceta: [
      { productoId: 'INS-LAV-001', productoSKU: 'INS-LAV-001', productoNombre: 'Shampoo Bio-Espuma Concentrado', unidadMedida: 'L', cantidadSugerida: 0.15 },
      { productoId: 'INS-TEX-011', productoSKU: 'INS-TEX-011', productoNombre: 'Toalla Microfibra 40x40cm 600 GSM', unidadMedida: 'und', cantidadSugerida: 1 }
    ],
    fechaCreacion: '2026-09-01'
  },
  {
    id: 7,
    codigo: 'SER-002',
    nombre: 'Lavado Completo con Cera Carnauba',
    categoria: 'GENERAL',
    descripcion: 'Lavado exterior ecológico, aspirado completo de habitáculo y maletero, encerado carnauba y brillo de llantas.',
    estado: 'Activo',
    precio: 14.0,
    tiempoEstimadoMin: 35,
    insumosReceta: [
      { productoId: 'INS-LAV-001', productoSKU: 'INS-LAV-001', productoNombre: 'Shampoo Bio-Espuma Concentrado', unidadMedida: 'L', cantidadSugerida: 0.25 },
      { productoId: 'INS-CER-002', productoSKU: 'INS-CER-002', productoNombre: 'Cera Carnauba Líquida High Gloss', unidadMedida: 'L', cantidadSugerida: 0.20 },
      { productoId: 'INS-LLA-005', productoSKU: 'INS-LLA-005', productoNombre: 'Acondicionador de Llantas Black Shine', unidadMedida: 'L', cantidadSugerida: 0.10 },
      { productoId: 'INS-TEX-011', productoSKU: 'INS-TEX-011', productoNombre: 'Toalla Microfibra 40x40cm 600 GSM', unidadMedida: 'und', cantidadSugerida: 1 }
    ],
    fechaCreacion: '2026-09-01'
  },
  {
    id: 8,
    codigo: 'SER-003',
    nombre: 'Lavado y Desinfección de Interiores',
    categoria: 'GENERAL',
    descripcion: 'Limpieza profunda de paneles, consola central, aspirado anti-ácaros y neutralización antibacterial de cabina.',
    estado: 'Activo',
    precio: 22.0,
    tiempoEstimadoMin: 45,
    insumosReceta: [
      { productoId: 'INS-DES-003', productoSKU: 'INS-DES-003', productoNombre: 'Desengrasante Multiuso Citrus Cleaner', unidadMedida: 'L', cantidadSugerida: 0.15 },
      { productoId: 'INS-AMB-006', productoSKU: 'INS-AMB-006', productoNombre: 'Neutralizador y Ambientador Fresh Car', unidadMedida: 'ml', cantidadSugerida: 30 },
      { productoId: 'INS-TEX-011', productoSKU: 'INS-TEX-011', productoNombre: 'Toalla Microfibra 40x40cm 600 GSM', unidadMedida: 'und', cantidadSugerida: 1 }
    ],
    fechaCreacion: '2026-09-01'
  },
  {
    id: 9,
    codigo: 'SER-004',
    nombre: 'Lavado de Chasis y Motor en Seco',
    categoria: 'GENERAL',
    descripcion: 'Desengrase minucioso de compartimento de motor y pasos de rueda con protección de plásticos técnicos.',
    estado: 'Activo',
    precio: 28.0,
    tiempoEstimadoMin: 50,
    insumosReceta: [
      { productoId: 'INS-DES-003', productoSKU: 'INS-DES-003', productoNombre: 'Desengrasante Multiuso Citrus Cleaner', unidadMedida: 'L', cantidadSugerida: 0.40 },
      { productoId: 'INS-LLA-005', productoSKU: 'INS-LLA-005', productoNombre: 'Acondicionador de Llantas Black Shine', unidadMedida: 'L', cantidadSugerida: 0.15 }
    ],
    fechaCreacion: '2026-09-01'
  },
  {
    id: 10,
    codigo: 'SER-005',
    nombre: 'Encerado Express y Protección UV',
    categoria: 'GENERAL',
    descripcion: 'Descontaminación rápida de carrocería y sellado con cera de alta duración contra rayos UV.',
    estado: 'Activo',
    precio: 16.0,
    tiempoEstimadoMin: 30,
    insumosReceta: [
      { productoId: 'INS-CER-002', productoSKU: 'INS-CER-002', productoNombre: 'Cera Carnauba Líquida High Gloss', unidadMedida: 'L', cantidadSugerida: 0.25 },
      { productoId: 'INS-TEX-011', productoSKU: 'INS-TEX-011', productoNombre: 'Toalla Microfibra 40x40cm 600 GSM', unidadMedida: 'und', cantidadSugerida: 1 }
    ],
    fechaCreacion: '2026-09-01'
  },
  {
    id: 11,
    codigo: 'SER-006',
    nombre: 'Tratamiento de Llantas y Parabrisas Pro',
    categoria: 'GENERAL',
    descripcion: 'Limpieza ácida de frenado en rines, acondicionamiento de neumáticos y repelente hidrofóbico en parabrisas.',
    estado: 'Activo',
    precio: 12.0,
    tiempoEstimadoMin: 25,
    insumosReceta: [
      { productoId: 'INS-LLA-005', productoSKU: 'INS-LLA-005', productoNombre: 'Acondicionador de Llantas Black Shine', unidadMedida: 'L', cantidadSugerida: 0.20 },
      { productoId: 'INS-VID-004', productoSKU: 'INS-VID-004', productoNombre: 'Limpiavidrios Anti-Empañante Pro', unidadMedida: 'L', cantidadSugerida: 0.15 }
    ],
    fechaCreacion: '2026-09-01'
  },
  // EXACTAMENTE 3 SERVICIOS ESPECIALES
  {
    id: 12,
    codigo: 'ESP-001',
    nombre: 'Corrección de Pintura y Pulido en 3 Pasos',
    categoria: 'ESPECIAL',
    descripcion: 'Eliminación quirúrgica de marcas de remolino, micro-rayas y defectos con acabado de brillo espejo.',
    estado: 'Activo',
    precio: 85.0,
    tiempoEstimadoMin: 180,
    insumosReceta: [
      { productoId: 'INS-PUL-007', productoSKU: 'INS-PUL-007', productoNombre: 'Pasta de Pulir Heavy Cut (Paso 1)', unidadMedida: 'kg', cantidadSugerida: 0.15 },
      { productoId: 'INS-PUL-008', productoSKU: 'INS-PUL-008', productoNombre: 'Pasta de Pulir Final Polish (Paso 2)', unidadMedida: 'kg', cantidadSugerida: 0.10 },
      { productoId: 'INS-ACC-012', productoSKU: 'INS-ACC-012', productoNombre: 'Pad de Pulido Lana Espuma 5 Pulgadas', unidadMedida: 'und', cantidadSugerida: 2 },
      { productoId: 'INS-TEX-011', productoSKU: 'INS-TEX-011', productoNombre: 'Toalla Microfibra 40x40cm 600 GSM', unidadMedida: 'und', cantidadSugerida: 2 }
    ],
    fechaCreacion: '2026-09-01'
  },
  {
    id: 13,
    codigo: 'ESP-002',
    nombre: 'Tratamiento Cerámico 9H Diamond Coating',
    categoria: 'ESPECIAL',
    descripcion: 'Nano-recubrimiento cerámico grado 9H con efecto hidrofóbico extremo, protección química y garantía de 3 años.',
    estado: 'Activo',
    precio: 180.0,
    tiempoEstimadoMin: 240,
    insumosReceta: [
      { productoId: 'INS-CER-009', productoSKU: 'INS-CER-009', productoNombre: 'Sellador Cerámico 9H Diamond Shield', unidadMedida: 'ml', cantidadSugerida: 50 },
      { productoId: 'INS-PUL-008', productoSKU: 'INS-PUL-008', productoNombre: 'Pasta de Pulir Final Polish (Paso 2)', unidadMedida: 'kg', cantidadSugerida: 0.08 },
      { productoId: 'INS-TEX-011', productoSKU: 'INS-TEX-011', productoNombre: 'Toalla Microfibra 40x40cm 600 GSM', unidadMedida: 'und', cantidadSugerida: 2 }
    ],
    fechaCreacion: '2026-09-01'
  },
  {
    id: 14,
    codigo: 'ESP-003',
    nombre: 'Detallado Integral de Tapicería y Renovación de Cuero',
    categoria: 'ESPECIAL',
    descripcion: 'Extracción de manchas en tapiz, limpieza de techo, nutrición de piel con ceras naturales y desinfección total.',
    estado: 'Activo',
    precio: 95.0,
    tiempoEstimadoMin: 150,
    insumosReceta: [
      { productoId: 'INS-TAP-010', productoSKU: 'INS-TAP-010', productoNombre: 'Limpiador y Nutridor de Cuero Premium', unidadMedida: 'ml', cantidadSugerida: 150 },
      { productoId: 'INS-DES-003', productoSKU: 'INS-DES-003', productoNombre: 'Desengrasante Multiuso Citrus Cleaner', unidadMedida: 'L', cantidadSugerida: 0.25 },
      { productoId: 'INS-AMB-006', productoSKU: 'INS-AMB-006', productoNombre: 'Neutralizador y Ambientador Fresh Car', unidadMedida: 'ml', cantidadSugerida: 50 },
      { productoId: 'INS-TEX-011', productoSKU: 'INS-TEX-011', productoNombre: 'Toalla Microfibra 40x40cm 600 GSM', unidadMedida: 'und', cantidadSugerida: 2 }
    ],
    fechaCreacion: '2026-09-01'
  }
];

@Injectable({
  providedIn: 'root'
})
export class CatalogoServiciosMockService {
  private http = inject(HttpClient);
  private serviciosSubject = new BehaviorSubject<CatalogoServicio[]>(INITIAL_CATALOGO_SERVICIOS);
  public servicios$ = this.serviciosSubject.asObservable();

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
    return this.http.post<any[]>(apiUrl('/catalogos/servicios/list'), {}).pipe(
      map(list => (list || []).map(s => this.mapBackendServicio(s))),
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

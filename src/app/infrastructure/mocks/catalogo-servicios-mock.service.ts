import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CatalogoServicio } from '../../domain';

@Injectable({
  providedIn: 'root'
})
export class CatalogoServiciosMockService {
  private initialServices: CatalogoServicio[] = [
    {
      id: 1,
      nombre: 'Lavado Express',
      codigo: 'SER-001',
      categoria: 'GENERAL',
      descripcion: 'Lavado básico exterior y aspirado',
      estado: 'Activo',
      requiereFoto: false,
      requiereVideo: false,
      insumosReceta: [
        { productoId: 1, productoSKU: 'QUIM-001', productoNombre: 'Shampoo Ecológico Ultra-Espuma', unidadMedida: 'Caneca 20L', cantidadSugerida: 1 },
        { productoId: 5, productoSKU: 'TEX-001', productoNombre: 'Paños de Microfibra Premium', unidadMedida: 'Pack x10', cantidadSugerida: 1 }
      ],
      fechaCreacion: '2026-08-01'
    },
    {
      id: 2,
      nombre: 'Lavado Completo',
      codigo: 'SER-002',
      categoria: 'GENERAL',
      descripcion: 'Lavado exterior, interior, brillo de llantas y aspirado profundo',
      estado: 'Activo',
      requiereFoto: true,
      requiereVideo: false,
      insumosReceta: [
        { productoId: 1, productoSKU: 'QUIM-001', productoNombre: 'Shampoo Ecológico Ultra-Espuma', unidadMedida: 'Caneca 20L', cantidadSugerida: 1 },
        { productoId: 4, productoSKU: 'QUIM-004', productoNombre: 'Gel Abrillantador de Neumáticos', unidadMedida: 'Galón (3.8L)', cantidadSugerida: 1 },
        { productoId: 5, productoSKU: 'TEX-001', productoNombre: 'Paños de Microfibra Premium', unidadMedida: 'Pack x10', cantidadSugerida: 1 }
      ],
      fechaCreacion: '2026-08-01'
    },
    {
      id: 3,
      nombre: 'Deluxe',
      codigo: 'SER-003',
      categoria: 'GENERAL',
      descripcion: 'Servicio premium general completo con encerado hidrofóbico',
      estado: 'Activo',
      requiereFoto: true,
      requiereVideo: false,
      insumosReceta: [
        { productoId: 1, productoSKU: 'QUIM-001', productoNombre: 'Shampoo Ecológico Ultra-Espuma', unidadMedida: 'Caneca 20L', cantidadSugerida: 1 },
        { productoId: 2, productoSKU: 'QUIM-002', productoNombre: 'Cera Líquida Polimérica Carnauba', unidadMedida: 'Galón (3.8L)', cantidadSugerida: 1 },
        { productoId: 4, productoSKU: 'QUIM-004', productoNombre: 'Gel Abrillantador de Neumáticos', unidadMedida: 'Galón (3.8L)', cantidadSugerida: 1 },
        { productoId: 5, productoSKU: 'TEX-001', productoNombre: 'Paños de Microfibra Premium', unidadMedida: 'Pack x10', cantidadSugerida: 2 }
      ],
      fechaCreacion: '2026-08-01'
    },
    {
      id: 4,
      nombre: 'Retoque',
      codigo: 'SER-004',
      categoria: 'GENERAL',
      descripcion: 'Limpieza rápida exterior',
      estado: 'Activo',
      requiereFoto: false,
      requiereVideo: false,
      insumosReceta: [
        { productoId: 1, productoSKU: 'QUIM-001', productoNombre: 'Shampoo Ecológico Ultra-Espuma', unidadMedida: 'Caneca 20L', cantidadSugerida: 1 }
      ],
      fechaCreacion: '2026-08-01'
    },
    {
      id: 5,
      nombre: 'Pulido',
      codigo: 'ESP-001',
      categoria: 'ESPECIAL',
      descripcion: 'Pulido de carrocería para eliminar rayones leves',
      estado: 'Activo',
      requiereFoto: true,
      requiereVideo: true,
      insumosReceta: [
        { productoId: 2, productoSKU: 'QUIM-002', productoNombre: 'Cera Líquida Polimérica Carnauba', unidadMedida: 'Galón (3.8L)', cantidadSugerida: 1 },
        { productoId: 5, productoSKU: 'TEX-001', productoNombre: 'Paños de Microfibra Premium', unidadMedida: 'Pack x10', cantidadSugerida: 2 }
      ],
      fechaCreacion: '2026-08-02'
    },
    {
      id: 6,
      nombre: 'Micro Pulido',
      codigo: 'ESP-002',
      categoria: 'ESPECIAL',
      descripcion: 'Restauración de pintura con pulido fino',
      estado: 'Activo',
      requiereFoto: true,
      requiereVideo: true,
      fechaCreacion: '2026-08-02'
    },
    {
      id: 7,
      nombre: 'Recubrimiento Cerámico 1 año',
      codigo: 'ESP-003',
      categoria: 'ESPECIAL',
      descripcion: 'Protección cerámica básica de 1 año',
      estado: 'Activo',
      requiereFoto: true,
      requiereVideo: true,
      fechaCreacion: '2026-08-05'
    },
    {
      id: 8,
      nombre: 'Recubrimiento Cerámico 3 años',
      codigo: 'ESP-004',
      categoria: 'ESPECIAL',
      descripcion: 'Protección cerámica media de 3 años',
      estado: 'Activo',
      requiereFoto: true,
      requiereVideo: true,
      fechaCreacion: '2026-08-05'
    },
    {
      id: 9,
      nombre: 'Lavado de motor',
      codigo: 'ESP-005',
      categoria: 'ESPECIAL',
      descripcion: 'Limpieza profunda de motor al vapor',
      estado: 'Activo',
      requiereFoto: true,
      requiereVideo: false,
      fechaCreacion: '2026-08-10'
    }
  ];

  private loadStoredServices(): CatalogoServicio[] {
    try {
      const stored = localStorage.getItem('easydry_catalogo_servicios_v3');
      return stored ? JSON.parse(stored) : this.initialServices;
    } catch {
      return this.initialServices;
    }
  }

  private saveStoredServices(data: CatalogoServicio[]): void {
    try {
      localStorage.setItem('easydry_catalogo_servicios_v3', JSON.stringify(data));
    } catch {}
  }

  private serviciosSubject = new BehaviorSubject<CatalogoServicio[]>(this.loadStoredServices());
  public servicios$ = this.serviciosSubject.asObservable();

  getServicios(): Observable<CatalogoServicio[]> {
    return of(this.serviciosSubject.value).pipe(delay(300));
  }

  getServiciosActivos(): Observable<CatalogoServicio[]> {
    const activos = this.serviciosSubject.value.filter(s => s.estado === 'Activo');
    return of(activos).pipe(delay(150));
  }

  crearServicio(servicio: Omit<CatalogoServicio, 'id' | 'fechaCreacion'>): Observable<CatalogoServicio> {
    const nuevo: CatalogoServicio = {
      ...servicio,
      id: Math.max(...this.serviciosSubject.value.map(s => s.id), 0) + 1,
      fechaCreacion: new Date().toISOString().split('T')[0]
    };
    
    const actualizados = [...this.serviciosSubject.value, nuevo];
    this.saveStoredServices(actualizados);
    this.serviciosSubject.next(actualizados);
    return of(nuevo).pipe(delay(300));
  }

  actualizarServicio(id: number, cambios: Partial<CatalogoServicio>): Observable<CatalogoServicio> {
    const actualizados = this.serviciosSubject.value.map(s => 
      s.id === id ? { ...s, ...cambios } : s
    );
    this.saveStoredServices(actualizados);
    this.serviciosSubject.next(actualizados);
    const modificado = actualizados.find(s => s.id === id)!;
    return of(modificado).pipe(delay(300));
  }

  cambiarEstado(id: number, estado: 'Activo' | 'Inactivo'): Observable<boolean> {
    const actualizados = this.serviciosSubject.value.map(s => 
      s.id === id ? { ...s, estado } : s
    );
    this.saveStoredServices(actualizados);
    this.serviciosSubject.next(actualizados);
    return of(true).pipe(delay(250));
  }
}

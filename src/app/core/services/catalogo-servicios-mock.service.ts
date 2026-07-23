import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CatalogoServicio } from '../models';

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
      fechaCreacion: '2026-08-01'
    },
    {
      id: 3,
      nombre: 'Deluxe',
      codigo: 'SER-003',
      categoria: 'GENERAL',
      descripcion: 'Servicio premium general completo',
      estado: 'Activo',
      requiereFoto: true,
      requiereVideo: false,
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

  private serviciosSubject = new BehaviorSubject<CatalogoServicio[]>(this.initialServices);
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
      id: Math.max(...this.serviciosSubject.value.map(s => s.id)) + 1,
      fechaCreacion: new Date().toISOString().split('T')[0]
    };
    
    const actualizados = [...this.serviciosSubject.value, nuevo];
    this.serviciosSubject.next(actualizados);
    return of(nuevo).pipe(delay(400));
  }

  actualizarServicio(id: number, cambios: Partial<CatalogoServicio>): Observable<CatalogoServicio> {
    const actualizados = this.serviciosSubject.value.map(s => 
      s.id === id ? { ...s, ...cambios } : s
    );
    this.serviciosSubject.next(actualizados);
    const modificado = actualizados.find(s => s.id === id)!;
    return of(modificado).pipe(delay(400));
  }

  cambiarEstado(id: number, estado: 'Activo' | 'Inactivo'): Observable<boolean> {
    const actualizados = this.serviciosSubject.value.map(s => 
      s.id === id ? { ...s, estado } : s
    );
    this.serviciosSubject.next(actualizados);
    return of(true).pipe(delay(300));
  }
}

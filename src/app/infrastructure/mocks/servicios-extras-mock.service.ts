import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { ServicioExtra, RecetaInsumoServicio } from '../../domain';

const SUCURSALES_RED = [
  'EasyDry Quito Norte',
  'EasyDry Quito Sur',
  'EasyDry Cumbayá',
  'EasyDry Guayaquil'
];

const INITIAL_SERVICIOS_EXTRAS: ServicioExtra[] = [
  {
    id: 1,
    codigoSE: 'SE-2026-001',
    servicioNombre: 'Pulido Especial en Profundidad',
    servicioDescripcion: 'Pulido de dos etapas con almohadilla de espuma y compuesto abrasivo medio para eliminar rallones finos.',
    operadorId: 1,
    operadorNombre: 'Juan Pérez',
    sucursales: ['EasyDry Quito Norte', 'EasyDry Cumbayá'],
    insumosReceta: [
      { productoId: 2, productoSKU: 'QUIM-002', productoNombre: 'Cera Líquida Polimérica Carnauba Gold', unidadMedida: 'Galón (3.8L)', cantidadSugerida: 1 },
      { productoId: 5, productoSKU: 'TEX-001', productoNombre: 'Paños de Microfibra Premium', unidadMedida: 'Pack x10', cantidadSugerida: 2 }
    ],
    estado: 'Pendiente',
    fechaProgramada: '2026-09-01',
    notas: 'Prioridad alta, cliente VIP con flota de 4 vehículos.',
    creadoPor: 'Franklin Administrador',
    fechaCreacion: '2026-08-25'
  },
  {
    id: 2,
    codigoSE: 'SE-2026-002',
    servicioNombre: 'Lavado Motor & Chasis Completo',
    servicioDescripcion: 'Desengrasado de motor, compartimento y chasis con protección anticorrosiva.',
    operadorId: 2,
    operadorNombre: 'Carlos López',
    sucursales: ['EasyDry Guayaquil'],
    insumosReceta: [
      { productoId: 3, productoSKU: 'QUIM-003', productoNombre: 'Desengrasante Motor & Chasis Biodegradable', unidadMedida: 'Caneca 20L', cantidadSugerida: 1 },
      { productoId: 6, productoSKU: 'EPP-001', productoNombre: 'Guantes de Nitrilo Industrial', unidadMedida: 'Caja x50', cantidadSugerida: 1 }
    ],
    estado: 'En Proceso',
    fechaProgramada: '2026-08-27',
    notas: 'Cliente requiere factura y reporte fotográfico completo.',
    creadoPor: 'Franklin Administrador',
    fechaCreacion: '2026-08-24'
  },
  {
    id: 3,
    codigoSE: 'SE-2026-003',
    servicioNombre: 'Recubrimiento Cerámico Premium',
    servicioDescripcion: 'Aplicación de recubrimiento cerámico SiO2 con duración garantizada de 12 meses.',
    operadorId: 1,
    operadorNombre: 'Juan Pérez',
    sucursales: ['EasyDry Quito Norte', 'EasyDry Quito Sur', 'EasyDry Cumbayá', 'EasyDry Guayaquil'],
    insumosReceta: [
      { productoId: 2, productoSKU: 'QUIM-002', productoNombre: 'Cera Líquida Polimérica Carnauba Gold', unidadMedida: 'Galón (3.8L)', cantidadSugerida: 2 },
      { productoId: 5, productoSKU: 'TEX-001', productoNombre: 'Paños de Microfibra Premium', unidadMedida: 'Pack x10', cantidadSugerida: 3 },
      { productoId: 7, productoSKU: 'ACC-001', productoNombre: 'Atomizador Industrial Heavy Duty', unidadMedida: 'Unidad (u)', cantidadSugerida: 1 }
    ],
    estado: 'Completado',
    fechaProgramada: '2026-08-20',
    fechaCompletado: '2026-08-21',
    notas: 'Realizado en tiempo récord. Cliente muy satisfecho.',
    creadoPor: 'Franklin Administrador',
    fechaCreacion: '2026-08-18'
  }
];

@Injectable({ providedIn: 'root' })
export class ServiciosExtrasMockService {

  private serviciosSubject = new BehaviorSubject<ServicioExtra[]>(
    JSON.parse(JSON.stringify(INITIAL_SERVICIOS_EXTRAS))
  );

  public serviciosExtras$ = this.serviciosSubject.asObservable();

  get sucursalesDisponibles(): string[] {
    return SUCURSALES_RED;
  }

  getServiciosExtras(): Observable<ServicioExtra[]> {
    return this.serviciosExtras$.pipe(delay(200));
  }

  getServicioExtraById(id: number): Observable<ServicioExtra | undefined> {
    return this.serviciosExtras$.pipe(
      map(list => list.find(s => s.id === id)),
      delay(150)
    );
  }

  crearServicioExtra(data: Omit<ServicioExtra, 'id' | 'codigoSE' | 'fechaCreacion'>): Observable<ServicioExtra> {
    const current = this.serviciosSubject.value;
    const nextId = Math.max(...current.map(s => s.id), 0) + 1;
    const anio = new Date().getFullYear();
    const nuevo: ServicioExtra = {
      ...data,
      id: nextId,
      codigoSE: 'SE-' + anio + '-' + String(nextId).padStart(3, '0'),
      fechaCreacion: new Date().toISOString().substring(0, 10)
    };
    this.serviciosSubject.next([nuevo, ...current]);
    return of(nuevo).pipe(delay(300));
  }

  actualizarServicioExtra(id: number, updates: Partial<ServicioExtra>): Observable<ServicioExtra | null> {
    const current = this.serviciosSubject.value;
    const idx = current.findIndex(s => s.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updates };
      this.serviciosSubject.next([...current]);
      return of(current[idx]).pipe(delay(200));
    }
    return of(null);
  }

  cambiarEstado(id: number, estado: ServicioExtra['estado']): Observable<ServicioExtra | null> {
    const updates: Partial<ServicioExtra> = { estado };
    if (estado === 'Completado') {
      updates.fechaCompletado = new Date().toISOString().substring(0, 10);
    }
    return this.actualizarServicioExtra(id, updates);
  }

  eliminarServicioExtra(id: number): Observable<boolean> {
    const current = this.serviciosSubject.value.filter(s => s.id !== id);
    this.serviciosSubject.next(current);
    return of(true).pipe(delay(200));
  }
}

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { MovimientoRedSucursal, Sucursal } from '../models';
import { MOCK_MOVIMIENTOS_RED, MOCK_SUCURSALES } from '../mocks/sucursales.mock';
import { RegionMockService } from './region-mock.service';
import { MarcaSucursalMockService } from './marca-sucursal-mock.service';

@Injectable({
  providedIn: 'root'
})
export class SucursalMockService {
  private regionService = inject(RegionMockService);
  private marcaService = inject(MarcaSucursalMockService);
  private readonly STORAGE_KEY = 'easydry_sucursales_v2';

  private sucursalesSubject = new BehaviorSubject<Sucursal[]>(this.cargarSucursales());
  public sucursales$ = this.sucursalesSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoRedSucursal[]>([...MOCK_MOVIMIENTOS_RED]);
  public movimientos$ = this.movimientosSubject.asObservable();

  private cargarSucursales(): Sucursal[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Sucursal[];
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map(s => this.hidratarServicios(s));
        }
      }
    } catch {}
    return MOCK_SUCURSALES.map(s => this.hidratarServicios({ ...s }));
  }

  private hidratarServicios(s: Sucursal): Sucursal {
    const mock = MOCK_SUCURSALES.find(m => m.id === s.id);
    return {
      ...s,
      servicioIds: Array.isArray(s.servicioIds) ? [...s.servicioIds] : [...(mock?.servicioIds || [])],
      serviciosNombres: Array.isArray(s.serviciosNombres) ? [...s.serviciosNombres] : [...(mock?.serviciosNombres || [])]
    };
  }

  private persistir(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sucursalesSubject.value));
    } catch {}
  }

  getSucursalPorNombre(nombre?: string): Sucursal | undefined {
    if (!nombre) return undefined;
    const n = nombre.toLowerCase();
    return this.sucursalesSubject.value.find(
      s => s.nombre.toLowerCase() === n || n.includes(s.nombre.toLowerCase()) || s.nombre.toLowerCase().includes(n.replace(' (costa)', ''))
    );
  }

  getSucursales(): Observable<Sucursal[]> {
    return this.sucursales$;
  }

  getSucursalById(id: number): Observable<Sucursal | undefined> {
    return this.sucursales$.pipe(
      map(list => list.find(s => s.id === id)),
      delay(150)
    );
  }

  getMovimientos(): Observable<MovimientoRedSucursal[]> {
    return this.movimientos$.pipe(delay(120));
  }

  crearSucursal(suc: Omit<Sucursal, 'id'>): Observable<Sucursal> {
    const current = this.sucursalesSubject.value;
    const conCatalogo = this.aplicarCatalogo(suc);
    const nueva: Sucursal = {
      ...conCatalogo,
      id: Math.max(...current.map(s => s.id), 0) + 1,
      operadoresActivos: suc.operadoresActivos ?? 0,
      maquinasAsignadasCount: suc.maquinasAsignadasCount ?? 0,
      serviciosRealizadosMes: suc.serviciosRealizadosMes ?? 0
    };
    this.sucursalesSubject.next([...current, nueva]);
    this.persistir();
    return of(nueva).pipe(delay(300));
  }

  actualizarSucursal(suc: Sucursal, auditoria?: { motivo?: string; realizadoPor?: string }): Observable<Sucursal> {
    const actualizada = this.aplicarCatalogo(suc);
    const current = this.sucursalesSubject.value;
    const index = current.findIndex(s => s.id === suc.id);
    if (index !== -1) {
      const original = current[index];
      this.registrarCambiosCatalogo(original, actualizada, auditoria);
      current[index] = { ...actualizada };
      this.sucursalesSubject.next([...current]);
      this.persistir();
    }
    return of(actualizada).pipe(delay(200));
  }

  transferirSucursal(params: {
    sucursalId: number;
    regionId?: number;
    marcaId?: number;
    motivo: string;
    realizadoPor: string;
  }): Observable<Sucursal | null> {
    const current = this.sucursalesSubject.value;
    const index = current.findIndex(s => s.id === params.sucursalId);
    if (index === -1) return of(null);

    const original = current[index];
    const next: Sucursal = { ...original };
    const movimientos: MovimientoRedSucursal[] = [];
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let nextMovId = Math.max(...this.movimientosSubject.value.map(m => m.id), 0);

    if (params.regionId && params.regionId !== original.regionId) {
      const region = this.regionService.getById(params.regionId);
      nextMovId += 1;
      movimientos.push({
        id: nextMovId,
        sucursalId: original.id,
        sucursalNombre: original.nombre,
        tipo: 'REGION',
        valorAnterior: original.regionNombre || 'Sin región',
        valorNuevo: region?.nombre || 'Sin región',
        motivo: params.motivo,
        realizadoPor: params.realizadoPor,
        fecha: ahora
      });
      next.regionId = region?.id;
      next.regionNombre = region?.nombre;
    }

    if (params.marcaId && params.marcaId !== original.marcaId) {
      const marca = this.marcaService.getById(params.marcaId);
      nextMovId += 1;
      movimientos.push({
        id: nextMovId,
        sucursalId: original.id,
        sucursalNombre: original.nombre,
        tipo: 'MARCA',
        valorAnterior: original.marcaNombre || 'Sin marca',
        valorNuevo: marca?.nombre || 'Sin marca',
        motivo: params.motivo,
        realizadoPor: params.realizadoPor,
        fecha: ahora
      });
      next.marcaId = marca?.id;
      next.marcaNombre = marca?.nombre;
    }

    current[index] = next;
    this.sucursalesSubject.next([...current]);
    this.persistir();
    if (movimientos.length > 0) {
      this.movimientosSubject.next([...movimientos, ...this.movimientosSubject.value]);
    }
    return of(next).pipe(delay(250));
  }

  sincronizarNombresCatalogo(): void {
    const regiones = this.regionService.getActivas();
    const marcas = this.marcaService.getActivas();
    const actualizadas = this.sucursalesSubject.value.map(s => {
      const region = regiones.find(r => r.id === s.regionId) || this.regionService.getById(s.regionId || 0);
      const marca = marcas.find(m => m.id === s.marcaId) || this.marcaService.getById(s.marcaId || 0);
      return {
        ...s,
        regionNombre: region?.nombre || s.regionNombre,
        marcaNombre: marca?.nombre || s.marcaNombre
      };
    });
    this.sucursalesSubject.next(actualizadas);
    this.persistir();
  }

  private registrarCambiosCatalogo(
    original: Sucursal,
    actualizada: Sucursal,
    auditoria?: { motivo?: string; realizadoPor?: string }
  ): void {
    const motivo = auditoria?.motivo || 'Actualización desde ficha de sucursal';
    const realizadoPor = auditoria?.realizadoPor || 'Sistema';
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let nextMovId = Math.max(...this.movimientosSubject.value.map(m => m.id), 0);
    const movimientos: MovimientoRedSucursal[] = [];

    if (actualizada.regionId && actualizada.regionId !== original.regionId) {
      nextMovId += 1;
      movimientos.push({
        id: nextMovId,
        sucursalId: original.id,
        sucursalNombre: actualizada.nombre,
        tipo: 'REGION',
        valorAnterior: original.regionNombre || 'Sin región',
        valorNuevo: actualizada.regionNombre || 'Sin región',
        motivo,
        realizadoPor,
        fecha: ahora
      });
    }
    if (actualizada.marcaId && actualizada.marcaId !== original.marcaId) {
      nextMovId += 1;
      movimientos.push({
        id: nextMovId,
        sucursalId: original.id,
        sucursalNombre: actualizada.nombre,
        tipo: 'MARCA',
        valorAnterior: original.marcaNombre || 'Sin marca',
        valorNuevo: actualizada.marcaNombre || 'Sin marca',
        motivo,
        realizadoPor,
        fecha: ahora
      });
    }
    if (movimientos.length > 0) {
      this.movimientosSubject.next([...movimientos, ...this.movimientosSubject.value]);
    }
  }

  private aplicarCatalogo(suc: Sucursal | Omit<Sucursal, 'id'>): Sucursal {
    const region = suc.regionId ? this.regionService.getById(suc.regionId) : undefined;
    const marca = suc.marcaId ? this.marcaService.getById(suc.marcaId) : undefined;
    return {
      ...(suc as Sucursal),
      regionNombre: region?.nombre || suc.regionNombre,
      marcaNombre: marca?.nombre || suc.marcaNombre
    };
  }
}

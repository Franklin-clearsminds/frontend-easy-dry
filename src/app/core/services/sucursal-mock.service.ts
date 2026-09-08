import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { MovimientoRedSucursal, Sucursal } from '../models';
import { RegionMockService } from './region-mock.service';
import { MarcaSucursalMockService } from './marca-sucursal-mock.service';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class SucursalMockService {
  private http = inject(HttpClient);
  private regionService = inject(RegionMockService);
  private marcaService = inject(MarcaSucursalMockService);
  private readonly STORAGE_KEY = 'easydry_sucursales_v2';

  private sucursalesSubject = new BehaviorSubject<Sucursal[]>([]);
  public sucursales$ = this.sucursalesSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoRedSucursal[]>([]);
  public movimientos$ = this.movimientosSubject.asObservable();

  constructor() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {}
  }

  private mapBackendAgencia(a: any): Sucursal {
    const ger = a.usuarios?.find((u: any) => u.role?.namerol === 'GERENTE' || u.role?.namerol?.includes('GERENTE'));
    return {
      id: a.id,
      nombre: a.nombre,
      ciudad: a.regionRel?.nombre || a.region || 'Quito',
      direccion: a.direccion || '',
      estado: a.estado === 1 ? 'Activo' : (a.estado === 0 ? 'Inactivo' : 'Mantenimiento'),
      cantidadBahias: a.numeroBahias || (a.bahias?.length ?? a._count?.bahias ?? 0),
      responsable: ger ? `${ger.name || ''} ${ger.lastname || ''}`.trim() : 'Sin Asignar',
      operadoresActivos: a.usuarios?.filter((u: any) => u.estado === 1)?.length || a._count?.usuarios || 0,
      maquinasAsignadasCount: 0,
      serviciosRealizadosMes: 0,
      regionId: a.regionId || a.regionRel?.id,
      regionNombre: a.regionRel?.nombre || a.region || 'Sin región',
      marcaId: a.marcaId || a.marca?.id,
      marcaNombre: a.marca?.nombre || 'Sin marca',
      servicioIds: [],
      serviciosNombres: [],
      telefono: a.telefono || '',
      requiereAprobacion: false,
      gerenteId: ger?.id,
      gerenteNombre: ger ? `${ger.name} ${ger.lastname}`.trim() : undefined,
      tieneServiciosEspeciales: false
    };
  }

  getSucursalPorNombre(nombre?: string): Sucursal | undefined {
    if (!nombre) return undefined;
    const n = nombre.toLowerCase();
    return this.sucursalesSubject.value.find(
      s => s.nombre.toLowerCase() === n || n.includes(s.nombre.toLowerCase()) || s.nombre.toLowerCase().includes(n.replace(' (costa)', ''))
    );
  }

  getSucursales(): Observable<Sucursal[]> {
    return this.http.post<any[]>(apiUrl('/agencias/list'), {}).pipe(
      map(items => (items || []).map(a => this.mapBackendAgencia(a))),
      tap(mapped => this.sucursalesSubject.next(mapped)),
      catchError(() => of(this.sucursalesSubject.value))
    );
  }

  getActivas(): Sucursal[] {
    return this.sucursalesSubject.value;
  }

  getSucursalById(id: number | string): Observable<Sucursal | undefined> {
    const existing = this.sucursalesSubject.value.find(s => String(s.id) === String(id));
    if (existing) {
      return of(existing);
    }
    return this.getSucursales().pipe(
      map(list => list.find(s => String(s.id) === String(id)))
    );
  }

  getMovimientos(): Observable<MovimientoRedSucursal[]> {
    return this.movimientos$;
  }

  crearSucursal(suc: Omit<Sucursal, 'id'>): Observable<Sucursal> {
    const slug = (suc.nombre || 'AGN').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const codigo = `AGN-${slug}-${Date.now().toString().slice(-4)}`;
    const payload = {
      codigo,
      nombre: suc.nombre,
      region: suc.ciudad || 'Quito',
      regionId: suc.regionId ? String(suc.regionId) : undefined,
      direccion: suc.direccion || '',
      telefono: suc.telefono || '',
      numeroBahias: Number(suc.cantidadBahias) || 2,
      marcaId: suc.marcaId ? String(suc.marcaId) : undefined,
      estado: suc.estado === 'Inactivo' ? 0 : 1
    };

    return this.http.post<any>(apiUrl('/agencias/create'), payload).pipe(
      map(res => this.mapBackendAgencia(res)),
      tap(nueva => {
        const current = this.sucursalesSubject.value;
        this.sucursalesSubject.next([...current, nueva]);
      }),
      catchError(err => {
        console.error('Error al crear sucursal en backend:', err);
        throw err;
      })
    );
  }

  actualizarSucursal(suc: Sucursal, auditoria?: { motivo?: string; realizadoPor?: string }): Observable<Sucursal> {
    const payload = {
      id: String(suc.id),
      nombre: suc.nombre,
      region: suc.ciudad,
      regionId: suc.regionId ? String(suc.regionId) : undefined,
      direccion: suc.direccion,
      telefono: suc.telefono,
      numeroBahias: Number(suc.cantidadBahias),
      marcaId: suc.marcaId ? String(suc.marcaId) : undefined,
      estado: suc.estado === 'Inactivo' ? 0 : 1
    };

    return this.http.post<any>(apiUrl('/agencias/update'), payload).pipe(
      map(res => this.mapBackendAgencia(res)),
      tap(actualizada => {
        const current = this.sucursalesSubject.value;
        const index = current.findIndex(s => String(s.id) === String(suc.id));
        if (index !== -1) {
          const original = current[index];
          this.registrarCambiosCatalogo(original, actualizada, auditoria);
          current[index] = { ...actualizada, servicioIds: suc.servicioIds, serviciosNombres: suc.serviciosNombres };
          this.sucursalesSubject.next([...current]);
        }
      }),
      catchError(() => of(suc))
    );
  }

  transferirSucursal(params: {
    sucursalId: number | string;
    regionId?: number | string;
    marcaId?: number | string;
    motivo: string;
    realizadoPor: string;
  }): Observable<Sucursal | null> {
    const current = this.sucursalesSubject.value;
    const index = current.findIndex(s => String(s.id) === String(params.sucursalId));
    if (index === -1) return of(null);

    const original = current[index];
    const next: Sucursal = { ...original };
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const payload: any = { id: String(params.sucursalId) };
    if (params.regionId) payload.regionId = String(params.regionId);
    if (params.marcaId) payload.marcaId = String(params.marcaId);

    return this.http.post<any>(apiUrl('/agencias/update'), payload).pipe(
      map(res => this.mapBackendAgencia(res)),
      tap(actualizada => {
        current[index] = { ...actualizada };
        this.sucursalesSubject.next([...current]);
        const nextMovId = this.movimientosSubject.value.length + 1;
        this.movimientosSubject.next([
          {
            id: nextMovId,
            sucursalId: original.id,
            sucursalNombre: original.nombre,
            tipo: params.regionId ? 'REGION' : 'MARCA',
            valorAnterior: original.regionNombre || original.marcaNombre || '',
            valorNuevo: actualizada.regionNombre || actualizada.marcaNombre || '',
            motivo: params.motivo,
            realizadoPor: params.realizadoPor,
            fecha: ahora
          },
          ...this.movimientosSubject.value
        ]);
      }),
      catchError(() => of(next))
    );
  }

  sincronizarNombresCatalogo(): void {
    const regiones = this.regionService.getActivas();
    const marcas = this.marcaService.getActivas();
    const actualizadas = this.sucursalesSubject.value.map(s => {
      const region = regiones.find(r => String(r.id) === String(s.regionId)) || this.regionService.getById(s.regionId || 0);
      const marca = marcas.find(m => String(m.id) === String(s.marcaId)) || this.marcaService.getById(s.marcaId || 0);
      return {
        ...s,
        regionNombre: region?.nombre || s.regionNombre,
        marcaNombre: marca?.nombre || s.marcaNombre
      };
    });
    this.sucursalesSubject.next(actualizadas);
  }

  private registrarCambiosCatalogo(
    original: Sucursal,
    actualizada: Sucursal,
    auditoria?: { motivo?: string; realizadoPor?: string }
  ): void {
    const motivo = auditoria?.motivo || 'Actualización desde ficha de sucursal';
    const realizadoPor = auditoria?.realizadoPor || 'Sistema';
    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let nextMovId = this.movimientosSubject.value.length;
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
}

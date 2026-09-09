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

  private readonly CONFIG_STORAGE_KEY = 'easydry_sucursal_config_map_v1';

  constructor() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {}
  }

  private getBranchConfigMap(): Record<string, any> {
    try {
      const raw = localStorage.getItem(this.CONFIG_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveBranchConfig(id: string | number, config: any): void {
    try {
      const map = this.getBranchConfigMap();
      map[String(id)] = {
        ...(map[String(id)] || {}),
        ...config
      };
      localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(map));
    } catch {}
  }

  private mapBackendAgencia(a: any): Sucursal {
    const configMap = this.getBranchConfigMap();
    const stored = configMap[String(a.id)] || {};

    const ger = a.usuarios?.find((u: any) => {
      const r = (u.role?.namerol || u.role || '').toUpperCase();
      return r === 'GERENTE' || r === 'APROBADOR' || r.includes('GERENTE') || r.includes('APROBADOR') || r === 'LIDER_AGENCIA';
    });

    const responsable = ger
      ? `${ger.name || ''} ${ger.lastname || ''}`.trim()
      : (a.responsable && a.responsable !== 'Sin Asignar' ? a.responsable : (stored.responsable || 'Sin Asignar'));

    const gerenteId = ger?.id || a.gerenteId || stored.gerenteId || undefined;
    const gerenteNombre = ger
      ? `${ger.name || ''} ${ger.lastname || ''}`.trim()
      : (a.gerenteNombre || stored.gerenteNombre || (responsable !== 'Sin Asignar' ? responsable : undefined));

    const lider = a.usuarios?.find((u: any) => {
      const r = (u.role?.namerol || u.role || '').toUpperCase();
      return r === 'LIDER_OPERADOR' || r.includes('LIDER_OPERADOR') || r.includes('LIDER') || r.includes('LÍDER');
    });

    const liderOperador = lider
      ? `${lider.name || ''} ${lider.lastname || ''}`.trim()
      : (a.liderOperador && a.liderOperador !== 'Sin Asignar' ? a.liderOperador : (stored.liderOperador || 'Sin Asignar'));

    const tieneServiciosEspeciales = stored.tieneServiciosEspeciales !== undefined
      ? Boolean(stored.tieneServiciosEspeciales)
      : false;

    let servicioIds: number[] = Array.isArray(stored.servicioIds)
      ? Array.from(new Set(stored.servicioIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n) && n > 0)))
      : [];

    if (servicioIds.length === 0) {
      servicioIds = tieneServiciosEspeciales ? [6, 7, 8, 9, 12, 13, 14] : [6, 7, 8, 9];
    }

    // Filtrar operadores estrictos (excluyendo roles directivos / gerenciales)
    const operadores = (a.usuarios || []).filter((u: any) => {
      const r = (u.role?.namerol || u.role || '').toUpperCase();
      const esGestion = r === 'GERENTE' || r === 'APROBADOR' || r.includes('GERENTE') || r.includes('APROBADOR') || r.includes('ADMIN') || r.includes('SUPERVISOR') || r.includes('JEFE') || r.includes('COORD');
      return (u.estado === 1 || u.estado === 'Activo') && !esGestion;
    });

    return {
      id: a.id,
      nombre: a.nombre,
      ciudad: a.regionRel?.nombre || a.region || 'Quito',
      direccion: a.direccion || '',
      estado: a.estado === 1 ? 'Activo' : (a.estado === 0 ? 'Inactivo' : 'Mantenimiento'),
      cantidadBahias: a.numeroBahias || (a.bahias?.length ?? a._count?.bahias ?? 0),
      responsable,
      liderOperador,
      liderOperadorId: lider?.id || a.liderOperadorId || stored.liderOperadorId || undefined,
      liderOperadorNombre: liderOperador !== 'Sin Asignar' ? liderOperador : undefined,
      operadoresActivos: operadores.length,
      maquinasAsignadasCount: a._count?.maquinarias || 0,
      serviciosRealizadosMes: a._count?.solicitudesAprobacion || 0,
      regionId: a.regionId || a.regionRel?.id,
      regionNombre: a.regionRel?.nombre || a.region || 'Sin región',
      marcaId: a.marcaId || a.marca?.id,
      marcaNombre: a.marca?.nombre || 'Sin marca',
      servicioIds,
      serviciosNombres: stored.serviciosNombres || [],
      telefono: a.telefono || '',
      requiereAprobacion: stored.requiereAprobacion !== undefined ? stored.requiereAprobacion : (!!gerenteId || responsable !== 'Sin Asignar'),
      gerenteId,
      gerenteNombre,
      tieneServiciosEspeciales
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

    const regionIdStr = (suc.regionId && suc.regionId !== 0 && suc.regionId !== '0') ? String(suc.regionId) : undefined;
    const marcaIdStr = (suc.marcaId && suc.marcaId !== 0 && suc.marcaId !== '0') ? String(suc.marcaId) : undefined;
    const gerenteIdStr = suc.gerenteId ? String(suc.gerenteId) : undefined;

    const payload = {
      codigo,
      nombre: suc.nombre?.trim(),
      region: suc.ciudad || 'Quito',
      regionId: regionIdStr,
      direccion: suc.direccion || '',
      telefono: suc.telefono || '',
      numeroBahias: Number(suc.cantidadBahias) || 2,
      marcaId: marcaIdStr,
      estado: suc.estado === 'Inactivo' ? 0 : 1,
      gerenteId: gerenteIdStr
    };

    return this.http.post<any>(apiUrl('/agencias/create'), payload).pipe(
      map(res => {
        this.saveBranchConfig(res.id, {
          servicioIds: suc.servicioIds,
          serviciosNombres: suc.serviciosNombres,
          tieneServiciosEspeciales: suc.tieneServiciosEspeciales,
          gerenteId: suc.gerenteId,
          gerenteNombre: suc.gerenteNombre,
          responsable: suc.responsable,
          requiereAprobacion: suc.requiereAprobacion
        });

        const backendMapped = this.mapBackendAgencia(res);
        if (suc.gerenteNombre) backendMapped.gerenteNombre = suc.gerenteNombre;
        if (suc.gerenteId) backendMapped.gerenteId = suc.gerenteId;
        if (suc.responsable) backendMapped.responsable = suc.responsable;
        if (suc.requiereAprobacion !== undefined) backendMapped.requiereAprobacion = suc.requiereAprobacion;
        if (suc.tieneServiciosEspeciales !== undefined) backendMapped.tieneServiciosEspeciales = suc.tieneServiciosEspeciales;
        if (suc.servicioIds) backendMapped.servicioIds = suc.servicioIds;
        if (suc.serviciosNombres) backendMapped.serviciosNombres = suc.serviciosNombres;

        const current = this.sucursalesSubject.value;
        this.sucursalesSubject.next([...current, backendMapped]);

        return backendMapped;
      })
    );
  }

  actualizarSucursal(suc: Sucursal, auditoria?: { motivo?: string; realizadoPor?: string }): Observable<Sucursal> {
    const regionIdStr = (suc.regionId && suc.regionId !== 0 && suc.regionId !== '0') ? String(suc.regionId) : undefined;
    const marcaIdStr = (suc.marcaId && suc.marcaId !== 0 && suc.marcaId !== '0') ? String(suc.marcaId) : undefined;
    const gerenteIdStr = suc.gerenteId ? String(suc.gerenteId) : (suc.requiereAprobacion === false ? '' : undefined);

    const payload = {
      id: String(suc.id),
      nombre: suc.nombre,
      region: suc.ciudad,
      regionId: regionIdStr,
      direccion: suc.direccion,
      telefono: suc.telefono,
      numeroBahias: Number(suc.cantidadBahias),
      marcaId: marcaIdStr,
      estado: suc.estado === 'Inactivo' ? 0 : 1,
      gerenteId: gerenteIdStr
    };

    this.saveBranchConfig(suc.id, {
      servicioIds: suc.servicioIds,
      serviciosNombres: suc.serviciosNombres,
      tieneServiciosEspeciales: suc.tieneServiciosEspeciales,
      gerenteId: suc.gerenteId,
      gerenteNombre: suc.gerenteNombre,
      responsable: suc.responsable,
      requiereAprobacion: suc.requiereAprobacion
    });

    return this.http.post<any>(apiUrl('/agencias/update'), payload).pipe(
      map(res => {
        const backendMapped = this.mapBackendAgencia(res);
        if (suc.gerenteNombre) backendMapped.gerenteNombre = suc.gerenteNombre;
        if (suc.gerenteId) backendMapped.gerenteId = suc.gerenteId;
        if (suc.responsable) backendMapped.responsable = suc.responsable;
        if (suc.requiereAprobacion !== undefined) backendMapped.requiereAprobacion = suc.requiereAprobacion;
        if (suc.tieneServiciosEspeciales !== undefined) backendMapped.tieneServiciosEspeciales = suc.tieneServiciosEspeciales;
        if (suc.servicioIds) backendMapped.servicioIds = suc.servicioIds;
        if (suc.serviciosNombres) backendMapped.serviciosNombres = suc.serviciosNombres;

        const current = this.sucursalesSubject.value;
        const index = current.findIndex(s => String(s.id) === String(suc.id));
        if (index !== -1) {
          const original = current[index];
          this.registrarCambiosCatalogo(original, backendMapped, auditoria);
          current[index] = backendMapped;
          this.sucursalesSubject.next([...current]);
        }

        return backendMapped;
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

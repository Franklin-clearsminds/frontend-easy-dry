import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { MovimientoRedSucursal, Sucursal } from '../models';
import { RegionService } from './region.service';
import { MarcaSucursalService } from './marca-sucursal.service';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class SucursalService {
  private http = inject(HttpClient);
  private regionService = inject(RegionService);
  private marcaService = inject(MarcaSucursalService);
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
    let stored = configMap[String(a.id)] || {};

    // Respaldo por nombre: si tras un reseed cambió el id de la agencia, la config
    // guardada por id anterior se recupera igualmente por el nombre.
    if (!stored || (stored && Object.keys(stored).length === 0)) {
      const nombreA = (a.nombre || '').trim().toLowerCase();
      const porNombre = Object.values(configMap).find((cfg: any) =>
        cfg && cfg.nombre && String(cfg.nombre).trim().toLowerCase() === nombreA
      );
      if (porNombre) stored = porNombre;
    }

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

    const lider = (a.usuarios || []).find((u: any) => String(u.id) === String(a.liderOperadorId))
      || a.usuarios?.find((u: any) => {
        const r = (u.role?.namerol || u.role || '').toUpperCase();
        return r === 'LIDER_OPERADOR' || r === 'LIDER' || r.includes('LIDER') || r.includes('LÍDER');
      });

    const liderOperador = lider
      ? `${lider.name || ''} ${lider.lastname || ''}`.trim()
      : (a.liderOperador && a.liderOperador !== 'Sin Asignar' ? a.liderOperador : (stored.liderOperador || 'Sin Asignar'));

    const tieneServiciosEspeciales = a.tieneServiciosEspeciales !== undefined && a.tieneServiciosEspeciales !== null
      ? Boolean(a.tieneServiciosEspeciales)
      : (stored.tieneServiciosEspeciales !== undefined ? Boolean(stored.tieneServiciosEspeciales) : false);

    // Origen de verdad: base de datos (agencia.servicioIds)
    let servicioIds: number[] = [];
    if (Array.isArray(a.servicioIds)) {
      servicioIds = Array.from(new Set(a.servicioIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n) && n > 0)));
    } else if (Array.isArray(stored.servicioIds) && stored.servicioIds.length > 0) {
      servicioIds = Array.from(new Set(stored.servicioIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n) && n > 0)));
    }

    const serviciosNombres: string[] = Array.isArray(a.serviciosNombres)
      ? a.serviciosNombres
      : (Array.isArray(stored.serviciosNombres) ? stored.serviciosNombres : []);

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
      maxLavadoresPorBahia: a.maxLavadoresPorBahia || 1,
      responsable,
      liderOperador,
      liderOperadorId: lider?.id || a.liderOperadorId || stored.liderOperadorId || undefined,
      liderOperadorNombre: liderOperador !== 'Sin Asignar' ? liderOperador : undefined,
      operadoresActivos: operadores.length,
      maquinasAsignadasCount: a._count?.maquinarias || 0,
      serviciosRealizadosMes: a._count?.solicitudesAprobacion || 0,
      regionId: a.regionId || a.regionRel?.id,
      regionNombre: a.regionRel?.nombre || a.region || 'Sin región',
      clienteId: a.clienteId || a.cliente?.id || a.marcaId || a.marca?.id,
      clienteNombre: a.cliente?.nombre || a.marca?.nombre || 'Sin cliente',
      marcaId: a.clienteId || a.cliente?.id || a.marcaId || a.marca?.id,
      marcaNombre: a.cliente?.nombre || a.marca?.nombre || 'Sin cliente',
      servicioIds,
      serviciosNombres,
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

  getSucursalConfig(id: string | number): Record<string, any> | null {
    try {
      const cfg = this.getBranchConfigMap()[String(id)];
      return cfg ? { ...cfg } : null;
    } catch {
      return null;
    }
  }

  private getSucursalConfigPorNombre(nombre?: string): Record<string, any> | null {
    if (!nombre) return null;
    const n = String(nombre).trim().toLowerCase();
    try {
      const cfg = Object.values(this.getBranchConfigMap()).find(
        (c: any) => c && c.nombre && String(c.nombre).trim().toLowerCase() === n
      );
      return cfg ? { ...cfg } : null;
    } catch {
      return null;
    }
  }

  hasServiciosEspecialesActivos(id: string | number, nombre?: string): boolean {
    const cfg = this.getSucursalConfig(id) || this.getSucursalConfigPorNombre(nombre);
    if (!cfg) return false;
    if (cfg['tieneServiciosEspeciales'] !== undefined) return Boolean(cfg['tieneServiciosEspeciales']);
    // Ya no hay IDs hardcodeados — la fuente de verdad es la BD
    return false;
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
    const rawClienteId = suc.clienteId || suc.marcaId;
    const clienteIdStr = (rawClienteId && rawClienteId !== 0 && rawClienteId !== '0') ? String(rawClienteId) : undefined;
    const marcaIdStr = clienteIdStr;
    const gerenteIdStr = suc.gerenteId ? String(suc.gerenteId) : undefined;

    const payload = {
      codigo,
      nombre: suc.nombre?.trim(),
      region: suc.ciudad || 'Quito',
      regionId: regionIdStr,
      direccion: suc.direccion || '',
      telefono: suc.telefono || '',
      numeroBahias: Number(suc.cantidadBahias) || 2,
      maxLavadoresPorBahia: Number(suc.maxLavadoresPorBahia) || 1,
      clienteId: clienteIdStr,
      marcaId: marcaIdStr,
      estado: suc.estado === 'Inactivo' ? 0 : 1,
      gerenteId: gerenteIdStr,
      liderOperadorId: suc.liderOperadorId ? String(suc.liderOperadorId) : undefined,
      servicioIds: Array.isArray(suc.servicioIds) ? suc.servicioIds.map(Number).filter(n => !isNaN(n) && n > 0) : [],
      serviciosNombres: Array.isArray(suc.serviciosNombres) ? suc.serviciosNombres : [],
      tieneServiciosEspeciales: suc.tieneServiciosEspeciales === true
    };

    return this.http.post<any>(apiUrl('/agencias/create'), payload).pipe(
      map(res => {
        this.saveBranchConfig(res.id, {
          nombre: suc.nombre,
          servicioIds: suc.servicioIds,
          serviciosNombres: suc.serviciosNombres,
          tieneServiciosEspeciales: suc.tieneServiciosEspeciales,
          gerenteId: suc.gerenteId,
          gerenteNombre: suc.gerenteNombre,
          responsable: suc.responsable,
          requiereAprobacion: suc.requiereAprobacion,
          liderOperadorId: suc.liderOperadorId,
          liderOperador: suc.liderOperador,
          liderOperadorNombre: suc.liderOperadorNombre
        });

        const backendMapped = this.mapBackendAgencia(res);
        if (suc.gerenteNombre) backendMapped.gerenteNombre = suc.gerenteNombre;
        if (suc.gerenteId) backendMapped.gerenteId = suc.gerenteId;
        if (suc.responsable) backendMapped.responsable = suc.responsable;
        if (suc.requiereAprobacion !== undefined) backendMapped.requiereAprobacion = suc.requiereAprobacion;
        if (suc.tieneServiciosEspeciales !== undefined) backendMapped.tieneServiciosEspeciales = suc.tieneServiciosEspeciales;
        if (suc.servicioIds) backendMapped.servicioIds = suc.servicioIds;
        if (suc.serviciosNombres) backendMapped.serviciosNombres = suc.serviciosNombres;
        if (suc.liderOperadorId) backendMapped.liderOperadorId = suc.liderOperadorId;
        if (suc.liderOperador && suc.liderOperador !== 'Sin Asignar') backendMapped.liderOperador = suc.liderOperador;

        const current = this.sucursalesSubject.value;
        this.sucursalesSubject.next([...current, backendMapped]);

        return backendMapped;
      })
    );
  }

  actualizarSucursal(suc: Sucursal, auditoria?: { motivo?: string; realizadoPor?: string }): Observable<Sucursal> {
    const regionIdStr = (suc.regionId && suc.regionId !== 0 && suc.regionId !== '0') ? String(suc.regionId) : undefined;
    const rawClienteId = suc.clienteId || suc.marcaId;
    const clienteIdStr = (rawClienteId && rawClienteId !== 0 && rawClienteId !== '0') ? String(rawClienteId) : undefined;
    const marcaIdStr = clienteIdStr;
    const gerenteIdStr = suc.gerenteId ? String(suc.gerenteId) : (suc.requiereAprobacion === false ? '' : undefined);

    const payload = {
      id: String(suc.id),
      nombre: suc.nombre,
      region: suc.ciudad,
      regionId: regionIdStr,
      direccion: suc.direccion,
      telefono: suc.telefono,
      numeroBahias: Number(suc.cantidadBahias),
      maxLavadoresPorBahia: Number(suc.maxLavadoresPorBahia) || 1,
      clienteId: clienteIdStr,
      marcaId: marcaIdStr,
      estado: suc.estado === 'Inactivo' ? 0 : 1,
      gerenteId: gerenteIdStr,
      liderOperadorId: suc.liderOperadorId ? String(suc.liderOperadorId) : '',
      servicioIds: Array.isArray(suc.servicioIds) ? suc.servicioIds.map(Number).filter(n => !isNaN(n) && n > 0) : [],
      serviciosNombres: Array.isArray(suc.serviciosNombres) ? suc.serviciosNombres : [],
      tieneServiciosEspeciales: suc.tieneServiciosEspeciales === true
    };

    this.saveBranchConfig(suc.id, {
      nombre: suc.nombre,
      servicioIds: suc.servicioIds,
      serviciosNombres: suc.serviciosNombres,
      tieneServiciosEspeciales: suc.tieneServiciosEspeciales,
      gerenteId: suc.gerenteId,
      gerenteNombre: suc.gerenteNombre,
      responsable: suc.responsable,
      requiereAprobacion: suc.requiereAprobacion,
      liderOperadorId: suc.liderOperadorId,
      liderOperador: suc.liderOperador,
      liderOperadorNombre: suc.liderOperadorNombre
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
        if (suc.liderOperadorId) backendMapped.liderOperadorId = suc.liderOperadorId;
        if (suc.liderOperador && suc.liderOperador !== 'Sin Asignar') backendMapped.liderOperador = suc.liderOperador;

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
    clienteId?: number | string;
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
    const rawTargetClienteId = params.clienteId || params.marcaId;
    if (rawTargetClienteId) {
      payload.clienteId = String(rawTargetClienteId);
      payload.marcaId = String(rawTargetClienteId);
    }

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
            tipo: params.regionId ? 'REGION' : 'CLIENTE',
            valorAnterior: original.regionNombre || original.clienteNombre || original.marcaNombre || '',
            valorNuevo: actualizada.regionNombre || actualizada.clienteNombre || actualizada.marcaNombre || '',
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
      const targetClId = s.clienteId || s.marcaId;
      const marca = marcas.find(m => String(m.id) === String(targetClId)) || this.marcaService.getById(targetClId || 0);
      return {
        ...s,
        regionNombre: region?.nombre || s.regionNombre,
        clienteNombre: marca?.nombre || s.clienteNombre || s.marcaNombre,
        marcaNombre: marca?.nombre || s.clienteNombre || s.marcaNombre
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
    const cambioCliente = (actualizada.clienteId && actualizada.clienteId !== original.clienteId) ||
                          (actualizada.marcaId && actualizada.marcaId !== original.marcaId);
    if (cambioCliente) {
      nextMovId += 1;
      movimientos.push({
        id: nextMovId,
        sucursalId: original.id,
        sucursalNombre: actualizada.nombre,
        tipo: 'CLIENTE',
        valorAnterior: original.clienteNombre || original.marcaNombre || 'Sin cliente',
        valorNuevo: actualizada.clienteNombre || actualizada.marcaNombre || 'Sin cliente',
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

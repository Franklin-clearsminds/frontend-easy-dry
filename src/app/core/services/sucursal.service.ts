import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError, expand, reduce } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { ConsultaTabla, PaginaServidor, normalizarPagina } from '../models/paginacion.model';
import { cuerpoConsulta } from '../utils/tabla-servidor';

/** Lo que pide la lista de agencias: la de la tabla más los filtros que entiende el servidor. */
export interface ConsultaAgencias extends Partial<ConsultaTabla> {
  /** 1 activo, 0 inactivo, 2 mantenimiento. */
  estado?: number;
  regionNombre?: string;
  clienteNombre?: string;
  incluirProductividad?: boolean;
}
import { MovimientoRedSucursal, Sucursal } from '../models';

export interface PrecioServicioAgencia {
  catalogoServicioId: number;
  codigo: string;
  nombre: string;
  estado: string;
  precioCatalogo: number;
  precioAgencia: number | null;
  precioEfectivo: number;
}
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

  constructor() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('easydry_sucursal_config_map_v1'); // config local antigua: el servidor es la fuente de verdad
    } catch {}
  }

  private mapBackendAgencia(a: any): Sucursal {

    const ger = a.usuarios?.find((u: any) => {
      const r = (u.role?.namerol || u.role || '').toUpperCase();
      return r === 'APROBADOR' || r.includes('APROBADOR') || r === 'LIDER';
    });

    const responsable = ger
      ? `${ger.name || ''} ${ger.lastname || ''}`.trim()
      : (a.responsable && a.responsable !== 'Sin Asignar' ? a.responsable : 'Sin Asignar');

    const gerenteId = ger?.id || a.gerenteId || undefined;
    const gerenteNombre = ger
      ? `${ger.name || ''} ${ger.lastname || ''}`.trim()
      : (a.gerenteNombre || (responsable !== 'Sin Asignar' ? responsable : undefined));

    const lider = (a.usuarios || []).find((u: any) => String(u.id) === String(a.liderOperadorId))
      || a.usuarios?.find((u: any) => {
        const r = (u.role?.namerol || u.role || '').toUpperCase();
        return r === 'LIDER' || r.includes('LIDER') || r.includes('LÍDER');
      });

    const liderOperador = lider
      ? `${lider.name || ''} ${lider.lastname || ''}`.trim()
      : (a.liderOperador && a.liderOperador !== 'Sin Asignar' ? a.liderOperador : 'Sin Asignar');

    const tieneServiciosEspeciales = Boolean(a.tieneServiciosEspeciales);

    const servicioIds: number[] = Array.isArray(a.servicioIds)
      ? Array.from(new Set(a.servicioIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n) && n > 0)))
      : [];

    const serviciosNombres: string[] = Array.isArray(a.serviciosNombres) ? a.serviciosNombres : [];

    // Filtrar operadores estrictos (excluyendo roles directivos / gerenciales)
    const operadores = (a.usuarios || []).filter((u: any) => {
      const r = (u.role?.namerol || u.role || '').toUpperCase();
      const esGestion = r === 'APROBADOR' || r.includes('APROBADOR') || r.includes('ADMIN') || r.includes('SUPERVISOR') || r.includes('JEFE') || r.includes('COORD');
      return (u.estado === 1 || u.estado === 'Activo') && !esGestion;
    });

    return {
      id: a.id,
      codigo: a.codigo || undefined,
      productividad: a.productividad != null ? Number(a.productividad) : undefined,
      nombre: a.nombre,
      ciudad: a.regionRel?.nombre || a.region || '',
      direccion: a.direccion || '',
      estado: a.estado === 1 ? 'Activo' : (a.estado === 0 ? 'Inactivo' : 'Mantenimiento'),
      cantidadBahias: a.numeroBahias || (a.bahias?.length ?? a._count?.bahias ?? 0),
      maxLavadoresPorBahia: a.maxLavadoresPorBahia || 1,
      responsable,
      liderOperador,
      liderOperadorId: lider?.id || a.liderOperadorId || undefined,
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
      // Hay aprobador designado cuando el servidor devuelve uno para la agencia (no depende de datos locales).
      requiereAprobacion: !!gerenteId,
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

  /**
   * Si la agencia tiene servicios especiales, según lo que devolvió el servidor (lista ya cargada). Sin la agencia
   * cargada no se puede saber, y se responde false.
   */
  hasServiciosEspecialesActivos(id: string | number, nombre?: string): boolean {
    const lista = this.sucursalesSubject.value;
    const n = String(nombre || '').trim().toLowerCase();
    const suc = lista.find(s => String(s.id) === String(id)) || (n ? lista.find(s => s.nombre.trim().toLowerCase() === n) : undefined);
    return suc?.tieneServiciosEspeciales === true;
  }

  /** Una página de agencias para las tarjetas (scroll infinito): búsqueda, estado, región, cliente y orden en el servidor. */
  getSucursalesPagina(c: ConsultaAgencias): Observable<PaginaServidor<Sucursal>> {
    const body = cuerpoConsulta(c, ['estado', 'regionNombre', 'clienteNombre', 'incluirProductividad']);
    return this.http.post<any>(apiUrl('/agencias/list'), body).pipe(
      map(res => {
        const pagina = normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number);
        return { ...pagina, items: pagina.items.map(a => this.mapBackendAgencia(a)) };
      })
    );
  }

  /**
   * Todas las agencias, sin productividad (selectores y mapa, que necesitan la red completa): pide páginas de 100 hasta
   * agotarlas, así no se corta en 100 aunque la red crezca. El alcance por rol lo aplica el servidor.
   */
  getSucursales(): Observable<Sucursal[]> {
    const pedir = (page: number) => this.http.post<any>(apiUrl('/agencias/list'), { incluirProductividad: false, page, pageSize: 100 });
    return pedir(1).pipe(
      expand(res => (res && res.hasNextPage ? pedir(Number(res.page || 1) + 1) : EMPTY)),
      reduce((acc: any[], res: any) => acc.concat(normalizarPagina<any>(res, 1, 100).items), [] as any[]),
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
      region: suc.ciudad || suc.regionNombre || '',
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
        const backendMapped = this.mapBackendAgencia(res);

        const current = this.sucursalesSubject.value;
        this.sucursalesSubject.next([...current, backendMapped]);

        return backendMapped;
      })
    );
  }

  /**
   * Guarda los cambios de una agencia. Cada bloque solo se envía si quien llama tiene el permiso que el servidor exige:
   * región y cliente ('agencias.crear'), estado ('agencias.estado'), bahías ('bahias.crear') y personas ('usuarios.gestionar').
   * Si el servidor rechaza, el error se propaga para que la pantalla lo muestre.
   */
  actualizarSucursal(
    suc: Sucursal,
    auditoria?: { motivo?: string; realizadoPor?: string },
    incluir: { region?: boolean; estado?: boolean; bahias?: boolean; personas?: boolean } = {}
  ): Observable<Sucursal> {
    const regionIdStr = (suc.regionId && suc.regionId !== 0 && suc.regionId !== '0') ? String(suc.regionId) : undefined;
    const rawClienteId = suc.clienteId || suc.marcaId;
    const clienteIdStr = (rawClienteId && rawClienteId !== 0 && rawClienteId !== '0') ? String(rawClienteId) : undefined;
    const gerenteIdStr = suc.gerenteId ? String(suc.gerenteId) : (suc.requiereAprobacion === false ? '' : undefined);

    const payload: any = {
      id: String(suc.id),
      nombre: suc.nombre,
      direccion: suc.direccion,
      telefono: suc.telefono,
      maxLavadoresPorBahia: Number(suc.maxLavadoresPorBahia) || 1,
      servicioIds: Array.isArray(suc.servicioIds) ? suc.servicioIds.map(Number).filter(n => !isNaN(n) && n > 0) : [],
      serviciosNombres: Array.isArray(suc.serviciosNombres) ? suc.serviciosNombres : [],
      tieneServiciosEspeciales: suc.tieneServiciosEspeciales === true
    };
    if (incluir.region) {
      payload.region = suc.ciudad;
      payload.regionId = regionIdStr;
      payload.clienteId = clienteIdStr;
      payload.marcaId = clienteIdStr;
    }
    if (incluir.estado) payload.estado = suc.estado === 'Inactivo' ? 0 : 1;
    if (incluir.bahias) payload.numeroBahias = Number(suc.cantidadBahias);
    if (incluir.personas) {
      payload.gerenteId = gerenteIdStr;
      payload.liderOperadorId = suc.liderOperadorId ? String(suc.liderOperadorId) : '';
    }

    return this.http.post<any>(apiUrl('/agencias/update'), payload).pipe(
      map(res => {
        const backendMapped = this.mapBackendAgencia(res);

        const current = this.sucursalesSubject.value;
        const index = current.findIndex(s => String(s.id) === String(suc.id));
        if (index !== -1) {
          const original = current[index];
          this.registrarCambiosCatalogo(original, backendMapped, auditoria);
          current[index] = backendMapped;
          this.sucursalesSubject.next([...current]);
        }

        return backendMapped;
      })
    );
  }

  /** Activa o desactiva una agencia (permiso 'agencias.estado'). El error del servidor se propaga. */
  cambiarEstadoAgencia(id: string | number, activo: boolean): Observable<Sucursal> {
    return this.http.post<any>(apiUrl('/agencias/toggle-estado'), { id: String(id), estado: activo ? 1 : 0 }).pipe(
      map(res => this.mapBackendAgencia(res))
    );
  }

  /** Precio de cada servicio general activo de esta agencia (override propio o precio del catálogo). */
  getPreciosServicios(agenciaId: string | number): Observable<PrecioServicioAgencia[]> {
    return this.http.post<PrecioServicioAgencia[]>(apiUrl('/agencias/precios/list'), { agenciaId: String(agenciaId) });
  }

  /** Fija el precio por agencia de uno o varios servicios generales (permiso 'agencias.precios.gestionar', solo admin). El error del servidor se propaga. */
  setPreciosServicios(agenciaId: string | number, precios: { catalogoServicioId: number; precio: number }[]): Observable<PrecioServicioAgencia[]> {
    return this.http.post<PrecioServicioAgencia[]>(apiUrl('/agencias/precios/set'), { agenciaId: String(agenciaId), precios });
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

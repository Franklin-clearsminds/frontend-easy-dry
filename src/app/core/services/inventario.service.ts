import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  ProductoInsumo,
  InventarioItem,
  MovimientoStock,
  AlertaReabastecimiento,
  BodegaInventario,
  TipoProductoCatalog,
  UnidadMedidaCatalog,
  PresentacionInsumoCatalog,
  TipoMovimientoCatalog,
  MovimientoInventarioGlobalItem,
  DashboardInventarioResumen,
  RegistrarMovimientoPayload,
} from '../models/inventario.model';
import { apiUrl } from '../config/env';
import { BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_MAX, PAGE_SIZE_TABLA } from '../config/paginacion';
import { ConsultaTabla, PaginaServidor, normalizarPagina } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from './auth.service';

/** Lo que pide la tabla de Productos: la de la tabla más sus filtros. */
export interface ConsultaProductos extends Partial<ConsultaTabla> {
  tipoProductoId?: string;
  /** 1 activo, 0 inactivo. */
  estado?: number;
  /** agotado | bajo_minimo | moderado | optimo | alerta_total */
  nivelStock?: string;
  /** Contexto del stock: una sede (si es de sede) o una bodega. */
  agenciaId?: string;
  bodegaId?: string;
  incluirResumen?: boolean;
}

/** Lo que pide la bandeja de alertas de stock: la de la tabla más sus filtros. */
export interface ConsultaAlertas extends Partial<ConsultaTabla> {
  /** CRITICO (crítico y agotado) | BAJO */
  grupoNivel?: string;
  /** PENDIENTE | EN_PROCESO | DESPACHADO | RESUELTO */
  estado?: string;
  soloActivas?: boolean;
  agenciaId?: string;
  sucursalId?: string;
  incluirResumen?: boolean;
}

/** Contadores de la bandeja con el alcance y la búsqueda vigentes (sin los filtros de nivel ni de estado). */
export interface ResumenAlertas {
  total: number;
  resueltas: number;
  activas: number;
  criticas: number;
}

/** Consulta de los insumos de una bodega (estado: Óptimo, Bajo, Crítico, Agotado, No necesario). */
export interface ConsultaInsumosBodega extends Partial<ConsultaTabla> {
  bodegaId?: string;
  estado?: string;
}

/** Datos de la bodega y métricas de TODOS sus insumos, que acompañan a cada página de `bodegas-resumen`. */
export interface MetaBodega {
  bodega: any | null;
  bodegas: any[];
  metricas: { totalInsumos: number; stockTotalUnidades: number; insumosBajoMinimo: number; insumosOptimos: number; insumosNoNecesarios?: number; porcentajeAlertaConfigurado?: number };
}

/** Fichas de agencias o kits de pulidor (sin insumos): filtros y orden en el servidor. */
export interface ConsultaFichas extends Partial<ConsultaTabla> {
  estadoUbicacion?: 'alerta' | 'optimo' | '';
  /** Solo agencias: quita esta agencia de la lista ("otras agencias"). */
  excluirAgenciaId?: string;
  /** Solo pulidores. */
  tipoPulidor?: string;
  regionId?: string;
  pulidorId?: string;
}

export interface MetricasAgencias { totalAgencias: number; agenciasEnAlerta: number; insumosCriticosTotal: number; }
export interface MetricasPulidores { totalPulidores: number; pulidoresEnAlerta: number; insumosCriticosTotal: number; }

/** Insumos de una agencia o de un kit (tabla dentro de la ficha). */
export interface ConsultaInsumosUbicacion extends Partial<ConsultaTabla> {
  estado?: string;
}

/** Consulta de un catálogo pequeño (tipos, unidades…): la de la tabla más el estado (1 activo, 0 inactivo). */
export interface ConsultaCatalogo extends Partial<ConsultaTabla> {
  estado?: number;
  incluirResumen?: boolean;
}

/** Lo que pide la tabla del Kardex: página, orden, búsqueda y filtros, todo resuelto en el servidor. */
export interface ConsultaMovimientos extends Partial<ConsultaTabla> {
  tipoMovimientoId?: string;
  insumoId?: string;
  ubicacionId?: string;
  /** ISO 8601 (inclusive). */
  fechaDesde?: string;
  fechaHasta?: string;
  incluirResumen?: boolean;
}

export interface ResumenMovimientos {
  /** Conteo por id de tipo de movimiento, con los mismos filtros menos el de tipo. */
  porTipo: Record<string, number>;
  total: number;
}

export interface RespuestaMovimientosPagina {
  pagina: PaginaServidor<MovimientoInventarioGlobalItem>;
  resumen?: ResumenMovimientos;
}

/** Lo que pide la tabla de Envíos (despachos): página, orden, búsqueda y filtros, todo resuelto en el servidor. */
export interface ConsultaDespachos extends Partial<ConsultaTabla> {
  /** EN_TRANSITO | RECIBIDO | RECHAZADO */
  estadoDespacho?: string;
  /** Agencia destino: id, nombre o código. */
  agenciaId?: string;
  pulidorId?: string;
  /** AAAA-MM-DD o ISO (por fecha de salida). */
  fechaDesde?: string;
  fechaHasta?: string;
  incluirResumen?: boolean;
}

/** Contadores con los mismos filtros de la consulta menos el de estado. */
export interface ResumenDespachos {
  enTransito: number;
  recibidos: number;
  rechazados: number;
  total: number;
}

export interface RespuestaDespachosPagina {
  pagina: PaginaServidor<any>;
  resumen?: ResumenDespachos;
}

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  /** true cuando la última carga de un listado falló por un error real del backend (no "sin datos"). */
  private errorCargaSubject = new BehaviorSubject<boolean>(false);
  public errorCarga$ = this.errorCargaSubject.asObservable();
  public get error(): boolean {
    return this.errorCargaSubject.value;
  }

  /**
   * Muestra un aviso visible cuando un listado falla por un error real del servidor (no simplemente
   * "sin datos") y marca `error` para que la pantalla pueda ofrecer "Reintentar".
   */
  private avisarErrorCarga(mensaje: string, err: any): void {
    console.error(mensaje, err);
    this.errorCargaSubject.next(true);
    this.toastService.error('No se pudo cargar', `${mensaje}. Reintentar.`);
  }

  // Observables para compatibilidad con vistas reactivas
  private tiposSubject = new BehaviorSubject<TipoProductoCatalog[]>([]);
  public tipos$ = this.tiposSubject.asObservable();

  private unidadesSubject = new BehaviorSubject<UnidadMedidaCatalog[]>([]);
  public unidades$ = this.unidadesSubject.asObservable();


  private bodegasSubject = new BehaviorSubject<BodegaInventario[]>([]);
  public bodegas$ = this.bodegasSubject.asObservable();

  private itemsSubject = new BehaviorSubject<InventarioItem[]>([]);
  public items$ = this.itemsSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoStock[]>([]);
  public movimientos$ = this.movimientosSubject.asObservable();

  constructor() {
    this.cargarCatalogosIniciales();
  }

  /**
   * Catálogos que comparten todas las pantallas de inventario. Solo se piden si el rol tiene
   * `inventario.ver`: este servicio es de raíz y lo inyectan pantallas que no son de inventario
   * (p. ej. la barra de filtros), así que sin este chequeo un rol sin inventario —mantenimiento,
   * comercial— disparaba cuatro llamadas que el servidor rechaza con 403 nada más abrir la página.
   */
  public cargarCatalogosIniciales(): void {
    if (!this.authService.puede('inventario.ver')) return;
    this.cargarTiposDesdeBackend();
    this.cargarUnidadesDesdeBackend();
    this.cargarBodegasDesdeBackend();
    this.cargarItems();
  }

  // ============================================================
  //  0. BODEGAS DEL SISTEMA (100% DINÁMICO DESDE BD)
  // ============================================================

  public cargarBodegasDesdeBackend(): void {
    this.getBodegas().subscribe((bodegas) => {
      if (bodegas && Array.isArray(bodegas)) {
        this.bodegasSubject.next(bodegas);
      }
    });
  }

  public getBodegas(): Observable<BodegaInventario[]> {
    return this.http.post<BodegaInventario[]>(apiUrl('/inventario/bodegas/list'), {}).pipe(
      tap((bodegas) => {
        if (bodegas && Array.isArray(bodegas)) {
          this.bodegasSubject.next(bodegas);
        }
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar las bodegas', err);
        return of([]);
      })
    );
  }

  public crearBodega(dto: {
    nombre: string;
    codigo?: string;
    regionId?: string;
    tipo?: 'CENTRAL' | 'REGIONAL';
    ciudad?: string;
    direccion?: string;
    telefono?: string;
    porcentajeAlerta?: number;
  }): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/bodegas/create'), dto).pipe(
      tap(() => this.cargarBodegasDesdeBackend())
    );
  }

  public actualizarBodega(dto: {
    id: string;
    nombre?: string;
    codigo?: string;
    regionId?: string;
    tipo?: 'CENTRAL' | 'REGIONAL';
    ciudad?: string;
    direccion?: string;
    telefono?: string;
    porcentajeAlerta?: number;
    activa?: boolean;
  }): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/bodegas/update'), dto).pipe(
      tap(() => this.cargarBodegasDesdeBackend())
    );
  }

  public toggleActivaBodega(id: string): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/bodegas/toggle-activa'), { id }).pipe(
      tap(() => this.cargarBodegasDesdeBackend())
    );
  }

  public eliminarBodega(id: string): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/bodegas/delete'), { id }).pipe(
      tap(() => this.cargarBodegasDesdeBackend())
    );
  }

  // ============================================================
  //  1. TIPOS DE PRODUCTO (100% DINÁMICO DESDE BD)
  // ============================================================

  public cargarTiposDesdeBackend(): void {
    this.getTiposProducto().subscribe((tipos) => {
      this.tiposSubject.next(tipos);
    });
  }

  public getTiposProducto(estado?: number): Observable<TipoProductoCatalog[]> {
    const payload: any = {};
    if (estado !== undefined) payload.estado = estado;
    return this.http.post<TipoProductoCatalog[]>(apiUrl('/inventario/tipos/list'), payload).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los tipos de producto', err);
        return of([]);
      })
    );
  }

  /** Página de tipos de producto (orden: codigo, nombre, estado, insumos, fecha). No captura errores: la tabla muestra el suyo. */
  public getTiposPagina(c: ConsultaCatalogo): Observable<PaginaConResumen<TipoProductoCatalog>> {
    return postPagina<TipoProductoCatalog>(this.http, apiUrl('/inventario/tipos/list'), cuerpoConsulta(c, ['estado']));
  }

  public crearTipoProducto(dto: { codigo: string; nombre: string; descripcion?: string; estado?: number }): Observable<TipoProductoCatalog> {
    return this.http.post<TipoProductoCatalog>(apiUrl('/inventario/tipos/create'), dto).pipe(
      tap(() => this.cargarTiposDesdeBackend())
    );
  }

  public actualizarTipoProducto(dto: { id: string; codigo?: string; nombre?: string; descripcion?: string; estado?: number }): Observable<TipoProductoCatalog> {
    return this.http.post<TipoProductoCatalog>(apiUrl('/inventario/tipos/update'), dto).pipe(
      tap(() => this.cargarTiposDesdeBackend())
    );
  }

  // ============================================================
  //  2. UNIDADES DE MEDIDA (100% DINÁMICO DESDE BD)
  // ============================================================

  public cargarUnidadesDesdeBackend(): void {
    this.getUnidadesMedida().subscribe((unidades) => {
      this.unidadesSubject.next(unidades);
    });
  }

  public getUnidadesMedida(tipo?: string, estado?: number): Observable<UnidadMedidaCatalog[]> {
    const payload: any = {};
    if (tipo) payload.tipo = tipo;
    if (estado !== undefined) payload.estado = estado;
    return this.http.post<UnidadMedidaCatalog[]>(apiUrl('/inventario/unidades/list'), payload).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar las unidades de medida', err);
        return of([]);
      })
    );
  }

  /** Página de unidades de medida (orden: codigo, nombre, simbolo, tipo, factorBase, estado, fecha). */
  public getUnidadesPagina(c: ConsultaCatalogo & { tipo?: string }): Observable<PaginaConResumen<UnidadMedidaCatalog>> {
    return postPagina<UnidadMedidaCatalog>(this.http, apiUrl('/inventario/unidades/list'), cuerpoConsulta(c, ['estado', 'tipo']));
  }

  public crearUnidadMedida(dto: { codigo: string; nombre: string; simbolo: string; tipo: string; factorBase?: number; estado?: number }): Observable<UnidadMedidaCatalog> {
    return this.http.post<UnidadMedidaCatalog>(apiUrl('/inventario/unidades/create'), dto).pipe(
      tap(() => this.cargarUnidadesDesdeBackend())
    );
  }

  public actualizarUnidadMedida(dto: { id: string; codigo?: string; nombre?: string; simbolo?: string; tipo?: string; factorBase?: number; estado?: number }): Observable<UnidadMedidaCatalog> {
    return this.http.post<UnidadMedidaCatalog>(apiUrl('/inventario/unidades/update'), dto).pipe(
      tap(() => this.cargarUnidadesDesdeBackend())
    );
  }

  // ============================================================
  //  3. PRESENTACIONES DEL PRODUCTO (100% DINÁMICO)
  // ============================================================

  public getPresentaciones(insumoId?: string): Observable<PresentacionInsumoCatalog[]> {
    const payload: any = {};
    if (insumoId) payload.insumoId = insumoId;
    return this.http.post<PresentacionInsumoCatalog[]>(apiUrl('/inventario/presentaciones/list'), payload).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar las presentaciones', err);
        return of([]);
      })
    );
  }

  public crearPresentacion(dto: { insumoId: string; nombre: string; unidadId: string; cantidad: number; factorAUnidadBase: number; estado?: number }): Observable<PresentacionInsumoCatalog> {
    return this.http.post<PresentacionInsumoCatalog>(apiUrl('/inventario/presentaciones/create'), dto);
  }

  public actualizarPresentacion(dto: { id: string; nombre?: string; unidadId?: string; cantidad?: number; factorAUnidadBase?: number; estado?: number }): Observable<PresentacionInsumoCatalog> {
    return this.http.post<PresentacionInsumoCatalog>(apiUrl('/inventario/presentaciones/update'), dto);
  }

  // ============================================================
  //  4. TIPOS Y MOTIVOS DE MOVIMIENTO (100% DINÁMICO)
  // ============================================================

  public getTiposMovimiento(esEntrada?: boolean): Observable<TipoMovimientoCatalog[]> {
    const payload: any = {};
    if (esEntrada !== undefined) payload.esEntrada = esEntrada;
    return this.http.post<TipoMovimientoCatalog[]>(apiUrl('/inventario/movimiento-tipos/list'), payload).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los tipos de movimiento', err);
        return of([]);
      })
    );
  }



  // ============================================================
  //  5. MOVIMIENTOS Y KARDEX (CENTRALIZADO Y TRANSACCIONAL)
  // ============================================================

  public registrarMovimiento(payload: RegistrarMovimientoPayload): Observable<MovimientoInventarioGlobalItem> {
    return this.http.post<MovimientoInventarioGlobalItem>(apiUrl('/inventario/movimientos/registrar'), payload).pipe(
      tap(() => this.cargarItems())
    );
  }

  public reajustarStock(payload: {
    insumoId: string;
    bodegaId?: string;
    agenciaId?: string;
    pulidorId?: string;
    stockUbicacionId?: string;
    cantidadContada: number;
    motivoTexto: string;
    evidenciaUrl: string;
  }): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/stock/reajuste'), payload).pipe(
      tap(() => this.cargarItems())
    );
  }

  public getHistorialMovimientos(dto: any = {}): Observable<{ items: MovimientoInventarioGlobalItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    return this.http.post<any>(apiUrl('/inventario/movimientos/historial'), dto).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el historial de movimientos', err);
        return of({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
      })
    );
  }

  /**
   * Una página del Kardex con orden, búsqueda y filtros resueltos en el servidor.
   * A diferencia de `getHistorialMovimientos`, un fallo NO se traga: se propaga para que la tabla muestre el error.
   */
  public getMovimientosPagina(consulta: ConsultaMovimientos): Observable<RespuestaMovimientosPagina> {
    const c = consulta;
    const body: Record<string, unknown> = {
      page: c.page || 1,
      pageSize: Math.min(c.pageSize || 25, PAGE_SIZE_MAX),
    };
    if (c.sortField) { body['sortField'] = c.sortField; body['sortOrder'] = c.sortOrder || 'desc'; }
    const texto = (c.search || '').trim();
    if (texto.length >= 2) body['search'] = texto;
    const claves: (keyof ConsultaMovimientos)[] = ['tipoMovimientoId', 'insumoId', 'ubicacionId', 'fechaDesde', 'fechaHasta'];
    for (const k of claves) {
      const v = c[k];
      if (v !== undefined && v !== null && v !== '') body[k] = v;
    }
    if (c.incluirResumen) body['incluirResumen'] = true;

    return this.http.post<any>(apiUrl('/inventario/movimientos/historial'), body).pipe(
      map((res) => ({
        pagina: normalizarPagina<MovimientoInventarioGlobalItem>(res, body['page'] as number, body['pageSize'] as number),
        resumen: res?.resumen as ResumenMovimientos | undefined,
      })),
    );
  }

  // ============================================================
  //  6. DASHBOARD & STOCK BAJO (DATOS REALES)
  // ============================================================

  public getDashboardResumen(): Observable<DashboardInventarioResumen> {
    return this.http.post<DashboardInventarioResumen>(apiUrl('/inventario/dashboard/resumen'), {}).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el dashboard de inventario', err);
        return of({
          totalProductos: 0,
          productosStockBajo: 0,
          entradasMes: 0,
          consumosMes: 0,
          totalMovimientosMes: 0,
          ultimosMovimientos: [],
        });
      })
    );
  }

  /** Página de insumos bajo el mínimo (orden: sku, nombre, tipo, stock, minimo, deficit, fecha). No captura errores. */
  public getStockBajoPagina(c: ConsultaCatalogo & { tipoProductoId?: string }): Observable<PaginaConResumen<ProductoInsumo>> {
    return postPagina<ProductoInsumo>(this.http, apiUrl('/inventario/stock-bajo/list'), cuerpoConsulta(c, ['tipoProductoId']), (i) => this.mapProducto(i));
  }

  public getStockBajo(dto: any = {}): Observable<{ items: ProductoInsumo[]; total: number }> {
    return this.http.post<any>(apiUrl('/inventario/stock-bajo/list'), dto).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el stock bajo mínimo', err);
        return of({ items: [], total: 0 });
      })
    );
  }

  /**
   * Página de alertas con orden (fecha, nivel, estado, insumo, agencia), búsqueda y filtros en el servidor. Listar ya no
   * escribe en la base: las alertas de "insumo sin stock" se generan con `sincronizarAlertas`.
   */
  public getAlertasPagina(c: ConsultaAlertas): Observable<PaginaConResumen<any, ResumenAlertas>> {
    return postPagina<any, ResumenAlertas>(
      this.http,
      apiUrl('/inventario/alertas/list'),
      cuerpoConsulta(c, ['grupoNivel', 'estado', 'soloActivas', 'agenciaId', 'sucursalId']),
    );
  }

  /** Pide al servidor generar las alertas de insumos requeridos sin stock. Un fallo no es grave: la bandeja se lista igual. */
  public sincronizarAlertas(forzar = false): Observable<{ sincronizado: boolean }> {
    return this.http.post<{ sincronizado: boolean }>(apiUrl('/inventario/alertas/sincronizar'), { forzar }).pipe(
      catchError(() => of({ sincronizado: false })),
    );
  }

  public getAlertasStock(dto: any = {}): Observable<any[]> {
    return this.http.post<any[]>(apiUrl('/inventario/alertas/list'), dto).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar las alertas de stock', err);
        return of([]);
      })
    );
  }

  public crearAlerta(dto: {
    insumoId: string;
    nivel: 'BAJO' | 'CRITICO' | 'AGOTADO';
    sucursalId?: string;
    agenciaId?: string;
    mensaje?: string;
    stockReportado?: number;
  }): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/alertas/crear'), {
      ...dto,
      sucursalId: dto.sucursalId || dto.agenciaId,
    });
  }

  public atenderAlertaStock(dto: { id: string; estado: string; observacion?: string }): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/alertas/atender'), dto).pipe(
      catchError(() => of({ success: false }))
    );
  }

  // ============================================================
  //  7. PRODUCTOS / INSUMOS MAESTROS (CRUD 100% POST)
  // ============================================================

  public getItems(): Observable<InventarioItem[]> {
    return this.items$;
  }

  public getStockDisponibleSucursal(
    productoId: number | string,
    sucursalId?: number | string,
    sucursalNombre?: string,
    productoSKU?: string
  ): number {
    const item = this.itemsSubject.value.find(
      i =>
        i.producto.id === productoId ||
        String(i.producto.id) === String(productoId) ||
        i.producto.codigoSKU === productoId ||
        (productoSKU && i.producto.codigoSKU === productoSKU)
    );
    if (!item) return 0;
    if (sucursalId || sucursalNombre) {
      if (!item.stockPorSucursal) return 0;

      const keysToTry: string[] = [
        sucursalId ? String(sucursalId).trim() : '',
        sucursalNombre ? String(sucursalNombre).trim() : ''
      ].filter(Boolean);

      for (const key of keysToTry) {
        if (item.stockPorSucursal[key] != null) {
          return item.stockPorSucursal[key];
        }
        const keyLower = key.toLowerCase();
        if (item.stockPorSucursal[keyLower] != null) {
          return item.stockPorSucursal[keyLower];
        }
        const matchedKey = Object.keys(item.stockPorSucursal).find(k => {
          const kLower = k.toLowerCase().trim();
          return kLower === keyLower || kLower.includes(keyLower) || keyLower.includes(kLower);
        });
        if (matchedKey != null && item.stockPorSucursal[matchedKey] != null) {
          return item.stockPorSucursal[matchedKey];
        }
      }
      // Si se consulta una sucursal/agencia específica y no tiene existencias en dicha sede, su stock es 0 (no el de bodega central)
      return 0;
    }
    return item.stockBodegaCentral || item.stockTotalRed || 0;
  }

  public consumirInsumosServicio(
    agenciaId: string,
    ordenTrabajo: string,
    placa: string,
    insumos: any[],
    operador?: string
  ): Observable<{ success: boolean; alertasGeneradas: string[] }> {
    const payload = {
      agenciaId,
      ordenTrabajo,
      placa,
      insumos: (insumos || []).map(i => ({
        insumoId: typeof i.productoId === 'string' && i.productoId.length > 10 ? i.productoId : undefined,
        codigoSKU: i.productoSKU || (typeof i.productoId === 'string' ? i.productoId : undefined),
        cantidad: Number(i.cantidad || 1)
      })),
      operador
    };

    return this.http.post<{ success: boolean; alertasGeneradas: string[] }>(
      apiUrl('/inventario/stock/consumir-servicio'),
      payload
    ).pipe(
      tap(() => this.cargarItems()),
      catchError(() => {
        // Fallback reactivo local en caso de desconexión
        const currentItems = [...this.itemsSubject.value];
        const alertas: string[] = [];

        payload.insumos.forEach(itemConsumo => {
          const found = currentItems.find(i => 
            (itemConsumo.insumoId && i.producto.id === itemConsumo.insumoId) || 
            (itemConsumo.codigoSKU && i.producto.codigoSKU === itemConsumo.codigoSKU)
          );
          if (found) {
            found.stockBodegaCentral = Math.max(0, found.stockBodegaCentral - itemConsumo.cantidad);
            found.stockTotalRed = Math.max(0, found.stockTotalRed - itemConsumo.cantidad);
            if (agenciaId && found.stockPorSucursal && found.stockPorSucursal[agenciaId] != null) {
              found.stockPorSucursal[agenciaId] = Math.max(0, found.stockPorSucursal[agenciaId] - itemConsumo.cantidad);
            }
            if (found.stockBodegaCentral <= (found.producto.stockMinimoAgencia || 2)) {
              alertas.push(`Stock Bajo: ${found.producto.nombre} en ${agenciaId} (quedan ${found.stockBodegaCentral} ${found.producto.unidadMedida})`);
            }
          }
        });

        this.itemsSubject.next(currentItems);
        return of({ success: true, alertasGeneradas: alertas });
      })
    );
  }

  public getInsumosPorServiciosAgencia(agenciaId?: string, servicioIds?: number[]): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/agencia/insumos-servicios'), { agenciaId, servicioIds }).pipe(
      catchError(() => of(null))
    );
  }

  public getInsumosPorServiciosPulidor(pulidorId?: string, servicioIds?: number[]): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/pulidor/insumos-servicios'), { pulidorId, servicioIds }).pipe(
      catchError(() => of(null))
    );
  }

  public getDespachosPendientesAgencia(agenciaId?: string): Observable<any[]> {
    return this.http.post<any[]>(apiUrl('/inventario/despachos/agencia/pendientes'), { agenciaId }).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los despachos pendientes', err);
        return of([]);
      })
    );
  }

  public crearDespacho(payload: any): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/despachos/crear'), payload).pipe(
      tap(() => this.cargarItems())
    );
  }

  /** Lista plana (hasta 100, el máximo por petición) para pantallas que aún no paginan. */
  public listDespachos(dto: any = {}): Observable<any[]> {
    return this.http.post<any[]>(apiUrl('/inventario/despachos/list'), dto).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los despachos', err);
        return of([]);
      })
    );
  }

  /** Página de despachos con orden, búsqueda y filtros en el servidor. No captura errores: la pantalla muestra el suyo. */
  public getDespachosPagina(consulta: ConsultaDespachos): Observable<RespuestaDespachosPagina> {
    const c = consulta;
    const body: Record<string, unknown> = {
      page: c.page || 1,
      pageSize: Math.min(c.pageSize || PAGE_SIZE_TABLA, PAGE_SIZE_MAX),
    };
    if (c.sortField) { body['sortField'] = c.sortField; body['sortOrder'] = c.sortOrder || 'desc'; }
    const texto = (c.search || '').trim();
    if (texto.length >= BUSQUEDA_MIN_CARACTERES) body['search'] = texto;
    const claves: (keyof ConsultaDespachos)[] = ['estadoDespacho', 'agenciaId', 'pulidorId', 'fechaDesde', 'fechaHasta'];
    for (const k of claves) {
      const v = c[k];
      if (v !== undefined && v !== null && v !== '') body[k] = v;
    }
    if (c.incluirResumen) body['incluirResumen'] = true;

    return this.http.post<any>(apiUrl('/inventario/despachos/list'), body).pipe(
      map((res) => ({
        pagina: normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number),
        resumen: res?.resumen as ResumenDespachos | undefined,
      })),
    );
  }

  public getDespachosRechazados(agenciaId?: string): Observable<any[]> {
    return this.listDespachos({ estadoDespacho: 'RECHAZADO', agenciaId });
  }

  public confirmarRecepcionDespacho(movimientoId: string, agenciaId?: string, observaciones?: string): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/despachos/confirmar-recepcion'), {
      movimientoId,
      accion: 'RECIBIDO',
      agenciaId,
      observaciones
    }).pipe(
      tap(() => this.cargarItems()),
      catchError(() => of({ ok: true }))
    );
  }

  public rechazarDespacho(movimientoId: string, motivo: string, agenciaId?: string): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/despachos/rechazar'), {
      movimientoId,
      motivo,
      observaciones: motivo,
      agenciaId
    }).pipe(
      tap(() => this.cargarItems()),
      catchError(() => of({ ok: true }))
    );
  }

  public cargarItems(): void {
    this.getProductos().subscribe((productos) => {
      const items: InventarioItem[] = productos.map((p) => {
        // Construir mapa de stock real por sucursal/agencia desde los registros de StockUbicacion
        const stockPorSucursal: Record<string, number> = {};
        const rawStocks: any[] = (p as any).stocks || [];
        for (const s of rawStocks) {
          if (s.tipoUbicacion && s.tipoUbicacion !== 'AGENCIA') continue;
          const cant = Number(s.cantidadActual || 0);
          const agId = s.agenciaId || s.agencia?.id;
          const agNombre = s.agencia?.nombre;
          if (agId) stockPorSucursal[agId] = cant;
          if (agNombre) {
            stockPorSucursal[agNombre] = cant;
            stockPorSucursal[agNombre.trim().toLowerCase()] = cant;
          }
        }

        return {
          producto: p,
          stockBodegaCentral: Number(p.stockActual || 0),
          stockPorSucursal,
          stockTotalRed: Number(p.stockActual || 0),
          estadoGeneral:
            Number(p.stockActual || 0) <= (Number(p.stockMinimoBodega) || 0)
              ? 'Critico'
              : 'Optimo',
          sucursalesEnAlerta: [],
        };
      });
      this.itemsSubject.next(items);

      // Sincronización continua y directa con el consolidado multi-sede
      this.getStockAgenciasResumen().subscribe((res) => {
        if (res?.agencias && Array.isArray(res.agencias)) {
          const currentItems = [...this.itemsSubject.value];
          let modified = false;

          for (const agItem of res.agencias) {
            const agId = agItem.agencia?.id;
            const agNom = agItem.agencia?.nombre;
            const agNomLower = agNom ? agNom.trim().toLowerCase() : '';

            for (const ins of (agItem.insumos || [])) {
              const matched = currentItems.find(
                (ci) =>
                  String(ci.producto.id) === String(ins.insumoId) ||
                  ci.producto.codigoSKU === ins.codigoSKU
              );
              if (matched) {
                if (!matched.stockPorSucursal) matched.stockPorSucursal = {};
                const cant = Number(ins.stockActual ?? 0);
                if (agId) matched.stockPorSucursal[agId] = cant;
                if (agNom) matched.stockPorSucursal[agNom] = cant;
                if (agNomLower) matched.stockPorSucursal[agNomLower] = cant;
                modified = true;
              }
            }
          }

          if (modified) {
            this.itemsSubject.next(currentItems);
          }
        }
      });
    });
  }

  public getProductos(dto: any = {}): Observable<ProductoInsumo[]> {
    return this.http.post<any[]>(apiUrl('/inventario/insumos/list'), dto).pipe(
      map((items) => (items || []).map((i) => this.mapProducto(i))),
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los productos', err);
        return of([]);
      })
    );
  }

  /**
   * Página de productos con orden, búsqueda y filtros en el servidor (tipo, estado, nivel de stock). El stock es el de
   * la sede o la bodega del contexto. Orden: sku, nombre, tipo, contenido, stock, alerta, stockMinimoBodega,
   * stockOptimoBodega, stockMinimoAgencia, stockOptimoAgencia, estado, fecha. No captura errores: la tabla muestra el suyo.
   */
  public getProductosPagina(c: ConsultaProductos): Observable<PaginaConResumen<ProductoInsumo>> {
    const body = cuerpoConsulta(c, ['tipoProductoId', 'estado', 'nivelStock', 'agenciaId', 'bodegaId']);
    return postPagina<ProductoInsumo>(this.http, apiUrl('/inventario/insumos/list'), body, (i) => this.mapProducto(i));
  }

  private mapProducto(i: any): ProductoInsumo {
    return {
      id: i.id,
      codigoSKU: i.codigoSKU,
      nombre: i.nombre,
      categoria: i.categoria,
      tipoId: i.tipoProductoId || i.categoria,
      tipoNombre: i.tipoProducto?.nombre || i.categoria,
      tipoProductoId: i.tipoProductoId,
      tipoProducto: i.tipoProducto,
      unidadMedida: i.unidadMedida?.simbolo || i.unidadMedida?.nombre || 'u',
      unidadMedidaId: String(i.unidadMedidaId || i.unidadMedida?.id || ''),
      unidadMedidaObj: i.unidadMedida,
      contenidoNeto: Number(i.contenidoNeto || 1),
      stockActual: Number(i.stockActual || 0),
      stockMinimoBodega: Number(i.stockMinimoBodega || 0),
      stockMinimoAgencia: Number(i.stockMinimoAgencia || 0),
      stockOptimoBodega: Number(i.stockOptimoBodega || 0),
      stockOptimoAgencia: Number(i.stockOptimoAgencia || 0),
      stockAlertaBodega: Number(i.stockMinimoBodega || 0),
      stockAlertaSucursal: Number(i.stockMinimoAgencia || 0),
      stockMinimoGlobal: Number(i.stockMinimoBodega || 0),
      costoUnitarioUSD: Number(i.costoUnitarioUSD || 0),
      proveedorPrincipal: i.proveedorPrincipal || '',
      descripcion: i.descripcion || '',
      imagen: i.imagenUrl || '',
      imagenUrl: i.imagenUrl || '',
      activo: i.estado === 1,
      estado: i.estado,
      fechaCreacion: i.createdAt,
      presentaciones: i.presentaciones || [],
      stocks: i.stocks || [],
      serviciosAsociados: (i.recetas || []).map((r: any) => ({
        id: r.catalogoServicio?.id,
        codigo: r.catalogoServicio?.codigo,
        nombre: r.catalogoServicio?.nombre,
        categoria: r.catalogoServicio?.categoria,
        cantidadUsada: Number(r.cantidadUsada || 0),
        unidad: r.unidadConsumo?.simbolo || i.unidadMedida?.simbolo || 'u',
      })),
    };
  }

  public crearProducto(dto: any): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/insumos/create'), dto).pipe(
      tap(() => this.cargarItems())
    );
  }

  public actualizarProducto(dto: any): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/insumos/update'), dto).pipe(
      tap(() => this.cargarItems())
    );
  }

  // ============================================================
  //  8. BODEGAS & AGENCIAS (STOCK MULTI-SEDE)
  // ============================================================

  public getStockBodegasResumen(dto: any = {}): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/stock/bodegas-resumen'), dto).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el resumen de bodegas', err);
        return of({
          bodega: null,
          metricas: { totalInsumos: 0, stockTotalUnidades: 0, insumosBajoMinimo: 0, insumosOptimos: 0 },
          insumos: []
        });
      })
    );
  }

  /**
   * Una página de los insumos de una bodega con búsqueda, estado y orden en el servidor. Cada respuesta trae también la
   * bodega y las métricas de todos sus insumos (`resumen`). Orden: sku, nombre, tipo, contenido, stock, minimo, optimo, estado.
   */
  public getStockBodegaPagina(c: ConsultaInsumosBodega): Observable<PaginaConResumen<any, MetaBodega>> {
    const body = cuerpoConsulta(c, ['bodegaId', 'estado']);
    return this.http.post<any>(apiUrl('/inventario/stock/bodegas-resumen'), body).pipe(
      map((res) => ({
        pagina: normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number),
        resumen: { bodega: res?.bodega ?? null, bodegas: res?.bodegas ?? [], metricas: res?.metricas ?? {} } as MetaBodega,
      })),
    );
  }

  /** Página de fichas de agencia (sin insumos) con las métricas de toda la red. Orden: nombre, codigo, region, criticos, insumos, alerta. */
  public getAgenciasFichasPagina(c: ConsultaFichas): Observable<{ pagina: PaginaServidor<any>; metricas?: MetricasAgencias }> {
    const body = cuerpoConsulta(c, ['estadoUbicacion', 'excluirAgenciaId', 'regionId']);
    return this.http.post<any>(apiUrl('/inventario/stock/agencias-resumen'), body).pipe(
      map((res) => ({ pagina: normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number), metricas: res?.metricas })),
    );
  }

  /** Página de kits de pulidor (sin insumos) con las métricas. Orden: nombre, tipo, region, sede, criticos, insumos, alerta. */
  public getPulidoresFichasPagina(c: ConsultaFichas): Observable<{ pagina: PaginaServidor<any>; metricas?: MetricasPulidores }> {
    const body = cuerpoConsulta(c, ['estadoUbicacion', 'tipoPulidor', 'regionId', 'pulidorId']);
    return this.http.post<any>(apiUrl('/inventario/stock/pulidores-resumen'), body).pipe(
      map((res) => ({ pagina: normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number), metricas: res?.metricas })),
    );
  }

  /** Página de los insumos de UNA agencia o de UN kit de pulidor. Orden: sku, nombre, tipo, contenido, stock, minimo, deficit, estado. */
  public getInsumosUbicacionPagina(tipo: 'agencia' | 'pulidor', id: string, c: ConsultaInsumosUbicacion): Observable<PaginaConResumen<any>> {
    const body = { ...cuerpoConsulta(c, ['estado']), [tipo === 'agencia' ? 'agenciaId' : 'pulidorId']: id };
    const url = tipo === 'agencia' ? '/inventario/stock/agencias-resumen' : '/inventario/stock/pulidores-resumen';
    return postPagina<any>(this.http, apiUrl(url), body);
  }

  public getStockAgenciasResumen(dto: any = {}): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/stock/agencias-resumen'), dto).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el resumen de agencias', err);
        return of({ totalAgencias: 0, agenciasEnAlerta: 0, insumosCriticosTotal: 0, agencias: [] });
      })
    );
  }

  public getStockPulidoresResumen(dto: any = {}): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/stock/pulidores-resumen'), dto).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el resumen de pulidores', err);
        return of({ totalPulidores: 0, pulidoresEnAlerta: 0, insumosCriticosTotal: 0, pulidores: [] });
      })
    );
  }

  public getDespachosPendientes(): Observable<any[]> {
    return this.http.post<any[]>(apiUrl('/inventario/despachos/pendientes'), {}).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los despachos pendientes', err);
        return of([]);
      })
    );
  }
}

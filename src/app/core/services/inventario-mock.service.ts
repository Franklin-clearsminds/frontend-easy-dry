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
  BODEGA_CENTRAL_ID,
  TipoProductoCatalog,
  UnidadMedidaCatalog,
  PresentacionInsumoCatalog,
  TipoMovimientoCatalog,
  MovimientoInventarioGlobalItem,
  DashboardInventarioResumen,
  RegistrarMovimientoPayload,
} from '../models/inventario.model';
import { apiUrl } from '../config/env';

export const BODEGA_CENTRAL: BodegaInventario = {
  id: BODEGA_CENTRAL_ID,
  codigo: 'BOD-CENTRAL',
  nombre: 'Bodega Central',
  ciudad: 'Quito',
  region: 'Nacional',
  esCentral: true,
  activa: true,
  fechaCreacion: '2026-01-01',
};

@Injectable({
  providedIn: 'root',
})
export class InventarioMockService {
  private http = inject(HttpClient);

  // Observables para compatibilidad con vistas reactivas
  private tiposSubject = new BehaviorSubject<TipoProductoCatalog[]>([]);
  public tipos$ = this.tiposSubject.asObservable();

  private unidadesSubject = new BehaviorSubject<UnidadMedidaCatalog[]>([]);
  public unidades$ = this.unidadesSubject.asObservable();


  private bodegasSubject = new BehaviorSubject<BodegaInventario[]>([BODEGA_CENTRAL]);
  public bodegas$ = this.bodegasSubject.asObservable();

  private itemsSubject = new BehaviorSubject<InventarioItem[]>([]);
  public items$ = this.itemsSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoStock[]>([]);
  public movimientos$ = this.movimientosSubject.asObservable();

  constructor() {
    this.cargarCatalogosIniciales();
  }

  public cargarCatalogosIniciales(): void {
    this.cargarTiposDesdeBackend();
    this.cargarUnidadesDesdeBackend();
    this.cargarItems();
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
      catchError(() => of([]))
    );
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
      catchError(() => of([]))
    );
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
      catchError(() => of([]))
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
      catchError(() => of([]))
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

  public getHistorialMovimientos(dto: any = {}): Observable<{ items: MovimientoInventarioGlobalItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    return this.http.post<any>(apiUrl('/inventario/movimientos/historial'), dto).pipe(
      catchError(() => of({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }))
    );
  }

  // ============================================================
  //  6. DASHBOARD & STOCK BAJO (DATOS REALES)
  // ============================================================

  public getDashboardResumen(): Observable<DashboardInventarioResumen> {
    return this.http.post<DashboardInventarioResumen>(apiUrl('/inventario/dashboard/resumen'), {}).pipe(
      catchError(() =>
        of({
          totalProductos: 0,
          productosStockBajo: 0,
          entradasMes: 0,
          consumosMes: 0,
          totalMovimientosMes: 0,
          ultimosMovimientos: [],
        })
      )
    );
  }

  public getStockBajo(dto: any = {}): Observable<{ items: ProductoInsumo[]; total: number }> {
    return this.http.post<any>(apiUrl('/inventario/stock-bajo/list'), dto).pipe(
      catchError(() => of({ items: [], total: 0 }))
    );
  }

  // ============================================================
  //  7. PRODUCTOS / INSUMOS MAESTROS (CRUD 100% POST)
  // ============================================================

  public getItems(): Observable<InventarioItem[]> {
    return this.items$;
  }

  public getStockDisponibleSucursal(productoId: number | string, sucursalId?: number | string): number {
    const item = this.itemsSubject.value.find(i => i.producto.id === productoId || i.producto.codigoSKU === productoId);
    if (!item) return 0;
    if (sucursalId && item.stockPorSucursal && item.stockPorSucursal[sucursalId.toString()] != null) {
      return item.stockPorSucursal[sucursalId.toString()];
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
              alertas.push(`⚠️ Stock Bajo: ${found.producto.nombre} en ${agenciaId} (quedan ${found.stockBodegaCentral} ${found.producto.unidadMedida})`);
            }
          }
        });

        this.itemsSubject.next(currentItems);
        return of({ success: true, alertasGeneradas: alertas });
      })
    );
  }

  public getInsumosPorServiciosAgencia(agenciaId?: string): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/agencia/insumos-servicios'), { agenciaId }).pipe(
      catchError(() => of(null))
    );
  }

  public cargarItems(): void {
    this.getProductos().subscribe((productos) => {
      const items: InventarioItem[] = productos.map((p) => ({
        producto: p,
        stockBodegaCentral: Number(p.stockActual || 0),
        stockPorSucursal: {},
        stockTotalRed: Number(p.stockActual || 0),
        estadoGeneral:
          Number(p.stockActual || 0) <= (Number(p.stockMinimoBodega) || 0)
            ? 'Critico'
            : 'Optimo',
        sucursalesEnAlerta: [],
      }));
      this.itemsSubject.next(items);
    });
  }

  public getProductos(dto: any = {}): Observable<ProductoInsumo[]> {
    return this.http.post<any[]>(apiUrl('/inventario/insumos/list'), dto).pipe(
      map((items) =>
        (items || []).map((i) => ({
          id: i.id,
          codigoSKU: i.codigoSKU,
          nombre: i.nombre,
          categoria: i.categoria,
          tipoId: i.tipoProductoId || i.categoria,
          tipoNombre: i.tipoProducto?.nombre || i.categoria,
          tipoProductoId: i.tipoProductoId,
          tipoProducto: i.tipoProducto,
          unidadMedida: i.unidadMedida?.simbolo || i.unidadMedida?.nombre || 'u',
          unidadMedidaId: i.unidadMedidaId,
          unidadMedidaObj: i.unidadMedida,
          contenidoNeto: Number(i.contenidoNeto || 1),
          stockActual: Number(i.stockActual || 0),
          stockMinimoBodega: Number(i.stockMinimoBodega || 0),
          stockMinimoAgencia: Number(i.stockMinimoAgencia || 0),
          stockOptimoBodega: Number(i.stockOptimoBodega || 0),
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
          createdAt: i.createdAt,
          presentaciones: i.presentaciones || [],
        }))
      ),
      catchError(() => of([]))
    );
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
      catchError(() => of({
        bodega: { id: 'bod_central', codigo: 'BOD-CENTRAL', nombre: 'Bodega Central Nacional', ciudad: 'Quito', esCentral: true, activa: true },
        metricas: { totalInsumos: 0, stockTotalUnidades: 0, insumosBajoMinimo: 0, insumosOptimos: 0 },
        insumos: []
      }))
    );
  }

  public getStockAgenciasResumen(dto: any = {}): Observable<any> {
    return this.http.post<any>(apiUrl('/inventario/stock/agencias-resumen'), dto).pipe(
      catchError(() => of({ totalAgencias: 0, agenciasEnAlerta: 0, insumosCriticosTotal: 0, agencias: [] }))
    );
  }
}

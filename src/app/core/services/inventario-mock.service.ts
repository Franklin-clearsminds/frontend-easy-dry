import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  TipoProducto,
  EnvaseUnidad,
  ProductoInsumo,
  InventarioItem,
  MovimientoStock,
  AlertaReabastecimiento,
  InsumoConsumidoServicio
} from '../models/inventario.model';

// =========================================================================
// DATOS INICIALES POR DEFECTO
// =========================================================================

export const TIPOS_PRODUCTO_INICIALES: TipoProducto[] = [
  {
    id: 'tipo_quimicos',
    codigo: 'QUIMICO',
    nombre: 'Químicos de Lavado & Detallado',
    descripcion: 'Shampoos ecológicos, ceras, desengrasantes, abrillantadores y selladores',
    icono: 'flask-conical',
    esLiquido: true,
    colorBadge: 'bg-blue-100 text-blue-800 border-blue-200',
    activo: true
  },
  {
    id: 'tipo_textiles',
    codigo: 'TEXTIL',
    nombre: 'Textiles & Microfibras',
    descripcion: 'Paños de secado, toallas de microfibra, guantes de lavado y esponjas',
    icono: 'layers',
    esLiquido: false,
    colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    activo: true
  },
  {
    id: 'tipo_accesorios',
    codigo: 'UNITARIO',
    nombre: 'Accesorios & Herramientas Unitarias',
    descripcion: 'Atomizadores, cepillos de llantas, brochas de detallado, pistolas tornador',
    icono: 'wrench',
    esLiquido: false,
    colorBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    activo: true
  },
  {
    id: 'tipo_epp',
    codigo: 'EPP',
    nombre: 'Protección & Seguridad (EPP)',
    descripcion: 'Guantes de nitrilo, mascarillas, gafas de seguridad y botas impermeables',
    icono: 'shield',
    esLiquido: false,
    colorBadge: 'bg-purple-100 text-purple-800 border-purple-200',
    activo: true
  }
];

export const ENVASES_UNIDADES_INICIALES: EnvaseUnidad[] = [
  {
    id: 'env_caneca_20l',
    codigo: 'CANECA_20L',
    nombre: 'Caneca Industrial (20 Litros)',
    abreviatura: 'Caneca 20L',
    tipoAplicable: 'liquido',
    capacidadTexto: '20,000 ml',
    descripcion: 'Envase a granel para distribución central a sucursales'
  },
  {
    id: 'env_galon',
    codigo: 'GALON',
    nombre: 'Galón (3.785 Litros)',
    abreviatura: 'Galón (3.8L)',
    tipoAplicable: 'liquido',
    capacidadTexto: '3,785 ml',
    descripcion: 'Presentación estándar para uso continuo en bahía'
  },
  {
    id: 'env_litro',
    codigo: 'LITRO',
    nombre: 'Botella de 1 Litro',
    abreviatura: 'Litro (1L)',
    tipoAplicable: 'liquido',
    capacidadTexto: '1,000 ml',
    descripcion: 'Presentación para acabados especiales y ceras'
  },
  {
    id: 'env_unidad',
    codigo: 'UNIDAD',
    nombre: 'Unidad Individual',
    abreviatura: 'Unidad (u)',
    tipoAplicable: 'unitario',
    descripcion: 'Pieza individual'
  },
  {
    id: 'env_pack_10',
    codigo: 'PACK_10',
    nombre: 'Paquete de 10 Unidades',
    abreviatura: 'Pack x10',
    tipoAplicable: 'unitario',
    descripcion: 'Paquete de paños o esponjas'
  },
  {
    id: 'env_caja_50',
    codigo: 'CAJA_50',
    nombre: 'Caja x 50 / 100 Unidades',
    abreviatura: 'Caja x50',
    tipoAplicable: 'unitario',
    descripcion: 'Cajas de guantes de nitrilo y consumibles descartables'
  }
];

export const PRODUCTOS_INICIALES: InventarioItem[] = [
  {
    producto: {
      id: 1,
      codigoSKU: 'QUIM-001',
      nombre: 'Shampoo Ecológico Ultra-Espuma pH Neutro',
      tipoId: 'tipo_quimicos',
      tipoNombre: 'Químicos de Lavado & Detallado',
      envaseId: 'env_caneca_20l',
      envaseNombre: 'Caneca Industrial (20 Litros)',
      unidadMedida: 'Caneca 20L',
      descripcion: 'Fórmula biodegradable concentrada 1:200 con agentes lubricantes para lavado sin rayas.',
      stockAlertaBodega: 10,
      stockAlertaSucursal: 3,
      stockMinimoGlobal: 10,
      stockOptimoGlobal: 30,
      costoUnitarioUSD: 42.50,
      proveedorPrincipal: 'EcoChemicals Ecuador S.A.',
      imagen: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
      activo: true,
      fechaCreacion: '2026-01-10'
    },
    stockBodegaCentral: 24,
    stockPorSucursal: {
      'EasyDry Quito Norte': 6,
      'EasyDry Quito Sur': 4,
      'EasyDry Cumbayá': 5,
      'EasyDry Guayaquil': 8
    },
    stockTotalRed: 47,
    estadoGeneral: 'Optimo',
    sucursalesEnAlerta: []
  },
  {
    producto: {
      id: 2,
      codigoSKU: 'QUIM-002',
      nombre: 'Cera Líquida Polimérica Carnauba Gold',
      tipoId: 'tipo_quimicos',
      tipoNombre: 'Químicos de Lavado & Detallado',
      envaseId: 'env_galon',
      envaseNombre: 'Galón (3.785 Litros)',
      unidadMedida: 'Galón (3.8L)',
      descripcion: 'Cera hidrofóbica de secado rápido con protección UV y brillo espejo de larga duración.',
      stockAlertaBodega: 10,
      stockAlertaSucursal: 3,
      stockMinimoGlobal: 15,
      stockOptimoGlobal: 40,
      costoUnitarioUSD: 28.00,
      proveedorPrincipal: 'CarDetail Pro Distributors',
      imagen: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=500&auto=format&fit=crop&q=80',
      activo: true,
      fechaCreacion: '2026-01-12'
    },
    stockBodegaCentral: 18,
    stockPorSucursal: {
      'EasyDry Quito Norte': 8,
      'EasyDry Quito Sur': 3,
      'EasyDry Cumbayá': 4,
      'EasyDry Guayaquil': 6
    },
    stockTotalRed: 39,
    estadoGeneral: 'Optimo',
    sucursalesEnAlerta: []
  },
  {
    producto: {
      id: 3,
      codigoSKU: 'QUIM-003',
      nombre: 'Desengrasante Motor & Chasis Biodegradable',
      tipoId: 'tipo_quimicos',
      tipoNombre: 'Químicos de Lavado & Detallado',
      envaseId: 'env_caneca_20l',
      envaseNombre: 'Caneca Industrial (20 Litros)',
      unidadMedida: 'Caneca 20L',
      descripcion: 'Desengrasante alcalino de alta eficiencia para desincrustar grasa y polvo de frenos.',
      stockAlertaBodega: 8,
      stockAlertaSucursal: 2,
      stockMinimoGlobal: 12,
      stockOptimoGlobal: 25,
      costoUnitarioUSD: 36.00,
      proveedorPrincipal: 'EcoChemicals Ecuador S.A.',
      imagen: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=80',
      activo: true,
      fechaCreacion: '2026-01-15'
    },
    stockBodegaCentral: 5,
    stockPorSucursal: {
      'EasyDry Quito Norte': 2,
      'EasyDry Quito Sur': 1,
      'EasyDry Cumbayá': 2,
      'EasyDry Guayaquil': 2
    },
    stockTotalRed: 12,
    estadoGeneral: 'Critico',
    sucursalesEnAlerta: ['Bodega Central', 'EasyDry Quito Sur']
  },
  {
    producto: {
      id: 4,
      codigoSKU: 'QUIM-004',
      nombre: 'Gel Abrillantador de Neumáticos con Silicón UV',
      tipoId: 'tipo_quimicos',
      tipoNombre: 'Químicos de Lavado & Detallado',
      envaseId: 'env_galon',
      envaseNombre: 'Galón (3.785 Litros)',
      unidadMedida: 'Galón (3.8L)',
      descripcion: 'Acabado negro profundo no grasoso con fórmula repelente al agua y polvo.',
      stockAlertaBodega: 8,
      stockAlertaSucursal: 3,
      stockMinimoGlobal: 10,
      stockOptimoGlobal: 30,
      costoUnitarioUSD: 22.50,
      proveedorPrincipal: 'CarDetail Pro Distributors',
      imagen: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=500&auto=format&fit=crop&q=80',
      activo: true,
      fechaCreacion: '2026-01-20'
    },
    stockBodegaCentral: 14,
    stockPorSucursal: {
      'EasyDry Quito Norte': 5,
      'EasyDry Quito Sur': 4,
      'EasyDry Cumbayá': 6,
      'EasyDry Guayaquil': 5
    },
    stockTotalRed: 34,
    estadoGeneral: 'Optimo',
    sucursalesEnAlerta: []
  },
  {
    producto: {
      id: 5,
      codigoSKU: 'TEX-001',
      nombre: 'Paños de Microfibra Premium 40x40cm 380GSM (Pack x10)',
      tipoId: 'tipo_textiles',
      tipoNombre: 'Textiles & Microfibras',
      envaseId: 'env_pack_10',
      envaseNombre: 'Paquete de 10 Unidades',
      unidadMedida: 'Pack x10',
      descripcion: 'Toallas de microfibra ultrasuaves sin bordes para secado y remoción de cera sin rayones.',
      stockAlertaBodega: 12,
      stockAlertaSucursal: 3,
      stockMinimoGlobal: 20,
      stockOptimoGlobal: 60,
      costoUnitarioUSD: 14.00,
      proveedorPrincipal: 'Textiles Industriales del Pacífico',
      imagen: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80',
      activo: true,
      fechaCreacion: '2026-01-22'
    },
    stockBodegaCentral: 8,
    stockPorSucursal: {
      'EasyDry Quito Norte': 3,
      'EasyDry Quito Sur': 2,
      'EasyDry Cumbayá': 4,
      'EasyDry Guayaquil': 3
    },
    stockTotalRed: 20,
    estadoGeneral: 'Bajo',
    sucursalesEnAlerta: ['Bodega Central', 'EasyDry Quito Sur']
  },
  {
    producto: {
      id: 6,
      codigoSKU: 'EPP-001',
      nombre: 'Guantes de Nitrilo Industrial Alta Resistencia (Caja x50)',
      tipoId: 'tipo_epp',
      tipoNombre: 'Protección & Seguridad (EPP)',
      envaseId: 'env_caja_50',
      envaseNombre: 'Caja x 50 / 100 Unidades',
      unidadMedida: 'Caja x50',
      descripcion: 'Guantes negros de nitrilo calibre 6mil libres de polvo, resistentes a químicos y disolventes.',
      stockAlertaBodega: 15,
      stockAlertaSucursal: 4,
      stockMinimoGlobal: 15,
      stockOptimoGlobal: 45,
      costoUnitarioUSD: 9.80,
      proveedorPrincipal: 'Seguridad Industrial Andina',
      imagen: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=500&auto=format&fit=crop&q=80',
      activo: true,
      fechaCreacion: '2026-01-25'
    },
    stockBodegaCentral: 32,
    stockPorSucursal: {
      'EasyDry Quito Norte': 8,
      'EasyDry Quito Sur': 6,
      'EasyDry Cumbayá': 7,
      'EasyDry Guayaquil': 10
    },
    stockTotalRed: 63,
    estadoGeneral: 'Optimo',
    sucursalesEnAlerta: []
  },
  {
    producto: {
      id: 7,
      codigoSKU: 'ACC-001',
      nombre: 'Atomizador Industrial Resistente a Químicos 1L Heavy Duty',
      tipoId: 'tipo_accesorios',
      tipoNombre: 'Accesorios & Herramientas Unitarias',
      envaseId: 'env_unidad',
      envaseNombre: 'Unidad Individual',
      unidadMedida: 'Unidad (u)',
      descripcion: 'Botella graduada con boquilla graduable de alto caudal y empaques resistentes a solventes.',
      stockAlertaBodega: 10,
      stockAlertaSucursal: 4,
      stockMinimoGlobal: 15,
      stockOptimoGlobal: 50,
      costoUnitarioUSD: 6.50,
      proveedorPrincipal: 'CarDetail Pro Distributors',
      imagen: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=500&auto=format&fit=crop&q=80',
      activo: true,
      fechaCreacion: '2026-02-01'
    },
    stockBodegaCentral: 25,
    stockPorSucursal: {
      'EasyDry Quito Norte': 10,
      'EasyDry Quito Sur': 8,
      'EasyDry Cumbayá': 9,
      'EasyDry Guayaquil': 12
    },
    stockTotalRed: 64,
    estadoGeneral: 'Optimo',
    sucursalesEnAlerta: []
  }
];

export const MOVIMIENTOS_INICIALES: MovimientoStock[] = [
  {
    id: 1,
    codigoMovimiento: 'MOV-2026-001',
    fecha: '2026-07-22 09:30',
    tipo: 'Despacho a Sucursal',
    productoId: 1,
    productoNombre: 'Shampoo Ecológico Ultra-Espuma pH Neutro',
    productoSKU: 'QUIM-001',
    origen: 'Bodega Central HUB',
    destino: 'EasyDry Quito Norte',
    cantidad: 4,
    unidad: 'Caneca 20L',
    responsable: 'Franklin Administrador',
    observaciones: 'Reabastecimiento quincenal para 8 bahías activas.'
  },
  {
    id: 2,
    codigoMovimiento: 'MOV-2026-002',
    fecha: '2026-07-20 14:15',
    tipo: 'Entrada Bodega',
    productoId: 6,
    productoNombre: 'Guantes de Nitrilo Industrial Alta Resistencia (Caja x50)',
    productoSKU: 'EPP-001',
    origen: 'Seguridad Industrial Andina (Factura #9823)',
    destino: 'Bodega Central HUB',
    cantidad: 20,
    unidad: 'Caja x50',
    responsable: 'Franklin Administrador',
    observaciones: 'Compra mensual de insumos de protección.',
    costoTotalUSD: 196.00
  },
  {
    id: 3,
    codigoMovimiento: 'MOV-2026-003',
    fecha: '2026-07-18 11:00',
    tipo: 'Despacho a Sucursal',
    productoId: 2,
    productoNombre: 'Cera Líquida Polimérica Carnauba Gold',
    productoSKU: 'QUIM-002',
    origen: 'Bodega Central HUB',
    destino: 'EasyDry Guayaquil',
    cantidad: 5,
    unidad: 'Galón (3.8L)',
    responsable: 'Franklin Administrador',
    observaciones: 'Envío interprovincial para alta demanda de encerado cerámico.'
  }
];

const KEYS = {
  TIPOS: 'easydry_inv_tipos_v5',
  ENVASES: 'easydry_inv_envases_v5',
  ITEMS: 'easydry_inv_items_v5',
  MOVIMIENTOS: 'easydry_inv_movimientos_v5'
};

@Injectable({
  providedIn: 'root'
})
export class InventarioMockService {
  private tiposSubject = new BehaviorSubject<TipoProducto[]>(this.loadStored(KEYS.TIPOS, TIPOS_PRODUCTO_INICIALES));
  public tipos$ = this.tiposSubject.asObservable();

  private envasesSubject = new BehaviorSubject<EnvaseUnidad[]>(this.loadStored(KEYS.ENVASES, ENVASES_UNIDADES_INICIALES));
  public envases$ = this.envasesSubject.asObservable();

  private itemsSubject = new BehaviorSubject<InventarioItem[]>(this.loadStored(KEYS.ITEMS, PRODUCTOS_INICIALES));
  public items$ = this.itemsSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoStock[]>(this.loadStored(KEYS.MOVIMIENTOS, MOVIMIENTOS_INICIALES));
  public movimientos$ = this.movimientosSubject.asObservable();

  private loadStored<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  private saveStored<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }

  // =========================================================================
  // GESTIÓN DE TIPOS DE PRODUCTO
  // =========================================================================

  getTipos(): Observable<TipoProducto[]> {
    return this.tipos$.pipe(delay(200));
  }

  crearTipo(tipo: Omit<TipoProducto, 'id'>): Observable<TipoProducto> {
    const current = this.tiposSubject.value;
    const nuevo: TipoProducto = {
      ...tipo,
      id: `tipo_${Date.now()}`
    };
    const updated = [...current, nuevo];
    this.saveStored(KEYS.TIPOS, updated);
    this.tiposSubject.next(updated);
    return of(nuevo).pipe(delay(250));
  }

  actualizarTipo(id: string, updates: Partial<TipoProducto>): Observable<TipoProducto | null> {
    const current = this.tiposSubject.value;
    const idx = current.findIndex(t => t.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updates };
      this.saveStored(KEYS.TIPOS, current);
      this.tiposSubject.next([...current]);
      return of(current[idx]).pipe(delay(200));
    }
    return of(null);
  }

  eliminarTipo(id: string): Observable<boolean> {
    const current = this.tiposSubject.value.filter(t => t.id !== id);
    this.saveStored(KEYS.TIPOS, current);
    this.tiposSubject.next(current);
    return of(true).pipe(delay(200));
  }

  // =========================================================================
  // GESTIÓN DE ENVASES Y UNIDADES DE MEDIDA
  // =========================================================================

  getEnvases(): Observable<EnvaseUnidad[]> {
    return this.envases$.pipe(delay(200));
  }

  crearEnvase(envase: Omit<EnvaseUnidad, 'id'>): Observable<EnvaseUnidad> {
    const current = this.envasesSubject.value;
    const nuevo: EnvaseUnidad = {
      ...envase,
      id: `env_${Date.now()}`
    };
    const updated = [...current, nuevo];
    this.saveStored(KEYS.ENVASES, updated);
    this.envasesSubject.next(updated);
    return of(nuevo).pipe(delay(250));
  }

  actualizarEnvase(id: string, updates: Partial<EnvaseUnidad>): Observable<EnvaseUnidad | null> {
    const current = this.envasesSubject.value;
    const idx = current.findIndex(e => e.id === id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updates };
      this.saveStored(KEYS.ENVASES, current);
      this.envasesSubject.next([...current]);
      return of(current[idx]).pipe(delay(200));
    }
    return of(null);
  }

  eliminarEnvase(id: string): Observable<boolean> {
    const current = this.envasesSubject.value.filter(e => e.id !== id);
    this.saveStored(KEYS.ENVASES, current);
    this.envasesSubject.next(current);
    return of(true).pipe(delay(200));
  }

  // =========================================================================
  // GESTIÓN DEL INVENTARIO Y CATÁLOGO DE PRODUCTOS
  // =========================================================================

  getItems(): Observable<InventarioItem[]> {
    return this.items$.pipe(delay(200));
  }

  crearProducto(prod: Omit<ProductoInsumo, 'id' | 'fechaCreacion'>, stockInicialBodega = 10): Observable<InventarioItem> {
    const current = this.itemsSubject.value;
    const nextId = Math.max(...current.map(i => i.producto.id), 0) + 1;
    const nuevoProd: ProductoInsumo = {
      ...prod,
      id: nextId,
      fechaCreacion: new Date().toISOString().substring(0, 10)
    };

    const nuevoItem: InventarioItem = {
      producto: nuevoProd,
      stockBodegaCentral: stockInicialBodega,
      stockPorSucursal: {
        'EasyDry Quito Norte': 0,
        'EasyDry Quito Sur': 0,
        'EasyDry Cumbayá': 0,
        'EasyDry Guayaquil': 0
      },
      stockTotalRed: stockInicialBodega,
      estadoGeneral: stockInicialBodega < (prod.stockAlertaBodega ?? prod.stockMinimoGlobal ?? 10) ? 'Critico' : 'Optimo',
      sucursalesEnAlerta: []
    };

    const updated = [nuevoItem, ...current];
    this.saveStored(KEYS.ITEMS, updated);
    this.itemsSubject.next(updated);

    // Registrar movimiento inicial si hay stock
    if (stockInicialBodega > 0) {
      this.registrarMovimientoInterno({
        tipo: 'Entrada Bodega',
        productoId: nextId,
        productoNombre: nuevoProd.nombre,
        productoSKU: nuevoProd.codigoSKU,
        origen: 'Inventario Inicial Apertura',
        destino: 'Bodega Central HUB',
        cantidad: stockInicialBodega,
        unidad: nuevoProd.unidadMedida,
        responsable: 'Franklin Administrador',
        observaciones: 'Stock inicial registrado al crear el producto.'
      });
    }

    return of(nuevoItem).pipe(delay(300));
  }

  actualizarProducto(productoId: number, updates: Partial<ProductoInsumo>): Observable<InventarioItem | null> {
    const current = this.itemsSubject.value;
    const idx = current.findIndex(i => i.producto.id === productoId);
    if (idx !== -1) {
      current[idx].producto = { ...current[idx].producto, ...updates };
      this.recalcularEstadoItem(current[idx]);
      this.saveStored(KEYS.ITEMS, current);
      this.itemsSubject.next([...current]);
      return of(current[idx]).pipe(delay(250));
    }
    return of(null);
  }

  eliminarProducto(productoId: number): Observable<boolean> {
    const current = this.itemsSubject.value.filter(i => i.producto.id !== productoId);
    this.saveStored(KEYS.ITEMS, current);
    this.itemsSubject.next(current);
    return of(true).pipe(delay(200));
  }

  // =========================================================================
  // OPERACIONES DE STOCK: DESPACHOS, ENTRADAS Y AJUSTES
  // =========================================================================

  /** Despachar insumos desde Bodega Central hacia una Sucursal */
  despacharASucursal(
    productoId: number,
    sucursalDestino: string,
    cantidad: number,
    responsable = 'Franklin Administrador',
    observacion = ''
  ): Observable<{ success: boolean; message?: string; item?: InventarioItem }> {
    const current = this.itemsSubject.value;
    const item = current.find(i => i.producto.id === productoId);

    if (!item) {
      return of({ success: false, message: 'Producto no encontrado en inventario.' });
    }

    if (item.stockBodegaCentral < cantidad) {
      return of({
        success: false,
        message: `Stock insuficiente en Bodega Central (${item.stockBodegaCentral} disponibles, intentando despachar ${cantidad}).`
      });
    }

    // Actualizar stock
    item.stockBodegaCentral -= cantidad;
    if (!item.stockPorSucursal[sucursalDestino]) {
      item.stockPorSucursal[sucursalDestino] = 0;
    }
    item.stockPorSucursal[sucursalDestino] += cantidad;

    this.recalcularEstadoItem(item);
    this.saveStored(KEYS.ITEMS, current);
    this.itemsSubject.next([...current]);

    // Registrar movimiento
    this.registrarMovimientoInterno({
      tipo: 'Despacho a Sucursal',
      productoId: item.producto.id,
      productoNombre: item.producto.nombre,
      productoSKU: item.producto.codigoSKU,
      origen: 'Bodega Central HUB',
      destino: sucursalDestino,
      cantidad,
      unidad: item.producto.unidadMedida,
      responsable,
      observaciones: observacion || `Despacho de abastecimiento operativo para ${sucursalDestino}.`
    });

    return of({ success: true, item }).pipe(delay(350));
  }

  /** Registrar entrada de compras o reposición en Bodega Central */
  registrarEntradaBodega(
    productoId: number,
    cantidad: number,
    costoTotalUSD = 0,
    proveedor = '',
    responsable = 'Franklin Administrador',
    observacion = ''
  ): Observable<{ success: boolean; item?: InventarioItem }> {
    const current = this.itemsSubject.value;
    const item = current.find(i => i.producto.id === productoId);

    if (!item) return of({ success: false });

    item.stockBodegaCentral += cantidad;
    this.recalcularEstadoItem(item);
    this.saveStored(KEYS.ITEMS, current);
    this.itemsSubject.next([...current]);

    this.registrarMovimientoInterno({
      tipo: 'Entrada Bodega',
      productoId: item.producto.id,
      productoNombre: item.producto.nombre,
      productoSKU: item.producto.codigoSKU,
      origen: proveedor || item.producto.proveedorPrincipal || 'Proveedor',
      destino: 'Bodega Central HUB',
      cantidad,
      unidad: item.producto.unidadMedida,
      responsable,
      costoTotalUSD,
      observaciones: observacion || 'Ingreso de compra a inventario central.'
    });

    return of({ success: true, item }).pipe(delay(300));
  }

  /** Ajustar manualmente el stock de una sucursal */
  ajustarStockSucursal(
    productoId: number,
    sucursalNombre: string,
    nuevaCantidad: number,
    motivo: string,
    responsable = 'Franklin Administrador'
  ): Observable<boolean> {
    const current = this.itemsSubject.value;
    const item = current.find(i => i.producto.id === productoId);

    if (!item) return of(false);

    const anterior = item.stockPorSucursal[sucursalNombre] || 0;
    item.stockPorSucursal[sucursalNombre] = nuevaCantidad;
    this.recalcularEstadoItem(item);
    this.saveStored(KEYS.ITEMS, current);
    this.itemsSubject.next([...current]);

    this.registrarMovimientoInterno({
      tipo: 'Ajuste de Inventario',
      productoId: item.producto.id,
      productoNombre: item.producto.nombre,
      productoSKU: item.producto.codigoSKU,
      origen: `Ajuste (${anterior} -> ${nuevaCantidad})`,
      destino: sucursalNombre,
      cantidad: Math.abs(nuevaCantidad - anterior),
      unidad: item.producto.unidadMedida,
      responsable,
      observaciones: `Motivo: ${motivo}`
    });

    return of(true).pipe(delay(250));
  }

  // =========================================================================
  // HISTORIAL DE MOVIMIENTOS Y ALERTAS
  // =========================================================================

  getMovimientos(): Observable<MovimientoStock[]> {
    return this.movimientos$.pipe(delay(200));
  }

  getAlertasReabastecimiento(): Observable<AlertaReabastecimiento[]> {
    return this.items$.pipe(
      map(items => {
        const alertas: AlertaReabastecimiento[] = [];

        items.forEach(item => {
          // Alerta en Bodega Central
          const alertaBodega = item.producto.stockAlertaBodega ?? item.producto.stockMinimoGlobal ?? 10;
          if (item.stockBodegaCentral <= alertaBodega) {
            const stockOptimo = item.producto.stockOptimoGlobal ?? alertaBodega * 3;
            const deficit = stockOptimo - item.stockBodegaCentral;
            alertas.push({
              productoId: item.producto.id,
              productoSKU: item.producto.codigoSKU,
              productoNombre: item.producto.nombre,
              ubicacion: 'Bodega Central HUB',
              stockActual: item.stockBodegaCentral,
              stockMinimo: alertaBodega,
              deficit: deficit > 0 ? deficit : 5,
              unidad: item.producto.unidadMedida,
              nivel: item.stockBodegaCentral === 0 ? 'Critico' : (item.stockBodegaCentral <= alertaBodega / 2 ? 'Critico' : 'Bajo'),
              sugerenciaReabastecimiento: Math.max(deficit, 10)
            });
          }

          // Alertas en Sucursales
          const alertaSucursal = item.producto.stockAlertaSucursal ?? Math.ceil((item.producto.stockMinimoGlobal ?? 10) / 4);
          Object.entries(item.stockPorSucursal).forEach(([sucursal, qty]) => {
            if (qty <= alertaSucursal) {
              alertas.push({
                productoId: item.producto.id,
                productoSKU: item.producto.codigoSKU,
                productoNombre: item.producto.nombre,
                ubicacion: sucursal,
                stockActual: qty,
                stockMinimo: alertaSucursal,
                deficit: alertaSucursal * 2 - qty,
                unidad: item.producto.unidadMedida,
                nivel: qty === 0 ? 'Critico' : 'Bajo',
                sugerenciaReabastecimiento: alertaSucursal * 2
              });
            }
          });
        });

        return alertas;
      })
    );
  }

  /** Consumo automático de insumos en una sucursal al realizar un servicio (OT) */
  consumirInsumosServicio(
    sucursalNombre: string,
    ordenTrabajoOT: string,
    placa: string,
    insumos: InsumoConsumidoServicio[],
    operadorNombre = 'Operador Bahía'
  ): Observable<{ success: boolean; alertasGeneradas: string[] }> {
    const current = this.itemsSubject.value;
    const alertasGeneradas: string[] = [];

    insumos.forEach(consumo => {
      const item = current.find(i => i.producto.id === consumo.productoId);
      if (item) {
        if (!item.stockPorSucursal[sucursalNombre]) {
          item.stockPorSucursal[sucursalNombre] = 0;
        }

        // Descontar la cantidad utilizada
        const stockActual = item.stockPorSucursal[sucursalNombre];
        item.stockPorSucursal[sucursalNombre] = Math.max(0, stockActual - consumo.cantidad);

        // Recalcular estado
        this.recalcularEstadoItem(item);

        // Registrar movimiento
        this.registrarMovimientoInterno({
          tipo: 'Consumo en Bahía',
          productoId: item.producto.id,
          productoNombre: item.producto.nombre,
          productoSKU: item.producto.codigoSKU,
          origen: sucursalNombre,
          destino: `Servicio OT ${ordenTrabajoOT} (${placa})`,
          cantidad: consumo.cantidad,
          unidad: item.producto.unidadMedida,
          responsable: operadorNombre,
          observaciones: `Consumo automático por servicio OT ${ordenTrabajoOT} del vehículo ${placa}.`
        });

        // Verificar si cayó en alerta
        const minSucursal = item.producto.stockAlertaSucursal ?? Math.ceil((item.producto.stockMinimoGlobal ?? 10) / 4);
        if (item.stockPorSucursal[sucursalNombre] <= minSucursal) {
          alertasGeneradas.push(
            `Quedan solo ${item.stockPorSucursal[sucursalNombre]} ${item.producto.unidadMedida} de "${item.producto.nombre}" en ${sucursalNombre}.`
          );
        }
      }
    });

    this.saveStored(KEYS.ITEMS, current);
    this.itemsSubject.next([...current]);

    return of({ success: true, alertasGeneradas }).pipe(delay(250));
  }

  getStockDisponibleSucursal(productoId: number, sucursalNombre: string): number {
    const item = this.itemsSubject.value.find(i => i.producto.id === productoId);
    if (!item) return 0;
    return item.stockPorSucursal[sucursalNombre] || 0;
  }

  private recalcularEstadoItem(item: InventarioItem): void {
    const totalSucursales = Object.values(item.stockPorSucursal).reduce((a, b) => a + b, 0);
    item.stockTotalRed = item.stockBodegaCentral + totalSucursales;

    const alertaBodega = item.producto.stockAlertaBodega ?? item.producto.stockMinimoGlobal ?? 10;
    const alertaSucursal = item.producto.stockAlertaSucursal ?? Math.ceil((item.producto.stockMinimoGlobal ?? 10) / 4);

    const alertas: string[] = [];
    if (item.stockBodegaCentral <= alertaBodega) {
      alertas.push('Bodega Central');
    }

    Object.entries(item.stockPorSucursal).forEach(([suc, qty]) => {
      if (qty <= alertaSucursal) {
        alertas.push(suc);
      }
    });

    item.sucursalesEnAlerta = alertas;

    if (item.stockTotalRed <= alertaBodega || item.stockBodegaCentral <= 3) {
      item.estadoGeneral = 'Critico';
    } else if (item.stockTotalRed <= alertaBodega * 1.5 || alertas.length > 0) {
      item.estadoGeneral = 'Bajo';
    } else {
      item.estadoGeneral = 'Optimo';
    }
  }

  private registrarMovimientoInterno(mov: Omit<MovimientoStock, 'id' | 'codigoMovimiento' | 'fecha'>): void {
    const current = this.movimientosSubject.value;
    const nextId = current.length + 1;
    const nuevo: MovimientoStock = {
      ...mov,
      id: nextId,
      codigoMovimiento: `MOV-2026-${String(nextId).padStart(3, '0')}`,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    const updated = [nuevo, ...current];
    this.saveStored(KEYS.MOVIMIENTOS, updated);
    this.movimientosSubject.next(updated);
  }
}

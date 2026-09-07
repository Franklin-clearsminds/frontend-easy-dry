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
  InsumoConsumidoServicio,
  BodegaInventario,
  BODEGA_CENTRAL_ID,
  stockEnBodega
} from '../models/inventario.model';

export const BODEGA_CENTRAL: BodegaInventario = {
  id: BODEGA_CENTRAL_ID,
  codigo: 'BOD-CENTRAL',
  nombre: 'Bodega Central',
  ciudad: 'Quito',
  region: 'Nacional',
  esCentral: true,
  activa: true,
  fechaCreacion: '2026-01-01'
};

export const BODEGAS_INICIALES: BodegaInventario[] = [BODEGA_CENTRAL];

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
    observaciones: 'Compra mensual de insumos de protección.'
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
  ITEMS: 'easydry_inv_items_v6',
  MOVIMIENTOS: 'easydry_inv_movimientos_v5',
  BODEGAS: 'easydry_inv_bodegas_v1'
};

@Injectable({
  providedIn: 'root'
})
export class InventarioMockService {
  private tiposSubject = new BehaviorSubject<TipoProducto[]>(this.loadStored(KEYS.TIPOS, TIPOS_PRODUCTO_INICIALES));
  public tipos$ = this.tiposSubject.asObservable();

  private envasesSubject = new BehaviorSubject<EnvaseUnidad[]>(this.loadStored(KEYS.ENVASES, ENVASES_UNIDADES_INICIALES));
  public envases$ = this.envasesSubject.asObservable();

  private bodegasSubject = new BehaviorSubject<BodegaInventario[]>(this.cargarBodegas());
  public bodegas$ = this.bodegasSubject.asObservable();

  private itemsSubject = new BehaviorSubject<InventarioItem[]>(this.cargarItems());
  public items$ = this.itemsSubject.asObservable();

  private movimientosSubject = new BehaviorSubject<MovimientoStock[]>(this.loadStored(KEYS.MOVIMIENTOS, MOVIMIENTOS_INICIALES));
  public movimientos$ = this.movimientosSubject.asObservable();

  private cargarBodegas(): BodegaInventario[] {
    const storedRaw = this.loadStored<BodegaInventario[] | null>(KEYS.BODEGAS, null);
    const stored = Array.isArray(storedRaw) ? storedRaw : [];
    const sinCentral = stored.filter(b => b.id !== BODEGA_CENTRAL_ID && !b.esCentral);
    const found = stored.find(b => b.id === BODEGA_CENTRAL_ID || b.esCentral);
    const central: BodegaInventario = {
      ...BODEGA_CENTRAL,
      ...(found || {})
    };
    central.id = BODEGA_CENTRAL_ID;
    central.esCentral = true;
    central.activa = true;
    central.nombre = central.nombre?.trim() || BODEGA_CENTRAL.nombre;
    const merged = [central, ...sinCentral];
    this.saveStored(KEYS.BODEGAS, merged);
    return merged;
  }

  private cargarItems(): InventarioItem[] {
    const stored = this.loadStored<InventarioItem[] | null>(KEYS.ITEMS, null);
    const base = stored && stored.length ? stored : PRODUCTOS_INICIALES;
    const bodegas = this.bodegasSubject?.value ?? this.cargarBodegas();
    const hydratados = base.map(item => this.hidratarStockBodegas(item, bodegas));
    this.saveStored(KEYS.ITEMS, hydratados);
    return hydratados;
  }

  private hidratarStockBodegas(item: InventarioItem, bodegas: BodegaInventario[]): InventarioItem {
    const porBodega: Record<string, number> = { ...(item.stockPorBodega || {}) };
    if (porBodega[BODEGA_CENTRAL_ID] == null) {
      porBodega[BODEGA_CENTRAL_ID] = item.stockBodegaCentral ?? 0;
    }
    bodegas.forEach(b => {
      if (porBodega[b.id] == null) porBodega[b.id] = 0;
    });
    item.stockPorBodega = porBodega;
    item.stockBodegaCentral = porBodega[BODEGA_CENTRAL_ID] ?? 0;
    return item;
  }

  private syncStockCentral(item: InventarioItem): void {
    if (!item.stockPorBodega) item.stockPorBodega = {};
    item.stockPorBodega[BODEGA_CENTRAL_ID] = item.stockPorBodega[BODEGA_CENTRAL_ID] ?? 0;
    item.stockBodegaCentral = item.stockPorBodega[BODEGA_CENTRAL_ID];
  }

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
  // GESTIÓN DE BODEGAS (Bodega Central siempre existe)
  // =========================================================================

  getBodegas(): Observable<BodegaInventario[]> {
    return this.bodegas$.pipe(delay(150));
  }

  getBodegaCentral(): BodegaInventario {
    return this.bodegasSubject.value.find(b => b.esCentral) || BODEGA_CENTRAL;
  }

  crearBodega(data: { nombre: string; ciudad?: string; region?: string; codigo?: string }): Observable<{ success: boolean; message?: string; bodega?: BodegaInventario }> {
    const nombre = (data.nombre || '').trim();
    if (!nombre) {
      return of({ success: false, message: 'Ingrese el nombre de la bodega.' });
    }
    const current = this.bodegasSubject.value;
    const duplicada = current.some(b => b.nombre.toLowerCase() === nombre.toLowerCase());
    if (duplicada) {
      return of({ success: false, message: `Ya existe una bodega llamada "${nombre}".` });
    }

    const nuevo: BodegaInventario = {
      id: `bod_${Date.now()}`,
      codigo: (data.codigo || nombre).toUpperCase().replace(/\s+/g, '_').slice(0, 24),
      nombre,
      ciudad: (data.ciudad || '').trim(),
      region: (data.region || '').trim(),
      esCentral: false,
      activa: true,
      fechaCreacion: new Date().toISOString().substring(0, 10)
    };

    const updated = [...current, nuevo];
    this.saveStored(KEYS.BODEGAS, updated);
    this.bodegasSubject.next(updated);

    const items = this.itemsSubject.value.map(item => {
      const porBodega = { ...(item.stockPorBodega || {}) };
      porBodega[nuevo.id] = 0;
      item.stockPorBodega = porBodega;
      this.syncStockCentral(item);
      return item;
    });
    this.saveStored(KEYS.ITEMS, items);
    this.itemsSubject.next([...items]);

    return of({ success: true, bodega: nuevo }).pipe(delay(250));
  }

  eliminarBodega(id: string): Observable<{ success: boolean; message?: string }> {
    const bodega = this.bodegasSubject.value.find(b => b.id === id);
    if (!bodega) return of({ success: false, message: 'Bodega no encontrada.' });
    if (bodega.esCentral || bodega.id === BODEGA_CENTRAL_ID) {
      return of({ success: false, message: 'La Bodega Central no se puede eliminar.' });
    }

    const updated = this.bodegasSubject.value.filter(b => b.id !== id);
    this.saveStored(KEYS.BODEGAS, updated);
    this.bodegasSubject.next(updated);

    const items = this.itemsSubject.value.map(item => {
      if (item.stockPorBodega) {
        const { [id]: _removed, ...rest } = item.stockPorBodega;
        item.stockPorBodega = rest;
        this.syncStockCentral(item);
      }
      this.recalcularEstadoItem(item);
      return item;
    });
    this.saveStored(KEYS.ITEMS, items);
    this.itemsSubject.next([...items]);

    return of({ success: true }).pipe(delay(200));
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

    const stockPorBodega: Record<string, number> = {};
    this.bodegasSubject.value.forEach(b => {
      stockPorBodega[b.id] = b.esCentral ? stockInicialBodega : 0;
    });
    if (stockPorBodega[BODEGA_CENTRAL_ID] == null) {
      stockPorBodega[BODEGA_CENTRAL_ID] = stockInicialBodega;
    }

    const nuevoItem: InventarioItem = {
      producto: nuevoProd,
      stockBodegaCentral: stockInicialBodega,
      stockPorBodega,
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
        destino: this.getBodegaCentral().nombre,
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

  /** Despachar insumos desde una bodega (por defecto Bodega Central) hacia una Sucursal */
  despacharASucursal(
    productoId: number,
    sucursalDestino: string,
    cantidad: number,
    responsable = 'Franklin Administrador',
    observacion = '',
    bodegaOrigenId = BODEGA_CENTRAL_ID
  ): Observable<{ success: boolean; message?: string; item?: InventarioItem }> {
    const current = this.itemsSubject.value;
    const item = current.find(i => i.producto.id === productoId);

    if (!item) {
      return of({ success: false, message: 'Producto no encontrado en inventario.' });
    }

    const bodega = this.bodegasSubject.value.find(b => b.id === bodegaOrigenId) || this.getBodegaCentral();
    if (!item.stockPorBodega) item.stockPorBodega = {};
    const disponible = stockEnBodega(item, bodega.id);

    if (disponible < cantidad) {
      return of({
        success: false,
        message: `Stock insuficiente en ${bodega.nombre} (${disponible} disponibles, intentando despachar ${cantidad}).`
      });
    }

    item.stockPorBodega[bodega.id] = disponible - cantidad;
    this.syncStockCentral(item);
    if (!item.stockPorSucursal[sucursalDestino]) {
      item.stockPorSucursal[sucursalDestino] = 0;
    }
    item.stockPorSucursal[sucursalDestino] += cantidad;

    this.recalcularEstadoItem(item);
    this.saveStored(KEYS.ITEMS, current);
    this.itemsSubject.next([...current]);

    this.registrarMovimientoInterno({
      tipo: 'Despacho a Sucursal',
      productoId: item.producto.id,
      productoNombre: item.producto.nombre,
      productoSKU: item.producto.codigoSKU,
      origen: bodega.nombre,
      destino: sucursalDestino,
      cantidad,
      unidad: item.producto.unidadMedida,
      responsable,
      observaciones: observacion || `Despacho de abastecimiento operativo para ${sucursalDestino}.`
    });

    return of({ success: true, item }).pipe(delay(350));
  }

  /** Registrar entrada de compras o reposición en una bodega (por defecto Central) */
  registrarEntradaBodega(
    productoId: number,
    cantidad: number,
    proveedor = '',
    responsable = 'Franklin Administrador',
    observacion = '',
    bodegaDestinoId = BODEGA_CENTRAL_ID
  ): Observable<{ success: boolean; item?: InventarioItem }> {
    const current = this.itemsSubject.value;
    const item = current.find(i => i.producto.id === productoId);

    if (!item) return of({ success: false });

    const bodega = this.bodegasSubject.value.find(b => b.id === bodegaDestinoId) || this.getBodegaCentral();
    if (!item.stockPorBodega) item.stockPorBodega = {};
    item.stockPorBodega[bodega.id] = stockEnBodega(item, bodega.id) + cantidad;
    this.syncStockCentral(item);
    this.recalcularEstadoItem(item);
    this.saveStored(KEYS.ITEMS, current);
    this.itemsSubject.next([...current]);

    this.registrarMovimientoInterno({
      tipo: 'Entrada Bodega',
      productoId: item.producto.id,
      productoNombre: item.producto.nombre,
      productoSKU: item.producto.codigoSKU,
      origen: proveedor || 'Proveedor',
      destino: bodega.nombre,
      cantidad,
      unidad: item.producto.unidadMedida,
      responsable,
      observaciones: observacion || `Ingreso de compra a ${bodega.nombre}.`
    });

    return of({ success: true, item }).pipe(delay(300));
  }

  /** Ajustar manualmente el stock de una sucursal o de una bodega */
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

    const bodega = this.bodegasSubject.value.find(
      b => b.id === sucursalNombre || b.nombre === sucursalNombre
    );

    let anterior = 0;
    let destino = sucursalNombre;

    if (bodega) {
      if (!item.stockPorBodega) item.stockPorBodega = {};
      anterior = stockEnBodega(item, bodega.id);
      item.stockPorBodega[bodega.id] = nuevaCantidad;
      this.syncStockCentral(item);
      destino = bodega.nombre;
    } else {
      anterior = item.stockPorSucursal[sucursalNombre] || 0;
      item.stockPorSucursal[sucursalNombre] = nuevaCantidad;
    }

    this.recalcularEstadoItem(item);
    this.saveStored(KEYS.ITEMS, current);
    this.itemsSubject.next([...current]);

    this.registrarMovimientoInterno({
      tipo: 'Ajuste de Inventario',
      productoId: item.producto.id,
      productoNombre: item.producto.nombre,
      productoSKU: item.producto.codigoSKU,
      origen: `Ajuste (${anterior} -> ${nuevaCantidad})`,
      destino,
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
          const alertaBodega = item.producto.stockAlertaBodega ?? item.producto.stockMinimoGlobal ?? 10;
          this.bodegasSubject.value.forEach(bodega => {
            const qty = stockEnBodega(item, bodega.id);
            if (qty <= alertaBodega) {
              const stockOptimo = item.producto.stockOptimoGlobal ?? alertaBodega * 3;
              const deficit = stockOptimo - qty;
              alertas.push({
                productoId: item.producto.id,
                productoSKU: item.producto.codigoSKU,
                productoNombre: item.producto.nombre,
                ubicacion: bodega.nombre,
                stockActual: qty,
                stockMinimo: alertaBodega,
                deficit: deficit > 0 ? deficit : 5,
                unidad: item.producto.unidadMedida,
                nivel: qty === 0 ? 'Critico' : (qty <= alertaBodega / 2 ? 'Critico' : 'Bajo'),
                sugerenciaReabastecimiento: Math.max(deficit, 10)
              });
            }
          });

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
    this.syncStockCentral(item);
    const totalBodegas = Object.values(item.stockPorBodega || {}).reduce((a, b) => a + b, 0);
    const totalSucursales = Object.values(item.stockPorSucursal).reduce((a, b) => a + b, 0);
    item.stockTotalRed = totalBodegas + totalSucursales;

    const alertaBodega = item.producto.stockAlertaBodega ?? item.producto.stockMinimoGlobal ?? 10;
    const alertaSucursal = item.producto.stockAlertaSucursal ?? Math.ceil((item.producto.stockMinimoGlobal ?? 10) / 4);

    const alertas: string[] = [];
    this.bodegasSubject.value.forEach(b => {
      if (stockEnBodega(item, b.id) <= alertaBodega) {
        alertas.push(b.nombre);
      }
    });

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

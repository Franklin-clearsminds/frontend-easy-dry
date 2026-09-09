import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * MOCK DATA DE RESPALDO (SI LA BD VIENE VACÍA [] O SI FALLA LA CONEXIÓN)
 */
const MOCK_DB: Record<string, any[]> = {
  '/agencias/list': [
    { id: 1, nombre: 'Agencia Central Cumbayá', region: 'Quito', numeroBahias: 4, estado: 1, direccion: 'Av. Interoceánica Km 10', usuarios: [{ name: 'Carlos', lastname: 'Mendoza' }] },
    { id: 2, nombre: 'Agencia Norte Carcelén', region: 'Quito', numeroBahias: 3, estado: 1, direccion: 'Av. Galo Plaza Lasso N45', usuarios: [{ name: 'Ana', lastname: 'Gómez' }] },
    { id: 3, nombre: 'Agencia Samborondón', region: 'Guayaquil', numeroBahias: 5, estado: 1, direccion: 'Km 2.5 Vía a Samborondón', usuarios: [{ name: 'Luis', lastname: 'Pérez' }] }
  ],
  '/agencias/bahias/list': [
    { id: 'BAH-001', codigo: 'BAH-01', nombre: 'Bahía Express 1', tipo: 'Express', estado: 'LIBRE', agenciaId: 1 },
    { id: 'BAH-002', codigo: 'BAH-02', nombre: 'Bahía Detallado 2', tipo: 'Especial', estado: 'OCUPADA', agenciaId: 1 },
    { id: 'BAH-003', codigo: 'BAH-03', nombre: 'Bahía Secado 3', tipo: 'General', estado: 'LIBRE', agenciaId: 2 }
  ],
  '/maquinaria/list': [
    { id: 'MAQ-001', codigo: 'SEC-01', nombre: 'Secadora Industrial Turbo-Dry 3000', tipo: 'Secadora', estado: 'OPERATIVA', agenciaId: 1, marca: 'EasyDry Pro' },
    { id: 'MAQ-002', codigo: 'LAV-01', nombre: 'Hidrolavadora Alta Presión Kärcher Pro', tipo: 'Lavadora', estado: 'OPERATIVA', agenciaId: 1, marca: 'Kärcher' }
  ],
  '/catalogos/servicios/list': [
    { id: 1, codigo: 'SER-001', nombre: 'Lavado Express Ecológico', categoria: 'GENERAL', descripcion: 'Lavado exterior en seco con formulación bio-degradable.', precio: 8.0, tiempoEstimadoMin: 20, estado: 'Activo' },
    { id: 2, codigo: 'SER-002', nombre: 'Lavado Completo Carnauba', categoria: 'GENERAL', descripcion: 'Lavado exterior, aspirado habitáculo y encerado.', precio: 14.0, tiempoEstimadoMin: 35, estado: 'Activo' },
    { id: 3, codigo: 'ESP-001', nombre: 'Tratamiento Cerámico 9H', categoria: 'ESPECIAL', descripcion: 'Nano-recubrimiento cerámico grado 9H con efecto hidrofóbico.', precio: 180.0, tiempoEstimadoMin: 240, estado: 'Activo' }
  ],
  '/inventario/tipos/list': [
    { id: 'TIP-001', codigo: 'QUIM', nombre: 'Químicos y Champús', descripcion: 'Shampoo, ceras y desengrasantes', estado: 1 },
    { id: 'TIP-002', codigo: 'ACC', nombre: 'Accesorios y Microfibra', descripcion: 'Paños, toallas y esponjas', estado: 1 },
    { id: 'TIP-003', codigo: 'REP', nombre: 'Repuestos de Maquinaria', descripcion: 'Mangueras, boquillas y filtros', estado: 1 }
  ],
  '/inventario/unidades/list': [
    { id: 'UNI-001', codigo: 'L', nombre: 'Litros', simbolo: 'L', tipo: 'Volumen', estado: 1 },
    { id: 'UNI-002', codigo: 'ML', nombre: 'Mililitros', simbolo: 'ml', tipo: 'Volumen', estado: 1 },
    { id: 'UNI-003', codigo: 'UND', nombre: 'Unidad', simbolo: 'und', tipo: 'Conteo', estado: 1 },
    { id: 'UNI-004', codigo: 'KG', nombre: 'Kilogramo', simbolo: 'kg', tipo: 'Masa', estado: 1 }
  ],
  '/inventario/insumos/list': [
    { id: 'INS-001', codigoSKU: 'INS-LAV-001', nombre: 'Shampoo Bio-Espuma Concentrado', tipoNombre: 'Químicos y Champús', stockActual: 45, stockMinimo: 10, unidadSimbolo: 'L', precioUnitario: 12.50 },
    { id: 'INS-002', codigoSKU: 'INS-CER-002', nombre: 'Cera Carnauba Líquida High Gloss', tipoNombre: 'Químicos y Champús', stockActual: 18, stockMinimo: 5, unidadSimbolo: 'L', precioUnitario: 24.00 },
    { id: 'INS-003', codigoSKU: 'INS-TEX-011', nombre: 'Toalla Microfibra 40x40cm 600 GSM', tipoNombre: 'Accesorios y Microfibra', stockActual: 120, stockMinimo: 30, unidadSimbolo: 'und', precioUnitario: 2.50 }
  ],
  '/operaciones/servicios/list': [
    { id: 'ORD-1001', codigo: 'ORD-1001', clienteNombre: 'Juan Carlos Moreno', vehiculoPlaca: 'PCD-4582', servicioNombre: 'Lavado Express Ecológico', estado: 'EN_PROCESO', montoTotal: 8.0, fechaCreacion: '2026-09-09' },
    { id: 'ORD-1002', codigo: 'ORD-1002', clienteNombre: 'María Elena Torres', vehiculoPlaca: 'GBA-9102', servicioNombre: 'Lavado Completo Carnauba', estado: 'FINALIZADO', montoTotal: 14.0, fechaCreacion: '2026-09-09' }
  ]
};

/**
 * Interceptor de Datos Quemados (Fallback / Mock Interceptor)
 * Si el backend responde un arreglo vacío [] o si falla la conexión (ERR_CONNECTION_REFUSED),
 * sirve automáticamente los datos quemados para mantener el Frontend 100% funcional.
 */
export const mockFallbackInterceptor: HttpInterceptorFn = (req, next) => {
  // Buscar si la URL solicitada coincide con alguna ruta mock configurada
  const matchingEndpoint = Object.keys(MOCK_DB).find(endpoint => req.url.includes(endpoint));

  return next(req).pipe(
    map(event => {
      // Caso 1: El Backend respondió con HTTP 200 pero la lista/tabla vino VACÍA []
      if (matchingEndpoint && event instanceof HttpResponse && Array.isArray(event.body) && event.body.length === 0) {
        console.warn(`[MockFallback] La BD devolvió 0 registros para ${matchingEndpoint}. Usando datos quemados.`);
        return event.clone({ body: MOCK_DB[matchingEndpoint] });
      }
      return event;
    }),
    catchError(err => {
      // Caso 2: El Backend está apagado o dio ERR_CONNECTION_REFUSED
      if (matchingEndpoint) {
        console.warn(`[MockFallback] Error de red (${err.status || 'Sin Conexión'}) en ${matchingEndpoint}. Usando datos quemados.`);
        return of(new HttpResponse({ status: 200, body: MOCK_DB[matchingEndpoint] }));
      }
      throw err;
    })
  );
};

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { apiUrl } from '../config/env';
import { BUSQUEDA_MIN_CARACTERES } from '../config/paginacion';
import { OpcionSelect, PaginaServidor, normalizarPagina } from '../models/paginacion.model';

/** Cómo pide un desplegable con buscador su siguiente bloque de opciones (la firma que espera `app-select-search`). */
export type CargadorOpciones = (q: string, page: number, pageSize: number) => Observable<PaginaServidor<OpcionSelect>>;

/**
 * Opciones livianas (`{ value, label, sublabel }`) para desplegables con buscador y scroll infinito. La búsqueda y el alcance
 * por rol los resuelve el servidor. Cada método devuelve el cargador listo para `app-select-search [cargar]`.
 *
 *   readonly agencias = this.opciones.agencias({ estado: 1 });
 *   <app-select-search [cargar]="agencias" …>
 */
@Injectable({ providedIn: 'root' })
export class OpcionesService {
  private readonly http = inject(HttpClient);

  private cargador(ruta: string, filtros: Record<string, unknown> = {}): CargadorOpciones {
    return (q, page, pageSize) => {
      const texto = (q ?? '').trim();
      const body: Record<string, unknown> = { page, pageSize, ...limpiar(filtros) };
      if (texto.length >= BUSQUEDA_MIN_CARACTERES) body['search'] = texto;
      return this.http.post<any>(apiUrl(ruta), body).pipe(map((res) => normalizarPagina<OpcionSelect>(res, page, pageSize)));
    };
  }

  /**
   * Todas las opciones de un listado (para desplegables simples que necesitan la lista completa, como filtros o selectores de
   * pocas decenas de filas). Pide bloques de 100 hasta agotar; tope de seguridad de 20 bloques.
   */
  todas(ruta: string, filtros: Record<string, unknown> = {}): Observable<OpcionSelect[]> {
    const pedir = (page: number, acumulado: OpcionSelect[]): Observable<OpcionSelect[]> =>
      this.http.post<any>(apiUrl(ruta), { page, pageSize: 100, ...limpiar(filtros) }).pipe(
        map((res) => normalizarPagina<OpcionSelect>(res, page, 100)),
        switchMap((pagina) => {
          const todas = [...acumulado, ...pagina.items];
          return pagina.items.length >= 100 && page < 20 && todas.length < pagina.total ? pedir(page + 1, todas) : of(todas);
        }),
      );
    return pedir(1, []);
  }

  /** Trae solo las opciones con estos ids (para mostrar la etiqueta de un valor ya elegido). */
  porIds(ruta: string, ids: string[]): Observable<OpcionSelect[]> {
    return this.http
      .post<any>(apiUrl(ruta), { ids: ids.slice(0, 50) })
      .pipe(map((res) => normalizarPagina<OpcionSelect>(res).items));
  }

  /** Agencias (el servidor aplica el alcance del rol). Filtros: regionId, clienteId, estado. */
  agencias(filtros: { regionId?: string; clienteId?: string; estado?: number } = {}): CargadorOpciones {
    return this.cargador('/agencias/opciones', filtros);
  }
  regiones(filtros: { estado?: number } = {}): CargadorOpciones {
    return this.cargador('/agencias/regiones/opciones', filtros);
  }
  /** Clientes / marcas. */
  clientes(filtros: { regionId?: string; estado?: number } = {}): CargadorOpciones {
    return this.cargador('/agencias/clientes/opciones', filtros);
  }
  /** Bahías; con `agenciaId`, solo las de esa agencia. */
  bahias(filtros: { agenciaId?: string; activa?: boolean } = {}): CargadorOpciones {
    return this.cargador('/agencias/bahias/opciones', filtros);
  }
  /** Lavadores y pulidores (el servidor deja al líder en su agencia). */
  operadores(filtros: { agenciaId?: string; rol?: string; categoriaRol?: string; estado?: number } = {}): CargadorOpciones {
    return this.cargador('/agencias/operadores/opciones', filtros);
  }
  usuarios(filtros: { agenciaId?: string; rolNombre?: string; funcion?: string; regionId?: string; estado?: number } = {}): CargadorOpciones {
    return this.cargador('/agencias/usuarios/opciones', filtros);
  }
  /** Servicios del catálogo (acotados a la agencia según el rol). */
  servicios(filtros: { categoria?: string; agenciaId?: string } = {}): CargadorOpciones {
    return this.cargador('/catalogos/servicios/opciones', filtros);
  }
  /** Insumos (solo activos salvo que se pida otro estado). */
  insumos(filtros: { tipoProductoId?: string; categoria?: string; agenciaId?: string; estado?: number } = {}): CargadorOpciones {
    return this.cargador('/inventario/insumos/opciones', filtros);
  }
}

/** Quita los filtros vacíos para no enviarlos. */
function limpiar(filtros: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

/**
 * Adapta un cargador para pantallas que trabajan con NOMBRES en vez de ids (por ejemplo, el filter-bar): el valor de cada
 * opción pasa a ser su etiqueta.
 */
export function opcionesPorNombre(cargador: CargadorOpciones): CargadorOpciones {
  return (q, page, pageSize) =>
    cargador(q, page, pageSize).pipe(
      map((pagina) => ({ ...pagina, items: pagina.items.map((o) => ({ ...o, value: o.label })) })),
    );
}

import { Observable, Subscription } from 'rxjs';
import { BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_MAX, PAGE_SIZE_TABLA } from '../config/paginacion';
import { ConsultaTabla, OrdenDir, PaginaServidor, normalizarPagina } from '../models/paginacion.model';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

/** Una página del servidor con, si se pidió, los contadores del listado. */
export interface PaginaConResumen<T, R = never> {
  pagina: PaginaServidor<T>;
  resumen?: R;
}

/** Lo que recibe la función que pide la página: la consulta de la tabla y si hay que recalcular contadores. */
export type ConsultaConResumen = ConsultaTabla & { incluirResumen: boolean };

/**
 * Cuerpo de una consulta paginada: página, tamaño (máx. 100), orden, búsqueda (mínimo 2 letras) y los filtros indicados
 * en `claves` (los vacíos no se envían).
 */
export function cuerpoConsulta(
  consulta: Partial<ConsultaTabla> & { incluirResumen?: boolean },
  claves: string[] = [],
): Record<string, unknown> {
  const c = consulta as Partial<ConsultaTabla> & { incluirResumen?: boolean } & Record<string, unknown>;
  const body: Record<string, unknown> = {
    page: c.page || 1,
    pageSize: Math.min(c.pageSize || PAGE_SIZE_TABLA, PAGE_SIZE_MAX),
  };
  if (c.sortField) { body['sortField'] = c.sortField; body['sortOrder'] = c.sortOrder || 'desc'; }
  const texto = String(c.search ?? '').trim();
  if (texto.length >= BUSQUEDA_MIN_CARACTERES) body['search'] = texto;
  for (const k of claves) {
    const v = c[k];
    if (v !== undefined && v !== null && v !== '') body[k] = v;
  }
  if (c.incluirResumen) body['incluirResumen'] = true;
  return body;
}

/** POST a un listado paginado y normaliza la respuesta (`{items,…}`, `{data}` o arreglo) más el `resumen` si viene. */
export function postPagina<T, R = never>(
  http: HttpClient,
  url: string,
  body: Record<string, unknown>,
  convertir: (item: any) => T = (i) => i as T,
): Observable<PaginaConResumen<T, R>> {
  return http.post<any>(url, body).pipe(
    map((res) => {
      const pagina = normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number);
      return {
        pagina: { ...pagina, items: pagina.items.map(convertir) },
        resumen: res?.resumen as R | undefined,
      };
    }),
  );
}

/**
 * Estado de una tabla con páginas numeradas y consulta en el servidor (para usar con `app-data-table [serverSide]`).
 *
 *   tipos = new TablaServidor<Tipo>((c) => this.servicio.getTiposPagina({ ...c, ...this.filtros() }));
 *   ngOnInit() { this.tipos.reiniciar(); }
 *   // plantilla:
 *   //   <app-data-table [serverSide]="true" [columns]="cols" [data]="tipos.filas" [total]="tipos.total" [page]="tipos.pagina"
 *   //     [pageSize]="tipos.pageSize" [sortField]="tipos.sortField" [sortOrder]="tipos.sortOrder" [loading]="tipos.cargando"
 *   //     [error]="tipos.error" (queryChange)="tipos.alCambiar($event)" (reintentar)="tipos.cargar(true)">
 *
 * Al cambiar un filtro se llama a `reiniciar()`; tras crear/editar/eliminar, a `refrescar()`.
 */
export class TablaServidor<T, R = never> {
  filas: T[] = [];
  total = 0;
  pagina = 1;
  pageSize = PAGE_SIZE_TABLA;
  sortField: string | null;
  sortOrder: OrdenDir;
  cargando = false;
  error: string | null = null;
  /** Contadores del servidor (solo si el listado los ofrece). */
  resumen: R | null = null;
  /** true después de la primera respuesta (permite distinguir "cargando" de "sin resultados"). */
  inicializada = false;

  private busqueda = '';
  private suscripcion?: Subscription;

  constructor(
    private readonly pedir: (c: ConsultaConResumen) => Observable<PaginaConResumen<T, R>>,
    opciones: { sortField?: string | null; sortOrder?: OrdenDir; pageSize?: number } = {},
  ) {
    this.sortField = opciones.sortField ?? null;
    this.sortOrder = opciones.sortOrder ?? 'desc';
    this.pageSize = opciones.pageSize ?? PAGE_SIZE_TABLA;
  }

  /** Para `(queryChange)` de la tabla: cambió página, tamaño, orden o búsqueda. */
  readonly alCambiar = (q: ConsultaTabla): void => {
    const cambioBusqueda = q.search !== this.busqueda;
    this.busqueda = q.search;
    this.pagina = q.page;
    this.pageSize = q.pageSize;
    this.sortField = q.sortField;
    this.sortOrder = q.sortOrder;
    // Los contadores dependen del texto buscado, no de la página ni del orden.
    this.cargar(cambioBusqueda);
  };

  /** Vuelve a la primera página con los filtros vigentes y recalcula contadores. */
  reiniciar(): void {
    this.pagina = 1;
    this.cargar(true);
  }

  /** Vuelve a pedir la página actual (tras crear, editar o cambiar el estado de un registro). */
  refrescar(): void {
    this.cargar(true);
  }

  /** Pide la página actual. `conResumen`: también recalcula los contadores. */
  cargar(conResumen = false): void {
    this.suscripcion?.unsubscribe();
    this.cargando = true;
    this.error = null;
    this.suscripcion = this.pedir({
      page: this.pagina,
      pageSize: this.pageSize,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
      search: this.busqueda,
      incluirResumen: conResumen || this.resumen === null,
    }).subscribe({
      next: ({ pagina, resumen }) => {
        if (resumen !== undefined) this.resumen = resumen;
        // Si la página quedó vacía (se borró lo último de la lista) se retrocede a la última que exista.
        if (pagina.items.length === 0 && this.pagina > 1 && pagina.total > 0) {
          this.pagina = Math.max(1, pagina.totalPages);
          this.cargar(false);
          return;
        }
        this.filas = pagina.items;
        this.total = pagina.total;
        this.pagina = pagina.page;
        this.cargando = false;
        this.inicializada = true;
      },
      error: (err: unknown) => {
        this.filas = [];
        this.total = 0;
        this.error = mensajeDeError(err);
        this.cargando = false;
        this.inicializada = true;
      },
    });
  }

  /** Vacía la tabla al instante (por ejemplo, al cambiar de bodega, para no mostrar datos de la anterior mientras carga). */
  limpiar(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = undefined;
    this.filas = [];
    this.total = 0;
    this.pagina = 1;
    this.resumen = null;
    this.error = null;
    this.cargando = false;
    this.inicializada = false;
  }

  /** Cancela la consulta en curso (llamar en ngOnDestroy). */
  destruir(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = undefined;
  }
}

function mensajeDeError(err: unknown): string {
  const e = err as { error?: { message?: string | string[] }; message?: string } | undefined;
  const detalle = e?.error?.message;
  if (Array.isArray(detalle)) return detalle.join('. ');
  return detalle || e?.message || 'No se pudo cargar la información.';
}

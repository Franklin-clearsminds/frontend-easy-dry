import { Observable, Subscription } from 'rxjs';
import { PAGE_SIZE_INFINITO } from '../config/paginacion';
import { PaginaServidor } from '../models/paginacion.model';

/**
 * Estado de una lista con scroll infinito: acumula las páginas que llegan del servidor.
 *
 * Uso típico en un componente:
 *   lista = new ListaInfinita<Incidente>((page, size) => this.servicio.getPagina({ page, pageSize: size }), 30, i => i.id);
 *   ngOnInit() { this.lista.reiniciar(); }
 *   // plantilla:  @for (i of lista.items; track i.id) {…}
 *   //             <app-infinite-scroll [hasMore]="lista.hasMore" [loading]="lista.cargando"
 *   //                                  [error]="lista.error" [total]="lista.total"
 *   //                                  (cargarMas)="lista.siguiente()" (reintentar)="lista.reintentar()">
 *
 * Al cambiar un filtro se llama a `reiniciar()`: cancela lo que esté en curso y vuelve a la primera página.
 */
export class ListaInfinita<T> {
  items: T[] = [];
  total = 0;
  cargando = false;
  error: string | null = null;
  hasMore = true;
  /** true después de terminar la primera carga (permite distinguir "cargando" de "sin resultados"). */
  inicializada = false;

  private page = 0;
  private solicitud = 0;
  private suscripcion: Subscription | null = null;
  private claves = new Set<unknown>();

  constructor(
    private readonly cargarPagina: (page: number, pageSize: number) => Observable<PaginaServidor<T>>,
    readonly pageSize: number = PAGE_SIZE_INFINITO,
    /** Identifica cada elemento para no repetirlo si el servidor devuelve solapes al insertarse registros nuevos. */
    private readonly clave?: (item: T) => unknown,
  ) {}

  /** Vuelve a la primera página (por ejemplo, al cambiar un filtro o la búsqueda). */
  reiniciar(): void {
    this.cancelar();
    this.items = [];
    this.claves.clear();
    this.page = 0;
    this.total = 0;
    this.hasMore = true;
    this.error = null;
    this.inicializada = false;
    this.siguiente();
  }

  /** Carga el siguiente bloque. Se ignora si ya hay una carga en curso o no quedan más. */
  siguiente(): void {
    if (this.cargando || !this.hasMore) return;
    this.cargando = true;
    this.error = null;
    const id = ++this.solicitud;

    this.suscripcion = this.cargarPagina(this.page + 1, this.pageSize).subscribe({
      next: (pagina) => {
        if (id !== this.solicitud) return; // respuesta de una consulta anterior al último reinicio
        const nuevos = this.clave
          ? pagina.items.filter((item) => {
              const k = this.clave!(item);
              if (this.claves.has(k)) return false;
              this.claves.add(k);
              return true;
            })
          : pagina.items;
        this.items = [...this.items, ...nuevos];
        this.page = pagina.page || this.page + 1;
        this.total = pagina.total;
        this.hasMore = pagina.hasNextPage && pagina.items.length > 0;
        this.cargando = false;
        this.inicializada = true;
      },
      error: (err: unknown) => {
        if (id !== this.solicitud) return;
        this.error = mensajeDeError(err);
        this.cargando = false;
        this.inicializada = true;
      },
    });
  }

  /** Reintenta el bloque que falló. */
  reintentar(): void {
    this.error = null;
    this.siguiente();
  }

  /** Cancela la consulta en curso (llamar en ngOnDestroy). */
  destruir(): void {
    this.cancelar();
  }

  private cancelar(): void {
    this.solicitud++;
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
    this.cargando = false;
  }
}

function mensajeDeError(err: unknown): string {
  const e = err as { error?: { message?: string | string[] }; message?: string } | undefined;
  const detalle = e?.error?.message;
  if (Array.isArray(detalle)) return detalle.join('. ');
  return detalle || e?.message || 'No se pudo cargar la información.';
}

import {
  Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, SimpleChanges,
  ViewChild, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { InfiniteScrollComponent } from '../infinite-scroll/infinite-scroll.component';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_INFINITO } from '../../../core/config/paginacion';
import { OpcionSelect, PaginaServidor } from '../../../core/models/paginacion.model';
import { ListaInfinita } from '../../../core/utils/lista-infinita';

/**
 * Selector desplegable con buscador y scroll infinito (reemplaza al <select> normal).
 *
 * - Con `cargar`: las opciones se piden al servidor por bloques mientras se hace scroll y la búsqueda se hace
 *   en el servidor (espera 300 ms y pide al menos 2 letras).
 * - Con `opciones`: lista fija en memoria (por ejemplo, los estados); el buscador filtra localmente.
 *
 *   <app-select-search placeholder="Agencia" todasLabel="Todas las agencias"
 *       [cargar]="cargarAgencias" [value]="agenciaId" [valueLabel]="agenciaNombre"
 *       (valueChange)="agenciaId = $event" (seleccion)="agenciaNombre = $event?.label ?? ''">
 *   </app-select-search>
 *   // cargarAgencias = (q, page, size) => this.agenciaService.opciones({ search: q, page, pageSize: size });
 */
@Component({
  selector: 'app-select-search',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, InfiniteScrollComponent],
  template: `
    <button
      #disparador
      type="button"
      [id]="idBase"
      role="combobox"
      aria-haspopup="listbox"
      [attr.aria-expanded]="abierto"
      [attr.aria-controls]="idBase + '-lista'"
      [attr.aria-label]="ariaLabel || placeholder"
      [disabled]="disabled"
      (click)="alternar()"
      (keydown)="alTeclaDisparador($event)"
      class="w-full flex items-center justify-between gap-2 px-3 py-2 min-h-9 rounded-xl border bg-white text-left text-xs font-semibold transition-colors cursor-pointer
             focus:outline-none focus-visible:ring-2 focus-visible:ring-easydry-blue/30 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
      [ngClass]="invalid ? 'border-rose-400 ring-2 ring-rose-100' : abierto ? 'border-easydry-blue ring-2 ring-easydry-blue/20' : 'border-slate-300 hover:border-slate-400'">
      <span class="truncate" [ngClass]="etiqueta ? 'text-slate-800' : 'text-slate-500'"
            [attr.title]="etiqueta || placeholder">{{ etiqueta || placeholder }}</span>
      <span class="flex items-center gap-1 shrink-0">
        @if (value && clearable && !disabled) {
          <span role="button" tabindex="-1" aria-label="Quitar selección"
                (click)="limpiar($event)"
                class="w-5 h-5 inline-flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100">
            <i-lucide name="x" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
          </span>
        }
        <i-lucide name="chevron-down" class="w-4 h-4 text-slate-500 transition-transform" [class.rotate-180]="abierto" aria-hidden="true"></i-lucide>
      </span>
    </button>

    @if (abierto) {
      <div
        #panel
        class="fixed z-[10400] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        [style.top.px]="pos.top ?? null"
        [style.bottom.px]="pos.bottom ?? null"
        [style.left.px]="pos.left"
        [style.width.px]="pos.width"
        [style.max-height.px]="pos.maxHeight">
        <!-- Buscador -->
        <div class="p-2 border-b border-slate-100 shrink-0">
          <div class="flex items-center gap-2 px-2.5 border border-slate-300 rounded-lg bg-white focus-within:border-easydry-blue focus-within:ring-2 focus-within:ring-easydry-blue/20">
            <i-lucide name="search" class="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true"></i-lucide>
            <input
              #buscador
              type="text"
              autocomplete="off"
              [ngModel]="texto"
              (ngModelChange)="alEscribir($event)"
              (keydown)="alTeclaBuscador($event)"
              [placeholder]="buscadorPlaceholder"
              [attr.aria-label]="'Buscar: ' + (ariaLabel || placeholder)"
              [attr.aria-controls]="idBase + '-lista'"
              [attr.aria-activedescendant]="activo >= 0 ? idBase + '-op-' + activo : null"
              class="flex-1 min-w-0 py-2 border-0 bg-transparent text-xs font-semibold text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-0">
          </div>
          @if (textoCorto) {
            <p class="mt-1 px-1 text-[11px] font-semibold text-slate-500">Escribe al menos {{ minCaracteres }} letras para buscar.</p>
          }
        </div>

        <!-- Opciones -->
        <ul [id]="idBase + '-lista'" role="listbox" class="overflow-y-auto overscroll-contain flex-1 min-h-0 py-1">
          @if (todasLabel && !buscando) {
            <li role="option" [id]="idBase + '-op--1'" [attr.aria-selected]="!value"
                (mousedown)="$event.preventDefault()" (click)="elegir(null)"
                class="px-3 py-2 text-xs font-bold cursor-pointer hover:bg-slate-50"
                [ngClass]="!value ? 'text-easydry-blue bg-easydry-blue/5' : 'text-slate-600'">
              {{ todasLabel }}
            </li>
          }
          @for (op of visibles; track op.value; let i = $index) {
            <li role="option" [id]="idBase + '-op-' + i" [attr.aria-selected]="op.value === value"
                (mousedown)="$event.preventDefault()" (click)="elegir(op)" (mouseenter)="activo = i"
                class="px-3 py-2 cursor-pointer flex items-center justify-between gap-2"
                [ngClass]="i === activo ? 'bg-slate-100' : 'hover:bg-slate-50'">
              <span class="min-w-0">
                <span class="block text-xs font-bold truncate" [ngClass]="op.value === value ? 'text-easydry-blue' : 'text-slate-800'">{{ op.label }}</span>
                @if (op.sublabel) { <span class="block text-[11px] font-semibold text-slate-500 truncate">{{ op.sublabel }}</span> }
              </span>
              @if (op.value === value) { <i-lucide name="check" class="w-4 h-4 text-easydry-blue shrink-0" aria-hidden="true"></i-lucide> }
            </li>
          }

          @if (esServidor) {
            @if (lista.inicializada && visibles.length === 0 && !lista.cargando && !lista.error) {
              <li class="px-3 py-4 text-center text-xs font-semibold text-slate-500" role="status">Sin resultados</li>
            }
            <li role="presentation">
              <app-infinite-scroll
                [hasMore]="lista.hasMore" [loading]="lista.cargando" [error]="lista.error" [total]="lista.total"
                [mostrarFin]="false"
                (cargarMas)="lista.siguiente()" (reintentar)="lista.reintentar()">
              </app-infinite-scroll>
            </li>
          } @else if (visibles.length === 0) {
            <li class="px-3 py-4 text-center text-xs font-semibold text-slate-500" role="status">Sin resultados</li>
          }
        </ul>
      </div>
    }
  `,
})
export class SelectSearchComponent implements OnInit, OnChanges, OnDestroy {
  private static contador = 0;
  private readonly zone = inject(NgZone);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly idBase = 'select-search-' + (++SelectSearchComponent.contador);

  /** Modo servidor: pide las opciones por bloques y con búsqueda en el servidor. */
  @Input() cargar: ((q: string, page: number, pageSize: number) => Observable<PaginaServidor<OpcionSelect>>) | null = null;
  /** Modo lista fija en memoria. */
  @Input() opciones: OpcionSelect[] = [];

  @Input() value: string | null = null;
  /** Texto de la opción elegida cuando todavía no está en la lista cargada (por ejemplo, al editar un registro). */
  @Input() valueLabel = '';
  @Input() placeholder = 'Seleccionar…';
  @Input() buscadorPlaceholder = 'Buscar…';
  @Input() ariaLabel = '';
  /** Texto de la opción que quita el filtro ("Todas"). null = no se muestra esa opción. */
  @Input() todasLabel: string | null = 'Todas';
  @Input() clearable = true;
  @Input() disabled = false;
  @Input() invalid = false;
  @Input() pageSize = PAGE_SIZE_INFINITO;
  @Input() minCaracteres = BUSQUEDA_MIN_CARACTERES;

  @Output() valueChange = new EventEmitter<string | null>();
  @Output() seleccion = new EventEmitter<OpcionSelect | null>();

  @ViewChild('disparador', { static: true }) private disparador!: ElementRef<HTMLButtonElement>;
  @ViewChild('buscador') private buscador?: ElementRef<HTMLInputElement>;

  abierto = false;
  texto = '';
  textoCorto = false;
  activo = -1;
  pos: { top?: number; bottom?: number; left: number; width: number; maxHeight: number } = { left: 0, width: 240, maxHeight: 320 };

  lista!: ListaInfinita<OpcionSelect>;
  private elegida: OpcionSelect | null = null;
  private busqueda$ = new Subject<string>();
  private suscripcion?: Subscription;
  private textoAplicado = '';
  private readonly cerrarFuera = (e: Event) => {
    const t = e.target as Node;
    if (!this.host.nativeElement.contains(t) && !this.dentroDelPanel(t)) {
      this.zone.run(() => this.cerrar(false));
    }
  };
  /** Al mover la página o cambiar el tamaño de la ventana el panel sigue pegado al botón (no al hacer scroll en su propia lista). */
  private readonly reposicionar = (e?: Event) => {
    if (e?.target && this.dentroDelPanel(e.target as Node)) return;
    this.calcularPosicion();
    this.zone.run(() => undefined);
  };

  private dentroDelPanel(nodo: Node): boolean {
    return !!document.getElementById(this.idBase + '-lista')?.parentElement?.contains(nodo);
  }

  get esServidor(): boolean {
    return !!this.cargar;
  }

  get buscando(): boolean {
    return this.textoAplicado.length > 0;
  }

  get etiqueta(): string {
    if (!this.value) return '';
    return this.elegida?.value === this.value ? this.elegida.label : (this.valueLabel || this.buscarEnCargadas(this.value)?.label || '');
  }

  /** Opciones que se pintan: las del servidor acumuladas, o las de la lista fija filtradas por el buscador. */
  get visibles(): OpcionSelect[] {
    if (this.esServidor) return this.lista?.items ?? [];
    const q = this.textoAplicado.toLowerCase();
    return q
      ? this.opciones.filter((o) => `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q))
      : this.opciones;
  }

  ngOnInit(): void {
    this.crearLista();
    this.suscripcion = this.busqueda$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((q) => this.aplicarBusqueda(q));
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['cargar'] && !cambios['cargar'].firstChange) {
      this.crearLista();
      if (this.abierto) this.lista.reiniciar();
    }
    if (cambios['value'] && this.elegida && this.elegida.value !== this.value) this.elegida = null;
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.lista?.destruir();
    this.quitarEscuchas();
  }

  alternar(): void {
    this.abierto ? this.cerrar(true) : this.abrir();
  }

  abrir(): void {
    if (this.disabled || this.abierto) return;
    this.abierto = true;
    this.texto = '';
    this.textoAplicado = '';
    this.textoCorto = false;
    this.calcularPosicion();
    this.ponerEscuchas();
    // Selecciona como activa la opción elegida, si ya está cargada.
    this.activo = Math.max(-1, this.visibles.findIndex((o) => o.value === this.value));
    if (this.esServidor && !this.lista.inicializada && !this.lista.cargando) this.lista.reiniciar();
    setTimeout(() => this.buscador?.nativeElement.focus(), 0);
  }

  cerrar(devolverFoco: boolean): void {
    if (!this.abierto) return;
    this.abierto = false;
    this.quitarEscuchas();
    if (devolverFoco) this.disparador.nativeElement.focus();
  }

  elegir(op: OpcionSelect | null): void {
    this.elegida = op;
    this.value = op?.value ?? null;
    this.valueChange.emit(this.value);
    this.seleccion.emit(op);
    this.cerrar(true);
  }

  limpiar(evento: Event): void {
    evento.stopPropagation();
    this.elegir(null);
  }

  alEscribir(texto: string): void {
    this.texto = texto;
    const limpio = texto.trim();
    // En el servidor solo se busca con texto suficiente; vacío quita el filtro.
    this.textoCorto = this.esServidor && limpio.length > 0 && limpio.length < this.minCaracteres;
    if (this.textoCorto) return;
    if (this.esServidor) this.busqueda$.next(limpio);
    else this.textoAplicado = limpio;
    this.activo = -1;
  }

  alTeclaDisparador(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.abrir();
    }
  }

  alTeclaBuscador(e: KeyboardEvent): void {
    const total = this.visibles.length;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this.moverActivo(1, total); break;
      case 'ArrowUp': e.preventDefault(); this.moverActivo(-1, total); break;
      case 'Home': e.preventDefault(); this.activo = total ? 0 : -1; this.verActivo(); break;
      case 'End': e.preventDefault(); this.activo = total - 1; this.verActivo(); break;
      case 'Enter':
        e.preventDefault();
        if (this.activo >= 0 && this.visibles[this.activo]) this.elegir(this.visibles[this.activo]);
        break;
      case 'Escape':
        // No debe cerrar también el modal que contiene al selector.
        e.preventDefault();
        e.stopPropagation();
        this.cerrar(true);
        break;
      case 'Tab': this.cerrar(false); break;
    }
  }

  // ---------------------------------------------------------------------------

  private crearLista(): void {
    this.lista?.destruir();
    this.lista = new ListaInfinita<OpcionSelect>(
      (page, size) => this.cargar!(this.textoAplicado, page, size),
      this.pageSize,
      (o) => o.value,
    );
  }

  private aplicarBusqueda(q: string): void {
    if (q === this.textoAplicado) return;
    this.textoAplicado = q;
    this.activo = -1;
    if (this.esServidor && this.abierto) this.lista.reiniciar();
  }

  private buscarEnCargadas(valor: string): OpcionSelect | undefined {
    return (this.esServidor ? this.lista?.items : this.opciones)?.find((o) => o.value === valor);
  }

  private moverActivo(paso: number, total: number): void {
    if (!total) return;
    this.activo = this.activo < 0 ? (paso > 0 ? 0 : total - 1) : (this.activo + paso + total) % total;
    this.verActivo();
    // Al acercarse al final de lo cargado, se pide el siguiente bloque.
    if (this.esServidor && this.activo >= total - 3) this.lista.siguiente();
  }

  private verActivo(): void {
    setTimeout(() => document.getElementById(`${this.idBase}-op-${this.activo}`)?.scrollIntoView({ block: 'nearest' }), 0);
  }

  /** El panel es `fixed`: se coloca junto al botón y no lo recorta el scroll de un modal. */
  private calcularPosicion(): void {
    const r = this.disparador.nativeElement.getBoundingClientRect();
    const abajo = window.innerHeight - r.bottom - 12;
    const arriba = r.top - 12;
    const abrirArriba = abajo < 220 && arriba > abajo;
    this.pos = {
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 240) - 8)),
      width: Math.max(r.width, 240),
      maxHeight: Math.max(160, Math.min(360, abrirArriba ? arriba : abajo)),
      ...(abrirArriba ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    };
  }

  private ponerEscuchas(): void {
    this.zone.runOutsideAngular(() => {
      document.addEventListener('mousedown', this.cerrarFuera, true);
      window.addEventListener('resize', this.reposicionar);
      window.addEventListener('scroll', this.reposicionar, true);
    });
  }

  private quitarEscuchas(): void {
    document.removeEventListener('mousedown', this.cerrarFuera, true);
    window.removeEventListener('resize', this.reposicionar);
    window.removeEventListener('scroll', this.reposicionar, true);
  }
}

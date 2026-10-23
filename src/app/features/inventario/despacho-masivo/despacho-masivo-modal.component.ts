import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { InventarioService } from '../../../core/services/inventario.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ModalPortalDirective } from '../../../shared/directives/modal-portal.directive';

/** Una fila del despacho masivo: un insumo del destino con lo que tiene, lo que debería tener y lo que se va a enviar. */
interface LineaMasiva {
  insumoId: string;
  sku: string;
  nombre: string;
  unidad: string;
  contenido: number;
  estado: string;
  actualUnd: number;
  transitoUnd: number;
  minimoUnd: number;
  maximoUnd: number;
  /** Lo que falta para llegar al máximo (menos lo que ya viene en camino), en envases enteros. */
  sugerido: number;
  /** Lo que el origen puede entregar, en envases. `null` = no se pudo consultar. */
  disponibleUnd: number | null;
  cantidad: number | null;
}

const aUnidades = (base: unknown, contenido: number) => {
  const c = contenido > 0 ? contenido : 1;
  return Math.round(((Number(base) || 0) / c) * 100) / 100;
};

/**
 * Despacho en masa a UNA agencia o UN pulidor: lista todos sus insumos con lo que tiene hoy, el máximo que debería tener y lo
 * disponible en el origen, y deja escribir cuántos envases enviar de cada uno. Genera UNA sola guía con todas las líneas,
 * que el destino confirma (completa o parcial) en Envíos & Confirmación.
 */
@Component({
  selector: 'app-despacho-masivo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalPortalDirective],
  template: `
    <div appModalPortal role="dialog" aria-modal="true" aria-labelledby="dm-titulo" class="fixed inset-0 z-[10050] overflow-y-auto p-4 sm:p-6 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div class="relative bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-100 my-auto flex flex-col max-h-[92dvh] overflow-hidden" (click)="$event.stopPropagation()">

        <!-- Cabecera -->
        <div class="shrink-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" [ngClass]="tipo === 'agencia' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'">
              <i-lucide aria-hidden="true" name="package-plus" class="w-5 h-5"></i-lucide>
            </div>
            <div class="min-w-0">
              <h3 id="dm-titulo" class="text-sm font-extrabold text-slate-900 truncate">Despacho en masa · {{ destinoNombre }}</h3>
              <p class="text-xs text-slate-500 truncate">{{ destinoSubtitulo || (tipo === 'agencia' ? 'Agencia / sede' : 'Kit de pulidor') }} · una sola guía con todos los insumos que marques</p>
            </div>
          </div>
          <button type="button" (click)="cerrar.emit()" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0" title="Cerrar" aria-label="Cerrar">
            <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
          </button>
        </div>

        <!-- Origen y herramientas -->
        <div class="shrink-0 px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center gap-3 text-xs">
          <div class="flex-1 min-w-0">
            <ng-container *ngIf="origenLibre; else origenFijo">
              <label for="dm-origen" class="block font-bold text-slate-700 mb-1">Bodega de salida *</label>
              <select id="dm-origen" [(ngModel)]="origenSeleccionado" (change)="cargarDisponible()" class="w-full max-w-sm p-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:border-purple-500">
                <option *ngFor="let b of bodegas" [value]="b.id">{{ b.nombre }} · {{ b.esCentral || b.tipo === 'CENTRAL' ? 'Central' : 'Regional' }}</option>
              </select>
            </ng-container>
            <ng-template #origenFijo>
              <p class="font-bold text-slate-700">Origen</p>
              <p class="text-slate-600">{{ operaDesdeAgencia ? 'Las existencias de tu sede' : 'Tu bodega asignada' }}</p>
            </ng-template>
          </div>
          <div class="relative w-full lg:w-64">
            <i-lucide aria-hidden="true" name="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i-lucide>
            <input type="search" [(ngModel)]="busqueda" placeholder="Buscar insumo o SKU..." aria-label="Buscar insumo o SKU" class="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-purple-500" />
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" (click)="completarAlMaximo()" [disabled]="cargando" class="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50" title="Rellena cada insumo con lo que falta para llegar al máximo, sin pasar de lo disponible">
              <i-lucide aria-hidden="true" name="sparkles" class="w-3.5 h-3.5"></i-lucide><span>Completar al máximo</span>
            </button>
            <button type="button" (click)="limpiar()" [disabled]="cargando" class="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer disabled:opacity-50">Limpiar</button>
          </div>
        </div>

        <!-- Tabla -->
        <div class="flex-1 min-h-0 overflow-auto">
          <div *ngIf="cargando" class="p-10 text-center text-sm text-slate-500" role="status">Cargando insumos...</div>
          <div *ngIf="!cargando && errorCarga" class="p-10 text-center">
            <p class="text-sm text-rose-600 font-semibold">{{ errorCarga }}</p>
            <button type="button" (click)="cargar()" class="mt-3 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">Reintentar</button>
          </div>
          <div *ngIf="!cargando && !errorCarga && lineas.length === 0" class="p-10 text-center text-sm text-slate-500">Este destino no tiene insumos para despachar.</div>

          <table *ngIf="!cargando && !errorCarga && lineas.length > 0" class="w-full text-xs">
            <caption class="sr-only">Insumos del destino con su cantidad actual, máximo y cantidad a enviar</caption>
            <thead class="bg-slate-50 sticky top-0 z-10 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" class="text-left font-bold px-4 py-2.5">Insumo</th>
                <th scope="col" class="text-right font-bold px-3 py-2.5">Actual</th>
                <th scope="col" class="text-right font-bold px-3 py-2.5">En camino</th>
                <th scope="col" class="text-right font-bold px-3 py-2.5">Máximo</th>
                <th scope="col" class="text-right font-bold px-3 py-2.5">Sugerido</th>
                <th scope="col" class="text-right font-bold px-3 py-2.5">Disponible en origen</th>
                <th scope="col" class="text-right font-bold px-4 py-2.5 w-36">Enviar (envases)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let l of visibles; trackBy: trackLinea" [ngClass]="{'bg-sky-50/40': l.cantidad && l.cantidad > 0}">
                <td class="px-4 py-2.5">
                  <p class="font-bold text-slate-900">{{ l.nombre }}</p>
                  <p class="font-mono text-[11px] text-slate-500">{{ l.sku }} · {{ l.contenido | number:'1.0-2' }} {{ l.unidad }} por envase</p>
                </td>
                <td class="px-3 py-2.5 text-right whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded-md font-mono font-bold" [ngClass]="claseEstado(l)">{{ l.actualUnd | number:'1.0-2' }}</span>
                  <div class="mt-1 h-1.5 w-20 ml-auto rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                    <div class="h-full rounded-full" [ngClass]="l.actualUnd < l.minimoUnd ? 'bg-rose-500' : 'bg-emerald-500'" [style.width.%]="porcentaje(l)"></div>
                  </div>
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-sky-700">{{ l.transitoUnd > 0 ? (l.transitoUnd | number:'1.0-2') : '—' }}</td>
                <td class="px-3 py-2.5 text-right font-mono font-bold text-slate-700">{{ l.maximoUnd | number:'1.0-2' }}</td>
                <td class="px-3 py-2.5 text-right font-mono" [ngClass]="l.sugerido > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'">{{ l.sugerido > 0 ? l.sugerido : '—' }}</td>
                <td class="px-3 py-2.5 text-right font-mono" [ngClass]="l.disponibleUnd !== null && l.disponibleUnd <= 0 ? 'text-rose-600 font-bold' : 'text-slate-700'">
                  {{ l.disponibleUnd === null ? '—' : (l.disponibleUnd | number:'1.0-2') }}
                </td>
                <td class="px-4 py-2.5 text-right">
                  <input type="number" min="0" step="1" inputmode="numeric" [(ngModel)]="l.cantidad" [attr.aria-label]="'Cantidad a enviar de ' + l.nombre" placeholder="0"
                    [disabled]="l.disponibleUnd !== null && l.disponibleUnd <= 0"
                    class="w-24 p-2 rounded-lg border text-right font-bold text-slate-900 bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    [ngClass]="error(l) ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-purple-500'" />
                  <p *ngIf="error(l) as e" class="text-[11px] text-rose-600 mt-1 text-right">{{ e }}</p>
                </td>
              </tr>
              <tr *ngIf="visibles.length === 0"><td colspan="7" class="px-4 py-8 text-center text-slate-500">Ningún insumo coincide con la búsqueda.</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Pie -->
        <div class="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col lg:flex-row lg:items-center gap-3">
          <input type="text" [(ngModel)]="observacion" placeholder="Nota u observación (opcional)" aria-label="Nota u observación" maxlength="200" class="flex-1 p-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-purple-500" />
          <p class="text-xs text-slate-600 whitespace-nowrap" role="status">
            <b>{{ seleccionadas.length }}</b> {{ seleccionadas.length === 1 ? 'insumo' : 'insumos' }} · <b>{{ totalEnvases | number:'1.0-0' }}</b> envases
          </p>
          <div class="flex items-center gap-2 justify-end">
            <button type="button" (click)="cerrar.emit()" class="btn-secondary">Cancelar</button>
            <button type="button" (click)="despachar()" [disabled]="enviando || cargando || seleccionadas.length === 0 || hayErrores"
              class="px-5 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-md inline-flex justify-center items-center gap-2 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              [ngClass]="tipo === 'agencia' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-cyan-600 hover:bg-cyan-700'">
              <i-lucide aria-hidden="true" name="send" class="w-4 h-4"></i-lucide>
              <span>{{ enviando ? 'Despachando...' : 'Despachar ' + seleccionadas.length + (seleccionadas.length === 1 ? ' insumo' : ' insumos') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DespachoMasivoModalComponent implements OnInit {
  private readonly inventario = inject(InventarioService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) tipo!: 'agencia' | 'pulidor';
  @Input({ required: true }) destinoId!: string;
  @Input({ required: true }) destinoNombre!: string;
  @Input() destinoSubtitulo = '';
  /** Bodega de salida por defecto (la del contexto o la central). */
  @Input() origenBodegaId = '';
  /** Alcance nacional: puede elegir la bodega de salida. */
  @Input() origenLibre = false;
  @Input() bodegas: any[] = [];
  /** El usuario despacha con las existencias de su propia sede (no desde una bodega). */
  @Input() operaDesdeAgencia = false;
  @Input() miAgenciaId = '';

  @Output() cerrar = new EventEmitter<void>();
  @Output() despachado = new EventEmitter<any>();

  lineas: LineaMasiva[] = [];
  busqueda = '';
  observacion = '';
  cargando = true;
  enviando = false;
  errorCarga = '';
  origenSeleccionado = '';

  ngOnInit(): void {
    this.origenSeleccionado = this.origenBodegaId;
    void this.cargar();
  }

  get visibles(): LineaMasiva[] {
    const t = this.busqueda.trim().toLowerCase();
    return t ? this.lineas.filter((l) => l.nombre.toLowerCase().includes(t) || l.sku.toLowerCase().includes(t)) : this.lineas;
  }

  get seleccionadas(): LineaMasiva[] {
    return this.lineas.filter((l) => Number(l.cantidad) > 0);
  }

  get totalEnvases(): number {
    return this.seleccionadas.reduce((s, l) => s + Number(l.cantidad), 0);
  }

  get hayErrores(): boolean {
    return this.lineas.some((l) => !!this.error(l));
  }

  trackLinea = (_: number, l: LineaMasiva) => l.insumoId;

  async cargar(): Promise<void> {
    this.cargando = true;
    this.errorCarga = '';
    try {
      const filas = await this.traerTodas(this.tipo, this.destinoId);
      this.lineas = filas
        .map((f): LineaMasiva => {
          const contenido = Number(f.contenidoNeto) || 1;
          const actualUnd = aUnidades(f.stockActual, contenido);
          const transitoUnd = Number(f.enTransitoUnidades) || 0;
          const minimoUnd = aUnidades(f.stockMinimo, contenido);
          const maximoUnd = Math.max(aUnidades(f.stockOptimo, contenido), minimoUnd);
          return {
            insumoId: String(f.insumoId ?? f.id),
            sku: f.codigoSKU || f.sku || '',
            nombre: f.nombre,
            unidad: f.unidad || 'u',
            contenido,
            estado: f.estado || '',
            actualUnd,
            transitoUnd,
            minimoUnd,
            maximoUnd,
            sugerido: Math.max(0, Math.ceil(maximoUnd - actualUnd - transitoUnd - 1e-9)),
            disponibleUnd: null,
            cantidad: null,
          };
        })
        .sort((a, b) => b.sugerido - a.sugerido || a.nombre.localeCompare(b.nombre));
      await this.cargarDisponible();
    } catch (e: any) {
      this.errorCarga = e?.error?.message || 'No se pudieron cargar los insumos. Intenta de nuevo.';
    } finally {
      this.cargando = false;
    }
  }

  /** Lo que el origen puede entregar de cada insumo, en envases. Si no se puede consultar, no se bloquea (el servidor valida). */
  async cargarDisponible(): Promise<void> {
    try {
      const mapa = new Map<string, number>();
      if (this.operaDesdeAgencia) {
        for (const f of await this.traerTodas('agencia', this.miAgenciaId)) mapa.set(String(f.insumoId ?? f.id), aUnidades(f.stockActual, Number(f.contenidoNeto) || 1));
      } else {
        const res = await firstValueFrom(this.inventario.getStockBodegasResumen({ bodegaId: this.origenSeleccionado || undefined }));
        for (const f of res?.insumos ?? []) mapa.set(String(f.insumoId ?? f.id), aUnidades(f.stockActual, Number(f.contenidoNeto) || 1));
      }
      for (const l of this.lineas) {
        l.disponibleUnd = mapa.has(l.insumoId) ? Math.floor((mapa.get(l.insumoId) as number) + 1e-9) : 0;
        if (l.disponibleUnd <= 0) l.cantidad = null;
      }
    } catch {
      for (const l of this.lineas) l.disponibleUnd = null;
    }
  }

  private async traerTodas(tipo: 'agencia' | 'pulidor', id: string): Promise<any[]> {
    const filas: any[] = [];
    let page = 1;
    for (;;) {
      const r = await firstValueFrom(this.inventario.getInsumosUbicacionPagina(tipo, id, { page, pageSize: 100, sortField: 'nombre', sortOrder: 'asc' }));
      filas.push(...r.pagina.items);
      if (!r.pagina.hasNextPage || page >= r.pagina.totalPages) break;
      page++;
    }
    return filas;
  }

  completarAlMaximo(): void {
    for (const l of this.lineas) {
      const tope = l.disponibleUnd === null ? l.sugerido : Math.min(l.sugerido, l.disponibleUnd);
      l.cantidad = tope > 0 ? tope : null;
    }
  }

  limpiar(): void {
    for (const l of this.lineas) l.cantidad = null;
  }

  porcentaje(l: LineaMasiva): number {
    return l.maximoUnd > 0 ? Math.min(100, Math.round((l.actualUnd / l.maximoUnd) * 100)) : 0;
  }

  claseEstado(l: LineaMasiva): string {
    if (l.actualUnd <= 0) return 'bg-rose-100 text-rose-800';
    if (l.actualUnd < l.minimoUnd) return 'bg-rose-50 text-rose-700';
    if (l.actualUnd <= l.minimoUnd * 1.2) return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-100 text-emerald-800';
  }

  error(l: LineaMasiva): string {
    if (l.cantidad === null || l.cantidad === undefined || (l.cantidad as unknown) === '') return '';
    const n = Number(l.cantidad);
    if (!Number.isFinite(n) || n < 0) return 'Cantidad inválida';
    if (n === 0) return '';
    if (Math.abs(n - Math.round(n)) > 1e-9) return 'Solo envases completos';
    if (l.disponibleUnd !== null && n > l.disponibleUnd) return `Solo hay ${l.disponibleUnd} en origen`;
    return '';
  }

  despachar(): void {
    if (this.enviando || this.hayErrores || this.seleccionadas.length === 0) return;
    const detalles = this.seleccionadas.map((l) => ({ insumoId: l.insumoId, cantidadEnviada: Math.round(Number(l.cantidad)) }));
    const nota = this.observacion.trim() || `Despacho en masa a ${this.destinoNombre}`;
    const origenBodegaId = this.operaDesdeAgencia ? undefined : this.origenSeleccionado || undefined;
    const base = { origenBodegaId, origenAgenciaId: this.operaDesdeAgencia ? this.miAgenciaId || undefined : undefined, observaciones: nota, detalles };
    const payload =
      this.tipo === 'agencia'
        ? { ...base, tipo: 'DESPACHO_AGENCIA', agenciaId: this.destinoId, sucursalDestinoId: this.destinoId, agenciaDestinoId: this.destinoId }
        : { ...base, tipo: 'DESPACHO_PULIDOR', pulidorDestinoId: this.destinoId, destinoPulidorId: this.destinoId };

    this.enviando = true;
    this.inventario.crearDespacho(payload).subscribe({
      next: (res: any) => {
        this.enviando = false;
        this.toast.success('Despacho generado', `Guía ${res?.numeroGuia || ''} con ${detalles.length} insumos en tránsito. El destino debe confirmar en Envíos.`);
        this.despachado.emit(res);
      },
      error: (err: any) => {
        this.enviando = false;
        const m = err?.error?.message;
        this.toast.error('No se pudo despachar', (Array.isArray(m) ? m.join('. ') : m) || 'Error al generar el despacho');
      },
    });
  }
}

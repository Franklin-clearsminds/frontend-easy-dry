import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccionCatalogo, PaginaCatalogo, SubPaginaCatalogo } from '../../../core/models/roles.model';
import { REPORTES_POR_PAGINA } from './reportes-por-pagina';

/**
 * Editor de los permisos de un rol en tres niveles: página, sub-página (pestaña) y acciones (botones).
 * A la izquierda las páginas con su interruptor; a la derecha, la página elegida con sus sub-páginas y acciones.
 * Lo apagado no se puede configurar: una sub-página o acción solo existe si su página (y sub-página) está activa.
 * Trabaja solo con los códigos del catálogo de páginas; el servidor deriva de ellos los permisos que exigen los endpoints.
 */
@Component({
  selector: 'app-rol-paginas-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h4 class="font-extrabold text-slate-900 text-sm font-outfit">Páginas y permisos</h4>
          <p class="text-xs text-slate-500" aria-live="polite">
            Este rol verá <b class="text-slate-800">{{ paginasActivas }}</b> de {{ paginasConMenu }} páginas
            y tiene <b class="text-slate-800">{{ accionesActivas }}</b> de {{ accionesTotal }} acciones activas.
          </p>
        </div>
        <div class="relative w-full sm:w-72">
          <label for="rol-paginas-buscar" class="sr-only">Buscar página o acción</label>
          <i-lucide aria-hidden="true" name="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i-lucide>
          <input id="rol-paginas-buscar" type="search" [(ngModel)]="busqueda" name="busquedaPaginas"
            placeholder="Buscar página o acción (ej. anular, bodega)…"
            class="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs min-h-11">
        </div>
      </div>

      @if (!soloLectura && !todoOtorgable) {
        <p class="text-xs text-slate-500">Solo puedes dar lo que tu propio rol tiene; lo demás aparece bloqueado.</p>
      }

      @if (!visibles.length) {
        <p class="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-2xl">Nada coincide con «{{ busqueda }}».</p>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-[22rem_minmax(0,1fr)] md:items-start border border-slate-200 rounded-2xl overflow-hidden bg-white">

          <!-- Páginas -->
          <nav aria-label="Páginas del sistema" class="bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-2 space-y-0.5 max-h-72 md:max-h-[min(75vh,44rem)] overflow-y-auto">
            @for (p of visibles; track p.codigo) {
              <div class="flex items-center gap-1 rounded-xl pl-1 pr-1 transition-colors"
                [ngClass]="actual?.codigo === p.codigo ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/70'">
                @if (esDeCuenta(p)) {
                  <span class="shrink-0 min-h-11 min-w-11 flex items-center justify-center text-slate-400" title="Incluida en todos los roles" role="img" aria-label="Incluida en todos los roles">
                    <i-lucide aria-hidden="true" name="lock" class="w-4 h-4"></i-lucide>
                  </span>
                } @else {
                <button type="button" role="switch" [attr.aria-checked]="activa(p.codigo)"
                  [attr.aria-label]="'Acceso a la página ' + p.nombre"
                  [disabled]="soloLectura || !puedeOtorgar(p.codigo)"
                  (click)="togglePagina(p)"
                  class="shrink-0 min-h-11 min-w-11 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60">
                  <span class="relative inline-block w-9 h-5 rounded-full transition-colors" [ngClass]="activa(p.codigo) ? 'bg-emerald-500' : 'bg-slate-300'">
                    <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" [ngClass]="activa(p.codigo) ? 'translate-x-4' : ''"></span>
                  </span>
                </button>
                }
                <button type="button" (click)="elegir(p)" [attr.aria-current]="actual?.codigo === p.codigo ? 'true' : null"
                  class="flex-1 min-w-0 min-h-11 flex items-center justify-between gap-2 py-2 pr-2 text-left rounded-lg">
                  <span class="text-xs font-bold truncate" [ngClass]="activa(p.codigo) ? 'text-slate-900' : 'text-slate-500'">{{ p.nombre }}</span>
                  @if (esDeCuenta(p)) {
                    <span class="text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">Siempre</span>
                  } @else if (activa(p.codigo) && contador(p)[1] > 0) {
                    <span class="text-[11px] font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded-md"
                      [ngClass]="contador(p)[0] ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'">{{ contador(p)[0] }}/{{ contador(p)[1] }}</span>
                  } @else if (!activa(p.codigo)) {
                    <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400 shrink-0">Apagada</span>
                  }
                </button>
              </div>
            }
          </nav>

          <!-- Detalle de la página elegida -->
          <section class="min-w-0 max-h-[min(75vh,44rem)] overflow-y-auto" [attr.aria-label]="'Configuración de ' + (actual?.nombre ?? '')">
            @if (actual; as p) {
              <div class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div class="min-w-0">
                  <h5 class="font-extrabold text-sm text-easydry-blue truncate">{{ p.nombre }}</h5>
                  <p class="text-[11px] text-slate-500 font-mono truncate">{{ p.ruta }}</p>
                </div>
                @if (esDeCuenta(p)) {
                  <span class="inline-flex items-center gap-2 min-h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600">
                    <i-lucide aria-hidden="true" name="lock" class="w-4 h-4 text-slate-400"></i-lucide>
                    Incluida en todos los roles
                  </span>
                } @else {
                <button type="button" role="switch" [attr.aria-checked]="activa(p.codigo)"
                  [disabled]="soloLectura || !puedeOtorgar(p.codigo)"
                  (click)="togglePagina(p)"
                  class="inline-flex items-center gap-2 min-h-11 px-3 rounded-xl border text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  [ngClass]="activa(p.codigo) ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-600'">
                  <span class="relative inline-block w-9 h-5 rounded-full transition-colors" [ngClass]="activa(p.codigo) ? 'bg-emerald-500' : 'bg-slate-300'">
                    <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" [ngClass]="activa(p.codigo) ? 'translate-x-4' : ''"></span>
                  </span>
                  {{ activa(p.codigo) ? 'Página activa' : 'Página apagada' }}
                </button>
                }
              </div>

              <div class="p-4 space-y-4">
                @if (!activa(p.codigo)) {
                  <div class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600" role="note">
                    <i-lucide aria-hidden="true" name="info" class="w-4 h-4 mt-0.5 shrink-0 text-slate-400"></i-lucide>
                    <p>Con la página apagada el rol no la ve en el menú y el servidor no responde nada de ella. Actívala para configurar sus sub-páginas y acciones.</p>
                  </div>
                  @for (s of p.subs; track s.codigo) {
                    <p class="text-xs text-slate-400 px-1">{{ s.nombre }} · {{ s.acciones.length }} acciones</p>
                  }
                } @else {
                  @if (esDeCuenta(p)) {
                    <p class="text-xs text-slate-500">Es una pantalla de cuenta: todos los usuarios la tienen, sin importar su rol. Cada persona solo ve lo suyo.</p>
                  } @else if (!p.subs.length && !p.acciones.length) {
                    <p class="text-xs text-slate-500">Esta página es solo de consulta: al activarla el rol ya puede verla y no tiene acciones propias.</p>
                  }

                  @if (p.id === 'reportes') {
                    <div class="rounded-2xl border border-slate-200 bg-white">
                      <div class="px-4 py-3 border-b border-slate-100">
                        <p class="text-xs font-extrabold text-slate-900">Reportes que podrá sacar este rol</p>
                        <p class="text-[11px] text-slate-500">Cada reporte depende de la página de su módulo: al activar la página, el rol puede ver sus reportes y exportarlos con las acciones de arriba.</p>
                      </div>
                      <ul class="grid grid-cols-1 xl:grid-cols-2 gap-x-3 px-2 py-1">
                        @for (r of reportesPorPagina; track r.nombre) {
                          <li class="flex items-center gap-2.5 px-2 py-2 min-h-11">
                            <i-lucide aria-hidden="true" [name]="paginaActiva(r.pagina) ? 'check' : 'x'" class="w-4 h-4 shrink-0" [ngClass]="paginaActiva(r.pagina) ? 'text-emerald-600' : 'text-slate-400'"></i-lucide>
                            <span class="min-w-0 flex-1 text-xs font-bold" [ngClass]="paginaActiva(r.pagina) ? 'text-slate-900' : 'text-slate-500'">{{ r.nombre }}</span>
                            <span class="text-[11px] font-semibold shrink-0" [ngClass]="paginaActiva(r.pagina) ? 'text-emerald-700' : 'text-slate-500'">
                              {{ paginaActiva(r.pagina) ? 'Disponible' : 'Activa «' + nombrePagina(r.pagina) + '»' }}
                            </span>
                          </li>
                        }
                      </ul>
                    </div>
                  }

                  @for (s of p.subs; track s.codigo) {
                    @if (mostrarSub(p, s)) {
                      <div class="rounded-2xl border" [ngClass]="activa(s.codigo) ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'">
                        <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                          <div class="flex items-center gap-2 min-w-0">
                            <button type="button" role="switch" [attr.aria-checked]="activa(s.codigo)"
                              [attr.aria-label]="'Acceso a la sub-página ' + s.nombre"
                              [disabled]="soloLectura || !puedeOtorgar(s.codigo)"
                              (click)="toggleSub(p, s)"
                              class="shrink-0 min-h-11 min-w-11 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60">
                              <span class="relative inline-block w-9 h-5 rounded-full transition-colors" [ngClass]="activa(s.codigo) ? 'bg-emerald-500' : 'bg-slate-300'">
                                <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" [ngClass]="activa(s.codigo) ? 'translate-x-4' : ''"></span>
                              </span>
                            </button>
                            <div class="min-w-0">
                              <p class="text-xs font-extrabold text-slate-900 truncate">{{ s.nombre }}</p>
                              <p class="text-[11px]" [ngClass]="activa(s.codigo) ? 'text-emerald-700 font-semibold' : 'text-slate-500'">
                                {{ activa(s.codigo) ? 'Puede verla' : 'Sub-página apagada' }}
                              </p>
                            </div>
                          </div>
                          @if (activa(s.codigo) && s.acciones.length && !soloLectura) {
                            <div class="flex items-center gap-1.5">
                              <button type="button" (click)="marcarTodas(s.acciones, true)" class="min-h-11 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg">Marcar todas</button>
                              <button type="button" (click)="marcarTodas(s.acciones, false)" class="min-h-11 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Quitar todas</button>
                            </div>
                          }
                        </div>
                        @if (activa(s.codigo) && s.acciones.length) {
                          <ul class="grid grid-cols-1 xl:grid-cols-2 gap-x-3 border-t border-slate-100 px-2 py-1">
                            @for (a of accionesVisibles(p, s.acciones); track a.codigo) {
                              <li>
                                <label class="flex items-start gap-3 px-2 py-2.5 min-h-11 rounded-lg"
                                  [ngClass]="(soloLectura || !puedeOtorgar(a.codigo)) ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'">
                                  <input type="checkbox" [checked]="activa(a.codigo)"
                                    [disabled]="soloLectura || !puedeOtorgar(a.codigo)"
                                    (change)="toggleAccion(a)"
                                    class="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0">
                                  <span class="min-w-0 flex-1">
                                    <span class="block text-xs font-bold text-slate-900">{{ a.nombre }}</span>
                                    @if (a.compartida) {
                                      <span class="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800"
                                        title="La misma casilla aparece en varias páginas: se activa o apaga en todas a la vez">Compartida</span>
                                    }
                                    @if (!soloLectura && !puedeOtorgar(a.codigo)) {
                                      <span class="block text-[11px] font-semibold text-amber-700">Tu rol no tiene este permiso: no puedes otorgarlo.</span>
                                    }
                                  </span>
                                </label>
                              </li>
                            }
                          </ul>
                        } @else if (activa(s.codigo)) {
                          <p class="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Solo ver: esta sub-página no tiene acciones propias.</p>
                        }
                      </div>
                    }
                  }

                  @if (p.acciones.length) {
                    <div class="rounded-2xl border border-slate-200 bg-white">
                      <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                        <p class="text-xs font-extrabold text-slate-900">Acciones de la página</p>
                        @if (!soloLectura) {
                          <div class="flex items-center gap-1.5">
                            <button type="button" (click)="marcarTodas(p.acciones, true)" class="min-h-11 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg">Marcar todas</button>
                            <button type="button" (click)="marcarTodas(p.acciones, false)" class="min-h-11 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Quitar todas</button>
                          </div>
                        }
                      </div>
                      <ul class="grid grid-cols-1 xl:grid-cols-2 gap-x-3 border-t border-slate-100 px-2 py-1">
                        @for (a of accionesVisibles(p, p.acciones); track a.codigo) {
                          <li>
                            <label class="flex items-start gap-3 px-2 py-2.5 min-h-11 rounded-lg"
                              [ngClass]="(soloLectura || !puedeOtorgar(a.codigo)) ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'">
                              <input type="checkbox" [checked]="activa(a.codigo)"
                                [disabled]="soloLectura || !puedeOtorgar(a.codigo)"
                                (change)="toggleAccion(a)"
                                class="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0">
                              <span class="min-w-0 flex-1">
                                <span class="block text-xs font-bold text-slate-900">{{ a.nombre }}</span>
                                @if (a.compartida) {
                                  <span class="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800">Compartida</span>
                                }
                                @if (!soloLectura && !puedeOtorgar(a.codigo)) {
                                  <span class="block text-[11px] font-semibold text-amber-700">Tu rol no tiene este permiso: no puedes otorgarlo.</span>
                                }
                              </span>
                            </label>
                          </li>
                        }
                      </ul>
                    </div>
                  }
                }
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
})
export class RolPaginasEditorComponent implements OnChanges {
  @Input({ required: true }) paginas: PaginaCatalogo[] = [];

  readonly reportesPorPagina = REPORTES_POR_PAGINA;

  /** ¿Está activa la página con ese `id` en el rol que se edita? */
  paginaActiva(id: string): boolean {
    const p = this.paginas.find((x) => x.id === id);
    return !!p && this.activa(p.codigo);
  }

  nombrePagina(id: string): string {
    return this.paginas.find((x) => x.id === id)?.nombre ?? id;
  }
  /** Códigos del catálogo de páginas que el rol tiene activos. */
  @Input() seleccion: string[] = [];
  @Output() seleccionChange = new EventEmitter<string[]>();
  @Input() soloLectura = false;
  /** El actor solo puede dar lo que él mismo tiene. */
  @Input() puedeOtorgar: (codigo: string) => boolean = () => true;

  busqueda = '';
  private paginaElegida: string | null = null;
  private activos = new Set<string>();
  /** Dónde cuelga cada acción: códigos de su página o de su sub-página. */
  private padres = new Map<string, string[]>();
  private paginaDeSub = new Map<string, string>();

  ngOnChanges(): void {
    this.activos = new Set(this.seleccion);
    this.padres.clear();
    this.paginaDeSub.clear();
    for (const p of this.paginas) {
      for (const a of p.acciones) this.padres.set(a.codigo, [...(this.padres.get(a.codigo) ?? []), p.codigo]);
      for (const s of p.subs) {
        this.paginaDeSub.set(s.codigo, p.codigo);
        for (const a of s.acciones) this.padres.set(a.codigo, [...(this.padres.get(a.codigo) ?? []), s.codigo]);
      }
    }
  }

  // ── Lectura ──
  /** Notificaciones y Perfil son pantallas de cuenta: el sistema se las da a todos los roles y no se pueden apagar. */
  esDeCuenta(p: PaginaCatalogo): boolean {
    return p.codigo === 'pagina.notificaciones' || p.codigo === 'pagina.perfil';
  }

  activa(codigo: string): boolean {
    return codigo === 'pagina.notificaciones' || codigo === 'pagina.perfil' || this.activos.has(codigo);
  }

  private normalizar(t: string): string {
    return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  private coincide(texto: string): boolean {
    const q = this.normalizar(this.busqueda).trim();
    return !q || this.normalizar(texto).includes(q);
  }

  get visibles(): PaginaCatalogo[] {
    if (!this.normalizar(this.busqueda).trim()) return this.paginas;
    return this.paginas.filter((p) =>
      this.coincide(p.nombre) ||
      p.subs.some((s) => this.coincide(s.nombre) || s.acciones.some((a) => this.coincide(a.nombre))) ||
      p.acciones.some((a) => this.coincide(a.nombre)),
    );
  }

  get actual(): PaginaCatalogo | undefined {
    const lista = this.visibles;
    return lista.find((p) => p.codigo === this.paginaElegida) ?? lista[0];
  }

  elegir(p: PaginaCatalogo): void {
    this.paginaElegida = p.codigo;
  }

  /** Con búsqueda, en el detalle solo se ven las acciones que coinciden (salvo que coincida la página o la sub-página). */
  accionesVisibles(p: PaginaCatalogo, acciones: AccionCatalogo[]): AccionCatalogo[] {
    if (!this.normalizar(this.busqueda).trim() || this.coincide(p.nombre)) return acciones;
    return acciones.filter((a) => this.coincide(a.nombre));
  }

  mostrarSub(p: PaginaCatalogo, s: SubPaginaCatalogo): boolean {
    if (!this.normalizar(this.busqueda).trim() || this.coincide(p.nombre) || this.coincide(s.nombre)) return true;
    return s.acciones.some((a) => this.coincide(a.nombre));
  }

  private accionesUnicas(p: PaginaCatalogo): string[] {
    return [...new Set([...p.acciones, ...p.subs.flatMap((s) => s.acciones)].map((a) => a.codigo))];
  }

  /** [activas, total] de las acciones de una página. */
  contador(p: PaginaCatalogo): [number, number] {
    const todas = this.accionesUnicas(p);
    return [todas.filter((c) => this.activos.has(c)).length, todas.length];
  }

  get paginasConMenu(): number {
    return this.paginas.filter((p) => p.enMenu && p.codigo !== 'pagina.notificaciones' && p.codigo !== 'pagina.perfil').length;
  }

  get paginasActivas(): number {
    return this.paginas.filter((p) => p.enMenu && p.codigo !== 'pagina.notificaciones' && p.codigo !== 'pagina.perfil' && this.activos.has(p.codigo)).length;
  }

  get accionesTotal(): number {
    return new Set(this.paginas.flatMap((p) => this.accionesUnicas(p))).size;
  }

  get accionesActivas(): number {
    return [...new Set(this.paginas.flatMap((p) => this.accionesUnicas(p)))].filter((c) => this.activos.has(c)).length;
  }

  get todoOtorgable(): boolean {
    return this.paginas.every((p) => this.puedeOtorgar(p.codigo));
  }

  // ── Cambios ──
  togglePagina(p: PaginaCatalogo): void {
    if (this.soloLectura || this.esDeCuenta(p) || !this.puedeOtorgar(p.codigo)) return;
    if (this.activos.has(p.codigo)) {
      this.activos.delete(p.codigo);
    } else {
      this.activos.add(p.codigo);
      // Al activar una página, sus sub-páginas quedan activas (se pueden apagar una por una); las acciones se marcan aparte.
      for (const s of p.subs) if (this.puedeOtorgar(s.codigo)) this.activos.add(s.codigo);
      this.paginaElegida = p.codigo;
    }
    this.emitir();
  }

  toggleSub(p: PaginaCatalogo, s: SubPaginaCatalogo): void {
    if (this.soloLectura || !this.puedeOtorgar(s.codigo) || !this.activos.has(p.codigo)) return;
    if (this.activos.has(s.codigo)) this.activos.delete(s.codigo);
    else this.activos.add(s.codigo);
    this.emitir();
  }

  toggleAccion(a: AccionCatalogo): void {
    if (this.soloLectura || !this.puedeOtorgar(a.codigo)) return;
    if (this.activos.has(a.codigo)) this.activos.delete(a.codigo);
    else this.activos.add(a.codigo);
    this.emitir();
  }

  marcarTodas(acciones: AccionCatalogo[], marcar: boolean): void {
    if (this.soloLectura) return;
    for (const a of acciones) {
      if (!this.puedeOtorgar(a.codigo)) continue;
      if (marcar) this.activos.add(a.codigo);
      else this.activos.delete(a.codigo);
    }
    this.emitir();
  }

  /** Quita lo que quedó colgando de algo apagado y avisa al padre. */
  private emitir(): void {
    for (const c of [...this.activos]) {
      const pagina = this.paginaDeSub.get(c);
      if (pagina && !this.activos.has(pagina)) this.activos.delete(c);
    }
    for (const c of [...this.activos]) {
      const padres = this.padres.get(c);
      if (padres && !padres.some((pd) => this.activos.has(pd))) this.activos.delete(c);
    }
    this.seleccionChange.emit([...this.activos]);
  }
}

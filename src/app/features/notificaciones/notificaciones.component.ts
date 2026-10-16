import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Notificacion, NotificacionCategoria, NotificacionTipo, Pendiente, PendienteSeveridad } from '../../core/models/notificacion.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

/** Categoría seleccionable en la barra de filtros (incluye la opción "todas"). */
type CategoriaFiltro = 'todas' | NotificacionCategoria;
/** Rango temporal seleccionable. */
type RangoFiltro = 'todas' | 'hoy' | '7d' | '30d';

interface GrupoDia {
  etiqueta: string;
  items: Notificacion[];
}

const PAGE_SIZE = 20;
const CATEGORIA_LABEL: Record<NotificacionCategoria, string> = {
  inventario: 'Inventario',
  mantenimiento: 'Mantenimiento',
  aprobaciones: 'Aprobaciones',
  limpieza: 'Limpieza',
  general: 'Sistema',
};
const CATEGORIA_BADGE: Record<NotificacionCategoria, string> = {
  inventario: 'bg-amber-100 text-amber-700',
  mantenimiento: 'bg-violet-100 text-violet-700',
  aprobaciones: 'bg-easydry-blue/10 text-easydry-blue',
  limpieza: 'bg-teal-100 text-teal-700',
  general: 'bg-slate-100 text-slate-600',
};

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, EmptyStateComponent],
  template: `
    <div class="space-y-6 animate-fade-in pb-8">

      <!-- Encabezado -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-2">
            <i-lucide aria-hidden="true" name="bell" class="w-3.5 h-3.5"></i-lucide>
            <span>Centro de Notificaciones</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Notificaciones</h1>
          <p class="text-slate-500 text-xs mt-1">Alertas operativas, aprobaciones, inventario y avisos de la red EasyDry®.</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-3 py-1.5 rounded-xl text-xs font-bold border"
                [ngClass]="noLeidas > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'">
            {{ noLeidas > 0 ? noLeidas + ' sin leer' : 'Todo al día' }}
          </span>
          @if (pestana === 'avisos') {
          <button
            type="button"
            (click)="marcarTodasLeidas()"
            [disabled]="noLeidas === 0"
            class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <i-lucide aria-hidden="true" name="check-check" class="w-4 h-4"></i-lucide>
            Marcar todas como leídas
          </button>
          }
        </div>
      </div>

      <!-- Una sola bandeja: avisos (se leen) y pendientes (siguen hasta que se resuelve el problema) -->
      @if (pendientes !== null) {
        <div class="inline-flex bg-slate-100 p-1 rounded-xl" role="tablist" aria-label="Tipo de elementos">
          <button type="button" role="tab" [attr.aria-selected]="pestana === 'avisos'" (click)="pestana = 'avisos'"
            class="px-4 py-2 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-2"
            [ngClass]="pestana === 'avisos' ? 'bg-white text-easydry-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'">
            Avisos
            @if (noLeidas > 0) {
              <span class="px-1.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-700">{{ noLeidas }}</span>
            }
          </button>
          <button type="button" role="tab" [attr.aria-selected]="pestana === 'pendientes'" (click)="pestana = 'pendientes'"
            class="px-4 py-2 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-2"
            [ngClass]="pestana === 'pendientes' ? 'bg-white text-easydry-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'">
            Pendientes
            @if (pendientes.length > 0) {
              <span class="px-1.5 rounded-md text-[10px] font-extrabold"
                    [ngClass]="criticos > 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'">{{ pendientes.length }}</span>
            }
          </button>
        </div>
      }

      @if (pestana === 'avisos') {

      <!-- Barra de filtros -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-4 space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center gap-3">
          <!-- Búsqueda -->
          <div class="relative flex-1 min-w-0">
            <i-lucide aria-hidden="true" name="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i-lucide>
            <input
              type="search"
              name="busquedaNotificaciones"
              [(ngModel)]="busqueda"
              placeholder="Buscar por título o mensaje…"
              aria-label="Buscar notificaciones"
              class="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:border-easydry-blue focus:bg-white transition-colors" />
          </div>

          <!-- Rango temporal -->
          <div class="inline-flex bg-slate-100 p-1 rounded-xl shrink-0" role="group" aria-label="Rango de fechas">
            @for (r of rangos; track r.id) {
              <button type="button" (click)="rangoActivo = r.id"
                [attr.aria-pressed]="rangoActivo === r.id"
                class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors"
                [ngClass]="rangoActivo === r.id ? 'bg-white text-easydry-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'">
                {{ r.label }}
              </button>
            }
          </div>

          <!-- Solo no leídas -->
          <button type="button" (click)="soloNoLeidas = !soloNoLeidas"
            [attr.aria-pressed]="soloNoLeidas"
            class="h-10 px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-2 shrink-0 transition-colors"
            [ngClass]="soloNoLeidas ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
            <i-lucide aria-hidden="true" [name]="soloNoLeidas ? 'mail-open' : 'mail'" class="w-4 h-4"></i-lucide>
            Sin leer
          </button>
        </div>

        <!-- Categorías por área de trabajo -->
        <div class="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
          @for (c of categorias; track c.id) {
            <button type="button" (click)="categoriaActiva = c.id"
              [attr.aria-pressed]="categoriaActiva === c.id"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              [ngClass]="categoriaActiva === c.id ? 'bg-easydry-blue text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
              <i-lucide aria-hidden="true" [name]="c.icon" class="w-3.5 h-3.5"></i-lucide>
              {{ c.label }}
              <span class="px-1.5 rounded-md text-[10px] font-extrabold"
                    [ngClass]="categoriaActiva === c.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'">{{ contadores[c.id] }}</span>
            </button>
          }
          @if (hayFiltros) {
            <button type="button" (click)="limpiarFiltros()" class="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5">
              <i-lucide aria-hidden="true" name="rotate-ccw" class="w-3.5 h-3.5"></i-lucide>
              Limpiar filtros
            </button>
          }
        </div>
      </div>

      <!-- Lista -->
      @if (cargando) {
        <div class="space-y-3">
          @for (i of esqueletos; track i) {
            <div class="bg-white rounded-2xl border border-slate-100 p-4 flex gap-4 animate-pulse">
              <div class="w-11 h-11 rounded-xl bg-slate-100"></div>
              <div class="flex-1 space-y-2 py-1">
                <div class="h-3.5 w-1/3 bg-slate-100 rounded"></div>
                <div class="h-3 w-3/4 bg-slate-100 rounded"></div>
              </div>
            </div>
          }
        </div>
      } @else if (filtradas.length === 0) {
        <div class="bg-white rounded-2xl border border-slate-100 p-12">
          <app-empty-state
            icon="bell-off"
            [title]="hayFiltros ? 'Sin resultados para estos filtros' : 'No tienes notificaciones'"
            [hint]="hayFiltros ? 'Prueba con otro rango de fechas o limpia los filtros.' : 'Aquí verás las alertas operativas de tu rol.'"></app-empty-state>
        </div>
      } @else {
        <div class="space-y-6">
          @for (grupo of grupos; track grupo.etiqueta) {
            <section class="space-y-3">
              <div class="flex items-center gap-3">
                <h2 class="text-xs font-extrabold uppercase tracking-wider text-slate-400">{{ grupo.etiqueta }}</h2>
                <span class="flex-1 h-px bg-slate-100"></span>
                <span class="text-xs font-semibold text-slate-400">{{ grupo.items.length }}</span>
              </div>
              @for (n of grupo.items; track n.id) {
                <article
                  class="bg-white rounded-2xl border p-4 flex gap-4 transition-shadow hover:shadow-easydry"
                  [ngClass]="n.leida ? 'border-slate-100' : 'border-easydry-blue/30 shadow-sm ring-1 ring-easydry-blue/10'">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" [ngClass]="iconBg(n.tipo)">
                    <i-lucide aria-hidden="true" [name]="iconName(n.tipo)" class="w-5 h-5" [ngClass]="iconColor(n.tipo)"></i-lucide>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <h3 class="text-sm font-extrabold" [ngClass]="n.leida ? 'text-slate-500' : 'text-slate-900'">{{ n.titulo }}</h3>
                        <p class="text-xs text-slate-600 mt-1 leading-relaxed">{{ n.mensaje }}</p>
                      </div>
                      @if (!n.leida) {
                        <span class="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0 mt-1" aria-label="Sin leer"></span>
                      }
                    </div>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                      <span class="text-xs text-slate-400 font-semibold inline-flex items-center gap-1">
                        <i-lucide aria-hidden="true" name="clock" class="w-3.5 h-3.5"></i-lucide>{{ tiempoRelativo(n) }}
                      </span>
                      <span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md" [ngClass]="categoriaBadge(n.categoria)">
                        {{ categoriaLabel(n.categoria) }}
                      </span>
                      @if (n.enlace) {
                        <a [routerLink]="n.enlace" (click)="marcarLeida(n)" class="text-xs font-bold text-easydry-blue hover:underline">
                          {{ n.enlaceLabel || 'Ver detalle' }}
                        </a>
                      }
                      @if (!n.leida) {
                        <button type="button" (click)="marcarLeida(n)" class="text-xs font-bold text-slate-500 hover:text-slate-800 lg:ml-auto">
                          Marcar leída
                        </button>
                      }
                    </div>
                  </div>
                </article>
              }
            </section>
          }

          @if (hayMas) {
            <div class="text-center pt-2">
              <button type="button" (click)="verMas()"
                class="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                Ver más · {{ filtradas.length - visibles }} restantes
              </button>
            </div>
          }
        </div>
      }
      } @else {
        <!-- Pendientes operativos -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-4 space-y-3">
          <p class="text-xs text-slate-500">
            Lo que sigue pendiente ahora mismo en tu ámbito. Estos elementos no se marcan como leídos: desaparecen cuando se resuelve el problema.
          </p>
          <div class="relative">
            <i-lucide aria-hidden="true" name="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i-lucide>
            <input type="search" name="busquedaPendientes" [(ngModel)]="busquedaPendientes"
              placeholder="Buscar por insumo, máquina, agencia, pulidor o región…" aria-label="Buscar pendientes"
              class="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:border-easydry-blue focus:bg-white transition-colors" />
          </div>
          <div class="flex flex-wrap gap-2">
            @for (g of filtrosGrupo; track g.id) {
              <button type="button" (click)="filtroGrupo = g.id" [attr.aria-pressed]="filtroGrupo === g.id"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 border"
                [ngClass]="filtroGrupo === g.id ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'">
                {{ g.label }}
                <span class="px-1.5 rounded-md text-[10px] font-extrabold"
                      [ngClass]="filtroGrupo === g.id ? 'bg-white/25' : 'bg-slate-100 text-slate-500'">{{ contarGrupo(g.id) }}</span>
              </button>
            }
          </div>
          <div class="flex flex-wrap gap-2">
            @for (f of filtrosSeveridad; track f.id) {
              <button type="button" (click)="filtroSeveridad = f.id" [attr.aria-pressed]="filtroSeveridad === f.id"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 border"
                [ngClass]="filtroSeveridad === f.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'">
                {{ f.label }}
                <span class="px-1.5 rounded-md text-[10px] font-extrabold"
                      [ngClass]="filtroSeveridad === f.id ? 'bg-white/25' : 'bg-slate-100 text-slate-500'">{{ contarSeveridad(f.id) }}</span>
              </button>
            }
          </div>
        </div>

        @if (pendientesFiltrados.length === 0) {
          <div class="bg-white rounded-2xl border border-slate-100 p-12">
            <app-empty-state
              icon="check-circle-2"
              [title]="pendientes && pendientes.length ? 'Sin pendientes con este filtro' : 'Todo en orden'"
              [hint]="pendientes && pendientes.length ? 'Prueba con otro filtro o limpia la búsqueda.' : 'No hay stock bajo, incidentes abiertos ni mantenimientos vencidos en tu ámbito.'"></app-empty-state>
          </div>
        } @else {
          <div class="space-y-3">
            @for (p of pendientesFiltrados; track p.grupo + p.id) {
              <article class="bg-white rounded-2xl border border-slate-100 p-4 flex gap-4 transition-shadow hover:shadow-easydry">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" [ngClass]="severidadBg(p.severidad)">
                  <i-lucide aria-hidden="true" [name]="p.grupo === 'stock' ? 'package' : 'wrench'" class="w-5 h-5" [ngClass]="severidadColor(p.severidad)"></i-lucide>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h3 class="text-sm font-extrabold text-slate-900">{{ p.titulo }}</h3>
                      <p class="text-xs text-slate-600 mt-1 leading-relaxed">{{ p.detalle }}</p>
                    </div>
                    <span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md shrink-0" [ngClass]="severidadBadge(p.severidad)">
                      {{ severidadLabel(p.severidad) }}
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                    @if (p.timestamp) {
                      <span class="text-xs text-slate-400 font-semibold inline-flex items-center gap-1">
                        <i-lucide aria-hidden="true" name="clock" class="w-3.5 h-3.5"></i-lucide>{{ tiempoDesde(p.timestamp) }}
                      </span>
                    }
                    @if (p.agencia || p.origen) {
                      <span class="text-xs text-slate-500 font-semibold">{{ p.agencia || p.origen }}</span>
                    }
                    @if (p.pulidor) {
                      <span class="text-xs text-slate-400">· {{ p.pulidor }}</span>
                    }
                    <a [routerLink]="p.enlace" class="text-xs font-bold text-easydry-blue hover:underline lg:ml-auto">{{ p.enlaceLabel }}</a>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      }
    </div>
  `
})
export class NotificacionesComponent implements OnInit {
  private notificacionService = inject(NotificacionService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  /** Avisos (se leen) o pendientes (siguen hasta que se resuelve el problema). */
  pestana: 'avisos' | 'pendientes' = 'avisos';
  /** `null` = el rol no tiene acceso a pendientes (no se muestra la pestaña). */
  pendientes: Pendiente[] | null = null;
  filtroSeveridad: 'todas' | PendienteSeveridad = 'todas';
  filtroGrupo: 'todos' | 'stock' | 'mantenimiento' = 'todos';
  busquedaPendientes = '';

  readonly filtrosGrupo: { id: 'todos' | 'stock' | 'mantenimiento'; label: string }[] = [
    { id: 'todos', label: 'Todo' },
    { id: 'stock', label: 'Stock' },
    { id: 'mantenimiento', label: 'Mantenimiento' },
  ];

  readonly filtrosSeveridad: { id: 'todas' | PendienteSeveridad; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'critica', label: 'Críticas' },
    { id: 'advertencia', label: 'Advertencias' },
    { id: 'info', label: 'Informativas' },
  ];

  notificaciones: Notificacion[] = [];
  cargando = true;

  busqueda = '';
  categoriaActiva: CategoriaFiltro = 'todas';
  soloNoLeidas = false;
  rangoActivo: RangoFiltro = 'todas';
  visibles = PAGE_SIZE;

  readonly esqueletos = [1, 2, 3, 4];

  readonly categorias: { id: CategoriaFiltro; label: string; icon: string }[] = [
    { id: 'todas', label: 'Todas', icon: 'layers' },
    { id: 'inventario', label: 'Inventario', icon: 'package' },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: 'wrench' },
    { id: 'aprobaciones', label: 'Aprobaciones', icon: 'clipboard-check' },
    { id: 'limpieza', label: 'Limpieza', icon: 'sparkles' },
    { id: 'general', label: 'Sistema', icon: 'settings' },
  ];

  readonly rangos: { id: RangoFiltro; label: string }[] = [
    { id: 'todas', label: 'Todo' },
    { id: 'hoy', label: 'Hoy' },
    { id: '7d', label: '7 días' },
    { id: '30d', label: '30 días' },
  ];

  ngOnInit(): void {
    // La misma fuente que alimenta la campanita: el historial cargado y las que llegan por WebSocket.
    this.notificacionService.notificaciones$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((list) => {
      this.notificaciones = list || [];
      if (this.notificaciones.length > 0) this.cargando = false;
    });
    this.notificacionService.getNotificaciones().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cargando = false;
    });
    this.notificacionService.getPendientes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((lista) => {
      this.pendientes = lista;
      // El enlace «Ver bandeja» del dashboard llega con ?tab=pendientes.
      if (lista !== null && this.route.snapshot.queryParamMap.get('tab') === 'pendientes') this.pestana = 'pendientes';
    });
  }

  get criticos(): number {
    return (this.pendientes ?? []).filter((p) => p.severidad === 'critica').length;
  }

  get pendientesFiltrados(): Pendiente[] {
    const q = this.busquedaPendientes.trim().toLowerCase();
    return (this.pendientes ?? []).filter((p) => {
      if (this.filtroSeveridad !== 'todas' && p.severidad !== this.filtroSeveridad) return false;
      if (this.filtroGrupo !== 'todos' && p.grupo !== this.filtroGrupo) return false;
      if (q && !`${p.titulo} ${p.detalle} ${p.origen ?? ''} ${p.agencia ?? ''} ${p.pulidor ?? ''} ${p.region ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  contarSeveridad(id: 'todas' | PendienteSeveridad): number {
    const lista = this.pendientes ?? [];
    return id === 'todas' ? lista.length : lista.filter((p) => p.severidad === id).length;
  }

  contarGrupo(id: 'todos' | 'stock' | 'mantenimiento'): number {
    const lista = this.pendientes ?? [];
    return id === 'todos' ? lista.length : lista.filter((p) => p.grupo === id).length;
  }

  severidadLabel(s: PendienteSeveridad): string {
    return s === 'critica' ? 'Crítica' : s === 'advertencia' ? 'Advertencia' : 'Informativa';
  }

  severidadBg(s: PendienteSeveridad): string {
    return s === 'critica' ? 'bg-rose-100' : s === 'advertencia' ? 'bg-amber-100' : 'bg-easydry-blue/10';
  }

  severidadColor(s: PendienteSeveridad): string {
    return s === 'critica' ? 'text-rose-600' : s === 'advertencia' ? 'text-amber-600' : 'text-easydry-blue';
  }

  severidadBadge(s: PendienteSeveridad): string {
    return s === 'critica' ? 'bg-rose-100 text-rose-700' : s === 'advertencia' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
  }

  /** «Hace 3 d» desde una marca de tiempo (cuánto lleva pendiente). */
  tiempoDesde(timestamp: number): string {
    const minutos = Math.max(Math.floor((Date.now() - timestamp) / 60000), 0);
    if (minutos < 60) return minutos < 1 ? 'Ahora' : 'Hace ' + minutos + ' min';
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return 'Hace ' + horas + ' h';
    return 'Hace ' + Math.floor(horas / 24) + ' d';
  }

  get noLeidas(): number {
    return this.notificaciones.filter((n) => !n.leida).length;
  }

  get contadores(): Record<CategoriaFiltro, number> {
    const c: Record<CategoriaFiltro, number> = {
      todas: this.notificaciones.length,
      inventario: 0,
      mantenimiento: 0,
      aprobaciones: 0,
      limpieza: 0,
      general: 0,
    };
    for (const n of this.notificaciones) c[n.categoria || 'general']++;
    return c;
  }

  get hayFiltros(): boolean {
    return !!this.busqueda.trim() || this.categoriaActiva !== 'todas' || this.soloNoLeidas || this.rangoActivo !== 'todas';
  }

  get filtradas(): Notificacion[] {
    const q = this.busqueda.trim().toLowerCase();
    const desde = this.desdeRango();
    return this.notificaciones
      .filter((n) => {
        if (this.soloNoLeidas && n.leida) return false;
        if (this.categoriaActiva !== 'todas' && (n.categoria || 'general') !== this.categoriaActiva) return false;
        if (desde !== null && (n.timestamp ?? 0) < desde) return false;
        if (q && !(n.titulo + ' ' + n.mensaje).toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }

  get grupos(): GrupoDia[] {
    const porDia = new Map<string, Notificacion[]>();
    for (const n of this.filtradas.slice(0, this.visibles)) {
      if (!porDia.has(n.fecha)) porDia.set(n.fecha, []);
      porDia.get(n.fecha)!.push(n);
    }
    return Array.from(porDia.entries()).map(([fecha, items]) => ({ etiqueta: this.etiquetaDia(fecha), items }));
  }

  get hayMas(): boolean {
    return this.filtradas.length > this.visibles;
  }

  marcarLeida(n: Notificacion): void {
    if (n.leida) return;
    n.leida = true;
    void this.notificacionService.marcarComoLeida(n.id);
  }

  marcarTodasLeidas(): void {
    void this.notificacionService.marcarTodasComoLeidas();
  }

  verMas(): void {
    this.visibles += PAGE_SIZE;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.categoriaActiva = 'todas';
    this.soloNoLeidas = false;
    this.rangoActivo = 'todas';
    this.visibles = PAGE_SIZE;
  }

  categoriaLabel(categoria?: NotificacionCategoria): string {
    return CATEGORIA_LABEL[categoria || 'general'];
  }

  categoriaBadge(categoria?: NotificacionCategoria): string {
    return CATEGORIA_BADGE[categoria || 'general'];
  }

  /** Tiempo relativo ("Hace 5 min"); a partir de una semana muestra la fecha. */
  tiempoRelativo(n: Notificacion): string {
    const t = n.timestamp;
    if (!t) return n.fecha;
    const segundos = Math.floor((Date.now() - t) / 1000);
    if (segundos < 60) return 'Ahora';
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return 'Hace ' + minutos + ' min';
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return 'Hace ' + horas + ' h';
    const dias = Math.floor(horas / 24);
    if (dias < 7) return 'Hace ' + dias + ' d';
    return n.fecha;
  }

  iconName(tipo: NotificacionTipo): string {
    switch (tipo) {
      case 'alerta': return 'alert-triangle';
      case 'exito': return 'check-circle-2';
      case 'sistema': return 'settings';
      default: return 'info';
    }
  }

  iconBg(tipo: NotificacionTipo): string {
    switch (tipo) {
      case 'alerta': return 'bg-rose-100';
      case 'exito': return 'bg-emerald-100';
      case 'sistema': return 'bg-slate-100';
      default: return 'bg-easydry-blue/10';
    }
  }

  iconColor(tipo: NotificacionTipo): string {
    switch (tipo) {
      case 'alerta': return 'text-rose-600';
      case 'exito': return 'text-emerald-600';
      case 'sistema': return 'text-slate-600';
      default: return 'text-easydry-blue';
    }
  }

  /** Límite inferior (epoch ms) del rango activo; null = sin límite. */
  private desdeRango(): number | null {
    if (this.rangoActivo === 'todas') return null;
    const ahora = new Date();
    if (this.rangoActivo === 'hoy') return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    const dias = this.rangoActivo === '7d' ? 7 : 30;
    return ahora.getTime() - dias * 86400000;
  }

  private etiquetaDia(fecha: string): string {
    const hoy = new Date();
    const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (fecha === iso(hoy)) return 'Hoy';
    if (fecha === iso(new Date(hoy.getTime() - 86400000))) return 'Ayer';
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
  }
}
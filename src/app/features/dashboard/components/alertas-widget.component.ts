import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AlertaGrupo, AlertaSeveridad, AlertaStockVM } from '../../../core/models/alerta-stock.model';

type FiltroSeveridad = 'TODAS' | 'CRITICO' | 'BAJO';

const ORDEN_SEVERIDAD: Record<AlertaSeveridad, number> = { critica: 0, advertencia: 1, info: 2 };

/**
 * Panel de alertas de stock: resume por severidad, permite filtrar por criticidad y buscar por insumo/origen.
 * Reemplaza la lista plana anterior, que solo se podía recorrer hacia abajo.
 */
@Component({
  selector: 'app-alertas-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry h-full flex flex-col">
      <div class="flex items-center justify-between gap-3 mb-4">
        <h4 class="font-bold text-slate-900 text-lg font-outfit flex items-center gap-2">
          <i-lucide aria-hidden="true" name="bell" class="w-5 h-5 text-easydry-blue"></i-lucide>
          Alertas Operativas
          @if (alertas.length > 0) {
            <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-extrabold">{{ alertas.length }}</span>
          }
        </h4>
        <a routerLink="/inventario" class="text-xs font-bold text-easydry-blue hover:underline inline-flex items-center gap-1 shrink-0">
          Ver bandeja
          <i-lucide aria-hidden="true" name="chevron-right" class="w-3.5 h-3.5"></i-lucide>
        </a>
      </div>

      @if (alertas.length > 0) {
        <!-- Origen: stock (inventario) vs mantenimiento (incidencias/preventivos) -->
        @if (tieneMantenimiento) {
          <div class="flex flex-wrap items-center gap-2 mb-2">
            @for (g of gruposChips; track g.id) {
              <button type="button" (click)="filtroGrupo = g.id" [attr.aria-pressed]="filtroGrupo === g.id"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border"
                [ngClass]="filtroGrupo === g.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'">
                {{ g.label }} <span class="opacity-70">{{ g.conteo }}</span>
              </button>
            }
          </div>
        }

        <!-- Resumen por severidad: cada chip filtra la lista -->
        <div class="flex flex-wrap items-center gap-2 mb-3">
          @for (f of chips; track f.id) {
            <button type="button" (click)="filtroSeveridad = f.id" [attr.aria-pressed]="filtroSeveridad === f.id"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 border"
              [ngClass]="filtroSeveridad === f.id ? f.activo : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'">
              <span class="w-2 h-2 rounded-full" [ngClass]="f.punto" aria-hidden="true"></span>
              {{ f.label }}
              <span class="px-1.5 rounded-md text-[10px] font-extrabold"
                    [ngClass]="filtroSeveridad === f.id ? 'bg-white/25' : 'bg-slate-100 text-slate-500'">{{ f.conteo }}</span>
            </button>
          }
        </div>

        <div class="flex flex-col sm:flex-row gap-3 mb-3">
          <div class="relative flex-1">
            <i-lucide aria-hidden="true" name="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i-lucide>
            <input type="search" name="busquedaAlertas" [(ngModel)]="busqueda"
              placeholder="Buscar por insumo, agencia o región…" aria-label="Buscar alertas"
              class="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:border-easydry-blue focus:bg-white transition-colors" />
          </div>
          <div class="inline-flex bg-slate-100 p-1 rounded-xl shrink-0" role="tablist">
            <button type="button" role="tab" (click)="agrupacion = 'plana'" [attr.aria-selected]="agrupacion === 'plana'"
              class="px-3 h-7 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              [ngClass]="agrupacion === 'plana' ? 'bg-white text-easydry-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'">
              <i-lucide name="layout-list" class="w-3.5 h-3.5"></i-lucide> Lista
            </button>
            <button type="button" role="tab" (click)="agrupacion = 'insumo'" [attr.aria-selected]="agrupacion === 'insumo'"
              class="px-3 h-7 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              [ngClass]="agrupacion === 'insumo' ? 'bg-white text-easydry-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'">
              <i-lucide name="layers" class="w-3.5 h-3.5"></i-lucide> Agrupar
            </button>
          </div>
        </div>
      }

      <div class="space-y-3 overflow-y-auto pr-1 flex-1" [class.max-h-[360px]]="alertas.length > 0">
        @if (agrupacion === 'plana') {
          @for (a of visibles; track a.id) {
            <div class="p-3 rounded-xl border flex items-start gap-3" [ngClass]="tarjeta(a.tipo)">
              <div class="mt-0.5 shrink-0">
                <i-lucide aria-hidden="true" [name]="icono(a.tipo)" class="w-4 h-4" [ngClass]="iconoColor(a.tipo)"></i-lucide>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-bold truncate" [ngClass]="textoColor(a.tipo)">{{ a.titulo || a.insumo }}</p>
                  <span class="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide" [ngClass]="etiquetaColor(a.tipo)">
                    {{ etiquetaNivel(a.nivel) }}
                  </span>
                </div>
                @if (a.titulo && a.detalle) {
                  <p class="text-xs mt-0.5 truncate font-semibold" [ngClass]="textoColor(a.tipo)">{{ a.detalle }}</p>
                }
                <p class="text-xs mt-0.5 truncate" [ngClass]="subTextoColor(a.tipo)">
                  {{ a.origen || 'Sin ubicación' }}@if (a.agencia) {<span> · {{ a.agencia }}</span>}@if (a.pulidor) {<span> · Pulidor: {{ a.pulidor }}</span>}@if (a.region) {<span> · {{ a.region }}</span>}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-[11px] opacity-70" [ngClass]="subTextoColor(a.tipo)">{{ a.fecha }}</span>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/60" [ngClass]="subTextoColor(a.tipo)">{{ a.estado }}</span>
                  <a routerLink="/inventario" class="text-[11px] font-bold ml-auto text-easydry-blue hover:underline">Atender</a>
                </div>
              </div>
            </div>
          } @empty {
            <div class="py-8 text-center">
              <i-lucide aria-hidden="true" name="check-circle-2" class="w-8 h-8 text-emerald-400 mx-auto mb-2"></i-lucide>
              <p class="text-sm font-bold text-slate-600">{{ alertas.length > 0 ? 'Sin alertas para este filtro' : 'No hay alertas activas' }}</p>
              <p class="text-xs text-slate-400 mt-0.5">{{ alertas.length > 0 ? 'Prueba otra severidad o limpia la búsqueda.' : 'Todo el stock está en niveles correctos.' }}</p>
            </div>
          }
        } @else {
          @for (g of visiblesAgrupadas; track g.insumo) {
            <div class="p-3 rounded-xl border bg-slate-50 border-slate-200 flex flex-col gap-2">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-bold truncate text-slate-900">{{ g.insumo }}</p>
                <span class="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200 text-slate-700">
                  {{ g.cantidad }} UBICACIONES
                </span>
              </div>
              <div class="flex flex-wrap gap-1">
                @for (loc of g.ubicaciones; track loc.origen) {
                  <span class="px-2 py-1 rounded-md text-[10px] font-bold" [ngClass]="etiquetaColor(loc.tipo)">
                    {{ loc.origen }} ({{ etiquetaNivel(loc.nivel) }})
                  </span>
                }
              </div>
            </div>
          } @empty {
            <div class="py-8 text-center">
              <i-lucide aria-hidden="true" name="check-circle-2" class="w-8 h-8 text-emerald-400 mx-auto mb-2"></i-lucide>
              <p class="text-sm font-bold text-slate-600">Sin alertas para este filtro</p>
            </div>
          }
        }
      </div>

      @if (hayMas) {
        <button type="button" (click)="mostrarTodas = true"
          class="mt-3 w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors">
          Ver {{ agrupacion === 'plana' ? filtradas.length - visibles.length : agrupadas.length - visiblesAgrupadas.length }} más
        </button>
      }
    </div>
  `,
})
export class AlertasWidgetComponent {
  @Input() alertas: AlertaStockVM[] = [];
  @Input() limite = 6;

  filtroSeveridad: FiltroSeveridad = 'TODAS';
  filtroGrupo: 'TODAS' | AlertaGrupo = 'TODAS';
  busqueda = '';
  mostrarTodas = false;
  agrupacion: 'plana' | 'insumo' = 'plana';

  get tieneMantenimiento(): boolean {
    return this.alertas.some((a) => a.grupo === 'mantenimiento');
  }

  get gruposChips(): { id: 'TODAS' | AlertaGrupo; label: string; conteo: number }[] {
    const mant = this.alertas.filter((a) => a.grupo === 'mantenimiento').length;
    return [
      { id: 'TODAS', label: 'Todo', conteo: this.alertas.length },
      { id: 'stock', label: 'Stock', conteo: this.alertas.length - mant },
      { id: 'mantenimiento', label: 'Mantenimiento', conteo: mant },
    ];
  }

  get criticas(): number {
    return this.alertas.filter((a) => a.tipo === 'critica').length;
  }

  get bajas(): number {
    return this.alertas.filter((a) => a.tipo === 'advertencia').length;
  }

  get chips(): { id: FiltroSeveridad; label: string; conteo: number; activo: string; punto: string }[] {
    return [
      { id: 'TODAS', label: 'Todas', conteo: this.alertas.length, activo: 'bg-easydry-blue text-white border-easydry-blue', punto: 'bg-slate-400' },
      { id: 'CRITICO', label: 'Críticas', conteo: this.criticas, activo: 'bg-rose-600 text-white border-rose-600', punto: 'bg-rose-500' },
      { id: 'BAJO', label: 'Bajo mínimo', conteo: this.bajas, activo: 'bg-amber-500 text-white border-amber-500', punto: 'bg-amber-500' },
    ];
  }

  get filtradas(): AlertaStockVM[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.alertas
      .filter((a) => {
        if (this.filtroGrupo === 'stock' && a.grupo === 'mantenimiento') return false;
        if (this.filtroGrupo === 'mantenimiento' && a.grupo !== 'mantenimiento') return false;
        if (this.filtroSeveridad === 'CRITICO' && a.tipo !== 'critica') return false;
        if (this.filtroSeveridad === 'BAJO' && a.tipo !== 'advertencia') return false;
        if (q && !`${a.titulo ?? ''} ${a.insumo} ${a.detalle ?? ''} ${a.sku ?? ''} ${a.origen ?? ''} ${a.agencia ?? ''} ${a.pulidor ?? ''} ${a.region ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => ORDEN_SEVERIDAD[a.tipo] - ORDEN_SEVERIDAD[b.tipo] || b.timestamp - a.timestamp);
  }

  get visibles(): AlertaStockVM[] {
    return this.mostrarTodas ? this.filtradas : this.filtradas.slice(0, this.limite);
  }

  get agrupadas(): { insumo: string; cantidad: number; ubicaciones: { origen: string; nivel: string; tipo: AlertaSeveridad }[] }[] {
    const mapa = new Map<string, { origen: string; nivel: string; tipo: AlertaSeveridad }[]>();
    for (const a of this.filtradas) {
      const nom = a.titulo || a.insumo;
      const arr = mapa.get(nom) || [];
      // Evitar duplicados visuales en la misma agrupación por origen
      if (!arr.find(x => x.origen === (a.origen || 'Sin ubicación'))) {
        arr.push({ origen: a.origen || 'Sin ubicación', nivel: a.nivel, tipo: a.tipo });
      }
      mapa.set(nom, arr);
    }
    return Array.from(mapa.entries()).map(([insumo, ubicaciones]) => ({
      insumo,
      cantidad: ubicaciones.length,
      ubicaciones
    })).sort((a, b) => b.cantidad - a.cantidad);
  }

  get visiblesAgrupadas() {
    return this.mostrarTodas ? this.agrupadas : this.agrupadas.slice(0, this.limite);
  }

  get hayMas(): boolean {
    return !this.mostrarTodas && (this.agrupacion === 'plana' ? this.filtradas.length > this.limite : this.agrupadas.length > this.limite);
  }

  etiquetaNivel(nivel: string): string {
    if (nivel === 'AGOTADO') return 'Agotado';
    if (nivel === 'CRITICO') return 'Crítico';
    if (nivel === 'BAJO') return 'Bajo';
    if (nivel === 'INCIDENTE') return 'Incidente';
    if (nivel === 'VENCIDO') return 'Vencido';
    return nivel || '—';
  }

  icono(tipo: AlertaSeveridad): string {
    return tipo === 'critica' ? 'alert-triangle' : tipo === 'advertencia' ? 'alert-circle' : 'info';
  }

  iconoColor(tipo: AlertaSeveridad): string {
    return tipo === 'critica' ? 'text-rose-600' : tipo === 'advertencia' ? 'text-amber-600' : 'text-easydry-blue';
  }

  tarjeta(tipo: AlertaSeveridad): string {
    if (tipo === 'critica') return 'bg-rose-50 border-rose-200';
    if (tipo === 'advertencia') return 'bg-amber-50 border-amber-200';
    return 'bg-blue-50 border-blue-200';
  }

  textoColor(tipo: AlertaSeveridad): string {
    return tipo === 'critica' ? 'text-rose-900' : tipo === 'advertencia' ? 'text-amber-900' : 'text-blue-900';
  }

  subTextoColor(tipo: AlertaSeveridad): string {
    return tipo === 'critica' ? 'text-rose-700' : tipo === 'advertencia' ? 'text-amber-700' : 'text-blue-700';
  }

  etiquetaColor(tipo: AlertaSeveridad): string {
    return tipo === 'critica' ? 'bg-rose-600 text-white' : tipo === 'advertencia' ? 'bg-amber-500 text-white' : 'bg-easydry-blue text-white';
  }
}
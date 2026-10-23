import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

/** Fila de un ranking de personal (la misma forma que arma `DashboardOperativoService`). */
export interface FilaRankingPersonal {
  posicion: number;
  nombre: string;
  bahia?: string;
  vehiculos: number;
  tiempoPromedioMin?: number;
  dinero?: number;
}

/**
 * Rendimiento del personal: lavadores y pulidores en una sola tarjeta. Se puede cambiar de grupo, ver los que más o los que menos
 * servicios hicieron, elegir cuántos mostrar (5, 10 o 20) y mirar un mes concreto en vez del período del dashboard.
 */
@Component({
  selector: 'app-rendimiento-personal-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry h-full">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <h4 class="font-bold text-slate-900 text-lg font-outfit flex items-center gap-2">
          <i-lucide aria-hidden="true" name="trophy" class="w-5 h-5 text-amber-500"></i-lucide>
          {{ orden === 'desc' ? 'Top' : 'Bottom' }} {{ grupo === 'lavadores' ? 'Lavadores' : 'Pulidores' }}
        </h4>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Grupo -->
          @if (puedeVerPulidores) {
            <div class="flex bg-slate-100 p-1 rounded-xl" role="group" aria-label="Grupo de personal">
              <button type="button" class="px-3 py-1 text-xs font-bold rounded-lg transition-colors"
                [ngClass]="grupo === 'lavadores' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                [attr.aria-pressed]="grupo === 'lavadores'" (click)="grupo = 'lavadores'">Lavadores</button>
              <button type="button" class="px-3 py-1 text-xs font-bold rounded-lg transition-colors"
                [ngClass]="grupo === 'pulidores' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                [attr.aria-pressed]="grupo === 'pulidores'" (click)="grupo = 'pulidores'">Pulidores</button>
            </div>
          }
          @if (grupo === 'pulidores') {
            <div class="flex bg-slate-100 p-1 rounded-xl" role="group" aria-label="Tipo de pulidor">
              <button type="button" class="px-3 py-1 text-xs font-bold rounded-lg transition-colors"
                [ngClass]="subgrupo === 'fijos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                [attr.aria-pressed]="subgrupo === 'fijos'" (click)="subgrupo = 'fijos'">Fijos</button>
              <button type="button" class="px-3 py-1 text-xs font-bold rounded-lg transition-colors"
                [ngClass]="subgrupo === 'moviles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
                [attr.aria-pressed]="subgrupo === 'moviles'" (click)="subgrupo = 'moviles'">Móviles</button>
            </div>
          }
          <!-- Más / Menos -->
          <div class="flex bg-slate-100 p-1 rounded-xl" role="group" aria-label="Orden">
            <button type="button" class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap"
              [ngClass]="orden === 'asc' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              [attr.aria-pressed]="orden === 'asc'" (click)="orden = 'asc'">Menos</button>
            <button type="button" class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap"
              [ngClass]="orden === 'desc' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              [attr.aria-pressed]="orden === 'desc'" (click)="orden = 'desc'">Más</button>
          </div>
          <!-- Cuántos -->
          <label class="sr-only" for="rend-top">Cuántos mostrar</label>
          <select id="rend-top" [(ngModel)]="tamano" name="rend-top"
            class="h-8 pl-2 pr-6 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:border-easydry-blue cursor-pointer">
            @for (n of tamanos; track n) { <option [ngValue]="n">Top {{ n }}</option> }
          </select>
        </div>
      </div>

      <!-- Mes -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <label for="rend-mes" class="text-xs font-bold text-slate-500">Mes</label>
        <input id="rend-mes" type="month" [ngModel]="mes" (ngModelChange)="mesChange.emit($event || '')" name="rend-mes"
          class="h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none focus:border-easydry-blue" />
        @if (mes) {
          <button type="button" class="text-xs font-bold text-easydry-blue hover:underline" (click)="mesChange.emit('')">Usar el período del dashboard</button>
        } @else {
          <span class="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap">{{ periodoLabel || 'Período del dashboard' }}</span>
        }
      </div>

      <div class="space-y-3 max-h-[350px] overflow-y-auto pr-2">
        @for (op of visibles; track op.posicion + op.nombre) {
          <div class="p-3 bg-slate-50 border border-slate-100 hover:border-easydry-blue/30 hover:bg-easydry-blue/5 transition-colors rounded-xl flex items-center justify-between group">
            <div class="flex items-center gap-3">
              <span class="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs shadow-xs"
                    [ngClass]="{
                      'bg-amber-400 text-slate-900': orden === 'desc' && op.posicion === 1,
                      'bg-slate-300 text-slate-800': orden === 'desc' && op.posicion === 2,
                      'bg-amber-700/30 text-amber-900': orden === 'desc' && op.posicion === 3,
                      'bg-red-100 text-red-600': orden === 'asc' && op.posicion <= 3,
                      'bg-slate-100 text-slate-500': op.posicion > 3
                    }">
                {{ op.posicion }}
              </span>
              <div>
                <p class="text-sm font-bold text-slate-900 group-hover:text-easydry-blue transition-colors">{{ op.nombre }}</p>
                <p class="text-xs text-slate-500">{{ op.bahia }}</p>
              </div>
            </div>
            <div class="text-right flex flex-col items-end">
              <span class="text-sm font-extrabold text-slate-800">{{ op.vehiculos }}</span>
              <span class="text-[11px] font-bold uppercase tracking-widest text-slate-500">VEH.</span>
              @if (op.dinero !== undefined) {
                <span class="text-xs font-bold text-emerald-600 mt-1">$ {{ op.dinero }}</span>
              }
            </div>
          </div>
        }
        @if (visibles.length === 0) {
          <div class="text-center text-sm text-slate-500 py-4">No hay datos en esta categoría.</div>
        }
      </div>
    </div>
  `,
})
export class RendimientoPersonalWidgetComponent {
  @Input() lavadores: FilaRankingPersonal[] = [];
  @Input() lavadoresBottom: FilaRankingPersonal[] = [];
  @Input() pulidoresFijos: FilaRankingPersonal[] = [];
  @Input() pulidoresFijosBottom: FilaRankingPersonal[] = [];
  @Input() pulidoresMoviles: FilaRankingPersonal[] = [];
  @Input() pulidoresMovilesBottom: FilaRankingPersonal[] = [];
  @Input() puedeVerPulidores = false;
  /** Mes elegido (`AAAA-MM`); vacío = el período del dashboard. */
  @Input() mes = '';
  @Input() periodoLabel = '';
  @Output() mesChange = new EventEmitter<string>();

  readonly tamanos = [5, 10, 20];
  grupo: 'lavadores' | 'pulidores' = 'lavadores';
  subgrupo: 'fijos' | 'moviles' = 'fijos';
  orden: 'asc' | 'desc' = 'desc';
  tamano = 5;

  get visibles(): FilaRankingPersonal[] {
    const desc = this.orden === 'desc';
    const lista = this.grupo === 'lavadores'
      ? (desc ? this.lavadores : this.lavadoresBottom)
      : this.subgrupo === 'fijos'
        ? (desc ? this.pulidoresFijos : this.pulidoresFijosBottom)
        : (desc ? this.pulidoresMoviles : this.pulidoresMovilesBottom);
    return (lista ?? []).slice(0, this.tamano);
  }
}

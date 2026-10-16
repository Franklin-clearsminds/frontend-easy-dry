import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { Auditoria5sService } from '../../../core/services/auditoria5s.service';
import { TablaServidor } from '../../../core/utils/tabla-servidor';
import { DataTableCellDirective, DataTableComponent, TableColumn } from '../../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { ChartCardComponent } from '../../../shared/components/chart-card/chart-card.component';
import {
  AccionCorrectiva,
  Auditoria5sFila,
  Catalogo5s,
  FORMATOS_ETIQUETA,
  FormatoId,
  ESTADOS_ACCION,
  ESTADOS_AUDITORIA_5S,
  FilaComparacion,
  Opciones5s,
  Resumen5s,
  SEMAFORO,
  mensajeError,
} from '../../../core/models/auditorias.model';
import { Semaforo5sComponent } from '../shared/semaforo-5s.component';

type Pestana = 'resumen' | 'auditorias' | 'acciones' | 'historial';

/**
 * Auditorías 5S: dashboard, listado, seguimiento de acciones correctivas y comparación histórica. Quien no puede auditar (líder,
 * lavador, pulidor) ve el resultado de las auditorías finalizadas de su agencia, sin poder crear ni modificar nada.
 */
@Component({
  selector: 'app-auditorias5s',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, DataTableComponent, DataTableCellDirective, StatCardComponent, ChartCardComponent, Semaforo5sComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
            <i-lucide name="sparkles" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide><span>Auditorías</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Auditorías 5S</h1>
          <p class="text-slate-500 text-xs mt-1">
            @if (soloLectura) { El resultado de las auditorías 5S de tu agencia. }
            @else { Orden, limpieza, estandarización y disciplina por agencia y área: 20 criterios, 100 puntos y semáforo de cumplimiento. }
          </p>
        </div>
        @if (puedeCrear) {
          <a routerLink="/auditorias-5s/nueva" class="btn btn-cta w-full sm:w-auto"><i-lucide name="plus" class="w-4 h-4" aria-hidden="true"></i-lucide> Nueva auditoría 5S</a>
        }
      </div>

      <div class="flex gap-6 border-b border-slate-200 overflow-x-auto" role="tablist" aria-label="Secciones de Auditorías 5S">
        @for (t of pestanas; track t.id) {
          <button type="button" role="tab" [attr.aria-selected]="pestana === t.id" (click)="cambiar(t.id)"
            class="pb-3 min-h-10 text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            [ngClass]="pestana === t.id ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-700'">
            <i-lucide [name]="t.icono" class="w-4 h-4" aria-hidden="true"></i-lucide>{{ t.nombre }}
          </button>
        }
      </div>

      @if (pestana === 'resumen' || pestana === 'auditorias') {
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Formato de auditoría">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Formato:</span>
          <button type="button" (click)="elegirFormato('')" class="px-3 min-h-9 rounded-xl border text-xs font-bold" [ngClass]="formato === '' ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-300'">Todos</button>
          @for (f of catalogo?.formatos ?? []; track f.id) {
            <button type="button" (click)="elegirFormato(f.id)" class="px-3 min-h-9 rounded-xl border text-xs font-bold" [ngClass]="formato === f.id ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-300'" [attr.title]="f.nombre">{{ etiqueta(f.id) }}</button>
          }
        </div>
      }

      @if (errorResumen) { <div class="estado-error" role="alert">{{ errorResumen }}</div> }

      <!-- Resumen -->
      @if (pestana === 'resumen' && resumen) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <app-stat-card title="Auditorías realizadas" [value]="resumen.realizadas" icon="clipboard-check" variant="primary" subtitle="Finalizadas o cerradas"></app-stat-card>
          <app-stat-card title="Cumplimiento promedio" [value]="resumen.promedioGeneral === null ? '—' : resumen.promedioGeneral + '%'" icon="target" variant="primary" subtitle="De todas las auditorías"></app-stat-card>
          <app-stat-card title="Auditorías del mes" [value]="resumen.delMes" icon="calendar" variant="primary" subtitle="Del mes en curso"></app-stat-card>
          <app-stat-card title="Acciones correctivas pendientes" [value]="resumen.accionesPendientes" icon="alert-triangle" [variant]="resumen.accionesVencidas ? 'danger' : 'warning'" [subtitle]="resumen.accionesVencidas + ' vencida(s)'"></app-stat-card>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div class="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4"><p class="text-[11px] font-bold uppercase text-emerald-800">Agencias en verde</p><p class="text-3xl font-extrabold text-emerald-800">{{ resumen.agenciasVerde }}</p></div>
          <div class="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4"><p class="text-[11px] font-bold uppercase text-amber-800">Agencias en amarillo</p><p class="text-3xl font-extrabold text-amber-800">{{ resumen.agenciasAmarillo }}</p></div>
          <div class="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4"><p class="text-[11px] font-bold uppercase text-rose-800">Agencias en rojo</p><p class="text-3xl font-extrabold text-rose-800">{{ resumen.agenciasRojo }}</p></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <app-chart-card title="Cumplimiento por agencia" subtitle="Última auditoría de cada área" type="bar" [horizontal]="true" [data]="graficaAgencias" [options]="opcionesBarraH" mensajeVacio="Aún no hay auditorías finalizadas."></app-chart-card>
          <app-chart-card title="Evolución mensual" subtitle="Cumplimiento promedio de las auditorías de cada mes" type="line" [data]="graficaEvolucion" [options]="opcionesLinea" mensajeVacio="Aún no hay auditorías finalizadas."></app-chart-card>
          <app-chart-card title="Promedio por cada S" subtitle="% de cumplimiento promedio de cada S" type="bar" [data]="graficaS" [options]="opcionesPct" mensajeVacio="Aún no hay auditorías finalizadas."></app-chart-card>
          <app-chart-card title="Agencias por semáforo" subtitle="Según su última auditoría" type="doughnut" [data]="graficaSemaforo" mensajeVacio="Aún no hay auditorías finalizadas."></app-chart-card>
        </div>
      }

      <!-- Listado -->
      @if (pestana === 'auditorias') {
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
          <div><label class="field-label" for="a-ag">Agencia</label>
            <select id="a-ag" class="field" [(ngModel)]="filtros.agenciaId" (ngModelChange)="aplicar()"><option value="">Todas</option>@for (x of opciones?.agencias ?? []; track x.id) { <option [value]="x.id">{{ x.nombre }}</option> }</select></div>
          @if (!soloLectura) {
            <div><label class="field-label" for="a-au">Auditor</label>
              <select id="a-au" class="field" [(ngModel)]="filtros.auditorId" (ngModelChange)="aplicar()"><option value="">Todos</option>@for (x of opciones?.auditores ?? []; track x.id) { <option [value]="x.id">{{ x.nombre }}</option> }</select></div>
            <div><label class="field-label" for="a-es">Estado</label>
              <select id="a-es" class="field" [(ngModel)]="filtros.estado" (ngModelChange)="aplicar()"><option value="">Todos</option>@for (e of estados; track e.id) { <option [value]="e.id">{{ e.nombre }}</option> }</select></div>
          }
          <div><label class="field-label" for="a-se">Cumplimiento</label>
            <select id="a-se" class="field" [(ngModel)]="filtros.semaforo" (ngModelChange)="aplicar()"><option value="">Todos</option><option value="VERDE">Verde (≥ 90%)</option><option value="AMARILLO">Amarillo (75–89%)</option><option value="ROJO">Rojo (&lt; 75%)</option></select></div>
          <div><label class="field-label" for="a-de">Desde</label><input id="a-de" type="date" class="field" [(ngModel)]="filtros.desde" (ngModelChange)="aplicar()"></div>
          <div><label class="field-label" for="a-ha">Hasta</label><input id="a-ha" type="date" class="field" [(ngModel)]="filtros.hasta" (ngModelChange)="aplicar()"></div>
        </div>
        <app-data-table [serverSide]="true" [columns]="columnas" [data]="tabla.filas" [total]="tabla.total" [page]="tabla.pagina" [pageSize]="tabla.pageSize"
          [sortField]="tabla.sortField" [sortOrder]="tabla.sortOrder" [loading]="tabla.cargando" [error]="tabla.error"
          searchPlaceholder="Buscar por código o agencia…" caption="Auditorías 5S" emptyTitle="Aún no hay auditorías 5S en tu alcance"
          (queryChange)="tabla.alCambiar($event)" (reintentar)="tabla.cargar(true)">
          <ng-template appCell="codigo" let-a><a [routerLink]="['/auditorias-5s', a.id]" class="font-mono font-extrabold text-easydry-blue hover:underline">{{ a.codigo }}</a></ng-template>
          <ng-template appCell="fecha" let-a><span class="whitespace-nowrap">{{ a.fecha | date:'dd/MM/yyyy' }}</span></ng-template>
          <ng-template appCell="formato" let-a><span class="badge badge-neutral" [attr.title]="a.formatoNombre">{{ etiqueta(a.formato) }}</span></ng-template>
          <ng-template appCell="puntaje" let-a>@if (a.puntaje !== null && a.evaluados) { <span class="tabular-nums font-bold">{{ a.puntaje }}/{{ a.puntajeMaximo }}</span> } @else { — }</ng-template>
          <ng-template appCell="porcentaje" let-a>@if (a.porcentaje !== null && a.evaluados) { <span class="tabular-nums">{{ a.porcentaje }}%</span> } @else { — }</ng-template>
          <ng-template appCell="semaforo" let-a><app-semaforo-5s [semaforo]="a.semaforo"></app-semaforo-5s></ng-template>
          <ng-template appCell="estado" let-a>
            <span class="badge" [ngClass]="claseEstado(a.estado)">{{ nombreEstado(a.estado) }}</span>
            @if (a.accionesAbiertas) { <p class="text-[11px] text-amber-700 font-semibold mt-0.5">{{ a.accionesAbiertas }} acción(es) abierta(s)</p> }
          </ng-template>
          <ng-template appCell="acciones" let-a>
            <div class="flex justify-end gap-0.5">
              <a [routerLink]="['/auditorias-5s', a.id]" class="btn-icon" aria-label="Ver resultado" title="Ver resultado"><i-lucide name="eye" class="w-4 h-4" aria-hidden="true"></i-lucide></a>
              @if (puedeEditarFila(a)) { <a [routerLink]="['/auditorias-5s', a.id, 'editar']" class="btn-icon" aria-label="Continuar evaluación" title="Continuar evaluación"><i-lucide name="pencil" class="w-4 h-4" aria-hidden="true"></i-lucide></a> }
            </div>
          </ng-template>
        </app-data-table>
      }

      <!-- Acciones correctivas -->
      @if (pestana === 'acciones') {
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry flex flex-wrap gap-3 items-end">
          <div><label class="field-label" for="ac-es">Estado</label>
            <select id="ac-es" class="field" [(ngModel)]="filtroAccion" (ngModelChange)="cargarAcciones()">
              <option value="ABIERTAS">Abiertas</option><option value="VENCIDA">Vencidas</option><option value="EN_VERIFICACION">En verificación</option><option value="CERRADA">Cerradas</option><option value="">Todas</option>
            </select></div>
        </div>
        @if (errorAcciones) { <div class="estado-error" role="alert">{{ errorAcciones }}</div> }
        <div class="space-y-3">
          @for (x of acciones; track x.id) {
            <a [routerLink]="['/auditorias-5s', x.auditoriaId]" class="block bg-white rounded-2xl border p-4 shadow-easydry hover:shadow-easydry-hover transition-shadow" [ngClass]="x.estadoEfectivo === 'VENCIDA' ? 'border-rose-300' : 'border-slate-100'">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs font-extrabold text-easydry-blue">{{ x.codigo }}</span>
                <span class="badge" [ngClass]="claseAccion(x.estadoEfectivo)">{{ nombreAccion(x.estadoEfectivo) }}</span>
                <span class="text-xs text-slate-500">{{ x.agenciaNombre }}@if (x.areaNombre && x.areaNombre !== 'General') { · {{ x.areaNombre }} }</span>
              </div>
              <p class="text-sm font-semibold text-slate-900 mt-1">Criterio {{ x.criterio }}: {{ x.criterioDescripcion }}</p>
              <p class="text-sm text-slate-700">{{ x.hallazgo || x.accion }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ x.responsable || 'Sin responsable' }}@if (x.fechaCompromiso) { · compromiso {{ x.fechaCompromiso | date:'dd/MM/yyyy' }} }</p>
            </a>
          }
          @if (!acciones.length && !cargandoAcciones) { <p class="text-sm text-slate-500 bg-white rounded-2xl border border-slate-100 p-6 text-center">No hay acciones correctivas con este filtro.</p> }
        </div>
        @if (hayMasAcciones) { <button type="button" class="btn btn-secondary mx-auto" (click)="masAcciones()" [disabled]="cargandoAcciones">Cargar más</button> }
      }

      <!-- Historial / comparación -->
      @if (pestana === 'historial') {
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div><label class="field-label" for="h-ag">Agencia</label>
            <select id="h-ag" class="field" [(ngModel)]="hAgencia" (ngModelChange)="comparar()"><option value="">Selecciona…</option>@for (x of opciones?.agencias ?? []; track x.id) { <option [value]="x.id">{{ x.nombre }}</option> }</select></div>
          <div><label class="field-label" for="h-fo">Formato</label>
            <select id="h-fo" class="field" [(ngModel)]="hFormato" (ngModelChange)="comparar()">@for (x of catalogo?.formatos ?? []; track x.id) { <option [value]="x.id">{{ etiqueta(x.id) }}</option> }</select></div>
          <p class="text-xs text-slate-500 sm:col-span-2">Solo cuentan las auditorías finalizadas de la misma agencia y formato.</p>
        </div>
        @if (errorHistorial) { <div class="estado-error" role="alert">{{ errorHistorial }}</div> }
        @if (hAgencia) {
          @if (historia.length) {
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <app-chart-card title="Evolución del puntaje" [subtitle]="'Total por auditoría (máx. ' + historia[0].puntajeMaximo + ')'" type="line" [data]="graficaHistoria" [options]="opcionesLineaHistoria"></app-chart-card>
              <app-chart-card title="Cumplimiento por cada S" subtitle="Puntos de cada categoría en cada auditoría" type="bar" [data]="graficaHistoriaS" [options]="opcionesHistoriaS"></app-chart-card>
            </div>
            <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr>
                  <th class="text-left p-3">Fecha</th><th class="text-left p-3">Auditoría</th><th class="text-right p-3">Puntaje</th><th class="text-right p-3">%</th><th class="p-3">Semáforo</th><th class="text-right p-3">Variación</th><th class="text-right p-3">Acciones abiertas / cerradas</th></tr></thead>
                <tbody>
                  @for (f of historiaDesc; track f.id) {
                    <tr class="border-t border-slate-100">
                      <td class="p-3 whitespace-nowrap">{{ f.fecha | date:'dd/MM/yyyy' }}</td>
                      <td class="p-3"><a [routerLink]="['/auditorias-5s', f.id]" class="font-mono font-extrabold text-easydry-blue hover:underline">{{ f.codigo }}</a></td>
                      <td class="p-3 text-right tabular-nums font-bold">{{ f.puntaje }}/100</td>
                      <td class="p-3 text-right tabular-nums">{{ f.porcentaje }}%</td>
                      <td class="p-3 text-center"><app-semaforo-5s [semaforo]="f.semaforo"></app-semaforo-5s></td>
                      <td class="p-3 text-right tabular-nums font-bold" [ngClass]="f.variacion === null ? 'text-slate-400' : f.variacion >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ f.variacion === null ? '—' : (f.variacion > 0 ? '+' : '') + f.variacion }}</td>
                      <td class="p-3 text-right tabular-nums">{{ f.accionesAbiertas }} / {{ f.accionesCerradas }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else if (!cargandoHistorial) {
            <p class="text-sm text-slate-500 bg-white rounded-2xl border border-slate-100 p-6 text-center">Aún no hay auditorías finalizadas de esta agencia y formato para comparar.</p>
          }
        } @else {
          <p class="text-sm text-slate-500 bg-white rounded-2xl border border-slate-100 p-6 text-center">Elige una agencia para comparar sus auditorías.</p>
        }
      }
    </div>
  `,
})
export class Auditorias5sComponent implements OnInit, OnDestroy {
  private readonly api = inject(Auditoria5sService);
  private readonly auth = inject(AuthService);

  readonly puedeCrear = this.auth.puede('inspecciones.crear');
  readonly soloLectura = !this.auth.puede('inspecciones.crear') && !this.auth.puede('inspecciones.verificar');
  readonly estados = ESTADOS_AUDITORIA_5S;
  readonly pestanas: { id: Pestana; nombre: string; icono: string }[] = [
    { id: 'resumen', nombre: 'Resumen', icono: 'bar-chart-3' },
    { id: 'auditorias', nombre: 'Auditorías', icono: 'clipboard-list' },
    { id: 'acciones', nombre: 'Acciones correctivas', icono: 'alert-triangle' },
    { id: 'historial', nombre: 'Historial', icono: 'history' },
  ];
  readonly opcionesBarraH = { scales: { x: { min: 0, max: 100 } } };
  readonly opcionesLinea = { scales: { y: { min: 0, max: 100 } } };
  readonly opcionesPct = { scales: { y: { min: 0, max: 100 } } };
  get opcionesHistoriaS() { return { scales: { y: { min: 0, max: this.historia[0]?.porCategoria[0]?.maximo ?? 20, ticks: { precision: 0 } } } }; }
  get opcionesLineaHistoria() { return { scales: { y: { min: 0, max: this.historia[0]?.puntajeMaximo ?? 100 } } }; }
  etiqueta = (id: FormatoId) => FORMATOS_ETIQUETA[id].corto;

  pestana: Pestana = 'resumen';
  resumen: Resumen5s | null = null;
  errorResumen = '';
  opciones: Opciones5s | null = null;
  catalogo: Catalogo5s | null = null;
  filtros = { agenciaId: '', auditorId: '', estado: '', semaforo: '', desde: '', hasta: '' };
  /** Formato mostrado en el resumen y el listado ('' = todos). */
  formato: '' | FormatoId = '';

  readonly columnas: TableColumn[] = [
    { key: 'codigo', label: 'Código', type: 'custom', sortable: true },
    { key: 'agencia', label: 'Agencia', type: 'text', sortable: true },
    { key: 'fecha', label: 'Fecha', type: 'custom', sortable: true, defaultSort: 'desc' },
    { key: 'auditorNombre', label: 'Auditor', type: 'text', hideOnMobile: true },
    { key: 'formato', label: 'Formato', type: 'custom', sortable: true, hideOnMobile: true },
    { key: 'puntaje', label: 'Puntaje', type: 'custom', sortable: true },
    { key: 'porcentaje', label: '%', type: 'custom', sortable: true, hideOnMobile: true },
    { key: 'semaforo', label: 'Semáforo', type: 'custom', sortable: true },
    { key: 'estado', label: 'Estado', type: 'custom', sortable: true },
    { key: 'acciones', label: 'Acciones', type: 'custom', align: 'right', sticky: true },
  ];

  readonly tabla = new TablaServidor<Auditoria5sFila>((c) => this.api.getPagina({ ...c, ...this.filtrosActivos() }), { sortField: 'fecha', sortOrder: 'desc' });

  filtroAccion = 'ABIERTAS';
  acciones: AccionCorrectiva[] = [];
  paginaAcciones = 1;
  hayMasAcciones = false;
  cargandoAcciones = false;
  errorAcciones = '';

  hAgencia = '';
  hFormato: FormatoId = 'LISTA_20';
  historia: FilaComparacion[] = [];
  cargandoHistorial = false;
  errorHistorial = '';

  ngOnInit(): void {
    this.cargarResumen();
    this.api.getOpciones().subscribe({ next: (o) => (this.opciones = o), error: () => undefined });
    this.api.getCatalogo().subscribe({ next: (c) => (this.catalogo = c), error: () => undefined });
  }

  ngOnDestroy(): void {
    this.tabla.destruir();
  }

  cambiar(p: Pestana): void {
    this.pestana = p;
    if (p === 'auditorias' && !this.tabla.inicializada) this.tabla.reiniciar();
    if (p === 'acciones' && !this.acciones.length) this.cargarAcciones();
  }

  private filtrosActivos() {
    const f = this.filtros;
    return { agenciaId: f.agenciaId, auditorId: f.auditorId, estado: f.estado, semaforo: f.semaforo, desde: f.desde, hasta: f.hasta, formato: this.formato };
  }

  aplicar(): void {
    this.tabla.reiniciar();
  }

  elegirFormato(f: '' | FormatoId): void {
    this.formato = f;
    this.cargarResumen();
    if (this.tabla.inicializada) this.tabla.reiniciar();
  }

  private cargarResumen(): void {
    this.errorResumen = '';
    this.api.getResumen(this.formato || undefined).subscribe({ next: (r) => (this.resumen = r), error: (e) => (this.errorResumen = mensajeError(e, 'No se pudo cargar el resumen.')) });
  }

  nombreEstado = (id: string) => ESTADOS_AUDITORIA_5S.find((e) => e.id === id)?.nombre ?? id;
  claseEstado = (id: string) => ESTADOS_AUDITORIA_5S.find((e) => e.id === id)?.clase ?? '';
  nombreAccion = (id: string) => ESTADOS_ACCION.find((e) => e.id === id)?.nombre ?? id;
  claseAccion = (id: string) => ESTADOS_ACCION.find((e) => e.id === id)?.clase ?? '';

  puedeEditarFila(a: Auditoria5sFila): boolean {
    const mia = String(this.auth.getCurrentUser()?.id) === a.auditorId;
    return (a.estado === 'BORRADOR' || a.estado === 'EN_PROCESO') && ((mia && this.puedeCrear) || this.auth.puede('inspecciones.verificar'));
  }

  // ── Gráficas (los datos vienen del servidor) ──
  get graficaAgencias() {
    const f = this.resumen?.porAgencia ?? [];
    return { labels: f.map((a) => a.agenciaNombre), datasets: [{ label: '% de cumplimiento', data: f.map((a) => a.porcentaje), backgroundColor: f.map((a) => SEMAFORO[a.semaforo].hex), borderRadius: 6 }] };
  }

  get graficaEvolucion() {
    const e = this.resumen?.evolucion ?? [];
    return {
      labels: e.map((x) => x.periodo),
      datasets: [{ label: '% de cumplimiento promedio', data: e.map((x) => x.promedio ?? 0), borderColor: '#004282', backgroundColor: '#004282', tension: 0.3 }],
    };
  }

  get graficaS() {
    const s = this.resumen?.porS ?? [];
    return { labels: s.map((x) => x.nombre), datasets: [{ label: '% de cumplimiento', data: s.map((x) => x.porcentaje), backgroundColor: s.map((x) => this.colorPct(x.porcentaje)), borderRadius: 8 }] };
  }

  get graficaSemaforo() {
    const r = this.resumen;
    return { labels: ['Verde', 'Amarillo', 'Rojo'], datasets: [{ data: [r?.agenciasVerde ?? 0, r?.agenciasAmarillo ?? 0, r?.agenciasRojo ?? 0], backgroundColor: [SEMAFORO.VERDE.hex, SEMAFORO.AMARILLO.hex, SEMAFORO.ROJO.hex] }] };
  }

  get historiaDesc(): FilaComparacion[] { return [...this.historia].reverse(); }

  get graficaHistoria() {
    return { labels: this.historia.map((h) => h.fecha), datasets: [{ label: 'Puntaje', data: this.historia.map((h) => h.puntaje), borderColor: '#004282', backgroundColor: '#004282', tension: 0.3 }] };
  }

  get graficaHistoriaS() {
    const colores = ['#004282', '#0ea5e9', '#8b5cf6', '#f97316', '#14b8a6', '#64748b'];
    const cats = this.historia[0]?.porCategoria ?? [];
    return {
      labels: this.historia.map((h) => h.fecha),
      datasets: cats.map((c, k) => ({ label: c.nombre, data: this.historia.map((h) => h.porCategoria[k]?.puntaje ?? 0), backgroundColor: colores[k % colores.length], borderRadius: 4 })),
    };
  }

  private colorPct = (pct: number) => SEMAFORO[pct >= 90 ? 'VERDE' : pct >= 75 ? 'AMARILLO' : 'ROJO'].hex;

  async cargarAcciones(): Promise<void> {
    this.paginaAcciones = 1;
    this.acciones = [];
    await this.traerAcciones();
  }

  async masAcciones(): Promise<void> {
    this.paginaAcciones++;
    await this.traerAcciones();
  }

  private async traerAcciones(): Promise<void> {
    this.cargandoAcciones = true;
    this.errorAcciones = '';
    try {
      const { pagina } = await firstValueFrom(this.api.getAcciones(this.filtroAccion, this.paginaAcciones, 20));
      this.acciones = [...this.acciones, ...pagina.items];
      this.hayMasAcciones = pagina.hasNextPage;
    } catch (e) {
      this.errorAcciones = mensajeError(e, 'No se pudieron cargar las acciones.');
    } finally {
      this.cargandoAcciones = false;
    }
  }

  async comparar(): Promise<void> {
    this.historia = [];
    this.errorHistorial = '';
    if (!this.hAgencia) return;
    this.cargandoHistorial = true;
    try {
      this.historia = await firstValueFrom(this.api.comparar(this.hAgencia, null, this.hFormato));
    } catch (e) {
      this.errorHistorial = mensajeError(e, 'No se pudo cargar el historial.');
    } finally {
      this.cargandoHistorial = false;
    }
  }
}

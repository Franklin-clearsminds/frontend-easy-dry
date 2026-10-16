import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { InformesInspeccionService } from '../../core/services/informes-inspeccion.service';
import { Auditoria5sService } from '../../core/services/auditoria5s.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { CALIFICACIONES, ESTADOS_INFORME, ESTADOS_PLAN, Resumen5s, ResumenInformes, SEMAFORO, mensajeError } from '../../core/models/auditorias.model';

/**
 * Dashboard de Auditorías: una mirada conjunta a los informes de inspección y a las auditorías 5S, siempre dentro del alcance del
 * usuario. Los datos salen del servidor; solo lo ve quien puede auditar.
 */
@Component({
  selector: 'app-auditorias-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, StatCardComponent, ChartCardComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-2">
            <i-lucide name="clipboard-check" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide><span>Auditorías</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Dashboard de Auditorías</h1>
          <p class="text-slate-500 text-xs mt-1">Informes de inspección y auditorías 5S de tu alcance.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          @if (puedeInformes) { <a routerLink="/informes-inspeccion/nuevo" class="btn btn-secondary"><i-lucide name="file-search" class="w-4 h-4" aria-hidden="true"></i-lucide> Nuevo informe</a> }
          @if (puede5s) { <a routerLink="/auditorias-5s/nueva" class="btn btn-cta"><i-lucide name="sparkles" class="w-4 h-4" aria-hidden="true"></i-lucide> Nueva auditoría 5S</a> }
        </div>
      </div>

      @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }

      @if (informes) {
        <section class="space-y-3">
          <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-600">Informes de inspección</h2>
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <app-stat-card title="Total" [value]="informes.total" icon="file-search" variant="primary" subtitle="Inspecciones"></app-stat-card>
            <app-stat-card title="Este mes" [value]="informes.esteMes" icon="calendar" variant="primary" subtitle="Del mes en curso"></app-stat-card>
            <app-stat-card title="Por aprobar" [value]="informes.pendientesAprobacion" icon="clock" variant="warning" subtitle="En revisión"></app-stat-card>
            <app-stat-card title="Aprobados" [value]="informes.aprobados" icon="check-circle" variant="success" subtitle="Aprobados o cerrados"></app-stat-card>
            <app-stat-card title="Planes pendientes" [value]="informes.planesPendientes" icon="clipboard-list" [variant]="informes.planesVencidos ? 'danger' : 'warning'" [subtitle]="informes.planesVencidos + ' vencido(s)'"></app-stat-card>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <app-chart-card title="Informes por estado" type="doughnut" [data]="graficaEstados" mensajeVacio="Aún no hay informes."></app-chart-card>
            <app-chart-card title="Calificación del servicio" type="bar" [data]="graficaCalificacion" mensajeVacio="Aún no hay informes calificados."></app-chart-card>
            <app-chart-card title="Informes por mes" type="bar" [data]="graficaPeriodos" mensajeVacio="Aún no hay informes."></app-chart-card>
          </div>
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5">
            <div class="flex items-center justify-between mb-3"><h3 class="font-extrabold text-slate-900 font-outfit">Próximos planes de acción</h3><a routerLink="/informes-inspeccion" class="text-xs font-bold text-easydry-blue hover:underline">Ver informes</a></div>
            @for (p of informes.proximosPlanes; track p.id) {
              <a [routerLink]="['/informes-inspeccion', p.informeId]" class="flex flex-wrap items-center gap-2 py-2 border-t border-slate-100 text-sm hover:bg-slate-50">
                <span class="badge" [ngClass]="clasePlan(p.estado)">{{ nombrePlan(p.estado) }}</span>
                <span class="flex-1 min-w-48 font-semibold text-slate-800 line-clamp-1">{{ p.problema }}</span>
                <span class="text-xs text-slate-500">{{ p.agenciaNombre }} · {{ p.informeNumero }}@if (p.fechaCompromiso) { · {{ p.fechaCompromiso | date:'dd/MM/yyyy' }} }</span>
              </a>
            } @empty { <p class="text-sm text-slate-500">No hay planes de acción abiertos.</p> }
          </div>
        </section>
      }

      @if (cinco) {
        <section class="space-y-3">
          <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-600">Auditorías 5S</h2>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <app-stat-card title="Realizadas" [value]="cinco.realizadas" icon="sparkles" variant="primary" subtitle="Finalizadas o cerradas"></app-stat-card>
            <app-stat-card title="Cumplimiento promedio" [value]="cinco.promedioGeneral === null ? '—' : cinco.promedioGeneral + '%'" icon="target" variant="primary" subtitle="Todas las auditorías"></app-stat-card>
            <app-stat-card title="Agencias en rojo" [value]="cinco.agenciasRojo" icon="alert-triangle" [variant]="cinco.agenciasRojo ? 'danger' : 'success'" subtitle="Por debajo del 75%"></app-stat-card>
            <app-stat-card title="Acciones pendientes" [value]="cinco.accionesPendientes" icon="clipboard-list" [variant]="cinco.accionesVencidas ? 'danger' : 'warning'" [subtitle]="cinco.accionesVencidas + ' vencida(s)'"></app-stat-card>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <app-chart-card title="Cumplimiento por agencia" type="bar" [horizontal]="true" [data]="graficaAgencias" [options]="opcionesBarraH" mensajeVacio="Aún no hay auditorías 5S finalizadas."></app-chart-card>
            <app-chart-card title="Promedio por cada S" subtitle="% de cumplimiento promedio" type="bar" [data]="graficaS" [options]="opcionesS" mensajeVacio="Aún no hay auditorías 5S finalizadas."></app-chart-card>
          </div>
          <a routerLink="/auditorias-5s" class="text-xs font-bold text-easydry-blue hover:underline">Ir a Auditorías 5S</a>
        </section>
      }
    </div>
  `,
})
export class AuditoriasDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(InformesInspeccionService);
  private readonly api5s = inject(Auditoria5sService);

  readonly puedeInformes = this.auth.puede('informes.crear');
  readonly puede5s = this.auth.puede('inspecciones.crear');
  readonly opcionesBarraH = { scales: { x: { min: 0, max: 100 } } };
  readonly opcionesS = { scales: { y: { min: 0, max: 100 } } };
  informes: ResumenInformes | null = null;
  cinco: Resumen5s | null = null;
  error = '';

  async ngOnInit(): Promise<void> {
    const [i, c] = await Promise.allSettled([firstValueFrom(this.api.getResumen()), firstValueFrom(this.api5s.getResumen())]);
    if (i.status === 'fulfilled') this.informes = i.value;
    if (c.status === 'fulfilled') this.cinco = c.value;
    if (i.status === 'rejected' && c.status === 'rejected') this.error = mensajeError(i.reason, 'No se pudieron cargar los indicadores.');
  }

  nombrePlan = (id: string) => ESTADOS_PLAN.find((e) => e.id === id)?.nombre ?? id;
  clasePlan = (id: string) => ESTADOS_PLAN.find((e) => e.id === id)?.clase ?? '';

  get graficaEstados() {
    const f = this.informes?.porEstado ?? [];
    return {
      labels: f.map((x) => ESTADOS_INFORME.find((e) => e.id === x.estado)?.nombre ?? x.estado),
      datasets: [{ data: f.map((x) => x.total), backgroundColor: ['#94a3b8', '#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e', '#1e293b'] }],
    };
  }

  get graficaCalificacion() {
    const f = this.informes?.porCalificacion ?? [];
    return {
      labels: f.map((x) => CALIFICACIONES.find((c) => c.id === x.calificacion)?.nombre ?? x.calificacion),
      datasets: [{ label: 'Informes', data: f.map((x) => x.total), backgroundColor: ['#10b981', '#0ea5e9', '#f59e0b', '#f43f5e'], borderRadius: 8 }],
    };
  }

  get graficaPeriodos() {
    const f = this.informes?.porPeriodo ?? [];
    return { labels: f.map((x) => x.periodo), datasets: [{ label: 'Informes', data: f.map((x) => x.total), backgroundColor: '#004282', borderRadius: 8 }] };
  }

  private color = (pct: number) => SEMAFORO[pct >= 90 ? 'VERDE' : pct >= 75 ? 'AMARILLO' : 'ROJO'].hex;

  get graficaAgencias() {
    const f = this.cinco?.porAgencia ?? [];
    return { labels: f.map((a) => a.agenciaNombre), datasets: [{ label: '% de cumplimiento', data: f.map((a) => a.porcentaje), backgroundColor: f.map((a) => SEMAFORO[a.semaforo].hex), borderRadius: 6 }] };
  }

  get graficaS() {
    const s = this.cinco?.porS ?? [];
    return { labels: s.map((x) => x.nombre), datasets: [{ label: '% de cumplimiento', data: s.map((x) => x.porcentaje), backgroundColor: s.map((x) => this.color(x.porcentaje)), borderRadius: 8 }] };
  }
}

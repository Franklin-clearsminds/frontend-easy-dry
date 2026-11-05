import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ChartCardComponent } from '../../../shared/components/chart-card/chart-card.component';
import { ModalPortalDirective } from '../../../shared/directives/modal-portal.directive';
import { DashboardOperativoService, ProductividadDetalle, ProductividadPersona } from '../../../core/services/dashboard-operativo.service';

type Vista = 'AGENCIAS' | 'PERSONAL';
type Metrica = 'servicios' | 'monto';

const ETIQUETA_ROL: Record<string, string> = { LAVADOR: 'Lavador', AUXILIAR: 'Auxiliar', LIDER: 'Líder / Backup', PULIDOR: 'Pulidor' };

interface FilaTabla {
  clave: string;
  nombre: string;
  tipo: string;
  tipoCod: string;
  agencia: string;
  region: string;
  servicios: number;
  monto: number | null;
  tiempo: number | null;
}

/**
 * Top 5 / Top 10 de agencias o de personal por servicios o por monto facturado (comercial), de mayor a menor o al revés.
 * Al tocar el gráfico se abre una tabla con toda la productividad, filtrable por región, agencia y tipo de persona.
 */
@Component({
  selector: 'app-productividad-top',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ChartCardComponent, ModalPortalDirective],
  template: `
    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h4 class="font-bold text-slate-900 text-base font-outfit">Top {{ limite }} {{ vista === 'AGENCIAS' ? 'agencias' : 'personal' }} por {{ metrica === 'monto' ? 'dinero (monto facturado)' : 'servicios' }}</h4>
          <p class="text-xs text-slate-500 mt-0.5">Toca el gráfico para ver la tabla completa de productividad.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
            <button type="button" (click)="vista = 'AGENCIAS'" [class]="clase(vista === 'AGENCIAS')">Agencias</button>
            <button type="button" (click)="vista = 'PERSONAL'" [class]="clase(vista === 'PERSONAL')">Personal</button>
          </div>
          @if (datos?.verMonto) {
            <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
              <button type="button" (click)="metrica = 'servicios'" [class]="clase(metrica === 'servicios')">Servicios</button>
              <button type="button" (click)="metrica = 'monto'" [class]="clase(metrica === 'monto')">Dinero</button>
            </div>
          }
          <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
            <button type="button" (click)="limite = 5" [class]="clase(limite === 5)">Top 5</button>
            <button type="button" (click)="limite = 10" [class]="clase(limite === 10)">Top 10</button>
          </div>
          <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
            <button type="button" (click)="mayor = true" [class]="clase(mayor)">Mayor</button>
            <button type="button" (click)="mayor = false" [class]="clase(!mayor)">Menor</button>
          </div>
          <button type="button" (click)="abrirTabla()" class="px-3 py-1.5 font-bold text-white bg-easydry-blue rounded-lg cursor-pointer">Ver tabla completa</button>
        </div>
      </div>

      <div class="cursor-pointer" role="button" tabindex="0" aria-label="Abrir la tabla completa de productividad" (click)="abrirTabla()" (keydown.enter)="abrirTabla()">
        <app-chart-card [sinTarjeta]="true" type="bar" [horizontal]="true" [data]="chartData" [options]="chartOptions"></app-chart-card>
      </div>
    </div>

    @if (tablaAbierta) {
      <div appModalPortal role="dialog" aria-modal="true" aria-labelledby="prod-tabla-title" class="fixed inset-0 z-[10050] flex items-center justify-center animate-fade-in">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" (click)="tablaAbierta = false"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 overflow-hidden max-h-[90dvh] flex flex-col border border-slate-100">
          <div class="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 id="prod-tabla-title" class="font-extrabold text-slate-900 text-lg">Productividad completa</h3>
            <button type="button" aria-label="Cerrar" (click)="tablaAbierta = false" class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center hover:bg-slate-100 rounded-full cursor-pointer">
              <i-lucide aria-hidden="true" name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>

          <div class="shrink-0 px-6 py-3 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 border-b border-slate-100 text-xs">
            <div><label class="block font-bold text-slate-600 mb-1" for="pt-reg">Región</label>
              <select id="pt-reg" class="field" [(ngModel)]="fRegion" (ngModelChange)="fAgencia = ''"><option value="">Todas</option>@for (r of regiones; track r) { <option [value]="r">{{ r }}</option> }</select></div>
            <div><label class="block font-bold text-slate-600 mb-1" for="pt-ag">Agencia</label>
              <select id="pt-ag" class="field" [(ngModel)]="fAgencia"><option value="">Todas</option>@for (a of agenciasDeRegion; track a) { <option [value]="a">{{ a }}</option> }</select></div>
            <div><label class="block font-bold text-slate-600 mb-1" for="pt-tipo">Quién</label>
              <select id="pt-tipo" class="field" [(ngModel)]="fTipo">
                <option value="">Agencias y todo el personal</option><option value="AGENCIA">Solo agencias</option><option value="LAVADOR">Lavadores</option><option value="AUXILIAR">Auxiliares</option><option value="PULIDOR">Pulidores</option><option value="LIDER">Líderes / Backup</option>
              </select></div>
            <div><label class="block font-bold text-slate-600 mb-1" for="pt-bus">Buscar</label>
              <input id="pt-bus" class="field" type="search" placeholder="Nombre…" [(ngModel)]="fTexto" /></div>
          </div>

          <div class="flex-1 min-h-0 overflow-auto">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-white text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr><th class="py-2.5 px-4">Nombre</th><th class="px-4">Tipo</th><th class="px-4">Agencia</th><th class="px-4">Región</th><th class="px-4 text-right">Servicios</th>@if (datos?.verMonto) { <th class="px-4 text-right">Monto</th> }<th class="px-4 text-right">Tiempo prom.</th></tr>
              </thead>
              <tbody>
                @for (f of filasTabla; track f.clave) {
                  <tr class="border-b border-slate-50 hover:bg-slate-50">
                    <td class="py-2 px-4 font-semibold text-slate-800">{{ f.nombre }}</td>
                    <td class="px-4 text-slate-600">{{ f.tipo }}</td>
                    <td class="px-4 text-slate-600">{{ f.agencia }}</td>
                    <td class="px-4 text-slate-600">{{ f.region }}</td>
                    <td class="px-4 text-right font-bold">{{ f.servicios }}</td>
                    @if (datos?.verMonto) { <td class="px-4 text-right">{{ f.monto | currency: 'USD' }}</td> }
                    <td class="px-4 text-right text-slate-600">{{ f.tiempo === null ? '—' : f.tiempo + ' min' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" class="py-10 text-center text-slate-500">Sin datos con estos filtros.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="shrink-0 px-6 py-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
            <span>{{ filasTabla.length }} filas</span>
            <span>Servicios: <strong>{{ totalServicios }}</strong>@if (datos?.verMonto) { · Monto: <strong>{{ totalMonto | currency: 'USD' }}</strong> }</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProductividadTopComponent implements OnInit, OnChanges {
  private servicio = inject(DashboardOperativoService);

  /** Mismo periodo y agencia que filtra el resto de la pantalla. */
  @Input() agenciaId?: string;
  @Input() fechaDesde?: string;
  @Input() fechaHasta?: string;

  datos: ProductividadDetalle | null = null;
  vista: Vista = 'AGENCIAS';
  metrica: Metrica = 'servicios';
  limite: 5 | 10 = 5;
  mayor = true;
  tablaAbierta = false;
  fRegion = '';
  fAgencia = '';
  fTipo = '';
  fTexto = '';

  readonly chartOptions = { plugins: { legend: { display: false } } };

  private iniciado = false;

  ngOnInit(): void {
    this.iniciado = true;
    this.cargar();
  }

  ngOnChanges(): void {
    if (this.iniciado) this.cargar();
  }

  private cargar(): void {
    const filtro: Record<string, string> = {};
    if (this.agenciaId) filtro['agenciaId'] = this.agenciaId;
    if (this.fechaDesde) filtro['fechaDesde'] = this.fechaDesde;
    if (this.fechaHasta) filtro['fechaHasta'] = this.fechaHasta;
    this.servicio.getProductividadDetalle(filtro).subscribe((d) => {
      this.datos = d;
      if (!d.verMonto) this.metrica = 'servicios';
    });
  }

  clase(activo: boolean): string {
    return activo ? 'px-2 py-0.5 font-bold bg-easydry-blue text-white rounded-md shadow-xs' : 'px-2 py-0.5 font-medium text-slate-600 hover:bg-white rounded-md cursor-pointer';
  }

  private valor(x: { servicios: number; monto: number | null }): number {
    return this.metrica === 'monto' ? Number(x.monto ?? 0) : x.servicios;
  }

  get chartData() {
    const fuente: { nombre: string; servicios: number; monto: number | null }[] = this.vista === 'AGENCIAS'
      ? (this.datos?.agencias ?? []).map((a) => ({ nombre: a.agencia, servicios: a.servicios, monto: a.monto }))
      : (this.datos?.personas ?? []).map((p) => ({ nombre: `${p.nombre} · ${p.agencia}`, servicios: p.servicios, monto: p.monto }));
    const orden = [...fuente].sort((a, b) => (this.mayor ? this.valor(b) - this.valor(a) : this.valor(a) - this.valor(b))).slice(0, this.limite);
    return {
      labels: orden.map((o) => o.nombre),
      datasets: [{ label: this.metrica === 'monto' ? 'Monto facturado (USD)' : 'Servicios', data: orden.map((o) => this.valor(o)), backgroundColor: this.metrica === 'monto' ? '#0f766e' : '#004282' }],
    };
  }

  abrirTabla(): void {
    this.tablaAbierta = true;
  }

  private get todas(): FilaTabla[] {
    const ag: FilaTabla[] = (this.datos?.agencias ?? []).map((a) => ({ clave: `a:${a.agenciaId}`, nombre: a.agencia, tipo: 'Agencia', tipoCod: 'AGENCIA', agencia: a.agencia, region: a.region, servicios: a.servicios, monto: a.monto, tiempo: null }));
    const pe: FilaTabla[] = (this.datos?.personas ?? []).map((p: ProductividadPersona) => ({ clave: `p:${p.personaId}`, nombre: p.nombre, tipo: ETIQUETA_ROL[p.rol] ?? p.rol, tipoCod: p.rol, agencia: p.agencia, region: p.region, servicios: p.servicios, monto: p.monto, tiempo: p.tiempoPromedioMin }));
    return [...ag, ...pe];
  }

  get regiones(): string[] {
    return [...new Set(this.todas.map((f) => f.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  get agenciasDeRegion(): string[] {
    return [...new Set(this.todas.filter((f) => !this.fRegion || f.region === this.fRegion).map((f) => f.agencia).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  get filasTabla(): FilaTabla[] {
    const t = this.fTexto.trim().toLowerCase();
    return this.todas
      .filter((f) => (!this.fRegion || f.region === this.fRegion) && (!this.fAgencia || f.agencia === this.fAgencia) && (!this.fTipo || f.tipoCod === this.fTipo) && (!t || f.nombre.toLowerCase().includes(t)))
      .sort((a, b) => b.servicios - a.servicios || a.nombre.localeCompare(b.nombre, 'es'));
  }

  /** Los totales cuentan una sola vez: las agencias ya suman a su personal, así que con "todo" solo se suman las agencias. */
  private get filasParaTotal(): FilaTabla[] {
    return this.fTipo === '' ? this.filasTabla.filter((f) => f.tipoCod === 'AGENCIA') : this.filasTabla;
  }

  get totalServicios(): number {
    return this.filasParaTotal.reduce((n, f) => n + f.servicios, 0);
  }

  get totalMonto(): number {
    return this.filasParaTotal.reduce((n, f) => n + Number(f.monto ?? 0), 0);
  }
}

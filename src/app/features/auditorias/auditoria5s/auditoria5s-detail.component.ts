import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { Auditoria5sService } from '../../../core/services/auditoria5s.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ChartCardComponent } from '../../../shared/components/chart-card/chart-card.component';
import { ThumbSrcDirective } from '../../../shared/directives/thumb-src.directive';
import {
  AccionCorrectiva,
  Auditoria5sDetalle,
  Catalogo5s,
  FORMATOS_ETIQUETA,
  Formato5sCatalogo,
  FormatoId,
  ESTADOS_ACCION,
  ESTADOS_AUDITORIA_5S,
  SEMAFORO,
  mensajeError,
} from '../../../core/models/auditorias.model';
import { EvidenciasFotosComponent } from '../shared/evidencias-fotos.component';
import { Semaforo5sComponent } from '../shared/semaforo-5s.component';
import { HistorialInformeComponent } from '../informes/historial-informe.component';
import { descargarExcel5s, descargarPdf5s } from './auditoria5s-export';

/** Resultado de una auditoría 5S, sus 20 criterios, el seguimiento de las acciones correctivas y los reportes. */
@Component({
  selector: 'app-auditoria5s-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, ModalComponent, ChartCardComponent, ThumbSrcDirective, EvidenciasFotosComponent, Semaforo5sComponent, HistorialInformeComponent],
  template: `
    <div class="space-y-5 animate-fade-in max-w-6xl mx-auto">
      <a routerLink="/auditorias-5s" class="btn btn-ghost btn-sm w-fit"><i-lucide name="arrow-left" class="w-4 h-4" aria-hidden="true"></i-lucide> Auditorías 5S</a>

      @if (cargando) {
        <div class="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500" role="status">Cargando auditoría…</div>
      } @else if (error) {
        <div class="estado-error" role="alert">{{ error }}</div>
      } @else if (a && fmt) {
        <header class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-mono font-extrabold text-easydry-blue text-lg">{{ a.codigo }}</p>
              <h1 class="text-xl font-extrabold text-slate-900 font-outfit">{{ a.agencia.nombre }}@if (a.area !== 'GENERAL') { · {{ a.areaNombre }} }</h1>
              <p class="text-xs font-bold text-easydry-blue mt-0.5">{{ a.formatoNombre }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ a.fecha | date:'dd/MM/yyyy' }} · Auditor: {{ a.auditorNombre }} · Responsable de agencia: {{ a.responsableAgencia || '—' }}</p>
            </div>
            <span class="badge" [ngClass]="claseEstado(a.estado)">{{ nombreEstado(a.estado) }}</span>
          </div>

          @if (a.hermanas.length > 1) {
            <nav aria-label="Formatos de esta visita" class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Otros formatos de esta visita:</span>
              @for (h of a.hermanas; track h.id) {
                @if (h.id === a.id) { <span class="px-3 py-1.5 rounded-xl bg-easydry-blue text-white text-xs font-bold">{{ etiqueta(h.formato) }}</span> }
                @else { <a [routerLink]="['/auditorias-5s', h.id]" class="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50">{{ etiqueta(h.formato) }} · {{ h.estado === 'FINALIZADA' || h.estado === 'CERRADA' ? 'finalizada' : 'en proceso' }}</a> }
              }
            </nav>
          }

          <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 items-start">
            <div class="space-y-3">
              <app-semaforo-5s [semaforo]="a.resultado.semaforo" [grande]="true" [detalle]="a.resultado.puntaje + ' de ' + a.resultado.puntajeMaximo + ' puntos · ' + a.resultado.porcentaje + '%'"></app-semaforo-5s>
              <ul class="space-y-1.5 text-sm">
                @for (c of a.resultado.porCategoria; track c.categoria) {
                  <li class="flex items-center justify-between gap-2"><span class="font-semibold text-slate-700">{{ c.nombre.toUpperCase() }}@if (a.formato === 'SI_NO_50') { <span class="text-[11px] font-normal text-slate-500"> · {{ c.noConformes }} no cumple(n)</span> }</span><span class="tabular-nums font-extrabold">{{ c.puntaje }}/{{ c.maximo }}</span></li>
                }
                <li class="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200 font-extrabold"><span>TOTAL</span><span class="tabular-nums">{{ a.resultado.puntaje }}/{{ a.resultado.puntajeMaximo }} — {{ nombreSemaforo(a.resultado.semaforo) }}</span></li>
              </ul>
              <dl class="grid grid-cols-2 gap-2 text-sm">
                <div class="rounded-xl bg-slate-50 p-3"><dt class="field-label">Hallazgos</dt><dd class="text-xl font-extrabold">{{ a.acciones.length }}</dd></div>
                <div class="rounded-xl bg-slate-50 p-3"><dt class="field-label">Acciones abiertas</dt><dd class="text-xl font-extrabold">{{ abiertas }}</dd></div>
              </dl>
              @if (a.anterior) {
                <div class="grid grid-cols-3 gap-2 text-center text-sm">
                  <div class="rounded-xl bg-slate-50 p-3"><p class="field-label">Esta auditoría</p><p class="text-lg font-extrabold">{{ a.resultado.puntaje }}</p></div>
                  <div class="rounded-xl bg-slate-50 p-3"><p class="field-label">Anterior</p><p class="text-lg font-extrabold">{{ a.anterior.puntaje }}</p><p class="text-[10px] text-slate-500">{{ a.anterior.fecha | date:'dd/MM/yyyy' }}</p></div>
                  <div class="rounded-xl bg-slate-50 p-3"><p class="field-label">Diferencia (+/−)</p><p class="text-lg font-extrabold" [ngClass]="(a.anterior.diferencia ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ (a.anterior.diferencia ?? 0) > 0 ? '+' : '' }}{{ a.anterior.diferencia }}</p></div>
                </div>
              }
            </div>
            <app-chart-card title="Resultado por cada S" [subtitle]="'Puntos obtenidos de ' + maxCategoria + ' en cada categoría'" type="bar" [data]="grafica" [options]="opcionesGrafica"></app-chart-card>
          </div>

          <div class="flex flex-wrap gap-2">
            @if (a.permisos.puedeEditar) { <a [routerLink]="['/auditorias-5s', a.id, 'editar']" class="btn btn-secondary"><i-lucide name="pencil" class="w-4 h-4" aria-hidden="true"></i-lucide> Continuar evaluación</a> }
            @if (a.permisos.puedeCerrar) { <button type="button" class="btn btn-primary" (click)="cerrar()" [disabled]="trabajando"><i-lucide name="lock" class="w-4 h-4" aria-hidden="true"></i-lucide> Cerrar auditoría</button> }
            @if (a.permisos.puedeEliminar && puedeEliminarBorrador) { <button type="button" class="btn btn-danger" (click)="eliminar()" [disabled]="trabajando"><i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide> Eliminar borrador</button> }
            <button type="button" class="btn btn-secondary" (click)="pdf()" [disabled]="generando"><i-lucide name="download" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ generando ? 'Generando…' : 'Reporte PDF' }}</button>
            <button type="button" class="btn btn-secondary" (click)="excel()"><i-lucide name="file-spreadsheet" class="w-4 h-4" aria-hidden="true"></i-lucide> Exportar Excel</button>
          </div>
          @if (a.comentarios) { <p class="text-sm text-slate-600 whitespace-pre-line"><strong>Comentarios:</strong> {{ a.comentarios }}</p> }
        </header>

        <!-- Los criterios del formato -->
        <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
          <h2 class="px-5 py-4 font-extrabold text-slate-900 font-outfit">Criterios evaluados</h2>
          @for (c of fmt.categorias; track c.id) {
            <div class="border-t border-slate-100">
              <div class="px-5 py-2 bg-slate-900 text-white flex items-center justify-between text-xs font-extrabold uppercase tracking-wide">
                <span>{{ c.nombre }}{{ a.formato === 'PUNTOS_25' ? ': ' : ' = ' }}{{ c.traduccion }}</span><span class="tabular-nums">{{ puntajeDe(c.id) }}/{{ c.maximo }}</span>
              </div>
              @for (q of criteriosDe(c.id); track q.numero) {
                <article class="px-5 py-3 border-t border-slate-100 grid grid-cols-[auto_1fr_auto] gap-3 items-start text-sm">
                  <span class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center justify-center">{{ q.numero }}</span>
                  <div class="min-w-0 space-y-1">
                    <p class="font-semibold text-slate-900">{{ q.descripcion }}</p>
                    @if (q.hallazgo) { <p class="text-slate-700"><strong>Hallazgo:</strong> {{ q.hallazgo }}</p> }
                    @if (q.accionCorrectiva) { <p class="text-slate-700"><strong>Acción:</strong> {{ q.accionCorrectiva }}</p> }
                    @if (q.responsable || q.fechaCompromiso) { <p class="text-xs text-slate-500">{{ q.responsable || 'Sin responsable' }}@if (q.fechaCompromiso) { · compromiso {{ q.fechaCompromiso | date:'dd/MM/yyyy' }} }</p> }
                    @if (q.observaciones) { <p class="text-xs text-slate-500">{{ q.observaciones }}</p> }
                    @if (q.fotos.length) { <div class="flex flex-wrap gap-2 pt-1">@for (f of q.fotos; track f) { <img [appThumb]="f" class="w-14 h-14 object-cover rounded-lg border border-slate-200" alt="Evidencia fotográfica del criterio"> }</div> }
                    @if (q.estadoAccion) { <span class="badge" [ngClass]="claseAccion(q.estadoAccion)">{{ nombreAccion(q.estadoAccion) }}</span> }
                  </div>
                  @if (a.formato === 'SI_NO_50') {
                    <span class="text-lg font-extrabold px-3 py-1 rounded-lg" [ngClass]="q.puntaje === null ? 'bg-slate-100 text-slate-500' : q.cumple ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'" [attr.title]="'Cumple con: ' + q.favorable">{{ q.puntaje === null ? '—' : q.puntaje === 1 ? 'SI' : 'NO' }}</span>
                  } @else {
                    <span class="text-lg font-extrabold tabular-nums px-2.5 py-1 rounded-lg"
                      [ngClass]="q.puntaje === null ? 'bg-slate-100 text-slate-500' : q.cumple ? 'bg-emerald-100 text-emerald-800' : q.puntaje >= q.puntajeMaximo / 2 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'">{{ q.puntaje === null ? '—' : q.puntaje }}<span class="text-xs font-bold opacity-70">/{{ q.puntajeMaximo }}</span></span>
                  }
                </article>
              }
              @if (a.comentariosCategoria[c.id]) { <p class="px-5 py-3 border-t border-slate-100 bg-slate-50 text-sm text-slate-700"><strong>Comentarios / acciones:</strong> {{ a.comentariosCategoria[c.id] }}</p> }
            </div>
          }
        </section>

        <!-- Acciones correctivas -->
        <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 space-y-3">
          <h2 class="font-extrabold text-slate-900 font-outfit">Acciones correctivas ({{ a.acciones.length }})</h2>
          @if (!a.acciones.length) { <p class="text-sm text-slate-500">Esta auditoría no abrió acciones correctivas.</p> }
          @for (x of a.acciones; track x.id) {
            <article class="rounded-xl border p-3 space-y-2 text-sm" [ngClass]="x.estadoEfectivo === 'VENCIDA' ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs font-extrabold text-easydry-blue">{{ x.codigo }}</span>
                <span class="badge" [ngClass]="claseAccion(x.estadoEfectivo)">{{ nombreAccion(x.estadoEfectivo) }}</span>
                <span class="badge" [ngClass]="clasePrioridad(x.prioridad)">{{ x.prioridad }}</span>
                <span class="text-xs text-slate-500">Criterio {{ x.criterio }} · {{ x.responsable || 'Sin responsable' }}@if (x.fechaCompromiso) { · compromiso {{ x.fechaCompromiso | date:'dd/MM/yyyy' }} }</span>
              </div>
              <p><strong>Hallazgo:</strong> {{ x.hallazgo || '—' }}</p>
              <p><strong>Acción:</strong> {{ x.accion || '—' }}</p>
              @if (x.observaciones) { <p class="text-slate-600 whitespace-pre-line">{{ x.observaciones }}</p> }
              <div class="flex flex-wrap gap-2">
                @for (f of x.evidenciaInicial; track f) { <img [appThumb]="f" class="w-14 h-14 object-cover rounded-lg border border-slate-200" alt="Evidencia inicial"> }
                @for (f of x.evidenciaCorreccion; track f) { <img [appThumb]="f" class="w-14 h-14 object-cover rounded-lg border-2 border-emerald-300" alt="Evidencia de la corrección"> }
              </div>
              @if (x.estado === 'CERRADA') { <p class="text-xs text-emerald-700 font-semibold">Cerrada el {{ x.cerradaEn | date:'dd/MM/yyyy' }} · verificada por {{ x.verificadaPorNombre }}</p> }
              <div class="flex flex-wrap gap-2">
                @if (a.permisos.puedeSeguimiento && puedeSeguirAcciones && x.estado !== 'CERRADA' && x.estado !== 'EN_VERIFICACION') {
                  <button type="button" class="btn btn-secondary btn-sm" (click)="abrirSeguimiento(x)"><i-lucide name="clipboard-check" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Dar seguimiento</button>
                }
                @if (a.permisos.puedeVerificar && x.estado === 'EN_VERIFICACION') {
                  <button type="button" class="btn btn-cta btn-sm" (click)="verificar(x, 'CERRAR')" [disabled]="trabajando"><i-lucide name="check-circle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Verificar y cerrar</button>
                  <button type="button" class="btn btn-danger btn-sm" (click)="abrirDevolver(x)" [disabled]="trabajando">Devolver</button>
                }
              </div>
            </article>
          }
        </section>

        <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5">
          <h2 class="font-extrabold text-slate-900 font-outfit mb-3">Historial</h2>
          <app-historial-informe [items]="a.historial"></app-historial-informe>
        </section>
      }

      <app-modal [isOpen]="!!seguimiento" title="Seguimiento de la acción correctiva" icon="clipboard-check" size="md" (close)="seguimiento = null">
        @if (seguimiento) {
          <div class="space-y-3">
            <p class="text-sm font-semibold text-slate-800">{{ seguimiento.codigo }} · {{ seguimiento.hallazgo }}</p>
            <div><label class="field-label" for="s-est">Estado</label>
              <select id="s-est" class="field" [(ngModel)]="segEstado">
                <option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="EN_VERIFICACION">Enviar a verificación</option>
              </select>
              <p class="text-[11px] text-slate-500 mt-1">La acción solo se cierra cuando quien verifica confirma la corrección.</p></div>
            <div><label class="field-label" for="s-obs">Qué se hizo / observaciones</label><textarea id="s-obs" class="field" rows="3" [(ngModel)]="segObs"></textarea></div>
            <div><label class="field-label">Evidencia de la corrección</label>
              <app-evidencias-fotos [fotos]="segFotos" (fotosChange)="segFotos = $event" [agenciaId]="a!.agencia.id" tipo="5s" [referenciaId]="a!.id"></app-evidencias-fotos></div>
            @if (errorModal) { <p class="field-help">{{ errorModal }}</p> }
            <div class="flex gap-2"><button type="button" class="btn btn-secondary" (click)="seguimiento = null">Cancelar</button>
              <button type="button" class="btn btn-primary" (click)="guardarSeguimiento()" [disabled]="trabajando">Guardar seguimiento</button></div>
          </div>
        }
      </app-modal>

      <app-modal [isOpen]="!!devolviendo" title="Devolver la acción" icon="rotate-ccw" size="sm" (close)="devolviendo = null">
        <label class="field-label" for="d-mot">Motivo *</label>
        <textarea id="d-mot" class="field" rows="3" [(ngModel)]="motivo" placeholder="Qué falta para poder cerrarla"></textarea>
        @if (errorModal) { <p class="field-help">{{ errorModal }}</p> }
        <div class="flex gap-2 mt-4"><button type="button" class="btn btn-secondary" (click)="devolviendo = null">Cancelar</button>
          <button type="button" class="btn btn-danger" (click)="devolver()" [disabled]="trabajando">Devolver a proceso</button></div>
      </app-modal>
    </div>
  `,
})
export class Auditoria5sDetailComponent implements OnInit {
  private readonly api = inject(Auditoria5sService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageUploadService);
  private readonly auth = inject(AuthService);

  /** El servidor decide según el estado; la casilla del rol oculta el botón a quien no tiene el permiso. */
  readonly puedeSeguirAcciones = this.auth.puede('inspecciones.acciones');
  readonly puedeEliminarBorrador = this.auth.puede('inspecciones.eliminar');

  a: Auditoria5sDetalle | null = null;
  cat: Catalogo5s | null = null;
  cargando = true;
  error = '';
  trabajando = false;
  generando = false;
  errorModal = '';
  seguimiento: AccionCorrectiva | null = null;
  segEstado = 'EN_PROCESO';
  segObs = '';
  segFotos: string[] = [];
  devolviendo: AccionCorrectiva | null = null;
  motivo = '';

  get fmt(): Formato5sCatalogo | null { return this.a ? this.cat?.formatos.find((f) => f.id === this.a!.formato) ?? null : null; }
  get maxCategoria(): number { return this.a?.resultado.porCategoria[0]?.maximo ?? 20; }
  etiqueta = (id: FormatoId) => FORMATOS_ETIQUETA[id].corto;

  get abiertas(): number { return this.a?.acciones.filter((x) => x.estado !== 'CERRADA').length ?? 0; }

  get grafica() {
    const r = this.a?.resultado.porCategoria ?? [];
    return {
      labels: r.map((c) => c.nombre),
      datasets: [{
        label: 'Puntos',
        data: r.map((c) => c.puntaje),
        backgroundColor: r.map((c) => SEMAFORO[c.puntaje / c.maximo >= 0.9 ? 'VERDE' : c.puntaje / c.maximo >= 0.75 ? 'AMARILLO' : 'ROJO'].hex),
        borderRadius: 8,
      }],
    };
  }

  get opcionesGrafica() { return { scales: { y: { min: 0, max: this.maxCategoria, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } }; }

  async ngOnInit(): Promise<void> {
    try {
      const [a, cat] = await Promise.all([
        firstValueFrom(this.api.getDetalle(this.route.snapshot.paramMap.get('id') ?? '')),
        firstValueFrom(this.api.getCatalogo()),
      ]);
      this.a = a;
      this.cat = cat;
    } catch (e) {
      this.error = mensajeError(e, 'No se pudo cargar la auditoría.');
    } finally {
      this.cargando = false;
    }
  }

  criteriosDe = (cat: string) => this.a!.criterios.filter((c) => c.categoria === cat);
  puntajeDe = (cat: string) => this.a!.resultado.porCategoria.find((c) => c.categoria === cat)?.puntaje ?? 0;
  nombreEstado = (id: string) => ESTADOS_AUDITORIA_5S.find((e) => e.id === id)?.nombre ?? id;
  claseEstado = (id: string) => ESTADOS_AUDITORIA_5S.find((e) => e.id === id)?.clase ?? '';
  nombreAccion = (id: string) => ESTADOS_ACCION.find((e) => e.id === id)?.nombre ?? id;
  claseAccion = (id: string) => ESTADOS_ACCION.find((e) => e.id === id)?.clase ?? '';
  nombreSemaforo = (s: 'VERDE' | 'AMARILLO' | 'ROJO') => SEMAFORO[s].nombre.toUpperCase();
  clasePrioridad = (p: string) => ({ BAJA: 'badge-neutral', MEDIA: 'badge-info', ALTA: 'badge-high', CRITICA: 'badge-critical' } as Record<string, string>)[p] ?? 'badge-neutral';

  private async correr(accion: () => import('rxjs').Observable<Auditoria5sDetalle>, mensaje: string): Promise<boolean> {
    this.trabajando = true;
    this.errorModal = '';
    try {
      this.a = await firstValueFrom(accion());
      this.toast.success('Auditoría actualizada', mensaje);
      return true;
    } catch (e) {
      this.errorModal = mensajeError(e);
      this.toast.error('No se pudo completar la acción', this.errorModal);
      return false;
    } finally {
      this.trabajando = false;
    }
  }

  cerrar(): Promise<boolean> { return this.correr(() => this.api.cerrar(this.a!.id), 'Auditoría cerrada.'); }

  async eliminar(): Promise<void> {
    if (!window.confirm(`¿Eliminar el borrador ${this.a!.codigo}?`)) return;
    try {
      await firstValueFrom(this.api.eliminar(this.a!.id));
      window.history.back();
    } catch (e) {
      this.toast.error('No se pudo eliminar', mensajeError(e));
    }
  }

  abrirSeguimiento(x: AccionCorrectiva): void {
    this.seguimiento = x;
    this.segEstado = x.estado === 'PENDIENTE' ? 'EN_PROCESO' : x.estado;
    this.segObs = x.observaciones;
    this.segFotos = [...x.evidenciaCorreccion];
    this.errorModal = '';
  }

  async guardarSeguimiento(): Promise<void> {
    if (!this.seguimiento) return;
    const id = this.seguimiento.id;
    if (await this.correr(() => this.api.seguimientoAccion(id, this.segEstado, this.segObs, this.segFotos), 'Seguimiento guardado.')) this.seguimiento = null;
  }

  async verificar(x: AccionCorrectiva, decision: 'CERRAR' | 'DEVOLVER'): Promise<void> {
    await this.correr(() => this.api.verificarAccion(x.id, decision, this.motivo), decision === 'CERRAR' ? 'Corrección verificada: acción cerrada.' : 'Acción devuelta a proceso.');
  }

  abrirDevolver(x: AccionCorrectiva): void { this.devolviendo = x; this.motivo = ''; this.errorModal = ''; }

  async devolver(): Promise<void> {
    if (!this.devolviendo) return;
    if (!this.motivo.trim()) { this.errorModal = 'Indica el motivo.'; return; }
    if (await this.correr(() => this.api.verificarAccion(this.devolviendo!.id, 'DEVOLVER', this.motivo.trim()), 'Acción devuelta a proceso.')) this.devolviendo = null;
  }

  async pdf(): Promise<void> {
    this.generando = true;
    try {
      await descargarPdf5s(this.a!, this.fmt!, this.storage);
    } catch (e) {
      this.toast.error('No se pudo generar el PDF', mensajeError(e));
    } finally {
      this.generando = false;
    }
  }

  excel(): void {
    try {
      descargarExcel5s(this.a!, this.fmt!);
    } catch (e) {
      this.toast.error('No se pudo generar el Excel', mensajeError(e));
    }
  }
}

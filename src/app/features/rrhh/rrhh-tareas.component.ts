import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { RrhhAdjuntosComponent } from './rrhh-adjuntos.component';
import { RrhhMockService } from './rrhh-mock.service';
import { AdjuntoMock, EstadoTarea, TareaMock, estaVencida } from './rrhh.modelos';

type FiltroEstado = '' | EstadoTarea | 'VENCIDA';

const ESTADOS: { id: EstadoTarea; nombre: string; clase: string }[] = [
  { id: 'PENDIENTE', nombre: 'Pendiente', clase: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'COMPLETADA', nombre: 'Completada', clase: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'REVISADA', nombre: 'Revisada', clase: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'CANCELADA', nombre: 'Cancelada', clase: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const ETIQUETA_EVENTO: Record<string, string> = {
  ASIGNADA: 'Asignada',
  COMPLETADA: 'Completada',
  REVISADA: 'Revisada',
  DEVUELTA: 'Devuelta a pendiente',
  CANCELADA: 'Cancelada',
};

/**
 * RRHH · Tareas (PROTOTIPO con datos de ejemplo en memoria). El Super Admin asigna tareas a los operadores, la completa «como el operador»
 * para ver el flujo, y la revisa o la devuelve. Las notificaciones del módulo salen en su propia lista, sin tocar la campana real.
 */
@Component({
  selector: 'app-rrhh-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, ModalComponent, RrhhAdjuntosComponent],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold mb-2">
            <i-lucide name="users" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide><span>RRHH · Prototipo</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Tareas del personal</h1>
          <p class="text-slate-500 text-xs mt-1 max-w-2xl">Asigna tareas a los operadores con título, descripción y archivos. El operador la completa con evidencias y una respuesta, y quien la asignó la revisa.</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button type="button" class="btn btn-secondary" (click)="restablecer()" title="Borra lo guardado en el navegador y vuelve a los datos de ejemplo">
            <i-lucide name="rotate-ccw" class="w-4 h-4" aria-hidden="true"></i-lucide> Restablecer datos de ejemplo
          </button>
          <button type="button" class="btn btn-cta" (click)="abrirNueva()">
            <i-lucide name="plus" class="w-4 h-4" aria-hidden="true"></i-lucide> Nueva tarea
          </button>
        </div>
      </div>

      <div class="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-semibold text-violet-900" role="note">
        Prototipo: los datos son de ejemplo y no se guarda nada en el servidor. Las tareas que nacen de un informe se conservan en este navegador al recargar (sin la vista previa de sus archivos); las demás se reinician.
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        @for (c of tarjetas; track c.titulo) {
          <button type="button" class="text-left bg-white rounded-2xl border p-4 shadow-easydry transition-colors hover:border-slate-300" [ngClass]="filtroEstado === c.filtro ? 'border-easydry-blue ring-1 ring-easydry-blue' : 'border-slate-100'" (click)="filtroEstado = filtroEstado === c.filtro ? '' : c.filtro" [attr.aria-pressed]="filtroEstado === c.filtro">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">{{ c.titulo }}</p>
            <p class="text-2xl font-extrabold font-outfit" [ngClass]="c.color">{{ c.valor }}</p>
            <p class="text-[11px] text-slate-500">{{ c.nota }}</p>
          </button>
        }
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section class="xl:col-span-2 space-y-3" aria-label="Lista de tareas">
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="field-label" for="rr-buscar">Buscar</label>
              <input id="rr-buscar" class="field" [(ngModel)]="busqueda" placeholder="Título o descripción…" autocomplete="off">
            </div>
            <div>
              <label class="field-label" for="rr-op">Operador</label>
              <select id="rr-op" class="field" [(ngModel)]="filtroOperador">
                <option value="">Todos</option>
                @for (o of mock.operadores; track o.id) { <option [value]="o.id">{{ o.nombre }}</option> }
              </select>
            </div>
            <div>
              <label class="field-label" for="rr-est">Estado</label>
              <select id="rr-est" class="field" [(ngModel)]="filtroEstado">
                <option value="">Todos</option>
                @for (e of estados; track e.id) { <option [value]="e.id">{{ e.nombre }}</option> }
                <option value="VENCIDA">Vencida</option>
              </select>
            </div>
          </div>

          @for (t of filtradas; track t.id) {
            <article class="bg-white rounded-2xl border shadow-easydry p-4 space-y-2" [ngClass]="vencida(t) ? 'border-rose-300' : 'border-slate-100'">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <h2 class="font-extrabold text-slate-900">{{ t.titulo }}</h2>
                  <p class="text-xs text-slate-500">Para <strong class="text-slate-700">{{ mock.nombreOperador(t.operadorId) }}</strong> · {{ mock.agenciaDe(t.operadorId)?.nombre }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="badge border" [ngClass]="claseEstado(t.estado)">{{ nombreEstado(t.estado) }}</span>
                  @if (vencida(t)) { <span class="badge badge-critical">Vencida</span> }
                </div>
              </div>
              @if (t.origen) {
                <p class="text-xs"><span class="badge bg-violet-100 text-violet-800">Desde un informe</span> <a [routerLink]="['/informes-inspeccion', t.origen.informeId]" class="font-bold text-easydry-blue hover:underline">{{ t.origen.informeNumero }}</a> <span class="text-slate-500">· novedad «{{ t.origen.novedadTitulo }}»</span></p>
              }
              <p class="text-sm text-slate-600 line-clamp-2">{{ t.descripcion }}</p>
              <p class="text-[11px] text-slate-500">
                Asignada {{ t.asignadaEn | date:'dd/MM/yyyy HH:mm' }}
                @if (t.fechaLimite) { · Límite {{ t.fechaLimite | date:'dd/MM/yyyy' }} }
                @if (t.adjuntos.length) { · {{ t.adjuntos.length }} adjunto(s) }
              </p>
              <div class="flex flex-wrap gap-2 pt-1">
                <button type="button" class="btn btn-secondary btn-sm" (click)="verDetalle(t)"><i-lucide name="eye" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Ver detalle</button>
                @if (t.estado === 'PENDIENTE') {
                  <button type="button" class="btn btn-primary btn-sm" (click)="abrirCompletar(t)"><i-lucide name="check-circle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Completar como operador</button>
                }
                @if (t.estado === 'COMPLETADA') {
                  <button type="button" class="btn btn-primary btn-sm" (click)="aprobar(t)"><i-lucide name="check-check" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Aprobar</button>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="abrirDevolver(t)"><i-lucide name="rotate-ccw" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Devolver</button>
                }
              </div>
            </article>
          } @empty {
            <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No hay tareas con esos filtros.</div>
          }
        </section>

        <aside class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-4 space-y-3 h-fit" aria-label="Notificaciones del módulo">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-extrabold text-slate-900 inline-flex items-center gap-2"><i-lucide name="bell" class="w-4 h-4" aria-hidden="true"></i-lucide> Notificaciones
              @if (mock.avisosSinLeer) { <span class="badge badge-critical">{{ mock.avisosSinLeer }}</span> }
            </h2>
            @if (mock.avisosSinLeer) { <button type="button" class="text-xs font-bold text-easydry-blue hover:underline" (click)="mock.marcarAvisosLeidos()">Marcar leídas</button> }
          </div>
          <p class="text-[11px] text-slate-500">Así llegarían los avisos del módulo. Cada uno dice a quién le saltaría.</p>
          <ul class="space-y-2 max-h-[28rem] overflow-y-auto">
            @for (a of mock.avisos; track a.id) {
              <li class="rounded-xl border p-2.5 text-xs" [ngClass]="a.leida ? 'border-slate-100 bg-white' : 'border-sky-200 bg-sky-50'">
                <p class="font-bold text-slate-800">{{ a.titulo }}</p>
                <p class="text-slate-600">{{ a.mensaje }}</p>
                <p class="text-[10px] text-slate-500 mt-1">Para: {{ a.destinatario }} · {{ a.fecha | date:'dd/MM HH:mm' }}@if (a.enlace) { · <a [routerLink]="a.enlace" class="font-bold text-easydry-blue hover:underline">Ver informe</a> }</p>
              </li>
            } @empty {
              <li class="text-xs text-slate-500">Sin notificaciones.</li>
            }
          </ul>
        </aside>
      </div>

      <!-- Nueva tarea -->
      <app-modal [isOpen]="nueva.abierta" title="Nueva tarea" icon="clipboard-list" size="lg" (close)="nueva.abierta = false">
        <form class="space-y-4" (ngSubmit)="crear()" autocomplete="off">
          <div>
            <label class="field-label" for="nt-op">Asignar a *</label>
            <select id="nt-op" name="op" class="field" [(ngModel)]="nueva.operadorId">
              <option value="">Selecciona un operador…</option>
              @for (o of mock.operadores; track o.id) { <option [value]="o.id">{{ o.nombre }} · {{ o.cargo }} · {{ mock.agencia(o.agenciaId)?.nombre }}</option> }
            </select>
          </div>
          <div>
            <label class="field-label" for="nt-tit">Título *</label>
            <input id="nt-tit" name="titulo" class="field" [(ngModel)]="nueva.titulo" maxlength="120" placeholder="Qué hay que hacer">
          </div>
          <div>
            <label class="field-label" for="nt-desc">Descripción *</label>
            <textarea id="nt-desc" name="descripcion" class="field" rows="4" [(ngModel)]="nueva.descripcion" maxlength="1000" placeholder="Detalle de la tarea"></textarea>
          </div>
          <div>
            <label class="field-label" for="nt-lim">Fecha límite (opcional)</label>
            <input id="nt-lim" name="limite" type="date" class="field max-w-xs" [(ngModel)]="nueva.fechaLimite" [min]="mock.hoy()">
          </div>
          <div>
            <p class="field-label">Archivos de apoyo (opcional)</p>
            <app-rrhh-adjuntos [adjuntos]="nueva.adjuntos" (adjuntosChange)="nueva.adjuntos = $event" etiqueta="Adjuntar archivos a la tarea"></app-rrhh-adjuntos>
          </div>
          @if (errorNueva) { <p class="text-sm font-semibold text-rose-700" role="alert">{{ errorNueva }}</p> }
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" class="btn btn-secondary" (click)="nueva.abierta = false">Cancelar</button>
            <button type="submit" class="btn btn-cta">Asignar tarea</button>
          </div>
        </form>
      </app-modal>

      <!-- Completar como el operador -->
      <app-modal [isOpen]="!!completando" [title]="'Completar · ' + (completando?.titulo ?? '')" icon="check-circle" size="lg" (close)="completando = null">
        @if (completando) {
          <form class="space-y-4" (ngSubmit)="completar()" autocomplete="off">
            <p class="text-xs text-slate-600">Estás completando la tarea en nombre de <strong>{{ mock.nombreOperador(completando.operadorId) }}</strong>.</p>
            @if (completando.motivoDevolucion) {
              <p class="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">Fue devuelta: {{ completando.motivoDevolucion }}</p>
            }
            <div>
              <label class="field-label" for="co-resp">Respuesta *</label>
              <textarea id="co-resp" name="respuesta" class="field" rows="4" [(ngModel)]="completar_.respuesta" maxlength="1000" placeholder="Qué hiciste y cómo quedó"></textarea>
            </div>
            <div>
              <p class="field-label">Evidencias (imágenes, videos o documentos) *</p>
              <app-rrhh-adjuntos [adjuntos]="completar_.evidencias" (adjuntosChange)="completar_.evidencias = $event" etiqueta="Adjuntar evidencias"></app-rrhh-adjuntos>
            </div>
            @if (errorCompletar) { <p class="text-sm font-semibold text-rose-700" role="alert">{{ errorCompletar }}</p> }
            <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" class="btn btn-secondary" (click)="completando = null">Cancelar</button>
              <button type="submit" class="btn btn-cta">Enviar como completada</button>
            </div>
          </form>
        }
      </app-modal>

      <!-- Devolver -->
      <app-modal [isOpen]="!!devolviendo" title="Devolver tarea" icon="rotate-ccw" size="md" (close)="devolviendo = null">
        <form class="space-y-4" (ngSubmit)="devolver()" autocomplete="off">
          <p class="text-xs text-slate-600">La tarea vuelve a <strong>Pendiente</strong> y el operador debe completarla de nuevo.</p>
          <div>
            <label class="field-label" for="dv-mot">Motivo *</label>
            <textarea id="dv-mot" name="motivo" class="field" rows="3" [(ngModel)]="motivoDevolver" maxlength="300" placeholder="Qué falta o qué corregir"></textarea>
          </div>
          @if (errorDevolver) { <p class="text-sm font-semibold text-rose-700" role="alert">{{ errorDevolver }}</p> }
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" class="btn btn-secondary" (click)="devolviendo = null">Cancelar</button>
            <button type="submit" class="btn btn-cta">Devolver</button>
          </div>
        </form>
      </app-modal>

      <!-- Cancelar -->
      <app-modal [isOpen]="!!cancelando" title="Cancelar tarea" icon="ban" size="md" (close)="cancelando = null">
        <form class="space-y-4" (ngSubmit)="cancelar()" autocomplete="off">
          <div>
            <label class="field-label" for="ca-mot">Motivo (opcional)</label>
            <textarea id="ca-mot" name="motivoCancelar" class="field" rows="3" [(ngModel)]="motivoCancelar" maxlength="300"></textarea>
          </div>
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" class="btn btn-secondary" (click)="cancelando = null">Volver</button>
            <button type="submit" class="btn btn-danger">Cancelar tarea</button>
          </div>
        </form>
      </app-modal>

      <!-- Detalle -->
      <app-modal [isOpen]="!!detalle" [title]="detalle?.titulo ?? ''" icon="clipboard-list" size="xl" (close)="detalle = null">
        @if (detalle) {
          <div class="space-y-5 text-sm">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge border" [ngClass]="claseEstado(detalle.estado)">{{ nombreEstado(detalle.estado) }}</span>
              @if (vencida(detalle)) { <span class="badge badge-critical">Vencida</span> }
              <span class="text-xs text-slate-500">Para {{ mock.nombreOperador(detalle.operadorId) }} · {{ mock.agenciaDe(detalle.operadorId)?.nombre }}</span>
            </div>
            @if (detalle.origen) {
              <p class="rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-xs text-violet-900">Nació de la novedad «{{ detalle.origen.novedadTitulo }}» del informe <a [routerLink]="['/informes-inspeccion', detalle.origen.informeId]" class="font-bold underline" (click)="detalle = null">{{ detalle.origen.informeNumero }}</a>. Los archivos de las tareas guardadas en el navegador solo conservan su nombre al recargar.</p>
            }
            <p class="whitespace-pre-line text-slate-700">{{ detalle.descripcion }}</p>

            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Asignada</dt><dd class="font-semibold">{{ detalle.asignadaEn | date:'dd/MM/yyyy HH:mm' }}</dd></div>
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Completada</dt><dd class="font-semibold">{{ detalle.completadaEn ? (detalle.completadaEn | date:'dd/MM/yyyy HH:mm') : '—' }}</dd></div>
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Revisada</dt><dd class="font-semibold">{{ detalle.revisadaEn ? (detalle.revisadaEn | date:'dd/MM/yyyy HH:mm') : '—' }}</dd></div>
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Cancelada</dt><dd class="font-semibold">{{ detalle.canceladaEn ? (detalle.canceladaEn | date:'dd/MM/yyyy HH:mm') : '—' }}</dd></div>
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Fecha límite</dt><dd class="font-semibold">{{ detalle.fechaLimite ? (detalle.fechaLimite | date:'dd/MM/yyyy') : 'Sin fecha límite' }}</dd></div>
            </dl>

            <section class="space-y-2"><h3 class="font-extrabold text-slate-900">Archivos de la tarea</h3><app-rrhh-adjuntos [adjuntos]="detalle.adjuntos" [editable]="false"></app-rrhh-adjuntos></section>

            @if (detalle.respuesta || detalle.evidencias.length) {
              <section class="space-y-2">
                <h3 class="font-extrabold text-slate-900">Respuesta del operador</h3>
                <p class="whitespace-pre-line text-slate-700">{{ detalle.respuesta || '—' }}</p>
                <app-rrhh-adjuntos [adjuntos]="detalle.evidencias" [editable]="false"></app-rrhh-adjuntos>
              </section>
            }
            @if (detalle.motivoCancelacion) { <p class="text-xs text-slate-600"><strong>Motivo de la cancelación:</strong> {{ detalle.motivoCancelacion }}</p> }

            <section class="space-y-2">
              <h3 class="font-extrabold text-slate-900">Historial</h3>
              <ol class="relative border-l-2 border-slate-200 ml-2 space-y-3">
                @for (h of detalle.historial; track $index) {
                  <li class="ml-4">
                    <span class="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-easydry-blue border-2 border-white" aria-hidden="true"></span>
                    <p class="text-sm font-bold text-slate-900">{{ etiquetaEvento(h.accion) }} <span class="text-xs font-semibold text-slate-500">· {{ h.fecha | date:'dd/MM/yyyy HH:mm' }}</span></p>
                    @if (h.detalle) { <p class="text-xs text-slate-600">{{ h.detalle }}</p> }
                  </li>
                }
              </ol>
            </section>

            <div class="flex flex-wrap gap-2 justify-end">
              @if (detalle.estado === 'PENDIENTE') {
                <button type="button" class="btn btn-danger btn-sm" (click)="abrirCancelar(detalle)"><i-lucide name="ban" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Cancelar tarea</button>
              }
            </div>
          </div>
        }
      </app-modal>
    </div>
  `,
})
export class RrhhTareasComponent {
  readonly mock = inject(RrhhMockService);
  private readonly toast = inject(ToastService);

  readonly estados = ESTADOS;
  busqueda = '';
  filtroOperador = '';
  filtroEstado: FiltroEstado = '';

  nueva = { abierta: false, operadorId: '', titulo: '', descripcion: '', fechaLimite: '', adjuntos: [] as AdjuntoMock[] };
  errorNueva = '';
  completando: TareaMock | null = null;
  completar_ = { respuesta: '', evidencias: [] as AdjuntoMock[] };
  errorCompletar = '';
  devolviendo: TareaMock | null = null;
  motivoDevolver = '';
  errorDevolver = '';
  cancelando: TareaMock | null = null;
  motivoCancelar = '';
  detalle: TareaMock | null = null;

  get tarjetas() {
    const t = this.mock.tareas;
    const hoy = this.mock.hoy();
    const cuenta = (f: (x: TareaMock) => boolean) => t.filter(f).length;
    return [
      { titulo: 'Pendientes', filtro: 'PENDIENTE' as FiltroEstado, valor: cuenta((x) => x.estado === 'PENDIENTE'), nota: 'Esperan al operador', color: 'text-amber-600' },
      { titulo: 'Vencidas', filtro: 'VENCIDA' as FiltroEstado, valor: cuenta((x) => estaVencida(x, hoy)), nota: 'Pasó la fecha límite', color: 'text-rose-600' },
      { titulo: 'Por revisar', filtro: 'COMPLETADA' as FiltroEstado, valor: cuenta((x) => x.estado === 'COMPLETADA'), nota: 'Completadas sin revisar', color: 'text-sky-600' },
      { titulo: 'Revisadas', filtro: 'REVISADA' as FiltroEstado, valor: cuenta((x) => x.estado === 'REVISADA'), nota: 'Cerradas', color: 'text-emerald-600' },
    ];
  }

  get filtradas(): TareaMock[] {
    const q = this.busqueda.trim().toLowerCase();
    const hoy = this.mock.hoy();
    return this.mock.tareas.filter((t) =>
      (!q || t.titulo.toLowerCase().includes(q) || t.descripcion.toLowerCase().includes(q)) &&
      (!this.filtroOperador || t.operadorId === this.filtroOperador) &&
      (!this.filtroEstado || (this.filtroEstado === 'VENCIDA' ? estaVencida(t, hoy) : t.estado === this.filtroEstado)),
    );
  }

  vencida(t: TareaMock): boolean { return estaVencida(t, this.mock.hoy()); }
  nombreEstado(e: EstadoTarea): string { return ESTADOS.find((x) => x.id === e)?.nombre ?? e; }
  claseEstado(e: EstadoTarea): string { return ESTADOS.find((x) => x.id === e)?.clase ?? ''; }
  etiquetaEvento(a: string): string { return ETIQUETA_EVENTO[a] ?? a; }

  verDetalle(t: TareaMock): void { this.detalle = t; }

  restablecer(): void {
    this.mock.restablecer();
    this.filtroEstado = '';
    this.filtroOperador = '';
    this.busqueda = '';
    this.toast.info('Datos restablecidos', 'Volvieron los datos de ejemplo y se borró lo guardado en este navegador.');
  }

  abrirNueva(): void {
    this.nueva = { abierta: true, operadorId: '', titulo: '', descripcion: '', fechaLimite: '', adjuntos: [] };
    this.errorNueva = '';
  }

  crear(): void {
    const n = this.nueva;
    if (!n.operadorId) { this.errorNueva = 'Elige a quién se asigna la tarea.'; return; }
    if (!n.titulo.trim()) { this.errorNueva = 'Escribe el título de la tarea.'; return; }
    if (!n.descripcion.trim()) { this.errorNueva = 'Escribe la descripción de la tarea.'; return; }
    const t = this.mock.crearTarea({ titulo: n.titulo, descripcion: n.descripcion, operadorId: n.operadorId, fechaLimite: n.fechaLimite || null, adjuntos: n.adjuntos });
    this.nueva.abierta = false;
    this.toast.success('Tarea asignada', `${this.mock.nombreOperador(t.operadorId)} la verá como pendiente.`);
  }

  abrirCompletar(t: TareaMock): void {
    this.completando = t;
    this.completar_ = { respuesta: '', evidencias: [] };
    this.errorCompletar = '';
  }

  completar(): void {
    const t = this.completando;
    if (!t) return;
    if (!this.completar_.respuesta.trim()) { this.errorCompletar = 'Escribe tu respuesta.'; return; }
    if (!this.completar_.evidencias.length) { this.errorCompletar = 'Adjunta al menos una imagen, video o documento como evidencia.'; return; }
    this.mock.completarTarea(t.id, this.completar_.respuesta, this.completar_.evidencias);
    this.completando = null;
    this.toast.success('Tarea completada', 'Quien la asignó recibe el aviso para revisarla.');
  }

  aprobar(t: TareaMock): void {
    this.mock.aprobarTarea(t.id);
    this.toast.success('Tarea revisada', `«${t.titulo}» quedó como revisada.`);
  }

  abrirDevolver(t: TareaMock): void { this.devolviendo = t; this.motivoDevolver = ''; this.errorDevolver = ''; }

  devolver(): void {
    const t = this.devolviendo;
    if (!t) return;
    if (!this.motivoDevolver.trim()) { this.errorDevolver = 'Escribe el motivo para devolverla.'; return; }
    this.mock.devolverTarea(t.id, this.motivoDevolver);
    this.devolviendo = null;
    this.toast.info('Tarea devuelta', `${this.mock.nombreOperador(t.operadorId)} debe completarla de nuevo.`);
  }

  abrirCancelar(t: TareaMock): void { this.cancelando = t; this.motivoCancelar = ''; }

  cancelar(): void {
    const t = this.cancelando;
    if (!t) return;
    this.mock.cancelarTarea(t.id, this.motivoCancelar);
    this.cancelando = null;
    this.detalle = null;
    this.toast.info('Tarea cancelada', `«${t.titulo}» se canceló.`);
  }
}

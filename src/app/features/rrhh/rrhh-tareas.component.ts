import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { AuthService } from '../../core/services/auth.service';
import { EstadoTarea, PersonaAsignable, RrhhService, TareaApi } from '../../core/services/rrhh.service';
import { AdjuntoElegido, RrhhAdjuntosComponent } from './rrhh-adjuntos.component';
import { ESTADOS_TAREA, ETIQUETA_EVENTO, MAX_ADJUNTOS, ZONA_ECUADOR } from './rrhh.modelos';

type Pestana = 'mias' | 'asignadas';
type FiltroEstado = '' | EstadoTarea | 'VENCIDA' | 'SIN_RESPONSABLE';

const mensajeDe = (e: unknown, defecto: string): string => {
  const m = (e as { error?: { message?: string | string[] } } | null)?.error?.message;
  return Array.isArray(m) ? m.join(', ') : m ? String(m) : defecto;
};

/**
 * RRHH · Tareas del personal. «Mis tareas» (quien las recibe): ve las suyas y las completa con una respuesta y evidencias.
 * «Tareas asignadas» (quien asigna): asigna a personas de su alcance, y revisa, devuelve, cancela o reasigna las que asignó.
 * Los avisos llegan por la campana del encabezado.
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
            <i-lucide name="users" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide><span>RRHH</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Tareas del personal</h1>
          <p class="text-slate-500 text-xs mt-1 max-w-2xl">
            @if (pestana === 'mias') { Las tareas que te asignaron. Complétalas con una respuesta y al menos una evidencia: quien te la asignó la revisa. }
            @else { Asigna tareas a las personas de tu alcance con título, descripción y archivos. Cuando las completan, tú las revisas. }
          </p>
        </div>
        @if (pestana === 'asignadas' && puede('rrhh.tareas.asignar')) {
          <button type="button" class="btn btn-cta w-full sm:w-auto" (click)="abrirNueva()">
            <i-lucide name="plus" class="w-4 h-4" aria-hidden="true"></i-lucide> Nueva tarea
          </button>
        }
      </div>

      @if (verMias && verAsignadas) {
        <div class="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Tareas">
          <button type="button" role="tab" [attr.aria-selected]="pestana === 'mias'" class="px-4 min-h-11 text-sm font-bold border-b-2 -mb-px transition-colors" [ngClass]="pestana === 'mias' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-800'" (click)="cambiarPestana('mias')">Mis tareas</button>
          <button type="button" role="tab" [attr.aria-selected]="pestana === 'asignadas'" class="px-4 min-h-11 text-sm font-bold border-b-2 -mb-px transition-colors" [ngClass]="pestana === 'asignadas' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-800'" (click)="cambiarPestana('asignadas')">Tareas asignadas</button>
        </div>
      }

      @if (pestana === 'asignadas' && sinResponsable.length) {
        <div class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 flex flex-wrap items-center justify-between gap-2" role="alert">
          <span>{{ sinResponsable.length }} tarea(s) pendiente(s) cuyo responsable ya no está activo. Reasígnalas para que no queden sin atender.</span>
          <button type="button" class="btn btn-secondary btn-sm" (click)="filtroEstado = 'SIN_RESPONSABLE'">Verlas</button>
        </div>
      }

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        @for (c of tarjetas; track c.titulo) {
          <button type="button" class="text-left bg-white rounded-2xl border p-4 shadow-easydry transition-colors hover:border-slate-300" [ngClass]="filtroEstado === c.filtro ? 'border-easydry-blue ring-1 ring-easydry-blue' : 'border-slate-100'" (click)="filtroEstado = filtroEstado === c.filtro ? '' : c.filtro" [attr.aria-pressed]="filtroEstado === c.filtro">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">{{ c.titulo }}</p>
            <p class="text-2xl font-extrabold font-outfit" [ngClass]="c.color">{{ c.valor }}</p>
            <p class="text-[11px] text-slate-500">{{ c.nota }}</p>
          </button>
        }
      </div>

      <section class="space-y-3" aria-label="Lista de tareas">
        <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="field-label" for="rr-buscar">Buscar</label>
            <input id="rr-buscar" class="field" [(ngModel)]="busqueda" placeholder="Título o descripción…" autocomplete="off">
          </div>
          @if (pestana === 'asignadas') {
            <div>
              <label class="field-label" for="rr-op">Responsable</label>
              <select id="rr-op" class="field" [(ngModel)]="filtroPersona">
                <option value="">Todos</option>
                @for (p of responsables; track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }
              </select>
            </div>
          }
          <div>
            <label class="field-label" for="rr-est">Estado</label>
            <select id="rr-est" class="field" [(ngModel)]="filtroEstado">
              <option value="">Todos</option>
              @for (e of estados; track e.id) { <option [value]="e.id">{{ e.nombre }}</option> }
              <option value="VENCIDA">Vencida</option>
              @if (pestana === 'asignadas') { <option value="SIN_RESPONSABLE">Sin responsable activo</option> }
            </select>
          </div>
        </div>

        @if (cargando) {
          <div class="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500">Cargando tareas…</div>
        }
        @for (t of filtradas; track t.id) {
          <article class="bg-white rounded-2xl border shadow-easydry p-4 space-y-2" [ngClass]="t.vencida ? 'border-rose-300' : 'border-slate-100'">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <h2 class="font-extrabold text-slate-900"><span class="text-slate-400 font-mono text-xs mr-1">{{ t.numero }}</span>{{ t.titulo }}</h2>
                <p class="text-xs text-slate-500">
                  @if (pestana === 'asignadas') { Para <strong class="text-slate-700">{{ t.asignadoA.nombre }}</strong>@if (t.asignadoA.agencia) { · {{ t.asignadoA.agencia }} } }
                  @else { Asignada por <strong class="text-slate-700">{{ t.asignadoPor.nombre }}</strong> }
                  @if (!t.asignadoA.activo) { <span class="badge badge-warn ml-1">Responsable inactivo</span> }
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="badge border" [ngClass]="claseEstado(t.estado)">{{ nombreEstado(t.estado) }}</span>
                @if (t.vencida) { <span class="badge badge-critical">Vencida</span> }
              </div>
            </div>
            @if (t.origen) {
              <p class="text-xs"><span class="badge bg-violet-100 text-violet-800">Desde un informe</span> @if (t.origen.numero) { <a [routerLink]="['/informes-inspeccion', t.origen.informeId]" class="font-bold text-easydry-blue hover:underline">{{ t.origen.numero }}</a> }</p>
            }
            <p class="text-sm text-slate-600 line-clamp-2">{{ t.descripcion }}</p>
            <p class="text-[11px] text-slate-500">
              Asignada {{ t.creadaEn | date:'dd/MM/yyyy HH:mm':zona }}
              @if (t.fechaLimite) { · Límite {{ t.fechaLimite | date:'dd/MM/yyyy':zona }} }
              @if (t.adjuntos.length) { · {{ t.adjuntos.length }} adjunto(s) }
            </p>
            <div class="flex flex-wrap gap-2 pt-1">
              <button type="button" class="btn btn-secondary btn-sm" (click)="verDetalle(t)"><i-lucide name="eye" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Ver detalle</button>
              @if (pestana === 'mias' && t.estado === 'PENDIENTE') {
                <button type="button" class="btn btn-primary btn-sm" (click)="abrirCompletar(t)"><i-lucide name="check-circle" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Completar</button>
              }
              @if (pestana === 'asignadas' && t.estado === 'COMPLETADA' && puedeGestionar(t)) {
                <button type="button" class="btn btn-primary btn-sm" (click)="aprobar(t)"><i-lucide name="check-check" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Aprobar</button>
                <button type="button" class="btn btn-secondary btn-sm" (click)="abrirDevolver(t)"><i-lucide name="rotate-ccw" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Devolver</button>
              }
              @if (pestana === 'asignadas' && t.estado === 'PENDIENTE' && puedeGestionar(t) && !t.asignadoA.activo) {
                <button type="button" class="btn btn-primary btn-sm" (click)="abrirReasignar(t)"><i-lucide name="user-cog" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Reasignar</button>
              }
            </div>
          </article>
        } @empty {
          @if (!cargando) {
            <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No hay tareas con esos filtros.</div>
          }
        }
      </section>

      <!-- Nueva tarea -->
      <app-modal [isOpen]="nueva.abierta" title="Nueva tarea" icon="clipboard-list" size="lg" (close)="nueva.abierta = false">
        <form class="space-y-4" (ngSubmit)="crear()" autocomplete="off">
          <div>
            <label class="field-label" for="nt-op">Asignar a *</label>
            <select id="nt-op" name="op" class="field" [(ngModel)]="nueva.asignadoAId">
              <option value="">Selecciona a una persona…</option>
              @for (p of personas; track p.id) { <option [value]="p.id">{{ p.nombre }} · {{ p.rol }}@if (p.agencia) { · {{ p.agencia }} }</option> }
            </select>
            @if (!personas.length) { <p class="text-[11px] text-amber-700 mt-1">No hay personas activas en tu alcance a las que se pueda asignar.</p> }
          </div>
          <div>
            <label class="field-label" for="nt-tit">Título *</label>
            <input id="nt-tit" name="titulo" class="field" [(ngModel)]="nueva.titulo" maxlength="150" placeholder="Qué hay que hacer">
          </div>
          <div>
            <label class="field-label" for="nt-desc">Descripción *</label>
            <textarea id="nt-desc" name="descripcion" class="field" rows="4" [(ngModel)]="nueva.descripcion" maxlength="2000" placeholder="Detalle de la tarea"></textarea>
          </div>
          <div>
            <label class="field-label" for="nt-lim">Fecha límite (opcional)</label>
            <input id="nt-lim" name="limite" type="date" class="field max-w-xs" [(ngModel)]="nueva.fechaLimite" [min]="hoy">
          </div>
          <div>
            <p class="field-label">Archivos de apoyo (opcional)</p>
            <app-rrhh-adjuntos [(elegidos)]="nueva.adjuntos" (ocupadoChange)="nueva.ocupado = $event" etiqueta="Adjuntar archivos a la tarea"></app-rrhh-adjuntos>
          </div>
          @if (errorNueva) { <p class="text-sm font-semibold text-rose-700" role="alert">{{ errorNueva }}</p> }
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" class="btn btn-secondary" (click)="nueva.abierta = false">Cancelar</button>
            <button type="submit" class="btn btn-cta" [disabled]="nueva.ocupado || enviando">{{ nueva.ocupado ? 'Subiendo archivos…' : enviando ? 'Asignando…' : 'Asignar tarea' }}</button>
          </div>
        </form>
      </app-modal>

      <!-- Completar -->
      <app-modal [isOpen]="!!completando" [title]="'Completar · ' + (completando?.titulo ?? '')" icon="check-circle" size="lg" (close)="completando = null">
        @if (completando) {
          <form class="space-y-4" (ngSubmit)="completar()" autocomplete="off">
            @if (devolucion(completando)) {
              <p class="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">Fue devuelta: {{ devolucion(completando) }}</p>
            }
            <div>
              <label class="field-label" for="co-resp">Respuesta *</label>
              <textarea id="co-resp" name="respuesta" class="field" rows="4" [(ngModel)]="respuesta.texto" maxlength="2000" placeholder="Qué hiciste y cómo quedó"></textarea>
            </div>
            <div>
              <p class="field-label">Evidencias (imágenes, videos o PDF) *</p>
              <app-rrhh-adjuntos [(elegidos)]="respuesta.evidencias" (ocupadoChange)="respuesta.ocupado = $event" etiqueta="Adjuntar evidencias"></app-rrhh-adjuntos>
            </div>
            @if (errorCompletar) { <p class="text-sm font-semibold text-rose-700" role="alert">{{ errorCompletar }}</p> }
            <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" class="btn btn-secondary" (click)="completando = null">Cancelar</button>
              <button type="submit" class="btn btn-cta" [disabled]="respuesta.ocupado || enviando">{{ respuesta.ocupado ? 'Subiendo archivos…' : enviando ? 'Enviando…' : 'Enviar como completada' }}</button>
            </div>
          </form>
        }
      </app-modal>

      <!-- Devolver -->
      <app-modal [isOpen]="!!devolviendo" title="Devolver tarea" icon="rotate-ccw" size="md" (close)="devolviendo = null">
        <form class="space-y-4" (ngSubmit)="devolver()" autocomplete="off">
          <p class="text-xs text-slate-600">La tarea vuelve a <strong>Pendiente</strong> y la persona debe completarla de nuevo.</p>
          <div>
            <label class="field-label" for="dv-mot">Motivo *</label>
            <textarea id="dv-mot" name="motivo" class="field" rows="3" [(ngModel)]="motivoDevolver" maxlength="500" placeholder="Qué falta o qué corregir"></textarea>
          </div>
          @if (errorDevolver) { <p class="text-sm font-semibold text-rose-700" role="alert">{{ errorDevolver }}</p> }
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" class="btn btn-secondary" (click)="devolviendo = null">Cancelar</button>
            <button type="submit" class="btn btn-cta" [disabled]="enviando">Devolver</button>
          </div>
        </form>
      </app-modal>

      <!-- Cancelar -->
      <app-modal [isOpen]="!!cancelando" title="Cancelar tarea" icon="ban" size="md" (close)="cancelando = null">
        <form class="space-y-4" (ngSubmit)="cancelar()" autocomplete="off">
          <div>
            <label class="field-label" for="ca-mot">Motivo (opcional)</label>
            <textarea id="ca-mot" name="motivoCancelar" class="field" rows="3" [(ngModel)]="motivoCancelar" maxlength="500"></textarea>
          </div>
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" class="btn btn-secondary" (click)="cancelando = null">Volver</button>
            <button type="submit" class="btn btn-danger" [disabled]="enviando">Cancelar tarea</button>
          </div>
        </form>
      </app-modal>

      <!-- Reasignar -->
      <app-modal [isOpen]="!!reasignando" title="Reasignar tarea" icon="user-cog" size="md" (close)="reasignando = null">
        <form class="space-y-4" (ngSubmit)="reasignar()" autocomplete="off">
          <p class="text-xs text-slate-600">«{{ reasignando?.titulo }}» pasa a otra persona y ambas reciben el aviso.</p>
          <div>
            <label class="field-label" for="re-op">Nuevo responsable *</label>
            <select id="re-op" name="nuevo" class="field" [(ngModel)]="nuevoResponsable">
              <option value="">Selecciona a una persona…</option>
              @for (p of personas; track p.id) { <option [value]="p.id">{{ p.nombre }} · {{ p.rol }}@if (p.agencia) { · {{ p.agencia }} }</option> }
            </select>
          </div>
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" class="btn btn-secondary" (click)="reasignando = null">Volver</button>
            <button type="submit" class="btn btn-cta" [disabled]="!nuevoResponsable || enviando">Reasignar</button>
          </div>
        </form>
      </app-modal>

      <!-- Detalle -->
      <app-modal [isOpen]="!!detalle" [title]="detalle?.titulo ?? ''" icon="clipboard-list" size="xl" (close)="detalle = null">
        @if (detalle) {
          <div class="space-y-5 text-sm">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge border" [ngClass]="claseEstado(detalle.estado)">{{ nombreEstado(detalle.estado) }}</span>
              @if (detalle.vencida) { <span class="badge badge-critical">Vencida</span> }
              <span class="text-xs text-slate-500">{{ detalle.numero }} · Para {{ detalle.asignadoA.nombre }}@if (detalle.asignadoA.agencia) { · {{ detalle.asignadoA.agencia }} } · Asignada por {{ detalle.asignadoPor.nombre }}</span>
            </div>
            @if (detalle.origen) {
              <p class="rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-xs text-violet-900">Nació de una novedad del informe @if (detalle.origen.numero) { <a [routerLink]="['/informes-inspeccion', detalle.origen.informeId]" class="font-bold underline" (click)="detalle = null">{{ detalle.origen.numero }}</a> }.</p>
            }
            <p class="whitespace-pre-line text-slate-700">{{ detalle.descripcion }}</p>

            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Asignada</dt><dd class="font-semibold">{{ detalle.creadaEn | date:'dd/MM/yyyy HH:mm':zona }}</dd></div>
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Completada</dt><dd class="font-semibold">{{ detalle.completadaEn ? (detalle.completadaEn | date:'dd/MM/yyyy HH:mm':zona) : '—' }}</dd></div>
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Revisada</dt><dd class="font-semibold">{{ detalle.revisadaEn ? (detalle.revisadaEn | date:'dd/MM/yyyy HH:mm':zona) : '—' }}</dd></div>
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Cancelada</dt><dd class="font-semibold">{{ detalle.canceladaEn ? (detalle.canceladaEn | date:'dd/MM/yyyy HH:mm':zona) : '—' }}</dd></div>
              <div><dt class="text-[11px] font-bold uppercase text-slate-500">Fecha límite</dt><dd class="font-semibold">{{ detalle.fechaLimite ? (detalle.fechaLimite | date:'dd/MM/yyyy':zona) : 'Sin fecha límite' }}</dd></div>
            </dl>

            <section class="space-y-2"><h3 class="font-extrabold text-slate-900">Archivos de la tarea</h3><app-rrhh-adjuntos [guardados]="adjuntosDe(detalle, 'ASIGNACION')" [editable]="false"></app-rrhh-adjuntos></section>

            @if (detalle.respuesta || adjuntosDe(detalle, 'RESPUESTA').length) {
              <section class="space-y-2">
                <h3 class="font-extrabold text-slate-900">Respuesta</h3>
                <p class="whitespace-pre-line text-slate-700">{{ detalle.respuesta || '—' }}</p>
                <app-rrhh-adjuntos [guardados]="adjuntosDe(detalle, 'RESPUESTA')" [editable]="false"></app-rrhh-adjuntos>
              </section>
            }
            @if (detalle.motivoCancelacion) { <p class="text-xs text-slate-600"><strong>Motivo de la cancelación:</strong> {{ detalle.motivoCancelacion }}</p> }

            <section class="space-y-2">
              <h3 class="font-extrabold text-slate-900">Historial</h3>
              <ol class="relative border-l-2 border-slate-200 ml-2 space-y-3">
                @for (h of detalle.historial; track h.id) {
                  <li class="ml-4">
                    <span class="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-easydry-blue border-2 border-white" aria-hidden="true"></span>
                    <p class="text-sm font-bold text-slate-900">{{ etiquetaEvento(h.accion) }} <span class="text-xs font-semibold text-slate-500">· {{ h.actor }} · {{ h.fecha | date:'dd/MM/yyyy HH:mm':zona }}</span></p>
                    @if (h.detalle) { <p class="text-xs text-slate-600">{{ h.detalle }}</p> }
                  </li>
                }
              </ol>
            </section>

            @if (pestana === 'asignadas' && detalle.estado === 'PENDIENTE' && puedeGestionar(detalle)) {
              <div class="flex flex-wrap gap-2 justify-end">
                <button type="button" class="btn btn-secondary btn-sm" (click)="abrirReasignar(detalle)"><i-lucide name="user-cog" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Reasignar</button>
                <button type="button" class="btn btn-danger btn-sm" (click)="abrirCancelar(detalle)"><i-lucide name="ban" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Cancelar tarea</button>
              </div>
            }
          </div>
        }
      </app-modal>
    </div>
  `,
})
export class RrhhTareasComponent implements OnInit {
  private readonly api = inject(RrhhService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly ruta = inject(ActivatedRoute);

  readonly estados = ESTADOS_TAREA;
  readonly zona = ZONA_ECUADOR;
  readonly hoy = new Date().toISOString().slice(0, 10);

  verMias = false;
  verAsignadas = false;
  pestana: Pestana = 'asignadas';
  cargando = false;
  enviando = false;

  mias: TareaApi[] = [];
  asignadas: TareaApi[] = [];
  sinResponsable: TareaApi[] = [];
  personas: PersonaAsignable[] = [];

  busqueda = '';
  filtroPersona = '';
  filtroEstado: FiltroEstado = '';

  nueva = { abierta: false, asignadoAId: '', titulo: '', descripcion: '', fechaLimite: '', adjuntos: [] as AdjuntoElegido[], ocupado: false };
  errorNueva = '';
  completando: TareaApi | null = null;
  respuesta = { texto: '', evidencias: [] as AdjuntoElegido[], ocupado: false };
  errorCompletar = '';
  devolviendo: TareaApi | null = null;
  motivoDevolver = '';
  errorDevolver = '';
  cancelando: TareaApi | null = null;
  motivoCancelar = '';
  reasignando: TareaApi | null = null;
  nuevoResponsable = '';
  detalle: TareaApi | null = null;

  puede(codigo: string): boolean { return this.auth.puede(codigo); }

  ngOnInit(): void {
    // Un administrador no recibe tareas: solo asigna y revisa.
    const esAdmin = this.puede('funcion.administrador');
    this.verMias = this.puede('rrhh.tareas.propias') && !esAdmin;
    this.verAsignadas = this.puede('rrhh.tareas.asignar');
    this.pestana = this.verMias ? 'mias' : 'asignadas';
    this.cargar();
    const id = this.ruta.snapshot.paramMap.get('tarea');
    if (id) this.abrirPorId(id);
  }

  private abrirPorId(id: string): void {
    this.api.detalleTarea(id).subscribe({
      next: (t) => {
        this.pestana = this.verMias && t.asignadoA.id === this.auth.currentUserValue?.id ? 'mias' : this.verAsignadas ? 'asignadas' : 'mias';
        this.detalle = t;
      },
      error: () => this.toast.warning('Tarea no disponible', 'No tienes acceso a esa tarea o ya no existe.'),
    });
  }

  cambiarPestana(p: Pestana): void {
    this.pestana = p;
    this.filtroEstado = '';
    this.filtroPersona = '';
  }

  cargar(): void {
    this.cargando = true;
    let pendientes = 0;
    const listo = () => { if (--pendientes <= 0) this.cargando = false; };
    if (this.verMias) { pendientes++; this.api.misTareas().subscribe({ next: (t) => { this.mias = t; listo(); }, error: listo }); }
    if (this.verAsignadas) {
      pendientes += 3;
      this.api.tareasAsignadas().subscribe({ next: (t) => { this.asignadas = t; listo(); }, error: listo });
      this.api.sinResponsable().subscribe({ next: (t) => { this.sinResponsable = t; listo(); }, error: listo });
      this.api.asignables().subscribe({ next: (p) => { this.personas = p; listo(); }, error: listo });
    }
    if (pendientes === 0) this.cargando = false;
  }

  private get lista(): TareaApi[] { return this.pestana === 'mias' ? this.mias : this.asignadas; }

  get responsables(): { id: string; nombre: string }[] {
    const mapa = new Map<string, string>();
    for (const t of this.asignadas) mapa.set(t.asignadoA.id, t.asignadoA.nombre);
    return [...mapa].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get tarjetas() {
    const t = this.lista;
    const cuenta = (f: (x: TareaApi) => boolean) => t.filter(f).length;
    const mias = this.pestana === 'mias';
    return [
      { titulo: 'Pendientes', filtro: 'PENDIENTE' as FiltroEstado, valor: cuenta((x) => x.estado === 'PENDIENTE'), nota: mias ? 'Por completar' : 'Esperan al responsable', color: 'text-amber-600' },
      { titulo: 'Vencidas', filtro: 'VENCIDA' as FiltroEstado, valor: cuenta((x) => x.vencida), nota: 'Pasó la fecha límite', color: 'text-rose-600' },
      { titulo: mias ? 'En revisión' : 'Por revisar', filtro: 'COMPLETADA' as FiltroEstado, valor: cuenta((x) => x.estado === 'COMPLETADA'), nota: mias ? 'Esperan a quien te la asignó' : 'Completadas sin revisar', color: 'text-sky-600' },
      { titulo: 'Revisadas', filtro: 'REVISADA' as FiltroEstado, valor: cuenta((x) => x.estado === 'REVISADA'), nota: 'Cerradas', color: 'text-emerald-600' },
    ];
  }

  get filtradas(): TareaApi[] {
    const q = this.busqueda.trim().toLowerCase();
    const sinResp = new Set(this.sinResponsable.map((t) => t.id));
    return this.lista.filter((t) =>
      (!q || t.titulo.toLowerCase().includes(q) || t.descripcion.toLowerCase().includes(q) || t.numero.toLowerCase().includes(q)) &&
      (!this.filtroPersona || t.asignadoA.id === this.filtroPersona) &&
      (!this.filtroEstado ||
        (this.filtroEstado === 'VENCIDA' ? t.vencida : this.filtroEstado === 'SIN_RESPONSABLE' ? sinResp.has(t.id) : t.estado === this.filtroEstado)),
    );
  }

  nombreEstado(e: EstadoTarea): string { return ESTADOS_TAREA.find((x) => x.id === e)?.nombre ?? e; }
  claseEstado(e: EstadoTarea): string { return ESTADOS_TAREA.find((x) => x.id === e)?.clase ?? ''; }
  etiquetaEvento(a: string): string { return ETIQUETA_EVENTO[a] ?? a; }
  adjuntosDe(t: TareaApi, etapa: 'ASIGNACION' | 'RESPUESTA') { return t.adjuntos.filter((a) => a.etapa === etapa); }

  /** Quien asignó la tarea o un administrador. */
  puedeGestionar(t: TareaApi): boolean {
    return t.asignadoPor.id === this.auth.currentUserValue?.id || this.puede('funcion.administrador');
  }

  /** Motivo de la última devolución, si la tarea fue devuelta. */
  devolucion(t: TareaApi): string {
    const h = [...t.historial].reverse().find((x) => x.accion === 'DEVUELTA' || x.accion === 'COMPLETADA');
    return h?.accion === 'DEVUELTA' ? (h.detalle ?? '') : '';
  }

  verDetalle(t: TareaApi): void {
    this.detalle = t;
    this.api.detalleTarea(t.id).subscribe({ next: (d) => { if (this.detalle?.id === d.id) this.detalle = d; } });
  }

  /** Reemplaza una tarea por su versión actualizada en las listas y recalcula las que quedaron sin responsable. */
  private actualizar(t: TareaApi): void {
    const cambiar = (l: TareaApi[]) => l.map((x) => (x.id === t.id ? t : x));
    this.mias = cambiar(this.mias);
    this.asignadas = cambiar(this.asignadas);
    if (this.detalle?.id === t.id) this.detalle = t;
    if (this.verAsignadas) this.api.sinResponsable().subscribe({ next: (l) => (this.sinResponsable = l) });
  }

  // ───────────────────────── Acciones ─────────────────────────

  abrirNueva(): void {
    this.nueva = { abierta: true, asignadoAId: '', titulo: '', descripcion: '', fechaLimite: '', adjuntos: [], ocupado: false };
    this.errorNueva = '';
  }

  crear(): void {
    const n = this.nueva;
    if (!n.asignadoAId) { this.errorNueva = 'Elige a quién se asigna la tarea.'; return; }
    if (!n.titulo.trim()) { this.errorNueva = 'Escribe el título de la tarea.'; return; }
    if (!n.descripcion.trim()) { this.errorNueva = 'Escribe la descripción de la tarea.'; return; }
    if (n.adjuntos.some((a) => a.error)) { this.errorNueva = 'Quita los archivos que no se pudieron subir.'; return; }
    this.enviando = true;
    this.api
      .crearTarea({
        titulo: n.titulo.trim(), descripcion: n.descripcion.trim(), asignadoAId: n.asignadoAId,
        fechaLimite: n.fechaLimite ? new Date(`${n.fechaLimite}T23:59:00-05:00`).toISOString() : undefined,
        adjuntos: n.adjuntos.filter((a) => a.remoto).slice(0, MAX_ADJUNTOS).map((a) => ({ url: a.remoto, nombre: a.nombre })),
      })
      .subscribe({
        next: (t) => {
          this.enviando = false;
          this.nueva.abierta = false;
          this.asignadas = [t, ...this.asignadas];
          this.toast.success('Tarea asignada', `${t.asignadoA.nombre} la verá como pendiente.`);
        },
        error: (e) => { this.enviando = false; this.errorNueva = mensajeDe(e, 'No se pudo asignar la tarea.'); },
      });
  }

  abrirCompletar(t: TareaApi): void {
    this.completando = t;
    this.respuesta = { texto: '', evidencias: [], ocupado: false };
    this.errorCompletar = '';
  }

  completar(): void {
    const t = this.completando;
    if (!t) return;
    if (!this.respuesta.texto.trim()) { this.errorCompletar = 'Escribe tu respuesta.'; return; }
    const archivos = this.respuesta.evidencias.filter((a) => a.remoto);
    if (!archivos.length) { this.errorCompletar = 'Adjunta al menos una imagen, video o PDF como evidencia.'; return; }
    this.enviando = true;
    this.api.completarTarea(t.id, this.respuesta.texto.trim(), archivos.map((a) => ({ url: a.remoto, nombre: a.nombre }))).subscribe({
      next: (r) => {
        this.enviando = false;
        this.completando = null;
        this.actualizar(r);
        this.toast.success('Tarea completada', 'Quien la asignó recibe el aviso para revisarla.');
      },
      error: (e) => { this.enviando = false; this.errorCompletar = mensajeDe(e, 'No se pudo completar la tarea.'); },
    });
  }

  aprobar(t: TareaApi): void {
    this.api.revisarTarea(t.id, 'APROBAR').subscribe({
      next: (r) => { this.actualizar(r); this.toast.success('Tarea revisada', `«${t.titulo}» quedó como revisada.`); },
    });
  }

  abrirDevolver(t: TareaApi): void { this.devolviendo = t; this.motivoDevolver = ''; this.errorDevolver = ''; }

  devolver(): void {
    const t = this.devolviendo;
    if (!t) return;
    if (!this.motivoDevolver.trim()) { this.errorDevolver = 'Escribe el motivo para devolverla.'; return; }
    this.enviando = true;
    this.api.revisarTarea(t.id, 'DEVOLVER', this.motivoDevolver.trim()).subscribe({
      next: (r) => { this.enviando = false; this.devolviendo = null; this.actualizar(r); this.toast.info('Tarea devuelta', `${r.asignadoA.nombre} debe completarla de nuevo.`); },
      error: (e) => { this.enviando = false; this.errorDevolver = mensajeDe(e, 'No se pudo devolver la tarea.'); },
    });
  }

  abrirCancelar(t: TareaApi): void { this.cancelando = t; this.motivoCancelar = ''; }

  cancelar(): void {
    const t = this.cancelando;
    if (!t) return;
    this.enviando = true;
    this.api.cancelarTarea(t.id, this.motivoCancelar.trim() || undefined).subscribe({
      next: (r) => { this.enviando = false; this.cancelando = null; this.detalle = null; this.actualizar(r); this.toast.info('Tarea cancelada', `«${t.titulo}» se canceló.`); },
      error: () => { this.enviando = false; },
    });
  }

  abrirReasignar(t: TareaApi): void { this.reasignando = t; this.nuevoResponsable = ''; }

  reasignar(): void {
    const t = this.reasignando;
    if (!t || !this.nuevoResponsable) return;
    this.enviando = true;
    this.api.reasignarTarea(t.id, this.nuevoResponsable).subscribe({
      next: (r) => { this.enviando = false; this.reasignando = null; this.actualizar(r); this.toast.success('Tarea reasignada', `Ahora es de ${r.asignadoA.nombre}.`); },
      error: () => { this.enviando = false; },
    });
  }
}

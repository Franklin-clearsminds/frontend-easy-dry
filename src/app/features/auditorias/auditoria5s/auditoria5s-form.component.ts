import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { Auditoria5sService } from '../../../core/services/auditoria5s.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmarService } from '../../../shared/services/confirmar.service';
import {
  Auditoria5sDetalle,
  Catalogo5s,
  FORMATOS_ETIQUETA,
  Formato5sCatalogo,
  FormatoId,
  GuardarAuditoria5s,
  OpcionAgencia,
  SEMAFORO,
  Semaforo,
  mensajeError,
  nombre5s,
} from '../../../core/models/auditorias.model';
import { EvidenciasFotosComponent } from '../shared/evidencias-fotos.component';
import { Semaforo5sComponent } from '../shared/semaforo-5s.component';

interface Respuesta {
  /** Lo guardado: el puntaje; en SI/NO, 1 = SI y 0 = NO. null = sin evaluar. */
  puntaje: number | null;
  hallazgo: string;
  observaciones: string;
  accionCorrectiva: string;
  fotos: string[];
  /** Panel de hallazgo desplegado. */
  abierto: boolean;
}

/**
 * Evaluación de una auditoría 5S. Al crear se elige uno, dos o los tres formatos: cada uno se guarda como una auditoría aparte con
 * los mismos datos de la visita, y aquí se pasa de uno a otro. El resultado se calcula en pantalla mientras se evalúa, pero el
 * definitivo (puntaje y semáforo) lo fija el servidor al guardar. Pensado para el celular: tarjetas grandes y botones táctiles.
 */
@Component({
  selector: 'app-auditoria5s-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, EvidenciasFotosComponent, Semaforo5sComponent],
  template: `
    <div class="space-y-5 animate-fade-in max-w-4xl mx-auto">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <a routerLink="/auditorias-5s" class="btn btn-ghost btn-sm"><i-lucide name="arrow-left" class="w-4 h-4" aria-hidden="true"></i-lucide> Auditorías 5S</a>
        <p class="font-mono font-extrabold text-easydry-blue">{{ detalle?.codigo || 'Nueva auditoría 5S' }}</p>
      </div>

      @if (cargando) {
        <div class="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500" role="status">Cargando…</div>
      } @else if (errorCarga) {
        <div class="estado-error" role="alert">{{ errorCarga }}</div>
      } @else if (cat) {
        <!-- Los formatos de esta visita -->
        @if (detalle && detalle.hermanas.length > 1) {
          <nav aria-label="Formatos de esta visita" class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-3">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Esta visita tiene {{ detalle.hermanas.length }} formatos: cada uno se guarda por separado</p>
            <div class="flex flex-wrap gap-2">
              @for (h of detalle.hermanas; track h.id) {
                <button type="button" (click)="irAHermana(h.id)" [attr.aria-current]="h.id === detalle.id ? 'page' : null"
                  class="px-3 min-h-10 rounded-xl border text-xs font-bold flex items-center gap-2"
                  [ngClass]="h.id === detalle.id ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'">
                  {{ etiqueta(h.formato).corto }}
                  <span class="text-[10px] font-extrabold uppercase opacity-80">{{ h.estado === 'GUARDADA' ? '✓ guardada' : 'borrador' }}</span>
                </button>
              }
            </div>
          </nav>
        }

        @if (fmt) {
          <!-- Progreso -->
          <nav aria-label="Secciones de la auditoría" class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-3 sm:p-4 sticky top-0 z-10">
            <div class="flex items-center justify-between mb-2 text-xs font-bold text-slate-700">
              <span>{{ evaluados }} de {{ fmt.categorias.length ? totalCriterios : 0 }} criterios evaluados · {{ etiqueta(fmt.id).corto }}</span>
              <span class="tabular-nums">{{ puntajeTotal }}/{{ fmt.puntajeMaximo }} · {{ porcentaje }}%</span>
            </div>
            <div class="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" [attr.aria-valuenow]="evaluados" aria-valuemin="0" [attr.aria-valuemax]="totalCriterios">
              <div class="h-full bg-easydry-blue transition-all" [style.width.%]="(evaluados / totalCriterios) * 100"></div>
            </div>
            <ol class="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              <li><button type="button" (click)="irA(0)" class="px-3 min-h-10 rounded-xl text-xs font-bold whitespace-nowrap border" [ngClass]="seccion === 0 ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-200'">Datos</button></li>
              @for (c of fmt.categorias; track c.id; let k = $index) {
                <li><button type="button" (click)="irA(k + 1)" [attr.aria-current]="seccion === k + 1 ? 'step' : null"
                  class="px-3 min-h-10 rounded-xl text-xs font-bold whitespace-nowrap border flex items-center gap-1.5"
                  [ngClass]="seccion === k + 1 ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-200'">
                  {{ nombreS(c) }} <span class="tabular-nums opacity-80">{{ evaluadosDe(c.id) }}/{{ c.criterios.length }}</span></button></li>
              }
              <li><button type="button" (click)="irA(6)" class="px-3 min-h-10 rounded-xl text-xs font-bold whitespace-nowrap border" [ngClass]="seccion === 6 ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-200'">Resumen</button></li>
            </ol>
          </nav>
        }

        @if (seccion === 0 || !fmt) {
          <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 sm:p-6 space-y-5">
            <h2 class="text-lg font-extrabold font-outfit text-slate-900">Datos de la visita</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="field-label" for="a-agencia">Agencia (empresa) *</label>
                <select id="a-agencia" class="field" [ngModel]="agenciaId" (ngModelChange)="elegirAgencia($event)" [disabled]="!editable">
                  <option value="">Selecciona la agencia…</option>
                  @for (a of agencias; track a.id) { <option [value]="a.id">{{ a.nombre }}</option> }
                </select>
              </div>
              <div><label class="field-label" for="a-fecha">Fecha</label><input id="a-fecha" type="date" class="field" [(ngModel)]="fecha" [disabled]="!editable"></div>
              <div><label class="field-label" for="a-auditor">Auditoría realizada por</label><input id="a-auditor" class="field" [value]="detalle?.auditorNombre || usuarioNombre" disabled></div>
              <div><label class="field-label" for="a-resp">Responsable de la agencia</label><input id="a-resp" class="field" [(ngModel)]="responsableAgencia" maxlength="160" [disabled]="!editable">@if (liderAuto && responsableAgencia === liderAuto) { <p class="text-[11px] font-semibold text-easydry-blue mt-1">Líder de la agencia, marcado automáticamente.</p> }</div>
              <div class="sm:col-span-2"><label class="field-label" for="a-com">Comentarios generales</label><textarea id="a-com" class="field" rows="3" [(ngModel)]="comentarios" [disabled]="!editable"></textarea></div>
            </div>

            @if (!detalle) {
              <fieldset class="space-y-2">
                <legend class="field-label">¿Qué formato(s) vas a realizar? *</legend>
                <p class="text-xs text-slate-500">Puedes elegir uno, dos o los tres. Se usan los mismos datos de la visita y cada formato se guarda por separado.</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  @for (f of cat.formatos; track f.id) {
                    <label class="rounded-xl border-2 p-4 cursor-pointer transition-colors flex gap-3 items-start" [ngClass]="elegido(f.id) ? 'border-easydry-blue bg-easydry-blue/5' : 'border-slate-200 hover:border-slate-300'">
                      <input type="checkbox" class="w-5 h-5 mt-0.5 accent-[#004282]" [checked]="elegido(f.id)" (change)="alternarFormato(f.id)">
                      <span>
                        <span class="block text-sm font-extrabold text-slate-900">{{ f.nombre }}</span>
                        <span class="block text-xs text-slate-600 mt-1">{{ f.descripcion }}</span>
                      </span>
                    </label>
                  }
                </div>
              </fieldset>
            } @else {
              <p class="text-xs text-slate-500">Formato: <strong>{{ detalle.formatoNombre }}</strong> · Estado: <strong>{{ detalle.estado.replace('_', ' ').toLowerCase() }}</strong>. Los datos de la visita se comparten con los otros formatos de esta visita.</p>
            }
          </section>
        }

        @if (fmt && seccion >= 1 && seccion <= 5) {
          @let categoria = fmt.categorias[seccion - 1];
          <section class="space-y-4">
            <div class="rounded-2xl bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
              <div><p class="text-[11px] font-bold uppercase tracking-wider text-slate-300">Sección {{ seccion }} de 5</p>
                <h2 class="text-xl font-extrabold font-outfit">{{ categoria.nombre.toUpperCase() }}{{ fmt.id === 'PUNTOS_25' ? ': ' + categoria.traduccion.toUpperCase() : ' = ' + categoria.traduccion.toUpperCase() }}</h2></div>
              <p class="text-2xl font-extrabold tabular-nums">{{ puntajeDe(categoria.id) }}<span class="text-sm font-bold text-slate-300">/{{ categoria.maximo }}</span></p>
            </div>
            @if (fmt.nota && seccion === 5) { <p class="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl p-3">* {{ fmt.nota }}</p> }

            @for (q of categoria.criterios; track q.numero) {
              @let r = resp[q.numero];
              <article class="bg-white rounded-2xl border shadow-easydry p-4 sm:p-5 space-y-3"
                [ngClass]="r.puntaje === null ? 'border-slate-200' : (cumple(q.numero) ? 'border-emerald-300' : 'border-amber-300')">
                <div class="flex items-start gap-3">
                  <span class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold"
                    [ngClass]="r.puntaje === null ? 'bg-slate-100 text-slate-600' : 'bg-easydry-blue text-white'">{{ q.numero }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-900 leading-snug">{{ q.descripcion }}</p>
                    <p class="text-[11px] font-bold mt-1" [ngClass]="r.puntaje === null ? 'text-slate-500' : (cumple(q.numero) ? 'text-emerald-700' : 'text-amber-700')">
                      @if (r.puntaje === null) { Pendiente de evaluar }
                      @else if (fmt.tipo === 'SI_NO') { Respondido: {{ r.puntaje === 1 ? 'SI' : 'NO' }} · {{ cumple(q.numero) ? 'cumple' : 'no cumple' }} }
                      @else { Evaluado: {{ r.puntaje }} de {{ fmt.maxCriterio }} · {{ descripcionEscala(r.puntaje) }} }
                    </p>
                  </div>
                </div>

                @if (fmt.tipo === 'SI_NO') {
                  <div class="grid grid-cols-2 gap-2" role="radiogroup" [attr.aria-label]="'Respuesta de la pregunta ' + q.numero">
                    @for (op of opcionesSiNo; track op.valor) {
                      <button type="button" role="radio" [attr.aria-checked]="r.puntaje === op.valor" [disabled]="!editable" (click)="puntuar(q.numero, op.valor)"
                        class="min-h-14 rounded-xl border-2 text-lg font-extrabold transition-colors"
                        [ngClass]="r.puntaje === op.valor ? (cumple(q.numero) ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-rose-100 border-rose-500 text-rose-800') : 'bg-white border-slate-200 text-slate-700 hover:border-easydry-blue'">{{ op.texto }}</button>
                    }
                  </div>
                  <p class="text-[11px] text-slate-500">Cumple con: <strong>{{ q.favorable }}</strong></p>
                } @else {
                  <div class="grid gap-1.5" [style.grid-template-columns]="'repeat(' + fmt.escala.length + ', minmax(0, 1fr))'" role="radiogroup" [attr.aria-label]="'Puntaje del criterio ' + q.numero">
                    @for (e of fmt.escala; track e.valor) {
                      <button type="button" role="radio" [attr.aria-checked]="r.puntaje === e.valor" [attr.title]="e.descripcion" [disabled]="!editable"
                        (click)="puntuar(q.numero, e.valor)"
                        class="min-h-12 rounded-xl border-2 text-base font-extrabold transition-colors"
                        [ngClass]="r.puntaje === e.valor ? 'bg-easydry-blue border-easydry-blue text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-easydry-blue'">{{ e.valor }}</button>
                    }
                  </div>
                  <p class="text-[11px] text-slate-500">0 {{ fmt.escala[0].descripcion.toLowerCase() }} · {{ fmt.maxCriterio }} {{ fmt.escala[fmt.escala.length - 1].descripcion.toLowerCase() }}</p>
                }

                <div class="flex flex-wrap items-center gap-2">
                  <button type="button" class="btn btn-sm min-h-10" (click)="r.abierto = !r.abierto"
                    [ngClass]="r.puntaje !== null && !cumple(q.numero) && !r.hallazgo ? 'btn-primary' : 'btn-secondary'">
                    <i-lucide [name]="r.abierto ? 'chevron-up' : 'alert-triangle'" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                    {{ r.abierto ? 'Ocultar hallazgo' : (r.hallazgo || r.accionCorrectiva ? 'Ver hallazgo' : 'Registrar hallazgo') }}
                  </button>
                  @if (r.puntaje !== null && !cumple(q.numero) && !r.hallazgo && !r.accionCorrectiva) {
                    <span class="text-[11px] font-semibold text-amber-700">No cumple: registra el hallazgo para dar seguimiento.</span>
                  }
                  @if (r.fotos.length) { <span class="text-[11px] font-semibold text-slate-600"><i-lucide name="camera" class="w-3 h-3 inline" aria-hidden="true"></i-lucide> {{ r.fotos.length }} foto(s)</span> }
                </div>

                @if (r.abierto) {
                  <div class="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
                    <div><label class="field-label">Evidencia / hallazgo</label><textarea class="field" rows="2" [(ngModel)]="r.hallazgo" [disabled]="!editable" placeholder="Qué se encontró"></textarea></div>
                    <div><label class="field-label">Fotografías</label>
                      <app-evidencias-fotos [fotos]="r.fotos" (fotosChange)="r.fotos = $event" [agenciaId]="agenciaId" tipo="5s" [referenciaId]="detalle?.id" [deshabilitado]="!editable"></app-evidencias-fotos></div>
                    <div><label class="field-label">Acción correctiva</label><textarea class="field" rows="2" [(ngModel)]="r.accionCorrectiva" [disabled]="!editable"></textarea></div>
                    <div><label class="field-label">Observaciones</label><textarea class="field" rows="2" [(ngModel)]="r.observaciones" [disabled]="!editable"></textarea></div>
                  </div>
                }
              </article>
            }

            <div class="bg-white rounded-2xl border border-slate-200 shadow-easydry p-4">
              <label class="field-label" [attr.for]="'cc-' + categoria.id">Comentarios / acciones de {{ categoria.nombre }}</label>
              <textarea [id]="'cc-' + categoria.id" class="field" rows="3" [ngModel]="comentariosCat[categoria.id] || ''" (ngModelChange)="comentariosCat[categoria.id] = $event" [disabled]="!editable"></textarea>
            </div>
          </section>
        }

        @if (fmt && seccion === 6) {
          <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 sm:p-6 space-y-5">
            <h2 class="text-lg font-extrabold font-outfit text-slate-900">Resumen antes de confirmar</h2>
            <p class="text-sm text-slate-600">{{ agenciaNombre }} · {{ fecha | date:'dd/MM/yyyy' }} · {{ etiqueta(fmt.id).largo }}</p>
            <app-semaforo-5s [semaforo]="semaforo" [grande]="true" [detalle]="puntajeTotal + ' de ' + fmt.puntajeMaximo + ' puntos · ' + porcentaje + '% de cumplimiento' + (evaluados < totalCriterios ? ' (parcial: faltan criterios)' : '')"></app-semaforo-5s>

            <div class="space-y-2">
              @for (c of fmt.categorias; track c.id) {
                <div>
                  <div class="flex items-center justify-between text-xs font-bold text-slate-700"><span>{{ c.nombre }}{{ fmt.id === 'PUNTOS_25' ? '' : ' · ' + c.traduccion }} (subtotal)</span><span class="tabular-nums">{{ puntajeDe(c.id) }}/{{ c.maximo }}</span></div>
                  <div class="h-3 rounded-full bg-slate-100 overflow-hidden"><div class="h-full transition-all" [style.width.%]="(puntajeDe(c.id) / c.maximo) * 100" [style.background]="colorBarra((puntajeDe(c.id) / c.maximo) * 100)"></div></div>
                </div>
              }
            </div>

            @if (detalle?.anterior; as ant) {
              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="rounded-xl bg-slate-50 p-3"><p class="field-label">Esta auditoría</p><p class="text-xl font-extrabold">{{ puntajeTotal }}</p></div>
                <div class="rounded-xl bg-slate-50 p-3"><p class="field-label">Anterior</p><p class="text-xl font-extrabold">{{ ant.puntaje }}</p></div>
                <div class="rounded-xl bg-slate-50 p-3"><p class="field-label">Diferencia (+/−)</p>
                  <p class="text-xl font-extrabold" [ngClass]="puntajeTotal - (ant.puntaje ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'">{{ puntajeTotal - (ant.puntaje ?? 0) > 0 ? '+' : '' }}{{ puntajeTotal - (ant.puntaje ?? 0) }}</p></div>
              </div>
            }

            @if (sinEvaluar.length) {
              <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800" role="alert">
                <strong>No se puede guardar:</strong> faltan por evaluar los criterios {{ sinEvaluar.join(', ') }}.
                <div class="mt-2 flex flex-wrap gap-1.5">@for (n of sinEvaluar; track n) { <button type="button" class="btn btn-secondary btn-sm" (click)="irAlCriterio(n)">Criterio {{ n }}</button> }</div>
              </div>
            } @else {
              <p class="text-sm text-slate-600">{{ hallazgosRegistrados }} hallazgo(s) con acción correctiva. Al guardar se bloquean las puntuaciones y se abre el seguimiento de cada hallazgo. Una auditoría guardada ya no se puede modificar.</p>
              @if (sinHallazgo.length) { <p class="text-xs font-semibold text-amber-700">Criterios que no cumplen y no tienen hallazgo registrado (no tendrán acción correctiva): {{ sinHallazgo.join(', ') }}.</p> }
            }
          </section>
        }

        @if (errorGuardado) { <div class="estado-error" role="alert">{{ errorGuardado }}</div> }

        <div class="sticky bottom-0 -mx-1 px-1 py-3 bg-slate-50/95 backdrop-blur flex flex-wrap items-center justify-between gap-2">
          @if (!detalle) {
            <span></span>
            <button type="button" class="btn btn-cta min-h-11" (click)="crear()" [disabled]="guardando">
              <i-lucide name="plus" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ guardando ? 'Creando…' : (formatosElegidos.length > 1 ? 'Crear ' + formatosElegidos.length + ' auditorías y empezar' : 'Crear auditoría y empezar') }}
            </button>
          } @else {
            <button type="button" class="btn btn-secondary min-h-11" (click)="irA(seccion - 1)" [disabled]="seccion === 0"><i-lucide name="arrow-left" class="w-4 h-4" aria-hidden="true"></i-lucide> Anterior</button>
            <div class="flex flex-wrap items-center gap-2">
              @if (editable) {
                <button type="button" class="btn btn-secondary min-h-11" (click)="guardar()" [disabled]="guardando"><i-lucide name="save" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ guardando ? 'Guardando…' : 'Guardar borrador' }}</button>
              }
              @if (seccion < 6) {
                <button type="button" class="btn btn-primary min-h-11" (click)="irA(seccion + 1)">Siguiente <i-lucide name="arrow-right" class="w-4 h-4" aria-hidden="true"></i-lucide></button>
              } @else if (editable) {
                <button type="button" class="btn btn-cta min-h-11" (click)="guardarDefinitivo()" [disabled]="guardando || sinEvaluar.length > 0"><i-lucide name="check-circle" class="w-4 h-4" aria-hidden="true"></i-lucide> Guardar este formato</button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Auditoria5sFormComponent implements OnInit, OnDestroy {
  private readonly api = inject(Auditoria5sService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmar = inject(ConfirmarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private sub?: Subscription;

  readonly nombreS = nombre5s;
  readonly usuarioNombre = (() => { const u = this.auth.getCurrentUser(); return u ? `${u.nombre} ${u.apellido}`.trim() : ''; })();
  readonly opcionesSiNo = [{ valor: 1, texto: 'SI' }, { valor: 0, texto: 'NO' }];

  cat: Catalogo5s | null = null;
  detalle: Auditoria5sDetalle | null = null;
  agencias: OpcionAgencia[] = [];
  cargando = true;
  errorCarga = '';
  errorGuardado = '';
  guardando = false;
  seccion = 0;

  agenciaId = '';
  area = '';
  fecha = new Date().toISOString().slice(0, 10);
  responsableAgencia = '';
  equipoPersona = '';
  comentarios = '';
  comentariosCat: Record<string, string> = {};
  /** Nombre del líder marcado automáticamente como responsable (para cambiarlo si luego se elige otra agencia). */
  liderAuto = '';
  formatosElegidos: FormatoId[] = ['LISTA_20'];
  resp: Record<number, Respuesta> = {};

  get editable(): boolean { return !this.detalle || this.detalle.permisos.puedeEditar; }
  get fmt(): Formato5sCatalogo | null { return this.detalle ? this.cat?.formatos.find((f) => f.id === this.detalle!.formato) ?? null : null; }
  get totalCriterios(): number { return this.fmt?.categorias.reduce((n, c) => n + c.criterios.length, 0) ?? 0; }
  get agenciaNombre(): string { return this.agencias.find((a) => a.id === this.agenciaId)?.nombre ?? this.detalle?.agencia.nombre ?? ''; }
  etiqueta = (id: FormatoId) => FORMATOS_ETIQUETA[id];

  private criterio(numero: number) { return this.fmt?.categorias.flatMap((c) => c.criterios).find((q) => q.numero === numero); }

  /** Lo que vale la respuesta para el cálculo: en SI/NO, 1 si coincide con la respuesta que cumple. */
  private efectivo(numero: number): number | null {
    const r = this.resp[numero];
    if (!r || r.puntaje === null || !this.fmt) return null;
    if (this.fmt.tipo === 'PUNTAJE') return r.puntaje;
    return (r.puntaje === 1) === (this.criterio(numero)?.favorable === 'SI') ? 1 : 0;
  }

  cumple(numero: number): boolean { return this.efectivo(numero) === this.fmt?.maxCriterio; }

  get evaluados(): number { return Object.values(this.resp).filter((r) => r.puntaje !== null).length; }
  get puntajeTotal(): number { return Object.keys(this.resp).reduce((s, n) => s + (this.efectivo(Number(n)) ?? 0), 0); }
  get porcentaje(): number { return this.fmt ? Math.round((this.puntajeTotal / this.fmt.puntajeMaximo) * 1000) / 10 : 0; }
  /** Mismos rangos del Excel; el servidor calcula el definitivo y el usuario no puede cambiarlo. */
  get semaforo(): Semaforo { return this.porcentaje >= 90 ? 'VERDE' : this.porcentaje >= 75 ? 'AMARILLO' : 'ROJO'; }
  get sinEvaluar(): number[] { return Object.entries(this.resp).filter(([, r]) => r.puntaje === null).map(([n]) => Number(n)); }
  get sinHallazgo(): number[] { return Object.entries(this.resp).filter(([n, r]) => r.puntaje !== null && !this.cumple(Number(n)) && !r.hallazgo.trim() && !r.accionCorrectiva.trim()).map(([n]) => Number(n)); }
  get hallazgosRegistrados(): number { return Object.entries(this.resp).filter(([n, r]) => r.puntaje !== null && !this.cumple(Number(n)) && (r.hallazgo.trim() || r.accionCorrectiva.trim())).length; }

  colorBarra = (pct: number) => SEMAFORO[pct >= 90 ? 'VERDE' : pct >= 75 ? 'AMARILLO' : 'ROJO'].hex;

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((p) => void this.cargar(p.get('id')));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private async cargar(id: string | null): Promise<void> {
    this.cargando = true;
    this.errorCarga = '';
    this.errorGuardado = '';
    try {
      const [cat, opciones] = await Promise.all([firstValueFrom(this.api.getCatalogo()), firstValueFrom(this.api.getOpciones())]);
      this.cat = cat;
      this.agencias = opciones.agencias;
      if (!id) {
        this.detalle = null;
        this.seccion = 0;
        if (this.agencias.length === 1) this.agenciaId = this.agencias[0].id;
        return;
      }
      const d = await firstValueFrom(this.api.getDetalle(id));
      if (!d.permisos.puedeEditar) {
        void this.router.navigate(['/auditorias-5s', id], { replaceUrl: true });
        return;
      }
      if (this.detalle?.id !== d.id) this.seccion = this.detalle?.grupoId === d.grupoId && d.grupoId ? this.seccion : 1;
      this.aplicar(d);
    } catch (e) {
      this.errorCarga = mensajeError(e, 'No se pudo cargar la auditoría.');
    } finally {
      this.cargando = false;
    }
  }

  private aplicar(d: Auditoria5sDetalle): void {
    this.detalle = d;
    this.agenciaId = d.agencia.id;
    this.area = d.area;
    this.fecha = d.fecha;
    this.responsableAgencia = d.responsableAgencia;
    this.equipoPersona = d.equipoPersona;
    this.comentarios = d.comentarios;
    this.comentariosCat = { ...d.comentariosCategoria };
    this.resp = Object.fromEntries(d.criterios.map((c) => [c.numero, {
      puntaje: c.puntaje,
      hallazgo: c.hallazgo,
      observaciones: c.observaciones,
      accionCorrectiva: c.accionCorrectiva,
      fotos: [...c.fotos],
      abierto: false,
    } as Respuesta]));
  }

  /** Al elegir la agencia se marca solo su líder como responsable, salvo que ya hayas escrito a otra persona. */
  elegirAgencia(id: string): void {
    this.agenciaId = id;
    if (!this.editable) return;
    const lider = this.agencias.find((a) => a.id === id)?.lider;
    if (lider && (!this.responsableAgencia.trim() || this.responsableAgencia === this.liderAuto)) {
      this.responsableAgencia = lider.nombre;
      this.liderAuto = lider.nombre;
    } else if (!lider && this.liderAuto && this.responsableAgencia === this.liderAuto) {
      this.responsableAgencia = '';
      this.liderAuto = '';
    }
  }

  elegido(id: FormatoId): boolean { return this.formatosElegidos.includes(id); }

  alternarFormato(id: FormatoId): void {
    if (this.elegido(id)) {
      if (this.formatosElegidos.length === 1) { this.toast.warning('Formato', 'Elige al menos un formato.'); return; }
      this.formatosElegidos = this.formatosElegidos.filter((f) => f !== id);
    } else {
      this.formatosElegidos = this.cat!.formatos.map((f) => f.id).filter((f) => f === id || this.formatosElegidos.includes(f));
    }
  }

  irA(n: number): void {
    this.seccion = Math.min(6, Math.max(0, n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  irAlCriterio(numero: number): void {
    const k = this.fmt?.categorias.findIndex((c) => c.criterios.some((q) => q.numero === numero)) ?? -1;
    if (k >= 0) this.irA(k + 1);
  }

  puntuar(numero: number, valor: number): void {
    this.resp[numero].puntaje = valor;
    if (!this.cumple(numero) && !this.resp[numero].hallazgo && !this.resp[numero].accionCorrectiva) this.resp[numero].abierto = true;
  }

  evaluadosDe(cat: string): number {
    return this.fmt!.categorias.find((c) => c.id === cat)!.criterios.filter((q) => this.resp[q.numero]?.puntaje !== null).length;
  }

  puntajeDe(cat: string): number {
    return this.fmt!.categorias.find((c) => c.id === cat)!.criterios.reduce((s, q) => s + (this.efectivo(q.numero) ?? 0), 0);
  }

  descripcionEscala = (valor: number) => this.fmt?.escala.find((e) => e.valor === valor)?.descripcion ?? '';

  /** Cambiar a otro formato de la misma visita: primero se guarda lo avanzado en este. */
  async irAHermana(id: string): Promise<void> {
    if (id === this.detalle?.id) return;
    if (this.editable && !(await this.guardar(true))) return;
    await this.router.navigate(['/auditorias-5s', id, 'editar']);
  }

  private datosVisita(): GuardarAuditoria5s {
    return {
      agenciaId: this.agenciaId,
      ...(this.area && this.area !== 'GENERAL' ? { area: this.area } : {}),
      fecha: this.fecha,
      responsableAgencia: this.responsableAgencia,
      equipoPersona: this.equipoPersona,
      comentarios: this.comentarios,
    };
  }

  /** Crea una auditoría por cada formato elegido (mismos datos, guardadas por separado) y empieza por la primera. */
  async crear(): Promise<void> {
    this.errorGuardado = '';
    if (!this.agenciaId) {
      this.errorGuardado = 'Elige la agencia para empezar.';
      return;
    }
    this.guardando = true;
    try {
      const d = await firstValueFrom(this.api.crear({ ...this.datosVisita(), formatos: this.formatosElegidos }));
      this.toast.success('Auditoría creada', this.formatosElegidos.length > 1 ? `Se crearon ${this.formatosElegidos.length} auditorías de la visita.` : `${d.codigo} creada.`);
      await this.router.navigate(['/auditorias-5s', d.id, 'editar'], { replaceUrl: true });
    } catch (e) {
      this.errorGuardado = mensajeError(e, 'No se pudo crear la auditoría.');
    } finally {
      this.guardando = false;
    }
  }

  private payload(): GuardarAuditoria5s {
    return {
      ...this.datosVisita(),
      id: this.detalle!.id,
      comentariosCategoria: this.comentariosCat,
      respuestas: Object.entries(this.resp).map(([n, r]) => ({
        criterio: Number(n),
        puntaje: r.puntaje,
        hallazgo: r.hallazgo,
        observaciones: r.observaciones,
        accionCorrectiva: r.accionCorrectiva,
        fotos: r.fotos,
      })),
    };
  }

  async guardar(silencioso = false): Promise<boolean> {
    this.errorGuardado = '';
    if (!this.detalle) return false;
    if (!this.agenciaId) {
      this.errorGuardado = 'Elige la agencia para guardar el borrador.';
      this.irA(0);
      return false;
    }
    this.guardando = true;
    try {
      const abiertos = Object.fromEntries(Object.entries(this.resp).map(([n, r]) => [n, r.abierto]));
      const d = await firstValueFrom(this.api.actualizar(this.payload()));
      this.aplicar(d);
      for (const [n, a] of Object.entries(abiertos)) if (this.resp[Number(n)]) this.resp[Number(n)].abierto = a;
      if (!silencioso) this.toast.success('Borrador guardado', `${d.codigo} se guardó. Puedes continuar después.`);
      return true;
    } catch (e) {
      this.errorGuardado = mensajeError(e, 'No se pudo guardar.');
      return false;
    } finally {
      this.guardando = false;
    }
  }

  async guardarDefinitivo(): Promise<void> {
    if (this.sinEvaluar.length || !this.detalle) return;
    const ok = await this.confirmar.pedir({
      titulo: 'Guardar este formato',
      mensaje: 'Al guardar se bloquean las puntuaciones de este formato y se fija el resultado. Ya no se podrá modificar. ¿Quieres guardarlo?',
      textoConfirmar: 'Guardar',
      icono: 'lock',
    });
    if (!ok) return;
    if (!(await this.guardar(true))) return;
    this.guardando = true;
    try {
      const d = await firstValueFrom(this.api.guardar(this.detalle.id));
      this.toast.success('Auditoría guardada', `${d.codigo}: ${d.resultado.puntaje}/${d.resultado.puntajeMaximo} — ${SEMAFORO[d.resultado.semaforo].nombre}.`);
      void this.router.navigate(['/auditorias-5s', d.id]);
    } catch (e) {
      this.errorGuardado = mensajeError(e, 'No se pudo guardar.');
    } finally {
      this.guardando = false;
    }
  }
}

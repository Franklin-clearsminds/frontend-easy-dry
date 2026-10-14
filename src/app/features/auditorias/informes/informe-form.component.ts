import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InformesInspeccionService } from '../../../core/services/informes-inspeccion.service';
import { ToastService } from '../../../shared/services/toast.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import {
  Actividad,
  CALIFICACIONES,
  CATEGORIAS_NOVEDAD,
  Calificacion,
  Destinatario,
  ESTADOS_NOVEDAD,
  ESTADOS_PLAN,
  GuardarInforme,
  InformeDetalle,
  Novedad,
  OpcionAgencia,
  PRIORIDADES,
  PlanAccion,
  TIPOS_INSPECCION,
  mensajeError,
} from '../../../core/models/auditorias.model';
import { EvidenciasFotosComponent } from '../shared/evidencias-fotos.component';
import { descargarPdfInforme } from './informe-pdf';

interface Paso { id: number; titulo: string; corto: string; icono: string }

const aLocal = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * Formulario por pasos del informe de inspección. Los campos del documento original van en los pasos 1, 2, 3, 4, 5 y 6; las
 * novedades, actividades y planes individuales son la ampliación digital. El borrador se guarda en el servidor en cualquier momento.
 */
@Component({
  selector: 'app-informe-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, EvidenciasFotosComponent],
  template: `
    <div class="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <a routerLink="/informes-inspeccion" class="btn btn-ghost btn-sm"><i-lucide name="arrow-left" class="w-4 h-4" aria-hidden="true"></i-lucide> Informes</a>
        <div class="text-right">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Informe de inspección</p>
          <p class="font-mono font-extrabold text-easydry-blue">{{ detalle?.numero || 'Se asignará el número al guardar' }}</p>
        </div>
      </div>

      @if (cargando) {
        <div class="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500" role="status">Cargando informe…</div>
      } @else if (errorCarga) {
        <div class="estado-error" role="alert">{{ errorCarga }}</div>
      } @else {
        <!-- Progreso -->
        <nav aria-label="Pasos del informe" class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-3 sm:p-4">
          <div class="flex items-center justify-between mb-2 text-xs font-bold text-slate-600">
            <span>Paso {{ paso }} de {{ pasos.length }} · {{ pasoActual.titulo }}</span>
            <span>{{ progreso }}%</span>
          </div>
          <div class="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" [attr.aria-valuenow]="progreso" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full bg-easydry-blue transition-all" [style.width.%]="progreso"></div>
          </div>
          <ol class="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            @for (p of pasos; track p.id) {
              <li>
                <button type="button" (click)="irA(p.id)" [attr.aria-current]="paso === p.id ? 'step' : null"
                  class="flex items-center gap-1.5 px-3 min-h-10 rounded-xl text-xs font-bold whitespace-nowrap border transition-colors"
                  [ngClass]="paso === p.id ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'">
                  <i-lucide [name]="p.icono" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>{{ p.corto }}
                </button>
              </li>
            }
          </ol>
        </nav>

        <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 sm:p-6 space-y-5">
          @switch (paso) {
            @case (1) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Información general</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="field-label" for="f-para">PARA (destinatario del informe) *</label>
                  @if (destinatarioLibre) {
                    <input id="f-para" class="field" [(ngModel)]="form.destinatarioNombre" placeholder="Nombre y cargo del destinatario" maxlength="160" [disabled]="!editable">
                  } @else {
                    <select id="f-para" class="field" [ngModel]="form.destinatarioId" (ngModelChange)="elegirDestinatario($event)" [disabled]="!editable">
                      <option value="">Selecciona un usuario…</option>
                      @for (d of destinatarios; track d.id) { <option [value]="d.id">{{ d.nombre }} — {{ d.cargo }}</option> }
                    </select>
                  }
                  <button type="button" class="mt-1 text-xs font-bold text-easydry-blue hover:underline" (click)="alternarDestinatario()" [disabled]="!editable">
                    {{ destinatarioLibre ? 'Elegir de la lista de usuarios' : 'Escribir otro destinatario' }}
                  </button>
                </div>
                <div>
                  <label class="field-label" for="f-de">DE (responsable del informe)</label>
                  <input id="f-de" class="field" [value]="detalle?.inspectorNombre || usuarioNombre" disabled>
                  <p class="text-[11px] text-slate-500 mt-1">Es el usuario con sesión iniciada.</p>
                </div>
                <div>
                  <label class="field-label" for="f-fecha">FECHA *</label>
                  <input id="f-fecha" type="date" class="field" [(ngModel)]="form.fecha" [disabled]="!editable">
                </div>
                <div>
                  <label class="field-label" for="f-num">INFORME MENSUAL N.º</label>
                  <input id="f-num" class="field" [value]="detalle ? detalle.numeroMensual + '  ·  ' + detalle.numero : 'Automático al guardar'" disabled>
                </div>
              </div>

              <div class="rounded-xl border border-dashed border-slate-300 p-4 space-y-4">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Datos de gestión digital (no están en el documento impreso)</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="field-label" for="f-agencia">Agencia inspeccionada *</label>
                    <select id="f-agencia" class="field" [ngModel]="form.agenciaId" (ngModelChange)="elegirAgencia($event)" [disabled]="!editable">
                      <option value="">Selecciona la agencia…</option>
                      @for (a of agencias; track a.id) { <option [value]="a.id">{{ a.nombre }}</option> }
                    </select>
                  </div>
                  <div>
                    <label class="field-label" for="f-visita">Fecha y hora de la visita</label>
                    <input id="f-visita" type="datetime-local" class="field" [(ngModel)]="form.fechaVisita" [disabled]="!editable">
                  </div>
                  <div>
                    <label class="field-label" for="f-tipo">Tipo de inspección</label>
                    <select id="f-tipo" class="field" [(ngModel)]="form.tipoInspeccion" [disabled]="!editable">
                      @for (t of tipos; track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
                    </select>
                  </div>
                </div>
                @if (avisoAgencia) { <p class="text-xs font-semibold text-easydry-blue">{{ avisoAgencia }}</p> }
                <p class="text-xs text-slate-500">Estado del informe: <strong>{{ detalle ? nombreEstado(detalle.estado) : 'Borrador (aún sin guardar)' }}</strong></p>
              </div>
            }

            @case (2) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Asunto y antecedentes</h2>
              <div>
                <label class="field-label" for="f-asunto">ASUNTO *</label>
                <input id="f-asunto" class="field" [(ngModel)]="form.asunto" maxlength="300" placeholder="Motivo principal de la inspección" [disabled]="!editable">
              </div>
              <div>
                <label class="field-label" for="f-ant">ANTECEDENTES</label>
                <textarea id="f-ant" class="field" rows="7" [(ngModel)]="form.antecedentes" placeholder="Inspecciones previas, problemas reportados y contexto de la visita" [disabled]="!editable"></textarea>
              </div>
            }

            @case (3) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Desarrollo y novedades encontradas</h2>
              <div>
                <label class="field-label" for="f-des">DESARROLLO Y NOVEDADES ENCONTRADAS (descripción general)</label>
                <textarea id="f-des" class="field" rows="6" [(ngModel)]="form.desarrollo" placeholder="Lo encontrado durante la inspección" [disabled]="!editable"></textarea>
              </div>
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-extrabold text-slate-800">Novedades individuales ({{ form.novedades.length }})</h3>
                @if (editable) { <button type="button" class="btn btn-secondary btn-sm" (click)="agregarNovedad()"><i-lucide name="plus" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Agregar novedad</button> }
              </div>
              @for (n of form.novedades; track $index) {
                <article class="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs font-bold text-slate-500">Novedad {{ $index + 1 }}@if (n.registradaEn) { · registrada {{ n.registradaEn | date:'dd/MM/yyyy HH:mm' }} }</p>
                    @if (editable) { <button type="button" class="btn-icon hover:!text-rose-600" (click)="quitar(form.novedades, $index)" aria-label="Quitar novedad"><i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide></button> }
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="sm:col-span-2"><label class="field-label">Título *</label><input class="field" [(ngModel)]="n.titulo" maxlength="160" [disabled]="!editable"></div>
                    <div class="sm:col-span-2"><label class="field-label">Descripción</label><textarea class="field" rows="3" [(ngModel)]="n.descripcion" [disabled]="!editable"></textarea></div>
                    <div><label class="field-label">Categoría</label>
                      <select class="field" [(ngModel)]="n.categoria" [disabled]="!editable">@for (c of categorias; track c.id) { <option [value]="c.id">{{ c.nombre }}</option> }</select></div>
                    <div><label class="field-label">Prioridad</label>
                      <select class="field" [(ngModel)]="n.prioridad" [disabled]="!editable">@for (p of prioridades; track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }</select></div>
                    <div><label class="field-label">Área relacionada</label><input class="field" [(ngModel)]="n.area" maxlength="120" placeholder="Ej. bahía 2, bodega" [disabled]="!editable"></div>
                    <div><label class="field-label">Estado de seguimiento</label>
                      <select class="field" [(ngModel)]="n.estadoSeguimiento" [disabled]="!editable">@for (e of estadosNovedad; track e.id) { <option [value]="e.id">{{ e.nombre }}</option> }</select></div>
                  </div>
                  <div><label class="field-label">Evidencias fotográficas</label>
                    <app-evidencias-fotos [fotos]="n.fotos" (fotosChange)="n.fotos = $event" [agenciaId]="form.agenciaId" tipo="informes" [referenciaId]="detalle?.id" [deshabilitado]="!editable"></app-evidencias-fotos></div>
                </article>
              }
              @if (!form.novedades.length) { <p class="text-sm text-slate-500">Aún no hay novedades individuales. Son opcionales: puedes describir todo en el texto general.</p> }
            }

            @case (4) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Actividades realizadas en la agencia durante la visita</h2>
              <div>
                <label class="field-label" for="f-act">Descripción general</label>
                <textarea id="f-act" class="field" rows="5" [(ngModel)]="form.actividadesGeneral" [disabled]="!editable"></textarea>
              </div>
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-extrabold text-slate-800">Lista de actividades ({{ form.actividades.length }})</h3>
                @if (editable) { <button type="button" class="btn btn-secondary btn-sm" (click)="agregarActividad()"><i-lucide name="plus" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Agregar actividad</button> }
              </div>
              @for (a of form.actividades; track $index) {
                <article class="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs font-bold text-slate-500">Actividad {{ $index + 1 }}</p>
                    @if (editable) { <button type="button" class="btn-icon hover:!text-rose-600" (click)="quitar(form.actividades, $index)" aria-label="Quitar actividad"><i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide></button> }
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="sm:col-span-2"><label class="field-label">Nombre de la actividad *</label><input class="field" [(ngModel)]="a.nombre" maxlength="160" [disabled]="!editable"></div>
                    <div class="sm:col-span-2"><label class="field-label">Descripción</label><textarea class="field" rows="2" [(ngModel)]="a.descripcion" [disabled]="!editable"></textarea></div>
                    <div><label class="field-label">Responsable</label><input class="field" [(ngModel)]="a.responsable" maxlength="120" [disabled]="!editable"></div>
                    <div><label class="field-label">Fecha</label><input type="date" class="field" [(ngModel)]="a.fecha" [disabled]="!editable"></div>
                    <div><label class="field-label">Resultado</label><input class="field" [(ngModel)]="a.resultado" [disabled]="!editable"></div>
                    <div><label class="field-label">Observaciones</label><input class="field" [(ngModel)]="a.observaciones" [disabled]="!editable"></div>
                  </div>
                  <div><label class="field-label">Evidencias (opcional)</label>
                    <app-evidencias-fotos [fotos]="a.fotos" (fotosChange)="a.fotos = $event" [agenciaId]="form.agenciaId" tipo="informes" [referenciaId]="detalle?.id" [deshabilitado]="!editable"></app-evidencias-fotos></div>
                </article>
              }
            }

            @case (5) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Planes de acción pendientes de otras áreas</h2>
              <div>
                <label class="field-label" for="f-pla">Descripción general</label>
                <textarea id="f-pla" class="field" rows="4" [(ngModel)]="form.planesGeneral" [disabled]="!editable"></textarea>
              </div>
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-extrabold text-slate-800">Planes de acción ({{ form.planes.length }})</h3>
                @if (editable) { <button type="button" class="btn btn-secondary btn-sm" (click)="agregarPlan()"><i-lucide name="plus" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Agregar plan</button> }
              </div>
              @for (p of form.planes; track $index) {
                <article class="rounded-xl border p-4 space-y-3" [ngClass]="vencido(p) ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-slate-50/50'">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs font-bold text-slate-500">Plan {{ $index + 1 }}@if (vencido(p)) { <span class="ml-2 badge badge-danger">Vencido</span> }</p>
                    @if (editable) { <button type="button" class="btn-icon hover:!text-rose-600" (click)="quitar(form.planes, $index)" aria-label="Quitar plan"><i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide></button> }
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="sm:col-span-2"><label class="field-label">Descripción del problema *</label><textarea class="field" rows="2" [(ngModel)]="p.problema" [disabled]="!editable"></textarea></div>
                    <div class="sm:col-span-2"><label class="field-label">Acción requerida</label><textarea class="field" rows="2" [(ngModel)]="p.accionRequerida" [disabled]="!editable"></textarea></div>
                    <div><label class="field-label">Área responsable</label><input class="field" [(ngModel)]="p.areaResponsable" maxlength="120" [disabled]="!editable"></div>
                    <div><label class="field-label">Persona responsable</label><input class="field" [(ngModel)]="p.personaResponsable" maxlength="120" [disabled]="!editable"></div>
                    <div><label class="field-label">Fecha compromiso</label><input type="date" class="field" [(ngModel)]="p.fechaCompromiso" [disabled]="!editable"></div>
                    <div><label class="field-label">Prioridad</label>
                      <select class="field" [(ngModel)]="p.prioridad" [disabled]="!editable">@for (x of prioridades; track x.id) { <option [value]="x.id">{{ x.nombre }}</option> }</select></div>
                    <div><label class="field-label">Estado</label>
                      <select class="field" [(ngModel)]="p.estado" [disabled]="!editable">@for (e of estadosPlan; track e.id) { @if (e.id !== 'VENCIDO') { <option [value]="e.id">{{ e.nombre }}</option> } }</select></div>
                    <div><label class="field-label">Observaciones</label><input class="field" [(ngModel)]="p.observaciones" [disabled]="!editable"></div>
                  </div>
                  <div><label class="field-label">Evidencia de cumplimiento</label>
                    <app-evidencias-fotos [fotos]="p.evidenciaCumplimiento" (fotosChange)="p.evidenciaCumplimiento = $event" [agenciaId]="form.agenciaId" tipo="informes" [referenciaId]="detalle?.id" [deshabilitado]="!editable"></app-evidencias-fotos></div>
                </article>
              }
            }

            @case (6) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Observaciones y calificación del servicio</h2>
              @if (!puedeCalificar) {
                <p class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">Tu rol no registra las observaciones del jefe de taller ni la calificación.</p>
              }
              <div>
                <label class="field-label" for="f-obs">OBSERVACIONES DEL JEFE DE TALLER</label>
                <textarea id="f-obs" class="field" rows="6" [(ngModel)]="form.observacionesJefeTaller" [disabled]="!editable || !puedeCalificar"></textarea>
              </div>
              <fieldset [disabled]="!editable || !puedeCalificar">
                <legend class="field-label">CALIFIQUE NUESTRO SERVICIO *</legend>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" role="radiogroup">
                  @for (c of calificaciones; track c.id) {
                    <button type="button" role="radio" [attr.aria-checked]="form.calificacion === c.id" (click)="form.calificacion = c.id"
                      class="min-h-14 rounded-xl border-2 font-extrabold text-sm transition-colors"
                      [ngClass]="form.calificacion === c.id ? c.clase + ' ring-2 ring-offset-1 ring-easydry-blue' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'">
                      {{ c.nombre }}
                    </button>
                  }
                </div>
              </fieldset>
              @if (detalle?.calificadoPorNombre) {
                <p class="text-xs text-slate-500">Registrada por {{ detalle?.calificadoPorNombre }} el {{ detalle?.calificadoEn | date:'dd/MM/yyyy HH:mm' }}.</p>
              }
            }

            @case (7) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Vista previa</h2>
              <div class="rounded-xl border border-slate-300 overflow-hidden text-sm">
                <div class="bg-[#a9c8ec] px-4 py-3 font-extrabold text-[#0b4f9c] text-lg tracking-wide">INFORME DE INSPECCIÓN</div>
                <dl class="grid grid-cols-2 md:grid-cols-4 border-b border-slate-300">
                  <div class="p-3 border-r border-slate-200"><dt class="text-[11px] font-bold text-slate-500">PARA</dt><dd class="font-semibold">{{ vistaPara || '—' }}</dd></div>
                  <div class="p-3 border-r border-slate-200"><dt class="text-[11px] font-bold text-slate-500">DE</dt><dd class="font-semibold">{{ detalle?.inspectorNombre || usuarioNombre }}</dd></div>
                  <div class="p-3 border-r border-slate-200"><dt class="text-[11px] font-bold text-slate-500">FECHA</dt><dd class="font-semibold">{{ form.fecha | date:'dd/MM/yyyy' }}</dd></div>
                  <div class="p-3"><dt class="text-[11px] font-bold text-slate-500">INFORME MENSUAL N.º</dt><dd class="font-semibold">{{ detalle?.numeroMensual || '—' }}</dd></div>
                </dl>
                <div class="p-3 border-b border-slate-200"><strong>ASUNTO:</strong> {{ form.asunto || '—' }}</div>
                <div class="p-3 border-b border-slate-300 whitespace-pre-line"><strong>ANTECEDENTES:</strong> {{ form.antecedentes || '—' }}</div>
                <div class="bg-[#a9c8ec] px-3 py-1.5 text-center text-xs font-extrabold">DESARROLLO Y NOVEDADES ENCONTRADAS</div>
                <div class="p-3 whitespace-pre-line">{{ form.desarrollo || '—' }}
                  @for (n of form.novedades; track $index) { <p class="mt-2">• <strong>{{ n.titulo }}</strong> ({{ n.prioridad.toLowerCase() }}) {{ n.descripcion }} <span class="text-slate-500">[{{ n.fotos.length }} foto(s)]</span></p> }
                </div>
                <div class="bg-[#a9c8ec] px-3 py-1.5 text-center text-xs font-extrabold">ACTIVIDADES REALIZADAS EN LA AGENCIA DURANTE LA VISITA</div>
                <div class="p-3 whitespace-pre-line">{{ form.actividadesGeneral || '—' }}
                  @for (a of form.actividades; track $index) { <p class="mt-2">• <strong>{{ a.nombre }}</strong> {{ a.resultado }}</p> }
                </div>
                <div class="bg-[#a9c8ec] px-3 py-1.5 text-center text-xs font-extrabold">PLANES DE ACCIÓN PENDIENTES DE OTRAS ÁREAS</div>
                <div class="p-3 whitespace-pre-line">{{ form.planesGeneral || '—' }}
                  @for (p of form.planes; track $index) { <p class="mt-2">• <strong>{{ p.problema }}</strong> → {{ p.accionRequerida || '—' }} ({{ p.fechaCompromiso ? (p.fechaCompromiso | date:'dd/MM/yyyy') : 'sin fecha' }})</p> }
                </div>
                <div class="bg-[#a9c8ec] px-3 py-1.5 text-center text-xs font-extrabold">OBSERVACIONES Y APROBACIÓN</div>
                <div class="p-3"><strong>Observaciones del jefe de taller:</strong> {{ form.observacionesJefeTaller || '—' }}<br><strong>Calificación:</strong> {{ form.calificacion ? nombreCalificacion(form.calificacion) : '—' }}</div>
              </div>

              @if (faltantes.length) {
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800" role="alert">
                  Para enviarlo a revisión falta: {{ faltantes.join(', ') }}.
                </div>
              }
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-secondary" (click)="vistaPdf()" [disabled]="!detalle || generando"><i-lucide name="download" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ generando ? 'Generando…' : 'Vista previa en PDF' }}</button>
              </div>
              @if (!detalle) { <p class="text-xs text-slate-500">Guarda el borrador para generar el PDF.</p> }
            }
          }

          @if (errorGuardado) { <div class="estado-error" role="alert">{{ errorGuardado }}</div> }
        </section>

        <!-- Navegación -->
        <div class="sticky bottom-0 -mx-1 px-1 py-3 bg-slate-50/95 backdrop-blur flex flex-wrap items-center justify-between gap-2">
          <button type="button" class="btn btn-secondary min-h-11" (click)="irA(paso - 1)" [disabled]="paso === 1"><i-lucide name="arrow-left" class="w-4 h-4" aria-hidden="true"></i-lucide> Anterior</button>
          <div class="flex flex-wrap items-center gap-2">
            @if (editable) {
              <button type="button" class="btn btn-secondary min-h-11" (click)="guardar()" [disabled]="guardando">
                <i-lucide name="save" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ guardando ? 'Guardando…' : 'Guardar borrador' }}
              </button>
            }
            @if (paso < pasos.length) {
              <button type="button" class="btn btn-primary min-h-11" (click)="irA(paso + 1)">Siguiente <i-lucide name="arrow-right" class="w-4 h-4" aria-hidden="true"></i-lucide></button>
            } @else if (editable) {
              <button type="button" class="btn btn-cta min-h-11" (click)="enviar()" [disabled]="guardando || faltantes.length > 0">
                <i-lucide name="send" class="w-4 h-4" aria-hidden="true"></i-lucide> Enviar a revisión
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class InformeFormComponent implements OnInit {
  private readonly api = inject(InformesInspeccionService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageUploadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly pasos: Paso[] = [
    { id: 1, titulo: 'Información general', corto: 'General', icono: 'file-text' },
    { id: 2, titulo: 'Asunto y antecedentes', corto: 'Asunto', icono: 'list' },
    { id: 3, titulo: 'Desarrollo y novedades', corto: 'Novedades', icono: 'alert-triangle' },
    { id: 4, titulo: 'Actividades realizadas', corto: 'Actividades', icono: 'check-square' },
    { id: 5, titulo: 'Planes de acción', corto: 'Planes', icono: 'clipboard-list' },
    { id: 6, titulo: 'Observaciones y calificación', corto: 'Calificación', icono: 'star' },
    { id: 7, titulo: 'Vista previa y envío', corto: 'Vista previa', icono: 'eye' },
  ];
  readonly tipos = TIPOS_INSPECCION;
  readonly categorias = CATEGORIAS_NOVEDAD;
  readonly prioridades = PRIORIDADES;
  readonly estadosNovedad = ESTADOS_NOVEDAD;
  readonly estadosPlan = ESTADOS_PLAN;
  readonly calificaciones = CALIFICACIONES;
  readonly puedeCalificar = this.auth.puede('informes.firmar');
  readonly usuarioNombre = (() => { const u = this.auth.getCurrentUser(); return u ? `${u.nombre} ${u.apellido}`.trim() : ''; })();

  paso = 1;
  cargando = true;
  errorCarga = '';
  errorGuardado = '';
  guardando = false;
  generando = false;
  detalle: InformeDetalle | null = null;
  agencias: OpcionAgencia[] = [];
  destinatarios: Destinatario[] = [];
  destinatarioLibre = false;
  avisoAgencia = '';
  /** Id del líder marcado automáticamente al elegir la agencia (para cambiarlo si luego se elige otra agencia). */
  private liderAuto = '';

  form = this.formularioVacio();

  get pasoActual(): Paso { return this.pasos[this.paso - 1]; }
  get progreso(): number { return Math.round((this.paso / this.pasos.length) * 100); }
  get editable(): boolean { return !this.detalle || this.detalle.permisos.puedeEditar; }

  get vistaPara(): string {
    return this.destinatarioLibre ? this.form.destinatarioNombre : (this.destinatarios.find((d) => d.id === this.form.destinatarioId)?.nombre ?? this.form.destinatarioNombre);
  }

  get faltantes(): string[] {
    const f: string[] = [];
    if (!this.form.agenciaId) f.push('la agencia');
    if (!this.vistaPara.trim()) f.push('el destinatario (PARA)');
    if (!this.form.asunto.trim()) f.push('el asunto');
    if (!this.form.desarrollo.trim() && !this.form.novedades.length) f.push('el desarrollo o al menos una novedad');
    if (!this.form.calificacion) f.push('la calificación del servicio');
    return f;
  }

  private formularioVacio() {
    const hoy = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return {
      agenciaId: '',
      destinatarioId: '',
      destinatarioNombre: '',
      fecha: `${hoy.getFullYear()}-${p(hoy.getMonth() + 1)}-${p(hoy.getDate())}`,
      fechaVisita: aLocal(hoy.toISOString()),
      tipoInspeccion: 'RUTINA',
      asunto: '',
      antecedentes: '',
      desarrollo: '',
      actividadesGeneral: '',
      planesGeneral: '',
      observacionesJefeTaller: '',
      calificacion: null as Calificacion | null,
      novedades: [] as Novedad[],
      actividades: [] as Actividad[],
      planes: [] as PlanAccion[],
    };
  }

  async ngOnInit(): Promise<void> {
    try {
      const [opciones, destinatarios] = await Promise.all([
        firstValueFrom(this.api.getOpciones()),
        firstValueFrom(this.api.getDestinatarios()),
      ]);
      this.agencias = opciones.agencias;
      this.destinatarios = destinatarios;
      if (this.agencias.length === 1) this.form.agenciaId = this.agencias[0].id;
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        const d = await firstValueFrom(this.api.getDetalle(id));
        if (!d.permisos.puedeEditar) {
          void this.router.navigate(['/informes-inspeccion', id], { replaceUrl: true });
          return;
        }
        this.aplicar(d);
      }
    } catch (e) {
      this.errorCarga = mensajeError(e, 'No se pudo cargar el formulario.');
    } finally {
      this.cargando = false;
    }
  }

  private aplicar(d: InformeDetalle): void {
    this.detalle = d;
    this.destinatarioLibre = !d.destinatarioId;
    this.form = {
      agenciaId: d.agencia.id,
      destinatarioId: d.destinatarioId ?? '',
      destinatarioNombre: d.destinatarioNombre,
      fecha: d.fecha,
      fechaVisita: aLocal(d.fechaVisita),
      tipoInspeccion: d.tipoInspeccion,
      asunto: d.asunto,
      antecedentes: d.antecedentes,
      desarrollo: d.desarrollo,
      actividadesGeneral: d.actividadesGeneral,
      planesGeneral: d.planesGeneral,
      observacionesJefeTaller: d.observacionesJefeTaller,
      calificacion: d.calificacion,
      novedades: d.novedades.map((n) => ({ ...n, fotos: [...n.fotos] })),
      actividades: d.actividades.map((a) => ({ ...a, fotos: [...a.fotos] })),
      planes: d.planes.map((p) => ({ ...p, evidenciaCumplimiento: [...p.evidenciaCumplimiento] })),
    };
  }

  irA(n: number): void {
    this.paso = Math.min(this.pasos.length, Math.max(1, n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  alternarDestinatario(): void {
    this.destinatarioLibre = !this.destinatarioLibre;
    this.form.destinatarioId = '';
    this.form.destinatarioNombre = '';
  }

  /** Al elegir la agencia se marca solo su líder como destinatario (PARA), salvo que ya hayas elegido a otra persona. */
  elegirAgencia(id: string): void {
    const antes = this.liderAuto;
    this.form.agenciaId = id;
    const lider = this.agencias.find((a) => a.id === id)?.lider;
    if (!this.editable || this.destinatarioLibre) return;
    const libre = !this.form.destinatarioId || this.form.destinatarioId === antes;
    if (lider && libre && this.destinatarios.some((d) => d.id === lider.id)) {
      this.form.destinatarioId = lider.id;
      this.form.destinatarioNombre = lider.nombre;
      this.liderAuto = lider.id;
      this.avisoAgencia = `Líder de la agencia marcado como destinatario: ${lider.nombre}.`;
    } else if (!lider && this.form.destinatarioId === antes && antes) {
      this.form.destinatarioId = '';
      this.form.destinatarioNombre = '';
      this.liderAuto = '';
      this.avisoAgencia = '';
    }
  }

  /** Si el destinatario es un líder o un pulidor fijo, se marca solo su agencia; el pulidor móvil no tiene y se elige a mano. */
  elegirDestinatario(id: string): void {
    this.form.destinatarioId = id;
    this.liderAuto = '';
    const d = this.destinatarios.find((x) => x.id === id);
    this.form.destinatarioNombre = d?.nombre ?? '';
    this.avisoAgencia = '';
    if (!d || (d.rol !== 'LIDER' && d.rol !== 'BACKUP' && d.rol !== 'PULIDOR')) return;
    if (d.agenciaId && this.agencias.some((a) => a.id === d.agenciaId)) {
      this.form.agenciaId = d.agenciaId;
      this.avisoAgencia = `Agencia marcada automáticamente: ${d.cargo} de ${this.agencias.find((a) => a.id === d.agenciaId)?.nombre}.`;
    } else if (d.rol === 'PULIDOR' && !d.agenciaId) {
      this.avisoAgencia = 'Pulidor móvil: no tiene agencia fija, elige la agencia que se inspecciona.';
    }
  }

  agregarNovedad(): void { this.form.novedades.push({ titulo: '', descripcion: '', categoria: 'OTROS', prioridad: 'MEDIA', area: '', fotos: [], estadoSeguimiento: 'ABIERTA' }); }
  agregarActividad(): void { this.form.actividades.push({ nombre: '', descripcion: '', responsable: '', fecha: null, resultado: '', observaciones: '', fotos: [] }); }
  agregarPlan(): void { this.form.planes.push({ problema: '', accionRequerida: '', areaResponsable: '', personaResponsable: '', fechaCompromiso: null, prioridad: 'MEDIA', estado: 'PENDIENTE', observaciones: '', evidenciaCumplimiento: [] }); }
  quitar<T>(lista: T[], i: number): void { lista.splice(i, 1); }

  vencido(p: PlanAccion): boolean {
    return (p.estado === 'PENDIENTE' || p.estado === 'EN_PROCESO') && !!p.fechaCompromiso && p.fechaCompromiso < new Date().toISOString().slice(0, 10);
  }

  nombreEstado = (id: string) => ({ BORRADOR: 'Borrador', EN_REVISION: 'En revisión', APROBADO: 'Aprobado', RECHAZADO: 'Rechazado', CERRADO: 'Cerrado' } as Record<string, string>)[id] ?? id;
  nombreCalificacion = (id: string) => CALIFICACIONES.find((c) => c.id === id)?.nombre ?? id;

  /** Lo que se manda al servidor: solo lo vacío se omite; las novedades, actividades y planes sin título no se guardan. */
  private payload(): GuardarInforme {
    const f = this.form;
    return {
      ...(this.detalle ? { id: this.detalle.id } : {}),
      agenciaId: f.agenciaId,
      ...(f.destinatarioId && !this.destinatarioLibre ? { destinatarioId: f.destinatarioId } : {}),
      destinatarioNombre: this.vistaPara,
      fecha: f.fecha,
      fechaVisita: f.fechaVisita ? new Date(f.fechaVisita).toISOString() : undefined,
      tipoInspeccion: f.tipoInspeccion,
      asunto: f.asunto,
      antecedentes: f.antecedentes,
      desarrollo: f.desarrollo,
      actividadesGeneral: f.actividadesGeneral,
      planesGeneral: f.planesGeneral,
      ...(this.puedeCalificar ? { observacionesJefeTaller: f.observacionesJefeTaller, ...(f.calificacion ? { calificacion: f.calificacion } : {}) } : {}),
      novedades: f.novedades.filter((n) => n.titulo.trim()),
      actividades: f.actividades.filter((a) => a.nombre.trim()).map((a) => ({ ...a, fecha: a.fecha || null })),
      planes: f.planes.filter((p) => p.problema.trim()).map((p) => ({ ...p, fechaCompromiso: p.fechaCompromiso || null })),
    };
  }

  async guardar(silencioso = false): Promise<boolean> {
    this.errorGuardado = '';
    if (!this.form.agenciaId) {
      this.errorGuardado = 'Elige la agencia inspeccionada para guardar el borrador (paso 1).';
      this.irA(1);
      return false;
    }
    this.guardando = true;
    try {
      const datos = this.payload();
      const d = await firstValueFrom(this.detalle ? this.api.actualizar(datos) : this.api.crear(datos));
      const eraNuevo = !this.detalle;
      this.aplicar(d);
      if (eraNuevo) void this.router.navigate(['/informes-inspeccion', d.id, 'editar'], { replaceUrl: true });
      if (!silencioso) this.toast.success('Borrador guardado', `${d.numero} se guardó correctamente.`);
      return true;
    } catch (e) {
      this.errorGuardado = mensajeError(e, 'No se pudo guardar el borrador.');
      return false;
    } finally {
      this.guardando = false;
    }
  }

  async enviar(): Promise<void> {
    if (this.faltantes.length) return;
    if (!(await this.guardar(true)) || !this.detalle) return;
    this.guardando = true;
    try {
      const d = await firstValueFrom(this.api.enviar(this.detalle.id));
      this.toast.success('Enviado a revisión', `${d.numero} quedó en revisión.`);
      void this.router.navigate(['/informes-inspeccion', d.id]);
    } catch (e) {
      this.errorGuardado = mensajeError(e, 'No se pudo enviar a revisión.');
    } finally {
      this.guardando = false;
    }
  }

  async vistaPdf(): Promise<void> {
    if (!(await this.guardar(true)) || !this.detalle) return;
    this.generando = true;
    try {
      await descargarPdfInforme(this.detalle, this.storage);
    } catch (e) {
      this.toast.error('No se pudo generar el PDF', mensajeError(e));
    } finally {
      this.generando = false;
    }
  }
}

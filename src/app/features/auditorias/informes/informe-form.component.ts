import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InformesInspeccionService } from '../../../core/services/informes-inspeccion.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ConfirmarService } from '../../../shared/services/confirmar.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import {
  Actividad,
  CALIFICACIONES,
  CATEGORIAS_NOVEDAD,
  Calificacion,
  FirmaInforme,
  GuardarInforme,
  InformeDetalle,
  Novedad,
  OpcionAgencia,
  OpcionSello,
  PlanAccion,
  TIPOS_INSPECCION,
  mensajeError,
} from '../../../core/models/auditorias.model';
import { EvidenciasFotosComponent } from '../shared/evidencias-fotos.component';
import { FirmaModalComponent, type FirmaCapturada } from '../shared/firma-modal.component';
import { FirmaImagenComponent } from '../shared/firma-imagen.component';
import { SelectSearchComponent } from '../../../shared/components/select-search/select-search.component';
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
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, EvidenciasFotosComponent, FirmaModalComponent, FirmaImagenComponent, SelectSearchComponent],
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
          @if (bloqueadoPorFirmas && !desbloqueado && paso <= 6) {
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3" role="status">
              <i-lucide name="lock" class="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true"></i-lucide>
              <p class="text-sm text-amber-900 flex-1"><strong>Este informe ya tiene firmas.</strong> Su contenido está bloqueado. Si lo modificas, esas firmas se anulan y las mismas personas deberán firmar de nuevo.</p>
              <button type="button" class="btn btn-secondary btn-sm shrink-0" (click)="desbloquear()">Modificar de todos modos</button>
            </div>
          }
          @switch (paso) {
            @case (1) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Información general</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="field-label" for="f-para">PARA (destinatario del informe) *</label>
                  <input id="f-para" class="field" [(ngModel)]="form.destinatarioNombre" placeholder="Nombre y cargo del destinatario" maxlength="160" [disabled]="!contenidoEditable">
                </div>
                <div>
                  <label class="field-label" for="f-de">DE (responsable del informe)</label>
                  <input id="f-de" class="field" [value]="detalle?.inspectorNombre || usuarioNombre" disabled>
                  <p class="text-[11px] text-slate-500 mt-1">Es el usuario con sesión iniciada.</p>
                </div>
                <div>
                  <label class="field-label" for="f-fecha">FECHA *</label>
                  <input id="f-fecha" type="date" class="field" [(ngModel)]="form.fecha" [disabled]="!contenidoEditable">
                </div>
                <div>
                  <label class="field-label" for="f-num">N.º DE VISITA</label>
                  <input id="f-num" class="field" [value]="detalle ? detalle.numeroMensual + '  ·  ' + detalle.numero : 'Automático al guardar'" disabled>
                </div>
              </div>

              <div class="rounded-xl border border-dashed border-slate-300 p-4 space-y-4">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Datos de gestión digital (no están en el documento impreso)</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="field-label" for="f-agencia">Agencia inspeccionada *</label>
                    <select id="f-agencia" class="field" [ngModel]="form.agenciaId" (ngModelChange)="elegirAgencia($event)" [disabled]="!contenidoEditable">
                      <option value="">Selecciona la agencia…</option>
                      @for (a of agencias; track a.id) { <option [value]="a.id">{{ a.nombre }}</option> }
                    </select>
                  </div>
                  <div>
                    <label class="field-label" for="f-visita">Fecha y hora de la visita</label>
                    <input id="f-visita" type="datetime-local" class="field" [(ngModel)]="form.fechaVisita" [disabled]="!contenidoEditable">
                  </div>
                  <div>
                    <label class="field-label" for="f-tipo">Tipo de informe</label>
                    <select id="f-tipo" class="field" [(ngModel)]="form.tipoInspeccion" [disabled]="!contenidoEditable">
                      @for (t of tipos; track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
                    </select>
                  </div>
                </div>
                <p class="text-xs text-slate-500">Estado del informe: <strong>{{ detalle ? nombreEstado(detalle.estado) : 'Borrador (aún sin guardar)' }}</strong></p>
              </div>
            }

            @case (2) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Asunto y antecedentes</h2>
              <div>
                <label class="field-label" for="f-asunto">ASUNTO *</label>
                <input id="f-asunto" class="field" [(ngModel)]="form.asunto" maxlength="300" placeholder="Motivo principal de la inspección" [disabled]="!contenidoEditable">
              </div>
              <div>
                <label class="field-label" for="f-ant">ANTECEDENTES</label>
                <textarea id="f-ant" class="field" rows="7" [(ngModel)]="form.antecedentes" placeholder="Inspecciones previas, problemas reportados y contexto de la visita" [disabled]="!contenidoEditable"></textarea>
              </div>
            }

            @case (3) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Desarrollo y novedades encontradas</h2>
              <div>
                <label class="field-label" for="f-des">DESARROLLO Y NOVEDADES ENCONTRADAS (descripción general)</label>
                <textarea id="f-des" class="field" rows="6" [(ngModel)]="form.desarrollo" placeholder="Lo encontrado durante la inspección" [disabled]="!contenidoEditable"></textarea>
              </div>
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-extrabold text-slate-800">Novedades individuales ({{ form.novedades.length }})</h3>
                @if (contenidoEditable) { <button type="button" class="btn btn-secondary btn-sm" (click)="agregarNovedad()"><i-lucide name="plus" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Agregar novedad</button> }
              </div>
              @for (n of form.novedades; track $index) {
                <article class="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs font-bold text-slate-500">Novedad {{ $index + 1 }}@if (n.registradaEn) { · registrada {{ n.registradaEn | date:'dd/MM/yyyy HH:mm' }} }</p>
                    @if (contenidoEditable) { <button type="button" class="btn-icon hover:!text-rose-600" (click)="quitar(form.novedades, $index)" aria-label="Quitar novedad"><i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide></button> }
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="sm:col-span-2"><label class="field-label">Título *</label><input class="field" [(ngModel)]="n.titulo" maxlength="160" [disabled]="!contenidoEditable"></div>
                    <div class="sm:col-span-2"><label class="field-label">Descripción</label><textarea class="field" rows="3" [(ngModel)]="n.descripcion" [disabled]="!contenidoEditable"></textarea></div>
                    <div><label class="field-label">Categoría</label>
                      <select class="field" [(ngModel)]="n.categoria" [disabled]="!contenidoEditable">@for (c of categorias; track c.id) { <option [value]="c.id">{{ c.nombre }}</option> }</select></div>
                    <div><label class="field-label">Área relacionada</label><input class="field" [(ngModel)]="n.area" maxlength="120" placeholder="Ej. bahía 2, bodega" [disabled]="!contenidoEditable"></div>
                  </div>
                  <div><label class="field-label">Evidencias fotográficas</label>
                    <app-evidencias-fotos [fotos]="n.fotos" (fotosChange)="n.fotos = $event" [agenciaId]="form.agenciaId" tipo="informes" [referenciaId]="detalle?.id" [deshabilitado]="!contenidoEditable"></app-evidencias-fotos></div>
                </article>
              }
              @if (!form.novedades.length) { <p class="text-sm text-slate-500">Aún no hay novedades individuales. Son opcionales: puedes describir todo en el texto general.</p> }
            }

            @case (4) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Actividades realizadas en la agencia durante la visita</h2>
              <div>
                <label class="field-label" for="f-act">Descripción general</label>
                <textarea id="f-act" class="field" rows="5" [(ngModel)]="form.actividadesGeneral" [disabled]="!contenidoEditable"></textarea>
              </div>
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-extrabold text-slate-800">Lista de actividades ({{ form.actividades.length }})</h3>
                @if (contenidoEditable) { <button type="button" class="btn btn-secondary btn-sm" (click)="agregarActividad()"><i-lucide name="plus" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Agregar actividad</button> }
              </div>
              @for (a of form.actividades; track $index) {
                <article class="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs font-bold text-slate-500">Actividad {{ $index + 1 }}</p>
                    @if (contenidoEditable) { <button type="button" class="btn-icon hover:!text-rose-600" (click)="quitar(form.actividades, $index)" aria-label="Quitar actividad"><i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide></button> }
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="sm:col-span-2"><label class="field-label">Nombre de la actividad *</label><input class="field" [(ngModel)]="a.nombre" maxlength="160" [disabled]="!contenidoEditable"></div>
                    <div class="sm:col-span-2"><label class="field-label">Descripción</label><textarea class="field" rows="2" [(ngModel)]="a.descripcion" [disabled]="!contenidoEditable"></textarea></div>
                  </div>
                  <div><label class="field-label">Evidencias (opcional)</label>
                    <app-evidencias-fotos [fotos]="a.fotos" (fotosChange)="a.fotos = $event" [agenciaId]="form.agenciaId" tipo="informes" [referenciaId]="detalle?.id" [deshabilitado]="!contenidoEditable"></app-evidencias-fotos></div>
                </article>
              }
            }

            @case (5) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Planes de acción pendientes de otras áreas</h2>
              <div>
                <label class="field-label" for="f-pla">Descripción general</label>
                <textarea id="f-pla" class="field" rows="4" [(ngModel)]="form.planesGeneral" [disabled]="!contenidoEditable"></textarea>
              </div>
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-sm font-extrabold text-slate-800">Planes de acción ({{ form.planes.length }})</h3>
                @if (contenidoEditable) { <button type="button" class="btn btn-secondary btn-sm" (click)="agregarPlan()"><i-lucide name="plus" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Agregar plan</button> }
              </div>
              @for (p of form.planes; track $index) {
                <article class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs font-bold text-slate-500">Plan {{ $index + 1 }}</p>
                    @if (contenidoEditable) { <button type="button" class="btn-icon hover:!text-rose-600" (click)="quitar(form.planes, $index)" aria-label="Quitar plan"><i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide></button> }
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="sm:col-span-2"><label class="field-label">Descripción del problema *</label><textarea class="field" rows="2" [(ngModel)]="p.problema" [disabled]="!contenidoEditable"></textarea></div>
                    <div class="sm:col-span-2"><label class="field-label">Acción requerida</label><textarea class="field" rows="2" [(ngModel)]="p.accionRequerida" [disabled]="!contenidoEditable"></textarea></div>
                    <p class="sm:col-span-2 text-xs font-semibold text-slate-500">Responsable: la agencia del informe · Fecha: el día en que se crea el plan.</p>
                  </div>
                  <div><label class="field-label">Evidencia de cumplimiento</label>
                    <app-evidencias-fotos [fotos]="p.evidenciaCumplimiento" (fotosChange)="p.evidenciaCumplimiento = $event" [agenciaId]="form.agenciaId" tipo="informes" [referenciaId]="detalle?.id" [deshabilitado]="!contenidoEditable"></app-evidencias-fotos></div>
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
                <textarea id="f-obs" class="field" rows="6" [(ngModel)]="form.observacionesJefeTaller" [disabled]="!contenidoEditable || !puedeCalificar"></textarea>
              </div>
              <fieldset [disabled]="!contenidoEditable || !puedeCalificar">
                <legend class="field-label">CALIFIQUE NUESTRO SERVICIO *</legend>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" role="radiogroup">
                  @for (c of calificaciones; track c.id) {
                    <button type="button" role="radio" [attr.aria-checked]="form.calificacion === c.id" (click)="form.calificacion = c.id; errorSello = ''"
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

              <!-- El jefe de taller se elige y se valida con su contraseña: sin eso no se pasa a las firmas -->
              <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <h3 class="text-sm font-extrabold text-slate-800">Jefe de taller que firma *</h3>
                <div>
                  <p class="field-label" id="lbl-jefe-presente">¿Está el jefe de taller?</p>
                  <div class="grid grid-cols-2 gap-2 max-w-md" role="radiogroup" aria-labelledby="lbl-jefe-presente">
                    <button type="button" role="radio" [attr.aria-checked]="form.jefeTallerPresente" (click)="marcarJefePresente(true)" [disabled]="!contenidoEditable"
                      class="min-h-11 rounded-xl border-2 text-sm font-extrabold transition-colors disabled:opacity-60"
                      [ngClass]="form.jefeTallerPresente ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'">Sí, está</button>
                    <button type="button" role="radio" [attr.aria-checked]="!form.jefeTallerPresente" (click)="marcarJefePresente(false)" [disabled]="!contenidoEditable"
                      class="min-h-11 rounded-xl border-2 text-sm font-extrabold transition-colors disabled:opacity-60"
                      [ngClass]="!form.jefeTallerPresente ? 'bg-slate-200 border-slate-500 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'">No está</button>
                  </div>
                </div>
                @if (form.jefeTallerPresente) {
                @if (!sellos.length) {
                  <p class="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">No hay jefes de taller configurados. Un Admin o Super Admin debe crearlos en «Configuración de sellos».</p>
                }
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="field-label" for="f-jefe">Jefe de taller</label>
                    <app-select-search [opciones]="opcionesSellos" [value]="selloElegido || null" [todasLabel]="null" [clearable]="false" placeholder="Selecciona al jefe de taller…" buscadorPlaceholder="Buscar por nombre…" ariaLabel="Jefe de taller" [disabled]="!editable || !puedeCalificar || (jefeFirmo && !!detalle?.sello?.id)" (valueChange)="elegirJefe($event)"></app-select-search>
                  </div>
                  <div>
                    <label class="field-label" for="f-jefe-pass">Contraseña del jefe de taller</label>
                    <div class="relative">
                      <input id="f-jefe-pass" [type]="verPassword ? 'text' : 'password'" class="field pr-11" autocomplete="new-password" [(ngModel)]="passwordJefe" (ngModelChange)="errorSello = ''" (keydown.enter)="validarSello()" [disabled]="!editable || !puedeCalificar" placeholder="Se pide para firmar">
                      <button type="button" class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800 rounded-r-xl" (click)="verPassword = !verPassword" [attr.aria-label]="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="verPassword" [title]="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                        <i-lucide [name]="verPassword ? 'eye-off' : 'eye'" class="w-4 h-4" aria-hidden="true"></i-lucide>
                      </button>
                    </div>
                  </div>
                </div>
                @if (selloValidado && selloElegido === detalle?.sello?.id) {
                  <p class="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5"><i-lucide name="check-circle" class="w-4 h-4" aria-hidden="true"></i-lucide> Validado: {{ detalle?.sello?.nombre }} el {{ detalle?.sello?.validadoEn | date:'dd/MM/yyyy HH:mm' }}.</p>
                } @else if (jefeFirmo && detalle?.sello?.id) {
                  <p class="text-xs font-semibold text-amber-800">Este informe ya lo firmó {{ detalle?.sello?.nombre }}: solo el mismo jefe de taller puede volver a firmarlo. Debe ingresar su contraseña otra vez.</p>
                } @else if (jefeFirmo) {
                  <p class="text-xs font-semibold text-amber-800">Este informe ya lo firmó {{ detalle?.sello?.nombre }} y su sello ya no existe. Elige al jefe de taller con ese mismo nombre e ingresa su contraseña.</p>
                }
                <div class="flex flex-wrap items-center gap-2">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="validarSello()" [disabled]="validando || !selloElegido || !passwordJefe || !editable || !puedeCalificar">
                    <i-lucide name="lock" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> {{ validando ? 'Validando…' : 'Validar contraseña' }}
                  </button>
                  <span class="text-xs text-slate-500">{{ !selloElegido ? 'Elige primero al jefe de taller.' : !passwordJefe ? 'Escribe la contraseña del jefe de taller para validarla.' : 'Para pasar a las firmas hay que validar al jefe de taller.' }}</span>
                </div>
                } @else {
                  <p class="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg p-3">El jefe de taller no estuvo en la visita, así que no hay contraseña que validar. En Firmas, el taller firma escribiendo el nombre y apellido de quien lo representa.</p>
                }
                <!-- El aviso se ve con o sin jefe de taller (p. ej. «Selecciona la calificación del servicio») -->
                @if (errorSello) { <p class="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5" role="alert">{{ errorSello }}</p> }
              </div>
            }

            @case (7) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Firmas</h2>
              <p class="text-sm text-slate-600">Aquí se firman tres: responsable, taller y líder de bahía. Al guardar, el informe queda pendiente de aprobación y un Admin o Super Admin lo aprueba y firma la recepción.</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                @for (f of firmas; track f.tipo) {
                  @if (f.tipo === 'RECEPCION') {
                    <article class="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                      <div class="flex items-center justify-between gap-2"><h3 class="text-sm font-extrabold text-slate-600">{{ f.etiqueta }}</h3><span class="badge badge-neutral">Se firma al aprobar</span></div>
                      <p class="text-xs text-slate-500">La firma de recepción la hace un Admin o Super Admin cuando aprueba el informe ya guardado.</p>
                    </article>
                  } @else {
                  <article class="rounded-xl border p-4 space-y-3" [ngClass]="f.firmada ? 'border-emerald-200 bg-emerald-50/40' : f.desactualizada ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'">
                    <div class="flex items-center justify-between gap-2">
                      <h3 class="text-sm font-extrabold text-slate-800">{{ f.etiqueta }}</h3>
                      <span class="badge" [ngClass]="f.firmada ? 'badge-ok' : f.desactualizada ? 'badge-warn' : 'badge-neutral'">{{ f.firmada ? 'Firmada' : f.desactualizada ? 'Debe firmar de nuevo' : 'Pendiente' }}</span>
                    </div>
                    <app-firma-imagen [imagen]="f.imagen" [marcaAgua]="f.tipo === 'JEFE_TALLER' ? (detalle?.sello?.logo ?? null) : null" [etiqueta]="f.etiqueta" [atenuada]="f.desactualizada"></app-firma-imagen>
                    <div>
                      <label class="block text-[11px] font-bold text-slate-500 mb-1" [attr.for]="'firma-nombre-' + f.tipo">Nombre de quien firma</label>
                      @if (f.tipo === 'LIDER_BAHIA' && !f.nombre && editable && opcionesFirmanteLider.length > 1) {
                        <!-- Primero se elige de la lista de la agencia (líder, backup, auxiliares); si firma otra persona, se elige «Otro» y se escribe su nombre -->
                        <app-select-search class="block mb-1.5" [opciones]="opcionesFirmanteLider" [value]="firmanteLiderValor" [todasLabel]="null" [clearable]="false" placeholder="Elige quién firma…" buscadorPlaceholder="Buscar por nombre…" ariaLabel="Quién firma como líder de bahía" (valueChange)="elegirFirmanteLider(f, $event)"></app-select-search>
                      }
                      @if ((f.tipo === 'JEFE_TALLER' && form.jefeTallerPresente) || f.nombre) {
                        <input [id]="'firma-nombre-' + f.tipo" class="input w-full" [value]="nombreDe(f)" disabled>
                      } @else if (f.tipo === 'LIDER_BAHIA' && firmanteLiderValor !== OTRO_FIRMANTE && opcionesFirmanteLider.length > 1) {
                        <input [id]="'firma-nombre-' + f.tipo" class="input w-full" [value]="nombreDe(f)" disabled placeholder="Elige quién firma en la lista">
                      } @else {
                        <input [id]="'firma-nombre-' + f.tipo" class="input w-full" [value]="nombreDe(f)" (input)="cambiarNombre(f, $any($event.target).value)" [ngClass]="!nombreDe(f).trim() ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300' : ''" [placeholder]="f.tipo === 'JEFE_TALLER' ? 'Escribe el nombre y apellido de quien firma por el taller' : 'Escribe el nombre de quien firma'" [disabled]="!editable">
                        @if (!nombreDe(f).trim()) {
                          <p class="mt-1 text-[11px] font-semibold text-amber-800">{{ f.tipo === 'LIDER_BAHIA' ? 'Esta agencia no tiene líder ni auxiliar asignado: escribe el nombre de quien firma como líder.' : 'Escribe el nombre de quien firma para poder firmar.' }}</p>
                        }
                      }
                    </div>
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs text-slate-600 min-w-0 truncate">@if (f.firmada) { {{ f.firmadoEn | date:'dd/MM/yyyy HH:mm' }} } @else if (f.desactualizada) { Debe firmar de nuevo } @else { Sin firmar }</p>
                      @if (editable) {
                        <button type="button" class="btn btn-secondary btn-sm shrink-0" (click)="abrirFirma(f)" [disabled]="!detalle || !nombreDe(f).trim()">
                          <i-lucide name="pen-tool" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> {{ f.desactualizada ? 'Firmar de nuevo' : f.firmada ? 'Volver a firmar' : 'Firmar' }}
                        </button>
                      }
                    </div>
                  </article>
                  }
                }
              </div>
              @if (hayDesactualizadas) {
                <p class="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5" role="status">El contenido cambió después de firmar. Las firmas marcadas «Debe firmar de nuevo» las debe repetir la misma persona que firmó la primera vez.</p>
              }
              @if (form.jefeTallerPresente && !selloValidado) { <p class="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">Primero valida al jefe de taller en el paso de calificación.</p> }
            }

            @case (8) {
              <h2 class="text-lg font-extrabold font-outfit text-slate-900">Vista previa y guardado</h2>
              <div class="rounded-xl border border-slate-300 overflow-hidden text-sm">
                <div class="bg-[#a9c8ec] px-4 py-3 font-extrabold text-[#0b4f9c] text-lg tracking-wide">INFORME DE INSPECCIÓN</div>
                <dl class="grid grid-cols-2 md:grid-cols-4 border-b border-slate-300">
                  <div class="p-3 border-r border-slate-200"><dt class="text-[11px] font-bold text-slate-500">PARA</dt><dd class="font-semibold">{{ vistaPara || '—' }}</dd></div>
                  <div class="p-3 border-r border-slate-200"><dt class="text-[11px] font-bold text-slate-500">DE</dt><dd class="font-semibold">{{ detalle?.inspectorNombre || usuarioNombre }}</dd></div>
                  <div class="p-3 border-r border-slate-200"><dt class="text-[11px] font-bold text-slate-500">FECHA</dt><dd class="font-semibold">{{ form.fecha | date:'dd/MM/yyyy' }}</dd></div>
                  <div class="p-3"><dt class="text-[11px] font-bold text-slate-500">N.º DE VISITA</dt><dd class="font-semibold">{{ detalle?.numeroMensual || '—' }}</dd></div>
                </dl>
                <div class="p-3 border-b border-slate-200"><strong>ASUNTO:</strong> {{ form.asunto || '—' }}</div>
                <div class="p-3 border-b border-slate-300 whitespace-pre-line"><strong>ANTECEDENTES:</strong> {{ form.antecedentes || '—' }}</div>
                <div class="bg-[#a9c8ec] px-3 py-1.5 text-center text-xs font-extrabold">DESARROLLO Y NOVEDADES ENCONTRADAS</div>
                <div class="p-3 whitespace-pre-line">{{ form.desarrollo || '—' }}
                  @for (n of form.novedades; track $index) { <p class="mt-2">• <strong>{{ n.titulo }}</strong> {{ n.descripcion }} <span class="text-slate-500">[{{ n.fotos.length }} foto(s)]</span></p> }
                </div>
                <div class="bg-[#a9c8ec] px-3 py-1.5 text-center text-xs font-extrabold">ACTIVIDADES REALIZADAS EN LA AGENCIA DURANTE LA VISITA</div>
                <div class="p-3 whitespace-pre-line">{{ form.actividadesGeneral || '—' }}
                  @for (a of form.actividades; track $index) { <p class="mt-2">• <strong>{{ a.nombre }}</strong> {{ a.descripcion }}</p> }
                </div>
                <div class="bg-[#a9c8ec] px-3 py-1.5 text-center text-xs font-extrabold">PLANES DE ACCIÓN PENDIENTES DE OTRAS ÁREAS</div>
                <div class="p-3 whitespace-pre-line">{{ form.planesGeneral || '—' }}
                  @for (p of form.planes; track $index) { <p class="mt-2">• <strong>{{ p.problema }}</strong> → {{ p.accionRequerida || '—' }} ({{ p.fechaCompromiso ? (p.fechaCompromiso | date:'dd/MM/yyyy') : 'sin fecha' }})</p> }
                </div>
                <div class="bg-[#a9c8ec] px-3 py-1.5 text-center text-xs font-extrabold">OBSERVACIONES Y APROBACIÓN</div>
                <div class="p-3"><strong>Observaciones del jefe de taller:</strong> {{ form.observacionesJefeTaller || '—' }}<br><strong>Calificación:</strong> {{ form.calificacion ? nombreCalificacion(form.calificacion) : '—' }}</div>
                <div class="bg-[#a9c8ec] px-3 py-1.5 text-center text-xs font-extrabold">FIRMAS</div>
                <div class="p-3 grid grid-cols-2 gap-3">
                  @for (f of firmas; track f.tipo) {
                    <div class="text-center">
                      <app-firma-imagen [imagen]="f.imagen" [marcaAgua]="f.tipo === 'JEFE_TALLER' ? (detalle?.sello?.logo ?? null) : null" [etiqueta]="f.etiqueta" alto="h-16"></app-firma-imagen>
                      <p class="text-[11px] font-bold mt-1">{{ f.etiqueta }}</p>
                      <p class="text-[11px] text-slate-500">{{ f.firmada ? f.nombre : f.tipo === 'RECEPCION' ? 'Se firma al aprobar' : 'Pendiente' }}</p>
                    </div>
                  }
                </div>
              </div>

              @if (faltantes.length) {
                <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800" role="alert">
                  Para guardar el informe falta: {{ faltantes.join(', ') }}.
                </div>
              }
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-secondary" (click)="vistaPdf()" [disabled]="!detalle || generando"><i-lucide name="download" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ generando ? 'Generando…' : 'Vista previa en PDF' }}</button>
              </div>
              @if (!detalle) { <p class="text-xs text-slate-500">Guarda el borrador para generar el PDF.</p> }
              @if (editable) { <p class="text-xs text-slate-500">Al guardar el informe ya no se podrá modificar.</p> }
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
              <button type="button" class="btn btn-primary min-h-11" (click)="siguiente()" [disabled]="validando">Siguiente <i-lucide name="arrow-right" class="w-4 h-4" aria-hidden="true"></i-lucide></button>
            } @else if (editable) {
              <button type="button" class="btn btn-cta min-h-11" (click)="guardarDefinitivo()" [disabled]="guardando || faltantes.length > 0">
                <i-lucide name="lock" class="w-4 h-4" aria-hidden="true"></i-lucide> Guardar informe
              </button>
            }
          </div>
        </div>
      }

      @if (firmando) {
        <app-firma-modal
          [titulo]="'Firma · ' + firmando.etiqueta"
          [marcaAgua]="firmando.tipo === 'JEFE_TALLER' && form.jefeTallerPresente ? (detalle?.sello?.logo ?? null) : null"
          [pedirNombre]="false"
          [nombreInicial]="nombreDe(firmando)"
          (cancelar)="firmando = null"
          (firmada)="registrarFirma($event)"></app-firma-modal>
      }
    </div>
  `,
})
export class InformeFormComponent implements OnInit {
  private readonly api = inject(InformesInspeccionService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmar = inject(ConfirmarService);
  private readonly storage = inject(StorageUploadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly pasos: Paso[] = [
    { id: 1, titulo: 'Información general', corto: 'General', icono: 'file-text' },
    { id: 2, titulo: 'Asunto y antecedentes', corto: 'Asunto', icono: 'list' },
    { id: 3, titulo: 'Desarrollo y novedades', corto: 'Novedades', icono: 'alert-triangle' },
    { id: 4, titulo: 'Actividades realizadas', corto: 'Actividades', icono: 'check-square' },
    { id: 5, titulo: 'Planes de acción', corto: 'Planes', icono: 'clipboard-list' },
    { id: 6, titulo: 'Observaciones y calificación', corto: 'Calificación', icono: 'star' },
    { id: 7, titulo: 'Firmas', corto: 'Firmas', icono: 'pen-tool' },
    { id: 8, titulo: 'Vista previa y guardado', corto: 'Vista previa', icono: 'eye' },
  ];
  readonly tipos = TIPOS_INSPECCION;
  readonly categorias = CATEGORIAS_NOVEDAD;
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
  /** Jefes de taller configurados (solo nombre) para elegir al calificar. */
  sellos: OpcionSello[] = [];
  selloElegido = '';
  passwordJefe = '';
  verPassword = false;
  /** Se eligió modificar un informe que ya tenía firmas (las anulará al cambiar el contenido). */
  desbloqueado = false;
  errorSello = '';
  validando = false;
  /** Firma que se está capturando en el modal. */
  firmando: FirmaInforme | null = null;

  form = this.formularioVacio();

  get pasoActual(): Paso { return this.pasos[this.paso - 1]; }
  get progreso(): number { return Math.round((this.paso / this.pasos.length) * 100); }
  get editable(): boolean { return !this.detalle || this.detalle.permisos.puedeEditar; }
  get selloValidado(): boolean { return !!this.detalle?.sello?.validadoEn; }
  /** Con al menos una firma vigente el contenido queda protegido: cambiarlo anula esas firmas. */
  get bloqueadoPorFirmas(): boolean { return !!this.detalle && this.firmas.some((f) => f.firmada); }
  get contenidoEditable(): boolean { return this.editable && (!this.bloqueadoPorFirmas || this.desbloqueado); }
  get hayDesactualizadas(): boolean { return this.firmas.some((f) => f.desactualizada); }
  /** El jefe de taller ya firmó (aunque su firma esté anulada): solo ese mismo puede volver a firmar. */
  get jefeFirmo(): boolean { return this.firmas.some((f) => f.tipo === 'JEFE_TALLER' && (f.firmada || f.desactualizada)); }
  get opcionesSellos() { return this.sellos.map((s) => ({ value: s.id, label: s.nombreCompleto })); }

  async desbloquear(): Promise<void> {
    const ok = await this.confirmar.pedir({
      titulo: 'Modificar un informe firmado',
      mensaje: 'El informe ya tiene firmas. Si cambias su contenido, esas firmas se anularán y las mismas personas deberán firmar de nuevo. ¿Quieres modificarlo?',
      textoConfirmar: 'Sí, modificar',
      tipo: 'peligro',
      icono: 'alert-triangle',
    });
    if (ok) this.desbloqueado = true;
  }

  marcarJefePresente(presente: boolean): void {
    this.form.jefeTallerPresente = presente;
    this.errorSello = '';
  }

  elegirJefe(id: string | null): void {
    this.selloElegido = id ?? '';
    this.errorSello = '';
  }
  get firmas(): FirmaInforme[] { return this.detalle?.firmas ?? []; }

  /** El destinatario es solo un campo de texto: se escribe quién recibe el informe. */
  get vistaPara(): string {
    return this.form.destinatarioNombre;
  }

  get faltantes(): string[] {
    const f: string[] = [];
    if (!this.form.agenciaId) f.push('la agencia');
    if (!this.vistaPara.trim()) f.push('el destinatario (PARA)');
    if (!this.form.asunto.trim()) f.push('el asunto');
    if (!this.form.desarrollo.trim() && !this.form.novedades.length) f.push('el desarrollo o al menos una novedad');
    if (!this.form.calificacion) f.push('la calificación del servicio');
    if (this.form.jefeTallerPresente && !this.selloValidado) f.push('el jefe de taller con su contraseña');
    for (const x of this.firmas) {
      if (x.tipo === 'RECEPCION') continue; // la firma el Admin al aprobar
      if (!x.firmada) f.push(`la firma de ${x.etiqueta.toLowerCase()}`);
    }
    if (!this.detalle) f.push('las tres firmas');
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
      jefeTallerPresente: true,
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
      const opciones = await firstValueFrom(this.api.getOpciones());
      this.agencias = opciones.agencias;
      if (this.agencias.length === 1) this.form.agenciaId = this.agencias[0].id;
      if (this.puedeCalificar) this.sellos = await firstValueFrom(this.api.getSellos()).catch(() => []);
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

  /** Lo último que se guardó o cargó, tal como viaja al servidor: permite saber si el formulario cambió desde entonces. */
  private huellaGuardada = '';

  private aplicar(d: InformeDetalle): void {
    this.detalle = d;
    if (d.sello?.id) this.selloElegido = d.sello.id;
    this.form = {
      agenciaId: d.agencia.id,
      destinatarioId: '',
      destinatarioNombre: d.destinatarioNombre,
      fecha: d.fecha,
      fechaVisita: aLocal(d.fechaVisita),
      tipoInspeccion: d.tipoInspeccion,
      jefeTallerPresente: d.jefeTallerPresente,
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
    this.huellaGuardada = JSON.stringify(this.payload());
  }

  /**
   * Guarda el borrador solo si el formulario cambió desde la última vez que se guardó o cargó. Abrir una firma, validar la
   * contraseña o pasar de paso no deben reenviar todo el informe cuando no se tocó nada: antes cada firma esperaba un guardado completo.
   */
  private async guardarSiCambio(): Promise<boolean> {
    if (this.detalle && this.huellaGuardada && JSON.stringify(this.payload()) === this.huellaGuardada) return true;
    return this.guardar(true);
  }

  irA(n: number): void {
    const destino = Math.min(this.pasos.length, Math.max(1, n));
    // Las firmas y el guardado exigen al jefe de taller validado con su contraseña.
    if (destino > 6 && this.editable && this.form.jefeTallerPresente && !this.selloValidado) {
      this.paso = 6;
      this.errorSello = 'Selecciona al jefe de taller e ingresa su contraseña para pasar a las firmas.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.paso = destino;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** «Siguiente»: desde la calificación valida al jefe de taller (si ya escribió su contraseña) antes de pasar a las firmas. */
  async siguiente(): Promise<void> {
    if (this.paso === 6 && this.editable) {
      if (this.puedeCalificar && !this.form.calificacion) { this.errorSello = 'Selecciona la calificación del servicio.'; return; }
      if (!this.form.jefeTallerPresente) {
        // Sin jefe de taller no hay contraseña que validar: se guarda que no estuvo y se sigue a las firmas.
        if (!(await this.guardarSiCambio())) return;
        this.irA(this.paso + 1);
        return;
      }
      const yaValidado = this.selloValidado && this.selloElegido === this.detalle?.sello?.id && !this.passwordJefe;
      if (!yaValidado) {
        if (!this.selloElegido) { this.errorSello = 'Selecciona al jefe de taller.'; return; }
        if (!this.passwordJefe) { this.errorSello = 'Ingresa la contraseña del jefe de taller para continuar.'; return; }
        if (!(await this.validarSello())) return;
      }
    }
    this.irA(this.paso + 1);
  }

  /** Guarda el borrador (con la calificación) y valida al jefe de taller con su contraseña. */
  async validarSello(): Promise<boolean> {
    if (!this.selloElegido || !this.passwordJefe || this.validando) return false;
    this.errorSello = '';
    if (!(await this.guardarSiCambio()) || !this.detalle) {
      this.errorSello = this.errorGuardado || 'No se pudo guardar el borrador antes de validar la contraseña.';
      return false;
    }
    this.validando = true;
    try {
      this.detalle = await firstValueFrom(this.api.validarSello(this.detalle.id, this.selloElegido, this.passwordJefe));
      this.passwordJefe = '';
      this.toast.success('Jefe de taller validado', `${this.detalle.sello?.nombre ?? ''} puede firmar el informe.`);
      return true;
    } catch (e) {
      this.errorSello = mensajeError(e, 'No se pudo validar al jefe de taller.');
      return false;
    } finally {
      this.validando = false;
    }
  }

  async abrirFirma(f: FirmaInforme): Promise<void> {
    // Lo que se haya cambiado en el formulario (por ejemplo, que el jefe no estuvo) se guarda antes de firmar.
    if (!(await this.guardarSiCambio()) || !this.detalle) return;
    if (f.tipo === 'JEFE_TALLER' && this.form.jefeTallerPresente && !this.selloValidado) { this.errorGuardado = 'Primero valida al jefe de taller en el paso de calificación.'; return; }
    if (!this.nombreDe(f).trim()) { this.errorGuardado = 'Escribe el nombre de quien firma.'; return; }
    this.errorGuardado = '';
    this.firmando = f;
  }

  /** Quienes pueden firmar como líder de bahía en la agencia elegida: su líder y su auxiliar (si los tiene). */
  get opcionesLider(): { etiqueta: string; nombre: string }[] {
    const a = this.agencias.find((x) => x.id === this.form.agenciaId);
    const lista: { etiqueta: string; nombre: string }[] = [];
    if (a?.lider?.nombre) lista.push({ etiqueta: 'Líder', nombre: a.lider.nombre });
    if (a?.auxiliar?.nombre) lista.push({ etiqueta: 'Auxiliar', nombre: a.auxiliar.nombre });
    return lista;
  }

  readonly OTRO_FIRMANTE = '__otro__';
  /** Lo elegido en la lista del líder de bahía: el id de una persona de la agencia, «Otro» o nada. */
  firmanteLiderValor: string | null = null;

  /** Lista de quienes pueden firmar como líder de bahía en la agencia: líder, backup asignado y auxiliares, más «Otro». */
  get opcionesFirmanteLider(): { value: string; label: string }[] {
    const a = this.agencias.find((x) => x.id === this.form.agenciaId);
    const personas = (a?.firmantes ?? []).map((p) => ({ value: p.id, label: `${p.etiqueta}: ${p.nombre}` }));
    return [...personas, { value: this.OTRO_FIRMANTE, label: 'Otro (escribir el nombre)' }];
  }

  elegirFirmanteLider(f: FirmaInforme, id: string | null): void {
    this.firmanteLiderValor = id;
    if (id === this.OTRO_FIRMANTE) { this.nombresFirmantes[f.tipo] = ''; return; }
    const a = this.agencias.find((x) => x.id === this.form.agenciaId);
    this.nombresFirmantes[f.tipo] = a?.firmantes?.find((p) => p.id === id)?.nombre ?? '';
  }

  /** Nombres escritos a mano en cada tarjeta de firma (solo mientras nadie ha firmado). */
  nombresFirmantes: Record<string, string> = {};

  /** Nombre que va en la firma: el de quien ya firmó, el del sello del taller, lo que se escribió o el sugerido. */
  nombreDe(f: FirmaInforme): string {
    if (f.tipo === 'JEFE_TALLER' && this.form.jefeTallerPresente) return this.detalle?.sello?.nombre ?? '';
    if (f.nombre) return f.nombre;
    return this.nombresFirmantes[f.tipo] ?? this.nombreSugerido(f);
  }

  cambiarNombre(f: FirmaInforme, valor: string): void {
    this.nombresFirmantes[f.tipo] = valor;
  }

  /** Nombre que el modal propone: el de quien elabora el informe y el líder de la agencia, si se conoce. */
  nombreSugerido(f: FirmaInforme): string {
    if (f.nombre && f.tipo !== 'JEFE_TALLER') return f.nombre; // quien firmó la primera vez es quien vuelve a firmar
    if (f.tipo === 'RESPONSABLE') return this.detalle?.inspectorNombre || this.usuarioNombre;
    // Con lista de la agencia no se propone a nadie: se elige primero quién firma. Sin lista, se escribe el nombre.
    if (f.tipo === 'LIDER_BAHIA') return this.opcionesFirmanteLider.length > 1 ? '' : this.opcionesLider[0]?.nombre ?? '';
    return '';
  }

  async registrarFirma(c: FirmaCapturada): Promise<void> {
    const f = this.firmando;
    if (!f || !this.detalle) return;
    try {
      // Solo cambia el estado de las firmas: lo que se haya escrito en el formulario sin guardar no se toca.
      this.detalle = await firstValueFrom(this.api.firmar(this.detalle.id, f.tipo, c.imagen, f.tipo === 'JEFE_TALLER' && this.form.jefeTallerPresente ? undefined : this.nombreDe(f).trim()));
      this.toast.success('Firma registrada', `Firma de ${f.etiqueta.toLowerCase()} guardada.`);
      this.firmando = null;
    } catch (e) {
      this.toast.error('No se pudo guardar la firma', mensajeError(e));
    }
  }

  elegirAgencia(id: string): void {
    this.form.agenciaId = id;
  }

  agregarNovedad(): void { this.form.novedades.push({ titulo: '', descripcion: '', categoria: 'OTROS', area: '', fotos: [] }); }
  agregarActividad(): void { this.form.actividades.push({ nombre: '', descripcion: '', fotos: [] }); }
  agregarPlan(): void { this.form.planes.push({ problema: '', accionRequerida: '', areaResponsable: '', personaResponsable: '', fechaCompromiso: null, prioridad: 'MEDIA', estado: 'PENDIENTE', observaciones: '', evidenciaCumplimiento: [] }); }
  quitar<T>(lista: T[], i: number): void { lista.splice(i, 1); }

  nombreEstado = (id: string) => ({ BORRADOR: 'Borrador', GUARDADO: 'Guardado' } as Record<string, string>)[id] ?? id;
  nombreCalificacion = (id: string) => CALIFICACIONES.find((c) => c.id === id)?.nombre ?? id;

  /** Lo que se manda al servidor: solo lo vacío se omite; las novedades, actividades y planes sin título no se guardan. */
  private payload(): GuardarInforme {
    const f = this.form;
    return {
      ...(this.detalle ? { id: this.detalle.id } : {}),
      agenciaId: f.agenciaId,
      destinatarioNombre: this.vistaPara,
      fecha: f.fecha,
      fechaVisita: f.fechaVisita ? new Date(f.fechaVisita).toISOString() : undefined,
      tipoInspeccion: f.tipoInspeccion,
      jefeTallerPresente: f.jefeTallerPresente,
      asunto: f.asunto,
      antecedentes: f.antecedentes,
      desarrollo: f.desarrollo,
      actividadesGeneral: f.actividadesGeneral,
      planesGeneral: f.planesGeneral,
      ...(this.puedeCalificar ? { observacionesJefeTaller: f.observacionesJefeTaller, ...(f.calificacion ? { calificacion: f.calificacion } : {}) } : {}),
      novedades: f.novedades.filter((n) => n.titulo.trim()),
      actividades: f.actividades.filter((a) => a.nombre.trim()),
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
      // Solo se cambia la dirección: navegar a la otra ruta recrearía el formulario y lo devolvería al paso 1.
      if (eraNuevo) this.location.replaceState(`/informes-inspeccion/${d.id}/editar`);
      if (!silencioso) this.toast.success('Borrador guardado', `${d.numero} se guardó correctamente.`);
      return true;
    } catch (e) {
      this.errorGuardado = mensajeError(e, 'No se pudo guardar el borrador.');
      return false;
    } finally {
      this.guardando = false;
    }
  }

  /** Guarda el informe de forma definitiva: desde ahí ya no se puede modificar. */
  async guardarDefinitivo(): Promise<void> {
    if (this.faltantes.length) return;
    const ok = await this.confirmar.pedir({
      titulo: 'Guardar informe',
      mensaje: 'Al guardar el informe ya no se podrá modificar y quedará pendiente de aprobación: un Admin o Super Admin lo aprueba y firma la recepción. ¿Quieres guardarlo?',
      textoConfirmar: 'Guardar informe',
      icono: 'lock',
    });
    if (!ok) return;
    if (!(await this.guardar(true)) || !this.detalle) return;
    if (this.faltantes.length) { this.errorGuardado = `Antes de guardar el informe completa: ${this.faltantes.join(', ')}.`; return; }
    this.guardando = true;
    try {
      const d = await firstValueFrom(this.api.guardar(this.detalle.id));
      this.toast.success('Informe guardado', `${d.numero} quedó guardado y pendiente de aprobación.`);
      void this.router.navigate(['/informes-inspeccion', d.id]);
    } catch (e) {
      this.errorGuardado = mensajeError(e, 'No se pudo guardar el informe.');
    } finally {
      this.guardando = false;
    }
  }

  async vistaPdf(): Promise<void> {
    if (!(await this.guardarSiCambio()) || !this.detalle) return;
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

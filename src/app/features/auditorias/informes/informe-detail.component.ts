import { VerMediaDirective } from '../../../shared/directives/ver-media.directive';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InformesInspeccionService } from '../../../core/services/informes-inspeccion.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ThumbSrcDirective } from '../../../shared/directives/thumb-src.directive';
import {
  CALIFICACIONES,
  CATEGORIAS_NOVEDAD,
  ESTADOS_INFORME,
  ESTADOS_PLAN,
  EstadoPlan,
  InformeDetalle,
  PlanAccion,
  TIPOS_INSPECCION,
  mensajeError,
} from '../../../core/models/auditorias.model';
import { EvidenciasFotosComponent } from '../shared/evidencias-fotos.component';
import { HistorialInformeComponent } from './historial-informe.component';
import { descargarPdfInforme } from './informe-pdf';

/**
 * Detalle de un informe: encabezado, secciones plegables y las acciones que el servidor permite a este usuario según el estado
 * (`permisos`). Quien no audita lo ve solo en lectura.
 */
@Component({
  selector: 'app-informe-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, ModalComponent, ThumbSrcDirective, VerMediaDirective, EvidenciasFotosComponent, HistorialInformeComponent],
  template: `
    <div class="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <a routerLink="/informes-inspeccion" class="btn btn-ghost btn-sm w-fit"><i-lucide name="arrow-left" class="w-4 h-4" aria-hidden="true"></i-lucide> Informes</a>

      @if (cargando) {
        <div class="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500" role="status">Cargando informe…</div>
      } @else if (error) {
        <div class="estado-error" role="alert">{{ error }}</div>
      } @else if (i) {
        <!-- Encabezado -->
        <header class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-mono font-extrabold text-easydry-blue text-lg">{{ i.numero }}</p>
              <h1 class="text-xl font-extrabold text-slate-900 font-outfit">{{ i.asunto || 'Sin asunto' }}</h1>
              <p class="text-xs text-slate-500 mt-1">{{ i.agencia.nombre }} · {{ i.fecha | date:'dd/MM/yyyy' }} · Visita {{ i.fechaVisita | date:'dd/MM/yyyy HH:mm' }} · {{ tipo(i.tipoInspeccion) }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge" [ngClass]="claseEstado(i.estado)">{{ nombreEstado(i.estado) }}</span>
              @if (i.calificacion) { <span class="badge" [ngClass]="claseCalificacion(i.calificacion)">Servicio: {{ nombreCalificacion(i.calificacion) }}</span> }
            </div>
          </div>
          <dl class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><dt class="field-label">Para</dt><dd class="font-semibold">{{ i.destinatarioNombre || '—' }}</dd></div>
            <div><dt class="field-label">De</dt><dd class="font-semibold">{{ i.inspectorNombre }}</dd></div>
            <div><dt class="field-label">N.º de visita</dt><dd class="font-semibold">{{ i.numeroMensual }} ({{ i.periodo }})</dd></div>
          </dl>

          @if (i.estado === 'RECHAZADO' && i.motivoRechazo) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800" role="alert"><strong>Rechazado:</strong> {{ i.motivoRechazo }}</div>
          }

          <div class="flex flex-wrap gap-2">
            @if (i.permisos.puedeEditar) {
              <a [routerLink]="['/informes-inspeccion', i.id, 'editar']" class="btn btn-secondary"><i-lucide name="pencil" class="w-4 h-4" aria-hidden="true"></i-lucide> Continuar borrador</a>
            }
            @if (i.permisos.puedeEnviar) {
              <button type="button" class="btn btn-primary" (click)="enviar()" [disabled]="trabajando"><i-lucide name="send" class="w-4 h-4" aria-hidden="true"></i-lucide> Enviar a revisión</button>
            }
            @if (i.permisos.puedeRevisar) {
              <button type="button" class="btn btn-cta" (click)="aprobarRevision()" [disabled]="trabajando"><i-lucide name="check-circle" class="w-4 h-4" aria-hidden="true"></i-lucide> Aprobar informe</button>
              <button type="button" class="btn btn-danger" (click)="abrirRechazo()" [disabled]="trabajando"><i-lucide name="x-circle" class="w-4 h-4" aria-hidden="true"></i-lucide> Rechazar</button>
            }
            @if (i.permisos.puedeReabrir) {
              <button type="button" class="btn btn-secondary" (click)="reabrir()" [disabled]="trabajando"><i-lucide name="rotate-ccw" class="w-4 h-4" aria-hidden="true"></i-lucide> Reabrir para corregir</button>
            }
            @if (i.permisos.puedeCerrar) {
              <button type="button" class="btn btn-primary" (click)="cerrar()" [disabled]="trabajando"><i-lucide name="lock" class="w-4 h-4" aria-hidden="true"></i-lucide> Cerrar informe</button>
            }
            <button type="button" class="btn btn-secondary" (click)="pdf()" [disabled]="generando"><i-lucide name="download" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ generando ? 'Generando…' : 'Descargar PDF' }}</button>
          </div>
        </header>

        <!-- Secciones plegables -->
        <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry divide-y divide-slate-100">
          <details class="group" open>
            <summary class="cursor-pointer select-none px-5 py-4 font-extrabold text-slate-900 flex items-center justify-between">Asunto y antecedentes<i-lucide name="chevron-down" class="w-4 h-4 group-open:rotate-180 transition-transform" aria-hidden="true"></i-lucide></summary>
            <div class="px-5 pb-5 text-sm space-y-2"><p><strong>Asunto:</strong> {{ i.asunto || '—' }}</p><p class="whitespace-pre-line"><strong>Antecedentes:</strong> {{ i.antecedentes || '—' }}</p></div>
          </details>

          <details class="group" open>
            <summary class="cursor-pointer select-none px-5 py-4 font-extrabold text-slate-900 flex items-center justify-between">Desarrollo y novedades ({{ i.novedades.length }})<i-lucide name="chevron-down" class="w-4 h-4 group-open:rotate-180 transition-transform" aria-hidden="true"></i-lucide></summary>
            <div class="px-5 pb-5 space-y-3 text-sm">
              <p class="whitespace-pre-line">{{ i.desarrollo || 'Sin descripción general.' }}</p>
              @for (n of i.novedades; track n.id) {
                <article class="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div class="flex flex-wrap items-center gap-2"><strong>{{ n.titulo }}</strong>
                    <span class="badge badge-neutral">{{ categoria(n.categoria) }}</span>
                    <span class="badge" [ngClass]="clasePrioridad(n.prioridad)">{{ n.prioridad }}</span>
                    @if (n.area) { <span class="text-xs text-slate-500">{{ n.area }}</span> }</div>
                  @if (n.descripcion) { <p class="whitespace-pre-line text-slate-700">{{ n.descripcion }}</p> }
                  <div class="flex flex-wrap gap-2">@for (f of n.fotos; track f) { <img [appThumb]="f" [appVerMedia]="f" class="w-20 h-20 object-cover rounded-lg border border-slate-200" alt="Evidencia de la novedad"> }</div>
                </article>
              }
            </div>
          </details>

          <details class="group">
            <summary class="cursor-pointer select-none px-5 py-4 font-extrabold text-slate-900 flex items-center justify-between">Actividades realizadas ({{ i.actividades.length }})<i-lucide name="chevron-down" class="w-4 h-4 group-open:rotate-180 transition-transform" aria-hidden="true"></i-lucide></summary>
            <div class="px-5 pb-5 space-y-3 text-sm">
              <p class="whitespace-pre-line">{{ i.actividadesGeneral || 'Sin descripción general.' }}</p>
              @for (a of i.actividades; track a.id) {
                <article class="rounded-xl border border-slate-200 p-3 space-y-1">
                  <strong>{{ a.nombre }}</strong>
                  <p class="text-xs text-slate-500">{{ a.responsable || 'Sin responsable' }}@if (a.fecha) { · {{ a.fecha | date:'dd/MM/yyyy' }} }</p>
                  @if (a.descripcion) { <p>{{ a.descripcion }}</p> }
                  @if (a.resultado) { <p><strong>Resultado:</strong> {{ a.resultado }}</p> }
                  @if (a.observaciones) { <p class="text-slate-600">{{ a.observaciones }}</p> }
                  <div class="flex flex-wrap gap-2">@for (f of a.fotos; track f) { <img [appThumb]="f" [appVerMedia]="f" class="w-16 h-16 object-cover rounded-lg border border-slate-200" alt="Evidencia de la actividad"> }</div>
                </article>
              }
            </div>
          </details>

          <details class="group" open>
            <summary class="cursor-pointer select-none px-5 py-4 font-extrabold text-slate-900 flex items-center justify-between">Planes de acción ({{ i.planes.length }})<i-lucide name="chevron-down" class="w-4 h-4 group-open:rotate-180 transition-transform" aria-hidden="true"></i-lucide></summary>
            <div class="px-5 pb-5 space-y-3 text-sm">
              <p class="whitespace-pre-line">{{ i.planesGeneral || 'Sin descripción general.' }}</p>
              @for (p of i.planes; track p.id) {
                <article class="rounded-xl border p-3 space-y-2" [ngClass]="p.estadoEfectivo === 'VENCIDO' ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="flex-1 min-w-48">{{ p.problema }}</strong>
                    <span class="badge" [ngClass]="clasePlan(p.estadoEfectivo || p.estado)">{{ nombrePlan(p.estadoEfectivo || p.estado) }}</span>
                    <span class="badge" [ngClass]="clasePrioridad(p.prioridad)">{{ p.prioridad }}</span>
                  </div>
                  <p>{{ p.accionRequerida || '—' }}</p>
                  <p class="text-xs text-slate-500">{{ p.areaResponsable || 'Sin área' }} · {{ p.personaResponsable || 'Sin responsable' }} · Compromiso: {{ p.fechaCompromiso ? (p.fechaCompromiso | date:'dd/MM/yyyy') : '—' }}</p>
                  @if (p.observaciones) { <p class="text-slate-600">{{ p.observaciones }}</p> }
                  <div class="flex flex-wrap gap-2">@for (f of p.evidenciaCumplimiento; track f) { <img [appThumb]="f" [appVerMedia]="f" class="w-16 h-16 object-cover rounded-lg border border-slate-200" alt="Evidencia de cumplimiento"> }</div>
                  @if (i.permisos.puedeSeguimiento && puedeSeguir) {
                    <button type="button" class="btn btn-secondary btn-sm" (click)="abrirSeguimiento(p)"><i-lucide name="clipboard-check" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Dar seguimiento</button>
                  }
                </article>
              }
            </div>
          </details>

          <details class="group" open>
            <summary class="cursor-pointer select-none px-5 py-4 font-extrabold text-slate-900 flex items-center justify-between">Observaciones y calificación<i-lucide name="chevron-down" class="w-4 h-4 group-open:rotate-180 transition-transform" aria-hidden="true"></i-lucide></summary>
            <div class="px-5 pb-5 text-sm space-y-2">
              <p class="whitespace-pre-line"><strong>Observaciones del jefe de taller:</strong> {{ i.observacionesJefeTaller || '—' }}</p>
              <p><strong>Calificación del servicio:</strong> {{ i.calificacion ? nombreCalificacion(i.calificacion) : '—' }}
                @if (i.calificadoPorNombre) { <span class="text-xs text-slate-500"> · registrada por {{ i.calificadoPorNombre }}, {{ i.calificadoEn | date:'dd/MM/yyyy HH:mm' }}</span> }</p>
            </div>
          </details>

          <details class="group">
            <summary class="cursor-pointer select-none px-5 py-4 font-extrabold text-slate-900 flex items-center justify-between">Historial de cambios ({{ i.historial.length }})<i-lucide name="chevron-down" class="w-4 h-4 group-open:rotate-180 transition-transform" aria-hidden="true"></i-lucide></summary>
            <div class="px-5 pb-5"><app-historial-informe [items]="i.historial"></app-historial-informe></div>
          </details>
        </section>
      }

      <!-- Rechazo -->
      <app-modal [isOpen]="modalRechazo" title="Rechazar informe" icon="x-circle" size="sm" (close)="modalRechazo = false">
        <label class="field-label" for="mot-rech">Motivo del rechazo *</label>
        <textarea id="mot-rech" class="field" rows="4" [(ngModel)]="motivo" placeholder="Qué debe corregir quien lo elaboró"></textarea>
        @if (errorModal) { <p class="field-help">{{ errorModal }}</p> }
        <div class="flex gap-2 mt-4"><button type="button" class="btn btn-secondary" (click)="modalRechazo = false">Cancelar</button>
          <button type="button" class="btn btn-danger" (click)="rechazar()" [disabled]="trabajando">Rechazar informe</button></div>
      </app-modal>

      <!-- Seguimiento de un plan -->
      <app-modal [isOpen]="!!plan" title="Seguimiento del plan de acción" icon="clipboard-check" size="md" (close)="plan = null">
        @if (plan) {
          <div class="space-y-3">
            <p class="text-sm font-semibold text-slate-800">{{ plan.problema }}</p>
            <div><label class="field-label" for="seg-estado">Estado</label>
              <select id="seg-estado" class="field" [(ngModel)]="segEstado">
                @for (e of estadosPlan; track e.id) { @if (e.id !== 'VENCIDO') { <option [value]="e.id">{{ e.nombre }}</option> } }
              </select></div>
            <div><label class="field-label" for="seg-obs">Observaciones</label><textarea id="seg-obs" class="field" rows="3" [(ngModel)]="segObs"></textarea></div>
            <div><label class="field-label">Evidencia de cumplimiento</label>
              <app-evidencias-fotos [fotos]="segFotos" (fotosChange)="segFotos = $event" [agenciaId]="i!.agencia.id" tipo="informes" [referenciaId]="i!.id"></app-evidencias-fotos></div>
            @if (errorModal) { <p class="field-help">{{ errorModal }}</p> }
            <div class="flex gap-2"><button type="button" class="btn btn-secondary" (click)="plan = null">Cancelar</button>
              <button type="button" class="btn btn-primary" (click)="guardarSeguimiento()" [disabled]="trabajando">Guardar seguimiento</button></div>
          </div>
        }
      </app-modal>
    </div>
  `,
})
export class InformeDetailComponent implements OnInit {
  readonly api = inject(InformesInspeccionService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageUploadService);
  private readonly auth = inject(AuthService);

  /** El servidor decide según el estado; la casilla del rol oculta el botón a quien no tiene el permiso. */
  readonly puedeSeguir = this.auth.puede('informes.seguimiento');
  readonly estadosPlan = ESTADOS_PLAN;
  i: InformeDetalle | null = null;
  cargando = true;
  error = '';
  trabajando = false;
  generando = false;
  errorModal = '';

  modalRechazo = false;
  motivo = '';
  plan: PlanAccion | null = null;
  segEstado: EstadoPlan = 'PENDIENTE';
  segObs = '';
  segFotos: string[] = [];

  async ngOnInit(): Promise<void> {
    try {
      this.i = await firstValueFrom(this.api.getDetalle(this.route.snapshot.paramMap.get('id') ?? ''));
    } catch (e) {
      this.error = mensajeError(e, 'No se pudo cargar el informe.');
    } finally {
      this.cargando = false;
    }
  }

  tipo = (id: string) => TIPOS_INSPECCION.find((t) => t.id === id)?.nombre ?? id;
  categoria = (id: string) => CATEGORIAS_NOVEDAD.find((c) => c.id === id)?.nombre ?? id;
  nombreEstado = (id: string) => ESTADOS_INFORME.find((e) => e.id === id)?.nombre ?? id;
  claseEstado = (id: string) => ESTADOS_INFORME.find((e) => e.id === id)?.clase ?? '';
  nombreCalificacion = (id: string) => CALIFICACIONES.find((c) => c.id === id)?.nombre ?? id;
  claseCalificacion = (id: string) => CALIFICACIONES.find((c) => c.id === id)?.clase ?? '';
  nombrePlan = (id: string) => ESTADOS_PLAN.find((e) => e.id === id)?.nombre ?? id;
  clasePlan = (id: string) => ESTADOS_PLAN.find((e) => e.id === id)?.clase ?? '';
  clasePrioridad = (p: string) => ({ BAJA: 'badge-neutral', MEDIA: 'badge-info', ALTA: 'badge-high', CRITICA: 'badge-critical' } as Record<string, string>)[p] ?? 'badge-neutral';

  /** Ejecuta una acción del flujo y muestra el informe ya actualizado. */
  async ejecutar(accion: () => import('rxjs').Observable<InformeDetalle>, mensaje: string): Promise<void> {
    this.trabajando = true;
    try {
      this.i = await firstValueFrom(accion());
      this.toast.success('Informe actualizado', mensaje);
    } catch (e) {
      this.toast.error('No se pudo completar la acción', mensajeError(e));
    } finally {
      this.trabajando = false;
    }
  }

  enviar(): Promise<void> { return this.ejecutar(() => this.api.enviar(this.i!.id), 'Enviado a revisión'); }
  aprobarRevision(): Promise<void> { return this.ejecutar(() => this.api.revisar(this.i!.id, 'APROBAR'), 'Informe aprobado'); }
  reabrir(): Promise<void> { return this.ejecutar(() => this.api.reabrir(this.i!.id), 'Reabierto para corregirlo'); }
  cerrar(): Promise<void> { return this.ejecutar(() => this.api.cerrar(this.i!.id), 'Informe cerrado'); }

  abrirRechazo(): void { this.motivo = ''; this.errorModal = ''; this.modalRechazo = true; }

  async rechazar(): Promise<void> {
    if (!this.motivo.trim()) { this.errorModal = 'Indica el motivo del rechazo.'; return; }
    this.modalRechazo = false;
    await this.ejecutar(() => this.api.revisar(this.i!.id, 'RECHAZAR', this.motivo.trim()), 'Informe rechazado');
  }

  abrirSeguimiento(p: PlanAccion): void {
    this.plan = p;
    this.segEstado = p.estado;
    this.segObs = p.observaciones;
    this.segFotos = [...p.evidenciaCumplimiento];
    this.errorModal = '';
  }

  async guardarSeguimiento(): Promise<void> {
    if (!this.plan?.id) return;
    this.trabajando = true;
    this.errorModal = '';
    try {
      this.i = await firstValueFrom(this.api.seguimientoPlan(this.plan.id, this.segEstado, this.segObs, this.segFotos));
      this.toast.success('Seguimiento guardado', 'El plan de acción se actualizó.');
      this.plan = null;
    } catch (e) {
      this.errorModal = mensajeError(e);
    } finally {
      this.trabajando = false;
    }
  }

  async pdf(): Promise<void> {
    if (!this.i) return;
    this.generando = true;
    try {
      await descargarPdfInforme(this.i, this.storage);
    } catch (e) {
      this.toast.error('No se pudo generar el PDF', mensajeError(e));
    } finally {
      this.generando = false;
    }
  }
}

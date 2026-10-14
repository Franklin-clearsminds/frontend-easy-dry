import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InformesInspeccionService } from '../../../core/services/informes-inspeccion.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TablaServidor } from '../../../core/utils/tabla-servidor';
import { DataTableCellDirective, DataTableComponent, TableColumn } from '../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import {
  CALIFICACIONES,
  ESTADOS_INFORME,
  InformeDetalle,
  InformeFila,
  OpcionesInformes,
  ResumenInformes,
  TIPOS_INSPECCION,
  mensajeError,
} from '../../../core/models/auditorias.model';
import { descargarPdfInforme } from './informe-pdf';
import { HistorialInformeComponent } from './historial-informe.component';

/**
 * Informes de inspección: listado con indicadores, filtros y acciones. Quien no puede auditar (líder, lavador, pulidor) lo ve
 * en solo lectura y solo con los informes ya aprobados de su agencia; el servidor aplica el alcance y los permisos.
 */
@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, DataTableComponent, DataTableCellDirective, ModalComponent, StatCardComponent, HistorialInformeComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold mb-2">
            <i-lucide name="file-search" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
            <span>Auditorías</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Informes de Inspección</h1>
          <p class="text-slate-500 text-xs mt-1">
            @if (soloLectura) { El resultado de las inspecciones de tu agencia (informes aprobados). }
            @else { Visitas de inspección a las agencias: novedades, actividades, planes de acción, calificación y aprobación. }
          </p>
        </div>
        @if (puedeCrear) {
          <a routerLink="/informes-inspeccion/nuevo" class="btn btn-cta w-full sm:w-auto">
            <i-lucide name="plus" class="w-4 h-4" aria-hidden="true"></i-lucide> Nuevo informe
          </a>
        }
      </div>

      @if (resumen) {
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <app-stat-card title="Total de inspecciones" [value]="resumen.total" icon="file-search" variant="primary" subtitle="En tu alcance"></app-stat-card>
          <app-stat-card title="Este mes" [value]="resumen.esteMes" icon="calendar" variant="primary" subtitle="Inspecciones del mes"></app-stat-card>
          <app-stat-card title="Pendientes de aprobación" [value]="resumen.pendientesAprobacion" icon="clock" variant="warning" subtitle="En revisión"></app-stat-card>
          <app-stat-card title="Aprobados" [value]="resumen.aprobados" icon="check-circle" variant="success" subtitle="Aprobados o cerrados"></app-stat-card>
          <app-stat-card title="Planes de acción pendientes" [value]="resumen.planesPendientes" icon="clipboard-list" [variant]="resumen.planesVencidos ? 'danger' : 'warning'"
            [subtitle]="resumen.planesVencidos + ' vencido(s)'"></app-stat-card>
        </div>
      }

      <!-- Filtros -->
      <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-easydry grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
        <div class="col-span-2 md:col-span-1">
          <label class="field-label" for="inf-agencia">Agencia</label>
          <select id="inf-agencia" class="field" [(ngModel)]="filtros.agenciaId" (ngModelChange)="aplicar()">
            <option value="">Todas</option>
            @for (a of opciones?.agencias ?? []; track a.id) { <option [value]="a.id">{{ a.nombre }}</option> }
          </select>
        </div>
        @if (!soloLectura) {
          <div>
            <label class="field-label" for="inf-resp">Responsable</label>
            <select id="inf-resp" class="field" [(ngModel)]="filtros.inspectorId" (ngModelChange)="aplicar()">
              <option value="">Todos</option>
              @for (r of opciones?.responsables ?? []; track r.id) { <option [value]="r.id">{{ r.nombre }}</option> }
            </select>
          </div>
          <div>
            <label class="field-label" for="inf-estado">Estado</label>
            <select id="inf-estado" class="field" [(ngModel)]="filtros.estado" (ngModelChange)="aplicar()">
              <option value="">Todos</option>
              @for (e of estados; track e.id) { <option [value]="e.id">{{ e.nombre }}</option> }
            </select>
          </div>
        }
        <div>
          <label class="field-label" for="inf-calif">Calificación</label>
          <select id="inf-calif" class="field" [(ngModel)]="filtros.calificacion" (ngModelChange)="aplicar()">
            <option value="">Todas</option>
            @for (c of calificaciones; track c.id) { <option [value]="c.id">{{ c.nombre }}</option> }
          </select>
        </div>
        <div>
          <label class="field-label" for="inf-desde">Desde</label>
          <input id="inf-desde" type="date" class="field" [(ngModel)]="filtros.desde" (ngModelChange)="aplicar()">
        </div>
        <div>
          <label class="field-label" for="inf-hasta">Hasta</label>
          <input id="inf-hasta" type="date" class="field" [(ngModel)]="filtros.hasta" (ngModelChange)="aplicar()">
        </div>
      </div>

      <app-data-table
        [serverSide]="true"
        [columns]="columnas"
        [data]="tabla.filas"
        [total]="tabla.total"
        [page]="tabla.pagina"
        [pageSize]="tabla.pageSize"
        [sortField]="tabla.sortField"
        [sortOrder]="tabla.sortOrder"
        [loading]="tabla.cargando"
        [error]="tabla.error"
        searchPlaceholder="Buscar por número o asunto…"
        caption="Informes de inspección"
        emptyTitle="Aún no hay informes en tu alcance"
        emptyHint="Prueba ajustando los filtros o el texto de búsqueda."
        (queryChange)="tabla.alCambiar($event)"
        (reintentar)="tabla.cargar(true)">

        <ng-template appCell="numero" let-i>
          <a [routerLink]="['/informes-inspeccion', i.id]" class="font-mono font-extrabold text-easydry-blue hover:underline">{{ i.numero }}</a>
          <p class="text-[11px] text-slate-500">Mensual N.º {{ i.numeroMensual }}</p>
        </ng-template>
        <ng-template appCell="fecha" let-i>
          <span class="whitespace-nowrap">{{ i.fecha | date:'dd/MM/yyyy' }}</span>
        </ng-template>
        <ng-template appCell="asunto" let-i>
          <p class="font-semibold text-slate-800 line-clamp-2">{{ i.asunto || '— sin asunto —' }}</p>
          <p class="text-[11px] text-slate-500">{{ tipo(i.tipoInspeccion) }} · {{ i.totalNovedades }} novedad(es) · {{ i.totalPlanes }} plan(es)</p>
        </ng-template>
        <ng-template appCell="estado" let-i>
          <span class="badge" [ngClass]="claseEstado(i.estado)">{{ nombreEstado(i.estado) }}</span>
        </ng-template>
        <ng-template appCell="calificacion" let-i>
          @if (i.calificacion) { <span class="badge" [ngClass]="claseCalificacion(i.calificacion)">{{ nombreCalificacion(i.calificacion) }}</span> }
          @else { <span class="text-slate-400">—</span> }
        </ng-template>
        <ng-template appCell="acciones" let-i>
          <div class="flex items-center justify-end gap-0.5">
            <a [routerLink]="['/informes-inspeccion', i.id]" class="btn-icon" aria-label="Ver detalle" title="Ver detalle"><i-lucide name="eye" class="w-4 h-4" aria-hidden="true"></i-lucide></a>
            @if (puedeEditarFila(i)) {
              <a [routerLink]="['/informes-inspeccion', i.id, 'editar']" class="btn-icon" [attr.aria-label]="'Continuar borrador'" title="Editar / continuar borrador"><i-lucide name="pencil" class="w-4 h-4" aria-hidden="true"></i-lucide></a>
            }
            <button type="button" class="btn-icon" aria-label="Descargar PDF" title="Descargar PDF" (click)="descargarPdf(i)" [disabled]="generando === i.id">
              <i-lucide [name]="generando === i.id ? 'loader' : 'download'" class="w-4 h-4" [class.animate-spin]="generando === i.id" aria-hidden="true"></i-lucide>
            </button>
            <button type="button" class="btn-icon" aria-label="Consultar historial" title="Historial" (click)="verHistorial(i)"><i-lucide name="history" class="w-4 h-4" aria-hidden="true"></i-lucide></button>
            @if (puedeEliminarFila(i)) {
              <button type="button" class="btn-icon hover:!text-rose-600" aria-label="Eliminar borrador" title="Eliminar borrador" (click)="eliminar(i)"><i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide></button>
            }
          </div>
        </ng-template>
      </app-data-table>

      <app-modal [isOpen]="!!historial" [title]="'Historial · ' + (historial?.numero || '')" icon="history" size="md" (close)="historial = null">
        @if (historial) { <app-historial-informe [items]="historial.historial"></app-historial-informe> }
      </app-modal>
    </div>
  `,
})
export class InformesComponent implements OnInit, OnDestroy {
  private readonly api = inject(InformesInspeccionService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly storage = inject(StorageUploadService);
  private readonly router = inject(Router);

  readonly estados = ESTADOS_INFORME;
  readonly calificaciones = CALIFICACIONES;
  readonly puedeCrear = this.auth.puede('informes.crear');
  /** Sin la casilla de crear ni la de revisar, el usuario solo ve resultados. */
  readonly soloLectura = !this.auth.puede('informes.crear') && !this.auth.puede('informes.revisar');

  resumen: ResumenInformes | null = null;
  opciones: OpcionesInformes | null = null;
  historial: InformeDetalle | null = null;
  generando: string | null = null;
  filtros = { agenciaId: '', inspectorId: '', estado: '', calificacion: '', desde: '', hasta: '' };

  readonly columnas: TableColumn[] = [
    { key: 'numero', label: 'N.º informe', type: 'custom', sortable: true, defaultSort: 'desc' },
    { key: 'agencia', label: 'Agencia', sortable: true, type: 'text' },
    { key: 'fecha', label: 'Fecha', type: 'custom', sortable: true, defaultSort: 'desc' },
    { key: 'responsable', label: 'Responsable', sortable: true, type: 'text', hideOnMobile: true },
    { key: 'destinatario', label: 'Destinatario', sortable: true, type: 'text', hideOnMobile: true },
    { key: 'asunto', label: 'Asunto', type: 'custom', sortable: true },
    { key: 'estado', label: 'Estado', type: 'custom', sortable: true },
    { key: 'calificacion', label: 'Calificación', type: 'custom', sortable: true },
    { key: 'acciones', label: 'Acciones', type: 'custom', align: 'right', sticky: true },
  ];

  readonly tabla = new TablaServidor<InformeFila>(
    (c) => this.api.getPagina({ ...c, ...this.filtrosActivos() }),
    { sortField: 'fecha', sortOrder: 'desc' },
  );

  ngOnInit(): void {
    this.tabla.reiniciar();
    this.api.getResumen().subscribe({ next: (r) => (this.resumen = r), error: () => undefined });
    this.api.getOpciones().subscribe({ next: (o) => (this.opciones = o), error: () => undefined });
  }

  ngOnDestroy(): void {
    this.tabla.destruir();
  }

  private filtrosActivos() {
    const f = this.filtros;
    return { agenciaId: f.agenciaId, inspectorId: f.inspectorId, estado: f.estado, calificacion: f.calificacion, desde: f.desde, hasta: f.hasta };
  }

  aplicar(): void {
    this.tabla.reiniciar();
  }

  tipo = (id: string) => TIPOS_INSPECCION.find((t) => t.id === id)?.nombre ?? id;
  nombreEstado = (id: string) => ESTADOS_INFORME.find((e) => e.id === id)?.nombre ?? id;
  claseEstado = (id: string) => ESTADOS_INFORME.find((e) => e.id === id)?.clase ?? '';
  nombreCalificacion = (id: string) => CALIFICACIONES.find((c) => c.id === id)?.nombre ?? id;
  claseCalificacion = (id: string) => CALIFICACIONES.find((c) => c.id === id)?.clase ?? '';

  private esMio(i: InformeFila): boolean {
    return String(this.auth.getCurrentUser()?.id) === i.inspectorId;
  }

  /** Mismas reglas que aplica el servidor (que es quien decide de verdad). */
  puedeEditarFila(i: InformeFila): boolean {
    return i.estado === 'BORRADOR' && ((this.esMio(i) && this.puedeCrear) || this.auth.puede('informes.revisar'));
  }

  puedeEliminarFila(i: InformeFila): boolean {
    return i.estado === 'BORRADOR' && this.auth.puede('informes.eliminar') && (this.esMio(i) || this.auth.puede('informes.revisar'));
  }

  async descargarPdf(i: InformeFila): Promise<void> {
    this.generando = i.id;
    try {
      const detalle = await firstValueFrom(this.api.getDetalle(i.id));
      await descargarPdfInforme(detalle, this.storage);
    } catch (e) {
      this.toast.error('No se pudo generar el PDF', mensajeError(e));
    } finally {
      this.generando = null;
    }
  }

  async verHistorial(i: InformeFila): Promise<void> {
    try {
      this.historial = await firstValueFrom(this.api.getDetalle(i.id));
    } catch (e) {
      this.toast.error('No se pudo cargar el historial', mensajeError(e));
    }
  }

  async eliminar(i: InformeFila): Promise<void> {
    if (!window.confirm(`¿Eliminar el borrador ${i.numero}? Queda registrado en el historial y no se podrá recuperar desde la pantalla.`)) return;
    try {
      await firstValueFrom(this.api.eliminar(i.id));
      this.toast.success('Borrador eliminado', `${i.numero} se eliminó.`);
      this.tabla.refrescar();
      this.api.getResumen().subscribe({ next: (r) => (this.resumen = r) });
    } catch (e) {
      this.toast.error('No se pudo eliminar', mensajeError(e));
    }
  }
}

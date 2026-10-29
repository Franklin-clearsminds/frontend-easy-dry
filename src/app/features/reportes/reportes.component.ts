import { TablaFijaDirective } from '../../shared/directives/tabla-fija.directive';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ReporteService } from '../../core/services/reporte.service';
import { AuthService } from '../../core/services/auth.service';
import { Auditoria5sService } from '../../core/services/auditoria5s.service';
import { InformesInspeccionService } from '../../core/services/informes-inspeccion.service';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { Catalogo5s, mensajeError } from '../../core/models/auditorias.model';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { SelectSearchComponent } from '../../shared/components/select-search/select-search.component';
import { OpcionSelect } from '../../core/models/paginacion.model';
import {
  BloqueReporte,
  ColumnaReporte,
  FilaReporte,
  FiltrosReporte,
  GrupoReporte,
  ModoPeriodo,
  OpcionesReportes,
  PeriodoReporte,
  ReporteCatalogo,
  ReporteGenerado,
  TotalReporte,
  ValorCelda,
} from '../../core/models/reportes.model';
import { fechaHoraCorta, formatearCelda, formatearTotal } from './reportes-formato';
import { AgenciaDestino, ResultadoPorAgencia, exportarPorAgencia } from './reporte-por-agencia';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MODOS: { valor: ModoPeriodo; etiqueta: string }[] = [
  { valor: 'HOY', etiqueta: 'Hoy' },
  { valor: 'SEMANA', etiqueta: 'Esta semana' },
  { valor: 'MES', etiqueta: 'Este mes' },
  { valor: 'ANIO', etiqueta: 'Este año' },
  { valor: 'DIA', etiqueta: 'Un día' },
  { valor: 'SEMANA_DE', etiqueta: 'Una semana' },
  { valor: 'MES_DE', etiqueta: 'Un mes' },
  { valor: 'ANIO_DE', etiqueta: 'Un año' },
  { valor: 'RANGO', etiqueta: 'Rango de fechas' },
];
const FILAS_POR_TRAMO = 25;
/** Filas de datos que caben aproximadamente en una página del PDF (para avisar de su tamaño). */
const FILAS_POR_PAGINA_PDF = 22;

const hoyLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [TablaFijaDirective, CommonModule, FormsModule, LucideAngularModule, ModalComponent, SelectSearchComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Centro de Reportes Operativos</h1>
          <p class="text-slate-500 text-xs mt-1">Elige el reporte y los filtros, revisa la información y expórtala a Excel o PDF.</p>
        </div>
      </div>

      @if (cargandoInicial) {
        <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-10 text-center text-sm text-slate-500">Cargando reportes…</div>
      } @else if (errorInicial) {
        <div class="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-5 text-sm font-semibold flex items-center gap-2" role="alert">
          <i-lucide name="triangle-alert" class="w-4 h-4" aria-hidden="true"></i-lucide>{{ errorInicial }}
        </div>
      } @else if (!catalogo.length) {
        <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-10 text-center">
          <i-lucide name="file-bar-chart" class="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true"></i-lucide>
          <p class="text-sm font-bold text-slate-700">No hay reportes disponibles para tu rol</p>
          <p class="text-xs text-slate-500 mt-1">Los reportes dependen de los módulos que tengas activos. Pide a un administrador que los habilite.</p>
        </div>
      } @else {
        <!-- Filtros -->
        <form class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 space-y-5" (ngSubmit)="generar()">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="field-label" for="r-modulo">Módulo</label>
              <select id="r-modulo" class="field select-chevron" name="modulo" [ngModel]="moduloSel" (ngModelChange)="elegirModulo($event)">
                @for (m of modulos; track m) { <option [value]="m">{{ m }}</option> }
              </select>
            </div>
            <div>
              <label class="field-label" for="r-reporte">Reporte</label>
              <select id="r-reporte" class="field select-chevron" name="reporte" [ngModel]="reporteId" (ngModelChange)="elegirReporte($event)">
                @for (r of reportesDelModulo; track r.id) { <option [value]="r.id">{{ r.nombre }}</option> }
              </select>
            </div>
          </div>
          @if (reporte) { <p class="text-xs text-slate-500 -mt-2">{{ reporte.descripcion }}{{ reporte.periodo ? '' : ' Muestra los datos actuales, sin filtro de fecha.' }}</p> }

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="field-label" for="r-region">Región</label>
              <app-select-search [opciones]="opcionesRegion" [value]="regionId || null" todasLabel="Todas" placeholder="Todas" buscadorPlaceholder="Buscar región…" ariaLabel="Región" (valueChange)="regionId = $event ?? ''; cambioRegion()"></app-select-search>
            </div>
            <div>
              <label class="field-label" for="r-cliente">Cliente</label>
              <app-select-search [opciones]="opcionesCliente" [value]="clienteId || null" todasLabel="Todos" placeholder="Todos" buscadorPlaceholder="Buscar cliente…" ariaLabel="Cliente" (valueChange)="clienteId = $event ?? ''; cambioCliente()"></app-select-search>
            </div>
            <div>
              <label class="field-label" for="r-agencia">Agencia</label>
              <app-select-search [opciones]="opcionesAgencia" [value]="agenciaId || null" [todasLabel]="'Todas (' + agenciasOpc.length + ')'" placeholder="Todas" buscadorPlaceholder="Buscar agencia…" ariaLabel="Agencia" (valueChange)="agenciaId = $event ?? ''; lavadorId = ''; pulidorId = ''"></app-select-search>
            </div>
          </div>

          @if (reporte?.periodo) {
            <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Periodo">
                @for (m of modos; track m.valor) {
                  <button type="button" (click)="modo = m.valor" [attr.aria-pressed]="modo === m.valor"
                    class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer"
                    [ngClass]="modo === m.valor ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'">{{ m.etiqueta }}</button>
                }
              </div>
              @switch (modo) {
                @case ('DIA') {
                  <div class="max-w-xs"><label class="field-label" for="r-dia">Día</label><input id="r-dia" type="date" class="field" name="dia" [(ngModel)]="fecha" /></div>
                }
                @case ('SEMANA_DE') {
                  <div class="max-w-xs"><label class="field-label" for="r-sem">Cualquier día de la semana</label><input id="r-sem" type="date" class="field" name="sem" [(ngModel)]="fecha" />
                    <p class="text-xs text-slate-500 mt-1">La semana va de lunes a domingo.</p></div>
                }
                @case ('MES_DE') {
                  <div class="grid grid-cols-2 gap-3 max-w-sm">
                    <div><label class="field-label" for="r-mes">Mes</label>
                      <select id="r-mes" class="field select-chevron" name="mes" [(ngModel)]="mesNum">@for (n of mesesNombres; track $index) { <option [ngValue]="$index + 1">{{ n }}</option> }</select></div>
                    <div><label class="field-label" for="r-anio-m">Año</label>
                      <select id="r-anio-m" class="field select-chevron" name="anioM" [(ngModel)]="anio">@for (a of anios; track a) { <option [ngValue]="a">{{ a }}</option> }</select></div>
                  </div>
                }
                @case ('ANIO_DE') {
                  <div class="max-w-[10rem]"><label class="field-label" for="r-anio">Año</label>
                    <select id="r-anio" class="field select-chevron" name="anio" [(ngModel)]="anio">@for (a of anios; track a) { <option [ngValue]="a">{{ a }}</option> }</select></div>
                }
                @case ('RANGO') {
                  <div class="grid grid-cols-2 gap-3 max-w-md">
                    <div><label class="field-label" for="r-desde">Desde</label><input id="r-desde" type="date" class="field" name="desde" [(ngModel)]="desde" /></div>
                    <div><label class="field-label" for="r-hasta">Hasta</label><input id="r-hasta" type="date" class="field" name="hasta" [(ngModel)]="hasta" /></div>
                  </div>
                }
              }
              <p class="text-xs text-slate-500">
                {{ modo === 'ANIO' || modo === 'ANIO_DE' ? 'El reporte se divide por meses.' : modo === 'MES' || modo === 'MES_DE' ? 'El reporte se divide por semanas.' : modo === 'SEMANA' || modo === 'SEMANA_DE' ? 'El reporte se divide por días.' : modo === 'RANGO' ? 'Un rango largo se divide por meses, uno corto por semanas y una semana o menos por días.' : 'Un solo día no se divide.' }}
              </p>
            </div>
          }

          @if (reporte && reporte.extras.length) {
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              @if (reporte.extras.includes('estado')) {
                <div><label class="field-label" for="r-estado">Estado</label>
                  <select id="r-estado" class="field select-chevron" name="estado" [(ngModel)]="estado">
                    <option value="">{{ reporte.id === 'alertas-stock' ? 'Abiertas (pendientes y en proceso)' : reporte.id === 'retos' ? 'Activos' : 'Todos' }}</option>
                    @for (e of reporte.estados; track e.valor) { <option [value]="e.valor">{{ e.etiqueta }}</option> }
                  </select></div>
              }
              @if (reporte.extras.includes('lavador')) {
                <div><label class="field-label" id="r-lavador-l">Lavador</label>
                  <app-select-search [opciones]="opcionesLavador" [value]="lavadorId || null" todasLabel="Todos" placeholder="Todos" buscadorPlaceholder="Buscar lavador…" ariaLabel="Lavador" (valueChange)="lavadorId = $event ?? ''"></app-select-search></div>
              }
              @if (reporte.extras.includes('pulidor')) {
                <div><label class="field-label" id="r-pulidor-l">Pulidor</label>
                  <app-select-search [opciones]="opcionesPulidor" [value]="pulidorId || null" todasLabel="Todos" placeholder="Todos" buscadorPlaceholder="Buscar pulidor…" ariaLabel="Pulidor" (valueChange)="pulidorId = $event ?? ''"></app-select-search></div>
              }
              @if (reporte.extras.includes('ubicacion')) {
                <div><label class="field-label" for="r-ubic">Ubicación</label>
                  <select id="r-ubic" class="field select-chevron" name="ubic" [(ngModel)]="ubicacion">
                    <option value="">Agencias, pulidores y bodegas</option>
                    @for (u of reporte.ubicaciones; track u.valor) { <option [value]="u.valor">{{ u.etiqueta }}</option> }
                  </select></div>
              }
              @if (reporte.extras.includes('semaforo')) {
                <div><label class="field-label" for="r-sem5s">Semáforo</label>
                  <select id="r-sem5s" class="field select-chevron" name="sem5s" [(ngModel)]="semaforo">
                    <option value="">Todos</option>
                    @for (s of reporte.semaforos; track s.valor) { <option [value]="s.valor">{{ s.etiqueta }}</option> }
                  </select></div>
              }
              @if (reporte.extras.includes('producto')) {
                <div class="md:col-span-2"><label class="field-label" id="r-prod-l">Producto <span class="text-rose-600">*</span></label>
                  <app-select-search [opciones]="opcionesProducto" [value]="productoId || null" [todasLabel]="null" [clearable]="false" placeholder="Elige el producto…" buscadorPlaceholder="Buscar producto…" ariaLabel="Producto del kardex" (valueChange)="productoId = $event ?? ''"></app-select-search></div>
              }
            </div>
          }

          <div class="flex flex-wrap items-center gap-3 pt-1">
            <button type="submit" class="btn-primary" [disabled]="cargando">
              <i-lucide name="search" class="w-4 h-4" aria-hidden="true"></i-lucide>{{ cargando ? 'Generando…' : 'Ver reporte' }}
            </button>
            @if (puedePorAgencia) {
              @if (puedeExcel) {
                <button type="button" class="btn-secondary" (click)="pedirPorAgencia('EXCEL')" [disabled]="cargando || !!porAgencia" title="Genera un Excel por cada agencia, sin vista previa. Sirve para periodos largos.">
                  <i-lucide name="file-spreadsheet" class="w-4 h-4 text-emerald-700" aria-hidden="true"></i-lucide>Excel por agencia
                </button>
              }
              @if (puedePdf) {
                <button type="button" class="btn-secondary" (click)="pedirPorAgencia('PDF')" [disabled]="cargando || !!porAgencia" title="Genera un PDF por cada agencia, sin vista previa. Sirve para periodos largos.">
                  <i-lucide name="file-text" class="w-4 h-4 text-rose-700" aria-hidden="true"></i-lucide>PDF por agencia
                </button>
              }
            }
            @if (errorGenerar) { <span class="text-xs font-semibold text-rose-700 flex items-center gap-1" role="alert"><i-lucide name="triangle-alert" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>{{ errorGenerar }}</span> }
          </div>
        </form>

        <!-- Resultado -->
        @if (resultado; as res) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="text-lg font-extrabold text-slate-900 font-outfit">{{ res.reporte.nombre }}</h2>
                <div class="flex flex-wrap gap-1.5 mt-2 text-[11px] font-semibold text-slate-600">
                  <span class="badge-neutral">{{ res.filtros.periodo }}</span>
                  <span class="badge-neutral">Región: {{ res.filtros.region }}</span>
                  <span class="badge-neutral">Cliente: {{ res.filtros.cliente }}</span>
                  <span class="badge-neutral">Agencias: {{ res.filtros.agencias }}</span>
                  @for (e of res.filtros.extras; track e.etiqueta) { <span class="badge-neutral">{{ e.etiqueta }}: {{ e.valor }}</span> }
                </div>
                <p class="text-[11px] text-slate-500 mt-2">Generado por {{ res.generadoPor }} · {{ fechaHora(res.generadoEn) }}</p>
              </div>
              <div class="flex flex-wrap gap-2 shrink-0">
                @if (puedeExcel) {
                  <button type="button" class="btn-secondary" (click)="pedirExportacion('EXCEL')" [disabled]="!res.totalFilas || exportando" aria-label="Exportar a Excel">
                    <i-lucide name="file-spreadsheet" class="w-4 h-4 text-emerald-700" aria-hidden="true"></i-lucide>{{ exportando === 'EXCEL' ? 'Generando…' : 'Exportar Excel' }}
                  </button>
                }
                @if (puedePdf) {
                  <button type="button" class="btn-secondary" (click)="pedirExportacion('PDF')" [disabled]="!res.totalFilas || exportando" aria-label="Exportar a PDF">
                    <i-lucide name="file-text" class="w-4 h-4 text-rose-700" aria-hidden="true"></i-lucide>{{ exportando === 'PDF' ? 'Generando…' : 'Exportar PDF' }}
                  </button>
                }
              </div>
            </div>

            @if (!res.totalFilas) {
              <div class="p-10 text-center">
                <i-lucide name="file-bar-chart" class="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true"></i-lucide>
                <p class="text-sm font-bold text-slate-700">No hay registros con los filtros elegidos</p>
                <p class="text-xs text-slate-500 mt-1">Prueba con otro periodo, agencia o estado.</p>
              </div>
            } @else {
              <div class="p-5 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 border-b border-slate-100">
                @for (t of res.totales; track t.clave) {
                  <div class="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t.etiqueta }}</p>
                    <p class="text-xl font-extrabold text-slate-900 tabular-nums">{{ total(t) }}</p>
                  </div>
                }
              </div>

              <div class="divide-y divide-slate-100">
                @for (g of res.grupos; track g.clave) {
                  <section class="p-5">
                    <button type="button" class="w-full text-left flex flex-wrap items-center justify-between gap-2 cursor-pointer" (click)="alternarGrupo(g.clave)" [attr.aria-expanded]="grupoAbierto(g.clave)">
                      <div class="min-w-0">
                        <h3 class="font-extrabold text-slate-900 font-outfit flex items-center gap-2">
                          <i-lucide name="chevron-right" class="w-4 h-4 transition-transform" [class.rotate-90]="grupoAbierto(g.clave)" aria-hidden="true"></i-lucide>{{ g.titulo }}
                        </h3>
                        @if (res.reporte.agrupar === 'RETO') {
                          <p class="text-[11px] text-slate-500 ml-5">{{ datoDe(g, 'MODO') }} · {{ datoDe(g, 'SE MIDE') }} · {{ datoDe(g, 'DURACIÓN') }} · Premio: {{ datoDe(g, 'PREMIO') }}</p>
                        }
                        @if (res.reporte.agrupar === 'AGENCIA') {
                          <p class="text-[11px] text-slate-500 ml-5">{{ g.region || 'Sin región' }} · {{ g.cliente || 'Sin cliente' }}@if (g.responsable) { · Responsable: {{ g.responsable }} }</p>
                        }
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        @for (t of g.totales; track t.clave) { <span class="badge-info">{{ t.etiqueta }}: {{ total(t) }}</span> }
                      </div>
                    </button>

                    @if (grupoAbierto(g.clave)) {
                      <div class="mt-4 space-y-5">
                        @for (b of g.bloques; track b.clave) {
                          <div>
                            @if (b.etiqueta) { <p class="text-xs font-extrabold uppercase tracking-wide text-white bg-easydry-blue rounded-lg px-3 py-1.5 mb-2">{{ b.etiqueta }}</p> }
                            <div appTablaFija class="overflow-x-auto rounded-xl border border-slate-200">
                              <table class="min-w-full text-xs">
                                <thead>
                                  <tr class="bg-[#A9C8EC] text-slate-900">
                                    @for (c of res.columnas; track c.clave) { <th scope="col" class="px-2.5 py-2 font-extrabold uppercase text-[10px] tracking-wide whitespace-nowrap" [ngClass]="alinear(c)">{{ c.titulo }}</th> }
                                    @if (conDocumento(res)) { <th scope="col" class="px-2.5 py-2 font-extrabold uppercase text-[10px] tracking-wide whitespace-nowrap text-center">Documento</th> }
                                  </tr>
                                </thead>
                                <tbody>
                                  @for (f of filasVisibles(g, b); track $index) {
                                    <tr class="border-t border-slate-100" [class.bg-slate-50]="$odd">
                                      @for (c of res.columnas; track c.clave) {
                                        <td class="px-2.5 py-1.5" [ngClass]="alinear(c)">
                                          @if (c.tipo === 'marca') {
                                            @if (f[c.clave] === 'SI') { <i-lucide name="check" class="w-4 h-4 text-emerald-600 inline-block" aria-label="Sí"></i-lucide> }
                                            @else if (f[c.clave] === 'NO') { <i-lucide name="x" class="w-4 h-4 text-rose-600 inline-block" aria-label="No"></i-lucide> }
                                          } @else { {{ celda(f[c.clave], c) }} }
                                        </td>
                                      }
                                      @if (conDocumento(res)) {
                                        <td class="px-2.5 py-1.5 text-center whitespace-nowrap">
                                          @if (puedePdf) {
                                            <button type="button" class="btn-icon" (click)="descargarDocumento(res, f, 'PDF')" [disabled]="!!documentoEnCurso"
                                              [attr.aria-label]="'Exportar el documento completo en PDF de ' + etiquetaDocumento(res, f)" title="Documento completo en PDF">
                                              <i-lucide [name]="documentoEnCurso === f['_id'] + '|PDF' ? 'refresh-cw' : 'file-text'" class="w-4 h-4 text-rose-700" [class.animate-spin]="documentoEnCurso === f['_id'] + '|PDF'" aria-hidden="true"></i-lucide>
                                            </button>
                                          }
                                          @if (puedeExcel && res.reporte.id === 'auditorias-5s') {
                                            <button type="button" class="btn-icon" (click)="descargarDocumento(res, f, 'EXCEL')" [disabled]="!!documentoEnCurso"
                                              [attr.aria-label]="'Exportar el documento completo en Excel de ' + etiquetaDocumento(res, f)" title="Documento completo en Excel">
                                              <i-lucide [name]="documentoEnCurso === f['_id'] + '|EXCEL' ? 'refresh-cw' : 'file-spreadsheet'" class="w-4 h-4 text-emerald-700" [class.animate-spin]="documentoEnCurso === f['_id'] + '|EXCEL'" aria-hidden="true"></i-lucide>
                                            </button>
                                          }
                                        </td>
                                      }
                                    </tr>
                                  }
                                </tbody>
                              </table>
                            </div>
                            <div class="flex flex-wrap items-center justify-between gap-2 mt-2">
                              <p class="text-[11px] font-bold text-slate-600">@for (t of b.totales; track t.clave; let ult = $last) { {{ t.etiqueta }}: {{ total(t) }}{{ ult ? '' : ' · ' }} }</p>
                              @if (b.filas.length > limite(g, b)) {
                                <button type="button" class="btn-ghost btn-sm" (click)="verMas(g, b)">Mostrar {{ masFilas(g, b) }} más ({{ limite(g, b) }} de {{ b.filas.length }})</button>
                              } @else if (b.filas.length > filasPorTramo) {
                                <span class="text-[11px] text-slate-500">Mostrando las {{ b.filas.length }} filas</span>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </section>
                }
              </div>
            }
          </div>
        }
      }
    </div>

    <app-modal [isOpen]="!!avisoGrande" title="Reporte muy grande" icon="triangle-alert" size="md" (close)="avisoGrande = null">
      @if (avisoGrande && resultado) {
        <div class="space-y-3 text-sm text-slate-700">
          <p>Este reporte tiene <strong>{{ resultado.totalFilas }}</strong> filas.
            @if (avisoGrande === 'PDF') { El PDF tendrá cerca de <strong>{{ paginasPdf }}</strong> páginas y puede tardar o ponerse lento en el navegador. Para análisis es mejor Excel o acotar los filtros. }
            @else { El archivo puede tardar en generarse. Considera acotar los filtros (agencia, periodo). }
          </p>
          <p class="text-xs text-slate-500">Puedes exportarlo de todos modos.</p>
        </div>
      }
      <div modal-footer class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" (click)="avisoGrande = null">Cancelar</button>
        @if (puedePorAgencia) {
          <button type="button" class="btn-secondary" (click)="confirmarPorAgencia()">Un archivo por agencia</button>
        }
        <button type="button" class="btn-primary" (click)="confirmarGrande()">Exportar de todos modos</button>
      </div>
    </app-modal>

    <app-modal [isOpen]="!!porAgencia" [title]="porAgencia?.resultado ? 'Exportación terminada' : 'Exportando por agencia'" icon="file-spreadsheet" size="md" (close)="cerrarPorAgencia()">
      @if (porAgencia; as p) {
        <div class="space-y-3 text-sm text-slate-700">
          @if (!p.resultado) {
            <p>Agencia <strong>{{ p.actual }}</strong> de <strong>{{ p.total }}</strong>: {{ p.agencia || 'preparando…' }}</p>
            <div class="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" [attr.aria-valuenow]="p.actual" aria-valuemin="0" [attr.aria-valuemax]="p.total">
              <div class="h-full bg-easydry-green transition-all" [style.width.%]="p.total ? (p.actual / p.total) * 100 : 0"></div>
            </div>
            <p class="text-xs text-slate-500">Se descarga un archivo por agencia. Deja esta pestaña abierta hasta que termine; si el navegador pregunta por descargas múltiples, permítelas.</p>
          } @else {
            <p><strong>{{ p.resultado.exportadas.length }}</strong> {{ p.resultado.exportadas.length === 1 ? 'archivo descargado' : 'archivos descargados' }}.</p>
            @if (p.resultado.sinDatos.length) { <p class="text-xs text-slate-600">Sin datos en el periodo (no se generó archivo): {{ p.resultado.sinDatos.join(', ') }}.</p> }
            @if (p.resultado.fallidas.length) {
              <div class="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-800" role="alert">
                <p class="font-bold mb-1">No se pudieron generar:</p>
                @for (f of p.resultado.fallidas; track f.agencia) { <p>{{ f.agencia }}: {{ f.motivo }}</p> }
              </div>
            }
            @if (p.resultado.cancelado) { <p class="text-xs text-amber-700">Cancelaste la exportación. Quedaron sin procesar: {{ p.resultado.pendientes.join(', ') }}.</p> }
            @if (p.resultado.sinBitacora) { <p class="text-xs text-slate-500">{{ p.resultado.sinBitacora }} {{ p.resultado.sinBitacora === 1 ? 'archivo no pudo anotarse' : 'archivos no pudieron anotarse' }} en la bitácora.</p> }
          }
        </div>
      }
      <div modal-footer class="flex justify-end gap-2">
        @if (porAgencia?.resultado) {
          <button type="button" class="btn-primary" (click)="cerrarPorAgencia()">Cerrar</button>
        } @else {
          <button type="button" class="btn-secondary" (click)="cerrarPorAgencia()" [disabled]="cancelandoPorAgencia">{{ cancelandoPorAgencia ? 'Cancelando…' : 'Cancelar' }}</button>
        }
      </div>
    </app-modal>
  `,
})
export class ReportesComponent implements OnInit {
  private reporteService = inject(ReporteService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private informesApi = inject(InformesInspeccionService);
  private auditorias5sApi = inject(Auditoria5sService);
  private storage = inject(StorageUploadService);
  private catalogo5s: Catalogo5s | null = null;
  /** `id|formato` del documento que se está generando, para mostrar el indicador y no lanzar dos a la vez. */
  documentoEnCurso = '';

  readonly modos = MODOS;
  readonly mesesNombres = MESES;
  readonly filasPorTramo = FILAS_POR_TRAMO;
  readonly anios = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 4 + i);

  catalogo: ReporteCatalogo[] = [];
  opciones: OpcionesReportes | null = null;
  cargandoInicial = true;
  errorInicial = '';

  moduloSel = '';
  reporteId = '';

  regionId = '';
  clienteId = '';
  agenciaId = '';
  modo: ModoPeriodo = 'MES';
  fecha = hoyLocal();
  mesNum = new Date().getMonth() + 1;
  anio = new Date().getFullYear();
  desde = hoyLocal();
  hasta = hoyLocal();
  estado = '';
  lavadorId = '';
  pulidorId = '';
  productoId = '';
  ubicacion = '';
  semaforo = '';

  cargando = false;
  errorGenerar = '';
  resultado: ReporteGenerado | null = null;
  /** Filtros con los que se generó el resultado en pantalla: son los que se registran al exportar. */
  private filtrosUsados: FiltrosReporte | null = null;
  exportando: 'EXCEL' | 'PDF' | null = null;
  avisoGrande: 'EXCEL' | 'PDF' | null = null;
  /** Exportación de un archivo por agencia en curso (o recién terminada, con su resumen). */
  porAgencia: { formato: 'EXCEL' | 'PDF'; actual: number; total: number; agencia: string; resultado: ResultadoPorAgencia | null } | null = null;
  cancelandoPorAgencia = false;
  private cancelarPorAgenciaPedido = false;

  private abiertos = new Set<string>();
  private tramos = new Map<string, number>();

  get puedeExcel(): boolean { return this.authService.puede('reportes.excel'); }
  get puedePdf(): boolean { return this.authService.puede('reportes.pdf'); }

  /** Un archivo por agencia solo tiene sentido en reportes agrupados por agencia y si no se eligió ya una sola. */
  get puedePorAgencia(): boolean {
    const rep = this.reporte;
    return !!rep && rep.agrupar === 'AGENCIA' && !this.agenciaId && this.agenciasOpc.length > 1 && (this.puedeExcel || this.puedePdf);
  }

  get modulos(): string[] { return [...new Set(this.catalogo.map((r) => r.modulo))]; }
  get reportesDelModulo(): ReporteCatalogo[] { return this.catalogo.filter((r) => r.modulo === this.moduloSel); }
  get reporte(): ReporteCatalogo | undefined { return this.catalogo.find((r) => r.id === this.reporteId); }

  get clientesOpc() {
    const o = this.opciones;
    if (!o) return [];
    if (!this.regionId) return o.clientes;
    const ids = new Set(o.agencias.filter((a) => a.regionId === this.regionId).map((a) => a.clienteId));
    return o.clientes.filter((c) => ids.has(c.id));
  }

  get agenciasOpc() {
    return (this.opciones?.agencias ?? []).filter((a) => (!this.regionId || a.regionId === this.regionId) && (!this.clienteId || a.clienteId === this.clienteId));
  }

  get lavadoresOpc() {
    const ids = new Set(this.agenciasOpc.filter((a) => !this.agenciaId || a.id === this.agenciaId).map((a) => a.id));
    return (this.opciones?.lavadores ?? []).filter((l) => !!l.agenciaId && ids.has(l.agenciaId));
  }

  get opcionesRegion(): OpcionSelect[] {
    return (this.opciones?.regiones ?? []).map((r) => ({ value: r.id, label: r.nombre }));
  }

  get opcionesCliente(): OpcionSelect[] {
    return this.clientesOpc.map((c) => ({ value: c.id, label: c.nombre }));
  }

  get opcionesAgencia(): OpcionSelect[] {
    return this.agenciasOpc.map((a) => ({ value: a.id, label: `${a.nombre}${a.activa ? '' : ' (inactiva)'}` }));
  }

  get opcionesLavador(): OpcionSelect[] {
    return this.lavadoresOpc.map((l) => ({ value: l.id, label: l.nombre }));
  }

  /**
   * Pulidores del filtro: los fijos de las agencias que quedan elegidas y, si no se eligió una agencia, también los móviles de la
   * región (o de todas las regiones si no se eligió ninguna).
   */
  get pulidoresOpc() {
    const agencias = new Set(this.agenciasOpc.filter((a) => !this.agenciaId || a.id === this.agenciaId).map((a) => a.id));
    return (this.opciones?.pulidores ?? []).filter((p) => (p.agenciaId ? agencias.has(p.agenciaId) : !this.agenciaId && (!this.regionId || p.regionId === this.regionId)));
  }

  get opcionesPulidor(): OpcionSelect[] {
    return this.pulidoresOpc.map((p) => ({ value: p.id, label: p.nombre, sublabel: p.agenciaId ? undefined : 'Móvil' }));
  }

  get opcionesProducto(): OpcionSelect[] {
    return (this.opciones?.productos ?? []).map((p) => ({ value: p.id, label: p.nombre }));
  }

  get paginasPdf(): number {
    return Math.ceil((this.resultado?.totalFilas ?? 0) / FILAS_POR_PAGINA_PDF);
  }

  ngOnInit(): void {
    this.reporteService.catalogo().subscribe({
      next: (catalogo) => {
        this.catalogo = catalogo;
        if (catalogo.length) {
          this.moduloSel = catalogo[0].modulo;
          this.reporteId = catalogo[0].id;
          // Regiones, clientes y agencias siempre; lavadores, pulidores y productos solo si el reporte elegido los filtra.
          const listas = this.listasDelReporte();
          this.reporteService.opciones(listas).subscribe({
            next: (o) => { this.opciones = o; listas.forEach((l) => this.listasCargadas.add(l)); this.cargandoInicial = false; },
            error: (e) => this.falloInicial(e),
          });
        } else {
          this.cargandoInicial = false;
        }
      },
      error: (e) => this.falloInicial(e),
    });
  }

  private falloInicial(e: unknown): void {
    this.errorInicial = this.mensajeDe(e, 'No se pudieron cargar los reportes.');
    this.cargandoInicial = false;
  }

  elegirModulo(modulo: string): void {
    this.moduloSel = modulo;
    this.elegirReporte(this.reportesDelModulo[0]?.id ?? '');
  }

  private listasCargadas = new Set<'productos' | 'lavadores' | 'pulidores'>();

  /** Listas largas que necesita el filtro del reporte elegido. */
  private listasDelReporte(): ('productos' | 'lavadores' | 'pulidores')[] {
    const extras = this.reporte?.extras ?? [];
    const listas: ('productos' | 'lavadores' | 'pulidores')[] = [];
    if (extras.includes('lavador')) listas.push('lavadores');
    if (extras.includes('pulidor')) listas.push('pulidores');
    if (extras.includes('producto')) listas.push('productos');
    return listas;
  }

  /** Pide las listas que el reporte elegido necesita y todavía no se cargaron (una sola vez cada una). */
  private asegurarListasDelReporte(): void {
    const faltan = this.listasDelReporte().filter((l) => !this.listasCargadas.has(l));
    if (!faltan.length || !this.opciones) return;
    faltan.forEach((l) => this.listasCargadas.add(l));
    this.reporteService.opciones(faltan).subscribe({
      next: (o) => {
        if (!this.opciones) return;
        this.opciones = { ...this.opciones, ...Object.fromEntries(faltan.map((l) => [l, o[l]])) } as OpcionesReportes;
      },
      error: () => faltan.forEach((l) => this.listasCargadas.delete(l)),
    });
  }

  elegirReporte(id: string): void {
    this.reporteId = id;
    this.estado = '';
    this.lavadorId = '';
    this.pulidorId = '';
    this.ubicacion = '';
    this.semaforo = '';
    this.productoId = '';
    this.resultado = null;
    this.errorGenerar = '';
    this.asegurarListasDelReporte();
  }

  cambioRegion(): void {
    if (this.clienteId && !this.clientesOpc.some((c) => c.id === this.clienteId)) this.clienteId = '';
    this.limpiarAgencia();
  }

  cambioCliente(): void {
    this.limpiarAgencia();
  }

  private limpiarAgencia(): void {
    if (this.agenciaId && !this.agenciasOpc.some((a) => a.id === this.agenciaId)) this.agenciaId = '';
    this.lavadorId = '';
    this.pulidorId = '';
  }

  private periodoActual(): PeriodoReporte {
    switch (this.modo) {
      case 'DIA':
      case 'SEMANA_DE': return { modo: this.modo, fecha: this.fecha };
      case 'MES_DE': return { modo: 'MES_DE', mes: `${this.anio}-${String(this.mesNum).padStart(2, '0')}` };
      case 'ANIO_DE': return { modo: 'ANIO_DE', anio: this.anio };
      case 'RANGO': return { modo: 'RANGO', desde: this.desde, hasta: this.hasta };
      default: return { modo: this.modo };
    }
  }

  private construirFiltros(rep: ReporteCatalogo): FiltrosReporte {
    const f: FiltrosReporte = { reporteId: rep.id };
    if (this.regionId) f.regionId = this.regionId;
    if (this.clienteId) f.clienteId = this.clienteId;
    if (this.agenciaId) f.agenciaIds = [this.agenciaId];
    if (rep.periodo) f.periodo = this.periodoActual();
    if (rep.extras.includes('estado') && this.estado) f.estado = this.estado;
    if (rep.extras.includes('lavador') && this.lavadorId) f.lavadorId = this.lavadorId;
    if (rep.extras.includes('pulidor') && this.pulidorId) f.pulidorId = this.pulidorId;
    if (rep.extras.includes('producto') && this.productoId) f.productoId = this.productoId;
    if (rep.extras.includes('ubicacion') && this.ubicacion) f.ubicacion = this.ubicacion as FiltrosReporte['ubicacion'];
    if (rep.extras.includes('semaforo') && this.semaforo) f.semaforo = this.semaforo as FiltrosReporte['semaforo'];
    return f;
  }

  /** Mensaje de lo que falta antes de pedir el reporte; null si está completo. */
  private pendiente(rep: ReporteCatalogo): string | null {
    if (rep.extras.includes('producto') && !this.productoId) return 'Elige el producto del kardex.';
    if (!rep.periodo) return null;
    if ((this.modo === 'DIA' || this.modo === 'SEMANA_DE') && !this.fecha) return 'Elige la fecha.';
    if (this.modo === 'RANGO') {
      if (!this.desde || !this.hasta) return 'Indica las fechas inicial y final.';
      if (this.hasta < this.desde) return 'La fecha final no puede ser anterior a la inicial.';
    }
    return null;
  }

  generar(): void {
    const rep = this.reporte;
    if (!rep || this.cargando) return;
    const falta = this.pendiente(rep);
    this.errorGenerar = falta ?? '';
    if (falta) return;

    const filtros = this.construirFiltros(rep);
    this.cargando = true;
    this.reporteService.generar(filtros).subscribe({
      next: (res) => {
        this.resultado = res;
        this.filtrosUsados = filtros;
        this.cargando = false;
        this.abiertos = new Set(res.grupos.length <= 3 ? res.grupos.map((g) => g.clave) : res.grupos.slice(0, 1).map((g) => g.clave));
        this.tramos.clear();
      },
      error: (e) => {
        this.errorGenerar = this.mensajeDe(e, 'No se pudo generar el reporte.');
        this.cargando = false;
      },
    });
  }

  // --- Exportación ---

  pedirExportacion(formato: 'EXCEL' | 'PDF'): void {
    const res = this.resultado;
    if (!res || this.exportando) return;
    if (res.totalFilas > res.umbrales[formato]) this.avisoGrande = formato;
    else void this.exportar(formato);
  }

  confirmarGrande(): void {
    const formato = this.avisoGrande;
    this.avisoGrande = null;
    if (formato) void this.exportar(formato);
  }

  private async exportar(formato: 'EXCEL' | 'PDF'): Promise<void> {
    const res = this.resultado;
    const filtros = this.filtrosUsados;
    if (!res || !filtros) return;
    this.exportando = formato;
    try {
      // Se carga al exportar: Excel y PDF pesan bastante y la mayoría de las visitas solo mira la pantalla.
      const modulo = await import('./reportes-export');
      if (formato === 'EXCEL') await modulo.exportarExcel(res);
      else await modulo.exportarPdf(res);
      this.toast.success('Reporte exportado', `Se descargó el archivo ${formato === 'EXCEL' ? 'Excel' : 'PDF'}.`);
      this.reporteService.registrarExportacion(filtros, formato, res.totalFilas).subscribe({
        error: () => this.toast.warning('Bitácora', 'El archivo se descargó, pero no se pudo registrar la exportación.'),
      });
    } catch {
      this.toast.error('No se pudo exportar', 'Ocurrió un error al generar el archivo. Intenta de nuevo o acota los filtros.');
    } finally {
      this.exportando = null;
    }
  }

  // --- Un archivo por agencia (reportes grandes) ---

  /** Desde el formulario: no hay vista previa, así que los filtros son los que están en pantalla. */
  pedirPorAgencia(formato: 'EXCEL' | 'PDF'): void {
    const rep = this.reporte;
    if (!rep || this.porAgencia) return;
    const falta = this.pendiente(rep);
    this.errorGenerar = falta ?? '';
    if (falta) return;
    void this.iniciarPorAgencia(formato, this.construirFiltros(rep));
  }

  /** Desde el aviso de reporte grande: se usan los filtros con los que se generó la vista previa. */
  confirmarPorAgencia(): void {
    const formato = this.avisoGrande;
    const base = this.filtrosUsados;
    this.avisoGrande = null;
    if (formato && base) void this.iniciarPorAgencia(formato, base);
  }

  cerrarPorAgencia(): void {
    if (this.porAgencia?.resultado) {
      this.porAgencia = null;
      return;
    }
    // En curso: se pide parar; termina la agencia que se está armando y se muestra el resumen.
    this.cancelarPorAgenciaPedido = true;
    this.cancelandoPorAgencia = true;
  }

  private agenciasDe(base: FiltrosReporte): AgenciaDestino[] {
    return (this.opciones?.agencias ?? [])
      .filter((a) => (!base.regionId || a.regionId === base.regionId) && (!base.clienteId || a.clienteId === base.clienteId))
      .map((a) => ({ id: a.id, nombre: a.nombre }));
  }

  private async iniciarPorAgencia(formato: 'EXCEL' | 'PDF', filtros: FiltrosReporte): Promise<void> {
    const { agenciaIds: _una, ...base } = filtros;
    const agencias = this.agenciasDe(base);
    if (!agencias.length) return;
    this.cancelarPorAgenciaPedido = false;
    this.cancelandoPorAgencia = false;
    this.porAgencia = { formato, actual: 0, total: agencias.length, agencia: '', resultado: null };
    try {
      const modulo = await import('./reportes-export');
      const resultado = await exportarPorAgencia(base, agencias, {
        generar: (f) => firstValueFrom(this.reporteService.generar(f)).catch((e) => Promise.reject(new Error(this.mensajeDe(e, 'No se pudo generar el reporte.')))),
        exportar: (res, agencia) => (formato === 'EXCEL' ? modulo.exportarExcel(res, agencia.nombre) : modulo.exportarPdf(res, agencia.nombre)),
        registrar: async (f, total) => void (await firstValueFrom(this.reporteService.registrarExportacion(f, formato, total))),
        progreso: (p) => {
          if (this.porAgencia) this.porAgencia = { ...this.porAgencia, actual: p.actual, total: p.total, agencia: p.agencia };
        },
        cancelado: () => this.cancelarPorAgenciaPedido,
      });
      this.porAgencia = this.porAgencia ? { ...this.porAgencia, resultado } : null;
    } catch {
      this.porAgencia = null;
      this.toast.error('No se pudo exportar', 'Ocurrió un error al preparar la exportación por agencia. Intenta de nuevo.');
    } finally {
      this.cancelandoPorAgencia = false;
    }
  }

  // --- Vista previa ---

  /** Los informes y las auditorías 5S se pueden exportar completos, una por una, desde la vista previa. */
  conDocumento(res: ReporteGenerado): boolean {
    return res.reporte.id === 'informes-inspeccion' || res.reporte.id === 'auditorias-5s';
  }

  etiquetaDocumento(res: ReporteGenerado, fila: FilaReporte): string {
    return String(fila[res.reporte.id === 'informes-inspeccion' ? 'numero' : 'codigo'] ?? '');
  }

  /** Descarga el documento formal de una auditoría: el mismo archivo que se baja desde su pantalla de detalle. */
  async descargarDocumento(res: ReporteGenerado, fila: FilaReporte, formato: 'PDF' | 'EXCEL'): Promise<void> {
    const id = String(fila['_id'] ?? '');
    if (!id || this.documentoEnCurso) return;
    this.documentoEnCurso = `${id}|${formato}`;
    try {
      if (res.reporte.id === 'informes-inspeccion') {
        const informe = await firstValueFrom(this.informesApi.getDetalle(id));
        const { descargarPdfInforme } = await import('../auditorias/informes/informe-pdf');
        await descargarPdfInforme(informe, this.storage);
      } else {
        this.catalogo5s ??= await firstValueFrom(this.auditorias5sApi.getCatalogo());
        const auditoria = await firstValueFrom(this.auditorias5sApi.getDetalle(id));
        const formatoAuditoria = this.catalogo5s.formatos.find((f) => f.id === auditoria.formato);
        if (!formatoAuditoria) throw new Error('No se encontró el formato de esta auditoría.');
        const exportador = await import('../auditorias/auditoria5s/auditoria5s-export');
        if (formato === 'PDF') await exportador.descargarPdf5s(auditoria, formatoAuditoria, this.storage);
        else exportador.descargarExcel5s(auditoria, formatoAuditoria);
      }
      if (this.filtrosUsados) {
        this.reporteService.registrarExportacion(this.filtrosUsados, formato, 1, id).subscribe({
          error: () => this.toast.warning('Bitácora', 'El archivo se descargó, pero no se pudo registrar la exportación.'),
        });
      }
    } catch (e) {
      this.toast.error('No se pudo exportar la auditoría', mensajeError(e, 'Intenta de nuevo.'));
    } finally {
      this.documentoEnCurso = '';
    }
  }

  total(t: TotalReporte): string { return formatearTotal(t); }
  /** Dato del encabezado de un grupo (los retos llevan los suyos: modo, duración, premio…). */
  datoDe(g: GrupoReporte, etiqueta: string): string { return g.datos?.find((d) => d.etiqueta === etiqueta)?.valor ?? ''; }
  fechaHora(iso: string): string { return fechaHoraCorta(iso); }
  celda(valor: ValorCelda | undefined, c: ColumnaReporte): string { return formatearCelda(valor, c.tipo); }
  /** Todas las celdas van centradas. */
  alinear(_c: ColumnaReporte): string {
    return 'text-center';
  }

  alternarGrupo(clave: string): void {
    if (!this.abiertos.delete(clave)) this.abiertos.add(clave);
  }

  grupoAbierto(clave: string): boolean { return this.abiertos.has(clave); }

  private claveBloque(g: GrupoReporte, b: BloqueReporte): string { return `${g.clave}|${b.clave}`; }
  limite(g: GrupoReporte, b: BloqueReporte): number { return this.tramos.get(this.claveBloque(g, b)) ?? FILAS_POR_TRAMO; }
  masFilas(g: GrupoReporte, b: BloqueReporte): number { return Math.min(FILAS_POR_TRAMO, b.filas.length - this.limite(g, b)); }
  verMas(g: GrupoReporte, b: BloqueReporte): void { this.tramos.set(this.claveBloque(g, b), this.limite(g, b) + FILAS_POR_TRAMO); }
  filasVisibles(g: GrupoReporte, b: BloqueReporte) { return b.filas.slice(0, this.limite(g, b)); }

  private mensajeDe(e: unknown, defecto: string): string {
    if (e instanceof HttpErrorResponse) {
      const m = e.error?.message;
      if (Array.isArray(m)) return m.join(' ');
      if (typeof m === 'string' && m) return m;
    }
    return defecto;
  }
}

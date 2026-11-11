import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { AuthService } from '../../core/services/auth.service';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { AjusteHorarioApi, EstadoTimbrada, EvaluacionDiaApi, HorarioPersonaApi, PersonaEquipo, ResultadoTimbrada, RrhhService, TimbradaApi } from '../../core/services/rrhh.service';
import { ESTADOS_NOVEDAD, ETIQUETA_ESTADO_DIA, ETIQUETA_VERIFICACION, FilaDia, ZONA_ECUADOR, filasDelRango, resumenSemana, textoMinutos } from './rrhh.modelos';
import { RrhhHorariosComponent } from './rrhh-horarios.component';
import { exportarCumplimientoExcel, exportarCumplimientoPdf } from './rrhh-horarios-export';

type Pestana = 'marcar' | 'equipo' | 'horarios';

/** Resultado de la última timbrada para mostrar la alerta de aceptada o rechazada. */
interface Alerta { aceptada: boolean; titulo: string; mensaje: string }

const mensajeDe = (e: unknown, defecto: string): string => {
  const m = (e as { error?: { message?: string | string[] } } | null)?.error?.message;
  return Array.isArray(m) ? m.join(', ') : m ? String(m) : defecto;
};

const aDia = (d: Date): string => {
  const ecuador = new Date(d.getTime() - 5 * 3_600_000);
  return ecuador.toISOString().slice(0, 10);
};

/**
 * RRHH · Timbradas. «Timbrar»: la persona toma una foto con la cámara; al guardar se lee su ubicación y el servidor decide si es entrada o
 * salida según el horario de la persona (la hora del servidor; solo se puede timbrar dentro de la ventana del horario y en días de
 * trabajo) y valida que esté dentro del radio de su sitio. «Equipo»: el cumplimiento del horario de las personas del alcance de quien consulta.
 * «Horarios»: el horario de cada persona, con su historial; solo ADMIN y SUPER_ADMIN lo editan.
 */
@Component({
  selector: 'app-rrhh-timbradas',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, RrhhHorariosComponent],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold mb-2">
          <i-lucide name="clock" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide><span>RRHH</span>
        </div>
        <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Timbradas</h1>
        <p class="text-slate-500 text-xs mt-1 max-w-2xl">La marca es entrada o salida según tu horario, y solo se puede timbrar cerca de esas horas. La hora la pone el servidor. La foto es siempre de la cámara.</p>
      </div>

      @if (verMarcar || verEquipo) {
        <div class="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Timbradas">
          @if (verMarcar) {
            <button type="button" role="tab" [attr.aria-selected]="pestana === 'marcar'" class="px-4 min-h-11 text-sm font-bold border-b-2 -mb-px transition-colors" [ngClass]="pestana === 'marcar' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-800'" (click)="pestana = 'marcar'">Timbrar</button>
          }
          @if (verEquipo) {
            <button type="button" role="tab" [attr.aria-selected]="pestana === 'equipo'" class="px-4 min-h-11 text-sm font-bold border-b-2 -mb-px transition-colors" [ngClass]="pestana === 'equipo' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-800'" (click)="pestana = 'equipo'">Timbradas del equipo</button>
            <button type="button" role="tab" [attr.aria-selected]="pestana === 'horarios'" class="px-4 min-h-11 text-sm font-bold border-b-2 -mb-px transition-colors" [ngClass]="pestana === 'horarios' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-800'" (click)="pestana = 'horarios'">Horarios</button>
          }
        </div>
      }

      @if (pestana === 'marcar' && verMarcar) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 space-y-4" aria-label="Registrar timbrada">
            <h2 class="font-extrabold text-slate-900">Registrar timbrada</h2>
            @if (estado) {
              <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1">
                <p>Ahora son las <strong>{{ estado.ahora | date:'HH:mm':zona }}</strong> (hora del servidor).
                  @if (estado.puedeTimbrar) { Se registraría una <strong>{{ estado.tipoActual === 'ENTRADA' ? 'entrada' : 'salida' }}</strong>. }
                </p>
                @if (estado.horario.trabaja && estado.ventanas) {
                  <p>Tu horario de hoy: <strong>{{ estado.horario.entrada }} a {{ estado.horario.salida }}</strong> · entrada de {{ estado.ventanas.entrada.desde }} a {{ estado.ventanas.entrada.hasta }} · salida de {{ estado.ventanas.salida.desde }} a {{ estado.ventanas.salida.hasta }}.</p>
                } @else { <p>Hoy es tu <strong>día libre</strong>.</p> }
                @if (!estado.puedeTimbrar && estado.motivoBloqueo) {
                  <p class="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-2 font-semibold" role="status">{{ estado.motivoBloqueo }}</p>
                }
                @for (s of estado.sitios; track s.nombre) {
                  <p>{{ s.tipo === 'AGENCIA' ? 'Agencia' : 'Bodega' }}: <strong>{{ s.nombre }}</strong> · radio {{ s.radioM }} m@if (!s.tieneUbicacion) { <span class="badge badge-warn ml-1">Sin ubicación configurada</span> }</p>
                }
                <p class="text-slate-600">
                  @if (estado.modo === 'CUALQUIER_AGENCIA') { Solo puedes timbrar dentro de una agencia: debes estar a {{ estado.radioM }} m o menos de una. }
                  @else { Solo puedes timbrar dentro de tu {{ estado.modo === 'BODEGA' ? 'bodega' : 'agencia' }}: debes estar a {{ estado.radioM }} m o menos. }
                  El GPS debe tener una precisión de {{ estado.precisionMaxM }} m o mejor.
                </p>
                @if (estado.marcasHoy.length) {
                  <p class="pt-1 font-bold text-slate-700">Hoy ya marcaste:
                    @for (m of estado.marcasHoy; track m.id) { <span class="badge badge-ok ml-1">{{ m.tipo === 'ENTRADA' ? 'Entrada' : 'Salida' }} {{ m.marcadaEn | date:'HH:mm':zona }}</span> }
                  </p>
                }
              </div>
            }

            <div class="space-y-2">
              <p class="field-label">Foto *</p>
              @if (foto) {
                <img [src]="fotoVista" alt="Foto de la timbrada" class="w-full max-w-sm rounded-xl border border-slate-200">
                <button type="button" class="btn btn-secondary btn-sm" (click)="repetirFoto()"><i-lucide name="rotate-ccw" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Repetir foto</button>
              } @else if (camaraActiva) {
                <video #video class="w-full max-w-sm rounded-xl bg-slate-900" autoplay playsinline muted></video>
                <div class="flex gap-2">
                  <button type="button" class="btn btn-primary btn-sm" (click)="tomarFoto()"><i-lucide name="camera" class="w-4 h-4" aria-hidden="true"></i-lucide> Tomar foto</button>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="detenerCamara()">Cancelar</button>
                </div>
              } @else {
                <button type="button" class="btn btn-secondary" (click)="abrirCamara()"><i-lucide name="camera" class="w-4 h-4" aria-hidden="true"></i-lucide> Abrir cámara</button>
              }
              @if (errorCamara) {
                <div class="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900" role="status">
                  <p class="font-semibold">{{ errorCamara }}</p>
                  <p class="text-[11px] mt-1">La foto debe tomarse con la cámara en ese momento. Si esta computadora no tiene cámara, timbra desde la app en tu celular.</p>
                </div>
              }
              <canvas #lienzo class="hidden"></canvas>
            </div>

            <button type="button" class="btn btn-cta w-full sm:w-auto" (click)="timbrar()" [disabled]="!foto || procesando || (estado && !estado.puedeTimbrar)">
              <i-lucide name="map-pin" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ procesando ? paso : 'Guardar timbrada' }}
            </button>

            @if (alerta) {
              <div class="rounded-xl border-2 p-3 flex items-start gap-3" [ngClass]="alerta.aceptada ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-rose-300 bg-rose-50 text-rose-900'" role="alert">
                <i-lucide [name]="alerta.aceptada ? 'check-circle' : 'x-circle'" class="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true"></i-lucide>
                <div><p class="font-extrabold text-sm">{{ alerta.titulo }}</p><p class="text-xs">{{ alerta.mensaje }}</p></div>
              </div>
            }
          </section>

          <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 space-y-3" aria-label="Mis timbradas">
            @if (miHorario) {
              <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1">
                <p class="font-extrabold text-slate-900">Mi horario</p>
                @for (l of resumen(miHorario.semana); track l) { <p class="font-mono">{{ l }}</p> }
                @if (miHorario.porDefecto) { <span class="badge badge-neutral">Horario por defecto</span> }
                @if (miHorario.proximoCambio) {
                  <p class="pt-1 font-bold text-easydry-blue">Desde el {{ miHorario.proximoCambio.vigenteDesde | date:'dd/MM/yyyy' }}:</p>
                  @for (l of resumen(miHorario.proximoCambio.semana); track l) { <p class="font-mono">{{ l }}</p> }
                }
                @if (ajuste) { <p class="text-slate-500 pt-1">Puntual dentro de ±{{ ajuste.toleranciaMin }} min de tu hora.</p> }
              </div>
            }
            <h2 class="font-extrabold text-slate-900">Mis últimos días</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr class="text-left text-xs text-slate-500 border-b border-slate-200"><th class="py-2 pr-3 font-bold">Fecha</th><th class="py-2 pr-3 font-bold">Entrada</th><th class="py-2 pr-3 font-bold">Salida</th><th class="py-2 pr-3 font-bold">Horas</th><th class="py-2 font-bold">Estado</th></tr></thead>
                <tbody>
                  @for (d of misFilas; track d.dia) {
                    <tr class="border-b border-slate-100 align-top">
                      <td class="py-2 pr-3 whitespace-nowrap">{{ d.dia | date:'EEE dd/MM' }}</td>
                      <td class="py-2 pr-3">@if (d.entrada) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.entrada)">{{ d.entrada.marcadaEn | date:'HH:mm':zona }}</button><span class="block text-[11px] text-slate-500">{{ minutos(d.minutosEntrada) }}</span> } @else { <span class="text-slate-400">—</span> }</td>
                      <td class="py-2 pr-3">@if (d.salida) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.salida)">{{ d.salida.marcadaEn | date:'HH:mm':zona }}</button><span class="block text-[11px] text-slate-500">{{ minutos(d.minutosSalida) }}</span> } @else { <span class="text-slate-400">—</span> }</td>
                      <td class="py-2 pr-3 font-mono text-xs">@if (d.horasReales !== null) { {{ d.horasReales | number:'1.1-2' }} h<span class="block text-[11px] text-slate-500">{{ d.horasDentroHorario | number:'1.1-2' }} h en horario</span> } @else { — }</td>
                      <td class="py-2"><span class="badge" [ngClass]="etiqueta(d.estado).clase">{{ etiqueta(d.estado).nombre }}</span></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="py-8 text-center text-sm text-slate-500">Aún no tienes días para mostrar.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      }

      @if (pestana === 'equipo' && verEquipo) {
        <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 space-y-3" aria-label="Timbradas del equipo">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="font-extrabold text-slate-900">Resumen por día</h2>
            <div class="flex flex-wrap gap-3 items-end">
              <div>
                <label class="field-label" for="rs-desde">Desde</label>
                <input id="rs-desde" type="date" class="field" [(ngModel)]="desde" [max]="hasta">
              </div>
              <div>
                <label class="field-label" for="rs-hasta">Hasta</label>
                <input id="rs-hasta" type="date" class="field" [(ngModel)]="hasta" [min]="desde">
              </div>
              <div>
                <label class="field-label" for="rs-op">Persona</label>
                <select id="rs-op" class="field" [(ngModel)]="filtroPersona">
                  <option value="">Todas</option>
                  @for (p of personas; track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }
                </select>
              </div>
              <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 min-h-11">
                <input type="checkbox" [(ngModel)]="soloNovedades"> Solo con novedades
              </label>
              <button type="button" class="btn btn-primary" (click)="cargarEquipo()" [disabled]="cargandoEquipo">{{ cargandoEquipo ? 'Cargando…' : 'Consultar' }}</button>
              <button type="button" class="btn btn-secondary" (click)="exportar('excel')" [disabled]="!filasEquipo.length"><i-lucide name="download" class="w-4 h-4" aria-hidden="true"></i-lucide> Excel</button>
              <button type="button" class="btn btn-secondary" (click)="exportar('pdf')" [disabled]="!filasEquipo.length"><i-lucide name="download" class="w-4 h-4" aria-hidden="true"></i-lucide> PDF</button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="text-left text-xs text-slate-500 border-b border-slate-200">
                <th class="py-2 pr-3 font-bold">Fecha</th><th class="py-2 pr-3 font-bold">Persona</th><th class="py-2 pr-3 font-bold">Horario</th><th class="py-2 pr-3 font-bold">Entrada</th><th class="py-2 pr-3 font-bold">Salida</th><th class="py-2 pr-3 font-bold">Horas reales</th><th class="py-2 pr-3 font-bold">Horas en horario</th><th class="py-2 font-bold">Estado</th>
              </tr></thead>
              <tbody>
                @for (d of filasEquipo; track d.dia + d.userId) {
                  <tr class="border-b border-slate-100 align-top">
                    <td class="py-2 pr-3 whitespace-nowrap">{{ d.dia | date:'EEE dd/MM' }}</td>
                    <td class="py-2 pr-3">{{ d.persona }}</td>
                    <td class="py-2 pr-3 font-mono text-xs whitespace-nowrap">{{ d.horario ? d.horario.entrada + '–' + d.horario.salida : '—' }}</td>
                    <td class="py-2 pr-3">@if (d.entrada) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.entrada)">{{ d.entrada.marcadaEn | date:'HH:mm':zona }}</button><span class="block text-[11px] text-slate-500">{{ minutos(d.minutosEntrada) }}</span> } @else { <span class="text-slate-400">—</span> }</td>
                    <td class="py-2 pr-3">@if (d.salida) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.salida)">{{ d.salida.marcadaEn | date:'HH:mm':zona }}</button><span class="block text-[11px] text-slate-500">{{ minutos(d.minutosSalida) }}</span> } @else { <span class="text-slate-400">—</span> }</td>
                    <td class="py-2 pr-3 font-mono">{{ d.horasReales !== null ? (d.horasReales | number:'1.1-2') + ' h' : '—' }}</td>
                    <td class="py-2 pr-3 font-mono">{{ d.horasDentroHorario !== null ? (d.horasDentroHorario | number:'1.1-2') + ' h' : '—' }}</td>
                    <td class="py-2">
                      <span class="badge" [ngClass]="etiqueta(d.estado).clase">{{ etiqueta(d.estado).nombre }}</span>
                      @if (d.observaciones.length > 1) { <span class="block text-[11px] text-slate-500">{{ observaciones(d) }}</span> }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="py-8 text-center text-sm text-slate-500">{{ cargandoEquipo ? 'Cargando…' : 'No hay días con esos filtros.' }}</td></tr>
                }
              </tbody>
            </table>
          </div>
          <p class="text-[11px] text-slate-500">«Sin marca» es un día de trabajo sin ninguna timbrada; puede deberse a un permiso o a vacaciones, que este módulo aún no registra. «Incompleto» es un día con una sola marca: no se calculan horas. Las horas en horario descuentan lo trabajado antes de la entrada o después de la salida del horario.</p>
        </section>
      }

      @if (pestana === 'horarios' && verEquipo) { <app-rrhh-horarios></app-rrhh-horarios> }

      <app-modal [isOpen]="!!marca" [title]="marca ? (marca.tipo === 'ENTRADA' ? 'Entrada' : 'Salida') + ' · ' + marca.persona : ''" icon="camera" size="md" (close)="cerrarMarca()">
        @if (marca) {
          <div class="space-y-3 text-sm">
            @if (fotoMarca) { <img [src]="fotoMarca" [alt]="'Foto de la timbrada de ' + marca.persona" class="w-full rounded-xl border border-slate-200"> }
            @else { <div class="w-full h-40 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-500">{{ errorFotoMarca || 'Cargando foto…' }}</div> }
            <p class="text-slate-700">{{ marca.marcadaEn | date:'dd/MM/yyyy':zona }} a las <strong>{{ marca.marcadaEn | date:'HH:mm':zona }}</strong>@if (marca.sitio) { · {{ marca.sitio.nombre }} }</p>
            <p class="text-xs text-slate-500">
              <span class="badge" [ngClass]="marca.verificacion === 'VERIFICADA' ? 'badge-ok' : 'badge-warn'">{{ verificacion(marca.verificacion) }}</span>
              @if (marca.distanciaM !== null) { · Estaba a {{ marca.distanciaM | number:'1.0-0' }} m (límite {{ marca.radioM }} m) }
              @if (marca.precisionM !== null) { · Precisión del GPS {{ marca.precisionM | number:'1.0-0' }} m }
              · Desde {{ marca.origen === 'APP' ? 'la app' : 'la web' }}
            </p>
          </div>
        }
      </app-modal>
    </div>
  `,
})
export class RrhhTimbradasComponent implements OnInit, OnDestroy {
  private readonly api = inject(RrhhService);
  private readonly auth = inject(AuthService);
  private readonly almacenamiento = inject(StorageUploadService);
  private readonly toast = inject(ToastService);

  readonly zona = ZONA_ECUADOR;
  verMarcar = false;
  verEquipo = false;
  readonly resumen = resumenSemana;
  pestana: Pestana = 'marcar';

  estado: EstadoTimbrada | null = null;
  foto: Blob | null = null;
  fotoVista = '';
  camaraActiva = false;
  errorCamara = '';
  procesando = false;
  paso = '';
  alerta: Alerta | null = null;
  misMarcas: TimbradaApi[] = [];
  misEvaluacion: EvaluacionDiaApi[] = [];
  miHorario: HorarioPersonaApi | null = null;
  ajuste: AjusteHorarioApi | null = null;
  nombreMio = '';

  desde = aDia(new Date(Date.now() - 13 * 86_400_000));
  hasta = aDia(new Date());
  filtroPersona = '';
  soloNovedades = false;
  cargandoEquipo = false;
  marcasEquipo: TimbradaApi[] = [];
  evaluacionEquipo: EvaluacionDiaApi[] = [];
  personas: PersonaEquipo[] = [];

  marca: TimbradaApi | null = null;
  fotoMarca = '';
  errorFotoMarca = '';

  private flujo: MediaStream | null = null;
  @ViewChild('video') private video?: ElementRef<HTMLVideoElement>;
  @ViewChild('lienzo') private lienzo?: ElementRef<HTMLCanvasElement>;

  ngOnInit(): void {
    // Un administrador no timbra: solo consulta las timbradas.
    this.verMarcar = this.auth.puede('rrhh.timbrar') && !this.auth.puede('funcion.administrador');
    this.verEquipo = this.auth.puede('rrhh.timbradas.ver');
    this.pestana = this.verMarcar ? 'marcar' : 'equipo';
    if (this.verMarcar) { this.cargarEstado(); this.cargarMias(); this.cargarHorario(); }
    if (this.verEquipo) this.cargarEquipo();
  }

  ngOnDestroy(): void { this.detenerCamara(); this.soltarFoto(); }

  get misFilas(): FilaDia[] {
    const yo = this.misEvaluacion[0]?.userId ?? '';
    return filasDelRango(this.misEvaluacion, this.misMarcas, new Map([[yo, this.nombreMio]])).filter((f) => f.estado !== 'SIN_HORARIO');
  }

  get filasEquipo(): FilaDia[] {
    const nombres = new Map(this.personas.map((p) => [p.id, p.nombre] as const));
    return filasDelRango(this.evaluacionEquipo, this.marcasEquipo, nombres)
      .filter((f) => f.estado !== 'SIN_HORARIO')
      .filter((f) => !this.soloNovedades || ESTADOS_NOVEDAD.has(f.estado));
  }

  etiqueta(e: EvaluacionDiaApi['estado']) { return ETIQUETA_ESTADO_DIA[e]; }
  minutos(m: number | null): string { return textoMinutos(m, this.ajuste?.toleranciaMin ?? 10); }
  observaciones(d: FilaDia): string { return d.observaciones.map((o) => ETIQUETA_ESTADO_DIA[o].nombre).join(' · '); }

  exportar(formato: 'excel' | 'pdf'): void {
    const filas = this.filasEquipo;
    if (formato === 'excel') void exportarCumplimientoExcel(filas, this.desde, this.hasta);
    else exportarCumplimientoPdf(filas, this.desde, this.hasta);
  }

  verificacion(v: string): string { return ETIQUETA_VERIFICACION[v] ?? v; }

  private cargarEstado(): void { this.api.estadoTimbrada().subscribe({ next: (e) => (this.estado = e) }); }
  private cargarMias(): void {
    this.api.misTimbradas().subscribe({ next: (r) => { this.misMarcas = r.filas; this.misEvaluacion = r.evaluacion; this.nombreMio = r.filas[0]?.persona ?? this.nombreMio; } });
  }
  private cargarHorario(): void { this.api.miHorario().subscribe({ next: (h) => { this.miHorario = h; this.ajuste = h.ajuste; } }); }

  cargarEquipo(): void {
    this.cargandoEquipo = true;
    this.api.timbradasEquipo(this.desde, this.hasta, this.filtroPersona || undefined).subscribe({
      next: (r) => { this.marcasEquipo = r.filas; this.personas = r.personas; this.evaluacionEquipo = r.evaluacion; this.cargandoEquipo = false; },
      error: () => { this.cargandoEquipo = false; },
    });
  }

  // ───────────────────────── Ver una marca ─────────────────────────

  async verMarca(t: TimbradaApi): Promise<void> {
    this.marca = t;
    this.fotoMarca = '';
    this.errorFotoMarca = '';
    try {
      const url = await this.almacenamiento.resolveMediaUrlStrict(t.fotoKey);
      if (this.marca?.id === t.id) this.fotoMarca = url;
    } catch {
      this.errorFotoMarca = 'No se pudo cargar la foto.';
    }
  }

  cerrarMarca(): void { this.marca = null; this.fotoMarca = ''; }

  // ───────────────────────── Cámara ─────────────────────────

  async abrirCamara(): Promise<void> {
    this.errorCamara = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorCamara = 'Este navegador no permite usar la cámara.';
      return;
    }
    try {
      this.flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      this.camaraActiva = true;
      setTimeout(() => { if (this.video) this.video.nativeElement.srcObject = this.flujo; });
    } catch {
      this.errorCamara = 'No se pudo abrir la cámara: no hay una disponible o no diste el permiso.';
    }
  }

  tomarFoto(): void {
    const v = this.video?.nativeElement;
    const c = this.lienzo?.nativeElement;
    if (!v || !c || !v.videoWidth) { this.errorCamara = 'La cámara aún no está lista. Espera un segundo e inténtalo de nuevo.'; return; }
    c.width = Math.min(1024, v.videoWidth);
    c.height = Math.round((c.width * v.videoHeight) / v.videoWidth);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) { this.errorCamara = 'No se pudo guardar la foto. Inténtalo de nuevo.'; return; }
      this.soltarFoto();
      this.foto = blob;
      this.fotoVista = URL.createObjectURL(blob);
      this.detenerCamara();
    }, 'image/jpeg', 0.85);
  }

  repetirFoto(): void { this.soltarFoto(); this.alerta = null; void this.abrirCamara(); }

  private soltarFoto(): void {
    if (this.fotoVista) URL.revokeObjectURL(this.fotoVista);
    this.foto = null;
    this.fotoVista = '';
  }

  detenerCamara(): void {
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.flujo = null;
    this.camaraActiva = false;
  }

  // ───────────────────────── Timbrar ─────────────────────────

  /** Lee el GPS del dispositivo. Devuelve null si no se pudo (el servidor decide si eso es motivo de rechazo). */
  private leerUbicacion(): Promise<GeolocationPosition | null> {
    return new Promise((ok) => {
      if (!navigator.geolocation) { ok(null); return; }
      navigator.geolocation.getCurrentPosition((p) => ok(p), () => ok(null), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }

  async timbrar(): Promise<void> {
    if (!this.foto || this.procesando) return;
    this.procesando = true;
    this.alerta = null;
    try {
      this.paso = 'Tomando ubicación…';
      const pos = await this.leerUbicacion();
      this.paso = 'Subiendo foto…';
      const fotoUrl = await this.almacenamiento.uploadMedia(this.foto, { category: 'RRHH', type: 'FOTO_TIMBRADA', fileName: `timbrada_${Date.now()}.jpg`, contentType: 'image/jpeg' });
      this.paso = 'Registrando…';
      const r = await this.registrar(fotoUrl, pos);
      const marcaTxt = r.tipo === 'ENTRADA' ? 'Entrada' : 'Salida';
      this.alerta = { aceptada: true, titulo: `${marcaTxt} registrada`, mensaje: r.mensaje };
      this.toast.success(`${marcaTxt} registrada`, r.mensaje);
      this.soltarFoto();
      this.cargarEstado();
      this.cargarMias();
      if (this.verEquipo) this.cargarEquipo();
    } catch (e) {
      const mensaje = mensajeDe(e, 'No se pudo registrar la timbrada.');
      this.alerta = { aceptada: false, titulo: 'No se registró', mensaje };
    } finally {
      this.procesando = false;
      this.paso = '';
    }
  }

  private registrar(fotoUrl: string, pos: GeolocationPosition | null): Promise<ResultadoTimbrada> {
    return new Promise<ResultadoTimbrada>((ok, mal) =>
      this.api
        .timbrar({
          fotoUrl,
          origen: 'WEB',
          horaDispositivo: new Date().toISOString(),
          ...(pos ? { latitud: pos.coords.latitude, longitud: pos.coords.longitude, precisionM: pos.coords.accuracy } : {}),
        })
        .subscribe({ next: ok, error: mal }),
    );
  }
}

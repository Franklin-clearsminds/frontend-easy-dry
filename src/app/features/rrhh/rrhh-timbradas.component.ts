import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { AuthService } from '../../core/services/auth.service';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { EstadoTimbrada, PersonaEquipo, ResultadoTimbrada, RrhhService, TimbradaApi } from '../../core/services/rrhh.service';
import { DiaTimbrado, ETIQUETA_VERIFICACION, ZONA_ECUADOR, agruparPorDia } from './rrhh.modelos';

type Pestana = 'marcar' | 'equipo';

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
 * RRHH · Timbradas. «Timbrar»: la persona toma una foto con la cámara; al guardar se lee su ubicación y el servidor decide: antes de las
 * 12:00 es entrada y desde las 12:00, salida (con la hora del servidor); quien tiene agencia o bodega asignada debe estar dentro del radio
 * de su sitio, los demás roles timbran solo con foto. «Equipo»: las timbradas de las personas del alcance de quien consulta.
 */
@Component({
  selector: 'app-rrhh-timbradas',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold mb-2">
          <i-lucide name="clock" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide><span>RRHH</span>
        </div>
        <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Timbradas</h1>
        <p class="text-slate-500 text-xs mt-1 max-w-2xl">Antes de las 12:00 la marca es entrada y desde las 12:00, salida. La hora la pone el servidor. La foto es siempre de la cámara.</p>
      </div>

      @if (verMarcar && verEquipo) {
        <div class="flex gap-1 border-b border-slate-200" role="tablist" aria-label="Timbradas">
          <button type="button" role="tab" [attr.aria-selected]="pestana === 'marcar'" class="px-4 min-h-11 text-sm font-bold border-b-2 -mb-px transition-colors" [ngClass]="pestana === 'marcar' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-800'" (click)="pestana = 'marcar'">Timbrar</button>
          <button type="button" role="tab" [attr.aria-selected]="pestana === 'equipo'" class="px-4 min-h-11 text-sm font-bold border-b-2 -mb-px transition-colors" [ngClass]="pestana === 'equipo' ? 'border-easydry-blue text-easydry-blue' : 'border-transparent text-slate-500 hover:text-slate-800'" (click)="pestana = 'equipo'">Timbradas del equipo</button>
        </div>
      }

      @if (pestana === 'marcar' && verMarcar) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 space-y-4" aria-label="Registrar timbrada">
            <h2 class="font-extrabold text-slate-900">Registrar timbrada</h2>
            @if (estado) {
              <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1">
                <p>Ahora serían las <strong>{{ estado.ahora | date:'HH:mm':zona }}</strong> (hora del servidor): se registraría una <strong>{{ estado.tipoActual === 'ENTRADA' ? 'entrada' : 'salida' }}</strong>.</p>
                @for (s of estado.sitios; track s.nombre) {
                  <p>{{ s.tipo === 'AGENCIA' ? 'Agencia' : 'Bodega' }}: <strong>{{ s.nombre }}</strong> · radio {{ s.radioM }} m@if (!s.tieneUbicacion) { <span class="badge badge-warn ml-1">Sin ubicación configurada</span> }</p>
                }
                @if (estado.exigeUbicacion) {
                  <p class="text-slate-600">
                    @if (estado.modo === 'CUALQUIER_AGENCIA') { Puedes timbrar en cualquier agencia: debes estar a {{ estado.radioM }} m o menos de una. }
                    @else { Debes estar a {{ estado.radioM }} m o menos de tu {{ estado.modo === 'BODEGA' ? 'bodega' : 'agencia' }}. }
                    El GPS debe tener una precisión de {{ estado.precisionMaxM }} m o mejor.
                  </p>
                }
                @else { <p class="text-slate-600">Aún no hay una ubicación configurada para validar tu timbrada: se registra solo con foto y se guarda la ubicación de tu dispositivo.</p> }
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

            <button type="button" class="btn btn-cta w-full sm:w-auto" (click)="timbrar()" [disabled]="!foto || procesando">
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
            <h2 class="font-extrabold text-slate-900">Mis últimas timbradas</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr class="text-left text-xs text-slate-500 border-b border-slate-200"><th class="py-2 pr-3 font-bold">Fecha</th><th class="py-2 pr-3 font-bold">Entrada</th><th class="py-2 pr-3 font-bold">Salida</th><th class="py-2 pr-3 font-bold">Horas</th><th class="py-2 font-bold">Estado</th></tr></thead>
                <tbody>
                  @for (d of misDias; track d.dia) {
                    <tr class="border-b border-slate-100">
                      <td class="py-2 pr-3 whitespace-nowrap">{{ d.dia | date:'EEE dd/MM' }}</td>
                      <td class="py-2 pr-3">@if (d.entrada) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.entrada)">{{ d.entrada.marcadaEn | date:'HH:mm':zona }}</button> } @else { <span class="text-slate-400">—</span> }</td>
                      <td class="py-2 pr-3">@if (d.salida) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.salida)">{{ d.salida.marcadaEn | date:'HH:mm':zona }}</button> } @else { <span class="text-slate-400">—</span> }</td>
                      <td class="py-2 pr-3 font-mono">{{ d.horas !== null ? (d.horas | number:'1.1-2') + ' h' : '—' }}</td>
                      <td class="py-2"><span class="badge" [ngClass]="d.incompleto ? 'badge-warn' : 'badge-ok'">{{ d.incompleto ? 'Incompleto' : 'Completo' }}</span></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="py-8 text-center text-sm text-slate-500">Aún no tienes timbradas en estos días.</td></tr>
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
                <input type="checkbox" [(ngModel)]="soloIncompletos"> Solo días incompletos
              </label>
              <button type="button" class="btn btn-primary" (click)="cargarEquipo()" [disabled]="cargandoEquipo">{{ cargandoEquipo ? 'Cargando…' : 'Consultar' }}</button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="text-left text-xs text-slate-500 border-b border-slate-200">
                <th class="py-2 pr-3 font-bold">Fecha</th><th class="py-2 pr-3 font-bold">Persona</th><th class="py-2 pr-3 font-bold">Entrada</th><th class="py-2 pr-3 font-bold">Salida</th><th class="py-2 pr-3 font-bold">Horas</th><th class="py-2 font-bold">Estado</th>
              </tr></thead>
              <tbody>
                @for (d of diasEquipo; track d.dia + d.userId) {
                  <tr class="border-b border-slate-100">
                    <td class="py-2 pr-3 whitespace-nowrap">{{ d.dia | date:'EEE dd/MM' }}</td>
                    <td class="py-2 pr-3">{{ d.persona }}</td>
                    <td class="py-2 pr-3">@if (d.entrada) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.entrada)">{{ d.entrada.marcadaEn | date:'HH:mm':zona }}</button> } @else { <span class="text-slate-400">—</span> }</td>
                    <td class="py-2 pr-3">@if (d.salida) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.salida)">{{ d.salida.marcadaEn | date:'HH:mm':zona }}</button> } @else { <span class="text-slate-400">—</span> }</td>
                    <td class="py-2 pr-3 font-mono">{{ d.horas !== null ? (d.horas | number:'1.1-2') + ' h' : '—' }}</td>
                    <td class="py-2"><span class="badge" [ngClass]="d.incompleto ? 'badge-warn' : 'badge-ok'">{{ d.incompleto ? 'Incompleto' : 'Completo' }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="py-8 text-center text-sm text-slate-500">{{ cargandoEquipo ? 'Cargando…' : 'No hay timbradas con esos filtros.' }}</td></tr>
                }
              </tbody>
            </table>
          </div>
          <p class="text-[11px] text-slate-500">Un día sin ninguna marca no aparece como falta: sin turnos ni calendario no se sabe si debía trabajar.</p>
        </section>
      }

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

  desde = aDia(new Date(Date.now() - 13 * 86_400_000));
  hasta = aDia(new Date());
  filtroPersona = '';
  soloIncompletos = false;
  cargandoEquipo = false;
  marcasEquipo: TimbradaApi[] = [];
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
    if (this.verMarcar) { this.cargarEstado(); this.cargarMias(); }
    if (this.verEquipo) this.cargarEquipo();
  }

  ngOnDestroy(): void { this.detenerCamara(); this.soltarFoto(); }

  get misDias(): DiaTimbrado[] { return agruparPorDia(this.misMarcas); }

  get diasEquipo(): DiaTimbrado[] {
    return agruparPorDia(this.marcasEquipo).filter((d) => !this.soloIncompletos || d.incompleto);
  }

  verificacion(v: string): string { return ETIQUETA_VERIFICACION[v] ?? v; }

  private cargarEstado(): void { this.api.estadoTimbrada().subscribe({ next: (e) => (this.estado = e) }); }
  private cargarMias(): void { this.api.misTimbradas().subscribe({ next: (r) => (this.misMarcas = r.filas) }); }

  cargarEquipo(): void {
    this.cargandoEquipo = true;
    this.api.timbradasEquipo(this.desde, this.hasta, this.filtroPersona || undefined).subscribe({
      next: (r) => { this.marcasEquipo = r.filas; this.personas = r.personas; this.cargandoEquipo = false; },
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

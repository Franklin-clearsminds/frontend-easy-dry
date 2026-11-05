import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { RrhhMockService } from './rrhh-mock.service';
import { DiaTimbrado, RADIO_TIMBRADA_M, TimbradaMock, agruparPorDia, tipoMarcaPorHora } from './rrhh.modelos';

type Posicion = 'GPS' | 'EN_AGENCIA' | 'A_300' | 'LEJOS';
type Hora = 'AHORA' | '08:30' | '17:30';

/** Resultado de la última timbrada para mostrar la alerta de dentro o fuera del rango. */
interface Alerta { dentro: boolean; titulo: string; mensaje: string }

/**
 * RRHH · Timbradas (PROTOTIPO con datos de ejemplo en memoria). El operador toma una foto con la cámara; al guardar se toma su ubicación
 * y se valida que esté a 100 m o menos de su agencia. Antes de las 12:00 la marca es entrada y desde las 12:00, salida.
 * La distancia se calcula de verdad (Haversine); solo la posición y la hora se pueden simular para la demostración.
 */
@Component({
  selector: 'app-rrhh-timbradas',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold mb-2">
          <i-lucide name="clock" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide><span>RRHH · Prototipo</span>
        </div>
        <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Timbradas</h1>
        <p class="text-slate-500 text-xs mt-1 max-w-2xl">El operador timbra con una foto desde la cámara. Se valida que esté a {{ radio }} m o menos de su agencia. Antes de las 12:00 es entrada y desde las 12:00, salida.</p>
      </div>

      <div class="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-semibold text-violet-900" role="note">
        Prototipo: los datos son de ejemplo y se reinician al recargar. Las ubicaciones de las agencias son inventadas y no salen de la base de datos.
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Timbrar -->
        <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 space-y-4" aria-label="Registrar timbrada">
          <h2 class="font-extrabold text-slate-900">Registrar timbrada</h2>
          <div>
            <label class="field-label" for="tb-op">Operador que timbra</label>
            <select id="tb-op" class="field" [(ngModel)]="operadorId" (ngModelChange)="alerta = null">
              @for (o of mock.operadores; track o.id) { <option [value]="o.id">{{ o.nombre }} · {{ o.cargo }}</option> }
            </select>
            <p class="text-[11px] text-slate-500 mt-1">Agencia: <strong>{{ agencia?.nombre }}</strong> · Hoy sería <strong>{{ tipoActual === 'ENTRADA' ? 'entrada' : 'salida' }}</strong> ({{ horaTexto }}).</p>
          </div>

          <!-- Simulación solo del prototipo -->
          <div class="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-3 space-y-3">
            <p class="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Solo prototipo · simular para la demostración</p>
            <div>
              <p class="text-xs font-bold text-slate-700 mb-1">¿Dónde estoy?</p>
              <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Posición simulada">
                @for (p of posiciones; track p.id) {
                  <button type="button" role="radio" [attr.aria-checked]="posicion === p.id" (click)="posicion = p.id" class="px-3 min-h-9 rounded-lg border text-xs font-bold transition-colors" [ngClass]="posicion === p.id ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'">{{ p.nombre }}</button>
                }
              </div>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-700 mb-1">¿Qué hora es?</p>
              <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Hora simulada">
                @for (h of horas; track h.id) {
                  <button type="button" role="radio" [attr.aria-checked]="hora === h.id" (click)="hora = h.id" class="px-3 min-h-9 rounded-lg border text-xs font-bold transition-colors" [ngClass]="hora === h.id ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'">{{ h.nombre }}</button>
                }
              </div>
            </div>
          </div>

          <!-- Foto -->
          <div class="space-y-2">
            <p class="field-label">Foto *</p>
            @if (foto) {
              <img [src]="foto" alt="Foto de la timbrada" class="w-full max-w-sm rounded-xl border border-slate-200">
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
              <div class="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 space-y-1.5" role="status">
                <p class="font-semibold">{{ errorCamara }}</p>
                <label class="btn btn-secondary btn-sm cursor-pointer">
                  <i-lucide name="upload" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Elegir una imagen
                  <input type="file" class="sr-only" accept="image/*" (change)="elegirImagen($event)" aria-label="Elegir una imagen en lugar de la cámara">
                </label>
                <p class="text-[11px]">En el sistema real la foto será siempre tomada con la cámara en ese momento.</p>
              </div>
            }
            <canvas #lienzo class="hidden"></canvas>
          </div>

          <button type="button" class="btn btn-cta w-full sm:w-auto" (click)="timbrar()" [disabled]="!foto || procesando">
            <i-lucide name="map-pin" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ procesando ? 'Tomando ubicación…' : 'Guardar timbrada' }}
          </button>

          @if (alerta) {
            <div class="rounded-xl border-2 p-3 flex items-start gap-3" [ngClass]="alerta.dentro ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-rose-300 bg-rose-50 text-rose-900'" role="alert">
              <i-lucide [name]="alerta.dentro ? 'check-circle' : 'x-circle'" class="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true"></i-lucide>
              <div><p class="font-extrabold text-sm">{{ alerta.titulo }}</p><p class="text-xs">{{ alerta.mensaje }}</p></div>
            </div>
          }
        </section>

        <!-- Agencias de ejemplo -->
        <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 space-y-3 h-fit" aria-label="Agencias de ejemplo">
          <h2 class="font-extrabold text-slate-900">Agencias de ejemplo y su ubicación</h2>
          <p class="text-xs text-slate-500">Radio permitido: {{ radio }} m desde el punto de cada agencia.</p>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead><tr class="text-left text-slate-500 border-b border-slate-200"><th class="py-2 pr-3 font-bold">Agencia</th><th class="py-2 pr-3 font-bold">Latitud</th><th class="py-2 font-bold">Longitud</th></tr></thead>
              <tbody>
                @for (a of mock.agencias; track a.id) {
                  <tr class="border-b border-slate-100" [ngClass]="a.id === agencia?.id ? 'bg-sky-50 font-bold' : ''"><td class="py-2 pr-3">{{ a.nombre }}</td><td class="py-2 pr-3 font-mono">{{ a.lat }}</td><td class="py-2 font-mono">{{ a.lng }}</td></tr>
                }
              </tbody>
            </table>
          </div>
          <p class="text-[11px] text-slate-500">La ubicación de cada agencia se pondrá desde «Sucursales». Aquí es solo un ejemplo.</p>
        </section>
      </div>

      <!-- Resumen -->
      <section class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5 space-y-3" aria-label="Resumen de timbradas">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <h2 class="font-extrabold text-slate-900">Resumen por día</h2>
          <div class="flex flex-wrap gap-3">
            <div>
              <label class="field-label" for="rs-op">Operador</label>
              <select id="rs-op" class="field" [(ngModel)]="filtroOperador">
                <option value="">Todos</option>
                @for (o of mock.operadores; track o.id) { <option [value]="o.id">{{ o.nombre }}</option> }
              </select>
            </div>
            <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 self-end min-h-11">
              <input type="checkbox" [(ngModel)]="soloIncompletos"> Solo días incompletos
            </label>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="text-left text-xs text-slate-500 border-b border-slate-200">
              <th class="py-2 pr-3 font-bold">Fecha</th><th class="py-2 pr-3 font-bold">Operador</th><th class="py-2 pr-3 font-bold">Entrada</th><th class="py-2 pr-3 font-bold">Salida</th><th class="py-2 pr-3 font-bold">Horas</th><th class="py-2 font-bold">Estado</th>
            </tr></thead>
            <tbody>
              @for (d of dias; track d.fecha + d.operadorId) {
                <tr class="border-b border-slate-100">
                  <td class="py-2 pr-3 whitespace-nowrap">{{ d.fecha | date:'EEE dd/MM' }}</td>
                  <td class="py-2 pr-3">{{ mock.nombreOperador(d.operadorId) }}</td>
                  <td class="py-2 pr-3">@if (d.entrada) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.entrada)">{{ d.entrada.hora }}</button> } @else { <span class="text-slate-400">—</span> }</td>
                  <td class="py-2 pr-3">@if (d.salida) { <button type="button" class="font-mono font-bold text-easydry-blue hover:underline" (click)="verMarca(d.salida)">{{ d.salida.hora }}</button> } @else { <span class="text-slate-400">—</span> }</td>
                  <td class="py-2 pr-3 font-mono">{{ d.horas !== null ? (d.horas | number:'1.1-2') + ' h' : '—' }}</td>
                  <td class="py-2"><span class="badge" [ngClass]="d.incompleto ? 'badge-warn' : 'badge-ok'">{{ d.incompleto ? 'Incompleto' : 'Completo' }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="py-8 text-center text-sm text-slate-500">No hay timbradas con esos filtros.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="text-[11px] text-slate-500">Un día sin ninguna marca no aparece como falta: sin turnos ni calendario no se sabe si debía trabajar.</p>
      </section>

      <app-modal [isOpen]="!!marca" [title]="marca ? (marca.tipo === 'ENTRADA' ? 'Entrada' : 'Salida') + ' · ' + mock.nombreOperador(marca.operadorId) : ''" icon="camera" size="md" (close)="marca = null">
        @if (marca) {
          <div class="space-y-3 text-sm">
            <img [src]="marca.foto" [alt]="'Foto de la timbrada de ' + mock.nombreOperador(marca.operadorId)" class="w-full rounded-xl border border-slate-200">
            <p class="text-slate-700">{{ marca.fecha | date:'dd/MM/yyyy' }} a las <strong>{{ marca.hora }}</strong> · {{ mock.agencia(marca.agenciaId)?.nombre }}</p>
            <p class="text-xs text-slate-500">Estaba a {{ marca.distanciaM }} m de la agencia (límite {{ radio }} m).</p>
          </div>
        }
      </app-modal>
    </div>
  `,
})
export class RrhhTimbradasComponent implements OnDestroy {
  readonly mock = inject(RrhhMockService);
  private readonly toast = inject(ToastService);

  readonly radio = RADIO_TIMBRADA_M;
  readonly posiciones: { id: Posicion; nombre: string }[] = [
    { id: 'GPS', nombre: 'Mi GPS real' },
    { id: 'EN_AGENCIA', nombre: 'Estoy en la agencia' },
    { id: 'A_300', nombre: 'Estoy a 300 m' },
    { id: 'LEJOS', nombre: 'Estoy lejos' },
  ];
  readonly horas: { id: Hora; nombre: string }[] = [
    { id: 'AHORA', nombre: 'La hora actual' },
    { id: '08:30', nombre: '08:30 (entrada)' },
    { id: '17:30', nombre: '17:30 (salida)' },
  ];

  operadorId = this.mock.operadores[0].id;
  posicion: Posicion = 'EN_AGENCIA';
  hora: Hora = 'AHORA';
  foto = '';
  camaraActiva = false;
  errorCamara = '';
  procesando = false;
  alerta: Alerta | null = null;
  marca: TimbradaMock | null = null;
  filtroOperador = '';
  soloIncompletos = false;

  private flujo: MediaStream | null = null;
  @ViewChild('video') private video?: ElementRef<HTMLVideoElement>;
  @ViewChild('lienzo') private lienzo?: ElementRef<HTMLCanvasElement>;

  get agencia() { return this.mock.agenciaDe(this.operadorId); }

  /** La hora que se usa para decidir entrada o salida: la real o la simulada del panel. */
  private get ahora(): Date {
    const d = new Date();
    if (this.hora !== 'AHORA') {
      const [h, m] = this.hora.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d;
  }
  get tipoActual() { return tipoMarcaPorHora(this.ahora.getHours()); }
  get horaTexto(): string { return this.ahora.toTimeString().slice(0, 5); }

  get dias(): DiaTimbrado[] {
    return agruparPorDia(this.mock.timbradas.filter((t) => !this.filtroOperador || t.operadorId === this.filtroOperador))
      .filter((d) => !this.soloIncompletos || d.incompleto);
  }

  verMarca(t: TimbradaMock): void { this.marca = t; }

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
    c.width = Math.min(640, v.videoWidth);
    c.height = Math.round((c.width * v.videoHeight) / v.videoWidth);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    this.foto = c.toDataURL('image/jpeg', 0.8);
    this.detenerCamara();
  }

  elegirImagen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => { this.foto = String(lector.result); this.errorCamara = ''; };
    lector.readAsDataURL(archivo);
  }

  repetirFoto(): void { this.foto = ''; this.alerta = null; void this.abrirCamara(); }

  detenerCamara(): void {
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.flujo = null;
    this.camaraActiva = false;
  }

  ngOnDestroy(): void { this.detenerCamara(); }

  // ───────────────────────── Timbrar ─────────────────────────

  /** Al guardar se toma la ubicación (real o simulada), se valida el radio y sale la alerta de dentro o fuera. */
  async timbrar(): Promise<void> {
    const ag = this.agencia;
    if (!ag || !this.foto) return;
    this.procesando = true;
    this.alerta = null;
    try {
      const pos = await this.ubicacion(ag.lat, ag.lng);
      const r = this.mock.registrarTimbrada(this.operadorId, this.foto, pos, this.ahora);
      if (r.ok) {
        const marcaTxt = r.timbrada.tipo === 'ENTRADA' ? 'Entrada' : 'Salida';
        this.alerta = { dentro: true, titulo: `Dentro del rango · ${marcaTxt} registrada`, mensaje: `Estás a ${r.distanciaM} m de ${ag.nombre} (máximo ${this.radio} m). Hora: ${r.timbrada.hora}.` };
        this.toast.success(`${marcaTxt} registrada`, `${this.mock.nombreOperador(this.operadorId)} · ${r.timbrada.hora}`);
        this.foto = '';
      } else {
        const fuera = r.motivo === 'FUERA_DE_RANGO';
        this.alerta = { dentro: false, titulo: fuera ? 'Fuera del rango · no se registró' : 'No se registró', mensaje: r.mensaje };
        this.toast.warning(fuera ? 'Fuera del rango' : 'No se registró', r.mensaje);
      }
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo obtener la ubicación.';
      this.alerta = { dentro: false, titulo: 'Sin ubicación', mensaje };
      this.toast.warning('Sin ubicación', mensaje);
    } finally {
      this.procesando = false;
    }
  }

  /** Posición del operador: la del GPS o la simulada respecto al punto de su agencia (1° de latitud ≈ 111 km). */
  private ubicacion(latAg: number, lngAg: number): Promise<{ lat: number; lng: number }> {
    const metros = (m: number) => m / 111_000;
    switch (this.posicion) {
      case 'EN_AGENCIA': return Promise.resolve({ lat: latAg + metros(30), lng: lngAg });
      case 'A_300': return Promise.resolve({ lat: latAg + metros(300), lng: lngAg });
      case 'LEJOS': return Promise.resolve({ lat: latAg + metros(5000), lng: lngAg });
      default:
        return new Promise((ok, mal) => {
          if (!navigator.geolocation) { mal(new Error('Este navegador no permite obtener la ubicación.')); return; }
          navigator.geolocation.getCurrentPosition(
            (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => mal(new Error('No se pudo obtener tu ubicación. Da el permiso o usa una posición simulada.')),
            { enableHighAccuracy: true, timeout: 10000 },
          );
        });
    }
  }
}

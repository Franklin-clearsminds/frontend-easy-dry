import { VerMediaDirective } from '../../directives/ver-media.directive';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StorageUploadService, MediaEvidenceType, StorageCategory } from '../../../core/services/storage-upload.service';
import { EvidenciaInput } from '../../../core/services/incidente.service';

/** Reglas de evidencia de maquinaria (el servidor las valida de nuevo; aquí se validan para dar buen mensaje). */
export const REGLAS_EVIDENCIA = {
  maxMultimedia: 10,
  exactosDocumentos: 1,
  videoMinSeg: 13,
  videoMaxSeg: 30,
  fotoMaxBytes: 10 * 1024 * 1024,
  videoMaxBytes: 100 * 1024 * 1024,
  pdfMaxBytes: 10 * 1024 * 1024,
  formatosFoto: ['image/jpeg', 'image/png', 'image/webp'],
  formatosVideo: ['video/mp4', 'video/quicktime'],
} as const;

export interface ArchivoEvidencia {
  id: string;
  file: File;
  kind: 'FOTO' | 'VIDEO' | 'DOCUMENTO';
  nombre: string;
  tamanoTexto: string;
  /** Vista previa local (solo fotos y videos). */
  previewUrl?: string;
  duracionSeg?: number;
  /** URL pública ya subida (se conserva para no volver a subir si el envío falla y se reintenta). */
  urlSubida?: string;
}

/**
 * Selector reutilizable de evidencia para maquinaria: 1 a 10 fotos/videos (cuando `requiereMultimedia`) +
 * exactamente 1 PDF (cuando `requiereDocumento`), con validación de formato, tamaño y duración del video
 * (13 a 30 s, medida en el cliente con un <video>). La subida se hace por ticket firmado
 * (/storage/ticket + PUT) al llamar a `subir()`.
 */
@Component({
  selector: 'app-evidencia-selector',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, VerMediaDirective],
  template: `
    <div class="space-y-4">
      <!-- Fotos y videos -->
      <div class="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
            <i-lucide name="camera" class="w-4 h-4 text-emerald-600" aria-hidden="true"></i-lucide>
            Fotos o videos
            @if (requiereMultimedia) { <span class="text-rose-600" aria-hidden="true">*</span> }
          </span>
          <span class="text-xs text-slate-500">
            {{ requiereMultimedia ? 'Mínimo 1, máximo 10' : 'Máximo 10' }} · JPG, PNG, WEBP (10 MB) · MP4, MOV de 13 a 30 s (100 MB)
          </span>
        </div>

        <div class="flex flex-wrap gap-2">
          <label class="inline-flex cursor-pointer px-4 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs items-center gap-2 shadow-2xs focus-within:ring-2 focus-within:ring-easydry-blue transition-colors"
            [class.opacity-60]="deshabilitado" [class.pointer-events-none]="deshabilitado">
            <i-lucide name="upload-cloud" class="w-4 h-4" aria-hidden="true"></i-lucide>
            <span>Seleccionar fotos / videos</span>
            <input type="file" multiple class="sr-only"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,.jpg,.jpeg,.png,.webp,.mp4,.mov"
              [disabled]="deshabilitado"
              (change)="onSeleccionarMultimedia($event)">
          </label>
          <button type="button" (click)="abrirCamara()" [disabled]="deshabilitado"
            class="inline-flex cursor-pointer px-4 py-2.5 bg-white border border-sky-300 hover:bg-sky-50 disabled:opacity-60 disabled:cursor-not-allowed text-sky-700 font-bold rounded-xl text-xs items-center gap-2 shadow-2xs focus-visible:ring-2 focus-visible:ring-easydry-blue transition-colors">
            <i-lucide name="camera" class="w-4 h-4" aria-hidden="true"></i-lucide>
            <span>Tomar foto</span>
          </button>
        </div>

        @if (multimedia.length > 0) {
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            @for (a of multimedia; track a.id) {
              <div class="relative bg-white border rounded-xl p-2 shadow-xs">
                @if (a.kind === 'FOTO') {
                  <img [src]="a.previewUrl" [appVerMedia]="a.previewUrl" [appVerMediaTitulo]="a.nombre" [appVerMediaTipo]="'imagen'" [alt]="'Vista previa de ' + a.nombre" class="w-full h-24 object-cover rounded-lg">
                } @else {
                  <video [src]="a.previewUrl" [appVerMedia]="a.previewUrl" [appVerMediaTitulo]="a.nombre" [appVerMediaTipo]="'video'" class="w-full h-24 object-cover rounded-lg bg-black" muted preload="metadata"></video>
                }
                <p class="text-xs font-semibold text-slate-700 truncate mt-1">{{ a.nombre }}</p>
                <p class="text-xs text-slate-500 font-mono">
                  {{ a.tamanoTexto }}@if (a.kind === 'VIDEO' && a.duracionSeg != null) { · {{ a.duracionSeg | number:'1.0-1' }} s }
                </p>
                @if (!deshabilitado) {
                  <button type="button" (click)="quitar(a)" title="Quitar" [attr.aria-label]="'Quitar ' + a.nombre"
                    class="absolute top-0.5 right-0.5 w-9 h-9 flex items-center justify-center group cursor-pointer">
                    <span class="w-6 h-6 flex items-center justify-center bg-rose-600 text-white rounded-full opacity-90 group-hover:opacity-100 shadow-sm">
                      <i-lucide name="x" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                    </span>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Documento PDF -->
      <div class="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <span class="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1.5">
            <i-lucide name="file-text" class="w-4 h-4 text-indigo-600" aria-hidden="true"></i-lucide>
            Documento PDF
            @if (requiereDocumento) { <span class="text-rose-600" aria-hidden="true">*</span> }
          </span>
          <span class="text-xs text-slate-500">{{ requiereDocumento ? 'Exactamente 1' : 'Máximo 1' }} · PDF (10 MB)</span>
        </div>

        @if (!documento) {
          <label class="inline-flex cursor-pointer px-4 py-2.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs items-center gap-2 shadow-2xs focus-within:ring-2 focus-within:ring-easydry-blue transition-colors"
            [class.opacity-60]="deshabilitado" [class.pointer-events-none]="deshabilitado">
            <i-lucide name="file-plus" class="w-4 h-4" aria-hidden="true"></i-lucide>
            <span>Adjuntar PDF</span>
            <input type="file" class="sr-only" accept="application/pdf,.pdf" [disabled]="deshabilitado"
              (change)="onSeleccionarDocumento($event)">
          </label>
        } @else {
          <div class="p-2.5 bg-white border border-indigo-100 rounded-xl flex items-center justify-between">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="p-2 rounded-lg bg-indigo-100 text-indigo-700 flex-shrink-0">
                <i-lucide name="file-text" class="w-4 h-4" aria-hidden="true"></i-lucide>
              </div>
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-900 truncate">{{ documento.nombre }}</p>
                <p class="text-xs text-slate-500 font-mono">{{ documento.tamanoTexto }} · PDF</p>
              </div>
            </div>
            @if (!deshabilitado) {
              <button type="button" (click)="quitar(documento)" aria-label="Quitar documento PDF" title="Quitar" class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                <i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide>
              </button>
            }
          </div>
        }
      </div>

      @if (errores.length > 0) {
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1" role="alert">
          @for (e of errores; track $index) {
            <p class="text-xs font-semibold text-rose-700 flex items-start gap-1.5">
              <i-lucide name="alert-circle" class="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true"></i-lucide>
              <span>{{ e }}</span>
            </p>
          }
        </div>
      }

      @if (advertencias.length > 0) {
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          @for (w of advertencias; track $index) {
            <p class="text-xs font-semibold text-amber-800">{{ w }}</p>
          }
        </div>
      }

      @if (subiendo) {
        <div>
          <div class="h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-label="Progreso de subida" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="progreso">
            <div class="h-full bg-easydry-green transition-[width]" [style.width.%]="progreso"></div>
          </div>
          <p class="text-xs text-slate-500 mt-1 font-semibold" role="status" aria-live="polite">Subiendo evidencias... {{ progreso }}%</p>
        </div>
      }
    </div>

    @if (camaraAbierta) {
      <div class="fixed inset-0 z-[12000] bg-black/80 flex items-center justify-center p-3 sm:p-6"
        (click)="cerrarCamara()" (keydown.escape)="cerrarCamara()">
        <section role="dialog" aria-modal="true" aria-labelledby="evidencia-camera-title"
          class="w-full max-w-2xl rounded-2xl overflow-hidden bg-slate-950 text-white shadow-2xl"
          (click)="$event.stopPropagation()">
          <header class="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h2 id="evidencia-camera-title" class="text-sm font-bold">Tomar foto de evidencia</h2>
            <button type="button" (click)="cerrarCamara()" aria-label="Cerrar cámara"
              class="p-2 rounded-lg hover:bg-white/10">
              <i-lucide name="x" class="w-5 h-5" aria-hidden="true"></i-lucide>
            </button>
          </header>

          <div class="relative min-h-56 sm:min-h-80 flex items-center justify-center">
            @if (camaraCargando) {
              <div class="p-8 text-center space-y-2" role="status" aria-live="polite">
                <i-lucide name="loader" class="w-8 h-8 text-sky-400 animate-spin mx-auto" aria-hidden="true"></i-lucide>
                <p class="text-sm font-semibold text-slate-200">Iniciando cámara...</p>
              </div>
            }
            @if (camaraError) {
              <div class="p-6 text-center space-y-3" role="alert">
                <i-lucide name="alert-circle" class="w-8 h-8 text-rose-400 mx-auto" aria-hidden="true"></i-lucide>
                <p class="text-sm font-semibold text-rose-200">{{ camaraError }}</p>
                <button type="button" (click)="abrirCamara()"
                  class="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold">
                  Reintentar
                </button>
              </div>
            }
            <video #evidenciaCameraVideo autoplay playsinline muted
              [class.hidden]="camaraCargando || !!camaraError"
              class="w-full max-h-[65dvh] object-contain"></video>
          </div>

          <footer class="flex items-center justify-center gap-3 p-4 border-t border-white/10">
            <button type="button" (click)="cambiarCamara()" [disabled]="camaraCargando || !!camaraError"
              aria-label="Cambiar cámara" title="Cambiar cámara"
              class="p-3 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-50">
              <i-lucide name="refresh-cw" class="w-5 h-5" aria-hidden="true"></i-lucide>
            </button>
            <button type="button" (click)="capturarFoto()" [disabled]="camaraCargando || !!camaraError"
              class="px-6 py-3 rounded-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-sm flex items-center gap-2">
              <i-lucide name="camera" class="w-5 h-5" aria-hidden="true"></i-lucide>
              Capturar foto
            </button>
          </footer>
        </section>
      </div>
    }
  `,
})
export class EvidenciaSelectorComponent implements OnDestroy {
  private readonly storage = inject(StorageUploadService);
  @ViewChild('evidenciaCameraVideo') private cameraVideo?: ElementRef<HTMLVideoElement>;

  /** INCIDENTE (fotos/videos/documento de incidencia) o MANTENIMIENTO. */
  @Input() contexto: 'INCIDENTE' | 'MANTENIMIENTO' = 'INCIDENTE';
  /** Código de la máquina: define la carpeta maquinaria/{codigo}/... en S3. */
  @Input() maquinariaCodigo = '';
  @Input() maquinariaId?: string;
  /** Id de la incidencia o del mantenimiento (si ya existe). */
  @Input() entidadId?: string;
  /** Para incidencias nuevas: mismo UUID que se envía en /incidentes/reportar. */
  @Input() clientUuid?: string;
  @Input() fase: 'reporte' | 'reparacion' = 'reporte';
  /** true (por defecto): exige al menos 1 foto/video. */
  @Input() requiereMultimedia = true;
  /** true (por defecto): exige exactamente 1 PDF. Al reportar una falla no se exige. */
  @Input() requiereDocumento = true;
  @Input() deshabilitado = false;

  @Output() cambio = new EventEmitter<void>();

  multimedia: ArchivoEvidencia[] = [];
  documento: ArchivoEvidencia | null = null;
  errores: string[] = [];
  advertencias: string[] = [];
  subiendo = false;
  progreso = 0;
  camaraAbierta = false;
  camaraCargando = false;
  camaraError = '';
  private cameraStream: MediaStream | null = null;
  private cameraFacingMode: 'environment' | 'user' = 'environment';
  private cameraAttempt = 0;

  ngOnDestroy(): void {
    this.detenerCamara();
    this.liberarPreviews();
  }

  get totalArchivos(): number {
    return this.multimedia.length + (this.documento ? 1 : 0);
  }

  /** Mensaje de la primera regla incumplida, o null si ya se puede enviar. */
  validar(): string | null {
    if (this.requiereMultimedia && this.multimedia.length < 1) return 'Adjunta al menos una foto o un video.';
    if (this.requiereDocumento && !this.documento) return 'Adjunta un documento PDF (exactamente uno).';
    if (this.multimedia.length > REGLAS_EVIDENCIA.maxMultimedia) return 'Máximo 10 fotos o videos por registro.';
    return null;
  }

  limpiar(): void {
    this.liberarPreviews();
    this.multimedia = [];
    this.documento = null;
    this.errores = [];
    this.advertencias = [];
    this.progreso = 0;
    this.cambio.emit();
  }

  /**
   * Sube todo por ticket firmado y devuelve las URL públicas para enviarlas en `evidencias[]`.
   * Lanza Error con un mensaje legible si falla algún archivo.
   */
  async subir(): Promise<EvidenciaInput[]> {
    const pendiente = this.validar();
    if (pendiente) throw new Error(pendiente);

    const todos = [...this.multimedia, ...(this.documento ? [this.documento] : [])];
    this.subiendo = true;
    this.progreso = 0;
    const resultado: EvidenciaInput[] = [];
    try {
      for (let i = 0; i < todos.length; i++) {
        const a = todos[i];
        if (!a.urlSubida) {
          a.urlSubida = await this.storage.uploadMedia(a.file, this.opcionesDeSubida(a));
        }
        resultado.push({ tipo: this.tipoTicket(a), url: a.urlSubida, descripcion: a.nombre });
        this.progreso = Math.round(((i + 1) / todos.length) * 100);
      }
      return resultado;
    } catch (err: any) {
      const detalle = err?.error?.message
        ? (Array.isArray(err.error.message) ? err.error.message.join(', ') : String(err.error.message))
        : (err?.message || 'Error desconocido');
      throw new Error(`No se pudo subir la evidencia: ${detalle}`);
    } finally {
      this.subiendo = false;
    }
  }

  // ----------------------------------------------------------------
  // Selección y validación de archivos
  // ----------------------------------------------------------------

  async onSeleccionarMultimedia(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    await this.agregarMultimedia(files);
  }

  private async agregarMultimedia(files: File[]): Promise<void> {
    this.errores = [];
    this.advertencias = [];

    for (const file of files) {
      if (this.multimedia.length >= REGLAS_EVIDENCIA.maxMultimedia) {
        this.errores.push(`Máximo ${REGLAS_EVIDENCIA.maxMultimedia} fotos o videos: "${file.name}" no se agregó.`);
        continue;
      }
      const kind = this.detectarKind(file);
      if (kind === 'DOCUMENTO') {
        this.errores.push(`"${file.name}": los PDF se adjuntan en el recuadro de documento.`);
        continue;
      }
      if (!kind) {
        this.errores.push(`"${file.name}": formato no permitido (usa JPG, PNG, WEBP, MP4 o MOV).`);
        continue;
      }
      if (kind === 'FOTO' && file.size > REGLAS_EVIDENCIA.fotoMaxBytes) {
        this.errores.push(`"${file.name}": la foto supera 10 MB.`);
        continue;
      }
      if (kind === 'VIDEO' && file.size > REGLAS_EVIDENCIA.videoMaxBytes) {
        this.errores.push(`"${file.name}": el video supera 100 MB.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      let duracionSeg: number | undefined;
      if (kind === 'VIDEO') {
        duracionSeg = await this.medirDuracion(previewUrl);
        if (duracionSeg == null) {
          this.advertencias.push(`No se pudo leer la duración de "${file.name}"; el servidor la validará (debe durar de 13 a 30 s). Si falla, usa MP4 (H.264).`);
        } else if (duracionSeg < REGLAS_EVIDENCIA.videoMinSeg || duracionSeg > REGLAS_EVIDENCIA.videoMaxSeg) {
          URL.revokeObjectURL(previewUrl);
          this.errores.push(`"${file.name}": el video dura ${duracionSeg.toFixed(1)} s y debe durar entre 13 y 30 segundos.`);
          continue;
        }
      }

      this.multimedia = [...this.multimedia, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file, kind, nombre: file.name, tamanoTexto: this.formatoTamano(file.size), previewUrl, duracionSeg,
      }];
    }
    this.cambio.emit();
  }

  async abrirCamara(): Promise<void> {
    this.detenerCamara();
    this.camaraAbierta = true;
    this.camaraCargando = true;
    this.camaraError = '';
    const attempt = ++this.cameraAttempt;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.camaraCargando = false;
      this.camaraError = 'Este navegador no permite abrir la cámara desde esta página. Ábrela por HTTPS o localhost e inténtalo de nuevo.';
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: this.cameraFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      if (!this.camaraAbierta || attempt !== this.cameraAttempt) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.cameraStream = stream;
      this.camaraCargando = false;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!this.camaraAbierta || attempt !== this.cameraAttempt) return;
      if (!this.cameraVideo) {
        stream.getTracks().forEach((track) => track.stop());
        if (this.cameraStream === stream) this.cameraStream = null;
        this.camaraError = 'No se pudo mostrar la vista previa de la cámara. Inténtalo de nuevo.';
        return;
      }
      this.cameraVideo.nativeElement.srcObject = this.cameraStream;
      await this.cameraVideo.nativeElement.play();
    } catch (error) {
      if (attempt === this.cameraAttempt) {
        this.detenerCamara();
        this.camaraCargando = false;
        this.camaraError = this.mensajeErrorCamara(error);
      }
    }
  }

  cambiarCamara(): void {
    this.cameraFacingMode = this.cameraFacingMode === 'environment' ? 'user' : 'environment';
    void this.abrirCamara();
  }

  cerrarCamara(): void {
    this.camaraAbierta = false;
    this.camaraCargando = false;
    this.camaraError = '';
    this.detenerCamara();
  }

  async capturarFoto(): Promise<void> {
    const video = this.cameraVideo?.nativeElement;
    if (!video || !this.cameraStream || video.videoWidth === 0 || video.videoHeight === 0) {
      this.camaraError = 'La cámara todavía no está lista. Espera un momento e inténtalo de nuevo.';
      return;
    }
    if (this.multimedia.length >= REGLAS_EVIDENCIA.maxMultimedia) {
      this.errores = [`Máximo ${REGLAS_EVIDENCIA.maxMultimedia} fotos o videos por registro.`];
      this.cerrarCamara();
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      this.camaraError = 'No se pudo procesar la foto. Inténtalo de nuevo.';
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) {
      this.camaraError = 'No se pudo generar la foto. Inténtalo de nuevo.';
      return;
    }

    const file = new File([blob], `incidencia_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    this.cerrarCamara();
    await this.agregarMultimedia([file]);
  }

  private detenerCamara(): void {
    this.cameraAttempt++;
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }
    if (this.cameraVideo?.nativeElement) this.cameraVideo.nativeElement.srcObject = null;
  }

  private mensajeErrorCamara(error: unknown): string {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'No se concedió permiso para usar la cámara. Habilítalo en el navegador e inténtalo de nuevo.';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return 'No se encontró una cámara disponible en este dispositivo.';
    }
    if (name === 'NotReadableError') {
      return 'La cámara está ocupada por otra aplicación. Ciérrala e inténtalo de nuevo.';
    }
    return 'No se pudo acceder a la cámara. Revisa los permisos del navegador y vuelve a intentarlo.';
  }

  onSeleccionarDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.errores = [];
    this.advertencias = [];
    if (!file) return;

    if (this.documento) {
      this.errores.push('Solo se permite un documento PDF por registro.');
      return;
    }
    if (this.detectarKind(file) !== 'DOCUMENTO') {
      this.errores.push(`"${file.name}": el documento debe ser un PDF.`);
      return;
    }
    if (file.size > REGLAS_EVIDENCIA.pdfMaxBytes) {
      this.errores.push(`"${file.name}": el PDF supera 10 MB.`);
      return;
    }
    this.documento = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file, kind: 'DOCUMENTO', nombre: file.name, tamanoTexto: this.formatoTamano(file.size),
    };
    this.cambio.emit();
  }

  quitar(a: ArchivoEvidencia): void {
    if (a.kind === 'DOCUMENTO') {
      this.documento = null;
    } else {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      this.multimedia = this.multimedia.filter(x => x.id !== a.id);
    }
    this.errores = [];
    this.cambio.emit();
  }

  // ----------------------------------------------------------------
  // Utilidades
  // ----------------------------------------------------------------

  private detectarKind(file: File): 'FOTO' | 'VIDEO' | 'DOCUMENTO' | null {
    const mime = (file.type || '').toLowerCase();
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if ((REGLAS_EVIDENCIA.formatosFoto as readonly string[]).includes(mime) || (!mime && ['jpg', 'jpeg', 'png', 'webp'].includes(ext))) return 'FOTO';
    if ((REGLAS_EVIDENCIA.formatosVideo as readonly string[]).includes(mime) || (!mime && ['mp4', 'mov'].includes(ext))) return 'VIDEO';
    if (mime === 'application/pdf' || (!mime && ext === 'pdf')) return 'DOCUMENTO';
    return null;
  }

  /** Mide la duración con un <video> y su metadata. Devuelve undefined si el navegador no puede leerla. */
  private medirDuracion(url: string): Promise<number | undefined> {
    return new Promise(resolve => {
      const video = document.createElement('video');
      const limpiar = (valor?: number) => {
        video.removeAttribute('src');
        video.load();
        resolve(valor);
      };
      const timer = setTimeout(() => limpiar(undefined), 8000);
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        const d = video.duration;
        limpiar(Number.isFinite(d) ? d : undefined);
      };
      video.onerror = () => {
        clearTimeout(timer);
        limpiar(undefined);
      };
      video.src = url;
    });
  }

  private formatoTamano(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private tipoTicket(a: ArchivoEvidencia): MediaEvidenceType {
    if (this.contexto === 'MANTENIMIENTO') {
      return a.kind === 'VIDEO' ? 'VIDEO_INCIDENTE' : a.kind === 'DOCUMENTO' ? 'DOCUMENTO' : 'FOTO_INCIDENTE';
    }
    return a.kind === 'VIDEO' ? 'VIDEO_INCIDENTE' : a.kind === 'DOCUMENTO' ? 'DOCUMENTO_INCIDENTE' : 'FOTO_INCIDENTE';
  }

  private opcionesDeSubida(a: ArchivoEvidencia) {
    const category: StorageCategory = this.contexto === 'MANTENIMIENTO' ? 'MAQUINARIA_MANTENIMIENTO' : 'MAQUINARIA_INCIDENTE';
    const esIncidente = this.contexto === 'INCIDENTE';
    return {
      category,
      type: this.tipoTicket(a),
      maquinariaId: this.maquinariaId,
      maquinariaCodigo: this.maquinariaCodigo,
      incidenteId: esIncidente ? this.entidadId : undefined,
      clientUuid: esIncidente && !this.entidadId ? this.clientUuid : undefined,
      incidenteFase: esIncidente ? this.fase : undefined,
      mantenimientoId: !esIncidente ? this.entidadId : undefined,
      fileName: a.nombre,
      contentType: a.file.type || (a.kind === 'DOCUMENTO' ? 'application/pdf' : a.kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg'),
    };
  }

  private liberarPreviews(): void {
    this.multimedia.forEach(a => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
  }
}

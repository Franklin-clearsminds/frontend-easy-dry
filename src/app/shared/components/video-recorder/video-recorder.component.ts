import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import {
  StorageUploadService,
  StorageCategory,
  MediaEvidenceType
} from '../../../core/services/storage-upload.service';
import { fixWebmDuration } from '../../utils/webm-duration-fixer';

export type RecorderState = 'idle' | 'ready' | 'recording' | 'paused' | 'recorded' | 'uploading' | 'uploaded' | 'error';

@Component({
  selector: 'app-video-recorder',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-2.5 w-full font-sans">
      <!-- Encabezado / Label y Badge -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <div
            aria-hidden="true"
            class="w-2.5 h-2.5 rounded-full"
            [ngClass]="hasPendingUpload ? 'bg-amber-500' : (videoUrl ? 'bg-emerald-500' : (required ? 'bg-rose-500' : 'bg-slate-400'))"></div>
          <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {{ label }}
          </span>
          @if (required && !tieneVideoActivo()) {
            <span class="text-[11px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 uppercase font-mono">Obligatorio</span>
          }
        </div>
        <div class="flex items-center gap-1">
          @if (hasPendingUpload) {
            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <i-lucide name="clock" class="w-3.5 h-3.5 text-amber-600" aria-hidden="true"></i-lucide>
              Vídeo Listo · Se sube a S3 al guardar
            </span>
          } @else if (videoUrl) {
            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <i-lucide name="check-circle" class="w-3 h-3 text-emerald-600" aria-hidden="true"></i-lucide>
              Guardado en AWS S3
            </span>
          } @else {
            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              <i-lucide name="clock" class="w-3 h-3 text-slate-500" aria-hidden="true"></i-lucide>
              <span>Duración: {{ minDurationSeconds }}s a {{ maxDurationSeconds }}s</span>
            </span>
          }
        </div>
      </div>

      @if (description) {
        <p class="text-xs text-slate-500 leading-snug">{{ description }}</p>
      }

      <!-- Contenedor Principal del Grabador / Visor -->
      <div class="relative w-full rounded-2xl overflow-hidden border-2 transition-colors duration-200 bg-slate-950 text-white shadow-sm"
           [ngClass]="{
             'border-slate-800': state === 'idle' || state === 'ready',
             'border-rose-500 ring-4 ring-rose-500/20': state === 'recording',
             'border-amber-400': state === 'paused' || hasPendingUpload,
             'border-emerald-500': state === 'uploaded' || (videoUrl && !hasPendingUpload && state !== 'recording' && state !== 'ready'),
             'border-rose-300 bg-rose-950/20': state === 'error'
           }">

        <!-- Selector de Pestañas / Modos (Cámara vs Subir Archivo) -->
        @if (state !== 'recording' && state !== 'paused' && state !== 'uploading') {
          <div class="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 p-1 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
            <button
              type="button"
              (click)="setMode('camera')"
              [attr.aria-pressed]="activeMode === 'camera'"
              title="Cámara"
              [class.bg-white]="activeMode === 'camera'"
              [class.text-slate-950]="activeMode === 'camera'"
              [class.text-white]="activeMode !== 'camera'"
              class="px-2.5 py-2 min-h-9 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer">
              <i-lucide name="camera" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
              <span class="hidden sm:inline">Cámara</span>
            </button>
            <button
              type="button"
              (click)="setMode('upload')"
              [attr.aria-pressed]="activeMode === 'upload'"
              title="Subir archivo"
              [class.bg-white]="activeMode === 'upload'"
              [class.text-slate-950]="activeMode === 'upload'"
              [class.text-white]="activeMode !== 'upload'"
              class="px-2.5 py-2 min-h-9 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer">
              <i-lucide name="upload" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
              <span class="hidden sm:inline">Archivo</span>
            </button>
          </div>
        }

        <!-- MODO CÁMARA: Visor y Stream en Vivo -->
        @if (activeMode === 'camera') {
          <div class="relative w-full aspect-video min-h-[220px] sm:min-h-[260px] flex items-center justify-center bg-slate-950">

            <!-- Video en Vivo (Camera Stream) -->
            <video
              #liveVideoElement
              autoplay
              playsinline
              muted
              class="w-full h-full object-cover"
              [class.hidden]="!hasActiveStream || state === 'recorded' || state === 'uploading'">
            </video>

            <!-- Video Grabado / Previsualización -->
            @if (state === 'recorded' || state === 'uploading' || ((videoUrl || previewUrl) && !hasActiveStream)) {
              <video
                #playbackVideoElement
                [src]="previewUrl || videoUrl"
                [attr.aria-label]="'Vídeo de evidencia: ' + label"
                controls
                playsinline
                preload="auto"
                class="w-full h-full object-contain bg-black">
              </video>
            }

            <!-- Estado Inicial Idle (Cámara Apagada) -->
            @if (state === 'idle' && !hasActiveStream && !videoUrl && !previewUrl) {
              <div class="flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
                <div class="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-inner">
                  <i-lucide name="video" class="w-7 h-7 text-easydry-green" aria-hidden="true"></i-lucide>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-white">Cámara Lista</h4>
                  <p class="text-xs text-slate-300 mt-0.5">Activa la cámara de tu dispositivo para capturar la evidencia</p>
                </div>
                <button
                  type="button"
                  (click)="startCameraPreview()"
                  class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-glow-green">
                  <i-lucide name="power" class="w-4 h-4" aria-hidden="true"></i-lucide>
                  <span>Encender Cámara</span>
                </button>
              </div>
            }

            <!-- Indicador en Vivo, Timer y Barra de Duración (30s a 90s) -->
            @if (state === 'recording' || state === 'paused') {
              <div class="absolute top-3 left-3 z-20 flex flex-col gap-1.5 max-w-[80%] sm:max-w-none" role="status">
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 shadow-lg">
                  <span class="w-3 h-3 rounded-full bg-rose-500 motion-reduce:animate-none" aria-hidden="true" [ngClass]="{'animate-ping': state === 'recording'}"></span>
                  <span class="text-xs font-mono font-extrabold text-rose-400 tracking-wider">
                    {{ state === 'recording' ? 'REC' : 'PAUSA' }}
                  </span>
                  <span class="text-xs font-mono font-bold text-white pl-1.5 border-l border-white/20">
                    {{ formatTime(recordingSeconds) }} / {{ formatTime(maxDurationSeconds) }}
                  </span>
                  @if (recordingSeconds < minDurationSeconds) {
                    <span class="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
                      Mín. {{ minDurationSeconds }}s (faltan {{ minDurationSeconds - recordingSeconds }}s)
                    </span>
                  } @else {
                    <span class="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                      <i-lucide name="check" class="w-3 h-3" aria-hidden="true"></i-lucide> Válido ({{ recordingSeconds }}s)
                    </span>
                  }
                </div>

                <!-- Barra visual de progreso 30s - 90s -->
                <div class="relative w-48 sm:w-64 bg-black/60 rounded-full h-2 p-0.5 border border-white/10 overflow-hidden" aria-hidden="true">
                  <div class="absolute top-0 bottom-0 left-[33.3%] w-0.5 bg-amber-400 z-10" title="Mínimo 30s"></div>
                  <div
                    class="h-full rounded-full transition-[width] duration-300"
                    [ngClass]="recordingSeconds < minDurationSeconds ? 'bg-amber-400' : 'bg-emerald-500'"
                    [style.width.%]="(recordingSeconds / maxDurationSeconds) * 100">
                  </div>
                </div>
              </div>
            }

            <!-- Selector de Cámara Frontal / Trasera (si hay stream activo y no está grabando) -->
            @if (hasActiveStream && state !== 'recording' && state !== 'paused' && state !== 'recorded') {
              <button
                type="button"
                (click)="switchFacingMode()"
                class="absolute bottom-3 right-3 z-20 p-2.5 rounded-xl bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/15 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Cambiar Cámara (Frontal / Posterior)"
                aria-label="Cambiar cámara (frontal o posterior)">
                <i-lucide name="refresh-cw" class="w-4 h-4 text-easydry-green" aria-hidden="true"></i-lucide>
                <span class="text-[11px]">{{ facingMode === 'environment' ? 'Posterior' : 'Frontal' }}</span>
              </button>
            }

            <!-- Overlay de Subida al Storage Bucket en Guardado -->
            @if (state === 'uploading') {
              <div class="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in" role="status" aria-live="polite">
                <div class="w-12 h-12 rounded-2xl bg-easydry-blue/20 flex items-center justify-center text-easydry-blue mb-3 animate-pulse motion-reduce:animate-none">
                  <i-lucide name="upload-cloud" class="w-6 h-6" aria-hidden="true"></i-lucide>
                </div>
                <h4 class="text-sm font-bold text-white">Transfiriendo vídeo a AWS S3...</h4>
                <p class="text-xs text-slate-400 mt-1">Conectando con bucket seguro de EasyDry...</p>

                <div class="w-full max-w-xs mt-4">
                  <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      class="bg-easydry-green h-2 rounded-full transition-[width] duration-300"
                      [style.width.%]="uploadProgress">
                    </div>
                  </div>
                  <div class="flex justify-between text-[11px] font-mono text-slate-400 mt-1.5">
                    <span>{{ uploadProgress }}%</span>
                    <span>Evidencia {{ evidenceType }}</span>
                  </div>
                </div>
              </div>
            }

            <!-- Overlay de Error -->
            @if (state === 'error') {
              <div class="absolute inset-0 z-30 bg-rose-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center" role="alert">
                <div class="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-2">
                  <i-lucide name="alert-triangle" class="w-6 h-6" aria-hidden="true"></i-lucide>
                </div>
                <h4 class="text-sm font-bold text-white">No se pudo procesar el vídeo</h4>
                <p class="text-xs text-rose-200 mt-1 max-w-xs">{{ errorMessage }}</p>
                <button
                  type="button"
                  (click)="resetRecorder()"
                  class="mt-3 px-3.5 py-1.5 bg-white text-slate-900 font-extrabold rounded-xl text-xs hover:bg-slate-100 transition-colors cursor-pointer">
                  Reintentar
                </button>
              </div>
            }

          </div>
        }

        <!-- MODO ARCHIVO: Carga Directa (Fallback) -->
        @if (activeMode === 'upload') {
          <div class="relative w-full aspect-video min-h-[220px] flex flex-col items-center justify-center p-6 bg-slate-900 text-center"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave($event)"
               (drop)="onDropFile($event)">

            <input
              #fileInput
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              class="sr-only"
              tabindex="-1"
              aria-label="Seleccionar archivo de vídeo"
              (change)="onFileSelected($event)">

            @if (previewUrl || videoUrl) {
              <div class="w-full h-full flex flex-col items-center justify-center">
                <video [src]="previewUrl || videoUrl" [attr.aria-label]="'Vídeo de evidencia: ' + label" controls playsinline class="w-full h-40 object-contain rounded-xl bg-black mb-3"></video>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="fileInput.click()"
                    class="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
                    <i-lucide name="refresh-cw" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                    <span>Reemplazar Archivo</span>
                  </button>
                  <button
                    type="button"
                    (click)="eliminarVideo()"
                    class="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
                    <i-lucide name="trash-2" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            } @else {
              <div (click)="fileInput.click()" (keydown.enter)="fileInput.click()" (keydown.space)="$event.preventDefault(); fileInput.click()"
                   tabindex="0" role="button" aria-label="Seleccionar un archivo de vídeo"
                   class="flex flex-col items-center justify-center gap-2 cursor-pointer group rounded-2xl">
                <div class="w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-easydry-green group-hover:text-slate-950 transition-colors flex items-center justify-center text-white">
                  <i-lucide name="upload-cloud" class="w-6 h-6" aria-hidden="true"></i-lucide>
                </div>
                <div>
                  <p class="text-xs font-bold text-white">Haz clic o arrastra un vídeo aquí</p>
                  <p class="text-xs text-slate-400 mt-0.5">Formatos: MP4, WEBM, MOV (Duración: 30s a 90s · se sube a S3 al guardar)</p>
                </div>
              </div>
            }

            <!-- Overlay de subida modo archivo -->
            @if (state === 'uploading') {
              <div class="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center" role="status" aria-live="polite">
                <div class="w-10 h-10 rounded-xl bg-easydry-blue/20 text-easydry-blue flex items-center justify-center mb-2">
                  <i-lucide name="upload-cloud" class="w-5 h-5" aria-hidden="true"></i-lucide>
                </div>
                <p class="text-xs font-bold text-white">Transfiriendo vídeo a AWS S3...</p>
                <div class="w-48 bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div class="bg-easydry-green h-1.5 rounded-full transition-[width] duration-300" [style.width.%]="uploadProgress"></div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Barra Inferior de Acciones y Controles (Cámara) -->
        @if (activeMode === 'camera') {
          <div class="p-3 bg-slate-900 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">

            <!-- Estado IDLE o READY (Antes de grabar) -->
            @if (state === 'ready' || (state === 'idle' && hasActiveStream)) {
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="startRecording()"
                  class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-md cursor-pointer">
                  <span class="w-2.5 h-2.5 rounded-full bg-white" aria-hidden="true"></span>
                  <span>INICIAR GRABACIÓN (30s - 90s)</span>
                </button>
                <button
                  type="button"
                  (click)="stopCameraPreview()"
                  class="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer">
                  Apagar Cámara
                </button>
              </div>
              <span class="text-xs text-slate-400 font-medium">Graba entre 30 y 90 segundos</span>
            }

            <!-- Estado RECORDING (Grabando) -->
            @if (state === 'recording') {
              <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  (click)="pauseRecording()"
                  class="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
                  <i-lucide name="pause" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                  <span>Pausar</span>
                </button>

                <button
                  type="button"
                  (click)="stopRecording()"
                  [disabled]="recordingSeconds < minDurationSeconds"
                  [ngClass]="recordingSeconds < minDurationSeconds
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                    : 'bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow-lg cursor-pointer'"
                  class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors">
                  <i-lucide name="square" class="w-3.5 h-3.5 fill-current" aria-hidden="true"></i-lucide>
                  @if (recordingSeconds < minDurationSeconds) {
                    <span>DETENER (MÍN. {{ minDurationSeconds - recordingSeconds }}s)</span>
                  } @else {
                    <span>DETENER Y AJUSTAR ({{ formatTime(recordingSeconds) }})</span>
                  }
                </button>
              </div>
              <span class="text-xs font-mono" [ngClass]="recordingSeconds < minDurationSeconds ? 'text-amber-400' : 'text-emerald-400'">
                {{ recordingSeconds < minDurationSeconds ? 'Alcanza al menos 30 segundos...' : '¡Duración óptima! Puedes detener cuando desees.' }}
              </span>
            }

            <!-- Estado PAUSED (Pausado) -->
            @if (state === 'paused') {
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="resumeRecording()"
                  class="px-3.5 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
                  <i-lucide name="play" class="w-3.5 h-3.5 fill-current" aria-hidden="true"></i-lucide>
                  <span>Reanudar</span>
                </button>

                <button
                  type="button"
                  (click)="stopRecording()"
                  [disabled]="recordingSeconds < minDurationSeconds"
                  [ngClass]="recordingSeconds < minDurationSeconds
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 text-white font-extrabold cursor-pointer'"
                  class="px-4 py-2 rounded-xl text-xs flex items-center gap-1.5">
                  <i-lucide name="square" class="w-3.5 h-3.5 fill-current" aria-hidden="true"></i-lucide>
                  <span>{{ recordingSeconds < minDurationSeconds ? 'Mínimo 30s' : 'Finalizar (' + formatTime(recordingSeconds) + ')' }}</span>
                </button>
              </div>
              <span class="text-xs text-amber-300 font-medium" role="status">Grabación en pausa</span>
            }

            <!-- Estado RECORDED (Vídeo grabado listo en memoria) -->
            @if (state === 'recorded') {
              <div class="flex items-center gap-2 w-full justify-between flex-wrap">
                <button
                  type="button"
                  (click)="startCameraPreview()"
                  class="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
                  <i-lucide name="rotate-ccw" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                  <span>Grabar de Nuevo</span>
                </button>

                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-500/30 flex items-center gap-1">
                    <i-lucide name="clock" class="w-3 h-3 text-amber-400" aria-hidden="true"></i-lucide>
                    Listo · Se subirá a AWS S3 al guardar
                  </span>
                  <button
                    type="button"
                    (click)="eliminarVideo()"
                    class="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
                    <i-lucide name="trash-2" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            }

            <!-- Estado UPLOADED (Ya subido y guardado) -->
            @if (videoUrl && !hasPendingUpload && state !== 'recording' && state !== 'ready' && state !== 'recorded' && state !== 'uploading') {
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <i-lucide name="check-circle-2" class="w-4 h-4 text-emerald-400" aria-hidden="true"></i-lucide>
                  <span>Evidencia persistida en AWS S3</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="startCameraPreview()"
                    class="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <i-lucide name="refresh-cw" class="w-3 h-3" aria-hidden="true"></i-lucide>
                    <span>Regrabar</span>
                  </button>
                  <button
                    type="button"
                    (click)="eliminarVideo()"
                    class="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <i-lucide name="trash-2" class="w-3 h-3" aria-hidden="true"></i-lucide>
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            }

          </div>
        }

      </div>
    </div>
  `
})
export class VideoRecorderComponent implements OnInit, OnChanges, OnDestroy {
  @Input() label = 'Vídeo de Evidencia';
  @Input() description = 'Usa la cámara del dispositivo para registrar la evidencia obligatoria del servicio.';
  @Input() evidenceType: MediaEvidenceType = 'VIDEO_INICIAL';
  @Input() category: StorageCategory = 'SERVICIOS_GENERALES';
  @Input() agenciaId?: string | number;
  @Input() servicioId?: string | number;
  @Input() required = false;
  @Input() minDurationSeconds = 30;
  @Input() maxDurationSeconds = 90;

  @Input() set videoUrl(val: string | undefined | null) {
    this._videoUrl = val ? val.trim() : '';
    if (this._videoUrl && !this.hasPendingUpload) {
      this.state = 'idle';
    }
  }
  get videoUrl(): string {
    return this._videoUrl;
  }
  private _videoUrl = '';

  @Output() videoUrlChange = new EventEmitter<string>();
  @Output() videoBlobChange = new EventEmitter<Blob | null>();
  @Output() videoUploaded = new EventEmitter<{ url: string }>();

  @ViewChild('liveVideoElement') liveVideoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('playbackVideoElement') playbackVideoElement?: ElementRef<HTMLVideoElement>;

  private readonly storageUploadService = inject(StorageUploadService);
  private readonly cdr = inject(ChangeDetectorRef);

  activeMode: 'camera' | 'upload' = 'camera';
  state: RecorderState = 'idle';
  facingMode: 'environment' | 'user' = 'environment';
  hasActiveStream = false;

  recordingSeconds = 0;
  private timerInterval?: any;
  private mediaStream?: MediaStream;
  private mediaRecorder?: MediaRecorder;
  private recordedChunks: Blob[] = [];
  /** Momento en que arrancó la grabación: el botón «Pausar» aparece justo donde estaba «Iniciar» y un toque repetido no debe pausarla. */
  private inicioGrabacionMs = 0;

  recordedBlob?: Blob;
  previewUrl?: string;
  uploadProgress = 0;
  errorMessage = '';
  hasPendingUpload = false;

  ngOnInit(): void {
    if (this._videoUrl) {
      this.state = 'idle';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['servicioId'] && !changes['servicioId'].firstChange) {
      if (changes['servicioId'].currentValue !== changes['servicioId'].previousValue) {
        this.eliminarVideo();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopCameraStream();
    this.clearTimer();
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  public tieneVideoActivo(): boolean {
    return Boolean(this.previewUrl || this._videoUrl);
  }

  setMode(mode: 'camera' | 'upload'): void {
    this.activeMode = mode;
    if (mode === 'upload') {
      this.stopCameraStream();
    }
  }

  async startCameraPreview(): Promise<void> {
    this.errorMessage = '';
    this.stopCameraStream();
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = undefined;
    }
    this.recordedBlob = undefined;
    this.hasPendingUpload = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage = window.isSecureContext === false
        ? 'La cámara solo funciona con una conexión segura (https). Abre el sistema con la dirección https o sube un archivo grabado.'
        : 'Este navegador no permite usar la cámara. Sube un archivo grabado.';
      this.state = 'error';
      this.cdr.detectChanges();
      return;
    }

    // De la más exigente a la más simple: algunas cámaras de tablet no cumplen resolución o no dan audio.
    const intentos: MediaStreamConstraints[] = [
      { video: { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } }, audio: true },
      { video: { facingMode: this.facingMode }, audio: true },
      { video: { facingMode: this.facingMode } },
      { video: true },
    ];

    let ultimoError: any;
    for (const constraints of intentos) {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err: any) {
        ultimoError = err;
        // Sin permiso no tiene sentido seguir probando otras configuraciones.
        if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') break;
      }
    }

    if (!this.mediaStream) {
      console.error('No se pudo acceder a la cámara del dispositivo:', ultimoError);
      this.errorMessage = ultimoError?.name === 'NotAllowedError'
        ? 'El permiso de la cámara está bloqueado. Habilítalo en los ajustes del navegador o sube un archivo grabado.'
        : 'No se pudo acceder a la cámara. Revisa que no la esté usando otra aplicación o sube un archivo grabado.';
      this.state = 'error';
      this.cdr.detectChanges();
      return;
    }

    this.hasActiveStream = true;
    this.state = 'ready';
    this.cdr.detectChanges();

    const video = this.liveVideoElement?.nativeElement;
    if (video) {
      // El atributo `muted` de la plantilla no siempre llega como propiedad; sin ella iOS y algunos Android bloquean play().
      video.muted = true;
      video.srcObject = this.mediaStream;
      // Si el navegador rechaza play() la cámara sigue activa y se puede grabar: no es un error de acceso.
      try { await video.play(); } catch (err) { console.warn('No se pudo reproducir la vista previa:', err); }
    }
  }

  stopCameraStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = undefined;
    }
    this.hasActiveStream = false;
  }

  async switchFacingMode(): Promise<void> {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    if (this.hasActiveStream) {
      await this.startCameraPreview();
    }
  }

  /** `intento` recorre los formatos que el navegador dice soportar: si uno se corta al arrancar se prueba el siguiente. */
  startRecording(intento = 0): void {
    if (!this.mediaStream) return;
    if (typeof MediaRecorder === 'undefined') {
      this.errorMessage = 'Este navegador no permite grabar vídeo. Sube un archivo grabado.';
      this.state = 'error';
      return;
    }
    this.recordedChunks = [];
    this.recordingSeconds = 0;
    this.errorMessage = '';

    const candidatos = this.formatosSoportados();
    // Pasado el último formato se deja que el navegador elija el suyo.
    const mimeType = candidatos[intento] ?? '';

    const recorderOptions: MediaRecorderOptions = {
      videoBitsPerSecond: 850_000, // 850 kbps: compresión de alta velocidad (~9.5 MB para 90s), transferencia y carga ultrarrápidas
      audioBitsPerSecond: 64_000,
    };
    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);
    } catch {
      try {
        this.mediaRecorder = mimeType ? new MediaRecorder(this.mediaStream, { mimeType }) : new MediaRecorder(this.mediaStream);
      } catch {
        try {
          this.mediaRecorder = new MediaRecorder(this.mediaStream);
        } catch (err) {
          console.error('No se pudo iniciar la grabación:', err);
          this.errorMessage = 'No se pudo iniciar la grabación en este dispositivo. Sube un archivo grabado.';
          this.state = 'error';
          this.stopCameraStream();
          return;
        }
      }
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    const inicio = Date.now();
    this.mediaRecorder.onstop = () => {
      if (this.state === 'error') return; // ya se avisó el fallo: no se da por grabado
      // La parada manual solo se habilita pasado el mínimo: un corte a los pocos segundos lo provoca el navegador con ese formato.
      const corteAlArrancar = this.state === 'recording' && Date.now() - inicio < 3000;
      if (corteAlArrancar && intento < candidatos.length && this.mediaStream?.active) {
        console.warn(`La grabación se cortó al iniciar con "${mimeType || 'formato por defecto'}"; se prueba otro formato.`);
        this.clearTimer();
        this.startRecording(intento + 1);
        return;
      }
      if (corteAlArrancar) {
        this.clearTimer();
        this.errorMessage = 'La grabación se cortó al iniciar en este dispositivo. Sube un archivo grabado.';
        this.state = 'error';
        this.stopCameraStream();
        this.cdr.detectChanges();
        return;
      }
      this.onRecordingStopped();
    };

    // El estado en pantalla sigue al del grabador: si el navegador lo pausa por su cuenta no se muestra como si grabara.
    this.mediaRecorder.onpause = () => {
      this.clearTimer();
      if (this.state === 'recording') this.state = 'paused';
      this.cdr.detectChanges();
    };
    this.mediaRecorder.onresume = () => {
      if (this.state === 'paused') this.iniciarCronometro();
    };
    this.mediaRecorder.onerror = () => {
      this.clearTimer();
      this.errorMessage = 'La grabación se interrumpió. Vuelve a intentarlo o sube un archivo grabado.';
      this.state = 'error';
      this.stopCameraStream();
      this.cdr.detectChanges();
    };

    // Solicitar fragmentos cada 1000ms para asegurar flujo constante
    try {
      this.mediaRecorder.start(1000);
    } catch (err) {
      console.error('No se pudo iniciar la grabación:', err);
      this.errorMessage = 'No se pudo iniciar la grabación en este dispositivo. Sube un archivo grabado.';
      this.state = 'error';
      this.stopCameraStream();
      return;
    }
    this.state = 'recording';
    this.inicioGrabacionMs = Date.now();
    this.iniciarCronometro();
  }

  /**
   * Formatos de vídeo que el navegador puede grabar, del más fiable al menos. Safari (iPhone/iPad) graba mp4; el resto (Chrome en
   * Android y escritorio) graba WebM, y su mp4 es más reciente y se corta al iniciar en algunos equipos.
   */
  private formatosSoportados(): string[] {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return [];
    const ua = navigator.userAgent || '';
    const esSafari = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Safari/.test(ua) && !/Chrome|Chromium|Android/.test(ua));
    const mp4 = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4'];
    const webm = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];
    return (esSafari ? [...mp4, ...webm] : [...webm, ...mp4]).filter((t) => MediaRecorder.isTypeSupported(t));
  }

  private iniciarCronometro(): void {
    this.clearTimer();
    this.state = 'recording';
    this.timerInterval = setInterval(() => {
      this.recordingSeconds++;
      if (this.recordingSeconds >= this.maxDurationSeconds) {
        this.recordingSeconds = this.maxDurationSeconds;
        this.stopRecording();
      }
      this.cdr.detectChanges();
    }, 1000);
    this.cdr.detectChanges();
  }

  pauseRecording(): void {
    // Ignora el toque que llega justo después de iniciar (doble toque o toque repetido en tablets).
    if (Date.now() - this.inicioGrabacionMs < 1200) return;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.requestData();
      } catch (err) {
        console.warn('requestData on pause:', err);
      }
      this.mediaRecorder.pause();
      this.state = 'paused';
      this.clearTimer();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.iniciarCronometro();
    }
  }

  stopRecording(): void {
    this.clearTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
          this.mediaRecorder.requestData();
        }
      } catch (err) {
        console.warn('requestData on stop:', err);
      }
      this.mediaRecorder.stop();
    }
  }

  private async onRecordingStopped(): Promise<void> {
    const rawMime = this.mediaRecorder?.mimeType || 'video/webm';
    const cleanMime = rawMime.includes('mp4') ? 'video/mp4' : (rawMime.includes('webm') ? 'video/webm' : rawMime);
    let rawBlob = new Blob(this.recordedChunks, { type: cleanMime });

    // Parchar duración EBML en WebM para que el reproductor reconozca los 90s exactos y permita seek completo
    const durationMs = Math.max(this.recordingSeconds, 1) * 1000;
    if (rawMime.includes('webm')) {
      try {
        rawBlob = await fixWebmDuration(rawBlob, durationMs);
      } catch (err) {
        console.warn('No se pudo parchar duración WebM:', err);
      }
    }

    this.recordedBlob = rawBlob;
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = URL.createObjectURL(this.recordedBlob);
    this.stopCameraStream();
    this.hasPendingUpload = true;
    this.state = 'recorded';
    this.videoBlobChange.emit(this.recordedBlob);
    this.cdr.detectChanges();

    setTimeout(() => {
      if (this.playbackVideoElement?.nativeElement) {
        this.playbackVideoElement.nativeElement.load();
      }
    }, 50);
  }

  /**
   * Sube el vídeo grabado o seleccionado directamente a AWS S3 al guardar/iniciar el formulario
   */
  public async uploadNow(): Promise<string> {
    if (!this.hasPendingUpload || !this.recordedBlob) {
      return this._videoUrl || '';
    }

    this.state = 'uploading';
    this.uploadProgress = 10;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const url = await this.storageUploadService.uploadMedia(this.recordedBlob, {
        category: this.category,
        type: this.evidenceType,
        agenciaId: this.agenciaId ? String(this.agenciaId) : undefined,
        servicioId: this.servicioId ? String(this.servicioId) : undefined,
        onProgress: (pct) => {
          this.uploadProgress = Math.max(10, pct);
          this.cdr.detectChanges();
        }
      });

      this._videoUrl = url;
      this.hasPendingUpload = false;
      this.videoUrlChange.emit(url);
      this.videoUploaded.emit({ url });
      this.state = 'uploaded';
      this.uploadProgress = 100;
      this.cdr.detectChanges();
      return url;
    } catch (err: any) {
      console.error('Error subiendo vídeo a AWS S3:', err);
      this.errorMessage = err?.message || 'Error al subir el vídeo a AWS S3.';
      this.state = 'error';
      this.cdr.detectChanges();
      throw err;
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
      input.value = '';
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  onDropFile(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      this.processFile(e.dataTransfer.files[0]);
    }
  }

  private processFile(file: File): void {
    if (!file.type.startsWith('video/')) {
      this.errorMessage = 'El archivo seleccionado no es un vídeo válido.';
      this.state = 'error';
      this.cdr.detectChanges();
      return;
    }

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    const tempUrl = URL.createObjectURL(file);

    tempVideo.onloadedmetadata = () => {
      URL.revokeObjectURL(tempUrl);
      const duration = tempVideo.duration;

      if (duration < this.minDurationSeconds) {
        this.errorMessage = `El vídeo dura ${Math.round(duration)}s. La duración mínima requerida es de ${this.minDurationSeconds} segundos.`;
        this.state = 'error';
        this.cdr.detectChanges();
        return;
      }

      if (duration > this.maxDurationSeconds + 3) {
        this.errorMessage = `El vídeo dura ${Math.round(duration)}s. La duración máxima permitida es de ${this.maxDurationSeconds} segundos.`;
        this.state = 'error';
        this.cdr.detectChanges();
        return;
      }

      this.recordedBlob = file;
      this.previewUrl = URL.createObjectURL(file);
      this.hasPendingUpload = true;
      this.videoBlobChange.emit(file);
      this.state = 'recorded';
      this.errorMessage = '';
      this.cdr.detectChanges();
    };

    tempVideo.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      this.errorMessage = 'No se pudo leer la duración del archivo de vídeo.';
      this.state = 'error';
      this.cdr.detectChanges();
    };

    tempVideo.src = tempUrl;
  }

  public eliminarVideo(): void {
    this.stopCameraStream();
    this.clearTimer();
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = undefined;
    this.recordedBlob = undefined;
    this.hasPendingUpload = false;
    this._videoUrl = '';
    this.videoUrlChange.emit('');
    this.videoBlobChange.emit(null);
    this.state = 'idle';
    this.errorMessage = '';
    this.uploadProgress = 0;
  }

  reset(): void {
    this.stopCameraStream();
    this.clearTimer();
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = undefined;
    this.recordedBlob = undefined;
    this.hasPendingUpload = false;
    this.errorMessage = '';
    this.uploadProgress = 0;
    this.state = this._videoUrl ? 'idle' : 'idle';
  }

  resetRecorder(): void {
    this.reset();
    this.startCameraPreview();
  }

  stopCameraPreview(): void {
    this.stopCameraStream();
    this.state = 'idle';
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}


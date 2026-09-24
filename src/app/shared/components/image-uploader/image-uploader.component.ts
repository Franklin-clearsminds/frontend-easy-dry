import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import {
  StorageUploadService,
  StorageCategory,
  MediaEvidenceType
} from '../../../core/services/storage-upload.service';

export type ImageUploaderMode = 'upload' | 'camera' | 'url';
export type UploaderState = 'idle' | 'adjusting' | 'uploading' | 'uploaded' | 'error';

@Component({
  selector: 'app-image-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-3 w-full font-sans">
      <!-- Header / Etiqueta y Estado -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <div
            class="w-2.5 h-2.5 rounded-full"
            [ngClass]="tieneImagenActiva() ? 'bg-emerald-500' : (required ? 'bg-amber-500' : 'bg-slate-400')"></div>
          <label class="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {{ label }}
          </label>
          @if (required && !tieneImagenActiva()) {
            <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 uppercase font-mono">Obligatorio</span>
          }
        </div>

        <!-- Indicador de Estado -->
        @if (hasPendingUpload) {
          <span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            <i-lucide name="clock" class="w-3.5 h-3.5 text-amber-600"></i-lucide>
            Ajustada · Se sube a S3 al guardar
          </span>
        } @else if (currentImageUrl) {
          <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <i-lucide name="check-circle" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
            Guardada en AWS S3
          </span>
        } @else {
          <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            {{ skipCrop ? 'Imagen completa' : 'Formato Cuadrado (1:1)' }}
          </span>
        }
      </div>

      <!-- Selector de Modo (Pestañas) -->
      @if (state !== 'uploading' && (!tieneImagenActiva() || changingImage)) {
        <div class="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            (click)="setMode('upload')"
            [class.bg-white]="activeMode === 'upload'"
            [class.text-easydry-blue]="activeMode === 'upload'"
            [class.shadow-xs]="activeMode === 'upload'"
            [class.text-slate-600]="activeMode !== 'upload'"
            class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <i-lucide name="upload-cloud" class="w-4 h-4"></i-lucide>
            <span>Subir Archivo</span>
          </button>

          <button
            type="button"
            (click)="setMode('camera')"
            [class.bg-white]="activeMode === 'camera'"
            [class.text-easydry-blue]="activeMode === 'camera'"
            [class.shadow-xs]="activeMode === 'camera'"
            [class.text-slate-600]="activeMode !== 'camera'"
            class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <i-lucide name="camera" class="w-4 h-4"></i-lucide>
            <span>Tomar Foto</span>
          </button>

          <button
            type="button"
            (click)="setMode('url')"
            [class.bg-white]="activeMode === 'url'"
            [class.text-easydry-blue]="activeMode === 'url'"
            [class.shadow-xs]="activeMode === 'url'"
            [class.text-slate-600]="activeMode !== 'url'"
            class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <i-lucide name="link" class="w-4 h-4"></i-lucide>
            <span>Enlace URL</span>
          </button>
        </div>
      }

      <!-- ÁREA PRINCIPAL: VISTA PREVIA / CAPTURA / AJUSTE CON SLIDER -->
      <div class="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 transition-all">

        <!-- ============================================================ -->
        <!-- MODO 1: SUBIR ARCHIVO (Dropzone)                             -->
        <!-- ============================================================ -->
        @if (activeMode === 'upload' && state !== 'uploading' && (!tieneImagenActiva() || changingImage)) {
          <div
            (click)="fileInput.click()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onFileDrop($event)"
            [class.bg-easydry-blue-subtle]="isDragging"
            [class.border-easydry-blue]="isDragging"
            class="p-8 border-2 border-dashed border-slate-300 hover:border-easydry-blue rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white">
            <input
              #fileInput
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              (change)="onFileSelected($event)"
              class="hidden" />

            <div class="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-easydry-blue flex items-center justify-center mb-3 shadow-xs">
              <i-lucide name="image-plus" class="w-7 h-7"></i-lucide>
            </div>
            <p class="text-xs font-bold text-slate-800">Haz clic o arrastra la imagen aquí</p>
            <p class="text-[11px] text-slate-400 mt-1">Formatos admitidos: JPG, PNG, WEBP (se subirá a AWS S3 al guardar)</p>
          </div>
        }

        <!-- ============================================================ -->
        <!-- MODO 2: CÁMARA EN VIVO                                       -->
        <!-- ============================================================ -->
        @if (activeMode === 'camera' && state !== 'uploading' && (!tieneImagenActiva() || changingImage)) {
          <div class="relative w-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden min-h-[300px] text-white">
            
            @if (cameraLoading) {
              <div class="p-8 text-center space-y-2">
                <i-lucide name="loader" class="w-8 h-8 text-easydry-blue animate-spin mx-auto"></i-lucide>
                <p class="text-xs font-bold text-slate-300">Iniciando cámara del dispositivo...</p>
              </div>
            }

            @if (cameraError) {
              <div class="p-6 text-center space-y-3 max-w-md">
                <i-lucide name="alert-circle" class="w-8 h-8 text-rose-400 mx-auto"></i-lucide>
                <p class="text-xs font-bold text-rose-300">{{ cameraError }}</p>
                <button
                  type="button"
                  (click)="startCamera()"
                  class="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition shadow-xs cursor-pointer">
                  Reintentar acceso a cámara
                </button>
              </div>
            }

            <!-- Video Stream -->
            <video
              #videoElement
              autoplay
              playsinline
              [class.hidden]="cameraLoading || cameraError"
              class="w-full max-h-[360px] object-contain">
            </video>

            <!-- Guía Visual Cuadrada Superpuesta -->
            @if (!cameraLoading && !cameraError) {
              <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div class="w-56 h-56 sm:w-64 sm:h-64 border-2 border-dashed border-white/60 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] relative">
                  <span class="absolute top-2 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">Encuadre Cuadrado</span>
                </div>
              </div>

              <!-- Barra de Controles de Cámara -->
              <div class="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
                <button
                  type="button"
                  (click)="switchCamera()"
                  title="Cambiar Cámara"
                  class="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition cursor-pointer">
                  <i-lucide name="refresh-cw" class="w-5 h-5"></i-lucide>
                </button>

                <button
                  type="button"
                  (click)="capturePhoto()"
                  class="px-6 py-3 rounded-full bg-easydry-blue hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition transform active:scale-95 cursor-pointer">
                  <i-lucide name="camera" class="w-5 h-5"></i-lucide>
                  <span>Capturar Foto</span>
                </button>

                <button
                  type="button"
                  (click)="stopCamera(); setMode('upload')"
                  title="Cerrar Cámara"
                  class="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition cursor-pointer">
                  <i-lucide name="x" class="w-5 h-5"></i-lucide>
                </button>
              </div>
            }
          </div>
        }

        <!-- ============================================================ -->
        <!-- MODO 3: ENLACE URL DIRECTO                                   -->
        <!-- ============================================================ -->
        @if (activeMode === 'url' && state !== 'uploading' && (!tieneImagenActiva() || changingImage)) {
          <div class="p-6 bg-white space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Enlace / URL de la imagen en línea</label>
              <div class="flex gap-2">
                <input
                  type="url"
                  [(ngModel)]="manualUrlInput"
                  placeholder="https://ejemplo.com/fotos/insumo.jpg"
                  class="flex-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:border-easydry-blue focus:ring-easydry-blue" />
                <button
                  type="button"
                  (click)="applyManualUrl()"
                  [disabled]="!manualUrlInput.trim()"
                  class="px-4 py-2.5 bg-easydry-blue hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer">
                  Cargar
                </button>
              </div>
            </div>
            <p class="text-[11px] text-slate-400">Puedes ingresar la URL de una imagen externa de tu catálogo de proveedores.</p>
          </div>
        }

        <!-- ============================================================ -->
        <!-- SUBIENDO A S3 / BARRA DE PROGRESO (DURANTE GUARDADO)         -->
        <!-- ============================================================ -->
        @if (state === 'uploading') {
          <div class="p-8 bg-white flex flex-col items-center justify-center text-center space-y-4">
            <div class="relative w-14 h-14 flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-easydry-blue">
              <i-lucide name="upload-cloud" class="w-7 h-7 animate-bounce"></i-lucide>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800">Transfiriendo imagen a AWS S3...</p>
              <p class="text-[11px] text-slate-400 mt-0.5">{{ uploadProgress }}% completado</p>
            </div>
            <div class="w-64 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                class="h-full bg-easydry-blue transition-all duration-200 rounded-full"
                [style.width.%]="uploadProgress"></div>
            </div>
          </div>
        }

        <!-- ============================================================ -->
        <!-- VISTA PREVIA CON ENCUADRE 1:1, ZOOM Y ARRASTRE               -->
        <!-- ============================================================ -->
        @if (tieneImagenActiva() && state !== 'uploading' && !changingImage) {
          <div class="p-5 bg-white flex flex-col" [class.sm:flex-row]="!skipCrop" [class.items-center]="!skipCrop" [class.gap-6]="true">
            
            <div
              (mousedown)="onMouseDown($event)"
              (touchstart)="onTouchStart($event)"
              class="relative rounded-2xl overflow-hidden shadow-sm bg-slate-100 border-2 flex items-center justify-center select-none"
              [class.w-full]="skipCrop"
              [class.min-h-56]="skipCrop"
              [class.max-h-80]="skipCrop"
              [class.w-36]="!skipCrop"
              [class.h-36]="!skipCrop"
              [class.sm:w-44]="!skipCrop"
              [class.sm:h-44]="!skipCrop"
              [class.flex-shrink-0]="!skipCrop"
              [class.bg-slate-900]="!skipCrop"
              [class.cursor-grab]="hasPendingUpload && !isPanning && !skipCrop"
              [class.cursor-grabbing]="hasPendingUpload && isPanning && !skipCrop"
              [ngClass]="hasPendingUpload ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-emerald-500/40'">
              
              <img
                [src]="previewUrl || getDisplayUrl(currentImageUrl)"
                [alt]="label"
                [style.transform]="hasPendingUpload && !skipCrop ? 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoomLevel + ')' : 'scale(1)'"
                class="pointer-events-none transition-transform"
                [class.w-full]="skipCrop"
                [class.h-full]="skipCrop"
                [class.max-h-80]="skipCrop"
                [class.object-contain]="true"
                [class.max-w-full]="!skipCrop"
                [class.max-h-full]="!skipCrop"
                [class.duration-75]="!isPanning"
                [class.duration-0]="isPanning" />
              
              <!-- Retícula guía suave y badge de ayuda al arrastrar -->
              @if (hasPendingUpload) {
                <div class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                  <div class="border-r border-b border-white/15"></div>
                  <div class="border-r border-b border-white/15"></div>
                  <div class="border-b border-white/15"></div>
                  <div class="border-r border-b border-white/15"></div>
                  <div class="border-r border-b border-white/15"></div>
                  <div class="border-b border-white/15"></div>
                  <div class="border-r border-b border-white/15"></div>
                  <div class="border-r border-b border-white/15"></div>
                  <div></div>
                </div>

                <div class="absolute bottom-1.5 inset-x-0 flex justify-center pointer-events-none">
                  <span class="text-[9px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 shadow-sm">
                    <i-lucide name="move" class="w-2.5 h-2.5"></i-lucide>
                    Arrastra para mover
                  </span>
                </div>
              }

              @if (!hasPendingUpload) {
                <div class="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    [href]="previewUrl || getDisplayUrl(currentImageUrl)"
                    target="_blank"
                    title="Ver en tamaño completo"
                    class="p-2 rounded-full bg-white text-slate-900 shadow-md hover:bg-slate-100">
                    <i-lucide name="external-link" class="w-4 h-4"></i-lucide>
                  </a>
                </div>
              }
            </div>

            <!-- Detalles, Control de Zoom, Centrado y Acciones -->
            <div class="flex-1 space-y-3 text-center sm:text-left w-full">
              <div class="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                @if (hasPendingUpload) {
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                    <i-lucide name="clock" class="w-3 h-3 text-amber-600"></i-lucide> Lista para subir a AWS S3 al guardar
                  </span>
                } @else if (isS3Url(currentImageUrl)) {
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                    <i-lucide name="check-circle" class="w-3 h-3 text-emerald-600"></i-lucide> Guardada en AWS S3
                  </span>
                } @else {
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1 border border-blue-200">
                    <i-lucide name="info" class="w-3 h-3 text-blue-600"></i-lucide> Imagen Local / Externa
                  </span>
                }
                
                @if (currentImageUrl) {
                  <span class="text-[10px] font-mono text-slate-400 truncate max-w-[180px]">
                    {{ getDisplayFileName(currentImageUrl) }}
                  </span>
                }
              </div>

              <!-- Slider de Zoom y Controles de Encuadre -->
              @if (hasPendingUpload) {
                <div class="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
                  <div class="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span class="flex items-center gap-1 text-[11px]">
                      <i-lucide name="zoom-in" class="w-3.5 h-3.5 text-easydry-blue"></i-lucide>
                      Ajustar Zoom / Encuadre:
                    </span>
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-easydry-blue text-xs">{{ (zoomLevel * 100).toFixed(0) }}%</span>
                      @if (panX !== 0 || panY !== 0 || zoomLevel !== 1) {
                        <button
                          type="button"
                          (click)="resetPosition()"
                          title="Restablecer posición y zoom al centro"
                          class="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs">
                          <i-lucide name="rotate-ccw" class="w-2.5 h-2.5"></i-lucide>
                          <span>Centrar</span>
                        </button>
                      }
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.05"
                    [(ngModel)]="zoomLevel"
                    class="w-full accent-easydry-blue cursor-pointer h-1.5" />
                  <p class="text-[10px] text-slate-500 flex items-center gap-1">
                    <i-lucide name="move" class="w-3 h-3 text-easydry-blue"></i-lucide>
                    <span>Arrastra con el ratón la foto dentro del recuadro para moverla en cualquier dirección.</span>
                  </p>
                </div>
              }

              <p class="text-[11px] text-slate-500 leading-snug">
                {{ skipCrop ? 'La imagen se muestra completa para consultarla y descargarla.' : 'Esta imagen se mostrará en formato cuadrado en la tabla de insumos.' }}
              </p>

              <div class="flex items-center gap-3 pt-0.5 justify-center sm:justify-start">
                <button
                  type="button"
                  (click)="iniciarCambioImagen()"
                  class="text-xs font-bold text-easydry-blue hover:underline cursor-pointer flex items-center gap-1">
                  <i-lucide name="refresh-cw" class="w-3.5 h-3.5"></i-lucide>
                  <span>Cambiar Imagen</span>
                </button>

                <span class="text-slate-300">•</span>

                <button
                  type="button"
                  (click)="eliminarImagen()"
                  class="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1">
                  <i-lucide name="trash-2" class="w-3.5 h-3.5"></i-lucide>
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        }

        <!-- BOTÓN CANCELAR CAMBIO CUANDO SE ESTÁ CAMBIANDO -->
        @if (changingImage && state !== 'uploading') {
          <div class="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span class="text-[11px] font-medium text-slate-500">Selecciona o toma una nueva foto para reemplazar la actual:</span>
            <button
              type="button"
              (click)="cancelarCambioImagen()"
              class="px-3 py-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
              Conservar imagen anterior
            </button>
          </div>
        }

      </div>
    </div>
  `
})
export class ImageUploaderComponent implements OnInit, OnDestroy {
  @Input() label: string = 'Foto del Insumo / Producto';
  @Input() required: boolean = false;
  @Input() insumoId?: string | number;
  @Input() insumoNombre?: string;
  @Input() category: StorageCategory = 'CATALOGO_INSUMOS';
  @Input() type: MediaEvidenceType = 'IMAGEN_PRODUCTO';
  @Input() agenciaId?: string;
  @Input() maquinariaId?: string;
  @Input() maquinariaNombre?: string;
  @Input() skipCrop = false;

  @Input() set imageUrl(val: string | null | undefined) {
    this.currentImageUrl = val ? val.trim() : null;
    if (this.currentImageUrl && !this.hasPendingUpload) {
      this.state = 'uploaded';
    }
  }
  public currentImageUrl: string | null = null;

  @Output() imageUrlChange = new EventEmitter<string>();
  @Output() imageUploaded = new EventEmitter<{ url: string; file?: Blob }>();
  @Output() pendingImageChange = new EventEmitter<Blob | null>();

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  private readonly storageUploadService = inject(StorageUploadService);
  private readonly cdr = inject(ChangeDetectorRef);

  public activeMode: ImageUploaderMode = 'upload';
  public state: UploaderState = 'idle';

  // Cámara
  public cameraLoading: boolean = false;
  public cameraError: string | null = null;
  private mediaStream: MediaStream | null = null;
  private currentFacingMode: 'environment' | 'user' = 'environment';

  // Drag & drop
  public isDragging: boolean = false;

  // Imagen en memoria, encuadre, desplazamiento y zoom
  public rawCapturedImage: string | null = null;
  public zoomLevel: number = 1.0;
  public panX: number = 0;
  public panY: number = 0;
  public isPanning: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private startPanX: number = 0;
  private startPanY: number = 0;

  public previewUrl: string | null = null;
  public hasPendingUpload: boolean = false;

  // Manual URL
  public manualUrlInput: string = '';

  // Modo cambiando imagen existente
  public changingImage: boolean = false;

  // Subida S3
  public uploadProgress: number = 0;

  ngOnInit(): void {
    if (this.currentImageUrl) {
      this.state = 'uploaded';
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  public reset(): void {
    this.stopCamera();
    this.rawCapturedImage = null;
    this.previewUrl = null;
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.hasPendingUpload = false;
    this.changingImage = false;
    this.activeMode = 'upload';
    this.state = this.currentImageUrl ? 'uploaded' : 'idle';
    this.uploadProgress = 0;
  }

  public resetPosition(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoomLevel = 1.0;
    this.cdr.detectChanges();
  }

  public tieneImagenActiva(): boolean {
    return Boolean(this.previewUrl || this.currentImageUrl);
  }

  public setMode(mode: ImageUploaderMode): void {
    this.activeMode = mode;
    this.cameraError = null;
    if (mode === 'camera') {
      this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  // =========================================================================
  // INTERACCIÓN DE ARRASTRE Y ENCUADRE (PANNING)
  // =========================================================================

  public onMouseDown(event: MouseEvent): void {
    if (!this.hasPendingUpload) return;
    event.preventDefault();
    this.isPanning = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startPanX = this.panX;
    this.startPanY = this.panY;
  }

  @HostListener('document:mousemove', ['$event'])
  public onMouseMoveDoc(event: MouseEvent): void {
    if (!this.isPanning) return;
    event.preventDefault();
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    this.panX = this.startPanX + dx;
    this.panY = this.startPanY + dy;
    this.clampPan();
    this.cdr.detectChanges();
  }

  @HostListener('document:mouseup')
  public onMouseUpDoc(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.cdr.detectChanges();
    }
  }

  public onTouchStart(event: TouchEvent): void {
    if (!this.hasPendingUpload || event.touches.length === 0) return;
    this.isPanning = true;
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
    this.startPanX = this.panX;
    this.startPanY = this.panY;
  }

  @HostListener('document:touchmove', ['$event'])
  public onTouchMoveDoc(event: TouchEvent): void {
    if (!this.isPanning || event.touches.length === 0) return;
    const dx = event.touches[0].clientX - this.startX;
    const dy = event.touches[0].clientY - this.startY;
    this.panX = this.startPanX + dx;
    this.panY = this.startPanY + dy;
    this.clampPan();
    this.cdr.detectChanges();
  }

  @HostListener('document:touchend')
  public onTouchEndDoc(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.cdr.detectChanges();
    }
  }

  private clampPan(): void {
    const limit = 220 * this.zoomLevel;
    this.panX = Math.max(-limit, Math.min(limit, this.panX));
    this.panY = Math.max(-limit, Math.min(limit, this.panY));
  }

  // =========================================================================
  // MANEJO DE ARCHIVOS LOCALES (CARGA INMEDIATA EN MEMORIA)
  // =========================================================================

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processRawFile(input.files[0]);
    }
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  public onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      this.processRawFile(event.dataTransfer.files[0]);
    }
  }

  private processRawFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.rawCapturedImage = dataUrl;
      this.previewUrl = dataUrl;
      this.zoomLevel = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.hasPendingUpload = true;
      this.state = 'uploaded';
      this.changingImage = false;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  // =========================================================================
  // MANEJO DE CÁMARA
  // =========================================================================

  public async startCamera(): Promise<void> {
    this.stopCamera();
    this.cameraLoading = true;
    this.cameraError = null;
    this.cdr.detectChanges();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      this.cameraLoading = false;
      this.cdr.detectChanges();

      setTimeout(() => {
        if (this.videoElement && this.mediaStream) {
          this.videoElement.nativeElement.srcObject = this.mediaStream;
        }
      }, 100);
    } catch {
      this.cameraLoading = false;
      this.cameraError = 'No se pudo acceder a la cámara. Revisa los permisos de tu navegador.';
      this.cdr.detectChanges();
    }
  }

  public stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  public switchCamera(): void {
    this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    this.startCamera();
  }

  public async capturePhoto(): Promise<void> {
    if (!this.videoElement || !this.mediaStream) return;
    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      this.stopCamera();
      this.rawCapturedImage = dataUrl;
      this.previewUrl = dataUrl;
      this.zoomLevel = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.hasPendingUpload = true;
      this.state = 'uploaded';
      this.changingImage = false;
      this.cdr.detectChanges();
    }
  }

  // =========================================================================
  // RENDER RECORTE CUADRADO 1:1 CON ZOOM Y ARRASTRE AL SUBIR
  // =========================================================================

  private renderOriginalImage(imageSrc: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar canvas context 2D'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Error al generar la imagen de ficha técnica.'));
          },
          'image/jpeg',
          0.85,
        );
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para procesar.'));
      img.src = imageSrc;
    });
  }

  private renderSquareCrop(imageSrc: string, zoom: number, panX: number, panY: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const targetSize = 800; // 800x800 píxeles HD
        const containerSize = 160; // tamaño base contenedor visor en UI
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar canvas context 2D'));
          return;
        }

        // Fondo blanco limpio para productos
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetSize, targetSize);

        // Escala base unzoomed
        const scale0 = Math.min(containerSize / img.width, containerSize / img.height);
        const unzoomedW = img.width * scale0;
        const unzoomedH = img.height * scale0;

        const multiplier = targetSize / containerSize;
        const drawW = unzoomedW * multiplier;
        const drawH = unzoomedH * multiplier;

        // Renderizado WYSIWYG idéntico al CSS del visor
        ctx.save();
        ctx.translate(targetSize / 2, targetSize / 2);
        ctx.translate(panX * multiplier, panY * multiplier);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Error al generar Blob cuadrado.'));
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para procesar.'));
      img.src = imageSrc;
    });
  }

  // =========================================================================
  // SUBIDA REAL A AWS S3 (SE EJECUTA AL DAR CLIC EN GUARDAR/ACTUALIZAR)
  // =========================================================================

  public async uploadNow(): Promise<string> {
    if (!this.hasPendingUpload || !this.rawCapturedImage) {
      return this.currentImageUrl || '';
    }

    this.state = 'uploading';
    this.uploadProgress = 15;
    this.cdr.detectChanges();

    try {
      // 1. Recortar cuadrado 1:1 aplicando zoom y desplazamiento exacto
      const blob = this.skipCrop || this.type === 'FICHA_TECNICA'
        ? await this.renderOriginalImage(this.rawCapturedImage)
        : await this.renderSquareCrop(this.rawCapturedImage, this.zoomLevel, this.panX, this.panY);

      this.uploadProgress = 35;
      this.cdr.detectChanges();

      const rawName = this.maquinariaNombre || this.insumoNombre || this.insumoId || this.maquinariaId
        ? String(this.maquinariaNombre || this.insumoNombre || this.insumoId || this.maquinariaId)
        : (this.type === 'FICHA_TECNICA' ? 'ficha-tecnica' : 'insumo');
      const cleanSlug = rawName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'insumo';
      const fileName = this.type === 'FICHA_TECNICA' ? 'ficha-tecnica.jpg' : `${cleanSlug}.jpg`;

      // 2. Subir directamente a AWS S3
      const s3Url = await this.storageUploadService.uploadMedia(blob, {
        category: this.category,
        type: this.type,
        insumoId: this.insumoId ? String(this.insumoId) : cleanSlug,
        insumoNombre: this.insumoNombre,
        agenciaId: this.agenciaId,
        maquinariaId: this.maquinariaId,
        maquinariaNombre: this.maquinariaNombre || this.insumoNombre,
        fileName: fileName,
        contentType: 'image/jpeg',
        onProgress: (pct) => {
          this.uploadProgress = 35 + Math.round(pct * 0.6);
          this.cdr.detectChanges();
        },
      });

      this.uploadProgress = 100;
      this.currentImageUrl = s3Url;
      this.previewUrl = null;
      this.rawCapturedImage = null;
      this.panX = 0;
      this.panY = 0;
      this.hasPendingUpload = false;
      this.state = 'uploaded';
      this.changingImage = false;

      this.imageUrlChange.emit(s3Url);
      this.imageUploaded.emit({ url: s3Url });
      this.cdr.detectChanges();

      return s3Url;
    } catch (err: any) {
      this.state = 'uploaded';
      this.cdr.detectChanges();
      throw err;
    }
  }

  // =========================================================================
  // URL MANUAL Y ACCIONES
  // =========================================================================

  public applyManualUrl(): void {
    if (this.manualUrlInput.trim()) {
      this.currentImageUrl = this.manualUrlInput.trim();
      this.previewUrl = null;
      this.rawCapturedImage = null;
      this.hasPendingUpload = false;
      this.imageUrlChange.emit(this.currentImageUrl);
      this.imageUploaded.emit({ url: this.currentImageUrl });
      this.state = 'uploaded';
      this.manualUrlInput = '';
    }
  }

  public iniciarCambioImagen(): void {
    this.changingImage = true;
    this.activeMode = 'upload';
  }

  public cancelarCambioImagen(): void {
    this.changingImage = false;
    this.stopCamera();
  }

  public isS3Url(url: string | null): boolean {
    if (!url) return false;
    return url.includes('.amazonaws.com') || url.includes('/catalogo/insumos/');
  }

  public getDisplayFileName(url: string | null): string {
    if (!url) return '';
    if (url.startsWith('data:image/')) return 'Imagen local';
    const name = url.split('/').pop()?.split('?')[0] || 'imagen.jpg';
    return name;
  }

  public getDisplayUrl(url: string | null): string {
    if (!url) return '';
    return this.storageUploadService.resolveBackendUrl(url);
  }

  public eliminarImagen(): void {
    this.currentImageUrl = null;
    this.previewUrl = null;
    this.rawCapturedImage = null;
    this.hasPendingUpload = false;
    this.state = 'idle';
    this.changingImage = false;
    this.imageUrlChange.emit('');
    this.imageUploaded.emit({ url: '' });
    this.pendingImageChange.emit(null);
  }
}

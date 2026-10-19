import { VerMediaDirective } from '../../directives/ver-media.directive';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ArchivoAdjunto } from '../../../core/models';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, VerMediaDirective],
  template: `
    <div class="space-y-3">

      <!-- Label & Instructions -->
      <div class="flex items-center justify-between">
        <label [attr.for]="inputId" class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {{ label }}
        </label>
        <span class="text-xs font-medium text-slate-500">
          Máx. {{ maxSizeBytes / (1024 * 1024) }} MB por archivo · Fotos y Videos
        </span>
      </div>

      <!-- Drag & Drop Zone -->
      <div
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        (keydown.enter)="fileInput.click()"
        (keydown.space)="$event.preventDefault(); fileInput.click()"
        tabindex="0"
        role="button"
        [attr.aria-label]="'Seleccionar archivos: ' + label"
        class="border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors duration-200"
        [ngClass]="isDragging
          ? 'border-easydry-blue bg-easydry-blue/5 scale-[1.01]'
          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-300'">

        <input
          #fileInput
          [id]="inputId"
          tabindex="-1"
          type="file"
          [accept]="acceptTypes"
          [multiple]="multiple"
          (change)="onFileSelected($event)"
          class="hidden">

        <div class="flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div class="w-10 h-10 rounded-2xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center">
            <i-lucide name="upload-cloud" class="w-5 h-5" aria-hidden="true"></i-lucide>
          </div>
          <div>
            <p class="text-xs font-bold text-slate-800">
              Arrastra y suelta tus evidencias aquí, o <span class="text-easydry-blue underline">selecciona un archivo</span>
            </p>
            <p class="text-xs text-slate-500 mt-0.5">
              Formatos aceptados: JPG, PNG, WEBP, MP4, WEBM (Preparado para AWS S3)
            </p>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      @if (errorMessage) {
        <div role="alert" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs animate-shake">
          <i-lucide name="alert-circle" class="w-4 h-4 shrink-0" aria-hidden="true"></i-lucide>
          <span class="font-semibold">{{ errorMessage }}</span>
        </div>
      }

      <!-- Uploaded Files Preview Grid -->
      @if (archivos && archivos.length > 0) {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
          @for (item of archivos; track item.id; let idx = $index) {
            <div class="relative group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs flex flex-col justify-between">

              <!-- Thumbnail / Video Preview -->
              <div class="h-24 bg-slate-900/5 relative overflow-hidden flex items-center justify-center">
                @if (item.tipo === 'imagen') {
                  <img [src]="item.url" [appVerMedia]="item.url" [appVerMediaTitulo]="item.nombre" [appVerMediaTipo]="'imagen'" [alt]="item.nombre" class="w-full h-full object-cover">
                } @else if (item.tipo === 'video') {
                  <div class="w-full h-full flex items-center justify-center bg-slate-900 text-white relative">
                    <video [src]="item.url" [appVerMedia]="item.url" [appVerMediaTitulo]="item.nombre" [appVerMediaTipo]="'video'" class="w-full h-full object-cover opacity-80" muted preload="metadata"></video>
                    <span class="absolute p-2 rounded-full bg-white/20 backdrop-blur-xs text-white">
                      <i-lucide name="play" class="w-4 h-4" aria-hidden="true"></i-lucide>
                    </span>
                  </div>
                } @else {
                  <div class="text-slate-500">
                    <i-lucide name="file-text" class="w-8 h-8" aria-hidden="true"></i-lucide>
                  </div>
                }

                <!-- Remove Button -->
                <button
                  type="button"
                  (click)="removeArchivo(idx, $event)"
                  class="absolute top-0 right-0 w-9 h-9 flex items-center justify-center group/x cursor-pointer"
                  [attr.aria-label]="'Eliminar ' + item.nombre"
                  title="Eliminar archivo">
                  <span class="w-6 h-6 flex items-center justify-center rounded-full bg-black/60 group-hover/x:bg-rose-600 text-white transition-colors">
                    <i-lucide name="x" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
                  </span>
                </button>
              </div>

              <!-- Metadata Info -->
              <div class="p-2 bg-white">
                <p class="text-xs font-bold text-slate-800 truncate" [title]="item.nombre">
                  {{ item.nombre }}
                </p>
                <div class="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-0.5">
                  <span class="uppercase font-bold text-easydry-blue">{{ item.tipo }}</span>
                  <span>{{ item.tamanio || 'OK' }}</span>
                </div>
              </div>

            </div>
          }
        </div>
      }

    </div>
  `
})
export class FileUploaderComponent {
  private static seq = 0;
  readonly inputId = 'file-uploader-' + (++FileUploaderComponent.seq);

  @Input() label = 'Adjuntar Evidencias (Fotos / Videos)';
  @Input() archivos: ArchivoAdjunto[] = [];
  @Input() acceptTypes = 'image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime';
  @Input() multiple = true;
  @Input() maxSizeBytes = 25 * 1024 * 1024; // 25 MB

  @Output() archivosChange = new EventEmitter<ArchivoAdjunto[]>();

  isDragging = false;
  errorMessage = '';

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    if (e.dataTransfer && e.dataTransfer.files) {
      this.handleFiles(Array.from(e.dataTransfer.files));
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
      input.value = ''; // Reset
    }
  }

  removeArchivo(index: number, event: Event): void {
    event.stopPropagation();
    const updated = [...this.archivos];
    updated.splice(index, 1);
    this.archivos = updated;
    this.archivosChange.emit(this.archivos);
  }

  private handleFiles(files: File[]): void {
    this.errorMessage = '';
    const newAttachments: ArchivoAdjunto[] = [...this.archivos];

    for (const file of files) {
      if (file.size > this.maxSizeBytes) {
        this.errorMessage = `El archivo "${file.name}" supera el tamaño máximo permitido (${(this.maxSizeBytes / (1024 * 1024)).toFixed(0)} MB).`;
        continue;
      }

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        this.errorMessage = `El archivo "${file.name}" no es una foto ni un video válido.`;
        continue;
      }

      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

      const objUrl = URL.createObjectURL(file);

      newAttachments.push({
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        nombre: file.name,
        tipo: isImage ? 'imagen' : 'video',
        extension: file.name.split('.').pop(),
        url: objUrl,
        tamanio: sizeStr,
        tamanoBytes: file.size,
        fechaSubida: new Date().toISOString().split('T')[0],
        s3Key: `uploads/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      });
    }

    this.archivos = newAttachments;
    this.archivosChange.emit(this.archivos);
  }
}

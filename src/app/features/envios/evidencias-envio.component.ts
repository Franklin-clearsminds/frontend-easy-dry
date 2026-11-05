import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { VerMediaDirective } from '../../shared/directives/ver-media.directive';
import { StorageUploadService } from '../../core/services/storage-upload.service';

interface FotoPendiente {
  archivo: File;
  vista: string;
}

/**
 * Fotos de un envío (salida, recepción, rechazo o resolución): siempre opcionales. Se toman con la cámara o se eligen de los archivos,
 * y se suben al guardar, con el tipo FOTO_ENVIO: quedan en inventario/envios/{guía}/{etapa}/ dentro del bucket, junto con todo lo demás de esa guía.
 */
@Component({
  selector: 'app-evidencias-envio',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, VerMediaDirective],
  template: `
    <div class="space-y-2">
      <span class="block text-xs font-bold text-slate-700">Fotos de evidencia <span class="font-normal text-slate-500">(opcional, hasta {{ maximo }})</span></span>
      <div class="flex flex-wrap gap-2">
        @for (f of fotos; track f.vista; let i = $index) {
          <div class="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
            <img [src]="f.vista" [appVerMedia]="f.vista" appVerMediaTitulo="Foto de evidencia" alt="Foto de evidencia" class="w-full h-full object-cover">
            <button type="button" (click)="quitar(i)" class="absolute top-0 right-0 bg-white/90 rounded-bl-lg p-0.5 cursor-pointer" aria-label="Quitar foto">
              <i-lucide aria-hidden="true" name="x" class="w-3 h-3 text-rose-600"></i-lucide>
            </button>
          </div>
        }
      </div>
      @if (fotos.length < maximo && !camaraActiva) {
        <div class="flex flex-wrap gap-2">
          <button type="button" (click)="abrirCamara()" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-easydry-blue cursor-pointer">
            <i-lucide aria-hidden="true" name="camera" class="w-4 h-4"></i-lucide> Tomar foto
          </button>
          <label class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-easydry-blue cursor-pointer">
            <i-lucide aria-hidden="true" name="image" class="w-4 h-4"></i-lucide> Elegir de archivos
            <input type="file" accept="image/*" multiple class="sr-only" (change)="elegir($event)">
          </label>
          <input #entradaCamara type="file" accept="image/*" capture="environment" class="sr-only" (change)="elegir($event)">
        </div>
      }
      @if (errorCamara) {
        <p class="text-xs text-rose-600">{{ errorCamara }}</p>
      }
      @if (camaraActiva) {
        <div class="space-y-2">
          <video #video autoplay playsinline muted class="w-full max-w-xs rounded-lg bg-black"></video>
          <div class="flex gap-2">
            <button type="button" (click)="capturar()" class="rounded-lg bg-easydry-blue px-3 py-1.5 text-xs font-semibold text-white cursor-pointer">Capturar</button>
            <button type="button" (click)="cerrarCamara()" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer">Cancelar</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class EvidenciasEnvioComponent implements OnDestroy {
  private storage = inject(StorageUploadService);
  private cdr = inject(ChangeDetectorRef);

  @Input() maximo = 5;
  @ViewChild('video') private video?: ElementRef<HTMLVideoElement>;
  @ViewChild('entradaCamara') private entradaCamara?: ElementRef<HTMLInputElement>;
  fotos: FotoPendiente[] = [];
  camaraActiva = false;
  errorCamara = '';
  private stream: MediaStream | null = null;

  get cantidad(): number { return this.fotos.length; }

  elegir(event: Event): void {
    const input = event.target as HTMLInputElement;
    for (const archivo of Array.from(input.files || [])) {
      if (this.fotos.length >= this.maximo) break;
      this.fotos.push({ archivo, vista: URL.createObjectURL(archivo) });
    }
    input.value = '';
  }

  /** Abre la cámara del dispositivo; si el navegador no la da, usa el selector con captura. */
  async abrirCamara(): Promise<void> {
    this.errorCamara = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.entradaCamara?.nativeElement.click();
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      this.camaraActiva = true;
      this.cdr.detectChanges();
      if (this.video) this.video.nativeElement.srcObject = this.stream;
    } catch {
      this.cerrarCamara();
      this.errorCamara = 'No se pudo acceder a la cámara. Revisa los permisos del navegador o elige la foto de tus archivos.';
    }
  }

  capturar(): void {
    const video = this.video?.nativeElement;
    if (!video || this.fotos.length >= this.maximo) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const archivo = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.fotos.push({ archivo, vista: URL.createObjectURL(archivo) });
      }
      this.cerrarCamara();
      this.cdr.detectChanges();
    }, 'image/jpeg', 0.85);
  }

  cerrarCamara(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.camaraActiva = false;
  }

  quitar(i: number): void {
    URL.revokeObjectURL(this.fotos[i].vista);
    this.fotos.splice(i, 1);
  }

  limpiar(): void {
    this.cerrarCamara();
    this.fotos.forEach((f) => URL.revokeObjectURL(f.vista));
    this.fotos = [];
  }

  ngOnDestroy(): void {
    this.cerrarCamara();
  }

  /** Sube las fotos elegidas y devuelve sus URL (lista vacía si no se eligió ninguna). */
  async subir(guia: string, etapa: 'envio' | 'recepcion' | 'rechazo' | 'resolucion'): Promise<string[]> {
    const urls: string[] = [];
    for (const f of this.fotos) {
      urls.push(await this.storage.uploadMedia(f.archivo, {
        category: 'INVENTARIO_ENVIOS',
        type: 'FOTO_ENVIO',
        envioGuia: guia,
        envioEtapa: etapa,
        fileName: f.archivo.name,
        contentType: f.archivo.type || 'image/jpeg',
      }));
    }
    return urls;
  }
}

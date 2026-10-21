import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ThumbSrcDirective } from '../../../shared/directives/thumb-src.directive';
import { VisorMediaService } from '../../../shared/services/visor-media.service';
import { mensajeError } from '../../../core/models/auditorias.model';

/**
 * Fotos de evidencia de una novedad, actividad, plan, hallazgo o acción correctiva. Cada foto se sube al almacenamiento privado
 * (agencias/{agencia}/auditorias/…) y aquí solo se guardan sus direcciones. Se pueden tomar con la cámara o elegir de la galería o del equipo.
 */
@Component({
  selector: 'app-evidencias-fotos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ThumbSrcDirective],
  template: `
    <div class="flex flex-wrap items-center gap-2">
      @for (foto of fotos; track foto) {
        <div class="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
          <button type="button" class="w-full h-full cursor-zoom-in" (click)="abrir(foto)" aria-label="Ver foto ampliada">
            <img [appThumb]="foto" class="w-full h-full object-cover" alt="Evidencia fotográfica">
          </button>
          @if (!deshabilitado) {
            <button type="button" (click)="quitar(foto)" aria-label="Quitar foto"
              class="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-rose-600">
              <i-lucide name="x" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
            </button>
          }
        </div>
      }
      @if (!deshabilitado && fotos.length < max) {
        <!-- Dos entradas: «Tomar foto» abre la cámara del equipo (o la del celular) y «Elegir» abre la galería o el explorador de archivos. -->
        <button type="button" (click)="tomarFoto()" [disabled]="subiendo"
          class="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-500 cursor-pointer hover:border-easydry-blue hover:text-easydry-blue transition-colors disabled:opacity-60 disabled:pointer-events-none"
          aria-label="Tomar una fotografía con la cámara">
          <i-lucide [name]="subiendo ? 'loader' : 'camera'" class="w-5 h-5" [class.animate-spin]="subiendo" aria-hidden="true"></i-lucide>
          <span class="text-[10px] font-bold">{{ subiendo ? 'Subiendo…' : 'Tomar foto' }}</span>
        </button>
        <!-- Respaldo: si el navegador no da acceso a la cámara, se abre la cámara nativa del celular o el selector de archivos. -->
        <input #capturaNativa type="file" accept="image/*" capture="environment" class="sr-only" tabindex="-1" aria-hidden="true" (change)="seleccionar($event)">
        <label class="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-500 cursor-pointer hover:border-easydry-blue hover:text-easydry-blue transition-colors"
          [class.opacity-60]="subiendo" [class.pointer-events-none]="subiendo">
          <i-lucide name="image" class="w-5 h-5" aria-hidden="true"></i-lucide>
          <span class="text-[10px] font-bold">Elegir</span>
          <input type="file" accept="image/*" multiple class="sr-only" (change)="seleccionar($event)" [attr.aria-label]="etiqueta">
        </label>
      }
      @if (deshabilitado && !fotos.length) {
        <span class="text-xs text-slate-400 italic">Sin fotos.</span>
      }
    </div>

    @if (camaraAbierta) {
      <div class="fixed inset-0 z-[10700] bg-slate-900/85 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Tomar fotografía">
        <div class="w-full max-w-xl bg-white rounded-2xl overflow-hidden shadow-2xl">
          <video #video autoplay playsinline muted class="w-full max-h-[65vh] bg-black object-contain"></video>
          <div class="flex items-center justify-between gap-3 p-4">
            <button type="button" (click)="cerrarCamara()" class="btn btn-secondary">Cancelar</button>
            <button type="button" (click)="capturar()" class="btn btn-primary flex items-center gap-2">
              <i-lucide name="camera" class="w-4 h-4" aria-hidden="true"></i-lucide> Capturar foto
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class EvidenciasFotosComponent implements OnDestroy {
  private readonly storage = inject(StorageUploadService);
  private readonly visor = inject(VisorMediaService);
  private readonly toast = inject(ToastService);

  @Input() fotos: string[] = [];
  @Input() agenciaId = '';
  @Input() tipo: 'informes' | '5s' = 'informes';
  /** Id del informe o auditoría; mientras no exista, las fotos se guardan como «borrador». */
  @Input() referenciaId?: string;
  @Input() deshabilitado = false;
  @Input() max = 12;
  @Input() etiqueta = 'Agregar fotografías de evidencia';
  @Output() fotosChange = new EventEmitter<string[]>();

  subiendo = false;
  camaraAbierta = false;
  private flujo: MediaStream | null = null;
  @ViewChild('video') private video?: ElementRef<HTMLVideoElement>;
  @ViewChild('capturaNativa') private capturaNativa?: ElementRef<HTMLInputElement>;

  ngOnDestroy(): void { this.cerrarCamara(); }

  /** Abre la cámara del equipo en una ventana; si no hay permiso o el navegador no la ofrece, usa la nativa del celular. */
  async tomarFoto(): Promise<void> {
    if (!this.agenciaId) {
      this.toast.warning('Elige la agencia primero', 'Las fotos se guardan junto a la agencia inspeccionada.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) { this.capturaNativa?.nativeElement.click(); return; }
    try {
      this.flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      this.camaraAbierta = true;
      setTimeout(() => {
        const v = this.video?.nativeElement;
        if (!v || !this.flujo) return;
        v.srcObject = this.flujo;
        void v.play();
      });
    } catch {
      this.cerrarCamara();
      this.capturaNativa?.nativeElement.click();
    }
  }

  async capturar(): Promise<void> {
    const v = this.video?.nativeElement;
    if (!v || !v.videoWidth) return;
    const lienzo = document.createElement('canvas');
    lienzo.width = v.videoWidth;
    lienzo.height = v.videoHeight;
    lienzo.getContext('2d')?.drawImage(v, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.85));
    this.cerrarCamara();
    if (!blob) { this.toast.error('No se pudo tomar la foto', 'Intenta de nuevo.'); return; }
    await this.subirArchivos([new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' })]);
  }

  cerrarCamara(): void {
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.flujo = null;
    this.camaraAbierta = false;
  }

  async seleccionar(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []).slice(0, this.max - this.fotos.length);
    input.value = '';
    await this.subirArchivos(archivos);
  }

  private async subirArchivos(archivos: File[]): Promise<void> {
    if (!archivos.length) return;
    if (!this.agenciaId) {
      this.toast.warning('Elige la agencia primero', 'Las fotos se guardan junto a la agencia inspeccionada.');
      return;
    }
    this.subiendo = true;
    const nuevas: string[] = [];
    try {
      for (const archivo of archivos) {
        const url = await this.storage.uploadMedia(archivo, {
          category: 'AUDITORIAS',
          type: 'FOTO_AUDITORIA',
          agenciaId: this.agenciaId,
          auditoriaTipo: this.tipo,
          auditoriaId: this.referenciaId,
          fileName: archivo.name,
          contentType: archivo.type || 'image/jpeg',
        });
        nuevas.push(url);
      }
    } catch (e) {
      this.toast.error('No se pudo subir la foto', mensajeError(e));
    } finally {
      this.subiendo = false;
      if (nuevas.length) {
        this.fotos = [...this.fotos, ...nuevas];
        this.fotosChange.emit(this.fotos);
      }
    }
  }

  quitar(foto: string): void {
    this.fotos = this.fotos.filter((f) => f !== foto);
    this.fotosChange.emit(this.fotos);
  }

  abrir(foto: string): void {
    void this.visor.abrir(foto, { titulo: 'Evidencia fotográfica', tipo: 'imagen' });
  }
}

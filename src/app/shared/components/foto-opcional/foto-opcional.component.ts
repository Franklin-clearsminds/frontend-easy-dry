import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MediaEvidenceType, StorageCategory, StorageUploadService } from '../../../core/services/storage-upload.service';
import { ToastService } from '../../services/toast.service';
import { VisorMediaService } from '../../services/visor-media.service';

/**
 * Una foto adicional y opcional de evidencia (igual que «Foto adicional de ingreso» de la app). Se puede tomar con la cámara
 * o elegir del equipo. La foto queda en el navegador y se sube al guardar, con `subirAhora()`, cuando ya se conoce la OT.
 */
@Component({
  selector: 'app-foto-opcional',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="space-y-1.5">
      <span class="block text-xs font-bold text-slate-700 uppercase">{{ label }}</span>
      <div class="flex items-center gap-2">
        @if (vistaPrevia) {
          <div class="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <button type="button" class="w-full h-full cursor-zoom-in" (click)="ampliar()" aria-label="Ver foto ampliada">
              <img [src]="vistaPrevia" class="w-full h-full object-cover" alt="Foto de evidencia">
            </button>
            <button type="button" (click)="quitar()" aria-label="Quitar foto"
              class="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-rose-600 cursor-pointer">
              <i-lucide name="x" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
            </button>
          </div>
        } @else {
          <button type="button" (click)="tomarFoto()"
            class="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-500 cursor-pointer hover:border-easydry-blue hover:text-easydry-blue transition-colors"
            aria-label="Tomar una fotografía con la cámara">
            <i-lucide name="camera" class="w-5 h-5" aria-hidden="true"></i-lucide>
            <span class="text-[10px] font-bold">Tomar foto</span>
          </button>
          <!-- Respaldo: si el navegador no da acceso a la cámara, se abre la cámara nativa del celular o el selector de archivos. -->
          <input #capturaNativa type="file" accept="image/*" capture="environment" class="sr-only" tabindex="-1" aria-hidden="true" (change)="seleccionar($event)">
          <label class="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-500 cursor-pointer hover:border-easydry-blue hover:text-easydry-blue transition-colors">
            <i-lucide name="image" class="w-5 h-5" aria-hidden="true"></i-lucide>
            <span class="text-[10px] font-bold">Elegir</span>
            <input type="file" accept="image/*" class="sr-only" (change)="seleccionar($event)" [attr.aria-label]="label">
          </label>
        }
      </div>
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
export class FotoOpcionalComponent implements OnDestroy {
  private readonly storage = inject(StorageUploadService);
  private readonly toast = inject(ToastService);
  private readonly visor = inject(VisorMediaService);

  @Input() label = 'Foto adicional (opcional)';
  @Input() category: StorageCategory = 'SERVICIOS_GENERALES';
  @Input() evidenceType: MediaEvidenceType = 'FOTO_INGRESO';
  /** Los pone quien guarda justo antes de `subirAhora()`: la OT y la agencia no se conocen hasta ese momento. */
  @Input() agenciaId: string | undefined = '';
  @Input() servicioId: string | undefined = '';
  @Output() fotoUrlChange = new EventEmitter<string>();

  vistaPrevia = '';
  camaraAbierta = false;
  private archivo: File | null = null;
  private flujo: MediaStream | null = null;
  @ViewChild('video') private video?: ElementRef<HTMLVideoElement>;
  @ViewChild('capturaNativa') private capturaNativa?: ElementRef<HTMLInputElement>;

  get tienePendiente(): boolean { return !!this.archivo; }

  ngOnDestroy(): void {
    this.cerrarCamara();
    this.liberarVistaPrevia();
  }

  async tomarFoto(): Promise<void> {
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
    this.fijar(new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' }));
  }

  cerrarCamara(): void {
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.flujo = null;
    this.camaraAbierta = false;
  }

  seleccionar(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (archivo) this.fijar(archivo);
  }

  quitar(): void {
    this.archivo = null;
    this.liberarVistaPrevia();
    this.fotoUrlChange.emit('');
  }

  ampliar(): void {
    void this.visor.abrir(this.vistaPrevia, { titulo: this.label, tipo: 'imagen' });
  }

  /** Sube la foto elegida al almacenamiento y devuelve su dirección; sin foto, devuelve vacío. Lanza el error si falla la subida. */
  async subirAhora(): Promise<string> {
    if (!this.archivo) return '';
    const url = await this.storage.uploadMedia(this.archivo, {
      category: this.category,
      type: this.evidenceType,
      agenciaId: this.agenciaId || undefined,
      servicioId: this.servicioId || undefined,
      fileName: this.archivo.name,
      contentType: this.archivo.type || 'image/jpeg',
    });
    this.fotoUrlChange.emit(url);
    return url;
  }

  /** Vacía la foto sin avisar (al cerrar o reabrir el formulario). */
  reiniciar(): void {
    this.archivo = null;
    this.liberarVistaPrevia();
  }

  private fijar(archivo: File): void {
    this.liberarVistaPrevia();
    this.archivo = archivo;
    this.vistaPrevia = URL.createObjectURL(archivo);
  }

  private liberarVistaPrevia(): void {
    if (this.vistaPrevia) URL.revokeObjectURL(this.vistaPrevia);
    this.vistaPrevia = '';
  }
}

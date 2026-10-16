import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ThumbSrcDirective } from '../../../shared/directives/thumb-src.directive';
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
        <!-- Dos entradas: "Tomar" abre la cámara en el celular; "Elegir" abre la galería o el explorador de archivos. -->
        <label class="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-500 cursor-pointer hover:border-easydry-blue hover:text-easydry-blue transition-colors"
          [class.opacity-60]="subiendo" [class.pointer-events-none]="subiendo">
          <i-lucide [name]="subiendo ? 'loader' : 'camera'" class="w-5 h-5" [class.animate-spin]="subiendo" aria-hidden="true"></i-lucide>
          <span class="text-[10px] font-bold">{{ subiendo ? 'Subiendo…' : 'Tomar foto' }}</span>
          <input type="file" accept="image/*" capture="environment" class="sr-only" (change)="seleccionar($event)" aria-label="Tomar una fotografía con la cámara">
        </label>
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
  `,
})
export class EvidenciasFotosComponent {
  private readonly storage = inject(StorageUploadService);
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

  async seleccionar(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []).slice(0, this.max - this.fotos.length);
    input.value = '';
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

  async abrir(foto: string): Promise<void> {
    try {
      window.open(await this.storage.resolveMediaUrlStrict(foto), '_blank', 'noopener');
    } catch (e) {
      this.toast.error('No se pudo abrir la foto', mensajeError(e));
    }
  }
}

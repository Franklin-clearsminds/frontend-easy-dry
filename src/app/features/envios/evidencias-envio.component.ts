import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StorageUploadService } from '../../core/services/storage-upload.service';

interface FotoPendiente {
  archivo: File;
  vista: string;
}

/**
 * Fotos opcionales de un envío (recepción, rechazo o resolución). Se eligen aquí y se suben al guardar, con el tipo FOTO_ENVIO:
 * quedan en inventario/envios/{guía}/{etapa}/ dentro del bucket, junto con todo lo demás de esa guía.
 */
@Component({
  selector: 'app-evidencias-envio',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-2">
      <span class="block text-xs font-bold text-slate-700">Fotos de evidencia <span class="font-normal text-slate-500">(opcional, hasta {{ maximo }})</span></span>
      <div class="flex flex-wrap gap-2">
        @for (f of fotos; track f.vista; let i = $index) {
          <div class="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
            <img [src]="f.vista" alt="Foto de evidencia" class="w-full h-full object-cover">
            <button type="button" (click)="quitar(i)" class="absolute top-0 right-0 bg-white/90 rounded-bl-lg p-0.5 cursor-pointer" aria-label="Quitar foto">
              <i-lucide aria-hidden="true" name="x" class="w-3 h-3 text-rose-600"></i-lucide>
            </button>
          </div>
        }
        @if (fotos.length < maximo) {
          <label class="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-easydry-blue flex items-center justify-center cursor-pointer text-slate-400">
            <i-lucide aria-hidden="true" name="camera" class="w-5 h-5"></i-lucide>
            <input type="file" accept="image/*" multiple class="sr-only" (change)="elegir($event)">
          </label>
        }
      </div>
    </div>
  `,
})
export class EvidenciasEnvioComponent {
  private storage = inject(StorageUploadService);

  @Input() maximo = 5;
  fotos: FotoPendiente[] = [];

  get cantidad(): number { return this.fotos.length; }

  elegir(event: Event): void {
    const input = event.target as HTMLInputElement;
    for (const archivo of Array.from(input.files || [])) {
      if (this.fotos.length >= this.maximo) break;
      this.fotos.push({ archivo, vista: URL.createObjectURL(archivo) });
    }
    input.value = '';
  }

  quitar(i: number): void {
    URL.revokeObjectURL(this.fotos[i].vista);
    this.fotos.splice(i, 1);
  }

  limpiar(): void {
    this.fotos.forEach((f) => URL.revokeObjectURL(f.vista));
    this.fotos = [];
  }

  /** Sube las fotos elegidas y devuelve sus URL (lista vacía si no se eligió ninguna). */
  async subir(guia: string, etapa: 'recepcion' | 'rechazo' | 'resolucion'): Promise<string[]> {
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

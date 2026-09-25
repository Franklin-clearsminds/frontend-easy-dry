import { Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { EvidenciaMaquinaria } from '../../../core/models';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { fechaHoraLocal } from '../../../core/utils/evidencia-maquinaria';
import { VisorArchivoComponent } from '../visor-archivo/visor-archivo.component';

/**
 * Galería de evidencias de maquinaria (fotos, videos y PDF). Las claves `maquinaria/` son privadas: cada archivo
 * se resuelve con la URL temporal de /storage/presigned-url (con caché en memoria).
 */
@Component({
  selector: 'app-evidencia-galeria',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, VisorArchivoComponent],
  template: `
    @if (evidencias.length === 0) {
      <p class="text-xs text-slate-400 font-semibold">{{ vacio }}</p>
    } @else {
      @for (grupo of grupos; track grupo.titulo) {
        <div class="mb-4">
          @if (grupo.titulo) {
            <p class="text-[10px] font-bold uppercase text-slate-500 mb-2">{{ grupo.titulo }}</p>
          }
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            @for (e of grupo.items; track e.id) {
              <div class="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
                @if (e.kind === 'FOTO') {
                  <button type="button" (click)="abrir(e)" class="block w-full cursor-pointer" title="Ver en tamaño completo">
                    @if (urls[e.id]) {
                      <img [src]="urls[e.id]" alt="Evidencia" loading="lazy" decoding="async" class="w-full h-24 object-cover rounded-lg"
                           (error)="usarOriginal(e)">
                    } @else {
                      <div class="w-full h-24 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">Cargando...</div>
                    }
                  </button>
                } @else if (e.kind === 'VIDEO') {
                  @if (urls[e.id]) {
                    <video [src]="urls[e.id]" controls preload="metadata" class="w-full h-24 object-cover rounded-lg bg-black"></video>
                  } @else {
                    <div class="w-full h-24 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] text-white/70">Cargando...</div>
                  }
                } @else {
                  <button type="button" (click)="abrir(e)"
                    class="w-full h-24 rounded-lg bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center gap-1 text-indigo-700 cursor-pointer hover:bg-indigo-100">
                    <i-lucide name="file-text" class="w-7 h-7"></i-lucide>
                    <span class="text-[10px] font-bold">Abrir PDF</span>
                  </button>
                }
                <p class="text-[10px] font-semibold text-slate-700 truncate mt-1" [title]="e.descripcion || ''">{{ e.descripcion || etiquetaKind(e) }}</p>
                <p class="text-[9px] text-slate-400 font-mono truncate">
                  {{ fechaHora(e.creadaEn) }}@if (e.subidoPorNombre) { · {{ e.subidoPorNombre }} }
                  @if (e.kind === 'VIDEO' && e.duracionSeg) { · {{ e.duracionSeg | number:'1.0-0' }} s }
                </p>
              </div>
            }
          </div>
        </div>
      }
    }

    <!-- Foto o PDF a tamaño completo, en un modal sobre la misma página -->
    <app-visor-archivo
      [isOpen]="visor.abierto"
      [titulo]="visor.titulo"
      [tipo]="visor.tipo"
      [url]="visor.url"
      [urlRespaldo]="visor.respaldo"
      [cargando]="visor.cargando"
      [error]="visor.error"
      (cerrar)="visor.abierto = false">
    </app-visor-archivo>
  `,
})
export class EvidenciaGaleriaComponent implements OnChanges {
  private readonly storage = inject(StorageUploadService);

  @Input() evidencias: EvidenciaMaquinaria[] = [];
  /** Separa por etapa (Reporte / Reparación) cuando hay evidencias de ambas. */
  @Input() agruparPorEtapa = false;
  @Input() vacio = 'Sin evidencias adjuntas.';

  urls: Record<string, string> = {};
  grupos: { titulo: string; items: EvidenciaMaquinaria[] }[] = [];

  ngOnChanges(): void {
    this.grupos = this.agruparPorEtapa
      ? [
          { titulo: 'Reporte de la falla', items: this.evidencias.filter(e => e.etapa !== 'REPARACION') },
          { titulo: 'Reparación', items: this.evidencias.filter(e => e.etapa === 'REPARACION') },
        ].filter(g => g.items.length > 0)
      : [{ titulo: '', items: this.evidencias }];

    // Las fotos usan su miniatura (liviana); los videos, su archivo; los PDF solo se resuelven al abrirse.
    for (const e of this.evidencias) {
      if (e.kind === 'DOCUMENTO' || this.urls[e.id]) continue;
      const resolver = e.kind === 'FOTO'
        ? this.storage.resolveVariantUrl(e.url, 'thumbs').then(t => t || this.storage.resolveMediaUrl(e.url))
        : this.storage.resolveMediaUrl(e.url);
      void resolver.then(u => (this.urls = { ...this.urls, [e.id]: u }));
    }
  }

  visor = { abierto: false, titulo: '', tipo: 'imagen' as 'imagen' | 'pdf', url: '', respaldo: '', cargando: false, error: '' };

  /** La miniatura aún no existe: se muestra el original. */
  usarOriginal(e: EvidenciaMaquinaria): void {
    void this.storage.resolveMediaUrl(e.url).then(u => {
      if (u && this.urls[e.id] !== u) this.urls = { ...this.urls, [e.id]: u };
    });
  }

  /** Abre la foto o el PDF en un modal (la URL temporal se resuelve con la sesión). */
  async abrir(e: EvidenciaMaquinaria): Promise<void> {
    this.visor = {
      abierto: true,
      titulo: e.descripcion || this.etiquetaKind(e),
      tipo: e.kind === 'DOCUMENTO' ? 'pdf' : 'imagen',
      url: '',
      respaldo: '',
      cargando: true,
      error: '',
    };
    try {
      // Fotos: primero la vista liviana (1600 px), con el original como respaldo. PDF: el archivo.
      const original = await this.storage.resolveMediaUrl(e.url);
      if (!original) throw new Error('sin url');
      const vista = e.kind === 'FOTO' ? await this.storage.resolveVariantUrl(e.url, 'view') : '';
      this.visor = { ...this.visor, url: vista || original, respaldo: vista ? original : '', cargando: false };
    } catch {
      this.visor = { ...this.visor, cargando: false, error: 'No se pudo cargar el archivo.' };
    }
  }

  etiquetaKind(e: EvidenciaMaquinaria): string {
    return e.kind === 'FOTO' ? 'Foto' : e.kind === 'VIDEO' ? 'Video' : 'Documento PDF';
  }

  fechaHora(iso?: string): string {
    return iso ? fechaHoraLocal(iso) : '';
  }
}

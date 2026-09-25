import { Directive, ElementRef, HostListener, Input, OnChanges, inject } from '@angular/core';
import { StorageUploadService } from '../../core/services/storage-upload.service';

/**
 * Muestra la miniatura liviana de una foto en listados y rejillas (`<img [appThumb]="url">`).
 * Si la miniatura aún no existe (fotos anteriores a esta mejora), carga la foto original.
 */
@Directive({ selector: 'img[appThumb]', standalone: true })
export class ThumbSrcDirective implements OnChanges {
  @Input('appThumb') source?: string | null;

  private readonly storage = inject(StorageUploadService);
  private readonly el = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private usandoOriginal = false;

  ngOnChanges(): void {
    this.usandoOriginal = false;
    // Archivos privados de maquinaria: URL temporal (con JWT). Primero la miniatura de 480 px (unos KB) y,
    // si aún no existe, el original. Antes se descargaba siempre la foto completa en cada tarjeta.
    if (this.storage.esClaveMaquinaria(this.source)) {
      const origen = this.source;
      this.usandoOriginal = false;
      void this.storage.resolveVariantUrl(origen, 'thumbs').then(async thumb => {
        if (origen !== this.source) return;
        if (thumb) {
          this.el.nativeElement.src = thumb;
          return;
        }
        this.usandoOriginal = true;
        const url = await this.storage.resolveMediaUrl(origen);
        if (origen === this.source) this.el.nativeElement.src = url;
      });
      return;
    }
    const original = this.storage.resolveBackendUrl(this.source);
    const thumb = this.storage.getThumbnailUrl(this.source);
    this.el.nativeElement.src = thumb || original;
    if (!thumb) this.usandoOriginal = true;
  }

  @HostListener('error')
  onError(): void {
    if (this.usandoOriginal) return;
    this.usandoOriginal = true;
    if (this.storage.esClaveMaquinaria(this.source)) {
      const origen = this.source;
      void this.storage.resolveMediaUrl(origen).then(url => {
        if (origen === this.source) this.el.nativeElement.src = url;
      });
      return;
    }
    this.el.nativeElement.src = this.storage.resolveBackendUrl(this.source);
  }
}

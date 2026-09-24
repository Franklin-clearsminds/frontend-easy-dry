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
    const original = this.storage.resolveBackendUrl(this.source);
    const thumb = this.storage.getThumbnailUrl(this.source);
    this.el.nativeElement.src = thumb || original;
    if (!thumb) this.usandoOriginal = true;
  }

  @HostListener('error')
  onError(): void {
    if (this.usandoOriginal) return;
    this.usandoOriginal = true;
    this.el.nativeElement.src = this.storage.resolveBackendUrl(this.source);
  }
}

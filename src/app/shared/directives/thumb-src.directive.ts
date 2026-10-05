import { Directive, ElementRef, HostListener, Input, OnChanges, inject } from '@angular/core';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { MediaError, MediaEstado, esReintentable, mensajeEstado, svgCargando, svgEstado } from '../../core/services/media-privada';

/**
 * Muestra la miniatura liviana de una foto en listados y rejillas (`<img [appThumb]="url">`).
 * Los archivos privados (evidencias, inventario, maquinaria) se piden con URL temporal y sesión: primero la miniatura
 * de 480 px y, si aún no existe, el original. Si no hay permiso o red se muestra el motivo (nunca una imagen rota);
 * tocar el aviso de error reintentable vuelve a intentarlo. Avatares y catálogo siguen por /storage/file.
 */
@Directive({ selector: 'img[appThumb]', standalone: true })
export class ThumbSrcDirective implements OnChanges {
  @Input('appThumb') source?: string | null;

  private readonly storage = inject(StorageUploadService);
  private readonly el = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private usandoOriginal = false;
  private estado: MediaEstado | null = null;

  ngOnChanges(): void {
    this.usandoOriginal = false;
    this.estado = null;
    if (this.storage.esPrivada(this.source)) {
      void this.cargarPrivada();
      return;
    }
    const original = this.storage.resolveBackendUrl(this.source);
    const thumb = this.storage.getThumbnailUrl(this.source);
    this.el.nativeElement.src = thumb || original;
    if (!thumb) this.usandoOriginal = true;
  }

  private async cargarPrivada(): Promise<void> {
    const origen = this.source;
    this.estado = null;
    this.el.nativeElement.removeAttribute('title');
    this.el.nativeElement.src = svgCargando();
    try {
      const thumb = await this.storage.resolveVariantUrl(origen, 'thumbs');
      if (origen !== this.source) return;
      if (thumb) {
        this.el.nativeElement.src = thumb;
        return;
      }
      this.usandoOriginal = true;
      const url = await this.storage.resolveMediaUrlStrict(origen);
      if (origen === this.source) this.el.nativeElement.src = url;
    } catch (e) {
      if (origen === this.source) this.mostrarEstado(MediaError.desde(e).estado);
    }
  }

  private mostrarEstado(estado: MediaEstado): void {
    this.estado = estado;
    this.el.nativeElement.src = svgEstado(estado);
    this.el.nativeElement.title = mensajeEstado(estado);
  }

  @HostListener('click', ['$event'])
  onClick(ev: Event): void {
    if (this.estado && esReintentable(this.estado)) {
      ev.stopPropagation();
      this.storage.invalidarCache(this.source);
      this.usandoOriginal = false;
      void this.cargarPrivada();
    }
  }

  @HostListener('error')
  onError(): void {
    if (this.estado) return;
    if (this.usandoOriginal) {
      // El original tampoco cargó (URL temporal vencida o archivo ausente): se explica en vez de dejar la imagen rota.
      if (this.storage.esPrivada(this.source)) this.mostrarEstado('otro');
      return;
    }
    this.usandoOriginal = true;
    const origen = this.source;
    void this.storage.resolveMediaUrlStrict(origen).then(
      url => { if (origen === this.source) this.el.nativeElement.src = url; },
      e => { if (origen === this.source) this.mostrarEstado(MediaError.desde(e).estado); },
    );
  }
}

import { Directive, ElementRef, HostListener, Input, OnChanges, inject } from '@angular/core';
import { StorageUploadService } from '../../core/services/storage-upload.service';

/**
 * Foto de perfil en un `<img>`: `<img [appAvatar]="usuario.avatar" [appAvatarIniciales]="'LP'">`.
 * La foto se guarda como llave del bucket (`usuarios/<id>/perfil/...`), así que se convierte a la dirección del servidor;
 * si no carga, se muestra un círculo con las iniciales en lugar del ícono de imagen rota.
 */
@Directive({
  selector: 'img[appAvatar]',
  standalone: true,
})
export class AvatarSrcDirective implements OnChanges {
  private readonly el = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private readonly storage = inject(StorageUploadService);

  @Input('appAvatar') fuente?: string | null;
  @Input() appAvatarIniciales = '';

  ngOnChanges(): void {
    const valor = String(this.fuente ?? '').trim();
    const resuelta = valor ? this.storage.resolveBackendUrl(valor) : '';
    this.el.nativeElement.src = resuelta || this.placeholder();
  }

  @HostListener('error')
  alFallar(): void {
    const img = this.el.nativeElement;
    const ph = this.placeholder();
    if (img.src !== ph) img.src = ph;
  }

  private placeholder(): string {
    const ini = (this.appAvatarIniciales || '?').slice(0, 2).toUpperCase().replace(/[<>&"']/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#e2e8f0"/><text x="32" y="40" font-family="Arial,sans-serif" font-size="24" font-weight="700" text-anchor="middle" fill="#64748b">${ini}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}

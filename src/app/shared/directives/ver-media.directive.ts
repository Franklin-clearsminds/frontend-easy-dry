import { Directive, HostListener, Input, inject } from '@angular/core';
import { TipoMedia, VisorMediaService } from '../services/visor-media.service';

/**
 * Hace que una miniatura (foto, video o documento) se abra a tamaño completo al hacer clic o con Enter/Espacio:
 * `<img [appThumb]="url" [appVerMedia]="url">`. Las fotos se amplían con zoom, los videos se reproducen y los PDF se leen.
 */
@Directive({
  selector: '[appVerMedia]',
  standalone: true,
  host: {
    role: 'button',
    tabindex: '0',
    class: 'cursor-zoom-in',
    '[attr.aria-label]': 'etiqueta()',
  },
})
export class VerMediaDirective {
  private readonly visor = inject(VisorMediaService);

  /** Dirección del archivo (S3, `/storage/file`, llave o vista previa local). */
  @Input('appVerMedia') fuente?: string | null;
  @Input() appVerMediaTitulo = '';
  @Input() appVerMediaTipo?: TipoMedia;

  etiqueta(): string {
    const tipo = this.appVerMediaTipo ?? this.visor.tipoDe(this.fuente);
    const que = tipo === 'video' ? 'el video' : tipo === 'pdf' ? 'el documento' : 'la foto';
    return `Ver ${que} a tamaño completo${this.appVerMediaTitulo ? `: ${this.appVerMediaTitulo}` : ''}`;
  }

  @HostListener('click', ['$event'])
  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  abrir(ev: Event): void {
    if (!this.fuente) return;
    ev.preventDefault();
    ev.stopPropagation();
    void this.visor.abrir(this.fuente, { titulo: this.appVerMediaTitulo || undefined, tipo: this.appVerMediaTipo });
  }
}

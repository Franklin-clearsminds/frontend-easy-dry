import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

let contador = 0;

/**
 * Puntuación de 0 a 5 en estrellas, con medias estrellas. Sin valor (`null`) las muestra apagadas.
 *
 *   <app-estrellas [valor]="3.5" titulo="Última 5S: 72 %"></app-estrellas>
 */
@Component({
  selector: 'app-estrellas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center gap-0.5 align-middle" role="img" [attr.aria-label]="aria" [attr.title]="titulo || aria">
      @for (i of posiciones; track i) {
        <svg [attr.width]="tamano" [attr.height]="tamano" viewBox="0 0 24 24" aria-hidden="true">
          <defs><clipPath [attr.id]="idBase + '-' + i"><rect x="0" y="0" width="12" height="24"></rect></clipPath></defs>
          <polygon [attr.points]="PUNTOS" [attr.fill]="apagada" stroke="none"></polygon>
          @if (llenado(i) === 1) {
            <polygon [attr.points]="PUNTOS" [attr.fill]="encendida" stroke="none"></polygon>
          } @else if (llenado(i) === 0.5) {
            <polygon [attr.points]="PUNTOS" [attr.fill]="encendida" stroke="none" [attr.clip-path]="'url(#' + idBase + '-' + i + ')'"></polygon>
          }
        </svg>
      }
    </span>
  `,
})
export class EstrellasComponent {
  /** De 0 a 5; acepta medias. `null` o `undefined` = sin puntuación. */
  @Input() valor: number | null | undefined = null;
  /** Lado de cada estrella en píxeles. */
  @Input() tamano = 18;
  /** Texto que aparece al pasar el cursor; por defecto, la puntuación. */
  @Input() titulo = '';

  readonly PUNTOS = '12,1.8 15.1,8.3 22.2,9.3 17.1,14.3 18.3,21.4 12,18 5.7,21.4 6.9,14.3 1.8,9.3 8.9,8.3';
  readonly posiciones = [0, 1, 2, 3, 4];
  readonly apagada = '#E2E8F0';
  readonly encendida = '#F59E0B';
  readonly idBase = `estrella-${++contador}`;

  get aria(): string {
    return typeof this.valor === 'number' ? `${this.redondeado} de 5 estrellas` : 'Sin puntuación';
  }

  private get redondeado(): number {
    return Math.min(5, Math.max(0, Math.round((Number(this.valor) || 0) * 2) / 2));
  }

  /** 1 = llena, 0.5 = media, 0 = vacía. */
  llenado(i: number): number {
    if (typeof this.valor !== 'number') return 0;
    const resto = this.redondeado - i;
    return resto >= 1 ? 1 : resto >= 0.5 ? 0.5 : 0;
  }
}

import { Component, Input } from '@angular/core';
import { BadgeTipo, badgeClase } from '../../../core/utils/badges';

/** Badge de estado con el color unificado: <app-badge tipo="incidente" [valor]="x">texto</app-badge> */
@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span [class]="clase"><ng-content></ng-content></span>`,
})
export class AppBadgeComponent {
  @Input() tipo: BadgeTipo = 'incidente';
  @Input() valor: unknown = '';
  @Input() activa?: boolean;
  @Input() noAtendido?: boolean;

  get clase(): string {
    return badgeClase(this.tipo, this.valor, { activa: this.activa, noAtendido: this.noAtendido });
  }
}

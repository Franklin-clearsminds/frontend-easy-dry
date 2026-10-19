import { Component, inject } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { VisorArchivoComponent } from '../visor-archivo/visor-archivo.component';
import { VisorMediaService } from '../../services/visor-media.service';

/**
 * Ventana del visor de evidencias de todo el sistema (se coloca una sola vez en la raíz). Las fotos y los PDF usan el visor con zoom;
 * los videos, un reproductor. El video se destruye al cerrar para que deje de sonar.
 */
@Component({
  selector: 'app-visor-media-host',
  standalone: true,
  imports: [ModalComponent, VisorArchivoComponent],
  template: `
    @if (visor.estado().tipo === 'video') {
      @if (visor.estado().abierto) {
        <app-modal [isOpen]="true" [title]="visor.estado().titulo" icon="film" sizeClass="max-w-4xl" zClass="z-[10300]" [blur]="false"
          [closeOnBackdrop]="true" (close)="visor.cerrar()">
          @if (visor.estado().cargando) {
            <p class="estado-vacio py-10" role="status" aria-live="polite">Cargando...</p>
          }
          @if (visor.estado().error) {
            <div class="estado-error" role="alert">{{ visor.estado().error }}</div>
          }
          @if (visor.estado().url && !visor.estado().error) {
            <div class="aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <video [src]="visor.estado().url" [attr.aria-label]="visor.estado().titulo" controls autoplay playsinline class="w-full h-full object-contain"></video>
            </div>
          }
          <div modal-footer>
            <button type="button" (click)="visor.cerrar()" class="btn btn-secondary w-full sm:w-auto">Cerrar</button>
          </div>
        </app-modal>
      }
    } @else {
      <app-visor-archivo
        [isOpen]="visor.estado().abierto"
        [titulo]="visor.estado().titulo"
        [tipo]="visor.estado().tipo === 'pdf' ? 'pdf' : 'imagen'"
        [url]="visor.estado().url"
        [urlRespaldo]="visor.estado().respaldo"
        [cargando]="visor.estado().cargando"
        [error]="visor.estado().error"
        (cerrar)="visor.cerrar()">
      </app-visor-archivo>
    }
  `,
})
export class VisorMediaHostComponent {
  readonly visor = inject(VisorMediaService);
}

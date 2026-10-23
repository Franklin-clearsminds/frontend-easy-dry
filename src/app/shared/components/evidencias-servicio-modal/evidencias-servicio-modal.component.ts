import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ModalComponent } from '../modal/modal.component';
import { TipoMedia, VisorMediaService } from '../../services/visor-media.service';

export interface EvidenciaServicioItem {
  tipo: TipoMedia;
  etiqueta: string;
  url: string;
}

/** Campos de multimedia que trae un servicio del servidor (cualquiera puede faltar). */
export interface MultimediaServicio {
  videoUrl?: string | null;
  video?: string | null;
  videoInicialUrl?: string | null;
  videoFinalUrl?: string | null;
  fotoIngresoUrl?: string | null;
  fotoSalidaUrl?: string | null;
  evidencias?: Array<{ tipo?: string | null; url?: string | null; descripcion?: string | null }> | null;
}

const ETIQUETA_TIPO: Record<string, string> = {
  FOTO_INGRESO: 'Foto de ingreso',
  INGRESO: 'Foto de ingreso',
  FOTO_SALIDA: 'Foto de salida',
  SALIDA: 'Foto de salida',
  FOTO_DANO_PREVIO: 'Daño previo',
  DANO_PREVIO: 'Daño previo',
  FOTO_PROCESO: 'Foto del proceso',
  PROCESO: 'Foto del proceso',
  RECEPCION: 'Recepción',
};

/**
 * Todas las evidencias de un servicio, cada una con su nombre: video de ingreso, video de salida, foto de ingreso, foto de salida
 * y las demás fotos registradas. El servidor entrega `videoUrl` como «el final, o el inicial si no hay final», así que solo se usa
 * si no llegaron los dos de verdad.
 */
export function evidenciasDeServicio(s: MultimediaServicio | null | undefined, tipoDe: (url: string) => TipoMedia): EvidenciaServicioItem[] {
  const lista: EvidenciaServicioItem[] = [];
  if (!s) return lista;
  const agregar = (etiqueta: string, url?: string | null) => {
    const limpia = String(url ?? '').trim();
    if (!limpia || lista.some((e) => e.url === limpia)) return;
    const tipo = tipoDe(limpia);
    // El listado rellena «video de ingreso/salida» con la foto cuando no hay video: se nombra por lo que realmente es.
    lista.push({ tipo, etiqueta: tipo === 'imagen' ? etiqueta.replace(/^Video de/, 'Foto de') : etiqueta, url: limpia });
  };
  agregar('Video de ingreso', s.videoInicialUrl);
  agregar('Video de salida', s.videoFinalUrl);
  if (!s.videoInicialUrl && !s.videoFinalUrl) agregar('Video del servicio', s.videoUrl || s.video);
  agregar('Foto de ingreso', s.fotoIngresoUrl);
  agregar('Foto de salida', s.fotoSalidaUrl);
  for (const e of s.evidencias ?? []) {
    const clave = String(e?.tipo ?? '').toUpperCase();
    agregar(ETIQUETA_TIPO[clave] || e?.descripcion || 'Evidencia', e?.url);
  }
  return lista;
}

/** Ventana con la evidencia de un servicio: cada archivo se abre en el visor común (foto con zoom, video con reproductor). */
@Component({
  selector: 'app-evidencias-servicio-modal',
  standalone: true,
  imports: [NgClass, LucideAngularModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal size="md" [isOpen]="isOpen" [title]="'Evidencia del servicio' + (referencia ? ': ' + referencia : '')" icon="film" (close)="close.emit()">
      <div class="space-y-3">
        @for (e of items; track e.url) {
          <button type="button" (click)="abrir(e)"
            class="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-easydry-blue transition-colors cursor-pointer text-left">
            <span class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              [ngClass]="e.tipo === 'video' ? 'bg-slate-900 text-white' : 'bg-easydry-blue/10 text-easydry-blue'">
              <i-lucide aria-hidden="true" [name]="e.tipo === 'video' ? 'play' : e.tipo === 'pdf' ? 'file-text' : 'image'" class="w-5 h-5"></i-lucide>
            </span>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-bold text-slate-900">{{ e.etiqueta }}</span>
              <span class="block text-xs text-slate-500">{{ e.tipo === 'video' ? 'Clic para reproducir' : e.tipo === 'pdf' ? 'Clic para leer' : 'Clic para ver en grande' }}</span>
            </span>
          </button>
        } @empty {
          <p class="estado-vacio">Este servicio no tiene evidencia multimedia registrada.</p>
        }
      </div>
      <div modal-footer>
        <button type="button" (click)="close.emit()" class="btn btn-secondary w-full sm:w-auto">Cerrar</button>
      </div>
    </app-modal>
  `,
})
export class EvidenciasServicioModalComponent {
  private readonly visor = inject(VisorMediaService);

  @Input() isOpen = false;
  /** Placa u OT que se muestra en el título. */
  @Input() referencia = '';
  @Input() items: EvidenciaServicioItem[] = [];
  @Output() close = new EventEmitter<void>();

  abrir(e: EvidenciaServicioItem): void {
    void this.visor.abrir(e.url, { titulo: `${e.etiqueta}${this.referencia ? `: ${this.referencia}` : ''}`, tipo: e.tipo });
  }
}

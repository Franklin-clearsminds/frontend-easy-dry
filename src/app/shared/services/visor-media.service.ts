import { Injectable, inject, signal } from '@angular/core';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { MediaError, mensajeEstado } from '../../core/services/media-privada';

export type TipoMedia = 'imagen' | 'video' | 'pdf';

export interface EstadoVisorMedia {
  abierto: boolean;
  titulo: string;
  tipo: TipoMedia;
  url: string;
  /** Para fotos: el original, por si la vista liviana no carga. */
  respaldo: string;
  cargando: boolean;
  error: string;
}

const EXT_VIDEO = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;
const EXT_PDF = /\.pdf$/i;

/**
 * Visor único de evidencias de todo el sistema: una foto se abre con zoom, un video se reproduce y un PDF se lee, siempre en una
 * ventana sobre la misma página. Resuelve las URL temporales de los archivos privados con la sesión del usuario.
 * Lo pinta `VisorMediaHostComponent` (una sola vez, en la raíz de la aplicación).
 */
@Injectable({ providedIn: 'root' })
export class VisorMediaService {
  private readonly storage = inject(StorageUploadService);
  private peticion = 0;

  readonly estado = signal<EstadoVisorMedia>({ abierto: false, titulo: '', tipo: 'imagen', url: '', respaldo: '', cargando: false, error: '' });

  /** Tipo de archivo por su extensión (se ignora lo que va después de «?»). Lo que no es video ni PDF se trata como foto. */
  tipoDe(fuente?: string | null): TipoMedia {
    const limpia = String(fuente ?? '').split('?')[0].split('#')[0].trim();
    if (EXT_PDF.test(limpia)) return 'pdf';
    if (EXT_VIDEO.test(limpia) || limpia.startsWith('data:video')) return 'video';
    return 'imagen';
  }

  async abrir(fuente: string | null | undefined, opciones: { titulo?: string; tipo?: TipoMedia } = {}): Promise<void> {
    const origen = String(fuente ?? '').trim();
    if (!origen) return;
    const tipo = opciones.tipo ?? this.tipoDe(origen);
    const id = ++this.peticion;
    this.estado.set({
      abierto: true,
      titulo: opciones.titulo || (tipo === 'video' ? 'Video de evidencia' : tipo === 'pdf' ? 'Documento' : 'Foto de evidencia'),
      tipo,
      url: '',
      respaldo: '',
      cargando: true,
      error: '',
    });
    try {
      // Archivos de este mismo dispositivo (vista previa antes de subir): no pasan por el servidor.
      if (/^(blob:|data:)/i.test(origen)) {
        if (id === this.peticion) this.estado.update((e) => ({ ...e, url: origen, cargando: false }));
        return;
      }
      const original = tipo === 'video' ? await this.storage.getDirectStreamingUrl(origen) : await this.storage.resolveMediaUrlStrict(origen);
      if (!original) throw new Error('sin url');
      // Fotos: primero la vista liviana (1600 px) con el original como respaldo.
      const vista = tipo === 'imagen' ? await this.storage.resolveVariantUrl(origen, 'view').catch(() => '') : '';
      if (id !== this.peticion) return;
      this.estado.update((e) => ({ ...e, url: vista || original, respaldo: vista ? original : '', cargando: false }));
    } catch (err) {
      if (id !== this.peticion) return;
      const motivo = err instanceof MediaError && err.estado !== 'otro' ? mensajeEstado(err.estado) : 'No se pudo cargar el archivo.';
      this.estado.update((e) => ({ ...e, cargando: false, error: motivo }));
    }
  }

  cerrar(): void {
    this.peticion++;
    this.estado.update((e) => ({ ...e, abierto: false }));
  }
}

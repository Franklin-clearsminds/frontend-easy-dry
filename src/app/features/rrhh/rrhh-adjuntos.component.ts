import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../shared/services/toast.service';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { AdjuntoTareaApi } from '../../core/services/rrhh.service';
import { ACEPTA_ADJUNTOS, MAX_ADJUNTOS, MAX_ADJUNTO_BYTES, TipoAdjunto, motivoAdjuntoInvalido, tipoAdjuntoDe, tipoEvidenciaDe } from './rrhh.modelos';

/** Un archivo elegido por la persona. Se sube al almacenamiento en cuanto lo elige; `remoto` es la URL con la que el servidor lo reconoce. */
export interface AdjuntoElegido {
  id: string;
  nombre: string;
  tipo: TipoAdjunto;
  tamano: number;
  /** Vista previa local mientras la página siga abierta. */
  previa: string;
  /** URL del archivo ya subido; vacía mientras se sube o si falló. */
  remoto: string;
  subiendo?: boolean;
  error?: string;
}

/**
 * Adjuntos de una tarea. Con `editable`, el selector abre el explorador, sube cada archivo y avisa cuando termina (`ocupadoChange`).
 * Sin `editable`, muestra los archivos guardados en el servidor (`guardados`), que se piden con una URL firmada.
 */
@Component({
  selector: 'app-rrhh-adjuntos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-2">
      @if (editable) {
        <div class="flex flex-wrap items-center gap-2">
          <label class="btn btn-secondary btn-sm cursor-pointer" [class.opacity-60]="elegidos.length >= max">
            <i-lucide name="paperclip" class="w-4 h-4" aria-hidden="true"></i-lucide> Adjuntar archivos
            <input type="file" class="sr-only" multiple [accept]="acepta" [disabled]="elegidos.length >= max" (change)="elegir($event)" [attr.aria-label]="etiqueta">
          </label>
          <span class="text-[11px] text-slate-500">JPG, PNG, WEBP, MP4, MOV o PDF · hasta {{ max }} archivos de {{ maxMb }} MB · {{ elegidos.length }}/{{ max }}</span>
        </div>
        @if (elegidos.length) {
          <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            @for (a of elegidos; track a.id) {
              <li class="rounded-xl border bg-white p-2 space-y-1.5 min-w-0" [ngClass]="a.error ? 'border-rose-300' : 'border-slate-200'">
                @if (a.tipo === 'imagen') {
                  <img [src]="a.previa" [alt]="a.nombre" class="w-full h-24 object-cover rounded-lg bg-slate-100">
                } @else if (a.tipo === 'video') {
                  <video [src]="a.previa" class="w-full h-24 object-cover rounded-lg bg-slate-900" controls preload="metadata"></video>
                } @else {
                  <div class="w-full h-24 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 gap-1">
                    <i-lucide name="file-text" class="w-6 h-6" aria-hidden="true"></i-lucide><span class="text-[10px] font-semibold">Documento</span>
                  </div>
                }
                <p class="text-[11px] font-bold text-slate-800 truncate" [title]="a.nombre">{{ a.nombre }}</p>
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[10px]" [ngClass]="a.error ? 'text-rose-700 font-bold' : 'text-slate-500'">{{ a.error ? a.error : a.subiendo ? 'Subiendo…' : tamano(a.tamano) }}</span>
                  <button type="button" class="text-rose-600 hover:text-rose-800" (click)="quitar(a)" [attr.aria-label]="'Quitar ' + a.nombre"><i-lucide name="trash-2" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide></button>
                </div>
              </li>
            }
          </ul>
        }
      } @else if (guardados.length) {
        <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          @for (a of guardados; track a.id) {
            <li class="rounded-xl border border-slate-200 bg-white p-2 space-y-1.5 min-w-0">
              @if (a.tipo === 'IMAGEN' && urls[a.key]) {
                <a [href]="urls[a.key]" target="_blank" rel="noopener"><img [src]="urls[a.key]" [alt]="a.nombre" class="w-full h-24 object-cover rounded-lg bg-slate-100"></a>
              } @else if (a.tipo === 'VIDEO' && urls[a.key]) {
                <video [src]="urls[a.key]" class="w-full h-24 object-cover rounded-lg bg-slate-900" controls preload="metadata"></video>
              } @else {
                <div class="w-full h-24 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 gap-1">
                  <i-lucide [name]="a.tipo === 'VIDEO' ? 'video' : a.tipo === 'IMAGEN' ? 'image' : 'file-text'" class="w-6 h-6" aria-hidden="true"></i-lucide>
                  <span class="text-[10px] font-semibold">{{ fallos[a.key] ? 'No se pudo cargar' : a.tipo === 'DOCUMENTO' ? 'Documento' : 'Cargando…' }}</span>
                </div>
              }
              <p class="text-[11px] font-bold text-slate-800 truncate" [title]="a.nombre">{{ a.nombre }}</p>
              <div class="flex items-center justify-between gap-1">
                <span class="text-[10px] text-slate-500">{{ tamano(a.tamanioBytes) }}</span>
                @if (urls[a.key] && a.tipo === 'DOCUMENTO') {
                  <a [href]="urls[a.key]" target="_blank" rel="noopener" class="text-[10px] font-bold text-easydry-blue hover:underline">Abrir</a>
                }
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="text-xs text-slate-500">Sin archivos adjuntos.</p>
      }
    </div>
  `,
})
export class RrhhAdjuntosComponent implements OnChanges {
  private readonly toast = inject(ToastService);
  private readonly almacenamiento = inject(StorageUploadService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Lo que ya eligió la persona (modo editable). */
  @Input() elegidos: AdjuntoElegido[] = [];
  /** Archivos guardados en el servidor (modo solo lectura). */
  @Input() guardados: AdjuntoTareaApi[] = [];
  @Input() editable = true;
  @Input() etiqueta = 'Adjuntar archivos';
  @Output() elegidosChange = new EventEmitter<AdjuntoElegido[]>();
  /** true mientras algún archivo se está subiendo: quien usa el componente no debe enviar el formulario. */
  @Output() ocupadoChange = new EventEmitter<boolean>();

  readonly max = MAX_ADJUNTOS;
  readonly maxMb = MAX_ADJUNTO_BYTES / 1024 / 1024;
  readonly acepta = ACEPTA_ADJUNTOS;
  urls: Record<string, string> = {};
  fallos: Record<string, boolean> = {};

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['guardados'] && !this.editable) void this.resolverGuardados();
  }

  private async resolverGuardados(): Promise<void> {
    for (const a of this.guardados) {
      if (this.urls[a.key] || this.fallos[a.key]) continue;
      const url = await this.almacenamiento.resolveMediaUrl(a.key);
      if (url) this.urls[a.key] = url;
      else this.fallos[a.key] = true;
      this.cdr.markForCheck();
    }
  }

  async elegir(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []);
    input.value = '';
    for (const archivo of archivos) {
      const motivo = motivoAdjuntoInvalido(archivo, this.elegidos.length);
      if (motivo) {
        this.toast.warning('No se agregó el archivo', `${archivo.name}: ${motivo}`);
        continue;
      }
      const nuevo: AdjuntoElegido = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nombre: archivo.name,
        tipo: tipoAdjuntoDe(archivo.type),
        tamano: archivo.size,
        previa: URL.createObjectURL(archivo),
        remoto: '',
        subiendo: true,
      };
      this.cambiar([...this.elegidos, nuevo]);
      void this.subir(nuevo, archivo);
    }
  }

  private async subir(adjunto: AdjuntoElegido, archivo: File): Promise<void> {
    try {
      adjunto.remoto = await this.almacenamiento.uploadMedia(archivo, {
        category: 'RRHH',
        type: tipoEvidenciaDe(archivo.type),
        fileName: archivo.name,
        contentType: archivo.type,
      });
    } catch (e) {
      adjunto.error = 'No se pudo subir';
      this.toast.error('No se pudo subir el archivo', `${archivo.name}: ${e instanceof Error ? e.message : 'inténtalo de nuevo.'}`);
    } finally {
      adjunto.subiendo = false;
      this.cambiar([...this.elegidos]);
    }
  }

  quitar(a: AdjuntoElegido): void {
    this.cambiar(this.elegidos.filter((x) => x.id !== a.id));
  }

  private cambiar(lista: AdjuntoElegido[]): void {
    this.elegidos = lista;
    this.elegidosChange.emit(lista);
    this.ocupadoChange.emit(lista.some((x) => x.subiendo));
  }

  tamano(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}

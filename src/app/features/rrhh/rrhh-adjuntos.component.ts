import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../shared/services/toast.service';
import { AdjuntoMock, MAX_ADJUNTOS, MAX_ADJUNTO_BYTES, motivoAdjuntoInvalido, tipoAdjuntoDe } from './rrhh.modelos';

/**
 * Adjuntos del prototipo de RRHH. El selector abre el explorador real y previsualiza el archivo (imagen, video o documento) mientras la
 * página siga abierta; nada se sube a ningún servidor. Con `editable = false` solo muestra la lista.
 */
@Component({
  selector: 'app-rrhh-adjuntos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-2">
      @if (editable) {
        <div class="flex flex-wrap items-center gap-2">
          <label class="btn btn-secondary btn-sm cursor-pointer" [class.opacity-60]="adjuntos.length >= max">
            <i-lucide name="paperclip" class="w-4 h-4" aria-hidden="true"></i-lucide> Adjuntar archivos
            <input type="file" class="sr-only" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" [disabled]="adjuntos.length >= max" (change)="elegir($event)" [attr.aria-label]="etiqueta">
          </label>
          <span class="text-[11px] text-slate-500">Imágenes, videos o documentos · hasta {{ max }} archivos de {{ maxMb }} MB · {{ adjuntos.length }}/{{ max }}</span>
        </div>
      }
      @if (adjuntos.length) {
        <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          @for (a of adjuntos; track a.id) {
            <li class="rounded-xl border border-slate-200 bg-white p-2 space-y-1.5 min-w-0">
              @if (a.tipo === 'imagen' && a.url) {
                <img [src]="a.url" [alt]="a.nombre" class="w-full h-24 object-cover rounded-lg bg-slate-100">
              } @else if (a.tipo === 'video' && a.url) {
                <video [src]="a.url" class="w-full h-24 object-cover rounded-lg bg-slate-900" controls preload="metadata"></video>
              } @else {
                <div class="w-full h-24 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 gap-1">
                  <i-lucide [name]="a.tipo === 'video' ? 'video' : a.tipo === 'imagen' ? 'image' : 'file-text'" class="w-6 h-6" aria-hidden="true"></i-lucide>
                  <span class="text-[10px] font-semibold">{{ a.url ? 'Documento' : 'Sin vista previa' }}</span>
                </div>
              }
              <p class="text-[11px] font-bold text-slate-800 truncate" [title]="a.nombre">{{ a.nombre }}</p>
              <div class="flex items-center justify-between gap-1">
                <span class="text-[10px] text-slate-500">{{ tamano(a.tamano) }}</span>
                @if (editable) {
                  <button type="button" class="text-rose-600 hover:text-rose-800" (click)="quitar(a)" [attr.aria-label]="'Quitar ' + a.nombre"><i-lucide name="trash-2" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide></button>
                } @else if (a.url && a.tipo === 'documento') {
                  <a [href]="a.url" [download]="a.nombre" class="text-[10px] font-bold text-easydry-blue hover:underline">Descargar</a>
                }
              </div>
            </li>
          }
        </ul>
      } @else if (!editable) {
        <p class="text-xs text-slate-500">Sin archivos adjuntos.</p>
      }
    </div>
  `,
})
export class RrhhAdjuntosComponent {
  @Input() adjuntos: AdjuntoMock[] = [];
  @Input() editable = true;
  @Input() etiqueta = 'Adjuntar archivos';
  @Output() adjuntosChange = new EventEmitter<AdjuntoMock[]>();

  readonly max = MAX_ADJUNTOS;
  readonly maxMb = MAX_ADJUNTO_BYTES / 1024 / 1024;

  constructor(private readonly toast: ToastService) {}

  elegir(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const nuevos: AdjuntoMock[] = [];
    for (const archivo of Array.from(input.files ?? [])) {
      const motivo = motivoAdjuntoInvalido(archivo, this.adjuntos.length + nuevos.length);
      if (motivo) {
        this.toast.warning('No se agregó el archivo', `${archivo.name}: ${motivo}`);
        continue;
      }
      const url = URL.createObjectURL(archivo);
      nuevos.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, nombre: archivo.name, tipo: tipoAdjuntoDe(archivo.type), url, tamano: archivo.size });
    }
    input.value = '';
    if (nuevos.length) this.adjuntosChange.emit([...this.adjuntos, ...nuevos]);
  }

  quitar(a: AdjuntoMock): void {
    this.adjuntosChange.emit(this.adjuntos.filter((x) => x.id !== a.id));
  }

  tamano(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}

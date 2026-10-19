import { Component, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { apiUrl } from '../../core/config/env';
import { EvidenciasEnvioComponent } from './evidencias-envio.component';
import { VisorEvidenciasComponent } from './visor-evidencias.component';

export type ResolucionFaltante = 'ENTREGADO' | 'DEVOLVER' | 'BAJA';

const TEXTO_RESOLUCION: Record<ResolucionFaltante, string> = {
  ENTREGADO: 'Llegó al destino',
  DEVOLVER: 'Devuelto al stock',
  BAJA: 'Dado de baja',
};

/**
 * Lo que no llegó en un envío rechazado o recibido incompleto. Desde la tabla de envíos, quien tiene «Resolver faltantes de envíos»
 * decide qué pasa con cada producto retenido: sumarlo al destino si en realidad llegó, devolverlo al stock de origen si nunca salió,
 * o darlo de baja si se dañó o se perdió. Cada decisión queda en el kardex con su observación y sus fotos.
 */
@Component({
  selector: 'app-resolver-envio',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, EvidenciasEnvioComponent, VisorEvidenciasComponent],
  template: `
    <app-modal [isOpen]="!!envio" [title]="'Resolver envío ' + (envio?.codigoEnvio || '')" icon="package-x" size="lg" zClass="z-[10100]" (close)="cerrar()">
      @if (envio) {
        <div class="space-y-4">
          <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 space-y-1">
            <p class="font-extrabold uppercase tracking-wide">{{ envio.estado === 'RECHAZADO' ? 'Envío rechazado' : 'Recibido con desconformidad' }}</p>
            <p>Destino: <strong>{{ envio.sucursalNombre }}</strong> · Recibe: <strong>{{ envio.responsableRecepcion || '—' }}</strong></p>
            @if (envio.motivoRechazo || envio.observaciones) {
              <p class="break-words"><b>Razón:</b> {{ envio.motivoRechazo || envio.observaciones }}</p>
            }
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-left text-slate-500 uppercase tracking-wide">
                  <th class="py-1.5 pr-2">Insumo</th>
                  <th class="py-1.5 px-2 text-right">Enviado</th>
                  <th class="py-1.5 px-2 text-right">Recibido</th>
                  <th class="py-1.5 pl-2 text-right">Sin recibir</th>
                </tr>
              </thead>
              <tbody>
                @for (p of envio.productos; track p.id) {
                  <tr class="border-t border-slate-100">
                    <td class="py-1.5 pr-2 font-bold text-slate-900 break-words">{{ p.nombreProducto }}</td>
                    <td class="py-1.5 px-2 text-right font-mono">{{ p.cantidad }}</td>
                    <td class="py-1.5 px-2 text-right font-mono">{{ recibidaDe(p) }}</td>
                    <td class="py-1.5 pl-2 text-right font-mono font-extrabold" [ngClass]="p.cantidad - recibidaDe(p) > 0 ? 'text-rose-700' : 'text-slate-400'">{{ p.cantidad - recibidaDe(p) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (evidenciasEnvio.length) {
            <div class="space-y-1">
              <span class="block text-xs font-bold text-slate-700">Evidencias de la recepción</span>
              <app-visor-evidencias [urls]="evidenciasEnvio" />
            </div>
          }

          <div class="space-y-2">
            <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Qué pasó con lo que no llegó</h4>
            @for (f of envio.faltantes; track f.id) {
              <div class="border rounded-xl p-3 space-y-2" [ngClass]="f.estado === 'PENDIENTE' ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-white'">
                <p class="text-xs font-bold text-slate-900 break-words">{{ nombreInsumo(f.insumoId) }} · <span class="text-rose-700">{{ f.cantidadUnd }} und sin recibir</span></p>
                @if (f.motivoRecepcion) { <p class="text-xs text-slate-500 break-words">{{ f.motivoRecepcion }}</p> }
                @if (f.estado === 'PENDIENTE') {
                  @if (puedeResolver) {
                    <p class="text-xs text-slate-600">Este producto sigue retenido: ya salió del origen y todavía no está en el destino.</p>
                    <div class="flex flex-wrap gap-2">
                      @for (r of opciones; track r) {
                        <button type="button" (click)="elegir(f.id, r)"
                          class="px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors"
                          [ngClass]="seleccion?.id === f.id && seleccion?.resolucion === r ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-700 border-slate-300 hover:border-easydry-blue'">
                          {{ textoAccion(r) }}
                        </button>
                      }
                    </div>
                  } @else {
                    <p class="text-xs font-bold text-amber-800">Pendiente de resolver por la bodega de origen.</p>
                  }
                } @else {
                  <p>
                    <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold" [ngClass]="f.resolucion === 'BAJA' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'">{{ textoResolucion(f.resolucion) }}</span>
                    <span class="text-xs text-slate-500"> · {{ f.resueltoEn | date:'yyyy-MM-dd HH:mm' }} · por {{ f.resueltoPorNombre || '—' }}</span>
                  </p>
                  @if (f.observacionResolucion) { <p class="text-xs text-slate-700 break-words">Decisión: {{ f.observacionResolucion }}</p> }
                  @if (evidenciasDe(f.id).length) { <app-visor-evidencias [urls]="evidenciasDe(f.id)" /> }
                }
              </div>
            }
          </div>

          @if (seleccion) {
            <div class="border-t border-slate-200 pt-3 space-y-3">
              <p class="text-xs text-slate-600">{{ descripcionAccion }}</p>
              <div>
                <label for="res-obs" class="field-label">{{ preguntaObservacion }}</label>
                <textarea id="res-obs" [(ngModel)]="observacion" name="res-obs" rows="3" class="field" placeholder="Mínimo 10 caracteres"></textarea>
              </div>
              <app-evidencias-envio #evidenciasResolucion />
            </div>
          }
        </div>
      }
      <div modal-footer>
        <button type="button" class="btn btn-secondary w-full sm:w-auto" (click)="cerrar()">Cerrar</button>
        @if (seleccion) {
          <button type="button" class="btn btn-primary w-full sm:w-auto" [disabled]="enviando || observacion.trim().length < 10" (click)="confirmar()">
            {{ enviando ? 'Guardando...' : 'Confirmar: ' + textoAccion(seleccion.resolucion) }}
          </button>
        }
      </div>
    </app-modal>
  `,
})
export class ResolverEnvioComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  /** Fila de la tabla de envíos (con detalles, faltantes y evidencias del servidor). */
  @Input() envio: any = null;
  @Output() closed = new EventEmitter<void>();
  @Output() resuelto = new EventEmitter<void>();
  @ViewChild('evidenciasResolucion') evidenciasResolucion?: EvidenciasEnvioComponent;

  readonly opciones: ResolucionFaltante[] = ['ENTREGADO', 'DEVOLVER', 'BAJA'];
  seleccion: { id: string; resolucion: ResolucionFaltante } | null = null;
  observacion = '';
  enviando = false;

  get puedeResolver(): boolean { return this.auth.puede('envios.faltantes'); }

  get evidenciasEnvio(): string[] {
    return (this.envio?.evidencias || []).filter((e: any) => !e.faltanteId).map((e: any) => e.url);
  }

  evidenciasDe(faltanteId: string): string[] {
    return (this.envio?.evidencias || []).filter((e: any) => e.faltanteId === faltanteId).map((e: any) => e.url);
  }

  recibidaDe(p: any): number {
    const det = (this.envio?.detalles || []).find((d: any) => String(d.id) === String(p.detalleId ?? p.id));
    const r = det?.cantidadRecibida;
    return r === null || r === undefined ? Number(p.cantidad) : Number(r);
  }

  nombreInsumo(insumoId: string): string {
    return (this.envio?.productos || []).find((p: any) => String(p.productoId) === String(insumoId))?.nombreProducto || 'Insumo';
  }

  textoAccion(r: ResolucionFaltante): string {
    return r === 'ENTREGADO' ? 'Sí llegó al destino' : r === 'DEVOLVER' ? 'Devolver al stock' : 'Dar de baja';
  }

  textoResolucion(r?: string | null): string {
    return TEXTO_RESOLUCION[r as ResolucionFaltante] || 'Resuelto';
  }

  get descripcionAccion(): string {
    switch (this.seleccion?.resolucion) {
      case 'ENTREGADO': return 'Se confirma que sí llegó: las unidades se suman al stock del destino y se corrige lo recibido de la guía.';
      case 'DEVOLVER': return 'Nunca salió de la bodega: las unidades vuelven al stock del origen.';
      default: return 'No vuelven al stock: queda registrado como merma en el kardex.';
    }
  }

  get preguntaObservacion(): string {
    switch (this.seleccion?.resolucion) {
      case 'ENTREGADO': return '¿Cómo se confirmó que llegó?';
      case 'DEVOLVER': return '¿Por qué regresa al stock?';
      default: return '¿Qué le pasó al producto?';
    }
  }

  elegir(id: string, resolucion: ResolucionFaltante): void {
    this.evidenciasResolucion?.limpiar();
    this.seleccion = { id, resolucion };
    this.observacion = '';
  }

  cerrar(): void {
    this.seleccion = null;
    this.observacion = '';
    this.closed.emit();
  }

  async confirmar(): Promise<void> {
    if (!this.envio || !this.seleccion || this.enviando) return;
    this.enviando = true;
    try {
      const evidencias = this.evidenciasResolucion?.cantidad
        ? await this.evidenciasResolucion.subir(this.envio.codigoEnvio, 'resolucion')
        : [];
      await firstValueFrom(this.http.post(apiUrl('/inventario/despachos/faltantes/resolver'), {
        id: this.seleccion.id, resolucion: this.seleccion.resolucion, observacion: this.observacion.trim(),
        evidencias: evidencias.length ? evidencias : undefined,
      }));
      this.toast.success(this.textoResolucion(this.seleccion.resolucion), 'El faltante quedó resuelto.');
      this.seleccion = null;
      this.observacion = '';
      this.resuelto.emit();
    } catch (err: any) {
      this.toast.error('No se pudo resolver', err?.error?.message || err?.message || 'Intenta de nuevo.');
    } finally {
      this.enviando = false;
    }
  }
}

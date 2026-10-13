import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { apiUrl } from '../../core/config/env';
import { EvidenciasEnvioComponent } from './evidencias-envio.component';

interface FaltanteEnvio {
  id: string;
  numeroGuia: string;
  insumoNombre: string;
  insumoSku: string;
  cantidadUnd: number;
  motivoRecepcion: string | null;
  origenNombre: string | null;
  createdAt: string;
  resolucion?: 'DEVOLVER' | 'BAJA' | null;
  observacionResolucion?: string | null;
  resueltoEn?: string | null;
  resueltoPorNombre?: string | null;
  evidenciasRecepcion?: string[];
  evidenciasResolucion?: string[];
}

/**
 * Lo que no llegó en un envío recibido de forma parcial. La bodega de origen decide: devolverlo al stock (estaba sano, se perdió el
 * conteo) o darlo de baja (llegó dañado o se perdió). Mientras tanto el producto sigue retenido: no está en el origen ni en el destino.
 */
@Component({
  selector: 'app-faltantes-envio',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, EvidenciasEnvioComponent],
  template: `
    @if (puedeResolver && faltantes.length > 0) {
      <div class="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm space-y-3 animate-fade-in">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <i-lucide aria-hidden="true" name="package-x" class="w-5 h-5"></i-lucide>
          </div>
          <div>
            <h3 class="text-sm font-extrabold text-amber-950 uppercase tracking-wide">Envíos rechazados o incompletos por resolver ({{ faltantes.length }})</h3>
            <p class="text-xs text-amber-900">Este producto no se recibió (envío rechazado o incompleto) y sigue retenido. Decide si regresa al stock de la bodega o se da de baja (dañado o perdido).</p>
          </div>
        </div>
        <div class="space-y-2">
          @for (f of faltantes; track f.id) {
            <div class="bg-white border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-900 break-words">{{ f.insumoNombre }} <span class="font-mono text-slate-500">· {{ f.insumoSku }}</span></p>
                <p class="text-xs text-slate-600">Guía <strong>{{ f.numeroGuia }}</strong> · sin recibir <strong>{{ f.cantidadUnd }}</strong> und · origen {{ f.origenNombre || '—' }}</p>
                @if (f.motivoRecepcion) { <p class="text-xs text-slate-500 break-words">{{ f.motivoRecepcion.startsWith('Rechazado') ? '' : 'Al recibir: ' }}{{ f.motivoRecepcion }}</p> }
                @if (f.evidenciasRecepcion?.length) {
                  <div class="flex gap-1 mt-1">
                    @for (u of f.evidenciasRecepcion; track u) {
                      <img [src]="u" alt="Evidencia del envío" loading="lazy" class="w-14 h-14 object-cover rounded-lg border border-slate-200">
                    }
                  </div>
                }
              </div>
              <div class="flex gap-2 shrink-0">
                <button type="button" class="btn btn-secondary" (click)="abrir(f, 'DEVOLVER')">Devolver al stock</button>
                <button type="button" class="btn btn-primary" (click)="abrir(f, 'BAJA')">Dar de baja</button>
              </div>
            </div>
          }
        </div>
      </div>
    }

    @if (puedeResolver) {
      <div class="flex justify-end">
        <button type="button" class="btn btn-secondary btn-sm" (click)="alternarHistorial()">
          {{ verHistorial ? 'Ocultar historial' : 'Ver historial de resueltos' }}
        </button>
      </div>
      @if (verHistorial) {
        <div class="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
          <h3 class="text-sm font-extrabold text-slate-900">Historial de envíos rechazados o incompletos resueltos</h3>
          @if (historial.length === 0) {
            <p class="text-xs text-slate-500">Todavía no hay faltantes resueltos.</p>
          }
          @for (h of historial; track h.id) {
            <div class="border border-slate-100 rounded-xl p-3 text-xs space-y-1">
              <p class="font-bold text-slate-900 break-words">{{ h.insumoNombre }} <span class="font-mono text-slate-500">· {{ h.insumoSku }}</span></p>
              <p class="text-slate-600">
                Guía <strong>{{ h.numeroGuia }}</strong> · {{ h.cantidadUnd }} und · origen {{ h.origenNombre || '—' }}
              </p>
              <p>
                <span class="inline-flex px-2 py-0.5 rounded-full font-extrabold"
                  [ngClass]="h.resolucion === 'DEVOLVER' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">
                  {{ h.resolucion === 'DEVOLVER' ? 'Devuelto al stock' : 'Dado de baja' }}
                </span>
                <span class="text-slate-500"> · {{ h.resueltoEn | date:'yyyy-MM-dd HH:mm' }} · por {{ h.resueltoPorNombre || '—' }}</span>
              </p>
              @if (h.motivoRecepcion) { <p class="text-slate-500 break-words">Al recibir: {{ h.motivoRecepcion }}</p> }
              @if (h.observacionResolucion) { <p class="text-slate-700 break-words">Decisión: {{ h.observacionResolucion }}</p> }
              @if (h.evidenciasRecepcion?.length || h.evidenciasResolucion?.length) {
                <div class="flex flex-wrap gap-2">
                  @for (u of h.evidenciasRecepcion || []; track u) { <img [src]="u" alt="Evidencia del envío" loading="lazy" class="w-14 h-14 object-cover rounded-lg border border-slate-200"> }
                  @for (u of h.evidenciasResolucion || []; track u) { <img [src]="u" alt="Evidencia del envío" loading="lazy" class="w-14 h-14 object-cover rounded-lg border border-slate-200"> }
                </div>
              }
            </div>
          }
        </div>
      }
    }

    <app-modal [isOpen]="!!resolviendo" [title]="resolucion === 'DEVOLVER' ? 'Devolver al stock' : 'Dar de baja'" icon="package-x" size="md" zClass="z-[10100]" (close)="cerrar()">
      @if (resolviendo) {
        <div class="space-y-3">
          <p class="text-xs text-slate-600">
            {{ resolviendo.cantidadUnd }} und de <strong>{{ resolviendo.insumoNombre }}</strong> (guía {{ resolviendo.numeroGuia }}).
            {{ resolucion === 'DEVOLVER' ? 'Se suman de nuevo al stock del origen.' : 'No vuelven al stock: queda registrado como merma en el kardex.' }}
          </p>
          <div>
            <label for="falt-obs" class="field-label">{{ resolucion === 'DEVOLVER' ? '¿Por qué regresa al stock?' : '¿Qué le pasó al producto?' }}</label>
            <textarea id="falt-obs" [(ngModel)]="observacion" name="falt-obs" rows="3" class="field" placeholder="Mínimo 10 caracteres"></textarea>
          </div>
          <app-evidencias-envio #evidenciasResolucion />
        </div>
      }
      <div modal-footer>
        <button type="button" class="btn btn-secondary w-full sm:w-auto" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn btn-primary w-full sm:w-auto" [disabled]="enviando || observacion.trim().length < 10" (click)="confirmar()">
          {{ enviando ? 'Guardando...' : 'Confirmar' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class FaltantesEnvioComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  faltantes: FaltanteEnvio[] = [];
  resolviendo: FaltanteEnvio | null = null;
  resolucion: 'DEVOLVER' | 'BAJA' = 'DEVOLVER';
  observacion = '';
  enviando = false;
  verHistorial = false;
  historial: FaltanteEnvio[] = [];
  @ViewChild('evidenciasResolucion') evidenciasResolucion?: EvidenciasEnvioComponent;

  get puedeResolver(): boolean { return this.auth.puede('envios.faltantes'); }

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    if (!this.puedeResolver) return;
    this.http.post<FaltanteEnvio[]>(apiUrl('/inventario/despachos/faltantes/list'), {}).subscribe({
      next: (lista) => (this.faltantes = lista || []),
      error: () => (this.faltantes = []),
    });
  }

  alternarHistorial(): void {
    this.verHistorial = !this.verHistorial;
    if (this.verHistorial) this.cargarHistorial();
  }

  private cargarHistorial(): void {
    this.http.post<FaltanteEnvio[]>(apiUrl('/inventario/despachos/faltantes/list'), { estado: 'RESUELTO' }).subscribe({
      next: (lista) => (this.historial = lista || []),
      error: () => (this.historial = []),
    });
  }

  abrir(f: FaltanteEnvio, resolucion: 'DEVOLVER' | 'BAJA'): void {
    this.evidenciasResolucion?.limpiar();
    this.resolviendo = f;
    this.resolucion = resolucion;
    this.observacion = '';
  }

  cerrar(): void {
    this.resolviendo = null;
  }

  async confirmar(): Promise<void> {
    if (!this.resolviendo || this.enviando) return;
    this.enviando = true;
    try {
      const evidencias = this.evidenciasResolucion?.cantidad
        ? await this.evidenciasResolucion.subir(this.resolviendo.numeroGuia, 'resolucion')
        : [];
      await firstValueFrom(this.http.post(apiUrl('/inventario/despachos/faltantes/resolver'), {
        id: this.resolviendo.id, resolucion: this.resolucion, observacion: this.observacion.trim(),
        evidencias: evidencias.length ? evidencias : undefined,
      }));
      this.toast.success(this.resolucion === 'DEVOLVER' ? 'Devuelto al stock' : 'Dado de baja', 'El faltante quedó resuelto.');
      this.cerrar();
      this.cargar();
      if (this.verHistorial) this.cargarHistorial();
    } catch (err: any) {
      this.toast.error('No se pudo resolver', err?.error?.message || err?.message || 'Intenta de nuevo.');
    } finally {
      this.enviando = false;
    }
  }
}

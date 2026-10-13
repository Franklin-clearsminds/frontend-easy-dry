import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { apiUrl } from '../../core/config/env';

interface FaltanteEnvio {
  id: string;
  numeroGuia: string;
  insumoNombre: string;
  insumoSku: string;
  cantidadUnd: number;
  motivoRecepcion: string | null;
  origenNombre: string | null;
  createdAt: string;
}

/**
 * Lo que no llegó en un envío recibido de forma parcial. La bodega de origen decide: devolverlo al stock (estaba sano, se perdió el
 * conteo) o darlo de baja (llegó dañado o se perdió). Mientras tanto el producto sigue retenido: no está en el origen ni en el destino.
 */
@Component({
  selector: 'app-faltantes-envio',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent],
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

  abrir(f: FaltanteEnvio, resolucion: 'DEVOLVER' | 'BAJA'): void {
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
      await firstValueFrom(this.http.post(apiUrl('/inventario/despachos/faltantes/resolver'), {
        id: this.resolviendo.id, resolucion: this.resolucion, observacion: this.observacion.trim(),
      }));
      this.toast.success(this.resolucion === 'DEVOLVER' ? 'Devuelto al stock' : 'Dado de baja', 'El faltante quedó resuelto.');
      this.cerrar();
      this.cargar();
    } catch (err: any) {
      this.toast.error('No se pudo resolver', err?.error?.message || 'Intenta de nuevo.');
    } finally {
      this.enviando = false;
    }
  }
}

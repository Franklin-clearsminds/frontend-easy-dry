import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ChecklistOrden, ChecklistService, PasoChecklistOrden } from '../../../core/services/checklist.service';
import { fechaHoraLocal } from '../../../core/utils/evidencia-maquinaria';

/** Estado resumido que el host usa para habilitar el botón de cerrar. */
export interface EstadoChecklist {
  cargado: boolean;
  requerido: boolean;
  obligatoriosPendientes: number;
}

/**
 * Checklist de una orden de mantenimiento. Con `editable` el técnico marca/desmarca y anota una observación
 * (cada cambio se guarda al instante); sin él es solo lectura. Si la orden no requiere checklist no muestra nada.
 */
@Component({
  selector: 'app-checklist-orden',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    @if (cargando) {
      <p class="text-xs text-slate-500 font-semibold" role="status" aria-live="polite">Cargando checklist...</p>
    } @else if (errorCarga) {
      <div class="flex flex-wrap items-center gap-2" role="alert">
        <div class="estado-error">{{ errorCarga }}</div>
        <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (datos?.requerido) {
      <section class="rounded-2xl border border-slate-200 bg-white p-4 space-y-3" aria-label="Checklist de mantenimiento">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="font-bold text-slate-900 text-xs uppercase">Checklist</h4>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full"
            [ngClass]="datos!.obligatoriosPendientes === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
            role="status">
            {{ obligatoriosHechos }} de {{ totalObligatorios }} obligatorios
          </span>
        </div>
        @if (!editable) {
          <p class="text-[11px] text-slate-500">Solo lectura{{ soloLecturaMotivo ? ': ' + soloLecturaMotivo : '' }}.</p>
        }
        @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }

        <ul class="space-y-2">
          @for (p of datos!.pasos; track p.id) {
            <li class="rounded-xl border p-3 space-y-1.5" [ngClass]="p.completado ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'">
              <label class="flex items-start gap-2.5" [ngClass]="editable ? 'cursor-pointer' : ''">
                <input type="checkbox" class="mt-0.5 w-4 h-4 shrink-0" [checked]="p.completado"
                  [disabled]="!editable || guardando.has(p.id)" (change)="alternar(p, $any($event.target).checked)">
                <span class="text-sm text-slate-800 break-words min-w-0">
                  {{ p.texto }}
                  @if (p.obligatorio) { <span class="ml-1 text-[10px] font-bold uppercase text-rose-700">Obligatorio</span> }
                  @else { <span class="ml-1 text-[10px] font-bold uppercase text-slate-400">Opcional</span> }
                </span>
                @if (guardando.has(p.id)) { <span class="text-[11px] text-slate-500 ml-auto shrink-0">Guardando...</span> }
              </label>
              @if (editable) {
                <input type="text" class="field text-xs" maxlength="500" placeholder="Observación (opcional)"
                  [attr.aria-label]="'Observación del paso: ' + p.texto"
                  [(ngModel)]="p.observacion" [name]="'obs-' + p.id" [disabled]="guardando.has(p.id)"
                  (blur)="guardarObservacion(p)">
              } @else if (p.observacion) {
                <p class="text-xs text-slate-600 break-words">Observación: {{ p.observacion }}</p>
              }
              @if (p.completado && p.marcadoEn) {
                <p class="text-[11px] text-slate-500">Marcado por {{ p.marcadoPorNombre || '—' }} · {{ hora(p.marcadoEn) }}</p>
              }
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class ChecklistOrdenComponent implements OnChanges {
  private svc = inject(ChecklistService);

  @Input({ required: true }) mantenimientoId = '';
  @Input() editable = false;
  /** Texto corto que explica por qué está en solo lectura (opcional). */
  @Input() soloLecturaMotivo = '';
  @Output() estado = new EventEmitter<EstadoChecklist>();

  datos: ChecklistOrden | null = null;
  cargando = false;
  errorCarga = '';
  error = '';
  guardando = new Set<string>();
  // Última observación guardada por paso, para no reenviar si no cambió.
  private obsGuardada = new Map<string, string>();

  ngOnChanges(c: SimpleChanges): void {
    if (c['mantenimientoId'] && this.mantenimientoId) this.cargar();
  }

  get totalObligatorios(): number { return (this.datos?.pasos || []).filter(p => p.obligatorio).length; }
  get obligatoriosHechos(): number { return this.totalObligatorios - (this.datos?.obligatoriosPendientes ?? 0); }

  hora(iso?: string | null): string { return fechaHoraLocal(iso); }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.errorCarga = '';
    this.error = '';
    this.emitir(false);
    try {
      this.datos = await firstValueFrom(this.svc.obtener(this.mantenimientoId));
      this.obsGuardada = new Map((this.datos.pasos || []).map(p => [p.id, p.observacion || '']));
      this.emitir(true);
    } catch (err: any) {
      this.datos = null;
      this.errorCarga = this.msg(err);
    } finally {
      this.cargando = false;
    }
  }

  async alternar(p: PasoChecklistOrden, marcado: boolean): Promise<void> {
    await this.enviar(p, marcado);
  }

  async guardarObservacion(p: PasoChecklistOrden): Promise<void> {
    if ((p.observacion || '').trim() === (this.obsGuardada.get(p.id) || '').trim()) return;
    await this.enviar(p, p.completado);
  }

  private async enviar(p: PasoChecklistOrden, completado: boolean): Promise<void> {
    this.error = '';
    this.guardando.add(p.id);
    const previo = p.completado;
    try {
      const r = await firstValueFrom(this.svc.marcar(this.mantenimientoId, p.id, completado, p.observacion || undefined));
      const d = r?.data;
      p.completado = d ? !!d.completado : completado;
      p.observacion = d ? d.observacion ?? '' : p.observacion;
      p.marcadoPorNombre = d?.marcadoPorNombre ?? null;
      p.marcadoPorId = d?.marcadoPorId ?? null;
      p.marcadoEn = d?.marcadoEn ?? null;
      this.obsGuardada.set(p.id, p.observacion || '');
      this.recalcular();
    } catch (err: any) {
      p.completado = previo; // se revierte la casilla si el servidor rechaza
      this.error = this.msg(err);
    } finally {
      this.guardando.delete(p.id);
    }
  }

  private recalcular(): void {
    if (!this.datos) return;
    const pend = this.datos.pasos.filter(x => x.obligatorio && !x.completado).length;
    this.datos = { ...this.datos, obligatoriosPendientes: pend, completo: pend === 0 };
    this.emitir(true);
  }

  private emitir(cargado: boolean): void {
    const e = { cargado, requerido: !!this.datos?.requerido, obligatoriosPendientes: this.datos?.obligatoriosPendientes ?? 0 };
    // Diferido para no cambiar el estado del host en mitad de su detección de cambios.
    queueMicrotask(() => this.estado.emit(e));
  }

  private msg(err: any): string {
    const m = err?.error?.message;
    if (m) return Array.isArray(m) ? m.join(', ') : String(m);
    return err?.status === 0 ? 'No se pudo conectar con el servidor.' : (err?.message || 'No se pudo completar la acción.');
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ChecklistService, PlantillaChecklist, TipoChecklist } from '../../../core/services/checklist.service';
import { fechaHoraLocal } from '../../../core/utils/evidencia-maquinaria';
import { ToastService } from '../../../shared/services/toast.service';

interface PasoEdicion { texto: string; obligatorio: boolean; }
interface EditorTipo {
  tipo: TipoChecklist;
  titulo: string;
  vigente: PlantillaChecklist | null;
  pasos: PasoEdicion[];
  sucio: boolean;
  guardando: boolean;
  error: string;
}

/** Editor de las plantillas de checklist (preventivo y correctivo). Cada guardado crea una versión nueva. */
@Component({
  selector: 'app-checklist-plantillas',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-6">
      <div class="p-3.5 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
        Cada guardado crea una versión nueva; las órdenes ya hechas conservan lo que se marcó.
      </div>

      @if (cargando) {
        <p class="text-xs text-slate-500 font-semibold" role="status" aria-live="polite">Cargando plantillas...</p>
      } @else if (errorCarga) {
        <div class="flex flex-wrap items-center gap-2" role="alert">
          <div class="estado-error">{{ errorCarga }}</div>
          <button type="button" class="btn btn-secondary btn-sm" (click)="cargar()">Reintentar</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          @for (ed of editores; track ed.tipo) {
            <section class="bg-white p-5 rounded-2xl border border-slate-100 shadow-easydry space-y-4" [attr.aria-label]="'Checklist ' + ed.titulo">
              <div>
                <h2 class="text-base font-extrabold text-slate-900 font-outfit">Checklist {{ ed.titulo }}</h2>
                <p class="text-xs text-slate-500 mt-0.5">
                  @if (ed.vigente) {
                    Versión vigente: <strong>v{{ ed.vigente.version }}</strong> · creada por {{ ed.vigente.creadaPorNombre || '—' }} · {{ hora(ed.vigente.createdAt) }}
                  } @else {
                    Aún no hay plantilla: las órdenes de este tipo se cierran sin checklist.
                  }
                </p>
              </div>

              <ol class="space-y-2">
                @for (p of ed.pasos; track $index; let i = $index) {
                  <li class="flex items-start gap-2 rounded-xl border border-slate-200 p-2.5">
                    <span class="text-xs font-bold text-slate-400 w-5 pt-2.5 text-right shrink-0">{{ i + 1 }}</span>
                    <div class="flex-1 min-w-0 space-y-1.5">
                      <input type="text" class="field text-sm" maxlength="300" placeholder="Texto del paso"
                        [attr.aria-label]="'Texto del paso ' + (i + 1)"
                        [ngModel]="p.texto" (ngModelChange)="p.texto = $event; ed.sucio = true" [name]="ed.tipo + '-t-' + i">
                      <label class="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input type="checkbox" class="w-4 h-4" [ngModel]="p.obligatorio"
                          (ngModelChange)="p.obligatorio = $event; ed.sucio = true" [name]="ed.tipo + '-o-' + i">
                        Obligatorio
                      </label>
                    </div>
                    <div class="flex flex-col gap-1 shrink-0">
                      <button type="button" class="btn btn-ghost btn-sm" (click)="mover(ed, i, -1)" [disabled]="i === 0" aria-label="Subir paso">
                        <i-lucide name="chevron-up" class="w-4 h-4" aria-hidden="true"></i-lucide>
                      </button>
                      <button type="button" class="btn btn-ghost btn-sm" (click)="mover(ed, i, 1)" [disabled]="i === ed.pasos.length - 1" aria-label="Bajar paso">
                        <i-lucide name="chevron-down" class="w-4 h-4" aria-hidden="true"></i-lucide>
                      </button>
                    </div>
                    <button type="button" class="btn btn-ghost btn-sm text-rose-600 shrink-0" (click)="quitar(ed, i)" aria-label="Quitar paso">
                      <i-lucide name="trash-2" class="w-4 h-4" aria-hidden="true"></i-lucide>
                    </button>
                  </li>
                }
              </ol>
              @if (ed.pasos.length === 0) { <p class="estado-vacio">Sin pasos. Agrega al menos uno para guardar.</p> }

              <button type="button" class="btn btn-secondary btn-sm" (click)="agregar(ed)" [disabled]="ed.pasos.length >= maxPasos">
                <i-lucide name="plus" class="w-4 h-4" aria-hidden="true"></i-lucide> Agregar paso
              </button>

              @if (ed.error) { <div class="estado-error" role="alert">{{ ed.error }}</div> }

              <div class="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" class="btn btn-secondary" (click)="descartar(ed)" [disabled]="!ed.sucio || ed.guardando">Descartar cambios</button>
                <button type="button" class="btn btn-primary" (click)="guardar(ed)" [disabled]="!ed.sucio || ed.guardando">
                  {{ ed.guardando ? 'Guardando...' : 'Guardar nueva versión' }}
                </button>
              </div>
            </section>
          }
        </div>
      }
    </div>
  `,
})
export class ChecklistPlantillasComponent implements OnInit {
  private svc = inject(ChecklistService);
  private toast = inject(ToastService);

  readonly maxPasos = 30;
  cargando = false;
  errorCarga = '';
  editores: EditorTipo[] = [
    { tipo: 'PREVENTIVO', titulo: 'preventivo', vigente: null, pasos: [], sucio: false, guardando: false, error: '' },
    { tipo: 'CORRECTIVO', titulo: 'correctivo', vigente: null, pasos: [], sucio: false, guardando: false, error: '' },
  ];

  ngOnInit(): void { this.cargar(); }

  hora(iso?: string | null): string { return fechaHoraLocal(iso); }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.errorCarga = '';
    try {
      const lista = await firstValueFrom(this.svc.plantillas());
      for (const ed of this.editores) this.aplicar(ed, (lista || []).find(p => p.tipo === ed.tipo && p.activa) || null);
    } catch (err) {
      this.errorCarga = this.msg(err);
    } finally {
      this.cargando = false;
    }
  }

  private aplicar(ed: EditorTipo, p: PlantillaChecklist | null): void {
    ed.vigente = p;
    ed.pasos = (p?.pasos || []).slice().sort((a, b) => a.orden - b.orden).map(x => ({ texto: x.texto, obligatorio: x.obligatorio }));
    ed.sucio = false;
    ed.error = '';
  }

  agregar(ed: EditorTipo): void { ed.pasos.push({ texto: '', obligatorio: true }); ed.sucio = true; }
  quitar(ed: EditorTipo, i: number): void { ed.pasos.splice(i, 1); ed.sucio = true; }
  mover(ed: EditorTipo, i: number, d: number): void {
    const j = i + d;
    if (j < 0 || j >= ed.pasos.length) return;
    [ed.pasos[i], ed.pasos[j]] = [ed.pasos[j], ed.pasos[i]];
    ed.sucio = true;
  }
  descartar(ed: EditorTipo): void { this.aplicar(ed, ed.vigente); }

  async guardar(ed: EditorTipo): Promise<void> {
    ed.error = '';
    const pasos = ed.pasos.map(p => ({ texto: p.texto.trim(), obligatorio: p.obligatorio }));
    if (pasos.length === 0) { ed.error = 'La plantilla necesita al menos un paso.'; return; }
    const malo = pasos.findIndex(p => p.texto.length < 3);
    if (malo >= 0) { ed.error = `El paso ${malo + 1} debe tener al menos 3 caracteres.`; return; }
    ed.guardando = true;
    try {
      const nueva = await firstValueFrom(this.svc.guardarPlantilla(ed.tipo, pasos));
      this.aplicar(ed, nueva);
      this.toast.success('Checklist guardado', `Versión ${nueva.version} del checklist ${ed.titulo}.`);
    } catch (err) {
      ed.error = this.msg(err);
    } finally {
      ed.guardando = false;
    }
  }

  private msg(err: any): string {
    const m = err?.error?.message;
    if (m) return Array.isArray(m) ? m.join(', ') : String(m);
    return err?.status === 0 ? 'No se pudo conectar con el servidor.' : (err?.message || 'No se pudo completar la acción.');
  }
}

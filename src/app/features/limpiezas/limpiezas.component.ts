import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { LimpiezaMaquinaria, MaquinariaService } from '../../core/services/maquinaria.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { ListaInfinita } from '../../core/utils/lista-infinita';
import { InfiniteScrollComponent } from '../../shared/components/infinite-scroll/infinite-scroll.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ThumbSrcDirective } from '../../shared/directives/thumb-src.directive';
import { fechaLocal } from '../../core/utils/evidencia-maquinaria';
import { puedeEditarLimpiezas, puedeExportarLimpiezas } from '../../core/utils/maquinaria-permisos';
import { PAGE_SIZE_INFINITO } from '../../core/config/paginacion';

/**
 * Auditoría de limpiezas de maquinaria: 2x/semana (miércoles y sábado) para la de agencia, diaria
 * para la asignada a un pulidor. Visible solo con `limpiezas.ver` (admin/super admin: todo el país;
 * supervisor y coordinador de mantenimiento: su región; coordinador de servicios especiales: sus
 * pulidores — el backend ya resuelve el alcance, aquí solo se lista). Editar/eliminar un registro y
 * exportar el historial requieren además `limpiezas.editar` / `limpiezas.ver` (el backend lo exige igual).
 */
@Component({
  selector: 'app-limpiezas',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, InfiniteScrollComponent, ModalComponent, SkeletonLoaderComponent, ThumbSrcDirective],
  template: `
    <div class="space-y-6 animate-fade-in">
      @if (!hideHeader) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold mb-2">
              <i-lucide name="sparkles" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
              <span>Auditoría de Limpieza de Maquinaria</span>
            </div>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Registro de Limpiezas</h1>
            <p class="text-slate-500 text-xs mt-1">
              Agencia: miércoles y sábado. Pulidor: diaria. Cada registro queda guardado con fecha, quién lo subió y sus fotos.
            </p>
          </div>
        </div>
      }

      @if (pendientes > 0) {
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
          <i-lucide name="alert-circle" class="w-4 h-4" aria-hidden="true"></i-lucide>
          {{ pendientes }} máquina(s) atrasada(s) de limpieza dentro de tu alcance.
        </div>
      }

      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <select [(ngModel)]="filtroMaquinariaId" (ngModelChange)="onFiltroMaquinaChange()" name="filtro-maquina"
          class="field sm:max-w-xs" aria-label="Filtrar por máquina">
          <option value="">Todas las máquinas</option>
          @for (m of maquinas; track m.id) {
            <option [value]="m.id">{{ m.codigo }} — {{ m.nombre }}</option>
          }
        </select>
        @if (puedeExportar) {
        <button type="button" (click)="exportarCsv()" [disabled]="exportando"
          class="btn btn-secondary btn-sm w-full sm:w-auto">
          <i-lucide name="download" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
          {{ exportando ? 'Exportando...' : 'Exportar CSV' }}
        </button>
        }
      </div>

      @if (lista.error && lista.items.length === 0) {
        <div role="alert" class="flex flex-col items-center gap-3 text-center py-6">
          <div class="estado-error">{{ lista.error }}</div>
          <button type="button" class="btn btn-secondary btn-sm" (click)="lista.reiniciar()">Reintentar</button>
        </div>
      } @else if (!lista.inicializada) {
        <div role="status" aria-live="polite">
          <span class="sr-only">Cargando limpiezas…</span>
          <app-skeleton-loader type="cards"></app-skeleton-loader>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        @for (r of lista.items; track r.id) {
          <div class="rounded-2xl border border-slate-100 bg-white shadow-easydry p-5 flex flex-col h-full hover:shadow-easydry-hover transition-shadow">
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="font-mono font-extrabold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg truncate">
                {{ r.maquinaria?.codigo }}
              </span>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide"
                [ngClass]="r.tipo === 'AGENCIA' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'">
                {{ r.tipo === 'AGENCIA' ? 'Agencia' : 'Pulidor' }}
              </span>
            </div>
            <h3 class="font-bold text-base font-outfit leading-snug text-slate-900 truncate">{{ r.maquinaria?.nombre }}</h3>
            <p class="text-xs text-slate-500 mt-0.5">{{ fecha(r.fecha) }}</p>
            <p class="text-xs text-slate-500">
              Registró: <strong class="text-slate-700">{{ (r.registradoPor?.name || '') + ' ' + (r.registradoPor?.lastname || '') }}</strong>
            </p>
            @if (r.observaciones) {
              <p class="text-xs text-slate-700 font-medium mt-2 line-clamp-2">{{ r.observaciones }}</p>
            }
            @if (r.fotos.length) {
              <div class="mt-3 flex items-center gap-1.5 flex-wrap">
                @for (foto of r.fotos; track foto) {
                  <button type="button" (click)="abrirFoto(foto)" class="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-pointer">
                    <img [appThumb]="foto" class="w-full h-full object-cover" alt="Foto de limpieza">
                  </button>
                }
              </div>
            } @else {
              <p class="text-xs text-slate-400 mt-3 italic">Sin fotos.</p>
            }
            @if (puedeEditar) {
              <div class="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button type="button" (click)="abrirEditar(r)" class="btn btn-secondary btn-sm flex-1">
                  <i-lucide name="pencil" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Editar
                </button>
                <button type="button" (click)="eliminar(r)" class="btn btn-danger btn-sm flex-1">
                  <i-lucide name="trash-2" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Eliminar
                </button>
              </div>
            }
          </div>
        }
      </div>

      @if (lista.inicializada && !lista.error && lista.items.length === 0) {
        <p class="estado-vacio">Aún no hay limpiezas registradas dentro de tu alcance.</p>
      } @else if (lista.items.length > 0) {
        <app-infinite-scroll
          [hasMore]="lista.hasMore"
          [loading]="lista.cargando"
          [error]="lista.error"
          [total]="lista.total"
          (cargarMas)="lista.siguiente()"
          (reintentar)="lista.reintentar()">
        </app-infinite-scroll>
      }

      <app-modal [isOpen]="!!fotoAmpliada" title="Foto de limpieza" icon="sparkles" size="md" (close)="fotoAmpliada = null">
        @if (fotoAmpliada) {
          <img [appThumb]="fotoAmpliada" class="w-full rounded-xl" alt="Foto de limpieza ampliada">
        }
      </app-modal>

      <app-modal [isOpen]="!!editando" title="Editar observaciones" icon="pencil" size="sm" (close)="cerrarEditar()">
        @if (editando) {
          <div class="space-y-3">
            <label for="limpieza-editar-obs" class="field-label">Observaciones</label>
            <textarea id="limpieza-editar-obs" [(ngModel)]="editarObservaciones" name="editar-obs" rows="3" class="field"></textarea>
            @if (editarError) { <div class="estado-error" role="alert">{{ editarError }}</div> }
          </div>
          <div class="flex gap-2 mt-4">
            <button type="button" (click)="cerrarEditar()" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
            <button type="button" (click)="guardarEditar()" [disabled]="guardandoEditar" class="btn btn-primary w-full sm:w-auto">
              {{ guardandoEditar ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        }
      </app-modal>
    </div>
  `,
})
export class LimpiezasComponent implements OnInit, OnDestroy {
  @Input() hideHeader = false;

  private maquinariaService = inject(MaquinariaService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  pendientes = 0;
  fotoAmpliada: string | null = null;
  maquinas: { id: string; codigo: string; nombre: string }[] = [];
  filtroMaquinariaId = '';
  exportando = false;

  readonly puedeEditar = puedeEditarLimpiezas(this.authService);
  /** Las exportaciones viven en Reportes Operativos: solo exporta quien tiene ese permiso. */
  readonly puedeExportar = puedeExportarLimpiezas(this.authService);

  readonly lista = new ListaInfinita<LimpiezaMaquinaria>(
    (page, pageSize) => this.maquinariaService.getLimpiezasPagina({ page, pageSize, maquinariaId: this.filtroMaquinariaId || undefined }),
    PAGE_SIZE_INFINITO,
    (r) => r.id,
  );

  editando: LimpiezaMaquinaria | null = null;
  editarObservaciones = '';
  editarError = '';
  guardandoEditar = false;

  ngOnInit(): void {
    this.lista.reiniciar();
    this.maquinariaService.getResumenLimpiezas().subscribe((r) => { this.pendientes = r.pendientes; });
    this.maquinariaService.getMaquinaria().subscribe((lista) => {
      this.maquinas = lista
        .map((m) => ({ id: String(m.id), codigo: m.codigo, nombre: m.nombre }))
        .sort((a, b) => a.codigo.localeCompare(b.codigo));
    });
  }

  ngOnDestroy(): void {
    this.lista.destruir();
  }

  abrirFoto(url: string): void {
    this.fotoAmpliada = url;
  }

  fecha(iso: string): string {
    return fechaLocal(iso);
  }

  onFiltroMaquinaChange(): void {
    this.lista.reiniciar();
  }

  abrirEditar(r: LimpiezaMaquinaria): void {
    this.editando = r;
    this.editarObservaciones = r.observaciones || '';
    this.editarError = '';
  }

  cerrarEditar(): void {
    this.editando = null;
  }

  async guardarEditar(): Promise<void> {
    if (!this.editando) return;
    this.guardandoEditar = true;
    this.editarError = '';
    try {
      await firstValueFrom(this.maquinariaService.editarLimpieza(this.editando.id, this.editarObservaciones));
      this.lista.reiniciar();
      this.toastService.success('Limpieza actualizada', 'Las observaciones se guardaron correctamente.');
      this.editando = null;
    } catch (err) {
      this.editarError = this.mensajeError(err);
    } finally {
      this.guardandoEditar = false;
    }
  }

  async eliminar(r: LimpiezaMaquinaria): Promise<void> {
    const confirmado = window.confirm(`¿Eliminar el registro de limpieza de ${r.maquinaria?.codigo || 'esta máquina'} del ${this.fecha(r.fecha)}? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    try {
      await firstValueFrom(this.maquinariaService.eliminarLimpieza(r.id));
      this.lista.reiniciar();
      this.toastService.success('Limpieza eliminada', 'El registro se eliminó correctamente.');
    } catch (err) {
      this.toastService.error('No se pudo eliminar', this.mensajeError(err));
    }
  }

  async exportarCsv(): Promise<void> {
    this.exportando = true;
    try {
      const filas = await firstValueFrom(this.maquinariaService.exportarLimpiezas(this.filtroMaquinariaId || undefined));
      const encabezado = ['Máquina', 'Código', 'Tipo', 'Fecha', 'Registró', 'Observaciones', 'Fotos'];
      const lineas = filas.map((r) => [
        r.maquinaria?.nombre || '',
        r.maquinaria?.codigo || '',
        r.tipo === 'AGENCIA' ? 'Agencia' : 'Pulidor',
        this.fecha(r.fecha),
        `${r.registradoPor?.name || ''} ${r.registradoPor?.lastname || ''}`.trim(),
        r.observaciones || '',
        String(r.fotos.length),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
      const csv = [encabezado.join(','), ...lineas].join('\r\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `limpiezas_maquinaria_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.toastService.success('Exportación lista', `${filas.length} registro(s) descargados en CSV.`);
    } catch (err) {
      this.toastService.error('No se pudo exportar', this.mensajeError(err));
    } finally {
      this.exportando = false;
    }
  }

  private mensajeError(err: unknown): string {
    const e = err as { error?: { message?: string | string[] }; message?: string } | undefined;
    const detalle = e?.error?.message;
    if (Array.isArray(detalle)) return detalle.join('. ');
    return detalle || e?.message || 'No se pudo completar la acción.';
  }
}

import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { InformesInspeccionService } from '../../../core/services/informes-inspeccion.service';
import { ToastService } from '../../../shared/services/toast.service';
import { InformeDetalle, OpcionesAdjuntos, UsuarioAdjuntable, mensajeError } from '../../../core/models/auditorias.model';

/**
 * Usuarios adjuntos a un informe: cuando el informe se aprueba, a cada uno le llega una notificación. Adjuntar no da acceso al informe
 * (la visibilidad sigue siendo la de siempre). Quien elabora el informe y quien lo revisa agregan y quitan hasta la aprobación; ya
 * aprobado, solo un Admin agrega más y nadie quita.
 */
@Component({
  selector: 'app-informe-adjuntos',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-3">
      @if (informe.adjuntos.length) {
        <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          @for (a of informe.adjuntos; track a.userId) {
            <li class="flex items-center justify-between gap-3 px-3 py-2">
              <div class="min-w-0">
                <p class="text-sm font-bold text-slate-800 truncate">{{ a.nombre }} <span class="text-xs font-semibold text-slate-500">· {{ a.rol }}</span></p>
                <p class="text-[11px] text-slate-500">Agregado por {{ a.agregadoPorNombre || '—' }} · {{ a.agregadoEn | date:'dd/MM/yyyy HH:mm' }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="badge" [ngClass]="a.notificadoEn ? 'badge-ok' : 'badge-neutral'" [title]="a.notificadoEn ? 'Notificado el ' + (a.notificadoEn | date:'dd/MM/yyyy HH:mm') : 'Se le avisará cuando el informe se apruebe'">{{ a.notificadoEn ? 'Notificado' : 'Se avisará al aprobar' }}</span>
                @if (informe.permisos.puedeQuitarAdjuntos) {
                  <button type="button" class="btn btn-ghost btn-sm" (click)="quitar(a.userId)" [disabled]="trabajando" [attr.aria-label]="'Quitar a ' + a.nombre"><i-lucide name="x" class="w-4 h-4" aria-hidden="true"></i-lucide></button>
                }
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm text-slate-500">Nadie más recibirá una notificación de este informe.</p>
      }

      @if (informe.permisos.puedeAdjuntar) {
        <button type="button" class="btn btn-secondary btn-sm" (click)="alternarBuscador()">
          <i-lucide name="user-plus" class="w-4 h-4" aria-hidden="true"></i-lucide> {{ abierto ? 'Cerrar buscador' : 'Adjuntar usuarios' }}
        </button>

        @if (abierto) {
          <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
            <input class="field" [(ngModel)]="filtros.search" (ngModelChange)="buscar()" placeholder="Buscar por nombre…" aria-label="Buscar usuario por nombre" autocomplete="off">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <select class="field" [(ngModel)]="filtros.regionId" (ngModelChange)="buscar()" aria-label="Filtrar por región">
                <option value="">Todas las regiones</option>
                @for (r of opciones?.regiones ?? []; track r.id) { <option [value]="r.id">{{ r.nombre }}</option> }
              </select>
              <select class="field" [(ngModel)]="filtros.clienteId" (ngModelChange)="buscar()" aria-label="Filtrar por cliente">
                <option value="">Todos los clientes</option>
                @for (c of opciones?.clientes ?? []; track c.id) { <option [value]="c.id">{{ c.nombre }}</option> }
              </select>
              <select class="field" [(ngModel)]="filtros.agenciaId" (ngModelChange)="buscar()" aria-label="Filtrar por agencia">
                <option value="">Todas las agencias</option>
                @for (a of agenciasFiltradas; track a.id) { <option [value]="a.id">{{ a.nombre }}</option> }
              </select>
              <select class="field" [(ngModel)]="filtros.roleId" (ngModelChange)="buscar()" aria-label="Filtrar por rol">
                <option value="">Todos los roles</option>
                @for (r of opciones?.roles ?? []; track r.id) { <option [value]="r.id">{{ r.nombre }}</option> }
              </select>
            </div>

            @if (buscando) {
              <p class="text-xs text-slate-500" role="status">Buscando…</p>
            } @else if (!resultados.length) {
              <p class="text-xs text-slate-500">No hay usuarios con esos filtros.</p>
            } @else {
              <ul class="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                @for (u of resultados; track u.id) {
                  <li>
                    <label class="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50" [ngClass]="yaAdjunto(u.id) ? 'opacity-60' : ''">
                      <input type="checkbox" [checked]="yaAdjunto(u.id) || elegidos.has(u.id)" [disabled]="yaAdjunto(u.id)" (change)="alternar(u.id)" [attr.aria-label]="u.nombre">
                      <span class="min-w-0">
                        <span class="font-semibold text-slate-800">{{ u.nombre }}</span>
                        <span class="block text-[11px] text-slate-500">{{ u.rol }}@if (u.agencia) { · {{ u.agencia }} }@if (yaAdjunto(u.id)) { · ya adjunto }</span>
                      </span>
                    </label>
                  </li>
                }
              </ul>
            }
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-slate-500">{{ elegidos.size }} seleccionado(s)</span>
              <button type="button" class="btn btn-cta btn-sm" (click)="adjuntar()" [disabled]="!elegidos.size || trabajando">{{ trabajando ? 'Adjuntando…' : 'Adjuntar seleccionados' }}</button>
            </div>
          </div>
        }
      }
      @if (error) { <p class="text-sm font-semibold text-rose-700" role="alert">{{ error }}</p> }
    </div>
  `,
})
export class InformeAdjuntosComponent {
  private readonly api = inject(InformesInspeccionService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) informe!: InformeDetalle;
  /** El informe cambió (se agregó o quitó a alguien): el padre guarda el detalle nuevo. */
  @Output() cambio = new EventEmitter<InformeDetalle>();

  abierto = false;
  trabajando = false;
  buscando = false;
  error = '';
  opciones: OpcionesAdjuntos | null = null;
  filtros = { search: '', regionId: '', clienteId: '', agenciaId: '', roleId: '' };
  resultados: UsuarioAdjuntable[] = [];
  elegidos = new Set<string>();
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  /** Si hay región o cliente elegidos, la lista de agencias se acota a ellos. */
  get agenciasFiltradas() {
    return (this.opciones?.agencias ?? []).filter(
      (a) => (!this.filtros.regionId || a.regionId === this.filtros.regionId) && (!this.filtros.clienteId || a.clienteId === this.filtros.clienteId),
    );
  }

  yaAdjunto(id: string): boolean { return this.informe.adjuntos.some((a) => a.userId === id); }

  async alternarBuscador(): Promise<void> {
    this.abierto = !this.abierto;
    if (!this.abierto) return;
    this.error = '';
    try {
      this.opciones ??= await firstValueFrom(this.api.opcionesAdjuntos());
    } catch (e) {
      this.error = mensajeError(e, 'No se pudieron cargar los filtros.');
    }
    await this.consultar();
  }

  /** Espera un instante tras cada cambio para no consultar con cada tecla. */
  buscar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => void this.consultar(), 250);
  }

  private async consultar(): Promise<void> {
    this.buscando = true;
    try {
      const f = this.filtros;
      this.resultados = await firstValueFrom(this.api.buscarAdjuntables({
        ...(f.search.trim() ? { search: f.search.trim() } : {}),
        ...(f.regionId ? { regionId: f.regionId } : {}),
        ...(f.clienteId ? { clienteId: f.clienteId } : {}),
        ...(f.agenciaId ? { agenciaId: f.agenciaId } : {}),
        ...(f.roleId ? { roleId: f.roleId } : {}),
      }));
    } catch (e) {
      this.error = mensajeError(e, 'No se pudo buscar usuarios.');
    } finally {
      this.buscando = false;
    }
  }

  alternar(id: string): void {
    if (this.elegidos.has(id)) this.elegidos.delete(id);
    else this.elegidos.add(id);
  }

  async adjuntar(): Promise<void> {
    if (!this.elegidos.size) return;
    this.trabajando = true;
    this.error = '';
    try {
      const detalle = await firstValueFrom(this.api.adjuntar(this.informe.id, [...this.elegidos]));
      this.toast.success('Usuarios adjuntados', this.informe.estado === 'GUARDADO' && this.informe.aprobadoEn ? 'Se les avisó ahora mismo.' : 'Se les avisará cuando el informe se apruebe.');
      this.elegidos.clear();
      this.cambio.emit(detalle);
    } catch (e) {
      this.error = mensajeError(e, 'No se pudo adjuntar a los usuarios.');
    } finally {
      this.trabajando = false;
    }
  }

  async quitar(userId: string): Promise<void> {
    this.trabajando = true;
    this.error = '';
    try {
      this.cambio.emit(await firstValueFrom(this.api.quitarAdjunto(this.informe.id, userId)));
    } catch (e) {
      this.error = mensajeError(e, 'No se pudo quitar al usuario.');
    } finally {
      this.trabajando = false;
    }
  }
}

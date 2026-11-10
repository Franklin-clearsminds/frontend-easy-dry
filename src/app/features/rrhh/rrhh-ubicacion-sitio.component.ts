import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../shared/services/toast.service';
import { RrhhService, SitioConUbicacion } from '../../core/services/rrhh.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { RrhhMapaUbicacionComponent } from './rrhh-mapa-ubicacion.component';

/** Distancia máxima al sitio para timbrar: fija por canal (la configura el sistema, no cada sitio). */
export const RADIO_APP_M = 100;
export const RADIO_WEB_M = 200;

/**
 * Ubicación de una agencia o de una bodega para validar las timbradas de su personal. En el formulario solo se ve un botón con el estado
 * (guardada o no); la ubicación se elige en un modal con el mapa de Google (o escribiendo las coordenadas) y se guarda en el servidor.
 * El mapa y el buscador solo se crean al abrir el modal, así no se cobran cargas de Google por abrir el formulario. Cada cambio queda en
 * la bitácora. Solo se muestra a quien puede configurar ubicaciones y con la agencia o bodega ya creada.
 */
@Component({
  selector: 'app-rrhh-ubicacion-sitio',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, RrhhMapaUbicacionComponent, ModalComponent],
  template: `
    <div class="rounded-xl border-2 border-violet-300 bg-violet-50 p-4 flex flex-wrap items-center justify-between gap-3" role="group" [attr.aria-labelledby]="idTitulo">
      <div class="min-w-0 space-y-1">
        <p [id]="idTitulo" class="text-xs font-extrabold uppercase tracking-wider text-violet-900 inline-flex items-center gap-1.5">
          <i-lucide aria-hidden="true" name="map-pin" class="w-4 h-4"></i-lucide> Ubicación {{ tipo === 'AGENCIA' ? 'de la agencia' : 'de la bodega' }} (RRHH)
        </p>
        @if (cargando) {
          <p class="text-xs text-slate-500" role="status">Cargando la ubicación…</p>
        } @else if (guardada) {
          <p class="text-xs font-semibold text-emerald-800 inline-flex items-center gap-1"><i-lucide aria-hidden="true" name="check-circle" class="w-4 h-4"></i-lucide> Ubicación guardada ({{ guardada.latitud }}, {{ guardada.longitud }})</p>
        } @else {
          <p class="text-xs text-violet-900">Aún sin ubicación guardada: el personal timbra solo con foto y se avisa a los administradores.</p>
        }
      </div>
      <button type="button" class="btn btn-secondary btn-sm" (click)="abrir()" [disabled]="cargando">
        <i-lucide aria-hidden="true" name="map-pin" class="w-3.5 h-3.5"></i-lucide> {{ guardada ? 'Cambiar ubicación' : 'Configurar ubicación' }}
      </button>
    </div>

    <app-modal [isOpen]="abierto" size="xl" [title]="'Ubicación ' + (tipo === 'AGENCIA' ? 'de la agencia' : 'de la bodega')" icon="map-pin" (close)="cerrar()">
      @if (abierto) {
        <div class="space-y-3">
          <p class="text-xs text-violet-900">El personal con {{ tipo === 'AGENCIA' ? 'esta agencia' : 'esta bodega' }} asignada solo puede timbrar a {{ radioApp }} m o menos de este punto desde la app y a {{ radioWeb }} m o menos desde la web. Sin ubicación guardada, timbran solo con foto y se avisa a los administradores.</p>
          <app-rrhh-mapa-ubicacion [lat]="lat" [lng]="lng" (ubicacionChange)="lat = $event.lat; lng = $event.lng"></app-rrhh-mapa-ubicacion>
          @if (error) { <p class="text-xs font-semibold text-rose-700" role="alert">{{ error }}</p> }
        </div>
      }
      <div modal-footer class="flex flex-wrap items-center justify-end gap-2">
        @if (guardada) {
          <button type="button" class="text-xs font-bold text-rose-700 hover:underline mr-auto" (click)="quitar()" [disabled]="guardando">Quitar ubicación</button>
        }
        <button type="button" class="btn btn-secondary" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn btn-primary" (click)="guardar()" [disabled]="!sePuedeGuardar || guardando">
          <i-lucide aria-hidden="true" name="save" class="w-4 h-4"></i-lucide> {{ guardando ? 'Guardando…' : 'Guardar ubicación' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class RrhhUbicacionSitioComponent implements OnChanges {
  private readonly api = inject(RrhhService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) tipo!: 'AGENCIA' | 'BODEGA';
  @Input() sitioId: string | number | null = null;

  readonly radioApp = RADIO_APP_M;
  readonly radioWeb = RADIO_WEB_M;
  readonly idTitulo = `ubic-${Math.random().toString(36).slice(2, 8)}`;
  lat: number | null = null;
  lng: number | null = null;
  abierto = false;
  guardada: SitioConUbicacion | null = null;
  cargando = false;
  guardando = false;
  error = '';

  get sePuedeGuardar(): boolean {
    return this.lat !== null && this.lng !== null;
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['sitioId'] || cambios['tipo']) this.cargar();
  }

  private cargar(): void {
    this.guardada = null;
    this.lat = this.lng = null;
    this.error = '';
    this.abierto = false;
    if (!this.sitioId) return;
    this.cargando = true;
    this.api.ubicaciones().subscribe({
      next: (lista) => {
        const s = lista.find((x) => x.tipo === this.tipo && x.id === String(this.sitioId));
        this.aplicar(s ?? null);
        this.cargando = false;
      },
      error: () => { this.cargando = false; this.error = 'No se pudo cargar la ubicación.'; },
    });
  }

  private aplicar(s: SitioConUbicacion | null): void {
    if (s && s.latitud !== null && s.longitud !== null) {
      this.guardada = s;
      this.lat = s.latitud;
      this.lng = s.longitud;
    } else {
      this.guardada = null;
    }
  }

  abrir(): void {
    // Al volver a abrir se parte de lo guardado, no de un intento anterior que se canceló.
    if (this.guardada) { this.lat = this.guardada.latitud; this.lng = this.guardada.longitud; } else { this.lat = this.lng = null; }
    this.error = '';
    this.abierto = true;
  }

  cerrar(): void { this.abierto = false; }

  guardar(): void {
    if (!this.sitioId || !this.sePuedeGuardar) return;
    this.guardando = true;
    this.error = '';
    this.api.guardarUbicacion(this.tipo, String(this.sitioId), this.lat as number, this.lng as number).subscribe({
      next: (s) => { this.guardando = false; this.aplicar(s); this.abierto = false; this.toast.success('Ubicación guardada', `El personal de ${s.nombre} timbrará a ${RADIO_APP_M} m o menos desde la app y a ${RADIO_WEB_M} m o menos desde la web.`); },
      error: (e) => { this.guardando = false; this.error = e?.error?.message ? String(e.error.message) : 'No se pudo guardar la ubicación.'; },
    });
  }

  quitar(): void {
    if (!this.sitioId) return;
    this.guardando = true;
    this.api.quitarUbicacion(this.tipo, String(this.sitioId)).subscribe({
      next: (s) => { this.guardando = false; this.lat = this.lng = null; this.aplicar(s); this.abierto = false; this.toast.info('Ubicación quitada', 'Hasta que se configure otra, el personal timbra solo con foto.'); },
      error: () => { this.guardando = false; },
    });
  }
}

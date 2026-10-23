import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OpcionSelect } from '../../../core/models/paginacion.model';

/**
 * Desplegable de selección múltiple con buscador local (para listas cortas, como el catálogo de servicios).
 *
 *   <app-select-multiple placeholder="Servicios" todasLabel="Todos los servicios" [opciones]="servicios"
 *       [values]="seleccionados" (valuesChange)="seleccionados = $event"></app-select-multiple>
 *
 * Sin nada elegido significa «todos»: el padre no filtra.
 */
@Component({
  selector: 'app-select-multiple',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="relative">
      <button type="button" (click)="alternar()" [attr.aria-expanded]="abierto" aria-haspopup="listbox" [attr.aria-label]="ariaLabel || placeholder"
        class="w-full h-10 flex items-center justify-between gap-2 pl-3 pr-2.5 rounded-xl border text-sm font-semibold text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-easydry-blue/30"
        [ngClass]="values.length ? 'border-easydry-green text-easydry-green-text bg-easydry-green/10' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'">
        <span class="truncate" [attr.title]="resumen">{{ resumen }}</span>
        <span class="flex items-center gap-1 shrink-0">
          @if (values.length) {
            <span role="button" tabindex="-1" aria-label="Quitar la selección" (click)="limpiar($event)"
              class="w-5 h-5 inline-flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-white/60">
              <i-lucide name="x" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
            </span>
          }
          <i-lucide name="chevron-down" class="w-4 h-4 text-slate-400 transition-transform" [class.rotate-180]="abierto" aria-hidden="true"></i-lucide>
        </span>
      </button>

      @if (abierto) {
        <div class="absolute z-50 mt-1 left-0 min-w-full w-72 rounded-xl border border-slate-200 bg-white shadow-xl p-2" role="listbox" aria-multiselectable="true">
          <input type="text" [(ngModel)]="texto" name="buscar-multiple" placeholder="Buscar…" aria-label="Buscar en la lista"
            class="w-full h-9 px-3 mb-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-easydry-blue" />
          <div class="max-h-60 overflow-y-auto">
            @for (o of visibles; track o.value) {
              <label class="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm">
                <input type="checkbox" class="mt-0.5 accent-easydry-blue" [checked]="estaElegida(o.value)" (change)="alternarOpcion(o.value)" />
                <span class="min-w-0">
                  <span class="block font-semibold text-slate-800 truncate">{{ o.label }}</span>
                  @if (o.sublabel) { <span class="block text-xs text-slate-500 truncate">{{ o.sublabel }}</span> }
                </span>
              </label>
            } @empty {
              <p class="px-2 py-3 text-sm text-slate-500 text-center">Sin resultados.</p>
            }
          </div>
          <div class="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
            <button type="button" class="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40" [disabled]="!values.length" (click)="limpiar($event)">Quitar selección</button>
            <button type="button" class="btn btn-primary btn-sm" (click)="abierto = false">Listo</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class SelectMultipleComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() opciones: OpcionSelect[] = [];
  @Input() values: string[] = [];
  @Input() placeholder = 'Seleccionar…';
  @Input() todasLabel = 'Todos';
  @Input() ariaLabel = '';
  @Output() valuesChange = new EventEmitter<string[]>();

  abierto = false;
  texto = '';

  get visibles(): OpcionSelect[] {
    const q = this.texto.trim().toLowerCase();
    return q ? this.opciones.filter((o) => `${o.label} ${o.sublabel ?? ''}`.toLowerCase().includes(q)) : this.opciones;
  }

  get resumen(): string {
    if (!this.values.length) return this.todasLabel;
    if (this.values.length === 1) return this.opciones.find((o) => o.value === this.values[0])?.label ?? '1 elegido';
    return `${this.values.length} elegidos`;
  }

  estaElegida(valor: string): boolean {
    return this.values.includes(valor);
  }

  alternar(): void {
    this.abierto = !this.abierto;
    if (this.abierto) this.texto = '';
  }

  alternarOpcion(valor: string): void {
    const nuevos = this.estaElegida(valor) ? this.values.filter((v) => v !== valor) : [...this.values, valor];
    this.valuesChange.emit(nuevos);
  }

  limpiar(e: Event): void {
    e.stopPropagation();
    this.valuesChange.emit([]);
  }

  @HostListener('document:click', ['$event'])
  alHacerClicFuera(e: Event): void {
    if (this.abierto && !this.host.nativeElement.contains(e.target as Node)) this.abierto = false;
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    this.abierto = false;
  }
}

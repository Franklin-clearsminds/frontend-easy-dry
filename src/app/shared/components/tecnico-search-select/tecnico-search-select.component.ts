import { Component, ElementRef, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface TecnicoOpcion {
  id: string | number;
  nombre: string;
  email?: string;
  rolLabel?: string;
}

@Component({
  selector: 'app-tecnico-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div>
      <div
        class="flex items-center gap-2 pl-3 pr-1 border rounded-xl bg-white focus-within:border-easydry-blue focus-within:ring-2 focus-within:ring-easydry-blue/20"
        [ngClass]="invalid ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-300'">
        <i-lucide name="search" class="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true"></i-lucide>
        <input
          type="text"
          [ngModel]="query"
          (ngModelChange)="onQuery($event)"
          (focus)="abrir()"
          [placeholder]="placeholder"
          autocomplete="off"
          role="combobox"
          aria-autocomplete="list"
          [attr.aria-expanded]="abierto"
          [attr.aria-label]="placeholder"
          (keydown.escape)="cerrarConEsc($event)"
          class="flex-1 min-w-0 py-2.5 border-0 bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-0" />
        @if (seleccionado) {
          <button type="button" (click)="limpiar(); $event.stopPropagation()" aria-label="Quitar selección" title="Quitar selección" class="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer bg-transparent border-0 p-0">
            <i-lucide name="x" class="w-4 h-4" aria-hidden="true"></i-lucide>
          </button>
        }
      </div>
      @if (abierto) {
        <div role="listbox" class="mt-2 w-full max-h-60 overflow-y-auto overscroll-contain bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          @for (tec of filtrados; track tec.id) {
            <button
              type="button"
              (click)="elegir(tec)"
              role="option"
              class="w-full text-left px-3 py-2.5 hover:bg-slate-50 focus-visible:bg-slate-100 border-0 bg-transparent cursor-pointer">
              <span class="block text-xs font-bold text-slate-800">{{ tec.nombre }}</span>
              <span class="block text-[11px] text-slate-500 font-semibold uppercase tracking-wide">
                {{ tec.rolLabel || 'Técnico' }}
                @if (tec.email) { · {{ tec.email }} }
              </span>
            </button>
          }
          @if (filtrados.length === 0) {
            <p class="px-3 py-3 text-xs text-slate-500 font-semibold" role="status">No hay técnicos o coordinadores que coincidan.</p>
          }
        </div>
      }
    </div>
  `,
})
export class TecnicoSearchSelectComponent {
  @Input() tecnicos: TecnicoOpcion[] = [];
  @Input() placeholder = 'Buscar coordinador o técnico...';
  @Input() invalid = false;
  @Input() set selectedId(value: string | number | null | undefined) {
    this._selectedId = value ?? null;
    this.syncQueryFromSelection();
  }

  @Output() selected = new EventEmitter<TecnicoOpcion | null>();

  query = '';
  abierto = false;
  private _selectedId: string | number | null = null;

  constructor(private host: ElementRef<HTMLElement>) {}

  get seleccionado(): TecnicoOpcion | undefined {
    if (this._selectedId == null || this._selectedId === '') return undefined;
    return this.tecnicos.find(t => String(t.id) === String(this._selectedId));
  }

  get filtrados(): TecnicoOpcion[] {
    const q = this.query.trim().toLowerCase();
    if (!q || this.seleccionado && q === this.seleccionado.nombre.toLowerCase()) {
      return this.tecnicos;
    }
    return this.tecnicos.filter(t =>
      t.nombre.toLowerCase().includes(q)
      || (t.email || '').toLowerCase().includes(q)
      || (t.rolLabel || '').toLowerCase().includes(q)
    );
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.abierto = false;
      this.syncQueryFromSelection();
    }
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;
    if (next && !this.host.nativeElement.contains(next)) {
      this.abierto = false;
      this.syncQueryFromSelection();
    }
  }

  cerrarConEsc(event: Event) {
    if (this.abierto) {
      event.stopPropagation();
      this.abierto = false;
    }
  }

  abrir() {
    this.abierto = true;
  }

  onQuery(value: string) {
    this.query = value;
    this.abierto = true;
    if (this.seleccionado && value.trim().toLowerCase() !== this.seleccionado.nombre.toLowerCase()) {
      this._selectedId = null;
      this.selected.emit(null);
    }
  }

  elegir(tec: TecnicoOpcion) {
    this._selectedId = tec.id;
    this.query = tec.nombre;
    this.abierto = false;
    this.selected.emit(tec);
  }

  limpiar() {
    this._selectedId = null;
    this.query = '';
    this.abierto = true;
    this.selected.emit(null);
  }

  private syncQueryFromSelection() {
    this.query = this.seleccionado?.nombre || '';
  }
}

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
    <div class="relative">
      <div class="relative">
        <i-lucide name="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i-lucide>
        <input
          type="text"
          [ngModel]="query"
          (ngModelChange)="onQuery($event)"
          (focus)="abrir()"
          [placeholder]="placeholder"
          autocomplete="off"
          [ngClass]="invalid ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200'"
          class="w-full pl-9 pr-9 p-2.5 border rounded-xl text-sm font-semibold bg-white" />
        @if (seleccionado) {
          <button type="button" (click)="limpiar(); $event.stopPropagation()" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-0 p-0">
            <i-lucide name="x" class="w-4 h-4"></i-lucide>
          </button>
        }
      </div>
      @if (abierto) {
        <div class="absolute z-[80] mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
          @for (tec of filtrados; track tec.id) {
            <button
              type="button"
              (click)="elegir(tec)"
              class="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-0 bg-transparent cursor-pointer">
              <span class="block text-xs font-bold text-slate-800">{{ tec.nombre }}</span>
              <span class="block text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                {{ tec.rolLabel || 'Técnico' }}
                @if (tec.email) { · {{ tec.email }} }
              </span>
            </button>
          }
          @if (filtrados.length === 0) {
            <p class="px-3 py-3 text-xs text-slate-400 font-semibold">No hay técnicos o coordinadores que coincidan.</p>
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

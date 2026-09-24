import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { apiUrl } from '../../../core/config/env';
import { SucursalService } from '../../../core/services/sucursal.service';
import { Sucursal } from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

interface ConsumoItem {
  servicioNombre: string;
  insumoNombre: string;
  insumoSKU: string;
  cantidad: number;
  unidadSimbolo: string;
  fecha: string;
}

interface ConsumoOT {
  key: string;
  origen: 'GENERAL' | 'ESPECIAL';
  codigoOT: string;
  placa: string;
  agenciaNombre: string;
  responsable: string;
  fecha: string;
  servicios: string[];
  items: ConsumoItem[];
}

/**
 * Libro de consumo por servicio: qué insumos descontó cada OT (lavado general y
 * servicios especiales). Los datos vienen del snapshot congelado al momento del consumo.
 */
@Component({
  selector: 'app-consumo-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PaginationComponent, ModalComponent],
  template: `
    <div class="space-y-4">
      <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-3">
        <div>
          <h2 class="text-sm font-extrabold text-slate-900">Consumo de insumos por servicio</h2>
          <p class="text-[11px] text-slate-500 mt-0.5">
            Qué producto y qué cantidad descontó cada servicio realizado. El nombre, SKU y unidad quedan congelados
            al momento del consumo, aunque después cambie la receta o el producto.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <select [(ngModel)]="tipo" (change)="buscar()"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-easydry-blue">
            <option value="TODOS">Todos los servicios</option>
            <option value="GENERAL">Lavado general (agencia)</option>
            <option value="ESPECIAL">Servicios especiales (pulidor)</option>
          </select>

          <select [(ngModel)]="agenciaId" (change)="buscar()"
            class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-easydry-blue">
            <option value="">Todas las agencias</option>
            @for (s of sucursales; track s.id) {
              <option [value]="s.id">{{ s.nombre }}</option>
            }
          </select>

          <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            Desde
            <input type="date" [(ngModel)]="fechaDesde" (change)="buscar()"
              class="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-easydry-blue">
          </label>
          <label class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            Hasta
            <input type="date" [(ngModel)]="fechaHasta" (change)="buscar()"
              class="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-easydry-blue">
          </label>

          <div class="relative flex-1 min-w-[200px]">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <i-lucide name="search" class="w-3.5 h-3.5"></i-lucide>
            </span>
            <input type="text" [(ngModel)]="busqueda" (keyup.enter)="buscar()"
              placeholder="Buscar por OT, placa, servicio o producto (Enter)..."
              class="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-easydry-blue">
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th class="p-3">Fecha</th>
                <th class="p-3">Tipo</th>
                <th class="p-3">OT / Placa</th>
                <th class="p-3">Servicios</th>
                <th class="p-3">Agencia</th>
                <th class="p-3">Responsable</th>
                <th class="p-3 text-right">Insumos usados</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (cargando) {
                <tr><td colspan="7" class="p-8 text-center text-slate-400">Cargando consumo...</td></tr>
              } @else if (filas.length === 0) {
                <tr><td colspan="7" class="p-8 text-center text-slate-400">
                  No hay OTs con consumo registrado con estos filtros. Se generan al finalizar una OT (lavado general) o completar un servicio especial.
                </td></tr>
              } @else {
                @for (f of filas; track f.key) {
                  <tr class="hover:bg-slate-50/70 cursor-pointer" (click)="abrirDetalle(f)">
                    <td class="p-3 whitespace-nowrap font-mono text-[11px]">{{ f.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                        [ngClass]="f.origen === 'GENERAL' ? 'bg-blue-50 text-blue-700' : 'bg-cyan-50 text-cyan-800'">
                        {{ f.origen === 'GENERAL' ? 'General' : 'Especial' }}
                      </span>
                    </td>
                    <td class="p-3">
                      <div class="font-mono text-[11px] font-bold text-slate-800">{{ f.codigoOT || '-' }}</div>
                      <div class="text-[10px] text-slate-400">{{ f.placa }}</div>
                    </td>
                    <td class="p-3 font-bold text-slate-800">{{ f.servicios.join(' + ') }}</td>
                    <td class="p-3">{{ f.agenciaNombre || '-' }}</td>
                    <td class="p-3">{{ f.responsable || '-' }}</td>
                    <td class="p-3 text-right whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {{ f.items.length }} {{ f.items.length === 1 ? 'insumo' : 'insumos' }}
                        <i-lucide name="chevron-right" class="w-3.5 h-3.5"></i-lucide>
                      </span>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [totalItems]="total"
          [currentPage]="page"
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <app-modal
        [isOpen]="!!otSeleccionada"
        [title]="'Insumos usados · ' + (otSeleccionada?.codigoOT || otSeleccionada?.placa || '')"
        icon="history"
        (close)="otSeleccionada = null">
        @if (otSeleccionada; as ot) {
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div><span class="block text-[10px] font-bold uppercase text-slate-400">OT</span><span class="font-mono font-bold text-slate-800">{{ ot.codigoOT || '-' }}</span></div>
              <div><span class="block text-[10px] font-bold uppercase text-slate-400">Placa</span><span class="font-bold text-slate-800">{{ ot.placa || '-' }}</span></div>
              <div><span class="block text-[10px] font-bold uppercase text-slate-400">Agencia</span><span class="font-bold text-slate-800">{{ ot.agenciaNombre || '-' }}</span></div>
              <div><span class="block text-[10px] font-bold uppercase text-slate-400">Responsable</span><span class="font-bold text-slate-800">{{ ot.responsable || '-' }}</span></div>
            </div>

            @for (srv of serviciosDe(ot); track srv.nombre) {
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <div class="px-3 py-2 bg-slate-50 text-xs font-extrabold text-slate-800">{{ srv.nombre }}</div>
                <table class="w-full text-left text-xs">
                  <tbody class="divide-y divide-slate-100">
                    @for (it of srv.items; track $index) {
                      <tr>
                        <td class="p-2.5">
                          <div class="font-bold text-slate-800">{{ it.insumoNombre }}</div>
                          <div class="text-[10px] text-slate-400 font-mono">{{ it.insumoSKU }}</div>
                        </td>
                        <td class="p-2.5 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                          − {{ it.cantidad | number:'1.0-4' }} {{ it.unidadSimbolo }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <p class="text-[10px] text-slate-400">
              Nombre, SKU y cantidad quedaron congelados al momento del consumo: no cambian aunque después se modifique la receta o el producto.
            </p>
          </div>
        }
      </app-modal>

    </div>
  `,
})
export class ConsumoServiciosComponent implements OnInit {
  private http = inject(HttpClient);
  private sucursalService = inject(SucursalService);

  sucursales: Sucursal[] = [];
  filas: ConsumoOT[] = [];
  otSeleccionada: ConsumoOT | null = null;
  total = 0;
  page = 1;
  pageSize = 20;
  cargando = false;

  tipo: 'TODOS' | 'GENERAL' | 'ESPECIAL' = 'TODOS';
  agenciaId = '';
  fechaDesde = '';
  fechaHasta = '';
  busqueda = '';

  ngOnInit(): void {
    this.sucursalService.getSucursales().subscribe(list => (this.sucursales = list));
    this.cargar();
  }

  abrirDetalle(ot: ConsumoOT): void {
    this.otSeleccionada = ot;
  }

  /** Agrupa los insumos de la OT por servicio (una OT general puede tener varios). */
  serviciosDe(ot: ConsumoOT): { nombre: string; items: ConsumoItem[] }[] {
    return ot.servicios.map(nombre => ({
      nombre,
      items: ot.items.filter(i => i.servicioNombre === nombre),
    }));
  }

  buscar(): void {
    this.page = 1;
    this.cargar();
  }

  onPageChange(page: number): void {
    this.page = page;
    this.cargar();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    const body: any = { tipo: this.tipo, page: this.page, pageSize: this.pageSize };
    if (this.agenciaId) body.agenciaId = this.agenciaId;
    if (this.fechaDesde) body.fechaDesde = this.fechaDesde;
    if (this.fechaHasta) body.fechaHasta = this.fechaHasta;
    if (this.busqueda.trim()) body.busqueda = this.busqueda.trim();

    this.http
      .post<{ data: ConsumoOT[]; total: number }>(apiUrl('/operaciones/consumos/list'), body)
      .pipe(catchError(() => of({ data: [], total: 0 })))
      .subscribe(res => {
        this.filas = res.data;
        this.total = res.total;
        this.cargando = false;
      });
  }
}

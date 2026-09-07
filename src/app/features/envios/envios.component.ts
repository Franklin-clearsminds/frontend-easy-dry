import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { EnvioSuministro } from '../../core/models';

@Component({
  selector: 'app-envios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in pb-12">

      <!-- Header -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mb-2">
            <i-lucide name="send" class="w-3.5 h-3.5"></i-lucide>
            <span>Logística de Suministros</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Envíos & Confirmación de Recepción</h1>
          <p class="text-slate-500 text-xs mt-1">
            Control logístico de envíos desde Bodega Central hacia Agencias receptoras con validación de estado y tiempos.
          </p>
        </div>
        @if (puedeAcciones) {
          <button
            type="button"
            (click)="abrirModalCrearEnvio()"
            class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide name="plus" class="w-4 h-4"></i-lucide>
            <span>Crear Envío de Suministro</span>
          </button>
        }
      </div>

      <!-- Filtros -->
      <app-filter-bar
        [showFechas]="true"
        [showSucursal]="true"
        [showEstado]="true"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Tabla de Envíos -->
      <div class="bg-white rounded-3xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 border-b">
                <th class="py-3.5 px-4">Código Envío</th>
                <th class="py-3.5 px-3">Fecha & Salida</th>
                <th class="py-3.5 px-4">Agencia Destino</th>
                <th class="py-3.5 px-4">Insumos Enviados</th>
                <th class="py-3.5 px-3">Resp. Envío</th>
                <th class="py-3.5 px-3">Resp. Recepción</th>
                <th class="py-3.5 px-3 text-center">Tiempos</th>
                <th class="py-3.5 px-3 text-center">Estado</th>
                <th class="py-3.5 px-4 text-right">Acciones de Agencia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              @for (env of enviosFiltrados; track env.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4 font-mono font-extrabold text-easydry-blue">{{ env.codigoEnvio }}</td>
                  <td class="py-3.5 px-3">
                    <p class="font-bold text-slate-800">{{ env.fecha }}</p>
                    <span class="text-[10px] text-slate-400 font-mono">{{ env.horaInicio || '08:00' }}</span>
                  </td>
                  <td class="py-3.5 px-4 font-bold text-slate-900">
                    {{ env.sucursalNombre }}
                    <p class="text-[10px] text-slate-400 font-normal">{{ env.ciudad }}</p>
                  </td>
                  <td class="py-3.5 px-4">
                    <div class="space-y-0.5">
                      @for (p of env.productos; track p.nombreProducto) {
                        <div class="text-[11px] text-slate-700">
                          <strong>{{ p.cantidad }} {{ p.unidad }}</strong> - {{ p.nombreProducto }}
                        </div>
                      }
                    </div>
                  </td>
                  <td class="py-3.5 px-3 text-slate-600 text-[11px]">{{ env.responsableEnvio }}</td>
                  <td class="py-3.5 px-3 text-[11px]">
                    @if (env.responsableRecepcion) {
                      <span class="font-bold text-purple-800">{{ env.responsableRecepcion }}</span>
                    } @else {
                      <span class="text-slate-400 italic">Pendiente de arribo</span>
                    }
                  </td>
                  <td class="py-3.5 px-3 text-center">
                    @if (env.duracionMin) {
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                        {{ env.duracionMin }} min
                      </span>
                    } @else {
                      <span class="text-[10px] text-slate-400 font-mono">En ruta</span>
                    }
                  </td>
                  <td class="py-3.5 px-3 text-center">
                    <span
                      class="px-2.5 py-1 rounded-full text-[10px] font-extrabold"
                      [ngClass]="{
                        'bg-amber-100 text-amber-800 border border-amber-200': env.estado === 'PENDIENTE',
                        'bg-blue-100 text-blue-800 border border-blue-200': env.estado === 'ENVIADO',
                        'bg-emerald-100 text-emerald-800 border border-emerald-200': env.estado === 'RECIBIDO',
                        'bg-rose-100 text-rose-800 border border-rose-200': env.estado === 'RECHAZADO'
                      }">
                      {{ env.estado }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    @if (env.estado === 'ENVIADO' && puedeAcciones) {
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="confirmarRecepcionEnvio(env)"
                          class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1">
                          <i-lucide name="check" class="w-3.5 h-3.5"></i-lucide>
                          <span>Confirmar</span>
                        </button>
                        <button
                          type="button"
                          (click)="abrirModalRechazo(env)"
                          class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1">
                          <i-lucide name="x" class="w-3.5 h-3.5"></i-lucide>
                          <span>Rechazar</span>
                        </button>
                      </div>
                    } @else if (env.estado === 'RECIBIDO') {
                      <span class="text-[11px] font-bold text-emerald-700">&#10003; Recepci&#243;n Verificada</span>
                    } @else if (env.estado === 'RECHAZADO') {
                      <span class="text-[11px] font-bold text-rose-700" [title]="env.motivoRechazo || 'Rechazado'">&#10005; Rechazado: {{ env.motivoRechazo || 'Discrepancia' }}</span>
                    } @else {
                      <span class="text-[11px] text-slate-400 italic">Esperando despacho</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="py-12 text-center text-slate-400 text-xs font-medium">
                    No hay envíos que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL RECHAZO -->
      <app-modal
        [isOpen]="modalRechazoOpen"
        title="Rechazar Envío de Suministros"
        icon="alert-triangle"
        (close)="modalRechazoOpen = false">
        @if (envioSeleccionadoRechazo) {
          <div class="space-y-4">
            <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              Está a punto de registrar una disconformidad para el envío <strong>{{ envioSeleccionadoRechazo.codigoEnvio }}</strong> hacia <strong>{{ envioSeleccionadoRechazo.sucursalNombre }}</strong>.
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del Rechazo / No Conformidad</label>
              <textarea
                [(ngModel)]="motivoRechazoTexto"
                rows="3"
                placeholder="Indique la causa: Insumos dañados en tránsito, discrepancia en unidades recibidas, producto equivocado..."
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                required>
              </textarea>
            </div>
          </div>
        }
        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalRechazoOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            (click)="confirmarRechazoEnvio()"
            [disabled]="!motivoRechazoTexto.trim()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer">
            Confirmar Rechazo
          </button>
        </div>
      </app-modal>

      <!-- MODAL CREAR ENVÍO -->
      <app-modal
        [isOpen]="modalCrearEnvioOpen"
        title="Crear y Despachar Envío de Suministros"
        icon="send"
        (close)="modalCrearEnvioOpen = false">
        <form (ngSubmit)="guardarNuevoEnvio()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia / Sucursal Destino</label>
            <select
              [(ngModel)]="nuevoEnvioForm.sucursalNombre"
              name="sucursalDestino"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
              <option value="EasyDry Quito Norte">EasyDry Quito Norte (Quito)</option>
              <option value="EasyDry Quito Sur">EasyDry Quito Sur (Quito)</option>
              <option value="EasyDry Cumbayá">EasyDry Cumbayá (Quito)</option>
              <option value="EasyDry Guayaquil">EasyDry Guayaquil (Guayaquil)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Insumo Principal</label>
            <select
              [(ngModel)]="nuevoEnvioForm.insumoNombre"
              name="insumo"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
              <option value="Shampoo Ecológico Concentrado">Shampoo Ecológico Concentrado (Galón)</option>
              <option value="Cera Línea Brillo Espejo">Cera Línea Brillo Espejo (Galón)</option>
              <option value="Microfibras Ultra Absorbentes 40x40">Microfibras Ultra Absorbentes (Pack x10)</option>
              <option value="Desengrasante Biodegradable">Desengrasante Biodegradable (Caneca)</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad</label>
              <input
                type="number"
                [(ngModel)]="nuevoEnvioForm.cantidad"
                name="cantidad"
                min="1"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridad / Observación</label>
              <input
                type="text"
                [(ngModel)]="nuevoEnvioForm.observacion"
                name="obs"
                placeholder="Ej. Despacho urgente para fin de semana"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">
            </div>
          </div>
        </form>
        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalCrearEnvioOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            (click)="guardarNuevoEnvio()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
            Despachar Envío
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class EnviosComponent {
  private auth = inject(AuthService);
  private toastService = inject(ToastService);

  get puedeAcciones(): boolean {
    return this.auth.can('accionesEnvios');
  }

  // Filtros
  filtroTexto = '';
  filtroEstado = 'Todos';
  filtroSucursal = 'Todas';

  // Modales
  modalRechazoOpen = false;
  modalCrearEnvioOpen = false;
  envioSeleccionadoRechazo: EnvioSuministro | null = null;
  motivoRechazoTexto = '';
  nuevoEnvioForm = {
    sucursalNombre: 'EasyDry Quito Norte',
    insumoNombre: 'Shampoo Ecológico Concentrado',
    cantidad: 5,
    observacion: ''
  };

  envios: EnvioSuministro[] = [
    {
      id: 1,
      codigoEnvio: 'ENV-2026-001',
      fecha: '2026-09-01',
      fechaEnvio: '2026-09-01 08:30',
      horaInicio: '08:30',
      fechaRecepcion: '2026-09-01 11:15',
      horaFin: '11:15',
      duracionMin: 165,
      sucursalId: 1,
      sucursalNombre: 'EasyDry Quito Norte',
      ciudad: 'Quito',
      productos: [
        { productoId: 1, nombreProducto: 'Shampoo Ecológico Concentrado', cantidad: 5, unidad: 'Galón' },
        { productoId: 2, nombreProducto: 'Cera Línea Brillo Espejo', cantidad: 3, unidad: 'Galón' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      responsableRecepcion: 'Carlos Mendoza (Gerente)',
      estado: 'RECIBIDO',
      observaciones: 'Despacho prioritario recibido en perfecto estado.'
    },
    {
      id: 2,
      codigoEnvio: 'ENV-2026-002',
      fecha: '2026-09-02',
      fechaEnvio: '2026-09-02 07:45',
      horaInicio: '07:45',
      sucursalId: 4,
      sucursalNombre: 'EasyDry Guayaquil',
      ciudad: 'Guayaquil',
      productos: [
        { productoId: 3, nombreProducto: 'Microfibras Ultra Absorbentes 40x40', cantidad: 20, unidad: 'Pack x10' },
        { productoId: 4, nombreProducto: 'Desengrasante Biodegradable', cantidad: 4, unidad: 'Caneca' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      estado: 'ENVIADO',
      observaciones: 'Envío en tránsito terrestre hacia la agencia.'
    },
    {
      id: 3,
      codigoEnvio: 'ENV-2026-003',
      fecha: '2026-09-02',
      horaInicio: '09:00',
      sucursalId: 3,
      sucursalNombre: 'EasyDry Cumbayá',
      ciudad: 'Quito',
      productos: [
        { productoId: 1, nombreProducto: 'Shampoo Ecológico Concentrado', cantidad: 2, unidad: 'Galón' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      estado: 'PENDIENTE',
      observaciones: 'Por embalar en bodega central.'
    },
    {
      id: 4,
      codigoEnvio: 'ENV-2026-004',
      fecha: '2026-09-03',
      fechaEnvio: '2026-09-03 10:00',
      horaInicio: '10:00',
      sucursalId: 1,
      sucursalNombre: 'EasyDry Quito Norte',
      ciudad: 'Quito',
      productos: [
        { productoId: 2, nombreProducto: 'Cera Línea Brillo Espejo', cantidad: 2, unidad: 'Galón' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      estado: 'ENVIADO',
      observaciones: 'Envío express para evento corporativo.'
    },
    {
      id: 5,
      codigoEnvio: 'ENV-2026-005',
      fecha: '2026-09-03',
      fechaEnvio: '2026-09-03 11:30',
      horaInicio: '11:30',
      sucursalId: 2,
      sucursalNombre: 'EasyDry Quito Sur',
      ciudad: 'Quito',
      productos: [
        { productoId: 1, nombreProducto: 'Shampoo Ecológico Concentrado', cantidad: 3, unidad: 'Galón' },
        { productoId: 3, nombreProducto: 'Microfibras Ultra Absorbentes 40x40', cantidad: 10, unidad: 'Pack x10' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      estado: 'ENVIADO',
      observaciones: 'Reabastecimiento semanal.'
    },
    {
      id: 6,
      codigoEnvio: 'ENV-2026-006',
      fecha: '2026-09-02',
      fechaEnvio: '2026-09-02 14:00',
      horaInicio: '14:00',
      sucursalId: 2,
      sucursalNombre: 'EasyDry Quito Sur',
      ciudad: 'Quito',
      productos: [
        { productoId: 4, nombreProducto: 'Desengrasante Biodegradable', cantidad: 2, unidad: 'Caneca' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      responsableRecepcion: 'Laura Paredes (Gerente)',
      estado: 'RECIBIDO',
      duracionMin: 120,
      observaciones: 'Despacho estándar verificado.'
    },
    {
      id: 7,
      codigoEnvio: 'ENV-2026-007',
      fecha: '2026-09-04',
      horaInicio: '08:00',
      sucursalId: 3,
      sucursalNombre: 'EasyDry Cumbayá',
      ciudad: 'Quito',
      productos: [
        { productoId: 2, nombreProducto: 'Cera Línea Brillo Espejo', cantidad: 1, unidad: 'Galón' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      estado: 'PENDIENTE',
      observaciones: 'Pendiente de asignación de motorista.'
    },
    {
      id: 8,
      codigoEnvio: 'ENV-2026-008',
      fecha: '2026-09-03',
      fechaEnvio: '2026-09-03 16:00',
      horaInicio: '16:00',
      sucursalId: 4,
      sucursalNombre: 'EasyDry Guayaquil',
      ciudad: 'Guayaquil',
      productos: [
        { productoId: 1, nombreProducto: 'Shampoo Ecológico Concentrado', cantidad: 4, unidad: 'Galón' }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      responsableRecepcion: 'Diana Salazar (Gerente)',
      estado: 'RECIBIDO',
      duracionMin: 180,
      observaciones: 'Entrega completada en bodega local.'
    }
  ];

  get enviosFiltrados(): EnvioSuministro[] {
    const user = this.auth.getCurrentUser();
    const rol = user?.role;
    const verTodas = rol === 'SUPER_ADMIN' || rol === 'ADMIN' || rol === 'DISTRIBUIDOR' || rol === 'ASISTENTE_BODEGA';

    return this.envios.filter(env => {
      const matchSucursalUsuario = verTodas || env.sucursalNombre === user?.sucursal;

      const matchTexto = !this.filtroTexto.trim() ||
        env.codigoEnvio.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        env.sucursalNombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        env.ciudad.toLowerCase().includes(this.filtroTexto.toLowerCase());

      const matchEstado = this.filtroEstado === 'Todos' || env.estado === this.filtroEstado;

      const matchSucursalFiltro = this.filtroSucursal === 'Todas' || env.sucursalNombre === this.filtroSucursal;

      return matchSucursalUsuario && matchTexto && matchEstado && matchSucursalFiltro;
    });
  }

  aplicarNuevosFiltros(filtros: any): void {
    this.filtroTexto = filtros.busqueda || '';
    this.filtroEstado = filtros.estado || 'Todos';
    this.filtroSucursal = filtros.sucursal || 'Todas';
  }

  // =========================================================================
  // ENVÍOS Y CONFIRMACIÓN / RECHAZO
  // =========================================================================

  abrirModalCrearEnvio(): void {
    this.nuevoEnvioForm = {
      sucursalNombre: 'EasyDry Quito Norte',
      insumoNombre: 'Shampoo Ecológico Concentrado',
      cantidad: 5,
      observacion: ''
    };
    this.modalCrearEnvioOpen = true;
  }

  guardarNuevoEnvio(): void {
    const nextId = this.envios.length + 1;
    const nuevo: EnvioSuministro = {
      id: nextId,
      codigoEnvio: `ENV-2026-00${nextId}`,
      fecha: new Date().toISOString().split('T')[0],
      fechaEnvio: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString().substring(0, 5)}`,
      horaInicio: new Date().toLocaleTimeString().substring(0, 5),
      sucursalId: nextId,
      sucursalNombre: this.nuevoEnvioForm.sucursalNombre,
      ciudad: this.nuevoEnvioForm.sucursalNombre.includes('Guayaquil') ? 'Guayaquil' : 'Quito',
      productos: [
        {
          productoId: 1,
          nombreProducto: this.nuevoEnvioForm.insumoNombre,
          cantidad: this.nuevoEnvioForm.cantidad,
          unidad: 'Unidades'
        }
      ],
      responsableEnvio: 'Distribuidor Central (Bodega)',
      estado: 'ENVIADO',
      observaciones: this.nuevoEnvioForm.observacion || 'Envío despachado desde Bodega Central'
    };

    this.envios.unshift(nuevo);
    this.modalCrearEnvioOpen = false;
    this.toastService.success(
      'Envío Despachado',
      `Envío ${nuevo.codigoEnvio} en tránsito hacia ${nuevo.sucursalNombre}.`
    );
  }

  confirmarRecepcionEnvio(env: EnvioSuministro): void {
    const ahora = new Date();
    env.estado = 'RECIBIDO';
    env.fechaRecepcion = ahora.toISOString().split('T')[0];
    env.horaFin = ahora.toLocaleTimeString().substring(0, 5);
    env.responsableRecepcion = this.auth.getCurrentUser()?.nombre
      ? `${this.auth.getCurrentUser()?.nombre} ${this.auth.getCurrentUser()?.apellido || ''} (Receptor)`.trim()
      : 'Gerente de Sucursal';
    env.duracionMin = 140;

    this.toastService.success(
      'Recepción Confirmada',
      `El envío ${env.codigoEnvio} fue verificado y recibido en ${env.sucursalNombre}.`
    );
  }

  abrirModalRechazo(env: EnvioSuministro): void {
    this.envioSeleccionadoRechazo = env;
    this.motivoRechazoTexto = '';
    this.modalRechazoOpen = true;
  }

  confirmarRechazoEnvio(): void {
    if (!this.envioSeleccionadoRechazo || !this.motivoRechazoTexto.trim()) return;

    this.envioSeleccionadoRechazo.estado = 'RECHAZADO';
    this.envioSeleccionadoRechazo.motivoRechazo = this.motivoRechazoTexto.trim();
    this.modalRechazoOpen = false;

    this.toastService.warning(
      'Envío Rechazado',
      `Se registró disconformidad para ${this.envioSeleccionadoRechazo.codigoEnvio}: ${this.motivoRechazoTexto}`
    );
  }
}

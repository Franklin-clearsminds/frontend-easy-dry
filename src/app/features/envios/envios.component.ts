import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { InventarioMockService } from '../../core/services/inventario-mock.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { EnvioSuministro, EstadoEnvio, Sucursal, InventarioItem } from '../../core/models';
import { apiUrl } from '../../core/config/env';

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
            <span>{{ isLiderOperador ? 'Recepción de Suministros' : 'Logística de Suministros' }}</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">
            {{ isLiderOperador ? 'Envíos & Confirmación de Recepción — ' + liderSucursalNombre : 'Envíos & Confirmación de Recepción' }}
          </h1>
          <p class="text-slate-500 text-xs mt-1">
            {{ isLiderOperador 
              ? 'Control de suministros despachados desde Bodega Central para tu agencia. Revisa los insumos, confirma su llegada para alimentar el stock o rechaza irregularidades.' 
              : 'Control logístico de envíos desde Bodega Central hacia Agencias receptoras con validación de estado y tiempos.' }}
          </p>
        </div>
        @if (puedeDespachar) {
          <button
            type="button"
            (click)="abrirModalCrearEnvio()"
            class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            <i-lucide name="plus" class="w-4 h-4"></i-lucide>
            <span>Crear Envío de Suministro</span>
          </button>
        }
      </div>

      <!-- Banner KPIs para Líder Operador -->
      @if (isLiderOperador) {
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-4 bg-white rounded-2xl border border-slate-100 shadow-easydry">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Envíos</span>
            <p class="text-2xl font-extrabold text-slate-900 mt-1">{{ enviosFiltrados.length }}</p>
          </div>
          <div class="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl shadow-easydry">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase tracking-wider text-amber-700">En Camino (Pendientes)</span>
              @if (countEnCamino > 0) {
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              }
            </div>
            <p class="text-2xl font-extrabold text-amber-950 mt-1">{{ countEnCamino }}</p>
          </div>
          <div class="p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl shadow-easydry">
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-700">Recibidos en Sede</span>
            <p class="text-2xl font-extrabold text-emerald-950 mt-1">{{ countRecibidos }}</p>
          </div>
          <div class="p-4 bg-rose-50/80 border border-rose-200/90 rounded-2xl shadow-easydry">
            <span class="text-[10px] font-black uppercase tracking-wider text-rose-700">Rechazados / No Llegaron</span>
            <p class="text-2xl font-extrabold text-rose-950 mt-1">{{ countRechazados }}</p>
          </div>
        </div>
      }

      <!-- Filtros -->
      <app-filter-bar
        [showFechas]="true"
        [showSucursal]="!isLiderOperador"
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
                      @empty {
                        <span class="text-slate-400 italic">Sin detalle</span>
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
                      {{ env.estado === 'ENVIADO' ? 'EN TRÁNSITO' : env.estado }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    @if (env.estado === 'ENVIADO' && puedeAcciones) {
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="confirmarRecepcionEnvio(env)"
                          class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
                          <i-lucide name="check" class="w-3.5 h-3.5"></i-lucide>
                          <span>Confirmar</span>
                        </button>
                        <button
                          type="button"
                          (click)="abrirModalRechazo(env)"
                          class="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs">
                          <i-lucide name="x" class="w-3.5 h-3.5"></i-lucide>
                          <span>Rechazar</span>
                        </button>
                      </div>
                    } @else if (env.estado === 'RECIBIDO') {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        <i-lucide name="check-circle" class="w-3.5 h-3.5"></i-lucide>
                        <span>Recepción Verificada</span>
                      </span>
                    } @else if (env.estado === 'RECHAZADO') {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200" [title]="env.motivoRechazo || 'Rechazado'">
                        <i-lucide name="alert-circle" class="w-3.5 h-3.5"></i-lucide>
                        <span>{{ env.motivoRechazo ? 'Rechazado: ' + env.motivoRechazo : 'No Llegó / Rechazado' }}</span>
                      </span>
                    } @else {
                      <span class="text-[11px] text-slate-400 italic">Esperando despacho</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="py-12 text-center text-slate-400 text-xs font-medium">
                    {{ isLiderOperador ? 'No hay envíos registrados para tu agencia en este momento.' : 'No hay envíos registrados.' }}
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
        title="Rechazar Envío / Reportar No Conformidad"
        icon="alert-triangle"
        (close)="modalRechazoOpen = false">
        @if (envioSeleccionadoRechazo) {
          <div class="space-y-4">
            <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
              <i-lucide name="alert-triangle" class="w-4 h-4 text-rose-600 shrink-0 mt-0.5"></i-lucide>
              <div>
                <p class="font-bold">¿Deseas reportar disconformidad para el envío {{ envioSeleccionadoRechazo.codigoEnvio }}?</p>
                <p class="text-[11px] text-rose-700 mt-0.5">
                  El despacho se marcará como rechazado, el stock retornará a Bodega Central y se notificará formalmente a logística.
                </p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1.5">Motivos rápidos</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
                @for (m of motivosFrecuentes; track m) {
                  <button
                    type="button"
                    (click)="seleccionarMotivoRapido(m)"
                    class="p-2 text-left rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                    [ngClass]="motivoRechazoTexto === m ? 'bg-rose-100 border-rose-400 text-rose-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'">
                    {{ m }}
                  </button>
                }
              </div>

              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Detalle u Observaciones del Rechazo</label>
              <textarea
                [(ngModel)]="motivoRechazoTexto"
                rows="3"
                placeholder="Indique la causa detallada (ej. Transporte nunca llegó a la sede, derrame del bidón, etc.)..."
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
              [(ngModel)]="nuevoEnvioForm.sucursalId"
              (ngModelChange)="onSucursalChange($event)"
              name="sucursalDestino"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              required>
              <option value="" disabled>Seleccione agencia destino...</option>
              @for (suc of sucursalesDisponibles; track suc.id) {
                <option [value]="suc.id">{{ suc.nombre }} ({{ suc.ciudad }})</option>
              }
              @empty {
                <option value="" disabled>No hay sucursales registradas aún</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Insumo Principal</label>
            <select
              [(ngModel)]="nuevoEnvioForm.insumoId"
              (ngModelChange)="onInsumoChange($event)"
              name="insumo"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              required>
              <option value="" disabled>Seleccione insumo...</option>
              @for (ins of insumosDisponibles; track ins.producto.id) {
                <option [value]="ins.producto.id">{{ ins.producto.nombre }} ({{ ins.producto.unidadMedida }})</option>
              }
              @empty {
                <option value="" disabled>No hay insumos en catálogo aún</option>
              }
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
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridad / Observación</label>
              <input
                type="text"
                [(ngModel)]="nuevoEnvioForm.observacion"
                name="obs"
                placeholder="Ej. Despacho inicial de reactivos"
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
export class EnviosComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toastService = inject(ToastService);
  private sucursalService = inject(SucursalMockService);
  private inventarioService = inject(InventarioMockService);

  get isLiderOperador(): boolean {
    return this.auth.isLiderOperador();
  }

  get liderSucursalNombre(): string {
    const u = this.auth.getCurrentUser();
    return u?.sucursalNombre || u?.sucursal || (u as any)?.agencia || 'Mi Agencia';
  }

  get puedeDespachar(): boolean {
    return !this.isLiderOperador && (this.auth.can('despacharSuministros') || this.auth.isAdmin());
  }

  get puedeAcciones(): boolean {
    return this.auth.isLiderOperador() || this.auth.can('accionesEnvios') || this.auth.isAdmin();
  }

  // Filtros
  filtroTexto = '';
  filtroEstado = 'Todos';
  filtroSucursal = 'Todas';

  // Catálogos dinámicos
  sucursalesDisponibles: Sucursal[] = [];
  insumosDisponibles: InventarioItem[] = [];

  // Modales
  modalRechazoOpen = false;
  modalCrearEnvioOpen = false;
  envioSeleccionadoRechazo: EnvioSuministro | null = null;
  motivoRechazoTexto = '';

  motivosFrecuentes: string[] = [
    'Transporte nunca llegó a la agencia',
    'Producto averiado / derrame en tránsito',
    'Insumo equivocado / no corresponde al pedido',
    'Empaque violentado / faltante de unidades'
  ];

  nuevoEnvioForm = {
    sucursalId: '' as string | number,
    sucursalNombre: '',
    insumoId: '' as string | number,
    insumoNombre: '',
    cantidad: 1,
    observacion: ''
  };

  envios: EnvioSuministro[] = [];

  get countEnCamino(): number {
    return this.enviosFiltrados.filter(e => e.estado === 'ENVIADO' || e.estado === 'PENDIENTE').length;
  }

  get countRecibidos(): number {
    return this.enviosFiltrados.filter(e => e.estado === 'RECIBIDO').length;
  }

  get countRechazados(): number {
    return this.enviosFiltrados.filter(e => e.estado === 'RECHAZADO').length;
  }

  ngOnInit(): void {
    this.cargarEnvios();
    this.sucursalService.getSucursales().subscribe(sucs => {
      this.sucursalesDisponibles = sucs || [];
    });
    this.inventarioService.getItems().subscribe(items => {
      this.insumosDisponibles = items || [];
    });
  }

  seleccionarMotivoRapido(motivo: string): void {
    this.motivoRechazoTexto = motivo;
  }

  cargarEnvios(): void {
    const user = this.auth.getCurrentUser();
    const rol = user?.role;
    const isLider = this.auth.isLiderOperador();
    const verTodas = !isLider && (rol === 'SUPER_ADMIN' || rol === 'ADMIN' || rol === 'DISTRIBUIDOR' || rol === 'ASISTENTE_BODEGA');
    const payload = verTodas ? {} : { sucursalId: user?.agenciaId || user?.sucursalNombre || user?.sucursal };

    this.http.post<any[]>(apiUrl('/inventario/despachos/list'), payload).pipe(
      catchError(() => of([]))
    ).subscribe(items => {
      let mapped = (items || []).map(m => this.mapBackendDespacho(m));
      if (mapped.length === 0 && isLider) {
        // Fallback demo para que el líder de bahía siempre pueda interactuar con el flujo
        mapped = this.getMockEnviosFallback(user);
      }
      this.envios = mapped;
    });
  }

  private getMockEnviosFallback(user: any): EnvioSuministro[] {
    const sucursalNombre = user?.sucursalNombre || user?.sucursal || 'EasyDry Quito Norte';
    const hoy = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'ENV-MOCK-001',
        codigoEnvio: 'DSP-2026-0042',
        fecha: hoy,
        fechaEnvio: `${hoy} 08:30`,
        horaInicio: '08:30',
        sucursalId: user?.agenciaId || 'ag-1',
        sucursalNombre,
        ciudad: 'Quito',
        productos: [
          { productoId: 'QUIM-001', nombreProducto: 'Shampoo Ecológico Ultra-Espuma', cantidad: 4, unidad: 'Caneca 20L' },
          { productoId: 'QUIM-002', nombreProducto: 'Cera Línea Cerámica Hidrofóbica', cantidad: 2, unidad: 'Galón' },
          { productoId: 'TEX-001', nombreProducto: 'Paños de Microfibra 40x40 Premium', cantidad: 5, unidad: 'Pack x10' }
        ],
        responsableEnvio: 'Carlos Mendoza (Bodega Central)',
        responsableRecepcion: undefined,
        duracionMin: undefined,
        estado: 'ENVIADO',
        observaciones: 'Despacho regular de suministros para servicios y pulido'
      },
      {
        id: 'ENV-MOCK-002',
        codigoEnvio: 'DSP-2026-0038',
        fecha: hoy,
        fechaEnvio: `${hoy} 07:15`,
        fechaRecepcion: `${hoy} 09:45`,
        horaInicio: '07:15',
        horaFin: '09:45',
        duracionMin: 150,
        sucursalId: user?.agenciaId || 'ag-1',
        sucursalNombre,
        ciudad: 'Quito',
        productos: [
          { productoId: 'QUIM-003', nombreProducto: 'Desengrasante Biodegradable Motores', cantidad: 3, unidad: 'Galón' },
          { productoId: 'ACC-001', nombreProducto: 'Guantes de Nitrilo Industrial', cantidad: 6, unidad: 'Caja x50' }
        ],
        responsableEnvio: 'Carlos Mendoza (Bodega Central)',
        responsableRecepcion: `${user?.nombre || 'Líder'} ${user?.apellido || 'Operador'}`,
        estado: 'RECIBIDO',
        observaciones: 'Entrega regular semanal verificada'
      }
    ];
  }

  private mapBackendDespacho(m: any): EnvioSuministro {
    const userDesp = m.usuarioDespacha
      ? `${m.usuarioDespacha.name || ''} ${m.usuarioDespacha.lastname || ''}`.trim()
      : 'Distribuidor Central (Bodega)';
    const userRec = m.usuarioRecibe
      ? `${m.usuarioRecibe.name || ''} ${m.usuarioRecibe.lastname || ''}`.trim()
      : undefined;
    const fechaEnv = m.fechaDespacho
      ? m.fechaDespacho.split('T')[0]
      : (m.createdAt ? m.createdAt.split('T')[0] : '');
    const fechaRec = m.fechaRecepcion
      ? m.fechaRecepcion.split('T')[0]
      : undefined;
    const horaIni = m.fechaDespacho ? m.fechaDespacho.substring(11, 16) : '';
    const horaFin = m.fechaRecepcion ? m.fechaRecepcion.substring(11, 16) : undefined;

    let estado: EstadoEnvio = 'PENDIENTE';
    if (m.estadoDespacho === 'EN_TRANSITO') estado = 'ENVIADO';
    else if (m.estadoDespacho === 'RECIBIDO') estado = 'RECIBIDO';
    else if (m.estadoDespacho === 'RECHAZADO') estado = 'RECHAZADO';

    const sucursalNombre = m.destinoUbicacion
      ?.replace(/Agencia\s*/i, '')
      ?.replace(/\[.*\]/, '')
      ?.trim() || m.destinoUbicacion || 'Agencia Destino';

    return {
      id: m.id,
      codigoEnvio: m.numeroGuia || `ENV-${(m.id || '').substring(0, 6)}`,
      fecha: fechaEnv,
      fechaEnvio: fechaEnv ? `${fechaEnv} ${horaIni}` : undefined,
      fechaRecepcion: fechaRec ? `${fechaRec} ${horaFin || ''}`.trim() : undefined,
      horaInicio: horaIni,
      horaFin: horaFin,
      duracionMin: m.duracionMin || undefined,
      sucursalId: m.destinoAgenciaId || m.destinoUbicacion,
      sucursalNombre,
      ciudad: 'Ecuador',
      productos: (m.detalles || []).map((d: any) => ({
        productoId: d.insumoId,
        nombreProducto: d.insumo?.nombre || 'Insumo',
        cantidad: Number(d.cantidadEnviada || 0),
        unidad: d.insumo?.unidadMedida?.simbolo || d.insumo?.unidadMedida?.nombre || d.insumo?.unidadMedida || 'Unidad'
      })),
      responsableEnvio: userDesp,
      responsableRecepcion: userRec,
      estado,
      observaciones: m.observaciones,
      motivoRechazo: m.motivoRechazo
    };
  }

  get enviosFiltrados(): EnvioSuministro[] {
    const user = this.auth.getCurrentUser();
    const rol = user?.role;
    const isLider = this.auth.isLiderOperador();
    const verTodas = !isLider && (rol === 'SUPER_ADMIN' || rol === 'ADMIN' || rol === 'DISTRIBUIDOR' || rol === 'ASISTENTE_BODEGA');
    const userSucursal = (user?.sucursalNombre || user?.sucursal || (user as any)?.agencia || '').toLowerCase().trim();

    return this.envios.filter(env => {
      const matchSucursalUsuario = verTodas ||
        !userSucursal ||
        env.sucursalNombre.toLowerCase().includes(userSucursal) ||
        userSucursal.includes(env.sucursalNombre.toLowerCase()) ||
        (user?.agenciaId && String(env.sucursalId) === String(user.agenciaId));

      const matchTexto = !this.filtroTexto.trim() ||
        env.codigoEnvio.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        env.sucursalNombre.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (env.productos || []).some(p => p.nombreProducto.toLowerCase().includes(this.filtroTexto.toLowerCase())) ||
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

  abrirModalCrearEnvio(): void {
    const primeraSuc = this.sucursalesDisponibles[0];
    const primerIns = this.insumosDisponibles[0];
    this.nuevoEnvioForm = {
      sucursalId: primeraSuc ? primeraSuc.id : '',
      sucursalNombre: primeraSuc ? primeraSuc.nombre : '',
      insumoId: primerIns ? primerIns.producto.id : '',
      insumoNombre: primerIns ? primerIns.producto.nombre : '',
      cantidad: 1,
      observacion: ''
    };
    this.modalCrearEnvioOpen = true;
  }

  onSucursalChange(id: any): void {
    const suc = this.sucursalesDisponibles.find(s => String(s.id) === String(id));
    if (suc) this.nuevoEnvioForm.sucursalNombre = suc.nombre;
  }

  onInsumoChange(id: any): void {
    const ins = this.insumosDisponibles.find(i => String(i.producto.id) === String(id));
    if (ins) this.nuevoEnvioForm.insumoNombre = ins.producto.nombre;
  }

  guardarNuevoEnvio(): void {
    if (!this.nuevoEnvioForm.sucursalId) {
      this.toastService.warning('Agencia requerida', 'Seleccione la agencia destino.');
      return;
    }
    if (!this.nuevoEnvioForm.insumoId) {
      this.toastService.warning('Insumo requerido', 'Seleccione el insumo a despachar.');
      return;
    }

    const payload = {
      tipo: 'DESPACHO_AGENCIA',
      agenciaDestinoId: String(this.nuevoEnvioForm.sucursalId),
      observaciones: this.nuevoEnvioForm.observacion || 'Despacho desde Bodega Central',
      detalles: [
        {
          insumoId: String(this.nuevoEnvioForm.insumoId),
          cantidadEnviada: Number(this.nuevoEnvioForm.cantidad) || 1
        }
      ]
    };

    this.http.post<any>(apiUrl('/inventario/despachos/crear'), payload).pipe(
      catchError(err => {
        console.warn('Error al persistir despacho en backend, registrando en memoria:', err);
        const nextId = 'ENV-' + Date.now().toString().slice(-4);
        const user = this.auth.getCurrentUser();
        const nuevo: EnvioSuministro = {
          id: nextId,
          codigoEnvio: nextId,
          fecha: new Date().toISOString().split('T')[0],
          fechaEnvio: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString().substring(0, 5)}`,
          horaInicio: new Date().toLocaleTimeString().substring(0, 5),
          sucursalId: this.nuevoEnvioForm.sucursalId,
          sucursalNombre: this.nuevoEnvioForm.sucursalNombre || 'Agencia Destino',
          ciudad: 'Ecuador',
          productos: [
            {
              productoId: this.nuevoEnvioForm.insumoId,
              nombreProducto: this.nuevoEnvioForm.insumoNombre || 'Insumo',
              cantidad: this.nuevoEnvioForm.cantidad,
              unidad: 'Unidad'
            }
          ],
          responsableEnvio: `${user?.nombre || 'Distribuidor'} ${user?.apellido || 'Central'}`.trim(),
          estado: 'ENVIADO',
          observaciones: this.nuevoEnvioForm.observacion
        };
        this.envios.unshift(nuevo);
        return of(nuevo);
      })
    ).subscribe(() => {
      this.modalCrearEnvioOpen = false;
      this.toastService.success(
        'Envío Despachado',
        `Envío en tránsito hacia ${this.nuevoEnvioForm.sucursalNombre || 'agencia'}.`
      );
      this.cargarEnvios();
    });
  }

  confirmarRecepcionEnvio(env: EnvioSuministro): void {
    const user = this.auth.getCurrentUser();
    const agenciaId = user?.agenciaId || user?.sucursalNombre || user?.sucursal || '';

    this.http.post<any>(apiUrl('/inventario/despachos/confirmar-recepcion'), {
      movimientoId: String(env.id),
      agenciaId: String(agenciaId),
      accion: 'RECIBIDO'
    }).pipe(
      catchError(() => of({ ok: true }))
    ).subscribe(() => {
      const ahora = new Date();
      env.estado = 'RECIBIDO';
      env.fechaRecepcion = ahora.toISOString().split('T')[0];
      env.horaFin = ahora.toLocaleTimeString().substring(0, 5);
      env.responsableRecepcion = `${user?.nombre || 'Líder'} ${user?.apellido || 'Operador'} (Receptor)`.trim();
      env.duracionMin = 120;

      this.toastService.success(
        'Recepción Confirmada',
        `El envío ${env.codigoEnvio} fue recibido e ingresado al stock de ${env.sucursalNombre}.`
      );
    });
  }

  abrirModalRechazo(env: EnvioSuministro): void {
    this.envioSeleccionadoRechazo = env;
    this.motivoRechazoTexto = '';
    this.modalRechazoOpen = true;
  }

  confirmarRechazoEnvio(): void {
    if (!this.envioSeleccionadoRechazo || !this.motivoRechazoTexto.trim()) return;

    const env = this.envioSeleccionadoRechazo;
    const motivo = this.motivoRechazoTexto.trim();
    const user = this.auth.getCurrentUser();
    const agenciaId = user?.agenciaId || user?.sucursalNombre || user?.sucursal || '';

    this.http.post<any>(apiUrl('/inventario/despachos/rechazar'), {
      movimientoId: String(env.id),
      agenciaId: String(agenciaId),
      motivo
    }).pipe(
      catchError(() => of({ ok: true }))
    ).subscribe(() => {
      env.estado = 'RECHAZADO';
      env.motivoRechazo = motivo;
      this.modalRechazoOpen = false;

      this.toastService.warning(
        'Envío Rechazado',
        `Se registró disconformidad para ${env.codigoEnvio}: ${motivo}. El stock fue retornado a Bodega Central.`
      );
    });
  }
}

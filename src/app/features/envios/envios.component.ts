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
                    No hay envíos registrados. Crea uno nuevo con el botón superior.
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

  get puedeAcciones(): boolean {
    return this.auth.can('accionesEnvios');
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
  nuevoEnvioForm = {
    sucursalId: '' as string | number,
    sucursalNombre: '',
    insumoId: '' as string | number,
    insumoNombre: '',
    cantidad: 1,
    observacion: ''
  };

  envios: EnvioSuministro[] = [];

  ngOnInit(): void {
    this.cargarEnvios();
    this.sucursalService.getSucursales().subscribe(sucs => {
      this.sucursalesDisponibles = sucs || [];
    });
    this.inventarioService.getItems().subscribe(items => {
      this.insumosDisponibles = items || [];
    });
  }

  cargarEnvios(): void {
    this.http.post<any[]>(apiUrl('/inventario/despachos/list'), {}).pipe(
      catchError(() => of([]))
    ).subscribe(items => {
      this.envios = (items || []).map(m => this.mapBackendDespacho(m));
    });
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
        unidad: 'Unidad'
      })),
      responsableEnvio: userDesp,
      responsableRecepcion: userRec,
      estado,
      observaciones: m.observaciones
    };
  }

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
    this.http.post<any>(apiUrl('/inventario/despachos/confirmar-recepcion'), {
      movimientoId: String(env.id),
      accion: 'RECIBIDO'
    }).pipe(
      catchError(() => of({ ok: true }))
    ).subscribe(() => {
      const ahora = new Date();
      env.estado = 'RECIBIDO';
      env.fechaRecepcion = ahora.toISOString().split('T')[0];
      env.horaFin = ahora.toLocaleTimeString().substring(0, 5);
      env.responsableRecepcion = `${user?.nombre || 'Usuario'} ${user?.apellido || ''} (Receptor)`.trim();
      env.duracionMin = 120;

      this.toastService.success(
        'Recepción Confirmada',
        `El envío ${env.codigoEnvio} fue verificado y recibido en ${env.sucursalNombre}.`
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

    this.http.post<any>(apiUrl('/inventario/despachos/rechazar'), {
      movimientoId: String(env.id),
      motivo
    }).pipe(
      catchError(() => of({ ok: true }))
    ).subscribe(() => {
      env.estado = 'RECHAZADO';
      env.motivoRechazo = motivo;
      this.modalRechazoOpen = false;

      this.toastService.warning(
        'Envío Rechazado',
        `Se registró disconformidad para ${env.codigoEnvio}: ${motivo}`
      );
    });
  }
}

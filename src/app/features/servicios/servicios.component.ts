import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ServicioLavadoMockService } from '../../core/services/servicio-lavado-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { VehiculoServicio, CatalogoServicio } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { Role } from '../../core/models/roles.model';
import { CatalogoServiciosMockService } from '../../core/services/catalogo-servicios-mock.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header Banner -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-2">
            <i-lucide name="car" class="w-3.5 h-3.5"></i-lucide>
            <span>Digitalización de Hoja de Control de Servicio</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Control y Registro de Servicios de Lavado</h1>
          <p class="text-slate-500 text-xs mt-1">Digitalización del proceso físico: OT, placa, evidencias en vídeo/fotos y flujo de aprobación por Gerencia.</p>

          <!-- Contexto Operador -->
          @if (isOperador) {
            <div class="flex items-center gap-3 mt-3 flex-wrap">
              <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-easydry-green/10 border border-easydry-green/20 text-easydry-green-dark text-xs font-bold">
                <i-lucide name="building-2" class="w-3.5 h-3.5"></i-lucide>
                <span>{{ authService.getCurrentUser()?.sucursalNombre }}</span>
              </div>
              <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-easydry-blue/10 border border-easydry-blue/20 text-easydry-blue text-xs font-bold">
                <i-lucide name="hard-drive" class="w-3.5 h-3.5"></i-lucide>
                <span>{{ authService.getCurrentUser()?.bahiaNombre }}</span>
              </div>
              <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                <i-lucide name="info" class="w-3.5 h-3.5"></i-lucide>
                <span>Solo ves tus servicios registrados</span>
              </div>
            </div>
          }
        </div>

        <button
          (click)="modalNuevoRegistroOpen = true"
          class="px-4 py-3 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2">
          <i-lucide name="plus" class="w-4 h-4"></i-lucide>
          <span>Nueva Hoja de Control (OT)</span>
        </button>
      </div>

      <!-- Filter Controls Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          
          <div class="relative flex-1 min-w-[200px]">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <i-lucide name="search" class="w-4 h-4"></i-lucide>
            </span>
            <input 
              type="text" 
              [(ngModel)]="filtroTexto" 
              placeholder="Buscar por placa (ej. PBX-8932) u Orden OT..." 
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
          </div>

          <select [(ngModel)]="filtroCategoria" class="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2">
            <option value="Todas">Todas las Categorías</option>
            <option value="Servicios Generales">Servicios Generales</option>
            <option value="Servicios Especiales">Servicios Especiales</option>
          </select>

          <select [(ngModel)]="filtroEstado" class="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl px-3 py-2">
            <option value="Todos">Todos los Estados</option>
            <option value="EN PROCESO">EN PROCESO</option>
            <option value="FINALIZADO">FINALIZADO</option>
            <option value="APROBADO">APROBADO</option>
            <option value="RECHAZADO">RECHAZADO</option>
          </select>

        </div>

        <div class="text-xs font-semibold text-slate-500">
          Servicios Registrados: <strong class="text-easydry-blue">{{ serviciosFiltrados.length }} Vehículos</strong>
        </div>
      </div>

      <!-- Services List / Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Orden & OT</th>
                <th class="py-3.5 px-4">Vehículo</th>
                <th class="py-3.5 px-4">Categoría & Servicio</th>
                <th class="py-3.5 px-4">Sucursal / Bahía</th>
                <th class="py-3.5 px-4">Horarios</th>
                <th class="py-3.5 px-4">Operador</th>
                <th class="py-3.5 px-4">Estado Workflow</th>
                <th class="py-3.5 px-4 text-center">Evidencia</th>
                <th class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (item of paginatedServicios; track item.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4">
                    <span class="font-mono font-extrabold text-xs text-easydry-blue bg-easydry-blue/10 px-2.5 py-1 rounded-lg block w-fit">
                      {{ item.ordenTrabajoOT || 'OT-9800' }}
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono block mt-0.5">{{ item.numeroOrden || 'ORD-2026' }}</span>
                  </td>

                  <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900 text-xs">{{ item.marca }} {{ item.modelo }}</div>
                    <div class="text-xs font-mono font-extrabold text-easydry-blue">{{ item.placa }}</div>
                    <div class="text-[10px] text-slate-500 font-semibold">{{ item.color }} ({{ item.anio }})</div>
                  </td>

                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2 py-0.5 rounded text-[10px] font-extrabold block w-fit mb-1"
                      [ngClass]="item.categoriaServicio === 'ESPECIAL' || item.categoriaServicio === 'Servicios Especiales' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'">
                      {{ item.categoriaServicio === 'ESPECIAL' ? 'Servicios Especiales' : (item.categoriaServicio === 'GENERAL' ? 'Servicios Generales' : item.categoriaServicio) || 'Servicios Generales' }}
                    </span>
                    <span class="font-bold text-slate-900 text-xs">{{ item.servicio }}</span>
                  </td>

                  <td class="py-3.5 px-4 text-xs">
                    <p class="font-bold text-slate-800">{{ item.agencia }}</p>
                    <p class="text-[11px] text-easydry-blue font-semibold">{{ item.bahia || 'Bahía 1' }}</p>
                  </td>

                  <td class="py-3.5 px-4 text-xs font-mono">
                    <p class="text-slate-700 font-semibold">Ing: {{ item.horaIngreso || '08:30' }}</p>
                    <p class="text-slate-400">Sal: {{ item.horaSalida || '09:30' }}</p>
                  </td>

                  <td class="py-3.5 px-4 text-xs font-bold text-slate-800">
                    {{ item.empleado }}
                  </td>

                  <td class="py-3.5 px-4">
                    <span 
                      class="px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5"
                      [ngClass]="{
                        'bg-amber-100 text-amber-800 border border-amber-300': item.estado === 'EN PROCESO',
                        'bg-easydry-blue/15 text-easydry-blue border border-easydry-blue/30': item.estado === 'FINALIZADO',
                        'bg-easydry-green/20 text-easydry-green-dark border border-easydry-green/40': item.estado === 'APROBADO',
                        'bg-rose-100 text-rose-800 border border-rose-300': item.estado === 'RECHAZADO'
                      }">
                      <span>{{ item.estado }}</span>
                    </span>
                  </td>

                  <td class="py-3.5 px-4 text-center">
                    @if (item.video || item.videoUrl) {
                      <button 
                        (click)="verVideoEvidencia(item)"
                        class="p-2 bg-slate-100 hover:bg-easydry-blue hover:text-white text-easydry-blue rounded-xl text-xs transition-colors inline-flex items-center gap-1 font-bold shadow-2xs">
                        <i-lucide name="film" class="w-4 h-4 text-easydry-green"></i-lucide>
                        <span>Ver Vídeo</span>
                      </button>
                    } @else {
                      <span class="text-[11px] text-slate-400 italic">Sin vídeo</span>
                    }
                  </td>

                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      @if (canFinalizar(item)) {
                        <button
                          (click)="finalizarServicio(item)"
                          class="px-3 py-1.5 bg-easydry-blue text-white font-bold rounded-lg text-xs hover:bg-easydry-blue-dark transition-colors">
                          Finalizar Servicio
                        </button>
                      }

                      @if (item.estado === 'FINALIZADO' && canApprove) {
                        <button
                          (click)="aprobarServicio(item)"
                          class="px-3 py-1.5 bg-easydry-green text-slate-950 font-extrabold rounded-lg text-xs hover:bg-easydry-green-dark transition-colors shadow-xs">
                          Aprobar
                        </button>
                      }

                      @if (item.estado === 'APROBADO') {
                        <span class="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-bold flex items-center gap-1">
                          <i-lucide name="check-circle-2" class="w-3.5 h-3.5"></i-lucide>
                          Aprobado
                        </span>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination 
          [totalItems]="serviciosFiltrados.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal Digital HOJA DE CONTROL DE SERVICIO (Nueva OT) -->
      <app-modal 
        [isOpen]="modalNuevoRegistroOpen" 
        title="Digitalización: HOJA DE CONTROL DE SERVICIO" 
        icon="car"
        (close)="modalNuevoRegistroOpen = false">
        
        <form (ngSubmit)="guardarHojaServicio()" class="space-y-4">
          
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-easydry-blue flex items-center justify-between">
            <span>REGISTRO DE ORDEN DE TRABAJO (OT)</span>
            <span class="font-mono">Fecha: {{ nuevoRegistro.fecha }}</span>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nº Orden</label>
              <input type="text" [(ngModel)]="nuevoRegistro.numeroOrden" name="numeroOrden" placeholder="ORD-2026-005" class="w-full p-2 border rounded-xl text-xs font-mono" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nº OT (Orden Trabajo)</label>
              <input type="text" [(ngModel)]="nuevoRegistro.ordenTrabajoOT" name="ordenTrabajoOT" placeholder="OT-9840" class="w-full p-2 border rounded-xl text-xs font-mono" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Placa Vehículo</label>
              <input type="text" [(ngModel)]="nuevoRegistro.placa" name="placa" placeholder="PBX-1234" class="w-full p-2 border rounded-xl text-xs font-mono font-bold uppercase" required>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Marca</label>
              <input type="text" [(ngModel)]="nuevoRegistro.marca" name="marca" placeholder="Toyota" class="w-full p-2 border rounded-xl text-xs" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Modelo</label>
              <input type="text" [(ngModel)]="nuevoRegistro.modelo" name="modelo" placeholder="Corolla Cross" class="w-full p-2 border rounded-xl text-xs" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Color</label>
              <input type="text" [(ngModel)]="nuevoRegistro.color" name="color" placeholder="Blanco" class="w-full p-2 border rounded-xl text-xs" required>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Hora Ingreso</label>
              <input type="time" [(ngModel)]="nuevoRegistro.horaIngreso" name="horaIngreso" class="w-full p-2 border rounded-xl text-xs font-mono" required>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Hora Salida Estimada</label>
              <input type="time" [(ngModel)]="nuevoRegistro.horaSalida" name="horaSalida" class="w-full p-2 border rounded-xl text-xs font-mono" required>
            </div>
          </div>

          <!-- Category and Specific Service -->
          <div class="p-3 bg-easydry-blue/5 rounded-2xl border border-easydry-blue/20 space-y-3">
            <label class="block text-xs font-extrabold text-easydry-blue uppercase">Categoría de Servicio</label>
            
            <div class="grid grid-cols-2 gap-3">
              <label 
                class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold"
                [ngClass]="nuevoRegistro.categoriaServicio === 'GENERAL' ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-700'">
                <input type="radio" [(ngModel)]="nuevoRegistro.categoriaServicio" name="catRadio" value="GENERAL" (change)="onCategoriaChange()" class="hidden">
                <span>🧼 Servicios Generales</span>
              </label>

              <label 
                class="p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 text-xs font-bold"
                [ngClass]="nuevoRegistro.categoriaServicio === 'ESPECIAL' ? 'bg-easydry-blue text-white border-easydry-blue' : 'bg-white text-slate-700'">
                <input type="radio" [(ngModel)]="nuevoRegistro.categoriaServicio" name="catRadio" value="ESPECIAL" (change)="onCategoriaChange()" class="hidden">
                <span>⭐ Servicios Especiales</span>
              </label>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1">Servicio Específico</label>
              <select [(ngModel)]="nuevoRegistro.servicio" name="servicio" class="w-full p-2.5 border rounded-xl text-xs font-bold">
                @for (s of opcionesServicios; track s.id) {
                  <option [value]="s.nombre">{{ s.nombre }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Video Proof Upload -->
          <div class="space-y-1.5">
            <label class="block text-[11px] font-bold text-slate-700 uppercase">Evidencia Vídeo de Ingreso (Video URL / Carga)</label>
            <input 
              type="text" 
              [(ngModel)]="nuevoRegistro.videoUrl" 
              name="videoUrl" 
              placeholder="https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4" 
              class="w-full p-2.5 border rounded-xl text-xs font-mono">
            <p class="text-[10px] text-slate-400">Vídeo demostrativo del estado inicial del automóvil al ingresar a la bahía.</p>
          </div>

        </form>

        <div modal-footer>
          <button (click)="modalNuevoRegistroOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarHojaServicio()" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs">Guardar e Iniciar Servicio</button>
        </div>
      </app-modal>

      <!-- Modal Reproductor de Vídeo Evidencia -->
      <app-modal 
        [isOpen]="modalVideoOpen" 
        [title]="'Evidencia en Vídeo: ' + (servicioSeleccionado?.placa || '')" 
        icon="film"
        (close)="modalVideoOpen = false">
        
        @if (servicioSeleccionado) {
          <div class="space-y-4">
            <div class="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              <video 
                [src]="servicioSeleccionado.videoUrl || servicioSeleccionado.video || 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4'" 
                controls 
                autoplay 
                class="w-full h-full object-contain">
              </video>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p class="font-bold text-slate-900">{{ servicioSeleccionado.marca }} {{ servicioSeleccionado.modelo }} ({{ servicioSeleccionado.placa }})</p>
              <p class="text-slate-500">Orden: <strong>{{ servicioSeleccionado.ordenTrabajoOT }}</strong> • Atendido por: <strong>{{ servicioSeleccionado.empleado }}</strong></p>
            </div>
          </div>
        }

        <div modal-footer>
          <button (click)="modalVideoOpen = false" class="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl text-xs">Cerrar Vídeo</button>
        </div>
      </app-modal>

    </div>
  `
})
export class ServiciosComponent implements OnInit {
  servicios: VehiculoServicio[] = [];
  servicioSeleccionado?: VehiculoServicio;

  filtroTexto = '';
  filtroCategoria = 'Todas';
  filtroEstado = 'Todos';

  currentPage = 1;
  pageSize = 5;

  modalNuevoRegistroOpen = false;
  modalVideoOpen = false;

  opcionesServicios: CatalogoServicio[] = [];
  catalogoCompleto: CatalogoServicio[] = [];

  nuevoRegistro = {
    numeroOrden: 'ORD-2026-005',
    ordenTrabajoOT: 'OT-9840',
    placa: 'PDK-5510',
    marca: 'Kia',
    modelo: 'Sportage R',
    anio: 2024,
    color: 'Rojo Pasión',
    categoriaServicio: 'GENERAL',
    servicio: '',
    servicioId: 0,
    categoria: 'SUV',
    agencia: 'EasyDry Quito Norte',
    bahia: 'Bahía 1 (Lavado Ecológico)',
    empleado: 'Juan Pérez',
    fecha: '2026-07-22',
    horaIngreso: '10:00',
    horaSalida: '10:45',
    foto: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-car-wash-in-a-machine-41484-large.mp4'
  };

  private catalogoMock = inject(CatalogoServiciosMockService);

  private servicioService = inject(ServicioLavadoMockService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);

  // ── Role helpers ──
  get isOperador() { return this.authService.hasRole(Role.OPERADOR); }
  get isGerente() { return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.GERENTE]); }
  get isSuperAdmin() { return this.authService.hasRole(Role.SUPER_ADMIN); }

  /** Solo Gerente y SuperAdmin pueden aprobar servicios */
  get canApprove() {
    return this.authService.hasAnyRole([Role.SUPER_ADMIN, Role.GERENTE]);
  }

  /** El operador solo puede finalizar sus PROPIOS servicios */
  canFinalizar(item: VehiculoServicio): boolean {
    if (!this.isOperador) return item.estado === 'EN PROCESO';
    const nombreOperador = `${this.authService.getCurrentUser()?.nombre} ${this.authService.getCurrentUser()?.apellido}`;
    return item.estado === 'EN PROCESO' && item.empleado?.toLowerCase().includes(
      (this.authService.getCurrentUser()?.nombre ?? '').toLowerCase()
    );
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();

    // Pre-rellenar el formulario de nueva OT con el contexto del usuario autenticado
    if (user) {
      const nombreCompleto = `${user.nombre} ${user.apellido}`;
      this.nuevoRegistro.empleado = nombreCompleto;
      if (user.sucursalNombre) this.nuevoRegistro.agencia = user.sucursalNombre;
      if (user.bahiaNombre) this.nuevoRegistro.bahia = user.bahiaNombre;
    }

    this.servicioService.getServicios().subscribe(list => {
      this.servicios = list;
    });

    this.catalogoMock.getServiciosActivos().subscribe(cat => {
      this.catalogoCompleto = cat;
      this.onCategoriaChange();
    });
  }

  onCategoriaChange() {
    this.opcionesServicios = this.catalogoCompleto.filter(s => s.categoria === this.nuevoRegistro.categoriaServicio);
    if (this.opcionesServicios.length > 0) {
      this.nuevoRegistro.servicio = this.opcionesServicios[0].nombre;
      this.nuevoRegistro.servicioId = this.opcionesServicios[0].id;
    } else {
      this.nuevoRegistro.servicio = '';
      this.nuevoRegistro.servicioId = 0;
    }
  }

  /**
   * Filtrado de servicios con scoping por rol:
   * - OPERADOR: solo ve sus propios servicios (filtrado por nombre)
   * - GERENTE: solo ve servicios de su sucursal
   * - SUPER_ADMIN: ve todos
   */
  get serviciosFiltrados() {
    const user = this.authService.getCurrentUser();
    const role = this.authService.getRole();

    return this.servicios.filter(s => {
      // ── Scope por Rol ──
      if (role === Role.OPERADOR && user) {
        // El operador solo ve sus propios registros
        const mismoOperador = s.empleado?.toLowerCase().includes(user.nombre.toLowerCase());
        if (!mismoOperador) return false;
      } else if (role === Role.GERENTE && user?.sucursalNombre) {
        // El gerente solo ve su sucursal
        const mismoSucursal = s.agencia?.toLowerCase().includes(
          user.sucursalNombre!.replace('EasyDry ', '').toLowerCase()
        );
        if (!mismoSucursal) return false;
      } else if (role === Role.SUPERVISOR && user?.sucursalNombre) {
        // El supervisor solo ve su sucursal
        const mismoSucursal = s.agencia?.toLowerCase().includes(
          user.sucursalNombre!.replace('EasyDry ', '').toLowerCase()
        );
        if (!mismoSucursal) return false;
      }
      // SUPER_ADMIN: sin filtro adicional

      // ── Filtros de UI ──
      const matchTexto = !this.filtroTexto ||
        s.placa.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        (s.ordenTrabajoOT && s.ordenTrabajoOT.toLowerCase().includes(this.filtroTexto.toLowerCase()));
      const matchCat = this.filtroCategoria === 'Todas' || s.categoriaServicio === this.filtroCategoria;
      const matchEst = this.filtroEstado === 'Todos' || s.estado === this.filtroEstado;

      return matchTexto && matchCat && matchEst;
    });
  }

  get paginatedServicios() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.serviciosFiltrados.slice(start, end);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  guardarHojaServicio() {
    if (!this.nuevoRegistro.placa || !this.nuevoRegistro.ordenTrabajoOT) {
      this.toastService.warning('Campos Incompletos', 'Ingrese placa y Nº de OT.');
      return;
    }

    this.servicioService.crearRegistroHojaServicio(this.nuevoRegistro as any).subscribe(creado => {
      this.toastService.success('Hoja de Control Creada', `Servicio ${creado.ordenTrabajoOT} (${creado.placa}) registrado en estado EN PROCESO.`);
      this.modalNuevoRegistroOpen = false;
    });
  }

  finalizarServicio(item: VehiculoServicio) {
    this.servicioService.finalizarServicioOperador(item.id).subscribe(res => {
      if (res) {
        this.toastService.success('Servicio Finalizado', `Vehículo ${item.placa} finalizado. Enviado a Aprobación del Gerente.`);
      }
    });
  }

  aprobarServicio(item: VehiculoServicio) {
    this.servicioService.aprobarServicioGerente(item.id).subscribe(res => {
      if (res) {
        this.toastService.success('Servicio Aprobado', `Servicio ${item.placa} aprobado por Gerencia.`);
      }
    });
  }

  verVideoEvidencia(item: VehiculoServicio) {
    this.servicioSeleccionado = item;
    this.modalVideoOpen = true;
  }
}

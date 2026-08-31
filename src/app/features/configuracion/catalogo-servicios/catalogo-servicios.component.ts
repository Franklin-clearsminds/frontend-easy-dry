import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogoServiciosMockService } from '../../../core/services/catalogo-servicios-mock.service';
import { InventarioMockService } from '../../../core/services/inventario-mock.service';
import { OperadorMockService } from '../../../core/services/operador-mock.service';
import { ServiciosExtrasMockService } from '../../../core/services/servicios-extras-mock.service';
import { CatalogoServicio, RecetaInsumoServicio, InventarioItem, Operador, ServicioExtra } from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalPortalDirective } from '../../../shared/directives/modal-portal.directive';

const SUCURSALES_RED = ['EasyDry Quito Norte', 'EasyDry Quito Sur', 'EasyDry Cumbayá', 'EasyDry Guayaquil'];

@Component({
  selector: 'app-catalogo-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PaginationComponent, ModalPortalDirective],
  templateUrl: './catalogo-servicios.component.html'
})
export class CatalogoServiciosComponent implements OnInit {
  private catalogoService = inject(CatalogoServiciosMockService);
  private inventarioService = inject(InventarioMockService);
  private operadorService = inject(OperadorMockService);
  private extrasService = inject(ServiciosExtrasMockService);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabActiva: 'generales' | 'especiales' = 'generales';

  // ── Catálogo de servicios generales y especiales ─────────────────────────
  servicios: CatalogoServicio[] = [];
  productosInventario: InventarioItem[] = [];

  // ── Filtros y paginación: SERVICIOS GENERALES ─────────────────────────────
  busquedaGenerales = '';
  filtroEstadoGenerales = 'TODOS';
  currentPageGenerales = 1;
  pageSizeGenerales = 5;

  // ── Filtros y paginación: SERVICIOS ESPECIALES ────────────────────────────
  busquedaEspeciales = '';
  filtroEstadoEspeciales = 'TODOS';
  currentPageEspeciales = 1;
  pageSizeEspeciales = 5;

  // ── Modal de creación / edición (Generales & Especiales) ─────────────────
  showModal = false;
  isEditing = false;
  servicioActual: Partial<CatalogoServicio> = {
    categoria: 'GENERAL',
    estado: 'Activo',
    requiereFoto: false,
    requiereVideo: false,
    insumosReceta: []
  };

  // ── Servicios Extras ──────────────────────────────────────────────────────
  serviciosExtras: ServicioExtra[] = [];
  operadores: Operador[] = [];
  sucursalesDisponibles = SUCURSALES_RED;

  busquedaExtras = '';
  filtroEstadoExtras = 'TODOS';
  filtroOperadorExtras = 0;

  currentPageExtras = 1;
  pageSizeExtras = 5;

  showModalExtras = false;
  isEditingExtras = false;
  editandoExtraId: number | null = null;

  extraForm: {
    servicioNombre: string;
    servicioDescripcion: string;
    operadorId: number;
    operadorNombre: string;
    sucursalesSeleccionadas: string[];
    insumosReceta: RecetaInsumoServicio[];
    estado: ServicioExtra['estado'];
    fechaProgramada: string;
    notas: string;
  } = {
    servicioNombre: '',
    servicioDescripcion: '',
    operadorId: 0,
    operadorNombre: '',
    sucursalesSeleccionadas: [],
    insumosReceta: [],
    estado: 'Pendiente',
    fechaProgramada: new Date().toISOString().substring(0, 10),
    notas: ''
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.cargarServicios();
    this.inventarioService.getItems().subscribe(items => {
      this.productosInventario = items;
    });
    this.operadorService.getOperadores().subscribe(ops => {
      this.operadores = ops;
    });
    this.extrasService.getServiciosExtras().subscribe(extras => {
      this.serviciosExtras = extras;
    });
  }

  // ── Getters de servicios por categoría ───────────────────────────────────
  get serviciosGenerales(): CatalogoServicio[] {
    return this.servicios.filter(s => s.categoria === 'GENERAL');
  }

  get serviciosEspeciales(): CatalogoServicio[] {
    return this.servicios.filter(s => s.categoria === 'ESPECIAL' || s.categoria === 'EXTRA');
  }

  // ── Conteos de estado para las stats cards de extras ─────────────────────
  get extrasPendientes()  { return this.serviciosExtras.filter(e => e.estado === 'Pendiente').length; }
  get extrasEnProceso()   { return this.serviciosExtras.filter(e => e.estado === 'En Proceso').length; }
  get extrasCompletados() { return this.serviciosExtras.filter(e => e.estado === 'Completado').length; }
  get extrasCancelados()  { return this.serviciosExtras.filter(e => e.estado === 'Cancelado').length; }

  // ── Cargar servicios ─────────────────────────────────────────────────────
  cargarServicios() {
    this.catalogoService.servicios$.subscribe(data => {
      this.servicios = data;
    });
  }

  // ── SERVICIOS GENERALES: Filtrado & Paginación ───────────────────────────
  get generalesFiltrados(): CatalogoServicio[] {
    return this.serviciosGenerales.filter(s => {
      const matchEst = this.filtroEstadoGenerales === 'TODOS' || s.estado === this.filtroEstadoGenerales;
      const matchTxt = this.busquedaGenerales === '' ||
                       s.nombre.toLowerCase().includes(this.busquedaGenerales.toLowerCase()) ||
                       s.codigo.toLowerCase().includes(this.busquedaGenerales.toLowerCase());
      return matchEst && matchTxt;
    });
  }

  get paginatedGenerales(): CatalogoServicio[] {
    const start = (this.currentPageGenerales - 1) * this.pageSizeGenerales;
    return this.generalesFiltrados.slice(start, start + this.pageSizeGenerales);
  }

  onPageChangeGenerales(page: number) { this.currentPageGenerales = page; }
  onPageSizeChangeGenerales(size: number) { this.pageSizeGenerales = size; this.currentPageGenerales = 1; }

  // ── SERVICIOS ESPECIALES: Filtrado & Paginación ──────────────────────────
  get especialesFiltrados(): CatalogoServicio[] {
    return this.serviciosEspeciales.filter(s => {
      const matchEst = this.filtroEstadoEspeciales === 'TODOS' || s.estado === this.filtroEstadoEspeciales;
      const matchTxt = this.busquedaEspeciales === '' ||
                       s.nombre.toLowerCase().includes(this.busquedaEspeciales.toLowerCase()) ||
                       s.codigo.toLowerCase().includes(this.busquedaEspeciales.toLowerCase());
      return matchEst && matchTxt;
    });
  }

  get paginatedEspeciales(): CatalogoServicio[] {
    const start = (this.currentPageEspeciales - 1) * this.pageSizeEspeciales;
    return this.especialesFiltrados.slice(start, start + this.pageSizeEspeciales);
  }

  onPageChangeEspeciales(page: number) { this.currentPageEspeciales = page; }
  onPageSizeChangeEspeciales(size: number) { this.pageSizeEspeciales = size; this.currentPageEspeciales = 1; }

  // ── Modal de creación / edición (Generales y Especiales) ─────────────────
  abrirModalNuevo(categoria: 'GENERAL' | 'ESPECIAL' = 'GENERAL') {
    this.isEditing = false;
    const count = categoria === 'GENERAL' ? this.serviciosGenerales.length + 1 : this.serviciosEspeciales.length + 1;
    const prefix = categoria === 'GENERAL' ? 'SER' : 'ESP';
    const nextCode = `${prefix}-00${count}`;
    
    this.servicioActual = {
      codigo: nextCode,
      nombre: '',
      descripcion: '',
      categoria: categoria,
      estado: 'Activo',
      requiereFoto: categoria === 'ESPECIAL',
      requiereVideo: categoria === 'ESPECIAL',
      insumosReceta: []
    };
    this.showModal = true;
  }

  abrirModalEditar(servicio: CatalogoServicio) {
    this.isEditing = true;
    this.servicioActual = {
      ...servicio,
      insumosReceta: servicio.insumosReceta ? JSON.parse(JSON.stringify(servicio.insumosReceta)) : []
    };
    this.showModal = true;
  }

  cerrarModal() { this.showModal = false; }

  agregarInsumoReceta(productoIdStr: string) {
    if (!productoIdStr) return;
    const prodId = Number(productoIdStr);
    const item = this.productosInventario.find(i => i.producto.id === prodId);
    if (!item) return;
    if (!this.servicioActual.insumosReceta) this.servicioActual.insumosReceta = [];
    const existe = this.servicioActual.insumosReceta.find(r => r.productoId === prodId);
    if (existe) {
      existe.cantidadSugerida += 1;
    } else {
      this.servicioActual.insumosReceta.push({
        productoId: item.producto.id,
        productoSKU: item.producto.codigoSKU,
        productoNombre: item.producto.nombre,
        unidadMedida: item.producto.unidadMedida,
        cantidadSugerida: 1
      });
    }
  }

  aumentarCantidadReceta(index: number) {
    if (this.servicioActual.insumosReceta?.[index]) {
      const actual = this.servicioActual.insumosReceta[index].cantidadSugerida;
      this.servicioActual.insumosReceta[index].cantidadSugerida = Math.round((actual + 0.5) * 10) / 10;
    }
  }

  disminuirCantidadReceta(index: number) {
    if (this.servicioActual.insumosReceta?.[index]) {
      const actual = this.servicioActual.insumosReceta[index].cantidadSugerida;
      if (actual > 0.5) this.servicioActual.insumosReceta[index].cantidadSugerida = Math.round((actual - 0.5) * 10) / 10;
    }
  }

  eliminarInsumoReceta(index: number) {
    this.servicioActual.insumosReceta?.splice(index, 1);
  }

  guardarServicio() {
    if (this.isEditing && this.servicioActual.id) {
      this.catalogoService.actualizarServicio(this.servicioActual.id, this.servicioActual).subscribe(() => this.cerrarModal());
    } else {
      this.catalogoService.crearServicio(this.servicioActual as any).subscribe(() => this.cerrarModal());
    }
  }

  toggleEstado(servicio: CatalogoServicio) {
    const nuevoEstado = servicio.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.catalogoService.cambiarEstado(servicio.id, nuevoEstado).subscribe();
  }

  // ── Servicios Extras ──────────────────────────────────────────────────────
  get extrasFiltrados() {
    return this.serviciosExtras.filter(e => {
      const matchEst = this.filtroEstadoExtras === 'TODOS' || e.estado === this.filtroEstadoExtras;
      const matchOp = this.filtroOperadorExtras === 0 || e.operadorId === this.filtroOperadorExtras;
      const matchTxt = this.busquedaExtras === '' ||
        e.servicioNombre.toLowerCase().includes(this.busquedaExtras.toLowerCase()) ||
        e.codigoSE.toLowerCase().includes(this.busquedaExtras.toLowerCase()) ||
        e.operadorNombre.toLowerCase().includes(this.busquedaExtras.toLowerCase());
      return matchEst && matchOp && matchTxt;
    });
  }

  get paginatedExtras() {
    const start = (this.currentPageExtras - 1) * this.pageSizeExtras;
    return this.extrasFiltrados.slice(start, start + this.pageSizeExtras);
  }

  onPageChangeExtras(page: number) { this.currentPageExtras = page; }
  onPageSizeChangeExtras(size: number) { this.pageSizeExtras = size; this.currentPageExtras = 1; }

  abrirModalNuevoExtra() {
    this.isEditingExtras = false;
    this.editandoExtraId = null;
    this.extraForm = {
      servicioNombre: '',
      servicioDescripcion: '',
      operadorId: this.operadores[0]?.id || 0,
      operadorNombre: this.operadores[0]?.nombre || '',
      sucursalesSeleccionadas: [],
      insumosReceta: [],
      estado: 'Pendiente',
      fechaProgramada: new Date().toISOString().substring(0, 10),
      notas: ''
    };
    this.showModalExtras = true;
  }

  abrirModalEditarExtra(extra: ServicioExtra) {
    this.isEditingExtras = true;
    this.editandoExtraId = extra.id;
    this.extraForm = {
      servicioNombre: extra.servicioNombre,
      servicioDescripcion: extra.servicioDescripcion || '',
      operadorId: extra.operadorId,
      operadorNombre: extra.operadorNombre,
      sucursalesSeleccionadas: [...extra.sucursales],
      insumosReceta: JSON.parse(JSON.stringify(extra.insumosReceta)),
      estado: extra.estado,
      fechaProgramada: extra.fechaProgramada,
      notas: extra.notas || ''
    };
    this.showModalExtras = true;
  }

  cerrarModalExtras() { this.showModalExtras = false; }

  onOperadorChange() {
    const op = this.operadores.find(o => o.id === Number(this.extraForm.operadorId));
    if (op) this.extraForm.operadorNombre = op.nombre;
  }

  toggleSucursal(sucursal: string) {
    const idx = this.extraForm.sucursalesSeleccionadas.indexOf(sucursal);
    if (idx === -1) {
      this.extraForm.sucursalesSeleccionadas.push(sucursal);
    } else {
      this.extraForm.sucursalesSeleccionadas.splice(idx, 1);
    }
  }

  isSucursalSeleccionada(sucursal: string): boolean {
    return this.extraForm.sucursalesSeleccionadas.includes(sucursal);
  }

  // Insumos del extra
  agregarInsumoExtra(productoIdStr: string) {
    if (!productoIdStr) return;
    const prodId = Number(productoIdStr);
    const item = this.productosInventario.find(i => i.producto.id === prodId);
    if (!item) return;
    const existe = this.extraForm.insumosReceta.find(r => r.productoId === prodId);
    if (existe) {
      existe.cantidadSugerida += 1;
    } else {
      this.extraForm.insumosReceta.push({
        productoId: item.producto.id,
        productoSKU: item.producto.codigoSKU,
        productoNombre: item.producto.nombre,
        unidadMedida: item.producto.unidadMedida,
        cantidadSugerida: 1
      });
    }
  }

  aumentarInsumoExtra(index: number) {
    const ins = this.extraForm.insumosReceta[index];
    if (ins) ins.cantidadSugerida = Math.round((ins.cantidadSugerida + 0.5) * 10) / 10;
  }

  disminuirInsumoExtra(index: number) {
    const ins = this.extraForm.insumosReceta[index];
    if (ins && ins.cantidadSugerida > 0.5) {
      ins.cantidadSugerida = Math.round((ins.cantidadSugerida - 0.5) * 10) / 10;
    }
  }

  eliminarInsumoExtra(index: number) {
    this.extraForm.insumosReceta.splice(index, 1);
  }

  guardarServicioExtra() {
    if (!this.extraForm.servicioNombre.trim() || !this.extraForm.operadorId) return;
    const payload = {
      servicioNombre: this.extraForm.servicioNombre.trim(),
      servicioDescripcion: this.extraForm.servicioDescripcion.trim(),
      operadorId: Number(this.extraForm.operadorId),
      operadorNombre: this.extraForm.operadorNombre,
      sucursales: this.extraForm.sucursalesSeleccionadas,
      insumosReceta: this.extraForm.insumosReceta,
      estado: this.extraForm.estado,
      fechaProgramada: this.extraForm.fechaProgramada,
      notas: this.extraForm.notas,
      creadoPor: 'Franklin Administrador'
    };

    if (this.isEditingExtras && this.editandoExtraId) {
      this.extrasService.actualizarServicioExtra(this.editandoExtraId, payload).subscribe(() => {
        this.cerrarModalExtras();
      });
    } else {
      this.extrasService.crearServicioExtra(payload).subscribe(() => {
        this.cerrarModalExtras();
      });
    }
  }

  cambiarEstadoExtra(extra: ServicioExtra, estado: ServicioExtra['estado']) {
    this.extrasService.cambiarEstado(extra.id, estado).subscribe();
  }

  eliminarExtra(id: number) {
    this.extrasService.eliminarServicioExtra(id).subscribe();
  }

  estadoExtraClass(estado: string): string {
    const map: Record<string, string> = {
      'Pendiente': 'bg-amber-50 text-amber-700 border-amber-200',
      'En Proceso': 'bg-blue-50 text-blue-700 border-blue-200',
      'Completado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Cancelado': 'bg-slate-100 text-slate-500 border-slate-200'
    };
    return map[estado] || 'bg-slate-100 text-slate-500 border-slate-200';
  }
}

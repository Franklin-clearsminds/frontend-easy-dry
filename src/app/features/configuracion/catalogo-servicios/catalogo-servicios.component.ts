import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogoServiciosMockService } from '../../../core/services/catalogo-servicios-mock.service';
import { InventarioMockService } from '../../../core/services/inventario-mock.service';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalMockService } from '../../../core/services/sucursal-mock.service';
import { CatalogoServicio, RecetaInsumoServicio, InventarioItem, Sucursal, Role } from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalPortalDirective } from '../../../shared/directives/modal-portal.directive';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-catalogo-servicios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, PaginationComponent, ModalPortalDirective],
  templateUrl: './catalogo-servicios.component.html'
})
export class CatalogoServiciosComponent implements OnInit {
  private catalogoService = inject(CatalogoServiciosMockService);
  private inventarioService = inject(InventarioMockService);
  public authService = inject(AuthService);
  private sucursalService = inject(SucursalMockService);

  // ── Scoping por sucursal (Líder / Aprobador) ────────────────────────────
  sucursalUsuario: Sucursal | null = null;
  serviciosSucursalIds: number[] = [];
  serviciosSucursalNombres: string[] = [];
  esLiderOperador = false;
  esUsuarioSucursal = false;
  tieneServiciosEspeciales = false;
  /** Verdadero cuando el Líder tiene agencia pero la agencia no tiene servicios configurados en BD */
  sinServiciosConfigurados = false;

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
    insumosReceta: []
  };

  // ── Selección temporal de insumos en modal ───────────────────────────────
  insumoSeleccionadoId = '';
  cantidadADescontar = 0.25;
  busquedaInsumoReceta = '';

  get insumosDisponiblesFiltrados(): InventarioItem[] {
    if (!this.busquedaInsumoReceta || !this.busquedaInsumoReceta.trim()) {
      return this.productosInventario;
    }
    const q = this.busquedaInsumoReceta.toLowerCase().trim();
    return this.productosInventario.filter(item => {
      const nom = (item.producto?.nombre || '').toLowerCase();
      const sku = (item.producto?.codigoSKU || '').toLowerCase();
      const uni = (item.producto?.unidadMedida || '').toLowerCase();
      return nom.includes(q) || sku.includes(q) || uni.includes(q);
    });
  }

  get insumoSeleccionadoActual(): InventarioItem | undefined {
    if (!this.insumoSeleccionadoId) return undefined;
    return this.productosInventario.find(i => String(i.producto.id) === String(this.insumoSeleccionadoId));
  }

  onInsumoSeleccionadoChange(id: string): void {
    this.insumoSeleccionadoId = id;
    const item = this.insumoSeleccionadoActual;
    if (item) {
      const u = (item.producto.unidadMedida || '').toLowerCase().trim();
      if (u === 'l' || u === 'litro' || u === 'litros') {
        this.cantidadADescontar = 0.25;
      } else if (u === 'ml' || u === 'mililitro' || u === 'mililitros') {
        this.cantidadADescontar = 100;
      } else if (u === 'kg' || u === 'kilo' || u === 'kilos') {
        this.cantidadADescontar = 0.1;
      } else if (u === 'g' || u === 'gramo' || u === 'gramos') {
        this.cantidadADescontar = 50;
      } else {
        this.cantidadADescontar = 1;
      }
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.detectarAmbitoUsuario();
    this.cargarServicios();
    this.inventarioService.cargarItems();
    this.inventarioService.getItems().subscribe(items => {
      this.productosInventario = items;
    });
  }

  detectarAmbitoUsuario(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const esSuperAdmin = this.authService.isSuperAdmin();
    const esAdmin = this.authService.isAdmin();

    this.esLiderOperador = !esSuperAdmin && !esAdmin && (this.authService.isLiderOperador() || user.role === Role.LIDER_OPERADOR);
    this.esUsuarioSucursal = !esSuperAdmin && !esAdmin && (this.esLiderOperador || !!(user.sucursalNombre || user.sucursal || user.agenciaId));

    const aplicarSucursal = (sucursales: Sucursal[]) => {
      if (!sucursales || sucursales.length === 0) return;
      const sucNombre = (user.sucursalNombre || user.sucursal || (user as any).agencia || '').toLowerCase().trim();
      const suc = sucursales.find(s =>
        (user.agenciaId && String(s.id) === String(user.agenciaId)) ||
        (s.liderOperadorId && (user as any).id && String(s.liderOperadorId) === String((user as any).id)) ||
        (s.nombre && s.nombre.toLowerCase() === sucNombre) ||
        (s.nombre && sucNombre && (s.nombre.toLowerCase().includes(sucNombre) || sucNombre.includes(s.nombre.toLowerCase())))
      );

      if (suc) {
        this.sucursalUsuario = suc;
        this.serviciosSucursalIds = Array.isArray(suc.servicioIds) ? suc.servicioIds.map(Number) : [];
        this.serviciosSucursalNombres = Array.isArray(suc.serviciosNombres) ? suc.serviciosNombres.map(n => n.toLowerCase().trim()) : [];
        if (!esSuperAdmin && !esAdmin) {
          this.esUsuarioSucursal = true;
        }
        this.recalcularTieneServiciosEspeciales();
      }
    };

    const activas = this.sucursalService.getActivas();
    if (activas && activas.length > 0) {
      aplicarSucursal(activas);
    }

    this.sucursalService.getSucursales().subscribe(sucursales => {
      aplicarSucursal(sucursales);
    });
  }

  servicioCorrespondeASucursal(s: CatalogoServicio): boolean {
    if (!this.esUsuarioSucursal) {
      return true;
    }
    if (!this.sucursalUsuario) {
      return false;
    }
    if (this.serviciosSucursalIds.length > 0 && this.serviciosSucursalIds.includes(Number(s.id))) {
      return true;
    }
    if (this.serviciosSucursalNombres.length > 0 && this.serviciosSucursalNombres.includes(s.nombre.toLowerCase().trim())) {
      return true;
    }
    return false;
  }

  get totalServiciosSucursal(): number {
    return this.serviciosGenerales.length + this.serviciosEspeciales.length;
  }

  // ── Getters de servicios por categoría ───────────────────────────────────
  get serviciosGenerales(): CatalogoServicio[] {
    let list = this.servicios.filter(s => s.categoria === 'GENERAL');
    if (this.esUsuarioSucursal && this.sucursalUsuario) {
      list = list.filter(s => this.servicioCorrespondeASucursal(s));
    }
    return list;
  }

  get serviciosEspeciales(): CatalogoServicio[] {
    let list = this.servicios.filter(s => s.categoria === 'ESPECIAL' || s.categoria === 'EXTRA');
    if (this.esUsuarioSucursal && this.sucursalUsuario) {
      list = list.filter(s => this.servicioCorrespondeASucursal(s));
    }
    return list;
  }

  // ── Cargar servicios ─────────────────────────────────────────────────────
  cargarServicios() {
    this.catalogoService.getServicios().subscribe();
    this.catalogoService.servicios$.subscribe(data => {
      this.servicios = data;
      this.recalcularTieneServiciosEspeciales();
    });
    // Usar el contexto de agencia devuelto por el backend (para LIDER/APROBADOR)
    this.catalogoService.agenciaCtx$.subscribe(ctx => {
      if (ctx !== null) {
        // Backend scoped response: usar directamente el flag de la agencia en BD
        this.tieneServiciosEspeciales = ctx.tieneServiciosEspeciales;
        this.sinServiciosConfigurados = this.esLiderOperador && ctx.servicioIds.length === 0;
        if (!this.tieneServiciosEspeciales && this.tabActiva === 'especiales') {
          this.tabActiva = 'generales';
        }
      }
    });
  }

  recalcularTieneServiciosEspeciales(): void {
    if (!this.sucursalUsuario) {
      const user = this.authService.getCurrentUser();
      const sucNombre = user && (user.sucursalNombre || user.sucursal || (user as any).agencia || '');
      this.tieneServiciosEspeciales =
        Boolean(user && user.agenciaId !== undefined && user.agenciaId !== null && user.agenciaId !== ''
          ? this.sucursalService.hasServiciosEspecialesActivos(user.agenciaId, sucNombre)
          : false);
      return;
    }
    const espIds = new Set(
      (this.servicios || [])
        .filter(s => s.categoria === 'ESPECIAL' || s.categoria === 'EXTRA')
        .map(s => Number(s.id))
    );
    const espNombres = new Set(
      (this.servicios || [])
        .filter(s => s.categoria === 'ESPECIAL' || s.categoria === 'EXTRA')
        .map(s => (s.nombre || '').toLowerCase().trim())
    );
    this.tieneServiciosEspeciales =
      Boolean((this.sucursalUsuario as any).tieneServiciosEspeciales) ||
      this.serviciosSucursalIds.some(id => espIds.has(Number(id))) ||
      this.serviciosSucursalNombres.some(n => espNombres.has(String(n).toLowerCase().trim()));

    if (!this.tieneServiciosEspeciales && this.esUsuarioSucursal && this.tabActiva === 'especiales') {
      this.tabActiva = 'generales';
    }
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
      insumosReceta: []
    };
    this.insumoSeleccionadoId = '';
    this.cantidadADescontar = 0.25;
    this.busquedaInsumoReceta = '';
    this.showModal = true;
  }

  abrirModalEditar(servicio: CatalogoServicio) {
    this.isEditing = true;
    this.servicioActual = {
      ...servicio,
      insumosReceta: servicio.insumosReceta ? JSON.parse(JSON.stringify(servicio.insumosReceta)) : []
    };
    this.insumoSeleccionadoId = '';
    this.cantidadADescontar = 0.25;
    this.busquedaInsumoReceta = '';
    this.showModal = true;
  }

  cerrarModal() { this.showModal = false; }

  agregarInsumoReceta(productoIdStr?: string, cantidadManual?: number) {
    const targetId = productoIdStr || this.insumoSeleccionadoId;
    if (!targetId) return;

    const item = this.productosInventario.find(i => String(i.producto.id) === String(targetId));
    if (!item) return;

    const cant = cantidadManual !== undefined ? Number(cantidadManual) : (Number(this.cantidadADescontar) || 1);
    if (cant <= 0) return;

    if (!this.servicioActual.insumosReceta) {
      this.servicioActual.insumosReceta = [];
    }

    const existe = this.servicioActual.insumosReceta.find(r => String(r.productoId) === String(targetId));
    if (existe) {
      existe.cantidadSugerida = Math.round((Number(existe.cantidadSugerida) + cant) * 100) / 100;
    } else {
      this.servicioActual.insumosReceta.push({
        productoId: item.producto.id,
        productoSKU: item.producto.codigoSKU,
        productoNombre: item.producto.nombre,
        unidadMedida: item.producto.unidadMedida || 'u',
        unidadMedidaId: item.producto.unidadMedidaId,
        cantidadSugerida: Math.round(cant * 100) / 100
      });
    }

    // Reset selección temporal
    this.insumoSeleccionadoId = '';
    this.cantidadADescontar = 0.25;
  }

  aumentarCantidadReceta(index: number) {
    if (this.servicioActual.insumosReceta?.[index]) {
      const actual = Number(this.servicioActual.insumosReceta[index].cantidadSugerida || 0);
      const step = actual < 1 ? 0.05 : 0.5;
      this.servicioActual.insumosReceta[index].cantidadSugerida = Math.round((actual + step) * 100) / 100;
    }
  }

  disminuirCantidadReceta(index: number) {
    if (this.servicioActual.insumosReceta?.[index]) {
      const actual = Number(this.servicioActual.insumosReceta[index].cantidadSugerida || 0);
      const step = actual <= 1 ? 0.05 : 0.5;
      if (actual > step) {
        this.servicioActual.insumosReceta[index].cantidadSugerida = Math.round((actual - step) * 100) / 100;
      }
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
}

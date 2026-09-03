import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogoServiciosMockService } from '../../../core/services/catalogo-servicios-mock.service';
import { InventarioMockService } from '../../../core/services/inventario-mock.service';
import { CatalogoServicio, RecetaInsumoServicio, InventarioItem } from '../../../core/models';
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

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.cargarServicios();
    this.inventarioService.getItems().subscribe(items => {
      this.productosInventario = items;
    });
  }

  // ── Getters de servicios por categoría ───────────────────────────────────
  get serviciosGenerales(): CatalogoServicio[] {
    return this.servicios.filter(s => s.categoria === 'GENERAL');
  }

  get serviciosEspeciales(): CatalogoServicio[] {
    return this.servicios.filter(s => s.categoria === 'ESPECIAL' || s.categoria === 'EXTRA');
  }

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
}

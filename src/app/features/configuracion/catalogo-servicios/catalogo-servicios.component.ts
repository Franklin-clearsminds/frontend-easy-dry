import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogoServiciosMockService } from '../../../core/services/catalogo-servicios-mock.service';
import { CatalogoServicio } from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-catalogo-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PaginationComponent],
  templateUrl: './catalogo-servicios.component.html'
})
export class CatalogoServiciosComponent implements OnInit {
  private catalogoService = inject(CatalogoServiciosMockService);
  
  servicios: CatalogoServicio[] = [];
  filtroCategoria = 'TODAS';
  filtroEstado = 'TODOS';
  busqueda = '';
  
  currentPage = 1;
  pageSize = 5;

  showModal = false;
  isEditing = false;
  servicioActual: Partial<CatalogoServicio> = {
    categoria: 'GENERAL',
    estado: 'Activo',
    requiereFoto: false,
    requiereVideo: false
  };

  ngOnInit() {
    this.cargarServicios();
  }

  cargarServicios() {
    this.catalogoService.servicios$.subscribe(data => {
      this.servicios = data;
    });
  }

  get serviciosFiltrados() {
    return this.servicios.filter(s => {
      const matchCat = this.filtroCategoria === 'TODAS' || s.categoria === this.filtroCategoria;
      const matchEst = this.filtroEstado === 'TODOS' || s.estado === this.filtroEstado;
      const matchTxt = this.busqueda === '' || 
                       s.nombre.toLowerCase().includes(this.busqueda.toLowerCase()) || 
                       s.codigo.toLowerCase().includes(this.busqueda.toLowerCase());
      return matchCat && matchEst && matchTxt;
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

  abrirModalNuevo() {
    this.isEditing = false;
    this.servicioActual = {
      categoria: 'GENERAL',
      estado: 'Activo',
      requiereFoto: false,
      requiereVideo: false
    };
    this.showModal = true;
  }

  abrirModalEditar(servicio: CatalogoServicio) {
    this.isEditing = true;
    this.servicioActual = { ...servicio };
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
  }

  guardarServicio() {
    if (this.isEditing && this.servicioActual.id) {
      this.catalogoService.actualizarServicio(this.servicioActual.id, this.servicioActual).subscribe(() => {
        this.cerrarModal();
      });
    } else {
      this.catalogoService.crearServicio(this.servicioActual as any).subscribe(() => {
        this.cerrarModal();
      });
    }
  }

  toggleEstado(servicio: CatalogoServicio) {
    const nuevoEstado = servicio.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.catalogoService.cambiarEstado(servicio.id, nuevoEstado).subscribe();
  }
}

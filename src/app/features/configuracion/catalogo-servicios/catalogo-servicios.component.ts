import { TablaFijaDirective } from '../../../shared/directives/tabla-fija.directive';
import { HostListener, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TablaServidor } from '../../../core/utils/tabla-servidor';
import { AgenciaCatalogoCtx, CatalogoServiciosService, RecetaHistorialCambio } from '../../../core/services/catalogo-servicios.service';
import { InventarioService } from '../../../core/services/inventario.service';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogoServicio, RecetaInsumoServicio, InventarioItem } from '../../../core/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalPortalDirective } from '../../../shared/directives/modal-portal.directive';
import { ToastService } from '../../../shared/services/toast.service';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-catalogo-servicios',
  standalone: true,
  imports: [TablaFijaDirective, CommonModule, RouterModule, FormsModule, LucideAngularModule, PaginationComponent, ModalPortalDirective],
  templateUrl: './catalogo-servicios.component.html'
})
export class CatalogoServiciosComponent implements OnInit, OnDestroy {
  @HostListener('document:keydown.escape')
  cerrarModalConEsc(): void {
    if (this.showModal) this.cerrarModal();
  }

  private catalogoService = inject(CatalogoServiciosService);
  private inventarioService = inject(InventarioService);
  public authService = inject(AuthService);
  private toast = inject(ToastService);

  // ── Alcance por sede: lo decide el servidor (Admin y Súper Admin ven todo; quien tiene sede ve solo lo de su sede) ──
  get agenciaCtx(): AgenciaCatalogoCtx | null {
    return this.generalesTabla.resumen ?? this.especialesTabla.resumen;
  }
  /** Permisos del catálogo: son los mismos que exige el servidor en cada endpoint. */
  /** Cada categoría tiene sus propias casillas (catalogo.generales.* / catalogo.especiales.*), las mismas que exige el servidor. */
  private permisoDe(categoria: string | undefined, accion: string): boolean {
    const grupo = String(categoria || '').toUpperCase() === 'ESPECIAL' ? 'especiales' : 'generales';
    return this.authService.puede(`catalogo.${grupo}.${accion}`);
  }
  get puedeVerSubGenerales(): boolean { return this.authService.puede('pagina.catalogo.generales'); }
  get puedeVerSubEspeciales(): boolean { return this.authService.puede('pagina.catalogo.especiales'); }
  puedeCrear(categoria?: string): boolean { return this.permisoDe(categoria, 'crear'); }
  puedeEditar(categoria?: string): boolean { return this.permisoDe(categoria, 'editar'); }
  puedeCambiarEstado(categoria?: string): boolean { return this.permisoDe(categoria, 'estado'); }
  puedeVerReceta(categoria?: string): boolean { return this.permisoDe(categoria, 'recetas.ver'); }
  puedeEditarReceta(categoria?: string): boolean { return this.permisoDe(categoria, 'recetas.editar'); }
  /** Receta del servicio abierto en el modal. */
  get puedeGestionarRecetas(): boolean { return this.puedeEditarReceta(this.servicioActual?.categoria); }
  get puedeVerRecetaActual(): boolean { return this.puedeVerReceta(this.servicioActual?.categoria); }
  get soloLectura(): boolean {
    const cat = this.servicioActual?.categoria;
    return this.isEditing ? !this.puedeEditar(cat) : !this.puedeCrear(cat);
  }
  get puedeGuardar(): boolean { return !this.soloLectura || (this.isEditing && this.puedeGestionarRecetas); }
  alternarEstado(servicio: CatalogoServicio): void {
    if (!servicio.id || !this.puedeCambiarEstado(servicio.categoria)) return;
    this.catalogoService.cambiarEstado(servicio.id).subscribe({
      next: () => {
        const desactivado = servicio.estado === 'Activo';
        this.toast.success(desactivado ? 'Servicio desactivado' : 'Servicio activado', servicio.nombre);
        servicio.estado = desactivado ? 'Inactivo' : 'Activo';
        this.refrescarTablas();
      },
      error: (err) => this.toast.error('Error', err?.error?.message || 'No se pudo cambiar el estado del servicio.'),
    });
  }
  /** El precio se ve solo con `precios.ver` y para quien tiene sede: es el que su agencia tiene fijado (el catálogo global no tiene precio). */
  get mostrarPrecioAgencia(): boolean { return !!this.agenciaCtx && this.authService.puede('precios.ver'); }
  get tieneServiciosEspeciales(): boolean { return this.agenciaCtx?.tieneServiciosEspeciales ?? false; }
  /** La sede tiene el catálogo vacío: nada asignado y nada que mostrar. */
  get sinServiciosConfigurados(): boolean {
    const c = this.agenciaCtx;
    return !!c && c.servicioIds.length === 0 && this.generalesTabla.total + this.especialesTabla.total === 0
      && !this.busquedaGenerales && !this.busquedaEspeciales;
  }
  get totalServiciosSucursal(): number { return this.generalesTabla.total + this.especialesTabla.total; }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabActiva: 'generales' | 'especiales' = 'generales';

  // ── Generales y especiales: páginas numeradas, búsqueda y orden en el servidor ──
  readonly generalesTabla = new TablaServidor<CatalogoServicio, AgenciaCatalogoCtx>(
    (c) => this.catalogoService.getServiciosPagina({ ...c, categoria: 'GENERAL' }), { sortField: 'codigo', sortOrder: 'asc' });
  readonly especialesTabla = new TablaServidor<CatalogoServicio, AgenciaCatalogoCtx>(
    (c) => this.catalogoService.getServiciosPagina({ ...c, categoria: 'ESPECIAL' }), { sortField: 'codigo', sortOrder: 'asc' });
  productosInventario: InventarioItem[] = [];
  busquedaGenerales = '';
  busquedaEspeciales = '';
  private readonly texto$ = new Subject<{ tabla: 'generales' | 'especiales'; texto: string }>();
  private suscripcionTexto?: Subscription;

  buscarGenerales(texto: string): void { this.busquedaGenerales = texto; this.texto$.next({ tabla: 'generales', texto }); }
  buscarEspeciales(texto: string): void { this.busquedaEspeciales = texto; this.texto$.next({ tabla: 'especiales', texto }); }

  private recargar(tabla: TablaServidor<CatalogoServicio, AgenciaCatalogoCtx>, texto: string, page = 1, pageSize = tabla.pageSize): void {
    tabla.alCambiar({ page, pageSize, sortField: tabla.sortField, sortOrder: tabla.sortOrder, search: texto });
  }
  cambiarPagina(tab: 'generales' | 'especiales', page: number): void {
    if (tab === 'generales') this.recargar(this.generalesTabla, this.busquedaGenerales, page);
    else this.recargar(this.especialesTabla, this.busquedaEspeciales, page);
  }
  cambiarTamano(tab: 'generales' | 'especiales', size: number): void {
    if (tab === 'generales') this.recargar(this.generalesTabla, this.busquedaGenerales, 1, size);
    else this.recargar(this.especialesTabla, this.busquedaEspeciales, 1, size);
  }
  private refrescarTablas(): void {
    this.generalesTabla.refrescar();
    this.especialesTabla.refrescar();
  }

  // ── Modal de creación / edición (Generales & Especiales) ─────────────────
  showModal = false;
  isEditing = false;
  servicioActual: Partial<CatalogoServicio> = {
    categoria: 'GENERAL',
    estado: 'Activo',
    tiempoEstimadoMin: 30,
    insumosReceta: []
  };

  // ── Selección temporal de insumos en modal ───────────────────────────────
  insumoSeleccionadoId = '';
  cantidadADescontar = 0.25;
  busquedaInsumoReceta = '';

  // ── Historial de cambios de receta (solo admin / bodega) ─────────────────
  mostrarHistorialReceta = false;
  historialRecetaCargado = false;
  cargandoHistorialReceta = false;
  historialReceta: RecetaHistorialCambio[] = [];

  get canVerHistorialReceta(): boolean {
    return this.permisoDe(this.servicioActual?.categoria, 'recetas.historial');
  }

  toggleHistorialReceta(): void {
    this.mostrarHistorialReceta = !this.mostrarHistorialReceta;
    if (this.mostrarHistorialReceta && !this.historialRecetaCargado && this.servicioActual.id) {
      this.cargandoHistorialReceta = true;
      this.catalogoService.getHistorialReceta(Number(this.servicioActual.id)).subscribe(list => {
        this.historialReceta = list;
        this.historialRecetaCargado = true;
        this.cargandoHistorialReceta = false;
      });
    }
  }

  /** Agrupa el historial por lote: un mismo guardado (p. ej. "quité A, agregué B") queda junto. */
  get historialRecetaPorLote(): RecetaHistorialCambio[][] {
    const grupos = new Map<string, RecetaHistorialCambio[]>();
    for (const h of this.historialReceta) {
      const lista = grupos.get(h.loteId) || [];
      lista.push(h);
      grupos.set(h.loteId, lista);
    }
    return Array.from(grupos.values());
  }

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
  ngOnDestroy(): void {
    this.suscripcionTexto?.unsubscribe();
    this.generalesTabla.destruir();
    this.especialesTabla.destruir();
  }

  ngOnInit() {
    // Si el rol no tiene la pestaña de generales, se abre en la de especiales.
    if (!this.puedeVerSubGenerales && this.puedeVerSubEspeciales) this.tabActiva = 'especiales';
    this.suscripcionTexto = this.texto$.pipe(debounceTime(300)).subscribe(({ tabla, texto }) => {
      if (tabla === 'generales') this.recargar(this.generalesTabla, texto);
      else this.recargar(this.especialesTabla, texto);
    });
    // Solo se pide la tabla de la pestaña activa; la otra se pide la primera vez que se entra a ella.
    if (this.tabActiva === 'generales') this.generalesTabla.reiniciar();
    else this.especialesTabla.reiniciar();
  }

  /**
   * Los insumos solo hacen falta para armar recetas (dentro del modal de crear o editar) y requieren poder ver el inventario:
   * se piden la primera vez que se abre uno, no al entrar a la pantalla.
   */
  private insumosRecetaPedidos = false;
  private cargarInsumosSiHaceFalta(): void {
    if (this.insumosRecetaPedidos) return;
    if (!(this.puedeEditarReceta('GENERAL') || this.puedeEditarReceta('ESPECIAL')) || !this.authService.puede('inventario.ver')) return;
    this.insumosRecetaPedidos = true;
    this.inventarioService.cargarItems();
    this.inventarioService.getItems().subscribe(items => {
      this.productosInventario = items;
    });
  }

  /** Cambia de pestaña y pide su tabla si todavía no se había cargado. */
  seleccionarTab(tab: 'generales' | 'especiales'): void {
    this.tabActiva = tab;
    if (tab === 'generales' && !this.generalesTabla.inicializada) this.generalesTabla.reiniciar();
    if (tab === 'especiales' && !this.especialesTabla.inicializada) this.especialesTabla.reiniciar();
  }

  /** Servicio nuevo: el servidor calcula el siguiente código (SER-### o ESP-###). */
  private pedirSiguienteCodigo(categoria: 'GENERAL' | 'ESPECIAL'): void {
    this.catalogoService.getSiguienteCodigo(categoria).subscribe({
      next: (codigo) => {
        if (!this.isEditing && this.servicioActual.categoria === categoria && !this.servicioActual.codigo) this.servicioActual.codigo = codigo;
      },
      error: () => this.toast.warning('Código', 'No se pudo calcular el siguiente código; escríbelo a mano.'),
    });
  }

  // ── Modal de creación / edición (Generales y Especiales) ─────────────────
  abrirModalNuevo(categoria: 'GENERAL' | 'ESPECIAL' = 'GENERAL') {
    this.cargarInsumosSiHaceFalta();
    if (!this.puedeCrear(categoria)) return;
    this.isEditing = false;
    this.servicioActual = {
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: categoria,
      estado: 'Activo',
      tiempoEstimadoMin: 30,
      insumosReceta: []
    };
    this.insumoSeleccionadoId = '';
    this.cantidadADescontar = 0.25;
    this.busquedaInsumoReceta = '';
    this.mostrarHistorialReceta = false;
    this.historialRecetaCargado = false;
    this.historialReceta = [];
    this.showModal = true;
    this.pedirSiguienteCodigo(categoria);
  }

  abrirModalEditar(servicio: CatalogoServicio) {
    this.cargarInsumosSiHaceFalta();
    this.isEditing = true;
    this.servicioActual = {
      ...servicio,
      tiempoEstimadoMin: Number(servicio.tiempoEstimadoMin) > 0 ? Number(servicio.tiempoEstimadoMin) : 30,
      insumosReceta: servicio.insumosReceta ? JSON.parse(JSON.stringify(servicio.insumosReceta)) : []
    };
    this.insumoSeleccionadoId = '';
    this.cantidadADescontar = 0.25;
    this.busquedaInsumoReceta = '';
    this.mostrarHistorialReceta = false;
    this.historialRecetaCargado = false;
    this.historialReceta = [];
    this.showModal = true;
  }

  get ejemploHoraSalidaCatalogo(): string {
    const min = Math.max(1, Number(this.servicioActual?.tiempoEstimadoMin) || 30);
    const base = new Date();
    base.setHours(10, 0, 0, 0);
    const out = new Date(base.getTime() + min * 60_000);
    return out.toTimeString().substring(0, 5);
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
        unidadMedidaId: item.producto.unidadMedidaId || (item.producto.unidadMedidaObj as any)?.id || undefined,
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
      const nuevo = Math.round((actual - step) * 100) / 100;
      if (nuevo > 0) {
        this.servicioActual.insumosReceta[index].cantidadSugerida = nuevo;
      } else {
        this.eliminarInsumoReceta(index);
      }
    }
  }

  eliminarInsumoReceta(index: number) {
    this.servicioActual.insumosReceta?.splice(index, 1);
  }

  guardarServicio() {
    if (!this.puedeGuardar) return;
    // Solo recetas (p. ej. coordinador de bodega): no toca los datos del servicio.
    if (this.isEditing && this.servicioActual.id && this.soloLectura) {
      this.catalogoService.guardarRecetasServicio(this.servicioActual.id, this.servicioActual.insumosReceta || []).subscribe({
        next: () => {
          this.toast.success('Receta Actualizada', 'La receta de insumos fue guardada.');
          this.cerrarModal();
          this.refrescarTablas();
        },
        error: (err) => this.toast.error('Error al guardar', err?.error?.message || 'No se pudo guardar la receta.'),
      });
      return;
    }
    if (!this.servicioActual.codigo?.trim() || !this.servicioActual.nombre?.trim()) {
      this.toast.warning('Datos incompletos', 'Código y nombre del servicio son obligatorios.');
      return;
    }
    const mins = Number(this.servicioActual.tiempoEstimadoMin);
    if (!Number.isFinite(mins) || mins < 1) {
      this.toast.warning('Tiempo requerido', 'Indica el tiempo estimado en minutos (≥ 1). Se usa para calcular la hora de salida en la OT.');
      return;
    }
    this.servicioActual.tiempoEstimadoMin = Math.round(mins);

    if (this.isEditing && this.servicioActual.id) {
      const cambios = this.puedeGestionarRecetas ? this.servicioActual : { ...this.servicioActual, insumosReceta: undefined };
      this.catalogoService.actualizarServicio(this.servicioActual.id, cambios).subscribe({
        next: () => {
          this.toast.success('Servicio Actualizado', 'El servicio y su receta fueron guardados en base de datos.');
          this.cerrarModal();
          this.refrescarTablas();
        },
        error: (err) => {
          this.toast.error('Error al guardar', err?.error?.message || 'No se pudo actualizar el servicio.');
        }
      });
    } else {
      this.catalogoService.crearServicio(this.servicioActual as any).subscribe({
        next: () => {
          this.toast.success('Servicio Creado', 'El servicio y su receta fueron guardados en base de datos.');
          this.cerrarModal();
          this.refrescarTablas();
        },
        error: (err) => {
          this.toast.error('Error al crear', err?.error?.message || 'No se pudo crear el servicio.');
        }
      });
    }
  }

}

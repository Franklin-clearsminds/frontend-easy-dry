import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { DashboardOperativoService } from '../../core/services/dashboard-operativo.service';
import { AuthService } from '../../core/services/auth.service';
import { ROLE_LABELS } from '../../core/models/roles.model';
import { AlertasWidgetComponent } from './components/alertas-widget.component';
import { RankingOperadoresWidgetComponent } from './components/ranking-operadores-widget.component';
import { SelectSearchComponent } from '../../shared/components/select-search/select-search.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { OpcionesService } from '../../core/services/opciones.service';
import { CHART_COLORS } from '../../shared/theme/colors';
import { DashboardChartData } from '../../core/models/dashboard.model';
import { Observable, Subscription, forkJoin, tap } from 'rxjs';

/** Qué panel ve el usuario. Se decide por los permisos del rol (los mismos que exige el servidor), no por su nombre. */
export type VistaDashboard = 'taller' | 'especiales' | 'bodega' | 'ejecutivo' | 'ninguna';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    LucideAngularModule,
    StatCardComponent,
    ChartCardComponent,
    AlertasWidgetComponent,
    RankingOperadoresWidgetComponent,
    DatePipe,
    SelectSearchComponent,
    EmptyStateComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardOperativoService);
  public auth = inject(AuthService);
  public opciones = inject(OpcionesService);

  produccion: any;
  operadores: any;
  serviciosData: any;
  maquinaria: any;
  alertas: any[] = [];
  tecnicoData: any;
  distribuidorData: any;
  resumenEjecutivo: any;

  /** Hoy en formato YYYY-MM-DD: sirve de referencia para saber si hay filtros activos. */
  readonly hoyISO = new Date().toISOString().split('T')[0];

  fechaActual = new Date();
  fechaFiltro = this.hoyISO;
  regionFiltro: string | null = null;
  agenciaFiltro: string | null = null;
  regionLabel = '';
  agenciaLabel = '';
  recargando = false;

  cargarRegiones = this.opciones.regiones();
  cargarAgencias = this.opciones.agencias();

  /** Suscripciones de la carga en curso: se cancelan al recargar para descartar respuestas obsoletas. */
  private carga = new Subscription();

  rolLabel = '';
  contextLabel = '';
  userName = '';
  isAdminView = false;
  isSupervisorView = false;
  isComercialView = false;
  isAprobadorView = false;

  bodegaData: any = null;
  especialesData: any = null;

  activeExecutiveTab: 'analitica' | 'auditoria' | 'inventario' = 'analitica';

  get tabAnaliticaTitle(): string {
    if (this.isAdminView) return 'Flujo de Usuarios';
    if (this.isAprobadorView) return 'Aprobaciones';
    if (this.isComercialView) return 'Ventas y Flujo';
    if (this.isSupervisorView) return 'Operación Regional';
    return 'Productividad';
  }

  get tabAuditoriaTitle(): string {
    if (this.isAdminView) return 'Auditoría y Roles';
    if (this.isAprobadorView) return 'Revisión (N/A)'; // Usualmente oculto
    if (this.isComercialView) return 'Autorizaciones';
    if (this.isSupervisorView) return 'Salud Regional';
    return 'Auditoría y Equipos';
  }

  get tabInventarioTitle(): string {
    if (this.isAdminView) return 'Catálogos';
    if (this.isAprobadorView || this.isComercialView) return 'Catálogo Comercial';
    if (this.isSupervisorView) return 'Abastecimiento';
    return 'Inventario';
  }

  get chart1Title(): string {
    if (this.isAdminView) return 'Nuevos Usuarios (7d)';
    if (this.isAprobadorView) return 'Cola de Solicitudes (7d)';
    if (this.isComercialView) return 'Solicitudes Comerciales';
    return 'Flujo Horario de Atención';
  }

  get chart1Subtitle(): string {
    if (this.isAdminView) return 'Usuarios creados por fecha';
    if (this.isAprobadorView) return 'Volumen de solicitudes pendientes/aprobadas';
    if (this.isComercialView) return 'Clientes solicitando beneficios';
    return 'Vehículos procesados en el día';
  }

  get chart2Title(): string {
    if (this.isAdminView) return 'Distribución de Roles';
    if (this.isAprobadorView) return 'Tipos de Solicitud';
    if (this.isComercialView) return 'Mix Comercial de Servicios';
    return 'Mix de Servicios';
  }

  get chart3Title(): string {
    if (this.isAdminView) return 'Servicios por Categoría';
    if (this.isAprobadorView) return 'Estados de Solicitud';
    if (this.isComercialView) return 'Proporción de Catálogo';
    if (this.isSupervisorView) return 'Cuellos de Botella (Tiempos)';
    return 'Tiempo por Bahía';
  }

  get chart4Title(): string {
    if (this.isAdminView) return 'Auditoría Reciente';
    if (this.isAprobadorView) return 'Desempeño';
    if (this.isComercialView) return 'Top Marcas Atendidas';
    return 'Lavados por Bahía';
  }

  get chart4Subtitle(): string {
    if (this.isAdminView) return 'Acciones realizadas';
    return 'Productividad en cantidad';
  }

  get filtroActual() {
    return {
      fecha: this.fechaFiltro,
      fechaDesde: this.fechaFiltro,
      fechaHasta: this.fechaFiltro,
      regionId: this.regionFiltro || undefined,
      agenciaId: this.agenciaFiltro || undefined,
    };
  }

  /** El filtro de región solo aplica a quien ve más de una región (alcance global). */
  get puedeFiltrarRegion(): boolean {
    const u = this.auth.getCurrentUser();
    return u?.ambito === 'GLOBAL' || u?.role === 'SUPER_ADMIN';
  }

  /** El filtro de agencia aplica a alcance global o regional (el de agencia ya está acotado a la suya). */
  get puedeFiltrarAgencia(): boolean {
    const u = this.auth.getCurrentUser();
    return u?.ambito === 'GLOBAL' || u?.role === 'SUPER_ADMIN' || u?.ambito === 'REGION';
  }

  get hayFiltrosActivos(): boolean {
    return !!this.regionFiltro || !!this.agenciaFiltro || this.fechaFiltro !== this.hoyISO;
  }

  onFechaChange(newVal: string): void {
    if (!newVal) return;
    this.fechaFiltro = newVal;
    this.fechaActual = new Date(newVal + 'T12:00:00');
    this.recargar();
  }

  /** Al cambiar de región se acotan las agencias a esa región y se limpia la agencia elegida. */
  onRegionChange(regionId: string | null): void {
    this.regionFiltro = regionId;
    if (!regionId) this.regionLabel = '';
    this.agenciaFiltro = null;
    this.agenciaLabel = '';
    this.cargarAgencias = this.opciones.agencias(regionId ? { regionId } : {});
    this.recargar();
  }

  onAgenciaChange(agenciaId: string | null): void {
    this.agenciaFiltro = agenciaId;
    if (!agenciaId) this.agenciaLabel = '';
    this.recargar();
  }

  limpiarFiltros(): void {
    this.regionFiltro = null;
    this.agenciaFiltro = null;
    this.regionLabel = '';
    this.agenciaLabel = '';
    this.fechaFiltro = this.hoyISO;
    this.fechaActual = new Date();
    this.cargarAgencias = this.opciones.agencias();
    this.recargar();
  }

  /** Recarga el panel de la vista actual cancelando la carga anterior (evita respuestas obsoletas). */
  recargar(): void {
    this.carga.unsubscribe();
    this.carga = new Subscription();
    this.recargando = true;
    switch (this.vista) {
      case 'ejecutivo': this.cargarEjecutivo(); break;
      case 'taller': this.cargarTaller(); break;
      case 'bodega': this.cargarBodega(); break;
      case 'especiales': this.cargarEspeciales(); break;
      default: this.recargando = false; break;
    }
  }

  ngOnDestroy(): void {
    this.carga.unsubscribe();
  }

  /**
   * taller: mantenimiento y técnicos (ven maquinaria y ejecutan mantenimientos, pero no las OT).
   * especiales: quien atiende servicios especiales sin ver los servicios generales.
   * bodega: inventario y despachos sin ver los servicios.
   * ejecutivo: cualquier otro rol con permiso de dashboard; el servidor ya filtra los datos por el alcance del usuario
   * (todo el país, su región o su agencia).
   */
  get vista(): VistaDashboard {
    const a = this.auth;
    const veServicios = a.puede('servicios.ver');
    if (a.puede('maquinaria.ver') && a.puede('mantenimientos.ejecutar') && !veServicios) return 'taller';
    if (a.puede('especiales.ver') && !veServicios) return 'especiales';
    if (a.puede('inventario.ver') && a.puede('despachos.crear') && !veServicios) return 'bodega';
    if (a.puede('dashboard.ver')) return 'ejecutivo';
    return 'ninguna';
  }

  get puedeVerAlertas(): boolean { return this.auth.puede('alertas.ver'); }
  get puedeVerMaquinaria(): boolean { return this.auth.puede('maquinaria.ver'); }
  get puedeVerUsuarios(): boolean { return this.auth.puede('usuarios.ver'); }
  get puedeVerMapa(): boolean { return this.auth.puede('agencias.ver'); }

  /** Alertas de nivel crítico entre las que llegaron del servidor. */
  get alertasCriticas(): number {
    return this.alertas.filter(a => a.tipo === 'critica').length;
  }

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.userName = user ? `${user.nombre} ${user.apellido}`.trim() : 'Usuario';
    this.rolLabel = ROLE_LABELS[user?.role as keyof typeof ROLE_LABELS] || user?.rolNombre || 'Colaborador';
    this.contextLabel = (user?.ambito === 'REGION' ? user?.region : (user?.sucursal || user?.sucursalNombre)) || 'Red EasyDry®';

    this.recargar();
  }

  /** Solo se llama a los endpoints para los que el rol tiene permiso (evita errores 403 de fondo). */
  private cargarEjecutivo(): void {
    const filtro = this.filtroActual;
    const peticiones: Observable<any>[] = [
      this.dashboardService.getProduccion(filtro).pipe(tap((d) => {
        this.isAdminView = d?.isAdminView || false;
        this.isSupervisorView = d?.isSupervisorView || false;
        this.isComercialView = d?.isComercialView || false;
        this.isAprobadorView = d?.isAprobadorView || false;
        this.produccion = this.normalizeProduccion(d);
      })),
      this.dashboardService.getServiciosData(filtro).pipe(tap((d) => (this.serviciosData = d))),
      this.dashboardService.getResumenEjecutivo(filtro).pipe(tap((d) => (this.resumenEjecutivo = d))),
    ];
    if (this.puedeVerUsuarios) {
      peticiones.push(this.dashboardService.getOperadores(filtro).pipe(tap((d) => (this.operadores = d))));
    }
    if (this.puedeVerMaquinaria) {
      peticiones.push(this.dashboardService.getMaquinaria(filtro).pipe(tap((d) => (this.maquinaria = this.aChartMaquinaria(d)))));
    }
    if (this.puedeVerAlertas) {
      peticiones.push(this.dashboardService.getAlertas(filtro).pipe(tap((d) => (this.alertas = d))));
      peticiones.push(this.dashboardService.getDashboardDistribuidor(filtro).pipe(tap((d) => (this.distribuidorData = d))));
    }
    this.carga.add(forkJoin(peticiones).subscribe({
      next: () => (this.recargando = false),
      error: () => (this.recargando = false),
    }));
  }

  private cargarTaller(): void {
    this.carga.add(this.dashboardService.getDashboardTecnico().subscribe({
      next: (d) => { this.tecnicoData = d; this.recargando = false; },
      error: () => (this.recargando = false),
    }));
  }

  private cargarEspeciales(): void {
    this.carga.add(this.dashboardService.getDashboardEspeciales().subscribe({
      next: (d) => { this.especialesData = d; this.recargando = false; },
      error: () => (this.recargando = false),
    }));
  }

  private cargarBodega(): void {
    const peticiones: Observable<any>[] = [
      this.dashboardService.getDashboardBodegaDedicado().pipe(tap((d) => (this.bodegaData = d))),
      this.dashboardService.getDashboardDistribuidor().pipe(tap((d) => (this.distribuidorData = d))),
    ];
    if (this.puedeVerAlertas) {
      peticiones.push(this.dashboardService.getAlertas().pipe(tap((d) => (this.alertas = d))));
    }
    this.carga.add(forkJoin(peticiones).subscribe({
      next: () => (this.recargando = false),
      error: () => (this.recargando = false),
    }));
  }

  /** Distribución del parque de maquinaria como serie de gráfico (operativas / mantenimiento / dañadas). */
  private aChartMaquinaria(d: any): any {
    return {
      ...d,
      distribucionEstado: {
        labels: ['Operativas', 'Mantenimiento', 'Dañadas'],
        datasets: [{
          data: [d.operativas, d.mantenimiento, d.danadas],
          backgroundColor: [CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.rose],
        }],
      },
    };
  }

  /** Distribución real de alertas de stock por severidad (reemplaza la dona con valores fijos). */
  get alertasPorSeveridad(): DashboardChartData {
    const criticas = this.alertas.filter((a) => a.tipo === 'critica').length;
    const advertencias = this.alertas.filter((a) => a.tipo === 'advertencia').length;
    const informativas = this.alertas.filter((a) => a.tipo === 'info').length;
    return {
      labels: ['Críticas', 'Advertencias', 'Informativas'],
      datasets: [{
        data: [criticas, advertencias, informativas],
        backgroundColor: [CHART_COLORS.rose, CHART_COLORS.amber, CHART_COLORS.blue],
      }],
    };
  }

  /** Verdadero mientras llegan los datos principales del panel actual. */
  get cargando(): boolean {
    switch (this.vista) {
      case 'ejecutivo': return !this.produccion;
      case 'taller': return !this.tecnicoData;
      case 'bodega': return !this.bodegaData;
      case 'especiales': return !this.especialesData;
      default: return false;
    }
  }

  private normalizeProduccion(d: any) {
    return {
      ...d,
      totalVehiculos: d.vehiculosHoy ?? null,
      flujoHorario: d.flujoHorario ?? null,
      distribucionModelos: d.distribucionModelos ?? null,
      tiemposBahias: d.tiemposBahias ?? null,
      topMaquinas: d.topMaquinas ?? null,
      topAgencias: d.topAgencias ?? null
    };
  }
}

import { FUNCION } from '../../core/utils/funciones-rol';
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
import { AprobacionesWidgetComponent } from './components/aprobaciones-widget.component';
import { RendimientoPersonalWidgetComponent } from './components/rendimiento-personal-widget.component';
import { SelectSearchComponent } from '../../shared/components/select-search/select-search.component';

import { RankingListComponent, RankingItem } from '../../shared/components/ranking-list/ranking-list.component';
import { PeriodSummaryComponent, PeriodMetric } from '../../shared/components/period-summary/period-summary.component';
import { DistributionCardComponent, DistributionItem } from '../../shared/components/distribution-card/distribution-card.component';
import { HeatmapGridComponent } from '../../shared/components/heatmap-grid/heatmap-grid.component';
import { HourlyPatternCardComponent } from '../../shared/components/hourly-pattern-card/hourly-pattern-card.component';
import { TopBottomComponent, TopBottomItem } from '../../shared/components/top-bottom/top-bottom.component';
import { TopOrdenComponent } from '../../shared/components/top-orden/top-orden.component';
import { EstrellasComponent } from '../../shared/components/estrellas/estrellas.component';
import { OrdenTop, ordenarSerieTop } from '../../shared/utils/serie-top';
import { OpcionesService, CargadorOpciones } from '../../core/services/opciones.service';
import { OpcionSelect } from '../../core/models/paginacion.model';
import { SelectMultipleComponent } from '../../shared/components/select-multiple/select-multiple.component';
import { CHART_COLORS, interpolarHex } from '../../shared/theme/colors';
import { DashboardChartData } from '../../core/models/dashboard.model';
import { Observable, Subscription, forkJoin, tap } from 'rxjs';


/** Qué panel ve el usuario. Se decide por los permisos del rol (los mismos que exige el servidor), no por su nombre. */
export type VistaDashboard = 'taller' | 'especiales' | 'bodega' | 'ejecutivo' | 'ninguna';

/** Periodo del filtro de fecha global. Debe coincidir con el backend (`RANGOS_PERIODO`). */
export type RangoPeriodo = 'HOY' | 'SEMANA' | 'MES' | 'TRIMESTRE' | 'SEMESTRE' | 'ANIO' | 'RANGO';

/**
 * Dimensión estructural activa del dashboard (filtro mutuamente exclusivo).
 * País/Global → Región → Agencia → Pulidor. Solo una puede estar activa; las fechas son un modificador continuo.
 */
export type DimensionFiltro = 'GLOBAL' | 'REGION' | 'AGENCY' | 'POLISHER';

/** Bloques de datos del dashboard ejecutivo; cada pestaña pide solo los suyos. */
type GrupoEjecutivo = 'especiales' | 'produccion' | 'resumen' | 'servicios' | 'operadores' | 'pulidores' | 'maquinaria' | 'tecnico' | 'bodega' | 'alertas' | 'distribuidor' | 'auditorias';
type TabEjecutivo = 'analitica' | 'auditoria' | 'inspecciones' | 'inventario' | 'operacion' | 'taller' | 'aprobaciones';

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
    RendimientoPersonalWidgetComponent,
    DatePipe,
    SelectSearchComponent,
    SelectMultipleComponent,
    EstrellasComponent,
    RankingListComponent,
    PeriodSummaryComponent,
    DistributionCardComponent,
    HourlyPatternCardComponent,
    TopBottomComponent,
    TopOrdenComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardOperativoService);
  public auth = inject(AuthService);
  public opciones = inject(OpcionesService);

  produccion: any;
  operadores: any;
  rankingPulidores: {fijos: any[], bottomFijos: any[], moviles: any[], bottomMoviles: any[]} | null = null;
  /** Mes (AAAA-MM) del rendimiento del personal; vacío = el período del dashboard. */
  personalMes = '';
  private rankingLavadoresMes: {ranking: any[], rankingBottom: any[]} | null = null;
  private rankingPulidoresMes: {fijos: any[], bottomFijos: any[], moviles: any[], bottomMoviles: any[]} | null = null;
  rankingLavadores: {ranking: any[], rankingBottom: any[]} | null = null;
  serviciosData: any;
  maquinaria: any;
  alertas: any[] = [];
  tecnicoData: any;
  distribuidorData: any;
  resumenEjecutivo: any;

  /** Hoy en formato YYYY-MM-DD: sirve de referencia para saber si hay filtros activos. */
  readonly hoyISO = new Date().toISOString().split('T')[0];

  fechaActual = new Date();
  /** Periodo del dashboard (filtro de fecha global, compartido por todos los roles). */
  rangoFiltro: RangoPeriodo = 'HOY';
  fechaDesdeFiltro = '';
  fechaHastaFiltro = '';
  regionFiltro: string | null = null;
  agenciaFiltro: string | null = null;
  clienteFiltro: string | null = null;
  bahiaFiltro: string | null = null;
  pulidorFiltro: string | null = null;
  regionLabel = '';
  agenciaLabel = '';
  clienteLabel = '';
  bahiaLabel = '';
  pulidorLabel = '';
  recargando = false;

  /**
   * Dimensión estructural activa (filtro exclusivo). Arranca en GLOBAL (país). Al elegir Región/Agencia/Pulidor
   * se bloquean y limpian las demás, manteniendo siempre el rango de fechas.
   */
  activeDimension: DimensionFiltro = 'GLOBAL';

  readonly rangos: { id: RangoPeriodo; label: string }[] = [
    { id: 'HOY', label: 'Hoy' },
    { id: 'SEMANA', label: 'Semana' },
    { id: 'MES', label: 'Mes' },
    { id: 'TRIMESTRE', label: 'Trimestre' },
    { id: 'SEMESTRE', label: 'Semestre' },
    { id: 'ANIO', label: 'Año' },
    { id: 'RANGO', label: 'Rango' },
  ];

  cargarRegiones = this.opciones.regiones();
  cargarClientes = this.opciones.clientes();
  cargarAgencias = this.opciones.agencias();
  cargarBahias = this.opciones.bahias();
  cargarPulidores = this.opciones.operadores({ rol: 'PULIDOR' });


  /** Suscripciones de la carga en curso: se cancelan al recargar para descartar respuestas obsoletas. */
  private carga = new Subscription();
  /** Grupos de datos del dashboard ejecutivo ya pedidos con los filtros actuales (se vacía al cambiar los filtros). */
  private readonly gruposCargados = new Set<GrupoEjecutivo>();

  rolLabel = '';
  contextLabel = '';
  userName = '';
  isAdminView = false;
  isSupervisorView = false;
  isComercialView = false;
  isAprobadorView = false;
  isSuperAdminView = false;
  isEjecutivoView = false;

  bodegaData: any = null;
  especialesData: any = null;
  /** Pestaña principal para la vista de Servicios Especiales */
  especialesTab: 'resumen' | 'pulidores' | 'maquinaria' | 'insumos' = 'resumen';
  /** Pestaña del ranking de pulidores (todos vs fijos vs móviles). */
  pulidoresTab: 'todos' | 'fijos' | 'moviles' = 'todos';

  /** Pestaña principal del dashboard de mantenimiento (COORD_MANTENIMIENTO · TECNICO). */
  mantenimientoTab: 'parque' | 'fallas' | 'costos' | 'programacion' = 'parque';

  /** Pestaña principal del dashboard de bodega (COORD_BODEGA · ASISTENTE_BODEGA). */
  bodegaTab: 'salud' | 'reposicion' | 'despachos' | 'consumo' = 'salud';

  /** Control de orden de los rankings del dashboard de bodega. */
  coberturaTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  deficitTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  ubicacionesTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  consumoInsumosTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  consumoAgenciasTop: OrdenTop = { tamano: 5, direccion: 'DESC' };

  /** Pestaña del gráfico unificado de vehículos (marca · modelo · color). */
  vehiculosTab: 'marcas' | 'modelos' | 'colores' = 'marcas';
  /** Pestaña del gráfico de agencias (productivas / gasto en insumos / en mantenimientos / en incidencias / incidentes / tiempos). */
  agenciasTab: 'productivas' | 'gastoInsumos' | 'gastoMantenimientos' | 'reparaciones' | 'incidentes' | 'tiempos' = 'productivas';
  chart4Top: OrdenTop = { tamano: 5, direccion: 'DESC' };
  chart4Tab: 'lavados' | 'incidentes' | 'gastos' | 'tiempos' = 'lavados';
  /** Pestaña para gráfico de incidentes (por agencia vs por pulidor vs por bahía) */
  incidentesTab: 'agencia' | 'pulidor' | 'bahia' = 'agencia';
  incidentesSortTab: 'mas' | 'menos' = 'mas';
  equiposVulnerablesTab: 'mas' | 'menos' = 'mas';
  eficienciaSortTab: 'lentas' | 'rapidas' = 'lentas';
  bajaActividadSort: 'asc' | 'desc' = 'asc';
  /** Pestaña para gráfico de distribución de daños (por tipo vs por ubicación) */
  /** Pestaña del gráfico de fallas del parque: por tipo de equipo o por gravedad. */
  danosTab: 'tipo' | 'gravedad' = 'tipo';

  /**
   * Pestaña del tiempo de resolución del taller. Por defecto por AGENCIA: el desglose por gravedad suele
   * salir plano (todas las gravedades tardan parecido) y no dice dónde se está resolviendo lento.
   */
  mttrTab: 'agencia' | 'gravedad' = 'agencia';

  /**
   * Tipo de servicio del catálogo. Es un modificador CONTINUO como las fechas: se combina con la dimensión
   * estructural (región/agencia/pulidor) en lugar de competir con ella.
   */
  categoriaServicio: 'TODOS' | 'GENERAL' | 'ESPECIAL' = 'TODOS';

  /**
   * Nivel de desglose del gráfico de rendimiento cuando el filtro estructural está en GLOBAL: permite ver el
   * mismo período por Región, Agencia o Pulidor sin cambiar el filtro (a nivel país, por región salían solo 2 barras).
   */
  desgloseTab: 'REGION' | 'AGENCY' | 'POLISHER' = 'REGION';

  /**
   * Orden y tamaño (Top 5 / Top 10, mayor→menor o menor→mayor) de los gráficos de barras de ranking.
   * Cada tarjeta lleva su propio control, así que el estado es independiente por gráfico.
   */
  consumoTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  consumoAgenciaTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  /** El drill-down mostraba hasta 12 entidades: arranca en Top 10 para no perder alcance. */
  jerarquiaTop: OrdenTop = { tamano: 10, direccion: 'DESC' };
  agenciasTop: OrdenTop = { tamano: 5, direccion: 'DESC' };

  /**
   * Dashboard de mantenimiento (COORD_MANTENIMIENTO · TECNICO). Un control de orden por gráfico de ranking:
   * en MTTR y en costos, el orden ascendente responde "¿qué equipo o agencia sale mejor parado?".
   */
  maquinasTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  costoMaquinasTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  mttrTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  costoAgenciaTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  pulidoresChartTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  pulidoresTablaTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  mixEspecialesTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  mixEspecialesVista: 'barras' | 'distribucion' = 'barras';

  /** Servicios concretos elegidos en el filtro global (vacío = todos). Solo acotan los gráficos que dependen del servicio. */
  serviciosFiltro: string[] = [];
  serviciosOpciones: OpcionSelect[] = [];

  readonly categoriasServicio: { id: 'TODOS' | 'GENERAL' | 'ESPECIAL'; label: string }[] = [
    { id: 'TODOS', label: 'Todos los servicios' },
    { id: 'GENERAL', label: 'Servicios generales' },
    { id: 'ESPECIAL', label: 'Servicios especiales' },
  ];

  activeExecutiveTab: TabEjecutivo = 'analitica';


  /** Texto del rango consultado para la barra de resumen del período. */
  get periodoTexto(): string {
    const tipo = this.categoriaServicio === 'TODOS' ? '' : ` · ${this.etiquetaCategoriaServicio}`;
    if (this.esRangoPersonalizado) {
      const desde = this.fechaDesdeFiltro || '—';
      const hasta = this.fechaHastaFiltro || '—';
      return `${desde} → ${hasta}${tipo}`;
    }
    const label = this.rangos.find((r) => r.id === this.rangoFiltro)?.label || 'Hoy';
    const f = this.fechaActual.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
    return `${label} · hasta ${f}${tipo}`;
  }

  /** Totales clave del período (varían según la variante del panel ejecutivo). */
  get periodoMetricas(): PeriodMetric[] {
    const k = this.produccion?.kpisResumen || {};
    if (this.isAdminView) {
      return [
        { label: 'Total ventas', valor: `$${k.ingresoHoy ?? 0}`, color: 'verde' },
        { label: 'Servicios', valor: String(k.serviciosCompletadosHoy ?? 0), color: 'azul' },
        { label: 'Ticket promedio', valor: `$${k.ticketPromedioHoy ?? 0}`, color: 'azul' },
      ];
    }
    if (this.isComercialView) {
      return [
        { label: 'Total Ventas', valor: `$${k.ingresoHoy ?? 0}`, color: 'verde' },
        { label: 'Ticket Promedio', valor: `$${k.ticketPromedioHoy ?? 0}`, color: 'azul' },
        { label: 'Servicios del período', valor: String(k.servicios30Dias ?? k.serviciosHoy ?? 0), color: 'azul' },
      ];
    }
    return [
      { label: 'Lavados', valor: String(k.totalLavadosHoy ?? 0), color: 'verde' },
      { label: 'Finalizados', valor: String(k.lavadosFinalizados ?? 0), color: 'azul' },
      { label: 'Incidentes abiertos', valor: String(k.incidentesAbiertos ?? 0), color: 'rojo' },
    ];
  }

  get generalesItems(): DistributionItem[] {
    return (this.produccion?.generales ?? []).map((x: any) => ({ nombre: x.nombre, valor: Number(x.cantidad) || 0, monto: x.monto != null ? Number(x.monto) : undefined }));
  }

  get especialesItems(): DistributionItem[] {
    return (this.produccion?.especiales ?? []).map((x: any) => ({ nombre: x.nombre, valor: Number(x.cantidad) || 0, monto: x.monto != null ? Number(x.monto) : undefined }));
  }

  mixTab: 'generales' | 'especiales' = 'generales';
  
  /** Navegación interna del tab de inventario (superadmin) */
  invSubTabs = [
    { id: 'salud', label: 'Salud de Inventario' },
    { id: 'reposicion', label: 'Reposición & Cobertura' },
    { id: 'despachos', label: 'Despachos Activos' },
    { id: 'consumo', label: 'Consumo Histórico' }
  ];
  invSub: string = 'salud';

  get activeMixItems(): DistributionItem[] {
    return this.mixTab === 'generales' ? this.generalesItems : this.especialesItems;
  }

  mixComercialTab: 'servicios' | 'categorias' = 'servicios';

  get mixComercialItems(): DistributionItem[] {
    if (this.mixComercialTab === 'categorias') {
      const raw = this.produccion?.mixCategoriaRaw;
      if (raw && raw.length) {
        return raw.map((x: any) => ({
          nombre: x.nombre === 'ESPECIAL' ? 'Especiales / Detailing' : 'Lavados Generales',
          valor: Number(x.cantidad) || 0,
        }));
      }
    }
    const rawServicios = this.produccion?.mixServiciosRaw;
    if (rawServicios && rawServicios.length) {
      return rawServicios.map((x: any) => ({ nombre: x.nombre, valor: Number(x.cantidad) || 0 }));
    }
    return this.itemsDeChart(this.produccion?.mixServicios);
  }

  get coloresItems(): DistributionItem[] {
    return (this.produccion?.colores ?? []).map((x: any) => ({ nombre: x.nombre, valor: Number(x.cantidad) || 0 }));
  }

  get tieneTopVehiculos(): boolean {
    return !!(this.produccion?.topMarcas || this.produccion?.topMarcasModelos || this.coloresItems.length);
  }

  /** ¿Se renderiza el mapa de calor? (solo en la vista nacional, con datos del periodo) */
  get muestraHeatmap(): boolean {
    return this.esAnaliticaGlobal && !!this.produccion?.heatmap;
  }

  /** ¿Se renderiza el bloque Top vs Bottom? (solo en la vista nacional, y solo si no hay ranking de menor actividad) */
  get muestraTopBottom(): boolean {
    return this.esAnaliticaGlobal && (this.rankingTopItems.length > 0 || this.rankingBottomItems.length > 0);
  }

  /**
   * Slots secundarios del nivel nacional. El bloque de agencias va a 8 columnas cuando lo acompaña
   * un ranking (menor actividad o Top vs Bottom) y a fila completa cuando no hay ninguno.
   */
  get muestraBajaActividad(): boolean {
    return this.bajaActividadItems.length > 0;
  }

  /**
   * "Lavados por Bahía" (top 7 de bahías de todo el país) es redundante en la vista nacional: al filtrar por
   * agencia, "Rendimiento Operativo" y "Cuellos de Botella" ya se abren a bahía con
   * "Desempeño de las bahías de la agencia seleccionada". En los paneles sin drill-down
   * (supervisor y operativos) sigue siendo la única lectura de bahía, así que se conserva.
   */
  get muestraLavadosPorBahia(): boolean {
    return !this.isSuperAdminView && !this.isAdminView;
  }

  get spanActividad(): string {
    return this.tieneAgenciasChart ? 'lg:col-span-4' : 'lg:col-span-12';
  }

  /** Anchos de la grilla Analítica: cada fila suma 12 columnas para no dejar huecos. */
  get spanJerarquia(): string {
    return (this.produccion?.mixServicios || this.eficienciaChart) ? 'lg:col-span-8' : 'lg:col-span-12';
  }

  get spanTopVehiculos(): string {
    return this.esAnaliticaGlobal ? 'lg:col-span-4' : 'lg:col-span-12';
  }

  /** Ancho del bloque horario: comparte fila con Top Vehículos (o con el mix en los paneles de rol). */
  get spanHorario(): string {
    return this.esAnaliticaGlobal && !this.tieneTopVehiculos ? 'lg:col-span-12' : 'lg:col-span-8';
  }

  get spanTopAgencias(): string {
    return this.esAnaliticaGlobal && (this.muestraBajaActividad || this.muestraTopBottom) ? 'lg:col-span-8' : 'lg:col-span-12';
  }

  /** Cuellos de botella: entidades del nivel activo ordenadas por tiempo promedio de servicio (más lentas primero). */
  get eficienciaItems(): { nombre: string; minutos: number; cantidad: number }[] {
    const fuente = (this.activeDimension === 'AGENCY' || this.activeDimension === 'POLISHER' || this.esAlcanceAgencia)
      ? (this.produccion?.jerarquia?.desglose ?? [])
      : (this.produccion?.tiemposAgencias ?? []);
    return fuente
      .map((x: any) => ({ nombre: x.nombre, minutos: Number(x.tiempoPromedioMin) || 0, cantidad: Number(x.cantidad) || 0 }))
      .filter((x: { minutos: number }) => x.minutos > 0)
      .sort((a: { minutos: number }, b: { minutos: number }) => this.eficienciaSortTab === 'lentas' ? b.minutos - a.minutos : a.minutos - b.minutos)
      .slice(0, 6);
  }

  get eficienciaChart(): any {
    const items = this.eficienciaItems;
    if (!items.length) return null;
    const minutos = items.map((i) => i.minutos);
    const max = Math.max(...minutos);
    const min = Math.min(...minutos);
    return {
      labels: items.map((i) => i.nombre),
      datasets: [{
        label: 'Minutos',
        data: minutos,
        // Escala de lentitud: ámbar para la más rápida del bloque y rojo para la más lenta.
        backgroundColor: items.map((i) =>
          interpolarHex(CHART_COLORS.amber, CHART_COLORS.rose, max > min ? (i.minutos - min) / (max - min) : 0),
        ),
        borderRadius: 6,
      }],
    };
  }

  get eficienciaTitulo(): string {
    const rapida = this.eficienciaSortTab === 'rapidas';
    if (this.esAlcanceAgencia) {
      return rapida ? 'Bahías Más Rápidas' : 'Cuellos de Botella por Bahía';
    }
    switch (this.activeDimension) {
      case 'AGENCY': return rapida ? 'Bahías Más Rápidas' : 'Cuellos de Botella por Bahía';
      case 'POLISHER': return rapida ? 'Días Más Rápidos del Pulidor' : 'Días Más Lentos del Pulidor';
      case 'REGION': return rapida ? 'Agencias Más Rápidas de la Región' : 'Agencias Más Lentas de la Región';
      default: return rapida ? 'Agencias Más Rápidas del País' : 'Agencias Más Lentas del País';
    }
  }

  get eficienciaSubtitulo(): string {
    const n = this.eficienciaItems.length;
    const rapida = this.eficienciaSortTab === 'rapidas';
    return n ? `Tiempo promedio de servicio (min) · ${n} más ${rapida ? 'rápidas' : 'lentas'} del período` : '';
  }

  /** Entidades del nivel activo con menos servicios (detecta agencias o bahías sin operación). */
  get bajaActividadItems(): RankingItem[] {
    const arr = (this.produccion?.bajaActividad?.items ?? []).map((x: any) => ({
      nombre: x.nombre,
      valor: Number(x.cantidad) || 0,
      secundario: Number(x.cantidad) ? `${Number(x.tiempoPromedioMin) || 0} min promedio` : '',
    }));
    const asc = this.muestraBajaActividadSort ? this.bajaActividadSort === 'asc' : true;
    return arr.sort((a: RankingItem, b: RankingItem) => asc ? a.valor - b.valor : b.valor - a.valor).slice(0, 5);
  }

  get bajaActividadTitulo(): string {
    const asc = this.muestraBajaActividadSort ? this.bajaActividadSort === 'asc' : true;
    if (this.esAlcanceAgencia || this.produccion?.bajaActividad?.entidad === 'Bahía') {
      return asc ? 'Bahías con Menos Actividad' : 'Bahías con Más Actividad';
    }
    switch (this.produccion?.bajaActividad?.entidad) {
      case 'Bahía': return asc ? 'Bahías con Menos Actividad' : 'Bahías con Más Actividad';
      case 'Día': return asc ? 'Días con Menos Actividad' : 'Días con Más Actividad';
      case 'Pulidor': return asc ? 'Pulidores con Menos Actividad' : 'Pulidores con Más Actividad';
      case 'Región': return asc ? 'Regiones con Menos Actividad' : 'Regiones con Más Actividad';
      default: return asc ? 'Agencias con Menos Actividad' : 'Agencias con Más Actividad';
    }
  }

  get bajaActividadSubtitulo(): string {
    const asc = this.muestraBajaActividadSort ? this.bajaActividadSort === 'asc' : true;
    const descText = asc ? 'menor' : 'mayor';
    if (this.esAlcanceAgencia || this.produccion?.bajaActividad?.entidad === 'Bahía') {
      return `Estaciones con ${descText} volumen de servicios`;
    }
    switch (this.produccion?.bajaActividad?.entidad) {
      case 'Bahía': return `Estaciones con ${descText} volumen de servicios`;
      case 'Pulidor': return `Pulidores con ${descText} volumen de servicios`;
      case 'Región': return `Regiones con ${descText} volumen de servicios`;
      default: return `Sucursales con ${descText} volumen de servicios`;
    }
  }

  get muestraBajaActividadSort(): boolean {
    // Si la entidad es Región, solo hay 4, por lo que no tiene sentido un top/bottom.
    return this.produccion?.bajaActividad?.entidad !== 'Región';
  }

  /** Serie de tiempo de resolución según la pestaña (por agencia o por gravedad). */
  get mttrChart(): any {
    if (this.mttrTab === 'gravedad') {
      return this.tecnicoData?.chartMttrGravedad ?? this.tecnicoData?.chartMttrAgencia ?? null;
    }
    return this.tecnicoData?.chartMttrAgencia ?? this.tecnicoData?.chartMttrGravedad ?? null;
  }

  /** Explica en qué se basa el promedio y sobre cuántos incidentes resueltos se calculó. */
  /**
   * Base del subtítulo del MTTR. El panel ejecutivo la usa con el orden fijo descendente de siempre; el
   * dashboard de mantenimiento le pasa el sentido activo, para no anunciar un orden distinto al del gráfico.
   */
  private baseMttrSubtitulo(direccion: 'ASC' | 'DESC'): string {
    const items: any[] = (this.mttrTab === 'gravedad' ? this.tecnicoData?.mttrGravedad : this.tecnicoData?.mttrAgencia) ?? [];
    const resueltos = items.reduce((sum, x) => sum + (Number(x.incidentes) || 0), 0);
    if (!resueltos) return 'Sin incidentes resueltos en el período';
    const base = this.mttrTab === 'gravedad'
      ? 'Horas promedio hasta resolver, por gravedad'
      : direccion === 'ASC'
        ? 'Horas promedio hasta resolver, por agencia (de más rápida a más lenta)'
        : 'Horas promedio hasta resolver, por agencia (de más lenta a más rápida)';
    return `${base} · ${resueltos} incidente${resueltos === 1 ? '' : 's'} resuelto${resueltos === 1 ? '' : 's'}`;
  }

  get mttrSubtitulo(): string {
    return this.baseMttrSubtitulo('DESC');
  }

  /** Subtítulo del MTTR en el dashboard de mantenimiento, con el sentido del orden que el usuario eligió. */
  get mttrSubtituloTaller(): string {
    return this.baseMttrSubtitulo(this.mttrTop.direccion);
  }

  /** ¿Hay datos para el gráfico unificado de agencias? */
  get tieneAgenciasChart(): boolean {
    return !!(this.produccion?.topAgenciasProductivas || this.produccion?.agenciasRankGastoInsumos || this.produccion?.topAgenciasReparaciones || this.produccion?.distribucionModelos);
  }

  /**
   * Nombre de la agencia actualmente en foco (por filtro explícito o por asignación del usuario).
   */
  get nombreAgenciaActiva(): string {
    const u = this.auth.getCurrentUser();
    return this.agenciaLabel || u?.sucursal || u?.sucursalNombre || 'la agencia';
  }

  /**
   * Determina si el análisis está acotado al alcance de una agencia específica:
   * ya sea porque se filtró manualmente una agencia, o porque el rol del usuario es de ámbito agencia.
   */
  get esAlcanceAgencia(): boolean {
    const u = this.auth.getCurrentUser();
    return !!this.agenciaFiltro || (!!u && (u.ambito === 'AGENCIA' || !this.puedeFiltrarAgencia));
  }

  get chartTituloAgencias(): string {
    return this.esAlcanceAgencia ? 'Rendimiento por Bahía' : 'Top Agencias';
  }

  /** Datos del gráfico de agencias/bahías unificado; si se analiza una agencia, baja automáticamente a bahías. */
  get chartAgenciasActivo(): any {
    if (this.esAlcanceAgencia) {
      const base = this.agenciasTab === 'tiempos'
        ? this.produccion?.tiemposBahias
        : (this.produccion?.distribucionModelos ?? this.produccion?.agenciasRankServicios ?? this.produccion?.topAgenciasProductivas);
      return ordenarSerieTop(base, this.agenciasTop);
    }

    const productivas = this.produccion?.agenciasRankServicios ?? this.produccion?.topAgenciasProductivas ?? this.produccion?.distribucionModelos;
    const gastoInsumos = this.produccion?.agenciasRankGastoInsumos;
    const gastoMantenimientos = this.produccion?.agenciasRankGastoMantenimientos;
    const reparaciones = this.produccion?.agenciasRankCosto ?? this.produccion?.topAgenciasReparaciones;
    const incidentes = this.produccion?.agenciasRankIncidentes ?? this.produccion?.topAgencias;
    const tiempos = this.produccion?.tiemposBahias;

    const base = this.agenciasTab === 'gastoInsumos' ? (gastoInsumos ?? productivas)
      : this.agenciasTab === 'gastoMantenimientos' ? (gastoMantenimientos ?? productivas)
      : this.agenciasTab === 'reparaciones' ? (reparaciones ?? productivas)
      : this.agenciasTab === 'incidentes' ? (incidentes ?? reparaciones ?? productivas)
      : this.agenciasTab === 'tiempos' ? (tiempos ?? productivas)
        : (productivas ?? reparaciones);
    return ordenarSerieTop(base, this.agenciasTop);
  }

  get agenciasSubtitulo(): string {
    const entidad = this.esAlcanceAgencia ? `por bahía en ${this.nombreAgenciaActiva}` : 'por agencia de la región';
    switch (this.agenciasTab) {
      case 'gastoInsumos': return `USD consumidos en insumos en el período ${entidad}`;
      case 'gastoMantenimientos': return `USD acumulado en mantenimientos de maquinaria ${entidad}`;
      case 'reparaciones': return `USD acumulado en incidencias (fallas) ${entidad}`;
      case 'incidentes': return `Fallas y averías de maquinaria ${entidad}`;
      case 'tiempos': return `Tiempo promedio de atención en minutos ${entidad}`;
      default: return `Servicios del período ${entidad}`;
    }
  }

  get incidentesTitulo(): string {
    if (this.incidentesTab === 'bahia') return 'Incidentes por Bahía';
    if (this.incidentesTab === 'pulidor') return 'Incidentes por Pulidor';
    return 'Incidentes por Agencia';
  }

  get incidentesDataChart(): any {
    if (this.incidentesTab === 'bahia') {
      return this.incidentesSortTab === 'mas' ? this.produccion?.topBahias : this.produccion?.bottomBahias;
    }
    if (this.incidentesTab === 'pulidor') {
      return this.incidentesSortTab === 'mas' ? this.produccion?.topPulidores : this.produccion?.bottomPulidores;
    }
    return this.incidentesSortTab === 'mas' ? this.produccion?.topAgencias : this.produccion?.bottomAgencias;
  }

  /** Serie del drill-down jerárquico con el orden y el tamaño elegidos (Top 5 / Top 10). */
  get jerarquiaChartOrdenado(): any {
    return ordenarSerieTop(this.produccion?.jerarquiaChart, this.jerarquiaTop);
  }

  /**
   * El control de orden necesita entidades comparables entre sí. Con el filtro puesto en un pulidor la serie
   * son días, y ordenar los días por volumen como si fueran un ranking no aporta nada.
   */
  get muestraOrdenJerarquia(): boolean {
    const j = this.produccion?.jerarquia;
    return !!j && j.entidad !== 'Día' && !!this.produccion?.jerarquiaChart;
  }

  /** Consumo de insumos: serie completa ordenada y recortada por su control (Top 5 / Top 10, asc o desc). */
  get consumoInsumosChart(): any {
    return ordenarSerieTop(this.distribuidorData?.chartConsumoInsumos || this.bodegaData?.chartTopInsumosConsumoRank, this.consumoTop);
  }

  /** Consumo por agencia con el mismo control de orden. */
  get consumoAgenciaChart(): any {
    return ordenarSerieTop(this.distribuidorData?.chartConsumoPorAgencia || this.bodegaData?.chartTopAgenciasConsumoRank, this.consumoAgenciaTop);
  }

  /** El título del ranking de insumos dice qué extremo se está viendo; si no, "más consumidos" mentiría en ascendente. */
  get consumoInsumosTitulo(): string {
    const extremo = this.consumoTop.direccion === 'ASC' ? 'Menos consumidos' : 'Más consumidos';
    return `Insumos · ${extremo} (Top ${this.consumoTop.tamano})`;
  }

  get consumoAgenciaSubtitulo(): string {
    return this.consumoAgenciaTop.direccion === 'ASC'
      ? 'Agencias con menos consumo de insumos (unidades)'
      : 'Agencias con más consumo de insumos (unidades)';
  }

  /** Top Vehículos en formato distribución (dona + lista): serie elegida entre marca · modelo · color. */
  get vehiculosItems(): DistributionItem[] {
    const marcas = this.itemsDeChart(this.produccion?.topMarcas);
    const modelos = this.itemsDeChart(this.produccion?.topMarcasModelos);
    const colores = this.coloresItems;
    if (this.vehiculosTab === 'modelos') return modelos.length ? modelos : (marcas.length ? marcas : colores);
    if (this.vehiculosTab === 'colores') return colores.length ? colores : (marcas.length ? marcas : modelos);
    return marcas.length ? marcas : (modelos.length ? modelos : colores);
  }

  get vehiculosSubtitulo(): string {
    switch (this.vehiculosTab) {
      case 'modelos': return 'Marca · modelo más frecuentes';
      case 'colores': return 'Vehículos atendidos por color';
      default: return 'Marcas más frecuentes';
    }
  }

  private itemsDeChart(chart: any): DistributionItem[] {
    const labels: string[] = chart?.labels ?? [];
    const data: number[] = chart?.datasets?.[0]?.data ?? [];
    return labels.map((nombre, i) => ({ nombre, valor: Number(data[i]) || 0 }));
  }

  /** Heatmap día × hora del período (dentro de la jerarquía). */
  get heatmapData(): { dias: string[]; horas: string[]; matriz: number[][] } | null {
    return this.produccion?.heatmap ?? null;
  }

  /** Top/Bottom adaptativo según la entidad del nivel activo (Región/Agencia/Bahía/Pulidor). */
  get rankingEntidad(): string {
    return this.produccion?.rankingEntidad || 'Entidad';
  }

  get rankingTopItems(): TopBottomItem[] {
    return (this.produccion?.rankingTop ?? []).map((x: any) => ({ nombre: x.nombre, cantidad: Number(x.cantidad) || 0, tiempoPromedioMin: x.tiempoPromedioMin }));
  }

  get rankingBottomItems(): TopBottomItem[] {
    return (this.produccion?.rankingBottom ?? []).map((x: any) => ({ nombre: x.nombre, cantidad: Number(x.cantidad) || 0, tiempoPromedioMin: x.tiempoPromedioMin }));
  }

  /** Ranking de agencias por gasto en reparaciones (para la lista con barras). */
  get agenciasReparacionesItems(): RankingItem[] {
    return (this.produccion?.agenciasReparaciones ?? []).map((a: any) => ({ nombre: a.nombre, valor: Number(a.costo) || 0 }));
  }

  /** Ranking de agencias por cantidad de incidentes (para la lista con barras). */
  get agenciasIncidentesItems(): RankingItem[] {
    return (this.produccion?.agenciasIncidentesRaw ?? []).map((a: any) => ({ nombre: a.nombre, valor: Number(a.total) || 0 }));
  }

  get pulidoresActuales(): any[] {
    if (!this.especialesData) return [];
    const raw = this.pulidoresTab === 'fijos'
      ? (this.especialesData.pulidoresFijos || [])
      : this.pulidoresTab === 'moviles'
      ? (this.especialesData.pulidoresMoviles || [])
      : [...(this.especialesData.pulidoresFijos || []), ...(this.especialesData.pulidoresMoviles || [])];
    const asc = this.pulidoresTablaTop.direccion === 'ASC';
    const sorted = [...raw].sort((a: any, b: any) => asc ? (a.servicios - b.servicios) : (b.servicios - a.servicios));
    return sorted.slice(0, this.pulidoresTablaTop.tamano);
  }

  get chartTopOperadoresOrdenado(): any {
    if (!this.especialesData) return null;
    let serieBase: any = this.especialesData?.chartTopOperadores;
    if (this.pulidoresTab === 'fijos') {
      const fijos = this.especialesData.pulidoresFijos || [];
      serieBase = fijos.length ? {
        labels: fijos.map((p: any) => p.nombre),
        datasets: [{ label: 'Servicios', data: fijos.map((p: any) => p.servicios), backgroundColor: CHART_COLORS.blue }],
      } : { labels: [], datasets: [{ label: 'Servicios', data: [] }] };
    } else if (this.pulidoresTab === 'moviles') {
      const moviles = this.especialesData.pulidoresMoviles || [];
      serieBase = moviles.length ? {
        labels: moviles.map((p: any) => p.nombre),
        datasets: [{ label: 'Servicios', data: moviles.map((p: any) => p.servicios), backgroundColor: CHART_COLORS.amber }],
      } : { labels: [], datasets: [{ label: 'Servicios', data: [] }] };
    }
    return ordenarSerieTop(serieBase, this.pulidoresChartTop);
  }

  get chartTipoServicioOrdenado(): any {
    return ordenarSerieTop(this.especialesData?.chartTipoServicio, this.mixEspecialesTop);
  }

  get mixEspecialesItems(): DistributionItem[] {
    let raw = this.especialesData?.tipoServicio;
    if (!raw || !raw.length) {
      const chart = this.especialesData?.chartTipoServicio;
      if (chart?.labels && chart?.datasets?.[0]?.data) {
        raw = chart.labels.map((nombre: string, i: number) => ({
          nombre,
          cantidad: Number(chart.datasets[0].data[i]) || 0
        }));
      } else {
        raw = [];
      }
    }
    const asc = this.mixEspecialesTop.direccion === 'ASC';
    const sorted = [...raw].sort((a: any, b: any) => asc ? (a.cantidad - b.cantidad) : (b.cantidad - a.cantidad));
    const sliced = sorted.slice(0, this.mixEspecialesTop.tamano);
    return sliced.map((x: any) => ({ nombre: x.nombre, valor: Number(x.cantidad) || 0, monto: x.monto != null ? Number(x.monto) : undefined }));
  }

  get tituloFlujoEspeciales(): string {
    switch (this.rangoFiltro) {
      case 'HOY': return 'OTs Creadas (Últimos 7 días)';
      case 'SEMANA': return 'OTs Creadas en la Semana';
      case 'MES': return 'Evolución de OTs del Mes';
      case 'ANIO': return 'Evolución de OTs del Año';
      case 'TRIMESTRE': return 'Evolución de OTs del Trimestre';
      case 'SEMESTRE': return 'Evolución de OTs del Semestre';
      default: return 'Evolución de OTs Especiales';
    }
  }

  get subtituloFlujoEspeciales(): string {
    return `Tendencia de órdenes generadas (${this.etiquetaRango})`;
  }

  get tabAnaliticaTitle(): string {
    if (this.isAdminView) return 'Flujo de Usuarios';
    if (this.isAprobadorView) return 'Aprobaciones';
    if (this.isComercialView) return 'Ventas y Flujo';
    if (this.isSupervisorView) return 'Operación Regional';
    return 'Analítica y Flujo';
  }

  get tabAuditoriaTitle(): string {
    if (this.isAdminView) return 'Auditoría y Roles';
    if (this.isAprobadorView) return 'Revisión (N/A)'; // Usualmente oculto
    if (this.isComercialView) return 'Autorizaciones';
    if (this.isSupervisorView) return 'Salud Regional';
    return 'Servicios en Curso';
  }

  get tabTallerTitle(): string {
    return 'Activos & Taller';
  }

  get tabInventarioTitle(): string {
    if (this.isAdminView) return 'Catálogos';
    if (this.isAprobadorView || this.isComercialView) return 'Catálogo Comercial';
    if (this.isSupervisorView) return 'Abastecimiento';
    return 'Inventario & Suministros';
  }

  /**
   * Título del gráfico principal adaptado a la dimensión activa (drill-down): el mismo widget cambia de
   * nivel de análisis según el filtro estructural elegido.
   */
  get tituloDrilldown(): string {
    switch (this.activeDimension) {
      case 'REGION': return 'Análisis Comparativo de Agencias en la Región';
      case 'AGENCY': return 'Rendimiento por Bahía de Trabajo';
      case 'POLISHER': return 'Ficha de Rendimiento del Pulidor';
      default:
        if (this.esAlcanceAgencia) return 'Rendimiento por Bahía de Trabajo';
        if (this.isAdminView) return 'Rendimiento Operativo Nacional por Agencia';
        if (this.isComercialView) return 'Solicitudes Comerciales';
        return 'Flujo Horario de Atención';
    }
  }

  get subtituloDrilldown(): string {
    switch (this.activeDimension) {
      case 'REGION': return 'Comparativa de agencias dentro de la región seleccionada';
      case 'AGENCY': return 'Desempeño de las bahías de la agencia seleccionada';
      case 'POLISHER': return 'Evolución y comparación contra el promedio de su agencia';
      default:
        if (this.esAlcanceAgencia) return `Desempeño de las bahías en ${this.nombreAgenciaActiva}`;
        if (this.esAnaliticaGlobal) return 'Comparativa nacional por agencia';
        return 'Vehículos procesados en el día';
    }
  }

  get tasaRechazoAprobaciones(): number {
    if (this.produccion?.metricasAprobaciones?.kpis?.tasaRechazoPct !== undefined) {
      return this.produccion.metricasAprobaciones.kpis.tasaRechazoPct;
    }
    const aprobadas = this.produccion?.metricasAprobaciones?.kpis?.aprobadasHoy ?? 0;
    const rechazadas = this.produccion?.metricasAprobaciones?.kpis?.rechazadasHoy ?? 0;
    const totalDecididas = aprobadas + rechazadas;
    return totalDecididas > 0 ? Number(((rechazadas / totalDecididas) * 100).toFixed(1)) : 0;
  }

  /** Subtítulo del drill-down: declara la base del cálculo y sigue siendo correcto sin datos. */
  get subtituloJerarquia(): string {
    const j = this.produccion?.jerarquia;
    if (!j) return 'Sin servicios en el nivel y los filtros seleccionados';
    const k = j.kpis ?? {};
    return `Desglose por ${j.entidad} · ${k.registros ?? 0} servicios · ${k.tiempoPromedioMin ?? 0} min promedio`;
  }

  /** Administrador, Super Admin o Ejecutivo (Supervisor, Líder, Jefe): paneles con drill-down. */
  get esAnaliticaGlobal(): boolean {
    return this.isAdminView || this.isSuperAdminView || this.isEjecutivoView;
  }

  /**
   * Las tarjetas de fallas de maquinaria (equipos vulnerables, incidentes y fallas por tipo/gravedad) se
   * alimentan del panel operativo, que trae los incidentes por equipo, agencia y gravedad. Los paneles de
   * ADMIN (usuarios, roles, catálogo) y COMERCIAL no incluyen incidentes: para esos roles se ocultan en vez
   * de quedar como tarjetas vacías.
   */
  get muestraFallasMaquinaria(): boolean {
    return !this.isAdminView && !this.isComercialView;
  }

  get chart1Title(): string {
    if (this.esAnaliticaGlobal) return this.tituloDrilldown;
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
    if (this.isAprobadorView) return 'Estados de Solicitud';
    if (this.isComercialView) return 'Mix Comercial de Servicios';
    return 'Estado de Órdenes de Lavado';
  }

  get chart2Subtitle(): string {
    if (this.isAdminView) return 'Roles de los usuarios registrados';
    if (this.isAprobadorView) return 'Distribución por estado de aprobación';
    if (this.isComercialView) return 'Categorías de servicios especiales vs lavado';
    return 'Servicios de hoy por etapa operativa';
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
    if (this.isAprobadorView) return 'Tipos de Solicitud';
    if (this.isComercialView) return 'Top Marcas Atendidas';
    const entidad = this.esAlcanceAgencia ? 'Bahía' : 'Agencia';
    switch (this.chart4Tab) {
      case 'incidentes': return `Incidentes por ${entidad}`;
      case 'gastos': return `Gastos Técnicos por ${entidad}`;
      case 'tiempos': return `Tiempos por ${entidad}`;
      default: return `Lavados por ${entidad}`;
    }
  }

  get chart4Subtitle(): string {
    if (this.isAdminView) return 'Acciones realizadas';
    if (this.isAprobadorView) return 'Distribución por tipo de requerimiento';
    const nivel = this.esAlcanceAgencia ? `por bahía en ${this.nombreAgenciaActiva}` : 'por agencia de la región';
    switch (this.chart4Tab) {
      case 'incidentes': return `Fallas y averías de maquinaria ${nivel}`;
      case 'gastos': return `USD acumulado en reparaciones ${nivel}`;
      case 'tiempos': return `Tiempo promedio de atención en minutos ${nivel}`;
      default: return `Productividad en cantidad ${nivel}`;
    }
  }

  get chart4Data(): any {
    let serieBase: any;
    switch (this.chart4Tab) {
      case 'incidentes':
        serieBase = this.esAlcanceAgencia
          ? this.produccion?.topBahias
          : (this.produccion?.agenciasRankIncidentes ?? this.produccion?.topAgencias);
        break;
      case 'gastos':
        serieBase = this.produccion?.agenciasRankCosto ?? this.produccion?.topAgenciasReparaciones;
        break;
      case 'tiempos':
        serieBase = this.produccion?.tiemposBahias;
        break;
      default:
        serieBase = this.produccion?.distribucionModelos;
        break;
    }
    return ordenarSerieTop(serieBase, this.chart4Top);
  }

  get filtroActual() {
    return {
      rango: this.rangoFiltro,
      fechaDesde: this.rangoFiltro === 'RANGO' ? this.fechaDesdeFiltro || undefined : undefined,
      fechaHasta: this.rangoFiltro === 'RANGO' ? this.fechaHastaFiltro || undefined : undefined,
      // Solo la dimensión activa (filtro exclusivo); el resto van undefined.
      dimension: this.activeDimension,
      regionId: this.regionFiltro || undefined,
      agenciaId: this.agenciaFiltro || undefined,
      clienteId: this.clienteFiltro || undefined,
      bahiaId: this.bahiaFiltro || undefined,
      pulidorId: this.pulidorFiltro || undefined,
      // Modificador continuo: se combina con la dimensión y las fechas.
      categoriaServicio: this.categoriaServicio === 'TODOS' ? undefined : this.categoriaServicio,
      servicioIds: this.serviciosFiltro.length ? this.serviciosFiltro.map(Number).filter((n) => Number.isFinite(n)) : undefined,
      // Desglose del gráfico: solo tiene sentido a nivel país (con una dimensión activa o alcance de agencia el drill-down ya manda).
      desglose: this.activeDimension === 'GLOBAL' && !this.esAlcanceAgencia ? this.desgloseTab : undefined,
    };
  }

  /** El filtro de región solo aplica a quien ve más de una región (alcance global). */
  get puedeFiltrarRegion(): boolean {
    const u = this.auth.getCurrentUser();
    return u?.ambito === 'GLOBAL' || this.auth.isSuperAdmin();
  }

  /** El filtro de cliente/marca aplica a quien puede ver múltiples agencias (global o regional). */
  get puedeFiltrarCliente(): boolean {
    return this.puedeFiltrarAgencia;
  }

  /** El filtro de agencia aplica a alcance global o regional (el de agencia ya está acotado a la suya). */
  get puedeFiltrarAgencia(): boolean {
    const u = this.auth.getCurrentUser();
    return u?.ambito === 'GLOBAL' || this.auth.isSuperAdmin() || u?.ambito === 'REGION';
  }

  get hayFiltrosActivos(): boolean {
    return !!this.regionFiltro || !!this.agenciaFiltro || !!this.clienteFiltro || !!this.bahiaFiltro || !!this.pulidorFiltro || this.rangoFiltro !== 'HOY' || this.categoriaServicio !== 'TODOS' || this.serviciosFiltro.length > 0;
  }

  // ── Filtros exclusivos: se habilita GLOBAL y la propia dimensión activa ──
  get regionHabilitada(): boolean { return this.activeDimension === 'GLOBAL' || this.activeDimension === 'REGION'; }
  get agenciaHabilitada(): boolean { return this.activeDimension === 'GLOBAL' || this.activeDimension === 'REGION' || this.activeDimension === 'AGENCY'; }
  get pulidorHabilitado(): boolean { return this.activeDimension === 'GLOBAL' || this.activeDimension === 'POLISHER'; }
  /** true mientras hay una dimensión estructural distinta a GLOBAL (para el botón de reset). */
  get hayDimensionEstructural(): boolean { return this.activeDimension !== 'GLOBAL'; }

  /** Etiqueta del nivel de análisis actual (encabezado del panel). */
  get nivelAnalisisLabel(): string {
    const u = this.auth.getCurrentUser();
    switch (this.activeDimension) {
      case 'REGION': return `Región · ${this.regionLabel || 'seleccionada'}`;
      case 'AGENCY': return `Agencia · ${this.agenciaLabel || 'seleccionada'}`;
      case 'POLISHER': return `Pulidor · ${this.pulidorLabel || 'seleccionado'}`;
      default:
        if (this.clienteFiltro) {
          return `Cliente · ${this.clienteLabel || 'seleccionado'}`;
        }
        if (this.vista === 'especiales') {
          return this.isPulidor
            ? `Agencia · ${u?.sucursal || u?.sucursalNombre || this.contextLabel || 'Asignada'}`
            : 'Global · Red Especializada';
        }
        if (u?.ambito === 'REGION') {
          return `Región · ${u?.region || u?.regionNombre || this.contextLabel || 'Asignada'}`;
        }
        if (u?.ambito === 'AGENCIA') {
          return `Agencia · ${u?.sucursal || u?.sucursalNombre || this.contextLabel || 'Asignada'}`;
        }
        return 'Global · País';
    }
  }

  /** Subtítulo descriptivo del nivel de análisis actual según la dimensión o el alcance del usuario. */
  get nivelAnalisisSubtitulo(): string {
    switch (this.activeDimension) {
      case 'REGION': return 'Comparativa de agencias dentro de la región';
      case 'AGENCY': return 'Detalle por bahía de trabajo';
      case 'POLISHER': return 'Ficha individual del pulidor';
      default:
        if (this.clienteFiltro) {
          return `Consolidado de agencias de ${this.clienteLabel || 'este cliente'}`;
        }
        if (this.vista === 'especiales') {
          return this.isPulidor
            ? 'Monitoreo de órdenes de trabajo, insumos y herramientas de detailing'
            : 'Monitoreo nacional de servicios especiales y pulidores';
        }
        if (this.puedeFiltrarRegion) return 'Comparativa entre agencias y regiones';
        if (this.puedeFiltrarAgencia) return 'Consolidado de agencias de su región';
        return 'Detalle operativo de su agencia';
    }
  }

  get esRangoPersonalizado(): boolean {
    return this.rangoFiltro === 'RANGO';
  }

  /** Etiqueta corta del periodo activo (para el badge de las tarjetas KPI). Incluye el tipo de servicio. */
  get etiquetaRango(): string {
    const base = this.esRangoPersonalizado ? 'RANGO' : (this.rangos.find((r) => r.id === this.rangoFiltro)?.label.toUpperCase() || 'HOY');
    return this.categoriaServicio === 'TODOS' ? base : `${base} · ${this.categoriaServicio}`;
  }

  /** Cambia el periodo del dashboard. Al pasar a "Rango" precarga un mes por defecto. */
  onRangoChange(rango: RangoPeriodo): void {
    this.rangoFiltro = rango;
    if (rango === 'RANGO' && !this.fechaDesdeFiltro) {
      const hoy = new Date();
      this.fechaDesdeFiltro = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
      this.fechaHastaFiltro = this.hoyISO;
    }
    this.recargar();
  }

  /**
   * Máquina de estados de filtros exclusivos:
   *  - Elegir Región → limpia Agencia y Pulidor y los bloquea.
   *  - Elegir Agencia → limpia Región y Pulidor y los bloquea.
   *  - Elegir Pulidor → limpia Región y Agencia y los bloquea.
   *  - Quitar el valor activo → vuelve a GLOBAL (los tres habilitados).
   * Las fechas nunca se tocan.
   */
  /** Etiqueta del tipo de servicio activo (para el resumen del período). */
  get etiquetaCategoriaServicio(): string {
    return this.categoriasServicio.find((c) => c.id === this.categoriaServicio)?.label || '';
  }

  /** Cambia el tipo de servicio sin tocar la dimensión estructural ni las fechas. */
  onCategoriaServicioChange(valor: 'TODOS' | 'GENERAL' | 'ESPECIAL'): void {
    this.categoriaServicio = valor;
    this.cargarServiciosOpciones();
    this.recargar();
  }

  /** Cambia los servicios elegidos (varios); vacío vuelve a «todos». */
  onServiciosChange(valores: string[]): void {
    this.serviciosFiltro = valores;
    this.recargar();
  }

  /** Servicios del catálogo para el filtro, acotados a la categoría elegida. Sin permiso de catálogo el filtro no se ofrece. */
  private cargarServiciosOpciones(): void {
    const categoria = this.categoriaServicio === 'TODOS' ? undefined : this.categoriaServicio;
    this.opciones.todas('/catalogos/servicios/opciones', categoria ? { categoria } : {}).subscribe({
      next: (lista) => {
        this.serviciosOpciones = lista;
        // Lo elegido que ya no está en la lista (por cambiar de categoría) se descarta.
        this.serviciosFiltro = this.serviciosFiltro.filter((v) => lista.some((o) => o.value === v));
      },
      error: () => { this.serviciosOpciones = []; this.serviciosFiltro = []; },
    });
  }

  /** Cambia el nivel de desglose del gráfico de rendimiento (solo se usa con el filtro en GLOBAL). */
  cambiarDesglose(valor: 'REGION' | 'AGENCY' | 'POLISHER'): void {
    if (this.desgloseTab === valor) return;
    this.desgloseTab = valor;
    this.recargar();
  }

  onRegionChange(regionId: string | null): void {
    this.regionFiltro = regionId;
    if (!regionId) this.regionLabel = '';
    this.clienteFiltro = null;
    this.clienteLabel = '';
    this.agenciaFiltro = null;
    this.agenciaLabel = '';
    this.bahiaFiltro = null;
    this.bahiaLabel = '';
    this.pulidorFiltro = null;
    this.pulidorLabel = '';
    this.activeDimension = regionId ? 'REGION' : 'GLOBAL';
    this.cargarClientes = this.opciones.clientes(regionId ? { regionId } : {});
    this.cargarAgencias = this.opciones.agencias(regionId ? { regionId } : undefined);

    this.recargar();
  }

  onClienteChange(clienteId: string | null): void {
    this.clienteFiltro = clienteId;
    if (!clienteId) this.clienteLabel = '';
    this.agenciaFiltro = null;
    this.agenciaLabel = '';
    this.bahiaFiltro = null;
    this.bahiaLabel = '';
    this.cargarAgencias = this.opciones.agencias({
      regionId: this.regionFiltro || undefined,
      clienteId: clienteId || undefined,
    });
    this.recargar();
  }

  onAgenciaChange(agenciaId: string | null): void {
    this.agenciaFiltro = agenciaId;
    this.bahiaFiltro = null;
    this.bahiaLabel = '';
    const u = this.auth.getCurrentUser();
    const userAgencia = u?.agenciaId || u?.sucursalId;

    const agId = agenciaId || userAgencia;
    this.cargarBahias = this.opciones.bahias(agId ? { agenciaId: String(agId) } : {});
    if (!agenciaId) {
      this.agenciaLabel = '';
      this.activeDimension = this.regionFiltro ? 'REGION' : 'GLOBAL';
    } else {
      this.activeDimension = 'AGENCY';
      this.pulidorFiltro = null;
      this.pulidorLabel = '';
    }
    this.recargar();
  }

  onBahiaChange(bahiaId: string | null): void {
    this.bahiaFiltro = bahiaId;
    if (!bahiaId) this.bahiaLabel = '';
    this.recargar();
  }

  onPulidorChange(pulidorId: string | null): void {
    this.pulidorFiltro = pulidorId;
    if (!pulidorId) this.pulidorLabel = '';
    this.regionFiltro = null;
    this.regionLabel = '';
    this.clienteFiltro = null;
    this.clienteLabel = '';
    this.agenciaFiltro = null;
    this.agenciaLabel = '';
    this.bahiaFiltro = null;
    this.bahiaLabel = '';
    this.activeDimension = pulidorId ? 'POLISHER' : 'GLOBAL';
    this.recargar();
  }

  private limpiarAgenciaYPulidor(): void {
    this.agenciaFiltro = null;
    this.agenciaLabel = '';
    this.bahiaFiltro = null;
    this.bahiaLabel = '';
    this.pulidorFiltro = null;
    this.pulidorLabel = '';
  }

  /** Reset estructural: vuelve a GLOBAL y mantiene el rango de fechas seleccionado. */
  limpiarDimensiones(): void {
    const u = this.auth.getCurrentUser();
    const regId = u?.ambito === 'REGION' && u?.regionId ? String(u.regionId) : undefined;
    this.regionFiltro = null;
    this.agenciaFiltro = null;
    this.clienteFiltro = null;
    this.bahiaFiltro = null;
    this.pulidorFiltro = null;
    this.regionLabel = '';
    this.agenciaLabel = '';
    this.clienteLabel = '';
    this.bahiaLabel = '';
    this.pulidorLabel = '';
    this.activeDimension = 'GLOBAL';
    this.cargarClientes = this.opciones.clientes(regId ? { regionId: regId } : {});
    this.cargarAgencias = this.opciones.agencias(regId ? { regionId: regId } : {});
    this.recargar();
  }

  limpiarFiltros(): void {
    const u = this.auth.getCurrentUser();
    const regId = u?.ambito === 'REGION' && u?.regionId ? String(u.regionId) : undefined;
    this.regionFiltro = null;
    this.agenciaFiltro = null;
    this.clienteFiltro = null;
    this.bahiaFiltro = null;
    this.pulidorFiltro = null;
    this.regionLabel = '';
    this.agenciaLabel = '';
    this.clienteLabel = '';
    this.bahiaLabel = '';
    this.pulidorLabel = '';
    this.categoriaServicio = this.vista === 'especiales' ? 'ESPECIAL' : 'TODOS';
    this.serviciosFiltro = [];
    this.cargarServiciosOpciones();
    this.desgloseTab = 'REGION';
    this.activeDimension = 'GLOBAL';
    this.rangoFiltro = 'HOY';
    this.fechaDesdeFiltro = '';
    this.fechaHastaFiltro = '';
    this.fechaActual = new Date();
    this.cargarClientes = this.opciones.clientes(regId ? { regionId: regId } : {});
    this.cargarAgencias = this.opciones.agencias(regId ? { regionId: regId } : {});
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
    this.cargarPersonalMes();
    this.cargarEstrellasAgencia();
  }

  /** Lavadores del período del dashboard o, si se eligió un mes, los de ese mes. */
  get lavadoresVista(): {ranking: any[], rankingBottom: any[]} | null {
    return this.personalMes ? this.rankingLavadoresMes : this.rankingLavadores;
  }

  get pulidoresVista(): {fijos: any[], bottomFijos: any[], moviles: any[], bottomMoviles: any[]} | null {
    return this.personalMes ? this.rankingPulidoresMes : this.rankingPulidores;
  }

  onPersonalMesChange(mes: string): void {
    this.personalMes = /^\d{4}-\d{2}$/.test(mes) ? mes : '';
    this.rankingLavadoresMes = null;
    this.rankingPulidoresMes = null;
    this.cargarPersonalMes();
  }

  /** Pide los rankings del mes elegido con los mismos filtros del dashboard (agencia, región, categoría, servicios…). */
  private cargarPersonalMes(): void {
    if (!this.personalMes) return;
    const [anio, mes] = this.personalMes.split('-').map(Number);
    const ultimo = new Date(anio, mes, 0).getDate();
    const filtro = { ...this.filtroActual, rango: 'RANGO' as const, fechaDesde: `${this.personalMes}-01`, fechaHasta: `${this.personalMes}-${String(ultimo).padStart(2, '0')}` };
    const actual = this.personalMes;
    this.carga.add(this.dashboardService.getRankingLavadores(filtro).subscribe((d) => { if (this.personalMes === actual) this.rankingLavadoresMes = d; }));
    if (this.puedeVerProductividad) {
      this.carga.add(this.dashboardService.getRankingPulidores(filtro).subscribe((d) => { if (this.personalMes === actual) this.rankingPulidoresMes = d; }));
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
    const user = a.getCurrentUser();
    const rol = user?.role || user?.rolNombre;

    // 1. Forzar vistas especializadas explícitas para roles técnicos/operativos (evita cruce por permisos mezclados)
    if (rol === 'COORD_MANTENIMIENTO' || rol === 'TECNICO') return 'taller';
    if (rol === 'COORD_SERVICIOS_ESPECIALES' || rol === 'PULIDOR') return 'especiales';
    if (rol === 'COORD_BODEGA' || rol === 'ASISTENTE_BODEGA') return 'bodega';

    // 2. Reglas dinámicas genéricas (fallback por permisos)
    const veServicios = a.puede('servicios.ver');
    if (a.puede('maquinaria.ver') && a.puede('mantenimientos.ejecutar') && !veServicios) return 'taller';
    if (a.puede('especiales.ver') && !veServicios) return 'especiales';
    if (a.puede('inventario.ver') && a.puede('despachos.crear') && !veServicios) return 'bodega';
    
    // 3. Vista gerencial / supervisión
    if (a.puede('dashboard.ver')) return 'ejecutivo';
    return 'ninguna';
  }

  get puedeVerAlertas(): boolean { return this.auth.puede('dashboard.alertas.ver'); }
  get puedeVerMaquinaria(): boolean { return this.auth.puede('maquinaria.ver'); }
  get puedeVerAuditorias(): boolean { return this.auth.puedeAlguno('informes.ver', 'inspecciones.ver'); }

  /** Datos de la pestaña «Inspecciones y 5S». */
  auditoriasData: any = null;
  auditoriasTop: OrdenTop = { tamano: 5, direccion: 'DESC' };
  /** Estrellas de la agencia en foco (la propia o la filtrada): última 5S y último informe de inspección. */
  estrellasAgencia: { agenciaNombre?: string; inspeccion: any; cincoS: any } | null = null;

  get rankingAuditoriasChart(): any {
    return ordenarSerieTop(this.auditoriasData?.chartRankingAgencias, this.auditoriasTop);
  }

  /** Pide las estrellas de la agencia en foco para el encabezado; sin agencia o sin permiso, no se muestra nada. */
  private cargarEstrellasAgencia(): void {
    const u = this.auth.getCurrentUser();
    const agenciaId = this.agenciaFiltro || (u?.ambito === 'AGENCIA' ? (u?.agenciaId || u?.sucursalId) : null);
    if (!this.puedeVerAuditorias || !agenciaId) { this.estrellasAgencia = null; return; }
    this.carga.add(this.dashboardService.getEstrellasAgencia(String(agenciaId)).subscribe((e) => {
      this.estrellasAgencia = e && (e.inspeccion || e.cincoS) ? e : null;
    }));
  }

  textoEstrellas5s(e: any): string {
    return e ? `Última auditoría 5S (${e.fecha}): ${e.porcentaje} %` : 'Sin auditorías 5S';
  }

  textoEstrellasInspeccion(e: any): string {
    return e ? `Último informe de inspección (${e.fecha}): ${e.calificacion?.toLowerCase()}` : 'Sin informes de inspección';
  }
  get puedeVerInventario(): boolean { return this.auth.puede('inventario.ver'); }
  get puedeVerUsuarios(): boolean { return this.auth.puede('usuarios.ver'); }
  get puedeVerMapa(): boolean { return this.auth.puede('agencias.ver'); }
  get puedeVerProductividad(): boolean { return this.auth.puede('productividad.ver'); }

  get isPulidor(): boolean {
    const user = this.auth.getCurrentUser();
    const rol = user?.role || user?.rolNombre;
    return rol === 'PULIDOR' || rol === 'PULIDOR_FIJO' || rol === 'PULIDOR_MOVIL' || rol === 'OPERADOR_SERVICIOS_ESPECIALES';
  }

  get isCoordServiciosEspeciales(): boolean {
    const user = this.auth.getCurrentUser();
    const rol = user?.role || user?.rolNombre;
    return rol === 'COORD_SERVICIOS_ESPECIALES';
  }

  /** Proporción de herramientas y pulidoras operativas en la sede del pulidor. */
  get herramientasOperativasPulidor(): string {
    const operativas = this.tecnicoData?.equiposOperativos ?? this.maquinaria?.operativas ?? 0;
    const total = this.tecnicoData
      ? (this.tecnicoData.equiposOperativos + this.tecnicoData.mantenimientosPendientes + this.tecnicoData.maquinariaFueraServicio)
      : (this.maquinaria?.total || 0);
    return total > 0 ? `${operativas} / ${total}` : `${operativas}`;
  }

  /** Insumos o químicos de detailing bajo nivel mínimo en la sede. */
  get insumosCriticosPulidor(): number {
    return this.bodegaData?.kpis?.posicionesBajoMinimo ?? 0;
  }

  /** Alertas de nivel crítico entre las que llegaron del servidor. */
  get alertasCriticas(): number {
    return this.alertas.filter(a => a.tipo === 'critica').length;
  }

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.userName = user ? `${user.nombre} ${user.apellido}`.trim() : 'Usuario';
    this.rolLabel = ROLE_LABELS[user?.role as keyof typeof ROLE_LABELS] || user?.rolNombre || 'Colaborador';
    this.contextLabel = (user?.ambito === 'REGION' ? user?.region : (user?.sucursal || user?.sucursalNombre)) || 'Red EasyDry®';

    // Pre-establecer la pestaña correcta para el rol APROBADOR antes de cargar datos,
    // para que los charts se rendericen con dimensiones reales (no 0×0 en canvas oculto).
    if (this.auth.tieneFuncion(FUNCION.APROBADOR)) {
      this.activeExecutiveTab = 'aprobaciones';
      this.isAprobadorView = true;
    }

    if (this.vista === 'especiales' || this.auth.tieneFuncion(FUNCION.COORD_ESPECIALES) || this.auth.tieneFuncion(FUNCION.PULIDOR)) {
      this.categoriaServicio = 'ESPECIAL';
    }

    if (user?.ambito === 'REGION' && user?.regionId) {
      const regId = String(user.regionId);
      this.cargarClientes = this.opciones.clientes({ regionId: regId });
      this.cargarAgencias = this.opciones.agencias({ regionId: regId });
    }

    const agId = user?.agenciaId || user?.sucursalId;
    if (agId) {
      this.cargarBahias = this.opciones.bahias({ agenciaId: String(agId) });
    }

    if (this.auth.puede('catalogo.ver')) this.cargarServiciosOpciones();
    this.recargar();
  }

  /**
   * Dashboard ejecutivo: al entrar solo se piden los datos de la pestaña abierta (y la producción, que define qué pestañas ve el rol).
   * Los de las demás pestañas se piden la primera vez que se abren, y se vuelven a pedir cuando cambian los filtros. Cada pedido se
   * limita a los endpoints para los que el rol tiene permiso (evita errores 403 de fondo).
   */
  private cargarEjecutivo(): void {
    this.gruposCargados.clear();
    this.cargarGruposDeTab(this.activeExecutiveTab);
  }

  /** Cambia de pestaña y pide lo que le falta (si ya se cargó con los filtros actuales, no vuelve a pedir nada). */
  seleccionarTab(tab: TabEjecutivo): void {
    this.activeExecutiveTab = tab;
    this.cargarGruposDeTab(tab);
  }

  /** Qué datos pinta cada pestaña. La producción va siempre: de ella salen las banderas que deciden qué pestañas ve cada rol. */
  private gruposDeTab(tab: TabEjecutivo): GrupoEjecutivo[] {
    switch (tab) {
      case 'analitica': return ['produccion', 'resumen'];
      case 'auditoria': return ['produccion', 'servicios', 'maquinaria', 'alertas'];
      case 'operacion': return ['produccion', 'operadores', 'pulidores'];
      case 'aprobaciones': return ['produccion'];
      case 'inspecciones': return ['produccion', 'auditorias'];
      case 'taller': return ['produccion', 'tecnico'];
      case 'inventario': return ['produccion', 'bodega', 'alertas', 'distribuidor'];
    }
  }

  private cargarGruposDeTab(tab: TabEjecutivo): void {
    this.cargarGrupos(this.gruposDeTab(tab), () => {
      // La producción puede cambiar la pestaña (p. ej. el aprobador): se piden también los datos de la que quedó abierta.
      if (this.activeExecutiveTab !== tab) this.cargarGruposDeTab(this.activeExecutiveTab);
    });
  }

  /** Pide los grupos de datos que todavía no se cargaron con los filtros actuales; `alTerminar` corre cuando llegan. */
  private cargarGrupos(grupos: GrupoEjecutivo[], alTerminar?: () => void): void {
    const filtro = this.filtroActual;
    const pendientes = grupos.filter((g) => !this.gruposCargados.has(g));
    const peticiones: Observable<any>[] = [];
    const pedidos: GrupoEjecutivo[] = [];
    for (const grupo of pendientes) {
      const peticion = this.peticionDeGrupo(grupo, filtro);
      this.gruposCargados.add(grupo); // también los que el rol no puede ver: no se vuelven a evaluar
      if (!peticion) continue;
      peticiones.push(peticion);
      pedidos.push(grupo);
    }
    if (!peticiones.length) {
      this.recargando = false;
      return;
    }
    this.recargando = true;
    this.carga.add(forkJoin(peticiones).subscribe({
      next: () => {
        this.recargando = false;
        alTerminar?.();
      },
      error: () => {
        // Que se pueda reintentar al volver a abrir la pestaña.
        for (const g of pedidos) this.gruposCargados.delete(g);
        this.recargando = false;
      },
    }));
  }

  private peticionDeGrupo(grupo: GrupoEjecutivo, filtro: any): Observable<any> | null {
    switch (grupo) {
      case 'especiales':
        return this.dashboardService.getDashboardEspeciales(filtro).pipe(tap((d) => (this.especialesData = d)));
      case 'produccion':
        return this.dashboardService.getProduccion(filtro).pipe(tap((d) => {
          this.isAdminView = d?.isAdminView || false;
          this.isSupervisorView = d?.isSupervisorView || false;
          this.isComercialView = d?.isComercialView || false;
          this.isAprobadorView = d?.isAprobadorView || false;
          this.isSuperAdminView = d?.isSuperAdminView || false;
          this.isEjecutivoView = d?.isEjecutivoView || false;

          // Forzar vista de aprobaciones por defecto para el aprobador
          if (this.isAprobadorView && !this.isEjecutivoView) {
            this.activeExecutiveTab = 'aprobaciones';
          }

          this.produccion = this.normalizeProduccion(d);
          if (this.esAlcanceAgencia) {
            if (this.incidentesTab === 'agencia') {
              this.incidentesTab = 'bahia';
            }
          } else {
            if (this.incidentesTab === 'bahia') {
              this.incidentesTab = 'agencia';
            }
            if ((this.produccion?.topAgencias?.labels?.length ?? 0) <= 1 && (this.produccion?.topPulidores?.labels?.length ?? 0) > 0) {
              this.incidentesTab = 'pulidor';
            }
          }
        }));
      case 'resumen':
        return this.dashboardService.getResumenEjecutivo(filtro).pipe(tap((d) => (this.resumenEjecutivo = d)));
      case 'servicios':
        return this.dashboardService.getServiciosData(filtro).pipe(tap((d) => (this.serviciosData = d)));
      case 'operadores':
        if (!this.puedeVerUsuarios) return null;
        return forkJoin([
          this.dashboardService.getOperadores(filtro).pipe(tap((d) => (this.operadores = d))),
          this.dashboardService.getRankingLavadores(filtro).pipe(tap((d) => (this.rankingLavadores = d))),
        ]);
      case 'pulidores':
        if (!this.puedeVerProductividad) return null;
        return this.dashboardService.getRankingPulidores(filtro).pipe(tap((d) => (this.rankingPulidores = d)));
      case 'maquinaria':
        if (!this.puedeVerMaquinaria) return null;
        return this.dashboardService.getMaquinaria(filtro).pipe(tap((d) => (this.maquinaria = this.aChartMaquinaria(d))));
      case 'tecnico':
        // Costos, MTTR y deuda de mantenimiento para el tab de Activos & Taller.
        if (!this.puedeVerMaquinaria) return null;
        return this.dashboardService.getDashboardTecnico(filtro).pipe(tap((d) => {
          this.tecnicoData = d;
          if ((d?.mttrAgencia?.length ?? 0) <= 1 && (d?.mttrGravedad?.length ?? 0) > 0) {
            this.mttrTab = 'gravedad';
          }
        }));
      case 'bodega':
        // Salud de stock vs mínimo/ideal, déficit y alertas por categoría para el tab de Inventario / Catálogo Comercial.
        if (!(this.puedeVerAlertas || this.isComercialView || this.puedeVerInventario)) return null;
        return this.dashboardService.getDashboardBodegaDedicado(filtro).pipe(tap((d) => (this.bodegaData = d)));
      case 'alertas':
        if (!this.puedeVerAlertas) return null;
        return this.dashboardService.getAlertas(filtro).pipe(tap((d) => (this.alertas = d)));
      case 'distribuidor':
        if (!this.puedeVerAlertas) return null;
        return this.dashboardService.getDashboardDistribuidor(filtro, this.puedeVerAlertas).pipe(tap((d) => (this.distribuidorData = d)));
      case 'auditorias':
        if (!this.puedeVerAuditorias) return null;
        return this.dashboardService.getDashboardAuditorias(filtro).pipe(tap((d) => (this.auditoriasData = d)));
    }
  }

  private cargarTaller(): void {
    // El dashboard de mantenimiento ya no consume el panel de bodega: el rol no tiene capacidades de
    // inventario/despachos y esas tarjetas se retiraron de esta vista.
    const peticiones: Observable<any>[] = [
      this.dashboardService.getDashboardTecnico(this.filtroActual).pipe(tap((d) => {
        this.tecnicoData = d;
        if ((d?.mttrAgencia?.length ?? 0) <= 1 && (d?.mttrGravedad?.length ?? 0) > 0) {
          this.mttrTab = 'gravedad';
        }
      })),
    ];
    this.carga.add(forkJoin(peticiones).subscribe({
      next: () => (this.recargando = false),
      error: () => (this.recargando = false),
    }));
  }

  /** Servicios especiales: cada pestaña pide solo lo suyo (las de maquinaria e insumos, al abrirlas). */
  private cargarEspeciales(): void {
    this.gruposCargados.clear();
    this.cargarGrupos(this.gruposDeEspeciales(this.especialesTab));
  }

  seleccionarTabEspeciales(tab: typeof this.especialesTab): void {
    this.especialesTab = tab;
    this.cargarGrupos(this.gruposDeEspeciales(tab));
  }

  private gruposDeEspeciales(tab: typeof this.especialesTab): GrupoEjecutivo[] {
    switch (tab) {
      // Los KPIs de resumen muestran también las herramientas operativas (técnico) y los insumos bajo mínimo (bodega).
      case 'resumen': return ['especiales', 'tecnico', 'bodega'];
      case 'pulidores': return ['especiales'];
      case 'maquinaria': return ['especiales', 'tecnico', 'maquinaria'];
      case 'insumos': return ['especiales', 'bodega', 'distribuidor', 'alertas'];
    }
  }

  /** Bodega: el panel de bodega va siempre; alertas y consumo se piden con la pestaña que los muestra. */
  private cargarBodega(): void {
    this.gruposCargados.clear();
    this.cargarGrupos(this.gruposDeBodega(this.bodegaTab));
  }

  seleccionarTabBodega(tab: typeof this.bodegaTab): void {
    this.bodegaTab = tab;
    this.cargarGrupos(this.gruposDeBodega(tab));
  }

  private gruposDeBodega(tab: typeof this.bodegaTab): GrupoEjecutivo[] {
    switch (tab) {
      case 'salud': return ['bodega', 'alertas'];
      case 'reposicion': return ['bodega'];
      case 'despachos': return ['bodega', 'alertas'];
      case 'consumo': return ['bodega', 'alertas', 'distribuidor'];
    }
  }

  // ── Rankings del dashboard de mantenimiento (Top 5 / Top 10, asc o desc) ──
  // Cada gráfico se ordena sobre el ranking completo que envía el backend; los campos recortados del servicio
  // se quedan para el panel ejecutivo, que muestra su propio top fijo.

  /** Máquinas con más incidentes reportados. Ascendente = las más sanas del parque. */
  get maquinasProblematicasChart(): any {
    return ordenarSerieTop(this.tecnicoData?.maquinasProblematicasRank, this.maquinasTop);
  }

  /** Máquinas con más USD acumulado en reparaciones. */
  get maquinasCostosasChart(): any {
    return ordenarSerieTop(this.tecnicoData?.maquinasCostosasRank, this.costoMaquinasTop);
  }

  /**
   * MTTR por agencia. Ascendente = las agencias que resuelven más rápido.
   * Por gravedad son 4 valores fijos (no es un ranking), así que ese lado usa la serie tal cual.
   */
  get mttrChartOrdenado(): any {
    if (this.mttrTab === 'gravedad') return this.mttrChart;
    return ordenarSerieTop(this.tecnicoData?.mttrAgenciaRank, this.mttrTop);
  }

  /**
   * Costo por agencia (reparaciones + mantenimiento). Es un gráfico apilado, así que se ordena por el gasto
   * total: sin la clave explícita, el helper ordenaría solo por la primera serie y "menor a mayor" mostraría
   * las agencias con menos reparaciones aunque sean las que más gastan en mantenimiento.
   */
  get costoAgenciaChart(): any {
    const serie = this.tecnicoData?.costoAgenciaRank;
    const datasets: any[] = Array.isArray(serie?.datasets) ? serie.datasets : [];
    const clave = (serie?.labels ?? []).map((_: any, i: number) =>
      datasets.reduce((sum, ds) => sum + (Number(ds?.data?.[i]) || 0), 0),
    );
    return ordenarSerieTop(serie, { ...this.costoAgenciaTop, clave });
  }

  /** Costo total del parque en el período: reparaciones por fallas + mantenimiento. */
  get costoTotalParque(): number {
    return Number(((this.tecnicoData?.costoTotalReparaciones ?? 0) + (this.tecnicoData?.costoMantenimientos30d ?? 0)).toFixed(2));
  }

  /** Equipos distintos que registraron al menos una falla en el período. */
  get equiposConFallas(): number {
    return this.tecnicoData?.maquinasProblematicasRank?.labels?.length ?? 0;
  }

  // ── Rankings del dashboard de bodega (Top 5 / Top 10, asc o desc) ──
  // Igual que en mantenimiento: se ordena sobre la serie que envía el backend para el control, no sobre la
  // recortada que consume el panel ejecutivo.

  /** Días de cobertura del stock por insumo. Ascendente = los que se agotan primero. */
  get coberturaChart(): any {
    return ordenarSerieTop(this.bodegaData?.chartCoberturaRank, this.coberturaTop);
  }

  /** Unidades que faltan para llegar al nivel ideal, por insumo. */
  get deficitChart(): any {
    return ordenarSerieTop(this.bodegaData?.chartTopDeficitRank, this.deficitTop);
  }

  /**
   * Ubicaciones con stock bajo el ideal. Es un gráfico apilado (agotado · crítico · bajo mínimo · bajo ideal),
   * así que se ordena por el TOTAL de posiciones con problema y no por la primera serie apilada.
   */
  get ubicacionesChart(): any {
    const serie = this.bodegaData?.chartSaludPorUbicacionRank;
    const datasets: any[] = Array.isArray(serie?.datasets) ? serie.datasets : [];
    const clave = (serie?.labels ?? []).map((_: any, i: number) =>
      datasets.reduce((sum, ds) => sum + (Number(ds?.data?.[i]) || 0), 0),
    );
    return ordenarSerieTop(serie, { ...this.ubicacionesTop, clave });
  }

  /** Insumos con más unidades despachadas. */
  get consumoInsumosBodegaChart(): any {
    return ordenarSerieTop(this.bodegaData?.chartTopInsumosConsumoRank, this.consumoInsumosTop);
  }

  /** Agencias que más insumos recibieron. */
  get consumoAgenciasBodegaChart(): any {
    return ordenarSerieTop(this.bodegaData?.chartTopAgenciasConsumoRank, this.consumoAgenciasTop);
  }

  /** Posiciones de stock en un estado concreto de la clasificación de salud (AGOTADO, ÓPTIMO, SOBRESTOCK…). */
  private posicionesEnEstado(estado: string): number {
    const serie = this.bodegaData?.chartSaludStock;
    const labels: string[] = serie?.labels ?? [];
    const datos: number[] = serie?.datasets?.[0]?.data ?? [];
    return Number(datos[labels.indexOf(estado)]) || 0;
  }

  get posicionesOptimas(): number {
    return this.posicionesEnEstado('ÓPTIMO');
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
    if (d?.isAprobadorView && !d.metricasAprobaciones) {
      d.metricasAprobaciones = d;
    }
    return {
      ...d,
      metricasAprobaciones: d.metricasAprobaciones ?? null,
      totalVehiculos: d.vehiculosHoy ?? null,
      flujoHorario: d.flujoHorario ?? null,
      distribucionModelos: d.distribucionModelos ?? null,
      tiemposBahias: d.tiemposBahias ?? null,
      topBahias: d.topBahias ?? null,
      bottomBahias: d.bottomBahias ?? null,
      topMaquinas: d.topMaquinas ?? null,
      topAgencias: d.topAgencias ?? null,
      mixServiciosRaw: d.mixServiciosRaw ?? [],
      mixCategoriaRaw: d.mixCategoriaRaw ?? []
    };
  }
}

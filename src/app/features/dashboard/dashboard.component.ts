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
import { AprobacionesWidgetComponent } from './components/aprobaciones-widget.component';
import { RankingOperadoresWidgetComponent } from './components/ranking-operadores-widget.component';
import { SelectSearchComponent } from '../../shared/components/select-search/select-search.component';

import { RankingListComponent, RankingItem } from '../../shared/components/ranking-list/ranking-list.component';
import { PeriodSummaryComponent, PeriodMetric } from '../../shared/components/period-summary/period-summary.component';
import { DistributionCardComponent, DistributionItem } from '../../shared/components/distribution-card/distribution-card.component';
import { HeatmapGridComponent } from '../../shared/components/heatmap-grid/heatmap-grid.component';
import { HourlyPatternCardComponent } from '../../shared/components/hourly-pattern-card/hourly-pattern-card.component';
import { TopBottomComponent, TopBottomItem } from '../../shared/components/top-bottom/top-bottom.component';
import { OpcionesService } from '../../core/services/opciones.service';
import { CHART_COLORS, interpolarHex } from '../../shared/theme/colors';
import { DashboardChartData } from '../../core/models/dashboard.model';
import { AlertaStockVM } from '../../core/models/alerta-stock.model';
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
    RankingListComponent,
    PeriodSummaryComponent,
    DistributionCardComponent,
    HourlyPatternCardComponent,
    TopBottomComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardOperativoService);
  public auth = inject(AuthService);
  public opciones = inject(OpcionesService);

  produccion: any;
  operadores: any;
  rankingPulidores: {fijos: any[], moviles: any[]} | null = null;
  rankingLavadores: any[] | null = null;
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
  pulidorFiltro: string | null = null;
  regionLabel = '';
  agenciaLabel = '';
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
  cargarAgencias = this.opciones.agencias();
  cargarPulidores = this.opciones.operadores({ rol: 'PULIDOR' });

  /** Suscripciones de la carga en curso: se cancelan al recargar para descartar respuestas obsoletas. */
  private carga = new Subscription();

  rolLabel = '';
  contextLabel = '';
  userName = '';
  isAdminView = false;
  isSupervisorView = false;
  isComercialView = false;
  isAprobadorView = false;
  isSuperAdminView = false;

  bodegaData: any = null;
  especialesData: any = null;
  /** Pestaña del ranking de pulidores (fijos vs móviles). */
  pulidoresTab: 'fijos' | 'moviles' = 'fijos';

  /** Pestaña del gráfico unificado de vehículos (marca · modelo · color). */
  vehiculosTab: 'marcas' | 'modelos' | 'colores' = 'marcas';
  /** Pestaña del gráfico de agencias (productivas / ganancia neta / gasto en reparaciones). */
  agenciasTab: 'productivas' | 'ganancia' | 'reparaciones' = 'productivas';
  /** Pestaña para gráfico de incidentes (por agencia vs por pulidor) */
  incidentesTab: 'agencia' | 'pulidor' = 'agencia';
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

  readonly categoriasServicio: { id: 'TODOS' | 'GENERAL' | 'ESPECIAL'; label: string }[] = [
    { id: 'TODOS', label: 'Todos los servicios' },
    { id: 'GENERAL', label: 'Servicios generales' },
    { id: 'ESPECIAL', label: 'Servicios especiales' },
  ];

  activeExecutiveTab: 'analitica' | 'auditoria' | 'inventario' | 'operacion' | 'alertas' | 'taller' | 'aprobaciones' = 'analitica';

  /** Alertas del panel: en la vista ejecutiva, las unificadas (stock + mantenimiento); si no, las de stock. */
  get alertasPanel(): AlertaStockVM[] {
    const ops = this.produccion?.alertasOperativas;
    return ops && ops.length ? ops : this.alertas;
  }

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
        { label: 'Lavados', valor: String(k.serviciosHoy ?? 0), color: 'azul' },
        { label: 'Lavados del período', valor: String(k.servicios30Dias ?? 0), color: 'verde' },
        { label: 'Químicos consumidos', valor: `${k.unidadesQuimicos ?? 0} u.`, color: 'slate' },
      ];
    }
    return [
      { label: 'Lavados', valor: String(k.totalLavadosHoy ?? 0), color: 'verde' },
      { label: 'Finalizados', valor: String(k.lavadosFinalizados ?? 0), color: 'azul' },
      { label: 'Incidentes abiertos', valor: String(k.incidentesAbiertos ?? 0), color: 'rojo' },
    ];
  }

  get generalesItems(): DistributionItem[] {
    return (this.produccion?.generales ?? []).map((x: any) => ({ nombre: x.nombre, valor: Number(x.cantidad) || 0 }));
  }

  get especialesItems(): DistributionItem[] {
    return (this.produccion?.especiales ?? []).map((x: any) => ({ nombre: x.nombre, valor: Number(x.cantidad) || 0 }));
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
    return !this.isSuperAdminView;
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
    const fuente = (this.activeDimension === 'AGENCY' || this.activeDimension === 'POLISHER')
      ? (this.produccion?.jerarquia?.desglose ?? [])
      : (this.produccion?.tiemposAgencias ?? []);
    return fuente
      .map((x: any) => ({ nombre: x.nombre, minutos: Number(x.tiempoPromedioMin) || 0, cantidad: Number(x.cantidad) || 0 }))
      .filter((x: { minutos: number }) => x.minutos > 0)
      .sort((a: { minutos: number }, b: { minutos: number }) => b.minutos - a.minutos)
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
    switch (this.activeDimension) {
      case 'AGENCY': return 'Cuellos de Botella por Bahía';
      case 'POLISHER': return 'Días Más Lentos del Pulidor';
      case 'REGION': return 'Agencias Más Lentas de la Región';
      default: return 'Agencias Más Lentas del País';
    }
  }

  get eficienciaSubtitulo(): string {
    const n = this.eficienciaItems.length;
    return n ? `Tiempo promedio de servicio (min) · ${n} más lentas del período` : '';
  }

  /** Entidades del nivel activo con menos servicios (detecta agencias o bahías sin operación). */
  get bajaActividadItems(): RankingItem[] {
    return (this.produccion?.bajaActividad?.items ?? []).map((x: any) => ({
      nombre: x.nombre,
      valor: Number(x.cantidad) || 0,
      secundario: Number(x.cantidad) ? `${Number(x.tiempoPromedioMin) || 0} min promedio` : '',
    }));
  }

  get bajaActividadTitulo(): string {
    switch (this.produccion?.bajaActividad?.entidad) {
      case 'Bahía': return 'Bahías con Menos Actividad';
      case 'Día': return 'Días con Menos Actividad';
      case 'Pulidor': return 'Pulidores con Menos Actividad';
      case 'Región': return 'Regiones con Menos Actividad';
      default: return 'Agencias con Menos Actividad';
    }
  }

  get bajaActividadSubtitulo(): string {
    switch (this.produccion?.bajaActividad?.entidad) {
      case 'Bahía': return 'Estaciones con menor volumen de servicios';
      case 'Pulidor': return 'Pulidores con menor volumen de servicios';
      case 'Región': return 'Regiones con menor volumen de servicios';
      default: return 'Sucursales con menor volumen de servicios';
    }
  }

  /** Serie de tiempo de resolución según la pestaña (por agencia o por gravedad). */
  get mttrChart(): any {
    if (this.mttrTab === 'gravedad') {
      return this.tecnicoData?.chartMttrGravedad ?? this.tecnicoData?.chartMttrAgencia ?? null;
    }
    return this.tecnicoData?.chartMttrAgencia ?? this.tecnicoData?.chartMttrGravedad ?? null;
  }

  /** Explica en qué se basa el promedio y sobre cuántos incidentes resueltos se calculó. */
  get mttrSubtitulo(): string {
    const items: any[] = (this.mttrTab === 'gravedad' ? this.tecnicoData?.mttrGravedad : this.tecnicoData?.mttrAgencia) ?? [];
    const resueltos = items.reduce((sum, x) => sum + (Number(x.incidentes) || 0), 0);
    if (!resueltos) return 'Sin incidentes resueltos en el período';
    const base = this.mttrTab === 'gravedad'
      ? 'Horas promedio hasta resolver, por gravedad'
      : 'Horas promedio hasta resolver, por agencia (de más lenta a más rápida)';
    return `${base} · ${resueltos} incidente${resueltos === 1 ? '' : 's'} resuelto${resueltos === 1 ? '' : 's'}`;
  }

  /** ¿Hay datos para el gráfico unificado de agencias? */
  get tieneAgenciasChart(): boolean {
    return !!(this.produccion?.topAgenciasProductivas || this.produccion?.gananciaNetaAgencias || this.produccion?.topAgenciasReparaciones);
  }

  /** Datos del gráfico de agencias; si la serie elegida no existe, cae a otra disponible. */
  get chartAgenciasActivo(): any {
    const productivas = this.produccion?.topAgenciasProductivas;
    const ganancia = this.produccion?.gananciaNetaAgencias;
    const reparaciones = this.produccion?.topAgenciasReparaciones;
    if (this.agenciasTab === 'ganancia') return ganancia ?? reparaciones ?? productivas;
    if (this.agenciasTab === 'reparaciones') return reparaciones ?? ganancia ?? productivas;
    return productivas ?? ganancia ?? reparaciones;
  }

  get agenciasSubtitulo(): string {
    switch (this.agenciasTab) {
      case 'ganancia': return 'Ingresos − gastos operativos del período';
      case 'reparaciones': return 'USD acumulado en incidentes técnicos del período';
      default: return 'Servicios del período por agencia';
    }
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
    return this.pulidoresTab === 'fijos' ? (this.especialesData.pulidoresFijos || []) : (this.especialesData.pulidoresMoviles || []);
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
        if (this.esAnaliticaGlobal) return 'Comparativa nacional por agencia';
        return 'Vehículos procesados en el día';
    }
  }

  /** Subtítulo del drill-down: declara la base del cálculo y sigue siendo correcto sin datos. */
  get subtituloJerarquia(): string {
    const j = this.produccion?.jerarquia;
    if (!j) return 'Sin servicios en el nivel y los filtros seleccionados';
    const k = j.kpis ?? {};
    return `Desglose por ${j.entidad} · ${k.registros ?? 0} servicios · ${k.tiempoPromedioMin ?? 0} min promedio`;
  }

  /** Administrador o Super Admin: paneles nacionales con drill-down (mismo tratamiento visual). */
  get esAnaliticaGlobal(): boolean {
    return this.isAdminView || this.isSuperAdminView;
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
    return 'Lavados por Bahía';
  }

  get chart4Subtitle(): string {
    if (this.isAdminView) return 'Acciones realizadas';
    if (this.isAprobadorView) return 'Distribución por tipo de requerimiento';
    return 'Productividad en cantidad';
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
      pulidorId: this.pulidorFiltro || undefined,
      // Modificador continuo: se combina con la dimensión y las fechas.
      categoriaServicio: this.categoriaServicio === 'TODOS' ? undefined : this.categoriaServicio,
      // Desglose del gráfico: solo tiene sentido a nivel país (con una dimensión activa el drill-down ya manda).
      desglose: this.activeDimension === 'GLOBAL' ? this.desgloseTab : undefined,
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
    return !!this.regionFiltro || !!this.agenciaFiltro || !!this.pulidorFiltro || this.rangoFiltro !== 'HOY' || this.categoriaServicio !== 'TODOS';
  }

  // ── Filtros exclusivos: se habilita GLOBAL y la propia dimensión activa ──
  get regionHabilitada(): boolean { return this.activeDimension === 'GLOBAL' || this.activeDimension === 'REGION'; }
  get agenciaHabilitada(): boolean { return this.activeDimension === 'GLOBAL' || this.activeDimension === 'AGENCY'; }
  get pulidorHabilitado(): boolean { return this.activeDimension === 'GLOBAL' || this.activeDimension === 'POLISHER'; }
  /** true mientras hay una dimensión estructural distinta a GLOBAL (para el botón de reset). */
  get hayDimensionEstructural(): boolean { return this.activeDimension !== 'GLOBAL'; }

  /** Etiqueta del nivel de análisis actual (encabezado del panel). */
  get nivelAnalisisLabel(): string {
    switch (this.activeDimension) {
      case 'REGION': return `Región · ${this.regionLabel || 'seleccionada'}`;
      case 'AGENCY': return `Agencia · ${this.agenciaLabel || 'seleccionada'}`;
      case 'POLISHER': return `Pulidor · ${this.pulidorLabel || 'seleccionado'}`;
      default: return 'Global · País';
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
    this.recargar();
  }

  /** Cambia el nivel de desglose del gráfico de rendimiento (solo se usa con el filtro en GLOBAL). */
  cambiarDesglose(valor: 'REGION' | 'AGENCY' | 'POLISHER'): void {
    if (this.desgloseTab === valor) return;
    this.desgloseTab = valor;
    this.recargar();
  }

  onRegionChange(regionId: string | null): void {    this.regionFiltro = regionId;
    if (!regionId) this.regionLabel = '';
    this.limpiarAgenciaYPulidor();
    this.activeDimension = regionId ? 'REGION' : 'GLOBAL';
    this.cargarAgencias = this.opciones.agencias();
    this.recargar();
  }

  onAgenciaChange(agenciaId: string | null): void {
    this.agenciaFiltro = agenciaId;
    if (!agenciaId) this.agenciaLabel = '';
    this.regionFiltro = null;
    this.regionLabel = '';
    this.pulidorFiltro = null;
    this.pulidorLabel = '';
    this.activeDimension = agenciaId ? 'AGENCY' : 'GLOBAL';
    this.recargar();
  }

  onPulidorChange(pulidorId: string | null): void {
    this.pulidorFiltro = pulidorId;
    if (!pulidorId) this.pulidorLabel = '';
    this.regionFiltro = null;
    this.regionLabel = '';
    this.agenciaFiltro = null;
    this.agenciaLabel = '';
    this.activeDimension = pulidorId ? 'POLISHER' : 'GLOBAL';
    this.recargar();
  }

  private limpiarAgenciaYPulidor(): void {
    this.agenciaFiltro = null;
    this.agenciaLabel = '';
    this.pulidorFiltro = null;
    this.pulidorLabel = '';
  }

  /** Reset estructural: vuelve a GLOBAL y mantiene el rango de fechas seleccionado. */
  limpiarDimensiones(): void {
    this.regionFiltro = null;
    this.agenciaFiltro = null;
    this.pulidorFiltro = null;
    this.regionLabel = '';
    this.agenciaLabel = '';
    this.pulidorLabel = '';
    this.activeDimension = 'GLOBAL';
    this.cargarAgencias = this.opciones.agencias();
    this.recargar();
  }

  limpiarFiltros(): void {
    this.regionFiltro = null;
    this.agenciaFiltro = null;
    this.pulidorFiltro = null;
    this.regionLabel = '';
    this.agenciaLabel = '';
    this.pulidorLabel = '';
    this.categoriaServicio = 'TODOS';
    this.desgloseTab = 'REGION';
    this.activeDimension = 'GLOBAL';
    this.rangoFiltro = 'HOY';
    this.fechaDesdeFiltro = '';
    this.fechaHastaFiltro = '';
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

  get puedeVerAlertas(): boolean { return this.auth.puede('alertas.ver'); }
  get puedeVerMaquinaria(): boolean { return this.auth.puede('maquinaria.ver'); }
  get puedeVerUsuarios(): boolean { return this.auth.puede('usuarios.ver'); }
  get puedeVerMapa(): boolean { return this.auth.puede('agencias.ver'); }
  get puedeVerProductividad(): boolean { return this.auth.puede('productividad.ver'); }

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
        this.isSuperAdminView = d?.isSuperAdminView || false;
        this.produccion = this.normalizeProduccion(d);
      })),
      this.dashboardService.getServiciosData(filtro).pipe(tap((d) => (this.serviciosData = d))),
      this.dashboardService.getResumenEjecutivo(filtro).pipe(tap((d) => (this.resumenEjecutivo = d))),
    ];
    if (this.puedeVerUsuarios) {
      peticiones.push(this.dashboardService.getOperadores(filtro).pipe(tap((d) => (this.operadores = d))));
      peticiones.push(this.dashboardService.getRankingLavadores(filtro).pipe(tap((d) => (this.rankingLavadores = d))));
    }
    if (this.puedeVerProductividad) {
      peticiones.push(this.dashboardService.getRankingPulidores(filtro).pipe(tap((d) => (this.rankingPulidores = d))));
    }
    if (this.puedeVerMaquinaria) {
      peticiones.push(this.dashboardService.getMaquinaria(filtro).pipe(tap((d) => (this.maquinaria = this.aChartMaquinaria(d)))));
      // Costos, MTTR y deuda de mantenimiento para el tab de Activos & Taller.
      peticiones.push(this.dashboardService.getDashboardTecnico(filtro).pipe(tap((d) => (this.tecnicoData = d))));
    }
    if (this.puedeVerAlertas) {
      // Salud de stock vs mínimo/ideal, déficit y alertas por categoría para el tab de Inventario.
      peticiones.push(this.dashboardService.getDashboardBodegaDedicado(filtro).pipe(tap((d) => (this.bodegaData = d))));
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
    const peticiones: Observable<any>[] = [
      this.dashboardService.getDashboardTecnico(this.filtroActual).pipe(tap((d) => (this.tecnicoData = d))),
      this.dashboardService.getDashboardBodegaDedicado(this.filtroActual).pipe(tap((d) => (this.bodegaData = d))),
    ];
    this.carga.add(forkJoin(peticiones).subscribe({
      next: () => (this.recargando = false),
      error: () => (this.recargando = false),
    }));
  }

  private cargarEspeciales(): void {
    this.carga.add(this.dashboardService.getDashboardEspeciales(this.filtroActual).subscribe({
      next: (d) => { this.especialesData = d; this.recargando = false; },
      error: () => (this.recargando = false),
    }));
  }

  private cargarBodega(): void {
    const peticiones: Observable<any>[] = [
      this.dashboardService.getDashboardBodegaDedicado(this.filtroActual).pipe(tap((d) => (this.bodegaData = d))),
      this.dashboardService.getDashboardDistribuidor(this.filtroActual).pipe(tap((d) => (this.distribuidorData = d))),
    ];
    if (this.puedeVerAlertas) {
      peticiones.push(this.dashboardService.getAlertas(this.filtroActual).pipe(tap((d) => (this.alertas = d))));
    }
    this.carga.add(forkJoin(peticiones).subscribe({
      next: () => (this.recargando = false),
      error: () => (this.recargando = false),
    }));
  }

  get tallerBodegaColumns(): number {
    let count = 0;
    if (this.bodegaData?.chartTopInsumosCriticos) count++;
    if (this.bodegaData?.chartTopInsumosConsumo) count++;
    if (this.bodegaData?.chartDespachosEstado) count++;
    return count || 1;
  }

  get bodegaMainColumns(): number {
    let count = 0;
    if (this.bodegaData?.chartNivelAlertas) count++;
    if (this.bodegaData?.chartDespachosEstado) count++;
    if (this.bodegaData?.chartTopInsumosCriticos) count++;
    if (this.bodegaData?.chartTopAgenciasConAlertas) count++;
    if (this.bodegaData?.chartTopInsumosConsumo) count++;
    if (this.bodegaData?.chartConsumoPorCategoria) count++;
    if (this.bodegaData?.chartTopAgenciasConsumo) count++;
    if (this.bodegaData?.chartUnidadesStockPorCategoria) count++;
    
    if (count === 1) return 1;
    if (count === 2 || count === 4) return 2;
    if (count === 3) return 3; 
    return 2; 
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

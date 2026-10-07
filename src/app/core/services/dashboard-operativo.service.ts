import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { apiUrl } from '../config/env';
import {
  DashboardTecnicoData,
  DashboardDistribuidorData,
  ResumenEjecutivoData
} from '../models/dashboard.model';
import { CHART_COLORS, CHART_SERIES, coloresCategoricos, interpolarHex } from '../../shared/theme/colors';
import { ToastService } from '../../shared/services/toast.service';
import { AlertaStockVM } from '../models/alerta-stock.model';

/**
 * Todo lo que se muestra sale de lo que devuelve el servidor. Cuando el servidor no entrega un dato, el servicio
 * devuelve null o una lista vacía y la pantalla muestra "sin datos"; nunca se rellena con valores inventados.
 * Cuando la falta de datos se debe a un error real del backend (no a que no haya registros), se avisa con un toast.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardOperativoService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  private avisarErrorCarga(mensaje: string, err: any): void {
    console.error(mensaje, err);
    this.toastService.error('No se pudo cargar', `${mensaje}. Reintentar.`);
  }

  /**
   * Producción del día (POST /analytics/dashboard).
   */
  getProduccion(filtro: any = {}): Observable<any> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), filtro).pipe(
      map(data => {
        const isAdmin = data?.isAdminView || false;
        const isSupervisor = data?.isSupervisorView || false;
        const isComercial = data?.isComercialView || false;
        const isAprobador = data?.isAprobadorView || false;

        const truncateLabel = (text: string) => text; // Disabled truncation so tooltips show full text

        const toBarChart = (arr: any[], labelField: string, valueField: string, label: string) =>
          arr && arr.length > 0 ? { labels: arr.map((x: any) => truncateLabel(x[labelField])), datasets: [{ label, data: arr.map((x: any) => x[valueField] ?? 0), backgroundColor: coloresCategoricos(arr.length) }] } : null;

        const toDonutChart = (arr: any[], labelField: string, valueField: string) =>
          arr && arr.length > 0 ? { labels: arr.map((x: any) => truncateLabel(x[labelField])), datasets: [{ data: arr.map((x: any) => x[valueField] ?? 0), backgroundColor: coloresCategoricos(arr.length) }] } : null;

        const flujoLabel = isAdmin ? 'Usuarios creados' : (isAprobador ? 'Solicitudes' : (isComercial ? 'Lavados diarios' : 'Vehículos'));
        const flujoHorario = data?.flujoHorario && data.flujoHorario.length > 0 ? {
          labels: data.flujoHorario.map((f: any) => f.hora),
          datasets: [{ 
            label: flujoLabel, 
            data: data.flujoHorario.map((f: any) => f.cantidad), 
            backgroundColor: CHART_COLORS.blue,
            borderRadius: 6,
          }]
        } : null;

        let mixServicios: any = null;
        if (isAdmin) {
          mixServicios = toDonutChart(data?.distribucionRoles, 'nombre', 'cantidad');
        } else if (isAprobador) {
          mixServicios = toDonutChart(data?.distribucionEstados, 'nombre', 'cantidad');
        } else if (isComercial) {
          mixServicios = toDonutChart(data?.mixServicios, 'nombre', 'cantidad');
        } else {
          // Líder Operador, Supervisor y roles operativos: Estado de las Órdenes de Lavado de hoy
          const e = data?.distribucionEstados;
          if (e && typeof e === 'object' && !Array.isArray(e)) {
            const enEspera = Number(e.EN_ESPERA ?? 0);
            const enProceso = Number(e.EN_PROCESO ?? 0);
            const finalizados = Number(e.FINALIZADO ?? 0);
            const cancelados = Number(e.CANCELADO ?? 0);
            mixServicios = {
              labels: ['En espera', 'En proceso', 'Finalizados', 'Cancelados'],
              datasets: [{
                data: [enEspera, enProceso, finalizados, cancelados],
                backgroundColor: [CHART_COLORS.amber, CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.rose]
              }]
            };
          } else if (Array.isArray(e) && e.length > 0) {
            mixServicios = toDonutChart(e, 'nombre', 'cantidad');
          } else if (data?.mixServicios && data.mixServicios.length > 0) {
            mixServicios = toDonutChart(data.mixServicios, 'nombre', 'cantidad');
          }
        }

        const barSrc = isAdmin ? data?.distribucionDecisiones : (isAprobador ? data?.distribucionTipos : (isComercial ? data?.solicitudesComerciales : data?.distribucionBahias));
        const barLabel = isAdmin ? 'Veces' : (isAprobador ? 'Solicitudes' : (isComercial ? 'Cantidad' : 'Lavados'));
        const barValueField = isComercial || isAprobador ? 'cantidad' : 'total';
        const distribucionModelos = toBarChart(barSrc, 'nombre', barValueField, barLabel);

        const tiemposSrc = isAdmin ? data?.distribucionCategorias : (isComercial ? null : data?.tiemposBahias);
        const tiemposBahias = tiemposSrc && tiemposSrc.length > 0 ? {
          labels: tiemposSrc.map((b: any) => truncateLabel(b.nombre)),
          datasets: [{ label: isAdmin ? 'Servicios' : 'Minutos', data: tiemposSrc.map((b: any) => b.promedio ?? b.total), backgroundColor: coloresCategoricos(tiemposSrc.length) }]
        } : null;

        const donaSecSrc = isAdmin ? data?.distribucionCategorias : (isAprobador ? data?.distribucionTipos : (isComercial ? data?.solicitudesComerciales : data?.incidentesPorTipo));
        const incidentesPorTipo = toDonutChart(donaSecSrc, 'nombre', isAdmin ? 'total' : 'cantidad');

        const bData = data?.bahias || data?.distribucionBahias || data?.tiemposAgencias;
        const chartBahias = bData && bData.length > 0 ? {
          labels: bData.map((b: any) => truncateLabel(b.nombre)),
          datasets: [
            { label: 'Servicios', data: bData.map((b: any) => b.cantidad ?? b.total ?? 0), backgroundColor: coloresCategoricos(bData.length) },
            { label: 'Tiempo prom. (min)', data: bData.map((b: any) => b.tiempoPromedioMin ?? 0), backgroundColor: CHART_COLORS.amber },
          ],
        } : null;

        return {
          isAdminView: isAdmin, isSupervisorView: isSupervisor, isComercialView: isComercial, isAprobadorView: isAprobador, isSuperAdminView: data?.isSuperAdminView ?? false,
          vehiculosHoy: data?.kpis?.totalLavadosHoy ?? data?.kpis?.serviciosHoy ?? data?.kpis?.totalHoy ?? null,
          flujoHorario,
          distribucionModelos,
          tiemposBahias,
          mixServicios,
          incidentesPorTipo,
          topMarcas: toBarChart(data?.topMarcas, 'nombre', 'cantidad', 'Frecuencia'),
          topAgenciasProductivas: toBarChart(data?.topAgenciasProductivas, 'nombre', 'cantidad', 'Servicios'),
          // Mix separado: generales vs especiales (top 5 cada uno).
          mixGenerales: toDonutChart(data?.mixGenerales, 'nombre', 'cantidad'),
          mixEspeciales: toDonutChart(data?.mixEspeciales, 'nombre', 'cantidad'),
          // Atributos del vehículo.
          topColores: toBarChart(data?.topColores, 'nombre', 'cantidad', 'Frecuencia'),
          topMarcasModelos: toBarChart(data?.topMarcasModelos, 'nombre', 'cantidad', 'Frecuencia'),
          // Tiempos por agencia o bahías
          chartBahias,
          // Agencias: Rentabilidad y reparaciones
          topAgenciasRentabilidad: data?.topAgenciasRentabilidad ? {
            labels: data.topAgenciasRentabilidad.map((x: any) => truncateLabel(x.nombre)),
            datasets: [
              { label: 'Ingresos', stack: 'ingresos', data: data.topAgenciasRentabilidad.map((x: any) => x.ingresos), backgroundColor: CHART_COLORS.green },
              { label: 'Insumos', stack: 'gastos', data: data.topAgenciasRentabilidad.map((x: any) => x.costoInsumos ?? 0), backgroundColor: CHART_COLORS.amber },
              { label: 'Reparaciones (fallas)', stack: 'gastos', data: data.topAgenciasRentabilidad.map((x: any) => x.costoIncidentes ?? 0), backgroundColor: CHART_COLORS.rose },
              { label: 'Mantenimiento', stack: 'gastos', data: data.topAgenciasRentabilidad.map((x: any) => x.costoMantenimientos ?? 0), backgroundColor: CHART_COLORS.blue }
            ]
          } : null,
          gananciaNetaAgencias: data?.topAgenciasRentabilidad?.length ? {
            labels: data.topAgenciasRentabilidad.map((x: any) => x.nombre),
            datasets: [{ label: 'Ganancia neta USD', data: data.topAgenciasRentabilidad.map((x: any) => x.gananciaNeta), backgroundColor: data.topAgenciasRentabilidad.map((x: any) => x.gananciaNeta >= 0 ? CHART_COLORS.green : CHART_COLORS.rose) }]
          } : null,
          topAgenciasReparaciones: toBarChart(data?.topAgenciasReparaciones, 'nombre', 'costo', 'Costo USD'),
          agenciasRentabilidad: data?.topAgenciasRentabilidad ?? [],
          agenciasReparaciones: data?.topAgenciasReparaciones ?? [],
          // Datos crudos para las tarjetas de distribución (dona + filas).
          generales: data?.mixGenerales ?? [],
          especiales: data?.mixEspeciales ?? [],
          colores: data?.topColores ?? [],
          marcasModelos: data?.topMarcasModelos ?? [],
          kpisResumen: data?.kpis ?? {},
          // Alertas operativas unificadas (stock + mantenimiento) ya acotadas por el servidor al alcance del rol.
          alertasOperativas: (data?.alertasOperativas ?? []).map((a: any) => this.aAlertaOperativaVM(a)),
          // Drill-down jerárquico (País → Región → Agencia → Bahía) según la dimensión activa.
          jerarquia: data?.jerarquia ?? null,
          // Heatmap día × hora y Top/Bottom adaptativo (vienen dentro de jerarquia).
          heatmap: data?.jerarquia?.heatmap ?? null,
          rankingTop: data?.jerarquia?.ranking?.top ?? [],
          rankingBottom: data?.jerarquia?.ranking?.bottom ?? [],
          rankingEntidad: data?.jerarquia?.ranking?.entidad ?? 'Entidad',
          // Entidades del nivel activo con menos operación (incluye agencias/bahías sin servicios en el periodo).
          bajaActividad: data?.jerarquia?.bajaActividad ?? null,
          // Tiempo promedio por agencia (cuellos de botella); ya viene acotado al alcance y a los filtros.
          tiemposAgencias: data?.tiemposAgencias ?? [],
          jerarquiaChart: data?.jerarquia?.desglose?.length ? {
            labels: data.jerarquia.desglose.map((d: any) => d.nombre),
            datasets: [
              { label: 'Servicios', data: data.jerarquia.desglose.map((d: any) => d.cantidad ?? 0), backgroundColor: CHART_COLORS.blue },
              { label: 'Tiempo prom. (min)', data: data.jerarquia.desglose.map((d: any) => d.tiempoPromedioMin ?? 0), backgroundColor: CHART_COLORS.amber },
            ],
          } : null,
          topMaquinas: data?.topMaquinasDañadas && data.topMaquinasDañadas.length > 0 ? { labels: data.topMaquinasDañadas.map((m: any) => m.nombre.split('-')[0].trim()), datasets: [{ label: 'Incidentes', data: data.topMaquinasDañadas.map((m: any) => m.total), backgroundColor: coloresCategoricos(data.topMaquinasDañadas.length).reverse() }] } : null,
          topAgencias: toBarChart(data?.topAgenciasIncidentes, 'nombre', 'total', 'Incidentes'),
          agenciasIncidentesRaw: data?.topAgenciasIncidentes,
          chartAprobaciones: data?.chartAprobaciones || null,
          metricasAprobaciones: data?.metricasAprobaciones ? {
            kpis: data.metricasAprobaciones.kpis,
            tiposCount: toDonutChart(data.metricasAprobaciones.distribucionTipos, 'nombre', 'cantidad'),
            flujoSolicitudes: data.metricasAprobaciones.flujoEstadosPorDia ? {
              labels: Object.keys(data.metricasAprobaciones.flujoEstadosPorDia).sort(),
              datasets: [
                { label: 'Aprobado', data: Object.keys(data.metricasAprobaciones.flujoEstadosPorDia).sort().map(k => data.metricasAprobaciones.flujoEstadosPorDia[k].APROBADO), backgroundColor: '#10B981' },
                { label: 'Rechazado', data: Object.keys(data.metricasAprobaciones.flujoEstadosPorDia).sort().map(k => data.metricasAprobaciones.flujoEstadosPorDia[k].RECHAZADO), backgroundColor: '#EF4444' },
                { label: 'Pendiente', data: Object.keys(data.metricasAprobaciones.flujoEstadosPorDia).sort().map(k => data.metricasAprobaciones.flujoEstadosPorDia[k].PENDIENTE), backgroundColor: '#F59E0B' }
              ]
            } : null,
            topAgencias: toBarChart(data.metricasAprobaciones.topAgencias, 'nombre', 'cantidad', 'Solicitudes'),
            topSolicitantes: toBarChart(data.metricasAprobaciones.topSolicitantes, 'nombre', 'cantidad', 'Solicitudes')
          } : null
        };
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar la produccion del dia', err);
        return of({ vehiculosHoy: null, flujoHorario: null, distribucionModelos: null, tiemposBahias: null, topMaquinas: null, topAgencias: null, mixServicios: null, topMarcas: null, incidentesPorTipo: null });
      })
    );
  }

    /**
   * Ranking de operadores por servicios atendidos (POST /agencias/operadores/list).
   */
  getOperadores(filtro: any = {}): Observable<any> {
    return this.http.post<any[]>(apiUrl('/agencias/operadores/list'), filtro).pipe(
      map(list => {
        const raw = Array.isArray(list) ? list : [];
        const activos = raw.filter(o => o.estado === 'Activo' || o.estado === 1).length;
        const total = raw.length;
        const ranking = raw
          .map(op => ({
            nombre: op.nombre || `${op.name || ''} ${op.lastname || ''}`.trim(),
            bahia: op.bahia || op.sucursal || '',
            vehiculos: Number(op.vehiculosAtendidos ?? op.serviciosRealizados ?? 0)
          }))
          .filter(op => op.nombre)
          .sort((a, b) => b.vehiculos - a.vehiculos)
          .slice(0, 5)
          .map((op, i) => ({ posicion: i + 1, ...op }));

        return { activos, total, ausentes: Math.max(0, total - activos), disponibles: activos, ranking };
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el ranking de operadores', err);
        return of({ activos: 0, total: 0, ausentes: 0, disponibles: 0, ranking: [] });
      })
    );
  }

  /**
   * Ranking de lavadores por cantidad de servicios y tiempo promedio (POST /analytics/ranking-lavadores).
   */
  getRankingLavadores(filtro: { agenciaId?: string; regionId?: string; fechaDesde?: string; fechaHasta?: string } = {}): Observable<any[]> {
    return this.http.post<any>(apiUrl('/analytics/ranking-lavadores'), filtro).pipe(
      map(res => {
        if (!res?.ranking || !Array.isArray(res.ranking)) return [];
        return res.ranking.map((r: any, index: number) => ({
          posicion: index + 1,
          nombre: r.nombre,
          bahia: (r.agencia && r.bahia) ? `${r.agencia} · ${r.bahia}` : `${r.cantidadServicios} servicios`, // Subtítulo en el widget
          vehiculos: r.cantidadServicios,
          tiempoPromedioMin: r.tiempoPromedioMin
        }));
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el ranking de lavadores', err);
        return of([]);
      })
    );
  }

  getRankingPulidores(filtro: any = {}): Observable<{fijos: any[], moviles: any[]}> {
    return this.http.post<any>(apiUrl('/analytics/ranking-pulidores'), filtro).pipe(
      map(res => {
        const mapOp = (op: any, index: number) => ({
          posicion: index + 1,
          nombre: op.nombre,
          bahia: op.ubicacion || (op.esFijo ? 'Agencia / Bahia' : 'Móvil'),
          vehiculos: op.cantidadServicios,
          dinero: op.dineroTotal
        });
        return {
          fijos: (res?.rankingFijos || []).map(mapOp),
          moviles: (res?.rankingMoviles || []).map(mapOp)
        };
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el ranking de pulidores', err);
        return of({ fijos: [], moviles: [] });
      })
    );
  }

  /**
   * Servicios de hoy por estado (POST /analytics/dashboard -> distribucionEstados).
   */
  getServiciosData(filtro: any = {}): Observable<any> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), filtro).pipe(
      map(data => {
        const e = data?.distribucionEstados;
        if (!e) return { estados: null };
        const enEspera = Number(e.EN_ESPERA ?? 0);
        const enProceso = Number(e.EN_PROCESO ?? 0);
        const finalizados = Number(e.FINALIZADO ?? 0);
        const cancelados = Number(e.CANCELADO ?? 0);
        return {
          estados: {
            enEspera, enProceso, finalizados, cancelados,
            chart: {
              labels: ['En espera', 'En proceso', 'Finalizados', 'Cancelados'],
              datasets: [{
                data: [enEspera, enProceso, finalizados, cancelados],
                backgroundColor: [CHART_COLORS.amber, CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.rose]
              }]
            }
          }
        };
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los servicios de hoy', err);
        return of({ estados: null });
      })
    );
  }

  /**
   * Estado y disponibilidad del parque de maquinaria (POST /maquinaria/list)
   */
  getMaquinaria(filtro: any = {}): Observable<any> {
    const payload = { ...filtro, pageSize: 200 };
    return this.http.post<any>(apiUrl('/maquinaria/list'), payload).pipe(
      map(res => {
        const raw = Array.isArray(res) ? res : (res?.data || res?.items || res?.rows || []);
        const total = raw.length;
        const operativas = raw.filter((m: any) => (m.estadoOperativo || m.estado) === 'OPERATIVA' || (m.estadoOperativo || m.estado) === 'Operativa').length;
        const mantenimiento = raw.filter((m: any) => (m.estadoOperativo || m.estado) === 'EN_MANTENIMIENTO' || (m.estadoOperativo || m.estado) === 'Mantenimiento').length;
        const danadas = Math.max(0, total - operativas - mantenimiento);
        return { total, operativas, mantenimiento, danadas };
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el estado de maquinaria', err);
        return of({ total: 0, operativas: 0, mantenimiento: 0, danadas: 0 });
      })
    );
  }

  /**
   * Alertas de stock para el dashboard (POST /inventario/alertas/list). El servidor ya aplica el alcance del
   * rol y, si se envía, el filtro `agenciaId`. Devuelve datos aplanados para poder filtrar/resumir en la UI.
   */
  getAlertas(filtro: any = {}): Observable<AlertaStockVM[]> {
    return this.http.post<any[]>(apiUrl('/inventario/alertas/list'), filtro).pipe(
      map(items => (Array.isArray(items) ? items : []).map(a => this.aAlertaVM(a))),
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar las alertas de stock', err);
        return of([]);
      })
    );
  }

  /** Normaliza una alerta operativa del dashboard (stock o mantenimiento) al modelo del widget. */
  private aAlertaOperativaVM(a: any): AlertaStockVM {
    const fechaObj = a?.fecha ? new Date(a.fecha) : null;
    return {
      id: String(a?.id ?? `al-${a?.grupo}-${a?.detalle}-${a?.fecha}`),
      tipo: (a?.severidad as any) || 'info',
      grupo: a?.grupo === 'mantenimiento' ? 'mantenimiento' : 'stock',
      titulo: a?.titulo || 'Alerta',
      detalle: a?.detalle || '',
      nivel: String(a?.nivel || ''),
      estado: String(a?.estado || ''),
      insumo: a?.detalle || '',
      origen: a?.origen || null,
      region: a?.region || null,
      mensaje: a?.detalle || '',
      fecha: fechaObj ? fechaObj.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
      timestamp: fechaObj ? fechaObj.getTime() : 0,
    };
  }

  private aAlertaVM(a: any): AlertaStockVM {
    const nivel = String(a?.nivel || '').toUpperCase();
    const tipo = (nivel === 'CRITICO' || nivel === 'AGOTADO') ? 'critica' : (nivel === 'BAJO' ? 'advertencia' : 'info');
    const fechaObj = a?.createdAt ? new Date(a.createdAt) : null;
    const pulidor = a?.pulidor ? `${a.pulidor.name ?? ''} ${a.pulidor.lastname ?? ''}`.trim() : null;
    return {
      id: String(a?.id ?? `${nivel}-${a?.insumo?.nombre ?? ''}-${a?.createdAt ?? ''}`),
      tipo,
      nivel,
      estado: String(a?.estado || 'PENDIENTE'),
      insumo: a?.insumo?.nombre || 'Insumo',
      sku: a?.insumo?.codigoSKU,
      categoria: a?.insumo?.categoria,
      origen: a?.agencia?.nombre || pulidor || null,
      region: a?.agencia?.region || null,
      mensaje: a?.mensaje || '',
      fecha: fechaObj ? fechaObj.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
      timestamp: fechaObj ? fechaObj.getTime() : 0,
    };
  }

  /**
   * KPIs y tableros para Técnico / Coordinador de Mantenimiento.
   * Llama al endpoint dedicado POST /analytics/dashboard-taller que devuelve
   * estado del parque, incidentes 30d, gravedad, top máquinas problemáticas y próximos mantenimientos.
   */
  getDashboardTecnico(filtro: any = {}): Observable<DashboardTecnicoData> {
    return this.http.post<any>(apiUrl('/analytics/dashboard-taller'), filtro).pipe(
      map(d => {
        const toDonut = (arr: any[], labelField: string, valueField: string) =>
          arr && arr.length > 0 ? { labels: arr.map((x: any) => x[labelField]), datasets: [{ data: arr.map((x: any) => x[valueField] ?? 0), backgroundColor: coloresCategoricos(arr.length) }] } : null;
        const toBar = (arr: any[], labelField: string, valueField: string, label: string) =>
          arr && arr.length > 0 ? { labels: arr.map((x: any) => x[labelField]), datasets: [{ label, data: arr.map((x: any) => x[valueField] ?? 0), backgroundColor: coloresCategoricos(arr.length) }] } : null;

        return {
          incidentesAbiertos: d?.kpis?.incidentesActivos ?? 0,
          mantenimientosPendientes: d?.kpis?.maquinariaEnMantenimiento ?? 0,
          equiposOperativos: d?.kpis?.maquinariaOperativa ?? 0,
          equiposEnReparacion: d?.kpis?.maquinariaEnMantenimiento ?? 0,
          maquinariaFueraServicio: d?.kpis?.maquinariaFueraServicio ?? 0,
          costoTotalReparaciones: d?.kpis?.costoTotalReparaciones ?? 0,
          tiempoPromedioResolucionHoras: d?.kpis?.tiempoPromedioResolucionHoras ?? 0,
          mantenimientosEjecutados30d: d?.kpis?.mantenimientosEjecutados30d ?? 0,
          // Gráficos
          chartEstadoParque: toDonut(d?.estadoParque, 'nombre', 'total'),
          chartGravedadIncidentes: toDonut(d?.gravedadIncidentes, 'nombre', 'cantidad'),
          chartEstadoIncidentes: toDonut(d?.estadoIncidentes, 'nombre', 'cantidad'),
          chartTopMaquinas: toBar(d?.topMaquinasProblematicas, 'nombre', 'total', 'Incidentes'),
          chartCostoMaquinas: d?.topMaquinasCostosas && d.topMaquinasCostosas.length > 0 ? {
            labels: d.topMaquinasCostosas.map((m: any) => m.nombre),
            datasets: [{ label: 'Costo USD', data: d.topMaquinasCostosas.map((m: any) => m.costoTotal), backgroundColor: [CHART_COLORS.rose, CHART_COLORS.amber, CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.slate] }]
          } : null,
          chartTipoMantenimiento: toDonut(d?.tipoMantenimiento, 'nombre', 'cantidad'),
          chartTipoMaquinaria: toDonut(d?.distribucionTipoMaquinaria, 'nombre', 'total'),
          // Tabla próximos mantenimientos
          proxMantenimientos: d?.proxMantenimientos || [],
          // Costos y fiabilidad
          costoMantenimientos30d: d?.kpis?.costoMantenimientos30d ?? 0,
          mantenimientosVencidos: d?.kpis?.mantenimientosVencidos ?? 0,
          chartCostoTipoMantenimiento: toDonut(d?.costoPorTipoMantenimiento, 'nombre', 'costo'),
          chartMttrGravedad: d?.mttrPorGravedad?.length ? {
            labels: d.mttrPorGravedad.map((x: any) => x.nombre),
            datasets: [{ 
              label: 'Horas promedio', 
              data: d.mttrPorGravedad.map((x: any) => x.horas), 
              backgroundColor: d.mttrPorGravedad.map((x: any) => {
                if (x.nombre === 'BAJA') return CHART_COLORS.green;
                if (x.nombre === 'MEDIA') return CHART_COLORS.amber;
                if (x.nombre === 'ALTA') return CHART_COLORS.rose;
                return '#9F1239'; // CRITICA
              })
            }]
          } : null,
          // MTTR por agencia: indica DÓNDE se resuelve lento. Escala de lentitud ámbar → rojo.
          chartMttrAgencia: d?.mttrPorAgencia?.length ? (() => {
            const items = d.mttrPorAgencia;
            const horas = items.map((x: any) => Number(x.horas) || 0);
            const max = Math.max(...horas);
            const min = Math.min(...horas);
            return {
              labels: items.map((x: any) => x.nombre),
              datasets: [{
                label: 'Horas promedio',
                data: horas,
                backgroundColor: horas.map((h: number) => interpolarHex(CHART_COLORS.amber, CHART_COLORS.rose, max > min ? (h - min) / (max - min) : 0)),
                borderRadius: 6,
              }],
            };
          })() : null,
          mttrGravedad: d?.mttrPorGravedad ?? [],
          mttrAgencia: d?.mttrPorAgencia ?? [],
          chartCostoPorAgencia: d?.costoPorAgencia?.length ? {
            labels: d.costoPorAgencia.map((x: any) => x.nombre),
            datasets: [
              { label: 'Reparaciones (fallas)', data: d.costoPorAgencia.map((x: any) => x.reparaciones), backgroundColor: CHART_COLORS.amber },
              { label: 'Mantenimiento', data: d.costoPorAgencia.map((x: any) => x.mantenimiento), backgroundColor: CHART_COLORS.blue },
            ]
          } : null,
        };
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el dashboard de taller', err);
        return of({ incidentesAbiertos: 0, mantenimientosPendientes: 0, equiposOperativos: 0, equiposEnReparacion: 0, chartIncidentesPorEstado: null });
      })
    );
  }

  /**
   * Dashboard dedicado para Bodega: consume el endpoint /analytics/dashboard-bodega.
   * Retorna alertas activas, despachos en tránsito, consumo por categoría y valor del stock.
   */
  getDashboardBodegaDedicado(filtro: any = {}): Observable<any> {
    return this.http.post<any>(apiUrl('/analytics/dashboard-bodega'), filtro).pipe(
      map(d => {
        const toDonut = (arr: any[], labelField: string, valueField: string) =>
          arr && arr.length > 0 ? { labels: arr.map((x: any) => x[labelField]), datasets: [{ data: arr.map((x: any) => x[valueField] ?? 0), backgroundColor: coloresCategoricos(arr.length) }] } : null;
        const toBar = (arr: any[], labelField: string, valueField: string, label: string) =>
          arr && arr.length > 0 ? { labels: arr.map((x: any) => x[labelField]), datasets: [{ label, data: arr.map((x: any) => x[valueField] ?? 0), backgroundColor: coloresCategoricos(arr.length) }] } : null;

        return {
          kpis: d?.kpis ?? {},
          chartNivelAlertas: toDonut(d?.nivelAlertas, 'nombre', 'cantidad'),
          chartTopInsumosCriticos: toBar(d?.topInsumosCriticos, 'nombre', 'alertas', 'Alertas'),
          chartTopAgenciasConAlertas: toBar(d?.topAgenciasConAlertas, 'nombre', 'alertas', 'Alertas'),
          chartTopInsumosConsumo: toBar(d?.topInsumosConsumo, 'nombre', 'cantidad', 'Unidades'),
          chartDespachosEstado: toDonut(d?.despachosEstado, 'nombre', 'cantidad'),
          chartConsumoPorCategoria: toBar(d?.consumoPorCategoria, 'nombre', 'cantidad', 'Unidades'),
          chartTopAgenciasConsumo: toBar(d?.topAgenciasConsumo, 'nombre', 'cantidad', 'Unidades'),
          chartValorStockPorCategoria: toBar(d?.valorStockPorCategoria, 'nombre', 'cantidad', 'Valor USD'),
          ...this.mapSaludInventario(d),
        };
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el dashboard de bodega', err);
        return of({ kpis: {}, chartNivelAlertas: null, chartTopInsumosCriticos: null, chartDespachosEstado: null, chartConsumoPorCategoria: null });
      })
    );
  }

  /** Colores semánticos por estado de stock: de lo más grave (agotado) a sobrestock. */
  private readonly COLOR_SALUD: Record<string, string> = {
    'AGOTADO': CHART_COLORS.rose, 'CRÍTICO': CHART_COLORS.amber, 'BAJO MÍNIMO': '#FCD34D',
    'BAJO IDEAL': CHART_COLORS.blueLight, 'ÓPTIMO': CHART_COLORS.green, 'SOBRESTOCK': CHART_COLORS.violet,
  };

  /** Gráficos de salud de inventario: stock real vs mínimo/ideal, agrupado por estado, ubicación y categoría. */
  private mapSaludInventario(d: any): any {
    const estados = ['AGOTADO', 'CRÍTICO', 'BAJO MÍNIMO', 'BAJO IDEAL', 'ÓPTIMO', 'SOBRESTOCK'];
    const salud: any[] = d?.saludStock ?? [];
    const ubic: any[] = d?.saludPorUbicacion ?? [];
    const cat: any[] = d?.stockVsIdealCategoria ?? [];
    const def: any[] = d?.topDeficit ?? [];
    const alc: any[] = d?.alertasPorCategoriaNivel ?? [];
    const cob: any[] = d?.coberturaDias ?? [];
    const hayEvaluacion = salud.some((s) => s.cantidad > 0);
    return {
      chartSaludStock: hayEvaluacion ? {
        labels: salud.map((s) => s.nombre),
        datasets: [{ data: salud.map((s) => s.cantidad), backgroundColor: salud.map((s) => this.COLOR_SALUD[s.nombre]) }],
      } : null,
      chartSaludPorUbicacion: ubic.length ? {
        labels: ubic.map((u) => u.nombre),
        datasets: estados.slice(0, 4).map((e) => ({ label: e, data: ubic.map((u) => u[e] ?? 0), backgroundColor: this.COLOR_SALUD[e] })),
      } : null,
      chartStockVsIdeal: cat.length ? {
        labels: cat.map((c) => c.nombre),
        datasets: [
          { label: 'Stock actual', data: cat.map((c) => c.actual), backgroundColor: CHART_COLORS.blue },
          { label: 'Mínimo', data: cat.map((c) => c.minimo), backgroundColor: CHART_COLORS.amber },
          { label: 'Ideal', data: cat.map((c) => c.ideal), backgroundColor: CHART_COLORS.green },
        ],
      } : null,
      chartCobertura: cob.length ? {
        labels: cob.map((x) => x.nombre),
        datasets: [{ label: 'Días de cobertura', data: cob.map((x) => x.dias), backgroundColor: cob.map((x) => x.dias < 7 ? CHART_COLORS.rose : x.dias < 15 ? CHART_COLORS.amber : CHART_COLORS.green) }],
      } : null,
      chartTopDeficit: def.length ? {
        labels: def.map((x) => x.nombre),
        datasets: [{ label: 'Costo de reposición USD', data: def.map((x) => x.costoReposicionUSD), backgroundColor: coloresCategoricos(def.length) }],
      } : null,
      chartAlertasCategoriaNivel: alc.length ? {
        labels: alc.map((x) => x.nombre),
        datasets: [
          { label: 'Agotado', data: alc.map((x) => x.AGOTADO), backgroundColor: this.COLOR_SALUD['AGOTADO'] },
          { label: 'Crítico', data: alc.map((x) => x.CRITICO), backgroundColor: this.COLOR_SALUD['CRÍTICO'] },
          { label: 'Bajo', data: alc.map((x) => x.BAJO), backgroundColor: this.COLOR_SALUD['BAJO IDEAL'] },
        ],
      } : null,
    };
  }

  /**
   * Dashboard dedicado para Servicios Especiales: consume el endpoint /analytics/dashboard-especiales.
   * Retorna KPIs de OTs, flujo semanal, mix de tipos, cola activa y top operadores.
   */
  getDashboardEspeciales(filtro: any = {}): Observable<any> {
    return this.http.post<any>(apiUrl('/analytics/dashboard-especiales'), filtro).pipe(
      map(d => {
        const toDonut = (arr: any[], labelField: string, valueField: string) =>
          arr && arr.length > 0 ? { labels: arr.map((x: any) => x[labelField]), datasets: [{ data: arr.map((x: any) => x[valueField] ?? 0), backgroundColor: coloresCategoricos(arr.length) }] } : null;
        const toBar = (arr: any[], labelField: string, valueField: string, label: string) =>
          arr && arr.length > 0 ? { labels: arr.map((x: any) => x[labelField]), datasets: [{ label, data: arr.map((x: any) => x[valueField] ?? 0), backgroundColor: coloresCategoricos(arr.length) }] } : null;

        return {
          kpis: d?.kpis ?? {},
          chartFlujoSemanal: d?.flujoSemanal && d.flujoSemanal.length > 0 ? {
            labels: d.flujoSemanal.map((f: any) => f.hora),
            datasets: [{ label: 'OTs creadas', data: d.flujoSemanal.map((f: any) => f.cantidad), backgroundColor: CHART_COLORS.green, borderRadius: 6 }]
          } : null,
          chartTipoServicio: toDonut(d?.tipoServicio, 'nombre', 'cantidad'),
          chartEstadosHoy: toDonut(d?.estadosHoy, 'nombre', 'cantidad'),
          chartPrioridad: toBar(d?.prioridad, 'nombre', 'cantidad', 'OTs'),
          chartTopOperadores: toBar(d?.topOperadores, 'nombre', 'servicios', 'Servicios'),
          // Ranking de pulidores fijos vs móviles (cantidad de servicios + dinero generado).
          pulidoresFijos: (d?.pulidores?.fijos ?? []).map((p: any) => ({ nombre: p.nombre, servicios: p.servicios, ingresos: p.ingresos })),
          pulidoresMoviles: (d?.pulidores?.moviles ?? []).map((p: any) => ({ nombre: p.nombre, servicios: p.servicios, ingresos: p.ingresos })),
          colaActiva: d?.colaActiva || [],
        };
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el dashboard de especiales', err);
        return of({ kpis: {}, chartFlujoSemanal: null, chartTipoServicio: null, chartEstadosHoy: null, colaActiva: [] });
      })
    );
  }

  /**
   * KPIs y tableros para Distribuidor / Bodega: alertas de stock y consumo real de insumos
   * (POST /analytics/consumo-quimicos -> insumos, ordenados por costo).
   */
  getDashboardDistribuidor(filtro: any = {}): Observable<DashboardDistribuidorData> {
    return forkJoin([
      this.http.post<any[]>(apiUrl('/inventario/alertas/list'), filtro).pipe(
        catchError((err) => {
          this.avisarErrorCarga('No se pudieron cargar las alertas de stock', err);
          return of([]);
        })
      ),
      this.http.post<any>(apiUrl('/analytics/consumo-quimicos'), filtro).pipe(
        catchError((err) => {
          this.avisarErrorCarga('No se pudo cargar el consumo de insumos', err);
          return of(null);
        })
      )
    ]).pipe(
      map(([alertas, consumo]) => {
        const criticos = (alertas || []).filter((a: any) => (a.nivel || '').toUpperCase() === 'CRITICO').length;
        const insumosList = Array.isArray(consumo?.insumos) ? consumo.insumos : [];
        const topInsumos = [...insumosList].sort((a, b) => b.cantidadTotal - a.cantidadTotal).slice(0, 5);
        const bottomInsumos = [...insumosList].sort((a, b) => a.cantidadTotal - b.cantidadTotal).filter(i => i.cantidadTotal > 0).slice(0, 5);

        const truncate = (str: string, len: number) => str.length > len ? str.substring(0, len) + '...' : str;
        
        return {
          skusCriticos: criticos,
          chartConsumoInsumos: {
            labels: topInsumos.map(c => truncate(c.nombre, 15)),
            datasets: [{
              label: 'Más Consumidos',
              data: topInsumos.map(c => Number(c.cantidadTotal || 0)),
              backgroundColor: coloresCategoricos(topInsumos.length)
            }]
          },
          chartInsumosMenosConsumidos: bottomInsumos.length > 0 ? {
            labels: bottomInsumos.map(c => truncate(c.nombre, 15)),
            datasets: [{
              label: 'Menos Consumidos',
              data: bottomInsumos.map(c => Number(c.cantidadTotal || 0)),
              backgroundColor: coloresCategoricos(bottomInsumos.length).reverse()
            }]
          } : null,
          chartConsumoPorAgencia: consumo?.consumoPorAgencia && consumo.consumoPorAgencia.length > 0 ? {
            labels: consumo.consumoPorAgencia.map((a: any) => truncate(a.nombre, 15)),
            datasets: [{
              label: 'Cantidad (Unidades)',
              data: consumo.consumoPorAgencia.map((a: any) => a.costo),
              backgroundColor: coloresCategoricos(consumo.consumoPorAgencia.length)
            }]
          } : null,
          chartConsumoPorCategoria: consumo?.consumoPorCategoria && consumo.consumoPorCategoria.length > 0 ? {
            labels: consumo.consumoPorCategoria.map((c: any) => c.nombre),
            datasets: [{
              data: consumo.consumoPorCategoria.map((c: any) => c.cantidad),
              backgroundColor: coloresCategoricos(consumo.consumoPorCategoria.length)
            }]
          } : null
        };
      })
    );
  }

  /**
   * Resumen ejecutivo del día (POST /analytics/dashboard -> kpis). Solo se listan los indicadores que el servidor calcula.
   */
  getResumenEjecutivo(filtro: any = {}): Observable<ResumenEjecutivoData> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), filtro).pipe(
      map(data => {
        const k = data?.kpis;
        if (!k) return { kpis: [] };

        // Cumplimiento de tiempos (SLA) y desviación real vs. estimado, comunes a varios roles operativos.
        const slaTexto = k.cumplimientoSlaPct === null || k.cumplimientoSlaPct === undefined ? 'Sin datos' : `${k.cumplimientoSlaPct}%`;
        const slaVariant = (k.cumplimientoSlaPct ?? 100) >= 80 ? 'success' : 'danger';
        const desviacionTexto = k.desviacionPromedioMin === null || k.desviacionPromedioMin === undefined
          ? 'Sin datos'
          : `${k.desviacionPromedioMin > 0 ? '+' : ''}${k.desviacionPromedioMin} min`;

        if (data.isAdminView) {
          const crecimiento = k.variacionMesPct;
          const crecimientoTexto = crecimiento === null || crecimiento === undefined
            ? 'Sin base'
            : `${crecimiento > 0 ? '+' : ''}${crecimiento}%`;
          return { kpis: [
            // Financieros y de crecimiento
            { label: 'Ingreso Hoy', value: `$${k.ingresoHoy ?? 0}`, icon: 'dollar-sign', variant: 'success' },
            { label: 'Ingreso del Mes', value: `$${k.ingresoMes ?? 0}`, icon: 'trending-up', variant: 'primary' },
            { label: 'Ticket Promedio', value: `$${k.ticketPromedioHoy ?? 0}`, icon: 'tag', variant: 'primary', tooltip: 'Ingreso promedio por cada servicio realizado hoy' },
            { label: 'Crecimiento vs Mes Ant.', value: crecimientoTexto, icon: 'trending-up', variant: crecimiento != null && crecimiento < 0 ? 'danger' : 'success', tooltip: 'Variación porcentual de ingresos frente al mes anterior' },
            // Productividad de la red
            { label: 'Servicios Completados Hoy', value: String(k.serviciosCompletadosHoy ?? 0), icon: 'check-circle', variant: 'success' },
            { label: 'Servicios del Mes', value: String(k.serviciosCompletadosMes ?? 0), icon: 'bar-chart-2', variant: 'primary' },
            { label: 'Tiempo Promedio', value: k.tiempoPromedioServicioMin > 0 ? `${k.tiempoPromedioServicioMin} min` : 'Sin datos', icon: 'clock', variant: 'warning' },
            // Salud del negocio
            { label: 'Costo Reparaciones (30d)', value: `$${k.costoReparaciones30d ?? 0}`, icon: 'wrench', variant: 'warning' },
            { label: 'Valor Inventario', value: `$${k.valorInventarioUSD ?? 0}`, icon: 'package', variant: 'primary' },
            { label: 'Inventario en Tránsito', value: `$${k.valorEnTransitoUSD ?? 0}`, icon: 'truck', variant: 'warning' },
          ]};
        }

        if (data.isAprobadorView) {
          return { kpis: [
            { label: 'Solicitudes Hoy', value: String(k.totalHoy ?? 0), icon: 'inbox', variant: 'primary' },
            { label: 'Pendientes', value: String(k.pendientesHoy ?? 0), icon: 'clock', variant: 'warning' },
            { label: 'Aprobadas', value: String(k.aprobadasHoy ?? 0), icon: 'check-circle', variant: 'success' },
            { label: 'Rechazadas', value: String(k.rechazadasHoy ?? 0), icon: 'x-circle', variant: 'danger' },
            { label: 'Anuladas Hoy', value: String(k.anuladasHoy ?? 0), icon: 'shield-x', variant: 'danger' },
            { label: 'Descuentos fuera de rango (30d)', value: String(k.descuentosFueraDeRango ?? 0), icon: 'shield-alert', variant: 'danger' },
          ]};
        }

        if (data.isComercialView) {
          return { kpis: [
            { label: 'Lavados Hoy', value: String(k.serviciosHoy ?? 0), icon: 'car', variant: 'primary' },
            { label: 'Lavados 30 días', value: String(k.servicios30Dias ?? 0), icon: 'bar-chart-2', variant: 'success' },
            { label: 'Descuentos Pendientes', value: String(k.descuentosPendientes ?? 0), icon: 'clock', variant: 'warning' },
            { label: 'Costo Químicos (30d)', value: k.costoQuimicos30d > 0 ? `$${k.costoQuimicos30d}` : '$0', icon: 'dollar-sign', variant: 'primary' },
            { label: 'Cumplimiento SLA (30d)', value: slaTexto, icon: 'shield-check', variant: slaVariant, tooltip: '% de vehículos entregados dentro del tiempo prometido' },
            { label: 'Desviación vs Estimado', value: desviacionTexto, icon: 'clock', variant: 'warning', tooltip: 'Promedio de minutos de adelanto (-) o retraso (+) vs lo esperado' },
            { label: '% Premium/Especiales (30d)', value: k.premiumPct === null || k.premiumPct === undefined ? 'Sin datos' : `${k.premiumPct}%`, icon: 'sparkles', variant: 'primary', tooltip: 'Porcentaje de servicios que pertenecen al catálogo Especial/Premium' },
          ]};
        }

        if (data.isSupervisorView) {
          return { kpis: [
            { label: 'Lavados Hoy (Región)', value: String(k.totalLavadosHoy ?? 0), icon: 'check-circle', variant: 'success' },
            { label: 'Finalizados', value: String(k.lavadosFinalizados ?? 0), icon: 'shield-check', variant: 'primary' },
            { label: 'Incidentes Abiertos', value: String(k.incidentesAbiertos ?? 0), icon: 'alert-triangle', variant: 'warning' },
            { label: 'Tiempo Promedio', value: k.tiempoPromedioMin > 0 ? `${k.tiempoPromedioMin} min` : 'Sin datos', icon: 'clock', variant: 'warning' },
            { label: 'Cumplimiento SLA', value: slaTexto, icon: 'shield-check', variant: slaVariant, tooltip: '% de vehículos entregados dentro del tiempo prometido' },
            { label: 'Desviación vs Estimado', value: desviacionTexto, icon: 'clock', variant: 'warning', tooltip: 'Promedio de minutos de adelanto (-) o retraso (+) vs lo esperado' },
          ]};
        }

        return { kpis: [
          { label: 'Lavados de Hoy', value: String(k.totalLavadosHoy ?? 0), icon: 'check-circle', variant: 'success' },
          { label: 'Finalizados', value: String(k.lavadosFinalizados ?? 0), icon: 'shield-check', variant: 'primary' },
          { label: 'Incidentes Abiertos', value: String(k.incidentesAbiertos ?? 0), icon: 'alert-triangle', variant: 'warning' },
          { label: 'Tiempo Promedio', value: k.tiempoPromedioMin > 0 ? `${k.tiempoPromedioMin} min` : 'Sin datos', icon: 'clock', variant: 'warning' },
          { label: 'Cumplimiento SLA', value: slaTexto, icon: 'shield-check', variant: slaVariant, tooltip: '% de vehículos entregados dentro del tiempo prometido' },
          { label: 'Desviación vs Estimado', value: desviacionTexto, icon: 'clock', variant: 'warning', tooltip: 'Promedio de minutos de adelanto (-) o retraso (+) vs lo esperado' },
        ]};
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el resumen ejecutivo', err);
        return of({ kpis: [] });
      })
    );
  }
}

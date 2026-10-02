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
import { CHART_COLORS } from '../../shared/theme/colors';
import { ToastService } from '../../shared/services/toast.service';

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
   * Producción del día (POST /analytics/dashboard). El servidor solo entrega los totales de hoy (`kpis`); no calcula
   * serie por hora ni productividad por bahía, así que esos gráficos quedan en null.
   */
  getProduccion(): Observable<any> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), {}).pipe(
      map(data => ({
        vehiculosHoy: data?.kpis?.totalLavadosHoy ?? null,
        produccionPorHora: null,
        productividadBahias: null
      })),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar la producción del día', err);
        return of({ vehiculosHoy: null, produccionPorHora: null, productividadBahias: null });
      })
    );
  }

  /**
   * Ranking de operadores por servicios atendidos (POST /agencias/operadores/list).
   */
  getOperadores(): Observable<any> {
    return this.http.post<any[]>(apiUrl('/agencias/operadores/list'), {}).pipe(
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
      map(data => Array.isArray(data?.ranking) ? data.ranking : []),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el ranking de lavadores', err);
        return of([]);
      })
    );
  }

  /**
   * Servicios de hoy por estado (POST /analytics/dashboard -> distribucionEstados). El servidor no separa generales de
   * especiales ni entrega aprobaciones pendientes en este endpoint, por eso no se exponen.
   */
  getServiciosData(): Observable<any> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), {}).pipe(
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
  getMaquinaria(): Observable<any> {
    return this.http.post<any[]>(apiUrl('/maquinaria/list'), {}).pipe(
      map(list => {
        const raw = Array.isArray(list) ? list : [];
        const total = raw.length;
        const operativas = raw.filter(m => (m.estadoOperativo || m.estado) === 'OPERATIVA' || (m.estadoOperativo || m.estado) === 'Operativa').length;
        const mantenimiento = raw.filter(m => (m.estadoOperativo || m.estado) === 'EN_MANTENIMIENTO' || (m.estadoOperativo || m.estado) === 'Mantenimiento').length;
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
   * Alertas de stock bajo en tiempo real (POST /inventario/alertas/list)
   */
  getAlertas(): Observable<any[]> {
    return this.http.post<any[]>(apiUrl('/inventario/alertas/list'), {}).pipe(
      map(items => {
        if (!items || items.length === 0) return [];
        return items.map(a => {
          const nivel = (a.nivel || '').toUpperCase();
          const tipo = (nivel === 'CRITICO' || nivel.includes('AGOTADO')) ? 'critica' : ((nivel === 'BAJO') ? 'advertencia' : 'info');
          const agenciaInfo = a.agencia ? ` [${a.agencia.nombre}${a.agencia.region ? ' · ' + a.agencia.region : ''}]` : '';
          const fechaStr = a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '';
          return {
            tipo,
            mensaje: `${a.mensaje || ('Stock bajo: ' + (a.insumo?.nombre || 'Insumo'))}${agenciaInfo}`,
            fecha: fechaStr
          };
        });
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar las alertas de stock', err);
        return of([]);
      })
    );
  }

  /**
   * KPIs y tableros para Técnico de Mantenimiento (maquinaria e incidentes reales).
   */
  getDashboardTecnico(): Observable<DashboardTecnicoData> {
    const maq$ = this.http.post<any[]>(apiUrl('/maquinaria/list'), {}).pipe(
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar la maquinaria', err);
        return of([]);
      })
    );
    const inc$ = this.http.post<any>(apiUrl('/maquinaria/incidentes/list'), {}).pipe(
      map(res => Array.isArray(res) ? res : (res?.data || [])),
      catchError((err) => {
        this.avisarErrorCarga('No se pudieron cargar los incidentes', err);
        return of([]);
      })
    );

    return forkJoin([maq$, inc$]).pipe(
      map(([maquinarias, incidentes]) => {
        const maqs = Array.isArray(maquinarias) ? maquinarias : [];
        const incs = Array.isArray(incidentes) ? incidentes : [];
        const estadoMaq = (m: any) => m.estadoOperativo || m.estado;

        const sinAtender = incs.filter(i => i.estado === 'ABIERTO' || i.estado === 'Pendiente').length;
        const enProceso = incs.filter(i => i.estado === 'EN_PROCESO').length;
        const resueltos = incs.filter(i => i.estado === 'RESUELTO').length;
        const operativas = maqs.filter(m => estadoMaq(m) === 'OPERATIVA' || estadoMaq(m) === 'Operativa').length;
        const enReparacion = maqs.filter(m => estadoMaq(m) === 'EN_MANTENIMIENTO' || estadoMaq(m) === 'Mantenimiento').length;

        return {
          incidentesAbiertos: sinAtender + enProceso,
          mantenimientosPendientes: enReparacion,
          equiposOperativos: operativas,
          equiposEnReparacion: enReparacion,
          chartIncidentesPorEstado: {
            labels: ['Abiertos', 'En Proceso', 'Resueltos'],
            datasets: [{
              data: [sinAtender, enProceso, resueltos],
              backgroundColor: [CHART_COLORS.rose, CHART_COLORS.amber, CHART_COLORS.green]
            }]
          }
        };
      })
    );
  }

  /**
   * KPIs y tableros para Distribuidor / Bodega: alertas de stock y consumo real de insumos
   * (POST /analytics/consumo-quimicos -> insumos, ordenados por costo).
   */
  getDashboardDistribuidor(): Observable<DashboardDistribuidorData> {
    return forkJoin([
      this.http.post<any[]>(apiUrl('/inventario/alertas/list'), {}).pipe(
        catchError((err) => {
          this.avisarErrorCarga('No se pudieron cargar las alertas de stock', err);
          return of([]);
        })
      ),
      this.http.post<any>(apiUrl('/analytics/consumo-quimicos'), {}).pipe(
        catchError((err) => {
          this.avisarErrorCarga('No se pudo cargar el consumo de insumos', err);
          return of(null);
        })
      )
    ]).pipe(
      map(([alertas, consumo]) => {
        const criticos = (alertas || []).filter((a: any) => (a.nivel || '').toUpperCase() === 'CRITICO').length;
        const insumos: any[] = Array.isArray(consumo?.insumos) ? consumo.insumos.slice(0, 5) : [];

        return {
          skusCriticos: criticos,
          chartConsumoInsumos: {
            labels: insumos.map(c => c.nombre),
            datasets: [{
              label: 'Consumo del mes',
              data: insumos.map(c => Number(c.cantidadTotal || 0)),
              backgroundColor: CHART_COLORS.blue
            }]
          }
        };
      })
    );
  }

  /**
   * Resumen ejecutivo del día (POST /analytics/dashboard -> kpis). Solo se listan los indicadores que el servidor calcula.
   */
  getResumenEjecutivo(): Observable<ResumenEjecutivoData> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), {}).pipe(
      map(data => {
        const k = data?.kpis;
        if (!k) return { kpis: [] };
        return {
          kpis: [
            { label: 'Lavados de Hoy', value: String(k.totalLavadosHoy ?? 0), icon: 'check-circle', variant: 'success' },
            { label: 'Finalizados', value: String(k.lavadosFinalizados ?? 0), icon: 'shield-check', variant: 'primary' },
            { label: 'Incidentes Abiertos', value: String(k.incidentesAbiertos ?? 0), icon: 'alert-triangle', variant: 'warning' },
            { label: 'Tiempo Promedio', value: k.tiempoPromedioMin > 0 ? `${k.tiempoPromedioMin} min` : 'Sin datos', icon: 'clock', variant: 'warning' }
          ]
        };
      }),
      catchError((err) => {
        this.avisarErrorCarga('No se pudo cargar el resumen ejecutivo', err);
        return of({ kpis: [] });
      })
    );
  }
}

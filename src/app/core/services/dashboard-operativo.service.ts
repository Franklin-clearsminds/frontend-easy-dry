import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { apiUrl } from '../config/env';
import {
  DashboardTecnicoData,
  DashboardOperadorData,
  DashboardOperadorEspecialesData,
  DashboardDistribuidorData,
  DashboardComercialData,
  ResumenEjecutivoData
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardOperativoService {
  private http = inject(HttpClient);

  /**
   * Métricas generales de producción calculadas en servidor (POST /analytics/dashboard)
   */
  getProduccion(): Observable<any> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), {}).pipe(
      map(data => {
        const total = data?.totalLavadosHoy ?? 0;
        const porHora = data?.serviciosPorHora || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const bahiasLabels = data?.productividadBahias?.labels || [];
        const bahiasData = data?.productividadBahias?.data || [];

        return {
          vehiculosHoy: total,
          variacionVehiculos: data?.variacionSemanal != null ? `${data.variacionSemanal}%` : '0%',
          tendenciaVehiculos: (data?.variacionSemanal ?? 0) >= 0 ? 'up' : 'down',
          historicoComparativo: {
            semanaAnterior: data?.semanaAnterior ?? 0,
            semanaActual: data?.semanaActual ?? 0,
            crecimientoPct: data?.crecimientoPct ?? 0
          },
          produccionPorHora: {
            labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
            datasets: [
              {
                label: 'Vehículos',
                data: porHora,
                borderColor: '#004282',
                backgroundColor: 'rgba(0, 66, 130, 0.15)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#9BCB3B',
                pointBorderColor: '#004282',
              }
            ]
          },
          productividadBahias: {
            labels: bahiasLabels,
            datasets: [
              {
                label: 'Vehículos Procesados',
                data: bahiasData,
                backgroundColor: '#9BCB3B',
                borderRadius: 4
              }
            ]
          }
        };
      }),
      catchError(() => of({
        vehiculosHoy: 0,
        variacionVehiculos: '0%',
        tendenciaVehiculos: 'up',
        historicoComparativo: { semanaAnterior: 0, semanaActual: 0, crecimientoPct: 0 },
        produccionPorHora: {
          labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
          datasets: [{
            label: 'Vehículos',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: '#004282',
            backgroundColor: 'rgba(0, 66, 130, 0.15)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#9BCB3B',
            pointBorderColor: '#004282',
          }]
        },
        productividadBahias: {
          labels: [],
          datasets: [{ label: 'Vehículos Procesados', data: [], backgroundColor: '#9BCB3B', borderRadius: 4 }]
        }
      }))
    );
  }

  /**
   * Productividad y ranking de operadores de bahía desde PostgreSQL (POST /agencias/operadores/list)
   */
  getOperadores(): Observable<any> {
    return this.http.post<any[]>(apiUrl('/agencias/operadores/list'), {}).pipe(
      map(list => {
        const raw = Array.isArray(list) ? list : [];
        const activos = raw.filter(o => o.estado === 'Activo' || o.estado === 1).length;
        const total = raw.length;
        const ranking = raw.slice(0, 5).map((op, i) => ({
          posicion: i + 1,
          nombre: op.nombre || `${op.name || ''} ${op.lastname || ''}`.trim() || 'Operador',
          bahia: op.bahia || op.sucursal || 'Bahía Principal',
          vehiculos: op.vehiculosAtendidos || op.serviciosRealizados || 0,
          tendencia: i % 2 === 0 ? 'up' : 'same'
        }));

        return {
          activos,
          total,
          ausentes: Math.max(0, total - activos),
          disponibles: activos,
          ranking,
          bahiasActivas: 0,
          bahiasTotal: 0,
          bahiasMantenimiento: 0
        };
      }),
      catchError(() => of({
        activos: 0,
        total: 0,
        ausentes: 0,
        disponibles: 0,
        ranking: [],
        bahiasActivas: 0,
        bahiasTotal: 0,
        bahiasMantenimiento: 0
      }))
    );
  }

  /**
   * Mix de servicios y solicitudes de aprobación (POST /analytics/dashboard)
   */
  getServiciosData(): Observable<any> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), {}).pipe(
      map(data => {
        const generales = data?.serviciosGeneralesCount ?? 0;
        const especiales = data?.serviciosEspecialesCount ?? 0;
        const total = generales + especiales;
        const pendientes = data?.pendientesAprobacionCount ?? 0;

        return {
          total,
          generales,
          especiales,
          pendientesAprobacion: pendientes,
          distribucionGenerales: {
            labels: ['Express', 'Completo', 'Deluxe'],
            datasets: [{
              data: data?.distribucionGenerales || [0, 0, 0],
              backgroundColor: ['#004282', '#9BCB3B', '#F59E0B']
            }]
          },
          distribucionEspeciales: {
            labels: ['Pulido', 'Cerámico', 'Lavado Motor'],
            datasets: [{
              data: data?.distribucionEspeciales || [0, 0, 0],
              backgroundColor: ['#EF4444', '#8B5CF6', '#14B8A6']
            }]
          },
          aprobacionesPendientes: data?.aprobacionesPendientes || []
        };
      }),
      catchError(() => of({
        total: 0,
        generales: 0,
        especiales: 0,
        pendientesAprobacion: 0,
        distribucionGenerales: {
          labels: ['Express', 'Completo', 'Deluxe'],
          datasets: [{ data: [0, 0, 0], backgroundColor: ['#004282', '#9BCB3B', '#F59E0B'] }]
        },
        distribucionEspeciales: {
          labels: ['Pulido', 'Cerámico', 'Lavado Motor'],
          datasets: [{ data: [0, 0, 0], backgroundColor: ['#EF4444', '#8B5CF6', '#14B8A6'] }]
        },
        aprobacionesPendientes: []
      }))
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

        return {
          total,
          operativas,
          mantenimiento,
          danadas,
          fallasPorTipo: {
            labels: ['Hidrolavadoras', 'Aspiradoras', 'Secadoras', 'Pulidoras'],
            datasets: [{
              data: [danadas, mantenimiento, 0, 0],
              backgroundColor: ['#004282', '#9BCB3B', '#F59E0B', '#EF4444']
            }]
          }
        };
      }),
      catchError(() => of({
        total: 0,
        operativas: 0,
        mantenimiento: 0,
        danadas: 0,
        fallasPorTipo: {
          labels: ['Hidrolavadoras', 'Aspiradoras', 'Secadoras', 'Pulidoras'],
          datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#004282', '#9BCB3B', '#F59E0B', '#EF4444'] }]
        }
      }))
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
          const fechaStr = a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-EC', { hour: '2-digit', minute: '2-digit' }) : 'Reciente';
          return {
            tipo,
            mensaje: `${a.mensaje || ('Stock bajo: ' + (a.insumo?.nombre || 'Insumo'))}${agenciaInfo}`,
            fecha: fechaStr
          };
        });
      }),
      catchError(() => of([]))
    );
  }

  /**
   * KPIs y tableros para Técnico de Mantenimiento
   */
  getDashboardTecnico(): Observable<DashboardTecnicoData> {
    const maq$ = this.http.post<any[]>(apiUrl('/maquinaria/list'), {}).pipe(catchError(() => of([])));
    const inc$ = this.http.post<any>(apiUrl('/maquinaria/incidentes/list'), {}).pipe(
      map(res => Array.isArray(res) ? res : (res?.data || [])),
      catchError(() => of([]))
    );

    return forkJoin([maq$, inc$]).pipe(
      map(([maquinarias, incidentes]) => {
        const maqs = Array.isArray(maquinarias) ? maquinarias : [];
        const incs = Array.isArray(incidentes) ? incidentes : [];

        const abiertos = incs.filter(i => i.estado === 'ABIERTO' || i.estado === 'EN_PROCESO' || i.estado === 'Pendiente').length;
        const operativas = maqs.filter(m => (m.estadoOperativo || m.estado) === 'OPERATIVA' || (m.estadoOperativo || m.estado) === 'Operativa').length;
        const enReparacion = maqs.filter(m => (m.estadoOperativo || m.estado) === 'EN_MANTENIMIENTO' || (m.estadoOperativo || m.estado) === 'Mantenimiento').length;
        const resueltos = incs.filter(i => i.estado === 'RESUELTO').length;

        return {
          incidentesAbiertos: abiertos,
          mantenimientosPendientes: enReparacion,
          equiposOperativos: operativas,
          equiposEnReparacion: enReparacion,
          tiempoMedioReparacionHrs: 0,
          chartIncidentesPorEstado: {
            labels: ['Abiertos', 'En Proceso', 'Resueltos'],
            datasets: [{
              data: [abiertos, Math.max(0, incs.length - abiertos - resueltos), resueltos],
              backgroundColor: ['#E11D48', '#F59E0B', '#9BCB3B']
            }]
          },
          chartMantenimientosSemana: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
            datasets: [{
              label: 'Mantenimientos',
              data: [0, 0, 0, 0, 0, 0],
              backgroundColor: '#004282'
            }]
          },
          chartFallosPorTipo: {
            labels: ['Manguera', 'Bomba Hidráulica', 'Eléctrico', 'Boquilla'],
            datasets: [{
              data: [0, 0, 0, 0],
              backgroundColor: ['#004282', '#9BCB3B', '#F59E0B', '#E11D48']
            }]
          }
        };
      })
    );
  }

  /**
   * KPIs y tableros para Operador de Bahía
   */
  getDashboardOperador(): Observable<DashboardOperadorData> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), {}).pipe(
      map(data => ({
        otsHoy: data?.totalLavadosHoy ?? 0,
        enProceso: data?.estadosCount?.EN_PROCESO ?? 0,
        finalizados: data?.estadosCount?.FINALIZADO ?? 0,
        aprobados: data?.estadosCount?.FINALIZADO ?? 0,
        tiempoPromedioMin: data?.tiempoPromedioMinutos ?? 0,
        metaDiaria: data?.metaDiaria ?? 0,
        chartOtsPorHora: {
          labels: ['08:00', '10:00', '12:00', '14:00', '16:00'],
          datasets: [{
            label: 'OTs',
            data: data?.otsPorHora || [0, 0, 0, 0, 0],
            borderColor: '#004282',
            backgroundColor: 'rgba(0, 66, 130, 0.1)',
            fill: true
          }]
        },
        chartServiciosTipo: {
          labels: ['Express', 'Completo', 'Deluxe'],
          datasets: [{
            data: data?.distribucionGenerales || [0, 0, 0],
            backgroundColor: ['#004282', '#9BCB3B', '#F59E0B']
          }]
        }
      })),
      catchError(() => of({
        otsHoy: 0,
        enProceso: 0,
        finalizados: 0,
        aprobados: 0,
        tiempoPromedioMin: 0,
        metaDiaria: 0,
        chartOtsPorHora: {
          labels: ['08:00', '10:00', '12:00', '14:00', '16:00'],
          datasets: [{ label: 'OTs', data: [0, 0, 0, 0, 0], borderColor: '#004282', fill: true }]
        },
        chartServiciosTipo: {
          labels: ['Express', 'Completo', 'Deluxe'],
          datasets: [{ data: [0, 0, 0], backgroundColor: ['#004282', '#9BCB3B', '#F59E0B'] }]
        }
      }))
    );
  }

  /**
   * KPIs para Operador de Servicios Especiales / Pulidor (sin mock inventado)
   */
  getDashboardOperadorEspeciales(): Observable<DashboardOperadorEspecialesData> {
    return of({
      asignacionesPendientes: 0,
      enProceso: 0,
      completadasSemana: 0,
      calificacionPromedio: 0,
      sucursalesActivas: 0,
      chartColaPorPrioridad: {
        labels: ['Alta', 'Media', 'Normal'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#E11D48', '#F59E0B', '#9BCB3B']
        }]
      },
      chartCompletadosSemana: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
        datasets: [{
          label: 'Especiales',
          data: [0, 0, 0, 0, 0],
          backgroundColor: '#8B5CF6'
        }]
      }
    });
  }

  getDashboardExtras(): Observable<DashboardOperadorEspecialesData> {
    return this.getDashboardOperadorEspeciales();
  }

  /**
   * KPIs y tableros para Distribuidor / Bodega
   */
  getDashboardDistribuidor(): Observable<DashboardDistribuidorData> {
    return forkJoin([
      this.http.post<any[]>(apiUrl('/inventario/alertas/list'), {}).pipe(catchError(() => of([]))),
      this.http.post<any>(apiUrl('/analytics/consumo-quimicos'), {}).pipe(catchError(() => of([])))
    ]).pipe(
      map(([alertas, consumos]) => {
        const criticos = (alertas || []).filter((a: any) => (a.nivel || '').toUpperCase() === 'CRITICO').length;
        const labelsConsumo = Array.isArray(consumos) && consumos.length > 0
          ? consumos.slice(0, 5).map((c: any) => c.insumoNombre || 'Insumo')
          : [];
        const dataConsumo = Array.isArray(consumos) && consumos.length > 0
          ? consumos.slice(0, 5).map((c: any) => Number(c.totalConsumido || 0))
          : [];

        return {
          skusCriticos: criticos,
          pedidosPendientes: 0,
          entregasSemana: 0,
          chartConsumoInsumos: {
            labels: labelsConsumo,
            datasets: [{
              label: 'Consumo (Unidades/Litros)',
              data: dataConsumo,
              backgroundColor: '#004282'
            }]
          },
          chartStockEstado: {
            labels: ['Óptimo', 'Alerta', 'Crítico'],
            datasets: [{
              data: [0, 0, criticos],
              backgroundColor: ['#9BCB3B', '#F59E0B', '#E11D48']
            }]
          }
        };
      })
    );
  }

  /**
   * KPIs y tableros para Coordinador Comercial
   */
  getDashboardComercial(): Observable<DashboardComercialData> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), {}).pipe(
      map(data => ({
        serviciosMes: data?.totalLavadosMes ?? 0,
        tasaAprobacion: data?.tasaAprobacion ?? 0,
        especialesVendidos: data?.serviciosEspecialesCount ?? 0,
        chartMixServicios: {
          labels: ['Express', 'Completo', 'Cerámico', 'Pulido'],
          datasets: [{
            data: data?.mixServicios || [0, 0, 0, 0],
            backgroundColor: ['#004282', '#9BCB3B', '#8B5CF6', '#F59E0B']
          }]
        }
      })),
      catchError(() => of({
        serviciosMes: 0,
        tasaAprobacion: 0,
        especialesVendidos: 0,
        chartMixServicios: {
          labels: ['Express', 'Completo', 'Cerámico', 'Pulido'],
          datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#004282', '#9BCB3B', '#8B5CF6', '#F59E0B'] }]
        }
      }))
    );
  }

  /**
   * Resumen Ejecutivo para Gerencia / SuperAdmin
   */
  getResumenEjecutivo(): Observable<ResumenEjecutivoData> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), {}).pipe(
      map(data => {
        const total = data?.totalLavadosHoy ?? 0;
        const tiempoProm = data?.tiempoPromedioMinutos != null ? `${data.tiempoPromedioMinutos} min` : '0 min';

        return {
          kpis: [
            { label: 'Cumplimiento Operativo', value: data?.cumplimientoOperativo != null ? `${data.cumplimientoOperativo}%` : '0%', icon: 'shield-check', trend: '0%', trendPositive: true, variant: 'success' },
            { label: 'Eficiencia de Red', value: data?.eficienciaRed != null ? `${data.eficienciaRed}%` : '0%', icon: 'trending-up', trend: '0%', trendPositive: true, variant: 'primary' },
            { label: 'OTs Realizadas', value: String(total), icon: 'check-circle', trend: '0', trendPositive: true, variant: 'success' },
            { label: 'Tiempo Promedio', value: tiempoProm, icon: 'clock', trend: '0', trendPositive: true, variant: 'warning' }
          ],
          tendencia: {
            labels: data?.tendencia?.labels || ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
            datasets: data?.tendencia?.datasets || [
              {
                label: 'OTs Ejecutadas',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#004282',
                backgroundColor: 'rgba(0, 66, 130, 0.1)',
                fill: true
              },
              {
                label: 'Meta Programada',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#9BCB3B',
                borderDash: [5, 5],
                backgroundColor: 'transparent',
                fill: false
              }
            ]
          },
          sugerencias: data?.sugerencias || []
        };
      }),
      catchError(() => of({
        kpis: [
          { label: 'Cumplimiento Operativo', value: '0%', icon: 'shield-check', trend: '0%', trendPositive: true, variant: 'success' },
          { label: 'Eficiencia de Red', value: '0%', icon: 'trending-up', trend: '0%', trendPositive: true, variant: 'primary' },
          { label: 'OTs Realizadas', value: '0', icon: 'check-circle', trend: '0', trendPositive: true, variant: 'success' },
          { label: 'Tiempo Promedio', value: '0 min', icon: 'clock', trend: '0', trendPositive: true, variant: 'warning' }
        ],
        tendencia: {
          labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
          datasets: [
            { label: 'OTs', data: [0, 0, 0, 0, 0, 0], borderColor: '#004282', fill: true },
            { label: 'Meta', data: [0, 0, 0, 0, 0, 0], borderColor: '#9BCB3B', borderDash: [5, 5], fill: false }
          ]
        },
        sugerencias: []
      }))
    );
  }
}

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MOCK_PRODUCCION } from '../mocks/produccion.mock';
import { MOCK_DASHBOARD_OPERADORES } from '../mocks/dashboard-operadores.mock';
import { MOCK_SERVICIOS_DATA } from '../mocks/servicios-data.mock';
import { MOCK_MAQUINARIA } from '../mocks/maquinaria.mock';
import { MOCK_ALERTAS } from '../mocks/alertas.mock';
import {
  MOCK_DASHBOARD_TECNICO,
  MOCK_DASHBOARD_OPERADOR,
  MOCK_DASHBOARD_OPERADOR_ESPECIALES,
  MOCK_DASHBOARD_DISTRIBUIDOR,
  MOCK_DASHBOARD_COMERCIAL
} from '../mocks/dashboard-roles.mock';

const MOCK_RESUMEN_EJECUTIVO = {
  kpis: [
    { label: 'Ingresos', value: '$4,200', icon: 'dollar-sign', trend: '+12%', trendPositive: true, variant: 'success' },
    { label: 'Eficiencia', value: '87%', icon: 'trending-up', trend: '+5%', trendPositive: true, variant: 'primary' },
    { label: 'OTs Completadas', value: '42', icon: 'check-circle', trend: '+8', trendPositive: true, variant: 'success' },
    { label: 'Tiempo Prom.', value: '22 min', icon: 'clock', trend: '-4 min', trendPositive: true, variant: 'warning' }
  ],
  tendencia: {
    labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'],
    datasets: [
      {
        label: 'OTs',
        data: [5, 12, 18, 15, 22, 19],
        borderColor: '#004282',
        backgroundColor: 'rgba(0, 66, 130, 0.1)',
        fill: true
      },
      {
        label: 'Meta',
        data: [8, 14, 16, 16, 18, 18],
        borderColor: '#9BCB3B',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        fill: false
      }
    ]
  },
  sugerencias: [
    { texto: 'Abrir bahía 7 para reducir cola de espera', icono: 'plus-circle', prioridad: 'alta' },
    { texto: 'Reabastecer shampú en Quito Norte (stock bajo)', icono: 'package', prioridad: 'media' },
    { texto: 'Revisar equipo #3 - mantenimiento pendiente', icono: 'wrench', prioridad: 'media' },
    { texto: 'Considerar turno extra mañana (demanda estimada +20%)', icono: 'calendar', prioridad: 'baja' }
  ]
};

@Injectable({
  providedIn: 'root'
})
export class DashboardOperativoService {

  getProduccion(): Observable<any> {
    return of(MOCK_PRODUCCION).pipe(delay(200));
  }

  getOperadores(): Observable<any> {
    return of(MOCK_DASHBOARD_OPERADORES).pipe(delay(150));
  }

  getServiciosData(): Observable<any> {
    return of(MOCK_SERVICIOS_DATA).pipe(delay(180));
  }

  getMaquinaria(): Observable<any> {
    return of(MOCK_MAQUINARIA).pipe(delay(100));
  }

  getAlertas(): Observable<any[]> {
    return of(MOCK_ALERTAS).pipe(delay(250));
  }

  getDashboardTecnico(): Observable<typeof MOCK_DASHBOARD_TECNICO> {
    return of(MOCK_DASHBOARD_TECNICO).pipe(delay(180));
  }

  getDashboardOperador(): Observable<typeof MOCK_DASHBOARD_OPERADOR> {
    return of(MOCK_DASHBOARD_OPERADOR).pipe(delay(180));
  }

  getDashboardOperadorEspeciales(): Observable<typeof MOCK_DASHBOARD_OPERADOR_ESPECIALES> {
    return of(MOCK_DASHBOARD_OPERADOR_ESPECIALES).pipe(delay(180));
  }

  /** @deprecated usar getDashboardOperadorEspeciales */
  getDashboardExtras(): Observable<typeof MOCK_DASHBOARD_OPERADOR_ESPECIALES> {
    return this.getDashboardOperadorEspeciales();
  }

  getDashboardDistribuidor(): Observable<typeof MOCK_DASHBOARD_DISTRIBUIDOR> {
    return of(MOCK_DASHBOARD_DISTRIBUIDOR).pipe(delay(180));
  }

  getDashboardComercial(): Observable<typeof MOCK_DASHBOARD_COMERCIAL> {
    return of(MOCK_DASHBOARD_COMERCIAL).pipe(delay(180));
  }

  getResumenEjecutivo(): Observable<typeof MOCK_RESUMEN_EJECUTIVO> {
    return of(MOCK_RESUMEN_EJECUTIVO).pipe(delay(120));
  }
}

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
}

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MOCK_PRODUCCION } from './data/produccion.mock';
import { MOCK_DASHBOARD_OPERADORES } from './data/dashboard-operadores.mock';
import { MOCK_SERVICIOS_DATA } from './data/servicios-data.mock';
import { MOCK_MAQUINARIA } from './data/maquinaria.mock';
import { MOCK_ALERTAS } from './data/alertas.mock';

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

}

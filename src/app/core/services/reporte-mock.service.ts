import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Reporte } from '../models';
import { MOCK_REPORTES } from '../mocks/data.mock';

@Injectable({
  providedIn: 'root'
})
export class ReporteMockService {
  private reportesSubject = new BehaviorSubject<Reporte[]>(MOCK_REPORTES);
  public reportes$ = this.reportesSubject.asObservable();

  getReportes(): Observable<Reporte[]> {
    return this.reportes$.pipe(delay(300));
  }

  generarReporte(tipo: Reporte['tipo'], agencia: string): Observable<Reporte> {
    const current = this.reportesSubject.value;
    const nuevo: Reporte = {
      id: Math.max(...current.map(r => r.id), 0) + 1,
      titulo: `Reporte de ${tipo} - ${agencia}`,
      tipo,
      agencia,
      fechaGeneracion: new Date().toISOString().split('T')[0],
      totalServicios: Math.floor(Math.random() * 200) + 50,
      ingresosTotales: Math.floor(Math.random() * 8000) + 2000,
      eficienciaGeneral: parseFloat((90 + Math.random() * 8).toFixed(1))
    };
    this.reportesSubject.next([nuevo, ...current]);
    return of(nuevo).pipe(delay(500));
  }
}

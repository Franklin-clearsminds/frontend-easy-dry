import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Reporte } from '../models';
import { apiUrl } from '../config/env';

/**
 * Los reportes se arman con el total de lavados del día que calcula el servidor (POST /analytics/dashboard -> kpis).
 * El servidor no calcula un porcentaje de eficiencia, por eso `eficienciaGeneral` queda en null y no se muestra.
 */
@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private http = inject(HttpClient);
  private reportesSubject = new BehaviorSubject<Reporte[]>([]);
  public reportes$ = this.reportesSubject.asObservable();

  private totalDelServidor(res: any): number | null {
    const total = res?.kpis?.totalLavadosHoy;
    return total == null ? null : Number(total);
  }

  getReportes(): Observable<Reporte[]> {
    if (this.reportesSubject.value.length > 0) {
      return of(this.reportesSubject.value);
    }

    return this.http.post<any>(apiUrl('/analytics/dashboard'), {}).pipe(
      map(res => {
        const inicial: Reporte = {
          id: 1,
          titulo: 'Reporte de Operaciones y Servicios - Red Nacional',
          tipo: 'Diario',
          agencia: 'Todas las Agencias',
          fechaGeneracion: new Date().toISOString().split('T')[0],
          totalServicios: this.totalDelServidor(res),
          eficienciaGeneral: null
        };
        return [inicial];
      }),
      tap(items => this.reportesSubject.next(items)),
      catchError(() => of(this.reportesSubject.value))
    );
  }

  /** Si el servidor rechaza la consulta, el error se propaga para que la pantalla lo muestre (no se genera un reporte con cifras inventadas). */
  generarReporte(tipo: Reporte['tipo'], agencia: string): Observable<Reporte> {
    return this.http.post<any>(apiUrl('/analytics/dashboard'), { agenciaId: agencia !== 'Todas' ? agencia : undefined }).pipe(
      map(res => {
        const current = this.reportesSubject.value;
        const nextId = Math.max(...current.map(r => r.id), 0) + 1;
        const nuevo: Reporte = {
          id: nextId,
          titulo: `Reporte de ${tipo} - ${agencia}`,
          tipo,
          agencia,
          fechaGeneracion: new Date().toISOString().split('T')[0],
          totalServicios: this.totalDelServidor(res),
          eficienciaGeneral: null
        };
        return nuevo;
      }),
      tap(nuevo => {
        this.reportesSubject.next([nuevo, ...this.reportesSubject.value]);
      })
    );
  }
}

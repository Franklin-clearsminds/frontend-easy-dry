import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { VehiculoServicio } from '../models';
import { MOCK_SERVICIOS } from '../mocks/data.mock';

@Injectable({
  providedIn: 'root'
})
export class ServicioLavadoMockService {
  private serviciosSubject = new BehaviorSubject<VehiculoServicio[]>(MOCK_SERVICIOS);
  public servicios$ = this.serviciosSubject.asObservable();

  getServicios(): Observable<VehiculoServicio[]> {
    return this.servicios$;
  }

  getServiciosPorSucursal(sucursal: string): Observable<VehiculoServicio[]> {
    return this.servicios$.pipe(
      map(list => list.filter(s => s.agencia.toLowerCase() === sucursal.toLowerCase())),
      delay(150)
    );
  }

  getServiciosDelDia(fecha?: string): Observable<VehiculoServicio[]> {
    const targetFecha = fecha || '2026-07-22';
    return this.servicios$.pipe(
      map(list => list.filter(s => s.fecha.startsWith(targetFecha))),
      delay(150)
    );
  }

  crearRegistroHojaServicio(nuevo: Omit<VehiculoServicio, 'id'>): Observable<VehiculoServicio> {
    const current = this.serviciosSubject.value;
    const registro: VehiculoServicio = {
      ...nuevo,
      id: Math.max(...current.map(s => s.id), 100) + 1,
      estado: 'EN PROCESO'
    };
    this.serviciosSubject.next([registro, ...current]);
    return of(registro).pipe(delay(300));
  }

  finalizarServicioOperador(id: number): Observable<VehiculoServicio | null> {
    const current = this.serviciosSubject.value;
    const target = current.find(s => s.id === id);
    if (target) {
      target.estado = 'FINALIZADO';
      this.serviciosSubject.next([...current]);
      return of(target).pipe(delay(200));
    }
    return of(null);
  }

  aprobarServicioGerente(id: number, observacion?: string, gerenteNombre?: string): Observable<VehiculoServicio | null> {
    const current = this.serviciosSubject.value;
    const target = current.find(s => s.id === id);
    if (target) {
      target.estado = 'APROBADO';
      target.observacionGerente = observacion || 'Aprobado sin observaciones.';
      target.aprobadoPor = gerenteNombre || 'Carlos Mendoza (Gerente)';
      target.fechaAprobacion = new Date().toISOString().replace('T', ' ').substring(0, 16);
      this.serviciosSubject.next([...current]);
      return of(target).pipe(delay(200));
    }
    return of(null);
  }

  rechazarServicioGerente(id: number, motivo: string, gerenteNombre?: string): Observable<VehiculoServicio | null> {
    const current = this.serviciosSubject.value;
    const target = current.find(s => s.id === id);
    if (target) {
      target.estado = 'RECHAZADO';
      target.observacionGerente = `RECHAZADO: ${motivo}`;
      target.aprobadoPor = gerenteNombre || 'Carlos Mendoza (Gerente)';
      this.serviciosSubject.next([...current]);
      return of(target).pipe(delay(200));
    }
    return of(null);
  }

  aprobarTodosLosServiciosDelDia(sucursal: string, gerenteNombre?: string): Observable<boolean> {
    const current = this.serviciosSubject.value;
    let count = 0;
    current.forEach(s => {
      const matchSucursal = !sucursal || sucursal.toLowerCase().includes('toda') || s.agencia.toLowerCase() === sucursal.toLowerCase();
      if (matchSucursal && (s.estado === 'FINALIZADO' || s.estado === 'EN PROCESO')) {
        s.estado = 'APROBADO';
        s.observacionGerente = 'Aprobación masiva de cierre de día.';
        s.aprobadoPor = gerenteNombre || 'Carlos Mendoza (Gerente)';
        s.fechaAprobacion = new Date().toISOString().replace('T', ' ').substring(0, 16);
        count++;
      }
    });
    this.serviciosSubject.next([...current]);
    return of(count > 0).pipe(delay(300));
  }
}

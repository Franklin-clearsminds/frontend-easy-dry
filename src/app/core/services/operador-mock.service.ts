import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Operador, HistorialAsignacionOperador } from '../models';

@Injectable({
  providedIn: 'root'
})
export class OperadorMockService {
  private operadoresSubject = new BehaviorSubject<Operador[]>([]);
  public operadores$ = this.operadoresSubject.asObservable();

  private historialSubject = new BehaviorSubject<HistorialAsignacionOperador[]>([]);
  public historial$ = this.historialSubject.asObservable();

  getOperadores(): Observable<Operador[]> {
    return this.operadores$.pipe(delay(100));
  }

  getOperadorById(id: number): Observable<Operador | undefined> {
    return this.operadores$.pipe(
      map(list => list.find(o => o.id === id)),
      delay(100)
    );
  }

  getHistorialPorOperador(operadorId: number): Observable<HistorialAsignacionOperador[]> {
    return this.historial$.pipe(
      map(list => list.filter(h => h.operadorId === operadorId)),
      delay(100)
    );
  }

  reasignarOperador(operadorId: number, nuevaSucursal: string, nuevaBahia: string, motivo: string, usuarioAccion: string): Observable<Operador | null> {
    const currentOperadores = this.operadoresSubject.value;
    const op = currentOperadores.find(o => o.id === operadorId);
    
    if (op) {
      const hoy = new Date().toISOString().split('T')[0];

      // Close previous assignment in history
      const currentHistorial = this.historialSubject.value;
      const activeHist = currentHistorial.find(h => h.operadorId === operadorId && !h.fechaFin);
      if (activeHist) {
        activeHist.fechaFin = hoy;
      }

      // Add new assignment record
      const nuevoHist: HistorialAsignacionOperador = {
        id: Math.max(...currentHistorial.map(h => h.id), 0) + 1,
        operadorId: op.id,
        operadorNombre: op.nombre,
        fechaInicio: hoy,
        sucursal: nuevaSucursal,
        bahia: nuevaBahia,
        realizadoPor: usuarioAccion,
        motivo
      };
      this.historialSubject.next([nuevoHist, ...currentHistorial]);

      // Update operator state
      op.sucursal = nuevaSucursal;
      op.bahia = nuevaBahia;
      op.fechaAsignacion = hoy;
      this.operadoresSubject.next([...currentOperadores]);

      return of(op).pipe(delay(150));
    }

    return of(null);
  }

  actualizarOperador(op: Operador): Observable<Operador> {
    const current = this.operadoresSubject.value;
    const idx = current.findIndex(o => o.id === op.id);
    if (idx !== -1) {
      current[idx] = { ...op };
      this.operadoresSubject.next([...current]);
    }
    return of(op).pipe(delay(150));
  }
}

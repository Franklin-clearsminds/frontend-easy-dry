import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Operador, HistorialAsignacionOperador } from '../../domain';
import { MOCK_OPERADORES } from './data/operadores.mock';
import { MOCK_HISTORIAL_ASIGNACIONES_OPERADOR } from './data/movimientos-maquinaria.mock';

@Injectable({
  providedIn: 'root'
})
export class OperadorMockService {
  private operadoresSubject = new BehaviorSubject<Operador[]>(MOCK_OPERADORES);
  public operadores$ = this.operadoresSubject.asObservable();

  private historialSubject = new BehaviorSubject<HistorialAsignacionOperador[]>(MOCK_HISTORIAL_ASIGNACIONES_OPERADOR);
  public historial$ = this.historialSubject.asObservable();

  getOperadores(): Observable<Operador[]> {
    return this.operadores$.pipe(delay(200));
  }

  getOperadorById(id: number): Observable<Operador | undefined> {
    return this.operadores$.pipe(
      map(list => list.find(o => o.id === id)),
      delay(150)
    );
  }

  getHistorialPorOperador(operadorId: number): Observable<HistorialAsignacionOperador[]> {
    return this.historial$.pipe(
      map(list => list.filter(h => h.operadorId === operadorId)),
      delay(150)
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

      return of(op).pipe(delay(300));
    }

    return of(null);
  }
}

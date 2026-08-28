import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Incidente } from '../../domain';
import { MOCK_INCIDENTES } from './data/data.mock';

@Injectable({
  providedIn: 'root'
})
export class IncidenteMockService {
  private incidentesSubject = new BehaviorSubject<Incidente[]>(MOCK_INCIDENTES);
  public incidentes$ = this.incidentesSubject.asObservable();

  getIncidentes(): Observable<Incidente[]> {
    return this.incidentes$.pipe(delay(300));
  }

  crearIncidente(inc: Omit<Incidente, 'id'>): Observable<Incidente> {
    const current = this.incidentesSubject.value;
    const nextId = Math.max(...current.map(i => i.id), 0) + 1;
    const nuevo: Incidente = {
      ...inc,
      id: nextId,
      codigoIncidente: inc.codigoIncidente || `INC-2026-${String(nextId).padStart(3, '0')}`
    };
    this.incidentesSubject.next([nuevo, ...current]);
    return of(nuevo).pipe(delay(400));
  }

  registrarIncidente(inc: Omit<Incidente, 'id' | 'codigoIncidente'>): Observable<Incidente> {
    return this.crearIncidente(inc as any);
  }

  actualizarEstado(id: number, nuevoEstado: Incidente['estado']): Observable<Incidente | null> {
    const current = this.incidentesSubject.value;
    const item = current.find(i => i.id === id);
    if (item) {
      item.estado = nuevoEstado;
      this.incidentesSubject.next([...current]);
      return of(item).pipe(delay(300));
    }
    return of(null);
  }
}

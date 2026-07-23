import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Agencia } from '../models';
import { MOCK_AGENCIAS } from '../mocks/data.mock';

@Injectable({
  providedIn: 'root'
})
export class AgenciaMockService {
  private agenciasSubject = new BehaviorSubject<Agencia[]>(MOCK_AGENCIAS);
  public agencias$ = this.agenciasSubject.asObservable();

  getAgencias(): Observable<Agencia[]> {
    return this.agencias$.pipe(delay(300));
  }

  getAgenciaById(id: number): Observable<Agencia | undefined> {
    return this.agencias$.pipe(
      map(list => list.find(a => a.id === id)),
      delay(200)
    );
  }

  crearAgencia(agencia: Omit<Agencia, 'id'>): Observable<Agencia> {
    const current = this.agenciasSubject.value;
    const newAgencia: Agencia = {
      ...agencia,
      id: Math.max(...current.map(a => a.id), 0) + 1
    };
    this.agenciasSubject.next([...current, newAgencia]);
    return of(newAgencia).pipe(delay(400));
  }

  actualizarAgencia(agencia: Agencia): Observable<Agencia> {
    const current = this.agenciasSubject.value;
    const index = current.findIndex(a => a.id === agencia.id);
    if (index !== -1) {
      current[index] = { ...agencia };
      this.agenciasSubject.next([...current]);
    }
    return of(agencia).pipe(delay(300));
  }
}

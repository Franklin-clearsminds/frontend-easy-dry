import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Maquinaria } from '../models';
import { MOCK_MAQUINARIA } from '../mocks/data.mock';

@Injectable({
  providedIn: 'root'
})
export class MaquinariaMockService {
  private maquinariaSubject = new BehaviorSubject<Maquinaria[]>(MOCK_MAQUINARIA);
  public maquinaria$ = this.maquinariaSubject.asObservable();

  getMaquinaria(): Observable<Maquinaria[]> {
    return this.maquinaria$;
  }

  actualizarEstadoMaquina(id: number, estado: Maquinaria['estado']): Observable<Maquinaria | null> {
    const current = this.maquinariaSubject.value;
    const item = current.find(m => m.id === id);
    if (item) {
      item.estado = estado;
      this.maquinariaSubject.next([...current]);
      return of(item).pipe(delay(300));
    }
    return of(null);
  }

  crearMaquinaria(maquina: Omit<Maquinaria, 'id'>): Observable<Maquinaria> {
    const current = this.maquinariaSubject.value;
    const nueva: Maquinaria = {
      ...maquina,
      id: Math.max(...current.map(m => m.id), 0) + 1
    };
    this.maquinariaSubject.next([...current, nueva]);
    return of(nueva).pipe(delay(400));
  }

  asignarMaquinaria(maquinaId: number, sucursalNombre: string, bahiaNombre: string): Observable<Maquinaria | null> {
    const current = this.maquinariaSubject.value;
    const item = current.find(m => m.id === maquinaId);
    if (item) {
      item.agencia = sucursalNombre;
      item.bahia = bahiaNombre;
      this.maquinariaSubject.next([...current]);
      return of(item).pipe(delay(200));
    }
    return of(null);
  }
}

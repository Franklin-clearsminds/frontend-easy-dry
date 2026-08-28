import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Bahia } from '../../domain';
import { MOCK_BAHIAS } from './data/bahias.mock';

@Injectable({
  providedIn: 'root'
})
export class BahiaMockService {
  private bahiasSubject = new BehaviorSubject<Bahia[]>(MOCK_BAHIAS);
  public bahias$ = this.bahiasSubject.asObservable();

  getBahias(): Observable<Bahia[]> {
    return this.bahias$.pipe(delay(200));
  }

  getBahiasPorSucursal(sucursalId: number): Observable<Bahia[]> {
    return this.bahias$.pipe(
      map(list => list.filter(b => b.sucursalId === sucursalId)),
      delay(150)
    );
  }

  actualizarEstadoBahia(id: number, nuevoEstado: Bahia['estado']): Observable<Bahia | null> {
    const current = this.bahiasSubject.value;
    const item = current.find(b => b.id === id);
    if (item) {
      item.estado = nuevoEstado;
      this.bahiasSubject.next([...current]);
      return of(item).pipe(delay(200));
    }
    return of(null);
  }

  asignarOperadorABahia(bahiaId: number, operadorNombre: string, operadorId?: number): Observable<Bahia | null> {
    const current = this.bahiasSubject.value;
    
    // Clear previous bay of this operator
    current.forEach(b => {
      if (b.operadorAsignado === operadorNombre) {
        b.operadorAsignado = 'Sin Asignar';
        b.operadorId = undefined;
        if (b.estado === 'Ocupada') {
          b.estado = 'Disponible';
        }
      }
    });

    const target = current.find(b => b.id === bahiaId);
    if (target) {
      target.operadorAsignado = operadorNombre;
      target.operadorId = operadorId;
      target.estado = 'Ocupada';
      this.bahiasSubject.next([...current]);
      return of(target).pipe(delay(300));
    }
    return of(null);
  }

  sincronizarBahias(sucursalId: number, sucursalNombre: string, nuevaCantidad: number): void {
    const current = this.bahiasSubject.value;
    const bahiasSucursal = current.filter(b => b.sucursalId === sucursalId);
    
    if (bahiasSucursal.length === nuevaCantidad) {
      return; // Nada que hacer
    }

    if (nuevaCantidad > bahiasSucursal.length) {
      // Agregar nuevas bahías
      const dif = nuevaCantidad - bahiasSucursal.length;
      let nextId = Math.max(...current.map(b => b.id), 0) + 1;
      let maxNum = 0;
      bahiasSucursal.forEach(b => {
        const num = parseInt(b.nombre.replace('Bahía ', ''));
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });

      const nuevasBahias: Bahia[] = [];
      for (let i = 1; i <= dif; i++) {
        const num = maxNum + i;
        nuevasBahias.push({
          id: nextId++,
          codigo: `B${sucursalId.toString().padStart(2, '0')}-${num.toString().padStart(2, '0')}`,
          nombre: `Bahía ${num}`,
          sucursalId,
          sucursalNombre,
          estado: 'Disponible',
          operadorAsignado: 'Sin Asignar',
          maquinariaAsignada: []
        });
      }
      this.bahiasSubject.next([...current, ...nuevasBahias]);
    } else {
      // Eliminar bahías sobrantes (se quitarán las últimas creadas)
      const dif = bahiasSucursal.length - nuevaCantidad;
      const idsToRemove = bahiasSucursal.slice(-dif).map(b => b.id);
      const filtered = current.filter(b => !idsToRemove.includes(b.id));
      this.bahiasSubject.next(filtered);
    }
  }
}

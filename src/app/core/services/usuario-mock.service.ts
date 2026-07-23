import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Usuario } from '../models';
import { MOCK_USUARIOS } from '../mocks/data.mock';

@Injectable({
  providedIn: 'root'
})
export class UsuarioMockService {
  private usuariosSubject = new BehaviorSubject<Usuario[]>(MOCK_USUARIOS);
  public usuarios$ = this.usuariosSubject.asObservable();

  getUsuarios(): Observable<Usuario[]> {
    return this.usuarios$.pipe(delay(300));
  }

  crearUsuario(usr: Omit<Usuario, 'id'>): Observable<Usuario> {
    const current = this.usuariosSubject.value;
    const nuevo: Usuario = {
      ...usr,
      id: Math.max(...current.map(u => u.id), 0) + 1
    };
    this.usuariosSubject.next([...current, nuevo]);
    return of(nuevo).pipe(delay(400));
  }

  actualizarUsuario(usr: Usuario): Observable<Usuario> {
    const current = this.usuariosSubject.value;
    const idx = current.findIndex(u => u.id === usr.id);
    if (idx !== -1) {
      current[idx] = { ...usr };
      this.usuariosSubject.next([...current]);
    }
    return of(usr).pipe(delay(300));
  }
}

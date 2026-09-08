import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Usuario } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class UsuarioMockService {
  private http = inject(HttpClient);
  private usuariosSubject = new BehaviorSubject<Usuario[]>([]);
  public usuarios$ = this.usuariosSubject.asObservable();

  private mapBackendUsuario(u: any): Usuario {
    return {
      id: u.id,
      nombre: u.name || '',
      apellido: u.lastname || '',
      email: u.email || '',
      rol: u.role?.namerol || 'ADMIN',
      rolNombre: u.role?.namerol || 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      estado: u.estado === 1 ? 'Activo' : 'Inactivo',
      agencia: u.agencia?.nombre || '',
      sucursal: u.agencia?.nombre || 'EasyDry',
      region: u.region?.nombre || ''
    };
  }

  getUsuarios(soloActivos?: boolean): Observable<Usuario[]> {
    const payload = soloActivos ? { estado: 1 } : {};
    return this.http.post<any[]>(apiUrl('/agencias/usuarios/list'), payload).pipe(
      map(items => (items || []).map(u => this.mapBackendUsuario(u))),
      tap(mapped => {
        if (!soloActivos) {
          this.usuariosSubject.next(mapped);
        }
      }),
      catchError(() => of(this.usuariosSubject.value))
    );
  }

  crearUsuario(usr: Omit<Usuario, 'id'>): Observable<Usuario> {
    const current = this.usuariosSubject.value;
    const nuevo: Usuario = {
      ...usr,
      id: 'usr-' + Date.now().toString().slice(-4)
    };
    this.usuariosSubject.next([...current, nuevo]);
    return of(nuevo);
  }

  actualizarUsuario(usr: Usuario): Observable<Usuario> {
    const payload = {
      id: String(usr.id),
      name: usr.nombre,
      lastname: usr.apellido,
      email: usr.email,
      estado: usr.estado === 'Activo' ? 1 : 0,
      rolNombre: usr.rol
    };

    return this.http.post<any>(apiUrl('/agencias/usuarios/update'), payload).pipe(
      map(res => {
        const u = res?.user ? this.mapBackendUsuario(res.user) : usr;
        const current = this.usuariosSubject.value;
        const idx = current.findIndex(item => String(item.id) === String(usr.id));
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...u, estado: usr.estado };
          this.usuariosSubject.next([...current]);
        }
        return u;
      }),
      catchError(() => {
        const current = this.usuariosSubject.value;
        const idx = current.findIndex(u => String(u.id) === String(usr.id));
        if (idx !== -1) {
          current[idx] = { ...usr };
          this.usuariosSubject.next([...current]);
        }
        return of(usr);
      })
    );
  }

  toggleEstado(usuarioId: string | number, nuevoEstado?: 'Activo' | 'Inactivo'): Observable<any> {
    const estadoNum = nuevoEstado !== undefined ? (nuevoEstado === 'Activo' ? 1 : 0) : undefined;
    return this.http.post<any>(apiUrl('/agencias/usuarios/toggle-estado'), {
      usuarioId: String(usuarioId),
      ...(estadoNum !== undefined && { estado: estadoNum })
    }).pipe(
      tap(res => {
        const estadoFinal = res?.user?.estado === 1 ? 'Activo' : 'Inactivo';
        const current = this.usuariosSubject.value;
        const idx = current.findIndex(u => String(u.id) === String(usuarioId));
        if (idx !== -1) {
          current[idx] = { ...current[idx], estado: estadoFinal };
          this.usuariosSubject.next([...current]);
        }
      }),
      catchError(() => {
        const current = this.usuariosSubject.value;
        const idx = current.findIndex(u => String(u.id) === String(usuarioId));
        if (idx !== -1) {
          const currentEstado = current[idx].estado;
          const target = nuevoEstado || (currentEstado === 'Activo' ? 'Inactivo' : 'Activo');
          current[idx] = { ...current[idx], estado: target };
          this.usuariosSubject.next([...current]);
        }
        return of(null);
      })
    );
  }
}


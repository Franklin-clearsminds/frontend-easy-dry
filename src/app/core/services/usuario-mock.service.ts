import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Usuario, Role } from '../models';
import { apiUrl } from '../config/env';
import { DEMO_CREDENTIALS, registerDemoCredential } from './auth.service';

function resolveDemoRole(rol: string): Role {
  const norm = (rol || '').toUpperCase().replace(/\s+/g, '_');
  if (norm.includes('SUPER') && norm.includes('ADMIN')) return Role.SUPER_ADMIN;
  if (norm.includes('ADMIN')) return Role.ADMIN;
  if (norm.includes('SUPERVISOR')) return Role.SUPERVISOR;
  if (norm.includes('JEFE') && norm.includes('COMERCIAL')) return Role.JEFE_COMERCIAL;
  if (norm.includes('COORD') && norm.includes('COMERCIAL')) return Role.COORD_COMERCIAL;
  if (norm.includes('APROBADOR') || norm.includes('GERENTE')) return Role.APROBADOR;
  if (norm.includes('PULIDOR_FIJO')) return Role.PULIDOR_FIJO;
  if (norm.includes('PULIDOR_MOVIL')) return Role.PULIDOR_MOVIL;
  if (norm.includes('MANTENIMIENTO')) return Role.COORD_MANTENIMIENTO;
  if (norm.includes('TECNICO') || norm.includes('TÉCNICO')) return Role.TECNICO;
  if (norm.includes('ASISTENTE')) return Role.ASISTENTE_BODEGA;
  if (norm.includes('BODEGA')) return Role.COORD_BODEGA;
  if (norm.includes('LIDER') || norm.includes('LÍDER')) return Role.LIDER_OPERADOR;
  if (norm === 'OPERADOR') return Role.OPERADOR;
  return Role.LIDER_OPERADOR;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioMockService {
  private http = inject(HttpClient);
  private usuariosSubject = new BehaviorSubject<Usuario[]>([]);
  public usuarios$ = this.usuariosSubject.asObservable();

  private mapBackendUsuario(u: any): Usuario {
    let rolDisplay = u.role?.namerol || 'ADMIN';
    if (rolDisplay === 'APROBADOR' || rolDisplay === 'GERENTE') {
      rolDisplay = 'Gerente de Sucursal';
    } else if (rolDisplay === 'SUPER_ADMIN') {
      rolDisplay = 'Super Administrador';
    } else if (rolDisplay === 'SUPERVISOR') {
      rolDisplay = 'Supervisor Regional';
    } else if (rolDisplay === 'LIDER_OPERADOR' || rolDisplay === 'LIDER_AGENCIA') {
      rolDisplay = 'Líder Operador';
    } else if (rolDisplay === 'OPERADOR') {
      rolDisplay = 'Operador (Trazabilidad Bahía)';
    }

    return {
      id: u.id,
      nombre: u.name || '',
      apellido: u.lastname || '',
      email: u.email || '',
      rol: rolDisplay,
      rolNombre: rolDisplay,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      estado: u.estado === 1 ? 'Activo' : 'Inactivo',
      agencia: u.agencia?.nombre || 'Sin asignar',
      sucursal: u.agencia?.nombre || 'Sin asignar',
      region: u.region?.nombre || 'Sin asignar',
      agenciaId: u.agenciaId || u.agencia?.id,
      regionId: u.regionId || u.region?.id
    };
  }

  getUsuarios(soloActivos?: boolean): Observable<Usuario[]> {
    const payload = soloActivos ? { estado: 1 } : {};
    return this.http.post<any[]>(apiUrl('/agencias/usuarios/list'), payload).pipe(
      map(items => (items || []).map(u => this.mapBackendUsuario(u))),
      tap(mapped => {
        this.usuariosSubject.next(mapped);
      }),
      catchError(err => {
        console.warn('Error al cargar usuarios desde API:', err);
        return of(this.usuariosSubject.value);
      })
    );
  }

  crearUsuario(usr: Omit<Usuario, 'id'> & { password?: string }): Observable<Usuario> {
    const agenciaFinal = usr.agencia?.trim() && usr.agencia !== 'Sin asignar' ? usr.agencia : 'Sin asignar';
    const payload = {
      name: usr.nombre,
      lastname: usr.apellido,
      email: usr.email,
      password: usr.password || 'Admin123*',
      rolNombre: usr.rol,
      agencia: agenciaFinal !== 'Sin asignar' ? agenciaFinal : undefined,
      agenciaId: usr.agenciaId || undefined,
      modalidadPulidor: usr.modalidadPulidor,
      estado: usr.estado === 'Inactivo' ? 0 : 1
    };

    return this.http.post<any>(apiUrl('/agencias/usuarios/create'), payload).pipe(
      map(res => {
        const u = res?.user ? this.mapBackendUsuario(res.user) : {
          ...usr,
          id: 'usr-' + Date.now().toString().slice(-4),
          agencia: agenciaFinal,
          sucursal: agenciaFinal,
          region: usr.region || 'Sin asignar'
        };
        const current = this.usuariosSubject.value.filter(item =>
          String(item.id) !== String(u.id) && item.email.toLowerCase() !== u.email.toLowerCase()
        );
        this.usuariosSubject.next([u, ...current]);
        return u;
      }),
      catchError(err => {
        console.error('Error al crear usuario en backend:', err);
        const fallback: Usuario = {
          ...usr,
          agencia: agenciaFinal,
          sucursal: agenciaFinal,
          region: usr.region || 'Sin asignar',
          id: 'usr-' + Date.now().toString().slice(-4)
        };
        const current = this.usuariosSubject.value;
        this.usuariosSubject.next([fallback, ...current]);
        return of(fallback);
      })
    );
  }

  actualizarUsuario(usr: Usuario & { password?: string }): Observable<Usuario> {
    const payload: any = {
      id: String(usr.id),
      name: usr.nombre,
      lastname: usr.apellido,
      email: usr.email,
      estado: usr.estado === 'Activo' ? 1 : 0,
      rolNombre: usr.rol,
      agencia: usr.agencia === 'Sin asignar' ? null : usr.agencia,
      agenciaId: usr.agenciaId || null
    };

    if (usr.password && usr.password.trim().length >= 6) {
      payload.password = usr.password.trim();
      registerDemoCredential({
        nombre: `${usr.nombre} ${usr.apellido}`.trim(),
        email: usr.email,
        passwordPlain: usr.password.trim(),
        role: resolveDemoRole(usr.rol),
        rolNombre: usr.rol,
        sucursal: usr.agencia || 'Sin sucursal asignada',
        region: usr.region || 'Nacional',
        avatar: usr.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        modalidadPulidor: usr.modalidadPulidor
      });
    }

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

  eliminarUsuario(usuarioId: string | number): Observable<boolean> {
    return this.http.post<any>(apiUrl('/agencias/usuarios/delete'), { id: String(usuarioId) }).pipe(
      map(() => {
        const current = this.usuariosSubject.value;
        const filtered = current.filter(u => String(u.id) !== String(usuarioId));
        this.usuariosSubject.next(filtered);
        return true;
      })
    );
  }
}



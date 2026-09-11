import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
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
  if (norm.includes('PULIDOR')) return Role.PULIDOR_MOVIL;
  if (norm.includes('MANTENIMIENTO')) return Role.COORD_MANTENIMIENTO;
  if (norm.includes('TECNICO') || norm.includes('TÉCNICO')) return Role.TECNICO;
  if (norm.includes('ASISTENTE')) return Role.ASISTENTE_BODEGA;
  if (norm.includes('BODEGA') || norm.includes('INVENTARIO') || norm.includes('DISTRIBUIDOR') || norm.includes('GESTOR')) return Role.COORD_BODEGA;
  if (norm.includes('LIDER') || norm.includes('LÍDER')) return Role.LIDER_OPERADOR;
  if (norm === 'OPERADOR' || norm.includes('LAVADOR')) return Role.OPERADOR;
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
      rolDisplay = 'Aprobador';
    } else if (rolDisplay === 'SUPER_ADMIN') {
      rolDisplay = 'Super Administrador';
    } else if (rolDisplay === 'ADMIN') {
      rolDisplay = 'Administrador';
    } else if (rolDisplay === 'SUPERVISOR') {
      rolDisplay = 'Supervisor Regional';
    } else if (rolDisplay === 'COORD_BODEGA' || rolDisplay === 'DISTRIBUIDOR') {
      rolDisplay = 'Coordinador de Bodega';
    } else if (rolDisplay === 'ASISTENTE_BODEGA') {
      rolDisplay = 'Asistente de Bodega';
    } else if (rolDisplay === 'LIDER_OPERADOR' || rolDisplay === 'LIDER_AGENCIA' || rolDisplay === 'LIDER') {
      rolDisplay = 'Líder';
    } else if (rolDisplay === 'OPERADOR' || rolDisplay === 'LAVADOR') {
      rolDisplay = 'Operador (Trazabilidad Bahía)';
    } else if (rolDisplay === 'COORD_COMERCIAL') {
      rolDisplay = 'Coordinador Comercial';
    } else if (rolDisplay === 'JEFE_COMERCIAL') {
      rolDisplay = 'Jefe Comercial';
    } else if (rolDisplay === 'COORD_SERVICIOS_ESPECIALES') {
      rolDisplay = 'Coordinador de Servicios Especiales';
    } else if (rolDisplay === 'PULIDOR_FIJO') {
      rolDisplay = 'Pulidor Fijo';
    } else if (rolDisplay === 'PULIDOR_MOVIL') {
      rolDisplay = 'Pulidor Móvil';
    } else if (rolDisplay === 'COORD_MANTENIMIENTO') {
      rolDisplay = 'Coordinador de Mantenimiento';
    } else if (rolDisplay === 'TECNICO') {
      rolDisplay = 'Técnico de Maquinaria';
    }

    let agenciaDisplay = u.agencia?.nombre || 'Sin asignar';
    if (rolDisplay === 'Coordinador de Bodega') {
      agenciaDisplay = 'Bodega Central Nacional';
    } else if (rolDisplay === 'Asistente de Bodega' && (!u.agencia || u.agencia.nombre === 'Sin asignar')) {
      agenciaDisplay = u.region?.nombre ? `Bodega Regional ${u.region.nombre}` : 'Bodega Central Nacional';
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
      agencia: agenciaDisplay,
      sucursal: agenciaDisplay,
      region: u.region?.nombre || 'Sin asignar',
      agenciaId: u.agenciaId || u.agencia?.id,
      regionId: u.regionId || u.region?.id
    };
  }

  getUsuarios(soloActivos?: boolean, silent?: boolean): Observable<Usuario[]> {
    const payload = soloActivos ? { estado: 1 } : {};
    const opts = silent ? { headers: { 'x-silent': 'true' } } : {};
    return this.http.post<any[]>(apiUrl('/agencias/usuarios/list'), payload, opts).pipe(
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

  crearUsuario(usr: Omit<Usuario, 'id'> & { password?: string; roleId?: string; regionId?: string }): Observable<Usuario> {
    const agenciaFinal = usr.agencia?.trim() && usr.agencia !== 'Sin asignar' ? usr.agencia : 'Sin asignar';
    const payload: any = {
      name: usr.nombre,
      lastname: usr.apellido,
      email: usr.email,
      password: usr.password || 'Admin123*',
      rolNombre: usr.rol,
      roleId: usr.roleId || (usr as any).roleId || undefined,
      agencia: agenciaFinal !== 'Sin asignar' ? agenciaFinal : undefined,
      agenciaId: usr.agenciaId || undefined,
      regionId: usr.regionId || (usr as any).regionId || undefined,
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

  actualizarUsuario(usr: Usuario & { password?: string; roleId?: string; regionId?: string }): Observable<Usuario> {
    const payload: any = {
      id: String(usr.id),
      name: usr.nombre,
      lastname: usr.apellido,
      email: usr.email,
      estado: usr.estado === 'Activo' ? 1 : 0,
      rolNombre: usr.rol,
      roleId: usr.roleId || (usr as any).roleId || undefined,
      regionId: usr.regionId || (usr as any).regionId || undefined,
    };

    if (usr.agenciaId && usr.agencia !== 'Sin asignar') {
      payload.agenciaId = String(usr.agenciaId);
    }
    if (usr.agencia && usr.agencia !== 'Sin asignar') {
      payload.agencia = usr.agencia;
    }

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

    return this.http.post<any>(apiUrl('/agencias/usuarios/update'), payload, { headers: { 'x-silent': 'true' } }).pipe(
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
      catchError((err) => {
        return throwError(() => err);
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



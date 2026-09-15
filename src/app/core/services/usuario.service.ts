import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Usuario, ROLE_LABELS } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private usuariosSubject = new BehaviorSubject<Usuario[]>([]);
  public usuarios$ = this.usuariosSubject.asObservable();

  private mapBackendUsuario(u: any): Usuario {
    const rawRole = u.role?.namerol || 'ADMIN';
    let rolDisplay = ROLE_LABELS[rawRole] || rawRole;

    const isGlobal =
      rawRole === 'SUPER_ADMIN' ||
      rawRole === 'ADMIN' ||
      rawRole === 'COORD_BODEGA' ||
      rawRole === 'DISTRIBUIDOR';
    const isSupervisor = rawRole === 'SUPERVISOR';
    const isAsistente = rawRole === 'ASISTENTE_BODEGA';
    const isPulidor = rawRole === 'PULIDOR' || rawRole === 'PULIDOR_FIJO' || rawRole === 'PULIDOR_MOVIL';
    const hasAgencia = !!(u.agenciaId || u.agencia?.id || (u.agencia?.nombre && u.agencia.nombre !== 'Sin asignar'));
    const modalidadPulidor: 'FIJO' | 'MOVIL' | undefined = isPulidor
      ? (hasAgencia ? 'FIJO' : 'MOVIL')
      : undefined;

    let agenciaDisplay = u.agencia?.nombre || 'Sin asignar';
    if (isGlobal) {
      agenciaDisplay = 'Nacional (Acceso Global)';
    } else if (isSupervisor) {
      agenciaDisplay = u.region?.nombre ? `Región ${u.region.nombre}` : 'Sin Región Asignada';
    } else if (isAsistente) {
      agenciaDisplay = u.region?.nombre ? `Bodega Regional ${u.region.nombre}` : 'Bodega Regional (Sin Región)';
    } else if (isPulidor && modalidadPulidor === 'MOVIL') {
      agenciaDisplay = u.region?.nombre ? `Móvil · Región ${u.region.nombre}` : 'Red Nacional · Móvil';
    } else if (u.region?.nombre && (!u.agencia || u.agencia?.nombre === 'Sin asignar' || !u.agencia?.nombre)) {
      agenciaDisplay = `Región ${u.region.nombre}`;
    }

    return {
      id: u.id,
      nombre: u.name || '',
      apellido: u.lastname || '',
      email: u.email || '',
      rol: rolDisplay,
      rolNombre: rawRole,
      roleId: u.role?.id || u.roleId,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      estado: u.estado === 1 ? 'Activo' : 'Inactivo',
      agencia: agenciaDisplay,
      sucursal: agenciaDisplay,
      region: u.region?.nombre || (isGlobal ? 'Nacional' : undefined),
      agenciaId: (isGlobal || isSupervisor || isAsistente || (isPulidor && modalidadPulidor === 'MOVIL')) ? undefined : (u.agenciaId || u.agencia?.id),
      regionId: isGlobal ? undefined : (u.regionId || u.region?.id),
      modalidadPulidor
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
    const normRol = (usr.rol || '').toUpperCase();
    const isGlobal =
      (normRol.includes('SUPER') && normRol.includes('ADMIN')) ||
      normRol === 'ADMIN' ||
      normRol.includes('ADMINISTRADOR') ||
      normRol === 'COORD_BODEGA' ||
      normRol === 'DISTRIBUIDOR' ||
      (normRol.includes('GESTOR') && normRol.includes('INVENTARIO')) ||
      (normRol.includes('GESTOR') && normRol.includes('BODEGA'));
    const isSupervisor = normRol.includes('SUPERVISOR');
    const isAsistente = normRol === 'ASISTENTE_BODEGA' || (normRol.includes('ASISTENTE') && normRol.includes('BODEGA'));
    const isPulidor = normRol.includes('PULIDOR');
    const isPulidorMovil = isPulidor && (usr.modalidadPulidor === 'MOVIL' || !usr.agenciaId);

    const agenciaFinal = (!isGlobal && !isSupervisor && !isAsistente && !isPulidorMovil && usr.agencia?.trim() && usr.agencia !== 'Sin asignar') ? usr.agencia : 'Sin asignar';
    const payload: any = {
      name: usr.nombre,
      lastname: usr.apellido,
      email: usr.email,
      password: usr.password || 'Admin123*',
      rolNombre: usr.rol,
      roleId: usr.roleId || (usr as any).roleId || undefined,
      agencia: (isGlobal || isSupervisor || isAsistente || isPulidorMovil || agenciaFinal === 'Sin asignar') ? undefined : agenciaFinal,
      agenciaId: (isGlobal || isSupervisor || isAsistente || isPulidorMovil) ? undefined : (usr.agenciaId || undefined),
      regionId: isGlobal ? undefined : (usr.regionId || (usr as any).regionId || undefined),
      modalidadPulidor: isPulidor ? (isPulidorMovil ? 'MOVIL' : 'FIJO') : undefined,
      estado: usr.estado === 'Inactivo' ? 0 : 1
    };

    return this.http.post<any>(apiUrl('/agencias/usuarios/create'), payload).pipe(
      map(res => {
        const u = res?.user ? this.mapBackendUsuario(res.user) : {
          ...usr,
          id: 'usr-' + Date.now().toString().slice(-4),
          agencia: isGlobal ? 'Nacional (Acceso Global)' : (isSupervisor ? (usr.region ? `Región ${usr.region}` : 'Sin Región') : (isAsistente ? `Bodega Regional ${usr.region || 'Regional'}` : agenciaFinal)),
          sucursal: isGlobal ? 'Nacional (Acceso Global)' : (isSupervisor ? (usr.region ? `Región ${usr.region}` : 'Sin Región') : (isAsistente ? `Bodega Regional ${usr.region || 'Regional'}` : agenciaFinal)),
          region: isGlobal ? 'Nacional' : (usr.region || 'Sin asignar')
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
          agencia: isGlobal ? 'Nacional (Acceso Global)' : (isSupervisor ? (usr.region ? `Región ${usr.region}` : 'Sin Región') : (isAsistente ? `Bodega Regional ${usr.region || 'Regional'}` : agenciaFinal)),
          sucursal: isGlobal ? 'Nacional (Acceso Global)' : (isSupervisor ? (usr.region ? `Región ${usr.region}` : 'Sin Región') : (isAsistente ? `Bodega Regional ${usr.region || 'Regional'}` : agenciaFinal)),
          region: isGlobal ? 'Nacional' : (usr.region || 'Sin asignar'),
          id: 'usr-' + Date.now().toString().slice(-4)
        };
        const current = this.usuariosSubject.value;
        this.usuariosSubject.next([fallback, ...current]);
        return of(fallback);
      })
    );
  }

  actualizarUsuario(usr: Usuario & { password?: string; roleId?: string; regionId?: string }): Observable<Usuario> {
    const normRol = (usr.rol || '').toUpperCase();
    const isGlobal =
      (normRol.includes('SUPER') && normRol.includes('ADMIN')) ||
      normRol === 'ADMIN' ||
      normRol.includes('ADMINISTRADOR') ||
      normRol === 'COORD_BODEGA' ||
      normRol === 'DISTRIBUIDOR' ||
      (normRol.includes('GESTOR') && normRol.includes('INVENTARIO')) ||
      (normRol.includes('GESTOR') && normRol.includes('BODEGA'));
    const isSupervisor = normRol.includes('SUPERVISOR');
    const isAsistente = normRol === 'ASISTENTE_BODEGA' || (normRol.includes('ASISTENTE') && normRol.includes('BODEGA'));
    const isPulidor = normRol.includes('PULIDOR');
    const isPulidorMovil = isPulidor && (usr.modalidadPulidor === 'MOVIL' || !usr.agenciaId);

    const payload: any = {
      id: String(usr.id),
      name: usr.nombre,
      lastname: usr.apellido,
      email: usr.email,
      estado: usr.estado === 'Activo' ? 1 : 0,
      rolNombre: usr.rol,
      roleId: usr.roleId || (usr as any).roleId || undefined,
      regionId: isGlobal ? null : (usr.regionId || (usr as any).regionId || undefined),
      agenciaId: (isGlobal || isSupervisor || isAsistente || isPulidorMovil) ? null : (usr.agenciaId ? String(usr.agenciaId) : undefined),
      agencia: (isGlobal || isSupervisor || isAsistente || isPulidorMovil) ? '' : (usr.agencia !== 'Sin asignar' ? usr.agencia : undefined)
    };

    if (usr.password && usr.password.trim().length >= 6) {
      payload.password = usr.password.trim();
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



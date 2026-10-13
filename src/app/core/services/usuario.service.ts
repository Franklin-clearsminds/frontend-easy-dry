import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Usuario, ROLE_LABELS } from '../models';
import { apiUrl } from '../config/env';
import { PaginaServidor, normalizarPagina } from '../models/paginacion.model';
import { PAGE_SIZE_MAX, PAGE_SIZE_TABLA } from '../config/paginacion';

/** Lo que la pantalla de usuarios le pide al servidor (ids y códigos, no nombres para mostrar). */
export interface ConsultaUsuarios {
  page?: number;
  pageSize?: number;
  sortField?: string | null;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  /** Códigos de rol (namerol) separados por coma. */
  rolNombre?: string;
  agenciaId?: string;
  regionId?: string;
  clienteId?: string;
  /** 1 = activo, 0 = inactivo. */
  estado?: number;
  segmento?: 'todos' | 'lavadores' | 'supervisores' | 'bodega' | 'admins' | 'inactivos';
  incluirResumen?: boolean;
}

export interface ResumenUsuarios {
  total: number;
  lavadores: number;
  supervisores: number;
  bodega: number;
  admins: number;
  inactivos: number;
}

export interface RespuestaUsuariosPagina {
  pagina: PaginaServidor<Usuario>;
  resumen?: ResumenUsuarios;
}

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
      rawRole === 'COORD_BODEGA';
    const isSupervisor = rawRole === 'SUPERVISOR';
    const isAsistente = rawRole === 'ASISTENTE_BODEGA';
    const isPulidor = rawRole === 'PULIDOR';
    const hasAgencia = !!(u.agenciaId || u.agencia?.id || (u.agencia?.nombre && u.agencia.nombre !== 'Sin asignar'));
    const modalidadPulidor: 'FIJO' | 'MOVIL' | undefined = isPulidor
      ? (hasAgencia ? 'FIJO' : 'MOVIL')
      : undefined;
    const bodegaId = u.bodegaId || u.bodega?.id || undefined;
    const bodegaNombre = u.bodega?.nombre;

    let agenciaDisplay = u.agencia?.nombre || 'Sin asignar';
    if (isGlobal) {
      agenciaDisplay = 'Nacional (Acceso Global)';
    } else if (isSupervisor) {
      agenciaDisplay = u.region?.nombre ? `Región ${u.region.nombre}` : 'Sin Región Asignada';
    } else if (isAsistente) {
      agenciaDisplay = bodegaNombre
        || (u.region?.nombre ? `Bodega Regional ${u.region.nombre}` : 'Bodega Regional (Sin Bodega)');
    } else if (isPulidor && modalidadPulidor === 'MOVIL') {
      agenciaDisplay = u.region?.nombre ? `Móvil · Región ${u.region.nombre}` : 'Móvil · Sin región';
    } else if (u.region?.nombre && (!u.agencia || u.agencia?.nombre === 'Sin asignar' || !u.agencia?.nombre)) {
      agenciaDisplay = `Región ${u.region.nombre}`;
    }

    const rawDate = u.createdAt || u.fechaCreacion || u.fechaAsignacion;
    let fechaFormatted = '-';
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        fechaFormatted = d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    }

    return {
      id: u.id,
      nombre: u.name || '',
      apellido: u.lastname || '',
      email: u.email || '',
      rol: rolDisplay,
      rolNombre: rawRole,
      roleId: u.role?.id || u.roleId,
      avatar: u.avatarUrl || u.avatar || '',
      estado: u.estado === 1 ? 'Activo' : 'Inactivo',
      fechaAsignacion: fechaFormatted,
      agencia: agenciaDisplay,
      sucursal: agenciaDisplay,
      region: u.region?.nombre || (isGlobal ? 'Nacional' : undefined),
      agenciaId: (isGlobal || isSupervisor || isAsistente || (isPulidor && modalidadPulidor === 'MOVIL')) ? undefined : (u.agenciaId || u.agencia?.id),
      regionId: isGlobal ? undefined : (u.regionId || u.region?.id),
      bodegaId: isAsistente ? bodegaId : (bodegaId || undefined),
      modalidadPulidor,
      servicioIds: Array.isArray(u.servicioIds)
        ? u.servicioIds.map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0)
        : [],
    };
  }

  getUsuarios(soloActivos?: boolean, silent?: boolean): Observable<Usuario[]> {
    const payload = soloActivos ? { estado: 1 } : {};
    const opts = silent ? { headers: { 'x-silent': 'true' } } : {};
    return this.http.post<any[]>(apiUrl('/agencias/usuarios/list'), payload, opts).pipe(
      map(items =>
        (items || [])
          .map(u => this.mapBackendUsuario(u))
          .filter(u => (u.rolNombre || '').toUpperCase() !== 'SUPER_ADMIN')
      ),
      tap(mapped => {
        this.usuariosSubject.next(mapped);
      }),
      catchError(err => {
        console.warn('Error al cargar usuarios desde API:', err);
        return of(this.usuariosSubject.value);
      })
    );
  }

  /**
   * Una página de usuarios con orden, búsqueda y filtros resueltos en el servidor.
   * NO toca `usuariosSubject` (una página parcial no debe pisar la lista completa que usan otras pantallas)
   * y propaga los errores para que la pantalla muestre su estado de error.
   */
  getUsuariosPagina(consulta: ConsultaUsuarios): Observable<RespuestaUsuariosPagina> {
    const c = consulta;
    const body: Record<string, unknown> = {
      page: c.page || 1,
      pageSize: Math.min(c.pageSize || PAGE_SIZE_TABLA, PAGE_SIZE_MAX),
    };
    if (c.sortField) { body['sortField'] = c.sortField; body['sortOrder'] = c.sortOrder || 'desc'; }
    const texto = (c.search || '').trim();
    if (texto.length >= 2) body['search'] = texto;
    for (const k of ['rolNombre', 'agenciaId', 'regionId', 'clienteId'] as const) {
      const v = c[k];
      if (v !== undefined && v !== null && v !== '') body[k] = v;
    }
    if (c.estado === 0 || c.estado === 1) body['estado'] = c.estado;
    if (c.segmento && c.segmento !== 'todos') body['segmento'] = c.segmento;
    if (c.incluirResumen) body['incluirResumen'] = true;

    return this.http.post<any>(apiUrl('/agencias/usuarios/list'), body).pipe(
      map((res) => {
        const pagina = normalizarPagina<any>(res, body['page'] as number, body['pageSize'] as number);
        return {
          pagina: {
            ...pagina,
            items: pagina.items
              .map((u: any) => this.mapBackendUsuario(u))
              .filter((u: Usuario) => (u.rolNombre || '').toUpperCase() !== 'SUPER_ADMIN'),
          },
          resumen: res?.resumen as ResumenUsuarios | undefined,
        };
      }),
    );
  }

  crearUsuario(usr: Omit<Usuario, 'id'> & { password?: string; roleId?: string; regionId?: string; bodegaId?: string }): Observable<Usuario> {
    const normRol = (usr.rol || '').toUpperCase();
    const isGlobal =
      (normRol.includes('SUPER') && normRol.includes('ADMIN')) ||
      normRol === 'ADMIN' ||
      normRol.includes('ADMINISTRADOR') ||
      normRol === 'COORD_BODEGA' ||
      (normRol.includes('GESTOR') && normRol.includes('INVENTARIO')) ||
      (normRol.includes('GESTOR') && normRol.includes('BODEGA')) ||
      (normRol.includes('COORD') && normRol.includes('BODEGA') && !normRol.includes('ASISTENTE'));
    const isSupervisor = normRol.includes('SUPERVISOR');
    const isAsistente = normRol === 'ASISTENTE_BODEGA' || (normRol.includes('ASISTENTE') && normRol.includes('BODEGA'));
    const isPulidor = normRol.includes('PULIDOR');
    const isPulidorMovil = isPulidor && (usr.modalidadPulidor === 'MOVIL' || !usr.agenciaId);

    const agenciaFinal = (!isGlobal && !isSupervisor && !isAsistente && !isPulidorMovil && usr.agencia?.trim() && usr.agencia !== 'Sin asignar') ? usr.agencia : 'Sin asignar';
    const payload: any = {
      name: usr.nombre,
      lastname: usr.apellido,
      email: usr.email,
      password: usr.password,
      rolNombre: usr.rol,
      roleId: usr.roleId || (usr as any).roleId || undefined,
      agencia: (isGlobal || isSupervisor || isAsistente || isPulidorMovil || agenciaFinal === 'Sin asignar') ? undefined : agenciaFinal,
      agenciaId: (isGlobal || isSupervisor || isAsistente || isPulidorMovil) ? undefined : (usr.agenciaId || undefined),
      regionId: isGlobal ? undefined : (usr.regionId || (usr as any).regionId || undefined),
      bodegaId: isAsistente ? (usr.bodegaId || undefined) : (usr.bodegaId || undefined),
      modalidadPulidor: isPulidor ? (isPulidorMovil ? 'MOVIL' : 'FIJO') : undefined,
      servicioIds: isPulidorMovil
        ? (Array.isArray(usr.servicioIds) ? usr.servicioIds.map(Number).filter(n => !isNaN(n) && n > 0) : [])
        : undefined,
      estado: usr.estado === 'Inactivo' ? 0 : 1
    };

    if (!isAsistente && !usr.bodegaId) {
      delete payload.bodegaId;
    }

    return this.http.post<any>(apiUrl('/agencias/usuarios/create'), payload).pipe(
      map(res => {
        if (!res?.user) {
          throw new Error('El backend no devolvió el usuario creado.');
        }
        const u = this.mapBackendUsuario(res.user);
        const current = this.usuariosSubject.value.filter(item =>
          String(item.id) !== String(u.id) && item.email.toLowerCase() !== u.email.toLowerCase()
        );
        this.usuariosSubject.next([u, ...current]);
        return u;
      }),
      catchError(err => {
        console.error('Error al crear usuario en backend:', err);
        return throwError(() => err);
      })
    );
  }

  actualizarUsuario(usr: Usuario & { password?: string; roleId?: string; regionId?: string; bodegaId?: string }): Observable<Usuario> {
    const normRol = (usr.rol || '').toUpperCase();
    const isGlobal =
      (normRol.includes('SUPER') && normRol.includes('ADMIN')) ||
      normRol === 'ADMIN' ||
      normRol.includes('ADMINISTRADOR') ||
      normRol === 'COORD_BODEGA' ||
      (normRol.includes('GESTOR') && normRol.includes('INVENTARIO')) ||
      (normRol.includes('GESTOR') && normRol.includes('BODEGA')) ||
      (normRol.includes('COORD') && normRol.includes('BODEGA') && !normRol.includes('ASISTENTE'));
    const isSupervisor = normRol.includes('SUPERVISOR');
    const isAsistente = normRol === 'ASISTENTE_BODEGA' || (normRol.includes('ASISTENTE') && normRol.includes('BODEGA'));
    const isBackup = normRol === 'BACKUP';
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
      agenciaId: (isGlobal || isSupervisor || isAsistente || isPulidorMovil)
        ? null
        : (isBackup ? (usr.agenciaId ? String(usr.agenciaId) : null) : (usr.agenciaId ? String(usr.agenciaId) : undefined)),
      agencia: (isGlobal || isSupervisor || isAsistente || isPulidorMovil)
        ? ''
        : (isBackup ? (usr.agenciaId ? usr.agencia : '') : (usr.agencia !== 'Sin asignar' ? usr.agencia : undefined)),
      bodegaId: isAsistente ? (usr.bodegaId ? String(usr.bodegaId) : null) : (usr.bodegaId ? String(usr.bodegaId) : null),
      servicioIds: isPulidor
        ? (isPulidorMovil
          ? (Array.isArray(usr.servicioIds) ? usr.servicioIds.map(Number).filter(n => !isNaN(n) && n > 0) : [])
          : [])
        : undefined,
    };

    if (usr.password && usr.password.trim().length > 0) {
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

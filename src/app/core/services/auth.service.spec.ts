import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { RolService } from './rol.service';
import { MaquinariaService } from './maquinaria.service';
import { Role, UsuarioAuth } from '../models/roles.model';

function fichaLider(): UsuarioAuth {
  return {
    id: 'u1',
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@easydry.com',
    role: Role.LIDER_OPERADOR,
    rolNombre: 'Líder Operador',
    modulosPermitidos: ['maquinaria'],
    capacidades: ['maquinaria.ver'],
    ambito: 'AGENCIA',
    sucursal: 'EasyDry Norte',
    sucursalNombre: 'EasyDry Norte',
    region: 'Pichincha',
    agenciaId: 'ag-1',
    regionId: 'reg-1',
    bodegaId: undefined,
    modalidadPulidor: undefined,
    servicioIds: [7],
    estado: 'Activo',
    token: 'token-actual',
    refreshToken: 'refresh-actual',
    permisos: {} as never,
    avatar: '',
  };
}

describe('AuthService — sincronización de rol (refrescarPermisos)', () => {
  let httpPost: jasmine.Spy;
  let service: AuthService;
  let router: { url: string; navigate: jasmine.Spy };

  beforeEach(() => {
    // El constructor de AuthService lee localStorage real (getStoredUser()) y, si hay token, dispara
    // refrescarPermisos() de entrada — sin esto, lo que guarda un test (localStorage es del browser,
    // no se resetea solo entre specs) filtra al siguiente antes de que su propio spy esté configurado.
    localStorage.clear();
    httpPost = jasmine.createSpy('post');
    router = { url: '/maquinaria', navigate: jasmine.createSpy('navigate') };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: { post: httpPost } },
        { provide: Router, useValue: router },
        { provide: RolService, useValue: jasmine.createSpyObj('RolService', ['getRoles', 'getModulos']) },
        { provide: MaquinariaService, useValue: {} },
      ],
    });
    service = TestBed.inject(AuthService);
    // Simula una sesión ya cargada, sin pasar por el constructor (localStorage vacío en el test).
    (service as unknown as { currentUserSubject: { next: (u: UsuarioAuth) => void } }).currentUserSubject.next(fichaLider());
  });

  it('un cambio de rol (a uno distinto) se refleja tras refrescarPermisos, sin logout', () => {
    httpPost.and.returnValue(of({
      role: 'COORD_MANTENIMIENTO',
      rolNombre: 'Coordinador de Mantenimiento',
      name: 'Juan',
      lastname: 'Pérez',
      email: 'juan@easydry.com',
      capacidades: ['maquinaria.gestionar', 'mantenimientos.ver'],
      modulos: ['maquinaria', 'taller-tecnico'],
      ambito: 'REGION',
      agenciaId: null,
      agencia: null,
      regionId: 'reg-1',
      region: { id: 'reg-1', nombre: 'Pichincha' },
      regionNombre: 'Pichincha',
      bodegaId: null,
      estado: 1,
    }));

    service.refrescarPermisos();

    const actual = service.getCurrentUser();
    expect(actual?.role).toBe(Role.COORD_MANTENIMIENTO);
    expect(actual?.rolNombre).toBe('Coordinador de Mantenimiento');
    expect(actual?.capacidades).toEqual(['maquinaria.gestionar', 'mantenimientos.ver']);
    expect(actual?.modulosPermitidos).toEqual(['maquinaria', 'taller-tecnico']);
    expect(service.hasRole(Role.COORD_MANTENIMIENTO)).toBe(true);
  });

  it('bajar a un usuario de SUPER_ADMIN a un rol normal le quita isSuperAdmin() sin logout (no quedan permisos fantasma)', () => {
    (service as unknown as { currentUserSubject: { next: (u: UsuarioAuth) => void } }).currentUserSubject.next({
      ...fichaLider(), role: Role.SUPER_ADMIN, rolNombre: 'Super Admin', capacidades: [],
    });
    expect(service.isSuperAdmin()).toBe(true);

    httpPost.and.returnValue(of({
      role: 'LIDER', rolNombre: 'Líder Operador', name: 'Juan', lastname: 'Pérez', email: 'juan@easydry.com',
      capacidades: ['maquinaria.ver'], modulos: ['maquinaria'], ambito: 'AGENCIA',
      agenciaId: 'ag-1', agencia: { id: 'ag-1', nombre: 'EasyDry Norte' },
      regionId: 'reg-1', region: { id: 'reg-1', nombre: 'Pichincha' }, regionNombre: 'Pichincha',
      bodegaId: null, estado: 1,
    }));

    service.refrescarPermisos();

    expect(service.isSuperAdmin()).toBe(false);
    expect(service.getCurrentUser()?.role).toBe(Role.LIDER_OPERADOR);
  });

  it('mantiene token/refreshToken actuales (/auth/me no devuelve tokens nuevos)', () => {
    httpPost.and.returnValue(of({
      role: 'LIDER', rolNombre: 'Líder Operador', name: 'Juan', lastname: 'Pérez', email: 'juan@easydry.com',
      capacidades: ['maquinaria.ver'], modulos: ['maquinaria'], ambito: 'AGENCIA',
      agenciaId: 'ag-1', agencia: { id: 'ag-1', nombre: 'EasyDry Norte' },
      regionId: 'reg-1', region: { id: 'reg-1', nombre: 'Pichincha' }, regionNombre: 'Pichincha',
      bodegaId: null, estado: 1,
    }));

    service.refrescarPermisos();

    expect(service.getCurrentUser()?.token).toBe('token-actual');
    expect(service.getCurrentUser()?.refreshToken).toBe('refresh-actual');
  });

  it('preserva servicioIds existentes: /auth/me no los devuelve', () => {
    httpPost.and.returnValue(of({
      role: 'LIDER', rolNombre: 'Líder Operador', name: 'Juan', lastname: 'Pérez', email: 'juan@easydry.com',
      capacidades: ['maquinaria.ver'], modulos: ['maquinaria'], ambito: 'AGENCIA',
      agenciaId: 'ag-1', agencia: { id: 'ag-1', nombre: 'EasyDry Norte' },
      regionId: 'reg-1', region: { id: 'reg-1', nombre: 'Pichincha' }, regionNombre: 'Pichincha',
      bodegaId: null, estado: 1,
    }));

    service.refrescarPermisos();

    expect(service.getCurrentUser()?.servicioIds).toEqual([7]);
  });

  afterEach(() => {
    localStorage.clear();
  });
});

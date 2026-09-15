import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { LoginComponent } from './features/login/login.component';
import { AdminLayoutComponent } from './shared/layouts/admin-layout.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { Role } from './core/models/roles.model';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'unauthorized',
        loadComponent: () =>
          import('./features/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
      },

      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/perfil/perfil.component').then(m => m.PerfilComponent),
        canActivate: [authGuard]
      },

      {
        path: 'notificaciones',
        loadComponent: () =>
          import('./features/notificaciones/notificaciones.component').then(m => m.NotificacionesComponent),
        canActivate: [authGuard]
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.GERENTE,
            Role.SUPERVISOR,
            Role.COORD_MANTENIMIENTO,
            Role.TECNICO,
            Role.LIDER_OPERADOR,
            Role.LIDER_AGENCIA,
            Role.COORD_COMERCIAL,
            Role.COORD_SERVICIOS_ESPECIALES,
            Role.OPERADOR_SERVICIOS_ESPECIALES,
            Role.DISTRIBUIDOR,
            Role.ASISTENTE_BODEGA
          ], 'dashboard')
        ]
      },

      {
        path: 'servicios',
        loadComponent: () =>
          import('./features/servicios/servicios.component').then(m => m.ServiciosComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.GERENTE,
            Role.SUPERVISOR,
            Role.LIDER_OPERADOR,
            Role.LIDER_AGENCIA,
            Role.COORD_COMERCIAL,
            Role.COORD_SERVICIOS_ESPECIALES,
            Role.OPERADOR_SERVICIOS_ESPECIALES
          ], 'servicios')
        ]
      },

      {
        path: 'aprobaciones',
        loadComponent: () =>
          import('./features/aprobaciones/aprobaciones.component').then(m => m.AprobacionesComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.GERENTE,
            Role.COORD_SERVICIOS_ESPECIALES
          ], 'aprobaciones')
        ]
      },

      {
        path: 'productividad',
        loadComponent: () =>
          import('./features/productividad/productividad.component').then(m => m.ProductividadComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_COMERCIAL,
            Role.COORD_SERVICIOS_ESPECIALES
          ], 'productividad')
        ]
      },

      {
        path: 'mapa-operativo',
        redirectTo: () => {
          const router = inject(Router);
          return router.createUrlTree(['/agencias'], { queryParams: { tab: 'mapa' } });
        }
      },

      {
        path: 'agencias',
        loadComponent: () =>
          import('./features/sucursales/sucursales.component').then(m => m.SucursalesComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR
          ], 'agencias')
        ]
      },
      {
        path: 'agencias/:id',
        loadComponent: () =>
          import('./features/sucursales/sucursal-detail.component').then(m => m.SucursalDetailComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR
          ], 'agencias')
        ]
      },
      {
        path: 'sucursales',
        redirectTo: 'agencias',
        pathMatch: 'full'
      },
      {
        path: 'sucursales/:id',
        redirectTo: 'agencias/:id'
      },

      {
        path: 'operadores',
        loadComponent: () =>
          import('./features/operadores/operadores.component').then(m => m.OperadoresComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.LIDER_OPERADOR,
            Role.LIDER_AGENCIA,
            Role.COORD_SERVICIOS_ESPECIALES
          ], 'operadores')
        ]
      },
      {
        path: 'asignaciones',
        redirectTo: 'operadores'
      },
      {
        path: 'lavadores',
        redirectTo: 'operadores'
      },

      {
        path: 'maquinaria',
        loadComponent: () =>
          import('./features/maquinaria/maquinaria.component').then(m => m.MaquinariaComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_MANTENIMIENTO,
            Role.TECNICO,
            Role.LIDER_OPERADOR,
            Role.LIDER_AGENCIA,
            Role.COORD_SERVICIOS_ESPECIALES
          ], 'maquinaria')
        ]
      },

      {
        path: 'taller-tecnico',
        loadComponent: () =>
          import('./features/taller-tecnico/taller-tecnico.component').then(m => m.TallerTecnicoComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_MANTENIMIENTO,
            Role.TECNICO
          ], 'taller-tecnico')
        ]
      },

      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario.component').then(m => m.InventarioComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_MANTENIMIENTO,
            Role.TECNICO,
            Role.LIDER_OPERADOR,
            Role.LIDER_AGENCIA,
            Role.OPERADOR,
            Role.DISTRIBUIDOR,
            Role.ASISTENTE_BODEGA
          ], 'inventario')
        ]
      },

      {
        path: 'envios',
        loadComponent: () =>
          import('./features/envios/envios.component').then(m => m.EnviosComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_MANTENIMIENTO,
            Role.LIDER_OPERADOR,
            Role.LIDER_AGENCIA,
            Role.OPERADOR,
            Role.COORD_SERVICIOS_ESPECIALES,
            Role.OPERADOR_SERVICIOS_ESPECIALES,
            Role.DISTRIBUIDOR,
            Role.ASISTENTE_BODEGA
          ], 'envios')
        ]
      },

      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reportes/reportes.component').then(m => m.ReportesComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_COMERCIAL,
            Role.COORD_BODEGA,
            Role.DISTRIBUIDOR
          ], 'reportes')
        ]
      },

      {
        path: 'agencias',
        loadComponent: () =>
          import('./features/agencias/agencias.component').then(m => m.AgenciasComponent),
        canActivate: [
          authGuard,
          roleGuard([Role.SUPER_ADMIN, Role.ADMIN], 'agencias')
        ]
      },

      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent),
        canActivate: [
          authGuard,
          roleGuard([Role.SUPER_ADMIN, Role.ADMIN], 'usuarios')
        ]
      },
      {
        path: 'configuracion/servicios',
        loadComponent: () =>
          import('./features/configuracion/catalogo-servicios/catalogo-servicios.component').then(m => m.CatalogoServiciosComponent),
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.JEFE_COMERCIAL,
            Role.COORD_COMERCIAL,
            Role.COORD_SERVICIOS_ESPECIALES,
            Role.LIDER_OPERADOR,
            Role.LIDER_AGENCIA
          ], 'configuracion/servicios')
        ]
      },
      {
        path: 'servicios/catalogo',
        redirectTo: 'configuracion/servicios',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { AdminLayoutComponent } from './shared/layouts/admin-layout.component';
import { authGuard, moduloGuard } from './core/guards/auth.guard';
import { AuthService } from './core/services/auth.service';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'sin-acceso',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/sin-acceso/sin-acceso.component').then(m => m.SinAccesoComponent)
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/inicio-redirect/inicio-redirect.component')
            .then(m => m.InicioRedirectComponent),
        pathMatch: 'full'
      },

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
        canActivate: [
          authGuard,
          moduloGuard('notificaciones')
        ]
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [
          authGuard,
          moduloGuard('dashboard')
        ]
      },

      {
        path: 'servicios',
        loadComponent: () =>
          import('./features/servicios/servicios.component').then(m => m.ServiciosComponent),
        canActivate: [
          authGuard,
          moduloGuard('servicios')
        ]
      },

      {
        path: 'aprobaciones',
        loadComponent: () =>
          import('./features/aprobaciones/aprobaciones.component').then(m => m.AprobacionesComponent),
        canActivate: [
          authGuard,
          moduloGuard('aprobaciones')
        ]
      },

      {
        path: 'productividad',
        loadComponent: () =>
          import('./features/productividad/productividad.component').then(m => m.ProductividadComponent),
        canActivate: [
          authGuard,
          moduloGuard('productividad')
        ]
      },

      {
        path: 'mapa-operativo',
        redirectTo: () => inject(Router).parseUrl('/agencias?tab=mapa'),
        pathMatch: 'full'
      },

      {
        path: 'agencias',
        loadComponent: () =>
          import('./features/sucursales/sucursales.component').then(m => m.SucursalesComponent),
        canActivate: [
          authGuard,
          moduloGuard('agencias')
        ]
      },
      {
        path: 'agencias/:id',
        loadComponent: () =>
          import('./features/sucursales/sucursal-detail.component').then(m => m.SucursalDetailComponent),
        canActivate: [
          authGuard,
          moduloGuard('agencias')
        ]
      },
      {
        path: 'sucursales',
        redirectTo: () => {
          const auth = inject(AuthService);
          const router = inject(Router);
          const destino = auth.hasModuleAccess('agencias') ? '/agencias' : auth.rutaInicial();
          return router.parseUrl(destino);
        },
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
          moduloGuard('operadores')
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
          // Matriz de maquinaria: ADMIN, SUPER_ADMIN, COORD_BODEGA, COORD_MANTENIMIENTO, TECNICO, PULIDOR* y LIDER*
          moduloGuard('maquinaria')
        ]
      },

      {
        path: 'taller-tecnico',
        loadComponent: () =>
          import('./features/taller-tecnico/taller-tecnico.component').then(m => m.TallerTecnicoComponent),
        canActivate: [
          authGuard,
          moduloGuard('taller-tecnico')
        ]
      },

      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario.component').then(m => m.InventarioComponent),
        canActivate: [
          authGuard,
          moduloGuard('inventario')
        ]
      },

      {
        path: 'envios',
        loadComponent: () =>
          import('./features/envios/envios.component').then(m => m.EnviosComponent),
        canActivate: [
          authGuard,
          moduloGuard('envios')
        ]
      },

      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reportes/reportes.component').then(m => m.ReportesComponent),
        canActivate: [
          authGuard,
          moduloGuard('reportes')
        ]
      },

      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent),
        canActivate: [
          authGuard,
          moduloGuard('usuarios')
        ]
      },
      {
        path: 'configuracion/servicios',
        loadComponent: () =>
          import('./features/configuracion/catalogo-servicios/catalogo-servicios.component').then(m => m.CatalogoServiciosComponent),
        canActivate: [
          authGuard,
          moduloGuard('configuracion/servicios')
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

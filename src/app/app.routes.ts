import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { AdminLayoutComponent } from './shared/layouts/admin-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AgenciasComponent } from './features/agencias/agencias.component';
import { ServiciosComponent } from './features/servicios/servicios.component';
import { AprobacionesComponent } from './features/aprobaciones/aprobaciones.component';
import { ProductividadComponent } from './features/productividad/productividad.component';
import { ReportesComponent } from './features/reportes/reportes.component';
import { MaquinariaComponent } from './features/maquinaria/maquinaria.component';
import { TallerTecnicoComponent } from './features/taller-tecnico/taller-tecnico.component';
import { UsuariosComponent } from './features/usuarios/usuarios.component';
import { ConfiguracionComponent } from './features/configuracion/configuracion.component';
import { CatalogoServiciosComponent } from './features/configuracion/catalogo-servicios/catalogo-servicios.component';
import { SucursalesComponent } from './features/sucursales/sucursales.component';
import { SucursalDetailComponent } from './features/sucursales/sucursal-detail.component';
import { OperadoresComponent } from './features/operadores/operadores.component';
import { AsignacionesComponent } from './features/asignaciones/asignaciones.component';
import { MapaOperativoComponent } from './features/mapa-operativo/mapa-operativo.component';
import { MiBahiaComponent } from './features/mi-bahia/mi-bahia.component';
import { UnauthorizedComponent } from './features/unauthorized/unauthorized.component';
import { PerfilComponent } from './features/perfil/perfil.component';
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

      // ── Páginas de sistema ──
      {
        path: 'unauthorized',
        component: UnauthorizedComponent
      },

      // ── Acceso Universal (todos los roles autenticados) ──
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard]
      },
      {
        path: 'perfil',
        component: PerfilComponent,
        canActivate: [authGuard]
      },

      // ── Solo Operador ──
      {
        path: 'mi-bahia',
        component: MiBahiaComponent,
        canActivate: [authGuard, roleGuard([Role.OPERADOR])]
      },

      // ── Servicios: Admin, Gerente, Supervisor, Operador ──
      {
        path: 'servicios',
        component: ServiciosComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR, Role.OPERADOR])]
      },

      // ── Aprobaciones: Admin y Gerente ──
      {
        path: 'aprobaciones',
        component: AprobacionesComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN, Role.GERENTE])]
      },

      // ── Productividad: Admin, Gerente, Supervisor ──
      {
        path: 'productividad',
        component: ProductividadComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR])]
      },

      // ── Mapa Operativo: Admin, Gerente, Supervisor ──
      {
        path: 'mapa-operativo',
        component: MapaOperativoComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR])]
      },

      // ── Sucursales: Solo Admin ──
      {
        path: 'sucursales',
        component: SucursalesComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN])]
      },
      {
        path: 'sucursales/:id',
        component: SucursalDetailComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN])]
      },

      // ── Operadores & Asignaciones: Admin, Gerente, Supervisor ──
      {
        path: 'operadores',
        component: OperadoresComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR])]
      },
      {
        path: 'asignaciones',
        component: AsignacionesComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR])]
      },

      // ── Maquinaria: Admin, Gerente, Supervisor, Técnico ──
      {
        path: 'maquinaria',
        component: MaquinariaComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR, Role.TECNICO])]
      },

      // ── Taller Técnico (Mantenimiento e Incidentes) ──
      {
        path: 'taller-tecnico',
        component: TallerTecnicoComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR, Role.TECNICO])]
      },

      // ── Reportes: Admin y Gerente ──
      {
        path: 'reportes',
        component: ReportesComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN, Role.GERENTE])]
      },

      // ── Agencias: Solo Admin ──
      {
        path: 'agencias',
        component: AgenciasComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN])]
      },

      // ── Usuarios y Configuración: Solo Admin ──
      {
        path: 'usuarios',
        component: UsuariosComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN])]
      },
      {
        path: 'configuracion',
        component: ConfiguracionComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN])]
      },
      {
        path: 'configuracion/servicios',
        component: CatalogoServiciosComponent,
        canActivate: [authGuard, roleGuard([Role.SUPER_ADMIN])]
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

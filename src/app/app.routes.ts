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
import { NotificacionesComponent } from './features/notificaciones/notificaciones.component';
import { InventarioComponent } from './features/inventario/inventario.component';
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

      // ── Acceso Universal / Perfil ──
      {
        path: 'perfil',
        component: PerfilComponent,
        canActivate: [authGuard]
      },

      {
        path: 'notificaciones',
        component: NotificacionesComponent,
        canActivate: [authGuard]
      },

      // ── Dashboard Principal ──
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_MANTENIMIENTO,
            Role.TECNICO,
            Role.OPERADOR,
            Role.COORD_COMERCIAL,
            Role.COORD_SERVICIOS_ESPECIALES,
            Role.OPERADOR_SERVICIOS_ESPECIALES,
            Role.DISTRIBUIDOR,
            Role.ASISTENTE_BODEGA
          ], 'dashboard')
        ]
      },

      // ── Área Operativa de Bahía ──
      {
        path: 'mi-bahia',
        component: MiBahiaComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.OPERADOR,
            Role.OPERADOR_SERVICIOS_ESPECIALES
          ], 'mi-bahia')
        ]
      },

      // ── Servicios de Lavado (OTs) ──
      {
        path: 'servicios',
        component: ServiciosComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.OPERADOR,
            Role.COORD_COMERCIAL,
            Role.COORD_SERVICIOS_ESPECIALES,
            Role.OPERADOR_SERVICIOS_ESPECIALES
          ], 'servicios')
        ]
      },

      // ── Aprobaciones y Cierres (SuperAdmin y Jefe Especiales) ──
      {
        path: 'aprobaciones',
        component: AprobacionesComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.COORD_SERVICIOS_ESPECIALES
          ], 'aprobaciones')
        ]
      },

      // ── Productividad & Reto EasyDry ──
      {
        path: 'productividad',
        component: ProductividadComponent,
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

      // ── Mapa Operativo en Vivo ──
      {
        path: 'mapa-operativo',
        component: MapaOperativoComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR
          ], 'mapa-operativo')
        ]
      },

      // ── Sucursales ──
      {
        path: 'sucursales',
        component: SucursalesComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR
          ], 'sucursales')
        ]
      },
      {
        path: 'sucursales/:id',
        component: SucursalDetailComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR
          ], 'sucursales')
        ]
      },

      // ── Operadores & Asignaciones ──
      {
        path: 'operadores',
        component: OperadoresComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_SERVICIOS_ESPECIALES
          ], 'operadores')
        ]
      },
      {
        path: 'asignaciones',
        component: AsignacionesComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_SERVICIOS_ESPECIALES
          ], 'asignaciones')
        ]
      },

      // ── Maquinaria & Equipos ──
      {
        path: 'maquinaria',
        component: MaquinariaComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_MANTENIMIENTO,
            Role.TECNICO,
            Role.COORD_SERVICIOS_ESPECIALES
          ], 'maquinaria')
        ]
      },

      // ── Taller Técnico (Mantenimiento e Incidentes) ──
      {
        path: 'taller-tecnico',
        component: TallerTecnicoComponent,
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

      // ── Inventario de Insumos & Bodega ──
      {
        path: 'inventario',
        component: InventarioComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_MANTENIMIENTO,
            Role.TECNICO,
            Role.DISTRIBUIDOR,
            Role.ASISTENTE_BODEGA
          ], 'inventario')
        ]
      },

      // ── Reportes Operativos ──
      {
        path: 'reportes',
        component: ReportesComponent,
        canActivate: [
          authGuard,
          roleGuard([
            Role.SUPER_ADMIN,
            Role.ADMIN,
            Role.SUPERVISOR,
            Role.COORD_COMERCIAL
          ], 'reportes')
        ]
      },

      // ── Agencias (Solo SuperAdmin) ──
      {
        path: 'agencias',
        component: AgenciasComponent,
        canActivate: [
          authGuard,
          roleGuard([Role.SUPER_ADMIN, Role.ADMIN], 'agencias')
        ]
      },

      // ── Usuarios, Roles y Configuración Global (Solo SuperAdmin) ──
      {
        path: 'usuarios',
        component: UsuariosComponent,
        canActivate: [
          authGuard,
          roleGuard([Role.SUPER_ADMIN, Role.ADMIN], 'usuarios')
        ]
      },
      {
        path: 'configuracion',
        component: ConfiguracionComponent,
        canActivate: [
          authGuard,
          roleGuard([Role.SUPER_ADMIN, Role.ADMIN], 'configuracion')
        ]
      },
      {
        path: 'configuracion/servicios',
        component: CatalogoServiciosComponent,
        canActivate: [
          authGuard,
          roleGuard([Role.SUPER_ADMIN, Role.ADMIN], 'configuracion/servicios')
        ]
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

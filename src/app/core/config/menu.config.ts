import { Role } from '../models/roles.model';

export interface MenuItem {
  label: string;
  route: string;
  icon: string;
  roles: Role[];
  badge?: string;
  badgeColor?: string;
  group?: string;
}

/**
 * Configuración declarativa del menú de navegación EasyDry®
 * Cada ítem especifica qué roles pueden verlo.
 */
export const MENU_CONFIG: MenuItem[] = [

  // ─── Panel Principal ───────────────────────────────────────────
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'layout-dashboard',
    group: 'Panel Principal',
    roles: [Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR, Role.OPERADOR, Role.TECNICO]
  },
  {
    label: 'Mapa Operativo Red',
    route: '/mapa-operativo',
    icon: 'sliders',
    group: 'Panel Principal',
    badge: 'Live',
    badgeColor: 'bg-easydry-green text-slate-950',
    roles: [Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR]
  },

  // ─── Operación & Sucursales ────────────────────────────────────
  {
    label: 'Control de Sucursales',
    route: '/sucursales',
    icon: 'building-2',
    group: 'Operación & Sucursales',
    badge: '4',
    roles: [Role.SUPER_ADMIN]
  },
  {
    label: 'Operadores de Bahía',
    route: '/operadores',
    icon: 'user-check',
    group: 'Operación & Sucursales',
    roles: [Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR]
  },
  {
    label: 'Asignaciones de Bahía',
    route: '/asignaciones',
    icon: 'check-circle-2',
    group: 'Operación & Sucursales',
    roles: [Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR]
  },

  // ─── Servicios de Lavado ───────────────────────────────────────
  {
    label: 'Catálogo de Servicios',
    route: '/configuracion/servicios',
    icon: 'file-text',
    group: 'Servicios de Lavado',
    roles: [Role.SUPER_ADMIN]
  },
  {
    label: 'Servicios de Lavado',
    route: '/servicios',
    icon: 'car',
    group: 'Servicios de Lavado',
    badge: 'Hoy',
    roles: [Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR, Role.OPERADOR]
  },
  {
    label: 'Aprobaciones del Día',
    route: '/aprobaciones',
    icon: 'shield-check',
    group: 'Servicios de Lavado',
    badge: 'Gerencia',
    badgeColor: 'bg-easydry-green text-slate-950',
    roles: [Role.SUPER_ADMIN, Role.GERENTE]
  },
  {
    label: 'Productividad & Reto',
    route: '/productividad',
    icon: 'trophy',
    group: 'Servicios de Lavado',
    badge: 'Reto',
    badgeColor: 'bg-amber-400 text-slate-950',
    roles: [Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR]
  },

  // ─── Vista Operador de Bahía ───────────────────────────────────
  {
    label: 'Mi Bahía',
    route: '/mi-bahia',
    icon: 'map-pin',
    group: 'Mi Área',
    roles: [Role.OPERADOR]
  },
  {
    label: 'Mis Evidencias',
    route: '/servicios',
    icon: 'image',
    group: 'Mi Área',
    roles: [Role.OPERADOR]
  },

  // ─── Activos & Técnico ─────────────────────────────────────────
  {
    label: 'Maquinaria & Equipos',
    route: '/maquinaria',
    icon: 'hard-drive',
    group: 'Gestión de Activos',
    roles: [Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR, Role.TECNICO]
  },
  {
    label: 'Mantenimientos',
    route: '/mantenimiento',
    icon: 'calendar-clock',
    group: 'Gestión de Activos',
    roles: [Role.SUPER_ADMIN, Role.TECNICO]
  },
  {
    label: 'Registro de Incidentes',
    route: '/incidentes',
    icon: 'alert-triangle',
    group: 'Gestión de Activos',
    badge: '2',
    badgeColor: 'bg-rose-500 text-white',
    roles: [Role.SUPER_ADMIN, Role.GERENTE, Role.SUPERVISOR, Role.TECNICO]
  },

  // ─── Administración ────────────────────────────────────────────
  {
    label: 'Reportes Operativos',
    route: '/reportes',
    icon: 'file-bar-chart',
    group: 'Administración',
    roles: [Role.SUPER_ADMIN, Role.GERENTE]
  },
  {
    label: 'Usuarios y Roles',
    route: '/usuarios',
    icon: 'users',
    group: 'Administración',
    roles: [Role.SUPER_ADMIN]
  },
  {
    label: 'Configuración',
    route: '/configuracion',
    icon: 'settings',
    group: 'Administración',
    roles: [Role.SUPER_ADMIN]
  }
];

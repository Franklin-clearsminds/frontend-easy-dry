import { Role } from '../models/roles.model';

export interface MenuItem {
  label: string;
  route: string;
  icon: string;
  roles?: Role[] | string[];
  moduloCodigo: string; // Código del módulo asociado
  badge?: string;
  badgeColor?: string;
  group?: string;
}

/**
 * Configuración declarativa del menú de navegación EasyDry®
 * Cada ítem está vinculado a un código de módulo del sistema.
 */
export const MENU_CONFIG: MenuItem[] = [

  // ─── Panel Principal ───────────────────────────────────────────
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'layout-dashboard',
    moduloCodigo: 'dashboard',
    group: 'Panel Principal'
  },
  {
    label: 'Mapa Operativo Red',
    route: '/mapa-operativo',
    icon: 'sliders',
    moduloCodigo: 'mapa-operativo',
    group: 'Panel Principal',
    badge: 'Live',
    badgeColor: 'bg-easydry-green text-slate-950'
  },

  // ─── Operación & Sucursales ────────────────────────────────────
  {
    label: 'Control de Sucursales',
    route: '/sucursales',
    icon: 'building-2',
    moduloCodigo: 'sucursales',
    group: 'Operación & Sucursales',
    badge: '4'
  },
  {
    label: 'Operadores de Bahía',
    route: '/operadores',
    icon: 'user-check',
    moduloCodigo: 'operadores',
    group: 'Operación & Sucursales'
  },
  {
    label: 'Asignaciones de Bahía',
    route: '/asignaciones',
    icon: 'check-circle-2',
    moduloCodigo: 'asignaciones',
    group: 'Operación & Sucursales'
  },

  // ─── Servicios de Lavado ───────────────────────────────────────
  {
    label: 'Catálogo de Servicios',
    route: '/configuracion/servicios',
    icon: 'file-text',
    moduloCodigo: 'configuracion/servicios',
    group: 'Servicios de Lavado'
  },
  {
    label: 'Servicios de Lavado',
    route: '/servicios',
    icon: 'car',
    moduloCodigo: 'servicios',
    group: 'Servicios de Lavado',
    badge: 'Hoy'
  },
  {
    label: 'Aprobaciones del Día',
    route: '/aprobaciones',
    icon: 'shield-check',
    moduloCodigo: 'aprobaciones',
    group: 'Servicios de Lavado',
    badge: 'Gerencia',
    badgeColor: 'bg-easydry-green text-slate-950'
  },
  {
    label: 'Productividad & Reto',
    route: '/productividad',
    icon: 'trophy',
    moduloCodigo: 'productividad',
    group: 'Servicios de Lavado',
    badge: 'Reto',
    badgeColor: 'bg-amber-400 text-slate-950'
  },
  {
    label: 'Mi Bahía',
    route: '/mi-bahia',
    icon: 'map-pin',
    moduloCodigo: 'mi-bahia',
    group: 'Servicios de Lavado'
  },

  // ─── Activos & Técnico ─────────────────────────────────────────
  {
    label: 'Maquinaria & Equipos',
    route: '/maquinaria',
    icon: 'hard-drive',
    moduloCodigo: 'maquinaria',
    group: 'Gestión de Activos'
  },
  {
    label: 'Taller y Reportes',
    route: '/taller-tecnico',
    icon: 'wrench',
    moduloCodigo: 'taller-tecnico',
    group: 'Gestión de Activos',
    badge: '2',
    badgeColor: 'bg-rose-500 text-white'
  },
  {
    label: 'Inventario de Insumos',
    route: '/inventario',
    icon: 'boxes',
    moduloCodigo: 'inventario',
    group: 'Gestión de Activos',
    badge: 'Stock',
    badgeColor: 'bg-easydry-blue/15 text-easydry-blue'
  },

  // ─── Administración ────────────────────────────────────────────
  {
    label: 'Reportes Operativos',
    route: '/reportes',
    icon: 'file-bar-chart',
    moduloCodigo: 'reportes',
    group: 'Administración'
  },
  {
    label: 'Usuarios y Roles',
    route: '/usuarios',
    icon: 'users',
    moduloCodigo: 'usuarios',
    group: 'Administración'
  },
  {
    label: 'Configuración',
    route: '/configuracion',
    icon: 'settings',
    moduloCodigo: 'configuracion',
    group: 'Administración'
  }
];

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
/**
 * Configuración declarativa del menú de navegación EasyDry®
 * Organizado en los 4 grupos oficiales del sistema:
 * - Operación
 * - Administración
 * - Reportes
 * - Configuración
 */
export const MENU_CONFIG: MenuItem[] = [

  // ─── 1. PANEL PRINCIPAL ────────────────────────────────────────
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'layout-dashboard',
    moduloCodigo: 'dashboard',
    group: 'Panel Principal'
  },
  {
    label: 'Notificaciones',
    route: '/notificaciones',
    icon: 'bell',
    moduloCodigo: 'notificaciones',
    group: 'Panel Principal',
    badge: '3',
    badgeColor: 'bg-rose-500 text-white'
  },

  // ─── 2. OPERACIÓN & SUCURSALES ─────────────────────────────────
  {
    label: 'Sucursales & Mapa Red',
    route: '/sucursales',
    icon: 'building-2',
    moduloCodigo: 'sucursales',
    group: 'Operación & Sucursales',
    badge: 'Live',
    badgeColor: 'bg-easydry-green text-slate-950'
  },
  {
    label: 'Gestión de Operadores',
    route: '/operadores',
    icon: 'user-check',
    moduloCodigo: 'operadores',
    group: 'Operación & Sucursales'
  },
  {
    label: 'Mi Bahía',
    route: '/mi-bahia',
    icon: 'map-pin',
    moduloCodigo: 'mi-bahia',
    group: 'Operación & Sucursales'
  },

  // ─── 3. SERVICIOS DE LAVADO ────────────────────────────────────
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

  // ─── 4. ACTIVOS & TALLER ───────────────────────────────────────
  {
    label: 'Maquinaria & Equipos',
    route: '/maquinaria',
    icon: 'hard-drive',
    moduloCodigo: 'maquinaria',
    group: 'Activos & Taller'
  },
  {
    label: 'Taller Técnico',
    route: '/taller-tecnico',
    icon: 'wrench',
    moduloCodigo: 'taller-tecnico',
    group: 'Activos & Taller',
    badge: '2',
    badgeColor: 'bg-rose-500 text-white'
  },
  {
    label: 'Inventario & Suministros',
    route: '/inventario',
    icon: 'boxes',
    moduloCodigo: 'inventario',
    group: 'Activos & Taller',
    badge: 'Stock',
    badgeColor: 'bg-easydry-blue/15 text-easydry-blue'
  },

  // ─── 5. ADMINISTRACIÓN ─────────────────────────────────────────
  {
    label: 'Usuarios y Roles',
    route: '/usuarios',
    icon: 'users',
    moduloCodigo: 'usuarios',
    group: 'Administración'
  },
  {
    label: 'Catálogo de Servicios',
    route: '/configuracion/servicios',
    icon: 'file-text',
    moduloCodigo: 'configuracion/servicios',
    group: 'Administración'
  },
  {
    label: 'Reportes Operativos',
    route: '/reportes',
    icon: 'file-bar-chart',
    moduloCodigo: 'reportes',
    group: 'Administración'
  },
  {
    label: 'Configuración Global',
    route: '/configuracion',
    icon: 'settings',
    moduloCodigo: 'configuracion',
    group: 'Administración'
  }
];

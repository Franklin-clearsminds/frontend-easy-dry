import { Role } from '../models/roles.model';

export interface MenuItem {
  label: string;
  route: string;
  icon: string;
  roles?: Role[] | string[];
  moduloCodigo: string; // Código del módulo asociado
  badge?: string;
  badgeIcon?: string; // Icono para badges gráficos (ej. 'alert-triangle')
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
    badgeIcon: 'alert-circle-filled',
    badgeColor: 'bg-rose-500 text-white'
  },

  // ─── 2. OPERACIÓN & AGENCIAS ─────────────────────────────────
  {
    label: 'Agencias & Mapa Red',
    route: '/agencias',
    icon: 'building-2',
    moduloCodigo: 'agencias',
    group: 'Operación & Agencias'
  },
  {
    label: 'Gestión de Lavadores',
    route: '/operadores',
    icon: 'user-check',
    moduloCodigo: 'operadores',
    group: 'Operación & Agencias'
  },

  // ─── 3. SERVICIOS DE LAVADO ────────────────────────────────────
  {
    label: 'Servicios de Lavado',
    route: '/servicios',
    icon: 'car',
    moduloCodigo: 'servicios',
    group: 'Servicios de Lavado'
  },
  {
    label: 'Catálogo de Servicios',
    route: '/configuracion/servicios',
    icon: 'file-text',
    moduloCodigo: 'configuracion/servicios',
    group: 'Servicios de Lavado'
  },
  {
    label: 'Aprobaciones del Día',
    route: '/aprobaciones',
    icon: 'shield-check',
    moduloCodigo: 'aprobaciones',
    group: 'Servicios de Lavado'
  },
  {
    label: 'Productividad & Reto',
    route: '/productividad',
    icon: 'trophy',
    moduloCodigo: 'productividad',
    group: 'Servicios de Lavado'
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
    badgeIcon: 'alert-circle-filled',
    badgeColor: 'bg-rose-500 text-white'
  },
  {
    label: 'Inventario & Suministros',
    route: '/inventario',
    icon: 'boxes',
    moduloCodigo: 'inventario',
    group: 'Activos & Taller'
  },
  {
    label: 'Envíos & Confirmación',
    route: '/envios',
    icon: 'send',
    moduloCodigo: 'envios',
    group: 'Activos & Taller',
    badgeIcon: 'alert-circle-filled',
    badgeColor: 'bg-amber-500 text-white'
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
    label: 'Reportes Operativos',
    route: '/reportes',
    icon: 'file-bar-chart',
    moduloCodigo: 'reportes',
    group: 'Administración'
  },
];

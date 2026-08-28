// =========================================================
// EasyDry® - Sistema de Roles y Permisos Modulares Dinámicos
// =========================================================

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GERENTE = 'GERENTE',
  SUPERVISOR = 'SUPERVISOR',
  OPERADOR = 'OPERADOR',
  SERVICIOS_EXTRAS = 'SERVICIOS_EXTRAS',
  TECNICO = 'TECNICO',
  CUSTOM = 'CUSTOM'
}

/** Roles de sistema (`esSistema`). CUSTOM se crea en Identity, no es grupo fijo. */
export const ROLES_SISTEMA: Role[] = [
  Role.SUPER_ADMIN,
  Role.GERENTE,
  Role.SUPERVISOR,
  Role.OPERADOR,
  Role.SERVICIOS_EXTRAS,
  Role.TECNICO
];

/** Definición de un módulo funcional del sistema */
export interface ModuloSistema {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  rutaPrincipal: string;
  grupo: 'Panel Principal' | 'Operación & Sucursales' | 'Servicios de Lavado' | 'Gestión de Activos' | 'Administración';
}

/** Catálogo oficial de módulos configurables */
export const MODULOS_SISTEMA: ModuloSistema[] = [
  // ── Panel Principal ──
  {
    id: 'mod_dashboard',
    codigo: 'dashboard',
    nombre: 'Dashboard Principal',
    descripcion: 'Métricas clave, KPIs generales, gráficos de rendimiento y alertas de la red',
    icono: 'layout-dashboard',
    rutaPrincipal: '/dashboard',
    grupo: 'Panel Principal'
  },
  {
    id: 'mod_mapa_operativo',
    codigo: 'mapa-operativo',
    nombre: 'Mapa Operativo en Vivo',
    descripcion: 'Trazabilidad visual jerárquica: Sucursales, Bahías, Operadores y Maquinaria en tiempo real',
    icono: 'sliders',
    rutaPrincipal: '/mapa-operativo',
    grupo: 'Panel Principal'
  },

  // ── Operación & Sucursales ──
  {
    id: 'mod_sucursales',
    codigo: 'sucursales',
    nombre: 'Control de Sucursales',
    descripcion: 'Gestión y estado operativo de las agencias de la red',
    icono: 'building-2',
    rutaPrincipal: '/sucursales',
    grupo: 'Operación & Sucursales'
  },
  {
    id: 'mod_operadores',
    codigo: 'operadores',
    nombre: 'Operadores de Bahía',
    descripcion: 'Directorio, métricas y estado del personal operativo',
    icono: 'user-check',
    rutaPrincipal: '/operadores',
    grupo: 'Operación & Sucursales'
  },
  {
    id: 'mod_asignaciones',
    codigo: 'asignaciones',
    nombre: 'Asignación de Bahías',
    descripcion: 'Matriz dinámica para asignar operadores a bahías con historial',
    icono: 'check-circle-2',
    rutaPrincipal: '/asignaciones',
    grupo: 'Operación & Sucursales'
  },

  // ── Servicios de Lavado ──
  {
    id: 'mod_catalogo_servicios',
    codigo: 'configuracion/servicios',
    nombre: 'Catálogo de Servicios',
    descripcion: 'Tarifario, tipos de lavado y políticas de evidencias (foto/video)',
    icono: 'file-text',
    rutaPrincipal: '/configuracion/servicios',
    grupo: 'Servicios de Lavado'
  },
  {
    id: 'mod_servicios',
    codigo: 'servicios',
    nombre: 'Servicios de Lavado (OT)',
    descripcion: 'Digitalización de Hoja de Control, ingreso de placas y registro de vehículos',
    icono: 'car',
    rutaPrincipal: '/servicios',
    grupo: 'Servicios de Lavado'
  },
  {
    id: 'mod_aprobaciones',
    codigo: 'aprobaciones',
    nombre: 'Aprobaciones y Cierre Diario',
    descripcion: 'Auditoría gerencial de evidencias y aprobación de servicios para cierre de día',
    icono: 'shield-check',
    rutaPrincipal: '/aprobaciones',
    grupo: 'Servicios de Lavado'
  },
  {
    id: 'mod_productividad',
    codigo: 'productividad',
    nombre: 'Productividad & Reto EasyDry',
    descripcion: 'Comparativa de agencias y ranking mensual de operarios',
    icono: 'trophy',
    rutaPrincipal: '/productividad',
    grupo: 'Servicios de Lavado'
  },
  {
    id: 'mod_mi_bahia',
    codigo: 'mi-bahia',
    nombre: 'Mi Bahía (Área Operador)',
    descripcion: 'Panel rápido optimizado para el operario asignado a una bahía específica',
    icono: 'map-pin',
    rutaPrincipal: '/mi-bahia',
    grupo: 'Servicios de Lavado'
  },

  // ── Gestión de Activos ──
  {
    id: 'mod_maquinaria',
    codigo: 'maquinaria',
    nombre: 'Maquinaria & Equipos',
    descripcion: 'Inventario de activos industriales y trazabilidad de transferencias',
    icono: 'hard-drive',
    rutaPrincipal: '/maquinaria',
    grupo: 'Gestión de Activos'
  },
  {
    id: 'mod_taller_tecnico',
    codigo: 'taller-tecnico',
    nombre: 'Taller Técnico e Incidentes',
    descripcion: 'Control de mantenimientos preventivos y reporte/resolución de incidencias',
    icono: 'wrench',
    rutaPrincipal: '/taller-tecnico',
    grupo: 'Gestión de Activos'
  },
  {
    id: 'mod_inventario',
    codigo: 'inventario',
    nombre: 'Inventario de Insumos & Bodega',
    descripcion: 'Control de stock central vs sucursales, tipos de producto, envases, transferencias y alertas',
    icono: 'boxes',
    rutaPrincipal: '/inventario',
    grupo: 'Gestión de Activos'
  },

  // ── Administración ──
  {
    id: 'mod_reportes',
    codigo: 'reportes',
    nombre: 'Reportes Operativos',
    descripcion: 'Generación e impresión de informes consolidados de servicios y rendimiento',
    icono: 'file-bar-chart',
    rutaPrincipal: '/reportes',
    grupo: 'Administración'
  },
  {
    id: 'mod_usuarios',
    codigo: 'usuarios',
    nombre: 'Usuarios, Roles y Permisos',
    descripcion: 'Directorio de colaboradores y matriz de creación/configuración de roles dinámicos',
    icono: 'users',
    rutaPrincipal: '/usuarios',
    grupo: 'Administración'
  },
  {
    id: 'mod_configuracion',
    codigo: 'configuracion',
    nombre: 'Configuración del Sistema',
    descripcion: 'Parámetros corporativos, alertas y políticas globales de EasyDry',
    icono: 'settings',
    rutaPrincipal: '/configuracion',
    grupo: 'Administración'
  }
];

/** Estructura de un Rol Dinámico / Personalizado */
export interface RolPersonalizado {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  badgeClass: string;
  modulos: string[]; // Lista de codigos de ModuloSistema autorizados
  esSistema: boolean; // Si es true, no se puede eliminar (SuperAdmin)
  fechaCreacion: string;
  usuariosCount?: number;
}

function todosLosModulos(): string[] {
  return MODULOS_SISTEMA.map(m => m.codigo);
}

/** Catálogo oficial de roles de sistema (más CUSTOM, que se crea en UI). */
export const ROLES_INICIALES: RolPersonalizado[] = [
  {
    id: 'rol_super_admin',
    codigo: Role.SUPER_ADMIN,
    nombre: 'Super Administrador',
    descripcion: 'Acceso total: usuarios, roles, sucursales, catálogo y configuración de la red.',
    color: '#7C3AED',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    modulos: todosLosModulos(),
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_gerente',
    codigo: Role.GERENTE,
    nombre: 'Gerente',
    descripcion: 'Aprueba y rechaza OT, cierra el día, reportes y productividad. Red o multi-sucursal.',
    color: '#07558C',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    modulos: [
      'dashboard', 'mapa-operativo', 'operadores', 'asignaciones',
      'servicios', 'aprobaciones', 'productividad',
      'maquinaria', 'taller-tecnico', 'inventario', 'reportes'
    ],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 0
  },
  {
    id: 'rol_supervisor',
    codigo: Role.SUPERVISOR,
    nombre: 'Supervisor',
    descripcion: 'Opera una sucursal: bahías, operadores, mapa y OT del sitio. No cierra el día.',
    color: '#D97706',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    modulos: [
      'dashboard', 'mapa-operativo', 'operadores', 'asignaciones',
      'servicios', 'productividad',
      'maquinaria', 'taller-tecnico', 'inventario'
    ],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 0
  },
  {
    id: 'rol_operador',
    codigo: Role.OPERADOR,
    nombre: 'Operador de Bahía',
    descripcion: 'Crea y completa OT de lavado general en una bahía. No aprueba ni cierra el día.',
    color: '#9BCB3B',
    badgeClass: 'bg-lime-100 text-lime-800 border-lime-200',
    modulos: ['dashboard', 'mi-bahia', 'servicios'],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 0
  },
  {
    id: 'rol_servicios_extras',
    codigo: Role.SERVICIOS_EXTRAS,
    nombre: 'Operador de Servicios Extras',
    descripcion: 'Ejecuta asignaciones EXTRA (pulido, cerámico, motor) en la app. No crea las asignaciones.',
    color: '#0F766E',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    modulos: ['dashboard'],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 0
  },
  {
    id: 'rol_tecnico',
    codigo: Role.TECNICO,
    nombre: 'Técnico de Taller',
    descripcion: 'Máquinas, preventivos e incidentes. No opera bahía ni extras.',
    color: '#5B21B6',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    modulos: ['dashboard', 'maquinaria', 'taller-tecnico', 'inventario'],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 0
  }
];

/** Usuario autenticado con contexto completo */
export interface UsuarioAuth {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  role: Role | string;
  rolNombre?: string;
  rolPersonalizado?: RolPersonalizado;
  modulosPermitidos?: string[];
  sucursalId?: number;
  sucursalNombre?: string;
  bahiaId?: number;
  bahiaNombre?: string;
  estado: 'Activo' | 'Inactivo' | string;
  avatar?: string;
}

/** Mapa de permisos de acciones del sistema */
export interface PermisosRol {
  verTodasSucursales: boolean;
  crearSucursal: boolean;
  editarSucursal: boolean;
  crearUsuarios: boolean;
  asignarRoles: boolean;
  verOtrosSucursales: boolean;
  cambiarSucursalOperador: boolean;
  cambiarBahiaOperador: boolean;
  aprobarServicios: boolean;
  rechazarServicios: boolean;
  cerrarDia: boolean;
  registrarServicio: boolean;
  verTodosServicios: boolean;
  verMaquinaria: boolean;
  gestionarMantenimiento: boolean;
  registrarIncidente: boolean;
  verReportes: boolean;
  verProductividadGlobal: boolean;
  verConfiguracion: boolean;
}

const PERMISOS_NINGUNO: PermisosRol = {
  verTodasSucursales: false,
  crearSucursal: false,
  editarSucursal: false,
  crearUsuarios: false,
  asignarRoles: false,
  verOtrosSucursales: false,
  cambiarSucursalOperador: false,
  cambiarBahiaOperador: false,
  aprobarServicios: false,
  rechazarServicios: false,
  cerrarDia: false,
  registrarServicio: false,
  verTodosServicios: false,
  verMaquinaria: false,
  gestionarMantenimiento: false,
  registrarIncidente: false,
  verReportes: false,
  verProductividadGlobal: false,
  verConfiguracion: false
};

export const PERMISOS_POR_ROL: Record<string, PermisosRol> = {
  [Role.SUPER_ADMIN]: {
    verTodasSucursales: true,
    crearSucursal: true,
    editarSucursal: true,
    crearUsuarios: true,
    asignarRoles: true,
    verOtrosSucursales: true,
    cambiarSucursalOperador: true,
    cambiarBahiaOperador: true,
    aprobarServicios: true,
    rechazarServicios: true,
    cerrarDia: true,
    registrarServicio: true,
    verTodosServicios: true,
    verMaquinaria: true,
    gestionarMantenimiento: true,
    registrarIncidente: true,
    verReportes: true,
    verProductividadGlobal: true,
    verConfiguracion: true
  },
  [Role.GERENTE]: {
    ...PERMISOS_NINGUNO,
    verTodasSucursales: true,
    verOtrosSucursales: true,
    aprobarServicios: true,
    rechazarServicios: true,
    cerrarDia: true,
    verTodosServicios: true,
    verMaquinaria: true,
    verReportes: true,
    verProductividadGlobal: true
  },
  [Role.SUPERVISOR]: {
    ...PERMISOS_NINGUNO,
    cambiarBahiaOperador: true,
    verTodosServicios: true,
    verMaquinaria: true,
    gestionarMantenimiento: true,
    registrarIncidente: true
  },
  [Role.OPERADOR]: {
    ...PERMISOS_NINGUNO,
    registrarServicio: true
  },
  [Role.SERVICIOS_EXTRAS]: {
    ...PERMISOS_NINGUNO
  },
  [Role.TECNICO]: {
    ...PERMISOS_NINGUNO,
    verMaquinaria: true,
    gestionarMantenimiento: true,
    registrarIncidente: true
  },
  [Role.CUSTOM]: { ...PERMISOS_NINGUNO }
};

export const ROLE_LABELS: Record<string, string> = {
  [Role.SUPER_ADMIN]: 'Super Administrador',
  [Role.GERENTE]: 'Gerente',
  [Role.SUPERVISOR]: 'Supervisor',
  [Role.OPERADOR]: 'Operador de Bahía',
  [Role.SERVICIOS_EXTRAS]: 'Operador de Servicios Extras',
  [Role.TECNICO]: 'Técnico de Taller',
  [Role.CUSTOM]: 'Rol personalizado',
  SuperAdmin: 'Super Administrador'
};

export const ROLE_COLORS: Record<string, string> = {
  [Role.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 border-purple-200',
  [Role.GERENTE]: 'bg-sky-100 text-sky-800 border-sky-200',
  [Role.SUPERVISOR]: 'bg-amber-100 text-amber-800 border-amber-200',
  [Role.OPERADOR]: 'bg-lime-100 text-lime-800 border-lime-200',
  [Role.SERVICIOS_EXTRAS]: 'bg-teal-100 text-teal-800 border-teal-200',
  [Role.TECNICO]: 'bg-violet-100 text-violet-800 border-violet-200',
  [Role.CUSTOM]: 'bg-slate-100 text-slate-800 border-slate-200',
  SuperAdmin: 'bg-purple-100 text-purple-800 border-purple-200'
};

// =========================================================
// EasyDry® - Sistema Oficial de Roles y Permisos RBAC
// =========================================================

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GERENTE = 'GERENTE',
  SUPERVISOR = 'SUPERVISOR',
  COORD_MANTENIMIENTO = 'COORD_MANTENIMIENTO',
  TECNICO = 'TECNICO',
  OPERADOR = 'OPERADOR',
  COORD_COMERCIAL = 'COORD_COMERCIAL',
  COORD_SERVICIOS_ESPECIALES = 'COORD_SERVICIOS_ESPECIALES',
  OPERADOR_SERVICIOS_ESPECIALES = 'OPERADOR_SERVICIOS_ESPECIALES',
  DISTRIBUIDOR = 'DISTRIBUIDOR',
  CUSTOM = 'CUSTOM'
}

/** Definición de un módulo funcional del sistema */
export interface ModuloSistema {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  rutaPrincipal: string;
  grupo: 'Panel Principal' | 'Operación & Sucursales' | 'Servicios de Lavado' | 'Gestión de Activos' | 'Administración' | 'Mi Cuenta';
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
  {
    id: 'mod_notificaciones',
    codigo: 'notificaciones',
    nombre: 'Centro de Notificaciones',
    descripcion: 'Alertas operativas, aprobaciones pendientes, inventario y avisos del sistema',
    icono: 'bell',
    rutaPrincipal: '/notificaciones',
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
  },

  // ── Mi Cuenta ──
  {
    id: 'mod_perfil',
    codigo: 'perfil',
    nombre: 'Mi Perfil de Usuario',
    descripcion: 'Información personal, credenciales y datos de sucursal',
    icono: 'user',
    rutaPrincipal: '/perfil',
    grupo: 'Mi Cuenta'
  }
];

/** Módulos por defecto asignados a cada uno de los 9 roles */
export const MODULOS_POR_ROL: Record<string, string[]> = {
  [Role.SUPER_ADMIN]: MODULOS_SISTEMA.map(m => m.codigo),
  [Role.GERENTE]: MODULOS_SISTEMA.map(m => m.codigo),
  
  [Role.SUPERVISOR]: [
    'dashboard',
    'notificaciones',
    'mapa-operativo',
    'sucursales',
    'operadores',
    'asignaciones',
    'servicios',
    'productividad',
    'maquinaria',
    'taller-tecnico',
    'inventario',
    'reportes',
    'perfil'
  ],

  [Role.COORD_MANTENIMIENTO]: [
    'dashboard',
    'notificaciones',
    'maquinaria',
    'taller-tecnico',
    'inventario',
    'perfil'
  ],

  [Role.TECNICO]: [
    'dashboard',
    'notificaciones',
    'maquinaria',
    'taller-tecnico',
    'inventario',
    'perfil'
  ],

  [Role.OPERADOR]: [
    'dashboard',
    'notificaciones',
    'mi-bahia',
    'servicios',
    'perfil'
  ],

  [Role.COORD_COMERCIAL]: [
    'dashboard',
    'notificaciones',
    'productividad',
    'servicios',
    'reportes',
    'perfil'
  ],

  [Role.COORD_SERVICIOS_ESPECIALES]: [
    'dashboard',
    'notificaciones',
    'servicios',
    'aprobaciones',
    'operadores',
    'asignaciones',
    'productividad',
    'maquinaria',
    'perfil'
  ],

  [Role.OPERADOR_SERVICIOS_ESPECIALES]: [
    'dashboard',
    'notificaciones',
    'servicios',
    'mi-bahia',
    'perfil'
  ],

  [Role.DISTRIBUIDOR]: [
    'dashboard',
    'notificaciones',
    'inventario',
    'perfil'
  ]
};

/** Ruta de inicio por defecto según rol */
export const DEFAULT_ROUTE_POR_ROL: Record<string, string> = {
  [Role.SUPER_ADMIN]: '/dashboard',
  [Role.SUPERVISOR]: '/dashboard',
  [Role.COORD_MANTENIMIENTO]: '/taller-tecnico',
  [Role.TECNICO]: '/taller-tecnico',
  [Role.OPERADOR]: '/mi-bahia',
  [Role.COORD_COMERCIAL]: '/dashboard',
  [Role.COORD_SERVICIOS_ESPECIALES]: '/dashboard',
  [Role.OPERADOR_SERVICIOS_ESPECIALES]: '/servicios',
  [Role.DISTRIBUIDOR]: '/dashboard'
};

/** Estructura de un Rol Dinámico / Personalizado */
export interface RolPersonalizado {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  badgeClass: string;
  modulos: string[];
  esSistema: boolean;
  fechaCreacion: string;
  usuariosCount?: number;
}

export const ROLES_INICIALES: RolPersonalizado[] = [
  {
    id: 'rol_super_admin',
    codigo: Role.SUPER_ADMIN,
    nombre: 'Super Administrador',
    descripcion: 'Acceso total y sin restricciones a todos los módulos y configuraciones del sistema.',
    color: '#7C3AED',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    modulos: MODULOS_POR_ROL[Role.SUPER_ADMIN],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_supervisor',
    codigo: Role.SUPERVISOR,
    nombre: 'Supervisor Regional',
    descripcion: 'Control operativo de sucursales asignadas, operadores, bahías y mapa operativo en vivo.',
    color: '#07558C',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    modulos: MODULOS_POR_ROL[Role.SUPERVISOR],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_coord_mantenimiento',
    codigo: Role.COORD_MANTENIMIENTO,
    nombre: 'Coordinador Mantenimiento',
    descripcion: 'Gestión completa de maquinaria, creación de órdenes y asignación de técnicos.',
    color: '#D97706',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    modulos: MODULOS_POR_ROL[Role.COORD_MANTENIMIENTO],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_tecnico',
    codigo: Role.TECNICO,
    nombre: 'Técnico de Maquinaria',
    descripcion: 'Ejecución de mantenimientos preventivos/correctivos y reporte de incidentes en taller.',
    color: '#EA580C',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    modulos: MODULOS_POR_ROL[Role.TECNICO],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_operador',
    codigo: Role.OPERADOR,
    nombre: 'Operador de Bahía',
    descripcion: 'Operación diaria de lavado, digitalización de OTs, fotos y evidencias en bahía.',
    color: '#059669',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    modulos: MODULOS_POR_ROL[Role.OPERADOR],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_coord_comercial',
    codigo: Role.COORD_COMERCIAL,
    nombre: 'Coordinador Comercial',
    descripcion: 'Control comercial, establecimiento de metas, seguimiento de productividad y reportes.',
    color: '#2563EB',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    modulos: MODULOS_POR_ROL[Role.COORD_COMERCIAL],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_coord_servicios_especiales',
    codigo: Role.COORD_SERVICIOS_ESPECIALES,
    nombre: 'Jefe Servicios Especiales',
    descripcion: 'Creación, asignación, supervisión y aprobación final de servicios premium y detallado.',
    color: '#0891B2',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    modulos: MODULOS_POR_ROL[Role.COORD_SERVICIOS_ESPECIALES],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_operador_servicios_especiales',
    codigo: Role.OPERADOR_SERVICIOS_ESPECIALES,
    nombre: 'Operador Servicios Especiales',
    descripcion: 'Ejecución de servicios extras (pulido, cerámico, motor) con evidencias fotográficas.',
    color: '#9BCB3B',
    badgeClass: 'bg-lime-100 text-lime-800 border-lime-200',
    modulos: MODULOS_POR_ROL[Role.OPERADOR_SERVICIOS_ESPECIALES],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_distribuidor',
    codigo: Role.DISTRIBUIDOR,
    nombre: 'Distribuidor Central',
    descripcion: 'Control de inventario central, preparación de pedidos, despachos y confirmación de entregas.',
    color: '#475569',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    modulos: MODULOS_POR_ROL[Role.DISTRIBUIDOR],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  }
];

/** Usuario autenticado con contexto completo */
export interface UsuarioAuth {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  password?: string;
  role: Role | string;
  rolNombre: string;
  rolPersonalizado?: RolPersonalizado;
  modulosPermitidos: string[];
  sucursalId?: number;
  sucursal?: string;
  sucursalNombre?: string;
  region?: string;
  bahiaId?: number;
  bahiaNombre?: string;
  estado: 'Activo' | 'Inactivo';
  avatar?: string;
  token?: string;
  permisos?: PermisosRol;
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
  gestionarInventario: boolean;
  despacharSuministros: boolean;
}

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
    verConfiguracion: true,
    gestionarInventario: true,
    despacharSuministros: true
  },

  [Role.GERENTE]: {
    verTodasSucursales: false,
    crearSucursal: false,
    editarSucursal: false,
    crearUsuarios: false,
    asignarRoles: false,
    verOtrosSucursales: false,
    cambiarSucursalOperador: false,
    cambiarBahiaOperador: true,
    aprobarServicios: true,
    rechazarServicios: true,
    cerrarDia: true,
    registrarServicio: true,
    verTodosServicios: true,
    verMaquinaria: true,
    gestionarMantenimiento: false,
    registrarIncidente: true,
    verReportes: true,
    verProductividadGlobal: true,
    verConfiguracion: false,
    gestionarInventario: false,
    despacharSuministros: false
  },

  [Role.SUPERVISOR]: {
    verTodasSucursales: false,
    crearSucursal: false,
    editarSucursal: false,
    crearUsuarios: false,
    asignarRoles: false,
    verOtrosSucursales: false,
    cambiarSucursalOperador: false,
    cambiarBahiaOperador: true,
    aprobarServicios: false,
    rechazarServicios: false,
    cerrarDia: false,
    registrarServicio: true,
    verTodosServicios: true,
    verMaquinaria: true,
    gestionarMantenimiento: false,
    registrarIncidente: true,
    verReportes: true,
    verProductividadGlobal: false,
    verConfiguracion: false,
    gestionarInventario: false,
    despacharSuministros: false
  },

  [Role.COORD_MANTENIMIENTO]: {
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
    verMaquinaria: true,
    gestionarMantenimiento: true,
    registrarIncidente: true,
    verReportes: false,
    verProductividadGlobal: false,
    verConfiguracion: false,
    gestionarInventario: true,
    despacharSuministros: false
  },

  [Role.TECNICO]: {
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
    verMaquinaria: true,
    gestionarMantenimiento: true,
    registrarIncidente: true,
    verReportes: false,
    verProductividadGlobal: false,
    verConfiguracion: false,
    gestionarInventario: false,
    despacharSuministros: false
  },

  [Role.OPERADOR]: {
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
    registrarServicio: true,
    verTodosServicios: false,
    verMaquinaria: false,
    gestionarMantenimiento: false,
    registrarIncidente: false,
    verReportes: false,
    verProductividadGlobal: false,
    verConfiguracion: false,
    gestionarInventario: false,
    despacharSuministros: false
  },

  [Role.COORD_COMERCIAL]: {
    verTodasSucursales: true,
    crearSucursal: false,
    editarSucursal: false,
    crearUsuarios: false,
    asignarRoles: false,
    verOtrosSucursales: true,
    cambiarSucursalOperador: false,
    cambiarBahiaOperador: false,
    aprobarServicios: false,
    rechazarServicios: false,
    cerrarDia: false,
    registrarServicio: false,
    verTodosServicios: true,
    verMaquinaria: false,
    gestionarMantenimiento: false,
    registrarIncidente: false,
    verReportes: true,
    verProductividadGlobal: true,
    verConfiguracion: false,
    gestionarInventario: false,
    despacharSuministros: false
  },

  [Role.COORD_SERVICIOS_ESPECIALES]: {
    verTodasSucursales: false,
    crearSucursal: false,
    editarSucursal: false,
    crearUsuarios: false,
    asignarRoles: false,
    verOtrosSucursales: false,
    cambiarSucursalOperador: false,
    cambiarBahiaOperador: true,
    aprobarServicios: true,
    rechazarServicios: true,
    cerrarDia: false,
    registrarServicio: true,
    verTodosServicios: true,
    verMaquinaria: true,
    gestionarMantenimiento: false,
    registrarIncidente: true,
    verReportes: true,
    verProductividadGlobal: true,
    verConfiguracion: false,
    gestionarInventario: false,
    despacharSuministros: false
  },

  [Role.OPERADOR_SERVICIOS_ESPECIALES]: {
    verTodasSucursales: false,
    crearSucursal: false,
    editarSucursal: false,
    crearUsuarios: false,
    asignarRoles: false,
    verOtrosSucursales: false,
    cambiarSucursalOperador: false,
    cambiarBahiaOperador: false,
    aprobarServicios: false, // NO aprueba, solo ejecuta
    rechazarServicios: false,
    cerrarDia: false,
    registrarServicio: true,
    verTodosServicios: false,
    verMaquinaria: false,
    gestionarMantenimiento: false,
    registrarIncidente: false,
    verReportes: false,
    verProductividadGlobal: false,
    verConfiguracion: false,
    gestionarInventario: false,
    despacharSuministros: false
  },

  [Role.DISTRIBUIDOR]: {
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
    verConfiguracion: false,
    gestionarInventario: true,
    despacharSuministros: true
  }
};

export const ROLE_LABELS: Record<string, string> = {
  [Role.SUPER_ADMIN]: 'Super Administrador',
  [Role.SUPERVISOR]: 'Supervisor Regional',
  [Role.COORD_MANTENIMIENTO]: 'Coordinador Mantenimiento',
  [Role.TECNICO]: 'Técnico de Maquinaria',
  [Role.OPERADOR]: 'Operador de Bahía',
  [Role.COORD_COMERCIAL]: 'Coordinador Comercial',
  [Role.COORD_SERVICIOS_ESPECIALES]: 'Jefe Servicios Especiales',
  [Role.OPERADOR_SERVICIOS_ESPECIALES]: 'Operador Servicios Especiales',
  [Role.DISTRIBUIDOR]: 'Distribuidor Central'
};

export const ROLE_COLORS: Record<string, string> = {
  [Role.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 border-purple-200',
  [Role.SUPERVISOR]: 'bg-blue-100 text-blue-800 border-blue-200',
  [Role.COORD_MANTENIMIENTO]: 'bg-amber-100 text-amber-800 border-amber-200',
  [Role.TECNICO]: 'bg-orange-100 text-orange-800 border-orange-200',
  [Role.OPERADOR]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [Role.COORD_COMERCIAL]: 'bg-sky-100 text-sky-800 border-sky-200',
  [Role.COORD_SERVICIOS_ESPECIALES]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [Role.OPERADOR_SERVICIOS_ESPECIALES]: 'bg-lime-100 text-lime-800 border-lime-200',
  [Role.DISTRIBUIDOR]: 'bg-slate-100 text-slate-800 border-slate-200'
};

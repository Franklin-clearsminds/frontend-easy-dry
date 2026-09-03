// =========================================================
// EasyDry® - Sistema Oficial de Roles y Permisos RBAC
// =========================================================

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  GERENTE = 'GERENTE',
  SUPERVISOR = 'SUPERVISOR',
  COORD_MANTENIMIENTO = 'COORD_MANTENIMIENTO',
  TECNICO = 'TECNICO',
  OPERADOR = 'OPERADOR',
  COORD_COMERCIAL = 'COORD_COMERCIAL',
  COORD_SERVICIOS_ESPECIALES = 'COORD_SERVICIOS_ESPECIALES',
  OPERADOR_SERVICIOS_ESPECIALES = 'OPERADOR_SERVICIOS_ESPECIALES',
  DISTRIBUIDOR = 'DISTRIBUIDOR',
  ASISTENTE_BODEGA = 'ASISTENTE_BODEGA',
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

/** Módulos por defecto asignados a cada uno de los 11 roles oficiales */
export const MODULOS_POR_ROL: Record<string, string[]> = {
  [Role.SUPER_ADMIN]: MODULOS_SISTEMA.map(m => m.codigo),
  [Role.ADMIN]: MODULOS_SISTEMA.map(m => m.codigo),
  [Role.GERENTE]: [
    'dashboard',
    'notificaciones',
    'sucursales',
    'operadores',
    'servicios',
    'aprobaciones',
    'productividad',
    'maquinaria',
    'inventario',
    'reportes',
    'perfil'
  ],
  
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
  ],

  [Role.ASISTENTE_BODEGA]: [
    'dashboard',
    'notificaciones',
    'inventario',
    'perfil'
  ]
};

/** Ruta de inicio por defecto según rol */
export const DEFAULT_ROUTE_POR_ROL: Record<string, string> = {
  [Role.SUPER_ADMIN]: '/dashboard',
  [Role.ADMIN]: '/dashboard',
  [Role.GERENTE]: '/dashboard',
  [Role.SUPERVISOR]: '/dashboard',
  [Role.COORD_MANTENIMIENTO]: '/taller-tecnico',
  [Role.TECNICO]: '/taller-tecnico',
  [Role.OPERADOR]: '/mi-bahia',
  [Role.COORD_COMERCIAL]: '/dashboard',
  [Role.COORD_SERVICIOS_ESPECIALES]: '/dashboard',
  [Role.OPERADOR_SERVICIOS_ESPECIALES]: '/servicios',
  [Role.DISTRIBUIDOR]: '/inventario',
  [Role.ASISTENTE_BODEGA]: '/inventario'
};

/** Permisos granulares de acción por módulo (Ver vs Crear / Editar / Configurar) */
export interface PermisoModuloAcciones {
  moduloCodigo?: string;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  configurar: boolean;
}

/** Estructura de un Rol Dinámico / Personalizado */
export interface RolPersonalizado {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  badgeClass: string;
  modulos: string[];
  accionesModulos?: Record<string, { ver: boolean; crear: boolean; editar: boolean; configurar: boolean }>;
  esSistema: boolean;
  fechaCreacion: string;
  usuariosCount?: number;
}

export const ROLES_INICIALES: RolPersonalizado[] = [
  {
    id: 'rol_super_admin',
    codigo: Role.SUPER_ADMIN,
    nombre: 'Super Administrador',
    descripcion:
      'Nivel máximo de la plataforma. Acceso global inmutable: supervisión nacional, auditoría y gobierno del sistema. Sus permisos no pueden modificarse.',
    color: '#6D28D9',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    modulos: MODULOS_POR_ROL[Role.SUPER_ADMIN],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_admin',
    codigo: Role.ADMIN,
    nombre: 'Administrador',
    descripcion:
      'Administrador operativo de la plataforma. Gestiona usuarios, configuración y módulos asignados. Sus permisos pueden ajustarse por el Super Administrador.',
    color: '#7C3AED',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-200',
    modulos: MODULOS_POR_ROL[Role.ADMIN],
    esSistema: false,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_supervisor',
    codigo: Role.SUPERVISOR,
    nombre: 'Supervisor Regional',
    descripcion: 'Control operativo de sucursales asignadas, operadores, bahías y mapa operativo en vivo.',
    color: '#004282',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    modulos: MODULOS_POR_ROL[Role.SUPERVISOR],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_coord_mantenimiento',
    codigo: Role.COORD_MANTENIMIENTO,
    nombre: 'Gestor Técnico',
    descripcion: 'Gestión completa de maquinaria, órdenes de mantenimiento, incidentes y asignación de técnicos.',
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
    color: '#004282',
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
    descripcion: 'Ejecución de servicios especiales premium (pulido, cerámico, motor) con evidencias fotográficas y reporte de fallos de equipo móvil.',
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
    nombre: 'Gestor de Inventario',
    descripcion: 'Administra el inventario central: catálogo de insumos, stock, alertas, entradas de compra y despachos a sucursales.',
    color: '#475569',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    modulos: MODULOS_POR_ROL[Role.DISTRIBUIDOR],
    esSistema: true,
    fechaCreacion: '2026-01-01',
    usuariosCount: 1
  },
  {
    id: 'rol_asistente_bodega',
    codigo: Role.ASISTENTE_BODEGA,
    nombre: 'Asistente de Bodega',
    descripcion: 'Opera la bodega central: registra entradas de mercadería y despacha insumos a sucursales. No crea catálogo ni ajusta políticas de stock.',
    color: '#0F766E',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    modulos: MODULOS_POR_ROL[Role.ASISTENTE_BODEGA],
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
  sucursalesPermitidas?: number[];
  regionPermitida?: string;
  bahiaId?: number;
  bahiaNombre?: string;
  modalidadPulidor?: 'FIJO' | 'MOVIL';
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

  [Role.ADMIN]: {
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
    registrarIncidente: true,
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
    registrarIncidente: true,
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
  },

  [Role.ASISTENTE_BODEGA]: {
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
    gestionarInventario: false,
    despacharSuministros: true
  }
};

export const ROLE_LABELS: Record<string, string> = {
  [Role.SUPER_ADMIN]: 'Super Administrador',
  [Role.ADMIN]: 'Administrador',
  [Role.SUPERVISOR]: 'Supervisor Regional',
  [Role.COORD_MANTENIMIENTO]: 'Gestor Técnico',
  [Role.TECNICO]: 'Técnico de Maquinaria',
  [Role.OPERADOR]: 'Operador de Bahía',
  [Role.COORD_COMERCIAL]: 'Coordinador Comercial',
  [Role.COORD_SERVICIOS_ESPECIALES]: 'Jefe Servicios Especiales',
  [Role.OPERADOR_SERVICIOS_ESPECIALES]: 'Operador de Servicios Especiales',
  [Role.DISTRIBUIDOR]: 'Gestor de Inventario',
  [Role.ASISTENTE_BODEGA]: 'Asistente de Bodega',
  [Role.GERENTE]: 'Gerente de Sucursal',
};

export const ROLE_COLORS: Record<string, string> = {
  [Role.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 border-purple-200',
  [Role.ADMIN]: 'bg-violet-100 text-violet-800 border-violet-200',
  [Role.SUPERVISOR]: 'bg-blue-100 text-blue-800 border-blue-200',
  [Role.COORD_MANTENIMIENTO]: 'bg-amber-100 text-amber-800 border-amber-200',
  [Role.TECNICO]: 'bg-orange-100 text-orange-800 border-orange-200',
  [Role.OPERADOR]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [Role.COORD_COMERCIAL]: 'bg-sky-100 text-sky-800 border-sky-200',
  [Role.COORD_SERVICIOS_ESPECIALES]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [Role.OPERADOR_SERVICIOS_ESPECIALES]: 'bg-lime-100 text-lime-800 border-lime-200',
  [Role.DISTRIBUIDOR]: 'bg-slate-100 text-slate-800 border-slate-200',
  [Role.ASISTENTE_BODEGA]: 'bg-teal-100 text-teal-800 border-teal-200'
};

/** Códigos oficiales que no pueden eliminarse desde la matriz de roles */
export const ROLES_OFICIALES_NO_ELIMINABLES: string[] = [
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
  Role.ASISTENTE_BODEGA,
];

/** Solo el Super Administrador tiene permisos inmutables */
export function isRolPermisosInmutable(codigo?: string): boolean {
  return codigo === Role.SUPER_ADMIN;
}

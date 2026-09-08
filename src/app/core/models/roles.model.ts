// =========================================================
// EasyDry® - Sistema Oficial de Roles y Permisos RBAC
// Sincronizado con backend-easydry y USUARIOS-DEMO.md (14 roles)
// =========================================================

export enum Role {
  // ── Roles canónicos del backend (fuente de verdad) ──
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  JEFE_COMERCIAL = 'JEFE_COMERCIAL',
  COORD_COMERCIAL = 'COORD_COMERCIAL',
  /** Aprobador de agencia — cierre diario y auditoría de evidencias */
  APROBADOR = 'APROBADOR',
  /** Líder de agencia — control de bahías y registro de servicios generales */
  LIDER_AGENCIA = 'LIDER_AGENCIA',
  COORD_SERVICIOS_ESPECIALES = 'COORD_SERVICIOS_ESPECIALES',
  PULIDOR_FIJO = 'PULIDOR_FIJO',
  PULIDOR_MOVIL = 'PULIDOR_MOVIL',
  COORD_MANTENIMIENTO = 'COORD_MANTENIMIENTO',
  TECNICO = 'TECNICO',
  /** Coordinador de bodega — inventario nacional y despachos */
  COORD_BODEGA = 'COORD_BODEGA',
  ASISTENTE_BODEGA = 'ASISTENTE_BODEGA',
  // ── Aliases de retrocompatibilidad (deprecated — usar roles canónicos) ──
  /** @deprecated usar APROBADOR */
  GERENTE = 'APROBADOR',
  /** @deprecated usar LIDER_AGENCIA */
  OPERADOR = 'LIDER_AGENCIA',
  /** @deprecated usar COORD_BODEGA */
  DISTRIBUIDOR = 'COORD_BODEGA',
  /** @deprecated usar PULIDOR_MOVIL o PULIDOR_FIJO */
  OPERADOR_SERVICIOS_ESPECIALES = 'PULIDOR_MOVIL',
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

/** Módulos por defecto asignados a cada uno de los 14 roles oficiales del MD */
export const MODULOS_POR_ROL: Record<string, string[]> = {
  [Role.SUPER_ADMIN]: MODULOS_SISTEMA.map(m => m.codigo),
  [Role.ADMIN]: MODULOS_SISTEMA.map(m => m.codigo),

  /** Aprobador — cierre diario, auditoría de evidencias fotográficas */
  [Role.APROBADOR]: [
    'dashboard',
    'notificaciones',
    'sucursales',
    'operadores',
    'servicios',
    'configuracion/servicios',
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
    'configuracion/servicios',
    'productividad',
    'maquinaria',
    'taller-tecnico',
    'inventario',
    'reportes',
    'perfil'
  ],

  [Role.JEFE_COMERCIAL]: [
    'dashboard',
    'notificaciones',
    'productividad',
    'servicios',
    'configuracion/servicios',
    'reportes',
    'perfil'
  ],

  [Role.COORD_COMERCIAL]: [
    'dashboard',
    'notificaciones',
    'productividad',
    'servicios',
    'configuracion/servicios',
    'reportes',
    'perfil'
  ],

  /** Líder de agencia — control operativo de bahías y servicios generales */
  [Role.LIDER_AGENCIA]: [
    'dashboard',
    'notificaciones',
    'mi-bahia',
    'servicios',
    'configuracion/servicios',
    'maquinaria',
    'inventario',
    'perfil'
  ],

  [Role.COORD_SERVICIOS_ESPECIALES]: [
    'dashboard',
    'notificaciones',
    'servicios',
    'configuracion/servicios',
    'aprobaciones',
    'operadores',
    'asignaciones',
    'productividad',
    'maquinaria',
    'perfil'
  ],

  [Role.PULIDOR_FIJO]: [
    'dashboard',
    'notificaciones',
    'servicios',
    'mi-bahia',
    'inventario',
    'perfil'
  ],

  [Role.PULIDOR_MOVIL]: [
    'dashboard',
    'notificaciones',
    'servicios',
    'mi-bahia',
    'inventario',
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

  /** Coordinador de bodega — inventario nacional, recepción y despachos multi-región */
  [Role.COORD_BODEGA]: [
    'dashboard',
    'notificaciones',
    'inventario',
    'reportes',
    'perfil'
  ],

  [Role.ASISTENTE_BODEGA]: [
    'dashboard',
    'notificaciones',
    'inventario',
    'perfil'
  ]
};

/** Ruta de inicio por defecto según rol — sincronizado con 14 roles del MD */
export const DEFAULT_ROUTE_POR_ROL: Record<string, string> = {
  [Role.SUPER_ADMIN]: '/dashboard',
  [Role.ADMIN]: '/dashboard',
  [Role.APROBADOR]: '/dashboard',
  [Role.SUPERVISOR]: '/dashboard',
  [Role.JEFE_COMERCIAL]: '/dashboard',
  [Role.COORD_COMERCIAL]: '/dashboard',
  [Role.LIDER_AGENCIA]: '/mi-bahia',
  [Role.COORD_SERVICIOS_ESPECIALES]: '/dashboard',
  [Role.PULIDOR_FIJO]: '/servicios',
  [Role.PULIDOR_MOVIL]: '/servicios',
  [Role.COORD_MANTENIMIENTO]: '/taller-tecnico',
  [Role.TECNICO]: '/taller-tecnico',
  [Role.COORD_BODEGA]: '/inventario',
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
  /** UUID string del backend o número entero en modo mock */
  id: string | number;
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
  /** Access token JWT (localStorage en web, SecureStore en móvil) */
  token?: string;
  /** Refresh token para renovación automática de sesión */
  refreshToken?: string;
  /** ID de la agencia/sucursal asignada (UUID o entero según backend) */
  agenciaId?: string | number;
  regionId?: string | number;
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
  accionesEnvios: boolean;
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
    despacharSuministros: true,
    accionesEnvios: true
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
    despacharSuministros: true,
    accionesEnvios: true
  },

  /** APROBADOR — potestad exclusiva de aprobar/cancelar servicios en su agencia */
  [Role.APROBADOR]: {
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
    despacharSuministros: false,
    accionesEnvios: false
  },

  /** JEFE_COMERCIAL — visibilidad global de métricas y creación de retos nacionales */
  [Role.JEFE_COMERCIAL]: {
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
    despacharSuministros: false,
    accionesEnvios: false
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
    despacharSuministros: false,
    accionesEnvios: false
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
    despacharSuministros: false,
    accionesEnvios: false
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
    despacharSuministros: false,
    accionesEnvios: false
  },

  /** LIDER_AGENCIA — registro de OTs, control de bahías, incidentes y stock de su agencia */
  [Role.LIDER_AGENCIA]: {
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
    verReportes: false,
    verProductividadGlobal: false,
    verConfiguracion: false,
    gestionarInventario: true,
    despacharSuministros: false,
    accionesEnvios: true
  },

  /** PULIDOR_FIJO — servicios especiales en su sede fija */
  [Role.PULIDOR_FIJO]: {
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
    gestionarInventario: true,
    despacharSuministros: false,
    accionesEnvios: true
  },

  /** PULIDOR_MOVIL — servicios especiales multi-agencia */
  [Role.PULIDOR_MOVIL]: {
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
    gestionarInventario: true,
    despacharSuministros: false,
    accionesEnvios: true
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
    despacharSuministros: false,
    accionesEnvios: false
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
    despacharSuministros: false,
    accionesEnvios: false
  },

  /** COORD_BODEGA — inventario nacional, recepción de compras y despachos multi-región */
  [Role.COORD_BODEGA]: {
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
    verReportes: true,
    verProductividadGlobal: false,
    verConfiguracion: false,
    gestionarInventario: true,
    despacharSuministros: true,
    accionesEnvios: false
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
    despacharSuministros: true,
    accionesEnvios: false
  }
};

export const ROLE_LABELS: Record<string, string> = {
  [Role.SUPER_ADMIN]: 'Super Administrador',
  [Role.ADMIN]: 'Administrador',
  [Role.SUPERVISOR]: 'Supervisor Regional',
  [Role.JEFE_COMERCIAL]: 'Jefe Comercial',
  [Role.COORD_COMERCIAL]: 'Coordinador Comercial',
  [Role.APROBADOR]: 'Aprobador de Agencia',
  [Role.LIDER_AGENCIA]: 'Líder de Agencia',
  [Role.COORD_SERVICIOS_ESPECIALES]: 'Coordinador de Servicios Especiales',
  [Role.PULIDOR_FIJO]: 'Pulidor Fijo',
  [Role.PULIDOR_MOVIL]: 'Pulidor Móvil',
  [Role.COORD_MANTENIMIENTO]: 'Coordinador de Mantenimiento',
  [Role.TECNICO]: 'Técnico de Maquinaria',
  [Role.COORD_BODEGA]: 'Coordinador de Bodega',
  [Role.ASISTENTE_BODEGA]: 'Asistente de Bodega',
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

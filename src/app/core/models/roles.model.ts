// =========================================================
// EasyDry® - Sistema Oficial de Roles y Permisos RBAC
// Fuente de verdad: API/BD (módulos, roles y acciones)
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
  /** Líder Operador — OTs, inventario de agencia, recepción y despachos intra-región */
  LIDER_OPERADOR = 'LIDER',
  /** @deprecated usar LIDER / LIDER_OPERADOR */
  LIDER_AGENCIA = 'LIDER',
  /** Lavador de bahía — registro en BD para constancia y trazabilidad de productividad */
  LAVADOR = 'LAVADOR',
  /** @deprecated usar LAVADOR */
  OPERADOR = 'LAVADOR',
  COORD_SERVICIOS_ESPECIALES = 'COORD_SERVICIOS_ESPECIALES',
  /** Pulidor — especialista en pulido, cerámico y detailing (fijo=con agencia; móvil=sin agencia + región) */
  PULIDOR = 'PULIDOR',
  /** @deprecated usar PULIDOR */
  PULIDOR_FIJO = 'PULIDOR',
  /** @deprecated usar PULIDOR */
  PULIDOR_MOVIL = 'PULIDOR',
  COORD_MANTENIMIENTO = 'COORD_MANTENIMIENTO',
  TECNICO = 'TECNICO',
  /** Coordinador de bodega — inventario nacional y despachos */
  COORD_BODEGA = 'COORD_BODEGA',
  ASISTENTE_BODEGA = 'ASISTENTE_BODEGA',
  // ── Aliases de retrocompatibilidad (deprecated — usar roles canónicos) ──
  /** @deprecated usar APROBADOR */
  GERENTE = 'APROBADOR',
  /** @deprecated usar COORD_BODEGA */
  DISTRIBUIDOR = 'COORD_BODEGA',
  /** @deprecated usar PULIDOR */
  OPERADOR_SERVICIOS_ESPECIALES = 'PULIDOR',
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
  /** Grupo funcional; valor libre desde BD */
  grupo: string;
}

/**
 * @deprecated Catálogo estático eliminado. Usar RolService.getModulos() (API POST /roles/modulos/list).
 */
export const MODULOS_SISTEMA: ModuloSistema[] = [];

/**
 * @deprecated Módulos por rol vienen de la API/BD. No usar como fuente de verdad.
 */
export const MODULOS_POR_ROL: Record<string, string[]> = {};

/** Ruta de inicio por defecto según rol */
export const DEFAULT_ROUTE_POR_ROL: Record<string, string> = {
  [Role.SUPER_ADMIN]: '/dashboard',
  [Role.ADMIN]: '/dashboard',
  [Role.APROBADOR]: '/aprobaciones',
  [Role.SUPERVISOR]: '/dashboard',
  [Role.JEFE_COMERCIAL]: '/dashboard',
  [Role.COORD_COMERCIAL]: '/dashboard',
  [Role.LIDER_OPERADOR]: '/servicios',
  [Role.LAVADOR]: '/perfil',
  [Role.COORD_SERVICIOS_ESPECIALES]: '/dashboard',
  [Role.PULIDOR]: '/servicios',
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
  color?: string;
  badgeClass?: string;
  modulos: string[];
  accionesModulos?: Record<string, { ver: boolean; crear: boolean; editar: boolean; configurar: boolean }>;
  estado?: string | number;
  esSistema: boolean;
  fechaCreacion: string;
  fechaModificacion?: string;
  usuariosCount?: number;
}

/**
 * @deprecated Roles iniciales hardcodeados eliminados. Usar RolService.getRoles() (API).
 */
export const ROLES_INICIALES: RolPersonalizado[] = [];

/** Usuario autenticado con contexto completo */
export interface UsuarioAuth {
  /** UUID string del backend o número entero legacy */
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
  regionNombre?: string;
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
  /** Bodega asignada (ASISTENTE_BODEGA → regional; opcional en otros roles) */
  bodegaId?: string | number;
  /** Servicios asignados al pulidor móvil (ids CatalogoServicio) */
  servicioIds?: number[];
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

/** Fallback seguro: todas las acciones en false */
export const ACCIONES_VACIAS: PermisosRol = {
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
  despacharSuministros: false,
  accionesEnvios: false
};

/**
 * @deprecated Permisos por rol vienen de la API/BD (login.acciones). Usar ACCIONES_VACIAS como fallback.
 */
export const PERMISOS_POR_ROL: Record<string, PermisosRol> = {};

/** Coordinador de mantenimiento y técnico de maquinaria (asignación de taller). */
export function esRolTallerMantenimiento(rol?: string | null): boolean {
  const raw = String(rol || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  if (!raw) return false;
  if (raw === Role.COORD_MANTENIMIENTO || raw === Role.TECNICO) return true;
  if (raw.includes('COORD_MANTENIMIENTO')) return true;
  const esCoordMant = raw.includes('COORDINADOR') && raw.includes('MANTENIMIENTO');
  const esTecMaq = raw.includes('TECNICO') && (raw.includes('MAQUIN') || raw.includes('TALLER') || raw === 'TECNICO');
  return esCoordMant || esTecMaq;
}

export const ROLE_LABELS: Record<string, string> = {
  [Role.SUPER_ADMIN]: 'Super Administrador',
  [Role.ADMIN]: 'Administrador',
  [Role.APROBADOR]: 'Aprobador',
  [Role.SUPERVISOR]: 'Supervisor Regional',
  [Role.JEFE_COMERCIAL]: 'Jefe Comercial',
  [Role.COORD_COMERCIAL]: 'Coordinador Comercial',
  [Role.LIDER_OPERADOR]: 'Líder Operador',
  [Role.LAVADOR]: 'Lavador',
  [Role.COORD_SERVICIOS_ESPECIALES]: 'Coordinador de Servicios Especiales',
  [Role.PULIDOR]: 'Pulidor',
  [Role.COORD_MANTENIMIENTO]: 'Coordinador de Mantenimiento',
  [Role.TECNICO]: 'Técnico de Maquinaria',
  [Role.COORD_BODEGA]: 'Coordinador de Bodega',
  [Role.ASISTENTE_BODEGA]: 'Asistente de Bodega',
  'PULIDOR_FIJO': 'Pulidor Fijo',
  'PULIDOR_MOVIL': 'Pulidor Móvil',
  'DISTRIBUIDOR': 'Coordinador de Bodega',
  'LIDER_AGENCIA': 'Líder Operador',
};

export const ROLE_COLORS: Record<string, string> = {
  [Role.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 border-purple-200',
  [Role.ADMIN]: 'bg-violet-100 text-violet-800 border-violet-200',
  [Role.APROBADOR]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [Role.SUPERVISOR]: 'bg-blue-100 text-blue-800 border-blue-200',
  [Role.JEFE_COMERCIAL]: 'bg-blue-100 text-blue-800 border-blue-200',
  [Role.COORD_COMERCIAL]: 'bg-sky-100 text-sky-800 border-sky-200',
  [Role.COORD_MANTENIMIENTO]: 'bg-amber-100 text-amber-800 border-amber-200',
  [Role.TECNICO]: 'bg-orange-100 text-orange-800 border-orange-200',
  [Role.LIDER_OPERADOR]: 'bg-teal-100 text-teal-800 border-teal-200',
  [Role.LAVADOR]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [Role.COORD_SERVICIOS_ESPECIALES]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [Role.PULIDOR]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [Role.COORD_BODEGA]: 'bg-slate-100 text-slate-800 border-slate-200',
  [Role.ASISTENTE_BODEGA]: 'bg-teal-100 text-teal-800 border-teal-200',
  'PULIDOR_FIJO': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'PULIDOR_MOVIL': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'DISTRIBUIDOR': 'bg-slate-100 text-slate-800 border-slate-200',
  'OPERADOR_SERVICIOS_ESPECIALES': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'LIDER_AGENCIA': 'bg-teal-100 text-teal-800 border-teal-200',
};

/** Códigos oficiales que no pueden eliminarse desde la matriz de roles */
export const ROLES_OFICIALES_NO_ELIMINABLES: string[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.COORD_MANTENIMIENTO,
  Role.TECNICO,
  Role.LIDER_OPERADOR,
  Role.LAVADOR,
  Role.COORD_COMERCIAL,
  Role.COORD_SERVICIOS_ESPECIALES,
  Role.OPERADOR_SERVICIOS_ESPECIALES,
  Role.COORD_BODEGA,
  Role.ASISTENTE_BODEGA,
];

/** Solo el Super Administrador tiene permisos inmutables */
export function isRolPermisosInmutable(codigo?: string): boolean {
  return codigo === Role.SUPER_ADMIN;
}

// =========================================================
// EasyDry® - Sistema de Roles y Permisos
// =========================================================

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GERENTE = 'GERENTE',
  SUPERVISOR = 'SUPERVISOR',
  OPERADOR = 'OPERADOR',
  TECNICO = 'TECNICO'
}

/** Usuario autenticado con contexto completo de rol */
export interface UsuarioAuth {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  role: Role;
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

/** Mapa de permisos por rol */
export const PERMISOS_POR_ROL: Record<Role, PermisosRol> = {
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
    verTodosServicios: false,
    verMaquinaria: true,
    gestionarMantenimiento: false,
    registrarIncidente: true,
    verReportes: true,
    verProductividadGlobal: false,
    verConfiguracion: false
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
    verTodosServicios: false,
    verMaquinaria: true,
    gestionarMantenimiento: false,
    registrarIncidente: true,
    verReportes: false,
    verProductividadGlobal: true,
    verConfiguracion: false
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
    verConfiguracion: false
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
    verConfiguracion: false
  }
};

/** Label legible por pantalla para cada rol */
export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super Administrador',
  [Role.GERENTE]: 'Gerente de Sucursal',
  [Role.SUPERVISOR]: 'Supervisor Operativo',
  [Role.OPERADOR]: 'Operador de Bahía',
  [Role.TECNICO]: 'Técnico de Mantenimiento'
};

/** Color badge por rol */
export const ROLE_COLORS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 border-purple-200',
  [Role.GERENTE]: 'bg-easydry-blue/10 text-easydry-blue border-easydry-blue/20',
  [Role.SUPERVISOR]: 'bg-amber-100 text-amber-800 border-amber-200',
  [Role.OPERADOR]: 'bg-easydry-green/15 text-easydry-green-dark border-easydry-green/25',
  [Role.TECNICO]: 'bg-slate-100 text-slate-700 border-slate-200'
};

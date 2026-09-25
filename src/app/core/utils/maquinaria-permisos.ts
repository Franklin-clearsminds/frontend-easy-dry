import { Role } from '../models/roles.model';

/**
 * Matriz de permisos del módulo de maquinaria (espejo de maquinaria.permisos.ts del backend).
 * El backend valida siempre; esto solo oculta acciones que el usuario no podría ejecutar.
 */

const norm = (rol?: string | null): string => String(rol || '').toUpperCase().trim();

export const ROLES_PULIDOR = ['PULIDOR', 'PULIDOR_FIJO', 'PULIDOR_MOVIL'];
export const ROLES_LIDER = ['LIDER', 'LIDER_OPERADOR', 'LIDER_AGENCIA'];
export const ROLES_OPERADOR_MAQUINA = [...ROLES_PULIDOR, ...ROLES_LIDER];

const ADMIN: string[] = [Role.SUPER_ADMIN, Role.ADMIN];

/** Roles que pueden ver el módulo de maquinaria. */
export const ROLES_VER_MAQUINARIA: string[] = [
  Role.SUPER_ADMIN, Role.ADMIN, Role.COORD_BODEGA, Role.COORD_MANTENIMIENTO, Role.TECNICO,
  ...ROLES_OPERADOR_MAQUINA,
];

const enLista = (rol: string | null | undefined, lista: string[]) => lista.includes(norm(rol));

export const esAdminMaquinaria = (rol?: string | null) => enLista(rol, ADMIN);
export const esOperadorMaquina = (rol?: string | null) => enLista(rol, ROLES_OPERADOR_MAQUINA);

export const puedeCrearMaquina = (rol?: string | null) =>
  enLista(rol, [...ADMIN, Role.COORD_BODEGA]);
export const puedeEditarMaquina = (rol?: string | null) => enLista(rol, ADMIN);
export const puedeActivarMaquina = (rol?: string | null) => enLista(rol, ADMIN);
/** Asignar operador, ventana de adelanto, transferir, programar y asignar trabajos. */
export const puedeGestionarMaquina = (rol?: string | null) =>
  enLista(rol, [...ADMIN, Role.COORD_MANTENIMIENTO]);
export const puedeVerTrazabilidad = (rol?: string | null) =>
  enLista(rol, [...ADMIN, Role.COORD_MANTENIMIENTO]);
export const puedeVerMantenimientos = (rol?: string | null) =>
  enLista(rol, [...ADMIN, Role.COORD_MANTENIMIENTO, Role.TECNICO]);
/** Reportar incidencia: solo operadores (pulidor/líder) sobre máquinas asignadas a ellos. */
export const puedeReportarIncidente = (rol?: string | null) => esOperadorMaquina(rol);
/** Resolver / ejecutar / editar: técnicos y coordinación (el backend exige además ser el asignado). */
export const puedeTrabajarOrden = (rol?: string | null) =>
  enLista(rol, [...ADMIN, Role.COORD_MANTENIMIENTO, Role.TECNICO]);

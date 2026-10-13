import { Role } from '../models/roles.model';

/** Roles operativos de la app móvil — también pueden ingresar a la web con las mismas credenciales. */
export const MOBILE_APP_ROLES: Role[] = [
  Role.LAVADOR,
  Role.TECNICO,
  Role.COORD_MANTENIMIENTO,
  Role.PULIDOR,
  Role.COORD_SERVICIOS_ESPECIALES,
  Role.COORD_BODEGA,
  Role.ASISTENTE_BODEGA,
];

/** Orden de visualización en login (igual que la app móvil). */
export const MOBILE_APP_ROLES_ORDER: Role[] = [
  Role.LAVADOR,
  Role.TECNICO,
  Role.COORD_MANTENIMIENTO,
  Role.PULIDOR,
  Role.COORD_SERVICIOS_ESPECIALES,
  Role.COORD_BODEGA,
  Role.ASISTENTE_BODEGA,
];

export function isMobileAppRole(role?: Role | string): boolean {
  if (!role) return false;
  return MOBILE_APP_ROLES.includes(role as Role);
}

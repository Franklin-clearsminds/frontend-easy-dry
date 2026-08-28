import { Role } from '../models/roles.model';

/** Roles operativos de la app móvil — también pueden ingresar a la web con las mismas credenciales. */
export const MOBILE_APP_ROLES: Role[] = [
  Role.OPERADOR,
  Role.TECNICO,
  Role.COORD_MANTENIMIENTO,
  Role.OPERADOR_SERVICIOS_ESPECIALES,
];

/** Orden de visualización en login (igual que la app móvil). */
export const MOBILE_APP_ROLES_ORDER: Role[] = [
  Role.OPERADOR,
  Role.TECNICO,
  Role.COORD_MANTENIMIENTO,
  Role.OPERADOR_SERVICIOS_ESPECIALES,
];

export function isMobileAppRole(role?: Role | string): boolean {
  if (!role) return false;
  return MOBILE_APP_ROLES.includes(role as Role);
}

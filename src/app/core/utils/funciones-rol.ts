/**
 * Funciones del rol: lo que el rol «es» para el sistema (líder de agencia, pulidor, técnico…), guardado como casillas
 * `funcion.*` en sus permisos. Es la copia de `backend-easydry/src/common/permisos/funciones.ts`: la pantalla decide con estas casillas
 * y no con el nombre del rol, así un rol creado desde «Roles y permisos» con las mismas casillas se comporta igual que el oficial.
 * Un rol que todavía no guarda ninguna función se interpreta por el nombre del rol oficial.
 */
export const FUNCION = {
  ADMINISTRADOR: 'funcion.administrador',
  LIDER_AGENCIA: 'funcion.lider_agencia',
  LIDER: 'funcion.lider',
  AUXILIAR: 'funcion.auxiliar',
  BACKUP: 'funcion.backup',
  LAVADOR: 'funcion.lavador',
  APROBADOR: 'funcion.aprobador',
  PULIDOR: 'funcion.pulidor',
  TECNICO: 'funcion.tecnico',
  COORD_MANTENIMIENTO: 'funcion.coord_mantenimiento',
  SUPERVISOR: 'funcion.supervisor',
  COORD_ESPECIALES: 'funcion.coord_especiales',
  COMERCIAL: 'funcion.comercial',
  COMERCIAL_NACIONAL: 'funcion.comercial_nacional',
  COORD_BODEGA: 'funcion.coord_bodega',
  ASISTENTE_BODEGA: 'funcion.asistente_bodega',
} as const;

export type CodigoFuncion = (typeof FUNCION)[keyof typeof FUNCION];

const FUNCIONES_DE_ROL_OFICIAL: Readonly<Record<string, readonly CodigoFuncion[]>> = {
  SUPER_ADMIN: [FUNCION.ADMINISTRADOR],
  ADMIN: [FUNCION.ADMINISTRADOR],
  SUPERVISOR: [FUNCION.SUPERVISOR],
  COORD_MANTENIMIENTO: [FUNCION.COORD_MANTENIMIENTO],
  COORD_SERVICIOS_ESPECIALES: [FUNCION.COORD_ESPECIALES],
  COORD_COMERCIAL: [FUNCION.COMERCIAL],
  JEFE_COMERCIAL: [FUNCION.COMERCIAL, FUNCION.COMERCIAL_NACIONAL],
  COORD_BODEGA: [FUNCION.COORD_BODEGA],
  ASISTENTE_BODEGA: [FUNCION.ASISTENTE_BODEGA],
  TECNICO: [FUNCION.TECNICO],
  PULIDOR: [FUNCION.PULIDOR],
  LIDER: [FUNCION.LIDER_AGENCIA, FUNCION.LIDER],
  BACKUP: [FUNCION.LIDER_AGENCIA, FUNCION.BACKUP],
  AUXILIAR: [FUNCION.LIDER_AGENCIA, FUNCION.AUXILIAR, FUNCION.LAVADOR],
  LAVADOR: [FUNCION.LAVADOR],
  APROBADOR: [FUNCION.APROBADOR],
};

/** Funciones de un rol: las que guarda y, si no guarda ninguna, las de su nombre oficial. */
export function funcionesDeRol(capacidades: readonly string[] | null | undefined, namerol: unknown): ReadonlySet<string> {
  const propias = (capacidades ?? []).filter((c) => c.startsWith('funcion.'));
  if (propias.length > 0) return new Set(propias);
  const nombre = String(namerol ?? '').trim().toUpperCase();
  return new Set(FUNCIONES_DE_ROL_OFICIAL[nombre] ?? []);
}

/** Atajo para datos que traen `role` como objeto (`{ namerol, capacidades }`) o como texto. */
export function conFuncion(u: any, f: CodigoFuncion): boolean {
  const role = u?.role;
  const nombre = typeof role === 'string' ? role : role?.namerol;
  return funcionesDeRol(role?.capacidades, nombre).has(f);
}

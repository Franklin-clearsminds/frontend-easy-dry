export type ModalidadPulidor = 'FIJO' | 'MOVIL';

export function esRolOperadorEspeciales(rol?: string): boolean {
  if (!rol) return false;
  const n = rol.toLowerCase();
  if (n.includes('jefe') || n.includes('coord')) return false;
  return (
    n.includes('pulidor') ||
    n === 'operador_servicios_especiales' ||
    n.includes('operador de servicios especiales') ||
    n.includes('operador servicios especiales')
  );
}

export function sucursalesEquivalentes(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/easydry/gi, '')
      .replace(/·/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || a.toLowerCase().includes(nb) || b.toLowerCase().includes(na);
}

export function operadorEspecialPuedeSucursal(
  operador: { modalidadPulidor?: ModalidadPulidor; sucursalNombre?: string; sucursal?: string },
  sucursalDestino: string
): boolean {
  if (!operador.modalidadPulidor || operador.modalidadPulidor === 'MOVIL') return true;
  return sucursalesEquivalentes(
    operador.sucursalNombre || operador.sucursal,
    sucursalDestino
  );
}

export const LABEL_MODALIDAD_PULIDOR: Record<ModalidadPulidor, string> = {
  FIJO: 'Fijo en sucursal',
  MOVIL: 'Móvil · Red nacional',
};

/** Debe coincidir con `backend-easydry/src/common/utils/password-politica.ts` (el servidor es quien la exige de verdad). */
export const PASSWORD_LARGO_MINIMO = 10;
export const PASSWORD_MENSAJE = `Mínimo ${PASSWORD_LARGO_MINIMO} caracteres, con mayúscula, minúscula y número.`;

export function passwordCumplePolitica(password: string | null | undefined): boolean {
  const p = (password ?? '').trim();
  return p.length >= PASSWORD_LARGO_MINIMO && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);
}

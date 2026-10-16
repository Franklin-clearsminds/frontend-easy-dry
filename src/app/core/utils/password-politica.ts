/** Debe coincidir con `backend-easydry/src/common/utils/password-politica.ts` (el servidor es quien la exige de verdad). */
export const PASSWORD_LARGO_MINIMO = 10;
export const PASSWORD_MENSAJE = `Mínimo ${PASSWORD_LARGO_MINIMO} caracteres, con mayúscula, minúscula, número y un carácter especial (por ejemplo ! @ # $ % & * ?).`;

const COMUNES = ['password', 'contraseña', 'contrasena', 'qwerty', '123456', 'abc123', 'easydry', 'admin', 'bienvenido'];
const ESPECIAL = /[^\p{L}\p{N}\s]/u;

/** ¿Hay 4 o más caracteres iguales seguidos (aaaa) o consecutivos, ascendentes o descendentes (1234, abcd, dcba)? */
function tieneSecuenciaObvia(minuscula: string, n = 4): boolean {
  let iguales = 1;
  let sube = 1;
  let baja = 1;
  for (let i = 1; i < minuscula.length; i++) {
    const d = minuscula.charCodeAt(i) - minuscula.charCodeAt(i - 1);
    const alfanumerico = /[a-z0-9]/.test(minuscula[i]) && /[a-z0-9]/.test(minuscula[i - 1]);
    iguales = d === 0 ? iguales + 1 : 1;
    sube = d === 1 && alfanumerico ? sube + 1 : 1;
    baja = d === -1 && alfanumerico ? baja + 1 : 1;
    if (iguales >= n || sube >= n || baja >= n) return true;
  }
  return false;
}

/** Motivo por el que la contraseña no sirve, o `null` si cumple la política. */
export function motivoPasswordDebil(password: string | null | undefined, email?: string): string | null {
  const p = (password ?? '').trim();
  if (p.length < PASSWORD_LARGO_MINIMO || !/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/\d/.test(p) || !ESPECIAL.test(p)) return PASSWORD_MENSAJE;
  const minuscula = p.toLowerCase();
  if (COMUNES.some((c) => minuscula.includes(c))) return 'Es demasiado común: evita palabras como "password", "admin" o "123456".';
  if (tieneSecuenciaObvia(minuscula)) return 'No puede tener secuencias obvias (1234, abcd) ni cuatro caracteres iguales seguidos.';
  const usuario = (email ?? '').split('@')[0].toLowerCase();
  if (usuario.length >= 4 && minuscula.includes(usuario)) return 'No puede contener el correo del usuario.';
  return null;
}

export function passwordCumplePolitica(password: string | null | undefined, email?: string): boolean {
  return motivoPasswordDebil(password, email) === null;
}

export interface RequisitoPassword {
  clave: string;
  texto: string;
  cumple: boolean;
}

/**
 * Cada condición de la política por separado, para mostrar en vivo cuál falta mientras se escribe. Todas cumplidas equivale a
 * `passwordCumplePolitica` verdadero.
 */
export function requisitosPassword(password: string | null | undefined, email?: string): RequisitoPassword[] {
  const crudo = password ?? '';
  const p = crudo.trim();
  const minuscula = p.toLowerCase();
  const usuario = (email ?? '').split('@')[0].toLowerCase();
  return [
    { clave: 'largo', texto: `Al menos ${PASSWORD_LARGO_MINIMO} caracteres`, cumple: p.length >= PASSWORD_LARGO_MINIMO },
    { clave: 'mayuscula', texto: 'Una letra mayúscula (A-Z)', cumple: /[A-Z]/.test(p) },
    { clave: 'minuscula', texto: 'Una letra minúscula (a-z)', cumple: /[a-z]/.test(p) },
    { clave: 'numero', texto: 'Un número (0-9)', cumple: /\d/.test(p) },
    { clave: 'especial', texto: 'Un carácter especial (! @ # $ % & * ?)', cumple: ESPECIAL.test(p) },
    { clave: 'secuencias', texto: 'Sin secuencias obvias (1234, abcd) ni 4 caracteres iguales seguidos', cumple: !tieneSecuenciaObvia(minuscula) },
    { clave: 'comun', texto: 'Sin palabras comunes (password, admin, 123456…)', cumple: !COMUNES.some((c) => minuscula.includes(c)) },
    ...(usuario.length >= 4 ? [{ clave: 'correo', texto: 'Sin el correo del usuario', cumple: !minuscula.includes(usuario) }] : []),
  ];
}

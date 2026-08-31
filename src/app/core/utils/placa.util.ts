export type TipoPlaca = 'PARTICULAR' | 'MOTO' | 'INVALIDA';

export interface ResultadoPlaca {
  placa: string;
  valida: boolean;
  tipo: TipoPlaca;
  provincia?: string;
  mensaje: string;
}

/** Primera letra según ANT Ecuador */
export const PROVINCIAS_PLACA: Record<string, string> = {
  A: 'Azuay',
  B: 'Bolívar',
  C: 'Carchi',
  E: 'Esmeraldas',
  G: 'Guayas',
  H: 'Chimborazo',
  I: 'Imbabura',
  J: 'Loja',
  K: 'Sucumbíos',
  L: 'Cotopaxi',
  M: 'Manabí',
  N: 'Napo',
  O: 'El Oro',
  P: 'Pichincha',
  Q: 'Orellana',
  R: 'Los Ríos',
  S: 'Morona Santiago',
  T: 'Tungurahua',
  U: 'Cañar',
  V: 'Pastaza',
  W: 'Galápagos',
  X: 'Santo Domingo de los Tsáchilas',
  Y: 'Santa Elena',
  Z: 'Zamora Chinchipe'
};

const RE_PARTICULAR = /^[A-Z]{3}-\d{4}$/;
const RE_MOTO = /^[A-Z]{3}-\d{3}$/;

/** Normaliza a AAA-1234 / AAA-123. */
export function formatearPlaca(valor: string): string {
  const raw = (valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let letras = '';
  let numeros = '';
  for (const ch of raw) {
    if (numeros.length === 0 && /[A-Z]/.test(ch) && letras.length < 3) {
      letras += ch;
    } else if (/[0-9]/.test(ch) && letras.length === 3 && numeros.length < 4) {
      numeros += ch;
    }
  }
  if (!numeros) return letras;
  return `${letras}-${numeros}`;
}

export function validarPlaca(valor: string): ResultadoPlaca {
  const placa = formatearPlaca(valor);
  if (!placa) {
    return { placa: '', valida: false, tipo: 'INVALIDA', mensaje: 'Ingrese la placa del vehículo.' };
  }

  const esParticular = RE_PARTICULAR.test(placa);
  const esMoto = RE_MOTO.test(placa);

  if (!esParticular && !esMoto) {
    return {
      placa,
      valida: false,
      tipo: 'INVALIDA',
      mensaje: 'Formato inválido. Use AAA-1234 (auto) o AAA-123 (moto), según ANT Ecuador.'
    };
  }

  const provincia = PROVINCIAS_PLACA[placa[0]];
  if (!provincia) {
    return {
      placa,
      valida: false,
      tipo: 'INVALIDA',
      mensaje: `La letra inicial "${placa[0]}" no corresponde a una provincia del Ecuador.`
    };
  }

  const tipo: TipoPlaca = esParticular ? 'PARTICULAR' : 'MOTO';
  return {
    placa,
    valida: true,
    tipo,
    provincia,
    mensaje: `${provincia} · ${tipo === 'PARTICULAR' ? 'Particular / comercial' : 'Motocicleta'}`
  };
}

export function placasEquivalentes(a: string, b: string): boolean {
  const pa = formatearPlaca(a);
  const pb = formatearPlaca(b);
  return pa.length > 0 && pa === pb;
}

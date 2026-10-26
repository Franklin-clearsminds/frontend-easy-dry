/**
 * Texto que explica, en el modal «Configurar rol», qué alcance tiene el rol y si se puede cambiar.
 *
 * Vive fuera del componente porque refleja una regla que aplica el servidor
 * (backend-easydry/src/modules/roles/roles.service.ts) y conviene poder probarla sola:
 *  - BACKUP: solo el Súper Administrador cambia su alcance, y solo entre Agencia y Región.
 *  - Cualquier otro rol oficial: el alcance es fijo (el servidor rechaza el cambio).
 *  - Rol propio: se puede elegir cualquier alcance, sin superar el de quien lo edita.
 */

/** 'fijo' = no se puede cambiar · 'backup' = excepción de BACKUP · 'libre' = rol propio. */
export type TonoNotaAmbito = 'fijo' | 'backup' | 'libre';

export interface NotaAmbito {
  tono: TonoNotaAmbito;
  texto: string;
}

export interface EntradaNotaAmbito {
  codigoRol?: string;
  /** El rol tiene la función «Backup» (aunque no se llame BACKUP). */
  esBackup?: boolean;
  nombreRol: string;
  /** GLOBAL, REGION, AGENCIA o PROPIO. */
  ambito: string;
  /** Nombre corto del ámbito tal como lo ve el usuario («Su agencia», «Todo el país»…). */
  ambitoCorto: string;
  esSistema: boolean;
  /** true al editar un rol que ya existe; false al crear uno nuevo. */
  editando: boolean;
  soloLectura: boolean;
  esSuperAdmin: boolean;
}

/** Cómo se vincula al sistema un usuario según el alcance del rol. */
const COMO_SE_ASIGNA: Record<string, string> = {
  GLOBAL: 'este rol ve y actúa sobre los datos de toda la red, así que el usuario no se vincula a ninguna agencia ni región.',
  REGION: 'cada usuario con este rol se asigna a una región y ve todas las agencias de esa región.',
  AGENCIA: 'cada usuario con este rol se asigna a una agencia y solo ve los datos de esa sede.',
  PROPIO: 'cada usuario con este rol solo ve lo que se le asignó personalmente.',
};

export function construirNotaAmbito(e: EntradaNotaAmbito): NotaAmbito {
  const codigo = (e.codigoRol || '').toUpperCase().trim();

  if (codigo === 'BACKUP' || e.esBackup) {
    return {
      tono: 'backup',
      texto:
        'En BACKUP puedes elegir Agencia para limitarlo a una sede asignada, o Región para darle acceso a todas las agencias de su región. Solo el Super Administrador puede cambiar este alcance.',
    };
  }

  if (e.editando && e.esSistema) {
    if (codigo === 'SUPER_ADMIN') {
      return {
        tono: 'fijo',
        texto: 'El Súper Administrador siempre actúa sobre todo el país y este alcance no se puede modificar.',
      };
    }
    const comoSeAsigna = COMO_SE_ASIGNA[e.ambito] ?? '';
    return {
      tono: 'fijo',
      texto:
        `En ${e.nombreRol} el alcance es «${e.ambitoCorto}» y es fijo: ${comoSeAsigna} ` +
        'Es un rol oficial y el sistema depende de este alcance, por eso no se puede cambiar. ' +
        'Si necesitas otro alcance, el Súper Administrador puede crear un rol nuevo.',
    };
  }

  if (e.soloLectura) {
    return { tono: 'libre', texto: 'Tu rol puede consultar el alcance de este rol, pero no cambiarlo.' };
  }

  const regla = e.esSuperAdmin
    ? 'En un rol propio puedes elegir cualquiera de los cuatro alcances.'
    : 'En un rol propio puedes elegir hasta el alcance de tu propio rol: no se puede dar uno más amplio que el tuyo.';
  return {
    tono: 'libre',
    texto: `${regla} Región y Agencia obligan a asignar la región o la agencia a cada usuario que tenga el rol.`,
  };
}

import { EntradaNotaAmbito, construirNotaAmbito } from './ambito-rol';

const CORTO: Record<string, string> = {
  GLOBAL: 'Todo el país',
  REGION: 'Su región',
  AGENCIA: 'Su agencia',
  PROPIO: 'Solo lo asignado a él',
};

function entrada(parcial: Partial<EntradaNotaAmbito>): EntradaNotaAmbito {
  const ambito = parcial.ambito ?? 'AGENCIA';
  return {
    codigoRol: 'LIDER',
    nombreRol: 'Líder Operador',
    ambito,
    ambitoCorto: CORTO[ambito],
    esSistema: true,
    editando: true,
    soloLectura: false,
    esSuperAdmin: true,
    ...parcial,
  };
}

describe('construirNotaAmbito', () => {
  it('BACKUP conserva su explicación: puede ser Agencia o Región y solo el Súper Administrador lo cambia', () => {
    const n = construirNotaAmbito(entrada({ codigoRol: 'BACKUP', nombreRol: 'Backup' }));
    expect(n.tono).toBe('backup');
    expect(n.texto).toContain('En BACKUP puedes elegir Agencia');
    expect(n.texto).toContain('Solo el Super Administrador puede cambiar este alcance');
  });

  it('un rol oficial de agencia explica que es fijo y que el usuario ve solo su sede', () => {
    const n = construirNotaAmbito(entrada({ codigoRol: 'LIDER', nombreRol: 'Líder Operador', ambito: 'AGENCIA' }));
    expect(n.tono).toBe('fijo');
    expect(n.texto).toContain('«Su agencia»');
    expect(n.texto).toContain('es fijo');
    expect(n.texto).toContain('solo ve los datos de esa sede');
  });

  it('un rol oficial regional explica que ve todas las agencias de su región', () => {
    const n = construirNotaAmbito(entrada({ codigoRol: 'SUPERVISOR', nombreRol: 'Supervisor Regional', ambito: 'REGION' }));
    expect(n.tono).toBe('fijo');
    expect(n.texto).toContain('«Su región»');
    expect(n.texto).toContain('ve todas las agencias de esa región');
  });

  it('un rol oficial nacional explica que el usuario no se vincula a agencia ni región', () => {
    const n = construirNotaAmbito(entrada({ codigoRol: 'COORD_BODEGA', nombreRol: 'Coordinador de Bodega', ambito: 'GLOBAL' }));
    expect(n.tono).toBe('fijo');
    expect(n.texto).toContain('«Todo el país»');
    expect(n.texto).toContain('no se vincula a ninguna agencia ni región');
  });

  it('el Súper Administrador tiene su propio texto: siempre todo el país', () => {
    const n = construirNotaAmbito(entrada({ codigoRol: 'SUPER_ADMIN', nombreRol: 'Súper Administrador', ambito: 'GLOBAL' }));
    expect(n.tono).toBe('fijo');
    expect(n.texto).toContain('siempre actúa sobre todo el país');
  });

  it('un rol propio permite elegir los cuatro alcances al Súper Administrador', () => {
    const n = construirNotaAmbito(entrada({ codigoRol: 'AUDITOR', nombreRol: 'Auditor', esSistema: false, esSuperAdmin: true }));
    expect(n.tono).toBe('libre');
    expect(n.texto).toContain('cualquiera de los cuatro alcances');
  });

  it('un rol propio avisa a los demás de que no pueden dar un alcance más amplio que el suyo', () => {
    const n = construirNotaAmbito(entrada({ codigoRol: 'AUDITOR', nombreRol: 'Auditor', esSistema: false, esSuperAdmin: false }));
    expect(n.tono).toBe('libre');
    expect(n.texto).toContain('no se puede dar uno más amplio que el tuyo');
  });

  it('al crear un rol nuevo se muestra la explicación de rol propio', () => {
    const n = construirNotaAmbito(entrada({ codigoRol: undefined, nombreRol: '', esSistema: false, editando: false }));
    expect(n.tono).toBe('libre');
    expect(n.texto).toContain('Región y Agencia obligan a asignar');
  });

  it('un rol propio en solo lectura dice que se puede consultar pero no cambiar', () => {
    const n = construirNotaAmbito(entrada({ codigoRol: 'AUDITOR', nombreRol: 'Auditor', esSistema: false, soloLectura: true }));
    expect(n.texto).toContain('pero no cambiarlo');
  });

  it('los 15 roles oficiales tienen una explicación completa, sin huecos', () => {
    const oficiales: Array<[string, string, string]> = [
      ['SUPER_ADMIN', 'Súper Administrador', 'GLOBAL'],
      ['ADMIN', 'Administrador', 'GLOBAL'],
      ['SUPERVISOR', 'Supervisor Regional', 'REGION'],
      ['JEFE_COMERCIAL', 'Jefe Comercial', 'GLOBAL'],
      ['COORD_COMERCIAL', 'Coordinador Comercial', 'REGION'],
      ['APROBADOR', 'Aprobador de Agencia', 'AGENCIA'],
      ['LIDER', 'Líder Operador', 'AGENCIA'],
      ['BACKUP', 'Backup', 'AGENCIA'],
      ['LAVADOR', 'Lavador', 'AGENCIA'],
      ['COORD_SERVICIOS_ESPECIALES', 'Coordinador de Servicios Especiales', 'GLOBAL'],
      ['PULIDOR', 'Pulidor', 'AGENCIA'],
      ['COORD_MANTENIMIENTO', 'Coordinador de Mantenimiento', 'REGION'],
      ['TECNICO', 'Técnico de Maquinaria', 'REGION'],
      ['COORD_BODEGA', 'Coordinador de Bodega', 'GLOBAL'],
      ['ASISTENTE_BODEGA', 'Asistente de Bodega', 'REGION'],
    ];
    expect(oficiales.length).toBe(15);
    for (const [codigo, nombre, ambito] of oficiales) {
      const { texto } = construirNotaAmbito(entrada({ codigoRol: codigo, nombreRol: nombre, ambito }));
      expect(texto.length).toBeGreaterThan(40, codigo);
      expect(texto).not.toContain('undefined', codigo);
      expect(texto).not.toContain('  ', codigo);
    }
  });
});

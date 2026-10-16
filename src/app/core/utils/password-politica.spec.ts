import { motivoPasswordDebil, passwordCumplePolitica, PASSWORD_MENSAJE, requisitosPassword } from './password-politica';

/** Debe dar lo mismo que la política del backend (`backend-easydry/src/common/utils/password-politica.spec.ts`). */
describe('política de contraseñas (panel web)', () => {
  it('acepta contraseñas con mayúscula, minúscula, número y carácter especial', () => {
    for (const clave of ['Lavado#2026Seco', 'Taller*Norte84', 'Cera.Pulida_77x', 'Ñandú$Verde2026']) {
      expect(passwordCumplePolitica(clave)).withContext(clave).toBeTrue();
    }
  });

  it('rechaza las que les falta algún tipo de carácter o son cortas', () => {
    for (const clave of ['Lavado2026Seco', 'lavado#2026seco', 'LAVADO#2026SECO', 'Lavado#SecoLimpio', 'Ab1#xyz']) {
      expect(motivoPasswordDebil(clave)).withContext(clave).toBe(PASSWORD_MENSAJE);
    }
  });

  it('el mínimo es de 10 caracteres', () => {
    expect(passwordCumplePolitica('Lavad#2026')).toBeTrue();
    expect(passwordCumplePolitica('Lava#2026')).toBeFalse();
  });

  it('rechaza palabras comunes, el correo y secuencias obvias', () => {
    expect(motivoPasswordDebil('Password#9x7Z')).toMatch(/común/);
    expect(motivoPasswordDebil('Maria.Perez#2026X', 'maria.perez@easydry.com')).toMatch(/correo/);
    for (const clave of ['Tallerx#1234Zq', 'Tallerx#9876Zq', 'Zabcd#Tallero5', 'Taller#5Zqaaaa']) {
      expect(motivoPasswordDebil(clave)).withContext(clave).toMatch(/secuencias/);
    }
    expect(passwordCumplePolitica('Taller#5Zqaaa9')).toBeTrue();
  });

  describe('requisitos en vivo', () => {
    const faltan = (clave: string, email?: string) => requisitosPassword(clave, email).filter((r) => !r.cumple).map((r) => r.clave);

    it('una contraseña válida cumple todos', () => {
      expect(faltan('Lavado#2026Seco')).toEqual([]);
    });

    it('marca exactamente lo que falta', () => {
      expect(faltan('')).toEqual(['largo', 'mayuscula', 'minuscula', 'numero', 'especial']);
      expect(faltan('Lavado2026Seco')).toEqual(['especial']);
      expect(faltan('lavado#2026seco')).toEqual(['mayuscula']);
      expect(faltan('LAVADO#2026SECO')).toEqual(['minuscula']);
      expect(faltan('Lavado#SecoLimpio')).toEqual(['numero']);
      expect(faltan('Ab1#xyz')).toEqual(['largo']);
      expect(faltan('Tallerx#1234Zq')).toEqual(['secuencias']);
      expect(faltan('Password#9x7Z')).toEqual(['comun']);
      expect(faltan('Maria.Perez#2026X', 'maria.perez@easydry.com')).toEqual(['correo']);
    });

    it('todos cumplidos equivale a cumplir la política', () => {
      for (const clave of ['', 'a', 'Lavado#2026Seco', 'Lavado2026Seco', 'Tallerx#1234Zq', 'Password#9x7Z', 'Taller#5Zqaaa9', 'Ñandú$Verde2026']) {
        expect(requisitosPassword(clave).every((r) => r.cumple)).withContext(clave).toBe(passwordCumplePolitica(clave));
      }
    });
  });
});

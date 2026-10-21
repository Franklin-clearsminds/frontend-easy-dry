import { instalarSelectBuscable } from './select-buscable';

function crearSelect(n: number, extra: (s: HTMLSelectElement) => void = () => {}): HTMLSelectElement {
  const s = document.createElement('select');
  for (let i = 0; i < n; i++) {
    const o = document.createElement('option');
    o.value = `v${i}`;
    o.textContent = `Agencia número ${i} Ñandú`;
    s.appendChild(o);
  }
  extra(s);
  document.body.appendChild(s);
  return s;
}

const clic = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
const panel = () => document.querySelector('[role="dialog"][aria-label="Elegir una opción"]') as HTMLElement | null;

describe('buscador en listas desplegables', () => {
  beforeAll(() => instalarSelectBuscable());
  afterEach(() => { panel()?.remove(); document.body.querySelectorAll('select').forEach((s) => s.remove()); });

  it('una lista larga abre el panel con buscador y filtra sin importar mayúsculas ni tildes', () => {
    const select = crearSelect(20);
    clic(select);
    const p = panel()!;
    expect(p).toBeTruthy();
    const buscador = p.querySelector('input') as HTMLInputElement;
    buscador.value = 'NÚMERO 1';
    buscador.dispatchEvent(new Event('input'));
    const textos = Array.from(p.querySelectorAll('[role="option"]')).map((o) => o.textContent);
    expect(textos.length).toBeGreaterThan(0);
    expect(textos.every((t) => /número 1/i.test(t || '') || /numero 1/i.test(t || ''))).toBe(true);
  });

  it('al elegir una opción actualiza el select y avisa con change', () => {
    const select = crearSelect(12);
    let avisos = 0;
    select.addEventListener('change', () => avisos++);
    clic(select);
    const opcion = Array.from(panel()!.querySelectorAll('[role="option"]'))[5] as HTMLElement;
    opcion.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(select.value).toBe('v5');
    expect(avisos).toBe(1);
    expect(panel()).toBeNull();
  });

  it('las listas cortas, múltiples o marcadas data-sin-buscador no cambian', () => {
    clic(crearSelect(5));
    expect(panel()).toBeNull();
    clic(crearSelect(20, (s) => (s.multiple = true)));
    expect(panel()).toBeNull();
    clic(crearSelect(20, (s) => s.setAttribute('data-sin-buscador', '')));
    expect(panel()).toBeNull();
  });
});

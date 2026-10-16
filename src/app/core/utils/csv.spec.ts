import { celdaCsv } from './csv';

describe('celdaCsv', () => {
  it('neutraliza el texto que una hoja de cálculo tomaría por fórmula', () => {
    for (const peligroso of ['=HYPERLINK("http://x","a")', '+1+1', '-2+3', '@SUM(A1)', '\t=1+1', '\r=1+1']) {
      expect(celdaCsv(peligroso)).withContext(peligroso).toMatch(/^"'/);
    }
  });

  it('deja intacto el texto normal y los números', () => {
    expect(celdaCsv('Juan Pérez')).toBe('"Juan Pérez"');
    expect(celdaCsv(12.5)).toBe('"12.5"');
    expect(celdaCsv('a-b = c')).toBe('"a-b = c"');
  });

  it('escapa las comillas y tolera nulos', () => {
    expect(celdaCsv('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(celdaCsv(null)).toBe('""');
    expect(celdaCsv(undefined)).toBe('""');
  });
});

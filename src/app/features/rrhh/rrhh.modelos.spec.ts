import { TimbradaApi } from '../../core/services/rrhh.service';
import { MAX_ADJUNTOS, MAX_ADJUNTO_BYTES, agruparPorDia, horasEntre, motivoAdjuntoInvalido, tipoAdjuntoDe, tipoEvidenciaDe } from './rrhh.modelos';

const marca = (tipo: 'ENTRADA' | 'SALIDA', iso: string, dia: string, userId = 'u1', persona = 'Ana'): TimbradaApi => ({
  id: `${tipo}${dia}${userId}`, userId, persona, rol: 'LAVADOR', tipo, dia, marcadaEn: iso, horaDispositivo: null, origen: 'APP', fotoKey: 'rrhh/timbradas/u1/f.jpg',
  latitud: null, longitud: null, precisionM: null, verificacion: 'VERIFICADA', sitio: null, distanciaM: 10, radioM: 100,
});

describe('RRHH · reglas de las pantallas', () => {
  it('calcula las horas entre dos instantes y no acepta una salida anterior a la entrada', () => {
    expect(horasEntre('2026-11-09T13:00:00Z', '2026-11-09T22:30:00Z')).toBe(9.5);
    expect(horasEntre('2026-11-09T13:00:00Z', '2026-11-09T13:00:00Z')).toBeNull();
    expect(horasEntre('2026-11-09T22:00:00Z', '2026-11-09T13:00:00Z')).toBeNull();
  });

  it('agrupa por día y marca incompleto el día con una sola marca', () => {
    const dias = agruparPorDia([
      marca('ENTRADA', '2026-11-03T13:00:00Z', '2026-11-03'),
      marca('SALIDA', '2026-11-03T22:00:00Z', '2026-11-03'),
      marca('ENTRADA', '2026-11-04T13:10:00Z', '2026-11-04'),
    ]);
    expect(dias.length).toBe(2);
    const completo = dias.find((d) => d.dia === '2026-11-03')!;
    expect(completo.incompleto).toBe(false);
    expect(completo.horas).toBe(9);
    const incompleto = dias.find((d) => d.dia === '2026-11-04')!;
    expect(incompleto.incompleto).toBe(true);
    expect(incompleto.horas).toBeNull();
  });

  it('separa a las personas y ordena del día más reciente al más antiguo', () => {
    const dias = agruparPorDia([
      marca('ENTRADA', '2026-11-03T13:00:00Z', '2026-11-03', 'u1', 'Ana'),
      marca('ENTRADA', '2026-11-03T13:05:00Z', '2026-11-03', 'u2', 'Beto'),
      marca('ENTRADA', '2026-11-05T13:00:00Z', '2026-11-05', 'u1', 'Ana'),
    ]);
    expect(dias.map((d) => `${d.dia}|${d.persona}`)).toEqual(['2026-11-05|Ana', '2026-11-03|Ana', '2026-11-03|Beto']);
  });

  it('un día sin ninguna marca no aparece (no se inventan faltas)', () => {
    expect(agruparPorDia([])).toEqual([]);
  });

  it('reconoce el tipo de archivo y el tipo de evidencia que entiende el almacenamiento', () => {
    expect(tipoAdjuntoDe('image/png')).toBe('imagen');
    expect(tipoAdjuntoDe('video/mp4')).toBe('video');
    expect(tipoAdjuntoDe('application/pdf')).toBe('documento');
    expect(tipoEvidenciaDe('image/jpeg')).toBe('FOTO_TAREA');
    expect(tipoEvidenciaDe('video/quicktime')).toBe('VIDEO_TAREA');
    expect(tipoEvidenciaDe('application/pdf')).toBe('DOCUMENTO_TAREA');
  });

  it('limita los adjuntos a 5 archivos de 10 MB y a los formatos que el servidor acepta', () => {
    expect(motivoAdjuntoInvalido({ size: 1000, type: 'image/png' }, 0)).toBeNull();
    expect(motivoAdjuntoInvalido({ size: 1000, type: 'application/pdf' }, 0)).toBeNull();
    expect(motivoAdjuntoInvalido({ size: 1000, type: 'image/png' }, MAX_ADJUNTOS)).toContain('Máximo');
    expect(motivoAdjuntoInvalido({ size: MAX_ADJUNTO_BYTES + 1, type: 'video/mp4' }, 0)).toContain('MB');
    expect(motivoAdjuntoInvalido({ size: 1000, type: 'application/msword' }, 0)).toContain('Formato');
    expect(motivoAdjuntoInvalido({ size: 1000, type: 'image/heic' }, 0)).toContain('Formato');
  });
});

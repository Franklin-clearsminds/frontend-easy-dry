import { EvaluacionDiaApi, SemanaHorario, TimbradaApi } from '../../core/services/rrhh.service';
import {
  HORARIO_POR_DEFECTO, MAX_ADJUNTOS, MAX_ADJUNTO_BYTES, agruparPorDia, copiarSemana, filasDelRango, horasEntre, motivoAdjuntoInvalido, problemaDeSemana,
  resumenSemana, semanasIguales, textoMinutos, tipoAdjuntoDe, tipoEvidenciaDe,
} from './rrhh.modelos';

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

const evaluacion = (userId: string, dia: string, estado: EvaluacionDiaApi['estado']): EvaluacionDiaApi => ({
  userId, dia, estado, observaciones: [], horario: { entrada: '08:00', salida: '15:00' }, entradaReal: null, salidaReal: null,
  minutosEntrada: null, minutosSalida: null, horasReales: null, horasDentroHorario: null,
});

describe('RRHH · horarios', () => {
  it('resume la semana juntando los días seguidos con el mismo horario', () => {
    expect(resumenSemana(HORARIO_POR_DEFECTO)).toEqual(['Lun a Dom · 08:00–15:00']);
    const s: SemanaHorario = copiarSemana(HORARIO_POR_DEFECTO);
    s[5] = { trabaja: true, entrada: '08:00', salida: '13:00' };
    s[6] = { trabaja: false, entrada: '08:00', salida: '15:00' };
    expect(resumenSemana(s)).toEqual(['Lun a Vie · 08:00–15:00', 'Sáb · 08:00–13:00', 'Dom · Libre']);
  });

  it('compara semanas sin mirar las horas de un día libre', () => {
    const a = copiarSemana(HORARIO_POR_DEFECTO);
    const b = copiarSemana(HORARIO_POR_DEFECTO);
    expect(semanasIguales(a, b)).toBe(true);
    a[6] = { trabaja: false, entrada: '08:00', salida: '15:00' };
    b[6] = { trabaja: false, entrada: '09:00', salida: '10:00' };
    expect(semanasIguales(a, b)).toBe(true);
    b[0] = { ...b[0], entrada: '09:00' };
    expect(semanasIguales(a, b)).toBe(false);
  });

  it('avisa antes de enviar si la salida no es posterior a la entrada, salvo en un día libre', () => {
    const s = copiarSemana(HORARIO_POR_DEFECTO);
    expect(problemaDeSemana(s)).toBeNull();
    s[2] = { trabaja: true, entrada: '15:00', salida: '08:00' };
    expect(problemaDeSemana(s)).toContain('Miércoles');
    s[2] = { trabaja: false, entrada: '15:00', salida: '08:00' };
    expect(problemaDeSemana(s)).toBeNull();
  });

  it('los minutos dentro de la tolerancia se leen «a tiempo»', () => {
    expect(textoMinutos(7, 10)).toBe('a tiempo');
    expect(textoMinutos(-10, 10)).toBe('a tiempo');
    expect(textoMinutos(40, 10)).toBe('+40 min');
    expect(textoMinutos(-25, 10)).toBe('−25 min');
    expect(textoMinutos(null, 10)).toBe('');
  });

  it('une la evaluación con las marcas de cada día y ordena del más reciente al más antiguo', () => {
    const marcas = [marca('ENTRADA', '2026-11-09T13:00:00Z', '2026-11-09'), marca('SALIDA', '2026-11-09T20:00:00Z', '2026-11-09')];
    const filas = filasDelRango(
      [evaluacion('u1', '2026-11-08', 'DIA_LIBRE'), evaluacion('u1', '2026-11-09', 'CUMPLE'), evaluacion('u2', '2026-11-09', 'SIN_MARCA')],
      marcas,
      new Map([['u1', 'Ana'], ['u2', 'Beto']]),
    );
    expect(filas.map((f) => `${f.dia} ${f.persona} ${f.estado}`)).toEqual(['2026-11-09 Ana CUMPLE', '2026-11-09 Beto SIN_MARCA', '2026-11-08 Ana DIA_LIBRE']);
    expect(filas[0].entrada?.tipo).toBe('ENTRADA');
    expect(filas[0].salida?.tipo).toBe('SALIDA');
    expect(filas[1].entrada).toBeNull();
  });
});

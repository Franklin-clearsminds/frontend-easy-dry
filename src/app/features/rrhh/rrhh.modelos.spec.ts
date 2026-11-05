import { RrhhMockService } from './rrhh-mock.service';
import { guardarResponsable, guardarResponsables, leerResponsables } from './rrhh-responsables';
import { MAX_ADJUNTOS, MAX_ADJUNTO_BYTES, TimbradaMock, agruparPorDia, distanciaMetros, estaVencida, horasTrabajadas, motivoAdjuntoInvalido, tipoMarcaPorHora } from './rrhh.modelos';

describe('RRHH · reglas del prototipo', () => {
  it('calcula la distancia entre dos puntos', () => {
    expect(distanciaMetros(-0.1807, -78.4678, -0.1807, -78.4678)).toBe(0);
    const unGradoDeLatitud = distanciaMetros(0, 0, 1, 0);
    expect(unGradoDeLatitud).toBeGreaterThan(111_000);
    expect(unGradoDeLatitud).toBeLessThan(111_400);
    // 30 m al norte quedan dentro del radio; 300 m, fuera.
    expect(distanciaMetros(-0.1807, -78.4678, -0.1807 + 30 / 111_000, -78.4678)).toBeLessThan(100);
    expect(distanciaMetros(-0.1807, -78.4678, -0.1807 + 300 / 111_000, -78.4678)).toBeGreaterThan(100);
  });

  it('antes de las 12:00 es entrada y desde las 12:00 es salida', () => {
    expect(tipoMarcaPorHora(0)).toBe('ENTRADA');
    expect(tipoMarcaPorHora(11)).toBe('ENTRADA');
    expect(tipoMarcaPorHora(12)).toBe('SALIDA');
    expect(tipoMarcaPorHora(23)).toBe('SALIDA');
  });

  it('calcula las horas trabajadas y no acepta una salida anterior a la entrada', () => {
    expect(horasTrabajadas('08:00', '17:30')).toBe(9.5);
    expect(horasTrabajadas('08:00', '08:00')).toBeNull();
    expect(horasTrabajadas('09:00', '08:00')).toBeNull();
  });

  it('una tarea pendiente con fecha límite pasada está vencida; las demás no', () => {
    expect(estaVencida({ estado: 'PENDIENTE', fechaLimite: '2026-11-01' }, '2026-11-05')).toBe(true);
    expect(estaVencida({ estado: 'PENDIENTE', fechaLimite: '2026-11-05' }, '2026-11-05')).toBe(false);
    expect(estaVencida({ estado: 'PENDIENTE', fechaLimite: null }, '2026-11-05')).toBe(false);
    expect(estaVencida({ estado: 'COMPLETADA', fechaLimite: '2026-11-01' }, '2026-11-05')).toBe(false);
  });

  it('agrupa por día y marca incompleto el día con una sola marca', () => {
    const m = (tipo: 'ENTRADA' | 'SALIDA', hora: string, fecha: string): TimbradaMock => ({ id: tipo + fecha, operadorId: 'op-1', agenciaId: 'ag-1', fecha, hora, tipo, distanciaM: 10, foto: '' });
    const dias = agruparPorDia([m('ENTRADA', '08:00', '2026-11-03'), m('SALIDA', '17:00', '2026-11-03'), m('ENTRADA', '08:10', '2026-11-04')]);
    expect(dias.length).toBe(2);
    const completo = dias.find((d) => d.fecha === '2026-11-03')!;
    expect(completo.incompleto).toBe(false);
    expect(completo.horas).toBe(9);
    expect(dias.find((d) => d.fecha === '2026-11-04')!.incompleto).toBe(true);
  });

  it('limita los adjuntos a 5 archivos de 10 MB', () => {
    expect(motivoAdjuntoInvalido({ size: 1000, type: 'image/png' }, 0)).toBeNull();
    expect(motivoAdjuntoInvalido({ size: 1000, type: 'image/png' }, MAX_ADJUNTOS)).toContain('Máximo');
    expect(motivoAdjuntoInvalido({ size: MAX_ADJUNTO_BYTES + 1, type: 'video/mp4' }, 0)).toContain('MB');
  });
});

describe('RRHH · datos de ejemplo', () => {
  it('el flujo de una tarea deja la fecha y hora de cada paso', () => {
    const s = new RrhhMockService();
    const t = s.crearTarea({ titulo: 'Prueba', descripcion: 'Detalle', operadorId: 'op-1', fechaLimite: null, adjuntos: [] });
    expect(t.estado).toBe('PENDIENTE');
    expect(t.asignadaEn).toBeTruthy();
    s.completarTarea(t.id, 'Hecho', [{ id: 'a', nombre: 'foto.png', tipo: 'imagen', url: '', tamano: 1 }]);
    expect(t.estado).toBe('COMPLETADA');
    expect(t.completadaEn).toBeTruthy();
    s.devolverTarea(t.id, 'Falta la foto');
    expect(t.estado).toBe('PENDIENTE');
    expect(t.completadaEn).toBeNull();
    s.completarTarea(t.id, 'Hecho otra vez', [{ id: 'b', nombre: 'foto2.png', tipo: 'imagen', url: '', tamano: 1 }]);
    s.aprobarTarea(t.id);
    expect(t.estado).toBe('REVISADA');
    expect(t.revisadaEn).toBeTruthy();
    expect(s.avisos.some((a) => a.tipo === 'COMPLETADA' && a.tareaId === t.id)).toBe(true);
  });

  it('solo se cancela una tarea pendiente', () => {
    const s = new RrhhMockService();
    const t = s.crearTarea({ titulo: 'Otra', descripcion: 'Detalle', operadorId: 'op-2', fechaLimite: null, adjuntos: [] });
    s.cancelarTarea(t.id, 'Ya no hace falta');
    expect(t.estado).toBe('CANCELADA');
    expect(t.canceladaEn).toBeTruthy();
    s.aprobarTarea(t.id);
    expect(t.estado).toBe('CANCELADA');
  });

  it('timbra dentro de los 100 m, rechaza fuera y no repite la marca del día', () => {
    const s = new RrhhMockService();
    const ag = s.agenciaDe('op-1')!;
    const cerca = { lat: ag.lat + 30 / 111_000, lng: ag.lng };
    const lejos = { lat: ag.lat + 300 / 111_000, lng: ag.lng };
    const manana = new Date(Date.now() + 86_400_000 * 40);
    manana.setHours(8, 30, 0, 0);

    const fuera = s.registrarTimbrada('op-1', 'foto', lejos, manana);
    expect(fuera.ok).toBe(false);
    if (!fuera.ok) expect(fuera.motivo).toBe('FUERA_DE_RANGO');

    const dentro = s.registrarTimbrada('op-1', 'foto', cerca, manana);
    expect(dentro.ok).toBe(true);
    if (dentro.ok) expect(dentro.timbrada.tipo).toBe('ENTRADA');

    const repetida = s.registrarTimbrada('op-1', 'foto', cerca, manana);
    expect(repetida.ok).toBe(false);
    if (!repetida.ok) expect(repetida.motivo).toBe('DUPLICADA');

    const tarde = new Date(manana);
    tarde.setHours(17, 30);
    const salida = s.registrarTimbrada('op-1', 'foto', cerca, tarde);
    expect(salida.ok).toBe(true);
    if (salida.ok) expect(salida.timbrada.tipo).toBe('SALIDA');
  });

  it('guarda y quita la ubicación de una agencia de forma simulada (solo en memoria)', () => {
    const s = new RrhhMockService();
    expect(s.ubicacionesAgencia['agencia-real']).toBeUndefined();
    s.guardarUbicacionAgencia('agencia-real', -0.18, -78.46);
    expect(s.ubicacionesAgencia['agencia-real'].lat).toBe(-0.18);
    expect(s.ubicacionesAgencia['agencia-real'].guardadaEn).toBeTruthy();
    s.quitarUbicacionAgencia('agencia-real');
    expect(s.ubicacionesAgencia['agencia-real']).toBeUndefined();
  });
});

describe('RRHH · tareas que nacen de un informe', () => {
  const limpiar = () => { localStorage.removeItem('rrhh_tareas_informe_v1'); localStorage.removeItem('rrhh_responsables_novedad_v1'); };
  beforeEach(limpiar);
  afterEach(limpiar);

  const informe = { id: 'inf-1', numero: 'INF-2026-0001' };
  const novedades = [
    { novedadId: 'n1', titulo: 'Manguera rota', descripcion: 'Fuga en la bahía 2', operadorId: 'op-1' },
    { novedadId: 'n2', titulo: 'Piso resbaloso', descripcion: '', operadorId: 'op-1' },
    { novedadId: 'n3', titulo: 'Falta de cera', descripcion: 'Quedan 2 galones', operadorId: 'op-3' },
  ];

  it('crea una tarea por novedad, con su origen, y un solo aviso del informe por operador', () => {
    const s = new RrhhMockService();
    const nuevas = s.crearTareasDeInforme(informe, novedades);
    expect(nuevas.length).toBe(3);
    expect(nuevas.every((t) => t.estado === 'PENDIENTE' && !!t.asignadaEn)).toBe(true);
    expect(nuevas[0].origen).toEqual({ informeId: 'inf-1', informeNumero: 'INF-2026-0001', novedadId: 'n1', novedadTitulo: 'Manguera rota' });
    // La descripción vacía de la novedad no deja la tarea sin descripción.
    expect(nuevas[1].descripcion).toBe('Piso resbaloso');
    const delInforme = s.avisos.filter((a) => a.tipo === 'INFORME');
    expect(delInforme.length).toBe(2);
    expect(delInforme.find((a) => a.destinatario === 'Carlos Mora')!.mensaje).toContain('2 tareas');
    expect(delInforme.every((a) => a.enlace === '/informes-inspeccion/inf-1')).toBe(true);
    expect(s.avisos.filter((a) => a.tipo === 'ASIGNADA' && a.enlace).length).toBe(3);
  });

  it('no repite la tarea de una novedad que ya la tiene', () => {
    const s = new RrhhMockService();
    s.crearTareasDeInforme(informe, novedades);
    expect(s.crearTareasDeInforme(informe, novedades).length).toBe(0);
    expect(s.tareas.filter((t) => t.origen).length).toBe(3);
  });

  it('las tareas del informe sobreviven a recargar; las de ejemplo se reinician; restablecer las borra', () => {
    const s1 = new RrhhMockService();
    const [t] = s1.crearTareasDeInforme(informe, novedades);
    s1.completarTarea(t.id, 'Cambiada la manguera', [{ id: 'a', nombre: 'foto.png', tipo: 'imagen', url: 'blob:http://x/1', tamano: 10 }]);
    s1.crearTarea({ titulo: 'A mano', descripcion: 'x', operadorId: 'op-2', fechaLimite: null, adjuntos: [] });

    const s2 = new RrhhMockService();
    const guardada = s2.tarea(t.id)!;
    expect(guardada.estado).toBe('COMPLETADA');
    expect(guardada.respuesta).toBe('Cambiada la manguera');
    // La vista previa del archivo no se conserva: solo su nombre.
    expect(guardada.evidencias[0].nombre).toBe('foto.png');
    expect(guardada.evidencias[0].url).toBe('');
    expect(s2.tareas.some((x) => x.titulo === 'A mano')).toBe(false);
    expect(s2.tareas.some((x) => x.id === 'tr-1')).toBe(true);

    s2.restablecer();
    expect(s2.tarea(t.id)).toBeUndefined();
    expect(new RrhhMockService().tarea(t.id)).toBeUndefined();
  });

  it('recuerda el responsable de cada novedad por informe', () => {
    expect(leerResponsables('inf-9')).toEqual({});
    guardarResponsables('inf-9', { a: 'op-1', b: '', c: 'op-2' });
    expect(leerResponsables('inf-9')).toEqual({ a: 'op-1', c: 'op-2' });
    guardarResponsable('inf-9', 'a', '');
    guardarResponsable('inf-9', 'd', 'op-3');
    expect(leerResponsables('inf-9')).toEqual({ c: 'op-2', d: 'op-3' });
    expect(leerResponsables('inf-otro')).toEqual({});
  });
});

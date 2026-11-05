import { Injectable } from '@angular/core';
import {
  AdjuntoMock,
  AgenciaMock,
  AvisoMock,
  EventoTarea,
  OperadorMock,
  RADIO_TIMBRADA_M,
  TareaMock,
  TimbradaMock,
  TipoAvisoTarea,
  TipoMarca,
  distanciaMetros,
  tipoMarcaPorHora,
} from './rrhh.modelos';

/** Resultado de intentar timbrar: se rechaza fuera del radio o si ya existe esa marca del día. */
/** Clave del navegador donde se conservan las tareas que nacen de un informe (con sus avisos). */
const CLAVE_GUARDADO = 'rrhh_tareas_informe_v1';

export type ResultadoTimbrada =
  | { ok: true; timbrada: TimbradaMock; distanciaM: number }
  | { ok: false; motivo: 'FUERA_DE_RANGO' | 'DUPLICADA' | 'SIN_AGENCIA'; distanciaM: number; mensaje: string };

const pad = (n: number) => String(n).padStart(2, '0');
const aFecha = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aHora = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Imagen de muestra (SVG) para las fotos y adjuntos de ejemplo: no hay archivos reales en el prototipo. */
export function imagenMuestra(texto: string, color = '#0e7490'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="320" height="220" fill="${color}"/><circle cx="160" cy="92" r="34" fill="#ffffff55"/><rect x="100" y="140" width="120" height="44" rx="22" fill="#ffffff55"/><text x="160" y="205" font-family="sans-serif" font-size="15" fill="#fff" text-anchor="middle">${texto}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * DATOS DE EJEMPLO del módulo RRHH (prototipo). Viven en memoria: se reinician al recargar la página y no se envían a ningún servidor.
 * Cuando el módulo se apruebe, este servicio se reemplaza por uno que hable con el backend sin cambiar las pantallas.
 */
@Injectable({ providedIn: 'root' })
export class RrhhMockService {
  readonly agencias: AgenciaMock[] = [
    { id: 'ag-1', nombre: 'EasyDry Quito Norte', lat: -0.1807, lng: -78.4678 },
    { id: 'ag-2', nombre: 'EasyDry Guayaquil Centro', lat: -2.1894, lng: -79.8891 },
    { id: 'ag-3', nombre: 'EasyDry Cuenca', lat: -2.9001, lng: -79.0059 },
  ];

  readonly operadores: OperadorMock[] = [
    { id: 'op-1', nombre: 'Carlos Mora', cargo: 'Lavador', agenciaId: 'ag-1' },
    { id: 'op-2', nombre: 'Lucía Paredes', cargo: 'Pulidora fija', agenciaId: 'ag-1' },
    { id: 'op-3', nombre: 'Andrés Salazar', cargo: 'Lavador', agenciaId: 'ag-2' },
    { id: 'op-4', nombre: 'María Intriago', cargo: 'Pulidora fija', agenciaId: 'ag-2' },
    { id: 'op-5', nombre: 'Jorge Cevallos', cargo: 'Lavador', agenciaId: 'ag-3' },
    { id: 'op-6', nombre: 'Diana Ortiz', cargo: 'Lavadora', agenciaId: 'ag-3' },
  ];

  /**
   * Ubicaciones que se «guardan» desde el formulario de Sucursales (simulado): viven solo en memoria, por id de agencia.
   * Las agencias de ejemplo de las timbradas tienen su propia ubicación quemada y no leen esto.
   */
  ubicacionesAgencia: Record<string, { lat: number; lng: number; guardadaEn: string }> = {};
  tareas: TareaMock[] = [];
  avisos: AvisoMock[] = [];
  timbradas: TimbradaMock[] = [];
  private contador = 100;

  constructor() {
    this.cargarEjemplos();
    this.cargarGuardado();
  }

  // ───────────────────────── Consultas ─────────────────────────

  hoy(): string { return aFecha(new Date()); }
  operador(id: string): OperadorMock | undefined { return this.operadores.find((o) => o.id === id); }
  nombreOperador(id: string): string { return this.operador(id)?.nombre ?? 'Operador'; }
  agencia(id: string): AgenciaMock | undefined { return this.agencias.find((a) => a.id === id); }
  agenciaDe(operadorId: string): AgenciaMock | undefined { return this.agencia(this.operador(operadorId)?.agenciaId ?? ''); }
  tarea(id: string): TareaMock | undefined { return this.tareas.find((t) => t.id === id); }
  get avisosSinLeer(): number { return this.avisos.filter((a) => !a.leida).length; }

  /** Los ids llevan la hora para no chocar con los de tareas guardadas en el navegador de una sesión anterior. */
  private id(prefijo: string): string { return `${prefijo}-${Date.now().toString(36)}${++this.contador}`; }

  guardarUbicacionAgencia(agenciaId: string, lat: number, lng: number): void {
    this.ubicacionesAgencia = { ...this.ubicacionesAgencia, [agenciaId]: { lat, lng, guardadaEn: new Date().toISOString() } };
  }

  quitarUbicacionAgencia(agenciaId: string): void {
    const { [agenciaId]: _quitada, ...resto } = this.ubicacionesAgencia;
    this.ubicacionesAgencia = resto;
  }

  // ───────────────────────── Tareas ─────────────────────────

  crearTarea(d: { titulo: string; descripcion: string; operadorId: string; fechaLimite: string | null; adjuntos: AdjuntoMock[]; origen?: TareaMock['origen'] }): TareaMock {
    const ahora = new Date().toISOString();
    const t: TareaMock = {
      id: this.id('tr'),
      titulo: d.titulo.trim(),
      descripcion: d.descripcion.trim(),
      operadorId: d.operadorId,
      fechaLimite: d.fechaLimite || null,
      estado: 'PENDIENTE',
      adjuntos: d.adjuntos,
      respuesta: '',
      evidencias: [],
      asignadaEn: ahora,
      completadaEn: null,
      revisadaEn: null,
      canceladaEn: null,
      motivoDevolucion: '',
      motivoCancelacion: '',
      historial: [{ accion: 'ASIGNADA', fecha: ahora, detalle: d.origen ? `Asignada a ${this.nombreOperador(d.operadorId)} desde el informe ${d.origen.informeNumero}.` : `Asignada a ${this.nombreOperador(d.operadorId)}.` }],
      ...(d.origen ? { origen: d.origen } : {}),
    };
    this.tareas = [t, ...this.tareas];
    this.avisar('ASIGNADA', t, this.nombreOperador(t.operadorId), 'Nueva tarea pendiente', d.origen ? `Te asignaron «${t.titulo}» desde el informe ${d.origen.informeNumero}.` : `Te asignaron «${t.titulo}».`);
    this.persistir();
    return t;
  }

  /**
   * Al dejar el informe pendiente de revisión, cada novedad con responsable se vuelve una tarea Pendiente para ese operador. Cada tarea
   * lleva su aviso, y cada operador recibe además un solo aviso del informe aunque tenga varias novedades. No repite una novedad que ya tiene tarea.
   */
  crearTareasDeInforme(informe: { id: string; numero: string }, novedades: { novedadId: string; titulo: string; descripcion: string; operadorId: string }[]): TareaMock[] {
    const nuevas: TareaMock[] = [];
    for (const n of novedades) {
      if (this.tareas.some((t) => t.origen?.informeId === informe.id && t.origen.novedadId === n.novedadId)) continue;
      nuevas.push(this.crearTarea({ titulo: n.titulo, descripcion: n.descripcion || n.titulo, operadorId: n.operadorId, fechaLimite: null, adjuntos: [], origen: { informeId: informe.id, informeNumero: informe.numero, novedadId: n.novedadId, novedadTitulo: n.titulo } }));
    }
    const porOperador = new Map<string, number>();
    nuevas.forEach((t) => porOperador.set(t.operadorId, (porOperador.get(t.operadorId) ?? 0) + 1));
    porOperador.forEach((cuantas, operadorId) => {
      this.avisos = [{
        id: this.id('av'), tipo: 'INFORME', titulo: 'Informe de inspección', destinatario: this.nombreOperador(operadorId), tareaId: '', fecha: new Date().toISOString(), leida: false,
        mensaje: `Se te informa del informe ${informe.numero}: te asignaron ${cuantas} tarea${cuantas === 1 ? '' : 's'} de sus novedades.`, enlace: `/informes-inspeccion/${informe.id}`,
      }, ...this.avisos];
    });
    this.persistir();
    return nuevas;
  }

  /** Borra lo guardado en el navegador y vuelve a los datos de ejemplo. */
  restablecer(): void {
    try { localStorage.removeItem(CLAVE_GUARDADO); } catch { /* sin almacenamiento */ }
    this.contador = 100;
    this.cargarEjemplos();
  }

  // Los archivos son del equipo y no caben en el navegador: de las tareas guardadas solo se conservan sus nombres.
  private sinVista(a: AdjuntoMock[]): AdjuntoMock[] { return a.map((x) => ({ ...x, url: x.url.startsWith('data:') ? x.url : '' })); }

  /** Guarda en el navegador solo las tareas que nacen de un informe, con sus avisos. Las de ejemplo se reinician al recargar. */
  private persistir(): void {
    try {
      const tareas = this.tareas.filter((t) => t.origen).map((t) => ({ ...t, adjuntos: this.sinVista(t.adjuntos), evidencias: this.sinVista(t.evidencias) }));
      const ids = new Set(tareas.map((t) => t.id));
      const avisos = this.avisos.filter((a) => a.enlace || ids.has(a.tareaId));
      localStorage.setItem(CLAVE_GUARDADO, JSON.stringify({ tareas, avisos }));
    } catch { /* sin almacenamiento: queda solo en memoria */ }
  }

  private cargarGuardado(): void {
    try {
      const raw = localStorage.getItem(CLAVE_GUARDADO);
      if (!raw) return;
      const g = JSON.parse(raw) as { tareas?: TareaMock[]; avisos?: AvisoMock[] };
      this.tareas = [...(g.tareas ?? []), ...this.tareas];
      this.avisos = [...(g.avisos ?? []), ...this.avisos];
    } catch { /* dato dañado: se ignora */ }
  }

  /** El operador completa la tarea con su respuesta y evidencias; le llega el aviso a quien la asignó. */
  completarTarea(id: string, respuesta: string, evidencias: AdjuntoMock[]): void {
    const t = this.tarea(id);
    if (!t || t.estado !== 'PENDIENTE') return;
    const ahora = new Date().toISOString();
    t.estado = 'COMPLETADA';
    t.respuesta = respuesta.trim();
    t.evidencias = evidencias;
    t.completadaEn = ahora;
    this.evento(t, 'COMPLETADA', ahora, `Completada por ${this.nombreOperador(t.operadorId)}.`);
    this.avisar('COMPLETADA', t, 'Quien asignó la tarea', 'Tarea completada', `${this.nombreOperador(t.operadorId)} completó «${t.titulo}». Falta revisarla.`);
    this.persistir();
  }

  aprobarTarea(id: string): void {
    const t = this.tarea(id);
    if (!t || t.estado !== 'COMPLETADA') return;
    const ahora = new Date().toISOString();
    t.estado = 'REVISADA';
    t.revisadaEn = ahora;
    this.evento(t, 'REVISADA', ahora, 'Revisada y aprobada.');
    this.avisar('REVISADA', t, this.nombreOperador(t.operadorId), 'Tarea revisada', `«${t.titulo}» fue revisada y aprobada.`);
    this.persistir();
  }

  /** Devuelve la tarea a Pendiente con el motivo; el operador debe completarla de nuevo. */
  devolverTarea(id: string, motivo: string): void {
    const t = this.tarea(id);
    if (!t || t.estado !== 'COMPLETADA') return;
    const ahora = new Date().toISOString();
    t.estado = 'PENDIENTE';
    t.motivoDevolucion = motivo.trim();
    t.completadaEn = null;
    this.evento(t, 'DEVUELTA', ahora, `Devuelta: ${t.motivoDevolucion}`);
    this.avisar('DEVUELTA', t, this.nombreOperador(t.operadorId), 'Tarea devuelta', `«${t.titulo}» volvió a Pendiente: ${t.motivoDevolucion}`);
    this.persistir();
  }

  cancelarTarea(id: string, motivo: string): void {
    const t = this.tarea(id);
    if (!t || t.estado !== 'PENDIENTE') return;
    const ahora = new Date().toISOString();
    t.estado = 'CANCELADA';
    t.canceladaEn = ahora;
    t.motivoCancelacion = motivo.trim();
    this.evento(t, 'CANCELADA', ahora, t.motivoCancelacion ? `Cancelada: ${t.motivoCancelacion}` : 'Cancelada.');
    this.avisar('CANCELADA', t, this.nombreOperador(t.operadorId), 'Tarea cancelada', `«${t.titulo}» fue cancelada.`);
    this.persistir();
  }

  marcarAvisosLeidos(): void {
    this.avisos.forEach((a) => (a.leida = true));
    this.persistir();
  }

  private evento(t: TareaMock, accion: EventoTarea['accion'], fecha: string, detalle: string): void {
    t.historial = [...t.historial, { accion, fecha, detalle }];
  }

  private avisar(tipo: TipoAvisoTarea, t: TareaMock, destinatario: string, titulo: string, mensaje: string): void {
    this.avisos = [{ id: this.id('av'), tipo, titulo, mensaje, destinatario, tareaId: t.id, fecha: new Date().toISOString(), leida: false, ...(t.origen ? { enlace: `/informes-inspeccion/${t.origen.informeId}` } : {}) }, ...this.avisos];
  }

  // ───────────────────────── Timbradas ─────────────────────────

  /**
   * Registra una timbrada: la hora decide si es entrada o salida, se valida el radio de la agencia y no se permite repetir la marca del día.
   * `ahora` permite simular la hora en la demostración.
   */
  registrarTimbrada(operadorId: string, foto: string, pos: { lat: number; lng: number }, ahora: Date = new Date()): ResultadoTimbrada {
    const ag = this.agenciaDe(operadorId);
    if (!ag) return { ok: false, motivo: 'SIN_AGENCIA', distanciaM: 0, mensaje: 'El operador no tiene agencia asignada.' };
    const distanciaM = Math.round(distanciaMetros(ag.lat, ag.lng, pos.lat, pos.lng));
    if (distanciaM > RADIO_TIMBRADA_M) {
      return { ok: false, motivo: 'FUERA_DE_RANGO', distanciaM, mensaje: `Estás a ${distanciaM} m de ${ag.nombre}. Debes estar a ${RADIO_TIMBRADA_M} m o menos para timbrar.` };
    }
    const tipo: TipoMarca = tipoMarcaPorHora(ahora.getHours());
    const fecha = aFecha(ahora);
    if (this.timbradas.some((t) => t.operadorId === operadorId && t.fecha === fecha && t.tipo === tipo)) {
      return { ok: false, motivo: 'DUPLICADA', distanciaM, mensaje: `Ya registraste tu ${tipo === 'ENTRADA' ? 'entrada' : 'salida'} de hoy.` };
    }
    const timbrada: TimbradaMock = { id: this.id('tb'), operadorId, agenciaId: ag.id, fecha, hora: aHora(ahora), tipo, distanciaM, foto };
    this.timbradas = [timbrada, ...this.timbradas];
    return { ok: true, timbrada, distanciaM };
  }

  // ───────────────────────── Datos de ejemplo ─────────────────────────

  private cargarEjemplos(): void {
    const ahora = Date.now();
    const hace = (horas: number) => new Date(ahora - horas * 3600_000).toISOString();
    const dia = (delta: number) => aFecha(new Date(ahora + delta * 86400_000));
    const doc = (nombre: string, tamano = 184_000): AdjuntoMock => ({ id: this.id('ad'), nombre, tipo: 'documento', url: '', tamano });
    const foto = (nombre: string, color: string): AdjuntoMock => ({ id: this.id('ad'), nombre, tipo: 'imagen', url: imagenMuestra(nombre, color), tamano: 96_000 });
    const base = (id: string, titulo: string, descripcion: string, operadorId: string, fechaLimite: string | null, asignadaHaceH: number): TareaMock => ({
      id, titulo, descripcion, operadorId, fechaLimite, estado: 'PENDIENTE', adjuntos: [], respuesta: '', evidencias: [],
      asignadaEn: hace(asignadaHaceH), completadaEn: null, revisadaEn: null, canceladaEn: null, motivoDevolucion: '', motivoCancelacion: '',
      historial: [{ accion: 'ASIGNADA', fecha: hace(asignadaHaceH), detalle: `Asignada a ${this.nombreOperador(operadorId)}.` }],
    });

    const t1 = base('tr-1', 'Inventario de insumos de la bodega', 'Contar shampoo, cera y microfibras y subir una foto del estante ordenado.', 'op-1', dia(2), 20);
    t1.adjuntos = [doc('Formato de inventario.pdf')];

    const t2 = base('tr-2', 'Limpieza profunda de la bahía 2', 'Desengrasar el piso y revisar las mangueras. Subir foto antes y después.', 'op-3', dia(-1), 70);
    t2.adjuntos = [foto('Bahía 2 antes', '#475569')];

    const t3 = base('tr-3', 'Reporte de la hidrolavadora con fuga', 'Grabar un video corto de la fuga y escribir cuándo empezó.', 'op-5', null, 30);

    const t4 = base('tr-4', 'Capacitación de seguridad', 'Leer el manual y responder cómo se usa el equipo de protección.', 'op-2', dia(3), 52);
    t4.estado = 'COMPLETADA';
    t4.respuesta = 'Leí el manual completo. Guantes y gafas siempre; mascarilla al usar desengrasante.';
    t4.evidencias = [foto('Firma de asistencia', '#0f766e')];
    t4.completadaEn = hace(6);
    t4.historial.push({ accion: 'COMPLETADA', fecha: hace(6), detalle: 'Completada por Lucía Paredes.' });

    const t5 = base('tr-5', 'Ordenar el área de secado', 'Dejar las secadoras y los paños en su lugar.', 'op-4', dia(-2), 96);
    t5.estado = 'COMPLETADA';
    t5.respuesta = 'Ordenado. Faltan dos paños, ya pedí reposición.';
    t5.evidencias = [foto('Área de secado', '#1d4ed8'), doc('Pedido de paños.pdf', 92_000)];
    t5.completadaEn = hace(30);
    t5.historial.push({ accion: 'COMPLETADA', fecha: hace(30), detalle: 'Completada por María Intriago.' });

    const t6 = base('tr-6', 'Revisión del extintor', 'Verificar la fecha de caducidad y fotografiar la etiqueta.', 'op-6', dia(-5), 200);
    t6.estado = 'REVISADA';
    t6.respuesta = 'Caduca en marzo de 2027. Etiqueta legible.';
    t6.evidencias = [foto('Etiqueta del extintor', '#b45309')];
    t6.completadaEn = hace(150);
    t6.revisadaEn = hace(120);
    t6.historial.push({ accion: 'COMPLETADA', fecha: hace(150), detalle: 'Completada por Diana Ortiz.' }, { accion: 'REVISADA', fecha: hace(120), detalle: 'Revisada y aprobada.' });

    const t7 = base('tr-7', 'Cambio de aceite del compresor', 'Registrar el cambio de aceite con foto del medidor.', 'op-3', dia(-4), 240);
    t7.estado = 'CANCELADA';
    t7.canceladaEn = hace(200);
    t7.motivoCancelacion = 'Lo hará el técnico de mantenimiento.';
    t7.historial.push({ accion: 'CANCELADA', fecha: hace(200), detalle: 'Cancelada: Lo hará el técnico de mantenimiento.' });

    const t8 = base('tr-8', 'Conteo de toallas de microfibra', 'Contar y subir la foto del conteo.', 'op-1', dia(1), 80);
    t8.motivoDevolucion = 'La foto no se ve; vuelve a tomarla con más luz.';
    t8.historial.push(
      { accion: 'COMPLETADA', fecha: hace(60), detalle: 'Completada por Carlos Mora.' },
      { accion: 'DEVUELTA', fecha: hace(40), detalle: `Devuelta: ${t8.motivoDevolucion}` },
    );

    this.tareas = [t1, t2, t3, t4, t5, t6, t7, t8];
    this.avisos = [
      { id: 'av-1', tipo: 'COMPLETADA', titulo: 'Tarea completada', mensaje: 'Lucía Paredes completó «Capacitación de seguridad». Falta revisarla.', destinatario: 'Quien asignó la tarea', tareaId: 'tr-4', fecha: hace(6), leida: false },
      { id: 'av-2', tipo: 'COMPLETADA', titulo: 'Tarea completada', mensaje: 'María Intriago completó «Ordenar el área de secado». Falta revisarla.', destinatario: 'Quien asignó la tarea', tareaId: 'tr-5', fecha: hace(30), leida: false },
      { id: 'av-3', tipo: 'ASIGNADA', titulo: 'Nueva tarea pendiente', mensaje: 'Te asignaron «Inventario de insumos de la bodega».', destinatario: 'Carlos Mora', tareaId: 'tr-1', fecha: hace(20), leida: true },
    ];

    this.timbradas = this.timbradasDeEjemplo();
  }

  /** Diez días hábiles hacia atrás: casi todos completos, con algunos días a los que les falta la salida o la entrada. */
  private timbradasDeEjemplo(): TimbradaMock[] {
    const lista: TimbradaMock[] = [];
    let dias = 0;
    for (let atras = 1; dias < 10 && atras < 30; atras++) {
      const d = new Date(Date.now() - atras * 86400_000);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      dias++;
      this.operadores.forEach((op, i) => {
        const clave = (dias * 7 + i * 3) % 11;
        if (clave === 0) return; // no timbró ese día
        const fecha = aFecha(d);
        const mm = pad((dias * 5 + i * 9) % 50);
        const dist = 6 + ((dias * 13 + i * 17) % 70);
        const marca = (tipo: TipoMarca, hora: string): TimbradaMock => ({
          id: this.id('tb'), operadorId: op.id, agenciaId: op.agenciaId, fecha, hora, tipo, distanciaM: dist,
          foto: imagenMuestra(`${op.nombre} · ${tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}`, tipo === 'ENTRADA' ? '#0e7490' : '#6d28d9'),
        });
        if (clave !== 1) lista.push(marca('ENTRADA', `0${7 + (i % 2)}:${mm}`));
        if (clave !== 2) lista.push(marca('SALIDA', `${16 + (i % 2)}:${mm}`));
      });
    }
    return lista;
  }
}

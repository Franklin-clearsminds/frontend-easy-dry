import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../config/env';

export type EstadoTarea = 'PENDIENTE' | 'COMPLETADA' | 'REVISADA' | 'CANCELADA';
export type TipoMarca = 'ENTRADA' | 'SALIDA';
export type Verificacion = 'VERIFICADA' | 'SIN_VERIFICAR' | 'SIN_REFERENCIA';

export interface AdjuntoTareaApi {
  id: string;
  etapa: 'ASIGNACION' | 'RESPUESTA';
  key: string;
  nombre: string;
  mime: string;
  tamanioBytes: number;
  tipo: 'IMAGEN' | 'VIDEO' | 'DOCUMENTO';
}

export interface TareaApi {
  id: string;
  numero: string;
  titulo: string;
  descripcion: string;
  fechaLimite: string | null;
  estado: EstadoTarea;
  vencida: boolean;
  asignadoA: { id: string; nombre: string; agencia: string | null; activo: boolean };
  asignadoPor: { id: string; nombre: string };
  respuesta: string | null;
  creadaEn: string;
  completadaEn: string | null;
  revisadaEn: string | null;
  canceladaEn: string | null;
  motivoCancelacion: string | null;
  origen: { informeId: string; numero: string | null } | null;
  adjuntos: AdjuntoTareaApi[];
  historial: Array<{ id: string; accion: string; actor: string; detalle: string | null; fecha: string }>;
}

export interface PersonaAsignable {
  id: string;
  nombre: string;
  rol: string;
  agencia: string | null;
}

/** Archivo ya subido al almacenamiento, listo para enviarse con la tarea. */
export interface ArchivoSubido {
  url: string;
  nombre: string;
}

export interface FiltroTareas {
  estado?: EstadoTarea;
  soloVencidas?: boolean;
  asignadoAId?: string;
}

export interface EstadoTimbrada {
  ahora: string;
  dia: string;
  /** La marca que correspondería ahora según su horario; null si hoy no puede timbrar. */
  tipoActual: TipoMarca | null;
  puedeTimbrar: boolean;
  /** Por qué no puede timbrar ahora (día libre o fuera de la ventana del horario). */
  motivoBloqueo: string | null;
  horario: { trabaja: boolean; entrada: string; salida: string };
  ventanas: { entrada: { desde: string; hasta: string }; salida: { desde: string; hasta: string } } | null;
  toleranciaMin: number;
  ventanaMin: number;
  marcasHoy: Array<{ id: string; tipo: TipoMarca; marcadaEn: string; verificacion: Verificacion; distanciaM: number | null }>;
  /** true si debe mandar su ubicación; si no, basta la foto. */
  exigeUbicacion: boolean;
  precisionMaxM: number;
  /** Dónde se valida: su bodega, su agencia asignada o cualquier agencia con ubicación. */
  modo: 'BODEGA' | 'AGENCIA_ASIGNADA' | 'CUALQUIER_AGENCIA';
  radioM: number;
  sitios: Array<{ tipo: 'AGENCIA' | 'BODEGA'; nombre: string; radioM: number; tieneUbicacion: boolean }>;
}

export interface DatosTimbrada {
  fotoUrl: string;
  latitud?: number;
  longitud?: number;
  precisionM?: number;
  horaDispositivo?: string;
  origen: 'WEB' | 'APP';
}

export interface ResultadoTimbrada {
  id: string;
  tipo: TipoMarca;
  marcadaEn: string;
  verificacion: Verificacion;
  distanciaM: number | null;
  radioM: number | null;
  sitio: { tipo: 'AGENCIA' | 'BODEGA'; nombre: string } | null;
  mensaje: string;
}

export interface TimbradaApi {
  id: string;
  userId: string;
  persona: string;
  rol: string;
  tipo: TipoMarca;
  /** AAAA-MM-DD (día en Ecuador). */
  dia: string;
  marcadaEn: string;
  horaDispositivo: string | null;
  origen: 'WEB' | 'APP';
  fotoKey: string;
  latitud: number | null;
  longitud: number | null;
  precisionM: number | null;
  verificacion: Verificacion;
  sitio: { tipo: 'AGENCIA' | 'BODEGA'; nombre: string } | null;
  distanciaM: number | null;
  radioM: number | null;
}

/** Cómo le fue a una persona un día frente a su horario. */
export type EstadoDia =
  | 'SIN_HORARIO' | 'DIA_LIBRE' | 'PENDIENTE' | 'EN_CURSO' | 'SIN_MARCA' | 'INCOMPLETO'
  | 'CUMPLE' | 'ATRASO' | 'ENTRADA_TEMPRANA' | 'SALIDA_ANTICIPADA' | 'SALIDA_TARDIA';

export interface EvaluacionDiaApi {
  userId: string;
  dia: string;
  estado: EstadoDia;
  observaciones: EstadoDia[];
  horario: { entrada: string; salida: string } | null;
  entradaReal: string | null;
  salidaReal: string | null;
  /** Minutos respecto a la hora del horario: positivo = después, negativo = antes. */
  minutosEntrada: number | null;
  minutosSalida: number | null;
  horasReales: number | null;
  horasDentroHorario: number | null;
}

export interface DiaHorario { trabaja: boolean; entrada: string; salida: string }
/** Siete días, de lunes a domingo. */
export type SemanaHorario = DiaHorario[];

export interface AjusteHorarioApi {
  toleranciaMin: number;
  ventanaMin: number;
  proximoCambio: { vigenteDesde: string; toleranciaMin: number; ventanaMin: number } | null;
}

export interface HorarioPersonaApi {
  semana: SemanaHorario;
  porDefecto: boolean;
  proximoCambio: { vigenteDesde: string; semana: SemanaHorario } | null;
}

export interface HorarioEquipoApi extends HorarioPersonaApi { id: string; nombre: string; rol: string }

export interface CambioHorarioApi {
  id: string;
  creadoEn: string;
  actor: string;
  vigenteDesde: string;
  motivo: string;
  dias: SemanaHorario;
  anterior: SemanaHorario;
}

export interface CambioAjusteApi {
  id: string;
  creadoEn: string;
  actor: string;
  vigenteDesde: string;
  motivo: string;
  toleranciaMin: number;
  ventanaMin: number;
  anterior: { toleranciaMin: number; ventanaMin: number } | null;
}

export interface PersonaEquipo {
  id: string;
  nombre: string;
  rol: string;
}

export interface SitioConUbicacion {
  tipo: 'AGENCIA' | 'BODEGA';
  id: string;
  codigo: string;
  nombre: string;
  regionId: string | null;
  activo: boolean;
  latitud: number | null;
  longitud: number | null;
  radioM: number;
}

/** Cliente de RRHH: ubicaciones, timbradas y tareas del personal. */
@Injectable({ providedIn: 'root' })
export class RrhhService {
  private readonly http = inject(HttpClient);
  private readonly base = '/rrhh';

  private post<T>(ruta: string, cuerpo: object = {}): Observable<T> {
    return this.http.post<T>(apiUrl(`${this.base}/${ruta}`), cuerpo);
  }

  // ───────────────────────── Ubicaciones ─────────────────────────

  ubicaciones(): Observable<SitioConUbicacion[]> {
    return this.post('ubicaciones/list');
  }

  guardarUbicacion(sitioTipo: 'AGENCIA' | 'BODEGA', sitioId: string, latitud: number, longitud: number): Observable<SitioConUbicacion> {
    return this.post('ubicaciones/guardar', { sitioTipo, sitioId, latitud, longitud });
  }

  quitarUbicacion(sitioTipo: 'AGENCIA' | 'BODEGA', sitioId: string): Observable<SitioConUbicacion> {
    return this.post('ubicaciones/quitar', { sitioTipo, sitioId });
  }

  // ───────────────────────── Timbradas ─────────────────────────

  estadoTimbrada(): Observable<EstadoTimbrada> {
    return this.post('timbradas/estado', { origen: 'WEB' });
  }

  timbrar(datos: DatosTimbrada): Observable<ResultadoTimbrada> {
    return this.post('timbradas/registrar', datos);
  }

  misTimbradas(desde?: string, hasta?: string): Observable<{ filas: TimbradaApi[]; evaluacion: EvaluacionDiaApi[] }> {
    return this.post('timbradas/mias', { desde, hasta });
  }

  timbradasEquipo(desde?: string, hasta?: string, userId?: string): Observable<{ filas: TimbradaApi[]; personas: PersonaEquipo[]; evaluacion: EvaluacionDiaApi[] }> {
    return this.post('timbradas/equipo', { desde, hasta, userId });
  }

  // ───────────────────────── Horarios ─────────────────────────

  miHorario(): Observable<HorarioPersonaApi & { ajuste: AjusteHorarioApi }> {
    return this.post('horarios/mio');
  }

  horariosEquipo(): Observable<{ personas: HorarioEquipoApi[]; ajuste: AjusteHorarioApi }> {
    return this.post('horarios/equipo');
  }

  historialHorario(userId: string): Observable<CambioHorarioApi[]> {
    return this.post('horarios/historial', { userId });
  }

  /** El nuevo horario rige desde mañana; el servidor guarda la versión anterior intacta. */
  editarHorario(userId: string, dias: SemanaHorario, motivo: string): Observable<HorarioPersonaApi & { mensaje: string }> {
    return this.post('horarios/editar', { userId, dias, motivo });
  }

  ajustesHorario(): Observable<AjusteHorarioApi> {
    return this.post('horarios/ajustes');
  }

  historialAjustes(): Observable<CambioAjusteApi[]> {
    return this.post('horarios/ajustes/historial');
  }

  editarAjuste(toleranciaMin: number, ventanaMin: number, motivo: string): Observable<AjusteHorarioApi & { mensaje: string }> {
    return this.post('horarios/ajustes/editar', { toleranciaMin, ventanaMin, motivo });
  }

  // ───────────────────────── Tareas ─────────────────────────

  misTareas(filtro: FiltroTareas = {}): Observable<TareaApi[]> {
    return this.post('tareas/mias', filtro);
  }

  tareasAsignadas(filtro: FiltroTareas = {}): Observable<TareaApi[]> {
    return this.post('tareas/asignadas', filtro);
  }

  sinResponsable(): Observable<TareaApi[]> {
    return this.post('tareas/sin-responsable');
  }

  asignables(): Observable<PersonaAsignable[]> {
    return this.post('tareas/asignables');
  }

  detalleTarea(id: string): Observable<TareaApi> {
    return this.post('tareas/detalle', { id });
  }

  crearTarea(datos: { titulo: string; descripcion: string; fechaLimite?: string; asignadoAId: string; adjuntos: ArchivoSubido[] }): Observable<TareaApi> {
    return this.post('tareas/crear', datos);
  }

  completarTarea(id: string, respuesta: string, adjuntos: ArchivoSubido[]): Observable<TareaApi> {
    return this.post('tareas/completar', { id, respuesta, adjuntos });
  }

  revisarTarea(id: string, accion: 'APROBAR' | 'DEVOLVER', motivo?: string): Observable<TareaApi> {
    return this.post('tareas/revisar', { id, accion, motivo });
  }

  cancelarTarea(id: string, motivo?: string): Observable<TareaApi> {
    return this.post('tareas/cancelar', { id, motivo });
  }

  reasignarTarea(id: string, asignadoAId: string): Observable<TareaApi> {
    return this.post('tareas/reasignar', { id, asignadoAId });
  }
}

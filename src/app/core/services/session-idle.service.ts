import { Injectable, NgZone, inject, signal } from '@angular/core';

/** Tiempo sin actividad tras el cual se cierra la sesión. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** Aviso previo: durante este margen se pregunta si se quiere seguir conectado. */
export const IDLE_WARNING_MS = 60 * 1000;

/** Marca de la última actividad. Vive en localStorage para que la actividad en CUALQUIER pestaña cuente. */
export const LAST_ACTIVITY_KEY = 'easydry_last_activity';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel', 'touchstart', 'click'] as const;
/** Escribir en localStorage en cada movimiento del ratón sería un gasto inútil: se registra como máximo cada 5 s. */
const WRITE_THROTTLE_MS = 5000;
const CHECK_EVERY_MS = 1000;

export interface EstadoInactividad {
  advertencia: boolean;
  segundosRestantes: number;
}

/**
 * Detecta la inactividad del usuario (sin ratón, teclado, scroll ni toques) y cierra la sesión pasado el tiempo.
 * Antes avisa con un margen para poder continuar. Compara marcas de tiempo (`Date.now()`), no cuenta ticks: sigue siendo
 * exacto si el navegador frena los temporizadores de una pestaña en segundo plano o si el equipo se suspende.
 */
@Injectable({ providedIn: 'root' })
export class SessionIdleService {
  private zone = inject(NgZone);

  /** Lo que muestra el diálogo de aviso. */
  readonly estado = signal<EstadoInactividad>({ advertencia: false, segundosRestantes: 0 });

  private onTimeout: (() => void) | null = null;
  private idleMs = IDLE_TIMEOUT_MS;
  private warningMs = IDLE_WARNING_MS;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private ultimaEscritura = 0;
  private activo = false;

  /** Empieza a vigilar. `onTimeout` se llama una vez, cuando se agota el tiempo. */
  iniciar(onTimeout: () => void, opciones: { idleMs?: number; warningMs?: number } = {}): void {
    this.detener();
    this.onTimeout = onTimeout;
    this.idleMs = opciones.idleMs ?? IDLE_TIMEOUT_MS;
    this.warningMs = Math.min(opciones.warningMs ?? IDLE_WARNING_MS, this.idleMs);
    this.activo = true;
    this.escribirActividad(true);

    this.zone.runOutsideAngular(() => {
      for (const evento of ACTIVITY_EVENTS) window.addEventListener(evento, this.registrarActividad, { passive: true, capture: true });
      document.addEventListener('visibilitychange', this.revisar);
      this.intervalId = setInterval(this.revisar, CHECK_EVERY_MS);
    });
  }

  detener(): void {
    if (!this.activo && this.intervalId === null) return;
    this.activo = false;
    this.onTimeout = null;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    for (const evento of ACTIVITY_EVENTS) window.removeEventListener(evento, this.registrarActividad, { capture: true });
    document.removeEventListener('visibilitychange', this.revisar);
    this.publicar({ advertencia: false, segundosRestantes: 0 });
  }

  /** «Seguir conectado»: cuenta como actividad y cierra el aviso. */
  extender(): void {
    this.escribirActividad(true);
    this.publicar({ advertencia: false, segundosRestantes: 0 });
  }

  /** Milisegundos que faltan para el cierre, según la última actividad registrada en cualquier pestaña. */
  restanteMs(ahora = Date.now()): number {
    return this.idleMs - (ahora - this.leerActividad(ahora));
  }

  private readonly registrarActividad = (): void => {
    // Con el aviso abierto, mover el ratón no basta: hay que pulsar «Seguir conectado» (evita cancelarlo sin darse cuenta).
    if (this.estado().advertencia) return;
    this.escribirActividad(false);
  };

  private readonly revisar = (): void => {
    if (!this.activo) return;
    const restante = this.restanteMs();
    if (restante <= 0) {
      const alAgotarse = this.onTimeout;
      this.detener();
      this.zone.run(() => alAgotarse?.());
      return;
    }
    if (restante <= this.warningMs) {
      this.publicar({ advertencia: true, segundosRestantes: Math.ceil(restante / 1000) });
    } else if (this.estado().advertencia) {
      // Hubo actividad en otra pestaña mientras este aviso estaba abierto.
      this.publicar({ advertencia: false, segundosRestantes: 0 });
    }
  };

  private escribirActividad(forzar: boolean): void {
    const ahora = Date.now();
    if (!forzar && ahora - this.ultimaEscritura < WRITE_THROTTLE_MS) return;
    this.ultimaEscritura = ahora;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(ahora));
    } catch {
      // sin localStorage (modo privado estricto): se sigue con la última marca en memoria
    }
  }

  private leerActividad(ahora: number): number {
    try {
      const guardada = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
      if (Number.isFinite(guardada) && guardada > 0) return Math.min(guardada, ahora);
    } catch {
      // ver arriba
    }
    return this.ultimaEscritura || ahora;
  }

  /** Solo entra a la zona de Angular (y por tanto repinta) cuando el estado cambia de verdad. */
  private publicar(nuevo: EstadoInactividad): void {
    const actual = this.estado();
    if (actual.advertencia === nuevo.advertencia && actual.segundosRestantes === nuevo.segundosRestantes) return;
    this.zone.run(() => this.estado.set(nuevo));
  }
}

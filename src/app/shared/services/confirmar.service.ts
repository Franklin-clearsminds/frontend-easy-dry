import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmar {
  titulo: string;
  mensaje: string;
  /** Texto del botón que confirma (por defecto «Confirmar»). */
  textoConfirmar?: string;
  textoCancelar?: string;
  /** `peligro` pinta el botón de rojo, para acciones que no se pueden deshacer. */
  tipo?: 'normal' | 'peligro';
  icono?: string;
}

/**
 * Confirmación con el diseño de la app, en lugar del cuadro nativo del navegador. Se usa igual que `window.confirm`, pero con
 * `await`: `if (!(await this.confirmar.pedir({ titulo, mensaje }))) return;`. La muestra `ConfirmarHostComponent`, que vive en la raíz.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmarService {
  readonly pendiente = signal<(OpcionesConfirmar & { resolver: (ok: boolean) => void }) | null>(null);

  pedir(opciones: OpcionesConfirmar): Promise<boolean> {
    // Una confirmación nueva cancela la anterior que siguiera abierta.
    this.pendiente()?.resolver(false);
    return new Promise<boolean>((resolver) => this.pendiente.set({ ...opciones, resolver }));
  }

  responder(ok: boolean): void {
    const p = this.pendiente();
    this.pendiente.set(null);
    p?.resolver(ok);
  }
}

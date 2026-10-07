import { Injectable } from '@angular/core';

/** Presets de escala general de la interfaz (texto, íconos, espaciado e imágenes con clases Tailwind). */
export type UiScalePreset = 'PEQUENO' | 'NORMAL' | 'GRANDE' | 'EXTRA_GRANDE';

export const ESCALA_POR_PRESET: Record<UiScalePreset, number> = {
  PEQUENO: 0.9,
  NORMAL: 1,
  GRANDE: 1.15,
  EXTRA_GRANDE: 1.3,
};

export const ETIQUETA_PRESET: Record<UiScalePreset, string> = {
  PEQUENO: 'Pequeño',
  NORMAL: 'Normal',
  GRANDE: 'Grande',
  EXTRA_GRANDE: 'Extra grande',
};

const CLAVE_STORAGE = 'easydry_ui_scale_preset';
const PRESET_POR_DEFECTO: UiScalePreset = 'NORMAL';

/**
 * Preferencia de accesibilidad "escala general" del panel web: un único `--ui-scale` en `:root` que,
 * como casi todo en Tailwind está en rem, reescala tipografía, íconos, paddings/gaps e imágenes con
 * clases Tailwind sin tocar cada componente (ver `html { font-size: calc(16px * var(--ui-scale)) }`
 * en `styles.css`). Es local al dispositivo (localStorage), no viaja al backend: es como el tamaño de
 * letra del sistema operativo, no un dato de negocio.
 */
@Injectable({ providedIn: 'root' })
export class UiScaleService {
  private presetActual: UiScalePreset = PRESET_POR_DEFECTO;

  constructor() {
    this.presetActual = this.leerPresetGuardado();
    this.aplicar(this.presetActual);
  }

  get preset(): UiScalePreset {
    return this.presetActual;
  }

  establecer(preset: UiScalePreset): void {
    this.presetActual = preset;
    this.aplicar(preset);
    try {
      localStorage.setItem(CLAVE_STORAGE, preset);
    } catch {
      // Almacenamiento no disponible (modo privado, cuota llena): la preferencia solo dura la sesión.
    }
  }

  private leerPresetGuardado(): UiScalePreset {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE);
      if (guardado && guardado in ESCALA_POR_PRESET) return guardado as UiScalePreset;
    } catch {
      // Sin acceso a localStorage: se usa el valor por defecto.
    }
    return PRESET_POR_DEFECTO;
  }

  private aplicar(preset: UiScalePreset): void {
    document.documentElement.style.setProperty('--ui-scale', String(ESCALA_POR_PRESET[preset]));
  }
}

/**
 * Aplica la escala guardada antes del primer render (se llama desde `main.ts`, antes de
 * `bootstrapApplication`), para que no haya parpadeo de "Normal" seguido de un salto al valor guardado.
 */
export function aplicarEscalaGuardadaAntesDeArrancar(): void {
  let preset: UiScalePreset = PRESET_POR_DEFECTO;
  try {
    const guardado = localStorage.getItem(CLAVE_STORAGE);
    if (guardado && guardado in ESCALA_POR_PRESET) preset = guardado as UiScalePreset;
  } catch {
    // Sin acceso a localStorage: se usa el valor por defecto.
  }
  document.documentElement.style.setProperty('--ui-scale', String(ESCALA_POR_PRESET[preset]));
}

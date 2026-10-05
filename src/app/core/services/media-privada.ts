/**
 * Utilidades de la carga de evidencias privadas: tipos de error, marcadores visuales de estado y un observador del DOM
 * que resuelve por URL prefirmada las etiquetas <img>/<video> cuyo `src` apunta a `/storage/file` de un archivo privado.
 * No depende de StorageUploadService (evita ciclos): recibe lo necesario por la interfaz ResolutorMedios.
 */

export type MediaEstado = 'permiso' | 'red' | 'sesion' | 'no-encontrado' | 'otro';

const MENSAJES: Record<MediaEstado, string> = {
  permiso: 'Sin permiso para ver este archivo',
  red: 'Sin conexión. Toca para reintentar',
  sesion: 'Tu sesión expiró. Inicia sesión de nuevo',
  'no-encontrado': 'El archivo ya no está disponible',
  otro: 'No se pudo cargar el archivo. Toca para reintentar',
};

export function mensajeEstado(estado: MediaEstado): string {
  return MENSAJES[estado];
}

/** Estados en los que tiene sentido volver a intentar. */
export function esReintentable(estado: MediaEstado): boolean {
  return estado === 'red' || estado === 'otro';
}

/** Error de resolución de un archivo privado, con el estado a mostrar. */
export class MediaError extends Error {
  constructor(public readonly estado: MediaEstado, mensaje?: string) {
    super(mensaje ?? MENSAJES[estado]);
    this.name = 'MediaError';
  }

  static desde(err: unknown): MediaError {
    if (err instanceof MediaError) return err;
    const status = (err as { status?: number } | null)?.status;
    if (status === 403) return new MediaError('permiso');
    if (status === 0) return new MediaError('red');
    if (status === 401) return new MediaError('sesion');
    if (status === 404) return new MediaError('no-encontrado');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return new MediaError('red');
    return new MediaError('otro');
  }
}

function svgDataUri(texto: string, fondo: string, color: string): string {
  const esc = texto.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">` +
    `<rect width="320" height="180" fill="${fondo}"/>` +
    `<text x="160" y="90" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="13" font-weight="600" fill="${color}">${esc}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Imagen (data URI) que se muestra mientras se pide la URL temporal. */
export function svgCargando(): string {
  return svgDataUri('Cargando...', '#f1f5f9', '#64748b');
}

/** Imagen (data URI) con el mensaje del estado de error, en lugar de una imagen rota. */
export function svgEstado(estado: MediaEstado): string {
  return svgDataUri(mensajeEstado(estado), '#f1f5f9', estado === 'permiso' ? '#b45309' : '#475569');
}

export interface ResolutorMedios {
  /** true si la URL/llave apunta a un archivo privado (requiere URL prefirmada). */
  esPrivada(value?: string | null): boolean;
  /** URL temporal lista para usar; lanza MediaError. */
  resolveMediaUrlStrict(value?: string | null): Promise<string>;
  /** Olvida la URL temporal en caché (p. ej. si venció). */
  invalidarCache(value?: string | null): void;
}

interface EstadoEl { origen: string; propio: string; estado?: MediaEstado; reintentado?: boolean }

let instalado = false;

/**
 * Observa el DOM: cuando una etiqueta <img>/<video> recibe un `src` de `/storage/file?key=` de un archivo privado
 * (armado a mano por una pantalla), lo cambia por la URL prefirmada; mientras tanto muestra «Cargando...» y si falla
 * muestra el motivo (sin permiso, sin red...) en vez de una imagen rota.
 */
export function instalarResolutorDom(resolutor: ResolutorMedios): void {
  if (instalado || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  instalado = true;

  const estados = new WeakMap<Element, EstadoEl>();

  const aplicarSrc = (el: HTMLImageElement | HTMLVideoElement, url: string): void => {
    const st = estados.get(el);
    if (st) st.propio = url;
    if (el instanceof HTMLVideoElement && url.startsWith('data:image/')) {
      el.removeAttribute('src');
      el.poster = url;
      if (st) st.propio = '';
    } else {
      if (el instanceof HTMLVideoElement) el.removeAttribute('poster');
      el.setAttribute('src', url);
    }
  };

  const cargar = async (el: HTMLImageElement | HTMLVideoElement, origen: string): Promise<void> => {
    const st = estados.get(el);
    if (!st) return;
    st.estado = undefined;
    aplicarSrc(el, svgCargando());
    try {
      const url = await resolutor.resolveMediaUrlStrict(origen);
      if (estados.get(el) !== st || st.origen !== origen) return;
      aplicarSrc(el, url);
      if (el instanceof HTMLVideoElement) el.load();
    } catch (e) {
      if (estados.get(el) !== st) return;
      const estado = MediaError.desde(e).estado;
      st.estado = estado;
      aplicarSrc(el, svgEstado(estado));
      el.setAttribute('title', mensajeEstado(estado));
    }
  };

  const revisar = (el: Element): void => {
    if (!(el instanceof HTMLImageElement || el instanceof HTMLVideoElement)) return;
    const actual = el.getAttribute('src') ?? '';
    const st = estados.get(el);
    if (st && actual === st.propio) return; // cambio hecho por nosotros
    // Ruta de /storage/file o URL directa del bucket (sin firmar) de un archivo privado.
    const sinFirmar = !/[?&](X-Amz-Signature|Signature)=/i.test(actual);
    if (sinFirmar && !actual.startsWith('data:') && !actual.startsWith('blob:') && resolutor.esPrivada(actual)) {
      estados.set(el, { origen: actual, propio: '' });
      void cargar(el, actual);
    } else if (st) {
      estados.delete(el);
    }
  };

  const revisarArbol = (nodo: Node): void => {
    if (nodo.nodeType !== 1) return;
    const el = nodo as Element;
    revisar(el);
    el.querySelectorAll?.('img[src], video[src]').forEach(revisar);
  };

  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'attributes') revisar(m.target as Element);
      else m.addedNodes.forEach(revisarArbol);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });

  // Reintento manual al tocar un marcador de error reintentable.
  document.addEventListener('click', ev => {
    const el = ev.target as Element | null;
    if (!el) return;
    const st = estados.get(el);
    if (st?.estado && esReintentable(st.estado)) {
      ev.preventDefault();
      ev.stopPropagation();
      resolutor.invalidarCache(st.origen);
      void cargar(el as HTMLImageElement | HTMLVideoElement, st.origen);
    }
  }, true);

  // URL temporal vencida o rechazada: se renueva una sola vez.
  document.addEventListener('error', ev => {
    const el = ev.target as Element | null;
    if (!el) return;
    const st = estados.get(el);
    if (!st || st.estado) return;
    if (st.reintentado) {
      st.estado = 'otro';
      aplicarSrc(el as HTMLImageElement | HTMLVideoElement, svgEstado('otro'));
      return;
    }
    st.reintentado = true;
    resolutor.invalidarCache(st.origen);
    void cargar(el as HTMLImageElement | HTMLVideoElement, st.origen);
  }, true);
}

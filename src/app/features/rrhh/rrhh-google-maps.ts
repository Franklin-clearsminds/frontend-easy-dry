/**
 * Carga la Maps JavaScript API de Google una sola vez (prototipo de RRHH). La clave sale de `environment.googleMapsKey`
 * (`NG_APP_GOOGLE_MAPS_KEY` en el `.env`). No hay tipos de Google instalados: el objeto se usa como `any`.
 */

let promesa: Promise<any> | null = null;

/** Mensaje que Google avisa por `gm_authFailure` (clave restringida, API apagada o sin facturación). */
export const MENSAJE_CLAVE_RECHAZADA =
  'Google rechazó la clave del mapa. Revisa que «Maps JavaScript API» esté habilitada, que el proyecto tenga facturación y que la clave permita este dominio (por ejemplo http://localhost:4200/*).';

export function cargarGoogleMaps(clave: string): Promise<any> {
  const w = window as any;
  if (w.google?.maps?.Map) return Promise.resolve(w.google.maps);
  if (promesa) return promesa;
  promesa = new Promise((ok, mal) => {
    w.__rrhhMapsListo = () => ok(w.google.maps);
    // Google llama a esta función global cuando rechaza la clave; el mapa ya cargado queda con un aviso de error.
    w.gm_authFailure = () => {
      promesa = null;
      mal(new Error(MENSAJE_CLAVE_RECHAZADA));
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(clave)}&callback=__rrhhMapsListo&v=weekly`;
    script.async = true;
    script.onerror = () => {
      promesa = null;
      script.remove();
      mal(new Error('No se pudo cargar Google Maps. Revisa tu conexión a internet.'));
    };
    document.head.appendChild(script);
  });
  return promesa;
}

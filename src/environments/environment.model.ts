export interface AppEnvironment {
  production: boolean;
  apiBaseUrl: string;
  appName: string;
  environmentName: string;
  /** Clave de Google Maps (Maps JavaScript API) para el mapa del prototipo de RRHH; vacía = el mapa avisa que falta. */
  googleMapsKey?: string;
}

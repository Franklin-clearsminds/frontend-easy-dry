import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../app/core/config/env';
import { AuthService } from '../app/core/services/auth.service';
import { jwtInterceptor } from '../app/core/interceptors/jwt.interceptor';
import { errorInterceptor } from '../app/core/interceptors/error.interceptor';
import mundoJson from './mundo.generated.json';

/**
 * Pruebas de la web contra el backend REAL y la base local (sin mocks de la API).
 *
 * `npm run test:integracion` crea el mundo (usuarios con contraseña conocida, máquina, limpiezas, notificaciones),
 * levanta el backend, corre `ng test` y lo borra todo al terminar. Con `npm test` a secas no hay mundo y estos specs se
 * marcan como pendientes (`pending`) en vez de fallar.
 */
export interface Mundo {
  disponible: boolean;
  clave: string;
  usuarios: Record<string, { id: string; email: string }>;
  rolId: Record<string, string>;
  agenciaId: string;
  regionId: string;
  maquinaria: { id: string; codigo: string; nombre: string };
  /** Máquina de OTRA agencia: quien trabaja en la agencia del mundo no puede registrarle limpiezas. */
  maquinariaAjena: { id: string; codigo: string };
  limpiezas: { paraEditar: string; paraEliminar: string; paraExportar: string };
  notificaciones: Record<string, string[]>;
  marca: string;
}

export const mundo = mundoJson as unknown as Mundo;
export const hayMundo = mundo.disponible === true;

/** Marca el spec como pendiente si no se ejecuta con el orquestador. Llamar al inicio de un `beforeEach`. */
export function requiereMundo(): void {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // hay red real de por medio
  if (!hayMundo) pending('Sin backend real: ejecuta `npm run test:integracion`.');
}

/** HttpClient + interceptores reales (JWT y errores) y un router vacío. */
export function proveedoresApiReal(): Array<Provider | EnvironmentProviders> {
  return [provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])), provideRouter([{ path: '**', children: [] }])];
}

/** Inicia sesión de verdad con `/auth/login` como uno de los usuarios del mundo. */
export async function iniciarSesion(auth: AuthService, clave: keyof Mundo['usuarios'] | string): Promise<void> {
  const resultado = await firstValueFrom(auth.login(mundo.usuarios[clave].email, mundo.clave));
  if (!resultado.success) throw new Error(`No se pudo iniciar sesión como ${clave}: ${resultado.message}`);
}

/** Espera (sondeando) a que `condicion` sea verdadera: para efectos que ocurren después de una respuesta o un evento real. */
export async function esperar(condicion: () => boolean, ms = 8000): Promise<void> {
  const limite = Date.now() + ms;
  while (!condicion()) {
    if (Date.now() > limite) throw new Error('La condición no se cumplió a tiempo');
    await new Promise((r) => setTimeout(r, 50));
  }
}

/**
 * POST real al backend con la sesión de OTRO usuario del mundo (p. ej. un administrador que cambia el rol de alguien).
 * Va directo al servidor, sin interceptores: el interceptor JWT pisaría el encabezado con la sesión abierta en la prueba.
 */
export async function postComo(clave: string, ruta: string, cuerpo: object): Promise<any> {
  const http = new HttpClient(TestBed.inject(HttpBackend));
  const sesion: any = await firstValueFrom(http.post(apiUrl('/auth/login'), { email: mundo.usuarios[clave].email, password: mundo.clave }));
  try {
    return await firstValueFrom(http.post(apiUrl(ruta), cuerpo, { headers: { Authorization: `Bearer ${sesion.accessToken}` } }));
  } catch (e: any) {
    throw new Error(`${ruta} como ${clave}: ${e?.status} ${JSON.stringify(e?.error)}`);
  }
}

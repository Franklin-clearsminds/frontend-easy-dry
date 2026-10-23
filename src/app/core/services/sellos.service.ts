import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../config/env';
import { SelloConfig } from '../models/auditorias.model';

export interface DatosSello {
  nombre: string;
  apellido: string;
  /** Imagen en data URL; en la edición, una cadena vacía quita el logo y `undefined` lo deja como está. */
  logo?: string;
  password?: string;
  estado?: number;
}

/** Sellos de los jefes de taller (solo Admin y Super Admin): nombre, apellido, logo y contraseña con la que se firma. */
@Injectable({ providedIn: 'root' })
export class SellosService {
  private readonly http = inject(HttpClient);
  private readonly base = '/sellos-jefe-taller';

  listar(): Observable<SelloConfig[]> {
    return this.http.post<SelloConfig[]>(apiUrl(`${this.base}/list`), {});
  }

  crear(datos: DatosSello & { password: string }): Observable<SelloConfig> {
    return this.http.post<SelloConfig>(apiUrl(`${this.base}/create`), datos);
  }

  editar(id: string, datos: Partial<DatosSello>): Observable<SelloConfig> {
    return this.http.post<SelloConfig>(apiUrl(`${this.base}/update`), { id, ...datos });
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ClienteSucursal, MarcaSucursal } from '../models';
import { ClienteService } from './cliente.service';
import { ConsultaTabla } from '../models/paginacion.model';
import { PaginaConResumen, cuerpoConsulta, postPagina } from '../utils/tabla-servidor';

@Injectable({
  providedIn: 'root'
})
export class MarcaSucursalService {
  private clienteService = inject(ClienteService);
  public marcas$ = this.clienteService.clientes$;

  getMarcas(): Observable<MarcaSucursal[]> {
    return this.clienteService.getClientes();
  }

  getMarcasPagina(c: Partial<ConsultaTabla>): Observable<PaginaConResumen<MarcaSucursal>> {
    return this.clienteService.getClientesPagina(c);
  }

  getActivas(): MarcaSucursal[] {
    return this.clienteService.getActivos();
  }

  getById(id: number | string): MarcaSucursal | undefined {
    return this.clienteService.getById(id);
  }

  crear(marca: Omit<MarcaSucursal, 'id' | 'codigo'>): Observable<MarcaSucursal> {
    return this.clienteService.crear(marca);
  }

  actualizar(marca: MarcaSucursal, incluirEstado = true): Observable<MarcaSucursal> {
    return this.clienteService.actualizar(marca, incluirEstado);
  }

  /** Activa o desactiva un cliente (permiso 'agencias.clientes.estado'). El error del servidor se propaga. */
  cambiarEstado(id: string | number, activo: boolean): Observable<any> {
    return this.clienteService.toggleEstado(String(id), activo ? 1 : 0);
  }
}

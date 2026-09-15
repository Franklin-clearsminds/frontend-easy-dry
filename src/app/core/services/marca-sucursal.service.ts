import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ClienteSucursal, MarcaSucursal } from '../models';
import { ClienteService } from './cliente.service';

@Injectable({
  providedIn: 'root'
})
export class MarcaSucursalService {
  private clienteService = inject(ClienteService);
  public marcas$ = this.clienteService.clientes$;

  getMarcas(): Observable<MarcaSucursal[]> {
    return this.clienteService.getClientes();
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

  actualizar(marca: MarcaSucursal): Observable<MarcaSucursal> {
    return this.clienteService.actualizar(marca);
  }
}

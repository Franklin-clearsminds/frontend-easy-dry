import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { VehiculoServicio } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class ServicioLavadoMockService {
  private http = inject(HttpClient);
  private serviciosSubject = new BehaviorSubject<VehiculoServicio[]>([]);
  public servicios$ = this.serviciosSubject.asObservable();

  private mapBackendServicio(s: any): VehiculoServicio {
    const estadoMap: Record<string, string> = {
      'EN_ESPERA': 'En Cola',
      'EN_PROCESO': 'EN PROCESO',
      'FINALIZADO': 'FINALIZADO',
      'APROBADO': 'APROBADO',
      'RECHAZADO': 'RECHAZADO',
      'CANCELADO': 'CANCELADO'
    };

    const horaIngreso = s.horaIngreso ? new Date(s.horaIngreso).toTimeString().substring(0, 5) : '08:00';
    const horaSalida = s.horaSalida ? new Date(s.horaSalida).toTimeString().substring(0, 5) : '--:--';
    const fecha = s.horaIngreso ? new Date(s.horaIngreso).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    return {
      id: s.id,
      numeroOrden: s.clientUuid ? `OT-${s.clientUuid.substring(0, 6).toUpperCase()}` : `OT-${String(s.id).substring(0, 6)}`,
      ordenTrabajoOT: s.clientUuid ? `OT-${s.clientUuid.substring(0, 6).toUpperCase()}` : `OT-${String(s.id).substring(0, 6)}`,
      placa: s.placa || '',
      marca: s.marca || s.modelo?.split(' ')[0] || 'Vehículo',
      modelo: s.modelo || '',
      anio: 2024,
      color: s.color || 'Blanco',
      categoriaServicio: s.catalogo?.categoria || 'GENERAL',
      servicioId: s.servicioCatalogoId,
      servicio: s.catalogo?.nombre || 'Lavado Express',
      categoria: 'Sedán',
      agencia: s.bahia?.agencia?.nombre || 'EasyDry Principal',
      bahia: s.bahia?.nombre || 'Bahía Principal',
      empleado: s.operador ? `${s.operador.name || ''} ${s.operador.lastname || ''}`.trim() : 'Operador',
      fecha,
      horaIngreso,
      horaSalida,
      estado: estadoMap[s.estado] || s.estado || 'EN PROCESO',
      foto: s.fotoIngresoUrl || '',
      fotos: s.fotoIngresoUrl ? [s.fotoIngresoUrl] : [],
      video: '',
      tiempoEstimadoMin: s.catalogo?.tiempoEstimadoMin || 30,
      notas: s.observaciones || '',
      observacionGerente: s.observacionGerente || '',
      aprobadoPor: s.aprobadoPor || '',
      fechaAprobacion: s.fechaAprobacion ? new Date(s.fechaAprobacion).toISOString().substring(0, 16) : undefined
    };
  }

  getServicios(): Observable<VehiculoServicio[]> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/list'), {}).pipe(
      map(res => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        return list.map((s: any) => this.mapBackendServicio(s));
      }),
      tap(mapped => this.serviciosSubject.next(mapped)),
      catchError(() => of(this.serviciosSubject.value))
    );
  }

  getServiciosPorSucursal(sucursal: string): Observable<VehiculoServicio[]> {
    return this.getServicios().pipe(
      map(list => {
        if (!sucursal || sucursal.toLowerCase().includes('toda')) return list;
        return list.filter(s => s.agencia.toLowerCase().includes(sucursal.toLowerCase()) || sucursal.toLowerCase().includes(s.agencia.toLowerCase()));
      })
    );
  }

  getServiciosDelDia(fecha?: string): Observable<VehiculoServicio[]> {
    const target = fecha || new Date().toISOString().split('T')[0];
    return this.getServicios().pipe(
      map(list => list.filter(s => s.fecha.startsWith(target)))
    );
  }

  crearRegistroHojaServicio(nuevo: Partial<VehiculoServicio> & { bahiaId?: string; servicioCatalogoId?: number }): Observable<VehiculoServicio> {
    const payload = {
      placa: nuevo.placa || 'PDF-0000',
      modelo: nuevo.modelo || `${nuevo.marca || ''} ${nuevo.modelo || ''}`.trim() || 'Modelo General',
      color: nuevo.color || 'Blanco',
      cliente: (nuevo as any).cliente || 'Cliente General',
      bahiaId: nuevo.bahiaId || (nuevo as any).bahia || 'default-bahia',
      servicioCatalogoId: nuevo.servicioCatalogoId || Number(nuevo.servicioId) || 1,
      observaciones: nuevo.notas || ''
    };

    return this.http.post<any>(apiUrl('/operaciones/servicios/create'), payload).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(created => {
        const current = this.serviciosSubject.value;
        this.serviciosSubject.next([created, ...current]);
      }),
      catchError(err => {
        console.error('Error al registrar servicio:', err);
        throw err;
      })
    );
  }

  finalizarServicioOperador(id: string | number): Observable<VehiculoServicio | null> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/update'), {
      id: String(id),
      estado: 'FINALIZADO',
      horaSalida: new Date().toISOString()
    }).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(updated => {
        const current = this.serviciosSubject.value;
        const idx = current.findIndex(s => s.id === id);
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...updated, estado: 'FINALIZADO' };
          this.serviciosSubject.next([...current]);
        }
      }),
      catchError(() => of(null))
    );
  }

  aprobarServicioGerente(id: string | number, observacion?: string, gerenteNombre?: string): Observable<VehiculoServicio | null> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/aprobar'), {
      id: String(id),
      observacion: observacion || 'Aprobado sin observaciones.'
    }).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(updated => {
        const current = this.serviciosSubject.value;
        const idx = current.findIndex(s => s.id === id);
        if (idx !== -1) {
          current[idx] = {
            ...current[idx],
            ...updated,
            estado: 'APROBADO',
            observacionGerente: observacion,
            aprobadoPor: gerenteNombre
          };
          this.serviciosSubject.next([...current]);
        }
      }),
      catchError(() => of(null))
    );
  }

  rechazarServicioGerente(id: string | number, motivo: string, gerenteNombre?: string): Observable<VehiculoServicio | null> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/rechazar'), {
      id: String(id),
      motivo
    }).pipe(
      map(res => this.mapBackendServicio(res)),
      tap(updated => {
        const current = this.serviciosSubject.value;
        const idx = current.findIndex(s => s.id === id);
        if (idx !== -1) {
          current[idx] = {
            ...current[idx],
            ...updated,
            estado: 'RECHAZADO',
            observacionGerente: `RECHAZADO: ${motivo}`,
            aprobadoPor: gerenteNombre
          };
          this.serviciosSubject.next([...current]);
        }
      }),
      catchError(() => of(null))
    );
  }

  aprobarTodosLosServiciosDelDia(sucursal: string, gerenteNombre?: string): Observable<boolean> {
    return this.http.post<any>(apiUrl('/operaciones/servicios/aprobar-todos'), {
      sucursalId: sucursal
    }).pipe(
      map(res => Boolean(res)),
      tap(() => {
        const current = this.serviciosSubject.value;
        current.forEach(s => {
          if (s.estado === 'FINALIZADO') {
            s.estado = 'APROBADO';
            s.aprobadoPor = gerenteNombre;
          }
        });
        this.serviciosSubject.next([...current]);
      }),
      catchError(() => of(false))
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Incidente } from '../models';
import { apiUrl } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class IncidenteService {
  private http = inject(HttpClient);
  private incidentesSubject = new BehaviorSubject<Incidente[]>([]);
  public incidentes$ = this.incidentesSubject.asObservable();

  private mapBackendIncidente(item: any): Incidente {
    const maqNombre = item.maquinaria?.nombre || item.maquinaria?.codigo || item.maquina || 'Equipo';
    const agNombre = item.maquinaria?.agencia?.nombre || item.agencia || 'Taller Central';
    const repNombre = item.reportadoPor ? `${item.reportadoPor.name || ''} ${item.reportadoPor.lastname || ''}`.trim() || item.reportadoPor.email : (item.reportadoPor || 'Operador');
    const resNombre = item.resueltoPor ? `${item.resueltoPor.name || ''} ${item.resueltoPor.lastname || ''}`.trim() : (item.solucionadoPor || undefined);

    const fechaStr = item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : (item.fecha || new Date().toISOString().split('T')[0]);

    return {
      id: item.id,
      codigoIncidente: item.codigoIncidente || (typeof item.id === 'string' ? `INC-${item.id.substring(0, 6).toUpperCase()}` : `INC-2026-${String(item.id).padStart(3, '0')}`),
      maquina: maqNombre,
      agencia: agNombre,
      fecha: fechaStr,
      tipo: item.titulo || item.tipo || 'Falla técnica',
      prioridad: item.gravedad ? (item.gravedad === 'CRITICA' ? 'Crítica' : item.gravedad === 'ALTA' ? 'Alta' : item.gravedad === 'BAJA' ? 'Baja' : 'Media') : (item.prioridad || 'Media'),
      estado: item.estado === 'ABIERTO' ? 'Pendiente' : item.estado === 'EN_PROCESO' ? 'En Solución' : item.estado === 'RESUELTO' ? 'Solucionado' : (item.estado || 'Pendiente'),
      descripcion: item.descripcion || '',
      reportadoPor: repNombre,
      tecnicoAsignadoId: item.resueltoPorId || item.tecnicoAsignadoId,
      tecnicoAsignadoNombre: resNombre || item.tecnicoAsignadoNombre,
      gestorAsignadorId: item.gestorAsignadorId,
      gestorAsignadorNombre: item.gestorAsignadorNombre,
      fechaAsignacion: item.fechaAsignacion,
      fotosFallo: item.fotoEvidenciaUrl ? [item.fotoEvidenciaUrl] : (item.fotosFallo || []),
      fechaSolucion: item.fechaSolucion ? new Date(item.fechaSolucion).toISOString().split('T')[0] : undefined,
      solucionadoPor: resNombre,
      observacionSolucion: item.solucion || item.observacionSolucion
    };
  }

  getIncidentes(filtro?: { maquinariaId?: string; estado?: string; gravedad?: string; agenciaId?: string }): Observable<Incidente[]> {
    const payload = filtro || {};
    return this.http.post<any>(apiUrl('/maquinaria/incidentes/list'), payload).pipe(
      map(res => {
        const rawItems = Array.isArray(res) ? res : (res?.data || []);
        return rawItems.map((item: any) => this.mapBackendIncidente(item));
      }),
      tap(items => this.incidentesSubject.next(items)),
      catchError(() => of(this.incidentesSubject.value))
    );
  }

  crearIncidente(inc: Omit<Incidente, 'id'>): Observable<Incidente> {
    const gravedad = inc.prioridad === 'Crítica' ? 'CRITICA' : inc.prioridad === 'Alta' ? 'ALTA' : inc.prioridad === 'Baja' ? 'BAJA' : 'MEDIA';
    const payload = {
      maquinariaId: String(inc.maquina || (inc as any).maquinariaId || (inc as any).id || ''),
      titulo: inc.tipo || 'Falla técnica',
      descripcion: inc.descripcion || '',
      gravedad,
      fotoEvidenciaUrl: inc.fotosFallo?.[0] || undefined
    };

    return this.http.post<any>(apiUrl('/maquinaria/incidentes/reportar'), payload).pipe(
      map(res => this.mapBackendIncidente(res?.data || res)),
      tap(nuevo => {
        const current = this.incidentesSubject.value;
        this.incidentesSubject.next([nuevo, ...current]);
      }),
      catchError(err => {
        console.error('Error al reportar incidente:', err);
        throw err;
      })
    );
  }

  registrarIncidente(inc: Omit<Incidente, 'id' | 'codigoIncidente'>): Observable<Incidente> {
    return this.crearIncidente(inc as any);
  }

  actualizarEstado(id: number | string, nuevoEstado: Incidente['estado'], solucion?: string): Observable<Incidente | null> {
    const estadoBackend = nuevoEstado === 'Solucionado' || nuevoEstado === 'Resuelto' ? 'RESUELTO' : 'EN_PROCESO';
    return this.http.post<any>(apiUrl('/maquinaria/incidentes/resolver'), {
      incidenteId: String(id),
      estado: estadoBackend,
      solucion: solucion || 'Incidente atendido y resuelto en taller.'
    }).pipe(
      map(res => this.mapBackendIncidente(res?.data || res)),
      tap(actualizado => {
        const current = this.incidentesSubject.value;
        const idx = current.findIndex(i => String(i.id) === String(id));
        if (idx !== -1) {
          current[idx] = actualizado;
          this.incidentesSubject.next([...current]);
        }
      }),
      catchError(() => of(null))
    );
  }

  asignarIncidente(
    id: string | number,
    tecnicoId: string | number,
    tecnicoNombre: string,
    gestorId: string | number,
    gestorNombre: string
  ): Observable<Incidente | null> {
    return this.actualizarEstado(id, 'En Solución', `Asignado a técnico ${tecnicoNombre}`);
  }

  cancelarAsignacion(id: string | number): Observable<Incidente | null> {
    const current = this.incidentesSubject.value;
    const idx = current.findIndex(i => String(i.id) === String(id));
    if (idx === -1) return of(null);
    const updated = { ...current[idx], estado: 'Pendiente', tecnicoAsignadoId: undefined, tecnicoAsignadoNombre: undefined };
    current[idx] = updated;
    this.incidentesSubject.next([...current]);
    return of(updated);
  }
}

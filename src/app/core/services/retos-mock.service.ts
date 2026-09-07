import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Reto } from '../models/reto.model';
import { AuthService } from './auth.service';
import { SucursalMockService } from './sucursal-mock.service';

const STORAGE_KEY = 'easydry_retos_mock';

const RETOS_DEFAULT: Reto[] = [
  {
    id: '1',
    titulo: 'Reto EasyDry - "Cero Reclamos & Máximo Rendimiento"',
    descripcion: 'Competencia mensual entre agencias y técnicos especialistas',
    premio: 'Bonificación Equipo + Día Libre',
    fechaInicio: '2026-07-01',
    fechaFin: '2026-07-31',
    regiones: ['Todas'],
    marcas: ['Todas'],
    sucursalesIds: [], // Todas
    creadoPorId: 1,
    creadorNombre: 'Admin General',
    creadorRol: 'SUPER_ADMIN',
    estado: 'ACTIVO',
    criterios: [
      'Velocidad promedio < 40 min / auto',
      'Fotos y videos aprobados 100%',
      'Cero incidentes técnicos registrados'
    ]
  },
  {
    id: '2',
    titulo: 'Sprint de Ventas Especiales - "Premium Shield"',
    descripcion: 'Impulso comercial para tratamientos cerámicos y recubrimientos',
    premio: 'Cena de Lujo para la Agencia Ganadora',
    fechaInicio: '2026-08-01',
    fechaFin: '2026-08-15',
    regiones: ['Costa', 'Sierra'],
    marcas: ['EasyDry Premium'],
    sucursalesIds: [], 
    creadoPorId: 1,
    creadorNombre: 'Admin General',
    creadorRol: 'SUPER_ADMIN',
    estado: 'ACTIVO',
    criterios: [
      '+20% Ventas en Premium Shield',
      'Atención al cliente 5 estrellas',
    ]
  },
  {
    id: '3',
    titulo: 'Desafío Interno Cumbayá: "Ninja del Detallado"',
    descripcion: 'Mejorar los tiempos de detallado interior sin perder calidad',
    premio: 'Kit Herramientas Pro + $100',
    fechaInicio: '2026-08-10',
    fechaFin: '2026-08-30',
    regiones: ['Sierra'],
    marcas: ['EasyDry'],
    sucursalesIds: [1], // Asumiendo que 1 es Cumbayá
    creadoPorId: 2,
    creadorNombre: 'Juan Pérez (Gerente)',
    creadorRol: 'GERENTE',
    estado: 'ACTIVO',
    criterios: [
      'Detallado interior < 25 min',
      'Aprobación de QA a la primera'
    ]
  }
];

@Injectable({
  providedIn: 'root'
})
export class RetosMockService {
  private auth = inject(AuthService);
  private sucursalService = inject(SucursalMockService);

  private getStoredRetos(): Reto[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    this.saveRetos(RETOS_DEFAULT);
    return [...RETOS_DEFAULT];
  }

  private saveRetos(retos: Reto[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(retos));
  }

  getRetosVisibles(): Observable<Reto[]> {
    const todos = this.getStoredRetos();
    const user = this.auth.getCurrentUser();
    
    if (!user) return of([]);
    
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return of(todos);
    }

    // Coord. Comercial: ve retos globales o de su región asignada
    if (user.role === 'COORD_COMERCIAL') {
      const region = user.region || 'Todas';
      const filtrados = todos.filter(reto => {
        const esGlobal = !reto.regiones || reto.regiones.length === 0 || reto.regiones.includes('Todas');
        const coincideRegion = reto.regiones?.includes(region);
        return esGlobal || coincideRegion || region === 'Nacional';
      });
      return of(filtrados).pipe(delay(200));
    }

    // Para el resto de roles (GERENTE, SUPERVISOR, OPERADOR, etc)
    // Filtramos los retos donde su sucursal participe, o si el reto incluye "Todas".
    const userSucursal = user.sucursal; // es el ID
    if (!userSucursal) return of([]);

    const filtrados = todos.filter(reto => {
      // Si el reto es global (sin filtro de sucursales)
      const esGlobalAgencias = !reto.sucursalesIds || reto.sucursalesIds.length === 0;
      const incluyeAgencia = reto.sucursalesIds?.includes(Number(userSucursal));

      if (esGlobalAgencias || incluyeAgencia) {
        return true;
      }
      return false;
    });

    return of(filtrados).pipe(delay(200));
  }

  crearReto(nuevoReto: Partial<Reto>): Observable<Reto> {
    const user = this.auth.getCurrentUser();
    if (!user) throw new Error('No autorizado');

    const retos = this.getStoredRetos();
    const reto: Reto = {
      ...nuevoReto,
      id: Math.random().toString(36).substr(2, 9),
      creadoPorId: user.id || 0,
      creadorNombre: user.nombre || 'Administrador',
      creadorRol: user.role || 'DESCONOCIDO',
      estado: 'ACTIVO',
    } as Reto;

    retos.push(reto);
    this.saveRetos(retos);
    return of(reto);
  }

  eliminarReto(id: string): Observable<boolean> {
    const retos = this.getStoredRetos();
    const index = retos.findIndex(r => r.id === id);
    if (index !== -1) {
      retos.splice(index, 1);
      this.saveRetos(retos);
      return of(true).pipe(delay(300));
    }
    return of(false);
  }
}

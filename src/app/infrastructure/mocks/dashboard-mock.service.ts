import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface DashboardKPIs {
  vehiculosAtendidosHoy: number;
  serviciosRealizadosMes: number;
  agenciasActivas: number;
  empleadosTotales: number;
  serviciosEspecialesCount: number;
  serviciosGeneralesCount: number;
  totalServiciosCount: number;
  maquinasConProblemas: number;
  crecimientoProduccionPct: number;
  productividadPromedioPct: number;
  topServicios: { nombre: string, cantidad: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardMockService {
  getKPIs(): Observable<DashboardKPIs> {
    const kpis: DashboardKPIs = {
      vehiculosAtendidosHoy: 48,
      serviciosRealizadosMes: 1248,
      agenciasActivas: 4,
      empleadosTotales: 58,
      serviciosEspecialesCount: 5000,
      serviciosGeneralesCount: 15000,
      totalServiciosCount: 20000,
      maquinasConProblemas: 2,
      crecimientoProduccionPct: 14.8,
      productividadPromedioPct: 95.1,
      topServicios: [
        { nombre: 'Lavado completo', cantidad: 8500 },
        { nombre: 'Express', cantidad: 6000 },
        { nombre: 'Pulido', cantidad: 3500 }
      ]
    };
    return of(kpis);
  }

  getProduccionDiariaChartData() {
    return of({
      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      datasets: [
        {
          label: 'Vehículos Atendidos',
          data: [52, 64, 58, 71, 85, 92, 48],
          borderColor: '#07558C',
          backgroundColor: 'rgba(7, 85, 140, 0.15)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#9BCB3B',
          pointBorderColor: '#07558C',
          pointRadius: 5,
          pointHoverRadius: 8
        }
      ]
    });
  }

  getServiciosPorAgenciaChartData() {
    return of({
      labels: ['Quito Norte', 'Quito Sur', 'Cumbayá', 'Guayaquil'],
      datasets: [
        {
          label: 'Servicios de Lavado',
          data: [380, 290, 210, 368],
          backgroundColor: ['#07558C', '#0A70B8', '#9BCB3B', '#B2E040'],
          borderRadius: 6
        }
      ]
    });
  }

  getServiciosGeneralVsEspecialesData() {
    return of({
      labels: ['Express & Completo', 'Deluxe & Pulido', 'Recubrimiento Cerámico'],
      datasets: [
        {
          data: [65, 23, 12],
          backgroundColor: ['#07558C', '#9BCB3B', '#B2E040'],
          hoverOffset: 8
        }
      ]
    });
  }
}

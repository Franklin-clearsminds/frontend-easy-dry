import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { DashboardOperativoService } from '../../core/services/dashboard-operativo.service';
import { AuthService } from '../../core/services/auth.service';
import { Role, ROLE_LABELS } from '../../core/models/roles.model';

// Nuevos Widgets
import { AlertasWidgetComponent } from './components/alertas-widget.component';
import { RankingOperadoresWidgetComponent } from './components/ranking-operadores-widget.component';
import { AprobacionesWidgetComponent } from './components/aprobaciones-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
    StatCardComponent,
    ChartCardComponent,
    AlertasWidgetComponent,
    RankingOperadoresWidgetComponent,
    AprobacionesWidgetComponent,
    DatePipe
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  // Servicios
  private dashboardService = inject(DashboardOperativoService);
  public auth = inject(AuthService);

  // Mocks Data (Active)
  produccion: any;
  operadores: any;
  serviciosData: any;
  maquinaria: any;
  alertas: any[] = [];

  // Mocks Data (Base for filtering)
  private baseProduccion: any;
  private baseServiciosData: any;

  // Filtros
  sucursalFilter = 'Todas';
  modeloFilter = 'Todos';
  colorFilter = 'Todos';
  fechaFilter = 'Hoy';
  fechaInicio = '';
  fechaFin = '';

  listaSucursales = ['Todas', 'Quito Norte', 'Quito Sur', 'Cumbayá', 'Guayaquil'];
  listaModelos = ['Todos', 'Sedán', 'SUV', 'Camioneta', 'Hatchback', 'Moto'];
  listaColores = ['Todos', 'Blanco', 'Negro', 'Plata', 'Gris', 'Rojo', 'Azul'];
  listaFechas = ['Hoy', 'Esta Semana', 'Este Mes', 'Este Año', 'Personalizado'];

  fechaActual = new Date();
  
  // Helpers Roles (cacheados para no recalcular en cada CD)
  currentRole: Role | string | null = null;
  isSuperAdmin = false;
  isGerente = false;
  isSupervisor = false;
  isOperador = false;
  isTecnico = false;
  sucursalNombre = '';
  bahiaNombre = '';
  rolLabel = '';
  contextLabel = '';

  ngOnInit(): void {
    this.currentRole = Role.SUPER_ADMIN;
    this.isSuperAdmin = true;
    this.isGerente = false;
    this.isSupervisor = false;
    this.isOperador = false;
    this.isTecnico = false;
    this.rolLabel = 'Super Administrador';
    this.contextLabel = 'Red Nacional EasyDry®';

    this.dashboardService.getProduccion().subscribe(d => {
      this.baseProduccion = JSON.parse(JSON.stringify(d));
      this.produccion = JSON.parse(JSON.stringify(d));
    });
    this.dashboardService.getOperadores().subscribe(d => this.operadores = d);
    this.dashboardService.getServiciosData().subscribe(d => {
      this.baseServiciosData = JSON.parse(JSON.stringify(d));
      this.serviciosData = JSON.parse(JSON.stringify(d));
    });
    this.dashboardService.getMaquinaria().subscribe(d => this.maquinaria = d);
    this.dashboardService.getAlertas().subscribe(d => this.alertas = d);
  }

  aplicarFiltros() {
    if (!this.baseProduccion || !this.baseServiciosData) return;

    // Calcular un factor de escala matemático basado en los filtros seleccionados
    // para simular que hay menos o más datos.
    let factor = 1.0;

    if (this.sucursalFilter !== 'Todas') factor *= 0.25;
    if (this.modeloFilter !== 'Todos') factor *= 0.3;
    if (this.colorFilter !== 'Todos') factor *= 0.15;
    
    if (this.fechaFilter === 'Esta Semana') factor *= 5;
    else if (this.fechaFilter === 'Este Mes') factor *= 20;
    else if (this.fechaFilter === 'Este Año') factor *= 150;
    else if (this.fechaFilter === 'Personalizado') factor *= 3.5;

    // Clonar datos base
    const prod = JSON.parse(JSON.stringify(this.baseProduccion));
    const serv = JSON.parse(JSON.stringify(this.baseServiciosData));

    // Escalar métricas principales
    prod.vehiculosHoy = Math.round(prod.vehiculosHoy * factor);
    serv.generales = Math.round(serv.generales * factor);
    serv.especiales = Math.round(serv.especiales * factor);

    // Escalar datos de gráficos de líneas (Producción por hora)
    if (prod.produccionPorHora && prod.produccionPorHora.datasets) {
      prod.produccionPorHora.datasets.forEach((ds: any) => {
        ds.data = ds.data.map((val: number) => Math.max(0, Math.round((val * factor) + (Math.random() * 10 - 5))));
      });
    }

    // Escalar gráficos de pastel (Distribución)
    if (serv.distribucionGenerales && serv.distribucionGenerales.datasets) {
      serv.distribucionGenerales.datasets.forEach((ds: any) => {
         ds.data = ds.data.map((val: number) => Math.max(1, Math.round((val * factor) + (Math.random() * 10 - 5))));
      });
    }

    // Escalar barras (Especiales)
    if (serv.distribucionEspeciales && serv.distribucionEspeciales.datasets) {
      serv.distribucionEspeciales.datasets.forEach((ds: any) => {
         ds.data = ds.data.map((val: number) => Math.max(1, Math.round((val * factor) + (Math.random() * 10 - 5))));
      });
    }

    // Reasignar referencias para disparar actualización
    this.produccion = prod;
    this.serviciosData = serv;
  }

  resetFiltros() {
    this.sucursalFilter = 'Todas';
    this.modeloFilter = 'Todos';
    this.colorFilter = 'Todos';
    this.fechaFilter = 'Hoy';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.produccion = JSON.parse(JSON.stringify(this.baseProduccion));
    this.serviciosData = JSON.parse(JSON.stringify(this.baseServiciosData));
  }
}

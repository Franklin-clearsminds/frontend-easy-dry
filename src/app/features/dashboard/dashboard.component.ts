import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { DashboardOperativoService } from '../../core/services/dashboard-operativo.service';
import { AuthService } from '../../core/services/auth.service';
import { MarcaSucursalService } from '../../core/services/marca-sucursal.service';
import { Role, ROLE_LABELS } from '../../core/models/roles.model';
import { AlertasWidgetComponent } from './components/alertas-widget.component';
import { RankingOperadoresWidgetComponent } from './components/ranking-operadores-widget.component';
import { AprobacionesWidgetComponent } from './components/aprobaciones-widget.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

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
    FilterBarComponent,
    DatePipe
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardOperativoService);
  private marcaService = inject(MarcaSucursalService);
  public auth = inject(AuthService);

  produccion: any;
  operadores: any;
  serviciosData: any;
  maquinaria: any;
  alertas: any[] = [];

  // Nuevos KPIs Estratégicos
  kpiRechazoOTs = '4.2%';
  kpiMttrMaquinaria = '2.5 hrs';
  kpiStockCritico = '8 ítems';

  // Datos para Nuevos Gráficos
  chartCalidadOTs: any = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      { label: 'Aprobadas', data: [45, 52, 48, 60, 65, 80, 75], backgroundColor: '#9BCB3B' },
      { label: 'Rechazadas', data: [2, 4, 1, 3, 5, 8, 4], backgroundColor: '#E11D48' }
    ]
  };

  chartBodegaConsumo: any = {
    labels: ['Shampoo Cera', 'Desengrasante', 'Silicona', 'Cera Express', 'Microfibras'],
    datasets: [{
      data: [120, 85, 60, 45, 30],
      backgroundColor: ['#004282', '#005bb5', '#0074e8', '#3392ff', '#66afff']
    }]
  };

  // Nuevos Datos Analítica
  chartTiemposPromedio: any = {
    labels: ['Lavado Express', 'Lavado Premium', 'Desinfección', 'Pulido'],
    datasets: [{
      label: 'Minutos Promedio',
      data: [15, 35, 20, 120],
      backgroundColor: ['#9BCB3B', '#F59E0B', '#3B82F6', '#8B5CF6']
    }]
  };

  chartEficienciaSucursales: any = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      { label: 'Quito Norte', data: [85, 88, 90, 87, 92, 95, 96], borderColor: '#004282', fill: false, tension: 0.4 },
      { label: 'Quito Sur', data: [80, 82, 85, 83, 88, 90, 92], borderColor: '#9BCB3B', fill: false, tension: 0.4 },
      { label: 'Cumbayá', data: [90, 92, 95, 93, 96, 98, 99], borderColor: '#E11D48', fill: false, tension: 0.4 }
    ]
  };

  // Nuevos Datos Bodega/Inventario
  chartPromedioConsumoDiario: any = {
    labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    datasets: [
      { label: 'Shampoo (L)', data: [5, 4.5, 6, 5.5, 8, 12, 10], backgroundColor: '#3B82F6' },
      { label: 'Silicona (L)', data: [2, 1.8, 2.5, 2.2, 3, 5, 4], backgroundColor: '#8B5CF6' }
    ]
  };

  productosAgotandose = [
    { nombre: 'Cera Express 5L', stock: 2, minimo: 5, estado: 'crítico' },
    { nombre: 'Microfibras Premium', stock: 15, minimo: 30, estado: 'crítico' },
    { nombre: 'Desengrasante Motor', stock: 8, minimo: 15, estado: 'advertencia' },
    { nombre: 'Aromatizante', stock: 5, minimo: 10, estado: 'advertencia' }
  ];

  activeTab = 'general';
  tecnicoData: any;
  operadorData: any;
  operadorEspecialesData: any;
  distribuidorData: any;
  comercialData: any;
  resumenEjecutivo: any;

  private baseProduccion: any;
  private baseServiciosData: any;

  sucursalFilter = 'Todas';
  marcaFilter = 'Todas';
  modeloFilter = 'Todos';
  colorFilter = 'Todos';
  fechaFilter = 'Hoy';
  fechaInicio = '';
  fechaFin = '';

  listaSucursales = ['Todas', 'Quito Norte', 'Quito Sur', 'Cumbayá', 'Guayaquil'];
  listaMarcas: string[] = [];
  listaModelos = ['Todos', 'Sedán', 'SUV', 'Camioneta', 'Hatchback', 'Moto'];
  listaColores = ['Todos', 'Blanco', 'Negro', 'Plata', 'Gris', 'Rojo', 'Azul'];
  listaFechas = ['Hoy', 'Esta Semana', 'Este Mes', 'Este Año', 'Personalizado'];

  fechaActual = new Date();

  currentRole: Role | string = Role.OPERADOR;
  rolLabel = '';
  contextLabel = '';
  userName = '';

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.currentRole = this.auth.getRole();
    this.userName = user ? `${user.nombre} ${user.apellido}`.trim() : 'Usuario';
    this.rolLabel = ROLE_LABELS[this.currentRole as Role] || user?.rolNombre || 'Colaborador';
    this.contextLabel = user?.sucursal || user?.sucursalNombre || 'Red EasyDry®';

    if (this.isExecutive) {
      this.dashboardService.getProduccion().subscribe(d => {
        this.baseProduccion = this.normalizeProduccion(d);
        this.produccion = JSON.parse(JSON.stringify(this.baseProduccion));
      });
      this.dashboardService.getOperadores().subscribe(d => this.operadores = d);
      this.dashboardService.getServiciosData().subscribe(d => {
        this.baseServiciosData = d;
        this.serviciosData = JSON.parse(JSON.stringify(d));
      });
      this.dashboardService.getMaquinaria().subscribe(d => {
        this.maquinaria = {
          ...d,
          distribucionEstado: {
            labels: ['Operativas', 'Mantenimiento', 'Dañadas'],
            datasets: [{
              data: [d.operativas, d.mantenimiento, d.danadas],
              backgroundColor: ['#9BCB3B', '#F59E0B', '#E11D48']
            }]
          }
        };
      });
      this.dashboardService.getAlertas().subscribe(d => this.alertas = d);
      this.dashboardService.getResumenEjecutivo().subscribe(d => this.resumenEjecutivo = d);
      this.listaMarcas = ['Todas', ...this.marcaService.getActivas().map(m => m.nombre)];
    }

    if (this.isTecnicoRole) {
      this.dashboardService.getDashboardTecnico().subscribe(d => this.tecnicoData = d);
    }
    if (this.isOperador) {
      this.dashboardService.getDashboardOperador().subscribe(d => this.operadorData = d);
    }
    if (this.isOperadorEspeciales) {
      this.dashboardService.getDashboardOperadorEspeciales().subscribe(d => this.operadorEspecialesData = d);
    }
    if (this.isBodega) {
      this.dashboardService.getDashboardDistribuidor().subscribe(d => this.distribuidorData = d);
    }
    if (this.isComercial) {
      this.dashboardService.getDashboardComercial().subscribe(d => this.comercialData = d);
    }
  }

  get isExecutive(): boolean {
    return [Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR, Role.GERENTE].includes(this.currentRole as Role);
  }
  get isTecnicoRole(): boolean {
    return [Role.COORD_MANTENIMIENTO, Role.TECNICO].includes(this.currentRole as Role);
  }
  get isOperador(): boolean {
    return this.currentRole === Role.OPERADOR;
  }
  get isOperadorEspeciales(): boolean {
    return [Role.OPERADOR_SERVICIOS_ESPECIALES, Role.COORD_SERVICIOS_ESPECIALES].includes(this.currentRole as Role);
  }
  get isComercial(): boolean {
    return this.currentRole === Role.COORD_COMERCIAL;
  }
  get isBodega(): boolean {
    const roleStr = (this.currentRole || '').toUpperCase();
    return this.currentRole === Role.DISTRIBUIDOR || this.currentRole === Role.COORD_BODEGA || this.currentRole === Role.ASISTENTE_BODEGA || roleStr.includes('BODEGA') || roleStr.includes('DISTRIBUIDOR');
  }

  private normalizeProduccion(d: any) {
    return {
      ...d,
      totalVehiculos: d.vehiculosHoy ?? d.totalVehiculos ?? 0,
      bahiasOcupadas: d.bahiasOcupadas ?? 8,
      totalBahias: d.totalBahias ?? 10,
      tiempoPromedioMinutos: d.tiempoPromedioMinutos ?? 22,
      flujoHorario: d.flujoHorario ?? d.produccionPorHora,
      distribucionModelos: d.distribucionModelos ?? d.productividadBahias
    };
  }

  activeExecutiveTab: 'analitica' | 'auditoria' | 'inventario' = 'analitica';

  aplicarNuevosFiltros(filtros: FilterState) {
    this.sucursalFilter = filtros.sucursal;
    this.marcaFilter = filtros.cliente || filtros.marca || 'Todas';
    this.fechaFilter = filtros.fecha;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    if (!this.baseProduccion || !this.baseServiciosData) return;
    let factor = 1.0;
    if (this.sucursalFilter !== 'Todas') factor *= 0.25;
    if (this.marcaFilter !== 'Todas' && this.marcaFilter !== 'Todos') factor *= 0.3;
    if (this.modeloFilter !== 'Todos') factor *= 0.3;
    if (this.colorFilter !== 'Todos') factor *= 0.15;
    if (this.fechaFilter === 'Esta Semana') factor *= 5;
    else if (this.fechaFilter === 'Este Mes') factor *= 20;
    else if (this.fechaFilter === 'Este Año') factor *= 150;
    else if (this.fechaFilter === 'Personalizado') factor *= 3.5;

    const prod = JSON.parse(JSON.stringify(this.baseProduccion));
    const serv = JSON.parse(JSON.stringify(this.baseServiciosData));
    prod.totalVehiculos = Math.round(prod.totalVehiculos * factor);
    serv.generales = Math.round(serv.generales * factor);
    serv.especiales = Math.round(serv.especiales * factor);

    if (prod.flujoHorario?.datasets) {
      prod.flujoHorario.datasets.forEach((ds: any) => {
        ds.data = ds.data.map((val: number) => Math.max(0, Math.round(val * factor + (Math.random() * 10 - 5))));
      });
    }
    this.produccion = prod;
    this.serviciosData = serv;
  }

  resetFiltros() {
    this.sucursalFilter = 'Todas';
    this.marcaFilter = 'Todas';
    this.modeloFilter = 'Todos';
    this.colorFilter = 'Todos';
    this.fechaFilter = 'Hoy';
    this.produccion = JSON.parse(JSON.stringify(this.baseProduccion));
    this.serviciosData = JSON.parse(JSON.stringify(this.baseServiciosData));
  }
}

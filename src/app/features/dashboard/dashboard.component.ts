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
  private dashboardService = inject(DashboardOperativoService);
  public auth = inject(AuthService);

  produccion: any;
  operadores: any;
  serviciosData: any;
  maquinaria: any;
  alertas: any[] = [];

  tecnicoData: any;
  operadorData: any;
  extrasData: any;
  distribuidorData: any;
  comercialData: any;

  private baseProduccion: any;
  private baseServiciosData: any;

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
    }

    if (this.isTecnicoRole) {
      this.dashboardService.getDashboardTecnico().subscribe(d => this.tecnicoData = d);
    }
    if (this.isOperador) {
      this.dashboardService.getDashboardOperador().subscribe(d => this.operadorData = d);
    }
    if (this.isExtras) {
      this.dashboardService.getDashboardExtras().subscribe(d => this.extrasData = d);
    }
    if (this.isDistribuidor) {
      this.dashboardService.getDashboardDistribuidor().subscribe(d => this.distribuidorData = d);
    }
    if (this.isComercial) {
      this.dashboardService.getDashboardComercial().subscribe(d => this.comercialData = d);
    }
  }

  get isExecutive(): boolean {
    return [Role.SUPER_ADMIN, Role.SUPERVISOR, Role.GERENTE].includes(this.currentRole as Role);
  }
  get isTecnicoRole(): boolean {
    return [Role.COORD_MANTENIMIENTO, Role.TECNICO].includes(this.currentRole as Role);
  }
  get isOperador(): boolean {
    return this.currentRole === Role.OPERADOR;
  }
  get isExtras(): boolean {
    return [Role.OPERADOR_SERVICIOS_ESPECIALES, Role.COORD_SERVICIOS_ESPECIALES].includes(this.currentRole as Role);
  }
  get isComercial(): boolean {
    return this.currentRole === Role.COORD_COMERCIAL;
  }
  get isDistribuidor(): boolean {
    return this.currentRole === Role.DISTRIBUIDOR;
  }

  private normalizeProduccion(d: any) {
    return {
      ...d,
      totalVehiculos: d.vehiculosHoy ?? d.totalVehiculos ?? 0,
      ingresosEstimados: d.ingresosEstimados ?? 4200,
      bahiasOcupadas: d.bahiasOcupadas ?? 8,
      totalBahias: d.totalBahias ?? 10,
      tiempoPromedioMinutos: d.tiempoPromedioMinutos ?? 22,
      flujoHorario: d.flujoHorario ?? d.produccionPorHora,
      distribucionModelos: d.distribucionModelos ?? d.productividadBahias
    };
  }

  aplicarFiltros() {
    if (!this.baseProduccion || !this.baseServiciosData) return;
    let factor = 1.0;
    if (this.sucursalFilter !== 'Todas') factor *= 0.25;
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
    this.modeloFilter = 'Todos';
    this.colorFilter = 'Todos';
    this.fechaFilter = 'Hoy';
    this.produccion = JSON.parse(JSON.stringify(this.baseProduccion));
    this.serviciosData = JSON.parse(JSON.stringify(this.baseServiciosData));
  }
}

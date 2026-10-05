import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { DashboardOperativoService } from '../../core/services/dashboard-operativo.service';
import { AuthService } from '../../core/services/auth.service';
import { ROLE_LABELS } from '../../core/models/roles.model';
import { AlertasWidgetComponent } from './components/alertas-widget.component';
import { RankingOperadoresWidgetComponent } from './components/ranking-operadores-widget.component';
import { CHART_COLORS } from '../../shared/theme/colors';

/** Qué panel ve el usuario. Se decide por los permisos del rol (los mismos que exige el servidor), no por su nombre. */
export type VistaDashboard = 'taller' | 'especiales' | 'bodega' | 'ejecutivo' | 'ninguna';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    StatCardComponent,
    ChartCardComponent,
    AlertasWidgetComponent,
    RankingOperadoresWidgetComponent,
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
  distribuidorData: any;
  resumenEjecutivo: any;

  fechaActual = new Date();
  rolLabel = '';
  contextLabel = '';
  userName = '';

  activeExecutiveTab: 'analitica' | 'auditoria' | 'inventario' = 'analitica';

  /**
   * taller: mantenimiento y técnicos (ven maquinaria y ejecutan mantenimientos, pero no las OT).
   * especiales: quien atiende servicios especiales sin ver los servicios generales.
   * bodega: inventario y despachos sin ver los servicios.
   * ejecutivo: cualquier otro rol con permiso de dashboard; el servidor ya filtra los datos por el alcance del usuario
   * (todo el país, su región o su agencia).
   */
  get vista(): VistaDashboard {
    const a = this.auth;
    const veServicios = a.puede('servicios.ver');
    if (a.puede('maquinaria.ver') && a.puede('mantenimientos.ejecutar') && !veServicios) return 'taller';
    if (a.puede('especiales.ver') && !veServicios) return 'especiales';
    if (a.puede('inventario.ver') && a.puede('despachos.crear') && !veServicios) return 'bodega';
    if (a.puede('dashboard.ver')) return 'ejecutivo';
    return 'ninguna';
  }

  get puedeVerAlertas(): boolean { return this.auth.puede('alertas.ver'); }
  get puedeVerMaquinaria(): boolean { return this.auth.puede('maquinaria.ver'); }
  get puedeVerUsuarios(): boolean { return this.auth.puede('usuarios.ver'); }
  get puedeVerMapa(): boolean { return this.auth.puede('agencias.ver'); }

  /** Alertas de nivel crítico entre las que llegaron del servidor. */
  get alertasCriticas(): number {
    return this.alertas.filter(a => a.tipo === 'critica').length;
  }

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.userName = user ? `${user.nombre} ${user.apellido}`.trim() : 'Usuario';
    this.rolLabel = ROLE_LABELS[user?.role as keyof typeof ROLE_LABELS] || user?.rolNombre || 'Colaborador';
    this.contextLabel = (user?.ambito === 'REGION' ? user?.region : (user?.sucursal || user?.sucursalNombre)) || 'Red EasyDry®';

    switch (this.vista) {
      case 'ejecutivo': this.cargarEjecutivo(); break;
      case 'taller': this.dashboardService.getDashboardTecnico().subscribe(d => this.tecnicoData = d); break;
      case 'bodega': this.cargarBodega(); break;
      default: break;
    }
  }

  /** Solo se llama a los endpoints para los que el rol tiene permiso (evita errores 403 de fondo). */
  private cargarEjecutivo(): void {
    this.dashboardService.getProduccion().subscribe(d => this.produccion = this.normalizeProduccion(d));
    this.dashboardService.getServiciosData().subscribe(d => this.serviciosData = d);
    this.dashboardService.getResumenEjecutivo().subscribe(d => this.resumenEjecutivo = d);

    if (this.puedeVerUsuarios) {
      this.dashboardService.getOperadores().subscribe(d => this.operadores = d);
    }
    if (this.puedeVerMaquinaria) {
      this.dashboardService.getMaquinaria().subscribe(d => {
        this.maquinaria = {
          ...d,
          distribucionEstado: {
            labels: ['Operativas', 'Mantenimiento', 'Dañadas'],
            datasets: [{
              data: [d.operativas, d.mantenimiento, d.danadas],
              backgroundColor: [CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.rose]
            }]
          }
        };
      });
    }
    if (this.puedeVerAlertas) {
      this.dashboardService.getAlertas().subscribe(d => this.alertas = d);
      this.dashboardService.getDashboardDistribuidor().subscribe(d => this.distribuidorData = d);
    }
  }

  private cargarBodega(): void {
    if (this.puedeVerAlertas) {
      this.dashboardService.getAlertas().subscribe(d => this.alertas = d);
    }
    this.dashboardService.getDashboardDistribuidor().subscribe(d => this.distribuidorData = d);
  }

  /** Verdadero mientras llegan los datos principales del panel actual. */
  get cargando(): boolean {
    switch (this.vista) {
      case 'ejecutivo': return !this.produccion;
      case 'taller': return !this.tecnicoData;
      case 'bodega': return !this.distribuidorData;
      default: return false;
    }
  }

  private normalizeProduccion(d: any) {
    return {
      ...d,
      totalVehiculos: d.vehiculosHoy ?? null,
      flujoHorario: d.produccionPorHora ?? null,
      distribucionModelos: d.productividadBahias ?? null
    };
  }
}

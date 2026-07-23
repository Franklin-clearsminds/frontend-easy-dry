import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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

  // Mocks Data
  produccion: any;
  operadores: any;
  serviciosData: any;
  maquinaria: any;
  alertas: any[] = [];

  fechaActual = new Date();
  
  // Helpers Roles
  get currentRole() { return this.auth.getRole(); }
  get isSuperAdmin() { return this.auth.hasRole(Role.SUPER_ADMIN); }
  get isGerente() { return this.auth.hasRole(Role.GERENTE); }
  get isSupervisor() { return this.auth.hasRole(Role.SUPERVISOR); }
  get isOperador() { return this.auth.hasRole(Role.OPERADOR); }
  get isTecnico() { return this.auth.hasRole(Role.TECNICO); }

  get sucursalNombre() { return this.auth.getCurrentUser()?.sucursalNombre; }
  get bahiaNombre() { return this.auth.getCurrentUser()?.bahiaNombre; }
  get rolLabel() { return this.currentRole ? ROLE_LABELS[this.currentRole] : ''; }

  get contextLabel() {
    if (this.isSuperAdmin) return 'Red Nacional EasyDry';
    if (this.isGerente || this.isSupervisor || this.isTecnico) return this.sucursalNombre;
    if (this.isOperador) return `${this.bahiaNombre} - ${this.sucursalNombre}`;
    return 'EasyDry';
  }

  ngOnInit(): void {
    this.dashboardService.getProduccion().subscribe(d => this.produccion = d);
    this.dashboardService.getOperadores().subscribe(d => this.operadores = d);
    this.dashboardService.getServiciosData().subscribe(d => this.serviciosData = d);
    this.dashboardService.getMaquinaria().subscribe(d => this.maquinaria = d);
    this.dashboardService.getAlertas().subscribe(d => this.alertas = d);
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ReporteMockService } from '../../core/services/reporte-mock.service';
import { Reporte } from '../../core/models';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PaginationComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Centro de Reportes Operativos</h1>
          <p class="text-slate-500 text-xs mt-1">Generación de informes consolidados de servicios, ingresos y productividad de agencias.</p>
        </div>
      </div>

      <!-- Generator Filter Card -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry space-y-4">
        <h3 class="font-bold text-slate-900 text-sm font-outfit uppercase tracking-wider">Generar Nuevo Reporte</h3>
        
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Reporte</label>
            <select [(ngModel)]="nuevoTipo" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
              <option value="Diario">Reporte Diario</option>
              <option value="Mensual">Reporte Mensual</option>
              <option value="Productividad">Reporte de Productividad</option>
              <option value="Servicios Especiales">Reporte de Servicios Especiales</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia / Sucursal</label>
            <select [(ngModel)]="nuevaAgencia" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
              <option value="Todas las Agencias">Todas las Agencias (Consolidado)</option>
              <option value="EasyDry Quito Norte">EasyDry Quito Norte</option>
              <option value="EasyDry Quito Sur">EasyDry Quito Sur</option>
              <option value="EasyDry Cumbayá">EasyDry Cumbayá</option>
              <option value="EasyDry Guayaquil">EasyDry Guayaquil</option>
            </select>
          </div>

          <div class="flex items-end">
            <button 
              (click)="generarReporte()" 
              [disabled]="generando"
              class="w-full py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs">
              @if (generando) {
                <i-lucide name="refresh-cw" class="w-4 h-4 animate-spin"></i-lucide>
                <span>Generando...</span>
              } @else {
                <i-lucide name="file-text" class="w-4 h-4"></i-lucide>
                <span>Generar Informe Ahora</span>
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="true" 
        [showOperador]="false"
        [showBahia]="false"
        [showEstado]="false"
        [showFechas]="true"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Generated Reports List -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-base font-outfit">Historial de Reportes Generados</h3>
          <span class="text-xs text-slate-500 font-medium">Exportables en PDF & Excel</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">Código / Título</th>
                <th class="py-3.5 px-4">Tipo</th>
                <th class="py-3.5 px-4">Agencia</th>
                <th class="py-3.5 px-4">Fecha Emisión</th>
                <th class="py-3.5 px-4">Total Servicios</th>
                <th class="py-3.5 px-4">Eficiencia</th>
                <th class="py-3.5 px-4 text-right">Descargar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (rep of paginatedReportes; track rep.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900 text-sm">{{ rep.titulo }}</div>
                    <div class="text-[11px] text-slate-400 font-mono">ID: RPT-2026-00{{ rep.id }}</div>
                  </td>
                  <td class="py-3.5 px-4 font-semibold text-slate-700 text-xs">
                    {{ rep.tipo }}
                  </td>
                  <td class="py-3.5 px-4 text-xs text-slate-600">
                    {{ rep.agencia }}
                  </td>
                  <td class="py-3.5 px-4 text-xs font-mono text-slate-500">
                    {{ rep.fechaGeneracion }}
                  </td>
                  <td class="py-3.5 px-4 font-bold text-slate-800 text-xs">
                    {{ rep.totalServicios }} Vehículos
                  </td>
                  <td class="py-3.5 px-4 font-bold text-easydry-blue text-xs">
                    {{ rep.eficienciaGeneral }}%
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <!-- Export Excel -->
                      <button 
                        (click)="exportarExcel(rep)" 
                        title="Exportar a Excel" 
                        class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center gap-1">
                        <i-lucide name="file-spreadsheet" class="w-3.5 h-3.5 text-emerald-600"></i-lucide>
                        <span>Excel</span>
                      </button>

                      <!-- Export PDF -->
                      <button 
                        (click)="exportarPDF(rep)" 
                        title="Exportar a PDF" 
                        class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-lg text-xs flex items-center gap-1">
                        <i-lucide name="file-text" class="w-3.5 h-3.5 text-rose-600"></i-lucide>
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <app-pagination 
          [totalItems]="reportes.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

    </div>
  `
})
export class ReportesComponent implements OnInit {
  reportes: Reporte[] = [];
  nuevoTipo: Reporte['tipo'] = 'Mensual';
  nuevaAgencia = 'Todas las Agencias';
  generando = false;
  
  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    this.currentPage = 1;
  }

  get reportesFiltrados() {
    let resultados = this.reportes;

    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(r => r.agencia === this.filtrosGlobales.sucursal);
    }
    
    return resultados;
  }

  currentPage = 1;
  pageSize = 5;

  private reporteService = inject(ReporteMockService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.reporteService.getReportes().subscribe(list => {
      this.reportes = list;
    });
  }

  get paginatedReportes() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.reportesFiltrados.slice(start, start + this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
  }

  generarReporte() {
    this.generando = true;
    this.reporteService.generarReporte(this.nuevoTipo, this.nuevaAgencia).subscribe(rep => {
      this.generando = false;
      this.toastService.success('Reporte Creado', `Se generó "${rep.titulo}" correctamente.`);
    });
  }

  exportarExcel(reporte: Reporte) {
    const csvContent = "data:text/csv;charset=utf-8," 
      + `ID,Título,Tipo,Agencia,Fecha,Total Servicios,Ingresos,Eficiencia\n`
      + `${reporte.id},"${reporte.titulo}",${reporte.tipo},"${reporte.agencia}",${reporte.fechaGeneracion},${reporte.totalServicios},${reporte.ingresosTotales},${reporte.eficienciaGeneral}%\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EasyDry_Reporte_${reporte.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toastService.success('Exportación Exitosa', `Archivo Excel (CSV) descargado para: ${reporte.titulo}`);
  }

  exportarPDF(reporte: Reporte) {
    // Print/PDF trigger simulation
    this.toastService.info('Exportación PDF', `Generando PDF descargable para "${reporte.titulo}"...`);
    setTimeout(() => {
      window.print();
    }, 400);
  }
}

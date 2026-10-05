import { PAGE_SIZE_TABLA } from '../../core/config/paginacion';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ReporteService } from '../../core/services/reporte.service';
import { Reporte } from '../../core/models';
import { ToastService } from '../../shared/services/toast.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';
import { resolverRangoFechas, soloFecha } from '../../core/utils/fecha-rango';
import { SucursalService } from '../../core/services/sucursal.service';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { AuthService } from '../../core/services/auth.service';
import { jsPDF } from 'jspdf';

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
          <p class="text-slate-500 text-xs mt-1">Generación de informes consolidados de servicios, tiempos de ciclo y productividad de agencias.</p>
        </div>
      </div>

      <!-- Global Filter Bar -->
      <app-filter-bar 
        [showSucursal]="true" 
        [showOperador]="false"
        [showBahia]="false"
        [showEstado]="false"
        [showCliente]="true"
        [showFechas]="true"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Generated Reports List -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-slate-900 text-base font-outfit">Historial de Reportes Generados</h3>
            <span class="text-xs text-slate-500 font-medium">Exportables en PDF & Excel</span>
          </div>
          @if (puedeGenerar) {
          <button 
            (click)="generarReporte()" 
            [disabled]="generando"
            class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
            @if (generando) {
              <i-lucide aria-hidden="true" name="refresh-cw" class="w-4 h-4 animate-spin"></i-lucide>
              <span>Generando...</span>
            } @else {
              <i-lucide aria-hidden="true" name="file-text" class="w-4 h-4"></i-lucide>
              <span>Generar Informe Ahora</span>
            }
          </button>
          }
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th scope="col" class="py-3.5 px-4">Código / Título</th>
                <th scope="col" class="py-3.5 px-4">Tipo</th>
                <th scope="col" class="py-3.5 px-4">Agencia</th>
                <th scope="col" class="py-3.5 px-4">Fecha Emisión</th>
                <th scope="col" class="py-3.5 px-4">Total Servicios</th>
                <th scope="col" class="py-3.5 px-4">Eficiencia</th>
                <th scope="col" class="py-3.5 px-4 text-right">Descargar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (rep of paginatedReportes; track rep.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4">
                    <div class="font-bold text-slate-900 text-sm">{{ rep.titulo }}</div>
                    <div class="text-xs text-slate-500 font-mono">ID: RPT-2026-00{{ rep.id }}</div>
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
                    {{ rep.totalServicios != null ? rep.totalServicios + ' Vehículos' : "Sin datos" }}
                  </td>
                  <td class="py-3.5 px-4 font-bold text-easydry-blue text-xs">
                    {{ rep.eficienciaGeneral != null ? rep.eficienciaGeneral + '%' : "Sin datos" }}
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <!-- Export Excel -->
                      <button 
                        (click)="exportarExcel(rep)" 
                        title="Exportar Excel" 
                        class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center" aria-label="Exportar Excel">
                        <i-lucide aria-hidden="true" name="file-spreadsheet" class="w-4 h-4"></i-lucide>
                      </button>

                      <!-- Export PDF -->
                      <button 
                        (click)="exportarPDF(rep)" 
                        title="Exportar PDF" 
                        class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center" aria-label="Exportar PDF">
                        <i-lucide aria-hidden="true" name="file-text" class="w-4 h-4"></i-lucide>
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
  
  filtrosGlobales: FilterState = { sucursal: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy', marca: 'Todas' };

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    this.currentPage = 1;
  }

  get reportesFiltrados() {
    let resultados = this.reportes;

    if (this.filtrosGlobales.sucursal !== 'Todas') {
      resultados = resultados.filter(r => r.agencia === this.filtrosGlobales.sucursal);
    }
    if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
      resultados = resultados.filter(item => {
        const suc = this.sucursalService.getSucursalPorNombre(item.agencia);
        return suc?.marcaNombre === this.filtrosGlobales.marca;
      });
    }

    const rango = resolverRangoFechas(this.filtrosGlobales);
    if (rango) {
      resultados = resultados.filter(r => {
        const d = soloFecha(r.fechaGeneracion);
        return d >= rango.inicio && d <= rango.fin;
      });
    }
    
    return resultados;
  }

  currentPage = 1;
  pageSize = PAGE_SIZE_TABLA;

  private reporteService = inject(ReporteService);
  private toastService = inject(ToastService);
  private sucursalService = inject(SucursalService);
  private storageUploadService = inject(StorageUploadService);
  private authService = inject(AuthService);

  /** Los reportes se arman con los indicadores del dashboard (mismo permiso que exige el servidor). */
  get puedeGenerar(): boolean {
    return this.authService.puede('dashboard.ver');
  }

  ngOnInit(): void {
    if (!this.puedeGenerar) return;
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
    if (!this.puedeGenerar) return;
    this.generando = true;
    this.reporteService.generarReporte(this.nuevoTipo, this.nuevaAgencia).subscribe({
      next: (rep) => {
        this.generando = false;
        this.toastService.success('Reporte Creado', 'Se generó "' + rep.titulo + '" correctamente.');
      },
      error: (err) => {
        this.generando = false;
        const m = err?.error?.message;
        this.toastService.error('No se pudo generar el reporte', Array.isArray(m) ? m.join(' ') : (typeof m === 'string' && m ? m : 'El servidor no aceptó la solicitud.'));
      }
    });
  }

  exportarExcel(reporte: Reporte) {
    const csvContent = "data:text/csv;charset=utf-8," 
      + `ID,Título,Tipo,Agencia,Fecha,Total Servicios,Eficiencia\n`
      + `${reporte.id},"${reporte.titulo}",${reporte.tipo},"${reporte.agencia}",${reporte.fechaGeneracion},${reporte.totalServicios ?? ''},${reporte.eficienciaGeneral != null ? reporte.eficienciaGeneral + '%' : ''}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EasyDry_Reporte_${reporte.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toastService.success('Exportación Exitosa', `Archivo Excel (CSV) descargado para: ${reporte.titulo}`);
  }

  async exportarPDF(reporte: Reporte) {
    this.toastService.info('Exportación PDF', `Generando y respaldando "${reporte.titulo}"...`);
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text('EasyDry - Reporte Operativo', 20, 24);
    pdf.setFontSize(12);
    pdf.text(reporte.titulo, 20, 38);
    pdf.text(`Tipo: ${reporte.tipo}`, 20, 50);
    pdf.text(`Agencia: ${reporte.agencia}`, 20, 60);
    pdf.text(`Fecha: ${reporte.fechaGeneracion}`, 20, 70);
    pdf.text(`Total de servicios: ${reporte.totalServicios ?? "Sin datos"}`, 20, 80);
    pdf.text(`Eficiencia general: ${reporte.eficienciaGeneral != null ? reporte.eficienciaGeneral + "%" : "Sin datos"}`, 20, 90);

    const safeId = String(reporte.id).replace(/[^a-zA-Z0-9_-]/g, '-');
    const fileName = `EasyDry_Reporte_${safeId}_${reporte.fechaGeneracion}.pdf`;
    const blob = pdf.output('blob');
    pdf.save(fileName);

    // Respaldar el PDF en el servidor requiere poder subir archivos; sin ese permiso solo se descarga.
    if (!this.authService.puede('evidencias.subir')) {
      this.toastService.success('PDF exportado', 'El archivo se descargó.');
      return;
    }
    try {
      const agenciaId = String(this.authService.currentUserValue?.agenciaId || reporte.agencia);
      const url = await this.storageUploadService.uploadClosurePdf(blob, agenciaId, fileName);
      this.toastService.success('PDF exportado', `Descargado y respaldado en storage: ${url}`);
    } catch (error) {
      console.error(error);
      this.toastService.warning('PDF descargado', 'El archivo se descargó, pero no pudo respaldarse en storage.');
    }
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Notificacion, NotificacionTipo } from '../../core/models/notificacion.model';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-8">

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-2">
            <i-lucide aria-hidden="true" name="bell" class="w-3.5 h-3.5"></i-lucide>
            <span>Centro de Notificaciones</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Notificaciones del Sistema</h1>
          <p class="text-slate-500 text-xs mt-1">Alertas operativas, aprobaciones, inventario y avisos de la red EasyDry®.</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          @if (noLeidas > 0) {
            <span class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
              {{ noLeidas }} sin leer
            </span>
          }
          <button
            type="button"
            (click)="marcarTodasLeidas()"
            [disabled]="noLeidas === 0"
            class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer disabled:opacity-40">
            Marcar todas como leídas
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        @for (f of filtros; track f.id) {
          <button
            type="button"
            (click)="cambiarFiltro(f.id)"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            [ngClass]="filtroActivo === f.id
              ? 'bg-easydry-blue text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
            {{ f.label }}
          </button>
        }
      </div>

      @if (errorCarga) {
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 flex items-center justify-between gap-3">
          <span>{{ errorCarga }}</span>
          <button type="button" (click)="cargarPagina(pagina)" class="font-bold underline cursor-pointer">Reintentar</button>
        </div>
      }

      <div class="space-y-3">
        @if (cargando && notificaciones.length === 0) {
          <div class="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500">
            Cargando notificaciones...
          </div>
        }
        @for (n of notificaciones; track n.id) {
          <article
            class="bg-white rounded-2xl border p-4 flex gap-4 transition-shadow hover:shadow-easydry"
            [ngClass]="n.leida ? 'border-slate-100 opacity-90' : 'border-easydry-blue/30 shadow-sm ring-1 ring-easydry-blue/10'">
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              [ngClass]="iconBg(n.tipo)">
              <i-lucide aria-hidden="true" [name]="iconName(n.tipo)" class="w-5 h-5" [ngClass]="iconColor(n.tipo)"></i-lucide>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-extrabold text-slate-900">{{ n.titulo }}</h3>
                  <p class="text-xs text-slate-600 mt-1 leading-relaxed">{{ n.mensaje }}</p>
                </div>
                @if (!n.leida) {
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0 mt-1"></span>
                }
              </div>
              <div class="flex flex-wrap items-center gap-3 mt-3">
                <span class="text-xs text-slate-500 font-semibold">{{ n.fecha }} · {{ n.hora }}</span>
                @if (n.sucursal) {
                  <span class="text-xs text-slate-500 font-medium">{{ n.sucursal }}</span>
                }
                @if (n.enlace) {
                  <a
                    [routerLink]="n.enlace"
                    (click)="marcarLeida(n)"
                    class="text-xs font-bold text-easydry-blue hover:underline">
                    {{ n.enlaceLabel || 'Ver detalle' }}
                  </a>
                }
                @if (!n.leida) {
                  <button
                    type="button"
                    (click)="marcarLeida(n)"
                    class="text-xs font-bold text-slate-500 hover:text-slate-800">
                    Marcar leída
                  </button>
                }
              </div>
            </div>
          </article>
        } @empty {
          @if (!cargando && !errorCarga) {
          <div class="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <i-lucide aria-hidden="true" name="bell-off" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i-lucide>
            <p class="text-sm font-bold text-slate-600">No hay notificaciones en este filtro</p>
          </div>
          }
        }
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p class="text-xs font-semibold text-slate-500">
          @if (totalNotificaciones > 0) {
            Mostrando {{ primerResultado }}–{{ ultimoResultado }} de {{ totalNotificaciones }}
          } @else {
            Sin notificaciones
          }
        </p>
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="cargarPagina(pagina - 1)"
            [disabled]="pagina <= 1 || cargando"
            class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-extrabold hover:bg-slate-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Anterior
          </button>
          <span class="text-xs font-bold text-slate-600 min-w-24 text-center">
            Página {{ pagina }} de {{ totalPaginas }}
          </span>
          <button
            type="button"
            (click)="cargarPagina(pagina + 1)"
            [disabled]="pagina >= totalPaginas || cargando"
            class="px-4 py-2 rounded-xl bg-easydry-blue text-white text-xs font-extrabold hover:bg-easydry-blue-dark cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Siguiente
          </button>
        </div>
      </div>
    </div>
  `
})
export class NotificacionesComponent implements OnInit {
  private notificacionService = inject(NotificacionService);

  notificaciones: Notificacion[] = [];
  filtroActivo: 'todas' | NotificacionTipo = 'todas';
  noLeidas = 0;
  readonly pageSize = 20;
  pagina = 1;
  totalNotificaciones = 0;
  totalPaginas = 1;
  cargando = false;
  errorCarga = '';

  filtros: { id: 'todas' | NotificacionTipo; label: string; tipos?: string[] }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'alerta', label: 'Alertas', tipos: ['INCIDENTE_NUEVO', 'MANTENIMIENTO_VENCIDO', 'STOCK_CRITICO', 'LIMPIEZA_ATRASADA', 'DESPACHO_PENDIENTE', 'MAQUINA_DADA_DE_BAJA'] },
    { id: 'info', label: 'Información', tipos: ['INCIDENCIA_ASIGNADA', 'MANTENIMIENTO_ASIGNADO', 'LIMPIEZA_RECORDATORIO', 'SERVICIO_DECIDIDO', 'SERVICIO_ESPECIAL_ASIGNADO', 'SERVICIO_ESPECIAL_CERRADO', 'DESPACHO_CONFIRMADO'] },
    { id: 'exito', label: 'Completadas', tipos: ['INCIDENCIA_RESUELTA'] },
    { id: 'sistema', label: 'Sistema', tipos: ['APROBACION_PENDIENTE', 'RETO_CERRADO', 'USUARIO_ACTUALIZADO'] },
  ];

  ngOnInit(): void {
    this.cargarPagina(1);
    this.notificacionService.getResumen().subscribe(resumen => {
      this.noLeidas = resumen.pendientes;
    });
  }

  get primerResultado(): number {
    return this.totalNotificaciones === 0 ? 0 : (this.pagina - 1) * this.pageSize + 1;
  }

  get ultimoResultado(): number {
    return Math.min(this.pagina * this.pageSize, this.totalNotificaciones);
  }

  cambiarFiltro(filtro: 'todas' | NotificacionTipo): void {
    if (this.filtroActivo === filtro) return;
    this.filtroActivo = filtro;
    this.cargarPagina(1);
  }

  cargarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas || this.cargando) return;
    this.cargando = true;
    this.errorCarga = '';
    const filtro = this.filtros.find(f => f.id === this.filtroActivo);
    this.notificacionService.getNotificacionesPagina({
      page: pagina,
      pageSize: this.pageSize,
      tipos: filtro?.tipos,
    }).subscribe({
      next: (resultado) => {
        this.notificaciones = resultado.items;
        this.pagina = resultado.page;
        this.totalNotificaciones = resultado.total;
        this.totalPaginas = Math.max(1, resultado.totalPages);
        this.cargando = false;
      },
      error: () => {
        this.errorCarga = 'No se pudieron cargar las notificaciones. Verifica tu conexión e inténtalo de nuevo.';
        this.cargando = false;
      },
    });
  }

  marcarLeida(n: Notificacion): void {
    if (!n.leida) this.noLeidas = Math.max(0, this.noLeidas - 1);
    this.notificacionService.marcarComoLeida(n.id);
    n.leida = true;
  }

  marcarTodasLeidas(): void {
    this.noLeidas = 0;
    this.notificacionService.marcarTodasComoLeidas();
    this.notificaciones.forEach(n => { n.leida = true; });
  }

  iconName(tipo: NotificacionTipo): string {
    switch (tipo) {
      case 'alerta': return 'alert-triangle';
      case 'exito': return 'check-circle-2';
      case 'sistema': return 'settings';
      default: return 'info';
    }
  }

  iconBg(tipo: NotificacionTipo): string {
    switch (tipo) {
      case 'alerta': return 'bg-rose-100';
      case 'exito': return 'bg-emerald-100';
      case 'sistema': return 'bg-slate-100';
      default: return 'bg-easydry-blue/10';
    }
  }

  iconColor(tipo: NotificacionTipo): string {
    switch (tipo) {
      case 'alerta': return 'text-rose-600';
      case 'exito': return 'text-emerald-600';
      case 'sistema': return 'text-slate-600';
      default: return 'text-easydry-blue';
    }
  }
}

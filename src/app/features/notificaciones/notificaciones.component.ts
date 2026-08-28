import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MOCK_NOTIFICACIONES, Notificacion, NotificacionTipo } from '../../core/mocks/notificaciones.mock';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-fade-in pb-8">

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-2">
            <i-lucide name="bell" class="w-3.5 h-3.5"></i-lucide>
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
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors disabled:opacity-40">
            Marcar todas como leídas
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        @for (f of filtros; track f.id) {
          <button
            type="button"
            (click)="filtroActivo = f.id"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            [ngClass]="filtroActivo === f.id
              ? 'bg-easydry-blue text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'">
            {{ f.label }}
          </button>
        }
      </div>

      <div class="space-y-3">
        @for (n of notificacionesFiltradas; track n.id) {
          <article
            class="bg-white rounded-2xl border p-4 flex gap-4 transition-all hover:shadow-easydry"
            [ngClass]="n.leida ? 'border-slate-100 opacity-90' : 'border-easydry-blue/30 shadow-sm ring-1 ring-easydry-blue/10'">
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              [ngClass]="iconBg(n.tipo)">
              <i-lucide [name]="iconName(n.tipo)" class="w-5 h-5" [ngClass]="iconColor(n.tipo)"></i-lucide>
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
                <span class="text-[11px] text-slate-400 font-semibold">{{ n.fecha }} · {{ n.hora }}</span>
                @if (n.sucursal) {
                  <span class="text-[11px] text-slate-500 font-medium">{{ n.sucursal }}</span>
                }
                @if (n.enlace) {
                  <a
                    [routerLink]="n.enlace"
                    (click)="marcarLeida(n)"
                    class="text-[11px] font-bold text-easydry-blue hover:underline">
                    {{ n.enlaceLabel || 'Ver detalle' }}
                  </a>
                }
                @if (!n.leida) {
                  <button
                    type="button"
                    (click)="marcarLeida(n)"
                    class="text-[11px] font-bold text-slate-500 hover:text-slate-800">
                    Marcar leída
                  </button>
                }
              </div>
            </div>
          </article>
        } @empty {
          <div class="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <i-lucide name="bell-off" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i-lucide>
            <p class="text-sm font-bold text-slate-600">No hay notificaciones en este filtro</p>
          </div>
        }
      </div>
    </div>
  `
})
export class NotificacionesComponent implements OnInit {
  notificaciones: Notificacion[] = [];
  filtroActivo: 'todas' | NotificacionTipo = 'todas';

  filtros: { id: 'todas' | NotificacionTipo; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'alerta', label: 'Alertas' },
    { id: 'info', label: 'Información' },
    { id: 'exito', label: 'Completadas' },
    { id: 'sistema', label: 'Sistema' },
  ];

  ngOnInit(): void {
    this.notificaciones = MOCK_NOTIFICACIONES.map(n => ({ ...n }));
  }

  get noLeidas(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  get notificacionesFiltradas(): Notificacion[] {
    if (this.filtroActivo === 'todas') return this.notificaciones;
    return this.notificaciones.filter(n => n.tipo === this.filtroActivo);
  }

  marcarLeida(n: Notificacion): void {
    n.leida = true;
  }

  marcarTodasLeidas(): void {
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

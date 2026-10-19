import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, catchError, forkJoin, map, of, timer } from 'rxjs';
import { apiUrl } from '../config/env';
import { AuthService } from './auth.service';
import { InventarioService } from './inventario.service';
import { NotificacionService } from './notificacion.service';
import { ServicioLavadoService } from './servicio-lavado.service';

export type IndicadorMenu = 'notificaciones' | 'taller' | 'envios' | 'aprobaciones';

const REFRESCO_MS = 60_000;

/**
 * Puntos rojos del menú lateral: solo se ven mientras hay algo por atender y se apagan solos cuando ya no queda nada
 * (notificaciones sin leer, incidencias o mantenimientos abiertos, envíos por recibir o con faltante por resolver,
 * servicios por aprobar). Se recalculan cada minuto, al cambiar de pantalla y al llegar una notificación.
 */
@Injectable({ providedIn: 'root' })
export class MenuIndicadoresService implements OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private notificaciones = inject(NotificacionService);
  private inventario = inject(InventarioService);
  private servicios = inject(ServicioLavadoService);
  private subs = new Subscription();
  private iniciado = false;

  private readonly sinLeer = signal(0);
  private readonly taller = signal(0);
  private readonly enviosPorRecibir = signal(0);
  private readonly enviosPorResolver = signal(0);
  private readonly aprobaciones = signal(0);

  /** Hay envíos rechazados o recibidos con desconformidad esperando decisión (más urgente que uno por recibir). */
  readonly enviosCriticos = computed(() => this.enviosPorResolver() > 0);

  readonly conteos = computed<Record<IndicadorMenu, number>>(() => ({
    notificaciones: this.sinLeer(),
    taller: this.taller(),
    envios: this.enviosPorRecibir() + this.enviosPorResolver(),
    aprobaciones: this.aprobaciones(),
  }));

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    this.subs.add(
      this.notificaciones.notificaciones$.subscribe((lista) => this.sinLeer.set((lista || []).filter((n) => !n.leida).length),
      ),
    );
    this.subs.add(timer(0, REFRESCO_MS).subscribe(() => this.refrescar()));
  }

  /** Vuelve a consultar lo que depende del servidor (al cambiar de pantalla o tras resolver algo). */
  refrescar(): void {
    if (!this.auth.getCurrentUser()) return;
    this.cargarTaller();
    this.cargarEnvios();
    this.cargarAprobaciones();
  }

  private cargarTaller(): void {
    this.notificaciones.getPendientes().subscribe((lista) => {
      this.taller.set((lista || []).filter((p) => p.grupo === 'mantenimiento').length);
    });
  }

  private cargarEnvios(): void {
    const porRecibir$ = this.auth.puede('despachos.ver')
      ? this.inventario.getDespachosPagina({ estadoDespacho: 'EN_TRANSITO', page: 1, pageSize: 100 }).pipe(
          map((r) => (r.pagina.items || []).filter((d: any) => d?.puedeConfirmar).length),
          catchError(() => of(0)),
        )
      : of(0);
    const porResolver$ = this.auth.puede('envios.faltantes')
      ? this.http.post<unknown[]>(apiUrl('/inventario/despachos/faltantes/list'), {}, { headers: { 'X-Silent-Fallback': '1' } }).pipe(
          map((lista) => (Array.isArray(lista) ? lista.length : 0)),
          catchError(() => of(0)),
        )
      : of(0);
    forkJoin([porRecibir$, porResolver$]).subscribe(([recibir, resolver]) => {
      this.enviosPorRecibir.set(recibir);
      this.enviosPorResolver.set(resolver);
    });
  }

  private cargarAprobaciones(): void {
    const puedeDecidir = this.auth.puede('aprobaciones.aprobar') || this.auth.puede('aprobaciones.rechazar');
    if (!this.auth.puede('servicios.ver') || !puedeDecidir) {
      this.aprobaciones.set(0);
      return;
    }
    const user = this.auth.getCurrentUser();
    const alcance =
      user?.ambito === 'AGENCIA' && user.agenciaId
        ? { agenciaId: String(user.agenciaId) }
        : user?.ambito === 'REGION' && user.regionId
          ? { regionId: String(user.regionId) }
          : {};
    this.servicios
      .getServiciosPagina({ estado: 'POR_APROBAR', page: 1, pageSize: 1, ...alcance })
      .pipe(catchError(() => of(null)))
      .subscribe((r) => this.aprobaciones.set(r ? Number(r.pagina.total || 0) : 0));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}

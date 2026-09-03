import { Injectable, signal } from '@angular/core';

/**
 * EasyDry® Web — Monitor de Conectividad y Sincronización
 * Alineado con Arquitectura Enterprise v2.0
 */
@Injectable({
  providedIn: 'root'
})
export class SyncStatusService {
  public isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  public pendingSyncCount = signal<number>(0);
  public lastSyncTimestamp = signal<Date | null>(null);

  constructor() {
    this.initNetworkListeners();
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline.set(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  public setPendingCount(count: number): void {
    this.pendingSyncCount.set(count);
  }

  public recordSyncSuccess(): void {
    this.lastSyncTimestamp.set(new Date());
  }
}

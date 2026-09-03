import { Injectable } from '@angular/core';

/**
 * EasyDry® Web — Servicio de Almacenamiento Local IndexedDB (PWA Offline)
 * Alineado con Arquitectura Enterprise v2.0
 */
@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private readonly DB_NAME = 'easydry_pwa_db';
  private readonly DB_VERSION = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDatabase();
  }

  private initDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no soportado en este entorno.'));
        return;
      }

      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Almacén para catálogos y datos maestros en caché
        if (!db.objectStoreNames.contains('catalogs')) {
          db.createObjectStore('catalogs', { keyPath: 'key' });
        }

        // Almacén para mutaciones pendientes offline
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'operationId' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.warn('[IndexedDbService] Error abriendo BD:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  public async setItem<T>(storeName: 'catalogs' | 'offline_queue', item: T): Promise<void> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getItem<T>(storeName: 'catalogs' | 'offline_queue', key: string): Promise<T | null> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAll<T>(storeName: 'catalogs' | 'offline_queue'): Promise<T[]> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async removeItem(storeName: 'catalogs' | 'offline_queue', key: string): Promise<void> {
    const db = await this.initDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

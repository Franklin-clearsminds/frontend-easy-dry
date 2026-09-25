import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl, environment } from '../config/env';

export type StorageCategory =
  | 'SERVICIOS_GENERALES'
  | 'SERVICIOS_ESPECIALES'
  | 'MAQUINARIA_IMAGEN'
  | 'MAQUINARIA_FICHA'
  | 'MAQUINARIA_INCIDENTE'
  | 'MAQUINARIA_MANTENIMIENTO'
  | 'DOCUMENTO'
  | 'CATALOGO_INSUMOS'
  | 'PERFIL_USUARIO';

export type MediaEvidenceType =
  | 'FOTO_INGRESO'
  | 'FOTO_SALIDA'
  | 'FOTO_DANO_PREVIO'
  | 'FOTO_PROCESO'
  | 'VIDEO_INSPECCION'
  | 'VIDEO_INICIAL'
  | 'VIDEO_FINAL'
  | 'VIDEO_PAUSA'
  | 'VIDEO_REANUDAR'
  | 'FOTO_MAQUINA'
  | 'FICHA_TECNICA'
  | 'DOCUMENTO'
  | 'FOTO_INCIDENTE'
  | 'VIDEO_INCIDENTE'
  | 'DOCUMENTO_INCIDENTE'
  | 'PDF_CIERRE'
  | 'IMAGEN_PRODUCTO'
  | 'FOTO_AJUSTE_INVENTARIO'
  | 'FOTO_INGRESO_INVENTARIO'
  | 'FOTO_PERFIL';

export interface UploadTicket {
  ticketId: string;
  clientUuid?: string;
  type: string;
  key: string;
  uploadUrl: string;
  publicUrl: string;
  driver: 's3' | 'local';
  expiresInSeconds: number;
  headers?: Record<string, string>;
}

export interface UploadMediaOptions {
  category?: StorageCategory;
  type: MediaEvidenceType;
  agenciaId?: string;
  servicioId?: string;
  maquinariaId?: string;
  maquinariaNombre?: string;
  maquinariaCodigo?: string;
  incidenteId?: string;
  /** 'reporte' | 'reparacion' (los alias antiguos 'fallas' | 'resoluciones' siguen aceptados). */
  incidenteFase?: 'reporte' | 'reparacion' | 'fallas' | 'resoluciones';
  mantenimientoId?: string;
  insumoId?: string | number;
  insumoNombre?: string;
  clientUuid?: string;
  fileName?: string;
  contentType?: string;
  onProgress?: (percentage: number) => void;
}

@Injectable({ providedIn: 'root' })
export class StorageUploadService {
  private readonly http = inject(HttpClient);

  /**
   * Sube un archivo o Blob binario (Vídeo, Imagen, Documento) al almacenamiento (S3 o Local)
   * obteniendo un ticket firmado y realizando la transferencia binaria PUT.
   */
  async uploadMedia(fileOrBlob: Blob | File, options: UploadMediaOptions): Promise<string> {
    const maxSizeBytes = 100 * 1024 * 1024; // 100 MB
    if (fileOrBlob.size > maxSizeBytes) {
      throw new Error(`El archivo supera el límite de ${Math.round(maxSizeBytes / (1024 * 1024))} MB.`);
    }

    let rawType = options.contentType || fileOrBlob.type || (options.type.startsWith('VIDEO_') ? 'video/mp4' : 'application/octet-stream');
    if (rawType.includes('webm')) rawType = 'video/webm';
    else if (rawType.includes('mp4')) rawType = 'video/mp4';
    const contentType = rawType;

    const fileName = options.fileName || (fileOrBlob instanceof File ? fileOrBlob.name : `evidencia_${Date.now()}.${options.type.startsWith('VIDEO_') ? 'mp4' : 'jpg'}`);

    const ticketPayload = {
      category: options.category,
      type: options.type,
      agenciaId: options.agenciaId,
      servicioId: options.servicioId,
      maquinariaId: options.maquinariaId,
      maquinariaNombre: options.maquinariaNombre,
      maquinariaCodigo: options.maquinariaCodigo,
      incidenteId: options.incidenteId,
      incidenteFase: options.incidenteFase,
      mantenimientoId: options.mantenimientoId,
      insumoId: options.insumoId ? String(options.insumoId) : undefined,
      insumoNombre: options.insumoNombre,
      clientUuid: options.clientUuid,
      fileName,
      contentType,
    };

    // La evidencia de maquinaria siempre sube por ticket firmado (PUT directo); el proxy solo es respaldo.
    const esMaquinaria = options.category === 'MAQUINARIA_INCIDENTE' || options.category === 'MAQUINARIA_MANTENIMIENTO';
    const useBackendProxy = !options.type.startsWith('VIDEO_') && !esMaquinaria;
    if (useBackendProxy) {
      return this.uploadViaBackend(fileOrBlob, ticketPayload, fileName, contentType, options.onProgress);
    }

    const ticket = await firstValueFrom(
      this.http.post<UploadTicket>(apiUrl('/storage/ticket'), ticketPayload)
    );

    const uploadUrl = ticket.driver === 's3'
      ? ticket.uploadUrl
      : this.resolveBackendUrl(ticket.uploadUrl);

    try {
      await this.putToUrl(uploadUrl, fileOrBlob, contentType, ticket.headers, options.onProgress);
      return ticket.publicUrl;
    } catch {
      return this.uploadViaBackend(fileOrBlob, ticketPayload, fileName, contentType, options.onProgress);
    }
  }

  private putToUrl(
    uploadUrl: string,
    fileOrBlob: Blob | File,
    contentType: string,
    headers: Record<string, string> | undefined,
    onProgress?: (percentage: number) => void,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);

      let contentTypeSet = false;
      if (headers) {
        Object.entries(headers).forEach(([k, v]) => {
          if (k.toLowerCase() === 'content-type') contentTypeSet = true;
          try { xhr.setRequestHeader(k, v); } catch { /* ignore restricted headers */ }
        });
      }
      if (!contentTypeSet && contentType) {
        xhr.setRequestHeader('Content-Type', contentType);
      }

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Error al transferir al storage (${xhr.status}: ${xhr.statusText})`));
      };
      xhr.onerror = () => reject(new Error('Fallo de red al subir archivo a AWS S3.'));
      xhr.send(fileOrBlob);
    });
  }

  private async uploadViaBackend(
    fileOrBlob: Blob | File,
    ticketPayload: Record<string, string | undefined>,
    fileName: string,
    contentType: string,
    onProgress?: (percentage: number) => void,
  ): Promise<string> {
    const form = new FormData();
    form.append('file', fileOrBlob, fileName);
    Object.entries(ticketPayload).forEach(([key, value]) => {
      if (value) form.append(key, value);
    });

    onProgress?.(40);
    const result = await firstValueFrom(
      this.http.post<{ publicUrl?: string }>(apiUrl('/storage/upload'), form),
    );
    onProgress?.(100);

    if (!result?.publicUrl) {
      throw new Error('El servidor no devolvió la URL de la evidencia.');
    }
    return result.publicUrl;
  }

  /**
   * Helper especializado para vídeos de evidencia en servicios y pausas
   */
  async uploadVideoEvidence(
    videoBlob: Blob,
    type: 'VIDEO_INICIAL' | 'VIDEO_FINAL' | 'VIDEO_PAUSA' | 'VIDEO_REANUDAR' | 'VIDEO_INSPECCION',
    options?: {
      category?: StorageCategory;
      agenciaId?: string;
      servicioId?: string;
      fileName?: string;
      onProgress?: (pct: number) => void;
    }
  ): Promise<string> {
    const category: StorageCategory = options?.category || (
      type === 'VIDEO_PAUSA' || type === 'VIDEO_REANUDAR' ? 'SERVICIOS_ESPECIALES' : 'SERVICIOS_GENERALES'
    );

    return this.uploadMedia(videoBlob, {
      category,
      type,
      agenciaId: options?.agenciaId,
      servicioId: options?.servicioId,
      fileName: options?.fileName || `video_${type.toLowerCase()}_${Date.now()}.mp4`,
      contentType: videoBlob.type || 'video/mp4',
      onProgress: options?.onProgress,
    });
  }

  async uploadClosurePdf(pdf: Blob, agenciaId: string, fileName: string): Promise<string> {
    return this.uploadMedia(pdf, {
      category: 'DOCUMENTO',
      type: 'PDF_CIERRE',
      agenciaId,
      fileName,
      contentType: 'application/pdf',
    });
  }

  /** Clave S3 de un archivo a partir de cualquiera de los formatos de URL que guarda el sistema. */
  private extractKey(trimmed: string): string {
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return '';
    if (trimmed.includes('/storage/file?key=')) {
      return decodeURIComponent(trimmed.split('/storage/file?key=')[1]?.split('&')[0] || '');
    }
    if (trimmed.includes('/catalogo/insumos/')) {
      return 'catalogo/insumos/' + (trimmed.split('/catalogo/insumos/')[1]?.split('?')[0] || '');
    }
    if (trimmed.includes('amazonaws.com/')) return trimmed.split('amazonaws.com/')[1]?.split('?')[0] || '';
    if (trimmed.startsWith('/uploads/')) return trimmed.replace(/^\/uploads\//, '').split('?')[0];
    if (trimmed.startsWith('uploads/')) return trimmed.replace(/^uploads\//, '').split('?')[0];
    if (trimmed.startsWith('agencias/') || trimmed.startsWith('catalogo/') || trimmed.startsWith('usuarios/') || trimmed.startsWith('maquinaria/')) {
      return trimmed.split('?')[0];
    }
    return '';
  }

  /** true si el archivo vive bajo `maquinaria/` (privado: solo se ve con URL prefirmada + JWT). */
  public esClaveMaquinaria(value?: string | null): boolean {
    if (!value) return false;
    return this.extractKey(String(value).trim()).startsWith('maquinaria/');
  }

  private readonly cachePresignadas = new Map<string, { url: string; expira: number }>();
  private readonly TTL_CACHE_MS = 10 * 60 * 1000;

  /**
   * Devuelve una URL lista para usar en <img>, <video> o enlaces. Para claves `maquinaria/` pide la URL temporal
   * (GET /storage/presigned-url, con JWT) y la guarda en memoria unos minutos; el resto de categorías
   * sigue resolviéndose igual que antes.
   */
  async resolveMediaUrl(value?: string | null): Promise<string> {
    if (!value) return '';
    const trimmed = String(value).trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
    const key = this.extractKey(trimmed);
    if (!key.startsWith('maquinaria/')) return this.resolveBackendUrl(trimmed);

    const hit = this.cachePresignadas.get(key);
    if (hit && hit.expira > Date.now()) return hit.url;
    try {
      const res = await firstValueFrom(
        this.http.get<{ url: string }>(apiUrl(`/storage/presigned-url?key=${encodeURIComponent(key)}`))
      );
      if (res?.url) {
        this.cachePresignadas.set(key, { url: res.url, expira: Date.now() + this.TTL_CACHE_MS });
        return res.url;
      }
    } catch {
      // Sin URL temporal: se devuelve la ruta clásica (puede no cargar si el archivo es privado).
    }
    return this.resolveBackendUrl(trimmed);
  }

  /**
   * URL temporal de una variante liviana de una foto de maquinaria: `thumbs` (480 px, para cuadrículas) o
   * `view` (1600 px, para el visor). El backend las genera al guardar la evidencia; si todavía no existen,
   * el <img> falla y el llamador usa el original. Devuelve '' si no aplica.
   */
  async resolveVariantUrl(value: string | null | undefined, variante: 'thumbs' | 'view'): Promise<string> {
    if (!value) return '';
    const key = this.extractKey(String(value).trim());
    if (!key.startsWith('maquinaria/') || !/\.(jpe?g|png|webp)$/i.test(key)) return '';
    const varianteKey = `${variante}/${key.replace(/^[/\\]+/, '').replace(/\.[^./]+$/, '')}.jpg`;

    const hit = this.cachePresignadas.get(varianteKey);
    if (hit && hit.expira > Date.now()) return hit.url;
    try {
      const res = await firstValueFrom(
        this.http.get<{ url: string }>(apiUrl(`/storage/presigned-url?key=${encodeURIComponent(varianteKey)}`))
      );
      if (res?.url) {
        this.cachePresignadas.set(varianteKey, { url: res.url, expira: Date.now() + this.TTL_CACHE_MS });
        return res.url;
      }
    } catch {
      // Sin variante: el llamador usa el original.
    }
    return '';
  }

  /**
   * URL de la miniatura liviana (480 px) que el backend genera al subir cada foto en
   * `thumbs/<clave-original>.jpg`. Devuelve '' si el archivo no es una imagen gestionada.
   */
  public getThumbnailUrl(value?: string | null): string {
    if (!value) return '';
    const key = this.extractKey(String(value).trim());
    if (!key || key.startsWith('thumbs/') || !/\.(jpe?g|png|webp|heic|heif)$/i.test(key)) return '';
    const thumbKey = 'thumbs/' + key.replace(/^[/\\]+/, '').replace(/\.[^./]+$/, '') + '.jpg';
    return apiUrl(`/storage/file?key=${encodeURIComponent(thumbKey)}`);
  }

  public resolveBackendUrl(value?: string | null): string {
    if (!value) return '';
    const trimmed = String(value).trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
    if (trimmed.includes('/storage/file?key=')) return trimmed;

    if (trimmed.includes('/catalogo/insumos/')) {
      const parts = trimmed.split('/catalogo/insumos/');
      const key = 'catalogo/insumos/' + (parts[1]?.split('?')[0] || '');
      return apiUrl(`/storage/file?key=${encodeURIComponent(key)}`);
    }
    if (trimmed.includes('amazonaws.com/')) {
      const key = trimmed.split('amazonaws.com/')[1]?.split('?')[0];
      if (key) return apiUrl(`/storage/file?key=${encodeURIComponent(key)}`);
    }
    if (trimmed.startsWith('/uploads/')) {
      const key = trimmed.replace(/^\/uploads\//, '').split('?')[0];
      return apiUrl(`/storage/file?key=${encodeURIComponent(key)}`);
    }
    if (trimmed.startsWith('uploads/')) {
      const key = trimmed.replace(/^uploads\//, '').split('?')[0];
      return apiUrl(`/storage/file?key=${encodeURIComponent(key)}`);
    }
    if (trimmed.startsWith('agencias/') || trimmed.startsWith('catalogo/') || trimmed.startsWith('usuarios/') || trimmed.startsWith('maquinaria/')) {
      const key = trimmed.split('?')[0];
      return apiUrl(`/storage/file?key=${encodeURIComponent(key)}`);
    }
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    try {
      const origin = new URL(environment.apiBaseUrl).origin;
      return new URL(trimmed, origin).toString();
    } catch {
      return trimmed;
    }
  }

  /**
   * Obtiene la URL prefirmada directa de AWS S3 para streaming de vídeo continuo (HTTP 206 Partial Content)
   * evitando redirecciones 302 intermedias que bloquean la precarga progresiva del navegador.
   */
  async getDirectStreamingUrl(value?: string | null): Promise<string> {
    if (!value) return '';
    const trimmed = String(value).trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

    let key = '';
    if (trimmed.includes('/storage/file?key=')) {
      key = decodeURIComponent(trimmed.split('/storage/file?key=')[1]?.split('&')[0] || '');
    } else if (trimmed.includes('amazonaws.com/')) {
      key = trimmed.split('amazonaws.com/')[1]?.split('?')[0] || '';
    } else if (trimmed.startsWith('/uploads/')) {
      key = trimmed.replace(/^\/uploads\//, '').split('?')[0];
    } else if (trimmed.startsWith('uploads/')) {
      key = trimmed.replace(/^uploads\//, '').split('?')[0];
    } else if (trimmed.startsWith('agencias/') || trimmed.startsWith('catalogo/') || trimmed.startsWith('usuarios/') || trimmed.startsWith('maquinaria/')) {
      key = trimmed.split('?')[0];
    }

    // Las evidencias de maquinaria comparten la caché de URLs temporales.
    if (key.startsWith('maquinaria/')) return this.resolveMediaUrl(trimmed);

    if (!key) {
      return this.resolveBackendUrl(trimmed);
    }

    try {
      const res = await firstValueFrom(
        this.http.get<{ url: string }>(apiUrl(`/storage/presigned-url?key=${encodeURIComponent(key)}`))
      );
      return res?.url || this.resolveBackendUrl(trimmed);
    } catch {
      return this.resolveBackendUrl(trimmed);
    }
  }
}


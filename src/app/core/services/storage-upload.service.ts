import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl, environment } from '../config/env';

export type StorageCategory =
  | 'SERVICIOS_GENERALES'
  | 'SERVICIOS_ESPECIALES'
  | 'MAQUINARIA_FICHA'
  | 'MAQUINARIA_INCIDENTE'
  | 'DOCUMENTO'
  | 'CATALOGO_INSUMOS';

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
  | 'FICHA_TECNICA'
  | 'DOCUMENTO'
  | 'FOTO_INCIDENTE'
  | 'VIDEO_INCIDENTE'
  | 'DOCUMENTO_INCIDENTE'
  | 'PDF_CIERRE'
  | 'IMAGEN_PRODUCTO';

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
  incidenteId?: string;
  insumoId?: string | number;
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

    const ticket = await firstValueFrom(
      this.http.post<UploadTicket>(apiUrl('/storage/ticket'), {
        category: options.category,
        type: options.type,
        agenciaId: options.agenciaId,
        servicioId: options.servicioId,
        maquinariaId: options.maquinariaId,
        incidenteId: options.incidenteId,
        insumoId: options.insumoId ? String(options.insumoId) : undefined,
        fileName,
        contentType,
      })
    );

    const uploadUrl = ticket.driver === 's3'
      ? ticket.uploadUrl
      : this.resolveBackendUrl(ticket.uploadUrl);

    // Subida con XMLHttpRequest para dar feedback de progreso en tiempo real
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);

      // Cabeceras requeridas por el ticket evitando duplicar Content-Type
      let contentTypeSet = false;
      if (ticket.headers) {
        Object.entries(ticket.headers).forEach(([k, v]) => {
          if (k.toLowerCase() === 'content-type') contentTypeSet = true;
          try { xhr.setRequestHeader(k, v); } catch { /* ignore restricted headers */ }
        });
      }
      if (!contentTypeSet && contentType) {
        xhr.setRequestHeader('Content-Type', contentType);
      }

      if (options.onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            options.onProgress?.(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Error al transferir al storage (${xhr.status}: ${xhr.statusText})`));
        }
      };

      xhr.onerror = () => reject(new Error('Fallo de red al subir archivo a AWS S3.'));
      xhr.send(fileOrBlob);
    });

    return ticket.publicUrl;
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
    if (trimmed.startsWith('agencias/') || trimmed.startsWith('catalogo/')) {
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
    } else if (trimmed.startsWith('agencias/') || trimmed.startsWith('catalogo/')) {
      key = trimmed.split('?')[0];
    }

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


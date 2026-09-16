import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl, environment } from '../config/env';

interface UploadTicket {
  uploadUrl: string;
  publicUrl: string;
  headers?: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class StorageUploadService {
  private readonly http = inject(HttpClient);

  async uploadClosurePdf(pdf: Blob, agenciaId: string, fileName: string): Promise<string> {
    if (pdf.size > 35 * 1024 * 1024) throw new Error('El PDF supera el límite de 35 MB.');
    const ticket = await firstValueFrom(this.http.post<UploadTicket>(apiUrl('/storage/ticket'), {
      agenciaId,
      category: 'DOCUMENTO',
      type: 'PDF_CIERRE',
      fileName,
      contentType: 'application/pdf',
    }));

    const uploadUrl = this.resolveBackendUrl(ticket.uploadUrl);
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { ...(ticket.headers || {}), 'Content-Type': 'application/pdf' },
      body: pdf,
    });
    if (!response.ok) throw new Error(`Storage respondió ${response.status}`);
    return this.resolveBackendUrl(ticket.publicUrl);
  }

  private resolveBackendUrl(value: string): string {
    if (/^https?:\/\//i.test(value)) return value;
    const origin = new URL(environment.apiBaseUrl).origin;
    return new URL(value, origin).toString();
  }
}

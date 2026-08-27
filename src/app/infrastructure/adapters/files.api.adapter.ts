import { Injectable, inject } from '@angular/core';
import { FileStoragePort } from '../../domain';
import { ApiClient } from '../http/api-client';

@Injectable({ providedIn: 'root' })
export class FilesApiAdapter implements FileStoragePort {
  private readonly api = inject(ApiClient);

  presignUpload(purpose: string, contentType: string): Promise<{ uploadUrl: string; objectKey: string }> {
    return this.api.post('/files/presign', { purpose, contentType });
  }
}

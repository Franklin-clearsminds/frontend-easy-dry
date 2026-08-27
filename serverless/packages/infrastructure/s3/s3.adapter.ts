export interface FileStoragePort {
  presignPut(objectKey: string, contentType: string): Promise<string>;
}

export class S3Adapter implements FileStoragePort {
  async presignPut(_objectKey: string, _contentType: string): Promise<string> {
    return '';
  }
}

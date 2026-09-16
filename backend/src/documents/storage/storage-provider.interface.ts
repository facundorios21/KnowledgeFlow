export interface StoredFileResult {
  fileUrl: string;
  storageKey: string;
}

export interface StorageProvider {
  saveFile(file: Express.Multer.File): Promise<StoredFileResult>;
  deleteFile(fileUrl: string): Promise<void>;
  getFileBuffer(fileUrl: string): Promise<Buffer>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

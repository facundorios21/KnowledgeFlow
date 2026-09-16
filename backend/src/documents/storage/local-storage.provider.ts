import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StorageProvider, StoredFileResult } from './storage-provider.interface';
import { CustomLoggerService } from '../../common/logger/custom-logger.service';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;

  constructor(private readonly logger: CustomLoggerService) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads', 'documents');
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error(
        `Failed to create upload directory: ${(error as Error).message}`,
        (error as Error).stack,
        'LocalStorageProvider',
      );
    }
  }

  async saveFile(file: Express.Multer.File): Promise<StoredFileResult> {
    await this.ensureUploadDirExists();

    const fileExt = path.extname(file.originalname).toLowerCase();
    const uniqueId = randomUUID();
    const storageKey = `${uniqueId}${fileExt}`;
    const destinationPath = path.join(this.uploadDir, storageKey);

    await fs.writeFile(destinationPath, file.buffer);
    this.logger.log(`Saved file ${file.originalname} -> ${storageKey}`, 'LocalStorageProvider');

    // Return a standardized URL/path representation
    return {
      fileUrl: `/uploads/documents/${storageKey}`,
      storageKey,
    };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const filename = path.basename(fileUrl);
    const filePath = path.join(this.uploadDir, filename);

    try {
      await fs.unlink(filePath);
      this.logger.log(`Deleted file: ${filename}`, 'LocalStorageProvider');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error(
          `Error deleting file ${filePath}: ${(error as Error).message}`,
          (error as Error).stack,
          'LocalStorageProvider',
        );
      }
    }
  }

  async getFileBuffer(fileUrl: string): Promise<Buffer> {
    const filename = path.basename(fileUrl);
    const filePath = path.join(this.uploadDir, filename);

    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new NotFoundException(`File at ${fileUrl} not found on disk`);
    }
  }
}

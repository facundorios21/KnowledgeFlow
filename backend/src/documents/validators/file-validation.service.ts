import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

export interface ValidatedFileResult {
  mimeType: string;
  extension: string;
  size: number;
}

@Injectable()
export class FileValidationService {
  private readonly maxFileSizeBytes: number;

  private readonly allowedMimeTypes: Record<string, string[]> = {
    '.pdf': ['application/pdf'],
    '.txt': ['text/plain'],
    '.docx': [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed',
    ],
  };

  constructor(private readonly configService: ConfigService) {
    const maxMb = this.configService.get<number>('processing.maxFileSizeMb', 15);
    this.maxFileSizeBytes = maxMb * 1024 * 1024;
  }

  validateFile(file: Express.Multer.File): ValidatedFileResult {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty or missing');
    }

    // 1. Validate File Size
    if (file.size > this.maxFileSizeBytes) {
      const maxMb = Math.round(this.maxFileSizeBytes / (1024 * 1024));
      throw new PayloadTooLargeException(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of ${maxMb} MB`,
      );
    }

    // 2. Validate Extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedMimeTypes[ext]) {
      throw new BadRequestException(
        `Unsupported file extension "${ext}". Allowed types: .pdf, .txt, .docx`,
      );
    }

    // 3. Validate Declared MIME Type
    const expectedMimes = this.allowedMimeTypes[ext];
    const clientMime = (file.mimetype || '').toLowerCase();
    const isMimeRecognized = expectedMimes.some((m) => clientMime.includes(m));

    if (!isMimeRecognized && ext !== '.txt') {
      throw new BadRequestException(
        `MIME type "${file.mimetype}" does not match file extension "${ext}"`,
      );
    }

    // 4. Validate Content via Magic Bytes (Deep Inspection)
    this.verifyMagicBytes(file.buffer, ext);

    return {
      mimeType: expectedMimes[0],
      extension: ext,
      size: file.size,
    };
  }

  private verifyMagicBytes(buffer: Buffer, extension: string): void {
    if (buffer.length < 4) {
      throw new BadRequestException('File is too short to be a valid document');
    }

    // Check for executables (MZ in Windows / ELF in Linux)
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
      throw new BadRequestException('Executables (.exe / .dll) are strictly prohibited');
    }
    if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      throw new BadRequestException('Executable binaries are strictly prohibited');
    }

    if (extension === '.pdf') {
      // PDF header: %PDF- (0x25, 0x50, 0x44, 0x46)
      const isPdfHeader =
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46;

      if (!isPdfHeader) {
        throw new BadRequestException(
          'Corrupted or invalid PDF file: header does not match PDF signature',
        );
      }
    } else if (extension === '.docx') {
      // DOCX is a ZIP container: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
      const isZipHeader =
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
        (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

      if (!isZipHeader) {
        throw new BadRequestException(
          'Corrupted or invalid DOCX file: archive signature not found',
        );
      }
    } else if (extension === '.txt') {
      // Plain text: should not contain null bytes
      for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
        if (buffer[i] === 0x00) {
          throw new BadRequestException('Binary file detected where plain text was expected');
        }
      }
    }
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { FileValidationService } from './file-validation.service';

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileValidationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => {
              if (key === 'processing.maxFileSizeMb') return 15;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FileValidationService>(FileValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate a valid PDF file with %PDF- header', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 sample content');
    const mockFile = {
      originalname: 'document.pdf',
      mimetype: 'application/pdf',
      size: validPdfBuffer.length,
      buffer: validPdfBuffer,
    } as Express.Multer.File;

    const result = service.validateFile(mockFile);
    expect(result.extension).toBe('.pdf');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('should validate a valid plain text file (.txt)', () => {
    const validTxtBuffer = Buffer.from('Hola mundo, este es un texto valido.');
    const mockFile = {
      originalname: 'notas.txt',
      mimetype: 'text/plain',
      size: validTxtBuffer.length,
      buffer: validTxtBuffer,
    } as Express.Multer.File;

    const result = service.validateFile(mockFile);
    expect(result.extension).toBe('.txt');
    expect(result.mimeType).toBe('text/plain');
  });

  it('should validate a valid DOCX file with PK zip signature', () => {
    const validDocxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const mockFile = {
      originalname: 'reporte.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: validDocxBuffer.length,
      buffer: validDocxBuffer,
    } as Express.Multer.File;

    const result = service.validateFile(mockFile);
    expect(result.extension).toBe('.docx');
  });

  it('should reject files exceeding maximum size with PayloadTooLargeException', () => {
    const largeBuffer = Buffer.alloc(16 * 1024 * 1024); // 16MB > 15MB
    const mockFile = {
      originalname: 'grande.pdf',
      mimetype: 'application/pdf',
      size: largeBuffer.length,
      buffer: largeBuffer,
    } as Express.Multer.File;

    expect(() => service.validateFile(mockFile)).toThrow(PayloadTooLargeException);
  });

  it('should reject unsupported file extensions (e.g. .exe)', () => {
    const mockFile = {
      originalname: 'malware.exe',
      mimetype: 'application/octet-stream',
      size: 100,
      buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
    } as Express.Multer.File;

    expect(() => service.validateFile(mockFile)).toThrow(BadRequestException);
  });

  it('should reject spoofed extension (e.g. .pdf with executable MZ header)', () => {
    const fakePdfBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // MZ executable
    const mockFile = {
      originalname: 'disfrazado.pdf',
      mimetype: 'application/pdf',
      size: fakePdfBuffer.length,
      buffer: fakePdfBuffer,
    } as Express.Multer.File;

    expect(() => service.validateFile(mockFile)).toThrow(BadRequestException);
  });
});

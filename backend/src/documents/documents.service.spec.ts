import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentEntity, DocumentStatus } from './schemas/document.schema';
import { STORAGE_PROVIDER } from './storage/storage-provider.interface';
import { FileValidationService } from './validators/file-validation.service';
import { CustomLoggerService } from '../common/logger/custom-logger.service';
import { UserRole } from '../common/decorators/roles.decorator';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockDocModel: any;
  let mockStorageProvider: any;
  let mockValidationService: any;

  const mockUser = { id: 'user-123', role: UserRole.USER };
  const mockAdmin = { id: 'admin-456', role: UserRole.ADMIN };

  beforeEach(async () => {
    mockDocModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockStorageProvider = {
      saveFile: jest.fn().mockResolvedValue({
        fileUrl: '/uploads/documents/sample.pdf',
        storageKey: 'sample.pdf',
      }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getFileBuffer: jest.fn(),
    };

    mockValidationService = {
      validateFile: jest.fn().mockReturnValue({
        mimeType: 'application/pdf',
        extension: '.pdf',
        size: 1024,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getModelToken(DocumentEntity.name),
          useValue: mockDocModel,
        },
        {
          provide: STORAGE_PROVIDER,
          useValue: mockStorageProvider,
        },
        {
          provide: FileValidationService,
          useValue: mockValidationService,
        },
        {
          provide: CustomLoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should validate, store, and create a document record with PROCESSING status', async () => {
      const mockFile = {
        originalname: 'Manual.pdf',
        buffer: Buffer.from('%PDF-1.4 test'),
        size: 1024,
      } as Express.Multer.File;

      const createdDoc = {
        _id: 'doc-1',
        title: 'Manual de Seguridad',
        description: 'Desc',
        fileName: 'Manual.pdf',
        fileUrl: '/uploads/documents/sample.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        ownerId: 'user-123',
        status: DocumentStatus.PROCESSING,
        tags: ['seguridad'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDocModel.create.mockResolvedValue(createdDoc);

      const result = await service.create(
        mockFile,
        { title: 'Manual de Seguridad', description: 'Desc', tags: ['seguridad'] },
        mockUser,
      );

      expect(mockValidationService.validateFile).toHaveBeenCalledWith(mockFile);
      expect(mockStorageProvider.saveFile).toHaveBeenCalledWith(mockFile);
      expect(result.id).toBe('doc-1');
      expect(result.status).toBe(DocumentStatus.PROCESSING);
      expect(result.ownerId).toBe('user-123');
    });
  });

  describe('findAll', () => {
    it('should filter by ownerId for regular users', async () => {
      mockDocModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      mockDocModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({}, mockUser);

      expect(mockDocModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: 'user-123' }),
      );
    });

    it('should NOT restrict by ownerId for admin users', async () => {
      mockDocModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });
      mockDocModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({}, mockAdmin);

      expect(mockDocModel.find).toHaveBeenCalledWith(
        expect.not.objectContaining({ ownerId: expect.anything() }),
      );
    });
  });

  describe('findById & Permissions', () => {
    it('should return document if user is the owner', async () => {
      const doc = {
        _id: 'doc-1',
        title: 'Title',
        description: '',
        fileName: 'file.pdf',
        fileUrl: '/path',
        mimeType: 'application/pdf',
        size: 500,
        ownerId: 'user-123',
        status: DocumentStatus.READY,
        tags: [],
      };

      mockDocModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.findById('doc-1', mockUser);
      expect(result.id).toBe('doc-1');
    });

    it('should allow admin to access document owned by someone else', async () => {
      const doc = {
        _id: 'doc-1',
        title: 'Title',
        description: '',
        fileName: 'file.pdf',
        fileUrl: '/path',
        mimeType: 'application/pdf',
        size: 500,
        ownerId: 'user-other',
        status: DocumentStatus.READY,
        tags: [],
      };

      mockDocModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.findById('doc-1', mockAdmin);
      expect(result.id).toBe('doc-1');
    });

    it('should throw ForbiddenException if user is not owner and not admin', async () => {
      const doc = {
        _id: 'doc-1',
        ownerId: 'user-other',
        status: DocumentStatus.READY,
      };

      mockDocModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(service.findById('doc-1', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if document does not exist', async () => {
      mockDocModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('doc-nonexistent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('summarize & ask readiness check', () => {
    it('should throw BadRequestException if document is not in READY status when summarizing', async () => {
      const doc = {
        _id: 'doc-1',
        ownerId: 'user-123',
        status: DocumentStatus.PROCESSING,
      };

      mockDocModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(service.summarize('doc-1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

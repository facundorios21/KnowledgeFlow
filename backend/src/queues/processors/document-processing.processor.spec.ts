import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { DocumentProcessingProcessor } from './document-processing.processor';
import {
  DocumentEntity,
  DocumentStatus,
} from '../../documents/schemas/document.schema';
import { CustomLoggerService } from '../../common/logger/custom-logger.service';
import { DocumentProcessingJobData } from '../constants/queue.constants';

describe('DocumentProcessingProcessor', () => {
  let processor: DocumentProcessingProcessor;
  let mockDocModel: any;

  beforeEach(async () => {
    mockDocModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentProcessingProcessor,
        {
          provide: getModelToken(DocumentEntity.name),
          useValue: mockDocModel,
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

    processor = module.get<DocumentProcessingProcessor>(
      DocumentProcessingProcessor,
    );
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should process document and transition status from PROCESSING to READY', async () => {
      const mockDoc = {
        _id: 'doc-123',
        status: DocumentStatus.PROCESSING,
        processingError: undefined,
        save: jest.fn().mockResolvedValue(true),
      };

      mockDocModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      const mockJob = {
        id: 'doc-process-doc-123',
        data: {
          documentId: 'doc-123',
          ownerId: 'user-456',
          fileUrl: '/uploads/documents/sample.pdf',
          mimeType: 'application/pdf',
          fileName: 'sample.pdf',
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<DocumentProcessingJobData>;

      const result = await processor.process(mockJob);

      expect(result.status).toBe('READY');
      expect(mockDoc.status).toBe(DocumentStatus.READY);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(mockJob.updateProgress).toHaveBeenCalledWith(25);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(50);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(75);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
    });

    it('should perform an idempotent skip when document is already READY and forceReprocess is not set', async () => {
      const mockDoc = {
        _id: 'doc-123',
        status: DocumentStatus.READY,
        save: jest.fn(),
      };

      mockDocModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      const mockJob = {
        id: 'doc-process-doc-123',
        data: {
          documentId: 'doc-123',
          ownerId: 'user-456',
          fileUrl: '/uploads/documents/sample.pdf',
          mimeType: 'application/pdf',
          fileName: 'sample.pdf',
          forceReprocess: false,
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        updateProgress: jest.fn(),
      } as unknown as Job<DocumentProcessingJobData>;

      const result = await processor.process(mockJob);

      expect(result.status).toBe('SKIPPED');
      expect(result.reason).toContain('idempotent skip');
      expect(mockDoc.save).not.toHaveBeenCalled();
      expect(mockJob.updateProgress).not.toHaveBeenCalled();
    });

    it('should reprocess a READY document when forceReprocess is true', async () => {
      const mockDoc = {
        _id: 'doc-123',
        status: DocumentStatus.READY,
        save: jest.fn().mockResolvedValue(true),
      };

      mockDocModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc),
      });

      const mockJob = {
        id: 'doc-process-doc-123',
        data: {
          documentId: 'doc-123',
          ownerId: 'user-456',
          fileUrl: '/uploads/documents/sample.pdf',
          mimeType: 'application/pdf',
          fileName: 'sample.pdf',
          forceReprocess: true,
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<DocumentProcessingJobData>;

      const result = await processor.process(mockJob);

      expect(result.status).toBe('READY');
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('should skip gracefully when document no longer exists in database', async () => {
      mockDocModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const mockJob = {
        id: 'doc-process-doc-999',
        data: {
          documentId: 'doc-999',
          ownerId: 'user-456',
          fileUrl: '/uploads/documents/deleted.pdf',
          mimeType: 'application/pdf',
          fileName: 'deleted.pdf',
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as unknown as Job<DocumentProcessingJobData>;

      const result = await processor.process(mockJob);

      expect(result.status).toBe('SKIPPED');
      expect(result.reason).toContain('not found');
    });
  });

  describe('onFailed', () => {
    it('should NOT mark document as FAILED on intermediate retry failures', async () => {
      const mockJob = {
        id: 'doc-process-doc-123',
        data: { documentId: 'doc-123' },
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as unknown as Job<DocumentProcessingJobData>;

      await processor.onFailed(mockJob, new Error('Temporary network timeout'));

      expect(mockDocModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should mark document as FAILED and store processingError when all retries are exhausted', async () => {
      mockDocModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      });

      const mockJob = {
        id: 'doc-process-doc-123',
        data: { documentId: 'doc-123' },
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as unknown as Job<DocumentProcessingJobData>;

      await processor.onFailed(
        mockJob,
        new Error('AI service connection refused'),
      );

      expect(mockDocModel.findByIdAndUpdate).toHaveBeenCalledWith('doc-123', {
        status: DocumentStatus.FAILED,
        processingError: 'AI service connection refused',
      });
    });
  });
});

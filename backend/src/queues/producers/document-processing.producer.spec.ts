import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { DocumentProcessingProducer } from './document-processing.producer';
import {
  DOCUMENT_PROCESSING_QUEUE,
  DocumentJobName,
} from '../constants/queue.constants';
import { CustomLoggerService } from '../../common/logger/custom-logger.service';

describe('DocumentProcessingProducer', () => {
  let producer: DocumentProcessingProducer;
  let mockQueue: any;

  const sampleJobData = {
    documentId: 'doc-123',
    ownerId: 'user-456',
    fileUrl: '/uploads/documents/test.pdf',
    mimeType: 'application/pdf',
    fileName: 'test.pdf',
  };

  beforeEach(async () => {
    mockQueue = {
      getJob: jest.fn(),
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentProcessingProducer,
        {
          provide: getQueueToken(DOCUMENT_PROCESSING_QUEUE),
          useValue: mockQueue,
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

    producer = module.get<DocumentProcessingProducer>(DocumentProcessingProducer);
  });

  it('should be defined', () => {
    expect(producer).toBeDefined();
  });

  it('should enqueue a new job with retries and exponential backoff when no prior job exists', async () => {
    mockQueue.getJob.mockResolvedValue(null);
    mockQueue.add.mockResolvedValue({ id: 'doc-process-doc-123' });

    const result = await producer.enqueueDocumentProcessing(sampleJobData);

    expect(result).toEqual({
      jobId: 'doc-process-doc-123',
      deduplicated: false,
    });
    expect(mockQueue.add).toHaveBeenCalledWith(
      DocumentJobName.PROCESS_DOCUMENT,
      sampleJobData,
      expect.objectContaining({
        jobId: 'doc-process-doc-123',
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }),
    );
  });

  it('should deduplicate and skip adding a job if an active or waiting job already exists', async () => {
    mockQueue.getJob.mockResolvedValue({
      id: 'doc-process-doc-123',
      getState: jest.fn().mockResolvedValue('active'),
      remove: jest.fn(),
    });

    const result = await producer.enqueueDocumentProcessing(sampleJobData);

    expect(result).toEqual({
      jobId: 'doc-process-doc-123',
      deduplicated: true,
    });
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('should remove a previous completed or failed job and enqueue a fresh run', async () => {
    const mockRemove = jest.fn().mockResolvedValue(undefined);
    mockQueue.getJob.mockResolvedValue({
      id: 'doc-process-doc-123',
      getState: jest.fn().mockResolvedValue('failed'),
      remove: mockRemove,
    });
    mockQueue.add.mockResolvedValue({ id: 'doc-process-doc-123' });

    const result = await producer.enqueueDocumentProcessing({
      ...sampleJobData,
      forceReprocess: true,
    });

    expect(mockRemove).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalled();
    expect(result.deduplicated).toBe(false);
  });
});

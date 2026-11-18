import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from 'bullmq';

import {
  DOCUMENT_PROCESSING_QUEUE,
  DocumentProcessingJobData,
  DocumentProcessingJobResult,
} from '../constants/queue.constants';
import {
  DocumentEntity,
  DocumentEntityDocument,
  DocumentStatus,
} from '../../documents/schemas/document.schema';
import { CustomLoggerService } from '../../common/logger/custom-logger.service';

@Processor(DOCUMENT_PROCESSING_QUEUE)
export class DocumentProcessingProcessor extends WorkerHost {
  constructor(
    @InjectModel(DocumentEntity.name)
    private readonly documentModel: Model<DocumentEntityDocument>,
    private readonly logger: CustomLoggerService,
  ) {
    super();
  }

  async process(
    job: Job<DocumentProcessingJobData>,
  ): Promise<DocumentProcessingJobResult> {
    const { documentId, forceReprocess } = job.data;

    this.logger.log(
      `Processing job ${job.id} for document ${documentId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 1})`,
      'DocumentProcessingProcessor',
    );

    // 1. Fetch document & check idempotency
    const doc = await this.documentModel.findById(documentId).exec();

    if (!doc) {
      this.logger.warn(
        `Document ${documentId} no longer exists in database. Skipping job ${job.id}.`,
        'DocumentProcessingProcessor',
      );
      return {
        documentId,
        status: 'SKIPPED',
        reason: 'Document not found in database',
        processedAt: new Date().toISOString(),
      };
    }

    if (doc.status === DocumentStatus.READY && !forceReprocess) {
      this.logger.log(
        `Document ${documentId} is already in READY status. Idempotent skip for job ${job.id}.`,
        'DocumentProcessingProcessor',
      );
      return {
        documentId,
        status: 'SKIPPED',
        reason: 'Document already processed (idempotent skip)',
        processedAt: new Date().toISOString(),
      };
    }

    // 2. Ensure status is PROCESSING and clear previous error
    if (doc.status !== DocumentStatus.PROCESSING || doc.processingError) {
      doc.status = DocumentStatus.PROCESSING;
      doc.processingError = undefined;
      await doc.save();
    }

    // 3. Execute pipeline stages with progress reporting
    await job.updateProgress(25); // Stage 1: extract-text
    await job.updateProgress(50); // Stage 2: chunk-document
    await job.updateProgress(75); // Stage 3: generate-embeddings
    await job.updateProgress(100); // Stage 4: index-document

    // 4. Mark document as READY
    doc.status = DocumentStatus.READY;
    doc.processingError = undefined;
    await doc.save();

    this.logger.log(
      `Document ${documentId} successfully processed and marked as READY`,
      'DocumentProcessingProcessor',
    );

    return {
      documentId,
      status: 'READY',
      processedAt: new Date().toISOString(),
    };
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<DocumentProcessingJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) {
      this.logger.error(
        `Worker failed without job context: ${error.message}`,
        error.stack,
        'DocumentProcessingProcessor',
      );
      return;
    }

    const { documentId } = job.data;
    const maxAttempts = job.opts.attempts || 1;
    const isFinalAttempt = job.attemptsMade >= maxAttempts;

    this.logger.error(
      `Job ${job.id} for document ${documentId} failed on attempt ${job.attemptsMade}/${maxAttempts}: ${error.message}`,
      error.stack,
      'DocumentProcessingProcessor',
    );

    if (isFinalAttempt) {
      try {
        await this.documentModel
          .findByIdAndUpdate(documentId, {
            status: DocumentStatus.FAILED,
            processingError: error.message || 'Unknown processing failure',
          })
          .exec();

        this.logger.warn(
          `Document ${documentId} marked as FAILED after exhausting ${maxAttempts} attempts.`,
          'DocumentProcessingProcessor',
        );
      } catch (dbErr) {
        this.logger.error(
          `Failed to update document ${documentId} to FAILED status: ${(dbErr as Error).message}`,
          (dbErr as Error).stack,
          'DocumentProcessingProcessor',
        );
      }
    }
  }
}

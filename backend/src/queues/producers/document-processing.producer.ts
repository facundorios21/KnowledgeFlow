import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  DOCUMENT_PROCESSING_QUEUE,
  DocumentJobName,
  DocumentProcessingJobData,
} from '../constants/queue.constants';
import { CustomLoggerService } from '../../common/logger/custom-logger.service';

@Injectable()
export class DocumentProcessingProducer {
  constructor(
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly documentQueue: Queue<DocumentProcessingJobData>,
    private readonly logger: CustomLoggerService,
  ) {}

  async enqueueDocumentProcessing(
    data: DocumentProcessingJobData,
  ): Promise<{ jobId: string; deduplicated: boolean }> {
    const jobId = `doc-process-${data.documentId}`;

    // Check if job already exists in Redis to prevent duplicate jobs
    const existingJob = await this.documentQueue.getJob(jobId);

    if (existingJob) {
      const state = await existingJob.getState();

      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        this.logger.log(
          `Job ${jobId} is already in "${state}" state. Skipping duplicate enqueue.`,
          'DocumentProcessingProducer',
        );
        return { jobId, deduplicated: true };
      }

      // If previous job completed or failed, remove it so we can enqueue a fresh run
      if (state === 'completed' || state === 'failed') {
        await existingJob.remove();
      }
    }

    const job = await this.documentQueue.add(
      DocumentJobName.PROCESS_DOCUMENT,
      data,
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600,
          count: 100,
        },
        removeOnFail: {
          age: 86400,
          count: 500,
        },
      },
    );

    this.logger.log(
      `Enqueued job ${job.id} (${DocumentJobName.PROCESS_DOCUMENT}) for document ${data.documentId}`,
      'DocumentProcessingProducer',
    );

    return {
      jobId: job.id || jobId,
      deduplicated: false,
    };
  }
}

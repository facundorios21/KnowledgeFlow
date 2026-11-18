import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';

import { DOCUMENT_PROCESSING_QUEUE } from './constants/queue.constants';
import { DocumentProcessingProducer } from './producers/document-processing.producer';
import { DocumentProcessingProcessor } from './processors/document-processing.processor';
import {
  DocumentEntity,
  DocumentEntitySchema,
} from '../documents/schemas/document.schema';
import { CustomLoggerService } from '../common/logger/custom-logger.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({
      name: DOCUMENT_PROCESSING_QUEUE,
    }),
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
    ]),
  ],
  providers: [
    DocumentProcessingProducer,
    DocumentProcessingProcessor,
    CustomLoggerService,
  ],
  exports: [DocumentProcessingProducer, BullModule],
})
export class QueuesModule {}
